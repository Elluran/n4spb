// Headless fleet buffer regression: fixed input frames cover near/far/cull, empty frames, all model kinds,
// slopes, occupants, lights and liveries. Golden hashes come from the original independent matrix buffers.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createContext } from '../src/core/ctx.js';
import { MODEL_KINDS } from '../src/world/traffic/fleetdata.js';
import { createFleet } from '../src/world/traffic/fleet.js';
const ctx = createContext({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), audio: null, quality: { name: 'medium', cull: 0.75 }, sunDir: new THREE.Vector3(1, 2, 1).normalize() });
ctx.tex.draw = () => new THREE.Texture();
const fleet = createFleet(ctx, { capacity: Object.fromEntries(MODEL_KINDS.map(kind => [kind, 80])), persons: 180 });
const golden = [
  '8f2d7483ba40b299f48eabf6efa05fc5296645c6e7dbb348d5cf211b935daa31',
  'c41cb9b76295fd6e4e85f632a64699f5db7e8be3cc11fdcc5488dd5a79780ba0',
  'b0701e15d284d755db9eb74ea121cb69cd3fdfda23de55cb815f43780ad31611',
  '20be928b0d8f3bbcbd4e4cdadb0faa22d60641b5f2ba909d00b7f9291f5d0dcc',
  '4f3d84290999867865a8f37aeb51810e264a1d4eca88d604c4e4510e8dd715ed',
  '76905d73a5d44b97f5469af10ce7e4939c0f5fa9e1b8fd97f27d4f68262fa19c',
];
const hashes = [];
for (let frame = 0; frame < 6; frame++) {
  fleet.begin(ctx.camera);
  if (frame !== 2) for (const [i, kind] of MODEL_KINDS.entries()) for (let j = 0; j < (frame === 1 ? 1 : 3); j++) {
    const yaw = i * 0.37 + frame * 0.08, pitch = (frame - 2) * 0.02, x = j === 2 ? 1000 : (frame === 4 ? 100 : j * 95) + i % 8 * 2;
    fleet.push({ kind, x, y: 0.2 + i * 0.03, z: i % 6 * 2, c: Math.cos(yaw), s: Math.sin(yaw), cp: Math.cos(pitch), sp: Math.sin(pitch), color: new THREE.Color().setRGB(0.2, i % 4 / 5, 0.6), plate: i, lamp: [0.5, 0.3, frame % 2], driver: true, pax: i % 2, taxi: true, police: true, amb: true, route: i, tips: [x + 1, 5, 8, x - 1, 5, 8, 1, 0] });
  }
  fleet.end();
  const h = createHash('sha256'), consumed = new Set();
  for (const mesh of ctx.dynamicRoot.children) {
    h.update(mesh.name + ':' + mesh.count + ':' + mesh.visible);
    const attrs = [mesh.instanceMatrix, mesh.instanceColor, mesh.aPlate, mesh.aLamp, mesh.aCell].filter(Boolean);
    for (const a of attrs) {
      h.update(new Uint8Array(a.array.buffer, a.array.byteOffset, mesh.count * a.itemSize * a.array.BYTES_PER_ELEMENT));
      if (mesh.count && a.version) assert(a.updateRanges.some(r => r.start === 0 && r.count >= mesh.count * a.itemSize), 'draw prefix is uploaded');
      consumed.add(a);
    }
  }
  for (const a of consumed) a.clearUpdateRanges(); // Each shared buffer uploads once per frame.
  for (const k of Object.values(fleet.K)) { assert.equal(k.paint0.instanceMatrix, k.glass.instanceMatrix); assert.equal(k.paint0.instanceMatrix, k.lamps.instanceMatrix); }
  hashes.push(h.digest('hex'));
}
assert.deepEqual(hashes, golden, 'all active fleet buffers match the original renderer exactly');
console.log(`RESULT: OK - ${MODEL_KINDS.length} vehicle kinds, six exact reference frames, shared matrices and active upload ranges.`);
