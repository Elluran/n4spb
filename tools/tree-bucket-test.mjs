// CPU-only equivalence/benchmark against the pre-persistent checkpoint. No renderer, browser or GPU.
// node tools/tree-bucket-test.mjs [--baseline=c8215009]
// node --expose-gc --max-semi-space-size=256 tools/tree-bucket-test.mjs  (adds per-route heap growth, KB)
// Production camera callbacks and geometry are used; only environment placement is injected with
// the actual deterministic Smolensky plan to avoid constructing the unrelated city occupancy field.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import * as THREE from 'three';
import { plan } from '../src/world/landmarksSmolensky/place.js';
import { plantForest, LEAF } from '../src/world/landmarksSmolensky/forest.js';
import * as geo from '../src/world/environment/treegeo.js';
import * as leaf from '../src/world/environment/leafmat.js';
import { createTreeInstanceWriter } from '../src/world/environment/tree-instances.js';

const revision = process.argv.find(a => a.startsWith('--baseline='))?.slice(11) || 'c8215009';
assert.match(revision, /^[\w.-]+$/, 'baseline is a git revision');
const root = new URL('../', import.meta.url), read = file => fs.readFileSync(new URL(file, root), 'utf8');
const previous = file => execFileSync('git', ['show', `${revision}:102_3d_piter/${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 8e6 });
async function moduleSource(source, file) {
  const base = new URL(file, root);
  source = source.replace(/from\s+(['"])([^'"]+)\1/g, (_, quote, specifier) => {
    const resolved = specifier === 'three' ? import.meta.resolve('three') : new URL(specifier, base).href;
    return `from ${JSON.stringify(resolved)}`;
  });
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const baselineWriter = (await moduleSource(previous('src/world/environment/tree-instances.js'), 'src/world/environment/tree-instances.js')).createTreeInstanceWriter;
const baselineForest = (await moduleSource(previous('src/world/landmarksSmolensky/forest.js'), 'src/world/landmarksSmolensky/forest.js')).plantForest;
function environmentBuilder(source, writer, trees) {
  const start = source.indexOf('export function buildTrees('); assert(start >= 0);
  const parameters = { THREE, placeTrees: () => ({ list: structuredClone(trees), stats: {} }), ...geo, ...leaf,
    barkTexture: () => null, blobTexture: () => null, createTreeInstanceWriter: writer,
    LOD_D: [42, 150, 360], L: { WORLD: { play: {} }, HERO: { x: 0, z: 0 }, inPlay: () => true } };
  return new Function(...Object.keys(parameters), source.slice(start).replace('export function', 'return function'))(...Object.values(parameters));
}
const planned = await plan({}); assert(planned?.trees.length > 3000, 'actual large cemetery plan loaded');
const color = new THREE.Color();
const trees = [...planned.trees, ...planned.shrubs].map((t, i) => {
  const hex = (LEAF[t.fam] || LEAF.limeA)[i % 3], rgb = color.set(hex).multiplyScalar(t.br).toArray();
  return { ...t, hex, bright: t.br, rgb, tr: Math.max(.22, geo.SPECIES[t.fam].trunk * t.s * .7), r: 4 * t.s, h: 15 * t.s, sp: 'lime', shrub: t.fam === 'shrub' };
});
function context() {
  const updates = [], colliders = [], scene = new THREE.Group(), camera = new THREE.PerspectiveCamera(62, 16 / 9, .25, 7000);
  camera.position.set(0, 1.52, 0);
  const ctx = { camera, shared: {}, rng: () => () => .5, tex: { draw: () => null },
    mat: { toon: (color, o = {}) => new THREE.MeshToonMaterial({ color, vertexColors: !!o.vertexColors, map: o.map ?? null }), decal: color => new THREE.MeshBasicMaterial({ color }) },
    physics: { addCylinder: (...args) => { const c = { args }; colliders.push(c); return c; } },
    noBatch: o => { o.userData.noBatch = true; }, noOutline: o => o.layers.set(1), onUpdate: f => updates.push(f) };
  return { ctx, updates, colliders, scene, camera };
}
function setupForest(builder) {
  const r = context(); r.result = builder({ ctx: r.ctx, root: r.scene }, structuredClone(trees));
  r.meshes = r.scene.children[0].children; return r;
}
function setupEnvironment(source, writer) {
  const r = context(); r.result = environmentBuilder(source, writer, trees)(r.ctx, r.scene);
  r.meshes = r.scene.children[0].children; return r;
}
function update(r, pose, time) {
  r.camera.position.set(pose.x, pose.y ?? 1.52, pose.z);
  r.camera.rotation.set(pose.pitch ?? 0, pose.yaw ?? 0, 0, 'YXZ'); r.camera.updateMatrixWorld();
  for (const f of r.updates) f(1 / 60, time);
}
const poses = [];
// Walk then drive through the real forest, with threshold crossings and both camera-cone directions.
for (let i = 0; i < 100; i++) poses.push({ x: -5600 - i * 3.1, z: -1500 + i * 1.7, yaw: .55 });
for (let i = 0; i < 80; i++) poses.push({ x: -5900 + i * 7, z: -1300 + i * 2.2, yaw: -1.1 });
for (let i = 0; i < 40; i++) poses.push({ x: -5650, z: -1330, yaw: i * .16 });
poses.push({ x: -5650, z: -1330, y: 46 }, { x: -5650, z: -1330, pitch: -1.25 }, { x: -5650, z: -1330 });
// Exercise exact nominal/hysteresis distance boundaries in both directions, including shrub far removal.
for (const d of [28.8, 32, 35.2, 37.8, 42, 46.2, 85.5, 95, 104.5, 135, 150, 165, 216, 240, 264, 324, 360, 396]) {
  for (const delta of [-.001, .001, -.001]) poses.push({ x: trees[0].x + d + delta, z: trees[0].z, y: 46 });
}
poses.push({ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 1, z: 0, yaw: Math.PI }, { x: -5650, z: -1330 });
let compared = 0, uploaded = 0, baselineUploaded = 0;
function verify(actual, expected, label) {
  assert.equal(actual.meshes.length, expected.meshes.length, label);
  for (let m = 0; m < actual.meshes.length; m++) {
    const a = actual.meshes[m], b = expected.meshes[m];
    assert.equal(a.name, b.name); assert.equal(a.count, b.count, `${label}: ${a.name} count`);
    assert.equal(a.visible, b.visible, `${label}: ${a.name} visibility`);
    // Opaque slot order may change. Compare the exact float32 transform + color multiset instead.
    const rows = mesh => {
      const out = [];
      for (let i = 0; i < mesh.count; i++) {
        const matrix = mesh.instanceMatrix.array.subarray(i * 16, i * 16 + 16), c = mesh.instanceColor?.array.subarray(i * 3, i * 3 + 3);
        out.push([...matrix, ...(c || [])].join(','));
      }
      return out.sort();
    };
    assert.deepEqual(rows(a), rows(b), `${label}: ${a.name} matrix/color multiset`); compared += a.count;
  }
  assert.equal(actual.colliders.length, expected.colliders.length);
}
// Simulated GPU upload preserves pending writes while selected meshes remain unrendered.
const gpu = new WeakMap();
function upload(r, frame, measure = false) {
  const seen = new Set();
  for (let m = 0; m < r.meshes.length; m++) {
    const mesh = r.meshes[m];
    if (!mesh.visible || (frame + m) % 7 < 2) continue;
    for (const attribute of [mesh.instanceMatrix, mesh.instanceColor]) {
      if (!attribute || seen.has(attribute)) continue; seen.add(attribute);
      let record = gpu.get(attribute);
      // Three.js createBuffer uploads the whole buffer and leaves updateRanges until its first update.
      if (!record) { record = { version: attribute.version, data: attribute.array.slice() }; gpu.set(attribute, record); }
      else if (record.version !== attribute.version) {
        const ranges = attribute.updateRanges.length ? attribute.updateRanges : [{ start: 0, count: attribute.array.length }];
        for (const range of ranges) { record.data.set(attribute.array.subarray(range.start, range.start + range.count), range.start); if (measure) uploaded += range.count; else baselineUploaded += range.count; }
        record.version = attribute.version; attribute.clearUpdateRanges();
      }
      assert.deepEqual(record.data.subarray(0, mesh.count * attribute.itemSize), attribute.array.subarray(0, mesh.count * attribute.itemSize), 'visible prefix after skipped uploads');
      if (measure) assert(attribute.updateRanges.length <= 64, 'pending ranges bounded');
    }
  }
}
const variants = [
  ['environment', () => setupEnvironment(read('src/world/environment/trees.js'), createTreeInstanceWriter), () => setupEnvironment(previous('src/world/environment/trees.js'), baselineWriter)],
  // A/B path of the cell skipping (?treegrid=0): the plain per-tree loop must give the same buckets.
  ['environment ?treegrid=0', () => { globalThis.location = { search: '?treegrid=0' }; try { return setupEnvironment(read('src/world/environment/trees.js'), createTreeInstanceWriter); } finally { delete globalThis.location; } }, () => setupEnvironment(previous('src/world/environment/trees.js'), baselineWriter)],
  ['Smolensky', () => setupForest(plantForest), () => setupForest(baselineForest)],
];
const timings = [];
for (const [name, current, old] of variants) {
  const a = current(), b = old(); verify(a, b, `${name} initial`); upload(a, 0, true); upload(b, 0);
  for (let frame = 0; frame < poses.length; frame++) {
    update(a, poses[frame], frame * .4); update(b, poses[frame], frame * .4);
    if (frame === 120 && name.startsWith('environment')) {
      const points = [[trees[100].x, trees[100].z, 65]], kill = t => t.x < -6090;
      assert.equal(a.result.prune(points, kill), b.result.prune(points, kill));
      assert.deepEqual(a.result.info, b.result.info, 'pruned public metadata');
      assert.deepEqual(a.colliders, b.colliders, 'pruned colliders unchanged');
    }
    // Matrix multisets at all threshold/turn poses, plus periodic movement poses.
    if (frame % 9 === 0 || frame >= 180 || frame === 120) verify(a, b, `${name} frame ${frame}`);
    upload(a, frame, true); upload(b, frame);
  }
  const trial = (r, route) => {
    const begin = performance.now();
    for (let round = 0; round < 3; round++) for (let i = 0; i < route.length; i++) {
      update(r, route[i], (round * route.length + i) * .4);
      // Actual WebGL clears ranges after upload; emulate without including equality assertions.
      for (const mesh of r.meshes) if (mesh.visible) { mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceColor?.clearUpdateRanges(); }
    }
    return performance.now() - begin;
  };
  for (const [routeName, route] of [['walk-drive', poses.slice(0, 180)], ['camera-threshold-stress', poses]]) {
    trial(a, route); trial(b, route); // warm JIT
    const at = [], bt = [];
    for (let i = 0; i < 5; i++) { if (i % 2) { bt.push(trial(b, route)); at.push(trial(a, route)); } else { at.push(trial(a, route)); bt.push(trial(b, route)); } }
    at.sort((x, y) => x - y); bt.sort((x, y) => x - y);
    // Heap growth of one more trial (node --expose-gc --max-semi-space-size=256 keeps scavenges out of it).
    const allocated = r => { if (!globalThis.gc) return null; globalThis.gc(); const h0 = process.memoryUsage().heapUsed; trial(r, route); return Math.max(0, Math.round((process.memoryUsage().heapUsed - h0) / 1024)); };
    timings.push({ name, route: routeName, trees: trees.length, updates: route.length * 3, beforeMs: +bt[2].toFixed(2), afterMs: +at[2].toFixed(2), savedPercent: +(100 * (1 - at[2] / bt[2])).toFixed(1), beforeKB: allocated(b), afterKB: allocated(a) });
  }
}
// A single near/far transition must only touch the old tail replacement and one new slot.
const writer = createTreeInstanceWriter(trees), mesh = () => ({ instanceMatrix: new THREE.InstancedBufferAttribute(new Float32Array(trees.length * 16), 16), instanceColor: new THREE.InstancedBufferAttribute(new Float32Array(trees.length * 3), 3) });
const first = mesh(), second = mesh(), f = writer.bucket(first), s = writer.bucket(second);
for (let i = 0; i < trees.length; i++) writer.assign(f, i); writer.finish();
first.instanceMatrix.clearUpdateRanges(); first.instanceColor.clearUpdateRanges();
writer.assign(s, 1); writer.finish();
assert.equal(first.instanceMatrix.updateRanges.reduce((n, r) => n + r.count, 0), 16);
assert.equal(second.instanceMatrix.updateRanges.reduce((n, r) => n + r.count, 0), 16);
const version = first.instanceMatrix.version; writer.assign(f, 0); writer.finish(); assert.equal(first.instanceMatrix.version, version);
for (let i = 0; i < Math.min(1000, trees.length); i += 3) { writer.assign(s, i); writer.finish(); assert(first.instanceMatrix.updateRanges.length <= 64); }
console.log(JSON.stringify({ result: 'OK', baseline: revision, comparedInstances: compared, uploadFloats: uploaded, baselineUploadFloats: baselineUploaded, uploadSavedPercent: +(100 * (1 - uploaded / baselineUploaded)).toFixed(1), timings }, null, 2));
