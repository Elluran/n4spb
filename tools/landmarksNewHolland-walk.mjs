// tools/landmarksNewHolland-walk.mjs - headless walk probe of New Holland island (landmarksNewHolland): the gate, the paths, the Bottle passage, the stairs to the pier and the footbridges are open; the warehouse / Bottle / house walls, the canal banks and the pier edge block.
// usage: node tools/landmarksNewHolland-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks straight lines through ph.resolve like the player)
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
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksNewHolland'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksNewHolland.js')).href);
await mod.build(ctx);
const ph = ctx.physics;
const walk = (x0, z0, x1, z1, label, expectOpen) => {
  const p = { x: x0, z: z0 }; let stuck = false; const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = x0 + (x1 - x0) * t, tz = z0 + (z1 - z0) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } }
  if (stuck && expectOpen) {                                                       // what is in the way?
    const hit = ph.items.filter((it) => { if (it.type === 'hole' || (it.type === 'walk' && it.top <= 0.45) || (it.type === 'box' && it.y1 <= 0.45)) return false; if (it.type === 'cyl') return Math.hypot(it.cx - p.x, it.cz - p.z) < it.r + 0.9; const dx = p.x - it.cx, dz = p.z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; return Math.abs(lx) < it.hw + 0.9 && Math.abs(lz) < it.hd + 0.9; });
    for (const it of hit.slice(0, 4)) console.log('     in the way:', it.type, it.cx.toFixed(1), it.cz.toFixed(1), it.type === 'cyl' ? 'r ' + it.r : 'w ' + (it.hw * 2).toFixed(2) + ' d ' + (it.hd * 2).toFixed(2) + ' rot ' + (it.rotY || 0).toFixed(2), 'y', it.y0, it.y1 ?? it.top);
  }
  const ok = expectOpen ? !stuck : stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (stuck ? ' (blocked at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1) + ')' : ' (open)'));
  return ok;
};
let all = true;
const T = (...a) => { all = !!walk(...a) && all; };
T(-3388, 182, -3375, 196, 'north gate: from the entrance plaza onto the first alley', true);
T(-3500, 337.5, -3596, 337.5, 'through the Bottle: east gate, courtyard, west gate', true);
T(-3500, 352, -3535, 352, 'into the Bottle wall (east side)', false);
T(-3470, 372, -3452, 408, 'into the litera N arcade wall', false);
T(-3482, 345, -3500, 345, 'into the Kuznya', false);
T(-3585, 372, -3606, 348, 'into the Commandant house', false);
T(-3446, 300, -3410, 320, 'into the Kovsh water from the west lawn (quay railing)', false);
T(-3436, 326, -3436, 300, 'along the Kovsh promenade (west side)', true);
{ // the two timber stair flights: from 3 m before the top to the foot, then along the pier strip
  for (const [a, b] of [[[-3411.8, 370.8], [-3406.6, 361.8]], [[-3401.6, 377.1], [-3396.3, 368.2]]]) {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(a[0] - b[0]) / l, (a[1] - b[1]) / l];
    T(a[0] + u[0] * 3, a[1] + u[1] * 3, b[0] - u[0] * 0.8, b[1] - u[1] * 0.8, 'pier stairs (top -> foot)', true);
  }
  T(-3406.6, 361.5, -3386, 374.5, 'along the pier strip', true);
  T(-3392, 372.5, -3396, 348, 'off the pier into the water (edge railing)', false);
}
for (const b of ctx.services.landmarksNewHolland.bridges) {
  const d = [Math.cos(b.rot), -Math.sin(b.rot)], h = b.len / 2 + 3;
  T(b.x - d[0] * h, b.z - d[1] * h, b.x + d[0] * h, b.z + d[1] * h, 'footbridge ' + b.id + ' (' + b.kind + ', ' + b.len.toFixed(0) + ' m)', true);
  const n = [-d[1], d[0]]; T(b.x + n[0] * 8, b.z + n[1] * 8, b.x - n[0] * 8, b.z - n[1] * 8, 'across the water beside bridge ' + b.id + ' (blocked by the rails)', false);
}
T(-3340, 321, -3320, 321, 'along the East canal bank', false);
T(-3310, 335, -3310, 292, 'across the East canal away from a bridge', false);
T(-3398, 385, -3380, 385, 'across the South canal away from a bridge', false);
{ // every mapped footway / service lane of the island is walkable end to end (nothing planted on a path)
  const G = await import(pathToFileURL(path.join(root, 'src/world/landmarksNewHolland/groups.js')).href), D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
  const ids = new Set(G.GROUPS_LIST.find((g) => g.key === 'nh-park').osm); let bad = 0, legs = 0;
  const quiet = console.log; 
  for (const r of D.ROADS) {
    if (!ids.has(r.id) || r.tunnel || r.bridge || (r.layer || 0) > 0 || !['footway', 'service', 'path'].includes(r.hw) || r.pts.length < 4) continue;
    for (let i = 0; i + 3 < r.pts.length; i += 2) { legs++; const p = { x: r.pts[i], z: r.pts[i + 1] }; let stuck = false; const x1 = r.pts[i + 2], z1 = r.pts[i + 3], n = Math.ceil(Math.hypot(x1 - p.x, z1 - p.z) / 0.1); for (let k = 1; k <= n; k++) { const tx = r.pts[i] + (x1 - r.pts[i]) * k / n, tz = r.pts[i + 1] + (z1 - r.pts[i + 1]) * k / n; p.x = tx; p.z = tz; ph.resolve(p, 0.4, 0, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) { stuck = true; break; } } if (stuck) { bad++; if (bad <= 14) { quiet('     path ' + r.id + ' leg ' + (i / 2) + ' blocked at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1)); for (const it of ph.items.filter((q) => q.type !== 'hole' && !(q.type === 'walk' && q.top <= 0.45) && (q.type === 'cyl' ? Math.hypot(q.cx - p.x, q.cz - p.z) < q.r + 0.9 : (() => { const dx = p.x - q.cx, dz = p.z - q.cz, lx = dx * q.c - dz * q.s, lz = dx * q.s + dz * q.c; return Math.abs(lx) < q.hw + 0.9 && Math.abs(lz) < q.hd + 0.9; })())).slice(0, 3)) quiet('        ' + it.type + ' ' + it.cx.toFixed(1) + ',' + it.cz.toFixed(1) + (it.type === 'cyl' ? ' r ' + it.r.toFixed(2) : ' w ' + (it.hw * 2).toFixed(1) + ' d ' + (it.hd * 2).toFixed(1)) + ' y ' + it.y0 + '..' + (it.y1 ?? it.top)); } } }
  }
  console.log((bad === 0 ? 'ok   ' : 'WARN ') + 'footway legs blocked: ' + bad + ' of ' + legs);
}
console.log('benches', ctx.services.landmarksNewHolland.benches.length, 'crowd', ctx.services.landmarksNewHolland.crowd.length, 'entrances', ctx.services.landmarksNewHolland.entrances.map((e) => e.id).join(','), 'tris', ctx.services.landmarksNewHolland.triangles, 'water', ctx.services.landmarksNewHolland.waterMode);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
