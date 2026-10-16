// tools/landmarksVOStatues-geom.mjs - headless geometry audit of landmarksVOStatues (no GPU): per piece the world bounding box, the lowest point (floating > 0.03 m / sunken < -0.05 m), triangles whose winding
// disagrees with the stored vertex normal (inverted faces), NaN / degenerate triangles, and the colliders next to the piece compared with the drawn footprint.
// usage: node tools/landmarksVOStatues-geom.mjs [--only key,key] [--json out.json]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };

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
ctx.buildList = ['landmarksVOStatues'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksVOStatues.js')).href);
await mod.build(ctx);
const svc = ctx.services.landmarksVOStatues, ph = ctx.physics;
const grp = ctx.staticRoot.children.find((c) => c.name === 'landmarksVOStatues');
const only = opt('only') ? new Set(opt('only').split(',')) : null;
const rows = {};
const v0 = new THREE.Vector3(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), fn = new THREE.Vector3(), vn = new THREE.Vector3();
for (const m of grp.children) {
  const key = m.name.replace(/^vos-/, ''); if (only && !only.has(key)) continue;
  const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, idx = g.index, R = rows[key] || (rows[key] = { key, bbox: new THREE.Box3(), tris: 0, inv: 0, deg: 0, nan: 0, meshes: 0, minYofParts: [] });
  m.updateMatrixWorld(true); R.meshes++;
  const bb = new THREE.Box3().setFromBufferAttribute(pa).applyMatrix4(m.matrixWorld); R.bbox.union(bb);
  const nt = idx ? idx.count / 3 : pa.count / 3;
  for (let t = 0; t < nt; t++) {
    const a = idx ? idx.getX(t * 3) : t * 3, b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1, c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    v0.fromBufferAttribute(pa, a); v1.fromBufferAttribute(pa, b); v2.fromBufferAttribute(pa, c);
    if (![v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z].every(Number.isFinite)) { R.nan++; continue; }
    e1.subVectors(v1, v0); e2.subVectors(v2, v0); fn.crossVectors(e1, e2); const area = fn.length() / 2; R.tris++;
    if (area < 1e-9) { R.deg++; continue; }
    fn.normalize();
    vn.set(0, 0, 0); for (const i of [a, b, c]) { vn.x += na.getX(i); vn.y += na.getY(i); vn.z += na.getZ(i); }
    if (vn.dot(fn) < -0.2 * vn.length()) R.inv++;
  }
}
const items = ph.items.filter((i) => i.type === 'box' || i.type === 'cyl');
let bad = 0;
for (const R of Object.values(rows)) {
  const p = svc.parts[R.key] || {}, b = R.bbox, sx = b.max.x - b.min.x, sz = b.max.z - b.min.z, h = b.max.y;
  const near = items.filter((i) => Math.hypot(i.cx - p.x, i.cz - p.z) < Math.max(sx, sz) / 2 + 1.5);
  const colH = near.length ? Math.max(...near.map((i) => (i.type === 'box' ? i.y1 : i.y1))) : 0, colW = near.length ? near.map((i) => i.type === 'cyl' ? `c${(i.r * 2).toFixed(1)}` : `${(i.hw * 2).toFixed(1)}x${(i.hd * 2).toFixed(1)}`).join('+') : 'none';
  const flags = [];
  if (b.min.y > 0.03) flags.push('FLOATS ' + b.min.y.toFixed(2));
  if (b.min.y < -0.06) flags.push('SUNK ' + b.min.y.toFixed(2));
  if (R.inv / Math.max(1, R.tris) > 0.02) flags.push(`INVERTED ${(100 * R.inv / R.tris).toFixed(1)}%`);
  if (R.nan) flags.push('NaN ' + R.nan);
  if (R.deg / Math.max(1, R.tris) > 0.05) flags.push(`DEGEN ${(100 * R.deg / R.tris).toFixed(1)}%`);
  if (!near.length && p.id) flags.push('NO COLLIDER');
  console.log(R.key.padEnd(18), `size ${sx.toFixed(1)}x${sz.toFixed(1)}x${h.toFixed(1)}`.padEnd(24), `tris ${String(R.tris).padStart(5)}`, `col h ${colH.toFixed(2)} [${colW}]`.padEnd(34), flags.join('  '));
  R.flags = flags; if (flags.length) bad++;
}
if (opt('json')) fs.writeFileSync(opt('json'), JSON.stringify(Object.values(rows).map((R) => ({ key: R.key, tris: R.tris, inv: R.inv, deg: R.deg, bbox: [R.bbox.min.toArray(), R.bbox.max.toArray()], flags: R.flags })), null, 1));
console.log(bad ? `GEOM: ${bad} piece(s) flagged` : 'GEOM OK', `(${Object.keys(rows).length} pieces)`);
process.exit(0);
