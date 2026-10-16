// Evaluate a JS file in the collision yard (tools/collision-lab.html, production drive + registry): node tools/drive-garage-lab.mjs <script.js> [--shot out.png]
// The file is the body of an async function (window.lab is the yard, `return` a JSON-able value). Used for quick per-car experiments (crash traces, mass checks).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2], shotIdx = process.argv.indexOf('--shot'), shot = shotIdx > 0 ? process.argv[shotIdx + 1] : null;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png' };
const server = http.createServer((req, res) => { const f = path.resolve(root, '.' + new URL(req.url, 'http://local').pathname); if (!f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); } fs.readFile(f, (err, data) => { res.writeHead(err ? 404 : 200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(err ? 'missing' : data); }); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--no-first-run'], defaultViewport: { width: 1280, height: 800 } });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message)); page.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text()); });
  await page.goto(`http://127.0.0.1:${server.address().port}/tools/collision-lab.html`);
  await page.waitForFunction('window.labReady', { timeout: 120000 });
  await page.evaluate(() => lab.pause());
  const r = await page.evaluate(`(async () => { ${fs.readFileSync(path.resolve(file), 'utf8')}\n})()`);
  console.log(JSON.stringify(r, null, 1));
  if (shot) { await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await page.screenshot({ path: path.resolve(root, shot) }); }
} catch (e) { console.log('FAILED', e.message); process.exitCode = 1; }
finally { await browser.close(); server.close(); }
