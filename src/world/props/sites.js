// props/sites.js - placement helpers shared by the placement modules (from the Yakutsk props/sites.js): nearest wall with its outward normal, the polyline walker, station grid.
import * as L from '../layout.js';
import { nearestOnRing, ringHas, clamp } from './kit.js';

const _box = new WeakMap();
const boxOf = (o) => { let b = _box.get(o); if (!b) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } b = [x0, x1, z0, z1]; _box.set(o, b); } return b; };

/** rotY of a model (front = +Z) that faces the world direction (dx, dz) */
export const faceRot = (dx, dz) => Math.atan2(dx, dz);

// the footprint rings in a 32 m hash grid (built once): nearestWall / insideFp walk only the cells around the query instead of every footprint of the map
const GC = 32; let _wg = null, _wgSrc = null, _call = 0;
function wallGrid() {
  const fps = L.groundFootprints();
  if (_wg && _wgSrc === fps) return _wg;
  const g = new Map();
  for (const p of fps) for (const o of [p.o, ...p.h]) {
    const b = boxOf(o), e = { o, b, p, hole: o !== p.o, mark: 0 };
    for (let i = Math.floor(b[0] / GC); i <= Math.floor(b[1] / GC); i++) for (let j = Math.floor(b[2] / GC); j <= Math.floor(b[3] / GC); j++) { const k = i + ',' + j; let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(e); }
  }
  _wg = g; _wgSrc = fps; return g;
}
/** exact "inside a ground building" test (outer ring yes, courtyard hole no) through the grid */
export function insideFp(x, z) {
  const a = wallGrid().get(Math.floor(x / GC) + ',' + Math.floor(z / GC)); if (!a) return false;
  for (const e of a) { if (e.hole) continue; const b = e.b; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (ringHas(e.o, x, z) && !e.p.h.some((h) => ringHas(h, x, z))) return true; }
  return false;
}

/** nearest footprint wall of a ground building within maxD: { x, z, nx, nz (outward unit normal), tx, tz (wall tangent), d, len, ring } or null.
 *  Courtyard holes count as walls too (their outward normal points into the yard). */
export function nearestWall(x, z, maxD = 10) {
  const g = wallGrid(), id = ++_call; let best = null;
  for (let i = Math.floor((x - maxD) / GC); i <= Math.floor((x + maxD) / GC); i++) for (let j = Math.floor((z - maxD) / GC); j <= Math.floor((z + maxD) / GC); j++) {
    const a = g.get(i + ',' + j); if (!a) continue;
    for (const e of a) {
      if (e.mark === id) continue; e.mark = id;
      const b = e.b; if (x < b[0] - maxD || x > b[1] + maxD || z < b[2] - maxD || z > b[3] + maxD) continue;
      const q = nearestOnRing(e.o, x, z);
      if (q.d < maxD && (!best || q.d < best.d)) best = { ...q, ring: e.o, hole: e.hole, poly: e.p };
    }
  }
  if (!best) return null;
  // outward normal: the side of the wall tangent where the point is NOT inside the building
  let nx = best.tz, nz = -best.tx;
  const sx = best.x + nx * 0.3, sz = best.z + nz * 0.3;
  if (insideFp(sx, sz)) { nx = -nx; nz = -nz; }
  best.nx = nx; best.nz = nz;
  return best;
}

/** nearest point of the streets' pavement / mapped footways around (x,z): { x, z, tx, tz, dist } or null */
export function nearestWalk(S, x, z, maxD = 20) {
  const st = S.st; return st && st.nearestSidewalk ? st.nearestSidewalk(x, z, maxD) : null;
}

/** walk along stations (grouped by their `line`), calling spec.try(st) roughly every spec.gap(st) metres; spec.first() gives the random phase of a line */
export function walk(sts, spec) {
  let lastLine = -1, next = 0, n = 0;
  for (const st of sts) {
    if (st.line !== lastLine) { lastLine = st.line; next = st.s + spec.first(st); }
    if (st.s < next) continue;
    if (spec.try(st)) { next = st.s + spec.gap(st); n++; } else next = st.s + 1.5;
  }
  return n;
}

const G = 12;                                                           // station grid cell
export function stationGrid(sts) {
  const g = new Map();
  sts.forEach((s, i) => { const k = Math.floor(s.x / G) + ',' + Math.floor(s.z / G); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(i); });
  return {
    near(x, z, r, filter = null) {
      const out = [];
      for (let i = Math.floor((x - r) / G); i <= Math.floor((x + r) / G); i++) for (let j = Math.floor((z - r) / G); j <= Math.floor((z + r) / G); j++) for (const k of g.get(i + ',' + j) || []) { const s = sts[k]; const d = Math.hypot(s.x - x, s.z - z); if (d <= r && (!filter || filter(s))) out.push({ s, d }); }
      return out.sort((a, b) => a.d - b.d);
    },
  };
}

/** classification of the street a station belongs to: nevsky (the avenue), main (Ligovsky, Liteyny, Vladimirsky, Suvorovsky ... wide streets), quay (Fontanka embankment), canal (the other embankments of the west), side (the rest), yard */
export const streetClass = (st) => {
  const n = st.rn || '';
  if (n === 'Невский проспект') return 'nevsky';
  if (/Фонтанки/.test(n)) return 'quay';
  if (/набережная|Грибоедова|Мойки/.test(n)) return 'canal';                                  // the west embankments (Moika, Griboedov Canal, Palace / Admiralty / University quays)
  if (!n) return 'yard';
  if (st.hw === 'primary' || st.hw === 'secondary') return 'main';
  return 'side';
};
export { clamp, ringHas };
