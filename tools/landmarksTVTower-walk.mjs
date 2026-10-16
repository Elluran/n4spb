// tools/landmarksTVTower-walk.mjs - headless walk probe of landmarksTVTower (no GPU, the module alone: ground = layout.js, colliders of the module): the fenced territory is closed from every side (six fence sides),
// the stone pedestal and the six feet of the trunk block, the open ground round the fence is free, no fall (the ground is flat); stats: services, triangles, build ms.
// usage: node tools/landmarksTVTower-walk.mjs
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
ctx.buildList = ['landmarksTVTower'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksTVTower.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksTVTower/frame.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.1)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const { corner } = F;
const FR = (await import(pathToFileURL(path.join(root, 'src/world/landmarksTVTower/fence.js')).href)).FENCE_R;
const W = (x, z) => F.world(x, z);
const polar = (deg, r) => W(r * Math.sin(deg * Math.PI / 180), -r * Math.cos(deg * Math.PI / 180));      // local bearing (0 = north) and radius -> world
// ---- the territory is fenced: from every side (a corner and a flat) walking in is blocked at the fence
for (const [deg, label] of [[0, 'north corner'], [30, 'north-east flat'], [60, 'east corner'], [90, 'east flat'], [150, 'south-east flat'], [180, 'south corner'], [210, 'south-west flat'], [270, 'west flat'], [330, 'north-west flat']]) {
  const rr = (d) => d % 60 === 0 ? FR : FR * Math.sqrt(3) / 2;           // flats are nearer than the corners
  test(`fence blocks from the ${label}`, [polar(deg, rr(deg) + 6), polar(deg, rr(deg) - 5)], false);
}
test('the open ground outside the fence is free (east side)', [polar(90, FR + 12), polar(90, FR + 4)], true);
test('the pedestal blocks (from inside the fence, between two feet)', [polar(150, 22), polar(150, 3)], false);
for (const d of [30, 90, 150, 210, 270, 330]) test('inside the fence, the ground between the feet is free at bearing ' + d, [polar(d, 12), polar(d, 22)], true);
for (let k = 0; k < 6; k++) { const c = corner(k, F.R_FOOT), a = W(c[0] * 0.75, c[1] * 0.75), b = W(c[0], c[1]); test(`foot ${k} blocks`, [a, b], false); }
const S = ctx.services.landmarksTVTower;
console.log('monuments', S.monuments.length, 'photoSpots', S.photoSpots.length, S.photoSpots.map((p) => `${p.name} (${p.x.toFixed(0)},${p.z.toFixed(0)})`).join('; '));
console.log('tris', S.triangles, 'meshes', S.meshes, 'build ms', S.buildMs, 'failed', S.failed || 'none', 'stages', JSON.stringify(S.stageTris || {}), 'trunk', JSON.stringify(S.trunkTris || {}));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
