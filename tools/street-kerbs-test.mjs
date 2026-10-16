// Exact full-city cold/warm reconstruction, query behavior, and invalid-cache fallback.
import assert from 'node:assert/strict';
import { gzipSync, gunzipSync } from 'node:zlib';
import * as L from '../src/world/layout.js';
import { buildNet, packKerbRuns, hydrateKerbRuns, nearestWay, nearCrossing, wayAt, coverLocal } from '../src/world/streets/net.js';
import { encodeBaked, decodeBaked } from '../src/core/baked-codec.js';
import { installBaker, bakedData } from '../src/core/baked-world.js';

const now = () => performance.now(), timings = {};
let t = now();
const original = buildNet(L);
timings.proceduralBuildMs = now() - t;
const packed = packKerbRuns(original), encoded = encodeBaked(packed), zipped = gzipSync(encoded);
assert(zipped.length < 512 * 1024, 'Kerb cache should remain a small download');
const raw = gunzipSync(zipped);
const decoded = decodeBaked(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
assert.deepEqual(decoded, packed);
t = now();
const hydrated = buildNet(L, decoded);
timings.cachedBuildMs = now() - t;

// Graph equality includes all coordinate values and way/fillet aliases. Query
// caches and their monotonic visit stamps are implementation details, excluded here.
const topologyKeys = ['ways', 'nodes', 'fillets', 'kerbRuns', 'crossings', 'cell', 'restored', 'trimmed', 'slabs', 'medians', 'patches', 'swallowedIslands'];
function equalTopology(a, b) {
  const queue = topologyKeys.map(k => [a[k], b[k]]), forward = new WeakMap(), reverse = new WeakMap();
  while (queue.length) {
    const [x, y] = queue.pop();
    if (x === null || typeof x !== 'object') { assert(Object.is(x, y), `Different topology value: ${x} / ${y}`); continue; }
    assert(y !== null && typeof y === 'object');
    if (forward.has(x)) { assert.equal(forward.get(x), y, 'Lost topology alias'); continue; }
    assert(!reverse.has(y), 'Merged distinct topology objects');
    forward.set(x, y); reverse.set(y, x);
    assert.equal(Object.getPrototypeOf(x), Object.getPrototypeOf(y));
    const keys = Object.keys(x); assert.deepEqual(Object.keys(y), keys);
    for (const k of keys) queue.push([x[k], y[k]]);
  }
}
t = now(); equalTopology(original, hydrated); timings.fullEqualityMs = now() - t;
// Isolate reconstruction from both network building and equality checking.
for (const label of ['coldHydrateMs', 'warmHydrateMs']) {
  const target = { ways: original.ways, fillets: original.fillets, kerbRuns: [] };
  t = now(); hydrateKerbRuns(target, decoded); timings[label] = now() - t;
  assert.equal(target.kerbRuns.length, original.kerbRuns.length);
  for (let i = 0; i < target.kerbRuns.length; i++) {
    const a = target.kerbRuns[i], b = original.kerbRuns[i];
    assert.equal(a.w, b.w); assert.equal(a.fillet, b.fillet); assert.equal(a.side, b.side); assert.equal(a.kind, b.kind);
    assert.deepEqual(a.pts, b.pts);
  }
}

function query(net, x, z, i) {
  const near = nearestWay(net, x, z, [3, 12, 30][i % 3], i % 5), w = near?.w;
  return [
    net.cover(x, z), net.cover(x, z, { skip: w }), net.cover(x, z, { minRank: i % 5, noFillets: !!(i % 2), noBed: true }),
    w && net.cover(x, z, { own: { w, s: w.L * .45, d: 40 } }),
    near && [w.id, near.i, near.q, near.off], nearCrossing(net, x, z, 15)?.id ?? null,
    coverLocal(net, x, z, 5, { ownWay: w })(x + .1, z - .1, w?.L * .45, 40),
  ];
}
t = now();
for (let i = 0; i < 20000; i++) {
  let x = -9920 + (i * 8191.371) % 13140, z = -4380 + (i * 4093.613) % 6250;
  // Half the samples probe actual roads, including kerb/roadway boundaries.
  if (i % 2) {
    const w = original.ways[i % original.ways.length], p = wayAt(w, w.L * ((i % 101) / 100)), offset = (i % 3 - 1) * (p.hR + .1);
    x = p.x - p.tz * offset; z = p.z + p.tx * offset;
  }
  assert.deepEqual(query(hydrated, x, z, i), query(original, x, z, i));
}
timings.queryEqualityMs = now() - t;

const changed = (at, value) => { const runs = decoded.runs.slice(); runs[at] = value; return { ...decoded, runs }; };
const arcAt = decoded.runs.findIndex((v, i) => i % 5 === 1 && v === 2) - 1;
const invalid = [
  null, {}, { ...decoded, format: 2 }, { ...decoded, ways: 0 }, { ...decoded, fillets: 0 },
  { ...decoded, runs: [...decoded.runs] }, { ...decoded, runs: decoded.runs.subarray(1) },
  changed(0, -1), changed(0, original.ways.length), changed(1, 3), changed(2, 0), changed(3, -1), changed(3, 2147483647), changed(4, 1),
  changed(arcAt + 2, -1), changed(arcAt + 2, original.fillets.length), changed(arcAt + 3, 2147483647),
  changed(decoded.runs.length - 1, 2147483647),
];
for (const value of invalid) {
  const before = hydrated.kerbRuns;
  assert.throws(() => hydrateKerbRuns(hydrated, value), /Invalid/);
  assert.equal(hydrated.kerbRuns, before, 'Invalid cache partially replaced live kerbs');
}
let fallbackWarnings = 0;
const warn = console.warn;
try {
  console.warn = (...args) => { assert.match(args.join(' '), /fallback: street-kerbs/); fallbackWarnings++; };
  t = now(); const fallback = buildNet(L, invalid.at(-1)); timings.invalidFallbackBuildMs = now() - t;
  equalTopology(original, fallback);
} finally { console.warn = warn; }
assert.equal(fallbackWarnings, 1);
assert.equal(await bakedData({}, 'street-kerbs'), null, 'No bake uses procedural fallback');
assert.equal(await bakedData({ baked: { load: async () => null } }, 'street-kerbs'), null, 'Legacy manifest uses procedural fallback');

// The nav bake may read only completed private inputs; it never enables a
// partial shipping manifest or streaming. Both assets share one metadata fetch.
const savedFetch = globalThis.fetch, savedLocation = globalThis.location, calls = [];
try {
  globalThis.location = { search: '?bake=nav' };
  globalThis.fetch = async input => {
    const url = String(input); calls.push(url);
    if (url === '/__bake_inputs') return Response.json({ revision: 'test', files: { field: 'field.test.bin.gz', 'street-kerbs': 'street-kerbs.test.bin.gz' } });
    if (url.endsWith('/field.test.bin.gz')) return new Response(gzipSync(encodeBaked({ field: true })));
    if (url.endsWith('/street-kerbs.test.bin.gz')) return new Response(zipped);
    throw Error(`Unexpected fetch ${url}`);
  };
  const ctx = {}; installBaker(ctx);
  assert.deepEqual(await bakedData(ctx, 'field'), { field: true });
  assert.deepEqual(await bakedData(ctx, 'street-kerbs'), decoded);
  await bakedData(ctx, 'street-kerbs');
  assert.equal(calls.length, 3); assert.equal(calls.filter(s => s === '/__bake_inputs').length, 1);
  assert.equal(ctx.baked, undefined); assert.equal(ctx.regions, undefined);
} finally {
  globalThis.fetch = savedFetch;
  if (savedLocation === undefined) delete globalThis.location; else globalThis.location = savedLocation;
}
console.log(JSON.stringify({ runs: original.kerbRuns.length, exactPoints: original.kerbRuns.reduce((n, r) => n + r.pts.length, 0), rawBytes: encoded.length, gzipBytes: zipped.length, malformedCases: invalid.length, ...timings }, null, 2));
console.log('RESULT: OK');
