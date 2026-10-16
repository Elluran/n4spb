// End-to-end test of the EAST metro stations in the real renderer (headless Edge / Chrome with GPU, puppeteer-core): ?only=metro.
//   node tools/metro-east-test.mjs [--q medium|high|low] [--out shots/metro/east] [--only 1,2,3,4,5,6,7] [--extra key=value,...]
//   Pl. Aleksandra Nevskogo 1 (line 3, closed type), Pl. Aleksandra Nevskogo 2 (line 4, column hall) with the transfer passage, Ligovsky Prospekt (line 4, single vault); docs/research/metro-east.md,
//   code metro/hub-east.js, st-pan.js, st-ligovsky.js, links-east.js, data/metro-east.js. Sections (the style of tools/metro-test.mjs section 10):
//     1 the halls exist, are built in the network, have a way out / a way in, the transfer walks and the real links Mayakovskaya <-> PAN-1, Dostoevskaya <-> Ligovsky <-> PAN-2
//     2 geometry: the vestibule rooms inside their houses, the shafts inside, no hole on a carriageway or in the water, a floor under every point of the vestibules
//     3 ways in: pavement -> door -> turnstiles -> DOWN lane -> (passage) -> platform (window.__walk, real physics)
//     4 ways out: platform -> UP lane -> vestibule -> door -> pavement
//     5 the PAN transfer on foot both ways (stair, landing with the relief, footway, the gallery escalators)
//     6 rides through the REAL tunnels: Mayakovskaya -> PAN-1, PAN-1 -> Mayakovskaya, Dostoevskaya -> Ligovsky, Ligovsky -> PAN-2 (board, the first stop, open doors, get off on the right platform)
//     7 the closed platform doors of PAN-1, screenshots of the halls / passage / vestibules (luma: neither dark nor white)
// Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro/east');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SECTIONS = new Set((args.only || '1,2,3,4,5,6,7').split(',').map((s) => s.trim()));
const EAST = ['pan1', 'pan2', 'ligovsky'];

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
  const q = new URLSearchParams({ q: args.q || 'medium', stats: '1', only: args.modules || 'metro' }); for (const kv of String(args.extra || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); q.set(k, v || '1'); }
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  for (const e of await page.evaluate(() => window.__errors || [])) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  await page.click('#go'); await sleep(800);

  // ---------------------------------------------------------------- in-page helpers (the same as tools/metro-test.mjs)
  await page.evaluate(() => {
    const C = () => window.__ctx, P = () => window.__ctx.playerObj;
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
    window.__pose = () => { const p = P(); return { x: p.pos.x, y: p.pos.y, z: p.pos.z, g: p.onGround, fly: p.fly, ride: p.riding, yaw: p.yaw * 180 / Math.PI, indoor: C().indoor.amount, zone: C().indoor.zone?.indoor?.name || C().indoor.zone?.id || null, time: C().time }; };
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
        if (reached !== i + 1) { trace = [i, +best.toFixed(1), +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), w.map((v) => +v.toFixed(1))]; break; }
      }
      return { reached, of: points.length, t, trace, x: p.pos.x, y: p.pos.y, z: p.pos.z };
    };
    window.__ffTo = (tAbs, stop = null) => window.__ff(Math.max(0, tAbs - window.__ctx.time), 1 / 30, null, stop);
    window.__lum = async (b64) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const w = img.width, h = img.height, cv = new OffscreenCanvas(w, h), g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); img.close();
      const d = g.getImageData(0, 0, w, h).data; let s = 0, dark = 0, white = 0; const n = w * h;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; if (l < 22) dark++; if (l > 240) white++; }
      return { mean: s / n, dark: dark / n, white: white / n };
    };
  });
  const cam = async (x, y, z, yaw, pitch, stand = false) => { await page.evaluate((a) => window.__setCam(...a), [x, y, z, yaw, pitch, stand]); await sleep(300); };
  const shot = async (name) => { const f = `${out}_${name}.png`; const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return { f, b64, ...(await page.evaluate((b) => window.__lum(b), b64)) }; };
  const chip = () => page.evaluate(() => { const c = document.getElementById('interact'); return { show: c.classList.contains('show'), text: c.textContent }; });
  const frames = (n = 3) => page.evaluate((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const ev = (fn, ...a) => page.evaluate(fn, ...a);
  const lumOk = (s, what, lo = 55, hi = 215, dark = 0.1) => ok(s.mean > lo && s.mean < hi && s.dark < dark && s.white < 0.1, `${what}: neither dark nor white (mean ${s.mean.toFixed(0)}, dark ${(s.dark * 100).toFixed(1)} %, white ${(s.white * 100).toFixed(1)} %)`);
  // ---------------------------------------------------------------- ride helpers (tools/metro-test.mjs: the chip «Войти», a chain of legs in real time, the chip «Выйти»)
  const RIDE_FF = 360;
  const atPlatform = (id, key) => ev((id, key) => {
    const m = window.__ctx.metro, rt = m.stations[id], tk = rt.platform.trackByKey(key), sx = key === 'S' ? -1 : 1, fy = tk.fy ?? rt.hall.FY;
    const [x, z] = rt.W(sx * (rt.hall.EDGE - 0.9), 0); window.__setCam(x, fy, z, 0, 0, true);
    const f = rt.frame, dx = Math.cos(f.yaw) * sx, dz = -Math.sin(f.yaw) * sx; window.__ctx.playerObj.yaw = Math.atan2(-dx, -dz);
    window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, window.__ctx.time); return s.phase === 'dwell' && s.open > 0.95; });
    const s = rt.platform.state(tk, window.__ctx.time); return { phase: s.phase, open: s.open, stock: tk.stock, fy, y: window.__ctx.playerObj.pos.y };
  }, id, key);
  const rideFlow = async (id, key, next, label) => {
    const st = await atPlatform(id, key);
    ok(st.phase === 'dwell' && st.open > 0.95 && Math.abs(st.y - st.fy) < 0.2, `${label}: on the platform (y ${st.y.toFixed(1)}), a train stands with open doors (${st.stock})`);
    await frames(3); const c1 = await chip(); ok(c1.show && /Войти/.test(c1.text), `${label}: boarding offered ("${c1.text}")`);
    const sp = await shot(`ride_${id}_${key}`); lumOk(sp, `${label}: platform with a train`);
    await ev(() => window.__ctx.interact.use()); await sleep(400);
    const b = await ev(() => { const S = window.__ctx.metro.ride.session, l = S && S.legs[0]; return { ride: !!window.__ctx.playerObj.riding, next: l ? l.to.id : null, real: l ? !!l.route.real : false }; });
    ok(b.ride && b.next === next, `${label}: boarded, the next stop is ${next} (${b.next})`);
    ok(b.real, `${label}: the leg runs through the real tunnel (route.real ${b.real})`);
    if (!b.ride) return null;
    await ev(() => { window.__ffTo(window.__ctx.metro.ride.session.legs[0].tDepart + 20); }); await frames(2);
    const sc = await shot(`ride_car_${id}_${key}`); ok(sc.mean > 30 && sc.mean < 215 && sc.white < 0.1 && sc.dark < 0.5, `${label}: inside the car in the tunnel (mean ${sc.mean.toFixed(0)}, dark ${(sc.dark * 100).toFixed(1)} %)`);
    const s = await ev((budget) => {
      const R = window.__ctx.metro.ride;
      window.__ff(budget, 1 / 30, null, () => { const q = R.session && R.session.state; return !!q && q.phase === 'open' && q.k >= 0; });
      const S = R.session, q = S && S.state, leg = q && q.leg; if (!leg) return { gone: true };
      return { phase: q.phase, k: q.k, to: leg.to.id, dest: leg.destRt.id, fy: leg.destTk.fy ?? leg.destRt.hall.FY };
    }, RIDE_FF);
    ok(!s.gone && s.phase === 'open' && s.k === 0 && s.to === next && s.dest === next, `${label}: stopped at ${next} in its own hall with open doors (${JSON.stringify(s)})`);
    if (s.gone) return null;
    await frames(2); const c2 = await chip(); ok(c2.show && /Выйти/.test(c2.text), `${label}: get-off prompt ("${c2.text}")`);
    await ev(() => window.__ctx.interact.use()); await sleep(300);
    const pa = await ev((id) => { const p = window.__pose(), rt = window.__ctx.metro.stations[id], [lx, lz] = rt.L(p.x, p.z); return { ...p, lx, lz, PZ: rt.hall.PZ }; }, next);
    ok(!pa.ride && Math.abs(pa.lx) < 12 && Math.abs(pa.lz) <= pa.PZ + 1 && Math.abs(pa.y - s.fy) < 0.3, `${label}: got off onto the platform of ${next} (y ${pa.y.toFixed(2)}, hall x ${pa.lx.toFixed(1)} z ${pa.lz.toFixed(1)})`);
    const sa = await shot(`ride_arr_${next}_${key}`); lumOk(sa, `${label}: arrival platform`);
    return pa;
  };

  // ---------------------------------------------------------------- 1. the stations, the routes, the real links
  if (SECTIONS.has('1')) {
    console.log('1. east stations: built, routes, real links');
    const built = await ev((ids) => { const m = window.__ctx.metro; return ids.map((id) => ({ id, rt: !!m.stations[id], net: !!m.env.net.BY_ID[id].built, exit: !!m.debug.exits[id], entry: !!m.debug.entries[id] })); }, EAST);
    for (const b of built) ok(b.rt && b.net && b.exit && b.entry, `${b.id}: real hall, built in the network, a way out and a way in (${JSON.stringify(b)})`);
    const w = await ev(() => Object.keys(window.__ctx.metro.debug.walks).filter((k) => /pan/.test(k)));
    ok(w.includes('pan1->pan2') && w.includes('pan2->pan1'), `the PAN transfer walks exist (${w.join(', ')})`);
    const links = await ev(() => { const r = window.__ctx.metro.env.real; return ['mayakovskaya>pan1', 'pan1>mayakovskaya', 'dostoevskaya>ligovsky', 'ligovsky>dostoevskaya', 'ligovsky>pan2', 'pan2>ligovsky'].map((k) => [k, r[k] ? Math.round(r[k].length) : 0]); });
    for (const [k, L] of links) ok(L > 700, `real tunnel ${k} (${L} m)`);
  }
  // ---------------------------------------------------------------- 2. geometry
  if (SECTIONS.has('2')) {
    console.log('2. vestibules inside their houses, shafts, floors');
    const geo = await ev((ids) => {
      const L = window.__ctx.L, e = window.__ctx.metro.east, bad = [];
      const rooms = [['pan1 rotunda', e.pan1 && e.pan1.rooms[0]], ['pan1 concourse', e.pan1 && e.pan1.rooms[1]], ['pan2', e.pan2 && e.pan2.room], ['ligovsky', e.ligovsky && e.ligovsky.room]];
      for (const [n, r] of rooms) { if (!r) { bad.push(['no room ' + n]); continue; } for (const [x, z] of r.poly) if (!L.insideBuilding(x, z, 0)) bad.push(['room ' + n, +x.toFixed(1), +z.toFixed(1)]); }
      for (const s of L.GROUND_HOLES.filter((q) => ids.includes(q.station))) {
        const c = Math.cos(s.rotY), sn = Math.sin(s.rotY);
        for (const [lx, lz] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) { const x = s.x + lx * s.w / 2 * c + lz * s.d / 2 * sn, z = s.z - lx * s.w / 2 * sn + lz * s.d / 2 * c; if (L.isOnRoad(x, z, 0) || L.waterwayAt(x, z)) bad.push(['hole ' + s.id, +x.toFixed(1), +z.toFixed(1)]); if (!L.insideBuilding(x, z, 0)) bad.push(['shaft outside its house ' + s.id, +x.toFixed(1), +z.toFixed(1)]); }
      }
      return bad;
    }, EAST);
    ok(geo.length === 0, `rooms inside their houses, shafts inside, no hole on a carriageway / in the water (${geo.length ? JSON.stringify(geo) : 'all clear'})`);
    const flo = await ev(() => {
      const c = window.__ctx, ph = c.physics, e = c.metro.east, out = [];
      const chk = (name, room, fy, hole) => {
        if (!room) { out.push([name, 0, 1, ['no room']]); return; }
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const [x, z] of room.poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
        let n = 0, bad = 0; const sample = [];
        for (let x = x0; x <= x1; x += 0.5) for (let z = z0; z <= z1; z += 0.5) {
          if (!room.inside(x, z) || ![[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4]].every(([dx, dz]) => room.inside(x + dx, z + dz))) continue;
          const [lx, lz] = hole.S.L(x, z); if (lx > -hole.A - 0.9 && lx < hole.A + 0.9 && lz > -0.9 && lz < 13.9) continue;
          n++; const y = ph.groundHeight(x, z, fy + 0.6, false); if (!(Math.abs(y - fy) < 0.15)) { bad++; if (sample.length < 4) sample.push([+x.toFixed(1), +z.toFixed(1), y === -Infinity ? '-inf' : +y.toFixed(2)]); }
        }
        out.push([name, n, bad, sample]);
      };
      if (e.pan1) { chk('pan1 rotunda', e.pan1.rooms[0], 0.05, { S: e.pan1.Sv, A: e.pan1.E.A }); chk('pan1 concourse', e.pan1.rooms[1], 0.05, { S: e.pan1.Sv, A: e.pan1.E.A }); }
      if (e.pan2) chk('pan2 vestibule', e.pan2.room, 0.05, { S: e.pan2.Sv, A: e.pan2.E.A });
      if (e.ligovsky) chk('ligovsky vestibule', e.ligovsky.room, 0.05, { S: e.ligovsky.Sv, A: e.ligovsky.E.A });
      return out;
    });
    for (const [name, n, bad, sample] of flo) ok(bad === 0 && n > 20, `${name}: floor under every point (${n} samples, ${bad} without a floor ${bad ? JSON.stringify(sample) : ''})`);
  }
  // ---------------------------------------------------------------- 3. ways in, 4. ways out
  if (SECTIONS.has('3')) {
    console.log('3. ways in');
    for (const n of EAST) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.entries[n]; if (!w) return null; const res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      if (!ok(!!r, `${n}: a way in exists`)) continue;
      console.log(`   way in ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${n}: walked in from the pavement, down the incline and onto the platform`);
    }
  }
  if (SECTIONS.has('4')) {
    console.log('4. ways out');
    for (const n of EAST) {
      const r = await ev((n) => {
        const ex = window.__ctx.metro.debug.exits[n]; if (!ex) return null; const res = window.__walk(ex.start, ex.points);
        return { ...res, outDepth: (res.x - ex.door[0]) * ex.outward[0] + (res.z - ex.door[1]) * ex.outward[1] };
      }, n);
      if (!ok(!!r, `${n}: a way out exists`)) continue;
      console.log(`   way out ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, ${r.outDepth.toFixed(1)} m outside the door line ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y) < 0.6 && r.outDepth > 2, `${n}: walked from the platform up the escalator and out onto the pavement`);
    }
  }
  // ---------------------------------------------------------------- 5. the PAN transfer on foot
  if (SECTIONS.has('5')) {
    console.log('5. the PAN-1 <-> PAN-2 transfer on foot');
    for (const n of ['pan1->pan2', 'pan2->pan1']) {
      const r = await ev((n) => { const w = window.__ctx.metro.debug.walks[n]; if (!w) return null; const res = window.__walk(w.start, w.points), rt = window.__ctx.metro.stations[w.end.station], [lx, lz] = rt.L(res.x, res.z); return { ...res, lx, lz, endY: w.end.y }; }, n);
      if (!ok(!!r, `${n}: the walk exists`)) continue;
      console.log(`   ${n}: reached ${r.reached}/${r.of}, ${r.t.toFixed(0)} s, y ${r.y.toFixed(1)}, hall x ${r.lx.toFixed(1)} z ${r.lz.toFixed(1)} ${r.trace ? JSON.stringify(r.trace) : ''}`);
      ok(r.reached === r.of && Math.abs(r.y - r.endY) < 0.4 && Math.abs(r.lx) < 9, `${n}: walked through the stair, the landing, the footway and the gallery onto the other platform`);
    }
  }
  // ---------------------------------------------------------------- 6. rides through the real tunnels
  if (SECTIONS.has('6')) {
    console.log('6. rides through the real tunnels');
    await rideFlow('mayakovskaya', 'S', 'pan1', 'Mayakovskaya -> Pl. Aleksandra Nevskogo 1');
    await rideFlow('pan1', 'N', 'mayakovskaya', 'Pl. Aleksandra Nevskogo 1 -> Mayakovskaya');
    await rideFlow('dostoevskaya', 'S', 'ligovsky', 'Dostoevskaya -> Ligovsky Prospekt');
    await rideFlow('ligovsky', 'S', 'pan2', 'Ligovsky Prospekt -> Pl. Aleksandra Nevskogo 2');
  }
  // ---------------------------------------------------------------- 7. the closed platform doors of PAN-1, views
  if (SECTIONS.has('7')) {
    console.log('7. PAN-1 platform doors, views');
    const gate = await ev(() => {
      const rt = window.__ctx.metro.stations.pan1, tk = rt.platform.trackByKey('S'), p = window.__ctx.playerObj; const [x, z] = rt.W(-6.3, rt.hall.openings.z0); window.__setCam(x, rt.hall.FY, z, 0, 0, true);
      window.__ff(150, 1 / 30, null, () => rt.platform.state(tk, window.__ctx.time).phase === 'away');
      const f = rt.frame, dx = -Math.cos(f.yaw), dz = Math.sin(f.yaw); p.yaw = Math.atan2(-dx, -dz); window.__ff(2.5, 1 / 60, () => ['KeyW']); const [lx] = rt.L(p.pos.x, p.pos.z);
      return { lx, phase: rt.platform.state(tk, window.__ctx.time).phase, y: p.pos.y };
    });
    ok(gate.lx > -7.3 && gate.y > -54.3, `Pl. Aleksandra Nevskogo 1: the platform doors are shut while no train stands (x ${gate.lx.toFixed(2)}, ${gate.phase})`);
    const views = await ev(() => {
      const e = window.__ctx.metro.east, out = [], add = (name, S, x, y, z, tx, tz, pitch = -2) => { const a = S.W(x, z), b = S.W(tx, tz); out.push({ name, x: a[0], y, z: a[1], pitch, yaw: Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI }); };
      if (e.pan1) { add('pan1_hall', e.pan1.S, 0, -52.3, -50, 0, 40); add('pan1_hall_south', e.pan1.S, 2.5, -52.3, 40, 0, 62); add('pan1_esc', e.pan1.Se, 2, e.pan1.esc.yAt(70) + 1.7, 70, 2, 0, 20); add('pan1_rotunda', e.pan1.Sv, 9, 1.7, 4, 0, 6.5); }
      if (e.pass) { const r = e.pass.relief; add('pan_relief', e.pan1.S, r.x + 5.5, -48.7, r.zc, r.x, r.zc, 4); }
      if (e.pan2) { add('pan2_hall', e.pan2.S, 0, -58.3, -60, 0, 40); add('pan2_platform', e.pan2.S, 7.3, -58.3, -40, 7.3, 20); add('pan2_vest', e.pan2.Sv, 6, 1.7, -6, -2, 10, 8); add('pan2_gallery', e.pan2.Sg, 1.1, e.pan2.Eg.yTop + 1.7, -3, 1.1, 10, -12); }
      if (e.ligovsky) { add('lig_hall', e.ligovsky.S, 2.5, -64.3, -60, 0, 60); add('lig_glass', e.ligovsky.S, 0, -64.3, 40, 0, 80, 6); add('lig_vest', e.ligovsky.Sv, 8, 1.7, -10, 0, 2); }
      return out;
    });
    for (const v of views) { await cam(v.x, v.y, v.z, v.yaw, v.pitch); const s = await shot('v_' + v.name); lumOk(s, `view ${v.name}`, 45, 215, v.name === 'pan_relief' ? 0.2 : 0.1); }          // the relief landing is dim (dark < 0.2)
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
