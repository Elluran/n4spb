// furniture-preview.mjs - T6: renders the Tauride Garden's fence, gates, furniture, monuments, fountain, orangery and play fittings (with the T3 floor and alleys under them) with the REAL modules and the real three.js on SOFTWARE GL
// (SwiftShader: the CPU, no GPU) and reports the shader compile errors. node tools/tauride/furniture-preview.mjs [--out D:/git2/n4spb-work/tauride/T6/preview] [--views "name:x,y,z,yaw,pitch[,night];..."] [--only name,name]
// It is a CPU stand-in for a GPU look: no environment, no trees, no ponds, no post-processing, no outline pass, a plain hemisphere + sun light (yaw 0 = north, 90 = west, pitch + = up; the view list ends with 1 for a night frame).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T6/preview'));
// a view = [x, y, z, targetX, targetZ, pitch, night?]: the camera at (x, y, z) looks at (targetX, targetZ) (the yaw is computed: 0 = north, 90 = west), pitch + = up, a last 1 = a night frame
const VIEWS = {
  'T01-south-gate-in': [1226, 1.7, -1278, 1226, -1267.8, 4.5], 'gate-street-d0': [1224, 1.7, -1262, 1226, -1280, 6], 'gate-street-close': [1226, 1.7, -1257, 1226, -1280, 10], 'T09-west-gate': [934, 1.7, -1412, 924.1, -1412.1, 4.6], 'west-gate-street': [908, 1.7, -1412, 924, -1412, 6],
  'north-gate-in': [1121, 1.7, -1775, 1121, -1788, 6], 'north-gate-street': [1121, 1.7, -1802, 1121, -1788, 4],
  'T03-memorial': [1384, 1.7, -1439, 1371.2, -1452, 5.7], 'memorial-close': [1378, 2.9, -1444, 1371.2, -1452, 14], 'memorial-stairs': [1366, 6, -1476, 1365, -1460, -14], 'memorial-aerial': [1371, 40, -1425, 1371, -1452, -60],
  'T08-fountain': [1279.5, 1.7, -1392, 1282.6, -1400.5, -1.3], 'fountain-25': [1262, 1.7, -1380, 1282.6, -1400.5, -1], 'fountain-close': [1284, 1.6, -1396.5, 1282.6, -1400.5, -8],
  'chaikovsky-8': [938, 1.7, -1318.5, 932, -1311.1, 5], 'chaikovsky-close': [934.5, 1.7, -1313.2, 932, -1311.1, 8], 'yesenin-8': [1008, 1.7, -1366, 1004.7, -1359.3, 5], 'yesenin-20': [1018, 1.7, -1376, 1004.7, -1359.3, 6],
  'orangery-30': [985, 3, -1770, 960.6, -1779, 5], 'orangery-aerial': [940, 60, -1700, 960.6, -1779, -35],
  'T07-pitch': [1353, 1.7, -1356.5, 1383, -1356, -2.3], 'pitch-aerial': [1385, 80, -1290, 1385, -1340, -60], 'playground-10': [1040, 1.7, -1296, 1039.8, -1322.2, -4], 'playground-aerial': [1040, 45, -1290, 1039.8, -1322.2, -55],
  'fence-street': [1090, 1.7, -1262, 1040, -1272, 2], 'fence-street-close': [1050, 1.5, -1262, 1050, -1274, 2], 'fence-inside': [1050, 1.7, -1295, 1050, -1275, 0],
  'fence-lake-north': [1330, 1.7, -1618, 1330, -1634.5, 3], 'bench-row': [1130, 1.7, -1415, 1130, -1430, 0], 'central-round': [1128, 12, -1425, 1128, -1452, -25],
  'aerial-S-250': [1207, 255, -1250, 1207, -1524, -45], 'aerial-top': [1207, 480, -1524, 1207, -1524, -90],
  'night-T01': [1226, 1.7, -1278, 1226, -1267.8, 4.5, 1], 'night-alley': [1000, 1.7, -1406, 1060, -1407, 2, 1], 'night-gate': [1226, 2.2, -1262, 1226, -1280, 6, 1], 'night-aerial': [1100, 120, -1330, 1100, -1420, -45, 1], 'night-fountain': [1279.5, 1.7, -1392, 1282.6, -1400.5, -1.3, 1],
};
const views = { ...VIEWS };
if (args.views) for (const v of String(args.views).split(';')) { const [n, c] = v.split(':'); views[n] = c.split(',').map(Number); }
const yawOf = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z)) * 180 / Math.PI;
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
  await page.goto(`http://127.0.0.1:${port}/tools/tauride/furniture-preview.html`, { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction('window.__done === true', { timeout: 300000 });
  fs.mkdirSync(OUT, { recursive: true });
  const info = await page.evaluate(() => ({ T: window.__api.T, stats: window.__api.stats }));
  console.log('build ms', JSON.stringify(info.T), 'stats', JSON.stringify(info.stats));
  for (const name of only) {
    const v = views[name]; if (!v) { console.log('no view', name); continue; }
    const t = Date.now();
    const night = v.length > 6 && v[6] ? 1 : 0; await page.evaluate((n) => window.__api.night(n), night);
    const url = await page.evaluate((a) => window.__api.view(...a), [v[0], v[1], v[2], yawOf(v[0], v[2], v[3], v[4]), v[5]]);
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
