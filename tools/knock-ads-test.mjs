// Headless test of the KNOCKABLE advertising pillars (22) and city-light boxes (34) of props/ads.js. No GPU.  node tools/knock-ads-test.mjs
// Builds the real environment + streets + city + props modules (twice: with ctx.knock and without) and checks:
//   1 census: 22 pillar records (kind column) and 34 city-light records (kind citylight), each owning its collider and carrying its poster parts (pillar: the wrap; city-light: both lit faces)
//   2 the posters are detached dynamic-root meshes of the record, built about their own origin
//   3 __knock.hit: a pillar topples WITH its wrap, a city-light box with BOTH posters (rigid bodies)
//   4 the real car: a pillar holds 30 km/h (anchored 45) and breaks at 60 km/h; a city-light box holds a 12 km/h bump and breaks at 35 km/h (anchored 20)
//   6 without ctx.knock: the merged build as before (wraps in the static root at world coordinates, posters in pr-panels, nothing registered), same collider count
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
const stubEl = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, children: [], textContent: '', innerHTML: '', addEventListener() {}, removeEventListener() {}, appendChild() {}, setAttribute() {}, getContext: () => null });
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : stubEl()), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, head: { appendChild() {} }, addEventListener() {} };
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

let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('PASS', name); };
const hyp = (a, b) => Math.sqrt(a * a + b * b);
const MODULES = ['environment', 'streets', 'city', 'props'];

/** a fresh context with the real modules built into it; knock = false builds the merged (pre-knock) structure */
async function build(knock) {
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
  const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 2048, shadowSize: 70, petals: 0.6 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
  ctx.buildList = MODULES;
  ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
  ctx.drive = { active: false, car: null, fx: { sparks() {} } };
  if (knock) ctx.knock = createKnock(ctx);
  for (const m of MODULES) await (await import(url(`src/world/${m}.js`))).build(ctx);
  return ctx;
}
let T = 0;
const run = (ctx, seconds, dt = 0.05) => { for (let s = 0; s < seconds - 1e-9; s += dt) { T += dt; ctx.time = T; for (const f of ctx._updates) f(dt, T); } };
const meshes = (ctx, name) => { const out = []; ctx.scene.traverse((o) => { if (o.name === name) out.push(o); }); return out; };

const t0 = Date.now();
const K = await build(true);
console.log(`built ${MODULES.join(' + ')} with ctx.knock in ${Date.now() - t0} ms`);
const adsColliders = (w) => w.physics.items.filter((i) => (i.type === 'cyl' && i.r === 0.68 && i.y1 - i.y0 > 3) || (i.type === 'box' && Math.abs(i.hw - 0.65) < 1e-6 && Math.abs(i.hd - 0.225) < 1e-6 && i.y1 - i.y0 > 2.4)).length;
const K0 = adsColliders(K);
const recs = (kind) => K.knock.list.filter((r) => r.kind === kind);
const objOf = (r) => r.parts.filter((p) => p.obj);
const wpos = (p) => { p.obj.updateMatrixWorld(true); return new THREE.Vector3().setFromMatrixPosition(p.obj.matrixWorld); };

check('1 census: 22 pillars (column) and 34 city-light boxes (citylight), each owns its collider and carries its poster parts', () => {
  const by = K.knock.stats.byKind;
  assert.equal(by.column, 22, `columns ${by.column}`);
  const cl = recs('citylight'); assert.equal(cl.length, 34, `city lights ${cl.length}`);
  for (const r of recs('column')) { assert(r.items.length === 1 && r.items[0].source && r.items[0].source.knock === r, `pillar at ${r.x.toFixed(1)}, ${r.z.toFixed(1)} owns its collider`); assert.equal(objOf(r).length, 1, 'one wrap part'); assert.equal(objOf(r)[0].obj.name, 'pr-wrap'); assert.equal(r.anchored, 45); }
  for (const r of cl) { assert(r.items.length === 1 && r.items[0].source && r.items[0].source.knock === r, `city light at ${r.x.toFixed(1)}, ${r.z.toFixed(1)} owns its collider`); assert.equal(objOf(r).length, 2, 'two poster parts'); assert.equal(r.anchored, 20); }
  console.log('     byKind', JSON.stringify(by));
});

check('2 the posters are detached dynamic-root meshes, built about their own origin, standing where the merged geometry stood', () => {
  const dyn = K.dynamicRoot;
  for (const r of K.knock.list) for (const p of objOf(r)) { let a = p.obj; while (a && a !== dyn) a = a.parent; assert(a === dyn, `${p.obj.name} lives in the dynamic root`); assert(p.obj.userData.knock, 'marked as a knock part'); }
  assert.equal(meshes(K, 'pr-wrap').length, 22, 'one wrap mesh per pillar');
  for (const m of meshes(K, 'pr-wrap')) { m.geometry.computeBoundingSphere(); assert(m.geometry.boundingSphere.center.length() < 0.05, 'the wrap is built about its own origin'); }
  for (const r of recs('column')) { const v = wpos(objOf(r)[0]); assert(hyp(v.x - r.x, v.z - r.z) < 0.01 && Math.abs(v.y - r.y - 1.44) < 0.01, 'the wrap is 1.44 m above the foot, centred on the pillar'); }
  for (const r of recs('citylight')) { const [a, b] = objOf(r).map(wpos); const d = hyp(a.x - b.x, a.z - b.z); assert(Math.abs(a.y - r.y - 1.52) < 0.01 && d > 0.15 && d < 0.17, `two faces 16 cm apart, 1.52 m up (${d.toFixed(3)})`); }
});

check('3 __knock.hit: a pillar topples WITH its poster wrap, a city-light box with BOTH posters (rigid bodies)', () => {
  for (const [kind, kmh] of [['column', 60], ['citylight', 40]]) {
    const r = recs(kind).find((q) => q.state === 'stand'), ps = objOf(r), w0 = ps.map(wpos), d0 = w0.map((v) => v.distanceTo(w0[0]));
    const m0 = ps.map((p) => p.obj.matrix.clone());
    K.knock.hit(r.x, r.z, kmh, 1, 0, kind);
    assert.equal(r.state, 'fly', `${kind} flies`); assert(r.items.length === 0, 'its collider left');
    run(K, 8);
    assert.equal(r.state, 'rest', `${kind} lies`);
    ps.forEach((p, i) => assert(!p.obj.matrix.equals(m0[i]), `${kind}: poster ${i} moved with the body`));
    const w1 = ps.map(wpos);
    if (ps.length > 1) assert(Math.abs(w1[1].distanceTo(w1[0]) - d0[1]) < 0.02, 'the two posters stay together');
    assert(w1.every((v) => v.y < 2.2), `${kind}: the posters lie low (${w1.map((v) => v.y.toFixed(2))})`);
    assert(w1[0].distanceTo(w0[0]) > 0.5, `${kind}: the poster left its place`);
    console.log(`     ${kind}: poster y ${w0[0].y.toFixed(2)} -> ${w1[0].y.toFixed(2)}, moved ${w1[0].distanceTo(w0[0]).toFixed(1)} m`);
  }
});

// ---------------------------------------------------------------- the real car
function clearAround(w, r, len) {                                   // the other colliders around the record go (the test world is ours)
  for (const it of w.physics.items.slice()) { if (it === r.items[0]) continue; const cx = it.cx ?? it.x, cz = it.cz ?? it.z; if (cx === undefined) continue; if (hyp(cx - r.x, cz - r.z) < len + 8) w.physics.remove(it); }
}
function corridor(r, len = 16) {
  for (let a = 0; a < 16; a++) {
    const th = a / 16 * Math.PI * 2, dx = Math.cos(th), dz = Math.sin(th); let ok = true;
    for (let s = 0; s <= len + 1; s += 1) { const x = r.x - dx * s, z = r.z - dz * s; if (L.insideBuilding(x, z, 1.0) || !L.inPlay(x, z) || L.heightAt(x, z) < -0.5) { ok = false; break; } }
    if (ok) return { dx, dz };
  }
  return null;
}
function ram(w, r, kmh, len = 12) {
  const c = corridor(r, len + 2); if (!c) return null;
  clearAround(w, r, len + 2);
  const car = createHandling(w, tuningFor('coupe', { ...SPEC, mass: MASS.coupe }));
  const yaw = Math.atan2(c.dx, c.dz);
  car.reset(r.x - c.dx * len, r.z - c.dz * len, yaw); car.vx = Math.sin(yaw) * kmh / 3.6; car.vz = Math.cos(yaw) * kmh / 3.6;
  w.drive.active = true; w.drive.car = car;
  let hit = false;
  for (let t = 0; t < 12; t += 1 / 60) {
    if ((car.x - r.x) * c.dx + (car.z - r.z) * c.dz < -2.5) { car.vx = Math.sin(yaw) * kmh / 3.6; car.vz = Math.cos(yaw) * kmh / 3.6; }      // a steady approach: the contact speed is the one asked for
    car.step(1 / 60, { thr: 0, brk: 0, steer: 0, hand: false, nitro: false });
    for (const e of car.events) if (e.type === 'hit') hit = true;
    if (r.wobble || r.state !== 'stand') hit = true;                                                       // a bump below the break speed wobbles the thing (knock.js onCarHit)
    for (const f of w._updates) f(1 / 60, T += 1 / 60);
  }
  w.drive.active = false;
  return { hit, car, along: (car.x - r.x) * c.dx + (car.z - r.z) * c.dz };
}
const free = (kind) => K.knock.list.filter((r) => r.kind === kind && r.state === 'stand' && r.items[0] && K.physics.items.includes(r.items[0]));
function drill(kind, kmh) { for (const r of free(kind)) { if (!corridor(r)) continue; const res = ram(K, r, kmh); if (res) return { r, res }; } return null; }

check('4 the real car: a pillar holds 30 km/h (the car stops) and breaks at 60 km/h taking its wrap along', () => {
  const hold = drill('column', 30); assert(hold, 'a pillar with a free approach'); const r = hold.r;
  assert.equal(r.state, 'stand', 'the pillar holds at 30 km/h'); assert(hold.res.hit, 'the car felt it'); assert(hold.res.along < 0.5, `the car stopped at the pillar (along ${hold.res.along.toFixed(2)})`);
  const y0 = wpos(objOf(r)[0]).y, brk = ram(K, r, 60); assert(brk);
  assert(r.state === 'fly' || r.state === 'rest', `the pillar breaks at 60 km/h (state ${r.state})`);
  run(K, 8); assert(wpos(objOf(r)[0]).y < y0 - 0.5, 'the wrap came down with it');
});
check('5 the real car: a city-light box holds a 12 km/h bump and breaks at 35 km/h with both posters', () => {
  const hold = drill('citylight', 12); assert(hold, 'a city-light box with a free approach'); const r = hold.r;
  assert.equal(r.state, 'stand', 'holds at 12 km/h'); assert(hold.res.hit, 'the car felt it');
  const y0 = objOf(r).map((p) => wpos(p).y), brk = ram(K, r, 35); assert(brk);
  assert(r.state === 'fly' || r.state === 'rest', `breaks at 35 km/h (state ${r.state})`);
  run(K, 8); assert(objOf(r).every((p, i) => wpos(p).y < y0[i] - 0.4), 'both posters came down');
});

// ---------------------------------------------------------------- the merged build (no ctx.knock)
const N = await build(false);
check('6 no ctx.knock: wraps merged into the static root at world coordinates, posters in pr-panels, nothing registered, no standalone posters, same ads collider count', () => {
  assert.equal(N.knock, undefined);
  const wraps = meshes(N, 'pr-wrap'); assert.equal(wraps.length, 22, 'one wrap per pillar');
  for (const m of wraps) { m.geometry.computeBoundingSphere(); assert(hyp(m.geometry.boundingSphere.center.x, m.geometry.boundingSphere.center.z) > 10, 'world coordinates'); let a = m; while (a && a !== N.dynamicRoot) a = a.parent; assert(a !== N.dynamicRoot, 'not in the dynamic root'); }
  assert.equal(meshes(N, 'pr-panel-obj').length, 0, 'no standalone panel meshes');
  assert(meshes(N, 'pr-panels').length > 0, 'merged panels exist');
  assert.equal(adsColliders(N), K0, `same ads collider count (${adsColliders(N)} vs ${K0})`);
});

console.log(`ALL ${checks} CHECKS PASSED`);
