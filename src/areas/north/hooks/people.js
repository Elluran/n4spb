// ============================================================================
//  hooks/people.js - the PEOPLE hook of the North (docs/AREAS.md section 9, milestone M6, cluster C): the Tauride Garden, for the crowd cap (a density factor and a head cap inside the garden:
//  people.js DENSITY.garden, people/nav.js densityFactor, people/sim.js crowdedAt / recycle). ACTIVE in the generic North (it needs no landmark module); the numbers (factor 0.22, maxPeople 60) are
//  data in area.js ZONES.peopleDensity.garden.
//  FOUNDATION STUB: the garden is nowhere (false) = no density factor and no cap. Cluster C fills in the body (the ring of the OSM park r1582734, EMBEDDED, with an equality test against the
//  North facade GREEN record; its bbox first); THE SIGNATURE IS FROZEN.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap).
//
//    inGarden(x, z) -> boolean    H08  the Tauride Garden polygon (the source's TAURIDE_GARDEN outline: bbox 918 .. 1497 x -1789 .. -1260, one ring, no holes)
// ============================================================================

export function inGarden(x, z) { return false; }
