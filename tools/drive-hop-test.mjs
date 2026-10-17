// drive-hop-test.mjs - the Roadster's gas HOP and THRUST surge (drive/handling.js tuning.hop / tuning.nitroRamp), headless, NO browser: the real handling on a flat world with the real Physics.
//   node tools/drive-hop-test.mjs [--verbose]
// Asserts: (1) the hop curve: a ballistic hop (tank too low for the landing cushion) peaks at about 1.24 m, hangs for about 0.8 s and lands at about 6.2 m/s; with the cushion the touchdown is soft (about 1.8 m/s);
// (2) the car is never below the road (also over a kerb slab), never rises without a key press, one key press = one hop (a held key does not repeat), the cooldown and the tank rules (cost 0.28, needs 0.28);
// (3) in the air: no engine, no brakes, no nitro, a quarter of the steering, the sideways speed is kept; (4) obstacles: a 0.9 m bin stops the ground car but an airborne one passes over it, a 0.4 m kerb
// is stepped over by both (STEP_HEIGHT 0.45), a 2 m wall stops even the airborne car (its top is above car.y + 0.45) and buildings / river stay 2D blockers (the handling footprint test is unchanged);
// (5) the other cars are untouched: pressing the hop key does nothing for the coupe / truck / Lada, and a scripted 40 s run of each (gas, brakes, steering, handbrake, nitro, collisions) matches a copy of the
// handling from commit BASE_COMMIT (git show, before the hop existed) bit for bit, state by state; the Roadster without a hop press and without nitro matches it too, and its nitro surge (nitroRamp) is a real lag.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Physics } from '../src/core/physics.js';
import { createHandling } from '../src/world/drive/handling.js';
import { SPEC as COUPE_SPEC } from '../src/world/drive/model.js';
import { MASS, SOUND, tuningFor } from '../src/world/drive/cars/tuning.js';
import { createCarSound } from '../src/world/drive/sound.js';

const VERBOSE = process.argv.includes('--verbose');
const BASE_COMMIT = '231799b';                      // the tree before the hop / surge: createHandling(ctx, tuning) with no vertical dynamics
const ROOT = new URL('..', import.meta.url), DRIVE = new URL('../src/world/drive/', import.meta.url);
const SPECS = {
  coupe: { ...COUPE_SPEC, mass: MASS.coupe },
  truck: { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck },
  lada: { W: 1.62, R: 0.285, wb: 2.42, front: 2.09, rear: -2.07, hgt: 1.40, len: 4.16, centerZ: 0.01, mass: MASS.lada },
  roadster: { W: 2.00, R: 0.355, wb: 2.96, front: 2.36, rear: -2.26, hgt: 1.22, len: 4.62, centerZ: 0.05, mass: MASS.roadster },
};
const FLAT = { inPlay: () => true, heightAt: () => 0, insideBuilding: () => false };
const DT = 1 / 60, NONE = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false, jump: false };
const world = (extra) => { const physics = new Physics(() => 0); if (extra) extra(physics); return { L: FLAT, physics, services: {} }; };
const make = (id, ctx = world(), mod = { createHandling }) => { const car = mod.createHandling(ctx, id === 'coupe' ? null : tuningFor(id, SPECS[id])); car.reset(0, 0, 0); return car; };
const say = (...a) => { if (VERBOSE) console.log(...a); };
const near = (v, a, b, what) => assert(v >= a && v <= b, `${what}: ${v} not in [${a}, ${b}]`);

const car0Refill = (r) => r.car.tuning.nitroRefill * r.air;
// ---------------------------------------------------------------- 1. the hop curve (flat road, standing car)
/** one hop from a standstill: the key is pressed for one frame at t = 0.1 s; returns the measurements. boost0 = the tank at the press; dt = the frame time */
function hopRun(boost0, dt = DT, seconds = 2.5, refill = true) {
  const car = make('roadster'), ground = car.groundAt(0, 0), r = { peak: 0, peakT: 0, minAboveRoad: Infinity, events: [], air: 0, takeoffT: -1, landT: -1, boostBefore: 0, boostAfter: 0 };
  car.boost = boost0; r.hop = car.tuning.hop; if (!refill) car.tuning.nitroRefill = car.tuning.nitroDriftRefill = 0;
  const press = Math.round(0.1 / dt);
  for (let i = 0; i * dt < seconds; i++) {
    const t = i * dt, wasAir = car.air;
    if (i === press) r.boostBefore = car.boost;
    car.step(dt, { ...NONE, jump: i === press });
    for (const e of car.events) if (e.type === 'hop' || e.type === 'land' || e.type === 'cushion') r.events.push({ ...e, t });
    if (!wasAir && car.air) { r.takeoffT = t; r.boostAfter = car.boost; }
    if (wasAir && !car.air) { r.landT = t; r.boostLand = car.boost; }
    if (car.air) r.air += dt;
    r.minAboveRoad = Math.min(r.minAboveRoad, car.y - ground);
    if (car.h > r.peak) { r.peak = car.h; r.peakT = t; }
    assert(Number.isFinite(car.y + car.h + car.vy), 'finite state');
    assert(Math.abs(car.x) < 1e-9 && Math.abs(car.z) < 1e-9, 'a standing car hops straight up');
  }
  r.car = car; return r;
}
{
  const a = hopRun(0.30, DT, 2.5, false), H = a.car.tuning.hop;                  // 0.30 - 0.28 = 0.02 left and no refill: no gas for the landing cushion, a purely ballistic hop
  say('ballistic hop', { peak: +a.peak.toFixed(3), air: +a.air.toFixed(3), events: a.events.map((e) => e.type + (e.v ? ' ' + e.v.toFixed(2) : '')) });
  near(a.peak, 1.15, 1.27, 'ballistic hop peak height (v0^2 / 2g = 1.24 m)');
  near(a.air, 0.74, 0.86, 'ballistic hop airtime (2 v0 / g = 0.8 s)');
  assert.deepEqual(a.events.map((e) => e.type), ['hop', 'land'], 'one hop event, one land event (no cushion without gas)');
  near(a.events[1].v, 5.9, 6.4, 'touchdown speed without the cushion (v0 = 6.2 m/s)');
  near(a.peakT - a.takeoffT, 0.36, 0.42, 'time to the top (v0 / g = 0.4 s)');
  assert(a.minAboveRoad >= -1e-9, `the car is never below the road (${a.minAboveRoad})`);
  near(a.boostBefore - a.boostAfter, H.cost - 0.01, H.cost + 0.01, 'the tank cost of a hop');
  assert(a.car.air === false && a.car.h === 0 && a.car.vy === 0 && Math.abs(a.car.y - a.car.groundAt(0, 0)) < 1e-6, 'back on the road, level');
  const b = hopRun(1);                                                          // a full tank: the down-jets fire again before the touchdown
  say('cushioned hop', { peak: +b.peak.toFixed(3), air: +b.air.toFixed(3), events: b.events.map((e) => e.type + (e.v ? ' ' + e.v.toFixed(2) : '')) });
  assert.deepEqual(b.events.map((e) => e.type), ['hop', 'cushion', 'land'], 'a full tank: hop, cushion, land');
  near(b.events[2].v, 1.6, 2.1, 'touchdown speed with the cushion (about 1.8 m/s)');
  near(b.air, 0.8, 1.0, 'cushioned airtime');
  near(b.peak, 1.15, 1.27, 'cushioned peak height');
  assert(b.minAboveRoad >= -1e-9, 'never below the road (cushioned)');
  near(b.boostAfter + car0Refill(b) - b.boostLand, 0.02, 0.12, 'the tank spent by the landing jets (about 0.04)');
  const c = hopRun(0.30, 1 / 30, 2.5, false);                                               // a slow frame rate integrates to the same arc (substeps of 1/120 s)
  near(c.peak, 1.15, 1.27, 'peak height at 30 fps'); near(c.air, 0.72, 0.9, 'airtime at 30 fps'); assert(c.minAboveRoad >= -1e-9, 'never below the road at 30 fps');
  const d = hopRun(1, 1 / 144); near(d.peak, 1.15, 1.27, 'peak height at 144 fps'); near(d.air, 0.8, 1.0, 'airtime at 144 fps');
  // the tank gate: below minTank the key does nothing
  const e = hopRun(H.minTank - 0.05); assert.equal(e.events.length, 0, 'not enough gas: no hop'); assert.equal(e.peak, 0, 'not enough gas: the car stays on the road');
  const f = hopRun(H.minTank + 0.02); assert.equal(f.events[0]?.type, 'hop', 'just enough gas: it hops');
}

// ---------------------------------------------------------------- 2. one press = one hop; the cooldown and the 0.18 s key buffer
{
  const car = make('roadster'), H = car.tuning.hop, hops = [], lands = []; let t = 0;
  const frame = (jump) => { car.step(DT, { ...NONE, jump }); for (const e of car.events) { if (e.type === 'hop') hops.push(t); if (e.type === 'land') lands.push(t); } t += DT; };
  for (let i = 0; i < 30; i++) frame(false);
  assert.equal(car.h, 0, 'nothing rises without a key press'); assert.equal(hops.length, 0);
  for (let i = 0; i < 300; i++) frame(true);                                    // the key stays down for 5 s
  assert.equal(hops.length, 1, `a held key hops once (${hops.length})`); assert.equal(lands.length, 1, 'and lands once');
  // a fresh car: hop, land; a press 0.2 s after the touchdown is inside the cooldown and older than the buffer when it ends -> ignored; a press 0.45 s after is held and hops when the cooldown ends
  const k = make('roadster'), times = []; let tk = 0, landAt = -1;
  const step = (jump) => { if (jump) k.boost = 1; k.step(DT, { ...NONE, jump }); for (const e of k.events) { if (e.type === 'land') landAt = tk; if (e.type === 'hop') times.push(tk); } tk += DT; };
  for (let i = 0; i < 6; i++) step(false);
  step(true); while (tk < 3 && landAt < 0) step(false);
  assert(landAt > 0 && times.length === 1, 'the first hop landed');
  while (tk < landAt + 0.2 - 1e-9) step(false); step(true);
  while (tk < landAt + 0.45 - 1e-9) step(false);
  assert.equal(times.length, 1, `a press 0.2 s after the touchdown is ignored (cooldown ${H.cooldown} s, buffer 0.18 s)`);
  step(true);
  while (tk < landAt + 1.0) step(false);
  assert.equal(times.length, 2, 'a press 0.45 s after the touchdown is held by the buffer and hops when the cooldown ends');
  near(times[1] - landAt, H.cooldown - 0.03, H.cooldown + 0.05, 'the second hop starts when the cooldown ends');
}

// ---------------------------------------------------------------- 3. the air: no engine, no brakes, no nitro, a quarter of the steering, the sideways speed is kept
{
  const gnd = make('roadster'), air = make('roadster');
  for (const c of [gnd, air]) { c.vz = 20; c.boost = 1; }
  // identical inputs, the air car hops at t = 0: gas + nitro + full left steering for 0.5 s
  const inp = { thr: 1, brk: 0, steer: 1, hand: false, nitro: true };
  let boostingInAir = false, brakingInAir = false;
  for (let i = 0; i < 30; i++) {
    gnd.step(DT, { ...inp, jump: false }); air.step(DT, { ...inp, jump: i === 0 });
    if (air.air && air.boosting) boostingInAir = true; if (air.air && air.braking) brakingInAir = true;
  }
  assert(air.air, 'still in the air after 0.5 s'); assert(!boostingInAir, 'no nitro in the air'); assert(!brakingInAir, 'no brake lights in the air');
  const vA = Math.hypot(air.vx, air.vz), vG = Math.hypot(gnd.vx, gnd.vz);
  near(vA, 19.0, 20.1, 'the speed in the air: no engine, only the drag'); assert(vG > vA + 4, `the car on the road accelerates (${vG.toFixed(1)} vs ${vA.toFixed(1)} m/s)`);
  const yawG = Math.abs(gnd.yaw), yawA = Math.abs(air.yaw - 0);
  assert(yawA > 0.01 && yawA < 0.6 * yawG, `a quarter of the steering in the air (yaw ${yawA.toFixed(3)} vs ${yawG.toFixed(3)} rad)`);
  // the velocity keeps its direction: the nose swings but the car flies straight on
  const heading = Math.atan2(air.vx, air.vz); assert(Math.abs(heading) < 0.03, `the flight path stays straight (${heading.toFixed(3)} rad) while the nose swings`);
  assert(Math.abs(air.vL) > 0.3, 'the sideways speed grows as the nose turns: nothing grips in the air');
}

// ---------------------------------------------------------------- 4. obstacles: car.y decides (collision.js carContact), 2D blockers stay
/** drive toward an obstacle (a box across the road at z = 40) at v m/s; hop (or not) 0.2 s before the nose arrives. Returns { contact (any obstacle contact event), z, speed, minAboveRoad } */
function crossing(id, v, top, { hop = true, y0 = 0, kerb = 0 } = {}) {
  const ctx = world((p) => { p.addBox(0, 40, 14, 0.5, 0, y0, top); if (kerb) p.addWalkBox(0, 25, 14, 6, 0, kerb); });
  const car = make(id, ctx), ground = (x, z) => car.groundAt(x, z), SP = SPECS[id];
  car.vz = v; let contact = 0, minAbove = Infinity, hopped = false, maxH = 0;
  for (let i = 0; i < 6 * 60; i++) {
    const nose = car.z + SP.front, gap = 39.75 - nose, go = hop && !hopped && gap <= 0.2 * car.vz;
    if (go) hopped = true;
    car.step(DT, { thr: 0.12, brk: 0, steer: 0, hand: false, nitro: false, jump: go });
    for (const e of car.events) if (e.obstacle) contact++;
    if (car.air) minAbove = Math.min(minAbove, car.y - ground(car.x, car.z)); maxH = Math.max(maxH, car.h || 0);
  }
  return { contact, z: car.z, speed: car.speed / 3.6, minAbove, hopped, maxH };
}
{
  for (const v of [15, 25]) {
    const ground = crossing('roadster', v, 0.9, { hop: false }), hop = crossing('roadster', v, 0.9, { hop: true });
    say('0.9 m bin at', v, 'm/s', { ground, hop });
    assert(ground.contact > 0 && ground.z < 40, `the Roadster on the road is stopped by a 0.9 m bin at ${v} m/s`);
    assert(hop.hopped && hop.contact === 0 && hop.z > 50, `the hopping Roadster flies over a 0.9 m bin at ${v} m/s (contact ${hop.contact}, z ${hop.z.toFixed(1)})`);
    assert(hop.speed > 8, `and keeps its speed (${hop.speed.toFixed(1)} m/s)`);
    assert(hop.minAbove >= -1e-9, 'never below the road over the bin');
    const kerb = crossing('roadster', v, 0.4, { hop: false }), kerbHop = crossing('roadster', v, 0.4, { hop: true });
    assert(kerb.contact === 0 && kerb.z > 50 && kerbHop.contact === 0 && kerbHop.z > 50, `a 0.4 m kerb is no obstacle for either (STEP_HEIGHT 0.45) at ${v} m/s`);
    const wall = crossing('roadster', v, 2.0, { hop: true });
    assert(wall.contact > 0 && wall.z < 40, `even the airborne Roadster is stopped by a 2 m wall (its top is above car.y + 0.45) at ${v} m/s (z ${wall.z.toFixed(1)})`);
    const coupe = crossing('coupe', v, 0.9, { hop: true });
    assert(!coupe.hopped || coupe.maxH === 0, 'the coupe never leaves the road'); assert(coupe.contact > 0 && coupe.z < 40, `the coupe pressing the hop key is stopped by the bin like any ground car at ${v} m/s`);
  }
  // a building footprint (and so the river, the same refusal) stays a 2D wall: the hop does not clear it, the car stops at its edge in the air or on the road
  {
    const ctx = world(); ctx.L = { ...FLAT, insideBuilding: (x, z) => z > 40 }; const car = make('roadster', ctx); car.vz = 25; let hopped = false;
    for (let i = 0; i < 5 * 60; i++) { const go = !hopped && i === 12; if (go) hopped = true; car.step(DT, { thr: 0.2, brk: 0, steer: 0, hand: false, nitro: false, jump: go }); }
    assert(car.z + SPECS.roadster.front < 40.3, `the hopping Roadster does not enter a building footprint (nose at z ${(car.z + SPECS.roadster.front).toFixed(2)}, the wall is at 40)`);
  }
  // the kerb slab under the hop: the car lands ON it (the road there is 0.25 m up) and is never under it
  const ks = crossing('roadster', 20, 0.4, { hop: true, kerb: 0.25 });
  assert(ks.minAbove >= -1e-9 && ks.minAbove < 1e9 && ks.contact === 0, `hop over a 0.25 m kerb slab: never below the road in the air (${ks.minAbove}), no contact`);
}

// ---------------------------------------------------------------- 5. the other cars are untouched
let Base = null;
try {
  let src = execFileSync('git', ['show', `${BASE_COMMIT}:src/world/drive/handling.js`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24, stdio: ['ignore', 'pipe', 'ignore'] });
  src = src.replace("from './model.js'", `from '${new URL('model.js', DRIVE).href}'`).replace("from './collision.js'", `from '${new URL('collision.js', DRIVE).href}'`);
  assert(src.includes(new URL('collision.js', DRIVE).href) && !src.includes('tuning.hop'), 'the baseline copy is the pre-hop handling');
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'hop-base-')), 'handling-base.mjs'); writeFileSync(file, src);
  Base = await import(pathToFileURL(file).href);
} catch (err) { console.log(`SKIP bit-identity: cannot get handling.js from ${BASE_COMMIT} (${String(err.message).split('\n')[0]})`); }

const KEYS = ['x', 'y', 'z', 'yaw', 'vx', 'vz', 'speed', 'vF', 'vL', 'pitch', 'roll', 'steer', 'steerAngle', 'spin', 'boost', 'rpm', 'gear', 'odo', 'impactSpin', 'aLong', 'aLat', 'throttle'];
const FLAGS = ['boosting', 'drifting', 'braking'];
/** the world for the comparison: a ring of boxes and posts the scripted drive runs into (so the contact code, the events and the push-out are compared as well) */
const rough = () => world((p) => {
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = 70 + 25 * (i % 3); p.addBox(Math.sin(a) * r, Math.cos(a) * r - 40, 3 + (i % 4), 1.2, a, 0, 1.4 + (i % 3) * 0.3); }
  for (let i = 0; i < 10; i++) p.addCylinder(-60 + i * 14, 30 - 9 * (i % 4), 0.3, 0, 3);
  p.addBox(0, 160, 120, 2, 0, 0, 3); p.addBox(-90, 60, 2, 240, 0, 0, 3); p.addBox(90, 60, 2, 240, 0, 0, 3);
});
const script = (t, jump) => ({ thr: t % 11 < 8 ? 1 : (t % 11 < 9.5 ? 0 : 0.3), brk: t % 11 > 9.5 ? 1 : 0, steer: Math.sin(t * 0.9) * Math.cos(t * 0.31) * 1.2, hand: t % 7 > 6.2, nitro: t % 5 < 1.6, jump });
function compare(id, mkInput, { label, seconds = 40 } = {}) {
  const ctxA = rough(), ctxB = rough(), A = make(id, ctxA, Base), B = make(id, ctxB);
  let frames = 0, hits = 0;
  for (let i = 0; i < seconds * 60; i++) {
    const inp = mkInput(i * DT);
    A.step(DT, { ...inp }); B.step(DT, { ...inp }); frames++;
    for (const k of KEYS) if (!Object.is(A[k], B[k])) assert.fail(`${label || id}: ${k} differs at t = ${(i * DT).toFixed(3)} s: baseline ${A[k]} vs now ${B[k]}`);
    for (const k of FLAGS) assert.equal(A[k], B[k], `${label || id}: ${k} at t = ${(i * DT).toFixed(3)}`);
    assert.equal(A.events.length, B.events.length, `${label || id}: events at t = ${(i * DT).toFixed(3)}`);
    A.events.forEach((e, j) => { assert.equal(e.type, B.events[j].type); assert(Object.is(e.v, B.events[j].v), 'event speed'); if (e.type === 'hit') hits++; });
    assert.equal(B.h, 0); assert.equal(B.air, false);
  }
  return { frames, hits };
}
if (Base) {
  const out = [];
  for (const id of ['coupe', 'truck', 'lada']) {
    out.push(id, 'script', JSON.stringify(compare(id, (t) => script(t, false), { label: id + ' script' })));
    out.push(id, 'jump pressed all the time', JSON.stringify(compare(id, (t) => script(t, true), { label: id + ' with the hop key held' })));
    out.push(id, 'jump tapped', JSON.stringify(compare(id, (t) => script(t, (t * 2) % 1 < 0.1), { label: id + ' with the hop key tapped' })));
  }
  // the Roadster without a hop press and without nitro drives exactly like the pre-hop handling given its tuning (the extra keys of the tuning are simply unknown to the baseline)
  out.push('roadster', 'no hop, no nitro', JSON.stringify(compare('roadster', (t) => ({ ...script(t, false), nitro: false }), { label: 'roadster (no hop, no nitro)' })));
  say(out.join(' '));
  // its nitro surge is a real lag: the same launch with the nitro key down is slower for the first 0.4 s than the instant push and just as fast afterwards
  const A = make('roadster', world(), Base), B = make('roadster'), sp = [];
  for (let i = 0; i < 4 * 60; i++) { const inp = { thr: 1, brk: 0, steer: 0, hand: false, nitro: true, jump: false }; A.step(DT, inp); B.step(DT, inp); if (i === 12) sp.push(A.speed, B.speed); if (i === 239) sp.push(A.speed, B.speed); }
  assert(sp[1] < sp[0] - 1, `the thrust surge: ${sp[1].toFixed(1)} km/h at 0.2 s against ${sp[0].toFixed(1)} km/h with the instant push`);
  assert(sp[3] > sp[2] - 25 && sp[3] < sp[2] + 1, `after 4 s the surge is spent: ${sp[3].toFixed(1)} vs ${sp[2].toFixed(1)} km/h`);
  say('surge', sp.map((v) => +v.toFixed(1)));
}
// the other cars take the hop key as no key at all (also without the baseline)
for (const id of ['coupe', 'truck', 'lada']) {
  const car = make(id); let maxH = 0, ev = 0;
  for (let i = 0; i < 600; i++) { car.step(DT, { ...script(i * DT, true) }); maxH = Math.max(maxH, car.h); for (const e of car.events) if (e.type === 'hop' || e.type === 'land' || e.type === 'cushion') ev++; }
  assert(maxH === 0 && ev === 0 && !car.air && car.tuning.hop === undefined && car.tuning.nitroRamp === undefined, `${id}: no hop, no surge`);
}
// ---------------------------------------------------------------- 6. the sounds: the Roadster thrust hiss + valve thunk and the hop one-shots; the others keep the old whoosh
{
  const mock = () => {
    const nodes = [];
    const param = (v = 0) => ({ value: v, log: [], setTargetAtTime(x) { this.log.push(x); this.value = x; }, setValueAtTime(x) { this.value = x; }, exponentialRampToValueAtTime(x) { this.value = x; } });
    const node = (kind, extra = {}) => { const n = { kind, connect() { return this; }, start() {}, stop() {}, gain: param(1), frequency: param(440), Q: param(1), type: 'lowpass', ...extra }; nodes.push(n); return n; };
    const ac = { currentTime: 0, state: 'running', sampleRate: 8000, destination: node('dest'), createGain: () => node('gain'), createOscillator: () => node('osc', { type: 'sine' }), createBiquadFilter: () => node('filter'),
      createWaveShaper: () => node('shaper'), createBufferSource: () => node('buf', { buffer: null, loop: false, loopStart: 0 }), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }) };
    return { audio: { context: ac, muted: false, play() {} }, nodes };
  };
  const st = (o) => ({ rpm: 0.5, throttle: 1, drifting: false, vL: 0, boosting: false, gear: 1, speed: 80, ...o });
  const shots = (m) => m.nodes.filter((n) => n.kind === 'buf').length + m.nodes.filter((n) => n.kind === 'osc').length;
  const rm = mock(), rs = createCarSound(rm.audio, SOUND.roadster); rs.start();
  const hp = rm.nodes.filter((n) => n.kind === 'filter' && n.type === 'highpass')[0];
  assert.equal(hp.frequency.value, SOUND.roadster.jet.hp, 'the Roadster whoosh is high-passed at the jet profile frequency');
  rs.update(st({}), true);
  const before = shots(rm); rs.update(st({ boosting: true }), true); const afterOn = shots(rm); rs.update(st({ boosting: true }), true);
  assert.equal(afterOn - before, 2, 'the thrust opens with one valve thunk (a noise burst + a thump)'); assert.equal(shots(rm), afterOn, 'and not again while it burns');
  const gains = rm.nodes.filter((n) => n.kind === 'gain' && n.gain.log.includes(SOUND.roadster.jet.gain)); assert(gains.length === 1, 'the whoosh gain is the jet profile gain 0.16');
  rs.update(st({}), true); rs.update(st({ boosting: true }), true); assert.equal(shots(rm) - afterOn, 2, 'a new thrust thunks again');
  const s0 = shots(rm); rs.hop(); assert.equal(shots(rm) - s0, 2, 'hop(): a hiss and a thud'); rs.cushion(); assert.equal(shots(rm) - s0, 3, 'cushion(): a hiss'); rs.land(6.2); assert.equal(shots(rm) - s0, 5, 'land(v): a thud and a puff');
  for (const profile of [null, SOUND.truck, SOUND.lada]) {
    const m = mock(), s = createCarSound(m.audio, profile); s.start(); s.update(st({}), true); const b = shots(m); s.update(st({ boosting: true }), true); s.update(st({ boosting: true }), true);
    assert.equal(shots(m), b, 'the other cars have no valve thunk'); assert(m.nodes.some((n) => n.kind === 'gain' && n.gain.log.includes(0.09)), 'and the old whoosh gain 0.09');
    assert(m.nodes.filter((n) => n.kind === 'filter' && n.type === 'highpass')[0].frequency.value === 1200, 'at the old 1200 Hz');
  }
}
console.log('PASS hop: peak 1.24 m / 0.8 s ballistic, soft cushioned landing, tank cost + gate, edge + buffer + cooldown, air rules, bin cleared / wall stops, coupe-truck-lada identical to ' + BASE_COMMIT + (Base ? '' : ' (SKIPPED: no git)'));
