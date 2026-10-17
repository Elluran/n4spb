// Headless regression for the knockable street furniture (core/knock.js + world/lib/knock-inst.js): the real Physics, the real createHandling (the three garage masses), the real
// createKnock and the real knockInstances against FAKE instances (InstancedMesh of a box, MeshBasicMaterial). No GPU.  npm run knock
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Physics } from '../src/core/physics.js';
import { createHandling } from '../src/world/drive/handling.js';
import { SPEC } from '../src/world/drive/model.js';
import { MASS, tuningFor } from '../src/world/drive/cars/tuning.js';
import { createKnock } from '../src/core/knock.js';
import { knockInstances } from '../src/world/lib/knock-inst.js';
import { LOD } from '../src/core/lod.js';
import { buildNDProxy } from '../src/core/ndproxy.js';

const input = { thr: 0, brk: 0, steer: 0, hand: false, nitro: false };
const WATER = { x0: 30, x1: 60, bed: -4.6, level: -3.2 };
const inWater = (x) => x >= WATER.x0 && x <= WATER.x1;
const BOX = new THREE.BoxGeometry(0.5, 0.9, 0.5), MAT = new THREE.MeshBasicMaterial();
const hyp = (a, b) => Math.sqrt(a * a + b * b);
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS', name); }

/** a stub context: the real Physics + a car of the given garage id + the real createKnock; sparks and audio calls are recorded */
function world(id = 'coupe', { audio = false } = {}) {
  const L = { WORLD: { play: {} }, inPlay: () => true, insideBuilding: () => false, heightAt: (x) => (inWater(x) ? WATER.bed : 0), waterLevelAt: (x) => (inWater(x) ? WATER.level : null) };
  const physics = new Physics(L.heightAt), updates = [], scene = new THREE.Scene(), sparks = [], sounds = [];
  const ctx = { physics, L, services: {}, onUpdate: (f) => updates.push(f), addStatic: (o) => scene.add(o), add: (o) => scene.add(o), noOutline: (o) => o };
  const car = createHandling(ctx, tuningFor(id, { ...SPEC, mass: MASS[id] })); car.reset(0, 0, 0);
  ctx.drive = { active: true, car, fx: { sparks: (...a) => sparks.push(a) } };
  if (audio) ctx.audio = { play: (n, o) => sounds.push({ n, o }) };
  const knock = createKnock(ctx); ctx.knock = knock;
  return { ctx, physics, car, knock, updates, scene, sparks, sounds, L };
}
function mesh(n, at = () => [0, 0, 0]) {
  const m = new THREE.InstancedMesh(BOX, MAT, n);
  for (let i = 0; i < n; i++) { const [x, y, z] = at(i); m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, z)); }
  m.computeBoundingSphere(); return m;
}
/** a knockable fake: one instance at (x, y, z) + its collider + the record; def = the table row */
function thing(w, def, x, z, { y = 0, parts = null, shape = def.r ? 'cyl' : 'box', rotY = 0 } = {}) {
  const m = mesh(1, () => [x, y + (def.originY || 0), z]);
  const item = shape === 'cyl' ? w.physics.addCylinder(x, z, def.r, y, y + def.h) : w.physics.addBox(x, z, def.w, def.d, rotY, y, y + def.h);
  const rec = w.knock.register({ ...def, x, z, y, rotY, item, parts: parts || [{ mesh: m, index: 0 }] });
  return { m, item, rec };
}
/** step the car and the knock updates; returns the hit events (type, v, hitK of the obstacle's source) */
function run(w, seconds, dt = 1 / 60, controls = input) {
  const events = [];
  for (let t = 0; t < seconds - 1e-8; t += dt) {
    w.car.step(dt, controls);
    for (const e of w.car.events) events.push({ type: e.type, v: e.v, k: e.obstacle && e.obstacle.source ? e.obstacle.source.hitK : null });
    for (const u of w.updates) u(dt);
  }
  assert([w.car.x, w.car.z, w.car.vx, w.car.vz].every(Number.isFinite));
  return events;
}
const idle = (w, seconds) => { for (let t = 0; t < seconds; t += 1 / 60) for (const u of w.updates) u(1 / 60); };
const speedKmh = (car) => hyp(car.vx, car.vz) * 3.6;
const matrixOf = (m, i) => new THREE.Matrix4().fromArray(m.instanceMatrix.array, i * 16);
const posOf = (m, i) => new THREE.Vector3().setFromMatrixPosition(matrixOf(m, i));
const scaleOf = (m, i) => new THREE.Vector3().setFromMatrixScale(matrixOf(m, i));
const inGrid = (physics, item) => physics.items.includes(item) || [...physics.grid.values()].some((a) => a.includes(item));

// the table values of the packages B / E / F1 / G1 (plan section 5): a fake instance per row guards them
const TABLE = {
  bench: { kind: 'bench', mass: 45, h: 0.9, w: 1.8, d: 0.6, hitK: 0.25 }, benchGranite: { kind: 'bench', mass: 420, h: 0.9, w: 2.0, d: 0.6, hitK: 0.6, minDv: 0.8 },
  binCast: { kind: 'bin', mass: 30, h: 0.78, r: 0.26, hitK: 0.15, metal: true }, binSteel: { kind: 'bin', mass: 14, h: 0.88, r: 0.2, hitK: 0.12, metal: true }, binCube: { kind: 'bin', mass: 70, h: 0.64, r: 0.3, hitK: 0.2 },
  pot: { kind: 'pot', mass: 10, h: 0.5, r: 0.21, hitK: 0.08, minDv: 0.4 }, urn: { kind: 'urn', mass: 110, h: 0.95, r: 0.4, hitK: 0.25, metal: true, minDv: 0.8 },
  tub: { kind: 'tub', mass: 250, h: 2.7, r: 0.5, hitK: 0.3, minDv: 1.0 }, planter: { kind: 'planter', mass: 450, h: 0.5, r: 0.62, hitK: 0.35, minDv: 1.2 },
  rack: { kind: 'rack', mass: 25, h: 0.75, w: 1.5, d: 0.4, anchored: 8, hitK: 0.1, metal: true }, postbox: { kind: 'postbox', mass: 70, h: 1.28, w: 0.42, d: 0.36, anchored: 15, hitK: 0.3, metal: true },
  cabinet: { kind: 'cabinet', mass: 120, h: 1.33, w: 0.66, d: 0.4, anchored: 20, hitK: 0.35, metal: true }, cart: { kind: 'cart', mass: 110, h: 2.3, w: 1.3, d: 1.0, hitK: 0.3 },
  lampA: { kind: 'lamp', mass: 500, h: 7.6, r: 0.30, anchored: 22, hitK: 0.6, metal: true }, lampS: { kind: 'lamp', mass: 280, h: 9.2, r: 0.25, anchored: 20, hitK: 0.55, metal: true },
  lampD: { kind: 'lamp', mass: 140, h: 5.6, r: 0.17, anchored: 16, hitK: 0.45, metal: true }, lampL: { kind: 'lamp', mass: 160, h: 4.45, r: 0.20, anchored: 16, hitK: 0.5, metal: true },
  bollard: { kind: 'bollard', mass: 60, h: 0.85, r: 0.11, anchored: 30, hitK: 0.4, metal: true }, stopBench: { kind: 'bench', mass: 35, h: 0.5, w: 1.6, d: 0.4, hitK: 0.2 },
  stopBin: { kind: 'bin', mass: 14, h: 0.78, r: 0.17, hitK: 0.12, metal: true },
};
/** a car rolling at `kmh` toward a thing straight ahead on +z (no throttle: the contact speed is a little lower, measured per run) */
function drive(w, kmh) { w.car.vz = kmh / 3.6; }

check('1 register(): Dynamic usage, userData, item.source, bounds +30 once, byKind, invalid parts -> null without throwing', () => {
  const w = world(), m = mesh(2, (i) => [i * 3, 0, 20]);
  const before = m.boundingSphere.radius;
  const a = thing(w, TABLE.bench, 0, 20, { parts: [{ mesh: m, index: 0 }] });
  assert.equal(m.instanceMatrix.usage, THREE.DynamicDrawUsage); assert(m.userData.knock);
  assert(a.item.source && a.item.source.knock === a.rec && typeof a.item.source.applyCarImpulse === 'function' && a.item.source.hitK === 0.25);
  assert(Math.abs(m.boundingSphere.radius - (before + 30)) < 1e-6, 'radius +30 m once');
  const b = thing(w, TABLE.bench, 3, 20, { parts: [{ mesh: m, index: 1 }] });
  assert(b.rec && Math.abs(m.boundingSphere.radius - (before + 30)) < 1e-6, 'a second register on the same mesh does not grow it again');
  assert.deepEqual({ ...w.knock.stats.byKind }, { bench: 2 }); assert.equal(w.knock.stats.registered, 2); assert.equal(w.knock.list.length, 2);
  const un = new THREE.InstancedMesh(BOX, MAT, 1);                                      // never had its bounds computed: register computes them
  w.knock.register({ kind: 'pot', x: 0, z: 0, mass: 5, h: 0.5, r: 0.2, parts: [{ mesh: un, index: 0 }] }); assert(un.boundingSphere && un.boundingSphere.radius > 30);
  for (const bad of [null, undefined, {}, { x: 0, z: 0, parts: [] }, { x: 0, z: 0, parts: [null] }, { x: 0, z: 0, parts: [{ mesh: m, index: 7 }] }, { x: 0, z: 0, parts: [{ mesh: m, index: -1 }] },
    { x: NaN, z: 0, parts: [{ mesh: m, index: 0 }] }, { x: 0, z: 0, parts: [{ mesh: {}, index: 0 }] }, { x: 0, z: 0, parts: 'nope' }]) assert.equal(w.knock.register(bad), null);
  assert.equal(w.knock.stats.registered, 3, 'invalid registrations leave no record');
});

check('2 table rows of the packages B / E / F1 / G1 register with the planned kind / mass / anchored', () => {
  const w = world(); let n = 0;
  for (const [row, def] of Object.entries(TABLE)) {
    for (let k = 0; k < 3; k++) { const t = thing(w, def, 100 + n * 4, 50 + k * 4); n++; assert(t.rec, row); assert.equal(t.rec.kind, def.kind); assert.equal(t.rec.mass, def.mass); assert.equal(t.rec.anchored, def.anchored || 0); assert.equal(t.rec.hitK, def.hitK); assert.equal(t.item.source.hitK, def.hitK); assert.equal(t.rec.state, 'stand'); }
  }
  const byKind = w.knock.stats.byKind;
  assert.equal(byKind.lamp, 12); assert.equal(byKind.bench, 9); assert.equal(byKind.bin, 12); assert.equal(byKind.bollard, 3); assert.equal(w.knock.stats.registered, Object.keys(TABLE).length * 3);
});

check('3 free things: a 14 kg bin and a 45 kg bench at 40 km/h are knocked, the collider is replaced by a drive-over rest box, the car keeps going', () => {
  for (const [row, z0] of [['binSteel', 6], ['bench', 6]]) {
    const w = world(), def = TABLE[row], t = thing(w, def, 0, z0), m0 = matrixOf(t.m, 0), items0 = w.physics.items.length;
    drive(w, 40); const v0 = speedKmh(w.car);
    const ev = run(w, 0.8);
    assert.equal(t.rec.state === 'stand', false, `${row} knocked`); assert(w.knock.stats.knocked >= 1);
    assert(!inGrid(w.physics, t.item), 'the old collider is out of the list and the grid');
    assert(ev.some((e) => e.k === def.hitK), 'the hit event carries the source hitK');
    assert(speedKmh(w.car) > 0.6 * v0, `${row}: the car keeps > 60 % of its speed (${speedKmh(w.car).toFixed(1)} of ${v0.toFixed(1)})`);
    idle(w, 4);
    assert.equal(t.rec.state, 'rest'); assert.equal(w.knock.stats.live, 0);
    assert(!matrixOf(t.m, 0).equals(m0), 'the instance moved');
    const m1 = matrixOf(t.m, 0); idle(w, 0.5); assert(matrixOf(t.m, 0).equals(m1), 'and settled');
    const rest = t.rec.item; assert(rest && w.physics.items.includes(rest) && rest !== t.item, 'a rest collider replaces the old one');
    assert(rest.y1 - Math.max(0, rest.y0 + 0.05) <= 0.42 + 1e-6, `rest top <= 0.42 (${rest.y1})`); assert.equal(rest.source, undefined);
    assert.equal(w.physics.items.length, items0, 'one collider out, one rest box in');
  }
});

check('4 the rest box is drive-over: the car crosses a thrown bench with no hit event', () => {
  const w = world(); const t = thing(w, TABLE.bench, 0, 40);
  w.knock.hit(0, 40, 40, 0, 1); idle(w, 4); assert.equal(t.rec.state, 'rest'); const rest = t.rec.item;
  assert(rest, 'rest box');
  w.car.reset(rest.cx, rest.cz - 12, 0); w.car.vz = 9;
  const ev = run(w, 2.4); assert(w.car.z > rest.cz + 2, `the car crossed the rest box (z ${w.car.z.toFixed(1)} vs ${rest.cz.toFixed(1)})`);
  assert.deepEqual(ev.filter((e) => e.type === 'hit'), [], 'no hit event on the lying bench');
  // the same for a lying lamp
  const w2 = world(); const lamp = thing(w2, TABLE.lampD, 0, 40); w2.knock.hit(0, 40, 40, 0, 1); idle(w2, 5);
  assert.equal(lamp.rec.state, 'rest'); const lb = lamp.rec.item; assert(lb.y1 <= 0.42 + 1e-6, `lying lamp top ${lb.y1}`);
  w2.car.reset(lb.cx, lb.cz - 12, 0); w2.car.vz = 9; assert.deepEqual(run(w2, 2.4).filter((e) => e.type === 'hit'), []);
});

check('5 anchored break speed uses the car speed BEFORE the impulse (armed flag): lamp 22 holds below, breaks above; all three garage masses', () => {
  for (const id of ['coupe', 'truck', 'lada']) {
    const out = [];
    for (const kmh of [18, 22, 24, 30, 45]) {
      const w = world(id), t = thing(w, TABLE.lampA, 0, 5);
      drive(w, kmh); const ev = [];
      let at = 0;                                                                         // the speed just before the first contact
      for (let s = 0; s < 4 * 60; s++) {
        const before = speedKmh(w.car); w.car.step(1 / 60, input);
        if (!at && w.car.events.length) at = before;
        for (const e of w.car.events) ev.push(e); for (const u of w.updates) u(1 / 60);
      }
      assert(at > 0, `${id} ${kmh}: contact`);
      out.push({ kmh, at: +at.toFixed(1), state: t.rec.state, end: +speedKmh(w.car).toFixed(1) });
      if (at < 22 - 1.5) {                                                                // clearly below the break speed: a wall that wobbles
        assert.equal(t.rec.state, 'stand', `${id} ${kmh}: holds (${JSON.stringify(out.at(-1))})`); assert(w.physics.items.includes(t.item));
        assert(speedKmh(w.car) < 1, `${id} ${kmh}: the car stops on it`);
      } else if (at > 22 + 1.5) {
        assert.notEqual(t.rec.state, 'stand', `${id} ${kmh}: breaks (${JSON.stringify(out.at(-1))})`); assert(!w.physics.items.includes(t.item));
        assert(w.car.z > 8, `${id} ${kmh}: the car drives on past the lamp (z ${w.car.z.toFixed(1)})`);
      }
      if (id === 'coupe' && kmh <= 24) assert.equal(t.rec.state, 'stand', `coupe ${kmh} holds`);
      if (id === 'coupe' && kmh >= 30) assert.notEqual(t.rec.state, 'stand', `coupe ${kmh} breaks (the old post-impulse test held it at 30)`);
    }
    if (process.env.KNOCK_VERBOSE) console.log('  ' + id, JSON.stringify(out));
    assert(out.some((o) => o.state === 'stand') && out.some((o) => o.state !== 'stand'), `${id}: both outcomes occur ${JSON.stringify(out)}`);
  }
  // a 60 kg bollard, break speed 30
  for (const [kmh, breaks] of [[28, false], [40, true]]) {
    const w = world(), t = thing(w, TABLE.bollard, 0, 5); drive(w, kmh); run(w, 3);
    assert.equal(t.rec.state !== 'stand', breaks, `bollard ${kmh} km/h`);
  }
  // a hold wobbles (the record keeps its state, a wobble object, the instance tilts) and then settles
  const w = world(), t = thing(w, TABLE.lampA, 0, 5); drive(w, 16); const m0 = matrixOf(t.m, 0);
  let wobbled = false; for (let s = 0; s < 120; s++) { w.car.step(1 / 60, input); for (const u of w.updates) u(1 / 60); if (t.rec.wobble && !matrixOf(t.m, 0).equals(m0)) wobbled = true; }
  assert(wobbled, 'the post wobbled'); idle(w, 3); assert.equal(t.rec.wobble, null); assert(matrixOf(t.m, 0).equals(m0), 'and stands again exactly'); assert.equal(t.rec.state, 'stand');
});

check('6 items: [] removes every collider of the object', () => {
  const w = world(), m = mesh(1, () => [0, 0, 20]);
  const a = w.physics.addBox(0, 20, 2.4, 0.4, 0, 0, 2.6), b = w.physics.addBox(-1, 20, 0.2, 1.2, 0, 0, 2.6), c = w.physics.addCylinder(1, 20, 0.2, 0, 2.6);
  const rec = w.knock.register({ kind: 'shelter', x: 0, z: 20, y: 0, mass: 350, h: 2.6, w: 3, d: 1.4, hitK: 0.6, items: [a, b, c], parts: [{ mesh: m, index: 0 }] });
  assert(a.source && b.source && c.source && a.source === b.source, 'every collider carries the source');
  const n = w.physics.items.length; w.knock.hit(0, 20, 50, 0, 1);
  for (const it of [a, b, c]) assert(!inGrid(w.physics, it), 'collider removed'); assert.equal(w.physics.items.length, n - 3);
  idle(w, 5); assert.equal(rec.state, 'rest'); assert.equal(w.physics.items.length, n - 3 + 1, 'one rest box replaces them');
  assert.equal(rec.items.length, 1);
});

check('7 floor: a bench thrown on a deck settles ON the deck; a lamp and a bench thrown into open water are lost (hidden, no rest box, no sparks)', () => {
  const w = world(), deck = w.physics.addWalkBox(45, 0, 30, 6, 0, 0.3);                   // a bridge over the canal: the terrain under it is the bed
  assert.equal(w.L.heightAt(45, 0), WATER.bed);
  const bench = thing(w, TABLE.bench, 36, 0, { y: 0.3 }); w.knock.hit(36, 0, 40, 1, 0); idle(w, 5);
  assert.equal(bench.rec.state, 'rest'); const bx = bench.rec.item;
  assert(Math.abs(bx.y0 - 0.25) < 1e-6, `the rest box stands on the deck (y0 ${bx.y0})`); assert(bx.cx > 36 && bx.cx < 60, 'inside the deck');
  assert(Math.abs(posOf(bench.m, 0).y - 0.3) < 0.9, 'the instance is on the deck, not on the bed');
  void deck;
  // a lamp at the quay edge toppling into the water; a bench flying into it
  const lamp = thing(w, { ...TABLE.lampD, metal: false }, 29.6, 20), bench2 = thing(w, TABLE.bench, 29.5, 30);
  const sparks0 = w.sparks.length, items0 = w.physics.items.length;
  w.knock.hit(29.6, 20, 40, 1, 0); w.knock.hit(29.5, 30, 40, 1, 0); idle(w, 6);
  assert.equal(lamp.rec.state, 'lost'); assert.equal(bench2.rec.state, 'lost');
  for (const t of [lamp, bench2]) { assert.equal(t.rec.item, null); assert.equal(scaleOf(t.m, 0).length(), 0, 'hidden'); }
  assert.equal(w.physics.items.length, items0 - 2, 'colliders removed, no rest boxes'); assert.equal(w.sparks.length, sparks0, 'no sparks (the lamp is not metal)');
  assert.equal(w.knock.stats.live, 0);
  // over land with no deck the same bench stays on the terrain level it stood on
  const land = thing(w, TABLE.bench, 10, 60, { y: 0.12 }); w.knock.hit(10, 60, 40, 0, 1); idle(w, 5);
  assert.equal(land.rec.state, 'rest'); assert(Math.abs(land.rec.item.y0 - 0.07) < 1e-6, `pavement level kept (${land.rec.item.y0})`);
});

check('8 hide parts are zero-scaled at the knock (not by a wobble); {obj} parts get matrix + matrixWorldNeedsUpdate', () => {
  const w = world(), body = mesh(1, () => [0, 0, 20]), glow = mesh(1, () => [0, 0, 20]), pool = mesh(1, () => [0, 0.02, 20]);
  const obj = new THREE.Group(); obj.position.set(0, 2.5, 20); obj.updateMatrix(); obj.matrixAutoUpdate = true;
  const item = w.physics.addCylinder(0, 20, 0.3, 0, 3);
  const rec = w.knock.register({ kind: 'lamp', x: 0, z: 20, y: 0, mass: 500, h: 7.6, r: 0.3, anchored: 22, hitK: 0.6, metal: true, item,
    parts: [{ mesh: body, index: 0 }, { mesh: glow, index: 0, hide: true }, { mesh: pool, index: 0, hide: true }, { obj }] });
  assert.equal(obj.matrixAutoUpdate, false, 'the object is driven by its matrix now'); assert(obj.userData.knock);
  // a slow bump wobbles: the glow follows, it does not vanish
  item.source.onCarHit(3, { x: 0, z: 19.5, nx: 0, nz: -1 }); for (let i = 0; i < 6; i++) w.updates[0](1 / 60);
  assert(scaleOf(glow, 0).length() > 1.5, 'the glow stays during a wobble'); idle(w, 3);
  const o0 = obj.matrix.clone(); obj.matrixWorldNeedsUpdate = false;
  w.knock.hit(0, 20, 50, 0, 1); w.updates[0](1 / 60);
  assert.equal(scaleOf(glow, 0).length(), 0, 'glow hidden'); assert.equal(scaleOf(pool, 0).length(), 0, 'pool hidden'); assert(scaleOf(body, 0).length() > 1.5, 'the body is not');
  assert(!obj.matrix.equals(o0), 'the object matrix was written'); assert.equal(obj.matrixWorldNeedsUpdate, true);
  idle(w, 5); assert.equal(rec.state, 'rest'); assert.equal(scaleOf(glow, 0).length(), 0, 'still hidden at rest');
  const lying = new THREE.Vector3().setFromMatrixPosition(obj.matrix);                  // the 2.5 m point of the pole lies 2.5 m along the throw (+z), near the ground
  assert(Math.abs(lying.z - (20 + 2.5)) < 0.8 && lying.y < 1.2, `the object part lies with the pole (${lying.toArray().map((v) => v.toFixed(2))})`);
});

check('9 listen(): called once per knock with the record and the body; a throwing listener breaks nothing', () => {
  const w = world(), calls = [], origErr = console.error; console.error = () => {};
  w.knock.listen(() => { throw new Error('boom'); }); w.knock.listen((r, b) => calls.push([r, b])); w.knock.listen('not a function');
  const a = thing(w, TABLE.bench, 0, 20), b = thing(w, TABLE.binSteel, 5, 20), c = thing(w, TABLE.lampA, 10, 20);
  w.knock.hit(0, 20, 40, 0, 1); w.knock.hit(5, 20, 40, 0, 1);
  assert.equal(calls.length, 2); assert.equal(calls[0][0], a.rec); assert.equal(calls[1][0], b.rec);
  assert(Number.isFinite(calls[0][1].dx) && Math.abs(hyp(calls[0][1].dx, calls[0][1].dz) - 1) < 1e-6, 'the body carries the throw direction');
  assert.equal(a.rec.state, 'fly'); assert.equal(c.rec.state, 'stand'); assert.equal(w.knock.hit(999, 999, 40, 1, 0, 'column'), null, 'kind filter finds nothing');
  assert.equal(w.knock.hit(0, 0, 40, 0, 1, 'lamp'), c.rec, 'kind filter');
  console.error = origErr;
  // onKnock per record runs before the listeners
  const w2 = world(), seq = []; w2.knock.listen(() => seq.push('listener'));
  const m = mesh(1, () => [0, 0, 5]); w2.knock.register({ kind: 'pot', x: 0, z: 5, mass: 10, h: 0.5, r: 0.2, onKnock: () => seq.push('onKnock'), parts: [{ mesh: m, index: 0 }] }); w2.knock.hit(0, 5);
  assert.deepEqual(seq, ['onKnock', 'listener']);
});

check('10 knockInstances: with ctx.knock Dynamic cell meshes + registerLOD + records; without ctx.knock ONE Static mesh per part and nothing registered (R1)', () => {
  const geo = BOX.clone(), geo2 = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const spots = [{ x: 10, y: 0.12, z: 10, rotY: 0.5 }, { x: 500, y: 0, z: 10, rotY: 0 }, { x: 20, y: 0.12, z: 30, rotY: 1, s: 1.2 }, { x: -400, y: 0, z: -5, rotY: 0 }, { x: 30, y: 0.12, z: 40, rotY: 0 }];
  const parts = [{ geo, mat: MAT, far: 320 }, { geo: geo2, mat: MAT, shadow: false, noOutline: true, hide: true, far: 500, when: (s, i) => i !== 3 }];
  // without ctx.knock
  const bare = world(); delete bare.ctx.knock;
  const r0 = knockInstances(bare.ctx, { name: 'lamps', parts, spots, far: 300 });
  assert.equal(r0.meshes.length, 2); assert.equal(r0.records.length, spots.length); assert(r0.records.every((r) => r === null));
  assert(r0.meshes.every((m) => m.instanceMatrix.usage === THREE.StaticDrawUsage && !LOD.of(m) && !m.userData.knock), 'static, unregistered, untouched');
  assert.equal(r0.meshes[0].count, 5); assert.equal(r0.meshes[1].count, 4, 'the `when` filter');
  // with ctx.knock
  const w = world(); const poolMesh = mesh(5, (i) => [i, 0, 0]);
  const items = spots.map((s) => w.physics.addCylinder(s.x, s.z, 0.2, s.y, s.y + 3));
  const r = knockInstances(w.ctx, { name: 'lamps', parts, spots, items, far: 300, cell: 384, extraParts: (i) => [{ mesh: poolMesh, index: i, hide: true }],
    rec: (s, i) => ({ kind: 'lamp', mass: 500, h: 7.6, r: 0.3, anchored: 22, hitK: 0.6, metal: true, tag: i }) });
  assert.equal(r.records.length, 5); assert(r.records.every(Boolean));
  const cellsUsed = new Set(spots.map((s) => Math.floor(s.x / 384) + ',' + Math.floor(s.z / 384))); assert.equal(cellsUsed.size, 3);
  assert.equal(r.meshes.length, 5, 'body per cell (3) + glow per cell that has one (2)');
  for (const m of r.meshes) {
    assert.equal(m.instanceMatrix.usage, THREE.DynamicDrawUsage); assert(m.userData.knock); assert(/^lamps(-\d)?\|-?\d+,-?\d+$/.test(m.name), m.name);
    assert(LOD.of(m), 'registerLOD'); assert(m.userData.lodFar === 320 || m.userData.lodFar === 500); assert(m.parent === w.scene, 'loose: never attached to a sector group');
    assert(m.boundingSphere.radius >= 30, 'bounds inflated');
    assert(LOD.of(m).r >= m.boundingSphere.radius - 1e-6, 'the LOD circle includes the throw reach (registerLOD runs after register)');
  }
  // the order is deterministic (cells sorted) and every record's parts line up with its spot
  for (let i = 0; i < spots.length; i++) {
    const rec = r.records[i], body = rec.parts[0];
    assert(Math.abs(posOf(body.mesh, body.index).x - spots[i].x) < 1e-4 && Math.abs(posOf(body.mesh, body.index).z - spots[i].z) < 1e-4, `record ${i} owns its instance`);
    assert.equal(rec.parts.length, i === 3 ? 2 : 3, 'body + glow (when) + pool'); assert.equal(rec.kind, 'lamp');
    assert.equal(rec.x, spots[i].x); assert.equal(rec.y, spots[i].y); assert.equal(items[i].source.knock, rec);
  }
  assert(Math.abs(scaleOf(r.records[2].parts[0].mesh, r.records[2].parts[0].index).x - 1.2) < 1e-6, 'spot.s scales the instance');
  assert.equal(poolMesh.instanceMatrix.usage, THREE.DynamicDrawUsage, 'extra parts are registered too');
  // a knocked lamp moves body + glow + pool together; `place` gives a part its own matrices (two heads on one pole), `items` may return arrays
  const w2 = world(), head = new THREE.Matrix4().makeTranslation(0, 4, 0.5), head2 = new THREE.Matrix4().makeTranslation(0, 4, -0.5);
  const sp = [{ x: 5, y: 0, z: 5, rotY: 0 }, { x: 8, y: 0, z: 5, rotY: 0 }];
  const q = knockInstances(w2.ctx, { name: 'sig', parts: [{ geo, mat: MAT }, { geo: geo2, mat: MAT, place: (s, i) => (i === 0 ? [head.clone().setPosition(5, 4, 5.5), head2.clone().setPosition(5, 4, 4.5)] : null) }], spots: sp,
    items: (i, s) => [w2.physics.addCylinder(s.x, s.z, 0.1, 0, 3)], rec: { kind: 'signal', mass: 120, h: 4.2, r: 0.1, anchored: 12, hitK: 0.4, metal: true } });
  assert.equal(q.records[0].parts.length, 3); assert.equal(q.records[1].parts.length, 1); assert.equal(q.records[0].items.length, 1);
  assert.equal(knockInstances(w2.ctx, { name: 'none', parts: [{ geo, mat: MAT }], spots: [], rec: { kind: 'x' } }).meshes.length, 0);
});

check('11 update(0) / update(NaN) are no-ops; an idle update returns before iterating (nothing measured)', () => {
  const w = world(), t = thing(w, TABLE.bench, 0, 20);
  for (let i = 0; i < 50; i++) for (const u of w.updates) u(1 / 60);
  assert.equal(w.knock.stats.updateMs, 0, 'idle updates are not measured'); assert.equal(w.knock.stats.live, 0);
  w.knock.hit(0, 20, 40, 0, 1); const m0 = matrixOf(t.m, 0), b0 = JSON.stringify({ ...t.rec.body, it: 0 });
  for (const dt of [0, NaN, -1, undefined, Infinity * 0]) w.knock.update(dt);
  assert(matrixOf(t.m, 0).equals(m0)); assert.equal(JSON.stringify({ ...t.rec.body, it: 0 }), b0, 'the body did not step'); assert.equal(w.knock.stats.updateMs, 0);
  w.knock.update(1 / 60); assert(!matrixOf(t.m, 0).equals(m0), 'a real step moves it'); assert(w.knock.stats.updateMs >= 0);
  assert.equal(typeof window === 'undefined' || window.__knock === w.knock, true);
});

check('12 rampage: 400 fake instances knocked within 2 s of simulated time stay cheap (updateMs < 4)', () => {
  const w = world(), meshes = [], recs = [], N = 400;
  for (let k = 0; k < 4; k++) meshes.push(mesh(100, (i) => [100 + i * 3, 0, 200 + k * 6]));
  for (let k = 0; k < 4; k++) for (let i = 0; i < 100; i++) {
    const x = 100 + i * 3, z = 200 + k * 6, anchored = k === 3;
    const def = anchored ? TABLE.lampD : (k === 2 ? TABLE.bench : TABLE.binSteel);
    const item = def.r ? w.physics.addCylinder(x, z, def.r, 0, def.h) : w.physics.addBox(x, z, def.w, def.d, 0, 0, def.h);
    recs.push(w.knock.register({ ...def, x, z, y: 0, item, parts: [{ mesh: meshes[k], index: i }] }));
  }
  assert.equal(recs.filter(Boolean).length, N);
  const t0 = performance.now(); let i = 0;
  for (let f = 0; f < 120; f++) { for (let n = 0; n < 4 && i < N; n++, i++) w.knock.hit(recs[i].x, recs[i].z, 45, 0.3, 1); w.knock.update(1 / 60); }
  assert.equal(i, N); for (let f = 0; f < 600 && w.knock.stats.live; f++) w.knock.update(1 / 60);
  assert.equal(w.knock.stats.live, 0); assert.equal(w.knock.stats.knocked, N); assert(recs.every((r) => r.state === 'rest'), 'every thing settled');
  const ms = w.knock.stats.updateMs; console.log(`  rampage: ${N} knocked, ${(performance.now() - t0).toFixed(0)} ms wall for ~${(120 + 60)} frames, worst busy update ${ms.toFixed(3)} ms`);
  assert(ms < 4, `updateMs ${ms}`);
  for (const m of meshes) assert.equal(m.userData.knockDirty, false, 'every dirty mesh was flushed');
});

check('13 traffic signal: a pole with head and lens instances keeps every part where it stood and carries them down together; lens parts hide on request', () => {
  const w = world(), pole = mesh(1, () => [0, 0, 20]), head = mesh(2, (i) => [0, 3.2 + i * 0.9, 20.4]), lens = mesh(6, (i) => [0.05, 3.5 + Math.floor(i / 3) * 0.9 - (i % 3) * 0.25, 20.5]), halo = mesh(1, () => [0, 3.5, 20.52]);
  const parts = [{ mesh: pole, index: 0 }, { mesh: head, index: 0 }, { mesh: head, index: 1 }, ...[0, 1, 2, 3, 4, 5].map((i) => ({ mesh: lens, index: i })), { mesh: halo, index: 0, hide: true }];
  const item = w.physics.addCylinder(0, 20, 0.14, 0, 3.4);
  const rec = w.knock.register({ kind: 'signal', x: 0, z: 20, y: 0, mass: 160, h: 4.5, r: 0.1, anchored: 14, hitK: 0.4, metal: true, item, parts });
  assert.equal(rec.parts.length, 10); assert.equal(rec.state, 'stand');
  const dist0 = lens.count && [...Array(6).keys()].map((i) => posOf(lens, i).distanceTo(new THREE.Vector3(0, 0, 20)));
  const head0 = posOf(head, 1).clone();
  w.knock.hit(0, 20, 40, 0, 1); assert.equal(rec.state, 'fly'); idle(w, 6); assert.equal(rec.state, 'rest');
  // lying along +z: each part's horizontal distance along z from the foot is its former height, its offset across the throw is kept
  const foot = new THREE.Vector3(0, 0, 20 + 0.05);
  for (let i = 0; i < 6; i++) {
    const p = posOf(lens, i); assert(p.y < 1.2, `lens ${i} lies low (${p.y.toFixed(2)})`);
    assert(Math.abs(p.distanceTo(foot) - dist0[i]) < 0.9, `lens ${i} keeps its distance from the foot (${p.distanceTo(foot).toFixed(2)} vs ${dist0[i].toFixed(2)})`);
    assert(p.z > 20 + 2, 'along the throw');
  }
  assert(Math.abs(posOf(head, 1).z - (20 + head0.y)) < 1.0, 'the upper head lies at its height along the throw');
  assert.equal(scaleOf(halo, 0).length(), 0, 'the halo is hidden');
  assert(Math.abs(scaleOf(lens, 3).x - 1) < 1e-6, 'lens scale untouched');
  // a frame writes only matrices: the number of Matrix4 / Vector3 created by a steady-state update is nil
  const w2 = world(), bodies = []; for (let i = 0; i < 20; i++) { const t = thing(w2, TABLE.lampD, i * 4, 100, { parts: [{ mesh: mesh(1, () => [i * 4, 0, 100]), index: 0 }, { mesh: mesh(1, () => [i * 4, 0, 100]), index: 0 }, { mesh: mesh(1, () => [i * 4, 0, 100]), index: 0 }] }); bodies.push(t); }
  for (const t of bodies) w2.knock.hit(t.rec.x, 100, 30, 0.5, 1);
  w2.knock.update(1 / 60); const h0 = process.memoryUsage().heapUsed; for (let f = 0; f < 20; f++) w2.knock.update(1 / 60);
  assert(process.memoryUsage().heapUsed - h0 < 4e6, 'steady-state updates do not allocate per frame');
});

check('14 metal clank: calm, throttled to one per 0.15 s of simulated time, only for metal, louder when harder', () => {
  const w = world('coupe', { audio: true });
  for (let i = 0; i < 6; i++) thing(w, TABLE.binSteel, i * 3, 20);
  thing(w, TABLE.pot, 40, 20);
  for (let i = 0; i < 6; i++) w.knock.hit(i * 3, 20, 40, 0, 1);
  assert.equal(w.sounds.length, 1, 'one clank for a burst'); assert.equal(w.sounds[0].n, 'clank'); assert(w.sounds[0].o.volume >= 0.2 && w.sounds[0].o.volume <= 1); assert(Number.isFinite(w.sounds[0].o.position.x));
  idle(w, 0.3); w.knock.hit(40, 20, 40, 0, 1); assert.equal(w.sounds.length, 1, 'a clay pot does not clank');
  const w2 = world('coupe', { audio: true }); w2.ctx.audio.play = () => { throw new Error('audio down'); };
  thing(w2, TABLE.binSteel, 0, 20); assert(w2.knock.hit(0, 20, 40, 0, 1), 'a failing audio never breaks the knock');
  const w3 = world(); thing(w3, TABLE.binSteel, 0, 20); assert(w3.knock.hit(0, 20, 40, 0, 1), 'no audio at all is fine');
});

check('15 outline proxies: the normal / depth builder skips a knock mesh (no stale outline of a moved instance) and leaves its layers alone', () => {
  const w = world(), root = new THREE.Group(); w.ctx.addStatic = (o) => root.add(o);
  const spots = [{ x: 10, y: 0, z: 10 }, { x: 14, y: 0, z: 10 }, { x: 600, y: 0, z: 10 }];
  const k = knockInstances(w.ctx, { name: 'nd-knock', parts: [{ geo: BOX.clone(), mat: MAT }], spots, far: 200, rec: { kind: 'pot', mass: 10, h: 0.5, r: 0.2 } });
  const plain = new THREE.InstancedMesh(BOX, MAT, 3); for (let i = 0; i < 3; i++) plain.setMatrixAt(i, new THREE.Matrix4().makeTranslation(i * 5, 0, 50)); root.add(plain);
  const masks = k.meshes.map((m) => m.layers.mask);
  LOD.init(root); const report = buildNDProxy(root, { cell: 128, material: MAT });
  assert.equal(report.sources, 1, 'only the static control mesh is proxied'); assert.equal(report.skipped, k.meshes.length, 'every knock mesh is skipped');
  assert.deepEqual(k.meshes.map((m) => m.layers.mask), masks); assert(k.meshes.every((m) => m.visible && m.parent === root));
});

console.log(`Knock regressions: ${checks} passed`);
