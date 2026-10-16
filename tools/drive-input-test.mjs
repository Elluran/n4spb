// CPU regression for first-E entry: run the real interaction listener and the drive module's real
// keydown listener in order, with a simulated delay during initial HUD/audio setup. No WebGL required.
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
console.log('RESULT: OK - first-E entry, held key and subsequent exit with 0, 1,000 and 12,000 ms setup delays.');
