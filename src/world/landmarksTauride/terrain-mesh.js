// landmarksTauride/terrain-mesh.js - the GROUND SURFACE of the Tauride Garden as a mesh (docs/TAURIDE-REMAKE.md, phase T2 the land relief, phase T3 the whole floor). planTerrain() is PURE (no scene: tools and tests measure it);
// buildTerrain() makes the meshes.
// The surface is the pure height function gardenHeight (height.js) sampled by an adaptive, crack-free, 2:1-balanced quadtree over a 1 m lattice: leaves of 1 .. 16 m, a leaf is split while the best of its two diagonal
// triangulations is more than TOL (4 cm) away from gardenHeight on a 1 m sample lattice, and a leaf next to a leaf of half its size gets that neighbour's midpoint as a vertex (no T-junction cracks, also across the 64 m chunk
// borders: both chunks hold the same vertices there). Two modes:
//   RELIEF ONLY (T2, the default of planTerrain): a leaf whose samples are all below `drop` (2 cm) is dropped (no triangles where the ground is flat) and a leaf across the foot of the relief splits down to `edge` (2 m) so that
//     the mesh hugs the lifted ground. The mode of the tests of the relief and of a headless build of the builder alone.
//   COVER (T3, `o.cover` = the convex pieces of the garden outline, gardenPieces()): the mesh is the WHOLE FLOOR of the garden, hills and flat lawn alike: every leaf that touches the polygon is kept (flat ground is a big leaf of
//     16 m, two triangles), the leaves that cross the outline are clipped to it EXACTLY (each emitted triangle is clipped against the convex pieces of the polygon: convex x convex, the canonical cut points of
//     environment/clip.js, so neighbours get bit-identical vertices), so nothing lies outside the fence and the garden's own ground material paints everything inside it. The environment ground is cut out under it
//     (HOOKS.groundHoles, an inset polygon: the terrain overlaps the ground by 0.3 m all round, so no crack shows through).
// Triangles go to the 64 m chunk of their leaf (one mesh and one draw per chunk that has any, merged down to `drawsMax`). NO COLLIDERS: the player and the pedestrians follow heightAt (the HEIGHT_PATCH is the same function).
// The material is the garden's own ground (ground-material.js; passed to buildTerrain) or, without one (a headless test of the builder alone), a PLACEHOLDER: a toon vertex-coloured grass, darker on slopes.
import * as THREE from 'three';
import { registerLOD } from '../../core/spatial.js';
import { clipHalf, area2, triangulateRing, boxOfPoly } from '../environment/clip.js';
import { reliefHeight, RELIEF_BOX } from './height.js';
import { GARDEN } from './data/footprints.js';
import * as PONDS from './data/ponds.js';

export const TERRAIN = Object.freeze({
  chunk: 64,            // metres: the chunk grid of the meshes (aligned to multiples of 64 on the project frame)
  tol: 0.05,            // metres: the largest allowed distance between the mesh and gardenHeight (asserted on the built plan: tools/tauride-height-test.mjs, measurePlan)
  split: 0.04,          // metres: the error at which a leaf splits (below tol: the fan of a leaf with hanging midpoints is not the two-triangle quad that the split test measures)
  top: 16,              // metres: the first leaf size (a power of two); in the relief-only mode a leaf is dropped when no sample of it is lifted, in the cover mode flat leaves stay
  drop: 0.02,           // metres: below this a sample counts as flat ground (2 cm is not seen on a lawn and is the largest step between an open mesh border and the ground; below `split`)
  edge: 2,              // metres: (relief-only mode) the smallest leaf that may still straddle the foot of the relief (lifted and flat samples in one leaf): the mesh follows the 2 cm contour within this
  drawsMax: 16,
  trianglesTarget: 40000,
  cornerMax: 4,         // metres: (cover mode) the largest leaf across the outline that holds a corner of the outline (see planTerrain: the clip of a big triangle over a reflex corner is not one simple polygon)
  lift: 0.005,          // metres: the garden's own floor is drawn this much above the environment ground (a mesh offset, the plan and heightAt are exact): where the two overlap (the 6 cm round the outline, HOOKS.groundHoles) the floor wins by geometry, not by a tie of the depth bias
});

/**
 * T4a fix round 1 (the budget of the ponds: +15 k triangles for the bowls, the banks and the water): the floor of the garden WITH the ponds is planned with a looser split and a tolerance that follows what is seen.
 *   split 0.06 (the base tolerance of everything above the water; TERRAIN.split 0.04 is the tolerance of the hills of the relief-only plan): the floor was 32,142 triangles at 0.04 (+23.1 k over T3), 22.1 k with this
 *     (+13.1 k): the curvature of the banks (0.04 .. 0.10 per m2 along 2.7 km of shore) needs 1 m leaves at 4 cm and 2 m leaves at 6 cm. Above the water the mesh stays within 5 cm for 99.9 % of a 0.5 m lattice (mean 0.27 cm), the
 *     worst 10 cm stay where they were (the cusps of the canals).
 *   sub: under the water the bed is hidden by the opaque surface, so a sample that lies `from` m or more below the waterline may be off by `a` x its depth - `b` (at most `cap`): the mesh must only stay under the water.
 * Tests and tools plan the floor with floorOptions() so that they measure the mesh that is built.
 */
export const FLOOR_TUNING = Object.freeze({ split: 0.06, sub: Object.freeze({ a: 1.0, b: 0.03, cap: 0.25, from: 0.10 }) });
/** the per-sample tolerance of the floor (o.tolAt of planTerrain): (x, z, h) => the metres this sample may be off (planTerrain never goes below the split) */
export function pondTolAt(P = PONDS, S = FLOOR_TUNING.sub) { const w0 = P.WATER_Y; return (x, z, h) => (h < w0 - S.from ? Math.min(S.cap, Math.max(0, S.a * (w0 - h) - S.b)) : 0); }
/** the options of the floor plan of the garden (cover mode with the ponds): planTerrain(gardenHeight, RELIEF_BOX, floorOptions()) is what the page builds; `o` overrides */
export function floorOptions(o = {}) { return { cover: gardenPieces(), split: FLOOR_TUNING.split, tolAt: pondTolAt(), ...o }; }

const hOf = (gh, x, z) => gh(x, z) ?? 0;
/** distance of the point p to the segment a-b (all [x, z]) */
function segDist(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}

/** The triangles of a ring merged into convex polygons (Hertel-Mehlhorn: two pieces that share an edge become one when the union is convex; counter-clockwise, strictly convex): fewer pieces, fewer slivers where the
 *  outline is nearly straight (the earcut fan of the garden outline has a 7 mm wide triangle). Deterministic. */
export function mergeConvex(tris) {
  const polys = tris.map((t) => t.slice()), same = (p, q) => p[0] === q[0] && p[1] === q[1];
  const convex = (poly) => { const n = poly.length; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], c = poly[(i + 2) % n]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) < -1e-9) return false; } return true; };
  for (let again = true; again;) {
    again = false;
    search: for (let i = 0; i < polys.length; i++) for (let j = i + 1; j < polys.length; j++) {
      const P = polys[i], Q = polys[j], n = P.length, m = Q.length;
      for (let e = 0; e < n; e++) {
        const a = P[e], b = P[(e + 1) % n];
        for (let f = 0; f < m; f++) {
          if (!(same(Q[f], b) && same(Q[(f + 1) % m], a))) continue;
          const merged = []; for (let k = 1; k <= n; k++) merged.push(P[(e + k) % n]);          // b ... a
          for (let k = 2; k < m; k++) merged.push(Q[(f + k) % m]);                              // the rest of Q, from the vertex after a back to the one before b
          if (!convex(merged)) continue;
          polys[i] = merged; polys.splice(j, 1); again = true; break search;
        }
      }
    }
  }
  return polys;
}
/** The convex pieces (counter-clockwise in the (x, z) plane) of a garden ring: what planTerrain clips to. */
export function gardenPieces(ring = GARDEN.o) { return mergeConvex(triangulateRing(ring)); }

/** The plan of the terrain meshes for a height function `gh` over `box` ([x0, x1, z0, z1]): { chunks: [{ cx, cz, x0, z0, pos, nrm, col, idx, tris }], tris, leaves, splits, stats }. Pure and deterministic.
 *  o.cover = the convex pieces of the garden outline (gardenPieces()) -> the whole floor of the garden, clipped to the outline `o.ring` (default: the garden outline); absent -> the relief only (T2). */
export function planTerrain(gh = reliefHeight, box = RELIEF_BOX, o = {}) {
  const T = { ...TERRAIN, ...o }, CH = T.chunk, TOL = T.split, pieces = o.cover || null, tolAt = typeof o.tolAt === 'function' ? o.tolAt : null;
  const ringFlat = o.ring || GARDEN.o, ringPts = []; for (let i = 0; i < ringFlat.length; i += 2) ringPts.push([ringFlat[i], ringFlat[i + 1]]);
  let fallbacks = 0;
  // COVER mode: the lattice is shifted by a dyadic fraction of a metre (152/4096, 211/4096 m: exact in float32 and in every sum and average of the quadtree) so that no vertex of the outline, which OSM rounds to 0.1 m,
  // lies exactly on a lattice line (a vertex on the edge between two leaves would be on the edge of the clipped neighbour and not on the edge of the unclipped one: a T-junction crack)
  const SX = pieces ? (o.shift ? o.shift[0] : 152 / 4096) : 0, SZ = pieces ? (o.shift ? o.shift[1] : 211 / 4096) : 0;
  const I0 = Math.floor(box[0] / CH) * CH, J0 = Math.floor(box[2] / CH) * CH, W = Math.ceil((box[1] - I0) / CH) * CH, H = Math.ceil((box[3] - J0) / CH) * CH;
  const lev = new Int8Array(W * H).fill(-1);                      // per 1 m cell: log2 of the size of the meshed leaf that covers it, -1 = none
  const fill = (i, j, s, L) => { for (let b = j; b < j + s; b++) for (let a = i; a < i + s; a++) lev[b * W + a] = L; };
  const levAt = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : lev[j * W + i]);
  const log2 = (s) => Math.round(Math.log2(s));
  // the part of the square [x, x + s] x [z, z + s] that lies inside the garden polygon, as a fraction (the pieces are interior-disjoint, so the clipped areas add up)
  const pbox = pieces ? pieces.map(boxOfPoly) : null;
  const covered = (x, z, s) => {
    let a = 0;
    for (let q = 0; q < pieces.length; q++) {
      const b = pbox[q]; if (b[0] >= x + s || b[1] <= x || b[2] >= z + s || b[3] <= z) continue;
      let poly = [[x, z], [x + s, z], [x + s, z + s], [x, z + s]]; const P = pieces[q];
      for (let e = 0; e < P.length && poly.length >= 3; e++) poly = clipHalf(poly, P[e], P[(e + 1) % P.length], true);
      if (poly.length >= 3) a += area2(poly) / 2;
    }
    return a / (s * s);
  };
  // the samples of a leaf: n x n cells of step s / n (n = min(s, 16): a step of one metre up to 16 m leaves) -> { max, err (best diagonal), diag }
  function measure(i, j, s) {
    const n = Math.min(s, 16), st = s / n, row = new Float64Array((n + 1) * (n + 1));
    let max = 0, min = Infinity;
    for (let b = 0; b <= n; b++) for (let a = 0; a <= n; a++) { const h = hOf(gh, I0 + SX + i + a * st, J0 + SZ + j + b * st); row[b * (n + 1) + a] = h; if (h > max) max = h; if (h < min) min = h; }
    if (max < T.drop && min > -T.drop) return { max, min, err: 0, diag: 0 };          // flat (a bowl is not flat: T4a, the ponds sink the ground below -2 cm)
    const h00 = row[0], h10 = row[n], h01 = row[n * (n + 1)], h11 = row[n * (n + 1) + n];
    let e0 = 0, e1 = 0;
    for (let b = 0; b <= n; b++) for (let a = 0; a <= n; a++) {
      const u = a / n, v = b / n, h = row[b * (n + 1) + a];
      const d0 = u >= v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;                 // diagonal (i0,j0)-(i1,j1)
      const d1 = u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);   // diagonal (i1,j0)-(i0,j1)
      // o.tolAt(x, z, h): the metres this sample may be off; the error is measured in units of it (never stricter than the split), so a hidden bed splits later than a visible bank
      const w = tolAt ? TOL / Math.max(TOL, tolAt(I0 + SX + i + a * st, J0 + SZ + j + b * st, h)) : 1;
      e0 = Math.max(e0, Math.abs(h - d0) * w); e1 = Math.max(e1, Math.abs(h - d1) * w);
    }
    return e0 <= e1 ? { max, min, err: e0, diag: 0 } : { max, min, err: e1, diag: 1 };
  }
  // 1. the first leaves: relief only: every `top` m cell of the lattice with any lifted sample; cover: every cell that touches the garden polygon
  let leaves = [], splits = 0;
  for (let j = 0; j < H; j += T.top) for (let i = 0; i < W; i += T.top) {
    if (pieces) { const c = covered(I0 + SX + i, J0 + SZ + j, T.top); if (c > 1e-9) leaves.push({ i, j, s: T.top, cov: c }); }
    else { const m = measure(i, j, T.top); if (m.max >= T.drop) leaves.push({ i, j, s: T.top }); }
  }
  // 2. the adaptive split
  const out = [];
  // T4a fix round 1: a leaf across the outline that holds a CORNER of the outline splits down to `cornerMax` m. The clip of a big triangle that spans a reflex corner or a narrow neck of the outline (the north gate strip,
  // 1122.6, -1737.2) is not one simple polygon: the earcut check failed and the fallback left 10 open edges when a looser split let a 16 m leaf stand there; at 4 m the clip is a simple polygon.
  const hasCorner = (x, z, s) => { for (let q = 0; q < ringPts.length; q++) if (ringPts[q][0] > x && ringPts[q][0] < x + s && ringPts[q][1] > z && ringPts[q][1] < z + s) return true; return false; };
  const queue = leaves; leaves = [];
  const child = (lf, a, b, h) => { const c = { i: lf.i + a, j: lf.j + b, s: h }; if (pieces) { c.cov = covered(I0 + SX + c.i, J0 + SZ + c.j, h); if (c.cov <= 1e-9) return null; } return c; };
  while (queue.length) {
    const lf = queue.pop(), m = measure(lf.i, lf.j, lf.s);
    if (!pieces && m.max < T.drop) continue;                       // all flat: no triangles (relief only)
    if ((m.err > TOL || (!pieces && m.min < T.drop && lf.s > T.edge) || (pieces && lf.s > T.cornerMax && lf.cov < 1 - 1e-9 && hasCorner(I0 + SX + lf.i, J0 + SZ + lf.j, lf.s))) && lf.s > 1) { const h = lf.s / 2; splits++; for (const [a, b] of [[0, 0], [h, 0], [0, h], [h, h]]) { const c = child(lf, a, b, h); if (c) queue.push(c); } continue; }
    lf.diag = m.diag; out.push(lf);
  }
  leaves = out;
  for (const lf of leaves) fill(lf.i, lf.j, lf.s, log2(lf.s));
  // 3. the 2:1 balance: a leaf with a neighbour cell of less than half its size splits (the children keep their meshes)
  for (let again = true; again;) {
    again = false; const next = [];
    for (const lf of leaves) {
      const L = log2(lf.s); let bad = false;
      if (lf.s > 1) for (let k = 0; k < lf.s && !bad; k++) {
        for (const nb of [levAt(lf.i - 1, lf.j + k), levAt(lf.i + lf.s, lf.j + k), levAt(lf.i + k, lf.j - 1), levAt(lf.i + k, lf.j + lf.s)]) if (nb >= 0 && nb < L - 1) { bad = true; break; }
      }
      if (!bad) { next.push(lf); continue; }
      again = true; splits++; const h = lf.s / 2;
      // (a cover-mode leaf that is split by the balance un-fills its cells first: the children that lie outside the polygon do not exist)
      if (pieces) fill(lf.i, lf.j, lf.s, -1);
      for (const [a, b] of [[0, 0], [h, 0], [0, h], [h, h]]) { const c = child(lf, a, b, h); if (!c) continue; c.diag = measure(c.i, c.j, c.s).diag; fill(c.i, c.j, c.s, log2(h)); next.push(c); }
    }
    leaves = next;
  }
  // 4. the triangles, per chunk (a leaf lies inside one chunk: 64 is a multiple of every leaf size)
  const chunks = new Map(), NB = 0.5;
  const colorOf = makeColor();
  const norm = (x, z) => { const dx = hOf(gh, x + NB, z) - hOf(gh, x - NB, z), dz = hOf(gh, x, z + NB) - hOf(gh, x, z - NB); const g = Math.hypot(dx, dz) / (2 * NB), l = Math.hypot(dx / (2 * NB), 1, dz / (2 * NB)); return [-dx / (2 * NB) / l, 1 / l, -dz / (2 * NB) / l, g]; };
  for (const lf of leaves) {
    const x = I0 + lf.i + SX, z = J0 + lf.j + SZ, cx = Math.floor((I0 + lf.i) / CH), cz = Math.floor((J0 + lf.j) / CH), key = cx + "," + cz;
    let c = chunks.get(key); if (!c) chunks.set(key, c = { cx, cz, x0: cx * CH, z0: cz * CH, vmap: new Map(), pos: [], nrm: [], col: [], idx: [] });
    const vert = (px, pz) => {
      // integer lattice points have a numeric key (injective: |z| < 2048); the cut points of the polygon clip are keyed by their float32 values (the canonical cut gives bit-identical doubles to both neighbours)
      const k = Number.isInteger(px) && Number.isInteger(pz) ? px * 4096 + pz : Math.fround(px) + ',' + Math.fround(pz), hit = c.vmap.get(k); if (hit !== undefined) return hit;
      const h = hOf(gh, px, pz), n = norm(px, pz), col = colorOf(px, pz, n[3]), id = c.pos.length / 3;
      c.pos.push(px, h, pz); c.nrm.push(n[0], n[1], n[2]); c.col.push(col[0], col[1], col[2]); c.vmap.set(k, id); return id;
    };
    const s = lf.s, L = log2(s), h2 = s / 2;
    const half = (i0, j0, di, dj) => s > 1 && (levAt(i0, j0) === L - 1 || levAt(i0 + di, j0 + dj) === L - 1);      // the neighbour across an edge has leaves of half the size (either half of the edge may be meshed)
    const hang = { b: half(lf.i + h2 - 1, lf.j - 1, 1, 0), r: half(lf.i + s, lf.j + h2 - 1, 0, 1), t: half(lf.i + h2 - 1, lf.j + s, 1, 0), l: half(lf.i - 1, lf.j + h2 - 1, 0, 1) };
    const P = { x0: x, x1: x + s, z0: z, z1: z + s, xm: x + h2, zm: z + h2 };
    const push = (a, b, d) => {
      // orientation: counter-clockwise seen from +y (the normal of (b - a) x (d - a) points up)
      const cr = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);       // x * z' - z * x' (the y component of the cross product with x east, z south, is -(that))
      const A = vert(a[0], a[1]), B = vert(b[0], b[1]), C = vert(d[0], d[1]);
      if (A === B || B === C || A === C) return;
      if (cr > 0) c.idx.push(A, C, B); else c.idx.push(A, B, C);
    };
    const partial = !!pieces && lf.cov < 1 - 1e-9;                                      // a leaf across the outline: every triangle is clipped to the polygon
    const emit = !partial ? push : (a, b, d) => {
      let tri = [a, b, d]; if (area2(tri) < 0) tri = [a, d, b];
      // T clipped to the polygon: the OUTLINE (an arbitrary simple polygon) is the subject of Sutherland-Hodgman and the triangle (convex) the clip, so the result has the vertices of the outline inside T and the
      // cut points of the outline edges with the three edges of T, and NO internal diagonal (a clip against the convex pieces would cut every triangle that a diagonal crosses, and a neighbour that lies
      // wholly inside would not be cut: a T-junction crack). The cut points are canonical (clipHalf: the same two outline endpoints in the same order for both triangles that share an edge).
      let poly = ringPts;
      for (let e = 0; e < 3 && poly.length >= 3; e++) poly = clipHalf(poly, tri[e], tri[(e + 1) % 3], true);
      if (poly.length < 3) return;
      const at = Math.abs(area2(tri)) / 2, ap = Math.abs(area2(poly)) / 2;
      if (ap < 1e-7) return;
      if (Math.abs(at - ap) <= 1e-9 * at + 1e-12) { push(a, b, d); return; }                      // wholly inside: unchanged
      // snap the cut points to 1/4096 m (0.24 mm: exact in float32 below 2048 m): two neighbours that cut the same edge by the same line differ by about 1e-13 m before this, and one float32 ulp would be a crack
      poly = poly.map((v) => [Math.round(v[0] * 4096) / 4096, Math.round(v[1] * 4096) / 4096]).filter((v, k, all) => { const u = all[(k + all.length - 1) % all.length]; return !(u[0] === v[0] && u[1] === v[1]); });
      // the clip of a concave outline leaves zero-width spikes (a path out along an edge of T and back along it, joining two pieces of the intersection): cut them off
      for (let again = true; again && poly.length >= 3;) {
        again = false;
        for (let k = 0; k < poly.length; k++) {
          const p0 = poly[(k + poly.length - 1) % poly.length], p1 = poly[k], p2 = poly[(k + 1) % poly.length];
          if (segDist(p2, p0, p1) < 5e-4 || segDist(p0, p1, p2) < 5e-4) { poly = poly.filter((_, q) => q !== k); again = true; break; }
        }
      }
      if (poly.length < 3) return;
      let convexPoly = poly.length >= 3; for (let k = 0; k < poly.length && convexPoly; k++) { const p0 = poly[k], p1 = poly[(k + 1) % poly.length], p2 = poly[(k + 2) % poly.length], cr = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]); if ((area2(poly) > 0 ? cr : -cr) < -1e-9) convexPoly = false; }
      if (convexPoly) { for (let k = 1; k + 1 < poly.length; k++) push(poly[0], poly[k], poly[k + 1]); return; }
      // not convex (the outline cuts a notch out of T): earcut, checked against the area (a weakly simple polygon can confuse it); the fallback is the clip against the convex pieces
      const tris = triangulateRing(poly.flat());
      let sum = 0; for (const q of tris) sum += Math.abs(area2(q)) / 2;
      if (Math.abs(sum - Math.abs(area2(poly)) / 2) <= 2e-4 + 1e-6 * ap) { for (const q of tris) push(q[0], q[1], q[2]); return; }
      fallbacks++;
      for (let q = 0; q < pieces.length; q++) {
        const Q = pieces[q]; let pc = tri;
        for (let e = 0; e < Q.length && pc.length >= 3; e++) pc = clipHalf(pc, Q[e], Q[(e + 1) % Q.length], true);
        if (pc.length < 3 || Math.abs(area2(pc)) < 1e-6) continue;
        pc = pc.map((v) => [Math.round(v[0] * 4096) / 4096, Math.round(v[1] * 4096) / 4096]);
        for (let k = 1; k + 1 < pc.length; k++) push(pc[0], pc[k], pc[k + 1]);
      }
    };
    // a right triangle A, B (right angle), C with midpoints on AB and BC, the hypotenuse CA without
    const rt = (A, B, C, mAB, mBC) => {
      if (mAB && mBC) { const m1 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], m2 = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2]; emit(A, m1, C); emit(m1, B, m2); emit(m1, m2, C); }
      else if (mAB) { const m1 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; emit(A, m1, C); emit(m1, B, C); }
      else if (mBC) { const m2 = [(B[0] + C[0]) / 2, (B[1] + C[1]) / 2]; emit(A, B, m2); emit(A, m2, C); }
      else emit(A, B, C);
    };
    const p00 = [P.x0, P.z0], p10 = [P.x1, P.z0], p11 = [P.x1, P.z1], p01 = [P.x0, P.z1];
    if (lf.diag === 0) { rt(p00, p10, p11, hang.b, hang.r); rt(p11, p01, p00, hang.t, hang.l); }
    else { rt(p10, p00, p01, hang.b, hang.l); rt(p10, p11, p01, hang.r, hang.t); }
  }
  const list = []; let tris = 0;
  for (const c of chunks.values()) {
    const n = c.pos.length / 3, idx = n > 65535 ? Uint32Array.from(c.idx) : Uint16Array.from(c.idx);
    list.push({ cx: c.cx, cz: c.cz, x0: c.x0, z0: c.z0, pos: Float32Array.from(c.pos), nrm: Float32Array.from(c.nrm), col: Float32Array.from(c.col), idx, tris: idx.length / 3, verts: n }); tris += idx.length / 3;
  }
  list.sort((a, b) => a.cz - b.cz || a.cx - b.cx);
  const chunksBefore = list.length;
  // at most T.drawsMax meshes: the chunk with the fewest triangles joins the nearest other chunk (the vertices are copied, the border positions stay equal)
  while (list.length > T.drawsMax) {
    let k = 0; for (let q = 1; q < list.length; q++) if (list[q].tris < list[k].tris) k = q;
    let best = -1, bd = Infinity; for (let q = 0; q < list.length; q++) if (q !== k) { const d = Math.hypot(list[q].cx - list[k].cx, list[q].cz - list[k].cz) + list[q].tris * 1e-6; if (d < bd) { bd = d; best = q; } }
    const a = list[best], b = list[k], na = a.verts, pos = new Float32Array(a.pos.length + b.pos.length), nrm = new Float32Array(pos.length), col = new Float32Array(pos.length), idx = new Uint32Array(a.idx.length + b.idx.length);
    pos.set(a.pos); pos.set(b.pos, a.pos.length); nrm.set(a.nrm); nrm.set(b.nrm, a.nrm.length); col.set(a.col); col.set(b.col, a.col.length); idx.set(a.idx); for (let q = 0; q < b.idx.length; q++) idx[a.idx.length + q] = b.idx[q] + na;
    list[best] = { cx: a.cx, cz: a.cz, x0: a.x0, z0: a.z0, pos, nrm, col, idx: pos.length / 3 > 65535 ? idx : Uint16Array.from(idx), tris: a.tris + b.tris, verts: a.verts + b.verts, merged: (a.merged || []).concat([[b.cx, b.cz]], b.merged || []) };
    list.splice(k, 1);
  }
  return { chunks: list, tris, leaves: leaves.length, splits, tol: T.tol, split: TOL, drop: T.drop, edge: T.edge, chunksBefore, box: [I0, I0 + W, J0, J0 + H], cover: !!pieces, clipFallbacks: fallbacks };
}

/** the placeholder grass: the mean of the ground shader's grass tones, darker with the slope, a little earth where it is steep (a smooth hash varies it by a few percent). (x, z, grad) -> [r, g, b] in the vertex colour space */
function makeColor() {
  const g = new THREE.Color('#6d963a'), d = new THREE.Color('#4a7430'), e = new THREE.Color('#7a6a50'), tmp = new THREE.Color(), out = [0, 0, 0];
  return (x, z, grad) => {
    const k = Math.min(1, Math.max(0, (grad - 0.04) / 0.2)), k2 = Math.min(1, Math.max(0, (grad - 0.16) / 0.12)) * 0.35;
    const n = 0.96 + 0.08 * (0.5 + 0.5 * Math.sin(x * 0.173 + Math.sin(z * 0.131) * 2.1) * Math.cos(z * 0.157 + x * 0.047));
    tmp.copy(g).lerp(d, k * 0.7).lerp(e, k2); out[0] = tmp.r * n; out[1] = tmp.g * n; out[2] = tmp.b * n; return out;
  };
}

/**
 * The meshes of a plan: one Mesh per chunk (`tauride-terrain-<cx>_<cz>`), noBatch + registerLOD(Infinity) like the chunks of environment/ground.js, no colliders. opts.material = the garden's own ground material
 * (ground-material.js; the geometry then carries no vertex colour); without it the vertex-coloured placeholder. The floor is IN the normal / depth pass of the outlines (layer 0), exactly like the near chunks of
 * environment/ground.js that it replaces inside the fence: out of it (the T3 first version, opts.noOutline true) the pass saw through the floor, QA round 1 of T3: the outlines of the buildings and crowns BEHIND a hill
 * were drawn over its face and, along the garden outline, the environment ground (which is in the pass) ended in a dark depth-edge line. The hairline of T2 at the foot of a hill was the pad over that ground (two
 * coplanar surfaces in a pass that has no polygonOffset); the floor has no ground under it. Returns { group, triangles, draws, shared (a ground material was given), meshes }.
 */
export function buildTerrain(ctx, parent, plan, opts = {}) {
  const group = new THREE.Group(); group.name = 'tauride-terrain';
  const own = !!opts.material, mat = opts.material || ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'tauride-terrain' });
  const noOutline = opts.noOutline ?? false;
  for (const c of plan.chunks) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(c.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(c.nrm, 3)); if (!own) g.setAttribute('color', new THREE.BufferAttribute(c.col, 3));
    g.setIndex(new THREE.BufferAttribute(c.idx, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = `tauride-terrain-${c.cx}_${c.cz}`; m.receiveShadow = true; m.castShadow = false;
    if (own) m.position.y = TERRAIN.lift;
    ctx.noBatch(m); if (noOutline) ctx.noOutline(m); group.add(m);
  }
  parent.add(group); group.updateMatrixWorld(true);
  for (const m of group.children) registerLOD(m, Infinity);
  return { group, triangles: plan.tris, draws: plan.chunks.length, shared: own, meshes: group.children.slice() };
}

/** The height of the PLANNED mesh at (x, z) (the triangle that holds the point, barycentric), or null where no triangle is: what the path ribbons and the stairs are draped on. Triangles are bucketed on an 8 m grid. */
export function makeMeshHeight(plan, cell = 8) {
  const b = plan.box, nx = Math.ceil((b[1] - b[0]) / cell), nz = Math.ceil((b[3] - b[2]) / cell), grid = new Array(nx * nz);
  let n = 0; for (const c of plan.chunks) n += c.idx.length / 3;
  const T = new Float64Array(n * 10);
  let t = 0;
  for (const c of plan.chunks) {
    const p = c.pos, ix = c.idx;
    for (let q = 0; q < ix.length; q += 3) {
      const a = ix[q] * 3, bb = ix[q + 1] * 3, d = ix[q + 2] * 3, o = t * 10;
      const x0 = p[a], z0 = p[a + 2], x1 = p[bb], z1 = p[bb + 2], x2 = p[d], z2 = p[d + 2];
      T[o] = x0; T[o + 1] = z0; T[o + 2] = p[a + 1]; T[o + 3] = x1; T[o + 4] = z1; T[o + 5] = p[bb + 1]; T[o + 6] = x2; T[o + 7] = z2; T[o + 8] = p[d + 1];
      T[o + 9] = (z1 - z2) * (x0 - x2) + (x2 - x1) * (z0 - z2);                                              // the denominator of the barycentric weights
      const i0 = Math.max(0, Math.floor((Math.min(x0, x1, x2) - b[0]) / cell)), i1 = Math.min(nx - 1, Math.floor((Math.max(x0, x1, x2) - b[0]) / cell));
      const j0 = Math.max(0, Math.floor((Math.min(z0, z1, z2) - b[2]) / cell)), j1 = Math.min(nz - 1, Math.floor((Math.max(z0, z1, z2) - b[2]) / cell));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * nx + i; (grid[k] || (grid[k] = [])).push(t); }
      t++;
    }
  }
  return (x, z) => {
    const i = Math.floor((x - b[0]) / cell), j = Math.floor((z - b[2]) / cell);
    if (i < 0 || j < 0 || i >= nx || j >= nz) return null;
    const list = grid[j * nx + i]; if (!list) return null;
    for (let q = 0; q < list.length; q++) {
      const o = list[q] * 10, den = T[o + 9]; if (Math.abs(den) < 1e-12) continue;
      const l1 = ((T[o + 4] - T[o + 7]) * (x - T[o + 6]) + (T[o + 6] - T[o + 3]) * (z - T[o + 7])) / den, l2 = ((T[o + 7] - T[o + 1]) * (x - T[o + 6]) + (T[o] - T[o + 6]) * (z - T[o + 7])) / den, l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      return l1 * T[o + 2] + l2 * T[o + 5] + l3 * T[o + 8];
    }
    return null;
  };
}

/** The distance between the planned mesh and `gh`: rasterises every triangle on a `step` m lattice and compares the interpolated height with gh. { maxErr, at, samples, uncovered (samples at or above the plan's `drop` that no triangle covers), boundaryHigh (the highest point of an open edge), nonManifold, padArea (m2 of the footprint of all triangles), apronArea (m2 of the triangles with no corner above `drop`), liftedArea (m2 of the lattice points at or above `drop`) }.
 *  With `ring` (the garden outline, flat): also { ringArea, polyUncovered (lattice points inside the ring that no triangle covers), polyTotal, vertsOutside (the farthest a triangle corner lies outside the ring, m), trianglesOutside (triangles whose centroid is outside) } for the cover mode. */
export function measurePlan(plan, gh = reliefHeight, step = 0.5, ring = null, opts = {}) {
  let maxErr = 0, at = null, samples = 0, padArea = 0, apronArea = 0, over5 = 0;
  // opts.waterY (T4a fix round 1): the samples are split into the ones ABOVE the water (the ground is not more than 2 cm under the surface: the visible floor) and the SUBMERGED ones (hidden by the opaque water: the floor
  // may be off by FLOOR_TUNING.sub there but must stay under the surface): { above: { n, max, over5 }, sub: { n, max, pokes (mesh above the surface), pokeMax (m above it) } }
  const W = opts.waterY, ab = { n: 0, max: 0, over5: 0, sum: 0 }, sb = { n: 0, max: 0, pokes: 0, pokeMax: 0 };
  const seen = new Map(), drop = plan.drop ?? TERRAIN.drop;
  for (const c of plan.chunks) {
    const p = c.pos, ix = c.idx;
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t] * 3, b = ix[t + 1] * 3, d = ix[t + 2] * 3;
      const ar = Math.abs((p[b] - p[a]) * (p[d + 2] - p[a + 2]) - (p[d] - p[a]) * (p[b + 2] - p[a + 2])) / 2;      // footprint of the triangle on the ground plane
      padArea += ar; if (Math.max(p[a + 1], p[b + 1], p[d + 1]) < drop) apronArea += ar;                            // an "apron" triangle has no corner above the drop height: flat ground that the mesh paints over
      const x0 = Math.min(p[a], p[b], p[d]), x1 = Math.max(p[a], p[b], p[d]), z0 = Math.min(p[a + 2], p[b + 2], p[d + 2]), z1 = Math.max(p[a + 2], p[b + 2], p[d + 2]);
      const den = (p[b + 2] - p[d + 2]) * (p[a] - p[d]) + (p[d] - p[b]) * (p[a + 2] - p[d + 2]);
      if (Math.abs(den) < 1e-12) continue;
      for (let z = Math.ceil(z0 / step) * step; z <= z1 + 1e-9; z += step) for (let x = Math.ceil(x0 / step) * step; x <= x1 + 1e-9; x += step) {
        const l1 = ((p[b + 2] - p[d + 2]) * (x - p[d]) + (p[d] - p[b]) * (z - p[d + 2])) / den, l2 = ((p[d + 2] - p[a + 2]) * (x - p[d]) + (p[a] - p[d]) * (z - p[d + 2])) / den, l3 = 1 - l1 - l2;
        if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
        const y = l1 * p[a + 1] + l2 * p[b + 1] + l3 * p[d + 1], e = Math.abs(y - hOf(gh, x, z)); samples++;
        if (e > maxErr) { maxErr = e; at = { x, z, mesh: +y.toFixed(4), want: +hOf(gh, x, z).toFixed(4) }; }
        if (e > 0.05) over5++;
        if (W !== undefined) { const h = hOf(gh, x, z); if (h < W - 0.02) { sb.n++; if (e > sb.max) sb.max = e; if (y > W) { sb.pokes++; if (y - W > sb.pokeMax) sb.pokeMax = y - W; } } else { ab.n++; ab.sum += e; if (e > ab.max) ab.max = e; if (e > 0.05) ab.over5++; } }
        seen.set(Math.round(x / step) * 100000 + Math.round(z / step), 1);
      }
    }
  }
  let uncovered = 0, lifted = 0;
  const b = plan.box;
  for (let z = b[2]; z <= b[3]; z += step) for (let x = b[0]; x <= b[1]; x += step) { if (hOf(gh, x, z) >= drop) { lifted++; if (!seen.has(Math.round(x / step) * 100000 + Math.round(z / step))) uncovered++; } }
  // edges over the whole plan (the chunks share positions on their borders): every edge in 2 triangles, or open at the foot of the relief (height ~ 0)
  const em = new Map(), key = (x, y, z) => Math.round(x * 100) * 1e9 + Math.round(z * 100) * 1e3 + 0 * y;
  for (const c of plan.chunks) for (let t = 0; t < c.idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const i = c.idx[t + e] * 3, j = c.idx[t + (e + 1) % 3] * 3, ka = key(c.pos[i], c.pos[i + 1], c.pos[i + 2]), kb = key(c.pos[j], c.pos[j + 1], c.pos[j + 2]);
    const k = ka < kb ? ka + '|' + kb : kb + '|' + ka, rec = em.get(k); if (rec) { rec.n++; } else em.set(k, { n: 1, h: Math.max(c.pos[i + 1], c.pos[j + 1]) });
  }
  let boundaryHigh = 0, nonManifold = 0;
  for (const r of em.values()) { if (r.n === 1 && r.h > boundaryHigh) boundaryHigh = r.h; if (r.n > 2) nonManifold++; }
  const res = { maxErr, at, over5, samples, ...(W !== undefined ? { above: { n: ab.n, max: ab.max, over5: ab.over5, mean: ab.n ? ab.sum / ab.n : 0 }, sub: sb } : {}), lifted, uncovered, boundaryHigh, nonManifold, padArea, apronArea, liftedArea: lifted * step * step };
  if (ring) {
    const inR = (x, z) => { let c = false; for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) if ((ring[i + 1] > z) !== (ring[j + 1] > z) && x < (ring[j] - ring[i]) * (z - ring[i + 1]) / (ring[j + 1] - ring[i + 1]) + ring[i]) c = !c; return c; };
    const dR = (x, z) => { let m = Infinity; for (let i = 0; i < ring.length; i += 2) { const k = (i + 2) % ring.length, ax = ring[i], az = ring[i + 1], dx = ring[k] - ax, dz = ring[k + 1] - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; m = Math.min(m, Math.hypot(x - ax - t * dx, z - az - t * dz)); } return m; };
    let ra = 0; for (let i = 0; i < ring.length; i += 2) { const j = (i + 2) % ring.length; ra += ring[i] * ring[j + 1] - ring[j] * ring[i + 1]; }
    let polyUncovered = 0, polyTotal = 0, farOut = 0, trianglesOutside = 0;
    for (let z = b[2]; z <= b[3]; z += step) for (let x = b[0]; x <= b[1]; x += step) if (inR(x, z)) { polyTotal++; if (!seen.has(Math.round(x / step) * 100000 + Math.round(z / step))) polyUncovered++; }
    for (const c of plan.chunks) {
      const p = c.pos, ix = c.idx;
      for (let t = 0; t < ix.length; t += 3) {
        let cx = 0, cz = 0;
        for (let e = 0; e < 3; e++) { const x = p[ix[t + e] * 3], z = p[ix[t + e] * 3 + 2]; cx += x / 3; cz += z / 3; if (!inR(x, z)) farOut = Math.max(farOut, dR(x, z)); }
        if (!inR(cx, cz)) trianglesOutside++;
      }
    }
    // watertight in the exact positions of the float32 vertices: an edge that only one triangle uses must lie on the outline (anywhere else it is a T-junction crack), none lies in more than two
    const ex = new Map(), ek = (x, z) => x + ',' + z;
    for (const c of plan.chunks) for (let t = 0; t < c.idx.length; t += 3) for (let e = 0; e < 3; e++) {
      const i = c.idx[t + e] * 3, j = c.idx[t + (e + 1) % 3] * 3, ka = ek(c.pos[i], c.pos[i + 2]), kb = ek(c.pos[j], c.pos[j + 2]), k = ka < kb ? ka + '|' + kb : kb + '|' + ka, rec = ex.get(k);
      if (rec) rec.n++; else ex.set(k, { n: 1, m: [(c.pos[i] + c.pos[j]) / 2, (c.pos[i + 2] + c.pos[j + 2]) / 2] });
    }
    let openInterior = 0, nonManifoldExact = 0, openBoundary = 0;
    for (const r of ex.values()) { if (r.n > 2) nonManifoldExact++; else if (r.n === 1) { if (dR(r.m[0], r.m[1]) > 2e-3) openInterior++; else openBoundary++; } }
    Object.assign(res, { ringArea: Math.abs(ra) / 2, polyUncovered, polyTotal, vertsOutside: farOut, trianglesOutside, openInterior, openBoundary, nonManifoldExact });
  }
  return res;
}
