// people/zones.js - where people WANT to be (simulation half): the zone weight field zoneW(x, z) used by the spawner, the goal picker and the density plan.
// Source: docs/research/people.md S3 (people per 10 m of one pavement: Anichkov-Liteyny 7, Liteyny-Mayakovskogo 8, Mayakovskaya-Marata 11, Marata-Vosstaniya 11,
// Vosstaniya square 14, side streets 1.5-5, courtyards 0.5) and S4 (the 20 spots).  The field is a sum of a Nevsky corridor (distance to the avenue centre lines times a
// piecewise weight along the grid axis u) and gaussian hot spots (the square, the rotunda, the forecourt, Mayakovskaya, the Anichkov plinths ...).
// The hot spots are placed from the real landmark positions (layout.js / station frame), not from the +-25 m lat / lon of the research table.
import { makeFrame } from './frame.js';

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
  // ---- the ENGINEERING CASTLE reach (docs/research/mars-field.md S12; amplitudes are the weights of the west table x ~0.5: busy, but this is not Nevsky).
  //      The surfaces themselves carry a base weight (people/area.js); the spots below are the places people stop: the castle and the Peter I monument.
  HOT.push(
    [-712, -757, 2.2, 22], [-737, -824, 2.0, 22], [-737, -842, 1.2, 16], [-690, -790, 0.7, 40], [-778, -948, 1.0, 16],
  );
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
