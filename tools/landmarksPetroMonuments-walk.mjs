// tools/landmarksPetroMonuments-walk.mjs - headless walk probe of landmarksPetroMonuments (no GPU, the module alone: ground = layout.js, colliders of the module): for every piece with solid colliders a walker that comes from 3 m in front
// of it toward its centre must be BLOCKED (plinths, basins and bodies are solid, nobody walks through a statue); pieces without colliders (splash pad, wall plaques) stay open.  usage: node tools/landmarksPetroMonuments-walk.mjs
// tools/landmarksPetroMonuments-walk.mjs - headless walk probe of landmarksPetroMonuments (no GPU, the module alone: ground = layout.js, colliders of the module): the lawn, the three steps and the stylobate of the south portico
// (0.5 m), the five steps and stylobate of the north portico (1.0 m); the drum wall, the north wall, the columns, the lamp posts and the fences block; the closed door cannot be entered.
// usage: node tools/landmarksPetroMonuments-walk.mjs
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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
ctx.buildList = ['landmarksPetroMonuments'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetroMonuments.js')).href);
await mod.build(ctx);

const ph = ctx.physics, svc = ctx.services.landmarksPetroMonuments;
const FILES = ['busts', 'men', 'men2', 'peter', 'violins', 'small', 'alexander', 'fountains'];
const solid = new Map();
for (const f of FILES) { const m = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetroMonuments/' + f + '.js')).href); for (const p of m.PIECES) solid.set(p.key, p); }
const walk = (a, b, y0 = 0) => {
  const p = { x: a[0], z: a[1] }; let y = y0; const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1);
  for (let i = 1; i <= n; i++) { const t = i / n, tx = a[0] + (b[0] - a[0]) * t, tz = a[1] + (b[1] - a[1]) * t; p.x = tx; p.z = tz; ph.resolve(p, 0.35, y, 1.7); if (Math.hypot(p.x - tx, p.z - tz) > 0.15) return { stuck: true, y, at: [tx, tz] }; const g = ph.groundHeight(p.x, p.z, y, false); if (Number.isFinite(g)) y = g; }
  return { stuck: false, y };
};
// alignment probe: from the local +x / -x / +z / -z side of every box collider the walker must stop at about half the box size + the body radius from the piece centre
let bad = 0;
for (const [key, info] of Object.entries(svc.parts)) {
  const pc = solid.get(key); if (!pc || !pc.solid) continue;
  const cs = Math.cos(info.yaw), sn = Math.sin(info.yaw);
  for (const s of pc.solid) {
    if (s.r !== undefined || s.rot || s.h < 0.9) continue; /* low plinths (< 0.9 m) are stepped onto by design */
    const ox = s.ox || 0, oz = s.oz || 0, cx = info.x + ox * cs + oz * sn, cz = info.z - ox * sn + oz * cs;
    for (const [lx, lz, half] of [[1, 0, s.w / 2], [-1, 0, s.w / 2], [0, 1, s.d / 2], [0, -1, s.d / 2]]) {
      const dirx = lx * cs + lz * sn, dirz = -lx * sn + lz * cs, d0 = half + 2.5;
      const r = walk([cx + dirx * d0, cz + dirz * d0], [cx, cz]);
      if (!r.stuck) { bad++; console.log('ALIGN ' + key + ' dir ' + lx + ',' + lz + ' walked through the box ' + s.w + 'x' + s.d); continue; }
      const dist = Math.hypot(r.at[0] - cx, r.at[1] - cz);
      if (dist < half - 0.1 || dist > half + 0.8 + 3) { /* a larger collider (the base slab) may stop the walker earlier, never later */ bad++; console.log('ALIGN ' + key + ' dir ' + lx + ',' + lz + ' stops ' + dist.toFixed(2) + ' from the centre, expected ' + (half + 0.35).toFixed(2)); }
    }
  }
}
console.log('alignment problems: ' + bad);
let all = true, nBlocked = 0, nOpen = 0;
for (const [key, info] of Object.entries(svc.parts)) {
  const pc = solid.get(key); if (!pc) continue;
  const expect = !!(pc.solid && pc.solid.length) && !pc.wall;
  const d = 3 + (pc.rad || 1);
  const a = [info.x + Math.sin(info.yaw) * d, info.z + Math.cos(info.yaw) * d], b = [info.x, info.z];
  const r = walk(a, b), ok = expect ? r.stuck : !r.stuck;
  if (!ok) { all = false; console.log('FAIL ' + key + (expect ? ' (walked into the piece: feet y ' + r.y.toFixed(2) + ')' : ' (blocked, expected open at ' + (r.at || []).map((v) => v.toFixed(1)) + ')')); }
  if (expect) nBlocked++; else nOpen++;
}
console.log('pieces expected blocked: ' + nBlocked + ', open: ' + nOpen);
console.log(all ? 'WALK OK' : 'WALK FAILED');
process.exit(all ? 0 : 1);
