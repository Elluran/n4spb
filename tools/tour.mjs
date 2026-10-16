// Scripted screenshot tour of the finished scene (one page load, several cameras and times of day) for QA and the docs gallery.
//   node tools/tour.mjs [--out docs/images] [--w 1600] [--h 900] [--only hero,aerial] [--t 22 (overrides the per-shot sim time)] [--jpg 82]
// Writes <out>/<name>.jpg (day) and <out>/<name>-golden.jpg / -night.jpg for the shots that ask for them (Saint Petersburg cameras; the sim time is per shot).
//   node tools/tour.mjs --set splash    the ten sights of the loading screen -> assets/splash/<name>.jpg (index.html shows one at random)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const W = Number(args.w || 1600), H = Number(args.h || 900), Q = Number(args.jpg || 82);
const outDir = path.resolve(root, args.out || (args.set === 'splash' ? 'assets/splash' : 'docs/images')); fs.mkdirSync(outDir, { recursive: true });
const only = args.only ? new Set(args.only.split(',')) : null;

// name, camera, times of day, sim time t (s).
//   cam: 4 numbers = walking eye at ground (x,z,yaw,pitch); 5 numbers = free camera (x,y,z,yaw,pitch), y = eye height; 6 numbers (...,1) = walking player standing on the highest
//        surface not above y (feet), for halls and platforms below the street.  yaw 0 = north, 90 = west.
//   boat: [index, offset across the river m, offset along the boat's path m, eye height] = camera beside tourist boat #index (ctx.services.landmarksC.boats), looking at it.
// Interiors and the metro are far from the street, so every shot has its own sim time (trains: t picks the timetable phase).
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const M = await import(pathToFileURL(path.join(root, 'src/world/data/metro.js')).href);
const pose = (p) => p.x + ',' + p.z + ',' + p.yaw + ',' + p.pitch;
const Y = L.yawToward;
const vf = M.FRAMES.vosstaniya, [px, pz] = M.toWorld(vf, -7.4, 30), [px2, pz2] = M.toWorld(vf, -7.4, -30);
const eg = M.escGeom('vosstaniya'), es = 0.14;   // 14 % of the way down the escalator tunnel
const ex = eg.head.x + (eg.bottom.x - eg.head.x) * es, ez = eg.head.z + (eg.bottom.z - eg.head.z) * es;
const SHOTS = [
  { name: 'hero', cam: pose(L.HERO), tod: ['day', 'golden'], t: 20 },
  { name: 'station-facade', cam: [592, 182, -169.9, 9].join(), tod: ['day'], t: 20 },
  { name: 'station-hall', cam: [605, 269, Y(605, 269, 611, 301), 3].join(), tod: ['day'], t: 20 },
  { name: 'platforms', cam: pose(L.VIEWS[3]), tod: ['day'], t: 40 },
  { name: 'vosstaniya-square', cam: [575, 150, Y(575, 150, 629, 111), 22].join(), tod: ['night'], t: 20 },
  { name: 'nevsky-east', cam: [200, 70, Y(200, 70, 300, 100), 3].join(), tod: ['day'], t: 30 },
  { name: 'nevsky-west', cam: [200, 70, Y(200, 70, 0, 10), 3].join(), tod: ['day', 'golden'], t: 30 },
  { name: 'anichkov-bridge', cam: '-400,8,-80,125,-14', tod: ['day'], t: 30 },
  { name: 'nevsky-fontanka-corner', cam: '-415,-60,-52,8', tod: ['day'], t: 30 },
  { name: 'fontanka-boat', boat: [0, 24, -22, 3.2], tod: ['day'], t: 20 },
  { name: 'galereya', cam: [521, 383, 175.7, 6].join(), tod: ['day'], t: 20 },
  { name: 'metro-rotunda', cam: [575, 120, Y(575, 120, 516, 92), 7].join(), tod: ['day'], t: 20 },
  { name: 'metro-escalator', cam: [ex, -58 * es + 1.7, ez, Y(0, 0, eg.bottom.x - eg.head.x, eg.bottom.z - eg.head.z), -24].join(), tod: ['day'], t: 20 },
  { name: 'metro-platform', cam: [px, -56.5, pz, Y(px, pz, px2, pz2), 2, 1].join(), tod: ['day'], t: 50 },
  { name: 'aerial', cam: '700,260,330,50,-26', tod: ['day'], t: 20 },
];

// The loading screen (index.html, SIGHTS) shows one of these at random: every sight at the golden evening, the sun outside the frame, a calm sky in the top left for the title.
// The station is the start view from the square; the other nine are flying cameras (x,y,z,yaw,pitch) above the roofs, the Bronze Horseman in profile in front of the Senate and Synod.
const SPLASH = [
  { name: 'moscow-station', cam: pose(L.HERO) },
  { name: 'obelisk', cam: '563,30,245,-19.9,-9' },
  { name: 'anichkov-bridge', cam: '-498,30,-17,-36.9,-13' },
  { name: 'kazan-cathedral', cam: '-1484,50,-395,180,-14' },
  { name: 'saviour-on-blood', cam: '-1294.5,40,-729,-14.5,-4' },
  { name: 'palace-square', cam: '-2071,60,-873,-148.5,-17' },
  { name: 'admiralty', cam: '-2461,50,-485,-11.5,-6' },
  { name: 'st-isaac', cam: '-2649,60,-311,-135,-8' },
  { name: 'bronze-horseman', cam: '-2728.3,8.5,-458.3,130.5,-4' },
  { name: 'smolny', cam: '2299,55,-1833,-90,-7' },
].map((s) => ({ ...s, tod: ['golden'], t: 20, file: s.name }));

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', `--window-size=${W},${H}`], defaultViewport: { width: W, height: H, deviceScaleFactor: 1 }, protocolTimeout: 600000 });
const problems = [];
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
  page.on('pageerror', (e) => problems.push('[pageerror] ' + e.message));
  const q = new URLSearchParams({ shot: '1', w: String(W), h: String(H), t: '0', q: args.q || 'high' });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__ready === true', { timeout: 500000, polling: 300 });
  const info = await page.evaluate(() => ({ errors: window.__errors, modules: Object.fromEntries(Object.entries(window.__stats.modules).map(([k, v]) => [k, v.ms])) }));
  console.log('modules (ms):', JSON.stringify(info.modules));
  for (const e of info.errors || []) problems.push(`[module ${e.module}] ${e.message.split('\n')[0]}`);
  const frames = (n = 4) => page.evaluate((n) => new Promise((r) => { let i = 0; const f = () => (++i >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  for (const s of args.set === 'splash' ? SPLASH : SHOTS) {
    if (only && !only.has(s.name)) continue;
    await page.evaluate((t) => window.__sim && window.__sim(t), args.t ? Number(args.t) : (s.t ?? 0));
    for (const tod of s.tod) {
      await page.evaluate((tod) => window.__tod.set(tod, true), tod);
      let v;
      if (s.boat) {   // beside a boat: across / along its path from the boat, eye height above the water, looking at it
        const [bi, across, along, eye] = s.boat;
        v = await page.evaluate(([bi, across, along, eye, t]) => { const b = window.__ctx.services.landmarksC.boats[bi].state(t), hx = Math.sin(b.rotY), hz = Math.cos(b.rotY);
          const x = b.x + hz * across + hx * along, z = b.z - hx * across + hz * along, yaw = ((-(Math.atan2(b.x - x, -(b.z - z)) * 180 / Math.PI) + 540) % 360) - 180; return [x, eye, z, yaw, 2]; }, [bi, across, along, eye, s.t ?? 0]);
      } else v = s.cam.split(',').map(Number);
      await page.evaluate((v) => { if (v.length === 4) window.__setCam(v[0], null, v[1], v[2], v[3]); else if (v.length === 6) window.__setCam(v[0], v[1], v[2], v[3], v[4], true); else window.__setCam(v[0], v[1], v[2], v[3], v[4]); }, v);
      await frames(5);
      const name = s.file || (tod === 'day' ? s.name : `${s.name}-${tod}`);
      const file = path.join(outDir, name + '.jpg');
      await page.screenshot({ path: file, type: 'jpeg', quality: Q });
      const st = await page.evaluate(() => ({ calls: window.__stats.calls, tris: window.__stats.triangles }));
      console.log(`saved ${path.relative(root, file)}  calls=${st.calls} tris=${(st.tris / 1e6).toFixed(2)}M`);
    }
  }
} catch (e) { problems.push('TOUR FAILED: ' + e.message); }
finally {
  if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  -', p.slice(0, 300)); }
  await browser.close(); server.close();
  process.exit(problems.length ? 1 : 0);
}
