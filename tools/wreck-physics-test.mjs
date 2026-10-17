import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Physics } from '../src/core/physics.js';
import { createKnock } from '../src/core/knock.js';
import { getCarWrecks } from '../src/world/drive/wrecks.js';
import { bindCarImpact, bindParkedImpact } from '../src/world/traffic/impact.js';
import { ARCH } from '../src/world/traffic/fleetdata.js';
import { createSim } from '../src/world/traffic/sim.js';

const physics = new Physics(() => 0), scene = new THREE.Scene();
const ctx = { physics, services: {}, mat: { toon: () => new THREE.MeshBasicMaterial({ vertexColors: true }) },
  add: o => scene.add(o), onUpdate() {} };
const wrecks = await getCarWrecks(ctx), a = ARCH.sedan;
function car(x, z) {
  const r = { kind: 'sedan', x, y: .03, z, c: 1, s: 0 };
  const b = physics.addBox(x, z + (a.front + a.rear) / 2, a.wid, a.len, 0, 0, a.hgt);
  return { r, b, source: bindParkedImpact(b, r, a, wrecks) };
}
const target = car(0, 0);
target.source.applyCarImpulse(0, 14000, .65, -2.28);
assert(target.r.wrecked); assert(!physics.items.includes(target.b), 'old parked collider removed');
assert(Math.abs(target.r.wreckBody.linvel().z - 10) < .01, 'impulse / mass changes velocity');
assert(Math.abs(target.r.wreckBody.angvel().y) > .5, 'off-centre impulse produces spin');
for (let i = 0; i < 120; i++) wrecks.step(1 / 120);
assert(target.r.z > 5, 'struck car moves several metres');
physics.refreshDynamic();
assert(physics._dynItems.some(b => b.source.record === target.r && Math.abs(b.cz - target.r.z) < 1), 'collision proxy follows car');
// Another strike wakes an existing body rather than creating another car.
const before = target.r.wreckBody.linvel().x;
target.r.wreckSource.applyCarImpulse(7000, 0, target.r.x, target.r.z);
assert(target.r.wreckBody.linvel().x > before + 4); assert.equal(wrecks.stats.cars, 1);
// CCD + nearby city solids stop a fast-moving wreck at a thin wall.
physics.addBox(30, 8, 12, .2, 0, 0, 3);
const wallCar = car(30, 0); wallCar.source.applyCarImpulse(0, 56000, 30, 0);
for (let i = 0; i < 360; i++) wrecks.step(1 / 120);
assert(wallCar.r.z < 6.1, 'wreck cannot tunnel through a wall');
// A knockable thing (core/knock.js) is a legal wreck target: its source has no record / spec, and the chain handler used to throw on that (unseen, inside Rapier's event drain), so a
// struck car bounced off a bench like off a wall and the bench stayed. The wreck must now knock it and drive on.
{
  const knock = createKnock(ctx), mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, .9, .6), new THREE.MeshBasicMaterial(), 1);
  mesh.setMatrixAt(0, new THREE.Matrix4().makeTranslation(-300, 0, 9)); mesh.computeBoundingSphere();
  const item = physics.addBox(-300, 9, 1.8, .6, 0, 0, .9);
  const bench = knock.register({ kind: 'bench', x: -300, z: 9, y: 0, mass: 45, h: .9, w: 1.8, d: .6, hitK: .25, item, parts: [{ mesh, index: 0 }] });
  assert(bench && item.source.applyCarImpulse && !item.source.record && !item.source.spec, 'a knock source has neither record nor spec');
  const errors = [], realError = console.error; console.error = (...a) => errors.push(a);
  const struck = car(-300, 0); struck.source.applyCarImpulse(0, 14000, -300, -2.28);
  for (let i = 0; i < 240; i++) { wrecks.step(1 / 120); knock.update(1 / 120); }
  console.error = realError;
  assert.deepEqual(errors, [], 'no error logged by the chain handler');
  assert(bench.state === 'fly' || bench.state === 'rest', `the bench was knocked by the wreck (state ${bench.state})`);
  assert(!physics.items.includes(item), 'its collider was removed');
  assert(struck.r.z > 9.5, `the wreck drove on past the bench instead of bouncing off it (z ${struck.r.z.toFixed(1)})`);
}
const pusher = car(60, 0), second = car(60, 8);
pusher.source.applyCarImpulse(0, 21000, 60, 0);
for (let i = 0; i < 240; i++) wrecks.step(1 / 120);
assert(second.r.wrecked && second.r.z > 9, 'chain contact moves the next parked car');
assert(second.r.damageState.rear > 0, 'chain contact damages the next parked car');
// Exercise the production lane simulation: a struck car leaves its lane and its
// rendered pose stays with Rapier rather than snapping back on the next AI tick.
const st = { lanes: [{ id: 'test', pts: [[100, -100], [100, 300]], len: 400, rank: 4, speed: 14, idx: 0, from: null, to: null, name: 'test' }],
  connectors: [], stopLines: [], junctions: [], busStops: [], signals: [], roads: [], wires: { pairs: [] } };
const sim = createSim(st, () => () => .5, { trams: false, preroll: 0 }); sim.advanceTo(0);
const vehicle = sim.vehicles[1], spec = vehicle.arch;
const record = vehicle.rec = { kind: vehicle.kind, x: vehicle.x, y: 0, z: vehicle.z, c: 1, s: 0 };
const moving = { cx: vehicle.x, cz: vehicle.z + (spec.front + spec.rear) / 2, rotY: 0, w: spec.wid, d: spec.len };
bindCarImpact(moving, vehicle, 0, record, spec, wrecks); moving.applyCarImpulse(14000, 0, vehicle.x, vehicle.z + 1);
assert(!vehicle.seg.veh.includes(vehicle), 'wreck stops blocking its former lane slot');
for (let i = 1; i <= 60; i++) { wrecks.step(1 / 60); sim.advanceTo(i / 60); }
assert(record.x > 105 && vehicle.x === record.x, 'AI cannot overwrite physical position');
sim.reset(); wrecks.step(1 / 60); assert.equal(record.wreckBody, null, 'retired traffic leaves no ghost physics body');
// Panels fly, tumble, land and expire; no unbounded body/mesh accumulation.
function panel() { const g = new THREE.BoxGeometry(1.2, .08, .35).toNonIndexed();
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(.4), 3)); return g; }
wrecks.shed({ geometry: panel(), zone: 'front-bumper' }, { x: -30, y: 1, z: 0, yaw: 0 });
let piece = scene.children.find(o => o.name === 'car-debris'); const first = piece.position.clone();
for (let i = 0; i < 30; i++) wrecks.step(1 / 120);
assert(piece.position.distanceTo(first) > .5 && piece.position.y > first.y, 'debris launches');
assert(Math.abs(piece.quaternion.x) > .01, 'debris tumbles');
for (let i = 0; i < 600; i++) wrecks.step(1 / 120);
assert(piece.position.y > -.15 && piece.position.y < .5, 'debris settles on ground');
for (let i = 0; i < 55; i++) wrecks.shed({ geometry: panel(), zone: 'rear-bumper' }, { x: -30, y: 1, z: 0, yaw: 0 });
assert.equal(wrecks.stats.debris, 48); assert.equal(scene.children.length, 48);
for (let i = 0; i < 200; i++) wrecks.step(.1);
assert.equal(wrecks.stats.debris, 0); assert.equal(scene.children.length, 0);
assert(wrecks.stats.scenery <= 512);
const evictedVehicle = sim.vehicles[1], evictedSpec = evictedVehicle.arch;
const evictedRecord = evictedVehicle.rec = { kind: evictedVehicle.kind, x: 190, y: 0, z: 0, c: 1, s: 0 };
const evictedBox = { cx: 190, cz: (evictedSpec.front + evictedSpec.rear) / 2, rotY: 0, w: evictedSpec.wid, d: evictedSpec.len };
bindCarImpact(evictedBox, evictedVehicle, 0, evictedRecord, evictedSpec, wrecks);
evictedBox.applyCarImpulse(0, 1000, 190, 0);
for (let i = 0; i < 28; i++) { const t = car(200 + 12 * i, 0); t.source.applyCarImpulse(0, 1000, t.r.x, t.r.z); }
assert.equal(wrecks.stats.cars, 24, 'car physics is capped');
const retiredBox = evictedRecord.wreckSource.staticBox;
assert(retiredBox && physics.items.includes(retiredBox), 'evicted car keeps a stationary collider');
sim.reset();
assert(!physics.items.includes(retiredBox), 'traffic reset removes evicted stationary wreck colliders');
const costs = [];
for (let i = 0; i < 240; i++) { const t = performance.now(); wrecks.step(1 / 60); costs.push(performance.now() - t); }
costs.sort((a,b)=>a-b);
console.log(`CPU-only 24-car yard: mean ${(costs.reduce((a,b)=>a+b,0)/costs.length).toFixed(3)} ms, p95 ${costs[Math.floor(costs.length*.95)].toFixed(3)} ms; proxies ${wrecks.stats.scenery}`);
wrecks.reset(); assert.deepEqual(wrecks.stats, { cars: 0, debris: 0, scenery: 0 });
console.log('PASS Rapier momentum, offset spin, repeat hits, moving proxies, thin walls, debris launch/settling/lifetime/caps and reset');
