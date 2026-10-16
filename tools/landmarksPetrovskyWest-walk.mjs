// tools/landmarksPetrovskyWest-walk.mjs - headless walk probe of the Petrovsky-west module: the malthouse, its ruin, the site hoarding with its gate, the Gote mansion and its fence, the arched hall lit. V, the water tower
// and the Almaz office are solid from every side; the yard in front of the malthouse (through the gate) and the ground between the sights stay open.
// usage: node tools/landmarksPetrovskyWest-walk.mjs   (builds the module with the stubbed DOM of tools/check.mjs and walks polylines through ph.resolve / ph.groundHeight like the player)
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
ctx.buildList = ['landmarksPetrovskyWest'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyWest.js')).href);
await mod.build(ctx);
const ph = ctx.physics;
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
// ---- frames of the module
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPetrovskyWest/frame.js')).href);
const pw = (f) => (lx, lz) => { const p = F.toWorld(f, lx, lz); return [p.x, p.z]; };
// malthouse: the west edge frame; hoarding at lz = 11, gate x 31..36
{ const ring = F.ringOf(F.IDS.malt), f = F.edgeFrame(F.edgeToward(ring, 1, 0, 30)), W = pw(f), len = f.len;
  T([W(10, 20), W(10, 5)], 'malthouse: the hoarding blocks away from the gate', false);
  T([W(33.5, 20), W(33.5, 3)], 'malthouse: the gate gap leads into the yard', true);
  T([W(33.5, 3), W(33.5, -4)], 'malthouse: the front wall is solid', false);
  T([W(60, 5), W(60, -4)], 'malthouse: the south block front is solid', false);
  T([W(-12, 5), W(-3, 5)], 'malthouse: the north return of the hoarding blocks', false);
  T([W(len + 12, 5), W(len + 3, 5)], 'malthouse: the south return of the hoarding blocks', false);
  T([W(30, -30), W(30, -22)], 'malthouse: the back wall is solid', false);
  T([W(-8, -10), W(2, -10)], 'malthouse: the north end wall is solid', false);
  T([W(len + 8, -10), W(len - 2, -10)], 'malthouse: the south end wall is solid', false);
  T([W(-15, -30), W(len + 15, -30)], 'malthouse: open ground along the back', true); }
// ruin: closed on all four sides
{ const ring = F.ringOf(F.IDS.ruin), e = ring && F.ringEdges(ring).reduce((a, q) => (q.len > a.len ? q : a)), f = F.edgeFrame(e), W = pw(f), RW = f.len;
  T([W(RW / 2, 8), W(RW / 2, -3)], 'ruin: the long wall is solid', false);
  T([W(RW / 2, -28), W(RW / 2, -17)], 'ruin: the back wall is solid', false);
  T([W(-8, -10), W(2, -10)], 'ruin: the west wall is solid', false);
  T([W(RW + 8, -10), W(RW - 2, -10)], 'ruin: the east wall is solid', false); }
// mansion: the five volumes, the fence
{ const C0 = [-4796.1, -3050.1], c = Math.cos(18 * Math.PI / 180), s = Math.sin(18 * Math.PI / 180), U = (u, v) => [C0[0] + u * c - v * s, C0[1] + u * s + v * c];
  T([U(-3, 14), U(-3, 6)], 'mansion: the main body south wall is solid', false);
  T([U(-3, -6), U(-3, -2)], 'mansion: inside the main body (blocked)', false);
  T([U(-13, 16), U(-13, 8)], 'mansion: the west wing south end is solid', false);
  T([U(8, 16), U(8, 8)], 'mansion: the mid wing south end is solid', false);
  T([U(24, 0), U(18, 0)], 'mansion: the east bay is solid', false);
  T([U(-22, -2), U(-14, -2)], 'mansion: the west wing west wall is solid', false);
  T([U(-3, -22), U(-3, -12)], 'mansion: the north fence blocks (where it stands off the roads)', false);
  T([U(-3, 22), U(-3, 14)], 'mansion: open ground south of the house', true); }
// hall lit. V
{ const ring = F.ringOf(F.IDS.hallV), e = F.ringEdges(ring).reduce((a, q) => (q.len > a.len ? q : a)), f = F.edgeFrame(e), W = pw(f);
  T([W(f.len / 2, 8), W(f.len / 2, -2)], 'hall V: the long wall is solid', false);
  T([W(f.len / 2, 14), W(f.len / 2, 6)], 'hall V: the yard in front is open', true); }
// water tower
{ const ring = F.ringOf(F.IDS.tower), cx = ring.reduce((a, p) => a + p[0], 0) / 4, cz = ring.reduce((a, p) => a + p[1], 0) / 4;
  T([[cx - 9, cz], [cx - 3, cz]], 'tower: solid from the west', false);
  T([[cx, cz - 9], [cx, cz - 3]], 'tower: solid from the north', false); }
// Almaz
{ const ring = F.ringOf(F.IDS.almaz), e = F.ringEdges(ring).reduce((a, q) => (q.len > a.len ? q : a)), f = F.edgeFrame(e), W = pw(f);
  T([W(20, 6), W(20, -3)], 'almaz: the front wall is solid', false);
  T([W(11, 6), W(11, -3)], 'almaz: the entrance door is closed', false);
  T([W(20, 12), W(20, 4)], 'almaz: the pavement in front is open', true); }
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
