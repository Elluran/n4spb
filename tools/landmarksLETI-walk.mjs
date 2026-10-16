// tools/landmarksLETI-walk.mjs - headless walk probe of landmarksLETI (no GPU, the module alone): the player stands on every walkable surface the module draws (the Corpus 1 porch landing and its five steps,
// the Corpus 5 stair of 16 steps and its landing, the platform of the war memorial) and cannot walk through the solid parts (the walls of the five buildings, the shut doors, the porch columns, the round brick towers,
// the pedestals and figures, the fence); the forecourts, the pavements round the buildings and the campus paths stay open.  Nothing here is water: nobody can fall in.
// usage: node tools/landmarksLETI-walk.mjs
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
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksLETI'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksLETI.js')).href);
await mod.build(ctx);
const imp = (f) => import(pathToFileURL(path.join(root, 'src/world/landmarksLETI/' + f)).href);
const F = await imp('frame.js'), KIT = await imp('kit.js'), EN5 = await imp('entrance5.js'), PORCH = await imp('porch.js'), BU = await imp('busts.js'), C5 = await imp('corpus5.js');
const ph = ctx.physics;
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.1)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};

// ---- Corpus 1: frames of its edges
const ring1 = F.ringOf(F.IDS.c1), E1 = KIT.ringEdges(KIT.polyOf(ring1, F.holesOf(F.IDS.c1))).filter((e) => !e.hole);
const edge = (i) => E1.find((e) => e.i === i);
const at = (e, u, out) => { const f = KIT.frameOf(e); return [f.x + f.xa[0] * u + e.n[0] * out, f.z + f.xa[1] * u + e.n[1] * out]; };
const eP = edge(28), xm = eP.len / 2, PC = PORCH.PORCH;
test('corpus 1: the porch steps lead up to the landing (1.52 m)', [at(eP, xm, 9), at(eP, xm, 2.0)], true, PC.landTop);
test('corpus 1: along the landing between the columns is open', [at(eP, xm - 1.4, 2.2), at(eP, xm + 1.4, 2.2)], true, PC.landTop, PC.landTop);
test('corpus 1: a porch column blocks', [at(eP, xm - PC.colD, 3.2), at(eP, xm - PC.colD, 0.9)], false, null, PC.landTop);
test('corpus 1: the shut main door blocks', [at(eP, xm, 2.0), at(eP, xm, 0.2)], false, null, PC.landTop);
test('corpus 1: the west front beside the porch blocks (plain wall)', [at(eP, 3, 6), at(eP, 3, 0.3)], false);
test('corpus 1: along the west pavement 6 m out is open', [at(eP, 0, 6), at(eP, eP.len, 6)], true, 0);
const eS = edge(14);
test('corpus 1: the south front blocks', [at(eS, 10, 5), at(eS, 10, 0.3)], false);
test('corpus 1: along the south pavement 3 m out is open', [at(eS, 2, 3.5), at(eS, eS.len - 2, 3.5)], true, 0);
const eG = edge(21);
test('corpus 1: the clock gable blocks', [at(eG, eG.len / 2, 6), at(eG, eG.len / 2, 0.3)], false);
test('corpus 1: the fence round the south-west corner blocks', [[-1759.5, -4286], [-1759.5, -4294]], false);
test('corpus 1: the long east wall blocks', [at(edge(38), 40, 6), at(edge(38), 40, 0.3)], false);
// ---- Corpus 5
const fr5 = EN5.EF, EN = EN5.EN;
test('corpus 5: the plaza in front of the stair is open', [fr5.w(0, 22), fr5.w(0, 9)], true, 0);
test('corpus 5: up the sixteen steps to the landing (2.55 m)', [fr5.w(0, 9), fr5.w(0, 1.5)], true, EN.landY);
test('corpus 5: the glass doors are shut', [fr5.w(0, EN.landD + 0.3), fr5.w(0, 0.1)], false, null, EN.landY);
test('corpus 5: the stair side (steel rail) blocks from the plaza', [fr5.w(-11.5, 6.5), fr5.w(-7.0, 6.5)], false);
test('corpus 5: the round brick tower blocks', [fr5.w(-12, 3.9), fr5.w(-18, 3.9)], false);
test('corpus 5: the long lab wing blocks', [fr5.w(29, 5), fr5.w(40, 5)], false);
test('corpus 5: the north tower blocks', [[-1566, -4482], [-1560, -4468]], false);
test('corpus 5: the campus court beside the stair is open', [fr5.w(-12, 20), fr5.w(-12, 9)], true, 0);
// ---- Corpus 7 (archive) and Corpus D
const ring7 = F.ringOf(F.IDS.c7), E7 = KIT.ringEdges(KIT.polyOf(ring7, [])), m7 = (i, out) => { const e = E7.find((q) => q.i === i); return at(e, e.len / 2, out); };
test('corpus 7: the arm end blocks', [m7(3, 6), m7(3, 0.3)], false);
test('corpus 7: the central tower blocks', [m7(3, 6), m7(3, 0.5)], false);
test('corpus 7: round the building is open', [m7(3, 6), m7(3, 16), m7(0, 16), m7(0, 6)], true, 0);
const ringD = F.ringOf(F.IDS.cD), ED = KIT.ringEdges(KIT.polyOf(ringD, []));
const eD = ED.reduce((b, q) => (!b || q.len > b.len ? q : b), null);
test('corpus D: the long wall blocks', [at(eD, eD.len / 2, 6), at(eD, eD.len / 2, 0.3)], false);
test('corpus D: the pavement 5 m out is open', [at(eD, 3, 5), at(eD, eD.len - 3, 5)], true, 0);
// ---- busts and the war memorial
const S = BU.SPOTS;
const fwd = (s, d, side = 0) => [s.x + Math.sin(s.rot) * d + Math.cos(s.rot) * side, s.z + Math.cos(s.rot) * d - Math.sin(s.rot) * side];
test('Popov bust: the pedestal blocks', [fwd(S.popov, 3), fwd(S.popov, 0)], false);
test('Popov bust: walking past it is open', [fwd(S.popov, 3, -2), fwd(S.popov, -3, -2)], true, 0);
test('Vologdin bust: the pedestal blocks', [fwd(S.vologdin, 3), fwd(S.vologdin, 0)], false);
test('war memorial: up the steps onto the platform (0.3 m)', [fwd(S.war, 9), fwd(S.war, 2.5)], true, 0.3);
test('war memorial: the figure blocks', [fwd(S.war, 2.5), fwd(S.war, 0.2)], false, null, 0.3);
const SV = ctx.services.landmarksLETI;
console.log('monuments', SV.monuments.length, 'entrances', SV.entrances.length, 'photoSpots', SV.photoSpots.length, 'tris', Math.round(SV.triangles), 'build ms', SV.buildMs);
console.log('parts', JSON.stringify(SV.parts));
void C5;
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
