// landmarksTauride/furniture.js - THE FURNITURE OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T6): the 132 benches and 167 bins of data/furniture.js (OSM nodes, claimed since T2: props/osm.js draws none of them) and the
// cast-iron LANTERNS on the 17 lit ways (the garden lights itself: a claimed way loses its street lamps and the data maps no lamp in the garden), plus the lanterns on the stone gate piers (fence.js).
//   planFurniture(inputs)   PURE and DETERMINISTIC: { benches, bins, lanterns, gateLanterns, stats }. Benches and bins keep their OSM node unless it stands on a ribbon, in the water or in a footprint: they then move along the
//                           normal of the nearest way (<= 2.4 m / 1.6 m, `node` records the move); a bench faces the nearest way ribbon within 6 m, else the nearest water within 30 m, else the garden centre (data/furniture-design.js BENCH).
//   buildFurniture(ctx, parent, plan)   the meshes through lib/knock-inst.js (the strip's furniture pattern: with ctx.knock one dynamic InstancedMesh per part per 384 m cell and one knock record per piece, without it
//                           one static InstancedMesh per part), the colliders (absolute y: every y is gardenHeight, T2 rule: a box from min(0, y) - 0.5 to y + the height, so that a piece on a hill still blocks and is an obstacle of the
//                           pedestrians' nav), the light pools and the night glow of the lanterns (the page's uNight, as streets/lamps.js).
// Vertex-coloured toon models built with streets/vb.js (the strip's lamp and car builder): a bench 72 triangles (black cast ends and back posts, orange-brown slats: props/furniture.js benchPark), a bin 36 (the black cast-iron
// urn of the Petersburg parks, hexagonal), a lantern 96 + a 16-triangle glow.
import * as THREE from 'three';
import { VB, cg, mtx } from '../streets/vb.js';
import { registerLOD } from '../../core/spatial.js';
import { knockInstances } from '../lib/knock-inst.js';
import { gardenHeight, GARDEN_SHORE } from './height.js';
import { PATHS } from './data/paths.js';
import { BENCHES, BINS, FENCES, GATES } from './data/furniture.js';
import { GARDEN, FOOTPRINTS } from './data/footprints.js';
import { BENCH, BIN, LANTERN, FURNITURE_CELL } from './data/furniture-design.js';
import { CLEARINGS } from './data/vegetation.js';

// ---------------------------------------------------------------------------------------------------------------- geometry helpers
const segPoint = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return [ax + dx * t, az + dz * t, t]; };
/** the nearest point of a flat polyline [x, z, ...]: [x, z, distance, segment index] */
export function nearestOn(pts, x, z) {
  let best = [pts[0], pts[1], Infinity, 0];
  for (let i = 0; i + 3 < pts.length; i += 2) { const p = segPoint(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]), d = Math.hypot(x - p[0], z - p[1]); if (d < best[2]) best = [p[0], p[1], d, i / 2]; }
  return best;
}
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; };
const ringDist = (o, x, z) => { let m = Infinity; for (let i = 0; i < o.length; i += 2) { const p = segPoint(x, z, o[i], o[i + 1], o[(i + 2) % o.length], o[(i + 3) % o.length]); m = Math.min(m, Math.hypot(x - p[0], z - p[1])); } return m; };
const bbox = (pts) => { let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity; for (let i = 0; i < pts.length; i += 2) { a = Math.min(a, pts[i]); b = Math.max(b, pts[i]); c = Math.min(c, pts[i + 1]); d = Math.max(d, pts[i + 1]); } return [a, b, c, d]; };
export const hashXZ = (x, z, seed = 0) => { let h = (Math.imul(Math.round(x * 100) | 0, 374761393) + Math.imul(Math.round(z * 100) | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

/** the drawn half width of a way's ribbon edge: the nominal half width + the width variation (paths-draped.js widthVar) */
export const ribbonHalf = (p, L = LANTERN) => (p.cls === 'steps' ? 1.1 + 0.2 : p.w / 2 * (1 + L.widthVar));

// ---------------------------------------------------------------------------------------------------------------- the plan
/**
 * o = { gh, shore, paths, benches, bins, footprints, garden, fences, gates, piers (fence plan), gateLanterns, decks (bridge keepOut), D: { BENCH, BIN, LANTERN } }
 */
export function planFurniture(o = {}) {
  const gh = o.gh || gardenHeight, shore = o.shore || GARDEN_SHORE, paths = o.paths || PATHS, DB = o.BENCH || BENCH, DN = o.BIN || BIN, DL = o.LANTERN || LANTERN;
  const poses = o.poses || CLEARINGS, garden = o.garden || GARDEN.o, footprints = o.footprints || FOOTPRINTS.flatMap((f) => f.polys.map((p) => p.o)), fences = o.fences || FENCES, gates = o.gates || GATES, piers = o.piers || [], decks = o.decks || [];
  const H = (x, z) => gh(x, z) ?? 0;
  const ways = paths.filter((p) => p.cls !== 'bridge').map((p) => ({ id: p.id, pts: p.pts, hw: ribbonHalf(p, DL), steps: p.cls === 'steps', box: bbox(p.pts), lit: !!p.lit, cls: p.cls, w: p.w }));
  const fpBox = footprints.map((r) => ({ r, b: bbox(r) }));
  /** the nearest way ribbon edge: { way, d (to the centre line), edge (d - half width), px, pz } */
  const nearestWay = (x, z, steps = true, reach = 60) => {
    let best = null;
    for (const w of ways) {
      if (!steps && w.steps) continue;
      if (x < w.box[0] - reach || x > w.box[1] + reach || z < w.box[2] - reach || z > w.box[3] + reach) continue;
      const q = nearestOn(w.pts, x, z), e = q[2] - w.hw;
      if (!best || e < best.edge) best = { way: w, d: q[2], edge: e, px: q[0], pz: q[1], seg: q[3] };
    }
    return best;
  };
  /** the least edge distance of a set of points to every ribbon (negative = on a ribbon) */
  const ribbonClear = (pts) => { let m = Infinity; for (const [x, z] of pts) { const n = nearestWay(x, z, true, 8); if (n) m = Math.min(m, n.edge); } return m; };
  const inFootprint = (x, z, m = 0) => fpBox.some((f) => x > f.b[0] - m && x < f.b[1] + m && z > f.b[2] - m && z < f.b[3] + m && (ringHas(f.r, x, z) || ringDist(f.r, x, z) < m));
  const facing = (x, z) => {                                                                // the front direction of a bench at (x, z): [fx, fz, why]
    const w = nearestWay(x, z, false, DB.faceWay + 4);
    if (w && w.edge <= DB.faceWay) { const dx = w.px - x, dz = w.pz - z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l, 'way']; }
    const d = shore.dist(x, z);
    if (d > 0 && d < DB.faceWater) { const e = 0.6, gx = shore.dist(x + e, z) - shore.dist(x - e, z), gz = shore.dist(x, z + e) - shore.dist(x, z - e), l = Math.hypot(gx, gz); if (l > 1e-6) return [-gx / l, -gz / l, 'water']; }
    const dx = DB.centre[0] - x, dz = DB.centre[1] - z, l = Math.hypot(dx, dz) || 1; return [dx / l, dz / l, 'centre'];
  };
  const rectPts = (x, z, rotY, len, dep) => {                                                // the footprint of a bench: corners + edge midpoints
    const c = Math.cos(rotY), s = Math.sin(rotY), out = [];
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) { const lx = u * len / 2, lz = v * dep / 2; out.push([x + c * lx + s * lz, z - s * lx + c * lz]); }
    return out;
  };
  // review fix: a bench or a bin never stands in the keep-out of a bridge deck (the bench of the node n13371954335 stood 1.77 m from the end of the dam, inside its collider), and a bin never stands in a bench seat (`extra`)
  const deckAxes = decks.map((k) => ({ pts: k.axis.flat(), r: k.hw + 0.1 }));
  const offDecks = (pts) => deckAxes.every((d) => pts.every(([x, z]) => nearestOn(d.pts, x, z)[2] >= d.r));
  const okSpot = (pts, edge, extra) => ribbonClear(pts) >= edge && pts.every(([x, z]) => shore.dist(x, z) > 0.3 && shore.inGarden(x, z) && !inFootprint(x, z, 0.3)) && offDecks(pts) && (!extra || extra(pts));
  /** place a piece: its OSM node, else the NEAREST clear spot within `max` m (rings of `step` m with 24 directions, the first clear candidate of the nearest ring wins: deterministic; the T5 nudge of the OSM trees) */
  const place = (n, footFn, edge, step, max, extra) => {
    const make = (x, z) => { const f = facing(x, z), rotY = Math.atan2(f[0], f[1]); return { x, z, rotY, face: f[2], pts: footFn(x, z, rotY) }; };
    let q = make(n.x, n.z);
    if (okSpot(q.pts, edge, extra)) return { ...q, node: null };
    for (let d = step; d <= max + 1e-9; d += step) for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12; q = make(n.x + Math.cos(a) * d, n.z + Math.sin(a) * d);
      if (okSpot(q.pts, edge, extra)) return { ...q, node: { x: n.x, z: n.z, d } };
    }
    return null;
  };
  const stats = { benches: 0, benchesMoved: 0, benchesStuck: 0, bins: 0, binsMoved: 0, binsStuck: 0, lanterns: 0, lanternDropped: {}, faces: { way: 0, water: 0, centre: 0 }, ms: 0 };
  const t0 = Date.now();
  const benches = [], bins = [], stuck = [];
  for (const n of o.benches || BENCHES) {
    const r = place(n, (x, z, rot) => rectPts(x, z, rot, DB.len, DB.depth), DB.edge, DB.nudgeStep, DB.nudgeMax);
    const at = r || (() => { const f = facing(n.x, n.z); stuck.push({ id: n.id, kind: 'bench' }); stats.benchesStuck++; return { x: n.x, z: n.z, rotY: Math.atan2(f[0], f[1]), face: f[2], node: null, stuck: true }; })();
    benches.push({ id: n.id, x: at.x, z: at.z, y: H(at.x, at.z), rotY: at.rotY, face: at.face, node: at.node, backrest: n.backrest !== 'no', stuck: !!at.stuck });
    stats.faces[at.face]++; if (at.node) stats.benchesMoved++;
  }
  const benchHas = (b, x, z, m) => { const c = Math.cos(b.rotY), sn = Math.sin(b.rotY), dx = x - b.x, dz = z - b.z; return Math.abs(c * dx - sn * dz) < DB.len / 2 + m && Math.abs(sn * dx + c * dz) < DB.depth / 2 + m; };
  for (const n of o.bins || BINS) {
    const r = place(n, (x, z) => { const o = [[x, z]]; for (let k = 0; k < 8; k++) o.push([x + Math.cos(k * Math.PI / 4) * DN.r, z + Math.sin(k * Math.PI / 4) * DN.r]); return o; }, DN.edge, DN.nudgeStep, DN.nudgeMax, (pts) => !benches.some((b) => benchHas(b, pts[0][0], pts[0][1], DN.r + 0.05)));
    const at = r || (() => { stuck.push({ id: n.id, kind: 'bin' }); stats.binsStuck++; return { x: n.x, z: n.z, rotY: 0, node: null, stuck: true }; })();
    bins.push({ id: n.id, x: at.x, z: at.z, y: H(at.x, at.z), rotY: hashXZ(n.x, n.z, 5) * Math.PI * 2, node: at.node, stuck: !!at.stuck });
    if (at.node) stats.binsMoved++;
  }
  stats.benches = benches.length; stats.bins = bins.length;
  // ---- the lanterns: the lit ways (not bridges, not steps), every `spacing` m on alternate sides, `offset` m beyond the ribbon edge
  const fenceLines = fences.map((f) => f.pts), gatePts = [...gates.map((g) => [g.x, g.z])], deckList = decks.map((k) => ({ pts: k.axis.flat(), r: k.hw + DL.clear.deck }));
  const lanterns = [], drop = (why) => { stats.lanternDropped[why] = (stats.lanternDropped[why] || 0) + 1; return false; };
  const taken = [...benches.map((b) => ({ x: b.x, z: b.z, r: DL.clear.bench })), ...bins.map((b) => ({ x: b.x, z: b.z, r: DL.clear.bin })), ...piers.map((p) => ({ x: p.x, z: p.z, r: DL.clear.pier }))];
  const stairWays = ways.filter((w) => w.steps);
  const lanternOk = (x, z, selfWay) => {
    if (!shore.inGarden(x, z)) return drop('outside');
    for (const l of fenceLines) { const q = nearestOn(l, x, z); if (q[2] < DL.clear.fence) return drop('fence'); }
    if (shore.dist(x, z) < 1.5) return drop('water');
    if (inFootprint(x, z, DL.clear.footprint)) return drop('footprint');
    const nw = ribbonClear([[x, z]]); if (nw < DL.offset * 0.5) return drop('ribbon');
    for (const s of stairWays) if (nearestOn(s.pts, x, z)[2] < DL.clear.stair + s.hw) return drop('stair');
    for (const d of deckList) if (nearestOn(d.pts, x, z)[2] < d.r) return drop('deck');
    for (const g of gatePts) if (Math.hypot(g[0] - x, g[1] - z) < DL.clear.gate) return drop('gate');
    for (const c of poses) if (Math.hypot(c.x - x, c.z - z) < DL.clear.pose) return drop('pose');
    for (const t of taken) if (Math.hypot(t.x - x, t.z - z) < t.r) return drop('piece');
    for (const l of lanterns) if (Math.hypot(l.x - x, l.z - z) < DL.clear.lantern) return drop('lantern');
    const e = 0.5, sl = Math.hypot(H(x + e, z) - H(x - e, z), H(x, z + e) - H(x, z - e)); if (sl > 0.2) return drop('slope');
    return true;
  };
  for (const w of ways) {
    if (!w.lit || w.steps) continue;
    const pts = w.pts, segs = []; let total = 0;
    for (let i = 0; i + 3 < pts.length; i += 2) { const l = Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]); segs.push([total, l, i]); total += l; }
    // the vertices where the way turns sharply (the drawn ribbon cuts the corner there): no lantern within 6 m
    const sharp = []; for (let k = 1; k < segs.length; k++) { const i = segs[k][2], ux = pts[i] - pts[i - 2], uz = pts[i + 1] - pts[i - 1], vx = pts[i + 2] - pts[i], vz = pts[i + 3] - pts[i + 1]; const c = (ux * vx + uz * vz) / ((Math.hypot(ux, uz) * Math.hypot(vx, vz)) || 1); if (c < 0.94) sharp.push(segs[k][0]); }
    let idx = 0;
    for (let s = DL.start; s <= total - DL.start * 0.5; s += DL.spacing, idx++) {
      const sg = segs.find((q) => s >= q[0] && s <= q[0] + q[1]) || segs[segs.length - 1], t = (s - sg[0]) / sg[1], i = sg[2];
      const tx = (pts[i + 2] - pts[i]) / sg[1], tz = (pts[i + 3] - pts[i + 1]) / sg[1], px = pts[i] + (pts[i + 2] - pts[i]) * t, pz = pts[i + 1] + (pts[i + 3] - pts[i + 1]) * t;
      if (sharp.some((q) => Math.abs(q - s) < 6)) { drop('corner'); continue; }
      const side = idx % 2 ? 1 : -1, off = w.hw + DL.offset, x = px + -tz * side * off, z = pz + tx * side * off;
      if (!lanternOk(x, z, w)) continue;
      lanterns.push({ x, z, y: H(x, z), rotY: Math.atan2(-tz * side, tx * side), way: w.id, side, s });
    }
  }
  stats.lanterns = lanterns.length;
  stats.ms = Date.now() - t0;
  return { benches, bins, lanterns, gateLanterns: o.gateLanterns || [], stats, stuck, ways, ground: H };
}

// ---------------------------------------------------------------------------------------------------------------- the models
let _models = null;
/** a unit box without the faces nobody can see (0 +x, 1 -x, 2 +y, 3 -y, 4 +z, 5 -z: the BoxGeometry order, 2 triangles each): the same pixels as the whole box for 2 triangles a face less (T6 fix round 2: the furniture gate 15 k) */
const openBox = (skip) => cg('tauride-obox|' + skip.join(''), () => { const g = new THREE.BoxGeometry(1, 1, 1), a = Array.from(g.index.array), keep = []; for (let f = 0; f < 6; f++) if (!skip.includes(f)) keep.push(...a.slice(f * 6, f * 6 + 6)); g.setIndex(keep); return g; });
const obox = (vb, skip, w, h, d, color, pos, rot) => vb.add(openBox(skip), color, mtx(pos, rot, [w, h, d]));
/** the hexagonal frustum of the bin without its bottom cap (it stands on the ground): torso 12 + top cap 6 triangles */
const binGeo = (rt, rb, h) => cg('tauride-bin|' + [rt, rb, h].join(), () => { const g = new THREE.CylinderGeometry(rt, rb, h, 6, 1, false); g.setIndex(Array.from(g.index.array).slice(0, 12 * 3 + 6 * 3)); return g; });
/** the three vertex-coloured geometries (cached): bench, bin, lantern body + glow */
export function furnitureModels(B = BENCH, N = BIN, L = LANTERN) {
  if (_models) return _models;
  const bench = new VB(), len = B.len, hl = len / 2 - 0.12;
  for (const s of [-1, 1]) {
    obox(bench, [3], 0.07, 0.44, 0.5, B.iron, [s * hl, 0.22, 0]);                                           // the cast end (no bottom)
    obox(bench, [3], 0.07, 0.5, 0.07, B.iron, [s * hl, 0.68, -0.23], [-10 * Math.PI / 180, 0, 0]);         // the back post (no bottom: it stands inside the end)
  }
  obox(bench, [0, 1, 3], len - 0.2, 0.04, 0.42, B.wood, [0, 0.46, 0.04]);                                                // the seat slats (one block)
  obox(bench, [0, 1, 3], len - 0.2, 0.26, 0.035, B.wood, [0, 0.76, -0.25], [-10 * Math.PI / 180, 0, 0]);               // the back slats
  const bin = new VB();
  bin.add(binGeo(0.31, 0.13, 0.76), N.iron, mtx([0, 0.38, 0]));                                                // the vase with its flared lip (hexagonal, one frustum)
  const body = new VB(), glow = new VB(), H = L.h;
  body.cyl(0.22, 0.17, 0.28, L.iron, [0, 0.14, 0], null, 8, null, true);                                   // the plinth
  body.cyl(0.075, 0.1, H - 1.78, L.iron, [0, 0.28 + (H - 1.78) / 2, 0], null, 6, null, true);              // the pole
  body.cyl(0.17, 0.12, 0.2, L.ironL, [0, 0.78, 0], null, 8, null, true);                                   // the collar
  body.cyl(0.2, 0.16, 0.2, L.ironL, [0, H - 1.4, 0], null, 6, null, true);                                 // the cup under the lantern
  body.cyl(0.03, 0.5, 0.5, L.iron, [0, H - 0.35, 0], null, 4, null, true);                                 // the pyramid roof
  body.ball(0.06, L.ironL, [0, H - 0.03, 0], null, 'oct');                                                   // the finial
  for (const [x, z] of [[0, 0.36], [0, -0.36], [0.36, 0], [-0.36, 0]]) obox(body, [2, 3], 0.035, 0.74, 0.035, L.iron, [x, H - 0.95, z]);   // the frame ribs
  glow.cyl(0.4, 0.3, 0.7, L.glass, [0, H - 0.95, 0], null, 4, null, true);                                  // the glass (glows at night)
  _models = { bench: bench.build(), bin: bin.build(), body: body.build(), glow: glow.build() };
  return _models;
}
export const resetFurnitureModels = () => { _models = null; };

// ---------------------------------------------------------------------------------------------------------------- the build
const triOf = (g) => (g.index ? g.index.count : g.attributes.position.count) / 3;

export function buildFurniture(ctx, parent, plan, opts = {}) {
  const ph = ctx.physics, B = opts.BENCH || BENCH, N = opts.BIN || BIN, L = opts.LANTERN || LANTERN;
  const models = furnitureModels(B, N, L), T = ctx.mat.toon;
  const mVC = T('#ffffff', { vertexColors: true, paint: 0.02, name: 'tauride-furniture' });
  const mGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff0cc'), toneMapped: false, name: 'tauride-lantern-glow' });
  const out = { meshes: [], records: { bench: [], bin: [], lamp: [] }, items: { bench: [], bin: [], lamp: [] }, triangles: 0, draws: 0, instances: {} };
  const yRange = (y, top) => [Math.min(0, y) - 0.5, y + top];
  // ---- benches
  { const spots = plan.benches.map((b) => ({ x: b.x, y: b.y, z: b.z, rotY: b.rotY })), items = plan.benches.map((b) => { const [y0, y1] = yRange(b.y, B.h); return ph.addBox(b.x, b.z, B.len, B.depth, b.rotY, y0, y1); });
    const r = knockInstances(ctx, { name: 'tauride-benches', parts: [{ geo: models.bench, mat: mVC, name: 'bench' }], spots, items, far: B.far, cell: FURNITURE_CELL, rec: { kind: 'bench', mass: B.mass, h: B.h, w: B.len, d: B.depth, hitK: B.hitK, minDv: 0.5 } });
    out.records.bench = r.records; out.items.bench = items; out.meshes.push(...r.meshes); out.triangles += triOf(models.bench) * spots.length; out.instances.bench = spots.length; }
  // ---- bins
  { const spots = plan.bins.map((b) => ({ x: b.x, y: b.y, z: b.z, rotY: b.rotY })), items = plan.bins.map((b) => { const [y0, y1] = yRange(b.y, N.h); return ph.addCylinder(b.x, b.z, N.r, y0, y1); });
    const r = knockInstances(ctx, { name: 'tauride-bins', parts: [{ geo: models.bin, mat: mVC, name: 'bin' }], spots, items, far: N.far, cell: FURNITURE_CELL, rec: { kind: 'bin', mass: N.mass, h: N.h, r: N.r, hitK: N.hitK, metal: true } });
    out.records.bin = r.records; out.items.bin = items; out.meshes.push(...r.meshes); out.triangles += triOf(models.bin) * spots.length; out.instances.bin = spots.length; }
  // ---- lanterns: the garden's own (a collider each, knockable) and the ones on the gate piers (a visual on the pier, no record)
  const spots = [...plan.lanterns.map((l) => ({ x: l.x, y: l.y, z: l.z, rotY: l.rotY, s: 1, own: true })), ...plan.gateLanterns.map((l) => ({ x: l.x, y: l.y, gy: l.gy, z: l.z, rotY: l.rotY, s: 0.5, own: false, gate: l.gate }))];
  { const items = spots.map((s) => (s.own ? ph.addCylinder(s.x, s.z, 0.17, ...yRange(s.y, L.h)) : null));
    // the light pools: one shared additive mesh (one draw), an entry per lantern, zeroed with the lantern when it is knocked
    const tPool = ctx.tex.draw(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { key: 'tauride-pool', anisotropy: 1 });
    let pool = null, mPool = null;
    if (spots.length) {
      const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
      mPool = new THREE.MeshBasicMaterial({ map: tPool, color: new THREE.Color('#ffd9a0'), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, name: 'tauride-lantern-pool' });
      pool = new THREE.InstancedMesh(geo, mPool, spots.length); pool.name = 'tauride-lantern-pools';
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), V = new THREE.Vector3(), Sc = new THREE.Vector3(L.poolR * 2, 1, L.poolR * 2), G = plan.ground || ((x, z) => 0);
      spots.forEach((s, i) => {
        // the pool lies on the highest ground within its radius + 4 cm (a pool on a slope would sink into it on the uphill side)
        let y = s.gy ?? s.y; for (let a = 0; a < 8; a++) y = Math.max(y, G(s.x + Math.cos(a * Math.PI / 4) * L.poolR * 0.7, s.z + Math.sin(a * Math.PI / 4) * L.poolR * 0.7));
        s.pool = i; M.compose(V.set(s.x, y + 0.04, s.z), Q, Sc); pool.setMatrixAt(i, M);
      });
      pool.instanceMatrix.needsUpdate = true; pool.frustumCulled = false; pool.renderOrder = 5; ctx.noOutline(pool); ctx.noBatch(pool); parent.add(pool); pool.visible = false; registerLOD(pool, L.farGlow);
    }
    const r = knockInstances(ctx, { name: 'tauride-lanterns', parts: [{ geo: models.body, mat: mVC, name: 'body', far: L.far }, { geo: models.glow, mat: mGlow, shadow: false, noOutline: true, hide: true, far: L.farGlow, name: 'glow' }],
      spots, items: (i) => items[i], far: L.far, cell: FURNITURE_CELL, rec: (s) => (s.own ? { kind: 'lamp', mass: L.mass, h: L.h, r: 0.17, anchored: L.anchored, hitK: L.hitK, metal: true } : null),
      extraParts: pool ? (i, s) => [{ mesh: pool, index: s.pool, hide: true }] : null });
    out.records.lamp = r.records; out.items.lamp = items; out.meshes.push(...r.meshes); out.triangles += (triOf(models.body) + triOf(models.glow)) * spots.length + 2 * spots.length; out.instances.lamp = spots.length;
    ctx.onUpdate(() => {
      const n = ctx.shared.uNight ? ctx.shared.uNight.value : 0, k = Math.max(0, Math.min(1, (n - 0.05) / 0.5));
      if (pool) { pool.visible = k > 0.01; mPool.opacity = L.poolK * k; }
      mGlow.color.setRGB(1.0, 0.9, 0.7).multiplyScalar(0.7 + 1.5 * n);
    });
    out.pool = pool; out.glowMaterial = mGlow; }
  out.draws = out.meshes.length + (out.pool ? 1 : 0);
  out.colliders = out.items.bench.length + out.items.bin.length + out.items.lamp.filter(Boolean).length;
  out.spots = spots;
  return out;
}

/** the benches in the shape people/nav.js addBench wants ({ x, z, rotY, len, y, where }) */
export const benchSeats = (plan, B = BENCH) => plan.benches.map((b) => ({ x: b.x, z: b.z, rotY: b.rotY, len: B.len, y: b.y, where: 'garden' }));

/** the footprints of the furniture as discs { x, z, r } for the post pass of vegetation.js (KEEP_OUT.furniture: no trunk on a bench, a bin, a lantern, a pier or a panel): a bench is three discs along its length,
 *  `fence` = the plan of fence.js (piers, gate piers, closed panels) */
export function keepOutDiscs(plan, fence = null, B = BENCH) {
  const out = [];
  for (const b of plan.benches) { const c = Math.cos(b.rotY), s = Math.sin(b.rotY); for (const k of [-B.len * 0.36, 0, B.len * 0.36]) out.push({ x: b.x + c * k, z: b.z - s * k, r: B.depth * 0.72 }); }
  for (const b of plan.bins) out.push({ x: b.x, z: b.z, r: BIN.r });
  for (const l of plan.lanterns) out.push({ x: l.x, z: l.z, r: 0.25 });
  if (fence) {
    for (const p of fence.piers) if (p.kind === 'pier') out.push({ x: p.x, z: p.z, r: 0.35 });
    for (const g of fence.gates) for (const p of g.gatePiers) out.push({ x: p.x, z: p.z, r: 0.6 });
    for (const p of fence.panels) if (!p.open && !p.drop && !p.pitch) out.push({ x: p.x, z: p.z, r: 0.6 });
  }
  return out;
}

/** the worn spots of data/ground.js with the plaza spots resolved from the furniture data (T6): a spot with `follow` (an OSM node id) stands on that node + (dx, dz); `nodes` = the FOUNTAINS, MONUMENTS and GATES records */
export function resolveWornSpots(spots, nodes) {
  const at = new Map(nodes.map((q) => [q.id, q]));
  return spots.map((w) => { if (!w.follow) return w; const n = at.get(w.follow); return n ? { ...w, x: n.x + (w.dx || 0), z: n.z + (w.dz || 0) } : w; });
}
