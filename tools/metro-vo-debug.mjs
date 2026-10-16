// Debug a walking route of the island stations in the real physics (module metro alone): node tools/metro-vo-debug.mjs --route exit|entry --station sportivnaya2 --from 28 [--frame wells.w6.Se] [--stop 40]
// Walks the route (like tools/metro-test.mjs) and, from waypoint --from on, prints the position of the player in the local frame of the station object --frame every ~0.5 s, plus the colliders
// within 1.5 m (type, half-size excess in x / z, y range). Use it when a route stops short of a waypoint.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 }, protocolTimeout: 300000 });
try {
  const page = await browser.newPage(); const threeRoot = path.join(root, 'node_modules', 'three');
  await page.setRequestInterception(true);
  page.on('request', (req) => { const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url()); if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); } req.continue(); });
  await page.goto(`http://127.0.0.1:${port}/index.html?${new URLSearchParams({ q: 'low', stats: '1', only: 'metro' })}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  await page.click('#go'); await new Promise((r) => setTimeout(r, 600));
  const r = await page.evaluate((a) => {
    const C = window.__ctx, P = C.playerObj, ph = C.physics, m = C.metro, kind = a.route === 'entry' ? m.debug.entries : m.debug.exits, ex = kind[a.station], from = +(a.from || 0), stop = a.stop ? +a.stop : 1e9;
    const fr = a.frame ? a.frame.split('.').reduce((o, p) => (o ? o[p] : o), m.petro[a.sk || ({ sportivnaya2: 'sport2', vasileostrovskaya: 'vo', gorny: 'gorny' }[a.station])]) : null;
    const ff = (sec, dt = 1 / 60, keys = null) => { for (let t = 0; t < sec; t += dt) { P.keys = new Set(keys ? keys(t) : []); window.__advance(dt); C.physics.refreshDynamic(); P.update(dt); window.__zones.update(dt); C.interact.update(); } P.keys = new Set(); };
    window.__setCam(ex.start[0], null, ex.start[1], 0, 0); P.pos.y = ex.start[2]; P.fly = false; P.vel.set(0, 0, 0); window.__setCam(ex.start[0], ex.start[2], ex.start[1], 0, 0, true);
    const log = []; let reached = 0;
    for (const [i, w] of ex.points.entries()) {
      if (i > stop) break; let tt = 0, best = 1e9, last = -1;
      while (tt < 25) {
        const dx = w[0] - P.pos.x, dz = w[1] - P.pos.z, d = Math.hypot(dx, dz); best = Math.min(best, d); if (d < (w[2] || 0.9)) { reached = i + 1; break; }
        P.yaw = Math.atan2(-dx, -dz); const step = d < 3 ? 0.03 : 0.1; ff(step, 1 / 60, () => (d < 5 ? ['KeyW'] : ['KeyW', 'ShiftLeft'])); tt += step;
        if (i >= from && Math.floor(tt * 2) !== last) { last = Math.floor(tt * 2); const [lx, lz] = fr ? fr.L(P.pos.x, P.pos.z) : [0, 0]; log.push({ i, t: +tt.toFixed(1), x: +P.pos.x.toFixed(2), y: +P.pos.y.toFixed(2), z: +P.pos.z.toFixed(2), lx: +lx.toFixed(2), lz: +lz.toFixed(2), d: +d.toFixed(2), g: P.onGround }); }
      }
      if (reached !== i + 1) {
        const near = [...ph._query(P.pos.x, P.pos.z, 1.5)].filter((it) => it.type !== 'hole').map((it) => { const [lx, lz] = ph._local(it, P.pos.x, P.pos.z); return [it.type, +(Math.abs(lx) - it.hw).toFixed(2), +(Math.abs(lz) - it.hd).toFixed(2), +it.y0.toFixed(1), it.y1 !== undefined ? +it.y1.toFixed(1) : (it.top !== undefined ? +it.top.toFixed(1) : 'r'), +it.cx.toFixed(1), +it.cz.toFixed(1)]; }).filter((q) => q[1] < 1.2 && q[2] < 1.2);
        return { failedAt: i, target: w, best, pos: [P.pos.x, P.pos.y, P.pos.z], near, log: log.slice(-14) };
      }
    }
    return { ok: true, reached, of: ex.points.length };
  }, { route: args.route || 'exit', station: args.station, from: args.from, frame: args.frame, stop: args.stop, sk: args.sk });
  console.log(JSON.stringify(r, null, 1));
} catch (e) { console.log('crashed', e.stack || e.message); }
await browser.close(); server.close();
