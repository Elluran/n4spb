// district.js - the DISTRICT-AWARE default of the facade grammar: which archetype / colours / features an ordinary house gets when no research table (known.js) describes it.
//
// The grammar of archetypes.js was tuned for the classical / eclectic street wall of Nevsky. The Petrograd side (regions P1..P9 of data/city.js) was built almost at once in 1898-1914:
// five and six storeys, Northern Modern and the neoclassical revival, bay windows, corner turrets, shaped gables, granite socles; then constructivism and Stalinist fronts on the
// avenues and brick industry towards the edges. The Spit and the first lines of Vasilievsky Island (V1, V2, and the south bank of the Malaya Neva inside P2) are 18th-19th century
// classicism: low, yellow and white, with later tenements on Makarova embankment. Sources: docs/research/kamennoostrovsky.md sec. 1 + 8 and its houses table (87 dated houses of
// Kamennoostrovsky / Bolshoy pr.: 26 eclectic, 19 Art Nouveau, 21 neoclassical revival, 5 Stalinist, 3 constructivist, 7 modern), aurora-houses.json (Soviet blocks behind Petrovskaya
// embankment), troitskaya-houses.json, Commons photos SP/refs/city-petro (Bolshoy pr. canyon in sand / tan / ochre, B. Pushkarskaya 30 / 38, Frenkel house, Makarova 8).
//
// STRIP (n4spb): the data holds only the first 8 rectangles, so no record is "new": districtOf is null, regionOf is null and the grammar of this file is dead code kept for its importers.
//
// ONLY records of the new regions get a district (districtOf -> 'petro' | 'vasil' | null): every record of the older regions keeps the generic mix, bit for bit
// (tools/city-signature.mjs proves it). OSM gives almost no start_date here (0-7 per region), so the choice is made from the street (avenue / embankment / side street / edge),
// the storey count, the kind, `building:architecture` where mapped, and a hash of the OUTLINE id (parts of one house share archetype and colour).
import { BUILDINGS, GREEN, REGIONS } from '../data/city.js';
import { hash01 } from '../lib/massing.js';
import { ARCH } from './wallmat.js';

// THE FROZEN SET. The strip keeps only the 8 rectangles of the first builds (OLD, W1, N1, W2a..W2e): every record of data/city.js is "old" and keeps the generic grammar bit for bit.
// The Petrograd-side / Vasilievsky grammar below is not reachable in the strip (districtOf is null for every house); it stays, with the same exports, because archetypes.js, heights.js,
// edges.js, walls.js and prep.js import it.
export const OLD_REGIONS = ['OLD', 'W1', 'N1', 'W2a', 'W2b', 'W2c', 'W2d', 'W2e'];
const oldIds = new Set();
for (const b of BUILDINGS) oldIds.add(b.id);
/** Regions that are not frozen, in bake order (none in the strip; read by tools/city-signature.mjs and tools/city-petro-audit.mjs). */
export const NEW_REGIONS = REGIONS.map((r) => r.name).filter((n) => !OLD_REGIONS.includes(n));
const NEW_RECTS = REGIONS.filter((r) => !OLD_REGIONS.includes(r.name));
/** Region name of a record that does NOT belong to a frozen part file (truthy), or null for every older record. The name is the first new extent rectangle that holds the centroid:
 *  a label for the audits (the bake assigns by its own representative point; tools that need the exact file read the part files themselves). */
export function regionOf(b) {
  if (oldIds.has(b._fillOf || b.id)) return null;
  if (b.cx !== undefined) for (const r of NEW_RECTS) { const e = r.extentRect; if (b.cx >= e.x0 && b.cx <= e.x1 && b.cz >= e.z0 && b.cz <= e.z1) return r.name; }
  return 'NEW';
}

// the Malaya Neva between the Birzhevoy Bridge (-2680,-1545) and the Tuchkov Bridge (-3676,-1842): south of this line (and north of the Bolshaya Neva, z < -560) is Vasilievsky Island
const malayaNeva = (x) => -1545 + 0.298 * (x + 2680);
// the Bolshaya Nevka: east of it is the Vyborg side. x -690 along the Aurora reach (P5), then the line Sampsonievsky Bridge (-777,-2845) -> Grenadersky Bridge (-903,-4027)
const nevkaX = (z) => (z > -2900 ? -690 : -777 + (z + 2845) * 0.1066);
/** 'petro' (Petrograd side: Petrogradsky, Zayachy, Petrovsky, Aptekarsky islands and the works of the Vyborg bank opposite them), 'vasil' (Vasilievsky Island) or null (frozen
 *  regions, the Vyborg bank at the Sampsonievsky bridge, the south bank of the Neva). */
export function districtOf(b) {
  if (b.cx === undefined || oldIds.has(b._fillOf || b.id)) return null;
  const x = b.cx, z = b.cz;
  // east bank of the Bolshaya Nevka. Rectangle P5 (Pirogovskaya embankment up to the Sampsonievsky bridge, z > -3023: the Military Medical Academy, classicism) keeps the
  // generic mix. North of it (rectangle P7: the Nobel / Russky Dizel works, Vyborgskaya embankment; 21 of its 78 houses are `industrial`) the generic mix made factory
  // blocks tenements: they belong to the works zone of zoneOf.
  if (x > nevkaX(z) && z < -2200 && z > -3023) return null;
  if (x < -2300 && z > malayaNeva(x)) return z < -560 ? 'vasil' : null;   // (the strip ends at x -3020: the outline of the island west of x -3300, lib/vo-island.js, never applied here)
  if (x > -2300 && z > -1640) return null;                          // south bank of the Neva
  return 'petro';
}

// ---------------------------------------------------------------- THE VASILIEVSKY ISLAND GRAMMAR (V3..V12, 2026-10-09)
// docs/research/vo-roster-architecture.md sections 4-6 (district table D02..D16, class weights per zone and storeys, palettes, features). It applies ONLY to the records of the island
// rectangles V3..V12 ("fresh": the reviewed Spit / Makarova row V1, V2 and the Petrograd side keep their grammar bit for bit, tools/city-signature.mjs proves it). Zone = the street first
// (the three prospects, the Neva embankments), then the district boxes (rotated ones are given in the grid of the island: u along the prospects, v along the Lines), then the Lines by u.
/** true for a record of the island rectangles V3..V12 (outline, part or synthesised base of one): the island grammar applies. Those rectangles are not part of the strip: always false. */
export const isVoFresh = (b) => false;
const COS30 = 0.8660254, VO_X0 = -3382, VO_Z0 = -1009;           // origin of the island grid = Bolshoy pr. x Kadetskaya line; u runs WSW (bearing 240), v NNW (bearing 330)
/** grid coordinates of the island: u along the prospects (west-south-west from the 1st Line), v along the Lines (0 = Bolshoy axis, ~498 Sredny, ~995 Maly, negative towards the Neva) */
export const voGrid = (x, z) => [-COS30 * (x - VO_X0) + 0.5 * (z - VO_Z0), -0.5 * (x - VO_X0) - COS30 * (z - VO_Z0)];
const VO_QUAY_RE = /Лейтенанта Шмидта|Университетская|Макарова/;                 // the three Neva / Malaya Neva embankments; the Smolenka and the land-fill embankments follow their district box
const VO_CEMETERY = [-5000, -1200, -5990, -630, -6380, -1300, -5380, -1870];      // D10 grid corners
const inBox = (x, z, x0, x1, z0, z1) => x >= x0 && x <= x1 && z >= z0 && z <= z1;
/** Zone of a house of the island (fresh records): 'vbolshoy' | 'vsredny' | 'vmaly' | 'vquay' (embankment fronts and the Neva blocks D02..D04) | 'vcemetery' D10 | 'vindustrial' D11 |
 *  'vgavan' D12 | 'vsuper' D13 | 'vprim' D14 | 'vsea' D15 | 'vfill' D16 | 'vlinesE' (u < 1300: the Lines up to the 13th) | 'vlinesW'. street = the nearest named road or the mapped address street. */
export function voZoneOf(x, z, street) {
  const nm = street || '';
  if (/Большой проспект/.test(nm)) return 'vbolshoy';
  if (/Средний проспект/.test(nm)) return 'vsredny';
  if (/Малый проспект/.test(nm)) return 'vmaly';
  if (VO_QUAY_RE.test(nm)) return 'vquay';
  if (x < -7900) return 'vfill';
  if (inBox(x, z, -7900, -6800, -1700, -100)) return 'vprim';
  if (ringHas(VO_CEMETERY, x, z)) return 'vcemetery';
  if (inBox(x, z, -6800, -5800, -1500, -300)) return 'vsuper';
  if (inBox(x, z, -6700, -5800, -300, 700)) return 'vgavan';
  if (inBox(x, z, -6800, -5750, 100, 1250)) return 'vsea';
  if (inBox(x, z, -5750, -4600, 150, 1560)) return 'vindustrial';
  const [u, v] = voGrid(x, z);
  if (v < -45 && u < 2000) return 'vquay';                          // D02..D04: the blocks between the Neva wall and the Bolshoy pr. frontage
  return u < 1300 ? 'vlinesE' : 'vlinesW';
}
/** the zone median storeys of section 4 (districts without mapped levels) */
export const VO_MEDIAN = { vquay: 3, vbolshoy: 4, vsredny: 4, vmaly: 5, vlinesE: 4, vlinesW: 4, vcemetery: 4, vindustrial: 4, vgavan: 5, vsuper: 5, vprim: 4, vsea: 3, vfill: 4 };
/** Shop-front probability of a street wall on the island (section 6.1 of the roster): Sredny and Maly 0.70, Bolshoy 0.38, Kosaya / Gavanskaya / Detskaya / Nalichnaya 0.35, the Lines 0.25 (0.45
 *  within 60 m of a prospect), embankments 0.06, the Gavan streets 0.15, Beringa / Shevchenko / Nakhimova 0.10, the cemetery 0. (x, z) = the middle of the wall. */
export function shopChanceVO(street, zone, x, z) {
  const n = street || '';
  if (zone === 'vcemetery') return 0;
  if (/Средний проспект/.test(n) || /Малый проспект/.test(n)) return 0.70;
  if (/Большой проспект/.test(n)) return 0.38;
  if (/Косая линия|Гаванская|Детская|Наличная/.test(n)) return 0.35;
  if (/линия|линии/.test(n)) {
    const v = voGrid(x, z)[1];                                      // within 60 m of a prospect canyon (half widths 42 / 16 / 20 m)
    return Math.abs(v) < 102 || Math.abs(v - 498) < 76 || Math.abs(v - 995) < 80 ? 0.45 : 0.25;
  }
  if (/набережная/.test(n)) return /Лейтенанта Шмидта|Университетская|Макарова/.test(n) ? 0.06 : 0.12;
  if (/Опочинина|Шкиперский|Галерный|Боцманская|Вёсельная|Канареечная/.test(n)) return 0.15;
  if (/Беринга|Шевченко|Нахимова/.test(n)) return 0.10;
  return zone === 'vfill' || zone === 'vprim' || zone === 'vsuper' ? 0.14 : 0.16;
}

// ---------------------------------------------------------------- park / zoo pavilions
// A record without storeys that stands inside a park, a garden or the Zoo is a pavilion (a zoo house, a cafe, a stage), not a five-storey tenement: heights.js gives it 5-8 m and
// archetypes.js a plain archetype. The Zoo is not a polygon of the baked data: its rectangle comes from docs/PETRO-BRIEF.md (x -2503..-2250, z -2358..-1948).
const ZOO = { x0: -2510, x1: -2245, z0: -2365, z1: -1940 };
let _parks = null;
function parks() {
  if (_parks) return _parks;
  _parks = [];
  for (const g of GREEN) {
    if (g.kind !== 'park' && g.kind !== 'garden') continue;
    for (const p of g.polys || []) {
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); }
      if (x1 < -4600 || x0 > -500 || z0 > -600) continue;                  // only the parks of the new regions matter
      _parks.push({ o: p.o, box: [x0, x1, z0, z1] });
    }
  }
  return _parks;
}
const ringHas = (o, x, z) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const _pav = new Map();
/** true for a district record without mapped storeys / height that stands in a park, a garden or the Zoo (and for boats moored as buildings) */
export function isPavilion(b) {
  const id = b._fillOf || b.id;
  let v = _pav.get(id); if (v !== undefined) return v;
  v = false;
  if (districtOf(b) && !b.levels && b.hSrc !== 'height') {
    const x = b.cx, z = b.cz;
    if (b.kind === 'boat' || b.kind === 'ship') v = true;
    else if (x > ZOO.x0 && x < ZOO.x1 && z > ZOO.z0 && z < ZOO.z1) v = true;
    else for (const p of parks()) { if (x < p.box[0] || x > p.box[1] || z < p.box[2] || z > p.box[3]) continue; if (ringHas(p.o, x, z)) { v = true; break; } }
  }
  _pav.set(id, v);
  return v;
}

// centreline of Chkalovsky pr. from the Zhdanovka to the Karpovka as [z, x] samples, south to north (data ROADS; a straight run between samples strays 9 m at most)
const CHKALOVSKY = [[-2801, -3632], [-3238, -3323], [-3675, -2975], [-3865, -2832], [-4092, -2636]];
function chkalovskyX(z) {
  const S = CHKALOVSKY;
  if (z >= S[0][0]) return S[0][1];
  for (let i = 1; i < S.length; i++) if (z >= S[i][0]) return S[i - 1][1] + (S[i][1] - S[i - 1][1]) * (z - S[i - 1][0]) / (S[i][0] - S[i - 1][0]);
  return S[S.length - 1][1];
}
const AVENUE_RE =/Кронверкский|Добролюбова|Пушкарская|Чкаловский|Малый проспект П|Куйбышева|Левашовский|Льва Толстого|набережная|Ленина|Введенская|Большая Зеленина|Ждановская/;
/** Zone of a house inside its district: the prime avenues, other avenues / embankments, the 1900s side streets, the Soviet east, the industrial edges, the north-west corner
 *  ('works': factories, institutes and 1930s-60s housing between Pionerskaya and the Zhdanovka, along both banks of the Bolshaya Nevka and north of the Karpovka; 'newbuild':
 *  the housing complexes and sports halls of the 2000s-20s on Petrovsky island and the west tip; 'posad': the Posadskaya quarter, half tenements and half Soviet); on
 *  Vasilievsky the quay, the avenues and the lines. */
export function zoneOf(district, x, z, street) {
  const name = street || '';
  if (district === 'vasil') return /Макарова|Университетская/.test(name) ? 'quay' : /Средний|Кадетская|1-я линия/.test(name) ? 'vavenue' : 'lines';
  if (/Каменноостровский/.test(name)) return 'kam';
  if (/Большой проспект П/.test(name)) return 'bolshoy';
  if (x > -1480 && z > -2820) return 'east';                        // Troitskaya Square, ul. Kuybysheva, Petrovskaya embankment: 1930s-70s blocks between the tenements
  // WEST OF CHKALOVSKY PR. (rectangle P6 and the west margins of P2 / P3 / P4): Krasnoye Znamya and the other works of Pionerskaya / Korpusnaya, the Pechatny Dvor, the
  // Levashovsky bread factory, Stalinist and 1960s housing, institutes; the old tenements survive on Bolshaya Zelenina and Chkalovsky pr. The border is the avenue itself,
  // not a rectangle: east of it the grid of 1900s tenement streets (Lakhtinskaya, Gatchinskaya ...) runs on to Bolshoy pr. and keeps the zones below.
  if (x < -4230 && z < -2450) return 'newbuild';                    // Petrovsky island west of the stadium, Leontievsky cape, the Krestovsky bank of rectangle P8
  if (z < -2800 && x < chkalovskyX(z)) return 'works';
  // the same stock in the rectangles baked after P6: the strip along the Bolshaya Nevka (Petrogradskaya / Aptekarskaya embankments: works turned business centres, the
  // medical university) and Aptekarsky island north of the Karpovka (institutes, LETI, Soviet housing). Kamennoostrovsky / Bolshoy pr. fronts were matched above.
  if ((x > -1150 && z < -2920) || z < -3900) return 'works';
  // the Posadskaya quarter east of the tenement belt of Kamennoostrovsky pr. (Bolshaya / Malaya Posadskaya, ul. Chapaeva, Michurinskaya, the north end to ul. Rentgena):
  // 1900s tenements stand between Stalinist fronts, brick blocks of the 1960s-70s, institutes and garages. West of x -1400 the houses of rectangle P3 keep the side mix.
  if (z < -2940 && (x > -1400 || (x > -1600 && z < -3600))) return 'posad';
  if (x < -3440 || (x < -3000 && z < -3250) || z < -3800) return 'edge';   // Petrovsky island and the Zhdanovka, the north-west, north of ul. Lva Tolstogo: industry and institutes
  if (AVENUE_RE.test(name)) return 'avenue';
  return 'side';
}

/** Shop-front probability of a street wall (walls.js): Bolshoy pr. is THE shopping street of the Petrograd side, the embankments have almost none. */
export function shopChance(district, street) {
  const n = street || '';
  if (/Большой проспект П/.test(n)) return 0.92;
  if (/Каменноостровский/.test(n)) return 0.78;
  if (/Средний проспект/.test(n)) return 0.62;
  if (/Большая Пушкарская|Кронверкский|Чкаловский|Малый проспект|Введенская|Ленина|Льва Толстого|Куйбышева|Большая Зеленина|линия|линии/.test(n)) return 0.42;
  if (/набережная/.test(n)) return district === 'vasil' ? 0.06 : 0.12;
  if (/Добролюбова|Ждановская/.test(n)) return 0.2;
  return district === 'vasil' ? 0.16 : 0.24;
}

const A = ARCH;
// weights by zone for houses of 5+ storeys (the tenement belt); 4 / 3 / 2 storeys are scaled below
const MIX5 = {
  kam: [[A.NORDIC, 26], [A.NEOCLASSIC1910, 28], [A.NOUVEAU, 6], [A.TENEMENT, 10], [A.ECLECTIC, 6], [A.STALIN, 18], [A.PANEL, 3], [A.MODERN, 3]],
  bolshoy: [[A.NORDIC, 24], [A.TENEMENT, 20], [A.ECLECTIC, 22], [A.NEOCLASSIC1910, 12], [A.NOUVEAU, 8], [A.STALIN, 6], [A.BRICK, 4], [A.MODERN, 4]],
  avenue: [[A.NORDIC, 27], [A.NEOCLASSIC1910, 16], [A.TENEMENT, 14], [A.ECLECTIC, 16], [A.NOUVEAU, 5], [A.STALIN, 14], [A.BRICK, 4], [A.PANEL, 2], [A.MODERN, 2]],
  side: [[A.NORDIC, 33], [A.ECLECTIC, 20], [A.TENEMENT, 15], [A.NEOCLASSIC1910, 11], [A.BRICK, 5], [A.NOUVEAU, 5], [A.STALIN, 6], [A.PANEL, 3], [A.MODERN, 2]],
  east: [[A.STALIN, 36], [A.PANEL, 14], [A.NORDIC, 14], [A.NEOCLASSIC1910, 10], [A.ECLECTIC, 12], [A.TENEMENT, 6], [A.BRICK, 6], [A.MODERN, 2]],
  edge: [[A.BRICK, 26], [A.STALIN, 20], [A.PANEL, 14], [A.NORDIC, 14], [A.ECLECTIC, 14], [A.NEOCLASSIC1910, 5], [A.MODERN, 7]],
  quay: [[A.NORDIC, 22], [A.NEOCLASSIC1910, 20], [A.TENEMENT, 18], [A.ECLECTIC, 24], [A.STALIN, 8], [A.BRICK, 4], [A.MODERN, 4]],
  vavenue: [[A.ECLECTIC, 30], [A.TENEMENT, 20], [A.NORDIC, 18], [A.NEOCLASSIC1910, 10], [A.STALIN, 10], [A.BRICK, 6], [A.MODERN, 6]],
  lines: [[A.ECLECTIC, 32], [A.TENEMENT, 18], [A.NORDIC, 16], [A.NEOCLASSIC1910, 8], [A.BRICK, 8], [A.STALIN, 8], [A.CLASSIC, 6], [A.MODERN, 4]],
};
const LOW = {            // 4 / 3 / <= 2 storeys: the older, lower stock (1830-1890) and the small infill
  petro4: [[A.ECLECTIC, 36], [A.NORDIC, 20], [A.BRICK, 7], [A.TENEMENT, 13], [A.CLASSIC, 6], [A.STALIN, 8], [A.NEOCLASSIC1910, 4], [A.PANEL, 4], [A.MODERN, 2]],
  petro3: [[A.ECLECTIC, 44], [A.CLASSIC, 18], [A.BRICK, 8], [A.MANSION, 12], [A.NORDIC, 8], [A.PANEL, 5], [A.MODERN, 5]],
  petro2: [[A.ECLECTIC, 38], [A.CLASSIC, 24], [A.MANSION, 22], [A.BRICK, 8], [A.MODERN, 8]],
  vasil4: [[A.ECLECTIC, 40], [A.CLASSIC, 30], [A.TENEMENT, 8], [A.BRICK, 8], [A.NORDIC, 6], [A.STALIN, 6], [A.MODERN, 2]],
  vasil3: [[A.CLASSIC, 54], [A.ECLECTIC, 26], [A.MANSION, 10], [A.BRICK, 8], [A.MODERN, 2]],
  vasil2: [[A.CLASSIC, 60], [A.ECLECTIC, 18], [A.MANSION, 14], [A.BRICK, 8]],
};
// the zones of the rectangles P6..P9 by storeys: [5-6, 7-8, 9+, 4, 3, <= 2]. works: tenements of 1900-14 keep a third of the 5-6 storey houses (Bolshaya Zelenina,
// Chkalovsky pr.); nothing of 1900 has seven storeys here; nine and more are the brick towers of the 1970s and the complexes of the 2000s-20s. newbuild: no tenements at
// all (a little brick and Stalinist stock survives on Petrovsky island, none on the west tip: see districtArch). posad: half and half.
const NW = {
  works: { 5: [[A.STALIN, 24], [A.PANEL, 16], [A.NORDIC, 14], [A.BRICK, 14], [A.MODERN, 12], [A.ECLECTIC, 8], [A.NEOCLASSIC1910, 6], [A.TENEMENT, 6]],
    7: [[A.STALIN, 34], [A.MODERN, 30], [A.PANEL, 26], [A.NORDIC, 6], [A.NEOCLASSIC1910, 4]], 9: [[A.MODERN, 60], [A.PANEL, 40]],
    4: [[A.STALIN, 24], [A.PANEL, 18], [A.BRICK, 16], [A.ECLECTIC, 16], [A.NORDIC, 10], [A.MODERN, 8], [A.CLASSIC, 4], [A.NEOCLASSIC1910, 4]],
    3: [[A.BRICK, 24], [A.PANEL, 20], [A.ECLECTIC, 20], [A.STALIN, 14], [A.MODERN, 10], [A.CLASSIC, 6], [A.MANSION, 6]],
    2: [[A.BRICK, 28], [A.PANEL, 20], [A.ECLECTIC, 16], [A.MODERN, 14], [A.CLASSIC, 12], [A.MANSION, 10]] },
  newbuild: { 5: [[A.MODERN, 56], [A.PANEL, 20], [A.BRICK, 16], [A.STALIN, 8]], 7: [[A.MODERN, 70], [A.PANEL, 30]], 9: [[A.MODERN, 75], [A.PANEL, 25]],
    4: [[A.MODERN, 46], [A.PANEL, 20], [A.BRICK, 22], [A.STALIN, 8], [A.CLASSIC, 4]], 3: [[A.MODERN, 36], [A.BRICK, 30], [A.PANEL, 22], [A.CLASSIC, 6], [A.STALIN, 6]],
    2: [[A.BRICK, 34], [A.MODERN, 32], [A.PANEL, 24], [A.CLASSIC, 10]] },
  posad: { 5: [[A.STALIN, 24], [A.NORDIC, 18], [A.PANEL, 14], [A.ECLECTIC, 12], [A.TENEMENT, 10], [A.NEOCLASSIC1910, 8], [A.MODERN, 8], [A.BRICK, 6]],
    7: [[A.STALIN, 40], [A.MODERN, 30], [A.PANEL, 30]], 9: [[A.MODERN, 55], [A.PANEL, 45]],
    4: [[A.ECLECTIC, 24], [A.STALIN, 22], [A.PANEL, 16], [A.NORDIC, 12], [A.BRICK, 12], [A.MODERN, 8], [A.CLASSIC, 6]],
    3: [[A.ECLECTIC, 28], [A.BRICK, 20], [A.PANEL, 18], [A.STALIN, 12], [A.CLASSIC, 10], [A.MANSION, 6], [A.MODERN, 6]],
    2: [[A.BRICK, 24], [A.ECLECTIC, 22], [A.PANEL, 18], [A.CLASSIC, 14], [A.MODERN, 12], [A.MANSION, 10]] },
};
const NW_WORKS = [[A.BRICK, 55], [A.PANEL, 30], [A.MODERN, 15]];                       // a big low footprint that is not housing: a workshop block
const NW_OFFICE = [[A.BRICK, 36], [A.MODERN, 34], [A.PANEL, 20], [A.STALIN, 10]];      // offices and trade sit in former factory blocks or in new glass
const RESIDENTIAL = new Set(['apartments', 'residential', 'dormitory', 'house', 'hotel']);
/** true for the footprints of the zones above that are works, not houses (no shop fronts, wide bays): big, low, not housing */
export const isWorksBlock = (zone, kind, area, floors) => NW[zone] !== undefined && area >= 2500 && floors <= 4 && !RESIDENTIAL.has(kind);
const PREWAR = new Set([A.ECLECTIC, A.TENEMENT, A.NOUVEAU, A.NORDIC, A.NEOCLASSIC1910, A.CLASSIC, A.MANSION, A.STALIN]);
const WEST_TIP_X = -4420;                 // Leontievsky cape and the yacht club (rectangle P9): built from 2015 on, around the sheds of the Almaz yard
const PUBLIC = { petro: [[A.STALIN, 38], [A.ECLECTIC, 20], [A.BRICK, 16], [A.NEOCLASSIC1910, 10], [A.PANEL, 16]], vasil: [[A.CLASSIC, 44], [A.ECLECTIC, 26], [A.BRICK, 14], [A.STALIN, 10], [A.PANEL, 6]] };
// ---- island class weights per zone x storeys (roster section 6.2): [5+, 4, 3, <= 2]; E eclectic, T tenement, N Northern Modern, NC neoclassical revival, C classic, M mansion, S Stalinist,
// P panel, B brick, MD modern, SV service
const w = (...a) => { const o = []; for (let i = 0; i < a.length; i += 2) o.push([A[a[i]], a[i + 1]]); return o; };
const VO_MIX = {
  vquay: [w('ECLECTIC', 28, 'TENEMENT', 18, 'NORDIC', 12, 'NEOCLASSIC1910', 8, 'STALIN', 10, 'BRICK', 6, 'MODERN', 10, 'CLASSIC', 8), w('ECLECTIC', 36, 'CLASSIC', 26, 'TENEMENT', 10, 'NORDIC', 6, 'BRICK', 6, 'STALIN', 8, 'MODERN', 8),
    w('CLASSIC', 44, 'ECLECTIC', 28, 'MANSION', 10, 'BRICK', 6, 'STALIN', 6, 'MODERN', 6), w('CLASSIC', 52, 'ECLECTIC', 16, 'MANSION', 14, 'BRICK', 12, 'SERVICE', 6)],
  vbolshoy: [w('ECLECTIC', 24, 'TENEMENT', 20, 'NORDIC', 20, 'NEOCLASSIC1910', 8, 'STALIN', 10, 'BRICK', 4, 'MODERN', 14), w('ECLECTIC', 34, 'CLASSIC', 16, 'TENEMENT', 14, 'NORDIC', 12, 'STALIN', 8, 'MODERN', 10, 'BRICK', 6),
    w('ECLECTIC', 34, 'CLASSIC', 30, 'BRICK', 8, 'STALIN', 8, 'MODERN', 10, 'MANSION', 6, 'NORDIC', 4), w('CLASSIC', 34, 'ECLECTIC', 20, 'BRICK', 16, 'MANSION', 12, 'SERVICE', 10, 'MODERN', 8)],
  vsredny: [w('TENEMENT', 22, 'NORDIC', 22, 'ECLECTIC', 18, 'NEOCLASSIC1910', 6, 'STALIN', 8, 'BRICK', 6, 'MODERN', 18), w('ECLECTIC', 34, 'TENEMENT', 14, 'NORDIC', 14, 'CLASSIC', 12, 'STALIN', 8, 'MODERN', 12, 'BRICK', 6),
    w('ECLECTIC', 36, 'CLASSIC', 26, 'BRICK', 8, 'STALIN', 8, 'MODERN', 10, 'MANSION', 8, 'NORDIC', 4), w('CLASSIC', 30, 'ECLECTIC', 22, 'BRICK', 16, 'MANSION', 12, 'SERVICE', 12, 'MODERN', 8)],
  vlinesE: [w('ECLECTIC', 28, 'TENEMENT', 20, 'NORDIC', 14, 'NEOCLASSIC1910', 8, 'STALIN', 8, 'BRICK', 8, 'MODERN', 10, 'CLASSIC', 4), w('ECLECTIC', 36, 'CLASSIC', 20, 'TENEMENT', 12, 'NORDIC', 8, 'BRICK', 8, 'STALIN', 6, 'MODERN', 10),
    w('CLASSIC', 36, 'ECLECTIC', 32, 'MANSION', 8, 'BRICK', 8, 'STALIN', 6, 'MODERN', 8, 'NORDIC', 2), w('CLASSIC', 34, 'ECLECTIC', 22, 'MANSION', 14, 'BRICK', 14, 'SERVICE', 10, 'MODERN', 6)],
  vlinesW: [w('NORDIC', 26, 'TENEMENT', 20, 'ECLECTIC', 14, 'NEOCLASSIC1910', 8, 'STALIN', 10, 'PANEL', 8, 'BRICK', 6, 'MODERN', 8), w('ECLECTIC', 28, 'NORDIC', 16, 'TENEMENT', 12, 'STALIN', 14, 'BRICK', 10, 'PANEL', 8, 'MODERN', 8, 'CLASSIC', 4),
    w('ECLECTIC', 28, 'BRICK', 20, 'STALIN', 16, 'CLASSIC', 10, 'PANEL', 10, 'MODERN', 10, 'MANSION', 6), w('BRICK', 32, 'ECLECTIC', 16, 'CLASSIC', 14, 'SERVICE', 14, 'PANEL', 12, 'MODERN', 12)],
  vcemetery: [w('ECLECTIC', 40, 'CLASSIC', 20, 'BRICK', 40), w('ECLECTIC', 40, 'CLASSIC', 20, 'BRICK', 40), w('CLASSIC', 30, 'ECLECTIC', 30, 'BRICK', 40), w('BRICK', 45, 'SERVICE', 25, 'CLASSIC', 15, 'ECLECTIC', 15)],
  vindustrial: [w('BRICK', 70, 'MODERN', 12, 'STALIN', 6, 'PANEL', 6, 'SERVICE', 6), w('BRICK', 70, 'STALIN', 8, 'PANEL', 8, 'MODERN', 8, 'SERVICE', 6), w('BRICK', 68, 'SERVICE', 14, 'PANEL', 10, 'MODERN', 8), w('BRICK', 55, 'SERVICE', 30, 'MODERN', 15)],
  vgavan: [w('STALIN', 36, 'NORDIC', 18, 'TENEMENT', 12, 'ECLECTIC', 10, 'PANEL', 8, 'NEOCLASSIC1910', 6, 'MODERN', 10), w('STALIN', 26, 'ECLECTIC', 20, 'NORDIC', 16, 'TENEMENT', 8, 'PANEL', 10, 'BRICK', 10, 'MODERN', 10),
    w('ECLECTIC', 30, 'STALIN', 20, 'BRICK', 16, 'PANEL', 12, 'MODERN', 12, 'CLASSIC', 10), w('BRICK', 32, 'ECLECTIC', 20, 'PANEL', 14, 'MODERN', 14, 'CLASSIC', 10, 'SERVICE', 10)],
  vsuper: [w('PANEL', 40, 'STALIN', 30, 'BRICK', 10, 'NORDIC', 8, 'MODERN', 12), w('PANEL', 34, 'STALIN', 24, 'BRICK', 14, 'ECLECTIC', 10, 'MODERN', 18), w('BRICK', 30, 'PANEL', 24, 'ECLECTIC', 14, 'MODERN', 14, 'STALIN', 10, 'CLASSIC', 8), w('BRICK', 36, 'PANEL', 24, 'MODERN', 20, 'SERVICE', 20)],
  vprim: [w('PANEL', 50, 'BRICK', 20, 'MODERN', 20, 'STALIN', 10), w('PANEL', 40, 'BRICK', 24, 'MODERN', 24, 'SERVICE', 12), w('PANEL', 30, 'BRICK', 30, 'MODERN', 24, 'SERVICE', 16), w('PANEL', 26, 'BRICK', 26, 'MODERN', 24, 'SERVICE', 24)],
  vsea: [w('BRICK', 40, 'SERVICE', 24, 'MODERN', 20, 'PANEL', 10, 'STALIN', 6)],
  vfill: [w('MODERN', 92, 'PANEL', 8), w('MODERN', 90, 'PANEL', 10), w('MODERN', 80, 'PANEL', 10, 'SERVICE', 10), w('MODERN', 60, 'SERVICE', 40)],
};
VO_MIX.vmaly = VO_MIX.vsredny;
VO_MIX.vsea = [VO_MIX.vsea[0], VO_MIX.vsea[0], VO_MIX.vsea[0], VO_MIX.vsea[0]];
const VO_SUPER79 = w('PANEL', 50, 'STALIN', 20, 'MODERN', 30), VO_SUPER10 = w('PANEL', 55, 'MODERN', 45);
const VO_PRIM9 = w('PANEL', 55, 'MODERN', 35, 'BRICK', 10), VO_PRIM17 = w('MODERN', 70, 'PANEL', 30);
const VO_PUBLIC = { vsuper: w('PANEL', 40, 'BRICK', 30, 'STALIN', 15, 'MODERN', 15), vprim: w('PANEL', 45, 'BRICK', 25, 'MODERN', 30), vgavan: w('STALIN', 40, 'PANEL', 25, 'BRICK', 25, 'ECLECTIC', 10), vindustrial: w('BRICK', 60, 'PANEL', 20, 'MODERN', 20),
  vsea: w('BRICK', 50, 'MODERN', 30, 'PANEL', 20), vfill: w('MODERN', 80, 'PANEL', 20), vcemetery: w('BRICK', 60, 'CLASSIC', 25, 'ECLECTIC', 15) };
/** the weighted archetype list of a fresh island house: zone x storeys, with the position rules (Art Nouveau from the 8th Line westwards, Stalinist only west of x -3900) applied */
function voList(zone, floors, x, z) {
  const t = VO_MIX[zone] || VO_MIX.vlinesE;
  let list;
  if (zone === 'vsuper' && floors >= 7) list = floors >= 10 ? VO_SUPER10 : VO_SUPER79;
  else if (zone === 'vprim' && floors >= 9) list = floors >= 17 ? VO_PRIM17 : VO_PRIM9;
  else list = floors >= 5 ? t[0] : floors === 4 ? t[1] : floors === 3 ? t[2] : t[3];
  const u = voGrid(x, z)[0], noN = u < 560, noS = x > -3900;
  const out = list.filter(([a]) => !(noN && (a === A.NORDIC || a === A.NEOCLASSIC1910)) && !(noS && a === A.STALIN));
  return out.length ? out : [[A.ECLECTIC, 1]];
}
const pick = (h, list) => { let t = 0; for (const [, w] of list) t += w; let x = h * t; for (const [v, w] of list) { if ((x -= w) < 0) return v; } return list[list.length - 1][0]; };

export const INDUSTRIAL_KINDS = new Set(['industrial', 'warehouse', 'manufacture', 'factory', 'depot', 'hangar', 'works']);
// kinds the tenement grammar makes absurd: a stadium bowl, a multi-storey car park, a glasshouse ... get a plain archetype (no bay windows, no gables, no shops)
const SPECIAL_KINDS = { stadium: A.PANEL, sports_hall: A.PANEL, grandstand: A.PANEL, parking: A.MODERN, greenhouse: A.MODERN, train_station: A.MODERN, boathouse: A.SERVICE, toilets: A.SERVICE, guardhouse: A.SERVICE,
  steps: A.SERVICE, base: A.SERVICE, boat: A.SERVICE, disused: A.BRICK, castle: A.BRICK, dome: A.CLASSIC, construction: A.MODERN };
/** true for the kinds / names that never carry shop fronts, bay windows or gables (districtFeatures of archetypes.js) */
export const isPlainKind = (kind) => SPECIAL_KINDS[kind] !== undefined;
const MODERN_NAME = /бизнес-центр|бизнес центр|торгов|апарт|паркинг|автостоянк/i;
/** institutions by name (OSM `name`): no shop fronts on their walls */
export const INSTITUTION_NAME = /корпус|поликлин|больниц|госпитал|институт|университет|академи|училищ|школа|гимнази|лицей|колледж|музей|театр|библиотек|завод|фабрик|комбинат|типограф|прокуратур|полици|пожарн|бассейн|спорт|стадион|общежити|детский сад|церковь|храм|собор/i;
export const PUBLIC_KINDS = new Set(['school', 'kindergarten', 'hospital', 'university', 'civic', 'government', 'public', 'sports_centre', 'dormitory', 'college', 'clinic', 'fire_station', 'barracks', 'military', 'museum', 'theatre', 'library']);

/** Archetype of a district house. o: { district, zone, floors, kind, area, year (start_date or 0), tag (building:architecture), h (hash of the outline id), x (centroid) }. */
export function districtArch(o) {
  const { district, zone, floors, kind, tag, year, h } = o;
  const h2 = hash01(o.hid + 'da');
  if (SPECIAL_KINDS[kind] !== undefined) return SPECIAL_KINDS[kind];
  if (o.name && MODERN_NAME.test(o.name)) return A.MODERN;
  // OSM building:material: concrete is the panel / block housing and the institutes of the 1960s-80s (or a new frame), glass and metal are new
  if (o.material === 'glass' || o.material === 'metal') return A.MODERN;
  if (o.material === 'concrete' || o.material === 'cement_block' || o.material === 'reinforced_concrete') return floors >= 10 && h2 < 0.5 ? A.MODERN : A.PANEL;
  if (INDUSTRIAL_KINDS.has(kind)) return o.area > 2600 && floors <= 2 ? A.SERVICE : A.BRICK;
  // explicit OSM style
  if (tag) {
    if (/art_nouveau|nordic|modern_style|jugend/.test(tag)) return floors >= 3 ? A.NORDIC : A.ECLECTIC;
    if (/stalin/.test(tag)) return A.STALIN;
    if (/constructiv/.test(tag)) return A.PANEL;
    if (/neoclassic/.test(tag)) return floors >= 4 ? A.NEOCLASSIC1910 : A.CLASSIC;
    if (/^classic|empire|baroque/.test(tag)) return floors <= 4 ? A.CLASSIC : A.ECLECTIC;
    if (/eclectic|historicism|renaissance|neo-/.test(tag)) return floors >= 5 && h2 < 0.4 ? A.TENEMENT : A.ECLECTIC;
    if (/brick/.test(tag)) return A.BRICK;
    if (/modern|contemporary|postmodern|brutal|functional/.test(tag)) return /functional/.test(tag) ? A.PANEL : A.MODERN;
  }
  // a mapped year before 1930 (later years are the era classes of layout.eraOf, handled by the caller)
  if (year) {
    if (year < 1850) return floors <= 4 ? A.CLASSIC : A.ECLECTIC;
    if (year < 1890) return h2 < 0.14 ? A.BRICK : A.ECLECTIC;
    if (year < 1899) return floors >= 5 && h2 < 0.5 ? A.TENEMENT : A.ECLECTIC;
    if (year < 1910) return floors < 3 ? A.ECLECTIC : h2 < 0.66 ? A.NORDIC : h2 < 0.86 ? A.TENEMENT : A.NOUVEAU;
    if (year < 1918) return floors < 4 ? A.ECLECTIC : h2 < 0.56 ? A.NEOCLASSIC1910 : A.NORDIC;
    if (year < 1930) return A.PANEL;                                 // 1920s: early constructivism
  }
  // newbuild: housing and its schools / kindergartens are the complexes of the 2000s-20s whatever the hash says (OSM has almost no start_date here: 3 of 58 houses of P9)
  if (zone === 'newbuild' && (RESIDENTIAL.has(kind) || PUBLIC_KINDS.has(kind))) return h2 < 0.8 ? A.MODERN : A.PANEL;
  if (PUBLIC_KINDS.has(kind)) return o.fresh ? pick(h, VO_PUBLIC[zone] || PUBLIC.vasil.filter(([a]) => !(a === A.STALIN && o.x > -3900))) : pick(h, PUBLIC[district] || PUBLIC.petro);
  if (isWorksBlock(zone, kind, o.area, floors)) return pick(h, NW_WORKS);
  if (NW[zone] && (kind === 'office' || kind === 'commercial' || kind === 'retail')) { const a = floors >= 9 ? A.MODERN : pick(h, NW_OFFICE); return a === A.STALIN && o.x < WEST_TIP_X ? A.MODERN : a; }
  let list;
  if (o.fresh) list = voList(zone, floors, o.x, o.z);
  else if (NW[zone]) list = NW[zone][floors >= 9 ? 9 : floors >= 7 ? 7 : floors >= 5 ? 5 : floors === 4 ? 4 : floors === 3 ? 3 : 2];
  else if (floors >= 5) list = MIX5[zone] || MIX5.side;
  else if (district === 'vasil') list = floors === 4 ? LOW.vasil4 : floors === 3 ? LOW.vasil3 : LOW.vasil2;
  else list = floors === 4 ? LOW.petro4 : floors === 3 ? LOW.petro3 : LOW.petro2;
  let a = pick(h, list);
  if (o.fresh && floors >= 8 && (a === A.NORDIC || a === A.NEOCLASSIC1910 || a === A.CLASSIC || a === A.MANSION)) a = A.MODERN;                  // island: nothing of 1900 has eight storeys (the corner towers are separate volumes)
  if (floors >= 8 && (a === A.ECLECTIC || a === A.TENEMENT || a === A.BRICK || a === A.NOUVEAU)) a = h2 < 0.5 && !(o.fresh && o.x > -3900) ? A.STALIN : A.MODERN;   // nothing of 1900 has eight storeys
  if (floors >= 10 && a !== A.MODERN && a !== A.PANEL) a = h2 < 0.6 ? A.MODERN : A.PANEL;                                             // and nothing before 1960 has ten
  if (zone === 'newbuild' && o.x < WEST_TIP_X && PREWAR.has(a)) a = floors >= 3 ? A.MODERN : A.BRICK;                                  // the west tip has no pre-war house
  return a;
}

// ---------------------------------------------------------------- palettes (sRGB facade fields with weights)
// Petrograd side: the warm greys and buffs of roughcast and terrazite, sand / tan / ochre / peach eclectic stucco of Bolshoy pr. (photo 01), stone-grey neoclassicism
// (Kamennoostrovsky 9, 26-28: #b8b5a9), a few yellow fronts with a white order (Kamennoostrovsky 19: #e2cd8e). Vasilievsky: the yellow and white of the classicist lines.
export const DISTRICT_PALETTE = {
  petro: {
    nordic: [['#b5a792', 13], ['#cbbd9a', 13], ['#d6c8a4', 12], ['#c9b79a', 9], ['#b7b8ad', 9], ['#a79f92', 7], ['#d6a877', 7], ['#c2a58c', 7], ['#cdb65e', 6], ['#9c9a8c', 5], ['#d9cdb0', 8], ['#c6b39c', 4]],
    neo: [['#b8b5a9', 18], ['#a9a79e', 12], ['#bcb9ad', 14], ['#8f8e86', 7], ['#e2cd8e', 13], ['#d8cdb4', 12], ['#cfc6b0', 10], ['#d9d9d2', 8], ['#e2bfa4', 6]],
    plaster: [['#d8c08a', 13], ['#c9a877', 11], ['#b89a72', 7], ['#e0a988', 9], ['#d9b85a', 11], ['#e59a5b', 5], ['#e3b7a0', 7], ['#cdb98f', 9], ['#d9b38a', 9], ['#c7bf7a', 4], ['#b9c2a6', 4], ['#e6d28f', 7], ['#cba596', 4]],
    brick: [['#a1503f', 34], ['#8e4a3a', 20], ['#c99b43', 28], ['#b9876a', 18]],
    stalin: [['#d8b594', 15], ['#dcc9a2', 22], ['#cfcabd', 15], ['#c5bba6', 14], ['#b9b6ab', 14], ['#d2a998', 8], ['#e0c27a', 12]],
    panel: [['#b9b6ab', 30], ['#a8a69c', 18], ['#c9c2b0', 20], ['#8a7f78', 8], ['#d8d4c8', 24]],
  },
  vasil: {
    nordic: [['#cbbd9a', 16], ['#d6c8a4', 16], ['#b7b8ad', 12], ['#c9b79a', 12], ['#d9cdb0', 14], ['#b5a792', 10], ['#cdb65e', 8], ['#c2a58c', 12]],
    neo: [['#b8b5a9', 16], ['#cfd6d2', 12], ['#e2cd8e', 18], ['#d8cdb4', 16], ['#a9a79e', 10], ['#d9d9d2', 14], ['#8f8e86', 6]],
    plaster: [['#e6cf7c', 22], ['#ecdca0', 17], ['#e3dccb', 9], ['#d9c8a4', 9], ['#e2a898', 7], ['#cfd6d2', 6], ['#e0c27c', 10], ['#d8b0a0', 5], ['#dcb25e', 8], ['#c9c7a8', 4], ['#e9b896', 3]],
    brick: [['#a1503f', 30], ['#8e4a3a', 16], ['#c99b43', 30], ['#b9876a', 24]],
    stalin: [['#dcc9a2', 26], ['#e6d7b0', 22], ['#cfcabd', 16], ['#c5bba6', 14], ['#e0c27a', 14], ['#d2a998', 8]],
    panel: [['#d8d4c8', 30], ['#c9c2b0', 24], ['#b9b6ab', 24], ['#e6d8ae', 22]],
  },
  // the island V3..V12 (roster section 6.3: colours read off the Commons photos of the island, weights from the style classes of section 5.0)
  vo: {
    nordic: [['#a89a86', 14], ['#86655f', 8], ['#b8b288', 10], ['#c9b99c', 10], ['#bdb297', 12], ['#b6ab92', 10], ['#cdb98a', 8], ['#8c8f74', 6], ['#c8bca0', 8], ['#9c9a8c', 6], ['#d9cdb0', 8]],
    neo: [['#e8b898', 14], ['#f1e6d6', 10], ['#cfc8b0', 14], ['#ece6d4', 12], ['#d8c9a0', 10], ['#b8b5a9', 10], ['#e2cd8e', 10], ['#cfd6d2', 8], ['#d9c0a8', 6]],
    plaster: [['#e6d9a8', 12], ['#ead58e', 12], ['#d6a24d', 12], ['#c8923a', 8], ['#d5bba6', 10], ['#e8b898', 7], ['#d98b5c', 7], ['#c4bf86', 8], ['#c8a99a', 6], ['#b98c55', 6], ['#e8cf63', 5], ['#dcc080', 5], ['#cfd6d2', 3], ['#a6c4d9', 2], ['#e9e2cd', 4], ['#b9c2a6', 3]],
    brick: [['#a4543b', 30], ['#8d3b2b', 18], ['#a9503a', 14], ['#cfa65f', 14], ['#c99b43', 10], ['#9f4a33', 8], ['#b9876a', 6]],
    stalin: [['#dcb862', 16], ['#dcc9a2', 20], ['#e6d7b0', 16], ['#c5b97c', 12], ['#d8b594', 8], ['#cfcabd', 10], ['#e0c27a', 10], ['#d2a998', 8]],
    panel: [['#d8d4c8', 26], ['#c9c2b0', 18], ['#e0d7c4', 16], ['#d9cba0', 16], ['#b9b6ab', 14], ['#e6d8ae', 10]],
    modern: [['#a47c5c', 16], ['#8e6a4e', 10], ['#d6b99a', 16], ['#e8e4da', 20], ['#e5dccb', 14], ['#9b4a3a', 8], ['#5f7a8c', 8], ['#c9c2b0', 8]],
  },
};
/** Roof sheet of the island (roster section 6.3): zinc grey, a green and a red-brown tenth; flat bitumen on panel / modern blocks. */
export const VO_ROOFS = [['#9ba0a3', 34], ['#8c9195', 22], ['#7f858a', 12], ['#a9aeb2', 8], ['#5a7a63', 9], ['#8a5246', 11]];
export const VO_ROOFS_FLAT = [['#4a4a48', 50], ['#5b5f62', 30], ['#7f858a', 20]];
/** Top of a `building=roof` canopy (m): OSM gives such roofs one level or nothing, which the era table turns into 5 m; a stair or porch roof is lower. */
export const canopyTop = (b) => { const a = Math.abs(b.area || 0); return a >= 150 ? 5.0 : a >= 40 ? 3.4 : 2.9; };
/** Roof sheet of the new regions (aerial photo SP/refs/city-petro/04_bolshoy_aerial: zinc grey almost everywhere, a few red-brown and green roofs). */
export const DISTRICT_ROOFS = [['#9ba0a3', 34], ['#8c9195', 22], ['#7f858a', 12], ['#a9aeb2', 8], ['#5f7d68', 9], ['#8a5246', 11], ['#9a6a58', 4]];
/** Palette of a district style, or null (the generic palettes of archetypes.js apply: court, service, modern, mansion ...). */
export function districtPalette(st) {
  const P = DISTRICT_PALETTE[st.fresh ? 'vo' : st.dist]; if (!P) return null;
  if (st.fresh && st.arch === A.MODERN) return P.modern;
  switch (st.arch) {
    case A.NORDIC: case A.NOUVEAU: return P.nordic;
    case A.NEOCLASSIC1910: case A.NEOCLASS: return P.neo;
    case A.ECLECTIC: case A.TENEMENT: case A.CLASSIC: case A.MANSION: return P.plaster;
    case A.BRICK: return P.brick;
    case A.STALIN: return P.stalin;
    case A.PANEL: return P.panel;
    default: return null;
  }
}
/** grey stone-coloured terrazite (the order is cut from the same stone) or a coloured front with a white order? */
export const isStoneGrey = (hex) => { const v = parseInt(hex.slice(1), 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255; return Math.max(r, g, b) - Math.min(r, g, b) < 26; };
