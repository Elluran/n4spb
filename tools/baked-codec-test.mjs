// Schema interning must retain the legacy graph semantics and reject unsafe keys.
import assert from 'node:assert/strict';
import { encodeBaked, decodeBaked } from '../src/core/baked-codec.js';

function payload(meta, bytes = new Uint8Array()) {
  const json = new TextEncoder().encode(JSON.stringify(meta));
  const start = Math.ceil((8 + json.length) / 8) * 8;
  const out = new Uint8Array(start + bytes.length), view = new DataView(out.buffer);
  view.setUint32(0, 0x50495452, true); view.setUint32(4, json.length, true);
  out.set(json, 8); out.set(bytes, start); return out.buffer;
}

// The pre-schema wire format is fixed here, independent of today's encoder.
const legacy = {
  root: { r: 0 },
  nodes: [
    { t: 'Object', v: [['self', { r: 0 }], ['shared', { r: 1 }], ['alias', { r: 1 }],
      ['map', { r: 2 }], ['set', { r: 3 }], ['missing', { u: 1 }], ['special', { r: 4 }]] },
    { t: 'Float32Array', offset: 0, length: 3 },
    { t: 'Map', v: [[{ r: 0 }, { r: 1 }]] },
    { t: 'Set', v: [{ r: 0 }, { r: 1 }] },
    { t: 'Array', v: [{ n: 'Infinity' }, { n: '-Infinity' }, { n: 'NaN' }, null, false, 'city'] },
  ],
};
const raw = new Float32Array([1.25, -2.5, 8]);
const old = decodeBaked(payload(legacy, new Uint8Array(raw.buffer)));
function verify(value) {
  assert.equal(value.self, value); assert.equal(value.alias, value.shared);
  assert.equal(value.map.get(value), value.shared);
  assert(value.set.has(value)); assert(value.set.has(value.shared));
  assert.deepEqual(value.shared, raw); assert.equal(value.missing, undefined);
  assert.deepEqual(value.special, [Infinity, -Infinity, NaN, null, false, 'city']);
  assert.deepEqual(Object.keys(value), ['self', 'shared', 'alias', 'map', 'set', 'missing', 'special']);
}
verify(old); verify(decodeBaked(encodeBaked(old).buffer));

const arrayTypes = [Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array];
const arrays = arrayTypes.map(Type => new Type([0, 1, 17]));
const roundTrip = decodeBaked(encodeBaked(arrays).buffer);
assert.deepEqual(roundTrip, arrays);
assert(roundTrip.every(a => a.buffer === roundTrip[0].buffer), 'all array storage stays in the decoded buffer');

const records = Array.from({ length: 100 }, (_, i) => ({ x: i, z: i + 1, tag: 'wall', optional: undefined }));
records.push({ z: 4, x: 2, optional: undefined, tag: 'reordered' });
const encoded = encodeBaked(records), restored = decodeBaked(encoded.buffer);
assert.deepEqual(restored, records);
assert.deepEqual(Object.keys(restored.at(-1)), Object.keys(records.at(-1)));
const jsonSize = new DataView(encoded.buffer).getUint32(4, true);
const metadata = JSON.parse(new TextDecoder().decode(encoded.subarray(8, 8 + jsonSize)));
assert.equal(metadata.schemas.length, 2, 'repeated key lists share one schema; property order is preserved');

for (const key of ['__proto__', 'constructor', 'prototype']) {
  assert.throws(() => decodeBaked(payload({ root: { r: 0 }, nodes: [{ t: 'Object', v: [[key, 1]] }] })), /Invalid baked property/);
  assert.throws(() => decodeBaked(payload({ root: { r: 0 }, nodes: [{ t: 'Object', s: 0, v: [1] }], schemas: [[key]] })), /Invalid baked property/);
}
for (const schemas of [undefined, [], [['x', 'z']]]) {
  assert.throws(() => decodeBaked(payload({ root: { r: 0 }, nodes: [{ t: 'Object', s: 0, v: [1] }], schemas })), /Invalid baked object schema/);
}
console.log('RESULT: OK (legacy and interned schemas, aliases/cycles, typed storage, key ordering and validation)');
