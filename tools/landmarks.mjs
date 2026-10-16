// Maps the places of the scene (Moscow Railway Station cluster, Vosstaniya Square, Nevsky east / west halves, Fontanka, the blocks to the north,
// Ligovsky / the south) to OpenStreetMap ids of the baked data (src/world/data/city.js). Writes
//   docs/reference/landmarks.json   (an array of records: key, group, label, osmId, source table, name, address, centre, area, height / levels, ...)
//   docs/research/osm-landmarks.md  (the same, human-readable, grouped by area, plus the auto lists: every named / heritage building of the
//                                    screenshot ground, metro stations + entrances, trolleybus stops, churches, schools)
//   node tools/landmarks.mjs
// Each landmark is given by an OSM id (verified by hand) or by a name regex + a point (nearest match); `note` says what is known / missing.
// Map data (c) OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pointInPoly, centroid } from './osm-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const CAL = JSON.parse(fs.readFileSync(path.join(root, 'docs/reference/calibration.json'), 'utf8'));
const S = CAL.metresPerPixel, U0 = CAL.originPixel.u, V0 = CAL.originPixel.v;
const G = CAL.groundCovered;
const r1 = (v) => Math.round(v * 10) / 10;
const px = (x, z) => [Math.round(x / S + U0), Math.round(z / S + V0)];
const inShot = (x, z) => x >= G.x0 && x <= G.x1 && z >= G.z0 && z <= G.z1;
const inPlay = (x, z) => D.PLAY_RECTS.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);   // the play area is a union of rectangles
const unflat = (a) => { const r = []; for (let i = 0; i < a.length; i += 2) r.push([a[i], a[i + 1]]); return r; };
const polysArea = (polys) => polys.reduce((s, p) => { const r = unflat(p.o); let a = 0; for (let i = 0; i < r.length; i++) { const q = r[(i + 1) % r.length]; a += r[i][0] * q[1] - q[0] * r[i][1]; } return s + Math.abs(a / 2); }, 0);

const tables = { building: D.BUILDINGS, poi: D.POIS, monument: D.MONUMENTS, station: D.STATIONS, platform: D.PLATFORMS, entrance: D.ENTRANCES, stop: D.BUS_STOPS, manmade: D.MANMADE, green: D.GREEN, area: D.AREAS, bridge: D.BRIDGES, river: D.RIVER };
const byId = new Map();
for (const [src, list] of Object.entries(tables)) for (const r of list) if (r.id && !(byId.has(r.id) && src === 'poi')) { if (!byId.has(r.id)) byId.set(r.id, []); byId.get(r.id).push([src, r]); }
const BYID = (id) => { const l = byId.get(id); if (!l) return null; return l.find(([s]) => s === 'building') || l[0]; };
const nameOf = (r) => [r.name, r.nameEn, r.brand, r.operator, r.tags && r.tags.alt_name, r.tags && r.tags.old_name].filter(Boolean).join(' | ');

function rec(src, r, key, group, label, note) {
  const x = r.cx ?? r.x ?? (r.polys && r.polys.length ? centroid([...unflat(r.polys[0].o), unflat(r.polys[0].o)[0]])[0] : null);
  const z = r.cz ?? r.z ?? (r.polys && r.polys.length ? centroid([...unflat(r.polys[0].o), unflat(r.polys[0].o)[0]])[1] : null);
  const kids = src === 'building' ? D.BUILDINGS.filter((b) => b.parent === r.id).map((b) => ({ id: b.id, h: b.h, levels: b.levels, roof: b.roof, roofH: b.roofH, minH: b.minH || 0, area: b.area, kind: b.kind, cx: b.cx, cz: b.cz })) : undefined;
  const b = src === 'building' ? r : null;
  return {
    key, group, label, osmId: r.id, source: src, name: r.name || null, nameEn: r.nameEn || null, kind: r.kind || r.hw || r.sub || null, sub: r.sub || null,
    addr: b && b.addr ? `${b.addr.street || ''} ${b.addr.no || ''}`.trim() : r.street ? `${r.street} ${r.no || ''}`.trim() : null,
    centre: x == null ? null : { x: r1(x), z: r1(z) }, px: x == null ? null : px(x, z), inScreenshot: x == null ? null : inShot(x, z), inPlay: x == null ? null : inPlay(x, z),
    areaM2: r.area ?? (r.polys && r.polys.length ? Math.round(polysArea(r.polys)) : null),
    h: r.h ?? null, levels: r.levels ?? null, hEst: r.hEst ?? null, hSrc: r.hSrc ?? null, roof: r.roof || null, roofH: r.roofH ?? null, startDate: r.startDate || null,
    architect: (r.tags && r.tags.architect) || r.artist || null, heritage: r.heritage || null, wikidata: r.wikidata || null, hiddenByParts: b ? !!b.skip : undefined, parts: kids && kids.length ? kids : undefined,
    colour: r.colour || r.roofColour || null, depth: r.depth ?? null, lineColour: src === 'station' || src === 'entrance' ? r.colour || null : undefined, refs: r.ref || undefined, routes: r.routes || undefined,
    note: note || null,
  };
}
const out = [], missing = [];
function add(key, group, label, spec, note) {
  let hit = null;
  if (spec.id) { const h = BYID(spec.id); if (h) hit = h; }
  else if (spec.re) {
    const re = new RegExp(spec.re, 'i'); const cand = [];
    for (const src of spec.tables || ['building', 'poi', 'monument', 'station', 'manmade', 'green', 'area']) for (const r of tables[src]) if (re.test(nameOf(r))) { const x = r.cx ?? r.x ?? (r.polys && r.polys[0] ? r.polys[0].o[0] : null), z = r.cz ?? r.z ?? (r.polys && r.polys[0] ? r.polys[0].o[1] : null); if (x == null) continue; cand.push([src, r, spec.near ? Math.hypot(x - spec.near[0], z - spec.near[1]) : -(r.area || 0)]); }
    cand.sort((a, b) => a[2] - b[2]);
    if (cand.length && (!spec.near || cand[0][2] <= (spec.maxD || 200))) hit = cand[0];
  }
  if (!hit) { missing.push({ key, group, label, spec, note }); return null; }
  const o = rec(hit[0], hit[1], key, group, label, note); out.push(o); return o;
}

// ---------------------------------------------------------------- the list (group names are used by the markdown)
const GR = { st: 'Station cluster (Moscow Railway Station)', vo: 'Vosstaniya Square', ne: 'Nevsky east half (Vosstaniya - Mayakovskaya - Liteyny)', nw: 'Nevsky west half (Liteyny - Fontanka)', fo: 'Fontanka', nb: 'North blocks (Liteyny / Mayakovskogo / Radishcheva)', ls: 'Ligovsky / south (Vladimirsky, Marata, Zagorodny)' };
// ---- station cluster
add('moscow-station', GR.st, 'Московский вокзал (Nevsky 85 lit. A) - the main building / outline', { id: 'r2404499' }, 'building=train_station multipolygon, height 17 m, start_date 1844..1851 (Konstantin Thon); the outline is HIDDEN (skip=1) because its 6 building:parts cover it: use the parts for the 3D massing');
add('moscow-station-85z', GR.st, 'Moscow station: wing "85 лит. З"', { id: 'r2404500' }, '3 levels + roof level, west wing on Ligovsky pr. side (building=train_station)');
add('moscow-station-85v', GR.st, 'Moscow station: wing "85 лит. В"', { id: 'r2404501' }, '5 levels, west wing (building=train_station)');
add('station-clock-tower', GR.st, 'Clock tower over the main facade (part, pyramidal roof)', { id: 'r16492039' }, 'a 44 m2 building:part, height 17 m, roof:shape pyramidal (roof:height 1): the mapped height is the base of the tower, the real tower with its spire is much taller - model it from the footprint and the research docs, not from the tag');
add('station-hall-main', GR.st, 'Station main concourse / train-shed block (largest part, gabled roof)', { id: 'r16492034' }, 'building:part 2993 m2, height 10 m, gabled roof 1 m: the long hall over the tracks behind the concourse');
add('station-part-north-range', GR.st, 'Station facade range on Vosstaniya Square (part, 2 levels)', { id: 'r16492038' }, 'building:part 2490 m2, 10.5 m, gabled roof 1.5 m = the long L-shaped facade wing along the square');
add('station-part-north-2', GR.st, 'Station part (gabled, 10 m)', { id: 'r16492035' }, 'building:part 719 m2');
add('station-part-w', GR.st, 'Station canopy / low part west of the hall', { id: 'r16492036' }, 'building:part 1114 m2, 5 m');
add('station-part-e', GR.st, 'Station canopy / low part east of the hall', { id: 'r16492037' }, 'building:part 1416 m2, 5 m');
add('station-canopy', GR.st, 'Platform canopy over the track heads ("roof" part, min_height 4.5)', { id: 'w662697923' }, 'building=roof, height 5 m, min_height 4.5 m, 1119 m2: a roof on pillars (no walls) at the end of the hall');
add('station-ticket-hall', GR.st, 'Кассовый зал № 1 (ticket hall)', { id: 'w662697920' }, '3 levels, hipped roof, 909 m2');
add('station-suburban-tickets', GR.st, 'Пригородные кассы (suburban tickets)', { id: 'w433164092' }, '1 level, 380 m2, south-west of the concourse');
add('station-ticket-office-13', GR.st, 'Билетная касса № 13', { id: 'w595741909' }, 'small ticket pavilion');
add('station-rail-node', GR.st, 'Санкт-Петербург-Главный (railway=station node)', { id: 'n21596808' }, 'ESR 031812, UIC 2004001, start_date 1847, operator RZD; the official station name (Moscow Station is the name of the building)');
for (const [id, ref] of [['w93473640', '1'], ['w595741912', '2;3'], ['w93473641', '4;5'], ['w93473638', '6;7'], ['w93473650', '8;9'], ['w93473646', '10;11']]) add('platform-' + ref.replace(';', '-'), GR.st, `Platform for tracks ${ref}`, { id }, 'railway=platform area; ' + (id === 'w93473640' ? 'no shelter tag' : 'shelter=yes') + ' (canopy over the platform)');
add('station-metro-vestibule', GR.vo, 'Метро Площадь Восстания: ground vestibule (площадь Восстания 2)', { id: 'w28962850' }, 'building=transportation, 1 level, roof:shape many');
// ---- Vosstaniya Square
add('hero-city-obelisk', GR.vo, 'Обелиск «Городу-Герою Ленинграду» (Hero City Leningrad obelisk)', { id: 'w1214651508' }, 'mapped as building (area 173 m2), height 36 m, name:en "Leningrad Hero City Obelisk"; a 36 m granite stele with a star on a stepped base (unveiled 1985); no memorial node in OSM');
add('hotel-oktyabrskaya', GR.vo, 'Гостиница «Октябрьская» (Ligovsky pr. 10/118)', { id: 'r1598177' }, 'apartments + tourism=hotel POI (same id), 6 levels, 7976 m2 - the big block on the Nevsky / Ligovsky corner opposite the station');
add('hotel-oktyabrskaya-ligovsky-wing', GR.vo, 'Octyabrskaya: Best Western Plus, Лиговский корпус (Ligovsky pr. 41/83)', { id: 'r1588277' }, '5 levels, 1755 m2 (the hotel\'s Ligovsky wing)');
add('cosmos-hotel', GR.vo, 'Cosmos hotel (Гончарная 4)', { id: 'w507867255' }, '7 levels, 1717 m2, east of the station on Goncharnaya');
add('tourist-bureau', GR.vo, 'Городское туристско-информационное бюро (pavilion)', { id: 'w353314781' }, 'pavilion, 27 m2');
add('daily-kiosk', GR.vo, 'Ежедневник (kiosk)', { id: 'w1215662501' }, 'kiosk 5 m2');
add('vosstaniya-square', GR.vo, 'площадь Восстания (square / paving area)', { re: 'Восстания', tables: ['area'], near: [560, 150], maxD: 300 }, 'AREAS polygon: the paved square');
add('metro-vosstaniya-station', GR.vo, 'Станция метро Площадь Восстания (line 1 red, depth 58 m)', { id: 'n97036546' }, 'railway=station node; platform multipolygon r5633943 (layer -5); entrances in the ENTRANCES list');
add('metro-vosstaniya-platform', GR.vo, 'Площадь Восстания: underground platform', { id: 'r5633943' }, 'layer -5, 3186 m2, location=underground');
add('metro-mayakovskaya-station', GR.ne, 'Станция метро Маяковская (line 3 green, depth 51 m)', { id: 'n5369186762' }, 'railway=station node, wheelchair=yes, loc_name "Маяк"');
add('metro-mayakovskaya-platform', GR.ne, 'Маяковская: underground platform', { id: 'r8362462' }, 'layer -4, 2283 m2');
// ---- Nevsky east half
add('nevsky-centre', GR.ne, 'ТЦ «Невский Центр» (Nevsky 114-116)', { id: 'r1784115' }, 'shopping centre, 6 levels, 9845 m2 (= Nevsky Centre / "Невский Центр" label)');
add('colosseum', GR.ne, 'Колизей (arts centre, Nevsky 100)', { id: 'n4729691391' }, 'amenity=arts_centre node only; the building is the block at Nevsky 100 (see "Миссия Благая весть" w113458823 beside it)');
add('mission-blagaya-vest', GR.ne, 'Миссия Благая весть (basilica, Nevsky 100 лит. И)', { id: 'w113458823' }, 'building=basilica, 2 levels, 1195 m2');
add('nevsky-plaza', GR.ne, '"Невский плаза" (Yandex label on Nevsky 84-86 side)', { re: 'Невский плаза|Nevsky Plaza', near: [20, 40], maxD: 250 }, 'no OSM object with this name');
add('dom-yusupova', GR.ne, 'Дом Юсуповой (Nevsky 84-86)', { id: 'w60196034' }, 'mansion, 4 levels, 1553 m2, late C18 / C19');
add('nevsky-84-86-back', GR.ne, 'Nevsky 84-86 (courtyard block)', { id: 'w98396422' }, '4 levels, 1333 m2');
add('nevsky-90-92', GR.ne, 'Nevsky 90-92 (Menyaev house, arch. A. K. Bruni 1866-67)', { id: 'w60195756' }, 'apartments, 1269 m2, no levels/height in OSM');
add('menyaev-outbuilding', GR.ne, 'Дворовый флигель дома Меняевых (Nevsky 90-92 лит. Г)', { id: 'w103591279' }, '4 levels, 648 m2');
add('hotel-nevsky-central', GR.ne, 'Невский Централь (hotel, Nevsky 90)', { id: 'n4892255480' }, 'POI node');
add('nevsky-mayak-hotel', GR.ne, 'Невский маяк (hotel, Nevsky 94/2)', { id: 'n1288238563' }, 'POI node');
add('novotel', GR.ne, 'Novotel (Mayakovskogo 3а)', { id: 'r17822679' }, 'hotel, 2507 m2, no levels/height');
add('alia-tempora', GR.ne, 'Бизнес-центр «Alia Tempora» (Mayakovskogo 3б)', { id: 'w87725109' }, '10 levels, 33 m, 856 m2');
add('vestnik', GR.ne, 'Бизнес-центр «Вестник» (Nevsky 102)', { id: 'w60352476' }, '5 levels, 391 m2');
add('nevsky-atrium', GR.ne, 'Невский Атриум (Marata 1/71)', { id: 'r15081493' }, '5 levels, 2411 m2');
add('olympic-plaza', GR.ne, 'Olympic Plaza (Stremyannaya 21/5)', { id: 'w61650439' }, 'mall, 6 levels, 2040 m2');
add('mayakovskaya-vestibule', GR.ne, 'Mayakovskaya vestibule: the corner block Nevsky / Marata 1/71 (Невский Атриум) that holds the entrance and the exit', { id: 'r15081493' }, 'no separate vestibule building is mapped: the ENTRANCES nodes n4060185664 (entrance, wheelchair=yes, 05:37-00:25) at (196.1, 93.3) and n1109163128 (exit) at (215.7, 115.3) lie inside this outline (ENTRANCES[].bldg)');
add('lyceum-214', GR.ne, 'Лицей № 214', { id: 'w541829762' }, 'school (POI way)');
add('school-207', GR.ne, 'Школа № 207 (6-11 классов)', { id: 'w827140612' }, 'school POI way');
// ---- Nevsky west half
add('anichkov-palace', GR.nw, 'Аничков дворец (Nevsky 39)', { id: 'r1517638' }, 'building r1517638 is the Anichkov Palace complex now labelled by its tenants "СПбГДТЮ ...": 2 levels, 3082 m2; the palace itself is r3798383 (4 levels, 2771 m2); both lie WEST of the Fontanka, outside PLAY (x -595..): inside EXTENT only');
add('anichkov-palace-main', GR.nw, 'Аничков дворец (palace)', { id: 'r3798383' }, 'historic=castle POI + building, 4 levels (13.2 m by levels; real ~ 20 m), 2771 m2');
add('anichkov-lyceum', GR.nw, 'Аничков лицей (Nevsky 39 лит. К)', { id: 'r14163264' }, 'school building');
add('beloselsky-belozersky', GR.nw, 'Дворец Белосельских-Белозерских (Nevsky 41)', { id: 'r1588865' }, '3 levels (9.9 m by levels; real ~ 22 m), start_date 1847..1848 (arch. A. Stackenschneider), 3573 m2, red-pink palace on the corner of the Fontanka');
add('dom-zhurnalista', GR.nw, 'Дом журналиста (Nevsky 70)', { id: 'r936116' }, '3 levels, 1082 m2');
add('dom-kozhevnikova', GR.nw, 'Дом Кожевникова (Nevsky 51 лит. А, 1834-35)', { id: 'r3323319' }, '1549 m2, no levels / height');
add('hostel-nevsky-74', GR.nw, 'Nevsky 74 (hotel)', { id: 'n1304587473' }, 'POI node');
add('library-mayakovsky', GR.nw, 'Центральная городская публичная библиотека им. В. В. Маяковского', { id: 'w544691367' }, 'library POI way (Fontanka 46, west bank / inside the Fontanka strip)');
add('aeroflot-block', GR.nw, 'Nevsky 7x block with the "Аэрофлот" label', { re: 'Аэрофлот|Aeroflot', tables: ['poi', 'building'], near: [-330, 10], maxD: 200 }, 'POI by name if mapped');
// ---- Fontanka
add('anichkov-bridge-deck', GR.fo, 'Аничков мост (bridge deck, man_made=bridge)', { id: 'r5537267' }, 'layer 1; the two carriageway ways w372394912 / w372394928 (primary, 4 lanes each, bridge=yes, layer 1, width 14 m each) and 6 footway ways (2.4 m) are in BRIDGES / ROADS; the four Klodt horse sculptures are NOT in OSM (build them at the four corners)');
add('anichkov-bridge-way', GR.fo, 'Аничков мост (road way, one carriageway)', { id: 'w372394912' }, 'highway=primary, bridge=yes, layer 1, lanes 4');
add('fontanka-river', GR.fo, 'Фонтанка (river, polygon multipolygon + centre line)', { id: 'r1201709' }, 'natural=water water=river multipolygon (WATER kind "river", RIVER record: mean width ~54 m inside the extent); the centre line is waterway=river w24255525 / w79570067');
add('national-library', GR.fo, 'Российская национальная библиотека (Sadovaya / Fontanka 36)', { id: 'r3801087' }, '3 levels (real ~ 20 m), 5513 m2');
add('shuvalov-palace', GR.fo, 'Шуваловский дворец (Fontanka 21)', { id: 'r1484228' }, '2 levels, 2968 m2, outside PLAY to the north-west (inside EXTENT)');
add('fountain-house', GR.fo, 'Фонтанный дом / Шереметевский дворец (Fontanka 34), museum of Anna Akhmatova', { id: 'r3801088' }, 'POI attraction; the museum POI is r3801086 (Литейный 53); both are north of PLAY (z -392/-453) inside EXTENT, building outlines are in BUILDINGS near (-314,-453)');
add('anna-akhmatova-museum', GR.fo, 'Музей Анны Ахматовой в Фонтанном доме', { id: 'r3801086' }, 'tourism=museum POI');
add('sdyushor-1', GR.fo, 'СДЮСШОР № 1 (Fontanka 33)', { id: 'w28962563' }, '3 levels, 2531 m2');
add('garden-anichkov', GR.fo, 'Сад Аничкова дворца', { id: 'r1770781' }, 'park (GREEN)');
add('fontanka-50', GR.fo, 'Fontanka 50 (arch. N. P. Grebyonka)', { id: 'w47457765' }, '5 levels, 2930 m2');
add('tolstoy-house', GR.ls, 'Толстовский дом (Rubinshteyna 15-17, 1912, arch. F. Lidval)', { id: 'r1588827' }, '5 levels (16.5 m; real ~ 30 m with the corner tower), 9188 m2');
add('rubinsteina-13', GR.ls, 'Rubinshteyna 13 (1864, arch. N. P. Grebyonka)', { id: 'r368263' }, '3258 m2, no height');
add('rock-club-plaque', GR.ls, 'Ленинградский рок-клуб (Rubinshteyna 13, memorial plaque)', { id: 'n6307077287' }, 'memorial=plaque node');
// ---- north blocks
add('mariinsky-hospital-main', GR.nb, 'Главное здание Мариинской больницы (Liteyny 56)', { id: 'w60353337' }, '2 levels (real ~ 14 m), 4215 m2 (the "Главный корпус" label at the top of the screenshot)');
add('mariinsky-hospital', GR.nb, 'Мариинская больница (hospital, campus POI)', { id: 'w113490078' }, 'amenity=hospital way');
add('akhmatova-statue', GR.nb, 'А. А. Ахматова (statue)', { id: 'n1699889759' }, 'memorial=statue');
add('sheremetev-apartment-house', GR.nb, 'Доходный дом С. Д. Шереметева (Liteyny 51)', { id: 'r16079438' }, '5 levels, 2737 m2');
add('lourdes-church', GR.nb, 'Церковь Лурдской Божией Матери (Kovensky 7)', { id: 'w129211285' }, 'church, 403 m2');
add('gymnasium-171', GR.nb, 'Гимназия № 171', { id: 'w554984396' }, 'school');
add('gymnasium-209', GR.nb, 'Гимназия № 209', { id: 'w827140615' }, 'school');
add('concert-hall-oktyabrsky', GR.nb, 'Большой концертный зал «Октябрьский» (Ligovsky 6, 1967, A. Zhuk)', { id: 'w30324279' }, '3 levels, 12 m, 5180 m2, north-east corner (outside the screenshot ground at the top right)');
add('rauhfus-hospital', GR.nb, 'Детская городская больница № 19 им. Раухфуса', { id: 'r3420351' }, 'hospital');
add('pushkin-children-library', GR.nb, 'ЦДГБ им. А.С. Пушкина (3-я Советская 8)', { id: 'w101539846' }, 'library, 2 levels');
// ---- Ligovsky / south
add('vladimirsky-cathedral', GR.ls, 'Собор Владимирской иконы Божией Матери (Vladimirsky 20)', { id: 'w38611014' }, 'cathedral, 3 levels (real ~ 40 m with the domes), 1200 m2');
add('vladimirsky-bell-tower', GR.ls, 'Колокольня Владимирского собора', { id: 'w38611013' }, '4 levels (13.2 m by levels; real ~ 60 m), 212 m2; also man_made=tower tower:type=bell_tower');
add('vladimirsky-passage', GR.ls, 'Владимирский Пассаж (Vladimirsky 19, 1901, arch. K. Schulman)', { id: 'w70216607' }, '6 levels, 4192 m2');
add('renaissance-hall', GR.ls, 'Renaissance Hall (Vladimirsky 23)', { id: 'w38578114' }, '8 levels, 2713 m2');
add('tuzov-house', GR.ls, 'Дом Тузова И. Л. (Marata 17, 1894-95)', { id: 'w61650433' }, '4 levels, 862 m2');
add('hungarian-consulate', GR.ls, 'Генеральное консульство Венгрии (Marata 15)', { id: 'w61650435' }, '3 levels, 606 m2');
add('pushkinskaya-10', GR.ls, 'Арт-центр Пушкинская 10', { id: 'n6533612689' }, 'tourism=museum POI node');
add('dostoevsky-museum', GR.ls, 'Музей Ф. М. Достоевского (Kuznechny 5/2)', { id: 'n507091461' }, 'museum POI node, south of PLAY? (z 563: inside PLAY)');
add('dostoevsky-statue', GR.ls, 'Ф. М. Достоевский (statue by the metro, h 3.5 m)', { id: 'n4326752745' }, 'memorial=statue');
add('pushkin-statue-pushkinskaya', GR.ls, 'А. С. Пушкину (statue in the Pushkinsky skver)', { id: 'n893852053' }, 'memorial=statue');
add('metro-dostoevskaya', GR.ls, 'Станция метро Достоевская (line 4 orange, depth 64 m)', { id: 'n94858991' }, 'railway=station node');
add('metro-vladimirskaya', GR.ls, 'Станция метро Владимирская (line 1 red, depth 55 m)', { id: 'n5369186787' }, 'railway=station node');
add('crowne-plaza', GR.ls, 'Crowne Plaza Ligovsky (Ligovsky 61)', { id: 'n1572967775' }, 'hotel POI');
add('fedorovsky-cathedral', GR.ls, 'Фёдоровский собор', { id: 'r6319253' }, 'church, on the edge of EXTENT (x 954)');
add('konevskaya-church', GR.ls, 'Церковь Коневской иконы Божией Матери (Zagorodny 7)', { id: 'w46369421' }, 'church, 290 m2');
add('nikolsky-chapel', GR.ls, 'Часовня Никольского Храма (Marata 24А)', { id: 'w129988390' }, 'chapel, 57 m2');
add('tikhvin-church', GR.ls, 'Храм Тихвинской иконы Пресвятой Богородицы', { id: 'n5346583333' }, 'place_of_worship node');

// ---------------------------------------------------------------- auto lists
const auto = { named: [], heritage: [], churches: [], schools: [], metroEntrances: [], trolleyStops: [] };
const have = new Set(out.map((o) => o.osmId));
for (const b of D.BUILDINGS) {
  if (!inShot(b.cx, b.cz) || b.part) continue;
  const isChurch = b.tags && (b.tags.amenity === 'place_of_worship' || b.tags.religion) || ['church', 'cathedral', 'chapel', 'basilica', 'monastery'].includes(b.kind);
  const isSchool = b.kind === 'school' || b.kind === 'kindergarten' || (b.tags && ['school', 'kindergarten', 'college', 'university'].includes(b.tags.amenity));
  if (b.name || b.heritage || (b.tags && b.tags.architect)) auto.named.push(rec('building', b, b.id, 'auto', b.name || b.addr && `${b.addr.street} ${b.addr.no}` || b.id));
  if (isChurch) auto.churches.push(rec('building', b, b.id, 'churches', b.name || b.id));
  if (isSchool) auto.schools.push(rec('building', b, b.id, 'schools', b.name || b.id));
}
for (const p of D.POIS) { if (p.kind === 'amenity' && p.sub === 'school' && !p.name) continue; if (p.kind === 'amenity' && ['school', 'kindergarten', 'college', 'university'].includes(p.sub) && inShot(p.x, p.z) && !auto.schools.some((s) => s.name === p.name)) auto.schools.push(rec('poi', p, p.id, 'schools', p.name || p.id)); if (p.kind === 'amenity' && p.sub === 'place_of_worship' && inShot(p.x, p.z) && !auto.churches.some((s) => s.name === p.name)) auto.churches.push(rec('poi', p, p.id, 'churches', p.name || p.id)); }
for (const e of D.ENTRANCES) auto.metroEntrances.push(rec('entrance', e, e.id, 'metro', `${e.name || '(no name)'} ${e.kind}${e.ref ? ' ' + e.ref : ''}`));
for (const s of D.BUS_STOPS) if ((s.trolley || (s.routes && s.routes.trolley)) && s.kind !== 'stop_position') auto.trolleyStops.push(rec('stop', s, s.id, 'trolleybus', s.name || s.id));

fs.writeFileSync(path.join(root, 'docs', 'reference', 'landmarks.json'), JSON.stringify({ note: 'OSM ids of the places of the scene. See docs/research/osm-landmarks.md. Map data (c) OpenStreetMap contributors, ODbL.', landmarks: out, auto, missing }, null, 1) + '\n');

// ---------------------------------------------------------------- markdown
const num = (v) => (v == null ? '-' : v);
const row = (o) => `| ${o.key} | \`${o.osmId}\` | ${o.name || o.label} | ${o.addr || ''} | (${o.centre ? o.centre.x + ', ' + o.centre.z : '-'}) | ${num(o.areaM2)} | ${o.h != null ? o.h + ' m' : '-'} / ${num(o.levels)} | ${o.inPlay ? '' : 'outside PLAY; '}${o.note || ''} |`;
const HEAD = '| key | OSM id | name | address | centre x, z (m) | area m2 | height / levels | note |\n|---|---|---|---|---|---|---|---|';
let md = `# OSM landmarks of the Saint Petersburg scene\n\nGenerated by \`tools/landmarks.mjs\` from \`src/world/data/city.js\` (OSM data (c) OpenStreetMap contributors, ODbL). Machine-readable: \`docs/reference/landmarks.json\`.\nLocal frame: metres from ORIGIN (59.932421 N, 30.351279 E), **x east, z south**; PLAY = union of ${D.PLAY_RECTS.length} rectangles (bounding box x ${D.PLAY.x0}..${D.PLAY.x1}, z ${D.PLAY.z0}..${D.PLAY.z1}; docs/reference/west-frame.md); screenshot ground x ${G.x0}..${G.x1}, z ${G.z0}..${G.z1}.\nHeights: \`h\` = mapped height else levels x 3.3 m (+ roof levels x 1.5); **OSM levels in this city are low: historic 5-storey buildings are ~ 20-23 m, not 16.5 m** (see docs/reference/DATA-REPORT.md).\n\n`;
for (const g of Object.values(GR)) {
  const L = out.filter((o) => o.group === g); if (!L.length) continue;
  md += `## ${g}\n\n${HEAD}\n${L.map(row).join('\n')}\n\n`;
  const withParts = L.filter((o) => o.parts && o.parts.length);
  for (const o of withParts) md += `Parts of \`${o.osmId}\` (${o.name || o.label}): ${o.parts.map((p) => `\`${p.id}\` ${p.kind} h ${num(p.h)} m${p.minH ? ' (min ' + p.minH + ')' : ''}${p.roof ? ' ' + p.roof : ''} ${p.area} m2`).join('; ')}\n\n`;
}
md += `## Metro (entrances, exits, stations)\n\nStations: ${D.STATIONS.filter((s) => s.kind === 'subway').map((s) => `**${s.name}** \`${s.id}\` line ${(s.lines || []).join(',') || '?'} ${s.colour || ''} depth ${num(s.depth)} m (${s.x}, ${s.z})`).join('; ')}.\n\n| id | name | kind | ref | line colour | centre x, z | wheelchair / hours |\n|---|---|---|---|---|---|---|\n${auto.metroEntrances.map((o) => { const e = D.ENTRANCES.find((x) => x.id === o.osmId); return `| \`${o.osmId}\` | ${e.name || '(unnamed)'} | ${e.kind} | ${e.ref || ''} | ${e.colour || ''} | (${e.x}, ${e.z}) | ${e.wheelchair || ''} ${e.oh || ''} |`; }).join('\n')}\n\nMetro lines in the data (SUBWAY_ROUTES): ${D.SUBWAY_ROUTES.filter((r, i, a) => a.findIndex((q) => q.ref === r.ref) === i).map((r) => `line ${r.ref} ${r.line || r.name} (${r.colour}), ${r.stops.length} stations`).join('; ')}.\n\n`;
md += `## Trolleybus stops (BUS_STOPS with trolley=1 or trolleybus routes)\n\n| id | name | centre x, z | routes |\n|---|---|---|---|\n${auto.trolleyStops.map((o) => `| \`${o.osmId}\` | ${o.name || ''} | (${o.centre.x}, ${o.centre.z}) | ${o.routes ? JSON.stringify(o.routes) : ''} |`).join('\n')}\n\nTrolleybus routes crossing the extent (TROLLEY): ${[...new Set(D.TROLLEY.map((r) => r.ref))].join(', ')}. Trams (TRAM_ROUTES): ${[...new Set(D.TRAM_ROUTES.map((r) => r.ref))].join(', ')}.\n\n`;
const tbl = (L) => `${HEAD}\n${L.sort((a, b) => (b.areaM2 || 0) - (a.areaM2 || 0)).map(row).join('\n')}\n\n`;
md += `## Churches in the screenshot ground\n\n${tbl(auto.churches)}`;
md += `## Schools in the screenshot ground\n\n${tbl(auto.schools)}`;
md += `## Every named / heritage / architect-tagged building in the screenshot ground (${auto.named.length})\n\n${tbl(auto.named)}`;
if (missing.length) md += `## Not found in OSM\n\n${missing.map((m) => `- **${m.key}** (${m.group}): ${m.label}${m.note ? ' - ' + m.note : ''}`).join('\n')}\n`;
fs.writeFileSync(path.join(root, 'docs', 'research', 'osm-landmarks.md'), md);
console.log(`landmarks ${out.length} resolved, ${missing.length} missing; named buildings in screenshot ${auto.named.length}, churches ${auto.churches.length}, schools ${auto.schools.length}, metro entrances ${auto.metroEntrances.length}, trolleybus stops ${auto.trolleyStops.length}`);
for (const m of missing) console.log('MISSING', m.key, JSON.stringify(m.spec));
