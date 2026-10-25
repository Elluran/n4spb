// landmarksMars/frame.js - the frames of the module (docs/research/mars-field.md section 2).
//   Field frame F: origin C = the memorial centre (-1086.2, -1242.5), model +x = v (toward ENE, world (0.9336, -0.3584)), model +z = u (toward the SSE, world (0.3584, 0.9336)); the Field's long axis
//   runs along bearing 159 / 339 deg.  rotation.y = +0.3665 rad: world = O + Ry(rot) * (x, z) with three's convention (model +x -> world (cos, -sin rot), model +z -> (sin, cos)).
//   North = -z (-u), west = -x (-v).  The Suvorov monument is at (u, v) = (-282, -10), the Moika bend at u = +170 .. +330.
export const C0 = { x: -1086.2, z: -1242.5 }, ROT_F = 0.3665;
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
export const FF = mk(C0, ROT_F);
/** field-frame (u along the axis to the SSE, v to the ENE) -> world */
export const fromUV = (u, v) => FF.W(v, u);
/** world -> field-frame { u, v } */
export const toUV = (x, z) => { const m = FF.M(x, z); return { u: m.mz, v: m.mx }; };
export { mk };
