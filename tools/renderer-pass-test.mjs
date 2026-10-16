// Pass scheduling/visibility regression without WebGL. Actual pixels are checked with tools/shot.mjs.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createRenderPipeline, MASK_ND, MASK_COLOR } from '../src/core/renderer.js';

const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.25, 1000), light = new THREE.DirectionalLight();
const staticRoot = new THREE.Group(), colourRoot = new THREE.Group(), ndRoot = new THREE.Group(), dynamicRoot = new THREE.Group();
scene.add(staticRoot, dynamicRoot, light); staticRoot.add(colourRoot, ndRoot);
const material = new THREE.MeshBasicMaterial(), geometry = new THREE.BoxGeometry(1, 1, 1);
const dynamic = new THREE.Mesh(geometry, material), loose = new THREE.Mesh(geometry, material); dynamicRoot.add(dynamic); staticRoot.add(loose);
const records = [], renderer = {
  shadowMap: { autoUpdate: true, needsUpdate: false },
  setRenderTarget(target) { this.target = target; }, setClearColor() {}, clear() {},
  render(s, c) {
    if (s !== scene) return;
    records.push({ mask: c.layers.mask, colour: colourRoot.visible, nd: ndRoot.visible, far: c.far, dynamic: dynamic.material, loose: loose.material, override: s.overrideMaterial });
  },
};
const pipeline = createRenderPipeline(renderer, {});
pipeline.sectorsRoot = colourRoot; pipeline.ndSectorsRoot = ndRoot; pipeline.ndRoots = [dynamicRoot]; pipeline.refreshND(staticRoot);
pipeline.render(scene, camera, new THREE.Vector3(1, 1, 1).normalize(), 0);
assert.equal(records.length, 2, 'combined outlines and colour need two scene traversals');
assert.equal(records[0].mask, MASK_ND); assert.equal(records[0].colour, false); assert.equal(records[0].nd, true);
assert.equal(records[0].dynamic, pipeline.ndMat); assert.equal(records[0].loose, pipeline.ndMat);
assert.equal(records[1].mask, MASK_COLOR); assert.equal(records[1].colour, true); assert.equal(records[1].nd, false);
assert.equal(records[1].dynamic, material); assert.equal(records[1].loose, material);
assert.equal(camera.far, 1000, 'colour camera range is restored');
assert.equal(colourRoot.visible, true); assert.equal(ndRoot.visible, true);
assert.equal(light.layers.isEnabled(2), true, 'both passes collect the same light');

records.length = 0; pipeline.combineND = false;
pipeline.render(scene, camera, new THREE.Vector3(1, 1, 1).normalize(), 0);
assert.deepEqual(records.map(r => r.mask), [4, 1, MASK_COLOR], 'debug route retains former pass masks');
assert.equal(records[1].nd, false, 'dynamic-only pass skips the static outline tree');
assert.equal(dynamic.material, material); assert.equal(loose.material, material);

records.length = 0; pipeline.ndRoots = null;
pipeline.render(scene, camera, new THREE.Vector3(1, 1, 1).normalize(), 0);
assert.deepEqual(records.map(r => r.mask), [4, 1, MASK_COLOR], 'fallback without cached mesh lists retains both outline passes');
assert.equal(records[1].override, pipeline.ndMat); assert.equal(scene.overrideMaterial, null);
console.log('RESULT: OK (combined outline pass, material/root restoration, light layers, old-route and fallback masks)');
