// Exact A/B query check against the former whole-city scan, using the shipping baked crossings.
// Includes corridor edges, grid boundaries, mutable kerb extensions, overlaps and later virtual crossings.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeBaked } from '../src/core/baked-codec.js';
import { createCrosswalkLookup } from '../src/world/people/crosswalks.js';

const root = new URL('../assets/baked/', import.meta.url), manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
const bytes = gunzipSync(fs.readFileSync(new URL(manifest.files['nav-medium'], root)));
const data = decodeBaked(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const all = data.cws, crossings = [], query = createCrosswalkLookup(crossings);
function original(x, z, margin = 0.3) {
  for (let i = 0; i < crossings.length; i++) {
    const c = crossings[i]; if (Math.abs(x - c.x) > c.len / 2 + 6 || Math.abs(z - c.z) > c.len / 2 + 6) continue;
    const dx = x - c.ax, dz = z - c.az, along = dx * c.ux + dz * c.uz, lateral = -dx * c.uz + dz * c.ux;
    if (along > -margin - 0.3 - c.ea && along < c.len + margin + 0.3 + c.eb && Math.abs(lateral) < c.w / 2 + margin) return i;
  }
  return -1;
}
let checks = 0, seed = 1234;
const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
const compare = (x, z, margin) => { assert.equal(query(x, z, margin), original(x, z, margin), `crossing at ${x},${z}, margin ${margin}`); checks++; };
compare(0, 0, 0.3);
for (let stage = 0; stage < 2; stage++) {
  const start = Math.floor(all.length * stage / 2), end = Math.floor(all.length * (stage + 1) / 2);
  crossings.push(...all.slice(start, end).map(c => ({ ...c })));
  for (const c of crossings) {
    for (const margin of [0, 0.3, 0.8, 2]) {
      compare(c.x, c.z, margin);
      for (const side of [-1, 1]) {
        const lateral = side * (c.w / 2 + margin);
        for (const epsilon of [-1e-7, 0, 1e-7]) compare(c.x - c.uz * (lateral + epsilon), c.z + c.ux * (lateral + epsilon), margin);
      }
    }
    const x = Math.floor(c.x / 32) * 32, z = Math.floor(c.z / 32) * 32;
    for (const epsilon of [-1e-7, 0, 1e-7]) compare(x + epsilon, z + epsilon, 0.5);
  }
  for (let i = 0; i < 15000; i++) compare(-5000 + random() * 7000, -3500 + random() * 7500, [0.3, 0.5, 0.7, 0.8][i % 4]);
}
for (const c of crossings) { c.ea += 1; c.eb += 1; compare(c.ax - c.ux, c.az - c.uz, 0.5); }
const sample = Array.from({ length: 30000 }, () => { const c = crossings[Math.floor(random() * crossings.length)]; return [c.x + random() * 50 - 25, c.z + random() * 50 - 25]; });
let t = performance.now(); for (const [x, z] of sample) original(x, z); const before = performance.now() - t;
t = performance.now(); for (const [x, z] of sample) query(x, z); const after = performance.now() - t;
console.log(`RESULT: OK - ${checks} exact queries across ${crossings.length} real crossings; scan ${before.toFixed(1)}ms, grid ${after.toFixed(1)}ms (${(before / after).toFixed(1)}x).`);
