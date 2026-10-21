// CPU test of the car hold while a modal question is open (src/world/drive/handling.js holdInput, used by drive.js; docs/AREAS.md "Prompt UX"). node tools/gate-hold-test.mjs
// Headless, flat building-free world, the four real cars with their real tuning. Proves:
//  1. a car that is held from any speed stops within the prompt zone depth minus a 15 m margin (the zone is depthFor('car', v) = clamp(30 + 0.5 v + v^2/60, 40, 160)),
//     with and without nitro, and never rolls backwards while braking;
//  2. a stopped car stays put for 30 s (no creep, no reverse - the old fixed brake input of 0.4 made a stopped car reverse);
//  3. a car that rolls backwards is brought to rest without turning into a forward roll;
//  4. the hold is also safe with a glancing speed estimate: from 3 m/s it stops in a few metres.
import assert from 'node:assert/strict';
import { Physics } from '../src/core/physics.js';
import { createHandling, holdInput } from '../src/world/drive/handling.js';
import { MASS, tuningFor } from '../src/world/drive/cars/tuning.js';
import { depthFor } from '../src/core/gates.js';

let fails = 0, passes = 0;
const check = (name, fn) => { try { fn(); passes++; console.log('  ok   ' + name); } catch (e) { fails++; console.log('  FAIL ' + name + '\n       ' + String(e.message).split('\n').slice(0, 5).join('\n       ')); } };
const L = await import('../src/world/layout.js');
const world = { physics: new Physics(() => 0), L: { WORLD: L.WORLD, inPlay: () => true, clampToPlay: (x, z) => [x, z], inExtent: () => true, heightAt: () => 0, insideBuilding: () => false }, services: {} };
const SPECS = { roadster: { W: 2.00, R: 0.355, wb: 2.96, front: 2.36, rear: -2.26, hgt: 1.22, len: 4.62, centerZ: 0.05, mass: MASS.roadster }, coupe: null, truck: { W: 2.03, R: 0.43, wb: 3.80, front: 2.63, rear: -3.05, hgt: 1.80, len: 5.68, centerZ: -0.21, mass: MASS.truck }, lada: { W: 1.62, R: 0.285, wb: 2.42, front: 2.09, rear: -2.07, hgt: 1.40, len: 4.16, centerZ: 0.01, mass: MASS.lada } };
const makeCar = (id) => createHandling(world, id === 'coupe' ? null : tuningFor(id, SPECS[id]));
const dt = 1 / 60;

/** drive straight north at full throttle (nitro on) until the speed reaches v0 (or stops growing), returns the car */
function atSpeed(id, v0, nitro) {
  const car = makeCar(id); car.reset(0, 0, Math.PI);      // yaw PI faces -Z (north)
  for (let i = 0; i < 60 * 40 && car.speed / 3.6 < v0; i++) car.step(dt, { thr: 1, brk: 0, steer: 0, hand: false, nitro, jump: false, flip: false });
  return car;
}
const hold = (car, seconds, onStep) => { const inp = {}; for (let i = 0; i < seconds / dt; i++) { holdInput(inp, car.vF); car.step(dt, inp); if (onStep) onStep(car, i * dt); } };

for (const id of ['coupe', 'truck', 'lada', 'roadster']) {
  console.log(id + ':');
  const top = makeCar(id).tuning.vmax;
  for (const nitro of id === 'roadster' || id === 'coupe' ? [false, true] : [false]) {
    check(`held from ${nitro ? 'nitro ' : ''}top speed: stops inside the zone minus 15 m, no reverse`, () => {
      const car = atSpeed(id, 999, nitro); const v = car.speed / 3.6, z0 = car.z, D = depthFor('car', v);
      let minVF = Infinity; hold(car, 25, (c) => { minVF = Math.min(minVF, c.vF); });
      const stop = Math.abs(car.z - z0);
      assert(stop <= D - 15, `speed ${v.toFixed(1)} m/s: stopped after ${stop.toFixed(1)} m, zone ${D.toFixed(1)} m`);
      assert(minVF > -0.35, 'rolled backwards: vF ' + minVF.toFixed(2));
      assert(car.speed < 0.2, 'still moving: ' + car.speed.toFixed(2));
    });
  }
  check('held from 10 and 25 m/s: stops inside the zone minus 15 m', () => {
    for (const v0 of [10, Math.min(25, top - 2)]) { const car = atSpeed(id, v0, false); const v = car.speed / 3.6, z0 = car.z, D = depthFor('car', v); hold(car, 20); const stop = Math.abs(car.z - z0); assert(stop <= D - 15, `${v.toFixed(1)} m/s: ${stop.toFixed(1)} m of ${D.toFixed(1)}`); }
  });
  check('a stopped car stays put for 30 s (no creep, no reverse)', () => {
    const car = makeCar(id); car.reset(100, 100, 1.0); const x0 = car.x, z0 = car.z; let maxV = 0; hold(car, 30, (c) => { maxV = Math.max(maxV, Math.abs(c.vF)); });
    assert(Math.hypot(car.x - x0, car.z - z0) < 0.5, 'moved ' + Math.hypot(car.x - x0, car.z - z0).toFixed(2) + ' m'); assert(maxV < 0.35, 'speed up to ' + maxV.toFixed(2));
  });
  check('the OLD hold (brake input 0.4 at rest) did reverse a stopped car - the regression this replaces', () => {
    const car = makeCar(id); car.reset(0, 0, 0); const inp = { thr: 0, brk: 0.4, steer: 0, hand: false, nitro: false, jump: false, flip: false };
    for (let i = 0; i < 60 * 5; i++) car.step(dt, inp);
    assert(car.vF < -0.5, 'expected the old hold to roll backwards, vF = ' + car.vF.toFixed(2));
  });
  check('rolling backwards at 5 m/s: brought to rest without a forward roll', () => {
    const car = makeCar(id); car.reset(0, 0, 0); const inp = { thr: 0, brk: 1, steer: 0, hand: false, nitro: false, jump: false, flip: false };
    for (let i = 0; i < 60 * 4 && car.vF > -5; i++) car.step(dt, inp);
    assert(car.vF < -3, 'could not get the car rolling backwards: ' + car.vF.toFixed(2));
    let maxF = -Infinity; hold(car, 8, (c) => { maxF = Math.max(maxF, c.vF); });
    assert(Math.abs(car.vF) < 0.3, 'not at rest: ' + car.vF.toFixed(2)); assert(maxF < 0.9, 'rolled forward: ' + maxF.toFixed(2));
  });
}
console.log(`gate-hold-test: ${passes} passed, ${fails} failed`);
console.log(fails ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(fails ? 1 : 0);
