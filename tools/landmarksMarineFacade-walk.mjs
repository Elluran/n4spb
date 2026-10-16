// tools/landmarksMarineFacade-walk.mjs - headless walk probe of landmarksMarineFacade (no GPU): the port is a CLOSED territory, so the probe checks that everything solid IS solid and that the public side stays open:
// the four terminal bodies, the control centre, the security fence runs (crossing at the middle of every piece), the precast walls, the 18 masts, the liner hulls (no walking over the water), the glazed gallery wall,
// the Mayak plinths and the roundabout boulders block; the photo spots, the roundabout island and the gaps of the fence at the carriageways stay open.
// usage: node tools/landmarksMarineFacade-walk.mjs
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
// ---- walkability of landmarksMarineFacade
ctx.buildList = ['landmarksMarineFacade'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksMarineFacade.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMarineFacade/frame.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const S = ctx.services.landmarksMarineFacade;
const ph = ctx.physics, FW = F.FW;
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
const f = (u, v) => { const p = FW(u, v); return [p.x, p.z]; };
// ---- solid bodies: walk from the open side into the building
test('terminal 1: from the road side into the glazed strut side', [f(300, -100), f(300, -55)], false);
test('terminal 1: along the berth side outside the plain wall stays open', [f(290, -8), f(360, -8)], true);
test('terminal 2: into the body from the east access side', [f(-120, 232), f(-60, 232)], false);
test('terminal 3: into the high end from the road (east) side', [f(-140, 645), f(-90, 645)], false);
test('terminal 4: into the body from the road (north) side', [f(373, 962), f(373, 905)], false);
test('control centre: into the cuboid', [f(-70, 424), f(-48, 424)], false);
// ---- the liners: nobody walks over the water (the hull box)
test('liner A: from the quay into the hull', [f(-12, 400), f(8, 400)], false);
test('liner B: from the quay into the hull', [f(160, -12), f(160, 12)], false);
// ---- the glazed quay side of the gallery along the east wall
test('gallery: through the glazed quay-side wall', [f(-12, 100), f(-40, 100)], false);
// ---- masts: a mast pole blocks, a step beside it is free
{ const m = D.MANMADE.filter((q) => q.kind === 'mast' && q.x > -9700 && q.x < -8570 && q.z > -2390 && q.z < -1100)[3];
  test(`mast ${m.id}: through the foot`, [[m.x - 1.5, m.z], [m.x + 1.5, m.z]], false);
  test(`mast ${m.id}: beside the foot`, [[m.x - 1.5, m.z + 1.2], [m.x + 1.5, m.z + 1.2]], true); }
// ---- the roundabout: the island is open lawn, a boulder blocks
test('roundabout: across the lawn island beside the boulders', [[-9577.7 - 6, -1330.5 + 6], [-9577.7 + 0.5, -1330.5 + 6.5], [-9577.7 + 6, -1330.5 + 6]], true);
test('roundabout: through the big boulder', [[-9577.7 + 2.0, -1330.5 + 2.0], [-9577.7 + 5.0, -1330.5 + 2.0]], false);
// ---- the Mayak placeholders
for (const m of [{ x: -8683.7, z: -810.8 }, { x: -8666.9, z: -541.2 }]) {
  test(`Mayak (${m.x}, ${m.z}): through the column`, [[m.x - 2, m.z], [m.x + 2, m.z]], false);
  test(`Mayak (${m.x}, ${m.z}): round the plinth (3 m)`, [[m.x - 3, m.z - 3], [m.x + 3, m.z - 3], [m.x + 3, m.z + 3]], true);
}
// ---- fences: every mesh / guard / wall piece blocks when crossed at its middle (pieces left out on carriageways and at gates are the open gaps)
{
  const ids = new Set(S.fences.map((q) => q.id)); let n = 0, blocked = 0;
  for (const q of S.fences) {
    const [a, b] = q.pts, dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 3) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = -dz / l, nz = dx / l;
    const r = walk([[mx - nx * 2.5, mz - nz * 2.5], [mx + nx * 2.5, mz + nz * 2.5]]); n++; if (r.stuck) blocked++;
  }
  const ok = n > 20 && blocked / n > 0.85;
  console.log((ok ? 'ok   ' : 'FAIL ') + `fences: ${blocked} of ${n} fence segments block when crossed at the middle (${ids.size} ways)`); all &&= ok;
}
// ---- photo spots stand in the open (a small circle round each spot is free)
{
  let bad = 0; for (const s of S.photoSpots) { const r = walk([[s.x - 1, s.z], [s.x + 1, s.z], [s.x, s.z + 1], [s.x, s.z - 1], [s.x, s.z]]); if (r.stuck) { bad++; console.log('  blocked photo spot', s.name, s.x, s.z); } }
  const ok = bad === 0 && S.photoSpots.length >= 8; console.log((ok ? 'ok   ' : 'FAIL ') + `photo spots: ${S.photoSpots.length} spots, ${bad} blocked`); all &&= ok;
}
console.log('counts', JSON.stringify({ ...S.counts, fenceGapLog: undefined }));
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
