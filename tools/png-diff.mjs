// Pixel comparison of two PNG screenshots (headless Edge does the decoding): prints the share of pixels that differ by more than --tol (default 24/255) in any channel
// and writes a diff image (differing pixels in red over a faded copy of the first image).
//   node tools/png-diff.mjs a.png b.png [--out diff.png] [--tol 24]
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const args = {}; const pos = [];
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) args[a.slice(2)] = process.argv[++i]; else pos.push(a); }
if (pos.length < 2) { console.log('usage: node tools/png-diff.mjs a.png b.png [--out diff.png] [--tol 24]'); process.exit(2); }
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-extensions'] });
try {
  const page = await browser.newPage();
  const urls = pos.slice(0, 2).map((f) => 'data:image/png;base64,' + fs.readFileSync(path.resolve(f)).toString('base64'));
  const r = await page.evaluate(async (urls, tol) => {
    const imgs = await Promise.all(urls.map((u) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = u; })));
    const w = Math.min(imgs[0].width, imgs[1].width), h = Math.min(imgs[0].height, imgs[1].height);
    const cv = [0, 1].map((i) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(imgs[i], 0, 0); return g.getImageData(0, 0, w, h).data; });
    const out = document.createElement('canvas'); out.width = w; out.height = h; const g = out.getContext('2d'); const od = g.createImageData(w, h);
    let diff = 0;
    for (let i = 0; i < w * h; i++) {
      const o = i * 4, d = Math.max(Math.abs(cv[0][o] - cv[1][o]), Math.abs(cv[0][o + 1] - cv[1][o + 1]), Math.abs(cv[0][o + 2] - cv[1][o + 2]));
      if (d > tol) { diff++; od.data[o] = 255; od.data[o + 1] = 0; od.data[o + 2] = 0; } else { od.data[o] = 128 + (cv[0][o] >> 1); od.data[o + 1] = 128 + (cv[0][o + 1] >> 1); od.data[o + 2] = 128 + (cv[0][o + 2] >> 1); }
      od.data[o + 3] = 255;
    }
    g.putImageData(od, 0, 0);
    return { w, h, diff, pct: +(100 * diff / (w * h)).toFixed(3), png: out.toDataURL('image/png') };
  }, urls, Number(args.tol || 24));
  console.log(`${pos[0]} vs ${pos[1]}: ${r.diff} of ${r.w * r.h} pixels differ (> ${args.tol || 24}/255): ${r.pct} %`);
  if (args.out) { fs.writeFileSync(path.resolve(args.out), Buffer.from(r.png.split(',')[1], 'base64')); console.log('diff image:', args.out); }
} finally { await browser.close(); }
