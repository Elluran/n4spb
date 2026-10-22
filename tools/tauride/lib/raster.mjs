// Rasters of the overlay: a grid of 0.5 m cells over the garden (world frame: +X east, +Z south, north up in the picture), polygon fill (even-odd, holes), thick polylines, a chamfer
// distance transform and the metrics (IoU with a best-shift search, centreline offset percentiles, quadrant fractions).

/** grid over a world box at `res` metres per cell: cell (i, j) covers x0 + i*res .. , z0 + j*res .. ; its centre is (x0 + (i + .5) res, z0 + (j + .5) res) */
export function makeGrid(box, res = 0.5) {
  const w = Math.ceil((box.x1 - box.x0) / res), h = Math.ceil((box.z1 - box.z0) / res);
  return { x0: box.x0, z0: box.z0, res, w, h, cx: (i) => box.x0 + (i + 0.5) * res, cz: (j) => box.z0 + (j + 0.5) * res };
}
/** fill polygons {o, h: [holes]} (flat rings) into a Uint8Array mask of the grid (even-odd, scanline at cell centres) */
export function fillPolys(g, polys, mask = new Uint8Array(g.w * g.h), v = 1) {
  for (const p of polys) {
    const rings = [p.o, ...(p.h || [])];
    for (let j = 0; j < g.h; j++) {
      const z = g.cz(j), xs = [];
      for (const r of rings) for (let i = 0, n = r.length; i < n; i += 2) {
        const ax = r[i], az = r[i + 1], bx = r[(i + 2) % n], bz = r[(i + 3) % n];
        if ((az > z) !== (bz > z)) xs.push(ax + (z - az) / (bz - az) * (bx - ax));
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - g.x0) / g.res - 0.5)), i1 = Math.min(g.w - 1, Math.floor((xs[k + 1] - g.x0) / g.res - 0.5));
        for (let i = i0; i <= i1; i++) mask[j * g.w + i] = v;
      }
    }
  }
  return mask;
}
/** draw a polyline of width w (a capsule round every segment) into a mask */
export function strokePolyline(g, pts, w, mask = new Uint8Array(g.w * g.h), v = 1) {
  const r = Math.max(w / 2, g.res / 2);
  for (let k = 0; k + 3 < pts.length; k += 2) {
    const ax = pts[k], az = pts[k + 1], bx = pts[k + 2], bz = pts[k + 3], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - g.x0) / g.res)), i1 = Math.min(g.w - 1, Math.ceil((Math.max(ax, bx) + r - g.x0) / g.res));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz) - r - g.z0) / g.res)), j1 = Math.min(g.h - 1, Math.ceil((Math.max(az, bz) + r - g.z0) / g.res));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = g.cx(i), z = g.cz(j); let t = l2 ? ((x - ax) * dx + (z - az) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
      if (Math.hypot(x - ax - t * dx, z - az - t * dz) <= r) mask[j * g.w + i] = v;
    }
  }
  return mask;
}
/** chamfer (3-4) distance transform of a mask in metres: distance of every cell to the nearest set cell */
export function distanceTo(g, mask) {
  const INF = 1e9, d = new Float32Array(g.w * g.h);
  for (let k = 0; k < d.length; k++) d[k] = mask[k] ? 0 : INF;
  const { w, h } = g, a = 3, b = 4;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i; let v = d[k];
    if (i > 0) v = Math.min(v, d[k - 1] + a);
    if (j > 0) { v = Math.min(v, d[k - w] + a); if (i > 0) v = Math.min(v, d[k - w - 1] + b); if (i < w - 1) v = Math.min(v, d[k - w + 1] + b); }
    d[k] = v;
  }
  for (let j = h - 1; j >= 0; j--) for (let i = w - 1; i >= 0; i--) {
    const k = j * w + i; let v = d[k];
    if (i < w - 1) v = Math.min(v, d[k + 1] + a);
    if (j < h - 1) { v = Math.min(v, d[k + w] + a); if (i < w - 1) v = Math.min(v, d[k + w + 1] + b); if (i > 0) v = Math.min(v, d[k + w - 1] + b); }
    d[k] = v;
  }
  for (let k = 0; k < d.length; k++) d[k] = d[k] >= INF ? Infinity : d[k] / 3 * g.res;      // chamfer 3-4: 3 units = one cell
  return d;
}
/** intersection over union of two masks over the cells where `valid` is set, with the second mask shifted by (dx, dy) cells */
export function iou(g, A, B, valid, dx = 0, dy = 0) {
  let inter = 0, uni = 0;
  for (let j = 0; j < g.h; j++) {
    const jj = j + dy; if (jj < 0 || jj >= g.h) continue;
    for (let i = 0; i < g.w; i++) {
      const ii = i + dx; if (ii < 0 || ii >= g.w) continue;
      if (!valid[j * g.w + i] || !valid[jj * g.w + ii]) continue;
      const a = A[j * g.w + i], b = B[jj * g.w + ii];
      if (a && b) inter++; if (a || b) uni++;
    }
  }
  return { inter, uni, iou: uni ? inter / uni : 1 };
}
/** the best shift of B against A within +-R cells (cells), by IoU */
export function bestShift(g, A, B, valid, R = 8) {
  let best = { dx: 0, dy: 0, ...iou(g, A, B, valid, 0, 0) };
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const r = iou(g, A, B, valid, dx, dy); if (r.iou > best.iou + 1e-9) best = { dx, dy, ...r }; }
  return best;
}
/** percentile (0..1) of a numeric array (nearest rank) */
export function percentile(a, q) { if (!a.length) return NaN; const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))]; }
/** share of set cells of `mask` inside each quadrant of `box` (split at its centre), over the cells where `valid` is set: { NW, NE, SW, SE } in 0..1 (north = -z) */
export function quadrantFractions(g, mask, valid, box) {
  const mx = (box.x0 + box.x1) / 2, mz = (box.z0 + box.z1) / 2, acc = { NW: [0, 0], NE: [0, 0], SW: [0, 0], SE: [0, 0] };
  for (let j = 0; j < g.h; j++) for (let i = 0; i < g.w; i++) {
    const k = j * g.w + i; if (!valid[k]) continue; const x = g.cx(i), z = g.cz(j);
    if (x < box.x0 || x > box.x1 || z < box.z0 || z > box.z1) continue;
    const q = (z < mz ? 'N' : 'S') + (x < mx ? 'W' : 'E'); acc[q][1]++; if (mask[k]) acc[q][0]++;
  }
  return Object.fromEntries(Object.entries(acc).map(([q, [a, n]]) => [q, n ? a / n : NaN]));
}
