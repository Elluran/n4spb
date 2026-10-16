// Static fixture groups must cull with bounds containing their transformed
// geometry, while bridge and roof silhouettes retain their authored range.
// Run: node tools/static-fixture-test.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { instances, benchGeo } from '../src/world/landmarksF/util.js';
import { balusterMesh } from '../src/world/landmarksF/colonnade.js';
import { buildRailing } from '../src/world/landmarksC/bridge.js';
import { makeRailBatch } from '../src/world/bridges/rails.js';
import { splitInstanced } from '../src/core/spatial.js';
import { LOD } from '../src/core/lod.js';

const root = new THREE.Group(), material = new THREE.MeshBasicMaterial();
const ctx = { THREE, addStatic: m => root.add(m), noOutline() {}, mat: { toon: () => material }, tex: { draw: () => new THREE.Texture() } };
const benches = instances(ctx, benchGeo(), material, [
  { x: -600, y: 4, z: 700, s: 1.2, sy: 0.8, rotY: 0.7 },
  { x: 800, y: -2, z: -500, s: 0.7, sy: 1.8, rotY: 2.8 },
], 'test-benches');
const balusters = balusterMesh({ ctx, M: { balustrade: material }, balusters: [[-60, 16, -50], [60, 17, 50]] });
root.add(balusters);
buildRailing(ctx, { rail: [material, material, material] }, root);
const rails = makeRailBatch(ctx);
for (const [x, z, len, h, rotY, roll] of [[-1400, -500, 7, 1.3, 0.7, 0.15], [1300, 1100, 3, 0.8, 2.1, -0.2]]) {
  rails.add({ kind: 'palace', hex: '#123456', x, y: 9, z, len, h, rotY, roll });
}
rails.flush(root);

let vertices = 0;
const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
function bounds(mesh) {
  assert(mesh.frustumCulled, `${mesh.name} uses frustum culling`);
  assert(mesh.boundingSphere, `${mesh.name} has explicit instance bounds`);
  const box = mesh.boundingBox?.clone().expandByScalar(1e-4), sphere = mesh.boundingSphere;
  assert(Number.isFinite(sphere.radius));
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    const position = mesh.geometry.attributes.position;
    for (let j = 0; j < position.count; j++) {
      point.fromBufferAttribute(position, j).applyMatrix4(matrix);
      if (box) assert(box.containsPoint(point), `${mesh.name} box contains rotated/scaled instance ${i}`);
      assert(point.distanceTo(sphere.center) <= sphere.radius + 1e-4, `${mesh.name} sphere contains instance ${i}`);
      vertices++;
    }
  }
}
root.traverse(m => { if (m.isInstancedMesh) bounds(m); });
const railPieces = [];
root.traverse(m => { if (m.isInstancedMesh && m.name.startsWith('brg-rail-')) railPieces.push(m); });
assert.equal(railPieces.length, 2, 'distant bridges sharing a pattern are spatially separated');
for (const mesh of railPieces) {
  assert.equal(mesh.count, 1);
  assert.equal(LOD.of(mesh).far, Infinity, 'spatial rail pieces retain their existing range');
  assert(mesh.boundingSphere.radius < 10, 'a rail cell does not inherit a city-wide bound');
}
const preserved = root.children.filter(m => m.isInstancedMesh && m !== benches);
const result = splitInstanced(root);
assert.equal(result.split, 1, 'ordinary furniture gets spatially split');
assert(!root.children.includes(benches), 'unsplit furniture group is replaced');
for (const mesh of preserved) {
  assert.equal(mesh.parent, root, `${mesh.name} retains its compact authored group`);
  assert.equal(LOD.of(mesh), null, `${mesh.name} acquires no short geometry-only LOD`);
}
for (const mesh of railPieces) assert.equal(LOD.of(mesh).far, Infinity, 'later engine split retains the authored rail range');
console.log(`RESULT: OK - ${vertices} transformed fixture vertices within aggregate bounds; furniture/bridge spatial splitting and bridge/roof ranges preserved.`);
