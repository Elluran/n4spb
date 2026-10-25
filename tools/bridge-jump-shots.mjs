// tools/bridge-jump-shots.mjs - ONE real-browser look at a car JUMPING the open Palace Bridge (docs/AREAS.md 13.11). GPU job: take /d/git2/gpulock first (mkdir), release it right after (rmdir).
//   node tools/bridge-jump-shots.mjs [--out shots/bridge-jump] [--deg 25] [--run success|fail|both] [--every 300]
// The page of the palace area loads from its BAKE (assets/baked/palace/: bake it first, inside the worktree you test in, and never commit the products). The clock of the bridge is frozen at the wished leaf elevation
// (--deg, both leaves), a car is put on the approach 70 m before leaf A and driven up the leaf with REAL key presses (W held); a screenshot is taken every --every ms from the start of the run until the car has landed
// (or fallen) and a few seconds after, with the car's state in the file name's log (shots/<out>/<run>.json). 'fail' puts the car on the leaf 3 m before the tip at 8 m/s with the throttle off.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; }
const OUT = path.resolve(args.out || path.join(here, 'shots/bridge-jump')); fs.mkdirSync(OUT, { recursive: true });
const DEG = Number(args.deg || 25), EVERY = Number(args.every || 300), RUN = String(args.run || 'both');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.gz': 'application/gzip' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(here, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const threeRoot = path.join(here, 'node_modules', 'three');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', '--window-size=1280,720'] });
const errors = [];
try {
  const ctxB = await browser.createBrowserContext(), page = await ctxB.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
    if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.abort('failed');
    req.continue();
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 220)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 220)); });
  await page.goto(`${ORIGIN}/index.html?q=performance&gates=0`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction("document.body.classList.contains('loaded') || !!document.querySelector('.fatal, #fatal')", { timeout: 360000, polling: 500 });
  console.log('loaded; module errors: ' + JSON.stringify(await page.evaluate(() => (window.__errors || []).map((e) => e.module + ': ' + e.message.slice(0, 160)))));
  await page.click('#go'); await page.waitForFunction("document.body.classList.contains('playing')", { timeout: 20000 });
  // freeze the bridge at the wished elevation (both leaves) and light the scene
  await page.evaluate((deg) => {
    const T = window.__ctx.services.landmarksPalaceBridge, th = deg * Math.PI / 180 - T.leaves[0].alpha0;
    Object.defineProperty(T.clock, 'theta', { get: () => th, configurable: true }); Object.defineProperty(T.clock, 'omega', { get: () => 0, configurable: true });
    T.leaf.set(th); window.__tod.set(2.0, true);
  }, DEG);
  const runs = RUN === 'both' ? ['success', 'fail'] : [RUN];
  for (const run of runs) {
    // put the car: success = 70 m before the hinge of leaf A on the approach, standing; fail = on the leaf 3 m before the tip at 8 m/s
    const info = await page.evaluate((run, deg) => {
      const T = window.__ctx.services.landmarksPalaceBridge, lf = T.leaves[0], F = T.frame, th = deg * Math.PI / 180 - lf.alpha0, D = window.__drive, c = F.FR;
      const yaw = Math.atan2(c.c, c.s);
      const u = run === 'success' ? lf.uHinge - 70 : lf.uHinge + (lf.S - 3) * Math.cos(lf.phi(th)), w = F.toWorld(u, -5.7, {});
      if (D.active) D.exit(true);
      D.enter(); const ok = D.place(w.x, w.z, yaw * 180 / Math.PI - 180); if (!ok) return { failed: true };
      const car = D.car; const y = T.deckY(w.x, w.z); if (y !== null && y !== undefined) car.y = y + 0.03;
      car.vx = Math.sin(yaw) * (run === 'success' ? 0 : 8); car.vz = Math.cos(yaw) * (run === 'success' ? 0 : 8);
      return { x: w.x, z: w.z, yaw, u };
    }, run, DEG);
    console.log(run + ': car placed ' + JSON.stringify(info));
    await sleep(run === 'success' ? 25000 : 3000);                 // the regions around the bridge stream in
    if (run === 'success') await page.keyboard.down('KeyW');
    const log = []; let landed = 0, flew = false, t0 = Date.now(), i = 0;
    while (Date.now() - t0 < 30000) {
      const st = await page.evaluate(() => { const c = window.__drive.car, T = window.__ctx.services.landmarksPalaceBridge, q = T.frame.toUV(c.x, c.z, {}); return { u: +q.u.toFixed(1), y: +c.y.toFixed(2), fall: c.fall, vF: +c.vF.toFixed(1), pitch: +(c.pitch * 57.3).toFixed(1), airT: +c.airT.toFixed(2), dmg: +c.damage }; });
      const file = path.join(OUT, `${run}-${String(i).padStart(2, '0')}.png`);
      await page.screenshot({ path: file }); log.push({ i, file: path.basename(file), ...st }); i++;
      if (st.fall) flew = true;
      if (flew && !st.fall) { landed++; if (landed > 8) break; }
      await sleep(Math.max(0, EVERY - 120));
    }
    await page.keyboard.up('KeyW');
    fs.writeFileSync(path.join(OUT, `${run}.json`), JSON.stringify(log, null, 1));
    console.log(run + ': ' + log.length + ' shots, flew ' + flew + ', last ' + JSON.stringify(log[log.length - 1]));
  }
  if (errors.length) console.log('errors: ' + JSON.stringify(errors.slice(0, 6)));
} finally { await browser.close(); server.close(); }
