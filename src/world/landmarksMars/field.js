// landmarksMars/field.js - the Mars Field (Марсово поле): the pink-brown gravel alleys and the red-brown plaza of the parterre garden (Fomin 1920-26), granite slab strips, the four shrub rondels with their
// centre trees, spruce pairs at the memorial corners, the clipped-lime rows along the barracks and the east promenade, free lawn trees, 48 green cast-iron lamps with opal globes (the 16 plaza / arm ones are the
// historic lanterns), 61 white benches and bins.  Dossier docs/research/mars-field.md section 3 + Appendix A1-A3, photos refs/mars-field fld_05 mem_01 mem_17 aer_01 pav_01 pav_06.
// Layout comes from the OSM footways (ROADS, ids in groups.js); widths are estimates (+-30 %, dossier KNOWN ERRORS 2).  The lawns are the generic ground (environment paints the park as lawn; the claim
// removes the generic wood / tufts); alley ribbons are clipped against `net.cover` (road integrity).  Furniture positions are the OSM lamp / bench nodes inside the Field ring.
import * as THREE from 'three';
import * as L from '../layout.js';
import { ROADS, LAMPS, FURNITURE, GREEN } from '../data/city.js';
import { fromUV, toUV, C0 } from './frame.js';
import { ribbon, pairs, chaikin, densify, fillPoly, fillPolyFine, inflate, inRing, distToLine, roadTest, coverFn } from './surfaces.js';
import { partsGeos, addInstanced, mat4 } from './inst.js';
import { plantTrees } from './trees.js';

export const FIELD_RING = [[-1286, -1359], [-1221, -1193], [-1216, -1180], [-1172, -1066], [-1154, -1052], [-1127, -1047], [-1000, -1018], [-927, -1004], [-916, -1063], [-991, -1283], [-1056, -1472], [-1083, -1484], [-1208, -1425], [-1275, -1394]];
const MAIN = new Set(['w151671754', 'w151671755']);
const FLANK = new Set(['w307505848', 'w307505849', 'w364436489', 'w151671748', 'w151671749', 'w45393536', 'w45393527', 'w45393533', 'w45393554', 'w45393550', 'w151671750', 'w151671751', 'w45393538', 'w45393529', 'w45393521', 'w45393522']);
const PROM = new Set(['w776081855', 'w776081850', 'w45393542', 'w1164028382', 'w1164028381', 'w197658104', 'w197658136', 'w285989616', 'w308652195', 'w116254043']);
const LOOP = new Set(['w45393534', 'w45393545', 'w45393546', 'w45393572']);
const SMALL = new Set(['w197658114', 'w197658112', 'w197658131', 'w197658132', 'w1164028391', 'w1164028346', 'w160003832']);
const BY_MEMORIAL = new Set(['w197658109', 'w197658111', 'w197658116', 'w197658121', 'w197658122', 'w151671757', 'w1164028392', 'w1164028393', 'w197658105', 'w197658110']);
const widthOf = (id) => (MAIN.has(id) ? 8 : LOOP.has(id) ? 2.6 : SMALL.has(id) ? 2.4 : PROM.has(id) ? 3.2 : FLANK.has(id) ? 4.6 : 5.2);
const hashId = (id) => { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997; return h; };

export function plazaRing() {
  // rounded octagon 116 x 75 m in the field frame (u -52 .. +64, v -37 .. +38): docs section 3.1
  const uv = [[-52, -17], [-34, -37], [36, -37], [64, -16], [64, 16], [36, 38], [-34, 38], [-52, 17]];
  return chaikin(uv.map(([u, v]) => { const w = fromUV(u, v); return [w.x, w.z]; }), 2, true);
}

export function field(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics, rng = ctx.rng(20261006);
  const roadHit = roadTest(ctx), cover = coverFn(ctx);
  const clip = (x, z) => cover(x, z) > -0.25;                         // on / next to asphalt
  const owned = new Set(); const stats = { ribbons: 0 };
  // ---- the lawns: one fine-tessellated sheet over the park polygon (a little inflated: it ends under the asphalt / pavements, which are higher); the generic ground below stays hidden
  fillPolyFine(P, M.lawnTop, inflate(FIELD_RING, 2.5), 0.012, { maxEdge: 26, tile: 6 });
  // ---- the claimed footways
  const mine = ROADS.filter((r) => (r.hw === 'footway' || r.hw === 'path') && !r.tunnel && !r.bridge && FOOT_IDS.has(r.id));
  const paths = [];                                                  // for benches / trees (centrelines)
  for (const r of mine) {
    if (BY_MEMORIAL.has(r.id)) continue;
    const pts = pairs(r.pts), closed = pts.length > 4 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 0.5;
    const w = widthOf(r.id), y = 0.022 + (hashId(r.id) % 9) * 0.0006;
    const line = closed ? pts.slice(0, -1) : pts;
    stats.ribbons += ribbon(P, M.gravel, line, w, y, { closed, clip, tile: 3 });
    paths.push({ id: r.id, pts: line, closed, w });
  }
  // ---- the plaza (red-brown gravel) with a granite slab band along its edge
  const ring = plazaRing();
  fillPoly(P, M.plaza, ring, 0.018, { tile: 3 });
  ribbon(P, M.slab, ring, 2.2, 0.03, { closed: true, side: -1.5, tile: 1.6 });
  K.plaza = { ring };
  const cu = toUV;
  void cu;
  // ---- rondels: shrub clumps from the OSM forest polygons (6 per rondel) + a centre tree
  const clumps = GREEN.filter((g) => g.kind === 'forest' && RONDEL_IDS.has(g.id));
  const trees = [], rondels = [];
  const groups = [];
  for (const g of clumps) {
    const o = g.polys[0].o, n = o.length / 2; let cx = 0, cz = 0; for (let i = 0; i < o.length; i += 2) { cx += o[i]; cz += o[i + 1]; } cx /= n; cz /= n;
    let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } const R = Math.sqrt(Math.abs(a) / 2 / Math.PI);
    groups.push({ x: cx, z: cz, R });
  }
  // cluster the clumps into the four rondels (by distance to the dossier centres)
  const RC = [[-1186, -1329], [-1078, -1381], [-1106, -1115], [-995, -1161]];
  for (const rc of RC) {
    const mem = groups.filter((q) => Math.hypot(q.x - rc[0], q.z - rc[1]) < 30);
    let mx = 0, mz = 0; for (const q of mem) { mx += q.x; mz += q.z; } if (mem.length) { mx /= mem.length; mz /= mem.length; } else { mx = rc[0]; mz = rc[1]; }
    rondels.push({ x: mx, z: mz, n: mem.length });
    for (const q of mem) {
      trees.push({ x: q.x, z: q.z, fam: 'shrub', s: 2.5 + q.R * 0.12, yaw: rng() * 6.28, y: 0.02 });
      for (let i = 0; i < 3; i++) { const ang = rng() * 6.28, d = q.R * (0.5 + rng() * 0.25); trees.push({ x: q.x + Math.cos(ang) * d, z: q.z + Math.sin(ang) * d, fam: 'shrub', s: 1.9 + rng() * 0.7, yaw: rng() * 6.28, y: 0.02 }); }
    }
    trees.push({ x: mx, z: mz, fam: 'limeA', s: 0.82, yaw: rng() * 6.28, y: 0.02 });
  }
  K.svc.rondels = rondels;
  // ---- spruce pairs at the four memorial diagonals (u, v) = (+-28, +-28), 2 trees each
  for (const [u, v] of [[28, 28], [28, -28], [-29, -27], [-28, 28]]) for (const [du, dv] of [[-1.7, -1.2], [1.8, 1.4]]) { const w = fromUV(u + du, v + dv); trees.push({ x: w.x, z: w.z, fam: rng() < 0.5 ? 'spruceA' : 'spruceB', s: 1.15 + rng() * 0.2, yaw: rng() * 6.28, y: 0.02 }); }
  // ---- clipped limes (kind 'ball') in rows: between the two west promenades (barracks side), along the east promenade and the Millionnaya side
  const rowTrees = [];
  const row = (pts, step, off, phase = 0) => {
    const line = densify(pts, 1); let acc = phase;
    for (let i = 0; i + 1 < line.length; i++) {
      const a = line[i], b = line[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); acc += l;
      if (acc >= step) {
        acc = 0; const dx = (b[0] - a[0]) / l, dz = (b[1] - a[1]) / l;
        let x = a[0] - dz * off, z = a[1] + dx * off;
        if (!inRing(FIELD_RING, x, z)) { x = a[0] + dz * off; z = a[1] - dx * off; }
        if (!inRing(FIELD_RING, x, z) || cover(x, z) > -2.2) continue;
        if (paths.some((p) => !MAIN.has(p.id) && distToLine(p.pts, x, z, p.closed) < p.w / 2 + 0.9 && !PROMS.has(p.id))) continue;
        rowTrees.push({ x, z, fam: 'ball', s: 1.55 + rng() * 0.18, yaw: rng() * 6.28, y: 0.02 });
      }
    }
  };
  const byId = (id) => paths.find((p) => p.id === id);
  const w50 = byId('w776081850'), w55 = byId('w776081855'), e42 = byId('w45393542'), e82 = byId('w1164028382');
  if (w50) row(w50.pts, 4.6, -2.7, 0);                              // barracks row: between the two west promenades (between w776081850 and w776081855)
  if (e82) row(e82.pts, 5.0, -2.8, 2);
  if (e42) row(e42.pts, 5.0, 2.8, 1);
  // the Millionnaya side: a row of limes along the north promenade (the stone path w116254041 runs along the edge)
  row([[-1062, -1470], [-1084, -1481], [-1130, -1459], [-1205, -1424], [-1268, -1393], [-1281, -1380]], 5.2, 4.2, 1);
  void w55;
  trees.push(...rowTrees);
  K.svc.limeRow = rowTrees.length;
  // ---- free lawn trees (limes, maples, willow-like birches) in a belt 12-50 m inside the boundary, away from alleys, rondels and the plaza
  const pathPts = paths.map((p) => ({ ...p, b: bbox(p.pts) }));
  const near = (x, z, r) => pathPts.some((p) => x > p.b[0] - r && x < p.b[1] + r && z > p.b[2] - r && z < p.b[3] + r && distToLine(p.pts, x, z, p.closed) < r + p.w / 2);
  const fam = [['limeA', 0.42], ['limeB', 0.2], ['mapleA', 0.2], ['birchA', 0.1], ['elm', 0.08]];
  const pick = () => { let r = rng(), s = 0; for (const [f, w] of fam) { s += w; if (r < s) return f; } return 'limeA'; };
  const lawn = [];
  for (let z = -1480; z <= -1020; z += 22) for (let x = -1290; x <= -910; x += 22) {
    const px = x + (rng() - 0.5) * 14, pz = z + (rng() - 0.5) * 14;
    if (!inRing(FIELD_RING, px, pz) || rng() > 0.34) continue;
    const d = distToLine(FIELD_RING, px, pz, true);
    if (d < 9 || cover(px, pz) > -3) continue;
    if (near(px, pz, 4.2) || inRing(ring, px, pz) || distToLine(ring, px, pz, true) < 10) continue;
    if (rondels.some((r) => Math.hypot(r.x - px, r.z - pz) < 27) || trees.some((t) => Math.hypot(t.x - px, t.z - pz) < 14 && t.fam !== 'ball')) continue;
    const uv = toUV(px, pz); if (uv.u < -255 || Math.abs(uv.v - -10) < 12 && uv.u < -230) continue;
    lawn.push({ x: px, z: pz, fam: pick(), s: 0.62 + rng() * 0.38, yaw: rng() * 6.28, y: 0.02 });
  }
  trees.push(...lawn); K.svc.lawnTrees = lawn.length;
  K.svc.treeCount = trees.length;
  plantTrees(K, trees, 'lmM-field-trees');

  // ---- lamps: the OSM lamp nodes inside the Field ring (type B lantern inside the plaza belt / on the arms, A globe elsewhere)
  const lampsIn = LAMPS.filter((l) => inRing(FIELD_RING, l.x, l.z) && cover(l.x, l.z) < -1.2);
  const lampA = partsGeos((Q) => lampGeo(Q, M, 'A')), lampB = partsGeos((Q) => lampGeo(Q, M, 'B'));
  const mA = [], mB = [], lampOut = [];
  for (const l of lampsIn) {
    const d = Math.hypot(l.x - C0.x, l.z - C0.z), typeB = d < 98;
    (typeB ? mB : mA).push(mat4(l.x, 0, l.z, rng() * 6.28, 1));
    ph.addCylinder(l.x, l.z, 0.16, 0, 4.6); lampOut.push({ x: l.x, z: l.z, h: 4.5, kind: typeB ? 'lantern' : 'globe' });
  }
  const ia = addInstanced(ctx, K.root, 'lmM-lampsA', lampA, mA), ib = addInstanced(ctx, K.root, 'lmM-lampsB', lampB, mB);
  K.extraTris += ia.tris + ib.tris;
  K.svc.lamps = lampOut;

  // ---- benches: OSM bench nodes in the Field (61): white slat benches turned toward the nearest alley / the plaza
  const benchGeo = partsGeos((Q) => benchParts(Q, M));
  const benches = FURNITURE.filter((f) => f.kind === 'bench' && inRing(FIELD_RING, f.x, f.z) && cover(f.x, f.z) < -1.5);
  const bm = [], bOut = [];
  for (const b of benches) {
    let best = null, bd = 1e9;
    for (const p of pathPts) { if (b.x < p.b[0] - 12 || b.x > p.b[1] + 12 || b.z < p.b[2] - 12 || b.z > p.b[3] + 12) continue; const dd = distToLine(p.pts, b.x, b.z, p.closed); if (dd < bd) { bd = dd; best = p; } }
    // facing: toward the nearest centreline point; inside / beside the plaza: toward the memorial
    let tx = C0.x - b.x, tz = C0.z - b.z;
    if (best && (Math.hypot(tx, tz) > 62 || bd < 4)) { const s = nearestPt(best.pts, b.x, b.z, best.closed); tx = s[0] - b.x; tz = s[1] - b.z; }
    const rotY = Math.atan2(tx, tz);
    bm.push(mat4(b.x, 0, b.z, rotY, 1)); ph.addBox(b.x, b.z, 1.7, 0.6, rotY, 0, 0.9);
    bOut.push({ x: b.x, z: b.z, rotY, len: 1.6 });
  }
  const ib2 = addInstanced(ctx, K.root, 'lmM-benches', benchGeo, bm); K.extraTris += ib2.tris;
  K.svc.benches = bOut;
  // bins: one at roughly every sixth bench (OSM has none inside the Field: dossier 3.4), standing beside the bench
  const binGeo = partsGeos((Q) => { Q.cyl(M.bin, [0, 0, 0], [0, 0.85, 0], 0.27, 0.3, 10, true); Q.cyl(M.benchIron, [0, 0.85, 0], [0, 0.9, 0], 0.31, 0.31, 10, true); });
  const binM = []; bOut.forEach((b, i) => { if (i % 6 !== 2) return; const x = b.x + Math.cos(b.rotY) * 1.3, z = b.z - Math.sin(b.rotY) * 1.3; if (cover(x, z) > -1.5) return; binM.push(mat4(x, 0, z, 0, 1)); ph.addCylinder(x, z, 0.3, 0, 0.9); });
  const ibn = addInstanced(ctx, K.root, 'lmM-bins', binGeo, binM); K.extraTris += ibn.tris; K.svc.bins = binM.length;
  K.svc.paths = paths.map((p) => ({ id: p.id, pts: p.pts, w: p.w, closed: p.closed }));
  K.svc.fieldStats = stats;
  void THREE; void L; void roadHit;
}
export const build = field;

const PROMS = new Set(['w776081855', 'w776081850', 'w45393542', 'w1164028382']);
const bbox = (pts) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return [x0, x1, z0, z1]; };
function nearestPt(pts, x, z, closed) {
  let best = pts[0], bd = 1e9; const n = pts.length, m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; best = [px, pz]; } }
  return best;
}

// ids drawn here (groups.js lists them: keep in sync)
const FOOT_IDS = new Set(['w45393525', 'w45393541', 'w45393542', 'w45393548', 'w116254037', 'w1164028346', 'w1164028391', 'w1164028382', 'w160003832', 'w285989623', 'w776081850', 'w308652195', 'w45393573', 'w197658136',
  'w45393530', 'w45393554', 'w151671754', 'w45393529', 'w45393552', 'w45393572', 'w307505848', 'w45393546', 'w45393547', 'w45393550', 'w45393555', 'w45393537', 'w197658114', 'w197658131', 'w307505847',
  'w307505849', 'w45393527', 'w45393521', 'w45393522', 'w151671750', 'w151671751', 'w197658112', 'w197658132', 'w45393534', 'w45393535', 'w116254031', 'w45393536', 'w45393538', 'w45393545', 'w116254033',
  'w116254039', 'w45393531', 'w45393533', 'w116254043', 'w151671749', 'w197658104', 'w776081855', 'w285989616', 'w1164028381', 'w364436489', 'w151671755', 'w151671748']);
const RONDEL_IDS = new Set(['w307505841', 'w307505842', 'w307505843', 'w307505844', 'w307505845', 'w307505846', 'w307652467', 'w307652468', 'w307652479', 'w307652474', 'w307652476', 'w307652481',
  'w307652466', 'w307652475', 'w307652482', 'w307652472', 'w307652477', 'w307652480', 'w307652469', 'w307652473', 'w307652471', 'w307652478', 'w307652470', 'w307652483']);

// ---------------------------------------------------------------- lamp and bench geometry (frame: base at the origin, y up, front of the bench +z)
function lampGeo(Q, M, type) {
  if (type === 'A') {                                              // green cast-iron post with a white opal globe, 4.5 m
    Q.box(M.lampGreen, -0.2, 0.2, 0, 0.55, -0.2, 0.2, 'b');
    Q.cyl(M.lampGreen, [0, 0.55, 0], [0, 3.9, 0], 0.085, 0.055, 8, false);
    Q.cyl(M.lampGreen, [0, 3.85, 0], [0, 4.0, 0], 0.13, 0.09, 8, true);
    Q.cyl(M.lampGreen, [0, 0.55, 0], [0, 0.75, 0], 0.13, 0.085, 8, false);
    const g = new THREE.SphereGeometry(0.28, 10, 7); Q.geo(M.globe, g, 0, 4.28, 0); g.dispose();
    Q.cyl(M.lampGreen, [0, 4.5, 0], [0, 4.58, 0], 0.07, 0.01, 6, false);
  } else {                                                         // pale-green post with an ornate lantern of orange-red glass
    Q.box(M.lampPale, -0.22, 0.22, 0, 0.6, -0.22, 0.22, 'b');
    Q.cyl(M.lampPale, [0, 0.6, 0], [0, 3.75, 0], 0.09, 0.06, 8, false);
    Q.cyl(M.lampPale, [0, 3.7, 0], [0, 3.82, 0], 0.17, 0.12, 8, true);
    Q.box(M.lantern, -0.2, 0.2, 3.82, 4.42, -0.2, 0.2, 'b');
    Q.box(M.lampPale, -0.24, 0.24, 4.42, 4.52, -0.24, 0.24, 'b');
    Q.cyl(M.lampPale, [0, 4.52, 0], [0, 4.82, 0], 0.22, 0.02, 8, false);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) Q.box(M.lampPale, sx * 0.2 - 0.02, sx * 0.2 + 0.02, 3.82, 4.42, sz * 0.2 - 0.02, sz * 0.2 + 0.02, 'tb');
  }
}
function benchParts(Q, M) {                                         // white wooden slat bench 1.6 m, black cast-iron ends, seat 0.45 m, back 0.9 m (front +z)
  for (const x of [-0.72, 0.72]) {
    Q.box(M.benchIron, x - 0.04, x + 0.04, 0, 0.45, -0.22, 0.2, '');
    Q.box(M.benchIron, x - 0.04, x + 0.04, 0.4, 0.92, -0.28, -0.2, '');
  }
  for (let i = 0; i < 4; i++) Q.box(M.benchWood, -0.8, 0.8, 0.45, 0.49, -0.2 + i * 0.1, -0.12 + i * 0.1, 'b');
  for (let i = 0; i < 3; i++) Q.box(M.benchWood, -0.8, 0.8, 0.55 + i * 0.13, 0.62 + i * 0.13, -0.3, -0.26, 'b');
}
