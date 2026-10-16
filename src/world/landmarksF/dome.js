// landmarksF/dome.js - the drum, the ribbed copper dome, the lantern, the gilded ball and cross of Kazan Cathedral (71.6 m to the tip of the cross).  Profile calibrated on photo 18 (cross 71.6 m = 570 px):
// round attic with a relief frieze 35.0-39.6, drum (ochre, R 11, 16 windows between paired pilasters) 40.2-47.0, cornice to 48.2, parapet + 16 dormers with oval windows, dome shell R 9.4 / height 11
// (16 ribs), neck with leaf scrolls to 65.5, gilded ball (r 1) at 66.5, cross 67.5-71.6.  Centre of the dome: OSM parts (-1493.3, -200.3) = (0.0, 72.7) in the model frame.
import * as THREE from 'three';
import { arcWall, arcFlat, lathe, pol, DEG } from './prims.js';
import { win } from './body.js';
import { DOME, Y_CROSS } from './body.js';
import { boxAt, cylAt } from './frame.js';

export function domeStack(K) {
  const P = K.P, M = K.M, cx = DOME.x, cz = DOME.z, TAU = Math.PI * 2;
  const frameAt = (R, a, y, fn) => { P.push(R * Math.sin(a), y, R * Math.cos(a), a); fn(); P.pop(); };
  P.push(cx, 0, cz, 0);                                            // from here on the dome is drawn around the origin
  // ---- round attic with the relief frieze
  const y0 = Y_CROSS;
  P.cyl(M.stoneWarm, [0, y0, 0], [0, y0 + 4.6, 0], 13.0, 13.0, 40, false);
  arcWall(P, M.relief, 13.04, 0, TAU, y0 + 1.0, y0 + 3.4, false, { uvu: 12.8, uvv: 2.4, vBase: y0 + 1.0, step: 3.2 });
  P.cyl(M.stoneWarm, [0, y0 + 4.6, 0], [0, y0 + 5.2, 0], 13.5, 13.5, 40, true);
  P.cyl(M.stoneShade, [0, y0 + 0.0, 0], [0, y0 + 0.6, 0], 13.35, 13.35, 40, false);
  // ---- drum
  const yd0 = y0 + 5.2, yd1 = yd0 + 6.8, R = 11.0, Rf = R * Math.cos(Math.PI / 32);
  P.cyl(M.drum, [0, yd0, 0], [0, yd1, 0], R, R, 32, false);
  for (let k = 0; k < 16; k++) {
    const a = k * TAU / 16;
    frameAt(Rf, a, 0, () => win(P, M, 0, yd0 + 1.5, 1.9, 4.2, { sw: 0.28, d: 0.2, rows: 3 }));
    for (const sg of [-1, 1]) {                                            // a pair of pilasters between the windows
      const b = a + TAU / 32 + sg * 0.062;
      frameAt(Rf, b, 0, () => { P.box(M.drumLight, -0.38, 0.38, yd0 + 0.3, yd1 - 1.0, 0, 0.3, 'kb'); P.box(M.stoneWarm, -0.5, 0.5, yd1 - 1.0, yd1 - 0.15, 0, 0.42, 'kb'); P.box(M.stoneWarm, -0.5, 0.5, yd0, yd0 + 0.3, 0, 0.36, 'kb'); });
    }
  }
  // frieze of garlands between the capitals (a darker band) and the cornice
  arcWall(P, M.drumLight, R + 0.03, 0, TAU, yd1 - 1.0, yd1 - 0.15, false, { step: 3 });
  P.cyl(M.stoneWarm, [0, yd1, 0], [0, yd1 + 0.5, 0], 11.7, 11.7, 32, false);
  P.cyl(M.stoneWarm, [0, yd1 + 0.5, 0], [0, yd1 + 1.2, 0], 12.1, 12.1, 32, true);
  const yb = yd1 + 1.2;                                                    // 48.2: the springing of the dome
  // parapet ring
  arcWall(P, M.balustrade, 11.9, 0, TAU, yb, yb + 0.9, false, { step: 3 }); arcWall(P, M.balustrade, 11.5, 0, TAU, yb, yb + 0.9, true, { step: 3 }); arcFlat(P, M.balustrade, 11.5, 11.9, 0, TAU, yb + 0.9, true, { step: 3 });
  // ---- dome shell (lathe) + 16 ribs + 16 dormers
  const a = 9.4, b = 11.0, prof = [];
  for (let i = 0; i <= 12; i++) { const t = (i / 12) * 78 * DEG; prof.push([a * Math.cos(t), b * Math.sin(t)]); }
  lathe(P, M.dome, 'kdome', prof, 0, yb, 0, 1, 1, 48);
  for (let k = 0; k < 16; k++) {
    const phi = (k + 0.5) * TAU / 16 + TAU / 32, s = Math.sin(phi), c = Math.cos(phi), tx = Math.cos(phi) * 0.2, tz = -Math.sin(phi) * 0.2;
    for (let i = 3; i < 12; i++) {
      const t0 = (i / 12) * 78 * DEG, t1 = ((i + 1) / 12) * 78 * DEG, r0 = a * Math.cos(t0) + 0.13, r1 = a * Math.cos(t1) + 0.13, h0 = yb + b * Math.sin(t0), h1 = yb + b * Math.sin(t1);
      const w0 = 0.22 * Math.cos(t0 * 0.4), w1 = 0.2 * Math.cos(t1 * 0.4);
      P.quad(M.domeRib, [r0 * s - tx * w0 / 0.2, h0, r0 * c - tz * w0 / 0.2], [r0 * s + tx * w0 / 0.2, h0, r0 * c + tz * w0 / 0.2], [r1 * s + tx * w1 / 0.2, h1, r1 * c + tz * w1 / 0.2], [r1 * s - tx * w1 / 0.2, h1, r1 * c - tz * w1 / 0.2], [s * 0.8, 0.6, c * 0.8]);
    }
  }
  for (let k = 0; k < 16; k++) {                                          // dormers: ornate frames with an oval window
    const phi = k * TAU / 16 + TAU / 32;
    frameAt(9.7, phi, yb, () => {
      P.box(M.drumLight, -0.75, 0.75, 0.0, 2.5, -0.1, 0.95, '');
      P.box(M.stoneWarm, -0.95, -0.7, 0.1, 2.4, 0.2, 1.0, 'b'); P.box(M.stoneWarm, 0.7, 0.95, 0.1, 2.4, 0.2, 1.0, 'b');
      P.box(M.stoneWarm, -1.0, 1.0, 2.5, 2.8, 0.1, 1.15, '');
      P.cyl(M.glass, [0, 1.35, 0.94], [0, 1.35, 0.98], 0.42, 0.42, 10, true);
      P.cyl(M.stoneWarm, [0, 1.35, 0.9], [0, 1.35, 0.95], 0.62, 0.62, 10, true);
    });
  }
  // ---- neck / lantern with leaf scrolls, ball, cross
  const yN = yb + b - 0.2;                                                 // 59.0
  const neck = [[0, 0], [2.3, 0], [2.3, 0.5], [1.9, 1.0], [1.6, 1.6], [1.45, 3.0], [1.6, 4.2], [2.0, 5.0], [1.8, 5.5], [1.2, 6.0], [0.6, 6.3], [0, 6.5]];
  lathe(P, M.domeNeck, 'kneck', neck, 0, yN, 0, 1, 1, 16);
  for (let k = 0; k < 8; k++) {
    const phi = k * TAU / 8;
    frameAt(1.3, phi, yN + 1.2, () => { P.box(M.dome, -0.3, 0.3, 0, 2.2, 0, 0.55, 'b'); P.cyl(M.dome, [0, 2.2, 0.28], [0, 2.9, 0.12], 0.3, 0.12, 6, false); });
  }
  P.geo(M.gold, new THREE.SphereGeometry(1.0, 14, 10), 0, 66.5, 0);
  cross(P, M.gold, 0, 67.4, 0, 4.2);
  P.pop();
  K.domeTop = 71.6;
  // ---- colliders: the drum / dome are above the roofs (not reachable on foot); the player can land on the crossing roof (35 m)
  cylAt(K.ctx.physics, cx, cz, 13.4, 25.0, 80);                // above the crossing roof only: the hall below is walkable
}

function cross(P, mat, x, y, z, h) {
  const t = 0.09;
  P.box(mat, x - t, x + t, y, y + h, z - t, z + t, 'b');
  P.box(mat, x - h * 0.2, x + h * 0.2, y + h * 0.62, y + h * 0.62 + t * 2, z - t * 0.8, z + t * 0.8, '');
  P.box(mat, x - h * 0.12, x + h * 0.12, y + h * 0.82, y + h * 0.82 + t * 1.6, z - t * 0.8, z + t * 0.8, '');
  P.box(mat, x - h * 0.14, x + h * 0.14, y + h * 0.3, y + h * 0.3 + t * 1.6, z - t * 0.8, z + t * 0.8, '');
}
void boxAt; void pol;
