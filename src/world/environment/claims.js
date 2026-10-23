// environment/claims.js - ground that a landmark module of the strip draws itself, as flat rings [x, z, ...] for the field's `claim` mask (no trunks, hedges, beds or grass tufts of the generic
// generators there). A ring counts only when its owner module is really built (ctx.buildList, like lib/claims.js ownedGroups).
//   landmarksOktyabrsky: PAVED_RINGS = the promenade and the apron of the Kapodistrias monument, paved by the module on unmapped ground
import * as L from '../layout.js';
import * as G_OKT from '../landmarksOktyabrsky/groups.js';

export function extraClaimRings(ctx) {
  const list = ctx.buildList || L.MODULE_KEYS, out = [];
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
