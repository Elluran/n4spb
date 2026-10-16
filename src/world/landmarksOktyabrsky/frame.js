// landmarksOktyabrsky/frame.js - the model frames and the fixed dimensions of the module (docs/research/oktyabrsky.md sections 2, 4; oktyabrsky-square.md section 3).
//   HALL   frame of the Bolshoy Concert Hall "Oktyabrsky" (OSM w30324279 + part w929214560): origin A' = the SSW end of the glazed front (745.7, -338.5), local +x = u along the front (SSW -> NNE,
//          bearing 29.87 deg), local +z = v INTO the building (ESE), y up; the front faces local -z (WNW, toward Ligovsky pr.).  three.js rotation.y = +1.0495 rad.  The outline is a trapezoid
//          (front 67.5 m, rear 56.6 m, depth 83.5 m); it and the part polygon are taken from the baked OSM footprints so the walls close on the data exactly (fallbacks = the dossier numbers).
//          world(u, v) = A' + u * (0.4981, -0.8671) + v * (0.8671, 0.4981).
//   KAP    frame of the Kapodistrias monument (OSM n1372027612): origin = the node, rotY = -0.4712 (the figure and its plaque face SSW, bearing 207 deg), local +z = the front.
//   OCT    the "Oktyabr" group of A. T. Matveev (OSM n1732981183): the dossier puts it at hall (56, -9) at the foot of the NNE end of the stair; it faces the front (WNW = local -z of the hall frame).
import * as L from '../layout.js';

export const HALL = { x: 745.7, z: -338.5, rot: 1.0495 };
const C = Math.cos(HALL.rot), S = Math.sin(HALL.rot);
/** hall (u, v) -> world { x, z } */
export const W = (u, v) => ({ x: HALL.x + C * u + S * v, z: HALL.z - S * u + C * v });
/** world (x, z) -> hall { u, v } */
export const M = (x, z) => ({ u: C * (x - HALL.x) - S * (z - HALL.z), v: S * (x - HALL.x) + C * (z - HALL.z) });
/** world direction of the hall axes */
export const U_DIR = [C, -S], V_DIR = [S, C];

const FALL_OUT = [[0, 0], [67.5, 0], [61.8, 83.4], [5.2, 83.7]];
const FALL_CUBE = [[9.7, 15.8], [56.7, 16.4], [57.6, 78.1], [9.8, 78.0]];
const ring = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) { const q = M(flat[i], flat[i + 1]); r.push([Math.round(q.u * 100) / 100, Math.round(q.v * 100) / 100]); } return r; };
function fromData() {
  try {
    const b = L.buildingById('w30324279'), p = L.buildingById('w929214560');
    if (!b || !p || !b.polys || !p.polys) return null;
    const out = ring(b.polys[0].o), cube = ring(p.polys[0].o);
    if (out.length !== 4 || cube.length !== 4) return null;
    // the baked ring order is A' B' C' D' (SSW front corner first): keep it only when it matches the dossier frame
    const ok = (a, b2) => Math.hypot(a[0] - b2[0], a[1] - b2[1]) < 1.5;
    if (!out.every((q, i) => ok(q, FALL_OUT[i])) || !cube.every((q, i) => ok(q, FALL_CUBE[i]))) return null;
    return { out, cube };
  } catch (e) { return null; }
}
const D = fromData();
/** outline of the hall in (u, v): A' (SSW front), B' (NNE front), C' (NNE rear), D' (SSW rear) */
export const OUT = D ? D.out : FALL_OUT;
/** the cube (the auditorium and stage block = the OSM part): front-SSW, front-NNE, rear-NNE, rear-SSW */
export const CUBE = D ? D.cube : FALL_CUBE;

/** heights (y above the plaza) */
export const HT = {
  st: 1.2,            // stylobate / foyer floor (the stair top)
  gl: 10.8,           // soffit of the slab = top of the glass wall
  roof: 13.0,         // foyer roof (slab top)
  cube: 26.0,         // top of the windowless cube (OSM says 20, satellite parallax 21.6; the frontal photo 03 calibrated on the 13 m fascia and the 47.5 m cube width gives 26.1 above the plaza: modelled 26)
  apert: 17.2,        // the row of small louvred apertures on the cube front: in photo 03 it shows just above the fascia edge, which hides everything below ~17 m of the cube wall from the 48 m camera
  low: 6.0,           // the low wings behind the stair cage and the rear strip
};
/** geometry of the glazed front (u along the front, v = depth) */
export const FR = {
  glassV: 3.0,        // the glass plane (the slab overhangs it by 3.0 m)
  u0: 12.0, u1: 55.4, // glass wall between the two end blocks (20 bays x 2.17 m)
  bays: 20, bay: 2.17,
  doors: [19.7, 26.0, 32.2, 38.5, 44.7],
  stepV: 58,          // v where the flank walls step down from 13 m to the 6 m wings
};
/** the stair: 7 risers of 0.1714 m, treads 0.6 m, from v = -4.4 to the platform at v = -0.2 */
export const STAIR = { u0: -3.0, u1: 70.5, v0: -4.4, v1: -0.2, n: 7, platformV1: 3.0 };

/** THE FOYER (review 2026-10-07).  The user's L-pose 771,1.5,-355.9,-57.4,4.5 is a WALKING pose (eye 1.52 above feet y 0) inside the foyer volume (hall u 27.7, v 13.2): with a sealed hall the player is trapped in
 *  a hollow room 1.2 m below its own floor.  FOYER_OPEN = true makes the foyer ENTERABLE: the five door groups are open passages (the leaves are drawn closed, as automatic doors), behind the glass a landing at the
 *  stylobate level (y +1.2) and an interior flight of 7 risers lead DOWN to the foyer floor at plaza level (y 0.12: a deliberate simplification of the real level foyer, so that the user's pose stands on the parquet),
 *  and the foyer shell is solid (end walls, cube front wall, columns, the two stair flights to the gallery are decor).  false = the sealed hall of the builder (floor +1.2, closed doors).
 *  floor = y of the parquet, gallery = y of the mezzanine slab top, land / tread / n = the entry landing depth (v) and the interior flight. */
export const FOYER_OPEN = true;
export const IN = FOYER_OPEN ? { floor: 0.12, gallery: 5.3, land: 3.4, tread: 0.3, n: 7 } : { floor: HT.st, gallery: 6.2, land: 3.0, tread: 0, n: 0 };

/** a point of a flank line of the outline at depth v: side 'ssw' (A' -> D') or 'nne' (B' -> C') */
export function flankU(side, v) {
  const a = side === 'ssw' ? OUT[0] : OUT[1], b = side === 'ssw' ? OUT[3] : OUT[2];
  return a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]);
}
/** a point of a cube side at depth v */
export function cubeU(side, v) {
  const a = side === 'ssw' ? CUBE[0] : CUBE[1], b = side === 'ssw' ? CUBE[3] : CUBE[2];
  return a[0] + (b[0] - a[0]) * (v - a[1]) / (b[1] - a[1]);
}

/** frame helper: place a Parts / physics item at hall (u, v) */
export const HF = {
  /** thin solid wall box between two hall points a, b (each [u, v]) from y0 to y1 */
  wall(ph, a, b, y0, y1, t = 0.5) {
    const A = W(a[0], a[1]), B = W(b[0], b[1]), len = Math.hypot(B.x - A.x, B.z - A.z);
    if (len < 0.05) return;
    ph.addBox((A.x + B.x) / 2, (A.z + B.z) / 2, len, t, Math.atan2(-(B.z - A.z), B.x - A.x), y0, y1);
  },
  /** solid box centred at hall (u, v), size du x dv, y range */
  box(ph, u, v, du, dv, y0, y1) { const p = W(u, v); ph.addBox(p.x, p.z, du, dv, HALL.rot, y0, y1); },
  cyl(ph, u, v, r, y0, y1) { const p = W(u, v); ph.addCylinder(p.x, p.z, r, y0, y1); },
  /** walk box (floor / step) centred at hall (u, v) */
  walk(ph, u, v, du, dv, top, bottom) { const p = W(u, v); return ph.addWalkBox(p.x, p.z, du, dv, HALL.rot, top, bottom); },
};

// ------------------------------------------------------------------------------------------------ the monument
export const KAP = { x: 796.6, z: -460.6, rot: -0.4712 };
{
  const cs = Math.cos(KAP.rot), sn = Math.sin(KAP.rot);
  /** monument-local (a along +x = the figure's left, b along +z = the front) -> world */
  KAP.W = (a, b) => ({ x: KAP.x + a * cs + b * sn, z: KAP.z - a * sn + b * cs });
}
/** the October group: hall (56, -9) */
export const OCT = (() => { const p = W(56, -9); return { x: p.x, z: p.z, rot: HALL.rot + Math.PI, u: 56, v: -9 }; })();
