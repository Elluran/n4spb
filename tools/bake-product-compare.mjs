// Memory/runtime-only changes should leave shipping world data identical.
// Usage: node tools/bake-product-compare.mjs <baseline assets/baked directory>
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { decodeBaked } from '../src/core/baked-codec.js';
const current = fileURLToPath(new URL('../assets/baked/', import.meta.url));
assert(process.argv[2], 'Pass the frozen baseline assets/baked directory');
const baseline = path.resolve(process.argv[2]);
const manifests = [baseline, current].map(dir => JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'))));
assert.deepEqual(Object.keys(manifests[1].files).sort(), Object.keys(manifests[0].files).sort(), 'same products');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const ignoredTiming = [], byteIdentical = [];
for (const name of Object.keys(manifests[0].files)) {
  const buffers = [baseline, current].map((dir, i) => fs.readFileSync(path.join(dir, manifests[i].files[name])));
  if (digest(buffers[0]) === digest(buffers[1])) { byteIdentical.push(name); continue; }
  assert(['city-base', 'roof'].includes(name), `World product changed: ${name}`);
  const decoded = buffers.map(b => { const raw = gunzipSync(b); return decodeBaked(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength)); });
  for (const value of decoded) {
    if (name === 'roof') { assert.equal(typeof value.ms, 'number'); value.ms = 0; }
    else {
      assert.equal(typeof value.service.buildMs, 'number'); value.service.buildMs = 0;
      for (const key of Object.keys(value.service.buildPhases)) {
        assert(['classify', 'edges', 'passages', 'walls', 'details', 'flush'].includes(key), `Unexpected phase ${key}`);
        assert.equal(typeof value.service.buildPhases[key], 'number'); value.service.buildPhases[key] = 0;
      }
    }
  }
  assert.deepEqual(decoded[1], decoded[0], `Only explicitly listed build timings may differ: ${name}`);
  ignoredTiming.push(name);
}
console.log(JSON.stringify({ ok: true, before: manifests[0].revision, after: manifests[1].revision,
  products: byteIdentical.length + ignoredTiming.length, byteIdentical: byteIdentical.length, onlyBuildTimings: ignoredTiming }));
