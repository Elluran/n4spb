// streets-clip-test.mjs - the road network at the clip line of the strip (headless, no GPU): node tools/streets-clip-test.mjs
// The data extent of the strip is a STAIRCASE (the union of eight rectangles grown by 120 m, layout.inExtent). net.js rawWays lets a named main street (rank >= 2) that leaves the data run on straight
// for 70 m so no avenue ends in a field; the border it tests against must be the UNION, not its bounding box (the notches of the staircase lie inside the box):
//   1. the data: no ROADS vertex lies outside the extent union (the clip line is where the records end);
//   2. every main-street end that sits on the clip line (within 2.5 m of the union boundary) gets exactly the two run-on vertices, 35 m and 70 m straight on;
//   3. nothing else leaves the extent: no road vertex lies more than 70.5 m outside the union, and an end that is NOT a main street on the clip line stops on it;
//   4. the bounding box alone would have missed ends (the reason for the union test): counted.
import assert from 'node:assert/strict';
import * as L from '../src/world/layout.js';
import { ROADS, EXTENT } from '../src/world/data/city.js';
import { buildNet } from '../src/world/streets/net.js';

const outside = (x, z) => { if (L.inExtent(x, z)) return 0; let lo = 0, hi = 5000; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (L.inExtent(x, z, -m)) hi = m; else lo = m; } return hi; };
const onLine = (x, z) => !L.inExtent(x, z, 2.5);
const bbox = (x, z) => x < EXTENT.x0 + 2.5 || x > EXTENT.x1 - 2.5 || z < EXTENT.z0 + 2.5 || z > EXTENT.z1 - 2.5;

// 1. the data
let over = 0, worst = 0;
for (const r of ROADS) for (let i = 0; i + 1 < r.pts.length; i += 2) { const d = outside(r.pts[i], r.pts[i + 1]); if (d > 0.5) { over++; worst = Math.max(worst, d); } }
assert.equal(over, 0, `${over} ROADS vertices lie outside the extent union (worst ${worst.toFixed(1)} m): the data is not clipped`);

// 2 + 3. the network
const net = buildNet(L);
let runOn = 0, stopped = 0, bboxMissed = 0, far = 0, worstFar = 0;
const rawEnds = new Map();                                                       // way id -> raw end points of the record
for (const r of ROADS) rawEnds.set(r.id, [[r.pts[0], r.pts[1]], [r.pts[r.pts.length - 2], r.pts[r.pts.length - 1]]]);
for (const w of net.ways) {
  for (let i = 0; i < w.n; i++) { const d = outside(w.x[i], w.z[i]); if (d > 70.5) { far++; worstFar = Math.max(worstFar, d); } }
  const raw = rawEnds.get(w.id); if (!raw) continue;
  for (const [k, e] of [[0, raw[0]], [w.n - 1, raw[1]]]) {
    if (!onLine(e[0], e[1]) || w.rec.tunnel) continue;
    const named = w.rank >= 2 && !!w.rec.name, px = w.x[k], pz = w.z[k], d = outside(px, pz);
    if (named) { if (d > 60) runOn++; if (!bbox(e[0], e[1])) bboxMissed++; } else if (d < 5) stopped++;
  }
}
assert.equal(far, 0, `${far} road vertices lie more than 70.5 m outside the extent (worst ${worstFar.toFixed(1)} m): a road runs on into the notches`);
console.log(`streets-clip-test: ${ROADS.length} road records inside the extent; ${net.ways.length} ways; main-street ends run on past the clip line: ${runOn}; other ends stopped on it: ${stopped}; ends the bounding box alone would have missed: ${bboxMissed}`);
assert(runOn > 0, 'no main street runs on past the clip line (the border test finds no end on the staircase)');
assert(bboxMissed > 0, 'expected main-street ends on the notches of the staircase');
console.log('RESULT: OK');
