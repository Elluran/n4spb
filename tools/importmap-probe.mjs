// Go / no-go probe of the area-selection mechanism of docs/AREAS.md: does a STATIC import map that remaps URL-like keys (./src/data/city.js -> ./src/data/city-north.js) reach every
// relative importer, dynamic import() and absolute-URL import() of the page, at the site root AND under a sub-path (GitHub Pages: /n4spb/north.html)?
//   node tools/importmap-probe.mjs                     Edge (headless, no GPU) at the root and under /n4spb/, then Firefox when it is installed
//   node tools/importmap-probe.mjs --browser edge|firefox|all
//   node tools/importmap-probe.mjs --serve [port]      keeps a server on 0.0.0.0 (default 5190) and prints the LAN URLs: open them on a phone (iOS Safari, Android Chrome) and read PASS / FAIL on the page
// Exit code 1 when any browser run fails (a browser that cannot be started is reported and skipped).
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'importmap-probe');
const args = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { args[a.slice(2)] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const SUB = '/n4spb';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === SUB || p.startsWith(SUB + '/')) p = p.slice(SUB.length) || '/';       // the sub-path is the same tree
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p); if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, d) => { if (err) { res.writeHead(404); return res.end('not found'); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(d); });
});
const wantServe = !!args.serve;
const port = wantServe ? Number(args.serve) || 5190 : 0;
await new Promise((r) => server.listen(port, wantServe ? '0.0.0.0' : '127.0.0.1', r));
const p = server.address().port;

if (wantServe) {
  const ips = Object.values(os.networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log('probe server up. Open on the phone (same Wi-Fi):');
  for (const ip of ips) console.log(`  http://${ip}:${p}/     http://${ip}:${p}${SUB}/`);
  console.log('PASS (green) or FAIL (red) is shown on the page. Ctrl+C to stop.');
} else {
  const which = (args.browser && args.browser !== '1') ? args.browser : 'all';
  const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((q) => fs.existsSync(q));
  const FIREFOX = ['C:/Program Files/Mozilla Firefox/firefox.exe', 'C:/Program Files (x86)/Mozilla Firefox/firefox.exe'].find((q) => fs.existsSync(q));
  let failed = 0;
  async function run(name, launch) {
    let browser;
    try { browser = await launch(); } catch (e) { console.log(`[${name}] SKIPPED: cannot start (${String(e.message).split('\n')[0].slice(0, 160)})`); return; }
    try {
      console.log(`[${name}] ${await browser.version()}`);
      for (const base of ['/', SUB + '/']) {
        const page = await browser.newPage();
        const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160))); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
        await page.goto(`http://127.0.0.1:${p}${base}`, { waitUntil: 'load', timeout: 30000 });
        let res = null;
        try { await page.waitForFunction('window.__probe', { timeout: 15000 }); res = await page.evaluate(() => window.__probe); } catch (e) { res = { ok: false, results: [{ name: 'page produced a result', ok: false, detail: String(e.message).slice(0, 100) }], info: {} }; }
        console.log(`  ${res.ok ? 'PASS' : 'FAIL'}  base ${base}   (worker sees: ${res.info?.workerSees}; importmap supported: ${res.info?.importMapSupported})`);
        for (const r of res.results) if (!r.ok) console.log(`     FAIL ${r.name}  [${r.detail}]`);
        if (errors.length) console.log(`     page errors: ${errors.join(' | ')}`);
        if (!res.ok) failed++;
        await page.close();
      }
    } finally { await browser.close(); }
  }
  if ((which === 'all' || which === 'edge') && EDGE) await run('edge', () => puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-first-run', '--disable-extensions'] }));
  else if (which === 'edge') { console.log('Edge/Chrome not found'); failed++; }
  if ((which === 'all' || which === 'firefox') && FIREFOX) await run('firefox', () => puppeteer.launch({ browser: 'firefox', executablePath: FIREFOX, headless: true }));
  server.close();
  console.log(failed ? `RESULT: FAIL (${failed} run(s))` : 'RESULT: OK');
  process.exit(failed ? 1 : 0);
}
