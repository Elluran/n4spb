// Regression: split facade origins must not displace signs/doors into open space.
import assert from 'node:assert/strict';
import { BUILDINGS } from '../src/world/data/city.js';
import { describe, assignColours } from '../src/world/city/archetypes.js';
import { analyse } from '../src/world/city/edges.js';
import { buildWalls } from '../src/world/city/walls.js';
import { FacadeBuilder } from '../src/world/city/wallmat.js';

const list = BUILDINGS.filter(b => !b.skip && !b.dupOf && !b.underground && !(b.layer < 0))
  .map(b => ({ b, st: describe(b) }));
const net = analyse(list);
assignColours(new Map(list.map(r => [r.b.id, r.st])), net.adj, list.map(r => r.b));
let units = 0, doors = 0, split = 0, legacyOutside = 0;
for (const rec of net.rec.values()) {
  const geometry = new FacadeBuilder();
  const walls = buildWalls({}, rec, () => geometry, {});
  for (const w of walls) {
    if (w.s0 > 0.01) split++;
    const local = (s, half = 0) => {
      assert.ok(s - half >= -1e-5 && s + half <= w.len + 1e-5,
        `${w.id}: detail ${s} outside local facade [0,${w.len}]`);
    };
    for (const u of w.units) {
      local(u.s, u.w / 2); local(u.door); units++;
      if (u.s + w.s0 + u.w / 2 > w.len) legacyOutside++;
    }
    for (const d of w.doors) { local(d.s); doors++; }
  }
}
assert.ok(split > 100 && units > 100 && legacyOutside > 100, 'Exercise split street facades');
console.log(`PASS: ${units} shop units, ${doors} doors, ${split} split walls; ${legacyOutside} legacy misplaced units prevented.`);
