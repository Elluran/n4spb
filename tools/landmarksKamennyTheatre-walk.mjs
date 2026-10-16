// tools/landmarksKamennyTheatre-walk.mjs - headless walk probe of landmarksKamennyTheatre (no GPU, the module alone): the square, the five steps to the stylobate, the columns, the closed doors, the long walls and annexes,
// the rear landings, the kiosks, the dacha tower and the plot fence with the closed gate.
// usage: node tools/landmarksKamennyTheatre-walk.mjs
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
ctx.buildList = ['landmarksKamennyTheatre'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyTheatre.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyTheatre/frame.js')).href);
const FN = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyTheatre/fence.js')).href);
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
// ---- theatre
test('theatre: the square in front of the steps is open', [T(0, 46), T(0, 29)], true, 0);
test('theatre: up the five steps onto the stylobate (1.2)', [T(0, 29), T(0, 24)], true, 1.2);
test('theatre: along the stylobate behind the columns is open', [T(-9, 20.5), T(9, 20.5)], true, 1.2, 1.2);
test('theatre: the doors are closed: the front wall blocks', [T(0, 24), T(0, 16.5)], false, null, 1.2);
test('theatre: a column blocks', [T(-F.COLS.axis + F.COLS.step * 2, 26), T(-F.COLS.axis + F.COLS.step * 2, 22)], false, null, 1.2);
test('theatre: the stylobate edge blocks from the side (1.2 m)', [T(16, 21), T(8, 21)], false);
test('theatre: the NNE long wall blocks (plain bay)', [T(-16, 15), T(-8, 15)], false);
test('theatre: the NNE annex blocks', [T(-17, 0), T(-9, 0)], false);
test('theatre: the SSW annex blocks', [T(17, 0), T(9, 0)], false);
test('theatre: along the NNE wall outside the annex is open', [T(-18, 36), T(-18, -36)], true, 0);
test('theatre: along the SSW wall outside the annex is open', [T(18, 36), T(18, -36)], true, 0);
test('theatre: the rear wall blocks', [T(0, -33), T(0, -24)], false);
test('theatre: the rear landing blocks', [T(8, -30), T(8, -23.5)], false);
test('theatre: a ventilation kiosk blocks', [T(-5.3, 35), T(-5.3, 28)], false);
test('theatre: the poster kiosk blocks', [T(12.2, 36), T(12.2, 28)], false);
test('theatre: round the back is open', [T(-20, 20), T(-20, -34), T(20, -34), T(20, 20)], true, 0);
// ---- Kleinmichel dacha and its fence
test('dacha: the tower blocks', [K(0.2, 20), K(0.2, 14)], false);
test('dacha: the east house blocks', [K(32, 6), K(24, 6)], false);
const fg = FN.gateAt();
if (fg) { const ux = Math.cos(fg.rot), uz = -Math.sin(fg.rot); const nx = -uz, nz = ux; const c = fg.p; test('fence: the closed gate blocks', [[c[0] + nx * 3, c[1] + nz * 3], [c[0] - nx * 3, c[1] - nz * 3]], false); test('fence: a run beside the gate blocks', [[c[0] + ux * 8 + nx * 3, c[1] + uz * 8 + nz * 3], [c[0] + ux * 8 - nx * 3, c[1] + uz * 8 - nz * 3]], false); }
const S = ctx.services.landmarksKamennyTheatre;
console.log('monuments', S.monuments.length, 'entrances', S.entrances.length, 'photoSpots', S.photoSpots.length, 'plaques', S.plaques.length, 'tris', Math.round(S.triangles), 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
