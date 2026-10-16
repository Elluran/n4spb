// city-tower-audit.mjs - headless (no GPU) CLASS audit of the tower-like volumes of the generic city: corner turrets, tenement erkers, Northern Modern bay windows, gables, roof parapets,
// the hand-built Duma tower (docs/research/city-towers.md).
//   node tools/city-tower-audit.mjs [--near x,z,r] [--all] [--kinds turret,erker,bay,gable,parapet,tower] [--list 20] [--json file] [--ref HEAD] [--strict]
//                                   [--dump id] [--rays 0] [--max-bad N] [--dir folder] [--regions OLD,W1,..] [--skip-regions V3,V4,..] [--graze 2] [--overlap-min 0.4]
//   --near x,z,r   only the houses whose centre is within r metres      --all      also the margin of the data (default: the play area + 50 m, like the detail passes of the city)
//   --ref HEAD     audit the module as committed at that git ref over the current data (tools/city-ref.mjs): the BEFORE numbers of a change
//   --dir folder   audit a SNAPSHOT of the module (<folder>/city.js + <folder>/city/*.js) over the current data: exact before / after numbers while the data changes under you
//   --regions / --skip-regions   judge only the features of these data regions (data/city.js REGIONS names) / all but these: a stable before / after while other agents bake new regions
//   --dump id      print every triangle of the features of this OSM id (stream, positions, vertex normal vs geometric normal) and the open edges
//   --strict       exit 1 when any feature has a defect (see-through rays, inverted / degenerate faces, open edges that are not at a wall seam, floating parts, overlap with a neighbour)
// Every feature the detail passes announce (M.tag, tools/city-tower-lib.mjs) is judged by FIVE checks (+ overlap), all on the real triangles the generator emitted:
//   1. see-through  (rayAudit) 64 directions x 8 target points = ~350-500 rays from outside at the volume, never from inside a house or the feature itself: a ray whose FIRST hit is the BACK face of
//                   a triangle of the feature looks through a missing face into the solid (walls / core / roof are single-sided in the renderer; the host walls, cornice and deck are in the scene,
//                   so the host closes what it closes). More than --graze (2) such rays = defect; 1-2 rays = a grazing seam, listed in the report. A back face of the HOST wall inside the box
//                   of the feature is only informational (it is what a ray sees through an arch next to the feature).
//   2. inverted     triangles whose winding disagrees with their own vertex normal (dot < -0.2) = culled from outside, visible from inside: the 'inverted cone'
//   3. degenerate   zero-area triangles (a quad with a collapsed edge that was emitted as two triangles)
//   4. open edges   welded (1 mm) boundary edges of the feature mesh. An edge is harmless ONLY when every one of 5 sample points along it is covered: hidden (inside the footprint of the host or a
//                   neighbour below its deck, 12 cm margin; 70 cm for a roof parapet that stands on the cornice; on the ground), or within 12 cm of another triangle of the feature (a T-junction, a
//                   window decal 4-9 cm off the wall, a box on a box), or inside another closed part (six axis rays all hit back faces). An open rim 20-30 cm from anything is a defect.
//   5. floating     connected parts (2 cm weld) whose lowest vertices (or the middle of their underside) are not hidden / on the ground / within 12 cm of another part: a spire hanging over its shaft
//   + overlap       vertices deeper than --overlap-min (0.4 m) inside the footprint of ANOTHER building, below its deck (the tower stands inside the neighbour). Hand-built towers rise out of the
//                   corner of their own house by design and are reported as `embedded`.
// Output: counts by kind, the defects by class, the worst offenders (OSM id, region, x, z, causes). Numbers of a run are in docs/research/city-towers.md.
import fs from 'node:fs';
import path from 'node:path';
import { buildFeatures, trisOf, bboxOf, weldEdges, geoNormal, makeScene, rayAudit, makeFootprints, distPointTri, insideSolid, distRing, imp } from './city-tower-lib.mjs';

const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const near = args.near ? args.near.split(',').map(Number) : null;
const kinds = new Set((args.kinds || 'turret,erker,bay,gable,parapet,tower').split(','));
const LIST = Number(args.list || 20);
const GRAZE = Number(args.graze ?? 2);                          // a feature with at most this many see-through rays (of ~350) only grazes a seam: reported, not a defect
const NEAR_SURFACE = 0.12;                                      // an edge / a part within 12 cm of another surface of the feature is attached to it (window decals stand 4-9 cm off the wall); a 20-30 cm gap is a defect
const OVERLAP_MIN = Number(args['overlap-min'] ?? 0.4);         // a vertex deeper than this (m) inside the footprint of ANOTHER building counts as an overlap (OSM footprints of neighbouring houses overlap by up to ~0.3 m)
const t0 = Date.now();
const W = await buildFeatures({ near, all: !!args.all, ref: args.ref, dir: args.dir });
const { M, recById, net } = W;
const D = await imp('src/world/data/city.js');
const regionOf = new Map();
for (const r of D.REGIONS) { const mod = await imp('src/world/data/' + r.file); for (const b of mod.BUILDINGS) regionOf.set(b.id, r.name); }
const regOf = (id) => regionOf.get(String(id).replace(/~f$/, '')) || '?';

const FP = await makeFootprints(W);
const { hiddenBy, inNeighbour } = FP;

// ---- the audit of one feature
const results = [];

const inRegion = (f) => (!args.regions || String(args.regions).split(',').includes(regOf(f.id))) && !(args['skip-regions'] && String(args['skip-regions']).split(',').includes(regOf(f.id)));
const feats = W.features.filter((f) => kinds.has(f.kind) && inRegion(f));
const scene = makeScene(feats, { pad: 14 });
let done = 0;
for (const f of feats) {
  const tris = trisOf(f); if (!tris.length) continue;
  const single = tris.filter((t) => t.stream === 'walls' || t.stream === 'core' || t.stream === 'roof');
  const rec = recById.get(f.id);
  const host = f.id;
  const r = { kind: f.kind, id: f.id, region: regOf(f.id), x: f.meta.x, z: f.meta.z, tris: tris.length, meta: f.meta, defects: [], score: 0 };
  const bb = bboxOf(tris); r.bbox = bb.map((v) => Math.round(v * 100) / 100);
  if (r.x === undefined) { r.x = (bb[0] + bb[3]) / 2; r.z = (bb[2] + bb[5]) / 2; }
  // 2/3: inverted + degenerate
  let inv = 0, deg = 0;
  for (const t of single) { const g = geoNormal(t.p); if (g.area < 1e-7) { deg++; continue; } if (g.n[0] * t.n[0] + g.n[1] * t.n[1] + g.n[2] * t.n[2] < -0.2) inv++; }
  r.inverted = inv; r.degenerate = deg;
  // 4: open edges
  const we = weldEdges(single);
  // an open edge is harmless when EVERY sample point of it is covered: hidden (inside a footprint below its deck, 12 cm margin / on the ground), or on another triangle of the feature (a T-junction of two
  // faces, a box top on the side of the next box), or inside another closed part of the feature (a box bottom inside the stage above it)
  const f_seam = f.kind === 'parapet' ? 0.7 : 0.12;                              // a roof parapet stands on the cornice, which projects 0.8 m from the wall
  const covered = (e) => {
    for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const q = [e.a[0] + (e.b[0] - e.a[0]) * f, e.a[1] + (e.b[1] - e.a[1]) * f, e.a[2] + (e.b[2] - e.a[2]) * f];
      if (hiddenBy(q, f_seam)) continue;
      let ok = false;
      for (let ti = 0; ti < single.length && !ok; ti++) { if (ti === e.tri) continue; if (distPointTri(q, single[ti].p) < NEAR_SURFACE) ok = true; }
      if (!ok) ok = insideSolid(q, single, e.tri);
      if (!ok) return false;
    }
    return true;
  };
  const open = we.open.filter((e) => !covered(e));
  r.openEdges = open.length; r.openTotal = we.open.length; r.flipped = we.flipped; r.nonManifold = we.nonManifold;
  // 5: floating parts: components by 2 cm weld
  const cell = 0.02, key = (q) => Math.round(q[0] / cell) + ',' + Math.round(q[1] / cell) + ',' + Math.round(q[2] / cell);
  const parent = new Map(), find = (a) => { while (parent.get(a) !== a) { parent.set(a, parent.get(parent.get(a))); a = parent.get(a); } return a; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  const vk = new Map();
  for (const t of single) { const ks = t.p.map((q) => { const k = key(q); if (!parent.has(k)) parent.set(k, k); vk.set(k, q); return k; }); uni(ks[0], ks[1]); uni(ks[1], ks[2]); }
  const comps = new Map(); for (const [k, q] of vk) { const rt = find(k); let c = comps.get(rt); if (!c) comps.set(rt, (c = [])); c.push(q); }
  let floating = 0; const floatInfo = [];
  const tcomp = single.map((t) => find(key(t.p[0])));
  for (const [rt, pts] of comps) {
    if (pts.length < 3) continue;
    let lo = 1e9; for (const q of pts) lo = Math.min(lo, q[1]);
    const low = pts.filter((q) => q[1] <= lo + 0.05);
    let ok = lo < 0.25;
    if (!ok) for (const q of low) if (hiddenBy(q, f_seam)) { ok = true; break; }
    // supported by another part of the same feature: a lowest vertex ON a triangle of another component (a stage standing on the cornice of the stage below) or INSIDE another closed part
    if (!ok) {
      const others = single.filter((_, ti) => tcomp[ti] !== rt);
      const cen = [0, 1, 2].map((k) => low.reduce((a, q) => a + q[k], 0) / low.length);          // the middle of the underside: a box that overhangs the one below rests on it in the middle
      for (const q of [cen, ...low]) {
        if (others.some((t) => distPointTri(q, t.p) < NEAR_SURFACE)) { ok = true; break; }
        if (insideSolid(q, others, -1)) { ok = true; break; }
      }
    }
    if (!ok) { floating++; floatInfo.push({ y: Math.round(lo * 10) / 10, n: pts.length }); }
  }
  // a feature of several components: only the unattached ones count (a railing card set / fine part is not in `single`)
  r.components = comps.size; r.floating = floating; if (floating) r.floatInfo = floatInfo;
  // overlap with a neighbour: vertices inside another footprint (not the host) by > 0.15 m below its deck
  let overlap = 0, depth = 0; const seen = new Set(), nbs = new Set();
  for (const t of single) for (const q of t.p) {
    const k = key(q); if (seen.has(k)) continue; seen.add(k);
    const o = inNeighbour(q, host); if (!o) continue;
    const d = distRing(o.pts, q[0], q[2]); if (d > OVERLAP_MIN) { overlap++; nbs.add(o.id); } depth = Math.max(depth, d);
  }
  if (f.meta && f.meta.custom && overlap) { r.embedded = overlap; overlap = 0; }       // a hand-built tower rises out of the corner of its own house by design (towers.js): reported as `embedded`, not a defect
  r.overlap = overlap; r.overlapDepth = Math.round(depth * 100) / 100; if (overlap) r.neighbours = [...nbs];
  // 1: see-through rays
  if (args.rays !== '0') { const ra = rayAudit(f, scene, M, FP); r.rays = ra.rays; r.hits = ra.hits; r.badRays = ra.bad; r.rayCauses = ra.byCause; r.worstRays = ra.worst; } else { r.rays = 0; r.badRays = 0; }
  if (r.badRays > GRAZE) r.defects.push('see-through'); else if (r.badRays) r.grazing = r.badRays;       // 1-2 rays of ~350 through a seam of a centimetre next to the wall: grazing, not a hole (listed in the report)
  if (r.inverted) r.defects.push('inverted');
  if (r.degenerate) r.defects.push('degenerate');
  if (r.openEdges) r.defects.push('open-edges');
  if (r.floating) r.defects.push('floating');
  if (r.overlap) r.defects.push('overlap-neighbour');
  r.score = (r.badRays || 0) + r.inverted * 8 + r.degenerate + r.openEdges * 2 + r.floating * 40 + r.overlap * 4;
  results.push(r);
  if (args.dump && String(args.dump).split(',').includes(String(f.id))) {
    console.log(`--- ${f.kind} ${f.id} meta=${JSON.stringify(f.meta)} tris=${tris.length}`);
    for (const t of tris) { const g = geoNormal(t.p); console.log('  ', t.stream.padEnd(5), t.p.map((q) => q.map((v) => v.toFixed(2)).join(',')).join(' | '), 'vn', t.n.map((v) => v.toFixed(2)).join(','), 'gn', g.n.map((v) => v.toFixed(2)).join(','), 'dot', (g.n[0] * t.n[0] + g.n[1] * t.n[1] + g.n[2] * t.n[2]).toFixed(2)); }
    for (const e of open) console.log('   OPEN', e.a.map((v) => v.toFixed(2)).join(','), '->', e.b.map((v) => v.toFixed(2)).join(','));
    console.log('   rays', JSON.stringify({ rays: r.rays, hits: r.hits, bad: r.badRays, causes: r.rayCauses, worst: r.worstRays }), 'floating', JSON.stringify(r.floatInfo || []));
  }
  done++;
}

// ---- report
const by = {};
for (const r of results) {
  const k = by[r.kind] || (by[r.kind] = { features: 0, tris: 0, withDefect: 0, 'see-through': 0, inverted: 0, degenerate: 0, 'open-edges': 0, floating: 0, 'overlap-neighbour': 0, badRays: 0, invertedTris: 0, openEdgeCount: 0 });
  k.features++; k.tris += r.tris; if (r.defects.length) k.withDefect++;
  for (const d of r.defects) k[d]++;
  k.badRays += r.badRays || 0; k.invertedTris += r.inverted; k.openEdgeCount += r.openEdges;
}
console.log(`[tower-audit] ${args.ref ? 'module of ' + args.ref : args.dir ? 'snapshot ' + args.dir : 'working tree'}; ${results.length} features in ${((Date.now() - t0) / 1000).toFixed(1)} s (city pipeline ${(W.buildMs / 1000).toFixed(1)} s)${near ? '; near ' + near.join(',') : ''}`);
console.log('kind        features   tris  withDefect  see-through  inverted  degenerate  open-edges  floating  overlap   | bad rays  inverted tris  open edges');
for (const [k, v] of Object.entries(by)) console.log(k.padEnd(11), String(v.features).padStart(8), String(v.tris).padStart(6), String(v.withDefect).padStart(11), String(v['see-through']).padStart(12), String(v.inverted).padStart(9), String(v.degenerate).padStart(11), String(v['open-edges']).padStart(11), String(v.floating).padStart(9), String(v['overlap-neighbour']).padStart(8), '  |', String(v.badRays).padStart(8), String(v.invertedTris).padStart(14), String(v.openEdgeCount).padStart(11));
const grazing = results.filter((r) => r.grazing);
const tot = results.reduce((a, r) => { a.f++; a.d += r.defects.length ? 1 : 0; a.t += r.tris; return a; }, { f: 0, d: 0, t: 0 });
console.log(`TOTAL ${tot.f} features, ${tot.d} with a defect, ${tot.t} triangles` + (grazing.length ? `; ${grazing.length} features with 1-${GRAZE} grazing rays (not counted): ${grazing.slice(0, 12).map((r) => r.kind + ' ' + r.id).join(', ')}${grazing.length > 12 ? ' ...' : ''}` : ''));
const embedded = results.filter((r) => r.embedded);
if (embedded.length) console.log(`embedded by design (hand-built towers rise out of the corner of their own house): ${embedded.map((r) => r.kind + ' ' + r.id + ' (' + r.embedded + ' vertices)').join(', ')}`);
const worst = results.filter((r) => r.defects.length).sort((a, b) => b.score - a.score).slice(0, LIST);
if (worst.length) {
  console.log(`worst ${worst.length}:`);
  for (const r of worst) console.log(`  ${r.kind.padEnd(8)} ${String(r.id).padEnd(14)} ${r.region.padEnd(4)} (${Math.round(r.x)}, ${Math.round(r.z)})  score ${String(r.score).padStart(4)}  tris ${String(r.tris).padStart(3)}  ${r.defects.join(',')}  bad rays ${r.badRays}/${r.rays}  inverted ${r.inverted}  open ${r.openEdges}  floating ${r.floating}  overlap ${r.overlap}`);
}
if (args.json) { fs.mkdirSync(path.dirname(path.resolve(args.json)), { recursive: true }); fs.writeFileSync(args.json, JSON.stringify({ made: new Date().toISOString(), ref: args.ref || null, near, summary: by, total: tot, features: results.map((r) => ({ ...r, meta: undefined, worstRays: undefined })) }, null, 1)); console.log('wrote', args.json); }
const bad = results.filter((r) => r.defects.length).length;
const maxBad = args['max-bad'] !== undefined ? Number(args['max-bad']) : 0;
if (args.strict && bad > maxBad) { console.log(`TOWER AUDIT FAILED: ${bad} features with defects (max ${maxBad})`); process.exit(1); }
console.log(bad ? `tower audit: ${bad} features with defects` : 'tower audit: OK (0 defects)');
process.exit(0);
