// tools/environment-vo-walk.mjs - the WALK PROBE of the banks of Vasilievsky Island (build-water, 2026-10-07): "nobody walks on the water, nobody falls off an embankment at a bridge zone".
// A simulated player (the substep logic of core/player.js, as in environment-banks.mjs) approaches EVERY bank piece of the island's data (the V rectangles that no older rectangle covers) from the land side at five angles
// (-50 / -25 / 0 / +25 / +50 degrees off the wall normal), 2.5 m (slope banks: run + 3.2 m) behind the wall line, every 3 m of bank, and pushes 5 m past the water edge; the feet may never leave street level (no fall into the
// water, no climbing a slope). Then it walks along the bank on the land side (0.9 m from the wall line, the whole length of every chain, 1.2 m steps) and pushes toward the water at every vertex of the chain (corners are
// where the thin collider boxes leave wedges). Bridge zones (the real zone test of river.js) and descents are excluded from the first part and reported separately: a push inside a zone must end on a deck or a wall.
// (review-water 2026-10-07: starts that are unreachable are skipped and counted: a run-up that ends inside the collision belt of a neighbouring wall piece, and every start outside the PLAY rectangles; the sealed-shore flood fill and the deck crossings are in environment-vo-seal.mjs)
// usage: node tools/environment-vo-walk.mjs [--step 3] [--only neva|smolenka|gavan|kovsh] [--verbose]      (NODE_OPTIONS=--max-old-space-size=14000)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
globalThis.document = { createElement: (t) => (t === 'canvas' ? new FakeCanvas() : { style: {}, addEventListener() {}, appendChild() {}, setAttribute() {} }), createElementNS: (ns, t) => (t === 'canvas' ? new FakeCanvas() : { style: {} }), fonts: { load: async () => [] }, body: { appendChild() {} }, addEventListener() {} };
globalThis.Image = class { constructor() { this.width = 1; this.height = 1; } addEventListener() {} };
globalThis.HTMLCanvasElement = FakeCanvas; globalThis.OffscreenCanvas = FakeCanvas;
globalThis.requestAnimationFrame = (f) => setTimeout(() => f(Date.now()), 16); globalThis.addEventListener = () => {};
globalThis.innerWidth = 1280; globalThis.innerHeight = 720; globalThis.devicePixelRatio = 1; globalThis.matchMedia = () => ({ matches: false, addEventListener() {} });

const THREE = await import('three');
const { createContext } = await import(pathToFileURL(path.join(root, 'src/core/ctx.js')).href);
const { STEP_HEIGHT, DROP_MAX } = await import(pathToFileURL(path.join(root, 'src/core/physics.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const args = process.argv.slice(2), only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null, verbose = args.includes('--verbose');
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 2500);
const ctx = createContext({ scene, camera, renderer: null, audio: null, quality: { name: 'high', pixelRatio: 1, msaa: 4, shadowMap: 4096, shadowSize: 75, petals: 1 }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
const ZON = !process.argv.includes('--no-zones');      // the zone walk needs the bridge owner's decks: `bridges` is built as well
ctx.buildList = ZON ? ['environment', 'bridges'] : ['environment']; ctx.sky = { sun: new THREE.DirectionalLight(), hemi: new THREE.HemisphereLight(), uniforms: {} };
const mod = await import(pathToFileURL(path.join(root, 'src/world/environment.js')).href);
await mod.build(ctx);
let zonesBuilt = false;
if (ZON) { try { const bm = await import(pathToFileURL(path.join(root, 'src/world/bridges.js')).href); await bm.build(ctx); zonesBuilt = true; } catch (e) { console.log('ZONE WALK SKIPPED: bridges did not build:', e.message); } }
if (process.argv.includes('--at')) {                              // --at x z [r]: a 1 m map of what a walker meets round a point: . street level, v a drop (surface below -0.5), # inside a collider, W water flag
  const i = process.argv.indexOf('--at'), cx = Number(process.argv[i + 1]), cz = Number(process.argv[i + 2]), rr = Number(process.argv[i + 3]) || 8, P = ctx.physics;
  for (let z = cz - rr; z <= cz + rr; z += 1) { let s = String(Math.round(z)).padStart(6) + ' '; for (let x = cx - rr; x <= cx + rr; x += 1) { const S = P.surfaceAt(x, z, 0.6, true, { y: 0, kind: null, item: null }), p = { x, z }; P.resolve(p, 0.3, 0, 1.7); const hit = Math.hypot(p.x - x, p.z - z) > 0.05; s += hit ? '#' : S.y < -0.5 ? (L.waterwayAt(x, z) ? 'W' : 'v') : '.'; } console.log(s); }
  console.log('columns x', cx - rr, '..', cx + rr); process.exit(0);
}
const ph = ctx.physics, quay = ctx.services.environment.quay;

// ---- a walker with the substep logic of Player.update
const R = 0.3, H = 1.7, STICK_DOWN = 0.75, UNDER_EPS = 0.05;
class Walker {
  constructor(x, z, y = 0) { this.x = x; this.z = z; this.y = y; this.vy = 0; this.onGround = true; this.stick = false; this.minY = y; this.fell = false; }
  step(dx, dz, dt = 1 / 60) {
    const sx = dx * dt, sz = dz * dt, n = Math.max(1, Math.ceil(Math.hypot(sx, sz) / 0.12)), p = { x: this.x, z: this.z };
    let feet = this.y; const track = this.onGround && this.stick;
    for (let i = 0; i < n; i++) {
      const ox = p.x, oz = p.z; p.x += sx / n; p.z += sz / n;
      ph.resolve(p, R, feet, H);
      const S = ph.surfaceAt(p.x, p.z, feet, true, { y: 0, kind: null, item: null }), g = S.y;
      let refuse = g - feet > STEP_HEIGHT;
      if (!refuse && this.onGround && feet - g > DROP_MAX && S.kind !== 'terrain' && (feet < ph.heightAt(p.x, p.z) - UNDER_EPS || ph.inHole(p.x, p.z))) refuse = true;
      if (refuse) { p.x = ox; p.z = oz; } else if (track && g > feet) feet = g;
    }
    this.x = p.x; this.z = p.z;
    const S2 = ph.surfaceAt(this.x, this.z, this.y, true, { y: 0, kind: null, item: null }), g = S2.y, item = S2.item;
    if (this.onGround && (this.stick || (item && item.sticky)) && this.vy <= 0 && this.y > g && this.y - g <= STICK_DOWN) { this.y = g; this.vy = 0; this.onGround = true; }
    else {
      this.vy -= 12 * dt; this.y += this.vy * dt;
      if (this.y <= g) { this.y = g; this.vy = 0; this.onGround = true; } else if (this.y - g < 0.06 && this.vy <= 0) { this.y = g; this.vy = 0; this.onGround = true; } else this.onGround = false;
    }
    this.stick = this.onGround && !!(item && item.sticky);
    if (g === -Infinity) this.fell = true;
    this.minY = Math.min(this.minY, this.y);
  }
  walkTo(tx, tz, speed = 3.6, maxT = 12) {
    for (let t = 0; t < maxT; t += 1 / 60) { const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz); if (d < 0.05) return true; this.step(dx / d * speed, dz / d * speed); }
    return false;
  }
}

const env = ctx.services.environment;
const { inVO } = await import(pathToFileURL(path.join(root, 'src/world/environment/vo-banks.js')).href);
const { bridgeZones } = await import(pathToFileURL(path.join(root, 'src/world/environment/river.js')).href);
const W = await import(pathToFileURL(path.join(root, 'src/world/environment/waterways.js')).href);
const zonesAll = bridgeZones().filter((zn) => zn.petro);
const MINE = new Set(['neva', 'smolenka', 'gavan', 'kovsh']);        // the waterways of the island round (the Zhdanovka and the other keys that reach into the V rectangles belong to the earlier rounds)
const step = args.includes('--step') ? Number(args[args.indexOf('--step') + 1]) : 3;
const inZone = (x, z, m = 3) => zonesAll.some((zn) => zn.test(x, z, m));
const nearStair = (x, z) => quay.allStairs.some((q) => Math.hypot(q.x - x, q.z - z) < 24);
const wet = (x, z) => L.inRiver(x, z) || L.waterwayAt(x, z) || W.slopeAt(x, z);
let tested = 0, bad = 0, skippedBelt = 0, skippedOut = 0; const per = {};
const note = (key, ok) => { const r = per[key] || (per[key] = { n: 0, bad: 0 }); r.n++; if (!ok) r.bad++; };
const fails = [];
// (water-3 2026-10-09) a walker that ends INSIDE a sight / bridge water ring (owners.js WATER_RINGS: the owner's stair pit) is on the owner's flight, not in the water: the owner's pits are proven by environment-vo-seal.mjs --flood --modules
const ownerRings = W.ownerWater().map((o) => o.o), inOwnerPit = (x, z) => ownerRings.some((o) => W.pointInFlat(x, z, o)); let ownerPitEnds = 0;
const fail = (what, key, x, z, w, len = 99) => { if (inOwnerPit(w.x, w.z)) { ownerPitEnds++; return; } bad++; fails.push({ what, key, x, z, len }); if (verbose) console.log('FELL', what, key, Math.round(x), Math.round(z), 'y', w.y.toFixed(2), 'at', w.x.toFixed(1), w.z.toFixed(1)); };
// ---- 1. approach every piece at five angles
for (const sg of quay.segments) {
  if ((only && sg.key !== only) || !MINE.has(sg.key) || !inVO(sg.ax, sg.az)) continue;
  const len = Math.hypot(sg.bx - sg.ax, sg.bz - sg.az);
  for (let s = step / 2; s < len; s += step) {
    const t = s / len, x = sg.ax + (sg.bx - sg.ax) * t, z = sg.az + (sg.bz - sg.az) * t;
    if (inZone(x, z) || nearStair(x, z)) continue;
    const back = sg.slope ? sg.slope + 3.2 : 2.5;
    for (const deg of [-50, -25, 0, 25, 50]) {
      const a = deg * Math.PI / 180, dx = -(sg.nx * Math.cos(a) - sg.nz * Math.sin(a)), dz = -(sg.nx * Math.sin(a) + sg.nz * Math.cos(a));
      const sx = x - dx * back, sz = z - dz * back;
      if (wet(sx, sz) || inZone(sx, sz) || L.insideBuilding(sx, sz, 0.3)) continue;
      if (!L.inPlay(sx, sz)) { skippedOut++; continue; }      // (review-water 2026-10-07) the player is clamped to the PLAY rectangles (the data extent is 120 m wider: scenery, unreachable): e.g. the clip edge of the Neva piece at x -4430
      // (review-water 2026-10-07) a start INSIDE the collision belt of a wall (a tight spike or corner: the 2.5 m run-up ends in a neighbouring piece's box) is no position a walker can reach from the land: resolve()
      // would push it to the water half of the belt and the "fall" is the probe's own. Such starts are counted and skipped; every reachable start is tested.
      { const q = { x: sx, z: sz }; ph.resolve(q, R, 0, H); if (Math.hypot(q.x - sx, q.z - sz) > 0.02) { skippedBelt++; continue; } }
      const w = new Walker(sx, sz, 0); tested++;
      w.walkTo(x + dx * 5, z + dz * 5, 3.6, 5);
      const ok = !(w.fell || w.y < -0.4 || wet(w.x, w.z) && w.y < -0.3);
      note(sg.key, ok); if (!ok) fail('approach ' + deg, sg.key, x, z, w, len);
    }
  }
}
// ---- 2. a push at every vertex between two WALL pieces (the corners where the thin collider boxes could leave a wedge), along the bisector of the two landward normals; and a walk along the wall (0.9 m behind it)
let along = 0, alongBad = 0;
const byEnd = new Map(); for (const sg of quay.segments) byEnd.set(sg.bank + '|' + sg.bx.toFixed(1) + ',' + sg.bz.toFixed(1), sg);
for (const sg of quay.segments) {
  if ((only && sg.key !== only) || !MINE.has(sg.key) || !inVO(sg.ax, sg.az) || sg.slope) continue;
  const x = sg.ax, z = sg.az, pv = byEnd.get(sg.bank + '|' + x.toFixed(1) + ',' + z.toFixed(1));
  if (!pv || pv.slope || inZone(x, z, 4) || nearStair(x, z)) continue;
  let mx = pv.nx + sg.nx, mz = pv.nz + sg.nz; const ml = Math.hypot(mx, mz); if (ml < 0.3) continue; mx /= ml; mz /= ml;
  if (wet(x + mx * 1.2, z + mz * 1.2) || L.insideBuilding(x + mx * 1.2, z + mz * 1.2, 0.3)) continue;
  along++;
  const w2 = new Walker(x + mx * 1.2, z + mz * 1.2, 0); w2.walkTo(x - mx * 4, z - mz * 4, 3.6, 4);
  if ((w2.fell || w2.y < -0.4 || wet(w2.x, w2.z) && w2.y < -0.3) && !inOwnerPit(w2.x, w2.z)) { alongBad++; bad++; if (verbose || alongBad <= 8) console.log('FELL vertex', sg.key, Math.round(x), Math.round(z), 'y', w2.y.toFixed(2)); }
}
{ const cl = new Map(); for (const f of fails) { const k = f.key + ' ' + Math.round(f.x / 40) * 40 + ',' + Math.round(f.z / 40) * 40; const c = cl.get(k) || { n: 0, angles: new Set() }; c.n++; c.angles.add(f.what.replace('approach ', '')); cl.set(k, c); }
  for (const [k, c] of [...cl.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30)) console.log('cluster', k, c.n, 'angles', [...c.angles].join('/')); }
console.log('failures on pieces >= 4 m long:', fails.filter((f) => f.len >= 4).length, ', on shorter ones (jagged OSM shore, 1-3 m zigzags):', fails.filter((f) => f.len < 4).length);
console.log('approach probes', tested, 'bank pieces: failed', bad - alongBad, JSON.stringify(per), '; skipped (unreachable): starts inside a wall belt', skippedBelt, ', starts outside the play area', skippedOut);
console.log('vertex probes', along, 'failed', alongBad);
console.log(bad ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(bad ? 1 : 0);
