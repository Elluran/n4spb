// tools/yelagin-ponds-real.mjs - probe of the 11 pond footbridges + 5 sluices of the Yelagin park in the REAL page (tools/shot.mjs --eval, real Player + real car physics).
//   WALK  the real Player walks (shift) along the axis in both directions and 0.6 hw off the axis: reaches the far end, y within 0.2 m of services.bridges.deckY on the deck, no fall.
//   RAIL  from the middle of every deck the Player pushes 3 s toward each side: |v| must stay <= hw + 0.6 (the side colliders hold) and the feet stay at the deck.
//   CAR   the red car is driven along the axis from 6 m before each end (both directions): the narrow decks and the sluices (bollards) must stop it before the deck (never beyond |u| = HL - 1.5);
//         the road-width decks (p3s4s p4n5nB p3n4n p2n3n p1n2n) must let it onto the deck: it must pass the whole bank interval or at least ride on (y within 0.15 m of deckY).
// usage: node tools/yelagin-ponds-real.mjs [--mode walk|car|both] [--ids p3s4s,p1s2s]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const Y = await import(pathToFileURL(path.join(root, 'src/world/bridges/yelaginPonds.js')).href);
const OPEN = new Set(['p3s4s', 'p4n5nB', 'p3n4n', 'p2n3n', 'p1n2n']);
let recs = [...Y.PONDS, ...Y.SLUICES]; if (args.ids) recs = recs.filter((r) => args.ids.split(',').includes(r.id));
const frames = recs.map((sp) => ({ id: sp.id, sluice: !!sp.gates, gates: sp.gates || 0, hw: sp.hw || (sp.wd / 2), ...Y.frameOfPond(sp), open: OPEN.has(sp.id) }));
const expr = (mode) => `(() => {
  const FR = ${JSON.stringify(frames)}, MODE = '${mode}', ctx = window.__ctx, B = ctx.services.bridges, S = ctx.services.yelaginPonds, out = { rows: [] };
  for (const fr of FR) {
    const site = S.sites.find((q) => q.id === fr.id), HL = fr.sluice ? fr.len / 2 : site.info.len / 2;
    const c = fr.c, s = fr.s, W = (u, v) => [fr.cx + u * c - v * s, fr.cz + u * s + v * c], UV = (x, z) => [(x - fr.cx) * c + (z - fr.cz) * s, -(x - fr.cx) * s + (z - fr.cz) * c];
    const row = { id: fr.id }; out.rows.push(row);
    if (MODE === 'walk') {
      const P = ctx.playerObj; P.enabled = true; P.inputLock = 0; row.walk = [];
      for (const [dir, v] of (fr.sluice ? [[1, 0], [-1, 0], [1, -0.7], [-1, -0.7]] : [[1, 0], [-1, 0], [1, fr.hw * 0.6], [-1, -fr.hw * 0.6]])) {
        const a = W(-dir * (HL + 6), v), b = W(dir * (HL + 6), v); window.__setCam(a[0], null, a[1], 0, 0);
        P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft'); const r = { dir, v: +v.toFixed(1), reached: false, maxDev: 0, minY: 9, fell: false, frames: 0 };
        for (let f = 0; f < 1500; f++) {
          const dx = b[0] - P.pos.x, dz = b[1] - P.pos.z; if (Math.hypot(dx, dz) < 1.0) { r.reached = true; break; }
          P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); r.frames++;
          const q = UV(P.pos.x, P.pos.z), dy = fr.sluice ? null : B.deckY(P.pos.x, P.pos.z); r.minY = Math.min(r.minY, P.pos.y);
          if (dy !== null && Math.abs(q[1]) < fr.hw - 0.3 && Math.abs(q[0]) < HL - 0.4) r.maxDev = Math.max(r.maxDev, Math.abs(P.pos.y - dy));
          if (P.pos.y < -0.5) r.fell = true;
        }
        P.keys.clear(); r.maxDev = +r.maxDev.toFixed(2); r.minY = +r.minY.toFixed(2); row.walk.push(r);
      }
      row.rail = [];
      for (const sg of [-1, 1]) {
        const u0 = fr.sluice && fr.gates === 1 ? 1.6 : 0, p0 = W(u0, 0); window.__setCam(p0[0], null, p0[1], 0, 0); P.keys.clear(); P.keys.add('KeyW'); const tgt = W(u0, sg * (fr.hw + 12)); let maxV = 0;
        for (let f = 0; f < 180; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.turn.yaw = 0; P.update(1 / 60); maxV = Math.max(maxV, Math.abs(UV(P.pos.x, P.pos.z)[1])); }
        P.keys.clear(); row.rail.push({ side: sg, maxV: +maxV.toFixed(2), y: +P.pos.y.toFixed(2) });
      }
    }
    if (MODE === 'car') {
      const D = ctx.drive; row.car = [];
      for (const dir of [1, -1]) {
        const uA = -dir * (HL + 6), p0 = W(uA, 0), yaw = Math.atan2(dir * c, dir * s); D.teleport(p0[0], p0[1], yaw);
        const r = { dir, maxU: -999, minU: 999, maxDev: 0, hits: 0 };
        const inp = () => { const car = D.car, q = UV(car.x, car.z), e = dir * q[1], hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * s + hz * c); return { thr: 0.8, brk: 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false }; };
        const fr2 = (i, car) => { const q = UV(car.x, car.z); r.maxU = Math.max(r.maxU, q[0]); r.minU = Math.min(r.minU, q[0]); for (const ev of car.events || []) if (ev.type === 'hit') r.hits++; const dy = B.deckY(car.x, car.z); if (dy !== null && Math.abs(q[0]) < HL - 0.5 && Math.abs(q[1]) < fr.hw - 0.5) r.maxDev = Math.max(r.maxDev, Math.abs(car.y - dy - 0.03)); };
        for (let k = 0; k < 6; k++) D.sim(2, inp, fr2);
        r.progress = +(dir > 0 ? r.maxU : -r.minU).toFixed(1); r.maxDev = +r.maxDev.toFixed(2); row.car.push(r); r.HL = +HL.toFixed(1);
      }
      if (D.active) D.exit(true);
    }
  }
  return out;
})()`;
const run = (mode, only) => {
  const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', '-5207.2,1.5,-4837.7,105.8,1.5', '--out', 'shots/yelagin-ponds/_test_' + mode, '--t', '3', '--load-timeout', '1200000', '--protocol-timeout', '1200000', '--eval', expr(mode)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
  if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
  return JSON.parse(line.slice(5));
};
let bad = 0; const mode = args.mode || 'both';
if (mode !== 'car') {
  const w = run('walk', 'environment,streets,city,bridges'); console.log('WALK + RAIL');
  for (const row of w.rows) {
    const sl = frames.find((f) => f.id === row.id).sluice, hw = frames.find((f) => f.id === row.id).hw;
    for (const r of row.walk) { const ok = r.reached && !r.fell && r.maxDev <= 0.2; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${row.id.padEnd(7)} walk dir ${r.dir} v ${r.v}: reached ${r.reached}, frames ${r.frames}, maxDev ${r.maxDev}, minY ${r.minY}`); }
    for (const r of row.rail) { const ok = r.maxV <= hw + 0.6 && r.y > -0.3; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${row.id.padEnd(7)} rail side ${r.side}: max |v| ${r.maxV} (hw ${hw.toFixed(1)}), y ${r.y}`); }
  }
}
if (mode !== 'walk') {
  const c = run('car', 'environment,streets,city,bridges,drive'); console.log('CAR');
  for (const row of c.rows) {
    const fr = frames.find((f) => f.id === row.id);
    for (const r of row.car) {
      const stop = !fr.open; const ok = stop ? r.progress < r.HL - 1.5 : r.progress > 0 && r.maxDev <= 0.15; if (!ok) bad++;
      console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${row.id.padEnd(7)} dir ${r.dir}: progress u ${r.progress} (HL ${r.HL}) ${stop ? 'must stop' : 'must enter'}, maxDev ${r.maxDev}, hits ${r.hits}`);
    }
  }
}
console.log(bad ? 'RESULT: FAIL ' + bad : 'RESULT: OK');
process.exit(bad ? 1 : 0);
