// End-to-end test of the VITEBSKY NODE of the metro (Pushkinskaya, Zvenigorodskaya, the 2008 passage, the real tunnel Vladimirskaya -> Pushkinskaya) in the real renderer (headless Edge / Chrome, puppeteer-core): ?only=metro.
//   node tools/metro-vitebsky-test.mjs [--q medium] [--out shots/metro/vit] [--only 1,2,3,4,5,6]
//   sections: 1 load (both halls real, built in the network, a way in / out each), 2 geometry (rooms inside their houses, shafts inside, no ground hole on a carriageway / in the water, a floor under
//   the vestibules), 3 ways in and out with real physics (window.__walk), 4 both transfer walks (stairs, bridges over the southbound tracks, corridors, chamber), 5 rides (Vladimirskaya ->
//   Pushkinskaya through the real tunnel onto the right platform, back, Zvenigorodskaya -> the next stop), 6 screenshots of the halls, the passage and the vestibules (luma checks).
// Harness and helpers as tools/metro-test.mjs (section 10 style). Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro/vit');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SECTIONS = new Set((args.only || '1,2,3,4,5,6').split(',').map((s) => s.trim()));
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
    const [x, z] = rt.W(sx * (rt.hall.EDGE - 0.9), tk.train.cars.length % 2 ? 0 : 9.825); window.__setCam(x, fy, z, 0, 0, true);                // at a car centre (an 8-car train has a coupling at z 0: standing there means standing at a door, and the rider steps out at once)
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



  // ---------------------------------------------------------------- the node object (metro.js keeps it as ctx.metro.petro.vit; X.vitebsky is the same object)
  const HUB = '(window.__ctx.metro.petro && window.__ctx.metro.petro.vit) || window.__ctx.metro.vit || window.__ctx.metro.vitebsky';
  const IDS = ['pushkinskaya', 'zvenigorodskaya'];
  const fn = (args, body) => new Function(...args, 'const V = ' + HUB + ', IDS = ' + JSON.stringify(IDS) + ';\n' + body);
  const routeOf = (kind, id) => ev(fn(['kind', 'id'], 'const m = window.__ctx.metro, d = m.debug[kind] && m.debug[kind][id]; if (d) return d; const st = V && V[id]; return st ? (kind === "exits" ? st.exitRoute() : st.entryRoute()) : null;'), kind, id);

  // ---------------------------------------------------------------- 1. load: both halls are real stations, built in the network, with a way in and a way out
  if (SECTIONS.has('1')) {
    console.log('1. load: Pushkinskaya / Zvenigorodskaya');
    const st = await ev(fn([], `const m = window.__ctx.metro;
      return { hub: !!V, links: Object.keys(m.env.real).filter((k) => /pushkinskaya|zvenigorodskaya/.test(k)), zvenEnd: V && V.zvenigorodskaya ? V.zvenigorodskaya.endDone || null : null,
        ids: IDS.map((id) => ({ id, rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!(m.debug.exits && m.debug.exits[id]) || !!(V && V[id] && V[id].exitRoute), entry: !!(m.debug.entries && m.debug.entries[id]) || !!(V && V[id] && V[id].entryRoute) })),
        walks: Object.keys(m.debug.walks || {}).filter((k) => /pushkinskaya|zvenigorodskaya/.test(k)), errors: (window.__ctx.errors || []).map((e) => String((e && e.message) || e)).filter((s) => /vitebsk|pushkin|zvenig/i.test(s)) };`));
    console.log('   ', JSON.stringify(st));
    ok(st.hub, 'the Vitebsky node object is published (ctx.metro.petro.vit)');
    for (const b of st.ids) ok(b.rt && b.net && b.exit && b.entry, `${b.id}: real hall, built in the network, a way out and a way in (${JSON.stringify(b)})`);
    ok(st.links.includes('vladimirskaya>pushkinskaya') && st.links.includes('pushkinskaya>vladimirskaya'), `the real tunnel Vladimirskaya <-> Pushkinskaya is registered (${st.links.join(', ') || 'none'})`);
    ok(st.walks.includes('pushkinskaya->zvenigorodskaya') && st.walks.includes('zvenigorodskaya->pushkinskaya'), `both transfer walks are in debug.walks (${st.walks.join(', ') || 'none'}; metro.js calls vit.register(debug))`);
    ok(st.zvenEnd === 'stubs' || st.zvenEnd === 'link', `the -z end of Zvenigorodskaya has its tunnel or its stubs (${st.zvenEnd})`);
    ok(st.errors.length === 0, `no build errors of the node (${st.errors.join(' | ') || 'none'})`);
  }
  // ---------------------------------------------------------------- 2. geometry: rooms inside their houses, shafts inside, no ground hole on a carriageway / in the water, a floor under the vestibules
  if (SECTIONS.has('2')) {
    console.log('2. geometry');
    const geo = await ev(fn([], `const L = window.__ctx.L, bad = [];
      for (const id of IDS) { const r = V && V[id] && V[id].room; if (!r) { bad.push(['no room', id]); continue; } for (const [x, z] of r.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room ' + id, +x.toFixed(1), +z.toFixed(1)]); }
      const H = L.GROUND_HOLES.filter((q) => IDS.includes(q.station));
      for (const s of H) { const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * c + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * c; if (L.isOnRoad(x, z, 0) || L.waterwayAt(x, z)) bad.push(['hole ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (s.kind === 'escalator' && !L.insideBuilding(x, z, 0)) bad.push(['shaft outside its house ' + s.id, +x.toFixed(1), +z.toFixed(1)]); } }
      return { bad, holes: H.length, doors: (L.DOORWAYS || []).filter((d) => IDS.includes(d.station)).map((d) => d.id) };`));
    ok(geo.bad.length === 0, `rooms inside their houses, shafts inside, no hole on a carriageway / in the water (${geo.bad.length ? JSON.stringify(geo.bad) : 'all clear'})`);
    ok(geo.holes === 2 && geo.doors.length === 4, `two shaft holes and four doorways (${geo.holes}; ${geo.doors.join(', ')})`);
    // a floor under every point of both vestibules (0.6 m grid, 0.4 m clear of the walls, the shaft mouth left out)
    const flo = await ev(fn([], `const ph = window.__ctx.physics, out = [];
      for (const id of IDS) { const st = V && V[id]; if (!st || !st.room) { out.push([id, 0, 0, []]); continue; } const room = st.room, A = id === 'zvenigorodskaya' ? 5.4 : 4.4;
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of room.poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        let n = 0, bad = 0; const sample = [];
        for (let x = x0; x <= x1; x += 0.6) for (let z = z0; z <= z1; z += 0.6) {
          if (!room.inside(x, z) || ![[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]].every(([dx, dz]) => room.inside(x + dx, z + dz))) continue;
          const [lx, lz] = st.Sv.L(x, z); if (Math.abs(lx) < A + 0.6 && lz > -0.9 && lz < 13.9) continue;
          n++; const y = ph.groundHeight(x, z, st.FV + 0.6, false); if (!(y > -0.2 && y < st.FV + 0.2)) { bad++; if (sample.length < 4) sample.push([+x.toFixed(1), +z.toFixed(1), y === -Infinity ? '-inf' : +y.toFixed(2)]); } }
        out.push([id, n, bad, sample]); }
      return out;`));
    for (const [name, n, bad, sample] of flo) ok(bad === 0 && n > 20, `${name} vestibule: a floor under every point (${n} samples, ${bad} without ${bad ? JSON.stringify(sample) : ''})`);
  }
  // ---------------------------------------------------------------- 3. ways in and out with real physics
  if (SECTIONS.has('3')) {
    console.log('3. ways in and out');
    for (const id of IDS) {
      const win = await routeOf('entries', id);
      if (ok(!!win, `${id}: a way in exists`)) {
        const r = await ev((w) => { const res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, win);
        console.log(`   way in ${id}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
        ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${id}: walked in from the pavement through the door, down the incline and onto the platform`);
      }
      const wout = await routeOf('exits', id);
      if (ok(!!wout, `${id}: a way out exists`)) {
        const q = await ev((w) => { const res = window.__walk(w.start, w.points), p = window.__ctx.playerObj, d = (p.pos.x - w.door[0]) * w.outward[0] + (p.pos.z - w.door[1]) * w.outward[1]; return { ...res, beyond: d, y: p.pos.y }; }, wout);
        console.log(`   way out ${id}: reached ${q.reached}/${q.of}, ${q.t.toFixed(0)} s, y ${q.y.toFixed(2)}, ${q.beyond.toFixed(1)} m beyond the door ${q.trace ? JSON.stringify(q.trace) : ''}`);
        ok(q.reached === q.of && q.beyond > 1.5 && Math.abs(q.y) < 0.4, `${id}: walked from the platform up the incline and out onto the pavement`);
      }
    }
  }
  // ---------------------------------------------------------------- 4. the transfer on foot, both ways; the side platform under the bridges
  if (SECTIONS.has('4')) {
    console.log('4. transfer Pushkinskaya <-> Zvenigorodskaya');
    for (const n of ['pushkinskaya->zvenigorodskaya', 'zvenigorodskaya->pushkinskaya']) {
      const w = await ev(fn(['n'], 'const m = window.__ctx.metro; return (m.debug.walks && m.debug.walks[n]) || (V && V.walks ? V.walks()[n] : null);'), n);
      if (!ok(!!w, `${n}: the walk exists`)) continue;
      const r = await ev((w) => { const res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, w);
      console.log(`   ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(2)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 4, `${n}: walked over the bridges, through the corridor and the chamber onto the other platform (${r.t.toFixed(0)} s)`);
    }
    for (const id of IDS) {
      const strip = await ev(fn(['id'], 'const st = V[id], rt = window.__ctx.metro.stations[id], x = -(st.dims.EDGE - 0.8), s = rt.W(x, 4), e = rt.W(x, -26); const res = window.__walk([s[0], s[1], st.FY], [e]); return { ...res, endY: st.FY };'), id);
      ok(strip.reached === 1 && Math.abs(strip.y - strip.endY) < 0.3, `${id}: the side platform under the bridges is walkable (reached ${strip.reached}, y ${strip.y.toFixed(2)})`);
    }
  }
  // ---------------------------------------------------------------- 5. rides: the real tunnel Vladimirskaya -> Pushkinskaya onto the right platform, back, the next stops of both stations
  if (SECTIONS.has('5')) {
    console.log('5. rides');
    const real = await ev(() => !!window.__ctx.metro.env.real['vladimirskaya>pushkinskaya']);
    ok(real, 'Vladimirskaya -> Pushkinskaya has a REAL tunnel');
    const r1 = await rideFlow('vladimirskaya', 'S', 'pushkinskaya', 'pushkinskaya', 'Vladimirskaya -> Pushkinskaya', { pf: 'v5', arr: true, real });
    ok(Math.abs(r1.pa.y - (-57)) < 0.6 && r1.pa.lx < -10, `got off on the southbound (S, local -x) platform of Pushkinskaya (y ${r1.pa.y.toFixed(1)}, x ${(r1.pa.lx ?? 0).toFixed(1)})`);
    const r2 = await rideFlow('pushkinskaya', 'N', 'vladimirskaya', 'vladimirskaya', 'Pushkinskaya -> Vladimirskaya', { pf: 'v5', real });
    ok(Math.abs(r2.pa.y - (-55)) < 0.6, `Pushkinskaya -> Vladimirskaya ends on the Vladimirskaya platform (y ${r2.pa.y.toFixed(1)})`);
    const nx = await ev(() => { const m = window.__ctx.metro; return { sadReal: !!m.env.real['zvenigorodskaya>sadovaya'], sad: !!m.stations.sadovaya, tek: !!m.stations.tekhnolog }; });
    await rideFlow('zvenigorodskaya', 'N', 'sadovaya', nx.sad ? 'sadovaya' : 'generic', 'Zvenigorodskaya -> Sadovaya', { pf: 'v5', real: nx.sadReal });
    await rideFlow('pushkinskaya', 'S', 'tekhnolog', nx.tek ? 'tekhnolog' : 'generic', 'Pushkinskaya -> Tekhnologichesky Institut', { pf: 'v5' });
  }
  // ---------------------------------------------------------------- 6. screenshots (luma checks; the pictures are compared with the photos refs/vitebsky by eye)
  if (SECTIONS.has('6')) {
    console.log('6. views');
    const views = await ev(fn([], `const out = [], add = (name, S, x, y, z, tx, tz, pitch = -2) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], pitch, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      const p = V.pushkinskaya, z = V.zvenigorodskaya;
      add('push_hall', p.S, 0, p.FY + 1.7, 40, 0, -40); add('push_statue', p.S, 0, p.FY + 1.7, -60, 0, -80, 4); add('push_side', p.S, -10.5, p.FY + 1.7, 30, -10.5, -30); add('push_stairs', p.S, 2.5, p.FY + 1.7, -9, -6, -9, 6);
      add('push_esc', p.Se, 2, p.esc.yAt(60) + 1.7, 60, 2, 0, 20); add('push_vest', p.Sv, -12, p.FV + 1.7, -8, 0, 0);
      add('zven_hall', z.S, 0, z.FY + 1.7, 50, 0, -40); add('zven_mosaic', z.S, 0, z.FY + 1.7, -50, 0, -80, 6); add('zven_stairs', z.S, 2.5, z.FY + 1.7, -15.2, -6, -15.2, 8); add('zven_side', z.S, 7.5, z.FY + 1.7, 30, 7.5, -30);
      add('zven_esc', z.Se, 1, z.esc.yAt(60) + 1.7, 60, 1, 0, 20); add('zven_vest', z.Sv, -12, z.FV + 1.7, 2, 0, 0);
      add('chamber', z.S, -26, z.FY + 3.62 + 1.7, -13.5, -15, -15.2); add('bridge', p.S, -12, p.FY + 3.62 + 1.7, -12, -25, -12);
      return out;`));
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, v.pitch); const s = await shot('v6_' + v.name); lumOk(s, `view ${v.name}`, 45, 215); }
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
