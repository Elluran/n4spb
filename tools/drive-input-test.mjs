// CPU regression for first-E entry: run the real interaction listener and the drive module's real
// keydown listener in order, with a simulated delay during initial HUD/audio setup. No WebGL required.
// Also the Roadster's input: readInput (drive.js) turns the X key and the touch HOP button into input.jump, the exhaust-point array fed to the fx has room for every nozzle of every car, and
// the door stays shut while the car is in the air (exit()).
// Run: node tools/drive-input-test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { createInteract } from '../src/core/ui.js';

const source = fs.readFileSync(new URL('../src/world/drive.js', import.meta.url), 'utf8');
const section = source.indexOf('// ---------------------------------------------------------------- keys / mouse');
const begin = source.indexOf("    addEventListener('keydown', (e) => {", section);
const end = source.indexOf("    addEventListener('mousemove'", begin);
assert(section >= 0 && begin > section && end > begin, 'drive keydown listener is present');
const driveListener = source.slice(begin, end);
const originalAdd = globalThis.addEventListener;
try {
  for (const setupDelay of [0, 1000, 12000]) {
    const events = new EventTarget();
    globalThis.addEventListener = events.addEventListener.bind(events);
    const player = { fly: false, inputLock: 0 }, camera = new THREE.PerspectiveCamera(), ui = { modalOpen: false };
    const state = { active: false, enteredAt: 0 };
    let now = 10, exits = 0;
    const interact = createInteract({ camera, player, ui, doc: { getElementById: () => null } });
    interact.add({
      id: 'test-car', x: 0, y: 0, z: 0, enabled: () => !state.active,
      onUse: () => { state.active = true; state.enteredAt = now; player.inputLock = 1; now += setupDelay; },
    });
    interact.update();
    vm.runInNewContext(driveListener, {
      addEventListener, state, ctx: { ui }, performance: { now: () => now },
      exit: () => { exits++; state.active = false; player.inputLock = 0; },
    }, { filename: 'drive.js keydown listener' });
    const press = (repeat = false) => {
      const e = new Event('keydown', { cancelable: true }); Object.assign(e, { code: 'KeyE', repeat });
      events.dispatchEvent(e); return e;
    };
    assert.equal(press().defaultPrevented, true, 'interaction consumes entry event');
    assert.equal(state.active, true, `entry stays seated after ${setupDelay} ms setup`);
    assert.equal(exits, 0, 'entry cannot exit on the same event');
    interact.update();
    now += 1000; press(true);
    assert.equal(exits, 0, 'holding E cannot exit on auto-repeat');
    assert.equal(press().defaultPrevented, true, 'a fresh E consumes exit event');
    assert.equal(exits, 1, 'a subsequent E exits normally');
  }
} finally {
  if (originalAdd === undefined) delete globalThis.addEventListener;
  else globalThis.addEventListener = originalAdd;
}
// ---- the hop key: the real readInput of drive.js with a fake key set / touch state
{
  const r0 = source.indexOf('  function readInput(out = {}) {'), r1 = source.indexOf('  const input = {};', r0);
  assert(r0 >= 0 && r1 > r0, 'drive readInput is present');
  const read = (codes, touch = {}, player = null) => {
    const fn = vm.runInNewContext(source.slice(r0, r1) + ' readInput;', { keys: new Set(codes), touch: { nitro: false, hand: false, brake: false, jump: false, ...touch }, hopTap: !!touch.tap, player, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) });
    return fn({});
  };
  assert.equal(read([]).jump, false, 'no key: no hop');
  assert.equal(read([], { tap: true }).jump, true, 'a latched tap (keydown + keyup between two frames) still hops');
  assert.equal(read(['KeyX']).jump, true, 'the X key hops');
  assert.equal(read([], { jump: true }).jump, true, 'the touch HOP button hops');
  assert.equal(read(['KeyW']).jump, false, 'W alone does not hop');
  const both = read(['KeyW', 'KeyX', 'ShiftLeft']); assert(both.jump && both.thr === 1 && both.nitro, 'gas + nitro + hop together');
  assert.equal(read(['Space']).hand, true, 'the handbrake is still Space');
  // the exhaust points of every car fit the world-point array (four nozzles with an array of two crashed the first frame)
  const m = /exW = Array\.from\(\{ length: (\d+) \}/.exec(source); assert(m, 'drive exW is an Array.from of n vectors'); const room = Number(m[1]);
  const { loadGarage } = await import('../src/world/drive/cars/index.js');
  const warn = console.warn; console.warn = () => {};
  const garage = await loadGarage({}, { placeholders: true, paths: { truck: './none.js', lada: './none.js', roadster: './none.js' } }); console.warn = warn;
  assert.equal(garage.length, 4, 'the placeholder garage has four cars');
  for (const d of garage) assert(d.exhaust.length <= room && room >= 6, `exW (${room}) holds the ${d.exhaust.length} exhaust points of ${d.id}`);
  assert(garage.find((d) => d.id === 'roadster').exhaust.length === 4 && garage.find((d) => d.id === 'roadster').tuning.hop, 'the Roadster has four nozzles and a hop');
  // the keydown listener latches the tap of X: only while driving, not on auto-repeat, not behind a modal
  {
    const events = new EventTarget(); globalThis.addEventListener = events.addEventListener.bind(events);
    const sb = { addEventListener, state: { active: true, enteredAt: 0 }, ctx: { ui: { modalOpen: false } }, performance: { now: () => 1e6 }, exit() {}, api: { setView() {}, repair() {} }, view: { mode: 0 }, sound: { horn() {} }, hopTap: false };
    vm.runInNewContext(driveListener, sb, { filename: 'drive.js keydown listener (hop)' });
    const press = (repeat = false) => events.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyX', repeat }));
    press(true); assert.equal(sb.hopTap, false, 'auto-repeat does not latch');
    sb.ctx.ui.modalOpen = true; press(); assert.equal(sb.hopTap, false, 'a modal swallows the key'); sb.ctx.ui.modalOpen = false;
    sb.state.active = false; press(); assert.equal(sb.hopTap, false, 'not driving: no latch'); sb.state.active = true;
    press(); assert.equal(sb.hopTap, true, 'a fresh X press while driving latches the hop');
    if (originalAdd === undefined) delete globalThis.addEventListener; else globalThis.addEventListener = originalAdd;
  }
  // exit() refuses in mid-hop (unless forced)
  const e0 = source.indexOf('  function exit(force = false) {'), e1 = source.indexOf('EXIT_MAX_KMH', e0);
  assert(e0 >= 0 && /!force && car\.air\) return false/.test(source.slice(e0, e1)), 'exit() keeps the door shut while the car is airborne');
}
console.log('RESULT: OK - first-E entry, held key and subsequent exit with 0, 1,000 and 12,000 ms setup delays; the hop key (X / touch), exhaust-point room, no exit in the air.');
