// landmarksTauride/height.js - the land relief of the Tauride Garden as a PURE function (docs/TAURIDE-REMAKE.md, phase T2).
//   gardenHeight(x, z) -> number | null    the terrain height in metres above the street level (y = 0), or null where the garden has no relief (the old line of layout.heightAt answers: the waterway bed or 0)
// The function is the body of the second HEIGHT_PATCH of the North (src/areas/north/hooks/height.js, box RELIEF_BOX). layout.heightAt is evaluated for every map point at start-up (82,500 calls on the garden box), so:
// the box rejects FIRST, the features are prepared ONCE into typed arrays (no allocation per call, no object access), a feature is rejected by its bounding circle before any rotation, and a point that no feature
// lifts answers null. Deterministic and side-effect free: the same (x, z) gives the same bits on every call. NaN / +-Infinity / far points fail the box test and answer null.
// PURE: no three.js, no layout.js, no data facade (the area module loads it without the import-map remap); the only import is the relief data, which is literal data too.
// Profile of a feature (data/relief.js): an ellipse with centre (x, z), semi-axes rx / rz, rotation `rot` degrees (counter-clockwise on the map: +x east, +z south), height h, and a flat top of fraction `top`
// of the radius; q = the elliptical radius (0 at the centre, 1 at the foot): height = h for q <= top, h * s(1 - ...) smoothstep to 0 at q = 1 (zero slope at the top and at the foot, so no crease at the foot).
// Where features overlap the HIGHER one wins (max), so the steepest slope of the field is the steepest slope of one feature: h * 1.5 / (the foot width of the shortest axis).
import { FEATURES, RELIEF_BOX } from './data/relief.js';

export { RELIEF_BOX, FEATURES };

/** Build a height function over a feature list (the module's own `gardenHeight` is `makeGardenHeight()`; the tests build mutants from edited copies of the list). Returns (x, z) => number | null. */
export function makeGardenHeight(features = FEATURES, box = RELIEF_BOX) {
  const n = features.length;
  const cx = new Float64Array(n), cz = new Float64Array(n), co = new Float64Array(n), si = new Float64Array(n);
  const irx = new Float64Array(n), irz = new Float64Array(n), top = new Float64Array(n), hh = new Float64Array(n), rr2 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const f = features[i], a = (f.rot || 0) * Math.PI / 180;
    cx[i] = f.x; cz[i] = f.z; co[i] = Math.cos(a); si[i] = Math.sin(a);
    irx[i] = 1 / f.rx; irz[i] = 1 / f.rz; top[i] = f.top || 0; hh[i] = f.h;
    const R = Math.max(f.rx, f.rz); rr2[i] = R * R;
  }
  const x0 = box[0], x1 = box[1], z0 = box[2], z1 = box[3];
  // a coarse occupancy grid (CELL m cells of the box): 1 where the bounding box of any feature touches the cell. Most of the garden is flat, so most calls end after one lookup (heightAt runs for the whole map at start-up).
  const CELL = 8, inv = 1 / CELL, nx = Math.ceil((x1 - x0) * inv) + 1, nz = Math.ceil((z1 - z0) * inv) + 1, occ = new Uint8Array(nx * nz);
  for (let i = 0; i < n; i++) {
    const R = Math.sqrt(rr2[i]), ax = Math.max(0, Math.floor((cx[i] - R - x0) * inv)), bx = Math.min(nx - 1, Math.floor((cx[i] + R - x0) * inv)), az = Math.max(0, Math.floor((cz[i] - R - z0) * inv)), bz = Math.min(nz - 1, Math.floor((cz[i] + R - z0) * inv));
    for (let b = az; b <= bz; b++) for (let a = ax; a <= bx; a++) occ[b * nx + a] = 1;
  }
  return function gardenHeight(x, z) {
    if (!(x >= x0 && x <= x1 && z >= z0 && z <= z1)) return null;        // also NaN and the far points
    if (occ[(((z - z0) * inv) | 0) * nx + (((x - x0) * inv) | 0)] === 0) return null;      // no feature reaches this cell
    let best = 0;
    for (let i = 0; i < n; i++) {
      const dx = x - cx[i], dz = z - cz[i];
      if (dx * dx + dz * dz >= rr2[i]) continue;                       // outside the bounding circle of the ellipse
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
