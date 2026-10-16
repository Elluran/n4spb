// Headless equivalence check for the two people renderers: all geometry, matrices, palette/face/tint,
// shadow/outline membership and visible slots across gestures, hiding, slot reuse, far LOD and night.
// Run: node tools/people-render-test.mjs [--items]. GPU checks use ?people=lineup&pbat=0/1/items.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { createContext } from '../src/core/ctx.js';
import { createCrowd, makeSpec, ARCH } from '../src/world/people/chars.js';
import { supportsPeopleBatches } from '../src/world/people/batches.js';
import { newState, MODE } from '../src/world/people/contract.js';

function context(batch) {
  const ctx = createContext({ scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), renderer: { extensions: { has: () => batch } }, audio: null, quality: { name: 'medium' }, sunDir: new THREE.Vector3(1, 2, 1).normalize() });
  ctx.tex.draw = () => new THREE.Texture(); // Canvas pixels are identical inputs; the test checks face UV selection.
  return ctx;
}
const oldCtx = context(false), newCtx = context(true);
assert.equal(supportsPeopleBatches({ renderer: null }), false, 'headless/unsupported renderer keeps instancing');
globalThis.location = { search: '?pbat=0' };
assert.equal(supportsPeopleBatches(newCtx), false, 'explicit A/B switch keeps instancing');
const itemsOnly = process.argv.includes('--items');
globalThis.location.search = itemsOnly ? '?pbat=items' : '';
const oldCrowd = createCrowd(oldCtx), newCrowd = createCrowd(newCtx), rng = oldCtx.rng('people-batch-equivalence');
delete globalThis.location;
const roles = ['walk', 'office', 'elder', 'kid', 'parent', 'dogwalker', 'guide', 'traveler', 'busker', 'painter', 'cleaner', 'angler', 'date', 'tourist', 'courier'];
for (let i = 0; i < 180; i++) {
  const options = i < ARCH.length ? { arch: ARCH[i].id } : i % 7 === 0 ? { role: 'rider', vehicle: ['bike', 'escooter', 'kick', 'balance'][i % 4] } : { role: roles[i % roles.length] };
  const spec = makeSpec(rng, options);
  oldCrowd.add(structuredClone(spec)); newCrowd.add(structuredClone(spec));
}
oldCrowd.finalize(); newCrowd.finalize();
assert.equal(newCrowd.batched, true);
assert.equal(newCrowd.batchMode, 'items');
assert(newCrowd.drawCalls < oldCrowd.drawCalls, 'fewer material batches');
assert.equal(oldCrowd.trianglesAll, newCrowd.trianglesAll, 'geometry budget unchanged');

function geometryHash(g, range = null) {
  const h = createHash('sha256'), first = range?.vertexStart || 0, count = range?.vertexCount ?? g.attributes.position.count;
  for (const name of ['position', 'normal', 'color', 'uv', 'aSlot']) {
    const a = g.attributes[name]; if (!a) continue;
    h.update(name); h.update(new Uint8Array(a.array.buffer, a.array.byteOffset + first * a.itemSize * a.array.BYTES_PER_ELEMENT, count * a.itemSize * a.array.BYTES_PER_ELEMENT));
  }
  const ids = new Uint32Array(range?.indexCount ?? g.index.count), start = range?.indexStart || 0;
  for (let i = 0; i < ids.length; i++) ids[i] = g.index.array[start + i] - first;
  h.update(new Uint8Array(ids.buffer)); return h.digest('hex');
}
const ids = new WeakMap();
for (const m of oldCtx.dynamicRoot.children) ids.set(m, geometryHash(m.geometry));
for (const m of newCtx.dynamicRoot.children) {
  if (m.isBatchedMesh) {
    ids.set(m, m._geometryInfo.map((_, i) => geometryHash(m.geometry, m.getGeometryRangeAt(i, {}))));
    assert.equal(m.sortObjects, false); assert.equal(m.perObjectFrustumCulled, false);
  } else ids.set(m, geometryHash(m.geometry));
}
const oldGeometries = new Set([...oldCtx.dynamicRoot.children].map(m => ids.get(m)));
for (const m of newCtx.dynamicRoot.children) for (const id of [].concat(ids.get(m))) assert(oldGeometries.has(id), 'batch geometry is byte-for-byte identical');

const slice = (a, i, n) => Array.from(a.subarray(i, i + n));
function snapshot(ctx) {
  const records = [];
  for (const m of ctx.dynamicRoot.children) {
    if (m.isBatchedMesh) {
      m.onBeforeRender(null, null, null, m.geometry, m.material);
      let visible = 0;
      for (let i = 0; i < m.instanceCount; i++) {
        if (!m.getVisibleAt(i)) continue; visible++;
        const matrix = slice(m._matricesTexture.image.data, i * 16, 16), colors = [];
        if (m._colorsTexture) colors.push(...slice(m._colorsTexture.image.data, i * 4, 3));
        records.push(JSON.stringify([ids.get(m)[m.getGeometryIdAt(i)], m.castShadow, m.layers.mask, matrix, colors]));
      }
      assert.equal(m._multiDrawCount, visible, 'multi-draw contains exactly visible parts');
      assert.equal(m.visible, visible > 0, 'empty material batch is hidden');
    } else {
      const g = m.geometry, a = m.instanceMatrix.array;
      for (let i = 0; i < m.count; i++) {
        const matrix = slice(a, i * 16, 16); if (!(matrix[0] || matrix[1] || matrix[2])) continue;
        const colors = [];
        if (g.attributes.iA) {
          for (const key of ['iA', 'iB', 'iC', 'iD']) colors.push(...slice(g.attributes[key].array, i * 3, 3));
          if (g.attributes.iFace) colors.push(...slice(g.attributes.iFace.array, i * 2, 2));
        } else if (m.instanceColor) colors.push(...slice(m.instanceColor.array, i * 3, 3));
        records.push(JSON.stringify([ids.get(m), m.castShadow, m.layers.mask, matrix, colors]));
      }
    }
  }
  return records.sort();
}
const state = newState(); let checked = 0;
for (let frame = 0; frame < 12; frame++) {
  const night = frame >= 5 && frame < 9 ? 1 : 0; oldCrowd.setNight(night); newCrowd.setNight(night);
  for (let j = 0; j < oldCrowd.count; j++) {
    const i = frame % 2 ? oldCrowd.count - 1 - j : j;
    if (frame === 7 || (frame > 1 && (i + frame) % 5 === 0)) { oldCrowd.hide(i); newCrowd.hide(i); continue; }
    const person = oldCrowd.persons[i];
    Object.assign(state, { x: i * 2, y: 0.12, z: frame, yaw: i * 0.8 + frame * 0.1, speed: 1.3, dist: frame * 0.13, mode: person.vehicle ? MODE.RIDE : i % 3 === 0 ? MODE.SIT : MODE.WALK, gesture: (frame + i) % 18, gk: 1, look: Math.sin(i), lookK: 0.6 });
    if (frame > 2 && i % 4 === 0) { oldCrowd.renderFar(i, state); newCrowd.renderFar(i, state); }
    else { oldCrowd.render(i, state, frame / 10); newCrowd.render(i, state, frame / 10); }
  }
  oldCrowd.endFrame(); newCrowd.endFrame();
  const a = snapshot(oldCtx), b = snapshot(newCtx); assert.equal(b.length, a.length, 'visible record count at frame ' + frame);
  for (let i = 0; i < a.length; i++) assert.equal(b[i], a[i], `render output at frame ${frame}, record ${i}`);
  checked += a.length;
  assert.equal(newCrowd.shownCount, oldCrowd.shownCount);
}
console.log(`RESULT: OK - ${oldCrowd.count} people, ${checked} visible part records, exact geometry/matrices/palettes/faces/tints/visibility; ${oldCrowd.drawCalls} -> ${newCrowd.drawCalls} meshes.`);
