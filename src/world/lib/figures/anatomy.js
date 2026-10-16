// lib/figures/anatomy.js - face, hand and foot builders of the figure kit (human.js uses them; monuments may call them directly through the kit).
//
//   face(S, frame, o)  - a believable head in a head frame { c: centre of the skull, x: side (+x = the figure's left), y: up, z: forward }: cranium, face, brow, eyes with lids, nose with
//                        nostrils, lips, chin, cheekbones, ears, hair style, beard / sideburns / moustache.  1.0 = a 0.235 m head (crown to chin), the human kit builds a 1.75 m man.
//   hand(S, side, wrist, fwd, palm, grip, o) - palm + four fingers (3 phalanges each) + thumb; grips: open, relaxed, fist, hold, point, flat, cup.  Returns { hold, f, n, t } for attachments.
//   foot(S, ...)       - bare foot or boot.
// All geometry goes through the Sculpt collector S (material keys main / dark / accent).
import * as THREE from 'three';
import { V, hash1 } from './geom.js';

const add = V.add, mul = V.mul;

/** point in a frame: c + x*a + y*b + z*c */
const at = (F, x, y, z) => [F.c[0] + F.x[0] * x + F.y[0] * y + F.z[0] * z, F.c[1] + F.x[1] * x + F.y[1] * y + F.z[1] * z, F.c[2] + F.x[2] * x + F.y[2] * y + F.z[2] * z];
const dirIn = (F, x, y, z) => [F.x[0] * x + F.y[0] * y + F.z[0] * z, F.x[1] * x + F.y[1] * y + F.z[1] * z, F.x[2] * x + F.y[2] * y + F.z[2] * z];
export { at as frameAt3, dirIn as frameDir3 };

// ---------------------------------------------------------------------------------------------------------------- the head: ONE sculpted surface
// A head is a height-field in head coordinates (origin = the middle of the skull, +y up, +z forward, +x the figure's left; crown y = +0.122, chin y = -0.118, nose tip z = +0.096):
// the egg-shaped base (profile tables for the half width, the front and the back depth per height) plus smooth Gaussian features pushed along the horizontal normal: brow ridge, eye sockets
// with lids and balls, nose bridge / tip / wings, cheekbones, lips, chin, and - for the hair, the beard and the moustache - lumpy thickness fields with a soft hairline.  One mesh per head,
// smooth normals, no detached blobs (the earlier blob face read as a mask).  Ears are two small blobs.
const lerpTab = (T, y) => {
  if (y <= T[0][0]) return T[0][1]; if (y >= T[T.length - 1][0]) return T[T.length - 1][1];
  let i = 0; while (T[i + 1][0] < y) i++;
  const t = (y - T[i][0]) / (T[i + 1][0] - T[i][0]), tt = t * t * (3 - 2 * t);
  return T[i][1] + (T[i + 1][1] - T[i][1]) * (0.5 * t + 0.5 * tt);
};
const HALF_W = [[-0.118, 0], [-0.112, 0.016], [-0.1, 0.03], [-0.08, 0.044], [-0.055, 0.058], [-0.025, 0.069], [0.01, 0.075], [0.05, 0.077], [0.085, 0.07], [0.108, 0.05], [0.12, 0.024], [0.1225, 0]];
const Z_FRONT = [[-0.118, 0], [-0.112, 0.022], [-0.1, 0.044], [-0.08, 0.052], [-0.05, 0.059], [-0.015, 0.066], [0.02, 0.071], [0.06, 0.074], [0.09, 0.066], [0.11, 0.046], [0.12, 0.022], [0.1225, 0]];
const Z_BACK = [[-0.118, 0], [-0.108, 0.018], [-0.085, 0.04], [-0.05, 0.068], [-0.01, 0.092], [0.04, 0.1], [0.085, 0.09], [0.11, 0.062], [0.12, 0.03], [0.1225, 0]];
const HAIRLINE = { short: [[0, 0.066], [0.55, 0.062], [0.95, 0.048], [1.3, 0.0], [1.75, -0.034], [2.4, -0.04], [3.14, -0.05]], wig: [[0, 0.07], [0.55, 0.066], [1.0, 0.05], [1.3, -0.01], [1.7, -0.07], [2.4, -0.075], [3.14, -0.08]], long: [[0, 0.068], [0.6, 0.064], [1.0, 0.05], [1.4, -0.02], [1.9, -0.06], [3.14, -0.07]] };
const gs = (x) => Math.exp(-x * x);
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hash2 = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const vnoise = (x, y, seed) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const h = (i, j) => hash2(i + seed, j) * 2 - 1; return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };

/** the head surface in head coordinates. o: age (0..1), hair ('short' | 'curly' | 'wig' | 'long' | 'cap' | 'bald' | 'none'), beard ('none' | 'sideburns' | 'full' | 'moustache' | 'goatee'), mouth ('closed' | 'smile' | 'stern'), brow, nose, jaw, seed, detail */
export function headGeometry(o = {}) {
  const det = o.detail ?? 1, NX = Math.max(12, Math.round(44 * det) & ~1);
  const age = o.age ?? 0.3, brow = o.brow ?? 0.5, nose = o.nose ?? 1, jaw = o.jaw ?? 1, seed = o.seed ?? 0;
  const hair = o.hair ?? 'short', beard = o.beard ?? 'none', mood = o.mouth === 'smile' ? 1 : o.mouth === 'stern' ? -1 : 0;
  const Y0 = -0.118, Y1 = 0.1225, pos = [], idx = [];
  // rows: dense over the face (chin .. forehead), coarse over the cranium
  const ys = []; { const st = 0.0048 / Math.max(0.15, det); ys.push(Y0, -0.109); for (let y = -0.1; y < 0.048; y += st) ys.push(y); const hs = 0.0125 / Math.max(0.2, det); for (let y = 0.048; y < Y1 - 0.004; y += hs) ys.push(y); ys.push(Y1); }
  const NY = ys.length - 1;
  const hl = HAIRLINE[hair === 'curly' || hair === 'cap' ? 'short' : hair] || HAIRLINE.short;
  const hairline = (a) => { let i = 0; while (i + 1 < hl.length - 1 && hl[i + 1][0] < a) i++; const t = (a - hl[i][0]) / (hl[i + 1][0] - hl[i][0]); return hl[i][1] + (hl[i + 1][1] - hl[i][1]) * Math.max(0, Math.min(1, t)); };
  const hasHair = hair !== 'bald' && hair !== 'none';
  for (let iy = 0; iy <= NY; iy++) {
    const y = ys[iy];
    const W = lerpTab(HALF_W, y), ZF = lerpTab(Z_FRONT, y), ZB = lerpTab(Z_BACK, y);
    for (let ix = 0; ix < NX; ix++) {
      const uu = -1 + 2 * ix / NX, phi = Math.PI * Math.sign(uu) * Math.pow(Math.abs(uu), 1.35), a = Math.abs(phi);
      const cphi = Math.cos(phi), sphi = Math.sin(phi), Z = cphi >= 0 ? ZF : ZB;
      const x = W * sphi, z = Z * cphi;
      let d = 0;
      d += 0.012 * (0.7 + 0.6 * brow) * gs((y - 0.024) / 0.0105) * Math.exp(-Math.pow(a / 0.95, 4));      // brow ridge
      d += 0.0075 * gs((y - 0.052) / 0.02) * Math.exp(-Math.pow(a / 0.8, 4));                           // forehead bulge
      d -= 0.0125 * gs((a - 0.54) / 0.19) * gs((y - 0.004) / 0.0135);                                   // eye sockets
      d += 0.0075 * gs((a - 0.55) / 0.12) * gs((y - 0.002) / 0.0085);                                   // eye balls
      d += 0.0035 * gs((a - 0.54) / 0.17) * gs((y - 0.0125) / 0.0042) + 0.0028 * gs((a - 0.54) / 0.15) * gs((y + 0.008) / 0.0045);   // lids
      d += 0.008 * gs((a - 0.78) / 0.22) * gs((y + 0.028) / 0.021);                                       // cheekbones
      d -= (0.004 + 0.007 * age) * gs((a - 0.6) / 0.18) * gs((y + 0.055) / 0.02);                         // cheek hollow
      d += 0.022 * nose * sstep(0.03, -0.03, y) * sstep(-0.062, -0.05, y) * gs(a / (0.15 + 0.1 * sstep(0.0, -0.05, y)));   // nose bridge, widening to the base
      d += 0.012 * nose * gs(a / 0.14) * gs((y + 0.05) / 0.0125);                                          // nose tip
      d += 0.011 * nose * gs((a - 0.34) / 0.1) * gs((y + 0.052) / 0.01);                                  // nostril wings
      d -= 0.0065 * gs(a / 0.4) * gs((y + 0.064) / 0.0042);                                              // under the nose
      d += 0.0065 * gs(a / 0.36) * gs((y + 0.0695) / 0.0075);                                            // upper lip
      d += 0.0075 * gs(a / 0.33) * gs((y + 0.0835) / 0.0078);                                            // lower lip
      d -= (0.0055 + 0.0015 * age) * gs((y + 0.0765 - mood * 0.006 * a * a) / 0.0024) * Math.exp(-Math.pow(a / 0.5, 4));   // the mouth line (corners up when smiling)
      d += 0.012 * jaw * gs(a / 0.26) * gs((y + 0.102) / 0.014);                                          // chin
      d -= 0.004 * gs(a / 0.3) * gs((y + 0.0925) / 0.004);                                               // chin groove
      d += (0.005 + 0.006 * age) * gs((a - 0.5) / 0.07) * gs((y + 0.055) / 0.025);                        // nasolabial fold ridge (older faces)
      d *= o.feature ?? 1.7;                                                                             // sculptural exaggeration: the features must read from 5 m
      if (hasHair) {
        const h0 = hairline(a), on = sstep(h0 - 0.004, h0 + 0.012, y);
        if (on > 0) {
          let t = hair === 'curly' ? 0.011 : hair === 'wig' ? 0.017 : hair === 'cap' ? 0.0075 : 0.008;
          const lump = hair === 'curly' ? 0.011 * vnoise(phi * 7, y * 90, seed + 3) + 0.005 * vnoise(phi * 16, y * 160, seed + 8)
            : hair === 'wig' ? 0.004 * vnoise(phi * 6, y * 70, seed) : hair === 'cap' ? 0 : 0.0035 * vnoise(phi * 9, y * 70, seed + 1) + 0.002 * Math.sin(phi * 11 + y * 60);
          if (hair === 'short' || hair === 'long' || hair === 'curly') t += 0.003 * gs(a / 0.5) * sstep(0.07, 0.11, y);                    // a quiff over the forehead
          let extra = 0;
          if (hair === 'wig') for (const yc of [-0.002, -0.034, -0.066]) extra += 0.02 * gs((a - 1.62) / 0.34) * gs((y - yc) / 0.0125);       // side rolls
          d += on * (t + lump + extra);
        }
      }
      if (beard !== 'none') {
        let mask = 0;
        const bt = beard === 'full' ? 0.0125 : beard === 'goatee' ? 0.011 : 0.009;
        if (beard === 'full') { const top = -0.07 + 0.075 * sstep(0.45, 1.5, a); mask = sstep(top + 0.006, top - 0.01, y) * (1 - 0.95 * gs((y + 0.075) / 0.02) * Math.exp(-Math.pow(a / 0.36, 2))); }
        if (beard === 'sideburns' || beard === 'full') mask = Math.max(mask, sstep(0.95, 1.2, a) * sstep(1.75, 1.45, a) * sstep(0.03, 0.0, y) * sstep(-0.075, -0.045, y));
        if (beard === 'goatee') mask = gs(a / 0.35) * sstep(-0.085, -0.095, y);
        if (mask > 0) d += mask * (bt + 0.004 * vnoise(phi * 8, y * 80, seed + 5));
        if (beard === 'moustache' || beard === 'full') d += 0.011 * gs(a / 0.33) * gs((y + 0.0615) / 0.0085) + 0.004 * gs((a - 0.2) / 0.14) * gs((y + 0.066) / 0.01);
      }
      const nx0 = x / (W * W + 1e-5), nz0 = z / (Z * Z + 1e-5), rn = Math.hypot(nx0, nz0) || 1;
      pos.push(x + nx0 / rn * d, y, z + nz0 / rn * d);
    }
  }
  for (let iy = 0; iy < NY; iy++) for (let ix = 0; ix < NX; ix++) {
    const a0 = iy * NX + ix, a1 = iy * NX + (ix + 1) % NX, b0 = (iy + 1) * NX + ix, b1 = (iy + 1) * NX + (ix + 1) % NX;
    idx.push(a0, b0, a1, a1, b0, b1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; let sum = 0; for (let i = 0; i < n.count; i++) sum += n.getX(i) * pos[i * 3] + n.getZ(i) * pos[i * 3 + 2];
  if (sum < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

/**
 * face: the head surface placed in a head frame F = { c, x, y, z } (unit vectors; c = the middle of the skull) with the ears and the wig queue / long hair.  Options as headGeometry plus
 * scale (1 = a 0.241 m head), skinKey / hairKey (material keys; the hair is part of the head mesh, hairKey only colours the queue and the long locks).
 */
export function face(S, F, o = {}) {
  const k = o.scale ?? 1, sk = o.skinKey || 'main', hk = o.hairKey || 'main';
  const g = headGeometry({ ...o, detail: o.detail ?? S.detail });
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...F.x), new THREE.Vector3(...F.y), new THREE.Vector3(...F.z)); m.scale(new THREE.Vector3(k, k, k)); m.setPosition(F.c[0], F.c[1], F.c[2]);
  g.applyMatrix4(m);
  S.add(sk, g); g.dispose();
  const B = (c, r, dir, key = sk, ww = 8, hh = 6) => S.blob(key, at(F, c[0] * k, c[1] * k, c[2] * k), [r[0] * k, r[1] * k, r[2] * k], { dir: dir ? dirIn(F, ...dir) : F.z.slice(), ref: F.x.slice(), w: Math.max(6, S.seg(ww)), h: Math.max(4, S.seg(hh)) });
  for (const s of [1, -1]) B([s * 0.0745, -0.01, -0.012], [0.0075, 0.03, 0.0175], [s * 0.3, 0, 1]);                                  // ears
  if (o.eyes === 'open') for (const s of [1, -1]) B([s * 0.04, 0.003, 0.066], [0.006, 0.006, 0.004], [0, 0, 1], 'dark', 6, 4);
  const hr = o.hair ?? 'short';
  if (hr === 'wig') S.tube(hk, [at(F, 0, 0.0 * k, -0.095 * k), at(F, 0, -0.07 * k, -0.125 * k), at(F, 0, -0.15 * k, -0.115 * k)], [[0.028 * k, 0.022 * k], [0.032 * k, 0.024 * k], [0.012 * k, 0.012 * k]], { seg: S.seg(8), per: 3 });
  if (hr === 'long') for (const s of [1, -1]) S.tube(hk, [at(F, s * 0.072 * k, 0.0, -0.01 * k), at(F, s * 0.085 * k, -0.08 * k, -0.03 * k), at(F, s * 0.07 * k, -0.18 * k, -0.045 * k)], [[0.024 * k, 0.034 * k], [0.028 * k, 0.038 * k], [0.012 * k, 0.014 * k]], { seg: S.seg(8), per: 3 });
  if (hr === 'long') S.tube(hk, [at(F, 0, -0.01 * k, -0.095 * k), at(F, 0, -0.1 * k, -0.11 * k), at(F, 0, -0.2 * k, -0.095 * k)], [[0.06 * k, 0.03 * k], [0.065 * k, 0.034 * k], [0.03 * k, 0.02 * k]], { seg: S.seg(10), per: 3 });
}

/** hand frame: wrist position, forearm direction `fwd` (elbow -> wrist), palm normal `palm` (the side the palm faces), side +1 = left hand (+x) / -1 = right hand */
const GRIPS = {
  open: { th: [[0.05, 0.1, 0.1], [0.04, 0.12, 0.1], [0.04, 0.1, 0.1], [0.06, 0.12, 0.1]], thumb: 0.5, spread: 1.25 },
  relaxed: { th: [[0.45, 0.55, 0.4], [0.5, 0.65, 0.45], [0.58, 0.7, 0.5], [0.66, 0.75, 0.5]], thumb: 0.3, spread: 1 },
  fist: { th: [[1.45, 1.65, 1.0], [1.5, 1.7, 1.0], [1.5, 1.7, 1.0], [1.45, 1.6, 1.0]], thumb: 1.0, spread: 0.85 },
  hold: { th: [[1.0, 1.2, 0.8], [1.05, 1.25, 0.8], [1.1, 1.3, 0.85], [1.15, 1.3, 0.85]], thumb: 0.8, spread: 0.95 },
  point: { th: [[0.05, 0.08, 0.05], [1.45, 1.65, 1.0], [1.5, 1.7, 1.0], [1.45, 1.6, 1.0]], thumb: 0.9, spread: 1 },
  flat: { th: [[0.0, 0.02, 0.0], [0.0, 0.02, 0.0], [0.0, 0.02, 0.0], [0.0, 0.02, 0.0]], thumb: 0.2, spread: 1.05 },
  cup: { th: [[0.35, 0.45, 0.35], [0.4, 0.5, 0.35], [0.45, 0.55, 0.4], [0.5, 0.6, 0.4]], thumb: 0.45, spread: 1 },
};
export function hand(S, side, wrist, fwd, palm, grip = 'relaxed', o = {}) {
  const k = o.scale ?? 1, key = o.key || 'main', G = GRIPS[grip] || GRIPS.relaxed;
  const f = V.unit(fwd);
  let n = V.sub(palm, V.mul(f, V.dot(palm, f))); if (V.len(n) < 1e-4) n = V.cross(f, [1, 0, 0]); n = V.unit(n);
  const t = V.unit(V.mul(V.cross(n, f), side));                       // towards the thumb
  const P = (a, b, c) => add(add(add(wrist, mul(f, a * k)), mul(t, b * k)), mul(n, c * k));   // a along the hand, b towards the thumb, c out of the palm
  const w = (nn) => S.seg(nn);
  S.blob(key, P(0.045, 0.0, 0.0), [0.036 * k, 0.014 * k, 0.05 * k], { dir: f, ref: t, w: w(10), h: w(7) });                    // palm: ref = x axis
  S.blob(key, P(0.02, 0.0, -0.004), [0.028 * k, 0.017 * k, 0.03 * k], { dir: f, ref: t, w: w(8), h: w(6) });                    // heel of the hand
  const offs = [0.0265, 0.009, -0.009, -0.0265], len = [0.073, 0.081, 0.076, 0.061], rad = [0.0098, 0.0100, 0.0095, 0.0085];
  if (S.detail < 0.5) {                                                    // far figures: the four fingers are one flat curled band
    const [a1, a2, a3] = G.th[1], base = P(0.088, 0, 0), L = 0.078 * k;
    const d = (th) => V.unit(add(mul(f, Math.cos(th)), mul(n, Math.sin(th))));
    const p1 = add(base, mul(d(a1), L * 0.45)), p2 = add(p1, mul(d(a1 + a2), L * 0.3)), p3 = add(p2, mul(d(a1 + a2 + a3), L * 0.25));
    S.tube(key, [base, p1, p2, p3], [[0.036 * k * G.spread, 0.011 * k], [0.034 * k * G.spread, 0.01 * k], [0.03 * k * G.spread, 0.009 * k], [0.022 * k, 0.007 * k]], { seg: 5, per: 1, ref: t, cap: false });
  } else for (let i = 0; i < 4; i++) {
    const [a1, a2, a3] = G.th[i], base = P(0.088, offs[i] * G.spread, 0.0);
    const th1 = a1, th2 = a1 + a2, th3 = a1 + a2 + a3, L = len[i] * k;
    const d = (th, sp = 0) => V.unit(add(add(mul(f, Math.cos(th)), mul(n, Math.sin(th))), mul(t, sp)));
    const sp = (i - 1.5) * -0.02 * (G.spread - 0.8);
    const p1 = add(base, mul(d(th1, sp), L * 0.45)), p2 = add(p1, mul(d(th2, sp), L * 0.3)), p3 = add(p2, mul(d(th3, sp), L * 0.25));
    S.tube(key, [base, p1, p2, p3], [[rad[i] * k, rad[i] * k], [rad[i] * 0.95 * k, rad[i] * 0.9 * k], [rad[i] * 0.85 * k, rad[i] * 0.8 * k], [rad[i] * 0.6 * k, rad[i] * 0.6 * k]], { seg: w(6), per: Math.max(2, Math.round(2 * S.detail)), ref: t });
  }
  // thumb: from the base of the palm, folding over the fingers in a fist
  const th = G.thumb, tb = P(0.03, 0.032, 0.002);
  const tdir = (a) => V.unit(add(add(mul(f, 0.6 * Math.cos(a * 0.4)), mul(t, 0.7 * Math.cos(a * 0.3))), mul(n, 0.5 * a)));
  const q1 = add(tb, mul(tdir(th * 0.2), 0.03 * k)), q2 = add(q1, mul(tdir(th * 0.7), 0.028 * k)), q3 = add(q2, mul(tdir(th * 1.1), 0.026 * k));
  S.tube(key, [tb, q1, q2, q3], [[0.0125 * k, 0.012 * k], [0.011 * k, 0.0105 * k], [0.0095 * k, 0.009 * k], [0.007 * k, 0.007 * k]], { seg: w(6), per: 2, ref: n });
  return { hold: P(0.075, 0.0, 0.015 * (grip === 'fist' || grip === 'hold' ? 1 : 0.2)), f, n, t, wrist };
}

/** foot / boot at an ankle point: dir = unit toe direction on the ground plane; o.boot (true: leather boot with a shaft up to `shaft` m above the ankle), o.key / o.soleKey */
export function foot(S, ankle, dir, side, o = {}) {
  const key = o.key || 'main', k = o.scale ?? 1, w = (n) => S.seg(n);
  const d = V.unit([dir[0], 0, dir[2]]), sx = [d[2], 0, -d[0]];   // sx: lateral axis (to the figure's left for +z toes)
  const up = o.up ?? 0;                                          // toe raise (m)
  const at2 = (a, b, c) => add(add(add(ankle, mul(d, a * k)), mul(sx, b * k)), [0, c * k, 0]);
  if (o.boot) {
    const sh = (o.shaft ?? 0.2) * k;
    S.tube(key, [add(ankle, [0, sh, 0]), add(ankle, [0, sh * 0.5, 0]), add(ankle, [0, 0.0, 0]), at2(0.02, 0, -0.03)], [[0.058 * k, 0.062 * k], [0.05 * k, 0.054 * k], [0.046 * k, 0.05 * k], [0.046 * k, 0.05 * k]], { seg: w(10), per: 3, ref: sx });
    S.blob(key, at2(0.075, 0, -0.04), [0.044 * k, 0.04 * k, 0.12 * k], { dir: add(d, [0, up, 0]), ref: sx, w: w(10), h: w(7) });          // vamp and toe cap
    S.blob(key, at2(0.17, 0, -0.058 + up * 0.4), [0.04 * k, 0.026 * k, 0.05 * k], { dir: add(d, [0, up, 0]), ref: sx, w: w(8), h: w(6) });
    S.blob(o.soleKey || 'dark', at2(0.06, 0, -0.072), [0.047 * k, 0.012 * k, 0.15 * k], { dir: d, ref: sx, w: w(8), h: 5 });                                  // sole
    S.blob(o.soleKey || 'dark', at2(-0.03, 0, -0.065), [0.044 * k, 0.025 * k, 0.03 * k], { dir: d, ref: sx, w: 6, h: 4 });                                   // heel
  } else {
    S.blob(key, at2(0.07, 0, -0.035), [0.042 * k, 0.03 * k, 0.115 * k], { dir: add(d, [0, up, 0]), ref: sx, w: w(10), h: w(7) });             // foot
    S.blob(key, at2(0.0, 0, -0.025), [0.04 * k, 0.045 * k, 0.045 * k], { dir: d, ref: sx, w: w(8), h: w(6) });                              // heel
    if (S.detail >= 0.5) for (let i = 0; i < 5; i++) S.blob(key, at2(0.185 - 0.006 * i, (i - 2) * -0.0105 * (side || 1), -0.062 + up * 0.5), [0.0105 * k, 0.012 * k, 0.014 * k - 0.0012 * i * k], { dir: d, ref: sx, w: 6, h: 4 });
  }
}
