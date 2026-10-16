// tools/landmarksKamennyPalace-walk.mjs - headless walk probe of landmarksKamennyPalace (no GPU, the module alone: ground = layout.js, colliders of the module): the garden is CLOSED, so the probe walks the public ground (avenue footway, embankment road, the church forecourt) and checks that every way into the garden is blocked: the parade gate, the church gate, both checkpoint gates, the fence along the avenue and the shore, the palace walls, the kitchen block, the gardener house and the yard wall.
// usage: node tools/landmarksKamennyPalace-walk.mjs
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
ctx.buildList = ['landmarksKamennyPalace'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyPalace.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyPalace/frame.js')).href);
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
const pt = (x, z) => [x, z];
const loc = (x, z) => { const q = F.W(x, z); return [q.x, q.z]; };
// ---- public ground: open
test('avenue: the gravel footway along the garden wall (w363615251)', [pt(-2880.4, -5293.7), pt(-2856.2, -5339.5), pt(-2848.6, -5360)], true, 0);
test('embankment: the road up to the checkpoint gate', [pt(-2700.8, -5207.9), pt(-2680, -5221)], true, 0);
test('church forecourt: the path to the church gate', [pt(-2830, -5398.7), pt(-2824.6, -5396)], true, 0);
// ---- closed: the gates and the fence
test('parade gate: the avenue side to the garden is blocked (centre of the opening)', [pt(-2848, -5333), pt(-2828, -5343)], false);
test('parade gate: the wicket is blocked', [pt(-2846.6, -5333.4), pt(-2836.2, -5328)], false);
test('fence: the avenue wall north of the gate blocks', [pt(-2830, -5362), pt(-2810, -5372)], false);
test('church gate: blocked', [pt(-2822, -5395), pt(-2808, -5389)], false);
test('checkpoint: the road gate is closed', [pt(-2668, -5225), pt(-2652, -5240)], false);
test('checkpoint: the quay gate is closed', [pt(-2655, -5216), pt(-2641, -5226)], false);
test('checkpoint: the gate house blocks', [pt(-2656, -5222), pt(-2650, -5236)], false);
test('shore fence: the north-east fence blocks (from the shore strip into the garden)', [pt(-2650, -5410), pt(-2650, -5385)], false);
test('palace: the river wall blocks (from the lawn)', [loc(0, 12), loc(0, -3)], false);
test('palace: the wing end wall blocks', [loc(-52, -17), loc(-38, -17)], false);
test('palace: the court face blocks', [loc(0, -32), loc(0, -18)], false);
test('kitchen block: the north face blocks (from the alley)', [pt(-2760, -5290), pt(-2760, -5270)], false);
test('gardener house: blocks', [pt(-2760, -5200), pt(-2735, -5206)], false);
test('yard wall: blocks (from the embankment road)', [pt(-2724, -5214), pt(-2704, -5236)], false);
const S = ctx.services.landmarksKamennyPalace;
console.log('monuments', S.monuments.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'fence m', S.fenceLength, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
