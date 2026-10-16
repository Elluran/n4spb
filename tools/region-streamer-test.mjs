// Streaming scheduling contract: nearby first, bounded speculative work,
// destination changes honored after idle, explicit teleports still work.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRegionStreamer } from '../src/core/region-streamer.js';

const idle = [];
globalThis.requestIdleCallback = fn => { idle.push(fn); };
const loaded = [], released = [];
const ctx = { initialPosition: { x: 0, z: 0 }, mat: { toon: () => new THREE.MeshBasicMaterial() } };
const streamer = createRegionStreamer(ctx, {
  async load(name) { loaded.push(name); return { geometries: [], objects: [] }; },
  release(name) { released.push(name); },
});
const region = (asset, x) => ({ asset, bounds: [x, -10, x + 10, 10] });
await streamer.register({ materials: [], textures: [], regions: [region('start', 0), region('ahead', 1000), region('far', 5000)] }, new THREE.Group());
assert.deepEqual(loaded, ['start']);
assert.equal(streamer.readyAt(5000, 0), false);
streamer.start();
const flush = async () => { while (idle.length) { idle.shift()(); await new Promise(resolve => setImmediate(resolve)); } };
await flush();
assert.deepEqual(loaded, ['start', 'ahead'], 'background loading must stop outside the nearby ring');
streamer.update(5000, 0);
// Move again before the pending idle callback. It must honor the latest pose.
streamer.update(0, 0);
await flush();
assert.deepEqual(loaded, ['start', 'ahead']);
await streamer.ensureAt(5000, 0);
assert.equal(streamer.readyAt(5000, 0), true);
assert.deepEqual(loaded, ['start', 'ahead', 'far']);
await streamer.ensureAll();
assert.equal(loaded.length, 3, 'explicit loads must share requests');
assert.deepEqual(released, loaded, 'hydrated regions must release packed metadata exactly once');
assert.equal(streamer.stats.failed, 0);
delete globalThis.requestIdleCallback;
console.log('RESULT: OK (nearby streaming, deferred destination, teleport, deduplication)');
