// tools/landmarksNavalCorps-walk.mjs - headless walk probe of landmarksNavalCorps (no GPU): the stair of the Krusenstern monument is walkable down to the landing and the wet bottom step (y -1.8 / -3.2) and
// nobody steps off it into the river; the tumba, the railing, the Corps, the church, the front house and the fences block; the pavement along the Corps is open; every photo spot is dry land,
// off the asphalt and outside every building.
// usage: node tools/landmarksNavalCorps-walk.mjs
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
// ---- walkability of landmarksNavalCorps
// review 2026-10-08: the probe builds the ENVIRONMENT first (about 25 s, NODE_OPTIONS=--max-old-space-size=14000): layout.inRiver is not the drawn bank (the real edge of the quay lies 2-5 m
// further inland on the S-189 reach), so a photo spot that passed the old standalone probe stood in the river bed (eye 4 m under the water). `--no-env` runs the old fast standalone version.
const WITH_ENV = !process.argv.includes('--no-env');
ctx.buildList = WITH_ENV ? ['environment', 'landmarksNavalCorps'] : ['landmarksNavalCorps'];
if (WITH_ENV) { const env = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href); await env.build(ctx); }
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksNavalCorps.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksNavalCorps/frame.js')).href);
const ph = ctx.physics, K = F.K, Cc = F.C;
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
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ' (blocked at ' + r.at.map((v) => v.toFixed(1)) + ')' : ' (open, feet y ' + r.y.toFixed(2) + ')'));
  all &&= ok;
};
const k = (u, v) => { const p = K.W(u, v); return [p.x, p.z]; };
const c = (u, v) => { const p = Cc.W(u, v); return [p.x, p.z]; };
// the stair (frame K): five upper treads of 0.3 m, the landing at -1.8, four lower treads to -3.2
test('stair: down the west flight to the landing', [k(60, 38.2), k(60, 41), k(60, 43.8)], true, -1.8);
test('stair: and on down the lower flight to the wet bottom step', [k(60, 38.2), k(60, 43.8), k(60, 47.0)], true, -3.2);
test('stair: down the east flight and back up to the street', [k(72, 38.2), k(72, 46.5), k(72, 38.0)], true, 0);
test('stair: along the landing in front of the tumba', [k(60, 38.2), k(60, 43.8), k(72, 43.8)], true, -1.8);
test('stair: the tumba blocks (street -> landing through it)', [k(66.5, 38.0), k(66.5, 44.5)], false);
test('stair: the railing blocks', [k(66.5, 37.0), k(66.5, 39.9)], false);
test('stair: the bottom step does not lead into the river', [k(60, 38.2), k(60, 47.0), k(60, 49.5)], false, null);
test('stair: the west end block blocks', [k(54.3, 36), k(54.3, 44)], false);
test('stair: the east end block blocks', [k(79.4, 36), k(79.4, 44)], false);
test('terrace: along the terrace in front of the stair', [k(50, 33), k(82, 33)], true, 0);
// the Corps
test('Corps: the front wall blocks', [k(40, 3), k(40, -3)], false);
test('Corps: the pavement along the front is open', [k(-5, 2.0), k(140, 2.0)], true, 0);
test('Corps: under the colonnade shelf (u 53 .. 79) is open down to the wall', [k(56, 3), k(56, 0.8)], true, 0);
test('Corps: the west wall (12th line) blocks', [k(-6, -60), k(6, -60)], false);
test('Corps: the east wall (11th line) blocks', [k(142, -40), k(130, -40)], false);
// (review 2026-10-08: with the environment built a street tree stands on this pavement at u -8, v -81: a tourist walks round it, so three lanes are tried and one open lane is enough)
{ let best = null; for (const du of [-8, -10, -6]) { const r = walk([k(du, -150), k(du, 0)], 0); if (!r.stuck && Math.abs(r.y) < 0.06) { best = du; break; } }
  console.log((best != null ? 'ok   ' : 'FAIL ') + 'Corps: along the 12th line outside the wall is open' + (best != null ? ' (lane u ' + best + ')' : ' (all three lanes blocked)')); all &&= best != null; }
// the church and the front house (frame C)
test('church: the Neva face blocks', [c(10, 27), c(10, 20)], false);
test('church: the iron railing along the plinth blocks', [c(10, 28), c(10, 24.4)], false);
test('church: the front house blocks', [c(-25, 40), c(-25, 30)], false);
test('church: the NE apse blocks', [c(38, 12), c(30, 12)], false);
test('church: the fence of 1900 blocks', [c(38, 10), c(33, 10)], false);
test('church: the pavement in front of the face is open', [c(8, 40), c(8, 30)], true, 0);
// photo spots: dry, off the asphalt, outside buildings
const spots = ctx.services.landmarksNavalCorps.photoSpots;
for (const s of spots) {
  // dry = not in the river polygon AND (with the environment built) the ground under the spot AND 2.5 m round it is street level, not the river bed (-6)
  let dry = !L.inRiver(s.x, s.z), gh = null;
  if (WITH_ENV && s.y == null) {
    gh = ph.groundHeight(s.x, s.z, 1e9, false);
    for (let a = 0; a < 8; a++) { const g = ph.groundHeight(s.x + 2.5 * Math.cos(a * Math.PI / 4), s.z + 2.5 * Math.sin(a * Math.PI / 4), 1e9, false); if (!(g > -1)) dry = false; }
    if (!(gh > -1)) dry = false;
  }
  const inb = L.insideBuilding(s.x, s.z, 0.3), road = L.isOnRoad(s.x, s.z, 0);
  const ok = (dry && !inb && !road) || s.y != null;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'photo spot ' + s.name + ' (' + s.x.toFixed(1) + ', ' + s.z.toFixed(1) + ' yaw ' + (+s.yaw).toFixed(1) + ') dry ' + dry + (gh != null ? ' ground ' + gh.toFixed(2) : '') + ' inBuilding ' + inb + ' onRoad ' + road);
  all &&= ok;
}
const S = ctx.services.landmarksNavalCorps;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'plaques', S.plaques.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts), 'stair sunk', S.stair && S.stair.sunk);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
