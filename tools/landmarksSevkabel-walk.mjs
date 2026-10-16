// tools/landmarksSevkabel-walk.mjs - headless walk probe of landmarksSevkabel (no GPU).  The ENVIRONMENT is built first (about 25 s, NODE_OPTIONS=--max-old-space-size=14000: the drawn quay is not the river polygon), `--no-env` runs the fast
// standalone version (no quay colliders).  Asserts that the promenade deck, the sea square, the inner alley, the pier plaza and the lane in front of the mansion are open, that the hall (walls, ribs), the gallery piers and the stair
// tower, the Corten plates, the generator, the spool towers, the yard wall of the mansion, the fences of the almshouse, the Skobsky Palace and the chimneys block, that nobody walks onto the water, and that every published
// photo spot is on land and outside a collider.   usage: node tools/landmarksSevkabel-walk.mjs [--no-env]
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
const WITH_ENV = !process.argv.includes('--no-env');
ctx.buildList = WITH_ENV ? ['environment', 'landmarksSevkabel'] : ['landmarksSevkabel'];
if (WITH_ENV) { const env = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href); await env.build(ctx); }
const mod = await import(pathToFileURL(path.join(root, 'src/world/landmarksSevkabel.js')).href);
await mod.build(ctx);
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksSevkabel/frame.js')).href);
const ph = ctx.physics, H = F.H, M = F.M, K = F.K, A = F.A;
scene.updateMatrixWorld(true);

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
/** one of several lanes must be open (a tree / lamp may stand in one) */
const anyLane = (label, lanes) => {
  let best = -1; lanes.forEach((l, i) => { if (best < 0) { const r = walk(l, 0); if (!r.stuck) best = i; } });
  console.log((best >= 0 ? 'ok   ' : 'FAIL ') + label + (best >= 0 ? ` (lane ${best})` : ' (all lanes blocked)')); all &&= best >= 0;
};
const h = (u, v) => { const p = H.W(u, v); return [p.x, p.z]; };
const m = (u, v) => { const p = M.W(u, v); return [p.x, p.z]; };
const k = (u, v) => { const p = K.W(u, v); return [p.x, p.z]; };
const a = (u, v) => { const p = A.W(u, v); return [p.x, p.z]; };

// ---- the hall and the promenade (frame H)
anyLane('deck: along the promenade from the NW end to the SE end', [[h(-70, 31), h(70, 31)], [h(-70, 30), h(70, 30)], [h(-70, 32), h(70, 32)]]);
anyLane('lawn: across the lawn from the deck to the quay path', [[h(10, 33), h(10, 47)], [h(14, 33), h(14, 47)], [h(0, 33), h(0, 47)]]);
test('hall: the river face blocks (through a bay between two ribs)', [h(-45, 31), h(-45, 23)], false);
test('hall: a rib blocks', [h(-63.6, 28), h(-63.6, 24)], false);
test('hall: along the foot of the ribs between them is open', [h(-57, 31), h(-57, 27.5)], true, 0);
test('hall: the NE (alley) face blocks', [h(0, -29), h(0, -23)], false);
test('hall: the NW gable blocks', [h(-83, -5), h(-76, -5)], false);
test('hall: the SE gable beside its fair door blocks', [h(84, 8), h(76, 8)], false);
test('fair: NW door admits a ground-level walker', [h(-84, -9.65), h(-73, -9.65), h(-73, 0)], true, .08);
test('fair: SE door admits a ground-level walker', [h(84, 1.6), h(73, 1.6), h(73, 0)], true, .08);
test('fair: alley door admits a ground-level walker', [h(4, -37), h(4, -20), h(4, 0)], true, .08);
test('fair: central aisle connects both entrance lobbies', [h(-73, 0), h(73, 0)], true, .08);
test('fair: transverse aisle connects alley and river sides', [h(4, -22), h(4, 22)], true, .08);
test('fair: a ceramic stall counter blocks', [h(-62, -8), h(-62, -12)], false);
test('fair: an ordinary river window still blocks from inside', [h(-45, 22), h(-45, 28)], false);
// Physical entry alone is insufficient: an opaque glass pane could still span
// the doorway. Cast through its full thickness at walking eye height.
for (const [name, x, z, nx, nz] of [['NW', -78.6, -9.65, -1, 0], ['SE', 78.6, 1.6, 1, 0], ['alley', 4, -25, 0, -1]]) {
  const a0 = H.W(x + nx * 1.1, z + nz * 1.1), a1 = H.W(x - nx * 1.1, z - nz * 1.1);
  const origin = new THREE.Vector3(a0.x, 1.52, a0.z), end = new THREE.Vector3(a1.x, 1.52, a1.z);
  const ray = new THREE.Raycaster(origin, end.clone().sub(origin).normalize(), 0, origin.distanceTo(end));
  const hits = ray.intersectObject(ctx.staticRoot, true), ok = hits.length === 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'fair: ' + name + ' entrance has no invisible wall/glass (' + hits.length + ' ray hits)');
  all &&= ok;
}
test('quay: no walking on the water from the deck (through the rail line)', [h(0, 31), h(0, 60)], false);
test('quay: no walking on the water at the NW end of the strip', [h(-100, 25), h(-100, 45)], false);
test('quay: no walking on the water at the pier plaza', [h(95, 40), h(95, 62)], false);
test('gallery: a pier blocks', [h(68.4, 30), h(68.4, 38)], false);
test('gallery: the stair tower blocks', [h(70.9, 40), h(70.9, 50)], false);
anyLane('gallery: along the SE outside of the gallery is open', [[h(76.5, 30), h(76.5, 48)], [h(77.5, 30), h(77.5, 48)], [h(79, 30), h(79, 48)]]);
test('container: the blue ticket container blocks', [h(89.6, 38), h(89.6, 31)], false);
test('alley: through the gallery bridge piers', [h(55.4, -22), h(55.4, -30)], false);
anyLane('alley: along the inner alley (between the hall and 40A)', [[h(-4, -37), h(50, -37)], [h(-4, -35), h(50, -35)], [h(-4, -39), h(50, -39)]]);
anyLane('alley: under the bridge', [[h(50, -37.5), h(70, -37.5)], [h(50, -34), h(70, -34)], [h(50, -41), h(70, -41)]]);
anyLane('sea square: across the sea square from the NW gable to the quay', [[h(-95, 5), h(-95, 24)], [h(-98, 8), h(-98, 22)], [h(-90, 6), h(-90, 22)]]);
anyLane('pier plaza: across the gravel plaza', [[h(85, 5), h(100, 20)], [h(95, -10), h(100, 10)]]);
test('boat: the upturned boat blocks', [h(-46, -32), h(-46, -22)], false);
test('spool tower: a tower blocks', [h(-10, -36), h(-10, -26)], false);
test('Tesla generator: it blocks', [h(-93, -32), h(-93, -22)], false);
anyLane('Tesla generator: a ring round it is open', [[h(-97.5, -22), h(-97.5, -32), h(-88, -32)], [h(-99, -22), h(-99, -32)]]);
// ---- the yard: 40D, 40E, 40A, the gate, the chimney
test('40A: the podium blocks', [h(40, -45), h(40, -52)], false);
test('40E: the block blocks', [h(-100, -20), h(-106, -20)], false);
test('40D: the east block blocks', [h(-27, -60), h(-33, -60)], false);
test('chimney: the 42 m brick chimney blocks', [h(-78.5, -90), h(-78.5, -97)], false);
{   // every Corten plate blocks across its middle
  const pl = ctx.services.landmarksSevkabel.fences.filter((f) => f.solid);
  console.log('Corten plates', pl.length);
  pl.forEach((f, i) => { const mx = (f.a.x + f.b.x) / 2, mz = (f.a.z + f.b.z) / 2, dx = f.b.x - f.a.x, dz = f.b.z - f.a.z, l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l; test('gate: Corten plate ' + i + ' blocks', [[mx + nx * 1.5, mz + nz * 1.5], [mx - nx * 1.5, mz - nz * 1.5]], false); });
  anyLane('gate: the passage between the plates is open', [[h(-14.2, -86), h(-14.2, -66)], [h(-12, -86), h(-12, -66)], [h(-16, -86), h(-16, -66)], [h(-9.5, -86), h(-9.5, -66)], [h(-18.5, -85), h(-18.5, -66)]]);
}
// ---- the Brusnitsyn quarter (frame M)
test('mansion: the west block blocks', [m(20, 3), m(20, -3)], false);
test('mansion: the avant-corps blocks', [m(52.6, 4), m(52.6, -3)], false);
test('mansion: the yard wall blocks', [m(66, 2), m(66, -3)], false);
test('mansion: the east end wall blocks', [m(82, -10), m(77, -10)], false);
anyLane('lane: along the street in front of the mansion is open (the street is asphalt)', [[m(-30, 7.5), m(70, 7.5)], [m(-30, 8.5), m(70, 8.5)]]);
anyLane('lane: under the skyway across the street is open', [[m(12.1, 1.5), m(12.1, 14)], [m(11, 1.5), m(11, 14)], [m(13.5, 1.5), m(13.5, 14)]]);
test('pink house: the street front blocks', [m(-70, 3), m(-70, -3)], false);
test('pink house: a portico column blocks', [m(-51.15, 4), m(-51.15, 0.5)], false);
test('factory: the street front blocks', [m(30, 12), m(30, 19)], false);
// ---- Skobsky and the almshouse
test('Skobsky: the Kozhevennaya front blocks', [k(80, 3), k(80, -3)], false);
test('Skobsky: the Kosaya front blocks', [k(-3, -50), k(3, -50)], false);
anyLane('Skobsky: round the corner along Kozhevennaya line is open', [[k(-8, 5), k(60, 5)], [k(-8, 6.5), k(60, 6.5)]]);
test('almshouse: the building blocks', [a(20, -10), a(20, -30)], false);
test('almshouse: the front fence blocks', [a(10, 18), a(10, 12)], false);
test('almshouse: an anchor blocks', [a(30.2, 11), a(30.2, 6)], false);
// ---- CHP-7
test('CHP-7: a chimney blocks', [[-5773 - 7, 729.8], [-5773 + 7, 729.8]], false);
test('CHP-7: the plant block blocks', [[-5894 + 1, 886], [-5894 - 6, 886]], false);
{   // the Baltic Shipyard crane legs block (review 2026-10-09: 4 colliders per portal; first crane = runway A_W, t 0.15, jib to +z)
  const R = F.RUNWAYS.A_W, dx = R[1][0] - R[0][0], dz = R[1][1] - R[0][1], t = 0.15, rot = Math.atan2(-dz, dx), cr = Math.cos(rot), sr = Math.sin(rot);
  const px = R[0][0] + dx * t, pz = R[0][1] + dz * t, w = (lx, lz) => [px + cr * lx + sr * lz, pz - sr * lx + cr * lz];
  test('baltic crane: a leg blocks', [w(3.2, 8), w(3.2, 4.0)], false);
}
// ---- photo spots: dry, off the asphalt, outside buildings and colliders
const S = ctx.services.landmarksSevkabel;
for (const s of S.photoSpots) {
  let dry = !L.inRiver(s.x, s.z), gh = null;
  if (WITH_ENV) { gh = ph.groundHeight(s.x, s.z, 1e9, false); for (let q = 0; q < 8; q++) { const g = ph.groundHeight(s.x + 2 * Math.cos(q * Math.PI / 4), s.z + 2 * Math.sin(q * Math.PI / 4), 1e9, false); if (!(g > -1)) dry = false; } if (!(gh > -1)) dry = false; }
  const inb = L.insideBuilding(s.x, s.z, 0.3), road = L.isOnRoad(s.x, s.z, 0);
  const p = { x: s.x, z: s.z }; ph.resolve(p, 0.35, 0, 1.7); const moved = Math.hypot(p.x - s.x, p.z - s.z);
  const ok = dry && !inb && moved < 0.1;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'photo spot ' + s.name + ' (' + s.x.toFixed(1) + ', ' + s.z.toFixed(1) + ' yaw ' + (+s.yaw).toFixed(1) + ') dry ' + dry + (gh != null ? ' ground ' + gh.toFixed(2) : '') + ' inBuilding ' + inb + ' onRoad ' + road + ' collider push ' + moved.toFixed(2));
  all &&= ok;
}
// User-reported floating attachment: test the underlying hall/yard façade,
// excluding the bracket itself so a floating box cannot satisfy the ray.
const structural = [];
ctx.staticRoot.traverse(o => { if (o.isMesh && (o.name === 'hall' || o.name === 'yard')) structural.push(o); });
for (const a of S.festoonAnchors || []) {
  const origin = new THREE.Vector3(a.x + a.nx * .6, a.y, a.z + a.nz * .6);
  const ray = new THREE.Raycaster(origin, new THREE.Vector3(-a.nx, 0, -a.nz), 0, 1.2);
  const ok = ray.intersectObjects(structural).length > 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'festoon anchor backed by actual façade ' + a.bld + ' at ' + a.x.toFixed(2) + ',' + a.z.toFixed(2)); all &&= ok;
}
const { DINING, diningEdge } = await import(pathToFileURL(path.join(root, 'src/world/landmarksSevkabel/public-life-plan.js')).href);
const { frameOf } = await import(pathToFileURL(path.join(root, 'src/world/landmarksSevkabel/kit.js')).href);
for (const d of DINING) {
  const edge = diningEdge(d), f = frameOf(edge);
  const at = depth => [f.x + f.xa[0] * d.u + edge.n[0] * depth, f.z + f.xa[1] * d.u + edge.n[1] * depth];
  const a = at(1.2), ray = new THREE.Raycaster(new THREE.Vector3(a[0], 2.5, a[1]), new THREE.Vector3(-edge.n[0], 0, -edge.n[1]), 2, 4.5);
  const hits = ray.intersectObject(ctx.staticRoot, true).filter(h => !h.object.material.transparent), ok = hits.length > 0;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'dining window has a visible enclosing back wall ' + d.id); all &&= ok;
  if (S.restaurants.find(r => r.id === d.id)?.terraceTables) test('terrace centre aisle ' + d.id, [at(d.depth + .5), at(1.2)], true, .14);
}
console.log('monuments', S.monuments.length, 'photo spots', S.photoSpots.length, 'crowd', S.crowd.length, 'fences', S.fences.length, 'benches', S.benches.length, 'lamps', S.lamps.length, 'tris', S.triangles, 'build ms', S.buildMs);
console.log('parts', JSON.stringify(S.parts));
console.log(all ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(all ? 0 : 1);
