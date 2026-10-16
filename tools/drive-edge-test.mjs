// drive-edge-test.mjs - the car at the invisible edge of the strip (headless, no GPU): node tools/drive-edge-test.mjs [--runs 240] [--verbose]
// The play area is a staircase of rectangles (layout.js inPlay / clampToPlay) and the car must never get STUCK at its edge: it slides along the edge, bounces a little, and the player can always
// reverse or steer out. Uses the real layout (inPlay / clampToPlay of the strip) with the real handling and a flat, building-free world (the edge is the only obstacle).
// Per run: the car starts 15-60 m inside the edge (mid-edge, near convex corners and in concave corners of the staircase), faces the edge at a random angle (+-75 deg) and drives full throttle for
// 12 s with a smooth random steering and an occasional handbrake; then a recovery phase tries five scripted escapes (reverse, reverse + left, reverse + right, forward + left, forward + right).
// Asserts: (1) no footprint point of the car (corners + side middles) is ever outside inPlay, (2) the centre never leaves inPlay, (3) every run can escape within 5 s (moves >= 4 m from where it
// stopped), (4) no NaN, (5) a glancing hit (20 deg off the edge) keeps at least 40 % of its speed, a 45 deg hit 20 %, and a 70 deg hit recovers (the car swings along the edge and accelerates again).
import { Physics } from '../src/core/physics.js';
import { createHandling } from '../src/world/drive/handling.js';
import { SPEC as COUPE_SPEC } from '../src/world/drive/model.js';
import { MASS, tuningFor } from '../src/world/drive/cars/tuning.js';
const L = await import('../src/world/layout.js');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : (args[i + 1] && !args[i + 1].startsWith('--') ? Number(args[i + 1]) : true); };
const RUNS = arg('runs', 240), VERBOSE = args.includes('--verbose');

const world = { physics: new Physics(() => 0), L: { WORLD: L.WORLD, inPlay: L.inPlay, clampToPlay: L.clampToPlay, inExtent: L.inExtent, heightAt: () => 0, insideBuilding: () => false }, services: {} };
let seed = 20261016; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// ---- start poses: boundary segments of the union (the same walk as layout.js _boundary), corners of the rectangles that lie on the boundary
const R = L.WORLD.rects, segs = [];
const sub = (a, b, cut) => { let rem = [[a, b]]; for (const [c0, c1] of cut) { const nr = []; for (const [s, e] of rem) { if (c1 <= s || c0 >= e) { nr.push([s, e]); continue; } if (c0 > s) nr.push([s, c0]); if (c1 < e) nr.push([c1, e]); } rem = nr; } return rem.filter(([s, e]) => e - s > 1e-9); };
R.forEach((r, i) => {
  const o = R.filter((_, j) => j !== i);
  for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 < r.z0 && q.z1 >= r.z0).map((q) => [q.x0, q.x1]))) segs.push({ ax: s, az: r.z0, bx: e, bz: r.z0, nx: 0, nz: -1 });
  for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 <= r.z1 && q.z1 > r.z1).map((q) => [q.x0, q.x1]))) segs.push({ ax: s, az: r.z1, bx: e, bz: r.z1, nx: 0, nz: 1 });
  for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 < r.x0 && q.x1 >= r.x0).map((q) => [q.z0, q.z1]))) segs.push({ ax: r.x0, az: s, bx: r.x0, bz: e, nx: -1, nz: 0 });
  for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 <= r.x1 && q.x1 > r.x1).map((q) => [q.z0, q.z1]))) segs.push({ ax: r.x1, az: s, bx: r.x1, bz: e, nx: 1, nz: 0 });
});
const total = segs.reduce((s, g) => s + Math.hypot(g.bx - g.ax, g.bz - g.az), 0);
function pick() {
  let t = rnd() * total; let g = segs[0];
  for (const s of segs) { const l = Math.hypot(s.bx - s.ax, s.bz - s.az); if (t < l) { g = s; break; } t -= l; }
  const l = Math.hypot(g.bx - g.ax, g.bz - g.az); let u = rnd();
  if (rnd() < 0.3) u = rnd() < 0.5 ? rnd() * Math.min(1, 60 / l) : 1 - rnd() * Math.min(1, 60 / l);        // near the ends of a segment = near a corner of the staircase
  const d = 15 + rnd() * 45;
  return { x: g.ax + (g.bx - g.ax) * u - g.nx * d, z: g.az + (g.bz - g.az) * u - g.nz * d, nx: g.nx, nz: g.nz };
}

const SPECS = { coupe: null, truck: { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck }, lada: { W: 1.62, R: 0.285, wb: 2.42, front: 2.09, rear: -2.07, hgt: 1.40, len: 4.16, centerZ: 0.01, mass: MASS.lada } };
const makeCar = (id) => createHandling(world, id === 'coupe' ? null : tuningFor(id, SPECS[id]));
let HF = 2.1, HR = 2.1, HW = 0.95;                                      // the footprint the handling tests (T.hf / hr / hw) of the car under test
function footprintOutside(car) {
  const sy = Math.sin(car.yaw), cy = Math.cos(car.yaw);
  for (const [a, b] of [[HF, HW], [HF, -HW], [-HR, HW], [-HR, -HW], [0, HW], [0, -HW], [HF, 0], [-HR, 0]]) if (!L.inPlay(car.x + sy * a + cy * b, car.z + cy * a - sy * b)) return true;
  return false;
}
const fail = []; let hits = 0, runsDone = 0, glancingChecked = 0, glancingLost = 0, maxSpeed = 0, outsideFrames = 0, stuckRuns = 0, centreOut = 0;
for (let run = 0; run < RUNS * 3; run++) {
  const id = ['coupe', 'truck', 'lada'][run % 3], p = pick(), car = makeCar(id); HF = car.tuning.hf; HR = car.tuning.hr; HW = car.tuning.hw; runsDone++;
  const toward = Math.atan2(p.nx, p.nz), ang = toward + (rnd() * 2 - 1) * 75 * Math.PI / 180;     // yaw 0 faces +Z: the heading atan2(dx, dz) toward the edge normal (nx, nz)
  car.reset(p.x, p.z, ang);
  const v0 = 8 + rnd() * 30; car.vx = Math.sin(ang) * v0; car.vz = Math.cos(ang) * v0;
  const ph = rnd() * 6, k1 = 0.3 + rnd() * 0.9, k2 = 0.2 + rnd() * 0.6, amp = 0.2 + rnd() * 0.9;
  const dt = 1 / 60; let bad = false, t = 0;
  for (let i = 0; i < 12 * 60; i++, t += dt) {
    const inp = { thr: 1, brk: 0, steer: Math.sin(t * k1 + ph) * Math.cos(t * k2) * amp, hand: (t % 9) > 8.2, nitro: (t % 7) < 1.5 };
    car.step(dt, inp);
    for (const e of car.events) if (e.type === 'hit') hits++;
    if (!Number.isFinite(car.x + car.z + car.yaw + car.vx + car.vz)) { fail.push(['nan', id, run]); bad = true; break; }
    if (!L.inPlay(car.x, car.z)) { centreOut++; if (!bad) fail.push(['centre-outside', id, run, +car.x.toFixed(1), +car.z.toFixed(1), +t.toFixed(2)]); bad = true; }
    if (footprintOutside(car)) { outsideFrames++; if (!bad) fail.push(['footprint-outside', id, run, +car.x.toFixed(1), +car.z.toFixed(1), +t.toFixed(2)]); bad = true; }
    maxSpeed = Math.max(maxSpeed, car.speed);
  }
  // ---- escape: five scripted tries from the pose where the run ended
  const start = { x: car.x, z: car.z, yaw: car.yaw, vx: car.vx, vz: car.vz, steer: car.steer };
  const tries = [{ thr: 0, brk: 1, steer: 0 }, { thr: 0, brk: 1, steer: 1 }, { thr: 0, brk: 1, steer: -1 }, { thr: 1, brk: 0, steer: 1 }, { thr: 1, brk: 0, steer: -1 }];
  let escaped = false;
  for (const tr of tries) {
    car.x = start.x; car.z = start.z; car.yaw = start.yaw; car.vx = 0; car.vz = 0; car.steer = 0; car.impactSpin = 0;
    let moved = 0;
    for (let i = 0; i < 5 * 60 && !escaped; i++) { car.step(dt, { ...tr, hand: false, nitro: false }); moved = Math.max(moved, Math.hypot(car.x - start.x, car.z - start.z)); if (moved >= 4) escaped = true; }
    if (escaped) break;
  }
  if (!escaped) { stuckRuns++; fail.push(['stuck', id, run, +start.x.toFixed(1), +start.z.toFixed(1), +(start.yaw * 180 / Math.PI).toFixed(0)]); }
}

// ---- a glancing hit keeps its speed along the edge: the east edge x = 835 (OLD, z -405..1060) is a wall along z; the car approaches it 20 deg off the wall (a steeper 70 deg hit is run too and must recover)
for (const [deg, keep] of [[20, 0.4], [45, 0.2], [70, 0]]) for (const id of ['coupe', 'truck', 'lada']) {
  const car = makeCar(id); const wallX = 835, yaw = Math.PI / 2 - deg * Math.PI / 180;      // yaw 0 faces +Z (along the wall), the car heads east of south-east: deg = the angle between the heading and the wall
  const a = deg * Math.PI / 180, yawA = a;                                                          // heading deg from the wall (+Z), leaning toward the wall (+X)
  car.reset(wallX - 70, 300, yawA); car.vx = Math.sin(yawA) * 30; car.vz = Math.cos(yawA) * 30;
  let vmin = 1e9, vend = 0, hitT = -1; for (let i = 0; i < 12 * 60; i++) { car.step(1 / 60, { thr: 1, brk: 0, steer: 0, hand: false, nitro: false }); const v = Math.hypot(car.vx, car.vz); if (hitT < 0 && car.x > wallX - 5) hitT = i; if (hitT >= 0 && i > hitT + 6) vmin = Math.min(vmin, v); vend = v; }
  const v0 = 30; glancingChecked++; const lost = vmin < v0 * keep; if (lost) { glancingLost++; fail.push(['hit-lost-speed', id, deg, +vmin.toFixed(1), +vend.toFixed(1)]); }
  if (VERBOSE) console.log(id + ' hit at ' + deg + ' deg off the east edge: slowest ' + vmin.toFixed(1) + ' m/s after the hit, ' + vend.toFixed(1) + ' m/s 12 s later; x ' + car.x.toFixed(1) + ' z ' + car.z.toFixed(1));
}
console.log(`edge runs ${runsDone} (coupe, taxi pickup, Lada): hits ${hits}, footprint outside the map in ${outsideFrames} frames, centre outside ${centreOut}, stuck runs (no escape in 5 s) ${stuckRuns}, top speed ${maxSpeed.toFixed(0)} km/h`);
if (fail.length) { console.log('FAILURES (' + fail.length + '):'); for (const f of fail.slice(0, 15)) console.log('  ', JSON.stringify(f)); console.log('RESULT: FAIL'); process.exit(1); }
console.log('RESULT: OK');
