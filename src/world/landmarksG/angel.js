// landmarksG/angel.js - the angel of the Alexander Column (B. Orlovsky 1834) built with the shared figure kit (lib/figures.js).  Photo refs/palace-square 115 (angel close up): the angel stands on the
// scaled bronze dome on the ball of the right foot (the left foot trails behind), the body leans slightly, the head is bowed to the right, the left arm hangs and the hand holds the cross close to the body,
// the right arm is raised with a pointing hand, a long tunic with deep folds blows to the right, the big wings are folded high behind the shoulders, a serpent coils round the foot of the cross and over
// the dome.  Built at 1.75 m; the column module scales it x 2.43 (4.26 m; the cross 6.4 m).  Faces +z.
import { human, extend, cached, V, addWing, serpent } from '../lib/figures.js';

export function angelFig() {
  return cached('lmG-angel', () => {
    const base = human({
      detail: 0.55, body: { sex: 'f', bulk: 0.95, shoulders: 1.0 },
      pose: {
        pelvisRot: [0.04, 0.1, -0.05], spine: [0.1, -0.15, 0.06], head: [0.45, 0.35, 0.18],
        legs: { R: { foot: [-0.12, 0, 0.02], yaw: -0.2 }, L: { foot: [0.13, 0, -0.3], yaw: 0.1, lift: 0.0, toeUp: -0.08 } },
        arms: { R: { hand: [-0.2, 1.96, 0.08], pole: [-0.5, 0.0, -0.4], grip: 'point', palm: [0.3, 0.1, 1] }, L: { hand: [0.2, 0.78, 0.2], pole: [0.4, -0.4, -0.7], grip: 'hold', palm: [-0.6, 0.0, 0.7] } },
      },
      outfit: { torso: 'robe', hem: 0.95, flare: 0.5, folds: 0.075, sleeves: 'none', collar: 'none', cape: 'none' },
      face: { age: 0.12, hair: 'curly', mouth: 'closed', brow: 0.3, nose: 0.9, seed: 7 },
    });
    return extend(base, (S, info) => {
      const j = info.j;
      // the wings: the right one (seen on the viewer's right from the front) high, the other behind it
      S.push(0, 0, 0, 0, 0, 0);
      addWing(S, { root: [0.1, 1.42, -0.1], side: 1, pose: 'half', span: 0.95, key: 'main', boneKey: 'main', tilt: [0.1, 0.95, -0.05] });
      addWing(S, { root: [-0.1, 1.42, -0.1], side: -1, pose: 'half', span: 1.0, key: 'main', boneKey: 'main', tilt: [0.1, 0.8, 0.05] });
      S.pop();
      // the cross: the left hand holds it; a Latin cross 2.63 units tall (6.4 m at x2.43) with the foot at the dome
      const h = j.hands.L.hold, fx = h[0] + 0.03, fz = h[2] + 0.02;
      S.tube('main', [[fx, -0.02, fz], [fx, 1.3, fz], [fx, 2.63, fz]], [[0.034, 0.034], [0.034, 0.034], [0.034, 0.034]], { seg: 6, per: 6, ref: [1, 0, 0], cap: false });
      S.tube('main', [[fx - 0.3, 2.3, fz], [fx, 2.3, fz], [fx + 0.3, 2.3, fz]], [[0.034, 0.034], [0.034, 0.034], [0.034, 0.034]], { seg: 6, per: 3, ref: [0, 1, 0] });
      // the serpent crushed by the cross: coils round its foot and down over the dome
      const c = [fx, 0, fz];
      const coil = []; for (let i = 0; i <= 14; i++) { const t = i / 14, a = t * 8.2, r = 0.1 + 0.09 * Math.sin(Math.PI * t); coil.push([c[0] + Math.cos(a) * r, 0.01 + 0.34 * (1 - t) ** 0.8 * 0.9 + 0.03, c[2] + Math.sin(a) * r]); }
      coil.push([c[0] - 0.3, 0.02, c[2] - 0.3], [c[0] - 0.55, -0.02, c[2] - 0.45]);
      const sn = serpent(coil, 0.032, { key: 'main' });
      for (const [k, g] of Object.entries(sn.geos)) S.add(k, g);
      void V;
    });
  });
}
