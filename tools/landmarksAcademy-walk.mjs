// tools/landmarksAcademy-walk.mjs - headless walk probe of landmarksAcademy (no GPU; derived from landmarksOktyabrsky-walk.mjs): the Academy front pavement, the pier stair (pavement -> landing -> lowest tread -> back),
// the guards (railing, benches, pedestals, lamp columns), the garden gates (two open west gates, closed east gates, the fence), the column, the statues, Trezzini Square (monument, hotel, railing).
// usage: node tools/landmarksAcademy-walk.mjs
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
ctx.buildList = ['landmarksAcademy'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksAcademy.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksAcademy/frame.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.08)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const h = (u, v) => { const p = W(u, v); return [p.x, p.z]; };
// ---- the Academy
test('front pavement: along the Academy at v 71', [h(-60, 71), h(60, 71)], true, 0);
test('front: into the Academy wing from the pavement', [h(-30, 66), h(-30, 50)], false);
test('front: into the podium at the door (closed)', [h(-1.2, 70), h(-1.2, 62)], false);
test('flank: the wall on the 4-5 lines street side blocks', [h(-75, 0), h(-66, 0)], false);
test('rear: the Academy rear wall blocks', [h(-30, -64), h(-30, -44)], false);
// ---- the sphinx pier
test('pier: pavement -> down the upper flight to the landing', [h(-1.2, 101.5), h(-1.2, 104.0), h(-1.2, 107.4), h(-1.2, 108.2)], true, -2.28);
test('pier: landing -> the lower flight to the lowest tread', [h(-1.2, 108.0), h(-1.2, 108.9), h(-1.2, 111.2)], true, -3.12, -2.28);
test('pier: the lowest tread is guarded (no walking on the water)', [h(-1.2, 111.0), h(-1.2, 113.5)], false, null, -3.12);
test('pier: back up the whole stair', [h(-1.2, 110.8), h(-1.2, 108.0), h(-1.2, 104.0), h(-1.2, 101.5)], true, 0, -3.12);
test('pier: along the landing toward the west bench', [h(-1.2, 108.0), h(-8, 108.0), h(-14, 107.9)], true, -2.28, -2.28);
test('pier: the west bench blocks', [h(-14, 108.2), h(-14, 106.9)], false, null, -2.28);
test('pier: the shelf beside the flight is closed (railing)', [h(-16, 101.5), h(-16, 105.2)], false);
test('pier: the west pedestal is solid', [h(-23.5, 103.5), h(-23.5, 108)], false);
test('pier: the east pedestal is solid', [h(21.1, 103.5), h(21.1, 108)], false);
test('pier: past the pedestals on the pavement', [h(-30, 102), h(26, 102)], true, 0);
test('pier: the east lamp column blocks (and the railing beside it)', [h(10.35, 102.5), h(10.35, 106.4)], false);
// ---- the garden: the two open west gates, the closed east gates, the fence
test('garden: through the open NW gate (n1271391440) into the garden', [h(-74, -62.4), h(-66, -62.4)], true, 0);
test('garden: the west fence from the street is closed', [h(-74, -100), h(-66, -100)], false);
test('garden: through the open gate n7164825502', [h(-74, -201.2), h(-66, -201.2)], true, 0);
test('garden: the closed east gate n1271391438 blocks', [h(71, -62.0), h(64, -62.0)], false);
test('garden: the closed gate n7161087550 blocks', [h(70, -155.0), h(63, -155.0)], false);
test('garden: the open east gate n1271391439 passes', [h(70, -168.7), h(63, -168.7)], true, 0);
test('garden: the path from the west gate along the Academy rear and down to the column', [h(-66, -62.4), h(-20, -62.4), h(30, -62.4), h(30, -83), h(10, -110), h(2, -121)], true, 0);
test('garden: the column pedestal blocks', [h(-1.6, -128), h(-1.6, -118)], false);
test('garden: an arc at 5.6 m round the north side of the column is open', [h(4.0, -122.3), h(2.4, -126.3), h(-1.6, -127.9), h(-5.6, -126.3), h(-7.2, -122.3)], true, 0);
test('garden: Klodt pedestal blocks', [h(47.6, -167), h(47.6, -161)], false);
test('garden: Khetagurov pedestal blocks', [h(-44.9, -150), h(-44.9, -144)], false);
test('garden: the pavilion portico is solid', [h(-1.9, -165), h(-1.9, -176)], false);
test('garden: the Mosaic workshop blocks', [h(36, -95), h(56, -95)], false);
// ---- added by review-academy 2026-10-08: the other masses of the module are solid too (east flank, Cherkassky house, Dom Akademikov) and every garden gate walks
test('flank: the wall on the 2-3 lines street side blocks', [h(75, 0), h(66, 0)], false);
test('square: the Cherkassky house (banner front) blocks', [h(-160, 38), h(-160, 30)], false);
test('dom: the House of Academicians front wall blocks (beside the portico)', [h(-264, 26), h(-264, 14)], false);
test('dom: the portico columns are solid', [h(-286.6, 24), h(-286.6, 17)], false);
test('dom: the pavement in front of the Dom is open', [h(-300, 26), h(-262, 26)], true, 0);
test('garden: the fence beside the open NW gate blocks (not only the gate gap)', [h(-74, -70), h(-66, -70)], false);
test('garden: the east fence of the Mosaic yard (n7161087553 side) blocks', [h(71, -95), h(64, -95)], false);
// ---- the visuals that the probe cannot walk: the garden alleys and the fence sections are really drawn
{
  const S0 = ctx.services.landmarksAcademy, gp = S0.gardenPaths || { ways: 0, quads: 0 }, fc = S0.fence || { drawn: 0, dropped: 0 };
  const okPaths = gp.ways >= 12 && gp.quads >= 150, okFence = fc.drawn >= 90 && fc.dropped <= fc.drawn * 0.2;      // ~335 m of fence in 3 m sections: 99 drawn, 12 left out on the asphalt stubs of the gates
  console.log((okPaths ? 'ok   ' : 'FAIL ') + `garden: gravel alleys drawn (${gp.ways} mapped footways, ${gp.quads} quads)`); all &&= okPaths;
  console.log((okFence ? 'ok   ' : 'FAIL ') + `garden: fence sections drawn ${fc.drawn}, left out on asphalt ${fc.dropped}`); all &&= okFence;
}
// ---- Trezzini Square
test('square: round the Trezzini monument at 3.8 m', [h(-148.4, 49), h(-144.6, 52.8), h(-140.8, 49)], true, 0);
test('square: the monument plinth blocks', [h(-144.6, 53), h(-144.6, 45)], false);
test('square: the hotel wall blocks', [h(-135, 38), h(-135, 30)], false);
test('square: the entrance gap in the railing leads to the door', [h(-134.6, 44), h(-134.6, 36)], true, 0);
const S = ctx.services.landmarksAcademy;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'gates', S.gates.length, 'fences', S.fences.length, 'benches', S.benches.length, 'trees', S.trees.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts), 'failed', JSON.stringify(S.failed || []));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
