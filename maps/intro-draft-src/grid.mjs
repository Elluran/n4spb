// The raster of the intro map (shared by build-overlap.mjs): 40 m cells over the bbox of the city; helpers to fill polygons, draw lines, trace the outline of a set of cells.
import { toM, dpRing, extentM, rpt } from './lib.mjs';
export const BBOX = [59.55, 29.40, 60.25, 30.90];     // S W N E
export const S = BBOX[0], W = BBOX[1], N = BBOX[2], E = BBOX[3];
export const CELL = 40;
export const KXm = toM([1, 0])[0], KYm = toM([0, 1])[1];
export const GW = Math.ceil((E - W) * KXm / CELL), GH = Math.ceil((N - S) * KYm / CELL);
export const toG = (p) => [(p[0] - W) * KXm / CELL, (N - p[1]) * KYm / CELL];
export const fromG = (x, y) => [W + x * CELL / KXm, N - y * CELL / KYm];
export const cellOf = (p) => { const g = toG(p), x = Math.floor(g[0]), y = Math.floor(g[1]); return x < 0 || y < 0 || x >= GW || y >= GH ? -1 : y * GW + x; };

/** fn(i) for every cell whose centre is inside the rings (evenodd) */
export function fillRings(rings, fn) {
  const edges = [];
  let y0 = Infinity, y1 = -Infinity;
  for (const ring of rings) {
    const g = ring.map(toG);
    for (let i = 0, n = g.length; i < n; i++) {
      const a = g[i], b = g[(i + 1) % n];
      if (a[1] === b[1]) continue;
      edges.push(a[1] < b[1] ? [a[0], a[1], b[0], b[1]] : [b[0], b[1], a[0], a[1]]);
      y0 = Math.min(y0, a[1], b[1]); y1 = Math.max(y1, a[1], b[1]);
    }
  }
  if (!edges.length) return;
  const buckets = new Map();
  for (const e of edges) { const a = Math.max(0, Math.floor(e[1] - 0.5)), b = Math.min(GH - 1, Math.ceil(e[3] - 0.5)); for (let y = a; y <= b; y++) { let l = buckets.get(y); if (!l) buckets.set(y, l = []); l.push(e); } }
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(GH - 1, Math.ceil(y1)); y++) {
    const l = buckets.get(y); if (!l) continue;
    const yc = y + 0.5, xs = [];
    for (const e of l) if (yc >= e[1] && yc < e[3]) xs.push(e[0] + (yc - e[1]) / (e[3] - e[1]) * (e[2] - e[0]));
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(GW - 1, Math.ceil(xs[k + 1] - 0.5) - 1); for (let x = xa; x <= xb; x++) fn(y * GW + x); }
  }
}
/** fn(i) for the cells along a polyline of [lon, lat] (steps of <= 0.5 cell: the result is 8-connected) */
export function drawLine(pts, fn) {
  let prev = -2;
  for (let k = 1; k < pts.length; k++) {
    const a = toG(pts[k - 1]), b = toG(pts[k]);
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let s = 0; s <= n; s++) { const x = Math.floor(a[0] + (b[0] - a[0]) * s / n), y = Math.floor(a[1] + (b[1] - a[1]) * s / n); if (x < 0 || y < 0 || x >= GW || y >= GH) continue; const i = y * GW + x; if (i !== prev) { fn(i); prev = i; } }
  }
}
/** outline rings ([lon, lat], simplified) of a set of cell indices */
export function traceRings(cells, tol = 18, minExtent = 70) {
  const set = cells instanceof Set ? cells : new Set(cells);
  const has = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && set.has(y * GW + x);
  const out = new Map();                               // start vertex -> [end vertices]
  const vk = (x, y) => y * (GW + 1) + x;
  const add = (x0, y0, x1, y1) => { const k = vk(x0, y0); let l = out.get(k); if (!l) out.set(k, l = []); l.push(vk(x1, y1)); };
  for (const i of set) {
    const x = i % GW, y = (i / GW) | 0;
    if (!has(x, y - 1)) add(x, y, x + 1, y);
    if (!has(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!has(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!has(x - 1, y)) add(x, y + 1, x, y);
  }
  const rings = [];
  for (const [start, ends] of out) {
    while (ends.length) {
      const ring = [start]; let cur = ends.pop(), guard = 0;
      while (cur !== start && guard++ < 5e6) { ring.push(cur); const l = out.get(cur); if (!l || !l.length) break; cur = l.pop(); }
      if (ring.length < 4) continue;
      const ll = ring.map((v) => fromG(v % (GW + 1), (v / (GW + 1)) | 0));
      const s = dpRing(ll, tol); if (s && extentM(s) >= minExtent) rings.push(s.map(rpt));
    }
  }
  return rings;
}
