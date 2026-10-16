// wildlife/zones.js - WHERE the animals gather on the whole map (the first build had its sites around Vosstaniya Square and the Fontanka; the west extension adds Kazan, Palace Square,
// the Alexander Garden, St Isaac's Square, Catherine Garden, Gostiny Dvor, the Neva). Pure data + a few service reads: no THREE, no placement tests (birds.js turns a zone into valid
// sites with its own free-ground search).
// A zone: { tag, kind: 'pigeon' | 'sparrow', x, z, spread (m: the search radius of its sites), n (sites), r (site radius: the flock's feeding patch), w (weight: how much the animals like
// it; the density director prefers heavier zones near the player), name }.  The weights follow docs/research/west-life-furniture.md section 8 (pigeons ~120 on the whole west map: Kazan 45,
// Alexander Garden 30, Isaac 15, Catherine 12, Palace Square 8 - read as "how many sites"; the director moves the ~11 flocks of the budget to the heaviest zones around the player).
// Coordinates are local metres (x east, z south); sources: the landmark services (landmarksF.benchPoints / crowd, landmarksJ.crowd / monuments, landmarksG.spots) with the dossier numbers
// as fallbacks (Kazan fountain (-1469,-279), Alexander Garden fountain (-2335,-494), Isaac's garden benches (-2449,-63), the Column (-1983,-738), Catherine monument (-800,-105)).
/** @returns {Array} zones in priority order */
export function zoneTable(ctx) {
  const S = ctx.services, L = ctx.L, Z = [];
  const z = (tag, kind, x, z0, o) => { if (Number.isFinite(x) && Number.isFinite(z0)) Z.push({ tag, kind, x, z: z0, spread: 12, n: 1, r: 4.5, w: 1, name: tag, ...o }); };
  const F = S.landmarksF, G = S.landmarksG, J = S.landmarksJ, E = S.landmarksE;
  // ---- the first build (east of the Fontanka): the obelisk, the station forecourt, the metro rotunda, the Anichkov Bridge, the hotel corner
  const OB = L.OBELISK, ST = L.STATION, fc = { x: ST.tower.x - 0.208 * 18, z: ST.tower.z - 0.978 * 18 };
  z('obelisk', 'pigeon', OB.x, OB.z, { spread: 22, n: 2, w: 2, name: 'Голуби у обелиска · Pigeons at the obelisk', min: 11 });
  z('forecourt', 'pigeon', fc.x, fc.z, { spread: 12, n: 1, w: 1.6, name: 'Голуби на привокзальной площади · Pigeons on the station forecourt' });
  z('forecourt', 'pigeon', fc.x + 25, fc.z + 5, { spread: 12, n: 1, w: 1.2, name: 'Голуби на привокзальной площади · Pigeons on the station forecourt' });
  z('rotunda', 'pigeon', 516, 92, { spread: 12, n: 1, w: 1.2, r: 4, name: 'Голуби у вестибюля метро · Pigeons at the metro rotunda' });
  z('hotel', 'pigeon', 648, -1, { spread: 12, n: 1, w: 0.8, r: 4, name: 'Голуби у гостиницы · Pigeons at the hotel' });
  // ---- Gostiny Dvor / Ostrovsky: the pavement of the arcade (the front runs along Nevsky at grid v 36), the Catherine Garden round the monument
  if (E?.spots?.gdFront) {                                            // landmarksE frame: u metres west along Nevsky from the Anichkov Bridge (-441, -93), v south of the axis (rotation 13.77 deg)
    const g = E.spots.gdFront, u = (g.u0 + g.u1) / 2, v = g.v + 2, C = 0.9713, S = 0.2379;
    z('gostiny', 'pigeon', -441 - C * u - S * v, -93 - S * u + C * v, { spread: 40, n: 2, w: 1.8, r: 4, name: 'Голуби у Гостиного двора · Pigeons at Gostiny Dvor' });
  }
  const cm = E?.spots?.garden?.monument || [-800.5, -104.9];
  z('catherine', 'pigeon', cm[0], cm[1], { spread: 20, n: 2, w: 2, name: 'Голуби в Екатерининском саду · Pigeons in the Catherine Garden' });
  // ---- Kazan: the round lawn with the fountain, the benches of the north row, the Voronikhin garden, the pavement under the colonnade side
  z('kazan', 'pigeon', -1469, -279, { spread: 26, n: 4, w: 3.4, r: 5.5, name: 'Голуби в Казанском сквере · Pigeons in the Kazan garden' });
  const bp = (F?.benchPoints || []).filter((p) => Number.isFinite(p.x));
  if (bp.length) { const q = bp[Math.floor(bp.length / 3)]; z('kazan-bench', 'pigeon', q.x, q.z, { spread: 6, n: 1, w: 2.2, r: 3.5, name: 'Голуби у скамеек Казанского сквера · Pigeons at the Kazan benches' }); }
  const vc = F?.crowd?.[3]; if (vc) z('voronikhin', 'pigeon', vc.x, vc.z, { spread: 14, n: 1, w: 1.2, name: 'Голуби в саду Воронихина · Pigeons in the Voronikhin garden' });
  z('kazan-nevsky', 'pigeon', -1450, -341, { spread: 14, n: 1, w: 1.2, r: 4, name: 'Голуби на Невском у Казанского собора · Pigeons on Nevsky by the Kazan Cathedral' });
  // ---- Palace Square: a few on the setts round the Column and by the arch, the Winter Palace frontage
  const col = G?.spots?.column || { x: -1983, z: -738 };
  z('column', 'pigeon', col.x, col.z, { spread: 30, n: 2, w: 1.7, r: 5, min: 11, name: 'Голуби у Александровской колонны · Pigeons at the Alexander Column' });
  z('arch', 'pigeon', -1905, -640, { spread: 14, n: 1, w: 1.0, r: 4, name: 'Голуби у арки Главного штаба · Pigeons by the General Staff arch' });
  const cr = G?.spots?.carriages?.[0]; if (cr) z('winter-palace', 'pigeon', cr.x, cr.z, { spread: 14, n: 1, w: 0.9, r: 4, name: 'Голуби у Зимнего дворца · Pigeons at the Winter Palace' });
  // ---- the Alexander Garden, Senate Square, St Isaac's Square
  z('alexander', 'pigeon', -2335, -494, { spread: 18, n: 3, w: 3.0, r: 5, name: 'Голуби в Александровском саду · Pigeons in the Alexander Garden' });
  z('senate', 'pigeon', -2745, -444, { spread: 22, n: 1, w: 1.0, r: 4, min: 14, name: 'Голуби на Сенатской площади · Pigeons on Senate Square' });
  const nk = J?.monuments?.find?.((m) => m.id === 'n1123474657') || { x: -2396, z: 35 };
  z('isaac', 'pigeon', -2449, -63, { spread: 20, n: 3, w: 2.6, r: 5, name: 'Голуби в сквере у Исаакия · Pigeons in St Isaac\'s garden' });
  z('isaac-monument', 'pigeon', nk.x, nk.z, { spread: 24, n: 1, w: 1.3, r: 4.5, min: 9, name: 'Голуби у памятника Николаю I · Pigeons at the Nicholas I monument' });
  // ---- sparrows: the gardens (the terraces are added by birds.js from the props module)
  z('kazan', 'sparrow', -1481, -300, { spread: 16, n: 1, w: 2, r: 3, name: 'Воробьи в Казанском сквере · Sparrows in the Kazan garden' });
  z('alexander', 'sparrow', -2330, -520, { spread: 16, n: 1, w: 2, r: 3, name: 'Воробьи в Александровском саду · Sparrows in the Alexander Garden' });
  z('isaac', 'sparrow', -2440, -100, { spread: 16, n: 1, w: 1.6, r: 3, name: 'Воробьи в сквере у Исаакия · Sparrows in St Isaac\'s garden' });
  z('catherine', 'sparrow', -790, -128, { spread: 16, n: 1, w: 1.5, r: 3, name: 'Воробьи в Екатерининском саду · Sparrows in the Catherine Garden' });
  return Z;
}

/** the districts a crow likes (the Alexander Garden limes, the Kazan and Isaac gardens): crows start on a tree top there when the player is not about */
export const CROW_HAUNTS = [{ x: -2335, z: -500, r: 140 }, { x: -1469, z: -290, r: 90 }, { x: -2449, z: -63, r: 90 }, { x: -800, z: -105, r: 90 }];

/** the tourist crowds the ambience hears (core/audio.js 'crowd' loop reads ctx.services.wildlife.crowds): the pigeon zones are the places where people stand and feed, so each named
 *  zone gives one crowd (the centre of its sites), plus the Palace Pier lions and the piers of the Neva. { x, z, r (metres of full level), f (fade length), l (level 0..1), name }.
 *  Palace Square and the Kazan garden are the loudest; Nevsky itself is the city / traffic bed, not a crowd. */
const CROWD = {        // tag: [r, f, level]
  column: [70, 70, 0.9], arch: [28, 40, 0.65], 'winter-palace': [45, 45, 0.65],
  kazan: [38, 55, 0.85], 'kazan-bench': [10, 25, 0.6], voronikhin: [18, 30, 0.5], 'kazan-nevsky': [22, 30, 0.6],
  gostiny: [60, 50, 0.7], catherine: [28, 35, 0.55], bridge: [22, 30, 0.6],
  alexander: [32, 45, 0.7], senate: [30, 40, 0.55], isaac: [38, 40, 0.6], 'isaac-monument': [24, 35, 0.5],
  obelisk: [45, 50, 0.6], forecourt: [32, 45, 0.6], rotunda: [18, 30, 0.5],
};
export function crowdTable(ctx, W) {
  const by = new Map();
  for (const z of zoneTable(ctx)) { if (z.kind !== 'pigeon' || !CROWD[z.tag]) continue; const a = by.get(z.tag) || by.set(z.tag, { sx: 0, sz: 0, n: 0, name: z.name }).get(z.tag); a.sx += z.x; a.sz += z.z; a.n++; }
  const out = [];
  for (const [tag, a] of by) { const [r, f, l] = CROWD[tag]; out.push({ x: a.sx / a.n, z: a.sz / a.n, r, f, l, name: tag }); }
  const bd = ctx.services.landmarksC?.bridge?.deck; if (bd && Number.isFinite(bd.x)) out.push({ x: bd.x, z: bd.z, r: 24, f: 30, l: 0.6, name: 'anichkov' });          // the Klodt horses: the busiest bridge of the east
  for (const l of W?.lions || []) out.push({ x: l.x, z: l.z, r: 18, f: 30, l: 0.55, name: 'lions' });       // the Palace Pier: tourists posing with the copper lions
  for (const p of ctx.services.environment?.piers || []) if (p.key === 'neva' && ctx.L.inPlay(p.x, p.z)) out.push({ x: p.x, z: p.z, r: 14, f: 30, l: 0.45, name: 'pier' });
  return out;
}
