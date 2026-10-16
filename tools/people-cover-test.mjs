// Exact query regression for nav.fastCover, using the real city network after lanegraph preparation.
// Tests the actual production query against the previous live-way calculation; no scene/GPU required.
// Run: node tools/people-cover-test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildNet } from '../src/world/streets/net.js';
import { buildLaneGraph } from '../src/world/streets/lanegraph.js';
import * as L from '../src/world/layout.js';

const net = buildNet(L); buildLaneGraph(net);
const source = fs.readFileSync(new URL('../src/world/people/nav.js', import.meta.url), 'utf8');
const start = source.indexOf('  const FILG = new Map();'), end = source.indexOf('  nav.fastCover = fastCover;', start);
assert(start >= 0 && end > start, 'production fastCover and fillet index are present');
const cellKey = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);
const query = Function('net', 'cellKey', source.slice(start, end) + '\nreturn fastCover;')(net, cellKey);
const fillets = new Map();
for (const f of net.fillets) for (let x = Math.floor(f.box[0] / 16); x <= Math.floor(f.box[1] / 16); x++) for (let z = Math.floor(f.box[2] / 16); z <= Math.floor(f.box[3] / 16); z++) {
  const key = cellKey(x, z); let list = fillets.get(key); if (!list) fillets.set(key, list = []); list.push(f);
}
const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 1; i < o.length; j = i++) { const a = o[i], b = o[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
function original(px, pz) {
  let best = -50; const list = net.grid.get((Math.floor(px / 24) + 300) * 2048 + (Math.floor(pz / 24) + 300));
  if (list) for (let q = 0; q < list.length; q++) {
    const e = list[q], w = e.w, i = e.i, ax = w.x[i], az = w.z[i], dx = w.x[i + 1] - ax, dz = w.z[i + 1] - az, l2 = dx * dx + dz * dz;
    let t = l2 < 1e-12 ? 0 : ((px - ax) * dx + (pz - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
    const cx = ax + dx * t, cz = az + dz * t, ux = px - cx, uz = pz - cz, d = Math.sqrt(ux * ux + uz * uz), l = Math.sqrt(l2) || 1, side = (ux * -dz + uz * dx) / l;
    const h = side > 0 ? w.hR[i] + (w.hR[i + 1] - w.hR[i]) * t : w.hL[i] + (w.hL[i + 1] - w.hL[i]) * t, m = h - d; if (m > best) best = m;
  }
  if (best < 0.4) for (const f of fillets.get(cellKey(Math.floor(px / 16), Math.floor(pz / 16))) || []) {
    if (px < f.box[0] || px > f.box[1] || pz < f.box[2] || pz > f.box[3]) continue;
    if (ringHas(f.poly, px, pz) && best < 0.6) best = 0.6;
  }
  return best;
}
const entries = [...new Set([...net.grid.values()].flat())];
for (const e of entries) {
  const w = e.w, i = e.i, dx = w.x[i + 1] - w.x[i], dz = w.z[i + 1] - w.z[i], l2 = dx * dx + dz * dz;
  for (const [key, expected] of Object.entries({ ax: w.x[i], az: w.z[i], dx, dz, l2, l: Math.sqrt(l2) || 1, hL0: w.hL[i], hL1: w.hL[i + 1], hR0: w.hR[i], hR1: w.hR[i + 1] })) assert.equal(e[key], expected, 'final network coefficient ' + key);
}
let checks = 0, seed = 1234;
const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const compare = (x, z) => { assert.equal(query(x, z), original(x, z), `cover at ${x},${z}`); checks++; };
for (let i = 0; i < entries.length; i += 17) {
  const e = entries[i];
  for (const t of [0, 0.5, 1]) {
    const x = e.ax + e.dx * t, z = e.az + e.dz * t; compare(x, z);
    for (const side of [-1, 1]) {
      const h = side > 0 ? e.hR0 + (e.hR1 - e.hR0) * t : e.hL0 + (e.hL1 - e.hL0) * t;
      for (const epsilon of [-1e-7, 0, 1e-7]) compare(x - e.dz / e.l * side * (h + epsilon), z + e.dx / e.l * side * (h + epsilon));
    }
  }
  for (const epsilon of [-1e-7, 0, 1e-7]) compare(Math.floor(e.ax / 24) * 24 + epsilon, Math.floor(e.az / 24) * 24 + epsilon);
}
for (const f of net.fillets) {
  compare((f.box[0] + f.box[1]) / 2, (f.box[2] + f.box[3]) / 2);
  for (const [x, z] of f.poly) for (const epsilon of [-1e-7, 0, 1e-7]) compare(x + epsilon, z - epsilon);
}
const samples = Array.from({ length: 100000 }, () => { const e = entries[Math.floor(random() * entries.length)]; return [e.ax + (random() - 0.5) * 30, e.az + (random() - 0.5) * 30]; });
for (const [x, z] of samples) compare(x, z);
for (let i = 0; i < 10000; i++) compare(-6000 + random() * 9000, -5000 + random() * 9000);
let sink = 0;
const bench = fn => { const t = performance.now(); for (const [x, z] of samples) sink += fn(x, z); return performance.now() - t; };
bench(original); bench(query);
const before = [], after = [];
for (let i = 0; i < 3; i++) { before.push(bench(original)); after.push(bench(query)); }
before.sort((a, b) => a - b); after.sort((a, b) => a - b);
assert(Number.isFinite(sink));
console.log(`RESULT: OK - ${checks} exact queries, ${entries.length} verified segment coefficients, ${net.fillets.length} fillets; 100,000 queries ${before[1].toFixed(1)} -> ${after[1].toFixed(1)} ms (${(before[1] / after[1]).toFixed(2)}x).`);
