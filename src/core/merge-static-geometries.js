// Typed merge for batch2's prepared, indexed, morph-cleared static geometries.
// Matches Three.mergeGeometries(..., false) ordering, attributes and index-width
// rule, without a city-wide ordinary-number mergedIndex array.
import * as THREE from 'three';

export function mergeStaticGeometries(geometries) {
  if (!geometries.length) return null;
  const first = geometries[0], names = Object.keys(first.attributes);
  const lengths = new Map(names.map(name => [name, 0]));
  let indexLength = 0, vertexOffset = 0, wideIndex = false;
  const invalid = reason => { console.error('Static geometry merge: ' + reason); return null; };
  for (const g of geometries) {
    if (!g.index || !g.attributes.position) return invalid('prepared indexed geometry required');
    if (Object.keys(g.morphAttributes).length) return invalid('morph attributes must be cleared before merging');
    if (g.morphTargetsRelative !== first.morphTargetsRelative) return invalid('incompatible morphTargetsRelative');
    if (Object.keys(g.attributes).length !== names.length) return invalid('incompatible attribute count');
    for (const name of names) {
      const a = g.attributes[name], ref = first.attributes[name];
      if (!a || a.isInterleavedBufferAttribute || a.array.constructor !== ref.array.constructor || a.itemSize !== ref.itemSize || a.normalized !== ref.normalized || a.gpuType !== ref.gpuType) return invalid('incompatible ' + name + ' attribute');
      lengths.set(name, lengths.get(name) + a.count * a.itemSize);
    }
    indexLength += g.index.count;
    // Three uses >=65535, accounting for PRIMITIVE_RESTART_FIXED_INDEX; do not
    // infer width from vertex count (unused high vertices need not widen it).
    if (!wideIndex) for (let i = 0; i < g.index.count; i++) if (g.index.getX(i) + vertexOffset >= 65535) { wideIndex = true; break; }
    vertexOffset += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry(), index = wideIndex ? new Uint32Array(indexLength) : new Uint16Array(indexLength);
  let write = 0; vertexOffset = 0;
  for (const g of geometries) {
    for (let i = 0; i < g.index.count; i++) index[write++] = g.index.getX(i) + vertexOffset;
    vertexOffset += g.attributes.position.count;
  }
  out.setIndex(new THREE.BufferAttribute(index, 1));
  for (const name of names) {
    const ref = first.attributes[name], array = new ref.array.constructor(lengths.get(name)); let offset = 0;
    for (const g of geometries) { const a = g.attributes[name]; array.set(a.array, offset); offset += a.count * a.itemSize; }
    const attr = new THREE.BufferAttribute(array, ref.itemSize, ref.normalized);
    if (ref.gpuType !== undefined) attr.gpuType = ref.gpuType;
    out.setAttribute(name, attr);
  }
  // Three checks input morphTargetsRelative compatibility but leaves the new
  // merged geometry's default false after batch preparation clears all targets.
  return out;
}

/** Only for private copies whose consumers already own independent typed arrays.
 * dispose() releases GPU state; explicitly detach CPU buffers too while a local
 * geometry reference is still on the batching stack. Never apply to a source. */
export function releasePrivateGeometry(g) {
  g.dispose();
  for (const name of Object.keys(g.attributes)) g.deleteAttribute(name);
  g.setIndex(null); g.morphAttributes = {};
}

/** Plans contain only counts/schema, never source buffers. Preserve the existing
 * preparation rounding with one private geometry alive while writing directly
 * into final typed buffers, instead of retaining every prepared group member. */
export function mergeStaticGeometryStream(plans, prepare) {
  if (!plans.length) return null;
  const first = plans[0], names = first.attributes.map(a => a.name);
  const lengths = new Map(names.map(name => [name, 0]));
  const invalid = reason => { console.error('Static geometry stream: ' + reason); return null; };
  let indexLength = 0, vertexOffset = 0, wideIndex = false;
  for (const plan of plans) {
    if (plan.relative !== first.relative || plan.attributes.length !== names.length) return invalid('incompatible prepared schema');
    for (const ref of first.attributes) {
      const a = plan.attributes.find(a => a.name === ref.name);
      if (!a || a.ArrayType !== ref.ArrayType || a.size !== ref.size || a.normalized !== ref.normalized || a.gpuType !== ref.gpuType) return invalid('incompatible ' + ref.name);
      lengths.set(ref.name, lengths.get(ref.name) + a.count * a.size);
    }
    wideIndex ||= plan.indexCount > 0 && plan.maxIndex + vertexOffset >= 65535;
    indexLength += plan.indexCount; vertexOffset += plan.vertices;
  }
  const out = new THREE.BufferGeometry(), index = wideIndex ? new Uint32Array(indexLength) : new Uint16Array(indexLength);
  out.setIndex(new THREE.BufferAttribute(index, 1));
  const offsets = new Map(names.map(name => [name, 0]));
  for (const spec of first.attributes) {
    const a = new THREE.BufferAttribute(new spec.ArrayType(lengths.get(spec.name)), spec.size, spec.normalized);
    if (spec.gpuType !== undefined) a.gpuType = spec.gpuType;
    out.setAttribute(spec.name, a);
  }
  let indexOffset = 0; vertexOffset = 0;
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i], g = prepare(i);
    try {
      if (!g.index || g.index.count !== plan.indexCount || g.attributes.position.count !== plan.vertices || Object.keys(g.attributes).length !== names.length || Object.keys(g.morphAttributes).length) return invalid('preparation count changed');
      for (const spec of plan.attributes) {
        const a = g.attributes[spec.name];
        if (!a || a.array.constructor !== spec.ArrayType || a.itemSize !== spec.size || a.count !== spec.count || a.normalized !== spec.normalized || a.gpuType !== spec.gpuType) return invalid('preparation schema changed');
        const offset = offsets.get(spec.name); out.attributes[spec.name].array.set(a.array, offset); offsets.set(spec.name, offset + a.array.length);
      }
      for (let j = 0; j < g.index.count; j++) index[indexOffset++] = g.index.getX(j) + vertexOffset;
      vertexOffset += plan.vertices;
    } finally { releasePrivateGeometry(g); }
  }
  return out;
}
