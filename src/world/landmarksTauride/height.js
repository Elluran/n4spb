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

export { RELIEF_BOX, FEATURES };

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

export const gardenHeight = makeGardenHeight();
