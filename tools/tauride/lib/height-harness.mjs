// The measurements of tools/tauride-height-test.mjs: shore probes with the real Player (wading), the walk from the south gate to the memorial along the garden ways, the slope of the height model,
// the flight-landing refusal and the car keep-out breaches. Every function takes a WORLD { engine, L, ph (Physics), heightAt, model, camera, bounds } and returns numbers; nothing here asserts.
import { polyLen } from './common.mjs';
import { makePlayer, walkDir, walkToward } from './stub-env.mjs';

/** water depth at (x, z) for the model: 0 on land and under a deck, else waterLevel - heightAt (never negative) */
export const depthAt = (m, x, z) => (m.inWater(x, z) ? Math.max(0, m.waterLevel - m.heightAt(x, z)) : 0);

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
/** flight landing over the water: the share of water cells where the real predicate (groundHeight < -1) refuses ('water') */
export function landingReport(world, S) {
  let n = 0, refused = 0, bad = 0;
  for (const p of S.U) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
    for (let x = x0; x <= x1; x += 4) for (let z = z0; z <= z1; z += 4) { if (S.waterDist(x, z) > -1.5) continue; if (!world.model.inWater(x, z)) continue; n++; const g = world.ph.groundHeight(x, z, 60); if (g < -1) refused++; else if (world.model.waterLevel - g > world.model.wadeDepth) bad++; } }
  return { cells: n, refused, landableDeep: bad };
}
/** The car keep-out: sample the garden outline every metre; a breach = a straight line from 3 m outside to 3 m inside that no car-blocked point interrupts. Returns { samples, breachM, stretches } */
export function carBreach(S, carBlocked) {
  const o = S.GARDEN.o, ccw = ((() => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return a; })()) > 0;
  let samples = 0, breachM = 0; const stretches = []; let cur = null;
  for (let i = 0; i < o.length; i += 2) {
    const ax = o[i], az = o[i + 1], bx = o[(i + 2) % o.length], bz = o[(i + 3) % o.length], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len));
    let nx = (bz - az) / len, nz = -(bx - ax) / len; if (!ccw) { nx = -nx; nz = -nz; }          // outward normal
    for (let k = 0; k < n; k++) {
      const x = ax + (bx - ax) * (k + 0.5) / n, z = az + (bz - az) * (k + 0.5) / n; samples++;
      let blocked = false; for (let d = -3; d <= 3 && !blocked; d += 0.5) if (carBlocked(x + nx * d, z + nz * d)) blocked = true;
      if (!blocked) { breachM += len / n; if (!cur) { cur = { x: Math.round(x), z: Math.round(z), lenM: 0 }; stretches.push(cur); } cur.lenM += len / n; } else cur = null;
    }
  }
  return { samples, breachM: Math.round(breachM), perimeterM: Math.round(samples), stretches: stretches.map((s) => ({ ...s, lenM: Math.round(s.lenM) })) };
}
