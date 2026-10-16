// streets/region.js - REVIEWED DISTRICTS ARE FROZEN (pure data, no three.js, runs in node).
// The user reviews the streets district by district by driving them (docs/AGENT-BRIEF.md "Road integrity rules"). A rule that is added or tightened AFTER a district has been reviewed must not
// redraw that district: a generator change that is right for the new data would otherwise move kerbs, poles and plates the user has already accepted. Every rule that came with a later extension
// therefore asks isOpen(x, z) first; the rules themselves stay generic (no coordinates, no ids), only their reach is the not-yet-reviewed part of the map.
//   reviewed = the PLAY rectangle of every region listed before FIRST_OPEN in data/city.js RECT_NAMES (the first build, the west, east, north, Mars Field and south-west extensions);
//   open     = inside the EXTENT rectangle of a later region (+ 100 m: main streets that leave the data run on straight for 70 m, net.js rawWays, with their lamps and fillets) and outside every reviewed PLAY rectangle
//              (the Petrograd side and the Spit of Vasilievsky Island, 2026-10-06).
// tools/streets-signature.mjs uses the same zones: `--diff` proves that the reviewed zone is identical before and after a change (cell by cell, to the centimetre).
// When the open area has been reviewed, move FIRST_OPEN to the first region of the next extension (or past the end: everything frozen).
import { REGIONS, RECT_NAMES } from '../data/city.js';
import { PETROVSKY_POLYS } from './island-polys.js';

export const FIRST_OPEN = 'P1';
const k0 = RECT_NAMES.indexOf(FIRST_OPEN), cut = k0 < 0 ? RECT_NAMES.length : k0;
const REACH = 100, grow = (r) => ({ x0: r.x0 - REACH, x1: r.x1 + REACH, z0: r.z0 - REACH, z1: r.z1 + REACH });
const OPEN = REGIONS.filter((r) => RECT_NAMES.indexOf(r.name) >= cut).map((r) => grow(r.extentRect)), REVIEWED = REGIONS.filter((r) => RECT_NAMES.indexOf(r.name) < cut).map((r) => r.playRect);
const inRect = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const BB = OPEN.reduce((b, r) => ({ x0: Math.min(b.x0, r.x0), x1: Math.max(b.x1, r.x1), z0: Math.min(b.z0, r.z0), z1: Math.max(b.z1, r.z1) }), { x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 });

/** true when (x, z) lies in a district the user has not reviewed yet: the rules of the latest extension apply there */
export function isOpen(x, z) {
  if (x < BB.x0 || x > BB.x1 || z < BB.z0 || z > BB.z1) return false;
  for (const r of REVIEWED) if (inRect(r, x, z)) return false;
  for (const r of OPEN) if (inRect(r, x, z)) return true;
  return false;
}
// ISLANDS ROUND 2 (2026-10-14: Yelagin, Kamenny, Aptekarsky, Petrovsky, Krestovsky): rules of this round reach only the island regions (and the open districts, isOpen), so that the Petrograd side and
// Vasilievsky Island, which were reviewed after P1, keep their drawing to the centimetre (tools/streets-signature.mjs: old zone identical; the cells of the other open districts are compared too).
const ISLAND_NAMES = ['K1', 'K2', 'K3', 'K4', 'YE1', 'KA1', 'KA2', 'KA3', 'KA4', 'KA5', 'AP1', 'AP2', 'AP3', 'AP4', 'AP5', 'AP6', 'AP7', 'PE1', 'PE2', 'PE3', 'PE4', 'PE5', 'PE6'];
const ISLAND = REGIONS.filter((r) => ISLAND_NAMES.includes(r.name)).map((r) => r.extentRect);
/** true when (x, z) lies in the extent of an island region of round 2 (K1..K4, YE1, KA*, AP*, PE*) and in an open district: the island rules apply there */
const OFF = typeof location !== 'undefined' && /[?&]st=[^&]*noisl/.test(location.search || '');            // debug: ?st=noisl draws the islands as before round 2 (before / after screenshots)
const ringIn = (o, x, z) => { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) ins = !ins; return ins; };
const PETRO_BOX = PETROVSKY_POLYS.map((p) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < p.o.length; i += 2) { x0 = Math.min(x0, p.o[i]); x1 = Math.max(x1, p.o[i]); z0 = Math.min(z0, p.o[i + 1]); z1 = Math.max(z1, p.o[i + 1]); } return { p, x0: x0 - 3, x1: x1 + 3, z0: z0 - 3, z1: z1 + 3 }; });
export function isIsland(x, z) {
  if (OFF || !isOpen(x, z)) return false;
  for (const r of ISLAND) if (inRect(r, x, z)) return true;
  for (const b of PETRO_BOX) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && ringIn(b.p.o, x, z) && !b.p.h.some((h) => ringIn(h, x, z))) return true;       // (the east half of Petrovsky Island: the stadium lies in the extent of P6 / P9)
  return false;
}
/** true when every vertex of a way lies in the open area (a way that reaches into a reviewed district keeps the old rules as a whole) */
export const wayOpen = (w) => { if (w._open === undefined) { let o = true; for (let i = 0; i < w.n && o; i++) o = isOpen(w.x[i], w.z[i]); w._open = o; } return w._open; };
// ZHDANOVKA REACH (streets owner 2, 2026-10-15): the Zhdanovskaya embankment with the four houses of landmarksZhdanovka lies on the Petrograd side, outside every island rectangle, yet it is part of the islands round
// (the Zhdanovka river belongs to the task). The two corner rules that came with it (walks.js clipFan, net.js kerb arcs) reach it through isIslandReach; every other island rule stays off there.
const ZHD = [{ x0: -3700, x1: -3380, z0: -2480, z1: -2180 }];
/** true in the island regions (isIsland) and in the Zhdanovka reach: the corner-patch / kerb-arc rules of islands round 2 apply there */
export const isIslandReach = (x, z) => isIsland(x, z) || (!OFF && isOpen(x, z) && ZHD.some((r) => inRect(r, x, z)));
