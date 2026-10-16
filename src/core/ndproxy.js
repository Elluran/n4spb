// ndproxy.js - ONE draw call per cell for the normal / depth pre-pass of the outlines.
//
// Why: the frame is CPU bound (every draw call costs ~5 us in the browser + ANGLE): the scene is drawn three times (normal / depth for the outlines, colour, sun shadow) and the first
// does not care about materials at all (it draws everything with one override material), yet it paid one call per batched / city / instanced mesh (~1000 calls). After the build
// (core/batch2.js) this module merges every static layer-0 mesh into position + normal only geometry per cell (128 m; deep / underground / tagged objects in cells of their own exactly
// like batch2, so the visibility tags of core/zones.js keep working) and bakes the static InstancedMeshes (lamps, benches, rails ...) into them. The proxies live on LAYER_ND (drawn only
// by the normal / depth pass, core/renderer.js); the originals move to LAYER_COLOR (drawn only by the colour pass and still casting the sun shadow). Meshes with a material array,
// morphs, dynamic instancing (signal lamps), non-layer-0 meshes (no-outline objects) and everything outside the static root are left alone.
// The result is pixel identical to drawing the originals (same triangles, same 8 bit normals, same winding, DoubleSide override material) - only the number of calls changes.
// The proxy meshes are plain Mesh objects in a group 'static-nd' of the static root; they carry the undergroundOnly / surfaceOnly / zone tags of their sources (core/zones.js switches
// them like the batched meshes). userData.noND on a mesh keeps it out of the proxies.
// SPATIAL (2026-10): a mesh wider than a cell is binned per TRIANGLE (centroid) and an InstancedMesh per INSTANCE, so no proxy spans the map: before, every big object of the
// scene (ground, roads, kerbs, the lamps of the whole city) landed in one 13 M-triangle proxy with a 10 km radius that the 150-200 m normal / depth pass drew in full every frame.
// LAZY (2026-10-15, plan item 4): building every cell of the city took 65.8 s and 20.75 M triangles at load (and 0.76 s per streamed region attach), while the pass only ever draws
// the 2-3 M triangles within the outline range (ndFar, 150 m at medium). With { lazy: true } buildNDProxy only SCANS (cell assignment, compact per-triangle cell order of the wide
// meshes, conservative world XZ rectangles) and switches the originals to LAYER_COLOR as before; NDLazy.update(camera.position) then builds a cell synchronously once its rectangle
// comes within ndFar (+8 m) of the camera (the pass clips at camera.far = ndFar, core/renderer.js, so nothing farther can be drawn) and prefetches cells within ndFar + prefetch
// under a per-frame time budget (resumable per source job). The cell contents, bytes, tags and LOD registrations equal the eager build (tools/ndproxy-lazy-test.mjs). Sources that
// release their CPU arrays on upload (core/spatial.js releaseOnUpload) keep position / normal / index until their last pending cell is built. Cells registered with an authored
// near switch that can never fall within ndFar (far-proxy outlines: near * minimum LOD scale - radius - slack >= ndFar) are not built at all: they were never drawn.
// ?ndlazy=0 restores the eager build (main.js), ?ndnever=0 keeps the never-drawn cells, ?ndbudget= / ?ndprefetch= tune the pump.
import * as THREE from 'three';
import { LAYER_ND, LAYER_COLOR } from './renderer.js';
import { LOD, SECTOR } from './lod.js';
import { releaseOnUpload } from './spatial.js';

const DEEP_Y = -3, DEEP_CELL = 64, DEEP_BAND = 20;
const CAM_SLACK = 60;                       // camera to player offset allowance (drive / third person cameras) for the never-drawn test
const SECTOR_REACH = SECTOR * 0.7072 + 1;   // a sector-measured range is measured from the sector centre: its anchor lies within this
const NEED_SLACK = 8;                       // built synchronously once the camera is this close to the ND range
const TILE = 256;                           // pending-cell index tile
const PROTO_UPLOAD = THREE.BufferAttribute.prototype.onUploadCallback;

function tagsOf(o, root) {
  const t = { u: false, s: false, a: false, z: '' };
  for (let p = o; p && p !== root.parent; p = p.parent) { const d = p.userData; if (d.undergroundOnly) t.u = true; if (d.surfaceOnly) t.s = true; if (d.alwaysVisible) t.a = true; if (d.zone && !t.z) t.z = String(d.zone); }
  return t;
}

/** true when an outline cell registered with this authored range can never be drawn: drawn only beyond near * LOD.scale from the player, the pass clips at ndFar from the camera */
export function ndNeverDrawn(range, ndFar, lodMin) {
  if (!range || !range.near || !(lodMin > 0) || !(ndFar < 1e8)) return false;
  return range.near * lodMin - range.r - (range.sector ? SECTOR_REACH : 0) - CAM_SLACK >= ndFar;
}

// ------------------------------------------------------------------ source CPU arrays held until the last pending cell of the source is built
const holds = new Map();
function hold(g) {
  let h = holds.get(g);
  if (!h) {
    h = { refs: 0, list: [] };
    for (const a of [g.attributes.position, g.attributes.normal, g.index]) {
      if (!a || a.isInterleavedBufferAttribute || a.onUploadCallback === PROTO_UPLOAD) continue;
      const rec = { a, orig: a.onUploadCallback, up: false, wrap: null };
      rec.wrap = function () { rec.up = true; };
      a.onUploadCallback = rec.wrap; h.list.push(rec);
    }
    holds.set(g, h);
  }
  h.refs++;
}
function unhold(g) {
  const h = holds.get(g); if (!h || --h.refs > 0) return;
  holds.delete(g);
  for (const r of h.list) { if (r.a.onUploadCallback !== r.wrap) continue; r.a.onUploadCallback = r.orig; if (r.up) r.orig.call(r.a); }
}

// ------------------------------------------------------------------ exact fast readers (same values as BufferAttribute.getX / getY / getZ, incl. three's denormalize)
function readerOf(a) {
  const il = !!a.isInterleavedBufferAttribute, arr = il ? a.data.array : a.array, st = il ? a.data.stride : a.itemSize, of = il ? a.offset : 0;
  let D = 0, sg = false;
  if (a.normalized) switch (arr.constructor) {
    case Uint32Array: D = 4294967295.0; break; case Uint16Array: D = 65535.0; break; case Uint8Array: D = 255.0; break;
    case Int32Array: D = 2147483647.0; sg = true; break; case Int16Array: D = 32767.0; sg = true; break; case Int8Array: D = 127.0; sg = true; break;
    case Float32Array: break; default: throw new Error('ndproxy: invalid normalized component type');
  }
  return { arr, st, of, D, sg, count: a.count };
}
const rd = (r, i) => { const v = r.arr[i]; return r.D === 0 ? v : r.sg ? Math.max(v / r.D, -1.0) : v / r.D; };

// ------------------------------------------------------------------ the scan: groups of jobs per output cell
function scan(root, cell, lazy, never) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = new THREE.Vector3(), wmOf = new Map(), IM = new THREE.Matrix4();
  let nSrc = 0, skipped = 0;
  const groups = new Map(), moved = [];
  const groupOf = (key, tg, range) => { let grp = groups.get(key); if (!grp) groups.set(key, (grp = { tg, range, jobs: [], v: 0, i: 0, x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity, never: !!never && ndNeverDrawn(range, never.ndFar, never.lodMin) })); return grp; };
  const cellKey = (x, z, cs, iy, tg) => `${Math.floor(x / cs)},${iy},${Math.floor(z / cs)}|${tg.u ? 1 : 0}${tg.s ? 1 : 0}${tg.a ? 1 : 0}${tg.z}`;
  const grow = (grp, x0, z0, x1, z1) => { if (x0 < grp.x0) grp.x0 = x0; if (z0 < grp.z0) grp.z0 = z0; if (x1 > grp.x1) grp.x1 = x1; if (z1 > grp.z1) grp.z1 = z1; };
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh || o.userData.noND || o.userData.ndProxy || !o.visible) return;
    if (Array.isArray(o.material) || !o.material || o.material.visible === false) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (!p.visible || p.userData.noND) return;
    const g = o.geometry; if (!g || !g.attributes.position || g.morphAttributes?.position) { skipped++; return; }
    if (o.isInstancedMesh && (o.instanceMatrix.usage !== THREE.StaticDrawUsage || o.userData.dynamic || o.count < 1 || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender)) { skipped++; return; }
    if (o.layers.mask !== 1) return;
    const hadBox = !!g.boundingBox; if (!hadBox) g.computeBoundingBox();
    box.copy(g.boundingBox);
    const gr = Math.max(g.boundingBox.min.length(), g.boundingBox.max.length());       // (instances: a conservative radius about the instance origin)
    if (!hadBox) g.boundingBox = null;                 // (no side effect on the originals: tools read geometry.boundingBox as 'already measured')
    if (o.isInstancedMesh) { if (!o.boundingBox) o.computeBoundingBox(); box.copy(o.boundingBox); }
    box.applyMatrix4(o.matrixWorld); box.getCenter(c);
    const tg = tagsOf(o, root), deep = tg.u || c.y < DEEP_Y;
    const cs = deep ? DEEP_CELL : cell, iy = deep ? Math.floor(c.y / DEEP_BAND) : 0;
    const big = box.max.x - box.min.x > cs * 1.2 || box.max.z - box.min.z > cs * 1.2;
    const n = g.attributes.position.count, ni = g.index ? g.index.count : n;
    const registered = LOD.of(o);
    // Keep the outline on the same visibility contract as its colour source.
    // In particular a detailed statue must not leave a ghost outline when its
    // simpler distant model replaces it. Automatic long-range batches can use
    // the ordinary ND cells: their switch is beyond every quality's ND range.
    const range = registered && (registered.near || registered.far < 350) ? registered : null;
    const rangeKey = range ? `|lod:${range.cx},${range.cz},${range.r},${range.far},${range.near},${+range.sector}` : '';
    const groupAt = (x, z) => groupOf(cellKey(x, z, cs, iy, tg) + rangeKey, tg, range);
    nSrc++;
    moved.push(o);
    // the world matrix as of the build (a lazy cell is emitted later: it must not depend on later re-parenting)
    let wm = wmOf.get(o); if (!wm) wmOf.set(o, (wm = o.matrixWorld.clone()));
    if (o.isInstancedMesh) {
      // one job per instance in the cell of its position (a city-wide lamp set is spread over its cells)
      const A = o.instanceMatrix.array, e = wm.elements, ws = wm.getMaxScaleOnAxis();
      for (let k = 0; k < o.count; k++) {
        const x = A[k * 16 + 12], y = A[k * 16 + 13], z = A[k * 16 + 14];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        const grp = groupAt(wx, wz);
        grp.jobs.push({ o, g, wm, k }); grp.v += n; grp.i += ni;
        if (lazy) { IM.fromArray(A, k * 16); const r = gr * ws * IM.getMaxScaleOnAxis() + 0.01; grow(grp, wx - r, wz - r, wx + r, wz + r); }
      }
    } else if (big && ni >= 6) {
      // bin the triangles by centroid; every cell gets its own vertex list (vertices shared inside the cell)
      const B = binTriangles(g, wm, cs);
      for (let ci = 0; ci < B.cells.length; ci++) {
        const b = B.cells[ci], grp = groupAt(b.x, b.z);
        grp.jobs.push({ o, g, wm, B, ci }); grp.v += b.nv; grp.i += b.nt * 3;
        grow(grp, b.x0, b.z0, b.x1, b.z1);
      }
    } else {
      const grp = groupAt(c.x, c.z);
      grp.jobs.push({ o, g, wm }); grp.v += n; grp.i += ni;
      grow(grp, box.min.x, box.min.z, box.max.x, box.max.z);
    }
  });
  return { groups, moved, nSrc, skipped };
}

// ------------------------------------------------------------------ building one output cell (resumable between source jobs)
const NM = new THREE.Matrix3(), M = new THREE.Matrix4();
let mapIdx = new Int32Array(1024), vlist = new Uint32Array(1024);

function start(grp) {
  grp.pos = new Float32Array(grp.v * 3); grp.nrm = new Int8Array(grp.v * 3);
  grp.idx = grp.v > 65535 ? new Uint32Array(grp.i) : new Uint16Array(grp.i);
  grp.vo = 0; grp.io = 0; grp.j = 0;
}

/** appends geometry g (or cell ci of its triangle binning B) transformed by wm */
function emit(grp, g, wm, flip, B, ci) {
  const pa = g.attributes.position, na = g.attributes.normal;
  const P = readerOf(pa), N = na ? readerOf(na) : null;
  const pos = grp.pos, nrm = grp.nrm, idx = grp.idx, vo = grp.vo;
  let io = grp.io, n, verts = null;
  if (B) {
    // the cell's vertex list in first-use order; a vertex re-enters the list whenever another cell used it in between (the flag bits of binTriangles), exactly like the eager binning
    const cl = B.cells[ci], ia = g.index ? g.index.array : null, s0 = B.off[ci], s1 = B.off[ci + 1], F = B.flags, O = B.order;
    if (mapIdx.length < pa.count) mapIdx = new Int32Array(Math.max(pa.count, mapIdx.length * 2));
    if (vlist.length < cl.nv) vlist = new Uint32Array(Math.max(cl.nv, vlist.length * 2));
    let nv = 0;
    for (let q = s0; q < s1; q++) {
      const t = O[q], c3 = t * 3;
      const v0 = ia ? ia[c3] : c3, v1 = ia ? ia[c3 + 1] : c3 + 1, v2 = ia ? ia[c3 + 2] : c3 + 2;
      if (F[c3 >> 3] & (1 << (c3 & 7))) { mapIdx[v0] = nv; vlist[nv++] = v0; }
      const l0 = mapIdx[v0];
      if (F[(c3 + 1) >> 3] & (1 << ((c3 + 1) & 7))) { mapIdx[v1] = nv; vlist[nv++] = v1; }
      const l1 = mapIdx[v1];
      if (F[(c3 + 2) >> 3] & (1 << ((c3 + 2) & 7))) { mapIdx[v2] = nv; vlist[nv++] = v2; }
      const l2 = mapIdx[v2];
      idx[io++] = vo + l0; idx[io++] = vo + (flip ? l2 : l1); idx[io++] = vo + (flip ? l1 : l2);
    }
    n = nv; verts = vlist;
  } else n = pa.count;
  NM.getNormalMatrix(wm);
  const pe = wm.elements, m = NM.elements;
  for (let i = 0; i < n; i++) {
    const s = verts ? verts[i] : i, o3 = (vo + i) * 3, b = s * P.st + P.of;
    const x = rd(P, b), y = rd(P, b + 1), z = rd(P, b + 2);
    pos[o3] = pe[0] * x + pe[4] * y + pe[8] * z + pe[12];
    pos[o3 + 1] = pe[1] * x + pe[5] * y + pe[9] * z + pe[13];
    pos[o3 + 2] = pe[2] * x + pe[6] * y + pe[10] * z + pe[14];
    if (N) {
      const bn = s * N.st + N.of, nx = rd(N, bn), ny = rd(N, bn + 1), nz = rd(N, bn + 2);
      let tx = m[0] * nx + m[3] * ny + m[6] * nz, ty = m[1] * nx + m[4] * ny + m[7] * nz, tz = m[2] * nx + m[5] * ny + m[8] * nz;
      const k = 1 / (Math.sqrt(tx * tx + ty * ty + tz * tz) || 1);       // (Vector3.normalize: multiplyScalar(1 / length))
      tx *= k; ty *= k; tz *= k;
      nrm[o3] = Math.round(tx * 127); nrm[o3 + 1] = Math.round(ty * 127); nrm[o3 + 2] = Math.round(tz * 127);
    }
  }
  if (!B) {
    const ia = g.index ? g.index.array : null, cnt = ia ? g.index.count : n;
    for (let i = 0; i < cnt; i += 3) {
      const a = ia ? ia[i] : i, b = ia ? ia[i + 1] : i + 1, d = ia ? ia[i + 2] : i + 2;
      idx[io++] = vo + a; idx[io++] = vo + (flip ? d : b); idx[io++] = vo + (flip ? b : d);
    }
  }
  grp.vo = vo + n; grp.io = io;
}

/** a source whose CPU arrays were released before the build cannot be emitted: the job is dropped (counted, never expected) */
function intact(g) {
  const pa = g.attributes.position, ia = g.index;
  const arr = pa.isInterleavedBufferAttribute ? pa.data.array : pa.array;
  if (!arr || arr.length < pa.count * (pa.isInterleavedBufferAttribute ? 1 : pa.itemSize)) return false;
  if (ia && ia.array.length < ia.count) return false;
  const na = g.attributes.normal; if (na && !na.isInterleavedBufferAttribute && na.array.length < na.count * na.itemSize) return false;
  return true;
}

/** runs the jobs of grp until done (true) or past the deadline (false) */
function step(grp, deadline, st) {
  if (!grp.pos) start(grp);
  const jobs = grp.jobs;
  while (grp.j < jobs.length) {
    const j = jobs[grp.j++];
    if (!intact(j.g)) { st.lost++; if (st.lazy) NDLazy._report.lost++; }
    else if (j.k !== undefined) { j.o.getMatrixAt(j.k, M); M.premultiply(j.wm); emit(grp, j.g, M, M.determinant() < 0, null, 0); }
    else emit(grp, j.g, j.wm, j.wm.determinant() < 0, j.B || null, j.ci);
    if (st.lazy) unhold(j.g);
    jobs[grp.j - 1] = null;
    if (grp.j < jobs.length && performance.now() > deadline) return false;
  }
  finish(grp, st);
  return true;
}

function finish(grp, st) {
  const g = new THREE.BufferGeometry();
  // (a lost job leaves a zero tail: trim to the written part)
  const full = grp.vo === grp.v && grp.io === grp.i;
  g.setAttribute('position', new THREE.BufferAttribute(full ? grp.pos : grp.pos.slice(0, grp.vo * 3), 3));
  g.setAttribute('normal', new THREE.BufferAttribute(full ? grp.nrm : grp.nrm.slice(0, grp.vo * 3), 3, true));
  g.setIndex(new THREE.BufferAttribute(full ? grp.idx : grp.idx.slice(0, grp.io), 1));
  g.computeBoundingSphere();
  releaseOnUpload(g);      // the CPU copy goes once the buffers are on the GPU (core/spatial.js)
  const mesh = new THREE.Mesh(g, st.mat);
  mesh.name = 'nd-proxy'; mesh.userData.ndProxy = true; mesh.userData.noBatch = true; mesh.userData.sources = grp.jobs.length;
  mesh.castShadow = false; mesh.receiveShadow = false;
  mesh.layers.set(LAYER_ND);
  mesh.matrixAutoUpdate = false; mesh.updateMatrix();
  const tg = grp.tg; if (tg.u) mesh.userData.undergroundOnly = true; if (tg.s) mesh.userData.surfaceOnly = true; if (tg.a) mesh.userData.alwaysVisible = true; if (tg.z) mesh.userData.zone = tg.z;
  st.out.add(mesh);
  const range = grp.range;
  if (range) LOD.add(mesh, range.cx, range.cz, range.r, range.far, { nd: true, shadow: false, attach: true, near: range.near, sector: range.sector });
  else LOD.add(mesh, g.boundingSphere.center.x, g.boundingSphere.center.z, g.boundingSphere.radius, Infinity, { nd: true, shadow: false, attach: true });      // drawn only within the normal / depth range, parented to its sector (core/lod.js)
  st.tris += grp.i / 3; st.meshes++; st.bytes += grp.v * 15 + grp.i * grp.idx.BYTES_PER_ELEMENT;
  // The typed buffers now belong to the geometry; the jobs (and through them the per-source triangle orders) expire with the group.
  grp.pos = grp.nrm = grp.idx = null; grp.jobs = null; grp.done = true;
  if (st.lazy && NDLazy.onBuilt && (tg.u || tg.s)) NDLazy.onBuilt(mesh);
}

export function buildNDProxy(root, { cell = 128, material = null, lazy = false, ndFar = Infinity, lodMin = 0 } = {}) {      // material: the normal / depth material itself (pipeline.ndMat), drawn without an override (core/renderer.js)
  const t0 = performance.now();
  const never = lazy && lodMin > 0 ? { ndFar, lodMin } : null;
  const { groups, moved, nSrc, skipped } = scan(root, cell, lazy, never);
  const dummyMat = material || new THREE.MeshBasicMaterial({ colorWrite: false });         // without the nd material: never drawn with it (the normal / depth pass overrides it); the colour / shadow passes skip LAYER_ND
  const out = new THREE.Group(); out.name = 'static-nd';
  const st = { mat: dummyMat, out, lazy, tris: 0, meshes: 0, bytes: 0, lost: 0 };
  if (!lazy) {
    for (const grp of groups.values()) step(grp, Infinity, st);
    groups.clear();
    // the originals: out of the normal / depth pass (colour pass + sun shadow only)
    for (const o of moved) o.layers.set(LAYER_COLOR);
    root.add(out);
    return { meshes: st.meshes, sources: nSrc, triangles: Math.round(st.tris), mb: +(st.bytes / 1048576).toFixed(1), skipped, ms: Math.round(performance.now() - t0) };
  }
  for (const o of moved) o.layers.set(LAYER_COLOR);
  root.add(out);
  const report = NDLazy._report;
  report.sources += nSrc; report.skipped += skipped; report.builds++;
  let firstUnder = null;
  for (const grp of groups.values()) {
    if (grp.never) { report.dropped++; report.droppedTriangles += Math.round(grp.i / 3); continue; }
    for (const j of grp.jobs) hold(j.g);
    grp.st = st; grp.d = 0;
    if (!firstUnder && (grp.tg.u || grp.tg.a)) firstUnder = grp;
    NDLazy._add(grp);
  }
  groups.clear();
  // core/zones.js decides at refresh() whether the ND sector root holds underground content (keepsUnder): build one such cell now so that decision equals the eager build
  if (firstUnder) NDLazy._build(firstUnder, Infinity);
  report.scanMs += performance.now() - t0;
  NDLazy._sync();
  return report;
}

const _e = new Float32Array(16);
/** triangles of g binned by world-space centroid into cs m cells.
 *  { cells: [{ x, z, nt, nv, x0, z0, x1, z1 }], order: Uint32Array (triangle ids grouped by cell, stable), off: Uint32Array (cell starts), flags: Uint8Array (bit per corner: the vertex
 *  enters its cell's vertex list here, i.e. the previous triangle that used it lay in another cell) } - 4.4 bytes per triangle instead of materialised per-cell lists */
function binTriangles(g, wm, cs) {
  const pa = g.attributes.position, n = pa.count, ia = g.index ? g.index.array : null, nTri = Math.floor((ia ? ia.length : n) / 3);
  _e.set(wm.elements);
  const keyOf = new Map(), cellOfTri = new Int32Array(nTri), cells = [];
  const px = pa.array, interleaved = !px || pa.isInterleavedBufferAttribute;
  for (let t = 0; t < nTri; t++) {
    const a = ia ? ia[t * 3] : t * 3, b = ia ? ia[t * 3 + 1] : t * 3 + 1, c = ia ? ia[t * 3 + 2] : t * 3 + 2;
    let ax, ay, az, bx, by, bz, cx_, cy_, cz_;
    if (interleaved) { ax = pa.getX(a); ay = pa.getY(a); az = pa.getZ(a); bx = pa.getX(b); by = pa.getY(b); bz = pa.getZ(b); cx_ = pa.getX(c); cy_ = pa.getY(c); cz_ = pa.getZ(c); }
    else { ax = px[a * 3]; ay = px[a * 3 + 1]; az = px[a * 3 + 2]; bx = px[b * 3]; by = px[b * 3 + 1]; bz = px[b * 3 + 2]; cx_ = px[c * 3]; cy_ = px[c * 3 + 1]; cz_ = px[c * 3 + 2]; }
    const x = (ax + bx + cx_) / 3, y = (ay + by + cy_) / 3, z = (az + bz + cz_) / 3;
    const wx = _e[0] * x + _e[4] * y + _e[8] * z + _e[12], wz = _e[2] * x + _e[6] * y + _e[10] * z + _e[14];
    const cx = Math.floor(wx / cs), cz = Math.floor(wz / cs), k = (cx + 4096) * 8192 + (cz + 4096);
    let ci = keyOf.get(k); if (ci === undefined) { ci = cells.length; keyOf.set(k, ci); cells.push({ x: (cx + 0.5) * cs, z: (cz + 0.5) * cs, nt: 0, nv: 0, x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity }); }
    cellOfTri[t] = ci;
    const cl = cells[ci]; cl.nt++;
    // the cell's world XZ extent (the triangles reach out of the cell their centroid falls in)
    const xa = _e[0] * ax + _e[4] * ay + _e[8] * az + _e[12], za = _e[2] * ax + _e[6] * ay + _e[10] * az + _e[14];
    const xb = _e[0] * bx + _e[4] * by + _e[8] * bz + _e[12], zb = _e[2] * bx + _e[6] * by + _e[10] * bz + _e[14];
    const xc = _e[0] * cx_ + _e[4] * cy_ + _e[8] * cz_ + _e[12], zc = _e[2] * cx_ + _e[6] * cy_ + _e[10] * cz_ + _e[14];
    const lx = Math.min(xa, xb, xc), hx = Math.max(xa, xb, xc), lz = Math.min(za, zb, zc), hz = Math.max(za, zb, zc);
    if (lx < cl.x0) cl.x0 = lx; if (hx > cl.x1) cl.x1 = hx; if (lz < cl.z0) cl.z0 = lz; if (hz > cl.z1) cl.z1 = hz;
  }
  const lastCell = new Int32Array(n).fill(-1), flags = new Uint8Array((nTri * 3 + 7) >> 3);
  for (let t = 0; t < nTri; t++) {
    const ci = cellOfTri[t], cl = cells[ci];
    for (let j = 0; j < 3; j++) {
      const q = t * 3 + j, v = ia ? ia[q] : q;
      if (lastCell[v] !== ci) { lastCell[v] = ci; cl.nv++; flags[q >> 3] |= 1 << (q & 7); }
    }
  }
  const off = new Uint32Array(cells.length + 1);
  for (let ci = 0; ci < cells.length; ci++) off[ci + 1] = off[ci] + cells[ci].nt;
  const fill = off.slice(0, cells.length), order = new Uint32Array(nTri);
  for (let t = 0; t < nTri; t++) order[fill[cellOfTri[t]]++] = t;
  for (const cl of cells) { cl.x0 -= 0.01; cl.z0 -= 0.01; cl.x1 += 0.01; cl.z1 += 0.01; }
  return { cells, order, off, flags };
}

// ------------------------------------------------------------------ the lazy pump
const rectD2 = (g, x, z) => { const dx = x < g.x0 ? g.x0 - x : x > g.x1 ? x - g.x1 : 0, dz = z < g.z0 ? g.z0 - z : z > g.z1 ? z - g.z1 : 0; return dx * dx + dz * dz; };
const _q = [];
export const NDLazy = {
  ndFar: 150, budget: 3, prefetch: 150,
  /** called with each lazily built proxy that carries an undergroundOnly / surfaceOnly tag (main.js: zones.attach) */
  onBuilt: null,
  tiles: new Map(), wide: [], all: [], pending: 0, qx: NaN, qz: NaN, dirty: true,
  _report: { lazy: true, meshes: 0, sources: 0, triangles: 0, mb: 0, bytes: 0, skipped: 0, ms: 0, scanMs: 0, buildMs: 0, pending: 0, pendingTriangles: 0, dropped: 0, droppedTriangles: 0, lost: 0, builds: 0, syncBuilds: 0 },
  _add(grp) {
    this.pending++; this._report.pendingTriangles += Math.round(grp.i / 3); this.all.push(grp); this.dirty = true;
    const tx0 = Math.floor(grp.x0 / TILE), tx1 = Math.floor(grp.x1 / TILE), tz0 = Math.floor(grp.z0 / TILE), tz1 = Math.floor(grp.z1 / TILE);
    if (!Number.isFinite(tx0 + tx1 + tz0 + tz1) || (tx1 - tx0 + 1) * (tz1 - tz0 + 1) > 16) { this.wide.push(grp); return; }
    for (let tx = tx0; tx <= tx1; tx++) for (let tz = tz0; tz <= tz1; tz++) { const k = (tx + 4096) * 8192 + (tz + 4096); let l = this.tiles.get(k); if (!l) this.tiles.set(k, (l = [])); l.push(grp); }
  },
  _build(grp, deadline) {
    if (grp.done) return true;
    const t = performance.now(), st = grp.st, m0 = st.meshes, b0 = st.bytes;
    const ok = step(grp, deadline, st);
    this._report.buildMs += performance.now() - t;
    if (ok) {
      this.pending--; const r = this._report;
      r.meshes += st.meshes - m0; r.triangles += Math.round(grp.i / 3); r.pendingTriangles -= Math.round(grp.i / 3);
      r.bytes += st.bytes - b0; r.mb = +(r.bytes / 1048576).toFixed(1); grp.st = null;
    }
    return ok;
  },
  _sync() { const r = this._report; r.pending = this.pending; r.ms = Math.round(r.scanMs + r.buildMs); },
  /** once per frame before LOD.update (and once in the start pose, budget Infinity): builds the cells the camera can see now, then prefetches by distance within the budget (ms) */
  update(cam, { budget = this.budget, ndFar = this.ndFar, prefetch = this.prefetch } = {}) {
    if (!this.pending) return 0;
    const t0 = performance.now(), x = cam.x, z = cam.z;
    if (this.dirty || (x - this.qx) ** 2 + (z - this.qz) ** 2 > 64) {
      // re-query the pending cells within the prefetch radius, nearest first
      this.dirty = false; this.qx = x; this.qz = z; _q.length = 0;
      const R = ndFar + prefetch, R2 = R * R, tx0 = Math.floor((x - R) / TILE), tx1 = Math.floor((x + R) / TILE), tz0 = Math.floor((z - R) / TILE), tz1 = Math.floor((z + R) / TILE);
      const take = (l) => { let w = 0; for (const g of l) { if (g.done) continue; l[w++] = g; if (!g.qMark && (g.d = rectD2(g, x, z)) <= R2) { g.qMark = true; _q.push(g); } } l.length = w; };
      for (let tx = tx0; tx <= tx1; tx++) for (let tz = tz0; tz <= tz1; tz++) { const l = this.tiles.get((tx + 4096) * 8192 + (tz + 4096)); if (l) { take(l); if (!l.length) this.tiles.delete((tx + 4096) * 8192 + (tz + 4096)); } }
      take(this.wide);
      for (const g of _q) g.qMark = false;
      _q.sort((a, b) => a.d - b.d);
    }
    const need = (ndFar + NEED_SLACK) ** 2, deadline = t0 + budget;
    let built = 0;
    for (const g of _q) {
      if (g.done) continue;
      if (rectD2(g, x, z) <= need) { this._build(g, Infinity); built++; this._report.syncBuilds++; continue; }
      if (performance.now() > deadline) continue;              // (keep scanning: a farther entry may still be needed now after the camera moved)
      if (this._build(g, deadline)) built++;
    }
    if (built) { if (this.all.length > 2 * this.pending + 1024) this.all = this.all.filter(g => !g.done); this._sync(); }
    return built;
  },
  /** builds every pending cell (diagnostics / tests; never in normal play) */
  flushAll() { for (const g of this.all) this._build(g, Infinity); this.all.length = 0; this.tiles.clear(); this.wide.length = 0; _q.length = 0; this._sync(); },
  /** forget every pending cell (tests) */
  reset() { this.tiles.clear(); this.wide.length = 0; this.all.length = 0; this.pending = 0; _q.length = 0; this.dirty = true; holds.clear(); Object.assign(this._report, { meshes: 0, sources: 0, triangles: 0, mb: 0, bytes: 0, skipped: 0, ms: 0, scanMs: 0, buildMs: 0, pending: 0, pendingTriangles: 0, dropped: 0, droppedTriangles: 0, lost: 0, builds: 0, syncBuilds: 0 }); },
};
