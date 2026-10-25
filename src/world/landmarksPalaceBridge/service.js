// landmarksPalaceBridge/service.js - PURE (no three.js): the Palace Bridge description for lib/bascule.js (the frame, the two leaves, the gates, the cross-section), the published service
// `ctx.services.landmarksPalaceBridge` and the leaf colliders. The module (../landmarksPalaceBridge.js) wires it to the meshes; tools/palacebridge-test.mjs drives the same code headlessly.
import * as BA from '../lib/bascule.js';
import { createPalaceClock } from './schedule.js';
import { FR, toWorld, toUV, LEAF_SPECS, GATE_S, GATE_N, HW, HV, ROAD, KERB, PAVE, KERB_H, BOUNDS, LEN, yDeck, THETA_MAX, UM } from './frame.js';

export const VP0 = ROAD + KERB, VP1 = HW + 0.1;
/** the cross-section the leaves are built to: asphalt |v| < ROAD, the barrier kerb |v| in [ROAD, VP0] (0.45 m), the pavements |v| in [VP0, VP1] (+0.12 m), the railing line at |v| = HW - 0.14 */
export const LEAVES = LEAF_SPECS.map((s) => BA.makeLeaf(s));
/** the description of the bridge that lib/bascule.js reads */
export const BRIDGE = {
  id: 'palacebridge', frame: { cx: FR.cx, cz: FR.cz, T: FR.T, c: FR.c, s: FR.s, toWorld, toUV },
  leaves: LEAVES, gates: [{ id: 's', u: GATE_S, dir: +1 }, { id: 'n', u: GATE_N, dir: -1 }],
  vMax: HV, bounds: BOUNDS, thetaMax: THETA_MAX,
  yStatic: (u) => yDeck(Math.max(0, Math.min(LEN, u))),
  walkLift: () => 0,                                     // the player's floor is the walk ramp at the asphalt level, as on the fixed deck (bridges/palace.js colliders): no pavement lift for the engine
  liftOf: (v) => (Math.abs(v) >= VP0 ? PAVE : 0.03),     // what a pedestrian's feet stand above the asphalt (deckLift)
};
/** the lines of the dynamic colliders of ONE leaf: the two railings (block walkers and cars, open above 1.45 m) and the two barrier kerbs */
export const RAIL_LINES = [-1, 1].map((sg) => ({ v: sg * (HW - 0.14), w: 0.4, y0Off: -1.2, y1Off: PAVE + 1.25 }));
export const KERB_LINES = [-1, 1].map((sg) => ({ v: sg * (ROAD + KERB / 2), w: KERB, y0Off: -1.0, y1Off: KERB_H + 0.1 }));
export const LINES = [...RAIL_LINES, ...KERB_LINES];

/** the GATES the NPC world stops at: id 's' (u = GATE_S, pointing +u) and 'n' (GATE_N, -u) */
export const GATE_ID = (g) => 'palacebridge-' + g;

/** createService({ clock?, cfg?, mode? }) -> the published service (see lib/bascule.js createBasculeService), plus `frame`, `leaves`, `UM` */
export function createService(o = {}) {
  const clock = o.clock || createPalaceClock({ cfg: o.cfg, mode: o.mode });
  const svc = BA.createBasculeService(BRIDGE, { clock });
  svc.frame = { toWorld, toUV, FR }; svc.UM = UM; svc.B = BRIDGE;
  return svc;
}
export const addStopLines = (streets, svc, wayIds) => BA.addStopLines(streets, svc, wayIds, 'palacebridge-');
export const stepWalker = (p, th0, th1, dt, st) => BA.stepWalker(p, BRIDGE, th0, th1, dt, st);
export const stepCar = (car, th0, th1, dt, st) => BA.stepCar(car, BRIDGE, th0, th1, dt, st);
export const bodyState = BA.bodyState;
export const createRamps = (ph) => LEAVES.map((lf) => BA.createRamp(ph, BRIDGE, lf, 2 * HW + 0.2));
export const placeRamps = (items, th) => { for (let i = 0; i < items.length; i++) BA.placeRamp(items[i], BRIDGE, LEAVES[i], th); };
/** the dynamic boxes of both leaves at theta (writes into `pool`, returns it) */
export function dynBoxes(theta, pool = []) { let n = 0; for (const lf of LEAVES) n = BA.leafBoxes(BRIDGE, lf, theta, LINES, pool, n); pool.length = n; return pool; }
