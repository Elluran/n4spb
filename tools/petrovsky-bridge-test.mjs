// tools/petrovsky-bridge-test.mjs - walk + deckY + drive probe of the Petrovsky bridge group (Betancourt, Serny, Bolshoy Petrovsky; the WHSD fairway bridge is skyline: deckY only) in the real page
// (through tools/petrovsky-bridge-shot.mjs --eval: ONE heavy browser job, about 6 - 8 minutes).  Copy of the approach of tools/yelagin-bridge-test.mjs / bridges-drive.mjs.
//   1. WALK   the real Player.update with W held, yaw pointed at the next waypoint, along each pavement (right and left) from 14 m before the bridge to 14 m behind it and back: asserts it arrives, never falls
//             (feet within 0.35 m of services.bridges.deckY while on the deck), reports the largest step in y between frames.
//   2. RAIL   from the axis of the deck the walker pushes 4 s toward each side: it must stop at the railing (|v| <= hw) and stay at the deck height.
//   3. DECKY  services.bridges.deckY on a grid (holes / jumps), the 190 m prefilter entries (services.bridges.list) along the whole deck.
//   4. CAR    the red car (ctx.drive) is teleported 12 m before the first bank line on the right-hand carriageway, a lane-keeping controller drives it over the whole bridge to 10 m before the far end:
//             asserts it arrives within 150 s, never hits anything (car.events 'hit'), rides the deck (|car.y - deckY| <= 0.2) and reports the steepest grade and the top speed.
// usage: node tools/petrovsky-bridge-test.mjs [--nocar] [--nowalk] [--only betancourt,bolshoy-petrovsky,serny-bridge]
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const BE = await imp('src/world/bridges/petrovsky/betancourt.js'), BO = await imp('src/world/bridges/petrovsky/bolshoy.js'), SE = await imp('src/world/bridges/petrovsky/serny.js'), WH = await imp('src/world/bridges/petrovsky/whsd.js');
const { toWorld } = await imp('src/world/bridges/sites.js');
const ext = (R, s, v) => { const p = R.pos(Math.max(0, Math.min(R.len, s)), v), d = s < 0 ? s : s > R.len ? s - R.len : 0; return [p.x + p.tx * d, p.z + p.tz * d]; };
const line = (R, v, a, b, step = 18) => { const o = []; for (let s = a; s <= b + 1e-6; s += step) o.push(ext(R, s, v)); o.push(ext(R, b, v)); return o; };
const lineF = (R, vf, a, b, step = 18) => { const o = []; for (let s = a; s <= b + 1e-6; s += step) o.push(ext(R, s, vf(s))); o.push(ext(R, b, vf(b))); return o; };   // a pavement line whose lateral offset follows the platform widths: the railing now follows the drawn deck edge station by station (the ends taper to 13.7 m)
const smoothT = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const hwB = (full) => (s) => { const sp = BE.BETAN; const bump = 1 - smoothT((Math.abs(s - sp.sP) - 4.6) / 4.0), taper = smoothT(Math.min(s, BE.betanRoute().len - s) / 24); return sp.endHw + (full + 3.0 * bump - sp.endHw) * taper; };
const specs = [];
{ const R = BE.betanRoute(), S = BE.BETAN;
  specs.push({ id: 'betancourt', len: R.len, hwR: S.hwR, hwL: S.hwL, lane: S.med + S.road / 2, walks: { 'right-forward': lineF(R, (s) => Math.min(14.2, (12.4 + hwB(S.hwR)(s)) / 2 - 0.15), -14, R.len + 14), 'left-back': lineF(R, (s) => -Math.min(14.2, (12.4 + hwB(S.hwL)(s)) / 2 - 0.15), -14, R.len + 14).reverse() },
    axis: (s, v) => ext(R, s, v), tan: (s) => { const p = R.pos(s, 0); return [p.tx, p.tz]; }, railTests: [60, 300, 470, 700, 880], carLine: line(R, S.med + S.road / 2, -12, R.len + 12, 4), carLen: R.len }); }
{ const R = BO.bolshRoute(), S = BO.BOLSH;
  specs.push({ id: 'bolshoy-petrovsky', len: R.len, hwR: S.hwR, hwL: S.hwL, walks: { 'right-forward': line(R, 8.9, -14, R.len + 14), 'left-back': line(R, -9.6, -14, R.len + 14).reverse() }, axis: (s, v) => ext(R, s, v), tan: (s) => { const p = R.pos(s, 0); return [p.tx, p.tz]; }, railTests: [30, 100, 160, 220, 290],
    carLine: line(R, S.med + S.road / 2, -12, R.len + 12, 4), carLen: R.len }); }
{ const sp = SE.SERNY, HL = sp.len / 2, W = (u, v) => { const w = toWorld(sp, u, v); return [w.x, w.z]; }, T = (sp.b - 90) * Math.PI / 180;
  const ln = (v, a, b) => { const o = []; for (let u = a; u <= b + 1e-6; u += 6) o.push(W(u, v)); return o; }, carLine = []; for (let u = -HL - 24; u <= HL + 24; u += 3) carLine.push(W(u, 1.75));
  specs.push({ id: 'serny-bridge', len: sp.len + 2 * 14, hwR: sp.hw, hwL: sp.hw, walks: { 'right-forward': ln(4.7, -HL - 14, HL + 14), 'left-back': ln(-4.7, -HL - 14, HL + 14).reverse() }, axis: (s, v) => W(s - 14 - HL, v), tan: () => [Math.cos(T), Math.sin(T)], railTests: [14 + HL], carLine, carLen: 2 * HL + 48, sernyStart: 24 - 14 }); }
const sel = args.only ? specs.filter((s) => args.only.split(',').includes(s.id)) : specs;
const whsd = (() => { const R = WH.whsdRoute(); return { pylons: WH.WHSDP.pylonS.map((s) => { const p = R.pos(s, 0); return [p.x, p.z]; }), mid: (() => { const p = R.pos(R.len / 2, 0); return [p.x, p.z]; })(), len: R.len, ends: [R.pos(30, 0), R.pos(R.len - 30, 0)].map((p) => [p.x, p.z]) }; })();
const expr = `(() => {
  const ctx = window.__ctx, B = ctx.services.bridges, P = ctx.playerObj, specs = ${JSON.stringify(sel.map((s) => ({ id: s.id, len: s.len, hwR: s.hwR, hwL: s.hwL, walks: s.walks, carLine: s.carLine, carLen: s.carLen, rails: s.railTests.map((r) => ({ s: r, c: s.axis(r, 0), l: s.axis(r, -30), r: s.axis(r, 30) })), mid: s.axis(s.len / 2, 0) })))}, out = { walk: {}, rail: [], deck: {}, car: [] }, MODE = '${args.nowalk ? 'nowalk' : 'all'}', WH = ${JSON.stringify(whsd)};
  const yawDeg = (dx, dz) => Math.atan2(-dx, -dz) * 180 / Math.PI;
  if (MODE !== 'nowalk') {
    P.enabled = true; P.inputLock = 0;
    for (const sp of specs) for (const [name, pts] of Object.entries(sp.walks)) {
      const res = { reached: 0, total: pts.length - 1, fell: null, maxStep: 0, maxDev: 0, minY: 99, maxY: -99, frames: 0, stuck: null }; let prevY = null;
      window.__setCam(pts[0][0], null, pts[0][1], yawDeg(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), 0);
      P.keys.clear(); P.keys.add('KeyW'); P.keys.add('ShiftLeft');
      for (let k = 1; k < pts.length; k++) {
        const tx = pts[k][0], tz = pts[k][1]; let frames = 0, still = 0, last = [P.pos.x, P.pos.z];
        while (frames++ < 1800) {
          const dx = tx - P.pos.x, dz = tz - P.pos.z; if (Math.hypot(dx, dz) < 1.6) { res.reached = k; break; }
          P.yaw = Math.atan2(-dx, -dz); P.turn.yaw = 0; P.update(1 / 60); res.frames++;
          const dy = B.deckY(P.pos.x, P.pos.z);
          if (prevY !== null) res.maxStep = Math.max(res.maxStep, Math.abs(P.pos.y - prevY)); prevY = P.pos.y; res.minY = Math.min(res.minY, P.pos.y); res.maxY = Math.max(res.maxY, P.pos.y);
          if (dy !== null) { res.maxDev = Math.max(res.maxDev, Math.abs(P.pos.y - dy)); if (P.pos.y < dy - 1.0 && !res.fell) res.fell = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2), +dy.toFixed(2)]; }
          else if (P.pos.y < -1.5 && !res.fell) res.fell = [+P.pos.x.toFixed(1), +P.pos.z.toFixed(1), +P.pos.y.toFixed(2), null];
          if (frames % 30 === 0) { const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z]; if (mv < 0.4) { if (++still >= 6) { res.stuck = { leg: k, x: +P.pos.x.toFixed(1), z: +P.pos.z.toFixed(1) }; break; } } else still = 0; }
        }
        if (res.stuck || res.fell) break;
      }
      P.keys.clear(); for (const kk of ['maxStep', 'maxDev', 'minY', 'maxY']) res[kk] = +res[kk].toFixed(2); out.walk[sp.id + ' ' + name] = res;
    }
    // rails: from the axis push 4 s toward both sides
    for (const sp of specs) for (const r of sp.rails) for (const sg of [-1, 1]) {
      const c = r.c, tgt = sg < 0 ? r.l : r.r; window.__setCam(c[0], null, c[1], 0, 0); P.keys.clear(); P.keys.add('KeyW');
      let maxLat = 0, y0 = null; for (let f = 0; f < 240; f++) { P.yaw = Math.atan2(-(tgt[0] - P.pos.x), -(tgt[1] - P.pos.z)); P.update(1 / 60); maxLat = Math.max(maxLat, Math.hypot(P.pos.x - c[0], P.pos.z - c[1])); if (y0 === null) y0 = P.pos.y; }
      P.keys.clear(); out.rail.push({ id: sp.id, s: r.s, side: sg, reach: +maxLat.toFixed(2), limit: sg < 0 ? sp.hwL : sp.hwR, y: +P.pos.y.toFixed(2), deck: B.deckY(P.pos.x, P.pos.z) });
    }
  }
  // deckY: a grid along each axis (holes / jumps) + prefilter entries
  for (const sp of specs) {
    let holes = 0, jumps = 0, prev = null, maxSlope = 0; const stepM = 2;
    const skipN = sp.id === 'serny-bridge' ? 9 : 4;   // the car line starts / ends on the streets before / after the bank (no deck there)
    for (let wi = 0; wi < sp.carLine.length; wi++) { const w = sp.carLine[wi], y = B.deckY(w[0], w[1]); if (y === null) { if (wi >= skipN && wi < sp.carLine.length - skipN) holes++; } else { if (prev !== null) { const d = Math.abs(y - prev[0]) / (Math.hypot(w[0] - prev[1], w[1] - prev[2]) || 1); maxSlope = Math.max(maxSlope, d); if (Math.abs(y - prev[0]) > 0.6) jumps++; } prev = [y, w[0], w[1]]; } }
    let far = 0; for (const w of sp.carLine) if (!B.list.some((b) => (b.x - w[0]) ** 2 + (b.z - w[1]) ** 2 < 190 * 190)) far++;
    out.deck[sp.id] = { holes, jumps, maxSlope: +maxSlope.toFixed(3), uncoveredByPrefilter: far, entries: B.list.filter((b) => b.id === sp.id).length, per: B.stats.per[sp.id], masts: B.masts.filter((q) => q.id === sp.id).length, failed: B.failed.length, stepM };
  }
  out.deck.whsd = { pylon0: B.deckY(WH.pylons[0][0], WH.pylons[0][1]), mid: B.deckY(WH.mid[0], WH.mid[1]), ends: WH.ends.map((e) => B.deckY(e[0], e[1])), entries: B.list.filter((b) => b.id === 'whsd-petrovsky').length, per: B.stats.per['whsd-petrovsky'] };
  // the car
  const D = ctx.drive;
  if (D && ${args.nocar ? 'false' : 'true'}) for (const sp of specs) {
    const L = sp.carLine, p0 = L[0], p1 = L[2], yaw0 = Math.atan2(p1[0] - p0[0], p1[1] - p0[1]);
    D.teleport(p0[0], p0[1], yaw0);
    const r = { trace: [], id: sp.id, steps: 0, hits: 0, maxDev: 0, maxY: -9, topSpeed: 0, end: null, arrived: false, maxGrade: 0, lat: 0 }; let idx = 0, prevY = null, prevXZ = null, t = 0;
    const frames = (i, car) => {
      let best = idx, bd = 1e9; for (let k = Math.max(0, idx - 2); k < Math.min(L.length, idx + 12); k++) { const d = Math.hypot(L[k][0] - car.x, L[k][1] - car.z); if (d < bd) { bd = d; best = k; } } idx = best; r.lat = Math.max(r.lat, bd);
      const dy = B.deckY(car.x, car.z); if (dy !== null) r.maxDev = Math.max(r.maxDev, Math.abs(car.y - dy)); r.maxY = Math.max(r.maxY, car.y); r.topSpeed = Math.max(r.topSpeed, car.speed);
      if (prevY !== null && i % 10 === 0) { const dd = Math.hypot(car.x - prevXZ[0], car.z - prevXZ[1]); if (dd > 0.3) r.maxGrade = Math.max(r.maxGrade, Math.abs(car.y - prevY) / dd); } if (i % 10 === 0) { prevY = car.y; prevXZ = [car.x, car.z]; }
      if (i % 20 === 0) { r.trace.push([+car.x.toFixed(1), +car.z.toFixed(1), +car.y.toFixed(2), +car.speed.toFixed(1), dy === null ? null : +dy.toFixed(2), idx]); if (r.trace.length > 60) r.trace.shift(); }
      for (const ev of car.events || []) if (ev.type === 'hit') { r.hits++; if (!r.hitAt) r.hitAt = [+car.x.toFixed(1), +car.z.toFixed(1), +car.y.toFixed(2), idx]; }
    };
    const inp = () => { const car = D.car, T = L[Math.min(L.length - 1, idx + 5)], dx = T[0] - car.x, dz = T[1] - car.z, l = Math.hypot(dx, dz) || 1, hx = Math.sin(car.yaw), hz = Math.cos(car.yaw), across = (dx / l) * hz - (dz / l) * hx; return { thr: car.speed < 36 ? 1 : 0, brk: car.speed > 46 ? 1 : 0, steer: Math.max(-1, Math.min(1, 2.4 * across)), hand: false, nitro: false }; };
    for (let k = 0; k < 75; k++) { D.sim(2, inp, frames); r.steps++; t += 2; if (idx >= L.length - 6) { r.arrived = true; break; } }
    r.end = [+D.car.x.toFixed(1), +D.car.z.toFixed(1), +D.car.y.toFixed(2)]; r.idx = idx; r.of = L.length; r.t = t; r.maxDev = +r.maxDev.toFixed(2); r.maxY = +r.maxY.toFixed(2); r.topSpeed = +r.topSpeed.toFixed(1); r.maxGrade = +r.maxGrade.toFixed(3); r.lat = +r.lat.toFixed(1); delete r.steps;
    out.car.push(r);
  }
  if (D && D.active) D.exit(true);
  return out;
})()`;
const only = 'environment,streets,bridges' + (args.nocar ? '' : ',drive');
const cam0 = BE.betanRoute().pos(300, 0);
const r = spawnSync('node', [path.join(root, 'tools/petrovsky-bridge-shot.mjs'), '--only', only, '--cams', `${cam0.x},${cam0.z},0,0`, '--out', 'shots/petrovsky-bridges/_test', '--t', '3', '--load-timeout', '1500000', '--protocol-timeout', '1500000', '--eval', expr], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 27 });
const ln = r.stdout.split(/\r?\n/).find((l) => l.startsWith('eval:'));
if (!ln) { console.log(r.stdout.slice(-3500), r.stderr.slice(-2000)); process.exit(1); }
const o = JSON.parse(ln.slice(5)); let bad = 0;
console.log('WALK');
for (const [n, w] of Object.entries(o.walk)) { const ok = w.reached === w.total && !w.fell && !w.stuck && w.maxDev <= 0.4 && w.maxStep <= 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(34)} reached ${w.reached}/${w.total}, fell ${JSON.stringify(w.fell)}, stuck ${JSON.stringify(w.stuck)}, |y - deckY| <= ${w.maxDev}, step ${w.maxStep}, y ${w.minY}..${w.maxY}`); }
console.log('RAIL');
for (const q of o.rail) { const ok = q.reach <= q.limit + 0.4 && q.deck !== null && Math.abs(q.y - q.deck) < 0.5; if (!ok) bad++; console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${q.id} s ${q.s} side ${q.side}: reach ${q.reach} (limit ${q.limit}), y ${q.y}, deck ${q.deck === null ? null : q.deck.toFixed(2)}`); }
console.log('DECKY'); for (const [n, d] of Object.entries(o.deck)) { if (n !== 'whsd' && (d.holes || d.jumps || d.uncoveredByPrefilter || !d.entries || d.failed)) bad++; console.log(' ', n, JSON.stringify(d)); }
console.log('CAR'); for (const c of o.car) { const ok = c.arrived && !c.hits && c.maxDev <= 0.25; if (!ok) bad++; if (args.trace && !ok) console.log('TRACE', c.id, JSON.stringify(c.trace)); console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${c.id}: arrived ${c.arrived} (${c.idx}/${c.of} in ${c.t} s), hits ${c.hits}, |y - deckY| <= ${c.maxDev}, y max ${c.maxY}, top ${c.topSpeed} m/s, grade ${c.maxGrade}, lane error <= ${c.lat} m, end ${JSON.stringify(c.end)}`); }
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
