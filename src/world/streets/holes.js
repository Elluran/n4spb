// streets/holes.js - NO PAVING OVER AN OPEN METRO STAIR PIT (pure data + index surgery, no three.js, runs in node).
// layout.GROUND_HOLES = the rectangles where the ground is open: the stair pits of the street entrances (kind 'stairs': the four Nevsky Prospekt pits, the three stairs of Sportivnaya) and the
// escalator shafts under the vestibules (kind 'escalator': they lie under a building and are not touched here). environment/ground.js cuts its ground mesh there (groundCuts) and the metro
// module draws the stairwell; the generators of this module know nothing about them, so a pavement band, a corner patch, block paving or a mapped flight of steps (paths.js, OSM
// highway=steps: the stairs themselves are mapped as ways) was laid straight across the open stairwell.
// Rule (lead, 2026-10-06, EVERY district: it heals a visible defect of the reviewed Nevsky pits too): inside a stair-pit rectangle grown by GROW metres the streets module lays no WALKING
// surface (pavement slabs / pavers / kerb band, corner patches, ramps, skirts, mapped footways and steps, paving areas, lots). It is applied to the finished builders (cutHoles): every
// triangle that really reaches into a rectangle (separating-axis test first: a triangle that only comes near is left alone, no needless splits) is clipped by its four vertical planes
// (3D Sutherland-Hodgman, so vertical skirts are cut as well), the part inside is dropped, new vertices take interpolated normals / uvs / colours. Works on util.js MB and
// lib/massing.js MeshBuilder (same arrays).
// THE CARRIAGEWAY IS NEVER CUT (asphalt, kerb stones, gutter, wear, paint): the road the car drives on stays whole. Where the data put a pit mouth under the road edge (Nevsky pits 3 and 4
// reach 0.27 / 0.49 m into the asphalt of the south carriageway) the kerb and the asphalt run on over it: the pit has to move, not the kerb (docs/research/petro-requests-streets.md).
import * as L from '../layout.js';

export const GROW = 0.3;
/** the stair-pit rectangles: { id, b: [x0, x1, z0, z1], pts: [[x, z] x 4], e: [[ax, az, nx, nz] x 4] } with the unit normals pointing OUT of the rectangle (inside = behind all four) */
export const HOLES = (L.GROUND_HOLES || []).filter((h) => h.kind === 'stairs').map((h) => {
  const c = Math.cos(h.rotY || 0), s = Math.sin(h.rotY || 0), hw = h.w / 2 + GROW, hd = h.d / 2 + GROW;
  const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([lx, lz]) => [h.x + lx * c + lz * s, h.z - lx * s + lz * c]);      // (the same frame as environment/ground.js groundCuts)
  const e = [];
  for (let i = 0; i < 4; i++) {
    const a = pts[i], b = pts[(i + 1) % 4], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
    let nx = dz / l, nz = -dx / l; if ((h.x - a[0]) * nx + (h.z - a[1]) * nz > 0) { nx = -nx; nz = -nz; }                              // away from the centre
    e.push([a[0], a[1], nx, nz]);
  }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  return { id: h.id, b: [x0, x1, z0, z1], pts, e };
});
const X0 = Math.min(1e9, ...HOLES.map((h) => h.b[0])), X1 = Math.max(-1e9, ...HOLES.map((h) => h.b[1])), Z0 = Math.min(1e9, ...HOLES.map((h) => h.b[2])), Z1 = Math.max(-1e9, ...HOLES.map((h) => h.b[3]));

/** the stair pit whose grown rectangle contains (x, z), or null */
export function holeAt(x, z) {
  if (x < X0 || x > X1 || z < Z0 || z > Z1) return null;
  for (const h of HOLES) {
    if (x < h.b[0] || x > h.b[1] || z < h.b[2] || z > h.b[3]) continue;
    let ins = true; for (const [ax, az, nx, nz] of h.e) if ((x - ax) * nx + (z - az) * nz > 0) { ins = false; break; }
    if (ins) return h;
  }
  return null;
}

const EPS = 1e-6;
/** does the triangle (plan view) reach into the rectangle of hole h by more than a hair? separating axes: the four rectangle edges, then the three triangle edges */
function reaches(h, ax, az, bx, bz, cx, cz) {
  for (const [ex, ez, nx, nz] of h.e) if ((ax - ex) * nx + (az - ez) * nz >= -EPS && (bx - ex) * nx + (bz - ez) * nz >= -EPS && (cx - ex) * nx + (cz - ez) * nz >= -EPS) return false;
  const T = [[ax, az, bx, bz, cx, cz], [bx, bz, cx, cz, ax, az], [cx, cz, ax, az, bx, bz]];
  for (const [px, pz, qx, qz, rx, rz] of T) {
    const nx = -(qz - pz), nz = qx - px, l = Math.hypot(nx, nz); if (l < 1e-9) continue;
    const side = ((rx - px) * nx + (rz - pz) * nz) / l;                 // where the third vertex lies (0: a vertical face seen from above = a segment)
    let lo = 1e9, hi = -1e9; for (const p of h.pts) { const d = ((p[0] - px) * nx + (p[1] - pz) * nz) / l; if (d < lo) lo = d; if (d > hi) hi = d; }
    if (side > EPS ? hi <= EPS : side < -EPS ? lo >= -EPS : (lo >= -EPS || hi <= EPS)) return false;
  }
  return true;
}

/** Cut the stair-pit rectangles out of a mesh builder (pos / nrm / uv / [col] / idx arrays). Returns the number of triangles that were cut or dropped. */
export function cutHoles(b) {
  if (!HOLES.length || !b || !b.idx || !b.idx.length) return 0;
  const P = b.pos, I = b.idx; let out = null, touched = 0;
  const mixVert = (i, j, t) => {                                        // a new vertex on the edge i -> j at t
    const k = b.n++;
    for (let c = 0; c < 3; c++) P.push(P[3 * i + c] + (P[3 * j + c] - P[3 * i + c]) * t);
    if (b.nrm) for (let c = 0; c < 3; c++) b.nrm.push(b.nrm[3 * i + c] + (b.nrm[3 * j + c] - b.nrm[3 * i + c]) * t);
    if (b.uv) for (let c = 0; c < 2; c++) b.uv.push(b.uv[2 * i + c] + (b.uv[2 * j + c] - b.uv[2 * i + c]) * t);
    if (b.col) for (let c = 0; c < 3; c++) b.col.push(b.col[3 * i + c] + (b.col[3 * j + c] - b.col[3 * i + c]) * t);
    return k;
  };
  for (let t = 0; t < I.length; t += 3) {
    const i0 = I[t], i1 = I[t + 1], i2 = I[t + 2];
    const ax = P[3 * i0], az = P[3 * i0 + 2], bx = P[3 * i1], bz = P[3 * i1 + 2], cx = P[3 * i2], cz = P[3 * i2 + 2];
    const x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx), x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx);
    let hit = null;
    if (!(x1 < X0 || x0 > X1)) {
      const z0 = az < bz ? (az < cz ? az : cz) : (bz < cz ? bz : cz), z1 = az > bz ? (az > cz ? az : cz) : (bz > cz ? bz : cz);
      if (!(z1 < Z0 || z0 > Z1)) for (const h of HOLES) if (!(x1 < h.b[0] || x0 > h.b[1] || z1 < h.b[2] || z0 > h.b[3]) && reaches(h, ax, az, bx, bz, cx, cz)) (hit ||= []).push(h);
    }
    if (!hit) { if (out) out.push(i0, i1, i2); continue; }
    if (!out) out = I.slice(0, t);                                      // (the first triangle in a pit: from here on the index list is rewritten)
    touched++;
    let pieces = [[i0, i1, i2]];
    for (const h of hit) {
      const next = [];
      for (const piece of pieces) {
        let rest = piece;                                               // the part of the piece that is still behind every edge tested so far
        for (const [ex, ez, nx, nz] of h.e) {
          const d = rest.map((v) => (P[3 * v] - ex) * nx + (P[3 * v + 2] - ez) * nz);
          if (d.every((q) => q >= -EPS)) { next.push(rest); rest = null; break; }           // wholly outside this edge: kept as it is
          if (d.every((q) => q <= EPS)) continue;                                           // wholly behind it: the next edge decides
          const o = [], n = [];
          for (let k = 0; k < rest.length; k++) {
            const u = rest[k], v = rest[(k + 1) % rest.length], du = d[k], dv = d[(k + 1) % rest.length];
            if (du >= -EPS) o.push(u); if (du <= EPS) n.push(u);
            if ((du > EPS && dv < -EPS) || (du < -EPS && dv > EPS)) { const m = mixVert(u, v, du / (du - dv)); o.push(m); n.push(m); }
          }
          if (o.length >= 3) next.push(o);
          rest = n;
          if (rest.length < 3) { rest = null; break; }
        }
        // (a rest that is behind all four edges lies inside the pit: dropped)
      }
      pieces = next;
    }
    for (const p of pieces) for (let k = 1; k + 1 < p.length; k++) out.push(p[0], p[k], p[k + 1]);
  }
  if (out) b.idx = out;
  return touched;
}
