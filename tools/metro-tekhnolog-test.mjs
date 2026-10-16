// Tekhnologichesky Institut 1 + 2 in the real renderer (headless Edge / Chrome with GPU, puppeteer-core): ?only=metro. Companion of tools/metro-test.mjs (its harness and ride helpers, copied).
//   node tools/metro-tekhnolog-test.mjs [--q medium|high|low] [--out shots/metro/tk] [--only 1,2,3,4,5]   (1 built + geometry against the city, 2 ways in / out, 3 the cross passage, 4 rides, 5 views)
// Needs the metro.js wiring of metro/hub-tekhnolog.js (petro.tekh / petro.tekh2 / petro.tekhHub, debug.exits / entries / walks) and the define() call of data/metro-tekhnolog.js in data/metro.js.
// Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro/tk');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SECTIONS = new Set((args.only || '1,2,3,4,5').split(',').map((s) => s.trim()));
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
  /** stand at the platform edge beside the doors of track `key` of station `id` (hall z `lz`), face the train, run until it stands with open doors.
   *  Hall 1 of Tekhnologichesky Institut: the transfer stair (TK.SW1 = 7 m wide, local x 2.4 .. 9.4) crosses the +x (N) side platform at z = 0, so the N track is boarded at lz = 6,
   *  the arcade opening next to the stair (the openings grid { z0: 6, step: 12 } the ride uses to set a rider down); lz = 0 put the player inside the flight and the physics pushed
   *  it off the edge onto the track bed (y -41.0, run 1). */
  const atPlatform = (id, key, lz = 0) => ev((id, key, lz) => {
    const m = window.__ctx.metro, rt = m.stations[id], tk = rt.platform.trackByKey(key), sx = key === 'S' ? -1 : 1, fy = tk.fy ?? rt.hall.FY;
    const [x, z] = rt.W(sx * (rt.hall.EDGE - 0.9), lz); window.__setCam(x, fy, z, 0, 0, true);
    const f = rt.frame, dx = Math.cos(f.yaw) * sx, dz = -Math.sin(f.yaw) * sx; window.__ctx.playerObj.yaw = Math.atan2(-dx, -dz);                       // look at the train (local -x for the S track, +x for the N track)
    window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95; });
    const s = rt.platform.state(tk, window.__ctx.time); return { phase: s.phase, open: s.open, stock: tk.stock, fy, y: window.__ctx.playerObj.pos.y };
  }, id, key, lz);
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
  /** one whole ride: platform of `id` / `key`, board, the first stop must be `next` shown in the hall `dest` ('generic' = the shared generic hall), the car picture, get off. o: { pf (screenshot prefix), real, yCheck, arr (arrival picture), lz (hall z of the standing point) } */
  const rideFlow = async (id, key, next, dest, label, o = {}) => {
    const pf = o.pf || 'r', st = await atPlatform(id, key, o.lz || 0);
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


  // ================================================================================================================ Tekhnologichesky Institut 1 + 2
  // ---------------------------------------------------------------- 1. built: halls, network, ways, walks, geometry against the city (rooms inside r2163775, shafts inside, no hole on a road)
  if (SECTIONS.has('1')) {
    console.log('1. Tekhnologichesky Institut: built, rooms, shafts, doorways');
    const b = await ev(() => { const m = window.__ctx.metro; return ['tekhnolog', 'tekhnolog2'].map((id) => ({ id, rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!m.debug.exits[id], entry: !!m.debug.entries[id], fy: m.stations[id] ? m.stations[id].hall.FY : null })); });
    for (const s of b) ok(s.rt && s.net && s.exit && s.entry && s.fy === -40, `${s.id}: real hall at -40, marked built in the network, a way out and a way in (${JSON.stringify(s)})`);
    const w = await ev(() => Object.keys(window.__ctx.metro.debug.walks || {}).filter((k) => k.startsWith('tekhnolog')));
    ok(w.includes('tekhnolog->tekhnolog2') && w.includes('tekhnolog2->tekhnolog'), `transfer walks published (${w.join(', ')})`);
    const geo = await ev(() => {
      const L = window.__ctx.L, p = window.__ctx.metro.petro, bad = [], v = (p.tekh && p.tekh.vest) || (p.tekhHub && p.tekhHub.vest);
      if (!v) return ['no vestibule'];
      for (const [x, z] of v.room.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room', +x.toFixed(1), +z.toFixed(1)]);
      for (const s of L.GROUND_HOLES.filter((q) => q.station === 'tekhnolog' || q.station === 'tekhnolog2')) {
        const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * c + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * c; if (L.isOnRoad(x, z, 0) || (L.waterwayAt && L.waterwayAt(x, z))) bad.push(['hole on road/water ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (!L.insideBuilding(x, z, 0)) bad.push(['hole outside ' + s.id, +x.toFixed(1), +z.toFixed(1)]); }
      }
      for (const d of L.DOORWAYS.filter((q) => q.station === 'tekhnolog')) { const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY); if (!L.insideBuilding(d.x - nx * 1.0, d.z - nz * 1.0, 0) || L.insideBuilding(d.x + nx * 1.5, d.z + nz * 1.5, 0)) bad.push(['doorway not on the facade ' + d.id]); }
      return bad;
    });
    ok(geo.length === 0, `vestibule inside r2163775, both shafts inside it and off the roads, doorways on the facade (${geo.length ? JSON.stringify(geo) : 'all clear'})`);
    const tris = await ev(() => { let n = 0; window.__ctx.scene.traverse((o) => { if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return; let q = o, hit = false; while (q) { if (/^(tekhnolog|tekh-)/.test(q.name || '')) { hit = true; break; } q = q.parent; } if (hit) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }); return Math.round(n); });
    console.log(`   triangles under tekhnolog* groups (the part the batcher left in its groups): ${tris}`);
    ok(tris < 200000, `both halls + passage + vestibule under 200k triangles (${tris})`);
  }
  // ---------------------------------------------------------------- 2. ways in and out (pavement <-> platform, real physics)
  if (SECTIONS.has('2')) {
    console.log('2. ways in and out');
    for (const n of ['tekhnolog', 'tekhnolog2']) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.entries[n], res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      console.log(`   way in ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${n}: walked in from the pavement, through the vestibule, down the incline, onto the platform`);
      const x = await ev((n) => { const w = window.__ctx.metro.debug.exits[n], res = window.__walk(w.start, w.points); const o = w.outward, d = (res.x - w.door[0]) * o[0] + (res.z - w.door[1]) * o[1]; return { ...res, d }; }, n);
      console.log(`   way out ${n}: reached ${x.reached}/${x.of}, ${x.t.toFixed(0)} s, y ${x.y.toFixed(1)}, ${x.d.toFixed(1)} m outside the door ${x.trace ? JSON.stringify(x.trace) : ''}`);
      ok(x.reached === x.of && Math.abs(x.y) < 0.4 && x.d > 1.5, `${n}: walked out from the platform up the incline to the pavement`);
    }
  }
  // ---------------------------------------------------------------- 3. the cross passage both ways
  if (SECTIONS.has('3')) {
    console.log('3. the cross passage (transfer) both ways');
    for (const n of ['tekhnolog->tekhnolog2', 'tekhnolog2->tekhnolog']) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.walks[n], res = window.__walk(w.start, w.points); return { ...res, endY: w.end.y }; }, n);
      console.log(`   ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4, `${n}: walked platform to platform over the stairs, the bridges and the passage`);
    }
  }
  // ---------------------------------------------------------------- 4. trains and rides: both tracks of both halls; the first stop is the neighbour of the line (a real hall when it is built)
  if (SECTIONS.has('4')) {
    console.log('4. rides');
    const nb = await ev(() => { const m = window.__ctx.metro, b = (id) => !!(m.stations[id] && m.env.net.BY_ID[id].built), r = (k) => !!m.env.real[k]; return { push: b('pushkinskaya'), senn: b('sennaya'), l1: r('tekhnolog>pushkinskaya'), l2: r('tekhnolog2>sennaya') }; });
    console.log('   neighbours', JSON.stringify(nb));
    await rideFlow('tekhnolog', 'N', 'pushkinskaya', nb.push ? 'pushkinskaya' : 'generic', 'Tekhnologichesky Institut -> Pushkinskaya', { pf: 'tk', real: nb.l1, arr: true, lz: 6 });   // beside the transfer stair (atPlatform)
    await rideFlow('tekhnolog', 'S', 'baltiyskaya', 'generic', 'Tekhnologichesky Institut -> Baltiyskaya', { pf: 'tk' });
    await rideFlow('tekhnolog2', 'S', 'sennaya', nb.senn ? 'sennaya' : 'generic', 'Tekhnologichesky Institut 2 -> Sennaya', { pf: 'tk', real: nb.l2, arr: true });
    await rideFlow('tekhnolog2', 'N', 'moskovskiye', 'generic', 'Tekhnologichesky Institut 2 -> Moskovskiye Vorota (Frunzenskaya closed)', { pf: 'tk' });
    if (nb.push) await rideFlow('pushkinskaya', 'S', 'tekhnolog', 'tekhnolog', 'Pushkinskaya -> Tekhnologichesky Institut', { pf: 'tk', real: nb.l1, arr: true });
    if (nb.senn) await rideFlow('sennaya', 'N', 'tekhnolog2', 'tekhnolog2', 'Sennaya -> Tekhnologichesky Institut 2', { pf: 'tk', real: nb.l2, arr: true });
  }
  // ---------------------------------------------------------------- 5. views (luma; compared with refs/tekhnolog by eye)
  if (SECTIONS.has('5')) {
    console.log('5. views');
    const views = await ev(() => {
      const m = window.__ctx.metro, p = m.petro, h1 = p.tekh, h2 = p.tekh2, out = [], add = (name, S, x, y, z, tx, tz, pitch = -2) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], pitch, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      if (h1) { add('h1_axis', h1.S, 0, -38.3, -60, 0, 40); add('h1_stair', h1.S, -3.5, -38.3, 0, 6, 0, 6); add('h1_side', h1.S, 7.4, -38.3, -40, 7.4, 20); add('h1_esc', h1.Se, 1, h1.esc.yAt(50) + 1.7, 50, 1, 0, 18); }
      if (h2) { add('h2_axis', h2.S, 0, -38.3, 50, 0, 0); add('h2_stair', h2.S, 0, -38.3, h2.zA + 12, 0, h2.zA - 4, 8); add('h2_side', h2.S, -7.4, -38.3, 20, -7.4, -30); }
      if (h1 && h1.vest) add('vest', h1.vest.Sv1, 9, 1.7, 22, 0, 0);
      return out;
    });
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, v.pitch); const s = await shot('tkv_' + v.name); lumOk(s, `view ${v.name}`, 45, 215); }
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
