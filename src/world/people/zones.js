// people/zones.js - where people WANT to be (simulation half): the zone weight field zoneW(x, z) used by the spawner, the goal picker and the density plan.
// Source: docs/research/people.md S3 (people per 10 m of one pavement: Anichkov-Liteyny 7, Liteyny-Mayakovskogo 8, Mayakovskaya-Marata 11, Marata-Vosstaniya 11,
// Vosstaniya square 14, side streets 1.5-5, courtyards 0.5) and S4 (the 20 spots).  The field is a sum of a Nevsky corridor (distance to the avenue centre lines times a
// piecewise weight along the grid axis u) and gaussian hot spots (the square, the rotunda, the forecourt, Mayakovskaya, the Anichkov plinths ...).
// The hot spots are placed from the real landmark positions (layout.js / station frame), not from the +-25 m lat / lon of the research table.
import { makeFrame } from './frame.js';
import { ZONES } from '../lib/area-tables.js';

// the EAST part (u > -1250: Vosstaniya - Fontanka) is the original table of docs/research/people.md; the WEST part (u < -1250, grid u along Nevsky from Vosstaniya: Sadovaya -1647, Gostiny Dvor
// -1740, Kazan bridge -2043, Kazan colonnade -2100 .. -2200, Green Bridge -2430, Bolshaya Morskaya -2563, the Admiralty -2850) is the tourist centre of docs/research/west-life-furniture.md
// section 2.2: much denser than the east (Z1 Gostiny Dvor 9, Z3 the Kazan bridge 26, Z4 the Kazan colonnade 8, Z5 7, Z6 6, Z7 4 per 10 m of ONE pavement at 'default'; the weights below are
// those numbers x ~0.22 and then pushed up by the hot spots).
const TAB = ZONES.peopleCorridor;        // [[u, weight], ...] of the area module (src/world/area.js ZONES.peopleCorridor): the Nevsky corridor of the strip
const nevskyU = (u) => { if (!TAB.length) return 0; if (u <= TAB[0][0]) return TAB[0][1]; for (let i = 1; i < TAB.length; i++) if (u <= TAB[i][0]) { const a = TAB[i - 1], b = TAB[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; } return TAB[TAB.length - 1][1]; };

/** build the zone field; `L` = layout namespace, `roads` = streets.roads (the Nevsky carriageways are picked by name) */
export function makeZones(L, roads, stationFrame, ex = {}) {
  const { W } = makeFrame(stationFrame);
  const nev = L.NAMES.streets.nevsky, segs = [];
  for (const r of roads || []) {
    if (r.name !== nev || !r.pts) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; segs.push([a[0], a[1], b[0], b[1], Math.min(a[0], b[0]) - 70, Math.max(a[0], b[0]) + 70, Math.min(a[1], b[1]) - 70, Math.max(a[1], b[1]) + 70]); }
  }
  // 64 m grid over the (70 m expanded) segment boxes: dNev is evaluated hundreds of thousands of times while the density fields are built
  const GC = 64, grid = new Map();
  segs.forEach((s, i) => { for (let cx = Math.floor(s[4] / GC); cx <= Math.floor(s[5] / GC); cx++) for (let cz = Math.floor(s[6] / GC); cz <= Math.floor(s[7] / GC); cz++) { const k = cx * 4096 + cz; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i); } });
  const dNev0 = (x, z) => {
    let best = 1e9;
    const cand = grid.get(Math.floor(x / GC) * 4096 + Math.floor(z / GC)); if (!cand) return best;
    for (let n = 0; n < cand.length; n++) {
      const s = segs[cand[n]]; if (x < s[4] || x > s[5] || z < s[6] || z > s[7]) continue;
      const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)), d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
      if (d < best) best = d;
    }
    return best;
  };
  // the distance to the avenue as a 8 m field (bilinear, 130 m reach): the exact search above walks ~30 segments per call and runs ~10^6 times while the lattice is built
  const DF = 8, DR = 130; let dX0 = 1e9, dX1 = -1e9, dZ0 = 1e9, dZ1 = -1e9;
  for (const s of segs) { dX0 = Math.min(dX0, s[0], s[2]); dX1 = Math.max(dX1, s[0], s[2]); dZ0 = Math.min(dZ0, s[1], s[3]); dZ1 = Math.max(dZ1, s[1], s[3]); }
  const dW = Math.max(2, Math.ceil((dX1 - dX0 + 2 * DR) / DF) + 1), dH = Math.max(2, Math.ceil((dZ1 - dZ0 + 2 * DR) / DF) + 1), dOX = dX0 - DR, dOZ = dZ0 - DR, dField = new Float32Array(segs.length ? dW * dH : 4).fill(DR + 1);
  if (segs.length) for (let j = 0; j < dH; j++) for (let i = 0; i < dW; i++) { const d = dNev0(dOX + i * DF, dOZ + j * DF); dField[j * dW + i] = d < DR + 1 ? d : DR + 1; }
  const dNev = (x, z) => {
    if (!segs.length) return 1e9;
    const fu = (x - dOX) / DF, fv = (z - dOZ) / DF; if (fu < 0 || fv < 0 || fu >= dW - 1 || fv >= dH - 1) return 1e9;
    const i = Math.floor(fu), j = Math.floor(fv), a = fu - i, b = fv - j, k = j * dW + i;
    const d = (dField[k] * (1 - a) + dField[k + 1] * a) * (1 - b) + (dField[k + dW] * (1 - a) + dField[k + dW + 1] * a) * b;
    return d > DR ? 1e9 : d;
  };
  const f = (u, d) => W(u, d);
  /** [x, z, amplitude, sigma]: the hot spots of the area (ZONES.peopleHot of the area module; a { u, d, a, s } row is a spot in the station frame, the strip's castle and Palace Bridge spots included) */
  const HOT = ZONES.peopleHot.map((h) => (Array.isArray(h) ? h.slice() : [...f(h.u, h.d), h.a, h.s]));
  // the hot spots in a 32 m grid (every cell lists the spots whose 3 sigma box touches it): zoneW is called ~10^6 times while the lattice is built
  const HG = 32, hgrid = new Map(), HK = (cx, cz) => cx * 8192 + cz;
  HOT.forEach((h, i) => { const r = 3 * h[3]; for (let cx = Math.floor((h[0] - r) / HG); cx <= Math.floor((h[0] + r) / HG); cx++) for (let cz = Math.floor((h[1] - r) / HG); cz <= Math.floor((h[1] + r) / HG); cz++) { const k = HK(cx, cz); let a = hgrid.get(k); if (!a) hgrid.set(k, (a = [])); a.push(i); } });
  const zoneW = (x, z) => {
    let w = 0.06;
    if (ex.area) w += ex.area.weight(x, z);
    const d = dNev(x, z); if (d < 120) { const g = L.toGrid(x, z); w += 1.1 * nevskyU(g.u) * Math.exp(-(d * d) / (46 * 46)); }
    const cell = hgrid.get(HK(Math.floor(x / HG), Math.floor(z / HG)));
    if (cell) for (let q = 0; q < cell.length; q++) { const h = HOT[cell[q]], dx = x - h[0], dz = z - h[1]; if (dx > 3 * h[3] || dx < -3 * h[3] || dz > 3 * h[3] || dz < -3 * h[3]) continue; w += h[2] * Math.exp(-(dx * dx + dz * dz) / (h[3] * h[3])); }
    return w;
  };
  return { zoneW, HOT, dNev };
}
