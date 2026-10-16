// environment/farconf.js - constants shared by the ground shader (ground.js) and the far scenery (far.js): the continuation of the street grid beyond the data
// extent, and the reduced fog used for everything beyond ~700 m so that the far roofline of Saint Petersburg stays readable.
import * as L from '../layout.js';

/** Fog that is weaker for distant things: effective distance = min(d, D0) + K * max(d - D0, 0). Near objects keep the scene fog (FogExp2, density from
 *  core/timeofday.js), beyond D0 the air is "clear": 1 km ~ 32 %, 3 km ~ 47 %, 5 km ~ 58 %. */
export const FAR_FOG = { D0: 700, K: 0.07 };

const G = (L.GRID_DEG * Math.PI) / 180;
/** the street grid of the centre extended outward in the frame of Nevsky Prospekt: streets at u = U0 + PU * k and v = V0 + PV * k (u along Nevsky toward the ESE,
 *  v toward the NNE, origin = Vosstaniya Square). The real blocks are 120-190 m long along Nevsky and 110-150 m across. */
export const FAR_GRID = {
  cx: L.SQUARE.x, cz: L.SQUARE.z, pu: 150, pv: 128, u0: 40, v0: 30, roadW: 15,
  ux: Math.sin(G), uz: -Math.cos(G),           // unit vector of +u in world (x, z)
  vx: -Math.cos(G), vz: -Math.sin(G),          // unit vector of +v
};
/** world -> grid coordinates and back (same maths as layout.toGrid / fromGrid) */
export const toGrid = (x, z) => L.toGrid(x, z);
export const fromGrid = (u, v) => L.fromGrid(u, v);
