// tools/bridges-krestovsky-aptekarsky-routes-test.mjs - walk probe of the CURVED / free-form decks of krestAptek2.js in the real page (tools/shot.mjs --eval): the Yachtny Bridge (axis, both pavements, both ways, plus
// 4 s pushes toward each side: nobody walks on the water) and every boardwalk way (centre line both ways: reached, no fall, no stuck).  One heavy browser job.
// usage: node tools/bridges-krestovsky-aptekarsky-routes-test.mjs [--only yachtny|boards]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const Y = await import('../src/world/bridges/krestAptek2/yachtny.js');
const BW = await import('../src/world/bridges/krestAptek2/boardwalk.js');
const D = await import('../src/world/data/city.js');
const routes = [], L = Y.STATIONS.L;
if (!args.only || args.only === 'yachtny') {
  const ways = (v, fwd) => { const r = []; const a = -16, b = L + 16; for (let k = 0; k <= 60; k++) { const s = fwd ? a + (b - a) * k / 60 : b - (b - a) * k / 60, c = Math.max(0, Math.min(L, s)), q = Y.pointAt(c, v), ov = s - c; r.push([q.x + q.tx * ov, q.z + q.tz * ov]); } return r; };
  for (const [nm, v] of [['axis', 0], ['west', 6.2], ['east', -6.2]]) for (const fwd of [true, false]) routes.push({ name: `yachtny ${nm} ${fwd ? 'F' : 'R'}`, pts: ways(v, fwd), kind: 'deck' });
}
if (!args.only || args.only === 'boards') {
  for (const id of BW.BOARDWALKS) { const r = D.ROADS.find((q) => q.id === id); if (!r) continue; const p = []; for (let i = 0; i < r.pts.length; i += 2) p.push([r.pts[i], r.pts[i + 1]]);
    const into = (a, b, d) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [a[0] + (b[0] - a[0]) / l * d, a[1] + (b[1] - a[1]) / l * d]; };      // start / end 1.6 m inside the way (the end cap rail of a pier stands at the very end)
    p[0] = into(p[0], p[1], 1.6); p[p.length - 1] = into(p[p.length - 1], p[p.length - 2], 1.6);
    routes.push({ name: 'board ' + id + ' F', pts: p, kind: 'ground' }); routes.push({ name: 'board ' + id + ' R', pts: p.slice().reverse(), kind: 'ground' }); }
}
const expr = `(() => {
  const ROUTES = ${JSON.stringify(routes)}, ctx = window.__ctx, B = ctx.services.bridges, P = ctx.playerObj, out = [];
  const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;
  P.enabled = true; P.inputLock = 0;
  for (const rt of ROUTES) {
    const pts = rt.pts, res = { name: rt.name, reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, minY: 99, maxY: -99, stuck: null, frames: 0 }; let prevY = null;
    window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
    P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
    for (let k = 1; k < pts.length; k++) {
      const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
      while (frames++ < 1800) {
        const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.4) { res.reached = k; break; }
        P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
        const dy = B.deckY(P.pos.x, P.pos.z);
        if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y; res.minY = Math.min(res.minY, P.pos.y); res.maxY = Math.max(res.maxY, P.pos.y);
        if (rt.kind === 'deck' && dy !== null) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2)]; }
        if (rt.kind === 'ground' && P.pos.y < -0.8 && !res.fell) res.fell = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2)];
        if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, x: +P.pos.x.toFixed(1), z: +P.pos.z.toFixed(1) }; break; } } else still = 0; }
      }
      if (res.stuck || res.fell) break;
    }
    P.keys.clear(); for (const k of ['maxStep', 'maxDev', 'minY', 'maxY']) res[k] = +res[k].toFixed(2); out.push(res);
  }
  return out;
})()`;
const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', 'environment,streets,city,bridges', '--cams', `${routes[0].pts[0][0].toFixed(1)},1.7,${routes[0].pts[0][1].toFixed(1)},0,0`, '--out', 'shots/bridges-krestovsky-aptekarsky/_routes', '--t', '3', '--load-timeout', '1500000', '--protocol-timeout', '1500000', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
let bad = 0;
for (const x of JSON.parse(line.slice(5))) { const ok = x.reached === x.total && !x.fell && !x.stuck && x.maxStep <= 0.5 && x.maxDev <= 0.45; if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${x.name.padEnd(34)} reached ${x.reached}/${x.total} fell ${JSON.stringify(x.fell)} stuck ${JSON.stringify(x.stuck)} dev ${x.maxDev} step ${x.maxStep} y ${x.minY}..${x.maxY}`); }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK'); process.exit(bad ? 1 : 0);
