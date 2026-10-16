// slots.js - FACADE SLOTS: the city's door to the shared label registry (docs/rules/LABELS-API.md, streets/labels.js, ctx.services.labels).
// Everything that hangs flat on a wall and can be seen crossing something else - shop fascia signs, awnings, address plates, downpipes, AC units, door canopies - reserves its rectangle in
// the registry BEFORE it is drawn and is skipped (or moved) when another label already holds the place. Order of reservation = priority: street-name / number plates (streets.js, built before
// the city) > shop fascia signs > awnings > address plates of the city > downpipes (shifted to a free bay boundary) > AC units.
//   const labels = labelRegistry(ctx);
//   labels.reserve(buildingId, x, y, z, w, h, nx, nz, kind)   -> true when the rectangle is yours (centre on / in front of the wall, (nx, nz) = outward unit normal), false = occupied
//   labels.has(buildingId, kind)                              -> a label of that kind is already registered for the building (e.g. 'number' hung by streets/plates.js)
//   labels.isFree(x, y, z, w, h, nx, nz)                      -> test only
// Without ctx.services.labels (headless harnesses, the city alone) a private registry with the same semantics is used. Two rectangles collide when they face the same way (normals within ~37
// degrees), stand within 0.7 m of one plane and overlap along the wall and in height (2 cm margin). Standoffs: sign 3.5 cm, city plate 4 cm, pipe 12 cm, AC 6 cm (no two of them overlap, so the
// order only matters against the painted wall shader, which is always flat at 0).
import { makeLabels } from '../streets/labels.js';

const SOLIDS = new WeakMap();
export function labelRegistry(ctx) {
  const shared = ctx && ctx.services && ctx.services.labels;
  const reg = shared || makeLabels();
  if (!shared && ctx && ctx.services) ctx.services.labels = reg;              // later modules (props ads) see the city's reservations too
  let index = null;
  const build = () => { index = new Map(); for (const b of reg.list()) { const k = b.bld + '|' + b.kind; index.set(k, true); } };
  // SOLID items (awnings, door canopies with their steps, downpipes, AC units) are boxes, not flat rectangles: the registry compares rectangles that face the same way within 0.7 m of one plane, so two
  // of them on two walls that meet at an oblique corner, on a jog of the street line (> 0.7 m), or a pipe and an AC unit either side of a corner crossed each other (tools/city-label-audit.mjs: 7 pairs
  // of the whole city). A solid item also reserves its world box (the footprint of its oriented box + its height) and is refused when it overlaps the box of another solid item by more than 1 cm in
  // every axis (the audit's own definition of a collision). depth: pipe 0.13 centred, AC 0.245 outwards, canopy 1.0 centred (+ the steps below), awning = its projection outwards.
  const SOLID = { awning: (d) => [0, d || 1.3], canopy: () => [-0.5, 0.5], steps: () => [-0.4, 0.4], pipe: () => [-0.065, 0.065], ac: () => [0, 0.245] };      // the canopy and the steps of one door are ONE mesh (a `group`: they never refuse each other)
  let boxes = SOLIDS.get(reg); if (!boxes) SOLIDS.set(reg, (boxes = new Map()));                 // one set of boxes per registry: shops.js, entrances.js and clutter.js each call labelRegistry(ctx)
  const BC = 4;
  const solidBox = (x, y, z, w, h, nx, nz, kind, depth) => {
    const [d0, d1] = SOLID[kind](depth), tx = nz, tz = -nx, hw = w / 2;
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (const s of [-1, 1]) for (const d of [d0, d1]) { const px = x + tx * s * hw + nx * d, pz = z + tz * s * hw + nz * d; x0 = Math.min(x0, px); x1 = Math.max(x1, px); z0 = Math.min(z0, pz); z1 = Math.max(z1, pz); }
    // the footprint is an ORIENTED rectangle (centre c, axes t / n, half extents hw / hd): the grid uses its axis-aligned box, the overlap test is the audit's own (separating axes, 1 cm): two items on one
    // oblique wall have overlapping axis-aligned boxes and must not refuse each other (the first version refused 1 000 AC units and 243 awnings of the whole city for 7 real pairs)
    const dc = (d0 + d1) / 2, o = { x0, x1, z0, z1, cx: x + nx * dc, cz: z + nz * dc, tx, tz, nx, nz, hw, hd: (d1 - d0) / 2 };
    return kind === 'canopy' ? Object.assign(o, { y0: y - 2.9, y1: y + 0.85 }) : Object.assign(o, { y0: y - h / 2, y1: y + h / 2 });       // canopy: steps to the tie rods (the mesh of the whole set)
  };
  /** the two oriented rectangles overlap by more than 1 cm along each of their four edge normals */
  const obbOverlap = (a, b) => {
    for (const ax of [[a.tx, a.tz], [a.nx, a.nz], [b.tx, b.tz], [b.nx, b.nz]]) {
      const ca = a.cx * ax[0] + a.cz * ax[1], cb = b.cx * ax[0] + b.cz * ax[1];
      const ra = a.hw * Math.abs(a.tx * ax[0] + a.tz * ax[1]) + a.hd * Math.abs(a.nx * ax[0] + a.nz * ax[1]), rb = b.hw * Math.abs(b.tx * ax[0] + b.tz * ax[1]) + b.hd * Math.abs(b.nx * ax[0] + b.nz * ax[1]);
      if (Math.min(ca + ra, cb + rb) - Math.max(ca - ra, cb - rb) <= 0.01) return false;
    }
    return true;
  };
  const solidFree = (b, group) => {
    for (let cx = Math.floor(b.x0 / BC); cx <= Math.floor(b.x1 / BC); cx++) for (let cz = Math.floor(b.z0 / BC); cz <= Math.floor(b.z1 / BC); cz++) {
      const a = boxes.get(cx + ',' + cz); if (!a) continue;
      for (const o of a) if (!(group && o.g === group) && Math.min(b.y1, o.y1) - Math.max(b.y0, o.y0) > 0.01 && Math.min(b.x1, o.x1) - Math.max(b.x0, o.x0) > 0.01 && Math.min(b.z1, o.z1) - Math.max(b.z0, o.z0) > 0.01 && obbOverlap(b, o)) return false;
    }
    return true;
  };
  const solidAdd = (b) => { for (let cx = Math.floor(b.x0 / BC); cx <= Math.floor(b.x1 / BC); cx++) for (let cz = Math.floor(b.z0 / BC); cz <= Math.floor(b.z1 / BC); cz++) { const k = cx + ',' + cz; let a = boxes.get(k); if (!a) boxes.set(k, (a = [])); a.push(b); } };
  return {
    reg,
    reserve(bld, x, y, z, w, h, nx, nz, kind, depth, group) {
      const sb = SOLID[kind] ? solidBox(x, y, z, w, h, nx, nz, kind, depth) : null;
      if (sb) sb.g = group || null;
      if (sb && !solidFree(sb, group)) return false;
      const ok = reg.reserve(bld, x, y, z, w, h, nx, nz, kind);
      if (ok) { if (sb) solidAdd(sb); if (!index) build(); index.set(bld + '|' + kind, true); }
      return ok;
    },
    isFree: (x, y, z, w, h, nx, nz) => reg.isFree(x, y, z, w, h, nx, nz),
    has(bld, kind) { if (!index) build(); return index.has(bld + '|' + kind); },
  };
}
