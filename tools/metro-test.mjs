// End-to-end test of the metro module in the real renderer (headless Edge / Chrome with GPU, puppeteer-core): ?only=metro.
//   node tools/metro-test.mjs [--q medium|high|low] [--out shots/metro/mt] [--only 1,2,3...]   (sections: 1 load, 2 street + escalator, 3 platform + ride (stops along the line), 4 corridors + doors, 6 ways out of every station, 7 transfers on foot, 8 walk into an open door,
//   9 west stations: Gostiny Dvor / Nevsky Prospekt / Admiralteyskaya trains, rides incl. the real tunnel Gostiny Dvor <-> Mayakovskaya, closed platform doors, 10 the Petrograd side, 11 Vasilievsky Island: Vasileostrovskaya / Gorny Institut / Sportivnaya-2)
// Asserts the walk (street -> turnstiles -> escalator -> hall), the interact prompts, boarding (the chip «Войти»; no destination panel), the ride in REAL time as a chain of legs (the train leaves on the platform timetable, runs the
// real hop, stops at every station with open doors; Vosstaniya <-> Vladimirskaya real tunnel, generic-hall stops, a multi-stop ride), getting off at a stop, brightness of the screenshots (not dark / white), boundaries (no trapped positions) and the frame time. Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro/mt');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SECTIONS = new Set((args.only || '1,2,3,4,5,6,7,8,9,10,11').split(',').map((s) => s.trim()));
const ONLY_EXITS = args.exits ? new Set(args.exits.split(',')) : null;            // --exits gorkovskaya,sportivnaya : section 6 walks only these ways out

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
  const lumOk = (s, what, lo = 55, hi = 215, dark = 0.1) => ok(s.mean > lo && s.mean < hi && s.dark < dark && s.white < 0.1, `${what}: neither dark nor white (mean ${s.mean.toFixed(0)}, dark ${(s.dark * 100).toFixed(1)} %, white ${(s.white * 100).toFixed(1)} %)`);
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
    if (!b.ride) return { b, s: { gone: true, real: false }, pa: { ride: false, y: 1e9 }, generic: false };
    await carShot(`${pf}_car_${id}_${key}`, 8, `${label}: inside the car`);
    const s = await rideTo(0);
    ok(!s.gone && s.k === 0 && s.phase === 'open', `${label}: the train stopped at ${next} and the doors are open (${s.phase}, ${s.ur === undefined ? '-' : s.ur.toFixed(1)} s after the departure)`);
    if (s.gone) return { b, s: { ...s, real: false }, pa: { ride: !!s.ride, y: 1e9 } };
    const isBuilt = await ev((id) => !!window.__ctx.metro.stations[id], next);          // hall-aware: a station with its own hall is shown in it, only an unbuilt one in the shared generic hall
    const expDest = dest === 'generic' && isBuilt ? next : dest;
    ok(s.to === next && s.dest === expDest, `${label}: first stop ${next} in the hall of ${expDest} (${s.to} / ${s.dest})`);
    if (o.real != null) ok(s.real === o.real, `${label}: ${o.real ? 'the real tunnel' : 'the generic tunnel'} (route.real ${s.real})`);
    if (expDest === 'generic') ok(s.shown === next, `${label}: the generic hall shows ${next} (${s.shown})`);
    const pa = await alightChip(label, s);
    if (o.arr) { const sa = await shot(`${pf}_arr_${dest}_${key}`); lumOk(sa, `${label}: arrival platform`); }
    return { b, s, pa, generic: expDest === 'generic' };
  };


  // ---------------------------------------------------------------- 1. load
  if (SECTIONS.has('1')) {
    console.log('1. load and API');
    const api = await ev(() => { const c = window.__ctx, m = c.metro; return { metro: !!m, stations: Object.keys(m.stations), svc: !!c.services.metro, ent: c.services.metro?.entrances?.length, zones: !!c.zones?.add, esc: c.physics.items.filter((i) => i.escalator).length }; });
    console.log('   ', JSON.stringify(api));
    ok(api.metro && api.svc && api.esc >= 3, 'metro module built, service published, escalators registered');
  }
  // ---------------------------------------------------------------- 2. the street, the rotunda, the escalator
  if (SECTIONS.has('2')) {
    console.log('2. rotunda, turnstiles, escalator');
    const g = await ev(() => { const m = window.__ctx.metro; const e = m.esc; const S = m.S; const [hx, hz] = S.W(0, e.zTop); return { zTop: e.zTop, zBottom: e.zBottom, FY: e.FY, head: [hx, hz], W: null }; });
    // east door -> inside: walk west through the door (rotunda entrance at (535.2, 91.2))
    await ev(() => window.__setCam(540, null, 91.2, 90, 0));
    await ev(() => window.__ff(0.3, 1 / 60));
    const r = await ev(() => { const lg = window.__ff(4, 1 / 60, () => ['KeyW'], (p) => p.pos.x < 528); const p = window.__ctx.playerObj; return { x: p.pos.x, z: p.pos.z, y: p.pos.y }; });
    ok(r.x < 530, `walked in through the east door (x ${r.x.toFixed(1)})`);
    await frames(3); let p = await pose(); ok(/vestibule/.test(p.zone || ''), `inside the rotunda: vestibule zone (${p.zone})`);
    const s1 = await shot('vestibule'); lumOk(s1, 'ticket hall');
    // from the turnstiles to the escalator head and down: teleport in front of the lanes, press W
    await ev((g) => { const m = window.__ctx.metro; const [x, z] = m.S.W(-2, g.zTop - 3); window.__setCam(x, null, z, 0, 0, false); const p = window.__ctx.playerObj; p.yaw = 155.3 * Math.PI / 180 * 0 + Math.atan2(-Math.sin(m.S.frame.yaw) * 0, 1); }, g);
    // face the descent direction: world yaw (camera degrees) of local +z
    await ev(() => { const S = window.__ctx.metro.S, f = S.frame, dx = Math.sin(f.yaw), dz = Math.cos(f.yaw); const [x, z] = S.W(-2, window.__ctx.metro.esc.zTop - 3); window.__setCam(x, null, z, Math.atan2(-dx, -dz) * 180 / Math.PI, 0); });
    const walk = await ev((FY) => { const lg = window.__ff(60, 1 / 60, () => ['KeyW', 'ShiftLeft'], (p) => p.pos.y < FY + 0.05); const last = lg[lg.length - 1]; return { t: last.t, y: last.y, air: lg.filter((s) => !s.g).length }; }, g.FY);
    console.log(`   running down the right-hand lane: ${walk.t.toFixed(1)} s, y ${walk.y.toFixed(2)}, airborne frames ${walk.air}`);
    ok(Math.abs(walk.y - g.FY) < 0.15 && walk.air === 0 && walk.t > 8 && walk.t < 30, `ran down the escalator in a plausible time (${walk.t.toFixed(1)} s, airborne ${walk.air})`);
    await frames(3); p = await pose(); ok(p.indoor > 0.99, `at the bottom: indoor ${p.indoor.toFixed(2)} (${p.zone})`);
    const s2 = await shot('hall'); lumOk(s2, 'station hall');
  }
  // ---------------------------------------------------------------- 3. platform, boarding, ride
  if (SECTIONS.has('3')) {
    console.log('3. platform, board, ride, stops along the line');
    // stand on the platform strip next to the S track (x = -7.5), wait until a train stands with open doors
    const st = await ev(() => {
      const m = window.__ctx.metro, rt = m.stations.vosstaniya, S = m.S, tk = rt.platform.trackByKey('S');
      const [x, z] = S.W(-7.4, 0); window.__setCam(x, rt.hall.FY, z, 0, 0, true);
      const f = S.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw);              // look toward local -x (the train)
      window.__ctx.playerObj.yaw = Math.atan2(-dx, -dz);
      const lg = window.__ff(200, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95; });
      return { t: window.__ctx.time, st: rt.platform.state(tk, window.__ctx.time) };
    });
    ok(st.st.phase === 'dwell' && st.st.open > 0.95, `a train stands with open doors (t ${st.t.toFixed(1)})`);
    // boarding: the chip «Войти» + interact.use(); no destination panel, the first leg of the chain stops at the next station (Vosstaniya S -> Vladimirskaya)
    const b3 = await boardChip('Vosstaniya S', 'platform', 'vladimirskaya');
    const wait3 = b3.tDepart - b3.t;
    console.log('   ride:', JSON.stringify({ legs: b3.legs, real: b3.real, phase: b3.phase, waitForDeparture: +wait3.toFixed(1) }));
    ok(b3.legs > 1, `the chain of legs runs on toward the end of the line (${b3.legs} legs)`);
    ok(b3.real, 'the Vosstaniya -> Vladimirskaya ride uses the real tunnel');
    ok(wait3 >= 8 && wait3 <= 32, `the train leaves on the platform timetable (${wait3.toFixed(1)} s after boarding)`);
    // riding in real time: pictures from inside the car 8 s and 40 s after the departure
    await carShot('car_start', 8, 'inside the car', 40, 215);
    await carShot('car_tunnel', 40, 'tunnel from the car');      // (the tunnel look is dark by design: the loose not-black / not-white bound)
    // first stop: Vladimirskaya, the real hall, doors open
    const s1 = await rideTo(0);
    ok(!s1.gone && s1.k === 0 && s1.phase === 'open', `the train stopped at the first stop and the doors are open (${s1.phase}, ${s1.ur === undefined ? '-' : s1.ur.toFixed(1)} s after the departure)`);
    ok(s1.to === 'vladimirskaya' && s1.dest === 'vladimirskaya', `the first stop is Vladimirskaya, in its own hall (${s1.to} / ${s1.dest})`);
    await frames(2); const c2 = await chip(); ok(c2.show && /Выйти/.test(c2.text), `get-off prompt at the first stop: "${c2.text}"`);
    const sv = await shot('car_stop'); lumOk(sv, 'doors open at Vladimirskaya, from inside the car', 30, 215);
    // multi-stop: stay aboard through the whole dwell at Vladimirskaya; the next stop is Pushkinskaya, shown in the generic hall
    const s2 = await rideTo(1);
    ok(!s2.gone && s2.k === 1 && s2.phase === 'open' && s2.to === 'pushkinskaya', `stayed aboard through Vladimirskaya: the second stop is Pushkinskaya, doors open (k ${s2.k}, ${s2.to}, ${s2.phase})`);
    if (!s2.gone) {
      const ms = await ev(() => {
        const S = window.__ctx.metro.ride.session, leg = S.legs[1], tk = leg.destTk, tr = tk.trains[tk.stock], rt = leg.destRt, p = window.__ctx.playerObj, [lx, lz] = rt.L(p.pos.x, p.pos.z);
        return { dest: rt.id, same: rt === window.__ctx.metro.stations.pushkinskaya, override: tk.override, trainVisible: tr ? tr.root.visible : null, ride: !!p.riding, lx, lz, y: p.pos.y, fy: tk.fy ?? rt.hall.FY, PZ: rt.hall.PZ, halfW: (rt.hall.WALL || rt.hall.TRK + 4) + 1 };
      });
      ok(ms.dest === 'pushkinskaya' && ms.same, `Pushkinskaya is a real hall of its own (hall ${ms.dest}, is ctx.metro.stations.pushkinskaya: ${ms.same})`);
      ok(ms.override === true && ms.trainVisible !== true, `the scheduled train of the destination track is held and hidden while the ride train stands (override ${ms.override}, scheduled train visible ${ms.trainVisible})`);
      ok(ms.ride && Math.abs(ms.lx) < ms.halfW && Math.abs(ms.lz) < ms.PZ && Math.abs(ms.y + 57) < 2 && Math.abs(ms.y - ms.fy) < 2, `the rider stands inside the Pushkinskaya hall frame (hall x ${ms.lx.toFixed(1)} z ${ms.lz.toFixed(1)}, y ${ms.y.toFixed(1)} vs floor ${ms.fy})`);
      const pr = await alightChip('Pushkinskaya', s2);
      ok(!pr.ride, 'got off the train');
      const s7 = await shot('arrived'); lumOk(s7, 'arrival platform');
      console.log('   toast:', await toast());
    }
  }
  // ---------------------------------------------------------------- 4. corridors (floors without gaps), Mayakovskaya ride
  if (SECTIONS.has('4')) {
    console.log('4. corridors and Mayakovskaya');
    const rep = await ev(() => { const m = window.__ctx.metro, ph = window.__ctx.physics, out = []; for (const c of m.debug.corridors) { let gaps = 0, n = 0; for (let i = 0; i < c.pts.length; i++) { const p = c.pts[i]; n++; const gy = ph.groundHeight(p[0], p[2], p[1] + 0.3, false); if (!(Math.abs(gy - p[1]) < 0.35)) gaps++; } out.push({ name: c.name, n, gaps }); } return out; });
    for (const r of rep) ok(r.gaps === 0, `corridor ${r.name}: ${r.n} samples, ${r.gaps} without a floor`);
    await ev(() => { const m = window.__ctx.metro, rt = m.stations.mayakovskaya; const [x, z] = rt.W(-7.4, 0); window.__setCam(x, rt.hall.FY, z, 0, 0, true); const tk = rt.platform.trackByKey('S'); window.__ff(200, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95; }); const f = rt.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw); window.__ctx.playerObj.yaw = Math.atan2(-dx, -dz); });
    const bm = await boardChip('Mayakovskaya', 'mayak_platform', 'pan1');
    ok(bm.ride, 'Mayakovskaya: riding to the first stop, Ploshchad Aleksandra Nevskogo 1 (a real hall)');
    const sm2 = await rideTo(0);
    ok(!sm2.gone && sm2.phase === 'open' && sm2.to === 'pan1' && sm2.dest === 'pan1', `Mayakovskaya: the first stop is Ploshchad Aleksandra Nevskogo 1 in its own hall, doors open (${sm2.to} / ${sm2.dest}, ${sm2.phase})`);
    const pan1 = await ev(() => { const m = window.__ctx.metro, rt = m.stations.pan1, p = window.__ctx.playerObj; if (!rt) return null; const [lx, lz] = rt.L(p.pos.x, p.pos.z); return { id: rt.id, lx, lz, PZ: rt.hall.PZ, halfW: (rt.hall.WALL || rt.hall.TRK + 4) + 1 }; });
    ok(pan1 && pan1.id === 'pan1', 'pan1 is a real hall (ctx.metro.stations.pan1)');
    // the generic hall starts as the first station of its list (net.lenina); its label must be the definition name
    const gname = await ev(() => { const g = window.__ctx.metro.stations.generic; return { name: g.def.name, shown: g.shownId, net: window.__ctx.metro.env.net.BY_ID[g.shownId || 'lenina']?.name }; });
    ok(!!gname.name && (gname.net == null || gname.name === gname.net), `the generic hall is labelled «${gname.name}» (net ${gname.net})`);
    const pg = sm2.gone ? { ride: !!sm2.ride, y: 1e9 } : await alightChip('Mayakovskaya', sm2);
    ok(!pg.ride && pan1 && pg.y < -50 && Math.abs(pan1.lx) < pan1.halfW + 1 && Math.abs(pan1.lz) <= pan1.PZ + 1, `alighted in the hall of pan1 (y ${pg.y.toFixed(1)}, hall x ${pan1 ? pan1.lx.toFixed(1) : '-'} z ${pan1 ? pan1.lz.toFixed(1) : '-'})`);
    const sg = await shot('pan1_hall'); lumOk(sg, 'pan1 hall');
    // every door of the metro lets a walker in (colliders split, nothing in the way): walk 3 s inward from 3 m outside
    for (const d of await ev(() => window.__ctx.L.DOORWAYS.map((q) => ({ id: q.id, x: q.x, z: q.z, rotY: q.rotY })))) {
      const r = await ev((d) => { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY); window.__setCam(d.x + nx * 3, null, d.z + nz * 3, Math.atan2(nx, nz) * 180 / Math.PI, 0); const lg = window.__ff(3, 1 / 60, () => ['KeyW']); const p = window.__ctx.playerObj; return { depth: -((p.pos.x - d.x) * nx + (p.pos.z - d.z) * nz) }; }, d);
      ok(r.depth > (/^(gorny|sportivnaya2)/.test(d.id) ? 2.5 : 3.5), `door ${d.id}: walked ${r.depth.toFixed(1)} m past the door line`);               // the small pavilions of the island: the stair + escalator well starts 3 m behind the door (the straight line ends at its parapet)
    }
  }
  // ---------------------------------------------------------------- 6. every station has a way up: walk from the platform to the pavement (real physics, steering along the exit route)
  if (SECTIONS.has('6')) {
    console.log('6. exits to the street');
    const names = (await ev(() => Object.keys(window.__ctx.metro.debug.exits))).filter((n) => !ONLY_EXITS || ONLY_EXITS.has(n));
    for (const n of names) {
      const r = await ev((n) => {
        const ex = window.__ctx.metro.debug.exits[n], p = window.__ctx.playerObj;
        window.__setCam(ex.start[0], null, ex.start[1], 0, 0); p.pos.y = ex.start[2]; p.fly = false; p.vel.set(0, 0, 0);
        window.__setCam(ex.start[0], ex.start[2], ex.start[1], 0, 0, true);
        let reached = 0, t = 0, trace = [];
        for (const [i, w] of ex.points.entries()) {
          let tt = 0, best = 1e9;
          while (tt < 60) {
            const dx = w[0] - p.pos.x, dz = w[1] - p.pos.z, d = Math.hypot(dx, dz); best = Math.min(best, d);
            if (d < (w[2] || 0.9)) { reached = i + 1; break; }
            p.yaw = Math.atan2(-dx, -dz);
            const step = d < 3 ? 0.03 : 0.1; window.__ff(step, 1 / 60, () => (d < 5 ? ['KeyW'] : ['KeyW', 'ShiftLeft'])); tt += step; t += step;
          }
          if (reached !== i + 1) { const ph = window.__ctx.physics, ah = (dd) => +ph.groundHeight(p.pos.x + Math.sin(p.yaw + Math.PI) * dd * -1, p.pos.z + Math.cos(p.yaw + Math.PI) * dd * -1, p.pos.y + 0.3, false).toFixed(2); trace = [i, +best.toFixed(1), +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), w.map((v) => +v.toFixed(1)), 'traj:', (() => { const o = []; for (let q = 0; q < 6; q++) { p.yaw = Math.atan2(-(w[0] - p.pos.x), -(w[1] - p.pos.z)); window.__ff(0.3, 1 / 60, () => ['KeyW']); o.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.onGround, +p.yaw.toFixed(2)]); } return o; })(), 'near:', [...ph._query(p.pos.x, p.pos.z, 2)].filter((it) => it.type !== 'hole').map((it) => { const [lx, lz] = ph._local(it, p.pos.x, p.pos.z); return [it.type, +(Math.abs(lx) - it.hw).toFixed(2), +(Math.abs(lz) - it.hd).toFixed(2), +it.y0.toFixed(1), it.y1 !== undefined ? +it.y1.toFixed(1) : (it.top !== undefined ? +it.top.toFixed(1) : 'r')]; }).filter((q) => q[1] < 0.8 && q[2] < 0.8)]; break; }
        }
        const dd = (p.pos.x - ex.door[0]) * ex.outward[0] + (p.pos.z - ex.door[1]) * ex.outward[1];
        return { reached, of: ex.points.length, y: p.pos.y, outDepth: dd, t, trace };
      }, n);
      console.log(`   ${n}: reached ${r.reached}/${r.of} waypoints, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, ${r.outDepth.toFixed(1)} m outside the door line ${r.trace.length ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y) < 0.6 && r.outDepth > 2, `${n}: walked from the platform up the escalator and out onto the pavement`);
    }
  }
  // ---------------------------------------------------------------- 7. transfers on foot
  if (SECTIONS.has('7')) {
    console.log('7. transfers on foot');
    for (const n of await ev(() => Object.keys(window.__ctx.metro.debug.walks))) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.walks[n], res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      console.log(`   ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${n}: walked through the passage onto the other platform`);
    }
  }
  // ---------------------------------------------------------------- 8. walking into an open door (no [E]): aboard without falling, ride, walk out at the next station
  if (SECTIONS.has('8')) {
    console.log('8. walk into an open door');
    const A = await ev(() => {
      const m = window.__ctx.metro, rt = m.stations.vosstaniya, tk = rt.platform.trackByKey('S'), p = window.__ctx.playerObj, st = tk.train.stock;
      const zDoor = tk.dir * (window.__carOffset(st, 3) + 2.2), fy = rt.hall.FY, [x, z] = rt.W(-7.3, zDoor);
      window.__setCam(x, fy, z, 0, 0, true);
      window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95 && s.u < 0.5; });
      const f = rt.frame, hx = -Math.cos(f.yaw), hz = Math.sin(f.yaw); const face = Math.atan2(-hx, -hz);
      let minY = 1e9, riding = false, n = 0;
      for (let t = 0; t < 6; t += 1 / 30) { p.yaw = p.ride ? p.yaw : face; window.__ff(1 / 30, 1 / 30, () => ['KeyW']); minY = Math.min(minY, p.pos.y); n++; if (p.ride) { riding = true; break; } }
      return { riding, minY, fy, phase: window.__ctx.metro.ride.session && window.__ctx.metro.ride.session.state && window.__ctx.metro.ride.session.state.phase, next: window.__ctx.metro.ride.session && window.__ctx.metro.ride.session.legs[0] ? window.__ctx.metro.ride.session.legs[0].to.id : null };
    });
    ok(A.riding && A.minY > A.fy - 0.3, `walking into the open door boards the train (riding ${A.riding}, lowest y ${A.minY.toFixed(2)} vs floor ${A.fy})`);
    ok(A.phase === 'boarding' || A.phase === 'closing', `boarded at once, no 14 s wait and no destination panel (session phase ${A.phase})`);
    ok(A.next === 'vladimirskaya', `the first stop of the chain is Vladimirskaya (${A.next})`);
    // stay aboard: the doors close, the train goes to the next station (nothing is chosen: the first stop of the chain); y must never drop below the car floor
    const B = await ev(() => { const p = window.__ctx.playerObj; let minY = 1e9, maxDrop = 0; const lg = window.__ff(360, 1 / 30, null, () => { const S0 = window.__ctx.metro.ride.session, fr = S0 && window.__ctx.metro.ride.carFrame(S0, window.__ctx.time); if (fr) minY = Math.min(minY, p.pos.y - fr.y); return window.__ctx.metro.ride.session && window.__ctx.metro.ride.session.state.phase === 'open'; }); const s = window.__ctx.metro.ride.session; return { phase: s && s.state.phase, to: s && s.to.name, minY, y: p.pos.y }; });
    ok(B.phase === 'open' && B.to === 'Владимирская', `stayed aboard: carried to ${B.to}, doors open (${B.phase})`);
    ok(B.minY > -0.05, `never below the car floor during the ride (lowest y over the floor ${B.minY.toFixed(2)})`);
    // walk out through the open door at the next station
    const C = await ev(() => {
      const p = window.__ctx.playerObj; let n = 0;
      for (let t = 0; t < 6 && p.ride; t += 1 / 30) { p.yaw = -Math.PI / 2; window.__ff(1 / 30, 1 / 30, () => ['KeyW']); n++; }
      const rt = window.__ctx.metro.stations.vladimirskaya, [lx, lz] = rt.L(p.pos.x, p.pos.z);
      return { riding: !!p.ride, y: p.pos.y, lx, lz, loc: p.ride && p.ride.local, ph: window.__ctx.metro.ride.session && window.__ctx.metro.ride.session.state.phase };
    });
    console.log('   C', JSON.stringify(C));
    ok(!C.riding && Math.abs(C.y - (-55)) < 0.1 && Math.abs(C.lx) < 9, `walked out at Vladimirskaya onto the platform (riding ${C.riding}, y ${C.y.toFixed(2)}, hall x ${C.lx.toFixed(1)})`);
    // second scenario: board, change your mind, walk back out before the train leaves
    const D = await ev(() => {
      const m = window.__ctx.metro, rt = m.stations.vosstaniya, tk = rt.platform.trackByKey('N'), p = window.__ctx.playerObj, st = tk.train.stock;
      const zDoor = tk.dir * (window.__carOffset(st, 4) + 2.2), fy = rt.hall.FY, [x, z] = rt.W(7.3, zDoor);
      window.__setCam(x, fy, z, 0, 0, true);
      window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95 && s.u < 0.4; });
      const f = rt.frame, hx = Math.cos(f.yaw), hz = -Math.sin(f.yaw), face = Math.atan2(-hx, -hz);
      for (let t = 0; t < 6; t += 1 / 30) { p.yaw = p.ride ? p.yaw : face; window.__ff(1 / 30, 1 / 30, () => ['KeyW']); if (p.ride) break; }
      const boarded = !!p.ride;
      let minY = p.pos.y;
      for (let t = 0; t < 8 && p.ride; t += 1 / 30) { p.yaw = -Math.PI / 2; window.__ff(1 / 30, 1 / 30, () => ['KeyW']); minY = Math.min(minY, p.pos.y); }
      const [lx] = rt.L(p.pos.x, p.pos.z);
      return { boarded, riding: !!p.ride, y: p.pos.y, lx, minY, fy };
    });
    ok(D.boarded && !D.riding && Math.abs(D.y - D.fy) < 0.1 && D.minY > D.fy - 0.3, `boarded the opposite train and walked back out onto the platform (boarded ${D.boarded}, riding ${D.riding}, y ${D.y.toFixed(2)})`);
  }
  // ---------------------------------------------------------------- 9. the west stations: trains at the platform, rides (real tunnel GD <-> Mayakovskaya; the first stop of the chain), ways back
  if (SECTIONS.has('9')) {
    console.log('9. Gostiny Dvor / Nevsky Prospekt / Admiralteyskaya: trains, rides');
    // the vestibule rooms lie inside their houses (every corner of the plan is inside a ground footprint: nothing sticks out into the street)
    const outside = await ev(() => { const L = window.__ctx.L, w = window.__ctx.metro.west, bad = []; for (const [n, r] of [['admiralteyskaya', w.adm.room], ['nevsky canal hall', w.nev.canalRoom], ['gostiny ticket hall', w.gd.ticketRoom]]) for (const [x, z] of r.poly) if (!L.insideBuilding(x, z, 0)) bad.push([n, +x.toFixed(1), +z.toFixed(1)]); return bad; });
    ok(outside.length === 0, `the three vestibule rooms lie inside their buildings (${outside.length ? JSON.stringify(outside) : 'all corners inside'})`);
    // rides: board at the open doors, the first stop of the chain is the next station of the line, real time, get off at the stop
    const w9 = (id, key, next, dest, label, o = {}) => rideFlow(id, key, next, dest, label, { pf: 'w9', yCheck: false, ...o });
    // the chain ahead of a train skips the closed Park Pobedy (line 2 toward Kupchino: Sennaya, ..., Moskovskiye Vorota, Elektrosila, Moskovskaya)
    const chain = await ev(() => { const N = window.__ctx.metro.env.net, ids = N.ahead(N.BY_ID.nevsky, -1).map((q) => q.id); return { first: ids[0], parkpobedy: ids.includes('parkpobedy'), elektrosila: ids.includes('elektrosila'), n: ids.length }; });
    ok(chain.first === 'sennaya' && !chain.parkpobedy && chain.elektrosila, `the chain ahead of Nevsky Prospekt toward Kupchino starts at Sennaya and skips the closed Park Pobedy (${JSON.stringify(chain)})`);
    const r1 = await w9('gostiny', 'S', 'mayakovskaya', 'mayakovskaya', 'Gostiny Dvor -> Mayakovskaya', { real: true });
    ok(r1.s.real && Math.abs(r1.pa.y - (-51)) < 1, 'the Gostiny Dvor -> Mayakovskaya ride uses the real tunnel and ends on the Mayakovskaya platform (y -51)');
    const r2 = await w9('mayakovskaya', 'N', 'gostiny', 'gostiny', 'Mayakovskaya -> Gostiny Dvor', { real: true });
    ok(r2.s.real && Math.abs(r2.pa.y - (-56)) < 1, 'the way back (Mayakovskaya -> Gostiny Dvor) uses the real tunnel and ends on the Gostiny Dvor platform (y -56)');
    const r3 = await w9('nevsky', 'N', 'sennaya', 'generic', 'Nevsky Prospekt -> Sennaya Ploshchad');                 // (Gorkovskaya and Petrogradskaya are real halls since the Petrograd-side extension: section 10)
    // (since the interchange round Sennaya and Sadovaya are real halls reached through real tunnels: s.real is true there; the check is the destination, not the tunnel kind)
    ok(r3.generic ? r3.pa.y < -60 : r3.s.dest === 'sennaya', 'Nevsky Prospekt -> Sennaya Ploshchad ends in the hall of the first stop (' + (r3.generic ? 'generic' : 'sennaya, a real hall') + ')');
    const r4 = await w9('admiralteyskaya', 'S', 'sadovaya', 'generic', 'Admiralteyskaya -> Sadovaya');
    ok(r4.generic ? r4.pa.y < -60 : r4.s.dest === 'sadovaya', 'Admiralteyskaya -> Sadovaya ends in the hall of the first stop (' + (r4.generic ? 'generic' : 'sadovaya, a real hall') + ')');
    // the closed-type hall shuts its platform doors while no train stands: a walker cannot enter the recess
    const gate = await ev(() => {
      const rt = window.__ctx.metro.stations.gostiny, tk = rt.platform.trackByKey('S'), p = window.__ctx.playerObj; const [x, z] = rt.W(-6.4, 2); window.__setCam(x, rt.hall.FY, z, 0, 0, true);
      window.__ff(150, 1 / 30, null, () => rt.platform.state(tk, window.__ctx.time).phase === 'away');
      const f = rt.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw); p.yaw = Math.atan2(-dx, -dz); window.__ff(2.5, 1 / 60, () => ['KeyW']); const [lx] = rt.L(p.pos.x, p.pos.z);
      return { lx, phase: rt.platform.state(tk, window.__ctx.time).phase, y: p.pos.y };
    });
    ok(gate.lx > -7.3 && gate.y > -56.3, `Gostiny Dvor: the platform doors are shut while no train stands (x ${gate.lx.toFixed(2)}, ${gate.phase})`);
  }
  // ---------------------------------------------------------------- 10. the Petrograd side: Gorkovskaya, Petrogradskaya (line 2), Sportivnaya (two levels), Chkalovskaya (line 5)
  if (SECTIONS.has('10')) {
    console.log('10. Petrograd side: Gorkovskaya / Petrogradskaya / Sportivnaya / Chkalovskaya');
    const built = await ev(() => { const m = window.__ctx.metro; return ['gorkovskaya', 'petrogradskaya', 'sportivnaya', 'chkalovskaya'].map((id) => ({ id, rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!m.debug.exits[id], entry: !!m.debug.entries[id] })); });
    for (const b of built) ok(b.rt && b.net && b.exit && b.entry, `${b.id}: real hall, marked built in the network, a way out and a way in (${JSON.stringify(b)})`);
    // the vestibule rooms lie inside their houses; no shaft / stair pit opens on a carriageway or in the water
    const geo = await ev(() => {
      const L = window.__ctx.L, p = window.__ctx.metro.petro, bad = [];
      for (const [n, r] of [['gorkovskaya', p.gork.room], ['petrogradskaya', p.petr.room], ['chkalovskaya', p.chk.room]]) for (const [x, z] of r.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room ' + n, +x.toFixed(1), +z.toFixed(1)]);
      for (const s of L.GROUND_HOLES.filter((q) => ['gorkovskaya', 'petrogradskaya', 'sportivnaya', 'chkalovskaya'].includes(q.station))) {
        const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * c + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * c; if (L.isOnRoad(x, z, 0) || L.waterwayAt(x, z)) bad.push(['hole ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (s.kind === 'escalator' && !L.insideBuilding(x, z, 0)) bad.push(['shaft outside its house ' + s.id, +x.toFixed(1), +z.toFixed(1)]); }
      }
      return bad;
    });
    ok(geo.length === 0, `rooms inside their houses, shafts inside, no hole on a carriageway / in the water (${geo.length ? JSON.stringify(geo) : 'all clear'})`);
    // ways in: from the pavement through the door / down the street stairs, down the incline, onto the platform
    for (const n of await ev(() => Object.keys(window.__ctx.metro.debug.entries))) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.entries[n], res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      console.log(`   way in ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${n}: walked in from the pavement, down the incline and onto the platform`);
    }
    // Sportivnaya: between the two levels by the short escalators
    for (const n of await ev(() => Object.keys(window.__ctx.metro.petro.sport.walks()))) {
      const r = await ev((n) => { const w = window.__ctx.metro.petro.sport.walks()[n], res = window.__walk(w.start, w.points); return { ...res, endY: w.end.y }; }, n);
      console.log(`   ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4, `${n}: walked between the levels`);
    }
    // trains and rides: both lines, both ways, from and to the older stations; the first stop of every ride is the next station of the line (a real hall here)
    const ride = (id, key, next, dest, label) => rideFlow(id, key, next, dest, label, { pf: 'p10', arr: true });
    await ride('nevsky', 'S', 'gorkovskaya', 'gorkovskaya', 'Nevsky Prospekt -> Gorkovskaya');
    await ride('gorkovskaya', 'S', 'petrogradskaya', 'petrogradskaya', 'Gorkovskaya -> Petrogradskaya');
    await ride('petrogradskaya', 'N', 'gorkovskaya', 'gorkovskaya', 'Petrogradskaya -> Gorkovskaya');
    await ride('gorkovskaya', 'N', 'nevsky', 'nevsky', 'Gorkovskaya -> Nevsky Prospekt');
    await ride('admiralteyskaya', 'N', 'sportivnaya', 'sportivnaya', 'Admiralteyskaya -> Sportivnaya (upper level)');
    await ride('sportivnaya', 'N', 'chkalovskaya', 'chkalovskaya', 'Sportivnaya (upper level) -> Chkalovskaya');
    // the generic-hall relabel (an unbuilt first stop): Petrogradskaya -> Chyornaya Rechka (asserted only while chernaya has no hall of its own)
    if (await ev(() => !window.__ctx.metro.stations.chernaya)) { const rc = await ride('petrogradskaya', 'S', 'chernaya', 'generic', 'Petrogradskaya -> Chyornaya Rechka'); ok(rc.generic && rc.pa.y < -50, 'Petrogradskaya -> Chyornaya Rechka ends in the generic hall relabelled Chyornaya Rechka'); }
    else console.log('   (Chyornaya Rechka has its own hall: the generic relabel is covered by section 4 / 11 rides)');
    await ride('chkalovskaya', 'S', 'sportivnaya', 'sportivnaya', 'Chkalovskaya -> Sportivnaya (lower level)');
    await ride('sportivnaya', 'S', 'admiralteyskaya', 'admiralteyskaya', 'Sportivnaya (lower level) -> Admiralteyskaya');
    // the closed-type hall of Petrogradskaya shuts its platform doors while no train stands
    const gate = await ev(() => {
      const rt = window.__ctx.metro.stations.petrogradskaya, tk = rt.platform.trackByKey('S'), p = window.__ctx.playerObj, zd = rt.hall.openings.z0; const [x, z] = rt.W(-6.3, zd); window.__setCam(x, rt.hall.FY, z, 0, 0, true);
      window.__ff(150, 1 / 30, null, () => rt.platform.state(tk, window.__ctx.time).phase === 'away');
      const f = rt.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw); p.yaw = Math.atan2(-dx, -dz); window.__ff(2.5, 1 / 60, () => ['KeyW']); const [lx] = rt.L(p.pos.x, p.pos.z);
      return { lx, phase: rt.platform.state(tk, window.__ctx.time).phase, y: p.pos.y };
    });
    ok(gate.lx > -7.3 && gate.y > -53.3, `Petrogradskaya: the platform doors are shut while no train stands (x ${gate.lx.toFixed(2)}, ${gate.phase})`);
    // screenshots of every hall, incline and vestibule (luma checks; the pictures are compared with the reference photos by eye)
    const views = await ev(() => { const m = window.__ctx.metro, p = m.petro, out = [], add = (name, S, x, y, z, tx, tz) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      add('gork_hall', p.gork.S, 0, -51.3, -12, 0, 10); add('gork_platform', p.gork.S, 7.4, -51.3, -40, 7.4, 0); add('gork_esc', p.gork.Se, 2, p.gork.esc.yAt(78) + 1.7, 78, 2, 0); add('gork_vest', p.gork.Se, 6, 1.7, -20, 0, 0);
      add('petr_hall', p.petr.S, 0, -51.3, 30, 0, -60); add('petr_esc', p.petr.Se, 2, p.petr.esc.yAt(78) + 1.7, 78, 2, 0); add('petr_vest', p.petr.Se, -14, 1.7, -8, 0, 2);
      add('sport_upper', p.sport.S, 4.8, -55.7, 40, 0, -40); add('sport_lower', p.sport.S, 0, -62.3, 30, 0, -40); add('sport_bank', p.sport.S, 0, -62.3, -40, 0, -60); add('sport_vest', p.sport.Sv, 0, -3.3, -20, 0, 10); add('sport_vest2', p.sport.Sv, 0, -3.3, -3, 0, -50);
      add('chk_hall', p.chk.S, 0, -58.3, -40, 0, 60); add('chk_esc', p.chk.Se, 2, p.chk.esc.yAt(90) + 1.7, 90, 2, 0); add('sport_esc', p.sport.Se, 1, p.sport.esc.yAt(30) + 1.7, 30, 1, 0); add('chk_vest', p.chk.Se, -12, 1.7, -4, 0, 2);
      return out; });
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, -2); const s = await shot('p10v_' + v.name); lumOk(s, `view ${v.name}`, 45, 215); }
  }
  // ---------------------------------------------------------------- 11. Vasilievsky Island: Vasileostrovskaya (line 3, closed type), Gorny Institut (line 4), Sportivnaya-2 (the island vestibule of Sportivnaya)
  if (SECTIONS.has('11')) {
    console.log('11. Vasilievsky Island: Vasileostrovskaya / Gorny Institut / Sportivnaya-2');
    const built = await ev(() => { const m = window.__ctx.metro; return ['vasileostrovskaya', 'gorny'].map((id) => ({ id, rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!m.debug.exits[id], entry: !!m.debug.entries[id] })); });
    for (const b of built) ok(b.rt && b.net && b.exit && b.entry, `${b.id}: real hall, built in the network, a way out and a way in (${JSON.stringify(b)})`);
    // rooms lie inside their buildings, no ground hole on a carriageway / in the water
    const geo = await ev(() => {
      const L = window.__ctx.L, p = window.__ctx.metro.petro, bad = [], rooms = [['vasileostrovskaya', p.vo.room]];
      if (p.gorny) rooms.push(['gorny in', p.gorny.wells.in.room], ['gorny out', p.gorny.wells.out.room]);
      if (p.sport2) for (const w of Object.values(p.sport2.wells)) rooms.push(['sportivnaya2 ' + w.w.id, w.room]);
      for (const [n, r] of rooms) if (r) for (const [x, z] of r.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room ' + n, +x.toFixed(1), +z.toFixed(1)]);
      for (const s of L.GROUND_HOLES.filter((q) => ['vasileostrovskaya', 'gorny', 'sportivnaya2'].includes(q.station))) {
        const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * c + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * c; if (L.isOnRoad(x, z, 0) || L.waterwayAt(x, z)) bad.push(['hole ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (s.kind === 'escalator' && !L.insideBuilding(x, z, 0)) bad.push(['shaft outside its house ' + s.id, +x.toFixed(1), +z.toFixed(1)]); }
      }
      return bad;
    });
    ok(geo.length === 0, `pavilion rooms inside their houses, shafts inside, no hole on a carriageway / in the water (${geo.length ? JSON.stringify(geo) : 'all clear'})`);
    // the interiors published for the pavilion owners (ctx.services.metro.pavilions, by building id)
    const pv = await ev(() => { const P = window.__ctx.services.metro.pavilions || {}; return Object.entries(P).map(([id, p]) => ({ id, st: p.station, n: p.poly ? p.poly.length : 0, ceil: p.ceil - p.floor, doors: p.doors.length, hole: p.hole })); });
    const pvIds = pv.map((p) => p.id), pvFive = ['w183122885', 'w1305590665', 'w1305590664', 'w627859233', 'w627859229'];
    ok(pvFive.every((id) => pvIds.includes(id)) && pv.every((p) => p.n >= 4 && p.doors >= 1 && (pvFive.includes(p.id) ? p.ceil > 2.9 && p.ceil < 3.6 : p.ceil > 2.5 && p.ceil < 8)), `ctx.services.metro.pavilions lists the five known pavilion interiors (a subset: the pavilions of Chernyshevskaya, Sennaya and Spasskaya are extras with a looser ceiling bound) (${JSON.stringify(pv.map((p) => p.id + ':' + p.n))})`);
    // a floor under every point of the island rooms (review-metro: the 1.5 m strips of the Vasileostrovskaya podium left wedges beside the slanted walls: the player stepped off the floor into the podium and was
    // trapped 1.7 m down): sample the physics floor on a 0.4 m grid, 0.4 m clear of the walls and 0.9 m clear of the shaft opening; everything must be within 15 cm of the floor level
    const flo = await ev(() => {
      const c = window.__ctx, ph = c.physics, p = c.metro.petro, out = [];
      const chk = (name, room, fy, hole) => {
        if (!room) { out.push([name, 'no room']); return; }
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of room.poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        let n = 0, bad = 0; const sample = [];
        for (let x = x0; x <= x1; x += 0.4) for (let z = z0; z <= z1; z += 0.4) {
          if (!room.inside(x, z) || ![[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]].every(([dx, dz]) => room.inside(x + dx, z + dz))) continue;
          if (hole) { const [lx, lz] = hole.S.L(x, z); if (lx > hole.x[0] - 0.9 && lx < hole.x[1] + 0.9 && lz > hole.z[0] - 0.9 && lz < hole.z[1] + 0.9) continue; }
          n++; const y = ph.groundHeight(x, z, fy + 0.6, false); if (!(Math.abs(y - fy) < 0.15)) { bad++; if (sample.length < 4) sample.push([+x.toFixed(1), +z.toFixed(1), y === -Infinity ? '-inf' : +y.toFixed(2)]); }
        }
        out.push([name, n, bad, sample]);
      };
      chk('vasileostrovskaya vestibule', p.vo.room, p.vo.FV, { S: p.vo.Sv, x: [-4.05, 4.05], z: [0, 13] });
      if (p.gorny) { chk('gorny ticket hall', p.gorny.room, p.gorny.FV, { S: p.gorny.Sv, x: [-5.05, 5.05], z: [0, 11.4] }); for (const [k, w] of Object.entries(p.gorny.wells)) { chk('gorny pavilion ' + k, w.room, 0.05, { S: w.Se, x: [-w.w.A, w.w.A], z: [0, w.w.open] }); chk('gorny landing ' + k, w.landing.room, -6.95, null); } }
      if (p.sport2) { chk('sportivnaya2 lobby', p.sport2.room, p.sport2.FV, { S: p.sport2.Sv, x: [-5.05, 5.05], z: [0, 11.4] }); for (const [k, w] of Object.entries(p.sport2.wells)) { chk('sportivnaya2 pavilion ' + k, w.room, 0.05, { S: w.Se, x: [-w.w.A, w.w.A], z: [0, w.w.open] }); chk('sportivnaya2 landing ' + k, w.landing.room, -6.95, null); } }
      return out;
    });
    for (const [name, n, bad, sample] of flo) ok(bad === 0 && n > 20, `${name}: floor under every point (${n} samples, ${bad} without a floor ${bad ? JSON.stringify(sample) : ''})`);
    // ways in: from the pavement through the door, down the stairs / lanes, onto the platform
    for (const n of await ev(() => Object.keys(window.__ctx.metro.debug.entries).filter((q) => ['vasileostrovskaya', 'gorny', 'sportivnaya2'].includes(q)))) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.entries[n], res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      console.log(`   way in ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 12, `${n}: walked in from the pavement and onto the platform`);
    }
    // rides: board at the open doors, the first stop is the next station of the line, real time, get off at the stop
    const ride2 = (id, key, next, dest, label, o = {}) => rideFlow(id, key, next, dest, label, { pf: 'p11', arr: true, ...o });
    const r1 = await ride2('vasileostrovskaya', 'N', 'primorskaya', 'generic', 'Vasileostrovskaya -> Primorskaya', { real: false });
    ok(r1.pa.y < -60, 'Vasileostrovskaya -> Primorskaya ends in the generic hall');
    if (await ev(() => !!window.__ctx.metro.env.real['vasileostrovskaya>gostiny'])) {
      const r2 = await ride2('vasileostrovskaya', 'S', 'gostiny', 'gostiny', 'Vasileostrovskaya -> Gostiny Dvor', { real: true });
      ok(Math.abs(r2.pa.y - (-56)) < 1, 'ends on the Gostiny Dvor platform (y -56)');
      const r3 = await ride2('gostiny', 'N', 'vasileostrovskaya', 'vasileostrovskaya', 'Gostiny Dvor -> Vasileostrovskaya', { real: true });
      ok(Math.abs(r3.pa.y - (-64)) < 1, 'ends on the Vasileostrovskaya platform (y -64)');
    } else console.log('   (the real tunnel Vasileostrovskaya <-> Gostiny Dvor is not built: rides through the generic hall)');
    if (await ev(() => !!window.__ctx.metro.env.real['admiralteyskaya>sportivnaya'])) {
      const r4 = await ride2('admiralteyskaya', 'N', 'sportivnaya', 'sportivnaya', 'Admiralteyskaya -> Sportivnaya', { real: true });
      ok(Math.abs(r4.pa.y - (-57.4)) < 1, 'ends on the upper level of Sportivnaya (y -57.4)');
      const r5 = await ride2('sportivnaya', 'S', 'admiralteyskaya', 'admiralteyskaya', 'Sportivnaya (lower level) -> Admiralteyskaya', { real: true });
      ok(Math.abs(r5.pa.y - (-86)) < 1, 'ends on the Admiralteyskaya platform (y -86)');
    } else console.log('   (the real tunnel Admiralteyskaya <-> Sportivnaya is not built)');
    {
      const part = await ev(() => { const l = window.__ctx.metro.env.real['gorny>spasskaya']; return l ? { len: Math.round(l.length), disc: Math.round(l.partial ? l.partial.discS : -1) } : null; });
      const r6 = await ride2('gorny', 'S', 'spasskaya', 'generic', 'Gorny Institut -> Spasskaya' + (part ? ' (partial real tunnel)' : ''), part ? { real: true } : {});
      if (part && part.disc >= 0) { ok(part.disc > 2000 && part.len - part.disc > 40 && part.len - part.disc < 70, `Gorny -> Spasskaya: the real tube is ${part.len} m long, its disc stands ${part.disc} m from the Gorny mouth`); ok(r6.generic ? r6.pa.y < -60 : r6.s.dest === 'spasskaya', 'Gorny -> Spasskaya ends in the hall of the first stop'); }
      else if (part) ok(part.len > 2000 && r6.s.real && r6.s.dest === 'spasskaya', `Gorny -> Spasskaya: the whole tube is real (${part.len} m, no disc) and ends in the Spasskaya hall (${r6.s.dest})`);
    }
    // the closed-type hall shuts its platform doors while no train stands
    const gate = await ev(() => {
      const rt = window.__ctx.metro.stations.vasileostrovskaya, tk = rt.platform.trackByKey('S'), p = window.__ctx.playerObj; const [x, z] = rt.W(-6.3, 3.2); window.__setCam(x, rt.hall.FY, z, 0, 0, true);
      window.__ff(150, 1 / 30, null, () => rt.platform.state(tk, window.__ctx.time).phase === 'away');
      const f = rt.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw); p.yaw = Math.atan2(-dx, -dz); window.__ff(2.5, 1 / 60, () => ['KeyW']); const [lx] = rt.L(p.pos.x, p.pos.z);
      return { lx, phase: rt.platform.state(tk, window.__ctx.time).phase, y: p.pos.y };
    });
    ok(gate.lx > -7.3 && gate.y > -64.3, `Vasileostrovskaya: the platform doors are shut while no train stands (x ${gate.lx.toFixed(2)}, ${gate.phase})`);
    // screenshots of the halls, inclines and ticket halls (luma; the pictures are compared with the photos by eye: tools/metro-vo-shots.mjs)
    const views = await ev(() => { const m = window.__ctx.metro, p = m.petro, out = [], add = (name, S, x, y, z, tx, tz, pitch = -2) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], pitch, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      add('vo_hall', p.vo.S, 0, -62.3, -50, 0, 40); add('vo_esc', p.vo.Se, 2, p.vo.esc.yAt(78) + 1.7, 78, 2, 0); add('vo_vest', p.vo.Sv, -12, p.vo.FV + 1.7, -6.5, 0, 0);
      if (p.gorny) { add('gn_hall', p.gorny.S, 0.5, -68.3, -60, 0.5, 40); add('gn_esc', p.gorny.Se, -2, p.gorny.esc.yAt(40) + 1.7, 40, -2, 0, 24); add('gn_ticket', p.gorny.Sv, 0, p.gorny.FV + 1.7, -9, 0, 20); }      /* gn_esc looks UP the incline (pitch 24): review-metro found it at pitch -2 on 10.0 % dark, the very threshold of lumOk, failing with the clock of the day */
      return out; });
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, v.pitch); const s = await shot('p11v_' + v.name); lumOk(s, `view ${v.name}`, 45, 215); }
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
