// ============================================================================
//  hooks/water.js - the WATER hook of the North (docs/AREAS.md section 9, phase T4a of the Tauride remake): the water bodies that a landmark module draws itself, for the field's water mask.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap). The one import outside the hooks folder is the pure data module
//  landmarksTauride/data/water.js (the union outline of the two ponds and the canals; it has no imports itself), like hooks/ground.js imports data/paths.js.
//
//    makeWaterBodies(MODULES) -> (() => [{ id, o, h }]) | undefined    T4a  environment/field.js buildField(): flat rings that are rasterised into the field's WATER mask (the same call as the river polygons):
//                                  env.waterAt / env.kindAt / shoreDist, the distance atlas of the water shader and everything that reads them (pedestrians, wildlife, trees, shore sounds) then know the ponds.
//                                  Each entry is { id, o: [x, z, ...], h: [[x, z, ...], ...] } (the union polygon with its island holes). undefined unless MODULES has 'landmarksTauride'; the strip exports no HOOKS,
//                                  so its field is the same bytes as before (tools/tauride/water-mask-check.mjs proves it on the CPU).
// ============================================================================
import { WATER_UNION } from '../../../world/landmarksTauride/data/water.js';

/** T4a: the ponds as water bodies of the field's mask (a plain function, read once by environment/field.js; gated by the page's module list like parkingReject) */
export function makeWaterBodies(MODULES) {
  if (!(Array.isArray(MODULES) && MODULES.includes('landmarksTauride'))) return undefined;
  return () => WATER_UNION.map((p, i) => ({ id: 'tauride-pond-' + i, o: p.o.slice(), h: (p.h || []).map((r) => r.slice()) }));
}
