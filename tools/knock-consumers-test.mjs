// Headless test of the two consumers of core/knock.js (no GPU): a knocked bench stands its sitter up and takes its seats out of play (people), a knocked lamp
// kills its crow perch and sends the crow off (wildlife). Builds the whole chain up to people + wildlife in node (the stubbed DOM of tools/people-test.mjs) with a
// minimal ctx.knock bus (listen / fire: the contract of core/knock.js, section 3 of the knock plan), then fires knock events at a real bench and a real lamp perch.
//   * bench: an agent put on a seat with sim.sitAt sits; another one walks to the second seat; after the knock both are up, nobody has a goal on the bench, every seat is
//     unavailable (taken >= 1e8) and stays so for 20 s of simulation, and a second knock of the same bench does nothing;
//   * lamp: a crow put on a lamp perch flies off, the perch is dead (no perchesNear, no new occupant); a crow flying to a lamp that is knocked lands elsewhere;
//   * a bench / lamp that is not within 0.6 m of a seat / perch changes nothing; without ctx.knock the modules build as before (people-test / wildlife-test cover that).
// usage: node tools/knock-consumers-test.mjs [--verbose]
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verbose = process.argv.includes('--verbose');
class Ctx2D {
  constructor(c) { this.canvas = c; this.font = '10px sans-serif'; }
  measureText(t) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); const s = m ? Number(m[1]) : 10; return { width: [...String(t)].length * s * 0.92, actualBoundingBoxAscent: s * 0.8, actualBoundingBoxDescent: s * 0.2 }; }
  createLinearGradient() { return { addColorStop() {} }; } createRadialGradient() { return { addColorStop() {} }; } createConicGradient() { return { addColorStop() {} }; } createPattern() { return {}; }
  getImageData(x, y, w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  createImageData(w, h) { return { data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }; }
  putImageData() {} getTransform() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; } isPointInPath() { return false; } getLineDash() { return []; }
}
const ctxProxy = (c) => new Proxy(new Ctx2D(c), { get(t, k) { if (k in t) return t[k]; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
class FakeCanvas { constructor() { this.width = 300; this.height = 150; this.style = {}; this._ctx = null; } getContext(type) { if (type !== '2d') return null; return this._ctx || (this._ctx = ctxProxy(this)); } toDataURL() { return 'data:,'; } addEventListener() {} removeEventListener() {} }
globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500); camera.position.set(L.HERO.x, 1.6, L.HERO.z); camera.updateMatrixWorld(true);
const sunDir = new THREE.Vector3(...L.SUN_DIR).normalize();
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'medium', level: 'medium', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir });
ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
// the knock bus: ctx.knock.listen(fn(record, body)) as in core/knock.js; fire() stands for the knock of a record
const listeners = [];
const bus = { listen: (fn) => { listeners.push(fn); }, fire: (rec) => { for (const f of listeners) f(rec, { dx: 1, dz: 0 }); } };      // (set before people only: the street / prop modules would register records with a real ctx.knock)
ctx.buildList = ['environment', 'streets', 'city', 'rail', 'landmarksA', 'landmarksB', 'landmarksC', 'landmarksD', 'landmarksE', 'landmarksF', 'landmarksG', 'landmarksH', 'landmarksI', 'landmarksJ', 'landmarksK', 'landmarksBelinsky', 'landmarksCastle', 'landmarksOktyabrsky',
  'bridges', 'metro', 'props', 'people', 'wildlife'];
for (const m of ctx.buildList) {
  if (m === 'people') ctx.knock = bus;
  const mod = await import(pathToFileURL(path.join(root, `src/world/${m}.js`)).href);
  try { await mod.build(ctx); } catch (e) { console.log(`module ${m} failed to build: ${e && e.stack}`); if (m === 'people' || m === 'wildlife' || m === 'environment' || m === 'streets') process.exit(1); }
}
const fails = [];
const check = (cond, msg) => { if (!cond) { fails.push(msg); console.log('FAIL:', msg); } else if (verbose) console.log('ok:', msg); };
check(listeners.length >= 2, 'people and wildlife subscribed to ctx.knock (' + listeners.length + ' listeners)');

const upd = ctx._updates.slice();
let t = 0;
const run = (sec) => { const dt = 1 / 30; for (let i = 0, n = Math.round(sec * 30); i < n; i++) { ctx.time = t; ctx.shared.uTime.value = t; for (const f of upd) f(dt, t); t += dt; } };
const player = (x, z) => { ctx.player.position.set(x, 0, z); camera.position.set(x, 1.6, z); camera.updateMatrixWorld(); };

// ------------------------------------------------------------------ people: a bench with a sitter and a walker
const P = ctx.services.people, sim = P.sim, nav = sim.nav;
const bench = nav.benches.find((b) => b.where === 'street' && b.seats.length >= 2 && b.seats.every((s) => s.taken < 0) && Math.hypot(b.x - L.HERO.x, b.z - L.HERO.z) < 400) || nav.benches.find((b) => b.seats.length >= 2 && b.seats.every((s) => s.taken < 0));
check(!!bench, 'a free bench with two seats exists (' + nav.benches.length + ' benches)');
player(bench.x + 25, bench.z);
run(2);
const pick = (not) => sim.agents.find((a) => a !== not && !a.hidden && !a.leader && !a.followers.length && a.kind === 'walk' && !a.script);
const sitter = pick(null); sim.sitAt(sitter, bench, 0, sim.t);
const walker = pick(sitter);
walker.goal = { type: 'bench', b: bench, si: 1 }; bench.seats[1].taken = walker.i; walker.kind = 'approach'; walker.rt = null; walker.tx = bench.seats[1].x; walker.tz = bench.seats[1].z;
check(sitter.kind === 'sit' && sitter.seat && sitter.seat.b === bench && bench.seats[0].taken === sitter.i, 'the sitter sits on seat 0');
bus.fire({ kind: 'bench', x: bench.x + 5, z: bench.z });
check(sitter.kind === 'sit' && !bench.knocked, 'a knock 5 m from the bench leaves the sitter alone');
bus.fire({ kind: 'lamp', x: bench.x, z: bench.z });
check(sitter.kind === 'sit' && !bench.knocked, 'a lamp knock leaves the bench alone');
bus.fire({ kind: 'bench', x: bench.x + 0.1, z: bench.z - 0.1 });
check(bench.knocked === true, 'the bench is marked knocked');
check(sitter.kind !== 'sit' && !sitter.seat, 'the sitter stands up (kind ' + sitter.kind + ')');
check(Math.hypot(sitter.x - bench.ax, sitter.z - bench.az) < 0.5, 'the sitter stands in front of the bench');
check(!(walker.goal && walker.goal.type === 'bench' && walker.goal.b === bench) && !walker.seat, 'the walker to seat 1 re-planned (goal ' + (walker.goal && walker.goal.type) + ')');
check(bench.seats.every((s) => s.taken >= 1e8), 'every seat is unavailable (' + bench.seats.map((s) => s.taken).join(',') + ')');
check(sim.knockBench(bench) === 0, 'a second knock moves nobody');
run(20);
const onIt = sim.agents.filter((a) => (a.seat && a.seat.b === bench) || (a.goal && a.goal.type === 'bench' && a.goal.b === bench));
check(onIt.length === 0, 'after 20 s nobody sits on / walks to the knocked bench (' + onIt.length + ')');
check(bench.seats.every((s) => s.taken >= 1e8), 'the seats stay unavailable after 20 s');
check(sim.agents.every((a) => Number.isFinite(a.x + a.z + a.yaw)), 'no NaN agents');

// ------------------------------------------------------------------ wildlife: a crow on a lamp
const svc = ctx.services.wildlife, W = svc.debug.world, B = svc.debug.birds;
const lamps = W.perches.filter((p) => p.kind === 'lamp' && !p.dead && !p.occ);
check(lamps.length > 50, 'lamp perches exist (' + lamps.length + ')');
const crows = svc.birds.filter((b) => b.sp === 'crow');
check(crows.length >= 2, 'crows exist (' + crows.length + ')');
const lp = lamps[Math.floor(lamps.length / 2)];
player(lp.x + 40, lp.z);
const crow = crows[0]; B.setPerch(crow, lp, t);
check(crow.st === 'perch' && lp.occ === crow, 'the crow sits on the lamp perch');
bus.fire({ kind: 'lamp', x: lp.x + 0.2, z: lp.z });
check(lp.dead === true, 'the lamp perch is dead');
check(crow.st === 'fly' && lp.occ !== crow && crow.perch !== lp, 'the crow is in flight (st ' + crow.st + ')');
check(!W.perchesNear(lp.x, lp.z, 0, 2, { kinds: ['lamp'] }).includes(lp), 'perchesNear skips the dead perch');
run(30);
check(crow.perch !== lp && lp.occ == null, 'after 30 s the crow is not on the dead perch');
// a crow flying to a lamp that is knocked meanwhile lands elsewhere
const lq = lamps.filter((p) => p !== lp && !p.occ && Math.hypot(p.x - lp.x, p.z - lp.z) > 15).sort((p, q) => Math.hypot(p.x - lp.x, p.z - lp.z) - Math.hypot(q.x - lp.x, q.z - lp.z))[0];
check(!!lq, 'a second lamp perch for the flight case');
if (lq) {
  const c2 = crows[1]; player(lq.x + 40, lq.z); B.launch(c2, lq.x, lq.y, lq.z, t, { perch: lq });
  bus.fire({ kind: 'lamp', x: lq.x, z: lq.z });
  run(20);
  check(lq.dead && c2.perch !== lq && lq.occ == null, 'a crow flying to a knocked lamp does not land on it (st ' + c2.st + ')');
}
// a knocked bollard kills a post perch within 0.6 m
const pp = W.perches.find((p) => p.kind === 'post' && !p.dead);
if (pp) { bus.fire({ kind: 'bollard', x: pp.x, z: pp.z + 0.3 }); check(pp.dead === true, 'a bollard knock kills the post perch next to it'); }
check(svc.birds.every((b) => Number.isFinite(b.x + b.y + b.z + b.yaw)), 'no NaN birds');

console.log(fails.length ? 'RESULT: FAIL (' + fails.length + ')' : 'RESULT: OK');
process.exit(fails.length ? 1 : 0);
