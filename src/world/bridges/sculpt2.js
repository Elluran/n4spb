// bridges/sculpt2.js - the lamp standards and ornaments of the Mars Field / Summer Garden bridges (docs/research/mars-bridges-canals.md sections 4 / 7.1, photos refs/mars-bridges 37 43 55 56 62 66 72 73 79 86 90),
// drawn into the Parts collector `P` of kit.js in the CURRENT frame like sculpt.js (x, z on the ground plane, y up; `rot` turns a piece about the vertical):
//   eagle        a plain gilded double-headed eagle silhouette (state emblem, NOT a flag; no star variant) from three extruded outlines
//   torchere     the lamp standard of spear bundles: 6 green rods with gilt spear heads and rope collars, an oval shield with a Gorgon mask over crossed swords, a gilded wreath (+ eagle) and a scroll
//                bracket with an octagonal gilt-domed lantern (Panteleymonovsky, 1st / 2nd Sadovy, 2nd Engineer)
//   lampLeaf     the Bolshoy Konyushenny standard: leaf-scroll cast base, tapering fluted column with gold collars, gilt scallop cup, hexagonal lantern with a pointed gilded cap
//   lampGlobe    the Triple Bridge standard: tripod base with ram heads, fluted shaft with gold collars, a big opal globe under a gilded cup
//   candelabra   the Troitsky 3-globe bronze candelabrum on a granite-faced pedestal with a bronze plate; lamp1 the small one-globe lamp; contactPole the tram wire pole with its Art Nouveau crosshead;
//   obeliskTroitsky  polished red-brown shaft on a pink granite pedestal with a plate, ship rostra (two bracket arms with three globes each) and the eagle
import * as THREE from 'three';

const sph = (P, mat, x, y, z, rx, ry = rx, rz = rx, seg = 8) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2)), x, y, z, 0, 0, 0, rx, ry, rz);
const torus = (P, mat, x, y, z, R, r, rotY = 0, seg = 14) => P.geo(mat, new THREE.TorusGeometry(R, r, 5, seg), x, y, z, 0, rotY, 0);

const _shapes = {};
function eagleGeos() {
  if (_shapes.eagle) return _shapes.eagle;
  const ex = (pts) => { const sh = new THREE.Shape(pts.map((q) => new THREE.Vector2(q[0], q[1]))); const g = new THREE.ExtrudeGeometry(sh, { depth: 0.035, bevelEnabled: false }); g.translate(0, 0, -0.0175); return g; };
  const wing = [[0.05, 0.14], [0.17, 0.26], [0.33, 0.38], [0.3, 0.27], [0.4, 0.3], [0.33, 0.19], [0.41, 0.16], [0.3, 0.09], [0.32, 0.01], [0.19, 0.06], [0.08, 0.0]];
  const mir = (a) => a.map(([x, y]) => [-x, y]).reverse();
  const body = [[-0.07, -0.02], [0.07, -0.02], [0.095, 0.17], [0.05, 0.27], [-0.05, 0.27], [-0.095, 0.17]];
  const tail = [[-0.06, -0.02], [-0.1, -0.12], [-0.03, -0.09], [0, -0.14], [0.03, -0.09], [0.1, -0.12], [0.06, -0.02]];
  const heads = (s) => [[0.02 * s, 0.25], [0.11 * s, 0.36], [0.1 * s, 0.4], [0.16 * s, 0.4], [0.17 * s, 0.43], [0.105 * s, 0.445], [0.07 * s, 0.4], [0.0, 0.3]];
  const hl = heads(-1), hr = heads(1);
  return (_shapes.eagle = [ex(wing), ex(mir(wing)), ex(body), ex(tail), ex(s2ccw(hr)), ex(s2ccw(hl)), ]);
}
function s2ccw(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; } return a < 0 ? pts.slice().reverse() : pts; }

/** a gilded double-headed eagle, `s` = scale (1 = 0.8 m wing span, ~0.6 m high), facing +z of the current frame */
export function eagle(P, M, x, y, z, rot = 0, s = 1) {
  P.push(x, y, z, rot);
  for (const g of eagleGeos()) P.geo(M.gold, g, 0, 0, 0, 0, 0, 0, s, s, s);
  sph(P, M.gold, 0, 0.47 * s, 0, 0.05 * s, 0.025 * s, 0.025 * s, 6);                  // crown
  P.pop();
}

/** hexagonal / octagonal lantern with a gilt dome hanging at (x, y .. y + h) */
function lantern8(P, M, x, y, z, r, h, o = {}) {
  const seg = o.seg ?? 8, fr = o.frame || M.ironGreenDark;
  P.cyl(M.lampGlass, [x, y, z], [x, y + h, z], r * 0.78, r, seg, false);
  for (let i = 0; i < seg; i++) { const a = i * Math.PI * 2 / seg; P.cyl(fr, [x + Math.cos(a) * r * 0.78, y, z + Math.sin(a) * r * 0.78], [x + Math.cos(a) * r, y + h, z + Math.sin(a) * r], 0.012, 0.012, 4, false); }
  P.cyl(fr, [x, y - 0.05, z], [x, y, z], r * 0.5, r * 0.8, seg, true);
  P.cyl(M.gold, [x, y + h, z], [x, y + h + h * 0.38, z], r * 1.12, r * 0.08, seg, true);
  sph(P, M.gold, x, y + h + h * 0.44, z, 0.03, 0.04, 0.03, 5);
}

/** the spear-bundle standard.  o: { h: spear height (2.6), shield: bool, wreath: bool, eagle: bool, arm: +1 / -1 side of the bracket lantern, face: rot of the shield normal } */
export function torchere(P, M, x, y, z, rot = 0, o = {}) {
  const H = o.h ?? 2.6, rod = M.ironGreenDark, green = M.ironGreen, gold = M.gold, arm = o.arm ?? 1;
  P.push(x, y, z, rot);
  P.box(rod, -0.4, 0.4, 0, 0.07, -0.4, 0.4, 'b', 1);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3, rx = Math.cos(a) * 0.2, rz = Math.sin(a) * 0.2;
    P.cyl(rod, [rx, 0.07, rz], [rx, H, rz], 0.032, 0.03, 5, false);
    P.cyl(gold, [rx, H, rz], [rx, H + 0.2, rz], 0.045, 0.002, 5, true);                                    // gilt spear head
    P.cyl(gold, [rx, H - 0.1, rz], [rx, H, rz], 0.04, 0.04, 5, false);
    P.cyl(gold, [rx, 0.16, rz], [rx, 0.3, rz], 0.045, 0.045, 5, true);                                      // rope collar at the foot
  }
  P.cyl(rod, [0, 0.07, 0], [0, H + 0.7, 0], 0.045, 0.035, 6, false);
  P.cyl(gold, [0, H - 0.2, 0], [0, H - 0.06, 0], 0.27, 0.27, 8, false);                                       // upper rope ring
  sph(P, gold, 0, 0.18, 0, 0.17, 0.12, 0.17, 7);                                                              // gilded boss at the foot
  if (o.shield !== false) {
    const sy = H * 0.52;
    for (const sg of [1, -1]) {
      P.push(0, sy, sg * 0.24, 0);
      sph(P, green, 0, 0, 0, 0.26, 0.34, 0.035, 9);
      torus(P, gold, 0, 0, 0.03 * sg, 0.29, 0.025, 0, 12); P.geo(gold, new THREE.TorusGeometry(0.28, 0.025, 4, 14), 0, 0, 0.03 * sg, 0, 0, 0, 0.95, 1.25, 1);
      sph(P, gold, 0, 0.02, 0.04 * sg, 0.12, 0.14, 0.035, 7);                                                 // the Gorgon mask
      for (let k = 0; k < 6; k++) { const a = k * 1.047; sph(P, gold, Math.cos(a) * 0.17, Math.sin(a) * 0.2, 0.04 * sg, 0.025, 0.025, 0.02, 4); }
      P.pop();
    }
    // crossed swords behind the shield (hilts and blades show beyond its edge)
    for (const k of [-1, 1]) { P.cyl(gold, [-0.34 * k, sy - 0.44, 0], [0.34 * k, sy + 0.44, 0], 0.02, 0.016, 4, false); sph(P, gold, 0.36 * k, sy + 0.47, 0, 0.04, 0.04, 0.04, 5); sph(P, gold, -0.36 * k, sy - 0.47, 0, 0.025, 0.025, 0.025, 4); }
  }
  if (o.wreath !== false) { const wy = H + 0.3; P.geo(gold, new THREE.TorusGeometry(0.2, 0.035, 5, 14), 0, wy, 0, 0, 0, 0, 1, 1, 1); P.geo(gold, new THREE.TorusGeometry(0.2, 0.035, 5, 14), 0, wy, 0, 0, Math.PI / 2, 0, 1, 1, 1); }
  if (o.eagle) eagle(P, M, 0, H + 0.45, 0, o.face ?? 0, 0.62);
  // scroll bracket + octagonal lantern
  const by = H - 0.25;
  P.cyl(rod, [0, by, 0], [arm * 0.55, by + 0.16, 0], 0.022, 0.018, 5, false);
  P.cyl(rod, [arm * 0.55, by + 0.16, 0], [arm * 0.75, by + 0.05, 0], 0.018, 0.016, 5, false);
  sph(P, rod, arm * 0.4, by + 0.09, 0, 0.07, 0.07, 0.015, 7);
  lantern8(P, M, arm * 0.75, by - 0.55, 0, 0.17, 0.5, { frame: rod });
  P.pop();
}

/** the Bolshoy Konyushenny standard (~4.3 m), leaf-scroll base (green + gold), fluted tapering column, gilt scallop cup, hexagonal lantern */
export function lampLeaf(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const iron = M.ironGreenDark, gold = M.gold;
  P.cyl(iron, [0, 0, 0], [0, 0.28, 0], 0.3, 0.2, 8, true);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; sph(P, iron, Math.cos(a) * 0.19, 0.2, Math.sin(a) * 0.19, 0.08, 0.14, 0.05, 6); P.cyl(gold, [Math.cos(a) * 0.26, 0.1, Math.sin(a) * 0.26], [Math.cos(a) * 0.26, 0.12, Math.sin(a) * 0.26], 0.03, 0.03, 5, true); }
  P.cyl(iron, [0, 0.28, 0], [0, 3.1, 0], 0.12, 0.06, 10, false);
  for (const yy of [0.5, 1.4, 2.7]) P.cyl(gold, [0, yy, 0], [0, yy + 0.09, 0], 0.15 - yy * 0.02, 0.15 - yy * 0.02, 8, true);
  P.cyl(gold, [0, 3.05, 0], [0, 3.35, 0], 0.07, 0.25, 8, true);                                              // scallop cup
  P.cyl(M.lampGlass, [0, 3.38, 0], [0, 3.88, 0], 0.2, 0.17, 6, false);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P.cyl(iron, [Math.cos(a) * 0.2, 3.38, Math.sin(a) * 0.2], [Math.cos(a) * 0.17, 3.88, Math.sin(a) * 0.17], 0.012, 0.012, 4, false); }
  P.cyl(gold, [0, 3.88, 0], [0, 4.3, 0], 0.24, 0.01, 6, true);
  P.pop();
}

/** the Triple Bridge standard (~4.5 m): tripod of ram heads, fluted shaft with gold collars, opal globe under a gilded cup */
export function lampGlobe(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const iron = M.ironGreenDark, gold = M.gold;
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094 + 0.5, cx = Math.cos(a), cz = Math.sin(a);
    P.cyl(iron, [cx * 0.32, 0, cz * 0.32], [cx * 0.05, 0.8, cz * 0.05], 0.05, 0.035, 5, false);
    sph(P, iron, cx * 0.33, 0.55, cz * 0.33, 0.08, 0.1, 0.08, 6); sph(P, gold, cx * 0.35, 0.55, cz * 0.35, 0.03, 0.03, 0.03, 4);
    sph(P, gold, cx * 0.2, 0.2, cz * 0.2, 0.04, 0.04, 0.04, 4);
  }
  P.cyl(iron, [0, 0.0, 0], [0, 0.18, 0], 0.4, 0.22, 3, true);
  P.cyl(iron, [0, 0.7, 0], [0, 3.55, 0], 0.1, 0.055, 10, false);
  for (const yy of [0.95, 1.4, 3.2]) P.cyl(gold, [0, yy, 0], [0, yy + 0.08, 0], 0.115 - yy * 0.012, 0.115 - yy * 0.012, 8, true);
  P.cyl(gold, [0, 3.5, 0], [0, 3.8, 0], 0.05, 0.28, 10, true);
  sph(P, M.lampGlass, 0, 4.0, 0, 0.26, 0.26, 0.26, 10);
  P.cyl(gold, [0, 4.22, 0], [0, 4.3, 0], 0.17, 0.06, 8, true); sph(P, gold, 0, 4.36, 0, 0.05, 0.07, 0.05, 6);
  P.pop();
}

/** Troitsky 3-globe candelabrum: a pedestal (granite faced, bronze plate), a shaft with acanthus knops and three arms with opal globes in a crown cap (~5.5 m) */
export function candelabra(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const br = M.bronzeTroitsky, gold = M.gold;
  P.box(M.pierPink, -0.55, 0.55, 0, 0.14, -0.55, 0.55, 'b', 1.2);
  P.box(M.pierPink, -0.45, 0.45, 0.14, 1.1, -0.45, 0.45, '', 1.2);
  P.box(M.coping, -0.52, 0.52, 1.05, 1.18, -0.52, 0.52, 'b', 1);
  for (const sg of [1, -1]) P.box(br, -0.22, 0.22, 0.45, 0.85, Math.min(sg * 0.45, sg * 0.49), Math.max(sg * 0.45, sg * 0.49), 'b', 1);               // bronze plate
  P.cyl(br, [0, 1.18, 0], [0, 1.5, 0], 0.26, 0.15, 8, true);
  P.cyl(br, [0, 1.5, 0], [0, 4.3, 0], 0.12, 0.07, 8, false);
  sph(P, br, 0, 2.0, 0, 0.17, 0.2, 0.17, 7); sph(P, br, 0, 3.0, 0, 0.14, 0.17, 0.14, 7);
  for (const yy of [1.6, 2.5, 3.5]) P.cyl(br, [0, yy, 0], [0, yy + 0.08, 0], 0.16, 0.16, 8, true);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.094, cx = Math.cos(a), cz = Math.sin(a);
    P.cyl(br, [0, 4.0, 0], [cx * 0.5, 4.35, cz * 0.5], 0.032, 0.026, 5, false);
    sph(P, M.lampGlass, cx * 0.5, 4.62, cz * 0.5, 0.2, 0.2, 0.2, 9);
    P.cyl(br, [cx * 0.5, 4.38, cz * 0.5], [cx * 0.5, 4.46, cz * 0.5], 0.13, 0.1, 6, true);
    P.cyl(br, [cx * 0.5, 4.8, cz * 0.5], [cx * 0.5, 4.95, cz * 0.5], 0.17, 0.03, 6, true);
  }
  sph(P, M.lampGlass, 0, 4.9, 0, 0.21, 0.21, 0.21, 9);
  P.cyl(br, [0, 4.28, 0], [0, 4.4, 0], 0.15, 0.1, 6, true);
  P.cyl(br, [0, 5.08, 0], [0, 5.4, 0], 0.2, 0.02, 6, true); sph(P, gold, 0, 5.45, 0, 0.04, 0.05, 0.04, 5);
  P.pop();
}

/** small one-globe Troitsky lamp (3.8 m) */
export function lamp1(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const br = M.bronzeTroitsky;
  P.cyl(br, [0, 0, 0], [0, 0.5, 0], 0.2, 0.1, 8, true);
  P.cyl(br, [0, 0.5, 0], [0, 3.3, 0], 0.075, 0.045, 8, false);
  sph(P, br, 0, 1.5, 0, 0.1, 0.12, 0.1, 6);
  P.cyl(br, [0, 3.25, 0], [0, 3.4, 0], 0.13, 0.1, 8, true);
  sph(P, M.lampGlass, 0, 3.62, 0, 0.21, 0.21, 0.21, 9);
  P.cyl(br, [0, 3.84, 0], [0, 4.0, 0], 0.15, 0.02, 6, true);
  P.pop();
}

/** tram contact-wire pole: green-grey tapering pole 8 m with the Art Nouveau two-bracket crosshead along the road axis (the crosshead runs along local x) */
export function contactPole(P, M, x, y, z, rot = 0, arm = 2.6) {
  P.push(x, y, z, rot);
  const m = M.contactGrey;
  P.cyl(m, [0, 0, 0], [0, 0.4, 0], 0.17, 0.12, 8, true);
  P.cyl(m, [0, 0.4, 0], [0, 7.6, 0], 0.1, 0.055, 8, false);
  P.cyl(m, [0, 5.6, 0], [0, 5.74, 0], 0.13, 0.13, 8, true);
  for (const sg of [-1, 1]) { P.cyl(m, [0, 7.3, 0], [sg * arm, 7.6, 0], 0.03, 0.02, 5, false); P.cyl(m, [0, 7.0, 0], [sg * arm * 0.6, 7.4, 0], 0.02, 0.015, 5, false); }
  sph(P, m, 0, 7.75, 0, 0.07, 0.1, 0.07, 6);
  P.pop();
}

/** granite pedestal + polished red-brown obelisk with a plate, ship rostra (two arms with three globes each) and the gilded eagle (the Soviet star variant 1936-2001 is NOT drawn) */
export function obeliskTroitsky(P, M, x, y, z, rot = 0) {
  P.push(x, y, z, rot);
  const br = M.bronzeTroitsky;
  P.box(M.pierPink, -1.15, 1.15, 0, 0.35, -1.15, 1.15, 'b', 1.4);
  P.box(M.pierPink, -0.95, 0.95, 0.35, 3.0, -0.95, 0.95, '', 1.4);
  P.box(M.coping, -1.05, 1.05, 2.9, 3.1, -1.05, 1.05, 'b', 1.2);
  for (const sg of [1, -1]) { P.box(br, -0.7, 0.7, 0.8, 1.7, Math.min(sg * 0.95, sg * 1.0), Math.max(sg * 0.95, sg * 1.0), 'b', 1); P.box(br, -0.4, 0.4, 2.1, 2.55, Math.min(sg * 0.95, sg * 0.99), Math.max(sg * 0.95, sg * 0.99), 'b', 1); }
  P.push(0, 3.1, 0, Math.PI / 4);
  P.cyl(M.obeliskRed, [0, 0, 0], [0, 5.3, 0], 0.66, 0.34, 4, true);
  P.pop();
  P.cyl(M.coping, [0, 3.1, 0], [0, 3.3, 0], 0.95, 0.8, 4, true);
  for (const sg of [-1, 1]) {                                                                                  // rostra: a bracket arm with three globes on each side
    P.cyl(br, [sg * 0.4, 5.4, 0], [sg * 1.15, 5.0, 0], 0.11, 0.08, 6, false);                                  // curved bronze bracket arm (rostrum)
    P.cyl(br, [sg * 1.15, 5.0, 0], [sg * 1.55, 5.5, 0], 0.08, 0.06, 6, false);
    for (const [dx, dy, r] of [[1.55, 6.0, 0.27], [1.15, 5.75, 0.23], [1.35, 5.25, 0.23]]) { sph(P, M.lampGlass, sg * dx, dy, 0, r, r, r, 9); P.cyl(br, [sg * dx, dy - r * 0.95, 0], [sg * dx, dy - r * 0.7, 0], 0.12, 0.16, 6, true); }
    P.cyl(br, [sg * 0.5, 4.7, 0], [sg * 1.0, 5.3, 0], 0.06, 0.05, 5, false);
    sph(P, br, sg * 0.5, 4.7, 0, 0.14, 0.18, 0.14, 6);
  }
  eagle(P, M, 0, 8.45, 0, Math.PI, 1.7);
  P.pop();
}
