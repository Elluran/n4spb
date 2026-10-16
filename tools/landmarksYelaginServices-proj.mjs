// tools/landmarksYelaginServices-proj.mjs - debug: which triangles of the built module project into a screen strip.  usage: node tools/landmarksYelaginServices-proj.mjs "x,z,yaw,pitch" px0 px1 [minHeightPx]
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
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksYelaginServices'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginServices.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginServices/frame.js')).href);
globalThis.__ctx = ctx; globalThis.__F = F; globalThis.__THREE = THREE;
const [cx, cz, yaw, pitch] = process.argv[2].split(',').map(Number), px0 = Number(process.argv[3]), px1 = Number(process.argv[4]), minH = Number(process.argv[5] || 200);
const cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.05, 3000);
cam.position.set(cx, 1.7, cz); cam.rotation.order = 'YXZ'; cam.rotation.y = yaw * Math.PI / 180; cam.rotation.x = pitch * Math.PI / 180;
cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
ctx.scene.updateMatrixWorld(true);
const W = 1280, H = 720; let found = 0; const seen = new Map();
ctx.scene.traverse((m) => {
  if (!m.isMesh || !m.geometry) return;
  const g = m.geometry, pos = g.attributes.position, idx = g.index; if (!pos) return;
  const v = new THREE.Vector3(), nt = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < nt; t++) {
    const P = [0, 1, 2].map((k) => { const i = idx ? idx.getX(t * 3 + k) : t * 3 + k; v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); const w = v.clone(); const c = v.clone().applyMatrix4(cam.matrixWorldInverse); return { w, c, s: v.clone().project(cam) }; });
    if (P.some((p) => p.c.z > -0.05)) continue;
    const xs = P.map((p) => (p.s.x * 0.5 + 0.5) * W), ys = P.map((p) => (1 - (p.s.y * 0.5 + 0.5)) * H);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (x1 < px0 || x0 > px1 || x1 - x0 > 60 || y1 - y0 < minH) continue;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material; const key = `${m.name}/${mat && mat.name}`;
    const rec = seen.get(key) || { n: 0, ex: null }; rec.n++; rec.ex ||= P.map((p) => `${p.w.x.toFixed(2)},${p.w.y.toFixed(2)},${p.w.z.toFixed(2)}`).join(' | ') + ` px ${x0.toFixed(0)}-${x1.toFixed(0)} y ${y0.toFixed(0)}-${y1.toFixed(0)} dist ${(-P[0].c.z).toFixed(2)}`; seen.set(key, rec);
  }
});
for (const [k, r] of seen) console.log(k, r.n, r.ex);
process.exit(0);
