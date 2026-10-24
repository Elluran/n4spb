// ============================================================================
//  hooks/ground.js - the GROUND hooks of the North (docs/AREAS.md section 9, phase T3 of the Tauride remake): where the environment ground stops, because a landmark module draws the ground itself.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). The one import outside the hooks folder is the pure data module
//  landmarksTauride/data/paths.js (the ids of the garden ways; it has no imports itself), like hooks/height.js imports the pure relief function.
//
//    makeGroundHoles(MODULES)      -> (() => [ring, ...]) | undefined    T3a  environment/ground.js groundCuts(): flat [x, z, ...] rings that are CUT OUT of the ground mesh (like a water body or a metro shaft),
//                                                                         so that the ground shader does not run under them. undefined unless MODULES has 'landmarksTauride'. T8b: TWO rings, the garden outline and the nursery lot's ring (data/nursery.js LOT_RING, T8b), each moved in by 6 cm. The first ring is the garden
//                                                                         outline (hooks/people.js GARDEN_RING) moved in by GROUND_HOLE_INSET m: the terrain mesh of the module (cover mode) is the exact outline
//                                                                         polygon, so the two meshes overlap by that much all round and no crack shows between them (the terrain is lifted 5 mm and wins the overlap).
//    makeGroundWayReject(MODULES)  -> ((road) => boolean) | undefined    T3b  environment/field.js buildField(): the way is NOT painted into the ground class mask (the grey footway / paving paint of the
//                                                                         trail and paved classes): the ways of the garden are the garden's (claimed ids, draped ribbons). undefined unless MODULES has 'landmarksTauride'.
//  Both are gated by the page's module list when hooks.js runs makeHooks(MODULES), like parkingReject and carKeepOut (the field and the ground have no ctx.buildList at that point). The strip exports no HOOKS.
// ============================================================================
import { GARDEN_RING } from './people.js';
import { PATHS } from '../../../world/landmarksTauride/data/paths.js';
import { LOT_RING } from '../../../world/landmarksTauride/data/nursery.js';        // T8b: pure data, no imports (the ring of the nursery lot)

/** metres: the hole in the ground is the garden outline moved in by this much (the terrain overlaps the ground by it all round) */
export const GROUND_HOLE_INSET = 0.06;

/** the ids of the garden ways (data/paths.js: the 118 of the source's terrain.js + the two newer footways, bridge ways included; the same list as the claim of the sub-group `tauride-garden`) */
export const GARDEN_WAY_IDS = new Set(PATHS.map((p) => p.id));

/** a flat ring moved inwards by d metres (the vertices by the mitre of the two edge normals, the mitre capped at 4 d); any orientation. Pure; the result is validated by tools/tauride/ground-test.mjs (simple, inside the ring, at least 0.8 d from it). */
export function insetRing(ring, d) {
  const n = ring.length / 2; let a = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; a += ring[2 * i] * ring[2 * j + 1] - ring[2 * j] * ring[2 * i + 1]; }
  const s = a > 0 ? 1 : -1;                                               // the inside is on the left of a counter-clockwise ring (area > 0 with x right, z up) and on the right of a clockwise one
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = (i + n - 1) % n, q = (i + 1) % n;
    let e1x = ring[2 * i] - ring[2 * p], e1z = ring[2 * i + 1] - ring[2 * p + 1], l1 = Math.hypot(e1x, e1z) || 1; e1x /= l1; e1z /= l1;
    let e2x = ring[2 * q] - ring[2 * i], e2z = ring[2 * q + 1] - ring[2 * i + 1], l2 = Math.hypot(e2x, e2z) || 1; e2x /= l2; e2z /= l2;
    const n1x = -e1z * s, n1z = e1x * s, n2x = -e2z * s, n2z = e2x * s;     // the inward normals of the two edges
    let k = 1 + n1x * n2x + n1z * n2z; if (k < 0.0625) k = 0.0625;           // cos^2 of half the turn: the mitre length d / cos is capped at 4 d
    out.push(+(ring[2 * i] + d * (n1x + n2x) / k).toFixed(6), +(ring[2 * i + 1] + d * (n1z + n2z) / k).toFixed(6));
  }
  return out;
}

/** T3a: the rings cut out of the environment ground (the garden outline, moved in); a plain function, read once by environment/ground.js */
export function makeGroundHoles(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  const hole = insetRing(GARDEN_RING, GROUND_HOLE_INSET);
  // T8b (a user fix): the garden nursery lot north-west of the garden draws its own brown floor (landmarksTauride/nursery.js); it shares the garden's west edge (the outline vertices 56 .. 60), so the two holes
  // are 12 cm apart there and both floors cover the strip between them
  const lot = insetRing(LOT_RING, GROUND_HOLE_INSET);
  return () => [hole.slice(), lot.slice()];
}

/** T3b: a road record of the facade (`{ id, ... }`) that the garden draws itself */
export function makeGroundWayReject(MODULES) {
  return Array.isArray(MODULES) && MODULES.includes('landmarksTauride') ? (r) => GARDEN_WAY_IDS.has(r.id) : undefined;
}
