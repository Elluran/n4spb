// tools/landmarksFortress-walk.mjs - headless walk probe of Zayachy Island (landmarksFortress): the six gates, both timber bridges, the Commandant pier and its stairs, the beach down to the water line
// and the roof walk with its stairs are open; the ramparts, the bridge railings and EVERY bank of the island block (nobody walks on the water: a sweep over all ring edges).
// usage: node tools/landmarksFortress-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks polylines through ph.resolve / ph.groundHeight like the player)
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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksFortress'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksFortress.js')).href);
await mod.build(ctx);
const ph = ctx.physics, svc = ctx.services.landmarksFortress;
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksFortress/frame.js')).href);
/** walk a polyline like the player: returns { stuck, fell, x, z, y, far } (fell = the ground dropped more than 1.3 m in one step: the water bed) */
const go = (pts, y0 = null) => {
  const p = { x: pts[0][0], z: pts[0][1] }; let feet = y0 ?? ph.groundHeight(p.x, p.z, 1.0, false), far = 0;
  for (let s = 0; s + 1 < pts.length; s++) {
    const a = pts[s], b = pts[s + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.1));
    for (let i = 1; i <= n; i++) {
      const tx = a[0] + (b[0] - a[0]) * i / n, tz = a[1] + (b[1] - a[1]) * i / n; p.x = tx; p.z = tz; ph.resolve(p, 0.4, feet, 1.7);
      if (Math.hypot(p.x - tx, p.z - tz) > 0.15) return { stuck: true, fell: false, x: p.x, z: p.z, y: feet, far };
      const g = ph.groundHeight(p.x, p.z, feet, false);
      if (!(g > feet - 1.3)) return { stuck: false, fell: true, x: p.x, z: p.z, y: g, far };
      feet = g; far += 0.1;
    }
  }
  return { stuck: false, fell: false, x: p.x, z: p.z, y: feet, far };
};
let all = true;
const T = (pts, label, expectOpen, y0 = null, yEnd = null) => {
  const r = go(pts, y0), ok = expectOpen ? (!r.stuck && !r.fell && (yEnd === null || Math.abs(r.y - yEnd) < 0.6)) : r.stuck;
  if (!ok && expectOpen && r.stuck) {
    const hit = ph.items.filter((it) => { if (it.type === 'hole' || it.type === 'walk' || it.type === 'ramp') return false; if (it.type === 'cyl') return Math.hypot(it.cx - r.x, it.cz - r.z) < it.r + 0.9; const dx = r.x - it.cx, dz = r.z - it.cz, lx = dx * it.c - dz * it.s, lz = dx * it.s + dz * it.c; return Math.abs(lx) < it.hw + 0.9 && Math.abs(lz) < it.hd + 0.9; });
    for (const it of hit.slice(0, 4)) console.log('     in the way:', it.type, it.cx.toFixed(1), it.cz.toFixed(1), it.type === 'cyl' ? 'r ' + it.r : 'w ' + (it.hw * 2).toFixed(2) + ' d ' + (it.hd * 2).toFixed(2), 'y', it.y0, it.y1);
  }
  console.log((ok ? 'ok   ' : 'FAIL ') + label + ' -> ' + (r.stuck ? 'blocked' : r.fell ? 'FELL' : 'open') + ' at ' + r.x.toFixed(1) + ',' + r.z.toFixed(1) + ' y ' + (Number.isFinite(r.y) ? r.y.toFixed(2) : r.y));
  all = ok && all; return r;
};
// ---- the gates: from 9 m outside to 9 m inside
for (const g of F.GATES) T([[g.outer[0] - g.d[0] * 9, g.outer[1] - g.d[1] * 9], [g.inner[0] + g.d[0] * 9, g.inner[1] + g.d[1] * 9]], 'gate ' + g.key + ' (' + g.len.toFixed(0) + ' m passage)', true);
for (const g of F.GATES) T([[g.outer[0] - g.d[0] * 6 + g.t[0] * (g.hwO + 8), g.outer[1] - g.d[1] * 6 + g.t[1] * (g.hwO + 8)], [g.inner[0] + g.d[0] * 6 + g.t[0] * (g.hwO + 8), g.inner[1] + g.d[1] * 6 + g.t[1] * (g.hwO + 8)]], 'through the wall beside gate ' + g.key, false);
// ---- the bridges: end to end, and across the railing
for (const b of svc.bridges) {
  const dx = b.b[0] - b.a[0], dz = b.b[1] - b.a[1], l = Math.hypot(dx, dz), u = [dx / l, dz / l];
  T([[b.a[0] + u[0] * 3, b.a[1] + u[1] * 3], [b.b[0] - u[0] * 1.5, b.b[1] - u[1] * 1.5]], 'bridge ' + b.key + ' end to end (' + l.toFixed(0) + ' m)', true);
  const m = [b.a[0] + u[0] * l * 0.7, b.a[1] + u[1] * l * 0.7], y = ph.groundHeight(m[0], m[1], 3, false);
  T([m, [m[0] - u[1] * 9, m[1] + u[0] * 9]], 'bridge ' + b.key + ': over the railing', false, y);
}
// ---- the Commandant pier: out of the Nevsky Gate, over the bridge, down the front stairs; off the landing sideways
{
  const g = F.GATES.find((q) => q.key === 'nevsky'), o = (lz, lx = 0) => [g.outer[0] - g.d[0] * lz + g.t[0] * lx, g.outer[1] - g.d[1] * lz + g.t[1] * lx];
  const q = svc.pier, zl = q.zb + 3, ze = q.zp - 4.2 + q.steps;
  T([o(-4), o(zl)], 'Nevsky Gate -> pier bridge -> landing', true, null, 0.06);
  T([o(zl), o(ze - 0.3)], 'landing: down the front stairs to the water', true, 0.06, -3.3);
  T([o(zl), o(zl - 0.6, q.pw - 1), o(zl - 0.6, q.pw + q.steps - 0.3)], 'landing: down the side stairs', true, 0.06, -3.3);
  T([o(q.z0 + 10), o(q.z0 + 10, 7)], 'pier bridge: over the parapet', false, 0.05);
  T([o(ze - 0.3), o(ze + 8)], 'front stairs: on into the Neva', false, -3.35);
}
// ---- the beach: from the wall foot down the sand to the water line; the walker stops ankle deep
{
  const r = T([[-2010, -1760], [-2010, -1700]], 'beach: down the sand into the Neva (stops at the water line)', false);
  if (!(r.y < -2.6 && r.y > -3.9)) { console.log('FAIL beach: stopped at y ' + r.y); all = false; }
}
// ---- the roof walk: up the stairs from the Naryshkin yard, along the Neva curtain to the Gosudarev bastion
if (svc.roofWalk) {
  const w = svc.roofWalk;
  T([[w.stair.a[0] - 1.5, w.stair.a[1] - 3.2], w.stair.a, w.stair.b, ...w.pts.slice(0, -1), [w.pts[w.pts.length - 1][0] + 1, w.pts[w.pts.length - 1][1] + 0.5]], 'roof walk: stairs + the whole Neva panorama', true, null, w.y);
  T([[-1817, -1900.5], [-1812, -1894.7]], 'roof walk: over its railing', false, w.y);
}
// ---- nobody walks on the water: from 1.2 m inside every ring edge 34 m straight out
{
  let leaks = 0, n = 0; const R = F.RING;
  for (let i = 0; i < R.length; i++) {
    const a = R[i], b = R[(i + 1) % R.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), nn = F.edgeNormal(R, i), k = Math.max(1, Math.round(l / 6));
    if (l < 6.5) continue;                                             // the jogs of the outline: their normal runs along the shore
    for (let t = 0.5 / k; t < 1; t += 1 / k) {
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; n++;
      if (svc.bridges.some((q) => F.dseg(x, z, q.a, q.b) < 9) || Math.hypot(x - svc.pier.x, z - svc.pier.z) < 30) continue;
      const r = go([[x - nn[0] * 1.2, z - nn[1] * 1.2], [x + nn[0] * 34, z + nn[1] * 34]]);
      if (!r.stuck) { leaks++; if (leaks < 9) console.log('     LEAK at ring edge ' + i + ' (' + F.bankKind(i) + ') ' + x.toFixed(1) + ',' + z.toFixed(1) + (r.fell ? ' fell' : ' open')); }
    }
  }
  console.log((leaks === 0 ? 'ok   ' : 'FAIL ') + 'bank sweep: ' + leaks + ' leaks of ' + n + ' probes'); if (leaks) all = false;
}
// ---- every mapped footway / service lane of the island is walkable (nothing planted on a path): report only
{
  const G = await import(pathToFileURL(path.join(root, 'src/world/landmarksFortress/osm-data.js')).href), D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
  const ids = new Set(G.ON_ISLAND.roads); let bad = 0, legs = 0; const worst = [];
  for (const r of D.ROADS) {
    if (!ids.has(r.id) || r.bridge || (r.layer || 0) > 0 || r.surface === 'wood' || !['footway', 'service', 'path'].includes(r.hw) || r.pts.length < 4) continue;
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const a = [r.pts[i], r.pts[i + 1]], b = [r.pts[i + 2], r.pts[i + 3]]; if (L.insideBuilding(a[0], a[1], 0.3) || L.insideBuilding(b[0], b[1], 0.3)) continue;
      legs++; const q = go([a, b], 0); if (q.stuck) { bad++; if (worst.length < 14) worst.push(r.id + ' ' + q.x.toFixed(0) + ',' + q.z.toFixed(0)); }
    }
  }
  console.log((bad < legs * 0.06 ? 'ok   ' : 'WARN ') + 'footway legs blocked: ' + bad + ' of ' + legs + (worst.length ? ' e.g. ' + worst.join(' | ') : ''));
}
console.log('gates', svc.gates.length, 'bridges', svc.bridges.length, 'lamps', svc.lamps.length, 'benches', svc.benches.length, 'trees', svc.trees, 'tris', svc.triangles);
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
