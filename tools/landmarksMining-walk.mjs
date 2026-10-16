// tools/landmarksMining-walk.mjs - headless walk probe of landmarksMining (no GPU): the street and the pavement in front of the portico are open, the 13-step stair and the gallery are walkable at +1.95 (the columns, the back wall with
// the closed door, the cheeks with the two sculpture groups, the wings and the hull block), the axial descent D1 can be walked down to the landing at -3.2 (its walls, bastions and the water edge block), the amphitheatre D2 down to its landing at -2.8,
// the quay terrace beside the Krasin is open and nobody walks on the ship or the water.  usage: node tools/landmarksMining-walk.mjs
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
// ---- walkability of landmarksMining (every part: MINING_ALL)
process.env.MINING_ALL = '1';
ctx.buildList = ['landmarksMining'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksMining.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMining/frame.js')).href);
const G = await import(pathToFileURL(path.join(root, 'src/world/landmarksMining/groups.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.06)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const p = (u, w) => { const q = F.P.W(u, w); return [q.x, q.z]; };
const s = (X, Z) => { const q = F.S.W(X, Z); return [q.x, q.z]; };
// ---- the portico
test('forecourt: along the pavement in front of the stair', [p(-14, 9.5), p(14, 9.5)], true, null);
test('stair: from the pavement up the 13 steps to the stylobate', [p(0, 9), p(0, 6.6), p(0, 3), p(0, 0.2)], true, 1.95);
test('gallery: along the colonnade (between the columns and the wall)', [p(0, 0.2), p(0, -2.7), p(-14, -2.7), p(14, -2.7)], true, 1.95, 1.95);
test('gallery: down the stair again', [p(3, -1), p(3, 3), p(3, 9)], true, 0, 1.95);
test('columns: a column blocks', [p(1.775, 1.2), p(1.775, -2)], false, null, 1.95);
test('gallery: the back wall blocks', [p(5, -4), p(5, -7)], false, null, 1.95);
test('gallery: the closed door blocks', [p(0, -4), p(0, -7)], false, null, 1.95);
test('cheeks: the east cheek blocks', [p(18.9, 8.5), p(18.9, 3)], false);
test('groups: the Hercules group blocks (on the cheek)', [p(30, 1.9), p(18.9, 1.9)], false);
test('wings: into the west wing', [p(-47.4, -9.9), p(-52.5, -17)], false);
test('wings: along the pavement outside the west wing', [p(-45, -4.5), p(-70, -14)], true, null);
test('wings: into the east wing', [p(52.5, -6.5), p(48, -17)], false);
test('lamps: through an ornate lamp', [p(-26.4, 2.6), p(-24.0, 2.6)], false);
// ---- D1
test('D1: from the street down the flight to the landing', [p(0, 20), p(0, 22.65), p(0, 26), p(0, 29.5)], true, -3.2);
test('D1: along the landing between the bastions', [p(0, 29.6), p(-8.5, 29.6), p(8.5, 29.6)], true, -3.2, -3.2);
test('D1: the west side wall blocks', [p(-9.5, 26), p(-12.5, 26)], false, null, -2.0);
test('D1: the bastion blocks', [p(-9.0, 29.8), p(-12.0, 29.8)], false, null, -3.2);
test('D1: the water edge blocks (no walking on the Neva)', [p(0, 29.6), p(0, 33)], false, null, -3.2);
test('D1: back up the flight', [p(0, 29.5), p(0, 26), p(0, 22.65), p(0, 20)], true, 0, -3.2);
// ---- the Krasin berth
const A = G.DESCENT_D2, cx = A.reduce((a, q) => a + q[0], 0) / A.length, cz = A.reduce((a, q) => a + q[1], 0) / A.length;
const mid = [(A[0][0] + A[1][0]) / 2, (A[0][1] + A[1][1]) / 2], out = [mid[0] + (mid[0] - cx) * 0.2, mid[1] + (mid[1] - cz) * 0.2];
const Ga = A[A.length - 1], Aa = A[0], wm = [(Ga[0] + Aa[0]) / 2, (Ga[1] + Aa[1]) / 2], gl = Math.hypot(Aa[0] - Ga[0], Aa[1] - Ga[1]);
const inw = [(cx - wm[0]), (cz - wm[1])], il = Math.hypot(inw[0], inw[1]), land = [wm[0] + inw[0] / il * 1.3, wm[1] + inw[1] / il * 1.3], sea = [wm[0] - inw[0] / il * 2.5, wm[1] - inw[1] / il * 2.5];
test('D2: from the street down the broad steps to the landing', [out, mid, [(mid[0] + land[0]) / 2, (mid[1] + land[1]) / 2], land], true, -2.8);
test('D2: the water edge blocks', [land, sea], false, null, -2.8);
// (mining-fix 2026-10-09) the amphitheatre from the lawn side, every floor inside the ring, the river edge a wall from every tread, the museum door closed
test('D2: from the lawn (north curve) down to the landing', [[-4616.0, 449.5], [-4615.6, 456.0], [-4614.4, 463.0], [(wm[0] + land[0]) / 2, (wm[1] + land[1]) / 2], land], true, -2.8);
{
  const cl = Math.hypot(Aa[0] - Ga[0], Aa[1] - Ga[1]), ux = (Aa[0] - Ga[0]) / cl, uz = (Aa[1] - Ga[1]) / cl;
  let nx = uz, nz = -ux; if (nx * (cx - wm[0]) + nz * (cz - wm[1]) < 0) { nx = -nx; nz = -nz; }          // inward normal of the river edge G -> A
  for (const f of [0.04, 0.2, 0.45, 0.7, 0.96]) {
    const e = [Ga[0] + (Aa[0] - Ga[0]) * f, Ga[1] + (Aa[1] - Ga[1]) * f], st = [e[0] + nx * 1.2, e[1] + nz * 1.2], y0 = ph.groundHeight(st[0], st[1], 0, false);
    if (Number.isFinite(y0) && y0 < 0) test(`D2: the river edge blocks at ${(f * 100).toFixed(0)} % (from the tread at y ${y0.toFixed(2)})`, [st, [e[0] - nx * 2.5, e[1] - nz * 2.5]], false, null, y0);
  }
  // (review 2026-10-09) a JUMP (Space: vy 4.2, g 12, apex 0.74 m) must not clear a river-edge barrier either: a running jump (3.6 and 6.5 m/s) from the first treads of D2 (the highest ones, at the G corner) and from the D1 landing
  // toward the water has to end inside.  physics.resolve skips a box whose top is not above feet + 0.45, so the barriers reach +1.25 (the generic quay colliders), not +0.7 / landing + 0.7
  const jump = (st, dx, dz, speed, y0) => {
    const q = { x: st[0], z: st[1] }; let y = y0, vy = 4.2;
    for (let t = 0; t < 2.0; t += 1 / 60) {
      const n = Math.max(1, Math.ceil(speed / 60 / 0.1));
      for (let i = 0; i < n; i++) { q.x += dx * speed / 60 / n; q.z += dz * speed / 60 / n; ph.resolve(q, 0.3, y, 1.7); }
      vy -= 12 / 60; y += vy / 60; const g = ph.groundHeight(q.x, q.z, y, false); if (y <= g) { y = g; vy = 0; }
    }
    return { q, y };
  };
  for (const sp of [3.6, 6.5]) {
    for (const f of [0.01, 0.03, 0.06]) {
      const e = [Ga[0] + (Aa[0] - Ga[0]) * f, Ga[1] + (Aa[1] - Ga[1]) * f], st = [e[0] + nx * 1.0, e[1] + nz * 1.0], y0 = ph.groundHeight(st[0], st[1], 0, false);
      if (!Number.isFinite(y0)) continue;
      const r = jump(st, -nx, -nz, sp, y0), beyond = -((r.q.x - e[0]) * nx + (r.q.z - e[1]) * nz) > 0.3;
      console.log((beyond ? 'FAIL ' : 'ok   ') + `D2: a jump at ${sp} m/s from the tread at y ${y0.toFixed(2)} (${(f * 100).toFixed(0)} % of the river edge) stays inside`); all &&= !beyond;
    }
    const st1 = p(0, 29.3), b = F.P.B, r1 = jump(st1, b[0], b[1], sp, -3.204), w1 = F.P.M(r1.q.x, r1.q.z).w;
    console.log((w1 > 31.4 ? 'FAIL ' : 'ok   ') + `D1: a jump at ${sp} m/s from the landing toward the water stays inside (w ${w1.toFixed(2)})`); all &&= w1 <= 31.4;
  }
}
{
  const m = ctx.services.landmarksMining.entrances.find((q) => q.name.startsWith('Горный музей'));
  if (m) { const nx = Math.sin(m.rotY), nz = Math.cos(m.rotY); test('museum: the door is closed (no walk-in)', [[m.x + nx * 2.2, m.z + nz * 2.2], [m.x - nx * 1.5, m.z - nz * 1.5]], false, null, 0); }
  else { console.log('FAIL museum entrance is missing from svc.entrances'); all = false; }
}
void gl;
test('terrace: along the quay terrace to the bust and the benches', [s(27, 4), s(19.5, 10.4), s(20, 14.5), s(24, 22)], true, 0);
test('bust: the pedestal blocks', [s(22, 13.4), s(16.2, 13.4)], false);
test('bust: a ring round it is open', [s(18, 13.4), s(18, 15), s(15, 15.6), s(14.4, 13.4)], true, 0);
test('hull: the Krasin blocks (nobody boards)', [s(18, -10), s(6, -10)], false);
test('gangway: the foot is closed', [s(26, 6.5), s(15, 6.3)], false);
test('quay: no walking on the water along the hull', [s(14, -8), s(8, -8)], false);
const S2 = ctx.services.landmarksMining;
console.log('monuments', S2.monuments.length, 'photo spots', S2.photoSpots.length, 'crowd', S2.crowd.length, 'lamps', S2.lamps.length, 'bollards', S2.bollards, 'benches', S2.benches.length, 'trees', S2.trees, 'plaques', S2.plaques, 'tris', S2.triangles, 'build ms', S2.buildMs);
console.log('parts', JSON.stringify(S2.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
