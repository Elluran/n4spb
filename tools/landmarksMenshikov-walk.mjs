// tools/landmarksMenshikov-walk.mjs - headless walk probe of landmarksMenshikov (no GPU, the module alone: ground = layout.js, colliders of the module): the palace forecourt, the portico steps up to the closed door, the walls / hedge / fences, the west gate (visitors) open and the east gate closed, the Corps facade and portico columns, the garden gates, the obelisk steps, the fountains, the pavilion stairs, the apron ramps, the railing / curb, the pontoon gangways.
// usage: node tools/landmarksMenshikov-walk.mjs
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

// ---- walkability of landmarksMenshikov (module alone: ground = layout, no streets / city; the walkers collide with the colliders of the module)
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksMenshikov'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksMenshikov.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMenshikov/frame.js')).href);
const ph = ctx.physics, PF = F.PF, KF = F.KF, GF = F.GF, DF = F.DF;
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
const p = (f, a, b) => { const q = f.W(a, b); return [q.x, q.z]; };
const pf = (a, b) => p(PF, a, b), kf = (a, b) => p(KF, a, b), gf = (a, b) => p(GF, a, b), df = (a, b) => p(DF, a, b);
// ---- the palace (frame P: a along the front, b toward the Neva; the front wall of the recess at b -0.2, risalit fronts at b 2.7)
test('palace: the forecourt in front of the recess is open', [pf(0, 12), pf(0, 6), pf(8, 4.5)], true, 0);
test('palace: up the steps toward the closed door (the wall collider stops the walker 0.6 m from the wall: step 5 of 6, 0.83 m)', [pf(-0.3, 5), pf(-0.3, 2.9), pf(-0.3, 0.7)], true, 0.833);
test('palace: the walls block (recess wall)', [pf(6, 5), pf(6, -2)], false);
test('palace: the risalit wall blocks', [pf(16, 8), pf(16, 1.5)], false);
test('palace: a portico column blocks', [pf(-4.35, 5), pf(-4.35, 1)], false);
test('palace: between the columns to the door (the clear width)', [pf(-0.3, 4), pf(-0.3, 1.5)], true);
test('palace: the hedge west of the path blocks', [pf(-30, 9), pf(-30, 4)], false);
test('palace: the west fence blocks', [pf(-60, 9), pf(-60, 1)], false);
test('palace: the west gate is open (visitors way to the west wing door)', [pf(-43.4, 11), pf(-43.4, 1), pf(-43.4, -3)], true, 0);
test('palace: the visitors door is closed (the wall blocks)', [pf(-27.9, -9), pf(-27.9, -14.0)], false);
test('palace: the east gate is closed', [pf(45.1, 9), pf(45.1, 1.5)], false);
test('palace: the plain lawn east of the path is open', [pf(10, 11), pf(10, 3)], true, 0);
// ---- the First Cadet Corps (frame K: a along the line, b depth, the facade at b 0)
test('corps: the facade blocks', [kf(-100, 3.5), kf(-100, -2)], false);
test('corps: a portico column blocks', [kf(-204.7, 4), kf(-204.7, 0.5)], false);
test('corps: the 1938 portico column blocks', [kf(-1.9, 4), kf(-1.9, 0.8)], false);
test('corps: the pavement along the front is open', [kf(-160, 3.5), kf(-60, 3.5)], true, 0);
test('corps: a niche of the 1938 portico (the door between two pairs, 1.3 m wide) is open up to the door step', [kf(-2.9, 4), kf(-2.9, 1.3)], true, 0);
test('corps: the pier of a column pair in the 1938 portico blocks', [kf(-4.9, 4), kf(-4.9, 1.0)], false);
// ---- the Rumyantsev garden (frame G: a bearing 60, b toward the embankment)
test('garden: the south gate is open (on the axis)', [gf(0.1, 58), gf(0.1, 44)], true, 0);
test('garden: the fence blocks', [gf(20, 58), gf(20, 47)], false);
test('garden: the east gate is open', [gf(76, -0.9), gf(60, -0.9)], true, 0);
test('garden: the west gate is open', [gf(-76, 0.4), gf(-60, 0.4)], true, 0);
test('garden: the north-east gate beside the pavilion is open', [gf(31.7, -58), gf(31.7, -44)], true, 0);
test('garden: up the first two obelisk steps (the third is 0.35 m wide round the plinth)', [gf(0, 12), gf(0, 2.3)], true, 0.467);
test('garden: the obelisk plinth blocks', [gf(0, 3), gf(0, -1)], false, null, 0.7);
test('garden: the fountain basin blocks', [gf(30.9, 10), gf(30.9, -0.6)], false);
test('garden: the pavilion: up the six steps to the stage (1.0 m)', [gf(-0.35, -36), gf(-0.35, -44)], true, 1.0);
test('garden: the pavilion back wall blocks', [gf(0, -44), gf(0, -49)], false, null, 1.0);
test('garden: the Surikov stele blocks', [gf(29.6, 38), gf(29.6, 43.5)], false);
// ---- the Rumyantsevsky descent (frame D: a along the wall, b toward the river)
test('descent: from the street down the west ramp onto the apron', [df(-13, 3.2), df(-6, 5.5), df(3, 8), df(30, 8)], true, -1.2);
test('descent: along the apron to the east ramp and up to the street', [df(60, 8), df(130, 8), df(140, 7.5), df(158.8, -0.5)], true, 0, -1.2);
test('descent: the wall and the railing block (street to apron)', [df(60, -2), df(60, 5)], false);
test('descent: the river curb blocks (nobody walks on the water)', [df(40, 10), df(40, 24)], false, null, -1.2);
test('descent: the west pontoon is reached by its gangway', [df(66, 10), df(66, 20), df(66, 27)], true, -2.78, -1.2);
test('descent: the east pontoon is reached by its gangway', [df(121, 10), df(121, 20), df(121, 26.9), df(112, 26.9)], true, -2.78, -1.2);
test('descent: the pontoon rail blocks', [df(115, 28), df(115, 36)], false, null, -2.78);
test('descent: the cafe of the east pontoon blocks', [df(121, 28.5), df(121, 31)], false, null, -2.78);
test('descent: the west end of the wall is nearly flush with the street (floor -0.17 at a -2)', [df(-2, -1.5), df(-2, 4)], true, -0.17);
const S = ctx.services.landmarksMenshikov;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'entrances', S.entrances.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'trees', S.trees.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
