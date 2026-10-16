// landmarksG/sculpt.js - simplified but recognisable bronze / copper sculpture of Palace Square, all through the kit's Parts collector (K.P):
// the rearing horse of the Chariot of Glory, Roman warriors, the winged Victory with her labarum, the double-headed eagle (flat silhouette), the angel of the Alexander Column.
// Models face local +z, stand on y = 0.  Photos: refs/palace-square 093 (chariot, warriors, victories), 105 / 115 / 116 (angel + cross), 112 (eagle).  NO flags (the labarum is a bare pole with the eagle).
import * as THREE from 'three';
import { tube, blob } from './loft.js';
import { human, extend, addWing } from '../lib/figures.js';

const geoCache = new Map();
const cached = (k, f) => { if (!geoCache.has(k)) geoCache.set(k, f()); return geoCache.get(k); };
const sphereG = (w = 10, h = 6) => cached(`sph${w}x${h}`, () => new THREE.SphereGeometry(1, w, h));

/** ellipsoid at (x,y,z) with radii (a,b,c) and Euler rotation */
export function ellip(P, mat, x, y, z, a, b, c, rx = 0, ry = 0, rz = 0, seg = 10) {
  P.geo(mat, sphereG(seg, Math.max(4, seg >> 1)), x, y, z, rx, ry, rz, a, b, c);
}

/**
 * a rearing horse of the Chariot of Glory (about 3.0 m to the ears, 2.9 m long) facing +z, hind hooves on y = 0.  Lofted tubes + ellipsoids (loft.js, the Bronze Horseman technique): barrel with the
 * chest towards the viewer, arched neck with the head tucked down, haunches and shoulders as muscle masses, forelegs folded high (knee up, hoof tucked), hind legs with stifle and hock, a dark mane and tail.
 * o.legs: 0 = both forelegs folded, +1 / -1 = the left / right one thrown forward; o.turn: -1..1 turns the head sideways (the outer horses look at their warriors).  Photo refs/palace-square 093.
 */
export function horse(K, mat, x, y, z, rotY = 0, s = 1, matDark = null, o = {}) {
  const P = K.P, S = s, dark = matDark || mat, turn = o.turn || 0, lf = o.legs || 0;
  P.push(x, y, z, rotY);
  const add = (g, m = mat) => { P.geo(m, g, 0, 0, 0, 0, 0, 0, S, S, S); g.dispose(); };
  const T = (path, rad, oo = {}, m = mat) => add(tube(path, rad, { seg: 8, per: 3, ...oo }), m);
  const B = (c, r, oo = {}) => add(blob(c, r, { w: 9, h: 6, ...oo }));
  const sd = [-1, 1], hx = turn * 0.3;
  // barrel, croup, shoulders, chest
  T([[0, 1.22, -0.8], [0, 1.5, -0.24], [0, 1.88, 0.4], [0, 2.14, 0.84]], [[0.34, 0.38], [0.35, 0.38], [0.37, 0.4], [0.31, 0.34]], { seg: 10, per: 4 });
  for (const sx of sd) {
    B([sx * 0.27, 1.2, -0.72], [0.2, 0.3, 0.3], { dir: [0, -0.3, 1] });                   // haunch
    B([sx * 0.3, 1.97, 0.58], [0.15, 0.27, 0.32], { dir: [0, -0.5, 1] });                  // shoulder
    B([sx * 0.2, 1.74, 0.95], [0.13, 0.2, 0.2], { dir: [0, -0.3, 1] });                    // pectoral
  }
  B([0, 1.9, 0.86], [0.33, 0.36, 0.3], { dir: [0, 0.2, 1] });                              // breast
  // neck, head, ears, mane
  T([[0, 2.0, 0.7], [hx * 0.25, 2.45, 0.94], [hx * 0.6, 2.82, 1.08]], [[0.24, 0.3], [0.17, 0.22], [0.12, 0.15]], { seg: 9, per: 4 });
  T([[hx * 0.6, 2.84, 1.06], [hx * 0.85, 2.62, 1.33], [hx * 1.25, 2.4, 1.56]], [[0.115, 0.16], [0.09, 0.12], [0.068, 0.082]], { seg: 8, per: 3 });
  for (const sx of sd) P.cyl(mat, [(sx * 0.07 + hx * 0.6) * S, 2.9 * S, 1.02 * S], [(sx * 0.085 + hx * 0.6) * S, 3.06 * S, 1.0 * S], 0.04 * S, 0.012 * S, 4, false);
  T([[hx * 0.1, 2.22, 0.5], [hx * 0.35, 2.62, 0.7], [hx * 0.6, 2.98, 0.93]], [[0.032, 0.1], [0.036, 0.11], [0.026, 0.07]], { seg: 5, per: 3 }, dark);
  // forelegs: shoulder -> knee -> cannon -> hoof, folded (knee up, hoof tucked behind it) or one thrown forward
  for (const sx of sd) {
    const ext = lf === sx;
    const path = ext ? [[sx * 0.27, 1.9, 0.72], [sx * 0.3, 1.98, 1.36], [sx * 0.3, 1.74, 1.74], [sx * 0.3, 1.52, 1.66]] : [[sx * 0.27, 1.9, 0.72], [sx * 0.3, 1.78, 1.28], [sx * 0.31, 1.44, 1.14], [sx * 0.3, 1.3, 1.03]];
    T(path, [[0.12, 0.13], [0.075, 0.085], [0.052, 0.058], [0.05, 0.05]], { seg: 7, per: 3 });
    const e = path[3];
    P.cyl(dark, [e[0] * S, (e[1] - 0.02) * S, e[2] * S], [e[0] * S, (e[1] - 0.15) * S, (e[2] + 0.04) * S], 0.055 * S, 0.075 * S, 6, true);   // hoof
  }
  // hind legs: hip -> stifle -> hock -> fetlock -> hoof on the ground
  for (const sx of sd) {
    B([sx * 0.3, 1.0, -0.45], [0.13, 0.18, 0.2], { dir: [0, -0.6, 0.8] });                 // stifle
    T([[sx * 0.27, 1.25, -0.72], [sx * 0.3, 0.92, -0.38], [sx * 0.29, 0.58, -0.88], [sx * 0.27, 0.24, -0.64], [sx * 0.27, 0.07, -0.5]], [[0.19, 0.2], [0.12, 0.15], [0.075, 0.1], [0.05, 0.055], [0.05, 0.05]], { seg: 7, per: 3, cap: false });
    P.cyl(dark, [sx * 0.27 * S, 0, -0.48 * S], [sx * 0.27 * S, 0.1 * S, -0.5 * S], 0.075 * S, 0.055 * S, 6, true);   // hoof
  }
  // tail
  T([[0, 1.45, -0.95], [0, 1.0, -1.28], [0, 0.45, -1.45]], [[0.07, 0.07], [0.1, 0.08], [0.05, 0.04]], { seg: 6, per: 3 }, dark);
  P.pop();
}

// ---- the Roman warriors and the winged Victory of the arch and of the Chariot of Glory: figures of the shared kit (lib/figures.js), cached per spear length / detail
const warriorFig = (spear, detail) => cached('lmG-warrior' + spear + '-' + detail, () => extend(human({
  detail, body: { muscle: 0.7, bulk: 1.1 },
  pose: { head: [0.05, -0.2, 0], legs: { L: { foot: [0.12, 0, 0.0] }, R: { foot: [-0.14, 0, 0.08] } },
    arms: { R: { hand: [-0.3, 1.02, 0.2], pole: [-0.5, -0.4, -0.7], grip: 'hold', palm: [0, 0, 1] }, L: { hand: [0.32, 1.0, 0.1], pole: [0.6, -0.4, -0.6], grip: 'hold', palm: [-0.3, 0, 1] } } },
  outfit: { torso: 'cuirass', hem: 0.3, cape: 'back', capeLen: 0.6, hat: 'roman', boots: 0.3 },
  face: { age: 0.3, hair: 'none', seed: 7 },
}), (S, info) => {
  const h = info.j.hands.R.hold, top = spear / 1.7;
  S.tube('main', [[h[0], 0.1, h[2]], h, [h[0], top, h[2]]], [[0.017, 0.017], [0.019, 0.019], [0.014, 0.014]], { seg: 6, per: 8 });                 // the spear
  S.blob('main', [h[0], top + 0.1, h[2]], [0.03, 0.12, 0.012], { w: 6, h: 5 });
  S.blob('accent', [info.j.hands.L.hold[0] + 0.08, info.j.hands.L.hold[1] + 0.05, info.j.hands.L.hold[2] + 0.06], [0.04, 0.3, 0.3], { dir: [1, 0.1, 0.1], w: 10, h: 8 });  // the round shield
}));

/** a Roman warrior with spear and shield (3.0 m with the helmet), standing on y = 0, facing +z */
export function warrior(K, mat, x, y, z, rotY = 0, s = 1, o = {}) {
  warriorFig(o.spear ?? 3.5, o.detail ?? (y > 20 ? 0.2 : 0.3)).place(K.P, { main: mat, dark: o.darkMat || mat, accent: o.shieldMat || mat }, x, y, z, rotY, s * 1.7);
}

const victoryFig = (detail) => cached('lmG-victory-' + detail, () => extend(human({
  detail, body: { sex: 'f', bulk: 0.95 },
  pose: { pelvisRot: [0, 0.1, 0.05], spine: [-0.08, 0, -0.05], head: [0.0, 0.2, 0.05], legs: { L: { foot: [0.08, 0, 0.05] }, R: { foot: [-0.1, 0, -0.05] } },
    arms: { R: { hand: [-0.3, 1.9, 0.35], pole: [-0.5, 0.2, -0.3], grip: 'hold', palm: [0.2, 0.6, 0.6] }, L: { hand: [0.34, 1.2, 0.18], pole: [0.5, -0.4, -0.6], grip: 'hold', palm: [-0.4, 0, 1] } } },
  outfit: { torso: 'dress', hem: 0.93, flare: 0.6, folds: 0.07, sleeves: 'none', cape: 'back', capeLen: 0.9, hat: 'laurel' },
  face: { age: 0.2, hair: 'cap', seed: 9 },
}), (S, info) => {
  for (const sd of [1, -1]) addWing(S, { root: [sd * 0.1, 1.42, -0.1], side: sd, pose: 'half', span: 0.9, key: 'main', boneKey: 'main', tilt: [0.1, 0.8, 0] });
  const h = info.j.hands.R.hold;
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; S.blob('main', [h[0] + Math.cos(a) * 0.1, h[1] + 0.12 + Math.sin(a) * 0.1, h[2]], [0.03, 0.012, 0.012], { dir: [-Math.sin(a), Math.cos(a), 0], ref: [0, 0, 1], w: 6, h: 4 }); }   // the wreath
}));

/** winged Victory standing in the car, arm raised with a wreath, labarum (bare pole + double eagle at the top) in the other hand; ~2.6 m tall without the pole */
export function victory(K, mat, x, y, z, rotY = 0, s = 1, poleTop = 8) {
  const P = K.P;
  P.push(x, y, z, rotY);
  const S = s;
  victoryFig(y > 20 ? 0.25 : 0.42).place(P, { main: mat, dark: mat, accent: mat }, 0, 0, 0, 0, S * 1.5);
  const c = (a, b, r0, r1, seg = 6) => P.cyl(mat, [a[0] * S, a[1] * S, a[2] * S], [b[0] * S, b[1] * S, b[2] * S], r0 * S, r1 * S, seg, true);
  c([0.5, 1.0, 0.27], [0.5, poleTop, 0.27], 0.035, 0.03, 5);                                       // labarum pole (a bare staff, no cloth)
  c([0.5, poleTop - 0.9, 0.27], [0.5, poleTop - 0.86, 0.27], 0.16, 0.16, 8);
  eagle(K, mat, 0.5 * S, (poleTop + 0.02) * S, 0.27 * S, 0, 0.62 * S);
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
