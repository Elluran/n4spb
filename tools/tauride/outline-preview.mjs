// outline-preview.mjs - renders the Tauride garden floor through the engine's REAL render pipeline (core/renderer.js: normal / depth pre-pass, colour pass, outline composite) on SOFTWARE GL (SwiftShader: the CPU, no GPU),
// with a stand-in for the near environment ground and boxes behind the hills: the proof of QA round 1 of T3 (the outline pass saw through the floor: ghost outlines of what stands behind a hill, and a dark depth-edge line along the
// garden outline where the environment ground, which is in the pass, ends). node tools/tauride/outline-preview.mjs [--floor nd|old|both] [--out D:/git2/n4spb-work/tauride/T3/fix1/outline] [--only a,b] [--views "name:x,y,z,yaw,pitch;..."]
// `nd` = the shipped floor (layer 0, in the outline pass), `old` = the T3 first version (no-outline layer). Prints the share of dark outline pixels per view and writes the PNGs. Not a test of the look (no sky dome, no city).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, s, i, all) => (s.startsWith('--') ? [...a, [s.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]] : a), []));
const OUT = path.resolve(String(args.out || 'D:/git2/n4spb-work/tauride/T3/fix1/outline'));
const VIEWS = {
  'hillN-grazing': [1153, 1.7, -1625, 0, 1.5],           // the QA's hill-N-foot-low-grazing: buildings and crowns stand behind hill N
  'hillN-grazing2': [1190, 1.7, -1630, 12, 2.5],
  'seamNE': [1440, 6, -1570, -80, -14],                  // looking at the garden outline on the NE side (the floor ends, the environment ground begins)
  'seamS': [1180, 8, -1245, 0, -16],                     // the south outline from the street side
  'hillN-hidden': [1153, 1.7, -1625, 0, 1.5],            // as hillN-grazing, with boxes and crowns that the hill covers completely (page ?hidden=1): every outline pixel at their place is a ghost
};
// rectangles [x0, y0, x1, y1] (960 x 540 frame) in which the pixels darkened by the outline pass are counted: the face of hill N under its crest (nothing legitimate is outlined there: the boxes and crowns stand behind it),
// and the whole frame for the seam (nothing in the frame is outlined but the line along the garden outline)
const RECTS = { 'hillN-hidden': [400, 276, 560, 288], seamNE: [0, 165, 960, 540], seamS: [0, 165, 960, 540] };
const views = { ...VIEWS };
if (args.views) for (const v of String(args.views).split(';')) { const [n, c] = v.split(':'); views[n] = c.split(',').map(Number); }
const only = args.only ? String(args.only).split(',') : Object.keys(views).filter((n) => n !== 'hillN-hidden').concat(['hillN-hidden']);
const modes = args.floor === 'both' || !args.floor ? ['old', 'nd'] : [String(args.floor)];
const mime = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (e, d) => { if (e) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
const browser = await puppeteer.launch({ executablePath: exe, headless: true, protocolTimeout: 900000, args: ['--disable-gpu', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', '--disable-gpu-sandbox'], defaultViewport: { width: 960, height: 540 } });
let code = 0; const edge = {};
try {
  fs.mkdirSync(OUT, { recursive: true });
  for (const mode of modes) {
    const page = await browser.newPage();
    const logs = [];
    page.on('console', (m) => { const t = m.text(); if (/error|warn|THREE/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 1200)); });
    page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 1200)));
    let loaded = null;
    for (const name of only) {
      const want = name === 'hillN-hidden' ? '&hidden=1' : '';
      if (loaded !== want) { await page.goto(`http://127.0.0.1:${port}/tools/tauride/outline-preview.html?floor=${mode}${want}`, { waitUntil: 'load', timeout: 300000 }); await page.waitForFunction('window.__done === true', { timeout: 300000 }); loaded = want; }
      const v = views[name]; if (!v) { console.log('no view', name); continue; }
      const t = Date.now();
      const url = await page.evaluate((a) => window.__api.view(...a), v);
      const file = path.join(OUT, `${name}-${mode}.png`);
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      let ep = '';
      if (RECTS[name]) { const n = await page.evaluate((a, r) => window.__api.edgePixels(...a, r), v, RECTS[name]); ep = ` outline pixels in ${JSON.stringify(RECTS[name])}: ${n}`; edge[mode + '/' + name] = n; }
      console.log(`view ${name} [${mode}] ${Date.now() - t} ms${ep} -> ${file}`);
    }
    const errs = await page.evaluate(() => window.__api.errors);
    for (const e of [...errs, ...logs]) console.log('  ' + e.replace(/\n/g, ' | ').slice(0, 1000));
    if (errs.some((e) => /Shader Error|VALIDATE_STATUS|compile/i.test(e))) code = 1;
    await page.close();
  }
  if (Object.keys(edge).length) console.log('EDGE ' + JSON.stringify(edge));
} catch (e) { console.log('FAIL', e.message); code = 1; }
await browser.close(); server.close();
process.exit(code);
