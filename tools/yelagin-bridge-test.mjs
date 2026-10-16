// tools/yelagin-bridge-test.mjs - walk + drive probe of the 2nd Yelagin Bridge (src/world/bridges/yelagin.js) in the real page (through tools/shot.mjs --eval, one heavy browser job).
//   1. WALK   the real Player.update with W held, yaw pointed at the next waypoint: Yelagin -> Krestovsky and back along the axis and along both railings (v = +-6.5); asserts it arrives, never falls
//             (feet within 0.35 m of services.bridges.deckY over the water) and reports the largest step in y between frames.
//   2. RAIL   from the middle of the deck the walker pushes 4 s toward each side: it must stop at the railing (|v| <= 7.95) and stay on the deck height.
//   3. DECKY  services.bridges.deckY every 2 m along the axis and across (holes / jumps) + a 190 m prefilter entry.
//   4. CAR    the red car (ctx.drive) is driven toward the bridge from 22 m before each end on the axis and on the middle of a bollard gap: the bridge is PEDESTRIAN ONLY (ru.wikipedia, bollards at both mouths),
//             so the car must be stopped by the bollards (never beyond u = -HL + 3 / HL - 3).
// usage: node tools/yelagin-bridge-test.mjs [--nocar] [--nowalk]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const Y = await import('../src/world/bridges/yelagin.js');
const sp = { cx: Y.YEL.cx, cz: Y.YEL.cz, T: (Y.YEL.b - 90) * Math.PI / 180, HL: Y.YEL.len / 2, HW: Y.YEL.hw };
const expr = (mode) => `(() => {
  const sp = ${JSON.stringify(sp)}, MODE = '${mode}', ctx = window.__ctx, B = ctx.services.bridges, out = {};
  const c = Math.cos(sp.T), s = Math.sin(sp.T), W = (u, v) => [sp.cx + u * c - v * s, sp.cz + u * s + v * c], UV = (x, z) => [(x - sp.cx) * c + (z - sp.cz) * s, -(x - sp.cx) * s + (z - sp.cz) * c];
  const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;
  if (MODE === 'walk') {
    const P = ctx.playerObj, L = ctx.L; P.enabled = true; P.inputLock = 0;
    const routes = {};
    const line = (v, a, b) => { const o = []; const n = 8; for (let i = 0; i <= n; i++) o.push(W(a + (b - a) * i / n, v)); return o; };
    routes['axis-south'] = line(0, -sp.HL - 14, sp.HL + 14); routes['axis-north'] = line(0, sp.HL + 14, -sp.HL - 14);
    routes['west-rail-south'] = [W(-sp.HL - 14, 0), ...line(6.5, -sp.HL + 2, sp.HL - 2), W(sp.HL + 14, 0)]; routes['east-rail-north'] = [W(sp.HL + 14, 0), ...line(-6.5, sp.HL - 2, -sp.HL + 2), W(-sp.HL - 14, 0)];
    out.walk = {};
    for (const [name, pts] of Object.entries(routes)) {
      const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, minY: 9, maxY: -9, frames: 0, stuck: null }; let prevY = null;
      window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
      P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
      for (let k = 1; k < pts.length; k++) {
        const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
        while (frames++ < 1500) {
          const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.5) { res.reached = k; break; }
          P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
          const q = UV(P.pos.x, P.pos.z), dy = B.deckY(P.pos.x, P.pos.z);
          if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y; res.minY = Math.min(res.minY, P.pos.y); res.maxY = Math.max(res.maxY, P.pos.y);
          if (dy !== null && Math.abs(q[1]) < sp.HW - 0.2 && Math.abs(q[0]) < sp.HL - 0.5) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+q[0].toFixed(1), +q[1].toFixed(1), +P.pos.y.toFixed(2)]; }
          if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, u: +q[0].toFixed(1), v: +q[1].toFixed(1) }; break; } } else still = 0; }
        }
        if (res.stuck || res.fell) break;
      }
      P.keys.clear(); res.maxStep = +res.maxStep.toFixed(2); res.maxDev = +res.maxDev.toFixed(2); res.minY = +res.minY.toFixed(2); res.maxY = +res.maxY.toFixed(2); out.walk[name] = res;
    }
    // rails: push 4 s toward each side from the middle (and from 25 m north / south of it)
    out.rail = [];
    for (const u0 of [0, -25, 25, Math.round((${PIERS_LIFT}))]) for (const sg of [-1, 1]) {
      const p0 = W(u0, 0); window.__setCam(p0[0], null, p0[1], 0, 0); P.keys.clear(); P.keys.add('KeyW');
      const tgt = W(u0, sg * 14); P.yaw = Math.atan2(-(tgt[0] - p0[0]), -(tgt[1] - p0[1])); P.turn.yaw = 0;
      let maxV = 0; for (let f = 0; f < 240; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.update(1 / 60); maxV = Math.max(maxV, Math.abs(UV(P.pos.x, P.pos.z)[1])); }
      P.keys.clear(); out.rail.push({ u: u0, side: sg, maxV: +maxV.toFixed(2), y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z) });
    }
  }
  if (MODE === 'deck') {
    const holes = [], jumps = []; let prev = null;
    for (let u = -sp.HL; u <= sp.HL; u += 2) { for (const v of [-7.5, -3, 0, 3, 7.5]) { const w = W(u, v), y = B.deckY(w[0], w[1]); if (y === null) holes.push([u, v]); } const w = W(u, 0), y = B.deckY(w[0], w[1]); if (prev !== null && y !== null && Math.abs(y - prev) > 0.25) jumps.push([u, prev, y]); prev = y; }
    const m = W(0, 0); out.deck = { holes: holes.length, jumps, prefilter: B.list.some((b) => (b.x - m[0]) ** 2 + (b.z - m[1]) ** 2 < 190 * 190), entry: B.list.filter((b) => b.id === 'yelagin2').length, masts: B.masts.filter((q) => q.id === 'yelagin2').length, failed: B.failed, per: B.stats.per.yelagin2, bank: ctx.services.bridges.list.find((b) => b.id === 'yelagin2') ? 'listed' : 'missing', info: (ctx.services.yelagin2 && ctx.services.yelagin2.info) || null };
  }
  if (MODE === 'car') {
    const D = ctx.drive; out.car = [];
    for (const dir of [1, -1]) for (const vT of [0, 0.75, 4.5, -4.5, 6.9, -6.9]) {
      const uA = dir > 0 ? -sp.HL - 24 : sp.HL + 24, uB = dir > 0 ? sp.HL + 14 : -sp.HL - 14, p0 = W(uA, vT), yaw = Math.atan2(dir * c, dir * s);
      D.teleport(p0[0], p0[1], yaw);
      const r = { dir, v: vT, maxU: -999, minU: 999, maxY: -9, hits: 0, end: null }; let tt = 0;
      const inp = () => { const car = D.car, q = UV(car.x, car.z), e = dir * (q[1] - vT), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * s + hz * c); return { thr: 1, brk: 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false }; };
      const frames = (i, car) => { const q = UV(car.x, car.z); r.maxU = Math.max(r.maxU, q[0]); r.minU = Math.min(r.minU, q[0]); r.maxY = Math.max(r.maxY, car.y); for (const ev of car.events || []) if (ev.type === 'hit') r.hits++; };
      for (let k = 0; k < 7; k++) D.sim(2, inp, frames);
      const q = UV(D.car.x, D.car.z); r.end = [+q[0].toFixed(1), +q[1].toFixed(1)]; r.progress = dir > 0 ? r.maxU : -r.minU; r.stoppedAt = dir > 0 ? +r.maxU.toFixed(1) : +r.minU.toFixed(1);
      out.car.push(r);
    }
    if (D.active) D.exit(true);
  }
  return out;
})()`;
const PIERS_LIFT = Math.round(Y.PIERS[Y.YEL.lift] + 4);
const run = (mode, only) => {
  const e = expr(mode).replace('${PIERS_LIFT}', String(PIERS_LIFT));
  const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', '-5207.2,1.5,-4837.7,105.8,1.5', '--out', 'shots/yelagin-bridge/_test_' + mode, '--t', '3', '--eval', e], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
  if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
  return JSON.parse(line.slice(5));
};
let bad = 0;
if (!args.nowalk) {
  const w = run('walk', 'environment,streets,city,bridges'); const d = run('deck', 'environment,streets,city,bridges');
  console.log('WALK');
  for (const [n, r] of Object.entries(w.walk)) { const ok = r.reached === r.total && !r.fell && !r.stuck && r.maxDev <= 0.4 && r.maxStep <= 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(16)} reached ${r.reached}/${r.total}, fell ${JSON.stringify(r.fell)}, stuck ${JSON.stringify(r.stuck)}, |y - deckY| <= ${r.maxDev}, largest step ${r.maxStep}, y ${r.minY}..${r.maxY}`); }
  console.log('RAIL (push 4 s toward the side)');
  for (const r of w.rail) { const ok = r.maxV <= 8.1 && r.deck !== null && Math.abs(r.y - r.deck) < 0.4; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} u ${r.u} side ${r.side}: max |v| ${r.maxV}, y ${r.y}, deck ${r.deck === null ? null : r.deck.toFixed(2)}`); }
  console.log('DECKY', JSON.stringify(d.deck)); if (d.deck.holes || d.deck.jumps.length || !d.deck.prefilter || !d.deck.entry) bad++;
}
if (!args.nocar) {
  const c = run('car', 'environment,streets,city,bridges,drive');
  console.log('CAR (pedestrian bridge: bollards must stop the red car)');
  for (const r of c.car) { const ok = r.dir > 0 ? r.maxU < -(Y.YEL.len / 2) + 3 : r.minU > Y.YEL.len / 2 - 3; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} dir ${r.dir} v ${r.v}: reached u ${r.stoppedAt} (bridge ends at +-${(Y.YEL.len / 2).toFixed(1)}), hits ${r.hits}, y max ${r.maxY.toFixed(2)}`); }
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
