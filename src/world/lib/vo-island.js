// lib/vo-island.js - the outline of the WHOLE of Vasilievsky Island (pure data, no three.js, runs in node).
// Source: OSM relation 1576083 "Васильевский остров" (14.1 km2 with the Gulf coast in the west; bbox x -9701..-2436, z -2452..1556 in the local frame), the 684-point polygon is saved in
// docs/reference/vo-island-polygon.json; here it is simplified to 25 m (82 points, area 14.095 km2 against 14.085 km2): flat x, z, x, z ... in local metres (+x east, +z south).
// The frame rectangles V3..V12 of tools/osm-lib.mjs cover it completely (docs/reference/vo-frame.md). Used by city/district.js (the 'vasil' district of every house of the island) and by the
// area name fallback of layout.js (AREAS: "Васильевский остров"). It is an outline, not a shore: the Neva water in front of the quays is NOT inside it.
export const ISLAND = [-9701, -1334, -9679, -1260, -9520, -1179, -9002, -78, -8819, 125, -8236, 428, -7788, 421, -7739, 285, -7575, 219, -7461, 320, -7284, 400, -7006, 430, -6891, 376, -6796, -61, -6743, -102, -6676, -94, -6637, 8, -6736, 76, -6775, 271, -6542, 404,
  -6511, 528, -6537, 517, -6597, 680, -6726, 607, -6742, 635, -6406, 824, -6421, 858, -6361, 906, -6296, 865, -6087, 1050, -5610, 1246, -5570, 1358, -5168, 1556, -5131, 1477, -4864, 1440, -4741, 1085, -4607, 454, -4286, 33, -3991, -230, -3675, -394, -3503, -420,
  -2931, -737, -2619, -956, -2461, -1097, -2477, -1218, -2436, -1288, -2471, -1354, -2561, -1355, -2669, -1424, -3304, -1512, -4218, -1971, -4476, -1936, -4777, -1715, -4891, -1711, -4995, -1772, -5090, -1775, -5371, -1599, -5594, -1694, -5965, -1488, -6123, -1467,
  -6207, -1547, -6503, -1659, -6664, -1673, -7694, -1974, -7732, -1887, -8121, -1999, -8095, -2086, -8125, -2118, -8237, -2071, -8374, -2099, -8578, -2192, -9203, -2354, -9255, -2439, -9308, -2452, -9390, -2377, -9388, -2240, -8821, -2075, -8831, -2041, -8763, -2020,
  -8995, -1250, -9626, -1435];

/** (x, z) lies inside the outline of Vasilievsky Island (ray casting over the 82 points) */
export function inIsland(x, z) {
  if (x < -9701 || x > -2436 || z < -2452 || z > 1556) return false;
  let c = false;
  for (let i = 0, j = ISLAND.length - 2; i < ISLAND.length; j = i, i += 2) {
    const xi = ISLAND[i], zi = ISLAND[i + 1], xj = ISLAND[j], zj = ISLAND[j + 1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}
