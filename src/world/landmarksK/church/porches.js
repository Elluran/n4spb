// church/porches.js - the two terem-style porches (N = the visitors' entrance with the red security booth and turnstiles, S) with their galleries between porch and bell tower: brick walls with tile belts, the
// entrance front (a limestone round arch over two doors, pot-bellied granite vases on dark piers, three low steps), cross-gabled roofs of fish-scale tiles with a gilded openwork fringe, Vasnetsov tympana, the
// gallery arch, and the tent spire (periwinkle / yellow / white gores, gold double-headed eagle) on its pier.  Dossier 3.5, photos refs/saviour 007 008 009 033 034 036 037.
// Plan (church frame C): wing a -23.6 .. -14.8; N: b -19.2 .. -7.8 (porch -19.2 .. -14.6, gallery -14.6 .. -7.8); S: b 9.3 .. 20.3 (gallery 9.3 .. 14.8, porch 14.8 .. 20.3).
import * as G from '../geo.js';
import { CF } from '../frame.js';

export const WING = { a0: -23.6, a1: -14.8, am: -19.2, eave: 6.4, ridge: 9.3 };
const NW = { s: -1, bp: -19.2, bi: -14.6, bt: -7.8 }, SW = { s: 1, bp: 20.3, bi: 14.8, bt: 9.3 };

/** a vertical strip of gold fringe along the 3D segment p0 -> p1, hanging `drop` below it */
function fringe(P, M, p0, p1, drop = 0.5, nrm = null) {
  const L = Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
  P.quad(M.fringe, [p0[0], p0[1] - drop, p0[2]], [p1[0], p1[1] - drop, p1[2]], p1, p0, nrm || [0, 0, 1], [[0, 0], [L / 1.9, 0], [L / 1.9, 1], [0, 1]]);
}
/** a gabled-roof slope quad (double sided material) */
function slope(P, M, p0, p1, p2, p3, n) { P.quad(M.roofTiles, p0, p1, p2, p3, n, [[0, 0], [Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 3, 0], [Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 3, Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) / 3], [0, Math.hypot(p3[0] - p0[0], p3[1] - p0[1], p3[2] - p0[2]) / 3]]); }

/** a pot-bellied granite vase on a dark pier, centred (x, z) in the current frame, base y */
export function vase(K, x, y, z) {
  const P = K.P, M = K.M;
  G.tbox(P, M.graniteDark, x - 0.62, x + 0.62, y, y + 1.15, z - 0.62, z + 0.62, 2, 2, 'b');
  P.box(M.white, x - 0.7, x + 0.7, y + 1.15, y + 1.27, z - 0.7, z + 0.7, 'b');
  G.lathe(P, M.vase, 'vase', [[0, 0], [0.34, 0], [0.4, 0.12], [0.62, 0.42], [0.72, 0.8], [0.62, 1.15], [0.42, 1.38], [0.36, 1.5], [0.52, 1.62], [0.55, 1.72], [0, 1.72]], x, y + 1.27, z, 0.95, 0.95, 16, 14);
}

/** the entrance front in the facade frame of the porch's outer face (len 8.8, x centre 4.4): sill at 0.5 m, three low steps in front */
function entranceFront(K, len) {
  const P = K.P, M = K.M, cx = len / 2, H = WING.eave, Y0 = 0.55;
  G.wall(P, M.brick, 0, len, Y0, H, 0, 3, 3);
  G.tbox(P, M.rock, 0, len, 0, Y0, 0, 0.4, 4.4, 2.4, 'bk');
  P.box(M.white, 0, len, Y0 - 0.02, Y0 + 0.2, 0, 0.5, 'bk');
  // limestone round arch (outer span 4.6) over two round-headed bronze doors on a central pendant
  G.frameRing(P, M.white, G.archPts(cx, Y0 + 0.2, 4.6, 4.8, 14), G.archPts(cx, Y0 + 0.2, 3.7, 4.1, 14), 0.05, 0.35, 1);
  G.planeShape(P, M.brickDark, G.archPts(cx, Y0 + 0.2, 3.7, 4.1, 14), 0.1);
  for (const s of [-1, 1]) {
    const x = cx + s * 0.9;
    G.planeShape(P, M.bronze, G.archPts(x, Y0 + 0.2, 1.55, 3.1, 10), 0.16);
    G.frameRing(P, M.white, G.archPts(x, Y0 + 0.15, 1.95, 3.35, 10), G.archPts(x, Y0 + 0.2, 1.55, 3.1, 10), 0.08, 0.22, 1);
    P.cyl(M.goldFlat, [x - s * 0.5, 1.7, 0.19], [x - s * 0.5, 1.7, 0.23], 0.07, 0.07, 8, true);
  }
  P.cyl(M.white, [cx, Y0 + 0.2, 0.2], [cx, 3.4, 0.2], 0.12, 0.12, 8, false);                  // the pendant between the doors
  P.quad(M.belt, [0, 5.6, 0.04], [len, 5.6, 0.04], [len, 6.0, 0.04], [0, 6.0, 0.04], [0, 0, 1], [[0, 0], [len / 2.8, 0], [len / 2.8, 1], [0, 1]]);
  for (const x of [0.5, len - 0.5]) P.cyl(M.copper, [x, 0.6, 0.18], [x, H, 0.18], 0.07, 0.07, 6, false);
  vase(K, 0.1, 0, 1.45); vase(K, len - 0.1, 0, 1.45);
  for (let i = 0; i < 3; i++) G.tbox(P, M.granite, cx - 2.3, cx + 2.3, 0, 0.4 - 0.13 * i, 0.4 + 0.45 * i, 0.4 + 0.45 * (i + 1), 2, 2, 'bk');
}

/** wing: one porch + gallery.  w = NW / SW record */
function wing(K, w) {
  const P = K.P, M = K.M, s = w.s, bp = w.bp, bi = w.bi, bt = w.bt, a0 = WING.a0, a1 = WING.a1, am = WING.am, E = WING.eave, R = WING.ridge;
  const bc = (bp + bi) / 2, D = Math.abs(bt - bp), pd = Math.abs(bi - bp);
  // ---- walls
  // outer face (the porch front)
  if (s < 0) G.onFace(P, a1, bp, 0, -1, () => { entranceFront(K, a1 - a0); gableEnd(K, a1 - a0, M.mosCarry); });
  else G.onFace(P, a0, bp, 0, 1, () => { entranceFront(K, a1 - a0); gableEnd(K, a1 - a0, M.mosDepos); });
  // west face (toward the canal): the porch part has the cross-gable, the gallery part a small arch
  const bL = Math.min(bp, bt);
  G.onFace(P, a0, bL, -1, 0, () => {
    const X = (u) => (s < 0 ? u : D - u);
    G.wall(P, M.brick, 0, D, 1.2, E, 0, 3, 3);
    G.tbox(P, M.rock, -0.3, D + 0.3, 0, 1.2, 0, 0.4, 4.4, 2.4, 'bk'); P.box(M.white, -0.3, D + 0.3, 1.2, 1.45, 0, 0.5, 'bk');
    // porch part: a limestone arch with two small arches
    const px = X(pd / 2);
    G.frameRing(P, M.white, G.archPts(px, 1.45, 3.7, 3.9, 12), G.archPts(px, 1.45, 3.0, 3.3, 12), 0.05, 0.3, 1);
    G.planeShape(P, M.brickDark, G.archPts(px, 1.45, 3.0, 3.3, 12), 0.1);
    for (const q of [-0.75, 0.75]) { G.planeShape(P, M.bronze, G.archPts(px + q, 1.45, 1.2, 2.6, 8), 0.14); G.frameRing(P, M.white, G.archPts(px + q, 1.4, 1.5, 2.8, 8), G.archPts(px + q, 1.45, 1.2, 2.6, 8), 0.07, 0.18, 1); }
    // gallery part: a smaller arch (2.5 m) with two vases
    const gx = X(pd + (D - pd) / 2);
    G.frameRing(P, M.white, G.archPts(gx, 1.45, 2.9, 3.3, 12), G.archPts(gx, 1.45, 2.3, 2.7, 12), 0.05, 0.3, 1);
    G.planeShape(P, M.glassBlue, G.archPts(gx, 1.45, 2.3, 2.7, 12), 0.1);
    vase(K, gx - 1.9, 0, 0.7); vase(K, gx + 1.9, 0, 0.7);
    P.quad(M.belt, [0, 5.6, 0.04], [D, 5.6, 0.04], [D, 6.0, 0.04], [0, 6.0, 0.04], [0, 0, 1], [[0, 0], [D / 2.8, 0], [D / 2.8, 1], [0, 1]]);
      // the cross-gable end wall over the porch part: Vasnetsov tympanum
    P.push(px, E, 0, 0);
    G.solid(P, M.brick, [[-pd / 2, 0], [pd / 2, 0], [0, 2.3]], 0.0, 0.3, 3);
    G.frameRing(P, M.teeth, [[-pd / 2 - 0.1, -0.05], [pd / 2 + 0.1, -0.05], [0, 2.45]], [[-pd / 2 + 0.35, 0.0], [pd / 2 - 0.35, 0.0], [0, 1.95]], 0.1, 0.3, 0.9);
    G.planeShape(P, s < 0 ? M.mosCruc : M.mosDepos, [[-0.9, 0.3], [0.9, 0.3], [0.9, 0.95], [0, 1.8], [-0.9, 0.95]], 0.32);
    P.pop();
  });
  // ---- roofs (model frame a, b)
  const bA = Math.min(bp, bt), bB = Math.max(bp, bt), ov = 0.35;
  const ya = E - 0.3;                                                                        // eave drip line
  slope(P, M, [a0 - ov, ya, bA], [a0 - ov, ya, bB], [am, R, bB], [am, R, bA], [-1, 0.7, 0]);   // west slope
  slope(P, M, [a1, E, bB], [a1, E, bA], [am, R, bA], [am, R, bB], [1, 0.7, 0]);               // east slope (against the cube)
  // the cross gable over the porch part: ridge along a at b = bc (height E + 2.3), half width pd / 2 + 0.3 at the drip line
  const RC = E + 2.3, hw = pd / 2 + 0.3;
  slope(P, M, [a0 - ov, ya, bc - hw], [am, ya, bc - hw], [am, RC, bc], [a0 - ov, RC, bc], [0, 0.7, -1]);
  slope(P, M, [am, ya, bc + hw], [a0 - ov, ya, bc + hw], [a0 - ov, RC, bc], [am, RC, bc], [0, 0.7, 1]);
  fringe(P, M, [a0 - ov, ya, bc - hw], [a0 - ov, RC, bc], 0.5, [-1, 0, 0]); fringe(P, M, [a0 - ov, RC, bc], [a0 - ov, ya, bc + hw], 0.5, [-1, 0, 0]);
  // main-roof ridge cresting (gilded filigree) + eave fringes
  P.box(M.copper, am - 0.12, am + 0.12, R, R + 0.12, bA, bB, 'b');
  for (let b = bA + 0.3; b < bB - 0.2; b += 0.55) P.box(M.goldFlat, am - 0.025, am + 0.025, R + 0.12, R + 0.55, b - 0.02, b + 0.02, 'b');
  fringe(P, M, [a0 - ov, ya, bA], [a0 - ov, ya, bB], 0.5, [-1, 0, 0]);
  // ---- the spire on its pier at the crossing of the roofs
  spire(K, am + 0.0, bc, R - 0.4);
  void D;
}

/** the pentagonal gable end over the entrance (in the outer face frame): a brick triangle with a limestone frame and the Vasnetsov tympanum */
function gableEnd(K, len, mos) {
  const P = K.P, M = K.M, cx = len / 2, E = WING.eave, R = WING.ridge;
  P.push(0, E, 0, 0);
  const h = R - E;
  G.solid(P, M.brick, [[0, 0], [len, 0], [cx, h]], 0.0, 0.3, 3);
  G.frameRing(P, M.teeth, [[-0.15, 0], [len + 0.15, 0], [cx, h + 0.2]], [[0.35, 0.05], [len - 0.35, 0.05], [cx, h - 0.35]], 0.1, 0.35, 0.9);
  G.frameRing(P, M.checker, [[0.35, 0.05], [len - 0.35, 0.05], [cx, h - 0.35]], [[0.8, 0.1], [len - 0.8, 0.1], [cx, h - 0.8]], 0.1, 0.3, 0.8);
  G.planeShape(P, mos, [[cx - 0.95, 0.3], [cx + 0.95, 0.3], [cx + 0.95, 1.3], [cx, 2.4], [cx - 0.95, 1.3]], 0.35);
  fringe(P, M, [-0.15, 0, 0.56], [cx, h + 0.2, 0.56], 0.5);
  fringe(P, M, [len + 0.15, 0, 0.56], [cx, h + 0.2, 0.56], 0.5);
  P.pop();
}

/** an eight-sided tent spire on a pier: periwinkle / yellow / white gores, a ring of kokoshniks, a gold ball and a double-headed eagle */
function spire(K, x, z, y0) {
  const P = K.P, M = K.M;
  G.tbox(P, M.brickDark, x - 1.2, x + 1.2, y0, y0 + 2.4, z - 1.2, z + 1.2, 3, 3, 'b');
  P.box(M.white, x - 1.4, x + 1.4, y0 + 2.4, y0 + 2.8, z - 1.4, z + 1.4, 'b');
  G.tube(P, M.kokoshnik, x, z, y0 + 2.8, y0 + 4.0, 1.5, 1.5, 24, 1, 1);
  G.tube(P, M.copper, x, z, y0 + 4.0, y0 + 4.3, 1.75, 1.0, 24, 4, 1);
  G.frustum(P, [M.scaleBlue, M.scaleYellow, M.scaleWhite, M.scaleBlue, M.scaleYellow, M.scaleWhite, M.scaleBlue, M.scaleYellow], x, z, y0 + 4.3, y0 + 11.6, 8, 1.15, 0, Math.PI / 8, 1, 2.2);
  G.ball(P, M.goldFlat, x, y0 + 11.75, z, 0.2, 8);
  eagle(K, x, y0 + 11.9, z);
}
/** a small gilded double-headed eagle (flat silhouette, two-sided) */
export function eagle(K, x, y, z, s = 1) {
  const P = K.P, M = K.M;
  const pts = [[0, 0], [0.16, 0.05], [0.42, 0.28], [0.58, 0.2], [0.52, 0.5], [0.3, 0.62], [0.2, 0.55], [0.14, 0.78], [0.05, 0.9], [0.0, 0.8], [-0.05, 0.9], [-0.14, 0.78], [-0.2, 0.55], [-0.3, 0.62], [-0.52, 0.5], [-0.58, 0.2], [-0.42, 0.28], [-0.16, 0.05]].map((p) => [p[0] * s, p[1] * s]);
  for (const rot of [0, Math.PI]) { P.push(x, y, z, rot); G.planeShape(P, M.goldFlat, pts, 0.03); P.pop(); }
}

export function porches(K) {
  wing(K, NW); wing(K, SW);
  const ph = K.ctx.physics;
  for (const w of [NW, SW]) for (let i = 0; i < 3; i++) {
    const z = 0.4 + 0.45 * i + 0.225, a = w.s < 0 ? -19.2 : -19.2, b = w.bp + w.s * z;
    CF.walk(ph, a, b, 4.6, 0.45, 0, 0.4 - 0.13 * i, -1);
  }
  // ---- visitor facilities at the N porch: the dark-red glass booth, three turnstiles, steel rails (world frame positions mapped to the church frame)
  const P = K.P, M = K.M;
  const bx = -19.3 + 2.8, bz = -19.2 - 3.2;
  G.tbox(P, M.booth, bx - 1.1, bx + 1.1, 0, 0.9, bz - 0.65, bz + 0.65, 2, 2, '');
  P.box(M.glassBlue, bx - 1.05, bx + 1.05, 0.9, 2.5, bz - 0.6, bz + 0.6, 't');
  P.box(M.booth, bx - 1.2, bx + 1.2, 2.5, 2.62, bz - 0.75, bz + 0.75, 'b');
  for (const [dx, dz] of [[-1.05, -0.6], [1.05, -0.6], [-1.05, 0.6], [1.05, 0.6]]) P.box(M.booth, bx + dx - 0.04, bx + dx + 0.04, 0.9, 2.5, bz + dz - 0.04, bz + dz + 0.04, 'tb');
  for (let i = 0; i < 3; i++) { const tx = -19.3 - 3.0 - i * 1.0; P.cyl(M.iron, [tx, 0, -19.2 - 2.2], [tx, 1.05, -19.2 - 2.2], 0.07, 0.07, 6, true); P.box(M.iron, tx - 0.45, tx + 0.45, 1.0, 1.06, -19.2 - 2.22, -19.2 - 2.18, ''); }
  K.svc.entrances.push({ id: 'saviour-N', ...CF.W(-19.3, -19.2 - 0.9), rotY: Math.atan2(CF.W(0, -1).x - CF.W(0, 0).x, CF.W(0, -1).z - CF.W(0, 0).z), kind: 'church', label: 'Спас на Крови: вход' });
  K.svc.entrances.push({ id: 'saviour-S', ...CF.W(-19.2, 20.3 + 0.9), rotY: Math.atan2(CF.W(0, 1).x - CF.W(0, 0).x, CF.W(0, 1).z - CF.W(0, 0).z), kind: 'church', label: 'Спас на Крови: южный портал' });
}
