// people/batches.js - material batches for the existing articulated crowd (rig.js / research/people.md).
// Keep the variant slot allocator and pose writer unchanged: their matrix arrays are views into Three 0.170's
// batch texture. Geometry is copied once per accessory variant, tints only when a slot changes owner. Requires
// WEBGL_multi_draw; callers retain ordinary InstancedMeshes on devices without it or with ?pbat=0.
import * as THREE from 'three';

export function supportsPeopleBatches(ctx) {
  return peopleBatchMode(ctx) !== 'none';
}

export function peopleBatchMode(ctx) {
  const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
  if (params.get('pbat') === '0' || !ctx.renderer?.extensions?.has('WEBGL_multi_draw')) return 'none';
  return 'items';
}

export function createPeopleBatches(ctx, sets) {
  const groups = new Map(), meshes = [];
  for (const e of sets.values()) {
    const m = e.mesh;
    const key = e.screen ? 'screens' : m.castShadow ? 'items' : 'small-items';
    let b = groups.get(key);
    if (!b) groups.set(key, b = { key, entries: [], vertices: 0, indices: 0, capacity: 0 });
    b.entries.push(e); b.vertices += m.geometry.attributes.position.count; b.indices += m.geometry.index.count; b.capacity += e.owner.length;
  }
  for (const b of groups.values()) {
    const first = b.entries[0].mesh;
    const mesh = new THREE.BatchedMesh(b.capacity, b.vertices, b.indices, first.material);
    mesh.name = 'ppl-batch-' + b.key; mesh.castShadow = first.castShadow; mesh.receiveShadow = true;
    mesh.frustumCulled = false; mesh.perObjectFrustumCulled = false; mesh.sortObjects = false;
    mesh.userData.alwaysVisible = true; mesh.layers.mask = first.layers.mask;
    if (mesh.castShadow) mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    b.mesh = mesh; b.active = 0;
    let offset = 0;
    for (const e of b.entries) {
      // Only ordinary vertex attributes enter the batch; instance tints are copied separately.
      const source = e.mesh.geometry, geo = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(source.attributes)) if (!attr.isInstancedBufferAttribute) geo.setAttribute(name, attr);
      geo.setIndex(source.index);
      const geometryId = mesh.addGeometry(geo), capacity = e.owner.length;
      e.batch = b; e.batchOffset = offset; e.batchHigh = 0;
      for (let i = 0; i < capacity; i++) { const id = mesh.addInstance(geometryId); mesh.setVisibleAt(id, false); }
      const matrices = mesh._matricesTexture.image.data.subarray(offset * 16, (offset + capacity) * 16);
      matrices.set(e.mesh.instanceMatrix.array); e.mesh.instanceMatrix.array = matrices;
      if (!e.screen) mesh.setColorAt(offset, new THREE.Color(0xffffff));
      offset += capacity;
    }
    // r170's renderer checks colorTexture when choosing a program, while BatchedMesh stores _colorsTexture.
    // Keep that compatibility alias stable so uncoloured batches do not reselect a shader every pass.
    mesh.colorTexture = mesh._colorsTexture;
    mesh.visible = false; ctx.add(mesh); meshes.push(mesh);
  }
  return {
    meshes,
    flush(e) {
      const b = e.batch, mesh = b.mesh, a = e.mesh.instanceMatrix.array, offset = e.batchOffset;
      // Conditional items (phone, cigarette, etc.) still own slots while hidden. Exclude their zero-scale
      // matrices as well as released slots, so a material batch never submits those degenerate draws.
      for (let i = 0, n = Math.max(e.hi, e.batchHigh); i < n; i++) {
        const p = i * 16, visible = i < e.hi && !!(a[p] || a[p + 1] || a[p + 2]);
        if (mesh.getVisibleAt(offset + i) !== visible) { mesh.setVisibleAt(offset + i, visible); b.active += visible ? 1 : -1; }
      }
      e.batchHigh = e.hi;
      if (e.hi) mesh._matricesTexture.needsUpdate = true;
      if (e.dirty) {
        if (!e.screen) {
          const dest = mesh._colorsTexture.image.data, src = e.mesh.instanceColor.array;
          for (let i = 0; i < e.hi; i++) { const at = (offset + i) * 4; dest[at] = src[i * 3]; dest[at + 1] = src[i * 3 + 1]; dest[at + 2] = src[i * 3 + 2]; }
          mesh._colorsTexture.needsUpdate = true;
        }
        e.dirty = false;
      }
      mesh.visible = b.active > 0;
    },
  };
}
