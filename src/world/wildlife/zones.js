// wildlife/zones.js - WHERE the animals gather on the whole map (the first build had its sites around Vosstaniya Square and the Fontanka; the west extension adds Kazan, Palace Square,
// the Alexander Garden, St Isaac's Square, Catherine Garden, Gostiny Dvor, the Neva). Pure data + a few service reads: no THREE, no placement tests (birds.js turns a zone into valid
// sites with its own free-ground search).
// A zone: { tag, kind: 'pigeon' | 'sparrow', x, z, spread (m: the search radius of its sites), n (sites), r (site radius: the flock's feeding patch), w (weight: how much the animals like
// it; the density director prefers heavier zones near the player), name }.  The weights follow docs/research/west-life-furniture.md section 8 (pigeons ~120 on the whole west map: Kazan 45,
// Alexander Garden 30, Isaac 15, Catherine 12, Palace Square 8 - read as "how many sites"; the director moves the ~11 flocks of the budget to the heaviest zones around the player).
// Coordinates are local metres (x east, z south); sources: the landmark services (landmarksF.benchPoints / crowd, landmarksJ.crowd / monuments, landmarksG.spots) with the dossier numbers
// as fallbacks (Kazan fountain (-1469,-279), Alexander Garden fountain (-2335,-494), Isaac's garden benches (-2449,-63), the Column (-1983,-738), Catherine monument (-800,-105)).
/** ?petro=off (tools: globalThis.__petroOff): the animals of the Petrograd side / the Spit are switched off (no flock zones, perches, duck lanes and water loops there): A / B comparisons */
export const PETRO_OFF = !!globalThis.__petroOff || (typeof location !== 'undefined' && /[?&]petro=off/.test(location.search || ''));
/** ?isl=off (tools: globalThis.__islOff, --isloff): the animals of the islands of round 2 (Yelagin, Kamenny, Aptekarsky, Petrovsky, the Krestovsky arena: flock zones, gull perches, pond lanes, the swans) are switched off; ?petro=off does it too */
export const ISL_OFF = PETRO_OFF || !!globalThis.__islOff || (typeof location !== 'undefined' && /[?&]isl=off/.test(location.search || ''));
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
  // ---- the PETROGRAD SIDE and the SPIT (docs/PETRO-BRIEF.md): pigeons on the squares (the cathedral square of the fortress, Troitskaya, Lev Tolstoy, the Spit garden, Gorkovskaya, the Aurora quay ...),
  //      sparrows in Alexander Park and the gardens. Positions from the sight services (crowd / photo spots), the dossier numbers as fallbacks.
  if (!PETRO_OFF) {
    const FO = S.landmarksFortress, TR = S.landmarksTroitskaya, SK = S.landmarksStrelka, AU = S.landmarksAurora, VL = S.landmarksVladimir;
    const fq = FO?.crowd?.find?.((c) => c.kind === 'photo') || { x: -1990.4, z: -1960.5 }, tq = TR?.crowd?.find?.((c) => c.id === 'troitskaya-centre') || { x: -1442.8, z: -2296.5 };
    const sq = SK?.crowd?.find?.((c) => c.kind === 'park') || { x: -2480.9, z: -1309.5 }, aq = AU?.crowd?.[0] || { x: -769.8, z: -2516.7 }, vq = VL?.crowd?.find?.((c) => c.id === 'vladimir-porch') || { x: -3185.3, z: -2158.5 };
    z('fortress-square', 'pigeon', fq.x, fq.z, { spread: 26, n: 3, w: 2.8, r: 5, name: 'Голуби на Соборной площади крепости · Pigeons on the cathedral square of the fortress' });
    z('fortress-alley', 'pigeon', -1800, -2025, { spread: 22, n: 1, w: 1.2, r: 4, name: 'Голуби на главной аллее крепости · Pigeons on the main alley of the fortress' });
    z('troitskaya', 'pigeon', tq.x, tq.z, { spread: 30, n: 3, w: 2.4, r: 5, name: 'Голуби на Троицкой площади · Pigeons on Troitskaya Square' });
    z('tolstoy', 'pigeon', -2196, -3712, { spread: 28, n: 2, w: 2.0, r: 4.5, name: 'Голуби на площади Льва Толстого · Pigeons on Lev Tolstoy Square' });
    z('gorkovskaya', 'pigeon', -1821, -2673, { spread: 16, n: 2, w: 1.8, r: 4, name: 'Голуби у метро «Горьковская» · Pigeons at Gorkovskaya metro' });
    z('spit', 'pigeon', sq.x, sq.z, { spread: 26, n: 2, w: 2.0, r: 5, name: 'Голуби на Стрелке · Pigeons on the Spit' });
    z('aurora', 'pigeon', aq.x, aq.z, { spread: 16, n: 1, w: 1.4, r: 4, name: 'Голуби у «Авроры» · Pigeons at the Aurora' });
    z('austrian', 'pigeon', -1903, -3067, { spread: 24, n: 1, w: 1.0, r: 4, name: 'Голуби на Австрийской площади · Pigeons on Austrian Square' });
    z('sytny', 'pigeon', -2324, -2745, { spread: 22, n: 1, w: 1.4, r: 4, name: 'Голуби у Сытного рынка · Pigeons at Sytny market' });
    z('vladimir', 'pigeon', vq.x, vq.z, { spread: 16, n: 1, w: 1.3, r: 4, name: 'Голуби у Князь-Владимирского собора · Pigeons at Prince Vladimir Cathedral' });
    z('kunstkamera', 'pigeon', -2593, -995, { spread: 14, n: 1, w: 1.0, r: 4, name: 'Голуби у Кунсткамеры · Pigeons at the Kunstkamera' });
    z('alexander-park', 'sparrow', -1946, -2598, { spread: 30, n: 2, w: 2.4, r: 3, name: 'Воробьи в Александровском парке · Sparrows in Alexander Park' });
    z('alexander-park', 'sparrow', -1723, -2461, { spread: 26, n: 1, w: 1.8, r: 3, name: 'Воробьи в Александровском парке · Sparrows in Alexander Park' });
    z('alexander-park', 'sparrow', -2110, -2560, { spread: 30, n: 1, w: 1.5, r: 3, name: 'Воробьи в Александровском парке · Sparrows in Alexander Park' });
    z('troitskaya', 'sparrow', tq.x + 22, tq.z + 40, { spread: 22, n: 1, w: 1.8, r: 3, name: 'Воробьи на Троицкой площади · Sparrows on Troitskaya Square' });
    z('spit', 'sparrow', sq.x - 18, sq.z + 16, { spread: 20, n: 1, w: 1.5, r: 3, name: 'Воробьи в Биржевом сквере · Sparrows in the Spit garden' });
    z('fortress-alley', 'sparrow', -1905, -2010, { spread: 24, n: 1, w: 1.5, r: 3, name: 'Воробьи в Петропавловской крепости · Sparrows in the fortress' });
    z('vladimir', 'sparrow', -3129, -2085, { spread: 22, n: 1, w: 1.4, r: 3, name: 'Воробьи в Успенском сквере · Sparrows in the cathedral garden' });
    z('cabin', 'sparrow', -1135, -2305, { spread: 22, n: 1, w: 1.3, r: 3, name: 'Воробьи у Домика Петра · Sparrows at the Cabin of Peter I' });
  }
  // ---- VASILIEVSKY ISLAND (docs/VO-HANDOFF.md, docs/research/vo-requests-*.md "-> wildlife"): pigeons where people stand and feed (the Academy of Arts and the Sphinxes, Trezzini Square, the Andreevsky market and boulevard,
  //      Sevkabel Port, the forecourt of St Xenia's chapel in the Smolensky cemetery, the Menshikov Palace, the Lutheran church, the Gorny Institut square, Pribaltiyskaya, the Mining University), sparrows in the gardens
  //      (Rumyantsev, the Academy, the Andreevsky boulevard, Vasileostrovets). Positions come from the sight services (crowd discs, photo spots, `birds`), the dossier numbers are the fallbacks. Not tied to the Petrograd switch.
  {
    const AC = S.landmarksAcademy, AN = S.landmarksAndrew, SV = S.landmarksSevkabel, SM = S.landmarksSmolensky, MN = S.landmarksMenshikov, MK = S.landmarksMakarova, KI = S.landmarksKirova, PB = S.landmarksPribaltiyskaya, SR = S.landmarksSredny, MI = S.landmarksMining, NC = S.landmarksNavalCorps;
    const NOASPH = ['asphalt'];                                                                                // (pigeons on the paved squares and forecourts, not on the car parks beside them)
    const crowd = (svc, id, fb) => svc?.crowd?.find?.((c) => c.id === id) || fb;
    const ac = AC?.photoSpots?.find?.((p) => /с набережной/.test(p.name)) || { x: -3394.8, z: -535.3 }, tz = AC?.crowd?.find?.((c) => c.kind === 'plaza') || { x: -3532, z: -487 };
    z('academy', 'pigeon', ac.x, ac.z, { avoid: NOASPH, spread: 14, n: 2, w: 2.6, r: 5, name: 'Голуби перед Академией художеств · Pigeons in front of the Academy of Arts' });
    z('academy-trezzini', 'pigeon', tz.x, tz.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.6, r: 4, name: 'Голуби на площади Трезини · Pigeons on Trezzini Square' });
    const mc = crowd(AN, 'market-court', { x: -3708.3, z: -670.6 }), mn = crowd(AN, 'market-north', { x: -3753, z: -749 }), bb = crowd(AN, 'blv-bolshoy', { x: -3828, z: -796 });
    z('andreevsky', 'pigeon', mc.x, mc.z, { avoid: NOASPH, spread: 16, n: 2, w: 2.8, r: 5, name: 'Голуби у Андреевского рынка · Pigeons at the Andreevsky market' });
    z('andreevsky', 'pigeon', mn.x, mn.z, { avoid: NOASPH, spread: 14, n: 1, w: 2.2, r: 4.5, name: 'Голуби у Андреевского рынка · Pigeons at the Andreevsky market' });
    z('andreevsky-boulevard', 'pigeon', bb.x, bb.z, { avoid: NOASPH, spread: 18, n: 1, w: 1.4, r: 4, name: 'Голуби на Андреевском бульваре · Pigeons on the Andreevsky boulevard' });
    const ss = crowd(SV, 'sea-square', { x: -6246, z: 853 }), sp = crowd(SV, 'pier-plaza', { x: -6108, z: 994 });
    z('sevkabel', 'pigeon', ss.x, ss.z, { avoid: NOASPH, spread: 22, n: 2, w: 2.6, r: 5, name: 'Голуби в Севкабель Порту · Pigeons at Sevkabel Port' });
    z('sevkabel-pier', 'pigeon', sp.x, sp.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.6, r: 4, name: 'Голуби на пирсе Севкабель Порта · Pigeons on the Sevkabel pier plaza' });
    const xb = SM?.birds?.find?.((b) => b.kind === 'pigeon') || { x: -5574.6, z: -1330.2, r: 5, n: 45 };                    // the sand-clay forecourt east of the Xenia chapel: the module asks for 45 pigeons; the flock here is the biggest of the map (budget permitting)
    z('xenia', 'pigeon', xb.x, xb.z, { avoid: NOASPH, spread: 3, n: 1, w: 3.2, r: Math.max(3, xb.r || 5), cnt: 13, name: 'Голуби у часовни Ксении Петербургской · Pigeons at the chapel of St Xenia' });
    const mf = crowd(MN, 'palace-forecourt', { x: -3086.3, z: -698.6 });
    z('menshikov', 'pigeon', mf.x, mf.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.5, r: 4, name: 'Голуби у дворца Меншикова · Pigeons at the Menshikov Palace' });
    const lu = MK?.crowd?.find?.((c) => c.kind === 'square') || { x: -3445, z: -1001 };
    z('lutheran', 'pigeon', lu.x, lu.z, { avoid: NOASPH, spread: 10, n: 1, w: 1.2, r: 4, name: 'Голуби у Лютеранской церкви · Pigeons at the Lutheran church' });
    const gp = crowd(SR, 'gorny-plaza', { x: -5036, z: -5 });
    z('gorny', 'pigeon', gp.x, gp.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.4, r: 4, name: 'Голуби у метро «Горный институт» · Pigeons at Gorny Institut metro' });
    const hp = crowd(PB, 'hotel-plaza', { x: -7537, z: -763 });
    z('pribaltiyskaya', 'pigeon', hp.x, hp.z, { avoid: NOASPH, spread: 14, n: 1, w: 1.2, r: 4, name: 'Голуби у гостиницы «Прибалтийская» · Pigeons at the Pribaltiyskaya hotel' });
    const ms = MI?.crowd?.find?.((c) => c.kind === 'stair') || { x: -4564, z: 361 };
    z('mining', 'pigeon', ms.x, ms.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.3, r: 4, name: 'Голуби у Горного университета · Pigeons at the Mining University' });
    const kt = crowd(NC, 'krusenstern-top', { x: -3986, z: -244 });
    z('navalcorps', 'pigeon', kt.x, kt.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.0, r: 4, name: 'Голуби у Морского корпуса · Pigeons at the Naval Cadet Corps' });
    // sparrows: gardens with trees, lamps or benches to dive into
    const ob = crowd(MN, 'garden-obelisk', { x: -3280, z: -662 }), ag = AC?.crowd?.find?.((c) => c.kind === 'garden') || { x: -3495, z: -702 }, f1 = crowd(AN, 'blv-fountain-1', { x: -3969, z: -1031 }), pl = crowd(KI, 'playground', { x: -5297, z: -259 });
    z('rumyantsev', 'sparrow', ob.x, ob.z, { spread: 16, n: 1, w: 1.8, r: 3, name: 'Воробьи в Румянцевском саду · Sparrows in the Rumyantsev garden' });
    z('academy-garden', 'sparrow', ag.x, ag.z, { spread: 16, n: 1, w: 1.8, r: 3, name: 'Воробьи в саду Академии · Sparrows in the Academy garden' });
    z('andreevsky-boulevard', 'sparrow', f1.x, f1.z, { spread: 18, n: 1, w: 1.8, r: 3, name: 'Воробьи на Андреевском бульваре · Sparrows on the Andreevsky boulevard' });
    z('vasileostrovets', 'sparrow', pl.x, pl.z, { spread: 18, n: 1, w: 1.5, r: 3, name: 'Воробьи в саду «Василеостровец» · Sparrows in the Vasileostrovets garden' });
  }
  // ---- the ISLANDS of round 2 (docs/research/people-isl2.md; the "-> wildlife" sections of docs/research/islands2-requests-*.md): pigeons on the gravel and the paved squares where people stand (the Yelagin west spit terrace, the palace stair and the
  //      Butter Meadow, the Kitchen portico, the Stable gate, the East pavilion, Green Beach; the Kamenny church forecourt and Starogo Teatra square; the Palm House portal and the museum door of the Botanical Garden; Betancourt Plaza on
  //      Petrovsky; the Krestovsky arena apron), sparrows in the park / garden corners (the theatre, Hercules, the Institute porch, the north court, Petrovsky Park). Positions from the sight services, the dossier numbers as fallbacks.
  if (!ISL_OFF) {
    const SP = S.landmarksYelaginSpits, PA = S.landmarksYelaginPalace, KI = S.landmarksYelaginKitchen, SE = S.landmarksYelaginServices, RO = S.landmarksYelaginRossi, GH = S.botanicalGreenhouses, BG = S.landmarksBotanicalGarden, KC = S.landmarksKamennyChurch;
    const zi = (tag, kind, x, z0, o) => z(tag, kind, x, z0, { isl: true, ...o }), NOASPH = ['asphalt'], cd = (svc, re, fb) => svc?.crowd?.find?.((c) => re.test(c.id || '')) || fb;
    const sp0 = SP?.photoSpots?.[0] || { x: -6411, z: -5310 }, pw = cd(PA, /west/, { x: -4584, z: -5226 }), kw = cd(KI, /south/, { x: -4625, z: -5258 }), sg = cd(SE, /stable-gate/, { x: -4818, z: -5265 }), pp = cd(GH, /palm/, { x: -1503.6, z: -4162.8 }), md = cd(GH, /museum/, { x: -1581.7, z: -4309.7 }), ip = cd(BG, /porch/, { x: -1757, z: -4055 }), cf = KC?.photoSpots?.[0] || { x: -2861, z: -5413 };
    zi('ye-spit', 'pigeon', sp0.x + 4, sp0.z + 1, { avoid: NOASPH, spread: 9, n: 2, w: 2.2, r: 4, name: 'Голуби на террасе Западной стрелки · Pigeons on the Yelagin west spit terrace' });
    zi('ye-palace', 'pigeon', pw.x, pw.z, { avoid: NOASPH, spread: 16, n: 2, w: 2.0, r: 4.5, name: 'Голуби у Елагина дворца · Pigeons at the Yelagin Palace' });
    zi('ye-kitchen', 'pigeon', kw.x, kw.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.4, r: 4, name: 'Голуби у Кухонного корпуса · Pigeons at the Kitchen block' });
    zi('ye-rossi', 'pigeon', RO?.photoSpots?.[1]?.x ?? -4350, RO?.photoSpots?.[1]?.z ?? -5380, { avoid: NOASPH, spread: 12, n: 1, w: 1.2, r: 4, name: 'Голуби у Восточного павильона · Pigeons at the East pavilion' });
    zi('ye-beach', 'pigeon', -5921, -5211, { avoid: NOASPH, spread: 16, n: 1, w: 1.0, r: 4, name: 'Голуби у Зелёного пляжа · Pigeons at Green Beach' });
    zi('ye-theatre', 'sparrow', -5214, -5372, { spread: 14, n: 1, w: 1.5, r: 3, name: 'Воробьи у Эстрадного театра · Sparrows at the Estradny Theatre' });
    zi('ye-hercules', 'sparrow', -5545, -5114, { spread: 14, n: 1, w: 1.4, r: 3, name: 'Воробьи у Геракла на Елагином острове · Sparrows at the Hercules on Yelagin Island' });
    zi('kamenny-church', 'pigeon', cf.x, cf.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.4, r: 4, name: 'Голуби у Предтеченской церкви · Pigeons at the church of St John the Baptist' });
    zi('kamenny-theatre', 'pigeon', -4250, -4942, { avoid: NOASPH, spread: 14, n: 1, w: 1.0, r: 4, name: 'Голуби на площади Старого Театра · Pigeons on Starogo Teatra Square' });
    zi('botanic-palm', 'pigeon', pp.x, pp.z, { avoid: NOASPH, spread: 12, n: 1, w: 1.6, r: 4, name: 'Голуби у Большой пальмовой оранжереи · Pigeons at the Great Palm House' });
    zi('botanic-institute', 'sparrow', ip.x, ip.z, { spread: 14, n: 1, w: 1.5, r: 3, name: 'Воробьи у Ботанического института · Sparrows at the Botanical Institute' });
    zi('botanic-court', 'sparrow', -1572, -4283, { spread: 14, n: 1, w: 1.5, r: 3, name: 'Воробьи в северном дворе Ботанического сада · Sparrows in the north court of the Botanical Garden' });
    zi('petrovsky-betancourt', 'pigeon', -4758, -2866, { spread: 18, n: 1, w: 1.0, r: 4, name: 'Голуби на площади Бетанкура · Pigeons on Betancourt Plaza' });
    zi('petrovsky-park', 'sparrow', -4200, -2680, { spread: 24, n: 1, w: 1.4, r: 3, name: 'Воробьи в Петровском парке · Sparrows in Petrovsky Park' });
    zi('krestovsky-arena', 'pigeon', -7150, -4519, { spread: 30, n: 1, w: 1.2, r: 4, name: 'Голуби у арены на Крестовском острове · Pigeons at the arena on Krestovsky Island' });
    // the second wave of sights (2026-10-15): LETI plaza, the sphinx pier, the Transfiguration church, the Zhdanovskaya squares (old Petrograd-side reach: the flock exists only with the islands on)
    const LT = S.landmarksLETI, lp = LT?.photoSpots?.find?.((p) => /лестница|вход/i.test(p.name || '')) || { x: -1565.6, z: -4404.2 }, ZB = (S.landmarksZhdanovka?.benches || []).filter((b) => Number.isFinite(b.x)), zc = ZB.length ? { x: ZB.reduce((a, b) => a + b.x, 0) / ZB.length, z: ZB.reduce((a, b) => a + b.z, 0) / ZB.length } : { x: -3530, z: -2350 };
    for (const [qx, qz] of [[lp.x, lp.z], [-1587, -4404], [-1563, -4473]]) zi('leti', 'pigeon', qx, qz, { spread: 16, n: 1, w: 1.3, r: 4, name: 'Голуби у корпуса 5 ЛЭТИ · Pigeons at the LETI Corpus 5 plaza' });          // (the court is generic parking asphalt: no avoid; three candidates, one site is enough)
    zi('kamenny-sphinx', 'pigeon', -2962, -5043, { avoid: NOASPH, spread: 10, n: 1, w: 1.0, r: 4, name: 'Голуби у пристани со сфинксами · Pigeons at the sphinx pier' });
    zi('transfiguration', 'sparrow', -1466, -4540, { spread: 12, n: 1, w: 1.3, r: 3, name: 'Воробьи у церкви Преображения · Sparrows at the Transfiguration church' });
    zi('zhdanovka', 'sparrow', zc.x, zc.z, { spread: 16, n: 1, w: 1.4, r: 3, name: 'Воробьи на Ждановской набережной · Sparrows on the Zhdanovskaya embankment' });
  }
  return Z;
}

/** the districts a crow likes (the Alexander Garden limes, the Kazan and Isaac gardens): crows start on a tree top there when the player is not about */
export const CROW_HAUNTS = [{ x: -2335, z: -500, r: 140 }, { x: -1469, z: -290, r: 90 }, { x: -2449, z: -63, r: 90 }, { x: -800, z: -105, r: 90 },
  ...(PETRO_OFF ? [] : [{ x: -1950, z: -2540, r: 260 }, { x: -1443, z: -2296, r: 130 }, { x: -1930, z: -1990, r: 220 }, { x: -3129, z: -2110, r: 100 }]),      // Alexander Park (the old limes and poplars), Troitskaya Square, the fortress, the cathedral garden
  ...(ISL_OFF ? [] : [{ x: -5280, z: -5210, r: 450 }, { x: -4560, z: -5230, r: 140 }, { x: -1500, z: -4230, r: 200 }, { x: -3300, z: -5100, r: 300 }, { x: -4200, z: -2680, r: 160 }, { x: -1696, z: -4916, r: 120 }]),      // the islands of round 2: the old oaks and limes of the Yelagin park, the palace lawn, the Botanical Garden, Kamenny, Petrovsky Park (BEFORE the three of the cemetery: jackdaws take the last three)
  { x: -5850, z: -1400, r: 430 }, { x: -3495, z: -702, r: 120 }, { x: -3270, z: -660, r: 90 }];      // Vasilievsky Island: the old trees of the Smolensky cemetery (crows and jackdaws), the Academy garden, the Rumyantsev garden

/** the tourist crowds the ambience hears (core/audio.js 'crowd' loop reads ctx.services.wildlife.crowds): the pigeon zones are the places where people stand and feed, so each named
 *  zone gives one crowd (the centre of its sites), plus the Palace Pier lions and the piers of the Neva. { x, z, r (metres of full level), f (fade length), l (level 0..1), name }.
 *  Palace Square and the Kazan garden are the loudest; Nevsky itself is the city / traffic bed, not a crowd. */
const CROWD = {        // tag: [r, f, level]
  column: [70, 70, 0.9], arch: [28, 40, 0.65], 'winter-palace': [45, 45, 0.65],
  kazan: [38, 55, 0.85], 'kazan-bench': [10, 25, 0.6], voronikhin: [18, 30, 0.5], 'kazan-nevsky': [22, 30, 0.6],
  gostiny: [60, 50, 0.7], catherine: [28, 35, 0.55], bridge: [22, 30, 0.6],
  alexander: [32, 45, 0.7], senate: [30, 40, 0.55], isaac: [38, 40, 0.6], 'isaac-monument': [24, 35, 0.5],
  obelisk: [45, 50, 0.6], forecourt: [32, 45, 0.6], rotunda: [18, 30, 0.5],
  // the Petrograd side / the Spit: the cathedral square and the Spit are the tourist crowds, the squares a murmur
  academy: [34, 40, 0.65], 'academy-trezzini': [18, 30, 0.45], andreevsky: [40, 45, 0.65], 'andreevsky-boulevard': [26, 30, 0.45], sevkabel: [46, 50, 0.65], 'sevkabel-pier': [26, 35, 0.5],       // Vasilievsky Island
  'ye-spit': [40, 45, 0.7], 'ye-palace': [34, 40, 0.55], 'ye-kitchen': [18, 30, 0.45], 'ye-rossi': [20, 30, 0.4], 'ye-beach': [24, 30, 0.45], 'kamenny-church': [18, 30, 0.35], 'kamenny-theatre': [22, 30, 0.35],      // the islands of round 2
  'botanic-palm': [26, 35, 0.55], 'petrovsky-betancourt': [20, 30, 0.4], 'krestovsky-arena': [34, 40, 0.5], leti: [20, 30, 0.45], 'kamenny-sphinx': [14, 25, 0.35],
  xenia: [22, 30, 0.5], menshikov: [28, 35, 0.5], lutheran: [16, 25, 0.4], gorny: [24, 30, 0.55], pribaltiyskaya: [26, 30, 0.4], mining: [24, 30, 0.45], navalcorps: [20, 30, 0.4],
  'fortress-square': [50, 55, 0.7], spit: [50, 55, 0.75], aurora: [34, 40, 0.65], troitskaya: [40, 45, 0.45], tolstoy: [36, 40, 0.6], gorkovskaya: [24, 30, 0.6], austrian: [22, 30, 0.4], sytny: [26, 30, 0.5], vladimir: [20, 30, 0.4], kunstkamera: [22, 30, 0.45],
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
