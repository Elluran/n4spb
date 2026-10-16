// Exact shadow-caster selection and restoration, without a GPU.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { installShadowSectorCulling } from '../src/core/renderer.js';

const scene = new THREE.Scene(), root = new THREE.Group(), frozen = new THREE.Group(), camera = new THREE.PerspectiveCamera();
scene.add(frozen); frozen.add(root);
const material = new THREE.MeshBasicMaterial(), geo = new THREE.BoxGeometry(2, 8, 2);
function sector(x, z, casts = true) {
  const group = new THREE.Group(); root.add(group);
  for (let n = 0; n < 8; n++) {
    const mesh = new THREE.Mesh(geo, material); mesh.position.set(x + n * 2, 4, z); mesh.castShadow = casts; group.add(mesh);
  }
  return group;
}
const near = sector(0, 0), distant = sector(1000, 1000), noCasters = sector(0, 0, false), hidden = sector(0, 0), border = sector(40, 0);
hidden.visible = false;
const uncullable = sector(2000, 0); uncullable.children[0].frustumCulled = false;
const custom = sector(3000, 0); custom.children[0].onBeforeShadow = () => {};
const scaled = sector(-40, 0); scaled.children[0].scale.set(100, 2, 2);
const instanced = new THREE.InstancedMesh(geo, material, 2);
instanced.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 4, -25)); instanced.setMatrixAt(1, new THREE.Matrix4().makeTranslation(100, 4, -25)); instanced.castShadow = true;
const instanceGroup = new THREE.Group(); instanceGroup.add(instanced); root.add(instanceGroup);
const moving = new THREE.InstancedMesh(geo, material, 1); moving.instanceMatrix.setUsage(THREE.DynamicDrawUsage); moving.castShadow = true;
moving.setMatrixAt(0, new THREE.Matrix4().makeTranslation(3000, 4, 0)); moving.computeBoundingSphere();
const movingGroup = new THREE.Group(); movingGroup.add(moving); root.add(movingGroup);
scene.updateMatrixWorld(true);

function sun(x, z) {
  const light = new THREE.DirectionalLight(); light.position.set(x + 30, 100, z + 20); light.target.position.set(x, 0, z);
  const c = light.shadow.camera; c.left = c.bottom = -45; c.right = c.top = 45; c.near = 1; c.far = 250; c.updateProjectionMatrix();
  scene.add(light, light.target); scene.updateMatrixWorld(true); return light;
}
const light = sun(0, 0), light2 = sun(1000, 1000), lights = [light];
let drawn = [], visits = 0, fail = false, callbackVisibility = null;
const renderer = { shadowMap: { enabled: true, autoUpdate: false, needsUpdate: true, type: THREE.PCFSoftShadowMap,
  render(active, target, view) {
    drawn = []; visits = 0;
    callbackVisibility = root.children.map(g => g.visible);
    for (const l of active) {
      l.shadow.updateMatrices(l); const frustum = l.shadow.getFrustum();
      const visit = o => {
        if (!o.visible) return; visits++;
        if (o.isMesh && o.castShadow && (!o.frustumCulled || frustum.intersectsObject(o))) drawn.push(o.id);
        for (const c of o.children) visit(c);
      };
      visit(target);
    }
    if (fail) throw new Error('shadow failed');
  },
} };
const pipeline = { sectorsRoot: root, frozenRoot: frozen, cullShadowSectors: true };
installShadowSectorCulling(renderer, pipeline);
function compare(active = lights) {
  const before = root.children.map(g => g.visible);
  pipeline.cullShadowSectors = false; renderer.shadowMap.render(active, scene, camera); const expected = [...drawn], oldVisits = visits;
  pipeline.cullShadowSectors = true; renderer.shadowMap.render(active, scene, camera);
  assert.deepEqual(drawn, expected, 'sector rejection preserves exactly the same shadow draw list');
  assert.deepEqual(root.children.map(g => g.visible), before, 'shadow visibility restored for colour');
  return { oldVisits, visits };
}
const first = compare();
assert.ok(first.visits < first.oldVisits - 12, 'distant and shadowless subtrees are skipped');
assert.equal(callbackVisibility[root.children.indexOf(distant)], false, 'far sector rejected');
assert.equal(callbackVisibility[root.children.indexOf(noCasters)], false, 'sector without casters rejected');
assert.equal(callbackVisibility[root.children.indexOf(uncullable)], true, 'explicitly uncullable mesh preserved');
assert.equal(callbackVisibility[root.children.indexOf(custom)], true, 'custom shadow callback preserved');
assert.equal(callbackVisibility[root.children.indexOf(scaled)], true, 'scaled sphere spanning the shadow volume preserved');
assert.equal(callbackVisibility[root.children.indexOf(movingGroup)], true, 'dynamic instance attribute opts out even without userData.dynamic');
moving.setMatrixAt(0, new THREE.Matrix4().makeTranslation(0, 4, 0)); moving.computeBoundingSphere(); compare();
assert.ok(drawn.includes(moving.id), 'moving instances enter the sun volume without stale sector bounds');
compare([light, light2]);
assert.equal(callbackVisibility[root.children.indexOf(distant)], true, 'sector in a second light frustum retained');

light.position.x += 1000; light.position.z += 1000; light.target.position.x += 1000; light.target.position.z += 1000; scene.updateMatrixWorld(true);
compare();
assert.equal(callbackVisibility[root.children.indexOf(distant)], true, 'moving shadow volume updates before culling');
const added = new THREE.Mesh(geo, material); added.position.set(1000, 4, 1000); added.castShadow = true; noCasters.add(added); scene.updateMatrixWorld(true);
compare();
assert.equal(callbackVisibility[root.children.indexOf(noCasters)], true, 'new child invalidates cached sector bounds');

for (const change of [() => { renderer.shadowMap.type = THREE.VSMShadowMap; }, () => { renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.needsUpdate = false; }, () => { renderer.shadowMap.needsUpdate = true; pipeline.frozenRoot = null; }]) {
  change(); compare();
  assert.equal(callbackVisibility[root.children.indexOf(near)], true, 'unsupported/not-updating paths keep original traversal');
}
pipeline.frozenRoot = frozen;
const point = new THREE.PointLight(); scene.add(point); scene.updateMatrixWorld(true); compare([point]);
assert.equal(callbackVisibility[root.children.indexOf(near)], true, 'cube shadow retains original traversal');
const beforeFailure = root.children.map(g => g.visible); fail = true;
assert.throws(() => renderer.shadowMap.render(lights, scene, camera), /shadow failed/);
assert.deepEqual(root.children.map(g => g.visible), beforeFailure, 'throwing renderer restores every temporarily hidden sector');
console.log(`RESULT: OK (identical shadow draw lists, ${first.oldVisits} -> ${first.visits} visited objects; transforms, instancing, moving/multiple lights, zones, fallback and exception restoration)`);
