// landmarksOktyabrsky/monument.js - the MONUMENT TO IOANNIS KAPODISTRIAS (Памятник Иоаннису Каподистрии; OSM n1372027612 at (796.6, -460.6); sculptor V. M. Klykov, architect M. A. Reinberg, unveiled
// 29 May 2003; a gift of the Greek government and the Greek communities of Russia).  Dossier docs/research/oktyabrsky-square.md sections 3, 4, 9, photos refs/oktyabrsky sq_01 (crops figure / ped /
// plaque x4), sq_02 (back), sq_03 (crop mon, ground), 12, 13.
//   FIGURE   kit human + extras (figure.js), verdigris bronze, 2.36 m (kit scale 1.35) on a 0.22 m bronze disc; it faces SSW (bearing 207 deg), down the promenade toward the hall.
//   PEDESTAL a lathe of pale cream-grey unpolished granite (#d9d4c6): drum r 0.75, concave lower flare, a rounded ring, the smooth shaft r 0.615 with the shield plaque (ИОАННИСУ КАПОДИСТРИЯ / ПАТРИОТЫ
//            ГРЕЦИИ И РОССИИ under a count's coronet) on the front and four small engraved lines on the back, a ledge ring and the concave cap flare up to the disc (y 3.27); the octagonal plinth slab,
//            the sloped platform of granite slabs and the kerb course (3.9 m square with cut corners) below it.
//   SETTING  the apron paving is laid by plaza.js (grey pavers with red-brown band frames); here: white birches and lilac shrubs of the Nekrasov Garden mouth, two crescents of red begonias, a black
//            lantern lamp, a litter bin, the information board (no emblem).  Colliders: the platform block only; 1.5 m of free pavement round it.
import * as THREE from 'three';
import * as L from '../layout.js';
import { KAP, M as toHall } from './frame.js';
import { revolve } from './geo.js';
import { kapodistriasFig } from './figure.js';
import { ribbon, coverFn } from './surfaces.js';
import { partsGeos, addInstanced, mat4 } from './inst.js';
import { plantTrees } from './trees.js';
import { figureMats } from '../lib/figures.js';

const TAU = Math.PI * 2;
const octa = (h, c) => [[-h + c, -h], [h - c, -h], [h, -h + c], [h, h - c], [h - c, h], [-h + c, h], [-h, h - c], [-h, -h + c]];
const un = (x, z) => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };

/** the pedestal profile (r, y) of the drum, the concave flare, the ring, the shaft, the ledge and the cap flare (dossier 3.4) */
function pedestalProfile() {
  const p = [[0.75, 0.62], [0.75, 0.85]];
  for (let i = 1; i <= 6; i++) { const t = i / 6; p.push([0.655 + 0.095 * (1 - t) * (1 - t), 0.85 + 0.34 * t]); }
  p.push([0.676, 1.205], [0.683, 1.255], [0.676, 1.305], [0.615, 1.322], [0.615, 2.62], [0.705, 2.62], [0.705, 2.75], [0.678, 2.79]);
  for (let i = 1; i <= 8; i++) { const t = i / 8; p.push([0.5 + 0.178 * (1 - t) * (1 - t), 2.79 + 0.48 * t]); }
  return p;
}
/** a curved text patch on the shaft: angular span a0 .. a1 (radians from +z), y0 .. y1, radius r, n quads */
function patch(P, mat, r, y0, y1, a0, a1, n = 6) {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n, tm = (t0 + t1) / 2, uA = i / n, uB = (i + 1) / n;
    P.quad(mat, [Math.sin(t0) * r, y0, Math.cos(t0) * r], [Math.sin(t1) * r, y0, Math.cos(t1) * r], [Math.sin(t1) * r, y1, Math.cos(t1) * r], [Math.sin(t0) * r, y1, Math.cos(t0) * r], [Math.sin(tm), 0, Math.cos(tm)], [[uA, 0], [uB, 0], [uB, 1], [uA, 1]]);
  }
}
/** a black single-lantern garden lamp, 4.5 m (front = +z) */
function lanternParts(Q, M) {
  Q.cyl(M.lamp, [0, 0, 0], [0, 0.55, 0], 0.17, 0.1, 10, true); Q.cyl(M.lamp, [0, 0.55, 0], [0, 3.7, 0], 0.065, 0.045, 10, false);
  Q.cyl(M.lamp, [0, 3.62, 0], [0, 3.8, 0], 0.11, 0.1, 10, true);
  Q.cyl(M.lamp, [0, 3.8, 0], [0, 3.95, 0], 0.2, 0.2, 4, true);
  Q.box(M.globe, -0.17, 0.17, 3.95, 4.35, -0.17, 0.17, 'bt', 1);
  for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [0.17, 0.17], [-0.17, 0.17]]) Q.box(M.lamp, x - 0.018, x + 0.018, 3.95, 4.35, z - 0.018, z + 0.018, '', 1);
  Q.cyl(M.lamp, [0, 4.35, 0], [0, 4.52, 0], 0.26, 0.02, 4, true);
}
function binParts(Q, M) {                                              // black steel litter bin with vertical bars, 0.45 m x 0.7 m
  Q.cyl(M.bin, [0, 0, 0], [0, 0.7, 0], 0.22, 0.24, 10, true);
  for (let i = 0; i < 10; i++) { const a = i * TAU / 10; Q.box(M.iron, Math.sin(a) * 0.235 - 0.012, Math.sin(a) * 0.235 + 0.012, 0.04, 0.68, Math.cos(a) * 0.235 - 0.012, Math.cos(a) * 0.235 + 0.012, '', 1); }
}

export function build(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics, cover = coverFn(ctx);
  const fm = figureMats(ctx), mk = { main: M.verdi, dark: fm.dark, accent: M.verdiDark };
  const BASE = 0.62;
  P.push(KAP.x, 0, KAP.z, KAP.rot);
  // ---------------------------------------------------------------------------------------- platform: kerb course, slope, plinth slab (the 3.9 m square with 0.65 m cut corners)
  {
    const RO = octa(1.95, 0.65), RI = octa(1.6, 0.52), RP = octa(1.15, 0.45), n = RO.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const a = RO[i], b = RO[(i + 1) % n], ai = RI[i], bi = RI[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]), m = mid(a, b), d = un(m[0], m[1]);
      const u0 = acc / 2, u1 = (acc + len) / 2; acc += len;
      P.quad(M.kerb, [a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], 0.2, b[1]], [a[0], 0.2, a[1]], [d[0], 0, d[1]], [[u0, 0], [u1, 0], [u1, 0.4], [u0, 0.4]]);                // kerb outer wall
      P.quad(M.kerb, [a[0], 0.2, a[1]], [b[0], 0.2, b[1]], [bi[0], 0.2, bi[1]], [ai[0], 0.2, ai[1]], [0, 1, 0], [[u0, 0.4], [u1, 0.4], [u1, 0.9], [u0, 0.9]]);                // kerb top
      const pa = RP[i], pb = RP[(i + 1) % n];
      P.quad(M.slope, [ai[0], 0.2, ai[1]], [bi[0], 0.2, bi[1]], [pb[0], 0.45, pb[1]], [pa[0], 0.45, pa[1]], [d[0] * 0.5, 1, d[1] * 0.5]);                                  // sloped slabs
      P.quad(M.slabPlinth, [pa[0], 0.45, pa[1]], [pb[0], 0.45, pb[1]], [pb[0], BASE, pb[1]], [pa[0], BASE, pa[1]], [d[0], 0, d[1]]);                                          // plinth slab wall
    }
    P.cap(M.slabPlinth, RP, BASE, true, 2);
  }
  // ---------------------------------------------------------------------------------------- the pedestal (lathe) + disc
  {
    const prof = pedestalProfile();
    revolve(P, M.granite, prof, 48, { uRep: 3, vTile: 1.6 });
    revolve(P, M.verdi, [[0.51, 3.27], [0.51, 3.49]], 32, { capTop: M.verdi, uRep: 2, vTile: 1 });
    // green-grey bloom ring where the bronze runs down the stone, and the dark joint under the ledge
    revolve(P, M.graniteShade, [[0.7075, 2.7], [0.7075, 2.75]], 48, { uRep: 1 });
  }
  // ---------------------------------------------------------------------------------------- plaque (front, +z) and the engraved back
  {
    const R = 0.615, zf = R + 0.02, w2 = 0.225;
    const sh = new THREE.Shape();
    sh.moveTo(-w2, 2.18); sh.lineTo(-0.185, 2.18); sh.lineTo(-0.185, 2.26); sh.lineTo(0.185, 2.26); sh.lineTo(0.185, 2.18); sh.lineTo(w2, 2.18); sh.lineTo(w2, 1.94);
    sh.quadraticCurveTo(w2 - 0.012, 1.74, 0, 1.62); sh.quadraticCurveTo(-w2 + 0.012, 1.74, -w2, 1.94); sh.lineTo(-w2, 2.18);
    P.extrude(M.plaqueBody, sh, R - 0.07, zf - (R - 0.07), 1, 6);
    P.quad(M.plaque, [-w2, 1.62, zf + 0.012], [w2, 1.62, zf + 0.012], [w2, 2.33, zf + 0.012], [-w2, 2.33, zf + 0.012], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    // the engraved lines on the back (-z): a curved patch 0.36 m wide, centre y 1.45, a little left of the axis seen from behind
    patch(P, M.back, R + 0.004, 1.3, 1.62, Math.PI + 0.1 - 0.29, Math.PI + 0.1 + 0.29, 6);
  }
  // ---------------------------------------------------------------------------------------- the figure on the disc (y 3.49), 2.36 m at kit scale 1.35
  kapodistriasFig().place(P, mk, 0, 3.49, 0, 0, 1.35);
  P.pop();
  ph.addBox(KAP.x, KAP.z, 3.6, 3.6, KAP.rot, 0, 6.6);

  // ---------------------------------------------------------------------------------------- setting: begonia crescents, lamp, bin, board, birches, lilacs
  const Wm = KAP.W;
  const free = (x, z, m = 1.0) => cover(x, z) < -m && !L.insideBuilding(x, z, 0.3);
  {
    // two crescents hugging the back corners of the platform on the lawn side (b < 0), radius 2.9 .. 3.6 m
    const arc = (c0, c1) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = c0 + (c1 - c0) * i / 10; const q = Wm(Math.sin(a) * 3.6, -Math.cos(a) * 3.6); pts.push([q.x, q.z]); } return pts; };
    for (const pts of [arc(0.3, 0.98), arc(-0.98, -0.3)]) ribbon(P, M.begonia, pts, 0.85, 0.07, { tile: 1, clip: (x, z) => cover(x, z) > -0.5 });
  }
  const lg = partsGeos((Q) => lanternParts(Q, M)), bg = partsGeos((Q) => binParts(Q, M)), lm = [], bm = [];
  for (const [a, b, rot] of [[6.8, 1.0, 0], [-6.5, 7.5, 0]]) { const p = Wm(a, b); if (free(p.x, p.z, 1.5)) { lm.push(mat4(p.x, 0, p.z, KAP.rot + rot, 1)); ph.addCylinder(p.x, p.z, 0.2, 0, 4.6); K.svc.lamps.push({ x: p.x, z: p.z, h: 4.5 }); } }
  for (const [a, b] of [[3.0, -0.5]]) { const p = Wm(a, b); if (free(p.x, p.z, 1.5)) { bm.push(mat4(p.x, 0, p.z, 0, 1)); ph.addCylinder(p.x, p.z, 0.26, 0, 0.75); } }
  K.extraTris += addInstanced(ctx, K.root, 'lmOkt-lanterns', lg, lm).tris + addInstanced(ctx, K.root, 'lmOkt-bins', bg, bm).tris;
  { const p = Wm(-4.6, -0.2); if (free(p.x, p.z, 1.5)) {
      P.push(p.x, 0, p.z, KAP.rot);
      P.box(M.boardRim, -0.03, 0.03, 0, 1.55, -0.03, 0.03, 'b', 1);
      P.box(M.boardRim, -0.28, 0.28, 1.1, 1.82, -0.02, 0.02, 'f', 1);
      P.quad(M.board, [-0.25, 1.13, 0.024], [0.25, 1.13, 0.024], [0.25, 1.79, 0.024], [-0.25, 1.79, 0.024], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      P.pop(); ph.addCylinder(p.x, p.z, 0.15, 0, 1.9); } }
  // trees: three white birches behind (NNE) and to the left, a clump of lilac in front of the brick wall (WNW), maples further back
  const trees = [];
  for (const [a, b, fam, s] of [[7.5, -5.2, 'birchA', 1.05], [10.5, -8.2, 'birchA', 1.1], [5.5, -9.5, 'birchA', 1.0], [-6.5, 0.8, 'shrub', 1.25], [-7.5, -1.6, 'shrub', 1.1], [-5.6, 2.4, 'shrub', 1.0], [-12, -9, 'limeA', 1.0], [13, -4, 'limeA', 1.0]]) {
    const p = Wm(a, b); if (!free(p.x, p.z, 1.6)) continue;
    trees.push({ x: p.x, z: p.z, y: 0.03, fam, s, yaw: a * 1.7 });
  }
  if (trees.length) { plantTrees(K, trees, 'lmOkt-trees'); K.svc.trees.push(...trees.map((t) => ({ x: t.x, z: t.z, r: 2, h: 9 }))); }

  // ---------------------------------------------------------------------------------------- people and services
  K.svc.monuments.push({ id: 'n1372027612', name: 'Памятник Иоаннису Каподистрии', x: KAP.x, z: KAP.z, h: 5.85 });
  { const p = Wm(0, 8.5), t = Wm(0, 0);
    if (free(p.x, p.z, 0.8)) K.svc.photoSpots.push({ x: p.x, z: p.z, yaw: L.yawToward(p.x, p.z, t.x, t.z), pitch: 20, name: 'Памятник Каподистрии' });
    const q = Wm(0, 4.6); K.svc.crowd.push({ id: 'kapodistrias-greek-community', kind: 'photo', x: q.x, z: q.z, r: 4, n: 5 }); }
  void toHall;
}
