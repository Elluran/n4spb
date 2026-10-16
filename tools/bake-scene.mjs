// Offline shipping bake using real browser canvas textures and global claims.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import puppeteer from 'puppeteer-core';
import { bakedRevision } from './baked-revision.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const revision = bakedRevision(root), output = path.join(root, 'assets/baked');
fs.mkdirSync(output, { recursive: true });
const files = {}, sizes = {};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://local');
    if (url.pathname === '/__baked_revision') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ revision })); }
    if (url.pathname === '/__bake_inputs') {
      if (!files.field || !files['street-kerbs']) { res.writeHead(409); return res.end('The high-quality field and kerb bakes are not complete'); }
      res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
      const inputs=Object.keys(files).filter(name=>name==='field'||name.startsWith('field-')||name==='street-kerbs');
      return res.end(JSON.stringify({ revision, files:Object.fromEntries(inputs.map(name=>[name,files[name]])),
        sizes:Object.fromEntries(inputs.map(name=>[name,sizes[name]])) }));
    }
    if (req.method === 'POST' && url.pathname.startsWith('/__bake/')) {
      const name = url.pathname.slice(8); if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Invalid asset name');
      const chunks = []; let bytes = 0;
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 4 * 1024 * 1024) throw new Error('Bake chunk too large'); chunks.push(chunk); }
      const part = path.join(output, `${name}.${revision}.part`), offset = Number(req.headers['x-bake-offset']);
      if (offset === 0) fs.writeFileSync(part, Buffer.concat(chunks));
      else { if (fs.statSync(part).size !== offset) throw new Error('Out-of-order bake upload'); fs.appendFileSync(part, Buffer.concat(chunks)); }
      if (req.headers['x-bake-final'] !== '1') { res.end('ok'); return; }
      const filename = `${name}.${revision}.bin.gz`, destination = path.join(output, filename);
      const rawBytes = fs.statSync(part).size;
      // The field is nearly 1 GiB. Stream compression instead of allocating
      // another full copy in Node while the browser retains its scene/buffers.
      await pipeline(fs.createReadStream(part), createGzip({ level: 6 }), fs.createWriteStream(`${destination}.tmp`));
      fs.renameSync(`${destination}.tmp`, destination);
      files[name] = filename; sizes[name] = { raw: rawBytes, gzip: fs.statSync(destination).size };
      fs.unlinkSync(part); console.log(`  ${name}: ${(sizes[name].gzip / 1048576).toFixed(2)} MiB`);
      res.end('ok'); return;
    }
    const pathname = decodeURIComponent(url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
    const filename = path.resolve(root, '.' + pathname);
    if (!filename.startsWith(root + path.sep)) throw new Error('Outside project root');
    fs.readFile(filename, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store'); res.end(data);
    });
  } catch (e) { res.writeHead(500); res.end(e.message); console.error(e); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser = await puppeteer.launch({ executablePath, headless: true, protocolTimeout: 3600000,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox', `--js-flags=--max-old-space-size=${process.env.BAKE_HEAP || 8192}`], defaultViewport: { width: 1280, height: 720 } });
try {
  for (const quality of ['high', 'medium', 'low']) {
    const page = await browser.newPage();
    await (await import('./font-transport.mjs')).installFontTransport(page);
    // Intercept only CDN scripts: intercepting large binary POST uploads would
    // copy their bodies through the DevTools protocol and exhaust memory.
    const cdp = await page.createCDPSession();
    await cdp.send('Fetch.enable', { patterns: [{ urlPattern: 'https://cdn.jsdelivr.net/npm/three@*/*' }] });
    cdp.on('Fetch.requestPaused', async ({ requestId, request }) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(request.url);
      const body = fs.readFileSync(path.join(root, 'node_modules/three', m[1])).toString('base64');
      await cdp.send('Fetch.fulfillRequest', { requestId, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }, { name: 'Access-Control-Allow-Origin', value: '*' }], body });
    });
    let rejectFailure;
    const failure = new Promise((_, reject) => { rejectFailure = reject; });
    failure.catch(() => {}); // errors may arrive before the readiness wait starts
    page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); rejectFailure(new Error(`${quality} bake script failed: ${e.message}`)); });
    page.on('error', e => { console.error('RENDERER ERROR:', e.message); rejectFailure(new Error(`${quality} bake renderer failed: ${e.message}`)); });
    const T0 = Date.now();
    let progress = 'loading page';
    page.on('console', m => {
      if (m.text().startsWith('[bake-progress] ')) progress = m.text().slice(16);
      else if (m.type() === 'error') console.error(m.text(), ...m.args().map(a=>a.remoteObject().description||''));
      else if (process.env.BAKE_VERBOSE) console.log(`[${Math.round((Date.now() - T0) / 1000)}s] ${m.text().slice(0, 300)}`);
    });
    await page.evaluateOnNewDocument(() => {
      addEventListener('DOMContentLoaded', () => {
        const label = document.getElementById('loadlabel'), percent = document.getElementById('loadpct');
        if (!label) return;
        const report = () => console.log(`[bake-progress] ${percent?.textContent || ''} ${label.textContent || 'finalizing'}`);
        new MutationObserver(report).observe(label, { childList: true, characterData: true, subtree: true }); report();
      }, { once: true });
    });
    console.log(`Baking ${quality} (${quality === 'high' ? 'static geometry, textures, field, roof, navigation' : 'navigation'})…`);
    page.on('requestfailed', r => console.error('REQUEST FAILED:', r.url().slice(0, 160), r.failure() && r.failure().errorText));
    page.on('response', r => { if (r.status() >= 400) console.error('HTTP', r.status(), r.url().slice(0, 160)); });
    const heartbeat = setInterval(() => console.log(`[${quality} ${Math.round((Date.now() - T0) / 1000)}s] ${progress}; ${Object.keys(files).length} products complete`), 30000);
    try {
      const resp = await page.goto(`http://127.0.0.1:${server.address().port}/?shot=1&bake=${quality === 'high' ? '1' : 'nav'}&q=${quality}&t=0`, { waitUntil: 'load', timeout: 180000 });
      console.log(`page loaded: HTTP ${resp && resp.status()} ${page.url().slice(0, 80)} "${await page.title()}"`);
      await Promise.race([
        page.waitForFunction('window.__bakeReady === true', { timeout: 3600000, polling: 1000 }),
        failure,
      ]);   // a crashed renderer or uncaught script error must not consume the one-hour build timeout
      const errors = await page.evaluate(() => __errors); if (errors.length) throw new Error(JSON.stringify(errors));
      console.log(`Finished ${quality}. ${Object.keys(files).length} products.`);
    } catch (e) {
      console.error(`Bake stopped in ${quality} after ${Math.round((Date.now() - T0) / 1000)}s: ${progress}; ${Object.keys(files).length} completed products`);
      throw e;
    } finally { clearInterval(heartbeat); await page.close().catch(() => {}); }
  }
  for (const name of ['field', 'roof', 'street-textures', 'street-kerbs', 'street-surfaces', 'city-base', 'nav-high', 'nav-medium', 'nav-low']) if (!files[name]) throw new Error(`Missing product ${name}`);
  if (bakedRevision(root) !== revision) throw new Error('Source changed during the bake; refusing to publish stale assets');
  const manifest = { format: 1, revision, files, sizes };
  const revisionFile = path.join(root, 'src/core/baked-revision.js');
  // Publish only completed products. An interrupted bake must not replace the
  // revision used by the last good manifest on a static host.
  fs.writeFileSync(`${revisionFile}.tmp`, `// Generated by npm run bake.\nexport const BAKED_REVISION = '${revision}';\n`);
  fs.writeFileSync(path.join(output, 'manifest.json.tmp'), JSON.stringify(manifest, null, 2));
  fs.renameSync(path.join(output, 'manifest.json.tmp'), path.join(output, 'manifest.json'));
  fs.renameSync(`${revisionFile}.tmp`, revisionFile);
  const keep = new Set(['manifest.json', ...Object.values(files)]);
  for (const name of fs.readdirSync(output)) {
    if (!keep.has(name) && /^[a-zA-Z0-9_-]+\.[a-f0-9]{20}\.(bin\.gz|part)$/.test(name)) fs.unlinkSync(path.join(output, name));
  }
  console.log(`BAKE OK: ${Object.keys(files).length} files, ${(Object.values(sizes).reduce((n, a) => n + a.gzip, 0) / 1048576).toFixed(1)} MiB compressed. Revision ${revision}`);
} finally { await browser.close(); server.close(); }
