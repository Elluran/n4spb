// Scratch plot of the islands round-2 frame: island polygons, PLAY rectangles (old grey, new red), optional window.  node tools/islands2-plot.mjs out.png x0 x1 z0 z1 [px/m] [--new=YE1,KA1..]
import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { PLAY_RECTS, RECT_NAMES, elementPolys } from './osm-lib.mjs';
const polys = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-island-polys.json', import.meta.url)), 'utf8'));
const ctxPolys = elementPolys(JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/coverage-islands-osm.json', import.meta.url)), 'utf8')).elements.find((e) => e.id === 1312631));
const [out, X0, X1, Z0, Z1, S = '0.25'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const sc = +S, x0 = +X0, x1 = +X1, z0 = +Z0, z1 = +Z1, W = Math.round((x1 - x0) * sc), H = Math.round((z1 - z0) * sc);
const newArg = (process.argv.find((a) => a.startsWith('--new=')) || '--new=').slice(6).split(',');
const tx = (x) => ((x - x0) * sc).toFixed(1), tz = (z) => ((z - z0) * sc).toFixed(1);
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#cfe3ee;font:11px sans-serif">`;
for (let gx = Math.ceil(x0 / 500) * 500; gx < x1; gx += 500) svg += `<line x1="${tx(gx)}" y1="0" x2="${tx(gx)}" y2="${H}" stroke="#9ab" stroke-width="0.5"/><text x="${tx(gx) }" y="10" fill="#456">${gx}</text>`;
for (let gz = Math.ceil(z0 / 500) * 500; gz < z1; gz += 500) svg += `<line x1="0" y1="${tz(gz)}" x2="${W}" y2="${tz(gz)}" stroke="#9ab" stroke-width="0.5"/><text x="2" y="${tz(gz) - 2}" fill="#456">${gz}</text>`;
for (const p of ctxPolys) svg += '<path d="M' + p.o.map((q) => tx(q[0]) + ',' + tz(q[1])).join('L') + 'Z" fill="#e3e0c8" stroke="#988"/><text x="' + tx(-3300) + '" y="' + tz(-3300) + '">Petrogradsky</text>';
for (const [k, l] of Object.entries(polys)) for (const p of l) svg += `<path d="M${p.o.map((q) => tx(q[0]) + ',' + tz(q[1])).join('L')}Z" fill="#c9dcae" stroke="#365" stroke-width="1"/><text x="${tx(p.o[0][0])}" y="${tz(p.o[0][1])}" fill="#030">${k}</text>`;
if (fs.existsSync(fileURLToPath(new URL('../data/osm-raw/_islands2-missing.json', import.meta.url))) && !process.argv.includes('--nomiss')) { const m = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../data/_islands2-missing.json', import.meta.url)), 'utf8')); for (const [x, z] of m.cells) svg += `<rect x="${tx(x)}" y="${tz(z)}" width="${Math.max(1, m.step * sc)}" height="${Math.max(1, m.step * sc)}" fill="#e80" fill-opacity="0.45"/>`; }
PLAY_RECTS.forEach((r, i) => { const n = RECT_NAMES[i], isNew = newArg.includes(n); svg += `<rect x="${tx(r.x0)}" y="${tz(r.z0)}" width="${(r.x1 - r.x0) * sc}" height="${(r.z1 - r.z0) * sc}" fill="${isNew ? '#f004' : 'none'}" stroke="${isNew ? '#c00' : '#667'}" stroke-width="${isNew ? 1.5 : 0.8}" stroke-dasharray="${isNew ? '' : '4 3'}"/><text x="${+tx(r.x0) + 3}" y="${+tz(r.z0) + 12}" fill="${isNew ? '#a00' : '#556'}">${n}</text>`; });
svg += '</svg>';
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const b = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--disable-gpu'], defaultViewport: { width: W, height: H } });
const pg = await b.newPage(); await pg.setContent('<body style="margin:0">' + svg); await pg.screenshot({ path: out }); await b.close();
console.log('wrote', out, W, H);
