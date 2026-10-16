// Top-down overlay check: renders the blockout straight down (north up) so that one screen pixel = one pixel of
// docs/reference/yandex-center.png (1528 x 955, 0.9344 m/px, centre at world (+119.6, +44.0)), then compares the two. Everything (image size, scale,
// centre of the picture in world metres, camera height) is derived from docs/reference/calibration.json: nothing is hard-coded to the play area.
//   node tools/overlay.mjs [--fov 20] [--out shots/overlay/top] [--only environment,streets,city]
// Writes <out>.png (our render), <out>-blend.png (Yandex 100 % + our render 50 %), <out>-side.png (Yandex | ours, half size) and prints
//   - the IoU of the road masks (Yandex road colour #c0c7d5 / #cdd3de vs our asphalt colour) and the best shift of ours against Yandex (px and metres).
// A small fov (20 deg, camera ~2.5 km up for the 892 m tall picture) keeps the roof parallax under ~5 m at the edges; fog is switched off (?nofog), claims are ignored (?allcity).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (!fs.existsSync(path.join(root, 'docs/reference/yandex-center.png'))) {   // the screenshot is third-party and git-ignored: a fresh clone does not have it
  console.log('overlay: docs/reference/yandex-center.png is not present (third-party Yandex Maps screenshot, kept out of the repository on purpose); nothing to compare with. RESULT: SKIPPED');
  process.exit(0);
}
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const cal = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/calibration.json'), 'utf8'));
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { ROADS } = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const W = cal.image.width, H = cal.image.height, MPP = cal.metresPerPixel;       // 1528 x 955, 0.9344
const CX = (W / 2 - cal.originPixel.u) * MPP, CZ = (H / 2 - cal.originPixel.v) * MPP;   // world position of the image centre (119.6, 44.0)
const fov = Number(args.fov || 20), camY = (H * MPP / 2) / Math.tan(fov * Math.PI / 360);
const out = path.resolve(root, args.out || 'shots/overlay/top'); fs.mkdirSync(path.dirname(out), { recursive: true });
const px = (x, z) => [W / 2 + (x - CX) / MPP, H / 2 + (z - CZ) / MPP];          // world -> pixel (same mapping for both images)

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
let failed = false;
try {
  const page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
    if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
    req.continue();
  });
  const q = new URLSearchParams({ shot: '1', w: String(W), h: String(H), t: '0', q: 'high', nofog: '1', allcity: '1', only: args.only || 'environment,streets,city' });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true', { timeout: 280000, polling: 250 });
  await page.evaluate((f) => { window.__camera.fov = f; window.__camera.updateProjectionMatrix(); }, fov);
  await page.evaluate((c) => window.__setCam(c[0], c[1], c[2], 0, -90), [CX, camY, CZ]);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  await page.screenshot({ path: out + '.png' });
  console.log(`rendered ${path.relative(root, out)}.png  camera (${CX.toFixed(1)}, ${camY.toFixed(0)}, ${CZ.toFixed(1)}) fov ${fov}`);

  // ---- compare in a blank page (canvas)
  const cmp = await browser.newPage();
  await cmp.setContent('<canvas id="c"></canvas>');
  const ours = 'data:image/png;base64,' + fs.readFileSync(out + '.png').toString('base64');
  const ref = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'docs/reference/yandex-center.png')).toString('base64');
  // centreline samples of the big roads (pixel coordinates) to learn our asphalt colour
  const samples = [];
  for (const r of ROADS) if (['primary', 'secondary', 'tertiary'].includes(r.hw)) for (let i = 0; i + 3 < r.pts.length; i += 2) { const a = px(r.pts[i], r.pts[i + 1]), b = px(r.pts[i + 2], r.pts[i + 3]); for (let t = 0.25; t < 1; t += 0.5) samples.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  const res = await cmp.evaluate(async (ours, ref, samples, W, H) => {
    const load = (src) => new Promise((r) => { const im = new Image(); im.onload = () => r(im); im.src = src; });
    const [A, B] = await Promise.all([load(ours), load(ref)]);
    const c = document.getElementById('c'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, W, H).data;
    g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, W, H).data;
    // our asphalt colour: per-channel median at the road samples
    const ch = [[], [], []]; for (const [u, v] of samples) { const x = Math.round(u), y = Math.round(v); if (x < 0 || y < 0 || x >= W || y >= H) continue; const k = (y * W + x) * 4; for (let j = 0; j < 3; j++) ch[j].push(da[k + j]); }
    const med = ch.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });
    const S = 1, w = W / S | 0, h = H / S | 0, ma = new Uint8Array(w * h), mb = new Uint8Array(w * h);
    const d2 = (d, k, r0, g0, b0) => (d[k] - r0) ** 2 + (d[k + 1] - g0) ** 2 + (d[k + 2] - b0) ** 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (y * S * W + x * S) * 4;
      ma[y * w + x] = d2(da, k, med[0], med[1], med[2]) < 13 * 13 ? 1 : 0;
      mb[y * w + x] = d2(db, k, 192, 199, 213) < 10 * 10 ? 1 : 0;      // only the big roads (#c0c7d5): ours = primary / secondary / tertiary asphalt
    }
    const iou = (dx, dy) => { let i = 0, u = 0; for (let y = 10; y < h - 10; y++) for (let x = 10; x < w - 10; x++) { const a = ma[(y + dy) * w + x + dx], b = mb[y * w + x]; if (a && b) i++; if (a || b) u++; } return i / (u || 1); };
    const base = iou(0, 0); let best = { dx: 0, dy: 0, v: base };
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const v = iou(dx, dy); if (v > best.v) best = { dx, dy, v }; }
    let na = 0, nb = 0; for (let i = 0; i < w * h; i++) { na += ma[i]; nb += mb[i]; }
    // blend + side by side
    const blend = document.createElement('canvas'); blend.width = W; blend.height = H; const bg = blend.getContext('2d');
    bg.drawImage(B, 0, 0); bg.globalAlpha = 0.5; bg.drawImage(A, 0, 0);
    const side = document.createElement('canvas'); side.width = W; side.height = H / 2; const sg = side.getContext('2d');
    sg.drawImage(B, 0, 0, W / 2, H / 2); sg.drawImage(A, W / 2, 0, W / 2, H / 2);
    return { asphalt: med, maskPx: { ours: na, yandex: nb }, iou0: base, best, S, blend: blend.toDataURL('image/png'), side: side.toDataURL('image/png') };
  }, ours, ref, samples, W, H);
  fs.writeFileSync(out + '-blend.png', Buffer.from(res.blend.split(',')[1], 'base64'));
  fs.writeFileSync(out + '-side.png', Buffer.from(res.side.split(',')[1], 'base64'));
  const mpp = MPP * res.S;
  console.log(`our asphalt colour rgb(${res.asphalt.join(',')})  road-mask pixels: ours ${res.maskPx.ours}, yandex ${res.maskPx.yandex} `);
  console.log(`road-mask IoU at zero shift: ${res.iou0.toFixed(3)}; best shift of ours vs Yandex: dx ${res.best.dx * res.S} px (${(res.best.dx * mpp).toFixed(1)} m), dy ${res.best.dy * res.S} px (${(res.best.dy * mpp).toFixed(1)} m) -> IoU ${res.best.v.toFixed(3)}`);
  // the calibration of the data has rms ~1 px = 0.9 m, max ~1.5 px (docs/reference/calibration.md); the road-width difference between Yandex and OSM adds a little more
  const off = Math.max(Math.abs(res.best.dx), Math.abs(res.best.dy)) * res.S;
  console.log(off <= 4 ? `ALIGNMENT OK (best shift ${off} px = ${(off * MPP).toFixed(1)} m or less; limit 4 px = 3.7 m)` : `ALIGNMENT OFF by ${off} px: check the frame (x east, z south, north up) and the camera`);
  console.log('files:', path.relative(root, out) + '-blend.png', path.relative(root, out) + '-side.png');
} catch (e) { console.log('OVERLAY FAILED:', e.message); failed = true; }
finally { await browser.close(); server.close(); process.exit(failed ? 1 : 0); }
