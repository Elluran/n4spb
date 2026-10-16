// tools/landmarksSeaTerminal-walk.mjs - headless walk probe of landmarksSeaTerminal (no GPU; the module alone, so the generic streets / environment colliders are NOT in it): the lot in front of the NE deck and the ground under
// the deck are open up to the podium wall, the mushroom piers, the SE stair block, the NW ramp walls, the closed NW gate, the prism / annex walls, the blue-roofed port shed and the quay closure block; the lift gate is an OPEN
// passage through the port fence (the fence blocks beside it); the D-2 hull, the pavilion, the cradles, the rudder and the stone drum block, the yard is open, the plot fence / hedge / Lenexpo hoarding and its closed gates block;
// the torpedo-boat plinth and the lawn chain block and the brick footpath is open.  Every published photo spot must be on land (not in a waterway polygon) and not inside a collider.
// usage: node tools/landmarksSeaTerminal-walk.mjs
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
let audio; try { audio = createAudio(); } catch (e) { console.log('audio createAudio() threw:', e.message); audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksSeaTerminal'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksSeaTerminal.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksSeaTerminal/frame.js')).href);
const ph = ctx.physics, T = F.T, D = F.D, B = F.B;
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
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const t = (u, v) => { const p = T.W(u, v); return [p.x, p.z]; };
const d = (a, b) => { const p = D.W(a, b); return [p.x, p.z]; };
const bo = (a, b) => { const p = B.W(a, b); return [p.x, p.z]; };

// ---- the terminal
test('lot: along the Jersey-barrier row in front of the deck (v -30)', [t(8, -30), t(112, -30)], true, 0);
test('lot: from the lot in under the deck up to the podium wall (between two Jersey barriers)', [t(53.3, -26), t(53.3, -2)], true, 0);
test('lot: a Jersey barrier blocks (row v -23)', [t(8, -27), t(8, -19)], false);
test('lot: along the whole undercroft (v -9)', [t(6, -9), t(98, -9)], true, 0);
test('podium wall: the NE face blocks', [t(46, -3), t(46, 5)], false);
test('pier: a mushroom pier blocks (u 59.2, v -16.5)', [t(59.2, -20), t(59.2, -13)], false);
test('pier: 3 m beside it is open', [t(62.4, -20), t(62.4, -6)], true, 0);
test('SE stair block blocks (nobody climbs to the deck)', [t(104, -22), t(104, -9)], false);
test('NW ramp: the ramp walls / body block (nobody walks up)', [t(-8, -46), t(8, -46)], false);
test('NW ramp: the closed gate at the foot blocks the carriageway', [t(0, -80), t(0, -66)], false);
test('NW end: along the outside of the NW wall (u -4, v 2 .. 52)', [t(-4, 2), t(-4, 52)], true, 0);
test('NW end: into the NW wall', [t(-6, 28), t(2, 28)], false);
test('SE end: into the annex wall', [t(125, 28), t(114, 28)], false);
test('SE end: along the annex outside', [t(122, 2), t(122, 54)], true, 0);
test('SW: the apron undercroft is part of the closed outline (the wall stands at its outer edge v 66.9)', [t(50, 73), t(50, 60)], false);
test('quay: the NW closure fence blocks the strip (u -6)', [t(-12, 70), t(2, 70)], false);
// the port fence and the lift gate
const lift = [-6486.9, 540.0];
test('lift gate: the passage is open (N -> S through the gate)', [[lift[0], lift[1] - 9], [lift[0], lift[1] + 9]], true);
test('port fence: blocks beside the gate', [[-6420, 590], [-6430, 620]], false);
// the shed
const sh = ctx.services.landmarksSeaTerminal.shed;
if (sh) test('port shed: the walls block', [[sh.centre[0] + 30, sh.centre[1] - 4], [sh.centre[0] - 5, sh.centre[1] - 4]], false);
else { console.log('FAIL port shed not built'); all = false; }

// ---- the D-2
test('D-2: the hull stands on its cradles (2.3 m clearance): a walker passes under the keel between them', [d(8, 0), d(-3, 0)], true, 0);
test('D-2: the pavilion wall blocks', [d(-4, 0), d(-16, 0)], false);
test('D-2: the stern rudder blocks', [d(2, -37.2), d(-2, -37.2)], false);
test('D-2: a cradle blocks (the first at frame D (-4.1, 8.0))', [d(-4.1, 12), d(-4.1, 4)], false);
test('D-2 yard: along the SE footway beside the hull (x +8, z -30 .. +30)', [d(8, -30), d(8, 30)], true, 0);
test('D-2 yard: along the NNW path behind the pavilion (x -22)', [d(-22, -40), d(-22, 20)], true, 0);
test('D-2: the foundation stone drum blocks', [d(-32.9 - 3, -4.8), d(-32.9, -4.8)], false);
test('D-2: a ring round the stone at r 2.6 is open', [d(-32.9 + 2.6, -4.8), d(-32.9, -4.8 + 2.6), d(-32.9 - 2.6, -4.8), d(-32.9, -4.8 - 2.6), d(-32.9 + 2.6, -4.8)], true, 0);
test('D-2: the hedge along the SE side blocks', [[-6580, -42], [-6590, -58]], false);
test('D-2: the open gate at (-6593.6, -101.6) lets the path through', [[-6593.6, -108], [-6593.6, -95]], true, 0);
test('D-2: the yard fence blocks beside the gate', [[-6575, -112], [-6575, -98]], false);

// ---- the torpedo boat
test('boat: through the plinth', [bo(6, 0), bo(0, 0)], false);
test('boat: through the lawn chain (ESE side)', [bo(6, 3), bo(3, 3)], false);
test('boat: the brick footpath along the ESE side is open', [bo(6.1, -12), bo(6.1, 12)], true, 0);
test('boat: a ring round the lawn at 6 m (beyond the chain, E side) is open at the bow end', [bo(8.3, 14), bo(0, 16), bo(-8, 14)], true, 0);

// ---- Lenexpo hoarding
test('Lenexpo: the hoarding blocks (W side)', [[-6747.9, 155], [-6738.1, 157]], false);
test('Lenexpo: the hoarding blocks (E side)', [[-6420, 229], [-6410, 227]], false);
test('Lenexpo: the closed main gate blocks (-6479.2, 47)', [[-6450, 47], [-6500, 47]], false);
// ---- photo spots: on land and not inside a collider
const S = ctx.services.landmarksSeaTerminal;
const spots = S.photoSpots || [];
for (const sp of spots) {
  const p = { x: sp.x, z: sp.z }; ph.resolve(p, 0.35, 0, 1.7);
  const moved = Math.hypot(p.x - sp.x, p.z - sp.z), water = L.inRiver(sp.x, sp.z), edge = L.shoreDist(sp.x, sp.z);
  const ok = !water && moved < 0.1;
  console.log((ok ? 'ok   ' : 'FAIL ') + `photo spot ${sp.name} (${sp.x.toFixed(1)}, ${sp.z.toFixed(1)}): ${water ? 'IN WATER' : 'land'}, shore ${edge.toFixed(1)} m, ${moved < 0.1 ? 'free' : 'inside a collider (moved ' + moved.toFixed(2) + ')'}`);
  all &&= ok;
}
console.log('monuments', S.monuments.length, 'photo spots', spots.length, 'entrances', S.entrances.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
