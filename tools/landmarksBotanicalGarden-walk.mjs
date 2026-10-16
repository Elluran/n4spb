// tools/landmarksBotanicalGarden-walk.mjs - headless walk probe of landmarksBotanicalGarden (no GPU, the module alone: ground = layout.js, colliders of the module): the Institute podium and its 7 treads,
// walls / porch columns / annex / east bay, the Director's House, staff house and ticket pavilion (walls block), the bar fence (blocks) with its open gates (pass) and closed gates (block), the Japanese
// plank bridge (deck y 0.34), the pavilion deck and steps, the gazebo steps and railing, the Peter bust, the Stolypin chain fence, a bench and a lamp.
// usage: node tools/landmarksBotanicalGarden-walk.mjs
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
ctx.buildList = ['landmarksBotanicalGarden'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksBotanicalGarden.js')).href);
await mod.build(ctx);
const mp = (f) => import(pathToFileURL(path.join(root, 'src/world/landmarksBotanicalGarden', f)).href);
const F = await mp('frame.js'), DHm = await mp('director.js'), JPm = await mp('japan.js'), GZm = await mp('gazebo.js'), PBm = await mp('peter.js'), TKm = await mp('ticket.js');
const C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
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
{
  const i = process.argv.indexOf('--near');
  if (i > 0) {          // node tools/landmarksBotanicalGarden-walk.mjs --near x,z,r : the colliders of the module within r metres of (x, z)
    const [nx, nz, nr] = process.argv[i + 1].split(',').map(Number);
    for (const it of ph.items) if (Math.hypot(it.cx - nx, it.cz - nz) < nr) console.log(it.type, 'c', it.cx.toFixed(1), it.cz.toFixed(1), it.r ? 'r ' + it.r : `hw ${it.hw.toFixed(2)} hd ${it.hd.toFixed(2)} rot ${it.rotY.toFixed(2)}`, 'y', it.y0, it.y1 ?? it.top);
    for (const it of ph.items) if (!Number.isFinite(it.cx)) console.log('item without cx:', it.type, Object.keys(it).join(','));
    process.exit(0);
  }
}
let all = true;
const test =(label, pts, open, yEnd, y0 = 0) => {
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.1)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const IB = F.IB, XM = -0.95, Z = 8.4, ib = (x, z) => IB.w(x, z);
// ---- the Institute
test('institute: the alley in front is open', [ib(XM, Z + 45), ib(XM, Z + 15)], true, 0);
test('institute: up the 7 treads to the podium (1.1)', [ib(XM, Z + 15), ib(XM, Z + 4.6 + 3.0), ib(XM, Z + 2.3)], true, 1.1);
test('institute: the door is shut (the wall blocks)', [ib(XM, Z + 2.3), ib(XM, Z - 1.5)], false, null, 1.1);
test('institute: a porch column blocks', [ib(XM - 3.07, Z + 3.5), ib(XM - 3.07, Z + 1.0)], false, null, 1.1);
test('institute: the podium side is a wall from the lawn (1.1 m)', [ib(XM + 9, Z + 2.0), ib(XM + 4, Z + 2.0)], false);
test('institute: the south wing wall blocks', [ib(20, Z + 3), ib(20, Z - 3)], false);
test('institute: the north wing wall blocks', [ib(-25, Z + 3), ib(-25, Z - 3)], false);
test('institute: the east wall blocks', [ib(25, -9.2 - 3), ib(25, -9.2 + 3)], false);
test('institute: the east bay blocks', [ib(0, -16.5), ib(0, -11.0)], false);
test('institute: the south annex end blocks', [ib(46, 0), ib(40, 0)], false);
test('institute: walking round the north end is open', [ib(-46, Z + 6), ib(-46, 0), ib(-46, -9.2 - 6)], true, 0);
// ---- the Director's House, staff house, ticket pavilion
const DH = DHm.DH, dh = (x, z) => DH.w(x, z);
test('director: the lawn in front is open', [dh(-0.4, 40), dh(-0.4, 16)], true, 0);
test('director: the loggia podium blocks (the loggia is closed)', [dh(-0.4, 16), dh(-0.4, 9)], false);
test('director: the side wall blocks', [dh(10, 16), dh(10, 8)], false);
test('staff house lit B: the wall blocks', [[-1721.4 + 8, -4270.8 + 18], [-1721.4 + 3, -4270.8 + 5]], false);
const TK = TKm.TK;
test('ticket pavilion blocks', [TK.w(0, 6), TK.w(0, 0)], false);
// ---- the fence and its gates: a mid-run point of the long south-east way, and every gate the module made
const way = C.BARRIERS.find((b) => b.id === 'w1013078862');
{
  const i = 8, a = [way.pts[i * 2], way.pts[i * 2 + 1]], b = [way.pts[i * 2 + 2], way.pts[i * 2 + 3]], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], l = Math.hypot(b[0] - a[0], b[1] - a[1]), n = [-(b[1] - a[1]) / l, (b[0] - a[0]) / l];
  test('fence: the bar fence blocks (mid-run, from inside to outside)', [[m[0] - n[0] * 4, m[1] - n[1] * 4], [m[0] + n[0] * 4, m[1] + n[1] * 4]], false);
}
const S = ctx.services.landmarksBotanicalGarden;
for (const g of S.gates) {
  const ux = Math.cos(g.rot), uz = -Math.sin(g.rot), nx = -uz, nz = ux;
  test(`gate ${g.id} (${g.closed ? 'closed' : 'open'})`, [[g.x - nx * 4, g.z - nz * 4], [g.x + nx * 4, g.z + nz * 4]], !g.closed, null);
}
// ---- the Japanese garden
const B = JPm.BRIDGE, bz = (k) => B.z0 - B.segs.slice(0, k).reduce((s, q) => s + q.l, 0);
test('japan: onto the plank bridge and across', [[B.xc, B.z0 + 1.5], [B.xc, B.z0 - 1.4], [B.xc + 0.95, bz(1) - 1.35], [B.xc, bz(2) - 1.4], [B.xc, bz(3) - 1.0]], true, 0);
test('japan: the bridge middle is at deck level (0.34)', [[B.xc, B.z0 + 1.5], [B.xc, B.z0 - 1.4], [B.xc + 0.95, bz(1) - 1.35]], true, 0.34);
const JP = JPm.JP_PAV;
test('japan: up the two steps onto the pavilion deck (0.45)', [JP.w(0, 6), JP.w(0, 1.0)], true, 0.45);
test('japan: the pavilion back wall blocks', [JP.w(0, 0), JP.w(0, -3)], false, null, 0.45);
const JP2 = JPm.JP_PAV2;
test('japan: up the step onto the small pavilion deck (0.3)', [JP2.w(0, 5), JP2.w(0, 0.8)], true, 0.3);
test('japan: the small pavilion back post blocks', [JP2.w(0.0, 0), JP2.w(0, -3)], false, null, 0.3);
test('japan: a lantern blocks', [[-1421.8, -4281], [-1421.8, -4283.9]], false);
// ---- the gazebo, the Peter bust, the Stolypin obelisk
const GZ = GZm.GZ;
test('gazebo: up the three steps onto the platform (0.55)', [GZ.w(0, 7), GZ.w(0, 0.5)], true, 0.55);
test('gazebo: the railing blocks (side)', [GZ.w(1, 0), GZ.w(4.5, 0)], false, null, 0.55);
test('peter bust: the trunk blocks', [PBm.PB.w(0, 3), PBm.PB.w(0, -1)], false);
test('stolypin: the chain fence / obelisk block', [[-1335 + 8, -4543.3 + 8], [-1335, -4543.3]], false);
// ---- the furniture
if (S.benches.length) { const b = S.benches[3]; test('a bench blocks', [[b.x + Math.sin(b.rotY) * 3, b.z + Math.cos(b.rotY) * 3], [b.x, b.z]], false); }
if (S.lamps.length) { const l = S.lamps[2]; test('a lamp blocks', [[l.x + 3, l.z], [l.x, l.z]], false); }
console.log('monuments', S.monuments.length, 'entrances', S.entrances.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'gates', S.gates.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
