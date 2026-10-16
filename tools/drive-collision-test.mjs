// Deterministic driving regressions against the real spatial physics and handling.
import assert from 'node:assert/strict';
import { Physics } from '../src/core/physics.js';
import { createHandling } from '../src/world/drive/handling.js';
import { carContact } from '../src/world/drive/collision.js';
import { SPEC } from '../src/world/drive/model.js';

const input = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false };
function world() {
  const physics = new Physics(() => 0);
  const L = { WORLD: { play: {} }, inPlay: () => true, heightAt: () => 0, insideBuilding: () => false };
  const car = createHandling({ physics, L, services: {} }); car.reset(0, 0, 0);
  return { physics, car };
}
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }
function run(car, seconds, dt = 1 / 60, controls = input) {
  const events = [];
  for (let t = 0; t < seconds - 1e-8; t += dt) { car.step(dt, controls); events.push(...car.events); }
  assert([car.x, car.z, car.yaw, car.vx, car.vz, car.impactSpin].every(Number.isFinite));
  return events;
}
for (const dt of [1 / 144, 1 / 60, 1 / 30, 0.1]) {
  check(`nitro-speed thin wall cannot be tunnelled at dt=${dt}`, () => {
    const { physics, car } = world(); const wall = physics.addBox(0, 9, 40, 0.12, 0, 0, 5);
    car.vz = 66; const events = run(car, 0.5, dt);
    assert(car.z < 6.84, `crossed wall: ${car.z}`);
    assert(!carContact(car, SPEC, wall), 'still penetrates wall');
    assert(events.some(e => e.type === 'hit' && e.v > 30));
    assert(Math.abs(car.impactSpin) < 0.01, 'centred impact invented spin');
  });
}
check('reverse collision stops rear bumper', () => {
  const { physics, car } = world(); physics.addBox(0, -6, 20, 0.15, 0, 0, 3);
  car.vz = -9; assert(run(car, 1).some(e => e.type === 'hit')); assert(car.z > -3.9);
});
check('off-centre pole contact spins the body and reports local damage point', () => {
  const { physics, car } = world(); physics.addCylinder(0.72, 7, 0.15, 0, 8);
  car.vz = 22; const events = run(car, 0.4);
  assert(events.some(e => e.type === 'hit' && e.localX > 0.4));
  assert(Math.abs(car.yaw) > 0.03, `no angular response: ${car.yaw}`);
});
check('glancing wall impact preserves sliding motion', () => {
  const { physics, car } = world(); physics.addBox(3, 0, 0.15, 80, 0, 0, 5);
  car.vx = 8; car.vz = 20; car.yaw = 0.25;
  run(car, 0.5); assert(car.z > 6); assert(car.x < 2.2);
});
check('parked vehicle is solid and stacked contacts stay finite', () => {
  const { physics, car } = world();
  physics.addBox(0, 7, 1.9, 4.4, 0, 0, 1.6); physics.addBox(-2.4, 5, 0.15, 20, 0, 0, 4);
  car.vz = 35; run(car, 2, 1 / 30, { ...input, thr: 1 }); assert(car.z < 2.8);
});
check('moving traffic transfers relative impact and receives hit callback', () => {
  const { physics, car } = world(); let hits = 0;
  const truck = { cx: 0, cz: 4, w: 2, d: 4, rotY: Math.PI, y0: 0, y1: 2, vx: 0, vz: -12, onCarHit: () => hits++ };
  physics.addDynamic(() => [truck]); physics.refreshDynamic();
  const events = run(car, 0.1); assert(hits > 0); assert(car.vz < -1); assert(events.some(e => e.v >= 12));
});
check('overhead bridge and low pavement do not block the car', () => {
  const { physics, car } = world(); physics.addBox(0, 4, 20, 2, 0, 5, 6); physics.addWalkBox(0, 3, 20, 2, 0, 0.12);
  car.vz = 15; assert.equal(run(car, 0.5).length, 0); assert(car.z > 6);
});
check('zero-time updates and reset cannot leave NaNs or residual spin', () => {
  const { car } = world(); car.step(0, input); assert(Number.isFinite(car.aLong));
  car.impactSpin = 8; car.reset(10, 10, 0); assert.equal(car.impactSpin, 0); assert.equal(car.events.length, 0);
});
console.log(`Collision regressions: ${checks} passed`);
