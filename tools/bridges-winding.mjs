// tools/bridges-winding.mjs - headless scan of the bridges module (no GPU, the module alone) for INVERTED FACES: wraps Parts.build of bridges/kit.js, and for every triangle of every material bucket compares
// the front side given by the index order (counter-clockwise) with the vertex normals; a triangle whose front side looks against its normal is culled when seen from outside (a pole top, a column cap, a lamp puck
// hollow from below).  Prints the materials with such triangles (expected: a handful; double-sided materials list them too, they are harmless there) and the vertices with a zero normal (they light as NaN).
// usage: node tools/bridges-winding.mjs    (copy of tools/landmarksKirova-winding.mjs; review of bridges-3, 2026-10-10: kit.js cyl() had every cap inverted: 41,660 of 586,272 triangles, 20 left after the fix)
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
ctx.buildList = ['bridges'];
const kit = await import(pathToFileURL(path.join(root, 'src/world/bridges/kit.js')).href);
const stats = new Map();
const orig = kit.Parts.prototype.build;
kit.Parts.prototype.build = function (parent, o) {
  for (const k of this.b.values()) {
    let ok = 0, bad = 0, deg = 0;
    for (let i = 0; i < k.idx.length; i += 3) {
      const a = k.idx[i], b = k.idx[i + 1], c = k.idx[i + 2];
      const A = [k.pos[a * 3], k.pos[a * 3 + 1], k.pos[a * 3 + 2]], B = [k.pos[b * 3], k.pos[b * 3 + 1], k.pos[b * 3 + 2]], C = [k.pos[c * 3], k.pos[c * 3 + 1], k.pos[c * 3 + 2]];
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const g = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], gl = Math.hypot(g[0], g[1], g[2]);
      if (gl < 1e-9) { deg++; continue; }
      const n0 = [k.nrm[a * 3], k.nrm[a * 3 + 1], k.nrm[a * 3 + 2]], n1 = [k.nrm[b * 3], k.nrm[b * 3 + 1], k.nrm[b * 3 + 2]], n2 = [k.nrm[c * 3], k.nrm[c * 3 + 1], k.nrm[c * 3 + 2]];
      const nn = [n0[0] + n1[0] + n2[0], n0[1] + n1[1] + n2[1], n0[2] + n1[2] + n2[2]];
      if (g[0] * nn[0] + g[1] * nn[1] + g[2] * nn[2] > 0) ok++; else bad++;
    }
    let zn = 0; for (let i = 0; i < k.nrm.length; i += 3) if (Math.hypot(k.nrm[i], k.nrm[i + 1], k.nrm[i + 2]) < 0.5) zn++;          // zero normals light as NaN: a white glare with bloom
    const key = (k.mat.name || '?') + (k.mat.side === 2 || k.mat.side === 'double' ? ' [double]' : '');
    const s = stats.get(key) || { ok: 0, bad: 0, deg: 0, zn: 0 }; s.ok += ok; s.bad += bad; s.deg += deg; s.zn += zn; stats.set(key, s);
  }
  return orig.call(this, parent, o);
};
const mod = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href);
await mod.build(ctx);
let tb = 0, tt = 0;
let tz = 0;
for (const [k, s] of [...stats.entries()].sort((a, b) => b[1].bad - a[1].bad)) { tb += s.bad; tz += s.zn; tt += s.ok + s.bad; if (s.bad || s.zn) console.log(String(s.bad).padStart(7), 'of', String(s.ok + s.bad).padStart(7), 'inverted;', String(s.zn).padStart(5), 'zero-normal vertices', k.padEnd(28)); }
console.log('triangles', tt, 'with front face against the vertex normal', tb, ';  vertices with a zero normal', tz);
process.exit(0);
