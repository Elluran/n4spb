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
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksF/frame.js')).href);
const FI = await import(pathToFileURL(path.join(root, 'src/world/landmarksI/frame.js')).href);
const FJ = await import(pathToFileURL(path.join(root, 'src/world/landmarksJ/frame.js')).href);

// ---------------------------------------------------------------------------------------------- routes
const routes = {};
const ext = (pts, a, b) => {                                              // extend a polyline by a m before the start and b m after the end
  const p = pts.map((q) => q.slice()), d0 = [p[0][0] - p[1][0], p[0][1] - p[1][1]], l0 = Math.hypot(...d0) || 1, n = p.length, d1 = [p[n - 1][0] - p[n - 2][0], p[n - 1][1] - p[n - 2][1]], l1 = Math.hypot(...d1) || 1;
  return [[p[0][0] + d0[0] / l0 * a, p[0][1] + d0[1] / l0 * a], ...p, [p[n - 1][0] + d1[0] / l1 * b, p[n - 1][1] + d1[1] / l1 * b]];
};
const flat = (a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; };
// Nevsky both pavements, west part (x -600 .. -2200)
{
  const pts = []; for (const r of D.ROADS.filter((r) => /Невск/.test(r.name || ''))) for (const q of flat(r.pts)) pts.push(q);
  const zAt = (x) => { const c = pts.map((p) => [Math.abs(p[0] - x), p[1]]).sort((a, b) => a[0] - b[0]).slice(0, 6); return c.reduce((s, q) => s + q[1], 0) / c.length; };
  for (const [nm, off] of [['nevsky-south-pavement', 8], ['nevsky-north-pavement', -8]]) {
    const w = []; for (let x = -610; x >= -2190; x -= 40) { const z0 = zAt(x), sg = Math.sign(off); let pt = null; for (let o = 7; o <= 20 && !pt; o += 0.5) { const z = z0 + sg * o; if (!L.insideBuilding(x, z, 1.2) && !L.isOnRoad(x, z, 0.3) && !L.inRiver(x, z)) pt = [x, z]; } if (pt) w.push(pt); }
    routes[nm] = w;
  }
}
// Kazan Cathedral: in through the west door, to the dome, out again
{ const W = (a, b) => { const p = F.W(a, b); return [p.x, p.z]; }; routes['kazan-in-out'] = [W(-75, 72.9), W(-41, 72.9), W(-20, 72.9), W(0, 72.9), W(14, 72.9), W(0, 72.9), W(-41, 72.9), W(-75, 72.9)]; }
// General Staff arch (Palace Square -> Bolshaya Morskaya) both ways
{ const a = [-1911.4, -641.7], b = [-1863, -578], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l;
  const FG = await import(pathToFileURL(path.join(root, 'src/world/landmarksG/frame.js')).href), gw = (u, v) => FG.toWorld(u, v);   // the exit of the arch leans towards +v: Bolshaya Morskaya bends away from the axis (cells of the footprint map: u 198 free for v >= -2, u 210 for v >= 8)
  routes['generalstaff-arch'] = [[a[0] - ux * 25, a[1] - uz * 25], a, gw(160, -1.3), gw(188, 1), gw(200, 5), gw(188, 1), gw(160, -1.3), a, [a[0] - ux * 25, a[1] - uz * 25]]; }
// Gostiny Dvor arcade gallery (north side along Nevsky) and the Perinnaya-side gallery
routes['gostiny-gallery'] = [[-985, -186], [-994.1, -188.8], [-1060, -205], [-1130.1, -222.1], [-1060, -205], [-994.1, -188.8]];
// the two metro doors in the back wall of the Gostiny Dvor arcade: from the street through the gallery, the opening and 12 m into the ticket hall, and back
for (const [id, x, z, rot] of [['gostiny-in', -976.4, -182.6, Math.atan2(0.2379, -0.9713)], ['gostiny-out', -982.7, -184.1, Math.atan2(0.2379, -0.9713)]]) { const nx = Math.sin(rot), nz = Math.cos(rot); routes['metro-door-' + id] = [[x + nx * 7, z + nz * 7], [x + nx * 3, z + nz * 3], [x, z], [x - nx * 3, z - nz * 3], [x - nx * 9, z - nz * 9], [x, z], [x + nx * 7, z + nz * 7]]; }
// Admiralty arch (tower at -2387,-565): the main axis is perpendicular to the south facade; try the frame of the module
routes['admiralty-arch'] = 'ADMIRALTY';
// Winter Palace gateways: three arches on the Palace Square front; the passage axis is perpendicular to the front (from the square into the Great Courtyard)
routes['winter-palace-axis'] = [-30, -60, -85, -100, -115, -140, -170, -205, -170, -140, -100, -60, -30].map((u) => FI.toWorld(u, 0));
routes['winter-palace-left-gate'] = [-30, -70, -100, -115, -140, -170, -200].map((u) => FI.toWorld(u, 9));
routes['winter-palace-right-gate'] = [-30, -70, -100, -115, -140, -170, -200].map((u) => FI.toWorld(u, -9));
// St Isaac's colonnade deck: after the [E] climb the walker stands on the 44.6 m deck; walk the ring R 18 once round
{ const d = FJ.W(13.5, 13.5), ring = []; for (let k = 0; k <= 26; k++) { const a = (k / 24) * Math.PI * 2 + Math.atan2(13.5, 13.5); const q = FJ.W(18.2 * Math.sin(a), 18.2 * Math.cos(a)); ring.push([q.x, q.z]); } routes['isaac-deck-ring'] = { pts: [[d.x, d.z], ...ring], startY: 45.6 }; }
// bridges: along the bridge axis of bridges/sites.js (u = (sin b, -cos b)), 30 m of approach on each side, on the centre line and on both footways (v offsets)
{
  const { SITES } = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href);
  for (const st of SITES) {
    if (st.id === 'palace') continue;
    const b = st.b * Math.PI / 180, ux = Math.sin(b), uz = -Math.cos(b), vx = -uz, vz = ux, half = st.kind === 'foot' ? 0 : Math.min(st.v1, -st.v0) - 2.0;
    const offs = st.kind === 'foot' ? [0] : [0, -half, half];
    for (const o of offs) { const pts = []; if (o !== 0) { /* footway offset: stay on the pavement part of the deck */ } for (const k of (st.kind === 'foot' ? [-13, -8, -3, 0, 3, 8, 13, 8, 0, -8, -13] : [-34, -20, -8, 0, 8, 20, 34, 20, 0, -20, -34])) { const q = [st.cx + ux * k + vx * o, st.cz + uz * k + vz * o]; if (Math.abs(k) > 10 && (L.insideBuilding(q[0], q[1], 0.6) || L.inRiver(q[0], q[1]) || !L.inPlay(q[0], q[1], -1))) continue; pts.push(q); } routes['bridge-' + st.id + (o === 0 ? '' : o < 0 ? '-left' : '-right')] = pts; }
  }
}

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
  const q = new URLSearchParams({ shot: '1', w: '640', h: '360', t: '5', q: 'low', cam: '-1493,-90,0,2', 'tr': 'nopark,nomove', people: 'off', wl: 'nobirds' });
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
          const nearEntrance = y < -0.8 && (ctx.services.metro.entrances || []).some((e) => Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 14);
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
        if (!done && (ctx.services.metro.entrances || []).some((e) => Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 16)) { (res.pitBypass ||= []).push([+P.pos.x.toFixed(0), +P.pos.z.toFixed(0)]); window.__setCam(tx, null, tz, 0, 0); P.keys.add('KeyW'); if (opt.run !== false) P.keys.add('ShiftLeft'); done = true; res.reached = k; }
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
  const svc = await page.evaluate(() => { const s = window.__ctx.services; return { tower: s.landmarksH.tower }; });
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
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length; if (cx > -600) continue;                 // west only
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
