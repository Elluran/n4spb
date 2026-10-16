// streets/waterclip.js - NO PAVING OVER THE STAIR PITS THAT THE SIGHTS CUT INTO THE QUAY (index surgery on the finished builders, no GPU, runs in node).
// environment/waterways.js ownerWater() = the rings that a sight module hands to the water owner through WATER_RINGS (the Academy sphinx stair, the Mining descents, the Rumyantsev apron, the
// Krusenstern stair, the Spit descent, the Shi-Tsza pit ...): the ground there is cut and the module draws walls, flights and colliders. bld.js grid() stops the pavement STRIPS 0.45 m before such a
// ring; the other walking surfaces know nothing about it: a mapped footway ribbon (paths.js, 0.04), a raised paving area (0.10: the OSM polygon of the Shi-Tsza platform), a corner patch, a lot,
// the skirt of a pavement. They are clipped here, exactly at the ring edge, like holes.js clips the metro stair pits (the same 3D Sutherland-Hodgman cut of the triangle by the planes of
// convex pieces, so vertical skirts are cut as well; new vertices take interpolated normals / uvs / colours).
// The ring (any simple polygon, concave allowed: the T-shaped sphinx pit) is triangulated once (earcut); every piece is a convex triangle with the same edge format as holes.js, hashed in 24 m cells.
// Two families: 'owner' (ownerWater(): cut from EVERY walking surface) and 'island' (islandWaterRings(): the Smolenka, Galerny harbour, the canal, the Kovsh, the Gulf, the Malaya Neva tail: cut from the mapped
// footways, steps and paving areas only; the pavement STRIPS of the island waters are clipped by reach in walks.js planSide and the bridge ways are exempt, because the pavements of a deck that the bridges
// module has not drawn yet run over the water on purpose). Open districts only (region.js): a piece whose centroid is not open is not cut. THE CARRIAGEWAY IS NEVER PASSED HERE (asphalt, kerb stones, paint).
import * as THREE from 'three';
import { ownerWater, islandWaterRings } from '../environment/waterways.js';
import { isOpen } from './region.js';
import { NO_WATER } from './bld.js';

const EPS = 1e-6, CS = 24;

/** does the triangle (plan view) reach into the convex piece by more than a hair? separating axes: the piece edges, then the triangle edges (as holes.js) */
function reaches(h, ax, az, bx, bz, cx, cz) {
  for (const [ex, ez, nx, nz] of h.e) if ((ax - ex) * nx + (az - ez) * nz >= -EPS && (bx - ex) * nx + (bz - ez) * nz >= -EPS && (cx - ex) * nx + (cz - ez) * nz >= -EPS) return false;
  const T = [[ax, az, bx, bz, cx, cz], [bx, bz, cx, cz, ax, az], [cx, cz, ax, az, bx, bz]];
  for (const [px, pz, qx, qz, rx, rz] of T) {
    const nx = -(qz - pz), nz = qx - px, l = Math.hypot(nx, nz); if (l < 1e-9) continue;
    const side = ((rx - px) * nx + (rz - pz) * nz) / l;
    let lo = 1e9, hi = -1e9; for (const p of h.pts) { const d = ((p[0] - px) * nx + (p[1] - pz) * nz) / l; if (d < lo) lo = d; if (d > hi) hi = d; }
    if (side > EPS ? hi <= EPS : side < -EPS ? lo >= -EPS : (lo >= -EPS || hi <= EPS)) return false;
  }
  return true;
}

const cutters = {};
function cutter(kind) {
  if (cutters[kind]) return cutters[kind];
  let PIECES = null, GRID = null, BOX = null;
  const build = () => {
    if (PIECES) return;
    PIECES = []; GRID = new Map(); BOX = [1e9, -1e9, 1e9, -1e9];
    let rings = [];
    try { rings = NO_WATER ? [] : kind === 'owner' ? (typeof ownerWater === 'function' ? ownerWater() : []) : (typeof islandWaterRings === 'function' ? islandWaterRings().map((o, i) => ({ id: 'island' + i, o })) : []); } catch (e) { rings = []; }
    for (const r of rings) {
      const o = r.o; if (!o || o.length < 6) continue;
      const pts = []; for (let i = 0; i < o.length; i += 2) pts.push([o[i], o[i + 1]]);
      if (pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
      let tris = [];
      try { tris = THREE.ShapeUtils.triangulateShape(pts.map((p) => new THREE.Vector2(p[0], p[1])), []); } catch (e) { tris = []; }
      for (const [ia, ib, ic] of tris) {
        const P = [pts[ia], pts[ib], pts[ic]];
        const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cz = (P[0][1] + P[1][1] + P[2][1]) / 3;
        if (!isOpen(cx, cz)) continue;
        const area = Math.abs((P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0])) / 2; if (area < 1e-5) continue;
        const e = [];
        for (let i = 0; i < 3; i++) {
          const a = P[i], b = P[(i + 1) % 3], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
          let nx = dz / l, nz = -dx / l; if ((cx - a[0]) * nx + (cz - a[1]) * nz > 0) { nx = -nx; nz = -nz; }              // unit normal pointing OUT of the piece (inside = behind all three)
          e.push([a[0], a[1], nx, nz]);
        }
        const h = { id: r.id, b: [Math.min(P[0][0], P[1][0], P[2][0]), Math.max(P[0][0], P[1][0], P[2][0]), Math.min(P[0][1], P[1][1], P[2][1]), Math.max(P[0][1], P[1][1], P[2][1])], pts: P, e };
        const k = PIECES.length; PIECES.push(h);
        BOX[0] = Math.min(BOX[0], h.b[0]); BOX[1] = Math.max(BOX[1], h.b[1]); BOX[2] = Math.min(BOX[2], h.b[2]); BOX[3] = Math.max(BOX[3], h.b[3]);
        for (let gx = Math.floor(h.b[0] / CS); gx <= Math.floor(h.b[1] / CS); gx++) for (let gz = Math.floor(h.b[2] / CS); gz <= Math.floor(h.b[3] / CS); gz++) { const key = gx * 8192 + gz; let l = GRID.get(key); if (!l) GRID.set(key, (l = [])); l.push(k); }
      }
    }
  };
  const at = (x, z) => {
    build();
    if (x < BOX[0] || x > BOX[1] || z < BOX[2] || z > BOX[3]) return false;
    for (const k of GRID.get(Math.floor(x / CS) * 8192 + Math.floor(z / CS)) || []) {
      const h = PIECES[k]; if (x < h.b[0] || x > h.b[1] || z < h.b[2] || z > h.b[3]) continue;
      let ins = true; for (const [ax, az, nx, nz] of h.e) if ((x - ax) * nx + (z - az) * nz > 0) { ins = false; break; }
      if (ins) return true;
    }
    return false;
  };
  const cut = (b) => {
    build();
    if (!PIECES.length || !b || !b.idx || !b.idx.length) return 0;
    const P = b.pos, I = b.idx; let out = null, touched = 0;
    const mixVert = (i, j, t) => {
      const k = b.n++;
      for (let c = 0; c < 3; c++) P.push(P[3 * i + c] + (P[3 * j + c] - P[3 * i + c]) * t);
      if (b.nrm) for (let c = 0; c < 3; c++) b.nrm.push(b.nrm[3 * i + c] + (b.nrm[3 * j + c] - b.nrm[3 * i + c]) * t);
      if (b.uv) for (let c = 0; c < 2; c++) b.uv.push(b.uv[2 * i + c] + (b.uv[2 * j + c] - b.uv[2 * i + c]) * t);
      if (b.col) for (let c = 0; c < 3; c++) b.col.push(b.col[3 * i + c] + (b.col[3 * j + c] - b.col[3 * i + c]) * t);
      return k;
    };
    const nTri = I.length;
    for (let t = 0; t < nTri; t += 3) {
      const i0 = I[t], i1 = I[t + 1], i2 = I[t + 2];
      const ax = P[3 * i0], az = P[3 * i0 + 2], bx = P[3 * i1], bz = P[3 * i1 + 2], cx = P[3 * i2], cz = P[3 * i2 + 2];
      const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
      let hit = null;
      if (!(x1 < BOX[0] || x0 > BOX[1] || z1 < BOX[2] || z0 > BOX[3])) {
        const seen = new Set();
        for (let gx = Math.floor(x0 / CS); gx <= Math.floor(x1 / CS); gx++) for (let gz = Math.floor(z0 / CS); gz <= Math.floor(z1 / CS); gz++) for (const k of GRID.get(gx * 8192 + gz) || []) {
          if (seen.has(k)) continue; seen.add(k);
          const h = PIECES[k];
          if (!(x1 < h.b[0] || x0 > h.b[1] || z1 < h.b[2] || z0 > h.b[3]) && reaches(h, ax, az, bx, bz, cx, cz)) (hit ||= []).push(h);
        }
      }
      if (!hit) { if (out) out.push(i0, i1, i2); continue; }
      if (!out) out = I.slice(0, t);
      touched++;
      let parts = [[i0, i1, i2]];
      for (const h of hit) {
        const next = [];
        for (const piece of parts) {
          let rest = piece;
          for (const [ex, ez, nx, nz] of h.e) {
            const d = rest.map((v) => (P[3 * v] - ex) * nx + (P[3 * v + 2] - ez) * nz);
            if (d.every((q) => q >= -EPS)) { next.push(rest); rest = null; break; }
            if (d.every((q) => q <= EPS)) continue;
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
        }
        parts = next;
      }
      for (const p of parts) for (let k = 1; k + 1 < p.length; k++) out.push(p[0], p[k], p[k + 1]);
    }
    if (out) b.idx = out;
    return touched;
  };
  return (cutters[kind] = { at, cut });
}

/** Cut the stair pits / descents that the SIGHTS own (ownerWater rings) out of a mesh builder (pos / nrm / uv / [col] / idx arrays: util.js MB or lib/massing.js MeshBuilder). Returns the number of triangles cut or dropped. */
export const cutWaters = (b) => cutter('owner').cut(b);
/** the same for the island waters that are no RIVER record (Smolenka, harbour, canal, Kovsh, Gulf): for the mapped footways, steps and paving areas (never for the pavement strips: bridge decks) */
export const cutIslandWaters = (b) => cutter('island').cut(b);
/** true when (x, z) lies inside an owner ring (open districts) */
export const waterOwnerAt = (x, z) => cutter('owner').at(x, z);
