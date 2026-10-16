// meshes.js - the draw-call budget of the city. Everything the module draws is collected into a few streams per 320 m cell and turned into ONE mesh per stream and cell:
//   (cell size CELL = 320 m: the frame is CPU bound, a draw call costs more than the extra triangles of a coarser cell; ?ccell= overrides)
//   walls  the wall-shader quads (FacadeBuilder)            core   vertex-coloured stone: cornices, balcony slabs, erker undersides, arch vaults       (always drawn)
//   fine   vertex-coloured small stuff: downpipes, steps, canopies, chimneys, dormers, AC units, awnings, scaffolds   (hidden beyond ~260 m by the LOD)
//   roof   sheet-iron decks / mansard slopes (vertex colour x seam texture)                          rails  alpha-cut iron railings (balconies, roofs)
// Why: the scene is drawn three times (sun shadow, normal / depth pre-pass for the outlines, colour): the city has ~650 k triangles but only a few thousand per cell, so the cost was
// the draw calls (1 000 per frame with 48 m cells and instancing). All meshes are noBatch (the core batcher would re-split them into 48 m cells).
import * as THREE from 'three';
import { MeshBuilder } from '../lib/massing.js';
import { FacadeBuilder, wallMaterial } from './wallmat.js';
import { ColorBuilder } from './cornice.js';
import { LOD } from './instances.js';
import { roofMaterials } from './roofs.js';
import { railingTexture } from './balconies.js';

export const CELL = (typeof location !== 'undefined' && Number(new URLSearchParams(location.search).get('ccell'))) || 320;
export const cellOf = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);

/** MeshBuilder that also stores a vertex colour (used for the roof decks: one material for every roof colour) */
export class ColoredMeshBuilder extends MeshBuilder {
  constructor() { super(); this.col = []; this.cur = new THREE.Color('#9ba0a3'); }
  vert(x, y, z, nx, ny, nz, u = 0, v = 0) { this.col.push(this.cur.r, this.cur.g, this.cur.b); return super.vert(x, y, z, nx, ny, nz, u, v); }
  build() { const g = super.build(); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); return g; }
}
// RoofBuilder (roofs.js) = MeshBuilder + free-form triangles; the coloured variant needs the same helpers
import { RoofBuilder } from './roofs.js';
export class ColoredRoofBuilder extends RoofBuilder {
  constructor() { super(); this.col = []; this.cur = new THREE.Color('#9ba0a3'); }
  vert(x, y, z, nx, ny, nz, u = 0, v = 0) { this.col.push(this.cur.r, this.cur.g, this.cur.b); return super.vert(x, y, z, nx, ny, nz, u, v); }
  build() { const g = super.build(); g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3)); return g; }
}

/** A template (BufferGeometry with position / normal / color) stamped many times into a ColorBuilder: it = { x, y, z, rotY, sx, sy, sz, color } */
export function templateOf(geo) {
  const p = geo.attributes.position.array, n = geo.attributes.normal.array, c = geo.attributes.color ? geo.attributes.color.array : null;
  const idx = geo.index ? Array.from(geo.index.array) : Array.from({ length: p.length / 3 }, (_, i) => i);
  return { p, n, c, idx, count: p.length / 3 };
}
const _c = new THREE.Color();
export function stamp(cb, t, it) {
  const sx = it.sx ?? 1, sy = it.sy ?? 1, sz = it.sz ?? 1, cos = Math.cos(it.rotY || 0), sin = Math.sin(it.rotY || 0);
  let r = 1, g = 1, b = 1; if (it.color) { _c.set(it.color); r = _c.r; g = _c.g; b = _c.b; }
  const base = cb.n;
  for (let i = 0; i < t.count; i++) {
    const x = t.p[i * 3] * sx, y = t.p[i * 3 + 1] * sy, z = t.p[i * 3 + 2] * sz;
    cb.pos.push(it.x + x * cos + z * sin, it.y + y, it.z - x * sin + z * cos);
    const nx = t.n[i * 3], ny = t.n[i * 3 + 1], nz = t.n[i * 3 + 2];
    cb.nrm.push(nx * cos + nz * sin, ny, -nx * sin + nz * cos);
    if (t.c) cb.col.push(t.c[i * 3] * r, t.c[i * 3 + 1] * g, t.c[i * 3 + 2] * b); else cb.col.push(r, g, b);
    cb.uv.push(0, 0); cb.n++;
  }
  for (const k of t.idx) cb.idx.push(base + k);
}

// Private cell collectors keep their original vertex/index writers and global n.
// Seal at building/pass boundaries: floats acquire exactly the same Float32 bits
// as build(), while indices continue referring to the complete cell vertex list.
const CHUNK_VERTICES = 4096, chunksOf = new WeakMap();
const ATTRIBUTES = [['position','pos',3],['normal','nrm',3],['uv','uv',2],['color','col',3],
  ['aA','A',4],['aB','Bv',4],['aC','C',4],['aD','D',4]];
function sealBuilder(B) {
  const state = chunksOf.get(B);
  if (!B.pos.length && !B.idx.length) return false;
  const chunk = { attributes: {}, index: new Uint32Array(B.idx) };
  for (const [name, key] of state.attributes) {
    chunk.attributes[name] = new Float32Array(B[key]); B[key].length = 0;
  }
  state.indexCount += B.idx.length; B.idx.length = 0;
  state.chunks.push(chunk); return true;
}
function chunkedBuilder(B) {
  const state = { chunks: [], indexCount: 0, attributes: ATTRIBUTES.filter(([,key]) => Array.isArray(B[key])) };
  chunksOf.set(B, state);
  const build = B.build.bind(B);
  Object.defineProperty(B, 'tris', { get: () => (state.indexCount + B.idx.length) / 3 });
  B.build = () => {
    if (!state.chunks.length) return build();
    sealBuilder(B);
    const g = new THREE.BufferGeometry();
    for (const [name,,size] of state.attributes) {
      const array = new Float32Array(B.n * size); let offset = 0;
      for (const chunk of state.chunks) { const values = chunk.attributes[name]; array.set(values, offset); offset += values.length; }
      g.setAttribute(name, new THREE.BufferAttribute(array, size));
    }
    const index = B.n > 65535 ? new Uint32Array(state.indexCount) : new Uint16Array(state.indexCount); let offset = 0;
    for (const chunk of state.chunks) { index.set(chunk.index, offset); offset += chunk.index.length; }
    g.setIndex(new THREE.BufferAttribute(index, 1));
    g.computeBoundingSphere(); g.computeBoundingBox(); return g;
  };
  return B;
}

export class CityMeshes {
  constructor() { this.s = { walls: new Map(), core: new Map(), fine: new Map(), roof: new Map(), rails: new Map() }; this.compacting = false; }
  _get(kind, x, z, mk) {
    const k = cellOf(x, z); let b = this.s[kind].get(k);
    if (!b) this.s[kind].set(k, (b = chunkedBuilder(mk())));
    else if (this.compacting && b.pos.length >= CHUNK_VERTICES * 3) sealBuilder(b);
    return b;
  }
  walls(x, z) { return this._get('walls', x, z, () => new FacadeBuilder()); }
  core(x, z) { return this._get('core', x, z, () => new ColorBuilder()); }
  fine(x, z) { return this._get('fine', x, z, () => new ColorBuilder()); }
  roof(x, z) { return this._get('roof', x, z, () => new ColoredRoofBuilder()); }
  rails(x, z) { return this._get('rails', x, z, () => new MeshBuilder()); }
  /** Compact completed writes between passes without changing vertex indices or emitted meshes. */
  seal() {
    // Explicit first barrier opts production into automatic per-cell compaction.
    // Audit subclasses that inspect raw builder ranges and never seal retain the
    // original collector API, without special cases for any audit implementation.
    this.compacting = true;
    let cells = 0;
    for (const stream of Object.values(this.s)) for (const B of stream.values()) if (sealBuilder(B)) cells++;
    return cells;
  }
  /** build the meshes under root; returns the triangle count */
  flush(ctx, root) {
    let tris = 0;
    const wm = wallMaterial(ctx, {});
    const coreM = ctx.mat.toon('#ffffff', { vertexColors: true, name: 'city-core', paint: 0.04 });
    const fineM = ctx.mat.toon('#ffffff', { vertexColors: true, name: 'city-fine', side: 'double', paint: 0.03 });
    const roofM = ctx.mat.toon('#ffffff', { vertexColors: true, map: roofMaterials(ctx).metal, name: 'city-roof', paint: 0.04 });
    const railM = ctx.mat.foliage('#1d1f20', railingTexture(ctx), { name: 'city-railing', paint: 0.02 });
    const mk = (geo, mat, name, o = {}) => {
      const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
      ctx.noBatch(m); if (o.noOutline) ctx.noOutline(m); root.add(m);
      if (o.lod) { const s = geo.boundingSphere; LOD.add(m, s.center.x, s.center.z, s.radius, o.lod); }
      return m;
    };
    const consume = (stream, mat, name, opts) => {
      for (const [key, B] of stream) {
        const count = B.tris;
        // build() copies ordinary-number arrays into independent typed buffers.
        // Release each consumed cell immediately: retaining every JS collector
        // alongside the typed city geometry doubles peak memory during baking.
        const geo = B.n === 0 ? null : B.build();
        for (const value of Object.values(B)) if (Array.isArray(value)) value.length = 0;
        const state = chunksOf.get(B); state.chunks.length = 0; state.indexCount = 0;
        stream.delete(key);
        if (!geo) continue;
        mk(geo, mat, name, opts); tris += count;
      }
    };
    consume(this.s.walls, wm, 'city-walls');
    consume(this.s.core, coreM, 'city-core');
    consume(this.s.fine, fineM, 'city-fine', { cast: false, lod: 240 });
    consume(this.s.roof, roofM, 'city-roofs');
    consume(this.s.rails, railM, 'city-railings', { cast: false, receive: false, noOutline: true, lod: 300 });
    return tris;
  }
}
