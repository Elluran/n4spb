// landmarksC/klodt.js - the four bronze "Horse Tamers" (Klodt 1838-1851) built with the shared figure kit (lib/figures.js): a lofted rearing horse (sculpted head, mane, bridle, anatomy) and a nude
// athletic youth with a face and hands, posed from the joint tables of the first version (x forward, y up from the plinth, z towards the roadway; the youth of 2.0 m, the horse 3.3 m at the poll).
//   A "Конь с идущим юношей" (1838): the youth strides beside the horse, the right arm stretched to the bridle           B "Юноша, берущий коня под уздцы" (1841): the horse rears wildly, the youth faces it
//   C "Юноша, сдерживающий коня" (1851): the youth kneels and pulls the reins with both hands                            D "Юноша, поверженный конём" (1851): the youth lies under the horse
// groupFigs(key, sgn) builds the pair in a KIT frame (+z forward, +x left, origin on the plinth under the group); sgn = +-1 mirrors the lateral axis so that the groups of the four corners (which
// face different ways across the bridge) never need a mirrored matrix (inside-out faces).  Bronze #33372f, patina #566a5c.
import { human, horse, extend, cached, V } from '../lib/figures.js';

export const POSES = {
  A: {
    horse: { croup: [-1.2, 1.55, 0], chest: [0.45, 2.55, 0], poll: [1.0, 3.45, 0.05], nose: [1.5, 2.95, 0.2],
      fore: [[[0.5, 2.2, 0.3], [1.25, 2.3, 0.38], [1.62, 1.72, 0.4]], [[0.45, 2.15, -0.3], [0.95, 2.35, -0.35], [0.8, 1.7, -0.35]]],
      hind: [[[-1.05, 1.45, 0.22], [-1.55, 0.7, 0.25], [-1.2, 0.05, 0.25]], [[-1.1, 1.4, -0.22], [-1.7, 0.65, -0.25], [-1.5, 0.05, -0.25]]],
      tail: [[-1.4, 1.6, 0], [-2.0, 1.4, 0], [-2.25, 0.8, 0], [-2.2, 0.15, 0]] },
    youth: { head: [0.5, 1.96, 0.85], neck: [0.5, 1.72, 0.85], chest: [0.52, 1.5, 0.85], pelvis: [0.5, 1.05, 0.85],
      shL: [0.45, 1.62, 0.62], shR: [0.55, 1.62, 1.08], elL: [0.3, 1.35, 0.6], elR: [0.85, 1.9, 0.9], haL: [0.7, 1.05, 0.55], haR: [1.2, 2.25, 0.6],
      hipL: [0.45, 1.0, 0.78], hipR: [0.58, 1.0, 0.95], knL: [0.45, 0.52, 0.78], knR: [0.7, 0.5, 1.0], ftL: [0.3, 0.05, 0.8], ftR: [0.8, 0.05, 1.0] },
    rein: [[1.2, 2.25, 0.6], [0.7, 1.05, 0.55]],
  },
  B: {
    horse: { croup: [-0.95, 1.2, 0], chest: [0.25, 2.7, 0], poll: [0.8, 3.3, -0.05], nose: [1.2, 2.85, 0.05],
      fore: [[[0.35, 2.35, 0.3], [0.95, 3.0, 0.35], [1.3, 2.7, 0.35]], [[0.3, 2.3, -0.3], [0.9, 2.6, -0.3], [1.4, 2.2, -0.3]]],
      hind: [[[-0.85, 1.1, 0.22], [-1.4, 0.55, 0.25], [-1.1, 0.0, 0.25]], [[-0.9, 1.05, -0.22], [-1.5, 0.5, -0.25], [-1.4, 0.0, -0.25]]],
      tail: [[-1.1, 1.25, 0], [-1.7, 1.0, 0], [-1.95, 0.4, 0], [-1.9, 0.0, 0]] },
    youth: { head: [1.15, 1.95, 0.8], neck: [1.15, 1.72, 0.8], chest: [1.13, 1.5, 0.8], pelvis: [1.1, 1.05, 0.8],
      shL: [1.1, 1.65, 0.62], shR: [1.2, 1.62, 1.0], elL: [1.2, 2.05, 0.5], elR: [1.3, 1.3, 1.1], haL: [1.2, 2.45, 0.35], haR: [1.15, 1.0, 1.0],
      hipL: [1.0, 1.0, 0.68], hipR: [1.18, 1.0, 0.92], knL: [0.9, 0.52, 0.55], knR: [1.4, 0.5, 1.0], ftL: [0.8, 0.05, 0.55], ftR: [1.6, 0.05, 1.05] },
    rein: [[1.2, 2.45, 0.35]],
  },
  C: {
    horse: { croup: [-1.1, 1.4, 0], chest: [0.35, 2.7, 0], poll: [0.8, 3.45, 0], nose: [1.3, 3.0, 0.15],
      fore: [[[0.4, 2.3, 0.3], [1.0, 2.9, 0.35], [1.45, 2.6, 0.4]], [[0.35, 2.25, -0.3], [0.85, 2.55, -0.3], [1.3, 2.1, -0.35]]],
      hind: [[[-0.95, 1.3, 0.22], [-1.5, 0.65, 0.25], [-1.2, 0.0, 0.25]], [[-1.0, 1.25, -0.22], [-1.6, 0.6, -0.25], [-1.45, 0.0, -0.25]]],
      tail: [[-1.3, 1.45, 0], [-1.9, 1.25, 0], [-2.15, 0.65, 0], [-2.1, 0.1, 0]] },
    youth: { head: [1.05, 1.75, 0.78], neck: [1.0, 1.55, 0.8], chest: [0.92, 1.28, 0.82], pelvis: [0.7, 0.9, 0.86],
      shL: [0.95, 1.5, 0.62], shR: [0.95, 1.46, 1.0], elL: [1.1, 1.8, 0.5], elR: [1.15, 1.85, 0.8], haL: [1.15, 2.2, 0.38], haR: [1.25, 2.2, 0.45],
      hipL: [0.65, 0.85, 0.74], hipR: [0.75, 0.9, 0.97], knL: [0.9, 0.12, 0.6], knR: [1.2, 0.8, 0.98], ftL: [0.4, 0.08, 0.62], ftR: [1.2, 0.0, 1.0] },
    rein: [[1.15, 2.2, 0.38], [1.25, 2.2, 0.45]],
  },
  D: {
    horse: { croup: [-1.2, 1.5, 0], chest: [0.3, 2.9, 0], poll: [0.7, 3.55, 0], nose: [1.15, 3.15, 0.1],
      fore: [[[0.35, 2.5, 0.3], [0.85, 3.0, 0.3], [1.2, 2.6, 0.32]], [[0.3, 2.45, -0.3], [0.7, 2.9, -0.3], [1.0, 2.4, -0.3]]],
      hind: [[[-1.05, 1.4, 0.22], [-1.55, 0.7, 0.25], [-1.25, 0.0, 0.25]], [[-1.1, 1.35, -0.22], [-1.7, 0.65, -0.25], [-1.55, 0.0, -0.25]]],
      tail: [[-1.4, 1.55, 0], [-2.0, 1.3, 0], [-2.25, 0.7, 0], [-2.2, 0.1, 0]] },
    youth: { head: [1.2, 0.98, 0.95], neck: [1.0, 0.86, 0.95], chest: [0.8, 0.72, 0.95], pelvis: [0.15, 0.4, 0.92],
      shL: [0.85, 0.85, 0.78], shR: [0.9, 0.82, 1.12], elL: [1.05, 1.3, 0.6], elR: [0.75, 0.4, 1.22], haL: [1.2, 1.7, 0.4], haR: [0.55, 0.1, 1.22],
      hipL: [0.1, 0.38, 0.8], hipR: [0.1, 0.38, 1.04], knL: [-0.4, 0.3, 0.7], knR: [-0.1, 0.72, 1.1], ftL: [-0.9, 0.1, 0.65], ftR: [-0.5, 0.2, 1.15] },
    rein: [[1.2, 1.7, 0.4]],
  },
};

const HS = 1.3, YS = 1.36;                            // the horse is built at real size and placed x1.3; the youth (1.75 m) x1.12 = 1.96 m
// per pose: the pitch of the body (rad), the head tilt and the youth's torso / head leaning
const TUNE = {
  A: { pitch: 0.54, neckA: 0.5, arch: 0.4, spine: [0.0, 0.0, 0], yaw: 0.8, hpitch: 0.1 },
  B: { pitch: 0.88, neckA: 0.35, arch: 0.45, spine: [-0.1, 0.0, 0], yaw: 0.2, hpitch: 0.45 },
  C: { pitch: 0.72, neckA: 0.42, arch: 0.4, spine: [0.35, 0.0, 0], yaw: 0.5, hpitch: 0.3 },
  D: { pitch: 0.76, neckA: 0.4, arch: 0.4, spine: [0.1, 0.2, 0], yaw: 0.6, hpitch: -0.2 },
};

export function groupFigs(key, sgn) {
  return cached('lmC-klodt-' + key + sgn, () => {
    const pz = POSES[key], H = pz.horse, Y = pz.youth, T = TUNE[key];
    const kh = (p) => [sgn * p[2] / HS, p[1] / HS, p[0] / HS];              // table -> horse kit units
    const ky = (p) => [sgn * p[2] / YS, p[1] / YS, p[0] / YS];              // table -> youth kit units
    // ---- the horse: hind hooves on the plinth, forelegs where the table puts the hooves
    const legs = {};
    const put = (name, p) => { legs[name] = { hoof: kh(p), pole: [0, 0.7, 0.7] }; };
    for (const leg of H.hind) { const p = leg[2], h = kh(p); legs[h[0] >= 0 ? 'hl' : 'hr'] = { hoof: [h[0], 0.0, h[2]] }; }
    for (const leg of H.fore) { const p = leg[2], h = kh(p), top = kh(leg[0]); legs[h[0] >= 0 ? 'fl' : 'fr'] = { hoof: V.mul(V.sub(h, top), 0.6), frame: 'top', pole: [0, 0.8, 0.5] }; }
    void put;
    const tail = kh(H.tail[3]);
    const hip = kh([(H.croup[0] + H.chest[0]) * 0.5 - 0.5, H.croup[1] - 0.05, 0]);
    const hz = horse({
      detail: 0.42, mane: sgn > 0 ? 'right' : 'left', tail: 'ground', bridle: true, seed: key.charCodeAt(0),
      pose: { pitch: T.pitch, shift: [0, hip[1] - 1.15 + 0.35, hip[2] + 0.6 - 0.25], neck: { angle: T.neckA, arch: T.arch, len: 0.85 }, head: { pitch: T.hpitch + T.pitch + 0.4, turn: 0.25 * sgn, open: 0.15 }, tailEnd: [tail[0], tail[2]], legs, ears: 'back' },
    });
    // ---- the youth
    const side = (l, r) => (ky(Y[l])[0] >= ky(Y[r])[0] ? [l, r] : [r, l]);        // which table limb is the kit's LEFT (+x)
    const [sL, sR] = side('shL', 'shR');
    const sw = (a) => (a.endsWith('L') ? (sL === 'shL' ? a : a.slice(0, -1) + 'R') : (sL === 'shL' ? a : a.slice(0, -1) + 'L'));
    const arm = (side2) => ({ hand: ky(Y[sw('ha' + side2)]), pole: [side2 === 'L' ? 0.5 : -0.5, -0.5, -0.4], grip: pz.rein.some((r) => V.len(V.sub(r, Y[sw('ha' + side2)])) < 0.05) ? 'hold' : 'relaxed', palm: [0, 0, 1] });
    const leg = (side2) => { const f = ky(Y[sw('ft' + side2)]), k = ky(Y[sw('kn' + side2)]); return { foot: [f[0], f[1] - 0.0, f[2]], pole: V.sub(k, ky(Y[sw('hip' + side2)])), yaw: 0.2 * (side2 === 'L' ? 1 : -1) }; };
    const youth = extend(human({
      detail: 0.34, body: { muscle: 0.8, bulk: 1.0 },
      pose: { pelvis: ky(Y.pelvis), spine: T.spine, head: [0.0, -sgn * T.yaw, 0], legs: { L: leg('L'), R: leg('R') }, arms: { L: arm('L'), R: arm('R') } },
      outfit: { torso: 'nude' }, face: { age: 0.1, hair: 'curly', seed: key.charCodeAt(0) },
    }), (S, info) => {
      const nose = ky(H.nose);                                                      // reins: from the fists to the horse's mouth
      for (const [hand] of [[info.j.hands.L.hold], [info.j.hands.R.hold]]) { if (V.len(V.sub(hand, nose)) > 3.2) continue; S.tube('main', [hand, V.lerp(hand, nose, 0.5).map((v, i) => v - (i === 1 ? 0.12 : 0)), nose], [[0.011, 0.011], [0.011, 0.011], [0.009, 0.009]], { seg: 4, per: 6 }); }
      // the pelt / loin cloth over the hips
      S.blob('main', V.add(info.j.pelvis, [0, -0.06, 0]), [0.2, 0.17, 0.2], { w: 8, h: 6 });
    });
    return { horse: hz, youth };
  });
}
export const KLODT_SCALE = { horse: HS, youth: YS };
