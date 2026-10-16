// tools/landmarksKamennyChurch-walk.mjs - headless walk probe of landmarksKamennyChurch (no GPU, the module alone: ground = layout.js, colliders of the module): the porch platform of the church, the chain fence
// (blocks, with the opening to the porch), the church walls, the tower and the buttresses (block), the chapel steps up to the door landing, the chapel wall and the way round its back.
// usage: node tools/landmarksKamennyChurch-walk.mjs
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
ctx.buildList = ['landmarksKamennyChurch'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyChurch.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyChurch/frame.js')).href);
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
const C = (mx, mz) => { const q = F.CH.W(mx, mz); return [q.x, q.z]; };
const K = (mx, mz) => { const q = F.CP.W(mx, mz); return [q.x, q.z]; };
// ---- church
test('church: the forecourt in front of the porch is open', [C(0, 30), C(0, 16)], true, 0);
test('church: up the two steps onto the porch platform (0.34)', [C(0, 16), C(0, 12.5)], true, 0.34);
test('church: the door is closed: the tower front blocks', [C(0, 12.0), C(0, 9.5)], false, null, 0.34);
test('church: a buttress blocks (from the platform sideways)', [C(0, 12.4), C(3.0, 11.2), C(3.0, 9.0)], false, null, 0.34);
test('church: the chain fence blocks the north side', [C(-20, 5), C(-10, 5)], false);
test('church: the chain fence blocks the south side', [C(20, 5), C(10, 5)], false);
test('church: the chain fence blocks across the front (beside the porch)', [C(9, 20), C(9, 12)], false);
test('church: the gap in the chain beside the porch steps is open', [C(0, 20), C(0, 14.4)], true);
test('church: the south arm wall blocks', [C(14, -1.6), C(8.5, -1.6)], false);
test('church: the north arm wall blocks', [C(-14, -1.6), C(-8.5, -1.6)], false);
test('church: the altar wall blocks', [C(0, -14), C(0, -6.0)], false);
test('church: the nave west wall corner pier blocks', [C(8, 6), C(5.0, 6)], false);
test('church: round the east end along the service way is open', [C(-14, -14), C(0, -14), C(14, -14)], true, 0);
// ---- chapel
const tiers = [];
test('chapel: from the lawn up the seven steps to the door landing (1.05)', [K(0, 14), K(0, 4.6)], true, 1.05);
test('chapel: the closed door blocks', [K(0, 4.6), K(0, 2.5)], false, null, 1.05);
test('chapel: the wall blocks from the side steps', [K(-3.9, 3.0), K(-3.0, 2.0)], false, null, 0.9);
test('chapel: round the back (the ground, no steps) is open', [K(0, -12), K(8, -8), K(8, 4), K(0, 12)], true, 0);
test('chapel: the back wall blocks', [K(0, -8), K(0, -3)], false);
const S = ctx.services.landmarksKamennyChurch;
console.log('monuments', S.monuments.length, 'entrances', S.entrances.length, 'photoSpots', S.photoSpots.length, 'plaques', S.plaques.length, 'posts', S.posts.length, 'tris', Math.round(S.triangles), 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
