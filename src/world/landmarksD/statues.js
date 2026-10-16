// landmarksD/statues.js - the Dostoevsky monument at Vladimirskaya Square (K. Rukavishnikov, 1997) with the shared figure kit (lib/figures.js): the writer sits on a low block, leaning forward, the
// forearms on the knees with the hands clasped, the head bowed in thought, a frock coat with a cravat, full beard, receding hair.  Built at 1.75 m (seated 1.3 m); the module places it x 1.15.
import { human, cached } from '../lib/figures.js';

export function dostoevsky() {
  return cached('lmD-dostoevsky', () => human({
    detail: 0.7, body: { muscle: 0.1, bulk: 0.95 },
    pose: {
      pelvis: [0, 0.5, -0.08], pelvisRot: [0.12, 0.1, 0], spine: [0.35, 0.1, 0], head: [0.35, 0.2, 0.05],
      legs: { L: { foot: [0.15, 0, 0.3], yaw: 0.25, pole: [0.1, 0.2, 1] }, R: { foot: [-0.14, 0, 0.18], yaw: -0.3, pole: [-0.1, 0.2, 1] } },
      arms: { L: { hand: [0.06, 0.62, 0.42], pole: [0.6, -0.5, -0.4], grip: 'hold', palm: [-0.6, 0.2, 0.3] }, R: { hand: [-0.02, 0.62, 0.4], pole: [-0.6, -0.5, -0.4], grip: 'hold', palm: [0.6, 0.2, 0.3] } },
    },
    outfit: { torso: 'coat', hem: 0.3, flare: 0.25, folds: 0.04, sleeves: 'long', trousers: 'long', boots: 0.12, collar: 'fall', buttons: false, hair: 'short' },
    face: { age: 0.7, hair: 'short', beard: 'full', brow: 0.9, jaw: 1.0, mouth: 'stern', seed: 91 },
  }));
}
