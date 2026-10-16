// landmarksYusupov-plan: draws the baked OSM data of a window as a labelled plan PNG (research / layout tool of the Yusupov module).
//   node tools/landmarksYusupov-plan.mjs --win x0,z0,x1,z1 --out path.png [--px 2400] [--ids 1] [--tags 1]
// Buildings (id / address number / levels), roads, river polygons, fences / walls / gates, trees, monuments, POIs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const [X0, Z0, X1, Z1] = (args.win || '-3150,120,-2700,640').split(',').map(Number);
const PX = Number(args.px || 2400);
const S = PX / (X1 - X0), HPX = Math.round((Z1 - Z0) * S);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const sx = (x) => ((x - X0) * S).toFixed(1), sz = (z) => ((z - Z0) * S).toFixed(1);
const poly = (o) => { let s = ''; for (let i = 0; i < o.length; i += 2) s += sx(o[i]) + ',' + sz(o[i + 1]) + ' '; return s; };
const pline = (o) => poly(o);
const inW = (x, z, m = 0) => x >= X0 - m && x <= X1 + m && z >= Z0 - m && z <= Z1 + m;
const anyIn = (pts) => { for (let i = 0; i < pts.length; i += 2) if (inW(pts[i], pts[i + 1], 40)) return true; return false; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${HPX}" style="background:#f4f1e6;font-family:Arial">`;
// grid every 50 m
for (let x = Math.ceil(X0 / 50) * 50; x <= X1; x += 50) svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${HPX}" stroke="#ccc" stroke-width="1"/><text x="${sx(x)}" y="12" font-size="12" fill="#888">${x}</text>`;
for (let z = Math.ceil(Z0 / 50) * 50; z <= Z1; z += 50) svg += `<line x1="0" y1="${sz(z)}" x2="${PX}" y2="${sz(z)}" stroke="#ccc" stroke-width="1"/><text x="2" y="${sz(z)}" font-size="12" fill="#888">${z}</text>`;
for (const r of D.RIVER) for (const p of r.polys || []) if (anyIn(p.o)) svg += `<polygon points="${poly(p.o)}" fill="#9cc7e6" stroke="#5a8fb8"/>`;
for (const g of D.GREEN) for (const p of g.polys || []) if (anyIn(p.o)) svg += `<polygon points="${poly(p.o)}" fill="#cfe5b0" stroke="#9bbf7a" opacity="0.8"/>`;
for (const g of D.AREAS) for (const p of g.polys || []) if (anyIn(p.o)) svg += `<polygon points="${poly(p.o)}" fill="#e7dcc4" stroke="#b9a98a" opacity="0.8"/>`;
for (const r of D.ROADS) { if (!anyIn(r.pts) || r.tunnel) continue; const col = r.hw === 'footway' || r.hw === 'pedestrian' || r.hw === 'steps' ? '#d96' : r.hw === 'service' ? '#bbb' : '#999'; svg += `<polyline points="${pline(r.pts)}" fill="none" stroke="${col}" stroke-width="${Math.max(1.5, (r.w || 3) * S * 0.9)}" stroke-linecap="round" opacity="0.6"/>`; }
const palette = ['#f3c98b', '#e8b4a0', '#d9d99a', '#b9d4e8', '#e0b8d8', '#c8dcb0'];
let k = 0;
for (const b of D.BUILDINGS) {
  if (!inW(b.cx, b.cz, 30)) continue;
  const fill = b.part ? 'none' : palette[(k++) % palette.length];
  for (const p of b.polys) {
    svg += `<polygon points="${poly(p.o)}" fill="${fill}" stroke="${b.part ? '#c33' : '#444'}" stroke-width="${b.part ? 1 : 1.4}" fill-opacity="0.75"/>`;
  }
  if (args.ids && !b.part) {
    const lab = (b.addr?.no ? b.addr.no + ' ' : '') + (b.name ? b.name.slice(0, 22) : '') + (b.levels ? ' L' + b.levels : '');
    svg += `<text x="${sx(b.cx)}" y="${sz(b.cz)}" font-size="11" fill="#000" text-anchor="middle">${esc(lab)}</text><text x="${sx(b.cx)}" y="${(+sz(b.cz) + 11).toFixed(1)}" font-size="9" fill="#555" text-anchor="middle">${b.id}</text>`;
  }
}
for (const w of D.WALLS) if (anyIn(w.pts)) svg += `<polyline points="${pline(w.pts)}" fill="none" stroke="#06c" stroke-width="2.5"/>`;
for (const w of D.BARRIERS) if (anyIn(w.pts)) svg += `<polyline points="${pline(w.pts)}" fill="none" stroke="${w.kind === 'fence' ? '#c0c' : w.kind === 'wall' ? '#06c' : '#a50'}" stroke-width="2.5" stroke-dasharray="${w.kind === 'fence' ? '6,3' : ''}"/>`;
for (const n of D.BARRIER_NODES) if (inW(n.x, n.z)) svg += `<circle cx="${sx(n.x)}" cy="${sz(n.z)}" r="4" fill="#f00"/><text x="${(+sx(n.x) + 5).toFixed(1)}" y="${sz(n.z)}" font-size="10" fill="#c00">${n.kind}</text>`;
for (let i = 0; i < D.TREES.length; i += 1) { const t = D.TREES[i]; if (t && typeof t === 'object' && inW(t.x, t.z)) svg += `<circle cx="${sx(t.x)}" cy="${sz(t.z)}" r="${Math.max(2, (t.r || 3) * S)}" fill="#3a8a3a" opacity="0.7"/>`; }
for (const m of D.MONUMENTS) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="4" fill="#00f"/><text x="${(+sx(m.x) + 5).toFixed(1)}" y="${sz(m.z)}" font-size="10" fill="#00a">${esc((m.sub || m.kind) + ' ' + (m.name || '').slice(0, 30))}</text>`;
for (const m of D.POIS) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="3" fill="#0a0"/><text x="${(+sx(m.x) + 4).toFixed(1)}" y="${sz(m.z)}" font-size="9" fill="#070">${esc((m.name || m.sub || '').slice(0, 24))}</text>`;
for (const m of D.ENTRANCES) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="4" fill="#f80"/>`;
for (const m of D.LAMPS) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="1.8" fill="#a80"/>`;
for (const m of D.DOORS) if (inW(m.x, m.z)) svg += `<rect x="${sx(m.x) - 2}" y="${sz(m.z) - 2}" width="4" height="4" fill="#f0f"/>`;
svg += '</svg>';
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: EDGE, headless: true });
const pg = await br.newPage();
await pg.setViewport({ width: PX, height: HPX });
await pg.setContent(`<html><body style="margin:0">${svg}</body></html>`);
fs.mkdirSync(path.dirname(path.resolve(args.out || 'plan.png')), { recursive: true });
await pg.screenshot({ path: path.resolve(args.out || 'plan.png') });
await br.close();
console.log('wrote', args.out);
