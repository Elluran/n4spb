// lib/figures/human.js - the parametric HUMAN FIGURE of the kit: a 1.75 m standing / seated / walking man or woman built from lofted limbs + muscle blobs on an IK skeleton, with a believable face and
// hands (anatomy.js) and a clothing system (greatcoat with cape and epaulettes, uniform, tailcoat, Roman tunic + cloak, dress with mantle, bare athletic body).  Scale it with Figure.place(.., s)
// (a 4.1 m monument = s 2.34).  Faces +z, stands on y = 0, +x is the figure's LEFT.  ~6-12 k triangles at detail 1 depending on the clothing (a head with face ~1.5 k, a hand ~0.35 k).
//
// human(o) -> Figure (geos: main, dark = eyes / mouth / soles, accent = buttons, trim, medals), info.j = the joints (pelvis, chest, shoulderL/R, elbowL/R, wristL/R, hipL/R, kneeL/R, ankleL/R, headC,
// head frame, hands { L, R: { hold, f, n, t } }) so a monument can add a sword, baton, scroll, shield, cross, torch ... in the same frame.
//
// o.pose (all optional, metres in the figure frame, angles in radians):
//   pelvis [x, y, z] (default [0, 0.95, 0]; seated: y ~ 0.5)    pelvisRot [pitch, yaw, roll]  (pitch > 0 leans forward; yaw > 0 turns to the left; roll > 0 drops the left side... see rotM)
//   spine [pitch, yaw, roll] chest relative to the pelvis        head [pitch, yaw, roll] (pitch > 0 looks down, yaw > 0 turns left)
//   legs: { L, R: { foot: [x, 0, z] (ground point under the ankle), yaw (toe direction), lift (m), pole: [x, y, z] knee direction, toeUp } }
//   arms: { L, R: { hand: [x, y, z] wrist target, pole: [x, y, z] elbow direction, grip: 'relaxed'|'fist'|'hold'|'open'|'point'|'flat'|'cup', palm: [x, y, z], roll } }
// o.body: { muscle (0 soft .. 1 athletic), bulk (1), sex: 'm' | 'f', shoulders (1) }
// o.outfit: { torso: 'nude' | 'coat' | 'dress' | 'tunic' | 'cuirass' | 'robe', hem (m of coat / skirt below the pelvis centre; dress to the floor ~0.95), flare, folds, open (gap angle of the front),
//             collar: 'stand' | 'fall' | 'none', sleeves: 'long' | 'short' | 'none', trousers: 'none' | 'long' | 'breeches', boots: bool | shaft height (m), epaulettes, buttons, sash, belt,
//             medals, cape: 'none' | 'back' | 'mantle', capeLen, hat: 'none' | 'laurel' | 'crown' | 'roman' | 'plume', hatKey, clothKey, trimKey }
// o.face: passed to anatomy.face (hair, beard, age, mouth, brow, nose, jaw, eyes)
import * as THREE from 'three';
import { Sculpt, V, ik2, hash1, loopPts } from './geom.js';
import { face, hand, foot } from './anatomy.js';

const rotM = (pitch = 0, yaw = 0, roll = 0) => new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function human(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 1 });
  const pose = o.pose || {}, B = { muscle: 0.5, bulk: 1, sex: 'm', shoulders: 1, ...(o.body || {}) }, OF = { torso: 'nude', sleeves: 'none', trousers: 'none', collar: 'none', cape: 'none', hat: 'none', ...(o.outfit || {}) };
  const key = 'main', ck = OF.clothKey || 'main', tk = OF.trimKey || 'accent';
  const w = (n) => S.seg(n), pr = (n) => Math.max(2, Math.round(n * Math.min(1, S.detail * 1.1)));
  const fem = B.sex === 'f', clothed = OF.torso !== 'nude';
  const info = {};

  // ---------------------------------------------------------------- skeleton frames
  const pel = pose.pelvis || [0, 0.95, 0];
  const Rp = rotM(...(pose.pelvisRot || [0, 0, 0]));
  const sp = pose.spine || [0, 0, 0], hdA = pose.head || [0, 0, 0];
  const Rw = Rp.clone().multiply(rotM(sp[0] * 0.4, sp[1] * 0.4, sp[2] * 0.4)), Rc = Rp.clone().multiply(rotM(sp[0], sp[1], sp[2]));
  const Rn = Rc.clone().multiply(rotM(hdA[0] * 0.35, hdA[1] * 0.35, hdA[2] * 0.35)), Rh = Rc.clone().multiply(rotM(hdA[0], hdA[1], hdA[2]));
  const v3 = new THREE.Vector3();
  const loc = (R, q) => { v3.set(q[0], q[1], q[2]).applyMatrix4(R); v3.x += 0; return [v3.x + pel[0], v3.y + pel[1], v3.z + pel[2]]; };
  const dirv = (R, q) => { const l = Math.hypot(q[0], q[1], q[2]); v3.set(q[0], q[1], q[2]).transformDirection(R); return [v3.x * l, v3.y * l, v3.z * l]; };    // rotates a vector, keeps its length
  const sh = B.shoulders;
  const J = {
    pelvis: pel.slice(), waist: loc(Rw, [0, 0.13, 0]), chest: loc(Rc, [0, 0.33, 0]), neckBase: loc(Rc, [0, 0.52, 0]),
    shoulderL: loc(Rc, [0.19 * sh, 0.45, -0.005]), shoulderR: loc(Rc, [-0.19 * sh, 0.45, -0.005]),
    hipL: loc(Rp, [0.095, -0.02, 0]), hipR: loc(Rp, [-0.095, -0.02, 0]),
  };
  const neckTop = V.add(loc(Rc, [0, 0.52, 0]), dirv(Rn, [0, 0.075, 0.01]));
  const headC = V.add(V.add(loc(Rc, [0, 0.52, 0]), dirv(Rn, [0, 0.082, 0.012])), dirv(Rh, [0, 0.092, 0.016]));
  const HF = { c: headC, x: dirv(Rh, [1, 0, 0]), y: dirv(Rh, [0, 1, 0]), z: dirv(Rh, [0, 0, 1]) };
  J.neckTop = neckTop; J.headC = headC; J.head = HF;
  const fwdC = dirv(Rc, [0, 0, 1]), upC = dirv(Rc, [0, 1, 0]), sideC = dirv(Rc, [1, 0, 0]);
  J.chestFrame = { fwd: fwdC, up: upC, side: sideC };
  info.j = J;

  // ---------------------------------------------------------------- legs
  const LEG = {};
  for (const [side, nm] of [[1, 'L'], [-1, 'R']]) {
    const lp = (pose.legs && pose.legs[nm]) || {};
    const foot0 = lp.foot || [side * 0.1, 0, 0];
    const lift = lp.lift || 0, ankle = [foot0[0], foot0[1] + 0.075 + lift, foot0[2]];
    const hip = J['hip' + nm];
    const knee = ik2(hip, ankle, 0.43, 0.42, lp.pole || [side * 0.1, 0, 1]);
    const yaw = lp.yaw ?? side * 0.18;
    const toe = [Math.sin(yaw), 0, Math.cos(yaw)];
    LEG[nm] = { hip, knee, ankle, toe, side, up: lp.toeUp || 0 };
    J['knee' + nm] = knee; J['ankle' + nm] = ankle;
  }

  // ---------------------------------------------------------------- arms
  const ARM = {};
  for (const [side, nm] of [[1, 'L'], [-1, 'R']]) {
    const ap = (pose.arms && pose.arms[nm]) || {};
    const shd = J['shoulder' + nm];
    const wrist = ap.hand || V.add(shd, [side * 0.045, -0.53, 0.04]);
    const elbow = ik2(shd, wrist, 0.3, 0.26, ap.pole || [side * 0.5, -0.25, -0.8]);
    ARM[nm] = { shd, elbow, wrist, side, grip: ap.grip || 'relaxed', palm: ap.palm || [-side, 0, 0.15] };
    J['elbow' + nm] = elbow; J['wrist' + nm] = wrist;
  }

  // ---------------------------------------------------------------- skin: torso, neck, limbs, muscles (hidden where clothes cover them)
  const mus = B.muscle, bulk = B.bulk;
  const torsoR = fem ? [[0.15, 0.1], [0.16, 0.105], [0.125, 0.09], [0.145, 0.105], [0.17, 0.092], [0.08, 0.075]]
    : [[0.165 * bulk, 0.1 * bulk], [0.17 * bulk, 0.105 * bulk], [0.145 * bulk, 0.095 * bulk], [(0.17 + 0.012 * mus) * bulk, 0.115 * bulk], [(0.185 + 0.01 * mus) * sh, 0.1 * bulk], [0.085, 0.08]];
  const torsoP = [loc(Rp, [0, -0.11, 0]), loc(Rp, [0, 0, 0]), loc(Rw, [0, 0.13, 0]), loc(Rc, [0, 0.33, 0]), loc(Rc, [0, 0.45, 0]), loc(Rc, [0, 0.52, 0])];
  if (OF.torso === 'nude' || OF.torso === 'tunic' || OF.torso === 'robe' || OF.torso === 'cuirass') S.tube(key, torsoP, torsoR, { seg: w(16), per: pr(5) });
  S.tube(key, [loc(Rc, [0, 0.5, 0]), neckTop], [[0.053, 0.055], [0.049, 0.05]], { seg: w(10), per: 3 });                                  // neck
  const nb = (a, b, c) => loc(Rc, [a, b, c]);
  if (OF.torso === 'nude' || OF.torso === 'tunic' || OF.torso === 'robe') {
    S.blob(key, nb(0, 0.455, -0.02), [0.075, 0.03, 0.06], { dir: dirv(Rc, [0, 0.4, -1]), w: w(8), h: w(6) });                              // trapezius / nape
    for (const s of [1, -1]) {
      S.blob(key, V.add(J[s > 0 ? 'shoulderL' : 'shoulderR'], [0, 0.0, 0.0]), [0.062 * sh, 0.068, 0.06], { w: w(10), h: w(7) });          // deltoid cap
    }
  }
  if (OF.torso === 'nude' && !fem) {
    for (const s of [1, -1]) {
      S.blob(key, nb(s * 0.075, 0.375, 0.07), [0.088 * (0.9 + 0.2 * mus), 0.052, 0.05], { dir: dirv(Rc, [s * 0.15, -0.2, 1]), ref: dirv(Rc, [1, 0, 0]), w: w(10), h: w(7) });    // pectoral
      S.blob(key, nb(s * 0.105, 0.285, 0.035), [0.05, 0.07, 0.06], { dir: dirv(Rc, [s * 0.4, 0, 1]), w: w(8), h: w(6) });                      // serratus / ribs
      S.blob(key, nb(s * 0.03, 0.235, 0.088), [0.028, 0.032, 0.02], { dir: dirv(Rc, [0, 0, 1]), w: 8, h: 6 });                                // abs
      S.blob(key, nb(s * 0.03, 0.18, 0.09), [0.028, 0.03, 0.02], { dir: dirv(Rc, [0, 0, 1]), w: 8, h: 6 });
      S.blob(key, nb(s * 0.03, 0.125, 0.088), [0.027, 0.028, 0.02], { dir: dirv(Rc, [0, 0, 1]), w: 8, h: 6 });
      S.blob(key, nb(s * 0.125, 0.14, 0.04), [0.04, 0.07, 0.055], { dir: dirv(Rw, [s * 0.4, 0, 1]), w: 8, h: 6 });                             // obliques
      S.blob(key, nb(s * 0.075, 0.33, -0.065), [0.09, 0.1, 0.045], { dir: dirv(Rc, [s * 0.3, 0, -1]), w: w(8), h: w(6) });                    // back (latissimus)
      S.blob(key, nb(s * 0.07, 0.0, -0.08), [0.08, 0.075, 0.07], { dir: dirv(Rp, [s * 0.2, -0.2, -1]), w: w(8), h: w(6) });                     // gluteal
    }
  }
  if (fem && OF.torso !== 'dress') for (const s of [1, -1]) S.blob(key, nb(s * 0.07, 0.36, 0.075), [0.065, 0.06, 0.06], { dir: dirv(Rc, [s * 0.2, -0.2, 1]), w: w(9), h: w(7) });

  const bare = OF.trousers === 'none' && !OF.boots && OF.torso !== 'dress' && OF.torso !== 'robe';
  const legCloth = OF.trousers !== 'none' || OF.torso === 'dress' || OF.torso === 'robe';
  for (const nm of ['L', 'R']) {
    const { hip, knee, ankle, toe, side, up } = LEG[nm];
    const thigh = V.lerp(hip, knee, 0.5), calf = V.lerp(knee, ankle, 0.33), shin = V.lerp(knee, ankle, 0.66);
    const m = 1 + 0.12 * mus;
    if (OF.trousers === 'long') {
      S.tube(ck, [hip, thigh, knee, calf, shin, ankle], [[0.112, 0.118], [0.098, 0.1], [0.07, 0.074], [0.066, 0.072], [0.063, 0.066], [0.066, 0.068]], { seg: w(12), per: pr(4) });
    } else if (OF.trousers === 'breeches') {
      S.tube(ck, [hip, thigh, knee], [[0.112, 0.12], [0.1, 0.104], [0.062, 0.066]], { seg: w(12), per: pr(4) });
      S.tube(key, [knee, calf, ankle], [[0.056, 0.06], [0.06, 0.068], [0.04, 0.04]], { seg: w(10), per: pr(3) });
    } else if (OF.torso === 'dress' || OF.torso === 'robe') {
      S.tube(key, [knee, shin, ankle], [[0.056, 0.06], [0.05, 0.05], [0.036, 0.036]], { seg: w(9), per: 3 });
    } else {
      S.tube(key, [hip, thigh, knee, calf, shin, ankle], [[0.092 * m, 0.098 * m], [0.083 * m, 0.087 * m], [0.053, 0.058], [0.057 * m, 0.066 * m], [0.045, 0.05], [0.034, 0.036]], { seg: w(12), per: pr(4) });
      if (mus > 0.2 || bare) {
        const d = V.unit(V.sub(knee, hip));
        S.blobBetween(key, V.add(hip, V.mul(d, 0.07)), V.add(hip, V.mul(d, 0.36)), 0.056 * m, 0.062 * m, { w: w(10), h: w(7), ref: [1, 0, 0] });                                                // quadriceps
        S.blob(key, V.add(knee, [0, 0, 0.03]), [0.046, 0.05, 0.04], { dir: V.sub(ankle, hip), w: w(8), h: w(6) });                                                                     // kneecap
        const c2 = V.unit(V.sub(ankle, knee));
        S.blobBetween(key, V.add(knee, V.add(V.mul(c2, 0.04), [0, 0, -0.035])), V.add(knee, V.add(V.mul(c2, 0.26), [0, 0, -0.02])), 0.045 * m, 0.05 * m, { w: w(10), h: w(7), ref: [1, 0, 0] });   // calf
      }
    }
    const boot = OF.boots ? (typeof OF.boots === 'number' ? OF.boots : 0.34) : 0;
    foot(S, ankle, toe, side, { boot: !!boot, shaft: boot, key: OF.boots ? ck : key, soleKey: 'dark', up });
  }

  // ---------------------------------------------------------------- arms
  const sleeveLong = OF.sleeves === 'long', sleeveShort = OF.sleeves === 'short';
  for (const nm of ['L', 'R']) {
    const { shd, elbow, wrist, side, grip, palm } = ARM[nm];
    const up2 = V.lerp(shd, elbow, 0.45), fo2 = V.lerp(elbow, wrist, 0.4);
    const m = 1 + 0.12 * mus;
    if (sleeveLong) {
      S.tube(ck, [shd, up2, elbow, fo2, wrist], [[0.066, 0.068], [0.061, 0.062], [0.05, 0.052], [0.049, 0.05], [0.04, 0.04]], { seg: w(11), per: pr(4) });
      S.tube(tk, [V.lerp(elbow, wrist, 0.84), wrist], [[0.043, 0.044], [0.043, 0.044]], { seg: w(10), per: 2, cap: false });            // cuff
    } else if (sleeveShort) {
      S.tube(ck, [shd, V.lerp(shd, elbow, 0.5)], [[0.066, 0.068], [0.06, 0.062]], { seg: w(10), per: 3 });
      S.tube(key, [V.lerp(shd, elbow, 0.4), elbow, fo2, wrist], [[0.05 * m, 0.052 * m], [0.04, 0.042], [0.042 * m, 0.045 * m], [0.028, 0.025]], { seg: w(10), per: pr(3) });
    } else {
      S.tube(key, [shd, up2, elbow, fo2, wrist], [[0.054 * m, 0.057 * m], [0.049 * m, 0.052 * m], [0.039, 0.041], [0.042 * m, 0.045 * m], [0.028, 0.025]], { seg: w(11), per: pr(4) });
      if (mus > 0.2) {
        const d = V.unit(V.sub(elbow, shd));
        S.blobBetween(key, V.add(shd, V.mul(d, 0.07)), V.add(shd, V.mul(d, 0.25)), 0.048 * m, 0.05 * m, { w: w(9), h: w(6), ref: [1, 0, 0] });         // biceps / triceps
        const e2 = V.unit(V.sub(wrist, elbow));
        S.blobBetween(key, V.add(elbow, V.mul(e2, 0.03)), V.add(elbow, V.mul(e2, 0.17)), 0.042 * m, 0.04 * m, { w: w(9), h: w(6), ref: [1, 0, 0] });   // forearm muscle
      }
    }
    const H = hand(S, side, wrist, V.sub(wrist, elbow), palm, grip, { key });
    (J.hands ||= {})[nm] = H;
  }

  // ---------------------------------------------------------------- head
  face(S, HF, { hair: OF.hair ?? 'short', beard: OF.beard ?? 'none', ...(o.face || {}), skinKey: key, hairKey: (o.face && o.face.hairKey) || key });

  // ---------------------------------------------------------------- clothing
  const hemLen = OF.hem ?? 0.6, flare = OF.flare ?? 0.0, foldA = OF.folds ?? (OF.torso === 'dress' || OF.torso === 'robe' ? 0.05 : 0.025);
  const nmFolds = (t, th, ph = 0) => 1 + foldA * smooth(0.05, 0.6, t) * Math.sin(7 * th + 3 * t + ph) + foldA * 0.6 * smooth(0.2, 1, t) * Math.sin(12 * th - 5 * t + ph * 2);
  if (OF.torso === 'coat' || OF.torso === 'dress') {
    const dress = OF.torso === 'dress';
    // path from the neck down to the hem (downward: the section axis b = +z front, theta = pi/2 is the centre of the front)
    const pts = [loc(Rc, [0, 0.5, 0]), loc(Rc, [0, 0.45, 0]), loc(Rc, [0, 0.33, 0]), loc(Rw, [0, 0.13, 0]), loc(Rp, [0, 0.0, 0]), loc(Rp, [0, -0.12, 0])];
    const hemP = (f) => loc(Rp, [0, -0.12 - (hemLen - 0.12) * f, 0]);
    pts.push(hemP(0.4), hemP(0.75), hemP(1));
    const bd = dress ? (fem ? 0.9 : 1) : 1.05;
    const R = dress
      ? [[0.075, 0.072], [0.17, 0.095], [0.15, 0.115], [0.115, 0.092], [0.155, 0.115], [0.18 + 0.05 * flare, 0.14], [0.24 + 0.14 * flare, 0.2], [0.3 + 0.2 * flare, 0.26], [0.34 + 0.24 * flare, 0.3]]
      : [[0.085, 0.082], [0.205 * sh, 0.115], [0.195 * bd, 0.14], [0.17 * bd, 0.125], [0.2 * bd, 0.135], [0.215 + 0.04 * flare, 0.145], [0.225 + 0.08 * flare, 0.15], [0.232 + 0.1 * flare, 0.153], [0.238 + 0.12 * flare, 0.156]];
    const gap = OF.open || 0;
    const sector = gap > 0 ? (t) => { const g = gap * smooth(0.18, 0.4, t); return [Math.PI / 2 + g / 2, Math.PI / 2 + Math.PI * 2 - g / 2]; } : null;
    S.tube(ck, pts, R, { seg: w(28), per: pr(5), capA: !sector, capB: false, capN: 2, sector, bump: (t, th) => nmFolds(t, th, dress ? 1 : 0) });
    if (!sector) S.blob('dark', hemP(1), [R[8][0] * 0.96, 0.012, R[8][1] * 0.96], { w: w(18), h: 4 });                       // the closed underside of the hem
    if (gap > 0) {   // an inner lining panel so the opening is not hollow
      S.tube(tk, [loc(Rc, [0, 0.4, 0.0]), loc(Rc, [0, 0.2, 0.0]), loc(Rp, [0, -0.1, 0.0]), hemP(0.8)], [[0.12, 0.092], [0.115, 0.09], [0.15, 0.1], [0.17, 0.12]], { seg: w(10), per: pr(4), cap: false });
    }
  }
  if (OF.torso === 'tunic' || OF.torso === 'robe') {                      // short tunic skirt / pteruges over the thighs
    const hem = OF.hem ?? 0.3;
    const pts = [loc(Rp, [0, 0.06, 0]), loc(Rp, [0, -0.1, 0]), loc(Rp, [0, -hem, 0])];
    S.tube(ck, pts, [[0.172 * bulk, 0.115], [0.21 + 0.03 * flare, 0.14], [0.235 + 0.08 * flare, 0.16]], { seg: w(22), per: pr(5), cap: false, bump: (t, th) => nmFolds(t, th) });
  }
  if (OF.torso === 'cuirass') {
    const pts = [loc(Rc, [0, 0.5, 0]), loc(Rc, [0, 0.45, 0]), loc(Rc, [0, 0.33, 0]), loc(Rw, [0, 0.13, 0]), loc(Rp, [0, 0.0, 0])];
    S.tube(ck, pts, [[0.09, 0.085], [0.2, 0.12], [0.19, 0.135], [0.16, 0.115], [0.185, 0.125]], { seg: w(22), per: pr(5), cap: false });
    const hem = OF.hem ?? 0.3, sk = [], nSk = Math.max(8, Math.round(16 * Math.min(1, S.detail + 0.2)));
    for (let i = 0; i < nSk; i++) { const a = i / nSk * Math.PI * 2; const p0 = loc(Rp, [Math.cos(a) * 0.185, -0.02, Math.sin(a) * 0.14]), p1 = loc(Rp, [Math.cos(a) * 0.215, -hem, Math.sin(a) * 0.17]); sk.push([p0, p1, a]); }
    for (const [p0, p1] of sk) S.tube(ck, [p0, V.lerp(p0, p1, 0.5), p1], [[0.034 * 16 / nSk, 0.012], [0.036 * 16 / nSk, 0.012], [0.03 * 16 / nSk, 0.01]], { seg: 4, per: 1, ref: V.sub(p1, p0) });
  }
  // trims: collar, epaulettes, buttons, sash, belt, medals
  if (OF.collar === 'stand') S.tube(tk, [loc(Rc, [0, 0.488, 0]), loc(Rc, [0, 0.55, 0.0])], [[0.07, 0.07], [0.066, 0.064]], { seg: w(14), per: 2, cap: false });
  if (OF.collar === 'fall') { S.tube(ck, [loc(Rc, [0, 0.49, -0.01]), loc(Rc, [0, 0.545, -0.005])], [[0.074, 0.075], [0.07, 0.07]], { seg: w(14), per: 2, cap: false }); for (const s of [1, -1]) S.blob(ck, loc(Rc, [s * 0.04, 0.46, 0.1]), [0.04, 0.015, 0.05], { dir: dirv(Rc, [s * 0.5, -0.4, 1]), w: 8, h: 5 }); }
  if (OF.epaulettes) for (const nm of ['L', 'R']) {
    const s = nm === 'L' ? 1 : -1, c = V.add(J['shoulder' + nm], [0, 0.04, 0.0]), ad = V.unit(V.sub(ARM[nm].elbow, ARM[nm].shd));
    S.blob(tk, V.add(c, V.mul(ad, 0.03)), [0.05, 0.016, 0.07], { dir: V.add(V.mul(ad, 1), [0, 0.1, 0]), ref: [1, 0, 0], w: w(10), h: w(6) });
    for (let i = 0; i < 9; i++) { const a = (i - 4) / 4 * 0.04, b0 = V.add(c, V.add(V.mul(ad, 0.09), [a * s, 0.0, 0])); S.tube(tk, [b0, V.add(b0, V.add(V.mul(ad, 0.025), [0, -0.025, 0])), V.add(b0, V.add(V.mul(ad, 0.04), [0, -0.055, 0]))], [[0.008, 0.008], [0.008, 0.008], [0.005, 0.005]], { seg: 4, per: 2 }); }
  }
  if (OF.buttons && (OF.torso === 'coat')) for (const s of [1, -1]) for (let i = 0; i < 6; i++) S.blob(tk, loc(Rc, [s * 0.045, 0.43 - i * 0.07, 0.134 - 0.012 * (i > 3 ? i - 3 : 0)]), [0.0095, 0.0095, 0.007], { dir: dirv(Rc, [0, 0, 1]), w: 6, h: 4 });
  if (OF.sash) S.tube(tk, [loc(Rc, [0.17, 0.4, 0.0]), loc(Rc, [0.0, 0.34, 0.15]), loc(Rw, [-0.14, 0.13, 0.12]), loc(Rp, [-0.2, -0.04, 0.0])], [[0.025, 0.012], [0.027, 0.012], [0.027, 0.012], [0.022, 0.01]], { seg: 8, per: 5, ref: [0, 1, 0.3] });
  if (OF.belt) S.tube(tk, loopPts(loc(Rw, [0, 0.1, 0]), dirv(Rw, [0, 1, 0]), 0.168 * bulk + 0.012, 0.118 + 0.012, 14), [[0.022, 0.009]], { closed: true, ref: dirv(Rw, [0, 1, 0]), seg: 5, rings: w(28) });
  if (OF.medals) for (let i = 0; i < OF.medals; i++) { const s = i % 2 ? -1 : 1; S.blob(tk, loc(Rc, [s * (0.07 + 0.015 * (i >> 1)), 0.34 - 0.012 * (i >> 1), 0.141]), [0.016, 0.016, 0.006], { dir: dirv(Rc, [0, 0, 1]), w: 8, h: 4 }); }
  // cape / mantle hanging from the shoulders behind
  if (OF.cape === 'back' || OF.cape === 'mantle') {
    const len = OF.capeLen ?? 0.85, mantle = OF.cape === 'mantle';
    const p = [loc(Rc, [0, 0.5, -0.02]), loc(Rc, [0, 0.42, -0.12]), loc(Rc, [0, 0.24, -0.17]), loc(Rw, [0, 0.08, -0.2]), loc(Rp, [0, -0.2, -0.24]), loc(Rp, [0, -0.2 - len * 0.5, -0.28]), loc(Rp, [0, -len, -0.34])];
    const R2 = mantle ? [[0.15, 0.1], [0.3, 0.18], [0.34, 0.24], [0.36, 0.28], [0.4, 0.3], [0.45, 0.33], [0.5, 0.36]] : [[0.12, 0.08], [0.24, 0.14], [0.255, 0.18], [0.26, 0.2], [0.28, 0.22], [0.3, 0.24], [0.33, 0.26]];
    S.tube(ck, p, R2, { seg: w(30), per: pr(5), cap: false, sector: (t) => [-Math.PI / 2 - 1.8 - 0.1 * Math.sin(9 * t), -Math.PI / 2 + 1.8 + 0.1 * Math.sin(7 * t + 1)], bump: (t, th) => 1 + (0.03 + 0.05 * t) * Math.sin(5.5 * th + 3 * t) + 0.02 * t * Math.sin(9 * th - 5 * t) });
  }
  // hats
  const hk = OF.hatKey || tk;
  if (OF.hat === 'laurel') {
    S.tube(hk, loopPts(V.add(HF.c, V.mul(HF.y, 0.07)), V.add(HF.y, V.mul(HF.z, 0.05)), 0.085, 0.095, 14), [[0.011, 0.011]], { closed: true, ref: HF.y, seg: 5, rings: w(26) });
    const nLeaf = Math.max(10, Math.round(24 * Math.min(1, S.detail + 0.3)));
    for (let k = 0; k < nLeaf; k++) { const a = k / nLeaf * Math.PI * 2, r = 0.09 + 0.006 * (k % 2), c = V.add(V.add(V.add(HF.c, V.mul(HF.y, 0.07 + 0.008 * (k % 2 ? 1 : -1))), V.mul(HF.x, Math.cos(a) * r)), V.mul(HF.z, Math.sin(a) * r * 1.08 - 0.01)); S.blob(hk, c, [0.026, 0.008, 0.014], { dir: V.add(V.mul(HF.x, -Math.sin(a)), V.mul(HF.z, Math.cos(a))), ref: V.add(V.mul(HF.x, Math.cos(a)), V.mul(HF.z, Math.sin(a))), w: 6, h: 4 }); }
  }
  if (OF.hat === 'crown') {
    S.tube(hk, loopPts(V.add(HF.c, V.mul(HF.y, 0.085)), HF.y, 0.08, 0.09, 14), [[0.02, 0.012]], { closed: true, ref: HF.y, seg: 6, rings: w(26) });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, c = V.add(V.add(V.add(HF.c, V.mul(HF.y, 0.115)), V.mul(HF.x, Math.cos(a) * 0.082)), V.mul(HF.z, Math.sin(a) * 0.092)); S.blob(hk, c, [0.011, 0.024, 0.011], { dir: HF.y, w: 6, h: 5 }); S.blob(hk, V.add(c, V.mul(HF.y, 0.03)), [0.008, 0.008, 0.008], { w: 5, h: 4 }); }
  }
  if (OF.hat === 'roman') {                                                                   // crested helmet with cheek guards
    S.blob(hk, V.add(HF.c, V.add(V.mul(HF.y, 0.055), V.mul(HF.z, -0.012))), [0.088, 0.085, 0.108], { dir: HF.z, ref: HF.x, w: w(12), h: w(8) });
    for (const s of [1, -1]) S.blob(hk, V.add(HF.c, V.add(V.add(V.mul(HF.x, s * 0.072), V.mul(HF.y, -0.03)), V.mul(HF.z, 0.01))), [0.014, 0.06, 0.05], { dir: V.add(HF.z, V.mul(HF.x, s * 0.2)), ref: HF.x, w: 8, h: 6 });
    S.tube(hk, [V.add(HF.c, V.add(V.mul(HF.y, 0.14), V.mul(HF.z, 0.07))), V.add(HF.c, V.add(V.mul(HF.y, 0.2), V.mul(HF.z, 0.0))), V.add(HF.c, V.add(V.mul(HF.y, 0.14), V.mul(HF.z, -0.12))), V.add(HF.c, V.add(V.mul(HF.y, 0.03), V.mul(HF.z, -0.16)))], [[0.01, 0.025], [0.012, 0.03], [0.012, 0.03], [0.008, 0.02]], { seg: 6, per: 4, ref: HF.x });
  }
  if (OF.hat === 'plume') {                                                                   // 19th-century cuirassier helmet: bowl, peak, comb and a plume
    S.blob(hk, V.add(HF.c, V.add(V.mul(HF.y, 0.06), V.mul(HF.z, -0.01))), [0.088, 0.08, 0.104], { dir: HF.z, ref: HF.x, w: w(12), h: w(8) });
    S.blob(hk, V.add(HF.c, V.add(V.mul(HF.y, 0.085), V.mul(HF.z, 0.085))), [0.074, 0.01, 0.036], { dir: V.add(HF.z, V.mul(HF.y, -0.2)), ref: HF.x, w: 10, h: 5 });
    S.tube(hk, [V.add(HF.c, V.add(V.mul(HF.y, 0.12), V.mul(HF.z, 0.06))), V.add(HF.c, V.add(V.mul(HF.y, 0.15), V.mul(HF.z, 0.0))), V.add(HF.c, V.add(V.mul(HF.y, 0.11), V.mul(HF.z, -0.1)))], [[0.01, 0.014], [0.012, 0.018], [0.01, 0.016]], { seg: 6, per: 4, ref: HF.x });
    S.tube(hk, [V.add(HF.c, V.add(V.mul(HF.y, 0.165), V.mul(HF.z, -0.01))), V.add(HF.c, V.add(V.mul(HF.y, 0.25), V.mul(HF.z, -0.06))), V.add(HF.c, V.add(V.mul(HF.y, 0.27), V.mul(HF.z, -0.17))), V.add(HF.c, V.add(V.mul(HF.y, 0.2), V.mul(HF.z, -0.26)))], [[0.016, 0.03], [0.026, 0.04], [0.025, 0.036], [0.01, 0.014]], { seg: 8, per: 5, ref: HF.x });
  }
  return S.finish(info);
}

/**
 * bust(o): a head-and-shoulders portrait bust for a plinth, origin at the bottom cut (y = 0), faces +z, ~0.62 m tall at scale 1 (a plinth bust of ~0.9 m = place scale 1.45).
 * o: style 'civil' (frock coat with lapels and a cravat) | 'uniform' (stand collar, epaulettes, orders) | 'bare' (classical, bare shoulders with a drape) | 'robe', face (anatomy.face options), turn / pitch / roll
 * of the head (radians), detail, key.  Used for the busts of the Alexander Garden (Gogol, Glinka, Lermontov, Gorchakov, Zhukovsky) and Przhevalsky.
 */
export function bust(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 0.8 }), key = o.key || 'main', w = (n) => S.seg(n), st = o.style || 'civil';
  const yaw = o.turn ?? 0.15, pit = o.pitch ?? 0.05, rol = o.roll ?? 0;
  const R = rotM(pit, yaw, rol), v3 = new THREE.Vector3();
  const dv = (q) => { v3.set(q[0], q[1], q[2]).applyMatrix4(R); return [v3.x, v3.y, v3.z]; };
  const HC = V.add([0, 0.545, 0.02], dv([0, 0.0, 0]));
  const HF = { c: HC, x: dv([1, 0, 0]), y: dv([0, 1, 0]), z: dv([0, 0, 1]) };
  const wide = st === 'bare' ? 1.0 : 1.08;
  S.tube(key, [[0, -0.02, 0], [0, 0.12, 0], [0, 0.26, 0], [0, 0.34, 0]], [[0.2 * wide, 0.115], [0.21 * wide, 0.12], [0.2 * wide, 0.105], [0.085, 0.08]], { seg: w(18), per: 4, capA: false });
  S.tube(key, [[0, 0.3, 0], V.add([0, 0.34, 0.0], dv([0, 0.0, 0]))], [[0.056, 0.058], [0.052, 0.054]], { seg: w(10), per: 3 });
  S.tube(key, [[0, 0.32, 0], [0, 0.42, 0.005]], [[0.056, 0.058], [0.05, 0.052]], { seg: w(10), per: 3 });
  for (const s of [1, -1]) S.blob(key, [s * 0.19 * wide, 0.26, -0.005], [0.048, 0.058, 0.062], { w: w(10), h: w(7) });
  if (st === 'civil') {
    for (const s of [1, -1]) S.blobBetween(key, [s * 0.03, 0.34, 0.1], [s * 0.1, 0.1, 0.12], 0.03, 0.025, { w: 8, h: 6, ref: [1, 0, 0] });          // lapels
    S.blob(key, [0, 0.36, 0.1], [0.06, 0.05, 0.04], { w: w(8), h: w(6) });                                                                          // cravat
    S.tube(key, [[0, 0.3, 0.0], [0, 0.35, 0.005]], [[0.075, 0.075], [0.07, 0.07]], { seg: w(12), per: 2, cap: false });                              // collar
  } else if (st === 'uniform') {
    S.tube('accent', [[0, 0.3, 0.0], [0, 0.375, 0.005]], [[0.078, 0.078], [0.072, 0.072]], { seg: w(12), per: 2, cap: false });
    for (const s of [1, -1]) { S.blob('accent', [s * 0.2, 0.34, 0.0], [0.05, 0.016, 0.07], { dir: [s * 0.5, 0.1, -0.2], w: 8, h: 5 }); S.blob('accent', [s * 0.07, 0.18, 0.12], [0.02, 0.02, 0.008], { w: 6, h: 4 }); }
    for (let i = 0; i < 4; i++) S.blob('accent', [0.0, 0.26 - i * 0.05, 0.121 + 0.0], [0.011, 0.011, 0.006], { w: 6, h: 4 });
    S.blob('accent', [-0.1, 0.2, 0.125], [0.03, 0.03, 0.01], { w: 8, h: 4 });
  } else if (st === 'bare') {
    S.tube(key, [[0.22, 0.34, 0.02], [0.0, 0.16, 0.12], [-0.2, 0.0, 0.12]], [[0.04, 0.03], [0.045, 0.035], [0.04, 0.03]], { seg: 8, per: 5 });  // a drape across the chest
  }
  face(S, HF, { hair: 'short', scale: 1.14, ...(o.face || {}), skinKey: key, hairKey: key });
  return S.finish({ head: HF });
}
