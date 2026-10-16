// lib/figures/horse.js - the parametric LOFTED HORSE of the figure kit (technique of the Bronze Horseman: lofted tapered volumes with smooth normals, anatomy, bridle, mane, tail).
//
// horse(o) -> Figure (geos: main = the bronze, dark = nostrils / mouth, accent = mane + tail + hoofs if the host wants a second colour).  The horse faces +z, stands on y = 0, +x is its LEFT, real
// size (withers 1.55 m, head 2.0 m up, body 2.3 m long, ~8 k triangles at detail 1, ~4 k at 0.55).  Scale it with Figure.place(.., s).
//
// POSE.  A body frame (standing horse, origin on the ground) is moved by T = shift * rotate(yaw, pitch, roll about the hips): pitch > 0 rears the horse up.  Legs are solved by two-bone IK from
// the shoulder / hip to a hoof target: the knee bends forward, the hock backwards.  Presets: 'stand', 'walk', 'trot' (one fore raised), 'rear' (hind legs planted, forelegs folded high),
// 'rearHigh', 'prance'.  Every field can be overridden:
//   o.pose = 'rear' | { pitch, roll, yaw, shift: [x, y, z], legs: { fl, fr, hl, hr: { hoof: [x, y, z], frame: 'world' | 'body', pole: [x, y, z] } }, neck: { angle, arch, len },
//            head: { pitch, turn, tilt, open (0..1 mouth) }, tail: 'down' | 'flow' | 'ground' | 'raised' (+ tailEnd: [x, z] on the ground), ears: 'up' | 'back' }
//   o.mane = 'right' | 'left' | 'both' | 'short' | 'none' (default 'right', the strands fall to the horse's right = -x), o.bridle (default true), o.reinTo = [[x, y, z], ..] (reins to hands),
//   o.detail (0.5 .. 1.4), o.seed (strand variation), o.manaKey / o.tailKey = material keys of the hair ('main' default: the bronze is one colour; 'accent' = a second colour).
// info: { seat (a rider's hip point), pitch, head: { origin, dir, up, side }, hooves: { fl, fr, hl, hr }, withers, shoulder }.
import * as THREE from 'three';
import { Sculpt, V, ik2, hash1, loopPts } from './geom.js';

const D2R = Math.PI / 180;
const PRESETS = {
  stand: { pitch: 0, shift: [0, 0, 0], neck: { angle: 1.0, arch: 0.15, len: 0.78 }, head: { pitch: 1.05, turn: 0, tilt: 0, open: 0 }, tail: 'down', ears: 'up',
    legs: { fl: { hoof: [0.2, 0, 0.5] }, fr: { hoof: [-0.2, 0, 0.5] }, hl: { hoof: [0.2, 0, -0.62] }, hr: { hoof: [-0.2, 0, -0.62] } } },
  walk: { pitch: 0, shift: [0, 0.01, 0], neck: { angle: 0.85, arch: 0.18, len: 0.78 }, head: { pitch: 0.95, turn: 0, tilt: 0, open: 0 }, tail: 'down', ears: 'up',
    legs: { fl: { hoof: [0.2, 0, 0.42] }, fr: { hoof: [-0.2, 0.2, 0.82], pole: [0, 0.6, 0.8] }, hl: { hoof: [0.2, 0.1, -0.12] }, hr: { hoof: [-0.2, 0, -0.98] } } },
  trot: { pitch: 0.02, shift: [0, 0.02, 0], neck: { angle: 0.95, arch: 0.22, len: 0.78 }, head: { pitch: 1.0, turn: 0, tilt: 0, open: 0.05 }, tail: 'flow', ears: 'up',
    legs: { fl: { hoof: [0.2, 0.26, 0.78], pole: [0, 0.7, 0.7] }, fr: { hoof: [-0.2, 0, 0.35] }, hl: { hoof: [0.2, 0, -0.9] }, hr: { hoof: [-0.2, 0.2, -0.25] } } },
  prance: { pitch: 0.28, shift: [0, 0, 0.05], neck: { angle: 1.15, arch: 0.35, len: 0.78 }, head: { pitch: 1.2, turn: 0, tilt: 0, open: 0.1 }, tail: 'flow', ears: 'up',
    legs: { fl: { hoof: [0.2, 0.55, 0.9], pole: [0, 0.8, 0.5] }, fr: { hoof: [-0.2, 0.34, 0.75], pole: [0, 0.8, 0.5] }, hl: { hoof: [0.2, 0, -0.55] }, hr: { hoof: [-0.2, 0, -0.62] } } },
  rear: { pitch: 0.72, shift: [0, 0, 0], neck: { angle: 0.95, arch: 0.35, len: 0.78 }, head: { pitch: 1.1, turn: 0, tilt: 0, open: 0.18 }, tail: 'ground', ears: 'back',
    legs: { fl: { hoof: [0.0, -0.5, 0.38], frame: 'top', pole: [0, 0.7, 0.7] }, fr: { hoof: [0.0, -0.6, 0.3], frame: 'top', pole: [0, 0.7, 0.7] }, hl: { hoof: [0.2, 0, -0.62] }, hr: { hoof: [-0.2, 0, -0.62] } } },
  rearHigh: { pitch: 0.95, shift: [0, 0, 0], neck: { angle: 0.85, arch: 0.4, len: 0.78 }, head: { pitch: 1.15, turn: 0, tilt: 0, open: 0.3 }, tail: 'ground', ears: 'back',
    legs: { fl: { hoof: [0.0, -0.45, 0.42], frame: 'top', pole: [0, 0.7, 0.7] }, fr: { hoof: [0.0, -0.55, 0.34], frame: 'top', pole: [0, 0.7, 0.7] }, hl: { hoof: [0.2, 0, -0.5] }, hr: { hoof: [-0.2, 0, -0.5] } } },
};

const merge = (a, b) => {
  if (!b) return a;
  const o = { ...a, ...b };
  for (const k of ['neck', 'head']) o[k] = { ...a[k], ...(b[k] || {}) };
  o.legs = { ...a.legs }; for (const k of Object.keys(b.legs || {})) o.legs[k] = { ...(a.legs[k] || {}), ...b.legs[k] };
  return o;
};

export function horse(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 1 });
  const base = typeof o.pose === 'string' ? PRESETS[o.pose] : merge(PRESETS[o.pose?.base || 'stand'], o.pose);
  const spec = base || PRESETS.stand;
  const seed = o.seed ?? 0, key = 'main', dk = 'dark', hairKey = o.hairKey || 'main';
  const sg = (n) => S.seg(n), pr = (n) => Math.max(2, Math.round(n * Math.min(1, S.detail * 1.1)));

  // ---------------------------------------------------------------- body-frame transform
  const PIVOT = new THREE.Vector3(0, 1.15, -0.6);
  const M = new THREE.Matrix4().makeTranslation(spec.shift[0], spec.shift[1], spec.shift[2])
    .multiply(new THREE.Matrix4().makeTranslation(PIVOT.x, PIVOT.y, PIVOT.z))
    .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(-(spec.pitch || 0), spec.yaw || 0, spec.roll || 0, 'YXZ')))
    .multiply(new THREE.Matrix4().makeTranslation(-PIVOT.x, -PIVOT.y, -PIVOT.z));
  const tv = new THREE.Vector3();
  const Tp = (p) => { tv.set(p[0], p[1], p[2]).applyMatrix4(M); return [tv.x, tv.y, tv.z]; };
  const Td = (d) => { const l = Math.hypot(d[0], d[1], d[2]); tv.set(d[0], d[1], d[2]).transformDirection(M); return [tv.x * l, tv.y * l, tv.z * l]; };    // rotates a vector, keeps its length
  const T3 = (pts) => pts.map(Tp);
  const T = (path, rad, oo = {}, k = key) => S.tube(k, T3(path), rad, { seg: sg(12), per: pr(4), ...oo });
  const B = (c, r, oo = {}, k = key) => S.blob(k, Tp(c), r, { w: sg(12), h: sg(8), ...oo, dir: oo.dir ? Td(oo.dir) : Td([0, 0, 1]), ref: oo.ref ? Td(oo.ref) : Td([1, 0, 0]) });
  const BB = (p, q, ra, rb, oo = {}, k = key) => S.blobBetween(k, Tp(p), Tp(q), ra, rb, { w: sg(12), h: sg(8), ...oo, ref: Td([1, 0, 0]) });
  const info = { pitch: spec.pitch || 0 };

  // ---------------------------------------------------------------- torso, croup, shoulders, belly
  T([[0, 1.14, -0.98], [0, 1.2, -0.62], [0, 1.2, -0.12], [0, 1.18, 0.38], [0, 1.1, 0.76]],
    [[0.2, 0.3], [0.25, 0.34], [0.24, 0.37], [0.24, 0.38], [0.2, 0.34]], { seg: sg(18), per: pr(7) });
  for (const s of [1, -1]) {
    BB([s * 0.17, 1.4, -0.8], [s * 0.19, 1.0, -0.66], 0.1, 0.15);                       // haunch (gluteal mass)
    BB([s * 0.17, 1.38, 0.5], [s * 0.2, 1.0, 0.58], 0.085, 0.14);                         // shoulder
    B([s * 0.12, 0.92, 0.7], [0.09, 0.17, 0.13], { dir: [0, 0, 1] });                     // pectoral
    BB([s * 0.19, 1.1, -0.12], [s * 0.2, 0.9, 0.08], 0.06, 0.09);                         // flank
    B([s * 0.09, 1.52, -0.82], [0.1, 0.08, 0.17], { dir: [0, -0.2, 1] });                // croup ridge
  }
  B([0, 0.98, 0.72], [0.18, 0.26, 0.17]);                                                   // breast
  B([0, 0.9, 0.0], [0.2, 0.1, 0.45], { dir: [0, 0, 1] });                               // belly
  B([0, 1.5, 0.42], [0.09, 0.1, 0.2], { dir: [0, -0.3, 1] });                              // withers

  // ---------------------------------------------------------------- neck and head
  const nk = spec.neck, hd = spec.head;
  const N0 = [0, 1.28, 0.55], neckP = [N0];
  { let p = N0; const segLen = nk.len / 3;
    for (let i = 0; i < 3; i++) { const a = nk.angle + nk.arch * (1 - i); p = [0, p[1] + Math.sin(a) * segLen, p[2] + Math.cos(a) * segLen]; neckP.push(p); } }
  const neckR = [[0.17, 0.27], [0.14, 0.22], [0.11, 0.165], [0.09, 0.125]];
  T(neckP, neckR, { seg: sg(14), per: pr(6) });
  for (const s of [1, -1]) BB([s * 0.12, neckP[0][1] + 0.1, neckP[0][2] + 0.0], [s * 0.1, neckP[2][1] - 0.06, neckP[2][2] - 0.04], 0.07, 0.1);        // neck muscle
  // head frame (in the body frame): origin = poll
  const neckTop = neckP[3];
  const O = [neckTop[0], neckTop[1] + 0.045, neckTop[2] - 0.02];
  const ct = Math.cos(hd.turn || 0), st = Math.sin(hd.turn || 0), hp = hd.pitch;
  const dir = V.unit([st * Math.cos(hp), -Math.sin(hp), ct * Math.cos(hp)]), side0 = [ct, 0, -st];
  let up = V.cross(dir, side0);
  let side = side0;
  if (hd.tilt) { const c = Math.cos(hd.tilt), s2 = Math.sin(hd.tilt); const u2 = V.add(V.mul(up, c), V.mul(side, s2)), s3 = V.add(V.mul(side, c), V.mul(up, -s2)); up = u2; side = s3; }
  const H = (x, y, z) => V.add(V.add(V.add(O, V.mul(side, x)), V.mul(up, y)), V.mul(dir, z));
  const Hd = (x, y, z) => V.add(V.add(V.mul(side, x), V.mul(up, y)), V.mul(dir, z));
  info.head = { origin: Tp(O), dir: Td(dir), up: Td(up), side: Td(side) };
  T([H(0, 0.03, -0.02), H(0, 0.02, 0.16), H(0, -0.03, 0.34), H(0, -0.085, 0.5), H(0, -0.105, 0.58)],
    [[0.085, 0.11], [0.098, 0.118], [0.078, 0.095], [0.056, 0.068], [0.052, 0.058]], { seg: sg(14), per: pr(6) });
  const open = hd.open || 0;
  T([H(0, -0.075, 0.08), H(0, -0.12 - 0.07 * open, 0.28), H(0, -0.135 - 0.17 * open, 0.5), H(0, -0.135 - 0.2 * open, 0.56)],
    [[0.055, 0.05], [0.048, 0.045], [0.04, 0.034], [0.036, 0.03]], { seg: sg(10), per: pr(4) });                                           // lower jaw
  if (open > 0.12) B(H(0, -0.1 - 0.05 * open, 0.4), [0.03, 0.02 + 0.05 * open, 0.12], { dir: Hd(0, -0.2, 1) }, dk);                              // dark mouth
  for (const s of [1, -1]) {
    B(H(s * 0.082, -0.05, 0.1), [0.04, 0.085, 0.1], { dir: Hd(0, -0.4, 1) });                    // cheek (masseter)
    B(H(s * 0.088, 0.04, 0.115), [0.026, 0.026, 0.03], { dir: Hd(s * 0.5, 0, 1) });               // eye
    BB(H(s * 0.09, 0.075, 0.07), H(s * 0.075, 0.062, 0.2), 0.022, 0.026);                         // brow
    B(H(s * 0.033, -0.108, 0.585), [0.022, 0.016, 0.026], { dir: Hd(0, -0.3, 1) }, dk);            // nostril
    BB(H(s * 0.05, -0.065, 0.5), H(s * 0.052, -0.1, 0.59), 0.024, 0.03);                          // flared nostril wing
    const back = spec.ears === 'back';
    T([H(s * 0.052, 0.1, -0.03), H(s * (back ? 0.07 : 0.062), back ? 0.15 : 0.18, back ? -0.1 : -0.05), H(s * (back ? 0.075 : 0.07), back ? 0.2 : 0.27, back ? -0.17 : -0.07)],
      [[0.03, 0.02], [0.026, 0.017], [0.007, 0.007]], { seg: sg(8), per: pr(3) });
  }
  B(H(0, -0.12, 0.56), [0.045, 0.034, 0.05]);                                                      // upper lip / muzzle
  T([H(0, 0.1, 0.0), H(0, 0.12, 0.08), H(0, 0.06, 0.17)], [[0.03, 0.012], [0.032, 0.012], [0.01, 0.008]], { seg: sg(6), per: pr(3) }, hairKey);   // forelock
  if (o.bridle !== false) {
    T(loopPts(H(0, -0.06, 0.45), Hd(0, -0.05, 1), 0.063, 0.074, 14), [[0.011, 0.007]], { closed: true, ref: Hd(1, 0, 0), seg: 5, rings: sg(26) });       // noseband
    T(loopPts(H(0, 0.01, 0.03), Hd(0, 0.1, 1), 0.098, 0.12, 14), [[0.011, 0.007]], { closed: true, ref: Hd(1, 0, 0), seg: 5, rings: sg(26) });            // crownpiece
    for (const s of [1, -1]) {
      T([H(s * 0.1, 0.07, 0.04), H(s * 0.108, -0.01, 0.1), H(s * 0.1, -0.08, 0.2), H(s * 0.078, -0.098, 0.4)], [[0.01, 0.006]], { seg: 5, per: pr(4) });  // cheek strap
      T(loopPts(H(s * 0.085, -0.1, 0.43), Hd(1, 0, 0), 0.026, 0.026, 8), [[0.007, 0.007]], { closed: true, ref: Hd(1, 0, 0), seg: 4, rings: sg(14) });      // bit ring
    }
    if (o.reinTo) for (const s of [1, -1]) { const h = o.reinTo[s > 0 ? 0 : Math.min(1, o.reinTo.length - 1)]; if (h) S.tube(key, [Tp(H(s * 0.085, -0.1, 0.43)), V.lerp(Tp(H(s * 0.085, -0.1, 0.43)), h, 0.5).map((v, i) => v - (i === 1 ? 0.08 : 0)), h], [[0.008, 0.008]], { seg: 4, per: 5 }); }
  }

  // ---------------------------------------------------------------- mane
  if (o.mane !== 'none') {
    const maneSide = o.mane === 'left' ? [1] : o.mane === 'both' ? [1, -1] : [-1];
    const nStr = Math.round((o.mane === 'short' ? 10 : 15) * Math.min(1.2, S.detail + 0.2));
    const neckW = neckP.map(Tp);
    const crv = new THREE.CatmullRomCurve3(neckW.map((p) => new THREE.Vector3(...p)));
    for (const ms of maneSide) for (let i = 0; i < nStr; i++) {
      const t = 0.04 + 0.92 * i / (nStr - 1), c = crv.getPoint(t), tg = crv.getTangent(t);
      const [ra, rb] = [0.15 - 0.05 * t, 0.24 - 0.11 * t];
      // crest: the neck's rear-upper side
      const sx = Td([ms, 0, 0]), back = V.unit(V.sub([0, 0, 0], [tg.x, 0, tg.z]));
      const crest = [c.x - tg.z * 0 + back[0] * rb * 0.35, c.y + rb * 0.75, c.z + back[2] * rb * 0.4];
      const w1 = hash1(i * 3.1 + seed), w2 = hash1(i * 5.7 + seed + 1), len = (o.mane === 'short' ? 0.18 : 0.42) + 0.16 * (hash1(i * 1.7 + seed + 4) * 0.5 + 0.5) - 0.12 * t;
      const out = ra * 0.9;
      const p1 = [crest[0] + sx[0] * out * 0.8, crest[1] - 0.02, crest[2] - 0.03], p2 = [p1[0] + sx[0] * 0.07 + 0.015 * w1, p1[1] - len * 0.45, p1[2] - 0.04 + 0.02 * w2], p3 = [p2[0] + sx[0] * 0.04 + 0.02 * w2, p2[1] - len * 0.5, p2[2] + 0.02 * w1];
      S.tube(hairKey, [crest, p1, p2, p3], [[0.035, 0.026], [0.045, 0.028], [0.04, 0.026], [0.012, 0.01]], { seg: 6, per: pr(3), ref: [0, 0, 1] });
    }
  }

  // ---------------------------------------------------------------- legs
  const FL = { fl: [0.2, 1.02, 0.5, 1], fr: [-0.2, 1.02, 0.5, 1], hl: [0.2, 1.2, -0.7, 0], hr: [-0.2, 1.2, -0.7, 0] };
  info.hooves = {};
  for (const lk of ['fl', 'fr', 'hl', 'hr']) {
    const leg = spec.legs[lk], fore = FL[lk][3] === 1;
    const top = Tp(FL[lk].slice(0, 3));
    const hoof = leg.frame === 'body' ? Tp(leg.hoof) : leg.frame === 'top' ? V.add(top, leg.hoof) : leg.hoof.slice();
    info.hooves[lk] = hoof;
    const pas = leg.frame === 'body' ? Td([0, 0.115, -0.05]) : leg.frame === 'top' ? [0, 0.1, -0.06] : [0, 0.115, -0.05];
    const fet = V.add(hoof, pas);
    const pole = leg.pole ? (leg.frame === 'body' ? Td(leg.pole) : leg.pole) : (fore ? [0, 0, 1] : [0, -0.15, -1]);
    const s = lk[1] === 'l' ? 1 : -1;
    let path, rad;
    if (fore) {
      const knee = ik2(top, fet, 0.52, 0.34, pole);
      path = [top, V.lerp(top, knee, 0.5), knee, V.lerp(knee, fet, 0.5), fet, V.lerp(fet, hoof, 0.55), V.add(hoof, [0, 0.03, 0])];
      rad = [[0.1, 0.14], [0.085, 0.115], [0.052, 0.068], [0.04, 0.05], [0.048, 0.056], [0.058, 0.066], [0.078, 0.088]];
      S.blobBetween(key, V.lerp(top, knee, 0.15), V.lerp(top, knee, 0.55), 0.09, 0.115, { w: sg(10), h: sg(7), ref: Td([1, 0, 0]) });          // forearm muscle
      S.blob(key, knee, [0.058, 0.07, 0.075], { w: sg(9), h: sg(6), dir: V.sub(fet, top) });                                                      // knee
    } else {
      const stifle = V.add(top, V.mul(V.unit(leg.stifleDir || [0, -0.8, 0.58]), 0.4));
      const hock = ik2(stifle, fet, 0.44, 0.38, pole);
      path = [top, V.lerp(top, stifle, 0.5), stifle, V.lerp(stifle, hock, 0.5), hock, V.lerp(hock, fet, 0.5), fet, V.lerp(fet, hoof, 0.55), V.add(hoof, [0, 0.03, 0])];
      rad = [[0.16, 0.19], [0.14, 0.18], [0.11, 0.15], [0.075, 0.115], [0.055, 0.1], [0.04, 0.056], [0.047, 0.055], [0.058, 0.066], [0.08, 0.09]];
      S.blob(key, V.add(stifle, Td([0, 0.02, 0.07])), [0.08, 0.1, 0.1], { w: sg(10), h: sg(7), dir: Td([0, -0.2, 1]) });                            // stifle (kneecap)
      S.blobBetween(key, V.add(hock, Td([0, 0.06, -0.03])), V.add(hock, Td([0, -0.05, -0.07])), 0.04, 0.05, { w: sg(8), h: sg(6), ref: Td([1, 0, 0]) });   // point of the hock
      S.tube(key, [V.add(hock, [0, 0.08, -0.06]), V.add(V.lerp(hock, fet, 0.45), Td([0, 0, -0.045])), V.add(fet, Td([0, 0.04, -0.045]))], [[0.02, 0.016], [0.018, 0.014], [0.015, 0.012]], { seg: 5, per: 3 });   // flexor tendon
    }
    S.tube(key, path, rad, { seg: sg(11), per: pr(3), cap: false });
    S.tube(key, [path[path.length - 3], path[path.length - 2], path[path.length - 1]], [[0.055, 0.062], [0.07, 0.078], [0.08, 0.09]], { seg: sg(10), per: pr(2), cap: false });   // hoof wall
    S.blob(key, V.add(hoof, [0, 0.03, 0.0]), [0.082, 0.03, 0.09], { w: sg(10), h: 5 });
    S.blob(dk, V.add(hoof, [0, 0.002, 0.0]), [0.074, 0.008, 0.08], { w: sg(8), h: 4 });
  }

  // ---------------------------------------------------------------- tail
  const root = Tp([0, 1.38, -0.96]), back = V.unit(Td([0, 0, -1])), tail = o.tail || spec.tail;
  const strands = Math.max(3, Math.round(6 * Math.min(1.2, S.detail + 0.3)));
  const tailPath = (dx, k) => {
    let pts;
    if (tail === 'ground') {
      const end = spec.tailEnd || [root[0], root[2] - 1.15];
      const ey = 0.08;
      pts = [root, V.add(root, V.add(V.mul(back, 0.2), [0, -0.1, 0])), [(root[0] + end[0]) / 2 + back[0] * 0.2, (root[1] + ey) / 2 + 0.15, root[2] + (end[1] - root[2]) * 0.55], [end[0] + dx * 0.4, ey + 0.08, end[1] - 0.02], [end[0] + dx, ey, end[1]]];
    } else if (tail === 'flow') {
      pts = [root, V.add(root, V.add(V.mul(back, 0.28), [0, -0.1, 0])), V.add(root, V.add(V.mul(back, 0.62), [dx * 0.4, -0.3, 0])), V.add(root, V.add(V.mul(back, 0.95), [dx, -0.62 - 0.1 * k, 0]))];
    } else if (tail === 'raised') {
      pts = [root, V.add(root, V.add(V.mul(back, 0.2), [0, 0.12, 0])), V.add(root, V.add(V.mul(back, 0.42), [dx * 0.4, 0.1, 0])), V.add(root, V.add(V.mul(back, 0.62), [dx, -0.2, 0]))];
    } else {
      pts = [root, V.add(root, V.add(V.mul(back, 0.18), [0, -0.1, 0])), V.add(root, V.add(V.mul(back, 0.3), [dx * 0.4, -0.5, 0])), V.add(root, V.add(V.mul(back, 0.33), [dx, -1.0 - 0.06 * k, 0]))];
    }
    return pts;
  };
  if (tail !== 'none') {
  T([[0, 1.37, -0.93], [0, 1.37, -1.0]], [[0.06, 0.06], [0.055, 0.055]], { seg: sg(8), per: 2 });                                     // dock
  S.tube(hairKey, tailPath(0, 0), [[0.065, 0.07], [0.1, 0.11], [0.12, 0.13], [0.09, 0.1], [0.03, 0.04]].slice(0, tailPath(0, 0).length), { seg: sg(10), per: pr(5), bump: (t, th) => 1 + 0.1 * Math.sin(4 * th + 9 * t) * (0.3 + t) });
  for (let i = 0; i < strands; i++) {
    const dx = (i - (strands - 1) / 2) * 0.05 + 0.02 * hash1(i + seed), pts = tailPath(dx, i % 3);
    const r = [[0.05, 0.06], [0.06, 0.07], [0.055, 0.06], [0.04, 0.045], [0.012, 0.012]].slice(0, pts.length);
    S.tube(hairKey, pts, r, { seg: 6, per: pr(4) });
  }
  }

  info.seat = Tp([0, 1.5, -0.05]);
  info.withers = Tp([0, 1.55, 0.45]);
  info.shoulder = { l: Tp([0.28, 1.2, 0.5]), r: Tp([-0.28, 1.2, 0.5]) };
  info.bodyDir = Td([0, 0, 1]); info.bodyUp = Td([0, 1, 0]);
  return S.finish(info);
}
