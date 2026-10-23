// landmarksOktyabrsky/plaza.js - the forecourt of the hall on Greek Square (docs/research/oktyabrsky.md sections 5.6, 10; oktyabrsky-square.md section 5.2; photos refs/oktyabrsky 01 03 06 09 10, sq_16 sq_17):
//   * the PROMENADE: pavers in running bond with red-brown bands 0.9 m wide every 6 m (bands parallel to the hall front), between the foot of the stair (v -4.4) and the parking lot (v -17.9), widened
//     to the kerb at the SSW corner; clipped at the real asphalt (`net.cover`, road integrity) and with a granite kerb course against the lot;
//   * four tall black twin-globe lamps in front of the stair (v -7, u 1.5 / 10.8 / 46.7 / 63.0), granite stump bollards with black chains along the Ligovsky kerb (the east edge of the lot), two citylight
//     poster stands, drain gullies.  Every post / lamp / bollard is tested against `net.cover` at its FINAL position (nothing on a carriageway).
// Greek Square itself (the parking lot, its bays and aisles, the Ligovsky carriageway) stays with streets / environment.
import * as THREE from 'three';
import * as L from '../layout.js';
import { ROADS, PARKING, GREEN } from '../data/city.js';
import { HALL, W, M as toHall, HT, STAIR } from './frame.js';
import { fillPolyClipped, coverFn, pairs, distToLine, inRing } from './surfaces.js';
import { partsGeos, addInstanced, mat4 } from './inst.js';
import { knockInstances } from '../lib/knock-inst.js';

const TAU = Math.PI * 2;

/** the instanced furniture of the plaza (lamps, bollards, poster stands): KNOCKABLE with ctx.knock (core/knock.js, lib/knock-inst.js: one Dynamic InstancedMesh per material, the same index in
 *  every material, one record per placement owning its collider, a finite LOD range, no batching); without ctx.knock (the headless tools) exactly the addInstanced meshes of before. Returns the triangles. */
function furniture(K, name, geos, spots, items, rec, far) {
  const ctx = K.ctx;
  if (!ctx.knock) return addInstanced(ctx, K.root, name, geos, spots.map((s) => mat4(s.x, s.y, s.z, s.rotY, 1))).tris;
  knockInstances(ctx, { name, parts: geos.list.map(({ geo, mat }) => ({ geo, mat })), spots, items, rec, far });
  return geos.list.reduce((n, { geo }) => n + (geo.index ? geo.index.count : geo.attributes.position.count) / 3 * spots.length, 0);
}

/** a twin-globe cast-iron lamp, 8.8 m (front = +z, arms along local x): ribbed bulbous base, tapering fluted shaft, two scrolled arms with opal globes under black caps */
export function lampTwinParts(Q, M) {
  const prof = [[0.3, 0], [0.3, 0.12], [0.22, 0.2], [0.27, 0.45], [0.31, 0.72], [0.23, 1.0], [0.18, 1.3]];
  for (let i = 0; i + 1 < prof.length; i++) Q.cyl(M.lamp, [0, prof[i][1], 0], [0, prof[i + 1][1], 0], prof[i][0], prof[i + 1][0], 20, i === 0);
  Q.cyl(M.lamp, [0, 1.3, 0], [0, 7.6, 0], 0.14, 0.075, 16, false);
  Q.cyl(M.lamp, [0, 1.3, 0], [0, 1.45, 0], 0.2, 0.2, 20, true);
  Q.cyl(M.lamp, [0, 7.5, 0], [0, 7.62, 0], 0.15, 0.15, 16, true);
  for (const s of [-1, 1]) {
    // S-shaped arm: out and up, ending in a small cup under the globe
    const pts = [[0, 7.5], [0.22, 7.52], [0.46, 7.68], [0.72, 7.62], [0.94, 7.72]];
    for (let i = 0; i + 1 < pts.length; i++) Q.cyl(M.lamp, [s * pts[i][0], pts[i][1], 0], [s * pts[i + 1][0], pts[i + 1][1], 0], 0.04 - i * 0.004, 0.036 - i * 0.004, 6, false);
    Q.cyl(M.lamp, [s * 0.94, 7.7, 0], [s * 0.94, 7.86, 0], 0.07, 0.15, 8, true);
    const g = new THREE.SphereGeometry(0.225, 12, 8); Q.geo(M.globe, g, s * 0.94, 8.08, 0); g.dispose();
    Q.cyl(M.lamp, [s * 0.94, 8.27, 0], [s * 0.94, 8.43, 0], 0.2, 0.05, 10, true);
    Q.cyl(M.lamp, [s * 0.94, 8.43, 0], [s * 0.94, 8.55, 0], 0.035, 0.02, 6, true);
  }
}
/** a granite stump bollard 0.45 x 0.45 x 0.75 m with a chamfered top (front = +z) */
function bollardParts(Q, M) {
  Q.box(M.bollard, -0.225, 0.225, 0, 0.6, -0.225, 0.225, 'b', 1);
  Q.box(M.bollard, -0.19, 0.19, 0.6, 0.72, -0.19, 0.19, 'b', 1);
  Q.box(M.bollard, -0.13, 0.13, 0.72, 0.76, -0.13, 0.13, 'b', 1);
  Q.cyl(M.iron, [0.0, 0.5, -0.24], [0.0, 0.5, -0.27], 0.03, 0.03, 6, true);
}
/** a citylight poster stand 1.2 x 1.9 x 0.15 m (front = +z) */
function standParts(Q, M) {
  Q.box(M.iron, -0.62, 0.62, 0.12, 2.02, -0.09, 0.09, 'f', 1);
  Q.quad(M.stand, [-0.6, 0.15, 0.092], [0.6, 0.15, 0.092], [0.6, 2.0, 0.092], [-0.6, 2.0, 0.092], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  Q.quad(M.stand, [0.6, 0.15, -0.092], [-0.6, 0.15, -0.092], [-0.6, 2.0, -0.092], [0.6, 2.0, -0.092], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  Q.box(M.iron, -0.5, -0.4, 0, 0.12, -0.07, 0.07, '', 1); Q.box(M.iron, 0.4, 0.5, 0, 0.12, -0.07, 0.07, '', 1);
}

export function build(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics, cover = coverFn(ctx);
  const ok = (x, z, m = 0.6) => cover(x, z) < -m && !L.insideBuilding(x, z, 0.3);
  const lot = (PARKING.find((a) => a.id === 'w98377443') || { polys: [] }).polys;
  const lotRings = lot.map((p) => pairs(p.o));
  const inLot = (x, z) => lotRings.some((r) => inRing(r, x, z));

  // ---------------------------------------------------------------------------------------- the promenade paving (hall frame: u along the front, v toward the building)
  P.push(HALL.x, 0, HALL.z, HALL.rot);
  // one polygon: the promenade along the stair (v -4.4 .. -17.9, u up to 108), widened to the kerb at the SSW corner (groups.js PAVED_RINGS is the same ring in world metres); where the area
  // claims the Kapodistrias monument (K.claimed, the North) the ring goes on to the apron round the monument at its NNE end (u 108 .. 133, v -31 .. -4.4; the source's ring, groups.js KAPODISTRIAS_PAVED_RINGS);
  // triangles on asphalt, in the lot, inside a building or on the lawn of the Nekrasov Garden are dropped
  const ring = K.claimed && K.claimed.has('kapodistrias')
    ? [[-14, STAIR.v0], [133.4, STAIR.v0], [133.4, -31], [108.4, -31], [108.4, -17.9], [13.5, -17.9], [12.8, -25], [-14, -25]]
    : [[-14, STAIR.v0], [108.4, STAIR.v0], [108.4, -17.9], [13.5, -17.9], [12.8, -25], [-14, -25]];
  const park = GREEN.filter((g) => g.id === 'r1806731').flatMap((g) => g.polys.map((p) => pairs(p.o)));
  const inPark = (x, z) => park.some((r) => inRing(r, x, z));
  const tris = fillPolyClipped(P, M.paving, ring, 0.06, (x, z) => (inLot(x, z) || inPark(x, z) || L.insideBuilding(x, z, 0.4) ? 1 : cover(x, z)), { margin: 0.25, maxEdge: 3.5, tile: 6 });
  // granite kerb course between the promenade and the lot (the lot's NE edge, v -17.9, from u 13.6 to 108)
  { const a = [13.6, -17.9], b = [108, -17.8], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    P.push(a[0], 0, a[1], Math.atan2(-(b[1] - a[1]), b[0] - a[0]));
    P.box(M.kerb, 0, len, 0, 0.15, -0.2, 0.05, 'b', 2);
    P.pop(); }
  P.pop();
  K.svc.pavingTris = tris;

  // ---------------------------------------------------------------------------------------- lamps (4 twin lamps in front of the stair)
  const lampGeo = partsGeos((Q) => lampTwinParts(Q, M));
  const lm = [], lmItems = [];
  for (const u of [1.5, 10.8, 46.7, 63.0]) {
    const p = W(u, -7.0);
    if (!ok(p.x, p.z, 1.0)) continue;
    lm.push({ x: p.x, y: 0, z: p.z, rotY: HALL.rot + Math.PI }); lmItems.push(ph.addCylinder(p.x, p.z, 0.3, 0, 9)); K.svc.lamps.push({ x: p.x, z: p.z, h: 8.8 });
  }
  // cast iron, anchored: holds a scrape, breaks off at the foot above 23 km/h (plan: package I; 103: streets/lamps.js)
  K.extraTris += furniture(K, 'lmOkt-lamps', lampGeo, lm, lmItems, { kind: 'lamp', mass: 450, h: 8.8, r: 0.3, anchored: 23, hitK: 0.65, metal: true }, 300);

  // ---------------------------------------------------------------------------------------- bollards with chains along the Ligovsky kerb (the lot side)
  const roads = ROADS.filter((r) => r.id === 'w185184926' || r.id === 'w251949580');
  const line = [];                                                                       // the hall-side pavement line, 1.35 m off the asphalt edge
  for (const r of roads) {
    const pts = pairs(r.pts);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
      const hu = (r.w || 7.2) / 2 + 1.35;
      // the side of the road toward the hall (the point of the offset that is nearer to the hall front)
      const n1 = [-dz / len, dx / len], n2 = [dz / len, -dx / len], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const c1 = toHall(mid[0] + n1[0] * hu, mid[1] + n1[1] * hu), c2 = toHall(mid[0] + n2[0] * hu, mid[1] + n2[1] * hu);
      const n = c1.v > c2.v ? n1 : n2;
      const steps = Math.max(1, Math.round(len / 5.5));
      for (let k = 0; k < steps; k++) { const t = (k + 0.5) / steps; line.push({ x: a[0] + dx * t + n[0] * hu, z: a[1] + dz * t + n[1] * hu, dx: dx / len, dz: dz / len }); }
    }
  }
  const sel = line.map((p) => ({ p, h: toHall(p.x, p.z) })).filter(({ h }) => h.u > -14 && h.u < 108 && h.v < -17 && h.v > -75).sort((a, b) => a.h.u - b.h.u);
  const bGeo = partsGeos((Q) => bollardParts(Q, M)), bm = [], bmItems = [], bp = [];
  let lastU = -1e9;
  for (const { p, h } of sel) {
    if (h.u - lastU < 5.0) continue;
    // not at the lot entrances / aisles: the stump and the chain ends must all stand clear of asphalt
    if (![-2.6, 0, 2.6].every((s) => ok(p.x + p.dx * s, p.z + p.dz * s, 0.6))) continue;
    lastU = h.u; bp.push(p);
    bm.push({ x: p.x, y: 0, z: p.z, rotY: Math.atan2(p.dz, -p.dx) + Math.PI / 2 }); bmItems.push(ph.addCylinder(p.x, p.z, 0.26, 0, 0.8));
  }
  // granite stump: heavy, holds below 30 km/h; the drawn chains stay (like 103's wires)
  K.extraTris += furniture(K, 'lmOkt-bollards', bGeo, bm, bmItems, { kind: 'bollard', mass: 250, h: 0.8, r: 0.26, anchored: 30, hitK: 0.5 }, 240);
  // black chains between neighbours (a 0.25 m sag)
  const chainSegs = [];
  for (let i = 0; i + 1 < bp.length; i++) {
    const a = bp[i], b = bp[i + 1], d = Math.hypot(b.x - a.x, b.z - a.z);
    if (d > 7.0) continue;
    let prev = null;
    for (let k = 0; k <= 6; k++) { const t = k / 6, y = 0.55 - 0.25 * 4 * t * (1 - t), q = [a.x + (b.x - a.x) * t, y, a.z + (b.z - a.z) * t]; if (prev) chainSegs.push([prev, q]); prev = q; }
  }
  for (const [a, b] of chainSegs) P.cyl(M.iron, a, b, 0.016, 0.016, 4, false);
  K.svc.bollards = bp.length;

  // ---------------------------------------------------------------------------------------- citylight poster stands
  const sGeo = partsGeos((Q) => standParts(Q, M)), sm = [], smItems = [];
  for (const [u, v] of [[2.5, -8.2], [72.0, -8.5]]) {
    const p = W(u, v); if (!ok(p.x, p.z, 0.8)) continue;
    sm.push({ x: p.x, y: 0, z: p.z, rotY: HALL.rot + Math.PI }); smItems.push(ph.addBox(p.x, p.z, 1.3, 0.3, HALL.rot, 0, 2.1));
  }
  K.extraTris += furniture(K, 'lmOkt-stands', sGeo, sm, smItems, { kind: 'citylight', mass: 90, h: 2.1, w: 1.3, d: 0.3, anchored: 15, hitK: 0.3, metal: true }, 220);

  // ---------------------------------------------------------------------------------------- people: photo spots, the audience on the stair
  const front = (u) => W(u, 0);
  const spot = (u, v, tu, tv, name, pitch = 8) => { const a = W(u, v), t = W(tu, tv); if (ok(a.x, a.z, 0.3)) K.svc.photoSpots.push({ x: a.x, z: a.z, yaw: L.yawToward(a.x, a.z, t.x, t.z), pitch, name }); };
  spot(33.7, -12, 33.7, 3, 'БКЗ «Октябрьский»: фасад и лестница', 10);
  spot(62, -12, 30, 0, 'БКЗ «Октябрьский»: вид вдоль фасада', 8);
  spot(1, -10, 33, 2, 'БКЗ «Октябрьский»: от юго-западного угла', 8);
  for (const [id, u, v, r, n] of [['hall-stair', 33, -2.2, 14, 14], ['hall-forecourt', 33, -11, 12, 8], ['hall-stair-nne', 62, -3, 6, 6]]) { const p = W(u, v); K.svc.crowd.push({ id, kind: 'photo', x: p.x, z: p.z, r, n }); }
  K.svc.entrances.length = 0;
  void front; void distToLine; void TAU; void HT;
}
