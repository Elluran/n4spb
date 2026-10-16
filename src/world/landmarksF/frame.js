// landmarksF/frame.js - the cathedral frame.  Model coordinates (mx, mz): origin = the centre C of the colonnade arcs, +mx = the cathedral's EAST (u axis of the dossier), +mz = the cathedral's
// SOUTH side (the back of the church, mz = -v), so the front (Nevsky, the garden) is at -mz.  World = C0 + Ry(ROT) * (mx, mz), ROT = -16.8 deg (the cathedral is turned 16.8 deg clockwise from the grid).
// docs/research/kazan-cathedral.md section 2.1 (fit of the OSM arcs; critic re-derived it: axis 16.8 deg, C = (-1472.4, -269.7)).
export const C0 = { x: -1472.4, z: -269.7 };
export const ROT = -16.8 * Math.PI / 180;
const cs = Math.cos(ROT), sn = Math.sin(ROT);
/** model (mx, mz) -> world {x, z} */
export const W = (mx, mz) => ({ x: C0.x + mx * cs + mz * sn, z: C0.z - mx * sn + mz * cs });
/** world (x, z) -> model {mx, mz} */
export const Mdl = (x, z) => { const dx = x - C0.x, dz = z - C0.z; return { mx: dx * cs - dz * sn, mz: dx * sn + dz * cs }; };
/** rotY of the world for an object whose model-frame rotY is r */
export const worldRot = (r) => r + ROT;
/** physics helpers in the model frame: a box of model size (w along mx, d along mz) centred at (mx, mz) with the model rotation r */
export function boxAt(ph, mx, mz, w, d, r, y0, y1) { const p = W(mx, mz); return ph.addBox(p.x, p.z, w, d, r + ROT, y0, y1); }
export function cylAt(ph, mx, mz, rad, y0, y1) { const p = W(mx, mz); return ph.addCylinder(p.x, p.z, rad, y0, y1); }
export function walkAt(ph, mx, mz, w, d, r, top, bottom) { const p = W(mx, mz); return ph.addWalkBox(p.x, p.z, w, d, r + ROT, top, bottom); }
