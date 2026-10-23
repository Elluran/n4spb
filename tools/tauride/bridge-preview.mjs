// bridge-preview.mjs - T4b fix round 1: renders the bridges, the dam, the pond water and the reeds of the Tauride Garden (with the floor and the alleys under them) with the REAL modules and the real three.js on SOFTWARE GL
// (SwiftShader through headless Edge: the CPU, no GPU), and reports the shader compile errors (the patched pond water shader of ponds.js pondMaterial among them).
//   node tools/tauride/bridge-preview.mjs [--out D:/git2/n4spb-work/tauride/T4b/preview] [--views "name:x,y,z,yaw,pitch;..."] [--only name,name] [--old]
// The views are the GPU QA's dam poses (round 1) and the east aerials of the narrow arms; --old renders the pond's sun terms as T4b shipped them (no fade with the view elevation, the full glitter sheet) next to the fixed ones.
// A CPU stand-in for a GPU look: no environment (the water has no field), no city, no post-processing, no outline pass, a plain hemisphere + sun light.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T4b/preview'));
// yaw 0 looks north (-z), 90 west (-x), 180 south, -90 east; pitch negative = down
const VIEWS = {
  'dam-lake-low': [1270, 0.3, -1682, 180, 2], 'dam-lake-5m': [1272, 1.6, -1680, 180, -8], 'dam-lake-10m': [1272, 2.5, -1686, 180, -10], 'dam-nw-34': [1262, 3, -1684, 150, -14],
  'dam-channel-5m': [1272, 1.6, -1668, 0, -8], 'dam-walkway': [1265.5, 1.7, -1671.7, -69, -12], 'dam-aerial-20m': [1272, 20, -1674, 0, -90],
  'aerial-E-250': [1480, 255, -1524, 90, -45], 'east-arm-110': [1560, 110, -1380, 100, -32], 'east-arm-50': [1400, 50, -1480, 100, -35], 'west-canal-eye': [1160, 1.7, -1520, -60, -8], 'lake-N-low': [1330, 1.7, -1600, 170, -6],
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
  await page.goto(`http://127.0.0.1:${port}/tools/tauride/bridge-preview.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__done === true', { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  const info = await page.evaluate(() => ({ T: window.__api.T, stats: window.__api.stats }));
  console.log('build ms', JSON.stringify(info.T), 'stats', JSON.stringify(info.stats));
  for (const name of only) {
    const v = views[name]; if (!v) { console.log('no view', name); continue; }
    for (const old of args.old ? [false, true] : [false]) {
      const t = Date.now();
      const url = await page.evaluate((a) => window.__api.view(...a), [...v, old]);
      fs.writeFileSync(path.join(OUT, name + (old ? '-old' : '') + '.png'), Buffer.from(url.split(',')[1], 'base64'));
      console.log('view', name + (old ? ' (old sun terms)' : ''), Date.now() - t, 'ms', JSON.stringify(await page.evaluate(() => window.__last)));
    }
  }
  const errs = await page.evaluate(() => ({ errors: window.__api.errors, programs: window.__api.programs() }));
  console.log('programs compiled', errs.programs, 'errors', errs.errors.length);
  for (const e of [...errs.errors, ...logs]) console.log('  ' + e.replace(/\n/g, ' | ').slice(0, 1200));
  if (errs.errors.some((e) => /Shader Error|VALIDATE_STATUS|compile/i.test(e))) code = 1;
} catch (e) { console.log('FAIL', e.message); code = 1; }
await browser.close(); server.close();
process.exit(code);
