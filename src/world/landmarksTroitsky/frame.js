// landmarksTroitsky/frame.js - PURE numbers and functions (no three.js, no imports) of the Troitsky Bridge: the frame, the cross-section, the deck profile of the closed bridge, the single BASCULE
// LEAF (its hinge, its rest tilt, the height / slope of its surface as a function of the opening angle theta), the carry of a body that stands on it and the slip rule. The module, the
// physics colliders, the traffic / people hooks and tools/troitsky-test.mjs all read this ONE set of formulas.
//
// FRAME (from the source project, bridges/troitsky.js): origin = the deck centre on the Mars Field bank line = the midline of the OSM carriageways w142545019 / w142545020 (x -1222.74, z -1564.93);
// +u along the bridge toward the Petrograd side (bearing 336.99), +v to the ENE (right of travel); world = (cx + u cosT - v sinT, cz + u sinT + v cosT), T = (b - 90) deg. y = 0 is street level
// (3.4 m above the Neva), the deck is +0.05 at both bank lines and +4.7 at the crown.
//
// THE LEAF.  The real Troitsky Bridge has ONE bascule leaf (a single-leaf Strauss-type span, 43.2 m, the second span from the Mars Field bank: docs/research/petro-bridges.md of the source project; the first
// brief of this feature said "two leaves in the middle of the river": the research says otherwise, the model follows the research). Its HINGE line (the axis of rotation, along v) is on the narrow first pier at
// u = 15.2 (the counterweight on the bank side of it swings down into a pit under the first span), its free end (the tip) rests on the 12.1 m granite pier at u = 58.2. Opening swings the tip UP and toward the
// hinge: a point at the distance s along the leaf from the hinge stands at (u, y) = (UH + s cos(phi), YH + s sin(phi)), phi = theta + ALPHA0 (the closed leaf is the straight line between the two piers' deck
// heights: it rises 1.05 m toward the tip, ALPHA0 = 1.4 degrees). Everything below is exact for that rigid line.
export const TROITSKY = { id: 'troitsky', cx: -1222.74, cz: -1564.93, b: 336.99 };
export const LEN = 554.0, HW = 11.8, ROAD = 9.5, KERB = 0.35, PAVE = 0.2, HV = HW + 0.55;
export const STEEL0 = 15.2, STEEL1 = 474.5;
// the cross-section: pavements |v| in [ROAD + KERB, HW + 0.1] (granite, +PAVE), the barrier kerb |v| in [ROAD, ROAD + KERB] (0.5 m), the roadway |v| < ROAD (asphalt, 4 lanes + the tram median)

const _T = (TROITSKY.b - 90) * Math.PI / 180;
export const FR = { cx: TROITSKY.cx, cz: TROITSKY.cz, T: _T, c: Math.cos(_T), s: Math.sin(_T) };
/** local (u, v) -> world { x, z } */
export const toWorld = (u, v, out = {}) => { out.x = FR.cx + u * FR.c - v * FR.s; out.z = FR.cz + u * FR.s + v * FR.c; return out; };
/** world (x, z) -> local { u, v } */
export const toUV = (x, z, out = {}) => { const dx = x - FR.cx, dz = z - FR.cz; out.u = dx * FR.c + dz * FR.s; out.v = -dx * FR.s + dz * FR.c; return out; };

// ------------------------------------------------------------------ the deck profile of the closed bridge (monotone cubic through KEYS, the source's numbers)
const KEYS = [[0, 0.05], [15.2, 0.45], [58.2, 1.5], [129.6, 3.1], [218, 4.35], [272, 4.7], [326, 4.35], [415, 3.0], [479, 1.75], [536, 0.42], [LEN, 0.05]];
const _kx = KEYS.map((k) => k[0]), _ky = KEYS.map((k) => k[1]), _kd = [], _km = [];
for (let i = 0; i + 1 < KEYS.length; i++) _kd.push((_ky[i + 1] - _ky[i]) / (_kx[i + 1] - _kx[i]));
for (let i = 0; i < KEYS.length; i++) _km.push(i === 0 ? _kd[0] : i === KEYS.length - 1 ? _kd[i - 1] : _kd[i - 1] * _kd[i] <= 0 ? 0 : 2 / (1 / _kd[i - 1] + 1 / _kd[i]));
/** asphalt level of the CLOSED bridge at u (m above street level) */
export const yDeck = (u) => {
  if (u <= _kx[0]) return _ky[0];
  const n = _kx.length; if (u >= _kx[n - 1]) return _ky[n - 1];
  let i = 0; while (u > _kx[i + 1]) i++;
  const h = _kx[i + 1] - _kx[i], t = (u - _kx[i]) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * _ky[i] + (t3 - 2 * t2 + t) * h * _km[i] + (-2 * t3 + 3 * t2) * _ky[i + 1] + (t3 - t2) * h * _km[i + 1];
};
export const slopeOf = (u) => (yDeck(u + 0.5) - yDeck(u - 0.5)) / 1.0;

// ------------------------------------------------------------------ the leaf
export const U_HINGE = 15.2, U_TIP = 58.2;                       // the narrow first pier (the hinge) / the 12.1 m pier face the free end rests on
export const Y_HINGE = yDeck(U_HINGE), Y_TIP = yDeck(U_TIP);
export const LEAF_RUN = U_TIP - U_HINGE;                         // 43.0 m, the horizontal run of the closed leaf
export const ALPHA0 = Math.atan2(Y_TIP - Y_HINGE, LEAF_RUN);     // the rest tilt of the closed leaf (rising toward the tip), 1.4 degrees
export const LEAF_S = Math.hypot(LEAF_RUN, Y_TIP - Y_HINGE);     // the length of the leaf along its surface
export const THETA_MAX = 70 * Math.PI / 180;                     // the full opening, 70 degrees above the closed position
const G = 9.81;

/** the leaf's elevation angle above the horizontal (seen from the hinge toward the tip) at opening angle theta */
export const phiOf = (theta) => theta + ALPHA0;
/** the u range [u0, u1] covered by the leaf at theta (u0 = the hinge, u1 = the tip's projection) */
export const leafFoot = (theta, out = {}) => { out.u0 = U_HINGE; out.u1 = U_HINGE + LEAF_S * Math.cos(phiOf(theta)); return out; };
/** the surface height of the leaf at u for opening angle theta, or NaN where the leaf does not reach (the gap beyond the tip's projection, or south of the hinge) */
export const leafY = (u, theta) => {
  const phi = phiOf(theta), u1 = U_HINGE + LEAF_S * Math.cos(phi);
  if (u < U_HINGE - 1e-9 || u > u1 + 1e-9) return NaN;
  return Y_HINGE + (u - U_HINGE) * Math.tan(phi);
};
/** the slope of the leaf surface in radians (|phi|) */
export const leafSlope = (theta) => Math.abs(phiOf(theta));
/** horizontal displacement along +u of the material point of the leaf that stands at u0 when the opening angle goes from th0 to th1 (the carry of a body at rest on it: negative = toward the hinge) */
export const carryDu = (u0, th0, th1) => {
  const p0 = phiOf(th0), p1 = phiOf(th1), s = (u0 - U_HINGE) / Math.cos(p0);
  return (U_HINGE + s * Math.cos(p1)) - u0;
};
/** the vertical speed (m/s) handed to a body CARRIED by the leaf at u while dTheta/dt = w: the material point at s from the hinge climbs at s cos(phi) w = (u - UH) w */
export const leafVy = (u, w) => (u - U_HINGE) * w;
/** the vertical rate (m/s) of the surface under a point that stays at the same (x, z): (u - UH) w / cos^2(phi) */
export const leafVyFixed = (u, theta, w) => { const c = Math.cos(phiOf(theta)); return (u - U_HINGE) * w / (c * c); };

// ------------------------------------------------------------------ the footing rule (documented in docs/AREAS.md 13.8)
/** a walker keeps its footing up to this slope of the leaf (degrees), a car up to the second one; beyond them they SLIP down the leaf toward the hinge (the lowest point of the leaf) */
export const WALK_SLIP_DEG = 35, CAR_SLIP_DEG = 25;
/** the speed cap of the slide (m/s along the slope): a walker, a car */
export const WALK_SLIDE_MAX = 7, CAR_SLIDE_MAX = 16;
/** the along-slope acceleration (m/s^2) of a body on a slope of phi radians whose footing limit is limDeg: g (sin phi - tan(lim) cos phi), 0 inside the limit (continuous at it) */
export const slideAccel = (limDeg, phi) => {
  const lim = limDeg * Math.PI / 180;
  if (phi <= lim) return 0;
  return Math.max(0, G * (Math.sin(phi) - Math.tan(lim) * Math.cos(phi)));
};
/** does a body with footing limit limDeg slip on the leaf at opening angle theta? */
export const slips = (limDeg, theta) => leafSlope(theta) > limDeg * Math.PI / 180 + 1e-9;

// ------------------------------------------------------------------ the gates (barrier lines), in u
/** the south barrier stands on the first span before the hinge pier, the north one beyond the landing pier (12.1 m, u 58.2 .. 70.3): the NPC traffic and pedestrians stop short of them while the STOP flag is up */
export const GATE_S = 6.0, GATE_N = 76.0;
