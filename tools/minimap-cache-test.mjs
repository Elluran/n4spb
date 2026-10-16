// Exercise the real map and city index with a recording 2D canvas. An idle map
// must stop allocating/rasterizing tiles after warming, including after a trip.
// Run: node tools/minimap-cache-test.mjs
import assert from 'node:assert/strict';
import { PLAY } from '../src/world/data/city.js';

let tileBuilds = 0;
const element = () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} });
function canvas(tile = false) {
  if (tile) tileBuilds++;
  const cv = { width: 424, height: 424, origin: null };
  const target = {
    canvas: cv, draws: [], measureText: text => ({ width: text.length * 9 }),
    createRadialGradient: () => ({ addColorStop() {} }),
    translate(x, y) { if (tile && !cv.origin) cv.origin = [-x, -y]; },
    drawImage(image) { this.draws.push(image.origin); },
    clearRect() { this.draws.length = 0; },
  };
  const ctx = new Proxy(target, { get: (o, k) => k in o ? o[k] : () => {} });
  cv.getContext = () => ctx;
  return cv;
}
globalThis.document = {
  head: element(), body: element(),
  createElement(tag) {
    if (tag === 'canvas') return canvas(true);
    const e = element();
    if (tag === 'div') {
      const pill = element(), name = element(), latin = element();
      pill.querySelector = q => q === 'b' ? name : latin;
      const children = { canvas: canvas(), '.mm-n': element(), '.mm-street': pill };
      e.querySelector = q => children[q];
    }
    return e;
  },
};
const { createMinimap } = await import('../src/core/minimap.js');
const map = createMinimap(), state = { x: 498, z: 135, yaw: 0.4, diam: 300, car: false };
let drawsChecked = 0;
function update(checkDraws = false) {
  map.update(state, 1 / 60);
  assert(map.stats.tiles <= 40, 'tile cache stays bounded');
  if (!checkDraws) return;
  const expected = new Set(), half = map.diam / 2;
  for (let i = Math.max(0, Math.floor((state.x - half - PLAY.x0) / 256)); i <= Math.min(Math.ceil((PLAY.x1 - PLAY.x0) / 256) - 1, Math.floor((state.x + half - PLAY.x0) / 256)); i++) {
    for (let j = Math.max(0, Math.floor((state.z - half - PLAY.z0) / 256)); j <= Math.min(Math.ceil((PLAY.z1 - PLAY.z0) / 256) - 1, Math.floor((state.z + half - PLAY.z0) / 256)); j++) {
      expected.add(`${PLAY.x0 + i * 256 - 6},${PLAY.z0 + j * 256 - 6}`);
    }
  }
  const actual = new Set(map.canvas.getContext('2d').draws.map(p => p.join(',')));
  assert.deepEqual(actual, expected, 'every tile covering the visible disc is retained and drawn');
  drawsChecked++;
}
function settle(label) {
  for (let i = 0; i < 100; i++) update();
  const before = tileBuilds;
  for (let i = 0; i < 100; i++) update(true);
  assert.equal(tileBuilds, before, `${label}: idle prefetch must settle`);
}

settle('walking in the centre');
state.car = true; state.diam = 520;
const beforeDrive = tileBuilds;
for (let i = 0; i < 160; i++) { state.x -= 10; state.z -= 3; state.yaw += 0.01; update(); }
assert(tileBuilds > beforeDrive, 'moving into new map cells builds their tiles');
settle('stopped after driving');
state.x = -3900; state.z = -1100;
settle('teleported to Vasilievsky Island');
state.car = false; state.diam = 640;
// Largest flying view at tile corners exercises the least symmetric warm square.
state.x = PLAY.x0 + 12 * 256 + 0.01; state.z = PLAY.z0 + 9 * 256 + 0.01;
settle('maximum zoom at a tile corner');
state.x = PLAY.x0 + 0.01; state.z = PLAY.z0 + 0.01;
settle('play-area boundary');
map.setActive(false);
const beforeInactive = tileBuilds;
state.x = 498; state.z = 135;
for (let i = 0; i < 40; i++) update();
assert.equal(tileBuilds, beforeInactive, 'inactive map does not rasterize');
map.setActive(true);
settle('reactivated after teleport');
console.log(`RESULT: OK - bounded cache; ${drawsChecked} complete visible tile sets; no stationary rasterization after walking, driving, flying, boundary and teleport warmup.`);
