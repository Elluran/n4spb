// landmarksTauride/height.js - the land relief of the Tauride Garden as a PURE function (docs/TAURIDE-REMAKE.md, phase T2).
//   gardenHeight(x, z) -> number | null    the terrain height in metres above the street level (y = 0), or null where the garden has no relief (the old line of layout.heightAt answers: the waterway bed or 0)
// The function is the body of the second HEIGHT_PATCH of the North (src/areas/north/hooks/height.js, box RELIEF_HULL: the box of the hills, not the garden's). layout.heightAt is evaluated for every map point at start-up
// (82,500 calls on the garden box), so: the patch box is the tight hull of the features (62 % of the garden box: no call at all for the rest), the function rejects its own box FIRST, the features are prepared ONCE into
// typed arrays (no allocation per call, no object access), a cell mask of 4 m cells says which features can reach a point (most points end after one lookup, a hill point evaluates one or two features), and a point that
// no feature lifts answers null. Deterministic and side-effect free: the same (x, z) gives the same bits on every call. NaN / +-Infinity / far points fail the box test and answer null.
// PURE: no three.js, no layout.js, no data facade (the area module loads it without the import-map remap); the only import is the relief data, which is literal data too.
// Profile of a feature (data/relief.js): an ellipse with centre (x, z), semi-axes rx / rz, rotation `rot` degrees (counter-clockwise on the map: +x east, +z south), height h, and a flat top of fraction `top`
// of the radius; q = the elliptical radius (0 at the centre, 1 at the foot): height = h for q <= top, h * s(1 - ...) smoothstep to 0 at q = 1 (zero slope at the top and at the foot, so no crease at the foot).
// Where features overlap the HIGHER one wins (max), so the steepest slope of the field is the steepest slope of one feature: h * 1.5 / (the foot width of the shortest axis).
import { FEATURES, RELIEF_BOX } from './data/relief.js';
import { WATER_UNION } from './data/water.js';
import { GARDEN } from './data/footprints.js';
import * as PONDS from './data/ponds.js';

export { RELIEF_BOX, FEATURES, PONDS };

/** The box of the relief itself: the bounding box of the feature ellipses (rotation included) rounded OUT to whole metres plus `margin` m. [x0, x1, z0, z1]. gardenHeight answers null outside it, so it is the box of the
 *  HEIGHT_PATCH (the engine's heightAt skips the call outside it); RELIEF_BOX stays the box of the garden for the tools (mesh grid, lattices of the tests).
 *  The default margin is 0.5 on purpose: every number of the box is then a fraction (x.5), so the array holds doubles like PARADNY_BOX (an all-integer box would be an array of small integers, another elements kind for the
 *  one keyed load `box[i]` of the engine's heightAt: no measurable effect was found, it costs nothing). */
export function reliefHull(features = FEATURES, margin = 0.5) {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const f of features) {
    const a = (f.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), hx = Math.hypot(f.rx * c, f.rz * s), hz = Math.hypot(f.rx * s, f.rz * c);      // half extents of the rotated ellipse
    x0 = Math.min(x0, f.x - hx); x1 = Math.max(x1, f.x + hx); z0 = Math.min(z0, f.z - hz); z1 = Math.max(z1, f.z + hz);
  }
  return [Math.floor(x0) - margin, Math.ceil(x1) + margin, Math.floor(z0) - margin, Math.ceil(z1) + margin];
}
export const RELIEF_HULL = reliefHull();

/** Build a height function over a feature list (the module's own `gardenHeight` is `makeGardenHeight()`; the tests build mutants from edited copies of the list). Returns (x, z) => number | null. */
export function makeGardenHeight(features = FEATURES, box = RELIEF_BOX) {
  const n = features.length;
  if (n > 32) throw new Error('makeGardenHeight: at most 32 features (the cell masks are 32 bits), got ' + n);
  const cx = new Float64Array(n), cz = new Float64Array(n), co = new Float64Array(n), si = new Float64Array(n);
  const irx = new Float64Array(n), irz = new Float64Array(n), top = new Float64Array(n), hh = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const f = features[i], a = (f.rot || 0) * Math.PI / 180;
    cx[i] = f.x; cz[i] = f.z; co[i] = Math.cos(a); si[i] = Math.sin(a);
    irx[i] = 1 / f.rx; irz[i] = 1 / f.rz; top[i] = f.top || 0; hh[i] = f.h;
  }
  const x0 = box[0], x1 = box[1], z0 = box[2], z1 = box[3];
  // A cell mask grid (CELL m cells of the box): bit i of a cell is set when feature i may reach the cell (its ellipse comes within the half diagonal of the cell centre: conservative, never misses). Most of the garden is flat, so
  // most calls end after one lookup (heightAt runs for the whole map at start-up and the cold JIT pays for every bytecode of that path), and a call in a cell with a hill evaluates only the one or two features whose bit is set.
  const CELL = 4, inv = 1 / CELL, rc = CELL * Math.SQRT1_2, nx = Math.ceil((x1 - x0) * inv) + 1, nz = Math.ceil((z1 - z0) * inv) + 1, cell = new Uint32Array(nx * nz);
  for (let i = 0; i < n; i++) {
    const R = Math.max(1 / irx[i], 1 / irz[i]) + rc, ax = Math.max(0, Math.floor((cx[i] - R - x0) * inv)), bx = Math.min(nx - 1, Math.floor((cx[i] + R - x0) * inv)), az = Math.max(0, Math.floor((cz[i] - R - z0) * inv)), bz = Math.min(nz - 1, Math.floor((cz[i] + R - z0) * inv));
    const slack = rc * Math.max(irx[i], irz[i]);      // the cell centre may be this far (in units of the normalised ellipse radius) from the nearest point of the cell
    for (let b = az; b <= bz; b++) for (let a = ax; a <= bx; a++) {
      const dx = x0 + (a + 0.5) * CELL - cx[i], dz = z0 + (b + 0.5) * CELL - cz[i], u = (dx * co[i] + dz * si[i]) * irx[i], v = (-dx * si[i] + dz * co[i]) * irz[i];
      if (Math.sqrt(u * u + v * v) < 1 + slack) cell[b * nx + a] |= 1 << i;
    }
  }
  return function gardenHeight(x, z) {
    if (!(x >= x0 && x <= x1 && z >= z0 && z <= z1)) return null;        // also NaN and the far points
    let m = cell[(((z - z0) * inv) | 0) * nx + (((x - x0) * inv) | 0)];
    if (m === 0) return null;                                            // no feature reaches this cell
    let best = 0;
    for (let i = 0; m !== 0; i++, m >>>= 1) {
      if ((m & 1) === 0) continue;
      const dx = x - cx[i], dz = z - cz[i];
      const u = (dx * co[i] + dz * si[i]) * irx[i], v = (-dx * si[i] + dz * co[i]) * irz[i];
      const q = Math.sqrt(u * u + v * v);
      if (q >= 1) continue;
      let h;
      if (q <= top[i]) h = hh[i];
      else { const t = (1 - q) / (1 - top[i]); h = hh[i] * t * t * (3 - 2 * t); }
      if (h > best) best = h;
    }
    return best > 0 ? best : null;
  };
}

// ============================================================================ T4a: the ponds (data/ponds.js is the ONE datum table; data/water.js the outline)
// gardenHeight is now the TERRAIN: the pond bowls and banks + the relief. The relief alone stays available (`reliefHeight`, `makeGardenHeight`: the tools and the mutants of the relief rules use it).
// The shore is the union outline of data/water.js (136 vertices + 3 islands): the signed distance to it (+ land, - water) is the input of the profile. It is computed ONCE at module load into a compact structure and
// answered EXACTLY (not interpolated): a 2 m cell grid; a cell farther from the outline than the reach of the profile is 'land' or 'water' (one byte), a cell near the outline holds the list of the segments
// within reach of it (CSR arrays). The distance is the nearest segment; the SIGN comes from the pseudo-normal of the nearest feature (the normal of the segment, or the angle-weighted normal of the vertex), which is
// exact for a simple polygon. Pure, deterministic, no allocation per call; a point outside every near cell costs one byte read.

const smooth = (a, b, x) => { const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return t * t * (3 - 2 * t); };

/** The reach of the pond profile (m): how far from the outline, on land and in the water, the table's profile differs from the lawn / the flat bed. */
export function pondReach(P = PONDS) {
  const land = 2 * (P.BANK_TOP - P.WATER_Y) * P.SLOPE_MAX + P.CREST_FALL, water = (P.WATER_Y - Math.min(P.BED_BIG, P.BED_SMALL)) * P.SLOPE_MAX * (1 + P.BED_KNEE);
  return { land, water, max: Math.max(land, water) };
}

/** The profile functions of a datum table `P` (data/ponds.js or a copy with one number changed): { slopeAt(x, z), bedAt(x, z), landH(d, s), waterH(u, s, bed) } where d >= 0 is the distance on the land side, u >= 0 in the water. */
export function pondProfile(P = PONDS) {
  const N = P.SLOPE_NOISE, S = P.SMALL_POND, e = P.BED_KNEE, T = P.BANK_TOP, W0 = P.WATER_Y, F = P.CREST_FALL, R = 2 * (T - W0);      // R s = the run of the quadratic ease: its slope at the waterline is exactly 1 : s
  const slopeAt = (x, z) => P.SLOPE_MIN + (P.SLOPE_MAX - P.SLOPE_MIN) * (0.5 + 0.5 * Math.sin(x * N.kx + N.px) * Math.sin(z * N.kz + N.pz));
  const bedAt = (x, z) => { const big = smooth(S.mouthZ, S.mouthZ + S.blendZ, z) * smooth(S.eastX - S.blendX, S.eastX, x); return P.BED_SMALL + (P.BED_BIG - P.BED_SMALL) * big; };
  const landH = (d, s) => {
    const D = R * s;
    if (d < D) { const t = 1 - d / D; return W0 + (T - W0) * (1 - t * t); }
    return d < D + F ? T * (1 - smooth(D, D + F, d)) : 0;
  };
  const waterH = (u, s, bed) => {
    const depth = W0 - bed; if (!(depth > 0)) return W0 - u / s < bed ? bed : W0 - u / s;
    const q = u / (depth * s), g = q <= 1 - e ? q : q < 1 + e ? q - (q - (1 - e)) * (q - (1 - e)) / (4 * e) : 1;
    return W0 - depth * g;
  };
  return { slopeAt, bedAt, landH, waterH };
}

/** The rings of a union ([{ o, h: [ring, ...] }]) as the segment table of the shore: { n, ax, az, ex, ez, inv2, nx, nz (the unit normal to the LAND), pax, paz, pbx, pbz (the pseudo-normals of the start and the end vertex) }.
 *  A segment shorter than 1e-6 m is dropped. */
export function shoreSegments(union) {
  const rings = [];
  for (const p of union) { rings.push({ r: p.o, hole: false }); for (const h of p.h || []) rings.push({ r: h, hole: true }); }
  const A = [], pts = [];
  for (const { r, hole } of rings) {
    const v = []; for (let i = 0; i < r.length; i += 2) { const q = v[v.length - 1]; if (!q || Math.hypot(r[i] - q[0], r[i + 1] - q[1]) > 1e-6) v.push([r[i], r[i + 1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 1e-6) v.pop();
    let area = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a[0] * b[1] - b[0] * a[1]; }
    const sg = (area > 0 ? 1 : -1) * (hole ? 1 : -1);                       // the interior of a ring of positive shoelace area lies to the rotate(+90) side of an edge: (-ez, ex); the land is outside an outer ring and inside a hole
    const m = v.length, nrm = [];
    for (let i = 0; i < m; i++) { const a = v[i], b = v[(i + 1) % m], ex = b[0] - a[0], ez = b[1] - a[1], l = Math.hypot(ex, ez); nrm.push([-ez / l * sg, ex / l * sg]); }
    for (let i = 0; i < m; i++) {
      const a = v[i], b = v[(i + 1) % m], n = nrm[i], np = nrm[(i + m - 1) % m], nn = nrm[(i + 1) % m];
      const pa = [np[0] + n[0], np[1] + n[1]], pb = [n[0] + nn[0], n[1] + nn[1]], la = Math.hypot(pa[0], pa[1]), lb = Math.hypot(pb[0], pb[1]);
      A.push({ ax: a[0], az: a[1], ex: b[0] - a[0], ez: b[1] - a[1], nx: n[0], nz: n[1], pax: la > 1e-9 ? pa[0] / la : n[0], paz: la > 1e-9 ? pa[1] / la : n[1], pbx: lb > 1e-9 ? pb[0] / lb : n[0], pbz: lb > 1e-9 ? pb[1] / lb : n[1] });
      pts.push(a[0], a[1]);
    }
  }
  const n = A.length, f = (k) => Float64Array.from(A, (s) => s[k]);
  const out = { n, ax: f('ax'), az: f('az'), ex: f('ex'), ez: f('ez'), nx: f('nx'), nz: f('nz'), pax: f('pax'), paz: f('paz'), pbx: f('pbx'), pbz: f('pbz'), inv2: new Float64Array(n) };
  for (let i = 0; i < n; i++) out.inv2[i] = 1 / (out.ex[i] * out.ex[i] + out.ez[i] * out.ez[i]);
  return out;
}

/** The signed-distance structure of a union outline: shore.dist(x, z) -> metres, + on land, - in the water, EXACT where the point lies within `reach` m of the outline (a near cell), else the sign times (reach + cell)
 *  (a stand-in: the profile is flat there); shore.box = the grid box. Brute-force reference: `shoreDistBrute` (the tests compare the two). */
export function makeShore(union = WATER_UNION, reach = pondReach().max, CELL = 2, garden = GARDEN.o) {
  const S = shoreSegments(union), n = S.n;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, S.ax[i]); x1 = Math.max(x1, S.ax[i]); z0 = Math.min(z0, S.az[i]); z1 = Math.max(z1, S.az[i]); }
  const pad = reach + 2 * CELL; x0 = Math.floor((x0 - pad) / CELL) * CELL; z0 = Math.floor((z0 - pad) / CELL) * CELL;
  const nx = Math.ceil((x1 + pad - x0) / CELL), nz = Math.ceil((z1 + pad - z0) / CELL), inv = 1 / CELL, rr = reach + CELL * Math.SQRT1_2 + 1e-6;
  const segDist2 = (i, px, pz) => { const wx = px - S.ax[i], wz = pz - S.az[i]; let t = (wx * S.ex[i] + wz * S.ez[i]) * S.inv2[i]; t = t < 0 ? 0 : t > 1 ? 1 : t; const dx = wx - t * S.ex[i], dz = wz - t * S.ez[i]; return dx * dx + dz * dz; };
  const start = new Int32Array(nx * nz + 1);
  const cells = (i, fn) => {                                              // the cells whose centre lies within rr of segment i
    const ax = S.ax[i], az = S.az[i], bx = ax + S.ex[i], bz = az + S.ez[i];
    const ia = Math.max(0, Math.floor((Math.min(ax, bx) - rr - x0) * inv)), ib = Math.min(nx - 1, Math.floor((Math.max(ax, bx) + rr - x0) * inv));
    const ja = Math.max(0, Math.floor((Math.min(az, bz) - rr - z0) * inv)), jb = Math.min(nz - 1, Math.floor((Math.max(az, bz) + rr - z0) * inv));
    for (let j = ja; j <= jb; j++) for (let a = ia; a <= ib; a++) if (segDist2(i, x0 + (a + 0.5) * CELL, z0 + (j + 0.5) * CELL) <= rr * rr) fn(j * nx + a);
  };
  for (let i = 0; i < n; i++) cells(i, (c) => { start[c + 1]++; });
  for (let c = 0; c < nx * nz; c++) start[c + 1] += start[c];
  const list = new Int32Array(start[nx * nz]), fillAt = start.slice(0, nx * nz);
  for (let i = 0; i < n; i++) cells(i, (c) => { list[fillAt[c]++] = i; });
  // inside / outside of the far cells: the even-odd count of the outline crossings left of each cell centre (a scanline per row)
  const far = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) {
    const zc = z0 + (j + 0.5) * CELL, xs = [];
    for (let i = 0; i < n; i++) { const za = S.az[i], zb = za + S.ez[i]; if ((za > zc) !== (zb > zc)) xs.push(S.ax[i] + (zc - za) / S.ez[i] * S.ex[i]); }
    xs.sort((a, b) => a - b);
    for (let a = 0, k = 0; a < nx; a++) { const xc = x0 + (a + 0.5) * CELL; while (k < xs.length && xs[k] < xc) k++; far[j * nx + a] = k & 1; }       // an odd count of crossings to the left = inside the outer ring and outside every hole = WATER
  }
  // the garden gate: the banks exist only INSIDE the garden polygon (outside it the ground is the street: flat y = 0, drawn by the environment). gate per cell: 0 = every point of the cell is inside the garden,
  // 2 = every point is outside, 1 = the outline of the garden crosses the cell (the exact ring test decides). Water points are never gated (the union lies inside the garden; it touches the outline along the north shore).
  const gate = new Uint8Array(nx * nz), gn = garden.length / 2;
  // `inGarden`: the even-odd ring test, OR within 5 cm of the outline (the north shore of the lake IS the outline: a point of the floor's cut edge must not flip to the street's 0 by rounding)
  const inGarden = (x, z) => {
    let c = false, near = false;
    for (let i = 0, j = gn - 1; i < gn; j = i++) {
      const xi = garden[2 * i], zi = garden[2 * i + 1], xj = garden[2 * j], zj = garden[2 * j + 1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
      const ex = xi - xj, ez = zi - zj, l2 = ex * ex + ez * ez, t = l2 ? Math.max(0, Math.min(1, ((x - xj) * ex + (z - zj) * ez) / l2)) : 0, dx = x - xj - t * ex, dz = z - zj - t * ez;
      if (dx * dx + dz * dz < 0.0025) near = true;
    }
    return c || near;
  };
  for (let j = 0; j < nz; j++) for (let a = 0; a < nx; a++) {
    const cx0 = x0 + a * CELL, cz0 = z0 + j * CELL, cx1 = cx0 + CELL, cz1 = cz0 + CELL; let cross = false;
    for (let i = 0; i < gn && !cross; i++) {                                // does the garden edge i touch the square? (bbox first, then the four corners against the edge's line)
      const ax = garden[2 * i], az = garden[2 * i + 1], bx = garden[2 * ((i + 1) % gn)], bz = garden[2 * ((i + 1) % gn) + 1];
      if (Math.max(ax, bx) < cx0 || Math.min(ax, bx) > cx1 || Math.max(az, bz) < cz0 || Math.min(az, bz) > cz1) continue;
      const ex = bx - ax, ez = bz - az; let pos = 0, neg = 0;
      for (const [px, pz] of [[cx0, cz0], [cx1, cz0], [cx0, cz1], [cx1, cz1]]) { const v = ex * (pz - az) - ez * (px - ax); if (v > 0) pos++; else if (v < 0) neg++; }
      if (pos > 0 && neg > 0) cross = true;
    }
    gate[j * nx + a] = cross ? 1 : (inGarden(cx0 + CELL / 2, cz0 + CELL / 2) ? 0 : 2);
  }
  const dist = (x, z) => {
    if (!(x >= x0 && x < x0 + nx * CELL && z >= z0 && z < z0 + nz * CELL)) return reach + CELL;
    const c = (((z - z0) * inv) | 0) * nx + (((x - x0) * inv) | 0), a = start[c], b = start[c + 1];
    if (a === b) return far[c] ? -(reach + CELL) : reach + CELL;
    let best = Infinity, sg = 1;
    for (let k = a; k < b; k++) {
      const i = list[k], wx = x - S.ax[i], wz = z - S.az[i], t = (wx * S.ex[i] + wz * S.ez[i]) * S.inv2[i];
      let d2, s;
      if (t <= 0) { d2 = wx * wx + wz * wz; s = wx * S.pax[i] + wz * S.paz[i]; }
      else if (t >= 1) { const ux = wx - S.ex[i], uz = wz - S.ez[i]; d2 = ux * ux + uz * uz; s = ux * S.pbx[i] + uz * S.pbz[i]; }
      else { const ux = wx - t * S.ex[i], uz = wz - t * S.ez[i]; d2 = ux * ux + uz * uz; s = ux * S.nx[i] + uz * S.nz[i]; }
      if (d2 < best) { best = d2; sg = s >= 0 ? 1 : -1; }
    }
    return sg * Math.sqrt(best);
  };
  return { dist, gate, inGarden, box: [x0, x0 + nx * CELL, z0, z0 + nz * CELL], cell: CELL, reach, segments: n, nearCells: (() => { let q = 0; for (let c = 0; c < nx * nz; c++) if (start[c + 1] > start[c]) q++; return q; })(), listEntries: list.length, nx, nz, far, start, bytes: far.byteLength + gate.byteLength + start.byteLength + list.byteLength + 11 * 8 * n };
}

/** the exact signed distance to the union by looking at EVERY segment and the even-odd rule over all rings (the reference of the tests; slow) */
export function shoreDistBrute(union, x, z) {
  let best = Infinity, inside = false;
  for (const p of union) for (const ring of [p.o, ...(p.h || [])]) {
    for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
      const ax = ring[j], az = ring[j + 1], bx = ring[i], bz = ring[i + 1], ex = bx - ax, ez = bz - az, l2 = ex * ex + ez * ez;
      const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l2)) : 0;
      best = Math.min(best, Math.hypot(x - ax - t * ex, z - az - t * ez));
      if ((az > z) !== (bz > z) && x < ex * (z - az) / ez + ax) inside = !inside;
    }
  }
  return inside ? -best : best;
}

/** The box (with `margin`, whole metres + .5 like reliefHull) of everything the terrain function answers for: the hills and the shore band of the ponds. This is the box of the HEIGHT_PATCH 'garden'. */
export function terrainHull(features = FEATURES, union = WATER_UNION, P = PONDS, margin = 0.5) {
  const h = reliefHull(features, margin), r = pondReach(P).max;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of union) for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
  return [Math.min(h[0], Math.floor(x0 - r) - margin), Math.max(h[1], Math.ceil(x1 + r) + margin), Math.min(h[2], Math.floor(z0 - r) - margin), Math.max(h[3], Math.ceil(z1 + r) + margin)];
}

/**
 * The TERRAIN height function: the bowls and the banks of the ponds plus the relief. Returns (x, z) => number | null (null where nothing lifts or sinks the ground: the old line answers).
 *   in the water    the bed: the table's profile from the shore (flat bed, rounded knee), the bed height by position (Big / Small Pond)
 *   on land         the bank profile (up to its reach from the shore) + the relief (zero near the water by the relief rules)
 * o = { features, union, ponds (a datum table), box (the relief box), shore (a prebuilt makeShore) } for the tests and the mutants.
 */
export function makeTerrainHeight(o = {}) {
  const P = o.ponds || PONDS, union = o.union || WATER_UNION, relief = makeGardenHeight(o.features || FEATURES, o.box || RELIEF_BOX);
  const prof = pondProfile(P), reach = pondReach(P), shore = o.shore || makeShore(union, reach.max), slopeAt = prof.slopeAt, bedAt = prof.bedAt, landH = prof.landH, waterH = prof.waterH;
  const [bx0, bx1, bz0, bz1] = shore.box, C = shore.cell, inv = 1 / C, nx = shore.nx, far = shore.far, start = shore.start, dist = shore.dist, gate = shore.gate, inGarden = shore.inGarden;
  const deepWater = reach.water;
  function terrainHeight(x, z) {
    if (x >= bx0 && x < bx1 && z >= bz0 && z < bz1) {
      const c = (((z - bz0) * inv) | 0) * nx + (((x - bx0) * inv) | 0);
      if (start[c] === start[c + 1]) { if (far[c] === 1) return bedAt(x, z); }
      else {
        const d = dist(x, z);
        if (d < 0) return d < -deepWater ? bedAt(x, z) : waterH(-d, slopeAt(x, z), bedAt(x, z));
        const g = gate[c]; if (g === 2 || (g === 1 && !inGarden(x, z))) return relief(x, z);       // outside the garden polygon the ground is the street's (flat), not a bank
        const b = landH(d, slopeAt(x, z)), r = relief(x, z);
        const h = r === null ? b : b + r;
        return h === 0 ? null : h;
      }
    }
    return relief(x, z);
  }
  terrainHeight.shore = shore; terrainHeight.relief = relief; terrainHeight.profile = prof; terrainHeight.reach = reach; terrainHeight.ponds = P;
  return terrainHeight;
}

/** the land relief alone (the hills of data/relief.js; null where no hill lifts the ground) */
export const reliefHeight = makeGardenHeight();
/** the box of the HEIGHT_PATCH 'garden': the hills AND the shore band of the ponds */
export const TERRAIN_HULL = terrainHull();
/** the terrain: ponds + relief (the second HEIGHT_PATCH of the North, src/areas/north/hooks/height.js; the floor mesh, the paths, the ground mask and the tests read this) */
export const gardenHeight = makeTerrainHeight();
/** the shared signed-distance structure of the module's own height function (the water surface, the colliders and the ground mask use the same one) */
export const GARDEN_SHORE = gardenHeight.shore;
