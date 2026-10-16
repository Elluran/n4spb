// Contact sheet of the street-name / house-number plates and the road signs, painted by the real builders in the real browser (Edge + puppeteer, no WebGL needed):
//   node tools/streets-plates-sheet.mjs [--out shots/streets2/sheet] [--names "набережная реки Фонтанки;площадь Островского;7-я Красноармейская улица"]
// writes <out>_plates.png (name plates 2x, number plates 2x) and <out>_signs.png (every face of streets/signs.js at 256 px). Compare the plates with the user's reference (docs/rules/SIGNS-AND-PLATES.md).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const out = args.out || 'shots/streets2/sheet';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
const NAMES = (args.names || 'набережная реки Фонтанки;площадь Островского;7-я Красноармейская улица;Невский проспект;набережная Обводного канала;Большая Морская улица;Дворцовая набережная;набережная канала Грибоедова').split(';');
const NUMS = [['153', '155/5', '157'], ['130', '130А', '132'], ['5', '3', '1'], ['22-24', '26', '28-30']];

const HTML = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script><body style="margin:0;background:#8d8f93">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800&display=swap&subset=cyrillic">
<canvas id="a" width="1600" height="2330"></canvas><canvas id="b" width="1300" height="900"></canvas>
<script type="module">
import { paintNamePlate, paintNumberPlate, plateText } from '/src/world/streets/plates.js';
import { makeSigns } from '/src/world/streets/signs.js';
import { FONTS } from '/src/core/textures.js';
await document.fonts.load('700 20px "Noto Sans"').catch(() => {}); await document.fonts.ready;
const names = ${JSON.stringify(NAMES)}, nums = ${JSON.stringify(NUMS)};
const A = document.getElementById('a').getContext('2d'); A.fillStyle = '#a7a39b'; A.fillRect(0, 0, 1600, 2330);
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
names.forEach((n, i) => { const c = mk(384, 240); paintNamePlate(c.getContext('2d'), 384, 240, n, FONTS); const x = (i % 2) * 790 + 10, y = Math.floor(i / 2) * 500 + 10; A.drawImage(c, x, y, 768, 480); });
const num = mk(512, 136); paintNumberPlate(num.getContext('2d'), 512, 136);
nums.forEach((t, i) => { const c = mk(512, 136); const g = c.getContext('2d'); g.drawImage(num, 0, 0); g.fillStyle = '#f4f6f8'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '700 70px ' + FONTS.sans; g.fillText(t[1], 256, 98); g.font = '700 38px ' + FONTS.sans; g.fillText(t[0], 96, 86); g.fillText(t[2], 416, 86);
  A.drawImage(c, 10 + (i % 2) * 790, 2030 + Math.floor(i / 2) * 150, 768, 204); });
const B = document.getElementById('b').getContext('2d'); B.fillStyle = '#8a8d92'; B.fillRect(0, 0, 1300, 900);
const S = makeSigns({ tex: { FONTS, draw: (w, h, fn) => { const c = mk(w, h); fn(c.getContext('2d'), w, h); return c; }, roundRect: (g, x, y, w, h, r) => { g.beginPath(); if (!r) { g.rect(x, y, w, h); return; } g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }, fitText: (g, text, x, y, maxW, size, font, weight = 700) => { let s = size; g.font = weight + ' ' + s + 'px ' + font; while (s > 6 && g.measureText(text).width > maxW) { s -= 1; g.font = weight + ' ' + s + 'px ' + font; } g.fillText(text, x, y); return s; } } });
const codes = [['5.19'], ['1.22'], ['2.1'], ['2.4'], ['2.5'], ['3.1'], ['3.2'], ['3.24', 40], ['3.24', 60], ['3.27'], ['3.28'], ['4.1.1'], ['4.1.2'], ['4.1.3'], ['4.1.4'], ['4.1.5'], ['4.1.6'], ['4.5'], ['5.5'], ['5.15.2'], ['5.16'], ['6.4'], ['6.16'], ['bay-taxi'], ['bay-coach'], ['chevron']];
codes.forEach(([c, a], i) => { const t = S.tex(c, a), x = (i % 6) * 215 + 10, y = Math.floor(i / 6) * 215 + 10, s = Math.min(200 / t.width, 200 / t.height); B.drawImage(t, x, y, t.width * s, t.height * s); B.fillStyle = '#fff'; B.font = '14px sans-serif'; B.fillText(c + (a ? '.' + a : ''), x, y + 212); });
document.title = 'done';
</script>`;

const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (u === '/__sheet.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(HTML); }
  const f = path.join(root, u);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': f.endsWith('.js') || f.endsWith('.mjs') ? 'text/javascript; charset=utf-8' : 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-extensions'], defaultViewport: { width: 1700, height: 1800 } });
try {
  const page = await browser.newPage();
  // three.js is imported by util / textures: serve it from node_modules through an import map
  await page.setRequestInterception(true);
  page.on('request', (rq) => {
    const u = new URL(rq.url());
    if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') return rq.abort();
    return rq.continue();
  });
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/__sheet.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.title === 'done', { timeout: 60000 }).catch(() => console.log('(sheet did not finish)'));
  const a = await page.$('#a'), b = await page.$('#b');
  await a.screenshot({ path: path.resolve(root, out + '_plates.png') });
  await b.screenshot({ path: path.resolve(root, out + '_signs.png') });
  console.log('saved', out + '_plates.png', out + '_signs.png');
} finally { await browser.close(); server.close(); }
