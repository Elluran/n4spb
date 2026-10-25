// Real quay generator regression: owned bridge fallbacks must not block streets.
// node tools/quay-fallback-test.mjs (no GPU or city/field build required).
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createContext } from '../src/core/ctx.js';
import * as L from '../src/world/layout.js';
import { buildQuay } from '../src/world/environment/quay.js';
import { bridgeZones } from '../src/world/environment/river.js';
import { createHandling } from '../src/world/drive/handling.js';
import { buildPalace, PALACE } from '../src/world/bridges/palace.js';
import { makeMats } from '../src/world/bridges/mats.js';
import { makeRailBatch } from '../src/world/bridges/rails.js';
import { Parts } from '../src/world/bridges/kit.js';
import { toWorld } from '../src/world/bridges/sites.js';
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


const built = (buildList) => {
  const ctx = createContext({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), audio: null,
    quality: { name: 'medium' }, sunDir: new THREE.Vector3(...L.SUN_DIR).normalize() });
  if (buildList) ctx.buildList = buildList;
  const quay = buildQuay(ctx, ctx.staticRoot, new Set());
  return { ctx, quay };
};
const fallbackAt = (ph, zone) => ph.items.some(it => it.type === 'walk' && it.top === 0 && it.y0 === -1.2 &&
  Math.hypot(it.cx - zone.c[0], it.cz - zone.c[1]) < 1e-6);
const owned = bridgeZones().filter(z => z.own && !z.auto && L.inPlay(...z.c, -20));
const driveApproach = ctx => {
  const car = createHandling(ctx), x = -2252.1, z = -762.9;
  car.reset(x, z, (385.7 + 180) * Math.PI / 180);
  let hits = 0;
  for (let i = 0; i < 168; i++) {
    car.step(1 / 60, { thr: 1, brk: 0, steer: 0, hand: false, nitro: false });
    hits += car.events.filter(e => e.type === 'hit').length;
  }
  return { distance: Math.hypot(car.x - x, car.z - z), hits };
};
for (const list of [['environment', 'bridges'], undefined]) {
  const { ctx } = built(list);
  for (const zone of owned) assert(!fallbackAt(ctx.physics, zone), `duplicate deck at owned ${zone.id}`);
  const rails = makeRailBatch(ctx), bridge = buildPalace({ ctx, P: new Parts(), M: makeMats(ctx), rails, waterY: -3.4 });
  bridge.colliders(); rails.flush(ctx.staticRoot);      // (the rails are breakable bays since the water rule: the batch builds their colliders at the flush)
  ctx.services.bridges = { deckY: bridge.deckAt };
  const mid = toWorld(PALACE, 127.25, 0), side = toWorld(PALACE, 127.25, 13.71);
  const height = bridge.deckAt(mid.x, mid.z);
  assert(height > 2, 'real Palace deck keeps its raised profile');
  assert(ctx.physics.groundHeight(mid.x, mid.z, height, false) >= height - 0.02, 'real deck supports walkers');
  assert(!ctx.physics.columnBlocked(mid.x, mid.z, 0.3, height + 0.46, height + 1.7), 'real deck centre stays clear');
  assert(ctx.physics.columnBlocked(side.x, side.z, 0.3, height + 0.46, height + 1.7), 'visible railing remains solid');
  // The supplied camera follows this exact approach into the former 261 m parapet.
  const { distance, hits } = driveApproach(ctx);
  assert(distance > 45 && hits === 0, `Palace Passage blocked: ${distance.toFixed(2)} m, ${hits} hits`);
  console.log(`Owned ${list ? 'explicit' : 'default'}: ${owned.length} decks clear; reported approach ${distance.toFixed(2)} m, ${hits} hits.`);
}
const { ctx } = built(['environment']);
const palace = owned.find(z => z.id === 'palace');
assert(fallbackAt(ctx.physics, palace), 'environment-only crossing retains its fallback floor');
const fallbackDrive = driveApproach(ctx);
assert(fallbackDrive.distance > 10, 'unowned fallback has no invisible safety parapet any more (water is reachable: a wall exists only where a fence is drawn)');
console.log('RESULT: OK - owned/default road clearance and environment-only fallback without an invisible wall.');

