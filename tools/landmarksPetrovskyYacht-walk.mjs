// tools/landmarksPetrovskyYacht-walk.mjs - headless walk probe of the Petrovskaya kosa module: the south / east / west / north flights of the yacht-club podium lead to the terrace (y 1.0) and the arcade under the first slab,
// the doors, walls, pillars and annexes are closed; the Standart shed, the cannon and the anchor block; the Rops plot is fenced all round; the Savina portico steps lead to the porch (y 0.6), its doors and wings are solid.
// usage: node tools/landmarksPetrovskyYacht-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks polylines through ph.resolve / ph.groundHeight like the player)
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksPetrovskyYacht'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht.js')).href);
await mod.build(ctx);
const ph = ctx.physics, svc = ctx.services.landmarksPetrovskyYacht;
/** walk a polyline like the player: returns { stuck, fell, x, z, y, far } (fell = the ground dropped more than 1.3 m in one step: the water bed) */
const go = (pts, y0 = null) => {
  const p = { x: pts[0][0], z: pts[0][1] }; let feet = y0 ?? ph.groundHeight(p.x, p.z, 1.0, false), far = 0;
  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s], b = pts[s + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1));
    for (let i = 1; i <= n; i++) {
      const tx = a[0] + (b[0] - a[0]) * i / n, tz = a[1] + (b[1] - a[1]) * i / n; p.x = tx; p.z = tz; ph.resolve(p, 0.4, feet, 1.7);
      if (Math.hypot(p.x - tx, p.z - tz) > 0.15) return { stuck: true, fell: false, x: p.x, z: p.z, y: feet, far };
      const g = ph.groundHeight(p.x, p.z, feet, false);
      if (!(g > feet - 1.3)) return { stuck: false, fell: true, x: p.x, z: p.z, y: g, far };
      feet = g; far += 0.1;
    }
  }
  return { stuck: false, fell: false, x: p.x, z: p.z, y: feet, far };
};
let all = true;
const T = (pts, label, expectOpen, y0 = null, yEnd = null) => {
  const r = go(pts, y0), ok = expectOpen ? (!r.stuck && !r.fell && (yEnd === null || Math.abs(r.y - yEnd) < 0.6)) : r.stuck;
  if (!ok && expectOpen && r.stuck) {
    const hit = ph.items.filter((it) => { if (it.type === 'hole' || it.type === 'walk' || it.type === 'ramp') return false; if (it.type === 'cyl') return Math.hypot(it.cx - r.x, it.cz - r.z) < it.r + 0.9; const dx = r.x - it.cx, dz = r.z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; return Math.abs(lx) < it.hw + 0.9 && Math.abs(lz) < it.hd + 0.9; });
    for (const it of hit.slice(0, 4)) console.log('     in the way:', it.type, it.cx.toFixed(1), it.cz.toFixed(1), it.type === 'cyl' ? 'r ' + it.r : 'w ' + (it.hw * 2).toFixed(2) + ' d ' + (it.hd * 2).toFixed(2), 'y', it.y0, it.y1);
  }
  console.log((ok ? 'ok   ' : 'FAIL ') + label + ' -> ' + (r.stuck ? 'blocked' : r.fell ? 'FELL' : 'open') + ' at ' + r.x.toFixed(1) + ',' + r.z.toFixed(1) + ' y ' + (Number.isFinite(r.y) ? r.y.toFixed(2) : r.y));
  all = ok && all; return r;
};
// ---- the module's own frames
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht/frame.js')).href);
const ST = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht/standart.js')).href);
const RP = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht/rops.js')).href);
const SV = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht/savina.js')).href);
const W = (lx, lz) => { const p = F.mainWorld(lx, lz); return [p.x, p.z]; };
const A = F.POD.A, B = F.POD.B;
// ---- main building: the south flight, the arcade of the west side, the closed doors and walls, the podium faces
T([W(3.5, 34), W(3.5, 19)], 'main: south entrance, up the two flights to the terrace (y 1.0)', true, 0, 1.0);
T([W(3.5, 19), W(3.5, 14)], 'main: the entrance door is closed (wall)', false, 1.0);
T([W(-12, 34), W(-12, 20)], 'main: podium face away from the steps blocks', false, 0);
T([W(-34, 3.3), W(-27, 3.3), W(-18.25, 3.3), W(-18.25, 15)], 'main: west flight and along the arcade between pillars and wall', true, 0, 1.0);
T([W(-18.25, 15), W(-14, 15)], 'main: west wall is closed', false, 1.0);
T([W(34, -2.7), W(18.5, -2.7)], 'main: east flight (mapped steps) up to the terrace', true, 0, 1.0);
T([W(-30, -45), W(-30, -30)], 'main: north apron face blocks', false, 0);
T([W(-23.5, -45), W(-23.5, -29)], 'main: north flight at the west end of the north hall', true, 0, 1.0);
T([W(-10, -22), W(-10, -26)], 'main: the glazed north hall is closed (front wall)', false, 1.0);
T([W(-29, -12), W(-24, -12)], 'main: west pavilion wall', false, 1.0);
// ---- the Standart shed and its yard
{ const p = (lx, lz) => { const q = ST.stWorld(lx, lz); return [q.x, q.z]; };
  T([p(0, 14), p(0, 5)], 'Standart: the shed wall is solid', false);
  T([p(-8, 14), p(-8, 4)], 'Standart: the shed wall at the north end is solid', false);
  T([p(6, 14), p(6, 9.5)], 'Standart: the yard beside the wall is open', true);
  T([p(-2.6, 11), p(-2.6, 8.8)], 'Standart: the cannon blocks', false);
  T([p(1.8, 11), p(1.8, 8.8)], 'Standart: the anchor blocks', false); }
// ---- the Rops plot: the fence is closed all round
{ const p = (lx, lz) => { const q = RP.ropWorld(lx, lz); return [q.x, q.z]; };
  T([p(0, 26), p(0, 12)], 'Rops: the fence on the south side', false);
  T([p(-22, -2), p(-8, -2)], 'Rops: the fence on the west side', false);
  T([p(0, -22), p(0, -8)], 'Rops: the fence on the north side', false);
  T([p(22, 0), p(8, 0)], 'Rops: the fence on the east side', false); }
// ---- the Savina Home: the portico steps, closed doors, walls of the wings, the bust and the lamp posts
{ const p = (lx, lz) => { const q = SV.savWorld(lx, lz); return [q.x, q.z]; }, P0 = SV.PORTICO;
  T([p(P0.x + 14, P0.z), p(P0.x + 3.0, P0.z)], 'Savina: courtyard -> portico steps -> porch (y 0.6)', true, 0, 0.6);
  T([p(P0.x + 3.0, P0.z), p(P0.x - 0.6, P0.z)], 'Savina: the entrance door is closed', false, 0.6);
  T([p(P0.x + 12, P0.z - 17), p(-22, P0.z - 17)], 'Savina: the wing walls (north of the portico) are solid', false);
  T([p(-60, -40), p(-45, -40)], 'Savina: the west wall of the spine wing is solid', false);
  T([p(-3.3, 9), p(-3.3, 4.6)], 'Savina: the bust pedestal blocks', false);
  T([p(10, -5), p(3.0, -5)], 'Savina: the fountain bowl blocks', false); }
// ---- Petrovskaya kosa 3/6: the office, the transformer hut and the prefab fence are solid from every side
{ const K3 = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyYacht/kosa3.js')).href);
  const po = (lx, lz) => { const q = K3.officeWorld(lx, lz); return [q.x, q.z]; }, pu = (lx, lz) => { const q = K3.hutWorld(lx, lz); return [q.x, q.z]; };
  T([po(0, -12), po(0, -3)], 'kosa3: the office north wall is solid', false);
  T([po(0, 12), po(0, 3)], 'kosa3: the office south wall is solid', false);
  T([po(-12, 0), po(-3, 0)], 'kosa3: the office west wall is solid', false);
  T([po(12, -3), po(3, -3)], 'kosa3: the office east wall is solid', false);
  T([pu(0, -7), pu(0, -1)], 'kosa3: the hut north wall is solid', false);
  T([pu(0, 7), pu(0, 1)], 'kosa3: the hut south wall (the door) is closed', false);
  T([po(15, -6), po(15, 7)], 'kosa3: the fence between the office and the hut blocks', false);
  T([po(9.3, -6), po(9.3, 7)], 'kosa3: the gate blocks', false);
  T([po(-12, -14), po(-12, 14)], 'kosa3: open ground west of the office', true); }
// ---- the cast-iron fence of the Savina estate (OSM w112174612): solid, but only where it does not stand on a road
T([[-5468, -3330], [-5440, -3330]], 'Savina fence: the west side blocks', false);
T([[-5400, -3290], [-5400, -3250]], 'Savina fence: the north side blocks', false);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
