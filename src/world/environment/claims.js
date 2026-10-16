// environment/claims.js - ground that a landmark module of the strip draws itself, as flat rings [x, z, ...] for the field's `claim` mask (no trunks, hedges, beds or grass tufts of the generic
// generators there). A ring counts only when its owner module is really built (ctx.buildList, like lib/claims.js ownedGroups).
//   landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground
import * as L from '../layout.js';
import * as G_OKT from '../landmarksOktyabrsky/groups.js';

export function extraClaimRings(ctx) {
  const list = ctx.buildList || L.MODULE_KEYS, out = [];
  // landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground (docs/research/oktyabrsky-requests.md, Review item 1): no grass tufts through the pavers
  if (list.includes('landmarksOktyabrsky') && Array.isArray(G_OKT.PAVED_RINGS)) for (const r of G_OKT.PAVED_RINGS) out.push(r.flat());
  return out;
}
