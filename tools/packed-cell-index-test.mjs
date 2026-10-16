import assert from 'node:assert/strict';
import { PackedCellIndex } from '../src/world/people/packed-cell-index.js';
const buckets = new Map();
let seed = 91210;
const random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0);
for (let i = 0; i < 100000; i++) {
  const key = random() % 17011 - 8500, id = random();
  let ids = buckets.get(key); if (!ids) buckets.set(key, ids = []);
  ids.push(id);
}
buckets.set(2 ** 40, [0, 65535, 65536, 0xffffffff, 0]);
buckets.set(-(2 ** 40), []);
const original = new Map(buckets), index = new PackedCellIndex(buckets);
let count = 0;
for (const [key, ids] of original) {
  const row = index.row(key);
  assert(row >= 0);
  assert.deepEqual(Array.from(index.values.subarray(index.offsets[row], index.offsets[row + 1])), ids);
  count += ids.length;
  assert.equal(typeof buckets.get(key), 'number', 'construction arrays are released');
}
assert.equal(index.row(2 ** 45), -1);
assert.equal(index.values.length, count);
assert.equal(new PackedCellIndex(new Map()).row(0), -1);
console.log(JSON.stringify({ ok: true, cells: original.size, entries: count, ordered: true }));
