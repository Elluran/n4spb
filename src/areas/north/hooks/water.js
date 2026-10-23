// ============================================================================
//  hooks/water.js - the WATER hooks of the North (docs/AREAS.md section 9, phase T4a of the Tauride remake): the water bodies that a landmark module draws itself, for the field's water mask, and the refusal of a flight landing on them.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). The imports outside the hooks folder are pure data and the pure terrain function:
//  landmarksTauride/data/water.js (the union outline of the two ponds and the canals), data/ponds.js (the datum table) and height.js (gardenHeight, like hooks/height.js).
//    makeNoLanding(MODULES) -> ((x, z) => boolean) | undefined         T4a fix 1  core/player.js landingBlocked(): true where a flyer must not touch down: the ground of the garden terrain is below the contour of the shore colliders (the water and the wet foot of the bank).
//                                  The engine refuses a landing only where the ground is below -1 m (the Big Pond deeper than 0.55 m); in the shallows and the Small Pond (-0.5 m) the flyer would stand INSIDE the ring of shore colliders and could not
//                                  walk out (9 of 9 landings of the QA). undefined unless MODULES has 'landmarksTauride'; main.js hands it to the Player (player.noLanding); the strip has none.
//
//    makeWaterBodies(MODULES) -> (() => [{ id, o, h }]) | undefined    T4a  environment/field.js buildField(): flat rings that are rasterised into the field's WATER mask (the same call as the river polygons):
//                                  env.waterAt / env.kindAt / shoreDist, the distance atlas of the water shader and everything that reads them (pedestrians, wildlife, trees, shore sounds) then know the ponds.
//                                  Each entry is { id, o: [x, z, ...], h: [[x, z, ...], ...] } (the union polygon with its island holes). undefined unless MODULES has 'landmarksTauride'; the strip exports no HOOKS,
//                                  so its field is the same bytes as before (tools/tauride/water-mask-check.mjs proves it on the CPU).
// ============================================================================
import { WATER_UNION } from '../../../world/landmarksTauride/data/water.js';
import { gardenHeight } from '../../../world/landmarksTauride/height.js';
import { COLLIDER } from '../../../world/landmarksTauride/data/ponds.js';

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
