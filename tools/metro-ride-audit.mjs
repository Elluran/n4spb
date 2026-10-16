// Metro ride audit: regression checks of the train rides in the real renderer (headless Edge / Chrome with GPU, puppeteer-core, ?only=metro). docs/UNDERGROUND.md sections 5-6, src/world/metro/ride.js.
//   node tools/metro-ride-audit.mjs [--only a,b,c] [--out shots/metro/audit] [--q medium] [--rides 1,2,3,4,5,6] [--dests 3] [--every 2] [--look fwd|board] [--no-shim]
//   A  route geometry, no rendering: every built station x track x the next --dests destinations -> ride.makeRoute(). The rider's (middle) car is sampled every 2 m of the train centre: metres "in rock"
//      (> 4 m from the origin / destination hall box (|x| <= WALL or TRK + 4, |z| <= PZ + 0.6 + 46: the 6 m visible stub + 40 m behind its disc, |y - any floor| <= 8), every real tube (debug.tubes), every stub
//      (debug.stubs + the 40 m tube behind its disc) and the generic tunnel axis). Routes: makeRoute(fromRt, fromDef, tk, toDef, destRt, destTk) with env.resolve(def, tk, { show: false }) (the audit never
//      re-labels the generic hall). The ride timeline at 60 Hz drives route.profile(u) directly (u = time since the departure, T_run = the real hop time): the largest yaw step between two frames
//      (teleports excluded and counted) and the black disc planes the rider's eye crosses; a disc counts as DRAWN when it is still drawn after env.onRideStart(route, S) on a stand-in session (merged
//      discs and discs known only from their path can never be hidden). FAIL: rock > 0 m, yaw step > 1.5 deg, a drawn disc crossed.
//   B  six live rides through the chain-of-legs API: ride.board(rt, tk) (no destination panel: the train runs along the line and stops everywhere; leg 0 = to the first stop, which is the ride's
//      destination). Screenshots from the rider every --every s and just before every disc crossing, a see-through probe at 25 / 50 / 75 % of the run (the ride train hidden: the picture must change);
//      overlap: while the ride train stands at the stop, its track (legs[k].destTk) must be HELD (override) with the scheduled train hidden; alight() at phase 'open'.
//      FAIL: near-black (luma < 12) > 35 % or mean luma < 25, see-through change < 6 % (pixels > 40 luma), car wall not drawn (--look fwd: < 3 % of an edge band changes by > 4 luma), overlap, not boarded / not arrived within 320 s / not off.
//   C  static, after the load: black discs that survived the static batching (a ride hides the discs of its own track with `visible`; a merged disc has no parent and cannot be hidden), discs off every tube axis
//      (warning), the generic hall name boards after showGeneric(Sennaya).
// The real-time clock is frozen (ctx.travelPending): only the tool advances the simulation, so a screenshot shows exactly the simulated moment. Screenshots + summary.json land in --out (a folder).
// API SHIMS: when the API is not exposed yet, the tool's own HTTP server patches two sources IN MEMORY (never on disk): ctx.metro.discs (= X.discs, src/world/metro.js) and boards / bands in the
// return value of buildGenericHall (src/world/metro/hall-generic.js). --no-shim serves the files unchanged; the checks then say what they could not see. Exit code 1 on any failed check.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2); args[k] = process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[++i] : '1'; } }
const outDir = path.resolve(root, args.out || 'shots/metro/audit');
fs.mkdirSync(outDir, { recursive: true });
const ONLY = new Set(String(args.only || 'a,b,c').toUpperCase().split(',').map((s) => s.trim()));
const DESTS = Number(args.dests || 3), EVERY = Math.max(0.5, Number(args.every || 2)), LOOK = args.look || 'fwd';
const K = { ROCK: 4, HALL_EXT: 46, HALL_DY: 8, YAW: 1.5, DISC_R: 2.78, STUB_EXT: 40, EYE: 1.6, NB_LUMA: 12, NEAR_BLACK: 0.35, MEAN: 25, DIFF_LUMA: 40, SEE: 0.06, WALL_BAND: 0.12, WALL_ROWS: [0.25, 0.75], WALL_LUMA: 4, WALL_MIN: 0.03 };
const RIDE_SEL = args.rides ? new Set(args.rides.split(',').map(Number)) : null;
const RIDES = [
  { n: 1, from: 'vosstaniya', to: 'vladimirskaya', what: 'S track, real tunnel' },
  { n: 2, from: 'gostiny', to: 'mayakovskaya', what: 'real tunnel' },
  { n: 3, from: 'admiralteyskaya', to: 'sportivnaya', what: 'real tunnel L5' },
  { n: 4, from: 'mayakovskaya', to: 'pan1', what: 'generic hall' },
  { n: 5, from: 'vosstaniya', to: 'chernyshevskaya', what: 'N track, generic through the north end' },
  { n: 6, from: 'gorny', to: 'spasskaya', what: 'partial real tunnel -> generic' },
].filter((r) => !RIDE_SEL || RIDE_SEL.has(r.n));

// ---------------------------------------------------------------- HTTP server (+ the in-memory API shims)
const SHIMS = args['no-shim'] ? [] : [
  { url: '/src/world/metro.js', done: /ctx\.metro = \{[^}]*\bdiscs\b/, from: 'ctx.metro = { debug,', to: 'ctx.metro = { discs, debug,', api: 'ctx.metro.discs = X.discs (src/world/metro.js, the ctx.metro export)' },
  { url: '/src/world/metro/hall-generic.js', done: /\bboards\s*:/, from: 'show, mouthZ: PZ + 0.6 }', to: 'show, mouthZ: PZ + 0.6, boards: boardMeshes, bands: bandMeshes }', api: 'buildGenericHall() returns { boards, bands } (src/world/metro/hall-generic.js)' },
];
const shimState = {};
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    const sh = SHIMS.find((s) => s.url === p);
    if (sh) {
      const src = data.toString('utf8');
      if (sh.done.test(src)) shimState[sh.api] = 'exposed by the source (no shim)';
      else if (src.includes(sh.from)) { data = Buffer.from(src.replace(sh.from, sh.to)); shimState[sh.api] = 'SHIMMED in memory (not exposed by the source yet)'; }
      else shimState[sh.api] = 'not exposed, shim anchor not found (skipped)';
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(data);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const browser = await puppeteer.launch({ executablePath: exe, headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--disable-gpu-sandbox', '--no-first-run', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 }, protocolTimeout: 300000 });
const problems = [], warns = [], logs = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { problems.push(msg); console.log('  FAIL', msg); } return !!cond; };
const warn = (msg) => { warns.push(msg); console.log('  WARN', msg); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const summary = { shims: shimState, todo: [], A: null, B: [], C: null };

// ---------------------------------------------------------------- in-page library (window.__ra); K = the thresholds
const PAGE_LIB = (K) => {
  const C = () => window.__ctx, P = () => window.__ctx.playerObj, V3 = window.THREE.Vector3;
  const RA = window.__ra = { ovl: [], ovlStand: 0, ovlRun: 0 };
  RA.step = (dt) => { const p = P(); p.keys = new Set(); window.__advance(dt); C().physics.refreshDynamic(); p.update(dt); window.__zones.update(dt); C().interact.update(); };
  window.__ff = (sec, dt = 1 / 30, keys = null, stop = null) => { for (let t = 0; t < sec; t += dt) { RA.step(dt); RA.watch(); if (stop && stop(P(), t)) return true; } return false; };
  RA.carOff = (st, i) => (i - (st.cars - 1) / 2) * (st.len + 0.45);
  RA.attached = (o) => { let p = o; while (p.parent) p = p.parent; return !!p.isScene; };
  RA.shownChain = (o) => { for (let p = o; p; p = p.parent) if (!p.visible && !p.userData._zh) return false; return true; };            // (_zh: hidden by the street / underground switch: drawn while riding)
  RA.wp = (o) => { if (RA.attached(o)) o.updateWorldMatrix(true, false); return { c: new V3().setFromMatrixPosition(o.matrixWorld), n: new V3(0, 0, 1).transformDirection(o.matrixWorld) }; };   // (a merged mesh keeps its last matrixWorld)
  // ---- the allowed geometry: polylines at car-floor level (rail foot + 1.1) in a 16 m grid
  RA.geom = () => {
    if (RA._g) return RA._g;
    const m = C().metro, G = m.genericTunnel, lines = [], todo = [];
    for (const p of m.debug.tubes || []) lines.push(['tube', p.map((q) => [q[0], q[1] + 1.1, q[2]])]);
    if (!m.debug.stubs) todo.push('ctx.metro.debug.stubs (STUB_PATHS) is missing: the stubs are not part of the allowed geometry');
    for (const p of m.debug.stubs || []) { const a = p[p.length - 2], b = p[p.length - 1], l = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1; lines.push(['stub', [...p, [b[0] + (b[0] - a[0]) / l * K.STUB_EXT, b[1], b[2] + (b[2] - a[2]) / l * K.STUB_EXT]].map((q) => [q[0], q[1] + 1.1, q[2]])]); }
    if (G) lines.push(['generic', [[G.x0, G.y, G.z0], [G.x0 + (G.length || 800), G.y, G.z0]]]); else todo.push('ctx.metro.genericTunnel is missing');
    const cell = 16, R = 6, grid = new Map();
    for (const [kind, pts] of lines) for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], sg = { kind, a, b };
      for (let ix = Math.floor((Math.min(a[0], b[0]) - R) / cell); ix <= Math.floor((Math.max(a[0], b[0]) + R) / cell); ix++) for (let iz = Math.floor((Math.min(a[2], b[2]) - R) / cell); iz <= Math.floor((Math.max(a[2], b[2]) + R) / cell); iz++) { const k = ix + ',' + iz; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(sg); }
    }
    return (RA._g = { grid, cell, todo });
  };
  const segDist = (x, y, z, a, b) => { const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], L2 = ux * ux + uy * uy + uz * uz || 1e-9, t = Math.max(0, Math.min(1, ((x - a[0]) * ux + (y - a[1]) * uy + (z - a[2]) * uz) / L2)); return Math.hypot(a[0] + ux * t - x, a[1] + uy * t - y, a[2] + uz * t - z); };
  RA.near = (x, y, z) => { const g = RA.geom(), list = g.grid.get(Math.floor(x / g.cell) + ',' + Math.floor(z / g.cell)); let d = Infinity, kind = null; for (const s of list || []) { const e = segDist(x, y, z, s.a, s.b); if (e < d) { d = e; kind = s.kind; } } return { d, kind }; };
  RA.inHall = (rt, p) => {                    // hall infos carry TRK (pylon 10, Gorny 10.8, GD 8.8, generic 5.9) but no WALL; two-level Sportivnaya: FY / trackFY / frame.yUpper
    if (!rt) return false; const [lx, lz] = rt.L(p.x, p.z), h = rt.hall, fys = [h.FY, rt.frame.y, rt.frame.yUpper, ...rt.platform.tracks.map((t) => t.fy)].filter(Number.isFinite);
    return Math.abs(lx) <= (h.WALL || (h.TRK ? h.TRK + 4 : 14)) && Math.abs(lz) <= h.PZ + 0.6 + K.HALL_EXT && fys.some((f) => Math.abs(p.y - f) <= K.HALL_DY);
  };
  // ---- every black disc: the registry ctx.metro.discs (stubs.js DISCS: mesh.userData.disc = { kind: stub | real | free, c, n }; an older source: X.discs = the real-tunnel discs only),
  // then the discs known from their paths (the end of every stub, the free end of a partial link) where no registered disc stands within 0.6 m, then any other disc mesh in the scene
  RA.discs = () => {
    if (RA._d) return RA._d;
    const m = C().metro, list = [], todo = [], xd = m.discs || m.debug.discs || null, add = (c, n, kind, mesh) => { const e = { c, n, kind, mesh: mesh || null }; list.push(e); return e; };
    const near = (c) => list.find((q) => q.c.distanceTo(c) < 0.6);
    if (!xd) todo.push('ctx.metro.discs is not exposed (the disc registry, src/world/metro.js): discs are seen only while they survive the batching');
    for (const d of xd || []) { const u = d.userData && d.userData.disc; if (u && u.c && u.n) add(new V3(...u.c), new V3(...u.n).normalize(), u.kind === 'free' ? 'free-end' : u.kind || 'real', d); else { const w = RA.wp(d); add(w.c, w.n, 'real', d); } }
    for (const p of m.debug.stubs || []) { const a = p[p.length - 2], b = p[p.length - 1], c = new V3(b[0], b[1] + 2.0, b[2]); if (!near(c)) add(c, new V3(a[0] - b[0], 0, a[2] - b[2]).normalize(), 'stub'); }
    for (const [key, L] of Object.entries(m.env.real || {})) if (L.partial) {
      const P_ = L.path; let acc = 0;
      for (let i = 1; i < P_.length; i++) { const a = P_[i - 1], b = P_[i], l = Math.hypot(b[0] - a[0], b[2] - a[2]); if (acc + l >= L.partial.discS) { const k = (L.partial.discS - acc) / (l || 1), c = new V3(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + 2.0, a[2] + (b[2] - a[2]) * k); if (!near(c)) add(c, new V3(a[0] - b[0], 0, a[2] - b[2]).normalize(), 'free-end:' + key); break; } acc += l; }
    }
    C().scene.traverse((o) => {
      if (!o.isMesh || !o.geometry || o.geometry.type !== 'CircleGeometry' || !(o.material === m.M.discBlack || (o.material && o.material.isMeshBasicMaterial && o.material.color.getHex() === 0))) return;
      if (list.some((q) => q.mesh === o)) return;
      const w = RA.wp(o), e = near(w.c); if (e) { if (!e.mesh) e.mesh = o; } else add(w.c, w.n, 'other', o);
    });
    for (const d of list) d.attached = !!(d.mesh && RA.attached(d.mesh));
    return (RA._d = { list, todo, realExposed: !!xd });
  };
  RA.dep = () => C().metro.ride.DEPART_T ?? 3.5;                                   // the train leaves DEPART_T after the doors start closing
  /** which discs are drawn during a ride of route R: [{ drawn, sHide }] (sHide: a dynamic disc of env.discState.dyn, drawn while the front of the rider's car + 1 m is short of it).
   *  live = a ride is running (read the state); else env.onRideStart(route, S) / onLegStart(leg, S) on a stand-in session, undone by onRideEnd() */
  RA.shown = (R, D, live) => {
    const env = C().metro.env, read = () => {
      const ds = env.discState, dyn = new Map(ds && ds.route === R ? (ds.dyn || []).map((q) => [q.mesh, q.sHide]) : []);
      return D.map((d) => ({ drawn: d.mesh && d.attached ? RA.shownChain(d.mesh) : true, sHide: d.mesh && dyn.has(d.mesh) ? dyn.get(d.mesh) : null }));
    };
    if (live) return read();
    const S = { car: R.rider ?? 0, legs: [{ route: R, tClose: 0, tDepart: RA.dep(), tArrive: RA.dep() + R.T_run, tk: R.tk, destTk: R.destTk, to: R.to, from: R.from, fromDef: R.fromDef, destRt: R.destRt, terminus: true }] };
    try { if (env.onRideStart) env.onRideStart(R, S); if (env.onLegStart) env.onLegStart(S.legs[0], S); return read(); }
    catch (e) { RA.hookErr = 'env.onRideStart / onLegStart failed on a stand-in session: ' + ((e && e.message) || e); return read(); } finally { if (env.onRideEnd) env.onRideEnd(); }
  };
  /** one route: in-rock metres (every 2 m of the train centre); the 60 Hz timeline from route.profile(u): yaw steps, teleports, disc crossings of the rider's eye (t = DEPART_T + u: since the doors started closing) */
  RA.route = (R, car, live) => {
    const off = RA.carOff(R.stock, car), r = { S_end: Math.round(R.S_end), T_run: +R.T_run.toFixed(1), real: !!R.real, partial: !!R.partial, rockM: 0, runs: [], worst: null, yawMax: 0, yawAt: null, jumps: 0, cross: [] };
    for (let sc = 0; sc <= R.S_end; sc += 2) {
      const p = R.pose(sc + off, sc); if (p.hidden || RA.inHall(R.from, p) || RA.inHall(R.destRt, p)) continue;
      const n = RA.near(p.x, p.y, p.z); if (!(n.d > K.ROCK)) continue;
      r.rockM += 2; const run = r.runs[r.runs.length - 1], at = Math.round(sc); if (run && at - run[1] <= 2) run[1] = at; else r.runs.push([at, at]);
      const dv = Number.isFinite(n.d) ? n.d : 1e9; if (!r.worst || dv > r.worst[5]) r.worst = [at, Number.isFinite(n.d) ? +n.d.toFixed(1) : '>6', +p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1), dv];
    }
    if (r.worst) r.worst.length = 5;
    const D = RA.discs().list, shown = RA.shown(R, D, live), dc = D.map((d) => [d.c.x, d.c.y, d.c.z, d.n.x, d.n.y, d.n.z]), dt = 1 / 60, dep = RA.dep();
    let prev = null;
    for (let u = 0; u <= R.T_run + dt; u += dt) {
      const q = R.profile(Math.min(u, R.T_run)), f = R.pose(q.s + off, q.s), e = [f.x, f.y + K.EYE, f.z], t = dep + u;
      if (prev) {
        if (Math.hypot(e[0] - prev.e[0], e[1] - prev.e[1], e[2] - prev.e[2]) > Math.max(1, 3 * Math.abs(q.s - prev.s) + 0.5)) r.jumps++;
        else {
          const dy = Math.abs(Math.atan2(Math.sin(f.yaw - prev.yaw), Math.cos(f.yaw - prev.yaw))) * 180 / Math.PI; if (dy > r.yawMax) { r.yawMax = dy; r.yawAt = Math.round(q.s); }
          for (let i = 0; i < dc.length; i++) {
            const d = dc[i]; if (Math.abs(e[0] - d[0]) > 40 || Math.abs(e[2] - d[2]) > 40) continue;
            const a = (prev.e[0] - d[0]) * d[3] + (prev.e[1] - d[1]) * d[4] + (prev.e[2] - d[2]) * d[5], b = (e[0] - d[0]) * d[3] + (e[1] - d[1]) * d[4] + (e[2] - d[2]) * d[5];
            if ((a > 0) === (b > 0) || a === b) continue;
            const k = a / (a - b), x = prev.e[0] + (e[0] - prev.e[0]) * k, y = prev.e[1] + (e[1] - prev.e[1]) * k, z = prev.e[2] + (e[2] - prev.e[2]) * k;
            if (Math.hypot(x - d[0], y - d[1], z - d[2]) > K.DISC_R) continue;
            const sh = shown[i], drawn = sh.sHide !== null ? q.s + off + R.stock.len / 2 + 1 < sh.sHide : sh.drawn;
            r.cross.push({ kind: D[i].kind, shown: drawn, dyn: sh.sHide !== null, s: Math.round(q.s), t: +(prev.t + dt * k).toFixed(3), v: +q.v.toFixed(1), at: [x, y, z].map((v) => +v.toFixed(1)) });
          }
        }
      }
      prev = { e, yaw: f.yaw, s: q.s, t };
    }
    r.yawMax = +r.yawMax.toFixed(2); return r;
  };
  RA.routes = (maxDest) => {
    const m = C().metro, net = m.env.net, out = [];
    for (const rt of Object.values(m.stations)) {
      if (rt.generic || rt.id === 'generic') continue;
      const fromDef = net.BY_ID[rt.def.id]; if (!fromDef) { out.push({ from: rt.id, err: 'no network entry' }); continue; }
      for (const tk of rt.platform.tracks) for (const dest of net.ahead(fromDef, tk.dir).slice(0, maxDest)) {
        const rec = { from: rt.id, key: tk.key, to: dest.id };
        try { const r = m.env.resolve(dest, tk, { show: false }), R = m.ride.makeRoute(rt, fromDef, tk, dest, r.destRt, r.destTk), car = R.rider ?? Math.floor(R.stock.cars / 2); Object.assign(rec, { dest: r.destRt.id, car }, RA.route(R, car, false)); }
        catch (e) { rec.err = String((e && e.message) || e); }
        out.push(rec);
      }
    }
    return { routes: out, todo: [...RA.geom().todo, ...RA.discs().todo, ...(RA.hookErr ? [RA.hookErr] : [])] };
  };
  // ---- C: static checks
  RA.boards = () => {
    const m = C().metro, def = m.env.net.BY_ID.sennaya, gh = m.stations.generic && m.stations.generic.gh; if (!def || !gh) return { err: !def ? 'no sennaya in the network' : 'no generic hall (stations.generic.gh)' };
    const before = m.stations.generic.def; m.showGeneric(def);
    const tex = C().tex.cache.get('nb-' + def.id); let live = 0;
    C().scene.traverse((o) => { if (o.isMesh && o.material && tex && o.material.map === tex) live++; });
    const r = { tex: !!tex, meshesWithTex: live, exposed: !!gh.boards };
    if (gh.boards) Object.assign(r, { boards: gh.boards.length, boardsAttached: gh.boards.filter(RA.attached).length, boardsOnTex: gh.boards.filter((b) => b.material.map === tex).length });
    if (gh.bands) Object.assign(r, { bands: gh.bands.length, bandsAttached: gh.bands.filter(RA.attached).length });
    m.showGeneric(before); return r;
  };
  RA.staticCheck = () => {
    const D = RA.discs(), kinds = {}, offAxis = [];
    for (const d of D.list) {
      const k = d.kind.split(':')[0], e = kinds[k] || (kinds[k] = { n: 0, live: 0 }); e.n++; if (d.attached) e.live++;
      const nr = RA.near(d.c.x, d.c.y - 0.9, d.c.z); if (nr.d > 1.0) offAxis.push({ kind: d.kind, at: [d.c.x, d.c.y, d.c.z].map((v) => +v.toFixed(1)), d: Number.isFinite(nr.d) ? +nr.d.toFixed(2) : '>6' });
    }
    return { kinds, offAxis, realExposed: D.realExposed, boards: RA.boards(), todo: [...D.todo, ...RA.geom().todo] };
  };
  // ---- B: live rides (chain of legs: ride.board(rt, tk) boards at once, the train leaves after the rest of the platform dwell, leg 0 ends at the first stop)
  RA.reset = () => {
    const m = C().metro, S = m.ride.session; try { if (C().ui.open) C().ui.close(); } catch (e) { /* no panel */ }
    if (S) { try { m.ride.alight(); } catch (e) { /* not standing */ } if (m.ride.session === S) m.ride.cancel(S); }
    if (P().riding) P().alight({}); RA.ovl = []; RA.ovlStand = RA.ovlRun = 0;
  };
  RA.prep = (fromId, toId) => {
    const m = C().metro, rt = m.stations[fromId], BY = m.env.net.BY_ID, to = BY[toId]; if (!rt || !to) return { err: 'no station ' + (!rt ? fromId : toId) };
    RA.reset();
    const from = BY[rt.def.id], tk = rt.platform.tracks.find((t) => t.dir === Math.sign(to.idx - from.idx)); if (!tk || from.line !== to.line) return { err: toId + ' is not on the line of ' + fromId };
    const st = tk.train.stock, mid = Math.floor(st.cars / 2), fy = tk.fy ?? rt.hall.FY, f = rt.frame, sx = -tk.dir, [x, z] = rt.W(sx * (rt.hall.EDGE - 0.9), tk.dir * RA.carOff(st, mid));
    window.__setCam(x, fy, z, 0, 0, true);                                            // on the platform at the middle car: ride.board() picks the nearest car
    const dx = Math.cos(f.yaw) * sx, dz = -Math.sin(f.yaw) * sx; P().yaw = Math.atan2(-dx, -dz);                       // look at the train
    window.__ff(250, 1 / 30, null, () => { const s = rt.platform.state(tk, C().time); return s.phase === 'dwell' && s.open > 0.95 && !tk.override; });
    const s = rt.platform.state(tk, C().time); return { key: tk.key, phase: s.phase, open: s.open, stock: st.id, mid, fy };
  };
  RA.board = (fromId, key) => {
    const m = C().metro, rt = m.stations[fromId], S = m.ride.board(rt, rt.platform.trackByKey(key)), L0 = S && S.legs && S.legs[0];
    return { riding: !!(S && P().riding), to: L0 ? L0.to.id : null, legs: S && S.legs ? S.legs.length : 0, wait: L0 ? +(L0.tClose - C().time).toFixed(1) : null, car: S ? S.car : null };
  };
  /** overlap: while the ride train stands at the stop of leg k (stopped / open), that stop's track legs[k].destTk must be HELD (override === true) and its scheduled train hidden;
   *  during the last 250 m of the approach a drawn scheduled train is only a warning */
  RA.watch = () => {
    const S = C().metro.ride.session; if (!S || !S.state || !(S.state.k >= 0)) return;
    const st = S.state, leg = S.legs[st.k], tk = leg.destTk, stand = st.phase === 'stopped' || st.phase === 'open', near = st.phase === 'running' && st.s > leg.route.S_end - 250;
    if (!stand && !near) return;
    const tr = tk.trains[tk.stock], drawn = !!(tr && tr !== S.train && tr.root.visible), held = tk.override === true;
    if (stand ? held && !drawn : !drawn) return;
    if (stand) RA.ovlStand++; else RA.ovlRun++;
    if (RA.ovl.length < 20) { const ps = leg.destRt.platform.state(tk, C().time); RA.ovl.push({ t: +C().time.toFixed(2), ride: st.phase, k: st.k, s: Math.round(st.s), held, drawn, sched: ps.phase, zc: +ps.zc.toFixed(1) }); }
  };
  RA.state = () => { const S = C().metro.ride.session, st = S && S.state; return { phase: st ? st.phase : 'none', k: st ? st.k : null, s: st ? Math.round(st.s) : null, t: C().time }; };
  RA.to = (t) => { let n = 0; while (C().time < t - 1e-6 && n++ < 20000) { RA.step(Math.min(1 / 30, t - C().time)); RA.watch(); } return RA.state(); };
  RA.until = (phase, max) => { for (let t = 0; t < max; t += 1 / 30) { const S = C().metro.ride.session; if (!S) break; if (S.state && S.state.phase === phase) break; RA.step(1 / 30); RA.watch(); } return RA.state(); };
  /** the screenshot plan of leg 0: ticks from now to the stop, the see-through moments, just before every disc crossing (tClose = the doors start closing, the train leaves DEPART_T later) */
  RA.plan = (every) => {
    const m = C().metro, S = m.ride.session, L0 = S.legs[0], R = L0.route, tc = L0.tClose, dep = RA.dep(), a = RA.route(R, S.car, true), end = tc + dep + R.T_run, t0 = C().time, ev = [];
    for (let t = t0 + every; t <= end + 3.5; t += every) ev.push({ t, tag: 'tick' });
    for (const f of [0.25, 0.5, 0.75]) ev.push({ t: tc + dep + f * R.T_run, tag: 'see' });
    for (const c of a.cross) ev.push({ t: tc + c.t - Math.min(1, 1.5 / Math.max(1, c.v)), tag: 'disc-' + c.kind.split(':')[0] + (c.shown ? '' : '-hidden') });
    ev.sort((p, q) => p.t - q.t); RA.ovl = []; RA.ovlStand = RA.ovlRun = 0;
    return { ev, t0, info: { car: S.car, dest: L0.destRt.id, wait: +(tc - t0).toFixed(1), real: !!R.real, partial: !!R.partial, S_end: a.S_end, T_run: a.T_run, rockM: a.rockM, yawMax: a.yawMax, jumps: a.jumps, cross: a.cross } };
  };
  RA.alight = () => {
    const m = C().metro, S = m.ride.session, st = S && S.state; if (!st) return { err: 'no session' };
    const leg = st.leg || S.legs[0], atStop = st.k >= 0 && st.phase !== 'closing', tk = atStop ? leg.destTk : leg.tk, rt = atStop ? leg.destRt : leg.from, fy = tk.fy ?? rt.hall.FY, phase = st.phase;
    m.ride.alight(); return { riding: P().riding, y: P().pos.y, fy, phase, ended: !m.ride.session };
  };
  // ---- pixels: luminance of a PNG (software canvas, like metro-test), near-black share, change against the last kept picture
  RA.dec = async (b64) => {
    const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob()), w = img.width, h = img.height, cv = new OffscreenCanvas(w, h), g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0); img.close(); const d = g.getImageData(0, 0, w, h).data, L = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) L[j] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    L.w = w; L.h = h; return L;
  };
  RA.px = async (b64, keep) => { const L = await RA.dec(b64); let s = 0, nb = 0, wh = 0; for (let i = 0; i < L.length; i++) { const l = L[i]; s += l; if (l < K.NB_LUMA) nb++; if (l > 240) wh++; } if (keep) RA.last = L; return { mean: s / L.length, nearBlack: nb / L.length, white: wh / L.length }; };
  /** the see-through probe against the last kept picture: all = share of the frame changed by > DIFF_LUMA; left / right = share of an edge band (outer WALL_BAND columns x WALL_ROWS) changed by > WALL_LUMA */
  RA.diff = async (b64) => {
    const L = await RA.dec(b64), A = RA.last; if (!A || A.length !== L.length) return null; let n = 0; for (let i = 0; i < L.length; i++) if (Math.abs(L[i] - A[i]) > K.DIFF_LUMA) n++;
    const w = L.w, h = L.h, bw = Math.round(w * K.WALL_BAND), y0 = Math.round(h * K.WALL_ROWS[0]), y1 = Math.round(h * K.WALL_ROWS[1]);
    const band = (x0, x1) => { let c = 0, m = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { m++; if (Math.abs(L[y * w + x] - A[y * w + x]) > K.WALL_LUMA) c++; } return c / m; };
    return { all: n / L.length, left: band(0, bw), right: band(w - bw, w) };
  };
};

let page;
const ev = (fn, ...a) => page.evaluate(fn, ...a);
const frames = (n = 2) => page.evaluate((k) => new Promise((r) => { const f = () => (--k <= 0 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
const shot = async (name, keep = false) => { const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(path.join(outDir, name + '.png'), Buffer.from(b64, 'base64')); return page.evaluate((b, k) => window.__ra.px(b, k), b64, keep); };
const lumOk = (s, what) => ok(s.nearBlack <= K.NEAR_BLACK && s.mean >= K.MEAN, `${what}: not black (mean ${s.mean.toFixed(0)}, near-black ${(s.nearBlack * 100).toFixed(1)} %)`);

/** B: one live ride */
async function rideProbe(R) {
  const tag = `r${R.n}_${R.from}-${R.to}`, out = { n: R.n, from: R.from, to: R.to, what: R.what, via: null, shots: [], see: [], overlap: [], overlapStand: 0, overlapRun: 0, fails: 0 }, f0 = problems.length;
  console.log(`   ride ${R.n}: ${R.from} -> ${R.to} (${R.what})`);
  const pr = await ev((a, b) => window.__ra.prep(a, b), R.from, R.to);
  if (!ok(!pr.err && pr.phase === 'dwell' && pr.open > 0.95, `B${R.n} ${R.from}: a train stands with open doors (${pr.err || pr.phase + ', open ' + pr.open.toFixed(2)})`)) return out;
  const bd = await ev((a, k) => window.__ra.board(a, k), R.from, pr.key); await sleep(300); out.via = 'ride.board()'; out.wait = bd.wait;
  if (!ok(bd.riding && bd.to === R.to, `B${R.n}: boarded with ride.board(), first stop ${R.to} (riding ${bd.riding}, first stop ${bd.to}, ${bd.legs} legs, leaves in ${bd.wait} s)`)) { await ev(() => window.__ra.reset()); return out; }
  if (LOOK === 'fwd') await ev(() => { const p = window.__ctx.playerObj; p.yaw = Math.PI; p.pitch = -0.06; });        // (lookRelative: yaw PI = along the car, toward the travel direction)
  const plan = await ev((e) => window.__ra.plan(e), EVERY); out.info = plan.info;
  let i = 0;
  for (const e of plan.ev) {
    const st = await ev((t) => window.__ra.to(t), e.t); await frames(2);
    const name = `${tag}_${String(i++).padStart(2, '0')}_${e.tag}`, s = await shot(name, e.tag === 'see');
    out.shots.push({ name, t: +(st.t - plan.t0).toFixed(2), phase: st.phase, s: st.s, mean: +s.mean.toFixed(1), nearBlack: +s.nearBlack.toFixed(3) });
    lumOk(s, `B${R.n} ${name} (${st.phase}, centre at ${st.s} m)`);
    if (e.tag === 'see') {
      await ev(() => { window.__ctx.metro.ride.session.train.root.visible = false; }); await frames(2);
      const b64 = await page.screenshot({ encoding: 'base64' }); fs.writeFileSync(path.join(outDir, name + '_hidden.png'), Buffer.from(b64, 'base64'));
      const d = await ev((b) => window.__ra.diff(b), b64); await ev(() => { const S = window.__ctx.metro.ride.session; if (S) S.train.root.visible = true; }); await frames(1);
      out.see.push(d === null ? null : { all: +d.all.toFixed(3), left: +d.left.toFixed(3), right: +d.right.toFixed(3) });
      ok(d !== null && d.all >= K.SEE, `B${R.n} ${name}: the car is drawn around the rider (${d === null ? 'no diff' : (d.all * 100).toFixed(1) + ' %'} of the pixels change by > ${K.DIFF_LUMA} luma when the ride train is hidden, min ${K.SEE * 100} %)`);
      if (d && LOOK === 'fwd') ok(Math.min(d.left, d.right) >= K.WALL_MIN, `B${R.n} ${name}: car wall drawn on both sides (edge bands change by > ${K.WALL_LUMA} luma on ${(d.left * 100).toFixed(1)} % left / ${(d.right * 100).toFixed(1)} % right, min ${K.WALL_MIN * 100} %${Math.min(d.left, d.right) < K.WALL_MIN ? ': car wall not drawn (clipped), the tunnel shows where the wall should be' : ''})`);
    }
  }
  const fin = await ev(() => window.__ra.until('open', 320));        // (the rest of the dwell <= 28 s + 3.5 s + a hop of up to 240 s + 3.5 s)
  ok(fin.phase === 'open', `B${R.n}: arrived at ${R.to} with open doors (${fin.phase})`);
  const ov = await ev(() => ({ list: window.__ra.ovl.slice(0, 5), stand: window.__ra.ovlStand, run: window.__ra.ovlRun })); Object.assign(out, { overlap: ov.list, overlapStand: ov.stand, overlapRun: ov.run });
  ok(ov.stand === 0, `B${R.n}: overlap: the stop's track is held (override) and its scheduled train hidden while the ride train stands there (${ov.stand} frames not${ov.stand ? ': ' + JSON.stringify(ov.list.filter((q) => q.ride !== 'running').slice(0, 3)) : ''})`);
  if (ov.run) warn(`B${R.n}: the destination track's scheduled train is drawn during the last 250 m of the approach (${ov.run} frames: ${JSON.stringify(ov.list.filter((q) => q.ride === 'running').slice(0, 2))})`);
  await frames(2); lumOk(await shot(`${tag}_arrival`), `B${R.n} arrival (inside the car)`);
  const al = await ev(() => window.__ra.alight());
  ok(!al.err && !al.riding && al.ended && Math.abs(al.y - al.fy) < 0.5, `B${R.n}: got off onto the platform at phase ${al.phase} (${al.err || 'y ' + al.y.toFixed(2) + ', floor ' + al.fy + ', session ended ' + al.ended})`);
  if (!al.err) { await frames(2); lumOk(await shot(`${tag}_platform`), `B${R.n} destination platform`); }
  out.fails = problems.length - f0;
  const means = out.shots.map((q) => q.mean), nbs = out.shots.map((q) => q.nearBlack);
  console.log(`   ride ${R.n}: via ${out.via} (left after ${out.wait} s), ${out.shots.length} shots, min mean ${Math.min(...means).toFixed(0)}, max near-black ${(Math.max(...nbs) * 100).toFixed(1)} %, see-through ${out.see.map((q) => (q ? `${(q.all * 100).toFixed(0)} % (walls ${(q.left * 100).toFixed(0)} / ${(q.right * 100).toFixed(0)} %)` : 'n/a')).join(', ')}, overlap frames ${out.overlapStand} standing / ${out.overlapRun} approaching, discs on the way ${(plan.info.cross || []).map((c) => c.kind + (c.shown ? '' : '(hidden)')).join(' ') || 'none'}`);
  return out;
}

try {
  page = await browser.newPage();
  const threeRoot = path.join(root, 'node_modules', 'three');
  if (fs.existsSync(threeRoot)) {
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const m = /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.+)$/.exec(req.url());
      if (m) { const f = path.join(threeRoot, m[1].split('?')[0]); if (fs.existsSync(f)) return req.respond({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Access-Control-Allow-Origin': '*' }, body: fs.readFileSync(f) }); }
      req.continue();
    });
  }
  page.on('console', (m) => { const t = m.type(); if (t === 'error' || t === 'warning') logs.push(`[console.${t}] ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  const q = new URLSearchParams({ q: args.q || 'medium', stats: '1', only: 'metro' });
  await page.goto(`http://127.0.0.1:${port}/index.html?${q}`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction("document.body.classList.contains('loaded')", { timeout: 280000, polling: 250 });
  for (const e of await ev(() => window.__errors || [])) problems.push(`[module ${e.module}] ${e.message.split('\n').slice(0, 4).join(' | ')}`);
  await page.click('#go'); await sleep(800);
  await ev(PAGE_LIB, K);
  await ev(() => { window.__ctx.travelPending = true; });                  // freeze the real-time clock (main.js frame(): dt = 0); the rider still follows its frame
  for (const [api, st] of Object.entries(shimState)) console.log(`   api: ${api}: ${st}`);

  // ---------------------------------------------------------------- C. static checks
  if (ONLY.has('C')) {
    console.log('C. static: black discs after the batching, discs off the tube axes, generic hall boards');
    const c = await ev(() => window.__ra.staticCheck()); summary.C = c; summary.todo.push(...c.todo);
    for (const [k, v] of Object.entries(c.kinds)) console.log(`   ${k} discs: ${v.n}, ${v.live} still in the scene, ${v.n - v.live} merged by the static batching (or known only from their path)`);
    const real = c.kinds.real || { n: 0, live: 0 };
    if (c.realExposed) ok(real.live === real.n, `batched discs: ${real.n - real.live} of ${real.n} X.discs are merged into static batches: env.onRideStart() cannot hide them (ctx.noBatch(disc) where they are built)`);
    else warn('X.discs is not exposed: cannot tell whether the real-tunnel discs survived the batching');
    for (const k of ['stub', 'free-end', 'other']) { const v = c.kinds[k]; if (v && v.live < v.n) warn(`${k} discs: ${v.n - v.live} of ${v.n} are merged / not in the scene: nothing can hide them during a ride`); }
    for (const d of c.offAxis.slice(0, 12)) warn(`${d.kind} disc at ${d.at.join(', ')} is ${d.d} m off every tube / stub axis`);
    const b = c.boards;
    if (b.err) ok(false, `generic hall boards: ${b.err}`);
    else ok(b.tex && b.meshesWithTex > 0 && (!b.exposed || (b.boardsAttached === b.boards && b.boardsOnTex === b.boards)), `generic hall boards show Sennaya after showGeneric(): ${b.meshesWithTex} meshes in the scene carry the 'nb-sennaya' texture${b.exposed ? `, ${b.boardsAttached} of ${b.boards} board meshes still in the scene, ${b.boardsOnTex} switched` : ' (board meshes not exposed: boards / bands in the return of buildGenericHall)'}${b.bands !== undefined ? `, bands in the scene ${b.bandsAttached} of ${b.bands}` : ''}${b.meshesWithTex ? '' : ' -> merged by the batching? ctx.noBatch() the boards and bands'}`);
  }

  // ---------------------------------------------------------------- A. route geometry
  if (ONLY.has('A')) {
    console.log(`A. route geometry: in rock (> ${K.ROCK} m), yaw steps (> ${K.YAW} deg per 1/60 s), black discs crossed by the rider's eye`);
    const a = await ev((n) => window.__ra.routes(n), DESTS); summary.todo.push(...a.todo);
    const good = a.routes.filter((r) => !r.err), name = (r) => `${r.from} ${r.key} -> ${r.to}`;
    for (const r of a.routes) {
      if (r.err) { ok(false, `A ${r.from} ${r.key || ''} -> ${r.to || '?'}: the route cannot be built (${r.err})`); continue; }
      const drawn = r.cross.filter((c) => c.shown);
      console.log(`   ${name(r)}${r.dest !== r.to ? ' (' + r.dest + ' hall)' : ''} [${r.partial ? 'partial' : r.real ? 'real' : 'generic'}] ${r.S_end} m / ${r.T_run} s: rock ${r.rockM} m${r.runs.length ? ' (s ' + r.runs.map((q) => q[0] + '-' + q[1]).join(', ') + ')' : ''}, yaw max ${r.yawMax} deg at ${r.yawAt} m, teleports ${r.jumps}, discs crossed ${r.cross.length} (drawn ${drawn.length}${drawn.length ? ': ' + drawn.map((c) => c.kind + '@' + c.s + 'm').join(' ') : ''})`);
    }
    const rock = good.filter((r) => r.rockM > 0).sort((p, q) => q.rockM - p.rockM), yaw = good.filter((r) => r.yawMax > K.YAW).sort((p, q) => q.yawMax - p.yawMax), disc = good.filter((r) => r.cross.some((c) => c.shown));
    ok(rock.length === 0, `A in rock: ${rock.length} of ${good.length} routes leave every hall / tube / stub by > ${K.ROCK} m${rock.length ? ' (worst 10: ' + rock.slice(0, 10).map((r) => `${name(r)} ${r.rockM} m at s ${r.runs.map((q) => q[0] + '-' + q[1]).join(', ')}, farthest ${r.worst[1]} m off at s ${r.worst[0]} (${r.worst.slice(2).join(', ')})`).join('; ') + ')' : ''}`);
    ok(yaw.length === 0, `A yaw steps: ${yaw.length} of ${good.length} routes turn the rider's car by > ${K.YAW} deg between two 1/60 s frames${yaw.length ? ' (worst 10: ' + yaw.slice(0, 10).map((r) => `${name(r)} ${r.yawMax} deg at ${r.yawAt} m`).join('; ') + ')' : ''}`);
    ok(disc.length === 0, `A discs: ${disc.length} of ${good.length} routes carry the rider's eye through a black disc that is drawn during the ride${disc.length ? ' (' + disc.slice(0, 10).map((r) => `${name(r)}: ${r.cross.filter((c) => c.shown).map((c) => c.kind + '@' + c.s + 'm').join(' ')}`).join('; ') + ')' : ''}`);
    const brief = (r) => ({ route: name(r), dest: r.dest, rockM: r.rockM, runs: r.runs, worst: r.worst, yawMax: r.yawMax, yawAt: r.yawAt, jumps: r.jumps, discs: r.cross.map((c) => c.kind + (c.shown ? '' : '(hidden)') + '@' + c.s) });
    summary.A = { routes: good.length, errors: a.routes.filter((r) => r.err).map((r) => `${r.from} ${r.key || ''} -> ${r.to || '?'}: ${r.err}`), rock: rock.map(brief), yaw: yaw.map(brief), disc: disc.map(brief), all: good.map(brief) };
  }

  // ---------------------------------------------------------------- B. live rides
  if (ONLY.has('B')) {
    console.log(`B. live rides: rider screenshots every ${EVERY} s + before every disc, see-through probes, overlap at the destination (look: ${LOOK})`);
    for (const R of RIDES) { try { summary.B.push(await rideProbe(R)); } catch (e) { ok(false, `B${R.n} ${R.from} -> ${R.to} crashed: ${e.message}`); await ev(() => window.__ra.reset()).catch(() => {}); } }
  }
  console.log(`\n${checks - problems.filter((p) => !p.startsWith('[')).length}/${checks} checks passed, ${warns.length} warnings`);
  for (const l of logs.slice(0, 12)) console.log(l);
} catch (e) {
  problems.push('[audit crashed] ' + (e.stack || e.message));
}
summary.todo = [...new Set(summary.todo)];
Object.assign(summary, { result: problems.length ? 'FAIL' : 'OK', checks, failed: problems.length, problems, warnings: warns });
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 1));
const printed = { result: summary.result, checks, failed: problems.length, shims: shimState, todo: summary.todo,
  A: summary.A && { routes: summary.A.routes, errors: summary.A.errors, rock: summary.A.rock.slice(0, 10), yaw: summary.A.yaw.slice(0, 10), disc: summary.A.disc.slice(0, 10) },
  B: summary.B.map((b) => ({ n: b.n, ride: b.from + ' -> ' + b.to, via: b.via, shots: b.shots.length, minMean: b.shots.length ? Math.min(...b.shots.map((q) => q.mean)) : null, maxNearBlack: b.shots.length ? Math.max(...b.shots.map((q) => q.nearBlack)) : null, see: b.see, overlapStand: b.overlapStand, overlapRun: b.overlapRun, discs: (b.info && b.info.cross || []).map((c) => c.kind + (c.shown ? '' : '(hidden)')), fails: b.fails })),
  C: summary.C && { discs: summary.C.kinds, offAxis: summary.C.offAxis.length, boards: summary.C.boards }, warnings: warns.length, details: path.relative(root, path.join(outDir, 'summary.json')) };
for (const p of problems) console.log('PROBLEM:', p);
console.log('SUMMARY ' + JSON.stringify(printed, null, 1));
await browser.close(); server.close();
console.log(problems.length ? 'RESULT: FAIL' : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
