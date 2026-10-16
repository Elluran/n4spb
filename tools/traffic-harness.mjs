// Shared headless harness of the traffic / props tools (no GPU): DOM stubs + a built world.
//   import { world } from './traffic-harness.mjs';
//   const { ctx, L, THREE, root, frame } = await world(['environment', 'streets', 'bridges', 'traffic']);
// world(list, { camera: [x, z] }) builds the listed modules in the order of src/main.js MODULES (ctx.buildList = the list, as on the page with ?only=), frame(t, x, z) puts the camera at
// (x, 1.7, z) and runs every ctx update once at simulation time t (the regional traffic simulation follows the camera).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
function stubs() {
  if (globalThis.__trafficStubs) return; globalThis.__trafficStubs = true;
  globalThis.window = globalThis; globalThis.self = globalThis;
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
}
export const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);

/** the build order of the page (src/main.js MODULES) without importing main.js (it needs a real DOM) */
export async function pageModules() {
  const fs = await import('node:fs');
  const src = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8'), m = /export const MODULES = \[([\s\S]*?)\n\];/.exec(src);
  return m ? [...m[1].matchAll(/^\s*'([A-Za-z0-9_]+)'/gm)].map((q) => q[1]) : [];
}

export async function world(list, o = {}) {
  stubs();
  const THREE = await import('three');
  const { createContext } = await imp('src/core/ctx.js');
  const L = await imp('src/world/layout.js');
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
  const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
  const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1, lod: 1, cull: 1 };
  const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir });
  const order = await pageModules();
  const want = order.filter((m) => list.includes(m)).concat(list.filter((m) => !order.includes(m)));
  ctx.buildList = want.slice();
  ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
  if (o.camera) { camera.position.set(o.camera[0], 1.7, o.camera[1]); camera.updateMatrixWorld(); if (ctx.player && ctx.player.position) ctx.player.position.set(o.camera[0], 0, o.camera[1]); }
  const ms = {};
  for (const m of want) {
    const t0 = Date.now(), mod = await imp(`src/world/${m}.js`);
    try { await mod.build(ctx); } catch (e) { console.error(`[harness] ${m} failed:`, e && e.stack || e); if (!o.tolerant) throw e; }
    ms[m] = Date.now() - t0;
  }
  const frame = (t, x, z, dt = 0) => {
    if (x !== undefined) { camera.position.set(x, 1.7, z); camera.updateMatrixWorld(); if (ctx.player && ctx.player.position && ctx.player.position.set) ctx.player.position.set(x, 0, z); }
    for (const u of ctx._updates || []) u(dt, t);
  };
  return { ctx, L, THREE, root, frame, ms, camera };
}
export const args = process.argv.slice(2);
export const flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
