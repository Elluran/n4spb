// landmarksOktyabrsky/figure.js - the two bronze figures of the module, built with the shared figure kit (lib/figures.js, docs/FIGURES.md):
//   kapodistriasFig()  IOANNIS KAPODISTRIAS (V. M. Klykov, 2003): standing bare-headed in a frock coat with wide lapels, a double-breasted waistcoat (two rows of six buttons), a high collar and a knotted
//                      cravat, long trousers and low shoes; a SHOULDER CAPE ending at the elbows and a long cloak that falls down his left side to the ankle (hem curling forward), a broad mantle behind;
//                      weight on the left leg, the right leg stepped out, the cane in the right fist, the left hand flat on the waistcoat; short curly hair, side-whiskers, thin spectacles.
//                      Dossier docs/research/oktyabrsky-square.md 3.5 / 3.6 (starting parameters), photos sq_01 (crops figure / ped), sq_03 (crop mon), 12; unit height 1.75 m (place at scale 1.35 = 2.36 m).
//   octoberFigs()      the three nude male figures of A. T. Matveev's "Октябрь" (the standing one, the seated one, the kneeling one), built at detail 0.6 for the group on the granite block.
// Figures face +z, stand on y = 0, +x is the figure's LEFT.
import { human, extend, cached, V } from '../lib/figures.js';

export const kapodistriasFig = () => cached('lmOkt-kapodistrias', () => extend(human({
  detail: 0.95, body: { muscle: 0.15, bulk: 1.0, shoulders: 1.02 },
  pose: {
    pelvis: [0, 0.955, 0], pelvisRot: [0, 0.10, -0.05], spine: [0, -0.06, 0.05], head: [0.07, -0.20, 0.03],
    legs: { L: { foot: [0.095, 0, -0.01], yaw: 0.10, pole: [0.05, 0, 1] }, R: { foot: [-0.185, 0, 0.17], yaw: -0.38, pole: [-0.12, 0, 1] } },
    arms: {
      R: { hand: [-0.285, 0.80, 0.07], pole: [-0.5, -0.2, -0.8], grip: 'fist', palm: [0.3, 0.1, 0.9] },
      L: { hand: [0.06, 1.12, 0.185], pole: [0.9, -0.3, -0.6], grip: 'flat', palm: [0, 0.2, -1] },
    },
  },
  outfit: { torso: 'coat', hem: 0.62, flare: 0.1, folds: 0.03, open: 0.9, sleeves: 'long', trousers: 'long', boots: 0.07, collar: 'fall', buttons: true, hat: 'none' },
  face: { age: 0.5, hair: 'short', beard: 'sideburns', brow: 0.85, jaw: 1.0, mouth: 'stern', seed: 21 },
}), (S, info) => {
  const J = info.j, hold = J.hands.R.hold;
  // ---- the cane: a thin shaft from the right fist straight down to the ground just outside the right foot, a round knob above the fist
  S.tube('accent', [[hold[0], hold[1] + 0.02, hold[2]], [hold[0] - 0.004, 0.5, 0.12], [-0.292, 0.04, 0.17], [-0.292, 0.0, 0.17]], [[0.011, 0.011], [0.0105, 0.0105], [0.0085, 0.0085], [0.0085, 0.0085]], { seg: 6, per: 3 });
  S.blob('accent', [hold[0], hold[1] + 0.045, hold[2]], [0.024, 0.024, 0.024], { w: 8, h: 6 });
  // ---- the shoulder cape: a short mantle from the neck over the shoulders to the elbows, open at the front (the waistcoat shows)
  const yT = J.neckBase[1] + 0.02, yS = J.shoulderL[1], yE = (J.elbowL[1] + J.elbowR[1]) / 2 + 0.03, xs = Math.abs(J.shoulderL[0]);
  const capeP = [[0, yT, -0.015], [0, yS + 0.035, -0.015], [0, yS - 0.07, -0.02], [0, (yS + yE) / 2, -0.028], [0, yE, -0.035]];
  const capeR = [[0.088, 0.088], [xs + 0.035, 0.125], [xs + 0.1, 0.165], [xs + 0.125, 0.19], [xs + 0.12, 0.2]];
  S.tube('main', capeP, capeR, { seg: 30, per: 4, cap: false, sector: (t) => [Math.PI / 2 + 0.55 + 0.1 * t, Math.PI / 2 + Math.PI * 2 - 0.55 - 0.1 * t], bump: (t, th) => 1 + 0.022 * Math.sin(7 * th + 4 * t) + 0.018 * t * Math.sin(13 * th) });
  // ---- the broad mantle behind: from the shoulders to mid-calf, hugging the back of the coat (the kit's own mantle is too wide for a 1.75 m man in a frock coat)
  S.tube('main', [[0, yS + 0.04, -0.03], [0, yS - 0.1, -0.03], [0, 0.95, -0.04], [0, 0.62, -0.05], [0, 0.4, -0.06]], [[0.1, 0.1], [0.235, 0.17], [0.265, 0.2], [0.3, 0.24], [0.325, 0.27]],
    { seg: 28, per: 4, cap: false, sector: [-Math.PI / 2 - 1.4, -Math.PI / 2 + 1.4], bump: (t, th) => 1 + 0.03 * Math.sin(6 * th + 4 * t) + 0.02 * t * Math.sin(11 * th) });
  // ---- the long cloak: from the left shoulder (the figure's left = +x) down outside the arm and hip to the ankle, flaring, the hem curling forward
  const cloakP = [[xs + 0.02, yS - 0.04, -0.03], [xs + 0.07, yS - 0.2, -0.03], [0.285, 0.95, -0.02], [0.3, 0.6, 0.0], [0.31, 0.3, 0.03], [0.3, 0.12, 0.08], [0.275, 0.07, 0.15]];
  const cloakR = [[0.05, 0.12], [0.055, 0.17], [0.055, 0.2], [0.06, 0.225], [0.07, 0.245], [0.08, 0.26], [0.07, 0.24]];
  S.tube('main', cloakP, cloakR, { seg: 22, per: 5, cap: true, capN: 2, bump: (t, th) => 1 + 0.07 * Math.sin(5 * th + 3.5 * t) * Math.min(1, t * 2) + 0.035 * Math.sin(11 * th - 6 * t) });
  // ---- a stand-up cloak collar behind the neck, the cravat in front
  S.tube('main', [[0, 1.47, -0.03], [0, 1.55, -0.04]], [[0.082, 0.078], [0.075, 0.07]], { seg: 16, per: 2, cap: false, sector: [Math.PI * 0.62, Math.PI * 2.38] });
  S.blob('main', [0, 1.455, 0.095], [0.05, 0.034, 0.038], { dir: [0, -0.2, 1], w: 8, h: 6 });
  S.blob('main', [0, 1.43, 0.115], [0.026, 0.05, 0.02], { dir: [0, -0.2, 1], w: 6, h: 5 });
  // ---- thin spectacles: two rings and a bridge in front of the eyes (head frame of the kit)
  const H = J.head, put = (a, b, c) => V.add(V.add(V.add(H.c, V.mul(H.x, a)), V.mul(H.y, b)), V.mul(H.z, c));
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; pts.push(put(s * 0.034 + Math.cos(t) * 0.018, 0.008 + Math.sin(t) * 0.0155, 0.088)); }
    S.tube('accent', pts, [[0.0024, 0.0024]], { closed: true, seg: 4, rings: 10, ref: H.y });
  }
  S.tube('accent', [put(-0.013, 0.014, 0.09), put(0, 0.018, 0.093), put(0.013, 0.014, 0.09)], [[0.0024, 0.0024]], { seg: 4, per: 2 });
}));

/** the three figures of "Октябрь": index 0 the standing one (back), 1 the seated one (left), 2 the kneeling one (front); each Figure at unit height 1.75 m */
export const octoberFigs = () => [
  cached('lmOkt-oct0', () => human({
    detail: 0.6, body: { muscle: 0.9, bulk: 1.05, shoulders: 1.06 },
    pose: {
      pelvisRot: [0, -0.12, 0.05], spine: [0.02, 0.14, -0.05], head: [-0.05, 0.28, 0],
      legs: { L: { foot: [0.16, 0, 0.04], yaw: 0.25 }, R: { foot: [-0.15, 0, -0.1], yaw: -0.2 } },
      arms: { L: { hand: [0.27, 1.08, 0.2], pole: [1, -0.2, -0.4], grip: 'fist', palm: [0, 0, 1] }, R: { hand: [-0.12, 1.42, 0.12], pole: [-0.7, 0.8, -0.3], grip: 'fist', palm: [0, 0.2, 1] } },
    },
    outfit: { torso: 'nude' }, face: { age: 0.3, hair: 'short', mouth: 'stern', brow: 0.8, jaw: 0.9, seed: 5 },
  })),
  cached('lmOkt-oct1', () => human({
    detail: 0.6, body: { muscle: 0.8, bulk: 1.0 },
    pose: {
      pelvis: [0, 0.5, 0], pelvisRot: [0.05, 0.2, 0], spine: [0.08, 0.1, 0], head: [0.1, 0.3, 0],
      legs: { L: { foot: [0.15, 0, 0.42], yaw: 0.3, pole: [0.1, 0.1, 1] }, R: { foot: [-0.14, 0, 0.3], yaw: -0.1, pole: [-0.1, 0.1, 1] } },
      arms: { L: { hand: [0.2, 0.62, 0.38], pole: [0.7, -0.3, -0.2], grip: 'fist', palm: [0, 1, 0] }, R: { hand: [-0.15, 0.85, 0.3], pole: [-0.7, 0.2, -0.3], grip: 'relaxed', palm: [0.5, 0.2, 0.8] } },
    },
    outfit: { torso: 'nude' }, face: { age: 0.5, hair: 'short', beard: 'full', mouth: 'stern', brow: 0.7, jaw: 1.0, seed: 8 },
  })),
  cached('lmOkt-oct2', () => human({
    detail: 0.6, body: { muscle: 0.95, bulk: 1.05, shoulders: 1.08 },
    pose: {
      pelvis: [0, 0.6, 0], pelvisRot: [0.55, 0.0, 0.0], spine: [0.35, -0.2, 0], head: [-0.2, -0.3, 0],
      legs: { L: { foot: [0.17, 0, 0.34], yaw: 0.1, pole: [0, 0.2, 1] }, R: { foot: [-0.13, 0.05, -0.38], yaw: -0.1, lift: 0.18, pole: [0, 0, 1] } },
      arms: { L: { hand: [0.3, 0.62, 0.62], pole: [0.8, -0.1, 0.1], grip: 'fist', palm: [0, 0, 1] }, R: { hand: [-0.3, 0.62, 0.6], pole: [-0.8, -0.1, 0.1], grip: 'fist', palm: [0, 0, 1] } },
    },
    outfit: { torso: 'nude' }, face: { age: 0.2, hair: 'short', mouth: 'stern', brow: 0.9, jaw: 1.0, seed: 13 },
  })),
];
