// landmarksUniversity-sheet: contact sheet of reference photos (research tool of the Universitetskaya embankment module): a grid of thumbnails with their file names, so that many
// downloaded photos can be triaged in one look.   node tools/landmarksUniversity-sheet.mjs --dir <folder> --pick "kk_01,kk_02,..." | --glob "tc_" --out sheet.png [--cols 4] [--w 1800]
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; }
const dir = path.resolve(args.dir || '.');
let files = fs.readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
if (args.pick) { const want = args.pick.split(','); files = want.map((w) => files.find((f) => f.startsWith(w + '.'))).filter(Boolean); }
else if (args.glob) files = files.filter((f) => args.glob.split(',').some((g) => f.startsWith(g)));
const cols = Number(args.cols || 4), W = Number(args.w || 1800), cw = Math.floor(W / cols), ch = Math.round(cw * Number(args.ratio || 0.72));
const rows = Math.ceil(files.length / cols);
let html = `<html><body style="margin:0;background:#222;font-family:Arial"><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px)">`;
for (const f of files) html += `<div style="position:relative;width:${cw}px;height:${ch}px;overflow:hidden"><img src="${pathToFileURL(path.join(dir, f)).href}" style="width:100%;height:100%;object-fit:contain"><div style="position:absolute;left:2px;top:2px;background:#000a;color:#ff0;font-size:15px;padding:1px 4px">${f.replace(/\.\w+$/, '')}</div></div>`;
html += '</div></body></html>';
const tmp = path.join(dir, '_sheet.html'); fs.writeFileSync(tmp, html);
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const br = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--allow-file-access-from-files'] });
const pg = await br.newPage();
await pg.setViewport({ width: cols * cw, height: rows * ch });
await pg.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
await pg.screenshot({ path: path.resolve(args.out || 'sheet.png') });
await br.close(); fs.unlinkSync(tmp);
console.log('wrote', args.out, files.length, 'photos');
