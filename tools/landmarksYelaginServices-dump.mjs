// tools/landmarksYelaginServices-dump.mjs - debug: lists the triangles of the built module inside a box of a model frame. usage: node tools/landmarksYelaginServices-dump.mjs '{"frame":"ST","x":[a,b],"y":[a,b],"z":[a,b],"n":6}'
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
const spec = JSON.parse(process.argv[2]);          // { frame:'ST', x:[a,b], y:[a,b], z:[a,b] }
const fr = F[spec.frame];
let found = 0;
ctx.scene.updateMatrixWorld(true);
ctx.scene.traverse((m) => {
  if (!m.isMesh || !m.geometry) return;
  const g = m.geometry, pos = g.attributes.position, idx = g.index; if (!pos) return;
  const v = new THREE.Vector3();
  const loc = (i) => { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); const q = F.toLocal(fr, v.x, v.z); return [q.x, v.y, q.z]; };
  const nt = idx ? idx.count / 3 : pos.count / 3;
  const hits = [];
  for (let t = 0; t < nt; t++) {
    const ia = idx ? idx.getX(t * 3) : t * 3, ib = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, ic = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    const P = [loc(ia), loc(ib), loc(ic)];
    const inb = P.every((p) => p[0] >= spec.x[0] && p[0] <= spec.x[1] && p[1] >= spec.y[0] && p[1] <= spec.y[1] && p[2] >= spec.z[0] && p[2] <= spec.z[1]);
    const thin = spec.thin && (Math.max(...P.map((p) => p[1])) - Math.min(...P.map((p) => p[1])) > spec.thin[0]) && (Math.max(...P.map((p) => p[0])) - Math.min(...P.map((p) => p[0])) < spec.thin[1]) && (Math.max(...P.map((p) => p[2])) - Math.min(...P.map((p) => p[2])) < spec.thin[1]);
    if (spec.thin ? thin : inb) hits.push(P);
  }
  if (hits.length) { found += hits.length; const mat = Array.isArray(m.material) ? m.material[0] : m.material; console.log(`mesh ${m.name} mat=${mat && mat.name} tris=${hits.length}`); for (const h of hits.slice(0, spec.n || 6)) console.log('  ', h.map((p) => p.map((x) => x.toFixed(2)).join(',')).join(' | ')); }
});
console.log('found', found);
process.exit(0);
