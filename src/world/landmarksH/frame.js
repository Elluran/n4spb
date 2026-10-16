// landmarksH/frame.js - the Admiralty frame (docs/research/admiralty-stisaac.md section 3.2): origin T = the centre of the gate arch (-2387, -565), axis `a` along compass bearing 52.5 deg
// (ENE, towards Palace Square), axis `b` along bearing 322.5 deg (NW, from the garden into the building towards the Neva).
// A model built with X = a, Z = -b (front of the garden facade = +Z) and pushed with rotY = ROT at T lands in the world: x = TX + 0.7934 a - 0.6088 b, z = TZ - 0.6088 a - 0.7934 b.
export const TX = -2387, TZ = -565;
export const ROT = 37.5 * Math.PI / 180, CR = Math.cos(ROT), SR = Math.sin(ROT);
/** (a, b) -> [x, z] */
export const W = (a, b) => [TX + CR * a - SR * b, TZ - SR * a - CR * b];
/** (x, z) -> [a, b] */
export const AB = (x, z) => { const dx = x - TX, dz = z - TZ; return [CR * dx - SR * dz, -SR * dx - CR * dz]; };
/** rotY of a model whose front (+Z) looks along the frame direction (da, db) */
export const rotFacing = (da, db) => { const dx = CR * da - SR * db, dz = -SR * da - CR * db; return Math.atan2(dx, dz); };
/** model-frame (X = a, Z = -b) point -> world */
export const M2W = (X, Z) => W(X, -Z);
