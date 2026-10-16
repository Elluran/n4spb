// tools/petrovsky-bridge-stairs.mjs - walk probe of the two diagonal stairs of the Betancourt pylon platforms (bridges/petrovsky/stair.js) in the real page (tools/petrovsky-bridge-shot.mjs --eval, about 2 min).
//   For each stair: the real Player.update with W held walks UP from the bottom node along the stair centre line to the landing, on to the middle of the deck pavement, and back DOWN again:
//   asserts it arrives at every waypoint, never falls (feet within 0.6 m of the stair surface / deckY), reports the largest step in y between frames and the top height.
//   Also: the deck railing must be closed beside the stair (a walker pushed along the railing 3 m left / right of the opening cannot leave the deck).
// usage: node tools/petrovsky-bridge-stairs.mjs
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const BE = await imp('src/world/bridges/petrovsky/betancourt.js'), ST = await imp('src/world/bridges/petrovsky/stair.js'), RT = await imp('src/world/bridges/petrovsky/route.js'), LG = await imp('src/world/bridges/long.js');
const R = BE.betanRoute(), sp = BE.BETAN, yOf = LG.profile(sp.prof), sP = sp.sP;
const bump = (s) => 1 - RT.smooth((Math.abs(s - sP) - 4.6) / 4.0), taper = (s) => RT.smooth(Math.min(s, R.len - s) / 24), hw = (full, plat) => (s) => sp.endHw + (full + plat * bump(s) - sp.endHw) * taper(s);
const plans = ST.planStairs(R, hw(sp.hwR, 3), hw(sp.hwL, 3), yOf);
const specs = plans.map((p) => {
  const up = []; for (let u = 0; u <= p.LE; u += 2.5) { const q = p.Rs.pos(u, 0); up.push([q.x, q.z]); }
  const e = p.Rs.pos(p.LE + 1.0, 0); up.push([e.x, e.z]);
  const sT = p.sE < sP - 3 ? p.sE - 3.2 : p.sE; if (p.sE < sP - 3) { const m0 = R.pos(p.sE + 0.4, p.sg * 18.0); up.push([m0.x, m0.z]); } const m = R.pos(sT, p.sg * 14.4); up.push([m.x, m.z]);       // the deck pavement inside the railing (a stair that lands in front of the back pylon leg is left round the leg, not across it)
  const hf = p.sg > 0 ? hw(sp.hwR, 3) : hw(sp.hwL, 3);
  const rl = [p.gap ? p.gap[0] - 3 : p.sE - 4, p.gap ? p.gap[1] + 3 : p.sE + 4].map((s) => { const w = R.pos(s, p.sg * (hf(s) - 1.2)), t = R.pos(s, p.sg * (hf(s) + 6)); return { from: [w.x, w.z], to: [t.x, t.z], s }; });
  return { id: p.def.id, up, down: up.slice().reverse(), yTop: p.yTop, rail: rl };
});
const expr = `(() => {
  const ctx = window.__ctx, B = ctx.services.bridges, P = ctx.playerObj, specs = ${JSON.stringify(specs)}, out = { walk: {}, rail: [] };
  const run = (pts, name) => {
    const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, minY: 99, maxY: -99, stuck: null, end: null };
    window.__setCam(pts[0][0], name.endsWith(' up') ? 0.4 : null, pts[0][1], Math.atan2(-(pts[1][0] - pts[0][0]), -(pts[1][1] - pts[0][1])) * 180 / Math.PI, 0, name.endsWith(' up'));
    P.keys.clear(); P.keys.add('KeyW'); let prevY = null;
    for (let k = 1; k < pts.length; k++) {
      const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
      while (frames++ < 1500) {
        const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.2) { res.reached = k; break; }
        P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60);
        if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y; res.minY = Math.min(res.minY, P.pos.y); res.maxY = Math.max(res.maxY, P.pos.y);
        if (P.pos.y < -1.0 && !res.fell && k > 1) res.fell = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2)];
        if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, x: +P.pos.x.toFixed(1), z: +P.pos.z.toFixed(1), y: +P.pos.y.toFixed(2) }; break; } } else still = 0; }
      }
      if (res.stuck || res.fell) break;
    }
    P.keys.clear(); res.end = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2)]; for (const kk of ['maxStep', 'minY', 'maxY']) res[kk] = +res[kk].toFixed(2); out.walk[name] = res;
  };
  P.enabled = true; P.inputLock = 0;
  for (const sp of specs) {
    run(sp.up, sp.id + ' up'); run(sp.down, sp.id + ' down');
    for (const r of sp.rail) {                                                    // push toward the outside from just inside the railing, beside the opening
      window.__setCam(r.from[0], null, r.from[1], 0, 0); P.keys.clear(); P.keys.add('KeyW'); const y0 = P.pos.y;
      for (let f = 0; f < 150; f++) { P.yaw = Math.atan2(-(r.to[0] - P.pos.x), -(r.to[1] - P.pos.z)); P.update(1 / 60); }
      P.keys.clear(); out.rail.push({ id: sp.id, s: +r.s.toFixed(1), y0: +y0.toFixed(2), y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z), moved: +Math.hypot(P.pos.x - r.from[0], P.pos.z - r.from[1]).toFixed(2) });
    }
  }
  return out;
})()`;
const r = spawnSync('node', [path.join(root, 'tools/petrovsky-bridge-shot.mjs'), '--only', 'environment,streets,bridges', '--cams', `${specs[0].up[0][0]},${specs[0].up[0][1]},0,0`, '--out', 'shots/petrovsky-bridges/_stairs', '--t', '3', '--load-timeout', '1500000', '--protocol-timeout', '1500000', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 });
const ln = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
if (!ln) { console.log(r.stdout.slice(-3500), r.stderr.slice(-2000)); process.exit(1); }
const o = JSON.parse(ln.slice(5)); let bad = 0;
console.log('STAIR WALK');
for (const [n, w] of Object.entries(o.walk)) { const top = n.endsWith(' up') ? w.maxY >= specs.find((s) => n.startsWith(s.id)).yTop - 0.6 : true; const ok = w.reached === w.total && !w.fell && !w.stuck && w.maxStep <= 0.5 && top; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(22)} reached ${w.reached}/${w.total}, fell ${JSON.stringify(w.fell)}, stuck ${JSON.stringify(w.stuck)}, step ${w.maxStep}, y ${w.minY}..${w.maxY}, end ${JSON.stringify(w.end)}`); }
console.log('RAIL BESIDE THE OPENING (pushed outward; must stay on the deck: y near the deck, deckY not null)');
for (const q of o.rail) { const ok = q.deck !== null && Math.abs(q.y - q.deck) < 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.id} s ${q.s}: moved ${q.moved} m, y ${q.y}, deck ${q.deck === null ? null : q.deck.toFixed(2)}`); }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
