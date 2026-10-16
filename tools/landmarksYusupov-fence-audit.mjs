// landmarksYusupov-fence-audit: headless audit of the fence / rail segments published in ctx.services.<module>.fences against the OSM footways: reports every segment that CROSSES a footway / path
//   (a rail laid over the gravel) unless an OSM gate / entrance node lies within 3 m of the crossing.  Segments that merely run along a path are fine.
//   usage: node tools/landmarksYusupov-fence-audit.mjs [module ...]   (default: Yusupov Mars Garden Nikolsky Mariinsky NewHolland Castle)
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
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const mods = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!mods.length) mods.push('landmarksYusupov', 'landmarksMars', 'landmarksGarden', 'landmarksNikolsky', 'landmarksMariinsky', 'landmarksNewHolland', 'landmarksCastle');
const foot = D.ROADS.filter((r) => ['footway', 'path', 'pedestrian', 'steps'].includes(r.hw) && !r.tunnel && !r.bridge).map((r) => ({ id: r.id, w: r.w || 2, pts: Array.from({ length: r.pts.length / 2 }, (_, i) => [r.pts[i * 2], r.pts[i * 2 + 1]]) }));
const gates = D.BARRIER_NODES.filter((n) => n.kind === 'gate' || n.kind === 'entrance' || n.kind === 'lift_gate' || n.kind === 'turnstile').map((n) => [n.x, n.z]);
const cross = (a, b, c, d) => {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const q = [c[0] - a[0], c[1] - a[1]], t = (q[0] * s[1] - q[1] * s[0]) / den, u = (q[0] * r[1] - q[1] * r[0]) / den;
  return t > 0.02 && t < 0.98 && u > 0 && u < 1 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
};
const norm = (f) => {
  const p = f.pts || f.points || f.line; if (!p || !p.length) return null;
  return Array.isArray(p[0]) ? p.map((q) => [q[0], q[1] ?? q.z]) : Array.from({ length: p.length / 2 }, (_, i) => [p[i * 2], p[i * 2 + 1]]);
};
let total = 0;
for (const name of mods) {
  let svc = null;
  try {
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
    const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
    let audio; try { audio = createAudio(); } catch { audio = null; }
    const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir });
    ctx.buildList = [name]; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
    const mod = await import(pathToFileURL(path.join(root, 'src/world', name + '.js')).href);
    await mod.build(ctx);
    svc = ctx.services[name];
  } catch (e) { console.log('SKIP ' + name + ': ' + String(e && e.message).slice(0, 120)); continue; }
  const fences = (svc && (svc.fences || svc.rails)) || [];
  let nseg = 0; const bad = [];
  for (const f of fences) {
    const pts = norm(f); if (!pts) continue;
    for (let i = 0; i + 1 < pts.length; i++) {
      nseg++;
      for (const w of foot) for (let j = 0; j + 1 < w.pts.length; j++) {
        const x = cross(pts[i], pts[i + 1], w.pts[j], w.pts[j + 1]); if (!x) continue;
        if (gates.some((g) => Math.hypot(g[0] - x[0], g[1] - x[1]) < 3)) continue;
        bad.push(f.id + ' x ' + w.id + ' at ' + x[0].toFixed(1) + ',' + x[1].toFixed(1));
      }
    }
  }
  total += bad.length;
  console.log((bad.length ? 'FAIL ' : 'ok   ') + name + ': ' + fences.length + ' fence runs, ' + nseg + ' segments, ' + bad.length + ' crossings of footways');
  for (const b of bad.slice(0, 12)) console.log('       ' + b);
}
console.log(total ? 'RESULT: FAIL (' + total + ')' : 'RESULT: OK');
process.exit(total ? 1 : 0);
