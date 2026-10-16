// landmarksJ/drum.js - the great dome of St Isaac's: the round stone base (R 20.4, 36 - 44), the 24-column colonnade of the drum (red granite, bronze capitals, deck at 44 m, columns to 58.5), the round entablature,
// the balustrade with 24 bronze angels, the upper drum with 24 windows, the gilded ribbed dome (outer diameter 25.8 m, springing 73.4, apex 87.7), the lantern with eight arched openings, the small cupola, ball and
// cross (tip 101.5 m).  Calibrated on photos refs/admiralty 080 (dome ratios: dome 25.8 m = 300 px), 085, 094, 098 (cross, ball, lantern): drum colonnade 37.8 m over the outer entablature (OSM r3229897),
// dome springing 73.4 (OSM 75), lantern base 87.7, tip 101.5 (OSM r3229900).  All drawn around the dome axis = the model origin.
import * as THREE from 'three';
import { capital } from './prims.js';
import { cylAt, boxAt, walkAt } from './frame.js';
import { Y, archFace } from './cathedral.js';

const TAU = Math.PI * 2;
export const D = { BASE0: 36.0, DECK: 44.0, COL0: 44.4, COL1: 58.5, ENT1: 61.7, BAL1: 64.5, SPRING: 73.4, APEX: 87.7, LANT1: 94.4, TIP: 101.5 };

const lathe = (P, mat, pts, y, seg = 24, sr = 1) => { const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); P.geo(mat, g, 0, y, 0, 0, 0, 0, sr, 1, sr); g.dispose(); };

export function build(K) {
  const P = K.P, M = K.M;
  const faceRing = (R, a, y, fn) => { P.push(R * Math.sin(a), y, R * Math.cos(a), a); fn(); P.pop(); };

  // ---- round base: rusticated grey granite drum with a moulded foot and a big cornice at the deck
  P.cyl(M.drumBase, [0, D.BASE0, 0], [0, D.DECK - 1.3, 0], 20.4, 20.4, 48, false);
  P.cyl(M.corniceHi, [0, D.BASE0, 0], [0, D.BASE0 + 0.9, 0], 21.0, 21.0, 48, false);
  P.cyl(M.cornice, [0, D.DECK - 1.3, 0], [0, D.DECK - 0.7, 0], 21.0, 21.0, 48, false);
  P.cyl(M.corniceHi, [0, D.DECK - 0.7, 0], [0, D.DECK, 0], 21.7, 21.7, 48, true);
  // ---- deck + core wall with 12 arched windows
  const Rc = 14.9, Rcol = 17.0, Rf = Rc * Math.cos(Math.PI / 36);
  P.cyl(M.marble, [0, D.DECK, 0], [0, D.COL1, 0], Rc, Rc, 36, false);
  for (let k = 0; k < 12; k++) faceRing(Rf, k * TAU / 12 + TAU / 24, 0, () => {
    archFace(P, M.glass, 0, D.COL0 + 1.2, 2.6, 9.4 - 1.2 + 1.3, 0.08);
    P.box(M.marbleDark, -1.7, -1.3, D.COL0 + 1.2, D.COL0 + 9.4, 0, 0.16, 'kb'); P.box(M.marbleDark, 1.3, 1.7, D.COL0 + 1.2, D.COL0 + 9.4, 0, 0.16, 'kb');
  });
  // ---- 24 granite columns with bronze Corinthian capitals
  const hb = 0.7, hc = 1.45, cs = 0.92;
  for (let k = 0; k < 24; k++) {
    const a = k * TAU / 24, x = Rcol * Math.sin(a), z = Rcol * Math.cos(a);
    P.cyl(M.bronze, [x, D.COL0, z], [x, D.COL0 + hb, z], 0.82, 0.74, 10, false);
    P.cyl(M.column, [x, D.COL0 + hb, z], [x, D.COL1 - hc, z], 0.72, 0.62, 12, false);
    capital(P, M.bronze, x, D.COL1 - hc, z, cs);
    K.cols.push([x, z, 'd']);
  }
  // deck floor ring + low balustrade at the outer edge (the observation gallery)
  const ring = (R, n) => Array.from({ length: n }, (_, i) => [R * Math.sin(i * TAU / n), R * Math.cos(i * TAU / n)]);
  P.cap(M.drumBase, ring(21.7, 48), D.DECK, true, 2.4, [ring(Rc, 36)]);
  // ---- round entablature: architrave, red frieze, cornice
  P.cyl(M.marbleShade, [0, D.COL1, 0], [0, D.COL1 + 1.3, 0], 19.0, 19.0, 48, true);
  P.cyl(M.frieze, [0, D.COL1 + 1.3, 0], [0, D.COL1 + 2.7, 0], 19.1, 19.1, 48, false);
  P.cyl(M.cornice, [0, D.COL1 + 2.7, 0], [0, D.COL1 + 3.2, 0], 19.7, 19.7, 48, true);
  // ---- balustrade ring with posts + 24 angels on the entablature behind it
  const yb = D.ENT1;
  P.cyl(M.patinaDark, [0, yb, 0], [0, yb + 0.5, 0], 19.0, 19.0, 48, true);
  P.cyl(M.patina, [0, yb + 2.2, 0], [0, yb + 2.7, 0], 19.0, 19.0, 48, true);
  for (let k = 0; k < 96; k++) { const a = k * TAU / 96, x = 18.7 * Math.sin(a), z = 18.7 * Math.cos(a); P.cyl(M.patina, [x, yb + 0.5, z], [x, yb + 2.2, z], 0.22, 0.2, 5, false); }
  for (let k = 0; k < 24; k++) {
    const a = k * TAU / 24, R = 17.6, x = R * Math.sin(a), z = R * Math.cos(a);
    P.push(x, yb + 0.5, z, a);
    P.cyl(M.patina, [0, 0, 0], [0, 2.3, 0], 0.5, 0.28, 6, true);                                 // robe
    P.geo(M.patina, new THREE.SphereGeometry(0.2, 6, 4), 0, 2.65, 0);
    for (const sw of [-1, 1]) P.quad(M.patinaDark, [sw * 0.2, 1.4, -0.2], [sw * 1.2, 2.4, -0.3], [sw * 1.1, 3.6, -0.3], [sw * 0.2, 2.6, -0.2], [0, 0, 1]);
    P.pop();
  }
  // ---- upper drum with 24 windows, gilded-edged cornice at the springing
  const Ru = 13.6, y0 = yb + 0.5, y1 = D.SPRING - 1.5, Rfu = Ru * Math.cos(Math.PI / 48);
  P.cyl(M.marblePlain, [0, y0, 0], [0, y1, 0], Ru, Ru, 48, false);
  for (let k = 0; k < 24; k++) faceRing(Rfu, k * TAU / 24, 0, () => {
    P.box(M.glass, -0.8, 0.8, y0 + 2.4, y1 - 1.8, 0, 0.1, 'kb');
    P.box(M.cornice, -1.1, -0.8, y0 + 2.2, y1 - 1.6, 0, 0.14, 'kb'); P.box(M.cornice, 0.8, 1.1, y0 + 2.2, y1 - 1.6, 0, 0.14, 'kb');
  });
  P.cyl(M.cornice, [0, y1, 0], [0, y1 + 0.6, 0], 14.1, 14.1, 48, false);
  P.cyl(M.corniceHi, [0, y1 + 0.6, 0], [0, D.SPRING, 0], 14.5, 14.5, 48, true);
  // ---- the gilded dome: elliptical shell R 12.9, rise 14.3; 24 broad ribs
  const Rd = 12.9, Hd = D.APEX - D.SPRING, pts = [];
  for (let i = 0; i <= 14; i++) { const t = (i / 14) * (Math.PI / 2); pts.push([Rd * Math.cos(t), Hd * Math.sin(t)]); }
  lathe(P, M.gold, pts, D.SPRING, 48);
  for (let k = 0; k < 24; k++) {
    const phi = k * TAU / 24, s = Math.sin(phi), c = Math.cos(phi), tx = Math.cos(phi), tz = -Math.sin(phi);
    for (let i = 0; i < 13; i++) {
      const t0 = (i / 14) * (Math.PI / 2), t1 = ((i + 1) / 14) * (Math.PI / 2), r0 = Rd * Math.cos(t0) + 0.14, r1 = Rd * Math.cos(t1) + 0.14, h0 = D.SPRING + Hd * Math.sin(t0), h1 = D.SPRING + Hd * Math.sin(t1);
      const w0 = 0.75 * Math.max(0.12, Math.cos(t0 * 0.95)), w1 = 0.75 * Math.max(0.1, Math.cos(t1 * 0.95));
      P.quad(M.goldRib, [r0 * s - tx * w0, h0, r0 * c - tz * w0], [r0 * s + tx * w0, h0, r0 * c + tz * w0], [r1 * s + tx * w1, h1, r1 * c + tz * w1], [r1 * s - tx * w1, h1, r1 * c - tz * w1], [s * 0.7, 0.7, c * 0.7]);
    }
  }
  // ---- lantern: gold ring, drum with 8 dark arched openings between pilasters, cornice, cupola, ball, cross
  const yl = D.APEX - 0.25;
  P.cyl(M.gold, [0, yl, 0], [0, yl + 0.8, 0], 3.6, 3.2, 16, true);
  P.cyl(M.marblePlain, [0, yl + 0.8, 0], [0, D.LANT1 - 0.8, 0], 2.7, 2.7, 16, false);
  for (let k = 0; k < 8; k++) {
    const a = k * TAU / 8 + TAU / 16, Rl = 2.7 * Math.cos(Math.PI / 16);
    faceRing(Rl, a, 0, () => { P.box(M.glass, -0.55, 0.55, yl + 1.6, yl + 5.0, 0, 0.08, 'kb'); P.box(M.goldDark, -0.18, 0.18, yl + 0.9, D.LANT1 - 0.9, 0.0, 0.5, 'kb'); });
  }
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8, x = 2.85 * Math.sin(a), z = 2.85 * Math.cos(a); P.cyl(M.gold, [x, yl + 0.8, z], [x, D.LANT1 - 0.8, z], 0.2, 0.2, 6, false); }
  P.cyl(M.gold, [0, D.LANT1 - 0.8, 0], [0, D.LANT1, 0], 3.3, 3.3, 16, true);
  lathe(P, M.gold, [[0, 0], [2.9, 0], [2.85, 0.4], [2.45, 1.4], [1.6, 2.4], [0.7, 2.95], [0, 3.1]], D.LANT1, 20);
  const yt = D.LANT1 + 3.1;
  P.cyl(M.gold, [0, yt - 0.2, 0], [0, yt + 0.5, 0], 0.5, 0.35, 8, true);
  P.geo(M.gold, new THREE.SphereGeometry(0.62, 10, 8), 0, yt + 0.95, 0);
  const t = 0.08, cy = yt + 1.45;
  P.box(M.goldDark, -t, t, cy, D.TIP, -t, t, 'b'); P.box(M.goldDark, -0.62, 0.62, cy + 1.2, cy + 1.2 + 2 * t, -t * 0.8, t * 0.8, ''); P.box(M.goldDark, -0.38, 0.38, cy + 1.8, cy + 1.8 + 2 * t, -t * 0.8, t * 0.8, '');
  // ---- the observation gallery (colonnade deck, 44 m, entered through the SE bell tower, left through the NW one: prompts in isaac.js): walk boxes round the drum, an iron railing at the rim,
  //      colliders of the base, the core wall and the 24 columns.  The deck is a ring R 15 .. 21.4; the roof at 36 stays reachable by flying only.
  const ph = K.ctx.physics;
  for (let k = 0; k < 24; k++) { const a = k * TAU / 24; walkAt(ph, 18.2 * Math.sin(a), 18.2 * Math.cos(a), 5.0, 6.6, a, D.DECK, 40); }
  for (let k = 0; k < 24; k++) { const a = k * TAU / 24; cylAt(ph, Rcol * Math.sin(a), Rcol * Math.cos(a), 0.85, D.DECK, D.COL1 + 3); }
  cylAt(ph, 0, 0, 20.5, Y.ROOF + 0.5, D.DECK);
  cylAt(ph, 0, 0, Rc, D.DECK, D.TIP + 1);
  const Rr = 21.35, nr = 48, rp = [];
  for (let k = 0; k < nr; k++) { const a = k * TAU / nr; rp.push([Rr * Math.sin(a), Rr * Math.cos(a), a]); }
  rp.forEach((p, k) => {
    P.cyl(M.iron, [p[0], D.DECK, p[1]], [p[0], D.DECK + 1.15, p[1]], 0.05, 0.05, 4, false);
    const q = rp[(k + 1) % nr];
    P.cyl(M.iron, [p[0], D.DECK + 1.15, p[1]], [q[0], D.DECK + 1.15, q[1]], 0.04, 0.04, 4, false);
    P.cyl(M.iron, [p[0], D.DECK + 0.55, p[1]], [q[0], D.DECK + 0.55, q[1]], 0.03, 0.03, 4, false);
    boxAt(ph, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 3.0, 0.4, (p[2] + q[2] / 1) * 0 + (k + 0.5) * TAU / nr, D.DECK - 0.5, D.DECK + 3);
  });
}
