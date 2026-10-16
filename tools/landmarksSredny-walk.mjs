// tools/landmarksSredny-walk.mjs - headless walk probe of landmarksSredny (no GPU, no city): what a tourist can and cannot do on Sredny pr.: the pavement and the 9-step stair of the Geological Committee
// (the iron fence, the cheek walls, the columns and the closed doors block; the loggia platform at +1.9 m is walkable), the Gorny Institut doors (open through the 4.4 m opening, the glass walls block), the three granite
// steps to the closed Frank portal, the tram depot (the sheds, the Brush plinth, the fences, the static cars, the Leonov bust block; the yard apron and the tram gate are open), the Chernikhov hall and tower, the Dom Evangelia fence.
// usage: node tools/landmarksSredny-walk.mjs
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
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksSredny'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksSredny.js')).href);
await mod.build(ctx);
const FRm = await import(pathToFileURL(path.join(root, 'src/world/landmarksSredny/frame.js')).href);
const { FR } = FRm, ph = ctx.physics;
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.08)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const G = FR.G, D = FR.D, E = FR.E, F = FR.F, T = FR.T;
const g = (a, b) => G.xz(a, b), d = (a, b) => D.xz(a, b), e = (a, b) => E.xz(a, b), f = (a, b) => F.xz(a, b), t = (a, b) => T.xz(a, b);
// ---- Geological Committee (frame G: X along the prospect, Z toward the building, the carriageway at Z <= -4.4)
test('geol: along the pavement past the stair (a 1.2 m lane remains)', [g(20, -3.8), g(100, -3.8)], true, 0);
test('geol: the iron fence blocks (west wing)', [g(30, -3), g(30, 3)], false);
test('geol: the iron fence blocks (east flank)', [g(131, 20), g(124, 20)], false);
test('geol: the stair from the pavement to the platform', [g(60.75, -4.1), g(60.75, -2), g(60.75, 0.4)], true, 1.89);
test('geol: along the loggia platform between the columns', [g(53, 2.4), g(68.5, 2.4)], true, 1.89, 1.89);
test('geol: a column blocks', [g(60.75 - 2, -0.7), g(60.75 - 2, 2.5)], false, null, 1.89);
test('geol: the closed doors block', [g(60.75, 2.4), g(60.75, 6)], false, null, 1.89);
test('geol: the cheek wall blocks', [g(52.7, -4.0), g(52.7, -0.6)], false);
test('geol: the building wall blocks from the east flank', [g(135, 30), g(100, 30)], false);
// ---- Gorny Institut: the doors (from the metro DOORWAYS rows)
for (const id of ['gorny-in', 'gorny-out']) {
  const dw = L.DOORWAYS.find((q) => q.id === id), n = [Math.sin(dw.rotY), Math.cos(dw.rotY)], px = [Math.cos(dw.rotY), -Math.sin(dw.rotY)];
  const P0 = (r, s = 0) => [dw.x + n[0] * r + px[0] * s, dw.z + n[1] * r + px[1] * s];
  test(id + ': through the 4.4 m door opening', [P0(5), P0(0.5), P0(-3)], true);
  test(id + ': the wall beside the door blocks', [P0(3, 2.9), P0(-1.2, 2.9)], false);
}
// ---- Frank mansion
test('frank: the steps to the portal (closed door at the top)', [f(47.4 + 1.5, 2.4), f(47.4 + 0.6, 2.4)], true, 0.30);
test('frank: the front wall blocks', [f(53, 12), f(40, 12)], false);
test('frank: the street pavement in front is open', [f(54, -2), f(54, 25)], true);
// ---- tram depot (frame D)
test('depot: the east apron is open (the tram gate side)', [d(70, 70), d(70, 20), d(60, 20)], true);
test('depot: shed A east end blocks', [d(60, 50), d(30, 50)], false);
test('depot: the tram gate is open (the lead to Sredny)', [d(58, 135), d(58, 126), d(58, 110)], true);
test('depot: the Brush plinth blocks', [d(77, 108), d(77, 119)], false);
test('depot: the plot fence blocks', [d(80, 128), d(80, 119)], false);
test('depot: the plot wall (east side) blocks', [d(100, 110), d(90, 110)], false);
test('depot: the yard east wall blocks', [d(100, 0), d(90, 0)], false);
test('depot: the Leonov pedestal blocks', [d(29.7, 90), d(29.7, 83.5)], false);
test('depot: the clock mast blocks', [d(40, 84), d(40, 78)], false);
for (const s of ctx.services.landmarksSredny.staticTrams || []) test('depot: static car on ' + s.id + ' blocks', [[s.x + 0.0, s.z + 10], [s.x, s.z]], false);
test('depot: 79A blocks from the street side', [d(10, 140), d(10, 128)], false);
// ---- Chernikhov hall and tower
test('tower: the east wall of the hall blocks', [t(48, 60), t(36, 60)], false);
test('tower: the pavement of the 25th line is open', [t(50, 10), t(50, 120)], true);
test('tower: the shaft blocks', [t(34, 135), t(34, 126)], false);
// ---- Dom Evangelia
test('evangelia: the lattice fence blocks', [e(-35, 20), e(-25, 20)], false);
const S = ctx.services.landmarksSredny;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
