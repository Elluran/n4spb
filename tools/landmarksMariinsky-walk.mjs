// landmarksMariinsky walk probe (derived from qa-walk.mjs): portico front, side entrance, the two gardens, monument plazas, the quay.
// QA walk test in the real scene (headless Edge + puppeteer-core, like tools/shot.mjs): a simulated player (the real Player.update with W / Shift held, yaw pointed at the next waypoint,
// a sidestep when blocked) walks named routes of the west and reports: reached / stuck (where, what is ahead), fell through the ground, rescue events, max climb.
//   node tools/qa-walk.mjs [--only routeName,routeName] [--list] [--edge N]       default: all routes
//   node tools/qa-walk.mjs --walls [--step 25]   wall-hole sweep: from the street side of every west building edge the walker pushes 5 m into the facade; ends > 1.5 m inside = hole in the collider wall
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; args[k] = v; } }
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const FR = await import(pathToFileURL(path.join(root, 'src/world/landmarksMariinsky/frame.js')).href);
const T = (u, n) => FR.TW(u, n), S = (u, n) => FR.SW(u, n);
const flat = (a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
const routes = {};
// the street in front of the portico, the doors, along the facade and to the corner of Glinka street
routes['portico-front'] = [T(-5, 14), T(-5, 8), T(-5, 3.6), T(-5, 8), T(5, 8), T(14, 6), T(-14, 6), T(-5, 14)];
// round the avant-corps and along the side entrance wall to the parking
routes['side-entrance'] = [T(20, 12), T(30, 2), T(34, -10), T(34, -24), T(45, -30), T(70, -30), T(45, -30), T(34, -12), T(20, 8)];
// the north garden (Rimsky-Korsakov): along alley A1 and A2, round the monument plaza, back by the link
routes['rk-garden'] = [S(-45, 36.1), S(-30, 36.1), S(-16.3, 36.1), S(-16.3, 27.1), S(-30, 27.1), S(-44, 27.1), S(-30, 36.1), S(0, 36.1)];
routes['rk-plaza'] = [S(-30, 30), S(-25, 31.4), S(-18.5, 31.4), S(-25, 22), S(-30, 30)];
// the south garden (Glinka): the long alley, round the monument and its steps
routes['glinka-garden'] = [S(30, -105.5), S(10, -105.5), S(-10, -105.5), S(-24, -105.5), S(-24, -100), S(-30, -97), S(-24, -105.5), S(20, -105.5)];
routes['glinka-steps'] = [S(-26.6, -91), S(-26.6, -97), S(-26.6, -100.5), S(-26.6, -97), S(-26.6, -91)];
if (args.list) { console.log(Object.keys(routes).join('\n')); process.exit(0); }

// ---------------------------------------------------------------------------------------------- browser
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data); });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=640,360'], defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 }, protocolTimeout: 600000 });
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
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const q = new URLSearchParams({ only: 'environment,streets,city,landmarksMariinsky', shot: '1', w: '640', h: '360', t: '5', q: 'low', cam: '-3060,700,0,2', 'tr': 'nopark,nomove', people: 'off', wl: 'nobirds' });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction('window.__ready === true', { timeout: 600000, polling: 250 });

  // helper installed in the page
  await page.evaluate(() => {
    window.__walk = (name, pts, opt = {}) => {
      const ctx = window.__ctx, P = ctx.playerObj, ph = ctx.physics, Lh = ctx.L; P.enabled = true; P.inputLock = 0;
      const res = { name, reached: 0, total: pts.length, stuck: null, fell: null, rescues: 0, maxY: -1e9, minY: 1e9, dist: 0, trace: [] };
      P.onRescue = () => { res.rescues++; };
      const dx0 = pts[1][0] - pts[0][0], dz0 = pts[1][1] - pts[0][1];
      if (opt.startY) window.__setCam(pts[0][0], opt.startY, pts[0][1], Math.atan2(-dx0, -dz0) * 180 / Math.PI, 0, true); else window.__setCam(pts[0][0], null, pts[0][1], Math.atan2(-dx0, -dz0) * 180 / Math.PI, 0);
      P.keys.clear(); P.keys.add('KeyW'); if (opt.run !== false) P.keys.add('ShiftLeft');
      const dt = 1 / 60;
      res.blocked = [];
      const probe = (x, z, ang, len) => { const q = { x, z }; const ux = -Math.sin(ang), uz = -Math.cos(ang); let ok = true; for (let i = 1; i <= len / 0.1; i++) { const tx = x + ux * i * 0.1, tz = z + uz * i * 0.1; q.x = tx; q.z = tz; ph.resolve(q, 0.3, P.pos.y, 1.7); if (Math.hypot(q.x - tx, q.z - tz) > 0.1) { ok = false; break; } const S = ph.surfaceAt(q.x, q.z, P.pos.y, true, {}); if (S.y - P.pos.y > 0.46) { ok = false; break; } } return ok; };
      let abort = false;
      for (let k = 1; k < pts.length && !abort; k++) {
        const tx = pts[k][0], tz = pts[k][1]; let still = 0, last = [P.pos.x, P.pos.z], frames = 0, hopT = 0, aim = null, aimT = 0, sgn = 1;
        const maxFrames = Math.ceil(Math.hypot(tx - P.pos.x, tz - P.pos.z) / 2.5 * 60) + 900;
        let done = false;
        while (frames++ < maxFrames) {
          const dx = tx - P.pos.x, dz = tz - P.pos.z, d = Math.hypot(dx, dz); if (d < 1.5) { res.reached = k; done = true; break; }
          let ax = tx, az = tz; if (aim && aimT > 0) { ax = aim[0]; az = aim[1]; aimT--; }
          P.yaw = Math.atan2(-(ax - P.pos.x), -(az - P.pos.z)); P.turn.yaw = 0;
          P.keys.delete('Space'); if (hopT > 0) { P.keys.add('Space'); hopT--; }
          P.update(dt);
          if (opt.trace && frames % 20 === 0) (res.t2 ||= []).push([k, +P.pos.x.toFixed(1), +P.pos.y.toFixed(2), +P.pos.z.toFixed(1)]);
          const y = P.pos.y; res.maxY = Math.max(res.maxY, y); res.minY = Math.min(res.minY, y);
          const hg = Lh.heightAt(P.pos.x, P.pos.z);
          const nearEntrance = y < -0.8 && ((ctx.services.metro || {}).entrances || []).some((e) => Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 14);
          if (nearEntrance && !res.entered) { res.entered = [+P.pos.x.toFixed(1), +y.toFixed(1), +P.pos.z.toFixed(1)]; window.__setCam(tx, null, tz, 0, 0); P.keys.add('KeyW'); if (opt.run !== false) P.keys.add('ShiftLeft'); continue; }
          if (!res.fell && y < hg - 1.2 && y < -0.8 && opt.noFall !== true && !nearEntrance) { res.fell = [+P.pos.x.toFixed(1), +y.toFixed(2), +P.pos.z.toFixed(1), hg]; if (opt.stopOnFall !== false) { abort = true; break; } }
          if (frames % 30 === 0) {
            const mv = Math.hypot(P.pos.x - last[0], P.pos.z - last[1]); last = [P.pos.x, P.pos.z];
            if (mv < 0.5) {
              still++;
              const fx = tx - P.pos.x, fz = tz - P.pos.z, fl = Math.hypot(fx, fz) || 1, px = -fz / fl, pz = fx / fl;
              if (still === 2 || still === 5 || still === 7) {
                // bug-algorithm step: of 24 headings with a free 2.5 m probe take the one closest to the goal direction (not straight back) and head 6 m that way
                const g = Math.atan2(-(tx - P.pos.x), -(tz - P.pos.z)); let best = null;
                for (let a = 0; a < 24; a++) { const ang = g + (a * 15 - 180 + 7.5) * Math.PI / 180; let dd = Math.abs(((ang - g + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (dd > 2.6) continue; if (best && dd >= best.dd - 1e-6) continue; if (probe(P.pos.x, P.pos.z, ang, 2.5)) best = { ang, dd }; }
                if (best) { aim = [P.pos.x - Math.sin(best.ang) * 6, P.pos.z - Math.cos(best.ang) * 6]; aimT = 70 + still * 10; }
              }
              if (still === 8) hopT = 14;
              if (still >= 10) break;
            } else still = Math.max(0, still - 1);
          }
        }
        if (abort) break;
        if (!done && ((ctx.services.metro || {}).entrances || []).some((e) => Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 16)) { (res.pitBypass ||= []).push([+P.pos.x.toFixed(0), +P.pos.z.toFixed(0)]); window.__setCam(tx, null, tz, 0, 0); P.keys.add('KeyW'); if (opt.run !== false) P.keys.add('ShiftLeft'); done = true; res.reached = k; }
        if (!done) { res.blocked.push({ leg: k, at: [+P.pos.x.toFixed(1), +P.pos.y.toFixed(2), +P.pos.z.toFixed(1)], target: [+tx.toFixed(1), +tz.toFixed(1)], dist: +Math.hypot(tx - P.pos.x, tz - P.pos.z).toFixed(1) }); if (res.blocked.length >= 3) { res.stuck = res.blocked[res.blocked.length - 1]; break; } }
        if (k % 4 === 0) res.trace.push([+P.pos.x.toFixed(0), +P.pos.y.toFixed(1), +P.pos.z.toFixed(0)]);
      }
      P.keys.clear();
      return res;
    };
    // city wall coverage: a drawn wall record of the city module (facade piece, firewall piece or gate) within 0.45 m of the footprint edge point and facing out of it
    window.__cover = (mx, mz, inx, inz) => {
      if (!window.__wallIdx) { const g = new Map(), C = 24; for (const w of window.__ctx.services.city.walls) { const x0 = Math.min(w.a[0], w.b[0]), x1 = Math.max(w.a[0], w.b[0]), z0 = Math.min(w.a[1], w.b[1]), z1 = Math.max(w.a[1], w.b[1]); for (let i = Math.floor((x0 - 1) / C); i <= Math.floor((x1 + 1) / C); i++) for (let j = Math.floor((z0 - 1) / C); j <= Math.floor((z1 + 1) / C); j++) { const k = i + ',' + j; let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(w); } } window.__wallIdx = { g, C }; }
      const { g, C } = window.__wallIdx, a = g.get(Math.floor(mx / C) + ',' + Math.floor(mz / C)) || [];
      for (const w of a) { const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], l2 = dx * dx + dz * dz || 1; let t = ((mx - w.a[0]) * dx + (mz - w.a[1]) * dz) / l2; if (t < -0.02 || t > 1.02) continue; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(mx - w.a[0] - dx * t, mz - w.a[1] - dz * t); if (d < 0.45 && (w.nx * inx + w.nz * inz) < -0.5) return 1; }
      return 0;
    };
    // visual wall holes (slow ray version, unused): a horizontal ray from the street side toward the facade at two heights must hit drawn geometry within 5 m
    window.__ray = (x, z, nx, nz, y) => {
      const T = window.THREE, ctx = window.__ctx, ray = new T.Raycaster(new T.Vector3(x, y, z), new T.Vector3(nx, 0, nz), 0, 7); ray.layers.mask = 0xffffffff;
      const hits = ray.intersectObjects([ctx.staticRoot], true).filter((h) => h.object.visible);
      return hits.length ? hits[0].distance : -1;
    };
    // a wall hole sweep: from the outside of a building edge push 5 m inward
    window.__push = (x, z, nx, nz, depth = 5) => {
      const ctx = window.__ctx, P = ctx.playerObj, Lh = ctx.L; P.enabled = true;
      window.__setCam(x, null, z, Math.atan2(-nx, -nz) * 180 / Math.PI, 0);   // look along the inward normal (nx, nz)
      P.keys.clear(); P.keys.add('KeyW');
      const sx = P.pos.x, sz = P.pos.z, y0 = P.pos.y;
      for (let f = 0; f < 60 * (depth / 3.6 + 1.2); f++) { P.yaw = Math.atan2(-nx, -nz); P.turn.yaw = 0; P.update(1 / 60); }
      P.keys.clear();
      return { x: P.pos.x, z: P.pos.z, y: P.pos.y, moved: Math.hypot(P.pos.x - sx, P.pos.z - sz), y0, inside: Lh.insideBuilding(P.pos.x, P.pos.z, 0) };
    };
  });

  const wanted = args.only ? new Set(args.only.split(',')) : null;
  const svc = {};
  const results = [];
  if (!args.walls) {
    for (const [name, pts0] of Object.entries(routes)) {
      if (wanted && !wanted.has(name)) continue;
      let pts = pts0, startY = null; if (pts0 && pts0.pts) { pts = pts0.pts; startY = pts0.startY; }
      if (pts === 'ADMIRALTY') {
        // central arch: perpendicular to the south front through the tower (the Admiralty front faces the Neva-side garden to the south-west; the axis is along Nevsky's end): use the service data
        const H = await import(pathToFileURL(path.join(root, 'src/world/landmarksH/frame.js')).href);
        pts = [H.W(0, -45), H.W(0, -20), H.W(0, 0), H.W(0, 20), H.W(0, 40), H.W(0, 20), H.W(0, -20), H.W(0, -45)];
      } else if (pts === 'WINTER') {
        // use the gateway centres of the Palace Square front: find them by probing the front line (three arches): reuse the courtyard polygon centre as the target
        const court = (await page.evaluate(() => window.__ctx.services.landmarksI.courtyard));
        const cx = court.reduce((s, p) => s + p[0], 0) / court.length, cz = court.reduce((s, p) => s + p[1], 0) / court.length;
        pts = [[-2076, -790], [-2090, -830], [cx, cz]];
      }
      const r = await page.evaluate((n, p, o) => window.__walk(n, p, o), name, pts, { startY, noFall: startY !== null, trace: !!args.trace });
      results.push(r); if (args.trace && r.t2) console.log(r.t2.map((q) => q.join(',')).join(' | '));
      const flag = r.stuck || r.fell || r.rescues || r.blocked.length ? 'FAIL' : 'ok  ';
      console.log(`${flag} ${name}: reached ${r.reached}/${r.total - 1} legs, y ${r.minY.toFixed(1)}..${r.maxY.toFixed(1)}` + (r.blocked.length ? ` BLOCKED ${JSON.stringify(r.blocked)}` : '') + (r.fell ? ` FELL ${JSON.stringify(r.fell)}` : '') + (r.pitBypass ? ` (blocked by a metro pit parapet at ${JSON.stringify(r.pitBypass)}: teleported past)` : '') + (r.entered ? ` (walked into a metro entrance at ${JSON.stringify(r.entered)}, skipped)` : '') + (r.rescues ? ` rescues ${r.rescues}` : ''));
      if (r.stuck || r.fell || r.rescues || r.blocked.length) failed = true;
    }
  } else {
    const step = Number(args.step || 25), holes = [];
    let rings = 0;
    for (const fp of L.groundFootprints()) {
      const pts = flat(fp.o); if (pts.length < 3) continue; rings++;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cz = pts.reduce((s, p) => s + p[1], 0) / pts.length; if (!(cx > -840 && cx < -620 && cz > -960 && cz < -600)) continue;   // the castle area only
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dz = q[1] - p[1], len = Math.hypot(dx, dz); if (len < 6) continue;
        for (let s = len * 0.3; s < len - 1; s += Math.max(step, len / 2)) {
          const mx = p[0] + dx / len * s, mz = p[1] + dz / len * s;
          let ox = dz / len, oz = -dx / len;
          if (L.insideBuilding(mx + ox * 0.6, mz + oz * 0.6, 0)) { ox = -ox; oz = -oz; if (L.insideBuilding(mx + ox * 0.6, mz + oz * 0.6, 0)) continue; }
          const sx = mx + ox * 1.5, sz = mz + oz * 1.5; if (L.insideBuilding(sx, sz, 0.4) || !L.inPlay(sx, sz, -2) || L.inRiver(sx, sz)) continue;
          holes.push([0, sx, sz, -ox, -oz, L.buildingAt(mx - ox * 0.6, mz - oz * 0.6)?.id || '?']);
        }
      }
    }
    console.log(`sweep points: ${holes.length} (buildings with rings: ${rings})`);
    const bad = [], visual = [], roofless = [];
    const BATCH = 200;
    for (let i = 0; i < holes.length; i += BATCH) {
      const part = await page.evaluate((arr) => arr.map(([k, x, z, nx, nz, id]) => { const cov = window.__cover(x + nx * 1.5, z + nz * 1.5, nx, nz); const r = window.__push(x, z, nx, nz, 5); return [id, x, z, r.moved, r.inside, r.y - r.y0, cov, 0]; }), holes.slice(i, i + BATCH));
      for (const r of part) { if (r[4]) bad.push(r); if (r[6] === 0) visual.push(r); }
    }
    console.log(`city wall holes (no wall record of the city module on the footprint edge; landmark buildings are skipped): ${visual.filter((r) => !L.claimedBy(r[0])).length}`);
    for (const r of visual.filter((r) => !L.claimedBy(r[0])).slice(0, 150)) console.log(`   HOLE ${r[0]} from (${r[1].toFixed(1)}, ${r[2].toFixed(1)})  walk-through=${r[4]}`);
    fs.writeFileSync(path.join(root, 'shots', 'qa-visual.json'), JSON.stringify(visual));
    console.log(`walked into the wall from ${holes.length} points: ${bad.length} ended INSIDE a footprint`);
    const byB = new Map(); for (const r of bad) { const a = byB.get(r[0]) || []; a.push(r); byB.set(r[0], a); }
    for (const [id, a] of [...byB.entries()].sort((x, y) => y[1].length - x[1].length).slice(0, 60)) console.log(`  ${id} (${L.claimedBy(id) || 'city'}): ${a.length} hits, e.g. from (${a[0][1].toFixed(1)}, ${a[0][2].toFixed(1)}) moved ${a[0][3].toFixed(1)} m`);
    fs.writeFileSync(path.join(root, 'shots', 'qa-walls.json'), JSON.stringify(bad));
  }
} catch (e) { console.log('QA WALK FAILED:', e.stack || e.message); failed = true; }
finally { console.log(failed ? 'RESULT: FAIL' : 'RESULT: OK'); await browser.close(); server.close(); process.exit(failed ? 1 : 0); }
