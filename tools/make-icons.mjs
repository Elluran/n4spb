// Writes the PWA icons (assets/icons/*.png): the page's favicon art (the Admiralty spire over a navy tile, index.html <link rel=icon>) rasterised at 192 / 512 / 180 px.
// No dependencies: a tiny supersampling polygon rasteriser + a PNG encoder on node:zlib. Re-run only when the art changes:   node tools/make-icons.mjs
//   icon-192.png, icon-512.png   purpose "any": rounded navy tile with transparent corners
//   icon-maskable-512.png        purpose "maskable": full-bleed navy, the art inside the 80 % safe zone
//   apple-touch-icon.png (180)   full-bleed (iOS rounds the corners itself and paints transparent pixels black)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'icons');
fs.mkdirSync(dir, { recursive: true });

// the favicon's 32 x 32 art (index.html): [fill, polygon points]
const NAVY = [0x1c, 0x2a, 0x5a], GOLD = [0xe6, 0xc3, 0x6a], CREAM = [0xff, 0xf3, 0xdc];
const ART = [
  [GOLD, [[16, 10], [11, 14], [21, 14]]],                                   // the spire's shoulders
  [GOLD, [[15.3, 3.2], [16.7, 3.2], [16.7, 10], [15.3, 10]]],               // the needle (a stroke in the favicon, a thin bar here: it must be visible at 192 px)
  [GOLD, [[9, 14], [23, 14], [23, 17], [9, 17]]],
  [GOLD, [[10, 17], [22, 17], [22, 19], [10, 19]]],
  [GOLD, [[8, 22], [24, 22], [24, 24], [8, 24]]],
  [CREAM, [[16, 4], [17, 10], [15, 10]]],                                   // the ship on the spire
];
const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const inRound = (x, y, size, r) => { const cx = Math.min(Math.max(x, r), size - r), cy = Math.min(Math.max(y, r), size - r); return (x - cx) ** 2 + (y - cy) ** 2 <= r * r; };

/** size px square; art scaled so that the 32-unit art spans `artFrac` of the tile; round = rounded corners (transparent outside) */
function render(size, { round, artFrac }) {
  const SS = 4, px = Buffer.alloc(size * size * 4), k = size * artFrac / 32, off = (size - 32 * k) / 2 + 0;
  const radius = size * 7 / 32;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const X = x + (sx + 0.5) / SS, Y = y + (sy + 0.5) / SS;
      if (round && !inRound(X, Y, size, radius)) continue;
      let c = NAVY; const ax = (X - off) / k, ay = (Y - off) / k;
      for (const [col, poly] of ART) if (inPoly(ax, ay, poly)) c = col;
      r += c[0]; g += c[1]; b += c[2]; a++;
    }
    const n = SS * SS, o = (y * size + x) * 4;
    px[o] = a ? Math.round(r / a) : 0; px[o + 1] = a ? Math.round(g / a) : 0; px[o + 2] = a ? Math.round(b / a) : 0; px[o + 3] = Math.round(255 * a / n);
  }
  return px;
}
const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const OUT = [
  ['icon-192.png', 192, { round: true, artFrac: 1 }],
  ['icon-512.png', 512, { round: true, artFrac: 1 }],
  ['icon-maskable-512.png', 512, { round: false, artFrac: 0.7 }],
  ['apple-touch-icon.png', 180, { round: false, artFrac: 0.86 }],
];
for (const [name, size, o] of OUT) { const f = path.join(dir, name); fs.writeFileSync(f, png(size, render(size, o))); console.log(`wrote ${path.relative(root, f)} (${fs.statSync(f).size} bytes)`); }
