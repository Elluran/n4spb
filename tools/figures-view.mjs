// figures-view.mjs - fast turntable / close-up renders of the figure kit (src/world/lib/figures.js) WITHOUT building the city: a bare three.js scene with a toon material per key,
// a ground disc and a sun, rendered by the headless GPU browser.  Used to judge a figure up close before it goes into a monument.
// usage: node tools/figures-view.mjs --script <file.mjs> --out shots/figures/a --cams "yawDeg,pitchDeg,dist,tx,ty,tz;..." [--w 1000 --h 800] [--bg 9db7d0]
//   the script is an ES module (any path; it is served as /__script.js; import the kit as '/src/world/lib/figures.js') with
//     export default function (THREE, kit) { return THREE.Group }   (a group of meshes; Figure.toGroup(mats) makes one)
//   camera: yaw 0 = looking at the figure from +z (its front), 90 = from +x; pitch up positive; dist in metres; (tx,ty,tz) = look-at point.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const W = Number(args.w || 1000), H = Number(args.h || 800);
const script = path.resolve(args.script);
const out = args.out || 'shots/figures/v';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const cams = (args.cams || '0,10,6,0,1,0;60,10,6,0,1,0').split(';').map((s) => s.trim()).filter(Boolean);

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#${args.bg || '9db7d0'}}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
import * as kit from '/src/world/lib/figures.js';
import build from '/__script.js';
const W = ${W}, H = ${H};
const r = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x${args.bg || '9db7d0'});
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x6a6a60, 1.1));
const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(5, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshToonMaterial({ color: 0x8a8f86 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.002; ground.receiveShadow = true; scene.add(ground);
const grp = build(THREE, kit); scene.add(grp);
const cam = new THREE.PerspectiveCamera(${Number(args.fov || 38)}, W / H, 0.05, 200);
window.__ready = true;
window.__shot = (yaw, pitch, dist, tx, ty, tz) => {
  const ya = yaw * Math.PI / 180, pa = pitch * Math.PI / 180;
  cam.position.set(tx + Math.sin(ya) * Math.cos(pa) * dist, ty + Math.sin(pa) * dist, tz + Math.cos(ya) * Math.cos(pa) * dist);
  cam.lookAt(tx, ty, tz); r.render(scene, cam);
};
</script>`;
const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(PAGE); }
  const f = p === '/__script.js' ? script : path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 } });
const logs = [];
try {
  const page = await browser.newPage();
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__ready === true', { timeout: 60000, polling: 100 }).catch(() => {});
  for (let i = 0; i < cams.length; i++) {
    const v = cams[i].split(',').map(Number);
    await page.evaluate((v) => window.__shot(...v), v);
    const file = path.resolve(root, `${out}_${i}.png`);
    await page.screenshot({ path: file });
    console.log('saved', path.relative(root, file), 'cam=[' + cams[i] + ']');
  }
} catch (e) { console.log('FAILED', e.message); process.exitCode = 1; }
finally { for (const l of logs.slice(0, 30)) console.log(' ', l.slice(0, 400)); await browser.close(); server.close(); }
