// landmarksH/statues.js - the sculpture of the Admiralty gate and of the Alexander Garden, built with the shared figure kit (lib/figures.js).
//   nymphGroup()  the two groups by Shchedrin (1812) either side of the arch: THREE nymphs carrying a celestial sphere on their shoulders, long chitons, cream plaster (photo refs/admiralty 014).
//   warrior(k)    the four seated warriors at the corners of the attic (Achilles, Ajax, Pyrrhus, Alexander the Great): crested helmets, cuirass, cloak, spear / shield / sword (photos 007 026).
//   hercules()    the Farnese Hercules (2014 copy, photo 043): bearded, bowed head, left arm on the club with the lion skin, right arm behind the back; flora(): Flora Farnese (photo 044).
//   bustOf(name)  the portrait busts on granite pedestals: Gorchakov, Glinka, Lermontov, Gogol, Zhukovsky, Przhevalsky (photos 041 042 045 046); przhevalskyCamel(): the bronze camel at his rock.
// Everything is built at 1.75 m (a bust 0.62 m) and scaled by the placing module.
import { human, bust, camel, extend, cached, V, Sculpt } from '../lib/figures.js';

const SIT = (extra = {}) => ({ pelvis: [0, 0.5, -0.06], pelvisRot: [0.05, 0, 0], legs: { L: { foot: [0.15, 0, 0.36], yaw: 0.2, pole: [0, 0.2, 1] }, R: { foot: [-0.15, 0, 0.3], yaw: -0.25, pole: [0, 0.2, 1] } }, ...extra });

/** one nymph: arms up to the sphere whose centre is (cx, cy, cz) in the figure frame (x left, z front) at radius r */
function nymph(i, c, r) {
  const toward = V.unit([-c[0], 0, -c[2] + 0.001]);
  const hand = (side) => { const d = V.unit(V.add(V.add(V.mul(toward, 0.8), [0, -0.55, 0]), [side * 0.33 * toward[2] * -1, 0, side * 0.33 * toward[0]])); return V.add(c, V.mul(d, r)); };
  return human({
    detail: 0.3, body: { sex: 'f', bulk: 0.95 },
    pose: { head: [-0.1, [0.3, -0.3, 0.0][i], 0.1 * (i - 1)], spine: [-0.12, 0, 0.05 * (i - 1)], legs: { L: { foot: [0.1, 0, 0.05] }, R: { foot: [-0.12, 0, -0.05] } },
      arms: { L: { hand: hand(1), pole: [0.7, -0.2, -0.5], grip: 'flat', palm: V.sub(c, hand(1)) }, R: { hand: hand(-1), pole: [-0.7, -0.2, -0.5], grip: 'flat', palm: V.sub(c, hand(-1)) } } },
    outfit: { torso: 'dress', hem: 0.94, flare: 0.12, folds: 0.07, sleeves: 'none', collar: 'none', cape: i === 1 ? 'back' : 'none', capeLen: 0.85, belt: false },
    face: { age: 0.2, hair: 'cap', seed: 40 + i },
  });
}

export function nymphGroup() {
  return cached('lmH-nymphs', () => {
    const S = new Sculpt({ detail: 0.6 });
    const s = 1.85, C = [0, 4.05 / s, -0.1 / s], r = 1.3 / s;
    const spots = [[-1.15, 0.2, 0.3], [1.2, 0.25, -0.3], [0.0, -0.95, 0.0]];
    spots.forEach(([x, z, ry], i) => {
      const c = [C[0] - x / s, C[1], C[2] - z / s], rot = ry;                                               // sphere centre in the nymph's own (un-rotated) frame
      const cr = [c[0] * Math.cos(rot) - c[2] * Math.sin(rot), c[1], c[0] * Math.sin(rot) + c[2] * Math.cos(rot)];
      const n = nymph(i, cr, r);
      S.push(x / s, 0, z / s, 0, rot, 0);
      for (const [k, g] of Object.entries(n.geos)) S.add(k, g);
      S.pop();
    });
    // the sphere with its ecliptic and meridian bands
    S.blob('main', C.map((v, i) => v), [r, r, r], { w: S.seg(22), h: S.seg(14) });
    S.tube('dark', Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return [C[0] + Math.cos(a) * r * 1.004, C[1] + Math.sin(a) * r * 0.45, C[2] + Math.sin(a + 1.0) * r * 0.2 + Math.cos(a) * 0]; }), [[0.012, 0.012]], { closed: true, seg: 4, rings: 40, ref: [0, 1, 0] });
    return S.finish({ scale: s });
  });
}

export function warrior(k) {
  return cached('lmH-warrior' + k, () => {
    const poses = [
      SIT({ spine: [0.1, 0.2, 0], head: [0.1, 0.5, 0], arms: { R: { hand: [-0.24, 0.9, 0.34], pole: [-0.6, -0.4, -0.6], grip: 'hold', palm: [0, 0, 1] }, L: { hand: [0.24, 0.68, 0.34], pole: [0.6, -0.3, -0.6], grip: 'relaxed', palm: [0, 1, 0] } } }),
      SIT({ spine: [0.0, -0.2, 0], head: [0.05, -0.4, 0], arms: { R: { hand: [-0.22, 0.65, 0.34], pole: [-0.5, -0.4, -0.6], grip: 'relaxed', palm: [0, 1, 0] }, L: { hand: [0.26, 0.92, 0.2], pole: [0.6, -0.3, -0.6], grip: 'hold', palm: [-0.4, 0.2, 0.6] } } }),
    ][k % 2];
    return extend(human({ detail: 0.3, body: { muscle: 0.8, bulk: 1.15 }, pose: poses, outfit: { torso: 'cuirass', hem: 0.3, cape: 'back', capeLen: 0.55, hat: 'roman', trousers: 'none' }, face: { age: 0.3, hair: 'none', beard: 'none', seed: 50 + k } }), (S, info) => {
      const j = info.j, h = j.hands[k % 2 ? 'L' : 'R'].hold;
      S.tube('main', [V.add(h, [0, -1.0, 0]), V.add(h, [0, 0.0, 0]), V.add(h, [0, 0.9, 0])], [[0.014, 0.014], [0.016, 0.016], [0.013, 0.013]], { seg: 6, per: 6 });                    // spear
      S.blob('main', V.add(h, [0, 0.98, 0]), [0.028, 0.09, 0.012], { w: 6, h: 5 });
      S.blob('main', V.add(j.kneeL, [0.18, -0.25, 0.1]), [0.04, 0.34, 0.34], { dir: [1, 0, 0.1], w: 10, h: 8 });                                                                      // the shield leaning on the rock
    });
  });
}

export function hercules() {
  return cached('lmH-hercules', () => {
    const base = human({
      detail: 0.62, body: { muscle: 1.0, bulk: 1.28, shoulders: 1.2 },
      pose: { pelvisRot: [0, -0.1, 0.07], spine: [0.1, 0.2, -0.1], head: [0.35, -0.35, 0.05], legs: { R: { foot: [-0.13, 0, 0.0], yaw: -0.25 }, L: { foot: [0.2, 0, -0.14], yaw: 0.5, lift: 0.0 } },
        arms: { L: { hand: [0.36, 0.95, 0.14], pole: [0.5, -0.1, -0.8], grip: 'relaxed', palm: [-0.6, 0.2, 0.4] }, R: { hand: [-0.12, 0.98, -0.26], pole: [-0.6, -0.3, -0.7], grip: 'hold', palm: [0, 0, 1] } } },
      outfit: { torso: 'nude' }, face: { age: 0.55, hair: 'curly', beard: 'full', brow: 1.0, jaw: 1.2, seed: 61 },
    });
    return extend(base, (S, info) => {
      const j = info.j;
      // the rock with the club, wrapped in the lion skin whose head hangs on the left side
      S.blob('main', [0.4, 0.18, -0.02], [0.3, 0.22, 0.26], { w: 10, h: 8 });
      S.tube('main', [[0.4, 0.2, -0.02], [0.4, 0.7, -0.02], [0.4, 1.12, 0.0]], [[0.075, 0.075], [0.085, 0.085], [0.09, 0.09]], { seg: 10, per: 5 });
      S.tube('main', [[0.45, 1.16, 0.06], [0.5, 0.9, 0.1], [0.52, 0.55, 0.1], [0.5, 0.26, 0.08]], [[0.12, 0.04], [0.14, 0.05], [0.15, 0.05], [0.12, 0.05]], { seg: 10, per: 5, ref: [0, 0, 1], bump: (t, th) => 1 + 0.15 * Math.sin(th * 3 + t * 9) });
      S.blob('main', [0.5, 1.12, 0.1], [0.1, 0.09, 0.09], { w: 8, h: 6 });
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; S.blob('main', [0.5 + Math.cos(a) * 0.1, 1.12 + Math.sin(a) * 0.09, 0.12], [0.04, 0.04, 0.03], { w: 5, h: 4 }); }     // the mane
      // the golden apples in the hidden right hand
      const h = j.hands.R.hold; for (const o of [-0.02, 0.03]) S.blob('main', V.add(h, [o, -0.02, -0.03]), [0.03, 0.03, 0.03], { w: 6, h: 5 });
      // a low plinth plate
      S.blob('main', [0.0, -0.03, 0.0], [0.65, 0.04, 0.5], { w: 12, h: 4 });
    });
  });
}

export function flora() {
  return cached('lmH-flora', () => extend(human({
    detail: 0.5, body: { sex: 'f', bulk: 1.0 },
    pose: { pelvisRot: [0, 0.12, 0.04], spine: [0, -0.1, -0.04], head: [0.12, 0.3, 0.05], legs: { R: { foot: [-0.1, 0, 0.0] }, L: { foot: [0.12, 0, 0.12], lift: 0.0 } },
      arms: { R: { hand: [-0.26, 1.02, 0.22], pole: [-0.6, -0.4, -0.5], grip: 'cup', palm: [0.3, 0.9, 0.2] }, L: { hand: [0.36, 0.8, 0.16], pole: [0.6, -0.3, -0.6], grip: 'hold', palm: [-0.5, 0.5, 0.5] } } },
    outfit: { torso: 'dress', hem: 0.94, flare: 0.3, folds: 0.075, sleeves: 'short', collar: 'none', cape: 'none' },
    face: { age: 0.2, hair: 'cap', mouth: 'smile', seed: 71 },
  }), (S, info) => {
    const j = info.j, hl = j.hands.L.hold;
    S.tube('main', [V.add(hl, [-0.03, 0.05, 0]), V.add(hl, [0.05, -0.22, 0.04]), V.add(hl, [0.08, -0.5, 0.0]), V.add(hl, [0.06, -0.8, -0.04])], [[0.09, 0.03], [0.11, 0.035], [0.12, 0.035], [0.1, 0.03]], { seg: 10, per: 5, ref: [0, 0, 1], bump: (t, th) => 1 + 0.15 * Math.sin(th * 4 + t * 8) });     // the gathered skirt
    const hr = j.hands.R.hold; for (let i = 0; i < 6; i++) S.blob('main', V.add(hr, [Math.cos(i) * 0.05, 0.03 + 0.02 * Math.sin(i * 2), Math.sin(i) * 0.05]), [0.025, 0.02, 0.025], { w: 6, h: 5 });                      // the flowers
  }));
}

const BUSTS = {
  gorchakov: { style: 'civil', turn: -0.3, pitch: 0.03, face: { age: 0.9, hair: 'short', beard: 'sideburns', brow: 0.8, seed: 81 } },
  glinka: { style: 'civil', turn: 0.3, pitch: 0.0, face: { age: 0.5, hair: 'curly', beard: 'sideburns', seed: 82 } },
  lermontov: { style: 'uniform', turn: 0.4, pitch: 0.02, face: { age: 0.12, hair: 'short', beard: 'moustache', mouth: 'stern', seed: 83 } },
  gogol: { style: 'civil', turn: -0.25, pitch: 0.12, face: { age: 0.45, hair: 'long', beard: 'moustache', nose: 1.5, seed: 84 } },
  zhukovsky: { style: 'civil', turn: 0.2, pitch: 0.05, face: { age: 0.6, hair: 'curly', beard: 'sideburns', seed: 85 } },
  przhevalsky: { style: 'uniform', turn: 0.0, pitch: 0.0, face: { age: 0.5, hair: 'short', beard: 'moustache', brow: 0.9, jaw: 1.15, seed: 86 } },
};
export function bustOf(name) { return cached('lmH-bust-' + name, () => bust({ detail: 0.7, ...(BUSTS[name] || BUSTS.glinka) })); }
export function przhevalskyCamel() { return cached('lmH-camel', () => camel({ detail: 0.6 })); }
