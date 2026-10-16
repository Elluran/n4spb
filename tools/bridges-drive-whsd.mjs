// Drive + traffic probe of the WHSD viaduct (bridges/whsd.js, data sites-vo2.js WHSD) in the real page (through tools/shot.mjs --eval), like tools/bridges-drive.mjs:
//   1. DRIVE: the red car is put at the first station of the southbound deck (W, z -300), a lookahead controller follows the centre line of the deck to z 860 (the play area ends at z 900) and back on the northbound
//      deck (E). Asserts: it arrives both ways, never leaves the deck (distance to the centre line <= 5 m), car.y = deckY + 0.03 within 12 cm, steepest grade <= 8 %, no collision events.
//   2. COVER: services.bridges.deckY answers on both decks every 10 m (z -290 .. 880, centre lines and +-5 m) and a list entry lies within 190 m of every sample (traffic prefilter); the lanes of the lane graph on the WHSD
//      ways (lane.bridge) stay within 5 m of the deck centre lines.
//   3. LIVE: the vehicles of services.traffic that are on the viaduct after --t seconds round the camera (default on the viaduct at z 100): count, none off the deck, none under it (y 0 on a deck point).
// usage: node tools/bridges-drive-whsd.mjs [--t 60] [--notraffic] [--nodrive]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const V = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites-vo2.js')).href);
const lineOf = (k) => V.WHSD.lines[k].filter(([, z]) => z <= 880);
// the drive covers the AT-GRADE stretch as well (whsd-ground.js, 1.77 km from the portals to the first station of the viaduct) unless --viaduct-only
const G = V.WHSD.ground, cat = (a, b) => a.concat(b.slice(1));
const specs = args['viaduct-only'] || !G ? { W: lineOf('W'), E: lineOf('E').slice().reverse() } : { W: cat(G.W, lineOf('W')), E: cat(lineOf('E').slice().reverse(), G.E.slice().reverse()) };
const expr = (mode) => `(() => {
  const MODE = '${mode}', ctx = window.__ctx, D = MODE === 'drive' ? ctx.drive : null, B = ctx.services.bridges, st = ctx.services.streets, out = { drive: [], cover: null, live: null };
  const lines = ${JSON.stringify(specs)}, hw = ${V.WHSD.hw};
  const near = (pts, x, z) => { let best = 1e9, bi = 0, bt = 0; for (let i = 0; i + 1 < pts.length; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], l2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - pts[i][0]) * dx + (z - pts[i][1]) * dz) / l2)), d = Math.hypot(x - pts[i][0] - dx * t, z - pts[i][1] - dz * t); if (d < best) { best = d; bi = i; bt = t; } } return { d: best, i: bi, t: bt }; };
  const aheadPt = (pts, x, z, look) => { const n = near(pts, x, z); let i = n.i, rem = look, px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * n.t, pz = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * n.t; while (i + 1 < pts.length) { const l = Math.hypot(pts[i + 1][0] - px, pts[i + 1][1] - pz); if (l >= rem) { return [px + (pts[i + 1][0] - px) * rem / l, pz + (pts[i + 1][1] - pz) * rem / l]; } rem -= l; px = pts[i + 1][0]; pz = pts[i + 1][1]; i++; } return [px, pz]; };
  if (MODE === 'traffic') {
    let n = 0, holes = 0, far = 0;
    for (const k of ['W', 'E']) { const pts = lines[k]; for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); for (let s = 0; s < l; s += 10) { const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * s / l, z = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * s / l; if (z < -290) continue; n++; if (B.deckY(x, z) === null) holes++; if (!B.list.some((b) => (b.x - x) ** 2 + (b.z - z) ** 2 < 190 * 190)) far++; } } }
    let lanes = 0, off = 0, laneLen = 0;
    const ids = ${JSON.stringify(V.WHSD.osm)}; for (const l of (st && st.lanes) || []) { if (!ids.includes(l.road && l.road.id)) continue; let on = 0, bad = 0; for (const p of l.pts) { const x = p[0] ?? p.x, z = p[1] ?? p.z; if (z < -290 || z > 1020 || x > -7700 || x < -7960) continue; on++; if (Math.min(near(lines.W, x, z).d, near(lines.E, x, z).d) > 5) bad++; } if (on >= 2) { lanes++; off += bad; laneLen += l.len; } }
    out.cover = { samples: n, holes, far, lanes, off, laneLen: Math.round(laneLen) };
    const vs = ((ctx.services.traffic && ctx.services.traffic.vehicles) || []).filter((v) => B.deckY(v.x, v.z) !== null);
    out.live = { vehicles: vs.length, under: vs.filter((v) => Number.isFinite(v.y) && Math.abs(v.y - B.deckY(v.x, v.z)) > 1.5).length, kinds: [...new Set(vs.map((v) => v.kind))].slice(0, 6) };
  }
  if (D) for (const k of ['W', 'E']) {
    const pts = lines[k], p0 = pts[0], p1 = pts[1], yaw = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
    D.teleport(p0[0], p0[1], yaw);
    const r = { id: 'whsd-' + k, maxDist: 0, maxY: -9, yErr: 0, grade: 0, hits: 0, reached: false, t: 0 }, end = pts[pts.length - 1];
    let prevY = null, prevS = null, done = false, tt = 0, odo = 0, lx = null, lz = null;
    const inp = () => {
      const car = D.car, T = aheadPt(pts, car.x, car.z, 14), hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), dx = T[0] - car.x, dz = T[1] - car.z, dl = Math.hypot(dx, dz) || 1;
      const leftness = (dx / dl) * hz - (dz / dl) * hx, left = Math.hypot(end[0] - car.x, end[1] - car.z), vmax = Math.min(24, 6 + 0.5 * left), sp = Math.hypot(car.vx, car.vz);
      return { thr: done ? 0 : sp > vmax ? 0 : 1, brk: done || sp > vmax + 2 ? 1 : 0, steer: Math.max(-1, Math.min(1, 2.4 * leftness)), hand: false, nitro: false };
    };
    const frames = (i, car) => {
      const n = near(pts, car.x, car.z); r.maxDist = Math.max(r.maxDist, n.d); r.maxY = Math.max(r.maxY, car.y);
      for (const ev of car.events || []) if (ev.type === 'hit') { r.hits++; (r.hitsAt ||= []).push([+car.x.toFixed(1), +car.z.toFixed(1), +car.y.toFixed(1), +ev.v.toFixed(1)]); }
      if (lx !== null) odo += Math.hypot(car.x - lx, car.z - lz); lx = car.x; lz = car.z;
      if (i % 6 === 0) { const dy = B.deckY(car.x, car.z); if (dy !== null) r.yErr = Math.max(r.yErr, Math.abs(car.y - dy - 0.03)); if (prevY !== null && Math.abs(odo - prevS) > 0.5) r.grade = Math.max(r.grade, Math.abs(car.y - prevY) / Math.abs(odo - prevS)); prevY = car.y; prevS = odo; }
      tt += 1 / 60; if (!done && Math.hypot(car.x - end[0], car.z - end[1]) < 9) { done = true; r.reached = true; r.t = +tt.toFixed(1); }
    };
    for (let q = 0; q < 170 && !done; q++) D.sim(2, inp, frames);
    r.end = [D.car.x, D.car.y, D.car.z].map((v) => +v.toFixed(1)); r.maxDist = +r.maxDist.toFixed(2); r.maxY = +r.maxY.toFixed(2); r.yErr = +r.yErr.toFixed(3); r.grade = +r.grade.toFixed(3); r.odo = Math.round(odo);
    out.drive.push(r);
  }
  if (D && D.active) D.exit(true);
  return out;
})()`;
const camStr = args.cam || '-7840,16,100,-160,-8';
const run = (mode, only, t) => {
  const r = spawnSync('node', [path.join(root, 'tools/shot.mjs'), '--only', only, '--cams', camStr, '--out', 'shots/bridges2/_drive_whsd_' + mode, '--t', t, '--eval', expr(mode)], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
  const line = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
  if (!line) { console.log(r.stdout.slice(-3000), r.stderr.slice(-2000)); process.exit(1); }
  return JSON.parse(line.slice(5));
};
const res = { drive: [], cover: null, live: null };
if (!args.notraffic) { const a = run('traffic', 'environment,streets,city,bridges,traffic', args.t || '60'); res.cover = a.cover; res.live = a.live; }
if (!args.nodrive) res.drive = run('drive', 'environment,streets,city,bridges,drive', '5').drive;
let bad = 0;
console.log('DRIVE (the red car along the centre line of the southbound deck W, then the northbound deck E, z -300 .. 860)');
for (const d of res.drive) { const ok = d.reached && d.maxDist <= 5 && d.yErr <= 0.12 && d.grade <= 0.08 && d.hits === 0; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${d.id}: reached ${d.reached} in ${d.t} s (${d.odo} m), max distance from the centre line ${d.maxDist} m, deck height error max ${d.yErr} m, top y ${d.maxY}, steepest grade ${(d.grade * 100).toFixed(1)} %, hits ${d.hits} ${JSON.stringify(d.hitsAt || [])}, end ${JSON.stringify(d.end)}`); }
if (res.cover) { const c = res.cover, ok = c.holes === 0 && c.far === 0 && c.off === 0; if (!ok) bad++; console.log(`COVER ${ok ? 'ok  ' : 'FAIL'} samples ${c.samples}: deck holes ${c.holes}, outside the 190 m prefilter ${c.far}; lanes of the four WHSD ways in the lane graph ${c.lanes} (the motorway has none: no traffic rides it) (${c.laneLen} m), lane points off the decks ${c.off}`); }
if (res.live) { const l = res.live, ok = l.under === 0; if (!ok) bad++; console.log(`LIVE  ${ok ? 'ok  ' : 'FAIL'} vehicles on the viaduct ${l.vehicles}, riding more than 1.5 m off the deck height ${l.under} ${l.kinds.join(' ')}`); }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
