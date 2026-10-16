// Shared helpers for the OpenStreetMap pipeline (fetch-osm.mjs -> bake-osm.mjs -> plan.mjs).
// Local frame: origin = ORIGIN, +X east, +Z SOUTH (so -Z is north, as in the whole engine), metres. No rotation (north-up).
// Saint Petersburg centre: origin = the `ll` of the Yandex URL behind docs/reference/yandex-center.png (59.932421 N, 30.351279 E),
// which falls on pixel (636.0, 430.4) of the screenshot: on Nevsky Prospekt between Liteyny and Mayakovskogo, ~125 m west-north-west of the screenshot centre (docs/reference/calibration.md).

export const ORIGIN = { lon: 30.351279, lat: 59.932421 };

// PLAY = the walkable area = a UNION of axis-aligned rectangles (local metres, x east, z south, rounded to 5 m), see docs/reference/west-frame.md:
//   OLD  = the first build: the whole ground of docs/reference/yandex-center.png (x -594.3 ... 833.5, z -402.2 ... 490.2, see calibration.md) extended 370 m to the south so that
//          the Moscow Railway Station complex (concourse, train hall, the heads of all 6 platforms and the 520-640 m platforms + tracks) lies inside. 1430 x 1465 m = 2.09 km2.
//   W1.. = the western extension along Nevsky Prospekt to the Admiralty / Palace Square (fetched / baked 2026-10, the origin and the calibration of OLD never change).
// EXTENT = the baked data extent = every PLAY rectangle grown by 120 m of scenery (union of the grown rectangles).
// PLAY / EXTENT (the old exports) are now the BOUNDING BOXES of the unions: keep using them for "how big is the world", but never for "may I stand here":
// use inPlay / inExtent / clampToPlay (the unions have empty notches).
export const OLD_PLAY = { x0: -595, x1: 835, z0: -405, z1: 1060 };
const RECTS = [   // [name, rectangle]; the order = priority of the data files (OLD first, then west by west)
  ['OLD', OLD_PLAY],
  // W1: Fontanka -> Gostiny Dvor / Nevsky metro -> Kazan Cathedral / Griboedov Canal, Mikhailovsky garden, Church of the Saviour on Blood, the Moika
  ['W1', { x0: -1750, x1: -595, z0: -1000, z1: 160 }],
  // N1: the west bank of the Fontanka north of the old area (Fontanka embankment, so the river is not cut by an invisible wall 100 m before it)
  ['N1', { x0: -595, x1: -420, z0: -1000, z1: -405 }],
  // W2a..e: Kazan -> Admiralty -> Palace Square -> Winter Palace + the Neva embankment -> St Isaac's / Senate Square. A staircase that follows the Neva south bank
  // (bank: (-1750,-1265) (-1964,-1139) (-2162,-996) (-2315,-885) (-2480,-746) (-2663,-606) (-2762,-524) (-2932,-396)): about 30-50 m of water beyond the quay is inside PLAY,
  // the rest of the river (400-500 m wide) is scenery. z1 240 in the west so that the Moika at St Isaac's / the Blue Bridge area is inside.
  ['W2a', { x0: -1950, x1: -1750, z0: -1300, z1: 170 }],
  ['W2b', { x0: -2200, x1: -1950, z0: -1180, z1: 170 }],
  ['W2c', { x0: -2450, x1: -2200, z0: -1010, z1: 170 }],
  ['W2d', { x0: -2700, x1: -2450, z0: -800, z1: 240 }],
  ['W2e', { x0: -2900, x1: -2700, z0: -620, z1: 240 }],
  // E1: Old Nevsky from Vosstaniya to Alexander Nevsky Square, Lavra and the Neva.
  // Keep OLD first so station records retain their region and deterministic seeds.
  ['E1', { x0: 835, x1: 2650, z0: -405, z1: 1750 }],
  // Central north: Liteyny / Chernyshevskaya, Tauride Garden and Smolny.
  ['N2', { x0: -800, x1: 1100, z0: -2250, z1: -405 }],
  ['N3', { x0: 1100, x1: 3100, z0: -2800, z1: -405 }],
  // M1..M7: the Mars Field, the Summer Garden (west part), Suvorov Square, Kutuzov / Palace embankment: the gap between W1 (z >= -1000), W2a and N2 (x >= -800).
  // A staircase along the Neva south bank (bank: (-1754,-1266) (-1638,-1329) (-1566,-1371) (-1457,-1435) (-1259,-1539) (-1189,-1576) (-1081,-1620) (-984,-1663) (-848,-1716)),
  // ~45 m of water beyond the quay inside PLAY, the rest of the river is scenery. They join W1 at z -1000, W2a at x -1750 and N2 at x -800.
  ['M1', { x0: -1750, x1: -1625, z0: -1380, z1: -1000 }],
  ['M2', { x0: -1625, x1: -1500, z0: -1455, z1: -1000 }],
  ['M3', { x0: -1500, x1: -1375, z0: -1520, z1: -1000 }],
  ['M4', { x0: -1375, x1: -1250, z0: -1585, z1: -1000 }],
  ['M5', { x0: -1250, x1: -1125, z0: -1640, z1: -1000 }],
  ['M6', { x0: -1125, x1: -1000, z0: -1700, z1: -1000 }],
  ['M7', { x0: -1000, x1: -800, z0: -1780, z1: -1000 }],
  // S1..S5: the south-west of the tourist centre (2026-10-06), from the user's Yandex map: Moika / Griboedov / Kryukov canals south of Nevsky, Sennaya Square, Sadovaya (S1);
  // Teatralnaya Square, Mariinsky Theatre + Conservatory, Nikolsky Naval Cathedral (S2); Yusupov Palace, New Holland, Bobrinsky and Alexey Alexandrovich palaces, Kolomna, the Bolshaya Neva
  // bank (S3, S4); the Fontanka and Technological Institute (S5). They join W1 (x >= -1750, z <= 160), W2a..e (z <= 170 / 240) and each other.
  ['S1', { x0: -2450, x1: -1650, z0: 160, z1: 950 }],
  ['S2', { x0: -3300, x1: -2450, z0: 240, z1: 1400 }],
  ['S3', { x0: -3950, x1: -3300, z0: -250, z1: 1000 }],
  ['S4', { x0: -3300, x1: -2900, z0: -480, z1: 240 }],
  ['S5', { x0: -2650, x1: -1650, z0: 950, z1: 1750 }],
  // P1..P5 + V1, V2: the Petrograd side and the Spit of Vasilievsky Island (2026-10-06). Unlike the bank staircases above these rectangles hold the WHOLE width of the Neva / Malaya Neva /
  // Kronverksky strait, so the Trinity, Palace, Birzhevoy and Tuchkov bridges are walkable from bank to bank; they overlap the older rectangles (a record stays with the first rectangle that
  // holds it, so the old ids / regions do not change).
  //   P1: the Neva north of the Mars Field staircase, Trinity Bridge (x -1451..-1212, z -2079..-1560), Zayachy Island with the Peter and Paul Fortress (x -2377..-1575, z -2230..-1704),
  //       Kronverk + Artillery Museum, Alexander Park, Zoo, Gorkovskaya, Troitskaya Square, Mosque (-1526,-2529), Kshesinskaya mansion, Peter's Cabin (-1142,-2326), Petrovskaya embankment
  //   P2: Mytninskaya embankment, the north end of the Birzhevoy Bridge, Dobrolyubova pr., Prince Vladimir Cathedral (-3123,-2147), Tuchkov Bridge (x -3753..-3600, z -1943..-1742),
  //       the beginning of Bolshoy pr. P.S., the Zhdanovka and the Petrovsky stadium
  //   P3: the middle of the Petrograd side: Bolshoy pr., Kronverksky pr., Sytny market, Kamennoostrovsky pr. with Austrian Square (-1906,-3065), Chkalovskaya
  //   P4: Lev Tolstoy Square (-2198,-3714) with the House with Towers, Petrogradskaya metro, the north of Bolshoy / Kamennoostrovsky pr. (the Karpovka, z -3900..-4200, stays outside)
  //   P5: Petrogradskaya embankment with the cruiser Aurora (-753,-2562) and the Nakhimov school, the Bolshaya Nevka (the Vyborg side is scenery)
  //   V1: the Spit: Old Stock Exchange, Rostral columns (-2586,-1365), Birzhevaya Square, both warehouses, the Customs house, Kunstkamera (-2662,-1015), Academy of Sciences,
  //       the Twelve Collegia (x -3018..-2802), the Palace Bridge (x -2502..-2330, z -1088..-868) and the Birzhevoy Bridge (x -2701..-2657, z -1665..-1425) whole
  //   V2: Makarova embankment (Malaya Neva) from the Spit to the Tuchkov Bridge, one row of blocks deep
  ['P1', { x0: -2450, x1: -800, z0: -2800, z1: -1300 }],
  ['P2', { x0: -3950, x1: -2450, z0: -2800, z1: -1700 }],
  ['P3', { x0: -3400, x1: -1500, z0: -3350, z1: -2800 }],
  ['P4', { x0: -2900, x1: -1700, z0: -3900, z1: -3350 }],
  ['P5', { x0: -800, x1: -550, z0: -2900, z1: -2250 }],
  ['V1', { x0: -3050, x1: -2300, z0: -1700, z1: -700 }],
  ['V2', { x0: -3950, x1: -3050, z0: -1800, z1: -1300 }],
  // P6: the north-west corner of Petrogradsky Island (user 2026-10-06: Pionerskaya street was cut after 485 m of its 1 650 m at the P2 / P3 notch): Pionerskaya ulitsa to the Admiral Lazarev
  // embankment (-4292,-3550), Bolshaya Zelenina, Korpusnaya, Krasnogo Kursanta, the west of Chkalovsky and Levashovsky pr., the Malaya Nevka bank with the Petrograd heads of the Lazarevsky
  // (x -4362..-4302, z -3695..-3573) and Bolshoy Krestovsky (x -4027..-3900, z -3920..-3788) bridges (Krestovsky Island is scenery). Overlaps P3 (x -3400..-2900) so that no notch is left towards P4.
  ['P6', { x0: -4400, x1: -2900, z0: -3900, z1: -2600 }],   // z1 -2600 (not -2800): the island's south-west bit by the Zhdanovka west of P2
  // P7..P9: the rest of Petrogradsky Island (user 2026-10-06: "did we author the whole island?": 81 % of its 6.27 km2 was inside). The island polygon r1312631 has the bbox
  // x -4898..-736, z -4198..-1663; its north shore is the Karpovka (z -3890 at the Bolshaya Nevka, x -927 ... -4200 at the Malaya Nevka, x -3907).
  //   P7: the north-east quarter between Kamennoostrovsky pr. and the Bolshaya Nevka (Malaya / Bolshaya Posadskaya, Chapaeva, Kuybysheva, Petrogradskaya embankment, the whole
  //       Sampsonievsky Bridge, the Grenadersky Bridge head, the mouth of the Karpovka)
  //   P8: the north strip to the Karpovka with both its banks (Karpovka embankment, Ioannovsky convent, the Medical University; Aptekarsky Island behind the far bank is scenery)
  //   P9: the west tip beyond x -4400 (Leontievsky cape between the Zhdanovka and the Malaya Nevka, the end of Zhdanovskaya street)
  ['P7', { x0: -1700, x1: -600, z0: -4080, z1: -2800 }],
  ['P8', { x0: -4400, x1: -1700, z0: -4260, z1: -3900 }],
  ['P9', { x0: -4950, x1: -4400, z0: -3700, z1: -3000 }],
  // V3..V12: the WHOLE of Vasilievsky Island (user 2026-10-07: "author Vasilievsky Island now"; before: the Spit V1 and one block of Makarova embankment V2 = 4 % of the 14.1 km2 of the OSM island
  // polygon r1576083, which includes the Gulf coast in the west; bbox x -9701..-2436, z -2452..1556). Seven-hundred-metre columns from the Spit westwards to the Gulf, each cut to the island
  // plus the Malaya Neva / Bolshaya Neva / Gulf water round it (>= 69 m of water beyond every shore point, median 400 m), so the bridges are walkable bank to bank (Blagoveshchensky Bridge
  // x -3528..-3363, z -436..-95 lies in V4 + S3; the Malaya Neva bank at the Tuchkov and Birzhevoy bridges is in P2 / V1). Coverage of the island polygon: 100 % (docs/reference/vo-frame.md).
  // They are appended LAST so that no old record id or region assignment changes (a record stays with the first EXTENT rectangle that holds it): V3 and V4 mostly overlap V1 / V2 / S3 / S4 / P2,
  // the new ground begins west of x -3150 (V4) and V5..V12 are all new. The Spit and Universitetskaya embankment (V1) and the strip V2 keep their records.
  //   V3: x -3150..-2450, V4: -3850..-3150, V5: -4550..-3850, V6: -5250..-4550, V7: -5950..-5250, V8: -6650..-5950, V9: -7350..-6650, V10: -8050..-7350, V11: -8750..-8050,
  //   V12: -9800..-8750 (the west coast, mostly Gulf water). z ranges follow the island outline (buffer 120 m): see docs/reference/vo-frame.md for the table with areas and record counts.
  ['V3', { x0: -3150, x1: -2450, z0: -1900, z1: -150 }],
  ['V4', { x0: -3850, x1: -3150, z0: -2250, z1: -150 }],
  ['V5', { x0: -4550, x1: -3850, z0: -2250, z1: 900 }],
  ['V6', { x0: -5250, x1: -4550, z0: -2250, z1: 1650 }],      // z1 1650 (lead's cut 1600): the southern cape of the island polygon (-5168, 1556) had only 44 m of water
  ['V7', { x0: -5950, x1: -5250, z0: -1900, z1: 1600 }],
  ['V8', { x0: -6650, x1: -5950, z0: -1900, z1: 1250 }],
  ['V9', { x0: -7350, x1: -6650, z0: -2250, z1: 900 }],
  ['V10', { x0: -8050, x1: -7350, z0: -2250, z1: 900 }],
  ['V11', { x0: -8750, x1: -8050, z0: -2600, z1: 900 }],
  ['V12', { x0: -9800, x1: -8750, z0: -2600, z1: 550 }],
  // 2026-10-11: complete the historic centre to Obvodny, then the avenue to
  // Moskovskaya. Append only: existing region ownership and seeded art stay stable.
  ['C1', { x0: -4300, x1: -2650, z0: 1000, z1: 3050 }],
  ['C2', { x0: -2650, x1: -1650, z0: 1750, z1: 3100 }],
  ['C3', { x0: -1650, x1: 835, z0: 160, z1: 2900 }],
  ['C4', { x0: 835, x1: 2650, z0: 1060, z1: 2250 }],
  ['MP1', { x0: -2350, x1: -1150, z0: 2900, z1: 4900 }],
  ['MP2', { x0: -2350, x1: -1150, z0: 4900, z1: 6700 }],
  ['MP3', { x0: -2350, x1: -1150, z0: 6700, z1: 8250 }],
  ['VP', { x0: -1150, x1: 300, z0: 6500, z1: 8200 }],
  ['MS', { x0: -2350, x1: -650, z0: 8200, z1: 9300 }],
  // 2026-10-12: Krestovsky Island, appended so old region assignments remain
  // stable. Include the east-bank bridge landings, Victory Park and arena,
  // with surrounding water; northern/southern neighbour islands stay scenery.
  ['K1', { x0: -4900, x1: -3700, z0: -5250, z1: -3520 }],
  ['K2', { x0: -6000, x1: -4900, z0: -5650, z1: -3520 }],
  ['K3', { x0: -7100, x1: -6000, z0: -5600, z1: -3800 }],
  ['K4', { x0: -8450, x1: -7100, z0: -5450, z1: -3700 }],
  // 2026-10-13, islands round 2 (docs/ISLANDS2-BRIEF.md, docs/reference/islands2-frame.md): the rest of Yelagin, Kamenny, Aptekarsky, Petrovsky (+ the Zhdanovka corridor) and Serny, each island
  // with >= 100 m of the water round it (every shore point is >= 69 m inside the union) and the bridges between them from bank to bank. Staircases that follow the shores (a rectangle
  // holds only what the shore needs), appended LAST so that no old record id or region assignment changes (a record stays with the first EXTENT rectangle that holds it). Islands:
  // Yelagin rel 1576343, Kamenny rel 1576182, Aptekarsky rel 1576187, Petrovsky rel 1576109, Serny way 22793388 (docs/reference/islands2-island-polys.json).
  //   YE1: the north-east end of Yelagin (north of K1) with the Srednyaya Nevka round it; the rest of Yelagin is K1 / K2 / K3.
  //   KA1..KA5: Kamenny Island from its west tip (the Yelagin bridges 1-3 are K1 / K2) along the NE-pointing shore to the Kamenny tip (x -2525); KA3 / KA4 hold the Kamennoostrovsky bridge
  //             (x -2824..-2743, z -5099..-4953) and the Ushakovsky bridge (x -2877..-2846, z -5696..-5484, bank to bank).
  //   AP1..AP7: Aptekarsky Island above the Karpovka (P8 holds the Karpovka and its banks): the Kamenny / Aptekarsky strait (Kamennoostrovsky bridge), the Botanical Garden, the Bolshaya Nevka
  //             shore round to the Aptekarsky Bridge (P7) and the Kantemirovsky bridge (x -1759..-1533, z -5255..-5018).
  //   PE1..PE6: Petrovsky Island whole: the stadium end, the long shore to the Zhdanovka, Serny Island with the Serny Bridge (-4930,-2551), the Betancourt bridge (x -4742..-4520, z -3082..-2320) and the Malaya Neva
  //             side of the Zhdanovka; the Zhdanovka itself and its Petrogradsky bank are P6 / P9 / P2 / V4.
  ['YE1', { x0: -5050, x1: -4650, z0: -5660, z1: -5250 }],
  ['KA1', { x0: -4650, x1: -3450, z0: -5600, z1: -4430 }],
  ['KA2', { x0: -3450, x1: -3150, z0: -5610, z1: -4570 }],
  ['KA3', { x0: -3150, x1: -2900, z0: -5610, z1: -4780 }],
  ['KA4', { x0: -2900, x1: -2650, z0: -5740, z1: -4940 }],
  ['KA5', { x0: -2650, x1: -2400, z0: -5520, z1: -5090 }],
  ['AP1', { x0: -3700, x1: -3350, z0: -4610, z1: -4260 }],
  ['AP2', { x0: -3350, x1: -3100, z0: -4810, z1: -4260 }],
  ['AP3', { x0: -3100, x1: -2750, z0: -5000, z1: -4260 }],
  ['AP4', { x0: -2750, x1: -1600, z0: -5250, z1: -4080 }],
  ['AP5', { x0: -1600, x1: -1450, z0: -5290, z1: -4080 }],
  ['AP6', { x0: -1450, x1: -1150, z0: -4940, z1: -4080 }],
  ['AP7', { x0: -1150, x1: -950, z0: -4490, z1: -4080 }],
  ['PE1', { x0: -6600, x1: -6250, z0: -3830, z1: -3290 }],
  ['PE2', { x0: -6250, x1: -5900, z0: -3830, z1: -3100 }],
  ['PE3', { x0: -5900, x1: -5550, z0: -3560, z1: -2950 }],
  ['PE4', { x0: -5550, x1: -5200, z0: -3560, z1: -2620 }],
  ['PE5', { x0: -5200, x1: -4900, z0: -3560, z1: -2430 }],
  ['PE6', { x0: -4900, x1: -3950, z0: -3030, z1: -2250 }],
];
export const RECT_NAMES = RECTS.map((r) => r[0]);
export const PLAY_RECTS = RECTS.map((r) => ({ ...r[1] }));
export const EXTENT_GROW = 120;
const growRect = (r, m) => ({ x0: r.x0 - m, x1: r.x1 + m, z0: r.z0 - m, z1: r.z1 + m });
export const EXTENT_RECTS = PLAY_RECTS.map((r) => growRect(r, EXTENT_GROW));
const bboxRects = (rs) => ({ x0: Math.min(...rs.map((r) => r.x0)), x1: Math.max(...rs.map((r) => r.x1)), z0: Math.min(...rs.map((r) => r.z0)), z1: Math.max(...rs.map((r) => r.z1)) });
export const PLAY = bboxRects(PLAY_RECTS);        // bounding box of the union
export const EXTENT = bboxRects(EXTENT_RECTS);    // bounding box of the union
export const OLD_EXTENT = growRect(OLD_PLAY, EXTENT_GROW);
const lat0 = ORIGIN.lat * Math.PI / 180;
// WGS84 metres per degree at the origin latitude
export const KY = 111132.954 - 559.822 * Math.cos(2 * lat0) + 1.175 * Math.cos(4 * lat0);
export const KX = 111412.84 * Math.cos(lat0) - 93.5 * Math.cos(3 * lat0) + 0.118 * Math.cos(5 * lat0);

export const proj = (lon, lat) => [(lon - ORIGIN.lon) * KX, -(lat - ORIGIN.lat) * KY];
export const unproj = (x, z) => [ORIGIN.lon + x / KX, ORIGIN.lat - z / KY];

// ---------------------------------------------------------------- rings / polygons
const eq = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Join open way segments (arrays of [lon,lat]) into closed rings. */
export function stitch(segs) {
  const pool = segs.filter((s) => s.length >= 2).map((s) => s.slice());
  const rings = [];
  while (pool.length) {
    let cur = pool.shift();
    let guard = 0;
    while (!eq(cur[0], cur[cur.length - 1]) && guard++ < 20000) {
      let hit = false;
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i];
        if (eq(s[0], cur[cur.length - 1])) { cur = cur.concat(s.slice(1)); }
        else if (eq(s[s.length - 1], cur[cur.length - 1])) { cur = cur.concat(s.slice().reverse().slice(1)); }
        else if (eq(s[s.length - 1], cur[0])) { cur = s.slice(0, -1).concat(cur); }
        else if (eq(s[0], cur[0])) { cur = s.slice().reverse().slice(0, -1).concat(cur); }
        else continue;
        pool.splice(i, 1); hit = true; break;
      }
      if (!hit) break;
    }
    if (cur.length >= 4 && eq(cur[0], cur[cur.length - 1])) rings.push(cur);
  }
  return rings;
}

export const ringArea = (r) => { let a = 0; for (let i = 0, n = r.length - 1; i < n; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; };
/** positive = counter-clockwise in a y-up frame. Our z points south, so "CCW" here means clockwise on screen; only consistency matters. */
export const orient = (r, ccw) => ((ringArea(r) > 0) === ccw ? r : r.slice().reverse());

export function pointInRing(p, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], zi = r[i][1], xj = r[j][0], zj = r[j][1];
    if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function pointInPoly(p, poly) { // poly = {o, h[]}
  if (!pointInRing(p, poly.o)) return false;
  for (const h of poly.h) if (pointInRing(p, h)) return false;
  return true;
}

/** Sutherland–Hodgman clip of a ring against an axis-aligned rectangle. */
export function clipRing(ring, R) {
  let out = ring.slice(0, -1);
  const edges = [
    (p) => p[0] >= R.x0, (p) => p[0] <= R.x1, (p) => p[1] >= R.z0, (p) => p[1] <= R.z1,
  ];
  const inter = [
    (a, b) => { const t = (R.x0 - a[0]) / (b[0] - a[0]); return [R.x0, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (R.x1 - a[0]) / (b[0] - a[0]); return [R.x1, a[1] + t * (b[1] - a[1])]; },
    (a, b) => { const t = (R.z0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), R.z0]; },
    (a, b) => { const t = (R.z1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), R.z1]; },
  ];
  for (let e = 0; e < 4 && out.length; e++) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
      const ci = edges[e](cur), pi = edges[e](prev);
      if (ci) { if (!pi) out.push(inter[e](prev, cur)); out.push(cur); }
      else if (pi) out.push(inter[e](prev, cur));
    }
  }
  if (out.length < 3) return null;
  out.push(out[0].slice());
  return out;
}

/** Clip an open polyline against a rectangle (Liang–Barsky per segment); returns a list of polylines. */
export function clipLine(pts, R) {
  const res = []; let cur = null;
  for (let i = 0; i < pts.length - 1; i++) {
    let [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const dx = x1 - x0, dz = z1 - z0; let t0 = 0, t1 = 1;
    const p = [-dx, dx, -dz, dz], q = [x0 - R.x0, R.x1 - x0, z0 - R.z0, R.z1 - z0];
    let ok = true;
    for (let k = 0; k < 4; k++) {
      if (p[k] === 0) { if (q[k] < 0) { ok = false; break; } } else {
        const t = q[k] / p[k];
        if (p[k] < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
      }
    }
    if (!ok) { cur = null; continue; }
    const a = [x0 + t0 * dx, z0 + t0 * dz], b = [x0 + t1 * dx, z0 + t1 * dz];
    if (!cur || t0 > 0) { cur = [a]; res.push(cur); }
    cur.push(b);
    if (t1 < 1) cur = null;
  }
  return res.filter((l) => l.length >= 2);
}

/** Douglas–Peucker simplification of a polyline / ring (keeps the closing point). */
export function simplify(pts, tol) {
  if (pts.length <= 3 || tol <= 0) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  const d2 = (p, a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1]; const l = dx * dx + dz * dz;
    let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l : 0; t = Math.max(0, Math.min(1, t));
    const ex = a[0] + t * dx - p[0], ez = a[1] + t * dz - p[1]; return ex * ex + ez * ez;
  };
  while (stack.length) {
    const [s, e] = stack.pop(); let mx = 0, mi = -1;
    for (let i = s + 1; i < e; i++) { const d = d2(pts[i], pts[s], pts[e]); if (d > mx) { mx = d; mi = i; } }
    if (mx > tol * tol) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
  }
  return pts.filter((_, i) => keep[i]);
}

export const round1 = (v) => Math.round(v * 10) / 10;
export const flat = (pts) => { const o = []; for (const p of pts) o.push(round1(p[0]), round1(p[1])); return o; };

/** Element (Overpass `out geom`) -> list of polygons [{o:[[x,z]..closed], h:[ring..]}] in the local frame. */
export function elementPolys(e) {
  const P = (g) => g.map((n) => [n.lon, n.lat]);
  const toLocal = (r) => r.map((p) => proj(p[0], p[1]));
  if (e.type === 'way') {
    if (!e.geometry || e.geometry.length < 4) return [];
    const r = P(e.geometry); if (!eq(r[0], r[r.length - 1])) return [];
    return [{ o: toLocal(r), h: [] }];
  }
  if (e.type === 'relation') {
    const outers = [], inners = [], others = [];
    for (const m of e.members || []) {
      if (m.type !== 'way' || !m.geometry) continue;
      if (m.role === 'outer') outers.push(P(m.geometry));
      else if (m.role === 'inner') inners.push(P(m.geometry));
      else others.push(P(m.geometry));
    }
    if (outers.length) {
      const o = stitch(outers).map(toLocal), ih = stitch(inners).map(toLocal);
      return o.map((r) => ({ o: r, h: ih.filter((h) => pointInRing(h[0], r)) }));
    }
    // type=building relation: closed member ways (outline / part)
    return others.filter((r) => r.length >= 4 && eq(r[0], r[r.length - 1])).map((r) => ({ o: toLocal(r), h: [] }));
  }
  return [];
}

export const bboxOf = (ring) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of ring) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } return { x0, x1, z0, z1 }; };
export const centroid = (ring) => { let a = 0, cx = 0, cz = 0; for (let i = 0; i < ring.length - 1; i++) { const f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]; a += f; cx += (ring[i][0] + ring[i + 1][0]) * f; cz += (ring[i][1] + ring[i + 1][1]) * f; } a /= 2; return Math.abs(a) < 1e-6 ? ring[0] : [cx / (6 * a), cz / (6 * a)]; };

// ================================================================== unions of axis-aligned rectangles (PLAY_RECTS / EXTENT_RECTS)
// The same point tests (copied) live in src/world/layout.js for the runtime (inPlay / clampToPlay); the baker uses the clip helpers below.
const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const _bcache = new Map();
/** Boundary of the union of rectangles as axis-aligned segments [ax, az, bx, bz] (edges shared by two rectangles are interior and left out). */
export function unionBoundary(rs) {
  let c = _bcache.get(rs); if (c) return c;
  const segs = [];
  const sub = (a, b, cut) => { // [a,b] minus the intervals in cut
    let rem = [[a, b]];
    for (const [c0, c1] of cut) { const nr = []; for (const [s, e] of rem) { if (c1 <= s || c0 >= e) { nr.push([s, e]); continue; } if (c0 > s) nr.push([s, c0]); if (c1 < e) nr.push([c1, e]); } rem = nr; }
    return rem.filter(([s, e]) => e - s > 1e-9);
  };
  rs.forEach((r, i) => {
    const others = rs.filter((_, j) => j !== i);
    // z = z0 edge (outside = -z): covered where another rect contains the strip just above it
    for (const [s, e] of sub(r.x0, r.x1, others.filter((o) => o.z0 < r.z0 && o.z1 >= r.z0).map((o) => [o.x0, o.x1]))) segs.push([s, r.z0, e, r.z0]);
    for (const [s, e] of sub(r.x0, r.x1, others.filter((o) => o.z0 <= r.z1 && o.z1 > r.z1).map((o) => [o.x0, o.x1]))) segs.push([s, r.z1, e, r.z1]);
    for (const [s, e] of sub(r.z0, r.z1, others.filter((o) => o.x0 < r.x0 && o.x1 >= r.x0).map((o) => [o.z0, o.z1]))) segs.push([r.x0, s, r.x0, e]);
    for (const [s, e] of sub(r.z0, r.z1, others.filter((o) => o.x0 <= r.x1 && o.x1 > r.x1).map((o) => [o.z0, o.z1]))) segs.push([r.x1, s, r.x1, e]);
  });
  _bcache.set(rs, segs); return segs;
}
/** Distance (m) from (x,z) to the boundary of the union (Infinity for an empty list). */
export function distToBoundary(rs, x, z) {
  let d = Infinity;
  for (const [ax, az, bx, bz] of unionBoundary(rs)) {
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz, t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l)) : 0;
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
/** (x,z) inside the union of rectangles, at least m metres from its boundary (m < 0: also up to -m outside). */
export function inUnion(rs, x, z, m = 0) {
  const ins = rs.some((r) => inR(r, x, z));
  if (m === 0) return ins;
  return m > 0 ? ins && distToBoundary(rs, x, z) >= m : ins || distToBoundary(rs, x, z) <= -m;
}
/** Nearest point of the union (inset by m) to (x,z): [x, z]. */
export function clampToUnion(rs, x, z, m = 0) {
  if (inUnion(rs, x, z, m)) return [x, z];
  let best = null, bd = Infinity;
  for (const r of rs) {
    const a = { x0: r.x0 + m, x1: r.x1 - m, z0: r.z0 + m, z1: r.z1 - m }; if (a.x0 > a.x1 || a.z0 > a.z1) continue;
    const px = Math.min(a.x1, Math.max(a.x0, x)), pz = Math.min(a.z1, Math.max(a.z0, z)), d = Math.hypot(px - x, pz - z);
    if (d < bd) { bd = d; best = [px, pz]; }
  }
  return best || [x, z];
}
export const inPlay = (x, z, m = 0) => inUnion(PLAY_RECTS, x, z, m);
export const inExtent = (x, z, m = 0) => inUnion(EXTENT_RECTS, x, z, m);
export const clampToPlay = (x, z, m = 0) => clampToUnion(PLAY_RECTS, x, z, m);
/** Name of the first rectangle (RECT_NAMES order) of the EXTENT union that contains (x,z), or null (OLD wins in the overlaps). */
export const regionOf = (x, z) => { const i = EXTENT_RECTS.findIndex((r) => inR(r, x, z)); return i < 0 ? null : RECT_NAMES[i]; };

/** Clip an open polyline against the UNION of rectangles: per segment the parameter intervals of every rectangle are merged, so a line that crosses an overlap is
 *  not doubled and a line that runs from one rectangle into the next stays one piece. With one rectangle the result is identical to clipLine. */
export function clipLineUnion(pts, rs) {
  if (rs.length === 1) return clipLine(pts, rs[0]);
  const res = []; let cur = null;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], dx = x1 - x0, dz = z1 - z0;
    const iv = [];
    for (const R of rs) {
      let t0 = 0, t1 = 1, ok = true;
      const p = [-dx, dx, -dz, dz], q = [x0 - R.x0, R.x1 - x0, z0 - R.z0, R.z1 - z0];
      for (let k = 0; k < 4; k++) {
        if (p[k] === 0) { if (q[k] < 0) { ok = false; break; } } else {
          const t = q[k] / p[k];
          if (p[k] < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; }
        }
      }
      if (ok) iv.push([t0, t1]);
    }
    if (!iv.length) { cur = null; continue; }
    iv.sort((a, b) => a[0] - b[0]);
    const m = [iv[0].slice()];
    for (let k = 1; k < iv.length; k++) { const l = m[m.length - 1]; if (iv[k][0] <= l[1] + 1e-9) l[1] = Math.max(l[1], iv[k][1]); else m.push(iv[k].slice()); }
    for (const [t0, t1] of m) {
      const a = [x0 + t0 * dx, z0 + t0 * dz], b = [x0 + t1 * dx, z0 + t1 * dz];
      if (!cur || t0 > 0) { cur = [a]; res.push(cur); }
      cur.push(b);
      if (t1 < 1) cur = null;
    }
  }
  return res.filter((l) => l.length >= 2);
}

const _ncache = new Map();
/** The cells of the bounding box of the union that are NOT in the union (the notches), as rectangles on the grid of all rectangle edges. */
export function notchCells(rs) {
  let c = _ncache.get(rs); if (c) return c;
  const xs = [...new Set(rs.flatMap((r) => [r.x0, r.x1]))].sort((a, b) => a - b), zs = [...new Set(rs.flatMap((r) => [r.z0, r.z1]))].sort((a, b) => a - b);
  c = [];
  for (let i = 0; i + 1 < xs.length; i++) for (let j = 0; j + 1 < zs.length; j++) { const cx = (xs[i] + xs[i + 1]) / 2, cz = (zs[j] + zs[j + 1]) / 2; if (!rs.some((r) => inR(r, cx, cz))) c.push({ x0: xs[i], x1: xs[i + 1], z0: zs[j], z1: zs[j + 1] }); }
  _ncache.set(rs, c); return c;
}
const BIG = 1e7;
function subtractRect(ring, c) { // ring minus an axis-aligned rectangle = up to four disjoint convex-clipped pieces (left, right, above, below); the ring itself when it does not enter the rectangle
  const hit = clipRing(ring, c);
  if (!hit || Math.abs(ringArea(hit)) < 1e-6) return [ring];
  return [{ x0: -BIG, x1: c.x0, z0: -BIG, z1: BIG }, { x0: c.x1, x1: BIG, z0: -BIG, z1: BIG }, { x0: c.x0, x1: c.x1, z0: -BIG, z1: c.z0 }, { x0: c.x0, x1: c.x1, z0: c.z1, z1: BIG }]
    .map((R) => clipRing(ring, R)).filter((p) => p && Math.abs(ringArea(p)) > 1e-4);
}
/** Clip a closed ring against the UNION of rectangles: a list of closed rings. A ring that lies inside the union is returned whole (never cut at a seam or in an overlap);
 *  a ring that crosses the outer boundary is clipped to the bounding box and the notches are cut away (disjoint pieces). With one rectangle: [clipRing(ring, R)]. */
export function clipRingUnion(ring, rs) {
  if (rs.length === 1) { const o = clipRing(ring, rs[0]); return o ? [o] : []; }
  const b = bboxOf(ring);
  for (const r of rs) if (b.x0 >= r.x0 && b.x1 <= r.x1 && b.z0 >= r.z0 && b.z1 <= r.z1) { const o = clipRing(ring, r); return o ? [o] : []; }
  const o = clipRing(ring, bboxRects(rs)); if (!o) return [];
  let pieces = [o];
  for (const c of notchCells(rs)) pieces = pieces.flatMap((p) => subtractRect(p, c));
  return pieces;
}
