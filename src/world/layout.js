// ============================================================================
//  WORLD LAYOUT CONTRACT - central Saint Petersburg (Санкт-Петербург): Moscow Railway Station, Vosstaniya Square, Nevsky Prospekt,
//  Fontanka + Anichkov Bridge, Ligovsky / Vladimirsky; single source of truth shared by every module.
//  Units: metres. +Y up. +X = east, -Z = north, +Z = south.  Origin = 59.932421 N, 30.351279 E (data/city.js ORIGIN = the `ll` of the user's Yandex URL).
//  Model convention: every model's "front / forward" is its local +Z.
//  rotY follows three.js (rotation.y): rotY=0 faces +Z (south), rotY=PI faces -Z (north), +PI/2 faces +X (east),
//  -PI/2 faces -X (west). Camera yaw (degrees) for shots / player: 0 looks north (-Z), 90 west, 180 south, -90 east.
//  All footprints / roads / water come from OpenStreetMap (data/city.js, baked by tools/bake-osm.mjs; registered to
//  docs/reference/yandex-center.png, see docs/reference/calibration.md: 0.934 m/px).
//
//  ORIGIN is on the Nevsky roadway at Mayakovskogo ul., NOT in the middle of the play area. The Moscow station is ~300 m south-east of Vosstaniya Square's obelisk (592, 165).
//  Always use the exports below, never raw numbers.
//
//  The city is FLAT (y = 0 = street level). The Fontanka lies in a granite trench: water surface y = RIVER_Y.water (-3.2), river bed RIVER_Y.bed; heightAt() returns the
//  bed inside the river polygon (the quay walls enclose it, nobody can walk there). Sidewalks are +0.12 m visually only (SURFACE.sidewalk): the player's feet stay at y = 0.
//  UNDERGROUND: the metro lies 51-64 m below the street (docs/UNDERGROUND.md); the ground plane (y = 0) is a drawn mesh with holes over the shafts (GROUND_HOLES).
//  The street grid is not axis aligned: Nevsky runs at bearing ~104 deg (WNW-ESE), Ligovsky / Marata ~17 deg, Liteyny / Vladimirsky ~1.5 deg.
// ============================================================================
import * as CITY from './data/city.js';
import { TAURIDE_WATER_UNION as TAURIDE_PONDS } from './landmarksTauride/terrain.js';
const { ORIGIN, EXTENT, PLAY, BUILDINGS, ROADS, AREAS: AREA_DATA, GREEN, RIVER } = CITY;
const PLAY_RECTS = CITY.PLAY_RECTS || [PLAY], EXTENT_RECTS = CITY.EXTENT_RECTS || [EXTENT];   // an old single-rectangle bake has no rectangle lists
import { SHAFTS, DOORWAYS } from './data/metro.js';
import { WATERWAYS, waterwayAt as _waterwayAt, shoreDistance as _shoreDistance } from './environment/waterways.js';
import { inSouthPond } from './environment/south-ponds.js';
import { GROUPS_LIST as G_E } from './landmarksE/groups.js';
import { GROUPS_LIST as G_F } from './landmarksF/groups.js';
import { GROUPS_LIST as G_G } from './landmarksG/groups.js';
import { GROUPS_LIST as G_H } from './landmarksH/groups.js';
import { GROUPS_LIST as G_I } from './landmarksI/groups.js';
import { GROUPS_LIST as G_J } from './landmarksJ/groups.js';
import { GROUPS_LIST as G_K } from './landmarksK/groups.js';
import { GROUPS_LIST as G_BELINSKY } from './landmarksBelinsky/groups.js';
import { GROUPS_LIST as G_BR } from './bridges/groups.js';
import { GROUPS_LIST as G_EAST } from './landmarksEast/groups.js';
import { GROUPS_LIST as G_EAST_BRIDGES } from './eastBridges/groups.js';
import { GROUPS_LIST as G_NORTH } from './landmarksNorth/groups.js';
import { GROUPS_LIST as G_SMOLNY } from './landmarksSmolny/groups.js';
import { GROUPS_LIST as G_KIROCHNAYA } from './landmarksKirochnaya/groups.js';
import { paradnyDeckY } from './landmarksTauride/paradny-surface.js';
import { GROUPS_LIST as G_SUVOROV } from './landmarksSuvorov/groups.js';
import { GROUPS_LIST as G_TAURIDE } from './landmarksTauride/groups.js';
import { GROUPS_LIST as G_NORTH_BRIDGES } from './northBridges/groups.js';
import { GROUPS_LIST as G_MARS } from './landmarksMars/groups.js';
import { GROUPS_LIST as G_GARDEN } from './landmarksGarden/groups.js';
import { GROUPS_LIST as G_CASTLE } from './landmarksCastle/groups.js';
import { GROUPS_LIST as G_NIK } from './landmarksNikolsky/groups.js';
import { GROUPS_LIST as G_MARIINSKY } from './landmarksMariinsky/groups.js';
import { GROUPS_LIST as G_NEWHOLLAND } from './landmarksNewHolland/groups.js';
import { GROUPS_LIST as G_YUSUPOV } from './landmarksYusupov/groups.js';
import { GROUPS_LIST as G_FORTRESS, ISLAND_RING as FORTRESS_ISLAND } from './landmarksFortress/groups.js';
import { GROUPS_LIST as G_STRELKA } from './landmarksStrelka/groups.js';
import { GROUPS_LIST as G_UNIVERSITY } from './landmarksUniversity/groups.js';
import { GROUPS_LIST as G_TROITSKAYA } from './landmarksTroitskaya/groups.js';
import { GROUPS_LIST as G_AURORA } from './landmarksAurora/groups.js';
import { GROUPS_LIST as G_KRONVERK } from './landmarksKronverk/groups.js';
import { GROUPS_LIST as G_KAMENNO } from './landmarksKamennoostrovsky/groups.js';
import { GROUPS_LIST as G_VLADIMIR } from './landmarksVladimir/groups.js';
import { GROUPS_LIST as G_KARPOVKA } from './landmarksKarpovka/groups.js';
import { GROUPS_LIST as G_OKTYABRSKY } from './landmarksOktyabrsky/groups.js';
import { GROUPS_LIST as G_MODERNVO } from './landmarksModernVO/groups.js';
import { GROUPS_LIST as G_MARINEFACADE } from './landmarksMarineFacade/groups.js';
import { GROUPS_LIST as G_PRIBALTIYSKAYA } from './landmarksPribaltiyskaya/groups.js';
import { GROUPS_LIST as G_GAVAN } from './landmarksGavan/groups.js';
import { GROUPS_LIST as G_SREDNY } from './landmarksSredny/groups.js';
import { GROUPS_LIST as G_MAKAROVA } from './landmarksMakarova/groups.js';
import { GROUPS_LIST as G_KIROVA } from './landmarksKirova/groups.js';
import { GROUPS_LIST as G_SEVKABEL } from './landmarksSevkabel/groups.js';
import { GROUPS_LIST as G_SEATERMINAL } from './landmarksSeaTerminal/groups.js';
import { GROUPS_LIST as G_SMOLENSKY } from './landmarksSmolensky/groups.js';
import { GROUPS_LIST as G_NAVALCORPS } from './landmarksNavalCorps/groups.js';
import { GROUPS_LIST as G_ANDREW } from './landmarksAndrew/groups.js';
import { GROUPS_LIST as G_MINING } from './landmarksMining/groups.js';
import { GROUPS_LIST as G_MENSHIKOV } from './landmarksMenshikov/groups.js';
import { GROUPS_LIST as G_ACADEMY } from './landmarksAcademy/groups.js';
import { GROUPS_LIST as G_CENTRAL_SOUTH } from './landmarksCentralSouth/groups.js';
import { GROUPS_LIST as G_MOSKOVSKY } from './landmarksMoskovsky/groups.js';
import { GROUPS_LIST as G_VICTORY_PARK } from './landmarksVictoryPark/groups.js';
import { GROUPS_LIST as G_PETRO_COMPLETION } from './landmarksPetroCompletion/groups.js';
import { GROUPS_LIST as G_KRESTOVSKY } from './landmarksKrestovsky/groups.js';
import { GROUPS_LIST as G_YE_PALACE } from './landmarksYelaginPalace/groups.js';
import { GROUPS_LIST as G_YE_KITCHEN } from './landmarksYelaginKitchen/groups.js';
import { GROUPS_LIST as G_YE_SERVICES } from './landmarksYelaginServices/groups.js';
import { GROUPS_LIST as G_YE_ROSSI } from './landmarksYelaginRossi/groups.js';
import { GROUPS_LIST as G_YE_SPITS } from './landmarksYelaginSpits/groups.js';
import { GROUPS_LIST as G_YE_PARK } from './landmarksYelaginPark/groups.js';
import { GROUPS_LIST as G_KAM_PALACE } from './landmarksKamennyPalace/groups.js';
import { GROUPS_LIST as G_KAM_CHURCH } from './landmarksKamennyChurch/groups.js';
import { GROUPS_LIST as G_BOT_GH } from './landmarksBotanicalGreenhouses/groups.js';
import { GROUPS_LIST as G_BOT_GARDEN } from './landmarksBotanicalGarden/groups.js';
import { GROUPS_LIST as G_PV_STADIUM } from './landmarksPetrovskyStadium/groups.js';
import { GROUPS_LIST as G_PV_YACHT } from './landmarksPetrovskyYacht/groups.js';
import { GROUPS_LIST as G_VO_STATUES } from './landmarksVOStatues/groups.js';
import { GROUPS_LIST as G_PETRO_MON } from './landmarksPetroMonuments/groups.js';
import { GROUPS_LIST as G_N_KAMENNYTHEATRE } from './landmarksKamennyTheatre/groups.js';
import { GROUPS_LIST as G_N_KAMENNYDACHASEAST } from './landmarksKamennyDachasEast/groups.js';
import { GROUPS_LIST as G_N_KAMENNYDACHASWEST } from './landmarksKamennyDachasWest/groups.js';
import { GROUPS_LIST as G_N_TVTOWER } from './landmarksTVTower/groups.js';
import { GROUPS_LIST as G_N_LETI } from './landmarksLETI/groups.js';
import { GROUPS_LIST as G_N_TRANSFIGURATION } from './landmarksTransfiguration/groups.js';
import { GROUPS_LIST as G_N_PETROVSKYWEST } from './landmarksPetrovskyWest/groups.js';
import { GROUPS_LIST as G_N_ZHDANOVKA } from './landmarksZhdanovka/groups.js';
import { KRESTOVSKY_ISLAND } from './environment/krestovsky-context.js';
import { ISLANDS2_COAST } from './environment/islands2-context.js';
import { inIsland } from './lib/vo-island.js';
export { ORIGIN, EXTENT, PLAY, PLAY_RECTS, EXTENT_RECTS };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- names
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

// ---------------------------------------------------------------- playable bounds
// The play area is a UNION of axis-aligned rectangles (WORLD.rects = PLAY_RECTS: the first build + the western extension, docs/reference/west-frame.md) with empty notches:
// WORLD.play is only its BOUNDING BOX (how big is the world, where to scatter things); to ask "may I stand here" use inPlay(x, z, margin) and clampToPlay(x, z, margin).
export const WORLD = {
  play: { x0: PLAY.x0, x1: PLAY.x1, z0: PLAY.z0, z1: PLAY.z1 },   // bounding box of the play area (do NOT clamp the player to it: use clampToPlay)
  rects: PLAY_RECTS,                                               // the play area = the union of these rectangles { x0, x1, z0, z1 } (first = the old area)
  data: EXTENT,                                                    // bounding box of the OSM data extent (= every play rectangle grown by 120 m of scenery)
  dataRects: EXTENT_RECTS,                                         // the data extent = the union of these rectangles
  visual: { x0: -5000, x1: 5000, z0: -5000, z1: 5000 },           // far scenery (distant roofline, the rail yard, the sky)
};
// ---- unions of rectangles (the same tests as tools/osm-lib.mjs: inPlay / inExtent / clampToPlay)
const _inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const _bcache = new Map();
function _boundary(rs) {   // boundary segments [ax, az, bx, bz] of the union (edges shared by two rectangles are interior)
  let c = _bcache.get(rs); if (c) return c; c = [];
  const sub = (a, b, cut) => { let rem = [[a, b]]; for (const [c0, c1] of cut) { const nr = []; for (const [s, e] of rem) { if (c1 <= s || c0 >= e) { nr.push([s, e]); continue; } if (c0 > s) nr.push([s, c0]); if (c1 < e) nr.push([c1, e]); } rem = nr; } return rem.filter(([s, e]) => e - s > 1e-9); };
  rs.forEach((r, i) => {
    const o = rs.filter((_, j) => j !== i);
    for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 < r.z0 && q.z1 >= r.z0).map((q) => [q.x0, q.x1]))) c.push([s, r.z0, e, r.z0]);
    for (const [s, e] of sub(r.x0, r.x1, o.filter((q) => q.z0 <= r.z1 && q.z1 > r.z1).map((q) => [q.x0, q.x1]))) c.push([s, r.z1, e, r.z1]);
    for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 < r.x0 && q.x1 >= r.x0).map((q) => [q.z0, q.z1]))) c.push([r.x0, s, r.x0, e]);
    for (const [s, e] of sub(r.z0, r.z1, o.filter((q) => q.x0 <= r.x1 && q.x1 > r.x1).map((q) => [q.z0, q.z1]))) c.push([r.x1, s, r.x1, e]);
  });
  _bcache.set(rs, c); return c;
}
function _distBoundary(rs, x, z) { let d = Infinity; for (const [ax, az, bx, bz] of _boundary(rs)) { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0; d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; }
/** (x,z) inside the union of rectangles `rs`, at least m metres from its boundary (m < 0: also up to -m outside). */
function _inUnion(rs, x, z, m = 0) {
  if (m > 0) for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (x >= r.x0 + m && x <= r.x1 - m && z >= r.z0 + m && z <= r.z1 - m) return true; }      // m deep inside one rectangle: at least m from the union boundary (no boundary walk)
  const ins = rs.some((r) => _inR(r, x, z)); if (m === 0) return ins; return m > 0 ? ins && _distBoundary(rs, x, z) >= m : ins || _distBoundary(rs, x, z) <= -m;
}
/** True when (x,z) is inside the play area (the union of WORLD.rects) at least `m` metres from its edge (m = 0: just inside; m < 0: also up to -m outside). */
export const inPlay = (x, z, m = 0) => _inUnion(PLAY_RECTS, x, z, m);
/** True when (x,z) is inside the baked data extent (the union of WORLD.dataRects), at least m metres from its edge. */
export const inExtent = (x, z, m = 0) => _inUnion(EXTENT_RECTS, x, z, m);
/** The nearest point of the play area (inset by m; m < 0 grows it) to (x,z): [x, z]. Used to keep the player / the car inside the map (a slide along the edge, never a stop). */
export function clampToPlay(x, z, m = 0) {
  if (_inUnion(PLAY_RECTS, x, z, m)) return [x, z];
  let best = null, bd = Infinity;
  for (const r of PLAY_RECTS) {
    const a = { x0: r.x0 + m, x1: r.x1 - m, z0: r.z0 + m, z1: r.z1 - m }; if (a.x0 > a.x1 || a.z0 > a.z1) continue;
    const px = Math.min(a.x1, Math.max(a.x0, x)), pz = Math.min(a.z1, Math.max(a.z0, z)), d = Math.hypot(px - x, pz - z);
    if (d < bd) { bd = d; best = [px, pz]; }
  }
  return best || [x, z];
}

// ---------------------------------------------------------------- vertical datums (street level = 0)
export const GROUND_Y = 0;
/** Heights of the drawn surfaces above the ground (metres). Only the ground is physical: roads / sidewalks are drawn, never walk boxes. Granite kerb 0.15, pavement +0.12. */
export const SURFACE = { ground: 0, road: 0.03, sidewalk: 0.12, kerb: 0.15, plinth: 1.0, platform: 1.1 };   // platform = rail platform above the rail head level (decks are walk boxes)
/** The Fontanka: water surface and bed below street level (docs/research/fontanka.md: granite wall ~3.2 m). */
export const RIVER_Y = { water: -3.2, bed: -4.6 };
/** Metro datum (docs/research/metro.md): street level = 0, station platforms at -depth (OSM depth tags: Vosstaniya 58, Mayakovskaya 51, Vladimirskaya 55, Dostoevskaya 64). */
export const METRO_DEPTH = { vosstaniya: -58, mayakovskaya: -51, vladimirskaya: -55, dostoevskaya: -64 };

const ringHas = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; };
// ---- water: every waterway of the map (Fontanka, Griboedov Canal, Moika, Winter Canal, Swan Canal, Neva incl. the Neva / Obvodny canal / Monastyrka of the east) lies in a granite trench with its own water level
// (environment/waterways.js: the water polygons of the data stitched across the seams of the part files; WATERWAYS = { water, bed, ... } per key).
/** Water level / bed of every waterway (street level = 0): { key: { water, bed, ... } }. RIVER_Y above is the Fontanka (kept for the old modules). */
export { WATERWAYS };
/** Key of the waterway ('fontanka' | 'griboedov' | 'moika' | 'winter-canal' | 'swan-canal' | 'neva') whose water polygon contains (x,z), or null. */
export const waterwayAt = _waterwayAt;
/** y of the water surface at (x,z) when it lies on a waterway, else null. */
export function waterLevelAt(x, z) { const k = _waterwayAt(x, z); return k ? WATERWAYS[k].water : null; }
/** True when (x,z) lies on the water of a waterway (the trench between the granite quays). Bridges are decks above it (walk boxes), they do not change this. */
export function inRiver(x, z) { return _waterwayAt(x, z) !== null; }
/** True when (x,z) lies in a pond of the Tauride Garden (a shallow bed, -1.4 m: the ponds are not waterways, they have no quay). */
export function inTauridePond(x, z) { return x > 1000 && x < 1500 && z > -1800 && z < -1200 && TAURIDE_PONDS.some((p) => ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))); }
/** Terrain height: 0 (street level) everywhere, the stair / podium of the Paradny Quarter (3.3 m), the bed of the Tauride ponds, the bed of the waterway inside the water polygons. */
export function heightAt(x, z) { const d = paradnyDeckY(x, z); if (d != null) return d; if (inTauridePond(x, z) || inSouthPond(x,z)) return -1.4; const k = _waterwayAt(x, z); return k ? WATERWAYS[k].bed : GROUND_Y; }
export const groundAt = heightAt;
/** Distance (m) from (x,z) to the water of any waterway (0 on it; 1e4 when no bank within ~80 m). Used by core/audio.js for the water ambience. */
export function shoreDist(x, z) { return _shoreDistance(x, z); }

// ---------------------------------------------------------------- the local frames of the grid and of the station
/** Bearing (deg clockwise from north) of Nevsky Prospekt in the screenshot area (docs/reference/DATA-REPORT.md: 103.9). */
export const GRID_DEG = 103.9;
const _gs = Math.sin(GRID_DEG * Math.PI / 180), _gc = Math.cos(GRID_DEG * Math.PI / 180);
/** Vosstaniya Square: the paved square w638352776 (centre 589, 173); the Hero City obelisk (36 m) stands at (592, 165) on an island between the two Nevsky carriageways. */
export const SQUARE = { x: 589, z: 173, name: NAMES.square, nameEn: NAMES.squareEn };
export const OBELISK = { x: 592.2, z: 164.9, h: 36 };
/** Moscow Railway Station: faces NNW (facade normal bearing ~348 deg) onto the square with the obelisk on its axis; the tracks run SSE (bearing ~167 deg). Clock tower base (602, 246). */
export const STATION = { x: 612, z: 300, facadeBearing: 348, trackBearing: 167, tower: { x: 602.1, z: 246.4 } };
/** world (x,z) -> Nevsky frame (u, v): u along Nevsky toward the ESE (bearing 103.9), v toward the NNE; origin = SQUARE. */
export function toGrid(x, z, o = SQUARE) { const dx = x - o.x, dz = z - o.z; return { u: dx * _gs - dz * _gc, v: -dx * _gc - dz * _gs }; }
/** Nevsky frame (u, v) -> world {x, z}. */
export function fromGrid(u, v, o = SQUARE) { return { x: o.x + u * _gs - v * _gc, z: o.z - u * _gc - v * _gs }; }
/** rotY of a model whose front (+Z) must face the world direction (dx, dz). */
export const rotYToward = (dx, dz) => Math.atan2(dx, dz);
/** rotY of a model whose front (+Z) faces a compass bearing (deg clockwise from north). */
export const rotYBearing = (deg) => Math.atan2(Math.sin(deg * Math.PI / 180), -Math.cos(deg * Math.PI / 180));
/** Camera yaw (deg, 0 = north, 90 = west) that looks from (x0,z0) toward (x1,z1). */
export const yawToward = (x0, z0, x1, z1) => { const b = Math.atan2(x1 - x0, -(z1 - z0)) * 180 / Math.PI; return ((-b + 540) % 360) - 180; };

// ---------------------------------------------------------------- building records, heights, footprints
const _byId = new Map(BUILDINGS.map((b) => [b.id, b]));
export const buildingById = (id) => _byId.get(id);
/** Default heights (m) by OSM kind when neither `height` nor `building:levels` is mapped. */
export const DEFAULT_H = { garage: 3, garages: 3, kiosk: 3, service: 4, shed: 3, roof: 5, construction: 12, transportation: 6, yes: 21 };
/** Cornice height Hc (m, above the pavement) of an n-storey building by era (docs/research/architecture.md section A): rent house 1860-1914 / Stalin 1930-60 / panel 1970s / modern infill. */
const HC = {
  rent: [0, 5.0, 9.0, 13.5, 17.5, 21.0, 23.5, 25.5, 27],
  stalin: [0, 4.5, 8.5, 12.5, 17.0, 21.5, 25.0, 28.0, 30],
  panel: [0, 3.5, 6.5, 9.5, 12.5, 15.5, 18.5, 21.5, 24],
  modern: [0, 4.0, 7.0, 11.0, 15.0, 19.0, 22.5, 26.0, 30],
};
/** Era class of a record: 'rent' (default, ~85 % of the centre), 'stalin', 'panel', 'modern' - from start_date when mapped. */
export function eraOf(b) {
  const y = parseInt(b.startDate, 10);
  if (y >= 1990) return 'modern';
  if (y >= 1960) return 'panel';
  if (y >= 1930) return 'stalin';
  return 'rent';
}
const _hCache = new WeakMap();
const _levelsHc = (era, n) => { const t = HC[era]; return n <= 8 ? t[Math.max(1, Math.round(n))] : t[8] + (n - 8) * 3.3; };
/** Best known cornice / eave height of a building or part record: mapped height, else levels via the era table, else an inference (small annexes 2 storeys,
 *  narrow streets 4, everything else 5 storeys = 21 m), else the kind default. Roofs (mansards, gables) are drawn on top by the owner of the building. */
export function heightOf(b) {
  let h = _hCache.get(b);
  if (h !== undefined) return h;
  if (b.id === 'r946930') h = 23.8; // Muruzi: five-storey photo-derived cornice, not the low mapped estimate.
  else if (b.hSrc === 'height' && b.h) h = b.h;
  else if (b.levels) h = _levelsHc(eraOf(b), b.levels);
  else if (b.kind && DEFAULT_H[b.kind] !== undefined && b.kind !== 'yes') h = DEFAULT_H[b.kind];
  else if (b.area && b.area < 150) h = HC.rent[2];
  else {
    const near = b.cx !== undefined ? nearestRoad(b.cx, b.cz, { drivable: true, maxDist: 40 }) : null;
    h = near && roadWidth(near.road) < 9 && (near.road.hw === 'residential' || near.road.hw === 'service' || near.road.hw === 'living_street') ? HC.rent[4] : HC.rent[5];
  }
  _hCache.set(b, h);
  return h;
}

const _fpBox = new WeakMap();
const boxOf = (p) => { let b = _fpBox.get(p); if (!b) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); } b = [x0, x1, z0, z1]; _fpBox.set(p, b); } return b; };
// QA fix: the baked duplicate filter sometimes keeps the RAISED part and marks the ground body that carries it `dupOf` (Nevsky 22-24 w535381121, w1331069739, r3300412): city/prep.js draws that body, so it is a ground building here too
const isBaseOfRaised = (b) => (b.minH || 0) < 0.5 && ((_byId.get(b.dupOf) || {}).minH || 0) > 2.5;
let footprints = null;
/** Footprint polygons { o: [x,z,...], h: [[...], ...] } of every building that stands on the ground. The skipped records are outlines
 *  whose parts are listed separately; parts raised above the ground (minH > 3) and underground parts are not ground buildings. */
export function groundFootprints() {
  if (!footprints) footprints = BUILDINGS.filter((b) => !b.skip && (b.minH || 0) <= 3 && !(b.layer < 0) && !b.underground && (!b.dupOf || isBaseOfRaised(b))).flatMap((b) => b.polys);
  return footprints;
}
/** True when (x,z), grown by r metres, lies inside the footprint of a building that stands on the ground (courtyard holes excluded).
 *  The colliders are wall boxes only, so ANYTHING that places the player (views, landing, spawns) must test this. */
export function insideBuilding(x, z, r = 0) {
  const at = (px, pz) => { const c = fpGrid(false).get(cellKey(px, pz)); if (!c) return false; for (const p of c) { const b = boxOf(p); if (px < b[0] || px > b[1] || pz < b[2] || pz > b[3]) continue; if (ringHas(p.o, px, pz) && !p.h.some((h) => ringHas(h, px, pz))) return true; } return false; };
  return at(x, z) || (r > 0 && (at(x + r, z) || at(x - r, z) || at(x, z + r) || at(x, z - r)));
}
// 64 m spatial grids of the footprint boxes (every call used to scan all ~1 700 footprints: ~3 s of the load, the callers are the placement code of every module).
// ground = false: the ground footprints (insideBuilding); true: every (record, polygon) in BUILDINGS order (buildingAt: the first match wins as before).
const FPG = 64, cellKey = (x, z) => Math.floor(x / FPG) * 4096 + Math.floor(z / FPG);
const _fpGrids = [null, null];
function fpGrid(all) {
  const gi = all ? 1 : 0; if (_fpGrids[gi]) return _fpGrids[gi];
  const grid = new Map();
  const add = (p, item) => { const b = boxOf(p); for (let i = Math.floor(b[0] / FPG); i <= Math.floor(b[1] / FPG); i++) for (let j = Math.floor(b[2] / FPG); j <= Math.floor(b[3] / FPG); j++) { const k = i * 4096 + j; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(item); } };
  if (all) { for (const b of BUILDINGS) { if (b.skip || (b.minH || 0) > 3 || b.underground) continue; for (const p of b.polys) add(p, { p, b }); } }
  else for (const p of groundFootprints()) add(p, p);
  return (_fpGrids[gi] = grid);
}
/** The footprint record (outline or part) that contains (x,z), or null. */
export function buildingAt(x, z) {
  const c = fpGrid(true).get(cellKey(x, z)); if (!c) return null;
  for (const { p, b } of c) { const bx = boxOf(p); if (x < bx[0] || x > bx[1] || z < bx[2] || z > bx[3]) continue; if (ringHas(p.o, x, z) && !p.h.some((h) => ringHas(h, x, z))) return b; }
  return null;
}
/** Bounding box { x0, x1, z0, z1, cx, cz } of a list of building records. */
export function boundsOf(list) {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const b of list) for (const p of b.polys) { const q = boxOf(p); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[1]); z0 = Math.min(z0, q[2]); z1 = Math.max(z1, q[3]); }
  return { x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
}

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
    { key: 'chkalovskaya-pavilion', name: 'Вестибюль метро «Чкаловская»', nameEn: 'Chkalovskaya vestibule (1997 pavilion with the overhanging granite cornice and the Chkalov bust)', ids: ['w50064533'], osm: [], at: [-3312, -3188], note: 'Bolshaya Zelenina 12 / Chkalovsky pr.; drawn by metro/st-chk.js (docs/research/metro-petro.md section 5)' },
  ],
};
// the west extension: each specialist owns the pure-data groups.js of its module
GROUPS.landmarksBelinsky = G_BELINSKY;
GROUPS.landmarksE = G_E; GROUPS.landmarksF = G_F; GROUPS.landmarksG = G_G; GROUPS.landmarksH = G_H; GROUPS.landmarksI = G_I; GROUPS.landmarksJ = G_J; GROUPS.landmarksK = G_K; GROUPS.bridges = G_BR;
// the eastern / northern extension (branch feat/piter-east-neva): Old Nevsky + the Lavra + the Alexander Nevsky Bridge, the central north (Tauride, Paradny, Smolny, Liteyny / Bolsheokhtinsky bridges)
GROUPS.landmarksEast = G_EAST; GROUPS.eastBridges = G_EAST_BRIDGES;
GROUPS.landmarksNorth = G_NORTH; GROUPS.landmarksSmolny = G_SMOLNY; GROUPS.landmarksTauride = G_TAURIDE; GROUPS.landmarksSuvorov = G_SUVOROV; GROUPS.landmarksKirochnaya = G_KIROCHNAYA; GROUPS.northBridges = G_NORTH_BRIDGES; GROUPS.landmarksMars = G_MARS; GROUPS.landmarksGarden = G_GARDEN; GROUPS.landmarksCastle = G_CASTLE; GROUPS.landmarksNikolsky = G_NIK; GROUPS.landmarksMariinsky = G_MARIINSKY; GROUPS.landmarksNewHolland = G_NEWHOLLAND; GROUPS.landmarksYusupov = G_YUSUPOV;
// the Petrograd side and the Spit of Vasilievsky Island (docs/PETRO-BRIEF.md)
GROUPS.landmarksFortress = G_FORTRESS; GROUPS.landmarksStrelka = G_STRELKA; GROUPS.landmarksUniversity = G_UNIVERSITY; GROUPS.landmarksTroitskaya = G_TROITSKAYA; GROUPS.landmarksAurora = G_AURORA; GROUPS.landmarksKronverk = G_KRONVERK; GROUPS.landmarksKamennoostrovsky = G_KAMENNO; GROUPS.landmarksVladimir = G_VLADIMIR; GROUPS.landmarksKarpovka = G_KARPOVKA; GROUPS.landmarksOktyabrsky = G_OKTYABRSKY; GROUPS.landmarksModernVO = G_MODERNVO; GROUPS.landmarksMarineFacade = G_MARINEFACADE; GROUPS.landmarksPribaltiyskaya = G_PRIBALTIYSKAYA; GROUPS.landmarksGavan = G_GAVAN; GROUPS.landmarksSredny = G_SREDNY; GROUPS.landmarksMakarova = G_MAKAROVA; GROUPS.landmarksKirova = G_KIROVA; GROUPS.landmarksSevkabel = G_SEVKABEL; GROUPS.landmarksSeaTerminal = G_SEATERMINAL; GROUPS.landmarksSmolensky = G_SMOLENSKY; GROUPS.landmarksNavalCorps = G_NAVALCORPS; GROUPS.landmarksAndrew = G_ANDREW; GROUPS.landmarksMining = G_MINING; GROUPS.landmarksMenshikov = G_MENSHIKOV; GROUPS.landmarksAcademy = G_ACADEMY;
GROUPS.landmarksCentralSouth = G_CENTRAL_SOUTH;
GROUPS.landmarksMoskovsky = G_MOSKOVSKY;
GROUPS.landmarksVictoryPark = G_VICTORY_PARK;
GROUPS.landmarksPetroCompletion = G_PETRO_COMPLETION;
GROUPS.landmarksKrestovsky = G_KRESTOVSKY;
GROUPS.landmarksYelaginPalace = G_YE_PALACE; GROUPS.landmarksYelaginKitchen = G_YE_KITCHEN; GROUPS.landmarksYelaginServices = G_YE_SERVICES;
GROUPS.landmarksYelaginRossi = G_YE_ROSSI; GROUPS.landmarksYelaginSpits = G_YE_SPITS; GROUPS.landmarksYelaginPark = G_YE_PARK;
GROUPS.landmarksKamennyPalace = G_KAM_PALACE; GROUPS.landmarksKamennyChurch = G_KAM_CHURCH; GROUPS.landmarksBotanicalGreenhouses = G_BOT_GH;
GROUPS.landmarksBotanicalGarden = G_BOT_GARDEN; GROUPS.landmarksPetrovskyStadium = G_PV_STADIUM; GROUPS.landmarksPetrovskyYacht = G_PV_YACHT;
GROUPS.landmarksVOStatues = G_VO_STATUES; GROUPS.landmarksPetroMonuments = G_PETRO_MON;
GROUPS.landmarksKamennyTheatre = G_N_KAMENNYTHEATRE;
GROUPS.landmarksKamennyDachasEast = G_N_KAMENNYDACHASEAST;
GROUPS.landmarksKamennyDachasWest = G_N_KAMENNYDACHASWEST;
GROUPS.landmarksTVTower = G_N_TVTOWER;
GROUPS.landmarksLETI = G_N_LETI;
GROUPS.landmarksTransfiguration = G_N_TRANSFIGURATION;
GROUPS.landmarksPetrovskyWest = G_N_PETROVSKYWEST;
GROUPS.landmarksZhdanovka = G_N_ZHDANOVKA;
export const MODULE_KEYS = Object.keys(GROUPS);
/** Flat sub-group table { key: { ...subgroup, module } }. */
export const SUBGROUPS = Object.fromEntries(MODULE_KEYS.flatMap((m) => GROUPS[m].map((g) => [g.key, { ...g, module: m }])));

/** Building / part records of a sub-group key ('station') or of every sub-group of a module key ('landmarksA'): outlines + parts. */
export function groupMembers(key) {
  const subs = SUBGROUPS[key] ? [SUBGROUPS[key]] : (GROUPS[key] || []);
  const ids = new Set(subs.flatMap((g) => g.ids));
  return BUILDINGS.filter((b) => ids.has(b.id) || (b.parent && ids.has(b.parent)));
}
/** OSM ids (non-buildings: paving, bridge decks, monuments) claimed by a sub-group / module. */
export const groupOsm = (key) => (SUBGROUPS[key] ? [SUBGROUPS[key]] : (GROUPS[key] || [])).flatMap((g) => g.osm);
const _claim = new Map();      // any claimed id (building, part, monument ...) -> sub-group key
for (const g of Object.values(SUBGROUPS)) {
  for (const id of g.osm) _claim.set(id, g.key);
  for (const id of g.ids) _claim.set(id, g.key);
}
for (const b of BUILDINGS) if (b.parent && _claim.has(b.parent)) _claim.set(b.id, _claim.get(b.parent));
/** Sub-group key that claims this OSM id (or null). */
export const groupOf = (id) => _claim.get(id) || null;
/** Module key ('landmarksB') that claims this OSM id (or null). */
export const claimedBy = (id) => { const g = _claim.get(id); return g ? SUBGROUPS[g].module : null; };
export const isClaimed = (id) => _claim.has(id);
/** Centre / bounds of a sub-group's buildings ({x0,x1,z0,z1,cx,cz}) or null when it has none. */
export function groupBounds(key) { const m = groupMembers(key).filter((b) => !b.skip); return m.length ? boundsOf(m) : null; }

// ---------------------------------------------------------------- roads: simple shared queries (centreline polylines + width)
export const DRIVABLE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service']);
export const WALKWAYS = new Set(['footway', 'path', 'steps', 'pedestrian', 'cycleway']);
export const isDrivable = (r) => DRIVABLE.has(r.hw);
/** Width (m) of a road record: the baked `w`, else a default by class. */
export const roadWidth = (r) => r.w ?? ({ primary: 14, primary_link: 8, secondary: 12, secondary_link: 7, tertiary: 9, residential: 7, unclassified: 6, living_street: 5, service: 4, pedestrian: 6, footway: 2.4, path: 1.8, steps: 2.2 }[r.hw] ?? 4);
const RCELL = 32, RKEY = (cx, cz) => (cx + 32768) * 65536 + (cz + 32768);      // numeric cell keys (the string keys of before cost more than the distance work)
let _rgrid = null;
function roadGrid() {
  if (_rgrid) return _rgrid;
  const g = new Map(), roads = ROADS.filter((r) => !r.tunnel);
  let n = 0;
  for (const r of roads) {
    const w = roadWidth(r), ri = n++, drv = DRIVABLE.has(r.hw);
    for (let i = 0; i + 3 < r.pts.length; i += 2) {
      const ax = r.pts[i], az = r.pts[i + 1], bx = r.pts[i + 2], bz = r.pts[i + 3], m = w / 2 + 2;
      const c0 = Math.floor((Math.min(ax, bx) - m) / RCELL), c1 = Math.floor((Math.max(ax, bx) + m) / RCELL), d0 = Math.floor((Math.min(az, bz) - m) / RCELL), d1 = Math.floor((Math.max(az, bz) + m) / RCELL);
      const e = { r, i, w, ri, drv, x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz) };      // the segment box: a cheap rejection before the projection
      for (let cx = c0; cx <= c1; cx++) for (let cz = d0; cz <= d1; cz++) { const k = RKEY(cx, cz); let a = g.get(k); if (!a) g.set(k, (a = [])); a.push(e); }
    }
  }
  _rstamp = new Int32Array(n); _rbest = new Array(n).fill(null);
  return (_rgrid = g);
}
let _rstamp = null, _rbest = null, _rseq = 0;      // per-road "seen in this query" stamps instead of a Map per call (the result list keeps the first-found order, then the stable sort by gap, as before)
/** Roads whose EDGE lies within r metres of (x,z) (r = 0: the point is on the road). Returns [{ road, w, dist, gap, x, z, tx, tz }] sorted by `gap`,
 *  dist = distance to the centreline, gap = dist - w/2 (negative inside the carriageway), (x,z) = closest centreline point, (tx,tz) = unit tangent.
 *  opts.drivable: only roads for vehicles (default false = every way, footways included). opts.name: only roads with that name. Tunnels (metro underpasses, building arches) are ignored. */
export function roadsNear(x, z, r = 0, opts = {}) {
  const g = roadGrid(), out = [], stamp = ++_rseq, drivable = !!opts.drivable, name = opts.name;
  const cx0 = Math.floor((x - r - 10) / RCELL), cx1 = Math.floor((x + r + 10) / RCELL), cz0 = Math.floor((z - r - 10) / RCELL), cz1 = Math.floor((z + r + 10) / RCELL);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const list = g.get(RKEY(cx, cz)); if (!list) continue;
    for (let q = 0; q < list.length; q++) {
      const s = list[q];
      if (drivable && !s.drv) continue;
      if (name !== undefined && s.r.name !== name) continue;
      const reach = r + s.w / 2; if (x < s.x0 - reach || x > s.x1 + reach || z < s.z0 - reach || z > s.z1 + reach) continue;      // farther than r + w/2 from the segment box: gap > r for sure
      const p = s.r.pts, i = s.i, ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, l2 = dx * dx + dz * dz || 1;
      let t = ((x - ax) * dx + (z - az) * dz) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz), gap = d - s.w / 2;
      if (gap > r) continue;
      const ri = s.ri;
      if (_rstamp[ri] !== stamp) { _rstamp[ri] = stamp; const l = Math.sqrt(l2); out.push((_rbest[ri] = { road: s.r, w: s.w, dist: d, gap, x: px, z: pz, tx: dx / l, tz: dz / l })); }
      else { const b = _rbest[ri]; if (gap < b.gap) { const l = Math.sqrt(l2); b.dist = d; b.gap = gap; b.x = px; b.z = pz; b.tx = dx / l; b.tz = dz / l; } }
    }
  }
  return out.sort((a, b) => a.gap - b.gap);
}
/** The road with the smallest edge gap around (x,z) within maxDist metres of its edge (default 30), or null. opts.drivable / opts.named (only roads that have a name). */
export function nearestRoad(x, z, opts = {}) {
  const list = roadsNear(x, z, opts.maxDist ?? 30, opts);
  return (opts.named ? list.find((h) => h.road.name) : list[0]) || null;
}
/** True when (x,z) is on a carriageway (or within `margin` metres of its edge). Default: vehicle roads only; pass { all: true } to include footways. */
export function isOnRoad(x, z, margin = 0, opts = {}) { return roadsNear(x, z, margin, { drivable: !opts.all }).length > 0; }

// ---------------------------------------------------------------- lighting
// Direction TO the sun: a summer afternoon at 60 N (docs/research/streets.md: ~15:00 the sun stands in the SW-S at ~46 deg; at ~19:10 it lines up with Nevsky). The `look`
// work (sky / time of day) replaces this by a proper table; it is only the initial direction: azimuth ~225 deg (south-west), elevation ~42 deg.
export const SUN_DIR = [-0.473, 0.707, 0.526];   // day preset from the look work: azimuth 222, 45 deg up (~15:20)

// ---------------------------------------------------------------- ground holes (shafts of the metro that open in the street ground plane)
/** Rectangles { x, z, w, d, rotY } in which the street ground plane (y = 0) has NO surface because a metro stair / escalator shaft opens there. The metro module
 *  fills it (data/metro is its own business); the environment module's ground mesh skips these cells. Declared in data/metro.js (SHAFTS, owned by the metro module). */
export const GROUND_HOLES = SHAFTS;
/** Openings through building walls (metro portals): colliders are split around them by lib/massing.js; the facade owner draws an arch / door there. Declared in data/metro.js (metro module). */
export { DOORWAYS };

// ---------------------------------------------------------------- named areas for the HUD location toast (first match wins)
// shapes: { poly: [x,z,...], margin? (m around the polygon) } | { c: [x,z], r } | { x0, x1, z0, z1 } | { road: 'Невский проспект' } (nearest road of that name within 22 m)
const _sqArea = AREA_DATA.find((a) => a.id === 'w638352776');
const _sqPolys = _sqArea ? _sqArea.polys.map((p) => p.o) : [];
const _groupPolys = (g, m) => groupMembers(g.key).filter((b) => !b.skip).flatMap((b) => b.polys.map((p) => ({ poly: p.o, margin: m })));
const distToRing = (o, x, z) => { let d = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const ax = o[j], az = o[j + 1], dx = o[i] - ax, dz = o[i + 1] - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
/** Footprint polygons (+ margin) of the non-part buildings whose OSM name / alt_name matches `re`; `fallback` ({ c, r } circle) when none is mapped under that name, else nothing. */
function _named(re, margin, fallback) {
  const out = [];
  for (const b of BUILDINGS) { if (b.part || !((b.name && re.test(b.name)) || (b.tags && b.tags.alt_name && re.test(b.tags.alt_name)))) continue; for (const p of b.polys) out.push({ poly: p.o, margin }); }
  return out.length ? out : fallback ? [fallback] : [];
}
/** Outer rings of the named square / paving polygons (AREAS data: place=square, pedestrian areas) whose name matches `re`. */
const _areaPolys = (re) => AREA_DATA.filter((a) => a.name && re.test(a.name)).flatMap((a) => a.polys.map((p) => p.o));
/** Distance (m) from (x,z) to the water edge of the RIVER records with these keys ('moika', 'griboedov', 'winter-canal', 'neva', ...), 0 on the water. */
function _shoreOf(keys, x, z) {
  let d = 1e4;
  for (const r of RIVER || []) { if (!keys.includes(r.key)) continue; for (const l of r.line || []) for (let i = 0; i + 3 < l.length; i += 2) {
    const ax = l[i], az = l[i + 1], dx = l[i + 2] - ax, dz = l[i + 3] - az, t = clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t) - (r.width || 20) / 2);
  } }
  return Math.max(0, d);
}
// a bridge deck as an area: within w/2 of the segment a-b
const _deck = (name, a, b, w) => ({ name, x0: Math.min(a[0], b[0]) - w, x1: Math.max(a[0], b[0]) + w, z0: Math.min(a[1], b[1]) - w, z1: Math.max(a[1], b[1]) + w,
  test: (x, z) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t) <= w / 2; } });
// the two banks of the Malaya Neva (Birzhevoy Bridge north end -> Tuchkov Bridge north end) and the north bank of the Bolshaya Neva (Palace Bridge -> Mendeleevskaya line): district fallbacks
const _malayaZ = (x) => -1700 + 0.2558 * (x + 2650), _bolshayaZ = (x) => -1088 - 0.6168 * (x + 2502);
export const AREAS = [
  { name: 'Троице-Измайловский собор · Trinity Cathedral', c: [-2540.1, 1777.2], r: 145 },
  { name: 'Витебский вокзал · Vitebsky Station', c: [-1260, 1376], r: 130 },
  { name: 'Технологический институт · Technological Institute', c: [-1840, 1555], r: 110 },
  { name: 'Ново-Московский мост · Обводный канал', c: [-1838.1, 2651], r: 95 },
  { name: 'Московские триумфальные ворота · Moscow Gate', c: [-1780.9, 4569.8], r: 130 },
  { name: 'Московский парк Победы · Victory Park', x0: -1720, x1: -600, z0: 6700, z1: 7880 },
  { name: 'Чесменская церковь · Chesme Church', c: [-1139.7, 8408.5], r: 80 },
  { name: 'Московская площадь · Moscow Square', c: [-1510, 8940], r: 240 },
  { name: 'Московский проспект · Moskovsky Prospekt', road: 'Московский проспект' },
  // ---- Petrograd side and the Spit of Vasilievsky Island (2026-10): bridges and single sights first, the island and the parks after them, the districts at the very end of the table
  _deck('Троицкий мост · Trinity Bridge', [-1217.4, -1567.2], [-1433.9, -2076.9], 30),
  _deck('Дворцовый мост · Palace Bridge', [-2344.2, -871.2], [-2495.5, -1075.8], 32),
  _deck('Биржевой мост · Birzhevoy (Exchange) Bridge', [-2680, -1425.3], [-2664.9, -1663.5], 30),
  _deck('Тучков мост · Tuchkov Bridge', [-3746.4, -1756.4], [-3622.5, -1938.6], 30),
  _deck('Сампсониевский мост · Sampsonievsky Bridge', [-884.5, -2834.5], [-678.2, -2849.5], 28),
  _deck('Иоанновский мост · Ioannovsky Bridge', [-1642.2, -2117.2], [-1599.5, -2251.5], 14),
  { name: 'Петропавловский собор · Peter and Paul Cathedral', c: [-1946.3, -1981.7], r: 42 },
  { name: 'Монетный двор · Mint', c: [-2046.8, -1911.3], r: 42 },
  { name: 'Невские ворота · Комендантская пристань', c: [-1836.7, -1868], r: 26 },
  { name: 'Петропавловская крепость · Peter and Paul Fortress', poly: FORTRESS_ISLAND.flat(), margin: 22 },
  { name: 'Ростральные колонны · Rostral Columns', c: [-2585.1, -1364.3], r: 22 }, { name: 'Ростральные колонны · Rostral Columns', c: [-2481.4, -1190.1], r: 22 },
  ..._named(/Санкт-Петербургская Биржа/i, 16, { c: [-2590, -1245], r: 60 }).map((r) => ({ name: 'Биржа · Old Stock Exchange', ...r })),
  { name: 'Пушкинский Дом · Pushkin House (Customs house)', c: [-2797.2, -1380.1], r: 45 },
  { name: 'Стрелка Васильевского острова · Spit of Vasilievsky Island', c: [-2500, -1290], r: 120 },
  { name: 'Кунсткамера · Kunstkamera', c: [-2613.3, -1012.9], r: 58 },
  { name: 'Академия наук · Academy of Sciences', c: [-2705.1, -940.4], r: 52 },
  { name: 'Памятник Ломоносову · Lomonosov monument', c: [-2777.2, -905.9], r: 22 },
  ..._named(/Двенадцати коллегий/i, 14, { c: [-2910, -1030], r: 60 }).map((r) => ({ name: 'Двенадцать коллегий · Twelve Collegia (University)', ...r })),
  { name: 'Соборная мечеть · Cathedral Mosque', c: [-1527.5, -2530.7], r: 48 },
  { name: 'Особняк Кшесинской · Kshesinskaya Mansion', c: [-1492, -2446.8], r: 40 },
  { name: 'Троицкая площадь · Troitskaya Square', c: [-1420, -2195], r: 105 },
  { name: 'Памятник Горькому · Gorky monument', c: [-1757.5, -2711.3], r: 26 },
  { name: 'Спуск со львами Ши-цза · Shi-Tsza lions', c: [-1111.7, -2246.4], r: 20 },
  { name: 'Домик Петра I · Cabin of Peter the Great', c: [-1140, -2312], r: 38 },
  { name: 'Нахимовское училище · Nakhimov Naval School', c: [-852.1, -2584.6], r: 46 },
  { name: 'Крейсер «Аврора» · Cruiser Aurora', c: [-760, -2550], r: 85 },
  { name: 'Обелиск декабристам · Decembrists obelisk', c: [-1853.3, -2342.9], r: 22 },
  { name: 'Артиллерийский музей · Artillery Museum (Kronverk)', c: [-2081, -2345], r: 135 },
  { name: 'Памятник «Стерегущему» · Steregushchy monument', c: [-1704, -2568.3], r: 26 },
  { name: 'Метро «Горьковская» · Gorkovskaya', c: [-1822.5, -2672], r: 30 },
  { name: 'Мюзик-холл · Music Hall', c: [-2287, -2536], r: 45 }, { name: 'Планетарий · Planetarium', c: [-2244.8, -2562], r: 30 }, { name: 'Балтийский дом · Baltic House', c: [-2163.8, -2620], r: 40 },
  { name: 'Ленинградский зоопарк · Leningrad Zoo', x0: -2503, x1: -2250, z0: -2358, z1: -1948, test: (x, z) => !_waterwayAt(x, z) },
  ...GREEN.filter((g) => g.name === 'Александровский парк').flatMap((g) => g.polys.map((p) => ({ name: 'Александровский парк · Alexander Park', poly: p.o, margin: 6 }))),
  { name: 'Площадь Льва Толстого · Lev Tolstoy Square', c: [-2198, -3714], r: 58 },
  { name: 'Австрийская площадь · Austrian Square', c: [-1906, -3065], r: 50 },
  { name: 'Князь-Владимирский собор · Prince Vladimir Cathedral', c: [-3113.5, -2145.4], r: 60 },
  { name: 'Дворец спорта «Юбилейный» · Yubileyny Sports Palace', c: [-3312.5, -1989.5], r: 72 },
  { name: 'Тучков буян · Tuchkov Buyan', c: [-3401.3, -1843.4], r: 70 },
  { name: 'Стадион «Петровский» · Petrovsky Stadium', c: [-3641.5, -2180.6], r: 115 },
  // ---- Vasilievsky Island (2026-10): the bridge, then the sights from the Spit to the Gulf (east to west), then the named parks, cemeteries and districts; the streets and the fallbacks stand at the end of the table
  _deck('Благовещенский мост · Blagoveshchensky Bridge', [-3376.35, -112.95], [-3520.6, -412.7], 40),
  { name: 'Египетские сфинксы · Egyptian Sphinxes', c: [-3378, -507.5], r: 42 },
  ..._named(/Российская академия художеств|Академия художеств/i, 45, { c: [-3431, -597], r: 95 }).map((r) => ({ name: 'Академия художеств · Academy of Arts', ...r })),
  { name: 'Дом академиков · House of Academicians', c: [-3678, -488], r: 45 },
  { name: 'Площадь Трезини · Trezzini Square', c: [-3545, -505], r: 50 },
  { name: 'Академический сад · Academy Garden', c: [-3510, -705], r: 80 },
  { name: 'Меншиковский дворец · Menshikov Palace', c: [-3099, -721], r: 62 },
  { name: 'Первый кадетский корпус · First Cadet Corps', c: [-3178, -819], r: 70 },
  ...GREEN.filter((g) => g.name === 'Румянцевский сад').flatMap((g) => g.polys.map((p) => ({ name: 'Румянцевский сад · Rumyantsev Garden', poly: p.o, margin: 4 }))),
  { name: 'Румянцевский спуск · Rumyantsev Descent', c: [-3208, -590], r: 45 },
  { name: 'Андреевский собор · St Andrew Cathedral', c: [-3803, -821], r: 55 },
  { name: 'Андреевский рынок · Andreyevsky Market', c: [-3713, -679], r: 55 },
  ...GREEN.filter((g) => g.name === 'Андреевский бульвар').flatMap((g) => g.polys.map((p) => ({ name: 'Андреевский бульвар · Andreyevsky Boulevard', poly: p.o, margin: 6 }))),
  { name: 'Морской кадетский корпус · Naval Cadet Corps', c: [-4047.5, -336.6], r: 90 },
  { name: 'Памятник Крузенштерну · Krusenstern monument', c: [-3984, -242], r: 35 },
  { name: 'Подводная лодка С-189 · Submarine S-189', c: [-4236, 26], r: 50 },
  { name: 'Горный университет · Mining University', c: [-4565, 360], r: 75 },
  { name: 'Ледокол «Красин» · Icebreaker Krasin', c: [-4600, 512], r: 48 },
  { name: 'Дом Евангелия · House of the Gospel', c: [-4917, 148], r: 35 },
  { name: 'Трамвайный парк · Tram Depot', c: [-5100, -710], r: 115 },
  { name: 'Башня Чернихова · Chernikhov Tower', c: [-4747, 499], r: 40 },
  { name: 'Эрарта · Erarta Museum', c: [-5593, 25], r: 58 },
  { name: 'Дворец культуры имени Кирова · Kirov Palace of Culture', c: [-5449, -145], r: 90 },
  { name: 'Сад «Василеостровец» · Vasileostrovets Garden', c: [-5450, -230], r: 60 },
  { name: 'Часовня Ксении Блаженной · Chapel of St Xenia', c: [-5588, -1326], r: 32 },
  { name: 'Смоленская церковь · Smolensk Icon Church', c: [-5612, -1525], r: 50 },
  ...GREEN.filter((g) => g.name === 'Смоленское православное кладбище').flatMap((g) => g.polys.map((p) => ({ name: 'Смоленское кладбище · Smolensky Cemetery', poly: p.o, margin: 8 }))),
  ...GREEN.filter((g) => g.name === 'Смоленское лютеранское кладбище').flatMap((g) => g.polys.map((p) => ({ name: 'Смоленское лютеранское кладбище · Smolensky Lutheran Cemetery', poly: p.o, margin: 6 }))),
  ...GREEN.filter((g) => g.name === 'Смоленское армяно-григорианское кладбище').flatMap((g) => g.polys.map((p) => ({ name: 'Смоленское армянское кладбище · Smolensky Armenian Cemetery', poly: p.o, margin: 6 }))),
  { name: 'Церковь «Милующая» · Church of the Merciful Icon', c: [-5937, 540], r: 70 },
  { name: 'Севкабель Порт · Sevkabel Port', c: [-6149, 933], r: 170 },
  { name: 'Особняк Брусницыных · Brusnitsyn Mansion', c: [-5608, 1078], r: 70 },
  { name: 'Скобский дворец · Skobsky Palace', c: [-5474, 1127], r: 45 },
  { name: 'Морской вокзал · Sea Terminal', c: [-6519, 709], r: 150 },
  { name: 'Площадь Морской Славы · Sea Glory Square', c: [-6324, 649], r: 120 },
  { name: 'Подводная лодка Д-2 · Submarine D-2', c: [-6598, -66], r: 55 },
  { name: 'Кроншпицы Галерной гавани · Kronshpitsy', c: [-6958, 402], r: 55 },
  { name: 'Шкиперский мост · Shkipersky Bridge', c: [-7010, -31], r: 35 },
  { name: 'Гаванский городок · Gavan Quarter', c: [-6289, -667], r: 110 },
  { name: 'Памятник Петру I · Peter I monument', c: [-7477, -791], r: 40 },
  { name: 'Гостиница «Прибалтийская» · Pribaltiyskaya Hotel', c: [-7600, -735], r: 175 },
  { name: 'Памятник крейсеру «Киров» · Cruiser Kirov monument', c: [-7970, -1075], r: 65 },
  ...GREEN.filter((g) => g.name === 'сквер Малые Гаванцы').flatMap((g) => g.polys.map((p) => ({ name: 'Сквер Малые Гаванцы · Malye Gavantsy Square', poly: p.o, margin: 4 }))),
  ..._named(/Морской фасад/i, 40, { c: [-9040, -1750], r: 450 }).map((r) => ({ name: 'Морской фасад · Marine Facade', ...r })),
  { name: 'Голден Сити · Golden City', c: [-9149, -1078], r: 150 },
  { name: 'Голден Сити · Golden City', c: [-8700, -900], r: 140 },
  { name: 'Горный институт · Gorny Institut metro', c: [-5036, -5], r: 55 },
  { name: 'Памятник Каподистрии · Kapodistrias monument', c: [792.7, -453], r: 45 },
  // ---- Mars Field / Summer Garden / Engineering Castle (2026-10): specific sights first, then the outlines of the Field and the Garden
  // ---- south-west (2026-10): Teatralnaya Square, Mariinsky, Yusupov, New Holland, Nikolsky
  ..._named(/^Мариинский театр$/i, 14, { c: [-3095, 773], r: 70 }).map((r) => ({ name: 'Мариинский театр · Mariinsky Theatre', ...r })),
  ..._named(/Мариинский-2/i, 10, { c: [-3189, 806], r: 60 }).map((r) => ({ name: 'Мариинский-2 · Mariinsky II', ...r })),
  { name: 'Консерватория Римского-Корсакова · Rimsky-Korsakov Conservatory', c: [-2975, 714], r: 55 },
  { name: 'Театральная площадь · Teatralnaya Square', c: [-3040, 740], r: 110 },
  ..._named(/Юсуповский дворец/i, 12, { c: [-2918, 342], r: 80 }).filter((r) => !r.poly || r.poly[0] < -2500).map((r) => ({ name: 'Юсуповский дворец · Yusupov Palace', ...r })),
  { name: 'Новая Голландия · New Holland', c: [-3440, 330], r: 235 },
  ..._named(/Никольский собор/i, 14, { c: [-2862, 1105], r: 70 }).map((r) => ({ name: 'Никольский Морской собор · St Nicholas Naval Cathedral', ...r })),
  ..._named(/Колокольня Никольского/i, 10, { c: [-2959, 1147], r: 30 }).map((r) => ({ name: 'Колокольня Никольского собора · Nikolsky bell tower', ...r })),
  { name: 'Никольская площадь · Nikolskaya Square', c: [-2900, 1120], r: 130 },
  { name: 'Мемориал «Борцам революции» · Eternal Flame', c: [-1086, -1243], r: 32 },
  { name: 'Суворовская площадь · Suvorov Square', c: [-1197, -1502], r: 55 },
  { name: 'Михайловский замок · Mikhailovsky (Engineers) Castle', c: [-735, -790], r: 130 },
  ..._named(/Мраморный дворец/i, 12, { c: [-1376, -1417], r: 70 }).map((r) => ({ name: 'Мраморный дворец · Marble Palace', ...r })),
  { name: 'Павловские казармы · Pavlovsky Barracks', c: [-1270, -1276], r: 80 },
  ..._named(/Летний дворец/i, 10, { c: [-849, -1650], r: 30 }).map((r) => ({ name: 'Летний дворец Петра I · Summer Palace of Peter I', ...r })),
  ...GREEN.filter((g) => g.name === 'Марсово поле').flatMap((g) => g.polys.map((p) => ({ name: 'Марсово поле · Mars Field', poly: p.o, margin: 4 }))),
  ...GREEN.filter((g) => g.name === 'Летний сад').flatMap((g) => g.polys.map((p) => ({ name: 'Летний сад · Summer Garden', poly: p.o, margin: 6 }))),
  { name: 'Смольный собор · Smolny Cathedral', c: [2469,-1833], r: 140 },
  { name: 'Смольный институт · Smolny Institute', c: [2518,-1544], r: 115 },
  { name: 'Таврический дворец · Tauride Palace', c: [1379,-1734], r: 95 },
  { name: 'Таврический сад · Tauride Garden', x0: 910, x1: 1500, z0: -1785, z1: -1250 },
  { name: 'Парадный квартал · Paradny Quarter', x0: 790, x1: 1120, z0: -1170, z1: -820 },
  { name: 'Спасо-Преображенский собор · Transfiguration Cathedral', c: [66,-1182], r: 75 },
  { name: 'Чернышевская · Chernyshevskaya', c: [467,-1351], r: 55 },
  { name: 'Подписные Издания · Bookshop', c: [-201,-222], r: 28 },
  { name: 'Площадь Александра Невского · Alexander Nevsky Square', c: [1940, 978], r: 95 },
  { name: 'Троицкий собор · Holy Trinity Cathedral', c: [2089, 1260], r: 65 },
  { name: 'Александро-Невская лавра · Alexander Nevsky Lavra', x0: 1870, x1: 2195, z0: 1100, z1: 1440 },
  { name: 'Феодоровский собор · Feodorovsky Cathedral', c: [973, 718], r: 50 },
  { name: 'Синопская набережная · Neva Embankment', x0: 2080, x1: 2360, z0: -405, z1: 1050, test: (x, z) => x > 2080 && x < 2360 && z > -405 && z < 1050 },
  { name: 'Аничков мост · Anichkov Bridge', c: [-441, -93], r: 42 },
  { name: 'Обелиск «Городу-герою Ленинграду» · Hero City obelisk', c: [592, 165], r: 24 },
  ..._groupPolys(SUBGROUPS.station, 12).map((r) => ({ name: 'Московский вокзал · Moscow Railway Station', ...r })),
  { name: 'Платформы Московского вокзала · Station platforms', x0: 560, x1: 780, z0: 420, z1: 1100 },
  ..._sqPolys.map((o) => ({ name: 'Площадь Восстания · Vosstaniya Square', poly: o })),
  ..._groupPolys(SUBGROUPS.oktyabrskaya, 8).map((r) => ({ name: 'Гостиница «Октябрьская» · Hotel Oktyabrskaya', ...r })),
  ..._groupPolys(SUBGROUPS['nevsky-centre'], 6).map((r) => ({ name: 'Невский Центр · Nevsky Centre', ...r })),
  ..._groupPolys(SUBGROUPS.beloselsky, 8).map((r) => ({ name: 'Дворец Белосельских-Белозерских · Beloselsky-Belozersky Palace', ...r })),
  ..._groupPolys(SUBGROUPS.vladimirsky, 10).map((r) => ({ name: 'Владимирский собор · Vladimirsky Cathedral', ...r })),
  ..._groupPolys(SUBGROUPS.library, 6).map((r) => ({ name: 'Российская национальная библиотека · National Library', ...r })),
  // ---- the western extension: sights (outline of the named OSM building + margin; the circle is the fallback when OSM has no such outline), squares, waterways, streets.
  // The landmark GROUPS of these sights are added later (from the research dossiers); until then the areas find the buildings by their OSM names.
  ..._named(/Казанский собор/i, 14, { c: [-1568, -186], r: 90 }).map((r) => ({ name: 'Казанский собор · Kazan Cathedral', ...r })),
  ..._named(/Дом Зингера|Дом книги/i, 8, { c: [-1420, -383], r: 32 }).map((r) => ({ name: 'Дом Зингера · Singer House', ...r })),
  ..._named(/Гостиный двор/i, 8, null).map((r) => ({ name: 'Гостиный Двор · Gostiny Dvor', ...r })),
  ..._named(/Александринск/i, 8, null).map((r) => ({ name: 'Александринский театр · Alexandrinsky Theatre', ...r })),
  ..._named(/Строгановск/i, 8, null).map((r) => ({ name: 'Строгановский дворец · Stroganov Palace', ...r })),
  ..._named(/Спас на Крови|Воскресения Христова/i, 12, { c: [-1265, -854], r: 60 }).map((r) => ({ name: 'Спас на Крови · Church of the Saviour on Blood', ...r })),
  ..._named(/Михайловский замок|Инженерный замок/i, 10, null).map((r) => ({ name: 'Михайловский замок · Mikhailovsky (Engineers) Castle', ...r })),
  ..._named(/(?<![\p{L}-])Михайловский дворец|Русский музей/iu, 10, null).map((r) => ({ name: 'Михайловский дворец · Mikhailovsky Palace (Russian Museum)', ...r })),
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
  // Vasilievsky Island: the named streets (OSM names; a street name wins only where no sight above claimed the point), then the parts of the island that have their own name
  { name: 'Университетская набережная · Universitetskaya embankment', road: 'Университетская набережная' },
  { name: 'Набережная Лейтенанта Шмидта · Lieutenant Schmidt embankment', road: 'набережная Лейтенанта Шмидта' },
  { name: 'Набережная Макарова · Makarova embankment', road: 'набережная Макарова' },
  { name: 'Кадетская линия · Kadetskaya liniya', road: 'Кадетская линия В.О.' },
  { name: 'Большой проспект В.О. · Bolshoy Prospekt V.O.', road: 'Большой проспект В.О.' },
  { name: 'Средний проспект В.О. · Sredny Prospekt V.O.', road: 'Средний проспект В.О.' },
  { name: 'Малый проспект В.О. · Maly Prospekt V.O.', road: 'Малый проспект В.О.' },
  { name: 'Кожевенная линия · Kozhevennaya liniya', road: 'Кожевенная линия' },
  { name: 'Новосмоленская набережная · Novosmolenskaya embankment', road: 'Новосмоленская набережная' },
  { name: 'Шкиперский проток · Shkipersky Protok', road: 'Шкиперский проток' },
  { name: 'Среднегаванский проспект · Srednegavansky Prospekt', road: 'Среднегаванский проспект' },
  { name: 'Гаванская улица · Gavanskaya ulitsa', road: 'Гаванская улица' },
  { name: 'Улица Беринга · Ulitsa Beringa', road: 'улица Беринга' },
  { name: 'Наличная улица · Nalichnaya ulitsa', road: 'Наличная улица' },
  { name: 'Морская набережная · Morskaya embankment', road: 'Морская набережная' },
  { name: 'Галерная гавань · Galerny Harbour', x0: -7300, x1: -6700, z0: -330, z1: 450, test: (x, z) => inIsland(x, z) },
  { name: 'Гавань · Gavan', x0: -7300, x1: -5900, z0: -750, z1: 650, test: (x, z) => inIsland(x, z) },
  { name: 'Смоленское поле · Smolenskoe Pole', x0: -5700, x1: -5300, z0: -300, z1: 120, test: (x, z) => inIsland(x, z) },
  { name: 'Морской фасад · Marine Facade', x0: -9500, x1: -8600, z0: -2400, z1: -1050, test: (x, z) => inIsland(x, z) },
  ...GREEN.filter((g) => g.name === 'Остров Декабристов').flatMap((g) => g.polys.map((p) => ({ name: 'Остров Декабристов · Dekabristov Island', poly: p.o, margin: 0 }))),
  { name: 'Остров Декабристов · Dekabristov Island', x0: -9800, x1: -4960, z0: -2700, z1: -1300, test: (x, z) => !inIsland(x, z) },       // north of the Smolenka (outside the island outline, west of the Petrograd-side fallback below)
  // district fallbacks of the north bank (after every street / square name): the Petrograd side north of the Malaya Neva and of the Kronverksky strait, Vasilievsky Island between the two Nevas
  { name: '2-й Елагин мост · 2nd Yelagin Bridge', x0: -5290, x1: -5125, z0: -4905, z1: -4770 },
  { name: 'Крестовский остров · Krestovsky Island', poly: KRESTOVSKY_ISLAND },
  { name: 'Елагин остров · Yelagin Island', poly: ISLANDS2_COAST.yelagin },
  { name: 'Каменный остров · Kamenny Island', poly: ISLANDS2_COAST.kamenny },
  { name: 'Аптекарский остров · Aptekarsky Island', poly: ISLANDS2_COAST.aptekarsky },
  { name: 'Петровский остров · Petrovsky Island', poly: ISLANDS2_COAST.petrovsky },
  { name: 'Серный остров · Serny Island', poly: ISLANDS2_COAST.serny },
  { name: 'Петроградская сторона · Petrograd Side', x0: -4950, x1: -550, z0: -4260, z1: -1700, test: (x, z) => z < (x <= -2450 ? _malayaZ(x) - 30 : -2235) },
  { name: 'Васильевский остров · Vasilievsky Island', x0: -3950, x1: -2400, z0: -1800, z1: -700, test: (x, z) => z > _malayaZ(x) + 30 && z < _bolshayaZ(x) + 40 },
  { name: 'Васильевский остров · Vasilievsky Island', x0: -9800, x1: -2400, z0: -2600, z1: 1600, test: (x, z) => inIsland(x, z) },       // the rest of the island (frame rectangles V3..V12, lib/vo-island.js)
  { name: 'Санкт-Петербург · Saint Petersburg', x0: -9999, x1: 9999, z0: -9999, z1: 9999 },
];
/** Name of the area at (x,z) for the HUD toast ('' never: the last entry matches everything). */
export function areaAt(x, z) {
  let near = null;
  for (const a of AREAS) {
    if (a.poly) { if (ringHas(a.poly, x, z) || (a.margin && distToRing(a.poly, x, z) <= a.margin)) return a.name; }
    else if (a.test) { if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1 && a.test(x, z)) return a.name; }
    else if (a.c) { if (Math.hypot(x - a.c[0], z - a.c[1]) <= a.r) return a.name; }
    else if (a.road) { near = near || roadsNear(x, z, 22, { drivable: true }); if (near.some((s) => s.road.name === a.road)) return a.name; }
    else if (x >= a.x0 && x <= a.x1 && z >= a.z0 && z <= a.z1) return a.name;
  }
  return NAMES.place;
}

// ---------------------------------------------------------------- viewpoints (keys 1..5) and the hero camera
// Every pose is a free, walkable spot (tools/layout-test.mjs checks insideBuilding / isOnRoad / line of sight). x, z, yaw (deg, 0 = north, 90 = west), pitch (deg).
// PROVISIONAL until the modules are built: retune with `node tools/layout-test.mjs` and screenshots (see docs/HANDOFF.md).
export const HERO = { x: 560, z: 192, yaw: yawToward(560, 192, 598, 235), pitch: 8 };      // Vosstaniya Square, looking at the obelisk and the Moscow station's clock tower
export const VIEWS = [
  { key: 'Digit1', label: 'Площадь Восстания · Московский вокзал', x: 560, z: 192, yaw: yawToward(560, 192, 598, 235), pitch: 8 },
  { key: 'Digit2', label: 'Обелиск Городу-герою Ленинграду', x: 576, z: 209, yaw: yawToward(576, 209, 592, 165), pitch: 22 },
  { key: 'Digit3', label: 'Невский проспект', x: 502, z: 158, yaw: yawToward(502, 158, 380, 130), pitch: 4 },
  { key: 'Digit4', label: 'Платформы Московского вокзала', x: 644.8, z: 520, yaw: yawToward(644.8, 520, 700, 800), pitch: 3 },
  { key: 'Digit5', label: 'Аничков мост', x: -395, z: -108, yaw: yawToward(-395, -108, -470, -92), pitch: 6 },
  { key: 'Digit6', label: 'Старо-Невский проспект', x: 1202, z: 491, yaw: -125, pitch: 3 },
  { key: 'Digit7', label: 'Александро-Невская лавра', x: 1940, z: 976, yaw: -153, pitch: 12 },
  { key: 'Digit8', label: 'Синопская набережная · Нева', x: 2160, z: 600, yaw: -120, pitch: 2 },
  { key: 'ShiftDigit1', label: 'Подписные Издания', x: -184, z: -222, yaw: 90, pitch: 12 },
  { key: 'ShiftDigit2', label: 'Спасо-Преображенский собор', x: 22, z: -1186, yaw: -95, pitch: 18 },
  { key: 'ShiftDigit3', label: 'Чернышевская', x: 444, z: -1351, yaw: -90, pitch: 10 },
  { key: 'ShiftDigit4', label: 'Парадный квартал', x: 915, z: -1010, yaw: -60, pitch: 18 },
  { key: 'ShiftDigit5', label: 'Таврический сад', x: 1390, z: -1457, yaw: 0, pitch: 0 },
  { key: 'ShiftDigit6', label: 'Смольный собор', x: 2335, z: -1833, yaw: -90, pitch: 21 },
  // the west (Nevsky to the Admiralty): 9 / 0 and Shift + 7..9 (Shift + 1..6 are the north of the centre)
  { key: 'Digit9', label: 'Казанский собор', x: -1470, z: -312, yaw: yawToward(-1470, -312, -1482, -235), pitch: 8 },
  { key: 'Digit0', label: 'Дворцовая площадь · Александровская колонна', x: -1985, z: -715, yaw: yawToward(-1985, -715, -2096, -896), pitch: 6 },
  { key: 'ShiftDigit7', label: 'Адмиралтейство · Александровский сад', x: -2380, z: -470, yaw: yawToward(-2380, -470, -2433, -621), pitch: 10 },
  { key: 'ShiftDigit8', label: 'Исаакиевский собор', x: -2440, z: -60, yaw: yawToward(-2440, -60, -2523, -185), pitch: 12 },
  { key: 'ShiftDigit9', label: 'Медный всадник · Сенатская площадь', x: -2715, z: -425, yaw: yawToward(-2715, -425, -2745, -444), pitch: 6 },
  { key: 'ShiftDigit0', label: 'Дом Мурузи', x: -154, z: -1170, yaw: -137, pitch: 22 },
  // Mars Field / Summer Garden / Engineering Castle: Alt + 1..7
  { key: 'AltDigit1', label: 'Марсово поле · Вечный огонь', x: -1072, z: -1207, yaw: yawToward(-1072, -1207, -1086, -1243), pitch: 6 },
  { key: 'AltDigit2', label: 'Суворовская площадь · памятник Суворову', x: -1190.5, z: -1474.6, yaw: yawToward(-1190.5, -1474.6, -1197, -1502), pitch: 8 },
  { key: 'AltDigit3', label: 'Летний сад · ограда и главные ворота', x: -948.1, z: -1657.2, yaw: yawToward(-948.1, -1657.2, -968, -1639), pitch: 8 },
  { key: 'AltDigit4', label: 'Летний сад · Главная аллея', x: -963, z: -1626, yaw: -160.6, pitch: 2 },
  { key: 'AltDigit5', label: 'Михайловский замок · памятник Петру I', x: -700, z: -715, yaw: yawToward(-700, -715, -745, -840), pitch: 10 },
  { key: 'AltDigit6', label: 'Лебяжья канавка · Верхний Лебяжий мост', x: -1055.8, z: -1606.2, yaw: yawToward(-1055.8, -1606.2, -1069, -1611), pitch: 4 },
  { key: 'AltDigit7', label: 'Троицкий мост · Суворовская площадь', x: -1190, z: -1535, yaw: yawToward(-1190, -1535, -1225, -1620), pitch: 4 },
  // south-west: Alt + 8, 9, 0, minus
  { key: 'AltDigit8', label: 'Мариинский театр · Театральная площадь', x: -3041.5, z: 737.6, yaw: 123.5, pitch: 8 },
  { key: 'AltDigit9', label: 'Юсуповский дворец · набережная Мойки', x: -2973, z: 282.5, yaw: -137.3, pitch: 10 },
  { key: 'AltDigit0', label: 'Новая Голландия · арка', x: -3396.7, z: 502.4, yaw: -6.9, pitch: 6 },
  { key: 'AltMinus', label: 'Никольский Морской собор', x: -2900, z: 1060, yaw: -139.3, pitch: 12 },
  // Petrograd side and the Spit of Vasilievsky Island: Alt + Shift + 1..0, minus, equals (poses = the photo spots the sight modules publish)
  { key: 'AltShiftDigit1', label: 'Петропавловская крепость · Соборная площадь', x: -2008.5, z: -1945.1, yaw: -56.7, pitch: 24 },
  { key: 'AltShiftDigit2', label: 'Иоанновский мост · ворота крепости', x: -1602.5, z: -2241.6, yaw: 162.3, pitch: 4 },
  { key: 'AltShiftDigit3', label: 'Стрелка Васильевского острова · Биржа', x: -2508.4, z: -1293.1, yaw: yawToward(-2508.4, -1293.1, -2590, -1245), pitch: 10 },
  { key: 'AltShiftDigit4', label: 'Стрелка · вид на Петропавловскую крепость', x: -2461.2, z: -1321.2, yaw: yawToward(-2461.2, -1321.2, -1946, -1982), pitch: 2 },
  { key: 'AltShiftDigit5', label: 'Кунсткамера · Университетская набережная', x: -2592.8, z: -995.3, yaw: yawToward(-2592.8, -995.3, -2613.3, -1012.9), pitch: 22 },
  { key: 'AltShiftDigit6', label: 'Троицкая площадь · Соборная мечеть', x: -1578.2, z: -2547, yaw: -107.8, pitch: 14 },
  { key: 'AltShiftDigit7', label: 'Крейсер «Аврора»', x: -769.8, z: -2516.7, yaw: -20.4, pitch: 8 },
  { key: 'AltShiftDigit8', label: 'Артиллерийский музей · Кронверк', x: -2053.5, z: -2270.6, yaw: 14, pitch: 6 },
  { key: 'AltShiftDigit9', label: 'Площадь Льва Толстого · Дом с башнями', x: -2190.6, z: -3707.5, yaw: -69.8, pitch: 16 },
  { key: 'AltShiftDigit0', label: 'Князь-Владимирский собор', x: -3187.2, z: -2153.4, yaw: -96.2, pitch: 16 },
  { key: 'AltShiftMinus', label: 'Домик Петра I · львы Ши-цза', x: -1124.1, z: -2278.4, yaw: 24.2, pitch: 6 },
  { key: 'AltShiftEqual', label: 'Австрийская площадь', x: -1910.6, z: -3060.1, yaw: -103.8, pitch: 14 },
  // Vasilievsky Island (2026-10): nine keys Alt + Shift + [ ] ; ' , . / \ ` (every digit key is taken), the other views live in the Places list only (key 'Place.<id>', group = the optgroup of the list).
  // Poses = the photo spots the sight modules publish through ctx.services.landmarks (tools/views-spots.mjs lists them), moved off the carriageway / out of the water where a spot stood there;
  // tools/views-check.mjs proves every pose (off the roadway, on land, not inside a collider) with the real street network; real-renderer shots in shots/views.
  { key: 'AltShiftBracketLeft', label: 'Академия художеств · сфинксы', x: -3414.6, z: -495.4, yaw: -27.5, pitch: 6, group: 'Васильевский остров' },
  { key: 'AltShiftBracketRight', label: 'Эрарта · музей современного искусства', x: -5556.7, z: 8.8, yaw: 119.7, pitch: 12, group: 'Васильевский остров' },
  { key: 'AltShiftSemicolon', label: 'Смоленское кладбище · часовня Ксении Блаженной', x: -5586.4, z: -1339.4, yaw: -169.7, pitch: 0, group: 'Васильевский остров' },
  { key: 'AltShiftQuote', label: 'Смоленское кладбище · главная аллея', x: -5561, z: -1502.3, yaw: 114.3, pitch: 1, group: 'Васильевский остров' },
  { key: 'AltShiftComma', label: 'Горный университет · колоннада', x: -4551.2, z: 375.2, yaw: 46.4, pitch: 6, group: 'Васильевский остров' },
  { key: 'AltShiftPeriod', label: 'Меншиковский дворец · Университетская набережная', x: -3117.7, z: -677, yaw: -44.2, pitch: 8, group: 'Васильевский остров' },
  { key: 'AltShiftSlash', label: 'Андреевский бульвар · собор', x: -3817, z: -777, yaw: 30, pitch: 6, group: 'Васильевский остров' },
  { key: 'AltShiftBackslash', label: 'Морской вокзал · площадь Морской Славы', x: -6371.5, z: 685.3, yaw: 99, pitch: 6, group: 'Васильевский остров' },
  { key: 'AltShiftBackquote', label: 'Севкабель Порт · набережная', x: -6115.2, z: 1019.2, yaw: 51.5, pitch: 4, group: 'Васильевский остров' },
  // the rest of the island, east to west
  { key: 'Place.blagoveshchensky', label: 'Благовещенский мост', x: -3493.5, z: -439.4, yaw: -168.2, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.academy-sphinx', label: 'Академия художеств · пристань со сфинксами', x: -3382, z: -513.3, yaw: 131.6, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.menshikov-portico', label: 'Меншиковский дворец · портик', x: -3084.8, z: -696, yaw: 30, pitch: 10, group: 'Васильевский остров' },
  { key: 'Place.rumyantsev-fountain', label: 'Румянцевский сад · фонтан', x: -3263, z: -679, yaw: -21.3, pitch: 12, group: 'Васильевский остров' },
  { key: 'Place.makarova-lions', label: 'Набережная Макарова · спуск со львами', x: -2851.3, z: -1437.6, yaw: 0, pitch: 0, group: 'Васильевский остров' },
  { key: 'Place.makarova-yakovlev', label: 'Набережная Макарова · дома Яковлевых', x: -3379, z: -1538, yaw: 104, pitch: 0, group: 'Васильевский остров' },
  { key: 'Place.lutheran-catherine', label: 'Лютеранская церковь Святой Екатерины', x: -3445, z: -1000, yaw: 20.6, pitch: 0, group: 'Васильевский остров' },
  { key: 'Place.andrew-bell', label: 'Андреевский собор · колокольня', x: -3844, z: -802, yaw: -73, pitch: 10, group: 'Васильевский остров' },
  { key: 'Place.pel-tower', label: 'Дом Пеля · угловая башня', x: -3760.5, z: -696.5, yaw: 159, pitch: 14, group: 'Васильевский остров' },
  { key: 'Place.naval-corps', label: 'Морской кадетский корпус', x: -4009.2, z: -240.8, yaw: -6.1, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.krusenstern', label: 'Памятник Крузенштерну · лестница к Неве', x: -3988.4, z: -248.1, yaw: -150.2, pitch: 12, group: 'Васильевский остров' },
  { key: 'Place.s189', label: 'Подводная лодка С-189', x: -4256.5, z: -1.4, yaw: -137.2, pitch: 2, group: 'Васильевский остров' },
  { key: 'Place.mining-hercules', label: 'Горный университет · Геракл и Антей', x: -4555.2, z: 353.3, yaw: -7.5, pitch: 10, group: 'Васильевский остров' },
  { key: 'Place.krasin', label: 'Ледокол «Красин»', x: -4621.4, z: 463.1, yaw: -103.1, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.tram-depot', label: 'Трамвайный парк · памятник трамваю', x: -4970, z: -690, yaw: 30, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.chernikhov-tower', label: 'Башня Чернихова', x: -4803.3, z: 443.7, yaw: 121, pitch: 18, group: 'Васильевский остров' },
  { key: 'Place.gorny-institut', label: 'Горный институт · павильоны метро', x: -5030, z: 2, yaw: 124, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.kirov-palace', label: 'Дворец культуры имени Кирова', x: -5462.5, z: -49.9, yaw: -12.4, pitch: 8, group: 'Васильевский остров' },
  { key: 'Place.smolensk-church', label: 'Смоленская церковь · Смоленское кладбище', x: -5594, z: -1488.9, yaw: 21.9, pitch: 12, group: 'Васильевский остров' },
  { key: 'Place.holy-gates', label: 'Смоленское кладбище · Святые ворота', x: -5474.9, z: -1523.8, yaw: 69, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.trinity-chapel', label: 'Смоленское кладбище · Троицкая часовня', x: -5610.8, z: -1386.4, yaw: -90, pitch: 0, group: 'Васильевский остров' },
  { key: 'Place.brusnitsyn', label: 'Особняк Брусницыных · Кожевенная линия', x: -5623, z: 1106, yaw: -68, pitch: 14, group: 'Васильевский остров' },
  { key: 'Place.sevkabel-tesla', label: 'Севкабель Порт · «катушка Теслы»', x: -6200, z: 858, yaw: 66, pitch: 8, group: 'Васильевский остров' },
  { key: 'Place.sevkabel-square', label: 'Севкабель Порт · морская площадь', x: -6258, z: 862, yaw: -118, pitch: 14, group: 'Васильевский остров' },
  { key: 'Place.gavan-church', label: 'Церковь «Милующая»', x: -5984.3, z: 504.8, yaw: -122, pitch: 20, group: 'Васильевский остров' },
  { key: 'Place.sea-glory', label: 'Площадь Морской Славы · игла', x: -6300, z: 640, yaw: 107.9, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.d2', label: 'Подводная лодка Д-2 «Народоволец»', x: -6630, z: -25, yaw: -13.6, pitch: 3, group: 'Васильевский остров' },
  { key: 'Place.gavan-town', label: 'Гаванский городок', x: -6372, z: -588, yaw: -55, pitch: 8, group: 'Васильевский остров' },
  { key: 'Place.kronshpits', label: 'Галерная гавань · Кроншпицы', x: -6947, z: 345.4, yaw: -166, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.skipper-canal', label: 'Шкиперский проток', x: -6970, z: 150.4, yaw: -177, pitch: 2, group: 'Васильевский остров' },
  { key: 'Place.water-tower', label: 'Галерная гавань · водонапорная башня', x: -7162, z: -228, yaw: -29, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.pribaltiyskaya', label: 'Гостиница «Прибалтийская»', x: -7516.6, z: -772.5, yaw: 114.4, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.peter-tsereteli', label: 'Памятник Петру I · Прибалтийская площадь', x: -7464.1, z: -796.1, yaw: 114.4, pitch: 28, group: 'Васильевский остров' },
  { key: 'Place.kirov-monument', label: 'Памятник крейсеру «Киров»', x: -7992.7, z: -1065.3, yaw: -65.3, pitch: 12, group: 'Васильевский остров' },
  { key: 'Place.golden-city', label: 'Golden City · башни с золотыми коронами', x: -8689.2, z: -805.9, yaw: 5.5, pitch: 18, group: 'Васильевский остров' },
  { key: 'Place.marine-facade-t1', label: 'Морской фасад · терминал 1', x: -9285.5, z: -1208.1, yaw: 19.5, pitch: 4, group: 'Васильевский остров' },
  { key: 'Place.marine-facade-liner', label: 'Морской фасад · круизный лайнер', x: -8700, z: -1500, yaw: 56, pitch: 6, group: 'Васильевский остров' },
  { key: 'Place.house-kollan', label: 'Дом Коллана · три эркера', x: -5754, z: 368, yaw: -150.5, pitch: 8, group: 'Васильевский остров' },
  { key: 'Place.karl-may-school', label: 'Школа Карла Мая · арки и волнистый аттик', x: -4605.1, z: -814.2, yaw: -60.1, pitch: 10, group: 'Васильевский остров' },
  { key: 'Place.oktyabrsky', label: 'БКЗ «Октябрьский» · Лиговский проспект', x: 737.5, z: -344.3, yaw: -50.4, pitch: 8 },
  { key: 'Place.kapodistrias', label: 'Памятник Каподистрии · Греческая площадь', x: 792.7, z: -453, yaw: -27, pitch: 20 },
  { key: 'Place.south-trinity', label: 'Троице-Измайловский собор', x: -2470.9, z: 1843, yaw: 46.4, pitch: 21, group: 'Центр до Обводного' },
  { key: 'Place.petro-red-banner', label: 'Красное знамя · силовая станция', x: -3956, z: -3267, yaw: -130, pitch: 15, group: 'Петроградская сторона' },
  { key: 'Place.petro-sytny', label: 'Сытный рынок · исторический зал', x: -2382, z: -2736, yaw: -93, pitch: 8, group: 'Петроградская сторона' },
  { key: 'Place.petro-printworks', label: 'Печатный двор', x: -3193, z: -3291, yaw: -16, pitch: 12, group: 'Петроградская сторона' },
  { key: 'Place.krestovsky-arena', label: 'Крестовский остров · стадион', x: -7050, z: -4460, yaw: 85, pitch: 12, group: 'Крестовский остров' },
  { key: 'Place.krestovsky-metro', label: 'Метро «Крестовский остров» · парк Победы', x: -5140, z: -4338, yaw: 0, pitch: 8, group: 'Крестовский остров' },
  { key: 'Place.yelagin-palace', label: 'Елагин дворец · западный фасад', x: -4600, z: -5225.9, yaw: -90, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-rotunda', label: 'Елагин дворец · ротонда', x: -4496, z: -5225.9, yaw: 90, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-kitchen', label: 'Кухонный корпус · четырнадцать статуй', x: -4623.7, z: -5234.9, yaw: 4.3, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-stable', label: 'Конюшенный корпус · колоннада', x: -4814.7, z: -5257.2, yaw: 4.6, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-kitchen-north', label: 'Кухонный корпус · северный портик с вазами', x: -4631.9, z: -5358, yaw: -175.7, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-west-spit', label: 'Закат на Западной стрелке · львы', x: -6414.6, z: -5308.4, yaw: 104.5, pitch: 6, group: 'Елагин остров' },
  { key: 'Place.yelagin-hercules', label: 'Геракл на мысу пруда', x: -5546.9, z: -5122.5, yaw: -167.4, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-theatre', label: 'Эстрадный театр', x: -5214, z: -5372, yaw: 143.1, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-music', label: 'Музыкальный павильон', x: -4605.9, z: -4916.7, yaw: 56.7, pitch: 8, group: 'Елагин остров' },
  { key: 'Place.yelagin-bridge2', label: '2-й Елагин мост', x: -5207.2, z: -4837.7, yaw: 105.8, pitch: 2, group: 'Елагин остров' },
  { key: 'Place.kamenny-gate', label: 'Каменноостровский дворец · парадные ворота', x: -2866, z: -5342, yaw: -62, pitch: 8, group: 'Каменный остров' },
  { key: 'Place.kamenny-church', label: 'Предтеченская церковь', x: -2861.2, z: -5413.7, yaw: -120, pitch: 8, group: 'Каменный остров' },
  { key: 'Place.botanic-institute', label: 'Ботанический сад · институт', x: -1773.3, z: -4041.5, yaw: -70, pitch: 8, group: 'Аптекарский остров' },
  { key: 'Place.botanic-japan', label: 'Ботанический сад · Японский сад', x: -1427.6, z: -4279.1, yaw: 0, pitch: 6, group: 'Аптекарский остров' },
  { key: 'Place.botanic-peter', label: 'Ботанический сад · бюст Петра I', x: -1569.1, z: -4274.2, yaw: 200, pitch: 8, group: 'Аптекарский остров' },
  { key: 'Place.petrovsky-stadium', label: 'Петровский стадион · Ждановская набережная', x: -3464, z: -2201.6, yaw: 96.7, pitch: 8, group: 'Петровский остров' },
  { key: 'Place.petrovsky-yacht', label: 'Речной яхт-клуб · Петровская коса', x: -6266.1, z: -3584.2, yaw: -16, pitch: 8, group: 'Петровский остров' },
  { key: 'Place.south-vitebsky', label: 'Витебский вокзал', x: -1320, z: 1335, yaw: -120, pitch: 13, group: 'Центр до Обводного' },
  { key: 'Place.south-institute', label: 'Технологический институт', x: -1880, z: 1565, yaw: -90.7, pitch: 21, group: 'Центр до Обводного' },
  { key: 'Place.south-obvodny', label: 'Обводный канал · Ново-Московский мост', x: -1876, z: 2694.1, yaw: -41.3, pitch: 4, group: 'Центр до Обводного' },
  { key: 'Place.moskovsky-gate', label: 'Московские триумфальные ворота', x: -1812, z: 4603, yaw: -43, pitch: 12, group: 'Московский проспект' },
  { key: 'Place.victory-park', label: 'Московский парк Победы · главный вход', x: -1698.5, z: 7075, yaw: -88.2, pitch: 10, group: 'Московский проспект' },
  { key: 'Place.chesme', label: 'Чесменская церковь', x: -1169, z: 8409, yaw: -90, pitch: 20, group: 'Московский проспект' },
  { key: 'Place.moskovskaya', label: 'Московская площадь · Дом Советов', x: -1605, z: 8937, yaw: -90, pitch: 12, group: 'Московский проспект' },
];
