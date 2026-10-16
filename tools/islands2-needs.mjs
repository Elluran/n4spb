// Scratch for the islands round 2 frame design: the ground that must be inside PLAY (island polygon + 100 m, bridges + 40 m) and what the current union misses.
//   node tools/islands2-needs.mjs [out.png]    prints the missing area (km2) per island; with a png path plots the missing cells.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PLAY_RECTS, RECT_NAMES, inUnion, pointInPoly, proj } from './osm-lib.mjs';
const polys = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-island-polys.json', import.meta.url)), 'utf8'));
const raw = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-bridges-osm.json', import.meta.url)), 'utf8')).elements;
const TARGET = ['yelagin', 'kamenny', 'aptekarsky', 'petrovsky', 'serny'];
const BUF = +(process.env.BUF || 100), STEP = +(process.env.STEP || 10);
const distSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = dx * dx + dz * dz; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dz - p[1]); };
const distRing = (p, ring) => { let d = Infinity; for (let i = 0; i < ring.length - 1; i++) d = Math.min(d, distSeg(p, ring[i], ring[i + 1])); return d; };
const near = (key, p) => { const P = polys[key][0]; return pointInPoly(p, P) ? 0 : distRing(p, P.o); };
// bridge ways (bridge=*) with any vertex within 60 m of a target island polygon -> polylines
const lines = [];
for (const e of raw) { if (e.type !== 'way' || !e.tags || !e.tags.bridge || e.tags.bridge === 'no' || !e.geometry) continue; const pts = e.geometry.map((n) => proj(n.lon, n.lat)); if (TARGET.some((k) => pts.some((p) => near(k, p) < 60))) lines.push({ id: e.id, name: e.tags.name || '', pts }); }
const needs = (x, z) => { for (const k of TARGET) { const P = polys[k][0]; if (x < P.bb[0] - BUF || x > P.bb[1] + BUF || z < P.bb[2] - BUF || z > P.bb[3] + BUF) continue; if (near(k, [x, z]) <= BUF) return k; } for (const l of lines) for (let i = 0; i < l.pts.length - 1; i++) if (distSeg([x, z], l.pts[i], l.pts[i + 1]) <= 40) { let bk = null, bd = 1e9; for (const k of TARGET) { const d = near(k, [x, z]); if (d < bd) { bd = d; bk = k; } } return 'bridge@' + bk + ':' + l.name; } return null; };
for (const k of TARGET) { const P = polys[k][0]; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of P.o) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); } P.bb = [x0, x1, z0, z1]; }
export const bridgeLines = lines;
const miss = {}, tot = {}; const cells = [];
for (let x = -7000; x <= -900; x += STEP) for (let z = -5700; z <= -2000; z += STEP) { const k = needs(x, z); if (!k) continue; tot[k] = (tot[k] || 0) + 1; if (!inUnion(PLAY_RECTS, x, z)) { miss[k] = (miss[k] || 0) + 1; cells.push([x, z, k]); } }
const km2 = (n) => +(n * STEP * STEP / 1e6).toFixed(3);
console.log('bridge ways near the target islands:', lines.length, [...new Set(lines.map((l) => l.name))].join(' | '));
for (const k of Object.keys(tot)) console.log(k.padEnd(28), 'needed km2', km2(tot[k]), 'missing km2', km2(miss[k] || 0));
fs.writeFileSync(fileURLToPath(new URL('../data/osm-raw/_islands2-missing.json', import.meta.url)), JSON.stringify({ step: STEP, cells }));
