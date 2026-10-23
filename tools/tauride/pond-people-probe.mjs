// pond-people-probe.mjs - do the pedestrians of the North treat the Tauride ponds as water, and do they stand on the banks? (docs/TAURIDE-REMAKE.md T4a, item 4). The --eval script of tools/people-test.mjs:
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/pond-people-probe.mjs [--seconds 75] [--spots a,b,...]
// The script receives the built ctx (environment, streets, city, landmarks incl. landmarksTauride, people). For each spot it puts the player there, drives the simulation (60 Hz, the game's frame rate) and once per simulated second
// looks at every visible walker within 150 m. PASS (RESULT: OK) when (1) not one walker in the whole run stands in the water (exact shore distance < 0, 0 samples), (2) no nav node lies in the water (more than 0.5 m inside the outline: the field's water mask is a 1 m raster; the one node that does lie 0.29 m inside is the end of way w112856742, which the data itself ends in the water, see the T3 log), (3) the walkers on the
// banks (on land within BANK reach of the shore, ground more than 6 cm below the street) stand on the terrain (|y - (ground + 0.02)| <= 0.15 for 90 % of the standing samples; the groundY lag of people/sim.js eases 40 % per update, see the T2 log),
// (4) the walkers were seen near the water at all (the probe proves something). The default is 4 spots x 75 s = 5 simulated minutes.
// T4b: the bridge decks cross the water: a nav node or a walker over the water is allowed ON a deck (the service's bridges.deckY answers there) and nowhere else; (5) every nav node on a deck carries deckY + WALK_LIFT (+-5 cm), (6) a standing
// walker on a deck stands on deckY + WALK_LIFT within 0.1 m, (7) walkers were seen on a deck at all; fix round 1: (8) every bridge site has a route of the walkers' graph from axis end to axis end with a node over the water on the deck,
// (9) walkers were seen on a deck OVER the water (the nav water exemption of the decks: a mutant without it keeps (5)-(7) green on the land approaches and turns (8) and (9) red).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const GH = await import(pathToFileURL(path.join(process.cwd(), 'src/world/landmarksTauride/height.js')).href);
  const BD = await import(pathToFileURL(path.join(process.cwd(), 'src/world/landmarksTauride/data/bridge-design.js')).href);
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 75)), sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60, shore = GH.GARDEN_SHORE, BANK = GH.pondReach().land;
  const deckY = ctx.services.landmarksTauride?.bridges?.deckY || (() => null), LIFT = BD.WALK_LIFT;
  const SPOTS = [['gate', 1226, -1285], ['lake-west', 1285, -1500], ['memorial', 1368, -1471], ['west-pond', 1105, -1600]], only = opt('spots', null) ? String(opt('spots')).split(',') : null;
  let t = 0, samples = 0, seen = 0, inWater = 0, nearWater = 0, onBank = 0, bankStand = 0, bankStandBad = 0, worst = 0, worstAt = null, onDeck = 0, deckWet = 0, deckStand = 0, deckStandBad = 0, deckWorst = 0; const waterAt = [], eAll = [], eDeck = [];
  const nodesInWater = (() => { const N = sim.nav.N || sim.nav.nodes; let n = 0, w = 0, deck = 0, deckBad = 0; const list = []; if (N && N.x) for (let i = 0; i < N.x.length; i++) { const x = N.x[i], z = N.z[i]; if (!(x > 1000 && x < 1500 && z > -1740 && z < -1260)) continue; n++; const dk = deckY(x, z); if (dk !== null) { deck++; if (N.y && Math.abs(N.y[i] - (dk + LIFT)) > 0.05) deckBad++; } if (shore.dist(x, z) < -0.5 && dk === null) { w++; if (list.length < 5) list.push({ x: +x.toFixed(2), z: +z.toFixed(2), d: +shore.dist(x, z).toFixed(2), k: N.k ? N.k[i] : '?', y: N.y ? +N.y[i].toFixed(2) : '?' }); } } return { n, w, deck, deckBad, list }; })();
  console.log(`nav nodes in the garden box: ${nodesInWater.n}, in the water off a deck: ${nodesInWater.w} ${JSON.stringify(nodesInWater.list)}; on a bridge deck: ${nodesInWater.deck}, of them off deckY + ${LIFT} by more than 5 cm: ${nodesInWater.deckBad}`);
  // T4b fix round 1 (the lens finding): the CROSSING is pinned, not the presence on a deck: (8) for every bridge site the walkers' graph routes from the axis end A to the axis end B and the route has a node over the water on a deck;
  // (9) walkers were seen on a deck OVER the water (exact shore distance < 0). With the water exemption of people/nav.js (`water()`: a service deck is not water) deleted, the walkway nodes still stand on the approaches and over
  // the water (they are added without a water test), only the EDGES over the water fail edgeOK: nodes and walkers "on a deck" then still count on the land approaches, and only a route check or a wet sample turns red.
  const sites = ctx.services.landmarksTauride?.bridges?.sites || [], nav = sim.nav, NN = nav.N || nav.nodes, crossRows = []; let crossBad = 0;
  for (const s of sites) {
    const a = nav.nearestNode(s.ends.a.x, s.ends.a.z, 6), b = nav.nearestNode(s.ends.b.x, s.ends.b.z, 6), r = a >= 0 && b >= 0 ? nav.route(a, b) : null;
    const wet = r ? r.filter((id) => shore.dist(NN.x[id], NN.z[id]) < 0 && deckY(NN.x[id], NN.z[id]) !== null).length : 0;
    if (!r || wet === 0) crossBad++; crossRows.push(`${s.site} ${r ? r.length + ' nodes, ' + wet + ' over the water on the deck' : 'NO ROUTE'}`);
  }
  console.log(`the crossings (T4b fix 1): ${sites.length} sites, ${crossBad} without a route over the water from axis end to axis end: ${crossRows.join('; ')}`);
  const rows = [];
  for (const [name, sx, sz] of SPOTS) {
    if (only && !only.includes(name)) continue;
    let n = 0, w = 0, nb = 0;
    for (let i = 1; i <= Math.round(SEC / dt); i++) {
      t += dt; ctx.time = t; ctx.shared.uTime.value = t;
      ctx.player.position.set(sx, 0, sz); ctx.camera.position.set(sx, 1.7, sz); ctx.camera.updateMatrixWorld(true);
      for (const fn of upd) fn(dt, t);
      if (i % every) continue;
      for (const a of sim.agents) {
        if (a.hidden || a.ug) continue;
        if (Math.hypot(a.x - sx, a.z - sz) > 150) continue;
        const d = shore.dist(a.x, a.z); if (Math.abs(d) >= BANK + 1.9) continue;
        n++; samples++;
        const dk = deckY(a.x, a.z);
        if (dk !== null) { onDeck++; if (d < 0) deckWet++; const e = a.y - (dk + LIFT); eDeck.push(Math.abs(e)); if (a.speed < 0.05) { deckStand++; if (Math.abs(e) > 0.1) deckStandBad++; } if (Math.abs(e) > Math.abs(deckWorst)) deckWorst = e; continue; }     // T4b: on a bridge deck (over the water or on its approach): the feet on deckY + WALK_LIFT
        if (d < 0) { w++; inWater++; if (waterAt.length < 8) waterAt.push({ spot: name, x: +a.x.toFixed(1), z: +a.z.toFixed(1), d: +d.toFixed(2), kind: a.kind }); continue; }
        if (d < 3) nearWater++;
        const g = GH.gardenHeight(a.x, a.z); if (!(g !== null && g < -0.06)) continue;
        onBank++; nb++;
        const e = a.y - (g + 0.02); eAll.push(Math.abs(e));
        if (a.speed < 0.05) { bankStand++; if (Math.abs(e) > 0.15) bankStandBad++; }
        if (Math.abs(e) > Math.abs(worst)) { worst = e; worstAt = { x: +a.x.toFixed(1), z: +a.z.toFixed(1), g: +g.toFixed(2), y: +a.y.toFixed(2), speed: +(a.speed || 0).toFixed(2) }; }
      }
    }
    rows.push(`  ${name.padEnd(10)} (${sx}, ${sz}) ${SEC} s: ${n} walker samples within ${BANK + 2} m of the shore, ${w} in the water, ${nb} on a bank below the street`);
  }
  console.log(`pond people probe: ${t.toFixed(0)} simulated seconds`); for (const r of rows) console.log(r);
  const pc = (v, q) => { const x = v.slice().sort((p, r) => p - r); return x.length ? x[Math.min(x.length - 1, Math.floor(q * x.length))].toFixed(3) : '-'; };
  console.log(`walkers within the bank reach: ${samples} samples, ${nearWater} within 3 m of the water, ${inWater} IN the water ${JSON.stringify(waterAt)}`);
  console.log(`walkers on a bank (ground below -6 cm): ${onBank} samples; |y - (ground + 0.02)| p50 ${pc(eAll, 0.5)} p90 ${pc(eAll, 0.9)} max ${pc(eAll, 1)}; standing ${bankStand}, off by more than 0.15 m ${bankStandBad}; worst ${worst.toFixed(3)} ${JSON.stringify(worstAt)}`);
  console.log(`walkers on a bridge deck (T4b): ${onDeck} samples, ${deckWet} of them OVER the water; |y - (deckY + ${LIFT})| p50 ${pc(eDeck, 0.5)} p90 ${pc(eDeck, 0.9)} max ${pc(eDeck, 1)}; standing ${deckStand}, off by more than 0.1 m ${deckStandBad}; worst ${deckWorst.toFixed(3)}`);
  const crossOk = sites.length > 0 && crossBad === 0 && deckWet > 0;
  const deckOk = nodesInWater.deck > 0 && nodesInWater.deckBad === 0 && onDeck > 0 && (deckStand === 0 || deckStandBad <= 0.1 * deckStand) && pc(eDeck, 0.9) <= 0.5;
  const ok = inWater === 0 && nodesInWater.w === 0 && samples > 50 && (bankStand === 0 || bankStandBad <= 0.1 * bankStand) && deckOk && crossOk;
  console.log(ok ? 'RESULT: OK' : samples <= 50 ? 'RESULT: FAIL (no walker was seen near the water: the probe proves nothing)' : !crossOk ? 'RESULT: FAIL (T4b: a bridge site has no route over the water from axis end to axis end, or no walker was seen on a deck over the water: the nav water exemption of the decks)' : !deckOk ? 'RESULT: FAIL (T4b: no walker or node on a bridge deck, or one off deckY + WALK_LIFT)' : 'RESULT: FAIL (a walker or a nav node is in the water, or a walker on a bank is off the ground)');
  process.exit(ok ? 0 : 1);
}
