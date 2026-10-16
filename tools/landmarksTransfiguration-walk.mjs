// tools/landmarksTransfiguration-walk.mjs - headless walk probe of landmarksTransfiguration (no GPU, the module alone: ground = layout.js, colliders of the module): the 7-tread stair onto the 1 m terrace, the terrace
// wall blocks from the other sides, the church walls and the shut door block, the portal steps climb, the bunker trench is open up to the steel door and the mound is solid; stats: services, triangles, build ms.
// usage: node tools/landmarksTransfiguration-walk.mjs
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
ctx.buildList = ['landmarksTransfiguration'];

const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksTransfiguration.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksTransfiguration/frame.js')).href);
const { CH, PL, TERRACE: T, BUNKER: B, makeFrame } = F;
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.12)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const W = (mx, mz) => { const q = CH.W(mx, mz); return [q.x, q.z]; };
// ---- the church mound: the stair climbs to y 1.0, the walls hold from every other side
test('the stair from Instrumentalnaya climbs onto the terrace', [W(0, T.stairZ1 + 1.5), W(0, T.mz1 - 0.4)], true, PL.TY);
test('the terrace wall blocks from the SE (street side)', [W(T.mx1 + 3, 0), W(T.mx1 - 3, 0)], false);
test('the terrace wall blocks from the NW', [W(T.mx0 - 3, 0), W(T.mx0 + 3, 0)], false);
test('the terrace wall blocks from the NE end', [W(0, T.mz0 - 3), W(0, T.mz0 + 3)], false);
test('the terrace wall blocks beside the stair', [W(4.5, T.mz1 + 2), W(4.5, T.mz1 - 3)], false);
test('on the terrace the lawn is free all round the church (SE side)', [W(T.mx1 - 2, 8), W(T.mx1 - 2, -8)], true, PL.TY, PL.TY);
test('the church wall blocks (from the terrace, the long SE face)', [W(PL.HW + 3, 0), W(PL.HW - 3, 0)], false, null, PL.TY);
test('the shut door blocks (from the portal steps)', [W(0, PL.HL + 3), W(0, PL.HL - 3)], false, null, PL.TY);
test('the portal steps can be climbed (the lowest tread)', [W(0, 15), W(0, PL.HL + 1.2)], true, PL.TY + 0.15, PL.TY);
// ---- the bunker
const dx = B.E[0] - B.S0[0], dz = B.E[1] - B.S0[1], len = Math.hypot(dx, dz), BF = makeFrame(B.S0[0], B.S0[1], dx, dz);
const BW = (mx, mz) => { const q = BF.W(mx, mz); return [q.x, q.z]; };
test('the trench is open from its open end up to the door', [BW(0, len + 4), BW(0, 1.2)], true, 0);
test('the shut door blocks', [BW(0, 2), BW(0, -2)], false);
test('the mound beside the trench is solid (left)', [BW(B.bermL + 2, 6), BW(2.4, 6)], false);
test('the mound beside the trench is solid (right)', [BW(-B.bermR - 1.0, 6), BW(-2.0, 6)], false);
test('the mound over the door end is solid', [BW(0, -6), BW(0, -1.8)], false);
const S = ctx.services.landmarksTransfiguration;
console.log('monuments', S.monuments.length, 'photoSpots', S.photoSpots.length, S.photoSpots.map((p) => `${p.name} (${p.x.toFixed(0)},${p.z.toFixed(0)})`).join('; '), 'board', JSON.stringify(S.board || null));
console.log('tris', Math.round(S.triangles), 'build ms', S.buildMs, 'parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
