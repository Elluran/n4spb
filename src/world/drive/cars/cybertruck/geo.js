// cars/cybertruck/geo.js - geometry helpers and the exact cab planes of the drivable taxi Cybertruck (read by cybertruck.js and interior.js).
// Car frame (like every vehicle of the project): forward +Z, origin on the ground midway between the axles, +X = the car's LEFT.
// The real truck is built from FLAT PLANES, so the model is too: convex hulls of a few corner points (flat faces, hard cel-shaded facets) and side profiles extruded straight.
// Dimensions come from the Commons photos in docs/research/cybertruck-2026.md (side view 'Foundation Series IMG 0629': 5.68 m long, wheelbase 3.8 m, roof peak 1.80 m).
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

/** convex hull of points [[x, y, z], ...] (flat faces, outward normals) */
export function hullGeo(pts) { return new ConvexGeometry(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]))); }

/** mirror every point with x > 0 to -x (points on x = 0 stay single) */
export function sym(pts) {
  const out = [];
  for (const p of pts) { out.push(p); if (p[0] > 1e-6) out.push([-p[0], p[1], p[2]]); }
  return out;
}

/** a polygon given in (z, y) extruded along X from x0 to x0 + depth (flat, no bevel) */
export function extrudeZY(pts, x0, depth) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));     // shape x -> world z, extrusion -> -x
  g.translate(x0 + depth, 0, 0);
  return g;
}

// ---- the cab: four planes meet in the roof peak. Corner points as [z, y, half width]:
//   A cowl (windscreen base)   B roof peak (windscreen top)   C rear roof corner   D rear belt corner
export const CAB = { A: [1.95, 1.21, 1.0], B: [0.32, 1.80, 0.806], C: [-0.95, 1.66, 0.870], D: [-0.95, 1.30, 1.0] };
const P = -0.36, Q = 0.031 * P;
/** half width of the (planar, leaning) cab side at height y and position z */
export const sideHW = (y, z) => 1.0 + P * (y - 1.21) + Q * (z - 1.95);
/** roof plane height / half width at z; windscreen plane height at z */
export const roofY = (z) => 1.80 + (z - 0.32) * 0.1102;
export const roofHW = (z) => 0.806 + (0.32 - z) * 0.0504;
export const glassY = (z) => 1.21 + (1.95 - z) * 0.3619;
export const glassHW = (z) => 1.0 - (1.95 - z) * 0.1190;
/** the belt line (top of the doors) */
export const beltY = (z) => 1.21 + (1.95 - z) * 0.031;
/** the wedge side mirror of the LEFT side (x > 0); the right one is x -> -x. A black triangular fin standing off the A-pillar base. */
export const MIRROR = [[1.02, 1.28, 1.34], [1.02, 1.28, 1.08], [1.02, 1.46, 1.28], [1.27, 1.40, 1.22], [1.27, 1.40, 1.12]];
