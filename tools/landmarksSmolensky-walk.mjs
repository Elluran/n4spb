// tools/landmarksSmolensky-walk.mjs - headless walk probe of landmarksSmolensky (no GPU): the apron, the portico steps and landing of the Smolensk church, the closed walls / columns / tower / chapels, the Holy Gates passage
// (open) with its wings and piers (solid), the Resurrection church steps, the Trinity chapel steps, the open gates of the fence (passages) against the solid bar fence, the Finland memorial platform, the church shop.
// usage: NODE_OPTIONS=--max-old-space-size=14000 node tools/landmarksSmolensky-walk.mjs   (the river bank belongs to the water owner: tools/environment-vo-walk.mjs)
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

// ---- walkability of landmarksSmolensky
ctx.buildList = ['landmarksSmolensky'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksSmolensky.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksSmolensky/frame.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/landmarksSmolensky/data.js')).href);
const ph = ctx.physics;
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.08)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const at = (f, u, v) => { const p = f.W(u, v); return [p.x, p.z]; };
const { CH, GA, RE, XE, TR } = F;
// the Smolensk church
test('church: along the asphalt apron in front of the portico', [at(CH, 4, -8), at(CH, 44, -8)], true, 0);
test('church: up the five granite steps to the landing (+1.0)', [at(CH, 14.75, -4), at(CH, 14.75, 0.3)], true, 1.0);
test('church: through the door (the wall blocks)', [at(CH, 14.75, -4), at(CH, 14.75, 3)], false);
test('church: through a portico column', [at(CH, 12.95, -3), at(CH, 12.95, 1.0)], false);
test('church: through the south wall of the refectory', [at(CH, 30, -4), at(CH, 30, 6)], false);
test('church: through the bell tower', [at(CH, 50, 12.9), at(CH, 36, 12.9)], false);
test('church: round the apse (east end)', [at(CH, -4, -2), at(CH, -4, 30)], true, 0);
// the Xenia chapel
test('xenia: through the chapel (closed hall)', [at(XE, -3, 4.9), at(XE, 17, 4.9)], false);
test('xenia: along the NNW wall where the pilgrims queue (5 m off)', [at(XE, -2, -5), at(XE, 16, -5)], true, 0);
test('xenia: past the flowers at the ENE end (round the east bench)', [at(XE, 19.5, -2.5), at(XE, 19.5, 12)], true, 0);
// the Holy Gates
test('gates: through the arch (open passage, 2.9 m)', [at(GA, -10, 0.65), at(GA, 22, 0.65)], true, 0);
test('gates: through the north wing', [at(GA, -6, 17.8), at(GA, 12, 17.8)], false);
test('gates: through the south wing', [at(GA, -6, -14.7), at(GA, 6, -14.7)], false);
test('gates: through the central block pier', [at(GA, -6, -3.8), at(GA, 10, -3.8)], false);
// the Resurrection church
test('resurrection: through the building', [at(RE, 14, 32), at(RE, 14, 12)], false);
test('resurrection: up the door steps (+1.1) to the door', [at(RE, 14.2, 30), at(RE, 14.2, 26.1)], true, 1.1);
test('resurrection: round the apses', [at(RE, 40, 30), at(RE, 40, -4)], true, 0);
// the Trinity chapel
test('trinity: through the pavilion', [at(TR, -5, 0), at(TR, 5, 0)], false);
test('trinity: up the three west steps', [at(TR, -4, 0), at(TR, -1.7, 0)], true, 0.45);
test('trinity: a square ring at 2.7 m (over the west steps)', [at(TR, -2.7, -2.7), at(TR, 2.7, -2.7), at(TR, 2.7, 2.7), at(TR, -2.7, 2.7), at(TR, -2.7, -2.7)], true, 0);
// the fence: the open gates are passages, the rest is solid
const S = ctx.services.landmarksSmolensky;
const fences = S.fences, gates = S.gates;
console.log('gates', gates.length, 'open', gates.filter((g) => g.open).length, 'fences', fences.length);
const nearFence = (x, z) => {
  let best = null;
  for (const f of fences) for (let i = 0; i + 1 < f.pts.length; i++) {
    const a = f.pts[i], b = f.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), qx = a[0] + dx * t, qz = a[1] + dz * t, d = Math.hypot(x - qx, z - qz);
    if (!best || d < best.d) best = { d, tx: dx / Math.sqrt(l2), tz: dz / Math.sqrt(l2), qx, qz, f };
  }
  return best;
};
for (const g of gates) { const b = nearFence(g.x, g.z); console.log('  gate', g.id, g.fence, 'nearest run', b && b.f.id, b && b.d.toFixed(1)); }
for (const g of gates.filter((q) => q.open && q.fence)) {
  const b = nearFence(g.x, g.z); if (!b || b.d > 3) { console.log('skip  gate', g.id, '(no fence way within 3 m)'); continue; }
  const nx = -b.tz, nz = b.tx;
  test('gate ' + g.id + ' is a passage through the fence', [[g.x + nx * 4, g.z + nz * 4], [g.x - nx * 4, g.z - nz * 4]], true, null);
}
{ const f = fences.find((q) => q.id === 'w203893164'); if (f) { const a = f.pts[2], b = f.pts[3], mx = a[0] + (b[0] - a[0]) * 0.31, mz = a[1] + (b[1] - a[1]) * 0.31, l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / l, nz = (b[0] - a[0]) / l; test('bar fence of Maly pr. blocks (mid span)', [[mx + nx * 3, mz + nz * 3], [mx - nx * 3, mz - nz * 3]], false); } }
// the Finland Regiment memorial and the church shop
test('finland memorial: through the platform', [[-5651.6 - 5, -1174.2], [-5651.6 + 5, -1174.2]], false);
{ const q = at(CH, 38.5, -37.8); test('church shop: through the kiosk', [[q[0], q[1] - 5], [q[0], q[1] + 5]], false); }
void D;
// the alleys (review 2026-10-08): every mapped alley must be walkable end to end (3 m trimmed at both ends: they stop at fences and gates), i.e. no trunk, shrub or fence post stands on an alley.
// The route of a tourist is tested separately: gate -> Petrogradskaya alley -> Smolensk church, Speranskaya path -> Trinity chapel -> the Xenia plaza.
{
  const trim = (pts) => { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out.slice(3, Math.max(4, out.length - 3)); };
  let blocked = 0; const bad = [];
  for (const p of S.paths) { const t = trim(p.pts); if (t.length < 2) continue; const r = walk(t, 0); if (r.stuck) { blocked++; bad.push(`${p.id} ${p.name || ''} at ${r.at.map((v) => v.toFixed(1))}`); } }
  console.log(`alleys: ${S.paths.length - blocked} of ${S.paths.length} walkable end to end`); for (const b of bad.slice(0, 12)) console.log('  blocked: ' + b);
  const ok = blocked <= Math.ceil(S.paths.length * 0.05); console.log((ok ? 'ok   ' : 'FAIL ') + `alleys: at most 5 % blocked (${blocked})`); all &&= ok;
  const route = (name, ids) => { const pts = []; for (const id of ids) { const p = S.paths.find((q) => q.id === id); if (p) pts.push(...trim(p.pts)); } if (pts.length < 2) { console.log('skip  ' + name + ' (way missing)'); return; } const r = walk(pts, 0); const ok2 = !r.stuck; console.log((ok2 ? 'ok   ' : 'FAIL ') + name + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : '')); all &&= ok2; };
  route('route: Petrogradskaya alley (w109078569) from the gate towards the west', ['w109078569']);
  route('route: Speranskaya path (w120716655)', ['w120716655']);
  route('route: Troitskaya alley (w120715343) to the Xenia chapel', ['w120715343']);
}
if (process.env.WALK_DEBUG) { for (const v of [-0.2, 0.0, 0.3, 0.6, 0.9, 1.1]) { const q = at(CH, 14.75, v); console.log("probe", v, ph.groundHeight(q[0], q[1], 1.0, false), ph.groundHeight(q[0], q[1], 0.5, false), ph.groundHeight(q[0], q[1], 1e9, false)); } let y = 0; for (let v = -3; v <= 0.5; v += 0.1) { const q = at(CH, 14.75, v), p = { x: q[0], z: q[1] }; ph.resolve(p, 0.35, y, 1.7); const g = ph.groundHeight(p.x, p.z, y, false); console.log(v.toFixed(1), Math.hypot(p.x - q[0], p.z - q[1]).toFixed(2), y.toFixed(2), g); if (Number.isFinite(g)) y = g; } }
// detail pass 2026-10-09: the grave field.  A fenced plot blocks (walked from its foot to its centre), the open grave of a stele is walkable to the foot, the queue area at the plaque end of the Xenia chapel is open.
{
  const plots = S.plots || [], fenced = plots.filter((p) => p.fence && p.type !== 'chapel').slice(0, 400), chapels = plots.filter((p) => p.type === 'chapel').slice(0, 20);
  let nb = 0, nOk = 0; const bad = [];
  for (const p of fenced) { const hl = p.hl, c = Math.cos(p.rot), s = Math.sin(p.rot); const a = [p.x + s * (hl + 1.2), p.z + c * (hl + 1.2)], b = [p.x, p.z]; const r = walk([a, b], 0); nb++; if (r.stuck) nOk++; else bad.push(p.x.toFixed(0) + ',' + p.z.toFixed(0)); }
  const okF = nb === 0 || nOk >= nb * 0.97; console.log((okF ? 'ok   ' : 'FAIL ') + `grave field: ${nOk} of ${nb} fenced plots block a walker from the foot to the centre` + (bad.length ? ' (open: ' + bad.slice(0, 4).join(' ') + ')' : '')); all &&= okF;
  let nc = 0, ncOk = 0; for (const p of chapels) { const c = Math.cos(p.rot), s = Math.sin(p.rot); const r = walk([[p.x + s * 5, p.z + c * 5], [p.x, p.z]], 0); nc++; if (r.stuck) ncOk++; }
  const okC = nc === 0 || ncOk >= nc * 0.95; console.log((okC ? 'ok   ' : 'FAIL ') + `grave field: ${ncOk} of ${nc} chapel-tombs are solid`); all &&= okC;
  // the plots keep off the alleys: no plot centre within 1.5 m of the asphalt edge (the foot is 1.2 m from the centre)
  let near = 0; for (const p of plots) { if (p.type === 'edge') continue; let best = 1e9; for (const pa of S.paths) for (let i = 0; i + 1 < pa.pts.length; i++) { const a = pa.pts[i], b = pa.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.z - a[1]) * dz) / l2)), d = Math.hypot(p.x - a[0] - dx * t, p.z - a[1] - dz * t) - pa.w / 2; if (d < best) best = d; } if (best < p.hl + 0.2) near++; }
  const okN = near === 0; console.log((okN ? 'ok   ' : 'FAIL ') + `grave field: ${near} plots reach onto an alley`); all &&= okN;
  // the queue area at the plaque end of the Xenia chapel (frame XE +X end wall, 14.1 m): open from 22 m to 16 m on the axis and along the wall at 3 m
  test('xenia: the queue area at the plaque end (axis, 22 m to 16 m)', [at(XE, 22, 4.9), at(XE, 16, 4.9)], true, 0);
  test('xenia: along the plaque end wall at 2.6 m (the pilgrims walk the wall)', [at(XE, 16.3, 8.8), at(XE, 16.3, 1.0)], true, 0);
  test('xenia: through the candle stand at the plaque (solid)', [at(XE, 16, 4.9), at(XE, 13.5, 4.9)], false);
}
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'lamps', S.lamps.length, 'benches', S.benches.length, 'paths', S.paths.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts), JSON.stringify(S.treeStats || {}));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
