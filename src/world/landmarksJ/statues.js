// landmarksJ/statues.js - the bronze of the Nicholas I monument on St Isaac's Square (Klodt 1859), built with the shared figure kit (lib/figures.js).
// Photos refs/admiralty 113 114 115 116: the stallion Amalatbek stands on the two hind legs ONLY (no third support: the tail hangs free), the body pitched ~35 deg, the neck arched and the head
// brought down, one foreleg folded high and the other bent forward; the Emperor sits upright in the saddle in a Horse Guards uniform with a plumed (eagled) helmet, the cloak thrown back over the
// croup, the left hand holding the reins at the chest, the right fist on the thigh.  The four seated women (Faith with a cross, Wisdom with a book, Justice with the tablets of the law, Strength with a
// shield and a sword) have the faces of the empress and the three daughters.
// Built in metres of a real horse (1.55 m withers); the module scales the group so that horse + rider are ~6 m.
import { human, horse, extend, cached, V } from '../lib/figures.js';

export function nicholas() {
  return cached('lmJ-nicholas', () => {
    const H = horse({
      detail: 0.55, mane: 'right', tail: 'down',
      pose: { base: 'rear', pitch: 0.58, shift: [0, 0.06, 0.0],
        neck: { angle: 0.86, arch: 0.55, len: 0.8 }, head: { pitch: 1.45, turn: 0.12, open: 0.1 },
        legs: { fl: { hoof: [0.0, -0.32, 0.5], frame: 'top', pole: [0, 0.9, 0.5] }, fr: { hoof: [0.02, -0.62, 0.22], frame: 'top', pole: [0, 0.6, 0.8] }, hl: { hoof: [0.21, 0, -0.55] }, hr: { hoof: [-0.21, 0, -0.55] } } },
      reinTo: null,
    });
    const seat = H.info.seat;
    const R = human({
      detail: 0.45, body: { muscle: 0.3 },
      pose: {
        pelvis: [seat[0], seat[1] - 0.04, seat[2] - 0.02], pelvisRot: [-0.1, 0, 0], spine: [-0.1, 0, 0], head: [0.02, 0.0, 0],
        legs: { L: { foot: [0.38, seat[1] - 0.82, seat[2] + 0.22], yaw: 0.0, pole: [0.8, 0.0, 0.7] }, R: { foot: [-0.38, seat[1] - 0.82, seat[2] + 0.22], yaw: 0.0, pole: [-0.8, 0.0, 0.7] } },
        arms: { L: { hand: [0.14, seat[1] + 0.52, seat[2] + 0.34], pole: [0.5, -0.6, -0.6], grip: 'hold', palm: [-0.4, 0.2, 1] }, R: { hand: [-0.24, seat[1] + 0.12, seat[2] + 0.14], pole: [-0.6, -0.4, -0.7], grip: 'fist', palm: [0.5, 0.2, 0.6] } },
      },
      outfit: { torso: 'coat', hem: 0.2, flare: 0.15, sleeves: 'long', trousers: 'long', boots: 0.5, collar: 'stand', epaulettes: true, buttons: true, medals: 2, cape: 'back', capeLen: 0.78, hat: 'plume', hair: 'short' },
      face: { age: 0.45, hair: 'short', beard: 'moustache', brow: 0.7, jaw: 1.1, mouth: 'stern', seed: 21 },
    });
    // merge: the horse + the rider + the reins from the left fist to the bit
    const S0 = extend(H, (S) => { for (const [k, g] of Object.entries(R.geos)) S.add(k, g); }, { info: { rider: R.info } });
    return extend(S0, (S, info) => {
      const hand = R.info.j.hands.L.hold, bit = V.add(H.info.head.origin, V.add(V.mul(H.info.head.dir, 0.46 * 1.0), V.mul(H.info.head.up, -0.1)));
      S.tube('main', [hand, V.lerp(hand, bit, 0.5).map((v, i) => v - (i === 1 ? 0.1 : 0)), bit], [[0.011, 0.011], [0.011, 0.011], [0.01, 0.01]], { seg: 5, per: 6 });
      void info;
    });
  });
}

/** four allegories: 0 Faith (a cross), 1 Wisdom (a book), 2 Justice (tablets), 3 Strength (shield + sword).  Seated on a block, facing +z; origin = the seat plane under the pelvis */
export function woman(k) {
  return cached('lmJ-woman' + k, () => {
    const att = [
      { hand: { R: [-0.2, 0.92, 0.3], L: [0.16, 0.7, 0.3] }, grips: ['hold', 'relaxed'] },
      { hand: { R: [-0.14, 0.78, 0.3], L: [0.2, 0.72, 0.34] }, grips: ['flat', 'flat'] },
      { hand: { R: [-0.22, 0.98, 0.26], L: [0.18, 0.7, 0.32] }, grips: ['hold', 'relaxed'] },
      { hand: { R: [-0.28, 0.9, 0.22], L: [0.3, 0.64, 0.28] }, grips: ['hold', 'hold'] },
    ][k];
    const base = human({
      detail: 0.38, body: { sex: 'f', bulk: 1.05 },
      pose: {
        pelvis: [0, 0.5, -0.04], pelvisRot: [0.03, 0, 0], spine: [0.06, 0, 0], head: [0.08, k % 2 ? 0.25 : -0.25, 0],
        legs: { L: { foot: [0.14, 0, 0.34], yaw: 0.2, pole: [0, 0.2, 1] }, R: { foot: [-0.14, 0, 0.3], yaw: -0.2, pole: [0, 0.2, 1] } },
        arms: { R: { hand: att.hand.R, pole: [-0.6, -0.4, -0.6], grip: att.grips[0], palm: [0.5, 0.5, 0.5] }, L: { hand: att.hand.L, pole: [0.6, -0.4, -0.6], grip: att.grips[1], palm: [-0.5, 0.8, 0.2] } },
      },
      outfit: { torso: 'dress', hem: 0.56, flare: 0.7, folds: 0.07, sleeves: k === 1 ? 'short' : 'long', collar: 'none', cape: k === 3 ? 'none' : 'back', capeLen: 0.7, hat: k === 3 ? 'roman' : 'none' },
      face: { age: 0.35, hair: k === 3 ? 'none' : 'cap', mouth: 'closed', seed: 30 + k },
    });
    return extend(base, (S, info) => {
      const j = info.j, hr = j.hands.R.hold, hl = j.hands.L.hold;
      if (k === 0) { S.tube('main', [V.add(hr, [0, -0.4, 0]), V.add(hr, [0, 0.55, 0])], [[0.014, 0.014], [0.016, 0.016]], { seg: 6, per: 4 }); S.tube('main', [V.add(hr, [-0.12, 0.42, 0]), V.add(hr, [0.12, 0.42, 0])], [[0.014, 0.014], [0.014, 0.014]], { seg: 6, per: 3, ref: [0, 1, 0] }); }
      if (k === 1) S.blob('main', V.lerp(hr, hl, 0.5).map((v, i) => v + (i === 1 ? 0.05 : 0)), [0.13, 0.03, 0.1], { w: 8, h: 5 });
      if (k === 2) { S.blob('main', V.add(hr, [0, 0.14, 0]), [0.06, 0.1, 0.012], { w: 8, h: 6 }); S.blob('main', V.add(hr, [0.1, 0.12, 0]), [0.06, 0.1, 0.012], { w: 8, h: 6 }); }
      if (k === 3) { S.blob('main', V.add(hl, [0.05, 0.1, 0.05]), [0.16, 0.2, 0.025], { dir: [0.3, 0, 1], w: 10, h: 7 }); S.tube('main', [V.add(hr, [0, -0.35, 0]), V.add(hr, [0, 0.45, 0])], [[0.014, 0.014], [0.018, 0.018]], { seg: 6, per: 4 }); }
    });
  });
}
