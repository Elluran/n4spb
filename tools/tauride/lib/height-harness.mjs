// The measurements of tools/tauride-height-test.mjs: shore probes with the real Player (wading), the walk from the south gate to the memorial along the garden ways, the slope of the height model,
// the flight-landing refusal and the car keep-out breaches. Every function takes a WORLD { engine, L, ph (Physics), heightAt, model, camera, bounds } and returns numbers; nothing here asserts.
import { polyLen } from './common.mjs';
import { makePlayer, walkDir, walkToward } from './stub-env.mjs';

/** water depth at (x, z) for the model: 0 on land and on a deck (m.deckY: the bridge kit of T4b, null off the decks), else waterLevel - heightAt (never negative) */
export const depthAt = (m, x, z) => (m.inWater(x, z) && !(m.deckY && m.deckY(x, z) !== null) ? Math.max(0, m.waterLevel - m.heightAt(x, z)) : 0);

/**
 * Probes along the shore of the water outline `ring` (flat): segments longer than `minLen` with water on one side within 2 m, no building 4 m inland; `count` of them, evenly spread
 * (the selection of the scouting script that found the old trap, so the numbers are comparable): { x, z, wx, wz } (wx, wz = unit vector to the water).
 */
export function shoreProbes(L, wet, ring, { count = 14, minLen = 8 } = {}) {
  const segs = [];
  for (let i = 0; i < ring.length; i += 2) {
    const a = [ring[i], ring[i + 1]], b = [ring[(i + 2) % ring.length], ring[(i + 3) % ring.length]];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < minLen) continue;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
    const side = wet(mx + nx * 2, mz + nz * 2) ? 1 : wet(mx - nx * 2, mz - nz * 2) ? -1 : 0; if (!side) continue;
    if (L.insideBuilding(mx - side * nx * 4, mz - side * nz * 4, 1)) continue;
    segs.push({ x: mx, z: mz, wx: nx * side, wz: nz * side });
  }
  return segs.filter((_, i) => i % Math.max(1, Math.floor(segs.length / count)) === 0).slice(0, count);
}

/** a world for a model on an engine: Physics on the model's height, the model's colliders, a Player factory */
export function makeWorld(engine, model, camera, bounds, physics = null) {
  const ph = physics || new engine.Physics((x, z) => model.heightAt(x, z));
  if (!physics && model.addColliders) model.addColliders(ph, engine);
  return { engine, L: engine.L, ph, model, camera, bounds, heightAt: (x, z) => model.heightAt(x, z), player: () => makePlayer(engine, camera, ph, bounds) };
}

/**
 * WADING. Each probe: the walker starts 4 m inland of the shore point, walks into the water for 6 s, then back out for 10 s. Records the deepest water the feet stood in, whether the walker ended on
 * land, and the lowest feet height. entered = the feet were in water at some time (depth > 2 cm); deep = deeper than model.wadeDepth; exited = back on land (not wet, feet above waterLevel).
 */
export function wadeProbes(world, probes) {
  const { model } = world, rows = [];
  for (const s of probes) {
    const p = world.player();
    p.setPose(s.x - s.wx * 4, s.z - s.wz * 4, 0, 0, null, { stand: true });
    let maxDepth = 0, minY = Infinity, touched = false;
    const track = () => { const d = depthAt(model, p.pos.x, p.pos.z); if (d > maxDepth) maxDepth = d; if (p.pos.y < minY) minY = p.pos.y; if (model.inWater(p.pos.x, p.pos.z)) touched = true; };
    for (let t = 0; t < 360; t += 6) { walkDir(p, s.wx, s.wz, 6); track(); }
    const inAfterIn = model.inWater(p.pos.x, p.pos.z), yIn = p.pos.y;
    for (let t = 0; t < 600; t += 6) { walkDir(p, -s.wx, -s.wz, 6); track(); }
    const wetEnd = model.inWater(p.pos.x, p.pos.z);
    rows.push({ shore: [Math.round(s.x), Math.round(s.z)], touchedWater: touched, entered: maxDepth > 0.02, deep: maxDepth > model.wadeDepth, maxDepth: +maxDepth.toFixed(2), yIn: +yIn.toFixed(2), inWaterAfterIn: inAfterIn, exited: !wetEnd && p.pos.y > model.waterLevel + 0.05, minY: +minY.toFixed(2), endY: +p.pos.y.toFixed(2), backFromShore: +Math.hypot(p.pos.x - s.x, p.pos.z - s.z).toFixed(1) });
  }
  return rows;
}
export function wadeSummary(rows) {
  const entered = rows.filter((r) => r.entered), deep = rows.filter((r) => r.deep);
  const trapped = deep.filter((r) => !r.exited);
  return { probes: rows.length, entered: entered.length, deep: deep.length, deepExited: deep.length - trapped.length, trapped: trapped.length, maxDepth: Math.max(0, ...rows.map((r) => r.maxDepth)), enteredExited: entered.filter((r) => r.exited).length };
}

// ---------------------------------------------------------------- the walk along the garden ways
/** the way network: nodes = vertices (0.1 m), edges = consecutive vertices of every way (bridges included) */
export function pathGraph(paths) {
  const key = (x, z) => Math.round(x * 10) + ',' + Math.round(z * 10), nodes = new Map(), adj = new Map();
  const node = (x, z) => { const k = key(x, z); if (!nodes.has(k)) { nodes.set(k, { k, x, z }); adj.set(k, []); } return nodes.get(k); };
  for (const p of paths) for (let i = 0; i + 3 < p.pts.length; i += 2) {
    const a = node(p.pts[i], p.pts[i + 1]), b = node(p.pts[i + 2], p.pts[i + 3]), d = Math.hypot(a.x - b.x, a.z - b.z);
    adj.get(a.k).push({ to: b.k, d, way: p.id }); adj.get(b.k).push({ to: a.k, d, way: p.id });
  }
  return { nodes, adj, nearest(x, z, max = Infinity) { let best = null; for (const n of nodes.values()) { const d = Math.hypot(n.x - x, n.z - z); if (d < max && (!best || d < best.d)) best = { n, d }; } return best && best.n; } };
}
/** shortest way route between two graph nodes (Dijkstra): [{ x, z, way }] */
export function route(g, from, to) {
  const dist = new Map([[from.k, 0]]), prev = new Map(), todo = new Set([from.k]);
  while (todo.size) {
    let u = null; for (const k of todo) if (u === null || dist.get(k) < dist.get(u)) u = k;
    todo.delete(u); if (u === to.k) break;
    for (const e of g.adj.get(u)) { const nd = dist.get(u) + e.d; if (nd < (dist.get(e.to) ?? Infinity)) { dist.set(e.to, nd); prev.set(e.to, { k: u, way: e.way }); todo.add(e.to); } }
  }
  if (!dist.has(to.k)) return null;
  const out = []; let k = to.k;
  while (k !== from.k) { const n = g.nodes.get(k); const pr = prev.get(k); out.push({ x: n.x, z: n.z, way: pr.way }); k = pr.k; }
  const f = g.nodes.get(from.k); out.push({ x: f.x, z: f.z, way: null });
  return out.reverse();
}
/** walk the real Player along a route (each leg at most 12 s); returns { ok, lengthM, ticks, minY, maxDepth, stuckAt } */
export function walkRoute(world, wps) {
  const p = world.player(); p.setPose(wps[0].x, wps[0].z, 0, 0, null, { stand: true });
  let minY = p.pos.y, maxDepth = 0, ticks = 0, stuckAt = null;
  for (let i = 1; i < wps.length && !stuckAt; i++) {
    const t = wps[i];
    const budget = Math.ceil((Math.hypot(t.x - p.pos.x, t.z - p.pos.z) / 2 + 4) * 60);      // the walk speed is ~3.6 m/s: a leg gets twice the time it needs plus 4 s
    for (let k = 0; k < budget; k += 6) {
      walkToward(p, t.x, t.z, 6); ticks += 6;
      if (p.pos.y < minY) minY = p.pos.y; const d = depthAt(world.model, p.pos.x, p.pos.z); if (d > maxDepth) maxDepth = d;
      if (Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 0.6) break;
      if (k + 6 >= budget) stuckAt = { leg: i, x: +p.pos.x.toFixed(1), z: +p.pos.z.toFixed(1), way: t.way };
    }
  }
  const end = wps[wps.length - 1];
  return { ok: !stuckAt && Math.hypot(end.x - p.pos.x, end.z - p.pos.z) < 1.5, lengthM: Math.round(polyLen(wps.flatMap((w) => [w.x, w.z]))), ticks, minY: +minY.toFixed(2), maxDepth: +maxDepth.toFixed(2), stuckAt, end: [+p.pos.x.toFixed(1), +p.pos.z.toFixed(1)] };
}

// ---------------------------------------------------------------- slope, landing, cars
/**
 * slope numbers of the height model (rise per metre): `land` = cells of the garden more than BANK m from the water, `bank` = cells within BANK m of the shore (the plan's 1:3 banks live here),
 * `ways` = steps of 1 m along the non-bridge ways while the way is more than BANK m from the water, `waysBank` = the rest. BANK = 3 m (the central difference spans 1 m, the bank profile 1.7 m).
 */
export function slopeReport(S, heightAt, BANK = 3) {
  const grid = [], bank = [], ways = [], waysBank = [];
  const b = (() => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; const o = S.GARDEN.o; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return { x0, x1, z0, z1 }; })();
  const grad = (x, z) => Math.hypot(heightAt(x + 1, z) - heightAt(x - 1, z), heightAt(x, z + 1) - heightAt(x, z - 1)) / 2;
  for (let x = b.x0; x <= b.x1; x += 2) for (let z = b.z0; z <= b.z1; z += 2) {
    if (!S.inGarden(x, z)) continue; const wd = S.waterDist(x, z); if (wd < 0) continue;
    (wd > BANK ? grid : bank).push(grad(x, z));
  }
  for (const p of S.P.PATHS) {
    if (p.bridge) continue; let prev = null;
    for (let i = 0; i + 3 < p.pts.length; i += 2) {
      const L0 = Math.hypot(p.pts[i + 2] - p.pts[i], p.pts[i + 3] - p.pts[i + 1]);
      for (let t = 0; t <= L0; t += 1) {
        const x = p.pts[i] + (p.pts[i + 2] - p.pts[i]) * t / (L0 || 1), z = p.pts[i + 1] + (p.pts[i + 3] - p.pts[i + 1]) * t / (L0 || 1), h = heightAt(x, z);
        if (prev !== null) (S.waterDist(x, z) > BANK ? ways : waysBank).push(Math.abs(h - prev));
        prev = h;
      }
    }
  }
  const stat = (a) => { const s2 = a.slice().sort((x, y) => x - y); return { n: s2.length, max: s2.length ? +s2[s2.length - 1].toFixed(4) : 0, p95: s2.length ? +s2[Math.floor(s2.length * 0.95)].toFixed(4) : 0 }; };
  return { land: stat(grid), bank: stat(bank), ways: stat(ways), waysBank: stat(waysBank) };
}
/** flight landing over the water: the share of water cells where the real predicate (groundHeight < -1, or the page's HOOKS.noLanding when given) refuses ('water'); `byEngine` = refused by the engine's own test alone */
export function landingReport(world, S, noLanding = null) {
  let n = 0, refused = 0, bad = 0, byEngine = 0;
  for (const p of S.U) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
    for (let x = x0; x <= x1; x += 4) for (let z = z0; z <= z1; z += 4) { if (S.waterDist(x, z) > -1.5) continue; if (!world.model.inWater(x, z)) continue; n++; const g = world.ph.groundHeight(x, z, 60); if (g < -1) { refused++; byEngine++; } else if (noLanding && noLanding(x, z)) refused++; else if (world.model.waterLevel - g > world.model.wadeDepth) bad++; } }
  return { cells: n, refused, byEngine, landableDeep: bad };
}
/** The car keep-out: sample the garden outline every metre; a breach = a straight line from 3 m outside to 3 m inside that no car-blocked point interrupts. Returns { samples, breachM, stretches } */
export function carBreach(S, carBlocked, isWater = null) {
  const o = S.GARDEN.o, ccw = ((() => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return a; })()) > 0;
  let samples = 0, breachM = 0; const stretches = []; let cur = null;
  for (let i = 0; i < o.length; i += 2) {
    const ax = o[i], az = o[i + 1], bx = o[(i + 2) % o.length], bz = o[(i + 3) % o.length], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len));
    let nx = (bz - az) / len, nz = -(bx - ax) / len; if (!ccw) { nx = -nx; nz = -nz; }          // outward normal
    for (let k = 0; k < n; k++) {
      const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; samples++;
      let blocked = false; for (let d = -3; d <= 3 && !blocked; d += 0.5) if (carBlocked(x + nx * d, z + nz * d)) blocked = true;
      if (!blocked && isWater && isWater(x - nx * 1.5, z - nz * 1.5)) blocked = true;      // WATER IS REACHABLE: a way across the outline that leads into the water is no breach of the closed ground (the keep-out is the LAND of the garden)
      if (!blocked) { breachM += len / n; if (!cur) { cur = { x: Math.round(x), z: Math.round(z), lenM: 0 }; stretches.push(cur); } cur.lenM += len / n; } else cur = null;
    }
  }
  return { samples, breachM: Math.round(breachM), perimeterM: Math.round(samples), stretches: stretches.map((s) => ({ ...s, lenM: Math.round(s.lenM) })) };
}

// ---------------------------------------------------------------- T4a: the ring of shore probes (the acceptance of "ponds are impassable")
/**
 * A DENSE RING of wading probes on the REAL shore. `segs` = the shore segments of height.js shoreSegments() (start a, edge e, unit normal n to the LAND), `shore` = the signed-distance structure (+ land).
 * Every `spacing` m along every segment a walker starts `inland` m from the shore and pushes TOWARDS the water for `ticks` 60 Hz steps, at each angle (degrees away from the perpendicular) and in each mode:
 *   walk | sprint (ShiftLeft) | jump (a hop every time the feet are on the ground: vy 4.2 = the engine's jump, apex 0.73 m).
 * A start that is not a clean standing place (closer than 2.5 m to a shore, in a building, inside a collider) is skipped (counted). A run `entered` the water when the feet got more than 2 cm past the outline
 * (shore distance < -0.02) or below the waterline; `minD` = the closest the feet came to the outline (negative = past it). Entered runs then walk back for 10 s: `exited` = back on land.
 * Returns { runs, skipped, entered, trapped, minD, p01, byMode: { mode: { runs, entered, minD } }, worst: [{ x, z, angle, mode, minD }] }
 */
export function wadeRing(world, shore, segs, { spacing = 3, inland = 4, angles = [0, 30, -30, 60, -60, 80, -80], modes = ['walk', 'sprint', 'jump'], ticks = 360, waterY = -0.45, limit = Infinity, offset = 0.5, deckY = null } = {}) {
  const { ph } = world, res = { runs: 0, skipped: 0, entered: 0, trapped: 0, onDeck: 0, minD: Infinity, byMode: {}, worst: [], samples: [] };
  for (const m of modes) res.byMode[m] = { runs: 0, entered: 0, minD: Infinity };
  // T4b: a walker who went onto a bridge deck over the water has not entered the water (deckY = the bridge kit's profile, the feet on it within 10 cm)
  const onDeck = deckY ? (x, z, y) => { const d = deckY(x, z); return d !== null && y >= d - 0.1; } : () => false;
  let started = 0;
  for (let i = 0; i < segs.n; i++) {
    const len = Math.hypot(segs.ex[i], segs.ez[i]), k = Math.max(1, Math.floor(len / spacing));
    for (let q = 0; q < k; q++) {
      if (started++ >= limit) return finish(res);
      const t = (q + offset) / k, px = segs.ax[i] + segs.ex[i] * t, pz = segs.az[i] + segs.ez[i] * t, nx = segs.nx[i], nz = segs.nz[i];
      const sx = px + nx * inland, sz = pz + nz * inland;
      if (shore.dist(sx, sz) < 2.5 || world.L.insideBuilding(sx, sz, 1.5)) { res.skipped++; continue; }
      const h0 = world.heightAt(sx, sz);
      if (ph.columnBlocked(sx, sz, 0.3, h0 + 0.45, h0 + 1.7)) { res.skipped++; continue; }
      for (const a of angles) {
        const c = Math.cos(a * Math.PI / 180), s = Math.sin(a * Math.PI / 180), dx = -(nx * c - nz * s), dz = -(nx * s + nz * c);       // -n turned by a
        for (const mode of modes) {
          const p = world.player();
          p.setPose(sx, sz, 0, 0, null, { stand: true });
          let minD = Infinity, entered = false, still = 0, bx = p.pos.x, bz = p.pos.z;
          for (let tk = 0; tk < ticks; tk++) {
            p.yaw = Math.atan2(-dx, -dz); p.keys.add('KeyW'); if (mode === 'sprint') p.keys.add('ShiftLeft');
            if (mode === 'jump' && p.onGround) p.vy = 4.2;
            p.update(1 / 60);
            const d = shore.dist(p.pos.x, p.pos.z);
            if (d < 0 && onDeck(p.pos.x, p.pos.z, p.pos.y)) { res.onDeck++; continue; }
            if (d < minD) minD = d;
            if (d < -0.02 || (d < 0 && p.pos.y < waterY - 0.02)) entered = true;
            if (tk % 30 === 29) { if (Math.hypot(p.pos.x - bx, p.pos.z - bz) < 0.01 && tk > 120) { still++; if (still >= 2) break; } else still = 0; bx = p.pos.x; bz = p.pos.z; }
          }
          p.keys.delete('KeyW'); p.keys.delete('ShiftLeft');
          res.runs++; const bm = res.byMode[mode]; bm.runs++; if (minD < bm.minD) bm.minD = minD; if (minD < res.minD) res.minD = minD;
          res.samples.push(minD);
          if (entered) {
            res.entered++; bm.entered++;
            for (let tk = 0; tk < 600; tk++) { p.yaw = Math.atan2(dx, dz); p.keys.add('KeyW'); p.update(1 / 60); } p.keys.delete('KeyW');
            if (!(shore.dist(p.pos.x, p.pos.z) > 0)) res.trapped++;
            if (res.worst.length < 8) res.worst.push({ x: +px.toFixed(1), z: +pz.toFixed(1), angle: a, mode, minD: +minD.toFixed(2) });
          }
        }
      }
    }
  }
  return finish(res);
  function finish(r) { const s = r.samples.slice().sort((u, v) => u - v); r.p01 = s.length ? s[Math.floor(s.length * 0.01)] : 0; r.p50 = s.length ? s[Math.floor(s.length / 2)] : 0; delete r.samples; return r; }
}

/**
 * T4b: the DECK RING: starts ON every bridge deck (every `spacing` m along the axis, at three lateral offsets) and AT every head (beside the rails, on land, `headOut` m from the axis), pushed sideways / at an angle / toward the water
 * for `ticks` steps at walk / sprint / jump. `sites` = the bridge plan's sites (bridges.js: axis, at(u), hw, L, ends), `deckY` the kit's profile. A run `entered` the water when the feet got past the outline (shore distance < -0.02) and
 * not on a deck (deckY null there, or the feet 10 cm below it); `left` = the feet ended more than hw + 0.7 m from the axis while over the water. Returns { runs, entered, left, trapped, minD, byMode, worst }.
 */
export function deckRing(world, shore, sites, deckY, { spacing = 1, angles = [90, -90, 45, -45, 135, -135], modes = ['walk', 'sprint', 'jump'], ticks = 180, headOut = 0.8 } = {}) {
  const res = { runs: 0, entered: 0, enteredDeck: 0, enteredHead: 0, left: 0, trapped: 0, minD: Infinity, byMode: {}, worst: [], heads: 0, decks: 0 };
  for (const m of modes) res.byMode[m] = { runs: 0, entered: 0 };
  const onDeck = (x, z, y) => { const d = deckY(x, z); return d !== null && y >= d - 0.1; };
  const run = (sx, sz, dx, dz, mode, s, label, kind = 'deck') => {
    const p = world.player(); p.setPose(sx, sz, 0, 0, null, { stand: true });
    let minD = Infinity, entered = false;
    for (let tk = 0; tk < ticks; tk++) {
      p.yaw = Math.atan2(-dx, -dz); p.keys.add('KeyW'); if (mode === 'sprint') p.keys.add('ShiftLeft'); if (mode === 'jump' && p.onGround) p.vy = 4.2;
      p.update(1 / 60);
      const d = shore.dist(p.pos.x, p.pos.z);
      if (d < 0 && onDeck(p.pos.x, p.pos.z, p.pos.y)) continue;
      if (d < minD) minD = d;
      if (d < -0.02 || (d < 0 && p.pos.y < world.model.waterLevel - 0.02)) entered = true;
    }
    p.keys.clear(); res.runs++; res.byMode[mode].runs++; if (minD < res.minD) res.minD = minD;
    if (entered) {
      res.entered++; res.byMode[mode].entered++; if (kind === 'deck') res.enteredDeck++; else res.enteredHead++;
      for (let tk = 0; tk < 600; tk++) { p.yaw = Math.atan2(dx, dz); p.keys.add('KeyW'); p.update(1 / 60); } p.keys.delete('KeyW');
      if (!(shore.dist(p.pos.x, p.pos.z) > 0 || onDeck(p.pos.x, p.pos.z, p.pos.y))) res.trapped++;
      if (res.worst.length < 8) res.worst.push({ site: s.site, at: label, mode, minD: +minD.toFixed(2) }); if (kind === 'deck' && (res.worstDeck || (res.worstDeck = [])).length < 8) res.worstDeck.push({ site: s.site, at: label, mode, minD: +minD.toFixed(2) });
    }
  };
  for (const s of sites) {
    for (let u = 0.5; u < s.L; u += spacing) {
      const q = s.at(u), px = -q.dz, pz = q.dx;
      for (const v of [0, s.hw - 0.4, -(s.hw - 0.4)]) for (const a of angles) for (const mode of modes) {
        const c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180), dx = q.dx * c - q.dz * si, dz = q.dx * si + q.dz * c;      // the axis direction turned by a
        run(q.x + px * v, q.z + pz * v, dx, dz, mode, s, `u${u.toFixed(1)} v${v.toFixed(1)} a${a}`); res.decks++;
      }
    }
    for (const [e, u] of [[s.ends.a, 0], [s.ends.b, s.L]]) {                 // the heads: beside the rails, on land OUTSIDE the shore ring (2 m from the water, as the ring's own starts), pushed toward the water and along the shore
      const q = s.at(u), px = -q.dz, pz = q.dx, inward = u === 0 ? 1 : -1;
      for (const side of [-1, 1]) for (const a of [0, 30, -30, 60, -60]) for (const mode of modes) {
        let sx = q.x + px * side * (s.hw + headOut), sz = q.z + pz * side * (s.hw + headOut), back = 0;
        while (shore.dist(sx, sz) < 2.0 && back < 5) { sx -= q.dx * inward * 0.5; sz -= q.dz * inward * 0.5; back += 0.5; }       // a head that stands close to the water: start farther inland along the axis
        if (shore.dist(sx, sz) < 2.0 || world.L.insideBuilding(sx, sz, 1)) continue;
        const c = Math.cos(a * Math.PI / 180), si = Math.sin(a * Math.PI / 180), bx = q.dx * inward, bz = q.dz * inward, dx = bx * c - bz * si, dz = bx * si + bz * c;
        run(sx, sz, dx, dz, mode, s, `head${u === 0 ? 'A' : 'B'} side${side} a${a}`, 'head'); res.heads++;
      }
    }
  }
  return res;
}

/**
 * FLIGHT LANDING on the real Player (T4a fix round 1): for each point { x, z } over the water the player hovers at 12 m, presses F (toggleFly(false)) and the landing is refused ('water') or happens; a landed player then walks toward the nearest point of
 * the shore for 25 s and 3 m beyond it (the climb out): `escaped` = standing on the land side of the shore colliders (shore distance >= 1.0 m: a walker coming from land is stopped 1.2 m from the waterline, the box stands 0.45 .. 0.85 m inland of it) at the end. `noLanding` is what the page's main.js hands to the Player (HOOKS.noLanding), null = the engine's own refusal only (ground < -1).
 * Returns { n, refused, landed, escaped, trapped, rows: [{ x, z, ground, result, escaped, end }] } (a landing that cannot walk out is a TRAP: the shore colliders stand between the flyer and the land).
 */
export function flightLanding(world, shore, segs, pts, { noLanding = null, ticks = 1500 } = {}) {
  const res = { n: 0, refused: 0, landed: 0, escaped: 0, trapped: 0, rows: [] };
  const nearest = (x, z) => { let bd = Infinity, bx = 0, bz = 0; for (let i = 0; i < segs.n; i++) { const wx = x - segs.ax[i], wz = z - segs.az[i]; let t = (wx * segs.ex[i] + wz * segs.ez[i]) * segs.inv2[i]; t = t < 0 ? 0 : t > 1 ? 1 : t; const px = segs.ax[i] + t * segs.ex[i], pz = segs.az[i] + t * segs.ez[i], d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; bx = px; bz = pz; } } return { d: bd, x: bx, z: bz }; };
  for (const q of pts) {
    const p = world.player(); p.noLanding = noLanding; p.setPose(q.x, q.z, 0, 0, 12); res.n++;
    const r = p.toggleFly(false), row = { x: q.x, z: q.z, ground: +world.ph.groundHeight(q.x, q.z, 60).toFixed(2), result: r, escaped: null, end: null };
    if (r === 'water' || r === 'blocked') { res.refused++; res.rows.push(row); continue; }
    for (let t = 0; t < 900 && !(p.onGround && !p.descent); t++) p.update(1 / 60);
    res.landed++;
    const nr = nearest(p.pos.x, p.pos.z), dx = nr.x - p.pos.x, dz = nr.z - p.pos.z, l = Math.hypot(dx, dz) || 1, tx = nr.x + dx / l * 3, tz = nr.z + dz / l * 3;
    walkToward(p, tx, tz, ticks);
    const end = shore.dist(p.pos.x, p.pos.z); row.escaped = end >= 1.0; row.end = [+p.pos.x.toFixed(2), +p.pos.z.toFixed(2), +p.pos.y.toFixed(2), +end.toFixed(2)];
    if (row.escaped) res.escaped++; else res.trapped++;
    res.rows.push(row);
  }
  return res;
}
