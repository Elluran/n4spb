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
/** the BAYS of a leaf (docs/AREAS.md 13.10): the rail panels (blocks walkers and cars, open above 1.45 m) and the barrier kerb pieces are breakable knock records with a dynamic box each (lib/bascule-bays.js); the box specs: thickness across, bottom / top over
 *  the surface at the middle of the bay (the top of a rail counts the 0.12 m pavement) */
export const BAY_RAIL = { d: 0.4, lo: -1.2, hi: PAVE + 1.25 };
export const BAY_KERB = { d: KERB, lo: -1.0, hi: KERB_H + 0.1 };
/** a kerb piece of about 3.6 m (wider than a car, like the 4 m pieces of the Troitsky leaf, so one hit meets one piece; the rise under a piece stays within 1.2 m up to the walker's footing limit of 35 degrees: the dynamic box follows the slope) */
export const KERB_PIECE = 3.6;
/** the bays of one leaf: both rails (the railing line at |v| = HW - 0.14, the panel foot 0.1 above the pavement) then both barrier kerbs; rs = railSpec('palace') = { W, H } (bridges/rails.js; passed in because this file is pure) */
export const makeBays = (leaf, rs) => BA.leafBays(leaf, { rail: { W: rs.W, H: rs.H, v: HW - 0.14, n: PAVE + 0.1, k: BAY_RAIL }, kerb: { len: KERB_PIECE, v: ROAD + KERB / 2, k: BAY_KERB } });
/** the world box of a bay of `leaf` at theta (lib/bascule.js leafBayAt) */
export const leafBayAt = (leaf, th, sMid, len, v, k, out = {}) => BA.leafBayAt(BRIDGE, leaf, th, sMid, len, v, k, out);

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
