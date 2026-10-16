// tools/landmarksAndrew-walk.mjs - headless walk probe of landmarksAndrew (no GPU, builds ONLY the module on the baked layout): the cathedral precinct (open gates, the west court, the Golovin bust, the obelisk plaza),
// the Andreevsky boulevard (promenades and the central alley open, the lawn rails, the fountains, Korchmin and the horse-tram enclosure solid), the metro pavilion (11 steps, the doors), the market ring and the churches solid, the Annunciation forecourt and garden open.
// usage: node tools/landmarksAndrew-walk.mjs
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

// ---- walkability of landmarksAndrew
ctx.buildList = ['landmarksAndrew'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksAndrew.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksAndrew/frame.js')).href);
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
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.06)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const C = (a, b) => { const p = F.FC.W(a, b); return [p.x, p.z]; };
const M = (a, b) => { const p = F.FM.W(a, b); return [p.x, p.z]; };
const B = (s, q) => { const p = F.BW(s, q); return [p.x, p.z]; };
const S = ctx.services.landmarksAndrew;
// ---- cathedral and market (solid) -- more tests are added with every part
test('cathedral: through the west wall of the belfry', [C(-30, 0.5), C(-20, 0.5)], false);
test('market: through the north front', [M(0, -82), M(0, -70)], false);
test('market: the south passage is open (street -> tunnel -> courtyard)', [M(2.4, 84), M(2.4, 74), M(2.4, 66), M(2.4, 58), M(2.4, 46)], true);
test('market: along the courtyard (110 m)', [M(0, 46), M(0, -55)], true);
test('market: through the south front beside the passage', [M(10.5, 84), M(10.5, 70)], false);
test('market: through the tunnel wall', [M(6.5, 66), M(-1.5, 66)], false);
test('market: through the courtyard west face', [M(0, 0), M(-14, 0)], false);
test('market: through the courtyard east face', [M(0, 0), M(14, 0)], false);
test('market: along the north front outside the arcade', [M(-20, -81), M(20, -81)], true);
const V = (a, b) => { const p = F.FV.W(a, b); return [p.x, p.z]; };
const N = (a, b) => { const p = F.FN.W(a, b); return [p.x, p.z]; };
const P_ = (a, b) => { const p = F.FP.W(a, b); return [p.x, p.z]; };
// cathedral precinct
test('cathedral: the west court in front of the belfry is open', [C(-36, 0.5), C(-27, 0.5)], true);
test('cathedral: through the S portal wall', [C(-6, 20), C(-6, 12)], false);
test('cathedral: past the Golovin bust (2 m beside it)', [C(10.5, 30), C(10.5, 20)], true);
test('cathedral: through the Golovin pedestal', [C(8.1, 30), C(8.1, 22)], false);
test('cathedral: through the chapel of St Vladimir', [C(-21.1, 42), C(-21.1, 30)], false);
test('cathedral: through the Three Hierarchs church', [C(-9.1, -50), C(-9.1, -30)], false);
// boulevard
test('boulevard: the west promenade end to end', [B(80, -1), B(420, -1)], true);
test('boulevard: the east promenade end to end', [B(80, 18), B(420, 18)], true);
test('boulevard: from the Sredny end to the first lawn along the west facade', [B(10, 0), B(75, 0)], true);
test('boulevard: through the lawn rail at s 150 (west)', [B(150, 1), B(150, 6)], false);
test('boulevard: through the lawn rail at s 300 (east)', [B(300, 17), B(300, 12)], false);
test('boulevard: across the street at the cross path s 136', [B(136, 1), B(136, 16)], true);
test('boulevard: across the street at the cross path s 287', [B(287, 1), B(287, 16)], true);
test('boulevard: through the fountain basin (s 176)', [B(176.2, 4), B(176.2, 14)], false);
test('boulevard: round the fountain at 5 m', [B(171, 8.8), B(176.2, 14), B(181.4, 8.8)], true);
test('boulevard: through the Korchmin pedestal', [B(238.2, -2), B(238.2, -10)], false);
test('boulevard: a ring at 4.5 m round Korchmin stays open', [B(238.2, -1.5), B(242.5, -6), B(238.2, -10.5), B(233.9, -6), B(238.2, -1.5)], true);
test('konka: through the enclosure rail', [B(21.3, 5), B(21.3, 16)], false);
test('konka: along the outside of the enclosure', [B(10, 6), B(34, 6)], true);
test('boulevard: the Bolshoy end plaza is open', [B(450, 6), B(470, 14)], true);
// pavilion
test('pavilion: the square in front of the NE face', [V(40, -30), V(25, 10)], true);
test('pavilion: up the stairs of the NE face (to the top treads)', [V(26, 6), V(16.2, 6)], true, null, 0);
test('pavilion: through the SE plain wall', [V(2, 24), V(2, 15)], false);
test('pavilion: through the wall beside the door', [V(20, 9), V(10, 9)], false);
// Pel house
test('pel: through the east face', [P_(45, 5), P_(30, 5)], false);
test('pel: the Griffins tower is solid', [P_(11, 5), P_(11, -6)], false);
// Annunciation
test('annunciation: the forecourt from the 8th-line gate to the portico steps (the gate is open)', [N(-105, 1.1), N(-60, 1.1), N(-40, -8), N(-32, -8)], true);
test('annunciation: through the church portico wall', [N(-40, 0.65), N(-20, 0.65)], false);
test('annunciation: through the forecourt south fence', [N(-45, 14), N(-45, 22)], false);
test('annunciation: through the garden fence on the 8th line (outside the gate)', [N(-104, -70), N(-96, -70)], false);
test('annunciation: into the garden through the pavilion gate', [N(-105, -60.9), N(-90, -60.9), N(-75, -60)], true);
test('annunciation: along the garden axis', [N(-60, -59.4), N(10, -58)], true);
test('annunciation: through the chapel of 1899', [N(-92, -75), N(-92, -90)], false);
console.log("paving tris", S.pavingTris, "larches", S.larches, "trees", S.trees.length, "lamps", S.lamps.length, "fences", S.fences.length, "entrances", S.entrances.length, "crowd", S.crowd.length, "photoSpots", S.photoSpots.length, "monuments", S.monuments.length); console.log("monuments", S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
