// landmarksYusupov-walk: headless walkability test of the Yusupov module (colliders of the module alone, no city): portico, courtyard gates, garden hill stairs, fences.
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
ctx.buildList = ['landmarksYusupov'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYusupov.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYusupov/frame.js')).href);
const ph = ctx.physics;
const walkW = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)'));
  return ok;
};
const ud = (u0, d0, u1, d1, label, open) => { const a = F.fromUD(u0, d0), b = F.fromUD(u1, d1); return walkW(a.x, a.z, b.x, b.z, label, open); };
let all = true;
// portico: columns at u = 35.25 + (-9.4 .. 9.4) mirrored, axis d = -2.7; the centre intercolumn (u 35.25) is open down to the wall (the palace wall at d = 0 blocks)
all &= ud(35.25, -9, 35.25, -0.9, 'portico: walk to the door through the centre intercolumn', true);
all &= ud(35.25, -0.9, 35.25, 2.0, 'portico: the door wall (d = 0) blocks', false);
all &= ud(29.3, -6, 29.3, -1.5, 'portico: a column (u 29.3) blocks the straight line', false);
all &= ud(31.0, -9, 31.0, -1.0, 'portico: the side intercolumn u 31 (between the columns 29.3 and 32.7) is open', true);
// courtyard: through the colonnade wall W1 (blocked), through its gate (open), through the SE gate block passage (open)
all &= ud(25, 45, 3, 45, 'courtyard wall W1 blocks (d 45)', false);
all &= ud(25, 61.8, -2, 61.8, 'courtyard wall gate (d 61.8) is open', true);
all &= ud(36.2, 70, 36.2, 112, 'SE gate block passage is open (u 36.2)', true);
all &= ud(36.2 - 7, 70, 36.2 - 7, 112, 'SE gate block pier blocks (u 29)', false);
// the palace walls
all &= ud(55, 20, 55, 45, 'east wing wall blocks the walk from the front block to the courtyard (u 55)', false);
// garden: paths open along the middle
const a = { x: -2925, z: 412 }, b = { x: -2916, z: 440 };
all &= walkW(a.x, a.z, b.x, b.z, 'garden: the path from the wall gate to the mound loop is open', true);
const m = ctx.services.landmarksYusupov.mound;
console.log('mound', JSON.stringify(m), 'top deck ground height', ph.groundHeight(m.x, m.z, 5));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
