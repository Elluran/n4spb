// environment/claims.js - ground the Mars Field / Summer Garden landmark modules draw themselves, as flat rings [x, z, ...] for the field's `claim` mask (no trunks, hedges, beds or grass tufts of the generic
// generators there). A ring counts only when its owner module is really built (ctx.buildList, like lib/claims.js ownedGroups).
//   landmarksGarden: GARDEN_RING = the Summer Garden relation r2653740 (landmarksGarden/groups.js)
//   landmarksMars:   the paved cour d'honneur of the Marble Palace (the polygon of landmarksMars/palace.js, which lays granite slabs over it)
import * as L from '../layout.js';
import { GARDEN_RING } from '../landmarksGarden/groups.js';
import * as G_FORTRESS from '../landmarksFortress/groups.js';
import * as G_KRONVERK from '../landmarksKronverk/groups.js';
import * as G_OKT from '../landmarksOktyabrsky/groups.js';
import { sightPaved } from './owners.js';

const MARBLE_COURT = [[-1322, -1401.9], [-1288.2, -1417.4], [-1317, -1489.2], [-1350.7, -1473.9], [-1343.9, -1456], [-1370.3, -1441.4], [-1362.9, -1428.4], [-1356.6, -1417.3], [-1353.7, -1418.9], [-1333.7, -1429.8]];
// landmarksYusupov: the palace courtyard (the polygon of landmarksYusupov/courtyard.js COURT_RING, which lays the floor; the palace polygon has no courtyard hole); the garden is claimed through its GREEN ids
const YUSUPOV_COURT = [[-2944.7, 366.2], [-2917, 339], [-2914.7, 341.5], [-2908.5, 335.3], [-2901.1, 331.4], [-2892.2, 346.9], [-2882.5, 356], [-2874.5, 369.7], [-2877, 372.2], [-2877.8, 387.8], [-2881.7, 394.9], [-2888.9, 398.5], [-2893.1, 401.4], [-2896.2, 402], [-2899.6, 401.8], [-2902.3, 400.7], [-2904.4, 399.2], [-2907.5, 402.3]];
/** (water-3 2026-10-09) the PAVED_RINGS of the Vasilievsky Island sights of the build list as flat closed rings: field.js also stamps their OUTLINE 0.6 m wide into the claim mask (a 1 m raster cell on the edge is
 *  otherwise unclaimed up to 0.6 m inside the ring: a trunk or a grass tuft straddled the edge of the module's paving; measured: 241 of 15 126 samples, none deeper than 0.58 m, 5 trunks) */
export const extraClaimEdges = (ctx) => sightPaved(ctx.buildList || L.MODULE_KEYS);
export function extraClaimRings(ctx) {
  const list = ctx.buildList || L.MODULE_KEYS, out = [];
  if (list.includes('landmarksGarden')) out.push(GARDEN_RING.flat());
  if (list.includes('landmarksMars')) out.push(MARBLE_COURT.flat());
  if (list.includes('landmarksYusupov')) out.push(YUSUPOV_COURT.flat());
  // landmarksFortress: the whole of Zayachy Island (ISLAND_RING: the module lays the island ground, lawns and trees itself; docs/research/petro-requests-landmarksFortress.md 3)
  if (list.includes('landmarksFortress') && G_FORTRESS.ISLAND_RING) out.push(G_FORTRESS.ISLAND_RING.flat());
  // landmarksKronverk: the three forecourts whose fronts are seen across open paving (CLEAR_RINGS: before the Baltic House portico, the Music Hall front, the Planetarium entrance): no generic trunks / hedges / beds / tufts
  if (list.includes('landmarksKronverk') && Array.isArray(G_KRONVERK.CLEAR_RINGS)) for (const r of G_KRONVERK.CLEAR_RINGS) out.push(r.flat());
  // landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground (docs/research/oktyabrsky-requests.md, Review item 1): no grass tufts through the pavers
  if (list.includes('landmarksOktyabrsky') && Array.isArray(G_OKT.PAVED_RINGS)) for (const r of G_OKT.PAVED_RINGS) out.push(r.flat());
  // the Vasilievsky Island sight modules (owners.js): PAVED_RINGS of every module of the build list
  for (const r of sightPaved(list)) out.push(r);
  return out;
}
