// Compact private batch outputs only, after far construction has read their
// original floats. 16-bit normalized normals/colours have < 1/65534
// component error. Positions, UVs, topology and all source geometry stay exact.
import * as THREE from 'three';
const privateBatches = new WeakSet();
export function privateStaticBatch(geometry) { privateBatches.add(geometry); return geometry; }

export function compactStaticAttributes(root) {
  const start = performance.now(), seen = new Set();
  const stats = { geometries: 0, attributes: 0, savedBytes: 0, ms: 0 };
  root.traverse(o => {
    const g = o.geometry;
    if (!g || !privateBatches.has(g) || seen.has(g)) return;
    seen.add(g); let packed = false;
    for (const [name, Type, scale, min, max] of [['normal', Int16Array, 32767, -1, 1], ['color', Uint16Array, 65535, 0, 1]]) {
      const a = g.attributes[name];
      if (!a || a.isInterleavedBufferAttribute || !(a.array instanceof Float32Array) || a.normalized || a.usage !== THREE.StaticDrawUsage || !a.array.length) continue;
      // HDR vertex colours/custom attributes keep floats instead of clamping.
      let safe = true;
      for (const value of a.array) if (!Number.isFinite(value) || value < min || value > max) { safe = false; break; }
      if (!safe) continue;
      const array = new Type(a.array.length);
      for (let i = 0; i < array.length; i++) array[i] = Math.round(a.array[i] * scale);
      const attribute = new THREE.BufferAttribute(array, a.itemSize, true);
      attribute.name = a.name; attribute.gpuType = a.gpuType;
      attribute.onUpload(a.onUploadCallback); // preserve deferred CPU release
      g.setAttribute(name, attribute);
      stats.savedBytes += a.array.byteLength - array.byteLength; stats.attributes++; packed = true;
    }
    if (packed) stats.geometries++;
  });
  stats.ms = Math.round(performance.now() - start); return stats;
}
