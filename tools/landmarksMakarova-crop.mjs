// tools/landmarksMakarova-crop.mjs - side-by-side zoomed crop of two PNGs (before | after), for the draw-call trim comparisons (headless Edge does the decoding).
// usage: node tools/landmarksMakarova-crop.mjs before.png after.png x y w h [scale=4] out.png
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
const [a, b, x, y, w, h, sc, out] = process.argv.slice(2);
const S = Number(out ? sc : 4), O = out || sc;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-extensions'] });
try {
  const page = await browser.newPage();
  const urls = [a, b].map((f) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(f)).toString('base64'));
  const data = await page.evaluate(async (urls, x, y, w, h, S) => {
    const imgs = await Promise.all(urls.map((u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; })));
    const c = document.createElement('canvas'); c.width = w * S * 2 + 8; c.height = h * S; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.fillStyle = '#f0f'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => g.drawImage(im, x, y, w, h, i * (w * S + 8), 0, w * S, h * S));
    return c.toDataURL('image/png');
  }, urls, +x, +y, +w, +h, S);
  fs.writeFileSync(path.resolve(O), Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', O);
} finally { await browser.close(); }
