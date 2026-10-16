// Scratch: choose vertical strips (staircase rectangles) that cover the missing cells of data/_islands2-missing.json inside an x window, minimising new ground area.
//   node tools/islands2-strips.mjs x0 x1 [pen_km2=0.04] [maxW=1200] [snap=50] [pad=0]
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAY_RECTS, inUnion } from './osm-lib.mjs';
const m = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../data/osm-raw/_islands2-missing.json', import.meta.url)), 'utf8'));
const [X0, X1, PEN = '0.04', MAXW = '1200', SNAP = '50', PAD = '0', ZLO = '-9999', ZHI = '9999', MAXH = '1300'] = process.argv.slice(2);
const x0 = +X0, x1 = +X1, pen = +PEN * 1e6, maxW = +MAXW, snap = +SNAP, pad = +PAD, S = m.step;
const KEYS = (process.env.KEYS || '').split(',').filter(Boolean);
const cells = m.cells.filter((c) => (!KEYS.length || KEYS.includes(c[2]) || KEYS.some((k) => c[2].startsWith('bridge@' + k + ':'))) && c[0] >= x0 && c[0] < x1 && c[1] >= +ZLO && c[1] < +ZHI);
const col = (a, b) => { let zmin = 1e9, zmax = -1e9; for (const c of cells) if (c[0] >= a && c[0] < b) { zmin = Math.min(zmin, c[1]); zmax = Math.max(zmax, c[1]); } return zmin > zmax ? null : [Math.floor((zmin - pad) / 5) * 5, Math.ceil((zmax + S + pad) / 5) * 5]; };
const newArea = (a, b, z0, z1) => { let n = 0; for (let x = a + S / 2; x < b; x += S) for (let z = z0 + S / 2; z < z1; z += S) if (!inUnion(PLAY_RECTS, x, z)) n++; return n * S * S; };
const xs = []; for (let x = Math.floor(x0 / snap) * snap; x <= x1; x += snap) xs.push(x);
const best = new Array(xs.length).fill(Infinity), from = new Array(xs.length).fill(-1), rect = new Array(xs.length).fill(null); best[0] = 0;
for (let j = 1; j < xs.length; j++) for (let i = j - 1; i >= 0 && xs[j] - xs[i] <= maxW; i--) {
  const z = col(xs[i], xs[j]); let cost, r = null; if (z && z[1] - z[0] > +MAXH) continue;
  if (!z) cost = 0; else { r = { x0: xs[i], x1: xs[j], z0: z[0], z1: z[1] }; cost = newArea(xs[i], xs[j], z[0], z[1]) + pen; }
  if (best[i] + cost < best[j]) { best[j] = best[i] + cost; from[j] = i; rect[j] = r; }
}
const out = []; for (let j = xs.length - 1; j > 0; j = from[j]) { if (rect[j]) out.push(rect[j]); }
out.reverse();
// merge adjacent equal-z strips
console.log(JSON.stringify(out));
console.log('rects', out.length, 'new ground km2', (out.reduce((s, r) => s + newArea(r.x0, r.x1, r.z0, r.z1), 0) / 1e6).toFixed(3), 'sum km2', (out.reduce((s, r) => s + (r.x1 - r.x0) * (r.z1 - r.z0), 0) / 1e6).toFixed(3));
