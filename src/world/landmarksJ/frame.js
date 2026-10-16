// landmarksJ/frame.js - the cathedral frame of St Isaac's Cathedral.  Model coordinates (mx, mz): origin = the axis of the dome C0, +mx = the cathedral's EAST face (towards the Admiralty / Nevsky,
// bearing 53.5 deg), -mz = its NORTH face (the Alexander Garden / the Neva, bearing 323.5 deg), +mz = the SOUTH face (Isaac's Square, the Nicholas I monument).  World = C0 + Ry(ROT) * (mx, mz), ROT = +36.5 deg.
// docs/research/admiralty-stisaac.md section 7.1 (OSM parts r3229838..: dome axis (-2523.6, -185.4), grid bearing 53.5 deg).
export const C0 = { x: -2523.6, z: -185.4 };
export const ROT = 36.5 * Math.PI / 180;
const cs = Math.cos(ROT), sn = Math.sin(ROT);
/** model (mx, mz) -> world {x, z} */
export const W = (mx, mz) => ({ x: C0.x + mx * cs + mz * sn, z: C0.z - mx * sn + mz * cs });
/** world (x, z) -> model {mx, mz} */
export const Mdl = (x, z) => { const dx = x - C0.x, dz = z - C0.z; return { mx: dx * cs - dz * sn, mz: dx * sn + dz * cs }; };
export const worldRot = (r) => r + ROT;
/** physics helpers in the model frame */
export function boxAt(ph, mx, mz, w, d, r, y0, y1) { const p = W(mx, mz); return ph.addBox(p.x, p.z, w, d, r + ROT, y0, y1); }
export function cylAt(ph, mx, mz, rad, y0, y1) { const p = W(mx, mz); return ph.addCylinder(p.x, p.z, rad, y0, y1); }
export function walkAt(ph, mx, mz, w, d, r, top, bottom) { const p = W(mx, mz); return ph.addWalkBox(p.x, p.z, w, d, r + ROT, top, bottom); }
