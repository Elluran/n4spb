// End-to-end smoke test of the real user flow (headless Edge / Chrome with GPU):
//   load -> intro ready -> click "Start" -> walk with W -> fly (F: take-off, climb, landing) -> report module / page errors, fps, draw calls, triangles, movement.
//   node tools/smoke.mjs [--q high|medium|low] [--only a,b] [--seconds 3] [--out shots/smoke] [--area <id> | --page <file>]
// Exit code 1 when a module failed to build, a page error occurred, or the player did not move.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { resolveArea, activateArea } from './lib/area-page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const AREA = resolveArea(args, root);      // --area <id> | --page <file>: smoke another area's page (default: the strip, index.html)
await activateArea(AREA.row, root);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const HERO = L.HERO;                      // a free, walkable spot (the strip: Republic Square; tools/layout-test.mjs checks it)
const out = args.out || 'shots/smoke';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });

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
const problems = [], logs = [];
let failed = false;
try {
  const page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  if (fs.existsSync(threeRoot)) {                                    // serve three.js locally when installed (offline-safe)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  const q = new URLSearchParams({ q: args.q || 'medium', stats: '1' }); if (args.only) q.set('only', args.only);
  if (args.params) for (const [k, v] of new URLSearchParams(args.params)) q.set(k, v);   // e.g. --params "baked=force" (engine work on a stale bake)
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/${AREA.page}?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  console.log(`intro ready after ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await page.screenshot({ path: path.resolve(root, `${out}_intro.png`) });
  const modErrors = await page.evaluate(() => window.__errors || []);
  for (const e of modErrors) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  console.log('module build times:', JSON.stringify(await page.evaluate(() => Object.fromEntries(Object.entries(window.__stats.modules).map(([k, v]) => [k, v.ms])))));

  await page.click('#go');
  await new Promise((r) => setTimeout(r, 2500));
  const p0 = await page.evaluate(() => ({ x: window.__ctx.player.position.x, z: window.__ctx.player.position.z }));
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
  await new Promise((r) => setTimeout(r, Number(args.seconds || 3) * 1000));
  await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  await new Promise((r) => setTimeout(r, 600));
  const p1 = await page.evaluate(() => ({ x: window.__ctx.player.position.x, z: window.__ctx.player.position.z }));
  const moved = Math.hypot(p1.x - p0.x, p1.z - p0.z);
  await page.screenshot({ path: path.resolve(root, `${out}_play.png`) });
  const st = await page.evaluate(() => ({ fps: window.__stats.fps, calls: window.__stats.calls, tris: window.__stats.triangles, bodyPlaying: document.body.classList.contains('playing'), toast: document.querySelector('#toast .t-name')?.textContent }));
  console.log(`walked ${moved.toFixed(1)} m · ${st.fps.toFixed(0)} fps · ${st.calls} calls · ${(st.tris / 1e6).toFixed(2)} M tris · playing=${st.bodyPlaying} · area toast: "${st.toast}"`);
  if (!st.bodyPlaying) problems.push('Start button did not switch to play mode');
  if (moved < 2) problems.push(`player barely moved (${moved.toFixed(2)} m) — blocked spawn or broken controls`);
  // flight (regression: F once looked dead): F alone lifts the player off, W with the view pitched up climbs, F over open ground lands
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pl = () => page.evaluate(() => { const p = window.__ctx.playerObj; return { fly: p.fly, y: p.pos.y, ground: p.onGround, chip: document.getElementById('fly').textContent }; });
  await page.evaluate((h) => window.__setCam(h.x, null, h.z, h.yaw, 0), HERO); await sleep(400);          // the open square (start view), standing
  const f0 = await pl();
  await page.keyboard.press('KeyF'); await sleep(1600);
  const f1 = await pl();
  await page.evaluate(() => { window.__ctx.playerObj.pitch = 0.7; });
  await page.keyboard.down('KeyW'); await sleep(1200); await page.keyboard.up('KeyW'); await sleep(300);
  const f2 = await pl();
  await page.screenshot({ path: path.resolve(root, `${out}_fly.png`) });
  let landed = false;
  for (const dx of [0, 3, -3, 6]) {                                                                // a car or a passer-by may occupy a spot: try a few
    await page.evaluate((a) => { const p = window.__ctx.playerObj; p.pos.x = a.x; p.pos.z = a.z; p.pitch = 0; }, { x: HERO.x + dx, z: HERO.z });
    await page.keyboard.press('KeyF'); await sleep(150);
    if ((await pl()).fly) continue;                                                                // landing refused here: next spot
    for (let i = 0; i < 100 && !landed; i++) { await sleep(100); landed = (await pl()).ground; }
    break;
  }
  console.log(`flight: take-off +${(f1.y - f0.y).toFixed(1)} m · climb (view up + W) +${(f2.y - f1.y).toFixed(1)} m · chip "${f2.chip}" · landed=${landed}`);
  if (!f1.fly || f1.y - f0.y < 2) problems.push(`F did not lift the player off (${(f1.y - f0.y).toFixed(2)} m)`);
  if (f2.y - f1.y < 3) problems.push(`flying with the view pitched up did not climb (${(f2.y - f1.y).toFixed(2)} m)`);
  if (!/^Fly · \d+ m$/.test(f2.chip)) problems.push(`flight HUD chip shows "${f2.chip}" instead of the altitude`);
  if (!landed) problems.push('F did not bring the player back to the ground');
  // roofs: F above a level roof lands on it, the player can walk there without leaving it, F takes off again
  const roofSpot = await page.evaluate(() => {
    const ph = window.__ctx.physics, m = ph.roof, B = window.__ctx.L.WORLD.play, P = window.__ctx.playerObj; if (!m) return null;
    // the play area is a union of rectangles (layout.clampToPlay): a roof in an empty notch (the Sea Terminal tower) is refused by the player, so not a test spot
    const inPlay = (x, z) => { if (!P.clampXZ) return true; const c = P.clampXZ(x, z, 2); return c[0] === x && c[1] === z; };
    let best = null;
    for (let j = 8; j < m.h - 8; j += 3) for (let i = 8; i < m.w - 8; i += 3) {
      const x = m.x0 + (i + 0.5) * m.res, z = m.z0 + (j + 0.5) * m.res, c = ph.roofTop(x, z);
      if (!(c > 9) || x < B.x0 + 10 || x > B.x1 - 10 || z < B.z0 + 10 || z > B.z1 - 10 || !inPlay(x, z) || ph.columnBlocked(x, z, 0.3, c + 0.45, c + 28)) continue;     // the landing needs the whole column up to the flier (25 m) clear
      let level = true; for (let k = 0; k < 16 && level; k++) { const a = k * Math.PI / 8, v = ph.roofTop(x + Math.cos(a) * 3, z + Math.sin(a) * 3); if (!(Math.abs(v - c) <= 0.45)) level = false; }
      if (level && (!best || c > best.top)) best = { x, z, top: c };
    }
    return best;
  });
  if (!roofSpot) console.log('roofs: no roof map / no level roof (module subset?) - skipped');
  else {
    const rf = () => page.evaluate(() => { const p = window.__ctx.playerObj; return { fly: p.fly, ground: p.onGround, y: p.pos.y, top: window.__ctx.physics.roofTop(p.pos.x, p.pos.z), roof: p.roof }; });
    await page.evaluate((s) => { const p = window.__ctx.playerObj; p.setPose(s.x, s.z, 0, -10, s.top + 25 + p.eye); }, roofSpot); await sleep(200);
    await page.keyboard.press('KeyF'); await sleep(150);
    let r0 = await rf(); for (let i = 0; i < 100 && r0.fly === false && !r0.ground; i++) { await sleep(100); r0 = await rf(); }
    await sleep(250); r0 = await rf();                                                             // the roof is latched on the frame after touch-down
    const onRoof = !r0.fly && r0.ground && Math.abs(r0.y - roofSpot.top) < 0.1 && r0.roof !== null;
    await page.keyboard.down('ShiftLeft'); await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); await sleep(200);
    const r1 = await rf();
    await page.keyboard.press('KeyF'); await sleep(1500); const r2 = await rf();
    console.log(`roofs: landed=${onRoof} at ${roofSpot.top.toFixed(1)} m · walked, still on the roof=${r1.ground && Number.isFinite(r1.top) && Math.abs(r1.y - r1.top) < 0.6} · take-off +${(r2.y - r1.y).toFixed(1)} m`);
    if (!onRoof) problems.push(`F above a level roof (${roofSpot.top.toFixed(0)} m) did not land on it (fly=${r0.fly}, y=${r0.y.toFixed(2)}, roof surface ${roofSpot.top.toFixed(2)})`);
    else if (!(r1.ground && Number.isFinite(r1.top) && Math.abs(r1.y - r1.top) < 0.6)) problems.push('walking on the roof left the roof surface (fell, or clipped through it)');
    if (!(r2.fly && r2.y - r1.y > 3)) problems.push('F on the roof did not take off');
    await page.evaluate((h) => window.__setCam(h.x, null, h.z, h.yaw, 0), HERO); await sleep(300);              // back to the square: the NPC check below needs people within 60 m
  }
  // NPC heads (regression: cyclists left their head angles / hip height in a pose object shared with the walkers, so every walker's head
  // flicked left / right on each frame). The flicker alternates sign, so its yaw second difference is ~0.5 rad; real motion stays under ~0.03.
  const hj = await page.evaluate(async () => {
    const ctx = window.__ctx, cam = ctx.camera, meshes = []; ctx.dynamicRoot.traverse((o) => { if (o.isInstancedMesh && o.name.startsWith('people-h|')) meshes.push(o); });
    const hist = new Map(); let worst = 0, frames = 0;
    const wrap = (d) => { while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
    await new Promise((res) => {
      const tick = () => {
        meshes.forEach((m, mi) => {
          const a = m.instanceMatrix.array;
          for (let i = 0; i < m.count; i++) {
            const o = i * 16; if (Math.hypot(a[o + 12] - cam.position.x, a[o + 14] - cam.position.z) > 60) continue;
            const k = mi + '#' + i, h = hist.get(k) || []; h.push(Math.atan2(a[o + 8], a[o + 10])); if (h.length > 3) h.shift(); hist.set(k, h);
            if (h.length === 3) worst = Math.max(worst, Math.abs(wrap(h[2] - 2 * h[1] + h[0])));
          }
        });
        if (++frames >= 90) res(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return { worst, heads: hist.size };
  });
  console.log(`npc heads: ${hj.heads} tracked within 60 m · worst head-yaw jerk ${hj.worst.toFixed(3)} rad/frame²`);
  if (hj.heads >= 3 && hj.worst > 0.1) problems.push(`NPC heads jitter (head yaw second difference ${hj.worst.toFixed(3)} rad per frame², expected < 0.1: a stale shared pose?)`);
  // look easing: a flick is spread over a few frames but the total turn is exact; smoothing 0 is the raw look
  const lk = await page.evaluate(() => {
    const p = window.__ctx.playerObj, s0 = p.smoothing, sens = 0.0022, res = {};
    p.smoothing = 0.04; p.setPose(p.pos.x, p.pos.z, 0, 0); p.look.dx = -300; p.update(1 / 60); res.first = p.yaw / (300 * sens);
    for (let i = 0; i < 40; i++) p.update(1 / 60); res.total = p.yaw / (300 * sens);
    p.smoothing = 0; p.setPose(p.pos.x, p.pos.z, 0, 0); p.look.dx = -300; p.update(1 / 60); res.raw = p.yaw / (300 * sens);
    p.smoothing = s0; p.setPose(p.pos.x, p.pos.z, 0, 0); return res;
  });
  console.log(`look easing: first frame ${(lk.first * 100).toFixed(0)}% of a flick · settled ${(lk.total * 100).toFixed(1)}% · raw mode ${(lk.raw * 100).toFixed(0)}%`);
  if (!(lk.first > 0.15 && lk.first < 0.6)) problems.push(`look easing: a flick moved ${(lk.first * 100).toFixed(0)}% of the way in the first frame (expected 15-60%)`);
  if (Math.abs(lk.total - 1) > 0.005) problems.push(`look easing lost or added turn: settled at ${(lk.total * 100).toFixed(1)}% of the input`);
  if (Math.abs(lk.raw - 1) > 1e-6) problems.push(`raw look (smoothing 0) is not instant: ${(lk.raw * 100).toFixed(1)}%`);
  const info = await page.evaluate(() => { const gl = document.getElementById('scene').getContext('webgl2'); const d = gl && gl.getExtension('WEBGL_debug_renderer_info'); return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log('gpu:', info);
} catch (e) { problems.push('SMOKE FAILED: ' + e.message); }
finally {
  const useful = logs.filter((l) => !/404|favicon/i.test(l)); if (useful.length) { console.log('CONSOLE:'); for (const l of useful.slice(0, 25)) console.log('  ', l.slice(0, 400)); }
  if (problems.length) { failed = true; console.log('PROBLEMS:'); for (const p of problems) console.log('  -', p); }
  console.log(failed ? 'RESULT: FAIL' : 'RESULT: OK');
  await browser.close(); server.close();
  process.exit(failed ? 1 : 0);
}
