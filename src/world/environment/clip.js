// environment/clip.js - convex polygon clipping shared by the ground (holes), the water meshes and the Neva scenery: cutting convex pieces out of a grid cell with bit-identical
// seams, and a bucket index so that a few hundred cut triangles cost O(cells touched) instead of O(cells x cuts).
import * as THREE from 'three';

/** keep the part of the convex polygon `poly` ([[x,z]..]) on the left (inside = true) or the right of the directed line a -> b. The cut points are computed from the
 *  endpoints in a canonical order so that two cells sharing an edge get bit-identical vertices. */
export function clipHalf(poly, a, b, inside) {
  const ex = b[0] - a[0], ez = b[1] - a[1], out = [], n = poly.length;
  const side = (p) => { const v = ex * (p[1] - a[1]) - ez * (p[0] - a[0]); return inside ? v : -v; };    // > 0 = kept side
  for (let i = 0; i < n; i++) {
    const p = poly[i], q = poly[(i + 1) % n], sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) {
      const lo = p[0] < q[0] || (p[0] === q[0] && p[1] < q[1]) ? [p, q] : [q, p], s0 = side(lo[0]), s1 = side(lo[1]), t = s0 / (s0 - s1);
      out.push([lo[0][0] + (lo[1][0] - lo[0][0]) * t, lo[0][1] + (lo[1][1] - lo[0][1]) * t]);
    }
  }
  return out;
}
/** pieces of `pieces` that lie outside the convex `cut` (given with the inside on the left of every edge, i.e. positive area in the (x, z) plane used here) */
export function subtractConvex(pieces, cut) {
  const out = [];
  for (const piece of pieces) {
    let rest = piece;
    for (let e = 0; e < cut.length && rest.length >= 3; e++) {
      const a = cut[e], b = cut[(e + 1) % cut.length];
      const o = clipHalf(rest, a, b, false); if (o.length >= 3) out.push(o);
      rest = clipHalf(rest, a, b, true);
    }
  }
  return out;
}
export const area2 = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i][0] * q[1] - q[0] * p[i][1]; } return s; };
/** a convex polygon with positive area2 (the orientation the half-plane test needs) */
export const ccw = (p) => (area2(p) < 0 ? p.slice().reverse() : p);
export const boxOfPoly = (poly) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } return [x0, x1, z0, z1]; };

/** triangles (as [[x,z],[x,z],[x,z]], positive area2) of a flat ring [x,z,...] (earcut through THREE.ShapeUtils), optionally with holes (flat rings); slivers dropped */
export function triangulateRing(o, holes = []) {
  const vec = (r) => { const a = []; for (let i = 0; i < r.length; i += 2) a.push(new THREE.Vector2(r[i], r[i + 1])); return a; };
  const c2 = vec(o), hs = holes.map(vec), all = [...c2, ...hs.flat()];
  const out = [];
  for (const t of THREE.ShapeUtils.triangulateShape(c2, hs)) { const p = t.map((k) => [all[k].x, all[k].y]); if (Math.abs(area2(p)) > 1e-4) out.push(ccw(p)); }
  return out;
}

/** index of the first axis value > v (binary search): the cell index along an axis array of cell borders is bs(axis, v) - 1 */
function bs(axis, v) { let lo = 0, hi = axis.length; while (lo < hi) { const m = (lo + hi) >> 1; if (axis[m] <= v) lo = m + 1; else hi = m; } return lo; }
/** bucket the cuts ({ box: [x0, x1, z0, z1], ... }) by the grid cells (axes xs, zs of cell borders) they overlap: Map(j * nx + i -> [cut, ...]) */
export function bucketCuts(cuts, xs, zs) {
  const nx = xs.length - 1, map = new Map();
  for (const c of cuts) {
    const b = c.box, i0 = Math.max(0, bs(xs, b[0]) - 1), i1 = Math.min(nx - 1, bs(xs, b[1]) - 1), j0 = Math.max(0, bs(zs, b[2]) - 1), j1 = Math.min(zs.length - 2, bs(zs, b[3]) - 1);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i; let a = map.get(k); if (!a) map.set(k, (a = [])); a.push(c); }
  }
  return map;
}
