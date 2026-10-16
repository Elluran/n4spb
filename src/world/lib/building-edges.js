// One immutable neighbour-edge index for the immutable baked BUILDINGS dataset.
// Landmark house builders read these records; their authored facade edges remain
// separate mutable objects. Preserve the legacy filters, heights and edge order.
import { BUILDINGS } from '../data/city.js';
import { heightOf } from '../layout.js';
import { ringFromFlat, signedArea } from './massing.js';
import { edgeStartLookup } from './edge-start-lookup.js';

let lookup = null;
function neighbourEdges(poly) {
  const out = [];
  const rings = [{ r: ringFromFlat(poly.o), hole: false }, ...poly.h.map((h) => ({ r: ringFromFlat(h), hole: true }))];
  for (const { r, hole } of rings) {
    if (r.length < 3) continue;
    const A = signedArea(r);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
      if (len < 0.3) continue;
      let nx = dz / len, nz = -dx / len;
      if ((A > 0) !== !hole) { nx = -nx; nz = -nz; }
      out.push(Object.freeze({ i, hole, a: Object.freeze(a), b: Object.freeze(b), len, n: Object.freeze([nx, nz]) }));
    }
  }
  return out;
}

export function buildingEdgesAt(x, z) {
  if (!lookup) {
    const out = [];
    for (const b of BUILDINGS) {
      if (b.skip || b.dupOf || (b.minH || 0) > 3 || b.underground) continue;
      for (const p of b.polys) for (const e of neighbourEdges(p)) out.push(Object.freeze({ id: b.id, parent: b.parent, h: heightOf(b), e }));
    }
    lookup = edgeStartLookup(out);
  }
  return lookup(x, z);
}
