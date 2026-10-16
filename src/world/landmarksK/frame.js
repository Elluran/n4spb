// landmarksK/frame.js - the two frames of the module (docs/research/saviour-mikhailovsky.md 2.1 and 9.1).
//   Church frame C: origin C0 = the centre of the central cube = the tent axis, model +x = `a` toward the altar (east-south-east, bearing 101.5 deg), model +z = `b` toward the south porch.  The canal (bell tower) is on the west (-a).
//   Palace frame P: origin P0 = the centre of the main gate in the street fence of the Mikhailovsky Palace, +x = u (bearing 103.1 deg), +z = v (toward Arts Square / south); the palace is at v < 0.
// World = origin + Ry(rot) * (x, z) with three's rotation.y (model +x -> world (cos, -sin rot)): rot = -0.2007 (C) / -0.2286 (P).
export const C0 = { x: -1255.3, z: -851.5 }, ROT_C = -0.2007;
export const P0 = { x: -1080.5, z: -617.4 }, ROT_P = -0.2286;
const mk = (O, rot) => {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return {
    O, rot,
    /** model (x, z) -> world { x, z } */
    W: (mx, mz) => ({ x: O.x + mx * cs + mz * sn, z: O.z - mx * sn + mz * cs }),
    /** world (x, z) -> model { mx, mz } */
    M: (x, z) => { const dx = x - O.x, dz = z - O.z; return { mx: dx * cs - dz * sn, mz: dx * sn + dz * cs }; },
    box: (ph, mx, mz, w, d, r, y0, y1) => { const p = { x: O.x + mx * cs + mz * sn, z: O.z - mx * sn + mz * cs }; return ph.addBox(p.x, p.z, w, d, r + rot, y0, y1); },
    cyl: (ph, mx, mz, rad, y0, y1) => { const p = { x: O.x + mx * cs + mz * sn, z: O.z - mx * sn + mz * cs }; return ph.addCylinder(p.x, p.z, rad, y0, y1); },
    walk: (ph, mx, mz, w, d, r, top, bottom) => { const p = { x: O.x + mx * cs + mz * sn, z: O.z - mx * sn + mz * cs }; return ph.addWalkBox(p.x, p.z, w, d, r + rot, top, bottom); },
  };
};
export const CF = mk(C0, ROT_C), PF = mk(P0, ROT_P);
