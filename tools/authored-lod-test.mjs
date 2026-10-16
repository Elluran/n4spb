// Authored detail and near/far variants must survive material batching and the
// outline pass with the same world-space switches (including transformed roots).
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { batchStatic } from '../src/core/batch2.js';
import { buildNDProxy } from '../src/core/ndproxy.js';
import { createMaterials } from '../src/core/materials.js';
import { registerLOD } from '../src/core/spatial.js';
import { LOD } from '../src/core/lod.js';

const root = new THREE.Group(), parent = new THREE.Group();
parent.position.set(700, 0, -1100); parent.rotation.y = .35; root.add(parent); LOD.init(root);
const mat = createMaterials({}).toon('#bdb7a1'), before = [];
for (const [far, near, x, dim] of [[110, 0, 0, 4], [480, 110, 0, 4], [350, 0, 50, 1400], [350, 0, 50, 1400], [1100, 0, 0, 60], [220, 0, 0, 1700]]) {
  const o = new THREE.Mesh(new THREE.BoxGeometry(dim, 12, 5), mat); o.position.x = x; o.castShadow = true; parent.add(o); o.updateWorldMatrix(true, false);
  registerLOD(o, far, { near }); before.push({ ...LOD.of(o), triangles: 12 });
}
const stats = batchStatic(root, { mat: createMaterials({}), atlasTextures: false, nearCell: 192, farCell: 640 });
assert.equal(stats.sources, 6); assert(stats.pieces > 0, 'exercise spatial splitting too');
assert.equal(stats.farProxies, 0, 'authored detail must not become a permanent skyline proxy');
for (const original of before) assert.equal(LOD.of(original.obj), null, 'replaced source unregistered');
const colour = LOD.items.filter(it => !it.nd);
const signature = it => [it.cx, it.cz, it.r, it.far, it.near, it.sector, it.shadow].join('/');
const sum = items => {
  const out = new Map();
  for (const it of items) out.set(signature(it), (out.get(signature(it)) || 0) + (it.triangles ?? it.obj.geometry.index.count / 3));
  return [...out].sort();
};
assert.deepEqual(sum(colour), sum(before), 'merged geometry retains each exact authored visibility contract');
buildNDProxy(root);
const proxies = LOD.items.filter(it => it.nd && (it.near || it.far < 350));
assert(proxies.length >= 2, 'short-range and replacement outlines retain independent switches');
const visible = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
const camera = new THREE.PerspectiveCamera(62, 1.7, .25, 7000), p = new THREE.Vector3();
let checks = 0;
for (const scale of [1, .8, .6]) for (const distance of [0, 60, 90, 110, 130, 180, 250, 500, 1400]) {
  LOD.scale = scale; p.set(700, 1.7, -1100 + distance); camera.position.copy(p); camera.lookAt(700, 5, -1100); camera.updateMatrixWorld();
  LOD.update(p, camera, { ndFar: 200, shadowR: 110 });
  for (const it of colour) {
    const d2 = (p.x - it.cx) ** 2 + (p.z - it.cz) ** 2;
    // Current registry's near-only replacement convention is intentionally
    // unchanged by batching; upper-distance policy belongs to the LOD registry.
    const expected = it.near ? d2 >= (it.near * scale) ** 2 : d2 < (it.far * scale + it.r) ** 2;
    assert.equal(visible(it.obj), expected, 'colour changes at original anchor/radius'); checks++;
  }
  for (const nd of proxies) {
    const source = colour.find(it => it.cx === nd.cx && it.cz === nd.cz && it.r === nd.r && it.far === nd.far && it.near === nd.near);
    assert(source);
    if (!visible(source.obj)) assert.equal(visible(nd.obj), false, 'hidden detail leaves no outline');
  }
}
console.log(`RESULT: OK (${checks} authored colour switches; matched short-range/replacement outlines; original registrations removed)`);
