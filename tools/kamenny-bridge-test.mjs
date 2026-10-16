// tools/kamenny-bridge-test.mjs - walk + drive probe of the Kamenny Island bridges (src/world/bridges/kamenny.js: Kamennoostrovsky, Ushakovsky and the 13 small canal / pond bridges) in the real page
// (one heavy browser job through tools/shot.mjs --eval; copy of tools/bridges-yelagin-main-test.mjs).
//   1. WALK   the real Player.update with W held toward the next waypoint: the axis both ways, both pavements / sides (big bridges also the kerb line); arrives, never falls (feet within 0.4 m of
//             services.bridges.deckY over the deck), largest step in y between frames.
//   2. RAIL   from the middle (and 20 m either side on the big ones) the walker pushes 4 s toward each side: stops at the railing (|v| <= edge + 0.15) at the deck height.
//   3. DECKY  services.bridges.deckY every 2 m along the axis and across (holes / jumps) + a 190 m prefilter entry (+ masts when the bridge has lamps).
//   4. CAR    the red car (ctx.drive test hooks) drives over every ROAD bridge in both directions on the right lane (big) / the asphalt strip (small): arrives, stays on the roadway (|lateral error| <= 2.5 m),
//             rides the deck within 0.12 m, no step steeper than 8 %, no collision events.  The footbridges (kam2 / kam3 / kam6) are walk-only: the car is not tested there.
// usage: node tools/kamenny-bridge-test.mjs [--nocar] [--nowalk] [--only id,id]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const K = await import(pathToFileURL(path.join(root, 'src/world/bridges/kamenny.js')).href);
const S = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href);
const only = args.only ? new Set(args.only.split(',')) : null;
const FOOT = new Set(['kam2', 'kam3', 'kam6']);
const PRIVATE = new Set(['kam4', 'kam5', 'kam7', 'kamsvc1', 'kamsvc2']);       // access=private plots / service roads: mapped gates and fences stand on their approaches, the car is not tested there (the deck walk is)
const EDGE1 = new Set(['ushakovsky']);                                          // the north end is the edge of the data: the environment's closing wall stands 4 m beyond the deck end (z -5699.1)
const specs = [];
for (const sp of K.BIG) specs.push({ id: sp.id, cx: sp.cx, cz: sp.cz, T: S.frameOf(sp).T, u0: -sp.s0, u1: sp.len + sp.s1, vmin: -sp.hw, vmax: sp.hw, lane: 6.4, big: true, car: true, edge1: EDGE1.has(sp.id) });
for (const sp of K.SMALL) {
  const vmin = Math.min(...sp.strips.map((s) => s[0])), vmax = Math.max(...sp.strips.map((s) => s[1])), as = sp.strips.filter((s) => s[2] === 'asphalt').sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  specs.push({ id: sp.id, cx: sp.cx, cz: sp.cz, T: S.frameOf(sp).T, u0: -sp.len / 2, u1: sp.len / 2, vmin, vmax, lane: as ? (as[0] + as[1]) / 2 : null, big: false, car: !!as && !FOOT.has(sp.id) && !PRIVATE.has(sp.id) && as[1] - as[0] >= 4.0, lamps: !!sp.lamps });
}
const SPECS = specs.filter((q) => !only || only.has(q.id));
const expr = `(() => {
  const SPECS = ${JSON.stringify(SPECS)}, ctx = window.__ctx, B = ctx.services.bridges, out = { walk: {}, rail: [], deck: [], car: [] };
  const P = ctx.playerObj, D = ctx.drive;
  for (const sp of SPECS) {
    const c = Math.cos(sp.T), s = Math.sin(sp.T), W = (u, v) => [sp.cx + u * c - v * s, sp.cz + u * s + v * c], UV = (x, z) => [(x - sp.cx) * c + (z - sp.cz) * s, -(x - sp.cx) * s + (z - sp.cz) * c];
    const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI, vm = (sp.vmin + sp.vmax) / 2, hwv = Math.max(-sp.vmin, sp.vmax);
    ${args.nowalk ? '' : `
    P.enabled = true; P.inputLock = 0;
    const line = (v, a, b) => { const o = []; const n = 8; for (let i = 0; i <= n; i++) o.push(W(a + (b - a) * i / n, v)); return o; };
    const A = sp.u0 - 12, Z = sp.edge1 ? sp.u1 - 0.8 : sp.u1 + 12, routes = {};
    routes['axis-fwd'] = line(vm, A, Z); routes['axis-back'] = line(vm, Z, A);
    routes['left-walk'] = [W(A, vm), ...line(sp.vmin + 1.0, sp.u0 + 2, sp.u1 - 2), W(Z, vm)]; routes['right-walk'] = [W(Z, vm), ...line(sp.vmax - 1.0, sp.u1 - 2, sp.u0 + 2), W(A, vm)];
    if (sp.big) routes['kerb-fwd'] = [W(A, vm), ...line(10.6, sp.u0 + 2, sp.u1 - 2), W(Z, vm)];
    for (const [name, pts] of Object.entries(routes)) {
      const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, frames: 0, stuck: null }; let prevY = null;
      window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
      P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
      for (let k = 1; k < pts.length; k++) {
        const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
        while (frames++ < 1800) {
          const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.5) { res.reached = k; break; }
          P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
          const q = UV(P.pos.x, P.pos.z), dy = B.deckY(P.pos.x, P.pos.z);
          if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y;
          if (dy !== null && q[1] > sp.vmin + 0.2 && q[1] < sp.vmax - 0.2 && q[0] > sp.u0 + 0.5 && q[0] < sp.u1 - 0.5) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+q[0].toFixed(1), +q[1].toFixed(1), +P.pos.y.toFixed(2)]; }
          if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, u: +q[0].toFixed(1), v: +q[1].toFixed(1) }; break; } } else still = 0; }
        }
        if (res.stuck || res.fell) break;
      }
      P.keys.clear(); res.maxStep = +res.maxStep.toFixed(2); res.maxDev = +res.maxDev.toFixed(2); out.walk[sp.id + ' ' + name] = res;
    }
    const um = (sp.u0 + sp.u1) / 2;
    for (const u0 of (sp.big ? [um, um - 25, um + 25] : [um])) for (const sg of [-1, 1]) {
      const p0 = W(u0, vm); window.__setCam(p0[0], null, p0[1], 0, 0); P.keys.clear(); P.keys.add('KeyW');
      const tgt = W(u0, vm + sg * 14); let maxV = 0; for (let f = 0; f < 240; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.turn.yaw = 0; P.update(1 / 60); maxV = Math.max(maxV, Math.abs(UV(P.pos.x, P.pos.z)[1] - vm)); }
      P.keys.clear(); out.rail.push({ id: sp.id, u: +u0.toFixed(1), side: sg, maxV: +maxV.toFixed(2), y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z), lim: (sg > 0 ? sp.vmax : -sp.vmin) - (sg > 0 ? vm : -vm) + (vm * 0) + 0.0 });
    }
    `}
    { const holes = [], jumps = []; let prev = null;
      for (let u = sp.u0 + 0.1; u <= sp.u1 - 0.1; u += 2) { for (const v of [sp.vmin + 0.3, (sp.vmin + vm) / 2, vm, (sp.vmax + vm) / 2, sp.vmax - 0.3]) { const w = W(u, v), y = B.deckY(w[0], w[1]); if (y === null) holes.push([+u.toFixed(1), +v.toFixed(1)]); } const w = W(u, vm), y = B.deckY(w[0], w[1]); if (prev !== null && y !== null && Math.abs(y - prev) > 0.12) jumps.push([+u.toFixed(1), +(y - prev).toFixed(2)]); prev = y; }
      const m = W((sp.u0 + sp.u1) / 2, vm), top = B.deckY(m[0], m[1]); out.deck.push({ id: sp.id, holes: holes.length, jumps, prefilter: B.list.some((b) => (b.x - m[0]) ** 2 + (b.z - m[1]) ** 2 < 190 * 190), entry: B.list.filter((b) => b.id === sp.id).length, masts: B.masts.filter((q) => q.id === sp.id).length, lamps: !!(sp.big || sp.lamps), top: top === null ? null : +top.toFixed(2) });
    }
    ${args.nocar ? '' : `
    if (sp.car) for (const dir of [1, -1]) {
      const vT = sp.big ? dir * sp.lane : sp.lane, uA = dir > 0 ? sp.u0 - 22 : (sp.edge1 ? sp.u1 - 4 : sp.u1 + 22), uB = dir > 0 ? (sp.edge1 ? sp.u1 - 18 : sp.u1 + 14) : sp.u0 - 14, p0 = W(uA, vT), yaw = Math.atan2(dir * c, dir * s);
      D.teleport(p0[0], p0[1], yaw);
      const r = { id: sp.id, dir, maxErr: 0, maxY: -9, yErr: 0, jump: 0, hits: 0, reached: false, t: 0 };
      let prevY = null, prevU = null, done = false, tt = 0;
      const inp = () => {
        const car = D.car, q = UV(car.x, car.z), e = dir * (q[1] - vT), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * s + hz * c);
        const left = Math.abs(uB - q[0]), vmax = Math.min(18, 5 + 0.45 * left), spd = Math.hypot(car.vx, car.vz);
        return { thr: done ? 0 : spd > vmax ? 0 : 1, brk: done || spd > vmax + 2 ? 1 : 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false };
      };
      const frames = (i, car) => {
        const q = UV(car.x, car.z); if (q[0] > sp.u0 && q[0] < sp.u1) r.maxErr = Math.max(r.maxErr, Math.abs(q[1] - vT)); r.maxY = Math.max(r.maxY, car.y);
        for (const ev of car.events || []) if (ev.type === 'hit') r.hits++;
        if (i % 6 === 0) { const dy = B.deckY(car.x, car.z); if (dy !== null && q[0] > sp.u0 + 2 && q[0] < sp.u1 - 2) r.yErr = Math.max(r.yErr, Math.abs(car.y - dy - 0.03)); if (prevY !== null && Math.abs(q[0] - prevU) > 0.2) r.jump = Math.max(r.jump, Math.abs(car.y - prevY) / Math.abs(q[0] - prevU)); prevY = car.y; prevU = q[0]; }
        tt += 1 / 60; if (!done && dir * (q[0] - uB) >= 0) { done = true; r.reached = true; r.t = +tt.toFixed(1); }
      };
      for (let k = 0; k < Math.ceil((Math.abs(uB - uA) / 10 + 14) / 2) && !done; k++) D.sim(2, inp, frames);
      r.end = UV(D.car.x, D.car.z).map((v) => +v.toFixed(1)); r.maxErr = +r.maxErr.toFixed(2); r.maxY = +r.maxY.toFixed(2); r.yErr = +r.yErr.toFixed(3); r.jump = +r.jump.toFixed(3);
      out.car.push(r);
    }
    `}
  }
  if (D && D.active) D.exit(true);
  return out;
})()`;
const onlyMods = 'environment,streets,bridges' + (args.nocar ? '' : ',drive');
const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', onlyMods, '--cams', `${SPECS[0].cx.toFixed(1)},1.5,${SPECS[0].cz.toFixed(1)},0,0`, '--out', 'shots/kamenny-bridges/_test', '--t', '3', '--protocol-timeout', '900000', '--load-timeout', '900000', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
const res = JSON.parse(line.slice(5));
let bad = 0;
if (!args.nowalk) {
  console.log('WALK');
  for (const [n, q] of Object.entries(res.walk)) { const ok = q.reached === q.total && !q.fell && !q.stuck && q.maxDev <= 0.4 && q.maxStep <= 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(24)} reached ${q.reached}/${q.total}, fell ${JSON.stringify(q.fell)}, stuck ${JSON.stringify(q.stuck)}, max |feet - deckY| ${q.maxDev}, largest step ${q.maxStep}, frames ${q.frames}`); }
  console.log('RAIL (push 4 s toward the side; the walker must stop inside the railing)');
  for (const q of res.rail) { const ok = q.maxV <= q.lim + 0.15 && q.deck !== null && Math.abs(q.y - q.deck) < 0.4; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.id} u ${q.u} side ${q.side}: max offset ${q.maxV} (edge ${q.lim.toFixed(2)}), y ${q.y}, deck ${q.deck === null ? null : q.deck.toFixed(2)}`); }
}
console.log('DECKY');
for (const d of res.deck) { const ok = !d.holes && !d.jumps.length && d.prefilter && d.entry && (!d.lamps || d.masts > 0 || d.id.startsWith('kamsvc')); if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(d)}`); }
if (!args.nocar) {
  console.log('CAR (road bridges: the red car must cross both ways)');
  for (const d of res.car) { const ok = d.reached && d.maxErr <= 2.5 && d.yErr <= 0.12 && d.jump <= 0.08 && d.hits === 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${d.id} ${d.dir > 0 ? '->' : '<-'}: reached ${d.reached} in ${d.t} s, lateral error max ${d.maxErr} m, deck height error max ${d.yErr} m, top y ${d.maxY}, steepest ${(d.jump * 100).toFixed(1)} %, hits ${d.hits}, end uv ${JSON.stringify(d.end)}`); }
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
