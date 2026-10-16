// landmarksGavan/stair.js - the granite STAIR cut into the canal face of the EAST MOLE, directly north of the east kronshpits (docs/research/gavan.md 4.3; photos refs/gavan 02 03 05, critic C5): about 13 steps, 1.9 m wide, recessed
// into the mole and rising toward the east from the water to the lawn at K (15.75 .. 19.65, -21.75 .. -19.85), landmark-owned like landmarksStrelka/descent.js: groups.js WATER_RINGS turns the ring (K u 15.3 .. 19.75, v -21.8 .. -19.8)
// into water, the canal wall opens there and this part draws the treads, the risers, the two cheek walls from the water to the lawn and the colliders.  Frame K.  MChS territory: visual (the walk boxes are real, the mole is fenced).
// MODES: `sunk` (the ring is honoured: layout.inRiver at the stair) draws the flight; otherwise nothing is drawn (the generic mole is left alone).
import * as L from '../layout.js';
import { FK } from './frame.js';

const U0 = 15.75, TREAD = 0.30, N = 13, V0 = -21.75, V1 = -19.85, WATER = -3.4, RISE = 3.4 / N;

export function build(Q) {
  const P = Q.P, M = Q.M, ph = Q.ctx.physics;
  const probe = (u, v) => { const w = FK.W(u, v); return L.inRiver(w.x, w.z); };
  const sunk = probe(16.6, -20.8) && probe(18.6, -20.8) && probe(17.6, -21.5) && probe(17.6, -20.1);
  Q.svc.stair = { sunk };
  if (!sunk) return;
  const yk = (k) => WATER + RISE * k;
  FK.on(P, () => {
    const slab = (a, b, c, d) => P.quad(M.granite, a, b, c, d, [0, 1, 0], [[a[0] / 2, a[2] / 2], [b[0] / 2, b[2] / 2], [c[0] / 2, c[2] / 2], [d[0] / 2, d[2] / 2]]);
    for (let k = 1; k <= N; k++) {
      const ua = U0 + TREAD * (k - 1), ub = ua + TREAD + (k === N ? 0.2 : 0), y = yk(k), yp = k === 1 ? -3.7 : yk(k - 1);
      P.quad(M.granite, [ua, yp, V0], [ua, yp, V1], [ua, y, V1], [ua, y, V0], [-1, 0, 0], [[V0 / 2, yp / 0.5], [V1 / 2, yp / 0.5], [V1 / 2, y / 0.5], [V0 / 2, y / 0.5]]);      // the riser (faces the water)
      slab([ua, y, V0], [ua, y, V1], [ub, y, V1], [ub, y, V0]);
      const c = FK.W((ua + ub) / 2, (V0 + V1) / 2), it = ph.addWalkBox(c.x, c.z, ub - ua + 0.04, V1 - V0 + 0.1, FK.rot, y, -5); if (it) it.sticky = true;
    }
    // the two cheek walls: inner faces from below the water to the lawn, a granite coping on top
    const top = 0.0, end = U0 + N * TREAD;
    for (const [v, nz] of [[V0, 1], [V1, -1]]) {
      P.quad(M.ashlar, [U0 - 0.1, -3.9, v], [end + 0.05, -3.9, v], [end + 0.05, top, v], [U0 - 0.1, top, v], [0, 0, nz], [[0, 0], [2, 0], [2, 1.6], [0, 1.6]]);
      P.box(M.coping, U0 - 0.1, end + 0.05, top - 0.02, top + 0.14, nz > 0 ? v - 0.35 : v, nz > 0 ? v : v + 0.35, 'b', 1);
    }
    // the wet skirt closes the first riser and the cracks to the quay wall under the water line
    P.quad(M.ashlar, [U0 - 0.05, -3.9, V0], [U0 - 0.05, -3.9, V1], [U0 - 0.05, -3.4, V1], [U0 - 0.05, -3.4, V0], [-1, 0, 0], [[0, 0], [1, 0], [1, 0.3], [0, 0.3]]);
  });
  for (const v of [V0 - 0.15, V1 + 0.15]) FK.box(ph, (U0 + U0 + N * TREAD) / 2, v, N * TREAD + 0.2, 0.3, -5, 0.3);                    // the cheek walls are solid
  FK.box(ph, U0 - 0.25, (V0 + V1) / 2, 0.3, V1 - V0 + 0.6, -6, WATER + 0.9);                                                           // nobody steps off the bottom tread into the water
}
