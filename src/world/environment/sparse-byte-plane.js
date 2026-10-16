// Private CPU byte masks at their original 1 m resolution. Uniform 32² tiles
// occupy one negative Int32 descriptor; mixed tiles share one packed byte buffer.
// Writes expand only their uniform tile into a bounded spill slot. No source
// byte array survives construction; offline bake adapters keep legacy aliases.
export class SparseBytePlane {
  constructor(raw, W, H, tileSize = 32) {
    if (!(raw instanceof Uint8Array) || raw.length !== W * H || !Number.isInteger(W) || !Number.isInteger(H) || W < 1 || H < 1 || ![32, 64].includes(tileSize)) throw new Error('Invalid sparse byte plane');
    this.W = W; this.H = H; this.length = raw.length; this.tileSize = tileSize;
    this.shift = tileSize === 32 ? 5 : 6; this.mask = tileSize - 1;
    this.cols = Math.ceil(W / tileSize); this.rows = Math.ceil(H / tileSize);
    this.descriptors = new Int32Array(this.cols * this.rows);
    this.spillTiles = []; this.maxSpillTiles = this.descriptors.length;
    let bytes = 0, uniform = 0;
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const x = tx * tileSize, y = ty * tileSize, xe = Math.min(W, x + tileSize), ye = Math.min(H, y + tileSize), v = raw[y * W + x];
      let same = true;
      outer: for (let j = y; j < ye; j++) for (let i = x; i < xe; i++) if (raw[j * W + i] !== v) { same = false; break outer; }
      const k = ty * this.cols + tx;
      if (same) { this.descriptors[k] = -v - 1; uniform++; }
      else { if (bytes + tileSize * tileSize > 0x7fffffff) throw new Error('Sparse byte buffer exceeds Int32 offsets'); this.descriptors[k] = bytes; bytes += tileSize * tileSize; }
    }
    this.mixed = new Uint8Array(bytes);
    for (let ty = 0; ty < this.rows; ty++) for (let tx = 0; tx < this.cols; tx++) {
      const offset = this.descriptors[ty * this.cols + tx]; if (offset < 0) continue;
      const x = tx * tileSize, y = ty * tileSize, nx = Math.min(tileSize, W - x), ny = Math.min(tileSize, H - y);
      // Direct copying avoids millions of ephemeral subarray views during packing.
      for (let j = 0; j < ny; j++) { const from = (y + j) * W + x, to = offset + j * tileSize; for (let i = 0; i < nx; i++) this.mixed[to + i] = raw[from + i]; }
    }
    this.uniformTiles = uniform; this.maxSpillTiles = uniform;
  }
  get(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return undefined;
    const y = Math.floor(index / this.W), x = index - y * this.W, tile = (y >> this.shift) * this.cols + (x >> this.shift), d = this.descriptors[tile];
    if (d < 0 && d >= -256) return -d - 1;
    const local = ((y & this.mask) << this.shift) + (x & this.mask);
    return d >= 0 ? this.mixed[d + local] : this.spillTiles[-d - 257][local];
  }
  set(index, value) {
    // Match Uint8 coercion, including truncation, wrapping, NaN/infinity and
    // BigInt rejection; out-of-bounds numeric writes never allocate a tile.
    const byte = (+value) & 255;
    if (!Number.isInteger(index) || index < 0 || index >= this.length) return;
    const y = Math.floor(index / this.W), x = index - y * this.W, tile = (y >> this.shift) * this.cols + (x >> this.shift), d = this.descriptors[tile];
    const local = ((y & this.mask) << this.shift) + (x & this.mask);
    if (d >= 0) { this.mixed[d + local] = byte; return; }
    if (d < -256) { this.spillTiles[-d - 257][local] = byte; return; }
    const old = -d - 1; if (byte === old) return;
    if (this.spillTiles.length >= this.maxSpillTiles) throw new Error('Sparse byte spill bound exceeded');
    const buffer = new Uint8Array(this.tileSize * this.tileSize); buffer.fill(old);
    const slot = this.spillTiles.length; this.spillTiles.push(buffer); this.descriptors[tile] = -slot - 257; buffer[local] = byte;
  }
  get byteLength() { return this.descriptors.byteLength + this.mixed.byteLength + this.spillTiles.length * this.tileSize * this.tileSize; }
  toUint8Array() { const out = new Uint8Array(this.length); for (let i = 0; i < out.length; i++) out[i] = this.get(i); return out; }
}

class RawBytePlane {
  constructor(raw, W, H) { if (!(raw instanceof Uint8Array) || raw.length !== W * H) throw new Error('Invalid raw byte plane'); this.raw = raw; this.length = raw.length; this.byteLength = raw.byteLength; }
  get(index) { return this.raw[index]; }
  set(index, value) { this.raw[index] = value; }
  toUint8Array() { return this.raw; }
}
export const bytePlane = (raw, W, H, keepRaw = false) => keepRaw ? new RawBytePlane(raw, W, H) : new SparseBytePlane(raw, W, H);
