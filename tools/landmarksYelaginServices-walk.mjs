// tools/landmarksYelaginServices-walk.mjs - headless walk probe of landmarksYelaginServices (no GPU, the module alone): the Stable forecourt, the central gate between the columns, the front court, the arch passage, the round court, the raised side bays; walls, columns, fences, the bronzes, the Orangery and the service houses block.
// usage: node tools/landmarksYelaginServices-walk.mjs
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
ctx.buildList = ['landmarksYelaginServices'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginServices.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginServices/frame.js')).href);
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
const s = (x, z) => { const q = F.toWorld(F.ST, x, z); return [q.x, q.z]; };
const o = (x, z) => { const q = F.toWorld(F.OR, x, z); return [q.x, q.z]; };

// ---- the Stable
test('stable: the forecourt in front of the colonnade is open', [s(0, 40), s(0, 12)], true, 0);
test('stable: through the central gate between the columns into the front court', [s(0, 12), s(0, 6), s(0, -1), s(0, -15)], true, 0);
test('stable: a front column blocks', [s(5.7, 12), s(5.7, 6)], false);
test('stable: the iron fence between the front columns blocks', [s(6.65, 12), s(6.65, 5)], false);
test('stable: the fence end beside the pavilion blocks', [s(10.1, 12), s(10.1, 5)], false);
test('stable: the east pavilion blocks', [s(16, 14), s(16, 5)], false);
test('stable: the west pavilion blocks', [s(-16, 14), s(-16, 5)], false);
test('stable: the west wing blocks (from the court)', [s(-5, -12), s(-14, -12)], false);
test('stable: the east wing outer side blocks', [s(26, -12), s(19, -12)], false);
test('stable: through the arch passage into the round court', [s(0.3, -17), s(0.3, -26), s(0.3, -33)], true, 0);
test('stable: the cross wall blocks beside the arch', [s(-6, -18), s(-6, -28)], false);
test('stable: walk round the round court', [s(0.3, -33), s(6, -38), s(-6, -38), s(0, -42)], true, 0);
test('stable: the round court wall blocks (west)', [s(-8, -36), s(-16, -36)], false);
test('stable: the north block blocks', [s(0, -75), s(0, -62)], false);
test('stable: the Discobolus blocks', [[-4826.5, -5329], [-4821, -5329]], false);
test('stable: the Discus-thrower blocks', [[-4825, -5320], [-4825, -5326]], false);
test('stable: the back ledge (0.45) is reachable from the front court', [s(5, -3), s(5, 1.0)], true, 0.45);
test('stable: into the aisle between the ledges (0.06) from the central passage', [s(0, 9), s(0, 4.1), s(5, 4.1), s(-8, 4.1)], true, 0);
test('stable: up the three granite steps to the west door of the aisle', [s(-8, 4.1), s(-10.3, 4.1)], true, 0.45);
test('stable: up the three granite steps to the east door of the aisle', [s(8, 4.1), s(10.3, 4.1)], true, 0.45);
test('stable: the aisle is blocked at the door wall', [s(10.3, 4.1), s(11.2, 4.1)], false);
test('stable: a lantern post in the front court blocks', [s(3.6, -16), s(3.6, -22)], false);
// ---- the Orangery
test('orangery: the forecourt is open', [o(0, 40), o(0, 8)], true, 0);
test('orangery: the central pavilion blocks (glass bay 2)', [o(-2.5, 8), o(-2.5, 0)], false);
test('orangery: up the museum steps to the landing', [o(2.5, 8), o(2.5, 3.6)], true, null);
test('orangery: the west gallery blocks', [o(-30, 8), o(-30, 0)], false);
test('orangery: the low wall in front of the east gallery blocks', [o(30, 8), o(30, 3)], false);
test('orangery: the west end pavilion blocks', [o(-54, 10), o(-54, 0)], false);
test('orangery: the vase beside the west entrance blocks', [o(-57, 8), o(-57, 4.3)], false);
// ---- the houses
const h = (fr, x, z) => { const q = F.toWorld(fr, x, z); return [q.x, q.z]; };
const SR = F.frameFacing(-4907, -5335, 0.344, -0.939), FRL = F.frameFacing(-4955, -5337, -0.35, 0.937), CV = F.frameFacing(-4902.65, -5380, 0, -1), WS = F.frameFacing(-4885, -5348, 0, 1);
test('storerooms: blocked from the front', [h(SR, -8, 12), h(SR, -8, 0)], false);
test('storerooms: the front is open up to the wall', [h(SR, -8, 15), h(SR, -8, 6)], true, 0);
test('fraulein: blocked from the front', [h(FRL, 9, 24), h(FRL, 9, 10)], false);
test('fraulein: the yard between the wings is open', [h(FRL, 0, 20), h(FRL, 0, 13)], true, 0);
test('cavalier: blocked', [h(CV, -5, 16), h(CV, -5, 5)], false);
test('workshop: blocked', [h(WS, 9, 0), h(WS, 2, 0)], false);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
