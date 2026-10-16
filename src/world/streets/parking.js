// streets/parking.js - where cars can be parked: the parallel pockets along the kerbs of the side streets (net.js parkPolicy: OSM parkingLane tags + the paid-parking streets of
// docs/research/transport.md section 8) and the PARKING polygons (lots packed with 2.5 x 5 m slots in rows). Pure data: [{ x, z, rotY, kind, road?, lot? }].
// rotY: the direction the car FACES (model +Z). The traffic module decides how many slots are filled. Slots outside the data extent (the union of the strip's rectangles grown by 120 m,
// layout.inExtent: the 70 m run-on of a main street past the clip line, net.js rawWays) are not planned: the traffic module would fill them with cars for nothing.
import { PARKING } from '../data/city.js';
import { wayAt } from './net.js';
import * as L from '../layout.js';

const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };

export function planParking(net) {
  const slots = [], lines = [], seen = new Set();
  const addLine = (x0, z0, x1, z1) => { const k = Math.round(x0 * 2) + ',' + Math.round(z0 * 2) + ',' + Math.round(x1 * 2) + ',' + Math.round(z1 * 2); if (seen.has(k)) return; seen.add(k); lines.push([x0, z0, x1, z1]); };
  // ---- pockets along the kerbs
  for (const w of net.ways) {
    if (!w.parkOri) continue;
    const perp = w.parkOri !== 'parallel', step = perp ? 2.5 : 6.2;
    for (const side of ['L', 'R']) {
      const sg = side === 'R' ? 1 : -1, park = side === 'R' ? w.parkR : w.parkL;
      if (!park.some((v) => v > 1)) continue;
      for (let s = 2; s < w.L - 2; s += step) {
        const q = wayAt(w, s), d = side === 'R' ? q.parkR : q.parkL;
        if (d < (perp ? 4.6 : 2.2)) continue;
        const e = side === 'R' ? q.hR : q.hL, nx = -q.tz * sg, nz = q.tx * sg, off = e - d / 2;
        const x = q.x + nx * off, z = q.z + nz * off;
        if (net.cover(x, z, { skip: w }) > -0.5) continue;
        // perpendicular bays: nose to the kerb; parallel bays: facing the travel direction of the lane next to them
        const rotY = perp ? Math.atan2(nx, nz) : Math.atan2(q.tx * sg, q.tz * sg);
        slots.push({ x, z, rotY, kind: perp ? 'bay' : 'parallel', road: w.id, side: side === 'R' ? 'right' : 'left', nx, nz, depth: d });
      }
    }
  }
  // ---- lots
  let lot = 0;
  for (const p of PARKING) {
    for (const poly of p.polys || []) {
      const o = poly.o; if (o.length < 6) continue;
      // main axis = the longest edge
      let best = 0, ang = 0;
      for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const l = Math.hypot(o[i] - o[j], o[i + 1] - o[j + 1]); if (l > best) { best = l; ang = Math.atan2(o[i + 1] - o[j + 1], o[i] - o[j]); } }
      const c = Math.cos(ang), s = Math.sin(ang);
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (let i = 0; i < o.length; i += 2) { const u = o[i] * c + o[i + 1] * s, v = -o[i] * s + o[i + 1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
      if ((u1 - u0) < 4 || (v1 - v0) < 2.2) continue;
      const forecourt = p.id === 'r13353280';                          // the Moscow station forecourt: a paved drop-off plaza, cars stand only at the two ends (docs/research/station.md)
      // road clearance rule: a lot slot never stands in a street (rank >= 1; the aisles of rank-0 service ways inside a lot are the lot's own driveways)
      const inside = (u, v) => { const x = u * c - v * s, z = u * s + v * c; if (forecourt && x > 572 && x < 655) return false; return ringHas(o, x, z) && !poly.h.some((h) => ringHas(h, x, z)) && !L.insideBuilding(x, z, 0) && net.cover(x, z, { noFillets: true, minRank: 1 }) <= 0.5; };
      const lotId = p.id + '#' + (lot++);
      const span = v1 - v0, deep = span >= 5.4;                     // wide lots: bays at right angles to the long edge; narrow ones: parallel along it
      if (deep) {
        // [aisle 6 | row 5 | row 5] repeated: the rows of a pair stand back to back, every row faces its aisle; a lot too shallow for an aisle gets one row
        const rows = [];
        if (span >= 11) for (let base = v0; base + 8.5 <= v1 - 0.5; base += 16) { rows.push([base + 8.5, -1]); if (base + 13.5 <= v1 - 0.5) rows.push([base + 13.5, 1]); }
        else rows.push([v0 + 2.6, -1]);
        for (const [v, face] of rows) {
          for (let u = u0 + 1.4; u + 1.3 <= u1; u += 2.5) {
            const ok = [[0, 0], [-1.1, 0], [1.1, 0], [0, -2.2], [0, 2.2]].every(([du, dv]) => inside(u + du, v + dv));
            if (!ok) continue;
            const x = u * c - v * s, z = u * s + v * c;
            slots.push({ x, z, rotY: Math.atan2(-s * face, c * face), kind: 'lot', lot: lotId });
            for (const du of [-1.25, 1.25]) { const uu = u + du; addLine((uu * c - (v - 2.5) * s), (uu * s + (v - 2.5) * c), (uu * c - (v + 2.5) * s), (uu * s + (v + 2.5) * c)); }
          }
        }
      } else {
        const v = (v0 + v1) / 2;
        for (let u = u0 + 3.2; u + 3 <= u1; u += 6.2) {
          if (![[0, 0], [-2.4, 0], [2.4, 0], [0, -0.9], [0, 0.9]].every(([du, dv]) => inside(u + du, v + dv))) continue;
          const x = u * c - v * s, z = u * s + v * c;
          slots.push({ x, z, rotY: Math.atan2(c, s), kind: 'lot', lot: lotId });
        }
      }
    }
  }
  const result = slots.filter((s) => L.inExtent(s.x, s.z));
  result.lines = lines.filter((p) => L.inExtent((p[0] + p[2]) / 2, (p[1] + p[3]) / 2));
  return result;
}
