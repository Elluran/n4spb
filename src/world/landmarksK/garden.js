// landmarksK/garden.js - the Rossi pavilion in the Mikhailovsky Garden (K. Rossi 1825, on the Moika, OSM w30353982 + 60 parts), the busts of Bryullov / Ivanov / Rossi, the old oak of the Maslyany lug and the Rossi
// cast-iron bridge over the pond channel.  The lawns, trees, paths and ponds of the garden are the environment's (generic but fine).
// Pavilion (dossier 8.2, photos refs/saviour 081 082 083 084 085): single storey, 24.5 x 11 m, nine bays: an open loggia of four Doric columns in the middle, two links with niches, two end pavilions each with two
// fluted Doric columns and a tall arched window under a low pediment; stylobate 1.2 m, walls pale cream-yellow, white order, Greek-key frieze, attic with roundels, low hip roof of green copper; faces NNE onto the Moika.
// Frame Q: origin (-971, -940), rot -0.188 (bearing 10.8 deg), +x along the long axis, -z toward the Moika.
import * as THREE from 'three';
import * as G from './geo.js';
import { plantTrees } from './trees.js';
import { bust, cached, figureMats } from '../lib/figures.js';
import { knockBays } from '../lib/fence-bays.js';

const Q0 = { x: -971, z: -940 }, QR = -0.188;
const cs = Math.cos(QR), sn = Math.sin(QR);
const QW = (mx, mz) => ({ x: Q0.x + mx * cs + mz * sn, z: Q0.z - mx * sn + mz * cs });

function doric(K, x, z, y0, y1, r = 0.36) {
  const P = K.P, M = K.M;
  P.cyl(M.white, [x, y0, z], [x, y1 - 0.25, z], r, r * 0.86, 14, false);
  P.cyl(M.whiteShade, [x, y1 - 0.35, z], [x, y1 - 0.2, z], r * 0.95, r * 1.1, 14, false);
  P.box(M.white, x - r * 1.3, x + r * 1.3, y1 - 0.2, y1, z - r * 1.3, z + r * 1.3, 'b');
}

function pavilion(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, T = K.ctx.mat.toon;
  const wall = T('#f0e0a8', { name: 'lmK-pavWall', paint: 0.04 }), roof = T('#6aa088', { name: 'lmK-pavRoof', paint: 0.04 });
  const y0 = 1.2, yc = 6.0, ye = 6.6, yt = 7.6;
  P.push(Q0.x, 0, Q0.z, QR);
  // stylobate with steps in front
  G.tbox(P, M.granite, -12.7, 12.7, 0, y0, -6.2, 5.6, 3, 3, 'b');
  // wall of the main body (rear wall + side returns)
  G.tbox(P, wall, -12.25, 12.25, y0, yc, -0.2, 5.0, 3, 3, 'bt');
  // end pavilions (projecting 0.6 m) and links: front wall planes at z = -0.2 (links) / -0.8 (pavilions)
  for (const s of [-1, 1]) {
    const xa = s * 7.25, xb = s * 12.25, x0 = Math.min(xa, xb), x1 = Math.max(xa, xb);
    G.tbox(P, wall, x0, x1, y0, yc, -1.3, -0.2, 3, 3, 'bt');
    // tall arched window with a white balustrade under it, two fluted Doric columns at the front corners
    P.push(s * 9.75, 0, -1.3, Math.PI);                                                                   // facing the Moika (-z): a local +z plane would be buried in the wall
    G.planeShape(P, M.glassBlue, G.archPts(0, y0 + 1.0, 1.5, 3.2, 10), 0.06);
    G.frameRing(P, M.white, G.archPts(0, y0 + 0.9, 2.0, 3.5, 10), G.archPts(0, y0 + 1.0, 1.5, 3.2, 10), 0.02, 0.2, 1);
    P.box(M.white, -0.9, 0.9, y0, y0 + 0.9, 0.0, 0.25, 'b');
    P.pop();
    for (const cx of [x0 + 0.5, x1 - 0.5]) doric(K, cx, -1.5, y0, yc, 0.36);
    // pediment over the end pavilion
    P.push(s * 9.75, yc + 0.5, -1.4, 0);
    G.solid(P, M.white, [[-2.9, 0], [2.9, 0], [0, 0.95]], 0.0, 0.45, 1);
    G.planeShape(P, wall, [[-2.5, 0.08], [2.5, 0.08], [0, 0.82]], 0.47);
    P.pop();
  }
  // the central loggia: four columns, a rear wall with three arches, niches in the links
  for (const x of [-4.2, -1.4, 1.4, 4.2]) doric(K, x, -1.5, y0, yc, 0.38);
  P.push(0, 0, -0.2, Math.PI);
  for (const x of [-2.8, 0, 2.8]) { G.planeShape(P, M.glassBlue, G.archPts(x, y0, 1.7, 4.0, 10), 0.05); G.frameRing(P, M.white, G.archPts(x, y0 - 0.05, 2.2, 4.3, 10), G.archPts(x, y0, 1.7, 4.0, 10), 0.0, 0.14, 1); }
  for (const x of [-6.0, 6.0]) { G.planeShape(P, M.whiteShade, G.archPts(x, y0 + 0.8, 1.4, 3.0, 10), 0.05); }
  P.pop();
  // entablature with a Greek-key frieze, attic with roundels
  G.tbox(P, M.white, -12.6, 12.6, yc, yc + 0.28, -2.0, 5.2, 3, 3, 'b');
  G.tbox(P, M.meander, -12.5, 12.5, yc + 0.28, ye - 0.2, -1.95, 5.1, 0.8, 0.4, 'bt');
  G.tbox(P, M.white, -12.8, 12.8, ye - 0.2, ye, -2.25, 5.4, 3, 3, 'b');
  G.tbox(P, wall, -12.0, 12.0, ye, yt, -1.2, 4.6, 3, 3, 'b');
  for (const x of [-8, 0, 8]) { P.cyl(M.white, [x, ye + 0.5, -1.22], [x, ye + 0.5, -1.15], 0.38, 0.38, 14, true); P.cyl(M.whiteShade, [x, ye + 0.5, -1.15], [x, ye + 0.5, -1.1], 0.24, 0.24, 14, true); }
  P.box(M.white, -12.1, 12.1, yt, yt + 0.18, -1.3, 4.7, 'b');
  // hip roof of green copper
  const yR = yt + 1.5;
  P.fan(roof, [[-12.2, yt + 0.18, -1.3], [12.2, yt + 0.18, -1.3], [7.0, yR, 1.0], [-7.0, yR, 1.0]], [0, 0.6, -1]);
  P.fan(roof, [[12.2, yt + 0.18, 4.7], [-12.2, yt + 0.18, 4.7], [-7.0, yR, 2.0], [7.0, yR, 2.0]], [0, 0.6, 1]);
  P.fan(roof, [[-12.2, yt + 0.18, 4.7], [-12.2, yt + 0.18, -1.3], [-7.0, yR, 1.0], [-7.0, yR, 2.0]], [-0.6, 0.6, 0]);
  P.fan(roof, [[12.2, yt + 0.18, -1.3], [12.2, yt + 0.18, 4.7], [7.0, yR, 2.0], [7.0, yR, 1.0]], [0.6, 0.6, 0]);
  P.fan(roof, [[-7, yR, 1.0], [7, yR, 1.0], [7, yR, 2.0], [-7, yR, 2.0]], [0, 1, 0]);
  // the rear apse: a half cylinder with a half dome (the rotunda niche)
  G.tube(P, wall, 0, 4.9, y0, ye, 3.2, 3.2, 14, 2, 1);
  G.tube(P, roof, 0, 4.9, ye, ye + 1.4, 3.3, 0.6, 14, 2, 1, { capTop: roof });
  P.pop();
  // colliders: the body as a box, the columns, the stylobate steps
  const rot = QR;
  const box = (mx, mz, w, d, y1) => { const p = QW(mx, mz); ph.addBox(p.x, p.z, w, d, rot, 0, y1); };
  box(0, 2.4, 24.6, 5.4, 8.5);
  box(-9.75, -0.75, 5.5, 1.5, 7.0); box(9.75, -0.75, 5.5, 1.5, 7.0);
  for (const x of [-4.2, -1.4, 1.4, 4.2]) { const p = QW(x, -1.5); ph.addCylinder(p.x, p.z, 0.45, 0, 7); }
  { const p = QW(0, 0.2 - 3.0); void p; }
  // walkable stylobate (1.2 m) with three steps at the front centre
  for (let i = 0; i < 6; i++) { const p = QW(0, -6.2 - 0.35 * (i + 0.5)); ph.addWalkBox(p.x, p.z, 7.0, 0.35, rot, 0.2 * (6 - i), -1); }
  { const p = QW(0, -3.1); ph.addWalkBox(p.x, p.z, 25.4, 6.2, rot, y0, -1); }
  const c = QW(0, -9);
  K.svc.pavilion = { x: Q0.x, z: Q0.z, rotY: QR, front: { x: c.x, z: c.z } };
  K.svc.monuments.push({ id: 'w30353982', name: 'Павильон Росси', x: Q0.x, z: Q0.z, h: 9 });
  K.svc.photoSpots.push({ x: QW(0, -22).x, z: QW(0, -22).z, yaw: 170, pitch: 6, name: 'Павильон Росси на Мойке' });
}

function busts(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, T = K.ctx.mat.toon;
  const column = T('#5a5e6a', { name: 'lmK-bustCol', paint: 0.03 });
  const mk = figureMats(K.ctx).keys('bronze', 'bronze');
  const list = [{ x: -967.5, z: -924.1, face: { hair: 'short', age: 0.5, beard: 'sideburns', seed: 21 }, style: 'civil', rot: 0.5, name: 'К. П. Брюллов' },
    { x: -980.5, z: -926.2, face: { hair: 'short', age: 0.5, beard: 'full', seed: 22 }, style: 'civil', rot: 0.2, name: 'А. А. Иванов' },
    { x: -971.7, z: -937.2, face: { hair: 'short', age: 0.6, seed: 23 }, style: 'civil', rot: 0.6, name: 'К. И. Росси' }];
  for (const b of list) {
    const inside = b.x === -971.7;
    const y = inside ? 1.2 : 0;                                                                   // Rossi's bust stands in the pavilion (on the stylobate)
    G.tbox(P, M.granite, b.x - 0.6, b.x + 0.6, y, y + 0.25, b.z - 0.6, b.z + 0.6, 2, 2, 'b');
    G.tbox(P, M.slab, b.x - 0.45, b.x + 0.45, y + 0.25, y + 0.5, b.z - 0.45, b.z + 0.45, 2, 2, 'b');
    P.cyl(column, [b.x, y + 0.5, b.z], [b.x, y + 1.95, b.z], 0.23, 0.23, 14, true);
    cached('lmK-bust-' + b.name, () => bust({ detail: 0.6, style: b.style, turn: 0.2, face: b.face })).place(P, mk, b.x, y + 1.95, b.z, b.rot, 1.2);
    if (!inside) ph.addCylinder(b.x, b.z, 0.65, 0, 2.8);
    K.svc.monuments.push({ id: 'bust-' + b.name, name: b.name, x: b.x, z: b.z, h: 2.8 });
  }
}

function oak(K) {
  plantTrees(K, [{ x: -1053, z: -886, fam: 'oak', s: 1.9, yaw: 1.1, y: 0.0 }], 'lmK-oak');
}

/** the Rossi cast-iron bridge over the channel between the two ponds: OSM w127667599, from (-874, -708) to (-875, -725); a low arch of 5 deck segments, gravel deck, iron railings */
function rossiBridge(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics;
  const a = [-874, -708], b = [-875, -725], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx), w = 3.6;
  const hs = [0.1, 0.38, 0.55, 0.38, 0.1], n = hs.length, seg = L / n;
  const deck = K.ctx.mat.toon('#4a403c', { name: 'lmK-bridgeDeck', paint: 0.04 }), iron = M.iron;
  P.push(a[0], 0, a[1], rot);
  for (let i = 0; i < n; i++) {
    const x0 = i * seg, x1 = (i + 1) * seg, y0 = i === 0 ? 0.05 : (hs[i - 1] + hs[i]) / 2, y1 = i === n - 1 ? 0.05 : (hs[i] + hs[i + 1]) / 2;
    P.quad(deck, [x0, y0 + 0.02, -w / 2], [x1, y1 + 0.02, -w / 2], [x1, y1 + 0.02, w / 2], [x0, y0 + 0.02, w / 2], [0, 1, 0], [[x0 / 3, 0], [x1 / 3, 0], [x1 / 3, w / 3], [x0 / 3, w / 3]]);
    P.quad(iron, [x0, y0 - 0.45, -w / 2], [x1, y1 - 0.45, -w / 2], [x1, y1 + 0.02, -w / 2], [x0, y0 + 0.02, -w / 2], [0, 0, -1]);
    P.quad(iron, [x1, y1 - 0.45, w / 2], [x0, y0 - 0.45, w / 2], [x0, y0 + 0.02, w / 2], [x1, y1 + 0.02, w / 2], [0, 0, 1]);
    P.quad(iron, [x0, y0 - 0.45, w / 2], [x1, y1 - 0.45, w / 2], [x1, y1 - 0.45, -w / 2], [x0, y0 - 0.45, -w / 2], [0, -1, 0]);
    for (const s of [-1, 1]) {                                                                    // railing: posts + a top rail + rings between
      const z = s * (w / 2 - 0.05);
      P.cyl(iron, [x0, y0 + 0.02, z], [x1, y1 + 0.02 + 0.0, z], 0.02, 0.02, 4, false);
      P.cyl(iron, [x0, y0 + 1.0, z], [x1, y1 + 1.0, z], 0.03, 0.03, 5, false);
      for (let k = 0; k <= 5; k++) { const t = k / 5, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; P.cyl(iron, [x, y, z], [x, y + 1.0, z], 0.018, 0.018, 4, false); }
    }
    const c = (x0 + x1) / 2, cx = a[0] + (dx / L) * c, cz = a[1] + (dz / L) * c;
    ph.addWalkBox(cx, cz, seg + 0.05, w, rot, (y0 + y1) / 2 + 0.02, -1);
  }
  P.pop();
  // the railing line: one GHOST bay per deck segment and side (a breakable collider under the drawn iron railing; water is reachable, docs/AREAS.md 13.7: the pond has water now, a 17 m wall in it was a fence line)
  const rb = [];
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, ox = (-dz / L) * s * (w / 2), oz = (dx / L) * s * (w / 2);
    rb.push({ x0: a[0] + dx * t0 + ox, z0: a[1] + dz * t0 + oz, x1: a[0] + dx * t1 + ox, z1: a[1] + dz * t1 + oz, y: 0, ghost: true });
  }
  knockBays(K.ctx, { name: 'lmK-rossi-rail', bays: rb, parts: [], far: 200, collider: { y0: 0, y1: 1.1, thick: 0.12, e0: 0.02, e1: 0.02 },
    rec: { kind: 'fence', mass: 60, h: 1.0, r: 0.05, anchored: 14, hitK: 0.2, metal: true, minDv: 0 } });
}

export function garden(K) {
  for (const [name, fn] of [['pavilion', pavilion], ['busts', busts], ['oak', oak], ['rossiBridge', rossiBridge]]) {
    try { fn(K); } catch (e) { console.error(`[landmarksK] garden/${name}:`, e); throw e; }
  }
  void THREE;
}
export const build = garden;
