// tools/landmarksSmolensky-perf.mjs - draw-call / triangle account of the Smolensky Orthodox Cemetery at fixed poses (real renderer, headless Edge; ONE heavy process: the scene builds live, minutes).
// usage: node tools/landmarksSmolensky-perf.mjs --only environment,streets,city,landmarksSmolensky --out shots/landmarksSmolensky/perf/with [--cams "x,z,yaw,pitch;..."] [--bench 20] [--shots 1] [--q high]
//   default poses: A main alley by the church, B Xenia chapel front, C Resurrection church from the lot gate, D deep alley (Moskovskaya) in the middle of the cemetery.
//   Per pose: frame ms, draw calls and triangles of one full frame (renderer.info over all passes: normal / depth, shadow, colour, bloom: window.__bench), and the module's own meshes (names 'lmsmol-*')
//   with the passes each would be drawn in (ND = layer 0, colour = layers 0 / 1 / 3, shadow = castShadow).  Writes <out>.json and (with --shots) <out>_<i>.png.
//   Compare module on / off by leaving 'landmarksSmolensky' out of --only (the claim of the cemetery then falls back to the generic houses / trees).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1280), H = Number(args.h || 720);
const POSES = { A: '-5608,-1483,115,3', B: '-5588.9,-1343.9,-164.8,8', C: '-5480,-1532,20,10', D: '-5717,-1048,-60.6,2' };
const cams = (args.cams || 'A;B;C;D').split(';').map((s) => s.trim()).filter(Boolean).map((c) => POSES[c] || c);
const out = args.out || 'shots/landmarksSmolensky/perf/run';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const { bakedRevision } = await import('./baked-revision.mjs');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  if (req.url === '/__baked_revision') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ revision: bakedRevision(root) })); }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const logs = [];
const result = { only: args.only || 'all', q: args.q || 'high', poses: [] };
try {
  const page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  if (fs.existsSync(threeRoot)) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const q = new URLSearchParams({ w: String(W), h: String(H), t: String(args.t ?? 20), q: args.q || 'high', shot: '1', cam: cams[0] });
  if (args.only) q.set('only', args.only);
  const t0 = Date.now();
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 290000, polling: 250 });
  result.loadSeconds = Math.round((Date.now() - t0) / 1000);
  result.modules = await page.evaluate(() => window.__stats.modules);
  result.errors = await page.evaluate(() => window.__errors);
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => { if (v.length === 4) window.__setCam(v[0], null, v[1], v[2], v[3]); else window.__setCam(v[0], v[1], v[2], v[3], v[4], v.length >= 6 && !!v[5]); }, v);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    if (args.shots) await page.screenshot({ path: path.resolve(root, `${out}_${i}.png`) });
    const b = await page.evaluate((n) => window.__bench(n), Number(args.bench || 20));
    const mod = await page.evaluate(() => {
      const cam = window.__ctx.camera, ctxs = window.__ctx, rows = {}; let nd = 0, col = 0, sh = 0, tris = 0, meshes = 0, inst = 0;
      const walk = (o, vis) => {
        vis = vis && o.visible;
        if (o.isMesh && (o.name || '').startsWith('lmsmol-')) {
          const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3, c = o.isInstancedMesh ? o.count : 1, m = o.layers.mask;
          meshes++;
          if (vis && c > 0) {
            const inND = !!(m & 1), inCol = !!(m & (1 | 2 | 8)), inSh = !!o.castShadow && inCol;
            nd += inND ? 1 : 0; col += inCol ? 1 : 0; sh += inSh ? 1 : 0; tris += n * c * ((inND ? 1 : 0) + (inCol ? 1 : 0)) / 2; if (o.isInstancedMesh) inst += c;
            const fam = o.name.replace(/-\d+$/, '');
            const r = (rows[fam] ||= { meshes: 0, count: 0, nd: 0, col: 0, sh: 0, tris: 0 });
            r.meshes++; r.count += c; r.nd += inND ? 1 : 0; r.col += inCol ? 1 : 0; r.sh += inSh ? 1 : 0; r.tris += Math.round(n * c);
          }
        }
        for (const ch of o.children) walk(ch, vis);
      };
      walk(window.__ctx.scene, true);
      return { cam: [cam.position.x, cam.position.y, cam.position.z].map((v) => Math.round(v * 10) / 10), meshes, instances: inst, ndCalls: nd, colourCalls: col, shadowCalls: sh, estCalls: nd + col + sh, estTrisColour: Math.round(tris), rows };
    });
    result.poses.push({ cam: cams[i], bench: b, module: mod });
    console.log(`pose ${i} [${cams[i]}] ms=${b.ms} jsMs=${b.jsMs} calls=${b.calls} tris=${b.triangles} | module meshes=${mod.meshes} est calls nd/col/sh=${mod.ndCalls}/${mod.colourCalls}/${mod.shadowCalls} inst=${mod.instances} tris~${mod.estTrisColour}`);
    if (args.rows && args.rows !== '0') for (const [k, r] of Object.entries(mod.rows).sort((a, c) => (c[1].nd + c[1].col + c[1].sh) - (a[1].nd + a[1].col + a[1].sh)).slice(0, 40)) console.log(`   ${k.padEnd(34)} meshes ${String(r.meshes).padStart(3)} count ${String(r.count).padStart(6)} nd ${r.nd} col ${r.col} sh ${r.sh} tris ${r.tris}`);
  }
  const info = await page.evaluate(() => ({ batch: window.__stats.batch }));
  result.batch = info.batch;
  fs.writeFileSync(path.resolve(root, out + '.json'), JSON.stringify(result, null, 1));
  console.log('modules:', JSON.stringify(result.modules), 'load s', result.loadSeconds);
  if (result.errors && result.errors.length) { console.log('MODULE ERRORS:'); for (const e of result.errors) console.log(` - [${e.module}] ${String(e.message).split('\n').slice(0, 6).join('\n   ')}`); }
} catch (e) {
  console.log('PERF FAILED:', e.message); process.exitCode = 1;
} finally {
  if (logs.length) { console.log('PAGE LOGS:'); for (const l of logs.slice(0, 40)) console.log(' ', l.slice(0, 500)); }
  await browser.close(); server.close();
}
