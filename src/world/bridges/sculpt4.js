// bridges/sculpt4.js - the lamp standards of the big Neva bridges (docs/research/petro-bridges.md, photos refs/petro-bridges 01 09 12 15 16 23 26 40 46), drawn into the Parts collector `P` of kit.js
// in the CURRENT frame like sculpt.js / sculpt2.js (x, z on the deck plane, y up; `rot` turns a piece about the vertical; local x runs ALONG the railing unless said otherwise):
//   candelabraT   the Trinity Bridge candelabrum (16 on the bridge): flared plinth, urn with two scroll handles, stem, a node with two S-scroll arms parallel to the railing, three milk globes in ring
//                 forks under domed crown caps (two on the arms, one on top), ~4.4 m above its pedestal; pedestalT = the green steel pedestal box on a river pier / the granite pedestal of the abutments
//   lampT         the small one-globe Trinity lamp (24): slim column 5.3 m with two collars, a globe in a ribbed cage with a crown cap
//   contactPoleT  the tram contact-wire pole of the Trinity median (21): tapered shaft on a moulded base, 10.2 m, two horizontal arms on ogee braces with scroll rings, a spike finial (arms along local x)
//   lampCross     Palace / Birzhevoy standard: banded dark green pole with a ball + spike finial and cylindrical white lanterns on short brackets (1 or 2), 11.8 m
//   lampRing      Sampsonievsky column: fluted dark green cast column with a horizontal ring of hanging globes and a pointed finial, ~9.5 m
//   lampCobra     Tuchkov / Zhdanovka: plain light grey conical pole with one flat LED head; poleWire = the plain grey contact-wire pole (pairs along the Tuchkov tram tracks)
//   lampGlobes5   Zhdanovsky Bridge corner pole with a cluster of five white globes
// NO flags, no flag holders (user rule).
import * as THREE from 'three';

const sph = (P, mat, x, y, z, rx, ry = rx, rz = rx, seg = 8) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)), x, y, z, 0, 0, 0, rx, ry, rz);
const dome = (P, mat, x, y, z, r, h, seg = 8) => P.geo(mat, new THREE.SphereGeometry(1, seg, 3, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, 0, 0, 0, r, h, r);
/** torus in a vertical plane: axis along local x (ax = 'x') or z (ax = 'z'); ax = 'y' lies flat */
const torus = (P, mat, x, y, z, R, r, ax = 'z', seg = 12, arc = Math.PI * 2) => P.geo(mat, new THREE.TorusGeometry(R, r, 5, seg, arc), x, y, z, ax === 'y' ? Math.PI / 2 : 0, ax === 'x' ? Math.PI / 2 : 0, 0);

/** one Trinity lantern: ring fork, milk globe, domed cap with a small crown; (x, y, z) = the foot of the fork */
function lanternT(P, M, br, x, y, z) {
  P.cyl(br, [x, y, z], [x, y + 0.12, z], 0.07, 0.11, 6, false);
  torus(P, br, x, y + 0.38, z, 0.25, 0.022, 'x', 12);                                    // the fork ring (in the plane across the railing)
  sph(P, M.lampGlass, x, y + 0.38, z, 0.21, 0.21, 0.21, 10);
  dome(P, br, x, y + 0.56, z, 0.2, 0.13, 8);
  P.cyl(br, [x, y + 0.68, z], [x, y + 0.78, z], 0.05, 0.09, 6, true);                    // crown
  P.cyl(br, [x, y + 0.78, z], [x, y + 0.9, z], 0.03, 0.005, 5, false);
}

/** the pedestal under a Trinity candelabrum: kind 'steel' (green panelled box 2.7 x 1.3 x 1.4 on a river pier) or 'granite' (1.9 x 1.9 x 1.7 block with a cornice) ; returns its height */
export function pedestalT(P, M, x, y, z, rot = 0, kind = 'steel') {
  P.push(x, y, z, rot);
  let h;
  if (kind === 'steel') {
    const m = M.sageT, d = M.steelTroitsky; h = 1.4;
    P.box(m, -1.42, 1.42, 0, 0.16, -0.72, 0.72, 'b', 1);
    P.box(m, -1.35, 1.35, 0.16, h - 0.14, -0.65, 0.65, 'bt', 1);
    P.box(m, -1.44, 1.44, h - 0.14, h, -0.74, 0.74, '', 1);
    for (const sg of [-1, 1]) {                                                           // recessed panels on the long faces, one on each end
      for (const cx of [-0.68, 0.68]) P.box(d, cx - 0.5, cx + 0.5, 0.34, h - 0.32, Math.min(sg * 0.65, sg * 0.67), Math.max(sg * 0.65, sg * 0.67), 'b', 1);
      P.box(d, Math.min(sg * 1.35, sg * 1.37), Math.max(sg * 1.35, sg * 1.37), 0.34, h - 0.32, -0.45, 0.45, 'b', 1);
    }
  } else {
    const g = M.granitePeach || M.pierPink; h = 1.7;
    P.box(g, -1.05, 1.05, 0, 0.3, -1.05, 1.05, 'b', 1.6);
    P.box(g, -0.95, 0.95, 0.3, h - 0.22, -0.95, 0.95, 'bt', 1.6);
    P.box(M.coping, -1.06, 1.06, h - 0.22, h, -1.06, 1.06, '', 1.2);
  }
  P.pop();
  return h;
}

/** Trinity candelabrum standing on (x, y, z) = the top of its pedestal; arms along local x */
export function candelabraT(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const br = M.sageT;
  P.push(0, 0, 0, Math.PI / 4); P.cyl(br, [0, 0, 0], [0, 0.16, 0], 0.62, 0.56, 4, true); P.cyl(br, [0, 0.16, 0], [0, 0.62, 0], 0.5, 0.24, 4, false); P.pop();   // flared plinth
  for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) sph(P, br, dx * 0.27, 0.3, dz * 0.27, 0.07, 0.11, 0.07, 5);                                       // corner garlands
  P.cyl(br, [0, 0.62, 0], [0, 0.7, 0], 0.2, 0.2, 8, true);
  sph(P, br, 0, 0.94, 0, 0.27, 0.25, 0.27, 9);                                                                                                                   // the urn
  for (const sg of [-1, 1]) torus(P, br, sg * 0.31, 0.98, 0, 0.13, 0.03, 'z', 10);                                                                               // its two scroll handles
  P.cyl(br, [0, 1.16, 0], [0, 1.26, 0], 0.13, 0.19, 8, true);
  P.cyl(br, [0, 1.26, 0], [0, 2.5, 0], 0.1, 0.075, 8, false);
  for (const yy of [1.5, 2.0]) P.cyl(br, [0, yy, 0], [0, yy + 0.07, 0], 0.13, 0.13, 8, true);
  sph(P, br, 0, 2.52, 0, 0.16, 0.14, 0.16, 8);                                                                                                                   // the node
  for (const sg of [-1, 1]) {                                                                                                                                    // S-scroll arms parallel to the railing
    P.cyl(br, [sg * 0.08, 2.5, 0], [sg * 0.42, 2.74, 0], 0.045, 0.04, 6, false);
    P.cyl(br, [sg * 0.42, 2.74, 0], [sg * 0.72, 2.7, 0], 0.04, 0.035, 6, false);
    torus(P, br, sg * 0.36, 2.5, 0, 0.14, 0.026, 'z', 10);                                                                                                       // the scroll under the arm
    torus(P, br, sg * 0.6, 2.86, 0, 0.09, 0.02, 'z', 8);
    P.box(br, sg * 0.72 - 0.08, sg * 0.72 + 0.08, 2.62, 2.78, -0.08, 0.08, '', 1);                                                                               // the end block with its drop finial
    P.cyl(br, [sg * 0.72, 2.62, 0], [sg * 0.72, 2.42, 0], 0.05, 0.005, 5, false);
    lanternT(P, M, br, sg * 0.72, 2.78, 0);
  }
  P.cyl(br, [0, 2.6, 0], [0, 3.72, 0], 0.07, 0.055, 8, false);
  P.cyl(br, [0, 3.2, 0], [0, 3.26, 0], 0.1, 0.1, 8, true);
  P.cyl(br, [0, 3.72, 0], [0, 3.86, 0], 0.07, 0.15, 8, true);                                                                                                    // the small capital
  lanternT(P, M, br, 0, 3.86, 0);
  P.pop();
}

/** the small one-globe Trinity lamp, 5.3 m: column with two collars, a globe in a ribbed cage under a crown cap */
export function lampT(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const br = M.sageT;
  P.cyl(br, [0, 0, 0], [0, 0.22, 0], 0.2, 0.17, 8, true);
  P.cyl(br, [0, 0.22, 0], [0, 0.9, 0], 0.13, 0.085, 8, false);
  P.cyl(br, [0, 0.9, 0], [0, 4.5, 0], 0.075, 0.05, 8, false);
  for (const yy of [0.9, 2.6]) P.cyl(br, [0, yy, 0], [0, yy + 0.08, 0], 0.11, 0.11, 8, true);
  P.cyl(br, [0, 4.5, 0], [0, 4.62, 0], 0.06, 0.13, 8, true);
  sph(P, M.lampGlass, 0, 4.86, 0, 0.22, 0.22, 0.22, 10);
  for (let k = 0; k < 4; k++) { P.push(0, 4.86, 0, k * Math.PI / 4); torus(P, br, 0, 0, 0, 0.235, 0.012, 'z', 12); P.pop(); }                                       // the ribbed cage
  dome(P, br, 0, 5.04, 0, 0.19, 0.12, 8);
  P.cyl(br, [0, 5.15, 0], [0, 5.3, 0], 0.07, 0.01, 6, false);
  P.pop();
}

/** tram contact-wire pole of the Trinity median, 10.2 m; the two arms run along local x */
export function contactPoleT(P, M, x, y, z, rot = 0, arm = 3.4) {
  P.push(x, y, z, rot);
  const m = M.sageT;
  P.cyl(m, [0, 0, 0], [0, 0.25, 0], 0.3, 0.26, 8, true);
  P.cyl(m, [0, 0.25, 0], [0, 1.2, 0], 0.22, 0.15, 8, false);
  P.cyl(m, [0, 1.2, 0], [0, 1.3, 0], 0.19, 0.19, 8, true);
  P.cyl(m, [0, 1.3, 0], [0, 9.2, 0], 0.13, 0.07, 8, false);
  P.cyl(m, [0, 6.2, 0], [0, 6.36, 0], 0.15, 0.15, 8, true);
  for (const sg of [-1, 1]) {
    P.cyl(m, [0, 6.3, 0], [sg * arm, 6.3, 0], 0.04, 0.03, 5, false);                                                                                               // the arm
    P.cyl(m, [0, 5.2, 0], [sg * arm * 0.62, 6.25, 0], 0.03, 0.025, 5, false);                                                                                      // the ogee brace
    torus(P, m, sg * 0.42, 5.95, 0, 0.2, 0.022, 'z', 10); torus(P, m, sg * arm * 0.5, 6.12, 0, 0.11, 0.018, 'z', 8);                                               // scroll rings in the brace
    torus(P, m, sg * arm, 6.2, 0, 0.1, 0.02, 'z', 8, Math.PI);                                                                                                     // hooked arm end
  }
  P.cyl(m, [0, 9.2, 0], [0, 9.32, 0], 0.11, 0.11, 6, true);
  P.cyl(m, [0, 9.32, 0], [0, 10.2, 0], 0.05, 0.008, 5, false);                                                                                                     // the spike finial
  P.pop();
}

/** Palace / Birzhevoy lamp standard: banded pole with a ball + spike finial, `n` cylindrical lanterns on short brackets across the pole (along local z), h metres */
export function lampCross(P, M, x, y, z, rot = 0, o = {}) {
  const h = o.h || 11.8, n = o.n || 2, m = o.mat || M.fasIron, yl = h - 2.4;
  P.push(x, y, z, rot);
  P.cyl(m, [0, 0, 0], [0, 0.9, 0], 0.3, 0.22, 8, true);
  P.cyl(m, [0, 0.9, 0], [0, 1.0, 0], 0.25, 0.25, 8, true);
  P.cyl(m, [0, 1.0, 0], [0, h - 0.5, 0], 0.16, 0.085, 8, false);
  for (const yy of [2.6, 4.6, yl - 0.6]) P.cyl(m, [0, yy, 0], [0, yy + 0.1, 0], 0.18, 0.18, 8, true);                                                              // bands
  sph(P, m, 0, h - 0.42, 0, 0.14, 0.14, 0.14, 7); P.cyl(m, [0, h - 0.3, 0], [0, h, 0], 0.04, 0.006, 5, false);
  for (const s2 of n === 1 ? [1] : [-1, 1]) {
    P.cyl(m, [0, yl + 0.55, 0], [0, yl + 0.62, s2 * 0.62], 0.04, 0.035, 5, false);
    P.cyl(m, [0, yl + 0.1, 0], [0, yl + 0.55, s2 * 0.5], 0.025, 0.02, 4, false);
    P.cyl(M.cap, [0, yl + 0.5, s2 * 0.62], [0, yl + 0.72, s2 * 0.62], 0.2, 0.04, 8, true);
    P.cyl(M.lampGlass, [0, yl - 0.05, s2 * 0.62], [0, yl + 0.5, s2 * 0.62], 0.16, 0.17, 8, false);
    P.cyl(M.cap, [0, yl - 0.14, s2 * 0.62], [0, yl - 0.05, s2 * 0.62], 0.1, 0.17, 8, true);
  }
  P.pop();
}

/** Sampsonievsky lamp column: fluted cast column with a horizontal ring of hanging globes and a pointed finial */
export function lampRing(P, M, x, y, z, rot = 0, o = {}) {
  const h = o.h || 9.5, m = o.mat || M.fasIron, n = o.n || 5, R = 0.8;
  P.push(x, y, z, rot);
  P.cyl(m, [0, 0, 0], [0, 0.5, 0], 0.34, 0.3, 8, true);
  P.cyl(m, [0, 0.5, 0], [0, 1.5, 0], 0.26, 0.19, 8, false);
  P.cyl(m, [0, 1.5, 0], [0, 1.62, 0], 0.24, 0.24, 8, true);
  P.cyl(m, [0, 1.62, 0], [0, h - 1.5, 0], 0.17, 0.09, 10, false);
  P.cyl(m, [0, h - 1.5, 0], [0, h - 1.38, 0], 0.13, 0.13, 8, true);
  torus(P, m, 0, h - 1.3, 0, R, 0.035, 'y', 16);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; P.cyl(m, [0, h - 1.2, 0], [Math.cos(a) * R, h - 1.3, Math.sin(a) * R], 0.025, 0.02, 4, false); }
  for (let k = 0; k < n; k++) { const a = (k + 0.5) * Math.PI * 2 / n, gx = Math.cos(a) * R, gz = Math.sin(a) * R; P.cyl(m, [gx, h - 1.3, gz], [gx, h - 1.5, gz], 0.02, 0.05, 4, false); sph(P, M.lampGlass, gx, h - 1.72, gz, 0.2, 0.22, 0.2, 8); }
  P.cyl(m, [0, h - 1.38, 0], [0, h - 0.6, 0], 0.08, 0.05, 6, false);
  sph(P, m, 0, h - 0.55, 0, 0.1, 0.1, 0.1, 6); P.cyl(m, [0, h - 0.5, 0], [0, h, 0], 0.045, 0.006, 5, false);
  P.pop();
}

/** plain conical street pole with one flat LED head on a short arm that points along local z (toward the roadway) */
export function lampCobra(P, M, x, y, z, rot = 0, o = {}) {
  const h = o.h || 10, m = o.mat || M.steel, arm = o.arm || 1.6;
  P.push(x, y, z, rot);
  P.cyl(m, [0, 0, 0], [0, 0.35, 0], 0.2, 0.17, 8, true);
  P.cyl(m, [0, 0.35, 0], [0, h, 0], 0.11, 0.055, 8, false);
  P.cyl(m, [0, h - 0.05, 0], [0, h + 0.1, arm], 0.04, 0.035, 5, false);
  P.box(m, -0.14, 0.14, h + 0.04, h + 0.14, arm - 0.1, arm + 0.6, '', 1);
  P.box(M.lampGlass, -0.11, 0.11, h + 0.02, h + 0.04, arm, arm + 0.52, 't', 1);
  P.pop();
}

/** plain grey contact-wire pole with a tubular arm along local x (both sides when two) */
export function poleWire(P, M, x, y, z, rot = 0, o = {}) {
  const h = o.h || 9, m = o.mat || M.steel, arm = o.arm || 3.2;
  P.push(x, y, z, rot);
  P.cyl(m, [0, 0, 0], [0, 0.4, 0], 0.21, 0.18, 8, true);
  P.cyl(m, [0, 0.4, 0], [0, h, 0], 0.13, 0.08, 8, true);
  for (const sg of o.two ? [-1, 1] : [1]) { P.cyl(m, [0, h - 1.6, 0], [sg * arm, h - 1.5, 0], 0.035, 0.03, 5, false); P.cyl(m, [0, h - 0.3, 0], [sg * arm * 0.9, h - 1.48, 0], 0.012, 0.012, 4, false); }
  P.pop();
}

/** Zhdanovsky Bridge corner pole: a slim grey pole with a cluster of five white globes */
export function lampGlobes5(P, M, x, y, z, rot = 0, o = {}) {
  const h = o.h || 6.6, m = o.mat || M.steel;
  P.push(x, y, z, rot);
  P.cyl(m, [0, 0, 0], [0, 0.3, 0], 0.17, 0.14, 8, true);
  P.cyl(m, [0, 0.3, 0], [0, h, 0], 0.085, 0.055, 8, false);
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, gx = Math.cos(a) * 0.5, gz = Math.sin(a) * 0.5; P.cyl(m, [0, h - 0.5, 0], [gx, h - 0.25, gz], 0.025, 0.02, 4, false); sph(P, M.lampGlass, gx, h, gz, 0.2, 0.2, 0.2, 8); }
  sph(P, M.lampGlass, 0, h + 0.3, 0, 0.22, 0.22, 0.22, 8);
  P.pop();
}
