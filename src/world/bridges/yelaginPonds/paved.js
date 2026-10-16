// bridges/yelaginPonds/paved.js - PURE DATA (imports only specs.js): the PAVED_RINGS of the pond bridges and sluices of the Yelagin park (review 2026-10-14, docs/research/yelagin-ponds-bridges.md section 8).
// Each ring is the deck rectangle (the OSM way / deck-polygon frame of specs.js, +1.2 m past both ends for the bollards, +0.5 m beside the rails): environment/claims.js stamps it into the claim mask, so no
// generic trunk, hedge, bed or grass tuft grows through a deck, a rail or a bollard (measured before: a 1.3 m shrub in the middle of the deck of `p4n5nB`, trunks at both ends of the sluice decks).
// bridges/groups.js re-exports the list as PAVED_RINGS (owners.js reads it only while the module `bridges` is in the build list).
import { PONDS, SLUICES } from './specs.js';

const r2 = (v) => Math.round(v * 100) / 100;
function ringOf(sp, HL, hv, endExtra, sideExtra) {
  const T = Math.atan2(sp.b[1] - sp.a[1], sp.b[0] - sp.a[0]), c = Math.cos(T), s = Math.sin(T), du = sp.ring ? sp.ring[2] : 0, dv = sp.ring ? sp.ring[3] : 0;
  const cx = (sp.a[0] + sp.b[0]) / 2 + du * c - dv * s, cz = (sp.a[1] + sp.b[1]) / 2 + du * s + dv * c;
  const U = HL + endExtra, V = hv + sideExtra;
  return [[-U, -V], [U, -V], [U, V], [-U, V]].map(([u, v]) => [r2(cx + u * c - v * s), r2(cz + u * s + v * c)]);
}
export const PAVED_RINGS = [
  ...PONDS.map((sp) => ({ id: sp.id, ring: ringOf(sp, Math.max(Math.hypot(sp.b[0] - sp.a[0], sp.b[1] - sp.a[1]), sp.ring ? sp.ring[0] : 0) / 2, sp.hw, 1.2, 0.5) })),
  ...SLUICES.map((sp) => ({ id: sp.id, ring: ringOf(sp, sp.len / 2, sp.wd / 2, 1.2, 0.8) })),
];
