// landmarksTroitskaya-plan: labelled plan PNG of a window of the baked OSM data (research / layout tool of the Troitskaya Square module; a variant of
// tools/landmarksYusupov-plan.mjs that also prints VERTEX INDICES of chosen footprints, road names / widths, barrier and green ids).
//   node tools/landmarksTroitskaya-plan.mjs --win x0,z0,x1,z1 --out path.png [--px 2000] [--verts w43679385,r1273188] [--roads 1] [--green 1] [--pts "x,z,label;x,z,label"]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const [X0, Z0, X1, Z1] = (args.win || '-1620,-2640,-1380,-2400').split(',').map(Number);
const PX = Number(args.px || 2000);
const S = PX / (X1 - X0), HPX = Math.round((Z1 - Z0) * S);
const VERTS = new Set((args.verts || '').split(',').filter(Boolean));
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const sx = (x) => ((x - X0) * S).toFixed(1), sz = (z) => ((z - Z0) * S).toFixed(1);
const poly = (o) => { let s = ''; for (let i = 0; i < o.length; i += 2) s += sx(o[i]) + ',' + sz(o[i + 1]) + ' '; return s; };
const inW = (x, z, m = 0) => x >= X0 - m && x <= X1 + m && z >= Z0 - m && z <= Z1 + m;
const anyIn = (pts) => { for (let i = 0; i < pts.length; i += 2) if (inW(pts[i], pts[i + 1], 30)) return true; return false; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const step = (X1 - X0) > 260 ? 50 : 10;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PX}" height="${HPX}" style="background:#f4f1e6;font-family:Arial">`;
for (const r of D.RIVER) for (const p of r.polys || []) if (anyIn(p.o)) svg += `<polygon points="${poly(p.o)}" fill="#9cc7e6" stroke="#5a8fb8"/>`;
for (const g of D.GREEN) for (const p of g.polys || []) if (anyIn(p.o)) {
  svg += `<polygon points="${poly(p.o)}" fill="${g.kind === 'park' ? '#dcebc4' : '#bfe09a'}" stroke="#7fae5a" opacity="0.75"/>`;
  for (const h of p.h || []) svg += `<polygon points="${poly(h)}" fill="#f4f1e6" stroke="#7fae5a" opacity="0.9"/>`;
  if (args.green) { let cx = 0, cz = 0; for (let i = 0; i < p.o.length; i += 2) { cx += p.o[i]; cz += p.o[i + 1]; } cx /= p.o.length / 2; cz /= p.o.length / 2; if (inW(cx, cz)) svg += `<text x="${sx(cx)}" y="${sz(cz)}" font-size="10" fill="#274" text-anchor="middle">${g.id} ${g.kind}</text>`; }
}
for (const g of D.AREAS) for (const p of g.polys || []) if (anyIn(p.o)) svg += `<polygon points="${poly(p.o)}" fill="#e7dcc4" stroke="#b9a98a" opacity="0.6"/>`;
for (const r of D.ROADS) {
  if (!anyIn(r.pts) || r.tunnel) continue;
  const foot = r.hw === 'footway' || r.hw === 'pedestrian' || r.hw === 'steps' || r.hw === 'path' || r.hw === 'cycleway';
  const col = foot ? '#e0a070' : r.hw === 'service' ? '#c4c4c4' : '#9a9a9a';
  svg += `<polyline points="${poly(r.pts)}" fill="none" stroke="${col}" stroke-width="${Math.max(1.5, (r.w || 3) * S)}" stroke-linecap="butt" opacity="0.55"/>`;
  svg += `<polyline points="${poly(r.pts)}" fill="none" stroke="${foot ? '#a0522d' : '#555'}" stroke-width="0.8" stroke-dasharray="4,3"/>`;
  if (args.roads) { const k = (r.pts.length >> 2) * 2, mx = (r.pts[k] + r.pts[Math.min(r.pts.length - 2, k + 2)]) / 2, mz = (r.pts[k + 1] + r.pts[Math.min(r.pts.length - 1, k + 3)]) / 2; if (inW(mx, mz)) svg += `<text x="${sx(mx)}" y="${sz(mz)}" font-size="9" fill="${foot ? '#7a3a10' : '#223'}">${r.id} ${r.hw}${r.name ? ' ' + esc(r.name.slice(0, 18)) : ''} w${r.w}${r.oneway ? ' 1w' : ''}${r.lanes ? ' L' + r.lanes : ''}</text>`; }
}
for (const t of D.TRAMWAYS || []) if (t.pts && anyIn(t.pts)) svg += `<polyline points="${poly(t.pts)}" fill="none" stroke="#c22" stroke-width="1.2"/>`;
const palette = ['#f3c98b', '#e8b4a0', '#d9d99a', '#b9d4e8', '#e0b8d8', '#c8dcb0'];
let k = 0;
for (const b of D.BUILDINGS) {
  if (!inW(b.cx, b.cz, 60)) continue;
  const fill = b.part ? 'none' : palette[(k++) % palette.length];
  for (const p of b.polys) {
    svg += `<polygon points="${poly(p.o)}" fill="${fill}" stroke="${b.part ? '#c33' : '#333'}" stroke-width="${b.part ? 1 : 1.3}" fill-opacity="0.7"/>`;
    for (const h of p.h || []) svg += `<polygon points="${poly(h)}" fill="#f4f1e6" stroke="#333"/>`;
    if (VERTS.has(b.id)) for (let i = 0; i < p.o.length; i += 2) svg += `<circle cx="${sx(p.o[i])}" cy="${sz(p.o[i + 1])}" r="2.5" fill="#000"/><text x="${(+sx(p.o[i]) + 3).toFixed(1)}" y="${(+sz(p.o[i + 1]) - 3).toFixed(1)}" font-size="11" fill="#b00" font-weight="bold">${i / 2}</text>`;
  }
  if (!b.part && inW(b.cx, b.cz)) {
    const lab = (b.addr?.no ? b.addr.no + ' ' : '') + (b.name ? b.name.slice(0, 22) : '') + (b.levels ? ' L' + b.levels : '');
    svg += `<text x="${sx(b.cx)}" y="${sz(b.cz)}" font-size="11" fill="#000" text-anchor="middle">${esc(lab)}</text><text x="${sx(b.cx)}" y="${(+sz(b.cz) + 11).toFixed(1)}" font-size="9" fill="#555" text-anchor="middle">${b.id}</text>`;
  }
}
for (const w of D.WALLS || []) if (anyIn(w.pts)) svg += `<polyline points="${poly(w.pts)}" fill="none" stroke="#06c" stroke-width="2.5"/>`;
for (const w of D.BARRIERS) if (anyIn(w.pts)) {
  svg += `<polyline points="${poly(w.pts)}" fill="none" stroke="${w.kind === 'fence' ? '#c0c' : w.kind === 'wall' ? '#06c' : w.kind === 'hedge' ? '#2a2' : '#a50'}" stroke-width="2" stroke-dasharray="${w.kind === 'fence' ? '6,3' : ''}"/>`;
  if (inW(w.pts[0], w.pts[1])) svg += `<text x="${sx(w.pts[0])}" y="${sz(w.pts[1])}" font-size="9" fill="#808">${w.id} ${w.kind}</text>`;
}
for (const n of D.BARRIER_NODES) if (inW(n.x, n.z) && n.kind !== 'kerb') svg += `<circle cx="${sx(n.x)}" cy="${sz(n.z)}" r="3.5" fill="#f00"/><text x="${(+sx(n.x) + 5).toFixed(1)}" y="${sz(n.z)}" font-size="10" fill="#c00">${n.kind}${n.access ? ' ' + n.access : ''}</text>`;
for (let i = 0; i + 1 < D.TREES.length; i += 2) if (inW(D.TREES[i], D.TREES[i + 1])) svg += `<circle cx="${sx(D.TREES[i])}" cy="${sz(D.TREES[i + 1])}" r="${Math.max(2, 2.2 * S)}" fill="#3a8a3a" opacity="0.45"/>`;
for (const m of D.MONUMENTS) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="4" fill="#00f"/><text x="${(+sx(m.x) + 5).toFixed(1)}" y="${sz(m.z)}" font-size="10" fill="#00a">${esc((m.sub || m.kind) + ' ' + (m.name || '').slice(0, 30))} ${m.id}</text>`;
for (const m of D.FURNITURE) if (inW(m.x, m.z)) svg += `<rect x="${sx(m.x) - 2}" y="${sz(m.z) - 2}" width="4" height="4" fill="#850"/>`;
for (const m of D.FOUNTAINS || []) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="5" fill="#08f"/>`;
for (const m of D.LAMPS) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="1.8" fill="#a80"/>`;
for (const m of D.ENTRANCES) if (inW(m.x, m.z)) svg += `<circle cx="${sx(m.x)}" cy="${sz(m.z)}" r="4" fill="#f80"/>`;
for (const m of D.DOORS) if (inW(m.x, m.z)) svg += `<rect x="${sx(m.x) - 2}" y="${sz(m.z) - 2}" width="4" height="4" fill="#f0f"/>`;
for (const s of (args.pts || '').split(';').filter(Boolean)) { const [x, z, lab] = s.split(','); svg += `<circle cx="${sx(+x)}" cy="${sz(+z)}" r="4" fill="none" stroke="#f00" stroke-width="2"/><text x="${(+sx(+x) + 6).toFixed(1)}" y="${sz(+z)}" font-size="12" fill="#f00">${esc(lab || '')}</text>`; }
for (let x = Math.ceil(X0 / step) * step; x <= X1; x += step) svg += `<line x1="${sx(x)}" y1="0" x2="${sx(x)}" y2="${HPX}" stroke="#999" stroke-width="${x % 50 === 0 ? 1 : 0.3}" opacity="0.6"/><text x="${sx(x)}" y="11" font-size="11" fill="#555">${x}</text>`;
for (let z = Math.ceil(Z0 / step) * step; z <= Z1; z += step) svg += `<line x1="0" y1="${sz(z)}" x2="${PX}" y2="${sz(z)}" stroke="#999" stroke-width="${z % 50 === 0 ? 1 : 0.3}" opacity="0.6"/><text x="2" y="${sz(z)}" font-size="11" fill="#555">${z}</text>`;
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
