// ONE browser smoke of the seamless hand-off (docs/AREAS.md section 13): the real page in headless Edge, the dev gate g0 (?devgates=1: the strip loops back to the same page), a real walk through the gate,
// the real location.replace. Checks: no dialog / card, the veil with the frozen frame on the origin, the veil at once on the destination (no splash flash), the bar rises, the veil goes away, the game runs from the
// same pose without a click. Fast harness (a drive-only build, baked=0, the preflight accepts without a bake). GPU job: take /d/git2/gpulock first.
//   node tools/seam-smoke.mjs [--root <repo dir>] [--out <dir>]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const root = path.resolve(args.root || here), OUT = path.resolve(args.out || path.join(root, 'shots/seam'));
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const FAST = 'baked=0&only=drive&noroof=1&gate=0&guard=0&devgates=1&q=performance';
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
const threeRoot = path.join(root, 'node_modules', 'three');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, passes = 0;
const check = (name, ok, detail = '') => { if (ok) { passes++; console.log('  ok   ' + name); } else { fails++; console.log('  FAIL ' + name + (detail !== '' ? '  -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } };

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', '--window-size=1280,720'] });
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
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  // a recorder that runs from the first moment of EVERY document: per frame the display of #seam and #intro (the destination must never show the splash), the bar's percentage
  await page.evaluateOnNewDocument(() => {
    window.__rec = { hand: /[?&]ho=/.test(location.search), frames: [], pct: [] };
    const tick = () => {
      const s = document.getElementById('seam'), i = document.getElementById('intro');
      if (s || i) window.__rec.frames.push({ seam: s ? getComputedStyle(s).display : 'none', intro: i ? getComputedStyle(i).display : 'none', t: Math.round(performance.now()) });
      const p = s && s.querySelector('.seam-pct'); if (p && window.__rec.pct[window.__rec.pct.length - 1] !== p.textContent) window.__rec.pct.push(p.textContent);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(`${ORIGIN}/index.html?${FAST}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 120000, polling: 250 });
  check('a normal visit (no ho) keeps the splash with its button and shows no veil', await page.evaluate(() => getComputedStyle(document.getElementById('intro')).display !== 'none' && getComputedStyle(document.getElementById('seam')).display === 'none' && !document.documentElement.classList.contains('seam-in')));
  await page.click('#go'); await page.waitForFunction("document.body.classList.contains('playing')", { timeout: 10000 });
  // stand 25 m east of g0 (the border x = 470, z 100..240; z 140 is a free row of the layout, not inside a building), facing west (yaw 90), a known time of day, then walk at it
  await page.evaluate(() => { window.__setCam(495, null, 140, 90, 0); window.__tod.set(2.0, true); window.__gates.navigate = (u) => { window.__pendingUrl = u; }; });
  await sleep(300);
  const before = await page.evaluate(() => ({ tod: window.__tod.k, yaw: window.__ctx.playerObj.yaw }));
  await page.keyboard.down('KeyW');
  await page.waitForFunction('!!window.__pendingUrl', { timeout: 30000, polling: 50 }).catch(() => {});
  await page.keyboard.up('KeyW');
  const o = await page.evaluate(() => {
    const seam = document.getElementById('seam'), vis = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
    let entry = null; try { entry = JSON.parse(sessionStorage.getItem('n4spb.seam')); } catch (e) { /* none */ }
    const p = window.__ctx.playerObj;
    return { url: window.__pendingUrl || null, traveling: window.__gates.traveling, pending: window.__ctx.travelPending, lock: p.inputLock, x: p.pos.x, z: p.pos.z,
      seamOn: seam.classList.contains('on'), seamBlur: seam.classList.contains('blur'), seamDisplay: getComputedStyle(seam).display,
      snap: seam.querySelector('.seam-snap').style.backgroundImage.slice(0, 22), entry: entry && { len: entry.img.length, from: entry.from, to: entry.to, w: entry.w, h: entry.h, age: Date.now() - entry.t },
      dialog: vis(document.querySelector('#panel')) || !!document.querySelector('.confirm'), chip: document.getElementById('gatechip').classList.contains('show'), travelCard: !!document.getElementById('travel') };
  });
  await sleep(600);      // the blur / darkening transition (350 ms) is over
  await page.screenshot({ path: path.join(OUT, 'seam-origin.png') });
  const blur = await page.evaluate(() => ({ filter: getComputedStyle(document.querySelector('#seam .seam-snap')).filter, pct: document.querySelector('#seam .seam-pct').textContent, text: document.getElementById('seam').innerText.replace(/\s+/g, ' ').trim() }));
  console.log('origin:', JSON.stringify({ ...o, blur }));
  check('the gate triggered by walking: a navigation URL with ho, NO dialog, no chip, no travel card', !!o.url && /[?&]ho=/.test(o.url) && !o.dialog && !o.chip && !o.travelCard, o);
  check('the origin froze: traveling, travelPending, input locked, the player stopped near the border', o.traveling && o.pending && o.lock >= 1 && o.x > 440 && o.x < 495, o);
  check('the veil is up with the snapshot (a JPEG data: URL stored under n4spb.seam, from strip to strip, fresh)', o.seamOn && o.seamBlur && o.seamDisplay === 'block' && /data:image\/jpeg/.test(o.snap) && o.entry && o.entry.len > 3000 && o.entry.to === 'strip' && o.entry.age < 20000, o);
  check('the veil is blurred ~10 px and shows only the percentage (no text card)', /blur\(10px\)/.test(blur.filter) && /^\d+%$/.test(blur.text), blur);
  const pose = { x: o.x, z: o.z, ...before };
  // the real navigation (the page replaces itself with the same page, ho in the URL)
  await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }), page.evaluate((u) => { location.replace(u); }, o.url).catch(() => {})]);
  const early = await page.evaluate(() => ({ seamIn: document.documentElement.classList.contains('seam-in'), seamDisplay: getComputedStyle(document.getElementById('seam')).display, introDisplay: getComputedStyle(document.getElementById('intro')).display, snap: document.querySelector('#seam .seam-snap').style.backgroundImage.slice(0, 22), pct: document.querySelector('#seam .seam-pct').textContent }));
  console.log('destination at DOMContentLoaded:', JSON.stringify(early));
  check('the destination paints the same veil at once (snapshot, blur) and hides the splash', early.seamIn && early.seamDisplay === 'block' && early.introDisplay === 'none' && /data:image\/jpeg/.test(early.snap), early);
  // sample the bar while the scene builds; one screenshot mid-load
  const pcts = []; let shot = false; const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const s = await page.evaluate(() => { const e = document.getElementById('seam'); return e ? { pct: e.querySelector('.seam-pct').textContent, out: e.classList.contains('out') } : null; }).catch(() => undefined);
    if (s === undefined) { await sleep(100); continue; }
    if (s === null) break;
    if (!pcts.length || pcts[pcts.length - 1] !== s.pct) pcts.push(s.pct);
    if (!shot && parseInt(s.pct) >= 25 && parseInt(s.pct) < 95) { shot = true; await page.screenshot({ path: path.join(OUT, 'seam-destination-loading.png') }); }
    await sleep(120);
  }
  console.log('bar on the destination:', pcts.join(' '));
  const nums = pcts.map((p) => parseInt(p)).filter((n) => Number.isFinite(n));
  check('the progress bar value rises on the new page (0 -> ~100, never backwards)', nums.length >= 3 && nums.every((n, i) => i === 0 || n >= nums[i - 1]) && nums[nums.length - 1] >= 90, nums);
  check('a screenshot of the veil mid-load was taken', shot);
  await page.waitForFunction("!document.getElementById('seam')", { timeout: 20000, polling: 100 }).catch(() => {});
  const d = await page.evaluate(() => {
    const p = window.__ctx.playerObj, rec = window.__rec;
    return { seamGone: !document.getElementById('seam'), playing: document.body.classList.contains('playing'), introDisplay: getComputedStyle(document.getElementById('intro')).display, x: p.pos.x, z: p.pos.z, yaw: p.yaw, tod: window.__tod.k, traveling: window.__gates ? window.__gates.traveling : null,
      key: sessionStorage.getItem('n4spb.seam'), fatal: !!document.getElementById('fatal'), introFrames: rec.frames.filter((f) => f.intro !== 'none').length, hand: rec.hand, frames: rec.frames.length, url: location.search };
  });
  await page.screenshot({ path: path.join(OUT, 'seam-destination-running.png') });
  console.log('destination after the veil:', JSON.stringify(d));
  check('the veil is gone, the stored picture dropped, the game is running without a click (playing), no fatal card', d.seamGone && d.playing && d.key === null && !d.fatal && d.traveling === false, d);
  check('the splash card was never visible on the destination (no flash): 0 frames with #intro displayed, the recorder saw the page from its first frame', d.hand && d.frames > 5 && d.introFrames === 0, { hand: d.hand, frames: d.frames, introFrames: d.introFrames });
  check('the player continues from the same pose: x / z within 2 m of where he froze, the yaw and the time of day kept', Math.hypot(d.x - pose.x, d.z - pose.z) < 2 && Math.abs(d.yaw - pose.yaw) < 0.05 && Math.abs(d.tod - pose.tod) < 0.01, { d, pose });
  await page.keyboard.down('KeyW'); await sleep(1200); await page.keyboard.up('KeyW');
  const moved = await page.evaluate(() => ({ x: window.__ctx.playerObj.pos.x, z: window.__ctx.playerObj.pos.z }));
  check('keyboard walking works at once (no click, no pointer lock)', Math.hypot(moved.x - d.x, moved.z - d.z) > 0.8, { moved, d });
  check('no page errors', errors.length === 0, errors);
} finally { await browser.close(); server.close(); }
console.log(`seam-smoke: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
