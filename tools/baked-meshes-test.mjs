// Baked culling bounds must match generated geometry, including legacy files.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { packGeometry, unpackGeometry, packMeshes, unpackMeshes } from '../src/core/baked-meshes.js';
import { encodeBaked, decodeBaked } from '../src/core/baked-codec.js';

const geometry = new THREE.BoxGeometry(2, 5, 3, 3, 2, 4);
geometry.translate(1, -2, 3); geometry.setDrawRange(3, geometry.index.count - 6);
geometry.computeBoundingBox(); geometry.computeBoundingSphere();
const material = new THREE.MeshBasicMaterial(), source = new THREE.InstancedMesh(geometry, material, 4);
const matrix = new THREE.Matrix4();
for (let i = 0; i < source.count; i++) {
  matrix.makeRotationY(i * 0.7); matrix.setPosition(i * 73 - 90, i - 3, -i * 42);
  source.setMatrixAt(i, matrix); source.setColorAt(i, new THREE.Color().setRGB(i / 4, 0.2, 0.7));
}
source.position.set(15, -7, 32); source.rotation.y = 0.31;
source.name = 'bounds-regression'; source.castShadow = true; source.userData.bakedLOD = { far: 900 };
source.computeBoundingBox(); source.computeBoundingSphere(); source.updateMatrixWorld(true);
const plain = new THREE.Mesh(geometry, material); plain.updateMatrixWorld(true);
const packed = decodeBaked(encodeBaked(packMeshes([source, plain], new Map([[material, 0]]))).buffer);

// Fresh bakes need no vertex/instance scans at hydration time.
const originals = [];
for (const proto of [THREE.BufferGeometry.prototype, THREE.InstancedMesh.prototype]) {
  for (const method of ['computeBoundingBox', 'computeBoundingSphere']) {
    originals.push([proto, method, proto[method]]);
    proto[method] = () => { throw new Error(`Unexpected runtime ${method}`); };
  }
}
let restored;
try { restored = unpackMeshes(packed, [material]); }
finally { for (const [proto, method, fn] of originals) proto[method] = fn; }
const [instanced, mesh] = restored.children;
assert.equal(instanced.count, source.count); assert.equal(instanced.name, source.name);
assert.equal(instanced.castShadow, source.castShadow); assert.deepEqual(instanced.userData, source.userData);
assert(instanced.matrixWorld.elements.every((value, i) => Math.abs(value - source.matrixWorld.elements[i]) < 1e-12),
  'decomposed/recomposed world transform stays within floating-point precision');
assert.equal(instanced.instanceMatrix.array, packed.objects[0].instanceMatrix, 'adopt the decoded instance buffer');
assert.deepEqual(instanced.instanceMatrix.array, source.instanceMatrix.array);
assert.deepEqual(instanced.instanceColor.array, source.instanceColor.array);
assert(instanced.boundingBox.equals(source.boundingBox)); assert(instanced.boundingSphere.equals(source.boundingSphere));
assert(mesh.geometry.boundingBox.equals(geometry.boundingBox)); assert(mesh.geometry.boundingSphere.equals(geometry.boundingSphere));
assert.deepEqual(mesh.geometry.drawRange, geometry.drawRange); assert.deepEqual(mesh.geometry.groups, geometry.groups);
assert.equal(instanced.geometry, mesh.geometry, 'geometry aliases survive hydration');
for (const key of Object.keys(geometry.attributes)) assert.deepEqual(mesh.geometry.attributes[key].array, geometry.attributes[key].array);
assert.deepEqual(mesh.geometry.index.array, geometry.index.array);

// Earlier manifests remain usable during development and restore identical bounds.
for (const g of packed.geometries) delete g.bounds;
for (const object of packed.objects) delete object.bounds;
const old = unpackMeshes(packed, [material]).children[0];
assert(old.geometry.boundingBox.equals(geometry.boundingBox)); assert(old.geometry.boundingSphere.equals(geometry.boundingSphere));
assert(old.boundingBox.equals(source.boundingBox)); assert(old.boundingSphere.equals(source.boundingSphere));
const empty = new THREE.BufferGeometry(); empty.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
const emptyRestored = unpackGeometry(decodeBaked(encodeBaked(packGeometry(empty)).buffer));
assert(emptyRestored.boundingBox.isEmpty()); assert(emptyRestored.boundingSphere.equals(empty.boundingSphere));
console.log('RESULT: OK (cached/legacy geometry and instance bounds, shared buffers, transforms, attributes, empty geometry)');
