// The CONTOUR PLAN of the Tauride Garden relief (docs/TAURIDE-REMAKE.md, phase T2): the image the user is shown to confirm the DESIGN heights.
//   node tools/tauride-relief-plan.mjs [--out D:/git2/n4spb-work/tauride/T2/relief-plan.png] [--scale 2] [--table] [--features path/to/relief.js]
// Draws, from the REAL height function (src/world/landmarksTauride/height.js) and the committed data modules: a hillshade, 0.5 m contours (every 1 m heavier), the hills labelled with their key letter and
// height, the garden outline, the 120 ways (steps darker), the 13 building footprints, the ponds and canals as outlines, the 5 numbered bridges and the dam, the 7 OSM trees with their 4 m margin, the 12
// camera poses (T01..T12) and the two VIEWS poses (D5, D6). No GPU, no browser: tools/tauride/lib/png.mjs. --table prints the relief table (markdown) for docs/TAURIDE-REMAKE.md.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, parseArgs, inRing, inPolys } from './tauride/lib/common.mjs';
import { encodePng } from './tauride/lib/png.mjs';
import * as S from './tauride/lib/site.mjs';
import { CAMS, VIEWS_PROPOSAL } from './tauride-cams.mjs';

const args = parseArgs();
const SC = Number(args.scale ?? 2);
const OUT = path.resolve(String(args.out ?? 'D:/git2/n4spb-work/tauride/T2/relief-plan.png'));
const relMod = args.features ? await import(pathToFileURL(path.resolve(String(args.features))).href) : await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/data/relief.js')).href);
const { makeGardenHeight } = await import(pathToFileURL(path.join(ROOT, 'src/world/landmarksTauride/height.js')).href);
const FEATURES = relMod.FEATURES, gh = makeGardenHeight(FEATURES, relMod.RELIEF_BOX);
const H = (x, z) => gh(x, z) ?? 0;

if (args.table) {
  console.log('| key | feature | prov | h (m) | x, z | semi-axes (m), rot | top | evidence |\n|---|---|---|---:|---|---|---:|---|');
  for (const f of FEATURES) console.log(`| ${f.key} | ${f.id} | ${f.prov} | ${f.h} | ${f.x}, ${f.z} | ${f.rx} x ${f.rz}, ${f.rot || 0} deg | ${f.top || 0} | ${f.evidence} |`);
  if (!args.out) process.exit(0);
}

// ------------------------------------------------------------------ canvas
const X0 = 905, X1 = 1510, Z0 = -1800, Z1 = -1250;
const W = Math.round((X1 - X0) * SC), HH = Math.round((Z1 - Z0) * SC);
const img = new Uint8Array(W * HH * 4);
const px = (x) => (x - X0) * SC, pz = (z) => (z - Z0) * SC;
const put = (i, j, r, g, b, a = 1) => { if (i < 0 || j < 0 || i >= W || j >= HH) return; const k = (j * W + i) * 4; img[k] = img[k] * (1 - a) + r * a; img[k + 1] = img[k + 1] * (1 - a) + g * a; img[k + 2] = img[k + 2] * (1 - a) + b * a; img[k + 3] = 255; };
function line(ax, az, bx, bz, c, t = 1, a = 1) {
  const x0 = px(ax), y0 = pz(az), x1 = px(bx), y1 = pz(bz), n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let s = 0; s <= n; s++) { const x = x0 + (x1 - x0) * s / n, y = y0 + (y1 - y0) * s / n; for (let dx = 0; dx < t; dx++) for (let dy = 0; dy < t; dy++) put(Math.round(x - t / 2 + dx), Math.round(y - t / 2 + dy), c[0], c[1], c[2], a); }
}
const ring = (r, c, t = 1, a = 1) => { for (let i = 0; i < r.length; i += 2) line(r[i], r[i + 1], r[(i + 2) % r.length], r[(i + 3) % r.length], c, t, a); };
const poly = (r, c, t = 1, a = 1) => { for (let i = 0; i + 3 < r.length; i += 2) line(r[i], r[i + 1], r[i + 2], r[i + 3], c, t, a); };
function disc(x, z, rad, c, a = 1) { const cx = px(x), cy = pz(z); for (let j = Math.floor(cy - rad); j <= cy + rad; j++) for (let i = Math.floor(cx - rad); i <= cx + rad; i++) if ((i - cx) ** 2 + (j - cy) ** 2 <= rad * rad) put(i, j, c[0], c[1], c[2], a); }
function circle(x, z, r, c, a = 1) { const n = 90; for (let k = 0; k < n; k++) { const t0 = k / n * 2 * Math.PI, t1 = (k + 1) / n * 2 * Math.PI; line(x + r * Math.cos(t0), z + r * Math.sin(t0), x + r * Math.cos(t1), z + r * Math.sin(t1), c, 1, a); } }
function fillRing(r, c, a = 1) {
  const bx = [], bz = []; for (let i = 0; i < r.length; i += 2) { bx.push(r[i]); bz.push(r[i + 1]); }
  const j0 = Math.max(0, Math.floor(pz(Math.min(...bz)))), j1 = Math.min(HH - 1, Math.ceil(pz(Math.max(...bz))));
  for (let j = j0; j <= j1; j++) { const z = Z0 + (j + 0.5) / SC, xs = []; for (let i = 0; i < r.length; i += 2) { const k = (i + 2) % r.length; const z1 = r[i + 1], z2 = r[k + 1]; if ((z1 > z) !== (z2 > z)) xs.push(r[i] + (z - z1) / (z2 - z1) * (r[k] - r[i])); }
    xs.sort((p, q) => p - q); for (let m = 0; m + 1 < xs.length; m += 2) for (let i = Math.max(0, Math.ceil(px(xs[m]))); i <= Math.min(W - 1, Math.floor(px(xs[m + 1]))); i++) put(i, j, c[0], c[1], c[2], a); }
}
// 3 x 5 font, 5 rows of 3 bits; scale 2 in the image (a label is drawn with a white halo)
const GL = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '.': '000000000000010', '+': '000010111010000', '-': '000000111000000', ' ': '000000000000000', m: '000000110111101' };
function text(s, x, z, { c = [20, 20, 20], k = 2, halo = [255, 255, 255], center = true } = {}) {
  const w = s.length * 4 * k - k; let ox = Math.round(px(x) - (center ? w / 2 : 0)), oy = Math.round(pz(z) - (center ? 5 * k / 2 : 0));
  for (const pass of halo ? [1, 0] : [0]) for (let n = 0; n < s.length; n++) { const g = GL[s[n].toUpperCase()] || GL[' ']; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (g[r * 3 + q] === '1') {
    const col = pass ? halo : c, e = pass ? 1 : 0; for (let a = -e; a < k + e; a++) for (let b = -e; b < k + e; b++) put(ox + n * 4 * k + q * k + a, oy + r * k + b, col[0], col[1], col[2], 1); } }
}

// ------------------------------------------------------------------ the fields
const gb = S.GARDEN.o;
const inGarden = (x, z) => inRing(x, z, gb);
const hg = new Float32Array(W * HH), mask = new Uint8Array(W * HH), wet = new Uint8Array(W * HH);
for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) {
  const x = X0 + (i + 0.5) / SC, z = Z0 + (j + 0.5) / SC;
  hg[j * W + i] = H(x, z);
  if (x > 915 && x < 1500 && z > -1800 && z < -1250) { mask[j * W + i] = inGarden(x, z) ? 1 : 0; wet[j * W + i] = inPolys(x, z, S.U) ? 1 : 0; }
}
const EX = 4, LX = -0.6, LZ = -0.8;                  // vertical exaggeration of the shading; light from the north-west (towards -x, -z)
for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) {
  const k = j * W + i, h = hg[k], inside = mask[k], w = wet[k];
  const dx = ((hg[j * W + Math.min(W - 1, i + 1)] - hg[j * W + Math.max(0, i - 1)]) * SC / 2) * EX, dz = ((hg[Math.min(HH - 1, j + 1) * W + i] - hg[Math.max(0, j - 1) * W + i]) * SC / 2) * EX;
  const shade = Math.max(-0.35, Math.min(0.35, (dx * LX + dz * LZ) * 0.5));
  let r, g, b;
  if (w) { r = 150; g = 190; b = 222; }
  else if (inside) { const t = Math.min(1, h / 5); r = 196 - 70 * t; g = 214 - 40 * t; b = 168 - 80 * t; }
  else { r = g = b = 232; }
  const f = 1 + shade; put(i, j, Math.max(0, Math.min(255, r * f)), Math.max(0, Math.min(255, g * f)), Math.max(0, Math.min(255, b * f)));
}
for (let j = 0; j < HH - 1; j++) for (let i = 0; i < W - 1; i++) {                 // contours every 0.5 m (every 1 m heavier)
  const k = j * W + i, a = Math.floor(hg[k] / 0.5 + 1e-6), b = Math.floor(hg[k + 1] / 0.5 + 1e-6), c = Math.floor(hg[k + W] / 0.5 + 1e-6);
  if (a !== b || a !== c) { const lvl = Math.max(a, b, c) * 0.5, major = Math.abs(lvl - Math.round(lvl)) < 1e-9; put(i, j, major ? 90 : 120, major ? 60 : 85, major ? 30 : 50, major ? 0.95 : 0.7); }
}

// the KEEP-OUT zone (a feature may not stand there): clearance = min(distance to the outline - 8, to a footprint - 3, to an OSM tree - 4, to the water - 3, to a bridge way - 6); tinted red
export const MARGINS = { outline: 8, footprint: 3, tree: 4, water: 3, bridge: 6 };
export function clearance(x, z) {
  const M = MARGINS;
  let c = Math.min(S.GARDEN.o ? (inRing(x, z, gb) ? 1 : -1) * ringDistG(x, z) - M.outline : 0, S.waterDist(x, z) - M.water, S.bridgeDist(x, z) - M.bridge);
  for (const t of S.Fu.OSM_TREES) c = Math.min(c, Math.hypot(x - t.x, z - t.z) - M.tree);
  c = Math.min(c, S.footprintDist(x, z) - M.footprint);
  return c;
}
function ringDistG(x, z) { let m = Infinity; for (let i = 0; i < gb.length; i += 2) { const k = (i + 2) % gb.length, ax = gb[i], az = gb[i + 1], bx = gb[k], bz = gb[k + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); m = Math.min(m, Math.hypot(x - ax - t * dx, z - az - t * dz)); } return m; }
if (!args['no-keepout']) {
  const keep = new Uint8Array(W * HH); const cache = new Map();
  for (let j = 0; j < HH; j++) for (let i = 0; i < W; i++) {
    if (!mask[j * W + i] && !wet[j * W + i]) continue;
    const gx = Math.floor((X0 + (i + 0.5) / SC)), gz = Math.floor((Z0 + (j + 0.5) / SC)), key = gx * 100000 + gz;
    let v = cache.get(key); if (v === undefined) { v = clearance(gx + 0.5, gz + 0.5) < 0 ? 1 : 0; cache.set(key, v); }
    if (v && mask[j * W + i] && !wet[j * W + i]) put(i, j, 200, 60, 60, 0.22);
  }
}

// ------------------------------------------------------------------ the layers
ring(S.U[0].o, [60, 110, 170], 1); for (const h of S.U[0].h) ring(h, [60, 110, 170], 1);
for (const p of S.P.PATHS) poly(p.pts, p.cls === 'steps' ? [90, 40, 20] : p.bridge ? [230, 120, 20] : [176, 140, 110], p.cls === 'steps' ? 3 : 1, 0.9);
for (const b of S.Br.BRIDGE_WAYS) poly(b.deck, [230, 110, 10], 4, 1);
for (const f of S.Fo.FOOTPRINTS) for (const p of f.polys) { fillRing(p.o, [70, 70, 80], 0.85); ring(p.o, [20, 20, 30], 1); }
for (const t of S.Fu.OSM_TREES) { disc(t.x, t.z, 2.2, [20, 110, 30]); circle(t.x, t.z, 4, [20, 110, 30], 0.8); }
for (const m of S.Fu.MONUMENTS) { disc(m.x, m.z, 3, [160, 20, 120]); }
ring(gb, [10, 10, 10], 2);
for (const f of FEATURES) {
  const a = (f.rot || 0) * Math.PI / 180, n = 72, pts = [];
  for (let k = 0; k < n; k++) { const t = k / n * 2 * Math.PI, u = f.rx * Math.cos(t), v = f.rz * Math.sin(t); pts.push(f.x + u * Math.cos(a) - v * Math.sin(a), f.z + u * Math.sin(a) + v * Math.cos(a)); }
  ring(pts, f.prov === 'osm' ? [170, 30, 30] : [120, 60, 150], 1, 0.9);
}
for (const f of FEATURES) text(`${f.key} +${f.h}`, f.x, f.z, { k: 2 });
for (const c of CAMS) { disc(c.x, c.z, 5, [220, 30, 30]); text(c.id, c.x, c.z + 10, { c: [150, 0, 0], k: 2 }); }
for (const v of VIEWS_PROPOSAL.filter((q) => q.x > 900 && q.x < 1500 && q.z > -1800 && q.z < -1250)) { disc(v.x, v.z, 4, [210, 60, 0]); text('D' + v.key.slice(-1), v.x, v.z + 9, { c: [150, 40, 0], k: 2 }); }
text('TAURIDE GARDEN RELIEF PLAN - LAND ONLY, ALL HEIGHTS ARE DESIGN VALUES - CONTOURS 0.5 M, HEAVIER EVERY 1 M', 935, -1785, { k: 2, center: false });
text('RED RING OSM EVIDENCE   PURPLE RING DESIGN   ORANGE BRIDGES   BROWN STEPS   GREEN RING OSM TREE + 4 M   PINK MONUMENT   RED DOT CAMERA T01-T12', 935, -1776, { k: 2, center: false });
text('TAN BAND = KEEP-OUT, NO RELIEF: 8 M FROM THE OUTLINE, 3 M FROM BUILDINGS AND WATER, 4 M FROM TREES, 5 M FROM BRIDGES   LETTER + HEIGHT IN METRES ABOVE THE STREET LEVEL   BLUE = WATER (T4)', 935, -1767, { k: 2, center: false });
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, encodePng(W, HH, img));
let maxH = 0; for (let k = 0; k < hg.length; k++) if (hg[k] > maxH) maxH = hg[k];
console.log(`relief plan ${W}x${HH} px (${SC} px/m) -> ${OUT}; ${FEATURES.length} features, highest ${maxH.toFixed(2)} m`);
