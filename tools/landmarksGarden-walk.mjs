// tools/landmarksGarden-walk.mjs - headless walk probe of the Summer Garden (landmarksGarden): the three Neva gates, the Moika entrance and the alleys are open, the fences, hedges, statues, fountains and trees block.
// usage: node tools/landmarksGarden-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks straight lines through ph.resolve like the player)
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

ctx.buildList = ['landmarksGarden'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksGarden.js')).href);
await mod.build(ctx);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const FR = await import(pathToFileURL(path.join(root, 'src/world/landmarksGarden/frame.js')).href);
const ph = ctx.physics;
const walk = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ')' : ' (open)'));
  return ok;
};
let all = true;
const N = [0.4153, 0.9097];                                                       // fence normal toward the garden
const through = (cx, cz, label, open, half = 7) => walk(cx - N[0] * half, cz - N[1] * half, cx + N[0] * half, cz + N[1] * half, label, open);
all &= through(-967.7, -1639.2, 'Neva central gate', true);
all &= through(-1010, -1620, 'Neva west small gate', true);
all &= through(-925, -1658, 'Neva east small gate', true);
for (const k of [3, 11, 19, 27, 33]) { const a = FR.NEVA_COLS[k], b = FR.NEVA_COLS[k + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2; all &= through(mx, mz, 'Neva fence span ' + k + ' blocks', false, 4); }
// the alley from the central gate south along the main axis (skirting the first fountain), then the Main alley polyline
{ const pts = D.ROADS.find((r) => r.id === 'w159079282').pts; for (let i = 0; i + 3 < pts.length; i += 2) all &= walk(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], 'Main alley leg ' + (i / 2), true); }
all &= walk(-967.7 + 0.3325 * -6, -1639.2 + 0.9432 * -6, -967.7 + 0.3325 * 30, -1639.2 + 0.9432 * 30, 'from the Neva pavement through the central gate along the axis to s=30', true);
// Moika: the main entrance is open, the fence elsewhere blocks
all &= walk(-803, -1038, -817, -1056, 'Moika entrance (between the eagle columns)', true);
all &= walk(-780, -1062, -790, -1080, 'Moika fence blocks', false);
// statues / pedestals / fountains / hedges / Krylov
all &= walk(-947, -1580, -937, -1561, 'into the pedestal of the Architecture statue (s 82 q 3.6)', false);
all &= walk(-920, -1537, -909, -1537, 'into the Krylov railing', false);
all &= walk(-945, -1585, -925.3, -1582.7, 'into the Menagerie pond rail', false);
{ const pts = D.BARRIERS.find((b) => b.id === 'w592178586').pts; all &= walk(pts[0] + 6, pts[1], pts[0] - 6, pts[1], 'through a bosquet hedge', false); void pts; }
console.log('statues', ctx.services.landmarksGarden.statues.length, 'entrances', ctx.services.landmarksGarden.entrances.map((e) => e.id).join(','), 'tris', ctx.services.landmarksGarden.triangles);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
