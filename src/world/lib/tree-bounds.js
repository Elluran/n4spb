// tree-bounds.js - conservative bounds for the immutable placement sets behind landmark tree LODs.
// Every bucket may eventually contain any tree of its species. Bound that complete set once so
// repacking never invalidates culling, and leave 2 m for leafmat.js world-space wind displacement
// (the current 0.96-strength wind moves a tip by <0.35 m; the margin also covers wind strength 6).
//
// Change-tracked repacks (2026-10-15, perf plan item 2): the landmark generators repack every LOD
// bucket from scratch whenever the player has moved 4 m and then flag the whole instance buffers for
// upload, although most trees keep their bucket and slot. prepareTreeLods gives each instance
// attribute a needsUpdate setter that diffs the array against a persistent shadow copy (int32 words,
// one pass, no allocation) and uploads only the changed span, or nothing when the repack rewrote
// identical data. Pending ranges of hidden meshes are kept and capped by collapsing into one span.
// A/B: ?treerepack=0 restores the plain three.js whole-buffer upload.
import * as THREE from 'three';

export const TREE_WIND_MARGIN = 2;
const query = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
const culling = !query || query.get('treecull') !== '0';
const tracking = !query || query.get('treerepack') !== '0';
const MAX_PENDING = 32;

function track(attribute, mesh) {
  if (!tracking || !attribute) return;
  if (attribute.treeRepack) { if (!attribute.treeRepack.meshes.includes(mesh)) attribute.treeRepack.meshes.push(mesh); return; }
  const array = attribute.array, size = attribute.itemSize;
  // A diff is only exact over plain 32-bit words; other layouts keep the whole-buffer upload.
  if (!(array instanceof Float32Array)) return;
  if (array.byteOffset & 7) return;
  const words = new Int32Array(array.buffer, array.byteOffset, array.length), shadow = new Int32Array(array.length + 1);
  const wide = new Float64Array(array.buffer, array.byteOffset, array.length >> 1), wideShadow = new Float64Array(shadow.buffer, 0, array.length >> 1);
  // shadow[0, synced) mirrors what the GPU holds (or will hold once pending ranges upload). Only the
  // drawn prefix (largest count of the meshes sharing the attribute) is diffed; slots that enter
  // the prefix beyond the mirrored part upload unconditionally.
  const state = { meshes: [mesh], synced: 0, flag };
  attribute.treeRepack = state;
  // A prototype with the diffing setter keeps the attribute a fast-mode object (an own accessor made
  // every later property access on it slow).
  Object.setPrototypeOf(attribute, trackedPrototype(Object.getPrototypeOf(attribute)));
  function flag(value) {
      if (value !== true) return;
      let count = 0; for (const m of state.meshes) if (m.count > count) count = m.count;
      const n = Math.min(count * size, words.length), mirrored = Math.min(n, state.synced);
      let lo = -1, hi = -1;
      if (attribute.array !== array) { lo = 0; hi = words.length - 1; }      // replaced array: upload it all
      else {
        // First and last differing word over the mirrored prefix (tight compare-only loops), then copy.
        // Pairs of words compare as float64 (half the iterations). A pair that reads as NaN is never
        // equal (a harmless extra upload); +0/-0 pairs differ only in a float32 sign of zero.
        const pairs = mirrored >> 1;
        let a = 0, b = pairs - 1;
        while (a < pairs && wide[a] === wideShadow[a]) a++;
        if (a < pairs) { while (wide[b] === wideShadow[b]) b--; lo = a * 2; hi = b * 2 + 1; }
        if ((mirrored & 1) && words[mirrored - 1] !== shadow[mirrored - 1]) { if (lo < 0) lo = mirrored - 1; hi = mirrored - 1; }
        if (n > mirrored) { if (lo < 0) lo = mirrored; hi = n - 1; }
        for (let i = lo < 0 ? 0 : lo; i <= hi; i++) shadow[i] = words[i];
      }
      state.synced = n;
      if (lo < 0) return;                                                    // identical rewrite: no upload
      const ranges = attribute.updateRanges;
      let start = lo, end = hi + 1;
      if (attribute.array !== array) { attribute.clearUpdateRanges(); attribute.version++; return; }
      if (ranges.length >= MAX_PENDING) {                                     // hidden for a long time: one span
        for (let i = 0; i < ranges.length; i++) { const r = ranges[i]; if (r.start < start) start = r.start; if (r.start + r.count > end) end = r.start + r.count; }
        attribute.clearUpdateRanges();
      }
      attribute.addUpdateRange(start, end - start);
      attribute.version++;
  }
}
const prototypes = new Map();
function trackedPrototype(base) {
  let proto = prototypes.get(base);
  if (!proto) {
    proto = Object.create(base, { needsUpdate: { configurable: true, set(value) { this.treeRepack.flag(value); } } });
    prototypes.set(base, proto);
  }
  return proto;
}

export function prepareTreeLods(lods, matrices) {
  const transformed = new THREE.Sphere();
  for (const { im, tm } of lods) for (const mesh of [im, tm]) {
    if (!mesh) continue;
    const geometry = mesh.geometry;
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    const bound = new THREE.Sphere(); bound.makeEmpty();
    for (const matrix of matrices) { transformed.copy(geometry.boundingSphere).applyMatrix4(matrix); bound.union(transformed); }
    if (!bound.isEmpty()) bound.radius += TREE_WIND_MARGIN;
    mesh.boundingSphere = bound;
    mesh.frustumCulled = culling;
    mesh.visible = mesh.count > 0;
    mesh.userData.treeBounds = true;
    // LOD membership changes with the camera: never freeze a far-crown outline proxy for it.
    mesh.userData.dynamic = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (mesh.instanceColor) mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    track(mesh.instanceMatrix, mesh); track(mesh.instanceColor, mesh);
  }
}
