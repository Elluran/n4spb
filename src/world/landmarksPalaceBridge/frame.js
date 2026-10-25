// landmarksPalaceBridge/frame.js - PURE numbers and functions of the Palace Bridge (Дворцовый мост) opening mechanism: the frame, the cross-section, the deck profile of the CLOSED bridge, the TWO bascule leaves (their hinges on the
// inner faces of the two bascule piers, their rest tilt and the height / slope of their surfaces as a function of the opening angle theta), the gates. The module, the physics colliders, the traffic / people hooks, bridges/palace.js (which
// stops drawing the central span when the module is on) and tools/palacebridge-test.mjs all read this ONE set of numbers. The generic leaf maths is lib/bascule.js.
//
// FRAME (bridges/palace.js, the source project's numbers): origin = the middle of the Admiralty-end abutment, +u along the bridge toward Vasilyevsky Island (bearing 323.5), +v to the NE (upstream);
// world = (cx + u cosT - v sinT, cz + u sinT + v cosT), T = (b - 90) deg. y = 0 is street level. The bank lines are at u 1.5 and 251.0; the deck is +0.05 there and +2.4 at the crown (u 127.25).
//
// THE TWO LEAVES. The real bridge: 5 spans, 254.5 m between the abutments; the middle (bascule) span is 9.20 + 58.60 + 9.20 m between the axes of the two massive bascule piers (u 85.3 .. 96.5 and 153.9 .. 165.1), its
// two leaves (~28 m each, the counterweights inside the piers) meet at the midspan and rise about 70 degrees about hinge lines on the inner pier faces: leaf A hinges at u = U0 = 96.5 and its free end (the tip) rests at
// the midspan UM; leaf B hinges at U1 = 153.9 and its tip rests at UM too. A point at the horizontal distance sh from a hinge (toward the middle) stands at the height YH + sh tan(phi), phi = theta + ALPHA0 (the closed leaf
// is the straight chord between the pier-face deck height and the midspan deck height: it rises 0.13 .. 0.17 m toward the tip, ALPHA0 0.26 .. 0.34 degrees). The two leaves rotate in OPPOSITE senses about their own hinge lines
// (A: the tip swings up and back toward u = U0, B: up and back toward u = U1), their free ends leave the midspan and a 38 m gap opens in the middle at 70 degrees.
import { profile } from '../bridges/deck.js';

export const PALACE = { id: 'palace', cx: -2339.5, cz: -875.0, b: 323.5 };
export const LEN = 254.5, HW = 13.85, ROAD = 11.0, KERB = 0.3, PAVE = 0.12, KERB_H = 0.45, BANK0 = 1.5, BANK1 = 251.0;
export const HV = HW + 0.3;                                               // the half width of the walkable deck rectangle (to the railing + 0.3)
/** the keys of the deck profile (bridges/palace.js uses the very same list): +0.05 at both bank lines, +2.4 at the crown */
export const DECK_KEYS = [[BANK0 - 1, 0.05], [26, 0.78], [72, 1.95], [LEN / 2, 2.4], [182.5, 1.95], [228.5, 0.78], [BANK1 + 1, 0.05]];
/** asphalt level of the CLOSED bridge at u (m above street level) */
export const yDeck = profile(DECK_KEYS);

const _T = (PALACE.b - 90) * Math.PI / 180;
export const FR = { cx: PALACE.cx, cz: PALACE.cz, T: _T, c: Math.cos(_T), s: Math.sin(_T) };
/** local (u, v) -> world { x, z } */
export const toWorld = (u, v, out = {}) => { out.x = FR.cx + u * FR.c - v * FR.s; out.z = FR.cz + u * FR.s + v * FR.c; return out; };
/** world (x, z) -> local { u, v } */
export const toUV = (x, z, out = {}) => { const dx = x - FR.cx, dz = z - FR.cz; out.u = dx * FR.c + dz * FR.s; out.v = -dx * FR.s + dz * FR.c; return out; };

// ------------------------------------------------------------------ the leaves
/** the inner faces of the two bascule piers (the hinge lines) and the midspan where the tips meet */
export const U0 = 96.5, U1 = 153.9, UM = (U0 + U1) / 2;
export const THETA_MAX = 70 * Math.PI / 180;                              // the full opening, 70 degrees above the closed position
/** the leaf descriptions (lib/bascule.js makeLeaf): A hinges at U0 and points toward +u, B hinges at U1 and points toward -u */
export const LEAF_SPECS = [
  { id: 'A', uHinge: U0, dir: 1, yHinge: yDeck(U0), uTip: UM, yTip: yDeck(UM), cwLen: 9.5 },
  { id: 'B', uHinge: U1, dir: -1, yHinge: yDeck(U1), uTip: UM, yTip: yDeck(UM), cwLen: 9.5 },
];

// ------------------------------------------------------------------ the gates (barrier lines), in u
/** the south barrier stands before the first bascule pier (u 85.3), the north one beyond the second (ends at 165.1): the NPC traffic and pedestrians stop short of them while the STOP flag is up */
export const GATE_S = 79.0, GATE_N = 171.5;
/** an NPC person still on a steep leaf is set down just outside the gate of its hinge side */
export const SET_DOWN = { A: GATE_S - 1.5, B: GATE_N + 1.5 };

/** the world AABB [x0, z0, x1, z1] of the service deck rectangle (u from the hinge A to the hinge B, |v| <= HV), grown by 1 m: a cheap reject before the frame transform */
export const BOUNDS = (() => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [u, v] of [[U0 - 1, -HV], [U1 + 1, -HV], [U1 + 1, HV], [U0 - 1, HV]]) { const w = toWorld(u, v); x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); z0 = Math.min(z0, w.z); z1 = Math.max(z1, w.z); } return [x0 - 1, z0 - 1, x1 + 1, z1 + 1]; })();

/** the OSM ways of the two carriageways (the lanes of these ways get the barrier stop lines); the bridges module owns and draws them (GROUPS.bridges 'palace') */
export const WAY_IDS = ['w362796524', 'w362796525'];
