// people/metrolife.js - the passengers on the platforms of the three west metro stations (Gostiny Dvor, Nevsky Prospekt, Admiralteyskaya; the metro module leaves the platform crowd to the people
// module).  They are underground agents (sim.placeUg: a.ug = true, drawn only while the camera is below the street, no surface rules), standing behind the platform edge facing the track (phone,
// watching the tunnel, talking in pairs, a few with suitcases or backpacks), pacing slowly along clear lanes of the platform, a couple on the benches when the hall has any.
// The floor is read from the colliders the metro module registered (physics.groundHeight at the platform level, columnBlocked for pylons / columns / walls / benches): a cell is usable when the
// floor around it (0.9 m each way across the platform) is at platform level, so nobody stands on the edge, in a stair opening, a pylon or a wall.  The frame of a station is services.metro.stations[].frame
// { x, z, yaw, y }: local x lateral, z along the platform, world = (x0 + x cos yaw + z sin yaw, z0 - x sin yaw + z cos yaw); platform level = frame.y.
import { makeSpec } from './chars.js';
import { GESTURE as G } from './contract.js';

const STATIONS = { gostiny: { want: 44, walkers: 0.3 }, nevsky: { want: 34, walkers: 0.3 }, admiralteyskaya: { want: 40, walkers: 0.3 } };

/** scan the platform of a station: returns { cells: [{x, z, lx, lz, wx, wz, edge}], lanes: [{ax,az,bx,bz,...}], ... } (local coordinates + world) */
export function scanPlatform(ctx, f, opts = {}) {
  const ph = ctx.physics, FY = f.y, len = (f.len || 120) / 2 + 6, step = 1.0, cs = Math.cos(f.yaw), sn = Math.sin(f.yaw), half = opts.half || 11;
  const toW = (lx, lz) => [f.x + lx * cs + lz * sn, f.z - lx * sn + lz * cs];
  const floorOK = (wx, wz) => { const h = ph.groundHeight(wx, wz, FY + 0.45, false); return Number.isFinite(h) && Math.abs(h - FY) < 0.2; };
  const free = (lx, lz, r) => { const [wx, wz] = toW(lx, lz); return floorOK(wx, wz) && !ph.columnBlocked(wx, wz, r, FY + 0.15, FY + 1.75); };
  const nx = Math.round(half * 2 / step) + 1, nz = Math.round(len * 2 / step) + 1, ok = new Uint8Array(nx * nz), fl = new Uint8Array(nx * nz), cb = new Uint8Array(nx * nz);
  const ix = (lx) => Math.round((lx + half) / step), iz = (lz) => Math.round((lz + len) / step);
  // one floor probe and one column probe per cell (the edge distances and the 0.9 m margins are read from these grids: the first version probed ~30 times per cell and cost 0.4 s)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const [wx, wz] = toW(-half + i * step, -len + j * step); const k = j * nx + i;
    if (floorOK(wx, wz)) { fl[k] = 1; if (ph.columnBlocked(wx, wz, 0.32, FY + 0.15, FY + 1.75)) cb[k] = 1; }
  }
  for (let j = 0; j < nz; j++) for (let i = 1; i < nx - 1; i++) { const k = j * nx + i; if (fl[k] && !cb[k] && fl[k - 1] && fl[k + 1]) ok[k] = 1; }
  const cells = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i; if (!ok[k]) continue;
    let a = 0; while (a < 7 && i - a - 1 >= 0 && fl[k - a - 1]) a++; let b = 0; while (b < 7 && i + b + 1 < nx && fl[k + b + 1]) b++;
    const dl = a + 0.5, dr = b + 0.5;                                        // metres across the platform to the nearest edge on each side
    if (Math.min(dl, dr) < 1.2) continue;                                    // 1.2 m behind the platform edge at least
    const lx = -half + i * step, lz = -len + j * step, [wx, wz] = toW(lx, lz); cells.push({ lx, lz, wx, wz, dl, dr, i, j });
  }
  return { cells, ok, nx, nz, half, len, step, toW, free, FY, cs, sn, ix, iz };
}

export function addMetroLife(ctx, nav, sim, S) {
  const { R, rr, count } = S, P = S.P, out = { stations: {}, ms: 0 }, t00 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const n = (base) => S.n(base) * ((S.west && S.west.platforms) || 1);
  const stations = (ctx.services.metro && ctx.services.metro.stations) || [];
  const mk = (opts, scene, prefs) => sim.spawn(makeSpec(R, opts), { prefs: prefs || P.P_STROLL, scene });
  const facing = (lx, dx, scan) => {                                     // yaw (rotY) of a person at lateral lx looking along the local x direction dx
    const wx = dx * scan.cs, wz = -dx * scan.sn; return Math.atan2(wx, wz);
  };
  for (const id of Object.keys(STATIONS)) {
    const st = stations.find((q) => q.id === id); if (!st || !st.frame) continue;
    try {
      const cfg = STATIONS[id], scan = scanPlatform(ctx, st.frame), cells = scan.cells;
      out.stations[id] = { cells: cells.length };
      if (cells.length < 30) continue;
      const want = Math.min(Math.round(n(cfg.want)), Math.floor(cells.length / 3)), used = [];
      const far = (c, d) => used.every((u) => Math.hypot(u.wx - c.wx, u.wz - c.wz) > d);
      // lane segments: runs of free cells along z at a fixed lateral offset (>= 14 m)
      const lanes = [];
      for (let i = 0; i < scan.nx; i++) {
        let j0 = -1;
        for (let j = 0; j <= scan.nz; j++) {
          const c = j < scan.nz && scan.ok[j * scan.nx + i];
          if (c && j0 < 0) j0 = j; else if (!c && j0 >= 0) { if (j - j0 >= 14) { const lx = -scan.half + i * scan.step; lanes.push({ lx, z0: -scan.len + (j0 + 1) * scan.step, z1: -scan.len + (j - 2) * scan.step }); } j0 = -1; }
        }
      }
      out.stations[id].lanes = lanes.length;
      const FY = scan.FY, pick = (arr) => arr[Math.floor(R() * arr.length)];
      const restand = (a2, t2) => sim.standFor(a2, t2, rr(30, 300), a2.standG, restand);               // nobody may fall through to the surface goal logic (no route from below the street)
      const pace = (a, t) => {                                          // wait a little, then walk to another point of a lane (or the same lane's other end)
        const L2 = pick(lanes), z = L2.z0 + (L2.z1 - L2.z0) * R(); const [wx, wz] = scan.toW(L2.lx + rr(-0.2, 0.2), z);
        sim.ugGo(a, wx, wz, (a2, t2) => sim.standFor(a2, t2, rr(8, 40), [G.PHONE, G.WATCH, G.LOOKAROUND, G.NONE], pace));
      };
      let made = 0;
      for (let tries = 0; tries < want * 12 && made < want; tries++) {
        const c = pick(cells); if (!far(c, 1.5)) continue;
        const pair = R() < 0.18 && made + 2 <= want;
        const walker = lanes.length && !pair && R() < cfg.walkers;
        const sideDx = c.dl < c.dr ? -1 : 1;                              // toward the nearer edge
        let clear = true; for (let d = 0.6; d < Math.min(c.dl, c.dr) - 0.4; d += 0.6) if (!scan.free(c.lx + sideDx * d, c.lz, 0.1)) { clear = false; break; }   // a pylon / wall between: no looking at the track
        const yaw = walker || !clear ? R() * Math.PI * 2 : facing(c.lx, sideDx, scan) + rr(-0.35, 0.35);
        const a = mk({ role: R() < 0.12 ? 'traveler' : R() < 0.25 ? 'student' : R() < 0.15 ? 'elder' : 'walk', suitcase: R() < 0.1 }, 'metro-platform', P.P_STROLL);
        sim.placeUg(a, c.wx, c.wz, yaw, FY); used.push(c); made++; count('platform');
        if (walker) { sim.standFor(a, 0, rr(1, 20), [G.NONE], pace); a.vpref *= 0.85; }
        else {
          a.standG = a.spec.phone ? [G.PHONE, G.PHONE, G.WATCH, G.NONE, G.LOOKAROUND] : [G.WATCH, G.NONE, G.LOOKAROUND, G.NONE]; a.until = rr(30, 400);
          a.goal = { type: 'custom', fn: restand };
        }
        if (pair) {                                                       // a friend beside (0.8 m along the platform), talking
          const b0 = { lx: c.lx, lz: c.lz + 0.85 }, [bx, bz] = scan.toW(b0.lx, b0.lz);
          if (scan.free(b0.lx, b0.lz, 0.3)) { const b = mk({ role: R() < 0.5 ? 'student' : 'walk' }, 'metro-platform', P.P_STROLL); sim.placeUg(b, bx, bz, a.yaw + rr(-0.6, 0.6), FY); b.standG = [G.TALK, G.TALK, G.PHONE, G.NONE]; b.until = rr(40, 400); b.goal = { type: 'custom', fn: restand }; made++; count('platform'); used.push({ wx: bx, wz: bz }); a.standG = [G.TALK, G.TALK, G.WATCH, G.NONE]; }
        }
      }
      out.stations[id].people = made;
    } catch (e) { console.error('[people] metro platform of ' + id + ' failed:', e); }
  }
  out.ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t00);
  return out;
}
