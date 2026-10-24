// ribbon-overlap.mjs - T8a: where do two DIFFERENT ways of the draped alleys (paths-draped.js planPaths) cover the same ground in (nearly) the same plane?
// The ribbons are one mesh with the class bias on the height; two ways of one class that overlap are exactly coplanar (their tonal bands then fight: the diagonal hatching of the west gate). This samples the planned
// triangles on a lattice and counts the samples covered by two ways whose heights differ by less than `tol`.
// coplanarOverlap(plan, ids, { box: [x0, x1, z0, z1], tol = 1e-4 (m), step = 0.5 (m) }) -> { samples, area (m2), pairs: Map('wA x wB' -> { n, x0, x1, z0, z1 }) }
//   ids: the id of every way index of the plan (the ways of PATHS that are neither bridges nor steps, in order); a disc (way index -1) and a way against itself are not counted.
export function coplanarOverlap(plan, ids, o = {}) {
  const R = plan.ribbons, tol = o.tol ?? 1e-4, step = o.step ?? 0.5, box = o.box || [900, 1520, -1810, -1250], cell = 4;
  const grid = new Map(), T = [];
  for (let t = 0; t < R.idx.length; t += 3) {
    const a = R.idx[t], b = R.idx[t + 1], c = R.idx[t + 2], w = R.wayOf[a]; if (w < 0) continue;
    const P = [a, b, c].map((i) => [R.pos[3 * i], R.pos[3 * i + 1], R.pos[3 * i + 2]]);
    const x0 = Math.min(P[0][0], P[1][0], P[2][0]), x1 = Math.max(P[0][0], P[1][0], P[2][0]), z0 = Math.min(P[0][2], P[1][2], P[2][2]), z1 = Math.max(P[0][2], P[1][2], P[2][2]);
    if (x1 < box[0] || x0 > box[1] || z1 < box[2] || z0 > box[3]) continue;
    const k = T.length; T.push({ P, w });
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) { const key = i + ',' + j; let g = grid.get(key); if (!g) grid.set(key, (g = [])); g.push(k); }
  }
  const yAt = (P, x, z) => {
    const [A, B, C] = P, d = (B[2] - C[2]) * (A[0] - C[0]) + (C[0] - B[0]) * (A[2] - C[2]); if (Math.abs(d) < 1e-12) return null;
    const l1 = ((B[2] - C[2]) * (x - C[0]) + (C[0] - B[0]) * (z - C[2])) / d, l2 = ((C[2] - A[2]) * (x - C[0]) + (A[0] - C[0]) * (z - C[2])) / d, l3 = 1 - l1 - l2;
    if (l1 < 0 || l2 < 0 || l3 < 0) return null; return l1 * A[1] + l2 * B[1] + l3 * C[1];
  };
  const pairs = new Map(); let samples = 0;
  for (let x = box[0]; x <= box[1]; x += step) for (let z = box[2]; z <= box[3]; z += step) {
    const g = grid.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)); if (!g) continue;
    const hits = []; for (const k of g) { const y = yAt(T[k].P, x, z); if (y !== null) hits.push({ w: T[k].w, y }); }
    for (let i = 0; i < hits.length; i++) for (let j = i + 1; j < hits.length; j++) {
      if (hits[i].w === hits[j].w || Math.abs(hits[i].y - hits[j].y) > tol) continue;
      const key = [ids[hits[i].w], ids[hits[j].w]].sort().join(' x '); samples++;
      const e = pairs.get(key) || { n: 0, x0: x, x1: x, z0: z, z1: z }; e.n++; e.x0 = Math.min(e.x0, x); e.x1 = Math.max(e.x1, x); e.z0 = Math.min(e.z0, z); e.z1 = Math.max(e.z1, z); pairs.set(key, e);
    }
  }
  return { samples, area: samples * step * step, pairs };
}
