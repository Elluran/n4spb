// tools/landmarksYelaginPark-walk.mjs - headless walk probe of landmarksYelaginPark (no GPU, the module alone): the Farnese Hercules, the Kirov bust, the Estradny Theatre (arena, the four
// terraces, the stage steps, the stage walls, arch feet, poles), the vent pavilion, the boat piers (with the pond-edge collider that environment/water.js lays: simulated here, and the pier gate
// the module cuts), the passenger dock and the bear.  Walks a polyline in 0.1 m steps with the player radius 0.35 (physics.resolve + groundHeight): ok = open, FAIL otherwise.
// usage: node tools/landmarksYelaginPark-walk.mjs      (YPARK_FORCE=stage2 builds the open stage too)
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
const { parkPonds } = await import(pathToFileURL(path.join(root, 'src/world/environment/river.js')).href);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksYelaginPark'];
// the pond-edge colliders of environment/water.js (0.4 m thick, y -2 .. 1.25 along every pond outline) round the two ponds of the piers: the same code, so the pier gates are tested for real
for (const pd of parkPonds()) {
  const o = pd.o, m = o.length / 2;
  if (!o.some((v, i) => i % 2 === 0 && (Math.hypot(v + 5546, o[i + 1] + 5409) < 80 || Math.hypot(v + 4871, o[i + 1] + 4967) < 80))) continue;
  for (let i = 0; i < m; i++) { const j = (i + 1) % m, dx = o[j * 2] - o[i * 2], dz = o[j * 2 + 1] - o[i * 2 + 1], l = Math.hypot(dx, dz); if (l > 0.05) ctx.physics.addBox((o[i * 2] + o[j * 2]) / 2, (o[i * 2 + 1] + o[j * 2 + 1]) / 2, l + 0.3, 0.4, Math.atan2(-dz, dx), -2, 1.25); }
}
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginPark.js')).href);
await mod.build(ctx);
const ph = ctx.physics, S = ctx.services.landmarksYelaginPark;
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
const ring = (cx, cz, r, n = 24, a0 = 0) => Array.from({ length: n + 1 }, (_, i) => [cx + Math.cos(a0 + i / n * Math.PI * 2) * r, cz + Math.sin(a0 + i / n * Math.PI * 2) * r]);
const along = (c, rotY, u, v) => [c[0] + Math.cos(rotY) * u + Math.sin(rotY) * v, c[1] - Math.sin(rotY) * u + Math.cos(rotY) * v];   // the frame of a figure placed with P.push(x, 0, z, rotY): u = local x, v = local z

// ---- Hercules
const H = S.hercules;
test('Hercules: a ring at 2.2 m round the plinth is open', ring(H.x, H.z, 2.2), true, 0);
test('Hercules: the plinth blocks (from the front)', [along([H.x, H.z], H.rotY, 0, 3), along([H.x, H.z], H.rotY, 0, 0)], false);
test('Hercules: the plinth blocks (from the back)', [along([H.x, H.z], H.rotY, 0, -3), along([H.x, H.z], H.rotY, 0, 0)], false);
// ---- Kirov
const K = S.kirov;
test('Kirov: a ring at 2.0 m is open', ring(K.x, K.z, 2.0), true, 0);
test('Kirov: the stele blocks', [along([K.x, K.z], K.rotY, 0, 3), along([K.x, K.z], K.rotY, 0, 0)], false);
test('Kirov: the salvia bed is walkable (a flowerbed, no wall)', [along([K.x, K.z], K.rotY, -3, 3.4), along([K.x, K.z], K.rotY, 3, 3.4)], true, 0);
// ---- vent
const V = S.vent;
test('Vent: a ring at 5.3 m is open', ring(V.x, V.z, 5.3), true, 0);
test('Vent: the wall blocks', [[V.x + 7, V.z], [V.x, V.z]], false);
// ---- theatre
if (S.theatre) {
  const T = S.theatre;
  test('Theatre: across the arena from the stage steps to the east canopy is open', [[-5233, -5356.5], [-5228, -5348], [-5224, -5345]], true, 0);
  test('Theatre: from the arena up the four terraces of the east canopy (y 0.15 .. 0.90)', [[-5222, -5344.5], [-5218.4, -5344.5], [-5216.4, -5344.5], [-5214.6, -5344.5], [-5212.8, -5344.5]], true, 0.9);
  test('Theatre: from the arena up the terraces of the north canopy', [[-5232, -5333], [-5232, -5330], [-5232, -5326.8], [-5232, -5325.2], [-5232, -5323.6], [-5232, -5322.0]], true, 0.9);
  test('Theatre: the stage deck is entered only by the steps (the front edge blocks at 1.05 m)', [[-5242, -5349.5], [-5246, -5349.5]], false);
  const st = [[-5236.3, -5357.5], [-5249.2, -5339.1]];             // the two step positions are near the ends of the apron arc; a pole at the lip blocks
  void st;
  const pp = T.polePos[3], af = T.archFeet[1];
  test('Theatre: a pole under the lip blocks', [[pp[0] - 1.5, pp[1] - 1.5], pp], false);
  test('Theatre: an arch foot blocks', [[af[0] + 1.6, af[1] + 1.6], af], false);
  test('Theatre: along the front of the stage deck (the arena side) is open', [[-5235.4, -5354.3], [-5236.8, -5350.6], [-5238.6, -5347.1], [-5241.2, -5343.4], [-5244.3, -5340.1]], true, 0);
}
// ---- piers
const P = S.piers;
if (P) {
  test('Boat rental: from the south bank along the trunk to the T-bar (gate cut in the pond edge)', [[-5537.4, -5379], [-5537.4, -5390], [-5537.1, -5410], [-5536.8, -5415.2]], true, 0.15);
  test('Boat rental: along the T-bar to its east end', [[-5536.8, -5416.5], [-5520, -5416.4]], true, 0.15);
  test('Boat rental: the water beside the trunk is closed (rail collider)', [[-5537.4, -5400], [-5533.5, -5400]], false, null, 0.15);
  test('Catamaran base: from the east bank along the pier', [[-4849, -4967.4], [-4858, -4967.4], [-4888, -4966.7]], true, 0.15);
  test('Catamaran base: the water beside the pier is closed', [[-4870, -4967], [-4870, -4960]], false, null, 0.15);
}
if (S.dock) { const D = S.dock; test('Dock: a walk along the pontoon (from its middle)', [[D.x - 4, D.z - 3], [D.x + 4, D.z + 3.2]], true, D.top, D.top); }
// ---- bear
const B = S.bear;
test('Bear: a ring at 1.2 m is open', ring(B.x, B.z, 1.2), true, 0);
test('Bear: the figure blocks', [[B.x + 1.5, B.z], [B.x, B.z]], false);
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'triangles', S.triangles, 'buildMs', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
