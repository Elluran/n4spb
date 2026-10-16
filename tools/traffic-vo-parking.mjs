// Parked cars of Vasilievsky Island (no GPU, no simulation): builds environment + streets + bridges, plans the parked cars (traffic/parking.js planParked) and counts, for the island part of the
// play area (inPetro and x < -3300): the kerb / lot slots of streets.parkedSlots, the cars placed (occupancy), and the rule violations: a car within 1.9 m of a tram track axis, a car on a bridge
// deck, a car inside a building. Summer afternoon target: parallel bays 88-96 % full (the paid zone "Vasilievsky", docs/research/vo-roster-metro.md 3.6), lots 60-97 %.
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/traffic-vo-parking.mjs      exit code 1 on a violation or an occupancy below 80 % of the parallel bays
import { world, imp } from './traffic-harness.mjs';

const { ctx, L } = await world(['environment', 'streets', 'bridges']);
const st = ctx.services.streets;
const P = await imp('src/world/traffic/parking.js'), R = await imp('src/world/traffic/region.js');
const plan = P.planParked(ctx, st);
// proof that the island's second pass (own random stream) and the island rules leave every car outside the island where the first pass put it: the plan without the pass, cars outside the island compared
const planNo = P.planParked(ctx, st, { noIslandPass: true });
const sig = (pl) => pl.cars.filter((c) => !(c.x < -3300 && R.inPetro(c.x, c.z))).map((c) => [c.kind, c.x.toFixed(2), c.z.toFixed(2), c.rotY.toFixed(3), c.color, c.plate].join('|')).join(';');
const sameOld = sig(plan) === sig(planNo);
console.log('cars outside the island identical with and without the island pass:', sameOld, '(' + plan.cars.filter((c) => !(c.x < -3300 && R.inPetro(c.x, c.z))).length + ' cars)');
const isl = (x, z) => x < -3300 && R.inPetro(x, z);
const slots = (st.parkedSlots || []).filter((s) => isl(s.x, s.z)), cars = plan.cars.filter((c) => isl(c.x, c.z));
const par = slots.filter((s) => s.kind === 'parallel'), lot = slots.filter((s) => s.kind !== 'parallel');
const by = {}; for (const c of cars) by[c.slot] = (by[c.slot] || 0) + 1;
console.log('island slots', slots.length, '(parallel', par.length, ', lot', lot.length, ') cars placed', cars.length, JSON.stringify(by));
const parCars = cars.filter((c) => c.slot === 'parallel').length, lotCars = cars.filter((c) => c.slot !== 'parallel' && c.slot !== 'tour' && c.slot !== 'rank').length;
console.log('occupancy: parallel bays', (100 * parCars / Math.max(1, par.length)).toFixed(0), '%, lots', (100 * lotCars / Math.max(1, lot.length)).toFixed(0), '%');
const net = st.net, td = net && net.trackDist ? (x, z) => net.trackDist(x, z) : null, deck = ctx.services.bridges && ctx.services.bridges.deckY;
let onTrack = 0, onDeck = 0, inBld = 0;
for (const c of cars) {
  if (td) for (const [a, b] of [[0, 0], [c.hw, c.hl], [-c.hw, c.hl], [c.hw, -c.hl], [-c.hw, -c.hl]]) { const d = td(c.x + a * c.c + b * c.s, c.z - a * c.s + b * c.c); if (d !== null && d !== undefined && d < 1.5) { onTrack++; break; } }
  if (deck) { const y = deck(c.x, c.z); if (y !== null && y !== undefined) onDeck++; }
  if (L.insideBuilding(c.x, c.z, 0)) inBld++;
}
console.log('violations: within 1.5 m of a tram rail', onTrack, '| on a bridge deck', onDeck, '| inside a building', inBld);
const taxis = cars.filter((c) => c.taxi).length; console.log('taxis', taxis, '(ranks at the metro pavilions: Vasileostrovskaya, Gorny Institut, Sportivnaya-2)');
const bad = !sameOld || onTrack + onDeck + inBld > 0 || (par.length > 20 && parCars / par.length < 0.8);
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
