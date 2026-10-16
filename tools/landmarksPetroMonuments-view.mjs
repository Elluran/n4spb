// landmarksPetroMonuments-view.mjs - fast close-up renders of ONE OR MORE pieces of landmarksPetroMonuments WITHOUT building the city (a bare three.js scene, like tools/figures-view.mjs): the piece builder runs in the
// browser with the module's REAL materials (a context from core/ctx.js, mats.js) so that proportions, poses, patina, plates and silhouettes can be judged in seconds against the photos.
// usage: node tools/landmarksPetroMonuments-view.mjs --piece busts.js:chkalov[,men.js:popov] --out shots/landmarksPetroMonuments/v_chk --cams "yawDeg,pitchDeg,dist,tx,ty,tz;..." [--w 1000 --h 800] [--bg 9db7d0] [--fov 38] [--gap 8]
//   --piece  <file in src/world/landmarksPetroMonuments/>:<piece key>   several pieces are placed --gap metres apart along x
//   camera: yaw 0 = looking at the piece from +z (its front), 90 = from +x; pitch up positive; dist in metres; (tx,ty,tz) = look-at point (the first piece is at x 0).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1000), H = Number(args.h || 800);
const out = args.out || 'shots/landmarksPetroMonuments/v';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const cams = (args.cams || '0,10,6,0,1,0;60,10,6,0,1,0').split(';').map((s) => s.trim()).filter(Boolean);
const pieces = String(args.piece || 'busts.js:chkalov').split(',').map((s) => s.trim().split(':'));
const GAP = Number(args.gap || 8);

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#${args.bg || '9db7d0'}}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
import { createContext } from '/src/core/ctx.js';
import { makeMats } from '/src/world/landmarksPetroMonuments/mats.js';
import { geosOf } from '/src/world/landmarksPetroMonuments/objs.js';
const W = ${W}, H = ${H};
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x${args.bg || '9db7d0'});
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6a6a60, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshToonMaterial({ color: 0x8a8f86 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; scene.add(ground);
const cam = new THREE.PerspectiveCamera(${Number(args.fov || 38)}, W / H, 0.05, 400);
const ctx = createContext({ scene, camera: cam, renderer: null, audio: null, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 75, petals: 1 }, sunDir: sun.position.clone().normalize() });
const M = makeMats(ctx);
const grp = new THREE.Group(); scene.add(grp);
const specs = ${JSON.stringify(pieces)};
let dx = 0;
for (const [file, key] of specs) {
  const mod = await import('/src/world/landmarksPetroMonuments/' + file);
  const pc = (mod.PIECES || []).find((p) => p.key === key); if (!pc) { console.error('no piece ' + key + ' in ' + file); continue; }
  const K = { x: 0, z: 0, yaw: 0, labels: null, ctx, piece: pc };
  const set = geosOf((P) => pc.build(P, M, K));
  const g = new THREE.Group();
  for (const { mat, geo } of set.list) { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; g.add(m); }
  g.position.x = dx; (window.__pieces ||= []).push({ key, x: dx, h: pc.h || 3 }); dx += ${GAP}; grp.add(g);
  console.log(key, 'tris', set.tris);
}
window.__ready = true;
window.__shot = (yaw, pitch, dist, tx, ty, tz) => {
  ctx.shared.uTime.value = 3; sun.position.set(tx + 5, 9, 6); sun.target.position.set(tx, 0, 0); sun.target.updateMatrixWorld(); scene.add(sun.target);
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
  await page.waitForFunction('window.__ready === true', { timeout: 60000 }).catch(() => {});
  let list = cams;
  if (args.auto) { const pcs = await page.evaluate(() => window.__pieces); const yaws = String(args.yaws || '0,40').split(',').map(Number); list = []; for (const p of pcs) for (const [k, y] of yaws.entries()) list.push([y, 8, p.h * (k ? 1.1 : 2.1) + 2.5, p.x, p.h * (k ? 0.65 : 0.5), 0].join(',')); console.log('AUTO ' + pcs.map((p) => p.key).join(' ')); }
  for (let i = 0; i < list.length; i++) {
    const c = list[i].split(',').map(Number);
    await page.evaluate((c) => window.__shot(...c), c);
    const f = path.resolve(root, `${out}_${i}.png`);
    await page.screenshot({ path: f });
    console.log('wrote ' + path.relative(root, f));
  }
} finally { for (const l of logs.slice(0, 30)) console.log(l); await browser.close(); server.close(); }
process.exit(0);
