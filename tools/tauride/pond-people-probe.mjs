// pond-people-probe.mjs - do the pedestrians of the North treat the Tauride ponds as water, and do they stand on the banks? (docs/TAURIDE-REMAKE.md T4a, item 4). The --eval script of tools/people-test.mjs:
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/pond-people-probe.mjs [--seconds 75] [--spots a,b,...]
// The script receives the built ctx (environment, streets, city, landmarks incl. landmarksTauride, people). For each spot it puts the player there, drives the simulation (60 Hz, the game's frame rate) and once per simulated second
// looks at every visible walker within 150 m. PASS (RESULT: OK) when (1) not one walker in the whole run stands in the water (exact shore distance < 0, 0 samples), (2) no nav node lies in the water (more than 0.5 m inside the outline: the field's water mask is a 1 m raster; the one node that does lie 0.29 m inside is the end of way w112856742, which the data itself ends in the water, see the T3 log), (3) the walkers on the
// banks (on land within BANK reach of the shore, ground more than 6 cm below the street) stand on the terrain (|y - (ground + 0.02)| <= 0.15 for 90 % of the standing samples; the groundY lag of people/sim.js eases 40 % per update, see the T2 log),
// (4) the walkers were seen near the water at all (the probe proves something). The default is 4 spots x 75 s = 5 simulated minutes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const GH = await import(pathToFileURL(path.join(process.cwd(), 'src/world/landmarksTauride/height.js')).href);
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 75)), sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60, shore = GH.GARDEN_SHORE, BANK = GH.pondReach().land;
  const SPOTS = [['gate', 1226, -1285], ['lake-west', 1285, -1500], ['memorial', 1368, -1471], ['west-pond', 1105, -1600]], only = opt('spots', null) ? String(opt('spots')).split(',') : null;
  let t = 0, samples = 0, seen = 0, inWater = 0, nearWater = 0, onBank = 0, bankStand = 0, bankStandBad = 0, worst = 0, worstAt = null; const waterAt = [], eAll = [];
  const nodesInWater = (() => { const N = sim.nav.N || sim.nav.nodes; let n = 0, w = 0; const list = []; if (N && N.x) for (let i = 0; i < N.x.length; i++) { const x = N.x[i], z = N.z[i]; if (!(x > 1000 && x < 1500 && z > -1740 && z < -1260)) continue; n++; if (shore.dist(x, z) < -0.5) { w++; if (list.length < 5) list.push({ x: +x.toFixed(2), z: +z.toFixed(2), d: +shore.dist(x, z).toFixed(2), k: N.k ? N.k[i] : '?', y: N.y ? +N.y[i].toFixed(2) : '?' }); } } return { n, w, list }; })();
  console.log(`nav nodes in the garden box: ${nodesInWater.n}, in the water: ${nodesInWater.w} ${JSON.stringify(nodesInWater.list)}`);
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
  const ok = inWater === 0 && nodesInWater.w === 0 && samples > 50 && (bankStand === 0 || bankStandBad <= 0.1 * bankStand);
  console.log(ok ? 'RESULT: OK' : samples <= 50 ? 'RESULT: FAIL (no walker was seen near the water: the probe proves nothing)' : 'RESULT: FAIL (a walker or a nav node is in the water, or a walker on a bank is off the ground)');
  process.exit(ok ? 0 : 1);
}
