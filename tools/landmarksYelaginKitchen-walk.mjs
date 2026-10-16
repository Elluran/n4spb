// tools/landmarksYelaginKitchen-walk.mjs - headless walk probe of landmarksYelaginKitchen (no GPU, the module alone: ground = layout.js, colliders of the module): the lawn, the three steps and the stylobate of the south portico
// (0.5 m), the five steps and stylobate of the north portico (1.0 m); the drum wall, the north wall, the columns, the lamp posts and the fences block; the closed door cannot be entered.
// usage: node tools/landmarksYelaginKitchen-walk.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
ctx.buildList = ['landmarksYelaginKitchen'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginKitchen.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginKitchen/frame.js')).href);
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
const p = (u, w) => { const q = F.W(u, w); return [q.x, q.z]; };
const S = F.PS, N = F.PN;
// ---- south front
test('south: the lawn in front of the portico is open', [p(0, 60), p(0, 36)], true, 0);
test('south: up the three low steps onto the stylobate (0.5)', [p(0, 36), p(0, 30.5)], true, S.floor);
test('south: along the portico between the columns and the wall', [p(-7.5, 29.1), p(7.5, 29.1)], true, S.floor, S.floor);
test('south: the door is closed (the wall blocks)', [p(0, 30.5), p(0, 27)], false, null, S.floor);
test('south: a column blocks', [p(5.2, 34.5), p(5.2, 29.8)], false, null, S.floor);
test('south: walking between two columns onto the stylobate', [p(3.7, 34.5), p(3.7, 29.5)], true, S.floor);
test('south: the drum wall blocks (niche of Juno)', [p(0.0, 0.0), p(26, 17)], false, null, 0);
test('south: the arc wall blocks from outside (Latona niche)', [p(-33, 28), p(-18, 17)], false, null, 0);
test('south: the lawn along the arc is open', [p(-34, 24), p(-38, 12), p(-36, 4)], true, 0);
// ---- north front
test('north: the ground in front of the north portico is open', [p(0, -22), p(0, -6.5)], true, 0);
test('north: up the five steps onto the stylobate (1.0)', [p(0, -6.5), p(0, -1.5)], true, N.floor);
test('north: a column blocks', [p(5.2, -6), p(5.2, -1.8)], false, null, N.floor);
test('north: the wall behind blocks', [p(0, -1.2), p(0, 3)], false, null, N.floor);
test('north: the north wall blocks (beside the portico)', [p(18, -6), p(18, 3)], false, null, 0);
// ---- the closed yard is unreachable: the whole ring is walled; the east and west ends
test('ends: the east end of the drum is closed', [p(33, 2), p(25, 2)], false, null, 0);
{
  // the west fence w372618017 (running WSW from the drum corner) and its gate n11288670467 (-4671, -5303): the fence blocks, the gate passes
  const g = [-4671.0, -5303.2], t = [-0.861, -0.508], n = [0.508, -0.861], at = (k, m) => [g[0] + t[0] * k + n[0] * m, g[1] + t[1] * k + n[1] * m];
  test('fence: the west fence blocks', [at(6, -4), at(6, 4)], false, null, 0);
  test('fence: the west gate (open leaves) passes', [at(0, -4), at(0, 4)], true, 0);
}
// ---- small things
{ const q = F.W(0, 0); void q; }
console.log(all ? 'WALK OK' : 'WALK FAILED');
process.exit(all ? 0 : 1);
