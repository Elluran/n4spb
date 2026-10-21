// ============================================================================
//  AREA DEFINITION - the Nevsky strip (docs/AREAS.md). Everything in the engine that names WHAT the world is (as opposed to HOW it is built) and that differs between two areas lives
//  in an area module: this file for the strip (index.html), src/areas/<id>/area.js for another area (<id>.html remaps ./src/world/area.js to it with an import map).
//  layout.js re-exports these tables, so the whole engine keeps importing them from layout.js. PURE DATA: no three.js, no import of layout.js (layout.js imports this file);
//  the tables that need layout helpers are factories (makeAreas, makeViews) that layout.js calls with those helpers.
//  The rectangles and the OSM data of the area are NOT here: they come from the data facade (src/world/data/city.js, remapped the same way).
// ============================================================================
import { GROUPS_LIST as G_E } from './landmarksE/groups.js';
import { GROUPS_LIST as G_F } from './landmarksF/groups.js';
import { GROUPS_LIST as G_G } from './landmarksG/groups.js';
import { GROUPS_LIST as G_H } from './landmarksH/groups.js';
import { GROUPS_LIST as G_I } from './landmarksI/groups.js';
import { GROUPS_LIST as G_J } from './landmarksJ/groups.js';
import { GROUPS_LIST as G_K } from './landmarksK/groups.js';
import { GROUPS_LIST as G_BELINSKY } from './landmarksBelinsky/groups.js';
import { GROUPS_LIST as G_BR } from './bridges/groups.js';
import { GROUPS_LIST as G_NORTH } from './landmarksNorth/groups.js';
import { GROUPS_LIST as G_CASTLE } from './landmarksCastle/groups.js';
import { GROUPS_LIST as G_OKTYABRSKY } from './landmarksOktyabrsky/groups.js';

/** Area id: <html data-area> must equal it (main.js refuses to run a page whose area module is another one) and the registry (src/areas/registry.js) lists it. */
export const ID = 'strip';
/** Where the baked products of this area live (relative to assets/): the strip keeps the original path, other areas use assets/baked/<id>/. */
export const BAKE_DIR = 'baked/';
/** True when the page must not fall back to a procedural build when its bake is missing or stale (set by the registry for areas reached by a hand-off). */
export const REQUIRE_BAKE = false;

export const NAMES = {
  place: 'Санкт-Петербург', placeEn: 'Saint Petersburg',
  square: 'площадь Восстания', squareEn: 'Vosstaniya Square',
  station: 'Московский вокзал', stationEn: 'Moscow Railway Station',
  streets: {
    nevsky: 'Невский проспект', ligovsky: 'Лиговский проспект', mayakovskogo: 'улица Маяковского', marata: 'улица Марата', vladimirsky: 'Владимирский проспект',
    liteyny: 'Литейный проспект', fontanka: 'набережная реки Фонтанки', zhukovskogo: 'улица Жуковского', pushkinskaya: 'Пушкинская улица', vosstaniya: 'улица Восстания',
    goncharnaya: 'Гончарная улица', suvorovsky: 'Суворовский проспект', kuznechny: 'Кузнечный переулок', kolokolnaya: 'Колокольная улица', rubinsteina: 'улица Рубинштейна',
    zagorodny: 'Загородный проспект', razyezzhaya: 'Разъезжая улица', stremyannaya: 'Стремянная улица', bolshayaMoskovskaya: 'Большая Московская улица',
    // ---- the western extension (names exactly as in OSM, ROADS[].name)
    sadovaya: 'Садовая улица', malayaSadovaya: 'Малая Садовая улица', gorokhovaya: 'Гороховая улица', bolshayaMorskaya: 'Большая Морская улица', malayaMorskaya: 'Малая Морская улица',
    bolshayaKonyushennaya: 'Большая Конюшенная улица', malayaKonyushennaya: 'Малая Конюшенная улица', admiralteysky: 'Адмиралтейский проспект', voznesensky: 'Вознесенский проспект',
    moika: 'набережная реки Мойки', griboedov: 'набережная канала Грибоедова', dvortsovayaNab: 'Дворцовая набережная', admiralteyskayaNab: 'Адмиралтейская набережная',
    angliyskayaNab: 'Английская набережная', universitetskayaNab: 'Университетская набережная', winterCanalNab: 'набережная Зимней канавки', swanCanalNab: 'набережная Лебяжьей канавки',
    millionnaya: 'Миллионная улица', dvortsovyProezd: 'Дворцовый проезд', konnogvardeysky: 'Конногвардейский бульвар', pochtamtskaya: 'Почтамтская улица',
    kazanskaya: 'Казанская улица', inzhenernaya: 'Инженерная улица', italyanskaya: 'Итальянская улица', mikhailovskaya: 'Михайловская улица', bankovsky: 'Банковский переулок',
    tsaritsynsky: 'Царицынский проезд', yakubovicha: 'улица Якубовича', galernaya: 'Галерная улица',
    // squares
    dvortsovayaSq: 'Дворцовая площадь', isaakievskayaSq: 'Исаакиевская площадь', senatskayaSq: 'Сенатская площадь', ostrovskogoSq: 'площадь Островского', konyushennayaSq: 'Конюшенная площадь',
    iskusstvSq: 'площадь Искусств', birzhevayaSq: 'Биржевая площадь', kazanskayaSq: 'Казанская площадь',
  },
};

// ---------------------------------------------------------------- the local frames: anchors of the strip (Vosstaniya Square, the obelisk, the Moscow station)
/** Vosstaniya Square: the paved square w638352776 (centre 589, 173); the Hero City obelisk (36 m) stands at (592, 165) on an island between the two Nevsky carriageways. */
export const SQUARE = { x: 589, z: 173, name: NAMES.square, nameEn: NAMES.squareEn };
export const OBELISK = { x: 592.2, z: 164.9, h: 36 };
/** Moscow Railway Station: faces NNW (facade normal bearing ~348 deg) onto the square with the obelisk on its axis; the tracks run SSE (bearing ~167 deg). Clock tower base (602, 246). */
export const STATION = { x: 612, z: 300, facadeBearing: 348, trackBearing: 167, tower: { x: 602.1, z: 246.4 } };

// ---------------------------------------------------------------- landmark groups
// The generic `city` module builds every building that no specialist claims. A specialist MODULE (landmarksA / B / C / D / metro) owns a list of named
// SUB-GROUPS. A sub-group claims building ids (`ids`, plus every part whose `parent` is one of them) and non-building OSM ids (`osm`: paving, bridge decks,
// monuments) that the owner draws itself. A claim only takes effect when the owner module says so: it exports `OWNS_GROUPS = true` (every sub-group) or
// `['station', ...]` (only those); until then `city` / `environment` / `streets` still draw the claimed objects as a blockout (see lib/claims.js).
// `ids` come from docs/research/osm-landmarks.md and docs/reference/landmarks.json.
export const GROUPS = {
  // ---- landmarksA: the Moscow Railway Station building + Vosstaniya Square (the first milestone) -------------------------------------
  landmarksA: [
    { key: 'station', name: 'Московский вокзал', nameEn: 'Moscow Railway Station (Thon, 1851)', ids: ['r2404499', 'r2404500', 'r2404501', 'w662697923', 'w662697920', 'w433164092', 'w595741909'], osm: ['n21596808'], at: [612, 300],
      note: 'main building r2404499 (hidden outline, parts r16492034..39), wings r2404500 / r2404501, canopy w662697923, ticket halls; clock tower base r16492039 (docs/research/station.md). Platforms / tracks / canopies over them belong to the `rail` module.' },
    { key: 'square', name: 'площадь Восстания', nameEn: 'Vosstaniya Square (obelisk "Hero City Leningrad")', ids: ['w1214651508', 'w353314781', 'w1215662501'], osm: ['w638352776'], at: [589, 173],
      note: '36 m obelisk w1214651508 on the island between the Nevsky carriageways, tourist bureau pavilion, kiosk, the paved square w638352776' },
    { key: 'galereya', name: 'ТРЦ «Галерея»', nameEn: 'Galereya shopping mall (Ligovsky 30)', ids: ['r8522850'], osm: [], at: [525, 562],
      note: 'big modern mall on Ligovsky pr. 30 south-west of the station, 5 levels, ~33000 m2 (OSM r8522850, parts if any): glazed / clad facades, entrance rotundas, big wordmark, atrium; research it from Commons photos' },
    { key: 'oktyabrskaya', name: 'Гостиница «Октябрьская» и угловые дома площади', nameEn: 'Hotel Oktyabrskaya and the corner buildings of the square', ids: ['r1598177', 'r1588277', 'w507867255'], osm: [], at: [648, -1],
      note: 'Ligovsky 10/118 (6 levels, 7976 m2) at the Nevsky / Ligovsky corner opposite the station, the Ligovsky wing (Best Western) and the Cosmos hotel (Goncharnaya 4)' },
  ],
  // ---- landmarksB: Nevsky Prospekt landmarks between Vosstaniya Square and the Liteyny crossroads ----------------------------------
  landmarksB: [
    { key: 'nevsky-centre', name: 'ТЦ «Невский Центр»', nameEn: 'Nevsky Centre (Nevsky 114-116)', ids: ['r1784115'], osm: [], at: [443, 39], note: 'shopping centre at Ligovsky, 6 levels' },
    { key: 'atrium', name: 'Невский Атриум · вход в метро «Маяковская»', nameEn: 'Nevsky Atrium (house 71, Mayakovskaya entrance)', ids: ['r15081493'], osm: [], at: [194, 122], note: 'Marata 1/71; the metro entrances n4060185664 / n1109163128 lie inside it: the arched openings at Nevsky 71 (docs/research/nevsky.md)' },
    { key: 'yusupova', name: 'Дом Юсуповой · Дом Меняевых', nameEn: 'Yusupova house (Nevsky 84-86), Menyaev house (90-92)', ids: ['w60196034', 'w98396422', 'w60195756', 'w103591279'], osm: [], at: [0, -30], note: 'yellow Ionic portico house 84-86; Bruni house 90-92 (1866-67)' },
    { key: 'nevsky-corner', name: 'Угловые дома Невского', nameEn: 'Other Nevsky landmark corners (Dom Kozhevnikova, Mayakovskogo, Vladimirsky crossroads)', ids: ['r3323319', 'w113458823', 'r936116', 'w60195636', 'w60195635', 'w60195639', 'w245953204', 'r442684', 'w52016434'], osm: [], at: [-130, 39], note: 'see docs/research/nevsky.md block table for more candidates the specialist may add' },
  ],
  // ---- landmarksC: the Fontanka embankment, Anichkov Bridge, the palaces at the west edge ----------------------------------------------
  landmarksC: [
    { key: 'anichkov-bridge', name: 'Аничков мост', nameEn: 'Anichkov Bridge + Klodt horse tamers', ids: [], osm: ['r5537267', 'w372394912', 'w372394928'], at: [-441, -93], note: 'three-arch pink-granite bridge 54.6 x 37.9 m, four bronze groups on the corners (docs/research/fontanka.md)' },
    { key: 'beloselsky', name: 'Дворец Белосельских-Белозерских', nameEn: 'Beloselsky-Belozersky Palace', ids: ['r1588865'], osm: [], at: [-374, -30], note: 'Nevsky 41, coral-pink neo-baroque at the south-east corner of the bridge' },
    { key: 'fontanka-bank', name: 'Набережная Фонтанки', nameEn: 'Fontanka embankment buildings', ids: ['w28962563', 'w47457765'], osm: [], at: [-540, 60], note: 'Fontanka 33 (SDYUSSHOR-1) and Fontanka 50 (Grebyonka); the granite walls themselves are drawn by environment' },
  ],
  // ---- landmarksD: sights in the north and the south of the map -----------------------------------------------------------------------
  landmarksD: [
    { key: 'library', name: 'Российская национальная библиотека · Мариинская больница', nameEn: 'National Library (Fontanka 36) and the Mariinsky hospital block', ids: ['r3801087', 'w60353337'], osm: [], at: [-334, -311], note: 'north-west corner of the map (the "Главный корпус" block of the screenshot)' },
    { key: 'vladimirsky', name: 'Владимирский собор и колокольня', nameEn: 'Vladimirsky Cathedral and bell tower', ids: ['w38611014', 'w38611013'], osm: [], at: [-160, 440], note: 'Vladimirsky pr. 20: ~40 m domes, ~60 m bell tower (OSM heights are the base only)' },
    { key: 'tolstoy', name: 'Толстовский дом · дом Рубинштейна', nameEn: 'Tolstoy House (Rubinshteyna 15-17) and Rubinshteyna 13', ids: ['r1588827', 'r368263'], osm: [], at: [-480, 330], note: 'corner tower; Zagorodny / Rubinshteyna corner' },
    { key: 'dostoevsky', name: 'Достоевская · Владимирская (улицы метро)', nameEn: 'Vladimirskaya square surroundings (Dostoevsky statue, Passage, Renaissance Hall)', ids: ['w70216607', 'w38578114'], osm: [], at: [-250, 470], note: 'Vladimirsky pr. 19 and 23' },
  ],
  // ---- metro: surface vestibules that are separate buildings (the rest of the metro is underground) --------------------------------------
  metro: [
    { key: 'vosstaniya-rotunda', name: 'Вестибюль метро «Площадь Восстания»', nameEn: 'Ploshchad Vosstaniya vestibule (1955 rotunda with a spire)', ids: ['w28962850'], osm: [], at: [516, 92], note: 'round colonnaded pavilion on the north side of the square (w310869151 is its roof part); the exit n318455870, entrance n318455877' },
  ],
};
// the specialist modules of the strip: each one owns the pure-data groups.js of its module
GROUPS.landmarksBelinsky = G_BELINSKY;
GROUPS.landmarksE = G_E; GROUPS.landmarksF = G_F; GROUPS.landmarksG = G_G; GROUPS.landmarksH = G_H; GROUPS.landmarksI = G_I; GROUPS.landmarksJ = G_J; GROUPS.landmarksK = G_K; GROUPS.bridges = G_BR;
// the north corridor of Nevsky (Podpisnye Izdaniya, the Mayakovskogo / Vosstaniya houses), Mikhailovsky Castle, Bolshoy Concert Hall Oktyabrsky
GROUPS.landmarksNorth = G_NORTH; GROUPS.landmarksCastle = G_CASTLE; GROUPS.landmarksOktyabrsky = G_OKTYABRSKY;

/**
 * The HUD location table (first match wins), built with the layout helpers `h` ({ NAMES, SUBGROUPS, _sqPolys, _groupPolys, _named, _areaPolys, _shoreOf, _deck, inRiver, shoreDist }).
 * shapes: { poly: [x,z,...], margin? (m around the polygon) } | { c: [x,z], r } | { x0, x1, z0, z1 } | { road: 'Невский проспект' } (nearest road of that name within 22 m)
 */
export function makeAreas(h) {
  const { SUBGROUPS, _sqPolys, _groupPolys, _named, _areaPolys, _shoreOf, _deck, inRiver, shoreDist } = h;
  return [
  _deck('Дворцовый мост · Palace Bridge', [-2344.2, -871.2], [-2495.5, -1075.8], 32),
  { name: 'Михайловский замок · Mikhailovsky (Engineers) Castle', c: [-735, -790], r: 130 },
  { name: 'Подписные Издания · Bookshop', c: [-201,-222], r: 40 },
  { name: 'Аничков мост · Anichkov Bridge', c: [-441, -93], r: 42 },
  { name: 'Обелиск «Городу-герою Ленинграду» · Hero City obelisk', c: [592, 165], r: 24 },
  ..._groupPolys(SUBGROUPS.station, 12).map((r) => ({ name: 'Московский вокзал · Moscow Railway Station', ...r })),
  { name: 'Платформы Московского вокзала · Station platforms', x0: 560, x1: 780, z0: 420, z1: 1100 },
  ..._sqPolys.map((o) => ({ name: 'Площадь Восстания · Vosstaniya Square', poly: o })),
  ..._groupPolys(SUBGROUPS.oktyabrskaya, 8).map((r) => ({ name: 'Гостиница «Октябрьская» · Hotel Oktyabrskaya', ...r })),
  ..._groupPolys(SUBGROUPS['nevsky-centre'], 6).map((r) => ({ name: 'Невский Центр · Nevsky Centre', ...r })),
  ..._groupPolys(SUBGROUPS.beloselsky, 8).map((r) => ({ name: 'Дворец Белосельских-Белозерских · Beloselsky-Belozersky Palace', ...r })),
  ..._groupPolys(SUBGROUPS.anichkov, 10).map((r) => ({ name: 'Аничков дворец · Anichkov Palace', ...r })),
  ..._groupPolys(SUBGROUPS.vladimirsky, 10).map((r) => ({ name: 'Владимирский собор · Vladimirsky Cathedral', ...r })),
  ..._groupPolys(SUBGROUPS.library, 6).map((r) => ({ name: 'Российская национальная библиотека · National Library', ...r })),
  // ---- the west of the strip: sights (outline of the named OSM building + margin; the circle is the fallback when OSM has no such outline), squares, waterways, streets.
  // The areas find the buildings by their OSM names.
  ..._named(/Казанский собор/i, 14, { c: [-1568, -186], r: 90 }).map((r) => ({ name: 'Казанский собор · Kazan Cathedral', ...r })),
  ..._named(/Дом Зингера|Дом книги/i, 8, { c: [-1420, -383], r: 32 }).map((r) => ({ name: 'Дом Зингера · Singer House', ...r })),
  ..._named(/Гостиный двор/i, 8, null).map((r) => ({ name: 'Гостиный Двор · Gostiny Dvor', ...r })),
  ..._named(/Александринск/i, 8, null).map((r) => ({ name: 'Александринский театр · Alexandrinsky Theatre', ...r })),
  ..._named(/Строгановск/i, 8, null).map((r) => ({ name: 'Строгановский дворец · Stroganov Palace', ...r })),
  ..._named(/Спас на Крови|Воскресения Христова/i, 12, { c: [-1265, -854], r: 60 }).map((r) => ({ name: 'Спас на Крови · Church of the Saviour on Blood', ...r })),
  ..._named(/Михайловский замок|Инженерный замок/i, 10, null).map((r) => ({ name: 'Михайловский замок · Mikhailovsky (Engineers) Castle', ...r })),
  ..._named(/(?<![\p{L}-])Михайловский дворец|Русский музей/iu, 10, null).map((r) => ({ name: 'Михайловский дворец · Mikhailovsky Palace (Russian Museum)', ...r })),
  { name: 'Михайловский сад · Mikhailovsky Garden', c: [-1020, -830], r: 130 },       // after the Saviour church, the castle and the museum above (those outlines win where they overlap)
  ..._named(/Адмиралтейство|Главное адмиралтейство/i, 12, { c: [-2433, -622], r: 150 }).map((r) => ({ name: 'Адмиралтейство · Admiralty', ...r })),
  { name: 'Александровский сад · Alexander Garden', c: [-2400, -490], r: 105 },       // the view Shift + 7 stands in the garden (the Admiralty circle above is only the fallback when OSM has no outline, so the garden comes second)
  ..._named(/Зимний дворец/i, 10, { c: [-2096, -896], r: 110 }).map((r) => ({ name: 'Зимний дворец · Winter Palace', ...r })),
  ..._named(/Эрмитажный театр/i, 8, { c: [-1862, -1138], r: 50 }).map((r) => ({ name: 'Эрмитажный театр · Hermitage Theatre', ...r })),
  ..._named(/Эрмитаж/i, 8, null).map((r) => ({ name: 'Эрмитаж · The Hermitage', ...r })),
  ..._named(/Главный штаб|Здание Главного штаба/i, 10, null).map((r) => ({ name: 'Здание Главного штаба · General Staff Building', ...r })),
  ..._named(/Штаб Гвардейского корпуса/i, 10, null).map((r) => ({ name: 'Штаб Гвардейского корпуса · Guards Corps Headquarters', ...r })),
  { name: 'Александровская колонна · Alexander Column', c: [-1983, -738], r: 30 },
  ..._named(/Исаакиевский собор/i, 14, { c: [-2523, -185], r: 110 }).map((r) => ({ name: 'Исаакиевский собор · St Isaac\'s Cathedral', ...r })),
  ..._named(/Мариинский дворец/i, 10, null).map((r) => ({ name: 'Мариинский дворец · Mariinsky Palace', ...r })),
  ..._named(/Сенат(?!ор)|Синод/i, 10, { c: [-2815, -350], r: 60 }).map((r) => ({ name: 'Сенат и Синод · Senate and Synod', ...r })),
  { name: 'Медный всадник · Bronze Horseman', c: [-2744, -443], r: 40 },
  ..._areaPolys(/Дворцовая площадь/).map((o) => ({ name: 'Дворцовая площадь · Palace Square', poly: o, margin: 6 })),
  ..._areaPolys(/Исаакиевская площадь/).map((o) => ({ name: 'Исаакиевская площадь · St Isaac\'s Square', poly: o, margin: 6 })),
  ..._areaPolys(/Сенатская площадь|площадь Декабристов/).map((o) => ({ name: 'Сенатская площадь · Senate Square', poly: o, margin: 6 })),
  ..._areaPolys(/Казанская площадь/).map((o) => ({ name: 'Казанская площадь · Kazan Square', poly: o, margin: 6 })),
  ..._areaPolys(/площадь Островского/).map((o) => ({ name: 'Площадь Островского · Ostrovsky Square', poly: o, margin: 6 })),
  { name: 'Дворцовая площадь · Palace Square', c: [-2000, -740], r: 120 },
  { name: 'Исаакиевская площадь · St Isaac\'s Square', c: [-2470, -90], r: 120 },
  { name: 'Сенатская площадь · Senate Square', c: [-2730, -400], r: 90 },
  { name: 'Казанская площадь · Kazan Square', c: [-1568, -250], r: 90 },
  { name: 'Нева · Neva River', x0: -3020, x1: -1630, z0: -1420, z1: -300, test: (x, z) => _shoreOf(['neva'], x, z) < 6 || inRiver(x, z) },
  { name: 'Зимняя канавка · Winter Canal', x0: -1950, x1: -1700, z0: -1180, z1: -880, test: (x, z) => _shoreOf(['winter-canal'], x, z) < 14 },
  { name: 'Мойка · Moika River', x0: -3020, x1: -720, z0: -1180, z1: 340, test: (x, z) => _shoreOf(['moika'], x, z) < 16 },
  { name: 'Канал Грибоедова · Griboedov Canal', x0: -1880, x1: -1180, z0: -1180, z1: 340, test: (x, z) => _shoreOf(['griboedov'], x, z) < 14 },
  { name: 'Лебяжья канавка · Swan Canal', x0: -1100, x1: -420, z0: -1300, z1: -900, test: (x, z) => _shoreOf(['swan-canal'], x, z) < 12 },
  { name: 'Фонтанка · Fontanka River', x0: -720, x1: -330, z0: -1180, z1: 330, test: (x, z) => shoreDist(x, z) < 14 },
  { name: 'Невский проспект · Nevsky Prospekt', road: NAMES.streets.nevsky },
  { name: 'Лиговский проспект · Ligovsky Prospekt', road: NAMES.streets.ligovsky },
  { name: 'Улица Маяковского · Ulitsa Mayakovskogo', road: NAMES.streets.mayakovskogo },
  { name: 'Улица Марата · Ulitsa Marata', road: NAMES.streets.marata },
  { name: 'Владимирский проспект · Vladimirsky Prospekt', road: NAMES.streets.vladimirsky },
  { name: 'Литейный проспект · Liteyny Prospekt', road: NAMES.streets.liteyny },
  { name: 'Набережная реки Фонтанки · Fontanka embankment', road: NAMES.streets.fontanka },
  { name: 'Улица Жуковского · Ulitsa Zhukovskogo', road: NAMES.streets.zhukovskogo },
  { name: 'Пушкинская улица · Pushkinskaya ulitsa', road: NAMES.streets.pushkinskaya },
  { name: 'Улица Восстания · Ulitsa Vosstaniya', road: NAMES.streets.vosstaniya },
  { name: 'Гончарная улица · Goncharnaya ulitsa', road: NAMES.streets.goncharnaya },
  { name: 'Суворовский проспект · Suvorovsky Prospekt', road: NAMES.streets.suvorovsky },
  { name: 'Кузнечный переулок · Kuznechny pereulok', road: NAMES.streets.kuznechny },
  { name: 'Колокольная улица · Kolokolnaya ulitsa', road: NAMES.streets.kolokolnaya },
  { name: 'Улица Рубинштейна · Ulitsa Rubinshteyna', road: NAMES.streets.rubinsteina },
  { name: 'Загородный проспект · Zagorodny Prospekt', road: NAMES.streets.zagorodny },
  { name: 'Разъезжая улица · Razyezzhaya ulitsa', road: NAMES.streets.razyezzhaya },
  { name: 'Стремянная улица · Stremyannaya ulitsa', road: NAMES.streets.stremyannaya },
  { name: 'Большая Московская улица · Bolshaya Moskovskaya', road: NAMES.streets.bolshayaMoskovskaya },
  { name: 'Дворцовая набережная · Palace Embankment', road: NAMES.streets.dvortsovayaNab },
  { name: 'Адмиралтейская набережная · Admiralty Embankment', road: NAMES.streets.admiralteyskayaNab },
  { name: 'Английская набережная · English Embankment', road: NAMES.streets.angliyskayaNab },
  { name: 'Набережная Зимней канавки · Winter Canal embankment', road: NAMES.streets.winterCanalNab },
  { name: 'Набережная Лебяжьей канавки · Swan Canal embankment', road: NAMES.streets.swanCanalNab },
  { name: 'Набережная реки Мойки · Moika embankment', road: NAMES.streets.moika },
  { name: 'Набережная канала Грибоедова · Griboedov Canal embankment', road: NAMES.streets.griboedov },
  { name: 'Дворцовый проезд · Dvortsovy Proyezd', road: NAMES.streets.dvortsovyProezd },
  { name: 'Адмиралтейский проспект · Admiralteysky Prospekt', road: NAMES.streets.admiralteysky },
  { name: 'Вознесенский проспект · Voznesensky Prospekt', road: NAMES.streets.voznesensky },
  { name: 'Садовая улица · Sadovaya ulitsa', road: NAMES.streets.sadovaya },
  { name: 'Малая Садовая улица · Malaya Sadovaya ulitsa', road: NAMES.streets.malayaSadovaya },
  { name: 'Гороховая улица · Gorokhovaya ulitsa', road: NAMES.streets.gorokhovaya },
  { name: 'Большая Морская улица · Bolshaya Morskaya ulitsa', road: NAMES.streets.bolshayaMorskaya },
  { name: 'Малая Морская улица · Malaya Morskaya ulitsa', road: NAMES.streets.malayaMorskaya },
  { name: 'Большая Конюшенная улица · Bolshaya Konyushennaya ulitsa', road: NAMES.streets.bolshayaKonyushennaya },
  { name: 'Малая Конюшенная улица · Malaya Konyushennaya ulitsa', road: NAMES.streets.malayaKonyushennaya },
  { name: 'Миллионная улица · Millionnaya ulitsa', road: NAMES.streets.millionnaya },
  { name: 'Конногвардейский бульвар · Konnogvardeysky Boulevard', road: NAMES.streets.konnogvardeysky },
  { name: 'Почтамтская улица · Pochtamtskaya ulitsa', road: NAMES.streets.pochtamtskaya },
  { name: 'Казанская улица · Kazanskaya ulitsa', road: NAMES.streets.kazanskaya },
  { name: 'Инженерная улица · Inzhenernaya ulitsa', road: NAMES.streets.inzhenernaya },
  { name: 'Итальянская улица · Italyanskaya ulitsa', road: NAMES.streets.italyanskaya },
  { name: 'Михайловская улица · Mikhailovskaya ulitsa', road: NAMES.streets.mikhailovskaya },
  { name: 'Банковский переулок · Bankovsky pereulok', road: NAMES.streets.bankovsky },
  { name: 'Царицынский проезд · Tsaritsynsky Proyezd', road: NAMES.streets.tsaritsynsky },
  { name: 'Улица Якубовича · Ulitsa Yakubovicha', road: NAMES.streets.yakubovicha },
  { name: 'Галерная улица · Galernaya ulitsa', road: NAMES.streets.galernaya },
  { name: 'Дворцовая площадь · Palace Square', road: NAMES.streets.dvortsovayaSq },
  { name: 'Исаакиевская площадь · St Isaac\'s Square', road: NAMES.streets.isaakievskayaSq },
  { name: 'Сенатская площадь · Senate Square', road: NAMES.streets.senatskayaSq },
  { name: 'Площадь Островского · Ostrovsky Square', road: NAMES.streets.ostrovskogoSq },
  { name: 'Конюшенная площадь · Konyushennaya Square', road: NAMES.streets.konyushennayaSq },
  { name: 'Площадь Искусств · Arts Square', road: NAMES.streets.iskusstvSq },
  { name: 'Биржевая площадь · Birzhevaya Square', road: NAMES.streets.birzhevayaSq },
  { name: 'Казанская площадь · Kazan Square', road: NAMES.streets.kazanskayaSq },
  { name: 'Университетская набережная · Universitetskaya embankment', road: 'Университетская набережная' },
  { name: 'Санкт-Петербург · Saint Petersburg', x0: -9999, x1: 9999, z0: -9999, z1: 9999 },
  ];
}

/** HERO (the start pose) and VIEWS (keys 1..0, Shift + 1..9, Alt + 1..5 and the Places list), built with the layout helper yawToward. */
export function makeViews({ yawToward }) {
  // ---------------------------------------------------------------- viewpoints (keys 1..0, Shift + 1..9, Alt + 1..5) and the hero camera
  // Every pose is a free, walkable spot (tools/layout-test.mjs checks insideBuilding / isOnRoad / line of sight; tools/views-check.mjs adds the colliders). x, z, yaw (deg, 0 = north, 90 = west), pitch (deg).
  // The strip from the Moscow station to the Admiralty: 1..5 the station end of Nevsky, 6..8 / 9 / 0 / Shift + 1..9 the sights of the centre and the west, Alt + 1..4 the metro entrances, Alt + 5 the castle;
  // the rest only stand in the Places list (key 'Place.<id>').
  const HERO = { x: 560, z: 192, yaw: yawToward(560, 192, 598, 235), pitch: 8 };      // Vosstaniya Square, looking at the obelisk and the Moscow station's clock tower
  const VIEWS = [
    { key: 'Digit1', label: 'Площадь Восстания · Московский вокзал', x: 560, z: 192, yaw: yawToward(560, 192, 598, 235), pitch: 8 },
    { key: 'Digit2', label: 'Обелиск Городу-герою Ленинграду', x: 576, z: 209, yaw: yawToward(576, 209, 592, 165), pitch: 22 },
    { key: 'Digit3', label: 'Невский проспект', x: 502, z: 158, yaw: yawToward(502, 158, 380, 130), pitch: 4 },
    { key: 'Digit4', label: 'Платформы Московского вокзала', x: 644.8, z: 520, yaw: yawToward(644.8, 520, 700, 800), pitch: 3 },
    { key: 'Digit5', label: 'Аничков мост', x: -395, z: -108, yaw: yawToward(-395, -108, -470, -92), pitch: 6 },
    { key: 'Digit6', label: 'Спас на Крови · канал Грибоедова', x: -1308, z: -798, yaw: yawToward(-1308, -798, -1255, -860), pitch: 14 },
    { key: 'Digit7', label: 'Гостиный Двор · Невский проспект', x: -1123, z: -282, yaw: yawToward(-1123, -282, -1100, -190), pitch: 6 },
    { key: 'Digit8', label: 'Зимний дворец · Дворцовая набережная', x: -2143, z: -1008, yaw: yawToward(-2143, -1008, -2060, -940), pitch: 10 },
    { key: 'Digit9', label: 'Казанский собор', x: -1470, z: -312, yaw: yawToward(-1470, -312, -1482, -235), pitch: 8 },
    { key: 'Digit0', label: 'Дворцовая площадь · Александровская колонна', x: -1985, z: -715, yaw: yawToward(-1985, -715, -2096, -896), pitch: 6 },
    { key: 'ShiftDigit1', label: 'Подписные Издания', x: -173, z: -223, yaw: 90, pitch: 12 },
    { key: 'ShiftDigit2', label: 'Русский музей · площадь Искусств', x: -1075, z: -620, yaw: yawToward(-1075, -620, -1061, -697), pitch: 8 },
    { key: 'ShiftDigit3', label: 'Дворцовый мост · Дворцовая набережная', x: -2337, z: -848, yaw: yawToward(-2337, -848, -2495, -1075), pitch: 4 },
    { key: 'ShiftDigit4', label: 'Дом Зингера · Казанский мост', x: -1398, z: -345, yaw: yawToward(-1398, -345, -1420, -383), pitch: 12 },
    { key: 'ShiftDigit5', label: 'Аничков дворец · набережная Фонтанки', x: -598, z: -22, yaw: yawToward(-598, -22, -641, -64), pitch: 8 },
    { key: 'ShiftDigit6', label: 'Михайловский сад · павильон Росси', x: -971, z: -900, yaw: yawToward(-971, -900, -971, -940), pitch: 8 },
    { key: 'ShiftDigit7', label: 'Адмиралтейство · Александровский сад', x: -2380, z: -470, yaw: yawToward(-2380, -470, -2433, -621), pitch: 10 },
    { key: 'ShiftDigit8', label: 'Исаакиевский собор', x: -2440, z: -60, yaw: yawToward(-2440, -60, -2523, -185), pitch: 12 },
    { key: 'ShiftDigit9', label: 'Медный всадник · Сенатская площадь', x: -2715, z: -425, yaw: yawToward(-2715, -425, -2745, -444), pitch: 6 },
    // the metro entrances (the seven stations of the strip; Alt + 5 is the castle below)
    { key: 'AltDigit1', label: 'Метро «Площадь Восстания» · ротонда', x: 534, z: 125, yaw: yawToward(534, 125, 516, 92), pitch: 10 },
    { key: 'AltDigit2', label: 'Метро «Маяковская» · Невский Атриум', x: 247, z: 109, yaw: yawToward(247, 109, 216, 115), pitch: 8 },
    { key: 'AltDigit3', label: 'Метро «Гостиный двор» · Невский проспект', x: -985, z: -210, yaw: yawToward(-985, -210, -976, -183), pitch: 6 },
    { key: 'AltDigit4', label: 'Метро «Невский проспект» · канал Грибоедова', x: -1340, z: -298, yaw: yawToward(-1340, -298, -1352, -339), pitch: 6 },
    { key: 'AltDigit5', label: 'Михайловский замок · памятник Петру I', x: -700, z: -715, yaw: yawToward(-700, -715, -745, -840), pitch: 10 },
    // the Places list only
    { key: 'Place.oktyabrsky', label: 'БКЗ «Октябрьский» · Лиговский проспект', x: 737.5, z: -344.3, yaw: -50.4, pitch: 8 },
    { key: 'Place.vladimirskaya-metro', label: 'Метро «Владимирская» · Кузнечный переулок', x: -185, z: 500, yaw: yawToward(-185, 500, -187, 532), pitch: 6 },
    { key: 'Place.circus', label: 'Цирк Чинизелли · Инженерная улица', x: -560, z: -620, yaw: yawToward(-560, -620, -569, -693), pitch: 10 },
    { key: 'Place.library', label: 'Российская национальная библиотека · Фонтанка', x: -372, z: -300, yaw: yawToward(-372, -300, -334, -311), pitch: 8 },
    { key: 'Place.alexandrinsky', label: 'Александринский театр · Екатерининский сад', x: -800, z: -95, yaw: yawToward(-800, -95, -844, 70), pitch: 8 },
    { key: 'Place.hermitage', label: 'Большой Эрмитаж · Дворцовая набережная', x: -2039, z: -1084, yaw: yawToward(-2039, -1084, -1985, -1050), pitch: 10 },
    { key: 'Place.admiralteyskaya-metro', label: 'Метро «Адмиралтейская» · Малая Морская', x: -2058, z: -438, yaw: yawToward(-2058, -438, -2029, -411), pitch: 6 },
  ];
  return { HERO, VIEWS };
}
