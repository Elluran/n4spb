// End-to-end test of the underground engine in the real renderer (headless Edge / Chrome with GPU, puppeteer-core) on the test world src/world/undertest.js
// (?only=undertest): escalator + stairs 60 m deep, station hall with an island platform at y = -60, a train that arrives, opens its doors and rides to a second
// station 200 m away. Asserts: the walk down (standing / walking / running, no airborne frames), floors (cannot leave the surfaces: random walks), the zones (indoor
// amount, brightness of the screenshots: not dark, not white), the interaction prompt and the ride (board -> ride -> get off), F refused underground, the modal panel,
// the visibility switch (street hidden at depth, metro hidden at the street), the time-of-day key underground. Screenshots go to shots/under/.
//   node tools/under-test.mjs [--q medium|high|low] [--out shots/under/ut] [--keep]
// Exit code 1 on any failed check. (tools/physics-test.mjs covers the same physics headlessly without a browser, tools/smoke.mjs the surface game.)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/under/ut');
fs.mkdirSync(path.dirname(out), { recursive: true });

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
  const q = new URLSearchParams({ q: args.q || 'medium', stats: '1', only: 'undertest' });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  for (const e of await page.evaluate(() => window.__errors || [])) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  await page.click('#go'); await sleep(800);

  // ---------------------------------------------------------------- in-page helpers
  await page.evaluate(() => {
    const C = () => window.__ctx, P = () => window.__ctx.playerObj;
    /** fast-forward the simulation (no rendering): physics + updates + zones. keys(t) -> array of held keys */
    window.__ff = (sec, dt = 1 / 30, keys = null, stop = null) => {
      const p = P(), log = []; let n = 0;
      for (let t = 0; t < sec; t += dt, n++) {
        p.keys = new Set(keys ? keys(t) : []);
        window.__advance(dt); C().physics.refreshDynamic(); if (!p.ride) p.update(dt);
        window.__zones.update(dt);
        log.push({ t, x: p.pos.x, y: p.pos.y, z: p.pos.z, g: p.onGround, ride: !!p.ride });
        if (stop && stop(p, t)) break;
      }
      p.keys = new Set(); return log;
    };
    window.__stats = window.__stats || {};
    window.__pose = () => { const p = P(); return { x: p.pos.x, y: p.pos.y, z: p.pos.z, g: p.onGround, fly: p.fly, ride: p.riding, yaw: p.yaw * 180 / Math.PI, cy: window.__camera.position.y, indoor: C().indoor.amount, zone: C().indoor.zone && C().indoor.zone.indoor && C().indoor.zone.indoor.name, shift: C().undertest.shift, time: C().time }; };
    window.__lum = async (b64) => {
      const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
      const cv = new OffscreenCanvas(img.width, img.height), g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data; let s = 0, dark = 0, white = 0; const n = img.width * img.height;
      for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; if (l < 22) dark++; if (l > 240) white++; }
      return { mean: s / n, dark: dark / n, white: white / n };
    };
  });
  const U = await page.evaluate(() => JSON.parse(JSON.stringify(window.__ctx.undertest.constants)));
  const pose = () => page.evaluate(() => window.__pose());
  const cam = async (x, y, z, yaw, pitch, stand = false) => { await page.evaluate((a) => window.__setCam(...a), [x, y, z, yaw, pitch, stand]); await sleep(350); };
  const shot = async (name) => { const f = `${out}_${name}.png`; const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(f, Buffer.from(b64, 'base64')); return { f, b64, ...(await page.evaluate((b) => window.__lum(b), b64)) }; };
  const imgDiff = (a, b) => page.evaluate(async (a, b) => { const px = async (x) => { const im = await createImageBitmap(await (await fetch('data:image/png;base64,' + x)).blob()); const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; }; const A = await px(a), B = await px(b); let s = 0; for (let i = 0; i < A.length; i += 4) s += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]); return s / (A.length / 4) / 3; }, a, b);
  const toast = () => page.evaluate(() => document.querySelector('#toast .t-name')?.textContent || '');
  const chip = () => page.evaluate(() => { const c = document.getElementById('interact'); return { show: c.classList.contains('show'), text: c.textContent }; });
  const frames = (n = 3) => page.evaluate((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

  // ---------------------------------------------------------------- 1. API presence, street view
  console.log('1. API and the street');
  const api = await page.evaluate(() => { const c = window.__ctx; return { zones: !!c.zones?.add, interact: !!c.interact?.add, ui: !!c.ui?.panel && !!c.ui?.toast, indoor: !!c.indoor, uIndoor: !!c.shared.uIndoor, esc: !!c.physics.addEscalator, conv: !!c.physics.addConveyor, hole: !!c.physics.addHole, board: !!c.playerObj.board && !!c.playerObj.alight, tag: !!c.underground && !!c.surfaceOnly }; });
  ok(Object.values(api).every(Boolean), 'ctx API entries present ' + JSON.stringify(api));
  await cam(0, 1.6, -30, 180, 0); await frames(3);
  const street = await shot('street'); console.log(`   street screenshot: mean luma ${street.mean.toFixed(0)}  ${path.relative(root, street.f)}`);
  const ps = await pose(); ok(ps.indoor === 0 && ps.zone === null, `outdoors: indoor amount 0 (${ps.indoor})`);
  // "visible" here = not hidden by the zone system (userData._zh): the sector culling / distance LOD of core/lod.js hides out-of-view meshes on its own
  const visStreet = await page.evaluate(() => { const z = window.__zones.visibility; let under = 0, underVisible = 0; window.__ctx.staticRoot.traverse((o) => { if (o.isMesh && o.userData.undergroundOnly) { under++; if (!o.userData._zh) underVisible++; } }); return { ...z, nUnder: under, underVisible }; });
  console.log('   visibility at the street:', JSON.stringify(visStreet));
  ok(visStreet.under === false && visStreet.underVisible === 0 && visStreet.nUnder > 3, 'at the street the undergroundOnly meshes are hidden (' + visStreet.underVisible + ' visible of ' + visStreet.nUnder + ')');

  // ---------------------------------------------------------------- 2. down the escalator: keyboard from the street (real loop), then fast-forward standing / walking / running
  console.log('2. escalators and stairs');
  await cam(-2.6, null, -2.5, 180, 0);                      // standing on the street in front of the DOWN escalator, facing south
  await page.keyboard.down('KeyW'); await sleep(1700); await page.keyboard.up('KeyW'); await sleep(300);
  let p = await pose(); console.log(`   after 1.7 s of W: z=${p.z.toFixed(2)} y=${p.y.toFixed(2)} grounded=${p.g}`);
  ok(p.z > 1 && p.y < -0.5 && p.g, `walked from the street onto the down escalator (z ${p.z.toFixed(2)}, y ${p.y.toFixed(2)})`);
  await page.evaluate(() => { const l = window.__ctx.playerObj; l.keys.clear(); });
  const stand = await page.evaluate((U) => { const lg = window.__ff(220, 1 / 30, null, (p) => p.pos.y < U.FY + 0.05); const last = lg[lg.length - 1]; return { t: last.t, y: last.y, z: last.z, air: lg.filter((s) => !s.g).length, maxdy: lg.reduce((m, s, i) => (i ? Math.max(m, Math.abs(s.y - lg[i - 1].y)) : m), 0) }; }, U);
  console.log(`   standing on the down escalator from z=${p.z.toFixed(1)}: ${stand.t.toFixed(1)} s more to the bottom, airborne frames ${stand.air}, max dy ${stand.maxdy.toFixed(3)}`);
  ok(stand.t > 90 && stand.t < 140 && Math.abs(stand.y - U.FY) < 0.1 && stand.air === 0 && stand.maxdy < 0.06, `standing: carried to y=-60 in a plausible time (${stand.t.toFixed(0)} s, y ${stand.y.toFixed(2)}, airborne ${stand.air}, max dy ${stand.maxdy.toFixed(3)})`);
  await frames(3); p = await pose(); ok(p.indoor > 0.99 && p.zone === 'metro', `at the bottom: indoor amount ${p.indoor.toFixed(2)} zone ${p.zone}`);
  for (const [name, keys, lo, hi] of [['walking', ['KeyW'], 12, 40], ['running', ['KeyW', 'ShiftLeft'], 8, 25]]) {
    await page.evaluate(() => window.__setCam(-2.6, null, -2, 180, 0)); await page.evaluate(() => window.__ff(0.5, 1 / 60));
    const r = await page.evaluate((k) => { window.__ctx.playerObj.yaw = Math.PI; const lg = window.__ff(80, 1 / 60, () => k, (p) => p.pos.z > 103.93 + 0.5 && p.onGround && p.pos.y < -59.9); const air = lg.filter((s) => !s.g).length; const last = lg[lg.length - 1]; return { t: last.t, y: last.y, z: last.z, air }; }, keys);
    console.log(`   ${name} down the down escalator: ${r.t.toFixed(1)} s, y ${r.y.toFixed(2)}, airborne frames ${r.air}`);
    ok(r.t > lo && r.t < hi && Math.abs(r.y - U.FY) < 0.1 && r.air === 0, `${name} down: ${r.t.toFixed(1)} s to the bottom, no airborne frames (${r.air}), y ${r.y.toFixed(2)}`);
  }
  // stairs at running speed at several frame times
  for (const dt of [1 / 144, 1 / 60, 1 / 30, 1 / 20]) {
    const r = await page.evaluate((dt) => { window.__setCam(0, null, -2, 180, 0); window.__ff(0.3, 1 / 60); const p = window.__ctx.playerObj; p.yaw = Math.PI; const lg = window.__ff(60, dt, () => ['KeyW', 'ShiftLeft'], (q) => q.pos.z > 104.5); return { t: lg[lg.length - 1].t, y: p.pos.y, air: lg.filter((s) => !s.g).length, n: lg.length }; }, dt);
    ok(r.air === 0 && r.y < U.FY + 0.3, `stairs down at run speed, dt 1/${Math.round(1 / dt)}: ${r.air} airborne of ${r.n} frames, y ${r.y.toFixed(2)}`);
  }

  // ---------------------------------------------------------------- 3. screenshots: tunnel, platform, brightness
  console.log('3. zones and brightness');
  await cam(0.0, -21.6, 40, 180, -10, false);   // free camera 1.5 m over the stairs inside the shaft, looking down the slope
  let s1 = await shot('tunnel'); console.log(`   escalator tunnel: mean luma ${s1.mean.toFixed(0)}, dark ${(s1.dark * 100).toFixed(1)} %, white ${(s1.white * 100).toFixed(1)} %`);
  ok(s1.mean > 70 && s1.mean < 200 && s1.dark < 0.08 && s1.white < 0.08, `tunnel is neither a black void nor white (mean ${s1.mean.toFixed(0)}, dark ${(s1.dark * 100).toFixed(1)} %, white ${(s1.white * 100).toFixed(1)} %)`);
  await cam(0.5, U.FY, 120, 180, 1, true);   // standing on platform A looking south along it
  p = await pose(); ok(Math.abs(p.y - U.FY) < 1e-6 && p.g === false || Math.abs(p.y - U.FY) < 1e-6, `?cam stand puts the feet on the platform (y ${p.y})`);
  await frames(4);
  let s2 = await shot('platform'); console.log(`   platform: mean luma ${s2.mean.toFixed(0)}, dark ${(s2.dark * 100).toFixed(1)} %, white ${(s2.white * 100).toFixed(1)} %`);
  ok(s2.mean > 70 && s2.mean < 200 && s2.dark < 0.08 && s2.white < 0.08, `platform: not dark, not white (mean ${s2.mean.toFixed(0)})`);
  p = await pose(); ok(p.indoor > 0.99, `indoor amount at the platform ${p.indoor}`);
  // the same camera with every zone switched off: the sun / sky look underground (no zone) must differ clearly from the indoor look, which is the one that is lit and flat
  await page.evaluate(() => { window.__zones.get('under').enabled = false; window.__zones.config.autoUnderground = false; }); await frames(3); await sleep(300);
  const sOff = await shot('platform_nozone'); const offState = await pose();
  await page.evaluate(() => { window.__zones.get('under').enabled = true; window.__zones.config.autoUnderground = true; }); await frames(3); await sleep(300);
  console.log(`   platform without the zone: mean luma ${sOff.mean.toFixed(0)} (indoor amount ${offState.indoor}) vs ${s2.mean.toFixed(0)} with it`);
  const dOff = await imgDiff(sOff.b64, s2.b64); console.log(`   mean per-pixel difference with / without the zone: ${dOff.toFixed(1)}`);
  ok(offState.indoor === 0 && dOff > 6, 'the zone is what lights the platform (screenshots with and without it differ clearly)');
  // walking in from the street: outdoors -> vestibule -> metro, the blend is smooth (no jump of the amount between frames)
  const seq = await page.evaluate(() => {
    window.__setCam(-2.6, null, -30, 180, 0); window.__ff(0.3, 1 / 60); const p = window.__ctx.playerObj; p.yaw = Math.PI;
    const names = [], amounts = []; let prev = null, maxJump = 0;
    window.__ff(30, 1 / 60, () => ['KeyW'], (q) => { const a = window.__ctx.indoor.amount, n = window.__ctx.indoor.zone ? window.__ctx.indoor.zone.indoor.name : 'outdoors'; if (names[names.length - 1] !== n) names.push(n); if (prev !== null) maxJump = Math.max(maxJump, Math.abs(a - prev)); prev = a; amounts.push(a); return q.pos.y < -20; });
    return { names, maxJump, final: window.__ctx.indoor.amount };
  });
  console.log('   walking in:', JSON.stringify(seq));
  ok(seq.names.join('>') === 'outdoors>vestibule>metro' && seq.maxJump < 0.06 && seq.final === 1, `outdoors > vestibule > metro with a smooth blend (max step ${seq.maxJump.toFixed(3)} per frame)`);
  await cam(0.5, U.FY, 120, 180, 1, true); await frames(4);
  const visDeep = await page.evaluate(() => { const z = window.__zones.visibility; let surf = 0, surfVisible = 0, under = 0, underVisible = 0; window.__ctx.staticRoot.traverse((o) => { if (o.isMesh && o.userData.surfaceOnly) { surf++; if (!o.userData._zh) surfVisible++; } if (o.isMesh && o.userData.undergroundOnly) { under++; if (!o.userData._zh) underVisible++; } }); return { ...z, surf, surfVisible, nUnder: under, underVisible }; });
  console.log('   visibility at the platform:', JSON.stringify(visDeep));
  ok(visDeep.deep === true && visDeep.surfVisible === 0 && visDeep.underVisible === visDeep.nUnder && visDeep.nUnder > 5, 'at the platform the street is hidden and the metro is drawn');
  // time of day underground: T cycles day -> dusk -> night; the platform look must not change much
  const lumAt = async (name) => (await shot('tod_' + name)).mean;
  const lDay = await lumAt('day'); await page.keyboard.press('KeyT'); await sleep(4200); await frames(3); const lDusk = await lumAt('dusk'); await page.keyboard.press('KeyT'); await sleep(4200); await frames(3); const lNight = await lumAt('night');
  console.log(`   platform luma by time of day: day ${lDay.toFixed(0)} dusk ${lDusk.toFixed(0)} night ${lNight.toFixed(0)}`);
  ok(Math.abs(lDay - lDusk) < 14 && Math.abs(lDay - lNight) < 14, 'the underground look does not depend on the time of day');
  await page.keyboard.press('KeyT'); await sleep(4200);
  // the street again: indoor goes back to 0, the metro disappears
  await cam(0, 1.6, -30, 180, 0); await frames(3); p = await pose(); ok(p.indoor === 0, `back at the street: indoor ${p.indoor}`);
  const s3 = await shot('street2'); ok(Math.abs(s3.mean - street.mean) < 25, `street brightness after the metro (${s3.mean.toFixed(0)} vs ${street.mean.toFixed(0)}; tod may have moved)`) ;

  // ---------------------------------------------------------------- 4. walking on the platform: edges, voids, random walks
  console.log('4. floors and edges');
  const walk = await page.evaluate((U) => {
    const res = {}; const p = window.__ctx.playerObj, ph = window.__ctx.physics;
    // west into the wall: stays on the platform
    window.__setCam(0, U.FY, 150, 90, 0, true); window.__ff(0.2); p.yaw = Math.PI / 2; let lg = window.__ff(4, 1 / 60, () => ['KeyW', 'ShiftLeft']);
    res.west = { x: p.pos.x, y: p.pos.y, minY: Math.min(...lg.map((s) => s.y)), firstY: lg[0].y };
    // east: off the edge onto the track bed (drop 1.0 m), then the wall; climbing back is impossible
    window.__setCam(3, U.FY, 150, -90, 0, true); window.__ff(0.2); p.yaw = -Math.PI / 2; lg = window.__ff(4, 1 / 60, () => ['KeyW']);
    res.east = { x: p.pos.x, y: p.pos.y, g: p.onGround };
    p.yaw = Math.PI / 2; lg = window.__ff(3, 1 / 60, () => ['KeyW']); res.back = { x: p.pos.x, y: p.pos.y };
    // random walks: invariants: grounded feet stand on a surface, never below the bed, never above the street, never rescued
    let rescues = 0; p.onRescue = () => { rescues++; };
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let violations = 0, steps = 0, minY = 0, maxY = -100;
    for (const start of [[0, U.FY, 130, 'stand'], [0, 0, -3, 'street'], [-2.6, 0, -2, 'street'], [3, U.FY, 215, 'stand'], [0, U.FY, 330, 'stand']]) {
      if (start[3] === 'stand') window.__setCam(start[0], start[1], start[2], 0, 0, true); else window.__setCam(start[0], null, start[2], 0, 0);
      let held = [];
      for (let f = 0; f < 60 * 50; f++) {
        if (f % 45 === 0) { held = []; if (rnd() < 0.85) held.push('KeyW'); if (rnd() < 0.2) held.push('KeyA'); if (rnd() < 0.2) held.push('KeyD'); if (rnd() < 0.5) held.push('ShiftLeft'); p.yaw += (rnd() - 0.5) * 3; }
        if (rnd() < 0.004 && p.onGround) p.vy = 4.2;
        window.__ff(1 / 60, 1 / 60, () => held);
        steps++; minY = Math.min(minY, p.pos.y); maxY = Math.max(maxY, p.pos.y);
        if (p.onGround) { const g = ph.groundHeight(p.pos.x, p.pos.z, p.pos.y + 0.01, false); if (!(Math.abs(g - p.pos.y) < 0.06)) violations++; }
        if (!isFinite(p.pos.y) || p.pos.y < U.BED - 0.3 || (p.onGround && p.pos.y > 0.01)) violations++;
      }
    }
    res.walks = { steps, violations, rescues, minY, maxY };
    return res;
  }, U);
  console.log('   ', JSON.stringify(walk));
  ok(walk.west.x > -U.HALL_W && walk.west.x < -U.PLAT_X && Math.abs(walk.west.y - (U.BED + 0.1)) < 0.05, `walking west: off the island platform onto the west track bed (1 m drop), stopped by the wall (x ${walk.west.x.toFixed(2)}, y ${walk.west.y.toFixed(2)})`);
  ok(Math.abs(walk.east.y - (U.BED + 0.1)) < 0.05 && walk.east.x > 4.2 && walk.east.x < 10.3, `stepping off the edge drops 1 m onto the track bed (x ${walk.east.x.toFixed(2)}, y ${walk.east.y.toFixed(2)})`);
  ok(walk.back.x > 3.99 && walk.back.y < U.FY - 0.5, 'cannot climb back onto the platform from the track bed');
  ok(walk.walks.violations === 0 && walk.walks.rescues === 0 && walk.walks.minY > U.BED - 0.3 && walk.walks.maxY <= 1.0, `random walks (${walk.walks.steps} frames): never off the surfaces (violations ${walk.walks.violations}, rescues ${walk.walks.rescues}, y ${walk.walks.minY.toFixed(2)}..${walk.walks.maxY.toFixed(2)})`);

  // ---------------------------------------------------------------- 5. flight
  console.log('5. flight');
  await cam(0.5, U.FY, 150, 180, 0, true); await page.keyboard.press('KeyF'); await sleep(500); p = await pose(); const tn = await toast();
  ok(!p.fly && /No flight underground/.test(tn), `F underground refused with the toast "${tn}" (fly=${p.fly})`);
  await cam(0, null, -20, 180, 0); await page.keyboard.press('KeyF'); await sleep(900); p = await pose(); ok(p.fly, 'F at the street takes off');
  await page.evaluate(() => { const l = window.__ctx.playerObj; l.setPose(0, 20, 180, -60, 30); l.fly = true; });  // 30 m above the shaft, looking down
  await page.keyboard.down('KeyW'); await sleep(2500); await page.keyboard.up('KeyW'); p = await pose();
  ok(p.y >= -0.01 && p.fly, `flying down over the shaft stops at the street (y ${p.y.toFixed(2)})`);
  await page.keyboard.press('KeyF'); await sleep(400); p = await pose(); const tl = await toast(); console.log(`   landing over the shaft: fly=${p.fly} toast "${tl}"`);
  await page.evaluate(() => window.__ctx.playerObj.setPose(0, -20, 0, 0)); await sleep(200);

  // ---------------------------------------------------------------- 6. boarding and riding
  console.log('6. interaction and the ride');
  await page.evaluate(() => { window.__ctx.undertest.shift = 10 - window.__ctx.time; });   // the schedule: the train stands at A, doors opening
  // before the doors open nothing is offered; stand on the platform at the doors with the train dwelling and the doors open
  await page.evaluate((U) => { window.__setCam(3.0, U.FY, U.ZA, -90, 0, true); }, U); await page.evaluate(() => window.__ff(1, 1 / 30)); await frames(3); await sleep(300);
  p = await pose(); const ts = await page.evaluate(() => window.__ctx.undertest.trainState(window.__ctx.time)); console.log(`   t=${p.time.toFixed(1)} train at ${ts.at} doors ${(ts.open * 100).toFixed(0)} %`);
  await page.evaluate(() => window.__ff(4, 1 / 30)); await frames(3); await sleep(300);
  let c = await chip(); console.log(`   prompt: ${JSON.stringify(c)}`);
  ok(c.show && /\[E\] Войти в вагон/.test(c.text) && /Board the train/.test(c.text), `the board prompt "${c.text}" is shown at the open doors`);
  const sb = await shot('doors'); console.log(`   platform with the train: ${path.relative(root, sb.f)} mean ${sb.mean.toFixed(0)}`);
  await page.keyboard.press('KeyE'); await sleep(400); p = await pose();
  ok(p.ride, 'E boards the train (riding)'); const boardTime = p.time;
  const inside = await shot('inside'); console.log(`   inside the car: ${path.relative(root, inside.f)} mean ${inside.mean.toFixed(0)}`);
  // ride: fast-forward; check the player follows the train and ends at B
  const rideLog = await page.evaluate((U) => {
    const lg = []; const ut = window.__ctx.undertest, p = window.__ctx.playerObj;
    for (let i = 0; i < 40 * 30; i++) {
      window.__advance(1 / 30);
      const st = ut.trainState(window.__ctx.time);
      lg.push({ t: window.__ctx.time, tz: st.z, pz: p.pos.z, px: p.pos.x, py: p.pos.y, cy: window.__camera.position.y, at: st.at, open: st.open, ride: p.riding, speed: st.speed });
      if (st.at === 'B' && st.open > 0.95) break;
    }
    return lg;
  }, U);
  const lastR = rideLog[rideLog.length - 1]; const midR = rideLog[Math.floor(rideLog.length / 2)];
  console.log(`   ride: ${(lastR.t - boardTime).toFixed(1)} s from boarding to B, peak speed ${Math.max(...rideLog.map((r) => r.speed)).toFixed(1)} m/s, player z ${lastR.pz.toFixed(1)} train z ${lastR.tz.toFixed(1)}`);
  ok(lastR.at === 'B' && Math.abs(lastR.tz - U.ZB) < 0.01, `the train reached station B (z ${lastR.tz.toFixed(2)} vs ${U.ZB})`);
  ok(rideLog.every((r) => r.ride && Math.abs(r.pz - r.tz) <= U.TRAIN_HALF && Math.abs(r.px - U.TRACK_X) < 1.4 && Math.abs(r.py - U.FY) < 0.02), 'throughout the ride the player is inside the train car (world position follows the frame)');
  ok(rideLog.every((r) => Math.abs(r.cy - (U.FY + 1.52)) < 0.06), 'the camera height is steady on board');
  ok(lastR.t - boardTime > 25 && lastR.t - boardTime < 60, `the ride lasts a plausible time (${(lastR.t - boardTime).toFixed(1)} s)`);
  // mid-ride screenshot (the tunnel through the doors/windows) and the arrival
  await page.evaluate(() => { const ut = window.__ctx.undertest; let g = 0; while (g++ < 4000) { const st = ut.trainState(window.__ctx.time); if (st.at === null && st.speed > 10) break; window.__advance(1 / 30); } });
  await frames(2); await sleep(200); const sr = await shot('ride'); console.log(`   mid-ride: ${path.relative(root, sr.f)} mean ${sr.mean.toFixed(0)}`);
  await page.evaluate(() => { const ut = window.__ctx.undertest; let g = 0; while (g++ < 6000) { const st = ut.trainState(window.__ctx.time); if (st.at === 'B' && st.open > 0.95) break; window.__advance(1 / 30); } });
  await frames(3); await sleep(400); c = await chip(); console.log(`   prompt at B: ${JSON.stringify(c)}`);
  ok(c.show && /\[E\] Выйти/.test(c.text), `the get-off prompt "${c.text}" appears at B with the doors open`);
  await page.keyboard.press('KeyE'); await sleep(400); p = await pose(); const tt = await toast();
  console.log(`   alighted: x ${p.x.toFixed(2)} y ${p.y.toFixed(2)} z ${p.z.toFixed(1)} yaw ${p.yaw.toFixed(0)} toast "${tt}"`);
  ok(!p.ride && Math.abs(p.x - (U.PLAT_X - 1)) < 0.01 && Math.abs(p.y - U.FY) < 0.01 && p.z > U.ZB0 && p.z < U.ZB1 && p.g !== undefined, 'E at B puts the player on platform B');
  ok(Math.abs(((p.yaw % 360) + 360) % 360 - 90) < 1.5, `alight yaw 90 (looking at the platform): ${p.yaw.toFixed(1)}`);
  await sleep(300); const sB = await shot('platformB'); console.log(`   platform B: ${path.relative(root, sB.f)} mean ${sB.mean.toFixed(0)}`);
  await page.evaluate(() => window.__ff(1, 1 / 30)); p = await pose(); ok(Math.abs(p.y - U.FY) < 0.02 && p.g, 'standing on platform B after the ride');
  // walking in the tunnel from B back toward A is allowed, F is refused
  await page.keyboard.press('KeyF'); await sleep(300); p = await pose(); ok(!p.fly, 'no flight on platform B');

  // ---------------------------------------------------------------- 7. panel and escalator toggle
  console.log('7. panel and the escalator switch');
  await page.evaluate(() => window.__setCam(0, null, -5.5, 0, 0)); await page.evaluate(() => window.__ff(0.3)); await frames(3); await sleep(300);
  c = await chip(); ok(c.show && /Схема метро/.test(c.text), `map prompt "${c.text}"`);
  await page.keyboard.press('KeyE'); await sleep(300);
  let pn = await page.evaluate(() => ({ open: window.__ctx.ui.open, hidden: document.getElementById('panel').hidden, lock: window.__ctx.playerObj.inputLock }));
  ok(pn.open && !pn.hidden && pn.lock === 1, `panel opened and the input is locked (${JSON.stringify(pn)})`);
  const z0 = (await pose()).z; await page.keyboard.down('KeyW'); await sleep(600); await page.keyboard.up('KeyW'); ok(Math.abs((await pose()).z - z0) < 0.05, 'the player does not move while the panel is open');
  const sp = await shot('panel');
  await page.keyboard.press('Escape'); await sleep(200); pn = await page.evaluate(() => ({ open: window.__ctx.ui.open, hidden: document.getElementById('panel').hidden, lock: window.__ctx.playerObj.inputLock }));
  ok(!pn.open && pn.hidden && pn.lock === 0, `Esc closes the panel (${JSON.stringify(pn)})`);
  await page.evaluate(() => window.__setCam(-2.6, null, -0.2, 180, 0)); await frames(3); await sleep(300);
  c = await chip(); ok(c.show && /Остановить эскалатор/.test(c.text), `escalator prompt "${c.text}"`);
  await page.keyboard.press('KeyE'); await sleep(200); ok((await page.evaluate(() => window.__ctx.undertest.escDown.dir)) === 0, 'E stops the escalator at runtime (dir 0)');
  await page.keyboard.press('KeyE'); await sleep(200); ok((await page.evaluate(() => window.__ctx.undertest.escDown.dir)) === -1, 'E starts it again');
  await frames(3); await sleep(250); await page.evaluate(() => document.exitPointerLock && document.exitPointerLock()); await sleep(150);       // (a locked pointer sends every click to the canvas: the chip is for touch screens / a free mouse)
  const chipXY = await page.evaluate(() => { const r = document.getElementById('interact').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.click(chipXY[0], chipXY[1]); await sleep(200); ok((await page.evaluate(() => window.__ctx.undertest.escDown.dir)) === 0, 'clicking the chip does the same as the key (touch screens tap it)');
  await page.mouse.click(chipXY[0], chipXY[1]); await sleep(200); await page.evaluate(() => window.__ctx.undertest.escDown.setDir(-1));

  // ---------------------------------------------------------------- 7b. roof map next to deep geometry, batching of underground meshes, the ground seen from below
  console.log('7b. roof map, batches, below the ground');
  await cam(0, null, -30, 180, 0); await frames(3);
  const rm = await page.evaluate(async () => {
    const { captureRoofMap } = await import('/src/core/roofmap.js'); const c = window.__ctx;
    const fp = [{ o: [-75, -22, -45, -22, -45, -2, -75, -2], h: [] }];                            // the block at (-60, -12), 30 x 20 m, 22 m high
    const m = captureRoofMap(c.renderer, c.scene, c.staticRoot, fp, c.physics, { res: 0.5 });
    if (!m) return null; c.physics.setRoofMap(m);
    const at = (x, z) => c.physics.roofTop(x, z);
    const r = { cells: m.cells, ms: Math.round(m.ms), centre: at(-60, -12), edge: at(-74, -21), outside: Number.isNaN(at(-60, 5)) };
    c.physics.setRoofMap(null); return r;
  });
  console.log('   roof map:', JSON.stringify(rm));
  ok(rm && rm.cells > 1000 && Math.abs(rm.centre - 22) < 0.1 && Math.abs(rm.edge - 22) < 0.1 && rm.outside, 'the roof map captures the roof at 22 m with the metro 60 m below in the scene (and nothing outside the footprint)');
  const bt = await page.evaluate(() => {
    const out = { under: 0, surf: 0, other: 0, mergedUnder: 0, spans: 0, untaggedDeep: 0, maxR: 0, list: [] };
    const bb = new window.THREE.Box3();
    window.__ctx.staticRoot.traverse((o) => {
      if (!o.isMesh || !o.geometry.boundingBox) return; bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      const tag = o.userData.undergroundOnly ? 'under' : o.userData.surfaceOnly ? 'surf' : 'other'; out[tag]++;
      const merged = o.parent && o.parent.name === 'static-batched';
      if (merged && tag === 'under') out.mergedUnder++;
      if (merged && o.userData.sources > 1 && bb.max.y - bb.min.y > 26) { out.spans++; out.list.push(o.name || o.uuid.slice(0, 6)); }          // (a single long escalator / vault object is merged alone: it spans by nature)
      if (tag !== 'under' && bb.min.y < -1.05) out.untaggedDeep++;
      if (merged && tag === 'under' && o.geometry.boundingSphere) out.maxR = Math.max(out.maxR, o.geometry.boundingSphere.radius);
    });
    return out;
  });
  console.log('   batches:', JSON.stringify(bt));
  ok(bt.under > 5 && bt.spans === 0 && bt.untaggedDeep === 0 && bt.maxR < 100, `no merged mesh mixes street and platform (tagged under ${bt.under} of which merged ${bt.mergedUnder}, surface ${bt.surf}; merged-from-several taller than 26 m ${bt.spans}; untagged deep ${bt.untaggedDeep}; largest merged underground sphere ${bt.maxR.toFixed(0)} m)`);
  // a camera below the ground outside every zone: the default underground look, no sky
  await cam(60, -4, 30, 0, 25, false); await frames(3); await sleep(300); p = await pose();
  const sgz = await page.evaluate(() => window.__ctx.indoor.zone && window.__ctx.indoor.zone.indoor.name);
  const sBelow = await shot('below'); console.log(`   below the ground, outside every zone: indoor ${p.indoor.toFixed(2)} zone "${sgz}", mean luma ${sBelow.mean.toFixed(0)}, white ${(sBelow.white * 100).toFixed(1)} %`);
  ok(p.indoor > 0.99 && /default/.test(sgz || '') && sBelow.white < 0.2, 'the ground seen from below shows no sky (default underground zone)');
  await page.evaluate(() => window.__setCam(0, null, -30, 180, 0));

  // ---------------------------------------------------------------- 8. fps / draw calls underground vs street
  console.log('8. cost');
  const perf = async (x, y, z, yaw, pitch, stand) => { await cam(x, y, z, yaw, pitch, stand); return page.evaluate(() => window.__bench(20)); };
  const bS = await perf(0, null, -30, 180, 0), bP = await perf(0.5, U.FY, 130, 180, 0, true), bT = await perf(0, -21.6, 40, 180, -10, false);
  console.log(`   street ${JSON.stringify(bS)}\n   platform ${JSON.stringify(bP)}\n   tunnel ${JSON.stringify(bT)}`);
  ok(bP.ms < 25 && bT.ms < 25 && bS.ms < 25, `frame times are low (street ${bS.ms} ms, platform ${bP.ms} ms, tunnel ${bT.ms} ms)`);
  console.log('gpu:', await page.evaluate(() => { const gl = document.getElementById('scene').getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; }));

  // ---------------------------------------------------------------- 9. ?shot mode: zones evaluate for the camera, an underground ?cam works (free camera and standing form)
  console.log('9. ?shot with underground cameras');
  const sp2 = await browser.newPage();
  if (fs.existsSync(threeRoot)) {
    await sp2.setRequestInterception(true);
    sp2.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  sp2.on('pageerror', (e) => problems.push(`[shot pageerror] ${e.message}`));
  const shotQ = (cam) => new URLSearchParams({ shot: '1', w: '640', h: '360', t: '12', q: 'medium', only: 'undertest', cam }).toString();
  await sp2.goto(`http://127.0.0.1:${port}/index.html?${shotQ(`0,${U.FY + 1.52},150,90,0`)}`, { waitUntil: 'load', timeout: 120000 });
  await sp2.waitForFunction('window.__ready === true', { timeout: 280000, polling: 250 });
  const shotState = () => sp2.evaluate(() => ({ amount: window.__ctx.indoor.amount, zone: window.__ctx.indoor.zone?.indoor?.name, fog: window.__ctx.scene.fog.density, skyVisible: window.__ctx.sky.mesh.visible, sun: window.__ctx.sky.sun.intensity, shadowsSkipped: window.__pipeline.skipShadows, y: window.__camera.position.y }));
  let st = await shotState(); console.log('   free camera at the platform:', JSON.stringify(st));
  ok(st.amount === 1 && st.zone === 'metro' && !st.skyVisible && st.sun < 1.6 && st.shadowsSkipped, 'in ?shot mode the zone is in force at once (snapped, sky hidden, shadow pass skipped)');
  await sp2.evaluate((U) => window.__setCam(0.5, U.FY, 150, 90, 0, true), U); await sp2.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const stPose = await sp2.evaluate(() => ({ y: window.__ctx.playerObj.pos.y, fly: window.__ctx.playerObj.fly }));
  ok(Math.abs(stPose.y - U.FY) < 1e-6 && !stPose.fly, 'the standing form (stand flag) puts a walking player on the platform at -60');
  await sp2.evaluate(() => window.__setCam(0, null, -30, 180, 0)); await sp2.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  st = await shotState(); console.log('   back at the street:', JSON.stringify(st));
  ok(st.amount === 0 && st.skyVisible && st.sun > 2 && !st.shadowsSkipped, 'back at the street the zone is off at once (sun, sky, shadows restored)');
  await sp2.close();
} catch (e) { problems.push('UNDER-TEST FAILED: ' + e.stack); }
finally {
  const useful = logs.filter((l) => !/404|favicon/i.test(l)); if (useful.length) { console.log('CONSOLE:'); for (const l of useful.slice(0, 25)) console.log('  ', l.slice(0, 400)); }
  if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  -', p); }
  console.log(problems.length ? `RESULT: FAIL (${problems.length} problems, ${checks} checks)` : `RESULT: OK (${checks} checks)`);
  await browser.close(); server.close();
  process.exit(problems.length ? 1 : 0);
}
