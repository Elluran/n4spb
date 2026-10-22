// landmarksTauride/terrain-mesh.js - the LAND RELIEF of the Tauride Garden as a mesh (docs/TAURIDE-REMAKE.md, phase T2). planTerrain() is PURE (no three.js: tools and tests measure it); buildTerrain() makes the meshes.
// The surface is the pure height function gardenHeight (height.js) sampled by an adaptive, crack-free, 2:1-balanced quadtree over a 1 m lattice: leaves of 1 .. 16 m, a leaf is split while the best of its two diagonal
// triangulations is more than TOL (5 cm) away from gardenHeight on a 1 m sample lattice, a leaf whose samples are all below `drop` (2 cm) is dropped (no triangles where the ground is flat: the flat ground below has
// polygonOffset +2 and must not z-fight), a leaf that lies across the foot of the relief (some samples lifted, some flat) splits down to `edge` (2 m) so that the mesh hugs the lifted ground instead of leaving an
// apron of up to 16 m of flat triangles round every hill (T2 fix round 1: the apron was the straight-edged "pad" of the aerial views), and a leaf next to a leaf of half its size gets that neighbour's midpoint as a
// vertex (no T-junction cracks, also across the 64 m chunk borders: both chunks hold the same vertices there).
// Triangles go to the 64 m chunk of their leaf (one mesh and one draw per chunk that has any). NO COLLIDERS: the player and the pedestrians follow heightAt (the HEIGHT_PATCH is the same function).
// The material is the GROUND'S OWN shader when the environment's ground exists (terrainMaterial: the same program, the colour a function of the world (x, z), so the hills show the lawn and the way paint of the
// flat ground at the same place and no seam along the contour; T2 fix round 2); otherwise (a headless test of the builder alone) a PLACEHOLDER, a toon vertex-coloured grass (darker on slopes, a little earth where it is steep).
import * as THREE from 'three';
import { registerLOD } from '../../core/spatial.js';
import { gardenHeight, RELIEF_BOX } from './height.js';

export const TERRAIN = Object.freeze({
  chunk: 64,            // metres: the chunk grid of the meshes (aligned to multiples of 64 on the project frame)
  tol: 0.05,            // metres: the largest allowed distance between the mesh and gardenHeight (asserted on the built plan: tools/tauride-height-test.mjs, measurePlan)
  split: 0.04,          // metres: the error at which a leaf splits (below tol: the fan of a leaf with hanging midpoints is not the two-triangle quad that the split test measures)
  top: 16,              // metres: the first leaf size (a power of two); a leaf is dropped when no sample of it is lifted
  drop: 0.02,           // metres: below this a sample counts as flat ground (2 cm is not seen on a lawn and is the largest step between an open mesh border and the ground; below `split`)
  edge: 2,              // metres: the smallest leaf that may still straddle the foot of the relief (lifted and flat samples in one leaf): the mesh follows the 2 cm contour within this
  drawsMax: 16,
  trianglesTarget: 40000,
});

const hOf = (gh, x, z) => gh(x, z) ?? 0;

/** The plan of the terrain meshes for a height function `gh` over `box` ([x0, x1, z0, z1]): { chunks: [{ cx, cz, x0, z0, pos, nrm, col, idx, tris }], tris, leaves, splits, stats }. Pure and deterministic. */
export function planTerrain(gh = gardenHeight, box = RELIEF_BOX, o = {}) {
  const T = { ...TERRAIN, ...o }, CH = T.chunk, TOL = T.split;
  const I0 = Math.floor(box[0] / CH) * CH, J0 = Math.floor(box[2] / CH) * CH, W = Math.ceil((box[1] - I0) / CH) * CH, H = Math.ceil((box[3] - J0) / CH) * CH;
  const lev = new Int8Array(W * H).fill(-1);                      // per 1 m cell: log2 of the size of the meshed leaf that covers it, -1 = none
  const fill = (i, j, s, L) => { for (let b = j; b < j + s; b++) for (let a = i; a < i + s; a++) lev[b * W + a] = L; };
  const levAt = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : lev[j * W + i]);
  const log2 = (s) => Math.round(Math.log2(s));
  // the samples of a leaf: n x n cells of step s / n (n = min(s, 16): a step of one metre up to 16 m leaves) -> { max, err (best diagonal), diag }
  function measure(i, j, s) {
    const n = Math.min(s, 16), st = s / n, row = new Float64Array((n + 1) * (n + 1));
    let max = 0, min = Infinity;
    for (let b = 0; b <= n; b++) for (let a = 0; a <= n; a++) { const h = hOf(gh, I0 + i + a * st, J0 + j + b * st); row[b * (n + 1) + a] = h; if (h > max) max = h; if (h < min) min = h; }
    if (max < T.drop) return { max, min, err: 0, diag: 0 };
    const h00 = row[0], h10 = row[n], h01 = row[n * (n + 1)], h11 = row[n * (n + 1) + n];
    let e0 = 0, e1 = 0;
    for (let b = 0; b <= n; b++) for (let a = 0; a <= n; a++) {
      const u = a / n, v = b / n, h = row[b * (n + 1) + a];
      const d0 = u >= v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;                 // diagonal (i0,j0)-(i1,j1)
      const d1 = u + v <= 1 ? h00 + (h10 - h00) * u + (h01 - h00) * v : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);   // diagonal (i1,j0)-(i0,j1)
      e0 = Math.max(e0, Math.abs(h - d0)); e1 = Math.max(e1, Math.abs(h - d1));
    }
    return e0 <= e1 ? { max, min, err: e0, diag: 0 } : { max, min, err: e1, diag: 1 };
  }
  // 1. the first leaves: every `top` m cell of the lattice with any lifted sample
  let leaves = [], splits = 0;
  for (let j = 0; j < H; j += T.top) for (let i = 0; i < W; i += T.top) { const m = measure(i, j, T.top); if (m.max >= T.drop) leaves.push({ i, j, s: T.top }); }
  // 2. the adaptive split
  const out = [];
  const queue = leaves; leaves = [];
  while (queue.length) {
    const lf = queue.pop(), m = measure(lf.i, lf.j, lf.s);
    if (m.max < T.drop) continue;                                  // all flat: no triangles
    if ((m.err > TOL || (m.min < T.drop && lf.s > T.edge)) && lf.s > 1) { const h = lf.s / 2; splits++; for (const [a, b] of [[0, 0], [h, 0], [0, h], [h, h]]) queue.push({ i: lf.i + a, j: lf.j + b, s: h }); continue; }
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
      for (const [a, b] of [[0, 0], [h, 0], [0, h], [h, h]]) { const c = { i: lf.i + a, j: lf.j + b, s: h }; c.diag = measure(c.i, c.j, c.s).diag; fill(c.i, c.j, c.s, log2(h)); next.push(c); }
    }
    leaves = next;
  }
  // 4. the triangles, per chunk (a leaf lies inside one chunk: 64 is a multiple of every leaf size)
  const chunks = new Map(), NB = 0.5;
  const colorOf = makeColor();
  const norm = (x, z) => { const dx = hOf(gh, x + NB, z) - hOf(gh, x - NB, z), dz = hOf(gh, x, z + NB) - hOf(gh, x, z - NB); const g = Math.hypot(dx, dz) / (2 * NB), l = Math.hypot(dx / (2 * NB), 1, dz / (2 * NB)); return [-dx / (2 * NB) / l, 1 / l, -dz / (2 * NB) / l, g]; };
  for (const lf of leaves) {
    const x = I0 + lf.i, z = J0 + lf.j, cx = Math.floor(x / CH), cz = Math.floor(z / CH), key = cx + ',' + cz;
    let c = chunks.get(key); if (!c) chunks.set(key, c = { cx, cz, x0: cx * CH, z0: cz * CH, vmap: new Map(), pos: [], nrm: [], col: [], idx: [] });
    const vert = (px, pz) => {
      const k = px * 4096 + pz, hit = c.vmap.get(k); if (hit !== undefined) return hit;
      const h = hOf(gh, px, pz), n = norm(px, pz), col = colorOf(px, pz, n[3]), id = c.pos.length / 3;
      c.pos.push(px, h, pz); c.nrm.push(n[0], n[1], n[2]); c.col.push(col[0], col[1], col[2]); c.vmap.set(k, id); return id;
    };
    const s = lf.s, L = log2(s), h2 = s / 2;
    const half = (i0, j0, di, dj) => s > 1 && (levAt(i0, j0) === L - 1 || levAt(i0 + di, j0 + dj) === L - 1);      // the neighbour across an edge has leaves of half the size (either half of the edge may be meshed)
    const hang = { b: half(lf.i + h2 - 1, lf.j - 1, 1, 0), r: half(lf.i + s, lf.j + h2 - 1, 0, 1), t: half(lf.i + h2 - 1, lf.j + s, 1, 0), l: half(lf.i - 1, lf.j + h2 - 1, 0, 1) };
    const P = { x0: x, x1: x + s, z0: z, z1: z + s, xm: x + h2, zm: z + h2 };
    const emit = (a, b, d) => {
      // orientation: counter-clockwise seen from +y (the normal of (b - a) x (d - a) points up)
      const cr = (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]);       // x * z' - z * x' (the y component of the cross product with x east, z south, is -(that))
      const A = vert(a[0], a[1]), B = vert(b[0], b[1]), C = vert(d[0], d[1]);
      if (A === B || B === C || A === C) return;
      if (cr > 0) c.idx.push(A, C, B); else c.idx.push(A, B, C);
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
  return { chunks: list, tris, leaves: leaves.length, splits, tol: T.tol, split: TOL, drop: T.drop, edge: T.edge, chunksBefore, box: [I0, I0 + W, J0, J0 + H] };
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

/** The material of the environment's ground (the painterly world-space shader of environment/ground.js: its meshes are named 'env-ground' in the group 'env' of ctx.staticRoot, built before this module), or null. */
export function groundMaterial(ctx) {
  const env = ctx.staticRoot && ctx.staticRoot.children ? ctx.staticRoot.children.find((o) => o.name === 'env') : null;
  const grp = env && env.getObjectByName ? env.getObjectByName('env-ground') : null;
  const mesh = grp && grp.children ? grp.children.find((o) => o.isMesh && o.material && typeof o.material.onBeforeCompile === 'function') : null;
  return mesh ? mesh.material : null;
}

/**
 * The material of the relief. THE GROUND'S OWN SHADER when the environment's ground exists: its colour is a function of the world position (x, z) alone (the class mask of the OSM data, the noise tile, the
 * lawn / gravel / earth patches), so a hill painted with the same program shows exactly what the flat ground shows at the same (x, z): no seam along the contour, the grey way paint stays visible on the
 * hill. The copy is a second `ctx.mat.toon` material that takes the ground's onBeforeCompile and customProgramCacheKey (the same compiled program, the same shared uniform objects) WITHOUT its
 * polygonOffset: the ground is pushed back by 2 depth units so that everything above it wins, and the relief (2 cm and more above the ground) must keep winning over it. No ground (a headless test of the
 * builder alone) -> the vertex-coloured placeholder grass of makeColor().
 */
export function terrainMaterial(ctx) {
  const gm = groundMaterial(ctx);
  if (!gm) return { mat: ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.02, name: 'tauride-terrain' }), shared: false };
  const mat = ctx.mat.toon('#ffffff', { paint: 0.02, name: 'tauride-terrain-ground' });
  mat.onBeforeCompile = gm.onBeforeCompile; mat.customProgramCacheKey = gm.customProgramCacheKey;
  return { mat, shared: true };
}

/** The meshes of a plan: one Mesh per chunk (`tauride-terrain-<cx>_<cz>`), noBatch + registerLOD(Infinity) like the chunks of environment/ground.js, no colliders. Returns { group, triangles, draws, shared (the ground's own shader) }. */
export function buildTerrain(ctx, parent, plan) {
  const group = new THREE.Group(); group.name = 'tauride-terrain';
  const { mat, shared } = terrainMaterial(ctx);
  for (const c of plan.chunks) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(c.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(c.nrm, 3)); if (!shared) g.setAttribute('color', new THREE.BufferAttribute(c.col, 3));
    g.setIndex(new THREE.BufferAttribute(c.idx, 1)); g.computeBoundingBox(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.name = `tauride-terrain-${c.cx}_${c.cz}`; m.receiveShadow = true; m.castShadow = false;
    if (shared) m.renderOrder = -1;      // the painterly shader is dear: drawn BEFORE the ground (three sorts opaque meshes by renderOrder first, then by material id = creation order, the ground first), so the ground fragments under a hill fail the early depth test instead of being shaded twice
    ctx.noBatch(m); group.add(m);
  }
  parent.add(group); group.updateMatrixWorld(true);
  for (const m of group.children) registerLOD(m, Infinity);
  return { group, triangles: plan.tris, draws: plan.chunks.length, shared };
}

/** The distance between the planned mesh and `gh`: rasterises every triangle on a `step` m lattice and compares the interpolated height with gh. { maxErr, at, samples, uncovered (samples at or above the plan's `drop` that no triangle covers), boundaryHigh (the highest point of an open edge), nonManifold, padArea (m2 of the footprint of all triangles), apronArea (m2 of the triangles with no corner above `drop`), liftedArea (m2 of the lattice points at or above `drop`) } */
export function measurePlan(plan, gh = gardenHeight, step = 0.5) {
  let maxErr = 0, at = null, samples = 0, padArea = 0, apronArea = 0;
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
  return { maxErr, at, samples, lifted, uncovered, boundaryHigh, nonManifold, padArea, apronArea, liftedArea: lifted * step * step };
}
