// tools/landmarksModernVO-walk.mjs - headless walk probe of landmarksModernVO (no GPU, no city): every house is a solid (thin walls round the OSM footprints, courtyard holes included), the pavement in front of
// every facade is open, nobody gets into a yard through a gate (the gates are closed leaves), the photo spots are free standing points.  (Copy of the harness of tools/landmarksSredny-walk.mjs.)
// usage: node tools/landmarksModernVO-walk.mjs
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
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksModernVO'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksModernVO.js')).href);
await mod.build(ctx);
const FRm = await import(pathToFileURL(path.join(root, 'src/world/landmarksModernVO/frame.js')).href);
const { FR } = FRm, ph = ctx.physics;
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
const { GROUPS_LIST } = await import(pathToFileURL(path.join(root, 'src/world/landmarksModernVO/groups.js')).href);
let all = true;
const test = (label, pts, open) => {
  const r = walk(pts), ok = open ? !r.stuck : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ' (open)'));
  all &&= ok;
};
// ---- every house: walking from 6 m in front of the front towards the wall is stopped, walking along the pavement 5 m out is open
const FRONTS = [['SB', [8, 22]], ['SA', [10, 40]], ['EA', [10, 55]], ['EW', [8, 18]], ['ER46', [10, 40, 70]], ['BA', [8, 18]], ['BB', [10, 30, 50]], ['BC', [10, 30, 55]], ['KA', [6, 18]], ['KB', [8, 14]], ['NA', [8, 18, 32]], ['NB', [4, 14]],
  ['ZA', [8, 26]], ['ZB', [8, 30, 38]], ['TM', [20, 60, 100]], ['TB', [8, 30]], ['KL', [8, 18, 30]], ['MA', [8, 20, 36]], ['SF', [6, 14, 22]], ['DE', [8, 17, 30]]];
for (const [name, us] of FRONTS) {
  const F = FR[name];
  for (const u of us) test(`${name} u ${u}: the front wall blocks`, [F.xz(u, 6), F.xz(u, 0.4)], false);
  test(`${name}: the pavement 7 m out is open`, [F.xz(us[0], 7), F.xz(us[us.length - 1], 7)], true);
}
// ---- the yards: a walk from the street to a point inside a courtyard hole is stopped (r2144616, r1537672, r1541864, r1538751 have holes)
const L2 = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
for (const id of ['r2144616', 'r1537672', 'r1541864', 'r1538751']) {
  const b = L2.buildingById(id), p = b.polys[0];
  for (const hole of p.h) {
    let cx = 0, cz = 0; for (let i = 0; i < hole.length; i += 2) { cx += hole[i]; cz += hole[i + 1]; } cx /= hole.length / 2; cz /= hole.length / 2;
    let ox = 0, oz = 0; for (let i = 0; i < p.o.length; i += 2) { ox += p.o[i]; oz += p.o[i + 1]; } ox /= p.o.length / 2; oz /= p.o.length / 2;
    const dx = cx - ox, dz = cz - oz, l = Math.hypot(dx, dz) || 1;
    test(`${id}: the courtyard centre (${cx.toFixed(0)}, ${cz.toFixed(0)}) is not reachable from outside`, [[ox - dx / l * 60, oz - dz / l * 60], [cx, cz]], false);
  }
}
// ---- the claims of groups.js are all drawn: every part of the module produced meshes
const S = ctx.services.landmarksModernVO;
for (const g of GROUPS_LIST) { const k = g.key.replace('modernvo-', ''); const ok = Object.keys(S.parts).some((n) => n === k || (k === 'karlmay' && n === 'karlmay')) || (k === 'borkhov' && S.parts.borkhov); if (!ok) { console.log('FAIL claim without a part: ' + g.key); all = false; } }
for (const sp of S.photoSpots) { const inside = L2.insideBuilding(sp.x, sp.z, 0.4); if (inside) { console.log('FAIL photo spot inside a footprint: ' + sp.name); all = false; } }
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
