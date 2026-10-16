// Static batching v2 — transparent to modules, identical look, far fewer draw calls:
//  * every MeshToon / MeshBasic material colour is baked into per-vertex colours (linear), so
//    materials that differ only by colour share one material;
//  * canvas textures whose UVs stay inside [0,1] (signs, posters, labels…) are packed into
//    4096² atlas pages and their UVs remapped, so textured meshes share a few page materials;
//  * cells are 48 m near the play area and 200 m for distant scenery;
//  * UNDERGROUND (docs/UNDERGROUND.md): objects tagged userData.undergroundOnly / surfaceOnly / zone (on the object or any ancestor) and every object whose
//    centre is deeper than DEEP_Y are batched per 64 m x 20 m (vertical) cell and never merged with street objects or with other tags, so a merged mesh never
//    spans street + platform (its bounding sphere would defeat frustum culling); big deep objects (wider than 160 m or taller than 30 m: an escalator-long strip) stay unmerged; the merged meshes keep the tags (core/zones.js
//    switches them), undergroundOnly meshes do not cast sun shadows.
//  * SPATIAL (2026-10): objects are classed by size (core/spatial.js: S < 5 m, M < 16 m, L) and never merged across classes; a merged mesh wider than 1.5 cells (the 'big' objects: long
//    kerbs, quays, the ground, water, the lamps of a whole district) is cut into 'farCell' m pieces by triangle, so frustum culling, the sun shadow box and the distance LOD
//    (small things vanish beyond 350 m, medium beyond 900 m, scaled by the quality tier) work per cell. A big object that keeps its own material is cut the same way.
import * as THREE from 'three';
import { mergeStaticGeometryStream, releasePrivateGeometry } from './merge-static-geometries.js';
import { splitGeometryByCell, sizeClass, featureClass, farOfClass, registerLOD, likeMesh, releaseOnUpload, dropNaNTriangles, FAR_SWITCH, largePieceFar, SKYLINE_TOP, FAR_L_LOW } from './spatial.js';
import { LOD, SECTOR } from './lod.js';
import { MASK_COLOR } from './renderer.js';
import { VPAINT_SCALE } from './materials.js';
import { privateStaticBatch } from './compact-static.js';

const PAGE = 4096, PAD = 6, MAXTILE = 2048;
// FAR SUPER-CELLS (plan 2026-10-15 item 1b): the far proxies of SUPER x SUPER m (4 x 4 sectors) are merged into ONE draw that replaces them once the camera is beyond
// FAR_SWITCH * scale + (largest member sector offset) + SUPER_MARGIN m from the super-cell centre (core/lod.js addSuper: every member is then already past its own switch,
// so the merged draw only ever replaces geometry that would be drawn). Triangles smaller than SUPER_MIN_AREA m2 below SKYLINE_TOP are dropped from the merged copy
// (sub-pixel at that distance; spires, domes and roof profiles above SKYLINE_TOP keep every triangle). ?supercells=0 = none, ?superdecimate=0 = keep every triangle.
export const SUPER = 1280, SUPER_MARGIN = 300, SUPER_MIN_AREA = 0.05;
const SUPER_DECIMATE = typeof location === 'undefined' || new URLSearchParams(location.search).get('superdecimate') !== '0';
/** merges far-proxy style geometries (position, normalized normal/colour, index; world space) into one, dropping triangles under minArea m2 whose top is below SKYLINE_TOP */
export function mergeFarGeometries(geos, minArea = 0) {
  let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const remap = new Int32Array(nv), keep = new Uint8Array(ni / 3); let kv = 0, ki = 0, vo = 0, to = 0;
  for (const g of geos) {
    const p = g.attributes.position.array, ia = g.index.array, base = vo;
    for (let t = 0; t < ia.length; t += 3, to++) {
      const a = ia[t] * 3, b = ia[t + 1] * 3, c = ia[t + 2] * 3;
      if (minArea > 0 && Math.max(p[a + 1], p[b + 1], p[c + 1]) < SKYLINE_TOP) {
        const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2];
        const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
        if (cx * cx + cy * cy + cz * cz < 4 * minArea * minArea) continue;
      }
      keep[to] = 1; ki += 3;
      for (let j = 0; j < 3; j++) { const v = base + ia[t + j]; if (!remap[v]) remap[v] = ++kv; }
    }
    vo += g.attributes.position.count;
  }
  if (!ki) return null;
  const pos = new Float32Array(kv * 3), nrm = new Int8Array(kv * 3), col = new Uint8Array(kv * 3), idx = kv > 65535 ? new Uint32Array(ki) : new Uint16Array(ki);
  vo = 0; to = 0; let io = 0;
  for (const g of geos) {
    const p = g.attributes.position.array, n = g.attributes.normal.array, cl = g.attributes.color.array, ia = g.index.array, cnt = g.attributes.position.count;
    for (let i = 0; i < cnt; i++) { const r = remap[vo + i]; if (!r) continue; const o = (r - 1) * 3, s = i * 3; pos[o] = p[s]; pos[o + 1] = p[s + 1]; pos[o + 2] = p[s + 2]; nrm[o] = n[s]; nrm[o + 1] = n[s + 1]; nrm[o + 2] = n[s + 2]; col[o] = cl[s]; col[o + 1] = cl[s + 1]; col[o + 2] = cl[s + 2]; }
    for (let t = 0; t < ia.length; t += 3, to++) if (keep[to]) { idx[io++] = remap[vo + ia[t]] - 1; idx[io++] = remap[vo + ia[t + 1]] - 1; idx[io++] = remap[vo + ia[t + 2]] - 1; }
    vo += cnt;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true)); g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
  g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
const DEEP_Y = -3, DEEP_CELL = 64, DEEP_BAND = 20;          // objects centred below DEEP_Y are 'deep': own batches per cell and 20 m band
/** visibility tags of an object: its own and its ancestors' (up to root) */
function tagsOf(o, root) {
  const t = { u: false, s: false, a: false, z: '' };
  for (let p = o; p && p !== root.parent; p = p.parent) { const d = p.userData; if (d.undergroundOnly) t.u = true; if (d.surfaceOnly) t.s = true; if (d.alwaysVisible) t.a = true; if (d.zone && !t.z) t.z = String(d.zone); }
  return t;
}

export function uvInUnit(g) {
  const uv = g.attributes.uv; if (!uv) return false;
  for (let i = 0; i < uv.count; i++) { const u = uv.getX(i), v = uv.getY(i); if (u < -0.002 || u > 1.002 || v < -0.002 || v > 1.002 || !Number.isFinite(u)) return false; }
  return true;
}
export function atlasableTex(t) {
  if (!t || !t.image || t.isDataTexture || t.isCompressedTexture || t.isVideoTexture) return false;
  const img = t.image; const w = img.width, h = img.height;
  if (!(w > 0 && h > 0) || w > MAXTILE || h > MAXTILE) return false;
  if (t.repeat.x !== 1 || t.repeat.y !== 1 || t.offset.x !== 0 || t.offset.y !== 0 || t.rotation !== 0) return false;
  if (t.magFilter === THREE.NearestFilter || t.colorSpace !== THREE.SRGBColorSpace || t.flipY !== true) return false;
  if (typeof document === 'undefined' || !(img instanceof (globalThis.HTMLCanvasElement || Object) || img instanceof (globalThis.ImageBitmap || Object) || img instanceof (globalThis.HTMLImageElement || Object))) return false;
  return true;
}

export function buildAtlas(textures) {
  // shelf packing, tallest first
  const list = [...textures].map(t => ({ t, w: t.image.width, h: t.image.height })).sort((a, b) => b.h - a.h || b.w - a.w);
  const pages = []; const map = new Map();
  let page = null, x = 0, y = 0, shelf = 0;
  const newPage = () => { const c = document.createElement('canvas'); c.width = PAGE; c.height = PAGE; page = { canvas: c, g: c.getContext('2d'), used: 0 }; pages.push(page); x = 0; y = 0; shelf = 0; };
  for (const it of list) {
    const W = it.w + PAD * 2, H = it.h + PAD * 2;
    if (!page) newPage();
    if (x + W > PAGE) { x = 0; y += shelf; shelf = 0; }
    if (y + H > PAGE) { newPage(); }
    const px = x + PAD, py = y + PAD;
    try {
      page.g.drawImage(it.t.image, px - PAD, py - PAD, it.w + PAD * 2, it.h + PAD * 2); // stretched gutter
      page.g.drawImage(it.t.image, px, py, it.w, it.h);
    } catch (e) { continue; }
    map.set(it.t, { page: pages.length - 1, u0: px / PAGE, v0: 1 - (py + it.h) / PAGE, su: it.w / PAGE, sv: it.h / PAGE });
    x += W; shelf = Math.max(shelf, H); page.used++;
  }
  const texs = pages.map(p => { const t = new THREE.CanvasTexture(p.canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t; });
  return { map, texs };
}

function sideName(m) { return m.side === THREE.DoubleSide ? 'double' : m.side === THREE.BackSide ? 'back' : 'front'; }

/** Metadata-only count/schema pass matching prepareStaticBatchGeometry. */
export function staticBatchPlan({ o, tile }, needColor, needPaint) {
  const g = o.geometry, n = g.attributes.position.count, names = new Map(Object.keys(g.attributes).map(name => [name, null]));
  if (!names.has('normal')) names.set('normal', null);
  if (!names.has('uv')) names.set('uv', null);
  if (needColor) names.set('color', null);
  if (needPaint) names.set('aPaint', null);
  const attributes = [];
  for (const name of names.keys()) {
    if (!['position','normal','uv'].includes(name) && !(name === 'color' && needColor) && !(name === 'aPaint' && needPaint)) continue;
    const src = g.attributes[name];
    const replaced = !src || (name === 'color' && needColor) || (name === 'uv' && tile) || (name === 'aPaint' && needPaint);
    const converted = src && (src.isInterleavedBufferAttribute || src.normalized || !(src.array instanceof Float32Array));
    const size = replaced ? (name === 'uv' ? 2 : name === 'aPaint' ? 1 : 3) : src.itemSize;
    attributes.push({ name, size, count: replaced ? n : src.count, ArrayType: name === 'aPaint' ? Uint8Array : Float32Array,
      normalized: name === 'aPaint', gpuType: replaced || converted ? THREE.FloatType : src.gpuType });
  }
  // The existing NaN guard uses raw position triples and retains all vertices.
  const p = g.attributes.position.array; let bad = null;
  for (let i = 0; i < n; i++) if (!Number.isFinite(p[i*3] + p[i*3+1] + p[i*3+2])) (bad || (bad = new Uint8Array(n)))[i] = 1;
  let indexCount = 0, maxIndex = -Infinity;
  if (!bad) {
    indexCount = g.index ? g.index.count : n;
    if (!g.index) maxIndex = n - 1;
    else for (let i = 0; i < g.index.count; i++) maxIndex = Math.max(maxIndex, g.index.getX(i));
  } else {
    const ia = g.index?.array, count = Math.floor((ia ? ia.length : n) / 3);
    for (let t = 0; t < count; t++) {
      const a = ia ? ia[t*3] : t*3, b = ia ? ia[t*3+1] : t*3+1, c = ia ? ia[t*3+2] : t*3+2;
      if (bad[a] || bad[b] || bad[c]) continue;
      indexCount += 3; maxIndex = Math.max(maxIndex, a, b, c);
    }
  }
  return { vertices: n, indexCount, maxIndex, attributes, relative: g.morphTargetsRelative };
}

/** Existing preparation, unchanged in order/rounding, for one private source. */
export function prepareStaticBatchGeometry({ o, bake, tile }, needColor, needPaint) {
  const g = dropNaNTriangles(o.geometry.clone());
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const n = g.attributes.position.count;
  if (needColor) {
    const src = g.attributes.color, useSrc = src && o.material.vertexColors;
    const br = bake ? bake.r : 1, bgc = bake ? bake.g : 1, bb = bake ? bake.b : 1, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i*3] = (useSrc ? src.getX(i) : 1) * br; a[i*3+1] = (useSrc ? src.getY(i) : 1) * bgc; a[i*3+2] = (useSrc ? src.getZ(i) : 1) * bb; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  }
  if (needPaint) { const t = o.material.userData.toon, v = Math.max(0, Math.min(255, Math.round(((t && t.paint) || 0) / VPAINT_SCALE * 255))); g.setAttribute('aPaint', new THREE.BufferAttribute(new Uint8Array(n).fill(v), 1, true)); }
  if (tile) {
    const uv = g.attributes.uv, a = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { const u = Math.min(1, Math.max(0, uv.getX(i))), v = Math.min(1, Math.max(0, uv.getY(i))); a[i*2] = tile.u0 + u * tile.su; a[i*2+1] = tile.v0 + v * tile.sv; }
    g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  }
  for (const name of Object.keys(g.attributes)) if (!['position','normal','uv'].includes(name) && !(needColor && name === 'color') && !(needPaint && name === 'aPaint')) g.deleteAttribute(name);
  for (const name of Object.keys(g.attributes)) {
    const at = g.attributes[name]; if (name === 'aPaint') continue;
    if (at.isInterleavedBufferAttribute || at.normalized || !(at.array instanceof Float32Array)) {
      const a = new Float32Array(at.count * at.itemSize);
      for (let i = 0; i < at.count; i++) for (let j = 0; j < at.itemSize; j++) a[i*at.itemSize+j] = at.getComponent(i,j);
      g.setAttribute(name, new THREE.BufferAttribute(a, at.itemSize));
    }
  }
  if (!g.index) { const idx = new Uint32Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(new THREE.BufferAttribute(idx, 1)); }
  g.clearGroups(); g.applyMatrix4(o.matrixWorld);
  if (o.matrixWorld.determinant() < 0) { const ia = g.index.array; for (let i = 0; i < ia.length; i += 3) { const t = ia[i+1]; ia[i+1] = ia[i+2]; ia[i+2] = t; } }
  g.morphAttributes = {}; return g;
}

export function batchStatic(root, { mat = null, nearCell = 48, farCell = 200, farR = 150, atlasTextures = true, single = false } = {}) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = new THREE.Vector3();
  const cand = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.userData.noBatch || !o.visible) return;
    if (Array.isArray(o.material)) return;
    for (let p = o.parent; p && p !== root; p = p.parent) if (p.userData.noBatch || !p.visible) return;
    const g = o.geometry;
    if (!g || !g.attributes.position || g.morphAttributes?.position) return;
    cand.push(o);
  });
  // ---- atlas candidates
  const atlasTex = new Set(); const uvOk = new Map();
  if (mat) for (const o of cand) {
    const m = o.material;
    if (!(m.isMeshToonMaterial || m.isMeshBasicMaterial) || !m.map || m.alphaMap || (m.isMeshToonMaterial && !(m.userData.toon && m.onBeforeCompile === m.userData.toon.obc))) continue;
    if (!atlasableTex(m.map)) continue;
    let ok = uvOk.get(o.geometry); if (ok === undefined) { ok = uvInUnit(o.geometry); uvOk.set(o.geometry, ok); }
    if (ok) atlasTex.add(m.map);
  }
  // texture must be atlasable for ALL its users, otherwise keep it separate
  if (mat) for (const o of cand) { const m = o.material; if (m.map && atlasTex.has(m.map) && !uvOk.get(o.geometry)) atlasTex.delete(m.map); }
  if (!atlasTextures) atlasTex.clear();                          // (batchGroup: a small dynamic model must not allocate 4096 px pages)
  const atlas = atlasTex.size ? buildAtlas(atlasTex) : { map: new Map(), texs: [] };

  // ---- group
  const groups = new Map(); const shared = new Map(); const classHist = {}, skyLifted = { n: 0, list: [] };
  for (const o of cand) {
    const g = o.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!Number.isFinite(g.boundingBox.min.x + g.boundingBox.max.x + g.boundingBox.min.y + g.boundingBox.max.y + g.boundingBox.min.z + g.boundingBox.max.z)) { dropNaNTriangles(g); g.computeBoundingBox(); g.computeBoundingSphere(); }
    box.copy(g.boundingBox).applyMatrix4(o.matrixWorld); box.getCenter(c);
    const tg = tagsOf(o, root), deep = tg.u || c.y < DEEP_Y;
    const far = !deep && Math.max(Math.abs(c.x), Math.abs(c.z - 10)) > farR;
    const cell = deep ? DEEP_CELL : far ? farCell : nearCell;
    const big = box.max.x - box.min.x > cell * (deep ? 2.5 : 1.5) || box.max.z - box.min.z > cell * (deep ? 2.5 : 1.5) || (deep && box.max.y - box.min.y > DEEP_BAND * 1.5);
    const ix = single ? 0 : big ? (deep ? 'B' + o.uuid : 'L') : Math.floor(c.x / cell), iz = single ? 0 : big ? 'L' : Math.floor(c.z / cell), iy = single ? 0 : deep ? Math.floor(c.y / DEEP_BAND) : 0;
    const dx = box.max.x - box.min.x, dy = box.max.y - box.min.y, dz = box.max.z - box.min.z, dim = Math.max(dx, dy, dz), mid = dx + dy + dz - dim - Math.min(dx, dy, dz);
    const authored = single ? null : LOD.of(o);
    const cls = single || deep || authored ? 'L' : dim > 300 && !o.isInstancedMesh ? featureClass(g, o.matrixWorld) : sizeClass(dim, mid, box.max.y, !!o.userData.skyline);
    if (!single && !deep && cls === 'L' && dim <= 300 && sizeClass(dim, mid) !== 'L') { skyLifted.n++; if (skyLifted.list.length < 12) skyLifted.list.push(`${o.name || o.parent?.name || '?'}@${Math.round(c.x)},${Math.round(c.z)} ${Math.round(dim)}x${mid.toFixed(1)}`); }      // (skyline objects lifted to L: stats only)      // (a mesh wider than 300 m is a merge of many things: classed by its triangle size)
    const nt = ((g.index ? g.index.count : g.attributes.position.count) / 3) | 0; classHist[cls] = (classHist[cls] || 0) + nt;
    const m = o.material;
    let target = m, bake = null, tile = null;
    const convertible = mat && ((m.isMeshToonMaterial && m.userData.toon && m.onBeforeCompile === m.userData.toon.obc && !m.alphaMap && !m.normalMap && !m.bumpMap && !m.displacementMap && !m.defines?.USE_CUSTOM) || (m.isMeshBasicMaterial && !m.alphaMap && !m.envMap && !m.lightMap && !m.aoMap));
    if (convertible) {
      tile = m.map ? atlas.map.get(m.map) || null : null;
      const mapKey = m.map ? (tile ? 'page' + tile.page : m.map.uuid) : 'none';
      let sig;
      if (m.isMeshToonMaterial) {
        const t = m.userData.toon;
        // (paint is a vertex attribute of the merged mesh: materials that differ only by their paint amount share one shared material)
        sig = `T|${mapKey}|${sideName(m)}|${m.transparent}|${m.opacity}|${m.alphaTest}|${m.depthWrite}|vp|${t.polygonOffset}|${m.emissive.getHexString()}|${m.emissiveIntensity}`;
      } else {
        sig = `B|${mapKey}|${sideName(m)}|${m.transparent}|${m.opacity}|${m.alphaTest}|${m.depthWrite}|${m.fog}|${m.toneMapped}`;
      }
      let sm = shared.get(sig);
      if (!sm) {
        const map = m.map ? (tile ? atlas.texs[tile.page] : m.map) : null;
        const common = { map, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, depthWrite: m.depthWrite, vertexColors: true };
        const side = sideName(m); if (side !== 'front') common.side = side;
        if (m.isMeshToonMaterial) {
          const t = m.userData.toon;
          const opts = { ...common, vpaint: true, paint: 0 };
          if (t.polygonOffset) opts.polygonOffset = t.polygonOffset;
          if (m.emissive && (m.emissive.r || m.emissive.g || m.emissive.b)) { opts.emissive = '#' + m.emissive.getHexString(); opts.emissiveIntensity = m.emissiveIntensity; }
          sm = mat.toon('#ffffff', opts);
        } else {
          sm = new THREE.MeshBasicMaterial({ color: 0xffffff, map, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, depthWrite: m.depthWrite, side: m.side, fog: m.fog, toneMapped: m.toneMapped, vertexColors: true });
        }
        shared.set(sig, sm);
      }
      target = sm; bake = m.color;
    }
    // An authored collector may span many buildings: its aggregate size says
    // nothing about the intended detail range. Merge only identical visibility
    // contracts, including the anchor/radius of an exclusive near/far pair.
    const range = authored && (Number.isFinite(authored.far) || authored.near) ? {
      cx: authored.cx, cz: authored.cz, r: authored.r, far: authored.far,
      near: authored.near, sector: authored.sector, shadow: authored.shadow,
    } : null;
    const rangeKey = range ? `${range.cx},${range.cz},${range.r},${range.far},${range.near},${+range.sector},${+range.shadow}` : '';
    const key = `${target.uuid}|${ix},${iy},${iz}|${cls}|${tg.u ? 1 : 0}${tg.s ? 1 : 0}${tg.a ? 1 : 0}${tg.z}|${o.layers.mask}|${o.castShadow ? 1 : 0}${o.receiveShadow ? 1 : 0}|${o.renderOrder}|${o.frustumCulled ? 1 : 0}|${rangeKey}`;
    let arr = groups.get(key); if (!arr) groups.set(key, (arr = { mat: target, items: [], cls, big, cell, range }));
    arr.items.push({ o, bake, tile, tg }); if (authored || o.userData.skyline) arr.authored = true;      // (an authored range or an explicit skyline flag: never range-audited)
  }

  // ---- merge
  const hist = {}, nonAtlas = {}, underground = [];
  for (const [, grp] of groups) { const m = grp.mat; let k = m.type; if (m.map) k += m.map.image && m.map.image.width === PAGE ? '+atlas' : '+map'; if (m.transparent) k += '+tr'; if (m.alphaTest) k += '+at'; hist[k] = (hist[k] || 0) + 1; }
  for (const o of cand) {
    if (tagsOf(o, root).u) underground.push(o);
    const m = o.material; if (m.map && !atlas.map.has(m.map)) { const r = !atlasableTex(m.map) ? 'tex:' + (m.map.wrapS !== THREE.ClampToEdgeWrapping ? 'wrap' : m.map.repeat.x !== 1 || m.map.repeat.y !== 1 ? 'repeat' : (m.map.image && (m.map.image.width > MAXTILE || m.map.image.height > MAXTILE)) ? 'big' : 'other') : 'uv'; nonAtlas[r] = (nonAtlas[r] || 0) + 1; }
  }
  // The groups now own the candidate references. Let each completed group die
  // while the next is prepared, instead of keeping the entire original city
  // alive alongside every newly merged buffer until the end of this pass.
  cand.length = 0; uvOk.clear();
  let merged = 0, sources = 0, pieces = 0, lodMeshes = 0, outMeshes = 0;
  const victims = [];
  const retire = o => {
    // Only registered sources must survive until the bulk registry removal.
    // Unregistered sources can be collected immediately. Their geometry is not
    // mutated/disposed: another instance or a dynamic template may share it.
    if (LOD.of(o)) victims.push(o);
    o.removeFromParent();
  };
  const out = new THREE.Group(); out.name = 'static-batched';
  const tagMesh = (mesh, tg0) => { if (tg0.u) mesh.userData.undergroundOnly = true; if (tg0.s) mesh.userData.surfaceOnly = true; if (tg0.a) mesh.userData.alwaysVisible = true; if (tg0.z) mesh.userData.zone = tg0.z; };
  // FAR PROXIES: beyond FAR_SWITCH m (scaled by the quality tier) a sector is drawn as ONE vertex-coloured mesh of its large opaque toon pieces (textures replaced by their mean colour,
  // paint / grime variation dropped) instead of one piece per material: a long view down Nevsky drew 7 400 calls, most of them pieces of distant sectors. The detail pieces of such a
  // sector hide beyond the same distance (core/lod.js: sector-centred switch, no overlap). Atlas-textured, basic and transparent pieces keep drawing themselves at every distance.
  const farBins = new Map(), texAvg = new Map();
  const avgOf = (map) => {
    if (!map) return [1, 1, 1];
    let a = texAvg.get(map); if (a) return a;
    a = [1, 1, 1];
    try {
      const c = document.createElement('canvas'); c.width = 4; c.height = 4; const g2 = c.getContext('2d', { willReadFrequently: true });
      g2.drawImage(map.image, 0, 0, 4, 4); const d = g2.getImageData(0, 0, 4, 4).data; let r = 0, gg = 0, b = 0;
      for (let i = 0; i < 16; i++) { r += d[i * 4]; gg += d[i * 4 + 1]; b += d[i * 4 + 2]; }
      const lin = (v) => { v /= 255 * 16; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      a = [lin(r), lin(gg), lin(b)];
    } catch (e) { /* a texture that cannot be read: white */ }
    texAvg.set(map, a); return a;
  };
  // RANGE AUDIT (plan item 1a, core/spatial.js largePieceFar): an L piece that is not replaced by a far proxy gets a finite range unless it belongs to the skyline or is a
  // tall mass / large surface. stats.rangeAudit lists the reasons, material kinds and sample sources (the 'sectors' family beyond 3 km of the call audit).
  const rangeAudit = { pieces: 0, triangles: 0, why: {}, mat: {}, samples: [] };
  const matKind = (m, tg0) => tg0.z ? 'zone' : tg0.u ? 'underground' : m.isMeshBasicMaterial ? 'basic' : m.transparent ? 'transparent' : m.alphaTest > 0 ? 'alphaTest' : m.map && m.map.image && m.map.image.width === PAGE ? 'atlas' : !m.vertexColors ? 'own' : 'layers';
  let lastWhy = '';
  const auditPiece = (g, wm, src, m, tg0) => {
    const { far: f, why } = largePieceFar(g, wm, DEEP_Y), nt = ((g.index ? g.index.count : g.attributes.position.count) / 3) | 0, k = matKind(m, tg0); lastWhy = why;
    rangeAudit.pieces++; rangeAudit.why[why] = (rangeAudit.why[why] || 0) + 1; rangeAudit.mat[k] = (rangeAudit.mat[k] || 0) + 1; if (f < Infinity) rangeAudit.triangles += nt;
    if (rangeAudit.samples.length < 40) rangeAudit.samples.push(`${src.name || src.parent?.name || '?'}|${m.name || m.type}|${k}|${why}|${nt}`);
    return f;
  };
  // (round 3, 2026-10-15: at street level 170-240 unnamed facade pieces drew beyond 1.5 km because their materials could not join a far proxy. Now an atlas-page texture is
  //  sampled per vertex from a 128 px downsample of the page (pageSampler), a basic piece joins lit by the proxy material, and a piece on the no-outline colour layer joins
  //  like one on layer 0 (the proxy never draws in the normal / depth pass anyway). Alpha-tested and transparent pieces still cannot: a tall one of those ('mass') now ends
  //  at FAR_L_LOW instead of drawing city-wide. ?farall=0 = the old rules.)
  const FAR_ALL = typeof location === 'undefined' || new URLSearchParams(location.search).get('farall') !== '0';
  const SAMP = 128, samplers = new Map();
  /** per-vertex colour sampler of an atlas page (linear rgb of a SAMP x SAMP box average, uv as the merged geometry carries it: v from the bottom); null for any other map */
  const pageSampler = (map) => {
    if (!FAR_ALL || !map || !map.image || map.image.width !== PAGE) return null;
    let s = samplers.get(map); if (s !== undefined) return s;
    s = null;
    try {
      const c = document.createElement('canvas'); c.width = SAMP; c.height = SAMP; const g2 = c.getContext('2d', { willReadFrequently: true });
      g2.drawImage(map.image, 0, 0, SAMP, SAMP); const d = g2.getImageData(0, 0, SAMP, SAMP).data, lin = new Float32Array(SAMP * SAMP * 3);
      const toLin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      for (let i = 0; i < SAMP * SAMP; i++) { lin[i * 3] = toLin(d[i * 4]); lin[i * 3 + 1] = toLin(d[i * 4 + 1]); lin[i * 3 + 2] = toLin(d[i * 4 + 2]); }
      s = (u, v, out) => { const x = Math.min(SAMP - 1, Math.max(0, (u * SAMP) | 0)), y = Math.min(SAMP - 1, Math.max(0, ((1 - v) * SAMP) | 0)), o = (y * SAMP + x) * 3; out[0] = lin[o]; out[1] = lin[o + 1]; out[2] = lin[o + 2]; return out; };
    } catch (e) { /* a page that cannot be read: no sampling (white) */ }
    samplers.set(map, s); return s;
  };
  const farOK = (m) => !single && mat && (m.isMeshToonMaterial || (FAR_ALL && m.isMeshBasicMaterial)) && m.vertexColors && !m.transparent && !(m.alphaTest > 0) && (FAR_ALL || !(m.map && m.map.image && m.map.image.width === PAGE));
  const colourLayer = (o) => o.layers.mask === 1 || (FAR_ALL && o.layers.mask !== 0 && (o.layers.mask & ~MASK_COLOR) === 0);
  /** a merged (world-space) geometry wider than 1.5 cells is cut into farCell pieces; every resulting mesh gets the LOD distance of its size class */
  const place = (mg, matT, s, tg0, nSrc, cls, cellW, range, authored = false) => {
    const wide = !single && (mg.boundingBox.max.x - mg.boundingBox.min.x > cellW * 1.5 || mg.boundingBox.max.z - mg.boundingBox.min.z > cellW * 1.5);
    const geos = (wide && splitGeometryByCell(mg, farCell)) || [mg];
    if (geos.length > 1) { releasePrivateGeometry(mg); pieces += geos.length; }
    let far = range ? range.far : single ? Infinity : farOfClass(cls);
    const proxied = !range && far === Infinity && cls === 'L' && farOK(matT) && !tg0.u && !tg0.z && colourLayer(s);
    if (proxied) far = FAR_SWITCH;
    const audit = !single && !range && !authored && !proxied && cls === 'L' && far === Infinity && !tg0.u && !tg0.z;      // (an authored infinite range, underground and zone content keep theirs)
    for (const g of geos) {
      if (!g.boundingSphere || !Number.isFinite(g.boundingSphere.radius)) { dropNaNTriangles(g); g.computeBoundingSphere(); g.computeBoundingBox(); }
      const mesh = new THREE.Mesh(g, matT);
      mesh.userData.sources = nSrc; tagMesh(mesh, tg0);
      mesh.castShadow = s.castShadow && !tg0.u; mesh.receiveShadow = s.receiveShadow; mesh.layers.mask = s.layers.mask;
      mesh.renderOrder = s.renderOrder; mesh.frustumCulled = s.frustumCulled;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      out.add(mesh);
      let pieceFar = far;
      if (audit) { pieceFar = auditPiece(g, null, s, matT, tg0); mesh.userData.src = s.name || s.parent?.name || ''; if (FAR_ALL && pieceFar === Infinity && lastWhy === 'mass' && (matT.transparent || matT.alphaTest > 0)) pieceFar = FAR_L_LOW; }      // (a tall alpha-tested / transparent piece cannot join a proxy: sub-pixel beyond FAR_L_LOW)
      if (range) LOD.add(mesh, range.cx, range.cz, range.r, range.far, { attach: true, near: range.near, sector: range.sector, shadow: range.shadow });
      else if (!single) registerLOD(mesh, pieceFar, { attach: true, sector: proxied });      // (batchGroup: a model that moves is no sector resident)
      if (proxied) { if (!g.boundingSphere) g.computeBoundingSphere(); const c = g.boundingSphere.center, k = `${Math.floor(c.x / SECTOR)},${Math.floor(c.z / SECTOR)}`; let b = farBins.get(k); if (!b) farBins.set(k, (b = [])); const samp = pageSampler(matT.map); b.push({ g, mul: samp ? [1, 1, 1] : avgOf(matT.map), tg: tg0, samp: samp && g.attributes.uv ? samp : null }); }
      if (pieceFar < Infinity) lodMeshes++; outMeshes++;
      // This geometry is a private static output. Far/ND construction still
      // reads it before the first render; only the eventual GPU upload releases
      // its CPU arrays. Dynamic batchGroup templates keep their CPU data.
      if (!single) releaseOnUpload(privateStaticBatch(g));
    }
  };
  const buildFarProxies = () => {
    if (!farBins.size) return 0;
    const farMat = mat.toon('#ffffff', { vertexColors: true, paint: 0, name: 'far-proxy' });
    let n = 0;
    for (const [, bin] of farBins) {
      let nv = 0, ni = 0; for (const { g } of bin) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
      const pos = new Float32Array(nv * 3), nrm = new Int8Array(nv * 3), col = new Uint8Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
      let vo = 0, io = 0;
      const tex = [1, 1, 1];
      for (const { g, mul, samp } of bin) {
        const pa = g.attributes.position, na = g.attributes.normal, ca = g.attributes.color, uv = samp ? g.attributes.uv : null, cnt = pa.count;
        for (let i = 0; i < cnt; i++) {
          const o3 = (vo + i) * 3;
          pos[o3] = pa.getX(i); pos[o3 + 1] = pa.getY(i); pos[o3 + 2] = pa.getZ(i);
          nrm[o3] = Math.round(na.getX(i) * 127); nrm[o3 + 1] = Math.round(na.getY(i) * 127); nrm[o3 + 2] = Math.round(na.getZ(i) * 127);
          if (uv) samp(uv.getX(i), uv.getY(i), tex); else { tex[0] = tex[1] = tex[2] = 1; }      // (an atlas-page piece: its texture's box average at the vertex)
          col[o3] = Math.min(255, Math.round((ca ? ca.getX(i) : 1) * mul[0] * tex[0] * 255)); col[o3 + 1] = Math.min(255, Math.round((ca ? ca.getY(i) : 1) * mul[1] * tex[1] * 255)); col[o3 + 2] = Math.min(255, Math.round((ca ? ca.getZ(i) : 1) * mul[2] * tex[2] * 255));
        }
        const ia = g.index; const ic = ia ? ia.count : cnt;
        for (let i = 0; i < ic; i++) idx[io++] = vo + (ia ? ia.getX(i) : i);
        vo += cnt;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true)); g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
      g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere(); g.computeBoundingBox(); releaseOnUpload(g);
      const mesh = new THREE.Mesh(g, farMat); mesh.name = 'far-proxy'; mesh.userData.farProxy = true; mesh.userData.noND = true; mesh.userData.noBatch = true; mesh.userData.sources = bin.length;
      if (bin[0].tg.s) mesh.userData.surfaceOnly = true;
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = false;
      out.add(mesh); registerLOD(mesh, Infinity, { attach: true, sector: true, near: FAR_SWITCH }); n++;
      if (LOD.superCells) { const it = LOD.of(mesh); if (it) { const k = `${Math.floor(it.cx / SUPER)},${Math.floor(it.cz / SUPER)},${mesh.userData.surfaceOnly ? 1 : 0}`; let sb = superBins.get(k); if (!sb) superBins.set(k, (sb = [])); sb.push(mesh); } }
    }
    for (const [k, list] of superBins) {
      if (list.length < 2) continue;
      const [kx, kz, so] = k.split(',').map(Number), cx = (kx + 0.5) * SUPER, cz = (kz + 0.5) * SUPER;
      let off = 0; for (const m of list) { const it = LOD.of(m), sx = (Math.floor(it.cx / SECTOR) + 0.5) * SECTOR, sz = (Math.floor(it.cz / SECTOR) + 0.5) * SECTOR; off = Math.max(off, Math.hypot(sx - cx, sz - cz)); }
      const g = mergeFarGeometries(list.map(m => m.geometry), SUPER_DECIMATE ? SUPER_MIN_AREA : 0); if (!g) continue;
      superStats.cells++; superStats.members += list.length; superStats.trianglesIn += list.reduce((a, m) => a + m.geometry.index.count / 3, 0); superStats.trianglesOut += g.index.count / 3;
      releaseOnUpload(g);
      const mesh = new THREE.Mesh(g, farMat); mesh.name = 'far-super'; mesh.userData.farProxy = true; mesh.userData.noND = true; mesh.userData.noBatch = true; mesh.userData.sources = list.length;
      if (so) mesh.userData.surfaceOnly = true;
      mesh.castShadow = false; mesh.receiveShadow = false; mesh.matrixAutoUpdate = false;
      out.add(mesh);
      const sp = g.boundingSphere, r = Math.hypot(sp.center.x - cx, sp.center.z - cz) + sp.radius;
      if (!LOD.addSuper(mesh, list, cx, cz, r, FAR_SWITCH, off + SUPER_MARGIN, { attach: true })) mesh.removeFromParent();
    }
    return n;
  };
  const superBins = new Map(), superStats = { cells: 0, members: 0, trianglesIn: 0, trianglesOut: 0 };
  for (const [key, grp] of groups) {
    const list = grp.items, matT = grp.mat;
    if (list.length < 2 && matT === list[0].o.material) {
      // a big object with a material of its own (the ground, a water surface, a merged sign sheet): cut into cells in place (same material, every attribute kept)
      const o = list[0].o;
      if (single || !grp.big || o.isInstancedMesh || o.userData.noSplit || o.geometry.drawRange.count !== Infinity || (!o.geometry.index && o.geometry.attributes.position.count % 3)) continue;
      const geos = splitGeometryByCell(o.geometry, farCell, o.matrixWorld); if (!geos) continue;
      for (const g of geos) {
        const mesh = likeMesh(new THREE.Mesh(g, o.material), o); tagMesh(mesh, list[0].tg);
        mesh.matrix.copy(o.matrixWorld); mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale); mesh.matrixWorld.copy(o.matrixWorld);
        out.add(mesh);
        const range = grp.range;
        if (range) LOD.add(mesh, range.cx, range.cz, range.r, range.far, { attach: true, near: range.near, sector: range.sector, shadow: range.shadow });
        else { const f0 = farOfClass(grp.cls); registerLOD(mesh, grp.cls === 'L' && f0 === Infinity && !grp.authored && !list[0].tg.u && !list[0].tg.z ? auditPiece(g, o.matrixWorld, o, o.material, list[0].tg) : f0, { attach: true }); }
        outMeshes++;      // (a single big mesh keeps its own material; its class gives the LOD distance of the pieces)
        releaseOnUpload(privateStaticBatch(g));      // splitGeometryByCell owns these arrays; the original/shared source is untouched
      }
      retire(o); list.length = 0; pieces += geos.length; merged++; sources++;
      continue;
    }
    const needColor = !!matT.vertexColors, needPaint = !!(matT.userData.toon && matT.userData.toon.vpaint);
    const plans = list.map(item => staticBatchPlan(item, needColor, needPaint));
    const mg = mergeStaticGeometryStream(plans, i => prepareStaticBatchGeometry(list[i], needColor, needPaint));
    if (!mg) { console.warn('batch: merge failed for', key); continue; }
    dropNaNTriangles(mg); mg.computeBoundingSphere(); mg.computeBoundingBox();
    place(mg, matT, list[0].o, list[0].tg, list.length, grp.cls, grp.cell, grp.range, !!grp.authored);      // userData.sources = how many objects were merged into the mesh (tools / tests)
    for (const it of list) retire(it.o);
    merged++; sources += list.length; list.length = 0;
  }
  // A traversal view removes all replaced registrations in one registry pass.
  // Reparenting is unnecessary and would lose inherited visibility tags. The
  // original geometries remain untouched: an instance may share their buffers.
  if (victims.length) { const replaced = new THREE.Group(); replaced.children = victims; LOD.remove(replaced); replaced.children = []; }
  for (const o of victims) o.parent && o.parent.remove(o);
  for (const o of underground) if (o.parent) o.castShadow = false;
  // Drop batching-only source references before allocating the far proxies.
  // Unmerged objects and shared source geometry remain untouched in the scene.
  victims.length = 0; cand.length = 0; underground.length = 0; uvOk.clear();
  for (const grp of groups.values()) grp.items.length = 0;
  const farProxies = buildFarProxies();
  root.add(out);
  root.traverse((o) => { if (!o.userData.dynamic) o.updateMatrix(); });
  return { merged, sources, pieces, lodMeshes, farProxies, farSuper: superStats, rangeAudit, meshes: outMeshes, classTriangles: classHist, skylineLifted: skyLifted, sharedMaterials: shared.size, atlasTextures: atlas.map.size, atlasPages: atlas.texs.length, groupsByKind: hist, nonAtlasReasons: nonAtlas };
}

/** Merge the meshes of ONE model (a boat, a vehicle: any group of meshes that move together) by material kind into a few meshes, colours baked to vertex colours exactly like the
 *  static batching (identical look, a fraction of the draw calls in every pass). The group must not be in the scene yet (or sit at the origin): the meshes keep their positions
 *  relative to the group. Returns { merged, sources } like batchStatic. */
export function batchGroup(group, mat) {
  group.updateMatrixWorld(true);
  return batchStatic(group, { mat, atlasTextures: false, single: true });
}
