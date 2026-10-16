// tools/kit-winding-scan.mjs - headless scan (no GPU) of every landmark module that builds with a `kit.js` Parts: counts the triangles whose front side
// (counter-clockwise by the index order) looks against the vertex normals - culled when seen from outside (a cap of a bollard / lamp hood / column that is invisible from above).
// The Parts.build of EVERY kit.js (src/world/landmarks*/kit.js, bridges/kit.js) is wrapped, so the numbers come per module (the module being built) and per kit file (the copy that made the triangles).
// usage: node tools/kit-winding-scan.mjs [module ...]      (modules are src/world/<name>.js; no arguments = every landmarks* module with a kit.js, one after the other)
//        node tools/kit-winding-scan.mjs --detail <module>    which materials own the remaining against-normal triangles
//        node tools/kit-winding-scan.mjs --kits               only the table by kit.js copy, no per-module lines
// Double-sided materials are counted apart ("double"): they are harmless. Heavy: one process, modules built one after the other; use NODE_OPTIONS=--max-old-space-size=14000.
// (written 2026-10-10 for the cylinder-cap fix of Parts.cyl() in the kit.js copies)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- DOM stubs (as tools/check.mjs)
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

// ---------------------------------------------------------------- the module list
const worldDir = path.join(root, 'src/world');
const args = process.argv.slice(2);
const kitsOnly = args.includes('--kits');
const caps = args.includes('--caps');                                                       // per module: world positions of a few cylinder-cap triangles (centre-first fan triangles of 50 degrees or less, facing up, 1.2 .. 8 m high) - targets for a close-up shot
const detail = args.includes('--detail');                                                  // per module: the materials that own the against-normal triangles, with one sample position
let names = args.filter((a) => !a.startsWith('--'));
const kitFiles = [];                                                                      // 'landmarksB/kit.js', 'bridges/kit.js'
for (const d of fs.readdirSync(worldDir)) {
  if (!(d.startsWith('landmarks') || d === 'bridges')) continue;
  if (fs.existsSync(path.join(worldDir, d, 'kit.js'))) kitFiles.push(`${d}/kit.js`);
}
if (!names.length) names = kitFiles.filter((f) => f.startsWith('landmarks')).map((f) => f.split('/')[0]).filter((n) => fs.existsSync(path.join(worldDir, n + '.js')));

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

let cur = null;                                                                           // { kit file -> { ok, bad, badDouble, deg, zn } } of the module being built
const hooked = [];
for (const f of kitFiles) {
  let kit; try { kit = await import(pathToFileURL(path.join(worldDir, f)).href); } catch (e) { console.log('cannot import', f, e.message); continue; }
  if (!kit.Parts || !kit.Parts.prototype.build) continue;
  hooked.push(f);
  const orig = kit.Parts.prototype.build;
  kit.Parts.prototype.build = function (parent, o) {
    if (cur) {
      const s = cur[f] || (cur[f] = { ok: 0, bad: 0, badDouble: 0, deg: 0, zn: 0, capAt: [] });
      for (const k of this.b.values()) {
        const dbl = k.mat && (k.mat.side === 2 || k.mat.side === THREE.DoubleSide);
        const P = k.pos, N = k.nrm, I = k.idx;
        for (let i = 0; i < I.length; i += 3) {
          const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
          const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
          const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
          if (Math.hypot(gx, gy, gz) < 1e-9) { s.deg++; continue; }
          const d = gx * (N[a] + N[b] + N[c]) + gy * (N[a + 1] + N[b + 1] + N[c + 1]) + gz * (N[a + 2] + N[b + 2] + N[c + 2]);
          if (caps && s.capAt.length < 6 && N[a + 1] > 0.99 && N[b + 1] > 0.99 && N[c + 1] > 0.99 && P[a + 1] > 1.2 && P[a + 1] < 8 && Math.hypot(gx, gy, gz) < 0.4 && Math.abs(Math.hypot(ux, uy, uz) - Math.hypot(vx, vy, vz)) < 0.02 * Math.hypot(ux, uy, uz) && (ux * vx + uy * vy + uz * vz) > 0.64 * Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz) && !s.capAt.some((q) => Math.hypot(q[0] - P[a], q[2] - P[a + 2]) < 3)) s.capAt.push([P[a], P[a + 1], P[a + 2]]);
          if (d > 0) s.ok++; else if (dbl) s.badDouble++; else { s.bad++; if (detail) { const mk = (k.mat && k.mat.name) || '?'; const e = (s.mats || (s.mats = {}))[mk] || ((s.mats[mk]) = { n: 0, at: [P[a].toFixed(1), P[a + 1].toFixed(1), P[a + 2].toFixed(1)] }); e.n++; } }
        }
        for (let i = 0; i < N.length; i += 3) if (Math.hypot(N[i], N[i + 1], N[i + 2]) < 0.5) s.zn++;
      }
    }
    return orig.call(this, parent, o);
  };
}

const byKit = {};
const rows = [];
for (const name of names) {
  cur = {};
  ctx.buildList = [name];
  let err = null;
  try {
    const mod = await import(pathToFileURL(path.join(worldDir, name + '.js')).href);
    await mod.build(ctx);
  } catch (e) { err = e; }
  let ok = 0, bad = 0, badDouble = 0, zn = 0; const parts = [];
  for (const [f, s] of Object.entries(cur)) {
    ok += s.ok; bad += s.bad; badDouble += s.badDouble; zn += s.zn;
    if (s.bad || s.badDouble) parts.push(`${f}:${s.bad}${s.badDouble ? '+' + s.badDouble + 'dbl' : ''}`);
    const t = byKit[f] || (byKit[f] = { ok: 0, bad: 0, badDouble: 0, zn: 0, modules: new Set() }); t.ok += s.ok; t.bad += s.bad; t.badDouble += s.badDouble; t.zn += s.zn; if (s.bad) t.modules.add(name);
  }
  if (caps) for (const [f, s] of Object.entries(cur)) if (s.capAt.length) console.log('  ' + f + ' cap targets (x,y,z):', s.capAt.map((q) => q.map((v) => v.toFixed(1)).join(',')).join('  '));
  if (detail) for (const [f, s] of Object.entries(cur)) if (s.mats) console.log('  ' + f + ' by material (local position of the first triangle):', Object.entries(s.mats).sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([m, e]) => `${m}=${e.n}@${e.at.join(',')}`).join('  '));
  rows.push({ name, tris: ok + bad + badDouble, bad, badDouble, zn, err });
  if (!kitsOnly) console.log(`${name.padEnd(26)} tris ${String(ok + bad + badDouble).padStart(8)}  against-normal ${String(bad).padStart(6)}  double-sided ${String(badDouble).padStart(5)}  zero-normal verts ${String(zn).padStart(5)}${parts.length ? '   [' + parts.join(' ') + ']' : ''}${err ? '   BUILD ERROR: ' + String(err.message || err).split('\n')[0].slice(0, 120) : ''}`);
  cur = null;
}
console.log('--- by kit.js copy (triangles made by that copy while building the listed modules; hooked ' + hooked.length + ' kit files)');
for (const [f, t] of Object.entries(byKit).sort((a, b) => b[1].bad - a[1].bad)) if (t.bad || t.badDouble) console.log(`${f.padEnd(34)} against-normal ${String(t.bad).padStart(7)} of ${String(t.ok + t.bad + t.badDouble).padStart(8)}  double ${t.badDouble}`);
const tb = rows.reduce((s, r) => s + r.bad, 0), tt = rows.reduce((s, r) => s + r.tris, 0);
console.log(`TOTAL ${rows.length} modules, ${tt} triangles seen by kit hooks, ${tb} against their vertex normal (${(100 * tb / Math.max(1, tt)).toFixed(2)}%), ${rows.filter((r) => r.err).length} build errors`);
process.exit(0);
