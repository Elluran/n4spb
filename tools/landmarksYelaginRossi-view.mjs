// tools/landmarksYelaginRossi-view.mjs - FAST preview of the Rossi pavilions without building the city: a bare three.js scene (toon material per key, sun, a ground plane, a 1.7 m figure for scale) rendered by the
// headless GPU browser in seconds.  The module is built with a thin ctx stub (materials, canvas textures, no physics), so it shows exactly the geometry of the module; the real look (outlines, shadows, trees,
// quay) is checked with tools/shot.mjs.   usage: node tools/landmarksYelaginRossi-view.mjs --out shots/landmarksYelaginRossi/v --cams "x,y,z,tx,ty,tz;..." [--w 1280 --h 720] [--parts music,east]
//   cams are WORLD metres (x east, y up, z south): eye position and look-at target.  Example (the Music Pavilion front): "-4605,1.7,-4916,-4617,2.5,-4924".
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1280), H = Number(args.h || 720);
const out = args.out || 'shots/landmarksYelaginRossi/v';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const cams = (args.cams || '').split(';').map((s) => s.trim()).filter(Boolean);
const PARTS = (args.parts || 'music,east,island,guard').split(',');

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#9db7d0}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
const W = ${W}, H = ${H};
window.__ROSSI_ALL = true; window.__ROSSI_NEAR = ${args.far ? 'false' : 'true'}; window.__ROSSI_PARTS = ${JSON.stringify(PARTS)};
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x9db7d0);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x7a7a68, 1.25));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); scene.add(sun); scene.add(sun.target);
const grad = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 160, 160, 160, 255, 215, 215, 215, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat); grad.needsUpdate = true; grad.minFilter = grad.magFilter = THREE.NearestFilter;
const ctx = {
  scene, services: {}, buildList: [],
  mat: { toon: (color, o = {}) => { const m = new THREE.MeshToonMaterial({ color, map: o.map || null, gradientMap: grad, alphaTest: o.alphaTest || 0, side: o.side === 'double' ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: !!o.polygonOffset, polygonOffsetFactor: o.polygonOffset || 0, polygonOffsetUnits: o.polygonOffset || 0 }); m.name = o.name || ''; return m; } },
  tex: {
    FONTS: { serif: 'serif', sans: 'sans-serif', en: 'sans-serif' },
    draw: (w, h, fn, o = {}) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; },
    fitText: (g, text, x, y, maxW, size, font, weight = 700) => { let s = size; g.font = weight + ' ' + s + 'px ' + font; while (g.measureText(text).width > maxW && s > 6) { s -= 1; g.font = weight + ' ' + s + 'px ' + font; } g.fillText(text, x, y); },
  },
  noOutline() {}, addStatic(o) { scene.add(o); },
  physics: window.__ROSSI_PHYS ? null : new Proxy({}, { get: () => () => ({}) }),
  rng: (s) => () => 0.5,
};
const mod = await import('/src/world/landmarksYelaginRossi.js');
await mod.build(ctx);
window.__stats = ctx.services.landmarksYelaginRossi;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshToonMaterial({ color: 0x78a05a, gradientMap: grad })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true;
const gc = new THREE.Group(); gc.add(ground); scene.add(gc);
const person = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.7, 10), new THREE.MeshToonMaterial({ color: 0xc0504d, gradientMap: grad })); person.position.y = 0.85; person.castShadow = true;
const cam = new THREE.PerspectiveCamera(${Number(args.fov || 60)}, W / H, 0.05, 3000);
window.__ready = true;
window.__shot = (x, y, z, tx, ty, tz, px, pz) => {
  gc.position.set(tx, 0, tz);
  sun.position.set(tx - 0.473 * 60, 0.707 * 60, tz + 0.526 * 60); sun.target.position.set(tx, 0, tz);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 }); sun.shadow.camera.updateProjectionMatrix();
  if (px !== undefined) { person.position.set(px, 0.85, pz); scene.add(person); } else scene.remove(person);
  cam.position.set(x, y, z); cam.lookAt(tx, ty, tz); r.render(scene, cam);
};
</script>`;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
const logs = [];
try {
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'log') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__ready === true', { timeout: 60000, polling: 100 }).catch(() => {});
  console.log('stats', JSON.stringify(await page.evaluate(() => window.__stats)));
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => window.__shot(...v), v);
    const file = path.resolve(root, `${out}_${i}.png`);
    await page.screenshot({ path: file });
    console.log('saved', path.relative(root, file), 'cam=[' + cams[i] + ']');
  }
} catch (e) { console.log('FAILED', e.message); process.exitCode = 1; }
finally { for (const l of logs.slice(0, 40)) console.log(' ', l.slice(0, 500)); await browser.close(); server.close(); }
