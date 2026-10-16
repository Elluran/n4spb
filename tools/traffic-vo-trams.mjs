// Static check of the trams of Vasilievsky Island (no GPU, no simulation): builds environment + streets, the tram net of traffic/trams.js with its TRAM_LINES, and reports per route
//   * that the route exists (6 and 40, both ways), its length, stops (count, names) and lights;
//   * that no route runs over the yard tracks of the tram museum that carry the static museum cars (landmarksSredny.staticTrams: w420560144 w420560114 w90798881 w90798878 w420560107);
//   * the share of the route that lies under a tram contact wire (streets.wires.tramWires, 5.7 m over the rails): the bridge tracks (Tuchkov, Nalichny) are known to be unwired;
//   * that no stop of a tram route is a bus stop (the sim.js tram-only rule): counts the island stops with tram: 1 and no bus / trolleybus route that buses would still serve.
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/traffic-vo-trams.mjs      exit code 1 when a route is missing or runs over a museum yard track
import { world, imp } from './traffic-harness.mjs';

const { ctx, L } = await world(['environment', 'streets']);
const st = ctx.services.streets;
const T = await imp('src/world/traffic/trams.js'), D = await imp('src/world/data/city.js'), R = await imp('src/world/traffic/region.js');
const stops = D.STATIONS.filter((q) => q.kind === 'tram');
const net = T.buildTramNet(st, { atEdge: (x, z, m = 70) => !L.inExtent(x, z, m), stops });
console.log('tram net', JSON.stringify(net.stats));
let bad = 0;
for (const need of ['6a', '6b', '40a', '40b']) if (!net.routes.some((r) => r.id.endsWith(':' + need))) { console.log('MISSING route', need); bad++; }
const yardIds = new Set(['w420560144', 'w420560114', 'w90798881', 'w90798878', 'w420560107']);
const yard = []; for (const t of st.tram || []) if (yardIds.has(t.id)) for (let i = 0; i < t.pts.length; i += 2) yard.push([t.pts[i], t.pts[i + 1]]);
const wire = new Map(), CS = 8;
for (const w of (st.wires && st.wires.tramWires) || []) for (let i = 0; i + 1 < w.pts.length; i++) {
  const a = w.pts[i], b = w.pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 2));
  for (let k = 0; k <= n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, z = a[2] + (b[2] - a[2]) * k / n, key = Math.floor(x / CS) * 65536 + Math.floor(z / CS); (wire.get(key) || wire.set(key, []).get(key)).push([x, z]); }
}
const wired = (x, z) => { const cx = Math.floor(x / CS), cz = Math.floor(z / CS); for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) for (const p of wire.get(i * 65536 + j) || []) if (Math.hypot(p[0] - x, p[1] - z) < 1.6) return true; return false; };
console.log('tram wires', ((st.wires && st.wires.tramWires) || []).length, 'polylines');
for (const r of net.routes) {
  if (!/^TR[0-9]+:(6|40)/.test(r.id)) continue;
  let yardHit = 0, n = 0, w = 0, island = 0, iw = 0, gap = null; const gaps = [];
  for (let i = 0; i + 1 < r.pts.length; i++) {
    const a = r.pts[i], b = r.pts[i + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (let s = 0; s < len; s += 3) { const x = a[0] + (b[0] - a[0]) * s / len, z = a[1] + (b[1] - a[1]) * s / len; n++; const ww = wired(x, z); if (ww) w++; if (R.inPetro(x, z) && x < -3300) { island++; if (ww) iw++; if (!ww) { if (!gap) gap = { x, z, m: 0 }; gap.m += 3; } else if (gap) { if (gap.m >= 60) gaps.push(gap); gap = null; } } if (yard.some((q) => Math.hypot(q[0] - x, q[1] - z) < 2.5)) yardHit++; }
  }
  if (yardHit) { bad++; console.log('  YARD HIT', r.id, yardHit, 'samples over the museum yard tracks'); }
  if (gap && gap.m >= 60) gaps.push(gap);
  // (the gaps are the Tuchkov and Nalichny deck tracks: streets/wires.js stops at the abutments, the BRIDGES module hangs those wires itself - bridges/long.js, styles5.js - and they are not in streets.wires.tramWires)
  console.log('    island part under a contact wire (streets wires only; bridge decks are wired by the bridges module) ' + (island ? (100 * iw / island).toFixed(0) : '-') + ' %; unwired stretches of 60 m and more on the island: ' + (gaps.map((g) => Math.round(g.m) + ' m from ' + Math.round(g.x) + ',' + Math.round(g.z)).join('; ') || 'none'));
  console.log(`${r.id} ${Math.round(r.len)} m, stops ${r.stops.length}, lights ${r.lights.length}, under a contact wire ${(100 * w / n).toFixed(0)} % (${w}/${n} samples of 3 m), in the extension ${(100 * island / n).toFixed(0)} %`);
  console.log('    ' + r.stops.map((q) => q.name).join(' | '));
}
// tram-only stops of the extension: buses must not serve them (sim.js tramOnly)
const only = (st.busStops || []).filter((b) => b.tram && !(b.routes && ((b.routes.bus && b.routes.bus.length) || (b.routes.trolley && b.routes.trolley.length))) && R.inPetro(b.x, b.z));
console.log('tram-only stops in the extension (skipped by sim.js for buses / trolleybuses):', only.length, 'of', (st.busStops || []).filter((b) => b.tram).length, 'tram-flagged');
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
