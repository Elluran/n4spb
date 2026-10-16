// tools/people-cost-ab.mjs - an --eval script of tools/people-test.mjs: the cost of the islands' population at the OLD places, A / B in ONE process (no machine noise between two builds).
//   node tools/people-test.mjs --eval tools/people-cost-ab.mjs                     (builds everything once; ~15 min)
// The sim runs at the player's place (default: the station square, Kazan, Gostiny Dvor, the Palace, the Spit); the agents of the islands (everybody whose zone is an island zone at the start) are PARKED (a.sl = -99: the agent loop of sim.js
// skips them like absent ones) in the B rounds and active in the A rounds; A B A B A B, 150 steps of 0.1 s each after 30 warm-up steps; CPU time of the process (user + system) per step, and the wall time.
// The scan of the agent array stays in both (the parked agents are still iterated: that part of the cost is NOT removed by parking; it is ~0.02 ms per 100 agents).
const PLACES = { station: [592, 165], kazan: [-1469, -300], gostiny: [-1100, -240], palace: [-2010, -770], spit: [-2470, -1318], academy: [-3395, -535] };
export default async function ab(ctx, L, THREE) {
  const P = ctx.services.people, sim = P && P.sim; if (!sim) { console.log('no sim'); return; }
  const nav = sim.nav, base = nav.area && nav.area.islBase, upd = ctx._updates, camera = ctx.camera;
  const isl = base >= 0 ? sim.agents.filter((a) => !a.hidden && nav.marsZone(a.x, a.z) >= base) : [];
  console.log('people', sim.agents.length, 'island agents at the start', isl.length, '(zone base', base + ')');
  { const kinds = {}; let grp = 0, lead = 0, fol = 0, walk = 0; for (const a of isl) { kinds[a.kind] = (kinds[a.kind] || 0) + 1; if (a.leader) fol++; if (a.followers && a.followers.length) lead++; if (a.leader || (a.followers && a.followers.length)) grp++; if (a.kind === 'walk') walk++; } console.log('island agents by kind', JSON.stringify(kinds), '| in groups', grp, '(leaders', lead + ', followers', fol + ')'); }
  const parked = new Map(); for (const a of isl) parked.set(a, a.sl);
  let t = 0; const dt = 0.1;
  const run = (n) => { const c0 = process.cpuUsage(), w0 = performance.now(); for (let i = 0; i < n; i++) { t += dt; ctx.time = t; ctx.shared.uTime.value = t; for (const f of upd) f(dt, t); } const c1 = process.cpuUsage(c0); return { cpu: (c1.user + c1.system) / 1000 / n, wall: (performance.now() - w0) / n }; };
  const park = (on) => { for (const a of isl) a.sl = on ? -99 : (parked.get(a) ?? 0); };
  const only = String(process.env.PLACES || Object.keys(PLACES).join(',')).split(',');
  for (const name of only) {
    const [x, z] = PLACES[name]; ctx.player.position.set(x, 0, z); camera.position.set(x, 1.7, z); camera.updateMatrixWorld(true);
    park(false); run(60);                                          // the mass placement round the new camera + warm-up
    const A = [], B = [];
    for (let rep = 0; rep < 5; rep++) { park(false); run(20); A.push(run(150)); park(true); run(20); B.push(run(150)); }
    park(false);
    const med = (a, k) => a.map((q) => q[k]).sort((p, q) => p - q)[Math.floor(a.length / 2)];
    const mn = (a, k) => Math.min(...a.map((q) => q[k]));
    const ca = med(A, 'cpu'), cb = med(B, 'cpu'), wa = med(A, 'wall'), wb = med(B, 'wall');
    console.log(`  (best of ${A.length}: islands active ${mn(A, 'cpu').toFixed(2)} ms cpu, parked ${mn(B, 'cpu').toFixed(2)}: difference ${(mn(A, 'cpu') - mn(B, 'cpu')).toFixed(2)} ms = ${(100 * (mn(A, 'cpu') - mn(B, 'cpu')) / mn(B, 'cpu')).toFixed(1)} %)`);
    console.log(`${name.padEnd(8)} update callbacks per 0.1 s step: islands active ${ca.toFixed(2)} ms cpu / ${wa.toFixed(2)} ms wall | islands parked ${cb.toFixed(2)} / ${wb.toFixed(2)} | difference ${(ca - cb).toFixed(2)} ms cpu (${(100 * (ca - cb) / cb).toFixed(1)} %)   [A ${A.map((q) => q.cpu.toFixed(1)).join(' ')} | B ${B.map((q) => q.cpu.toFixed(1)).join(' ')}]`);
  }
}
