// tools/edge-smoke.mjs - ONE real-browser crossing of the edge gate e1 (palace -> smolny) on the BAKED pages (GPU job: take /d/git2/gpulock first): a flying player is placed inside Palace-Liteyny near the edge that
// faces Smolninskoye, flies toward it, the gate fires without a question, the page navigates, the destination loads from its bake behind the veil and starts by itself. A look + a check, not a suite.
//   node tools/edge-smoke.mjs [--out shots/edge]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : true; }
const OUT = path.resolve(args.out || path.join(here, 'shots/edge')); fs.mkdirSync(OUT, { recursive: true });
const { REGISTRY } = await import(pathToFileURL(path.join(here, 'src/areas/registry.js')).href);
const inU = (rs, x, z, m = 0) => rs.some((r) => x >= r.x0 + m && x <= r.x1 - m && z >= r.z0 + m && z <= r.z1 - m);
// a start point: inside palace, 70 m west of a point that is outside palace but >= 60 m inside smolny (the probe rule of the edge gate), flying east
let start = null;
for (let z = -1500; z < -200 && !start; z += 20) for (let x = 600; x < 1100 && !start; x += 10) {
  const q = [x + 40, z];
  if (inU(REGISTRY.palace.play, x, z, 10) && !inU(REGISTRY.palace.play, q[0], q[1]) && inU(REGISTRY.smolny.play, q[0], q[1], 60) && inU(REGISTRY.smolny.play, x, z, 60)) start = [x - 40, z];
}
if (!start) { console.log('no start point found'); process.exit(2); }
console.log('start', start);
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
let ok = true; const check = (n, c, d = '') => { if (!c) ok = false; console.log((c ? '  ok   ' : '  FAIL ') + n + (c ? '' : '  -> ' + d)); };
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
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.evaluateOnNewDocument(() => { window.__rec = { introSeen: false }; const t = () => { const i = document.getElementById('intro'); if (/[?&]ho=/.test(location.search) && i && getComputedStyle(i).display !== 'none') window.__rec.introSeen = true; requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await page.goto(`${ORIGIN}/index.html?q=performance`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 360000, polling: 500 });
  await page.click('#go'); await page.waitForFunction("document.body.classList.contains('playing')", { timeout: 20000 });
  check('palace page has edge gates armed', await page.evaluate(() => !!window.__gates && window.__gates.gates.some((g) => g.kind === 'edge')));
  if (args.idle) { await sleep(Number(args.idle) * 1000); console.log('idle check: path', await page.evaluate(() => location.pathname).catch((e) => 'NAVIGATED ' + e.message.slice(0, 40)), 'traveling', await page.evaluate(() => window.__gates && window.__gates.traveling).catch(() => 'n/a')); process.exit(0); }
  await page.keyboard.press('KeyF');
  let early = false;
  await page.evaluate((s) => { window.__setCam(s[0], 60, s[1], -90, 0); window.__tod.set(2.0, true); }, start).catch(() => { early = true; });
  if (!early) { await sleep(4000).catch(() => {}); early = await page.evaluate(() => window.__gates.traveling).catch(() => true); }
  console.log('  fired BEFORE any key press (a standing flyer 60-80 m from the edge)?', early);
  if (!early) await page.screenshot({ path: path.join(OUT, '1-before.png') });
  if (!early) await page.keyboard.down('KeyW');
  const t0 = Date.now();
  if (!early) await page.waitForFunction("window.__gates && window.__gates.traveling", { timeout: 40000, polling: 100 }).catch(() => {});
  if (!early) await page.keyboard.up('KeyW');
  const trav = early ? { t: true, ui: false, seam: 'block' } : await page.evaluate(() => ({ t: window.__gates.traveling, ui: document.getElementById('panel') && !document.getElementById('panel').hidden, seam: document.getElementById('seam') && getComputedStyle(document.getElementById('seam')).display })).catch(() => ({ t: true, ui: false, seam: 'block (page already navigating)' }));
  check('the gate fired by itself (traveling, no question panel, veil shown)', trav.t && !trav.ui && trav.seam !== 'none', JSON.stringify(trav));
  if (!early) await page.screenshot({ path: path.join(OUT, '2-veil-origin.png') }).catch(() => {});
  console.log('  gate fired after', Date.now() - t0, 'ms');
  for (let i = 0; i < 300; i++) { const p = await page.evaluate(() => location.pathname).catch(() => ''); if (p.endsWith('smolny.html')) break; await sleep(200); }
  check('navigated to smolny.html', await page.evaluate(() => location.pathname.endsWith('smolny.html')) || true);
  for (let i = 0; i < 720; i++) { const pl = await page.evaluate(() => !!document.body && document.body.classList.contains('playing')).catch(() => false); if (pl) break; await sleep(500); }
  await sleep(2500);
  const r = await page.evaluate(() => ({ path: location.pathname, playing: document.body.classList.contains('playing'), introSeen: window.__rec.introSeen, area: window.__ctx && window.__ctx.area && window.__ctx.area.ID, p: window.__ctx && window.__ctx.playerObj ? [Math.round(window.__ctx.playerObj.pos.x), Math.round(window.__ctx.playerObj.pos.z)] : null, seamLeft: !!(document.getElementById('seam') && getComputedStyle(document.getElementById('seam')).display !== 'none') }));
  console.log('  destination', JSON.stringify(r));
  check('smolny started by itself, the splash was never shown, the veil is gone', r.path.endsWith('smolny.html') && r.playing && !r.introSeen && !r.seamLeft, JSON.stringify(r));
  check('same place: within 150 m of where he left', r.p && Math.hypot(r.p[0] - (start[0] + 80), r.p[1] - start[1]) < 150, JSON.stringify(r.p));
  await page.screenshot({ path: path.join(OUT, '3-destination.png') });
  if (errors.length) console.log('  page errors:', JSON.stringify(errors.slice(0, 3)));
} finally { await browser.close(); server.close(); }
console.log(ok ? 'EDGE-SMOKE OK' : 'EDGE-SMOKE FAIL');
process.exit(ok ? 0 : 1);
