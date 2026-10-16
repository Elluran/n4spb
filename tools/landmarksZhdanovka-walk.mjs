// tools/landmarksZhdanovka-walk.mjs - headless walk probe of the Zhdanovskaya embankment houses: the fronts of No. 3, 7, 9, 11 are solid (nobody walks through a facade, an arch or a window), the door steps of No. 7 / 11 / 3 and the
// granite step of the left arch of No. 9 can be climbed (y 0.16) and the doors behind them are closed.
// usage: node tools/landmarksZhdanovka-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks polylines through ph.resolve / ph.groundHeight like the player)
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
ctx.buildList = ['landmarksZhdanovka'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksZhdanovka.js')).href);
await mod.build(ctx);
const ph = ctx.physics, svc = ctx.services.landmarksZhdanovka;
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
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksZhdanovka/frame.js')).href);
const frameOf = (key, near) => { const fp = F.footprint(F.HOUSES[key]); return F.edgeFrame(fp.edges[F.edgeNear(fp.edges, near[0], near[1])]); };
const at = (f, lx, lz) => { const p = F.toWorld(f, lx, lz); return [p.x, p.z]; };
const H = { h9: frameOf('h9', [-3552.1, -2366.45]), h7: frameOf('h7', [-3530.05, -2347.8]), e2: frameOf('h11', [-3569.7, -2382.2]), e3: frameOf('h11', [-3596.4, -2409.35]), e4: frameOf('h11', [-3604.7, -2431.8]), t42: frameOf('h3', [-3472.9, -2298.9]), t33: frameOf('h3', [-3437.6, -2280]), t34: frameOf('h3', [-3446.3, -2274.9]) };
const tileOf = (f, pitch = 2.94) => f.len / Math.max(1, Math.round(f.len / pitch));
// ---- the fronts are solid: walk straight at the wall from 3 m out at several points (the piers, the windows, the arches)
for (const [k, f] of Object.entries(H)) for (const q of [0.15, 0.4, 0.65, 0.9]) T([at(f, f.len * q, 3.0), at(f, f.len * q, -0.9)], `${k}: the front at ${Math.round(q * 100)} % is solid`, false);
// ---- No. 9: the arches are closed at the wall plane, the granite step of the left arch is climbable
T([at(H.h9, 2.2, 3.0), at(H.h9, 2.2, 0.8)], 'h9: left arch granite step (y 0.16)', true, 0, 0.16);
T([at(H.h9, 2.2, 0.8), at(H.h9, 2.2, -0.9)], 'h9: the entrance door behind the step is closed', false, 0.16);
T([at(H.h9, 14.8, 3.0), at(H.h9, 14.8, -0.9)], 'h9: the carriage arch is closed at the wall plane', false);
// ---- the door steps
const door = (key, f, axis, pitch, w = 1.4) => { const t = tileOf(f, pitch), cx = (axis + 0.5) * t; T([at(f, cx, 3.0), at(f, cx, 0.8)], `${key}: door step axis ${axis} (y 0.16)`, true, 0, 0.16); T([at(f, cx, 0.8), at(f, cx, -0.9)], `${key}: door axis ${axis} is closed`, false, 0.16); };
door('h7', H.h7, 10, 2.94); door('e2', H.e2, 5); door('e3', H.e3, 4); door('e3', H.e3, 11); door('t42', H.t42, 3); door('t33', H.t33, 3); door('t34', H.t34, 2);
// ---- open ground beside the houses (the pavement is not blocked by the module)
T([at(H.h7, 5, 8), at(H.h7, 25, 8)], 'h7: the pavement 8 m out is open', true);
T([at(H.e3, 5, 8), at(H.e3, 35, 8)], 'h11: the pavement 8 m out is open', true);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
