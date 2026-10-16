// tools/landmarksYelaginPalace-walk.mjs - headless walk probe of landmarksYelaginPalace (no GPU, the module alone: ground = layout.js, colliders of the module): the lawn, the west stair, landing, side flights and terrace, the portico between wall and columns, the ramps and their kerbs, the east stair and the rotunda platform; walls, columns, cheek blocks, railings and kerbs block.
// usage: node tools/landmarksYelaginPalace-walk.mjs
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
ctx.buildList = ['landmarksYelaginPalace'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginPalace.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginPalace/frame.js')).href);
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
const p = (u, w) => { const q = F.W(u, w); return [q.x, q.z]; };
const FL = F.F;

if (process.argv.includes('--dbg')) {
  const pp = { x: 0, z: 0 }; let y = 0;
  for (let w = 17; w >= 8; w -= 0.2) { const q = F.W(0, w); pp.x = q.x; pp.z = q.z; const before = { ...pp }; ph.resolve(pp, 0.35, y, 1.7); const g = ph.groundHeight(pp.x, pp.z, y, false); console.log(w.toFixed(1), 'moved', Math.hypot(pp.x - before.x, pp.z - before.z).toFixed(2), 'ground', g); if (Number.isFinite(g)) y = g; }
  for (const w of [11.1, 10.9, 10.7, 10.5, 10.3, 10.1, 9.9, 9.7]) { const q = F.W(0, w); console.log('w', w, [0, 1, 1.54, 1.7, 2.0].map((fy) => ph.groundHeight(q.x, q.z, fy, false)).join(' ')); }
  process.exit(0);
}
// ---- west front
test('west: the lawn in front of the stair is open', [p(0, 40), p(0, 17)], true, 0);
test('west: up the 13 steps to the landing (2.0)', [p(0, 17), p(0, 8.3)], true, 2.0);
test('west: the terrace wall behind the landing blocks (0.8 m)', [p(0, 8.3), p(0, 6.5)], false, null, 2.0);
test('west: the side flight on the landing leads up to the terrace (exit sideways, beside the front railing)', [p(5.8, 8.6), p(9.0, 8.6), p(10.2, 8.6), p(10.2, 5.0)], true, FL, 2.0);
test('west: the portico between the wall and the columns', [p(9.0, 5.0), p(4.0, 3.5), p(3.4, 0.9)], true, FL, FL);
test('west: a column blocks', [p(5.1, 4.0), p(5.1, 1.6)], false, null, FL);
test('west: the wall blocks (the door is painted shut)', [p(0, 3.0), p(0, -1.5)], false, null, FL);
test('west: the cheek block blocks', [p(6.85, 19), p(6.85, 11)], false);
test('west: the lion plinth is not climbable from the stair side (cheek)', [p(4.5, 12), p(7.5, 12)], false, null, 1.0);
test('west: the railing blocks (terrace edge, central front)', [p(9.2, 4.0), p(9.2, 8.2)], false, null, FL);
test('west: the stair foot lamp blocks', [p(7.6, 20), p(7.6, 15.5)], false);
// ---- the ramps: from the tip to the terrace
for (const [name, R] of [['south', F.RAMP_S], ['north', F.RAMP_N]]) {
  const mid = (i, n) => { const A = R.A, B = R.B, ia = Math.min(A.length - 1, Math.round(i / (n - 1) * (A.length - 1))), ib = Math.min(B.length - 1, Math.round(i / (n - 1) * (B.length - 1))); return [(A[ia][0] + B[ib][0]) / 2, (A[ia][1] + B[ib][1]) / 2]; };
  const line = []; for (let i = 7; i >= 0; i--) { const m = mid(i, 8); line.push(p(m[0], m[1])); }
  const tip = mid(7, 8), top = mid(0, 8);
  const lineUp = []; for (let i = 7; i >= 0; i--) { const m = mid(i, 8); lineUp.push(p(m[0], m[1])); }
  test(`ramp ${name}: from the lawn at the tip up the cobbles to the terrace`, [p(tip[0] + (name === 'south' ? 4 : -4), tip[1] + 4), ...lineUp], true, FL);
  test(`ramp ${name}: the lawn-side kerb blocks (stepping out from the middle of the ramp)`, [lineUp[3], p(mid(4, 8)[0] + (name === 'south' ? -1 : 1) * 0 , mid(4, 8)[1] + 9)], false, null, 1.0);
}
// ---- terrace and flanks
test('terrace: along the portico from the stair to the south pavilion', [p(0, 5.5), p(12, 4.0), p(13.5, 5.2)], true, FL, FL);
test('terrace: the pair of columns of the south pavilion blocks the way along its front', [p(14.5, 3.4), p(18.5, 3.2)], false, null, FL);
test('terrace: the railing in front of the south pavilion blocks', [p(19.5, 1.2), p(19.5, 6.5)], false, null, FL);
test('terrace: the south flank (u 25) along the building to the east', [p(25, 3), p(25, -20), p(25, -30)], true, FL, FL);
test('terrace: the flank railing blocks (south side)', [p(25, -20), p(30, -20)], false, null, FL);
// ---- east
test('east: the lawn east of the stair is open', [p(0, -80), p(0, -45)], true, 0);
test('east: up the 14 steps to the rotunda platform', [p(0, -45), p(0, -33.5)], true, FL);
test('east: the platform in front of the colonnade', [p(0, -35), p(0, -31.5)], true, FL, FL);
test('east: the rotunda wall blocks (door painted shut)', [p(0, -31), p(0, -27)], false, null, FL);
test('east: a rotunda column blocks', [p(6.0 * Math.sin(0.314), -24.5 - 6.0 * Math.cos(0.314) - 3), p(6.0 * Math.sin(0.314), -24.5 - 6.0 * Math.cos(0.314) + 1.5)], false, null, FL);
test('east: the cheek block blocks', [p(11.2, -46), p(11.2, -36)], false);
test('east: the platform railing blocks', [p(18, -30), p(18, -37)], false, null, FL);
test('east: the vase pedestal blocks', [p(11.2, -33), p(11.2, -36.5)], false, null, FL);
// ---- the podium wall from the lawn side (it is 2.8 m high: nobody climbs it)
test('lawn: the south flank wall of the podium blocks from the lawn (u 35 -> 24)', [p(35, -10), p(24, -10)], false);
test('lawn: the north flank wall of the podium blocks from the lawn (u -35 -> -24)', [p(-35, -10), p(-24, -10)], false);
test('lawn: the east wall of the podium beside the stair blocks (w -50 -> -30 at u 16)', [p(16, -50), p(16, -30)], false);
test('lawn: the west podium wall east of the stair cheek blocks (w 20 -> 5 at u 12)', [p(12, 20), p(12, 5)], false);
const S = ctx.services.landmarksYelaginPalace;
console.log('monuments', S.monuments.length, 'entrances', S.entrances.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
