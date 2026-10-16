// landmarksUniversity-cams: the review cameras of the Universitetskaya embankment module, computed from the frames of src/world/landmarksUniversity/frame.js (so that they follow
// the buildings).  Prints a --cams string for tools/shot.mjs / tools/zfight.mjs.
//   node tools/landmarksUniversity-cams.mjs [names,comma,separated | all] [--list]
//   node tools/shot.mjs --only environment,streets,city,landmarksStrelka,landmarksUniversity --cams "$(node tools/landmarksUniversity-cams.mjs vista,kkFront)" --out shots/landmarksUniversity/x
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksUniversity/frame.js')).href);
const { KK, AC, TC, LOMO, SAKHAROV, GENIUS } = F;
const f1 = (v) => v.toFixed(1);
/** yaw (deg) of a camera looking along the world direction (dx, dz): 0 north, 90 west, 180 south, -90 east */
const yawOf = (dx, dz) => (Math.atan2(-dx, -dz) * 180) / Math.PI;
const walk = (p, look, pitch = 6) => `${f1(p[0])},${f1(p[1])},${f1(yawOf(look[0] - p[0], look[1] - p[1]))},${pitch}`;
const free = (p, y, look, pitch = 0) => `${f1(p[0])},${y},${f1(p[1])},${f1(yawOf(look[0] - p[0], look[1] - p[1]))},${pitch}`;
const stand = (p, y, look, pitch = 0) => `${f1(p[0])},${y},${f1(p[1])},${f1(yawOf(look[0] - p[0], look[1] - p[1]))},${pitch},1`;
const lomo = (x, z) => { const cs = Math.cos(AC.rot), sn = Math.sin(AC.rot); return [LOMO.x + x * cs + z * sn, LOMO.z - x * sn + z * cs]; };
const CAMS = {
  vista: '-2700,-520,0,3',                                                                 // the long vista from the south bank (Admiralty embankment)
  vistaW: '-2880,-560,0,3',                                                                // the same toward the Collegia end / Palace of Peter II
  vistaTele: free([-2700, -520], 6, KK.W(30, 0), 3),
  kkFront: walk(KK.W(47, 24), KK.W(47, 0), 24),                                            // the tourist view from the river parapet
  kkDoor: walk(KK.W(79, 5), KK.W(79, 0), 6),                                               // close-up 5 m: the door of the east wing
  kkWest: walk(KK.W(-16, 16), KK.W(25, -6), 12),                                           // the west end and the annex from Tamozhenny pereulok (photo kk_06)
  kkEast: walk(KK.W(112, 12), KK.W(70, -4), 12),                                           // from the Palace Bridge landing (photo kk_18)
  kkTower: free(KK.W(47.4, 46), 36, KK.W(47.4, -5), 4),                                    // the tower tiers at their own height
  kkSphere: free(KK.W(47.4, 9), 41.5, KK.W(47.4, -5), 6),                                  // the lantern and the armillary sphere
  kkYard: free(KK.W(40, -60), 30, KK.W(47.4, -5), -12),                                    // the yard side from above
  acFront: walk(AC.W(50, 23), AC.W(50, 0), 16),                                            // the portico from the river parapet
  acStairs: walk(AC.W(22, 9), AC.W(40, 2), 8),                                             // the west stair flight, the granite storey, the plates
  acPortico: stand(AC.W(35, 1.7), 3, AC.W(66, 1.7), 4),                                    // standing on the landing, along the colonnade
  acPlate: walk(AC.W(15.3, 2.6), AC.W(15.3, 0), 2),                                        // the heritage plate, 2.6 m away
  lomo: walk(lomo(1.5, 10), lomo(0, 0), 20),                                               // the monument from the front
  lomoClose: free(lomo(2.2, 5.5), 4.6, lomo(0, 0), -2),                                    // the figure, close (user checks monuments at 1-3 m)
  lomoBack: walk(lomo(-6, -16), lomo(0, 0), 12),                                           // from Mendeleevskaya line toward the Neva (photo lo_07)
  tcEnd: walk([-2799, -847], [-2832, -862], 14),                                           // the embankment end, the gate wall, the Rector's wing (photo tc_01)
  tcEast: walk(TC.W(150, 34), TC.W(190, 0), 10),                                           // along the east front from Mendeleevskaya line (photo tc_04)
  tcDoor: walk(TC.W(183.2, 13), TC.W(183.2, 2), 10),                                       // the main entrance, the plates
  tcSection: walk(TC.W(118, 9), TC.W(120, 0), 18),                                         // one projection close up inside the garden (photo tc_24)
  tcGenius: walk([GENIUS.x + 5.2, GENIUS.z - 3.2], [GENIUS.x, GENIUS.z], 30),
  tcWest: walk(TC.W(60, -40), TC.W(110, -23), 8),                                          // the gallery side from the University yard
  tcNorth: walk(TC.W(418, -4), TC.W(396, -10), 12),                                        // the north end from Sakharov Square (photo tc_02)
  tcAerial: free(TC.W(-40, 110), 75, TC.W(170, -9), -22),
  sakharov: walk([SAKHAROV.x + 4.5, SAKHAROV.z - 4.5], [SAKHAROV.x, SAKHAROV.z], 16),
  gdCorner: walk([-2925, -1166], [-2896, -1240], 10),                                      // Gostiny Dvor from the corner of Birzhevoy proezd (photo gd_03)
  gdArcade: walk([-2936.5, -1213], [-2948, -1240], 4),                                     // close to the arcade on Mendeleevskaya line
  gdInside: walk([-2923.7, -1203.2], [-2952, -1253.4], 2),                                  // inside the arcade, along the vaulted walk
  p2Front: walk([-2874, -785], [-2893, -814], 10),                                         // the Palace of Peter II from the river parapet
  rector: walk([-2832, -826], [-2845, -848], 12),
  mwEnd: walk(lomo(8, -6), [-2748, -929], 12),                                             // the end of the Museum wing behind the monument (photo lo_16)
  aerial: free([-2660, -720], 230, [-2800, -1010], -38),
  aerialS: free([-2560, -640], 120, [-2740, -960], -20),
};
const want = (process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'all');
const names = want === 'all' ? Object.keys(CAMS) : want.split(',');
if (process.argv.includes('--list')) for (const n of names) console.log(n.padEnd(12), CAMS[n]);
else console.log(names.map((n) => { if (!CAMS[n]) throw new Error('unknown camera ' + n); return CAMS[n]; }).join(';'));
