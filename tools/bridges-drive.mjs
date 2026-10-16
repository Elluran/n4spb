// Drive + traffic probe of the Palace Bridge, the one long bridge of the strip (in the real page, through tools/shot.mjs --eval; only its first spans lie inside the play area, the rest is scenery).
//   1. DRIVE: the player's red car (ctx.drive test hooks: teleport + sim) is put on the east carriageway 8 m before the first bank line, a lane-keeping controller drives it across to 8 m beyond the
//      far bank line, then back on the west carriageway. Asserts: it arrives both times, never leaves the roadway (|lateral error| <= 2.5 m), rides the deck (car.y = services.bridges.deckY + 0.03
//      within 12 cm at every sample over the water, the crown is reached), no step steeper than 8 % between samples, no collision events.
//   2. TRAFFIC COVER: traffic.js lifts a vehicle through services.bridges.deckY only within 190 m of an entry of services.bridges.list: every 5 m of every carriageway must have such an entry and a
//      deck height (the whole length is served), and the lanes of the streets lane graph that run over the deck (lane.bridge) must lie on the roadway (|v| <= road half width).
//   3. TRAFFIC LIVE: the vehicles of services.traffic that are over a deck right now (after --t seconds round the camera on the Palace Bridge): count, |v| inside the roadway.
// usage: node tools/bridges-drive.mjs [--t 60] [--only id,id]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const PA = await import(pathToFileURL(path.join(root, 'src/world/bridges/palace.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href), S = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href);
let specs = [{ ...PA.PALACE, len: 254.5, hw: 13.85, road: 11.0, lane: 5.5 }];
if (args.only) specs = specs.filter((s) => args.only.split(',').includes(s.id));
// the stretch of each bridge the car may drive: inside the play area (the far spans of the Palace Bridge lie outside it)
for (const s of specs) { let u0 = -8, u1 = s.len + 8; const inP = (u) => { const w = S.toWorld(s, u, s.lane), w2 = S.toWorld(s, u, -s.lane); return L.inPlay(w.x, w.z, 4) && L.inPlay(w2.x, w2.z, 4); }; while (u0 < u1 && !inP(u0)) u0 += 2; while (u1 > u0 && !inP(u1)) u1 -= 2; s.u0 = u0; s.u1 = u1; }
const expr = (mode) => `(() => {
  const MODE = '${mode}';
  const ctx = window.__ctx, D = MODE === 'drive' ? ctx.drive : null, B = ctx.services.bridges, st = ctx.services.streets, out = { drive: [], cover: [], live: [] };
  const specs = ${JSON.stringify(specs)};
  for (const s of specs) {
    const T = (s.b - 90) * Math.PI / 180, c = Math.cos(T), sn = Math.sin(T), W = (u, v) => [s.cx + u * c - v * sn, s.cz + u * sn + v * c], UV = (x, z) => [(x - s.cx) * c + (z - s.cz) * sn, -(x - s.cx) * sn + (z - s.cz) * c];
    // ---- 2. cover
    if (MODE === 'traffic') {
    let holes = 0, far = 0, n = 0;
    for (const v of [s.lane, -s.lane, s.road - 1.2, -(s.road - 1.2)]) for (let u = 1; u < s.len; u += 5) { const [x, z] = W(u, v); n++; if (B.deckY(x, z) === null) holes++; if (!B.list.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 190 * 190)) far++; }
    let lanes = 0, off = 0, laneLen = 0;
    for (const l of (st && st.lanes) || []) { if (!l.bridge) continue; let on = 0, bad = 0; for (const p of l.pts) { const x = p[0] ?? p.x, z = p[1] ?? p.z, q = UV(x, z); if (q[0] < 0 || q[0] > s.len || Math.abs(q[1]) > s.hw + 3) continue; on++; if (Math.abs(q[1]) > s.road - 0.5) bad++; } if (on >= 2) { lanes++; off += bad; laneLen += l.len; } }
    out.cover.push({ id: s.id, samples: n, holes, far, lanes, off, laneLen: Math.round(laneLen) });
    }
    // ---- 1. drive (there and back)
    if (D && s.u1 - s.u0 > 25) for (const dir of [1, -1]) {
      const vT = dir * s.lane, uA = dir > 0 ? s.u0 : s.u1, uB = dir > 0 ? s.u1 : s.u0, p0 = W(uA, vT), yaw = Math.atan2(dir * c, dir * sn);
      D.teleport(p0[0], p0[1], yaw);
      const r = { id: s.id, dir, from: +uA.toFixed(0), to: +uB.toFixed(0), maxErr: 0, maxY: -9, yErr: 0, jump: 0, hits: 0, reached: false, t: 0 };
      let prevY = null, prevU = null, done = false, tt = 0;
      const inp = () => {
        const car = D.car, q = UV(car.x, car.z), e = dir * (q[1] - vT), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = dir * (-hx * sn + hz * c);
        const left = Math.abs(uB - q[0]), vmax = Math.min(20, 5 + 0.45 * left);   // slow down toward the end point (it may lie 4 m from the play edge)
        const sp = Math.hypot(car.vx, car.vz);                               // m/s (car.speed is the HUD value)
        return { thr: done ? 0 : sp > vmax ? 0 : 1, brk: done || sp > vmax + 2 ? 1 : 0, steer: Math.max(-1, Math.min(1, 0.22 * e + 1.7 * across)), hand: false, nitro: false };
      };
      const frames = (i, car) => {
        const q = UV(car.x, car.z); r.maxErr = Math.max(r.maxErr, Math.abs(q[1] - vT)); r.maxY = Math.max(r.maxY, car.y);
        for (const ev of car.events || []) if (ev.type === 'hit') r.hits++;
        if (i % 6 === 0) { const dy = B.deckY(car.x, car.z); if (dy !== null && q[0] > 2 && q[0] < s.len - 2) r.yErr = Math.max(r.yErr, Math.abs(car.y - dy - 0.03)); if (prevY !== null && Math.abs(q[0] - prevU) > 0.2) r.jump = Math.max(r.jump, Math.abs(car.y - prevY) / Math.abs(q[0] - prevU)); prevY = car.y; prevU = q[0]; }
        tt += 1 / 60; if (!done && dir * (q[0] - uB) >= 0) { done = true; r.reached = true; r.t = +tt.toFixed(1); }
      };
      const tMax = (Math.abs(uB - uA) / 12 + 12);
      for (let k = 0; k < Math.ceil(tMax / 2) && !done; k++) D.sim(2, inp, frames);
      r.end = UV(D.car.x, D.car.z).map((v) => +v.toFixed(1)); r.maxErr = +r.maxErr.toFixed(2); r.maxY = +r.maxY.toFixed(2); r.yErr = +r.yErr.toFixed(3); r.jump = +r.jump.toFixed(3);
      out.drive.push(r);
    }
    // ---- 3. live traffic over the deck
    if (MODE === 'traffic') {
    const vs = ((ctx.services.traffic && ctx.services.traffic.vehicles) || []).filter((v) => { const q = UV(v.x, v.z); return q[0] > 0 && q[0] < s.len && Math.abs(q[1]) < s.hw; });
    out.live.push({ id: s.id, vehicles: vs.length, offRoad: vs.filter((v) => Math.abs(UV(v.x, v.z)[1]) > s.road).length, kinds: [...new Set(vs.map((v) => v.kind))].slice(0, 6) });
    }
  }
  if (D && D.active) D.exit(true);
  return out;
})()`;
const cam = S.toWorld(PA.PALACE, 60, 9), camStr = args.cam || `${cam.x.toFixed(1)},7,${cam.z.toFixed(1)},23,-8`;     // --cam "x,y,z,yaw,pitch": where the traffic simulation region follows the camera (default: on the Palace Bridge)
// two page runs: the drive without the traffic module (a free road), the traffic checks with it
const run = (mode, only, t) => {
  const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', camStr, '--out', 'shots/bridges/_drive_' + mode, '--t', t, '--eval', expr(mode)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
  if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
  return JSON.parse(line.slice(5));
};
const res = { drive: [], cover: [], live: [] };
if (!args.notraffic) { const a = run('traffic', 'environment,streets,city,bridges,traffic', args.t || '60'); res.cover = a.cover; res.live = a.live; }
if (!args.nodrive) res.drive = run('drive', 'environment,streets,city,bridges,drive', '5').drive;
let bad = 0;
console.log('DRIVE (the red car, there on the east carriageway / back on the west one)');
for (const d of res.drive) { const sp = specs.find((s) => s.id === d.id), ok = d.reached && d.maxErr <= 2.5 && d.yErr <= 0.12 && d.jump <= 0.08 && d.hits === 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${d.id.padEnd(10)} ${d.dir > 0 ? '->' : '<-'} u ${d.from} .. ${d.to}: reached ${d.reached} in ${d.t} s, lateral error max ${d.maxErr} m, deck height error max ${d.yErr} m, top y ${d.maxY}, steepest step ${(d.jump * 100).toFixed(1)} %, hits ${d.hits}, end uv ${JSON.stringify(d.end)}`); void sp; }
console.log('TRAFFIC COVER (deckY + a list entry within 190 m every 5 m of both carriageways; lane graph lanes over the deck)');
for (const c of res.cover) { const ok = c.holes === 0 && c.far === 0 && c.off === 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${c.id.padEnd(10)} samples ${c.samples}: deck holes ${c.holes}, outside the 190 m prefilter ${c.far}; lanes over the deck ${c.lanes} (${c.laneLen} m), lane points off the roadway ${c.off}`); }
console.log('TRAFFIC LIVE (vehicles over the decks at the end of the run; the simulation region follows the camera on the Palace Bridge)');
for (const l of res.live) { if (l.offRoad) bad++; console.log(`  ${l.offRoad ? 'FAIL' : 'ok  '} ${l.id.padEnd(10)} vehicles on the deck ${l.vehicles}, off the roadway ${l.offRoad} ${l.kinds.join(' ')}`); }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
