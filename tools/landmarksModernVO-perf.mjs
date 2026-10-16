// tools/landmarksModernVO-perf.mjs - draw-call account at fixed poses (real renderer, headless Edge; ONE heavy process: the scene builds live, minutes).
// usage: node tools/landmarksModernVO-perf.mjs --only environment,streets,city,landmarksModernVO --cams "x,y,z,yaw,pitch;..." --out shots/slim/vo_on [--shots 1] [--bench 12] [--q high]
//   per pose: renderer.info calls / triangles of one full frame (all passes: window.__bench) and a histogram of the KINDS drawn in the colour pass (material identity x side x transparent x alphaTest x
//   polygonOffset x cast / receive x layer mask).  `--diff a.json b.json [--kinds 25]` prints calls of a minus b per pose and the kinds a draws more of than b (a = module on, b = module off).
//   The SeaTerminal tool (landmarksSeaTerminal-perf.mjs) is the same program.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }

if (args.diff) {
  const A = JSON.parse(fs.readFileSync(path.resolve(args.diff), 'utf8')), B = JSON.parse(fs.readFileSync(path.resolve(process.argv[process.argv.indexOf('--diff') + 2]), 'utf8'));
  for (let i = 0; i < A.poses.length; i++) {
    const a = A.poses[i], b = B.poses[i]; if (!b) continue;
    const d = a.bench.calls - b.bench.calls;
    console.log(`pose ${i} calls ${b.bench.calls} -> ${a.bench.calls} (${d >= 0 ? '+' : ''}${d}) tris ${b.bench.triangles} -> ${a.bench.triangles}   [first file minus second]`);
    if (args.kinds) {
      const keys = new Set([...Object.keys(a.kinds), ...Object.keys(b.kinds)]);
      const rows = [...keys].map((k) => [k, (a.kinds[k] || 0) - (b.kinds[k] || 0)]).filter((r) => r[1]).sort((x, y) => y[1] - x[1]);
      for (const [k, n] of rows.slice(0, Number(args.kinds) > 1 ? Number(args.kinds) : 25)) console.log(`     ${n > 0 ? '+' : ''}${n}  ${k}`);
    }
  }
  process.exit(0);
}

const puppeteer = (await import('puppeteer-core')).default;
const W = Number(args.w || 1280), H = Number(args.h || 720);
const cams = (args.cams || '').split(';').map((s) => s.trim()).filter(Boolean);
const out = args.out || 'shots/slim/run';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const { bakedRevision } = await import('./baked-revision.mjs');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  if (req.url === '/__baked_revision') { res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); return res.end(JSON.stringify({ revision: bakedRevision(root) })); }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const alt = args.base && /^\/src\/world\/landmarks(ModernVO|SeaTerminal)(\.js|\/)/.test(p) ? path.join(path.resolve(args.base), p) : null;      // --base <dir>: serve these two modules from another copy (git archive HEAD ... | tar -x -C <dir>) = the "before" picture
  fs.readFile(alt && fs.existsSync(alt) ? alt : path.join(root, p), (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const logs = [], result = { only: args.only || 'all', q: args.q || 'high', poses: [] };
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
  result.errors = await page.evaluate(() => window.__errors);
  result.service = await page.evaluate(() => { const v = window.__ctx.services, o = v.landmarksModernVO || v.landmarksSeaTerminal; return o ? { buildMs: o.buildMs, triangles: Math.round(o.triangles), tiles: o.tiles || null, parts: o.parts } : null; });
  console.log('module service:', JSON.stringify(result.service));
  result.timing = await page.evaluate(() => window.__stats.timing); console.log('timing:', JSON.stringify(result.timing));
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => { if (v.length === 4) window.__setCam(v[0], null, v[1], v[2], v[3]); else window.__setCam(v[0], v[1], v[2], v[3], v[4], v.length >= 6 && !!v[5]); }, v);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
    if (args.shots) await page.screenshot({ path: path.resolve(root, `${out}_${i}.png`) });
    const b = await page.evaluate((n) => window.__bench(n), Number(args.bench || 12));
    const kinds = await page.evaluate(() => {
      const ctx = window.__ctx, cam = ctx.camera;
      cam.updateMatrixWorld();
      const M = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse).elements;
      const row = (r) => [M[r], M[4 + r], M[8 + r], M[12 + r]];
      const r0 = row(0), r1 = row(1), r2 = row(2), r3 = row(3), planes = [];
      for (const [a, s] of [[r0, 1], [r0, -1], [r1, 1], [r1, -1], [r2, 1], [r2, -1]]) { const p = [r3[0] + s * a[0], r3[1] + s * a[1], r3[2] + s * a[2], r3[3] + s * a[3]]; const l = Math.hypot(p[0], p[1], p[2]); planes.push(p.map((x) => x / l)); }
      const hist = {};
      const walk = (o, vis) => {
        vis = vis && o.visible;
        if (o.isMesh && vis && (o.layers.mask & 11) && o.material && !Array.isArray(o.material)) {
          const g = o.geometry;
          if (g && g.attributes.position) {
            if (!g.boundingSphere) g.computeBoundingSphere();
            const s = g.boundingSphere.clone(); s.applyMatrix4(o.matrixWorld);
            let inside = true;
            if (o.frustumCulled) for (const p of planes) if (p[0] * s.center.x + p[1] * s.center.y + p[2] * s.center.z + p[3] < -s.radius) { inside = false; break; }
            if (inside && !(o.isInstancedMesh && o.count === 0)) {
              const m = o.material, map = m.map;
              const k = [m.type.replace('Material', ''), map ? 'map' + (map.uuid || '').slice(0, 6) + ':' + (map.image ? map.image.width + 'x' + map.image.height : '?') : 'nomap', m.side, m.transparent ? 'T' : 'O', 'a' + m.alphaTest, 'po' + (m.polygonOffset ? m.polygonOffsetFactor : 0), (o.castShadow ? 'c' : '-') + (o.receiveShadow ? 'r' : '-'), 'L' + o.layers.mask, o.isInstancedMesh ? 'inst' : 'mesh', m.name || ''].join('|');
              hist[k] = (hist[k] || 0) + 1;
            }
          }
        }
        for (const ch of o.children) walk(ch, vis);
      };
      walk(ctx.scene, true);
      return hist;
    });
    result.poses.push({ cam: cams[i], bench: b, kinds });
    console.log(`pose ${i} [${cams[i]}] ms=${b.ms} calls=${b.calls} tris=${b.triangles}`);
  }
  fs.writeFileSync(path.resolve(root, out + '.json'), JSON.stringify(result, null, 1));
  console.log('load s', result.loadSeconds, 'modules', JSON.stringify(await page.evaluate(() => window.__stats.modules)).slice(0, 600));
  if (result.errors && result.errors.length) { console.log('MODULE ERRORS:'); for (const e of result.errors) console.log(` - [${e.module}] ${String(e.message).split('\n').slice(0, 6).join('\n   ')}`); }
} catch (e) { console.log('PERF FAILED:', e.message); process.exitCode = 1; }
finally { if (logs.length) { console.log('PAGE LOGS:'); for (const l of logs.slice(0, 40)) console.log(' ', l.slice(0, 500)); } await browser.close(); server.close(); }
