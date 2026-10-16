// WHO BLOCKS HERE: headless (node, no GPU) build of the page's static modules with every physics collider tagged by its owner (module + the calling files from the stack, as
// tools/roads-furniture-audit.mjs does), then for each query the solids that stop a walker (radius 0.3, feet y 0, height 1.7) between a stuck point and its target.
//   node --max-old-space-size=12288 tools/bridges-owner.mjs "x,z>tx,tz;x,z>tx,tz" [--modules a,b,c] [--r 2.6]
// For a query it prints (a) the first solid met on the straight line stuck point -> target (marching 0.05 m), (b) every blocking solid within --r metres of the stuck point (the walk tool's
// bug-algorithm probes 2.5 m in 24 headings: when all of them are closed the point is fenced in) with the free headings out of 24, (c) layout facts of the point (building, road, water).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import { mainModules, DYNAMIC } from './modules-list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {}; let qs = '';
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; else qs = a; }
const QUERIES = qs.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [a, b] = s.split('>'); const p = a.split(',').map(Number), t = (b || a).split(',').map(Number); return { x: p[0], z: p[1], tx: t[0], tz: t[1] }; });
const MODULES = args.modules ? args.modules.split(',') : mainModules().filter((m) => !DYNAMIC.includes(m));
const RAD = Number(args.r || 2.6);

// ---------------------------------------------------------------- DOM stubs (same as tools/check.mjs)
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; } createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } isPointInPath() { return false; } getLineDash() { return []; }
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

const THREE = await import('three');
const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const { createContext } = await imp('src/core/ctx.js');
const { createAudio } = await imp('src/core/audio.js');
const L = await imp('src/world/layout.js');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
let audio; try { audio = createAudio(); } catch { audio = null; }
const ctx = createContext({ scene, camera, renderer: null, audio, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
ctx.buildList = MODULES.slice();
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };

// ---------------------------------------------------------------- owners
let curModule = '?';
const owner = new Map();
{
  const ins = ctx.physics._insert.bind(ctx.physics);
  ctx.physics._insert = (it) => {
    const lim = Error.stackTraceLimit; Error.stackTraceLimit = 14;
    const st = new Error().stack || ''; Error.stackTraceLimit = lim;
    const frames = [];
    for (const ln of st.split('\n').slice(2)) {
      const m = /at (?:async )?(?:(\S+) )?\(?(?:file:\/\/\/)?([^)]*?)[:](\d+):\d+\)?$/.exec(ln.trim()); if (!m) continue;
      const f = m[2].replace(/\\/g, '/'), i = f.indexOf('/src/'), rel = i >= 0 ? f.slice(i + 5) : f;
      if (rel.endsWith('core/physics.js') || rel.startsWith('node:')) continue;
      frames.push(`${rel.replace(/^world\//, '')}:${m[3]}${m[1] ? ' ' + m[1] : ''}`);
    }
    owner.set(it, { mod: curModule, frames });
    return ins(it);
  };
}
for (const name of MODULES) {
  curModule = name; const t0 = Date.now(); let err = null;
  try { const mod = await imp(`src/world/${name}.js`); await mod.build(ctx); } catch (e) { err = e; }
  if (err) console.log(`built ${name} ${Date.now() - t0} ms  ERROR ${(err.stack || err).toString().split('\n').slice(0, 2).join(' | ')}`);
}
console.log(`modules built: ${MODULES.length}, colliders ${ctx.physics.items.length}`);

// ---------------------------------------------------------------- queries
const ph = ctx.physics, R = 0.3, FEET = 0, HGT = 1.7, STEP = 0.45;
const vertical = (it) => {
  if (it.type === 'hole') return false;
  if (it.type === 'box' || it.type === 'cyl') return !(FEET + STEP >= it.y1 || FEET + HGT <= it.y0);
  if (it.type === 'walk') return !(it.top <= FEET + STEP || FEET + HGT <= it.y0);
  if (it.type === 'ramp') return Math.max(it.yA, it.yB) > FEET + STEP;
  return false;
};
const dist = (it, x, z) => {
  if (it.type === 'cyl') return Math.hypot(x - it.cx, z - it.cz) - it.r;
  const dx = x - it.cx, dz = z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c;
  const qx = Math.max(-it.hw, Math.min(it.hw, lx)), qz = Math.max(-it.hd, Math.min(it.hd, lz));
  const d = Math.hypot(lx - qx, lz - qz);
  return d > 1e-6 ? d : -Math.min(it.hw - Math.abs(lx), it.hd - Math.abs(lz));
};
const describe = (it) => {
  const o = owner.get(it) || { mod: '?', frames: [] };
  const size = it.type === 'cyl' ? `r ${it.r.toFixed(2)}` : `${(it.hw * 2).toFixed(2)} x ${(it.hd * 2).toFixed(2)} rot ${((it.rotY || 0) * 180 / Math.PI).toFixed(0)}`;
  const yr = it.type === 'walk' ? `top ${it.top.toFixed(2)} from ${it.y0}` : it.type === 'ramp' ? `ramp ${it.yA.toFixed(2)}..${it.yB.toFixed(2)}` : `y ${(+it.y0).toFixed(2)}..${(+it.y1).toFixed(2)}`;
  return `${it.type} at (${it.cx.toFixed(1)}, ${it.cz.toFixed(1)}) ${size} ${yr}  OWNER ${o.mod}  ${o.frames.slice(0, 4).join(' < ')}`;
};
const free = (x, z, ang, len) => { const q = { x, z }; for (let i = 1; i <= len / 0.1; i++) { const tx = x + Math.sin(ang) * i * 0.1, tz = z + Math.cos(ang) * i * 0.1; q.x = tx; q.z = tz; ph.resolve(q, R, FEET, HGT); if (Math.hypot(q.x - tx, q.z - tz) > 0.1) return false; } return true; };
for (const q of QUERIES) {
  const dx = q.tx - q.x, dz = q.tz - q.z, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
  const b = L.buildingAt(q.x, q.z);
  console.log(`\n=== stuck (${q.x}, ${q.z}) -> target (${q.tx}, ${q.tz})  ${len.toFixed(1)} m   insideBuilding ${L.insideBuilding(q.x, q.z, 0.3)}${b ? ' (' + b.id + ', claimed by ' + (L.claimedBy(b.id) || 'city') + ')' : ''}  onRoad ${L.isOnRoad(q.x, q.z, 0)}  water ${L.waterwayAt ? L.waterwayAt(q.x, q.z) : L.inRiver(q.x, q.z)}  inPlay ${L.inPlay(q.x, q.z, 0)}  ground ${ph.groundHeight(q.x, q.z, 0.5, false)}`);
  let first = null;
  for (let s = 0; s <= Math.min(len, 12) && !first; s += 0.05) {
    const x = q.x + ux * s, z = q.z + uz * s;
    for (const it of ph._query(x, z, R + 0.5)) if (vertical(it) && dist(it, x, z) < R - 0.02) { first = { it, s }; break; }
  }
  console.log(first ? `  FIRST SOLID on the line at ${first.s.toFixed(2)} m: ${describe(first.it)}` : '  no solid on the first 12 m of the straight line');
  const near = [];
  for (const it of ph._query(q.x, q.z, RAD + 1)) if (vertical(it)) { const d = dist(it, q.x, q.z); if (d < RAD) near.push([d, it]); }
  near.sort((a, c) => a[0] - c[0]);
  let open = 0; const dirs = [];
  for (let a = 0; a < 24; a++) { const ang = a * Math.PI / 12; if (free(q.x, q.z, ang, 2.5)) { open++; dirs.push(Math.round(a * 15)); } }
  console.log(`  free 2.5 m headings: ${open} / 24 ${open ? '(bearings from +z toward +x: ' + dirs.join(' ') + ')' : '(FENCED IN)'}; blocking solids within ${RAD} m: ${near.length}`);
  for (const [d, it] of near.slice(0, 12)) console.log(`    ${d.toFixed(2)} m  ${describe(it)}`);
}
process.exit(0);
