// landmarksI/hip.js - pitched roofs over arbitrary footprints: the roof surface is the footprint polygon (with its light wells) triangulated and subdivided; every vertex rises with its
// distance to the nearest eave (slope `slope`, up to a ridge plateau `R` above the eaves), so the planes meet in proper hips and valleys at every corner, never a gap or a cliff.
// Used by the Winter Palace (shallow green iron roof, photo 005 / 053) and by the Hermitage blocks.  Returns the height function so chimneys, drums and turrets can stand on the roof.
import * as THREE from 'three';

/** @param P Parts collector, mat, outer = [[x,z]..], holes = [[[x,z]..]], y0 = eave level; o = { slope 0.3, R 3.0, cell 3.2, uvs 4 } -> h(x, z) */
export function hipRoof(P, mat, outer, holes, y0, o = {}) {
  const slope = o.slope ?? 0.3, R = o.R ?? 3.0, cell = o.cell ?? 3.2, uvs = o.uvs ?? 4;
  const segs = [];
  for (const r of [outer].concat(holes || [])) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; segs.push([a[0], a[1], b[0] - a[0], b[1] - a[1], Math.max(1e-9, (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)]); }
  const dist = (x, z) => {
    let best = 1e9;
    for (const s of segs) {
      let t = ((x - s[0]) * s[2] + (z - s[1]) * s[3]) / s[4]; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - (s[0] + s[2] * t), dz = z - (s[1] + s[3] * t), d = dx * dx + dz * dz;
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  const h = (x, z) => y0 + Math.min(R, slope * dist(x, z));
  const c2 = outer.map((p) => new THREE.Vector2(p[0], p[1])), h2 = (holes || []).map((r) => r.map((p) => new THREE.Vector2(p[0], p[1])));
  const all = outer.concat(...(holes || [])), tris = THREE.ShapeUtils.triangulateShape(c2, h2);
  const out = [];
  const split = (A, B, C, depth) => {
    const ab = Math.hypot(B[0] - A[0], B[1] - A[1]), bc = Math.hypot(C[0] - B[0], C[1] - B[1]), ca = Math.hypot(A[0] - C[0], A[1] - C[1]);
    const m = Math.max(ab, bc, ca);
    if (m <= cell || depth > 7) { out.push([A, B, C]); return; }
    if (m === ab) { const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; split(A, M, C, depth + 1); split(M, B, C, depth + 1); }
    else if (m === bc) { const M = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2]; split(A, B, M, depth + 1); split(A, M, C, depth + 1); }
    else { const M = [(C[0] + A[0]) / 2, (C[1] + A[1]) / 2]; split(A, B, M, depth + 1); split(M, B, C, depth + 1); }
  };
  for (const [a, b, c] of tris) split(all[a], all[b], all[c], 0);
  const cache = new Map();
  const H = (p) => { const k = p[0].toFixed(3) + ',' + p[1].toFixed(3); let v = cache.get(k); if (v === undefined) { v = h(p[0], p[1]); cache.set(k, v); } return v; };
  for (const [A, B, C] of out) {
    const a = [A[0], H(A), A[1]], b = [B[0], H(B), B[1]], c = [C[0], H(C), C[1]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
    P.fan(mat, [a, b, c], [nx, ny, nz], (p) => [p[0] / uvs, p[2] / uvs]);
  }
  return h;
}

const hashv = (a, b) => { let k = 2166136261 ^ Math.floor(a * 13 + b * 71); k = Math.imul(k, 16777619); k ^= k >>> 15; return ((k >>> 0) % 1000) / 1000; };

/** mint chimney stacks with white caps along the eaves of a roof: edges = kit ringEdges (a, b, n, len); h = roof height function; every ~`gap` m at `inset` m behind the wall */
export function chimneys(P, mat, capMat, h, edges, o = {}) {
  const gap = o.gap ?? 7.5, inset = o.inset ?? 4.2, y0 = o.y0 ?? 0;
  for (const e of edges) {
    if (e.len < (o.minLen ?? 10)) continue;
    const k = Math.max(1, Math.floor(e.len / gap)), ux = (e.b[0] - e.a[0]) / e.len, uz = (e.b[1] - e.a[1]) / e.len;
    for (let i = 0; i < k; i++) {
      const t = e.len * (i + 0.5 + (hashv(e.len, i) - 0.5) * 0.5) / k, ins = inset + hashv(i, e.len) * 2.2;
      const x = e.a[0] + ux * t - e.n[0] * ins, z = e.a[1] + uz * t - e.n[1] * ins;
      const w = 0.7 + hashv(i, 3) * 0.35, hh = 2.1 + hashv(e.len, 7 + i) * 1.0, yb = h(x, z) - 0.15 + y0;
      P.push(x, 0, z, Math.atan2(-uz, ux));
      P.box(mat, -w, w, yb, yb + hh, -w * 0.8, w * 0.8, 'b');
      P.box(capMat, -w - 0.12, w + 0.12, yb + hh, yb + hh + 0.2, -w * 0.8 - 0.12, w * 0.8 + 0.12, 'b');
      P.pop();
    }
  }
}
