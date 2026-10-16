// landmarksE/frame.js - the (u, v) frame of the Ostrovsky ensemble (docs/research/gostiny-dvor-ostrovsky.md section 0).
// u = metres measured WEST along Nevsky from the middle of the Anichkov Bridge (-441, -93); v = metres SOUTH of the street axis.  The whole zone is rectilinear in (u, v).
// A Parts frame pushed with rotY = ROT at toWorld(u0, v0) has local +x = +u (west, to the RIGHT of a person on Nevsky who looks south), local +z = -v (NORTH, towards Nevsky, i.e. the way the
// facades of Gostiny Dvor / the garden / the theatre front look), so a facade drawn in the usual "z out of the wall" frame needs nothing else.  ROT + PI turns the model to face south (+v).
export const C = 0.9713, S = 0.2379;                                  // cos / sin of the 13.77 deg rotation of the grid
export const ROT = 166.23 * Math.PI / 180;                            // rotY of a model facing north (-v)
export const OX = -441, OZ = -93;
/** (u, v) -> [x, z] */
export const toWorld = (u, v) => [OX - C * u - S * v, OZ - S * u + C * v];
/** (x, z) -> { u, v } */
export const toUV = (x, z) => ({ u: -C * (x - OX) - S * (z - OZ), v: -S * (x - OX) + C * (z - OZ) });
/** world direction of +u (west along the street) and of +v (south) */
export const DIR_U = [-C, -S], DIR_V = [-S, C];
/** physics boxes: addBox(cx, cz, w, d, rotY, y0, y1) uses the same rotY as the Parts frame: ROT puts the width w along u (and d along v) */
/** run fn with the Parts frame at (u0, v0): local x = +u, local z = -v (north).  `face` = PI turns it to look south */
export function atUV(P, u0, v0, fn, face = 0) {
  const [x, z] = toWorld(u0, v0);
  P.push(x, 0, z, ROT + face);
  try { return fn(); } finally { P.pop(); }
}
/** rotY of a model whose +z faces the world direction of (du, dv) in the uv frame */
export const rotFacing = (du, dv) => Math.atan2(-C * du - S * dv, -S * du + C * dv);
export const lerp = (a, b, t) => a + (b - a) * t;
/** polygon helpers on flat [x,z,...] arrays */
export const ringOf = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); if (r.length > 1 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.05) r.pop(); return r; };
export const inRing = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
