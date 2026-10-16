// Lazy outline (normal / depth) proxies, core/ndproxy.js (plan item 4, 2026-10-15). Node only, no GPU.
// 1. lazy scan + flushAll yields the same proxy multiset as the eager build (bytes, tags, layers, LOD registrations, sector parents);
// 2. NDLazy.update builds every cell within ndFar + 8 m of the camera at once, along a moving path with a teleport, and nothing beyond the prefetch radius;
// 3. a source whose arrays release on upload keeps them until its last cell is built, then releases;
// 4. never-drawn far-proxy cells (authored near beyond the ND range at the minimum LOD scale) are dropped, reachable ones are kept;
// 5. a 185 k-vertex region scan (the 760 ms city-base attach of the plan) stays under 50 ms.
// node tools/ndproxy-lazy-test.mjs [--json]
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildNDProxy, NDLazy } from '../src/core/ndproxy.js';
import { LOD } from '../src/core/lod.js';
import { LAYER_COLOR } from '../src/core/renderer.js';

const material = new THREE.MeshBasicMaterial();
function releaseArray() { this.array = new this.array.constructor(0); this.released = true; }
function fixture() {
  const root = new THREE.Group(), sources = [];
  const mesh = (g, name, parent = root) => { const o = new THREE.Mesh(g, material); o.name = name; parent.add(o); sources.push(o); return o; };
  const wide = mesh(new THREE.PlaneGeometry(4100, 1500, 300, 220), 'wide'); wide.rotation.set(-Math.PI / 2, .13, .07); wide.position.set(431, 4, -390); wide.scale.x = -1;
  const dense = mesh(new THREE.PlaneGeometry(10, 10, 300, 230), 'dense'); dense.rotation.x = -Math.PI / 2; dense.position.set(31, 2, 31);
  const deep = new THREE.Group(); deep.userData.undergroundOnly = true; deep.userData.zone = 'fixture-deep'; root.add(deep);
  mesh(new THREE.BoxGeometry(350, 12, 260, 7, 3, 6), 'deep', deep).position.set(-970, -23, 337);
  const tagged = new THREE.Group(); tagged.userData.surfaceOnly = true; tagged.userData.zone = 'fixture-surface'; root.add(tagged);
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 7, 3), material, 31); tagged.add(inst); sources.push(inst);
  for (let k = 0; k < inst.count; k++) inst.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(-1500 + k * 101, 5, (k % 5) * 137 - 300), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), k * .13), new THREE.Vector3(k % 2 ? -1 : 1, 1 + k % 3, 1)));
  // compacted normals (normalized Int16) and a source that releases its arrays on upload (core/spatial.js releaseOnUpload)
  const compact = new THREE.SphereGeometry(30, 40, 30); const n = compact.attributes.normal.array, q = new Int16Array(n.length); for (let i = 0; i < n.length; i++) q[i] = Math.round(n[i] * 32767);
  compact.setAttribute('normal', new THREE.BufferAttribute(q, 3, true));
  for (const a of [compact.attributes.position, compact.attributes.normal, compact.index]) a.onUpload(releaseArray);
  mesh(compact, 'compact-released').position.set(900, 10, 600);
  // authored ranges: a far proxy (near 2000: never inside the ND range), a statue detail (far 120) and a near-switched replacement reachable within the ND range (near 300)
  const far = mesh(new THREE.BoxGeometry(20, 40, 20), 'farproxy'); far.position.set(-400, 20, -900);
  const stat = mesh(new THREE.TorusKnotGeometry(4, 1, 80, 12), 'statue'); stat.position.set(200, 6, 200);
  const repl = mesh(new THREE.BoxGeometry(8, 8, 8), 'replacement'); repl.position.set(-200, 4, 260);
  for (let i = 0; i < 400; i++) { const b = mesh(new THREE.BoxGeometry(4 + i % 7, 10 + i % 13, 5), 'house' + i); b.position.set(((i * 73) % 3000) - 1500, 5, ((i * 151) % 2400) - 1200); b.rotation.y = i * .37; }
  root.updateMatrixWorld(true);
  return { root, sources, far, stat, repl, compact };
}
function setup(F) {
  LOD.items = []; LOD.sectors = new Map(); LOD.init(F.root);
  LOD.add(F.far, -400, -900, 30, Infinity, { near: 2000 });
  LOD.add(F.stat, 200, 200, 8, 120);
  LOD.add(F.repl, -200, 260, 7, Infinity, { near: 300 });
}
function proxyHashes() {
  const out = [];
  for (const it of LOD.items) {
    if (!it.nd) continue;
    const o = it.obj, g = o.geometry, h = createHash('sha256');
    h.update(JSON.stringify({ ud: o.userData, layers: o.layers.mask, lod: [it.cx, it.cz, it.r, String(it.far), it.near, it.sector, it.shadow], parent: o.parent.name, sphere: [g.boundingSphere.center.toArray(), g.boundingSphere.radius] }));
    for (const a of [g.attributes.position, g.attributes.normal, g.index]) { h.update(a.array.constructor.name); h.update(new Uint8Array(a.array.buffer, a.array.byteOffset, a.array.byteLength)); }
    out.push(h.digest('hex'));
  }
  return out.sort();
}
const res = {};
// 1. eager vs lazy + flushAll
let F = fixture(); setup(F);
let t = performance.now(); const eager = buildNDProxy(F.root, { cell: 128, material }); res.eagerMs = Math.round(performance.now() - t);
const eagerSet = proxyHashes(), eagerLayers = F.sources.map(o => o.layers.mask);
F = fixture(); setup(F); NDLazy.reset();
t = performance.now(); const lazy = buildNDProxy(F.root, { cell: 128, material, lazy: true }); res.lazyScanMs = Math.round(performance.now() - t);
assert.deepEqual(F.sources.map(o => o.layers.mask), eagerLayers, 'originals leave the ND pass at scan time');
for (const o of F.sources) assert.equal(o.layers.mask, 1 << LAYER_COLOR);
// 3. hold: simulate the GPU upload of the released-on-upload source before its cell exists
for (const a of [F.compact.attributes.position, F.compact.attributes.normal, F.compact.index]) a.onUploadCallback();
assert(!F.compact.attributes.position.released && F.compact.attributes.position.array.length > 0, 'held source keeps its CPU arrays while its cell is pending');
res.pendingAfterScan = lazy.pending; res.builtAtScan = lazy.meshes;
t = performance.now(); NDLazy.flushAll(); res.flushMs = Math.round(performance.now() - t);
assert(F.compact.attributes.position.released && F.compact.attributes.normal.released && F.compact.index.released, 'released once its last cell was built');
assert.equal(lazy.lost, 0); assert.equal(lazy.pending, 0);
assert.equal(lazy.meshes, eager.meshes); assert.equal(lazy.triangles, eager.triangles); assert.equal(lazy.sources, eager.sources);
assert(Math.abs(lazy.mb - eager.mb) < 0.2, 'byte estimate');
assert.deepEqual(proxyHashes(), eagerSet, 'lazy proxies equal the eager ones');
res.meshes = eager.meshes; res.triangles = eager.triangles;
// 2. moving camera: every cell within ndFar + 8 m is built synchronously; nothing beyond ndFar + prefetch is built
F = fixture(); setup(F); NDLazy.reset();
const ndFar = 150, prefetch = 150; Object.assign(NDLazy, { ndFar, prefetch, budget: 0.5 });
buildNDProxy(F.root, { cell: 128, material, lazy: true });
const pend = NDLazy.all.slice(), rect = (g, x, z) => Math.hypot(Math.max(g.x0 - x, 0, x - g.x1), Math.max(g.z0 - z, 0, z - g.z1));
const pathAt = (s) => s === 300 ? [1500, -1000] : [-1400 + s * 7, -600 + s * 3 + (s > 200 ? (s - 200) * 6 : 0)];      // (s = 300: a teleport)
const cam = new THREE.Vector3(); let needMiss = 0, beyond = 0;
for (let s = 0; s <= 400; s++) {
  const [x, z] = pathAt(s); cam.set(x, 2, z);
  NDLazy.update(cam);
  for (const g of pend) if (!g.done && rect(g, x, z) <= ndFar + 8) needMiss++;
}
for (const g of pend) {
  if (!g.done || g.tg.u || g.tg.a) continue;
  let near = Infinity; for (let s = 0; s <= 400; s++) { const [x, z] = pathAt(s); near = Math.min(near, rect(g, x, z)); }
  if (near > ndFar + prefetch + 1) beyond++;
}
assert.equal(needMiss, 0, 'a cell within the ND range was left unbuilt');
assert.equal(beyond, 0, 'a cell beyond the prefetch radius was built');
res.path = { built: pend.filter(g => g.done).length, of: pend.length, syncBuilds: NDLazy._report.syncBuilds, buildMs: Math.round(NDLazy._report.buildMs) };
// 4. never-drawn far-proxy cells
F = fixture(); setup(F); NDLazy.reset();
const nv = buildNDProxy(F.root, { cell: 128, material, lazy: true, ndFar: 150, lodMin: 0.56 });
assert.equal(nv.dropped, 1, 'only the near-2000 far proxy cell is never drawn'); NDLazy.flushAll();
assert.equal(nv.meshes, eager.meshes - 1);
// 5. a streamed region: 37 meshes, ~185 k vertices (half of them wider than a cell)
const region = new THREE.Group();
for (let i = 0; i < 37; i++) { const wideM = i % 2 === 0; const g = wideM ? new THREE.PlaneGeometry(400, 300, 90, 90) : new THREE.BoxGeometry(30, 20, 30, 16, 16, 16); const m = new THREE.Mesh(g, material); m.position.set(i * 40, 0, (i % 5) * 60); if (wideM) m.rotation.x = -Math.PI / 2; region.add(m); }
let rv = 0; region.traverse(o => { if (o.isMesh) rv += o.geometry.attributes.position.count; });
LOD.items = []; LOD.sectors = new Map(); LOD.init(new THREE.Group()); NDLazy.reset();
const times = [];
for (let r = 0; r < 5; r++) { const grp = region.clone(); t = performance.now(); buildNDProxy(grp, { cell: 128, material, lazy: true }); times.push(performance.now() - t); NDLazy.reset(); }
times.sort((a, b) => a - b); res.region = { vertices: rv, scanMsMedian: +times[2].toFixed(1), scanMsMax: +times[4].toFixed(1) };
LOD.items = []; LOD.sectors = new Map(); LOD.init(new THREE.Group());
const eg = region.clone(); t = performance.now(); buildNDProxy(eg, { cell: 128, material }); res.region.eagerMs = Math.round(performance.now() - t);
assert(res.region.scanMsMedian < 50, `region attach scan ${res.region.scanMsMedian} ms >= 50 ms`);
console.log(process.argv.includes('--json') ? JSON.stringify(res) : 'ndproxy-lazy-test OK ' + JSON.stringify(res));
