// landmarksTauride/ponds.js - the WATER of the Tauride Garden (docs/TAURIDE-REMAKE.md, phase T4a): the water surface at the one level of the datum table, the impassable shore (colliders) and the numbers the tests read.
// Everything is DERIVED from data/ponds.js (the single datum table: water level, beds, bank top, collider tops and contour) and data/water.js (the union outline of the two ponds and the canals, 3 island holes).
// The bowls and the banks themselves are not built here: they are the ground (height.js is the profile, terrain-mesh.js samples it into the garden floor, ground-material.js paints the wet band and the bed).
//   planPonds(o)    PURE: { water: { pos, idx, nrm, area, triangles, holes }, quay: { pos, nrm, idx, triangles, length, runs, negLength, posLength, maxStep }, colliders: [{ cx, cz, w, d, rot, y0, y1, len }], stats }
//   buildPonds(ctx, parent, plan, opts)  the water mesh (waterMaterial of environment/water.js, LOOK key 'tauride-pond', one draw, never batched, out of the outline pass) + the kerb skirt (the quay: T4a fix rounds 1 and 2, one more draw, planned from the floor plan `o.floor`) + the shore colliders on ctx.physics
// The colliders: physics.js blocks a walker whose feet + STEP_HEIGHT (0.45) is below the top of a box, at every feet height down to the box's bottom: the top (data COLLIDER.top) is far above the contour's feet + 0.45, so a
// walker (or a jump from the crest: apex +0.73) cannot step or hop over it, and the bottom is below the bed so that nobody can slip under it either. The old module's trap (a 0.22 m box that ignored a walker at y = 0 and
// blocked one at feet -1.4) is NOT reproduced: the box stands INLAND of the shore on the contour where the bank is at COLLIDER.contourY, so nobody ever stands in the water in the first place.
// THE BRIDGES (T4b, bridges.js): `decks` (the axis segments of the extended decks with their half width + pad) CUT the shore chords where a deck crosses them (chordOutside), so the ring opens only onto a deck, between its rails;
// `gaps` (a list of { x, z, r }) is the T4a hook that removes whole chords near a point (kept for the tests). The water material takes the decks as its zones (the soffit shadow) and the look tune of data/ponds.js POND_LOOK.
import * as THREE from 'three';
import { waterMaterial } from '../environment/water.js';
import { WATER_UNION } from './data/water.js';
import * as PONDS from './data/ponds.js';
import { GARDEN } from './data/footprints.js';
import { pondProfile } from './height.js';
import { TERRAIN } from './terrain-mesh.js';

/** the bank slope (1 : s) at a point, from the table */
const slopeOf = (P) => pondProfile(P).slopeAt;

/** the distance d (m) from the shore, on the land side, at which the bank profile stands at height y (the quadratic ease of the land side; y within WATER_Y .. BANK_TOP) at slope 1 : s */
export function landOffsetAt(y, s, P = PONDS) {
  const k = (y - P.WATER_Y) / (P.BANK_TOP - P.WATER_Y);
  if (!(k >= 0 && k < 1)) throw new Error('landOffsetAt: y ' + y + ' is not on the bank (' + P.WATER_Y + ' .. ' + P.BANK_TOP + ')');
  return 2 * (P.BANK_TOP - P.WATER_Y) * s * (1 - Math.sqrt(1 - k));
}

/** the rings of a union as lists of [x, z] vertices (consecutive duplicates removed), with the side of the land: sg = +1 when the land normal is rotate(-90) of the edge, as shoreSegments computes it */
function ringsOf(union) {
  const out = [];
  for (const p of union) { out.push({ r: p.o, hole: false }); for (const h of p.h || []) out.push({ r: h, hole: true }); }
  return out.map(({ r, hole }) => {
    const v = []; for (let i = 0; i < r.length; i += 2) { const q = v[v.length - 1]; if (!q || Math.hypot(r[i] - q[0], r[i + 1] - q[1]) > 1e-6) v.push([r[i], r[i + 1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 1e-6) v.pop();
    let area = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a[0] * b[1] - b[0] * a[1]; }
    return { v, hole, sg: (area > 0 ? 1 : -1) * (hole ? 1 : -1) };
  });
}

/** The contour ring at the land distance d(x, z) from a shore ring: every vertex moved along the mitre of the two land normals (the mitre length capped at 3 d). Returns [[x, z], ...] */
function offsetRing(ring, dAt) {
  const { v, sg } = ring, m = v.length, nrm = [];
  for (let i = 0; i < m; i++) { const a = v[i], b = v[(i + 1) % m], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez) || 1; nrm.push([-ez / l * sg, ex / l * sg]); }
  return v.map((p, i) => {
    const n1 = nrm[(i + m - 1) % m], n2 = nrm[i], k = Math.max(1 + n1[0] * n2[0] + n1[1] * n2[1], 1 / 9), d = dAt(p[0], p[1]);
    return [p[0] + d * (n1[0] + n2[0]) / k, p[1] + d * (n1[1] + n2[1]) / k];
  });
}

/** greedy polyline simplification of a CLOSED ring of points: from a vertex extend the chord while every skipped vertex stays within `tol` of it and the chord is at most `maxLen` long. Returns the chain of points [[x, z], ...] (closed implicitly). */
function simplifyClosed(pts, tol, maxLen) {
  const n = pts.length, out = [];
  const dev = (a, b, p) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)) : 0; return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
  let i = 0;
  while (i < n) {
    out.push(pts[i]);
    let j = i + 1;
    while (j + 1 <= n) {                                   // try to reach vertex j + 1
      const a = pts[i], b = pts[(j + 1) % n]; let ok = Math.hypot(b[0] - a[0], b[1] - a[1]) <= maxLen;
      for (let k = i + 1; ok && k <= j; k++) if (dev(a, b, pts[k % n]) > tol) ok = false;
      if (!ok) break;
      j++;
    }
    i = j;
  }
  return out;
}

/**
 * The kerb skirt (T4a fix round 1: the quay along the lake; fix round 2: every stretch of the outline; the numbers: data/ponds.js QUAY). The floor (`floor`, the plan of terrain-mesh.js planTerrain in cover mode) stops at the garden outline
 * (`ring`, a flat ring), the environment ground (street, y Q.top) is cut at it, and between the two there is a step wherever the floor at the outline is not at the street level. The step is closed by a vertical wall ON the outline, stitched to the
 * open edges of the floor plan that lie on the outline (an edge that one triangle uses and whose ends and middle are within Q.tol of the ring), from the height of the edge (+ `lift`, the offset the floor mesh is drawn with) to Q.top: a floor
 * BELOW the street gets a wall that faces the garden (seen from the water and the banks), a floor ABOVE it one that faces the street. Edges whose ends are both within Q.drop of the street level get none. The vertices of the floor on the outline
 * are the exact heights of the terrain (planTerrain evaluates gardenHeight at every vertex, the cut points included) and the mesh is linear between them, so the wall follows the mesh edge: no gap and no poke whatever the tolerance of the floor.
 * Consecutive edges of one outline edge are merged into one quad while every vertex between stays within Q.merge m of the chord (the quay along the lake is flat: a quad per outline edge). The wall reaches Q.under m past the surface it meets
 * (below the floor edge, below the street) so no crack opens. Returns { pos, nrm, idx, triangles, length (m of outline), runs (quads), edges (floor edges on the outline), negLength, posLength, maxStep (m) }.
 */
export function planQuay(floor, ring = GARDEN.o, Q = PONDS.QUAY, lift = TERRAIN.lift) {
  const n = ring.length / 2, pos = [], nrm = [], idx = []; let length = 0, runs = 0, negLength = 0, posLength = 0, maxStep = 0, edges = 0;
  const result = () => ({ pos: Float32Array.from(pos), nrm: Float32Array.from(nrm), idx: Uint32Array.from(idx), triangles: idx.length / 3, length, runs, edges, negLength, posLength, maxStep, top: Q.top });
  if (!floor || !floor.chunks) return result();
  const sx = (i) => ring[2 * i], sz = (i) => ring[2 * i + 1], dSeg = (i, x, z) => { const j = (i + 1) % n, ex = sx(j) - sx(i), ez = sz(j) - sz(i), l2 = ex * ex + ez * ez, t = l2 ? Math.max(0, Math.min(1, ((x - sx(i)) * ex + (z - sz(i)) * ez) / l2)) : 0; return Math.hypot(x - sx(i) - t * ex, z - sz(i) - t * ez); };
  const inRing = (x, z) => { let c = false; for (let i = 0, j = n - 1; i < n; j = i++) if ((sz(i) > z) !== (sz(j) > z) && x < (sx(j) - sx(i)) * (z - sz(i)) / (sz(j) - sz(i)) + sx(i)) c = !c; return c; };
  // the ring segments by 4 m cell: a cell lists every segment that comes within its half diagonal (+ Q.tol) of its centre, so no cell that the outline touches is missed (the floor has ~20,000 triangles and only a few hundred stand on the outline)
  const CS = 4, cells = new Map(), ck = (x, z) => Math.floor(x / CS) * 100003 + Math.floor(z / CS), reach = CS * Math.SQRT1_2 + Q.tol;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, i0 = Math.floor((Math.min(sx(i), sx(j)) - Q.tol) / CS), i1 = Math.floor((Math.max(sx(i), sx(j)) + Q.tol) / CS), k0 = Math.floor((Math.min(sz(i), sz(j)) - Q.tol) / CS), k1 = Math.floor((Math.max(sz(i), sz(j)) + Q.tol) / CS);
    for (let a = i0; a <= i1; a++) for (let b = k0; b <= k1; b++) if (dSeg(i, (a + 0.5) * CS, (b + 0.5) * CS) <= reach) { const key = a * 100003 + b, l = cells.get(key); if (!l) cells.set(key, [i]); else l.push(i); }
  }
  const segOf = (x, z) => { const l = cells.get(ck(x, z)); if (l) for (const i of l) if (dSeg(i, x, z) <= Q.tol) return i; return -1; };
  // 1. the open edges of the floor that lie on the outline, oriented along their outline edge i: { i, t0 < t1 (metres along it), the ends A, B (x, z, y of the plan) }
  const bySeg = new Map();
  for (const c of floor.chunks) {
    const p = c.pos, ix = c.idx;
    for (let t = 0; t < ix.length; t += 3) for (let e = 0; e < 3; e++) {
      const a = ix[t + e] * 3, b = ix[t + (e + 1) % 3] * 3, ax = p[a], az = p[a + 2], bx = p[b], bz = p[b + 2];
      const i = segOf((ax + bx) / 2, (az + bz) / 2); if (i < 0 || segOf(ax, az) < 0 || segOf(bx, bz) < 0 || Math.hypot(bx - ax, bz - az) < 1e-3) continue;
      const j = (i + 1) % n, ex = sx(j) - sx(i), ez = sz(j) - sz(i), L = Math.hypot(ex, ez), ta = ((ax - sx(i)) * ex + (az - sz(i)) * ez) / L, tb = ((bx - sx(i)) * ex + (bz - sz(i)) * ez) / L;
      const rec = ta <= tb ? { i, t0: ta, t1: tb, ax, az, ay: p[a + 1], bx, bz, by: p[b + 1] } : { i, t0: tb, t1: ta, ax: bx, az: bz, ay: p[b + 1], bx: ax, bz: az, by: p[a + 1] };
      let l = bySeg.get(i); if (!l) bySeg.set(i, l = []); edges++;
      // an edge that crosses the street level is cut there: its two halves have opposite sides (a wall faces the garden over a floor below the street and the street over one above it)
      const fa = rec.ay + lift - Q.top, fb = rec.by + lift - Q.top;
      if (fa * fb < 0) { const k = fa / (fa - fb), cx = rec.ax + (rec.bx - rec.ax) * k, cz = rec.az + (rec.bz - rec.az) * k, ct = rec.t0 + (rec.t1 - rec.t0) * k, cy = Q.top - lift; l.push({ ...rec, t1: ct, bx: cx, bz: cz, by: cy }, { ...rec, t0: ct, ax: cx, az: cz, ay: cy }); }
      else l.push(rec);
    }
  }
  const tri = (p, q, r, wx, wz) => {                                                       // a triangle whose front side faces (wx, wz); a zero-area one is dropped
    const e1 = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], e2 = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (Math.hypot(cx, cy, cz) < 1e-9) return;
    const base = pos.length / 3; pos.push(...p, ...q, ...r); for (let k = 0; k < 3; k++) nrm.push(wx, 0, wz);
    if (cx * wx + cz * wz > 0) idx.push(base, base + 1, base + 2); else idx.push(base, base + 2, base + 1);
  };
  const stepOf = (y) => y + lift - Q.top, side = (r) => stepOf(r.ay) + stepOf(r.by) < 0;           // the floor edge above (+) / below (-) the street; side(r) true = below
  // 2. a chain of edges -> one quad
  const wall = (ch) => {
    const A = ch[0], B = ch[ch.length - 1], ya = A.ay, yb = B.by, dx = B.bx - A.ax, dz = B.bz - A.az, L = Math.hypot(dx, dz), neg = side({ ay: ya, by: yb });
    let ux = -dz / L, uz = dx / L; if (!inRing((A.ax + B.bx) / 2 + ux * 0.05, (A.az + B.bz) / 2 + uz * 0.05)) { ux = -ux; uz = -uz; }     // (ux, uz): the unit normal toward the garden
    const wx = neg ? ux : -ux, wz = neg ? uz : -uz;
    let tA, tB, bA, bB;                                                                                                          // the corners A / B at the top and at the bottom of the wall
    if (neg) { tA = tB = Q.top; bA = Math.min(Q.top, ya + lift - Q.under); bB = Math.min(Q.top, yb + lift - Q.under); }
    else { tA = Math.max(Q.top, ya + lift); tB = Math.max(Q.top, yb + lift); bA = bB = Q.top - Q.under; }
    const A0 = [A.ax, tA, A.az], B0 = [B.bx, tB, B.bz], B1 = [B.bx, bB, B.bz], A1 = [A.ax, bA, A.az];
    tri(A0, B0, B1, wx, wz); tri(A0, B1, A1, wx, wz);
    length += L; runs++; if (neg) negLength += L; else posLength += L; maxStep = Math.max(maxStep, Math.abs(stepOf(ya)), Math.abs(stepOf(yb)));
  };
  // the vertices between the ends of a chain against its chord
  const flat = (c) => { const A = c[0], B = c[c.length - 1], span = (B.t1 - A.t0) || 1; for (let k = 0; k + 1 < c.length; k++) { const f = (c[k].t1 - A.t0) / span; if (Math.abs(c[k].by - (A.ay + (B.by - A.ay) * f)) > Q.merge) return false; } return true; };
  for (const [, list] of [...bySeg.entries()].sort((a, b) => a[0] - b[0])) {
    list.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
    let ch = null;
    for (const r of list) {
      if (Math.max(Math.abs(stepOf(r.ay)), Math.abs(stepOf(r.by))) <= Q.drop) { if (ch) wall(ch); ch = null; continue; }
      if (ch) { const last = ch[ch.length - 1]; if (Math.hypot(r.ax - last.bx, r.az - last.bz) < 1e-3 && Math.abs(r.ay - last.by) < 1e-6 && side(r) === side(ch[0]) && flat([...ch, r])) { ch.push(r); continue; } wall(ch); }
      ch = [r];
    }
    if (ch) wall(ch);
  }
  return result();
}

/** T4b: the parts of the chord a -> b (flat [x, z]) that lie OUTSIDE every deck rectangle of `rects` ([{ ax, az, bx, bz, hw }]: the axis segment a-b of a deck and its half width incl. the pad): [[t0, t1], ...] in the chord's parameter 0 .. 1.
 *  The shore ring is cut exactly where a deck crosses it, so the gap at a bridge head is the deck between its rails and nothing more (the 2 * COLLIDER.gap extension of the kept pieces reaches into the rectangle, under the rails). */
export function chordOutside(a, b, rects) {
  let keep = [[0, 1]];
  const ex = b[0] - a[0], ez = b[1] - a[1];
  for (const r of rects) {
    const dx = r.bx - r.ax, dz = r.bz - r.az, len = Math.hypot(dx, dz) || 1, ux = dx / len, uz = dz / len;
    const u0 = (a[0] - r.ax) * ux + (a[1] - r.az) * uz, v0 = (a[0] - r.ax) * -uz + (a[1] - r.az) * ux, du = ex * ux + ez * uz, dv = ex * -uz + ez * ux;
    // the parameter interval where the chord lies inside the slab 0 <= u <= len, then inside |v| <= hw (each a slab: an interval of t)
    const slab = (p0, d, lo, hi) => { if (Math.abs(d) < 1e-12) return p0 >= lo && p0 <= hi ? [0, 1] : null; let t0 = (lo - p0) / d, t1 = (hi - p0) / d; if (t0 > t1) { const t = t0; t0 = t1; t1 = t; } return t1 < 0 || t0 > 1 ? null : [Math.max(0, t0), Math.min(1, t1)]; };
    const su = slab(u0, du, 0, len), sv = slab(v0, dv, -r.hw, r.hw); if (!su || !sv) continue;
    const i0 = Math.max(su[0], sv[0]), i1 = Math.min(su[1], sv[1]); if (i1 <= i0) continue;
    const next = []; for (const [k0, k1] of keep) { if (i1 <= k0 || i0 >= k1) { next.push([k0, k1]); continue; } if (i0 > k0) next.push([k0, i0]); if (i1 < k1) next.push([i1, k1]); }
    keep = next;
  }
  return keep;
}

/**
 * The plan of the ponds (pure, deterministic).
 *   o.union (data/water.js WATER_UNION), o.ponds (a datum table), o.gaps ([{ x, z, r }]: no collider starts within r of it; T4b), o.decks ([{ ax, az, bx, bz, hw }]: T4b, the chords are CUT where they cross a deck rectangle, chordOutside), o.slopeAt (the bank slope function, default the table's)
 * water: the surface at P.WATER_Y over the union with its holes (earcut), counter-clockwise seen from above (normal +y); area = the sum of the triangle areas.
 * quay: the kerb skirt that closes the step between the street and the floor on every stretch of the garden outline where there is one (planQuay; o.floor = the plan of the floor (terrain-mesh.js planTerrain); without it there is no skirt; o.garden = the flat ring of the garden outline, o.quay = a table, o.lift = the offset of the floor mesh)
 * colliders: boxes along the contour ring at P.COLLIDER.contourY, inland of the shore, merged (chord tolerance, maximum length), each { cx, cz, w (thickness), d (length), rot, y0, y1, len }.
 */
export function planPonds(o = {}) {
  const P = o.ponds || PONDS, union = o.union || WATER_UNION, slopeAt = o.slopeAt || slopeOf(P), C = P.COLLIDER, gaps = o.gaps || [], decks = o.decks || [];
  // ---- the water surface
  const pos = [], idx = []; let area = 0, holes = 0;
  for (const poly of union) {
    const flat = []; const rings = [poly.o, ...(poly.h || [])];
    for (const r of rings) for (let i = 0; i < r.length; i += 2) flat.push(new THREE.Vector2(r[i], r[i + 1]));
    const contour = flat.slice(0, poly.o.length / 2), hs = []; let at = poly.o.length / 2;
    for (const h of poly.h || []) { hs.push(flat.slice(at, at + h.length / 2)); at += h.length / 2; holes++; }
    const faces = THREE.ShapeUtils.triangulateShape(contour, hs), base = pos.length / 3;
    for (const p of flat) pos.push(p.x, P.WATER_Y, p.y);
    for (const f of faces) {
      let [a, b, c] = f; const A = flat[a], B = flat[b], Cc = flat[c];
      const cr = (B.x - A.x) * (Cc.y - A.y) - (B.y - A.y) * (Cc.x - A.x);       // z-component of the cross product in the (x, z) plane; the normal y of (B - A) x (C - A) is -cr
      if (cr > 0) { const t = b; b = c; c = t; }                                  // make the winding such that the face normal points up
      idx.push(base + a, base + b, base + c); area += Math.abs(cr) / 2;
    }
  }
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  const water = { pos: Float32Array.from(pos), nrm, idx: Uint32Array.from(idx), area, triangles: idx.length / 3, holes, y: P.WATER_Y };
  // ---- the kerb skirt (the quay)
  const quay = planQuay(o.floor || null, o.garden || GARDEN.o, o.quay || P.QUAY, o.lift ?? TERRAIN.lift);
  // ---- the colliders
  const colliders = []; let chords = 0, cut = 0, cutM = 0;
  for (const ring of ringsOf(union)) {
    const contour = offsetRing(ring, (x, z) => landOffsetAt(C.contourY, slopeAt(x, z), P)), chain = simplifyClosed(contour, C.chord, C.maxLen), m = chain.length;
    // the land side of the chain: the same land normal as the ring, from the chord itself
    for (let i = 0; i < m; i++) {
      const a0 = chain[i], b0 = chain[(i + 1) % m], len0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]); if (len0 < 1e-3) continue;
      chords++;
      // T4b: the pieces of the chord outside the deck rectangles (a chord that no deck crosses is one piece, 0 .. 1)
      const pieces = decks.length ? chordOutside(a0, b0, decks) : [[0, 1]];
      if (pieces.length !== 1 || pieces[0][0] !== 0 || pieces[0][1] !== 1) { cut++; cutM += len0 * (1 - pieces.reduce((s, q) => s + q[1] - q[0], 0)); }
      for (const [t0, t1] of pieces) {
        const a = [a0[0] + (b0[0] - a0[0]) * t0, a0[1] + (b0[1] - a0[1]) * t0], b = [a0[0] + (b0[0] - a0[0]) * t1, a0[1] + (b0[1] - a0[1]) * t1];
        const ex = b[0] - a[0], ez = b[1] - a[1], len = Math.hypot(ex, ez); if (len < 1e-3) continue;
        const nx = -ez / len * ring.sg, nz = ex / len * ring.sg;                    // toward the land
        const mx = (a[0] + b[0]) / 2 + nx * C.thick / 2, mz = (a[1] + b[1]) / 2 + nz * C.thick / 2;
        if (gaps.some((g) => Math.hypot(a[0] - g.x, a[1] - g.z) < g.r || Math.hypot(b[0] - g.x, b[1] - g.z) < g.r || Math.hypot(mx - g.x, mz - g.z) < g.r)) continue;
        colliders.push({ cx: mx, cz: mz, w: C.thick, d: len + 2 * C.gap, rot: Math.atan2(ex, ez), y0: C.y0, y1: C.top, len });
      }
    }
  }
  const shoreM = colliders.reduce((s, c) => s + c.len, 0);
  return { water, quay, colliders, stats: { waterTriangles: water.triangles, quayTriangles: quay.triangles, quayLength: quay.length, waterArea: water.area, holes, colliders: colliders.length, chords, chordsCut: cut, cutLengthM: cutM, colliderLengthM: shoreM, y: P.WATER_Y, top: C.top, contourY: C.contourY } };
}

/** The material of the pond water: waterMaterial of environment/water.js with the LOOK key of the datum table, no wall shadow, the garden bridges as its deck zones (T4b: `zones` = [{ c, axis, w, len }], the soffit shadow under a deck), plus the duckweed mat of the
 *  Small Pond and the look tune of the ponds (T4b, data/ponds.js POND_LOOK: the T4a GPU QA read the narrow east and south arms as pale speckled gravel from 50 .. 250 m: the olive shallow tint reached 5 m from either bank, the ripple
 *  iso-lines and the sun glints covered an arm that is 8 .. 12 m wide; the tune narrows the shallow band, damps the lines and the glints and keeps the deck zones to the deck) - patches of the fragment shader: the key is the only edit of environment/water.js */
export function pondMaterial(ctx, field, P = PONDS, zones = []) {
  const m = waterMaterial(ctx, field, { key: P.WATER_LOOK_KEY, wallH: 0, cut: false, zones });
  const S = P.SMALL_POND, T = P.POND_LOOK;
  m.uniforms.uSmall = { value: new THREE.Vector4(S.mouthZ, S.eastX, S.blendZ, S.blendX) };
  m.uniforms.uDuck = { value: new THREE.Vector2(P.DUCKWEED.band, P.DUCKWEED.cover) };
  m.uniforms.uPondA = { value: new THREE.Vector4(T.shallowBand, T.shallowMix, T.lines, T.glint) };
  m.uniforms.uPondB = { value: new THREE.Vector4(T.soffit, T.soffitFade, T.sunSheet, 0) };
  m.uniforms.uPondC = { value: new THREE.Vector2(T.air[0], T.air[1]) };
  // the deck zones of a footbridge are the deck itself (waterMaterial pads a zone by 1 m across and 6 m along, the size of a street bridge): the deck's own half width + 0.3, the deck length minus the fade
  zones.slice(0, 24).forEach((z, i) => { m.uniforms.uBrS.value[i].set(z.w / 2 + 0.3, Math.max(0.5, z.len / 2 - T.soffitFade / 2)); });
  const fs = m.fragmentShader;
  const patch = (src, from, to) => { if (!src.includes(from)) throw new Error('ponds.js pondMaterial: the fragment shader of environment/water.js changed (cannot find: ' + from.slice(0, 40) + ')'); return src.replace(from, to); };
  let withUniforms = fs.replace('varying vec3 vW;', 'varying vec3 vW; uniform vec4 uSmall; uniform vec2 uDuck; uniform vec4 uPondA; uniform vec4 uPondB; uniform vec2 uPondC;');
  withUniforms = patch(withUniforms, 'col = mix(col, uShallow, (1.0 - smoothstep(0.5, 5.0, dsh)) * 0.45 * inside);', 'col = mix(col, uShallow, (1.0 - smoothstep(0.4, uPondA.x, dsh)) * uPondA.y * inside);');
  withUniforms = patch(withUniforms, 'clamp(lineA * 0.32 + lineB * 0.32, 0.0, 1.0) * (0.2 + 0.4 * fres) * (1.0 - 0.5 * shade));', 'clamp(lineA * 0.32 + lineB * 0.32, 0.0, 1.0) * (0.2 + 0.4 * fres) * (1.0 - 0.5 * shade) * uPondA.z);');
  // fix round 1: the two sun terms (the glitter sheet: a warm white added over all the sun-facing water; the glints: the speckles) fade out with the view elevation (POND_LOOK.air): the east aerials saw a pale speckled band
  withUniforms = patch(withUniforms, 'col += vec3(1.0, 0.88, 0.7) * sheet * 0.26 * (1.0 - uNight) * (1.0 - shade);', 'float pondAir = 1.0 - smoothstep(uPondC.x, uPondC.y, V.y);\n        col += vec3(1.0, 0.88, 0.7) * sheet * 0.26 * (1.0 - uNight) * (1.0 - shade) * uPondB.z * pondAir;');
  withUniforms = patch(withUniforms, 'col += vec3(1.0, 0.93, 0.8) * glint * 1.1 * (1.0 - 0.7 * uNight);', 'col += vec3(1.0, 0.93, 0.8) * glint * 1.1 * (1.0 - 0.7 * uNight) * uPondA.w * pondAir;');
  withUniforms = patch(withUniforms, 'under = max(under, 1.0 - smoothstep(0.0, 5.0, max(max(da, dp), 0.0)));', 'under = max(under, 1.0 - smoothstep(0.0, uPondB.y, max(max(da, dp), 0.0)));');
  withUniforms = patch(withUniforms, 'col = mix(col, col * vec3(0.16, 0.2, 0.26), under);', 'col = mix(col, col * uPondB.x, under);');
  const mat = `
        // the duckweed mat of the Small Pond (T4a): green flecks on the water within uDuck.x metres of the bank (the distance field of the field mask), patchy
        float smallW = 1.0 - smoothstep(uSmall.x, uSmall.x + uSmall.z, vW.z) * smoothstep(uSmall.y - uSmall.w, uSmall.y, vW.x);
        float bankK = 1.0 - smoothstep(0.4, uDuck.x, dsh);
        float dwn = vn(vW.xz * 0.7) * 0.55 + vn(vW.xz * 2.3 + 9.0) * 0.45;
        float weed = smoothstep(0.38, 0.62, dwn + 0.30 * bankK - 0.12) * bankK * smallW * uDuck.y;
        col = mix(col, vec3(0.31, 0.45, 0.16) * mix(1.0, 0.42, uNight), weed * 0.65);
        `;
  if (!withUniforms.includes('gl_FragColor = vec4(col, 1.0);') || withUniforms === fs) throw new Error('ponds.js pondMaterial: the fragment shader of environment/water.js changed (cannot place the duckweed)');
  m.fragmentShader = withUniforms.replace('gl_FragColor = vec4(col, 1.0);', mat + 'gl_FragColor = vec4(col, 1.0);');
  m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4;           // the Small Pond is 5 cm deep: the surface must win against the bed on any depth buffer
  m.name = 'tauride-pond-water';
  return m;
}

/** The meshes and colliders of a plan. opts.field = the environment's field (the water shader reads its distance atlas for the shallow tint and the duckweed band), opts.physics (default ctx.physics), opts.ponds (a table). Returns { mesh, triangles, draws, colliders, buildMs }. */
export function buildPonds(ctx, parent, plan, opts = {}) {
  const t0 = performance.now(), P = opts.ponds || PONDS, W = plan.water;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(W.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(W.nrm, 3)); g.setIndex(new THREE.BufferAttribute(W.idx, 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  const mesh = new THREE.Mesh(g, pondMaterial(ctx, opts.field ?? ctx.services?.environment?.field ?? null, P, opts.zones || []));
  mesh.name = 'tauride-pond-water'; mesh.receiveShadow = false; mesh.castShadow = false; mesh.renderOrder = 1;
  ctx.noBatch(mesh); ctx.noOutline(mesh); parent.add(mesh);
  // the kerb skirt (the quay): one more draw (a granite-grey toon material, the floor's lighting; one-sided, facing the garden where the floor is below the street and the street where it is above)
  let quayMesh = null; const Qd = plan.quay;
  if (Qd && Qd.triangles > 0) {
    const qg = new THREE.BufferGeometry();
    qg.setAttribute('position', new THREE.BufferAttribute(Qd.pos, 3)); qg.setAttribute('normal', new THREE.BufferAttribute(Qd.nrm, 3)); qg.setIndex(new THREE.BufferAttribute(Qd.idx, 1));
    qg.computeBoundingBox(); qg.computeBoundingSphere();
    quayMesh = new THREE.Mesh(qg, ctx.mat.toon(P.QUAY.color, { paint: 0.03, name: 'tauride-quay' }));
    quayMesh.name = 'tauride-quay'; quayMesh.receiveShadow = true; quayMesh.castShadow = false;
    ctx.noBatch(quayMesh); parent.add(quayMesh);
  }
  const ph = opts.physics || ctx.physics; let n = 0;
  if (ph) for (const c of plan.colliders) { ph.addBox(c.cx, c.cz, c.w, c.d, c.rot, c.y0, c.y1); n++; }
  return { mesh, quayMesh, triangles: W.triangles + (quayMesh ? Qd.triangles : 0), waterTriangles: W.triangles, quayTriangles: quayMesh ? Qd.triangles : 0, draws: 1 + (quayMesh ? 1 : 0), colliders: n, buildMs: performance.now() - t0 };
}
