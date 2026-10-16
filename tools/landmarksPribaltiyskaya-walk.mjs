// tools/landmarksPribaltiyskaya-walk.mjs - headless walk probe of landmarksPribaltiyskaya (no GPU; the module alone, so the generic streets / environment colliders are NOT in it): the plaza and the stair (20 risers) up to the terrace,
// the 3.2 m retaining walls and the hull block, the Creators pedestal, benches / lawn-bed kerbs / planters / canopy piers, the base of Peter I, the Kirov platform (reached by the three south-west steps), the wall arc, the niches,
// the turrets, the wreath ring (the disc is flat and walkable), the propeller plinths, the anchors, the college wing, Waterville, the round glass building and the Nakhimov pedestal.  Every published photo spot must be on land
// (not in a waterway polygon) and not inside a collider.
// usage: node tools/landmarksPribaltiyskaya-walk.mjs
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
let audio; try { audio = createAudio(); } catch (e) { console.log('audio createAudio() threw:', e.message); audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksPribaltiyskaya'];
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksPribaltiyskaya.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksPribaltiyskaya/frame.js')).href);
const ph = ctx.physics, H = F.HF, KK = F.KF;
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
const h = (a, b) => { const p = H.W(a, b); return [p.x, p.z]; };
const k = (a, b) => { const p = KK.W(a, b); return [p.x, p.z]; };

// ---- the hotel forecourt
test('plaza: walk straight up the stair to the terrace beside the group (x 8, z 20 -> -10)', [h(8, 20), h(8, 6), h(8, -10)], true, 3.2);
test('plaza: along the foot of the stair (z 13.2, x -12 .. 16)', [h(-12, 13.2), h(16, 13.2)], true, 0);
test('stair: the cheek wall blocks (x 22.5 -> 18.9 at z 10.5)', [h(22.5, 10.5), h(18.9, 10.5)], false);
test('walls: the north retaining wall blocks from the plaza (x 45, z 14 -> 6)', [h(45, 14), h(45, 6)], false);
test('walls: the south retaining wall blocks (x -45, z 14 -> 6)', [h(-45, 14), h(-45, 6)], false);
test('terrace: walk to the lobby front under the canopy (x 0, z -5 -> -52.5)', [h(0, -5), h(0, -52.5)], true, 3.2, 3.2);
test('hull: the central block wall blocks (x 0, z -52 -> -57)', [h(0, -52), h(0, -57)], false, null, 3.2);
test('hull: the front arm inner face blocks (x 24 -> 36 at z -35)', [h(24, -35), h(36, -35)], false, null, 3.2);
test('terrace: from the stair top to the north tower base (x 10 -> 50, z -10)', [h(10, -10), h(50, -10)], true, 3.2, 3.2);
test('tower: the zigzag stair block blocks (x 46.7, z -12 -> -23)', [h(46.7, -12), h(46.7, -23)], false, null, 3.2);
test('group: the Creators pedestal blocks (x 0, z 4 -> -2)', [h(0, 4), h(0, -2)], false, null, 3.2);
test('group: a ring round the pedestal at 4 m is open', [h(4, 0.4), h(4, -3), h(-4, -3), h(-4, 0.4)], true, 3.2, 3.2);
test('plaza: a lawn bed (kerb 0.45 m) can be crossed (z 20 -> 31.8)', [h(0, 20), h(0, 31.8)], true, 0);
test('plaza: a box bench blocks (x 0, z 38 -> 31)', [h(0, 38), h(0, 31)], false);
test('plaza: between the benches (x 5.2, z 80 -> 18)', [h(5.2, 80), h(5.2, 18)], true, 0);
test('terrace: a park bench blocks (x 9, z -21 -> -27)', [h(9, -21), h(9, -27)], false, null, 3.2);
test('canopy: a pier blocks (x -11.5, z -40 -> -45)', [h(-11.5, -40), h(-11.5, -45)], false, null, 3.2);
test('plinth: the north end wall blocks (x 80 -> 70, z 0)', [h(80, 0), h(70, 0)], false);
test('rear: the pavilion wall blocks (x 0, z -150 -> -140)', [h(0, -150), h(0, -140)], false);
// ---- Peter I
test('Peter I: the base blocks (x 10 -> 0, z 106.6)', [h(10, 106.6), h(0, 106.6)], false);
test('Peter I: a ring round the base at 6.4 m is open', [h(6.4, 106.6 + 6.4), h(-6.4, 106.6 + 6.4), h(-6.4, 106.6 - 6.4), h(6.4, 106.6 - 6.4), h(6.4, 106.6 + 6.4)], true, 0);
// ---- the Kirov memorial
test('Kirov: from the footway up the three steps onto the platform (x 12, z -5 -> 6)', [k(12, -5), k(12, 6)], true, 0.55);
test('Kirov: the 0.55 m curb of the bump blocks from the road (x 0, z -9 -> -4)', [k(0, -9), k(0, -4)], false);
test('Kirov: the bump round the wreath is reached from the platform (x 12, z 3 -> 4, -2 -> 0, -4)', [k(12, 3), k(4, 1), k(2, -3), k(0, -4)], true, 0.55, 0.55);
test('Kirov: the wreath ring blocks (x 4 -> 0, z 0)', [k(4, 0), k(0, 0)], false, null, 0.55);
test('Kirov: the disc is open round the ring (r 2.45)', Array.from({ length: 13 }, (_, i) => k(Math.cos(i / 12 * 6.2832) * 2.45, Math.sin(i / 12 * 6.2832) * 2.45)), true, null, 0.55);
test('Kirov: the wall arc blocks (x 10, z 20 -> 40)', [k(10, 20), k(10, 40)], false, null, 0.55);
test('Kirov: the first turret blocks (x 0, z 21 -> 27)', [k(0, 21), k(0, 27)], false, null, 0.55);
test('Kirov: the second turret blocks (x 0, z 37 -> 42)', [k(0, 37), k(0, 42)], false, null, 0.55);
test('Kirov: the niche block blocks (x 24.55, z 5 -> 10.5)', [k(24.55, 5), k(24.55, 10.5)], false, null, 0.55);
test('Kirov: walk along the rear bar of the platform (z 50, x -30 .. 34)', [k(-30, 50), k(34, 50)], true, 0.55, 0.55);
test('Kirov: the propeller plinth blocks (x 46 -> 51.1, z -2.3)', [k(46, -2.3), k(51.1, -2.3)], false);
test('Kirov: the anchor plinth blocks (x 30 -> 32.5, z 46.4)', [k(30, 46.4), k(32.5, 46.4)], false, null, 0.55);
test('college: the front wall blocks (x 0, z 66 -> 74)', [k(0, 66), k(0, 74)], false);
// ---- Nakhimov, Waterville, the round building
const nk = [F.NK.x, F.NK.z];
test('Nakhimov: the pedestal blocks', [[nk[0] + 4, nk[1]], nk], false);
test('Nakhimov: walk round it at 3.2 m', [[nk[0] + 3.2, nk[1]], [nk[0], nk[1] + 3.2], [nk[0] - 3.2, nk[1]], [nk[0], nk[1] - 3.2]], true, 0);
test('Waterville: the glass front blocks (x 0, z -245 -> -232)', [h(0, -245), h(0, -232)], false);
test('round glass building: its wall blocks (x -145, z 245 -> 262)', [h(-145, 245), h(-145, 262)], false);
// ---- photo spots: on land and not inside a collider
const S = ctx.services.landmarksPribaltiyskaya, spots = S.photoSpots || [];
for (const sp of spots) {
  const fy = Math.max(0, ph.groundHeight(sp.x, sp.z, 1e9, false)), p = { x: sp.x, z: sp.z }; ph.resolve(p, 0.35, Number.isFinite(fy) ? fy : 0, 1.7);
  const moved = Math.hypot(p.x - sp.x, p.z - sp.z), water = L.inRiver(sp.x, sp.z), edge = L.shoreDist(sp.x, sp.z);
  const ok = !water && moved < 0.1;
  console.log((ok ? 'ok   ' : 'FAIL ') + `photo spot ${sp.name} (${sp.x.toFixed(1)}, ${sp.z.toFixed(1)}): ${water ? 'IN WATER' : 'land'}, shore ${edge.toFixed(1)} m, ${moved < 0.1 ? 'free' : 'inside a collider (moved ' + moved.toFixed(2) + ')'}`);
  all &&= ok;
}
console.log('monuments', S.monuments.length, 'photo spots', spots.length, 'entrances', S.entrances.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
