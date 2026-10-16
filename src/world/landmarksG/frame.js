// landmarksG/frame.js - the palace-axis frame of Palace Square (docs/research/palace-square-hermitage.md section 2).
// (u, v) relative to the Alexander Column: +u = towards the General Staff arch (SE, bearing 144 deg), -u = towards the Neva / Winter Palace front; +v = towards the Admiralty (SW), -v = towards the Hermitage / Guards HQ (NE).
// A model pushed with rotY = ROT has its local +x along -v (NE), +z along +u (SE, into the arch); rotY = ROT + PI turns +z to face the Winter Palace.
export const CX = -1983, CZ = -738;
export const ANG = 54 * Math.PI / 180, C = Math.cos(ANG), S = Math.sin(ANG);
export const ROT = 0.6283185307179586;                       // 36 deg
/** (u, v) -> [x, z] */
export const toWorld = (u, v) => [CX + u * C - v * S, CZ + u * S + v * C];
/** (x, z) -> { u, v } */
export const toUV = (x, z) => ({ u: (x - CX) * C + (z - CZ) * S, v: -(x - CX) * S + (z - CZ) * C });
/** unit world direction of +u / +v */
export const DIR_U = [C, S], DIR_V = [-S, C];
/** rotY of a model whose +z faces the world direction of (du, dv) in the uv frame */
export const rotFacing = (du, dv) => Math.atan2(du * C - dv * S, du * S + dv * C);
/** the circle of the General Staff arc (uv): centre and radius fitted to the OSM vertices (all within 1 m) */
export const ARC = { u: 45, v: 0, R: 87 };
/** the triumphal arch: front plane u = ARCH.u0, axis v = ARCH.v0 */
export const ARCH = { u0: 131.0, v0: -1.3, depth1: 10, gapEnd: 162, u1: 162, u2: 187, half: 13.6, span: 17.0, spring: 10.8, crown: 19.3, top: 28.0 };
export const lerp = (a, b, t) => a + (b - a) * t;
