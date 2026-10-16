// landmarksE/theatre.js - the Alexandrinsky Theatre (Александринский театр, Rossi 1828-32), OSM w28893849, docs/research/gostiny-dvor-ostrovsky.md section 6, photos refs/ostrovsky 065 085 090 091 094 097 099 109.
//   Frame: atUV(353, 216): local x = u - 353 (west), local z = north (the front plane z = 0, the body runs to z = -77).  Proportions re-read on photo 085 with the OSM width (front 43 m):
//   rusticated ground storey 5.2 m (five brown doors with lion-mask keystones), belt cornice, the loggia floor at 5.75 m with the balustrade, SIX free Corinthian columns (pitch 3.9 m, to 17.4 m)
//   in front of the recessed back wall (7 arched windows + 7 small square ones, mask-and-garland frieze), flat wing walls with an arched niche and a white statue (Melpomene, Terpsichore), the heavy
//   entablature (cornice to 21 m), the low stepped attic with the relief of two winged Victories and the lyre, the stage house (12 small arched windows, cornice, white balustrade, top 27.2 m) and
//   the Apollo quadriga (green-black bronze).  The two 8-column side porticoes (7 m deep) on the long sides, the rear wall with six pilasters and arched windows closing Rossi street.
//   Colours #e8c070 wall / #f2efe6 order / #5a8a6a copper roof.  Colliders: the OSM outline (thin walls) + the columns.  NO banners between the columns, NO flags on the balustrade.
import * as THREE from 'three';
import * as L from '../layout.js';
import { atUV, toWorld, ROT } from './frame.js';
import { horse, ellip } from './sculpt.js';
import { figureMats } from '../lib/figures.js';
import { quadrigaHorse, apollo, chariotBody } from './statues.js';
import { figure } from './monument.js';
import { corinthian } from './columns.js';
import { addPolyColliders } from '../lib/massing.js';
import { roofGeo } from './gd.js';
import { archPath } from './kit.js';

export const Y = { PL: 1.0, BELT: 5.2, FLOOR: 5.75, BAL: 6.5, COL1: 17.4, ARC1: 18.2, FR1: 19.3, COR: 21.0, ATT: 23.3, SC0: 25.1, SC1: 26.7, TOP: 27.7 };
const HALF = 21.5, DEPTH = 77, LOGGIA = 7.5;

export function build(K, ctx) {
  const P = K.P, G = K.G, M = G.M, KM = K.mats;
  const rec = L.buildingById('w28893849');
  if (!rec) throw new Error('theatre record missing');
  const wallRust = M.theatreRust, wall = M.theatre, white = M.white, shade = M.whiteShade;
  const garland = G.garland;

  atUV(P, 353, 216, () => {
    // ================================================================================== front: ground storey
    P.box(M.plinth, -HALF - 0.1, HALF + 0.1, 0, Y.PL, -0.1, 0.12, 'b');
    K.wallQuad(wallRust, -HALF, HALF, Y.PL, Y.BELT, 1.8);
    // doors: 5 brown double doors with a lattice transom, white surrounds, lion-mask keystones, poster cases
    for (const x of [-18.2, -8.4, 0, 8.4, 18.2]) {
      K.plane(M.door, x - 0.85, x + 0.85, Y.PL, 3.5, 0.06);
      K.plane(M.dark, x - 0.85, x + 0.85, 3.5, 4.2, 0.06);
      for (const sx of [-1, 1]) P.box(white, x + sx * 1.0 - 0.1, x + sx * 1.0 + 0.1, Y.PL, 4.3, 0, 0.14, 'kb');
      P.box(white, x - 1.1, x + 1.1, 4.2, 4.4, 0, 0.16, 'kb');
      P.box(white, x - 0.3, x + 0.3, 4.45, 5.05, 0, 0.22, 'kb'); P.box(M.dark, x - 0.16, x + 0.16, 4.7, 4.85, 0.22, 0.24, 'kb');
      for (const sx of [-1, 1]) { P.box(KM.doorWood, x + sx * 2.2 - 0.35, x + sx * 2.2 + 0.35, 1.3, 2.3, 0, 0.12, 'kb'); }
    }
    // belt cornice
    P.box(white, -HALF - 0.4, HALF + 0.4, Y.BELT - 0.3, Y.BELT + 0.2, 0, 0.8, 'b');
    P.box(wall, -HALF, HALF, Y.BELT + 0.2, Y.FLOOR, 0, 0.2, 'kb');
    // ================================================================================== the loggia
    loggia(K, { cols: [-9.75, -5.85, -1.95, 1.95, 5.85, 9.75], half: 13.2, depth: LOGGIA, y0: Y.FLOOR, y1: Y.COL1, r: 0.62, winX: [-11.7, -7.8, -3.9, 0, 3.9, 7.8, 11.7], winW: 1.55, front: true, ctx });
    // ================================================================================== the wings: flat walls with a niche + statue, mask frieze, heavy cornice
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? 13.2 : -HALF, x1 = sx > 0 ? HALF : -13.2, cx = sx * 17.35;
      K.wallWithHoles(wall, x0, x1, Y.BELT + 0.2, Y.COR, [{ x: cx, y0: 6.6, w: 3.0, h: 5.2, head: 'arch' }], 4);
      { const sb = new THREE.Shape(); archPath(sb, cx, 6.6, 3.0, 3.7, false); P.face(M.theatreShade, sb, -0.55, 1, 8); }
      for (const [a, b] of [[-1.7, -1.5], [1.5, 1.7]]) P.box(white, cx + a, cx + b, 6.6, 9.4, -0.02, 0.1, 'kb');
      const sh = new THREE.Shape(); archPath(sh, cx, 6.6, 3.4, 3.7, false); const ho = new THREE.Path(); archPath(ho, cx, 6.6, 3.0, 3.7, true); sh.holes.push(ho); P.face(white, sh, 0.05, 1, 8);
      figure(P, M.white, cx, 6.6, -0.15, 0, 0.88, sx > 0 ? 1 : 2);
      P.box(white, x0, x1, 15.9, 17.5, 0, 0.12, 'kb');                                  // plain band under the frieze
      P.quad(garland, [x0, 16.0, 0.14], [x1, 16.0, 0.14], [x1, 17.4, 0.14], [x0, 17.4, 0.14], [0, 0, 1], [[0, 0], [(x1 - x0) / 4.4, 0], [(x1 - x0) / 4.4, 1], [0, 1]]);
      // architrave band and the heavy cornice with the mutule row
      P.box(white, x0, x1, 17.5, 18.2, 0, 0.3, 'kb');
      P.box(wall, x0, x1, 18.2, 19.3, 0, 0.1, 'kb');
      P.box(M.whiteShade, x0 - (sx < 0 ? 0.9 : 0), x1 + (sx > 0 ? 0.9 : 0), 19.2, 19.5, 0, 1.5, 'b');
      P.box(white, x0 - (sx < 0 ? 0.9 : 0), x1 + (sx > 0 ? 0.9 : 0), 19.5, Y.COR, 0, 1.7, 'b');
      // the wing attic: a plain block with a green cap
      P.box(wall, x0, x1, Y.COR, 23.0, -1.0, 0.5, 'b'); P.box(white, x0 - (sx < 0 ? 0.2 : 0), x1 + (sx > 0 ? 0.2 : 0), 23.0, 23.3, -1.1, 0.7, 'b');
    }
    // ================================================================================== attic with the relief, stage house, balustrade, quadriga
    const at = new THREE.Shape(); [[-13.9, 0], [13.9, 0], [13.9, 1.3], [6.0, 2.3], [-6.0, 2.3], [-13.9, 1.3]].forEach((q, i) => (i ? at.lineTo(q[0], Y.COR + q[1]) : at.moveTo(q[0], Y.COR + q[1])));
    P.extrude(wall, at, -0.9, 1.2, 1, 4);
    P.box(white, -14.2, 14.2, Y.COR, Y.COR + 0.3, -0.95, 0.5, 'b');
    K.plane(victoryMat(K), -8.4, 8.4, Y.COR + 0.35, Y.COR + 2.25, 0.32);
    // stage house
    stageHouse(K, M);
    // quadriga on the attic (green-black bronze patina)
    quadriga(K, M.bronzeGreen, 0, Y.ATT, -2.2);
    // ================================================================================== the side porticoes (8 columns, 7 m deep) on the long sides
    for (const sx of [-1, 1]) {
      P.push(sx * (HALF + 6.8), 0, -38, sx > 0 ? Math.PI / 2 : -Math.PI / 2);
      const cols = []; for (let k = 0; k < 8; k++) cols.push(-14.35 + k * 4.1);
      P.box(M.plinth, -17.2, 17.2, 0, Y.PL, -6.9, 0.2, 'b');
      K.wallQuad(wallRust, -17.0, 17.0, Y.PL, Y.BELT, 1.8, 0.0);
      for (const x of [-8.2, 0, 8.2]) { const s2 = new THREE.Shape(); archPath(s2, x, 0.0, 2.6, 2.3, false); P.face(M.dark, s2, 0.02, 1, 8); const s3 = new THREE.Shape(); archPath(s3, x, 0, 3.1, 2.3, false); const h3 = new THREE.Path(); archPath(h3, x, 0, 2.6, 2.3, true); s3.holes.push(h3); P.face(white, s3, 0.05, 1, 8); }
      P.box(white, -17.4, 17.4, Y.BELT - 0.3, Y.BELT + 0.2, 0, 0.8, 'b');
      loggia(K, { cols, half: 16.8, depth: 6.5, y0: Y.FLOOR, y1: Y.COL1, r: 0.62, winX: [-12.3, -8.2, -4.1, 0, 4.1, 8.2, 12.3], winW: 1.5, front: false, ctx, mirror: sx });
      P.pop();
    }
    // ================================================================================== the plain walls of the body (sides and rear)
    const wallAt = (ox, oz, th, len) => { P.push(ox, 0, oz, th); const n = Math.max(1, Math.round(len / 4.6)); wallBody(K, M, len, n, len / n); P.pop(); };
    wallAt(HALF, 0, Math.PI / 2, 22); wallAt(HALF, -54, Math.PI / 2, 23);            // west side (child +x runs south)
    wallAt(-HALF, -77, -Math.PI / 2, 23); wallAt(-HALF, -22, -Math.PI / 2, 22);      // east side (child +x runs north)
    wallAt(HALF, -DEPTH, Math.PI, 2 * HALF);                                          // rear: faces south
  });
  // ---- the pitched roof over the body (green copper)
  const o = rec.polys[0].o, ring = []; for (let i = 0; i < o.length; i += 2) ring.push([o[i], o[i + 1]]);
  const body = [toWorld(332, 216), toWorld(374, 216), toWorld(374, 293), toWorld(332, 293)];
  P.geo(M.roofGreen, roofGeo(body, [], Y.COR + 0.1, 0.3, 24.0, 5, (x, z) => [x / 2.4, z / 2.4]));
  void ring;

  // ---- colliders: the OSM outline walls and the columns
  addPolyColliders(ctx, rec.polys[0], 0, 30, 0.9);
  const [cx, cz] = toWorld(353, 216 + 40);
  K.svc.monuments.push({ id: 'w28893849', name: 'Александринский театр', nameEn: 'Alexandrinsky Theatre', x: cx, z: cz, h: 28 });
  K.svc.houses.push({ id: 'w28893849', name: 'Александринский театр', nameEn: 'Alexandrinsky Theatre', x: cx, z: cz });
  const [sx0, sz0] = toWorld(353, 195), [tx, tz] = toWorld(353, 216);
  K.svc.photoSpots.push({ x: sx0, z: sz0, yaw: Math.atan2(-(tx - sx0), -(tz - sz0)) * 180 / Math.PI, pitch: 14, name: 'Александринский театр', nameEn: 'Alexandrinsky Theatre from the square' });
  K.svc.spots.theatre = { steps: toWorld(353, 212), doors: [-18.2, -8.4, 0, 8.4, 18.2].map((x) => toWorld(353 - x, 214)) };
}

// ------------------------------------------------------------------------------------------------ loggia: columns, balustrade, back wall with windows, entablature (frame: z = 0 is the column plane)
function loggia(K, o) {
  const P = K.P, M = K.G.M, KM = K.mats, { cols, half, depth, y0, y1, r } = o;
  const white = M.white;
  // floor slab + balustrade
  P.box(white, -half - 0.7, half + 0.7, y0 - 0.45, y0, -depth, 0.95, 'b');
  P.quad(M.balust, [-half - 0.5, y0, 0.55], [half + 0.5, y0, 0.55], [half + 0.5, y0 + 0.78, 0.55], [-half - 0.5, y0 + 0.78, 0.55], [0, 0, 1], [[0, 0], [(2 * half + 1) / 0.9, 0], [(2 * half + 1) / 0.9, 1], [0, 1]]);
  P.box(white, -half - 0.6, half + 0.6, y0 + 0.74, y0 + 0.9, 0.42, 0.7, 'b');
  // columns (+ the half columns / pilasters where the loggia meets the wings)
  for (const x of cols) corinthian(K, white, M.whiteShade, x, 0.0, y0, y1, r);
  for (const sx of [-1, 1]) {
    const x = sx * (half + 0.15);
    P.box(white, x - 0.55, x + 0.55, y0, y1 - 1.2, -1.0, 0.4, 'b'); P.box(white, x - 0.8, x + 0.8, y1 - 1.2, y1, -1.1, 0.5, 'b');
  }
  // back wall: yellow, 7 arched windows (lower) + 7 small square windows (upper), frieze of masks under the ceiling
  P.push(0, 0, -depth, 0);
  K.wallQuad(M.theatre, -half - 0.2, half + 0.2, y0, y1, 4);
  for (const x of o.winX) {
    K.window({ x, y: y0 + 0.9, w: o.winW, h: 3.9, head: 'arch', sw: 0.25, d: 0.1, frame: 'white', surMat: white, sillMat: white });
    K.window({ x, y: y0 + 6.5, w: 1.0, h: 1.3, head: 'flat', sw: 0.14, d: 0.07, frame: 'white', surMat: white, sillMat: white });
  }
  P.quad(o.front ? K.G.garland : K.G.garland, [-half, y1 - 3.3, 0.12], [half, y1 - 3.3, 0.12], [half, y1 - 1.9, 0.12], [-half, y1 - 1.9, 0.12], [0, 0, 1], [[0, 0], [2 * half / 4.4, 0], [2 * half / 4.4, 1], [0, 1]]);
  P.pop();
  for (const sx of [-1, 1]) { const x = sx * (half + 0.2); P.quad(M.theatre, [x, y0, -depth], [x, y0, 0.6], [x, y1, 0.6], [x, y1, -depth], [-sx, 0, 0]); }
  // ceiling (coffered: a slightly darker yellow) and the entablature: architrave, frieze, cornice (returns on both ends)
  P.quad(M.theatreShade, [-half - 0.6, y1, -depth], [half + 0.6, y1, -depth], [half + 0.6, y1, 1.0], [-half - 0.6, y1, 1.0], [0, -1, 0]);
  const e0 = half + 0.7;
  P.box(white, -e0, e0, y1, y1 + 0.8, -depth, 0.85, 'b');
  P.box(M.theatre, -e0 + 0.05, e0 - 0.05, y1 + 0.8, y1 + 1.9, -depth, 0.7, 'b');
  P.box(white, -e0 - 0.1, e0 + 0.1, y1 + 1.9, y1 + 3.6, -depth, 1.7, 'b');
  for (let x = -e0 + 0.4; x < e0 - 0.3; x += 0.9) P.box(M.whiteShade, x, x + 0.4, y1 + 1.55, y1 + 1.9, 0.0, 1.5, 'b');   // mutules
  for (const x of cols) o.ctx.physics.addCylinder(...worldOf(K, x, 0.0), 0.66, 0, 18);
}
function worldOf(K, x, z) {
  // the Parts frame currently on top of the stack -> world position of local (x, z): use the matrix
  const m = K.P.m.elements; return [m[0] * x + m[8] * z + m[12], m[2] * x + m[10] * z + m[14]];
}

// ------------------------------------------------------------------------------------------------ plain walls of the body: rusticated ground storey, two rows of windows, mask frieze, cornice
function wallBody(K, M, l, n, p) {
  const P = K.P, white = M.white;
  K.wallQuad(M.theatreRust, 0, l, Y.PL, Y.BELT, 1.8);
  P.box(M.plinth, -0.1, l + 0.1, 0, Y.PL, -0.1, 0.12, 'b');
  P.box(white, -0.2, l + 0.2, Y.BELT - 0.3, Y.BELT + 0.2, 0, 0.7, 'b');
  K.wallQuad(M.theatre, 0, l, Y.BELT + 0.2, Y.COR, 4);
  for (let k = 0; k < n; k++) {
    const cx = (k + 0.5) * p;
    K.window({ x: cx, y: 1.5, w: 1.3, h: 2.2, head: 'flat', sw: 0.2, d: 0.08, frame: 'white', surMat: white, sillMat: white });
    K.window({ x: cx, y: Y.FLOOR + 1.0, w: 1.5, h: 3.8, head: 'arch', sw: 0.25, d: 0.1, frame: 'white', surMat: white, sillMat: white });
    K.window({ x: cx, y: 12.2, w: 1.0, h: 1.2, head: 'flat', sw: 0.14, d: 0.07, frame: 'white', surMat: white, sillMat: white });
    if (k > 0) P.box(white, k * p - 0.55, k * p + 0.55, Y.FLOOR, 15.6, 0, 0.18, 'kb');
  }
  P.quad(K.G.garland, [0, 16.0, 0.14], [l, 16.0, 0.14], [l, 17.4, 0.14], [0, 17.4, 0.14], [0, 0, 1], [[0, 0], [l / 4.4, 0], [l / 4.4, 1], [0, 1]]);
  P.box(white, 0, l, 17.5, 18.2, 0, 0.3, 'kb');
  P.box(M.whiteShade, -0.2, l + 0.2, 19.2, 19.5, 0, 1.5, 'b'); P.box(white, -0.2, l + 0.2, 19.5, Y.COR, 0, 1.7, 'b');
}

// ------------------------------------------------------------------------------------------------ the stage house with its row of 12 arched windows, cornice and balustrade
function stageHouse(K, M) {
  const P = K.P, white = M.white, w = 12.4, z0 = -3.0, z1 = -62;
  P.box(M.theatre, -w, w, Y.COR, Y.SC0, z1, z0, 'b');
  P.push(0, 0, z0, 0);
  for (let i = 0; i < 12; i++) K.window({ x: -11.0 + i * 2.0, y: Y.COR + 2.55, w: 0.8, h: 1.25, head: 'arch', sw: 0.1, d: 0.05, frame: 'white', surMat: white, sillMat: white, sill: false });
  P.pop();
  P.box(white, -w - 0.2, w + 0.2, Y.SC0, Y.SC0 + 0.45, z1 - 0.2, z0 + 0.8, 'b');
  P.box(M.theatre, -w - 0.05, w + 0.05, Y.SC0 + 0.45, Y.SC1 - 0.6, z1, z0 + 0.4, 'b');
  P.box(white, -w - 1.3, w + 1.3, Y.SC1 - 0.6, Y.SC1, z1 - 1.3, z0 + 1.6, 'b');
  // roof + balustrade round the stage house
  P.box(M.theatre, -w - 0.5, w + 0.5, Y.SC1 - 0.05, Y.SC1 + 0.02, z1 - 0.5, z0 + 1.0, 'b'); P.box(M.roofGreen, -w - 0.3, w + 0.3, Y.SC1 + 0.02, Y.SC1 + 0.16, z1 - 0.3, z0 + 0.9, 'b');
  for (const [a, b, c, d] of [[-w, w, z0 + 0.9, z0 + 1.0], [-w, w, z1 - 0.3, z1 - 0.2]]) {
    P.box(white, a, b, Y.SC1, Y.SC1 + 0.14, c - 0.3, d + 0.3, 'b'); P.box(white, a, b, Y.TOP - 0.13, Y.TOP, c - 0.3, d + 0.3, 'b');
    P.quad(M.balust, [a, Y.SC1 + 0.14, c + 0.05], [b, Y.SC1 + 0.14, c + 0.05], [b, Y.TOP - 0.13, c + 0.05], [a, Y.TOP - 0.13, c + 0.05], [0, 0, 1], [[0, 0], [(b - a) / 1.1, 0], [(b - a) / 1.1, 1], [0, 1]]);
    for (let x = a; x <= b; x += 3.9) P.box(M.theatre, x - 0.4, x + 0.4, Y.SC1, Y.TOP, c - 0.3, d + 0.3, 'b');
  }
  for (const sx of [-1, 1]) { P.box(white, sx * w - 0.3, sx * w + 0.3, Y.SC1, Y.SC1 + 0.14, z1, z0 + 1.0, 'b'); P.box(white, sx * w - 0.3, sx * w + 0.3, Y.TOP - 0.13, Y.TOP, z1, z0 + 1.0, 'b'); }
}

// ------------------------------------------------------------------------------------------------ the Apollo quadriga: four horses abreast, the chariot, Apollo with the lyre
function quadriga(K, mat, x, y, z) {
  // the group stands in the 3.5 m strip between the attic front and the stage-house wall (local z = -3.0): the horses in front, the chariot and Apollo against the wall
  const P = K.P, mk = figureMats(K.ctx).keys('bronze', 'bronze'), z0 = z + 2.6;
  P.box(K.G.M.theatre, x - 6.2, x + 6.2, y, y + 0.7, -3.0, 2.0, 'b');
  [-4.4, -1.5, 1.5, 4.4].forEach((hx, i) => quadrigaHorse(i).place(P, mk, x + hx, y + 0.7, z0 - 0.2, [0.5, 0.12, -0.12, -0.5][i], 1.3));
  chariotBody().place(P, mk, x, y + 0.7, -1.9, 0, 1.2);
  apollo().place(P, mk, x, y + 0.7 + 0.5, -1.95, 0, 1.3);
}

/** two winged Victories holding wreaths round a laurel wreath with a lyre (white relief on the yellow wall), 8.4 : 1 */
function victoryMat(K) {
  const tex = K.ctx.tex, T = K.ctx.mat.toon;
  const map = tex.draw(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#f3eee2'; g.strokeStyle = '#f3eee2';
    const fig = (cx, flip) => {
      g.save(); g.translate(cx, 70); g.scale(flip, 1);
      g.beginPath(); g.moveTo(-10, 10); g.quadraticCurveTo(-120, -10, -170, -55); g.quadraticCurveTo(-100, -45, -60, -30); g.quadraticCurveTo(-90, -62, -150, -80); g.quadraticCurveTo(-60, -80, -5, -30); g.fill();   // wing
      g.beginPath(); g.moveTo(-20, 20); g.quadraticCurveTo(30, 30, 90, 10); g.lineTo(150, -4); g.lineTo(150, 14); g.quadraticCurveTo(80, 50, 10, 50); g.quadraticCurveTo(-30, 50, -20, 20); g.fill();   // body
      g.beginPath(); g.arc(-16, -4, 14, 0, 6.3); g.fill();                                            // head
      g.lineWidth = 7; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(60, -30, 130, -22); g.stroke();   // arm
      g.lineWidth = 5; g.beginPath(); g.arc(160, -26, 15, 0, 6.3); g.stroke();                        // wreath
      g.restore();
    };
    fig(300, 1); fig(724, -1);
    g.lineWidth = 8; g.beginPath(); g.ellipse(512, 64, 58, 52, 0, 0, 6.3); g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(490, 90); g.quadraticCurveTo(486, 30, 512, 30); g.quadraticCurveTo(538, 30, 534, 90); g.stroke();
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(512 + i * 9, 40); g.lineTo(512 + i * 9, 88); g.lineWidth = 3; g.stroke(); }
  }, { key: 'lmE-victory', repeat: [1, 1] });
  const m = T('#ffffff', { map, alphaTest: 0.45, side: 'double', name: 'lmE-victory' }); K.decalMats.add(m); return m;
}
void ROT; void horse; void ellip;
