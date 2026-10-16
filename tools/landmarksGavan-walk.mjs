// tools/landmarksGavan-walk.mjs - headless walk probe of landmarksGavan (no GPU, only the module's own colliders; the environment quay is not built): the Shkipersky bridge (footway, roadway, the divider rail under
// the truss, the truss and the outer rails stop a walker), the canal promenade (the lawn strip is open, the fence, the cross fence at the MChS corner and the Priboy wall stop), the gate, both kronshpitses, the steam crane
// (fence, post), the water tower, the guardhouse (lawn open, walls solid), the workers' town (the gated passage G-A, the courtyard A-B, the slab walls), the fire reserve (yard open, the garage front solid) and the church
// (walls solid, the hoarding).
// usage: node tools/landmarksGavan-walk.mjs
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
// ---- walkability of landmarksGavan
ctx.buildList = ['landmarksGavan'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksGavan.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksGavan/frame.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.08)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const at = (Fr, u, v) => { const p = Fr.W(u, v); return [p.x, p.z]; };
const B = F.FB, C = F.FC, K = F.FK, R = F.FR, T = F.FT, G = F.FG, W = F.FW, FF = F.FF, M = F.FM;
// ---- the Shkipersky bridge (deck 0.12)
test('bridge: along the footway (north side) from bank to bank', [at(B, -21, -3.1), at(B, 21, -3.1)], true);
test('bridge: along the roadway from bank to bank', [at(B, -21, 1.0), at(B, 21, 1.0)], true);
test('bridge: the deck is a floor over the water (feet y 0.12 mid-span)', [at(B, -21, 1.0), at(B, 0, 1.0)], true, 0.12);
test('bridge: off the north edge (W-beam, truss)', [at(B, 0, -3.1), at(B, 0, -6)], false);
test('bridge: off the south edge (truss, rail)', [at(B, 0, 1.0), at(B, 0, 6)], false);
test('bridge: through the divider rail under the truss', [at(B, 0, -3.1), at(B, 0, 1.0)], false);
test('bridge: the divider is open beyond the truss (approach span)', [at(B, 15, -3.1), at(B, 15, 1.0)], true);
test('bridge: into the south truss from the roadway', [at(B, 3, 2.5), at(B, 3, 3.9)], false);
// ---- the canal promenade
test('promenade: along the lawn strip (u 17 of the canal frame) from the bridge end to the mouth fence', [at(C, 17, 30), at(C, 17, 400)], true);
test('promenade: through the iron fence to the east', [at(C, 17, 100), at(C, 45, 100)], false);
test('promenade: the cross fence at the MChS corner closes the strip', [at(C, 17, 400), at(C, 17, 425)], false);
test('promenade: the gate stands open (the path enters between the posts)', [[-6986, -13], [-6982, -9.2]], true);
test('promenade: the Priboy wall on the west coping', [at(C, -22, 100), at(C, -12, 100)], false);
// ---- the kronshpitses, the crane, the tower
test('east kronshpits: into the pavilion from the lawn', [at(K, 27, -25), at(K, 27, -14.4)], false);
test('west kronshpits: into the pavilion', [at(K, -30.1, -25), at(K, -30.1, -13.4)], false);
test('east mole stair: down the flight from the lawn to the bottom tread (-3.14)', [at(K, 21.5, -20.8), at(K, 15.95, -20.8)], true, -3.14);
test('east mole stair: the bottom tread ends at the water (nobody steps in)', [at(K, 15.95, -20.8), at(K, 14.2, -20.8)], false);
test('crane: through the fence on the land side', [at(R, -6, 0), at(R, -2, 0)], false);
test('crane: the open water side leads to the post, which is solid', [at(R, 3.6, 0.4), at(R, 0.4, 0.4)], false);
test('water tower: into the base block', [at(T, -3, 10), at(T, -3, 2)], false);
// ---- the guardhouse
test('guardhouse: along the lawn in front of the portico', [at(G, -10, 12), at(G, 10, 12)], true);
test('guardhouse: into the front (walls solid, the steps are decor)', [at(G, 0, 12), at(G, 0, 6)], false);
// ---- the workers' town
test('town: through the gate of the fence between G and A into the passage', [at(W, 25, 9), at(W, 25, -5)], true);
test('town: the fence beside the gate stops', [at(W, 22.5, 9), at(W, 22.5, -5)], false);
test('town: down the passage G-A into the courtyard A-B', [at(W, 25, -5), at(W, 25, -22), at(W, 40, -22)], true);
test('town: along the courtyard A-B', [at(W, 35, -20), at(W, 85, -20)], true);
test('town: into block A from Maly pr.', [at(W, 60, 8), at(W, 60, 0)], false);
test('town: into block B from the courtyard', [at(W, 60, -25), at(W, 60, -38)], false);
// ---- the fire reserve
test('fire reserve: across the open yard', [at(FF, -10, 24), at(FF, -4, 44)], true);
test('fire reserve: into the garage doors', [at(FF, -4, 31), at(FF, 12, 31)], false);
// ---- the church
test('church: into the nave from the south', [at(M, 3, 22), at(M, 3, 5)], false);
{ const mx = -5960.35, mz = 517.55, nx = 0.4945, nz = 0.869; test('church: the hoarding along Bolshoy pr. stops a walker', [[mx + nx * 3, mz + nz * 3], [mx - nx * 3, mz - nz * 3]], false); }
// every photo spot and every crowd disc centre is a free standing place (no collider pushes a walker out of it)
{ const S0 = ctx.services.landmarksGavan; let bad = 0;
  for (const s of [...S0.photoSpots, ...S0.crowd]) { const p = { x: s.x, z: s.z }; ph.resolve(p, 0.35, s.y || 0, 1.7); if (Math.hypot(p.x - s.x, p.z - s.z) > 0.15) { bad++; console.log('FAIL spot inside a collider:', s.name || s.id, s.x, s.z); } }
  console.log((bad ? 'FAIL ' : 'ok   ') + 'photo spots and crowd discs are free standing places (' + (S0.photoSpots.length + S0.crowd.length) + ' checked)'); all &&= !bad; }
const S = ctx.services.landmarksGavan;
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'lamps', S.lamps.length, 'fences', S.fences.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
