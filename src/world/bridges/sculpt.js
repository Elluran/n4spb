// bridges/sculpt.js - small hand-built pieces of the bridges, all drawn into the Parts collector `P` in the CURRENT frame (x, z on the ground plane, y up):
//   lampGreen   the Green Bridge lamp standard (four splayed dark-green rods on a scrolled base, gilded collar + acanthus bud, crook, hexagonal lantern with a pointed gilded cap), photos refs/canals 11 15 18
//   lampBlack   a slender black four-sided lantern on a fluted pole (Italyansky, Blue replica standards)
//   obelisk     a rough-hewn granite obelisk with a gilded ball and a black wall lantern (Red Bridge, photos 43 45 46)
//   tripod      the black tripod name pole with a dark-blue plate (Pevchesky, Blue, Winter bridges, photos 27 36)
//   pylon       a granite block with a stepped cap (Green, Blue, Winter bridges)
//   tumba       a granite pedestal with a dark pyramid cap (Novo-Konyushenny, Italyansky)
//   griffin     the winged lion of the Bankovsky Bridge (grey-green body, gilded wings, globe lamp on a gilded arm, photos 29 30 31 32 34): figure kit, ~5 k triangles
import * as THREE from 'three';
import { griffin as kitGriffin, cached } from '../lib/figures.js';

/** the winged lion of the Bankovsky Bridge from the figure kit (detail 0.5, wings swept up and back), built once */
const griffinFig = () => cached('lmBr-griffin', () => kitGriffin({ detail: 0.5, wings: 'half' }));

const sph = (P, mat, x, y, z, rx, ry = rx, rz = rx, seg = 10) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(5, seg - 2)), x, y, z, 0, 0, 0, rx, ry, rz);

/** hexagonal lantern hanging at (x, y .. y + h) */
function lantern(P, M, x, y, z, r, h, frame, cap) {
  P.cyl(M.lampGlass, [x, y, z], [x, y + h, z], r * 0.92, r, 6, false);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P.cyl(frame, [x + Math.cos(a) * r, y, z + Math.sin(a) * r], [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r], 0.012, 0.012, 4, false); }
  P.cyl(frame, [x, y - 0.04, z], [x, y, z], r * 0.7, r * 0.95, 6, true);
  P.cyl(cap, [x, y + h, z], [x, y + h + h * 0.55, z], r * 1.15, 0.01, 6, true);
  P.cyl(cap, [x, y + h + h * 0.55, z], [x, y + h + h * 0.75, z], 0.025, 0.012, 4, true);
}

export function lampGreen(P, M, x, y, z) {
  const iron = M.ironGreen, dark = M.ironGreenDark, gold = M.gold;
  P.cyl(dark, [x, y, z], [x, y + 0.14, z], 0.3, 0.26, 8, true);                                    // base plate
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.cyl(iron, [x + Math.cos(a) * 0.26, y + 0.1, z + Math.sin(a) * 0.26], [x + Math.cos(a) * 0.04, y + 1.05, z + Math.sin(a) * 0.04], 0.028, 0.02, 5, false); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; sph(P, iron, x + Math.cos(a) * 0.22, y + 0.34, z + Math.sin(a) * 0.22, 0.06, 0.06, 0.06, 6); }
  P.cyl(iron, [x, y + 1.0, z], [x, y + 5.2, z], 0.065, 0.045, 8, false);                          // pole
  P.cyl(gold, [x, y + 1.15, z], [x, y + 1.3, z], 0.095, 0.095, 8, true);                           // gilded collar
  sph(P, gold, x, y + 2.25, z, 0.12, 0.2, 0.12, 8);                                                // gilded acanthus bud
  P.cyl(gold, [x, y + 2.0, z], [x, y + 2.12, z], 0.075, 0.1, 8, true);
  P.cyl(dark, [x, y + 5.1, z], [x, y + 5.28, z], 0.09, 0.07, 6, true);
  P.cyl(iron, [x, y + 5.28, z], [x + 0.22, y + 5.55, z], 0.026, 0.022, 5, false);                  // crook
  P.cyl(iron, [x + 0.22, y + 5.55, z], [x + 0.5, y + 5.42, z], 0.022, 0.02, 5, false);
  P.cyl(gold, [x + 0.5, y + 5.42, z], [x + 0.5, y + 5.34, z], 0.04, 0.03, 5, true);
  lantern(P, M, x + 0.5, y + 4.84, z, 0.2, 0.5, dark, gold);
}

export function lampBlack(P, M, x, y, z, h = 3.6) {
  P.cyl(M.iron, [x, y, z], [x, y + 0.5, z], 0.14, 0.09, 8, true);
  P.cyl(M.iron, [x, y + 0.5, z], [x, y + h, z], 0.07, 0.05, 8, false);
  P.cyl(M.iron, [x, y + h, z], [x, y + h + 0.1, z], 0.1, 0.1, 6, true);
  P.cyl(M.lampGlass, [x, y + h + 0.1, z], [x, y + h + 0.62, z], 0.16, 0.2, 4, false);
  P.cyl(M.iron, [x, y + h + 0.62, z], [x, y + h + 0.92, z], 0.24, 0.02, 4, true);
}

export function pylon(P, mat, capMat, u0, u1, y0, y1, v0, v1, o = {}) {
  const e = o.cap ?? 0.12;
  P.box(mat, u0, u1, y0, y1 - 0.34, v0, v1, 'b', o.uvs ?? 2.2);                                 // QA: the shaft ends under the cap (its top face was coplanar with the cap top: z-fight on every pylon)
  P.box(capMat, u0 - e, u1 + e, y1 - 0.18, y1, v0 - e, v1 + e, 'b', 1.2);
  P.box(capMat, u0 - e * 0.5, u1 + e * 0.5, y1 - 0.34, y1 - 0.18, v0 - e * 0.5, v1 + e * 0.5, 'b', 1.2);
}

export function tumba(P, M, x, y, z, rot = 0, w = 0.8, h = 1.15, capH = 0.3) {
  P.push(x, y, z, rot);
  P.box(M.pylon, -w / 2, w / 2, 0, h, -w / 2, w / 2, 'b', 1.1);
  P.box(M.coping, -w / 2 - 0.07, w / 2 + 0.07, h - 0.1, h, -w / 2 - 0.07, w / 2 + 0.07, 'b', 1);
  P.push(0, 0, 0, Math.PI / 4); P.cyl(M.cap, [0, h, 0], [0, h + capH, 0], w * 0.72, 0.1, 4, true); P.pop();
  P.pop();
}

export function obelisk(P, M, x, y, z, rot = 0, h = 4.6, lamp = true) {
  P.push(x, y, z, rot + Math.PI / 4);
  P.cyl(M.pylonRough, [0, 0, 0], [0, h, 0], 0.64, 0.32, 4, true);                                  // 0.9 m square at the foot, 0.45 m at the top (radius to the corner = side / sqrt 2)
  P.cyl(M.pylonRough, [0, 0, 0], [0, 0.5, 0], 0.78, 0.66, 4, true);                                // plinth
  P.pop();
  sph(P, M.gold, x, y + h + 0.17, z, 0.2, 0.2, 0.2, 10);
  P.cyl(M.gold, [x, y + h, z], [x, y + h + 0.06, z], 0.17, 0.12, 8, true);
  if (!lamp) return;
  // black wall lantern on a bracket on the street-side face (rot = outward normal)
  const nx = Math.sin(rot), nz = Math.cos(rot);
  P.cyl(M.iron, [x + nx * 0.2, y + h - 2.2, z + nz * 0.2], [x + nx * 0.62, y + h - 2.2, z + nz * 0.62], 0.025, 0.025, 4, false);
  P.push(x + nx * 0.7, y + h - 2.15, z + nz * 0.7, rot + Math.PI / 4);
  P.cyl(M.lampGlass, [0, -0.3, 0], [0, 0.25, 0], 0.22, 0.22, 4, false); P.cyl(M.iron, [0, 0.25, 0], [0, 0.5, 0], 0.3, 0.02, 4, true); P.cyl(M.iron, [0, -0.34, 0], [0, -0.3, 0], 0.26, 0.26, 4, true);
  P.pop();
}

export function tripod(P, M, x, y, z, text, rot = 0) {
  P.push(x, y, z, rot);
  P.cyl(M.iron, [0, 0, 0], [0, 3.1, 0], 0.045, 0.04, 6, false);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; P.cyl(M.iron, [Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55], [0, 0.62, 0], 0.022, 0.02, 4, false); sph(P, M.iron, Math.cos(a) * 0.55, 0.03, Math.sin(a) * 0.55, 0.05, 0.03, 0.05, 5); }
  P.cyl(M.iron, [0, 0.6, 0], [0, 0.66, 0], 0.07, 0.07, 6, true);
  P.cyl(M.iron, [0, 3.1, 0], [0, 3.42, 0], 0.03, 0.005, 5, true);                                 // spear tip
  if (text) {
    const pm = M.namePlate(text);
    for (const sg of [1, -1]) P.quad(pm, [-sg * 0.42, 2.45, sg * 0.07], [sg * 0.42, 2.45, sg * 0.07], [sg * 0.42, 2.85, sg * 0.07], [-sg * 0.42, 2.85, sg * 0.07], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    P.box(M.iron, -0.44, 0.44, 2.43, 2.87, -0.055, 0.055, '', 1);
  }
  P.pop();
}

const darkMat = (M) => M.darkEye || M.iron || M.black || M.bronzeGrey;
export function griffin(P, M, x, y, z, rot = 0, o = {}) {
  const body = M.bronzeGrey, gold = M.gold;
  P.push(x, y, z, rot);
  // pedestal: grey-green block with a chamfered plinth and a cornice
  const pw = 0.62, pd = 0.54, ph = o.ph ?? 1.0;
  P.box(M.pedestalGrey, -pw - 0.1, pw + 0.1, 0, 0.18, -pd - 0.1, pd + 0.1, 'b', 1.2);
  P.box(M.pedestalGrey, -pw, pw, 0.18, ph - 0.14, -pd, pd, '', 1.2);
  P.box(M.pedestalGrey, -pw - 0.07, pw + 0.07, ph - 0.14, ph, -pd - 0.07, pd + 0.07, 'b', 1.2);
  P.push(0, ph, 0, 0);
  // the winged lion (shared figure kit: lofted seated lion with a sculpted head, a goatee, gilded feathered wings swept up and back; ~5 k triangles)
  griffinFig().place(P, { main: body, dark: darkMat(M), accent: gold }, 0, 0, 0, 0, 0.92);
  // crown ring on the head, gilded S arm and the opal globe (head of the kit lion at y 1.64, z 0.19 at scale 0.92)
  P.cyl(gold, [0, 1.82, 0.17], [0, 1.88, 0.17], 0.13, 0.11, 8, true);
  P.cyl(gold, [0, 1.88, 0.17], [0.0, 2.14, 0.17], 0.022, 0.02, 5, false);
  P.cyl(gold, [0, 2.14, 0.17], [0.1, 2.32, 0.17], 0.02, 0.02, 5, false); P.cyl(gold, [0.1, 2.32, 0.17], [0.0, 2.4, 0.17], 0.02, 0.02, 5, false);
  P.cyl(gold, [0, 2.4, 0.17], [0, 2.46, 0.17], 0.1, 0.07, 8, true);
  sph(P, M.lampGlass, 0, 2.64, 0.17, 0.19, 0.19, 0.19, 10);
  P.cyl(gold, [0, 2.81, 0.17], [0, 2.86, 0.17], 0.1, 0.05, 8, true);
  P.pop(); P.pop();
}
