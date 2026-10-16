// Streets objects against the solids of the other modules (review-streets-3, 2026-10-09): every pole / post / shelter collider that module streets registered (cylinder r <= 0.7 or small box) is tested against every
// collider of every OTHER module (landmarks, bridges, metro, city ...) between knee and head height; prints the overlaps with the owning file:line (stack of the collider call). usage: node tools/streets-clash-audit.mjs [--modules a,b] [--near x,z,r] [--json file] [--top N]
import { pathToFileURL, fileURLToPath } from 'node:url'; import path from 'node:path'; import fs from 'node:fs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const argv = process.argv.slice(2); const opt = (k, d = null) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
import { mainModules, DYNAMIC } from './modules-list.mjs';
const DEFAULT_MODULES = mainModules().filter((m) => !DYNAMIC.includes(m)); const MODULES = opt('modules') ? opt('modules').split(',') : DEFAULT_MODULES;
// ---------------------------------------------------------------- DOM stubs (same as tools/check.mjs)
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
globalThis.window = globalThis; globalThis.self = globalThis;
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


// ---------------------------------------------------------------- build
const THREE = await import('three');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { createContext } = await imp('src/core/ctx.js');
const { createAudio } = await imp('src/core/audio.js');
const L = await imp('src/world/layout.js');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
let audio; try { audio = createAudio(); } catch { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = mainModules();
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
let curModule = '?';
const colliders = [];
{
  const ins = ctx.physics._insert.bind(ctx.physics);
  ctx.physics._insert = (it) => {
    const lim = Error.stackTraceLimit; Error.stackTraceLimit = 12;
    const st = new Error().stack || ''; Error.stackTraceLimit = lim;
    let where = '';
    for (const ln of st.split('\n').slice(2)) {
      const m = /([^\s(]+?):(\d+):\d+\)?$/.exec(ln.trim()); if (!m) continue;
      const f = m[1].split(String.fromCharCode(92)).join('/'); if (f.endsWith('core/physics.js')) continue;
      const i = f.indexOf('/src/'); where = (i >= 0 ? f.slice(i + 5) : f) + ':' + m[2]; break;
    }
    colliders.push({ it, mod: curModule, where });
    return ins(it);
  };
}
for (const name of MODULES) {
  curModule = name; const t0 = Date.now();
  try { const mod = await imp(`src/world/${name}.js`); await mod.build(ctx); console.log(`built ${name} ${Date.now() - t0} ms`); } catch (e) { console.log(`built ${name} ERROR ${String(e.stack || e).split('\n').slice(0, 3).join(' | ')}`); }
}
scene.updateMatrixWorld(true);
const st = ctx.services.streets;

// ---------------------------------------------------------------- streets standing objects (pole / post / shelter colliders) against the solids of every other module
const NEAR = opt('near') ? opt('near').split(',').map(Number) : null;
const standing = colliders.filter((c) => c.mod === 'streets' && (c.it.type === 'cyl' ? c.it.r <= 0.7 : (c.it.type === 'box' && c.it.hw <= 2.5 && c.it.hd <= 2.5)) && (c.it.y1 ?? 99) > 0.3 && (c.it.y0 ?? -99) < 2.0);
const solids = colliders.filter((c) => c.mod !== 'streets' && (c.it.type === 'box' || c.it.type === 'cyl') && (c.it.y1 ?? 99) > 0.3 && (c.it.y0 ?? -99) < 1.6 && !(c.it.y0 > -3 && c.it.y1 < 0.3));
const G = new Map(); const K = (x, z) => Math.floor(x / 8) * 8192 + Math.floor(z / 8);
for (const s of solids) { const r = s.it.type === 'cyl' ? s.it.r : Math.hypot(s.it.hw, s.it.hd); for (let a = Math.floor((s.it.cx - r) / 8); a <= Math.floor((s.it.cx + r) / 8); a++) for (let b = Math.floor((s.it.cz - r) / 8); b <= Math.floor((s.it.cz + r) / 8); b++) { const k = a * 8192 + b; let l = G.get(k); if (!l) G.set(k, (l = [])); l.push(s); } }
const hitDepth = (p, s) => {            // penetration of the pole footprint (circle r or box) into the solid: > 0 = overlap
  const it = s.it, pr = p.it.type === 'cyl' ? p.it.r : Math.max(p.it.hw, p.it.hd);
  if (it.type === 'cyl') return it.r + pr - Math.hypot(p.it.cx - it.cx, p.it.cz - it.cz);
  const dx = p.it.cx - it.cx, dz = p.it.cz - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
  const ox = it.hw + pr - Math.abs(lx), oz = it.hd + pr - Math.abs(lz); return Math.min(ox, oz);
};
const rows = [];
for (const p of standing) {
  if (NEAR && Math.hypot(p.it.cx - NEAR[0], p.it.cz - NEAR[1]) > NEAR[2]) continue;
  const seen = new Set();
  for (const s of G.get(K(p.it.cx, p.it.cz)) || []) {
    if (seen.has(s)) continue; seen.add(s);
    const d = hitDepth(p, s);
    if (d > 0.05) rows.push({ x: +p.it.cx.toFixed(1), z: +p.it.cz.toFixed(1), r: p.it.r ?? p.it.hw, mod: s.mod, where: s.where, depth: +d.toFixed(2), ph: [p.it.y0, p.it.y1], sy: [s.it.y0, s.it.y1], swhere: p.where, type: s.it.type });
  }
}
rows.sort((a, b) => b.depth - a.depth);
const byMod = {}; for (const r of rows) { const k = r.mod; byMod[k] = (byMod[k] || 0) + 1; }
console.log(`streets standing colliders ${standing.length}, solids ${solids.length}, overlapping rows ${rows.length}`);
console.log(JSON.stringify(byMod));
const outf = opt('json'); if (outf) fs.writeFileSync(outf, JSON.stringify(rows, null, 1));
for (const r of rows.slice(0, Number(opt('top', 60)))) console.log(`${String(r.x).padStart(8)},${String(r.z).padStart(8)} depth ${r.depth} vs ${r.mod} ${r.type} ${r.where} (streets ${r.swhere})`);

// ---------------------------------------------------------------- metro ground holes (layout.GROUND_HOLES: stair pits and escalator shafts): streets poles within --margin (default 2.0 m, the request of the metro owner) of a hole rectangle
if (argv.includes('--holes')) {
  const mg = Number(opt('margin', 2.0)); let n = 0;
  for (const h of L.GROUND_HOLES) {
    const c = Math.cos(h.rotY), s = Math.sin(h.rotY);
    for (const p of standing) {
      const dx = p.it.cx - h.x, dz = p.it.cz - h.z, lx = dx * c - dz * s, lz = dx * s + dz * c;
      const ex = Math.max(0, Math.abs(lx) - h.w / 2), ez = Math.max(0, Math.abs(lz) - h.d / 2), d = Math.hypot(ex, ez) - (p.it.r ?? 0.2);
      if (d < mg) { n++; console.log(`  hole ${h.id} (${h.kind}): streets pole ${p.it.cx.toFixed(1)},${p.it.cz.toFixed(1)} clearance ${d.toFixed(2)} m  ${p.where}`); }
    }
  }
  console.log(`holes: ${L.GROUND_HOLES.length}, streets poles within ${mg} m: ${n}`);
}
process.exit(0);
