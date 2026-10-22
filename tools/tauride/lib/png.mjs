// A small PNG reader / writer on node:zlib (no dependency, no browser): decodeImage(buffer) -> { w, h, data: Uint8Array RGBA }, encodePng(w, h, rgba) -> Buffer.
// Reads non-interlaced PNGs: bit depth 1 / 2 / 4 / 8 / 16, colour type gray, RGB, palette (with tRNS), gray + alpha, RGBA. Interlaced (Adam7) PNGs and other formats (JPEG ...) are refused with a
// message that says what to do: re-save the screenshot as a plain PNG.
import zlib from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

export function decodeImage(buf) {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(SIG)) {
    const kind = buf[0] === 0xff && buf[1] === 0xd8 ? 'JPEG' : buf.subarray(0, 4).toString('latin1');
    throw new Error(`not a PNG (${kind}): this tool reads PNG only; re-save the image as PNG (a screenshot tool, an image editor, or "magick in.jpg out.png")`);
  }
  let pos = 8, ihdr = null, plte = null, trns = null; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('latin1', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') ihdr = { w: data.readUInt32BE(0), h: data.readUInt32BE(4), depth: data[8], ct: data[9], interlace: data[12] };
    else if (type === 'PLTE') plte = data; else if (type === 'tRNS') trns = data; else if (type === 'IDAT') idat.push(data); else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (!ihdr) throw new Error('PNG without IHDR');
  if (ihdr.interlace) throw new Error('interlaced (Adam7) PNG: re-save the image as a non-interlaced PNG');
  const { w, h, depth, ct } = ihdr, chan = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!chan) throw new Error('unsupported PNG colour type ' + ct);
  const bpp = Math.max(1, (chan * depth) >> 3), stride = (w * chan * depth + 7) >> 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * h) throw new Error('PNG data too short');
  const px = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i], a = i >= bpp ? px[dst + i - bpp] : 0, b = y ? px[dst - stride + i] : 0, c = i >= bpp && y ? px[dst - stride + i - bpp] : 0;
      px[dst + i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + b : f === 3 ? x + ((a + b) >> 1) : x + paeth(a, b, c)) & 255;
    }
  }
  const out = new Uint8Array(w * h * 4);
  const sample = (y, idx) => {                                    // sample number idx of row y (depth bits), scaled to 8 bits except for palette indices
    if (depth === 8) return px[y * stride + idx];
    if (depth === 16) return px[y * stride + idx * 2];
    const bit = idx * depth, byte = px[y * stride + (bit >> 3)], shift = 8 - depth - (bit & 7);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const scale = depth < 8 && ct !== 3 ? 255 / ((1 << depth) - 1) : 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    if (ct === 0) { const g = Math.round(sample(y, x) * scale); out[o] = out[o + 1] = out[o + 2] = g; out[o + 3] = 255; }
    else if (ct === 2) { out[o] = sample(y, x * 3); out[o + 1] = sample(y, x * 3 + 1); out[o + 2] = sample(y, x * 3 + 2); out[o + 3] = 255; }
    else if (ct === 3) { const i = sample(y, x); out[o] = plte[i * 3]; out[o + 1] = plte[i * 3 + 1]; out[o + 2] = plte[i * 3 + 2]; out[o + 3] = trns && i < trns.length ? trns[i] : 255; }
    else if (ct === 4) { const g = sample(y, x * 2); out[o] = out[o + 1] = out[o + 2] = g; out[o + 3] = sample(y, x * 2 + 1); }
    else { out[o] = sample(y, x * 4); out[o + 1] = sample(y, x * 4 + 1); out[o + 2] = sample(y, x * 4 + 2); out[o + 3] = sample(y, x * 4 + 3); }
  }
  return { w, h, data: out };
}

const crc = (b) => zlib.crc32(b) >>> 0;
const chunk = (type, data) => { const t = Buffer.from(type, 'latin1'), len = Buffer.alloc(4), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
/** RGBA (Uint8Array w*h*4) -> PNG buffer (8-bit RGBA, filter 0) */
export function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 6 })), chunk('IEND', Buffer.alloc(0))]);
}
