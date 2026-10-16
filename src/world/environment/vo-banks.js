// environment/vo-banks.js - which kind of bank stands where on Vasilievsky Island (build-water, 2026-10-07; docs/research/vo-water.md section 3).
// Pure data + geometry, no three.js and NO import of waterways.js (waterways.js imports this file: SLOPE_REACHES call voSlopeClass / voWallStyle lazily).
// A bank chain of waterways.js (water on the left, landward normal (tz, -tx)) is classified every metre into
//   a NATURAL class (a slope into the water that quay.js sweeps through the SLOPE_REACHES of waterways.js): 1 Smolenka (grass, 6 m run), 2 Gulf (rubble / boulder revetment, 9 m),
//     3 Galerny Harbour (grass, 6 m), 4 the Kovsh (grass, 6 m), 5 the Malaya Neva beyond the Smolenka source (Dekabristov / Krestovsky shores, grass, 7 m)
//     6 the concrete revetment of the Gavan quay south of the submarine D-2 (water-3 2026-10-09: a planar concrete slab slope 5 m wide with a 1 m lip, two blue steel stair flights, a chain on cast-iron posts along its top)
//   and a WALL STYLE for the pieces that stay a wall: 0 the waterway's own wall (granite + roll parapet on the Neva), 1 PORT (a concrete quay, no parapet: the Baltic Shipyard, the Sea
//   Terminal and port strip, the passenger port, the left bank of the Neva mouth, the Gulf shore where something stands in the way of a slope), 2 SLAB (the Makarova parapet: a plain
//   solid pink-grey granite slab ~1 m x 0.5 m, photo V06 of docs/research/vo-roster-bridges.md; west of the Tuchkov Bridge only - the reviewed reach east of it keeps the rolled parapet).
// A natural class is only given where the strip behind the water edge (run + 1 m) is free of buildings, carriageways and other water (the rule of waterways.js petroNatural); stretches
// shorter than 14 m fall back to the wall and the ends are pulled in by 3 m. Banks outside the Vasilievsky extents (the V rectangles that no older rectangle covers) are never touched:
// the older districts keep their reviewed banks.
import { BUILDINGS, ROADS, EXTENT_RECTS, RECT_NAMES } from '../data/city.js';
import { inIsland } from '../lib/vo-island.js';

export const CLS = { WALL: 0, SMOLENKA: 1, GULF: 2, HARBOUR: 3, KOVSH: 4, MALAYA: 5, REVET: 6 };
export const STYLE = { DEFAULT: 0, PORT: 1, SLAB: 2, BLOCK: 3, MOLE: 4 };      // MOLE (review-water-3 2026-10-09): the limestone moles of the Shkipersky canal mouth: pale cream ashlar face, a flat coping slab, no rolled parapet (dossier gavan.md 4.3, photos 01 02 05)
/** horizontal run of the slope of each natural class (m) */
export const RUN = [0, 6.0, 9.0, 6.0, 6.0, 7.0, 5.0];

const _in = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const V3_UP = EXTENT_RECTS.filter((r, i) => /^V\d+$/.test(RECT_NAMES[i]) && !/^V[12]$/.test(RECT_NAMES[i])), OLD_EXT = EXTENT_RECTS.filter((r, i) => !/^(P|V)\d+$/.test(RECT_NAMES[i]) || /^(P\d+|V[12])$/.test(RECT_NAMES[i]));      // (older land AND the Petrograd round: P1..P9, V1, V2)
/** true in the part of the Vasilievsky data (V3 .. V12) that no older EXTENT rectangle and no rectangle of the Petrograd round (P1..P9, V1, V2: the Spit, the University embankment to the Twelve Collegia, the Birzhevoy - Tuchkov reach, the Zhdanovka ...) holds: the only land the island round may change. */
export const inVO = (x, z) => V3_UP.some((r) => _in(r, x, z)) && !OLD_EXT.some((r) => _in(r, x, z));
/** the wall style of Makarova embankment west of the Tuchkov Bridge reaches into the V2 extent (x -4070 .. -3735): the one place outside inVO where a style applies */
const MAKAROVA_WEST = { x0: -4345, x1: -3735, z0: -1990, z1: -1700 };
export const inVOStyle = (x, z) => inVO(x, z) || _in(MAKAROVA_WEST, x, z);

// ---- what stands behind a bank: buildings, carriageways (32 m grid, built on first use)
let _idx = null, _water = () => false;
/** waterways.js tells this module how to ask "is there water here" (the Neva or any other waterway) */
export function setWaterTest(fn) { _water = fn; }
function index() {
  if (_idx) return _idx;
  const CELL = 32, key = (i, j) => i * 8192 + j, put = (map, x0, x1, z0, z1, v) => { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = key(i, j); let a = map.get(k); if (!a) map.set(k, (a = [])); a.push(v); } };
  const bld = new Map(), road = new Map();
  const near = (x, z) => x < -3000 && x > -10100 && z > -4500 && z < 2300;
  for (const b of BUILDINGS) {
    if (b.skip || !b.polys) continue;
    for (const p of b.polys) { const o = p.o; if (!near(o[0], o[1])) continue; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } put(bld, x0 - 2, x1 + 2, z0 - 2, z1 + 2, { o, box: [x0, x1, z0, z1] }); }
  }
  const DRIVE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service', 'road']);
  for (const r of ROADS) {
    if (!DRIVE.has(r.hw) || r.tunnel || r.bridge) continue;
    const p = r.pts, hw = (r.w || 6) / 2 + 1.2;
    for (let i = 0; i + 3 < p.length; i += 2) { if (!near(p[i], p[i + 1])) continue; put(road, Math.min(p[i], p[i + 2]) - hw, Math.max(p[i], p[i + 2]) + hw, Math.min(p[i + 1], p[i + 3]) - hw, Math.max(p[i + 1], p[i + 3]) + hw, [p[i], p[i + 1], p[i + 2], p[i + 3], hw]); }
  }
  const at = (map, x, z) => map.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
  const inRing = (x, z, o) => { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  return (_idx = {
    built: (x, z) => { for (const b of at(bld, x, z)) { const bb = b.box; if (x < bb[0] - 1 || x > bb[1] + 1 || z < bb[2] - 1 || z > bb[3] + 1) continue; if (inRing(x, z, b.o)) return true; const o = b.o; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (segDist(x, z, o[j], o[j + 1], o[i], o[i + 1]) < 1.0) return true; } return false; },
    onRoad: (x, z) => { for (const s of at(road, x, z)) if (segDist(x, z, s[0], s[1], s[2], s[3]) < s[4]) return true; return false; },
  });
}

/** the sloping concrete revetment south of the D-2 bow (the quay runs N - S there, x about -6635 .. -6643; the hull tip stands at (-6635.0, -43.8): the slab starts 12 m south of it and ends where the D-2 lawn ends) */
const D2_REVET = (x, z) => x > -6668 && x < -6620 && z > -32 && z < 30;

/** the wanted class and the wall style of a bank point: { cls, style } (cls 0 = a wall); fallback = the style where the wanted natural class does not fit */
function rule(key, x, z, nx, nz) {
  const landIsl = inIsland(x + nx * 40, z + nz * 40);
  if (key === 'neva') {
    if (landIsl) {
      if (x < -8700 && z < -1250) return { cls: 0, style: STYLE.PORT };                          // S10 / S11: the passenger port berths round the NW peninsula
      if (x < -6760) {                                                                            // S1 / S2: the Gulf shore (rubble revetment); the granite moles of the Shkipersky canal mouth keep a wall
        if (Math.hypot(x + 6975, z - 415) < 75) return { cls: 0, style: STYLE.MOLE };      // (was DEFAULT: the pink granite wall with the pink rolled parapet; review-gavan item 2 / dossier gavan.md 4.3: pale grey-beige limestone ashlar, a flat granite coping slab)
        return { cls: CLS.GULF, style: STYLE.PORT };
      }
      // (water-3 2026-10-09; photos d19 / y04 / t04 / t06 of docs/research/seaterminal.md) the east shore of the Gavan bay from the D-2 quay corner to the Sea Terminal bay is a CONCRETE port quay (a low flat coping, a granite
      // kerb and a chain on cast-iron posts at the torpedo boat), not the 1 m rolled granite parapet of the Neva wall; south of the D-2 bow the quay is a sloping concrete revetment with two blue steel stair flights
      if (x > -6700 && x < -6440 && z > -50 && z < 480) return D2_REVET(x, z) ? { cls: CLS.REVET, style: STYLE.PORT } : { cls: 0, style: STYLE.PORT };
      if (x < -4600 && z > 480) return { cls: 0, style: STYLE.PORT };                              // S3 / S4: the Sea Terminal bay shore, the port strip, the Baltic Shipyard (the granite of S5 begins at (-4606, 491))
      if (z < -1380 && x < -3700 && x > -4345) return { cls: 0, style: STYLE.SLAB };               // S8: Makarova embankment west of the Tuchkov Bridge
      // S5 / S6 (water-2 2026-10-08, review of landmarksNavalCorps): the granite embankment from the Krasin berth to the Academy (Lt Schmidt, Universitetskaya) keeps the wall but not the fat rolled parapet: a plain
      // rectangular granite block (STYLE.BLOCK; photos a07, b09, w11); the older reaches (V1 / V2, the Spit) are outside inVO and keep the reviewed roll
      if (x > -4620) return { cls: 0, style: STYLE.BLOCK };
      return { cls: 0, style: STYLE.DEFAULT };
    }
    if (x < -7900 && z > -2800 && z < -2150) return { cls: 0, style: STYLE.PORT };                // the north shore of the Petrovsky fairway (the land fill of the Dekabristov Island opposite the passenger port): a quay
    if (x < -4300 && z > 300) return { cls: 0, style: STYLE.PORT };                                // the left bank of the Neva mouth (the Gutuevsky / Kirov port quays)
    if (x < -4340 && z < -1985) return { cls: CLS.MALAYA, style: STYLE.DEFAULT };                  // the Malaya Neva beyond the Smolenka source: the Dekabristov Island / Krestovsky shores
    return null;
  }
  if (key === 'smolenka') {
    if (!landIsl || x < -7490 || x > -4720) return { cls: 0, style: STYLE.DEFAULT };               // the Dekabristov side (1970s granite parapet + iron fence), the mouth arms (torus cornice), the first 400 m below the source
    return { cls: CLS.SMOLENKA, style: STYLE.DEFAULT };
  }
  if (key === 'gavan') return z < -36 ? { cls: CLS.HARBOUR, style: STYLE.DEFAULT } : { cls: 0, style: STYLE.DEFAULT };      // Galerny Harbour: grass banks; the Shkipersky canal: granite walls with a torus cornice
  if (key === 'kovsh') return { cls: CLS.KOVSH, style: STYLE.DEFAULT };
  return null;
}

/** frees the building / road index once every bank has been classified (quay.js calls it at the end of its build: the results stay in the per-bank cache) */
export function releaseVoIndex() { _idx = null; }

const _cache = new WeakMap();
/** { slope: Uint8Array class per metre of the chain, style: Uint8Array wall style per metre, n } */
export function voBank(bank) {
  let c = _cache.get(bank);
  if (c) return c;
  const P = bank.pts, S = [0];
  for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = S[S.length - 1], n = Math.ceil(total) + 1, slope = new Uint8Array(n), style = new Uint8Array(n);
  let any = false; for (const p of P) if (inVOStyle(p[0], p[1])) { any = true; break; }
  if (any) {
    const N = index(); let i = 0;
    for (let k = 0; k < n; k++) {
      const sv = Math.min(total, k); while (i + 2 < S.length && S[i + 1] < sv) i++;
      const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(1, Math.max(0, (sv - S[i]) / ((S[i + 1] - S[i]) || 1)));
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
      if (!inVOStyle(x, z)) continue;
      const r = rule(bank.key, x, z, nx, nz); if (!r) continue;
      style[k] = r.style;
      if (!r.cls || !inVO(x, z)) continue;
      const run = RUN[r.cls]; let free = true;
      // (run + 2.4: the fence at the slope top never stands on a carriageway's edge band - a car would hit it - so a road within 2.4 m of the slope top keeps the wall)
      for (const d of [1.2, run * 0.5, run + 1.0, run + 2.4]) { const px = x + nx * d, pz = z + nz * d; if (N.built(px, pz) || N.onRoad(px, pz) || _water(px, pz)) { free = false; break; } }
      if (free) slope[k] = r.cls;
    }
    // the ends of a natural stretch are pulled in by 3 m, stretches shorter than 14 m fall back to the wall (as petroNatural)
    const er = new Uint8Array(n);
    for (let k = 0; k < n; k++) { const q = slope[k]; if (!q) continue; let ok = true; for (let d = -3; d <= 3 && ok; d++) { const m = bank.closed ? ((k + d) % n + n) % n : k + d; if (m >= 0 && m < n && slope[m] !== q) ok = false; } er[k] = ok ? q : 0; }
    for (let k = 0; k < n;) { if (!er[k]) { k++; continue; } let e = k; while (e < n && er[e] === er[k]) e++; if (e - k < 14) for (let m = k; m < e; m++) er[m] = 0; k = e; }
    slope.set(er);
    // where the natural slope was wanted but does not fit, the wall style of the rule applies (a Gulf piece with a road behind it is a concrete quay, not the granite of the Neva)
  }
  c = { slope, style, n };
  _cache.set(bank, c);
  return c;
}
/** natural class at arclength s of a bank chain (0 = wall) */
export function voSlopeClass(bank, s) { const c = voBank(bank), k = Math.round(s); return k >= 0 && k < c.n ? c.slope[k] : 0; }
/** wall style at arclength s of a bank chain (STYLE.*) */
export function voWallStyle(bank, s) { const c = voBank(bank), k = Math.round(s); return k >= 0 && k < c.n ? c.style[k] : 0; }

/** extra descent sites (stairs down to the water) of the granite banks that the OSM `steps` ways do not give (they run perpendicular to the wall, the generator only takes flights that run along it):
 *  the roster of docs/research/vo-roster-bridges.md section 4 minus the heritage stairs that a sight module owns (sphinx pier, Rumyantsev descent, Krusenstern stair, the Mining University stairs,
 *  the Lions pier: they come through the owner API, waterways.js OWNER_WATER / KEEP_OUT) */
export const VO_DESCENTS = [
  { key: 'neva', x: -4408, z: 159, w: 2.2 }, { key: 'neva', x: -4295, z: 24, w: 2.2 }, { key: 'neva', x: -4176, z: -100, w: 2.2 }, { key: 'neva', x: -3547, z: -409, w: 2.2 },        // S5 Lieutenant Schmidt embankment
  { key: 'neva', x: -3501, z: -431, w: 2.2 }, { key: 'neva', x: -3318, z: -545, w: 2.2 }, { key: 'neva', x: -3089, z: -705, w: 2.2 }, { key: 'neva', x: -2955, z: -729, w: 2.2 },        // S6 Universitetskaya
  { key: 'neva', x: -3842, z: -1783, w: 2.2 },                                                                                                                                       // S8 Makarova west of the Tuchkov Bridge (the stairs between the Birzhevoy and Tuchkov bridges are the reviewed reach)
  // (water-3 2026-10-09, request of landmarksSeaTerminal 4: the OSM steps w1540867335 (-6521.8, 448.4) -> (-6528.8, 450.0) and w1540867336 (-6529.5, 415.7) -> (-6536.5, 417.4) of the Gavan east shore, 2.2 m wide, run from
  // the road side down to the quay edge; their lower ends lie ON the bank, so the generator (it wants both ends within 3.6 m of the wall) took neither): two granite descents beside their lower ends
  { key: 'neva', x: -6529.0, z: 450.0, w: 2.2 }, { key: 'neva', x: -6536.3, z: 417.2, w: 2.2 },
  { key: 'smolenka', x: -4490, z: -1925, w: 1.9 }, { key: 'smolenka', x: -4636, z: -1800, w: 1.9 },                                                                                  // S9 the granite reach below the source
];
