// ============================================================================
//  AREA DEFINITION - the North (docs/AREAS.md, docs/AREAS-DATA.md): Chernyshevskaya, the Spaso-Preobrazhensky Cathedral, Dom Muruzi, the Paradny Quarter, the Tauride Garden and Palace, Smolny, the
//  Suvorov Museum and Kirochnaya Street, 3.947 km2, plus a one-sided 200 m band of the strip's territory (z -405 .. -205, x -420 .. 835) so that an arrival from the strip lands on real, identical streets.
//  Milestone M3 was the GENERIC North (environment, streets, city, props, traffic, people, wildlife, drive); milestone M5 adds the landmark modules copied from the source: landmarksNorthFull (Chernyshevskaya,
//  the Transfiguration Cathedral, Dom Muruzi, the Podpisnye Izdaniya bookstore, the corridor houses), landmarksSmolny, landmarksSuvorov, landmarksKirochnaya, and the strip's own landmarksD (library only) and
//  landmarksOktyabrsky for the 200 m band. GROUPS below holds their claims; the generic `city` draws every building they do not claim. Phase T1 of the Tauride remake added landmarksTauride (the Palace and the Paradny quarter; docs/TAURIDE-REMAKE.md), the garden follows in T2-T6.
//  north.html remaps ./src/world/area.js to this file with an import map (tools/area.mjs does the same for the headless tools). PURE DATA: no three.js, no import of layout.js (layout.js imports this
//  file) and NO import of the strip's area module (the remap would hand back this very file): the values that the engine reads from every area (NAMES, SQUARE, OBELISK, STATION) are COPIES of the
//  strip's, which keeps the 200 m band identical on both pages (the style of a block follows its distance to SQUARE: city/archetypes.js, streets/style.js).
//  Same export names as src/world/area.js; the engine tables at the end are read through src/world/lib/area-tables.js.
// ============================================================================
// The claims of the landmark modules (M5): each groups.js is PURE DATA (ids and names) and is read by the module, by layout.js and by the tools.
import { GROUPS_LIST as G_NORTHFULL } from '../../world/landmarksNorthFull/groups.js';
import { GROUPS_LIST as G_SMOLNY } from '../../world/landmarksSmolny/groups.js';
import { GROUPS_LIST as G_SUVOROV } from '../../world/landmarksSuvorov/groups.js';
import { GROUPS_LIST as G_KIROCHNAYA } from '../../world/landmarksKirochnaya/groups.js';
import { GROUPS_LIST as G_TAURIDE } from '../../world/landmarksTauride/groups.js';
import { LIBRARY_GROUP } from '../../world/landmarksD/groups.js';
import { GROUPS_LIST as G_OKTYABRSKY, KAPODISTRIAS_GROUP } from '../../world/landmarksOktyabrsky/groups.js';
import { GROUPS_LIST as G_BELINSKY_NORTH } from '../../world/landmarksBelinskyNorth/groups.js';

/** Area id: <html data-area> must equal it (main.js refuses to run a page whose area module is another one) and the registry (src/areas/registry.js) lists it. */
export const ID = 'north';
/** Where the baked products of this area live (relative to assets/). */
export const BAKE_DIR = 'baked/north/';
/** The North is reached by a hand-off: a missing or stale bake is an error card, never a minutes-long procedural build. */
export const REQUIRE_BAKE = true;

/** The modules of this page, in build order (a module reads the services of the earlier ones). rail and metro are NOT built in the North (docs/AREAS.md section 4: no railway in the data, Chernyshevskaya
 *  stays a closed generic terminus; the door gate G3 of M7 replaces the ride). tools/modules-list.mjs parses this list from the file: keep one quoted name per line. */
export const MODULES = [
  'environment',  // ground, embankment granite, Fontanka / Neva water, trees, lawns, flowerbeds, far skyline
  'landmarksNorthFull', // the Chernyshevskaya vestibule, the Transfiguration Cathedral, Dom Muruzi, the Podpisnye Izdaniya bookstore and the corridor houses (14 addresses, 13 in the North data)
  'landmarksSmolny', // Smolny Cathedral and the convent / Institute (docs/research/north-smolny.md)
  'landmarksSuvorov', // the Suvorov Memorial Museum on Kirochnaya (7 OSM footprints, mosaics, tower)
  'landmarksKirochnaya', // the Elena Pavlovna Clinical Institute, Kirochnaya 41: 20 OSM footprints, garden campus (lawn, service lanes, trees, fence); before streets, it claims 14 service ways
  'landmarksTauride', // the Tauride Palace and the Paradny Quarter (T1 of docs/TAURIDE-REMAKE.md; the garden is rewritten by the later phases); before streets / city, it claims 2 sub-groups (12 buildings, 2 fountain waters) and switches the Paradny hooks on
  'landmarksBelinskyNorth', // the Church of Simeon and Anna (Mokhovaya 48) with its corner chapel: the church part of the source's landmarksBelinsky (M7 C-landmarks); before city, it claims 2 buildings
  'streets',      // roads, markings, kerbs, granite pavements, crossings, road furniture, trolleybus overhead wires
  'city',         // every OSM building that no landmark module claims: Petersburg facade grammar, roofs, courtyards, entrances
  'landmarksD',   // the National Library (Fontanka 36) and the Mariinsky hospital block, the strip's band at (-334, -311): only the 'library' sub-group is claimed here
  'landmarksOktyabrsky', // Bolshoy Concert Hall Oktyabrsky on Ligovsky Prospekt, the strip's band at (797, -347), and (claimed here only: M7 C-landmarks) the Kapodistrias monument at (797, -461) with its apron
  'props',        // benches, bins, kiosks, bus shelters, billboards, flower baskets
  'traffic',      // moving cars, buses, trolleybuses + parked cars
  'people',       // pedestrians, groups, cyclists, scooters
  'wildlife',     // pigeons, gulls, crows, sparrows + ambience triggers
  'drive',        // the four drivable cars near Chernyshevskaya (E to get in) + the driving interface
];
/** Loading-screen words that differ from the strip's (main.js LABELS is the fallback for the rest). */
export const LABELS = {
  landmarksSmolny: 'Смольный собор и институт',
  props: 'скамейки, урны и киоски', traffic: 'машины и троллейбусы', people: 'прохожие', drive: 'машины у метро «Чернышевская»',
  landmarksNorthFull: 'Чернышевская, Спасо-Преображенский собор, дом Мурузи',
  landmarksSuvorov: 'Музей Суворова',
  landmarksKirochnaya: 'Клинический институт на Кирочной',
  landmarksTauride: 'Таврический дворец и Парадный квартал',
  landmarksD: 'Национальная библиотека', landmarksOktyabrsky: 'БКЗ «Октябрьский» и памятник Каподистрии',
  landmarksBelinskyNorth: 'церковь Симеона и Анны',
};

export const NAMES = {
  place: 'Санкт-Петербург', placeEn: 'Saint Petersburg',
  square: 'площадь Восстания', squareEn: 'Vosstaniya Square',
  station: 'Московский вокзал', stationEn: 'Moscow Railway Station',
  streets: {
    // ---- the strip's names (a copy of src/world/area.js NAMES.streets: the 200 m band and the engine's lookups read them)
    nevsky: 'Невский проспект', ligovsky: 'Лиговский проспект', mayakovskogo: 'улица Маяковского', marata: 'улица Марата', vladimirsky: 'Владимирский проспект',
    liteyny: 'Литейный проспект', fontanka: 'набережная реки Фонтанки', zhukovskogo: 'улица Жуковского', pushkinskaya: 'Пушкинская улица', vosstaniya: 'улица Восстания',
    goncharnaya: 'Гончарная улица', suvorovsky: 'Суворовский проспект', kuznechny: 'Кузнечный переулок', kolokolnaya: 'Колокольная улица', rubinsteina: 'улица Рубинштейна',
    zagorodny: 'Загородный проспект', razyezzhaya: 'Разъезжая улица', stremyannaya: 'Стремянная улица', bolshayaMoskovskaya: 'Большая Московская улица',
    sadovaya: 'Садовая улица', malayaSadovaya: 'Малая Садовая улица', gorokhovaya: 'Гороховая улица', bolshayaMorskaya: 'Большая Морская улица', malayaMorskaya: 'Малая Морская улица',
    bolshayaKonyushennaya: 'Большая Конюшенная улица', malayaKonyushennaya: 'Малая Конюшенная улица', admiralteysky: 'Адмиралтейский проспект', voznesensky: 'Вознесенский проспект',
    moika: 'набережная реки Мойки', griboedov: 'набережная канала Грибоедова', dvortsovayaNab: 'Дворцовая набережная', admiralteyskayaNab: 'Адмиралтейская набережная',
    angliyskayaNab: 'Английская набережная', universitetskayaNab: 'Университетская набережная', winterCanalNab: 'набережная Зимней канавки', swanCanalNab: 'набережная Лебяжьей канавки',
    millionnaya: 'Миллионная улица', dvortsovyProezd: 'Дворцовый проезд', konnogvardeysky: 'Конногвардейский бульвар', pochtamtskaya: 'Почтамтская улица',
    kazanskaya: 'Казанская улица', inzhenernaya: 'Инженерная улица', italyanskaya: 'Итальянская улица', mikhailovskaya: 'Михайловская улица', bankovsky: 'Банковский переулок',
    tsaritsynsky: 'Царицынский проезд', yakubovicha: 'улица Якубовича', galernaya: 'Галерная улица',
    dvortsovayaSq: 'Дворцовая площадь', isaakievskayaSq: 'Исаакиевская площадь', senatskayaSq: 'Сенатская площадь', ostrovskogoSq: 'площадь Островского', konyushennayaSq: 'Конюшенная площадь',
    iskusstvSq: 'площадь Искусств', birzhevayaSq: 'Биржевая площадь', kazanskayaSq: 'Казанская площадь',
    // ---- the North (names exactly as in OSM, ROADS[].name of src/areas/north/data; the main roads of the facade by length inside the play rectangles, m: Shpalernaya 4948, Liteyny 3622, Kirochnaya 3341,
    //      Voskresenskaya embankment 2272, Furshtatskaya 2135, Vosstaniya 1998, Nekrasova 1906, Zhukovskogo 1817, Zakharyevskaya 1663, Potemkinskaya 1436, Chaikovskogo 1381, Tavricheskaya 1345, Chernyshevskogo 1306 ...)
    shpalernaya: 'Шпалерная улица', kirochnaya: 'Кирочная улица', voskresenskayaNab: 'Воскресенская набережная', furshtatskaya: 'Фурштатская улица', nekrasova: 'улица Некрасова',
    zakharyevskaya: 'Захарьевская улица', potemkinskaya: 'Потёмкинская улица', chaikovskogo: 'улица Чайковского', tavricheskaya: 'Таврическая улица', chernyshevskogo: 'проспект Чернышевского',
    tverskaya: 'Тверская улица', lafonskaya: 'Лафонская улица', mokhovaya: 'Моховая улица', baskov: 'Басков переулок', radishcheva: 'улица Радищева', kavalergardskaya: 'Кавалергардская улица',
    kutuzovaNab: 'набережная Кутузова', smolnogo: 'улица Смольного', smolnyProspekt: 'Смольный проспект', ryleeva: 'улица Рылеева', paradnaya: 'Парадная улица', pestelya: 'улица Пестеля',
    korolenko: 'улица Короленко', chekhova: 'улица Чехова', tavricheskyPereulok: 'Таврический переулок', preobrazhenskayaSq: 'Преображенская площадь', proletarskoyDiktatury: 'площадь Пролетарской Диктатуры',
  },
};

// ---------------------------------------------------------------- the local frames: the anchors are the strip's (see the header: the band stays identical on both pages)
/** Vosstaniya Square (589, 173): the origin of the street grid (toGrid / fromGrid) and the centre of the far scenery; 1.2 km south of the North's south edge. */
export const SQUARE = { x: 589, z: 173, name: NAMES.square, nameEn: NAMES.squareEn };
export const OBELISK = { x: 592.2, z: 164.9, h: 36 };
export const STATION = { x: 612, z: 300, facadeBearing: 348, trackBearing: 167, tower: { x: 602.1, z: 246.4 } };

// ---------------------------------------------------------------- landmark groups
/** The landmark claims of the North (M5, docs/AREAS.md section 8): module name -> sub-groups { key, name, nameEn, ids, osm, at }. `city` / `environment` / `streets` skip what a group claims (src/world/lib/claims.js).
 *  T1 of the Tauride remake added landmarksTauride: the Palace and the Paradny quarter; T2 added its third sub-group, the garden (the park, 23 woods, the 120 ways, 132 benches, 167 bins: the generic North stops drawing them). */
export const GROUPS = {};
GROUPS.landmarksNorthFull = G_NORTHFULL;
GROUPS.landmarksSmolny = G_SMOLNY;
GROUPS.landmarksSuvorov = G_SUVOROV;
GROUPS.landmarksKirochnaya = G_KIROCHNAYA;
GROUPS.landmarksTauride = G_TAURIDE;      // T1: the Tauride Palace r3801092 and the Paradny quarter (11 buildings + the two fountain waters); T2: the garden (osm ids only: park, woods, ways, benches, bins)
GROUPS.landmarksD = [LIBRARY_GROUP];      // the strip's landmarksD claims four sub-groups; only the National Library / Mariinsky block lies in the band (landmarksD/groups.js)
GROUPS.landmarksOktyabrsky = [...G_OKTYABRSKY, KAPODISTRIAS_GROUP];      // the concert hall w30324279 (797, -347), shared with the strip, + the Kapodistrias monument n1372027612 (797, -461): 56 m beyond the strip's play edge, claimed by the North only (M7 C-landmarks; the module builds its monument part and the apron only where this key is claimed)
GROUPS.landmarksBelinskyNorth = G_BELINSKY_NORTH;      // the Church of Simeon and Anna w96148838 + the chapel w96148878 (-304, -688): the church part of the source's landmarksBelinsky (M7 C-landmarks)

/**
 * The HUD location table (first match wins), built with the layout helpers `h` ({ NAMES, SUBGROUPS, _sqPolys, _groupPolys, _named, _areaPolys, _shoreOf, _deck, inRiver, shoreDist }).
 * shapes: { poly: [x,z,...], margin? (m around the polygon) } | { c: [x,z], r } | { x0, x1, z0, z1 } | { road: 'Невский проспект' } (nearest road of that name within 22 m)
 */
export function makeAreas(h) {
  const { SUBGROUPS, _groupPolys, _shoreOf, inRiver, shoreDist } = h;
  const S = NAMES.streets;
  return [
  // ---- the sights of the North (centres and radii from the source layout, docs/research/north-*.md) ----------------------------------------------------------------------------------------------------
  { name: 'Смольный собор · Smolny Cathedral', c: [2469, -1833], r: 140 },
  { name: 'Смольный институт · Smolny Institute', c: [2518, -1544], r: 115 },
  { name: 'Таврический дворец · Tauride Palace', c: [1379, -1734], r: 95 },
  { name: 'Таврический сад · Tauride Garden', x0: 910, x1: 1500, z0: -1785, z1: -1250 },
  { name: 'Парадный квартал · Paradny Quarter', x0: 790, x1: 1120, z0: -1170, z1: -820 },
  { name: 'Музей А. В. Суворова · Suvorov Museum', c: [1413, -1206], r: 45 },
  { name: 'Клинический институт Елены Павловны · Elena Pavlovna Clinical Institute', x0: 1110, x1: 1343, z0: -1245, z1: -1047 },
  { name: 'Дом Мурузи · Dom Muruzi', c: [-95, -1125], r: 36 },
  { name: 'Спасо-Преображенский собор · Transfiguration Cathedral', c: [66, -1182], r: 75 },
  { name: 'Чернышевская · Chernyshevskaya', c: [467, -1351], r: 55 },
  // ---- the strip's own sights inside the 200 m band (z -405 .. -205) -----------------------------------------------------------------------------------------------------------------------------
  { name: 'Подписные Издания · Bookshop', c: [-201, -222], r: 40 },
  { name: 'БКЗ «Октябрьский» · Oktyabrsky Concert Hall', c: [797, -347], r: 55 },
  ..._groupPolys(SUBGROUPS.library, 6).map((r) => ({ name: 'Российская национальная библиотека · National Library', ...r })),      // the footprints of the claimed library + Mariinsky block, as in the strip (the old circle missed the hospital block 230 m east of it)
  // ---- the waterways: the Neva along the north edge (the play edge is partly in the water), the Fontanka along the west edge and through the band
  { name: 'Нева · Neva River', x0: -600, x1: 3100, z0: -2800, z1: -1750, test: (x, z) => _shoreOf(['neva'], x, z) < 8 || inRiver(x, z) },
  { name: 'Фонтанка · Fontanka River', x0: -900, x1: -330, z0: -2000, z1: -85, test: (x, z) => shoreDist(x, z) < 14 },
  // ---- the streets (names exactly as in OSM) ---------------------------------------------------------------------------------------------------------------------------------------------------------
  { name: 'Литейный проспект · Liteyny Prospekt', road: S.liteyny },
  { name: 'Шпалерная улица · Shpalernaya ulitsa', road: S.shpalernaya },
  { name: 'Кирочная улица · Kirochnaya ulitsa', road: S.kirochnaya },
  { name: 'Воскресенская набережная · Voskresenskaya embankment', road: S.voskresenskayaNab },
  { name: 'Фурштатская улица · Furshtatskaya ulitsa', road: S.furshtatskaya },
  { name: 'Суворовский проспект · Suvorovsky Prospekt', road: S.suvorovsky },
  { name: 'Улица Восстания · Ulitsa Vosstaniya', road: S.vosstaniya },
  { name: 'Улица Некрасова · Ulitsa Nekrasova', road: S.nekrasova },
  { name: 'Улица Жуковского · Ulitsa Zhukovskogo', road: S.zhukovskogo },
  { name: 'Захарьевская улица · Zakharyevskaya ulitsa', road: S.zakharyevskaya },
  { name: 'Потёмкинская улица · Potemkinskaya ulitsa', road: S.potemkinskaya },
  { name: 'Улица Чайковского · Ulitsa Chaikovskogo', road: S.chaikovskogo },
  { name: 'Таврическая улица · Tavricheskaya ulitsa', road: S.tavricheskaya },
  { name: 'Проспект Чернышевского · Prospekt Chernyshevskogo', road: S.chernyshevskogo },
  { name: 'Тверская улица · Tverskaya ulitsa', road: S.tverskaya },
  { name: 'Улица Маяковского · Ulitsa Mayakovskogo', road: S.mayakovskogo },
  { name: 'Лафонская улица · Lafonskaya ulitsa', road: S.lafonskaya },
  { name: 'Моховая улица · Mokhovaya ulitsa', road: S.mokhovaya },
  { name: 'Басков переулок · Baskov pereulok', road: S.baskov },
  { name: 'Улица Радищева · Ulitsa Radishcheva', road: S.radishcheva },
  { name: 'Лиговский проспект · Ligovsky Prospekt', road: S.ligovsky },
  { name: 'Кавалергардская улица · Kavalergardskaya ulitsa', road: S.kavalergardskaya },
  { name: 'Набережная Кутузова · Kutuzov embankment', road: S.kutuzovaNab },
  { name: 'Площадь Пролетарской Диктатуры · Proletarskoy Diktatury Square', road: S.proletarskoyDiktatury },
  { name: 'Улица Смольного · Ulitsa Smolnogo', road: S.smolnogo },
  { name: 'Смольный проспект · Smolny Prospekt', road: S.smolnyProspekt },
  { name: 'Улица Рылеева · Ulitsa Ryleeva', road: S.ryleeva },
  { name: 'Таврический переулок · Tavrichesky pereulok', road: S.tavricheskyPereulok },
  { name: 'Преображенская площадь · Preobrazhenskaya Square', road: S.preobrazhenskayaSq },
  { name: 'Парадная улица · Paradnaya ulitsa', road: S.paradnaya },
  { name: 'Улица Пестеля · Ulitsa Pestelya', road: S.pestelya },
  { name: 'Улица Чехова · Ulitsa Chekhova', road: S.chekhova },
  { name: 'Набережная реки Фонтанки · Fontanka embankment', road: S.fontanka },
  { name: 'Санкт-Петербург · Saint Petersburg', x0: -9999, x1: 9999, z0: -9999, z1: 9999 },
  ];
}

/** HERO (the start pose) and VIEWS (keys 1..0 and the Places list), built with the layout helper yawToward. */
export function makeViews({ yawToward }) {
  // Every pose is a free, walkable spot (tools/layout-test.mjs checks insideBuilding / isOnRoad / line of sight; tools/views-check.mjs adds the colliders: node tools/area.mjs north tools/views-check.mjs).
  // x, z, yaw (deg, 0 = north, 90 = west), pitch (deg). The North from the south-west to the north-east: 1 Chernyshevskaya (the start), 2 the Transfiguration Cathedral, 3 Dom Muruzi, 4 the Paradny Quarter,
  // 5 the Tauride Garden, 6 the Tauride Palace, 7 / 8 Smolny, 9 the Suvorov Museum, 0 Kirochnaya Street; the Places list only: the Oktyabrsky hall in the strip band.
  const HERO = { x: 444, z: -1351, yaw: -90, pitch: 10 };      // Chernyshevskaya: the vestibule of the metro station, looking east
  const VIEWS = [
    { key: 'Digit1', label: 'Чернышевская', x: 444, z: -1351, yaw: -90, pitch: 10 },
    { key: 'Digit2', label: 'Спасо-Преображенский собор', x: 22, z: -1186, yaw: -95, pitch: 18 },
    { key: 'Digit3', label: 'Дом Мурузи', x: -167, z: -1157, yaw: -107, pitch: 20 },       // T1: was (-165, -1170) yaw -137, where a pedestrian-signal pole 1.3 m away covered the right third of the picture (M5 GPU QA)
    { key: 'Digit4', label: 'Парадный квартал', x: 900, z: -852, yaw: 0, pitch: 16 },       // T1: was ON the podium (915, -1010): the height patch makes it 3.3 m, views-check allows -0.5 .. 1.5; now street level on the south side, looking up the central axis between the two south blocks
    { key: 'Digit5', label: 'Таврический сад', x: 1368, z: -1471, yaw: -4, pitch: 2 },       // T1: was (1390, -1457) on the deck of bridge w81524417; now on w1458068089 at the north end of the memorial island, 8 m from the water (docs/TAURIDE-REMAKE.md section 8)
    { key: 'Digit6', label: 'Таврический дворец', x: 1379, z: -1800, yaw: 180, pitch: 8 },       // T1: was (1379, -1600) in the lake; now in the palace front court, 48 m from the portico (docs/TAURIDE-REMAKE.md section 8)
    { key: 'Digit7', label: 'Смольный собор', x: 2335, z: -1833, yaw: -90, pitch: 21 },
    { key: 'Digit8', label: 'Смольный институт', x: 2461, z: -1471, yaw: yawToward(2461, -1471, 2518, -1544), pitch: 8 },
    { key: 'Digit9', label: 'Музей Суворова · Суворовский проспект', x: 1395, z: -1180, yaw: yawToward(1395, -1180, 1413, -1206), pitch: 8 },
    { key: 'Digit0', label: 'Кирочная улица', x: 1224, z: -1266, yaw: -173, pitch: 10 },       // T1: was (1225, -1243) yaw 180, 5 m from the facade of w232918735 (a wall close-up, M5 GPU QA); now across the street, 28 m from it, looking at the house church
    // the Places list only
    { key: 'Place.oktyabrsky', label: 'БКЗ «Октябрьский» · Лиговский проспект', x: 737.5, z: -344.3, yaw: -50.4, pitch: 8 },
  ];
  return { HERO, VIEWS };
}

/** The expectations of the CPU tests (tools/layout-test.mjs, tools/areas-test.mjs; shape: tools/lib/area-test-data.mjs). */
export const TEST = {
  claimed: [
    { id: 'w22999175', by: 'landmarksNorthFull', group: 'north-chernyshevskaya' },      // the Chernyshevskaya vestibule
    { id: 'r5802451', by: 'landmarksNorthFull', group: 'north-preobrazhensky' },        // the Transfiguration Cathedral
    { id: 'r946930', by: 'landmarksNorthFull', group: 'north-muruzi' },                 // Dom Muruzi
    { id: 'w96123542', by: 'landmarksNorthFull', group: 'north-podpisnye' },            // the Podpisnye Izdaniya bookstore (strip band)
    { id: 'w60354379', by: 'landmarksNorthFull', group: 'north-corridor-houses' },      // Mayakovskogo 14, Vosstaniya 17 and 19: corridor houses of the strip band (the strip's landmarksNorth builds them too)
    { id: 'w96364627', by: 'landmarksNorthFull', group: 'north-corridor-houses' },
    { id: 'r1394323', by: 'landmarksNorthFull', group: 'north-corridor-houses' },
    { id: 'r2864743', by: 'landmarksSmolny', group: 'north-smolny-cathedral' },
    { id: 'r2133719', by: 'landmarksSmolny', group: 'north-smolny-ensemble' },
    { id: 'w30198549', by: 'landmarksSuvorov', group: 'north-suvorov-museum' },          // the Suvorov Museum (the museum record)
    { id: 'w232918746', by: 'landmarksSuvorov', group: 'north-suvorov-museum' },         // the Suvorov Museum (the main block, Digit9 looks at it)
    { id: 'r3127704', by: 'landmarksKirochnaya', group: 'kirochnaya-clinical-institute' },
    { id: 'w30324355', by: 'landmarksKirochnaya', group: 'kirochnaya-clinical-institute' },
    { id: 'r3801087', by: 'landmarksD', group: 'library' }, { id: 'w30324279', by: 'landmarksOktyabrsky', group: 'oktyabrsky-hall' },
    { id: 'n1372027612', by: 'landmarksOktyabrsky', group: 'kapodistrias' },      // M7 C-landmarks: the Kapodistrias monument (claimed by the North only)
    { id: 'w96148838', by: 'landmarksBelinskyNorth', group: 'simeon-anna' }, { id: 'w96148878', by: 'landmarksBelinskyNorth', group: 'simeon-anna' },      // M7 C-landmarks: the Church of Simeon and Anna and its chapel
    { id: 'r3801092', by: 'landmarksTauride', group: 'tauride-palace' },                  // T1: the Tauride Palace
    { id: 'w102153008', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'w102153013', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'w145419644', by: 'landmarksTauride', group: 'paradny-quarter' },
    { id: 'r1452259', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'r1967088', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'r3304715', by: 'landmarksTauride', group: 'paradny-quarter' },
    { id: 'r3304716', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'w102153007', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'w134638076', by: 'landmarksTauride', group: 'paradny-quarter' },
    { id: 'w134638078', by: 'landmarksTauride', group: 'paradny-quarter' }, { id: 'w134638079', by: 'landmarksTauride', group: 'paradny-quarter' },      // the 11 buildings of the Paradny quarter
    { id: 'r1582734', by: 'landmarksTauride', group: 'tauride-garden' }, { id: 'w1458068121', by: 'landmarksTauride', group: 'tauride-garden' }, { id: 'w425188838', by: 'landmarksTauride', group: 'tauride-garden' },
    { id: 'w112880645', by: 'landmarksTauride', group: 'tauride-garden' }, { id: 'n4244934439', by: 'landmarksTauride', group: 'tauride-garden' }, { id: 'n4302305839', by: 'landmarksTauride', group: 'tauride-garden' },      // T2: the park, a wood, a way, the dam way, a bench and a bin of the garden
  ],      // M5: one row per landmark module and sub-group (the vestibule, the cathedrals, Dom Muruzi, the bookstore, the band houses, the Suvorov Museum, the clinical institute, the library, the Oktyabrsky hall)
  viewKeys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Place.oktyabrsky'],
  mustHaveAreas: [
    { x: 467, z: -1351, has: 'чернышевская' }, { x: 66, z: -1182, has: 'преображенский' }, { x: 2469, z: -1833, has: 'смольный собор' },
    { x: 1379, z: -1734, has: 'таврический дворец' }, { x: 1000, z: -1000, has: 'парадный' }, { x: -201, z: -222, has: 'подписные' },
  ],
  // `kept` is left out on purpose: the default is every key of GROUPS, so tools/landmarks-groups-check.mjs verifies all six landmark modules against the North data (an empty list would verify none)
  roadsNear: { at: [461, -1350], r: 75, min: 3 },
};

// ============================================================================================================================================
//  ENGINE TABLES (docs/AREAS.md section 3.1): what the strip's engine modules used to hard-code. Same names as src/world/area.js; the modules read them through src/world/lib/area-tables.js.
// ============================================================================================================================================

// ---------------------------------------------------------------- WATER (environment/waterways.js)
/**
 * The North has no bridge crossings of its quay in the play area (the Belinsky Bridge deck ends 3 m west of the west edge, the Liteyny and Bolsheokhtinsky decks are cut off by the extent), so no plugs,
 * bridge zones, shades or clip lines. The Neva runs beyond the north edge ('neva-up' = the river upstream of the Palace Bridge, the scenery ring the data does not reach).
 * The far window is centred on the middle of the North's extent.
 */
export const WATER = {
  plugs: [],
  bridgeZones: [],
  bridgeShades: [],
  clipLines: [],
  farSources: ['neva-up'],
  farCenter: [1100, -1100],
  farRadius: 6000,
};

// ---------------------------------------------------------------- ZONES
const PIGEON_ZONES = [
  { tag: 'chernyshevskaya', kind: 'pigeon', x: 461, z: -1350, spread: 22, n: 2, w: 2.0, r: 4.5, name: 'Голуби у метро «Чернышевская» · Pigeons at Chernyshevskaya metro' },
  { tag: 'tauride-gate', kind: 'pigeon', x: 1226, z: -1268, spread: 24, n: 2, w: 2.2, r: 5, name: 'Голуби у входа в Таврический сад · Pigeons at the Tauride Garden gate' },
  { tag: 'preobrazhenskaya', kind: 'pigeon', x: 68, z: -1182, spread: 20, n: 1, w: 1.4, r: 4.5, name: 'Голуби у Спасо-Преображенского собора · Pigeons at the Transfiguration Cathedral' },
  { tag: 'smolny', kind: 'pigeon', x: 2425, z: -1833, spread: 24, n: 1, w: 1.5, r: 5, name: 'Голуби у Смольного собора · Pigeons at Smolny Cathedral' },
  { tag: 'tauride-gate', kind: 'sparrow', x: 1230, z: -1290, spread: 16, n: 1, w: 1.6, r: 3, name: 'Воробьи у входа в Таврический сад · Sparrows at the Tauride Garden gate' },
  { tag: 'chernyshevskaya', kind: 'sparrow', x: 478, z: -1362, spread: 14, n: 1, w: 1.2, r: 3, name: 'Воробьи у метро «Чернышевская» · Sparrows at Chernyshevskaya metro' },
];
/** the districts a crow likes: the old limes of the Tauride Garden, the Smolny gardens, the Transfiguration square */
const CROW_HAUNTS = [{ x: 1200, z: -1520, r: 220 }, { x: 2425, z: -1833, r: 130 }, { x: 68, z: -1182, r: 90 }];
const CROWDS = { chernyshevskaya: [30, 40, 0.5], 'tauride-gate': [34, 45, 0.55], preobrazhenskaya: [22, 30, 0.45], smolny: [30, 40, 0.5] };
/** the hot spots of the zone weight field: [x, z, amplitude, sigma] (people/zones.js) */
const PEOPLE_HOT = [
  [461, -1350, 2.2, 40],        // Chernyshevskaya metro: the vestibule and the square in front of it
  [1226, -1268, 1.9, 44],       // the Tauride Garden gate
  [2425, -1833, 1.4, 50],       // the Smolny forecourt
  [68, -1182, 1.5, 44],         // the Transfiguration Cathedral (Preobrazhenskaya square)
];

export const ZONES = {
  pigeons: PIGEON_ZONES,
  crowHaunts: CROW_HAUNTS,
  crowds: CROWDS,
  fountains: [],
  // no station zone; the scripted places of the strip's west (Kazan, Palace Square, ... people/west.js) and of the castle (people/mars.js) stand at fixed coordinates of the strip, so the North switches them off
  // + garden: the crowd cap of the Tauride Garden (hooks/people.js inGarden: inside it the density is `factor` x the plan and at most `maxPeople` people are in it; the numbers of the source's DENSITY.tauride).
  //   ACTIVE in the generic North, not gated by MODULES (docs/AREAS.md section 9.1: the one hook of M6 that changes the generic North without a landmark module; measured at the Tauride gate: the park holds 348 on average of the ~640 visible people without it)
  peopleDensity: { west: { scale: 1, platforms: 1, off: true }, mars: { scale: 1, zones: [], off: true }, garden: { factor: 0.22, maxPeople: 60 } },
  peopleCorridor: [],
  peopleHot: PEOPLE_HOT,
  tramLines: [],
  clearDiscs: [],
  farCentres: [{ x: 1100, z: -1100, bias: 900 }],      // the North lies in the old dense city (Liteyny, Smolny, the Petrograd side beyond the Neva): dense stone blocks round the whole area
};

// ---------------------------------------------------------------- GARAGE (drive/cars/index.js PARKING, drive.js SPAWN)
const DEG = Math.PI / 180;
/** The four drivable cars wait on the free ground round Chernyshevskaya (docs/AREAS.md section 5.2: verified free of lanes / buildings by tools/area.mjs north tools/area-garage-check.mjs). */
export const GARAGE = {
  poses: {
    coupe: { x: 470.5, z: -1370.8, yaw: -90 * DEG },
    truck: { x: 469, z: -1367.2, yaw: -90 * DEG },
    lada: { x: 470, z: -1377.8, yaw: -90 * DEG },
    roadster: { x: 468, z: -1381, yaw: -90 * DEG },
  },
  spawn: { x: 470.5, z: -1370.8, yaw: -90 * DEG },
};

// ---------------------------------------------------------------- the rest
/** environment.js: the services whose `entrances` clear the trees from the doors of the buildings they list: the generic `city` and the M5 landmark services that publish an `entrances` array
 *  (landmarksSmolny, landmarksSuvorov, landmarksKirochnaya; landmarksD publishes an array that is empty in the North, as in the strip's list). landmarksNorthFull and landmarksOktyabrsky publish none
 *  (the strip's table does not list them either). */
export const PRUNE_SERVICES = ['city', 'landmarksSmolny', 'landmarksSuvorov', 'landmarksKirochnaya', 'landmarksD'];
// The hook set (milestone M6, docs/AREAS.md section 9): hooks.js builds it from the module list above (a hook that serves a landmark module is dormant until the module is in MODULES).
import { makeHooks, makeHeightPatches } from './hooks.js';
/** the hooks of the engine modules (keep-outs of trees / tufts / props / ways / parking, the garden of the crowd cap, the deck services): src/areas/north/hooks.js documents the contract */
export const HOOKS = makeHooks(MODULES);
/** the height patches of layout.heightAt (the first patch that answers wins): the Paradny podium once 'landmarksTauride' is in MODULES (the Tauride remake), none before; the pond bed of the remake appends after it in hooks.js */
export const HEIGHT_PATCHES = makeHeightPatches(MODULES);
