// Real-renderer views of the Vasilievsky Island stations (module metro alone, ?only=metro): node tools/metro-vo-shots.mjs [--set vo|gorny|s2|all] [--only name,name] [--out shots/metro-vo/a] [--q medium]
// A view = [name, frame, x, y, z, tx, tz]: the camera stands at (x, y, z) of the named frame of the station object (ctx.metro.petro.<station>.<frame>) and looks at (tx, tz) of the same frame;
// y is absolute (metres) or 'fy+N' (the platform level of the station + N). The PNGs go to <out>_<name>.png; the tool prints the mean luma of each (not black, not white) and the page errors.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const out = path.resolve(root, args.out || 'shots/metro-vo/a');
fs.mkdirSync(path.dirname(out), { recursive: true });
const SET = (args.set || 'all').split(','), ONLY = args.only ? new Set(args.only.split(',')) : null;

// ---- the views (frame keys: S hall, Se escalator, Sv vestibule; station keys of ctx.metro.petro: vo, gorny, sport2, sport)
const VIEWS = {
  vo: [
    ['vo_hall_axis', 'vo', 'S', 0.5, 's.hall.FY+1.7', -50, 0, 40], ['vo_hall_end', 'vo', 'S', 0.5, 's.hall.FY+1.7', 38, 0, -60], ['vo_platform', 'vo', 'S', 5.6, 's.hall.FY+1.7', -22, 5.6, 20], ['vo_vault', 'vo', 'S', 0, 's.hall.FY+1.7', -10, 0, 30, 28],
    ['vo_door', 'vo', 'S', 3.5, 's.hall.FY+1.6', -4, -7, 0], ['vo_esc_top', 'vo', 'Se', 2, 's.esc.yAt(4)+1.7', 4, 2, 70, -28], ['vo_esc_foot', 'vo', 'Se', 2, 's.esc.yAt(s.esc.RUN-8)+1.7', 's.esc.RUN-8', 2, 20, 28], ['vo_lower', 'vo', 'S', 0, 's.hall.FY+1.7', 63.5, 0, 30],
    ['vo_vest1', 'vo', 'Sv', -12.2, 's.FV+1.7', -6.5, 0, 0], ['vo_vest2', 'vo', 'Sv', 2.0, 's.FV+1.7', -5, -12, 8], ['vo_vest3', 'vo', 'Sv', -4, 's.FV+1.7', 9, -14, 11],
  ],
};
VIEWS.links = [
  ['lk_vo_gd_mid', 'link:vasileostrovskaya>gostiny', 0.5, 0], ['lk_vo_gd_start', 'link:vasileostrovskaya>gostiny', 0.03, 0], ['lk_vo_gd_end', 'link:vasileostrovskaya>gostiny', 0.97, 0], ['lk_adm_sp_mid', 'link:admiralteyskaya>sportivnaya', 0.5, 0], ['lk_adm_sp_end', 'link:admiralteyskaya>sportivnaya', 0.96, 0], ['lk_gn_spas_start', 'link:gorny>spasskaya', 0.03, 0], ['lk_gn_spas_mid', 'link:gorny>spasskaya', 0.5, 0], ['lk_gn_spas_disc', 'link:gorny>spasskaya', 0.975, 0], ['lk_gn_spas_end', 'link:gorny>spasskaya', 0.995, 0, 0],
  ['vo_tunnel_mouth', 'vo', 'S', -5.8, 's.hall.FY+1.7', 50, -8.8, 120], ['sp_tunnel_mouth_up', 'sport', 'S', 5.0, -55.7, 66, 7.9, 140], ['adm_tunnel_mouth', 'admiralteyskaya', 'S', 6.5, -84.3, -55, 10, -120],
];
VIEWS.s2 = [
  ['s2_hall_end2', 'sport', 'S', 3, -62.3, 66, 0, 95, 4], ['s2_hall_end3', 'sport', 'S', 0, -62.3, 70, 0, 95, 12], ['s2_tun_door', 'sport2', 'S', 0, 's.trav.yAt(84)+1.7', 86, 0, 60],
  ['s2_hall_end', 'sport', 'S', 0, -62.3, 40, 0, 95], ['s2_tun_start', 'sport2', 'S', 0, 's.trav.yAt(92)+1.7', 92, 0, 200], ['s2_tun_mid', 'sport2', 'S', -1.9, 's.trav.yAt(200)+1.7', 200, -1.9, 330], ['s2_tun_back', 'sport2', 'S', 1.9, 's.trav.yAt(300)+1.7', 300, 1.9, 120],
  ['s2_tun_end', 'sport2', 'S', 0, 's.trav.yAt(325)+1.7', 322, 0, 345], ['s2_esc_top', 'sport2', 'Se', -2, 's.esc.yAt(4)+1.7', 4, -2, 60, -28], ['s2_esc_foot', 'sport2', 'Se', -2, 's.esc.yAt(s.esc.RUN-8)+1.7', 's.esc.RUN-8', -2, 10, 28],
  ['s2_hall1', 'sport2', 'Sv', 0, 's.FV+1.7', -17, 0, 6], ['s2_hall2', 'sport2', 'Sv', 0, 's.FV+1.7', 13, 0, -20], ['s2_hall3', 'sport2', 'Sv', -10, 's.FV+1.7', 5, 12, -4], ['s2_hall4', 'sport2', 'Sv', 9, 's.FV+1.7', -17, -4, -8],
  ['s2_pav6', 'sport2', 'wells.w6.Sv', 0.4, 1.75, -2.4, 0, 8, -12], ['s2_pav7', 'sport2', 'wells.w7.Sv', 0.4, 1.75, -2.4, 0, 8, -12], ['s2_well6', 'sport2', 'wells.w6.Se', -1.9, 1.1, 1.5, -1.9, 14, -26], ['s2_landing6', 'sport2', 'wells.w6.Se', 0, -5.3, 's.wells.w6.w.run+3', 0, 's.wells.w6.w.run+8'],
  ['s2_pit10', 'world', 'x', -3706.6, 1.7, -1708, -3713.4, -1717.5, -8], ['s2_pit10_in', 'world', 'x', -3715.0, 1.7, -1719.0, -3719.0, -1725.0, -22],
];
VIEWS.gorny = [
  ['gn_hall_axis', 'gorny', 'S', 0.5, -68.3, -60, 0.5, 40], ['gn_hall_pylons', 'gorny', 'S', 8, -68.3, -30, 7, 0], ['gn_hall_lamps', 'gorny', 'S', 0, -68.3, -20, 8, -6, 14], ['gn_hall_end', 'gorny', 'S', 0.5, -68.3, 70, 0, -80],
  ['gn_hall_wall', 'gorny', 'S', 2, -68.3, 0, 12, 2, 0], ['gn_esc_top', 'gorny', 'Se', -2, 's.esc.yAt(4)+1.7', 4, -2, 70, -28], ['gn_esc_foot', 'gorny', 'Se', -2, 's.esc.yAt(s.esc.RUN-8)+1.7', 's.esc.RUN-8', -2, 20, 28],
  ['gn_ticket1', 'gorny', 'Sv', 0, 's.FV+1.7', -9, 0, 20], ['gn_ticket2', 'gorny', 'Sv', 0, 's.FV+1.7', 20, 0, -15], ['gn_ticket3', 'gorny', 'Sv', 11, 's.FV+1.7', 3, 0, 6],
  ['gn_pav_in', 'gorny', 'wells.in.Sv', 0.3, 1.75, -2.2, 0, 8, -12], ['gn_pav_out', 'gorny', 'wells.out.Sv', 0.3, 1.75, -2.2, 0, 8, -12], ['gn_well_in', 'gorny', 'wells.in.Se', -1.45, 1.1, 1.5, -1.45, 14, -26], ['gn_well_out', 'gorny', 'wells.out.Se', 1.0, 1.1, 1.5, 1.0, 14, -26],
  ['gn_landing', 'gorny', 'wells.in.Se', 0, -5.3, 's.wells.in.w.run+3', 0, 's.wells.in.w.run+8'], ['gn_landing_out', 'gorny', 'wells.out.Se', 0, -5.3, 's.wells.out.w.run+3', 0, 's.wells.out.w.run+8'],
];

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const problems = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  if (fs.existsSync(threeRoot)) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  let nErr = 0; page.on('pageerror', (e) => { if (nErr++ < 2) problems.push(`[pageerror] ${(e.stack || e.message).split(String.fromCharCode(10)).slice(0, 5).join(' | ')}`); });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[console.error] ${m.text()}`); });
  await page.goto(`http://127.0.0.1:${port}/index.html?${new URLSearchParams({ q: args.q || 'medium', stats: '1', only: args.modules || 'metro' })}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  for (const e of await page.evaluate(() => window.__errors || [])) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  await page.click('#go'); await sleep(800);
  await page.evaluate(() => {
    window.__lum = async (b64) => { const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()); const cv = new OffscreenCanvas(img.width, img.height), g = cv.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, img.width, img.height).data; let s = 0, dark = 0, white = 0; const n = img.width * img.height; for (let i = 0; i < d.length; i += 4) { const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += l; if (l < 22) dark++; if (l > 240) white++; } return { mean: s / n, dark: dark / n, white: white / n }; };
    window.__view = (v) => {                                    // [name, station, frameKey, x, y, z, tx, tz, pitch?]
      if (String(v[1]).startsWith('link:')) {                    // [name, 'link:<key>', fraction of the path, back (0 = looking along the travel, 1 = back), pitch]
        const lk = window.__ctx.metro.env.real[v[1].slice(5)]; if (!lk) return { error: 'no link ' + v[1] }; const P = lk.path, i = Math.max(1, Math.min(P.length - 2, Math.round(v[2] * (P.length - 1)))), a = P[i - 1], b = P[i + 1], sg = v[3] ? -1 : 1;
        const yaw = Math.atan2(-(b[0] - a[0]) * sg, -(b[2] - a[2]) * sg) * 180 / Math.PI; window.__setCam(P[i][0], P[i][1] + 1.7, P[i][2], yaw, v[4] ?? -1); return { x: P[i][0], y: P[i][1] + 1.7, z: P[i][2], yaw };
      }
      const [, st, fk, x, y, z, tx, tz, pitch] = v, s = st === 'world' ? { W: (a, b) => [a, b] } : (window.__ctx.metro.petro[st] || ({ admiralteyskaya: window.__ctx.metro.west.adm, gostiny: window.__ctx.metro.west.gd })[st]); if (!s) return { error: 'no station ' + st };
      const S = st === 'world' ? s : fk.split('.').reduce((o, p) => (o ? o[p] : o), s); if (!S || !S.W) return { error: 'no frame ' + fk };
      const num = (q) => (typeof q === 'number' ? q : new Function('s', 'return (' + q + ')')(s));          // a number or a JS expression of the station object s
      const zz = num(z), a = S.W(num(x), zz), b = S.W(num(tx), num(tz)), yy = num(y);
      const yaw = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) * 180 / Math.PI;
      window.__setCam(a[0], yy, a[1], yaw, pitch ?? -2); return { x: a[0], y: yy, z: a[1], yaw };
    };
  });
  const names = []; for (const s of SET) for (const v of (s === 'all' ? Object.values(VIEWS).flat() : VIEWS[s] || [])) if (!ONLY || ONLY.has(v[0])) names.push(v);
  for (const v of names) {
    const r = await page.evaluate((v) => { try { return window.__view(v); } catch (e) { return { error: String(e) }; } }, v);
    if (r.error || !(r.x === r.x) || r.x === null) { problems.push(`${v[0]}: ${r.error}`); continue; }
    await sleep(450);
    const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(`${out}_${v[0]}.png`, Buffer.from(b64, 'base64'));
    const l = await page.evaluate((b) => window.__lum(b), b64);
    console.log(`${v[0]}: mean ${l.mean.toFixed(0)} dark ${(l.dark * 100).toFixed(1)}% white ${(l.white * 100).toFixed(1)}%  cam ${r.x.toFixed(1)},${r.y.toFixed(1)},${r.z.toFixed(1)} yaw ${r.yaw.toFixed(0)}`);
  }
} catch (e) { problems.push('[crashed] ' + (e.stack || e.message)); }
for (const p of problems) console.log('PROBLEM:', p);
await browser.close(); server.close();
process.exit(problems.length ? 1 : 0);
