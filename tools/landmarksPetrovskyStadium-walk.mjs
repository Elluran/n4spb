// tools/landmarksPetrovskyStadium-walk.mjs - headless walk probe of landmarksPetrovskyStadium (no GPU, the module alone): the player (radius 0.35) walks polylines in 0.1 m steps through physics.resolve + groundHeight: open apron, the closed colonnade line, the tower legs, the buildings.  ok = as expected, FAIL otherwise.   usage: node tools/landmarksPetrovskyStadium-walk.mjs
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
ctx.buildList = ['landmarksPetrovskyStadium'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyStadium.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyStadium/frame.js')).href);
const B = F.bowl(), ph = ctx.physics;
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
const test = (label, pts, open) => {
  const r = walk(pts), ok = open ? !r.stuck : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const at = (k, s) => { const p = B.at(k, s, 0); return [p[0], p[2]]; };
// ---- the apron round the bowl: walk the whole circuit 6 m outside the column line (lamp posts and masts are stepped round by the probe: it samples 1 m wide gaps)
for (const k of [8, 15, 30, 45, 60, 75]) test('apron: from 14 m to 3 m outside the column line at station ' + k, [at(k, -14), at(k, -3)], true);
for (const k of [0, 23, 46, 69]) test('the colonnade line blocks at station ' + k + ' (the stadium is closed)', [at(k, -3), at(k, 3)], false);
// ---- the towers: the legs are solid, the gap between them is open
for (const [x, z] of F.MASTS) {
  const dx = B.c[0] - x, dz = B.c[1] - z, l = Math.hypot(dx, dz), ax = dz / l, az = -dx / l;
  test('tower ' + x + ': the leg blocks (walking at it from the bowl side)', [[x + ax * 5.7 + dx / l * 6, z + az * 5.7 + dz / l * 6], [x + ax * 5.7, z + az * 5.7]], false);
  test('tower ' + x + ': the way between the legs is open', [[x + dx / l * 8, z + dz / l * 8], [x, z]], true);
}
// ---- the buildings
test('the ticket office blocks', [[-3678, -2330], [-3657, -2331]], false);
test('the boiler house blocks', [[-3740, -2385], [-3710, -2380]], false);
test('the chimney blocks', [[-3705, -2390], [-3705, -2380]], false);
const r = ctx.services.landmarksPetrovskyStadium;
console.log('module: ' + r.triangles + ' triangles, build ' + r.buildMs + ' ms, lamps ' + r.lamps.length + (r.failed.length ? ', FAILED ' + r.failed.join('; ') : ''));
console.log(all ? 'ALL OK' : 'SOME FAILED');
process.exit(all ? 0 : 1);
