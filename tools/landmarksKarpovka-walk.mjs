// tools/landmarksKarpovka-walk.mjs - headless walk probe of landmarksKarpovka (no GPU): the pavement in front of the Ioannovsky convent is open, the church, the Holy Gate (closed) and the pink wall block;
// the terrace of the First Lensovet House, its passage, both outside stairs and the gallery are walkable, walls / pillars / railings block.   usage: node tools/landmarksKarpovka-walk.mjs
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
// ---- walkability of landmarksKarpovka
// ---- walkability of landmarksKarpovka
ctx.buildList = ['landmarksKarpovka'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKarpovka.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKarpovka/frame.js')).href);
const ph = ctx.physics, LS = F.LS, CV = F.CV;
/** walk a polyline of [x, z] points from feet height y0 in 0.1 m steps (feet follow the walk surfaces); returns { stuck, y } */
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.06)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const cv = (mx, mz) => { const p = CV.W(mx, mz); return [p.x, p.z]; };
// convent (frame CV: x east along the south front, z out toward the river)
test('convent: along the pavement in front of the church', [cv(2.5, 3.2), cv(30, 3.2)], true, 0);
test('convent: into the south front under the tall windows', [cv(22.3, 6), cv(22.3, -3)], false);
test('convent: through the main portal (closed)', [cv(10.95, 5), cv(10.95, -2)], false);
test('convent: into the apse', [cv(44, -8), cv(34, -8)], false);
{ const gx = -2828.4, gz = -4240.7, n = [-0.312, 0.95];
  test('convent: up to the Holy Gate', [[gx + n[0] * 9, gz + n[1] * 9], [gx + n[0] * 1.5, gz + n[1] * 1.5]], true, 0);
  test('convent: through the Holy Gate (closed)', [[gx + n[0] * 3, gz + n[1] * 3], [gx - n[0] * 4, gz - n[1] * 4]], false);
  test('convent: through the pink wall east of the gate', [[-2815 + n[0] * 3, -4236.3 + n[1] * 3], [-2815 - n[0] * 3, -4236.3 - n[1] * 3]], false); }
test('convent: into the bell tower from the west', [cv(-8, -19.4), cv(1, -19.4)], false);
// Lensovet House (chord frame: c along the chord from its middle, d = depth away from the river)
const MID = [-2170.85, -4018.55], TC = [0.9639, 0.2661], MC = [0.2661, -0.9639];
const ch = (c, d) => [MID[0] + TC[0] * c + MC[0] * d, MID[1] + TC[1] * c + MC[1] * d];
test('Lensovet: up the front steps onto the terrace', [ch(1.6, -9), ch(1.6, -1)], true, 1.0);
test('Lensovet: across the terrace and through the passage into the court', [ch(1.6, -1), ch(-5, 4), ch(-1, 12), ch(-1, 29)], true, 0, 1.0);
test('Lensovet: from the court back up into the passage', [ch(0, 30), ch(0, 20)], true, 1.0);
test('Lensovet: into the socle wall from the terrace', [ch(-20, 2), ch(-20, 12)], false, null, 1.0);
test('Lensovet: into the pillar of the passage', [ch(-2.75, 6), ch(-2.75, 12)], false, null, 1.0);
test('Lensovet: into the terrace wall from the pavement', [ch(-25, -9), ch(-25, -2)], false);
{ // the west outside stair: terrace -> flight along the wing's end wall -> landing along the prow -> gallery
  const V = LS.V, un = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const e = un(V[22], V[23]), r = un(V[22], V[21]), at = (a, b) => [V[22][0] + e[0] * a + r[0] * b, V[22][1] + e[1] * a + r[1] * b];
  const g = (i, d) => LS.arc(LS.ang(i), LS.R + d);
  test('Lensovet: up the west outside stair, along the landing, into the gallery and along it', [at(8.4, 0.8), at(0.85, 0.8), at(0.85, 4.4), g(0.35, 1.1), g(6, 1.1), g(12.5, 1.1)], true, 4.2, 1.0);
  test('Lensovet: off the gallery through the railing', [g(6, 1.1), g(6, -2)], false, null, 4.2);
  test('Lensovet: from the gallery into the glazing', [g(6, 1.1), g(6, 4)], false, null, 4.2);
  test('Lensovet: from the gallery into the passage void', [g(12.5, 1.1), g(14, 1.1)], false, null, 4.2);
  const e2 = un(V[12], V[11]), r2 = un(V[12], V[13]), at2 = (a, b) => [V[12][0] + e2[0] * a + r2[0] * b, V[12][1] + e2[1] * a + r2[1] * b];
  test('Lensovet: up the east outside stair into the gallery', [at2(11.6, 0.8), at2(0.85, 0.8), at2(0.85, 5.4), g(31.65, 1.1), g(26, 1.1)], true, 4.2, 1.0);
}
test('Lensovet: through the stone fence of the court on ul. Literatorov', [[-2150, -4075.5], [-2150, -4068.5]], false);
test('Lensovet: through the gate of the court', [[-2126.2, -4073.5], [-2124.9, -4066]], true, 0);
const S = ctx.services.landmarksKarpovka;
console.log('fences', S.fences.length, 'monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'entrances', S.entrances.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
