// tools/landmarksBotanicalGreenhouses-walk.mjs - headless walk probe of landmarksBotanicalGreenhouses (no GPU, the module alone: ground = layout.js, colliders of the module): every house, block, the museum,
// the vestibule and the Palm House are solid from every side; the Palm House portal steps, the museum door steps and the vestibule bow porch are walkable (the feet rise); the park path outside is open.
// usage: node tools/landmarksBotanicalGreenhouses-walk.mjs
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
ctx.buildList = ['landmarksBotanicalGreenhouses'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksBotanicalGreenhouses.js')).href);
await mod.build(ctx);
const G = await import(pathToFileURL(path.join(root, 'src/world/landmarksBotanicalGreenhouses/geo.js')).href);
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
const pf = (u, v) => G.pf(u, v);
// ---- the Palm House: solid from the four sides; the portal steps are walkable
for (const [name, from, to] of [['south', [0, 30], [0, 0]], ['north', [0, -22], [0, 0]], ['west', [-34, 0], [0, 0]]]) test(`palm: ${name} wall blocks`, [pf(...from), pf(...to)], false);
test('palm: the portal steps (feet rise to 0.28 on the middle step, the wall stops the player at 0.6 m)', [pf(30, -1.1), pf(24.6, -1.1), pf(21.95, -1.1)], true, 0.28);
test('palm: the shut door blocks', [pf(21.9, -1.1), pf(19.0, -1.1)], false, null, 0.28);
test('palm: along the east face outside the portal steps is open', [pf(30, 10), pf(30, -12)], true, 0);
// ---- every solid blocks a walk that starts 25 m outside (away from the complex centre) and ends at its centre; the stop point lies at the building
{
  const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
  const { ringFromFlat } = await import(pathToFileURL(path.join(root, 'src/world/lib/massing.js')).href);
  const C0 = [-1560, -4250];
  for (const id of ['r13561145', 'r13561144', 'r13561143', 'r13561142', 'r13561141', 'r13561140', 'r13561133', 'r13561134', 'r13561135', 'r13561138', 'r13561137', 'r13561148', 'r13561146', 'r13561150', 'r13561136', 'r11491713', 'r19579807', 'r13561126', 'r13561127', 'r13572224', 'r13561493', 'r13561494']) {
    const r = ringFromFlat(L.buildingById(id).polys[0].o), cx = r.reduce((a, p) => a + p[0], 0) / r.length, cz = r.reduce((a, p) => a + p[1], 0) / r.length;
    let dx = cx - C0[0], dz = cz - C0[1]; const l = Math.hypot(dx, dz); dx /= l; dz /= l;
    const x0 = Math.min(...r.map((p) => p[0])) - 3, x1 = Math.max(...r.map((p) => p[0])) + 3, z0 = Math.min(...r.map((p) => p[1])) - 3, z1 = Math.max(...r.map((p) => p[1])) + 3;
    const res = walk([[cx + dx * 40, cz + dz * 40], [cx, cz]]);
    const ok = res.stuck && res.at[0] > x0 - 40 && res.at[0] < x1 + 40;
    console.log((res.stuck ? 'ok   ' : 'FAIL ') + `${id}: a walk from 40 m outside into the centre is stopped` + (res.stuck ? ` at ${res.at.map((v) => v.toFixed(1))}` : ' (WALKED THROUGH)'));
    all &&= res.stuck;
  }
}
test('N1 south wing (vestibule side) blocks', [pf(94, -102), pf(94, -118)], false);
test('N1 apse blocks', [pf(94, -160), pf(94, -146)], false);
test('N1 centre (stepped block) blocks', [pf(115, -130), pf(100, -130)], false);
// ---- museum: door steps
{ const S = ctx.services.botanicalGreenhouses, d = S.museumDoor, n = [d.nx, d.nz];
  test('museum: from the court up the two granite steps', [[d.x + n[0] * 8, d.z + n[1] * 8], [d.x + n[0] * 1.6, d.z + n[1] * 1.6], [d.x + n[0] * 0.62, d.z + n[1] * 0.62]], true, 0.28);
  test('museum: the wall behind the door blocks', [[d.x + n[0] * 1.0, d.z + n[1] * 1.0], [d.x - n[0] * 2.5, d.z - n[1] * 2.5]], false, null, 0.28);
  test('museum: a wall of the long side blocks', [[d.x + n[0] * 6 + -n[1] * 14, d.z + n[1] * 6 + n[0] * 14], [d.x - n[0] * 4 + -n[1] * 14, d.z - n[1] * 4 + n[0] * 14]], false); }
// ---- vestibule bow: the porch (0.28) in front of the columns; the columns and the walls block
{ const c = pf(104.4, -95.3), e = G.EU, up = (r) => [c[0] + e[0] * r, c[1] + e[1] * r];
  test('vestibule: east of the bow, up the porch steps', [up(10), up(4.3), up(3.75)], true, 0.28);
  test('vestibule: the colonnade / door-windows block', [up(3.7), up(1.5)], false, null, 0.28);
  test('vestibule: the body wall blocks from the north', [pf(92, -116), pf(92, -104)], false); }
console.log('colliders', S0().colliders, 'tris', S0().triangles, 'build ms', S0().buildMs, 'parts', JSON.stringify(S0().parts));
function S0() { return ctx.services.botanicalGreenhouses; }
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
