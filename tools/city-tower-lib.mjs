// city-tower-lib.mjs - headless (no GPU, no DOM) harness of the tower / bay-window audit: runs the city pipeline of src/world/city.js (prepare -> describe -> analyse -> assignColours ->
// planPassages -> buildWalls + cornice + deck -> the detail passes that make tower-like volumes) into a SPY mesh set and returns every tagged FEATURE with its triangles.
//   const W = await buildFeatures({ near: [x, z, r] | null, all: false, ref: 'HEAD' | dir: snapshot folder });   // W = { features, M (spy meshes), recById, net, near, customs, occluders, runs, ... }
// A feature = { kind: 'turret' | 'erker' | 'bay' | 'gable' | 'parapet' | 'tower', id: OSM id of the host, meta, parts: [{ stream, B, i0, i1 }] } (parts = index ranges of the stream builders
// the feature wrote into). The detail passes announce a feature with `M.tag(kind, id, meta)` ... `M.tag(null)` (erkers.js, gables.js; a no-op on the production CityMeshes); towers.js is run per tower here.
// The analyses (used by tools/city-tower-audit.mjs, tools/city-tower-cams.mjs):
//   trisOf(feature)            world-space triangles with their stream and the vertex normal; geoNormal, bboxOf
//   weldEdges(tris)            welded (1 mm) edge table: open (boundary) edges, flipped neighbours, non-manifold edges
//   makeFootprints(W)          footprint index of the drawn records: hiddenBy (the volume of a house hides the point), inNeighbour (another house contains it), inAnyMass (nobody stands there)
//   makeScene / indexScene     a spatial index of every single-sided triangle near the features (walls / core / roof streams)
//   rayAudit(feature, scene, M, footprints)   the SEE-THROUGH test: rays from outside at the volume of the feature, never from inside a house or the feature; a ray whose FIRST hit is the BACK face
//                              of a triangle of the feature shows the inside of the solid = a missing or inverted face (walls / core / roof are single-sided, fine / rails are double-sided and never flagged)
//   distPointTri, insideSolid  helpers of the open-edge and floating-part tests
// Not a test of the shader: windows are painted per fragment on the wall quads; only geometry is judged.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const imp = (p) => import(pathToFileURL(path.join(root, p)).href);

const STREAMS = ['walls', 'core', 'fine', 'roof', 'rails'];
const SINGLE = new Set(['walls', 'core', 'roof']);                 // front-face-only materials (meshes.js flush); fine + rails are double sided
const BLOCKOUT = '#c27a5b';

/** A SNAPSHOT of the city module in a plain folder (<dir>/city/*.js, <dir>/city.js) importable beside the working tree: imports that leave the module are rewritten to the real files, so the old
 *  code runs over today's data (the same trick as tools/city-ref.mjs for a git ref). Used for exact before / after numbers while other agents change the data under you. */
function extractCityDir(dir) {
  const out = path.join(root, 'shots/city/_dir-' + process.pid);
  const copy = (srcDir, rel) => {
    for (const ent of fs.readdirSync(srcDir, { withFileTypes: true })) {
      const from = path.join(srcDir, ent.name), r = rel + ent.name;
      if (ent.isDirectory()) { copy(from, r + '/'); continue; }
      if (!ent.name.endsWith('.js')) continue;
      const orig = path.join(root, 'src/world', r);
      let text = fs.readFileSync(from, 'utf8');
      text = text.replace(/(from\s+|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (m, pre, q, spec) => {
        const target = path.resolve(path.dirname(orig), spec), inMod = target === path.join(root, 'src/world/city.js') || target.startsWith(path.join(root, 'src/world/city') + path.sep);
        return pre + q + (inMod ? spec : pathToFileURL(target).href) + q;
      });
      const dst = path.join(out, r); fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, text);
    }
  };
  copy(dir, '');
  return { dir: out, path: (p) => path.relative(root, path.join(out, p)), cleanup: () => fs.rmSync(out, { recursive: true, force: true }) };
}

/** Build the whole city pipeline into spy builders. opts: { near: [x, z, r] to restrict the detail passes, all: true = also the margin of the data, ref: git ref of the module (tools/city-ref.mjs), dir: a snapshot folder of the module (extractCityDir) } */
export async function buildFeatures(opts = {}) {
  let cityDir = 'src/world/city/', refMod = null;
  if (opts.ref) { const { extractCityRef } = await imp('tools/city-ref.mjs'); refMod = extractCityRef(root, opts.ref); cityDir = refMod.path('city') + '/'; process.on('exit', () => refMod.cleanup()); }
  else if (opts.dir) { refMod = extractCityDir(opts.dir); cityDir = refMod.path('city') + '/'; process.on('exit', () => refMod.cleanup()); }
  const THREE = await import('three');
  const { BUILDINGS, OVERLAPS } = await imp('src/world/data/city.js');
  const L = await imp('src/world/layout.js');
  const { prepare } = await imp(cityDir + 'prep.js');
  const { describe, assignColours, pickW, PALETTE } = await imp(cityDir + 'archetypes.js');
  const { analyse } = await imp(cityDir + 'edges.js');
  const { buildWalls } = await imp(cityDir + 'walls.js');
  const { addCornice, CORNICE_H, CORNICE_SIMPLE, ColorBuilder } = await imp(cityDir + 'cornice.js');
  const { addDeck, deckPlan } = await imp(cityDir + 'roofs.js');
  const { planPassages } = await imp(cityDir + 'passages.js');
  const { CityMeshes } = await imp(cityDir + 'meshes.js');
  const { buildBalconies } = await imp(cityDir + 'balconies.js');
  const { buildErkers } = await imp(cityDir + 'erkers.js');
  const { buildGables } = await imp(cityDir + 'gables.js');
  const { buildRoofDetail } = await imp(cityDir + 'roofdetail.js');
  const { buildTowers } = await imp(cityDir + 'towers.js');
  const { regionOf, DISTRICT_ROOFS } = await imp(cityDir + 'district.js');
  const { ARCH } = await imp(cityDir + 'wallmat.js');
  const { hash01 } = await imp('src/world/lib/massing.js');
  const { isOwned } = await imp('src/world/lib/claims.js');
  const { OWNS_TABLE } = await imp('src/world/lib/owns-table.js');
  const { ROOF_COLOURS } = await imp(cityDir + 'roofs.js');

  // ---- the groups the shipped scene owns (landmark modules): their buildings are not drawn by the city module
  const owned = new Set();
  for (const m of L.MODULE_KEYS) { const o = OWNS_TABLE[m]; if (o === true) for (const g of L.GROUPS[m]) owned.add(g.key); else if (Array.isArray(o)) for (const k of o) owned.add(k); }

  class SpyMeshes extends CityMeshes {
    constructor() { super(); this.features = []; this._open = null; }
    _snap() { const m = new Map(); for (const k of STREAMS) for (const [, B] of this.s[k]) m.set(B, B.idx.length); return m; }
    _close() {
      const o = this._open; this._open = null;
      const parts = [];
      for (const k of STREAMS) for (const [, B] of this.s[k]) { const a = o.snap.get(B) ?? 0, b = B.idx.length; if (b > a) parts.push({ stream: k, B, i0: a, i1: b }); }
      this.features.push({ kind: o.kind, id: o.id, meta: o.meta, parts });
    }
    tag(kind, id, meta) { if (this._open) this._close(); if (kind == null) return; this._open = { kind, id, meta: meta || {}, snap: this._snap() }; }
    finish() { if (this._open) this._close(); }
  }
  const M = new SpyMeshes();
  const ctx = { L, services: {}, physics: { addBox() {} } };

  const t0 = Date.now(), T = {};
  const lap = (k) => { T[k] = Date.now() - t0; };
  const prep = prepare(BUILDINGS, (b) => isOwned(owned, b.id));
  const described = prep.list.map((b) => ({ b, st: describe(b) }));
  const customs = described.filter((r) => r.st.custom);
  const specials = described.filter((r) => r.st.special && !r.st.custom);
  const list = described.filter((r) => !r.st.custom && !r.st.special);
  const occluders = prep.occluders.concat(customs.map((r) => ({ b: r.b, H: r.st.H })));
  const drawnIds = new Set(list.map((r) => r.b.id));
  const decks = deckPlan(OVERLAPS, drawnIds, (id) => { const q = L.buildingById(id); return !!q && !!regionOf(q); }), dupSkip = decks.skip;
  const net = analyse(list, occluders);
  const styles = new Map(list.map((r) => [r.b.id, r.st]));
  assignColours(styles, net.adj, list.map((r) => r.b));
  // st.trim: city.js trimColour(); only the colour differs (geometry audit), a copy of the wall colour is enough
  for (const r of list) { const st = r.st; if (L.isClaimed(r.b.id)) { st.hex = BLOCKOUT; st.color = new THREE.Color(BLOCKOUT); } st.courtColor = new THREE.Color(pickW(hash01(r.b.id + 'ct'), PALETTE.court)); st.trim = st.color.clone().lerp(new THREE.Color('#efe8d8'), 0.5); }
  planPassages(ctx, net, list);
  lap('classify');

  const info = [];
  for (const item of list) {
    const rec = net.rec.get(item.b.id), { b, st } = rec;
    const y0 = Math.max(0, b.minH || 0);
    rec.walls = buildWalls(ctx, rec, (x, z) => M.walls(x, z), {});
    for (const ring of rec.rings) for (const e of ring.edges) {
      if (!e.pieces.length) continue;
      const simple = e.hole || !e.street, mx = e.a[0] + e.dx * e.len / 2, mz = e.a[1] + e.dz * e.len / 2;
      addCornice(M.core(mx, mz), e, y0 + st.H, st.trim, 1, simple ? CORNICE_SIMPLE : undefined);
    }
    if (!dupSkip.has(b.id)) {
      const hex = st.dist ? (st.roofKnown || pickW(hash01((st.fam || b.id) + 'rf'), DISTRICT_ROOFS)) : pickW(hash01(b.id + 'rf'), ROOF_COLOURS);
      st.roofHex = hex;
      const dY = y0 + st.H + CORNICE_H + (decks.lift.has(b.id) ? 0.03 : 0);
      const RB = M.roof(st.ob.cx, st.ob.cz); RB.cur.set(hex);
      for (const poly of b.polys) addDeck(RB, poly, dY);
      st.deckY = dY;
    }
    info.push(rec);
  }
  lap('walls');
  const P = L.WORLD.play, nearPlay = (r) => opts.all || (r.st.ob.cx > P.x0 - 50 && r.st.ob.cx < P.x1 + 50 && r.st.ob.cz > P.z0 - 50 && r.st.ob.cz < P.z1 + 50);
  const inNear = (r) => !opts.near || Math.hypot(r.st.ob.cx - opts.near[0], r.st.ob.cz - opts.near[1]) <= opts.near[2];
  const near = info.filter((r) => nearPlay(r) && inNear(r));
  // hand-built towers
  for (const it of customs) { M.tag('tower', it.b.id, { x: it.b.cx, z: it.b.cz, custom: it.st.custom }); buildTowers(ctx, { M, items: [it] }); M.tag(null); }
  // the detail passes that make tower-like volumes; each runs for ALL records, so the features inside are separated by the M.tag calls of the pass (erkers.js, gables.js)
  const runs = {};
  const run = (name, fn) => { const f0 = M.features.length, t1 = Date.now(); M.tag(name + '-pass', '*'); try { runs[name] = fn(); } catch (e) { console.warn('[tower-lib] ' + name + ' failed:', e && e.stack || e); runs[name] = { error: String(e && e.message) }; } M.tag(null); runs[name].features = M.features.length - f0; runs[name].ms = Date.now() - t1; };
  run('balconies', () => buildBalconies(ctx, { M, info: near }));
  run('erkers', () => buildErkers(ctx, { M, info: near }));
  run('gables', () => buildGables(ctx, { M, info: near }));
  run('roof', () => buildRoofDetail(ctx, { M, info: near }));
  M.finish();
  lap('details');

  const recById = new Map(info.map((r) => [r.b.id, r]));
  return { THREE, L, M, ctx, info, near, recById, net, features: M.features, runs, timings: T, owned, ARCH, list, specials, customs, occluders, buildMs: Date.now() - t0 };
}

// ------------------------------------------------------------------------------------------------ geometry access
/** Triangles of a feature in world space: [{ p: [[x,y,z] x3], n: [nx,ny,nz] (vertex normal of the first vertex), stream, B, t }] */
export function trisOf(f) {
  const out = [];
  for (const part of f.parts) {
    const { B, stream } = part, pos = B.pos, nrm = B.nrm, idx = B.idx;
    for (let i = part.i0; i < part.i1; i += 3) {
      const a = idx[i], b = idx[i + 1], c = idx[i + 2];
      out.push({ p: [[pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]], [pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2]], [pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2]]], n: [nrm[a * 3], nrm[a * 3 + 1], nrm[a * 3 + 2]], stream, B, t: i / 3 });
    }
  }
  return out;
}
export const geoNormal = (p) => {
  const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
  return { n: l > 0 ? [nx / l, ny / l, nz / l] : [0, 0, 0], area: l / 2 };
};
export function bboxOf(tris) {
  const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
  for (const t of tris) for (const q of t.p) { for (let k = 0; k < 3; k++) { if (q[k] < b[k]) b[k] = q[k]; if (q[k] > b[k + 3]) b[k + 3] = q[k]; } }
  return b;
}

// ------------------------------------------------------------------------------------------------ edge table
const KEY = (q) => Math.round(q[0] * 1000) + ',' + Math.round(q[1] * 1000) + ',' + Math.round(q[2] * 1000);
/** Welded (1 mm) edge table of a triangle list. Returns { open: [{ a, b, tri }], flipped: n, nonManifold: n, edges: n }. */
export function weldEdges(tris) {
  const E = new Map();
  tris.forEach((t, ti) => {
    for (let k = 0; k < 3; k++) {
      const a = t.p[k], b = t.p[(k + 1) % 3], ka = KEY(a), kb = KEY(b); if (ka === kb) continue;
      const fwd = ka < kb, key = fwd ? ka + '|' + kb : kb + '|' + ka;
      let e = E.get(key); if (!e) E.set(key, (e = { a: fwd ? a : b, b: fwd ? b : a, f: 0, r: 0, tri: ti }));
      if (fwd) e.f++; else e.r++;
    }
  });
  const open = []; let flipped = 0, nonManifold = 0;
  for (const e of E.values()) {
    const n = e.f + e.r;
    if (n === 1) open.push({ a: e.a, b: e.b, tri: e.tri });
    else if (n === 2 && (e.f === 2 || e.r === 2)) flipped++;
    else if (n > 2) nonManifold++;
  }
  return { open, flipped, nonManifold, edges: E.size };
}

// ------------------------------------------------------------------------------------------------ the scene (single-sided triangles near the features) + the ray test
const CS = 12;
export function makeScene(features, { pad = 16 } = {}) {
  // cells of interest: the bounding boxes of the features grown by `pad`
  const want = new Set();
  const fb = new Map();
  for (const f of features) {
    const tris = trisOf(f); if (!tris.length) continue;
    const bb = bboxOf(tris); fb.set(f, { tris, bb });
    for (let cx = Math.floor((bb[0] - pad) / CS); cx <= Math.floor((bb[3] + pad) / CS); cx++) for (let cz = Math.floor((bb[2] - pad) / CS); cz <= Math.floor((bb[5] + pad) / CS); cz++) want.add(cx + ',' + cz);
  }
  return { want, fb, grid: new Map(), builders: [], built: false };
}
/** index the triangles of the streams the front-face test needs (walls / core / roof of the spy builders) */
export function indexScene(scene, M) {
  const { grid, want } = scene;
  const bi = (B) => { let i = scene.builders.indexOf(B); if (i < 0) { i = scene.builders.length; scene.builders.push(B); } return i; };
  for (const stream of SINGLE) for (const [, B] of M.s[stream]) {
    const id = bi(B), pos = B.pos, idx = B.idx;
    for (let i = 0; i < idx.length; i += 3) {
      const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      const x0 = Math.min(pos[a], pos[b], pos[c]), x1 = Math.max(pos[a], pos[b], pos[c]), z0 = Math.min(pos[a + 2], pos[b + 2], pos[c + 2]), z1 = Math.max(pos[a + 2], pos[b + 2], pos[c + 2]);
      const cx0 = Math.floor(x0 / CS), cx1 = Math.floor(x1 / CS), cz0 = Math.floor(z0 / CS), cz1 = Math.floor(z1 / CS);
      if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 400) continue;                  // a ground-sized sheet (not a facade / feature part)
      for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
        const k = cx + ',' + cz; if (!want.has(k)) continue;
        let g = grid.get(k); if (!g) grid.set(k, (g = [])); g.push(id, i / 3);
      }
    }
  }
  scene.built = true;
}
const fib = (n) => { const out = [], g = Math.PI * (3 - Math.sqrt(5)); for (let i = 0; i < n; i++) { const y = 1 - (i + 0.5) * 2 / n, r = Math.sqrt(1 - y * y), a = i * g; out.push([Math.cos(a) * r, y, Math.sin(a) * r]); } return out; };
const DIRS = fib(64);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

/** Moller-Trumbore, no culling: returns t (> eps) or -1 */
function hitTri(o, d, a, b, c) {
  const e1x = b[0] - a[0], e1y = b[1] - a[1], e1z = b[2] - a[2], e2x = c[0] - a[0], e2y = c[1] - a[1], e2z = c[2] - a[2];
  const px = d[1] * e2z - d[2] * e2y, py = d[2] * e2x - d[0] * e2z, pz = d[0] * e2y - d[1] * e2x;
  const det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) return -1;
  const inv = 1 / det, tx = o[0] - a[0], ty = o[1] - a[1], tz = o[2] - a[2];
  const u = (tx * px + ty * py + tz * pz) * inv; if (u < -1e-7 || u > 1 + 1e-7) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
  const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv; if (v < -1e-7 || u + v > 1 + 1e-7) return -1;
  const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return t > 1e-4 ? t : -1;
}

/** SEE-THROUGH TEST of one feature. Rays from outside (64 directions x 8 target points inside the box of the feature, origin 9 m out, never below 1 m above the ground):
 *  the first hit among all single-sided triangles of the neighbourhood is classified; a hit on the BACK face of a triangle of the feature (or one whose centre is inside its box)
 *  = the viewer looks through a missing face (or at an inverted one) into the solid. Returns { rays, hits, bad, byCause, worst: [{ dir, point, stream }] }. */
export function rayAudit(f, scene, M, FP) {
  const ent = scene.fb.get(f); if (!ent) return { rays: 0, hits: 0, bad: 0, byCause: {}, worst: [] };
  const { tris, bb } = ent;
  if (!scene.built) indexScene(scene, M);
  const own = new Set();
  const bid = (B) => { let i = scene.builders.indexOf(B); if (i < 0) { i = scene.builders.length; scene.builders.push(B); } return i; };
  for (const t of tris) if (SINGLE.has(t.stream)) own.add(bid(t.B) + ':' + t.t);
  // local triangle list: cells overlapping the box grown by 12 m
  const R = 12, loc = new Map();
  for (let cx = Math.floor((bb[0] - R) / CS); cx <= Math.floor((bb[3] + R) / CS); cx++) for (let cz = Math.floor((bb[2] - R) / CS); cz <= Math.floor((bb[5] + R) / CS); cz++) {
    const g = scene.grid.get(cx + ',' + cz); if (!g) continue;
    for (let i = 0; i < g.length; i += 2) { const k = g[i] + ':' + g[i + 1]; if (!loc.has(k)) loc.set(k, [g[i], g[i + 1]]); }
  }
  const L = [];
  for (const [k, [bi, ti]] of loc) {
    const B = scene.builders[bi], pos = B.pos, a = B.idx[ti * 3] * 3, b = B.idx[ti * 3 + 1] * 3, c = B.idx[ti * 3 + 2] * 3;
    const A = [pos[a], pos[a + 1], pos[a + 2]], Bp = [pos[b], pos[b + 1], pos[b + 2]], C = [pos[c], pos[c + 1], pos[c + 2]];
    const gn = geoNormal([A, Bp, C]); if (gn.area < 1e-9) continue;
    const cx = (A[0] + Bp[0] + C[0]) / 3, cy = (A[1] + Bp[1] + C[1]) / 3, cz = (A[2] + Bp[2] + C[2]) / 3;
    const inBox = cx > bb[0] - 0.3 && cx < bb[3] + 0.3 && cy > bb[1] - 0.3 && cy < bb[4] + 0.3 && cz > bb[2] - 0.3 && cz < bb[5] + 0.3;
    L.push({ p: [A, Bp, C], n: gn.n, own: own.has(k), inBox, min: [Math.min(A[0], Bp[0], C[0]), Math.min(A[1], Bp[1], C[1]), Math.min(A[2], Bp[2], C[2])], max: [Math.max(A[0], Bp[0], C[0]), Math.max(A[1], Bp[1], C[1]), Math.max(A[2], Bp[2], C[2])] });
  }
  const cxm = (bb[0] + bb[3]) / 2, cym = (bb[1] + bb[4]) / 2, czm = (bb[2] + bb[5]) / 2, sx = bb[3] - bb[0], sy = bb[4] - bb[1], sz = bb[5] - bb[2];
  const D0 = 9 + Math.hypot(sx, sz) / 2;
  const NT = 8, seedBase = f.kind + f.id + Math.round(cxm * 10) + ':' + Math.round(czm * 10);
  const targets = [];
  for (let k = 0; k < NT; k++) targets.push([cxm + (hash(seedBase + 'x' + k) - 0.5) * sx, bb[1] + hash(seedBase + 'y' + k) * sy, czm + (hash(seedBase + 'z' + k) - 0.5) * sz]);
  let rays = 0, hits = 0, bad = 0; const byCause = {}, worst = [];
  const o = [0, 0, 0];
  for (const tg of targets) for (const dir of DIRS) {
    // origin = target + dir * D (the viewer stands at the origin and looks along -dir); never under the ground, and eye height >= 1 m
    let D = D0; const ty = tg[1];
    if (dir[1] < -1e-3) D = Math.min(D, (ty - 1.0) / -dir[1]);      // viewer below the target: the origin must stay above 1 m
    if (D < 2) continue;
    o[0] = tg[0] + dir[0] * D; o[1] = tg[1] + dir[1] * D; o[2] = tg[2] + dir[2] * D;
    if (o[1] < 1.0) continue;
    if (o[0] > bb[0] - 0.2 && o[0] < bb[3] + 0.2 && o[1] > bb[1] - 0.2 && o[1] < bb[4] + 0.2 && o[2] > bb[2] - 0.2 && o[2] < bb[5] + 0.2) continue;      // the viewer is not inside the feature itself
    if (FP && FP.inAnyMass(o)) continue;                              // nobody stands inside a house: such a ray would look at the inside of the host wall
    const d = [-dir[0], -dir[1], -dir[2]];
    rays++;
    // segment box for the cheap rejection
    const sx0 = Math.min(o[0], tg[0]) - 0.01, sx1 = Math.max(o[0], tg[0]) + 0.01, sy0 = Math.min(o[1], tg[1]) - 0.01, sy1 = Math.max(o[1], tg[1]) + 0.01, sz0 = Math.min(o[2], tg[2]) - 0.01, sz1 = Math.max(o[2], tg[2]) + 0.01;
    let best = 1e9, bt = null;
    for (const q of L) {
      if (q.max[0] < sx0 || q.min[0] > sx1 || q.max[1] < sy0 || q.min[1] > sy1 || q.max[2] < sz0 || q.min[2] > sz1) continue;
      const t = hitTri(o, d, q.p[0], q.p[1], q.p[2]);
      // ties (the ray goes through an edge shared by two faces, or a vertex): the FRONT face wins, as on the GPU where the nearer / front fragment is drawn
      if (t > 0 && (t < best - 2e-4 || (t < best + 2e-4 && bt && bt.n[0] * d[0] + bt.n[1] * d[1] + bt.n[2] * d[2] > 1e-6 && q.n[0] * d[0] + q.n[1] * d[1] + q.n[2] * d[2] <= 1e-6))) { best = Math.min(best, t); bt = q; }
    }
    // the target point itself may be outside the solid: continue past it (the ray goes on to D + the box size), the whole ray counts
    if (!bt) {
      // second chance: the rest of the ray beyond the target (e.g. a ray that only touches the far side of the box)
      for (const q of L) { const t = hitTri(o, d, q.p[0], q.p[1], q.p[2]); if (t > 0 && t < best) { best = t; bt = q; } }
      if (!bt) continue;
    }
    hits++;
    const back = bt.n[0] * d[0] + bt.n[1] * d[1] + bt.n[2] * d[2] > 1e-6;
    if (back && (bt.own || bt.inBox)) {
      // only the BACK face of a triangle of the feature itself is a defect. A back face of the host wall inside the box of the feature is informational (hostBack): it is what a ray sees through a
      // carriage arch / doorway of the host wall next to the feature (the arch vault is built by passages.js, which this harness does not run)
      const cause = bt.own ? 'back-face-of-feature' : 'host-wall-back-face';
      byCause[cause] = (byCause[cause] || 0) + 1;
      if (bt.own) bad++;
      if (worst.length < 6) worst.push({ from: o.map((v) => Math.round(v * 10) / 10), dir: d.map((v) => Math.round(v * 100) / 100), at: [o[0] + d[0] * best, o[1] + d[1] * best, o[2] + d[2] * best].map((v) => Math.round(v * 10) / 10), cause });
    }
  }
  return { rays, hits, bad, byCause, worst };
}

// ------------------------------------------------------------------------------------------------ footprints (hidden volume / attachment)
export function ringHas(r, x, z) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
export function distRing(r, x, z) { let d = 1e9; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const ax = r[j][0], az = r[j][1], dx = r[i][0] - ax, dz = r[i][1] - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; }

/** Footprint index of the drawn records (+ hand-built towers, + the landmark-owned masses for the viewer test): hiddenBy(p, margin) = the footprint whose volume hides the point (inside the
 *  ring or within `margin` of its wall, below its deck; the ground hides y <= 6 cm); inNeighbour(p, hostId) = another building contains the point by > 15 cm below its deck;
 *  inAnyMass(p) = the point is inside ANY building volume (drawn or landmark-owned): nobody stands there. */
export async function makeFootprints(W) {
  const { ringFromFlat } = await imp('src/world/lib/massing.js');
  const FC = 24, fgrid = new Map();
  const add = (fp) => { const [x0, x1, z0, z1] = fp.box; for (let cx = Math.floor((x0 - 1) / FC); cx <= Math.floor((x1 + 1) / FC); cx++) for (let cz = Math.floor((z0 - 1) / FC); cz <= Math.floor((z1 + 1) / FC); cz++) { const k = cx + ',' + cz; let g = fgrid.get(k); if (!g) fgrid.set(k, (g = [])); g.push(fp); } };
  const boxOf = (pts) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return [x0, x1, z0, z1]; };
  for (const [id, rec] of W.net.rec) for (const ring of rec.rings) {
    if (ring.hole) continue;
    add({ id, pts: ring.pts, box: boxOf(ring.pts), top: (rec.st.deckY ?? (Math.max(0, rec.b.minH || 0) + rec.st.H + 1.0)) + 0.2, y0: Math.max(0, rec.b.minH || 0) });
  }
  // hand-built towers (towers.js) stand on the ground inside their own footprint: only the ground seam is hidden (top = 0.2)
  for (const c of W.customs) for (const poly of c.b.polys) { const pts = ringFromFlat(poly.o); add({ id: c.b.id, pts, box: boxOf(pts), top: 0.2, y0: 0 }); }
  const masses = [];                                        // landmark-owned buildings: only for the viewer test (their walls are not in the scene)
  for (const o of W.occluders) for (const poly of o.b.polys) { const pts = ringFromFlat(poly.o); if (pts.length < 3) continue; const m = { id: 'owned:' + o.b.id, pts, box: boxOf(pts), top: (Math.max(0, o.b.minH || 0)) + (o.H || 10) + 0.5, y0: Math.max(0, o.b.minH || 0) }; masses.push(m); add({ ...m, owned: true }); }
  const fpAt = (x, z) => fgrid.get(Math.floor(x / FC) + ',' + Math.floor(z / FC)) || [];
  const hiddenBy = (p, m = 0.08, skipId = null) => {
    if (p[1] <= 0.06) return { id: 'ground' };
    for (const fp of fpAt(p[0], p[2])) {
      if (fp.owned || fp.id === skipId) continue;
      if (p[1] > fp.top || p[1] < fp.y0 - 0.2) continue;
      const b = fp.box; if (p[0] < b[0] - m || p[0] > b[1] + m || p[2] < b[2] - m || p[2] > b[3] + m) continue;
      if (ringHas(fp.pts, p[0], p[2]) || distRing(fp.pts, p[0], p[2]) <= m) return fp;
    }
    return null;
  };
  const inNeighbour = (p, hostId) => {
    const hid = String(hostId).replace(/~f$/, '');
    for (const fp of fpAt(p[0], p[2])) {
      if (fp.owned || fp.id === hostId || String(fp.id).replace(/~f$/, '') === hid) continue;
      if (p[1] > fp.top - 0.3 || p[1] < fp.y0 + 0.3) continue;
      const b = fp.box; if (p[0] < b[0] || p[0] > b[1] || p[2] < b[2] || p[2] > b[3]) continue;
      if (ringHas(fp.pts, p[0], p[2]) && distRing(fp.pts, p[0], p[2]) > 0.15) return fp;
    }
    return null;
  };
  const inAnyMass = (p) => {
    for (const fp of fpAt(p[0], p[2])) {
      if (p[1] > fp.top || p[1] < fp.y0) continue;
      const b = fp.box; if (p[0] < b[0] || p[0] > b[1] || p[2] < b[2] || p[2] > b[3]) continue;
      if (ringHas(fp.pts, p[0], p[2])) return true;
    }
    return false;
  };
  return { fpAt, hiddenBy, inNeighbour, inAnyMass };
}

/** distance from point q to the triangle p = [a, b, c] */
export function distPointTri(q, p) {
  const [a, b, c] = p;
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], ap = [q[0] - a[0], q[1] - a[1], q[2] - a[2]];
  const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const d1 = dot(ab, ap), d2 = dot(ac, ap);
  const len = (u) => Math.hypot(u[0], u[1], u[2]);
  const at = (t0, t1, t2) => len([q[0] - (t0 * a[0] + t1 * b[0] + t2 * c[0]), q[1] - (t0 * a[1] + t1 * b[1] + t2 * c[1]), q[2] - (t0 * a[2] + t1 * b[2] + t2 * c[2])]);
  if (d1 <= 0 && d2 <= 0) return at(1, 0, 0);
  const bp = [q[0] - b[0], q[1] - b[1], q[2] - b[2]], d3 = dot(ab, bp), d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return at(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); return at(1 - v, v, 0); }
  const cp = [q[0] - c[0], q[1] - c[1], q[2] - c[2]], d5 = dot(ab, cp), d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return at(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); return at(1 - w, 0, w); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) { const w = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at(0, 1 - w, w); }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  return at(1 - v - w, v, w);
}

/** Is the point q INSIDE a closed part of `tris`? The first triangle hit along each of the six axis rays (skipping index `skip`) must be hit from behind (its geometric normal points the way the ray
 *  goes). One ray is not enough: a point under the ceiling of an open-bottomed funnel has a back face above it and is not inside anything. */
export function insideSolid(q, tris, skip) {
  for (const d of [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) {
    let best = 1e9, hit = null; const o = [q[0] + d[0] * 1e-3, q[1] + d[1] * 1e-3, q[2] + d[2] * 1e-3];
    for (let i = 0; i < tris.length; i++) {
      if (i === skip) continue;
      const t = hitTri(o, d, tris[i].p[0], tris[i].p[1], tris[i].p[2]);
      if (t > 0 && t < best) { best = t; hit = tris[i]; }
    }
    if (!hit) return false;
    const g = geoNormal(hit.p);
    if (g.n[0] * d[0] + g.n[1] * d[1] + g.n[2] * d[2] <= 1e-6) return false;
  }
  return true;
}
