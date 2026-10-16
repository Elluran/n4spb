// landmarksVOStatues-view.mjs - fast close-up renders of ONE piece of landmarksVOStatues WITHOUT building the city (a bare three.js scene, like tools/figures-view.mjs): the piece builder runs in the browser with stand-in toon
// materials (vertex colours, patinated bronze colour, plain plates) so that proportions, poses and silhouettes can be judged in seconds.  The real materials / textures are checked in the integrated shots (tools/shot.mjs).
// usage: node tools/landmarksVOStatues-view.mjs --piece openbook.js:openbook [--piece2 musa.js:musa] --out shots/landmarksVOStatues/v_openbook --cams "yawDeg,pitchDeg,dist,tx,ty,tz;..." [--w 1000 --h 800] [--bg 9db7d0] [--fov 38]
//   --piece  <file in src/world/landmarksVOStatues/>:<piece key>   (the file exports PIECES); several pieces: --piece a.js:k1,b.js:k2 are placed 8 m apart along x
//   --sheet <cols>: render all cameras as tiles of ONE image (<out>_sheet.png)
//   camera: yaw 0 = looking at the piece from +z (its front), 90 = from +x; pitch up positive; dist in metres; (tx,ty,tz) = look-at point.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1000), H = Number(args.h || 800);
const out = args.out || 'shots/landmarksVOStatues/v';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const cams = (args.cams || '0,10,6,0,1,0;60,10,6,0,1,0').split(';').map((s) => s.trim()).filter(Boolean);
const pieces = String(args.piece || 'openbook.js:openbook').split(',').map((s) => s.trim().split(':'));

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#${args.bg || '9db7d0'}}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
import { Parts } from '/src/world/landmarksVOStatues/kit.js';
import { PAL } from '/src/world/landmarksVOStatues/mats.js';
const W = ${W}, H = ${H};
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x${args.bg || '9db7d0'});
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6a6a60, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshToonMaterial({ color: 0x8a8f86 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; scene.add(ground);
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o });
const plate = toon('#8a7035', { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const M = {
  PAL, vc: toon('#ffffff', { vertexColors: true }), vc2: toon('#ffffff', { vertexColors: true, side: THREE.DoubleSide }),
  bronzeSet: { main: toon('#46584f'), dark: toon('#0f1416'), accent: toon('#d9ae32') }, gilt: toon('#d9ae32'), plates: [plate, plate, plate, plate], page: toon('#8b8d8c'), cobble: toon('#8a8a84'), fm: {},
};
M.vcSet = { main: M.vc, dark: M.vc, accent: M.vc };
M.bronzeMono = { main: M.bronzeSet.main, dark: M.bronzeSet.dark, accent: M.bronzeSet.main };
M.mosaic = toon('#6a8ac0');
M.spines = toon('#3d5a50');
M.water = toon('#3e6e74', { emissive: '#10303a' });
const grp = new THREE.Group(); scene.add(grp);
const specs = ${JSON.stringify(pieces)};
let dx = 0;
for (const [file, key] of specs) {
  const mod = await import('/src/world/landmarksVOStatues/' + file);
  const pc = (mod.PIECES || []).find((p) => p.key === key); if (!pc) { console.error('no piece ' + key + ' in ' + file); continue; }
  const P = new Parts(); const K = { x: 0, z: 0, yaw: 0, labels: null, ctx: {}, piece: pc };
  pc.build(P, M, K);
  const g = new THREE.Group(); P.build(g, { name: key }); g.position.x = dx; dx += 8; grp.add(g);
  console.log(key, 'tris', Math.round(P.tris));
}
const cam = new THREE.PerspectiveCamera(${Number(args.fov || 38)}, W / H, 0.05, 300);
window.__ready = true;
window.__sheet = (list, cols) => {                         // several cameras in ONE image (tiles), for contact sheets
  const rows = Math.ceil(list.length / cols), tw = Math.floor(W / cols), th = Math.floor(H / rows);
  r.setScissorTest(true); r.setClearColor(0x${args.bg || '9db7d0'}); r.clear();
  const c2 = new THREE.PerspectiveCamera(${Number(args.fov || 38)}, tw / th, 0.05, 300);
  list.forEach((v, i) => {
    const [yaw, pitch, dist, tx, ty, tz] = v, ya = yaw * Math.PI / 180, pa = pitch * Math.PI / 180;
    c2.position.set(tx + Math.sin(ya) * Math.cos(pa) * dist, ty + Math.sin(pa) * dist, tz + Math.cos(ya) * Math.cos(pa) * dist); c2.lookAt(tx, ty, tz);
    const x = (i % cols) * tw, y = H - (Math.floor(i / cols) + 1) * th;
    r.setViewport(x, y, tw, th); r.setScissor(x, y, tw, th); r.render(scene, c2);
  });
  r.setScissorTest(false); r.setViewport(0, 0, W, H);
};
window.__shot = (yaw, pitch, dist, tx, ty, tz) => {
  const ya = yaw * Math.PI / 180, pa = pitch * Math.PI / 180;
  cam.position.set(tx + Math.sin(ya) * Math.cos(pa) * dist, ty + Math.sin(pa) * dist, tz + Math.cos(ya) * Math.cos(pa) * dist);
  cam.lookAt(tx, ty, tz); r.render(scene, cam);
};
</script>`;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  fs.readFile(path.join(root, p), (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(data); });
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
  if (args.sheet) {                                         // --sheet <cols>: all cameras in one image <out>_sheet.png
    const list = cams.map((c) => c.split(',').map(Number));
    await page.evaluate((l, c) => window.__sheet(l, c), list, Number(args.sheet) || 3);
    const file = path.resolve(root, `${out}_sheet.png`); await page.screenshot({ path: file }); console.log('saved', path.relative(root, file));
  } else
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => window.__shot(...v), v);
    const file = path.resolve(root, `${out}_${i}.png`);
    await page.screenshot({ path: file });
    console.log('saved', path.relative(root, file), 'cam=[' + cams[i] + ']');
  }
} catch (e) { console.log('FAILED', e.message); process.exitCode = 1; }
finally { for (const l of logs.slice(0, 30)) console.log(' ', l.slice(0, 400)); await browser.close(); server.close(); }
