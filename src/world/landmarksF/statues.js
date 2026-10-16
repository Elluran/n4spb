// landmarksF/statues.js - the two bronze generals in front of the Kazan Cathedral colonnade, built with the shared figure kit (lib/figures.js): lofted limbs, a sculpted face, hands, a greatcoat / uniform with
// epaulettes, cloak folds.  Orlovsky 1837, statue heights Kutuzov 4.1 m, Barclay de Tolly 4.0 m; both STAND (the wiki page calling them equestrian is wrong) on a bronze plate with captured trophies.
// Photos refs/kazan 44 45 (Kutuzov: bareheaded, the right arm raised forward with the baton, the cloak drawn across the chest and over the right forearm, the left hand low on the sabre whose blade
// runs down beside the leg), 46 47 48 (Barclay: uniform coat with high collar, epaulettes and orders, the right hand low with the baton, the left hand gathering the cloak at the waist, head turned,
// short receding hair with whiskers).  The figures are built at 1.75 m and scaled by 2.34 / 2.29 when placed.  Captured standards are cast as small FURLED bronze bundles (no flags).
import { human, extend, cached, V, Sculpt } from '../lib/figures.js';

const lerp = V.lerp;
const P0 = (j, x, y, z) => V.add(V.add(V.add(j.chest, V.mul(j.chestFrame.side, x)), V.mul(j.chestFrame.up, y)), V.mul(j.chestFrame.fwd, z));

/** a furled trophy standard: a pole with a rolled cloth bundle, a spear head, a small eagle on a block */
function trophy(S, o) {
  const [x, z] = o.at, y = 0.03, a = o.angle || 0, ca = Math.cos(a), sa = Math.sin(a);
  const p = (u, h, v) => [x + ca * u + sa * v, y + h, z - sa * u + ca * v];
  S.tube('main', [p(-0.55, 0.05, 0.0), p(0.0, 0.06, 0.02), p(0.6, 0.05, 0.0)], [[0.025, 0.025], [0.026, 0.026], [0.02, 0.02]], { seg: 8, per: 4 });          // staff
  S.tube('main', [p(-0.4, 0.09, 0.0), p(-0.1, 0.1, 0.03), p(0.25, 0.09, 0.0)], [[0.075, 0.07], [0.09, 0.08], [0.07, 0.07]], { seg: 10, per: 4, bump: (t, th) => 1 + 0.12 * Math.sin(th * 5 + t * 8) });   // the furled cloth
  S.blobBetween('main', p(0.55, 0.05, 0), p(0.75, 0.05, 0), 0.03, 0.04, { w: 6, h: 5 });                                                                   // spear head
  S.blob('main', p(-0.55, 0.12, 0.0), [0.07, 0.1, 0.06], { w: 8, h: 6 });
  if (o.eagle) { S.blob('main', p(-0.15, 0.18, 0.16), [0.1, 0.07, 0.06], { w: 8, h: 6 }); S.blob('main', p(-0.15, 0.27, 0.15), [0.05, 0.06, 0.05], { w: 8, h: 6 }); S.blobBetween('main', p(-0.15, 0.22, 0.08), p(-0.15, 0.2, 0.28), 0.14, 0.02, { w: 8, h: 4 }); }
  if (o.shield) S.blob('main', p(0.2, 0.12, -0.3), [0.22, 0.04, 0.22], { w: 12, h: 6 });
  if (o.laurel) for (let i = 0; i < 9; i++) S.blob('main', p(-0.6 + i * 0.1, 0.05, 0.28 + 0.03 * Math.sin(i)), [0.07, 0.015, 0.03], { w: 6, h: 4 });
}

/** the sabre of Kutuzov: a gripped hilt with a knuckle guard and a long blade running down beside the leg */
function sabre(S, hand, tip) {
  const d = V.unit(V.sub(tip, hand));
  S.tube('main', [V.add(hand, V.mul(d, -0.1)), V.add(hand, V.mul(d, 0.06))], [[0.017, 0.017], [0.019, 0.019]], { seg: 8, per: 3 });                                // grip
  S.blob('main', V.add(hand, V.mul(d, -0.115)), [0.026, 0.026, 0.026], { w: 8, h: 6 });                                                                           // pommel
  S.tube('main', [V.add(hand, V.add(V.mul(d, 0.075), [-0.07, 0, 0.0])), V.add(hand, V.mul(d, 0.075)), V.add(hand, V.add(V.mul(d, 0.075), [0.07, 0, 0.0]))], [[0.011, 0.011], [0.012, 0.012], [0.011, 0.011]], { seg: 6, per: 3, ref: d });   // cross guard
  S.tube('main', [V.add(hand, V.mul(d, 0.085)), lerp(hand, tip, 0.5), tip], [[0.004, 0.017], [0.0035, 0.015], [0.003, 0.006]], { seg: 6, per: 6, ref: [1, 0, 0] });      // blade
}

export function kutuzov() {
  return cached('lmF-kutuzov', () => {
    const base = human({
      detail: 0.66, body: { muscle: 0.3, bulk: 1.12 },
      pose: {
        pelvisRot: [0, -0.1, 0.04], spine: [-0.07, -0.28, -0.05], head: [-0.1, -0.3, 0.05],
        legs: { L: { foot: [0.1, 0, -0.04], yaw: 0.1 }, R: { foot: [-0.18, 0, 0.2], yaw: -0.35 } },
        arms: {
          R: { hand: [-0.3, 1.64, 0.5], pole: [-0.2, -0.7, 0.3], grip: 'hold', palm: [0, -1, 0.2] },
          L: { hand: [0.3, 0.87, 0.07], pole: [0.5, -0.2, -0.8], grip: 'fist', palm: [-1, 0, 0.1] },
        },
      },
      outfit: { torso: 'coat', hem: 0.72, flare: 0.25, folds: 0.045, sleeves: 'long', trousers: 'long', boots: 0.3, collar: 'stand', epaulettes: true, buttons: true, medals: 4, sash: true, cape: 'back', capeLen: 0.95, hair: 'short' },
      face: { age: 0.75, hair: 'short', brow: 0.8, jaw: 1.1, mouth: 'stern', seed: 3 },
    });
    return extend(base, (S, info) => {
      const j = info.j;
      // the baton in the raised right hand: a staff with a knobbed head, held across the fist
      const hr = j.hands.R, dir = V.unit(V.sub(j.wristR, j.elbowR));
      const b0 = V.add(hr.hold, V.mul(dir, -0.14)), b1 = V.add(hr.hold, V.mul(dir, 0.38));
      S.tube('main', [b0, hr.hold, b1], [[0.022, 0.022], [0.024, 0.024], [0.03, 0.03]], { seg: 10, per: 4 });
      S.blob('main', V.add(b1, V.mul(dir, 0.02)), [0.036, 0.036, 0.042], { dir, w: 8, h: 6 });
      S.tube('main', [V.add(hr.hold, V.mul(dir, 0.09)), V.add(hr.hold, V.mul(dir, 0.1))], [[0.032, 0.032], [0.032, 0.032]], { seg: 10, per: 2 });
      sabre(S, j.hands.L.hold, [0.31, 0.02, 0.2]);
      // the cloak (photos 44 / 45): a band drawn across the chest from the left shoulder to the raised right arm, and a heavy curtain of folds hanging from the right forearm to the knees
      const q = (x, y, z) => P0(j, x, y, z);
      S.tube('main', [q(0.19, 0.2, 0.07), q(0.06, 0.1, 0.14), q(-0.08, 0.02, 0.16), q(-0.2, 0.04, 0.1)],
        [[0.075, 0.03], [0.1, 0.04], [0.11, 0.04], [0.09, 0.035]], { seg: 12, per: 5, ref: [0.5, 0.5, 0], bump: (t, th) => 1 + 0.15 * Math.sin(th * 3 + t * 9) });
      const e0 = V.lerp(j.elbowR, j.wristR, 0.3);
      S.tube('main', [V.add(e0, [0.0, 0.02, 0.02]), V.add(e0, [-0.05, -0.28, 0.05]), V.add(e0, [-0.08, -0.62, 0.05]), V.add(e0, [-0.07, -0.95, 0.03]), V.add(e0, [-0.05, -1.28, 0.0])],
        [[0.06, 0.025], [0.15, 0.04], [0.19, 0.05], [0.2, 0.05], [0.21, 0.05]], { seg: 20, per: 5, ref: [1, 0, 0], bump: (t, th) => 1 + 0.16 * Math.sin(th * 5 + t * 6) + 0.07 * Math.sin(th * 11 - t * 13) });
    });
  });
}

export function barclay() {
  return cached('lmF-barclay', () => {
    const base = human({
      detail: 0.66, body: { muscle: 0.3, bulk: 1.0 },
      pose: {
        pelvisRot: [0, 0.08, -0.04], spine: [-0.03, 0.1, 0.04], head: [0.04, 0.4, -0.04],
        legs: { R: { foot: [-0.12, 0, 0.2], yaw: -0.2 }, L: { foot: [0.13, 0, -0.1], yaw: 0.35 } },
        arms: {
          R: { hand: [-0.2, 0.93, 0.34], pole: [-0.4, -0.3, -0.7], grip: 'hold', palm: [0.3, 0.2, -1] },
          L: { hand: [0.2, 1.0, 0.17], pole: [0.6, -0.2, -0.8], grip: 'fist', palm: [-0.6, 0.2, 0.8] },
        },
      },
      outfit: { torso: 'coat', hem: 0.5, flare: 0.1, folds: 0.03, sleeves: 'long', trousers: 'long', boots: 0.34, collar: 'stand', epaulettes: true, buttons: true, medals: 5, sash: true, cape: 'back', capeLen: 0.98, hair: 'short', beard: 'sideburns' },
      face: { age: 0.7, hair: 'short', beard: 'sideburns', brow: 0.7, jaw: 1.05, mouth: 'stern', seed: 5 },
    });
    return extend(base, (S, info) => {
      const j = info.j, q = (x, y, z) => P0(j, x, y, z);
      const hr = j.hands.R, dir = V.unit(V.sub(j.wristR, j.elbowR));
      S.tube('main', [V.add(hr.hold, V.mul(dir, -0.12)), hr.hold, V.add(hr.hold, V.mul(dir, 0.34))], [[0.02, 0.02], [0.022, 0.022], [0.028, 0.028]], { seg: 10, per: 4 });      // baton held low, pointing forward-down
      S.blob('main', V.add(hr.hold, V.mul(dir, 0.36)), [0.033, 0.033, 0.04], { dir, w: 8, h: 6 });
      // the cloak gathered in the left hand and falling in front of the left thigh
      const hl = j.hands.L.hold;
      S.tube('main', [V.add(hl, [0.02, 0.05, 0.02]), V.add(hl, [0.0, -0.12, 0.06]), V.add(hl, [-0.03, -0.38, 0.08]), V.add(hl, [-0.07, -0.65, 0.07]), V.add(hl, [-0.09, -0.85, 0.06])],
        [[0.05, 0.03], [0.08, 0.035], [0.1, 0.04], [0.11, 0.04], [0.11, 0.04]], { seg: 12, per: 5, ref: [0.8, 0, 0.6], bump: (t, th) => 1 + 0.14 * Math.sin(th * 3 + t * 8) + 0.05 * Math.sin(th * 8 - t * 14) });
      // the sword hilt at the left hip (the scabbard is hidden by the cloak)
      S.tube('main', [q(0.25, -0.18, 0.05), q(0.3, -0.5, 0.02), q(0.34, -0.9, -0.05)], [[0.03, 0.02], [0.028, 0.02], [0.02, 0.016]], { seg: 6, per: 5 });
    });
  });
}

/** the furled standards at the feet: Kutuzov stands on one, Barclay on a trophy heap (an eagle, a shield, laurel); a Figure in the frame of the statue (x = left, z = front) at the plinth height 0 */
export function trophies(who) {
  return cached('lmF-trophy-' + who, () => {
    const S = new Sculpt({ detail: 0.8 });
    if (who === 'kutuzov') { trophy(S, { at: [0.0, 0.2], angle: 0.5, eagle: true }); trophy(S, { at: [-0.25, -0.05], angle: -0.4 }); }
    else { trophy(S, { at: [0.0, 0.25], angle: -0.3, eagle: true, shield: true }); trophy(S, { at: [0.2, -0.1], angle: 0.6, laurel: true }); }
    return S.finish();
  });
}
