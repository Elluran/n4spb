// nursery-preview.mjs - T8b: renders the garden nursery (floor, nine glasshouses, the replaced buildings, the young trees) with the REAL module and the real three.js on SOFTWARE GL (SwiftShader: the CPU, no GPU) and reports the
// shader compile errors. node tools/tauride/nursery-preview.mjs [--out D:/git2/n4spb-work/tauride/T8b/preview] [--views "name:x,y,z,yaw,pitch;..."] [--only name,name]
// A CPU stand-in for a GPU look: no environment, no outline pass, the neighbouring buildings as plain 12 m boxes, a plain hemisphere + sun light. A view = [x, y, z, yaw, pitch]: yaw 0 = north, 90 = west (the user's pose convention), pitch + = up.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T8b/preview'));
const VIEWS = {
  'user-pose': [1041.9, 40.7, -1670.1, 110.8, -28.6],                 // the user's screenshot pose (our scene before the fix: D:/git2/n4spb-work/tauride/user/user-lot-ours-1041.9_-1670.1.png)
  'airphoto-pose': [1180.2, 118.7, -1667.6, -275.2, -39.4],        // the air photo's pose (D:/git2/n4spb-work/tauride/user/user-lot-real-airphoto.png)
  'aerial-top': [1040, 300, -1700, 0, -89],
  'aerial-sw': [980, 90, -1590, -35, -32], 'aerial-ne': [1120, 80, -1790, 150, -30],
  'house-near': [1001, 3.2, -1645, -60, -4], 'house-inside': [1012, 1.7, -1639.5, -90, 2], 'lane-trees': [1012, 1.7, -1631.25, -90, 3], 'crossing': [1082, 1.7, -1669, -90, 2], 'house-top': [1040, 20, -1632, 0, -70],
  'sheds-east': [1070, 9, -1690, -90, -12], 'annex-south': [1050, 4, -1745, 0, 2],
};
const views = { ...VIEWS };
if (args.views) for (const v of String(args.views).split(';')) { const [n, c] = v.split(':'); views[n] = c.split(',').map(Number); }
const only = args.only ? String(args.only).split(',') : Object.keys(views);
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const browser = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 900000, args: ['--disable-gpu', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-gpu-sandbox', '--window-size=1280,720'] });
let code = 0;
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (/error|warn|THREE/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 1500)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 1500)));
  await page.goto(`http://127.0.0.1:${port}/tools/tauride/nursery-preview.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__done === true', { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  const info = await page.evaluate(() => ({ T: window.__api.T, stats: window.__api.stats }));
  console.log('build ms', JSON.stringify(info.T), 'stats', JSON.stringify(info.stats));
  for (const name of only) {
    const v = views[name]; if (!v) { console.log('no view', name); continue; }
    const t = Date.now();
    const url = await page.evaluate((a) => window.__api.view(...a), v.slice(0, 5));
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('view', name, Date.now() - t, 'ms', JSON.stringify(await page.evaluate(() => window.__last)));
  }
  const errs = await page.evaluate(() => ({ errors: window.__api.errors, programs: window.__api.programs() }));
  console.log('programs compiled', errs.programs, 'errors', errs.errors.length);
  for (const e of [...errs.errors, ...logs]) console.log('  ' + e.replace(/\n/g, ' | ').slice(0, 1200));
  if (errs.errors.some((e) => /Shader Error|VALIDATE_STATUS|compile/i.test(e))) code = 1;
} catch (e) { console.log('FAIL', e.message); code = 1; }
await browser.close(); server.close();
process.exit(code);
