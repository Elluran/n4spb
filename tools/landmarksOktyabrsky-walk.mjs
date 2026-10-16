// tools/landmarksOktyabrsky-walk.mjs - headless walk probe of landmarksOktyabrsky (no GPU): the forecourt in front of the Bolshoy Concert Hall is open, the seven-riser stair and the stylobate are
// walkable, the foyer is ENTERABLE through the five door groups (landing, 7 interior risers down, parquet; the user's L-pose stands on it; the glass between the doors, the foyer shell, the columns and the stair flights block), the end blocks, the flanks, the rear and the lamps / bollards / the October group block.
// usage: node tools/landmarksOktyabrsky-walk.mjs
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
// ---- walkability of landmarksOktyabrsky
ctx.buildList = ['landmarksOktyabrsky'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksOktyabrsky.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksOktyabrsky/frame.js')).href);
const ph = ctx.physics, W = F.W;
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
const h = (u, v) => { const p = W(u, v); return [p.x, p.z]; };
// the hall (frame: u along the front, v into the building)
test('forecourt: along the promenade in front of the stair', [h(5, -11), h(60, -11)], true, 0);
test('stair: from the forecourt up the seven risers to the stylobate', [h(33, -9), h(33, -4), h(33, 1.2)], true, 1.2);
test('stair: along the stylobate under the slab (between the end blocks)', [h(33, 1.2), h(14, 1.5), h(52, 1.5)], true, 1.2, 1.2);
test('stair: along the stylobate in front of the end blocks', [h(1, -0.6), h(66, -0.6)], true, 1.2, 1.2);
test('stair: down again', [h(40, 1.5), h(40, -6)], true, 0, 1.2);
test('hall: through the glass wall between two door groups', [h(22.8, 1.5), h(22.8, 6)], false, null, 1.2);
// the foyer is ENTERABLE (frame.js FOYER_OPEN): door group -> landing (+1.2) -> 7 risers down -> parquet (y 0.12); the user's L-pose 771,1.5,-355.9 = hall (27.7, 13.2) stands on it
test('foyer: through a door group, down the interior flight', [h(32.2, 1.5), h(32.2, 7)], true, 0.12, 1.2);
test('foyer: on to the user L-pose 771,-355.9 (hall u 27.7, v 13.2)', [h(32.2, 1.5), h(32.2, 7), h(27.7, 13.2)], true, 0.12, 1.2);
test('foyer: the L-pose itself at feet y 0 is open (not trapped)', [[771, -355.9], [771.2, -356.2]], true, 0.12, 0);
test('foyer: and out again through another door group, up and over the stair', [h(38.5, 9), h(38.5, 5), h(38.5, 1.5), h(38.5, -6)], true, 0, 0.12);
test('foyer: the cube front wall blocks (back wall of the foyer)', [h(33, 8), h(33, 18)], false, null, 0.12);
test('foyer: the SSW inner end wall blocks', [h(14, 7), h(8, 7)], false, null, 0.12);
test('foyer: the NNE inner end wall blocks', [h(53, 7), h(59, 7)], false, null, 0.12);
test('foyer: a column blocks', [h(26.52, 7.5), h(26.52, 4.6)], false, null, 0.12);
test('foyer: a stair flight to the gallery blocks (decor)', [h(20, 6), h(20, 10.1), h(20, 13)], false, null, 0.12);
test('hall: into the SSW end block from the stylobate', [h(6, 1.5), h(6, 6)], false, null, 1.2);
test('hall: into the NNE end block from the stylobate', [h(62, 1.5), h(62, 6)], false, null, 1.2);
test('hall: into the SSW flank', [h(-6, 30), h(3, 30)], false);
test('hall: into the NNE flank', [h(75, 30), h(63, 30)], false);
test('hall: into the rear wall', [h(30, 89), h(30, 80)], false);
test('hall: along the SSW flank outside the wall', [h(-6, 5), h(-6, 80)], true);
test('hall: along the rear', [h(10, 90), h(60, 90)], true);
test('forecourt: through a twin lamp', [h(10.8, -10), h(10.8, -5)], false);
test('forecourt: past the lamp (1.5 m beside it)', [h(13, -10), h(13, -5)], true);
// the October group: the block stands at hall (56, -9)
test('October group: through the granite block', [h(56, -14), h(56, -4)], false);
test('October group: round the block', [h(48, -14), h(48, -9), h(56, -17), h(64, -9)], true);
const S = ctx.services.landmarksOktyabrsky;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'lamps', S.lamps.length, 'bollards', S.bollards, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
