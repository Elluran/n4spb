// ground-preview.mjs - renders the T3 pieces of the Tauride Garden (floor, ground material, alleys, stairs) with the REAL modules and the real three.js on SOFTWARE GL (SwiftShader: the CPU, no GPU), and
// reports the shader compile errors. node tools/tauride/ground-preview.mjs [--out D:/git2/n4spb-work/tauride/T3/preview] [--views "name:x,y,z,yaw,pitch;..."] [--only name,name]
// It is a CPU stand-in for a GPU look: no environment ground, no city, no post-processing, no outline pass, a plain hemisphere + sun light; it proves that the shaders compile and shows the painted ground.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T3/preview'));
const VIEWS = {
  'aerial-top': [1200, 700, -1520, 0, -90], 'aerial-sw': [1000, 330, -1230, -20, -42], 'aerial-ne': [1450, 330, -1700, 150, -40],
  'hill-N-from-S': [1150, 22, -1600, 0, -8], 'hill-N-low': [1190, 3, -1650, 25, 6], 'plateau': [1368, 16, -1415, 0, -22],
  'ground-alley': [1160, 1.7, -1330, 5, -2], 'junction-close': [1128, 6, -1452, 30, -30], 'steps-memorial': [1366, 5, -1432, 0, -16],
  'hill-N-top': [1153, 170, -1694, 0, -90], 'hills-oblique': [1180, 70, -1560, 8, -34], 'aerial-mid': [1200, 260, -1330, 0, -62], 'shore-lake': [1330, 6, -1560, 80, -14], 'meadow-se': [1400, 10, -1300, -30, -24], 'path-edge-close': [1190, 1.3, -1322, 0, -38],
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
const browser = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 900000, args: ['--disable-gpu', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-gpu-sandbox'], defaultViewport: { width: 1280, height: 720 } });
let code = 0;
try {
  const page = await browser.newPage();
  const logs = [];
  page.on('console', (m) => { const t = m.text(); if (/error|warn|THREE/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 1500)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 1500)));
  await page.goto(`http://127.0.0.1:${port}/tools/tauride/ground-preview.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__done === true', { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  const info = await page.evaluate(() => ({ T: window.__api.T, stats: window.__api.stats }));
  console.log('build ms', JSON.stringify(info.T), 'stats', JSON.stringify(info.stats));
  for (const name of only) {
    const v = views[name]; if (!v) { console.log('no view', name); continue; }
    const t = Date.now();
    const url = await page.evaluate((a) => window.__api.view(...a), v);
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
