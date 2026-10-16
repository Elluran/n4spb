// End-to-end authoring workflow: isolated boot, camera restore, save-triggered
// reload, full-city link, clean module errors and screenshot evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { installFontTransport } from './font-transport.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'shots/perf-oct15'); fs.mkdirSync(output, { recursive: true });
const server = spawn(process.execPath, ['tools/area-dev.mjs', 'landmarksH', '--port', '0'], { cwd: root, windowsHide: true });
let browser;
try {
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(Error('Preview server did not start')), 10000);
    server.stdout.on('data', chunk => { const m = /Area preview: (http:\/\/\S+)/.exec(String(chunk)); if (m) { clearTimeout(timeout); resolve(m[1]); } });
    server.once('error', reject); server.once('exit', code => { if (code) reject(Error(`Preview server exited ${code}`)); });
  });
  const executablePath = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(fs.existsSync);
  browser = await puppeteer.launch({ executablePath, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'], defaultViewport: { width: 1280, height: 720 } });
  const page = await browser.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await installFontTransport(page);
  const ready = () => page.waitForFunction("window.__areaPreview?.ready && getComputedStyle(document.querySelector('#intro')).visibility === 'hidden'", { timeout: 90000 });
  await page.goto(url); await ready();
  const first = await page.evaluate(() => ({ ...__areaPreview, frame: undefined, pose: __areaPreview.pose(), errors: __errors, playing: document.body.classList.contains('playing'), title: document.title }));
  assert.deepEqual(first.modules, ['landmarksH']); assert.deepEqual(first.errors, []); assert(first.playing); assert(first.title);
  const stableTime = await page.evaluate(() => performance.timeOrigin);
  for (let i = 0; i < 10; i++) fs.readFileSync(path.join(root, 'tools/area-preview.js'));
  await new Promise(resolve => setTimeout(resolve, 2000));
  assert.equal(await page.evaluate(() => performance.timeOrigin), stableTime, 'reading watched files must not reload the preview');
  await page.screenshot({ path: path.join(output, 'area-preview.png') });
  const target = await page.evaluate(() => { const p = __areaPreview.pose(); p[0] += 8; p[3] = 17; __setCam(...p); return p; });
  await page.waitForFunction('Math.abs(__ctx.playerObj.yaw * 180 / Math.PI - 17) < .01');
  const oldTime = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'Reload').click());
  await page.waitForFunction(old => performance.timeOrigin > old && window.__areaPreview?.ready, {}, oldTime);
  let actual = await page.evaluate(() => __areaPreview.pose());
  target.forEach((v, i) => assert(Math.abs(v - actual[i]) < .1, `camera component ${i} restored`));
  const reloadTime = await page.evaluate(() => performance.timeOrigin);
  // A save notification without changing source bytes or the shipping revision.
  const file = path.join(root, 'tools/area-preview.js'), now = new Date(); fs.utimesSync(file, now, now);
  await page.waitForFunction(old => performance.timeOrigin > old && window.__areaPreview?.ready, { timeout: 90000 }, reloadTime);
  actual = await page.evaluate(() => __areaPreview.pose()); target.forEach((v, i) => assert(Math.abs(v - actual[i]) < .1));
  await ready();
  const link = await page.evaluate(() => { const a = [...document.querySelectorAll('a')].find(a => a.textContent === 'Open integrated city'); a.onclick(); return a.href; });
  assert.equal(new URL(link).pathname, '/index.html'); assert(!new URL(link).searchParams.has('only'));
  assert.deepEqual(await page.evaluate(() => __errors), []); assert.deepEqual(errors, []);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.screenshot({ path: path.join(output, 'area-preview-mobile.png') });
  const result = { ok: true, loadMs: first.loadMs, reloadLoadMs: await page.evaluate(() => __areaPreview.loadMs), modules: first.modules, cameraRestored: true, saveReloaded: true, errors };
  fs.writeFileSync(path.join(output, 'area-preview.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
} finally { await browser?.close(); server.kill(); }
