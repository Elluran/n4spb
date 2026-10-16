// tools/bridges-krestovsky-aptekarsky-bridge-test.mjs - walk + drive probe of the bridges of src/world/bridges/krestAptek.js (+ krestAptek2.js when present) in the real page (tools/shot.mjs --eval, one heavy browser job per mode).
//   WALK  the real Player.update with W held, yaw pointed at the next waypoint: along the axis and both pavements, both directions, from 18 m before the first end of the claimed way to 18 m after the last;
//         asserts it arrives, never falls (|feet - deckY| <= 0.4 over the deck) and reports the largest step in y between frames.
//   RAIL  from three points on the deck the walker pushes 4 s toward each side: it must stay inside |v| <= hw + 0.3 on the deck height (nobody walks on the water).
//   DECKY services.bridges.deckY every 2 m along the axis and across (holes / jumps over the whole claimed way) + the list entry.
//   CAR   (road bridges) the red car (ctx.drive) is driven along both lanes from 25 m before each end: it must cross the bridge (reach the far end), and its y must follow deckY.
// usage: node tools/bridges-krestovsky-aptekarsky-bridge-test.mjs [--only mk,by,gr,ka] [--nocar] [--nowalk]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const KA = await import('../src/world/bridges/krestAptek.js');
let list = KA.SPECS.map((s) => ({ ...s, ped: !!s.ped }));
try { const m = await import('../src/world/bridges/krestAptek2.js'); list = list.concat((m.TEST_SPECS || []).map((s) => ({ ...s }))); } catch (e) { /* no second group yet */ }
const only = args.only ? args.only.split(',') : null;
const PREFIX = { malokrestovsky: 'mk', bychy: 'by', grebnoy: 'gr', kantemirovsky: 'ka' };
list = list.filter((s) => !only || only.includes(PREFIX[s.id] || s.id) || only.includes(s.id));
const pack = list.map((s) => ({ id: s.id, cx: s.cx, cz: s.cz, T: (s.b - 90) * Math.PI / 180, len: s.len, hw: s.hw, road: s.road, ped: !!s.ped, noCar: !!s.noCar, lead: s.carLead || 24, sA: s.ka && s.ka.slabA !== undefined ? s.ka.slabA : -1.2, sB: s.ka && s.ka.slabB !== undefined ? s.ka.slabB : s.len + 1.2 }));
const expr = (mode) => `(() => {
  const SPECS = ${JSON.stringify(pack)}, MODE = '${mode}', ctx = window.__ctx, B = ctx.services.bridges, out = {};
  const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;
  for (const sp of SPECS) {
    const c = Math.cos(sp.T), s = Math.sin(sp.T), W = (u, v) => [sp.cx + u * c - v * s, sp.cz + u * s + v * c], UV = (x, z) => [(x - sp.cx) * c + (z - sp.cz) * s, -(x - sp.cx) * s + (z - sp.cz) * c];
    const o = out[sp.id] = {};
    if (MODE === 'walk') {
      const P = ctx.playerObj; P.enabled = true; P.inputLock = 0;
      const a = sp.sA - 18, b = sp.sB + 18, routes = {};
      const line = (v, u0, u1) => { const r = []; for (let i = 0; i <= 10; i++) r.push(W(u0 + (u1 - u0) * i / 10, v)); return r; };
      routes.axisF = line(0, a, b); routes.axisR = line(0, b, a); routes.leftF = line(-(sp.hw - 2.6), a, b); routes.rightR = line(sp.hw - 1.2, b, a);
      o.walk = {};
      for (const [name, pts] of Object.entries(routes)) {
        const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, minY: 99, maxY: -99, frames: 0, stuck: null }; let prevY = null;
        window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
        P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
        for (let k = 1; k < pts.length; k++) {
          const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
          while (frames++ < 1800) {
            const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.6) { res.reached = k; break; }
            P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
            const q = UV(P.pos.x, P.pos.z), dy = B.deckY(P.pos.x, P.pos.z);
            if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y; res.minY = Math.min(res.minY, P.pos.y); res.maxY = Math.max(res.maxY, P.pos.y);
            if (dy !== null && Math.abs(q[1]) < sp.hw - 0.2 && q[0] > 0.5 && q[0] < sp.len - 0.5) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+q[0].toFixed(1), +q[1].toFixed(1), +P.pos.y.toFixed(2)]; }
            if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, u: +q[0].toFixed(1), v: +q[1].toFixed(1) }; break; } } else still = 0; }
          }
          if (res.stuck || res.fell) break;
        }
        P.keys.clear(); for (const k of ['maxStep', 'maxDev', 'minY', 'maxY']) res[k] = +res[k].toFixed(2); o.walk[name] = res;
      }
      o.rail = [];
      for (const u0 of [sp.len * 0.2, sp.len * 0.5, sp.len * 0.8]) for (const sg of [-1, 1]) {
        const p0 = W(u0, 0); window.__setCam(p0[0], null, p0[1], 0, 0); P.keys.clear(); P.keys.add('KeyW');
        const tgt = W(u0, sg * (sp.hw + 8)); let maxV = 0, yEnd = 0;
        for (let f = 0; f < 240; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.turn.yaw = 0; P.update(1 / 60); maxV = Math.max(maxV, Math.abs(UV(P.pos.x, P.pos.z)[1])); }
        P.keys.clear(); o.rail.push({ u: +u0.toFixed(1), side: sg, maxV: +maxV.toFixed(2), y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z) });
      }
    }
    if (MODE === 'deck') {
      const holes = [], jumps = []; let prev = null;
      for (let u = sp.sA + 0.3; u <= sp.sB - 0.3; u += 2) { for (const v of [-sp.hw + 0.4, -sp.hw / 2, 0, sp.hw / 2, sp.hw - 0.4]) { const w = W(u, v), y = B.deckY(w[0], w[1]); if (y === null) holes.push([+u.toFixed(0), +v.toFixed(1)]); } const w = W(u, 0), y = B.deckY(w[0], w[1]); if (prev !== null && y !== null && Math.abs(y - prev) > 0.25) jumps.push([+u.toFixed(0), +prev.toFixed(2), +y.toFixed(2)]); prev = y; }
      const m = W(sp.len / 2, 0), e = B.list.find((b) => b.id === sp.id);
      o.deck = { holes: holes.slice(0, 12), nHoles: holes.length, jumps, listed: !!e, prefilter: B.list.some((b) => (b.x - m[0]) ** 2 + (b.z - m[1]) ** 2 < 190 * 190), failed: B.failed, per: B.stats.per[sp.id], masts: B.masts.filter((q) => q.id === sp.id).length, midY: B.deckY(m[0], m[1]) };
    }
    if (MODE === 'car' && !sp.ped && !sp.noCar) {
      const D = ctx.drive; o.car = [];
      for (const dir of [1, -1]) for (const vT of [sp.road * 0.5, -sp.road * 0.5]) {
        const uA = dir > 0 ? sp.sA - sp.lead : sp.sB + sp.lead, uB = dir > 0 ? sp.sB + 12 : sp.sA - 12, p0 = W(uA, vT), yaw = Math.atan2(dir * c, dir * s);
        D.teleport(p0[0], p0[1], yaw);
        const r = { dir, v: +vT.toFixed(1), maxU: -999, minU: 999, maxY: -9, minY: 9, hits: 0, dev: 0 };
        const inp = () => { const car = D.car, q = UV(car.x, car.z), e = dir * (q[1] - vT), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * s + hz * c); return { thr: 1, brk: 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false }; };
        const frames = (i, car) => { const q = UV(car.x, car.z); r.maxU = Math.max(r.maxU, q[0]); r.minU = Math.min(r.minU, q[0]); r.maxY = Math.max(r.maxY, car.y); r.minY = Math.min(r.minY, car.y); const dy = B.deckY(car.x, car.z); if (dy !== null && q[0] > 0.5 && q[0] < sp.len - 0.5) r.dev = Math.max(r.dev, Math.abs(car.y - dy - 0.03)); for (const ev of car.events || []) if (ev.type === 'hit') r.hits++; };
        for (let k = 0; k < 14; k++) { D.sim(2, inp, frames); const q = UV(D.car.x, D.car.z); if (dir > 0 ? q[0] > uB : q[0] < uB) break; }
        const q = UV(D.car.x, D.car.z); r.end = [+q[0].toFixed(1), +q[1].toFixed(1)]; r.reachedEnd = dir > 0 ? r.maxU >= sp.sB - 1 : r.minU <= sp.sA + 1; r.maxY = +r.maxY.toFixed(2); r.minY = +r.minY.toFixed(2); r.dev = +r.dev.toFixed(2);
        o.car.push(r);
      }
      if (D.active) D.exit(true);
    }
  }
  return out;
})()`;
const run = (mode, only2) => {
  const cam = pack.length ? `${pack[0].cx.toFixed(1)},1.7,${pack[0].cz.toFixed(1)},0,0` : '0,1.7,0,0,0';
  const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only2, '--cams', cam, '--out', 'shots/ka/_test_' + mode, '--t', '3', '--load-timeout', '1500000', '--protocol-timeout', '1500000', '--eval', expr(mode)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
  if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
  return JSON.parse(line.slice(5));
};
let bad = 0;
if (!args.nowalk) {
  const w = run('walk', 'environment,streets,city,bridges'), d = run('deck', 'environment,streets,city,bridges');
  for (const sp of pack) {
    console.log('== ' + sp.id);
    for (const [n, r] of Object.entries(w[sp.id].walk)) { const ok = r.reached === r.total && !r.fell && !r.stuck && r.maxDev <= 0.4 && r.maxStep <= 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} walk ${n.padEnd(7)} reached ${r.reached}/${r.total}, fell ${JSON.stringify(r.fell)}, stuck ${JSON.stringify(r.stuck)}, |y - deckY| <= ${r.maxDev}, largest step ${r.maxStep}, y ${r.minY}..${r.maxY}`); }
    for (const r of w[sp.id].rail) { const ok = r.maxV <= sp.hw + 0.35 && r.deck !== null && Math.abs(r.y - r.deck) < 0.4; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} rail u ${r.u} side ${r.side}: max |v| ${r.maxV}, y ${r.y}, deck ${r.deck === null ? null : r.deck.toFixed(2)}`); }
    const k = d[sp.id].deck; const okd = !k.nHoles && !k.jumps.length && k.listed && k.prefilter; if (!okd) bad++; console.log(`  ${okd ? 'ok  ' : 'FAIL'} deckY holes ${k.nHoles} ${JSON.stringify(k.holes)} jumps ${JSON.stringify(k.jumps)} listed ${k.listed} prefilter ${k.prefilter} tris ${k.per} masts ${k.masts} mid ${k.midY}`);
    if (k.failed && k.failed.length) { bad++; console.log('  FAILED builds', k.failed.map((s) => s.slice(0, 200))); }
  }
}
if (!args.nocar) {
  const c = run('car', 'environment,streets,city,bridges,drive');
  for (const sp of pack) for (const r of c[sp.id].car || []) { const ok = r.reachedEnd && r.dev <= 0.35; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} car ${sp.id} dir ${r.dir} v ${r.v}: u ${r.minU.toFixed(0)}..${r.maxU.toFixed(0)} end ${JSON.stringify(r.end)} y ${r.minY}..${r.maxY} dev ${r.dev} hits ${r.hits}`); }
}
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
