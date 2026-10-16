// tools/landmarksTroitskaya-walk.mjs - headless walk probe of landmarksTroitskaya (no GPU): the garden alleys, the gates of the Mosque and Lidval fences and the Kronverksky pavement are open; the Mosque, the mansion,
// the chapel, the Solovetsky stone, the Gorky pedestal, the fence panels, the hedges and the houses block.   usage: node tools/landmarksTroitskaya-walk.mjs
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
const { batchStatic } = await import(pathToFileURL(path.join(root, 'src/core/batch2.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);

const names = [];


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { console.log('audio createAudio() threw:', e.message); audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.buildList = process.argv.slice(2).filter(a => !a.startsWith('--'));      // lib/claims.js: landmark groups only count as owned when their module is checked together with city
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
// ---- walkability of landmarksTroitskaya
ctx.buildList = ['landmarksTroitskaya'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksTroitskaya.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksTroitskaya/frame.js')).href);
const ph = ctx.physics;
const walkW = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked)' : ' (open)'));
  return ok;
};
const fr = (f, a, b, label, open) => { const p = f.W(a[0], a[1]), q = f.W(b[0], b[1]); return walkW(p.x, p.z, q.x, q.z, label, open); };
let all = true;
// Mosque (frame MQ: x south, z west)
all &= fr(F.MQ, [-19.6, 40], [-19.6, 21], 'Kronverksky pavement up to the steps of the pishtaq', true);
all &= fr(F.MQ, [-19.6, 21], [-19.6, 10], 'into the iwan and through the doors (closed: solid)', false);
all &= fr(F.MQ, [0, 30], [0, 0], 'through the west wall of the hall', false);
all &= fr(F.MQ, [-40, 22], [20, 22], 'along the west facade on the pavement', true);
all &= fr(F.MQ, [-45, 0], [-20, 0], 'through the fence and the north portal', false);
all &= fr(F.MQ, [30, 0], [10, 0], 'into the south (mihrab) wall from the yard', false);
// mansion (frame KS: x = s along Kronverksky, z out)
all &= fr(F.KS, [-12, 5], [34, 5], 'along the Kronverksky pavement past the turret and the fence', true);
all &= fr(F.KS, [5, 6], [5, -6], 'through the Kronverksky face under the balcony', false);
all &= fr(F.KS, [22, 5], [22, -4], 'through the iron fence in front of the wing', false);
all &= fr(F.KS, [11.6, 6], [11.6, 0], 'into the turret', false);
all &= fr(F.KS, [56, -30], [46, -30], 'from Kuybysheva through the brick wall of the garden', false);
// garden of the square
all &= walkW(-1442.8, -2296.5, -1442.8, -2270, 'in the centre circle of the garden (alley)', true);
all &= walkW(-1446, -2155, -1437, -2155, 'up to the chapel portal', true);
all &= walkW(-1437, -2155, -1425, -2155, 'into the chapel (closed)', false);
all &= walkW(-1414, -2214, -1405.9, -2216.8, 'into the Solovetsky stone', false);
all &= walkW(-1416, -2212, -1412, -2222, 'round the Solovetsky stone', true);
// houses
all &= walkW(-1345, -2270, -1300, -2270, 'through the west wing of the House of Political Prisoners', false);
all &= walkW(-1365, -2335, -1340, -2335, 'into the Lenproekt house', false);
{ const o = [-1711.3, -2742.0], a = [0.39, 0.92], c = [0.92, -0.39], W = (pa, pc) => [o[0] + a[0] * pa + c[0] * pc, o[1] + a[1] * pa + c[1] * pc];
  const g = [-1731.8, -2739.8], n = [-c[0], -c[1]];
  all &= walkW(g[0] + n[0] * 4, g[1] + n[1] * 4, g[0] - n[0] * 6, g[1] - n[1] * 6, 'through the north gate of the Lidval fence into the court', true);
  { const p = W(4, -30), q = W(4, -14); all &= walkW(p[0], p[1], q[0], q[1], 'through the Lidval fence between the gates', false); }
  { const p = W(0, 20), q = W(0, 40); all &= walkW(p[0], p[1], q[0], q[1], 'from the court into the cross block', false); } }
all &= walkW(-1748.3, -2700.7, -1757.5, -2711.3, 'into the Gorky pedestal', false);
const S = ctx.services.landmarksTroitskaya;
console.log('garden', JSON.stringify(S.garden), 'fences', S.fences.length, 'monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
