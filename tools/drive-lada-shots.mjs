// Lada 2106 model lab: renders src/world/drive/cars/lada2106.js with the REAL three.js renderer (headless Edge, ANGLE / D3D11) on a tiny page of its own (no city, no registry):
// real toon materials from core/materials.js, the game's light recipe (hemisphere 1.9 + sun 2.1, PCF soft shadows, sRGB, no tone mapping) and a simple inverted-hull outline (the game's outline is a post pass).
//   node tools/drive-lada-shots.mjs [--views front,front34,side,rear34,rear,top,cockpit,cockpitDash,cockpitL,cockpitBack] [--out shots/drive/lada/a] [--w 1280 --h 720] [--tod night] [--brake] [--dmg front=0.6,rear=0.3,left=0.2,right=0] [--speed 80] [--eval "js"]
// A view is a camera preset; the car stands at the origin facing +Z (its left side = +X). Prints triangles / draw calls of the car (exterior and cockpit set).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const W = Number(args.w || 1280), H = Number(args.h || 720);
const out = args.out || 'shots/drive/lada/a';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const VIEWS = {
  front: { p: [0.0, 1.0, 7.5], t: [0, 0.72, 0], fov: 30 },
  front34: { p: [5.2, 1.6, 6.2], t: [0, 0.68, 0.1], fov: 30 },
  side: { p: [9.0, 0.95, 0.0], t: [0, 0.72, 0], fov: 26 },
  rear34: { p: [4.8, 1.6, -6.4], t: [0, 0.7, 0], fov: 30 },
  rear: { p: [0.0, 1.0, -7.5], t: [0, 0.72, 0], fov: 30 },
  top: { p: [0.0, 9.5, 0.2], t: [0, 0, 0.1], fov: 30, up: [0, 0, 1] },
  closeFront: { p: [1.6, 0.9, 3.4], t: [0.3, 0.6, 2.0], fov: 38 },
  closeRear: { p: [-1.4, 0.95, -3.4], t: [0.0, 0.62, -2.0], fov: 38 },
  closeWheel: { p: [2.6, 0.5, 1.9], t: [0.7, 0.32, 1.2], fov: 38 },
  cockpit: { cockpit: true, look: [0, 0] },
  cockpitDash: { cockpit: true, look: [0, -0.28] },
  cockpitL: { cockpit: true, look: [1.0, 0] },
  cockpitR: { cockpit: true, look: [-1.0, 0] },
  cockpitBack: { cockpit: true, look: [3.0, 0] },
  cockpitUp: { cockpit: true, look: [0, 0.55] },
};
const names = (args.views || 'front34,side,rear34,cockpit').split(',').filter(Boolean);
for (const n of names) if (!VIEWS[n]) { console.log('unknown view', n, 'known:', Object.keys(VIEWS).join(',')); process.exit(1); }

const PAGE = `<!doctype html><meta charset="utf-8"><title>lada lab</title>
<style>html,body{margin:0;background:#9bb7d4;overflow:hidden}canvas{display:block}</style>
<script type="importmap">{ "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" } }</script>
<canvas id="c"></canvas>
<script type="module">
import * as THREE from 'three';
import { createMaterials } from '/src/core/materials.js';
import { createLadaModel, SPEC_LADA } from '/src/world/drive/cars/lada2106.js';
import { createCarDamage } from '/src/world/drive/damage.js';
const W = ${W}, H = ${H};
const cvs = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#a9c6e4');
const args_sunx = ${args.sun ?? 12};
const night = ${args.tod === 'night' ? 1 : 0};
const hemi = new THREE.HemisphereLight('#b0c6ea', '#cbb99e', night ? 0.35 : 1.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff8ee', night ? 0.25 : 2.1); sun.position.set(args_sunx, 22, 10); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 80 }); sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.035; scene.add(sun);
if (night) scene.background = new THREE.Color('#0d1424');
const shared = { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(0.9, 0.35) }, uSunDir: { value: sun.position.clone().normalize() }, uGust: { value: 0.5 }, uNight: { value: night }, uSkyLow: { value: new THREE.Color('#e6e2e4') }, uSkyMid: { value: new THREE.Color('#86b4e6') }, uSkyTop: { value: new THREE.Color('#3f7fd2') }, uIndoor: { value: 0 } };
const mat = createMaterials(shared);
const ctx = { mat, shared, noOutline(o) { o.traverse((m) => m.layers.set(1)); return o; } };
const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshToonMaterial({ color: '#5a5e61' })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const car = createLadaModel(ctx); scene.add(car.root);
const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 200); camera.layers.enable(1);
// a cheap outline: every opaque mesh of the car drawn again as a back-face hull pushed out along its normals (dark ink)
const inkMat = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { w: { value: 0.012 } }, vertexShader: 'uniform float w; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * w, 1.0); }', fragmentShader: 'void main(){ gl_FragColor = vec4(0.2,0.22,0.29,1.0); }' });
const hulls = [];
car.root.traverse((o) => { if (o.isMesh && o.material && o.material.type === 'MeshToonMaterial' && o.layers.mask === 1) { const h = new THREE.Mesh(o.geometry, inkMat); h.matrixAutoUpdate = false; h.userData.src = o; h.frustumCulled = false; h.layers.set(0); scene.add(h); hulls.push(h); } });
function syncHulls() { car.root.updateMatrixWorld(true); for (const h of hulls) { const o = h.userData.src; h.geometry = o.geometry; h.matrix.copy(o.matrixWorld); h.matrixWorld.copy(o.matrixWorld); h.visible = o.visible && (function v(n) { while (n) { if (!n.visible) return false; n = n.parent; } return true; })(o); } }
let dmg = null; const detached = [];
function applyDamage(st) {
  if (!dmg) dmg = createCarDamage(car, { interior: true, spec: SPEC_LADA, onDetach: (f) => detached.push(f.zone) });
  Object.assign(dmg.state, st); dmg.state.revision++; dmg.sync();
  return { stage: dmg.stage, amount: dmg.amount, detached: detached.slice() };
}
window.lab = {
  damage: applyDamage,
  spec: SPEC_LADA,
  pose(p) { car.set(Object.assign({ x: 0, y: 0.03, z: 0, yaw: 0, pitch: 0, roll: 0, steer: 0, steerAngle: 0, spin: 0, brake: 0, boost: 0, lights: night > 0, glow: 0, dt: 0.016, kmh: 0, rpm: 0.15, gear: 'N' }, p)); },
  view(v) {
    if (v.cockpit) {
      car.setView(true);
      car.root.updateMatrixWorld(true);
      camera.fov = SPEC_LADA.fovRest; camera.near = 0.12; camera.aspect = W / H; camera.updateProjectionMatrix();
      const e = SPEC_LADA.eye; camera.position.set(e.x, e.y, e.z + 0.0); camera.up.set(0, 1, 0);
      camera.rotation.order = 'YXZ'; camera.rotation.set(v.look[1], Math.PI + v.look[0], 0);
    } else {
      car.setView(false);
      camera.fov = v.fov; camera.near = 0.1; camera.aspect = W / H; camera.updateProjectionMatrix();
      camera.position.set(...v.p); camera.up.set(...(v.up || [0, 1, 0])); camera.lookAt(...v.t);
    }
    syncHulls();
    renderer.info.reset();
    for (const h of hulls) h.visible = h.visible && !v.cockpit;
    renderer.render(scene, camera);
    return { calls: renderer.info.render.calls, tris: renderer.info.render.triangles };
  },
  stats() {
    const out = { inside: {}, outside: {} };
    for (const inside of [false, true]) { car.setView(inside); const o = {}; let tris = 0, meshes = 0; car.root.traverse((m) => { if (m.isMesh) { let vis = true, n = m; while (n) { if (!n.visible) { vis = false; break; } n = n.parent; } if (vis && m.material.opacity !== 0 && !(m.material.name === 'drive-beam') && !(m.material.name === 'drive-flame')) { meshes++; const g = m.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; } } }); o.meshes = meshes; o.tris = Math.round(tris); (inside ? out.inside : out.outside).meshes = o.meshes; (inside ? out.inside : out.outside).tris = o.tris; }
    car.setView(false); return out;
  },
  setView: (v) => car.setView(v), car,
};
window.__ready = true;
</script>`;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/__lada_lab.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(PAGE); }
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--disable-extensions', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 120000 });
const logs = [];
try {
  const page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
    if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) return req.respond({ status: 200, contentType: 'text/css', body: '' });
    req.continue();
  });
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning' || t === 'warn') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/__lada_lab.html`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__ready === true', { timeout: 60000, polling: 100 });
  console.log('stats', JSON.stringify(await page.evaluate(() => window.lab.stats())));
  const pose = { brake: args.brake ? 1 : 0, kmh: Number(args.speed || 0), rpm: Math.min(1, Number(args.speed || 0) / 120 + 0.15), gear: args.speed ? '3' : 'N', steer: Number(args.steer || 0), steerAngle: Number(args.steer || 0) * 0.5 };
  if (args.dmg) { const st = {}; for (const kv of String(args.dmg).split(',')) { const [k, v] = kv.split('='); st[k] = Number(v); } console.log('damage', JSON.stringify(await page.evaluate((s) => window.lab.damage(s), st))); }
  for (const name of names) {
    const info = await page.evaluate((v, pose) => { window.lab.setView(!!v.cockpit); window.lab.pose(pose); window.lab.pose(pose); const r = window.lab.view(v); return r; }, VIEWS[name], pose);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.evaluate((v) => window.lab.view(v), VIEWS[name]);
    const file = path.resolve(root, `${out}_${name}.png`);
    await page.screenshot({ path: file });
    console.log(`saved ${path.relative(root, file)}`, JSON.stringify(info));
  }
  if (args.eval) console.log('eval:', JSON.stringify(await page.evaluate(args.eval)));
} catch (e) {
  console.log('SHOT FAILED:', e.message); process.exitCode = 1;
} finally {
  if (logs.length) { console.log('PAGE LOGS:'); for (const l of logs.slice(0, 40)) console.log(' ', l.slice(0, 500)); }
  await browser.close(); server.close();
}
