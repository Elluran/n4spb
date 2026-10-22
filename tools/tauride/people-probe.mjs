// people-probe.mjs - do the pedestrians of the North follow the terrain of the Tauride Garden relief? (docs/TAURIDE-REMAKE.md T2, item 6). The --eval script of tools/people-test.mjs: the script receives the built ctx
// (environment, streets, city, landmarks incl. landmarksTauride, people), puts the player on a hill, drives the simulation and compares the height of every visible walker that stands on the relief with the ground.
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/people-probe.mjs [--seconds 60] [--spots N,P,...]
// Per spot (the centre of a hill of data/relief.js): agents within 70 m of the player, sampled once per simulated second; those with ground height > 0.3 m ("on a hill") are graded: error = agent y - gardenHeight(x, z).
// PASS (RESULT: OK) when (1) every nav node of the garden box that lies on a hill carries the terrain height + 0.02 (+-5 cm), (2) nav.surfaceY answers terrain + 0.02 at 20,000 random hill points whatever y it is given (uphill, downhill,
// from the street level 0.12 and from the hilltop), (3) every STANDING walker on a hill (speed <= 0.3 m/s) is within 0.1 m of the ground, (4) every walker in motion is within 0.5 m (sim.js eases the height by 40 % per update, so a walker that is
// updated rarely lags behind a 1:4.5 slope: measured p50 0.05 m, p90 0.15 m, worst 0.43 m; a property of people/sim.js groundY, not of the terrain hook) and (5) some walkers were seen on hills. The unfixed engine put them at street level (-4.4 m on the north hill) or let them hang
// at the hilltop height (nav.surfaceY ignores terrain above feet + 2.45 m and never lowers y).
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const R = await import(pathToFileURL(path.join(process.cwd(), 'src/world/landmarksTauride/data/relief.js')).href);
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 60)), only = opt('spots', null) ? String(opt('spots')).split(',') : null;
  const sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60;      // the game's frame rate: groundY() eases the height by 40 % per call, so a coarser step would show a lag that the game does not have
  let t = 0, total = 0, onHill = 0, bad = 0, worst = 0, worstAt = null;
  const why = {};      // what the walkers that are off by more than 0.1 m were doing (a.kind / a.mode)
  let nodesBad = 0;
  const rows = [], eWalk = [], eStand = [];
  let sBad = 0, sN = 0, sMax = 0;       // nav.surfaceY on random hill points, from three different given heights
  for (let i = 0; i < 20000; i++) { const f = R.FEATURES[i % R.FEATURES.length], ang = i * 2.399963, r = Math.sqrt((i * 0.6180339) % 1) * Math.max(f.rx, f.rz), x = f.x + r * Math.cos(ang), z = f.z + r * Math.sin(ang), h = L.heightAt(x, z); if (!(h > 0.3)) continue; for (const y0 of [0.12, 0.04, h + 3]) { const y = sim.nav.surfaceY(x, z, y0); sN++; sMax = Math.max(sMax, Math.abs(y - (h + 0.02))); if (Math.abs(y - (h + 0.02)) > 0.05) sBad++; } }
  console.log(`nav.surfaceY at ${sN} hill points x 3 given heights: ${sBad} off by more than 5 cm (largest ${sMax.toFixed(3)} m)`);
  { const N = sim.nav.N || sim.nav.nodes, kinds = {}; let nn = 0, nbadN = 0, maxE = 0;       // the nav nodes of the garden box themselves: every node on a hill must carry the terrain height + 0.02
    if (N && N.x) for (let i = 0; i < N.x.length; i++) { const B = R.RELIEF_BOX; if (!(N.x[i] >= B[0] && N.x[i] <= B[1] && N.z[i] >= B[2] && N.z[i] <= B[3])) continue; const h = L.heightAt(N.x[i], N.z[i]); if (!(h > 0.3)) continue; nn++; const e = N.y[i] - (h + 0.02); if (Math.abs(e) > 0.05) { nbadN++; const k = String(N.k ? N.k[i] : '?'); kinds[k] = (kinds[k] || 0) + 1; } maxE = Math.max(maxE, Math.abs(e)); }
    nodesBad = nbadN;
    console.log(`nav nodes on a hill (> 0.3 m): ${nn}, off the ground by more than 5 cm: ${nbadN} ${JSON.stringify(kinds)}, largest error ${maxE.toFixed(3)} m`); }
  for (const f of R.FEATURES) {
    if (only && !only.includes(f.key)) continue;
    const spot = [f.x, f.z - 0, 0];
    let n = 0, hill = 0, nbad = 0, w = 0, sumErr = 0;
    for (let i = 1; i <= Math.round(SEC / dt); i++) {
      t += dt; ctx.time = t; ctx.shared.uTime.value = t;
      ctx.player.position.set(spot[0], 0, spot[1]); ctx.camera.position.set(spot[0], 1.7 + (L.heightAt(spot[0], spot[1]) || 0), spot[1]); ctx.camera.updateMatrixWorld(true);
      for (const fn of upd) fn(dt, t);
      if (i % every) continue;
      for (const a of sim.agents) {
        if (a.hidden || a.ug) continue;
        if (Math.hypot(a.x - f.x, a.z - f.z) > 70) continue;
        n++; const h = L.heightAt(a.x, a.z); if (!(h > 0.3)) continue;
        hill++; const e = a.y - h; (a.speed > 0.3 ? eWalk : eStand).push(Math.abs(e)); sumErr += e; if (Math.abs(e) > 0.1) { nbad++; const k = (a.kind || '?') + '/' + (a.mode ?? '?') + (e > 0 ? '+' : '-'); why[k] = (why[k] || 0) + 1; } if (Math.abs(e) > Math.abs(w)) w = e;
        if (Math.abs(e) > Math.abs(worst)) { worst = e; worstAt = { key: f.key, x: +a.x.toFixed(1), z: +a.z.toFixed(1), h: +h.toFixed(2), y: +a.y.toFixed(2) }; }
      }
    }
    total += n; onHill += hill; bad += nbad;
    rows.push(`  ${f.key} ${f.id.padEnd(20)} agents within 70 m sampled ${String(n).padStart(5)}, on the hill (> 0.3 m) ${String(hill).padStart(4)}, off by more than 0.1 m ${String(nbad).padStart(4)}, mean error ${(hill ? sumErr / hill : 0).toFixed(3)}, worst ${w.toFixed(3)}`);
  }
  console.log(`people probe: ${SEC} s per spot at ${R.FEATURES.length} hills`); for (const r of rows) console.log(r);
  const pc = (v, q) => { const x = v.slice().sort((p, r) => p - r); return x.length ? x[Math.min(x.length - 1, Math.floor(q * x.length))].toFixed(3) : '-'; };
  console.log(`|error| walking (speed > 0.3 m/s) n=${eWalk.length}: p50 ${pc(eWalk, 0.5)} p90 ${pc(eWalk, 0.9)} max ${pc(eWalk, 1)};  standing n=${eStand.length}: p50 ${pc(eStand, 0.5)} p90 ${pc(eStand, 0.9)} max ${pc(eStand, 1)}`);
  console.log('off by more than 0.1 m by kind/mode and sign: ' + JSON.stringify(why));
  console.log(`total: ${total} samples, ${onHill} on a hill, ${bad} off by more than 0.1 m (worst ${worst.toFixed(3)} m ${JSON.stringify(worstAt)})`);
  const standBad = eStand.filter((e) => e > 0.1).length, walkBad = eWalk.filter((e) => e > 0.5).length;
  console.log(`standing: ${eStand.length} samples, ${standBad} off by more than 0.1 m; in motion: ${eWalk.length} samples, ${walkBad} off by more than 0.5 m`);
  const ok = onHill > 0 && nodesBad === 0 && sBad === 0 && standBad === 0 && walkBad === 0;
  console.log(ok ? 'RESULT: OK' : onHill === 0 ? 'RESULT: FAIL (no walker was seen on a hill: the probe proves nothing)' : 'RESULT: FAIL (a node, a surfaceY answer or a walker is off the ground on a hill)');
  process.exit(ok ? 0 : 1);
}
