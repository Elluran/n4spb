// Differential regression: indexed lookups must agree with the original full
// city scan, including height-aware D walls and custom ownership/tolerances.
import assert from 'node:assert/strict';
import { BUILDINGS } from '../src/world/data/city.js';
import * as L from '../src/world/layout.js';
import { ringEdges } from '../src/world/landmarksD/kit.js';
import { edgeStartLookup } from '../src/world/lib/edge-start-lookup.js';

const edges = BUILDINGS.filter(b => !b.skip && !b.dupOf && (b.minH || 0) <= 3 && !b.underground)
  .flatMap(b => b.polys.flatMap(p => ringEdges(p, .3).map(e => ({ id: b.id, h: L.heightOf(b), e }))));
// CONTACT RULE (docs/rules/FACADE-INTEGRITY.md): hidden only where the WHOLE edge touches (1.2 cm) an antiparallel edge of a building at least as tall; o.tol is ignored.
const T9 = [0.02, 0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86, 0.98];
function original(e, selfId, mine, o) {
  for (const t of T9) {
    const x = e.a[0] + (e.b[0] - e.a[0]) * t, z = e.a[1] + (e.b[1] - e.a[1]) * t;
    let touch = false;
    for (const other of edges) {
      if (other.id === selfId) continue;
      if (e.hc != null && other.h < e.hc - .3) continue;
      if (o.neighbours === false && !mine.has(other.id)) continue;
      const f = other.e;
      if (f.n[0] * e.n[0] + f.n[1] * e.n[1] > -.8) continue;
      if (Math.abs(x - f.a[0]) > 90 || Math.abs(z - f.a[1]) > 90) continue;
      const dx = f.b[0] - f.a[0], dz = f.b[1] - f.a[1];
      const u = Math.max(0, Math.min(1, ((x - f.a[0]) * dx + (z - f.a[1]) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - f.a[0] - dx * u, z - f.a[1] - dz * u) < 0.012) { touch = true; break; }
    }
    if (!touch) return false;
  }
  return true;
}
// Inclusive boundaries, negative coordinates, and long edges retain the old
// edge-start restriction (indexing the whole segment would change the scene).
const fixture = [-186, -96, -90, 0, 90, 96, 186].map(x => ({ e: { a: [x, 0], b: [x + 500, 0] } }));
const lookup = edgeStartLookup(fixture);
for (const x of [-96, -90, 0, 90, 96]) assert.deepEqual(new Set(lookup(x, 0)), new Set(fixture.filter(f => Math.abs(x - f.e.a[0]) <= 90)));
const samples = [];
for (let i = 0; i < 300; i++) samples.push(edges[(i * 7919) % edges.length]);
const cases = samples.map((r, i) => {
  const mine = new Set([r.id, edges[(i * 3571) % edges.length].id]);
  return { e: { ...r.e, hc: i % 3 === 0 ? r.h + 5 : r.h }, id: r.id, mine, o: i % 4 === 0 ? { neighbours: false, tol: 1.3 } : i % 4 === 1 ? { tol: .2 } : {} };
});
// synthetic exact party walls (the reversed edge of a real one: touches it everywhere), a 5 cm crack (must NOT count) and a taller facade over a lower neighbour (must not count)
for (let i = 0; i < 60; i++) {
  const r = edges[(i * 104729 + 17) % edges.length], f = r.e, ex = { a: f.b, b: f.a, len: f.len, i: 0, hole: false, n: [-f.n[0], -f.n[1]] };
  const crack = { ...ex, a: [f.b[0] + f.n[0] * .05, f.b[1] + f.n[1] * .05], b: [f.a[0] + f.n[0] * .05, f.a[1] + f.n[1] * .05] };
  cases.push({ e: { ...ex, hc: r.h }, id: 'synthetic', mine: new Set(['synthetic']), o: {} });
  cases.push({ e: { ...crack, hc: r.h }, id: 'synthetic', mine: new Set(['synthetic']), o: {} });
  cases.push({ e: { ...ex, hc: r.h + 6 }, id: 'synthetic', mine: new Set(['synthetic']), o: {} });
}
const expected = cases.map((c) => original(c.e, c.id, c.mine, c.o));
let hits = 0;
for (const name of ['B', 'C', 'D', 'E', 'G', 'J', 'K', 'Mars']) {
  const { sharedWall } = await import(`../src/world/landmarks${name}/house.js`);
  for (const [i, c] of cases.entries()) {
    const result = sharedWall(c.e, c.id, c.mine, c.o);
    assert.equal(result, expected[i], `${name}: ${c.id}, case ${i}`);
    if (result) hits++;
  }
}
assert.ok(hits > 0 && hits < cases.length * 9, 'exercise both shared and exposed walls');
assert.ok(expected.filter(Boolean).length >= 20, 'synthetic exact party walls must be hidden');
console.log(`PASS: ${cases.length * 8} party-wall decisions match the original scan (${edges.length} city edges; ${hits} shared).`);
