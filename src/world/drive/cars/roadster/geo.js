// cars/roadster/geo.js - the measured outlines of the drivable Tesla Roadster (2026) and the geometry helpers of its model (read by roadster.js, and later by interior.js).
// Car frame (like every vehicle of the project): forward +Z, origin on the ground midway between the axles, +X = the car's LEFT (the driver sits at +X).
// The real car is a flat-faceted wedge (SR-71 / F-35 / Lotus Esprit): convex hulls of a few corner points (flat faces, hard cel-shaded facets) and one side profile extruded straight.
// The numbers come from the official press renders (docs of the spec: the measured side sheet ref_side.png, +-3 %): the side sheet is in nose-relative millimetres, z = 2.36 - x_nose.
import { hullGeo, sym, extrudeZY } from '../cybertruck/geo.js';
export { hullGeo, sym, extrudeZY };

// ---- per-axle wheel constants (tyres 295/30R20 front = 0.685 m, 335/30R21 rear = 0.734 m)
export const RF = 0.3425, RR = 0.367, TWF = 0.295, TWR = 0.33, TRACK_F = 1.58, TRACK_R = 1.64, AXLE = 1.48;
export const ARCH = { front: { R: RF, Ra: 0.41, yb: 0.15, z: AXLE }, rear: { R: RR, Ra: 0.44, yb: 0.15, z: -AXLE } };
export const HW = 0.97;                 // half width of the body prism (the 3 cm flare rings add the last 3 cm at the haunches)

// ---- centre-line profiles as [z, y] (nose -> tail)
export const HOOD = [[2.36, 0.49], [2.26, 0.55], [2.16, 0.60], [2.06, 0.65], [1.96, 0.70], [1.86, 0.74], [1.76, 0.77], [1.66, 0.80], [1.56, 0.817], [1.41, 0.83]];
export const SCREEN = [[1.41, 0.83], [0.36, 1.184]];                       // the windscreen (18.7 deg rake)
export const ROOF = [[0.36, 1.184], [0.26, 1.203], [0.16, 1.212], [0.06, 1.217], [-0.04, 1.219], [-0.14, 1.219], [-0.24, 1.217], [-0.44, 1.208], [-0.64, 1.193], [-0.84, 1.175], [-1.04, 1.149], [-1.24, 1.118], [-1.34, 1.102], [-1.44, 1.062]];
export const DECK = [[-1.54, 1.031], [-1.74, 1.026], [-1.94, 0.986], [-2.14, 0.946], [-2.24, 0.932]];
export const BELT = [[1.41, 0.82], [1.2, 0.79], [0.9, 0.76], [-1.1, 0.99]];  // the belt line: low at the door front, rising to the rear glass tip
/** the plan of the roof glass arrowhead as [z, half width] */
export const GLASS_HW = [[1.41, 0.50], [0.36, 0.76], [-0.5, 0.78], [-1.0, 0.68], [-1.44, 0.52], [-1.8, 0.40]];
/** carbon / white split on the sides: black below y(z) */
export const SPLIT = [[2.4, 0.30], [2.0, 0.30], [1.0, 0.30], [0, 0.33], [-0.8, 0.40], [-1.3, 0.46], [-1.6, 0.60]];

/** piecewise-linear lookup of a [z, y] table (any order of z); clamps at the ends */
export function lerpTable(tab, z) {
  const asc = tab[0][0] < tab[tab.length - 1][0], t = asc ? tab : tab.slice().reverse();
  if (z <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (z <= t[i][0]) { const a = t[i - 1], b = t[i], k = (z - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; }
  return t[t.length - 1][1];
}
export const hoodY = (z) => lerpTable(HOOD, z);
export const beltY = (z) => lerpTable(BELT, z);
export const glassHW = (z) => lerpTable(GLASS_HW, z);
export const splitY = (z) => lerpTable(SPLIT, z);
/** the roof line (windscreen + roof) and the deck line */
export function roofY(z) { return z > 0.36 ? lerpTable(SCREEN, z) : lerpTable(ROOF, z); }
export const deckY = (z) => lerpTable(DECK, z);
/** the lean plane of the side glass: x at height y (35 deg of lean from the belt to the roof rail, measured 28 deg) */
export const sideX = (y) => 0.95 - 0.5 * (y - 0.76);

/** the round wheel arch as [z, y] points from the rear foot over the top to the front foot (increasing z), `grow` m larger than the opening, feet on y = yb */
export function archLine(a, n = 12, grow = 0) {
  const Ra = a.Ra + grow, sa = Math.max(-1, Math.min(1, (a.yb - a.R) / Ra)), al = Math.asin(sa), out = [];
  for (let i = 0; i <= n; i++) { const t = (Math.PI - al) + (2 * al - Math.PI) * i / n; out.push([a.z + Ra * Math.cos(t), a.R + Ra * Math.sin(t)]); }
  return out;
}
/** the flare ring around an arch (an annulus sector, polygon in z, y): inner = the opening, outer = `w` m wider */
export function flareRing(a, w, n = 12) {
  const inner = archLine(a, n, 0), outer = archLine(a, n, w).reverse();
  return inner.concat(outer);
}
