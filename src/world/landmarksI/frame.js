// landmarksI/frame.js - the local frame of the Palace Square ensemble (docs/research/palace-square-hermitage.md section 2).
// Origin = the Alexander Column (-1983, -738).  u runs along the axis Neva -> Winter Palace -> column -> General Staff arch (bearing 144 deg, toward the SE: +u = into the square),
// v runs along the palace fronts (toward the SW = Admiralty: +v).  The OSM footprints of the Winter Palace and the Hermitage are axis aligned in this frame.
//   x = COL.x + u * C - v * S ;  z = COL.z + u * S + v * C
export const COL = { x: -1983, z: -738 };
export const C = Math.cos(54 * Math.PI / 180), S = Math.sin(54 * Math.PI / 180);
/** (u, v) -> world [x, z] */
export const toWorld = (u, v) => [COL.x + u * C - v * S, COL.z + u * S + v * C];
/** world (x, z) -> { u, v } */
export const toUV = (x, z) => ({ u: (x - COL.x) * C + (z - COL.z) * S, v: -(x - COL.x) * S + (z - COL.z) * C });
/** rotY (three.js) of a model built along +x with +z out, whose +z points along +u (toward the SE, into the square) */
export const ROT_U = 36 * Math.PI / 180;
/** world position of a point in an edge frame (kit.frameOf(e)): local x along the wall, z out of it */
export const edgePoint = (f, lx, lz) => [f.x + lx * f.xa[0] + lz * Math.sin(f.rot), f.z + lx * f.xa[1] + lz * Math.cos(f.rot)];
