// Browser flows of the area gates (docs/AREAS.md, milestones M2/M3): the REAL page in headless Edge, real key presses, the dev gate g0 (?devgates=1: a gate across the Nevsky approach to
// Vosstaniya Square that leads back to the same page) or the real strip>north gates. Fast harness (a drive-only build, ~6 s per page; baked=0, so the preflight accepts without a bake).
//   node tools/areas-flow-test.mjs [--root <repo dir>] [--only prompt,decline,accept,arrival,car,fly,fail,arming,pingpong] [--out shots/areas]
// Not asserted here (headless cannot): pointer lock, audio unlock, the user gesture. GPU job: run it alone.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const SECTIONS = ['prompt', 'arming', 'decline', 'accept', 'arrival', 'required', 'car', 'fly', 'fail', 'pingpong'];
const root = path.resolve(args.root || here), ONLY = args.only ? new Set(args.only.split(',')) : null, OUT = path.resolve(root, args.out || 'shots/areas');
if (ONLY) for (const k of ONLY) if (!SECTIONS.includes(k)) { console.error(`unknown section "${k}" (known: ${SECTIONS.join(', ')})`); process.exit(2); }
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };
let blockManifest = false;      // the 'required' section: the bake manifest answers 404
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  if (blockManifest && p.endsWith('/manifest.json')) { res.writeHead(404); return res.end(); }
  const f = path.join(root, p);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${server.address().port}`;
const FAST = 'baked=0&only=drive&noroof=1&gate=0&guard=0&devgates=1&q=performance';
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', '--window-size=1280,720'] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0, passes = 0;
const check = (name, ok, detail = '') => { if (ok) { passes++; console.log('  ok   ' + name); } else { fails++; console.log('  FAIL ' + name + (detail !== '' ? '  -> ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : '')); } };
const threeRoot = path.join(here, 'node_modules', 'three');

/** a fresh incognito page on the page URL; `start`: press Start (the button) and wait until the first frames ran */
async function open(url, { start = true } = {}) {
  const ctxB = await browser.createBrowserContext(); const page = await ctxB.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
    if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
    if (/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.abort('failed');
    req.continue();
  });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await page.goto(url.startsWith('http') ? url : `${ORIGIN}/${url}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded') || (document.getElementById('fatal') && document.getElementById('fatal').textContent)", { timeout: 120000, polling: 250 });
  if (start) { await page.click('#go'); await page.waitForFunction("document.body.classList.contains('playing')", { timeout: 10000 }); }
  page.errors = errors; return page;
}
const S = (page) => page.evaluate(() => {
  const d = window.__ctx.drive, car = d && d.active ? d.car : null, p = window.__ctx.playerObj;
  return { open: !!document.querySelector('#panel:not([hidden]) .confirm'), chip: document.getElementById('gatechip').classList.contains('show'), chipText: document.getElementById('gatechip').textContent,
    x: car ? car.x : p.pos.x, z: car ? car.z : p.pos.z, speed: car ? car.speed : 0, vF: car ? car.vF : 0, driving: !!car, fly: p.fly, travelling: window.__gates ? window.__gates.traveling : null,
    title: (document.querySelector('#panel .panel-title') || {}).textContent || '', yesDisabled: (document.querySelector('.confirm-yes') || {}).disabled };
});
const placeWalker = (page, x, z, yaw = 77.07) => page.evaluate((x, z, yaw) => window.__setCam(x, null, z, yaw, 0), x, z, yaw);
const hookNav = (page) => page.evaluate(() => { window.__navUrls = []; window.__gates.navigate = (u) => { window.__navUrls.push(u); }; });
const fastCooldown = (page) => page.evaluate(() => { window.__gates.machine.config.cooldownS = 2; window.__gates.machine.config.exitMargin = 20; });
async function walkUntilOpen(page, ms = 25000) { await page.keyboard.down('KeyW'); try { await page.waitForFunction("!!document.querySelector('#panel:not([hidden]) .confirm')", { timeout: ms, polling: 100 }); } catch (e) { /* reported by the caller */ } await page.keyboard.up('KeyW'); }
const want = (k) => !ONLY || ONLY.has(k);
const ARRIVE_URL = (cam, ho) => `index.html?${FAST}&cam=${cam}&ho=${ho}`;

try {
  if (want('prompt')) {
    console.log('prompt (walking):');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); });
    check('the gate machine exists and the dev gate is registered', await page.evaluate(() => !!window.__gates && window.__gates.gates.some((g) => g.id === 'g0')));
    await placeWalker(page, 575, 174.5);                          // 105 m east of the border (x = 470), on the Nevsky approach, facing west
    await sleep(600); let s = await S(page);
    check('far from the border: no chip, no question', !s.chip && !s.open, s);
    await placeWalker(page, 545, 167.7); await sleep(600); s = await S(page);
    check('75 m from the border: the passive chip shows (bilingual text, N)', s.chip && /впереди/.test(s.chipText) && /ahead/.test(s.chipText) && / N$/.test(s.chipText), s);
    check('... and still no question', !s.open, s);
    const x0 = s.x; await walkUntilOpen(page); s = await S(page);
    check('walking toward the border opens the question near 30 m', s.open && s.x - 470 <= 31 && s.x - 470 >= 24, { x: s.x, d: s.x - 470 });
    check('the title names the area, the Load button is not armed yet', /Новая область/.test(s.title) && s.yesDisabled === true, s);
    const xa = s.x; await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW'); s = await S(page);
    check('while the question is open the walker does not move (input is locked)', Math.abs(s.x - xa) < 0.6, { before: xa, after: s.x });
    await page.screenshot({ path: path.join(OUT, 'prompt-walk.png') });
    check('no page errors', page.errors.length === 0, page.errors);
    await page.close();
  }
  if (want('arming')) {
    console.log('arming of the buttons:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); }); await hookNav(page);
    await placeWalker(page, 545, 167.7); await sleep(400); await page.evaluate(() => window.__ctx.playerObj.keys.add('Space'));      // a key that was down before the question opened
    await walkUntilOpen(page);
    await page.keyboard.down('Space'); await page.keyboard.up('Space'); await sleep(100);
    check('a Space that was held before the question and released during it is not left "down" in the game', await page.evaluate(() => !window.__ctx.playerObj.keys.has('Space')));
    await page.keyboard.press('Enter'); await sleep(150); let s = await S(page);
    check('Enter at once does nothing (not armed)', s.open && (await page.evaluate(() => window.__navUrls.length)) === 0, s);
    await page.keyboard.press('Space'); await sleep(100); s = await S(page);
    check('Space is swallowed while the question is open', s.open, s);
    await page.evaluate(() => document.querySelector('.confirm-yes').click()); await sleep(100);
    check('a click on a disabled Load button does nothing', (await page.evaluate(() => window.__navUrls.length)) === 0);
    await page.evaluate(() => document.getElementById('panel').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))); await sleep(100); s = await S(page);
    check('a click on the dark backdrop does not close the question', s.open, s);
    await sleep(800); s = await S(page);
    check('after 700 ms the Load button is armed and focused', s.yesDisabled === false && (await page.evaluate(() => document.activeElement && document.activeElement.className)) === 'confirm-yes', s);
    await page.keyboard.press('Space'); await sleep(200); s = await S(page);
    check('Space on the ARMED, focused Load button does not press it (no navigation, still open)', s.open && (await page.evaluate(() => window.__navUrls.length)) === 0, s);
    await page.keyboard.press('Escape'); await sleep(200); s = await S(page);
    check('Esc declines', !s.open);
    check('the shared panel button is enabled again for the next ordinary panel', await page.evaluate(() => { window.__ctx.ui.panel('x', { title: 't' }); const ok = !document.querySelector('.panel-x').disabled; window.__ctx.ui.close(); return ok; }));
    await page.close();
  }
  if (want('decline')) {
    console.log('decline and cooldown:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); }); await fastCooldown(page); await hookNav(page);
    await placeWalker(page, 545, 167.7); await sleep(400); await walkUntilOpen(page);
    await sleep(900); await page.keyboard.press('Escape'); await sleep(200);
    let s = await S(page); check('declined: closed, nothing navigated', !s.open && (await page.evaluate(() => window.__navUrls.length)) === 0, s);
    await page.keyboard.down('KeyW'); await sleep(2500); await page.keyboard.up('KeyW'); s = await S(page);
    check('walking on inside the zone after the 2 s cooldown: not asked again (the zone was not left)', !s.open, s);
    await placeWalker(page, 575, 174.5); await sleep(800);                       // 105 m: left the zone by far
    await placeWalker(page, 545, 167.7); await sleep(2500); await walkUntilOpen(page);
    s = await S(page); check('after leaving the zone and the cooldown: asked again', s.open, s);
    await page.keyboard.press('Escape'); await sleep(200);
    await page.keyboard.press('KeyN'); await sleep(300); s = await S(page);
    check('N reopens the question whenever the chip shows', s.open, s);
    await page.keyboard.press('Escape'); await page.close();
  }
  if (want('accept')) {
    console.log('accept -> the URL of the arrival:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); window.__tod.set(1.5, true); }); await hookNav(page);
    await placeWalker(page, 545, 167.7); await sleep(400); await walkUntilOpen(page); await sleep(900);
    await page.keyboard.press('Enter'); await sleep(600);
    const r = await page.evaluate(() => ({ urls: window.__navUrls, traveling: window.__gates.traveling, veil: !document.getElementById('travel').hidden, title: document.querySelector('#travel .t-title').textContent, pending: window.__ctx.travelPending }));
    check('Enter after arming navigates exactly once', r.urls.length === 1, r);
    check('the travel veil shows the area, the sim is frozen', r.veil && r.traveling && r.pending && /Невск/.test(r.title), r);
    const u = new URL(r.urls[0], ORIGIN), q = u.searchParams;
    check('the URL is the page with cam, tod and the ho object, and keeps the page flags', u.pathname.endsWith('/index.html') && q.has('cam') && q.get('tod') === '1.5' && q.has('ho') && q.get('q') === 'performance' && q.get('baked') === '0', r.urls[0]);
    const cam = q.get('cam').split(',').map(Number);
    check('the camera pose is the walker\'s pose (4 numbers, west-facing)', cam.length === 4 && Math.abs(cam[0] - 500) < 8 && Math.abs(cam[2] - 77.07) < 5, cam);
    const ho = JSON.parse(Buffer.from(q.get('ho').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    check('ho: v1, from/to the strip, via gate g0, no car, one hop', ho.v === 1 && ho.from === 'strip' && ho.to === 'strip' && ho.gate === 'g0' && ho.via === 'gate' && ho.car === null && ho.n === 1, ho);
    await page.evaluate(() => window.__gates.go(window.__gates.gates.find((g) => g.id === 'g0'))); await sleep(200);
    check('a second accept while travelling does nothing', (await page.evaluate(() => window.__navUrls.length)) === 1);
    await page.screenshot({ path: path.join(OUT, 'travel-veil.png') });
    // ---- the arrival page
    console.log('arrival:');
    const arr = await open(r.urls[0].startsWith('http') ? r.urls[0] : `${ORIGIN}/${r.urls[0]}`, { start: false });
    const a = await arr.evaluate(() => ({ h: window.__ctx.handoff && { how: window.__ctx.handoff.how, mode: window.__ctx.handoff.mode, pose: window.__ctx.handoff.pose }, go: document.getElementById('go').textContent, tod: window.__tod.k, x: window.__ctx.playerObj.pos.x, z: window.__ctx.playerObj.pos.z, errs: (window.__errors || []).length, area: window.__ctx.area.ID }));
    check('the arrival page knows it was reached by a hand-off, on the same spot', a.h && a.h.how === 'direct' && Math.abs(a.x - cam[0]) < 1 && Math.abs(a.z - cam[1]) < 1, a);
    check('the button says Continue; the time of day came along', /Продолжить/.test(a.go) && Math.abs(a.tod - 1.5) < 0.01, a);
    await arr.click('#go'); await sleep(800);
    const b = await arr.evaluate(() => ({ search: location.search, noHo: !location.search.includes('ho='), noCam: !location.search.includes('cam='), q: new URLSearchParams(location.search).get('q') }));
    check('after Start the URL is cleaned (no ho, cam, tod) but keeps the page flags', b.noHo && b.noCam && b.q === 'performance', b);
    await sleep(8000);
    const quiet = await S(arr);
    check('arrive and wait 8 s: no question (the arrival is not in a ping-pong)', !quiet.open, quiet);
    check('no page errors on either page', page.errors.length === 0 && arr.errors.length === 0, { a: page.errors, b: arr.errors });
    await arr.close(); await page.close();
  }
  if (want('arrival')) {
    console.log('arrival with a bad hand-off:');
    const bad = await open(`index.html?${FAST}&cam=500,167,77,0&ho=${'x'.repeat(40)}`, { start: false });
    const r1 = await bad.evaluate(() => ({ handoff: window.__ctx.handoff || null, x: window.__ctx.playerObj.pos.x, go: document.getElementById('go').textContent }));
    check('a corrupt ho is ignored: the page boots from ?cam alone, the button stays "В Питер"', r1.handoff === null && Math.abs(r1.x - 500) < 1 && !/Продолжить/.test(r1.go), r1);
    await bad.close();
    const inside = await open(ARRIVE_URL('536,155,77,0', Buffer.from(JSON.stringify({ v: 1, from: 'strip', to: 'strip', via: 'gate', gate: 'g0', car: null, mute: true, noui: false, ret: { x: 536, z: 155, yaw: 77, pitch: 0 }, n: 3 })).toString('base64url')), { start: false });
    const r2 = await inside.evaluate(() => ({ how: window.__ctx.handoff.how, x: window.__ctx.playerObj.pos.x, z: window.__ctx.playerObj.pos.z, n: window.__ctx.handoff.ho.n }));
    check('an arrival point is validated on the destination map (moved out of a building/the river if needed)', ['direct', 'ring'].includes(r2.how), r2);
    await inside.click('#go'); await sleep(500);
    check('ho.mute is applied at Start', await inside.evaluate(() => window.__ctx.audio ? window.__ctx.audio.muted : document.getElementById('mute').getAttribute('aria-pressed') === 'true'));
    await inside.close();
  }
  if (want('required')) {
    console.log('a hand-off arrival REQUIRES its bake:');
    blockManifest = true;
    const ho = Buffer.from(JSON.stringify({ v: 1, from: 'strip', to: 'strip', via: 'gate', gate: 'g0', car: null, mute: false, noui: false, ret: { x: 536, z: 155, yaw: 77, pitch: 0 }, n: 1 })).toString('base64url');
    const page = await open(`index.html?noroof=1&gate=0&guard=0&devgates=1&q=performance&cam=536,155,77,0&ho=${ho}`, { start: false });
    const r = await page.evaluate(() => ({ fatal: !!document.getElementById('fatal'), text: (document.getElementById('fatal') || {}).textContent || '', loaded: document.body.classList.contains('loaded') }));
    check('a missing manifest on a hand-off arrival is an error card, not a procedural build', r.fatal && !r.loaded, r);
    check('the card offers the way back to the area the player came from', /Вернуться|Back to/.test(r.text), r.text.slice(0, 200));
    blockManifest = false; await page.close();
  }
  if (want('car')) {
    console.log('driving:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); }); await hookNav(page);
    // facing west along the Nevsky approach (camera yaw 77 deg; a car's yaw is the camera yaw + 180 deg), 85 m from the border
    await page.evaluate(() => { window.__drive.enter('roadster'); window.__drive.teleport(556, 170.5, 77.07 * Math.PI / 180 + Math.PI); });
    await sleep(500);
    await page.keyboard.down('KeyW');
    try { await page.waitForFunction("!!document.querySelector('#panel:not([hidden]) .confirm')", { timeout: 30000, polling: 50 }); } catch (e) { /* reported below */ }
    let s = await S(page); const dAsk = s.x - 470, vAsk = s.speed / 3.6;
    await page.keyboard.up('KeyW');
    check('the car is asked while driving, before the border, at its stopping depth', s.open && s.driving && dAsk > 25 && dAsk < 130, { dAsk, vAsk, s });
    await sleep(1000); const s1 = await S(page); await sleep(4000); const s2 = await S(page);
    check('the held car stops inside the zone (more than 12 m before the border) and does not roll back', s2.speed < 1 && s2.x - 470 > 12 && s2.vF > -0.4, { s1, s2 });
    await sleep(3000); const s3 = await S(page);
    check('... and stays put for 3 more seconds', Math.hypot(s3.x - s2.x, s3.z - s2.z) < 1, { s2, s3 });
    await page.keyboard.down('KeyW'); await sleep(600); await page.keyboard.up('KeyW'); const s4 = await S(page);
    check('throttle does nothing while the question is open', Math.hypot(s4.x - s3.x, s4.z - s3.z) < 1, { s3, s4 });
    await sleep(100); await page.keyboard.press('Enter'); await sleep(500);
    const r = await page.evaluate(() => window.__navUrls);
    check('accepted while driving: the URL carries the car', r.length === 1 && new URL(r[0], ORIGIN).searchParams.get('ho'), r);
    const ho = JSON.parse(Buffer.from(new URL(r[0], ORIGIN).searchParams.get('ho').replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    check('ho.car is the Roadster with its view and four damage scalars', ho.car && ho.car.id === 'roadster' && ho.car.d.length === 4, ho);
    const arr = await open(r[0].startsWith('http') ? r[0] : `${ORIGIN}/${r[0]}`, { start: false });
    await arr.click('#go'); await sleep(1500);
    const a = await S(arr);
    check('the arrival page puts the player into the same car after Start', a.driving, a);
    check('... at rest at the arrival pose', Math.hypot(a.x - s4.x, a.z - s4.z) < 12 && a.speed < 3, { a, s4 });
    check('no page errors', page.errors.length === 0 && arr.errors.length === 0, { a: page.errors, b: arr.errors });
    await arr.close(); await page.close();
  }
  if (want('fly')) {
    console.log('flying:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); }); await hookNav(page);
    await page.evaluate(() => window.__setCam(560, 60, 190, 77.07, -5));
    await sleep(500); const f0 = await S(page);
    check('the player is flying', f0.fly, f0);
    await page.keyboard.down('KeyW'); try { await page.waitForFunction("!!document.querySelector('#panel:not([hidden]) .confirm')", { timeout: 20000, polling: 100 }); } catch (e) { /* below */ } await page.keyboard.up('KeyW');
    const s = await S(page); check('a flyer is asked too', s.open && s.fly, s);
    await sleep(900); await page.keyboard.press('Enter'); await sleep(500);
    const u = new URL(await page.evaluate(() => window.__navUrls[0]), ORIGIN);
    check('flying hand-off: 5-number cam with the eye height and fly=1', u.searchParams.get('fly') === '1' && u.searchParams.get('cam').split(',').length === 5 && Math.abs(Number(u.searchParams.get('cam').split(',')[1]) - 60) < 15, u.search);
    await page.close();
  }
  if (want('fail')) {
    console.log('failures:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); window.__gates.preflight = async () => ({ ok: false, why: 'offline' }); }); await hookNav(page);
    await placeWalker(page, 545, 167.7); await sleep(400); await walkUntilOpen(page); await sleep(900); await page.keyboard.press('Enter'); await sleep(700);
    const r = await page.evaluate(() => ({ urls: window.__navUrls.length, traveling: window.__gates.traveling, pending: window.__ctx.travelPending, veil: !document.getElementById('travel').hidden, toast: document.querySelector('#toast .t-name').textContent, lock: window.__ctx.playerObj.inputLock }));
    check('an unreachable destination: no navigation, no veil, the game is playable again, a toast says why', r.urls === 0 && !r.traveling && !r.pending && !r.veil && /Нет связи|Cannot reach/.test(r.toast) && r.lock === 0, r);
    await page.evaluate(() => { window.__gates.preflight = async () => ({ ok: false, why: 'stale' }); window.__gates.machine.cooldown(window.__gates.gates.find((g) => g.id === 'g0'), 0.5); });      // (the first failure set the 30 s cooldown: shorten it)
    await sleep(1500); await placeWalker(page, 575, 174.5); await sleep(600); await placeWalker(page, 545, 167.7); await sleep(600); await walkUntilOpen(page); await sleep(900); await page.keyboard.press('Enter'); await sleep(700);
    const r2 = await page.evaluate(() => ({ urls: window.__navUrls.length, traveling: window.__gates.traveling, toast: document.querySelector('#toast .t-name').textContent, lock: window.__ctx.playerObj.inputLock, open: !!document.querySelector('#panel:not([hidden]) .confirm'), pf: window.__gates.preflight.toString().slice(0, 60) }));
    check('a stale destination: no navigation, a toast says the area is out of date, input is free', r2.urls === 0 && !r2.traveling && /устарела|out of date/.test(r2.toast) && r2.lock === 0, r2);
    await page.close();
  }
  if (want('pingpong')) {
    console.log('no ping-pong:');
    const page = await open(`index.html?${FAST}`);
    await page.evaluate(() => { window.__gates.machine.grace(0); }); await hookNav(page);
    await placeWalker(page, 520, 162.7);      // 50 m from the border, standing still: no approach, so no question
    await sleep(3000); const s = await S(page); check('standing inside the zone but not approaching: no question', !s.open && s.chip, s);
    await page.close();
  }
} catch (e) { fails++; console.log('TEST ERROR:', e.stack || e.message); }
finally { await browser.close(); server.close(); }
console.log(`areas-flow-test: ${passes} passed, ${fails} failed`);
console.log(fails || !passes ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails || !passes ? 1 : 0);
