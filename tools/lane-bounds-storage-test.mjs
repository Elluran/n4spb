import assert from 'node:assert/strict';
import { prepLanes, laneBounds, latAt } from '../src/world/streets/lanes.js';
let checks = 0;
for (const rank of [0, 1, 4]) for (const oneway of [false, true]) for (const lanesTag of [0, 1, 2, 3, 4, 7]) {
  const w = { rank, oneway, lanesTag, w: 10.5, x: Array(600).fill(0), hb: Array.from({ length: 600 }, (_, i) => [5.25, 5.25, 5.25, 3.6, 4.75][i % 5]) };
  prepLanes(w);
  const reference = w.hb.map((_, i) => laneBounds(w, i));
  assert.equal(new Set(w.bnd).size, 3);
  for (let i = 0; i < w.bnd.length; i++) { assert.deepEqual(w.bnd[i], reference[i]); checks++; }
  for (let k = 0; k + 1 < w.bnd.length; k += 7) for (const f of [0, 0.13, 0.5, 1]) for (let j = 0; j < reference[k].b.length; j++) {
    assert.equal(latAt(w, { k, f }, j), reference[k].b[j] + (reference[k + 1].b[j] - reference[k].b[j]) * f); checks++;
  }
}
console.log(JSON.stringify({ ok: true, exactChecks: checks }));
