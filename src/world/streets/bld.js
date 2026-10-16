// streets/bld.js - building footprint queries for clipping pavements and placing furniture: ray clearance, point-in-footprint,
// distance to the nearest facade. Uses layout.groundFootprints() (ground buildings incl. landmarks), a 16 m edge grid.
import * as L from '../layout.js';
import { RIVER } from '../data/city.js';
import { slopeRings, ownerWater, islandWaterRings, ringTester } from '../environment/waterways.js';
import { isOpen } from './region.js';
import { PointGrid } from './util.js';

const CELL = 16;
let G = null;
// WATER THE ENVIRONMENT KNOWS BUT RIVER DOES NOT (Vasilievsky Island, 2026-10-08; docs/research/vo-requests-landmarksAcademy.md 1, vo-requests-environment.md "-> streets" 1):
//   * the OWNER rings: the stair pits / descents / berths that the sight modules cut into the quay (environment/waterways.js ownerWater(): the Academy sphinx pier, the Mining descents, the Rumyantsev apron, the
//     Krusenstern stair, the Spit descent, the Shi-Tsza pit ...): the pavement stopped only at the baked RIVER polygon and hid the stairs under pavers (seen from the street the player met pavers, then the river);
//   * the ISLAND waters that are no RIVER record (islandWaterRings(): the Smolenka, Galerny harbour, the canal, the Kovsh, the Gulf, the Malaya Neva tail).
// Their edges join the facade grid with the flag 2 (a water edge like a RIVER edge: the strip stops 0.45 m before it; clearanceHit / facadeDist ignore them). Open districts only (region.js: an edge
// whose end points are not both open is not added). Bridge ways ignore the flag-2 edges (their pavements run over the water on purpose: the decks of Nalichny, Shkipersky, the Smolenka mouth ...), and a pavement
// that would START inside such a ring (asphalt that overhangs the shore) is not drawn.
let WR = null;
export const NO_WATER = (typeof location !== 'undefined' && String(new URLSearchParams(location.search).get('st') || '').includes('nowater')) || (typeof process !== 'undefined' && !!process.env && !!process.env.ST_NOWATER);     // debug: ?st=nowater (ST_NOWATER=1 in node) = the behaviour before the water rings
function waterRings() {
  if (WR) return WR;
  WR = [];
  if (NO_WATER) return WR;
  try {
    const raw = [...(typeof ownerWater === 'function' ? ownerWater().map((w) => ({ o: w.o, owner: true, id: w.id })) : []), ...(typeof islandWaterRings === 'function' ? islandWaterRings().map((o, i) => ({ o, owner: false, id: 'island' + i })) : [])];
    for (const r of raw) {
      const o = r.o; if (!o || o.length < 6) continue;
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); }
      WR.push({ id: r.id, owner: r.owner, o, b: [x0, x1, z0, z1], test: ringTester(o) });
    }
  } catch (e) { /* streets still loads without them */ }
  return WR;
}
/** true when (x, z) lies inside a water ring of the sights / the island (open districts only) */
export function inWaterRing(x, z) {
  if (!isOpen(x, z)) return false;
  for (const r of waterRings()) if (x >= r.b[0] && x <= r.b[1] && z >= r.b[2] && z <= r.b[3] && r.test(x, z)) return true;
  return false;
}
let WV = null;
/** the vertices of the water-ring edges that grid() holds (open districts), in a point grid of 32 m cells: the stations where a pavement strip's reach changes (walks.js planSide) */
export function waterVertices() {
  if (WV) return WV;
  WV = new PointGrid(32);
  for (const r of waterRings()) for (let i = 0; i < r.o.length; i += 2) if (isOpen(r.o[i], r.o[i + 1])) WV.add(r.o[i], r.o[i + 1]);
  return WV;
}
function grid() {
  if (G) return G;
  G = new Map();
  const add = (ax, az, bx, bz, riv = 0) => {
    const e = [ax, az, bx, bz, riv];
    const x0 = Math.floor(Math.min(ax, bx) / CELL), x1 = Math.floor(Math.max(ax, bx) / CELL), z0 = Math.floor(Math.min(az, bz) / CELL), z1 = Math.floor(Math.max(az, bz) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) { const k = cx * 4096 + cz; let l = G.get(k); if (!l) G.set(k, (l = [])); l.push(e); }
  };
  for (const p of L.groundFootprints()) for (const ring of [p.o, ...p.h]) for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) add(ring[j], ring[j + 1], ring[i], ring[i + 1]);
  // the Fontanka trench: pavements stop 0.45 m before the quay edge (the granite parapet / railing belongs to the embankment), facades hang on buildings only
  for (const r of RIVER || []) for (const p of r.polys || []) for (const ring of [p.o]) for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) add(ring[j], ring[j + 1], ring[i], ring[i + 1], 1);
  // grass slopes of the canals (Swan Canal, Moika at the Mikhailovsky Garden: environment/waterways.js slopeRings, water edge to slope top + 0.3 m): the pavement stops at the slope like at a quay
  try { for (const ring of typeof slopeRings === 'function' ? slopeRings() : []) for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) add(ring[j], ring[j + 1], ring[i], ring[i + 1], 1); } catch (e) { /* streets still loads without them */ }
  // the water of the sights and of the island (see waterRings above): flag 2
  for (const r of waterRings()) { const o = r.o; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (isOpen(o[j], o[j + 1]) && isOpen(o[i], o[i + 1])) add(o[j], o[j + 1], o[i], o[i + 1], 2); }
  return G;
}

/** distance along the ray (x,z) + t (dx,dz) to the first facade edge, up to maxD (returns maxD when clear). 0 when the start is inside a building.
 *  noWater: ignore the flag-2 water edges (bridge ways); a start inside a water ring of the sights / the island gives 0 unless noWater. info (optional object) receives { flag } = the flag of the edge that limits the answer
 *  (0 facade, 1 RIVER / slope edge, 2 owner / island water; undefined when nothing within maxD). */
export function clearance(x, z, dx, dz, maxD, noWater = false, info = null) {
  if (L.insideBuilding(x, z, 0)) return 0;
  if (!noWater && inWaterRing(x, z)) return 0;
  const g = grid(), seen = new Set();
  let best = maxD, flag;
  const ex = x + dx * maxD, ez = z + dz * maxD;
  const n = Math.ceil(maxD / (CELL * 0.5));
  for (let k = 0; k <= n; k++) {
    const px = x + (ex - x) * k / n, pz = z + (ez - z) * k / n, c = Math.floor(px / CELL) * 4096 + Math.floor(pz / CELL);
    const l = g.get(c); if (!l) continue;
    for (const e of l) {
      if (seen.has(e)) continue; seen.add(e);
      if (noWater && e[4] === 2) continue;
      const sx = e[2] - e[0], sz = e[3] - e[1], den = dx * sz - dz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((e[0] - x) * sz - (e[1] - z) * sx) / den, u = ((e[0] - x) * dz - (e[1] - z) * dx) / den;
      const tt = e[4] ? t - 0.45 : t;
      if (t >= 0 && tt < best && u >= 0 && u <= 1) { best = Math.max(0, tt); flag = e[4]; }
    }
  }
  if (info) info.flag = flag;
  return best;
}

/** like clearance(), but returns { t, e, x, z, nx, nz } (hit distance, facade edge [ax,az,bx,bz], hit point, wall normal facing the ray origin) or null */
export function clearanceHit(x, z, dx, dz, maxD) {
  const g = grid(), seen = new Set();
  let best = null;
  const ex = x + dx * maxD, ez = z + dz * maxD;
  const n = Math.ceil(maxD / (CELL * 0.5));
  for (let k = 0; k <= n; k++) {
    const px = x + (ex - x) * k / n, pz = z + (ez - z) * k / n, c = Math.floor(px / CELL) * 4096 + Math.floor(pz / CELL);
    const l = g.get(c); if (!l) continue;
    for (const e of l) {
      if (seen.has(e)) continue; seen.add(e);
      const sx = e[2] - e[0], sz = e[3] - e[1], den = dx * sz - dz * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((e[0] - x) * sz - (e[1] - z) * sx) / den, u = ((e[0] - x) * dz - (e[1] - z) * dx) / den;
      if (!e[4] && t >= 0 && t < maxD && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, e, u };
    }
  }
  if (!best) return null;
  const sx = best.e[2] - best.e[0], sz = best.e[3] - best.e[1], l = Math.hypot(sx, sz) || 1;
  let nx = sz / l, nz = -sx / l; if (nx * dx + nz * dz > 0) { nx = -nx; nz = -nz; }
  return { t: best.t, e: best.e, u: best.u, len: l, x: x + dx * best.t, z: z + dz * best.t, nx, nz };
}

/** distance from (x,z) to the nearest facade edge within r (r when none) */
export function facadeDist(x, z, r) {
  const g = grid(), seen = new Set();
  let best = r;
  const c0x = Math.floor((x - r) / CELL), c1x = Math.floor((x + r) / CELL), c0z = Math.floor((z - r) / CELL), c1z = Math.floor((z + r) / CELL);
  for (let cx = c0x; cx <= c1x; cx++) for (let cz = c0z; cz <= c1z; cz++) {
    const l = g.get(cx * 4096 + cz); if (!l) continue;
    for (const e of l) {
      if (seen.has(e) || e[4]) continue; seen.add(e);
      const dx = e[2] - e[0], dz = e[3] - e[1], l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - e[0]) * dx + (z - e[1]) * dz) / l2));
      const d = Math.hypot(x - e[0] - dx * t, z - e[1] - dz * t);
      if (d < best) best = d;
    }
  }
  return best;
}

export const inside = (x, z, r = 0) => L.insideBuilding(x, z, r);
