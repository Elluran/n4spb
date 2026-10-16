// tools/landmarksKamennyDachasEast-walk.mjs - headless walk probe of landmarksKamennyDachasEast (no GPU, the module alone): the sphinx pier flight and landing, the cheek walls, pedestals and edge of the landing, the dacha
// with its porticoes and vestibule, the wing and the plot fences.
// usage: node tools/landmarksKamennyDachasEast-walk.mjs
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

const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksKamennyDachasEast'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyDachasEast.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyDachasEast/frame.js')).href);
const FN = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyDachasEast/fence.js')).href);
const ph = ctx.physics;
const walk = (pts, y0 = 0) => {
  const p = { x: pts[0][0], z: pts[0][1] }; let y = y0;
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
    for (let i = 1; i <= n; i++) {
      const t = i / n, tx = a[0] + (b[0] - a[0]) * t, tz = a[1] + (b[1] - a[1]) * t; p.x = tx; p.z = tz;
      ph.resolve(p, 0.35, y, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) return { stuck: true, y, at: [tx, tz] };
      const g = ph.groundHeight(p.x, p.z, y, false); if (Number.isFinite(g)) y = g;
    }
  }
  return { stuck: false, y };
};
let all = true;
const test = (label, pts, open, yEnd, y0 = 0) => {
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.1)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const T = (mx, mz) => { const q = F.T.W(mx, mz); return [q.x, q.z]; };
const K = (mx, mz) => { const q = F.K.W(mx, mz); return [q.x, q.z]; };
const P = (fr, mx, mz) => { const q = fr.W(mx, mz); return [q.x, q.z]; };
// ---- the sphinx pier (frame PR: +z into the river, the flight from y 0 to -3.1)
test('pier: down the flight onto the landing (y -3.1)', [P(F.PR, 0, -3), P(F.PR, 0, 8.7)], true, -3.1, 0);
test('pier: back up the flight to the lawn', [P(F.PR, 0, 8.7), P(F.PR, 0, -3)], true, 0, -3.1);
test('pier: the left cheek wall blocks (from the lawn side)', [P(F.PR, -2.6, 3), P(F.PR, -4.0, 3)], false, null, -1.0);
test('pier: the right cheek wall blocks from the flight', [P(F.PR, 2.6, 5), P(F.PR, 4.0, 5)], false, null, -1.6);
test('pier: a pedestal blocks from the landing', [P(F.PR, 2.0, 8.6), P(F.PR, 4.4, 7.5)], false, null, -3.1);
test('pier: the front edge of the landing blocks', [P(F.PR, 0, 8.7), P(F.PR, 0, 11.5)], false, null, -3.1);
test('pier: along the landing edge is closed at the sides', [P(F.PR, 0, 9.0), P(F.PR, 7.5, 9.0)], false, null, -3.1);
// ---- the dacha and the wing
test('dacha: the south portico blocks', [P(F.D, 0, 24), P(F.D, 0, 12)], false);
test('dacha: the east portico blocks', [P(F.D, 24, 0), P(F.D, 12, 0)], false);
test('dacha: the north vestibule blocks', [P(F.D, 0, -24), P(F.D, 0, -12)], false);
test('wing: the long east wall blocks', [P(F.WG, 14, 2), P(F.WG, 5, 2)], false);
test('wing: the end wall blocks', [P(F.WG, 0, 20), P(F.WG, 0, 9)], false);
test('wing: round the wing is open', [P(F.WG, 10, 16), P(F.WG, 10, -16), P(F.WG, -10, -16), P(F.WG, -10, 16)], true, 0);
// ---- the plot fences
{ const a = FN.RIVER[4], b = FN.RIVER[5], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
  test('fence: the river front blocks', [[mx + nx * 4, mz + nz * 4], [mx - nx * 4, mz - nz * 4]], false); }
{ const a = FN.NORTH[1], b = FN.NORTH[2], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l;
  test('fence: the north side blocks', [[mx + nx * 4, mz + nz * 4], [mx - nx * 4, mz - nz * 4]], false); }
const S = ctx.services.landmarksKamennyDachasEast;
console.log('monuments', S.monuments.length, 'photoSpots', S.photoSpots.length, 'tris', Math.round(S.triangles), 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
