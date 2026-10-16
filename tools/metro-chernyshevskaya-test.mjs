// End-to-end test of CHERNYSHEVSKAYA (line 1) in the real renderer (headless Edge / Chrome with GPU, puppeteer-core): ?only=metro. The harness (server, page helpers, ride helpers) is a copy of
// tools/metro-test.mjs (sections 1-11 there); this file adds the sections of the station (metro/st-chernyshevskaya.js, metro/links-north.js, data/metro-chernyshevskaya.js):
//   node tools/metro-chernyshevskaya-test.mjs [--q medium] [--out shots/metro/che] [--only 1,2,3,4,5]
//   1 built: the hall, the network row, the ways out / in, the real tunnel keys both ways   2 geometry: the ticket hall inside w22999175, the shaft mouth inside it, no ground hole on a carriageway,
//   the 4-lane incline   3 the way in (pavement -> west doorway -> turnstiles -> DOWN lane -> central hall) and the way out (N platform -> UP lane -> turnstiles -> north door) with real physics
//   4 rides: Vosstaniya N -> Chernyshevskaya through the real tunnel, arriving on the N (+x) platform; Chernyshevskaya S -> Vosstaniya (real, S platform); Chernyshevskaya N -> Ploshchad Lenina
//   (generic hall)   5 screenshots of the halls, the incline, the lower hall and the ticket hall (luma). Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro/che');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SECTIONS = new Set((args.only || '1,2,3,4,5').split(',').map((s) => s.trim()));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const problems = [], logs = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { problems.push(msg); console.log('  FAIL', msg); } return !!cond; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let page;
try {
  page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  if (fs.existsSync(threeRoot)) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  const q = new URLSearchParams({ q: args.q || 'medium', stats: '1', only: args.modules || 'metro' }); for (const kv of String(args.extra || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); q.set(k, v || '1'); }       // --extra metrodbg=base : more URL parameters
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  for (const e of await page.evaluate(() => window.__errors || [])) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  await page.click('#go'); await sleep(800);

  // ---------------------------------------------------------------- in-page helpers
  await page.evaluate(() => {
    const C = () => window.__ctx, P = () => window.__ctx.playerObj;
    /** fast-forward the simulation (no rendering): physics + updates + zones. keys(t) -> array of held keys; stop(p, t) -> bool */
    window.__ff = (sec, dt = 1 / 30, keys = null, stop = null) => {
      const p = P(), log = []; let n = 0;
      for (let t = 0; t < sec; t += dt, n++) {
        p.keys = new Set(keys ? keys(t) : []);
        window.__advance(dt); C().physics.refreshDynamic(); p.update(dt);
        window.__zones.update(dt); C().interact.update();
        log.push({ t, x: p.pos.x, y: p.pos.y, z: p.pos.z, g: p.onGround, ride: !!p.ride });
        if (stop && stop(p, t)) break;
      }
      p.keys = new Set(); return log;
    };
    window.__pose = () => { const p = P(); return { x: p.pos.x, y: p.pos.y, z: p.pos.z, g: p.onGround, fly: p.fly, ride: p.riding, yaw: p.yaw * 180 / Math.PI, cy: window.__camera.position.y, indoor: C().indoor.amount, zone: C().indoor.zone?.indoor?.name || C().indoor.zone?.def?.indoor?.name || C().indoor.zone?.id || null, time: C().time }; };
    /** walk a route [[x, z, tol?], ...] from start [x, z, y] with the real player physics, steering toward each waypoint */
    window.__walk = (start, points) => {
      const p = C().playerObj; window.__setCam(start[0], start[2], start[1], 0, 0, true);
      let reached = 0, t = 0, trace = null;
      for (const [i, w] of points.entries()) {
        let tt = 0, best = 1e9;
        while (tt < 60) {
          const dx = w[0] - p.pos.x, dz = w[1] - p.pos.z, d = Math.hypot(dx, dz); best = Math.min(best, d);
          if (d < (w[2] || 0.9)) { reached = i + 1; break; }
          p.yaw = Math.atan2(-dx, -dz); const step = d < 3 ? 0.03 : 0.1; window.__ff(step, 1 / 60, () => (d < 5 ? ['KeyW'] : ['KeyW', 'ShiftLeft'])); tt += step; t += step;
        }
        if (reached !== i + 1) { const ph = window.__ctx.physics; trace = [i, +best.toFixed(1), +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), w.map((v) => +v.toFixed(1)), 'near:', [...ph._query(p.pos.x, p.pos.z, 2)].filter((it) => it.type !== 'hole').map((it) => { const [lx, lz] = ph._local(it, p.pos.x, p.pos.z); return [it.type, +(Math.abs(lx) - it.hw).toFixed(2), +(Math.abs(lz) - it.hd).toFixed(2), +it.y0.toFixed(1), it.y1 !== undefined ? +it.y1.toFixed(1) : (it.top !== undefined ? +it.top.toFixed(1) : 'r')]; }).filter((q) => q[1] < 0.8 && q[2] < 0.8)]; break; }
      }
      return { reached, of: points.length, t, trace, x: p.pos.x, y: p.pos.y, z: p.pos.z };
    };
    window.__carOffset = (st, i) => (i - (st.cars - 1) / 2) * (st.len + 0.45);
    /** fast-forward until the absolute simulation time tAbs (e.g. a moment of a ride: session.legs[0].tDepart + 8) */
    window.__ffTo = (tAbs, stop = null) => window.__ff(Math.max(0, tAbs - window.__ctx.time), 1 / 30, null, stop);
    window.__lum = async (b64) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const w = img.width, h = img.height, cv = new OffscreenCanvas(w, h), g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); img.close();                 // a software canvas: the GPU canvas returned a wrong readback after many screenshots (59 % white for a normal picture)
      const d = g.getImageData(0, 0, w, h).data; let s = 0, dark = 0, white = 0; const n = w * h;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; if (l < 22) dark++; if (l > 240) white++; }
      return { mean: s / n, dark: dark / n, white: white / n };
    };
  });
  const pose = () => page.evaluate(() => window.__pose());
  const cam = async (x, y, z, yaw, pitch, stand = false) => { await page.evaluate((a) => window.__setCam(...a), [x, y, z, yaw, pitch, stand]); await sleep(300); };
  const shot = async (name) => { const f = `${out}_${name}.png`; const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return { f, b64, ...(await page.evaluate((b) => window.__lum(b), b64)) }; };
  const chip = () => page.evaluate(() => { const c = document.getElementById('interact'); return { show: c.classList.contains('show'), text: c.textContent }; });
  const toast = () => page.evaluate(() => document.querySelector('#toast .t-name')?.textContent || '');
  const frames = (n = 3) => page.evaluate((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const lumOk = (s, what, lo = 55, hi = 205) => ok(s.mean > lo && s.mean < hi && s.dark < 0.1 && s.white < 0.1, `${what}: neither dark nor white (mean ${s.mean.toFixed(0)}, dark ${(s.dark * 100).toFixed(1)} %, white ${(s.white * 100).toFixed(1)} %)`);
  // helper: frame -> world
  const M = await ev(() => { const m = window.__ctx.metro; return { frames: { vosstaniya: window.__ctx.layout.FRAMES?.vosstaniya || null } }; });
  void M;
  // ---------------------------------------------------------------- ride helpers (sections 3, 4, 9, 10, 11)
  // Boarding = the chip «Войти» + interact.use() (-> ride.board; no destination panel). A ride is a CHAIN OF LEGS in REAL time: the train leaves on the platform timetable (6-28 s), runs the real hop
  // (87-240 s), stops at EVERY station with open doors for 25 / 35 s. session.state = { k (leg index, -1 before the first departure), phase: boarding|closing|waiting|running|stopped|open },
  // session.legs[k] = { to, destRt, destTk, route, tClose, tDepart, tArrive, terminus }. Getting off = the chip «Выйти» (open / boarding / closing) or walking out of the platform-side door.
  const RIDE_FF = 360;      // s of simulated time that cover the longest first leg: wait 28 + doors 3.5 + run 240 + doors 3.5 (and a whole further hop for the multi-stop check), with a reserve
  /** stand at the platform edge beside the doors of track `key` of station `id`, face the train, run until it stands with open doors */
  const atPlatform = (id, key) => ev((id, key) => {
    const m = window.__ctx.metro, rt = m.stations[id], tk = rt.platform.trackByKey(key), sx = key === 'S' ? -1 : 1, fy = tk.fy ?? rt.hall.FY;
    const [x, z] = rt.W(sx * (rt.hall.EDGE - 0.9), 0); window.__setCam(x, fy, z, 0, 0, true);
    const f = rt.frame, dx = Math.cos(f.yaw) * sx, dz = -Math.sin(f.yaw) * sx; window.__ctx.playerObj.yaw = Math.atan2(-dx, -dz);                       // look at the train (local -x for the S track, +x for the N track)
    window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95; });
    const s = rt.platform.state(tk, window.__ctx.time); return { phase: s.phase, open: s.open, stock: tk.stock, fy, y: window.__ctx.playerObj.pos.y };
  }, id, key);
  /** the player already stands beside the open doors: the chip «Войти», a screenshot, interact.use(); asserts the ride started and that the first leg's stop is `nextId` */
  const boardChip = async (label, shotName, nextId) => {
    await frames(3); const c1 = await chip(); ok(c1.show && /Войти/.test(c1.text), `${label}: boarding offered ("${c1.text}")`);
    if (shotName) { const sp = await shot(shotName); lumOk(sp, `${label}: platform with a train`); }
    await ev(() => window.__ctx.interact.use()); await sleep(400);
    const b = await ev(() => { const S = window.__ctx.metro.ride.session, l = S && S.legs[0]; return { ride: !!window.__ctx.playerObj.riding, legs: S ? S.legs.length : 0, next: l ? l.to.id : null, real: l ? !!l.route.real : false, phase: S && S.state ? S.state.phase : null, t: window.__ctx.time, tClose: l ? l.tClose : 0, tDepart: l ? l.tDepart : 0 }; });
    ok(b.ride && b.legs > 0, `${label}: boarded (riding ${b.ride}, ${b.legs} legs ahead)`);
    ok(b.next === nextId, `${label}: the next stop is ${nextId} (${b.next})`);
    return b;
  };
  /** run (no rendering) until the rider's train stands with open doors at stop k (or the budget ends); returns the stop */
  const rideTo = (k) => ev((k, budget) => {
    const R = window.__ctx.metro.ride;
    window.__ff(budget, 1 / 30, null, () => { const s = R.session && R.session.state; return !!s && s.phase === 'open' && s.k >= k; });
    const S = R.session, st = S && S.state, leg = st && st.leg;
    if (!leg) return { gone: true, ride: !!window.__ctx.playerObj.riding };
    const rt = leg.destRt, tk = leg.destTk;
    return { gone: false, phase: st.phase, k: st.k, ur: st.ur, to: leg.to.id, dest: rt.id, shown: rt.shownId || null, real: !!leg.route.real, terminus: leg.terminus, fy: tk.fy ?? rt.hall.FY, ride: !!window.__ctx.playerObj.riding, t: window.__ctx.time };
  }, k, RIDE_FF);
  /** run to `after` seconds past the first departure and take the picture from inside the car (lo / hi given: lumOk, else the looser car check) */
  const carShot = async (name, after, label, lo, hi) => {
    await ev((a) => { window.__ffTo(window.__ctx.metro.ride.session.legs[0].tDepart + a); }, after); await frames(2);
    const s = await shot(name);
    if (lo === undefined) ok(s.mean > 30 && s.mean < 215 && s.white < 0.1 && s.dark < 0.35, `${label}: not black / white (mean ${s.mean.toFixed(0)}, dark ${(s.dark * 100).toFixed(1)} %)`);
    else lumOk(s, label, lo, hi);
    return s;
  };
  /** at an open stop `s` (rideTo): the chip «Выйти», interact.use(), the pose is on the platform of the destination hall (y = the level of the track, inside the hall frame) */
  const alightChip = async (label, s, yCheck = true) => {
    await frames(2); const c2 = await chip(); ok(c2.show && /Выйти/.test(c2.text), `${label}: get-off prompt ("${c2.text}")`);
    await ev(() => window.__ctx.interact.use()); await sleep(300);
    const pa = await ev((id) => { const p = window.__pose(), rt = window.__ctx.metro.stations[id], [lx, lz] = rt.L(p.x, p.z); return { ...p, lx, lz, PZ: rt.hall.PZ, session: !!window.__ctx.metro.ride.session }; }, s.dest);
    ok(!pa.ride && !pa.session && Math.abs(pa.lx) < 12 && Math.abs(pa.lz) <= pa.PZ + 1 && (!yCheck || Math.abs(pa.y - s.fy) < 0.3), `${label}: got off onto the platform of ${s.dest} (y ${pa.y.toFixed(1)}, expected ${s.fy}; hall x ${pa.lx.toFixed(1)} z ${pa.lz.toFixed(1)})`);
    return pa;
  };
  /** one whole ride: platform of `id` / `key`, board, the first stop must be `next` shown in the hall `dest` ('generic' = the shared generic hall), the car picture, get off. o: { pf (screenshot prefix), real, yCheck, arr (arrival picture) } */
  const rideFlow = async (id, key, next, dest, label, o = {}) => {
    const pf = o.pf || 'r', st = await atPlatform(id, key);
    ok(st.phase === 'dwell' && st.open > 0.95 && (o.yCheck === false || Math.abs(st.y - st.fy) < 0.2), `${label}: on the platform (y ${st.y.toFixed(1)}), a train stands with open doors (${st.stock})`);
    const b = await boardChip(label, `${pf}_${id}_${key}`, next);
    if (!b.ride) return { b, s: { gone: true, real: false }, pa: { ride: false, y: 1e9 } };
    await carShot(`${pf}_car_${id}_${key}`, 8, `${label}: inside the car`);
    const s = await rideTo(0);
    ok(!s.gone && s.k === 0 && s.phase === 'open', `${label}: the train stopped at ${next} and the doors are open (${s.phase}, ${s.ur === undefined ? '-' : s.ur.toFixed(1)} s after the departure)`);
    if (s.gone) return { b, s: { ...s, real: false }, pa: { ride: !!s.ride, y: 1e9 } };
    ok(s.to === next && s.dest === dest, `${label}: first stop ${next} in the hall of ${dest} (${s.to} / ${s.dest})`);
    if (o.real != null) ok(s.real === o.real, `${label}: ${o.real ? 'the real tunnel' : 'the generic tunnel'} (route.real ${s.real})`);
    if (dest === 'generic') ok(s.shown === next, `${label}: the generic hall shows ${next} (${s.shown})`);
    const pa = await alightChip(label, s);
    if (o.arr) { const sa = await shot(`${pf}_arr_${dest}_${key}`); lumOk(sa, `${label}: arrival platform`); }
    return { b, s, pa };
  };

  // ================================================================ Chernyshevskaya
  const ID = 'chernyshevskaya';
  // ---------------------------------------------------------------- 1. built: hall, network row, routes, the real tunnel to Vosstaniya both ways
  if (SECTIONS.has('1')) {
    console.log('1. Chernyshevskaya: built, network, routes, real tunnel');
    const b = await ev((id) => { const m = window.__ctx.metro, p = m.petro || {}, che = p.che || p.chernyshevskaya || null, re = m.env.real || {};
      const len = (k) => (re[k] ? +re[k].length.toFixed(0) : 0);
      return { rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!m.debug.exits[id], entry: !!m.debug.entries[id], builder: !!che, la: len('chernyshevskaya>vosstaniya'), lb: len('vosstaniya>chernyshevskaya'),
        FY: m.stations[id] ? m.stations[id].hall.FY : null, PZ: m.stations[id] ? m.stations[id].hall.PZ : null, link: m.debug.northLinks || null }; }, ID);
    console.log('   ', JSON.stringify(b));
    ok(b.rt && b.net && b.exit && b.entry, `chernyshevskaya: real hall, built in the network, a way out and a way in (${JSON.stringify({ rt: b.rt, net: b.net, exit: b.exit, entry: b.entry })})`);
    ok(b.builder, 'chernyshevskaya: the builder result is published under ctx.metro.petro (che)');
    ok(b.la > 1300 && b.la < 2200 && b.lb > 1300 && b.lb < 2200, `the real tunnel Chernyshevskaya <-> Vosstaniya exists both ways (${b.la} m / ${b.lb} m)`);
    ok(b.FY === -70 || b.FY === -65.8, `platform level ${b.FY}`);
  }
  // ---------------------------------------------------------------- 2. geometry: the ticket hall inside its house, the shaft mouth inside it, no hole on a carriageway / in the water, the 4-lane incline
  if (SECTIONS.has('2')) {
    console.log('2. Chernyshevskaya: vestibule and incline geometry');
    const g = await ev((id) => {
      const c = window.__ctx, L = c.L, m = c.metro, p = m.petro || {}, che = p.che || p.chernyshevskaya, bad = [];
      if (che && che.room) for (const [x, z] of che.room.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room', +x.toFixed(1), +z.toFixed(1)]);
      for (const s of L.GROUND_HOLES.filter((q) => q.station === id)) {
        const cs = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * cs + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * cs; if (L.isOnRoad(x, z, 0) || L.waterwayAt(x, z)) bad.push(['hole ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (s.kind === 'escalator' && !L.insideBuilding(x, z, 0)) bad.push(['shaft outside its house ' + s.id, +x.toFixed(1), +z.toFixed(1)]); }
      }
      const e = che && che.esc, lanes = e ? e.esc.length : 0, up = e ? e.esc.filter((q) => q.dir > 0).length : 0, len = e ? +e.LEN.toFixed(1) : 0;
      const dws = (L.DOORWAYS || []).filter((d) => d.station === id).map((d) => d.id);
      const pav = c.services.metro && c.services.metro.pavilions ? !!c.services.metro.pavilions.w22999175 : null;
      return { bad, lanes, up, len, dws, holes: L.GROUND_HOLES.filter((q) => q.station === id).length, pav };
    }, ID);
    console.log('   ', JSON.stringify(g));
    ok(g.bad.length === 0, `ticket hall inside w22999175, the shaft mouth inside it, no hole on a carriageway / in the water (${g.bad.length ? JSON.stringify(g.bad) : 'all clear'})`);
    ok(g.lanes === 4 && g.up === 2, `4-lane incline, 2 lanes up (${g.lanes} / ${g.up})`);
    ok(g.len > 125 && g.len < 145, `incline slope length ${g.len} m (record 131.6 m)`);
    ok(g.dws.includes('chernyshevskaya-in') && g.dws.includes('chernyshevskaya-out') && g.holes === 1, `doorways ${g.dws.join(', ')}, ${g.holes} ground hole`);
    if (g.pav !== null) ok(g.pav, 'ctx.services.metro.pavilions lists w22999175');
  }
  // ---------------------------------------------------------------- 3. the way in and the way out with real physics (window.__walk)
  if (SECTIONS.has('3')) {
    console.log('3. Chernyshevskaya: way in, way out');
    const rin = await ev((id) => { const w = window.__ctx.metro.debug.entries[id], res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, ID);
    console.log(`   way in: reached ${rin.reached}/${rin.of}, ${rin.t.toFixed(0)} s, y ${rin.y.toFixed(1)}, hall x ${rin.lx.toFixed(1)} z ${rin.lz.toFixed(1)} ${rin.trace ? JSON.stringify(rin.trace) : ''}`);
    ok(rin.reached === rin.of && Math.abs(rin.y - rin.endY) < 0.4 && Math.abs(rin.lx) < 9, 'chernyshevskaya: walked in from the pavement, down the incline and into the central hall');
    const rout = await ev((id) => { const ex = window.__ctx.metro.debug.exits[id], res = window.__walk(ex.start, ex.points); return { ...res, out: ex.out, d: Math.hypot(res.x - ex.out[0], res.z - ex.out[1]) }; }, ID);
    console.log(`   way out: reached ${rout.reached}/${rout.of}, ${rout.t.toFixed(0)} s, y ${rout.y.toFixed(1)}, ${rout.d.toFixed(1)} m from the pavement point ${rout.trace ? JSON.stringify(rout.trace) : ''}`);
    ok(rout.reached === rout.of && Math.abs(rout.y) < 0.5 && rout.d < 1.5, 'chernyshevskaya: walked out from the platform up the UP lane through the north door');
    const p = await pose(); ok(p.indoor < 0.5, `outside after the way out: indoor ${p.indoor.toFixed(2)} (${p.zone})`);
  }
  // ---------------------------------------------------------------- 4. rides: the real tunnel both ways, the generic hall to the north
  if (SECTIONS.has('4')) {
    console.log('4. Chernyshevskaya: rides');
    const r1 = await rideFlow('vosstaniya', 'N', ID, ID, 'Vosstaniya -> Chernyshevskaya', { pf: 'che', arr: true, real: true });
    ok(r1.pa && r1.pa.lx > 0, `arrived on the N (+x) platform of Chernyshevskaya (hall x ${r1.pa && r1.pa.lx !== undefined ? r1.pa.lx.toFixed(1) : '-'})`);
    const r2 = await rideFlow(ID, 'S', 'vosstaniya', 'vosstaniya', 'Chernyshevskaya -> Vosstaniya', { pf: 'che', arr: true, real: true });
    ok(r2.pa && r2.pa.lx < 0, `arrived on the S (-x) platform of Vosstaniya (hall x ${r2.pa && r2.pa.lx !== undefined ? r2.pa.lx.toFixed(1) : '-'})`);
    await rideFlow(ID, 'N', 'lenina', 'generic', 'Chernyshevskaya -> Ploshchad Lenina (generic hall)', { pf: 'che', real: false });
  }
  // ---------------------------------------------------------------- 5. screenshots (luma; compare with refs/east che-01, che-16, che-18, che-22, che-28 by eye)
  if (SECTIONS.has('5')) {
    console.log('5. Chernyshevskaya: views');
    const views = await ev((id) => { const m = window.__ctx.metro, p = m.petro || {}, c = p.che || p.chernyshevskaya, out = [], add = (name, S, x, y, z, tx, tz, pitch = -2) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], pitch, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      if (!c) return out; const FY = c.hall.FY; void id;
      add('che_central', c.S, 0, FY + 1.7, 20, 0, -30); add('che_central_s', c.S, 0, FY + 1.7, -20, 0, 30); add('che_platform', c.S, 7.4, FY + 1.7, 50, 7.4, 0); add('che_trackwall', c.S, 7.0, FY + 1.7, 0, 13, 0);
      add('che_lower', c.S, 0, FY + 1.7, c.central[0] + 6, 0, c.zFoot - 10, 8); add('che_esc', c.Se, 1, c.esc.yAt(90) + 1.7, 90, 1, 0); add('che_esc_up', c.Se, -1, c.esc.yAt(20) + 1.7, 20, -1, 90, -24);
      add('che_vest', c.Sv, -12, c.FV + 1.7, -12, 0, 0); add('che_vest_out', c.Sv, 2, c.FV + 1.7, 2, 0, -18);
      return out; }, ID);
    ok(views.length >= 9, `views prepared (${views.length})`);
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, v.pitch); const s = await shot('v_' + v.name); lumOk(s, `view ${v.name}`, 45, 215); }
  }
  console.log(`\n${checks - problems.filter((p) => !p.startsWith('[')).length}/${checks} checks passed`);
  for (const l of logs.slice(0, 12)) console.log(l);
} catch (e) {
  problems.push('[test crashed] ' + (e.stack || e.message));
}
for (const p of problems) console.log('PROBLEM:', p);
await browser.close(); server.close();
console.log(problems.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
