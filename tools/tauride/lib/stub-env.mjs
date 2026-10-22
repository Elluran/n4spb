// A headless engine for the CPU tools of the Tauride work: the DOM stubs of tools/check.mjs / views-check.mjs, a context (src/core/ctx.js), module building and the REAL Player and Physics.
// `root` is a repository root: this repository (the default; run it as the North: the import-map hooks are registered by lib/common.mjs enterNorth) or the source repository (PITER_SRC, read-only:
// its three.js, its core and its modules are imported from there and nothing is written). No GPU, no browser.
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './common.mjs';

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
let stubbed = false;
/** the browser globals the engine modules touch while they build (idempotent) */
export function installStubs() {
  if (stubbed) return; stubbed = true;
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
  globalThis.performance = globalThis.performance || { now: () => Date.now() };
}

/** the root to use: PITER_SRC (the source repository) when `source` is true, else this repository */
export function engineRoot(source = false) {
  if (!source) return ROOT;
  const r = process.env.PITER_SRC;
  if (!r) throw new Error('PITER_SRC is not set (the source repository, e.g. D:/git2/agi-fun-tests/102_3d_piter)');
  return path.resolve(r);
}
const imp = (root, rel) => import(pathToFileURL(path.join(root, rel)).href);

/**
 * The engine pieces of a root: { root, THREE, Physics, Player, L (layout.js), createContext, createAudio }. THREE comes from the root's own node_modules, so the source repository's modules and
 * its three.js stay together (two copies of three in one process would break instanceof checks).
 */
export async function loadEngine(root = ROOT) {
  installStubs();
  const THREE = await imp(root, 'node_modules/three/build/three.module.js');
  const [{ Physics, STEP_HEIGHT }, { Player }, L, { createContext }] = await Promise.all([imp(root, 'src/core/physics.js'), imp(root, 'src/core/player.js'), imp(root, 'src/world/layout.js'), imp(root, 'src/core/ctx.js')]);
  return { root, THREE, Physics, STEP_HEIGHT, Player, L, createContext };
}

/** a context like check.mjs makes (medium quality, no renderer, no audio) with `buildList` set so the landmark claims count */
export function makeContext(engine, buildList = []) {
  const { THREE, L, createContext } = engine;
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500); camera.position.set(0, 1.6, 30);
  const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
  const quality = { name: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 70, petals: 0.6 };
  const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir });
  ctx.buildList = buildList.slice();
  ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
  return { ctx, camera, scene };
}
/** build the named modules (src/world/<name>.js) into the context, in order */
export async function buildModules(engine, ctx, names) {
  for (const n of names) { const mod = await imp(engine.root, `src/world/${n}.js`); await mod.build(ctx); }
}
/** a Player on a Physics: walks with the real step / drop / collision rules */
export function makePlayer(engine, camera, physics, bounds) {
  const p = new engine.Player(camera, { addEventListener() {} }, physics, bounds);
  p.enabled = true;
  return p;
}
/** walk the player towards (tx, tz) with W for up to `ticks` 60 Hz steps; returns the distance walked */
export function walkToward(p, tx, tz, ticks, trace = null, every = 60) {
  let moved = 0;
  for (let t = 0; t < ticks; t++) {
    const ex = tx - p.pos.x, ez = tz - p.pos.z; if (Math.hypot(ex, ez) < 0.09) break;
    const bx = p.pos.x, bz = p.pos.z;
    p.yaw = Math.atan2(-ex, -ez); p.keys.add('KeyW'); p.update(1 / 60);
    moved += Math.hypot(p.pos.x - bx, p.pos.z - bz);
    if (trace && t % every === 0) trace.push([+p.pos.x.toFixed(1), +p.pos.z.toFixed(1), +p.pos.y.toFixed(2)]);
  }
  p.keys.delete('KeyW');
  return moved;
}
/** walk a fixed time in a fixed direction (the shore probes): yaw 0 = north, direction (dx, dz) */
export function walkDir(p, dx, dz, ticks, trace = null, every = 60) {
  let moved = 0;
  for (let t = 0; t < ticks; t++) {
    const bx = p.pos.x, bz = p.pos.z;
    p.yaw = Math.atan2(-dx, -dz); p.keys.add('KeyW'); p.update(1 / 60);
    moved += Math.hypot(p.pos.x - bx, p.pos.z - bz);
    if (trace && t % every === 0) trace.push([+p.pos.x.toFixed(1), +p.pos.z.toFixed(1), +p.pos.y.toFixed(2)]);
  }
  p.keys.delete('KeyW');
  return moved;
}
