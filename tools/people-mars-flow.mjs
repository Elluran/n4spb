// Debug aid: how do walkers get into the Mars zones?  tools/people-test.mjs --eval tools/people-mars-flow.mjs (env AT=x,z SEC=60)
export default async function (ctx, L) {
  const [px, pz] = (process.env.AT || '-1190,-1330').split(',').map(Number), SEC = Number(process.env.SEC || 60);
  const sim = ctx.services.people.sim, nav = sim.nav, upd = ctx._updates;
  const prev = sim.agents.map((a) => ({ z: a.hidden ? -2 : nav.marsZone(a.x, a.z), rec: a.recycled | 0 + (a.leader ? (a.leader.recycled | 0) : 0) })), enter = {};
  const dt = 0.1;
  for (let i = 1; i <= SEC / dt; i++) {
    const t = i * dt; ctx.time = t; ctx.shared.uTime.value = t; ctx.player.position.set(px, 0, pz); ctx.camera.position.set(px, 1.7, pz); ctx.camera.updateMatrixWorld(true); for (const f of upd) f(dt, t);
    sim.agents.forEach((a, k) => { const p = prev[k]; const z = a.hidden ? -2 : nav.marsZone(a.x, a.z); const rec = (a.recycled | 0) + (a.leader ? (a.leader.recycled | 0) : 0);
      if (z >= 0 && p.z !== z && p.z !== -2 && !/^(field|flame|suvorov|marble|trinity|swan|garden|krylov|castle)/.test(a.scene)) { const key = 'zone' + z + ' <- ' + (rec !== p.rec ? 'RECYCLE' : 'walk') + ' goal=' + (a.goal && a.goal.type) + ' kind=' + a.kind + ' prevzone=' + p.z + (a.leader ? ' follower' : ''); enter[key] = (enter[key] || 0) + 1; if (a.goal && a.goal.node !== undefined && !a.leader && (enter.dbg = (enter.dbg || 0) + 1) < 25) { const g = a.goal.node; console.log('  enter', a.scene, 'at', a.x.toFixed(0), a.z.toFixed(0), 'goal node', Math.round(sim.nav.N.x[g]), Math.round(sim.nav.N.z[g]), 'zone(goal,40)', nav.marsZone(sim.nav.N.x[g], sim.nav.N.z[g], 40), 'zone(goal)', nav.marsZone(sim.nav.N.x[g], sim.nav.N.z[g]), 'rt', a.rt && a.rt.n, 't', t.toFixed(0)); } }
      p.z = z; p.rec = rec; });
  }
  console.log('entries into the zones in', SEC, 's:'); for (const [k, v] of Object.entries(enter).sort((a, b) => b[1] - a[1])) console.log('  ', v, k);
}
