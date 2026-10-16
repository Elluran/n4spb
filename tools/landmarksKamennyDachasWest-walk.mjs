// tools/landmarksKamennyDachasWest-walk.mjs - headless walk probe of landmarksKamennyDachasWest (no GPU, the module alone): the three closed plots: every fence run, every closed gate and every house is solid, the embankment road and the alley stay open.
// usage: node tools/landmarksKamennyDachasWest-walk.mjs
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
ctx.buildList = ['landmarksKamennyDachasWest'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyDachasWest.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksKamennyDachasWest/frame.js')).href);
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
let all = true, nOk = 0, nAll = 0;
const test = (label, pts, open, quiet = false) => {
  const r = walk(pts), ok = open ? !r.stuck : r.stuck; nAll++; if (ok) nOk++;
  if (!ok || !quiet) console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ' (open)'));
  all &&= ok;
};
const S = ctx.services.landmarksKamennyDachasWest;
const pol = (x, z) => [F.FP.ox + x, F.FP.oz + z];
const fwL = (x, z) => { const q = F.FW.W(x, z); return [q.x, q.z]; };
const fgL = (x, z) => { const q = F.FG.W(x, z); return [q.x, q.z]; };
// ---- houses (walk toward a wall from 4 m outside)
test('polovtsov: the north wing end wall blocks', [pol(10, -45), pol(10, -35)], false);
test('polovtsov: the south wing end wall blocks', [pol(10, 44), pol(10, 34)], false);
test('polovtsov: the bay blocks from the west', [pol(-40, -3), pol(-28, -3)], false);
test('polovtsov: the portico block blocks from the east', [pol(34, 0.6), pol(24, 0.6)], false);
test('gauswald: the court front blocks', [fgL(8, 27), fgL(8, 20)], false);
test('gauswald: the tower blocks', [fgL(30, 19), fgL(24, 19)], false);
test('gauswald: the street front blocks', [fgL(12, -5), fgL(12, 2)], false);
test('follenweider: the NE long wall blocks', [fwL(14, -5), fwL(14, 2)], false);
test('follenweider: the front block blocks', [fwL(15.7, 33), fwL(15.7, 24)], false);
test('follenweider: the porch blocks', [fwL(23, 34), fwL(23, 26)], false);
// ---- fences: across the middle of every segment of every chain (gates are the only openings and are closed too)
let nSeg = 0;
for (const ch of F.CHAINS) {
  for (let i = 0; i + 1 < ch.pts.length; i++) {
    const a = ch.pts[i], b = ch.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    if (L < 6) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = -dz / L, nz = dx / L;
    test(`fence ${ch.id} segment ${i} blocks`, [[mx + nx * 3, mz + nz * 3], [mx - nx * 3, mz - nz * 3]], false, true); nSeg++;
  }
}
console.log('fence segments tested', nSeg);
for (const g of F.GATES) {
  const ch = F.CHAINS.find((c) => c.kind === (g.kind === 'folw' ? 'fol' : g.kind === 'gaub' ? 'gau' : g.kind));
  if (!ch) continue;
  // direction of the chain at the gate: nearest segment
  let best = null;
  for (let i = 0; i + 1 < ch.pts.length; i++) { const a = ch.pts[i], b = ch.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); const s = Math.max(0, Math.min(L, ((g.p[0] - a[0]) * dx + (g.p[1] - a[1]) * dz) / L)); const d = Math.hypot(a[0] + dx / L * s - g.p[0], a[1] + dz / L * s - g.p[1]); if (!best || d < best.d) best = { d, nx: -dz / L, nz: dx / L }; }
  if (best && best.d < 3) test(`gate ${g.id} (${g.kind}) is closed`, [[g.p[0] + best.nx * 3, g.p[1] + best.nz * 3], [g.p[0] - best.nx * 3, g.p[1] - best.nz * 3]], false);
}
console.log('monuments', S.monuments.length, 'photoSpots', S.photoSpots.length, 'tris', Math.round(S.triangles), 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(`${nOk} / ${nAll} ok`);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
