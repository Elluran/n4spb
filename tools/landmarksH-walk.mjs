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
// ---- walkability test of landmarksH: the gate passage is open, the facade / pylons / basin / trees block
ctx.buildList = ['landmarksH'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksH.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksH/frame.js')).href);
const ph = ctx.physics;
const walk = (a0, b0, a1, b1, label, expectOpen) => {
  const [x0, z0] = F.W(a0, b0), [x1, z1] = F.W(a1, b1);
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)'));
  return ok;
};
let all = true;
all &= walk(0, -40, 0, 30, 'gate passage from the garden through the tower to the yard', true);
all &= walk(2.5, -40, 2.5, 30, 'passage, offset 2.5 m', true);
all &= walk(-9, -40, -9, 0, 'into the left pylon', false);
all &= walk(50, -40, 50, 5, 'into the garden facade', false);
all &= walk(149, -40, 149, -12, 'into the east portico base', false);
const fp = [-2334.8 + 20, -494.8]; { const p = { x: fp[0] + 10, z: fp[1] }; ph.resolve(p, 0.4, 0, 1.7); console.log('fountain ring free:', Math.hypot(p.x - fp[0] - 10, p.z - fp[1]) < 0.01); }
{ const pts = [[-2745.5 + 5, -444.2]]; const p = { x: pts[0][0], z: pts[0][1] }; ph.resolve(p, 0.4, 0, 1.7); console.log('horseman island pushes out:', Math.hypot(p.x - pts[0][0], p.z - pts[0][1]) > 0.5); }
console.log('trees', ctx.services.landmarksH.times, 'tris', ctx.services.landmarksH.triangles);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
