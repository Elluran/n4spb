// landmarksE/ (copy of landmarksG/sculpt.js) - simplified but recognisable bronze / copper sculpture of Palace Square, all through the kit's Parts collector (K.P):
// the rearing horse of the Chariot of Glory, Roman warriors, the winged Victory with her labarum, the double-headed eagle (flat silhouette), the angel of the Alexander Column.
// Models face local +z, stand on y = 0.  Photos: refs/palace-square 093 (chariot, warriors, victories), 105 / 115 / 116 (angel + cross), 112 (eagle).  NO flags (the labarum is a bare pole with the eagle).
import * as THREE from 'three';

const geoCache = new Map();
const cached = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };
const sphereG = (w = 10, h = 6) => cached(`sph${w}x${h}`, () => new THREE.SphereGeometry(1, w, h));

/** ellipsoid at (x,y,z) with radii (a,b,c) and Euler rotation */
export function ellip(P, mat, x, y, z, a, b, c, rx = 0, ry = 0, rz = 0, seg = 10) {
  P.geo(mat, sphereG(seg, Math.max(4, seg >> 1)), x, y, z, rx, ry, rz, a, b, c);
}

/** a rearing horse (3.0 m high, 3 m long) facing +z, hind hooves on y = 0 */
export function horse(K, mat, x, y, z, rotY = 0, s = 1, matDark = null) {
  const P = K.P;
  P.push(x, y, z, rotY);
  if (s !== 1) { /* scale through geometry: parts are generated in unit m and multiplied below */ }
  const S = s;
  const c = (a, b, r0, r1, seg = 6) => P.cyl(mat, [a[0] * S, a[1] * S, a[2] * S], [b[0] * S, b[1] * S, b[2] * S], r0 * S, r1 * S, seg, true);
  const e = (px, py, pz, a, b, cc, rx = 0, seg = 8) => ellip(P, mat, px * S, py * S, pz * S, a * S, b * S, cc * S, rx, 0, 0, seg);
  // body
  e(0, 1.2, -0.5, 0.42, 0.5, 0.55);                 // rump
  e(0, 1.6, 0.15, 0.40, 0.44, 0.85, -0.6);          // barrel (front up)
  e(0, 2.0, 0.68, 0.37, 0.4, 0.4);                  // chest / shoulders
  // neck + head
  c([0, 2.05, 0.7], [0, 2.78, 1.02], 0.27, 0.17, 7);
  c([0, 2.84, 1.04], [0, 2.52, 1.52], 0.15, 0.085, 6);
  c([0.09, 2.96, 0.98], [0.1, 3.14, 0.96], 0.04, 0.01, 4); c([-0.09, 2.96, 0.98], [-0.1, 3.14, 0.96], 0.04, 0.01, 4);
  P.box(matDark || mat, -0.035 * S, 0.035 * S, 2.45 * S, 3.0 * S, 0.62 * S, 0.9 * S, 'b');       // mane
  // hind legs: hip -> hock -> hoof
  for (const sx of [-1, 1]) {
    c([sx * 0.24, 1.15, -0.55], [sx * 0.25, 0.62, -0.9], 0.17, 0.09, 6);
    c([sx * 0.25, 0.62, -0.9], [sx * 0.23, 0.04, -0.5], 0.09, 0.07, 6);
    // front legs raised and folded: shoulder -> knee -> hoof
    c([sx * 0.22, 1.85, 0.78], [sx * 0.25, 2.05, 1.38], 0.12, 0.085, 6);
    c([sx * 0.25, 2.05, 1.38], [sx * 0.25, 1.62, 1.62], 0.085, 0.065, 6);
  }
  // tail
  c([0, 1.45, -0.95], [0, 0.55, -1.35], 0.1, 0.05, 5);
  P.pop();
}

/** a Roman warrior with spear and shield (3.0 m with the helmet), standing on y = 0, facing +z */
export function warrior(K, mat, x, y, z, rotY = 0, s = 1, o = {}) {
  const P = K.P;
  P.push(x, y, z, rotY);
  const S = s;
  const c = (a, b, r0, r1, seg = 6) => P.cyl(mat, [a[0] * S, a[1] * S, a[2] * S], [b[0] * S, b[1] * S, b[2] * S], r0 * S, r1 * S, seg, true);
  for (const sx of [-1, 1]) c([sx * 0.16, 0, 0], [sx * 0.15, 1.05, 0.02], 0.12, 0.15, 6);        // legs
  c([0, 0.95, 0], [0, 1.25, 0], 0.34, 0.3, 8);                                                    // skirt / pteruges (a frustum)
  c([0, 1.2, 0], [0, 1.85, 0], 0.28, 0.33, 8);                                                    // cuirass
  ellip(P, mat, 0, 1.88, 0, 0.42 * S, 0.14 * S, 0.22 * S, 0, 0, 0, 6);                            // shoulders
  c([0, 1.9, 0], [0, 2.05, 0], 0.1, 0.09, 6);                                                     // neck
  ellip(P, mat, 0, 2.2, 0, 0.17 * S, 0.2 * S, 0.19 * S, 0, 0, 0, 7);                              // head
  c([0, 2.22, 0], [0, 2.46, 0], 0.2, 0.12, 8);                                                    // helmet
  c([0, 2.44, -0.1], [0, 2.58, -0.28], 0.025, 0.025, 4);                                         // crest
  // spear arm and spear
  c([0.34, 1.85, 0], [0.5, 1.5, 0.18], 0.07, 0.06, 5);
  c([0.5, 0.2, 0.18], [0.5, o.spear ?? 3.5, 0.18], 0.03, 0.025, 4);
  P.geo(mat, cached('spearhead', () => new THREE.ConeGeometry(0.06, 0.28, 4)), 0.5 * S, ((o.spear ?? 3.5) + 0.12) * S, 0.18 * S, 0, 0, 0, S, S, S);
  // shield on the left arm
  c([-0.34, 1.85, 0], [-0.46, 1.35, 0.1], 0.07, 0.06, 5);
  P.cyl(o.shieldMat || mat, [-0.55 * S, 1.45 * S, 0.08 * S], [-0.55 * S, 1.45 * S, 0.17 * S], 0.4 * S, 0.4 * S, 10, true);
  P.pop();
}

/** winged Victory standing in the car, arm raised with a wreath, labarum (bare pole + double eagle at the top) in the other hand; ~2.6 m tall without the pole */
export function victory(K, mat, x, y, z, rotY = 0, s = 1, poleTop = 8) {
  const P = K.P;
  P.push(x, y, z, rotY);
  const S = s;
  const c = (a, b, r0, r1, seg = 6) => P.cyl(mat, [a[0] * S, a[1] * S, a[2] * S], [b[0] * S, b[1] * S, b[2] * S], r0 * S, r1 * S, seg, true);
  c([0, 0, 0], [0, 1.5, 0], 0.55, 0.28, 8);                                                       // long robe
  c([0, 1.45, 0], [0, 2.0, 0], 0.28, 0.3, 8);
  ellip(P, mat, 0, 2.05, 0, 0.36 * S, 0.12 * S, 0.2 * S, 0, 0, 0, 6);
  ellip(P, mat, 0, 2.35, 0, 0.16 * S, 0.19 * S, 0.17 * S, 0, 0, 0, 7);
  c([0, 2.45, 0], [0, 2.52, 0], 0.18, 0.18, 8);                                                   // wreath
  // wings: two flat feathered shapes behind the shoulders
  const wing = (m) => cached('vwing' + m, () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.7 * m, 0.4, 0.78 * m, 1.7); sh.quadraticCurveTo(0.35 * m, 1.35, 0.1 * m, 0.9); sh.quadraticCurveTo(0.02 * m, 0.4, 0, 0); return new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false }); });
  P.geo(mat, wing(1), 0.1 * S, 1.55 * S, -0.22 * S, 0, 0, -0.15, S, S, S);
  P.geo(mat, wing(-1), -0.1 * S, 1.55 * S, -0.22 * S, 0, 0, 0.15, S, S, S);
  // right arm out with a wreath, left arm with the labarum
  c([0.3, 1.95, 0], [0.75, 2.05, 0.55], 0.07, 0.055, 5);
  P.geo(mat, cached('wreath', () => new THREE.TorusGeometry(0.17, 0.03, 5, 12)), 0.78 * S, 2.1 * S, 0.6 * S, 0, 0, 0, S, S, S);
  c([-0.3, 1.95, 0], [-0.45, 1.6, 0.35], 0.07, 0.055, 5);
  c([-0.45, 1.0, 0.36], [-0.45, poleTop, 0.36], 0.035, 0.03, 5);                                  // labarum pole (a bare staff, no cloth)
  c([-0.45, poleTop - 0.9, 0.36], [-0.45, poleTop - 0.86, 0.36], 0.16, 0.16, 8);
  eagle(K, mat, -0.45 * S, (poleTop + 0.02) * S, 0.36 * S, 0, 0.62 * S);
  P.pop();
}

const EAGLE_R = [[0.03, 0.88], [0.05, 1.08], [0.1, 0.96], [0.14, 1.04], [0.24, 1.06], [0.32, 1.0], [0.26, 0.97], [0.2, 0.92], [0.18, 0.84], [0.3, 0.92], [0.46, 1.0], [0.6, 1.02], [0.66, 0.92], [0.58, 0.88], [0.62, 0.78],
  [0.52, 0.74], [0.54, 0.62], [0.44, 0.58], [0.42, 0.48], [0.3, 0.46], [0.34, 0.36], [0.22, 0.34], [0.24, 0.12], [0.14, 0.0], [0.0, 0.04]];
const EAGLE = EAGLE_R.concat(EAGLE_R.slice(0, -1).reverse().map((p) => [-p[0], p[1]]));
/** double-headed eagle: a flat silhouette 1 m wide x 1.1 m high (scaled by s), 0.08 m thick, facing +z, base at y */
export function eagle(K, mat, x, y, z, rotY = 0, s = 1) {
  const g = cached('eagle', () => { const sh = new THREE.Shape(); EAGLE.forEach((p, i) => (i ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]))); return new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); });
  K.P.geo(mat, g, x, y, z, 0, rotY, 0, s, s, s);
}

/** angel of the Alexander Column holding the cross: 4.26 m tall with the wings, the cross (bare, 6.4 m) rises from his left hand; facing +z */
export function angel(K, mat, matCross, x, y, z, rotY = 0) {
  const P = K.P;
  P.push(x, y, z, rotY);
  const c = (a, b, r0, r1, seg = 8) => P.cyl(mat, a, b, r0, r1, seg, true);
  c([0, 0, 0], [0, 2.3, 0], 0.62, 0.34, 10);                                                      // robe
  c([0, 2.25, 0], [0, 3.1, 0], 0.34, 0.3, 8);
  ellip(P, mat, 0, 3.1, 0, 0.44, 0.15, 0.24, 0, 0, 0, 7);
  ellip(P, mat, 0.02, 3.55, 0.06, 0.2, 0.24, 0.21, 0.35, 0, 0, 8);                                // bowed head
  const wing = (m) => cached('awing' + m, () => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(0.9 * m, 0.5, 1.0 * m, 2.5); sh.quadraticCurveTo(0.45 * m, 1.9, 0.15 * m, 1.3); sh.quadraticCurveTo(0.02 * m, 0.6, 0, 0); return new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }); });
  P.geo(mat, wing(1), 0.15, 2.35, -0.28, 0, 0, -0.12, 1, 1, 1);
  P.geo(mat, wing(-1), -0.15, 2.35, -0.28, 0, 0, 0.12, 1, 1, 1);
  c([0.3, 3.0, 0.05], [0.45, 3.9, 0.15], 0.08, 0.06, 5);                                          // raised right arm (pointing up)
  c([-0.3, 2.95, 0.05], [-0.32, 2.4, 0.4], 0.08, 0.06, 5);                                        // left arm holds the cross
  // the cross: pole from the hand to 6.4 m, cross bar high up (Latin cross)
  P.box(matCross, -0.32 - 0.15, -0.32 + 0.15, 0.7, 6.4, 0.45 - 0.15, 0.45 + 0.15, '');
  P.box(matCross, -0.32 - 0.62, -0.32 + 0.62, 4.95, 5.25, 0.45 - 0.15, 0.45 + 0.15, '');
  P.pop();
}
