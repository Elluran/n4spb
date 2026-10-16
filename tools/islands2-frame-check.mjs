// Islands round 2 (2026-10-13): coverage of the island polygons by the PLAY union.
//   node tools/islands2-frame-check.mjs [--rects YE1,KA1,...]  (default: every rectangle)  [--base K4]  (report "before" = rectangles up to and including K4)
// For every island of docs/reference/islands2-island-polys.json: share of the polygon area (grid sampling) inside the union, and of the polygon + 100 m of surrounding water; the minimum
// distance from a shore point to the boundary of the union (the target is >= 69 m: every shore point has that much play water / ground beyond it).
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAY_RECTS, RECT_NAMES, inUnion, distToBoundary, pointInPoly } from './osm-lib.mjs';
const polys = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-island-polys.json', import.meta.url)), 'utf8'));
const baseName = (process.argv.find((a) => a.startsWith('--base=')) || '--base=K4').slice(7);
const nBase = RECT_NAMES.indexOf(baseName) + 1;
const sets = { before: PLAY_RECTS.slice(0, nBase), after: PLAY_RECTS };
const distSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]); };
const BUF = 100, STEP = 8;
const rows = [];
for (const [key, list] of Object.entries(polys)) {
  const P = list[0], ring = P.o;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  const res = { key, bbox: [x0, x1, z0, z1].map(Math.round) };
  for (const [nm, rs] of Object.entries(sets)) {
    let nIn = 0, nInIn = 0, nBuf = 0, nBufIn = 0;
    for (let x = x0 - BUF; x <= x1 + BUF; x += STEP) for (let z = z0 - BUF; z <= z1 + BUF; z += STEP) {
      const inside = pointInPoly([x, z], P);
      let d = 0;
      if (!inside) { d = Infinity; for (let i = 0; i < ring.length - 1; i++) d = Math.min(d, distSeg([x, z], ring[i], ring[i + 1])); if (d > BUF) continue; }
      const ok = inUnion(rs, x, z);
      if (inside) { nIn++; if (ok) nInIn++; }
      nBuf++; if (ok) nBufIn++;
    }
    let minM = Infinity, wp = null, outV = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 10));
      for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; const ins = inUnion(rs, x, z); const m = ins ? distToBoundary(rs, x, z) : -distToBoundary(rs, x, z); if (!ins) outV++; if (m < minM) { minM = m; wp = [Math.round(x), Math.round(z)]; } }
    }
    res[nm] = { polyPct: +(100 * nInIn / nIn).toFixed(1), bufPct: +(100 * nBufIn / nBuf).toFixed(1), minShoreMargin: Math.round(minM), at: wp, shoreOutside: outV };
  }
  rows.push(res);
}
for (const r of rows) console.log(r.key.padEnd(15), JSON.stringify(r.bbox), 'before', JSON.stringify(r.before), 'after', JSON.stringify(r.after));
// slivers: cells outside the union with union cells within 25 m on both opposite sides (a thin notch between two rectangles): a hole in the play area
{
  const rs = PLAY_RECTS, from = RECT_NAMES.indexOf('YE1'), nr = rs.slice(from);
  if (from >= 0) {
    const x0 = Math.min(...nr.map((r) => r.x0)) - 200, x1 = Math.max(...nr.map((r) => r.x1)) + 200, z0 = Math.min(...nr.map((r) => r.z0)) - 200, z1 = Math.max(...nr.map((r) => r.z1)) + 200;
    const bad = [];
    for (let x = x0; x <= x1; x += 5) for (let z = z0; z <= z1; z += 5) {
      if (inUnion(rs, x, z)) continue;
      const D = 25;
      if ((inUnion(rs, x - D, z) && inUnion(rs, x + D, z)) || (inUnion(rs, x, z - D) && inUnion(rs, x, z + D))) bad.push([x, z]);
    }
    console.log('sliver / notch cells (5 m) near the new rectangles:', bad.length);
    const seen = new Set(), key = (p) => p[0] + ',' + p[1], set = new Set(bad.map(key));
    for (const p of bad) { if (seen.has(key(p))) continue; const st = [p], bb = { x0: p[0], x1: p[0], z0: p[1], z1: p[1], n: 0 }; seen.add(key(p)); while (st.length) { const q = st.pop(); bb.n++; bb.x0 = Math.min(bb.x0, q[0]); bb.x1 = Math.max(bb.x1, q[0]); bb.z0 = Math.min(bb.z0, q[1]); bb.z1 = Math.max(bb.z1, q[1]); for (const [dx, dz] of [[5, 0], [-5, 0], [0, 5], [0, -5]]) { const r = [q[0] + dx, q[1] + dz]; if (set.has(key(r)) && !seen.has(key(r))) { seen.add(key(r)); st.push(r); } } } console.log('  notch', JSON.stringify(bb)); }
  }
}
// areas: union of the rectangles (exact, coordinate compression), per rectangle the NEW ground (not held by an earlier rectangle)
{
  const area = (rs) => { const xs = [...new Set(rs.flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b); let a = 0; for (let i = 0; i + 1 < xs.length; i++) { const iv = rs.filter((r) => r.x0 <= xs[i] && r.x1 >= xs[i + 1]).map((r) => [r.z0, r.z1]).sort((p, q) => p[0] - q[0]); let end = -Infinity, len = 0; for (const [s, e] of iv) { if (e <= end) continue; len += e - Math.max(s, end); end = e; } a += len * (xs[i + 1] - xs[i]); } return a; };
  const before = area(PLAY_RECTS.slice(0, nBase)), after = area(PLAY_RECTS);
  console.log(`play area: ${(before / 1e6).toFixed(4)} km2 (up to ${baseName}) -> ${(after / 1e6).toFixed(4)} km2 (+${((after - before) / 1e6).toFixed(4)})`);
  for (let i = nBase; i < PLAY_RECTS.length; i++) { const r = PLAY_RECTS[i], d = area(PLAY_RECTS.slice(0, i + 1)) - area(PLAY_RECTS.slice(0, i)); console.log(`  ${RECT_NAMES[i].padEnd(4)} ${r.x1 - r.x0} x ${r.z1 - r.z0} m  rect ${((r.x1 - r.x0) * (r.z1 - r.z0) / 1e6).toFixed(3)} km2  new ground ${(d / 1e6).toFixed(3)} km2`); }
}
