// people/zones.js - where people WANT to be (simulation half): the zone weight field zoneW(x, z) used by the spawner, the goal picker and the density plan.
// Source: docs/research/people.md S3 (people per 10 m of one pavement: Anichkov-Liteyny 7, Liteyny-Mayakovskogo 8, Mayakovskaya-Marata 11, Marata-Vosstaniya 11,
// Vosstaniya square 14, side streets 1.5-5, courtyards 0.5) and S4 (the 20 spots).  The field is a sum of a Nevsky corridor (distance to the avenue centre lines times a
// piecewise weight along the grid axis u) and gaussian hot spots (the square, the rotunda, the forecourt, Mayakovskaya, the Anichkov plinths ...).
// The hot spots are placed from the real landmark positions (layout.js / station frame), not from the +-25 m lat / lon of the research table.
import { makeFrame } from './frame.js';
import { PETRO_OFF, VO_SIGHTS } from './petroarea.js';
import { VO_OFF, VO_HOT, inVO } from './voarea.js';
import { ISL_HOT, ISL_SIGHTS, inIsl } from './isl2area.js';

// the EAST part (u > -1250: Vosstaniya - Fontanka) is the original table of docs/research/people.md; the WEST part (u < -1250, grid u along Nevsky from Vosstaniya: Sadovaya -1647, Gostiny Dvor
// -1740, Kazan bridge -2043, Kazan colonnade -2100 .. -2200, Green Bridge -2430, Bolshaya Morskaya -2563, the Admiralty -2850) is the tourist centre of docs/research/west-life-furniture.md
// section 2.2: much denser than the east (Z1 Gostiny Dvor 9, Z3 the Kazan bridge 26, Z4 the Kazan colonnade 8, Z5 7, Z6 6, Z7 4 per 10 m of ONE pavement at 'default'; the weights below are
// those numbers x ~0.22 and then pushed up by the hot spots).
const TAB = [[-3200, 0.9], [-2950, 1.3], [-2850, 1.7], [-2650, 2.0], [-2563, 2.3], [-2430, 2.2], [-2300, 1.9], [-2200, 2.2], [-2100, 2.2], [-2043, 2.6], [-1950, 2.0], [-1850, 2.1], [-1740, 2.0], [-1600, 1.5], [-1450, 1.0], [-1300, 0.7],
  [-1250, 0.55], [-1050, 0.8], [-880, 0.72], [-700, 0.95], [-500, 1.0], [-330, 1.15], [-100, 1.2], [60, 1.45], [200, 0.9]];
const nevskyU = (u) => { if (u <= TAB[0][0]) return TAB[0][1]; for (let i = 1; i < TAB.length; i++) if (u <= TAB[i][0]) { const a = TAB[i - 1], b = TAB[i], k = (u - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * k; } return TAB[TAB.length - 1][1]; };

/** build the zone field; `L` = layout namespace, `roads` = streets.roads (the Nevsky carriageways are picked by name) */
export function makeZones(L, roads, stationFrame, ex = {}) {
  const { W } = makeFrame(stationFrame);
  const nev = L.NAMES.streets.nevsky, segs = [];
  for (const r of roads || []) {
    if (r.name !== nev || !r.pts) continue;
    for (let i = 0; i + 1 < r.pts.length; i++) { const a = r.pts[i], b = r.pts[i + 1]; segs.push([a[0], a[1], b[0], b[1], Math.min(a[0], b[0]) - 70, Math.max(a[0], b[0]) + 70, Math.min(a[1], b[1]) - 70, Math.max(a[1], b[1]) + 70]); }
  }
  // 64 m grid over the (70 m expanded) segment boxes: dNev is evaluated hundreds of thousands of times while the density fields are built
  const GC = 64, grid = new Map();
  segs.forEach((s, i) => { for (let cx = Math.floor(s[4] / GC); cx <= Math.floor(s[5] / GC); cx++) for (let cz = Math.floor(s[6] / GC); cz <= Math.floor(s[7] / GC); cz++) { const k = cx * 4096 + cz; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i); } });
  const dNev0 = (x, z) => {
    let best = 1e9;
    const cand = grid.get(Math.floor(x / GC) * 4096 + Math.floor(z / GC)); if (!cand) return best;
    for (let n = 0; n < cand.length; n++) {
      const s = segs[cand[n]]; if (x < s[4] || x > s[5] || z < s[6] || z > s[7]) continue;
      const dx = s[2] - s[0], dz = s[3] - s[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - s[0]) * dx + (z - s[1]) * dz) / l2)), d = Math.hypot(x - s[0] - dx * t, z - s[1] - dz * t);
      if (d < best) best = d;
    }
    return best;
  };
  // the distance to the avenue as a 8 m field (bilinear, 130 m reach): the exact search above walks ~30 segments per call and runs ~10^6 times while the lattice is built
  const DF = 8, DR = 130; let dX0 = 1e9, dX1 = -1e9, dZ0 = 1e9, dZ1 = -1e9;
  for (const s of segs) { dX0 = Math.min(dX0, s[0], s[2]); dX1 = Math.max(dX1, s[0], s[2]); dZ0 = Math.min(dZ0, s[1], s[3]); dZ1 = Math.max(dZ1, s[1], s[3]); }
  const dW = Math.max(2, Math.ceil((dX1 - dX0 + 2 * DR) / DF) + 1), dH = Math.max(2, Math.ceil((dZ1 - dZ0 + 2 * DR) / DF) + 1), dOX = dX0 - DR, dOZ = dZ0 - DR, dField = new Float32Array(segs.length ? dW * dH : 4).fill(DR + 1);
  if (segs.length) for (let j = 0; j < dH; j++) for (let i = 0; i < dW; i++) { const d = dNev0(dOX + i * DF, dOZ + j * DF); dField[j * dW + i] = d < DR + 1 ? d : DR + 1; }
  const dNev = (x, z) => {
    if (!segs.length) return 1e9;
    const fu = (x - dOX) / DF, fv = (z - dOZ) / DF; if (fu < 0 || fv < 0 || fu >= dW - 1 || fv >= dH - 1) return 1e9;
    const i = Math.floor(fu), j = Math.floor(fv), a = fu - i, b = fv - j, k = j * dW + i;
    const d = (dField[k] * (1 - a) + dField[k + 1] * a) * (1 - b) + (dField[k + dW] * (1 - a) + dField[k + dW + 1] * a) * b;
    return d > DR ? 1e9 : d;
  };
  const f = (u, d) => W(u, d);
  const sq = f(0, -45), fc = f(0, -12);
  /** [x, z, amplitude, sigma] */
  const HOT = [
    [592, 165, 2.6, 48],            // the Hero City obelisk and the square
    [516, 92, 2.8, 36],             // the Vosstaniya rotunda
    [sq[0], sq[1], 1.6, 45],        // the station forecourt (the square in front of the facade)
    [fc[0], fc[1], 2.3, 24],        // the front pavement and the doors
    [560, 150, 2.0, 40],            // the corner Nevsky / Ligovsky
    [205, 100, 2.2, 38],            // Mayakovskaya (Nevsky Atrium exits)
    [300, 60, 1.5, 38],             // the Marata crossing
    [425, 130, 1.0, 40],            // Nevsky Centre / Pushkinskaya
    [-441, -93, 1.7, 52],           // the Anichkov Bridge and the Klodt plinths
    [-420, -30, 1.1, 40],           // the Fontanka embankment (north-east quay)
    [-210, 20, 1.3, 50],            // Vladimirsky / Liteyny crossroads
    [-110, 20, 0.8, 45],
    [0, 0, 0.6, 50],                // Mayakovskogo
    [-186, 520, 1.0, 40],           // Vladimirskaya (metro, cathedral)
    [f(-2, 40)[0], f(-2, 40)[1], 1.6, 24],        // the station vestibule / hall (benches, kiosks, the Peter bust)
    [f(-2, 100)[0], f(-2, 100)[1], 1.3, 30],      // the concourse under the departure boards
    [f(-12, 165)[0], f(-12, 165)[1], 0.9, 30],    // the turnstiles and the apron
    [600, 470, 0.9, 40], [640, 520, 0.7, 55], [670, 620, 0.35, 70],   // the platform heads
    // ---- the WEST (docs/research/west-life-furniture.md section 2.4, spots S1-S20)
    [-1469, -285, 2.6, 36],         // S3 Kazan garden: the fountain rim, the white benches, pigeons
    [-1415, -285, 1.2, 20],         // S4 Kutuzov plinth (guides stop groups)
    [-1511, -315, 1.2, 20],         // S4 Barclay plinth
    [-1500, -235, 1.3, 40],         // the colonnade forecourt (the cathedral facade seen from Nevsky)
    [-1391, -331, 2.8, 28],         // S1 Kazan bridge: parapets, boats, photographers (~26 per 10 m)
    [-1374, -385, 1.0, 20],         // S2 the Kazan landing stage
    [-1420, -347, 1.6, 26],         // S5 Singer House kerb
    [-1768, -420, 1.8, 30],         // the Green Bridge / Moika pier S16
    [-1500, -470, 0.9, 34],         // S18 painters / caricaturists on the Griboedov embankment
    [-1919, -629, 2.3, 32],         // S6 the General Staff arch: buskers, costume characters
    [-1983, -738, 1.3, 34],         // S7 the Alexander Column ring
    [-2010, -740, 1.0, 95],         // the Palace Square sett field (one person per ~25 m2 in the photos; the scripted groups of west.js come on top)
    [-2096, -870, 1.4, 40],         // S9 the Winter Palace south front
    [-2097, -893, 1.5, 36],         // S8 the Hermitage courtyard queue
    [-1779, -872, 0.9, 30],         // S10 Pevchesky Bridge / Moika 39
    [-2400, -830, 0.9, 30],         // S11 the Palace Bridge landing
    [-2440, -766, 1.2, 62],         // the Admiralty garden
    [-2335, -494, 1.6, 52],         // S12 the Alexander Garden fountain
    [-2480, -500, 0.7, 95],         // the Alexander Garden (9 ha)
    [-2449, -63, 2.0, 58],          // S13 St Isaac's garden and the monument rim
    [-2396, 35, 1.2, 40],           // the Nicholas I monument
    [-2745, -443, 1.4, 42],         // S14 Senate Square / the Bronze Horseman
    [-805, -86, 1.7, 52],           // S15 the Catherine garden: chess, artists at the monument
    [-1050, -215, 1.3, 30],         // S17 Gostiny Dvor metro stairs
    [-1000, -190, 1.9, 22], [-1058, -204, 2.0, 24], [-1115, -218, 1.9, 22],   // the open arcade of Gostiny Dvor (shoppers: the lattice runs through it)
    [-1008, -215, 0.8, 20],         // S19 excursion kiosks
    [-1100, -230, 0.8, 70],         // the Gostiny Dvor front promenade
    [-2029, -412, 1.4, 28],         // the Admiralteyskaya metro doors
    [-1352, -341, 1.2, 24],         // the Nevsky Prospekt / Gostiny Dvor canal exits at the Kazan bridge
    [-1170, -265, 0.8, 24],         // the Nevsky pits
    [-1905, -600, 1.5, 30], [-1895, -545, 1.9, 30], [-1888, -490, 1.9, 30], [-1884, -450, 1.6, 26],       // the pedestrian block of Bolshaya Morskaya to the General Staff arch (tents, buskers: 9 per 10 m)
    [-1545, -475, 0.6, 40], [-1700, -430, 0.9, 26], [-1620, -400, 0.9, 26],                              // Bolshaya Konyushennaya, the Griboedov / Moika banks
    [-2060, -950, 0.8, 50], [-2250, -960, 0.6, 60],                                                      // the Hermitage embankment, the Palace Embankment
  ];
  // ---- the MARS FIELD / SUMMER GARDEN / ENGINEERING CASTLE reach (docs/research/mars-field.md S12, summer-garden.md S10; amplitudes are the weights of the west table x ~0.5: busy, but this is not Nevsky).
  //      The surfaces themselves carry a base weight (people/area.js); the spots below are the places people stop.
  HOT.push(
    [-1086, -1243, 2.4, 22],          // the Eternal Flame: the stream of tourists and photographers round the platform
    [-1086, -1243, 0.8, 55],          // the memorial plaza (116 x 75 m gravel)
    [-1186, -1329, 0.55, 30], [-1078, -1381, 0.5, 30], [-1106, -1115, 0.5, 30], [-995, -1161, 0.4, 30],      // the four rondels (strollers, prams, dog walkers)
    [-1135, -1400, 0.5, 40], [-1250, -1310, 0.5, 40],        // the north axial alley, the barracks promenade (pensioners on the white benches)
    [-1060, -1440, 0.45, 40], [-1100, -1050, 0.6, 45], [-1160, -1060, 0.4, 40],     // the Lebyazhya side, the Moika end (ice-cream carts)
    [-1197, -1502, 1.3, 26],          // Suvorov Square: photographers of the monument on the island, from the pavements
    [-1330, -1450, 0.8, 22], [-1290, -1460, 0.6, 30],        // the Marble Palace forecourt fence (the Alexander III monument behind it), the Millionnaya front
    [-1370, -1500, 0.7, 40],          // the Palace Embankment in front of the Marble Palace
    [-1217, -1567, 1.5, 28],          // the Trinity Bridge approach: photographers of the spire of Peter and Paul
    [-1069, -1611, 2.2, 22],          // the Upper Swan Bridge: photographers
    // the Summer Garden
    [-967, -1637, 3.2, 14], [-970, -1650, 2.4, 22],          // the central (Neva) gate: the queue at the security booth, the embankment in front of the fence (gold-and-black gate, columns)
    [-1010, -1620, 1.1, 14], [-925, -1658, 1.1, 14],          // the small gates
    [-909, -1537, 1.6, 14],           // the Krylov monument (kids on the pedestal edge)
    [-812, -1498, 1.3, 12], [-868, -1540, 1.2, 12],          // the Coffee House, the Tea House
    [-827, -1640, 1.5, 16],           // the Summer Palace of Peter I
    [-925, -1582, 1.0, 14], [-823, -1086, 0.9, 16],          // the Menagerie pond, the Carp pond
    [-810, -1046, 1.3, 14],           // the Moika gate
    // the Engineering Castle and the Peter I monument
    [-712, -757, 2.2, 22], [-737, -824, 2.0, 22], [-737, -842, 1.2, 16], [-690, -790, 0.7, 40], [-778, -948, 1.0, 16],
  );
  if (!globalThis.__swOff) HOT.push(                                 // the SOUTH-WEST (docs/research/mariinsky.md S9, yusupov.md, new-holland.md S10, nikolsky.md): Teatralnaya Square, Yusupov Palace, New Holland, Nikolsky Cathedral
    [-3056, 740, 2.2, 22], [-3040, 735, 1.2, 35], [-3010, 730, 0.6, 60],           // the Mariinsky portico (the three doors, theatre-goers, bouquets), the square in front, Teatralnaya Square
    [-2970, 786, 1.5, 16], [-3026, 661, 1.2, 16], [-2993, 677, 1.0, 18], [-3150, 742, 0.9, 20],      // Glinka, Rimsky-Korsakov, the Conservatory north door (students), Mariinsky-2 terrace
    [-2954, 322, 2.0, 16], [-2975, 300, 1.0, 20], [-2900, 366, 0.9, 18], [-2930, 442, 0.8, 22], [-2921, 462, 0.7, 12],  // Yusupov: the portico queue, the quay opposite, the courtyard, the garden, the mound
    [-3440, 275, 1.6, 40], [-3405, 248, 1.0, 25], [-3398, 346, 1.6, 22], [-3443, 350, 1.3, 16],      // New Holland: the lawn bowl, the stage lawn, the Kovsh pier, the Frigate playground
    [-3548, 337, 1.4, 26], [-3480, 329, 1.0, 14], [-3505, 262, 0.7, 30], [-3392, 175, 1.0, 14], [-3395, 470, 1.2, 18], [-3330, 314, 0.8, 12],   // the Bottle terrace, the Kuznya cafe, the alley, the north gate, the Moika quay in front of the Arch, the east bridge
    [-2896, 1120, 1.8, 16], [-2926, 1131, 1.0, 14], [-2946, 1141, 1.4, 14], [-2878, 1068, 0.9, 14], [-2920, 1090, 0.5, 40], [-2935, 1085, 0.7, 10],   // Nikolsky: the west door, the avenue, the bell tower, the north gate, the garden, the Tsushima obelisk
    [-1746, 718, 0.7, 45], [-2017, 657, 0.5, 14],          // Sennaya Square (low density: a metro square in the middle of the side streets), the Sennoy footbridge
    [-2789, 613, 1.0, 12], [-3163, 693, 0.8, 14], [-3000, 560, 0.35, 60], [-3000, 930, 0.35, 60],          // the Lviny and Dekabristov bridges, the Moika / Kryukov embankments between the sights
  );
  if (ex.sv) {                                                      // generated from the landmark services (positions follow the modules when they change)
    const g = ex.sv.landmarksGarden, m = ex.sv.landmarksMars;
    for (const f of (g && g.fountains) || []) HOT.push([f.x, f.z, 1.1, 12]);
    const nf = g && g.fences && g.fences.find((q) => q.id === 'neva-fence');
    if (nf) for (let i = 2; i + 2 < nf.pts.length; i += 4) { const a = nf.pts[i], b = nf.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; HOT.push([a[0] + dz / l * 6, a[1] - dx / l * 6, 0.85, 14]); }      // the embankment pavement along the fence
    for (const c of (m && m.crowd) || []) if (c.kind === 'slab') HOT.push([c.x, c.z, 0.5, 8]);
  }
  // ---- the PETROGRAD SIDE / the SPIT (docs/PETRO-BRIEF.md; positions from the sight services, see tools/people-petro-probe.mjs): the places where people stop. The surfaces and the avenue pavements
  //      carry their base weight in people/petroarea.js; amplitudes as in the Mars table (busy sights 1.5-2.2, the rest 0.5-1.2).
  if (ex.area && ex.area.petro && !PETRO_OFF) {
    const P0 = HOT.length;
    HOT.push(
      // the Peter and Paul Fortress: Ioannovsky bridge + the Hare, the gates, the main alley, the cathedral square, Shemyakin's Peter, the Mint, the Nevsky gate + Commandant pier, the Naryshkin bastion, the beach
      [-1620, -2190, 0.9, 34], [-1600, -2219, 1.2, 9], [-1643, -2115, 1.0, 14], [-1690, -2075, 0.7, 22], [-1740, -2046, 1.0, 16], [-1800, -2025, 0.6, 24], [-1850, -2000, 0.7, 22], [-1872, -1979, 1.5, 10],
      [-1915, -1985, 0.7, 20], [-1990, -1960, 1.8, 20], [-1979, -1966, 1.0, 10], [-2023, -1990, 0.7, 12], [-1927, -1925, 0.8, 14], [-1845, -1890, 0.8, 14], [-1817, -1853, 1.0, 9], [-1896, -1812, 0.9, 12],
      [-2040, -1740, 1.1, 30], [-1960, -1752, 0.9, 18], [-2142, -1875, 0.5, 14], [-1910, -2122, 0.5, 12], [-2081, -2021, 0.4, 12], [-2350, -1927, 0.6, 22], [-1602, -1990, 0.5, 14],
      // the Spit: the descent and the viewpoint at the tip, the garden, the Rostral columns, the granite spheres, the Exchange steps, the Zoological Museum, the Pushkin House
      [-2462, -1321, 2.2, 13], [-2481, -1309, 1.2, 28], [-2555, -1359, 1.3, 13], [-2473, -1221, 1.3, 13], [-2494, -1364, 0.9, 8], [-2439, -1272, 0.9, 8], [-2514, -1289, 0.6, 8], [-2572, -1262, 0.9, 18],
      [-2590, -1125, 0.6, 20], [-2783, -1423, 0.5, 14],
      // Universitetskaya embankment: Kunstkamera, the Academy, Lomonosov, the Twelve Collegia, the University door
      [-2593, -995, 1.1, 18], [-2691, -918, 0.6, 16], [-2770, -895, 0.9, 12], [-2785, -840, 0.6, 18], [-2888, -1024, 0.8, 16],
      // Troitskaya Square, the chapel, the Solovetsky stone, Kshesinskaya, the Mosque, Gorky, Gorkovskaya metro
      [-1443, -2296, 1.0, 26], [-1442, -2158, 0.9, 12], [-1411, -2216, 0.9, 10], [-1494, -2440, 0.9, 12], [-1564, -2546, 1.3, 13], [-1556, -2586, 0.7, 12], [-1752, -2704, 0.8, 12], [-1821, -2674, 1.6, 15], [-1790, -2652, 1.2, 11],
      // Alexander Park and the Kronverk: the museum gate, the Decembrists obelisk, Steregushchy, the mini-city, Narodny Dom, the zoo gate, the grotto, the ponds
      [-2056, -2284, 0.9, 13], [-1853, -2332, 0.7, 10], [-1688, -2569, 1.0, 12], [-1946, -2598, 1.1, 14], [-1923, -2564, 0.6, 8], [-2149, -2631, 0.7, 14], [-2245, -2592, 0.6, 12], [-2309, -2592, 0.6, 12],
      [-2371, -2356, 1.4, 13], [-1723, -2461, 0.6, 14], [-1663, -2396, 0.5, 14],
      // Petrovskaya embankment: the Shi-Tsza lions, the Cabin of Peter I, the sailors' monument, the Aurora quay, the gangway, the Nakhimov school
      [-1117, -2249, 1.3, 10], [-1124, -2278, 1.1, 11], [-1148, -2343, 0.6, 12], [-782, -2442, 0.7, 12], [-770, -2517, 2.0, 15], [-789, -2578, 1.3, 11], [-826, -2558, 0.7, 12],
      // Kamennoostrovsky / Bolshoy: Lev Tolstoy Square + Petrogradskaya metro, Austrian Square, the Benois house, Sytny market, the House with Owls, the middle of Bolshoy pr.
      [-2196, -3712, 1.4, 26], [-2228, -3771, 1.6, 13], [-1903, -3067, 1.0, 26], [-2040, -3352, 0.5, 20], [-2324, -2745, 0.8, 24], [-2796, -2975, 0.5, 14], [-2962, -2795, 0.5, 40], [-1775, -2844, 0.5, 14],
      // the west: Prince Vladimir Cathedral, the garden, Yubileyny, Sportivnaya, the stadium, the Zhdanovka
      [-3185, -2158, 1.0, 13], [-3129, -2085, 0.6, 22], [-3279, -2048, 0.8, 18], [-3392, -2157, 0.8, 10], [-3320, -2187, 0.8, 10], [-3333, -2135, 0.7, 10], [-3377, -2235, 0.4, 10], [-3600, -2330, 0.3, 40], [-3622, -2356, 0.5, 14],
      // the middle of the big bridges (people stop to look at the Neva)
      [-1331, -1820, 0.5, 40], [-2415, -977, 0.4, 30], [-2679, -1545, 0.4, 30], [-3677, -1842, 0.35, 30],
      // P6..P9: the Medical University on the Karpovka (students)
      [-2700, -4050, 0.9, 22],
    );
    const far = (x, z, d) => { for (let i = P0; i < HOT.length; i++) if (Math.abs(HOT[i][0] - x) < d && Math.abs(HOT[i][1] - z) < d) return false; return true; };
    for (const k of ['landmarksUniversity', 'landmarksKronverk', 'landmarksVladimir', 'landmarksAurora', 'landmarksTroitskaya', 'landmarksStrelka', 'landmarksKamennoostrovsky', 'landmarksKarpovka'])        // crowd spots a module adds later
      for (const c of (ex.sv && ex.sv[k] && ex.sv[k].crowd) || []) if (Number.isFinite(c.x) && Number.isFinite(c.z) && !(c.y !== undefined && Math.abs(c.y) > 0.5) && far(c.x, c.z, 7)) HOT.push([c.x, c.z, Math.min(1.2, 0.4 + (c.n || 6) / 14), Math.max(8, (c.r || 5) + 4)]);
    // ---- VASILIEVSKY ISLAND (people/voarea.js): the shop + food cells and the hubs of the roster, the tram stops of Sredny pr. (3), the metro doors, then the crowd discs of the sixteen sight services
    if (!VO_OFF) {
      HOT.push(...VO_HOT);
      for (const b of (ex.sv && ex.sv.streets && ex.sv.streets.busStops) || []) if (b.tram && Number.isFinite(b.x) && inVO(b.x, b.z)) HOT.push([b.x, b.z, 0.8, 12]);
      for (const e of (ex.sv && ex.sv.metro && ex.sv.metro.entrances) || []) if (e.kind !== 'pit' && Number.isFinite(e.x) && inVO(e.x, e.z) && far(e.x, e.z, 3)) HOT.push([e.x, e.z, 1.2, 14]);
      for (const k of VO_SIGHTS)
        for (const c of (ex.sv && ex.sv[k] && ex.sv[k].crowd) || []) if (Number.isFinite(c.x) && Number.isFinite(c.z) && !(c.y !== undefined && Math.abs(c.y) > 0.5) && far(c.x, c.z, 7)) HOT.push([c.x, c.z, Math.min(1.2, 0.4 + (c.n || 6) / 14), Math.max(8, (c.r || 5) + 4)]);
    }
  }
  // ---- the ISLANDS of round 2 (people/isl2area.js; docs/research/people-isl2.md): the places where people stop on Yelagin, Kamenny, Aptekarsky, Petrovsky and round the Krestovsky arena, then the crowd discs of the sight services
  //      and the metro doors of the islands. The surfaces carry their base weight in the raster of isl2area.js.
  if (ex.area && ex.area.isl) {
    const I0 = HOT.length; HOT.push(...ISL_HOT);
    const farI = (x, z, d) => { for (let i = I0; i < HOT.length; i++) if (Math.abs(HOT[i][0] - x) < d && Math.abs(HOT[i][1] - z) < d) return false; return true; };
    for (const k of ISL_SIGHTS)
      for (const c of (ex.sv && ex.sv[k] && ex.sv[k].crowd) || []) if (Number.isFinite(c.x) && Number.isFinite(c.z) && !(c.y !== undefined && Math.abs(c.y) > 0.5) && farI(c.x, c.z, 7)) HOT.push([c.x, c.z, Math.min(1.2, 0.4 + (c.n || 6) / 14), Math.max(8, (c.r || 5) + 4)]);
    for (const e of (ex.sv && ex.sv.metro && ex.sv.metro.entrances) || []) if (e.kind !== 'pit' && Number.isFinite(e.x) && inIsl(e.x, e.z) && farI(e.x, e.z, 3)) HOT.push([e.x, e.z, 1.2, 14]);
  }
  // the hot spots in a 32 m grid (every cell lists the spots whose 3 sigma box touches it): zoneW is called ~10^6 times while the lattice is built
  const HG = 32, hgrid = new Map(), HK = (cx, cz) => cx * 8192 + cz;
  HOT.forEach((h, i) => { const r = 3 * h[3]; for (let cx = Math.floor((h[0] - r) / HG); cx <= Math.floor((h[0] + r) / HG); cx++) for (let cz = Math.floor((h[1] - r) / HG); cz <= Math.floor((h[1] + r) / HG); cz++) { const k = HK(cx, cz); let a = hgrid.get(k); if (!a) hgrid.set(k, (a = [])); a.push(i); } });
  const zoneW = (x, z) => {
    let w = 0.06;
    if (ex.area) w += ex.area.weight(x, z);
    const d = dNev(x, z); if (d < 120) { const g = L.toGrid(x, z); w += 1.1 * nevskyU(g.u) * Math.exp(-(d * d) / (46 * 46)); }
    const cell = hgrid.get(HK(Math.floor(x / HG), Math.floor(z / HG)));
    if (cell) for (let q = 0; q < cell.length; q++) { const h = HOT[cell[q]], dx = x - h[0], dz = z - h[1]; if (dx > 3 * h[3] || dx < -3 * h[3] || dz > 3 * h[3] || dz < -3 * h[3]) continue; w += h[2] * Math.exp(-(dx * dx + dz * dz) / (h[3] * h[3])); }
    return w;
  };
  return { zoneW, HOT, dNev };
}
