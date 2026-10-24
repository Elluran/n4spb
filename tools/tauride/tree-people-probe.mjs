// tree-people-probe.mjs - do the pedestrians of the North see the trunks of the Tauride Garden's trees (docs/TAURIDE-REMAKE.md T5, item 5)? The --eval script of tools/people-test.mjs:
//   node tools/area.mjs north tools/people-test.mjs --at tauride --eval tools/tauride/tree-people-probe.mjs [--seconds 60] [--spots a,b,...]
// The script receives the built ctx (environment, streets, city, landmarks incl. landmarksTauride, people). The trunks are cylinder colliders of the module (vegetation.js: y0 below the street, y1 at the crown base), and people/nav.js takes
// every cylinder with y0 < 1.7 as an obstacle: (1) every trunk of the garden in the play area is an obstacle of the nav (nav.obstDist at the trunk axis is negative or zero: inside); (2) no nav node stands inside a trunk; (3) over the run
// no visible walker within 150 m of the spot stands inside a trunk (the axis distance below the trunk radius, 0 samples); (4) walkers were seen within 3.5 m of a trunk at all (the probe proves something: the walkers pass the trees, not
// through them; the trunks stand 1.5 m + their radius off the ribbon edges, so a walker on an alley is 2 .. 4 m from the nearest trunk surface). The default is 4 spots x 60 s = 4 simulated minutes.
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export default async function (ctx, L, THREE) {
  const argv = process.argv, opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const SEC = Number(opt('seconds', 60)), sim = ctx.services.people.sim, upd = ctx._updates, dt = 1 / 60, every = 60, nav = sim.nav;
  const T = ctx.services.landmarksTauride?.trees; if (!T) { console.log('RESULT: FAIL (no trees service: landmarksTauride not built?)'); process.exit(1); }
  const trunks = T.list.filter((t) => L.inPlay(t.x, t.z, -5)), TC = 8, grid = new Map(), gk = (i, j) => i * 100003 + j;
  for (const t of trunks) { const k = gk(Math.floor(t.x / TC), Math.floor(t.z / TC)); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(t); }
  const nearTrunk = (x, z, m) => { let best = null, bd = Infinity; const ci = Math.floor(x / TC), cj = Math.floor(z / TC); for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) for (const t of grid.get(gk(i, j)) || []) { const d = Math.hypot(t.x - x, t.z - z) - t.tr; if (d < bd) { bd = d; best = t; } } return bd <= m ? { t: best, d: bd } : null; };
  // (1) the trunks are obstacles of the nav: nav.obstDist at the axis of every trunk is at most 0 (inside an obstacle)
  let notObst = 0; for (const t of trunks) { const d = nav.obstDist(t.x, t.z, 2); if (!(d <= 1e-6)) notObst++; }
  console.log(`trunks in the play area: ${trunks.length}; nav.obstDist at the axis <= 0 (an obstacle) for ${trunks.length - notObst}, NOT an obstacle for ${notObst}`);
  // (2) no nav node inside a trunk
  const N = nav.N || nav.nodes; let nodesIn = 0, nodesNear = 0; const bad = [];
  if (N && N.x) for (let i = 0; i < N.x.length; i++) { const x = N.x[i], z = N.z[i]; if (!(x > 900 && x < 1510 && z > -1800 && z < -1250)) continue; const h = nearTrunk(x, z, 2); if (!h) continue; nodesNear++; if (h.d < 0) { nodesIn++; if (bad.length < 5) bad.push({ x: +x.toFixed(2), z: +z.toFixed(2), d: +h.d.toFixed(2), k: N.k ? N.k[i] : '?' }); } }
  console.log(`nav nodes within 2 m of a trunk: ${nodesNear}, inside a trunk: ${nodesIn} ${JSON.stringify(bad)}`);
  // (3) + (4) the walkers
  const SPOTS = [['gate', 1226, -1285], ['belt-sw', 960, -1300], ['central', 1130, -1455], ['island', 1368, -1471]], only = opt('spots', null) ? String(opt('spots')).split(',') : null;
  let t = 0, samples = 0, near2 = 0, inside = 0; const insideAt = [], rows = [];
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
        n++; samples++;
        const h = nearTrunk(a.x, a.z, 3.5); if (!h) continue;
        nb++; near2++;
        if (h.d < -0.05) { w++; inside++; if (insideAt.length < 8) insideAt.push({ spot: name, x: +a.x.toFixed(2), z: +a.z.toFixed(2), d: +h.d.toFixed(2), kind: a.kind, speed: +(a.speed || 0).toFixed(2) }); }
      }
    }
    rows.push(`  ${name.padEnd(10)} (${sx}, ${sz}) ${SEC} s: ${n} walker samples within 150 m, ${nb} within 3.5 m of a trunk, ${w} INSIDE a trunk`);
  }
  console.log(`tree people probe: ${t.toFixed(0)} simulated seconds`); for (const r of rows) console.log(r);
  console.log(`walkers: ${samples} samples, ${near2} within 3.5 m of a trunk, ${inside} inside a trunk (axis distance below the trunk radius - 5 cm) ${JSON.stringify(insideAt)}`);
  const ok = trunks.length > 500 && notObst === 0 && nodesIn === 0 && samples > 100 && near2 > 20 && inside === 0;
  console.log(ok ? 'RESULT: OK' : notObst ? 'RESULT: FAIL (a trunk is not an obstacle of the nav)' : nodesIn ? 'RESULT: FAIL (a nav node stands inside a trunk)' : near2 <= 20 ? 'RESULT: FAIL (no walker was seen near a trunk: the probe proves nothing)' : 'RESULT: FAIL (a walker stood inside a trunk)');
  process.exit(ok ? 0 : 1);
}
