// tools/landmarksYelaginSpits-walk.mjs - headless walk probe of landmarksYelaginSpits (no GPU, the module alone): the player (radius 0.35) walks polylines in 0.1 m steps through physics.resolve + groundHeight: from the park lawn up the low steps onto the terrace, along the parapet, round the plinths, the benches, to the head of both flights and DOWN them to the water landing, and the blocked cases (parapet, plinths, benches, cheeks, the water end).  ok = as expected, FAIL otherwise.   usage: node tools/landmarksYelaginSpits-walk.mjs
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
ctx.buildList = ['landmarksYelaginSpits'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginSpits.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginSpits/frame.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.06)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const W = (a, b) => F.world(a, b);                                      // local (a along the wall, b to the water) -> world [x, z]
const C = (key, xp, zp) => { const c = F.CORNERS.find((q) => q.key === key); return F.world(...F.cornerPoint(c, xp, zp)); };      // corner frame
const TERR = F.TERRACE;
// the flights are pits in the real scene (groups.js WATER_RINGS opens the ground there: heightAt = the bed): emulate it with a terrain hole over each flight
for (const c of F.CORNERS) { const s = c.sx > 0 ? -1 : 1, xm = s * (F.FLIGHT.inner + F.FLIGHT.w + F.FLIGHT.outer) / 2, [cx, cz] = F.world(...F.cornerPoint(c, xm, F.FLIGHT.head / 2)); ph.addHole(cx, cz, F.FLIGHT.inner + F.FLIGHT.w + F.FLIGHT.outer, -F.FLIGHT.head, F.ROT + c.psi); }
// ---- the terrace
test('lawn -> broad low steps -> the middle of the terrace', [W(0, -22), W(0, -13), W(0, -8)], true, TERR);
test('across the terrace along the wall (north to south)', [W(-12, -8), W(12, -8)], true, TERR);
test('the parapet of the wall blocks (from the terrace centre)', [W(0, -8), W(0, 3.0)], false, null, TERR);
test('the parapet blocks at the north end of the arc too', [W(-11, -6), W(-11, 1.2)], false, null, TERR);
test('the north plinth blocks', [W(-10, -2), C('n', 0.95, -0.9)], false, null, TERR);
test('the south plinth blocks', [W(10, -2), C('s', -0.95, -0.9)], false, null, TERR);
test('the north return blocks (from the terrace side)', [W(-11, -3.5), C('n', 0.0, -4)], false, null, TERR);
test('the bench seat of the north return blocks', [W(-10.5, -4), C('n', 0.8, -3.4)], false, null, TERR);
test('the bench seat of the south return blocks', [W(10.5, -4), C('s', -0.8, -3.4)], false, null, TERR);
test('past the end of the north return, down the curb to the wing (y 0)', [W(-13, -9), W(-17, -9)], true, 0, TERR);
test('past the end of the south return, down the curb to the wing (y 0)', [W(13, -9), W(17, -9)], true, 0, TERR);
test('round the south corner of the plaza on the lawn side (corner radius 3)', [W(12, -14.5), W(9.5, -14.5), W(9, -12), W(8, -8)], true, TERR);
// ---- the flights (drawn only after the registration in environment/owners.js: svc.handedOver; run this probe in a tree with the registration to test them)
const HO = ctx.services.landmarksYelaginSpits.handedOver;
console.log('module: ' + ctx.services.landmarksYelaginSpits.triangles + ' triangles (' + ctx.services.landmarksYelaginSpits.nearTriangles + ' near), ' + ctx.services.landmarksYelaginSpits.meshes + ' meshes, handedOver ' + HO + ', hedges ' + ctx.services.landmarksYelaginSpits.hedges + ', build ' + ctx.services.landmarksYelaginSpits.buildMs + ' ms');
if (!HO) console.log('skip flights: module not registered in environment/owners.js (no flights are built then)');
for (const k of HO ? ['n', 's'] : []) {
  const s = k === 'n' ? -1 : 1, x = s * 1.4;                           // the middle of the treads in the corner frame
  test(`${k}: from the wing level down the flight to the landing (y -3.2)`, [C(k, x, -6.0), C(k, x, -5.0), C(k, x, -0.1)], true, -3.2);
  test(`${k}: the landing ends at the water line (nobody steps into the Neva)`, [C(k, x, -3.0), C(k, x, 1.5)], false, null, -3.2);
  test(`${k}: the outer cheek blocks (from the wing at the head)`, [C(k, s * 3.6, -5.5), C(k, s * 1.4, -4.0)], false);
  test(`${k}: the inner cheek / return blocks (from the terrace side)`, [C(k, -s * 3.0, -4), C(k, s * 1.0, -4)], false, null, TERR);
  test(`${k}: up the flight again to the wing level`, [C(k, x, -0.3), C(k, x, -5.0), C(k, x, -6.4)], true, 0, -3.2);
}
console.log(all ? 'ALL OK' : 'SOME FAILED');
process.exit(all ? 0 : 1);
