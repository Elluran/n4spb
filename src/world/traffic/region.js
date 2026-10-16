// traffic/region.js - the regions of the Petrograd side / Spit extension (P1..P9, V1, V2 of docs/PETRO-BRIEF.md, opened 2026-10-06 / 07), pure data. Rules that must not move anything in the
// districts the user has already reviewed ask inPetro(x, z) first (the same test as props/petro.js and streets/region.js isOpen, without their margins).
import { PLAY_RECTS } from '../layout.js';

const RECTS = [[-2450, -800, -2800, -1300], [-3950, -2450, -2800, -1700], [-3400, -1500, -3350, -2800], [-2900, -1700, -3900, -3350], [-800, -550, -2900, -2250], [-3050, -2300, -1700, -700], [-3950, -3050, -1800, -1300],
  // P6..P9 (2026-10-07): the rest of Petrogradsky Island (north-west corner, north-east quarter, the Karpovka strip, the west tip)
  [-4400, -2900, -3900, -2600], [-1700, -600, -4080, -2800], [-4400, -1700, -4260, -3900], [-4950, -4400, -3700, -3000],
  // V3..V12 (2026-10-09, docs/reference/vo-frame.md): Vasilievsky Island from the Spit to the Gulf (append only: `older` is computed from the index of RECTS[0] in PLAY_RECTS)
  [-3150, -2450, -1900, -150], [-3850, -3150, -2250, -150], [-4550, -3850, -2250, 900], [-5250, -4550, -2250, 1650], [-5950, -5250, -1900, 1600], [-6650, -5950, -1900, 1250],
  [-7350, -6650, -2250, 900], [-8050, -7350, -2250, 900], [-8750, -8050, -2600, 900], [-9800, -8750, -2600, 550]];
let older = null;
/** (x, z) lies in the extension (grown by m metres) and in no older play rectangle */
export function inPetro(x, z, m = 0) {
  if (older === null) { const i = PLAY_RECTS.findIndex((r) => r.x0 === RECTS[0][0] && r.x1 === RECTS[0][1] && r.z0 === RECTS[0][2]); older = i < 0 ? false : PLAY_RECTS.slice(0, i); }
  if (!older) return false;
  if (!RECTS.some((r) => x >= r[0] - m && x <= r[1] + m && z >= r[2] - m && z <= r[3] + m)) return false;
  return !older.some((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1);
}
const ISL = [5, 6, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], PET = [0, 1, 2, 3, 4, 7, 8, 9, 10];
/** (x, z) lies on Vasilievsky Island west of x = -3300 (rectangles V1, V2, V3..V12) and in no rectangle of the Petrograd side (P1..P9): the rules of the island passes ask this (the Petrograd side stays as reviewed) */
export function inIsland(x, z) {
  if (x >= -3300 || !inPetro(x, z)) return false;
  const q = (i) => { const r = RECTS[i]; return x >= r[0] && x <= r[1] && z >= r[2] && z <= r[3]; };
  return ISL.some(q) && !PET.some(q);
}
