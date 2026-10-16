// landmarksCastle/frame.js - the frame of the Engineering (Mikhailovsky) Castle (docs/research/summer-garden.md 8.1).
//   Frame C: origin C0 = (-764, -885), the castle's own axes are turned 19 deg from the grid: a = (0.3256, 0.9455) toward the SOUTH (main portal side), b = (-0.9455, 0.3256) toward the WEST.
//   The model frame used by the drawing code: model +x = -b (east-ish), model +z = a (south, the portal side).  World = C0 + Ry(ROT) * (x, z) with three's rotation.y (ROT = +19 deg).
//   `AB(a, b)` / `toAB(x, z)` convert between the dossier's (a, b) and the world.
export const C0 = { x: -764, z: -885 }, ROT = 19 * Math.PI / 180;
const cs = Math.cos(ROT), sn = Math.sin(ROT);
export const A_DIR = [sn, cs], B_DIR = [-cs, sn];
/** model (x, z) -> world { x, z } */
export const W = (mx, mz) => ({ x: C0.x + mx * cs + mz * sn, z: C0.z - mx * sn + mz * cs });
/** world -> model { mx, mz } */
export const M = (x, z) => { const dx = x - C0.x, dz = z - C0.z; return { mx: dx * cs - dz * sn, mz: dx * sn + dz * cs }; };
/** dossier (a, b) -> world [x, z] */
export const AB = (a, b) => [C0.x + a * A_DIR[0] + b * B_DIR[0], C0.z + a * A_DIR[1] + b * B_DIR[1]];
/** world -> dossier (a, b) */
export const toAB = (x, z) => { const dx = x - C0.x, dz = z - C0.z; return [dx * A_DIR[0] + dz * A_DIR[1], dx * B_DIR[0] + dz * B_DIR[1]]; };
/** rotY of a model whose +z points along the castle's a axis (south side) */
export const ROT_C = ROT;
export const PORTAL_C = AB(56.4, -6.6);          // (-739.4, -833.8)
export const MONUMENT = { x: -712.0, z: -757.0 };
