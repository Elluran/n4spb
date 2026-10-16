// landmarksJ/square.js - St Isaac's Square: the granite apron round the cathedral (OSM r13331163) with the iron fence (w451262296 / w138711609, gates in front of the portico stairs), and the Nicholas I
// monument (Klodt, 1859; node n1123474657 (-2395.6, 35.3)) on its crimson quartzite pedestal with four bronze allegorical women, the equestrian statue balanced on the hind legs, the oval iron fence
// (w105699762, R 10.8 m) and the four green candelabra.  Everything in WORLD coordinates (the monument rides NW, bearing 324 deg, towards the cathedral and the Bronze Horseman).
// Photos refs/admiralty 109 (aerial: fence ring, candelabra), 113 (pedestal, women, emblem, lamps), 114-116.  No flags, no barriers.
import * as THREE from 'three';
import * as L from '../layout.js';
import { AREAS, BARRIERS } from '../data/city.js';
import { Mdl, W } from './frame.js';
import { horse, ellip, eagle } from './sculpt.js';
import { figureMats } from '../lib/figures.js';
import { nicholas, woman } from './statues.js';

const TAU = Math.PI * 2;
export const MON = { x: -2395.7, z: 34.7, R: 10.8 };

const flatRing = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); if (r.length > 1 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.05) r.pop(); return r; };
const signedA = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1]; return a / 2; };

/** iron picket fence along a polyline (world), panel texture + posts every 2.5 m; skip(x, z) -> true removes the panel (a gate); colliders as thin boxes */
function fenceRun(K, pts, h, closed, base, o = {}) {
  const P = K.P, M = K.M, ph = K.ctx.physics, n = pts.length, last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.2) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    if (o.gate && o.gate(mx, mz)) continue;
    const tile = 2.5, nt = len / tile;
    P.quad(M.pickets, [a[0], base, a[1]], [b[0], base, b[1]], [b[0], base + h, b[1]], [a[0], base + h, a[1]], [dz / len, 0, -dx / len], [[0, 0], [nt, 0], [nt, 1], [0, 1]]);
    const k = Math.max(1, Math.round(len / tile));
    for (let j = 0; j <= k; j++) { const t = j / k, x = a[0] + dx * t, z = a[1] + dz * t; P.cyl(M.iron, [x, base, z], [x, base + h + 0.12, z], 0.05, 0.05, 5, false); P.cyl(M.iron, [x, base + h + 0.12, z], [x, base + h + 0.22, z], 0.07, 0.0, 5, false); }
    if (o.collide !== false) ph.addBox(mx, mz, len, 0.3, Math.atan2(-dz, dx), -1, 2.2);
  }
}

export function build(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, svc = K.svc;

  // ------------------------------------------------------------------------------------------------ the granite apron round the cathedral
  const ap = AREAS.find((a) => a.id === 'r13331163');
  if (ap) {
    const ring = flatRing(ap.polys[0].o), ccw = signedA(ring) > 0;
    P.cap(M.slab, ring, 0.1, true, 2.8);
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j], b = ring[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < 0.05) continue;
      let nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l; if (!ccw) { nx = -nx; nz = -nz; }
      P.quad(M.slabRim, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], 0.1, b[1]], [a[0], 0.1, a[1]], [nx, 0, nz]);
    }
  }
  // ---- the iron fence round the stylobate: gates (8 m) in front of the N, S and W portico stairs
  const gate = (x, z) => { const m = Mdl(x, z); return (Math.abs(m.mx) < 5.5 && Math.abs(m.mz) > 40) || (Math.abs(m.mz) < 5.5 && m.mx < -40); };
  for (const id of ['w451262296', 'w138711609']) {
    const b = BARRIERS.find((q) => q.id === id); if (!b) continue;
    const pts = flatRing(b.pts); fenceRun(K, pts, 1.15, false, 0.14, { gate });
  }

  // ------------------------------------------------------------------------------------------------ Nicholas I monument
  monument(K);
  void W; void THREE;
}

// ------------------------------------------------------------------------------------------------ the monument
function monument(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, svc = K.svc;
  const { x: cx, z: cz, R } = MON;
  const face = L.rotYBearing(324);                                      // the front (emblem, horse's head) looks NW
  // round platform inside the fence (granite slabs), kerb ring, three steps of the base
  const ring = (r, n = 40, y = 0) => Array.from({ length: n }, (_, i) => [cx + r * Math.sin(i * TAU / n), cz + r * Math.cos(i * TAU / n)]);
  P.cap(M.slab, ring(R - 0.2), 0.12, true, 2.8);
  P.cyl(M.slabRim, [cx, 0, cz], [cx, 0.12, cz], R - 0.2, R - 0.2, 40, false);
  // the oval fence (R 10.8) on a low granite kerb: 36 panels, collider ring
  const fr = ring(R, 36);
  fenceRun(K, fr, 1.3, true, 0.16, { collide: true });
  P.cyl(M.slabRim, [cx, 0.0, cz], [cx, 0.16, cz], R + 0.25, R + 0.25, 36, false);
  P.cyl(M.slabRim, [cx, 0.16, cz], [cx, 0.17, cz], R + 0.25, R, 36, true);
  // four candelabra at 45 deg
  for (const a of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) candelabrum(K, cx + Math.sin(a) * (R - 1.3), cz + Math.cos(a) * (R - 1.3));
  // ---- pedestal (local frame: +z = front)
  P.push(cx, 0.12, cz, face);
  const rr = (hw, hd, y0, y1, mat, n = 20) => {                         // a stadium-shaped (rounded rect) prism: two half discs + a box
    P.box(mat, -hw + hd, hw - hd, y0, y1, -hd, hd, '');
    for (const sg of [-1, 1]) P.cyl(mat, [sg * (hw - hd), y0, 0], [sg * (hw - hd), y1, 0], hd, hd, n, false);
  };
  const stepsH = [[6.4, 5.0], [5.8, 4.4], [5.2, 3.8]];
  stepsH.forEach(([hw, hd], i) => { rr(hw, hd, i * 0.34, (i + 1) * 0.34, M.stylobate); });
  const y1 = 1.02;
  // lower tier (wide, with the four bas-reliefs on the sides): crimson quartzite with a marble plinth
  rr(5.0, 3.5, y1, y1 + 0.5, M.marblePlain);
  rr(4.7, 3.2, y1 + 0.5, y1 + 3.6, M.crimson);
  rr(5.0, 3.5, y1 + 3.6, y1 + 4.0, M.marblePlain);
  const yT = y1 + 4.0;                                                  // 5.0: the women sit on this ledge
  // bas-relief panels (dark bronze with figures) on the long faces and the ends
  for (const sg of [-1, 1]) { const x = sg * 4.72 + sg * 0.02; P.quad(M.relief, [x, y1 + 0.9, -1.8 * sg], [x, y1 + 0.9, 1.8 * sg], [x, y1 + 2.9, 1.8 * sg], [x, y1 + 2.9, -1.8 * sg], [sg, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  for (const sg of [-1, 1]) { const z = sg * 3.22 + sg * 0.02; P.quad(M.relief, [-2.6 * sg, y1 + 0.9, z], [2.6 * sg, y1 + 0.9, z], [2.6 * sg, y1 + 2.9, z], [-2.6 * sg, y1 + 2.9, z], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  // upper tier: narrower crimson column with a bronze cartouche (the emblem in a cartouche, plain: no flag) on the NW face
  rr(3.1, 2.2, yT, yT + 3.5, M.crimsonDark);
  P.box(M.marblePlain, -3.3, 3.3, yT + 3.5, yT + 3.9, -2.4, 2.4, 'b');
  P.box(M.bronzeDark, -2.0, 2.0, yT + 0.6, yT + 3.2, 2.2, 2.32, 'kb');                          // cartouche panel
  eagle(K, M.gold, 0, yT + 1.2, 2.34, 0, 1.9);                                                  // the gilded double-headed eagle (state emblem, no flag)
  P.box(M.gold, -1.3, 1.3, yT + 0.8, yT + 1.1, 2.33, 2.38, 'kb');                              // inscription line
  P.box(M.gold, -1.0, 1.0, yT + 0.5, yT + 0.68, 2.33, 2.38, 'kb');
  // four seated bronze women at the corners of the ledge
  [[1, 1, 0], [-1, 1, 1], [1, -1, 2], [-1, -1, 3]].forEach(([sx, sz, k]) => seated(P, M, K, k, sx * 4.0, yT, sz * 2.6, Math.atan2(sx, sz) * 0.5 + (sz > 0 ? 0 : Math.PI)));
  // top of the pedestal: bronze cornice + the statue
  const yS = yT + 3.9;
  rr(3.4, 2.5, yS, yS + 0.5, M.bronzeDark);
  const ys = yS + 0.5;
  P.cyl(M.bronze, [0, yS - 0.05, 0], [0, yS + 0.55, 0], 0.0001, 0.0001, 3, false);
  statue(K, 0, ys, 0.2, 1.95);
  P.pop();
  // collider: the whole pedestal block (solid up to the statue)
  ph.addCylinder(cx, cz, 5.6, -1, 25);
  svc.monuments.push({ id: 'n1123474657', name: 'Памятник императору Николаю I', x: cx, z: cz, h: 16 });
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.3; svc.crowd.push({ x: cx + Math.sin(a) * (R + 3.2), z: cz + Math.cos(a) * (R + 3.2) }); }      // tourists, costumed performers round the monument
  svc.photoSpots.push({ x: -2352, z: 96, yaw: L.yawToward(-2352, 96, -2480, -150), pitch: 6, name: 'Исаакиевская площадь с Синего моста' });
  svc.photoSpots.push({ x: cx + 22, z: cz - 14, yaw: L.yawToward(cx + 22, cz - 14, cx, cz), pitch: 18, name: 'Памятник Николаю I' });
}

/** a seated bronze allegorical woman (2.6 m, shared figure kit, statues.js: 0 Faith, 1 Wisdom, 2 Justice, 3 Strength) on a block, facing outwards along rot */
function seated(P, M, K, k, x, y, z, rot) {
  P.push(x, y, z, rot);
  P.box(M.bronzeDark, -0.62, 0.62, 0, 0.72, -0.8, 0.3, 'b');                                  // seat block
  woman(k).place(P, figureMats(K.ctx).keys('bronze', 'bronze'), 0, 0, 0, 0, 1.7);
  P.pop();
}

/** the equestrian statue (Klodt): the stallion on the two hind legs only, the Emperor in the saddle (shared figure kit, statues.js); s scales the 3.1 m group to ~6 m */
function statue(K, x, y, z, s) {
  nicholas().place(K.P, figureMats(K.ctx).keys('bronze', 'bronze'), x, y, z, 0, s);
  void horse; void ellip;
}

/** green cast-iron candelabrum, 6 m, five globes */
function candelabrum(K, x, z) {
  const P = K.P, M = K.M;
  P.box(M.ironGreen, x - 0.5, x + 0.5, 0.17, 1.0, z - 0.5, z + 0.5, 'b');
  P.box(M.ironGreen, x - 0.62, x + 0.62, 0.17, 0.4, z - 0.62, z + 0.62, 'b');
  P.cyl(M.ironGreen, [x, 1.0, z], [x, 4.5, z], 0.17, 0.11, 8, false);
  P.cyl(M.ironGreen, [x, 4.5, z], [x, 4.7, z], 0.3, 0.2, 8, true);
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + Math.PI / 4, ax = Math.sin(a), az = Math.cos(a);
    P.cyl(M.ironGreen, [x, 4.6, z], [x + ax * 0.75, 5.2, z + az * 0.75], 0.05, 0.04, 5, false);
    P.cyl(M.ironGreen, [x + ax * 0.75, 5.2, z + az * 0.75], [x + ax * 0.75, 5.35, z + az * 0.75], 0.12, 0.12, 6, true);
    P.geo(M.lampGlass, new THREE.SphereGeometry(0.24, 8, 6), x + ax * 0.75, 5.62, z + az * 0.75);
  }
  P.cyl(M.ironGreen, [x, 4.7, z], [x, 5.7, z], 0.06, 0.04, 5, false);
  P.geo(M.lampGlass, new THREE.SphereGeometry(0.27, 8, 6), x, 6.0, z);
  K.ctx.physics.addCylinder(x, z, 0.5, -1, 6);
}
