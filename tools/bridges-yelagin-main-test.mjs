// tools/bridges-yelagin-main-test.mjs - walk + drive probe of the 1st and 3rd Yelagin bridge (src/world/bridges/yelaginMain.js) in the real page (one heavy browser job through tools/shot.mjs --eval).
//   1. WALK   the real Player.update with W held toward the next waypoint along the axis, the left pavement, the right pavement and the carriageway edge, both directions: arrives, never falls (feet within 0.4 m of
//             services.bridges.deckY over the water), largest step in y between frames.
//   2. RAIL   from the middle (and 20 m either side) the walker pushes 4 s toward each side: stops at the railing (|v| <= hw + 0.1) at the deck height.
//   3. DECKY  services.bridges.deckY every 2 m along the axis and across (holes / jumps) + a 190 m prefilter entry + masts.
//   4. CAR    the red car (ctx.drive test hooks) drives over each bridge in both directions on the right lane: arrives, stays on the roadway (|lateral error| <= 2.5 m), rides the deck within 0.12 m, no step steeper than 8 %,
//             no collision events (the bridges are ROAD bridges).
// usage: node tools/bridges-yelagin-main-test.mjs [--nocar] [--nowalk] [--only 1|3]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const M = await import(pathToFileURL(path.join(root, 'src/world/bridges/yelaginMain.js')).href);
const all = [{ k: '1', sp: M.Y1, lane: 1.75 }, { k: '3', sp: M.Y3, lane: 2.0 }].filter((q) => !args.only || args.only === q.k);
const specs = all.map(({ k, sp, lane }) => ({ k, id: sp.id, cx: sp.cx, cz: sp.cz, T: (sp.b - 90) * Math.PI / 180, HL: sp.len / 2, HW: sp.hw, ROAD: sp.road, lane }));
const expr = `(() => {
  const SPECS = ${JSON.stringify(specs)}, ctx = window.__ctx, B = ctx.services.bridges, out = { walk: {}, rail: [], deck: [], car: [] };
  const P = ctx.playerObj, D = ctx.drive;
  for (const sp of SPECS) {
    const c = Math.cos(sp.T), s = Math.sin(sp.T), W = (u, v) => [sp.cx + u * c - v * s, sp.cz + u * s + v * c], UV = (x, z) => [(x - sp.cx) * c + (z - sp.cz) * s, -(x - sp.cx) * s + (z - sp.cz) * c];
    const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;
    ${args.nowalk ? '' : `
    P.enabled = true; P.inputLock = 0;
    const line = (v, a, b) => { const o = []; const n = 8; for (let i = 0; i <= n; i++) o.push(W(a + (b - a) * i / n, v)); return o; };
    const HL = sp.HL, routes = {};
    routes['axis-fwd'] = line(0, -HL - 14, HL + 14); routes['axis-back'] = line(0, HL + 14, -HL - 14);
    routes['left-walk'] = [W(-HL - 14, 0), ...line(-(sp.HW - 1.2), -HL + 2, HL - 2), W(HL + 14, 0)]; routes['right-walk'] = [W(HL + 14, 0), ...line(sp.HW - 1.2, HL - 2, -HL + 2), W(-HL - 14, 0)];
    routes['kerb-fwd'] = [W(-HL - 14, 0), ...line(sp.ROAD + 0.3, -HL + 2, HL - 2), W(HL + 14, 0)];
    for (const [name, pts] of Object.entries(routes)) {
      const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, frames: 0, stuck: null }; let prevY = null;
      window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
      P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
      for (let k = 1; k < pts.length; k++) {
        const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
        while (frames++ < 1500) {
          const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.5) { res.reached = k; break; }
          P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
          const q = UV(P.pos.x, P.pos.z), dy = B.deckY(P.pos.x, P.pos.z);
          if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y;
          if (dy !== null && Math.abs(q[1]) < sp.HW - 0.2 && Math.abs(q[0]) < HL - 0.5) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+q[0].toFixed(1), +q[1].toFixed(1), +P.pos.y.toFixed(2)]; }
          if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, u: +q[0].toFixed(1), v: +q[1].toFixed(1) }; break; } } else still = 0; }
        }
        if (res.stuck || res.fell) break;
      }
      P.keys.clear(); res.maxStep = +res.maxStep.toFixed(2); res.maxDev = +res.maxDev.toFixed(2); out.walk[sp.id + ' ' + name] = res;
    }
    for (const u0 of [0, -20, 20]) for (const sg of [-1, 1]) {
      const p0 = W(u0, 0); window.__setCam(p0[0], null, p0[1], 0, 0); P.keys.clear(); P.keys.add('KeyW');
      const tgt = W(u0, sg * 14); let maxV = 0; for (let f = 0; f < 240; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.turn.yaw = 0; P.update(1 / 60); maxV = Math.max(maxV, Math.abs(UV(P.pos.x, P.pos.z)[1])); }
      P.keys.clear(); out.rail.push({ id: sp.id, u: u0, side: sg, maxV: +maxV.toFixed(2), y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z), hw: sp.HW });
    }
    `}
    { const holes = [], jumps = []; let prev = null;
      for (let u = -sp.HL; u <= sp.HL; u += 2) { for (const v of [-sp.HW + 0.3, -3, 0, 3, sp.HW - 0.3]) { const w = W(u, v), y = B.deckY(w[0], w[1]); if (y === null) holes.push([u, v]); } const w = W(u, 0), y = B.deckY(w[0], w[1]); if (prev !== null && y !== null && Math.abs(y - prev) > 0.12) jumps.push([u, +(y - prev).toFixed(2)]); prev = y; }
      const m = W(0, 0); out.deck.push({ id: sp.id, holes: holes.length, jumps, prefilter: B.list.some((b) => (b.x - m[0]) ** 2 + (b.z - m[1]) ** 2 < 190 * 190), entry: B.list.filter((b) => b.id === sp.id).length, masts: B.masts.filter((q) => q.id === sp.id).length, top: +B.deckY(m[0], m[1]).toFixed(2) });
    }
    ${args.nocar ? '' : `
    for (const dir of [1, -1]) {
      const vT = dir * sp.lane, uA = dir > 0 ? -sp.HL - 22 : sp.HL + 22, uB = dir > 0 ? sp.HL + 14 : -sp.HL - 14, p0 = W(uA, vT), yaw = Math.atan2(dir * c, dir * s);
      D.teleport(p0[0], p0[1], yaw);
      const r = { id: sp.id, dir, maxErr: 0, maxY: -9, yErr: 0, jump: 0, hits: 0, reached: false, t: 0 };
      let prevY = null, prevU = null, done = false, tt = 0;
      const inp = () => {
        const car = D.car, q = UV(car.x, car.z), e = dir * (q[1] - vT), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * s + hz * c);
        const left = Math.abs(uB - q[0]), vmax = Math.min(18, 5 + 0.45 * left), spd = Math.hypot(car.vx, car.vz);
        return { thr: done ? 0 : spd > vmax ? 0 : 1, brk: done || spd > vmax + 2 ? 1 : 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false };
      };
      const frames = (i, car) => {
        const q = UV(car.x, car.z); if (Math.abs(q[0]) < sp.HL) r.maxErr = Math.max(r.maxErr, Math.abs(q[1] - vT)); r.maxY = Math.max(r.maxY, car.y);
        for (const ev of car.events || []) if (ev.type === 'hit') r.hits++;
        if (i % 6 === 0) { const dy = B.deckY(car.x, car.z); if (dy !== null && Math.abs(q[0]) < sp.HL - 2) r.yErr = Math.max(r.yErr, Math.abs(car.y - dy - 0.03)); if (prevY !== null && Math.abs(q[0] - prevU) > 0.2) r.jump = Math.max(r.jump, Math.abs(car.y - prevY) / Math.abs(q[0] - prevU)); prevY = car.y; prevU = q[0]; }
        tt += 1 / 60; if (!done && dir * (q[0] - uB) >= 0) { done = true; r.reached = true; r.t = +tt.toFixed(1); }
      };
      for (let k = 0; k < Math.ceil((Math.abs(uB - uA) / 10 + 14) / 2) && !done; k++) D.sim(2, inp, frames);
      r.end = UV(D.car.x, D.car.z).map((v) => +v.toFixed(1)); r.maxErr = +r.maxErr.toFixed(2); r.maxY = +r.maxY.toFixed(2); r.yErr = +r.yErr.toFixed(3); r.jump = +r.jump.toFixed(3);
      out.car.push(r);
    }
    `}
  }
  if (D && D.active) D.exit(true);
  out.info = SPECS.map((sp) => ({ id: sp.id, ...(ctx.services[sp.id] ? ctx.services[sp.id].info : {}) }));
  return out;
})()`;
const only = 'environment,streets,city,bridges' + (args.nocar ? '' : ',drive');
const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', `${specs[0].cx.toFixed(1)},1.5,${specs[0].cz.toFixed(1)},0,0`, '--out', 'shots/bridges-yelagin-main/_test', '--t', '3', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
const res = JSON.parse(line.slice(5));
let bad = 0;
if (!args.nowalk) {
  console.log('WALK');
  for (const [n, q] of Object.entries(res.walk)) { const ok = q.reached === q.total && !q.fell && !q.stuck && q.maxDev <= 0.4 && q.maxStep <= 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(24)} reached ${q.reached}/${q.total}, fell ${JSON.stringify(q.fell)}, stuck ${JSON.stringify(q.stuck)}, max |feet - deckY| ${q.maxDev}, largest step ${q.maxStep}, frames ${q.frames}`); }
  console.log('RAIL (push 4 s toward the side)');
  for (const q of res.rail) { const ok = q.maxV <= q.hw + 0.1 && q.deck !== null && Math.abs(q.y - q.deck) < 0.4; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.id} u ${q.u} side ${q.side}: max |v| ${q.maxV} (hw ${q.hw}), y ${q.y}, deck ${q.deck === null ? null : q.deck.toFixed(2)}`); }
}
console.log('INFO', JSON.stringify(res.info));
console.log('DECKY');
for (const d of res.deck) { const ok = !d.holes && !d.jumps.length && d.prefilter && d.entry && d.masts > 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${JSON.stringify(d)}`); }
if (!args.nocar) {
  console.log('CAR (road bridges: the red car must cross both ways)');
  for (const d of res.car) { const ok = d.reached && d.maxErr <= 2.5 && d.yErr <= 0.12 && d.jump <= 0.08 && d.hits === 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${d.id} ${d.dir > 0 ? '->' : '<-'}: reached ${d.reached} in ${d.t} s, lateral error max ${d.maxErr} m, deck height error max ${d.yErr} m, top y ${d.maxY}, steepest ${(d.jump * 100).toFixed(1)} %, hits ${d.hits}, end uv ${JSON.stringify(d.end)}`); }
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
