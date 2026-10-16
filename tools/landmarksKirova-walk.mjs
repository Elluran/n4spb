// tools/landmarksKirova-walk.mjs - headless walk probe of landmarksKirova (no GPU, the module alone): Erarta (forecourt, nine-riser stair, cheek walls, figures, closed doors, flanks),
// the Vasileostrovets garden (fence, gates and side passages, hedges, Roerich platform + pedestal, benches, lamps), the Sobchak monument, the Palace front.  Walks a polyline in 0.1 m steps
// with the player radius 0.35 (physics.resolve + groundHeight): ok = open, FAIL otherwise.   usage: node tools/landmarksKirova-walk.mjs
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
ctx.buildList = ['landmarksKirova'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKirova.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKirova/frame.js')).href);
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
const e = (q, r) => { const p = F.FE.W(q, r); return [p.x, p.z]; };      // Erarta: q' along the front, r' outward
const k = (r, q) => { const p = F.FK.W(r, q); return [p.x, p.z]; };      // frame K: r ENE, q NNW
const d = (r, q) => { const p = F.FD.W(r, q); return [p.x, p.z]; };      // Palace
// ---- Erarta
test('Erarta: along the front on the axis between the lawn strips', [e(-4, 13), e(4, 13)], true, 0);
test('Erarta: up the stair to the landing (round the disc)', [e(2.8, 10), e(2.8, 4), e(0, 1.4)], true, 1.35);
test('Erarta: up the stair into the left tunnel of the portal', [e(-4.3, 6), e(-4.3, 1.4)], true, 1.35);
test('Erarta: the inner pier between two tunnels blocks', [e(-4.3, 1.4), e(0, 1.4)], false, null, 1.35);
test('Erarta: the closed glass doors block', [e(0, 1.4), e(0, -3)], false, null, 1.35);
test('Erarta: a portal pier blocks', [e(-2.2, 6), e(-2.2, 1.5)], false, null, 1.35);
test('Erarta: the cheek wall blocks (from the forecourt)', [e(7, 9), e(7, 3)], false);
test('Erarta: Arta on its plate blocks', [e(7.1, 5.6), e(7.1, 2.6)], false, null, 1.35);
test('Erarta: Era on its plate blocks', [e(-7.1, 5.6), e(-7.1, 2.6)], false, null, 1.35);
test('Erarta: the Mir v kreste disc blocks (from the street side)', [e(-0.5, 14), e(-0.5, 10.4)], false);
test('Erarta: a walk round the disc at 2.2 m is open', [e(-3.2, 14), e(-3.4, 11), e(-3.2, 8)], true, 0);
test('Erarta: the paved plaza is open from the stair foot to the street beside the disc', [e(3, 7), e(3, 27)], true, 0);
test('Erarta: from the plaza onto the lawn strip between two larch rows (the kerb is not a wall)', [e(3, 18), e(12, 18)], true);
test('Erarta: down the stair again', [e(0, 1.5), e(0, 9)], true, 0, 1.35);
test('Erarta: into the south pavilion from the front', [e(-37, 8), e(-37, 1)], false);
test('Erarta: along the south end outside the wall', [e(-48, 6), e(-48, -30)], true, 0);
test('Erarta: into the south flank', [e(-48, -10), e(-40, -10)], false);
test('Erarta: into the rear wall', [e(-10, -42), e(-10, -34)], false);
// ---- Palace
test('Palace: along the front across the square', [d(-30, -45), d(100, -45)], true, 0);
test('Palace: into the front wall of the west wing', [d(-40, -40), d(-40, -30)], false);
test('Palace: into the portal', [d(2, -42), d(2, -30)], false);
// ---- garden: fence and gates
test('garden: the central south gate (3.4 m, leaves swung inward) is open', [k(191.3, -262), k(191.3, -225)], true, 0);
test('garden: the left side passage beside the pavilion is open', [k(188.35, -248), k(188.35, -236)], true, 0);
test('garden: the right side passage is open', [k(194.25, -248), k(194.25, -236)], true, 0);
test('garden: through a gate pavilion', [k(186.1, -247), k(186.1, -238)], false);
test('garden: through a gate column', [k(189.3, -247), k(189.3, -238)], false);
test('garden: the fence blocks (south side)', [k(160, -250), k(160, -236)], false);
test('garden: the fence blocks (west side, Klubny)', [k(130, -100), k(142, -100)], false);
test('garden: the west gate (3 m) is open', [k(130, -63.8), k(142, -63.8)], true, 0);
test('garden: the north gate is open', [k(188.7, 205), k(188.7, 190)], true, 0);
test('garden: the east gate is open', [k(252, 26.4), k(236, 26.4)], true, 0);
// ---- garden: the walk a tourist takes (review 2026-10-09): the main alley w64545157 from the south gate to the north gate, and the second alley w64545144 (the real OSM polylines; both ways run through a gate pavilion at the gate nodes r 186.1 / 196.5: the tourist uses the central gate r 191.3)
// the REAL OSM polylines (data/city.js ROADS), not the dossier's abbreviated vertex lists; the part inside the gate pavilions (q < -228) is replaced by the route through the central gate
const { ROADS } = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const wayK = (id) => { const r = ROADS.find((q) => q.id === id); const out = []; if (r) for (let i = 0; i + 1 < r.pts.length; i += 2) { const m = F.FK.M(r.pts[i], r.pts[i + 1]); out.push([m.a, m.b]); } return out; };
const main = wayK('w64545157'), second = wayK('w64545144');
test('garden: the main alley w64545157 (real polyline), south gate to the north gate, is open', [[191.3, -262], [191.3, -240], [200, -228], ...main.filter(([r, q]) => q > -226)].map(([r, q]) => k(r, q)), true, 0);
test('garden: the second alley w64545144 (real polyline, on its axis) is open', [...second.filter(([r, q]) => q > -226), [182, -232], [188, -236], [191.3, -240]].map(([r, q]) => k(r, q)), true, 0);
test('garden: from the alley onto the Roerich plaza and round the platform', [[201, -85], [196, -75], [176, -75], [176, -50], [196, -52], [208, -70]].map(([r, q]) => k(r, q)), true, 0);
// ---- garden: lawns, Roerich, benches, lamps
test('garden: a lawn hedge blocks', [k(176, -130), k(190, -130)], false);
test('garden: the lawn end is open between two thuja', [k(190.5, -160), k(190.5, -130)], true);
test('garden: a thuja blocks', [k(185.5, -108), k(185.5, -98)], false);
test('garden: onto the Roerich platform (a 0.12 m step)', [k(186, -76), k(186, -63)], true, 0.12);
test('garden: the Roerich pedestal blocks', [k(186, -63), k(186, -57)], false, null, 0.12);
test('garden: a walk round the platform edge at 5.5 m', [k(180.5, -62), k(186, -70), k(192.5, -62)], true);
const B = ctx.services.landmarksKirova.benches[0];
test('garden: a bench blocks', [[B.x - 2.5 * Math.sin(B.rotY), B.z - 2.5 * Math.cos(B.rotY)], [B.x + 0.0 * Math.sin(B.rotY), B.z]], false);
const Lp = ctx.services.landmarksKirova.lamps[0];
test('garden: a lamp post blocks', [[Lp.x - 2, Lp.z], [Lp.x, Lp.z]], false);
// ---- Sobchak
test('Sobchak: through the pedestal', [k(26.4, -263), k(26.4, -254)], false);
test('Sobchak: a ring at 3.0 m round it', [k(29.4, -258.7), k(27.5, -256.6), k(26.4, -255.7), k(25.3, -256.6), k(23.4, -258.7)], true);
const S = ctx.services.landmarksKirova;
if (S.benches.length) { const Be = S.benches.find((b) => F.FE.M(b.x, b.z).b > 8 && F.FE.M(b.x, b.z).b < 30 && F.FE.M(b.x, b.z).a > 15); if (Be) test('Erarta: a bench of the forecourt blocks', [[Be.x - 2.5 * Math.sin(Be.rotY), Be.z - 2.5 * Math.cos(Be.rotY)], [Be.x, Be.z]], false); }
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'trees', S.trees.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
