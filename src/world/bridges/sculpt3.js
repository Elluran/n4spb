// bridges/sculpt3.js - lamp standards and ornaments of the south-west bridges (docs/research/sw-canals-bridges.md sections 3 and 6, photos refs/sw-water 03 15 16 46 49 55 60 79 98), drawn into the
// Parts collector P in the CURRENT frame like sculpt.js / sculpt2.js (x, z on the ground plane, y up, `rot` turns a piece about the vertical):
//   cushion      the granite "cushion" pier head: a square pedestal with an ogee cornice and a rounded cap (Torgovy, Matveev, Krasnoflotsky: the base of the Kryukov column lamps)
//   colLamp      the Kryukov cast column lamp: square green column 0.28 m, base collar, rectangular cap, an opal globe on an S-scroll bracket arm at 3.0 m
//   obeliskLamp  the granite obelisk lamp (Pikalov, Krasnogvardeysky, Podyachesky, Obukhovsky): square tapering shaft on a stepped plinth, gilded ball / cone, a bracket with a hexagonal or oval lantern
//   lion         the white cast-iron sitting lion of the Lviny Bridge on a grey pedestal (torso, haunch, paws, head with mane, tail)
//   swanLamp     the tall green swan-neck street lamp (Fonarny): fluted post, scroll top, hanging lantern
import * as THREE from 'three';
import { lion as kitLion, cached } from '../lib/figures.js';

const sph = (P, mat, x, y, z, rx, ry = rx, rz = rx, seg = 8) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)), x, y, z, 0, 0, 0, rx, ry, rz);

/** granite cushion pier head, base at y (square 0.9, ~0.7 tall): plinth, shaft, ogee cornice, low cap */
export function cushion(P, M, x, y, z, rot = 0, w = 0.9) {
  P.push(x, y, z, rot);
  const h = w / 2;
  P.box(M.pylon, -h - 0.07, h + 0.07, 0, 0.14, -h - 0.07, h + 0.07, 'b', 1.2);
  P.box(M.pylon, -h, h, 0.14, 0.52, -h, h, '', 1.2);
  P.box(M.coping, -h - 0.08, h + 0.08, 0.52, 0.62, -h - 0.08, h + 0.08, 'b', 1);
  P.cyl(M.coping, [0, 0.62, 0], [0, 0.72, 0], (h + 0.04) * 1.414, h * 0.9, 4, true);                  // rounded-looking cap (a four-sided frustum seen from a corner reads as a cushion)
  P.pop();
}

/** the Kryukov cast column lamp (3.3 m) standing at (x, y, z); arm: +1 / -1 side of the bracket along local x */
export function colLamp(P, M, x, y, z, rot = 0, arm = 1) {
  P.push(x, y, z, rot);
  const iron = M.colGreen, dark = M.ironGreenDark, gold = M.gold;
  P.box(dark, -0.2, 0.2, 0, 0.12, -0.2, 0.2, 'b', 1);
  P.box(iron, -0.14, 0.14, 0.12, 3.0, -0.14, 0.14, '', 1);
  P.box(dark, -0.19, 0.19, 0.2, 0.34, -0.19, 0.19, 'b', 1); P.box(dark, -0.19, 0.19, 2.6, 2.7, -0.19, 0.19, 'b', 1);          // collars
  P.box(dark, -0.2, 0.2, 3.0, 3.1, -0.2, 0.2, 'b', 1);                                                                       // rectangular cap
  P.cyl(iron, [0, 2.95, 0], [arm * 0.45, 3.2, 0], 0.025, 0.02, 5, false);                                                    // S-scroll bracket
  P.cyl(iron, [arm * 0.45, 3.2, 0], [arm * 0.62, 3.08, 0], 0.02, 0.018, 5, false);
  sph(P, iron, arm * 0.3, 3.0, 0, 0.06, 0.06, 0.012, 6);
  sph(P, M.lampGlass, arm * 0.62, 3.3, 0, 0.19, 0.19, 0.19, 9);
  P.cyl(dark, [arm * 0.62, 3.12, 0], [arm * 0.62, 3.2, 0], 0.1, 0.13, 6, true); P.cyl(dark, [arm * 0.62, 3.46, 0], [arm * 0.62, 3.56, 0], 0.15, 0.03, 6, true);
  sph(P, gold, arm * 0.62, 3.6, 0, 0.03, 0.04, 0.03, 5);
  P.pop();
}

/** granite obelisk lamp: plinth 1.1 x 1.1, shaft 4 m (0.55 -> 0.38), ball or cone on top, bracket arm with a lantern at 3.0 m.  o: { cone, oval (two oval lanterns on opposite brackets), h, plinthH } */
export function obeliskLamp(P, M, x, y, z, rot = 0, o = {}) {
  P.push(x, y, z, rot);
  const H = o.h ?? 4.0, ph = o.plinthH ?? 0.8, gold = M.gold, iron = M.iron;
  P.box(M.pylon, -0.62, 0.62, 0, 0.18, -0.62, 0.62, 'b', 1.2);
  P.box(M.pylon, -0.52, 0.52, 0.18, ph - 0.12, -0.52, 0.52, '', 1.2);
  P.box(M.coping, -0.58, 0.58, ph - 0.12, ph, -0.58, 0.58, 'b', 1);
  P.push(0, ph, 0, Math.PI / 4); P.cyl(M.pylon, [0, 0, 0], [0, H, 0], 0.39, 0.27, 4, true); P.pop();                    // 0.55 square at the foot, 0.38 at the top
  P.box(M.coping, -0.3, 0.3, ph + H - 0.02, ph + H + 0.08, -0.3, 0.3, 'b', 1);
  if (o.cone) { P.cyl(gold, [0, ph + H + 0.08, 0], [0, ph + H + 0.42, 0], 0.13, 0.015, 8, true); }
  else { sph(P, gold, 0, ph + H + 0.22, 0, 0.14, 0.14, 0.14, 8); }
  const ly = ph + 2.2;
  for (const sg of (o.oval ? [1, -1] : [1])) {
    P.cyl(iron, [sg * 0.22, ly + 0.3, 0], [sg * 0.62, ly + 0.45, 0], 0.025, 0.02, 5, false);
    P.cyl(iron, [sg * 0.62, ly + 0.45, 0], [sg * 0.8, ly + 0.3, 0], 0.02, 0.018, 5, false);
    if (o.oval) { sph(P, M.lampGlass, sg * 0.8, ly + 0.05, 0, 0.17, 0.26, 0.17, 8); P.cyl(iron, [sg * 0.8, ly + 0.28, 0], [sg * 0.8, ly + 0.36, 0], 0.07, 0.12, 6, true); }
    else {
      const lx = sg * 0.8;
      P.cyl(M.lampGlass, [lx, ly - 0.2, 0], [lx, ly + 0.3, 0], 0.12, 0.17, 6, false);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P.cyl(iron, [lx + Math.cos(a) * 0.12, ly - 0.2, Math.sin(a) * 0.12], [lx + Math.cos(a) * 0.17, ly + 0.3, Math.sin(a) * 0.17], 0.01, 0.01, 4, false); }
      P.cyl(iron, [lx, ly + 0.3, 0], [lx, ly + 0.5, 0], 0.2, 0.012, 6, true); sph(P, iron, lx, ly + 0.52, 0, 0.025, 0.025, 0.025, 4);
    }
  }
  P.pop();
}

/** the white cast-iron sitting lion of the Lviny Bridge on a grey pedestal (0.8 x 0.8 x 1.1), facing +z: the figure kit's seated lion (lofted body, sculpted head and mane, ~3 k triangles at detail 0.55),
 *  a gilded collar and the gilded chain it holds in its mouth (a catenary of links running forward toward the span, ending on the deck) */
const lionFig = () => cached('lmBr-lviny-lion', () => kitLion({ pose: 'sit', detail: 0.55, mane: 0.9 }));
export function lion(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const ped = M.pedestalGrey, gold = M.gold;
  P.box(ped, -0.46, 0.46, 0, 0.16, -0.46, 0.46, 'b', 1.2); P.box(ped, -0.4, 0.4, 0.16, 0.98, -0.4, 0.4, '', 1.2); P.box(ped, -0.46, 0.46, 0.98, 1.1, -0.46, 0.46, 'b', 1.2);
  P.push(0, 1.1, 0, 0);
  lionFig().place(P, { main: M.lionWhite, dark: M.black, accent: gold }, 0, 0, 0, 0, 0.62);
  P.pop();
  // the chain: from the mouth (about 0.3 m forward, 0.8 m above the pedestal top) forward and down to the deck, 18 links
  const mx = 0.0, my = 2.02, mz = 0.4, n = 18, len = 3.2, drop = my - 0.95;
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, q = [mx, my - drop * t - Math.sin(Math.PI * t) * 0.25, mz + len * t];
    if (prev) P.cyl(gold, prev, q, 0.02, 0.02, 4, false);
    prev = q;
  }
  P.pop();
}

/** tall green swan-neck street lamp (6.5 m): fluted post, scroll top and a hanging lantern, arm toward local +x */
export function swanLamp(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const iron = M.colGreen, dark = M.ironGreenDark, gold = M.gold;
  P.cyl(dark, [0, 0, 0], [0, 0.6, 0], 0.2, 0.12, 8, true);
  P.cyl(iron, [0, 0.6, 0], [0, 6.0, 0], 0.09, 0.055, 8, false);
  P.cyl(gold, [0, 1.3, 0], [0, 1.4, 0], 0.11, 0.11, 8, true);
  P.cyl(iron, [0, 5.9, 0], [0.35, 6.45, 0], 0.045, 0.035, 5, false);
  P.cyl(iron, [0.35, 6.45, 0], [1.0, 6.5, 0], 0.035, 0.03, 5, false);
  P.cyl(iron, [1.0, 6.5, 0], [1.3, 6.2, 0], 0.03, 0.025, 5, false);
  sph(P, iron, 0.55, 6.15, 0, 0.12, 0.12, 0.02, 6);
  P.cyl(M.lampGlass, [1.3, 5.7, 0], [1.3, 6.15, 0], 0.15, 0.2, 6, false); P.cyl(dark, [1.3, 6.15, 0], [1.3, 6.32, 0], 0.22, 0.03, 6, true); P.cyl(dark, [1.3, 5.64, 0], [1.3, 5.7, 0], 0.12, 0.15, 6, true);
  P.pop();
}
