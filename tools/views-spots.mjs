// tools/views-spots.mjs - dumps the photo spots of every Vasilievsky Island sight module (environment + 16 modules built headless, about 1 min, NODE_OPTIONS=--max-old-space-size=14000).
// usage: node tools/views-spots.mjs out.json   (the views of src/world/layout.js are taken from this list; docs/research/vo-roster.json holds the anchors)
// tools/landmarksAcademy-walk.mjs - headless walk probe of landmarksAcademy (no GPU; derived from landmarksOktyabrsky-walk.mjs): the Academy front pavement, the pier stair (pavement -> landing -> lowest tread -> back),
// the guards (railing, benches, pedestals, lamp columns), the garden gates (two open west gates, closed east gates, the fence), the column, the statues, Trezzini Square (monument, hotel, railing).
// usage: node tools/landmarksAcademy-walk.mjs
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
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio = null;
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const MODS = ['Academy','Menshikov','Mining','Andrew','NavalCorps','Smolensky','SeaTerminal','Sevkabel','Kirova','Makarova','Sredny','Gavan','Pribaltiyskaya','MarineFacade','ModernVO','Oktyabrsky'];
ctx.buildList = ['environment', ...MODS.map((m) => 'landmarks' + m)];
const env = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href); await env.build(ctx);
const out = {};
for (const m of MODS) {
  try { const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarks' + m + '.js')).href); await mod.build(ctx);
    out[m] = (ctx.services['landmarks' + m]?.photoSpots || []).map((s) => ({ name: s.name, x: +s.x.toFixed(1), z: +s.z.toFixed(1), yaw: +(s.yaw ?? 0).toFixed(1), pitch: s.pitch ?? 0, y: s.y }));
  } catch (e) { out[m] = 'ERR ' + e.message; }
}
out.smolenskyPaths = (ctx.services.landmarksSmolensky?.paths || []).map((q) => ({ id: q.id, name: q.name, w: q.width, surface: q.surface, n: q.pts.length, a: q.pts[0], b: q.pts[q.pts.length - 1], pts: q.pts }));
out.marineShips = ctx.services.landmarksMarineFacade?.ships || [];
const fs = await import('node:fs');
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(Object.entries(out).map(([k, v]) => k + ':' + (Array.isArray(v) ? v.length : v)).join(' '));
process.exit(0);
