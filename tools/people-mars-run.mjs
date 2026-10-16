// Debug aid: tools/people-test.mjs --eval tools/people-mars-run.mjs  (env AT=x,z SEC=40): place the player, run the simulation for SEC seconds and print the Mars / Garden / castle zone populations by scene
export default async function (ctx, L) {
  const [px, pz] = (process.env.AT || '-1190,-1330').split(',').map(Number), SEC = Number(process.env.SEC || 40);
  const sim = ctx.services.people.sim, nav = sim.nav, upd = ctx._updates;
  const report = (tag) => {
    const by = {}, zs = {};
    for (const a of sim.agents) { if (a.hidden) continue; const k = nav.marsZone(a.x, a.z); if (k < 0) continue; const z = nav.marsCfg.zones[k].name; zs[z] = (zs[z] || 0) + 1; const key = z + ' ' + a.scene; by[key] = (by[key] || 0) + 1; }
    console.log(tag, 'zones', JSON.stringify(zs), 'caps', JSON.stringify(nav.marsCfg.zones.map((z) => z.maxPeople)), 'recycled', sim.recycled);
    console.log('  ', Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + '=' + v).join(' | '));
  };
  report('t=0 (before)');
  const dt = 0.1; for (let i = 1; i <= SEC / dt; i++) { const t = i * dt; ctx.time = t; ctx.shared.uTime.value = t; ctx.player.position.set(px, 0, pz); ctx.camera.position.set(px, 1.7, pz); ctx.camera.updateMatrixWorld(true); for (const f of upd) f(dt, t); if (i === 5 || i === 50) report('t=' + t.toFixed(1)); }
  report('t=' + SEC);
  if (process.env.GOALS) { const h = {}; for (const a of sim.agents) { if (a.hidden) continue; const k = nav.marsZone(a.x, a.z); if (k !== Number(process.env.GOALS)) continue; if (/^(field|flame|suvorov|marble|trinity|swan|garden|krylov|castle)/.test(a.scene)) continue; const g = a.goal; let tz = '-'; const N = nav.N; if (g && g.node !== undefined) tz = 'target-zone' + nav.marsZone(N.x[g.node], N.z[g.node], 40); else if (g && g.p) tz = 'spot-zone' + nav.marsZone(g.p.x, g.p.z, 40); const key = (a.leader ? 'follower' : a.kind) + ' goal=' + (g && g.type) + ' ' + tz + ' rec=' + ((a.recycled | 0) > 0); h[key] = (h[key] || 0) + 1; } console.log('goals of the generic walkers in zone', process.env.GOALS); for (const [k, v] of Object.entries(h).sort((a, b) => b[1] - a[1])) console.log('  ', v, k); }
}
