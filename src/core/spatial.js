// spatial.js - spatial splitting of static geometry so that frustum culling, the sun shadow pass and the distance LOD work per cell.
//
// Why: the merged static batches (core/batch2.js) and the city-wide InstancedMeshes (lamps, benches, bins, chain posts ...) had bounding spheres of several kilometres:
// a mesh that spans the map is never frustum-culled, is drawn in full into the sun shadow map (a 70-90 m box) and cannot be hidden by distance. At the start pose the colour
// pass drew 8 M triangles (6.5 M of them in meshes whose sphere touched the camera) and the normal / depth pass 13 M.
//
//  * splitGeometryByCell(g, cell, wm): one geometry per `cell` m square by triangle centroid (world space when wm is given); all attributes are copied, vertices are shared
//    inside a cell. Returns null when everything falls into one cell.
//  * splitInstanced(root, opts): every static InstancedMesh of the root (StaticDrawUsage, frustum culled, full count, not noBatch / dynamic, no shared instance buffer:
//    the lamps and the props kit, NOT the cone-culled trees or the signal lamps) becomes one InstancedMesh per `cell` m, registered with the distance LOD by the size of
//    its geometry (small things disappear beyond a few hundred metres; core/lod.js, scaled by the quality tier).
//  * lodFarFor(dim): the LOD distance for a thing of `dim` metres (its largest extent): below SMALL metres 350 m, below MEDIUM 900 m, else never hidden.
import * as THREE from 'three';
import { LOD } from './lod.js';

export const SMALL = 5, MEDIUM = 16, THIN = 0.6, NARROW = 2.5, SKYLINE = 30, SKYLINE_TOP = 40, SKYLINE_MIN = 4, FAR_SMALL = 350, FAR_MEDIUM = 900, FAR_SWITCH = 1000;      // FAR_SWITCH: beyond it a sector draws its far proxy (core/batch2.js)
/** LOD distance (m, before the quality scale) for an object whose largest extent is dim m; Infinity = always drawn */
export function lodFarFor(dim) { return dim < SMALL ? FAR_SMALL : dim < MEDIUM ? FAR_MEDIUM : Infinity; }
/** size class letter of an object by its world box (part of the batch keys: small / medium / large things never share a merged mesh): S = under 5 m, or long but thin (a kerb,
 *  a railing, a chain, a moulding: the middle extent under 1.2 m); M = under 16 m, or long but narrow (a low wall, a step flight: the middle extent under 2.5 m); L = the rest
 *  (roads, pavements, quay walls, buildings, ground, water). SKYLINE objects are always L whatever their width: a tall thin one (spire, needle, chimney, mast, crane jib: longest
 *  extent and top both >= SKYLINE = 30 m), a piece standing high (top >= SKYLINE_TOP = 40 m, at least SKYLINE_MIN = 4 m long: the stages and the gilded tip of a needle are separate
 *  pieces, none of them 30 m), or `skyline` true (explicit flag, userData.skyline). They are THE silhouette seen from 2 km; each joins the L batch of its cell and the far proxy of its
 *  sector (no extra draw call, a few hundred triangles); long thin kerbs, railings and chains lie near the ground, so their top stays under 30 m and they are not affected. ?skyline=0 = old classes. */
const SKYLINE_RULE = typeof location === 'undefined' || new URLSearchParams(location.search).get('skyline') !== '0';
export function sizeClass(dim, mid = Infinity, top = 0, skyline = false) { if (SKYLINE_RULE && (skyline || (dim >= SKYLINE && top >= SKYLINE) || (dim >= SKYLINE_MIN && top >= SKYLINE_TOP))) return 'L'; if (mid < THIN) return 'S'; const c = dim < SMALL ? 'S' : dim < MEDIUM ? 'M' : 'L'; return c === 'L' && mid < NARROW ? 'M' : c; }
/** a mesh that is already a merge of many things (a baked street region: every kerb of 640 m in one mesh) is classed by the size of its triangles instead: mean edge under 0.5 m
 *  (kerbs, chains, railing bars) = S, under 1.5 m = M, else L (road and pavement surfaces, quay walls, roofs). Samples up to 256 triangles. */
export function featureClass(g, wm) {
  const pa = g.attributes.position, ia = g.index ? g.index.array : null, nTri = Math.floor((ia ? ia.length : pa.count) / 3);
  if (nTri < 1) return 'L';
  const step = Math.max(1, Math.floor(nTri / 256)), s = wm ? wm.getMaxScaleOnAxis() : 1;
  let sum = 0, n = 0;
  for (let t = 0; t < nTri; t += step) {
    const a = ia ? ia[t * 3] : t * 3, b = ia ? ia[t * 3 + 1] : t * 3 + 1, c = ia ? ia[t * 3 + 2] : t * 3 + 2;
    sum += Math.hypot(pa.getX(a) - pa.getX(b), pa.getY(a) - pa.getY(b), pa.getZ(a) - pa.getZ(b)) + Math.hypot(pa.getX(b) - pa.getX(c), pa.getY(b) - pa.getY(c), pa.getZ(b) - pa.getZ(c)) + Math.hypot(pa.getX(c) - pa.getX(a), pa.getY(c) - pa.getY(a), pa.getZ(c) - pa.getZ(a));
    n += 3;
  }
  const e = (sum / Math.max(1, n)) * s;
  return e < 0.5 ? 'S' : e < 1.5 ? 'M' : 'L';
}
export function farOfClass(cls) { return cls === 'S' ? FAR_SMALL : cls === 'M' ? FAR_MEDIUM : Infinity; }

/** RANGE AUDIT (2026-10-15, docs/PERFORMANCE-PLAN-2026-10-15.md item 1a): a large piece that cannot join a far proxy (transparent, alpha-tested, atlas-textured, basic, custom-shader or
 *  zone-tagged material) used to draw at every distance: 449 pieces of ~370 triangles each beyond 3 km at the walk end. Such a piece keeps an infinite range only if it is part of the
 *  skyline (top >= SKYLINE_TOP or height >= SKYLINE) or a tall mass (a facade, a wall, a building block: height >= LOW_TOP). Otherwise: fine features (mean edge
 *  < 0.5 m: railings, chains, mouldings, lattice) vanish beyond FAR_L_FINE; other low pieces (canopies, panels, rims, low fences, signs) beyond FAR_L_LOW (both before the
 *  quality scale), unless they cover SURFACE_AREA m2 in plan (water, squares, roads: kept). ?lrange=0 = the old infinite ranges. */
export const FAR_L_FINE = 1600, FAR_L_LOW = 2500, LOW_TOP = 8, SMALL_FOOTPRINT = 120, SURFACE_AREA = 4000;
const _pa = new THREE.Vector3(), _pb2 = new THREE.Vector3(), _pc = new THREE.Vector3();
/** the horizontal (plan) area of g in m2, world space when wm is given: water, squares and road surfaces cover thousands of m2, canopies, panels and rims little */
export function planArea(g, wm = null) {
  const pa = g.attributes.position, ia = g.index ? g.index.array : null, nTri = Math.floor((ia ? ia.length : pa.count) / 3);
  let s = 0;
  for (let t = 0; t < nTri; t++) {
    _pa.fromBufferAttribute(pa, ia ? ia[t * 3] : t * 3); _pb2.fromBufferAttribute(pa, ia ? ia[t * 3 + 1] : t * 3 + 1); _pc.fromBufferAttribute(pa, ia ? ia[t * 3 + 2] : t * 3 + 2);
    if (wm) { _pa.applyMatrix4(wm); _pb2.applyMatrix4(wm); _pc.applyMatrix4(wm); }
    s += Math.abs((_pb2.x - _pa.x) * (_pc.z - _pa.z) - (_pc.x - _pa.x) * (_pb2.z - _pa.z)) / 2;
  }
  return s;
}
export const RANGE_AUDIT = typeof location === 'undefined' || new URLSearchParams(location.search).get('lrange') !== '0';
const _pb = new THREE.Box3();
/** the LOD distance of a large piece outside the far proxies (see RANGE AUDIT); g in the space of wm (world when wm is null); returns { far, why } */
export function largePieceFar(g, wm = null, deepY = -Infinity) {
  if (!RANGE_AUDIT) return { far: Infinity, why: 'off' };
  if (!g.boundingBox) g.computeBoundingBox();
  _pb.copy(g.boundingBox); if (wm) _pb.applyMatrix4(wm);
  if (!Number.isFinite(_pb.min.y + _pb.max.y)) return { far: Infinity, why: 'bounds' };
  if (_pb.max.y < deepY) return { far: Infinity, why: 'deep' };
  const dy = _pb.max.y - _pb.min.y, ext = Math.max(_pb.max.x - _pb.min.x, _pb.max.z - _pb.min.z);
  if (_pb.max.y >= SKYLINE_TOP || dy >= SKYLINE) return { far: Infinity, why: 'skyline' };
  if (dy >= LOW_TOP) return { far: Infinity, why: 'mass' };      // (a facade / wall / building block: kept whatever its triangle size; the region buildings rely on it)
  const fc = featureClass(g, wm);
  if (fc === 'S') return { far: FAR_L_FINE, why: 'fine' };
  if (ext < SMALL_FOOTPRINT || planArea(g, wm) < SURFACE_AREA) return { far: FAR_L_LOW, why: 'low' };
  return { far: Infinity, why: 'surface' };
}

/** registers obj with the visibility registry (sector culling, core/lod.js) and, when far is finite, with the distance LOD (centre / radius from its world bounding sphere) */
export function registerLOD(obj, far = Infinity, opts = {}) {
  const g = obj.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  const s = obj.isInstancedMesh ? (obj.boundingSphere || (obj.computeBoundingSphere(), obj.boundingSphere)) : g.boundingSphere;
  const c = new THREE.Vector3().copy(s.center).applyMatrix4(obj.matrixWorld);
  const sc = obj.matrixWorld.getMaxScaleOnAxis();
  if (far < Infinity) obj.userData.lodFar = far;
  if (opts.attach) { obj.matrix.copy(obj.matrixWorld); obj.matrix.decompose(obj.position, obj.quaternion, obj.scale); }      // the sector groups sit at the origin: the world matrix becomes the local one
  LOD.add(obj, c.x, c.z, s.radius * sc, far, opts);
}

/** concatenates indexed or non-indexed geometries with the same attribute layout (names, item sizes, array types, normalization) into one indexed geometry; null when they differ */
export function concatGeometries(geos) {
  const first = geos[0], names = Object.keys(first.attributes);
  let nv = 0, ni = 0;
  for (const g of geos) {
    if (Object.keys(g.attributes).length !== names.length) return null;
    for (const n of names) { const a = g.attributes[n], b = first.attributes[n]; if (!a || a.isInterleavedBufferAttribute || a.itemSize !== b.itemSize || a.normalized !== b.normalized || a.array.constructor !== b.array.constructor) return null; }
    nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  for (const n of names) {
    const b = first.attributes[n], arr = new b.array.constructor(nv * b.itemSize); let o = 0;
    for (const g of geos) { const a = g.attributes[n].array; arr.set(a.subarray(0, g.attributes.position.count * b.itemSize), o); o += g.attributes.position.count * b.itemSize; }
    out.setAttribute(n, new THREE.BufferAttribute(arr, b.itemSize, b.normalized));
  }
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni); let io = 0, vo = 0;
  for (const g of geos) { const cnt = g.attributes.position.count; if (g.index) { const ia = g.index.array; for (let i = 0; i < g.index.count; i++) idx[io++] = ia[i] + vo; } else for (let i = 0; i < cnt; i++) idx[io++] = i + vo; vo += cnt; }
  out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingBox(); out.computeBoundingSphere();
  return out;
}

/** FAR SUPER-CELLS for loose, LOD-registered meshes that share one material and sit at identity under the same parent (the ground pieces): one merged draw per `cell` m that replaces
 *  its members beyond until * LOD.scale + (cell half diagonal) m from the cell centre, i.e. only once the camera is at least until * scale m outside the cell (core/lod.js addSuper).
 *  Near the player the members draw exactly as before. Returns the number of merged meshes (0 with ?supercells=0). */
export function superCells(meshes, cell, until, setup = null) {
  if (!LOD.superCells || meshes.length < 2) return 0;
  const bins = new Map();
  for (const m of meshes) { const it = LOD.of(m); if (!it || m.parent !== meshes[0].parent || m.material !== meshes[0].material) continue; const k = `${Math.floor(it.cx / cell)},${Math.floor(it.cz / cell)}`; let b = bins.get(k); if (!b) bins.set(k, (b = [])); b.push(m); }
  let made = 0; const ur = cell * Math.SQRT1_2;
  for (const [k, list] of bins) {
    if (list.length < 2) continue;
    const g = concatGeometries(list.map(m => m.geometry)); if (!g) continue;
    const [kx, kz] = k.split(',').map(Number), cx = (kx + 0.5) * cell, cz = (kz + 0.5) * cell, s0 = list[0];
    const mesh = likeMesh(new THREE.Mesh(g, s0.material), s0); mesh.name = s0.name + '-super'; mesh.userData.noND = true; mesh.userData.noBatch = true;
    mesh.matrix.copy(s0.matrix); mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    s0.parent.add(mesh); mesh.updateMatrixWorld(true); if (setup) setup(mesh);
    const sp = g.boundingSphere, c = sp.center.clone().applyMatrix4(mesh.matrixWorld), r = Math.hypot(c.x - cx, c.z - cz) + sp.radius * mesh.matrixWorld.getMaxScaleOnAxis();
    if (LOD.addSuper(mesh, list, cx, cz, r, until, ur)) made++; else { mesh.removeFromParent(); g.dispose(); }
  }
  return made;
}

const _e = new Float32Array(16);
/** split g into cells of `cell` m by triangle centroid; wm (Matrix4) transforms the centroids for the binning only (the pieces stay in the space of g) */
export function splitGeometryByCell(g, cell, wm = null) {
  const pos = g.attributes.position, n = pos.count, idx = g.index, nTri = Math.floor((idx ? idx.count : n) / 3);
  if (nTri < 2) return null;
  const pa = pos.array, ia = idx ? idx.array : null;
  const e = wm ? wm.elements : null; if (e) _e.set(e);
  const keyOf = new Map(); const cellOfTri = new Int32Array(nTri); const triCount = [];
  for (let t = 0; t < nTri; t++) {
    const a = ia ? ia[t * 3] : t * 3, b = ia ? ia[t * 3 + 1] : t * 3 + 1, c = ia ? ia[t * 3 + 2] : t * 3 + 2;
    let x = (pa[a * 3] + pa[b * 3] + pa[c * 3]) / 3, y = (pa[a * 3 + 1] + pa[b * 3 + 1] + pa[c * 3 + 1]) / 3, z = (pa[a * 3 + 2] + pa[b * 3 + 2] + pa[c * 3 + 2]) / 3;
    if (e) { const wx = _e[0] * x + _e[4] * y + _e[8] * z + _e[12], wz = _e[2] * x + _e[6] * y + _e[10] * z + _e[14]; x = wx; z = wz; }
    const k = (Math.floor(x / cell) + 4096) * 8192 + (Math.floor(z / cell) + 4096);
    let ci = keyOf.get(k); if (ci === undefined) { ci = triCount.length; keyOf.set(k, ci); triCount.push(0); }
    cellOfTri[t] = ci; triCount[ci]++;
  }
  const nc = triCount.length; if (nc < 2) return null;
  const cellIdx = new Array(nc), cellVerts = new Array(nc), vCount = new Int32Array(nc), iCount = new Int32Array(nc);
  for (let c = 0; c < nc; c++) { cellIdx[c] = new Uint32Array(triCount[c] * 3); cellVerts[c] = new Uint32Array(triCount[c] * 3); }      // (a vertex that alternates between cells is registered more than once: the bound is 3 per triangle, not n)
  const lastCell = new Int32Array(n).fill(-1), lastIdx = new Int32Array(n);
  for (let t = 0; t < nTri; t++) {
    const c = cellOfTri[t], out = cellIdx[c], verts = cellVerts[c];
    for (let j = 0; j < 3; j++) {
      const v = ia ? ia[t * 3 + j] : t * 3 + j;
      if (lastCell[v] !== c) { lastCell[v] = c; lastIdx[v] = vCount[c]; verts[vCount[c]++] = v; }
      out[iCount[c]++] = lastIdx[v];
    }
  }
  const attrs = Object.entries(g.attributes), pieces = [];
  for (let c = 0; c < nc; c++) {
    const nv = vCount[c], verts = cellVerts[c], out = new THREE.BufferGeometry();
    for (const [name, at] of attrs) {
      const k = at.itemSize, src = at.isInterleavedBufferAttribute ? null : at.array, arr = new (src ? src.constructor : Float32Array)(nv * k);
      if (src) for (let i = 0; i < nv; i++) { const o = verts[i] * k, p = i * k; for (let j = 0; j < k; j++) arr[p + j] = src[o + j]; }
      else for (let i = 0; i < nv; i++) for (let j = 0; j < k; j++) arr[i * k + j] = at.getComponent(verts[i], j);
      out.setAttribute(name, new THREE.BufferAttribute(arr, k, at.normalized));
    }
    out.setIndex(new THREE.BufferAttribute(nv > 65535 ? cellIdx[c] : Uint16Array.from(cellIdx[c]), 1));
    out.computeBoundingBox(); out.computeBoundingSphere();
    pieces.push(out);
  }
  return pieces;
}

/** removes the triangles that touch a non-finite vertex (a few metro parts carry NaN positions: such triangles are never rasterised, but they poison every bounding sphere / box
 *  computed over a merged or split geometry). Returns the geometry (indexed) or the same object when it was clean. */
export function dropNaNTriangles(g) {
  const pa = g.attributes.position, p = pa.array, n = pa.count;
  let bad = null;
  for (let i = 0; i < n; i++) if (!Number.isFinite(p[i * 3] + p[i * 3 + 1] + p[i * 3 + 2])) { (bad || (bad = new Uint8Array(n)))[i] = 1; }
  if (!bad) return g;
  const ia = g.index ? g.index.array : null, nTri = Math.floor((ia ? ia.length : n) / 3), keep = [];
  for (let t = 0; t < nTri; t++) { const a = ia ? ia[t * 3] : t * 3, b = ia ? ia[t * 3 + 1] : t * 3 + 1, c = ia ? ia[t * 3 + 2] : t * 3 + 2; if (!bad[a] && !bad[b] && !bad[c]) keep.push(a, b, c); }
  for (let i = 0; i < n; i++) if (bad[i]) { p[i * 3] = 0; p[i * 3 + 1] = 0; p[i * 3 + 2] = 0; }      // (unreferenced now; finite so the bounds stay sane)
  g.setIndex(new THREE.BufferAttribute(n > 65535 ? Uint32Array.from(keep) : Uint16Array.from(keep), 1));
  g.boundingBox = null; g.boundingSphere = null;
  return g;
}

/** copies the scene properties of src onto a piece mesh */
export function likeMesh(piece, src) {
  piece.name = src.name; piece.castShadow = src.castShadow; piece.receiveShadow = src.receiveShadow; piece.layers.mask = src.layers.mask;
  piece.renderOrder = src.renderOrder; piece.frustumCulled = src.frustumCulled; piece.visible = src.visible;
  Object.assign(piece.userData, src.userData);
  piece.matrixAutoUpdate = false;
  return piece;
}

/** the LOD distance of an instanced geometry by its radius: a lamp (r 4-6 m) ~400-550 m, a bench or a bollard 260 m */
export function instancedFar(geometry, scale = 1) {
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();
  return Math.min(1600, Math.max(260, geometry.boundingSphere.radius * scale * 90));
}

/** INSTANCED RANGE (round 3, 2026-10-15): an instanced mesh registered with an INFINITE range (a landmark's piers, pylons, posts, lamps, gate piers, balusters: at street level
 *  ~560 instanced draws per frame, most of them 2-6 km away) gets a range from the size of ONE instance: about 3 px at 720p for its footprint (radius x 700), clamped to
 *  [INST_MIN, INST_MAX] before the quality scale. A mesh whose instances together reach the skyline (top >= SKYLINE_TOP or height >= SKYLINE: a facade or tower built of
 *  instanced segments) keeps infinity, as does userData.skyline. ?instrange=0 = the old infinite ranges. */
export const INST_MIN = 300, INST_MAX = 2500;
export const INST_RANGE = typeof location === 'undefined' || new URLSearchParams(location.search).get('instrange') !== '0';
const _ib = new THREE.Box3();
export function instancedAuthoredFar(o) {
  if (!INST_RANGE || o.userData.skyline || !o.isInstancedMesh) return Infinity;
  const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere(); if (!g.boundingBox) g.computeBoundingBox();
  const A = o.instanceMatrix.array; let s2 = 0;
  for (let k = 0; k < o.count; k++) { const b = k * 16; const sx = A[b] * A[b] + A[b + 1] * A[b + 1] + A[b + 2] * A[b + 2], sy = A[b + 4] * A[b + 4] + A[b + 5] * A[b + 5] + A[b + 6] * A[b + 6], sz = A[b + 8] * A[b + 8] + A[b + 9] * A[b + 9] + A[b + 10] * A[b + 10]; const m = Math.max(sx, sy, sz); if (m > s2) s2 = m; }
  const r = g.boundingSphere.radius * Math.sqrt(s2) * o.matrixWorld.getMaxScaleOnAxis();
  if (!o.boundingBox) o.computeBoundingBox(); _ib.copy(o.boundingBox).applyMatrix4(o.matrixWorld);
  if (!Number.isFinite(_ib.min.y + _ib.max.y) || _ib.max.y >= SKYLINE_TOP || _ib.max.y - _ib.min.y >= SKYLINE) return Infinity;
  return Math.min(INST_MAX, Math.max(INST_MIN, r * 700));
}

/** The proxy geometries (normal / depth proxies, far proxies) are copies of the scene: ~0.6 GB of typed arrays for the whole city. three.js calls an attribute's onUpload hook once
 *  its buffer is on the GPU: the CPU copy is replaced by an empty array then (count, itemSize and the bounding sphere stay). A lost WebGL context cannot re-upload them (a reload is
 *  needed, which is the practical outcome anyway); ?keepcpu=1 keeps the arrays (tools that read them). */
export let RELEASE_ARRAYS = typeof location === 'undefined' || !new URLSearchParams(location.search).has('keepcpu');
export const releasedStats = { bytes: 0 };
function releaseArray() { releasedStats.bytes += this.array.byteLength; this.array = new this.array.constructor(0); }
export function releaseOnUpload(geometry) {
  if (!RELEASE_ARRAYS) return geometry;
  for (const a of Object.values(geometry.attributes)) a.onUpload(releaseArray);
  if (geometry.index) geometry.index.onUpload(releaseArray);
  return geometry;
}

export function splitInstanced(root, { cell = 192, lodFar = instancedFar, minInstances = 2 } = {}) {
  root.updateMatrixWorld(true);
  const t0 = performance.now();
  const shared = new Map(); root.traverse((o) => { if (o.isInstancedMesh) shared.set(o.instanceMatrix, (shared.get(o.instanceMatrix) || 0) + 1); });
  const cand = [];
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.dynamic || o.userData.noBatch || o.userData.noSplit || !o.visible || !o.frustumCulled) return;
    if (o.instanceMatrix.usage !== THREE.StaticDrawUsage || o.count !== o.instanceMatrix.count || o.count < minInstances || shared.get(o.instanceMatrix) > 1) return;
    if (o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || Array.isArray(o.material) || o.morphTexture) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible || p.userData.noBatch) return;
    cand.push(o);
  });
  let made = 0, split = 0, lod = 0;
  const M = o => { const s = o.matrixWorld.getMaxScaleOnAxis(); return s; };
  for (const o of cand) {
    const n = o.count, A = o.instanceMatrix.array, e = o.matrixWorld.elements, cells = new Map();
    for (let k = 0; k < n; k++) {
      const x = A[k * 16 + 12], y = A[k * 16 + 13], z = A[k * 16 + 14];
      const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
      const key = (Math.floor(wx / cell) + 4096) * 8192 + (Math.floor(wz / cell) + 4096);
      let a = cells.get(key); if (!a) cells.set(key, (a = [])); a.push(k);
    }
    const registered = LOD.of(o), far = registered ? (registered.far === Infinity ? instancedAuthoredFar(o) : registered.far) : lodFar(o.geometry, M(o));      // preserve an explicitly authored range when splitting registered city details (an authored INFINITE range is not a switch: instancedAuthoredFar)
    if (cells.size < 2) { if (!o.boundingSphere) o.computeBoundingSphere(); registerLOD(o, far); if (far < Infinity) lod++; continue; }
    const C = o.instanceColor ? o.instanceColor.array : null;
    for (const [, list] of cells) {
      const m = list.length, piece = new THREE.InstancedMesh(o.geometry, o.material, m);
      const PA = piece.instanceMatrix.array;
      for (let i = 0; i < m; i++) PA.set(A.subarray(list[i] * 16, list[i] * 16 + 16), i * 16);
      piece.instanceMatrix.needsUpdate = true;
      if (C) { piece.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m * 3), 3); const PC = piece.instanceColor.array; for (let i = 0; i < m; i++) PC.set(C.subarray(list[i] * 3, list[i] * 3 + 3), i * 3); piece.instanceColor.needsUpdate = true; }
      likeMesh(piece, o);
      piece.matrix.copy(o.matrix); piece.matrix.decompose(piece.position, piece.quaternion, piece.scale); piece.matrixWorld.copy(o.matrixWorld);
      piece.computeBoundingSphere();
      o.parent.add(piece); piece.updateMatrixWorld(true);
      registerLOD(piece, far, { attach: true, shadow: registered?.shadow }); if (far < Infinity) lod++;
      made++;
    }
    LOD.remove(o); o.parent.remove(o); split++;
  }
  // the registered instanced meshes that were no split candidates (a shared matrix, a single cell handled above, dynamic usage, onBeforeRender): the same size rule for an infinite range
  // ... and the UNREGISTERED ones (a landmark's noBatch instanced details: piers, pylons, posts, gate piers, lamps, balusters: ~300 draws from 2-6 km at street level), registered
  // loose (they keep their parent, so zone and noBatch semantics stay) when the size rule gives a finite range; a count of 0 (a module's own LOD tier) or a non-static usage is skipped
  let ranged = 0;
  root.traverse((o) => {
    if (!o.isInstancedMesh || o.userData.dynamic || o.userData.noLOD) return;
    const it = LOD.of(o);
    if (it) { if (it.far === Infinity) { const f = instancedAuthoredFar(o); if (f < Infinity) { it.far = f; ranged++; } } return; }
    if (!o.frustumCulled || !o.visible || o.count <= 0 || o.instanceMatrix.usage !== THREE.StaticDrawUsage || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender || o.userData._zh) return;
    const f = instancedAuthoredFar(o); if (f < Infinity) { registerLOD(o, f); ranged++; }
  });
  return { candidates: cand.length, split, meshes: made, lod, ranged, ms: Math.round(performance.now() - t0) };
}
