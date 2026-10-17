// Page-side script of the real-scene edge test (node tools/drive-edge-real.mjs runs it through shot.mjs --eval): the car drives into the invisible edge of the strip along real streets, with the real
// buildings, kerbs, parked cars and traffic around, and must never get stuck there. The red coupe drives the first half of the runs, the Roadster (the widest and longest footprint of the garage) the second half.
// Returns a JSON-able report.
(async () => {
  const d = window.__drive, L = window.__ctx.L;
  const R = L.WORLD.rects, segs = [];
  const sub = (a, b, cut) => { let rem = [[a, b]]; for (const [c0, c1] of cut) { const nr = []; for (const [s, e] of rem) { if (c1 <= s || c0 >= e) { nr.push([s, e]); continue; } if (c0 > s) nr.push([s, c0]); if (c1 < e) nr.push([c1, e]); } rem = nr; } return rem.filter(([s, e]) => e - s > 1e-9); };
  R.forEach((r, i) => {
    const o = R.filter((_, j) => j !== i);
    for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 < r.z0 && q.z1 >= r.z0).map((q) => [q.x0, q.x1]))) segs.push({ ax: s, az: r.z0, bx: e, bz: r.z0, nx: 0, nz: -1 });
    for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 <= r.z1 && q.z1 > r.z1).map((q) => [q.x0, q.x1]))) segs.push({ ax: s, az: r.z1, bx: e, bz: r.z1, nx: 0, nz: 1 });
    for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 < r.x0 && q.x1 >= r.x0).map((q) => [q.z0, q.z1]))) segs.push({ ax: r.x0, az: s, bx: r.x0, bz: e, nx: -1, nz: 0 });
    for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 <= r.x1 && q.x1 > r.x1).map((q) => [q.z0, q.z1]))) segs.push({ ax: r.x1, az: s, bx: r.x1, bz: e, nx: 1, nz: 0 });
  });
  let seed = 4242; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let car = null, HF = 0, HR = 0, HW = 0;
  const outside = () => { const sy = Math.sin(car.yaw), cy = Math.cos(car.yaw); for (const [a, b] of [[HF, HW], [HF, -HW], [-HR, HW], [-HR, -HW]]) if (!L.inPlay(car.x + sy * a + cy * b, car.z + cy * a - sy * b)) return true; return false; };
  const res = { runs: 0, stuck: [], outsideFrames: 0, nan: 0, centreOut: 0, hits: 0, escaped: 0, skipped: 0, samples: [], perCar: {}, jams: [] };
  const N = 80;
  for (let k = 0; k < N; k++) {
    const id = k < N / 2 ? 'coupe' : 'roadster';
    if (!d.active || d.vehicle.id !== id) { if (d.active) d.exit(true); d.enter(id); car = d.car; HF = car.tuning.hf; HR = car.tuning.hr; HW = car.tuning.hw; }
    const g = segs[Math.floor(rnd() * segs.length)], len = Math.hypot(g.bx - g.ax, g.bz - g.az), u = rnd();
    const ex = g.ax + (g.bx - g.ax) * u, ez = g.az + (g.bz - g.az) * u;
    // a drivable road point within 70 m inside the edge
    let best = null;
    for (let t = 8; t <= 70 && !best; t += 6) { const px = ex - g.nx * t, pz = ez - g.nz * t; const r = L.nearestRoad(px, pz, { drivable: true, maxDist: 14 }); if (r && !r.road.bridge && L.inPlay(r.x, r.z, 10)) best = r; }
    if (!best) { res.skipped++; continue; }
    d.teleport(best.x, best.z, Math.atan2(g.nx, g.nz) + (rnd() * 2 - 1) * 1.1);
    if (car.blocked(car.x, car.z)) { res.skipped++; continue; }
    res.runs++; res.perCar[id] = (res.perCar[id] || 0) + 1;
    const ph = rnd() * 6, k1 = 0.3 + rnd(), k2 = 0.2 + rnd() * 0.6;
    let hit0 = 0;
    d.sim(22, (t) => ({ thr: 1, brk: 0, steer: Math.sin(t * k1 + ph) * Math.cos(t * k2) * 0.9, nitro: (t % 6) < 1.5, hand: (t % 11) > 9.5 }), (i, c) => {
      if (!Number.isFinite(c.x + c.z + c.yaw)) res.nan++;
      if (!L.inPlay(c.x, c.z)) res.centreOut++;
      if (outside()) res.outsideFrames++;
      for (const e of c.events) if (e.type === 'hit') hit0++;
    });
    res.hits += hit0;
    // escape: try reverse, reverse + steer, forward + steer
    const sx = car.x, sz = car.z, sy0 = car.yaw; let escaped = false;
    for (const tr of [{ thr: 0, brk: 1, steer: 0 }, { thr: 0, brk: 1, steer: 1 }, { thr: 0, brk: 1, steer: -1 }, { thr: 1, brk: 0, steer: 1 }, { thr: 1, brk: 0, steer: -1 }]) {
      car.x = sx; car.z = sz; car.yaw = sy0; car.vx = car.vz = 0; car.steer = 0; car.impactSpin = 0;
      let moved = 0; d.sim(4, () => ({ ...tr, hand: false, nitro: false }), (i, c) => { moved = Math.max(moved, Math.hypot(c.x - sx, c.z - sz)); });
      if (moved >= 4) { escaped = true; break; }
    }
    // a jam far from the edge (a car wedged in an alley between two walls) is reported but is not what this test is about; a jam at the edge (within 12 m of it) fails the test
    const cl = L.clampToPlay(sx, sz, 12), nearEdge = cl[0] !== sx || cl[1] !== sz;
    if (escaped) res.escaped++; else if (nearEdge) res.stuck.push([id, Math.round(sx), Math.round(sz), Math.round(sy0 * 180 / Math.PI)]); else res.jams.push([id, Math.round(sx), Math.round(sz), Math.round(sy0 * 180 / Math.PI)]);
    if (res.samples.length < 4) res.samples.push([Math.round(sx), Math.round(sz), escaped]);
  }
  d.exit(true);
  return JSON.stringify(res);
})()
