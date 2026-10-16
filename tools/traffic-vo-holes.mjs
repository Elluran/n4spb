// Static check (no GPU, no simulation) that no driven lane of the lane graph leads a car over a hole on Vasilievsky Island: every lane / connector point (rank >= 1, every 2 m) that lies over
// water (layout.inRiver) must have a bridge deck under it (services.bridges.deckY, or the Shkipersky deck of landmarksGavan) - else a car would drive on the water.
// It also lists, per island bridge, the lanes that cross it (count, metres) so that the new bridges (Blagoveshchensky, Uralsky, Smolensky, Nalichny, Korablestroiteley, the mouth bridges) are
// seen to carry traffic or none. Usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/traffic-vo-holes.mjs [--list]      exit code 1 on a hole.
import { world, flag } from './traffic-harness.mjs';

const BUILD = (process.env.TRAFFIC_BUILDLIST || 'environment,streets,bridges,landmarksGavan').split(',');
const { ctx, L } = await world(BUILD, { tolerant: true });
const st = ctx.services.streets, B = ctx.services.bridges;
if (!st || !st.lanes || !B || !B.deckY) { console.log('RESULT: FAIL (streets / bridges did not build)'); process.exit(1); }
const deck = (x, z) => { const y = B.deckY(x, z); return y === null || y === undefined ? null : y; };
const onIsland = (x, z) => x < -2400 && L.inPlay(x, z, 0);
const holes = new Map(), over = new Map();
const sample = (id, kind, name, pts) => {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n;
      if (!onIsland(x, z)) continue;
      if (L.inRiver(x, z)) {
        const y = deck(x, z);
        if (y === null) { const h = holes.get(id) || holes.set(id, { kind, name, n: 0, x, z }).get(id); h.n++; }
        else { const o = over.get(id) || over.set(id, { kind, name, n: 0, x, z }).get(id); o.n++; }
      }
    }
  }
};
for (const l of st.lanes) if (l.rank > 0 && l.pts && l.pts.length > 1) sample(l.id, 'lane', l.name || '', l.pts);
const rankOf = new Map(); for (const l of st.lanes) rankOf.set(l.id, Math.max(rankOf.get(l.id) || 0, l.rank || 0));
for (const c of st.connectors || []) if (c.pts && c.pts.length > 1 && rankOf.get(c.from) > 0 && rankOf.get(c.to) > 0) sample(c.id, 'conn', '', c.pts);        // (service links are never driven by traffic/sim.js)
console.log('lane / connector points over water WITH a deck:', over.size, 'lanes', [...over.values()].reduce((a, o) => a + o.n, 0), 'samples');
if (flag('list', false)) for (const [id, o] of over) console.log('  deck', o.kind, id, o.name, 'x,z', Math.round(o.x) + ',' + Math.round(o.z), 'n', o.n);
console.log('lane / connector points over water WITHOUT a deck (holes):', holes.size);
for (const [id, o] of holes) console.log('  HOLE', o.kind, id, o.name, 'x,z', Math.round(o.x) + ',' + Math.round(o.z), 'samples', o.n);
const byBridge = {};
for (const [id, o] of over) { const best = (B.list || []).map((b) => [Math.hypot(b.x - o.x, b.z - o.z), b.id || b.name]).sort((p, q) => p[0] - q[0])[0]; const k = best && best[0] < 260 ? best[1] : 'other'; (byBridge[k] ||= { lanes: 0, m: 0 }); byBridge[k].lanes++; byBridge[k].m += o.n * 2; }
console.log('driven lanes per bridge (nearest bridge anchor):', JSON.stringify(byBridge));
console.log(holes.size ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(holes.size ? 1 : 0);
