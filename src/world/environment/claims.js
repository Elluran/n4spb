// environment/claims.js - ground that a landmark module of the strip draws itself, as flat rings [x, z, ...] for the field's `claim` mask (no trunks, hedges, beds or grass tufts of the generic
// generators there). A ring counts only when its owner module is really built (ctx.buildList, like lib/claims.js ownedGroups).
//   landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground
import * as L from '../layout.js';
import * as G_OKT from '../landmarksOktyabrsky/groups.js';

//   landmarksMars:   the paved cour d'honneur of the Marble Palace (the polygon of landmarksMars/palace.js, which lays granite slabs over it): copied from the source's claims.js (102_3d_piter 0568f7af)
const MARBLE_COURT = [[-1322, -1401.9], [-1288.2, -1417.4], [-1317, -1489.2], [-1350.7, -1473.9], [-1343.9, -1456], [-1370.3, -1441.4], [-1362.9, -1428.4], [-1356.6, -1417.3], [-1353.7, -1418.9], [-1333.7, -1429.8]];

export function extraClaimRings(ctx) {
  const list = ctx.buildList || L.MODULE_KEYS, out = [];
  if (list.includes('landmarksMars')) out.push(MARBLE_COURT.flat());
  // landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground (docs/research/oktyabrsky-requests.md, Review item 1): no grass tufts through the pavers
  // M7 (docs/AREAS.md section 10): where the AREA claims the Kapodistrias monument (the North: layout.GROUPS.landmarksOktyabrsky holds 'kapodistrias'), plaza.js paves the source's longer ring
  // (the promenade + the apron round the monument, groups.js KAPODISTRIAS_PAVED_RINGS), so the tufts must keep off that ring instead; the strip claims no 'kapodistrias' and keeps PAVED_RINGS as before
  if (list.includes('landmarksOktyabrsky')) {
    const kap = (L.GROUPS.landmarksOktyabrsky || []).some((g) => g.key === 'kapodistrias');
    const rings = kap && Array.isArray(G_OKT.KAPODISTRIAS_PAVED_RINGS) ? G_OKT.KAPODISTRIAS_PAVED_RINGS : G_OKT.PAVED_RINGS;
    if (Array.isArray(rings)) for (const r of rings) out.push(r.flat());
  }
  return out;
}
