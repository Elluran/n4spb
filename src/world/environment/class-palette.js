// Lossless full-resolution class storage. The current paint generator has 26
// RGBA8 tuples; a bounded palette replaces four bytes per cell with one byte.
// Raw bake products stay compatible. Only an explicit debug .data access expands
// indexed storage back to RGBA; the expanded array is never retained here.
import * as THREE from 'three';

const LITTLE_ENDIAN = new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 4;
export function compactClassRGBA(rgba, keepRaw = false) {
  if (!(rgba instanceof Uint8Array) || rgba.length % 4) throw new Error('Invalid RGBA class data');
  if (keepRaw) return { raw: rgba, indices: null, palette: null, colorCount: null };
  const count = rgba.length / 4, indices = new Uint8Array(count), palette = new Uint8Array(256 * 4), colors = new Map();
  const words = LITTLE_ENDIAN && rgba.byteOffset % 4 === 0 ? new Uint32Array(rgba.buffer, rgba.byteOffset, count) : null;
  for (let i = 0; i < count; i++) {
    const k = i * 4, word = words ? words[i] : (rgba[k] | rgba[k + 1] << 8 | rgba[k + 2] << 16 | rgba[k + 3] << 24) >>> 0;
    let id = colors.get(word);
    if (id === undefined) {
      id = colors.size;
      // Arbitrary legacy/custom fields remain renderable without quantisation.
      if (id === 256) return { raw: rgba, indices: null, palette: null, colorCount: 257 };
      colors.set(word, id); const p = id * 4;
      palette[p] = word & 255; palette[p + 1] = (word >>> 8) & 255; palette[p + 2] = (word >>> 16) & 255; palette[p + 3] = word >>> 24;
    }
    indices[i] = id;
  }
  return { raw: null, indices, palette, colorCount: colors.size };
}

export function expandClassRGBA(storage) {
  if (storage.raw) return storage.raw;
  const { indices, palette } = storage, rgba = new Uint8Array(indices.length * 4);
  for (let i = 0; i < indices.length; i++) { const p = indices[i] * 4, k = i * 4; rgba[k] = palette[p]; rgba[k + 1] = palette[p + 1]; rgba[k + 2] = palette[p + 2]; rgba[k + 3] = palette[p + 3]; }
  return rgba;
}

/** CPU interpolation preserves the historical byte arithmetic/order exactly. */
export function classSampler(storage, W, H, res, x0, z0) {
  const { raw, indices, palette } = storage;
  return (x, z, out = [0, 0, 0, 0]) => {
    const fu = (x - x0) / res - .5, fv = (z - z0) / res - .5, i0 = Math.floor(fu), j0 = Math.floor(fv), fx = fu - i0, fy = fv - j0;
    const a = Math.min(W - 1, Math.max(0, i0)), b = Math.min(W - 1, Math.max(0, i0 + 1));
    const c = Math.min(H - 1, Math.max(0, j0)), d = Math.min(H - 1, Math.max(0, j0 + 1));
    const p00 = c * W + a, p10 = c * W + b, p01 = d * W + a, p11 = d * W + b;
    const data = raw || palette;
    const k00 = (raw ? p00 : indices[p00]) * 4, k10 = (raw ? p10 : indices[p10]) * 4, k01 = (raw ? p01 : indices[p01]) * 4, k11 = (raw ? p11 : indices[p11]) * 4;
    for (let ch = 0; ch < 4; ch++) {
      const t00 = data[k00 + ch], t10 = data[k10 + ch], t01 = data[k01 + ch], t11 = data[k11 + ch];
      out[ch] = ((t00 + (t10 - t00) * fx) * (1 - fy) + (t01 + (t11 - t01) * fx) * fy) / 255;
    }
    return out;
  };
}

function texture(data, W, H, format, nearest) {
  const t = new THREE.DataTexture(data, W, H, format, THREE.UnsignedByteType);
  t.magFilter = t.minFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true;
  return t;
}

export function classLayer(rgba, { W, H, res }, x0, z0, keepRaw = false) {
  if (rgba.length !== W * H * 4) throw new Error('Class dimensions differ from RGBA data');
  const storage = compactClassRGBA(rgba, keepRaw), indexed = !!storage.indices;
  const t = texture(indexed ? storage.indices : storage.raw, W, H, indexed ? THREE.RedFormat : THREE.RGBAFormat, indexed);
  const pt = indexed ? texture(storage.palette, 256, 1, THREE.RGBAFormat, true) : null;
  // Existing diagnostics dispose only cls.texture; its tiny palette shares that lifetime.
  if (pt) t.addEventListener('dispose', () => pt.dispose());
  const layer = { W, H, res, x0, z0, texture: t, paletteTexture: pt, indices: storage.indices, palette: storage.palette, encoding: indexed ? 'palette8' : 'rgba8', colorCount: storage.colorCount };
  // Non-enumerable: object inspection/spread must not accidentally materialise
  // a ~700 MiB compatibility snapshot. Explicit cls.data still has old values.
  Object.defineProperty(layer, 'data', { get: () => expandClassRGBA(storage) });
  return { layer, sample: classSampler(storage, W, H, res, x0, z0) };
}

// The class mask has no mipmaps. Four nearest R8 index fetches + four tiny
// nearest palette fetches reproduce the old RGBA bilinear sampling coordinates
// and ClampToEdge behaviour. The raw branch covers legacy offline bake/custom
// palettes with >256 colours; raw texture filtering remains hardware Linear.
export const CLASS_PALETTE_GLSL = /* glsl */`
uniform sampler2D uClsPalette;
uniform vec2 uClsSize;
uniform float uClsIndexed;
vec4 clsPaletteAt(vec2 cell) {
  vec2 clamped = clamp(cell, vec2(0.0), uClsSize - vec2(1.0));
  float index = floor(texture2D(uCls, (clamped + vec2(0.5)) / uClsSize).r * 255.0 + 0.5);
  return texture2D(uClsPalette, vec2((index + 0.5) / 256.0, 0.5));
}
vec4 clsFiltered(vec2 uv) {
  if (uClsIndexed < 0.5) return texture2D(uCls, uv);
  vec2 pixel = uv * uClsSize - vec2(0.5);
  vec2 cell = floor(pixel), f = pixel - cell;
  vec4 c00 = clsPaletteAt(cell), c10 = clsPaletteAt(cell + vec2(1.0, 0.0));
  vec4 c01 = clsPaletteAt(cell + vec2(0.0, 1.0)), c11 = clsPaletteAt(cell + vec2(1.0));
  vec4 a = c00 + (c10 - c00) * f.x, b = c01 + (c11 - c01) * f.x;
  return a * (1.0 - f.y) + b * f.y;
}
`;
