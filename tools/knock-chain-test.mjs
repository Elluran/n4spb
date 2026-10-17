// Headless test of the KNOCKABLE CHAIN SPANS between the Nevsky bollards (streets/barriers.js, package F2). No GPU.  node tools/knock-chain-test.mjs
// Builds the real streets module with the real core/knock.js (and once without it) and checks:
//   1 census: one record and ONE thin `fence` collider per chain span (about 1216-1260 spans, not the merged boxes of before), no span box longer than a span, the people-nav view (fence, y1 0.8) intact
//   2 post <-> span mapping: knocking a bollard post drops exactly the spans that hang on it (geometric neighbours), no span two posts away moves
//   3 a knocked span lies down: its links instance moves, the collider is replaced by a low rest box (top <= 0.42), its posts stand
//   4 the real car: a span between two posts is knocked at 8 and at 25 km/h and costs the car almost nothing; a post still breaks at 40 km/h and takes its spans with it
//   5 without ctx.knock: the old structure (ONE static pt-chain-links mesh, nothing registered), the same per-span colliders
import assert from 'node:assert/strict';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = (p) => pathToFileURL(path.join(root, p)).href;

// ---------------------------------------------------------------- DOM stubs (as tools/check.mjs)
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; } createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } isPointInPath() { return false; } getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas { constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; } getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); } toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {} }
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const THREE = await import('three');
const { createContext } = await import(url('src/core/ctx.js'));
const { createKnock } = await import(url('src/core/knock.js'));
const { createHandling } = await import(url('src/world/drive/handling.js'));
const { SPEC } = await import(url('src/world/drive/model.js'));
const { MASS, tuningFor } = await import(url('src/world/drive/cars/tuning.js'));
const L = await import(url('src/world/layout.js'));
const streets = await import(url('src/world/streets.js'));

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS', name); };
const hyp = (a, b) => Math.sqrt(a * a + b * b);

/** a fresh context with the real streets module built into it; knock = false builds the pre-knock structure */
async function build(knock) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
  const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 70, petals: 0.6 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
  ctx.buildList = ['streets'];
  ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
  ctx.drive = { active: false, car: null, fx: { sparks() {} } };
  if (knock) ctx.knock = createKnock(ctx);
  await streets.build(ctx);
  const meshes = []; ctx.staticRoot.traverse((o) => { if (o.isInstancedMesh) meshes.push(o); }); ctx.scene.traverse((o) => { if (o.isInstancedMesh && !meshes.includes(o)) meshes.push(o); });
  return { ctx, meshes, stats: ctx.services.streetsStats };
}
let T = 0;
const run = (w, seconds, dt = 0.05) => { for (let s = 0; s < seconds - 1e-9; s += dt) { T += dt; w.ctx.time = T; for (const f of w.ctx._updates) f(dt, T); } };
const matOf = (p) => Array.from(p.mesh.instanceMatrix.array.slice(p.index * 16, p.index * 16 + 16));
/** the two ends of a span record's collider along its long axis */
const ends = (it) => { const l = Math.max(it.hw, it.hd), ux = it.hw >= it.hd ? it.c : it.s, uz = it.hw >= it.hd ? -it.s : it.c; return { ax: it.cx - ux * l, az: it.cz - uz * l, bx: it.cx + ux * l, bz: it.cz + uz * l, len: 2 * l, ux, uz }; };

const t0 = Date.now();
const K = await build(true);
console.log(`built streets with ctx.knock in ${Date.now() - t0} ms`);
const recs = (kind) => K.ctx.knock.list.filter((r) => r.kind === kind);
const spans = recs('chain'), posts = recs('bollard').filter((r) => r.h === 0.85);
// the geometry of a span as drawn: from the links instance (origin = span start, local +Z along the span, scale z = length)
const geom = (s) => { const m = matOf(s.parts[0]), len = hyp(m[8], m[10]); return { ax: m[12], az: m[14], bx: m[12] + m[8], bz: m[14] + m[10], len }; };
const G = new Map(spans.map((s) => [s, geom(s)]));                                        // (read once, before any knock moves an instance)
const hangs = (s, p) => { const g = G.get(s); return hyp(g.ax - p.x, g.az - p.z) < 0.9 || hyp(g.bx - p.x, g.bz - p.z) < 0.9; };       // (an end snapped to a lamp pedestal is up to 0.85 m off its bollard)
// a post owns the spans whose ORIGINAL end (the bollard position) is within 2 cm; a snapped end is not looked at: use the start/end that matches exactly or nearly
const owns = (s, p) => { const g = G.get(s); return hyp(g.ax - p.x, g.az - p.z) < 0.02 || hyp(g.bx - p.x, g.bz - p.z) < 0.02; };

check('1 census: a record and a thin collider per chain span, no merged boxes', () => {
  assert(spans.length >= 1150 && spans.length <= 1300, `chain spans ${spans.length}`);
  assert.equal(K.stats.barriers.chains, spans.length, 'one record per drawn span');
  const withBox = spans.filter((r) => r.items.length === 1);
  assert(withBox.length >= spans.length * 0.97, `${withBox.length} of ${spans.length} spans own a collider`);
  assert.equal(K.stats.barriers.chainBoxes, withBox.length, 'chainBoxes stat = spans with a collider');
  let maxLen = 0;
  for (const r of withBox) {
    const it = r.items[0];
    assert(it.fence === true && it.type === 'box' && it.y1 === 0.8 && it.source && it.source.knock === r, 'a fence box of 0.8 m that is the source of its record');
    assert(Math.abs(Math.min(it.hw, it.hd) - 0.06) < 1e-6, 'a box 0.12 m thick');
    maxLen = Math.max(maxLen, ends(it).len);
    assert(r.mass === 6 && r.anchored === 0.5 && r.parts.length === 1 && r.parts[0].mesh.name.startsWith('pt-chain-links|'), 'a light toppling body (anchored 0.5 km/h) with its link instance in a cell mesh');
  }
  assert(maxLen < 3.6, `no merged box: the longest span box is ${maxLen.toFixed(2)} m`);
  const fenceLow = K.ctx.physics.items.filter((it) => it.fence && it.type === 'box' && it.y1 < 1);
  assert.equal(fenceLow.length, withBox.length, 'the people-nav view (fence boxes below 1 m) = the span boxes');
  console.log(`     ${spans.length} spans (${spans.length - withBox.length} without a collider), longest box ${maxLen.toFixed(2)} m, ${posts.length} posts, ${K.meshes.filter((m) => m.name.startsWith('pt-chain-links|')).length} link cell meshes`);
});

// the strand of a span as it is drawn now: its lowest and highest point above the foot (hanging: 0.44 .. 0.66; a toppled span lies on the pavement: ~0.02, never in the air nor in the ground)
const SPAN_PTS = Array.from({ length: 9 }, (_, i) => { const u = i / 8; return new THREE.Vector3(0, 0.66 - 0.22 * 4 * u * (1 - u), u); });
const strandY = (s) => { const m = new THREE.Matrix4().fromArray(matOf(s.parts[0])); let lo = 1e9, hi = -1e9; for (const p of SPAN_PTS) { const y = p.clone().applyMatrix4(m).y - s.y; lo = Math.min(lo, y); hi = Math.max(hi, y); } return { lo, hi }; };
const lies = (s) => { const { lo, hi } = strandY(s); return lo > -0.03 && hi < 0.12; };
const hang = new Map(posts.map((p) => [p, spans.filter((s) => owns(s, p))]));
const two = posts.find((p) => hang.get(p).length === 2), one = posts.find((p) => hang.get(p).length === 1 && p !== two);

check('2 knocking a post drops exactly the spans that hang on it', () => {
  assert(two && one, 'a post with two spans and a post with one');
  let total = 0; for (const p of posts) total += hang.get(p).length;
  assert(total >= spans.length * 1.5, `most spans hang on two posts (${total} post-span pairs for ${spans.length} spans)`);
  for (const p of [two, one]) {
    const mine = hang.get(p), others = spans.filter((s) => !mine.includes(s) && s.state === 'stand' && hyp(s.x - p.x, s.z - p.z) < 12 && !hangs(s, p));
    assert(others.length > 0);
    K.ctx.knock.hit(p.x, p.z, 40, 1, 0, 'bollard'); assert(p.state !== 'stand', 'the post breaks at 40 km/h');
    for (const s of mine) assert(s.state === 'fly' || s.state === 'rest', `a span of the post dropped (${s.state})`);
    for (const s of others) assert.equal(s.state, 'stand', 'a span two posts away stands');
    run(K, 8);
    for (const s of mine) { assert.equal(s.state, 'rest', 'and lies down'); const y = strandY(s); assert(lies(s), `flat on the pavement (strand ${y.lo.toFixed(2)} .. ${y.hi.toFixed(2)} above the foot)`); }
  }
});

check('3 a knocked span: instance moved, collider swapped for a low rest box, its posts stand', () => {
  const s = spans.find((r) => r.state === 'stand' && r.items.length === 1 && posts.some((p) => owns(r, p))), p0 = matOf(s.parts[0]), box = s.items[0];
  assert(K.ctx.physics.items.includes(box));
  K.ctx.knock.hit(s.x, s.z, 8, Math.sin(s.rotY), Math.cos(s.rotY), 'chain');             // (across the span, like a car meeting it) assert.notEqual(s.state, 'stand', 'a touch knocks a chain span (minDv 0)');
  assert(!K.ctx.physics.items.includes(box), 'the span collider is gone at once');
  run(K, 8);
  assert.equal(s.state, 'rest'); assert(lies(s), `lies flat (strand ${strandY(s).lo.toFixed(2)} .. ${strandY(s).hi.toFixed(2)})`);
  const p1 = matOf(s.parts[0]); assert(p1.some((v, i) => Math.abs(v - p0[i]) > 0.05), 'the links instance moved');
  assert(s.items.length === 1 && s.items[0] !== box && s.items[0].y1 - s.y <= 0.42 + 1e-6 && !s.items[0].source, `a rest box (top ${(s.items[0].y1 - s.y).toFixed(2)} above the foot)`);
  assert(hyp(s.items[0].cx - s.x, s.items[0].cz - s.z) < 5, 'the span lies within 5 m of where it hung');
  for (const p of posts.filter((q) => owns(s, q))) assert.equal(p.state, 'stand', 'its posts stand');
});

// ---------------------------------------------------------------- the real car
function ram(w, r, kmh, dir, len = 12) {
  const ph = w.ctx.physics, keep = new Set(r.items);
  for (const it of ph.items.slice()) { if (keep.has(it)) continue; const cx = it.cx ?? it.x, cz = it.cz ?? it.z; if (cx === undefined) continue; if (hyp(cx - r.x, cz - r.z) < len + 8) ph.remove(it); }
  const car = createHandling(w.ctx, tuningFor('coupe', { ...SPEC, mass: MASS.coupe }));
  const yaw = Math.atan2(dir.dx, dir.dz);
  car.reset(r.x - dir.dx * len, r.z - dir.dz * len, yaw); car.vx = Math.sin(yaw) * kmh / 3.6; car.vz = Math.cos(yaw) * kmh / 3.6;
  w.ctx.drive.active = true; w.ctx.drive.car = car;
  let hit = false, after = null;
  for (let t = 0; t < 10; t += 1 / 60) {
    if ((car.x - r.x) * dir.dx + (car.z - r.z) * dir.dz < -2.5) { car.vx = Math.sin(yaw) * kmh / 3.6; car.vz = Math.cos(yaw) * kmh / 3.6; }
    car.step(1 / 60, { thr: 0, brk: 0, steer: 0, hand: false, nitro: false });
    for (const e of car.events) if (e.type === 'hit' || e.type === 'scrape') hit = true;
    if (r.state !== 'stand') { hit = true; if (after === null) after = hyp(car.vx, car.vz) * 3.6; }                    // the speed the car keeps in the frame of the knock
    for (const f of w.ctx._updates) f(1 / 60, T += 1 / 60);
  }
  w.ctx.drive.active = false;
  return { hit, car, after, along: (car.x - r.x) * dir.dx + (car.z - r.z) * dir.dz };
}
/** the driving direction across a span (its normal) toward `r`, free of buildings and water for len m, or null */
function across(r, s, len = 14) {
  const g = G.get(s), l = g.len || 1, ux = (g.bx - g.ax) / l, uz = (g.bz - g.az) / l;
  for (const sg of [1, -1]) {
    const dx = -uz * sg, dz = ux * sg; let ok = true;
    for (let k = 0; k <= len + 1; k += 1) { const x = r.x - dx * k, z = r.z - dz * k; if (L.insideBuilding(x, z, 1.0) || !L.inPlay(x, z) || L.heightAt(x, z) < -0.5) { ok = false; break; } }
    if (ok) return { dx, dz };
  }
  return null;
}

for (const kmh of [8, 25]) check(`4 the real car at ${kmh} km/h: a chain span between two posts is knocked and costs the car almost nothing`, () => {
  let t = null;
  for (const s of spans) { if (s.state !== 'stand' || s.items.length !== 1 || !K.ctx.physics.items.includes(s.items[0])) continue; const d = across(s, s); if (d) { t = { s, d }; break; } }
  assert(t, 'a span with a free approach');
  const res = ram(K, t.s, kmh, t.d);
  assert.notEqual(t.s.state, 'stand', 'the span is knocked'); assert(res.hit, 'the car felt it');
  assert(res.after > kmh * 0.8, `the car kept ${res.after.toFixed(1)} km/h of ${kmh}`);
  const sy = strandY(t.s); assert.equal(t.s.state, 'rest'); assert(sy.lo > -0.5 && sy.hi < 0.6, `the span the car knocked lies down (strand ${sy.lo.toFixed(2)} .. ${sy.hi.toFixed(2)} above the foot)`);
  console.log(`     ${kmh} km/h: ${res.after.toFixed(1)} km/h left in the frame of the knock, strand ${sy.lo.toFixed(2)} .. ${sy.hi.toFixed(2)}`);
});

check('4b the real car at 40 km/h on a post: the post breaks and its spans fall with it', () => {
  let found = null;
  for (const p of posts) {
    if (p.state !== 'stand' || !K.ctx.physics.items.includes(p.items[0])) continue;
    const mine = hang.get(p).filter((s) => s.state === 'stand'); if (!mine.length) continue;
    const d = across(p, mine[0]); if (d) { found = { p, d, mine }; break; }
  }
  assert(found, 'a standing post with standing spans and a free approach');
  const res = ram(K, found.p, 40, found.d);
  assert.notEqual(found.p.state, 'stand', 'the post breaks at 40 km/h');
  for (const s of found.mine) assert.notEqual(s.state, 'stand', 'its span fell with it');
  console.log(`     post at ${found.p.x.toFixed(1)}, ${found.p.z.toFixed(1)}: ${found.mine.length} span(s) fell, the car left at ${res.after.toFixed(1)} km/h`);
});

// ---------------------------------------------------------------- the pre-knock structure
const N = await build(false);
check('5 no ctx.knock: ONE static link mesh, no records, the same per-span colliders', () => {
  const links = N.meshes.filter((m) => m.name.startsWith('pt-chain-links'));
  assert.equal(links.length, 1, 'one mesh'); assert.equal(links[0].name, 'pt-chain-links'); assert.equal(links[0].count, N.stats.barriers.chains);
  assert.equal(links[0].instanceMatrix.usage, THREE.StaticDrawUsage, 'static');
  assert.equal(N.stats.barriers.chains, K.stats.barriers.chains); assert.equal(N.stats.barriers.chainBoxes, K.stats.barriers.chainBoxes);
  assert(!N.ctx.knock);
  const low = N.ctx.physics.items.filter((it) => it.fence && it.type === 'box' && it.y1 < 1);
  assert.equal(low.length, N.stats.barriers.chainBoxes); assert(low.every((it) => !it.source), 'no source without ctx.knock');
});

console.log(`RESULT: OK (${checks} checks, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(0);
