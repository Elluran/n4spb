// landmarksA/geom.js - polygon helpers shared by the building parts: wall runs along a polyline (a frame per segment: local x along the wall,
// local z INTO the building, so d- is outward like the station facade), inset (hip roof) polygons, point-in-polygon.
import * as THREE from 'three';

export const ringArea = (r) => { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
export const inside = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
export const centroid = (r) => { let x = 0, z = 0; for (const p of r) { x += p[0]; z += p[1]; } return [x / r.length, z / r.length]; };

/** inset a polygon by dist metres (miter joins); negative dist grows it. Works for convex-ish rings. */
export function inset(ring, dist) {
  const n = ring.length, area = ringArea(ring), s = area > 0 ? 1 : -1, out = [];
  const nrm = (i) => { const a = ring[i], b = ring[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l * s, dx / l * s]; };   // toward the inside
  for (let i = 0; i < n; i++) {
    const n0 = nrm((i + n - 1) % n), n1 = nrm(i), p = ring[i];
    let bx = n0[0] + n1[0], bz = n0[1] + n1[1]; const bl = bx * n0[0] + bz * n0[1];
    if (Math.abs(bl) < 1e-3) { out.push([p[0] + n1[0] * dist, p[1] + n1[1] * dist]); continue; }
    out.push([p[0] + bx / bl * dist, p[1] + bz / bl * dist]);
  }
  return out;
}

/**
 * Walk the edges of a ring [[x,z]...] (open); for every edge call fn(info) where info = { a, b, len, nx, nz (outward normal), i }.
 * The Parts transform is pushed so that local x runs along the wall (a -> b), local y is up and local z points INTO the building.
 */
export function wallRun(P, ring, fn, o = {}) {
  const n = ring.length, closed = o.closed !== false;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    let a = ring[i], b = ring[(i + 1) % n];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.2) continue;
    let tx = dx / len, tz = dz / len;
    let inx = -tz, inz = tx;                              // z axis of the frame = (sin phi, cos phi) = (-tz, tx)
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const isIn = (o.inside || ((x, z) => inside(ring, x, z)))(mx + inx * 0.6, mz + inz * 0.6);
    if (!isIn) { const t = a; a = b; b = t; tx = -tx; tz = -tz; inx = -tz; inz = tx; }
    const phi = Math.atan2(-tz, tx);
    P.push(a[0], 0, a[1], phi);
    fn({ a, b, len, nx: -inx, nz: -inz, i, phi, tx, tz });
    P.pop();
  }
}

/** hipped roof over a ring: eaves at y0, flat top (or ridge) at y0 + rise, inset `run` metres. Material mat; returns nothing. */
export function hipRoof(P, mat, ring, y0, rise, run, o = {}) {
  const r2 = inset(ring, run);
  const n = ring.length, c = centroid(ring);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p = ring[i], q = ring[j], p2 = r2[i], q2 = r2[j];
    let ox = q[1] - p[1], oz = -(q[0] - p[0]); const ol = Math.hypot(ox, oz) || 1; ox /= ol; oz /= ol;
    if (ox * ((p[0] + q[0]) / 2 - c[0]) + oz * ((p[1] + q[1]) / 2 - c[1]) < 0) { ox = -ox; oz = -oz; }
    const nl = Math.hypot(rise, run) || 1;
    P.quad(mat, [p[0], y0, p[1]], [q[0], y0, q[1]], [q2[0], y0 + rise, q2[1]], [p2[0], y0 + rise, p2[1]], [ox * rise / nl, run / nl, oz * rise / nl]);
  }
  if (o.cap !== false) P.cap(mat, r2, y0 + rise, true);
  return r2;
}

/** flat polygon ring from a flat [x,z,...] array */
export const ringOf = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };
export { THREE };

/** Triangulate a polygon (outer ring + holes, [[x,z]...]) and split every triangle until its longest edge is <= maxEdge (keeps float interpolation of huge flat polygons honest). */
export function cellCap(P, mat, ring, y, o = {}) {
  const maxE = o.maxEdge || 24, uvs = o.uvs || 1, up = o.up !== false;
  const holes = o.holes || [];
  const c2 = ring.map((p) => new THREE.Vector2(p[0], p[1])), h2 = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
  const tris = THREE.ShapeUtils.triangulateShape(c2, h2), all = ring.concat(...holes);
  const emit = (a, b, c) => {
    const e = [Math.hypot(b[0] - a[0], b[1] - a[1]), Math.hypot(c[0] - b[0], c[1] - b[1]), Math.hypot(a[0] - c[0], a[1] - c[1])];
    const m = Math.max(...e);
    if (m > maxE) {
      const i = e.indexOf(m), p = [a, b, c][i], q = [a, b, c][(i + 1) % 3], r = [a, b, c][(i + 2) % 3], mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      emit(p, mid, r); emit(mid, q, r); return;
    }
    P.tri(mat, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], [0, up ? 1 : -1, 0], [a, b, c].map((p) => [p[0] / uvs, p[1] / uvs]));
  };
  for (const [a, b, c] of tris) emit(all[a], all[b], all[c]);
}
