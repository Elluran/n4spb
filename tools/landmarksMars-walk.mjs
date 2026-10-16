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
// ---- walkability test of landmarksMars (headless): the Field alleys / lawns are open, the memorial openings are open, its walls, the burner, the monument, the palace and the barracks block
ctx.buildList = ['landmarksMars'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksMars.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMars/frame.js')).href);
const ph = ctx.physics;
const walkW = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)'));
  return ok;
};
const uv = (u0, v0, u1, v1, label, open) => { const a = F.fromUV(u0, v0), b = F.fromUV(u1, v1); return walkW(a.x, a.z, b.x, b.z, label, open); };
let all = true;
all &= uv(170, 7, -50, 0, 'the whole south alley and the plaza up to the north edge of the plaza (u 170 -> -50)', true);
all &= uv(-60, 0, 60, 0, 'north opening of the memorial to the south opening (through the platform line, the burner at the centre)', false);
all &= uv(-60, 1.9, 60, 1.9, 'north to south through the openings, offset 1.9 m (the approach strips)', true);
all &= uv(0, -60, 0, 60, 'west opening to the east opening, centre line (burner)', false);
all &= uv(1.9, -60, 1.9, 60, 'west to east through the openings offset 1.9 m', true);
all &= uv(15, 12, 32, 12, 'into the wall arm from the court (u 15 -> 32 at v 12)', false);
all &= uv(-12, -15, -12, -35, 'into the wall arm from the court on the north side', false);
all &= uv(-282 + 8, -10, -282 + 8, -10 + 0.01, 'stand beside the Suvorov monument', true);
{ const c = F.fromUV(-282, -10); all &= walkW(c.x - 8, c.z, c.x, c.z, 'into the Suvorov pedestal', false); all &= walkW(c.x - 8, c.z - 1, c.x - 8, c.z + 9, 'walk beside the island hedge', true); }
all &= walkW(-1160, -1450, -1200, -1480, 'across the Millionnaya promenade toward Suvorov Square (open ground)', true);
all &= walkW(-1180, -1290, -1275, -1290, 'into the barracks front from the lime row (z -1290)', false);
all &= walkW(-1330, -1425, -1385, -1425, 'from the palace forecourt into the palace', false);
all &= walkW(-1300, -1436, -1330, -1436, 'inside the forecourt toward the Alexander monument (open until the pedestal)', true);
{ const p = { x: -1332.4, z: -1444.6 }; ph.resolve(p, 0.4, 0, 1.7); console.log('Alexander III pedestal pushes out:', Math.hypot(p.x + 1332.4, p.z + 1444.6) > 0.5); }
const S = ctx.services.landmarksMars;
console.log('benches', S.benches.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
