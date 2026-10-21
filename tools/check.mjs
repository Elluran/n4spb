// Headless (node) build check for world modules — no GPU needed.
// usage: node tools/check.mjs <module> [more modules...]   e.g. node tools/check.mjs railway
// Builds the module(s) with a stubbed DOM, runs update() for a while, and prints a report:
// errors, triangles, meshes, materials, textures, colliders, bounds, and warnings.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- DOM stubs
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createConicGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  isPointInPath() { return false; }
  getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
  getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); }
  toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
}
globalThis.window = globalThis;
globalThis.self = globalThis;
const stubEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], textContent: '', innerHTML: '', addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, querySelector: () => stubEl(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), setPointerCapture() {}, remove() {}, width: 1, height: 1, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }) });          // generic DOM node (the drive HUD builds a small DOM tree)
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : stubEl()),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {},
};
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });
globalThis.performance = globalThis.performance || { now: () => Date.now() };

// ---------------------------------------------------------------- run
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { createAudio } = await import(pathToFileURL(path.join(root, 'src/core/audio.js')).href);
const { createKnock } = await import(pathToFileURL(path.join(root, 'src/core/knock.js')).href);
const { batchStatic } = await import(pathToFileURL(path.join(root, 'src/core/batch2.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);

// --area-modules: check every module of the area's page (the MODULES list of AREA = the area tools/area.mjs runs as; default the strip), in build order, e.g.
//   node tools/area.mjs north tools/check.mjs --area-modules          (npm run check:north)       --skip a,b leaves modules out
const argvRest = process.argv.slice(2), skipFlag = argvRest.indexOf('--skip'), skip = new Set(skipFlag >= 0 ? String(argvRest[skipFlag + 1] || '').split(',') : []);
let names = argvRest.filter((a, i) => !a.startsWith('--') && argvRest[i - 1] !== '--skip');
if (argvRest.includes('--area-modules')) names = [...new Set([...(await import('./modules-list.mjs')).mainModules(), ...names])].filter((n) => !skip.has(n));
if (!names.length) { console.log('usage: node tools/check.mjs <module> [...] | --area-modules [--skip a,b]   (other areas: node tools/area.mjs <id> tools/check.mjs ...)'); process.exit(1); }

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { console.log('audio createAudio() threw:', e.message); audio = null; }
const quality = { name: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 70, petals: 0.6 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.buildList = names;      // lib/claims.js: landmark groups only count as owned when their module is checked together with city
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.knock = createKnock(ctx);      // the knockable street furniture register during the module build, as in main.js

function triCount(o) {
  const g = o.geometry; if (!g || !g.attributes.position) return 0;
  const n = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  return n * (o.isInstancedMesh ? o.count : 1);
}
function snapshot() {
  const set = new Set(); scene.traverse(o => set.add(o)); return set;
}
const warnings = [];
let failed = false;
// A module that catches a failing sub-part logs '[module] part failed ...' and goes on: the page then shows a scene with a hole. The check must not print OK for that.
const caught = [];
for (const k of ['error', 'warn']) { const orig = console[k].bind(console); console[k] = (...args) => { const line = args.map((x) => (x && x.stack) || String(x)).join(' '); if (/failed|is not a function|is not defined|Cannot read/.test(line) && !line.startsWith('[textures]')) caught.push(line.split(String.fromCharCode(10))[0].slice(0, 220)); orig(...args); }; }
const BUDGET = { environment: 500e3, streets: 500e3, city: 600e3, landmarksA: 400e3, landmarksB: 500e3, landmarksC: 500e3, landmarksD: 300e3, traffic: 400e3, props: 300e3, people: 200e3, wildlife: 100e3 };

for (const name of names) {
  const before = snapshot();
  const colBefore = ctx.physics.count, wiresBefore = ctx.wires.count, texBefore = ctx.tex.pixels, updBefore = ctx._updates.length;
  const t0 = Date.now();
  let err = null;
  try {
    const mod = await import(pathToFileURL(path.join(root, `src/world/${name}.js`)).href);
    if (typeof mod.build !== 'function') throw new Error('no exported build(ctx)');
    await mod.build(ctx);
  } catch (e) { err = e; failed = true; }
  const ms = Date.now() - t0;
  if (name === 'city' && ctx.physics.items.slice(colBefore).some((c) => c.source && c.source.knock)) { failed = true; console.log('KNOCK ERROR: a collider of the city module is registered as knockable (baked colliders are plain data: never register anything built by city/*)'); }
  scene.updateMatrixWorld(true);
  const added = []; scene.traverse(o => { if (!before.has(o)) added.push(o); });
  let tris = 0, meshes = 0, inst = 0, instances = 0, nan = 0;
  const mats = new Set(), matTypes = {}, box = new THREE.Box3(), tb = new THREE.Box3();
  const nonToon = new Set();
  for (const o of added) {
    if (!o.isMesh && !o.isLine && !o.isPoints) continue;
    meshes++; if (o.isInstancedMesh) { inst++; instances += o.count; }
    tris += triCount(o);
    const ms_ = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of ms_) { if (!m) continue; mats.add(m); matTypes[m.type] = (matTypes[m.type] || 0) + 1; if (m.type === 'MeshStandardMaterial' || m.type === 'MeshPhysicalMaterial' || m.type === 'MeshLambertMaterial' || m.type === 'MeshPhongMaterial') nonToon.add(m.type); }
    const g = o.geometry;
    if (g && g.attributes.position) {
      const a = g.attributes.position.array;
      for (let i = 0; i < a.length; i += 97) if (!Number.isFinite(a[i])) { nan++; break; }
      if (!o.isInstancedMesh && o.name !== 'wires') { if (!g.boundingBox) g.computeBoundingBox(); if (!g.boundingBox.isEmpty() && Number.isFinite(g.boundingBox.min.x)) { tb.copy(g.boundingBox).applyMatrix4(o.matrixWorld); box.union(tb); } }
    }
    if (!Number.isFinite(o.matrixWorld.elements[12]) || !Number.isFinite(o.matrixWorld.elements[13])) nan++;
  }
  // update loop
  let updErr = null;
  const upd = ctx._updates.slice(updBefore);
  try {
    let t = 0; const dt = 1 / 30;
    for (let i = 0; i < 900; i++) { ctx.time = t; ctx.shared.uTime.value = t; for (const f of upd) f(dt, t); t += dt; }
    for (const T of [60, 90, 120, 180, 300]) { ctx.time = T; for (const f of upd) f(0, T); }
  } catch (e) { updErr = e; failed = true; }
  const report = {
    module: name, ok: !err && !updErr, buildMs: ms,
    triangles: Math.round(tris), budget: BUDGET[name] || null, meshes, instancedMeshes: inst, instances,
    materials: mats.size, materialTypes: matTypes,
    canvasPixels: ctx.tex.pixels - texBefore, colliders: ctx.physics.count - colBefore, wires: ctx.wires.count - wiresBefore,
    updateFns: upd.length, services: Object.keys(ctx.services),
    bounds: box.isEmpty() ? null : { min: [box.min.x, box.min.y, box.min.z].map(v => +v.toFixed(1)), max: [box.max.x, box.max.y, box.max.z].map(v => +v.toFixed(1)) },
  };
  if (nan) warnings.push(`${name}: ${nan} object(s) with NaN/Infinity positions`);
  if (nonToon.size) warnings.push(`${name}: non-toon lit materials used (${[...nonToon].join(', ')}) — use ctx.mat.toon()/emissive()/glass()`);
  if (report.budget && tris > report.budget) warnings.push(`${name}: ${Math.round(tris)} triangles exceeds budget ${report.budget}`);
  if (report.canvasPixels > 24e6) warnings.push(`${name}: canvas textures use ${(report.canvasPixels / 1e6).toFixed(1)}M px (> 24M)`);
  console.log(JSON.stringify(report, null, 1));
  if (err) console.log(`BUILD ERROR in ${name}:\n${err.stack || err}`);
  if (updErr) console.log(`UPDATE ERROR in ${name}:\n${updErr.stack || updErr}`);
}
// knock census: every registered record that has colliders must still own them in ctx.physics (nothing was lost or double-registered), none in the city slice (checked above)
{
  const ks = ctx.knock.stats, owners = new Set(); for (const c of ctx.physics.items) if (c.source && c.source.knock) owners.add(c.source.knock);
  const withItems = ctx.knock.list.filter((r) => r.items.length).length;
  console.log(`knock: registered ${ks.registered} by kind ${JSON.stringify(ks.byKind)}`);
  if (owners.size !== withItems) { failed = true; console.log(`KNOCK ERROR: ${withItems} records own colliders but ${owners.size} records are found on ctx.physics.items`); }
}
// batching sanity
try { const b = batchStatic(ctx.staticRoot, { mat: ctx.mat }); console.log('batch:', JSON.stringify(b)); } catch (e) { failed = true; console.log('BATCH ERROR:\n' + (e.stack || e)); }
try { if (ctx.wires.count) ctx.wires.build(); } catch (e) { failed = true; console.log('WIRES ERROR:\n' + (e.stack || e)); }
if (ctx.tex.collisions && ctx.tex.collisions.length) warnings.push('texture keys drawn by two different painters (the second module gets the first texture; use a unique key prefix): ' + ctx.tex.collisions.slice(0, 12).join(', ') + (ctx.tex.collisions.length > 12 ? ' ... ' + ctx.tex.collisions.length + ' keys' : ''));
for (const w of warnings) console.log('WARNING:', w);
if (caught.length) { failed = true; console.log('CAUGHT SUB-BUILD ERRORS (' + caught.length + '): a module logged a failure and went on:'); for (const c of caught.slice(0, 12)) console.log('  ' + c); }
console.log(failed ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(failed ? 1 : 0);
