// lib/figures/creatures.js - animals and wings of the figure kit: the LION (standing, walking with a paw on a ball, seated), the GRIFFIN of the Bankovsky footbridge (a seated winged lion with a
// lamp rod), feathered WINGS (folded / half / spread) for angels, Victories and griffins, the SERPENT and a Bactrian CAMEL.  Same technique as the horse: lofted tubes with smooth normals + muscle blobs,
// two-bone IK legs, a body frame that can be pitched.  Faces +z, stands on y = 0, +x is the left side.  Real size: lion 1.1 m at the shoulder, 2.0 m long without the tail.
//
// lion(o): o.pose 'stand' | 'walk' | 'sit' | { ... }; o.head { turn, pitch, open, tilt } (turn > 0 = to the left); o.mane (0..1.3 size, default 1; 0 = a lioness / griffin cub), o.ball (a paw rests on a ball:
//   the ball is key 'accent'), o.tail 'down' | 'curl' | 'up' | 'out', o.beard (a goatee under the chin, for griffins), o.detail.  info: head, paws, ball.
// wings: addWing(S, { root: [x, y, z], side: +1 | -1, pose: 'folded' | 'half' | 'spread' | 'raised', span (m), key, feather (the material key of the quills, default same), tilt }) adds to the Sculpt S.
// griffin(o) = lion sit + two gilded wings (key 'accent'), o.lamp: the rod / rings are left to the host (info.head gives the crown point).
// serpent(path, r, o): a segmented snake tube along a path with a head at the end (key 'main' unless o.key).
import * as THREE from 'three';
import { Sculpt, V, ik2, hash1, loopPts } from './geom.js';

const T0 = new THREE.Vector3();

export function lion(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 1 });
  const key = 'main', pose = typeof o.pose === 'string' ? o.pose : (o.pose?.base || 'stand');
  const sit = pose === 'sit', walk = pose === 'walk' || o.ball;
  const sg = (n) => S.seg(n), pr = (n) => Math.max(2, Math.round(n * Math.min(1, S.detail * 1.1)));
  const maneS = o.mane ?? 1;
  const hd = { turn: 0, pitch: sit ? 0.0 : 0.25, open: 0, tilt: 0, ...(o.head || {}) };
  const pitch = sit ? 0.62 : 0;
  const PIV = new THREE.Vector3(0, sit ? 0.3 : 0.85, -0.45);
  const M = new THREE.Matrix4().makeTranslation(PIV.x, PIV.y, PIV.z).multiply(new THREE.Matrix4().makeRotationX(-pitch)).multiply(new THREE.Matrix4().makeTranslation(-PIV.x, -PIV.y, -PIV.z));
  const Tp = (p) => { T0.set(p[0], p[1], p[2]).applyMatrix4(M); return [T0.x, T0.y, T0.z]; };
  const Td = (d) => { const l = Math.hypot(d[0], d[1], d[2]); T0.set(d[0], d[1], d[2]).transformDirection(M); return [T0.x * l, T0.y * l, T0.z * l]; };
  const info = {};
  const Tu = (path, rad, oo = {}, k = key) => S.tube(k, path.map(Tp), rad, { seg: sg(12), per: pr(4), ...oo });
  const Bl = (c, r, oo = {}, k = key) => S.blob(k, Tp(c), r, { w: sg(10), h: sg(7), ...oo, dir: oo.dir ? Td(oo.dir) : Td([0, 0, 1]), ref: Td([1, 0, 0]) });
  const BB = (p, q, ra, rb, oo = {}, k = key) => S.blobBetween(k, Tp(p), Tp(q), ra, rb, { w: sg(10), h: sg(7), ...oo, ref: Td([1, 0, 0]) });

  // ---------------------------------------------------------------- body: deep chest, tucked waist, broad haunches
  const y0 = 0.82;
  Tu([[0, y0 - 0.02, -0.62], [0, y0, -0.35], [0, y0 - 0.03, -0.0], [0, y0 + 0.0, 0.3], [0, y0 + 0.02, 0.55]],
    [[0.23, 0.25], [0.24, 0.26], [0.19, 0.22], [0.27, 0.31], [0.28, 0.33]], { seg: sg(16), per: pr(6) });
  for (const s of [1, -1]) {
    BB([s * 0.14, y0 + 0.05, -0.5], [s * 0.17, y0 - 0.25, -0.32], 0.11, 0.17);                         // haunch
    BB([s * 0.15, y0 + 0.08, 0.4], [s * 0.18, y0 - 0.22, 0.46], 0.1, 0.16);                            // shoulder blade
    Bl([s * 0.1, y0 - 0.1, 0.62], [0.09, 0.2, 0.14]);                                                    // pectoral
  }
  Bl([0, y0 - 0.2, 0.52], [0.2, 0.25, 0.25]);                                                           // chest
  Bl([0, y0 - 0.17, -0.02], [0.15, 0.13, 0.35]);                                                        // belly
  // ---------------------------------------------------------------- legs
  info.paws = {};
  const stance = sit ? { fl: [0.15, 0, 0.0], fr: [-0.15, 0, 0.0], hl: [0.2, 0, 0.1], hr: [-0.2, 0, 0.1] }
    : walk ? { fl: [0.17, 0, 0.62], fr: [-0.17, 0, 0.86], hl: [0.17, 0, -0.5], hr: [-0.17, 0, -0.78] }
      : { fl: [0.17, 0, 0.62], fr: [-0.17, 0, 0.62], hl: [0.17, 0, -0.55], hr: [-0.17, 0, -0.55] };
  const raise = o.ball ? { fr: 0.1 } : {};
  const tops = { fl: [0.19, y0 + 0.0, 0.45], fr: [-0.19, y0 + 0.0, 0.45], hl: [0.19, y0 + 0.0, -0.5], hr: [-0.19, y0 + 0.0, -0.5] };
  for (const lk of ['fl', 'fr', 'hl', 'hr']) {
    const fore = lk[0] === 'f';
    const top = Tp(tops[lk]), paw = V.add(stance[lk], [0, (raise[lk] || 0), 0]);
    const ankle = V.add(paw, [0, 0.09, fore ? -0.03 : -0.02]);
    let path, rad;
    if (fore) {
      const el = ik2(top, ankle, 0.4, 0.38, [0, 0.0, -1]);
      path = [top, V.lerp(top, el, 0.5), el, V.lerp(el, ankle, 0.5), ankle, V.add(paw, [0, 0.03, 0.03])];
      rad = [[0.13, 0.16], [0.115, 0.145], [0.088, 0.1], [0.07, 0.08], [0.082, 0.09], [0.09, 0.1]];
    } else {
      const sdir = sit ? [0, 0.15, 1] : [0, -0.5, 0.86];
      const stifle = V.add(top, V.mul(V.unit(sdir), 0.34));
      const hock = ik2(stifle, ankle, 0.38, 0.36, sit ? [0, 1, -0.2] : [0, -0.1, -1]);
      path = [top, V.lerp(top, stifle, 0.5), stifle, V.lerp(stifle, hock, 0.5), hock, V.lerp(hock, ankle, 0.5), ankle, V.add(paw, [0, 0.03, 0.03])];
      rad = [[0.17, 0.2], [0.15, 0.18], [0.12, 0.14], [0.09, 0.105], [0.072, 0.082], [0.066, 0.074], [0.076, 0.084], [0.086, 0.098]];
    }
    S.tube(key, path, rad, { seg: sg(10), per: pr(3), cap: false });
    const pc = V.add(paw, [0, 0.04, 0.06]);
    S.blob(key, pc, [0.078, 0.045, 0.115], { w: sg(10), h: 6, dir: [0, 0, 1], ref: [1, 0, 0] });
    for (let i = -1; i <= 1; i++) S.blob(key, V.add(pc, [i * 0.036, -0.008, 0.095]), [0.027, 0.028, 0.032], { w: 6, h: 5 });     // toes
    info.paws[lk] = paw;
  }
  if (o.ball) {                                                                                        // a ball under the right forepaw
    const bp = V.add(stance.fr, [0, 0.0, 0.0]);
    S.blob('accent', [bp[0], 0.14, bp[2] + 0.05], [0.15, 0.15, 0.15], { w: sg(14), h: sg(10) });
    info.ball = [bp[0], 0.14, bp[2] + 0.05];
  }
  // ---------------------------------------------------------------- neck, mane, head
  const neckA = [0, y0 + 0.08, 0.5], neckB = [0, y0 + (sit ? 0.28 : 0.2), 0.85];
  Tu([neckA, V.lerp(neckA, neckB, 0.5), neckB], [[0.26, 0.3], [0.23, 0.26], [0.2, 0.22]], { seg: sg(14), per: pr(5) });
  const hb = Tp(V.add(neckB, [0, 0.02, 0.1]));                                                         // head origin (middle of the skull)
  const ct = Math.cos(hd.turn), st = Math.sin(hd.turn), hp = hd.pitch;
  const bodyPitchComp = sit ? -pitch + 0.05 : 0;                                                       // keep the head level when the body sits up
  const dir = V.unit([st * Math.cos(hp), -Math.sin(hp + bodyPitchComp * 0.0), ct * Math.cos(hp)]);
  let side = [ct, 0, -st], up = V.cross(dir, side);
  if (hd.tilt) { const c = Math.cos(hd.tilt), s2 = Math.sin(hd.tilt); const u2 = V.add(V.mul(up, c), V.mul(side, s2)), s3 = V.add(V.mul(side, c), V.mul(up, -s2)); up = u2; side = s3; }
  // when sitting up the world frame of the head is the world frame itself (the head frame was not pitched with the body)
  const HS = o.headScale ?? 1.3;
  const HF = (x, y, z) => V.add(V.add(V.add(hb, V.mul(side, x * HS)), V.mul(up, y * HS)), V.mul(dir, z * HS));
  const Hd = (x, y, z) => V.add(V.add(V.mul(side, x), V.mul(up, y)), V.mul(dir, z));
  info.head = { origin: hb, dir, up, side };
  const hbl = (c, r, d, k = key, w = 10, h = 7) => S.blob(k, HF(...c), [r[0] * HS, r[1] * HS, r[2] * HS], { dir: d ? Hd(...d) : dir, ref: side, w: sg(w), h: sg(h) });
  hbl([0, 0.0, 0.0], [0.135, 0.125, 0.16], [0, 0, 1], key, 12, 9);                                      // cranium
  S.tube(key, [HF(0, -0.01, 0.08), HF(0, -0.045, 0.21), HF(0, -0.06, 0.3), HF(0, -0.055, 0.35)], [[0.1 * HS, 0.085 * HS], [0.088 * HS, 0.072 * HS], [0.075 * HS, 0.06 * HS], [0.066 * HS, 0.052 * HS]], { seg: sg(12), per: pr(4), ref: side });   // muzzle
  hbl([0, -0.03, 0.36], [0.046, 0.03, 0.034], [0, -0.2, 1]);                                            // nose pad
  const open = hd.open || 0;
  S.tube(key, [HF(0, -0.1, 0.06), HF(0, -0.112 - 0.05 * open, 0.2), HF(0, -0.1 - 0.1 * open, 0.31)], [[0.082 * HS, 0.045 * HS], [0.07 * HS, 0.036 * HS], [0.056 * HS, 0.028 * HS]], { seg: sg(10), per: pr(4), ref: side });  // lower jaw
  if (open > 0.1) hbl([0, -0.075 - 0.04 * open, 0.2], [0.05, 0.02 + 0.04 * open, 0.1], [0, -0.1, 1], 'dark', 8, 6);                // dark mouth
  for (const s of [1, -1]) {
    hbl([s * 0.1, -0.05, 0.14], [0.052, 0.06, 0.1], [s * 0.3, -0.2, 1]);                                // cheek / whisker pad
    hbl([s * 0.068, 0.05, 0.15], [0.052, 0.024, 0.045], [s * 0.2, 0.3, 1]);                             // heavy brow
    hbl([s * 0.062, 0.03, 0.185], [0.02, 0.015, 0.016], [s * 0.2, 0, 1], 'dark', 6, 5);                 // eye
    hbl([s * 0.105, 0.115, -0.03], [0.04, 0.045, 0.025], [s * 0.3, 0.3, 0.7]);                          // ear
    hbl([s * 0.03, -0.012, 0.35], [0.014, 0.012, 0.012], [0, 0, 1], 'dark', 5, 4);                      // nostril
  }
  hbl([0, 0.045, 0.2], [0.032, 0.03, 0.09], [0, -0.2, 1]);                                              // nose bridge ridge
  if (o.beard) S.tube(key, [HF(0, -0.12, 0.2), HF(0, -0.2, 0.17), HF(0, -0.27, 0.14)], [[0.04, 0.04], [0.04, 0.05], [0.015, 0.02]], { seg: sg(8), per: 3, ref: side });
  // mane: shaggy tongues round the head and over the neck and chest (a lioness / griffin cub has none)
  if (maneS > 0.05) {
    const nT = Math.round((o.maneCount ?? 40) * Math.min(1.2, S.detail + 0.2) * Math.min(1, 0.4 + maneS));
    for (let i = 0; i < nT; i++) {
      const a = (i / nT) * Math.PI * 2 + 0.2 * hash1(i), ring = i % 2;
      const r0 = 0.17 + 0.03 * ring, c = [Math.cos(a) * r0 * 1.0, Math.sin(a) * r0 * 0.95, 0.0 - 0.07 * ring];
      if (Math.sin(a) < -0.65 && !o.fullMane) continue;
      const len = (0.17 + 0.1 * (hash1(i * 3.3) * 0.5 + 0.5) + 0.07 * ring) * maneS;
      const p0 = HF(c[0], c[1], c[2]), out = V.unit(Hd(c[0], c[1], 0)), p1 = V.add(V.add(V.add(p0, V.mul(out, len * 0.35)), V.mul(Hd(0, 0, -1), len * 0.6)), [0, -len * 0.55, 0]);
      S.blobBetween(key, p0, p1, 0.045 * maneS + 0.012, 0.028 * maneS + 0.01, { w: 6, h: 4, k: 1.1, ref: up });
    }
    // chest ruff: tongues hanging from the throat and chest
    for (let i = 0; i < Math.round(12 * Math.min(1.2, S.detail + 0.2)); i++) {
      const t = i / 11, a = (t - 0.5) * 2.2, p0 = V.add(V.add(hb, V.mul(side, Math.sin(a) * 0.16)), V.mul(up, -0.09 - 0.02 * Math.cos(a))), p1 = V.add(p0, [Math.sin(a) * 0.04, -0.2 * maneS - 0.06 * hash1(i), -0.04 + 0.03 * hash1(i + 4)]);
      S.blobBetween(key, p0, p1, 0.05 * maneS + 0.01, 0.03 * maneS + 0.01, { w: 6, h: 4, ref: side });
    }
  }
  // ---------------------------------------------------------------- tail
  const root = Tp([0, y0 + 0.0, -0.66]), tl = o.tail || (sit ? 'curl' : walk ? 'out' : 'down');
  let tp;
  if (sit) tp = [root, [root[0] + 0.0, 0.1, root[2] - 0.12], [0.22, 0.04, root[2] - 0.05], [0.4, 0.07, 0.05], [0.42, 0.18, 0.2]];
  else if (tl === 'up') tp = [root, [root[0], root[1] + 0.2, root[2] - 0.2], [root[0] + 0.05, root[1] + 0.5, root[2] - 0.2], [root[0] + 0.2, root[1] + 0.65, root[2] - 0.05]];
  else if (tl === 'out') tp = [root, [root[0], root[1] - 0.05, root[2] - 0.3], [root[0] + 0.05, root[1] - 0.2, root[2] - 0.62], [root[0] + 0.0, root[1] - 0.12, root[2] - 0.92], [root[0] - 0.1, root[1] + 0.05, root[2] - 1.05]];
  else tp = [root, [root[0], root[1] - 0.2, root[2] - 0.15], [root[0], root[1] - 0.55, root[2] - 0.2], [root[0] + 0.05, 0.12, root[2] - 0.12]];
  const tr = tp.length === 5 ? [[0.055, 0.055], [0.05, 0.05], [0.045, 0.045], [0.04, 0.04], [0.035, 0.035]] : [[0.055, 0.055], [0.05, 0.05], [0.045, 0.045], [0.04, 0.04]];
  S.tube(key, tp, tr, { seg: sg(8), per: pr(5) });
  const te = tp[tp.length - 1], tdv = V.unit(V.sub(te, tp[tp.length - 2]));
  S.blobBetween(key, V.add(te, V.mul(tdv, -0.03)), V.add(te, V.mul(tdv, 0.2)), 0.07, 0.065, { w: sg(8), h: 6 });                                       // tail tuft
  return S.finish(info);
}

// ---------------------------------------------------------------------------------------------------------------- wings
/**
 * a feathered wing added to the collector S (call between S.push / S.pop to place it).  Local frame: root at the origin, the wing extends to +x * side; y up, z forward.
 * pose 'folded': the tips hang down along the back; 'half': raised and bent; 'spread': held out and up; 'raised': both tips up and forward.  span = the length of the wing bone chain (m).
 */
export function addWing(S, o = {}) {
  const side = o.side ?? 1, key = o.key || 'accent', bone = o.boneKey || o.key || 'accent', span = o.span ?? 1.2, root = o.root || [0, 0, 0];
  const pose = o.pose || 'folded', nP = Math.round((o.feathers ?? 11) * Math.min(1.2, S.detail + 0.3));
  // arm chain: shoulder -> wrist -> tip of the hand, per pose, in the wing frame (x outward, y up, z forward)
  const L = span;
  const P = {
    folded: [[0, 0, 0], [0.18, 0.2, -0.1], [0.28, 0.0, -0.2], [0.3, -0.5, -0.3]].map((p) => p.map((v) => v * L)),
    half: [[0, 0, 0], [0.32, 0.42, -0.1], [0.62, 0.38, -0.2], [0.78, 0.7, -0.3]].map((p) => p.map((v) => v * L)),
    spread: [[0, 0, 0], [0.4, 0.28, -0.05], [0.75, 0.42, -0.1], [1.0, 0.36, -0.15]].map((p) => p.map((v) => v * L)),
    raised: [[0, 0, 0], [0.18, 0.5, 0.0], [0.34, 0.9, 0.05], [0.4, 1.28, 0.1]].map((p) => p.map((v) => v * L)),
  }[pose] || [];
  const m = new THREE.Matrix4().makeScale(side, 1, 1);                                                  // mirror for the left wing (the Sculpt handles the flipped determinant)
  S.push(root[0], root[1], root[2], o.tilt?.[0] ?? 0, o.tilt?.[1] ?? 0, o.tilt?.[2] ?? 0);
  S.m.multiply(m);
  S.tube(bone, P, [[0.05 * L, 0.05 * L], [0.034 * L, 0.04 * L], [0.028 * L, 0.03 * L], [0.016 * L, 0.02 * L]], { seg: S.seg(8), per: 4 });          // arm bones
  S.blob(bone, P[1], [0.06 * L, 0.06 * L, 0.06 * L], { w: 8, h: 6 });                                                                          // wrist
  // the plumage: ONE lofted sheet (double sided, 8 mm thick) from the arm chain (leading edge) to the feather tips; covert step, feather grooves, scalloped tips, camber
  const curve = new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p)));
  const hang = pose === 'folded' ? [0.08, -1, -0.12] : pose === 'raised' ? [-0.5, 0.35, -0.15] : pose === 'half' ? [0.45, -0.7, -0.3] : [0.12, -0.95, -0.28];
  const fan = pose === 'folded' ? 0.04 : pose === 'raised' ? -0.6 : 0.8;
  const NU = Math.round(34 * Math.min(1.2, S.detail + 0.2)), NV = Math.max(5, Math.round(8 * Math.min(1, S.detail + 0.3))), nF = nP;
  const front = [], back = [], idx = [];
  const tg = new THREE.Vector3(), nW = new THREE.Vector3(), hvv = new THREE.Vector3();
  for (let iu = 0; iu <= NU; iu++) {
    const u = iu / NU, c = curve.getPoint(Math.min(u, 0.9999));
    curve.getTangent(Math.min(u, 0.9999), tg);
    hvv.set(hang[0] + fan * (u - 0.5), hang[1], hang[2]).normalize();
    nW.crossVectors(tg, hvv).normalize();
    const saw = (u * nF) % 1;
    const len = L * (0.3 + 0.78 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.04)), 0.8)) * (0.93 + 0.07 * (saw < 0.6 ? saw / 0.6 : 1));
    for (let iv = 0; iv <= NV; iv++) {
      const v = iv / NV;
      const groove = 0.006 * L * Math.sin(u * nF * Math.PI * 2) * Math.min(1, Math.max(0, (v - 0.3) / 0.25));
      const step = 0.012 * L * Math.min(1, Math.max(0, (v - 0.28) / 0.04)) * (v < 0.4 ? 1 : 0.0) * 0 + (v > 0.3 ? 0.008 * L : 0);
      const cam = -0.05 * L * Math.sin(Math.PI * v) * (0.4 + 0.6 * Math.sin(Math.PI * u)) + groove + step;
      const px = c.x + hvv.x * len * v + nW.x * cam, py = c.y + hvv.y * len * v + nW.y * cam, pz = c.z + hvv.z * len * v + nW.z * cam;
      const th = 0.004 * L;
      front.push(px + nW.x * th, py + nW.y * th, pz + nW.z * th); back.push(px - nW.x * th, py - nW.y * th, pz - nW.z * th);
    }
  }
  for (let iu = 0; iu < NU; iu++) for (let iv = 0; iv < NV; iv++) {
    const a0 = iu * (NV + 1) + iv, a1 = a0 + 1, b0 = a0 + (NV + 1), b1 = b0 + 1;
    idx.push(a0, a1, b0, a1, b1, b0);
  }
  const nv = front.length / 3, pos = front.concat(back), idx2 = idx.slice();
  for (let i = 0; i < idx.length; i += 3) idx2.push(nv + idx[i], nv + idx[i + 2], nv + idx[i + 1]);
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.setIndex(idx2); wg.computeVertexNormals();
  S.add(key, wg); wg.dispose();
  S.pop();
}

export function griffin(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 1 });
  const base = lion({ pose: 'sit', mane: 0, beard: true, head: { pitch: 0.0, open: 0.2, ...(o.head || {}) }, detail: o.detail ?? 1, tail: 'curl' });
  // merge the lion's geometries into the new Sculpt through its identity matrix
  for (const [k, g] of Object.entries(base.geos)) S.add(k, g);
  for (const s of [1, -1]) addWing(S, { root: [s * 0.14, 0.98, -0.12], side: s, pose: o.wings || 'half', span: 0.95, key: 'accent', boneKey: 'accent', tilt: [0.05, 0.8, 0] });
  const fig = S.finish({ ...base.info });
  return fig;
}

// ---------------------------------------------------------------------------------------------------------------- serpent
export function serpent(path, rad = 0.06, o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 1 }), key = o.key || 'main';
  const n = path.length;
  const R = path.map((_, i) => { const t = i / (n - 1); return [rad * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.1))) + 0.004, rad * 0.9 * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.1))) + 0.004]; });
  R[n - 1] = [rad * 0.55, rad * 0.45];
  S.tube(key, path, R, { seg: S.seg(10), per: 8, ref: [0, 1, 0], bump: (t, th) => 1 + 0.05 * Math.sin(t * 150) * (0.5 + 0.5 * Math.sin(th)) });
  const e = path[n - 1], d = V.unit(V.sub(e, path[n - 2]));
  S.blob(key, V.add(e, V.mul(d, rad * 0.8)), [rad * 0.9, rad * 0.6, rad * 1.4], { dir: V.add(d, [0, 0.05, 0]), w: S.seg(10), h: 7 });
  for (const s of [1, -1]) S.blob('dark', V.add(V.add(e, V.mul(d, rad * 1.1)), [s * rad * 0.5, rad * 0.35, 0]), [rad * 0.14, rad * 0.14, rad * 0.14], { w: 5, h: 4 });
  return S.finish();
}

/**
 * a Bactrian camel LYING with the legs folded under it, loaded with two packs (the bronze camel at the foot of the Przhevalsky monument): faces +z, origin on the ground under the belly,
 * ~2.1 m long, hump tops 1.15 m.  o.detail.
 */
export function camel(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 0.8 }), key = 'main', sg = (n) => S.seg(n);
  S.tube(key, [[0, 0.36, -0.9], [0, 0.4, -0.4], [0, 0.4, 0.2], [0, 0.42, 0.7]], [[0.3, 0.34], [0.36, 0.38], [0.36, 0.38], [0.3, 0.34]], { seg: sg(14), per: 5 });          // the barrel, lying
  S.blob(key, [0, 0.36, -0.82], [0.3, 0.3, 0.3], { w: sg(10), h: sg(7) });
  for (const [z, h] of [[-0.45, 0.98], [0.15, 1.04]]) {
    S.blob(key, [0, h - 0.15, z], [0.22, 0.34, 0.24], { w: sg(10), h: sg(8) });                                                                            // humps
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; S.blob(key, [Math.cos(a) * 0.13, h - 0.06 + 0.04 * Math.sin(i * 2), z + Math.sin(a) * 0.13], [0.08, 0.1, 0.08], { w: 6, h: 5 }); }   // woolly crown
  }
  S.blob(key, [0, 0.72, -0.15], [0.46, 0.2, 0.52], { w: sg(10), h: sg(7) });                                                                              // the pack saddle
  for (const s of [1, -1]) { S.blob(key, [s * 0.38, 0.55, -0.3], [0.16, 0.24, 0.3], { w: sg(10), h: sg(7) }); S.blob(key, [s * 0.38, 0.5, 0.2], [0.14, 0.2, 0.22], { w: sg(10), h: sg(7) }); }   // the bundles
  S.tube(key, [[0, 0.55, 0.62], [0, 0.78, 0.9], [0, 1.08, 1.0], [0, 1.28, 1.2], [0, 1.3, 1.46]], [[0.2, 0.22], [0.14, 0.18], [0.1, 0.14], [0.08, 0.1], [0.07, 0.09]], { seg: sg(12), per: 5, ref: [1, 0, 0] });   // the S-curved neck
  S.blob(key, [0, 1.32, 1.62], [0.075, 0.1, 0.19], { dir: [0, -0.25, 1], w: sg(10), h: sg(7) });                                                          // the head
  S.blob(key, [0, 1.25, 1.78], [0.07, 0.06, 0.08], { dir: [0, -0.3, 1], w: 8, h: 6 });                                                                     // the muzzle
  for (const s of [1, -1]) { S.blob('dark', [s * 0.062, 1.36, 1.64], [0.014, 0.014, 0.014], { w: 5, h: 4 }); S.blob(key, [s * 0.06, 1.44, 1.52], [0.025, 0.04, 0.02], { w: 6, h: 5 }); }
  for (let i = 0; i < 9; i++) S.blob(key, [0.0, 1.1 - i * 0.06 + 0.4 * (i > 4 ? 0 : 0), 0.9 + 0.04 * i], [0.07, 0.07, 0.06], { w: 5, h: 4 });                       // the throat beard / mane
  for (const s of [1, -1]) {                                                                                                                                 // folded legs: forelegs tucked forward, hind legs under the haunch
    S.tube(key, [[s * 0.3, 0.3, 0.55], [s * 0.34, 0.12, 0.85], [s * 0.3, 0.1, 1.15]], [[0.1, 0.12], [0.075, 0.08], [0.07, 0.08]], { seg: sg(8), per: 4 });
    S.blob(key, [s * 0.3, 0.07, 1.22], [0.08, 0.05, 0.11], { w: 8, h: 5 });
    S.tube(key, [[s * 0.32, 0.3, -0.7], [s * 0.4, 0.12, -0.45], [s * 0.3, 0.1, -0.1]], [[0.13, 0.14], [0.085, 0.09], [0.07, 0.08]], { seg: sg(8), per: 4 });
    S.blob(key, [s * 0.3, 0.07, -0.02], [0.08, 0.05, 0.11], { w: 8, h: 5 });
  }
  S.tube(key, [[0, 0.4, -1.1], [0, 0.3, -1.3], [0, 0.15, -1.25]], [[0.05, 0.05], [0.045, 0.045], [0.07, 0.07]], { seg: 6, per: 4 });
  return S.finish();
}
