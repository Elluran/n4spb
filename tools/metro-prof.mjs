// metro-prof: headless (node) LOAD profile of the metro module, no GPU: what the metro hands to static batching (core/batch2.js) and what stays in memory.
//   node tools/metro-prof.mjs [--qs "?metroatlasskip=0&metroindex=0"] [--json]
// Prints: build ms; source meshes / vertices (and how many are still non-indexed); canvas pixels by painter (file:line < caller) and by key prefix, unused canvases;
// the batch (ms, output meshes, atlas textures / pages, the metro textures kept out of the atlas: metro/release.js keepOutOfAtlas); the release pass simulated after the load
// (orphans / uploaded / kept, metro/release.js); the output meshes of the busiest zones (underground draws). --qs sets location.search for the A/B flags
// (?metroatlasskip=0: metro canvases go into the atlas pages again; ?metroindex=0: no exact vertex sharing, metro/lib.js indexExact).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d; };
const QS = arg('--qs', null), JSON_OUT = argv.includes('--json');
{ const q = QS === null ? '' : QS.startsWith('?') ? QS : '?' + QS; globalThis.location = { search: q, href: 'http://localhost/' + q }; }      // (metro/release.js only runs in a page: it reads location)
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
const stubEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], textContent: '', innerHTML: '', addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, querySelector: () => stubEl(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 1, height: 1 }), setPointerCapture() {}, remove() {}, width: 1, height: 1, getContext: () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } }) });          // generic DOM node (the drive HUD builds a small DOM tree)
globalThis.document = {
  createElement: (t) => (t === 'canvas' ? new FakeCanvas() : stubEl()),
  createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }),
  fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {},
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
const { batchStatic } = await import(pathToFileURL(path.join(root, 'src/core/batch2.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = ['metro'];
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
// a renderer stub for metro/release.js (initTexture is counted) and the "page loaded" switch it waits for
let loaded = false, uploads = 0;
ctx.renderer = { initTexture() { uploads++; } };
document.body.classList = { contains: (c) => c === 'loaded' && loaded };

// every canvas painted while the metro builds: size, key, painter
const TEX = [], FILE = /world[\/]((?:metro[\/])?[\w-]+\.js):(\d+)/;
{ const orig = ctx.tex.draw; ctx.tex.draw = function (w, h, fn, opts) {
  const hit = !!(opts && opts.key && ctx.tex.cache.has(opts.key)), t = orig.call(this, w, h, fn, opts);
  if (!hit) { const st = new Error().stack.split('\n').slice(2).map((l) => FILE.exec(l)).filter(Boolean).map((m) => m[1].split(String.fromCharCode(92)).join('/') + ':' + m[2]).filter((s) => !s.startsWith('metro/release.js'));
    TEX.push({ t, px: w * h, size: w + 'x' + h, key: opts && opts.key ? String(opts.key) : '', where: st.slice(0, 2).join(' < ') || '?' }); }
  return t; }; }

const t0 = performance.now();
await (await import(pathToFileURL(path.join(root, 'src/world/metro.js')).href)).build(ctx);
const buildMs = Math.round(performance.now() - t0);
scene.updateMatrixWorld(true);

// ---- what batching will see
let meshes = 0, verts = 0, nonIndexedVerts = 0; const geos = new Set(), used = new Set();
scene.traverse((o) => {
  for (const m of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) for (const s of ['map', 'emissiveMap', 'alphaMap']) if (m && m[s] && m[s].image) used.add(m[s].image);
  if (!o.isMesh || o.isInstancedMesh) return; meshes++; geos.add(o.geometry);
  const n = o.geometry.attributes.position.count; verts += n; if (!o.geometry.index) nonIndexedVerts += n;
});
const group = (f) => { const by = {}; for (const r of TEX) { const k = f(r), b = by[k] || (by[k] = { n: 0, px: 0, sizes: {} }); b.n++; b.px += r.px; b.sizes[r.size] = (b.sizes[r.size] || 0) + 1; } return Object.entries(by).sort((a, b) => b[1].px - a[1].px); };
const canvasPx = TEX.reduce((s, r) => s + r.px, 0), unused = TEX.filter((r) => !used.has(r.t.image));

// ---- batching (the module alone: the city's own atlas candidates are not here)
const tb = performance.now();
const b = batchStatic(ctx.staticRoot, { mat: ctx.mat });
const batchMs = Math.round(performance.now() - tb);
const zones = {}; let outMeshes = 0;
ctx.staticRoot.traverse((o) => { if (!o.isMesh) return; outMeshes++; let z = '?'; for (let p = o; p; p = p.parent) if (p.userData.zone) { z = p.userData.zone; break; } zones[z] = (zones[z] || 0) + 1; });

// ---- the release pass after the load
loaded = true;
for (let i = 0; i < 600 && !(ctx.metro && ctx.metro.release && ctx.metro.release.done); i++) for (const f of ctx._updates) { try { f(1 / 30, 100 + i / 30); } catch (e) { /* (other update functions: not this profile's business) */ } }

const M = (v) => +(v / 1e6).toFixed(2);
const report = {
  qs: QS, buildMs, batchMs,
  source: { meshes, geometries: geos.size, vertices: verts, nonIndexedVertices: nonIndexedVerts },
  canvas: { textures: TEX.length, Mpx: M(canvasPx), unusedMpx: M(unused.reduce((s, r) => s + r.px, 0)), unused: unused.map((r) => r.key + ' ' + r.size) },
  noAtlas: ctx.metro && ctx.metro.noAtlas ? { textures: ctx.metro.noAtlas.textures, Mpx: M(ctx.metro.noAtlas.px), skipped: ctx.metro.noAtlas.skipped } : null,
  batch: { merged: b.merged, sources: b.sources, meshes: b.meshes, atlasTextures: b.atlasTextures, atlasPages: b.atlasPages, atlasPageMpx: M(b.atlasPages * 4096 * 4096) },
  release: ctx.metro && ctx.metro.release ? { ...ctx.metro.release, orphanMpx: M(ctx.metro.release.orphanPx || 0), uploadedMpx: M(ctx.metro.release.uploadedPx || 0), initTexture: uploads } : null,
  outMeshes, busiestZones: Object.entries(zones).sort((a, c) => c[1] - a[1]).slice(0, 12),
  painters: group((r) => r.where).slice(0, 15).map(([k, v]) => [k, v.n, M(v.px), Object.entries(v.sizes).sort((a, c) => c[1] - a[1]).slice(0, 3).map((s) => s.join('x')).join(' ')]),
  keys: group((r) => (r.key.split(/[|:]/)[0].replace(/\d+$/, '') || '(no key)')).slice(0, 15).map(([k, v]) => [k, v.n, M(v.px)]),
};
if (JSON_OUT) console.log(JSON.stringify(report, null, 1));
else {
  console.log(`metro-prof ${QS ?? '(default flags)'}: build ${buildMs} ms, batch ${batchMs} ms`);
  console.log(`source   ${meshes} meshes / ${geos.size} geometries, ${verts} vertices (${nonIndexedVerts} non-indexed)`);
  console.log(`canvas   ${TEX.length} textures, ${report.canvas.Mpx} M px (${report.canvas.unusedMpx} M px never used by a mesh: ${report.canvas.unused.join(', ') || '-'})`);
  console.log(`noAtlas  ${JSON.stringify(report.noAtlas)}`);
  console.log(`batch    ${JSON.stringify(report.batch)}`);
  console.log(`release  ${JSON.stringify(report.release)}`);
  console.log(`output   ${outMeshes} meshes; busiest zones ${report.busiestZones.map((z) => z.join(' ')).join(', ')}`);
  console.log('painters (file:line < caller, textures, M px, sizes):'); for (const r of report.painters) console.log('  ' + r.join('  '));
  console.log('key prefixes (textures, M px):'); for (const r of report.keys) console.log('  ' + r.join('  '));
}
process.exit(0);
