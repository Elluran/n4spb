import * as THREE from 'three';
import { wallMaterial } from '../world/city/wallmat.js';
import { signMaterial } from '../world/city/signs.js';

function packBounds(object) {
  if (!object.boundingBox) object.computeBoundingBox();
  if (!object.boundingSphere) object.computeBoundingSphere();
  return { box: [...object.boundingBox.min.toArray(), ...object.boundingBox.max.toArray()],
    sphere: [...object.boundingSphere.center.toArray(), object.boundingSphere.radius] };
}
function unpackBounds(object, bounds) {
  if (bounds?.box?.length === 6) object.boundingBox = new THREE.Box3(
    new THREE.Vector3().fromArray(bounds.box), new THREE.Vector3().fromArray(bounds.box, 3));
  else object.computeBoundingBox();
  if (bounds?.sphere?.length === 4) object.boundingSphere = new THREE.Sphere(
    new THREE.Vector3().fromArray(bounds.sphere), bounds.sphere[3]);
  else object.computeBoundingSphere();
}

export function packGeometry(g) {
  const attributes = {};
  for (const [name, a] of Object.entries(g.attributes)) {
    if (a.isInterleavedBufferAttribute) throw new Error('Bake requires non-interleaved geometry');
    attributes[name] = { array: a.array, itemSize: a.itemSize, normalized: a.normalized };
  }
  return { attributes, index: g.index?.array, groups: g.groups, drawRange: g.drawRange, bounds: packBounds(g) };
}
export function unpackGeometry(p) {
  const g = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(p.attributes)) g.setAttribute(name, new THREE.BufferAttribute(a.array, a.itemSize, a.normalized));
  if (p.index) g.setIndex(new THREE.BufferAttribute(p.index, 1));
  for (const a of p.groups || []) g.addGroup(a.start, a.count, a.materialIndex);
  if (p.drawRange) g.setDrawRange(p.drawRange.start, p.drawRange.count);
  // Bounds are deterministic bake data. Avoid scanning every street vertex
  // again on the input/rendering thread each time the car enters a region.
  unpackBounds(g, p.bounds); return g;
}
export function packTexture(t) {
  if (!t) return null;
  let image;
  if (t.isDataTexture) image = { data: t.image.data, width: t.image.width, height: t.image.height };
  else {
    const c = document.createElement('canvas'); c.width = t.image.width; c.height = t.image.height;
    c.getContext('2d').drawImage(t.image, 0, 0);
    const b64 = c.toDataURL('image/png').split(',')[1];
    image = { png: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) };
  }
  return { image, data: !!t.isDataTexture, colorSpace: t.colorSpace, wrapS: t.wrapS, wrapT: t.wrapT,
    magFilter: t.magFilter, minFilter: t.minFilter, anisotropy: t.anisotropy,
    repeat: t.repeat.toArray(), offset: t.offset.toArray(), center: t.center.toArray(), rotation: t.rotation,
    flipY: t.flipY, generateMipmaps: t.generateMipmaps, premultiplyAlpha: t.premultiplyAlpha, format: t.format, type: t.type };
}
export async function unpackTexture(p) {
  if (!p) return null;
  let t;
  if (p.data) t = new THREE.DataTexture(p.image.data, p.image.width, p.image.height, p.format, p.type);
  else {
    const bitmap = await createImageBitmap(new Blob([p.image.png], { type: 'image/png' }));
    const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    c.getContext('2d').drawImage(bitmap, 0, 0); bitmap.close(); t = new THREE.CanvasTexture(c);
  }
  for (const k of ['colorSpace', 'wrapS', 'wrapT', 'magFilter', 'minFilter', 'anisotropy', 'rotation', 'flipY', 'generateMipmaps', 'premultiplyAlpha']) t[k] = p[k];
  t.repeat.fromArray(p.repeat); t.offset.fromArray(p.offset); t.center.fromArray(p.center); t.needsUpdate = true;
  return t;
}
const props = ['name', 'side', 'transparent', 'opacity', 'alphaTest', 'vertexColors', 'depthWrite', 'depthTest',
  'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'flatShading', 'blending', 'colorWrite', 'toneMapped', 'emissiveIntensity'];
export function packMaterial(m, textures, textureIds) {
  const texture = t => {
    if (!t) return null;
    if (!textureIds.has(t)) { textureIds.set(t, textures.length); textures.push(packTexture(t)); }
    return textureIds.get(t);
  };
  const p = { type: m.type, color: m.color?.toArray(), emissive: m.emissive?.toArray(), flags: {},
    map: texture(m.map), alphaMap: texture(m.alphaMap), toon: m.userData.toon, wall: m.userData.wall?.spec,
    sign: m.name.startsWith('city-sign') };
  // onBeforeCompile is restored by the original shader factories, never serialized.
  for (const k of props) if (m[k] !== undefined) p.flags[k] = m[k];
  return p;
}
export async function unpackMaterials(ctx, p) {
  const textures = await Promise.all(p.textures.map(unpackTexture));
  return p.materials.map(a => {
    const map = a.map == null ? null : textures[a.map], alphaMap = a.alphaMap == null ? null : textures[a.alphaMap];
    let m;
    if (a.wall) m = wallMaterial(ctx, a.wall);
    else if (a.sign) m = signMaterial(ctx, map, a.flags.name);
    else if (a.toon) m = ctx.mat.toon(new THREE.Color().fromArray(a.color), { ...a.flags, ...a.toon, map, alphaMap,
      side: a.flags.side === THREE.DoubleSide ? 'double' : a.flags.side === THREE.BackSide ? 'back' : undefined });
    else if (a.type === 'MeshBasicMaterial') m = new THREE.MeshBasicMaterial({ map, alphaMap });
    else if (a.type === 'MeshToonMaterial') m = new THREE.MeshToonMaterial({ map, alphaMap, gradientMap: ctx.mat.gradientMap });
    else throw new Error(`Unsupported baked material ${a.type}`);
    Object.assign(m, a.flags); if (a.color) m.color.fromArray(a.color); if (a.emissive && m.emissive) m.emissive.fromArray(a.emissive);
    return m;
  });
}
export function packMeshes(meshes, materialIds) {
  const geometries = [], ids = new Map();
  const objects = meshes.map(m => {
    if (!ids.has(m.geometry)) { ids.set(m.geometry, geometries.length); geometries.push(packGeometry(m.geometry)); }
    return { geometry: ids.get(m.geometry), material: materialIds.get(m.material), matrix: m.matrixWorld.toArray(), name: m.name,
      userData: m.userData, layers: m.layers.mask, castShadow: m.castShadow, receiveShadow: m.receiveShadow,
      instanceMatrix: m.isInstancedMesh ? m.instanceMatrix.array : null, instanceColor: m.instanceColor?.array, count: m.count,
      bounds: m.isInstancedMesh ? packBounds(m) : undefined };
  });
  return { geometries, objects };
}
export function unpackMeshes(p, materials) {
  const geometries = p.geometries.map(unpackGeometry), root = new THREE.Group();
  for (const a of p.objects) {
    const m = a.instanceMatrix ? new THREE.InstancedMesh(geometries[a.geometry], materials[a.material], 0) : new THREE.Mesh(geometries[a.geometry], materials[a.material]);
    if (a.instanceMatrix) {
      m.instanceMatrix = new THREE.InstancedBufferAttribute(a.instanceMatrix, 16); m.count = a.count;
      if (a.instanceColor) m.instanceColor = new THREE.InstancedBufferAttribute(a.instanceColor, 3);
      unpackBounds(m, a.bounds);
    }
    m.matrix.fromArray(a.matrix); m.matrix.decompose(m.position, m.quaternion, m.scale);
    m.name = a.name; m.userData = a.userData; m.layers.mask = a.layers; m.castShadow = a.castShadow; m.receiveShadow = a.receiveShadow;
    root.add(m);
  }
  root.updateMatrixWorld(true); return root;
}
// Split large surface buffers by triangle centroid. Shared boundary vertices
// retain their exact positions/attributes; no simplification or cracks.
export function splitGeometry(g, cell = 640) {
  const groups = new Map(), pos = g.attributes.position, index = g.index;
  for (let i = 0; i < (index?.count ?? pos.count); i += 3) {
    const tri = [0, 1, 2].map(j => index ? index.getX(i + j) : i + j);
    const x = tri.reduce((n, j) => n + pos.getX(j), 0) / 3, z = tri.reduce((n, j) => n + pos.getZ(j), 0) / 3;
    const key = `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    let a = groups.get(key); if (!a) groups.set(key, a = { verts: [], ids: new Map(), idx: [] });
    for (const j of tri) { if (!a.ids.has(j)) { a.ids.set(j, a.verts.length); a.verts.push(j); } a.idx.push(a.ids.get(j)); }
  }
  return [...groups].map(([key, a]) => {
    const out = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes)) {
      const arr = new attr.array.constructor(a.verts.length * attr.itemSize);
      a.verts.forEach((j, n) => arr.set(attr.array.subarray(j * attr.itemSize, (j + 1) * attr.itemSize), n * attr.itemSize));
      out.setAttribute(name, new THREE.BufferAttribute(arr, attr.itemSize, attr.normalized));
    }
    out.setIndex(a.idx); out.computeBoundingBox(); out.computeBoundingSphere(); return { key, geometry: out };
  });
}
