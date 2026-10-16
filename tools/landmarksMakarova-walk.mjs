// tools/landmarksMakarova-walk.mjs - headless walk probe of landmarksMakarova (no GPU; copy of tools/landmarksOktyabrsky-walk.mjs): the Lions pier flights are walkable down to the lowest tread and the water, the barriers,
// pedestals and cheek walls block; the 9 steps of the Catherine tower are walkable, the closed door wall, the fence with its two closed gates, the chapel, the gatehouse, the church and the tower block while the Kadetskaya
// line pavement stays open; the Yakovlev row and no. 12 are solid walls along the embankment (pavement open); the Lutheran portico steps and floor are walkable, its doors, columns, wings and gates block; the St Michael
// portal steps are walkable, the closed doors / nave / tower block; the Sportivnaya-2 pavilions: the door chord is open, the plinth / glass ring and the pillars block.
// usage: node tools/landmarksMakarova-walk.mjs
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
ctx.buildList = ['landmarksMakarova'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksMakarova.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMakarova/frame.js')).href);
const ph = ctx.physics;
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
const at = (f, u, v) => { const p = f.W(u, v); return [p.x, p.z]; };
const P_ = (u, v) => at(F.FP, u, v), C_ = (u, v) => at(F.FC, u, v), R_ = (u, v) => at(F.FR, u, v), E_ = (u, v) => at(F.FE, u, v), M_ = (u, v) => at(F.FM, u, v), S6 = (u, v) => at(F.F6, u, v), S7 = (u, v) => at(F.F7, u, v);

// ---- the Lions pier (frame P: v toward the street, the river at -v; flights u -2.8..2.8 / 4.1..7.0 / -7.0..-4.1)
test('lions: down the middle flight to the lowest tread', [P_(0, 3), P_(0, 0.5), P_(0, -3), P_(0, -5.9)], true, -2.9);
test('lions: down the east side flight', [P_(5.5, 3), P_(5.5, 0.5), P_(5.5, -5.9)], true, -2.9);
test('lions: down the west side flight', [P_(-5.5, 3), P_(-5.5, 0.5), P_(-5.5, -5.9)], true, -2.9);
test('lions: up again', [P_(0, -5.9), P_(0, 0.5), P_(0, 3)], true, 0, -2.9);
test('lions: across a barrier from the middle flight to the side flight is blocked', [P_(0, -3), P_(6, -3)], false, null, -1.2);
test('lions: the toe: nobody walks on the water', [P_(0, -5.9), P_(0, -7.8)], false, null, -2.9);
test('lions: the east pedestal blocks', [P_(3.45, 2), P_(3.45, -1.4)], false);
test('lions: round the pedestal on the street', [P_(1.5, 2), P_(1.5, 1), P_(8.8, 1)], true, 0);
test('lions: the cheek wall blocks', [P_(9, -3), P_(6.9, -3)], false);

// ---- Catherine church (frame C)
test('catherine: the 9 steps up toward the tower door (the player stops at step 8: the door wall collider)', [C_(-42, -0.2), C_(-39.9, -0.2), C_(-37.3, -0.2)], true, 1.42);
test('catherine: the closed tower door wall blocks', [C_(-37.1, -0.2), C_(-35, -0.2)], false, null, 1.6);
test('catherine: along the Kadetskaya line pavement', [C_(-42, -25), C_(-42, 25)], true, 0);
test('catherine: the north gate (closed) blocks', [C_(-42, -8.3), C_(-35, -8.3)], false);
test('catherine: the south gate (closed) blocks', [C_(-42, 7.9), C_(-35, 7.9)], false);
test('catherine: the fence blocks', [C_(-42, -11), C_(-35, -11)], false);
test('catherine: the chapel blocks', [C_(-42, 18), C_(-33, 18)], false);
test('catherine: the gatehouse blocks', [C_(-42, -18), C_(-33, -18)], false);
test('catherine: the north arm blocks', [C_(0, -20), C_(0, -14)], false);
test('catherine: the apse end wall blocks', [C_(25, 0), C_(20, 0)], false);

// ---- the row (frame R: the front at v = 0, the river at -v)
test('row: the front of the arcade blocks', [R_(30, -3), R_(30, 2)], false);
test('row: no. 12 blocks', [R_(100, -3), R_(100, 2)], false);
test('row: the closed mid-arcade gate blocks', [R_(25.6, -3), R_(25.6, 1)], false);
test('row: the east gate (closed) blocks', [R_(55.85, -3), R_(55.85, 1)], false);
test('row: along the embankment pavement (v -3)', [R_(2, -3), R_(14, -3)], true, 0);

// ---- Lutheran St Catherine (frame E: the portico faces +v)
test('lutheran: up the portico steps onto the floor', [E_(11.3, 56), E_(11.3, 50), E_(11.3, 46)], true, 0.9);
test('lutheran: between the columns (middle bay)', [E_(11.3, 50), E_(11.3, 46)], true, 0.9);
test('lutheran: through a column', [E_(9.6, 50), E_(9.6, 46)], false, null, 0.9);
test('lutheran: the closed doors of the back wall block', [E_(11.3, 46), E_(11.3, 40)], false, null, 0.9);
test('lutheran: the west wing blocks', [E_(2, 52), E_(2, 46)], false);
test('lutheran: the west gate (closed) blocks', [E_(-3, 48), E_(-3, 41)], false);
test('lutheran: the hall flank blocks', [E_(-5, 20), E_(1, 20)], false);

// ---- St Michael (frame M: the facade faces -v)
test('michael: up the four portal steps', [M_(7.25, -4), M_(7.25, -0.8), M_(7.25, -0.1)], true, 0.6);
test('michael: the closed portal wall blocks', [M_(7.25, -0.1), M_(7.25, 3)], false, null, 0.6);
test('michael: the nave side blocks', [M_(-5, 15), M_(1, 15)], false);
test('michael: along the facade pavement', [M_(-5, -5), M_(20, -5)], true, 0);

// ---- Sportivnaya-2 (frame S6 / S7: the door tip at u = -7.7, the long axis along u)
for (const [nm, S] of [['6', S6], ['7', S7]]) {
  test(`pavilion ${nm}: through the door chord into the pavilion`, [S(-11, 0.2), S(-3, 0.2)], true, null);
  test(`pavilion ${nm}: the plinth / glass ring of the long side blocks`, [S(0, -8), S(0, -2)], false);
  test(`pavilion ${nm}: the far end blocks`, [S(12, 0), S(5, 0)], false);
  test(`pavilion ${nm}: round the pavilion`, [S(-11, 6), S(0, 7.5), S(11, 6)], true, 0);
}
const S = ctx.services.landmarksMakarova;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'entrances', S.entrances.length, 'fences', S.fences.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
