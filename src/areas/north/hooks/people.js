// ============================================================================
//  hooks/people.js - the PEOPLE hook of the North (docs/AREAS.md section 9, milestone M6, cluster C): the Tauride Garden, for the crowd cap (a density factor and a head count cap inside the garden:
//  people.js DENSITY.garden, people/nav.js nav.inGarden / densityFactor, people/sim.js crowdedAt / recycle / recount). Port of the source's nav.inTauride (102_3d_piter, commit 0568f7af,
//  src/world/people/nav.js:62: the bbox x 915 .. 1500, z -1800 .. -1250, then the ring test of TAURIDE_GARDEN).
//  The ring is the OSM park r1582734, EMBEDDED as the record GREEN of the North facade has it (66 vertices, one ring, no holes, bbox x 917.8 .. 1497.3, z -1788.5 .. -1259.7): the area module must not
//  import a data facade (tools/areas-test.mjs loads it without the import-map remap and would get the strip's). The source's own TAURIDE_GARDEN (landmarksTauride/terrain.js, a later OSM snapshot) is the
//  same outline with 15 more vertices (14 of them within 0.35 m of an edge of the facade ring, and the closing vertex) in the opposite winding: the two answer differently on 142 of 1,344,321 probes
//  of a 0.5 m grid (tools/north-people-hooks-test.mjs, which also compares the literal with the facade record).
//  NOTHING HERE IS MODULE-GATED (contract: HOOKS.inGarden, hooks.js passes it as it is; the numbers, factor 0.22 and maxPeople 60, are the data row ZONES.peopleDensity.garden of area.js, which is there
//  with or without 'landmarksTauride'): the cap is active in the generic North, where the garden is a plain OSM park (decision of the integration step, docs/AREAS.md section 9.1: the frozen contract says
//  "gating none", and the oracle of cluster E expects at most 60 heads in the garden). It is the one M6 hook that changes the generic North's crowd.
//  PURE DATA + PURE FUNCTIONS: no three.js, no layout.js, no data facade (the area module loads this file without the import-map remap).
//
//    inGarden(x, z) -> boolean    H08  inside the Tauride Garden (the source's inTauride: strict bbox first, then the even-odd ring test)
// ============================================================================

/** The Tauride Garden: OSM park r1582734, [x, z, x, z, ...] (the record GREEN of the North facade, vertex for vertex). */
export const GARDEN_RING = [
  1244.6, -1733.1, 1246.5, -1724.7, 1252.6, -1711, 1272.2, -1689.8, 1277.1, -1676.8, 1280.8, -1664.6,
  1283.1, -1638.9, 1315, -1635.9, 1338.4, -1633.1, 1352.3, -1629.6, 1351.7, -1625.3, 1366.6, -1622.3,
  1367.4, -1625.1, 1377.6, -1622.4, 1393.3, -1617, 1418.2, -1606.7, 1425.3, -1598.8, 1434.5, -1589.7,
  1492.1, -1587.6, 1497.3, -1587, 1492.3, -1457.3, 1485.9, -1265.8, 1483.6, -1261.2, 1479.4, -1259.7,
  1226, -1267.8, 927.2, -1276, 921.7, -1278.7, 918.7, -1284, 917.8, -1292.4, 922.6, -1407.1,
  923.9, -1407.1, 924.1, -1412.1, 924.3, -1416.9, 923.1, -1416.8, 925.4, -1464.2, 931.9, -1464,
  931.6, -1458.7, 1000.8, -1457.2, 1000.9, -1461.9, 1029.6, -1461.1, 1030, -1479.7, 1022.1, -1479.9,
  1022.5, -1487.9, 1034.2, -1488, 1034.5, -1496.1, 1023.8, -1496.4, 1024, -1516.5, 1017.4, -1520.3,
  1008.5, -1521, 1008.6, -1528.9, 1020.1, -1528.3, 1023.5, -1531, 1025.2, -1535.8, 1040.5, -1547,
  1077.8, -1579.9, 1080.3, -1584, 1080.6, -1600.6, 1101.2, -1600, 1112.8, -1618.5, 1112.2, -1737.8,
  1113.4, -1788.1, 1121, -1788, 1126.5, -1788.5, 1126, -1765.4, 1123.3, -1765.5, 1122.6, -1737.2,
];

/** True when (x, z) is inside the Tauride Garden. The bbox rejects first (strict, as in the source: this runs for every density lookup of the people simulation). */
export function inGarden(x, z) {
  if (!(x > 915 && x < 1500 && z > -1800 && z < -1250)) return false;
  let c = false;
  const r = GARDEN_RING;
  for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
    if ((r[i + 1] > z) !== (r[j + 1] > z) && x < (r[j] - r[i]) * (z - r[i + 1]) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
  }
  return c;
}
