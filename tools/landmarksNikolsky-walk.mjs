// tools/landmarksNikolsky-walk.mjs - headless walk probe of landmarksNikolsky (no GPU): the avenue and the OSM gates are open, the fence panels, the cathedral walls, the pedestals, the bell tower, the obelisk and
// the fountain rims block, the garden paths are open.   usage: node tools/landmarksNikolsky-walk.mjs
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
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {},
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
const { batchStatic } = await import(pathToFileURL(path.join(root, 'src/core/batch2.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);

const names = [];


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { console.log('audio createAudio() threw:', e.message); audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.buildList = process.argv.slice(2).filter(a => !a.startsWith('--'));      // lib/claims.js: landmark groups only count as owned when their module is checked together with city
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
// ---- walkability of landmarksNikolsky
ctx.buildList = ['landmarksNikolsky'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksNikolsky.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksNikolsky/frame.js')).href);
const ph = ctx.physics;
const walkW = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)'));
  return ok;
};
const uv = (u0, v0, u1, v1, label, open) => { const a = F.UV(u0, v0), b = F.UV(u1, v1); return walkW(a.x, a.z, b.x, b.z, label, open); };
let all = true;
all &= uv(-96, 0, -60, 0, 'from the bell tower door area to the avenue', true);
all &= uv(-90, 0, -35, 0, 'along the avenue to the forecourt of the cathedral', true);
all &= uv(-70, -4, -70, -10, 'through the pylon fence of the avenue (north side)', false);
all &= uv(-70, 2, -70, 8, 'through the pylon fence of the avenue (south side)', false);
all &= uv(-34, 0, -26, 0, 'up to the door steps (door area is solid: the door is closed)', true);
all &= uv(-34, -6, -20, -6, 'into the pedestal of the order (u -34 -> -20 at v -6)', false);
all &= uv(-60, 0, 60, 0, 'straight through the cathedral', false);
all &= uv(-95, 0, -104, 0, 'into the bell tower (through its door wall)', false);
all &= uv(8, -60, 8, -20, 'from outside through the north pylon fence (no gate at v 8)', false);
all &= uv(-1.5, -60, -1.5, -30, 'through the north gate opening (u -1.5)', true);
all &= uv(-30, 30, -30, 38, 'inside the enclosure belt walking (lawn)', true);
{ const g = [-2959.3, 1137.8]; all &= walkW(g[0] - 6, g[1] + 3.5, g[0] + 6, g[1] - 3.5, 'through the OSM gate at the tower end (-2959.3,1137.8)', true); }
{ const g = [-2877.1, 1145.5]; const a = { x: g[0] - 0.2, z: g[1] + 5 }, b = { x: g[0] + 0.0, z: g[1] - 5 }; all &= walkW(a.x, a.z, b.x, b.z, 'through the south-side OSM gate (-2877.1,1145.5)', true); }
all &= walkW(-2935.2 - 6, 1084.8, -2935.2, 1084.8, 'into the obelisk base', false);
all &= walkW(-2937, 1030, -2937, 1060, 'across the fountain basin at (-2944,1047)', false);
all &= walkW(-2970, 1100, -2982, 1100, 'through the garden west lattice fence (no gate there)', false);
const S = ctx.services.landmarksNikolsky;
console.log('cathedral heights', JSON.stringify(S.cathedral && S.cathedral.heights), 'tower', JSON.stringify(S.tower));
console.log('benches', S.benches && S.benches.length, 'lamps', S.lamps && S.lamps.length, 'trees', S.treeCount, 'tris', S.triangles, 'build ms', S.buildMs);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
