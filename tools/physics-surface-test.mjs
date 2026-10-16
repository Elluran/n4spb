// Exact surface-index regression against the previous generic collider query.
// Optional real-city benchmark: --items shots/perf-oct11/physics-items.json
// JSON may be the collider array or { items: [...] }; no browser/scene build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Physics } from '../src/core/physics.js';
import { NONE, UNIT } from '../src/core/roofmap.js';

const isSurface = it => it.type === 'walk' || it.type === 'ramp' || it.type === 'hole';
let seed = 12345, comparisons = 0;
const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
// Run the real public methods on the same instance and records, swapping only
// the candidate source back to the previous generic query. This preserves all
// height/roof/hole code and allows exact item-identity as well as value checks.
function oldCall(ph, method, args) {
  const query = ph._querySurfaces; ph._querySurfaces = ph._query;
  try { return ph[method](...args); } finally { ph._querySurfaces = query; }
}
function compare(ph, x, z, feetY, roofs, ignoreHoles, r = 0) {
  assert.deepEqual([...ph._querySurfaces(x, z, r + 0.01)], [...ph._query(x, z, r + 0.01)].filter(isSurface), 'same surface candidates in the same order');
  const actual = ph.surfaceAt(x, z, feetY, roofs, {}, ignoreHoles);
  const original = oldCall(ph, 'surfaceAt', [x, z, feetY, roofs, {}, ignoreHoles]);
  assert.equal(actual.y, original.y, `height at ${x},${z}`);
  assert.equal(actual.kind, original.kind, 'same surface kind');
  assert.equal(actual.item, original.item, 'same winning item, including equal-height ties');
  assert.equal(ph.inHole(x, z, r), oldCall(ph, 'inHole', [x, z, r]), 'same padded hole result');
  assert.equal(ph.groundHeight(x, z, feetY, roofs), oldCall(ph, 'groundHeight', [x, z, feetY, roofs]), 'groundHeight wrapper');
  assert.equal(ph.flightFloor(x, z, feetY), oldCall(ph, 'flightFloor', [x, z, feetY]), 'flight ignores holes');
  comparisons++;
}

const ph = new Physics((x, z) => x < -45 ? -8 : z < -45 ? -Infinity : 0);
const first = ph.addWalkBox(0, 0, 32, 32, 0, 3, -10);
const second = ph.addWalkBox(0, 0, 12, 12, Math.PI / 4, 3, -10);
ph.addWalkRamp(25, 8, 16, 48, 0.4, -5, 12);
ph.addHole(0, 0, 10, 20, 0.2);
const escalator = ph.addEscalator({ bottom: { x: -24, y: -20, z: 65 }, top: { x: -24, y: 0, z: 25 }, w: 3, dir: 1 });
ph.addStairs(30, 70, 5, 30, 0.7, -12, 3, 90);
ph.addWalkBox(-60, 0, 25, 25, 0.3, -6, -9);
for (let i = 0; i < 2500; i++) {
  const x = random() * 200 - 100, z = random() * 200 - 100;
  if (i % 2) ph.addBox(x, z, 1 + random() * 7, 1 + random() * 25, random() * 6, -2, 15);
  else ph.addCylinder(x, z, 0.3 + random(), -3, 12);
}
ph.setRoofMap({ x0: -100, z0: -100, res: 10, w: 20, h: 20, data: Uint16Array.from({ length: 400 }, (_, i) => i % 3 ? Math.round(5 / UNIT) : NONE) });
const moving = { cx: 0, cz: 0, w: 100, d: 100, rotY: 0.4, y0: -30, y1: 30 };
ph.addDynamic(() => [moving]); ph.refreshDynamic();
assert.equal(ph.surfaceAt(0, 0, 3, false, {}).item, first, 'first equal-height surface wins');
// Cell boundaries, rotated footprint edges, drop/step limits and underground feet.
const feet = [-Infinity, -50, -20, -8, -6.45, -6.449999, -0.45, 0, 2.549999, 2.55, 3, 5, 50, Infinity];
for (let i = 0; i < 4000; i++) {
  const x = i % 4 ? random() * 200 - 100 : (i % 25 - 12) * 8 + [0, -0.01, 0.01][i % 3];
  const z = i % 5 ? random() * 200 - 100 : (i % 25 - 12) * 8;
  compare(ph, x, z, feet[i % feet.length], !!(i % 2), !!(i % 3), [0, 0.001, 0.4, 8][i % 4]);
}
// Floors and conveyor properties remain live, not copied into the index.
first.top = 2; escalator.yA = -25; escalator.setDir(-1);
compare(ph, 0, 0, 20, false, false);
assert.equal(ph.surfaceAt(0, 0, 20, false, {}).item, second);
assert(ph.remove(second)); assert(!ph.remove(second));
assert.equal(ph.surfaceAt(0, 0, 20, false, {}).item, first);
// Moving/resizing static footprints follows the existing remove-then-insert API.
ph.remove(first); Object.assign(first, { cx: 40, cz: -30, hw: 5, hd: 7 }); ph._insert(first);
moving.cx = -40; moving.cz = 30; ph.refreshDynamic();
for (let i = 0; i < 1000; i++) compare(ph, random() * 200 - 100, random() * 200 - 100, feet[i % feet.length], true, false, 0.4);
// Direct grid clearing and replacement drop filtered cell lists too.
ph.grid.clear(); ph.items.length = 0;
compare(ph, 0, 0, 20, false, false, 0.4);
ph._insert(first); ph.grid = new Map(); ph.items = [];
compare(ph, 40, -30, 20, false, false, 0.4);
ph._insert(first); compare(ph, 40, -30, 20, false, false, 0.4);

console.log(`RESULT: OK - ${comparisons} exact surface/hole queries; equal-height identity, terrain/roof ties, stairs, ramps, conveyors, mutations, removal, dynamic boxes, clearing and re-insertion.`);

const flag = process.argv.indexOf('--items');
if (flag >= 0) {
  const data = JSON.parse(fs.readFileSync(process.argv[flag + 1], 'utf8')), items = Array.isArray(data) ? data : data.items;
  const city = new Physics(() => 0), t0 = performance.now();
  for (const item of items) city._insert(item);
  console.log(`Real population: ${items.length} colliders, ${city.grid.size} cells; indexing ${(performance.now() - t0).toFixed(1)} ms.`);
  const surfaces = items.filter(isSurface), boxes = { centre: [0, 0, 1200, 700], island: [-5900, -1300, 3200, 2000] };
  const probes = [];
  for (let i = 0; i < 30000; i++) {
    if (i % 3 === 0 && surfaces.length) {
      const a = surfaces[Math.floor(random() * surfaces.length)], x = (random() - 0.5) * a.hw * 2, z = (random() - 0.5) * a.hd * 2;
      probes.push([a.cx + x * a.c + z * a.s, a.cz - x * a.s + z * a.c, i % 4 ? 0.6 : 1e9]);
    } else {
      const [x, z, w, d] = i % 2 ? boxes.centre : boxes.island;
      probes.push([x + (random() - 0.5) * w, z + (random() - 0.5) * d, 0.6]);
    }
  }
  for (let i = 0; i < probes.length; i++) compare(city, ...probes[i], !!(i % 2), !!(i % 3));
  // Use an inherited view of the same real population for the old query path;
  // neither measured loop patches methods or includes assertion/IO overhead.
  const old = Object.create(city); old._querySurfaces = city._query;
  let sink = 0;
  const bench = object => { const start = performance.now(); for (const [x, z, y] of probes) { const hit = object.surfaceAt(x, z, y, false); if (Number.isFinite(hit.y)) sink += hit.y; } return performance.now() - start; };
  bench(old); bench(city);
  const before = [], after = [];
  for (let i = 0; i < 5; i++) { if (i % 2) { after.push(bench(city)); before.push(bench(old)); } else { before.push(bench(old)); after.push(bench(city)); } }
  before.sort((a, b) => a - b); after.sort((a, b) => a - b);
  let refs = 0, surfaceRefs = 0, cells = 0;
  for (const row of city.grid.values()) { refs += row.length; if (row.surfaces) { cells++; surfaceRefs += row.surfaces.length; } }
  assert(Number.isFinite(sink));
  console.log(`RESULT: OK - ${probes.length} real-population queries match exactly; median ${before[2].toFixed(1)} -> ${after[2].toFixed(1)} ms (${(before[2] / after[2]).toFixed(2)}x).`);
  console.log(`Surface index: ${surfaces.length} items; ${surfaceRefs} additional references in ${cells} existing cells (full grid ${refs} references); no duplicate collider records or key map.`);
}
