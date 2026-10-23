// ============================================================================
//  hooks/water.js - the WATER hooks of the North (docs/AREAS.md section 9, phase T4a of the Tauride remake): the water bodies that a landmark module draws itself, for the field's water mask, and the refusal of a flight landing on them.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). The imports outside the hooks folder are pure data and the pure terrain function:
//  landmarksTauride/data/water.js (the union outline of the two ponds and the canals), data/ponds.js (the datum table) and height.js (gardenHeight, like hooks/height.js).
//    makeNoLanding(MODULES) -> ((x, z) => boolean) | undefined         T4a fix 1  core/player.js landingBlocked(): true where a flyer must not touch down: the ground of the garden terrain is below the contour of the shore colliders (the water and the wet foot of the bank).
//                                  The engine refuses a landing only where the ground is below -1 m (the Big Pond deeper than 0.55 m); in the shallows and the Small Pond (-0.5 m) the flyer would stand INSIDE the ring of shore colliders and could not
//                                  walk out (9 of 9 landings of the QA). undefined unless MODULES has 'landmarksTauride'; main.js hands it to the Player (player.noLanding); the strip has none.
//
//    makeWaterBodies(MODULES) -> (() => [{ id, o, h }]) | undefined    T4a  environment/field.js buildField(): flat rings that are rasterised into the field's WATER mask (the same call as the river polygons):
//                                  env.waterAt / env.kindAt, the distance atlas of the water shader (field.shore) and everything that reads them (pedestrians, wildlife, trees, shore sounds) then know the ponds
//                                  (env.shoreDist does NOT: it is layout.shoreDist, the waterways; T4b correction of the T4a note).
//                                  Each entry is { id, o: [x, z, ...], h: [[x, z, ...], ...] } (the union polygon with its island holes). undefined unless MODULES has 'landmarksTauride'; the strip exports no HOOKS,
//                                  so its field is the same bytes as before (tools/tauride/field-dump.mjs proves it on the CPU: the sha1 of the strip raster).
//
//    makeDuckPonds(MODULES)   -> (() => { y, margin, offset, rings, keepOut, shoreDist, inWater }) | undefined    T4b  wildlife/ducks.js: duck lanes on the ponds of a landmark module. `y` = the water level of the lanes
//                                  (data/ponds.js WATER_Y: the ducks float on the pond surface), `rings` = the shore lines as [[x, z], ...] with the WATER ON THE LEFT of travel (the bank chains of the waterways have it so),
//                                  `offset` m into the water for a lane, `margin` m: no lane sample closer than this to a shore (`shoreDist`: the exact signed distance of height.js, + land), `keepOut` = [{ x, z, r }] the
//                                  bridge decks and the dam (data/bridges.js: no lane under a deck). undefined unless MODULES has 'landmarksTauride'; the strip exports no HOOKS, so its ducks are the same (the lane code
//                                  asks env.waterAt for every sample as before, on the pond lanes too).
// ============================================================================
import { WATER_UNION } from '../../../world/landmarksTauride/data/water.js';
import { gardenHeight, GARDEN_SHORE } from '../../../world/landmarksTauride/height.js';
import { COLLIDER, WATER_Y } from '../../../world/landmarksTauride/data/ponds.js';
import { BRIDGE_SITES, BRIDGE_DECK_WIDTH } from '../../../world/landmarksTauride/data/bridges.js';

/** T4a: the ponds as water bodies of the field's mask (a plain function, read once by environment/field.js; gated by the page's module list like parkingReject) */
export function makeWaterBodies(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  return () => WATER_UNION.map((p, i) => ({ id: 'tauride-pond-' + i, o: p.o.slice(), h: (p.h || []).map((r) => r.slice()) }));
}

/** T4a fix round 1: where a flight landing is refused as 'water': the terrain is at or below the contour of the shore colliders (COLLIDER.contourY, -0.3 m: the water-side face of the boxes stands on it), i.e. in the ponds and on the wet foot of the bank that is on the water side of the boxes. A plain function, gated by the page's module list like parkingReject. */
export function makeNoLanding(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  const y = COLLIDER.contourY;
  return (x, z) => { const g = gardenHeight(x, z); return g !== null && g <= y; };
}

/** the lanes of the pond ducks: `offset` m into the water from the shore line, `margin` m from any shore for every lane sample (and 2.5 m of free water beyond, as on the canals) */
export const DUCK_LANES = Object.freeze({ offset: 4.2, margin: 3, deckMargin: 3 });

/** the rings of the water union as [[x, z], ...] with the water on the LEFT of travel (an outer ring counter-clockwise on the map frame x east / z south has its interior on the rotate(+90) side of each edge = the left; a hole the other way round) */
export function duckRings(union = WATER_UNION) {
  const out = [];
  for (const p of union) for (const [r, hole] of [[p.o, false], ...(p.h || []).map((h) => [h, true])]) {
    const v = []; for (let i = 0; i < r.length; i += 2) { const q = v[v.length - 1]; if (!q || Math.hypot(r[i] - q[0], r[i + 1] - q[1]) > 1e-6) v.push([r[i], r[i + 1]]); }
    if (v.length > 1 && Math.hypot(v[0][0] - v[v.length - 1][0], v[0][1] - v[v.length - 1][1]) <= 1e-6) v.pop();
    let area = 0; for (let i = 0; i < v.length; i++) { const a = v[i], b = v[(i + 1) % v.length]; area += a[0] * b[1] - b[0] * a[1]; }
    // the water lies to the (-ez, ex) side of an edge when (area > 0 and outer) or (area < 0 and hole): that is the LEFT of travel in the ducks' frame (wx, wz) = (-tz, tx); otherwise walk the ring backwards
    const left = (area > 0) !== hole;
    const ring = left ? v : v.slice().reverse(); ring.push(ring[0]);
    out.push(ring);
  }
  return out;
}

/** T4b: the pond lanes of the ducks (a plain function, read once by wildlife/ducks.js; gated by the page's module list like parkingReject) */
export function makeDuckPonds(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  const hw = BRIDGE_DECK_WIDTH.value / 2;
  const keepOut = BRIDGE_SITES.map((s) => ({ x: s.centre[0], z: s.centre[1], r: s.deckLenM / 2 + hw + DUCK_LANES.deckMargin, site: s.site }));
  return () => ({ y: WATER_Y, offset: DUCK_LANES.offset, margin: DUCK_LANES.margin, rings: duckRings(), keepOut: keepOut.map((k) => ({ ...k })), shoreDist: GARDEN_SHORE.dist, inWater: (x, z) => GARDEN_SHORE.dist(x, z) < 0 });
}
