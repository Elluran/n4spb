// tools/bridge-wires-smoke.mjs - ONE real-browser look at the contact wires and poles of the two bascule bridges (docs/AREAS.md 13.10; GPU job: take /d/git2/gpulock first, remove it right after). The palace page on its BAKE
// (node tools/bake-scene.mjs --area palace) with ?troitsky=open: the Palace Bridge is photographed CLOSED (the wires of the span are back), then forced open (setMode('open'), the leaves need about 90 s): from the road
// approach behind a barrier (1.5 m over the deck, looking at the raised leaf), standing IN the gap looking along the Neva, and the same in the gap of the open Troitsky Bridge.
//   node tools/bridge-wires-smoke.mjs [--out shots/bridge-wires]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; }
const OUT = path.resolve(args.out || path.join(here, 'shots/bridge-wires')); fs.mkdirSync(OUT, { recursive: true });
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
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
    if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.abort('failed');
    req.continue();
  });
  page.on('error', (e) => console.log('PAGE CRASH', String(e.message).slice(0, 200))); page.on('close', () => console.log('PAGE CLOSED'));
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 220)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 220)); });
  await page.goto(`${ORIGIN}/index.html?q=performance&gates=0&troitsky=open&palacebridge=closed`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction("document.body.classList.contains('loaded') || !!document.querySelector('.fatal, #fatal')", { timeout: 360000, polling: 500 });
  await page.click('#go'); await page.waitForFunction("document.body.classList.contains('playing')", { timeout: 20000 });
  const info = await page.evaluate(() => { const P = window.__ctx.services.landmarksPalaceBridge, T = window.__ctx.services.landmarksTroitsky; return { palaceWires: P && P.wires && { lines: P.wires.lines, visible: P.wires.mesh.visible }, troitskyWires: T && T.wires && { lines: T.wires.lines }, palaceStats: P && P.stats && P.stats.spanWires }; });
  console.log('modules', JSON.stringify(info));
  const U = { palace: [-2339.5, -875.0, (323.5 - 90) * Math.PI / 180] };
  const pw = (u, v) => { const T = U.palace[2]; return [U.palace[0] + u * Math.cos(T) - v * Math.sin(T), U.palace[1] + u * Math.sin(T) + v * Math.cos(T)]; };
  const cam = async (x, y, z, yaw, pitch) => { await page.evaluate((a) => { window.__tod.set(2.0, true); window.__setCam(a[0], a[1], a[2], a[3], a[4]); }, [x, y, z, yaw, pitch]); await sleep(7000); };
  const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + '.png') }); const p = await page.evaluate(() => { const q = window.__ctx.playerObj; return { x: +q.pos.x.toFixed(1), z: +q.pos.z.toFixed(1), y: +q.pos.y.toFixed(2) }; }); console.log('shot', name, JSON.stringify(p)); };
  const YU = 36.5;       // yaw along +u of the Palace Bridge (camera yaw 0 = north = -z, positive turns toward -x)
  // ---- CLOSED: the wires are on the span
  let c = pw(60, 3); await cam(c[0], 4.2, c[1], YU, 3); await shot('palace-closed-approach');
  c = pw(100, 3); await cam(c[0], 5.2, c[1], YU, 2); await shot('palace-closed-span');
  c = pw(92, 0); await cam(c[0], 3.9, c[1], YU, 7); await shot('palace-closed-wires-up');
  c = pw(125, -45); await cam(c[0], 9, c[1], -53.5, 0); await shot('palace-closed-side');
  // ---- OPEN
  await page.evaluate(() => window.__ctx.services.landmarksPalaceBridge.setMode('open'));
  await page.waitForFunction('window.__ctx.services.landmarksPalaceBridge.theta > 1.2', { timeout: 400000, polling: 2000 }); await sleep(8000);
  const st = await page.evaluate(() => { const P = window.__ctx.services.landmarksPalaceBridge; return { theta: +(P.theta * 180 / Math.PI).toFixed(1), wiresVisible: P.wires && P.wires.mesh.visible }; });
  console.log('palace open', JSON.stringify(st));
  c = pw(72, 3); await cam(c[0], 3.6, c[1], YU, 8); await shot('palace-open-approach');
  c = pw(40, 3); await cam(c[0], 14, c[1], YU, -14); await shot('palace-open-approach-high');
  c = pw(125.2, 0); await cam(c[0], 8.5, c[1], -53.5, 0); await shot('palace-open-gap-neva-down');
  await cam(c[0], 8.5, c[1], 126.5, 0); await shot('palace-open-gap-neva-up');
  await cam(c[0], 9, c[1], YU, 2); await shot('palace-open-gap-along-bridge');
  const t = await page.evaluate(() => { const T = window.__ctx.services.landmarksTroitsky; const p = T.frame.toWorld(36.7, 0); return { x: p.x, z: p.z, theta: +(T.theta * 180 / Math.PI).toFixed(1) }; });
  console.log('troitsky', JSON.stringify(t));
  await cam(t.x, 10, t.z, -67, 0); await shot('troitsky-open-gap-neva');
  await cam(t.x, 10, t.z, 113, 0); await shot('troitsky-open-gap-neva-up');
} finally { await browser.close(); server.close(); }
if (errors.length) console.log('errors: ' + JSON.stringify(errors.slice(0, 6)));
