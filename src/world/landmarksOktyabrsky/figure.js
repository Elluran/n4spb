// landmarksOktyabrsky/figure.js - the bronze figures of the module, built with the shared figure kit (lib/figures.js, docs/FIGURES.md):
//   octoberFigs()      the three nude male figures of A. T. Matveev's "Октябрь" (the standing one, the seated one, the kneeling one), built at detail 0.6 for the group on the granite block.
// Figures face +z, stand on y = 0, +x is the figure's LEFT.
import { human, cached } from '../lib/figures.js';

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
