// Small immutable fixture parts are efficient to author as instances, but many
// tiny instance draws in each street cell are expensive in all three passes.
// Expand compatible low-poly parts once into bounded colour/shadow batches.
import * as THREE from 'three';
import { LOD } from './lod.js';
import { likeMesh, releaseOnUpload } from './spatial.js';

export function batchFixtureCells(root, { cell = 192, maxVertices = 128 } = {}) {
  const started = performance.now(), groups = new Map(), matrix = new THREE.Matrix4();
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isInstancedMesh || !o.visible || !o.frustumCulled || o.count !== o.instanceMatrix.count || !o.count || o.instanceMatrix.usage !== THREE.StaticDrawUsage) return;
    if (o.userData.dynamic || o.userData.noBatch || o.userData.noND || o.morphTexture || o.customDepthMaterial || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) return;
    if (o.onBeforeShadow !== THREE.Object3D.prototype.onBeforeShadow || o.onAfterRender !== THREE.Object3D.prototype.onAfterRender || o.onAfterShadow !== THREE.Object3D.prototype.onAfterShadow) return;
    let attached = false; for (let p = o.parent; p; p = p.parent) if (p === LOD.root) { attached = true; break; }
    if (!attached) return;
    const g = o.geometry, m = o.material, it = LOD.of(o);
    if (!it || !Number.isFinite(it.far) || it.near || it.nd || it.sector || !m?.vertexColors || m.transparent || m.alphaTest || m.alphaMap || m.displacementMap || m.normalMap || m.bumpMap) return;
    if (!(m.isMeshToonMaterial && m.userData.toon && m.onBeforeCompile === m.userData.toon.obc)) return;
    if ((g.attributes.color && g.attributes.color.itemSize !== 3) || !g.attributes.normal || g.attributes.position.count > maxVertices || Object.keys(g.morphAttributes).length || g.drawRange.start || Number.isFinite(g.drawRange.count)) return;
    const attrs = Object.entries(g.attributes);
    if (attrs.some(([name, a]) => !['position', 'normal', 'color', 'uv', 'aPaint'].includes(name) || a.isInterleavedBufferAttribute || a.count !== g.attributes.position.count)) return;
    // Reflected instances have renderer-specific winding; retain their old path.
    for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, matrix); matrix.premultiply(o.matrixWorld); if (matrix.determinant() <= 0) return; }
    const tags = ['undergroundOnly', 'surfaceOnly', 'alwaysVisible', 'zone'].map(k => o.userData[k] ?? null);
    const schema = attrs.filter(([k]) => k !== 'color').map(([k,a]) => `${k}:${a.itemSize}`).sort().join(',');
    const key = JSON.stringify([o.parent.uuid, Math.floor(it.cx/cell), Math.floor(it.cz/cell), m.uuid, it.far, it.shadow, o.castShadow, o.receiveShadow, o.layers.mask, o.renderOrder, tags, schema]);
    let group = groups.get(key); if (!group) groups.set(key, group = []); group.push(o);
  });
  const materials = new Map(), trash = new THREE.Group(), normalMatrix = new THREE.Matrix3(), v = new THREE.Vector3(), n = new THREE.Vector3();
  let sources = 0, meshes = 0, vertices = 0, bytes = 0;
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const first = list[0], registration = LOD.of(first);
    const count = list.reduce((s,o) => s + o.geometry.attributes.position.count * o.count, 0);
    const indexCount = list.reduce((s,o) => s + (o.geometry.index?.count ?? o.geometry.attributes.position.count) * o.count, 0);
    const geometry = new THREE.BufferGeometry(), columns = {};
    for (const [name, a] of Object.entries(first.geometry.attributes)) if (name !== 'color') {
      columns[name] = new THREE.BufferAttribute(new Float32Array(count * a.itemSize), a.itemSize);
      geometry.setAttribute(name, columns[name]);
    }
    columns.color = new THREE.BufferAttribute(new Float32Array(count * 3), 3); geometry.setAttribute('color', columns.color);
    const indices = count > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);
    let offset = 0, cursor = 0;
    for (const o of list) {
      const g = o.geometry, p = g.attributes.position, normal = g.attributes.normal, color = g.attributes.color;
      const extraAttributes = Object.entries(g.attributes).filter(([name]) => !['position','normal','color'].includes(name));
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, matrix); matrix.premultiply(o.matrixWorld); normalMatrix.getNormalMatrix(matrix);
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p,i).applyMatrix4(matrix); columns.position.setXYZ(offset+i,v.x,v.y,v.z);
          n.fromBufferAttribute(normal,i).applyNormalMatrix(normalMatrix); columns.normal.setXYZ(offset+i,n.x,n.y,n.z);
          for (let c = 0; c < 3; c++) columns.color.setComponent(offset+i,c,(color ? color.getComponent(i,c) : 1) * (o.instanceColor ? o.instanceColor.getComponent(k,c) : 1));
          for (const [name, a] of extraAttributes) for (let c = 0; c < a.itemSize; c++) columns[name].setComponent(offset+i,c,a.getComponent(i,c));
        }
        for (let i = 0, size = g.index?.count ?? p.count; i < size; i++) indices[cursor++] = offset + (g.index ? g.index.getX(i) : i);
        offset += p.count;
      }
    }
    geometry.setIndex(new THREE.BufferAttribute(indices,1)); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    let material = materials.get(first.material);
    if (!material) {
      material = first.material.clone(); material.color = first.material.color; material.emissive = first.material.emissive; material.onBeforeCompile = first.material.onBeforeCompile; material.customProgramCacheKey = first.material.customProgramCacheKey;
      Object.defineProperty(material.userData.toon, 'obc', { value: material.onBeforeCompile, enumerable: false });
      materials.set(first.material, material);
    }
    const mesh = likeMesh(new THREE.Mesh(geometry,material),first); mesh.name = 'fixture-cell'; root.add(mesh); mesh.updateMatrixWorld(true);
    const center = geometry.boundingSphere.center;
    // A union of the original LOD circles never removes an authored fixture
    // earlier. Boundary cells can retain a little extra detail.
    let radius = geometry.boundingSphere.radius;
    for (const o of list) { const it = LOD.of(o); radius = Math.max(radius,Math.hypot(it.cx-center.x,it.cz-center.z)+it.r); trash.add(o); }
    LOD.add(mesh,center.x,center.z,radius,registration.far,{attach:true,shadow:registration.shadow});
    releaseOnUpload(geometry);
    sources += list.length; meshes++; vertices += count; bytes += indices.byteLength + Object.values(columns).reduce((s,a)=>s+a.array.byteLength,0);
  }
  LOD.remove(trash); trash.clear();
  return { sources, meshes, vertices, mb: +(bytes/1048576).toFixed(1), ms: Math.round(performance.now()-started) };
}
