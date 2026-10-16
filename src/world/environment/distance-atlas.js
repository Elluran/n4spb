// Lossless 1 m RGBA distance field. Mixed 64² tiles carry real neighbour gutters
// in one linear-filtered atlas; uniform tiles carry a palette ID. Descriptor
// bytes are shared by CPU/GPU (RGB24 ID, alpha255 uniform / alpha0 atlas slot).
// Raw offline bakes and fields that do not benefit retain the original texture.
import * as THREE from 'three';
const LITTLE = new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 4;
const wordAt = (bytes, k) => (bytes[k] | bytes[k + 1] << 8 | bytes[k + 2] << 16 | bytes[k + 3] << 24) >>> 0;

export class DistanceAtlas {
  constructor(raw, W, H, { keepRaw = false, maxSide = 16384 } = {}) {
    if (!(raw instanceof Uint8Array) || raw.length !== W * H * 4 || W < 1 || H < 1 || !Number.isInteger(W) || !Number.isInteger(H)) throw new Error('Invalid RGBA distance field');
    this.W = W; this.H = H; this.length = W * H; this.tileSize = 64; this.padded = 66;
    this.cols = Math.ceil(W / 64); this.rows = Math.ceil(H / 64);
    this.raw = null; this.atlas = null; this.descriptors = null; this.meta = null; this.palette = null;
    if (keepRaw || !LITTLE) { this.raw = raw; return; }
    const words = LITTLE && raw.byteOffset % 4 === 0 ? new Uint32Array(raw.buffer, raw.byteOffset, this.length) : null;
    const descriptors = new Int32Array(this.cols * this.rows), colors = new Map(), paletteWords = [];
    let mixed = 0;
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const x = tx * 64, y = ty * 64, xe = Math.min(W, x + 64), ye = Math.min(H, y + 64), at = y * W + x, v = words ? words[at] : wordAt(raw, at * 4);
      let uniform = true;
      outer: for (let j = y; j < ye; j++) for (let i = x; i < xe; i++) if ((words ? words[j * W + i] : wordAt(raw, (j * W + i) * 4)) !== v) { uniform = false; break outer; }
      const k = ty * this.cols + tx;
      if (uniform) {
        let id = colors.get(v); if (id === undefined) { id = colors.size; colors.set(v, id); paletteWords.push(v); }
        descriptors[k] = (id | 0xff000000);
      } else descriptors[k] = mixed++;
    }
    const paletteH = Math.max(1, Math.ceil(colors.size / 256)), maxCells = Math.floor(maxSide / 66);
    // Power-of-two columns make slot division particularly well conditioned.
    let atlasCols = mixed ? Math.max(1, 2 ** Math.floor(Math.log2(Math.sqrt(mixed)))) : 1;
    let atlasRows = Math.max(1, Math.ceil(mixed / atlasCols));
    if (atlasRows > maxCells) { atlasCols = Math.ceil(mixed / maxCells); atlasRows = Math.ceil(mixed / atlasCols); }
    const atlasW = mixed ? atlasCols * 66 : 1, atlasH = mixed ? atlasRows * 66 : 1;
    const total = atlasW * atlasH * 4 + descriptors.byteLength + paletteH * 256 * 4;
    if (!maxCells || atlasW > maxSide || atlasH > maxSide || paletteH > maxSide || colors.size >= 0x1000000 || mixed >= 0x1000000 || total >= raw.byteLength) { this.raw = raw; return; }
    const atlas = new Uint8Array(atlasW * atlasH * 4), palette = new Uint8Array(256 * paletteH * 4);
    for (let i = 0; i < paletteWords.length; i++) { const v = paletteWords[i], p = i * 4; palette[p] = v & 255; palette[p + 1] = v >>> 8 & 255; palette[p + 2] = v >>> 16 & 255; palette[p + 3] = v >>> 24; }
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const slot = descriptors[ty * this.cols + tx]; if (slot < 0) continue;
      const ax = slot % atlasCols * 66, ay = Math.floor(slot / atlasCols) * 66, sx = tx * 64, sy = ty * 64;
      for (let j = 0; j < 66; j++) {
        const y = Math.max(0, Math.min(H - 1, sy + j - 1));
        for (let i = 0; i < 66; i++) {
          const x = Math.max(0, Math.min(W - 1, sx + i - 1)), from = (y * W + x) * 4, to = ((ay + j) * atlasW + ax + i) * 4;
          atlas[to] = raw[from]; atlas[to + 1] = raw[from + 1]; atlas[to + 2] = raw[from + 2]; atlas[to + 3] = raw[from + 3];
        }
      }
    }
    this.atlas = atlas; this.descriptors = descriptors; this.meta = new Uint8Array(descriptors.buffer); this.palette = palette;
    this.atlasCols = atlasCols; this.atlasRows = atlasRows; this.atlasW = atlasW; this.atlasH = atlasH; this.paletteH = paletteH;
    this.uniformTiles = descriptors.length - mixed; this.mixedTiles = mixed; this.uniformColors = colors.size;
  }
  get(index, channel) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length || !Number.isInteger(channel) || channel < 0 || channel > 3) return undefined;
    if (this.raw) return this.raw[index * 4 + channel];
    const y = Math.floor(index / this.W), x = index - y * this.W, d = this.descriptors[(y >> 6) * this.cols + (x >> 6)];
    if (d < 0) return this.palette[(d & 0xffffff) * 4 + channel];
    const a = (Math.floor(d / this.atlasCols) * 66 + 1 + (y & 63)) * this.atlasW + (d % this.atlasCols) * 66 + 1 + (x & 63);
    return this.atlas[a * 4 + channel];
  }
  getWord(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return undefined;
    if (this.raw) return wordAt(this.raw, index * 4);
    const y = Math.floor(index / this.W), x = index - y * this.W, d = this.descriptors[(y >> 6) * this.cols + (x >> 6)];
    if (d < 0) return wordAt(this.palette, (d & 0xffffff) * 4);
    const a = (Math.floor(d / this.atlasCols) * 66 + 1 + (y & 63)) * this.atlasW + (d % this.atlasCols) * 66 + 1 + (x & 63);
    return wordAt(this.atlas, a * 4);
  }
  get byteLength() { return this.raw ? this.raw.byteLength : this.atlas.byteLength + this.meta.byteLength + this.palette.byteLength; }
}

function texture(bytes, W, H, nearest) {
  const t = new THREE.DataTexture(bytes, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}
export function distanceLayer(raw, { W, H, res }, x0, z0, keepRaw = false) {
  const storage = new DistanceAtlas(raw, W, H, { keepRaw });
  const t = texture(storage.raw || storage.atlas, storage.raw ? W : storage.atlasW, storage.raw ? H : storage.atlasH, false);
  const mt = storage.raw ? null : texture(storage.meta, storage.cols, storage.rows, true), pt = storage.raw ? null : texture(storage.palette, 256, storage.paletteH, true);
  if (mt) t.addEventListener('dispose', () => { mt.dispose(); pt.dispose(); });
  const layer = { W, H, res, x0, z0, texture: t, metadataTexture: mt, paletteTexture: pt, encoding: storage.raw ? 'rgba8' : 'atlas64', atlas: storage.atlas, meta: storage.meta, palette: storage.palette, atlasCols: storage.atlasCols || 1, atlasW: storage.atlasW || W, atlasH: storage.atlasH || H, tilesX: storage.cols, tilesY: storage.rows, paletteH: storage.paletteH || 1 };
  return { layer, get: storage.get.bind(storage), getWord: storage.getWord.bind(storage) };
}
export function distanceUniforms(layer) {
  return {
    uDistAtlasMode: { value: layer?.encoding === 'atlas64' ? 1 : 0 },
    uDistLogicalSize: { value: new THREE.Vector2(layer?.W || 1, layer?.H || 1) },
    uDistMeta: { value: layer?.metadataTexture || layer?.texture || null }, uDistPalette: { value: layer?.paletteTexture || layer?.texture || null },
    uDistMetaSize: { value: new THREE.Vector2(layer?.tilesX || 1, layer?.tilesY || 1) },
    uDistAtlasSize: { value: new THREE.Vector2(layer?.atlasW || 1, layer?.atlasH || 1) }, uDistAtlasCols: { value: layer?.atlasCols || 1 },
    uDistPaletteSize: { value: new THREE.Vector2(256, layer?.paletteH || 1) },
  };
}

export const DIST_ATLAS_GLSL = /* glsl */`
uniform float uDistAtlasMode, uDistAtlasCols;
uniform sampler2D uDistMeta, uDistPalette;
uniform vec2 uDistLogicalSize, uDistMetaSize, uDistAtlasSize, uDistPaletteSize;
vec2 distDescriptor(vec2 tile) {
  vec4 b = floor(texture2D(uDistMeta, (tile + vec2(0.5)) / uDistMetaSize) * 255.0 + 0.5);
  return vec2(dot(b.rgb, vec3(1.0, 256.0, 65536.0)), step(128.0, b.a));
}
vec4 distConstant(float id) {
  return texture2D(uDistPalette, (vec2(mod(id, 256.0), floor((id + 0.5) / 256.0)) + vec2(0.5)) / uDistPaletteSize);
}
vec2 distAtlasOrigin(float slot) {
  // The half-slot guard prevents rounded division at a row boundary. The atlas
  // cannot contain enough slots to approach float32's integer precision limit.
  float row = floor((slot + 0.5) / uDistAtlasCols);
  return vec2(slot - row * uDistAtlasCols, row) * 66.0;
}
vec4 distTexel(vec2 cell) {
  cell = clamp(cell, vec2(0.0), uDistLogicalSize - vec2(1.0));
  vec2 tile = floor(cell / 64.0), d = distDescriptor(tile);
  if (d.y > 0.5) return distConstant(d.x);
  return texture2D(uDist, (distAtlasOrigin(d.x) + vec2(1.5) + cell - tile * 64.0) / uDistAtlasSize);
}
vec4 distFiltered(vec2 uv) {
  if (uDistAtlasMode < 0.5) return texture2D(uDist, uv);
  vec2 q = clamp(uv * uDistLogicalSize, vec2(0.5), uDistLogicalSize - vec2(0.5));
  vec2 tile = floor(q / 64.0), local = q - tile * 64.0, d = distDescriptor(tile);
  if (d.y < 0.5) return texture2D(uDist, (distAtlasOrigin(d.x) + vec2(1.0) + local) / uDistAtlasSize);
  if (local.x >= 0.5 && local.y >= 0.5 && local.x <= 63.5 && local.y <= 63.5) return distConstant(d.x);
  vec2 pixel = q - vec2(0.5), cell = floor(pixel), f = pixel - cell;
  vec4 c00 = distTexel(cell), c10 = distTexel(cell + vec2(1.0, 0.0));
  vec4 c01 = distTexel(cell + vec2(0.0, 1.0)), c11 = distTexel(cell + vec2(1.0));
  vec4 a = c00 + (c10 - c00) * f.x, b = c01 + (c11 - c01) * f.x;
  return a * (1.0 - f.y) + b * f.y;
}
`;
