// tools/landmarksKronverk-walk.mjs - headless walk probe of the Kronverk / Alexander Park module (landmarksKronverk): the main gate of the Artillery Museum is open and its south wall, the arsenal and the
// exhibits block; both Artillery bridges carry the walker over the moat mouths (walk decks, parapets block); the steps of the Steregushchy monument, of the Gorkovskaya stylobate, of the Baltic House and
// of the Planetarium are walkable; the fences block except at their gates.
// usage: node tools/landmarksKronverk-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks polylines through ph.resolve / ph.groundHeight like the player)
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
ctx.buildList = ['landmarksKronverk'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKronverk.js')).href);
await mod.build(ctx);
const ph = ctx.physics, svc = ctx.services.landmarksKronverk;
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
// ---- the museum: main gate, south wall, arsenal wall, the court hub, a monument
const g = svc.gates.find((q) => q.key === 'main'), gt = [g.nz, -g.nx];
T([[g.x + g.nx * 10, g.z + g.nz * 10], [g.x - g.nx * 12, g.z - g.nz * 12]], 'main gate of the museum (4.2 m arch)', true);
T([[g.x + gt[0] * 18 + g.nx * 6, g.z + gt[1] * 18 + g.nz * 6], [g.x + gt[0] * 18 - g.nx * 6, g.z + gt[1] * 18 - g.nz * 6]], 'south wall 18 m east of the gate', false);
T([[g.x - gt[0] * 18 + g.nx * 6, g.z - gt[1] * 18 + g.nz * 6], [g.x - gt[0] * 18 - g.nx * 6, g.z - gt[1] * 18 - g.nz * 6]], 'south wall 18 m west of the gate', false);
T([[g.x - g.nx * 12, g.z - g.nz * 12], [-2066, -2318]], 'gate -> court hub', true);
T([[-2054.5, -2385], [-2054.5, -2412]], 'arsenal: the museum front (closed)', false);
T([[-2085, -2320], [-2070, -2330]], 'Kalashnikov monument', false);
T([[-1935, -2350], [-1965, -2350]], 'arsenal east wing from the east yard', false);
// ---- the bridges: along the roadway (open, stays at y 0), across a parapet (blocked)
for (const b of svc.bridges) {
  const t = [Math.cos(b.rotY), -Math.sin(b.rotY)], n = [Math.sin(b.rotY), Math.cos(b.rotY)];
  T([[b.x - t[0] * (b.len / 2 - 1), b.z - t[1] * (b.len / 2 - 1)], [b.x + t[0] * (b.len / 2 - 1), b.z + t[1] * (b.len / 2 - 1)]], b.name + ': along the deck', true, 0, 0);
  T([[b.x - t[0] * (b.len / 2 - 1) + n[0] * (b.w / 2 - 2), b.z - t[1] * (b.len / 2 - 1) + n[1] * (b.w / 2 - 2)], [b.x + t[0] * (b.len / 2 - 1) + n[0] * (b.w / 2 - 2), b.z + t[1] * (b.len / 2 - 1) + n[1] * (b.w / 2 - 2)]], b.name + ': along the pavement', true, 0, 0);
  for (const s of [-1, 1]) T([[b.x, b.z], [b.x + n[0] * s * (b.w / 2 + 3), b.z + n[1] * s * (b.w / 2 + 3)]], b.name + ': parapet ' + (s > 0 ? '+' : '-'), false, 0);
}
// ---- monuments of the park
const mon = (id) => svc.monuments.find((m) => m.id === id);
{ const s = mon('steregushchy'); T([[s.x + 15, s.z - 0.45], [s.x + 3.7, s.z - 0.1]], 'Steregushchy: up both flights to the terrace', true, null, 1.28); T([[s.x + 3.7, s.z - 0.1], [s.x - 3, s.z]], 'Steregushchy: the rock', false, 1.28); T([[s.x - 0.3, s.z + 10], [s.x - 0.3, s.z + 2]], 'Steregushchy: terrace side wall', false); }
{ const o = mon('decembrists'); T([[o.x, o.z + 15], [o.x, o.z]], 'Decembrists obelisk (mound)', false); }
{ const a = mon('architects'); T([[a.x + 8, a.z + 8], [a.x, a.z]], 'Architects group', false); }
// ---- Gorkovskaya: stairs up to the door, the drum is solid
for (const d of [svc.metro.entrance, svc.metro.exit]) {
  T([[d.foot[0] + d.nx * 2, d.foot[1] + d.nz * 2], [d.x + d.nx * 1.5, d.z + d.nz * 1.5]], 'Gorkovskaya ' + d.key + ': stairs to the stylobate', true, null, 1.4);
  T([[d.x + d.nx * 1.5, d.z + d.nz * 1.5], [svc.metro.x, svc.metro.z]], 'Gorkovskaya ' + d.key + ': the drum (closed)', false, 1.4);
}
T([[svc.metro.x + 30, svc.metro.z + 30], [svc.metro.x + 12, svc.metro.z + 12]], 'Gorkovskaya: stylobate wall away from the stairs', false);
// ---- the theatres
{ const e = svc.entrances.find((q) => /Балтийский/.test(q.name)), n = [Math.sin(e.rotY), Math.cos(e.rotY)]; T([[e.x + n[0] * 14, e.z + n[1] * 14], [e.x + n[0] * 1.2, e.z + n[1] * 1.2]], 'Baltic House: steps to the portico', true, null, 1.5); T([[e.x + n[0] * 1.2, e.z + n[1] * 1.2], [e.x - n[0] * 5, e.z - n[1] * 5]], 'Baltic House: front wall', false, 1.5); }
{ const e = svc.entrances.find((q) => /планетарий/.test(q.name)), n = [Math.sin(e.rotY), Math.cos(e.rotY)]; T([[e.x + n[0] * 9, e.z + n[1] * 9], [e.x + n[0] * 0.6, e.z + n[1] * 0.6]], 'Planetarium: steps to the porch', true, null, 0.75); }
// ---- fences: the east yard fence blocks, its gate is open
T([[-1885, -2302], [-1885, -2318]], 'east yard fence on the embankment', false);
{ const gn = [-1852.5, -2311.3]; T([[gn[0] + 0.4, gn[1] + 6], [gn[0] + 0.4, gn[1] - 6]], 'east yard gate', true); }
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
