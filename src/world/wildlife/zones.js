// wildlife/zones.js - WHERE the animals gather on the whole map (the first build had its sites around Vosstaniya Square and the Fontanka; the west extension adds Kazan, Palace Square,
// the Alexander Garden, St Isaac's Square, Catherine Garden, Gostiny Dvor, the Neva). Pure data + a few service reads: no THREE, no placement tests (birds.js turns a zone into valid
// sites with its own free-ground search).
// A zone: { tag, kind: 'pigeon' | 'sparrow', x, z, spread (m: the search radius of its sites), n (sites), r (site radius: the flock's feeding patch), w (weight: how much the animals like
// it; the density director prefers heavier zones near the player), name }.  The weights follow docs/research/west-life-furniture.md section 8 (pigeons ~120 on the whole west map: Kazan 45,
// Alexander Garden 30, Isaac 15, Catherine 12, Palace Square 8 - read as "how many sites"; the director moves the ~11 flocks of the budget to the heaviest zones around the player).
// Coordinates are local metres (x east, z south); sources: the landmark services (landmarksF.benchPoints / crowd, landmarksJ.crowd / monuments, landmarksG.spots) with the dossier numbers
// as fallbacks (Kazan fountain (-1469,-279), Alexander Garden fountain (-2335,-494), Isaac's garden benches (-2449,-63), the Column (-1983,-738), Catherine monument (-800,-105)).
// THE AREA TABLE (docs/AREAS.md section 3, src/world/area.js ZONES): the rows below are not written here any more. ZONES.pigeons holds the zone rows in priority order: { tag, kind, x, z, ...overrides of the
// defaults of z() below } or { tag, kind, at(ctx) -> { x, z } | null, ...overrides } for a position that a landmark service of the area gives (a row whose `at` gives nothing is skipped); ZONES.crowHaunts the crow
// districts, ZONES.crowds the loudness of the tourist crowds by zone tag. An area without a table has no zones.
import { ZONES } from '../lib/area-tables.js';

/** @returns {Array} zones in priority order */
export function zoneTable(ctx) {
  const Z = [];
  const z = (tag, kind, x, z0, o) => { if (Number.isFinite(x) && Number.isFinite(z0)) Z.push({ tag, kind, x, z: z0, spread: 12, n: 1, r: 4.5, w: 1, name: tag, ...o }); };
  for (const row of ZONES.pigeons) {
    const { tag, kind, x, z: zz, at, ...o } = row;
    const p = typeof at === 'function' ? at(ctx) : { x, z: zz };
    if (p) z(tag, kind, p.x, p.z, o);
  }
  // crows need a haunt to pick (birds.js): an area that lists none gets one round its square
  if (!CROW_HAUNTS.length && ctx.L && ctx.L.SQUARE) CROW_HAUNTS.push({ x: ctx.L.SQUARE.x, z: ctx.L.SQUARE.z, r: 90 });
  return Z;
}

/** the districts a crow likes (the strip: the Alexander Garden limes, the Kazan and Isaac gardens): crows start on a tree top there when the player is not about (ZONES.crowHaunts) */
export const CROW_HAUNTS = [...ZONES.crowHaunts];

/** the tourist crowds the ambience hears (core/audio.js 'crowd' loop reads ctx.services.wildlife.crowds): the pigeon zones are the places where people stand and feed, so each named
 *  zone gives one crowd (the centre of its sites), plus the Palace Pier lions and the piers of the Neva. { x, z, r (metres of full level), f (fade length), l (level 0..1), name }.
 *  Palace Square and the Kazan garden are the loudest; Nevsky itself is the city / traffic bed, not a crowd. */
export function crowdTable(ctx, W) {
  const by = new Map();
  for (const z of zoneTable(ctx)) { if (z.kind !== 'pigeon' || !ZONES.crowds[z.tag]) continue; const a = by.get(z.tag) || by.set(z.tag, { sx: 0, sz: 0, n: 0, name: z.name }).get(z.tag); a.sx += z.x; a.sz += z.z; a.n++; }
  const out = [];
  for (const [tag, a] of by) { const [r, f, l] = ZONES.crowds[tag]; out.push({ x: a.sx / a.n, z: a.sz / a.n, r, f, l, name: tag }); }
  const bd = ctx.services.landmarksC?.bridge?.deck; if (bd && Number.isFinite(bd.x)) out.push({ x: bd.x, z: bd.z, r: 24, f: 30, l: 0.6, name: 'anichkov' });          // the Klodt horses: the busiest bridge of the east
  for (const l of W?.lions || []) out.push({ x: l.x, z: l.z, r: 18, f: 30, l: 0.55, name: 'lions' });       // the Palace Pier: tourists posing with the copper lions
  for (const p of ctx.services.environment?.piers || []) if (p.key === 'neva' && ctx.L.inPlay(p.x, p.z)) out.push({ x: p.x, z: p.z, r: 14, f: 30, l: 0.45, name: 'pier' });
  return out;
}
