// t8a-preview.mjs - T8a: renders the views of the three bugs with the REAL builders (environment, landmarksTauride, streets, city) through the engine's real render pipeline on SOFTWARE GL (SwiftShader: the CPU, no GPU).
//   node tools/tauride/t8a-preview.mjs [--out D:/git2/n4spb-work/tauride/T8a/preview] [--only a,b] [--views "name:x,y,z,yaw,pitch;..."]      (the pose format of tools/shot.mjs: y = eye height, yaw 0 = north, 90 = west, pitch + = up)
// A CPU stand-in for the GPU frame (no sky dome, no people, no traffic, no bloom of the page); it shows what the fixes change.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T8a/preview'));
const VIEWS = {
  'bug1-west-gate': [930.7, 1.5, -1411.1, -101.2, -22.4],        // the owner's pose: the alley in front of the west gate
  'bug1-west-gate-2': [927, 1.7, -1411.5, -92, -12],
  'bug1-west-gate-3': [936, 1.7, -1410, 95, -14],
  'bug1-west-gate-low': [931, 0.5, -1411, -85, -8],
  'bug1-south-gate': [1226, 1.7, -1282, 0, -14],
  'bug1-south-gate-2': [1218, 1.7, -1276, -40, -16],
  'bug2-user-pose': [1100.4, 1.5, -1444.7, -36.2, 11.5],
  'bug2-corner': [1098, 1.6, -1442, -32, 18],
  'bug2-north': [1106, 1.6, -1442, 0, 24],
  'bug2-east': [1116, 1.6, -1452, 90, 20],
  'bug2-south': [1106, 1.6, -1466, 180, 22],
  'bug2-west': [1096, 1.6, -1453, -90, 20],
  'bug2-aerial': [1106, 25, -1442, 0, -55],
  'bug3-user-pose': [1005.6, 1.5, -1359.9, -229.2, 0.7],
  'bug3-user-pose-down': [1005.6, 1.5, -1359.9, -229.2, -42],
  'bug3-plate-3m': [1005.5, 1.6, -1363.4, 180, -18],
  'bug3-plate-5m': [1007.5, 1.6, -1364.5, 168, -12],
  'user-aerial-real': [1362, 174.9, -1540.7, -556.6, -46.1],      // the owner's extra aerial pose (the real photo: D:/git2/n4spb-work/tauride/user/user-aerial-real-1362_174.9_-1540.7.png)
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
const browser = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 1800000, args: ['--disable-gpu', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-gpu-sandbox'], defaultViewport: { width: 1280, height: 720 } });
let code = 0;
try {
  const page = await browser.newPage(); const logs = [];
  page.on('console', (m) => { const t = m.text(); if (/error|warn|THREE/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 1500)); });
  page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 1500)));
  await page.goto(`http://127.0.0.1:${port}/tools/tauride/t8a-preview.html${args.mods ? '?mods=' + args.mods : ''}`, { waitUntil: 'load', timeout: 900000 });
  await page.waitForFunction('window.__done === true', { timeout: 1200000 });
  fs.mkdirSync(OUT, { recursive: true });
  console.log('build ms', JSON.stringify(await page.evaluate(() => window.__api.T)));
  for (const name of only) {
    const v = views[name]; if (!v) { console.log('no view', name); continue; }
    const t = Date.now();
    const url = await page.evaluate((a) => window.__api.view(...a), v);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('view', name, Date.now() - t, 'ms', JSON.stringify(await page.evaluate(() => window.__last)));
  }
  const errs = await page.evaluate(() => window.__api.errors);
  console.log('errors', errs.length); for (const e of [...errs, ...logs]) console.log('  ' + e.replace(/\n/g, ' | ').slice(0, 1200));
  if (errs.some((e) => /Shader Error|VALIDATE_STATUS|compile|build /i.test(e))) code = 1;
} catch (e) { console.log('FAIL', e.message); code = 1; }
await browser.close(); server.close();
process.exit(code);
