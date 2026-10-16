// QA pixel probe: what is drawn at a pixel of a screenshot?  node tools/qa-pick.mjs "x,y,z,yaw,pitch" px,py [px,py ...]   (5 numbers = free camera, 4 numbers = walking eye; 1280x720)
// Casts a ray through every pixel (static + dynamic roots, all layers) and prints the hit distance, world point, mesh name, material colour and the owning group chain, so a floating box / a stray lattice can be traced to a module.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cam = process.argv[2].split(',').map(Number), pix = process.argv.slice(3).map((s) => s.split(',').map(Number));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, protocolTimeout: 600000 });
try {
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (req) => { const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url()); if (m) { const f = path.join(root, 'node_modules', 'three', m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); } req.continue(); });
  const q = new URLSearchParams({ shot: '1', w: '1280', h: '720', t: '20', q: 'high', cam: cam.join(',') });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__ready === true', { timeout: 600000, polling: 250 });
  const out = await page.evaluate(async (cam, pix) => {
    if (cam.length === 4) window.__setCam(cam[0], null, cam[1], cam[2], cam[3]); else window.__setCam(cam[0], cam[1], cam[2], cam[3], cam[4]);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
    const T = window.THREE, ctx = window.__ctx, cm = ctx.camera, roots = [ctx.staticRoot, ctx.dynamicRoot].filter(Boolean), res = [];
    cm.updateMatrixWorld(true);
    for (const [px, py] of pix) {
      const ray = new T.Raycaster(); ray.camera = cm; ray.layers.mask = 0xffffffff;
      ray.setFromCamera(new T.Vector2(((px + 0.5) / 1280) * 2 - 1, -(((py + 0.5) / 720) * 2 - 1)), cm);
      const hits = ray.intersectObjects(roots, true).filter((h) => h.object.visible);
      const h = hits.find((q) => q.object.name !== 'nd-proxy') || hits[0]; const more = hits.filter((q) => q.object.name !== 'nd-proxy').slice(0, 6).map((q) => +q.distance.toFixed(2) + ':' + (q.object.name || q.object.type) + '#' + ((q.object.material && q.object.material.color) ? q.object.material.color.getHexString() : '') + '@y' + q.point.y.toFixed(1));
      if (!h) { res.push({ px: [px, py], hit: null }); continue; }
      const chain = []; for (let o = h.object; o && chain.length < 6; o = o.parent) chain.push(o.name || o.type);
      const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
      res.push({ px: [px, py], dist: +h.distance.toFixed(1), at: [h.point.x, h.point.y, h.point.z].map((v) => +v.toFixed(1)), mesh: h.object.name || h.object.type, mat: m && ((m.name || m.type) + (m.color ? '#' + m.color.getHexString() : '')), chain: chain.join('<'), tris: h.object.geometry && h.object.geometry.index ? h.object.geometry.index.count / 3 : null, userData: Object.keys(h.object.userData || {}).join(','), more });
    }
    return res;
  }, cam, pix);
  for (const r of out) console.log(JSON.stringify(r));
} finally { await browser.close(); server.close(); process.exit(0); }
