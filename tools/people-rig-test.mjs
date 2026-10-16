// Headless test of the characters half of the people module (no GPU): builds crowds with a stubbed ctx, then
//   node tools/people-rig-test.mjs [--n 330] [--frames 600]
// 1. budget: triangles per person of a random crowd of n people (makeSpec) and the draw calls, build ms, ms per frame of crowd.render
// 2. fuzz: n people with continuous random states (walk / jog / stand / sit / ride / pram / dog, gestures ramped) for `frames` frames: no NaN in any instance matrix
// 3. head yaw second difference of every person (no flicks while the state changes continuously)
// 4. foot sliding: a straight walker at 0.8 / 1.3 / 1.6 m/s: the ankle that is on the floor must not move relative to the ground
// 5. feet on the surface: standing and seated people have the lowest ankle at floor + ankle height (+- 4 cm)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
  createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; }
  isPointInPath() { return false; } getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas {
  constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; }
  getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); }
  toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {}
}
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16);
globalThis.addEventListener = () => {}; globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : Number(args[i + 1]); };
const N = flag('n', 330), FRAMES = flag('frames', 600);
const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { createCrowd, makeSpec } = await import(pathToFileURL(path.join(root, 'src/world/people/chars.js')).href);
const { MODE, GESTURE, newState } = await import(pathToFileURL(path.join(root, 'src/world/people/contract.js')).href);
const mk = () => createContext({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), renderer: null, audio: null, quality: { name: 'high' }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
let failed = false; const fail = (m) => { failed = true; console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

// ---------------------------------------------------------------- 1 + 2: the crowd
{
  const ctx = mk(), R = ctx.rng('rig-test'), crowd = createCrowd(ctx), list = [];
  const t0 = Date.now();
  const roles = ['walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'walk', 'office', 'elder', 'student', 'kid', 'parent', 'rider', 'dogwalker', 'tourist'];   // a realistic mix: 15 % kids / prams / riders / dogs
  for (let i = 0; i < N; i++) {
    const role = roles[i % roles.length], spec = makeSpec(R, { role, age: role === 'kid' ? 'child' : undefined, vehicle: role === 'rider' ? (i % 3 === 0 ? 'bike' : 'escooter') : undefined });
    list.push({ i: crowd.add(spec), spec, st: newState(), r: R() * 100, sit: i % 9 === 0 });
  }
  crowd.finalize();
  const buildMs = Date.now() - t0;
  const perPerson = crowd.trisPerPerson;
  { const by = {}; for (const m of ctx.dynamicRoot.children) { const g = m.geometry, tr = (g.index ? g.index.count : g.attributes.position.count) / 3 * m.instanceMatrix.count, k = /^ppl-(t|h|ua|fa|th|sh|ft)|/.test(m.name) ? m.name.split('|')[0].slice(4) : 'items'; by[k] = (by[k] || 0) + tr; } console.log('per person by part:', Object.entries(by).map(([k, v]) => `${k} ${(v / crowd.count).toFixed(0)}`).join(', ')); }
  console.log(`crowd: ${crowd.count} people, ${Math.round(crowd.trianglesAll)} triangles if everybody were drawn (${perPerson.toFixed(0)} per person; far LOD ${crowd.persons.length ? '84' : ''} per person), ${crowd.drawCalls} draw calls, built in ${buildMs} ms`);
  if (perPerson > 620) fail(`triangles per person ${perPerson.toFixed(0)} > 620`); else ok(`triangles per person ${perPerson.toFixed(0)}`);
  if (crowd.drawCalls > 90) fail(`draw calls ${crowd.drawCalls} > 90`); else ok(`draw calls ${crowd.drawCalls}`);
  const heads = new Map(list.map((e) => [e.i, []])), gests = [GESTURE.PHONE, GESTURE.CALL, GESTURE.TALK, GESTURE.PHOTO, GESTURE.SMOKE, GESTURE.EAT, GESTURE.POINT, GESTURE.WAVE, GESTURE.SPLASH, GESTURE.WATCH, GESTURE.LOOKAROUND, GESTURE.SELFIE];
  const t1 = Date.now();
  for (let f = 0; f < FRAMES; f++) {
    const t = f / 30;
    for (const e of list) {
      const st = e.st, sp = e.spec;
      const speed = e.sit ? 0 : Math.max(0, 1.3 + 1.2 * Math.sin(t * 0.37 + e.r)) * (sp.vehicle ? 2.5 : 1);
      st.speed = speed; st.dist += speed / 30; st.x = e.i * 3 + Math.sin(t * 0.3 + e.r) * 4; st.z = Math.cos(t * 0.3 + e.r) * 4; st.y = 0.12; st.yaw = t * 0.3 + e.r; st.turn = 0.3;
      st.mode = e.sit ? MODE.SIT : sp.vehicle ? MODE.RIDE : MODE.WALK; st.seatH = 0.45;
      const gi = Math.floor((t * 0.2 + e.r) % gests.length), ph = (t * 0.2 + e.r) % 1;
      st.gesture = gests[gi % gests.length]; st.gk = Math.sin(Math.PI * ph) ** 2; st.look = Math.sin(t * 0.7 + e.r); st.lookK = 0.5 + 0.5 * Math.sin(t * 0.4 + e.r);
      const P = crowd.render(e.i, st, t); heads.get(e.i).push(P.hy);
    }
    crowd.endFrame();
  }
  const msFrame = (Date.now() - t1) / FRAMES;
  console.log(`render: ${msFrame.toFixed(2)} ms per frame for ${crowd.count} people (${(msFrame / crowd.count * 1000).toFixed(1)} us per person)`);
  let bad = 0; ctx.dynamicRoot.traverse((o) => { if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < o.count * 16; i++) if (!Number.isFinite(a[i])) { bad++; console.log('NaN in', o.name); break; } } });
  if (bad) fail(`${bad} instanced meshes with NaN matrices`); else ok('no NaN in any instance matrix');
  // head yaw second difference (rad per frame^2): the inputs vary smoothly, so any flick is a bug
  let worst = 0, who = -1;
  for (const [i, h] of heads) for (let k = 2; k < h.length; k++) { const d = Math.abs(h[k] - 2 * h[k - 1] + h[k - 2]); if (d > worst) { worst = d; who = i; } }
  if (worst > 0.06) fail(`head yaw second difference ${worst.toFixed(4)} rad at person ${who}`); else ok(`head yaw second difference max ${worst.toFixed(4)} rad`);
  // night switch must not throw
  ctx.shared.uNight.value = 1; crowd.setNight(1); crowd.setNight(0); ok('setNight');
}

// ---------------------------------------------------------------- 4 + 5: feet
function footTest(speed, opts) {
  const ctx = mk(), R = ctx.rng('feet'), crowd = createCrowd(ctx), spec = makeSpec(R, opts), i = crowd.add(spec); crowd.finalize();
  const p = crowd.persons[i], st = newState(), pos = [[], []]; st.y = 0; st.yaw = 0.6;
  const ft = [p.slots.ftL, p.slots.ftR];
  const dt = 1 / 60, T = 6; let dist = 0;
  for (let f = 0; f < T / dt; f++) {
    const t = f * dt; dist += speed * dt; st.speed = speed; st.dist = dist; st.x = Math.sin(0.6) * dist; st.z = Math.cos(0.6) * dist;
    crowd.render(i, st, t);
    for (let s = 0; s < 2; s++) { const a = ft[s].arr, o = ft[s].off; pos[s].push([a[o + 12], a[o + 13], a[o + 14], t]); }
  }
  // ankle height above the floor: stance = ankle within 1.5 cm of its minimum; sliding speed of the stance foot in the world
  let slide = 0, minY = 9, n = 0; const flat = 0.09 * crowd.persons[i].sc;
  for (let s = 0; s < 2; s++) for (const q of pos[s]) minY = Math.min(minY, q[1]);
  for (let s = 0; s < 2; s++) for (let k = 1; k < pos[s].length; k++) {
    const a = pos[s][k - 1], b = pos[s][k]; if (b[3] < 1.5) continue;
    if (Math.abs(b[1] - flat) < 0.006 && Math.abs(a[1] - flat) < 0.006) { slide = Math.max(slide, Math.hypot(b[0] - a[0], b[2] - a[2]) / dt); n++; }
  }
  return { slide, minY, n, tall: spec.h };
}
for (const sp of [0.8, 1.3, 1.6]) {
  for (const o of [{ arch: 'mid_m', fem: false }, { arch: 'guest', fem: true }, { role: 'kid', age: 'child' }]) {
    const r = footTest(sp, o);
    // the ankle joint stays within a few cm of the floor + the sole thickness only while on the ground; some sliding is allowed at heel strike / toe off (the ankle moves while the foot pitches)
    if (r.n < 20 || r.slide > 0.25 * sp) fail(`foot slides ${r.slide.toFixed(2)} m/s at ${sp} m/s over ${r.n} flat stance frames (${o.arch || o.role})`); else ok(`foot slide ${r.slide.toFixed(2)} m/s at body speed ${sp} (${o.arch || o.role}, ${r.n} flat stance frames)`);
  }
}
{
  // standing + seated: lowest ankle height
  const ctx = mk(), R = ctx.rng('floor'), crowd = createCrowd(ctx), a = crowd.add(makeSpec(R, { arch: 'mid_m' })), b = crowd.add(makeSpec(R, { arch: 'office_f' })); crowd.finalize();
  for (const [i, mode] of [[a, MODE.WALK], [b, MODE.SIT]]) {
    const st = newState(); st.mode = mode; st.seatH = 0.45; st.y = 0; st.x = 1; st.z = 2; crowd.render(i, st, 1);
    let lo = 9; for (const k of ['ftL', 'ftR']) { const s = crowd.persons[i].slots[k]; lo = Math.min(lo, s.arr[s.off + 13]); }
    const sc = crowd.persons[i].sc, want = 0.09 * sc;
    if (Math.abs(lo - want) > 0.04) fail(`${mode === MODE.SIT ? 'seated' : 'standing'} person: lowest ankle ${(lo * 100).toFixed(1)} cm, expected ${(want * 100).toFixed(1)} cm`); else ok(`${mode === MODE.SIT ? 'seated' : 'standing'} person: lowest ankle ${(lo * 100).toFixed(1)} cm (expected ${(want * 100).toFixed(1)})`);
  }
}

// ---------------------------------------------------------------- 6: items (suitcase, umbrella, guitar, easel, broom, bouquet, camera), far LOD, slot reuse
{
  const ctx = mk(), R = ctx.rng('items'), crowd = createCrowd(ctx), list = [];
  const roles = [['traveler', { suitcase: true }], ['guide', { guideCol: '#d33a2a' }], ['busker', {}], ['painter', {}], ['cleaner', {}], ['bride', {}], ['tourist', {}], ['police', {}], ['statue', {}], ['follower', { cap: '#d94a3a' }]];
  for (let k = 0; k < 120; k++) { const [role, o] = roles[k % roles.length], spec = makeSpec(R, { role, ...o }); list.push({ i: crowd.add(spec), spec, st: newState() }); }
  crowd.finalize();
  const kinds = new Set(); for (const e of list) for (const k of Object.keys(crowd.persons[e.i].it)) kinds.add(k);
  for (const need of ['suitcase', 'umbrella', 'guitar', 'easel', 'broom', 'bouquet']) if (!kinds.has(need)) fail('no person owns a ' + need); else ok('item ' + need + ' is owned');
  const frame = (t, far) => { for (const e of list) { const st = e.st; st.x = e.i * 2; st.z = Math.sin(e.i); st.y = 0.12; st.yaw = e.i * 0.3; st.speed = 1.2; st.dist = t * 1.2; st.mode = MODE.WALK; st.gesture = e.spec.guide ? GESTURE.GUIDE : GESTURE.NONE; st.gk = 1; st.look = 0; st.lookK = 0; if (far && e.i % 2) crowd.renderFar(e.i, st); else crowd.render(e.i, st, t); } crowd.endFrame(); };
  for (let f = 0; f < 90; f++) frame(f / 30, f > 30);                                    // half the people switch to the far LOD after 1 s
  let bad = 0; ctx.dynamicRoot.traverse((o) => { if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < o.count * 16; i++) if (!Number.isFinite(a[i])) { bad++; break; } } });
  if (bad) fail(bad + ' meshes with NaN after items / far LOD'); else ok('items + far LOD: no NaN');
  const far = ctx.dynamicRoot.children.find((m) => m.name === 'ppl-far'); if (!far || far.count !== 60) fail('far mesh count ' + (far && far.count) + ' (expected 60)'); else ok('far LOD mesh draws 60 block figures');
  const shown1 = crowd.shownCount; for (const e of list) if (e.i % 3 === 0) crowd.hide(e.i); crowd.endFrame();
  const shown2 = crowd.shownCount; if (shown2 !== shown1 - 40) fail('hide() bookkeeping ' + shown1 + ' -> ' + shown2); else ok('hide() frees ' + (shown1 - shown2) + ' persons');
  for (let f = 0; f < 5; f++) frame(4 + f / 30, false);
  const torsoes = ctx.dynamicRoot.children.filter((m) => m.name.startsWith('ppl-t|')); let drawn = 0; for (const m of torsoes) drawn += m.count;
  if (drawn > 120) fail('torso instances drawn ' + drawn + ' > 120'); else ok('slots are reused: ' + drawn + ' torso instances for 120 people');
}
console.log(failed ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(failed ? 1 : 0);
