// landmarksE/statues.js - the figures of the Catherine II monument (Mikeshin / Chizhov / Opekushin, 1873) built with the shared figure kit (lib/figures.js).
// Photos refs/ostrovsky 075 (details of the nine figures: 18th-century coats, breeches, stockings and buckled shoes, wigs and curls, one lady with a manuscript), 077 (full view), 072-074.
//   Catherine (4.35 m): long dress with the ermine mantle falling behind, the Andrew star, the imperial crown, the sceptre in the right hand (a tall staff), the laurel wreath in the raised left hand.
//   The nine associates (life size x 1.4) stand or sit on the rim of the bronze bell: Rumyantsev, Potemkin, Suvorov (north, towards Nevsky), Derzhavin, Dashkova (east), Bezborodko, Betskoy (west),
//   Chichagov and Orlov-Chesmensky (south).  Built at 1.75 m; the monument module scales them (associates x 1.4, Catherine x 2.5).
import { human, extend, cached, V, Sculpt } from '../lib/figures.js';

const SIT = (extra = {}) => ({ pelvis: [0, 0.5, -0.06], pelvisRot: [0.05, 0, 0], legs: { L: { foot: [0.12, 0, 0.36], yaw: 0.2, pole: [0, 0.2, 1] }, R: { foot: [-0.13, 0, 0.34], yaw: -0.25, pole: [0, 0.2, 1] } }, ...extra });
const MAN = { torso: 'coat', hem: 0.34, flare: 0.3, sleeves: 'long', trousers: 'breeches', boots: 0.06, collar: 'fall', medals: 2, hair: 'short' };
const wrist = (j, side, x, y, z) => V.add(side > 0 ? j.shoulderL : j.shoulderR, [x, y, z]);

export function catherine() {
  return cached('lmE-catherine', () => {
    const base = human({
      detail: 0.5, body: { sex: 'f', bulk: 1.0 },
      pose: {
        head: [0.02, 0.1, 0.05], spine: [-0.03, 0.0, 0.03],
        legs: { L: { foot: [0.1, 0, 0.0] }, R: { foot: [-0.1, 0, 0.04] } },
        arms: { R: { hand: [-0.29, 1.28, 0.2], pole: [-0.5, -0.5, -0.4], grip: 'hold', palm: [0.5, 0.2, -0.9] }, L: { hand: [0.36, 1.42, 0.2], pole: [0.5, -0.6, -0.4], grip: 'cup', palm: [-0.3, 0.9, 0.3] } },
      },
      outfit: { torso: 'dress', hem: 0.94, flare: 0.8, folds: 0.06, sleeves: 'long', collar: 'none', cape: 'mantle', capeLen: 0.98, hat: 'crown', medals: 1, belt: false },
      face: { age: 0.45, hair: 'cap', mouth: 'smile', nose: 0.9, jaw: 0.9, brow: 0.4, seed: 2 },
    });
    return extend(base, (S, info) => {
      const j = info.j, hr = j.hands.R, hl = j.hands.L;
      // the sceptre: a long staff held in the right hand with an orb and cross on the top
      const up = V.unit([0.0, 1, 0.05]), top = V.add(hr.hold, V.mul(up, 0.72)), bot = V.add(hr.hold, V.mul(up, -0.52));
      S.tube('main', [bot, hr.hold, top], [[0.016, 0.016], [0.018, 0.018], [0.014, 0.014]], { seg: 8, per: 6 });
      S.blob('main', V.add(top, [0, 0.03, 0]), [0.04, 0.04, 0.04], { w: 8, h: 6 }); S.blob('main', V.add(top, [0, 0.085, 0]), [0.012, 0.045, 0.012], { w: 5, h: 4 }); S.blob('main', V.add(top, [0, 0.1, 0]), [0.034, 0.011, 0.011], { w: 5, h: 4 });
      // the laurel wreath held up in the left hand: a ring of leaves
      const c = V.add(hl.hold, [0.0, 0.12, 0.04]);
      for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; S.blob('main', V.add(c, [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0]), [0.03, 0.012, 0.012], { dir: [-Math.sin(a), Math.cos(a), 0], ref: [0, 0, 1], w: 6, h: 4 }); }
      // the Andrew star on the breast
      S.blob('accent', V.add(j.chest, V.add(V.mul(j.chestFrame.side, 0.07), V.add(V.mul(j.chestFrame.up, 0.0), V.mul(j.chestFrame.fwd, 0.13)))), [0.035, 0.035, 0.008], { dir: j.chestFrame.fwd, w: 8, h: 4 });
    });
  });
}

/** the nine associates, index 0..8 in the order of the ring: 0 Chichagov (S), 1 Dashkova (E), 2 Derzhavin (E), 3 Rumyantsev (N), 4 Potemkin (N), 5 Suvorov (N), 6 Bezborodko (W), 7 Betskoy (W), 8 Orlov-Chesmensky (S) */
export function associate(k) {
  return cached('lmE-assoc' + k, () => {
    const D = 0.28;
    const T = [
      // 0 Chichagov: seated admiral, a hand on a globe-like drum, hat in the other hand
      () => human({ detail: D, pose: SIT({ spine: [0.1, 0, 0], arms: { R: { hand: [-0.2, 0.7, 0.3], grip: 'relaxed', palm: [0, 1, 0] }, L: { hand: [0.2, 0.62, 0.35], grip: 'hold', palm: [0, 1, 0] } }, head: [0.05, 0.3, 0] }), outfit: { ...MAN, hat: 'none', sash: true }, face: { age: 0.7, hair: 'wig', seed: 11 } }),
      // 1 Dashkova: seated lady reading a manuscript
      () => extend(human({ detail: D, body: { sex: 'f' }, pose: SIT({ spine: [0.12, 0, 0], head: [0.4, -0.2, 0], arms: { R: { hand: [-0.12, 0.8, 0.28], grip: 'flat', palm: [0, 1, 0] }, L: { hand: [0.18, 0.74, 0.32], grip: 'flat', palm: [0, 1, 0] } } }), outfit: { torso: 'dress', hem: 0.62, flare: 0.5, sleeves: 'long', collar: 'none' }, face: { age: 0.4, hair: 'cap', seed: 4 } }), (S, info) => {
        const a = V.add(info.j.wristR, [0.04, 0.03, 0.04]), b = V.add(info.j.wristL, [-0.04, 0.03, 0.04]); S.sheet('main', [V.add(a, [0, 0, 0.12]), V.add(a, [0, 0, -0.1]), V.add(b, [0, 0, -0.1]), V.add(b, [0, 0, 0.12])], 0.004);
      }),
      // 2 Derzhavin: standing in a civil coat, one arm hanging, the other hand raised, wig, the head thrown back
      () => human({ detail: D, pose: { head: [-0.3, 0.2, 0], spine: [-0.04, 0.0, 0.0], legs: { L: { foot: [0.1, 0, 0.02] }, R: { foot: [-0.13, 0, 0.1] } }, arms: { R: { hand: [-0.2, 0.9, 0.08], grip: 'relaxed' }, L: { hand: [0.12, 0.98, 0.22], grip: 'open', palm: [-0.5, 0.2, 0.6] } } }, outfit: { ...MAN, medals: 1 }, face: { age: 0.45, hair: 'curly', seed: 6 } }),
      // 3 Rumyantsev: standing field marshal leaning on a baton
      () => extend(human({ detail: D, pose: { head: [0, 0.35, 0], legs: { L: { foot: [0.12, 0, 0.0] }, R: { foot: [-0.12, 0, 0.14] } }, arms: { R: { hand: [-0.17, 1.0, 0.24], grip: 'hold', palm: [0, 1, 0] }, L: { hand: [0.2, 0.9, 0.0], grip: 'relaxed' } } }, outfit: { ...MAN, sash: true, medals: 3 }, face: { age: 0.75, hair: 'wig', seed: 8 } }), (S, info) => { const h = info.j.hands.R.hold; S.tube('main', [V.add(h, [0.0, -1.05, 0.0]), V.add(h, [0, 0.0, 0]), V.add(h, [0, 0.16, 0])], [[0.012, 0.012], [0.015, 0.015], [0.02, 0.02]], { seg: 6, per: 5 }); }),
      // 4 Potemkin: seated, uniform, a hand on the knee, the sash, a hat on the knee
      () => human({ detail: D, pose: SIT({ spine: [-0.05, 0.15, 0], head: [-0.05, -0.25, 0], arms: { R: { hand: [-0.2, 0.68, 0.3], grip: 'relaxed', palm: [0, 1, 0] }, L: { hand: [0.2, 0.8, 0.2], grip: 'fist', palm: [-0.5, 0.5, 0.5] } } }), outfit: { ...MAN, sash: true, medals: 4 }, face: { age: 0.6, hair: 'curly', brow: 0.8, seed: 9 } }),
      // 5 Suvorov: standing, lean, white hair, a sword
      () => extend(human({ detail: D, body: { bulk: 0.88, muscle: 0.1 }, pose: { head: [-0.1, -0.3, 0.05], spine: [0.05, -0.1, 0], legs: { L: { foot: [0.1, 0, 0.0] }, R: { foot: [-0.14, 0, 0.1] } }, arms: { R: { hand: [-0.12, 0.98, 0.22], grip: 'hold', palm: [0, 0.3, -1] }, L: { hand: [0.22, 0.96, 0.08], grip: 'fist', palm: [-1, 0, 0] } } }, outfit: { ...MAN, medals: 4, sash: true }, face: { age: 0.95, hair: 'short', brow: 0.9, nose: 1.15, seed: 13 } }), (S, info) => { const h = info.j.hands.L.hold; S.tube('main', [V.add(h, [0.0, 0.08, 0.0]), V.add(h, [0.05, -0.85, -0.1])], [[0.012, 0.012], [0.007, 0.01]], { seg: 6, per: 5 }); }),
      // 6 Bezborodko: seated statesman, a hand to the chest, a manuscript
      () => human({ detail: D, pose: SIT({ spine: [0.08, -0.1, 0], head: [0.1, 0.3, 0], arms: { R: { hand: [-0.04, 1.24, 0.2], grip: 'flat', palm: [0.3, -0.4, -1] }, L: { hand: [0.2, 0.7, 0.3], grip: 'relaxed', palm: [0, 1, 0] } } }), outfit: { ...MAN, medals: 2 }, face: { age: 0.55, hair: 'curly', seed: 14 } }),
      // 7 Betskoy: seated old man, hands on the cane
      () => human({ detail: D, body: { bulk: 0.95 }, pose: SIT({ spine: [0.15, 0.1, 0], head: [0.15, -0.2, 0], arms: { R: { hand: [-0.12, 0.78, 0.36], grip: 'hold', palm: [0, 1, 0] }, L: { hand: [0.12, 0.8, 0.34], grip: 'hold', palm: [0, 1, 0] } } }), outfit: { ...MAN, medals: 1 }, face: { age: 0.95, hair: 'wig', seed: 17 } }),
      // 8 Orlov-Chesmensky: seated, one leg drawn back, a hat in hand, a hand on a staff
      () => human({ detail: D, pose: SIT({ spine: [-0.04, -0.2, 0], head: [0.05, 0.3, 0], arms: { R: { hand: [-0.22, 0.58, 0.3], grip: 'hold', palm: [0, 1, 0] }, L: { hand: [0.28, 0.9, 0.2], grip: 'hold', palm: [-0.4, 0.4, 0.3] } } }), outfit: { ...MAN, sash: true, medals: 3 }, face: { age: 0.5, hair: 'wig', seed: 19 } }),
    ];
    return T[k]();
  });
}
void Sculpt;

// ------------------------------------------------------------------------------------------------ the Apollo quadriga of the Alexandrinsky Theatre (Pimenov / Demut-Malinovsky 1832)
// Four horses abreast in a trot (one foreleg raised), the outer ones turning their heads outward, the light chariot, Apollo standing in it with a laurel wreath and a flying cloak.  Seen from 25-80 m
// below, so the horses are cheap (detail 0.4: ~4.5 k triangles each).  The module scales the horses x 1.3 (a group 12 m wide).  Built at real size: withers 1.55 m.
import { horse } from '../lib/figures.js';

export function quadrigaHorse(i) {
  return cached('lmE-qh' + i, () => horse({
    detail: 0.32, mane: i < 2 ? 'left' : 'right', tail: 'flow', bridle: true, seed: i,
    pose: { base: i % 2 ? 'trot' : 'prance', head: { turn: [0.5, 0.2, -0.2, -0.5][i], pitch: 1.0, open: 0.1 }, neck: { angle: 0.95, arch: 0.35, len: 0.78 } },
  }));
}

export function apollo() {
  return cached('lmE-apollo', () => extend(human({
    detail: 0.42, body: { muscle: 0.6 },
    pose: { head: [0, 0.15, 0], spine: [-0.05, 0, 0], legs: { L: { foot: [0.12, 0, 0.1] }, R: { foot: [-0.14, 0, -0.1], yaw: -0.3 } },
      arms: { R: { hand: [-0.22, 1.98, 0.1], pole: [-0.6, -0.1, -0.3], grip: 'open', palm: [0.3, 0.2, 1] }, L: { hand: [0.22, 1.12, 0.46], pole: [0.5, -0.5, -0.5], grip: 'hold', palm: [-0.5, 0.5, 0.4] } } },
    outfit: { torso: 'tunic', hem: 0.28, flare: 0.5, cape: 'back', capeLen: 0.95, hat: 'laurel', hair: 'curly' },
    face: { age: 0.1, hair: 'curly', seed: 5 },
  }), (S, info) => {
    const h = info.j.hands.L.hold;
    for (let k = 0; k < 4; k++) S.tube('main', [h, V.add(h, [(k - 1.5) * 0.14, -0.05, 0.9]), V.add(h, [(k - 1.5) * 0.5, -0.1, 1.9])], [[0.008, 0.008], [0.008, 0.008], [0.008, 0.008]], { seg: 4, per: 5 });   // the four reins
  }));
}

/** the chariot: a light curved body on two wheels with the pole, in the frame of Apollo (z forward, origin on the chariot floor) */
export function chariotBody() {
  return cached('lmE-chariot', () => {
    const S = new Sculpt({ detail: 0.6 });
    S.tube('main', [[0, 0.5, 0.55], [0, 0.42, 0.2], [0, 0.42, -0.5], [0, 0.55, -0.95]], [[0.55, 0.3], [0.58, 0.3], [0.6, 0.3], [0.5, 0.3]], { seg: 14, per: 4, ref: [1, 0, 0], bump: (t, th) => 1 });
    for (const s of [1, -1]) {
      S.tube('main', loopPtsWheel(s * 0.78, 0.38, -0.2, 0.42), [[0.035, 0.03]], { closed: true, seg: 6, rings: 20, ref: [1, 0, 0] });
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; S.tube('main', [[s * 0.78, 0.38, -0.2], [s * 0.78, 0.38 + Math.cos(a) * 0.4, -0.2 + Math.sin(a) * 0.4]], [[0.018, 0.018], [0.014, 0.014]], { seg: 5, per: 2 }); }
    }
    S.tube('main', [[0, 0.5, 0.45], [0, 0.6, 1.6], [0, 0.85, 2.7]], [[0.04, 0.04], [0.035, 0.035], [0.03, 0.03]], { seg: 6, per: 5 });                      // the pole
    return S.finish();
  });
}
const loopPtsWheel = (x, y, z, r) => Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return [x, y + Math.cos(a) * r, z + Math.sin(a) * r]; });
