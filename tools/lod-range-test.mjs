// Hierarchical range rejection must preserve the old per-mesh LOD result, including
// effective visibility through every parent. CPU only; no WebGL context is created.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { LOD, SECTOR } from '../src/core/lod.js';
import { installShadowSectorCulling } from '../src/core/renderer.js';
import { splitInstanced } from '../src/core/spatial.js';
import { Physics } from '../src/core/physics.js';
import { createKnock } from '../src/core/knock.js';
import { knockInstances } from '../src/world/lib/knock-inst.js';

const root = new THREE.Group(), loose = new THREE.Group(); root.add(loose); LOD.init(root);
const oldRoot = new THREE.Group(), oldLoose = new THREE.Group(), oldColour = new THREE.Group(), oldND = new THREE.Group(); oldRoot.add(oldLoose, oldColour, oldND);
const pairs = [], sectors = new Map(), geometry = new THREE.BoxGeometry(2, 2, 2), material = new THREE.MeshBasicMaterial();
let seed = 381799;
function rand() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
function add(x, z, far, opts = {}, radius = 1) {
  const mesh = new THREE.Mesh(geometry, material); mesh.userData.testId = pairs.length;
  mesh.position.set(x, rand() * 50, z); mesh.rotation.y = rand() * Math.PI; mesh.scale.set(0.5 + rand() * 3, 0.5 + rand() * 3, 0.5 + rand() * 3); mesh.castShadow = !!opts.shadow; mesh.updateMatrix();
  if (opts.farProxy) mesh.userData.farProxy = true;
  const old = mesh.clone(); loose.add(mesh); oldLoose.add(old); LOD.add(mesh, x, z, radius, far, opts);
  const kx = Math.floor(x / SECTOR), kz = Math.floor(z / SECTOR), key = (kx + 4096) * 8192 + kz + 4096;
  let s = sectors.get(key);
  if (!s) { s = { cx: (kx + 0.5) * SECTOR, cz: (kz + 0.5) * SECTOR, r: SECTOR * 0.7072, items: [], loose: [], group: null, ndGroup: null }; sectors.set(key, s); }
  const it = { obj: old, cx: x, cz: z, r: radius, far, near: opts.near || 0, sector: !!opts.sector, nd: !!opts.nd, shadow: opts.shadow ?? old.castShadow, attached: !!opts.attach };
  s.items.push(it); s.r = Math.max(s.r, Math.hypot(x - s.cx, z - s.cz) + radius);
  if (opts.attach) {
    const key = it.nd ? 'ndGroup' : 'group';
    if (!s[key]) { s[key] = new THREE.Group(); (it.nd ? oldND : oldColour).add(s[key]); }
    s[key].add(old); old.matrixAutoUpdate = false;
  } else s.loose.push(it);
  pairs.push({ mesh, old, it, s, removed: false });
  return pairs.at(-1);
}
function remove(pair) {
  LOD.remove(pair.mesh); pair.mesh.removeFromParent(); pair.old.removeFromParent(); pair.removed = true;
  pair.s.items = pair.s.items.filter(it => it !== pair.it); pair.s.loose = pair.s.loose.filter(it => it !== pair.it);
}
const frustum = new THREE.Frustum(), matrix = new THREE.Matrix4(), sphere = new THREE.Sphere();
const camera = new THREE.PerspectiveCamera(62, 1.7, 0.25, 3000), player = new THREE.Vector3();
function legacyUpdate(p, c, { shadowR = 110, ndFar = 200 } = {}) {
  c.updateMatrixWorld(); frustum.setFromProjectionMatrix(matrix.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse));
  const stats = { sectors: sectors.size, visibleSectors: 0, visible: 0, hidden: 0, attached: LOD.stats.attached };
  function apply(it, on, s) {
    if (on && (it.far < Infinity || it.near)) {
      const sc = it.sector && s, dx = p.x - (sc ? s.cx : it.cx), dz = p.z - (sc ? s.cz : it.cz), d2 = dx * dx + dz * dz;
      if (it.near) { const lim = it.near * LOD.scale; on = !(d2 < lim * lim); }
      else { const lim = it.far * LOD.scale + (sc ? 0 : it.r); on = d2 < lim * lim; }
    }
    if (it.obj.userData._zh) return;
    it.obj.visible = on; if (on) stats.visible++; else stats.hidden++;
  }
  for (const s of sectors.values()) {
    sphere.center.set(s.cx, c.position.y, s.cz); sphere.radius = s.r;
    const inView = frustum.intersectsSphere(sphere), d = Math.hypot(c.position.x - s.cx, c.position.z - s.cz) - s.r;
    const nearShadow = d < shadowR, nd = inView && d < ndFar, vis = inView || nearShadow;
    if (vis) stats.visibleSectors++;
    if (s.group) s.group.visible = vis; if (s.ndGroup) s.ndGroup.visible = nd;
    if (!vis) { for (const it of s.loose) apply(it, false, s); continue; }
    for (const it of s.items) apply(it, it.nd ? nd : (inView || (nearShadow && it.shadow)), s);
  }
  return stats;
}
function effective(mesh) { for (let o = mesh; o; o = o.parent) if (!o.visible) return false; return true; }
function drawList(tree, f, shadow = false, sort = true) {
  const drawn = []; let visits = 0;
  function visit(o) {
    visits++; if (!o.visible) return;
    if (o.isMesh && (!shadow || o.castShadow) && f.intersectsObject(o)) drawn.push(o.userData.testId);
    for (const child of o.children) visit(child);
  }
  visit(tree); return { drawn: sort ? drawn.sort((a, b) => a - b) : drawn, visits };
}
function check(options = {}) {
  const expected = legacyUpdate(player, camera, options); LOD.update(player, camera, options);
  assert.deepEqual(LOD.stats, expected, 'exported counters retain the legacy meaning');
  root.updateMatrixWorld(true); oldRoot.updateMatrixWorld(true);
  for (const { mesh, old, removed } of pairs) if (!removed) {
    assert.equal(effective(mesh), effective(old), `effective visibility of ${mesh.userData.testId}`);
    assert.deepEqual(mesh.matrixWorld.elements, old.matrixWorld.elements, 'range parenting preserves world transforms');
  }
  assert.deepEqual(drawList(root, frustum).drawn, drawList(oldRoot, frustum).drawn, 'actual frustum-selected colour draws are identical');
  const shadowCamera = new THREE.OrthographicCamera(-120, 120, 120, -120, 1, 400);
  shadowCamera.position.set(player.x + 50, 150, player.z + 70); shadowCamera.lookAt(player.x, 0, player.z); shadowCamera.updateMatrixWorld();
  const shadowFrustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse));
  assert.deepEqual(drawList(root, shadowFrustum, true).drawn, drawList(oldRoot, shadowFrustum, true).drawn, 'shadow caster draws are identical');
}
for (let n = 0; n < 720; n++) add(rand() * 4200 - 2100, rand() * 4200 - 2100, [100, 350, 900, 1000, Infinity][n % 5], { attach: n % 6 !== 0, nd: n % 13 === 0, shadow: n % 3 !== 0, sector: n % 7 === 0, near: n % 19 === 0 ? 700 : 0, farProxy: n % 19 === 0 }, rand() * 220);
for (let frame = 0; frame < 280; frame++) {
  player.set(rand() * 6000 - 3000, 0, rand() * 6000 - 3000);
  camera.position.set(player.x + rand() * 30, rand() * 120, player.z + rand() * 30); camera.lookAt(rand() * 4000 - 2000, rand() * 50, rand() * 4000 - 2000);
  LOD.scale = frame % 29 === 0 ? -0.4 : frame % 23 === 0 ? 0 : 0.4 + rand() * 1.6;
  LOD.rangeCulling = frame % 11 !== 0;
  for (let n = 0; n < 8; n++) {
    const pair = pairs[Math.floor(rand() * pairs.length)]; if (pair.removed) continue;
    // Zone hides/restores local visibility independently, including while a range stays hidden.
    for (const o of [pair.mesh, pair.old]) {
      if (o.userData._zh) { o.userData._zh = false; o.visible = o.userData._zv; }
      else { o.userData._zv = o.visible; o.userData._zh = true; o.visible = false; }
    }
  }
  if (frame % 7 === 0) add(player.x + rand() * 200, player.z + rand() * 200, 350, { attach: frame % 14 === 0, shadow: true });
  if (frame % 17 === 0) { const pair = pairs[frame]; if (!pair.removed) remove(pair); }
  check({ shadowR: rand() * 200, ndFar: rand() * 350 });
}

// Removing every member and later adding the same range must not reuse a detached group.
const reset = add(10000, 10000, 100, { attach: true, shadow: true }); const priorGroup = reset.mesh.parent;
remove(reset); assert.equal(priorGroup.parent, null, 'empty range leaves the render tree');
const replacement = add(10000, 10000, 100, { attach: true, shadow: true }); assert.notEqual(replacement.mesh.parent, priorGroup);
player.set(10000, 0, 10000); camera.position.set(10000, 5, 10005); camera.lookAt(10000, 5, 9900); LOD.scale = 1; LOD.rangeCulling = true; check();
for (const o of [replacement.mesh, replacement.old]) o.visible = false;
check(); assert.ok(effective(replacement.mesh), 'same-range reset restores a local visibility change');

// Both exact sector limits and individual circles retain strict < semantics,
// including quality changes and points within a nanometre of the cutoff.
const tangent = add(20010, 20010, 100, { attach: true, shadow: true }, 7);
const sectorTangent = add(20010, 20010, 100, { attach: true, shadow: true, sector: true }, 7);
for (const pair of [tangent, sectorTangent]) for (const scale of [0, 0.7, 1, 1.4]) for (const delta of [-1e-9, 0, 1e-9]) {
  LOD.scale = scale;
  const x = pair.it.sector ? pair.s.cx : pair.it.cx, z = pair.it.sector ? pair.s.cz : pair.it.cz;
  player.set(x + 100 * scale + (pair.it.sector ? 0 : 7) + delta, 0, z);
  camera.position.set(player.x, 3, player.z + 5); camera.lookAt(x, 3, z); check();
}
LOD.scale = 1;

// A nested arrival must invalidate shadow bounds even if the sector child count stays fixed.
add(40190, 40000, 777, { attach: true, shadow: true });
player.set(40000, 0, 40000); camera.position.set(40000, 5, 40005); camera.lookAt(40000, 5, 39900); check();
const light = new THREE.DirectionalLight(); light.position.set(40000, 100, 40020); light.target.position.set(40000, 0, 40000);
light.shadow.camera.left = light.shadow.camera.bottom = -40; light.shadow.camera.right = light.shadow.camera.top = 40; light.shadow.camera.far = 250;
root.add(light, light.target); root.updateMatrixWorld(true);
let shadowDraws;
const renderer = { shadowMap: { enabled: true, autoUpdate: false, needsUpdate: true, type: THREE.PCFSoftShadowMap, render() { light.shadow.updateMatrices(light); shadowDraws = drawList(root, light.shadow.getFrustum(), true).drawn; } } };
const pipeline = { sectorsRoot: LOD.root, frozenRoot: root, cullShadowSectors: true }; installShadowSectorCulling(renderer, pipeline);
renderer.shadowMap.render([light], root, camera);
const arriving = add(40005, 40000, 777, { attach: true, shadow: true }); check();
pipeline.cullShadowSectors = false; renderer.shadowMap.render([light], root, camera); const expectedShadow = shadowDraws;
pipeline.cullShadowSectors = true; renderer.shadowMap.render([light], root, camera); assert.deepEqual(shadowDraws, expectedShadow);
assert.ok(shadowDraws.includes(arriving.mesh.userData.testId), 'nested same-range arrival enters the cached sun volume');
for (const pair of pairs) if (!pair.removed && pair.it.attached && pair.it.near) assert.equal(pair.mesh.parent.parent, pair.it.nd ? LOD.ndRoot : LOD.root, 'far proxies stay directly under a sector for upload');

// Representative dense sector workload: enough short-range members to expose traversal
// and registry costs. Timing is diagnostic; equivalence above is the correctness gate.
for (let sx = -5; sx <= 5; sx++) for (let sz = -5; sz <= 5; sz++) for (let n = 0; n < 180; n++) add(sx * 320 + rand() * 320, sz * 320 + rand() * 320, [350, 350, 900, 1000, Infinity][n % 5], { attach: true, shadow: n % 3 !== 0, sector: n % 5 === 3 }, 1 + rand() * 20);
player.set(160, 0, 160); camera.position.set(160, 4, 160); camera.lookAt(160, 4, -500); root.updateMatrixWorld(true); oldRoot.updateMatrixWorld(true); check();
const oldVisits = drawList(oldRoot, frustum).visits, newVisits = drawList(root, frustum).visits;
assert.ok(newVisits < oldVisits * 0.7, 'whole hidden ranges reduce renderer object visits');
function time(fn) { for (let n = 0; n < 30; n++) fn(); const start = performance.now(); for (let n = 0; n < 300; n++) fn(); return (performance.now() - start) / 300; }
const legacyMs = time(() => legacyUpdate(player, camera)), groupedMs = time(() => LOD.update(player, camera));
const legacyWalkMs = time(() => { legacyUpdate(player, camera); drawList(oldRoot, frustum, false, false); }), groupedWalkMs = time(() => { LOD.update(player, camera); drawList(root, frustum, false, false); });
// Knockable instances (core/knock.js): their authored finite range survives the engine's instance pass and they are never cell-split again (the Dynamic usage keeps them out of it).
{
  const kroot = new THREE.Group(), kctx = { physics: new Physics(() => 0), onUpdate() {}, addStatic: o => kroot.add(o), noOutline: o => o };
  kctx.knock = createKnock(kctx);
  const spots = []; for (let i = 0; i < 40; i++) spots.push({ x: 20000 + i * 150, y: 0, z: 20000 + (i % 3) * 400, rotY: 0 });
  const made = knockInstances(kctx, { name: 'knock-range', parts: [{ geo: geometry, mat: material, far: 333 }], spots, far: 250, rec: { kind: 'lamp', mass: 100, h: 3, r: 0.2, anchored: 10 } });
  const plain = new THREE.InstancedMesh(geometry, material, 40); for (let i = 0; i < 40; i++) plain.setMatrixAt(i, new THREE.Matrix4().makeTranslation(20000 + i * 150, 0, 21500)); plain.computeBoundingSphere(); kroot.add(plain);
  const before = made.meshes.map(m => ({ m, far: LOD.of(m).far, count: m.count }));
  assert(before.length > 1 && before.every(b => b.far === 333), 'cell meshes carry the authored far of the part');
  const report = splitInstanced(kroot); assert(report.split >= 1, 'the plain static mesh is split (control)');
  for (const b of before) { assert.equal(LOD.of(b.m).far, 333, 'a knock mesh keeps its authored finite range'); assert.equal(b.m.count, b.count); assert(b.m.parent === kroot, 'still loose in its module root: not cell-split, not attached to a sector'); assert.equal(b.m.instanceMatrix.usage, THREE.DynamicDrawUsage); }
  assert.equal(kroot.children.filter(o => o.isInstancedMesh && o.userData.knock).length, before.length, 'no knock mesh was replaced or duplicated');
}
console.log(`RESULT: OK (${pairs.length} registrations; randomized camera/scale/zone/shadow/add/remove equivalence; visits ${oldVisits} -> ${newVisits}; CPU LOD ${legacyMs.toFixed(3)} -> ${groupedMs.toFixed(3)} ms; LOD + frustum walk ${legacyWalkMs.toFixed(3)} -> ${groupedWalkMs.toFixed(3)} ms)`);
