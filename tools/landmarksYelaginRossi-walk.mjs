// tools/landmarksYelaginRossi-walk.mjs - headless walk probe of landmarksYelaginRossi (no GPU, the module alone): the Music Pavilion (steps, loggia, rotunda, the three doors, columns, wings), the East pavilion (park steps,
// porch, oval portico and its steps, columns, walls), the spit railing, the hoarding of the Guardhouse site, the Island pavilion piers.  Walks a polyline in 0.1 m steps with the player radius 0.35
// (physics.resolve + groundHeight): ok = open, FAIL otherwise.   usage: node tools/landmarksYelaginRossi-walk.mjs     (ROSSI_STAIR=1 also builds and tests the granite stair, as if registered in environment/owners.js)
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
const { parkPonds } = await import(pathToFileURL(path.join(root, 'src/world/environment/river.js')).href);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
camera.position.set(0, 1.6, 30);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
let audio; try { audio = createAudio(); } catch (e) { audio = null; }
const quality = { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 };
const ctx = createContext({ scene, camera, renderer: null, audio, quality, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
ctx.buildList = ['landmarksYelaginRossi'];
const GR = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginRossi/groups.js')).href);
if (process.env.ROSSI_STAIR) {        // simulate the hand-over: the ring of the stair pit is water (terrain = river bed) as environment/owners.js would make it
  const inRing = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  const h0 = ctx.physics.heightAt; ctx.physics.heightAt = (x, z) => (GR.WATER_RINGS.some((w) => inRing(x, z, w.ring)) ? -6 : h0(x, z));
}
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginRossi.js')).href);
await mod.build(ctx);
const FR = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginRossi/frame.js')).href);
const MU = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginRossi/music.js')).href);
const EA = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginRossi/east.js')).href);
const ph = ctx.physics, S = ctx.services.landmarksYelaginRossi;
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
const itemsAt = (x, z, r = 0.4) => ph.items.filter((o) => Math.hypot(o.cx - x, o.cz - z) < (o.type === 'cyl' ? o.r : Math.hypot(o.hw, o.hd)) + r).map((o) => `${o.type}:${o.top ?? o.y1 ?? ''}/${o.y0 ?? ''}`).join(' ');
const test =(label, pts, open, yEnd, y0 = 0) => {
  const r = walk(pts, y0), ok = open ? (!r.stuck && (yEnd == null || Math.abs(r.y - yEnd) < 0.08)) : r.stuck;
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (r.stuck ? ` (blocked at ${r.at.map((v) => v.toFixed(1))})` : ` (open, feet y ${r.y.toFixed(2)})`));
  all &&= ok;
};
const M = (u, v) => FR.toWorld(FR.MUSIC, u, v), E = (x, z) => FR.toWorld(FR.EAST, x, z);
const pol = (R, deg) => { const th = deg * Math.PI / 180; return M(R * Math.cos(th), MU.RC - R * Math.sin(th)); };
// ---- Music Pavilion
test('Music: up the five front steps onto the loggia floor', [M(0, 4), M(0, 1.8), M(0, -0.6), M(0, -3)], true, MU.F);
test('Music: across the loggia into the rotunda', [M(0, -3), M(0, -6.6), M(2.5, -8)], true, MU.F, MU.F);
test('Music: out of the middle door of the rotunda and down its steps', [pol(3, 90), pol(7.2, 90), pol(8.2, 90)], true, 0, MU.F);
test('Music: out of the left door (54 deg) and down its steps', [pol(3, 54), pol(7.2, 54), pol(8.2, 54)], true, 0, MU.F);
test('Music: out of the right door (126 deg)', [pol(3, 126), pol(7.2, 126), pol(8.2, 126)], true, 0, MU.F);
test('Music: a blind arch (18 deg) blocks', [pol(3, 18), pol(7.2, 18)], false, null, MU.F);
test('Music: a loggia column blocks (from the steps)', [M(-0.9, 1.2), M(-0.9, -0.3)], false);
test('Music: the right wing ledge blocks (0.95 m above the apron)', [M(8.4, 3), M(8.4, -0.4)], false);
test('Music: the end wall of a wing blocks', [M(14, -4), M(10, -4)], false);
test('Music: the back of the wing blocks', [M(8.4, -12), M(8.4, -8)], false);
test('Music: a ring 3 m round the plinth is open', Array.from({ length: 25 }, (_, i) => M(Math.cos(i / 24 * 6.2832) * 16 + 0, Math.sin(i / 24 * 6.2832) * 16 - 4)), true, 0);
// ---- East pavilion
test('East: up the three park steps onto the west porch', [E(0, -11.5), E(0, -9.4), E(0, -8.0)], true, EA.FE);
test('East: along the west porch between columns and wall', [E(-6, -7.4), E(6, -7.4)], true, EA.FE, EA.FE);
test('East: a west column blocks', [E(-1.35, -10.5), E(-1.35, -8.0)], false);
test('East: the west wall blocks', [E(0, -7.4), E(0, -5)], false, null, EA.FE);
test('East: onto the oval portico over its two steps', [E(0, 9), E(0, 6), E(0, 2.5)], true, EA.FE);
test('East: a ring of 9 m round the oval is open', Array.from({ length: 21 }, (_, i) => E(Math.cos(i / 20 * Math.PI + 0) * 9, Math.sin(i / 20 * Math.PI) * 8)), true, null, 0.12);
test('East: the north end wall blocks', [E(12, -4), E(8, -4)], false);
test('East: the quay railing blocks (shore at x -4331)', [[-4345, -5372], [-4329.5, -5372]], false, null, 0.12);
// ---- the spit terrace: walkable along the whole gravel (slab boxes of spit.js), no raised walk plane over the lawn beside it
test('East spit: along the south and north parts of the terrace', [[-4343, -5391], [-4352, -5388], [-4348, -5372], [-4337, -5371]], true, 0.12, 0.12);
{
  const gh = (x, z) => ph.groundHeight(x, z, 0.3, false), inside = [[-4345, -5385], [-4350, -5389], [-4340, -5371]], outside = [[-4366, -5390], [-4364, -5371], [-4357, -5362]];
  for (const [x, z] of inside) { const g = gh(x, z), ok = Math.abs(g - 0.12) < 0.03; console.log((ok ? 'ok   ' : 'FAIL ') + `East spit: terrace plane under (${x},${z}) = ${g.toFixed(2)}`); all &&= ok; }
  for (const [x, z] of outside) { const g = gh(x, z), ok = !(Math.abs(g - 0.12) < 0.03); console.log((ok ? 'ok   ' : 'FAIL ') + `East spit: no raised plane over the lawn at (${x},${z}) = ${g.toFixed(2)}`); all &&= ok; }
}
// ---- Guardhouse site, Island
test('Guard: the hoarding blocks (from the alley)', [[-4545, -5012], [-4570, -5014]], false);
{ const a = FR.toWorld(FR.ISLAND, 4.5, 1.6), b = FR.toWorld(FR.ISLAND, 1.85, 1.6); test('Island: a pier blocks', [a, b], false); }
if (S.stair) test('East stair: down the granite flight to the landing', [[-4336.8, -5383.4], [-4332.3, -5383.8]], true, -2.9, 0.12);
if (process.env.ROSSI_DEBUG) for (let v = 3; v > -3; v -= 0.25) { const [x, z] = M(0, v); console.log('v', v, 'ground', ph.groundHeight(x, z, 0.3, false).toFixed(2), itemsAt(x, z)); }
if (process.env.ROSSI_DEBUG) { let y = 0; for (let v = 2.0; v > 0.2; v -= 0.1) { const [x, z] = M(0, v), p = { x, z }; ph.resolve(p, 0.35, y, 1.7); const g = ph.groundHeight(p.x, p.z, y, false); console.log('walk v', v.toFixed(2), 'moved', Math.hypot(p.x - x, p.z - z).toFixed(2), 'y', y.toFixed(2), 'ground', g.toFixed(2)); if (Number.isFinite(g)) y = g; } }
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'triangles', S.triangles, 'buildMs', S.buildMs);
console.log('parts', JSON.stringify(S.parts), 'spit', JSON.stringify(S.spit || {}));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
