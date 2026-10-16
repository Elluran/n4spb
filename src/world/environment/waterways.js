// environment/waterways.js - the geometry of every waterway of the map, derived from the baked OSM water polygons (RIVER records of data/city.js).
// PURE DATA / GEOMETRY (no three.js): layout.js (water levels, inRiver, heightAt, shoreDist) and the environment builders both use it.
//
// Why this exists: the bake clips every water polygon to the staircase of EXTENT rectangles and cuts it again along the borders of the regional part files, so one real
// river (the Fontanka has 3 pieces, the Neva 9, the Moika 2, the Griboedov Canal 2) is stored as several polygons whose seams run along rectangle edges (and the clipper left
// zero-width "bridge" edges along them). Seams and open water-to-water joins (the mouth of the Winter Canal in the Neva, the Moika in the Fontanka) are NOT quay walls. This file
//   * collects the outer rings of each waterway (key of the RIVER record: fontanka, moika, griboedov, winter-canal, swan-canal, neva; holes are ignored: the OSM "holes" of the
//     Neva are the piers of the Palace Bridge, which the bridge owner draws), plus PLUGS (the strip under the Palace Bridge that OSM leaves out of both Neva polygons),
//   * drops every edge that lies on a clip line (the border of an EXTENT rectangle) or that coincides with an edge of another water polygon (an open join),
//   * stitches what is left into BANK CHAINS (polylines, water on the left of travel: landward normal (tz, -tx), landSide -1) = the quay lines; chains of different pieces join
//   * CONTINUES the waterways that leave the data (EXTENSIONS: Fontanka both ends to the Neva / WSW, Griboedov Canal, Moika, Swan Canal) along invented centre lines and models
//     the Neva beyond the data as a scenery ring between a south bank and a far (north) bank (NEVA_FAR),
//   * lists the bridge crossings (BRIDGE_ZONES) where the quay has a gap for the bridge,
//   * keeps the per-waterway cross-section parameters (WATERWAYS: water level, bed, wall, coping, parapet kind).
// ISLANDS ROUND 2 (2026-10-14): the Gulf coast of Krestovsky Island is a bank (bankMask override, its own unstitched chains), T-junction vertices split the long edges that meet another island ring, the join of the Krestovka mouth is no bank,
// NAT_BOXES reach the west tip of Krestovsky, the club / stadium shore classes (petroNatural 2 - 4), the cobble wings of the Yelagin spit (onSpitWing): all restricted to inIslands / the Petrovsky ring / OSM ids (see quay.js header).
// Water levels (street = 0): docs/research/west-canals-bridges.md section 2.5 (Fontanka -3.2, Griboedov -2.9, Moika -3.0, Winter Canal -3.1, Neva -3.4).
import { RIVER, WATER, EXTENT_RECTS, PLAY_RECTS, RECT_NAMES, EMBANKMENTS, ROADS, BUILDINGS, BRIDGES } from '../data/city.js';
import { EAST_WATER, EAST_WATER_BOUNDS } from '../data/east-water.js';
import { PETRO_WATER } from './petro-water.js';
import { KRESTOVSKY_WATER, KRESTOVSKY_ISLAND } from './krestovsky-context.js';
import { ISLANDS2_WATER, ISLANDS2_COAST } from './islands2-context.js';      // 2026-10-13, islands round 2: the complete Nevka rings round Yelagin / Kamenny / Aptekarsky (tools/bake-islands2-context.mjs)
// the sight modules of the Petrograd side (pure data files, namespace imports: a missing export is undefined, never a link error)
import * as G_FORTRESS from '../landmarksFortress/groups.js';
import * as G_STRELKA from '../landmarksStrelka/groups.js';
import * as G_AURORA from '../landmarksAurora/groups.js';
// Vasilievsky Island (2026-10-07, docs/research/vo-water.md): the water the bake cannot give (tools/environment-vo-water.py), the bank classes (vo-banks.js) and the hand-over API of the island's sight modules (owners.js)
import { VO_MALAYA_TAIL, VO_NEVA_BAY, VO_SEA } from './vo-water.js';
import { voSlopeClass, setWaterTest, VO_DESCENTS, RUN as VO_RUN, inVO } from './vo-banks.js';
import { sightWater, sightBanks, sightKeepOut } from './owners.js';
import { inIslands } from './islands.js';      // 2026-10-14 (owner A): the ground of the round-2 islands outside every older play rectangle

// ---- the east / north extension (docs/INTEGRATION.md): the data now holds the Neva of the Smolny / Alexander Nevsky bend (RIVER 'neva' pieces of the regions E1 / N2 / N3), the Obvodny canal
// (E1; the bake leaves its key empty) and the Monastyrka (E1; no polygon in RIVER). All three lie in the Neva-style granite trench (key 'neva'). data/east-water.js (tools/bake-east-water.mjs) holds the
// complete OSM polygons of the Neva, Bolshaya Neva and Obvodny canal: they continue the water beyond the data extent as scenery (replacing the invented Neva ring east of x -840).
const KEY_BY_NAME = { 'Обводный канал': 'neva', 'Монастырка': 'neva', 'Крюков канал': 'kryukov', 'Адмиралтейский канал': 'admiralty', 'Ново-Адмиралтейский канал': 'admiralty', 'Восточный канал': 'nh-inner', 'Южный канал': 'nh-inner',
  // the Petrograd side (P1..P5, V1, V2; docs/research/petro-water.md): the Kronverksky strait is an arm of the Neva (same level, same water, same granite where it has a quay: one water surface without a seam);
  // the Zhdanovka is a small river of its own look. The Malaya Neva and the Bolshaya Nevka come from environment/petro-water.js (the bake cannot close their polygons), the Kronverk moat and the stadium arm from WATER.
  'Кронверкский пролив': 'neva', 'Ждановка': 'zhdanovka', 'Карповка': 'karpovka' };   // the south-west canals (S rects); the inner canals of New Holland (East, South: key nh-inner; the Kovsh basin r1648982 is added from WATER below) sit in the same sunk trench, landmarksNewHolland draws only the footbridges, the pier and the island park
const keyOf = (r) => r.key || KEY_BY_NAME[r.name] || null;

/** Cross-section / look parameters per waterway key. water / bed: y of the surface and of the bed (street level = 0). */
export const WATERWAYS = {
  fontanka: { key: 'fontanka', name: 'Фонтанка', water: -3.2, bed: -4.6, wall: 'fontanka', rail: ['lattice', 'clover', 'bars'], post: 'pyramid', postW: 0.45, postH: 1.0, bay: 3.2, width: 61, shadeH: 3.4 },   // 53.5 m NE of Obukhovsky, 60-62 m from there on (the polygon rules)
  griboedov: { key: 'griboedov', name: 'канал Грибоедова', water: -2.9, bed: -4.3, wall: 'pink', rail: ['bars', 'loops'], post: 'twostep', postW: 0.5, postH: 1.1, bay: 2.7, width: 19, shadeH: 3.0 },
  moika: { key: 'moika', name: 'Мойка', water: -3.0, bed: -4.5, wall: 'pink', rail: ['moika'], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.4, width: 26, shadeH: 3.1 },
  'winter-canal': { key: 'winter-canal', name: 'Зимняя канавка', water: -3.1, bed: -4.3, wall: 'pink', rail: ['lancet'], post: 'pylon', postW: 0.45, postH: 0.95, bay: 2.3, width: 12.8, shadeH: 3.2 },
  // the Swan Canal is NOT a granite-wall canal: grass slopes down to a low granite banquette (SLOPE_REACHES below; docs/research/mars-bridges-canals.md section 2.1): ball-post rail on the Mars Field
  // (west) side, green trellis on the Summer Garden (east) side; water 10-11 m wide (the data polygon)
  'swan-canal': { key: 'swan-canal', name: 'Лебяжья канавка', water: -2.8, bed: -4.0, wall: 'swan-canal', rail: ['ballpost', 'trellis'], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.0, width: 10.6, shadeH: 1.2, profile: 'slope' },
  // the restored Voskresensky canal = the moat along the south front of the Engineering (Mikhailovsky) Castle (OSM WATER r15750440): narrow, only ~1.3 m below the street; landmarksCastle draws its bridges and railings
  // the south-west (S1..S5): the Kryukov Canal (Nikolsky / Mariinsky side, to the Moika) and the Admiralty / Novo-Admiralty canals round New Holland (docs/research/new-holland.md section 3)
  kryukov: { key: 'kryukov', name: 'Крюков канал', water: -2.9, bed: -4.3, wall: 'kryukov', rail: ['vase'], post: 'twostep', postW: 0.5, postH: 1.1, bay: 2.7, width: 22, shadeH: 3.0 },
  // the Admiralty / Novo-Admiralty canals are only 8.4 - 11 m wide; the house bank carries the Moika railing, the New Holland bank is a low granite wall + a grass slope without a railing (SLOPE_REACHES 'adm-newholland')
  admiralty: { key: 'admiralty', name: 'Адмиралтейский канал', water: -2.8, bed: -4.0, wall: 'admiralty', rail: ['moika'], post: 'moika', postW: 0.45, postH: 1.0, bay: 2.4, width: 10, shadeH: 2.8 },
  // the INNER canals of New Holland (Kovsh basin r1648982, East canal r1648987, South canal r1648986): sunk like the others (the island author's flush water is switched off when this key exists); walls + coping only: the black loop railing, its colliders, the pier, the stairs and the footbridges are landmarksNewHolland's (new-holland.md section 3)
  'nh-inner': { key: 'nh-inner', name: 'Каналы Новой Голландии', water: -2.8, bed: -4.0, wall: 'admiralty', rail: [], post: 'twostep', postW: 0.5, postH: 1.1, bay: 2.7, width: 11, shadeH: 2.8 },
  moat: { key: 'moat', name: 'Воскресенский канал', water: -1.2, bed: -2.4, wall: 'moat', rail: [], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.4, width: 14, shadeH: 1.3 },
  neva: { key: 'neva', name: 'Нева', water: -3.4, bed: -6.0, wall: 'neva', rail: [], post: 'roll', postW: 0.88, postH: 1.0, bay: 2.2, width: 400, shadeH: 3.5 },
  // the Petrograd side (docs/research/petro-water.md): every arm of the Neva lies at the Neva level (they join without a step)
  // the Zhdanovka (and the arm round the Petrovsky stadium, WATER r1576116): 35-60 m wide, granite-faced walls with a plain black bar railing between granite posts (Zhdanovskaya embankment)
  zhdanovka: { key: 'zhdanovka', name: 'Ждановка', water: -3.4, bed: -5.0, wall: 'zhdanovka', rail: ['bars'], post: 'twostep', postW: 0.5, postH: 1.1, bay: 2.7, width: 45, shadeH: 3.4 },
  // the Karpovka (RIVER r1312676 = the east half, petro-water.js r1312629 = the west half; 20-25 m wide, 3 km from the Bolshaya Nevka to the Malaya Nevka): battered pink-grey granite walls with a black cast-iron
  // railing of tall overlapping ovals between granite pillars (0.45 m square, 1.1 m, 3 m bays) from the Petropavlovsky Bridge to 150 m west of the Karpovsky Bridge; grass slopes elsewhere ('karpovka-natural')
  karpovka: { key: 'karpovka', name: 'Карповка', water: -3.4, bed: -5.0, wall: 'pink', rail: ['loops'], post: 'twostep', postW: 0.45, postH: 1.2, bay: 3.0, width: 24, shadeH: 3.4 },
  // the moat of the Kronverk (OSM WATER r2893409 "Кронверкский проток"): an earthwork ditch, grass slopes on both sides (PETRO_NATURAL below), no wall, no railing; landmarksKronverk draws the arsenal and the two Artillery bridges
  'kronverk-moat': { key: 'kronverk-moat', name: 'Кронверкский проток', water: -3.4, bed: -4.6, wall: 'moat', rail: [], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.4, width: 18, shadeH: 1.6 },
  // Vasilievsky Island (docs/research/vo-water.md). LEVELS: street y 0 and water -3.4 for every water of the island, so that the Smolenka joins the Malaya Neva, the Gulf the Neva Bay and the Shkipersky canal the Gulf
  // without a step (the real reclaimed land and the Smolenka banks are probably 1-1.5 m lower [E]; the Gulf shore crest stands 2-3.5 m above the water [E]).
  // the Smolenka (3.7 km, 20-40 m wide, WATER r1576084 + the mouth arms r1576086 + the mouth basin w428079227): natural earth / grass banks (SLOPE_REACHES 'smolenka-natural'); granite walls with a black bar railing between granite
  // posts on the Dekabristov side (1970s parapet + iron fence), on the first 400 m below the source and round the mouth arms (torus cornice, vo-banks.js)
  smolenka: { key: 'smolenka', name: 'Смоленка', water: -3.4, bed: -4.4, wall: 'smolenka', rail: ['bars'], post: 'twostep', postW: 0.45, postH: 1.1, bay: 2.7, width: 30, shadeH: 3.2 },
  // Galerny Harbour (WATER w10890576: grass banks, trees, a gravel path) and the Shkipersky canal (r1648985: granite walls with a massive torus cornice, no railing)
  gavan: { key: 'gavan', name: 'Галерная гавань', water: -3.4, bed: -4.5, wall: 'gavan', rail: [], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.7, width: 40, shadeH: 3.0 },
  // the Kovsh of the Smolenka (WATER w95646723, 330 x 400 m, an inland basin of the reclaimed land): natural banks
  kovsh: { key: 'kovsh', name: 'Ковш Смоленки', water: -3.4, bed: -4.0, wall: 'smolenka', rail: [], post: 'twostep', postW: 0.45, postH: 1.0, bay: 2.7, width: 330, shadeH: 2.0 },
};
export const WATERWAY_KEYS = Object.keys(WATERWAYS);
const SEAM_TOL = 0.8;

// ---- HAND-OVER TO THE SIGHT MODULES of the Petrograd side (docs/research/petro-requests-environment.md). Water geometry is static data (layout.js reads it), so a hand-over is keyed on the owner's CLAIMS
// (GROUPS_LIST non-empty = the module draws its sight), not on a build list:
//   * OWNER_WATER: ground that a sight turns into its own descent to the water: the ring counts as Neva water (a hole in the ground, the water surface under it, layout.inRiver / heightAt), NONE of its edges is a
//     bank (caps: 'all') and the old bank line along it opens (it coincides with a ring edge): the owner draws walls, steps, parapets and colliders there.
//       strelka-descent  the semicircular descent of the Spit (landmarksStrelka DESCENT_RING: between the upper terrace wall w496635212 and the old water edge)
//       shitsza-pit      the stair pit of the Shi-Tsza descent on Petrovskaya embankment (landmarksAurora, 18.6 x 3.75 m)
//   * OWNER_BANK: a shore the owner draws completely (banquette, beach, slopes, colliders): no wall, slope, parapet or collider of ours. Zayachy Island = landmarksFortress ISLAND_RING.
//   * KEEP_OUT: no generated descent, landing stage or boat here (the berth of the Aurora, the Shi-Tsza stairs, the Commandant pier of the fortress, the Spit descent).
const _owns = (G) => !!(G && Array.isArray(G.GROUPS_LIST) && G.GROUPS_LIST.length);
const _flat = (r) => (Array.isArray(r[0]) ? r.flat() : r.slice());
const OWNER_WATER = [];
if (_owns(G_STRELKA) && G_STRELKA.DESCENT_RING) OWNER_WATER.push({ id: 'strelka-descent', key: 'neva', owner: 'landmarksStrelka', o: _flat(G_STRELKA.DESCENT_RING) });
if (_owns(G_AURORA)) OWNER_WATER.push({ id: 'shitsza-pit', key: 'neva', owner: 'landmarksAurora', o: [-1120.06, -2242.32, -1103.10, -2249.94, -1101.56, -2246.52, -1118.52, -2238.90] });
const OWNER_BANK = _owns(G_FORTRESS) && G_FORTRESS.ISLAND_RING ? [{ id: 'zayachy', owner: 'landmarksFortress', o: _flat(G_FORTRESS.ISLAND_RING) }] : [];
// Vasilievsky Island: the sight modules hand their descents / piers / shores over through pure data in their groups.js (owners.js: WATER_RINGS, BANK_RINGS, KEEP_OUT; active while the module has claims)
for (const w of sightWater()) OWNER_WATER.push({ id: w.id, key: w.key, owner: w.owner, o: w.o, sight: true });
for (const b of sightBanks()) OWNER_BANK.push({ id: b.id, owner: b.owner, o: b.o });
export const ownerWater = () => OWNER_WATER.map((w) => ({ id: w.id, owner: w.owner, o: w.o }));
export const ownerBanks = () => OWNER_BANK.map((w) => ({ id: w.id, owner: w.owner, o: w.o }));
const _owBox = OWNER_WATER.map((w) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < w.o.length; i += 2) { x0 = Math.min(x0, w.o[i]); x1 = Math.max(x1, w.o[i]); z0 = Math.min(z0, w.o[i + 1]); z1 = Math.max(z1, w.o[i + 1]); } return [x0, x1, z0, z1]; });
/** true inside an OWNER_WATER ring or within m metres of its outline. The quay opens COMPLETELY there (no wall face either): a ring edge that runs along a longer bank edge (the 30 m front of the Shi-Tsza
 *  platform holds the 18.6 m stair pit) does not drop that edge from the chain, so the opening is cut like a bridge zone, exactly at the ring. */
export function ownerWaterAt(x, z, m = 0.5, only = 0) {
  for (let k = 0; k < OWNER_WATER.length; k++) {
    if (only && !!OWNER_WATER[k].sight !== (only === 1)) continue;                  // only: 1 = the rings of the island sight modules (owners.js WATER_RINGS), 2 = the older ones (the Spit descent, the Shi-Tsza pit)
    const b = _owBox[k]; if (x < b[0] - m || x > b[1] + m || z < b[2] - m || z > b[3] + m) continue;
    const o = OWNER_WATER[k].o; if (pointInFlat(x, z, o)) return true;
    for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const dx = o[i] - o[j], dz = o[i + 1] - o[j + 1], l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - o[j]) * dx + (z - o[j + 1]) * dz) / l2)); if (Math.hypot(o[j] + dx * t - x, o[j + 1] + dz * t - z) < m) return true; }
  }
  return false;
}
export const ownerWaterBoxes = () => _owBox;
const KEEP_OUT = [
  { id: 'aurora-berth', c: [-753, -2562], ax: [0.4168, 0.9090], hl: 95, hw: 35 },      // the cruiser with its mooring barrels and booms (landmarksAurora)
  { id: 'shitsza', c: [-1111.7, -2246.4], r: 25 },                                     // the Shi-Tsza descent (landmarksAurora)
  { id: 'commandant-pier', c: [-1822, -1860], r: 42 },                                 // the Nevsky gate pier of the fortress, 25 m round the pier (landmarksFortress)
  { id: 'strelka', c: [-2519.2, -1286.7], r: 96 },                                     // the Spit: the descent, the spheres (landmarksStrelka)
  { id: 'troitsky-north', c: [-1426.9, -2045.9], ax: [-0.3908, -0.9205], hl: 52.5, hw: 40 },      // the low granite viaduct of the Trinity Bridge at the Petrograd bank (bridge frame u 470..575, |v| < 40: build-bridges)
];
for (const k of sightKeepOut()) KEEP_OUT.push(k);                                    // Vasilievsky Island sights (owners.js KEEP_OUT)
/** true where no generated descent, landing stage or boat may be (m = extra margin) */
export function keepOut(x, z, m = 0) {
  for (const k of KEEP_OUT) {
    if (k.r) { if (Math.hypot(x - k.c[0], z - k.c[1]) < k.r + m) return true; continue; }
    const dx = x - k.c[0], dz = z - k.c[1], u = dx * k.ax[0] + dz * k.ax[1], v = -dx * k.ax[1] + dz * k.ax[0];
    if (Math.abs(u) < k.hl + m && Math.abs(v) < k.hw + m) return true;
  }
  return false;
}
/** The quay of the Tuchkov Buyan / judicial quarter (north bank of the Malaya Neva from the Birzhevoy approach to the Buyan pier; docs/research/petro-requests-landmarksVladimir.md 2, photo refs/vladimir
 *  jq_mr7_02): the parapet is not the rolled granite block but black cast-iron railing sections between square pink-grey granite posts. (x, z) on the bank, nz = z of the landward normal (the north bank: < 0). */
export const buyanRail = (x, z, nz) => x >= -3470 && x <= -2890 && z < -1600 && z > -1960 && nz < -0.2;
/** The quay of the Lieutenant Schmidt embankment in front of the Dormition church and along the S-189 pier reach (water-2 2026-10-08; docs/research/navalcorps.md 6.5 and the review of landmarksNavalCorps, photos
 *  c09 c13 d08): no parapet block, a plain flat granite coping and a black cast-iron railing (overlapping ovals under a Greek-key band) between pink-grey granite posts. (x, z) on the bank, nz = z of the landward
 *  normal (the island bank: < 0; the opposite bank of the Neva has nz > 0). The reach is the box x -4440 .. -4140, z -175 .. 300 (the NE end of the church front, with its stair at (-4176, -100), to the far end of the second shipyard pier); its ends are an estimate [?]. */
export const meanderRail = (x, z, nz) => x >= -4440 && x <= -4140 && z >= -175 && z <= 300 && nz < -0.2;
/** spots that the quay furniture (posts, railing panels) keeps clear of: [x, z, radius] - the four floodlight masts of the Petrovsky stadium on the island bank (landmarksVladimir, 4 x 4 m colliders) */
export const QUAY_CLEAR = [[-3530.5, -2189.9, 4.2], [-3656.5, -2279.1, 4.2], [-3744.1, -2160.0, 4.2], [-3617.5, -2067.5, 4.2]];
/** bridges of the Petrograd side that open nothing in the quay: the temporary timber bypass beside the Kronverksky Bridge (2025-26 reconstruction; landmarksFortress claims it and does not draw it) */
const PETRO_NO_ZONE = new Set(['w1377364608', 'w1360562178', 'w1377364609', 'w1377367596',
  'w1489297383',      // Vasilievsky Island: the PROPOSED footbridge at the Smolenka source (OSM deck w1489297383, highway=proposed footways: not built, the roster says skip) opens nothing
  'w172999967',       // (review-water 2026-10-07) the secondary_link ramp of the WHSD junction at the Gulf shore (-7825, 426): it joins the motorway viaduct (petroZones skips motorway / trunk ways below), so it opens nothing either
  'w119176958', 'w373871040', 'w688149995', 'w688149996']);     // the four WHSD motorway ways (ghosts for quay.js onRoad as well: the wall boxes there are never shifted for a road that does not exist)
/** a mapped bridge way that does not exist in the scene: the quay keeps its wall / slope collider closed across it */
export const ghostBridge = (id) => PETRO_NO_ZONE.has(id);

/** the strip under the Palace Bridge that OSM leaves out of both Neva polygons (between the west polygon edge and the east polygon edge) */
const PLUGS = [{ key: 'neva', o: [-2315.3, -885.3, -2320, -892.2, -2330, -906.8, -2471.7, -1114.1, -2460.8, -1097.5] }];

/** invented continuations of the waterways that leave the data. aEnd: the END of the chain whose water is on its left, bStart: the START of the chain on the other bank; both lie on the
 *  clip edge; path: the centre line beyond it. */
const EXTENSIONS = [
  // the Fontanka between the last baked point of the north (-715,356) and the first of S5 (-1529,907) is unbaked (~1000 m): scenery along straight chords (dossier sw-canals-bridges.md 7.6); it ends exactly on the S5 polygon (53.5 m wide)
  { id: 'fontanka-sw', key: 'fontanka', aEnd: [-715, 356], bStart: [-715, 290], path: [[-900, 480], [-1100, 620], [-1300, 760], [-1450, 860], [-1526, 939]], grow: 0 },
  // (the former 'fontanka-n' continuation is gone: the N2 data runs the Fontanka to its mouth in the Neva)
  // (the former 'swan-n' continuation is gone: since the M1..M7 bake the data holds the whole Swan Canal to its real mouth in the Neva, (-1070,-1618))
];

/** The Neva beyond the data (scenery; EAST of x -840 the invented banks are replaced by the real OSM polygon of data/east-water.js, the closing edge x = -840 lies inside the N2 extent): the ring of the water between its banks, drawn only OUTSIDE the EXTENT rectangles (the data polygons rule inside). Banks (all W -> E / along the flow):
 *  south = the Palace / Kutuzov embankments (the data bank continues them east of x -1630 and west of x -3020), petrograd = the Petrograd shore round Zayachy Island (Peter and Paul
 *  Fortress; the fortress shore from the dossier palace-square-hermitage.md section 11), malayaN / malayaS = the two banks of the Malaya Neva (north / Vasilievsky), vasSE = the south-east
 *  shore of Vasilievsky Island (Universitetskaya embankment) from the Strelka tip (Rostral columns) west. The ring: south W->E, east cap, petrograd E->W, malayaN, west cap, malayaS back to the
 *  tip, vasSE W. */
// PETROGRAD SIDE (2026-10-06, docs/research/petro-water.md): since the P1..P5 / V1 / V2 bake the data holds the WHOLE Neva from the Spit to the Bolshaya Nevka, the Kronverksky strait, the Malaya Neva (environment/
// petro-water.js) and the Bolshaya Neva to x -4070. The invented banks `petrograd`, `malayaN`, `malayaS` and the east parts of `south` / `vasSE` are gone (they ran through the Petrograd side); what is left of the
// scenery ring is the Bolshaya Neva DOWNSTREAM of the data: it starts exactly on the last data points of both banks at the clip edge x -4070 ((-4070, 202.2) south, (-4070, -173.1) north) and widens to the Neva Bay.
// The Malaya Neva west of the data and the Bolshaya Nevka north of it are continued inside their own rings (petro-water.js); the Vyborg side east of x -430 is the real polygon of data/east-water.js.
// VASILIEVSKY ISLAND (2026-10-07): the invented banks `south` / `vasSE` (straight lines west of x -4070 that ran through the island) are gone: the data holds the real Bolshaya Neva down to the Neva Bay (RIVER r1114249,
// clipped to the extents), vo-water.js adds its complete outline beyond the extents (VO_NEVA_BAY, a scenery piece) and the Gulf of Finland (VO_SEA, from the island outline and the real coast).
const FAR_BANKS = {};
export const NEVA_FAR = FAR_BANKS;
/** scenery ends of the small waters that leave the data at the west clip edge x -4070 (a short reach beyond it, closed by a wall at its far end): the Zhdanovka toward the Malaya Nevka, the arm round the Petrovsky stadium */
const PETRO_TAILS = [
  // 2026-10-13 (islands round 2): both tails are gone. The data now holds the whole of Petrovsky Island (rectangles PE5 / PE6): the arm round the stadium (WATER r1576116) ends at x -4148 as in OSM,
  // so the invented 'kovsh-tail' (x -4200..-4070, z -2466..-2381) lay on the island (islands-data-test: 4 flooded dry samples), and the corner 'zhdanovka-notch' (x -4081..-4070, z -2680..-2664) is
  // inside the real Zhdanovka polygon since the notch is covered. Before: kovsh-tail { key: 'zhdanovka', o: [-4070, -2380.7, -4070, -2465.9, -4200, -2450, -4200, -2390] }, zhdanovka-notch { o: [-4070, -2664.3, -4070, -2680, -4080.6, -2680] }.
];

/** Bridge crossings of the quay. c: centre, axis: bearing (deg) of the deck axis (direction of travel across the water), w: width of the deck measured ALONG the water (= the gap in the
 *  parapet / collider), len: length of the span (the abutments reach 8 m beyond it). Dimensions: docs/research/west-canals-bridges.md section 4 + the OSM bridge ways. `own`: a bridge
 *  the bridges module draws (the quay leaves the parapet / collider open and publishes the zone); the others get an invisible fallback deck (walk box + parapet boxes). */
export const BRIDGE_ZONES = [
  { id: 'belinsky', name: 'Мост Белинского', key: 'fontanka', c: [-452, -628.35], axis: 78.3, w: 19.06, len: 56.6, own: true },
  { id: 'kazansky', name: 'Казанский мост', key: 'griboedov', c: [-1393, -302], axis: 104, w: 101, len: 25, own: true },
  { id: 'bankovsky', name: 'Банковский мост', key: 'griboedov', c: [-1473, 27], axis: 139, w: 6.5, len: 25.4, own: true },
  { id: 'muchnoy', name: 'Мучной мост', key: 'griboedov', c: [-1691, 154], axis: 150, w: 4.5, len: 22, own: true },
  { id: 'italyansky', name: 'Итальянский мост', key: 'griboedov', c: [-1350, -540], axis: 102, w: 5, len: 19.7, own: true },
  { id: 'novo-konyushenny', name: 'Ново-Конюшенный мост', key: 'griboedov', c: [-1273, -921], axis: 101, w: 36, len: 21.1, own: true },
  { id: 'teatralny', name: 'Театральный мост', key: 'griboedov', c: [-1253.3, -1018.1], axis: 115.5, w: 15.6, len: 18, own: true },   // Triple Bridge, west part (dossier mars-bridges-canals.md 4.10)
// (kamenny: see the south-west rows below)
  { id: 'green', name: 'Зелёный мост', key: 'moika', c: [-1768, -419], axis: 104, w: 39, len: 29.3, own: true },
  { id: 'pevchesky', name: 'Певческий мост', key: 'moika', c: [-1781, -845], axis: 94, w: 73, len: 30, own: true },
  { id: 'red', name: 'Красный мост', key: 'moika', c: [-2011, -63], axis: 143, w: 17, len: 22, own: true },
  { id: 'blue', name: 'Синий мост', key: 'moika', c: [-2368, 84], axis: 156, w: 98, len: 29.4, own: true },
  { id: 'bolshoy-konyushenny', name: 'Большой Конюшенный мост', key: 'moika', c: [-1574.9, -1072.4], axis: 146, w: 11.6, len: 17.6, own: true },   // 11.6 m wide (OSM footways +-4.5), 17.6 m long (28.8 with the wings)
  { id: 'hermitage', name: 'Эрмитажный мост', key: 'winter-canal', c: [-1920, -1137], axis: 51, w: 16.5, len: 12.2, own: true },
  { id: 'zimny-1', name: '1-й Зимний мост', key: 'winter-canal', c: [-1822, -1008], axis: 49, w: 21.5, len: 15.6, own: true },
  { id: 'zimny-2', name: '2-й Зимний мост', key: 'winter-canal', c: [-1775, -945], axis: 26, w: 10.5, len: 20.5, own: true },
  { id: 'palace', name: 'Дворцовый мост', key: 'neva', c: [-2322, -884], axis: 143, w: 30, len: 255, own: true },
  { id: 'anichkov', name: 'Аничков мост', key: 'fontanka', c: [-442, -92], axis: 100, w: 38, len: 55, own: true },
  // ---- the Mars Field / Summer Garden reach (M1..M7; docs/research/mars-bridges-canals.md sections 4, 5, 7): the bridges module draws the decks (own), the quay leaves its wall / parapet / collider open
  // under them (the zone rectangle: |u| <= len / 2 + 14 across the water, |v| <= w / 2 along it) and the Swan Canal slope stops at the abutments. w = the deck width measured ALONG the water.
  { id: 'swan-upper', name: 'Верхний Лебяжий мост', key: 'swan-canal', c: [-1069.2, -1610.6], axis: 67, w: 14.9, len: 12.5, own: true },
  { id: 'swan-lower', name: 'Нижний Лебяжий мост', key: 'swan-canal', c: [-857.7, -1004.3], axis: 67, w: 21, len: 11.5, own: true },
  { id: 'prachechny', name: 'Прачечный мост', key: 'fontanka', c: [-829.9, -1716.2], axis: 247, w: 14.3, len: 40.9, own: true },
  { id: 'panteleymonovsky', name: 'Пантелеймоновский мост', key: 'fontanka', c: [-725.2, -1082.8], axis: 76.5, w: 23.4, len: 43, own: true },
  { id: 'eng1', name: '1-й Инженерный мост', key: 'moika', c: [-754.7, -1042.0], axis: 326, w: 10, len: 24, own: true },
  { id: 'garden1', name: '1-й Садовый мост', key: 'moika', c: [-886.4, -962.9], axis: 342, w: 21, len: 22.4, own: true },
  { id: 'garden2', name: '2-й Садовый мост', key: 'moika', c: [-1178.9, -1010.1], axis: 192, w: 20.6, len: 29.7, own: true },
  { id: 'malo-konyushenny', name: 'Мало-Конюшенный мост', key: 'moika', c: [-1249.8, -1036.4], axis: 11, w: 15.6, len: 24.6, own: true },
  // ---- the south-west (S1..S5; docs/research/sw-canals-bridges.md section 5)
  { id: 'kamenny', name: 'Каменный мост', key: 'griboedov', c: [-1800.4, 218.5], axis: 143, w: 13.9, len: 19.7, own: true },
  { id: 'demidov', name: 'Демидов мост', key: 'griboedov', c: [-2002.6, 414.0], axis: 154.4, w: 16.1, len: 36, own: true },
  { id: 'sennoy', name: 'Сенной мост', key: 'griboedov', c: [-2017.7, 657.4], axis: 103.6, w: 4.5, len: 22.5, own: true },
  { id: 'kokushkin', name: 'Кокушкин мост', key: 'griboedov', c: [-2105.3, 735.8], axis: 152.5, w: 13.1, len: 22, own: true },
  { id: 'voznesensky', name: 'Вознесенский мост', key: 'griboedov', c: [-2410.4, 662.7], axis: 1.6, w: 20, len: 25, own: true },
  { id: 'podyachesky', name: 'Подьяческий мост', key: 'griboedov', c: [-2549.3, 627.6], axis: 14.2, w: 20.6, len: 19, own: true },
  { id: 'lviny', name: 'Львиный мост', key: 'griboedov', c: [-2788.7, 613.4], axis: 155.4, w: 5.2, len: 22.4, own: true },
  { id: 'kharlamov', name: 'Харламов мост', key: 'griboedov', c: [-2698.1, 902.1], axis: 66.7, w: 22.5, len: 26, own: true },
  { id: 'novo-nikolsky', name: 'Ново-Никольский мост', key: 'griboedov', c: [-2698.7, 1161.8], axis: 155.4, w: 22.6, len: 22.8, own: true },
  { id: 'pikalov', name: 'Пикалов мост', key: 'griboedov', c: [-2955.5, 1284.1], axis: 155.6, w: 10.6, len: 22.8, own: true },
  { id: 'krasnogvardeysky', name: 'Красногвардейский мост', key: 'griboedov', c: [-2910.7, 1262.6], axis: 155.1, w: 8.5, len: 22.5, own: true },
  { id: 'mogilevsky', name: 'Могилёвский мост', key: 'griboedov', c: [-3237.9, 1202.7], axis: 155.3, w: 24, len: 32, own: true },
  { id: 'staro-nikolsky', name: 'Старо-Никольский мост', key: 'kryukov', c: [-2921.2, 1314.3], axis: 66.2, w: 20.2, len: 24.3, own: true },
  { id: 'kashin', name: 'Кашин мост', key: 'kryukov', c: [-3034.1, 1044.8], axis: 66.2, w: 16, len: 23.9, own: true, pad: 4 },   // pad: the asphalt of the approach flares to the wall beside the deck
  { id: 'torgovy', name: 'Торговый мост', key: 'kryukov', c: [-3105.7, 874.0], axis: 65.9, w: 10.8, len: 24, own: true },
  { id: 'dekabristov', name: 'мост Декабристов', key: 'kryukov', c: [-3162.8, 692.9], axis: 66, w: 23.3, len: 26, own: true },
  { id: 'matveev', name: 'Матвеев мост', key: 'kryukov', c: [-3213.0, 527.1], axis: 81.1, w: 9.8, len: 26, own: true },
  { id: 'krasnoflotsky', name: 'Краснофлотский мост', key: 'moika', c: [-3196.6, 498.1], axis: 158.2, w: 6, len: 29.8, own: true },
  { id: 'potseluev', name: 'Поцелуев мост', key: 'moika', c: [-3146.5, 472.1], axis: 156, w: 23.5, len: 40, own: true },
  { id: 'pochtamtsky', name: 'Почтамтский мост', key: 'moika', c: [-2821.7, 214.3], axis: 166.3, w: 6, len: 41.9, own: true },
  { id: 'fonarny', name: 'Фонарный мост', key: 'moika', c: [-2651.5, 200.3], axis: 142.6, w: 20, len: 40, own: true },
  { id: 'khrapovitsky', name: 'Храповицкий мост', key: 'moika', c: [-3689.6, 382.9], axis: 164.1, w: 20.5, len: 42.4, own: true },
  { id: 'krushtein1', name: '1-й мост Круштейна', key: 'admiralty', c: [-3394.0, 168.0], axis: 147.7, w: 9.3, len: 14.3, own: true },
  { id: 'krushtein2', name: '2-й мост Круштейна', key: 'admiralty', c: [-3620.7, 314.2], axis: 143.4, w: 10.7, len: 14.8, own: true },
  { id: 'admiralteysky', name: 'Адмиралтейский мост', key: 'admiralty', c: [-3769.6, 238.1], axis: 62.4, w: 14.5, len: 12.8, own: true },
  { id: 'obukhovsky', name: 'Обуховский мост', key: 'fontanka', c: [-1872.8, 1202.1], axis: 178.1, w: 30.9, len: 54, own: true },
  { id: 'izmailovsky', name: 'Измайловский мост', key: 'fontanka', c: [-2428.7, 1456.4], axis: 2.1, w: 15.9, len: 70.5, own: true },
  // (the Blagoveshchensky row of the first round - c (-3380,-140), axis 154.3, 8.4 m off the real axis - is gone, water-2 2026-10-08: the quay opening of its south landing now comes from the bridges owner's
  //  record BLAG_ZONE of bridges/sites.js through river.js bridgeZones() (SITE_OF keeps the id), the shade of the water under the whole deck is the BRIDGE_SHADES row below)
  // the Troitsky Bridge: only the first ~80 m from the Mars Field bank open the Neva quay (bank crossing at (-1222.9,-1564.8), axis 337); the rest of the 582 m lies over the open Neva
  { id: 'troitsky', name: 'Троицкий мост', key: 'neva', c: [-1230.6, -1583.3], axis: 337, w: 28, len: 90, own: true, noShade: true },      // (2026-10-06, build-bridges: the deck centre IS the OSM axis; the first row stood 5.45 m ENE of it)
];

/** The decks of the big bridges of the Petrograd side as the water shader darkens the water under them (docs/research/petro-requests-bridges.md: deck rectangle centre, axis, width between the railings, length
 *  bank to bank). Shade only: the quay openings come from petroZones() / the old rows above. */
export const BRIDGE_SHADES = [
  { id: 'troitsky-deck', key: 'neva', c: [-1330.9, -1819.8], axis: 336.99, w: 23.6, len: 553.8 },
  { id: 'palace-deck', key: 'neva', c: [-2415.2, -977.3], axis: 323.5, w: 27.7, len: 254.5 },
  { id: 'birzhevoy-deck', key: 'neva', c: [-2678.7, -1544.8], axis: 3.63, w: 27.3, len: 238.7 },
  { id: 'tuchkov-deck', key: 'neva', c: [-3676.7, -1842.5], axis: 34.69, w: 36.0, len: 220.1 },
  { id: 'sampsonievsky-deck', key: 'neva', c: [-781.8, -2849.2], axis: 85.84, w: 27.0, len: 207 },
  // Vasilievsky Island (bridges owner, docs/research/vo-requests-bridges.md section 2: deck centre, bearing, width between the railings, length bank to bank)
  { id: 'blagoveshchensky-deck', key: 'neva', c: [-3448.92, -263.75], axis: 334.3, w: 37.4, len: 332.6 },
  { id: 'uralsky-deck', key: 'smolenka', c: [-4626.9, -1826.9], axis: 144.3, w: 31.0, len: 21.6 },
  { id: 'smolensky-deck', key: 'smolenka', c: [-5286.9, -1645.8], axis: 149.5, w: 28.2, len: 21.3 },
  // (review-water-2 2026-10-09, request of bridges-2, docs/research/vo-requests-bridges.md SECOND PASS -> environment item 1: deck centre over the water, bearing, width between the faces, length bank to bank + 0.8 m)
  { id: 'nalichny-deck', key: 'smolenka', c: [-6702.1, -1707.9], axis: 16.3, w: 70.9, len: 41.7 },
  { id: 'korablestroiteley-deck', key: 'smolenka', c: [-7532.2, -1948.0], axis: 16.5, w: 70.8, len: 40.7 },
  { id: 'smol1-deck', key: 'smolenka', c: [-8059.5, -2005.4], axis: 15.7, w: 16.4, len: 30.8 },
  { id: 'smol2-deck', key: 'smolenka', c: [-8008.7, -2182.8], axis: 17.4, w: 15.8, len: 31.5 },
  { id: 'smol3-deck', key: 'smolenka', c: [-7955.6, -1975.4], axis: 16.3, w: 51.4, len: 32.2 },
  { id: 'smol4-deck', key: 'smolenka', c: [-7903.2, -2151.0], axis: 16.3, w: 51.0, len: 31.3 },
  { id: 'novo-andreevsky-deck', key: 'smolenka', c: [-6328.8, -1603.0], axis: 201.7, w: 3.3, len: 22.3 },
  // (water-3 2026-10-09) the Shkipersky bridge that landmarksGavan draws (frame B: origin (-7009.5, -31.0) = the deck centre, u bearing 79.4, deck 9.0 m between the railings; the water interval along the axis measured
  // with layout.inRiver: u -17.0 .. 17.1 = 34.1 m, + 1.6 m overlap as for the other rows)
  { id: 'shkipersky-deck', key: 'gavan', c: [-7009.5, -31.0], axis: 79.4, w: 9.0, len: 35.7 },
  // the two decks of the Zhdanovka (bridges/long.js ZHDANOVSKY / KURSANT: origin + half the length along the bearing, 2 x hw, len)
  { id: 'zhdanovsky-deck', key: 'zhdanovka', c: [-3622.65, -2355.82], axis: 215.11, w: 35.0, len: 32.2 },
  { id: 'kursant-deck', key: 'zhdanovka', c: [-3932.21, -2543.13], axis: 34.62, w: 22.0, len: 42.0 },
];

// ---------------------------------------------------------------- geometry helpers
const ringArea = (o) => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return a / 2; };
const _clipLines = (() => {                                  // axis-parallel lines of the EXTENT rectangle borders
  const set = new Map();
  for (const r of EXTENT_RECTS) { set.set('x' + r.x0, ['x', r.x0]); set.set('x' + r.x1, ['x', r.x1]); set.set('z' + r.z0, ['z', r.z0]); set.set('z' + r.z1, ['z', r.z1]); }
  return [...set.values()];
})();
function onClipLine(ax, az, bx, bz) {
  for (const [axis, v] of _clipLines) {
    if (axis === 'x') { if (Math.abs(ax - v) < SEAM_TOL && Math.abs(bx - v) < SEAM_TOL) return true; }
    else if (Math.abs(az - v) < SEAM_TOL && Math.abs(bz - v) < SEAM_TOL) return true;
  }
  return false;
}
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2)); return Math.hypot(ax + dx * t - px, az + dz * t - pz); };
export function pointInFlat(x, z, o) { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
const boxOf = (o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return [x0, x1, z0, z1]; };
const chainLen = (pts) => { let l = 0; for (let j = 0; j + 1 < pts.length; j++) l += Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]); return l; };

/** continuation of a river past an end edge (a = the point where chain A ends, b = where chain B starts): returns the points of both banks, near -> far */
function extendEnds(a, b, path, grow) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], hw = Math.hypot(a[0] - b[0], a[1] - b[1]) / 2, P = [m, ...path];
  const A = [], B = [];
  for (let k = 1; k < P.length; k++) {
    const p = P[k], q = P[k - 1], r = P[Math.min(P.length - 1, k + 1)];
    let tx = r[0] - q[0], tz = r[1] - q[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const nx = -tz, nz = tx, sgn = ((a[0] - m[0]) * nx + (a[1] - m[1]) * nz) >= 0 ? 1 : -1, w = hw * (1 + grow * k);
    A.push([p[0] + nx * w * sgn, p[1] + nz * w * sgn]); B.push([p[0] - nx * w * sgn, p[1] - nz * w * sgn]);
  }
  return { A, B };
}

let _built = null;
function build() {
  const rings = [];                                          // { key, o, id, kind }
  RIVER.forEach((r, ri) => {
    // Complete full-relation rings below replace incomplete/new regional
    // fragments of these Nevka arms, avoiding transverse clip-edge quays.
    if (KRESTOVSKY_WATER.some(p => p.name === r.name) || ISLANDS2_WATER.some(p => p.name && p.name === r.name)) return;
    const key = keyOf(r);
    if (!key || !WATERWAYS[key]) return;
    r.polys.forEach((p, pi) => rings.push({ key, o: p.o, id: ri + ':' + pi, kind: 'data' }));
  });
  // water of the east that the city bake has no polygon for (the Monastyrka river inside the Lavra district: wholly inside the extent)
  EAST_WATER.forEach((p, i) => { if (KEY_BY_NAME[p.name] && !RIVER.some((r) => r.name === p.name && r.polys.length) && p.name === 'Монастырка') rings.push({ key: KEY_BY_NAME[p.name], o: p.o, id: 'east' + i, kind: 'data' }); });
  WATER.forEach((w) => { if (w.id === 'r15750440') w.polys.forEach((p, i) => rings.push({ key: 'moat', o: p.o, id: 'moat' + i, kind: 'data' })); });      // the castle moat (the data keeps it as a plain pond)
  WATER.forEach((w) => { if (w.id === 'r1648982') w.polys.forEach((p, i) => rings.push({ key: 'nh-inner', o: p.o, id: 'kovsh' + i, kind: 'data' })); });      // the Kovsh basin of New Holland (a plain pond in the data)
  // ---- the Petrograd side: the Kronverk moat and the arm round the Petrovsky stadium (plain WATER records), the Malaya Neva and the Bolshaya Nevka (petro-water.js: real banks + scenery beyond the data in ONE ring,
  // `caps` = its closing edges, no bank), the scenery tails of the Zhdanovka waters
  WATER.forEach((w) => { if (w.id === 'r2893409') w.polys.forEach((p, i) => rings.push({ key: 'kronverk-moat', o: p.o, id: 'kmoat' + i, kind: 'data' })); });
  WATER.forEach((w) => { if (w.id === 'r1576116') w.polys.forEach((p, i) => rings.push({ key: 'zhdanovka', o: p.o, id: 'stadium' + i, kind: 'data' })); });
  PETRO_WATER.forEach((p) => {
    if (KRESTOVSKY_WATER.some(w => (w.rel || w.id) === p.id) || ISLANDS2_WATER.some(w => (w.rel || w.id) === p.id)) return;      // the complete OSM ring replaces the 4-vertex scenery closure (and the clipped pieces)
    // the Malaya Neva: the 149 baked vertices stay as they were; the INVENTED scenery tail of petro-water.js (a river of 400 m running to x -7400 across the Dekabristov Island) is replaced by the real continuation
    // of OSM relation 72500 (vo-water.js VO_MALAYA_TAIL: the Dekabristov / Krestovsky shores, the mouth line near x -6790, back to the Smolenka source; the mouth line joins the Gulf ring exactly)
    if (p.id === 'r72500') { rings.push({ key: p.key, o: [...p.o.slice(0, p.real * 2), ...VO_MALAYA_TAIL], id: p.id, kind: 'data' }); return; }
    rings.push({ key: p.key, o: p.o, id: p.id, kind: 'data', caps: p.caps });
  });
  KRESTOVSKY_WATER.forEach(p => rings.push({ key:p.key, o:p.o, id:p.id, kind:'data' }));
  ISLANDS2_WATER.forEach(p => rings.push({ key:p.key, o:p.o, id:p.id, kind:'data' }));      // the Srednyaya Nevka (4 relations), the Krestovka, the Bolshaya Nevka (3 relations): simple rings, islands cut out
  // ---- Vasilievsky Island: the Smolenka (river, mouth arms, mouth basin), the Kovsh, Galerny Harbour and the Shkipersky canal are plain WATER records of the bake (no key in RIVER); the Gulf of Finland is the ring of vo-water.js
  // (it never overlaps them: the generator subtracts their polygons); its `bankMask` marks the edges that lie on the island outline: every other edge (the far coasts, the open boundary) is no bank
  const VO_KEYS = { r1576084: 'smolenka', r1576086: 'smolenka', w428079227: 'smolenka', w95646723: 'kovsh', r1648985: 'gavan', w10890576: 'gavan' };
  WATER.forEach((w) => { const k = VO_KEYS[w.id]; if (k) w.polys.forEach((p, i) => rings.push({ key: k, o: p.o, id: 'vo-' + w.id + '.' + i, kind: 'data' })); });
  VO_SEA.forEach((s, i) => rings.push({ key: 'neva', o: s.o, id: 'gulf' + i, kind: 'data', bankMask: s.bank }));
  PETRO_TAILS.forEach((p) => rings.push({ key: p.key, o: p.o, id: p.id, kind: 'data' }));
  OWNER_WATER.forEach((p) => rings.push({ key: p.key, o: p.o, id: p.id, kind: 'data', caps: 'all' }));
  PLUGS.forEach((p, i) => rings.push({ key: p.key, o: p.o, id: 'plug' + i, kind: 'plug' }));
  // (islands 2026-10-14) T-JUNCTIONS: where a vertex of one island water ring lies on a long edge of another (the mouth of the Krestovka in the Malaya Nevka: the Nevka edge (-3795, -4504) .. (-3746, -4523) is a join along
  // the first 31 m and a real shore along the rest), the edge is split at that vertex, so the join part coincides with the other ring's edge (no bank) and the shore part stays a bank. Island rings without a bank mask only.
  { const V = []; rings.forEach((g, gi) => { if (g.kind === 'plug') return; for (let q = 0; q < g.o.length; q += 2) if (inIslands(g.o[q], g.o[q + 1])) V.push([g.o[q], g.o[q + 1], gi]); });
    rings.forEach((g, gi) => {
      if (g.kind === 'plug' || g.bankMask || g.caps) return;
      const o = g.o, n = o.length / 2, out = []; let changed = false;
      for (let q = 0; q < n; q++) {
        const r = (q + 1) % n, ax = o[q * 2], az = o[q * 2 + 1], bx = o[r * 2], bz = o[r * 2 + 1], l = Math.hypot(bx - ax, bz - az);
        out.push(ax, az);
        if (l < 8 || !inIslands((ax + bx) / 2, (az + bz) / 2)) continue;
        const ins = [];
        for (const [vx, vz, gj] of V) {
          if (gj === gi) continue;
          const t = ((vx - ax) * (bx - ax) + (vz - az) * (bz - az)) / (l * l); if (t < 0.02 || t > 0.98) continue;
          if (Math.abs((vx - ax) * (bz - az) - (vz - az) * (bx - ax)) / l < 0.25 && !ins.some((u) => Math.abs(u[0] - t) * l < 0.3)) ins.push([t, vx, vz]);
        }
        if (ins.length) { ins.sort((u, w) => u[0] - w[0]); for (const [, vx, vz] of ins) out.push(vx, vz); changed = true; }
      }
      if (changed) g.o = out;
    }); }
  for (const g of rings) { g.area = ringArea(g.o); g.waterLeft = g.area > 0; g.n = g.o.length / 2; g.box = boxOf(g.o); }
  // a shore that a sight module draws completely (OWNER_BANK): its edges are no bank of ours (kept apart for shoreDistance)
  const ownerRings = OWNER_BANK.map((w) => ({ o: w.o, box: boxOf(w.o) })), ownerEdges = [];
  const ringDist = (x, z, o) => { let d = 1e9; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) d = Math.min(d, segDist(x, z, o[j], o[j + 1], o[i], o[i + 1])); return d; };
  const isOwnerEdge = (ax, az, bx, bz) => ownerRings.some((w) => { const b = w.box; if (Math.max(ax, bx) < b[0] - 3 || Math.min(ax, bx) > b[1] + 3 || Math.max(az, bz) < b[2] - 3 || Math.min(az, bz) > b[3] + 3) return false; return ringDist(ax, az, w.o) < 2.5 && ringDist(bx, bz, w.o) < 2.5 && ringDist((ax + bx) / 2, (az + bz) / 2, w.o) < 2.5; });
  const isCap = (g, ax, az, bx, bz) => g.caps === 'all' || (isOwnerEdge(ax, az, bx, bz) && (ownerEdges.push([ax, az, bx, bz]), true)) || !!g.caps && g.caps.some((c) => (Math.hypot(c[0] - ax, c[1] - az) < 0.5 && Math.hypot(c[2] - bx, c[3] - bz) < 0.5) || (Math.hypot(c[0] - bx, c[1] - bz) < 0.5 && Math.hypot(c[2] - ax, c[3] - az) < 0.5));
  const CELL = 64, grid = new Map(), cellsOf = (ax, az, bx, bz, f) => { for (let i = Math.floor(Math.min(ax, bx) / CELL); i <= Math.floor(Math.max(ax, bx) / CELL); i++) for (let j = Math.floor(Math.min(az, bz) / CELL); j <= Math.floor(Math.max(az, bz) / CELL); j++) f(i * 8192 + j); };
  rings.forEach((g, gi) => { for (let i = 0; i < g.n; i++) { const j = (i + 1) % g.n, ax = g.o[i * 2], az = g.o[i * 2 + 1], bx = g.o[j * 2], bz = g.o[j * 2 + 1]; cellsOf(ax, az, bx, bz, (k) => { let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push([gi, ax, az, bx, bz]); }); } });
  // an edge that lies INSIDE another ring of the same waterway is no bank: the overlap seam of two part polygons (the Griboedov canal at the Pikalov / Krasnogvardeysky bridges: the polygons overlap by 7 m, x -2918 .. -2911,
  // and each end edge would otherwise stand as a transverse quay wall in the water)
  const insideSame = (gi, ax, az, bx, bz) => {
    const g = rings[gi], mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (let oj = 0; oj < rings.length; oj++) {
      if (oj === gi || rings[oj].key !== g.key) continue;
      if (rings[oj].kind === 'plug' && g.kind !== 'plug' && !wetBothSides(ax, az, bx, bz)) continue;      // (a shore edge at the corner of a plug: see wetBothSides)
      const bb = rings[oj].box; if (mx < bb[0] || mx > bb[1] || mz < bb[2] || mz > bb[3]) continue;
      if (pointInFlat(mx, mz, rings[oj].o) && pointInFlat(ax * 0.8 + bx * 0.2, az * 0.8 + bz * 0.2, rings[oj].o) && pointInFlat(ax * 0.2 + bx * 0.8, az * 0.2 + bz * 0.8, rings[oj].o)) return true;
    }
    return false;
  };
  const coincides = (gi, ax, az, bx, bz) => {                // an edge of another ring runs along this edge (open join of two water bodies)
    let hit = false;
    cellsOf(ax, az, bx, bz, (k) => { if (hit) return; for (const [oj, cx, cz, dx, dz] of grid.get(k) || []) { if (oj === gi) continue; const tol = rings[oj].key === rings[gi].key ? 1.8 : 0.8;       // the part polygons of one waterway meet with up to ~1.6 m of slack (Griboedov canal at the Pikalov bridge)
 if (segDist(ax, az, cx, cz, dx, dz) < tol && segDist(bx, bz, cx, cz, dx, dz) < tol) { if (rings[oj].kind === 'plug' && rings[gi].kind !== 'plug' && !wetBothSides(ax, az, bx, bz)) continue; hit = true; return; } } });
    if (hit) return true;
    // (islands 2026-10-14) the join of two water bodies of the islands (the mouth of the Krestovka in the Malaya Nevka at (-3795, -4504) .. (-3746, -4523): one long edge of the Nevka ring lies along the shorter edges of the
    // Krestovka ring and of its neighbours): an edge whose every 4 m sample lies on the outline of SOME other ring and that has water on both sides is no bank (a 52 m wall stood across the water of the mouth)
    { const ex = (ax + bx) / 2, ez = (az + bz) / 2;
      if (inIslands(ex, ez)) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / 4)); let all = true;
        for (let k = 0; k <= n && all; k++) { const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; let ok = false; cellsOf(x, z, x, z, (c) => { if (ok) return; for (const [oj, cx, cz, dx, dz] of grid.get(c) || []) { if (oj === gi || rings[oj].kind === 'plug') continue; if (segDist(x, z, cx, cz, dx, dz) < 0.8) { ok = true; return; } } }); all = ok; }
        if (all && wetBothSides(ax, az, bx, bz)) return true;
      } }
    // the same along SEVERAL edges of one other ring (the mouth line of the Zhdanovka is one edge of its polygon and two edges of the Malaya Nevka's): both ends and the middle lie on that ring's outline and
    // there is water on both sides. Only for different waterways (0.8 m): the pieces of one waterway keep the single-edge rule above. Only in the Petrograd-only data: the older joins (the Moika source under the
    // 1st Engineer Bridge) stay as they were reviewed.
    const near = new Map(), mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (!petroAt(mx, mz)) return false;
    cellsOf(ax, az, bx, bz, (k) => { for (const [oj, cx, cz, dx, dz] of grid.get(k) || []) { if (oj === gi || rings[oj].key === rings[gi].key || rings[oj].kind === 'plug' || rings[gi].kind === 'plug') continue; let m = near.get(oj); if (!m) near.set(oj, (m = [9, 9, 9])); m[0] = Math.min(m[0], segDist(ax, az, cx, cz, dx, dz)); m[1] = Math.min(m[1], segDist(bx, bz, cx, cz, dx, dz)); m[2] = Math.min(m[2], segDist(mx, mz, cx, cz, dx, dz)); } });
    for (const m of near.values()) if (m[0] < 0.8 && m[1] < 0.8 && m[2] < 0.8 && wetBothSides(ax, az, bx, bz)) return true;
    return false;
  };
  // FORCED BANK: the 1.2 m corner edge of the Neva polygon at the same spot touches the Bolshaya Neva polygon in one vertex, which the 1.8 m slack rule of same-waterway pieces reads as a join: it is shore
  // (land to the west), and without it the two chains end 1.204 m apart (the stitch limit is 1.2 m)
  const FORCED_BANK = [[-2460.8, -1097.5, -2460.7, -1098.7],
    [-2464.2, -1833.5, -2462.1, -1832.1], [-2462.1, -1832.1, -2459.7, -1831.8],
    [-7819.9, -4200.4, -7826.5, -4200],      // islands 2026-10-14: the 6.6 m edge of the Gulf coast of Krestovsky Island that lies on the clip line z -4200 (a seam of the bake read as a clip edge: a gap between two chains of the coast)
    [-4278.4, 432.1, -4280, 436.6]];      // Vasilievsky Island: the 4.8 m edge between the Lt Schmidt-side chain neva#12 and neva#14 at (-4279, 434) (a piece seam of the bake that read as a clip line / join: 5 m of shore without a wall, found by the shore-coverage pass of tools/environment-banks.mjs)      // the same at the Mytninskaya corner of the Kronverksky strait mouth (two edges of the strait polygon, 4.9 m; found by the shore-coverage pass of tools/environment-banks.mjs)
  function isForcedBank(ax, az, bx, bz) { return FORCED_BANK.some((e) => (Math.hypot(e[0] - ax, e[1] - az) < 0.3 && Math.hypot(e[2] - bx, e[3] - bz) < 0.3) || (Math.hypot(e[0] - bx, e[1] - bz) < 0.3 && Math.hypot(e[2] - ax, e[3] - az) < 0.3)); }
  // A PLUG is a hand-made strip (under the Palace Bridge) whose short end edge lies ON the shore of the Spit: there a data edge that runs along it is a real bank (land on one side), not an open join. Until the
  // Petrograd side bake that shore was far scenery; with the rule "any coinciding edge is a join" the Spit quay had a 20 m hole beside the north head of the Palace Bridge ((-2460.8,-1097.5)..(-2471.7,-1114.1)).
  const wetAt = (x, z) => rings.some((r) => x >= r.box[0] && x <= r.box[1] && z >= r.box[2] && z <= r.box[3] && pointInFlat(x, z, r.o));
  function wetBothSides(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1, nx = -dz / l * 1.5, nz = dx / l * 1.5, mx = (ax + bx) / 2, mz = (az + bz) / 2;
    return wetAt(mx + nx, mz + nz) && wetAt(mx - nx, mz - nz);
  }
  // real edges -> chains with the water on the LEFT of travel (normalised)
  const chains = [];
  for (let gi = 0; gi < rings.length; gi++) {
    const g = rings[gi], { o, n } = g, flags = [], ov = [];      // ov: the edge is a bank only through the islands override of bankMask '0' (its chain never stitches to an older chain: the older chains keep their first point = their bank index / wall texture offset)
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; const ax = o[i * 2], az = o[i * 2 + 1], bx = o[j * 2], bz = o[j * 2 + 1]; flags.push(isForcedBank(ax, az, bx, bz) || (Math.hypot(bx - ax, bz - az) > 0.05 && !onClipLine(ax, az, bx, bz) && !coincides(gi, ax, az, bx, bz) && !insideSame(gi, ax, az, bx, bz) && !isCap(g, ax, az, bx, bz) && !(g.bankMask && g.bankMask[i] === '0' && !(inIslands((ax + bx) / 2, (az + bz) / 2) || inIslands(ax, az) || inIslands(bx, bz))))); ov.push(!!(g.bankMask && g.bankMask[i] === '0' && (inIslands((ax + bx) / 2, (az + bz) / 2) || inIslands(ax, az) || inIslands(bx, bz)))); }
      // (islands 2026-10-14: the Gulf coast of Krestovsky Island (74 edges of the ring gulf0, x -8426 .. -6746, bankMask '0' there: "no bank") is a real shore of the walkable island: it gets a bank like every other shore of the islands)
    if (flags.every(Boolean)) {
      const pts = []; for (let i = 0; i < n; i++) pts.push([o[i * 2], o[i * 2 + 1]]); pts.push(pts[0]);
      chains.push({ key: g.key, pts: g.waterLeft ? pts : pts.reverse(), closed: true });
      continue;
    }
    if (flags.every((f) => !f)) continue;
    const gid = flags.map((f, i) => (f ? (ov[i] ? 2 : 1) : 0));      // 1 = an ordinary bank edge, 2 = an override edge: a chain breaks where the group changes
    let s = 0; while (gid[(s + n - 1) % n] && gid[(s + n - 1) % n] === gid[s]) s++;
    let cur = null, curG = 0;
    for (let k = 0; k < n; k++) {
      const i = (s + k) % n, j = (i + 1) % n;
      if (flags[i]) { if (cur && curG !== gid[i]) { chains.push({ key: g.key, pts: g.waterLeft ? cur : cur.reverse(), closed: false, noStitch: curG === 2 }); cur = null; } if (!cur) { cur = [[o[i * 2], o[i * 2 + 1]]]; curG = gid[i]; } cur.push([o[j * 2], o[j * 2 + 1]]); } else if (cur) { chains.push({ key: g.key, pts: g.waterLeft ? cur : cur.reverse(), closed: false, noStitch: curG === 2 }); cur = null; }
    }
    if (cur) chains.push({ key: g.key, pts: g.waterLeft ? cur : cur.reverse(), closed: false, noStitch: curG === 2 });
  }
  // stitch chains of one waterway whose end meets another's start (within 1.2 m)
  const stitched = [], per = {}, lone = [];      // lone: the chains of the islands override: appended at the very end, so no older chain changes its position in the list
  for (const c of chains) (per[c.key] = per[c.key] || []).push(c);
  for (const k of Object.keys(per)) {
    const list = per[k].filter((c) => !c.closed && !c.noStitch), done = new Set();
    for (const c of per[k]) if (c.noStitch && !c.closed) lone.push({ key: k, pts: c.pts, closed: false });
    for (const c of per[k]) if (c.closed) stitched.push(c);
    const startAt = (p, skip) => { for (const c of list) if (!done.has(c) && c !== skip && Math.hypot(c.pts[0][0] - p[0], c.pts[0][1] - p[1]) < 1.2) return c; return null; };
    for (const c of list) {
      if (done.has(c)) continue;
      let head = c, guard = 0;
      for (;;) { const e = head.pts[0]; const prev = list.find((q) => q !== head && Math.hypot(q.pts[q.pts.length - 1][0] - e[0], q.pts[q.pts.length - 1][1] - e[1]) < 1.2); if (!prev || prev === c || guard++ > 20) break; head = prev; }
      const pts = []; let cur = head; guard = 0;
      while (cur && !done.has(cur) && guard++ < 24) { done.add(cur); for (let i = pts.length ? 1 : 0; i < cur.pts.length; i++) pts.push(cur.pts[i]); cur = startAt(cur.pts[cur.pts.length - 1], cur); }
      stitched.push({ key: k, pts, closed: pts.length > 3 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1.2 });
    }
  }
  // continuations beyond the data
  const ext = [];
  for (const E of EXTENSIONS) {
    const A = stitched.find((c) => c.key === E.key && !c.closed && Math.hypot(c.pts[c.pts.length - 1][0] - E.aEnd[0], c.pts[c.pts.length - 1][1] - E.aEnd[1]) < 2);
    const B = stitched.find((c) => c.key === E.key && !c.closed && Math.hypot(c.pts[0][0] - E.bStart[0], c.pts[0][1] - E.bStart[1]) < 2);
    if (!A || !B) continue;
    const { A: sa, B: sb } = extendEnds(A.pts[A.pts.length - 1], B.pts[0], E.path, E.grow);
    const ring = [...sa.map((p) => p).reverse().reverse(), ...sb.slice().reverse()].flat();
    // water ring of the extension: end edge (a -> b) is the near edge; ring = a, sideA..., sideB (far -> near), b
    const near = [A.pts[A.pts.length - 1], ...sa, ...sb.slice().reverse(), B.pts[0]].flat();
    A.pts.push(...sa); B.pts.unshift(...sb.slice().reverse());
    ext.push({ id: E.id, key: E.key, o: near, scenery: true });
    void ring;
  }
  // the Neva beyond the data
  const F = FAR_BANKS, nevaRing = [];
  const farBanks = Object.entries(F).map(([name, pts]) => {                  // landSide from a probe 6 m to the left of the travel direction
    const m = Math.floor(pts.length / 2), a = pts[m], b = pts[m + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, px = (a[0] + b[0]) / 2 + (-(b[1] - a[1]) / l) * 6, pz = (a[1] + b[1]) / 2 + ((b[0] - a[0]) / l) * 6;
    const waterLeft = pointInFlat(px, pz, nevaRing), P = pts.map((p) => [p[0], p[1]]);
    return { id: 'neva-far-' + name, name: 'neva-far-' + name, key: 'neva', pts: waterLeft ? P : P.reverse(), closed: false, landSide: -1, len: chainLen(P), w: WATERWAYS.neva, far: true };
  });
  // scenery banks of the real east polygons (data/east-water.js) east of x -840: the quay builder draws a plain granite wall + parapet along the parts outside the EXTENT (the data banks rule inside);
  // edges on the clip lines of the bake box are no banks; west of x -840 the invented banks above are the (tuned) scenery
  EAST_WATER.forEach((p, ei) => {
    if (p.name === 'Монастырка') return;
    const n = p.o.length / 2, area = ringArea(p.o), waterLeft = area > 0, B = EAST_WATER_BOUNDS, onBox = (x, z) => x <= B.x0 + 0.5 || x >= B.x1 - 0.5 || z <= B.z0 + 0.5 || z >= B.z1 - 0.5;
    const ok = [];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = p.o[i * 2], az = p.o[i * 2 + 1], bx = p.o[j * 2], bz = p.o[j * 2 + 1]; ok.push(Math.hypot(bx - ax, bz - az) > 0.05 && ax >= -840 && bx >= -840 && !(onBox(ax, az) && onBox(bx, bz))); }
    let s = 0; while (s < n && ok[(s + n - 1) % n]) s++;
    if (s === n) s = 0;
    let cur = null, k = 0; const flush = () => { if (cur && cur.length >= 2) { const P = waterLeft ? cur : cur.slice().reverse(); farBanks.push({ id: 'neva-east-' + ei + '.' + (k++), name: 'neva-east-' + ei + '.' + k, key: 'neva', pts: P, closed: false, landSide: -1, len: chainLen(P), w: WATERWAYS.neva, far: true }); } cur = null; };
    for (let m = 0; m < n; m++) { const i = (s + m) % n, j = (i + 1) % n; if (ok[i]) { if (!cur) cur = [[p.o[i * 2], p.o[i * 2 + 1]]]; cur.push([p.o[j * 2], p.o[j * 2 + 1]]); } else flush(); }
    flush();
  });
  stitched.push(...lone);      // (islands) the override chains (the Gulf coast of Krestovsky) come last
  const banks = [];
  stitched.filter((c) => c.pts.length >= 2 && chainLen(c.pts) > 2).forEach((c, i) => banks.push({ id: c.key + '#' + i, name: c.key + '#' + i, key: c.key, pts: c.pts, closed: c.closed, landSide: -1, len: chainLen(c.pts), w: WATERWAYS[c.key] }));
  // water pieces: every data ring (outer) + plugs; extension rings; the Neva scenery ring (clipped against the extents by the builders)
  const pieces = [];
  for (const g of rings) pieces.push({ id: g.id, key: g.key, o: g.o, kind: g.kind, box: g.box });
  for (const e of ext) pieces.push({ id: e.id, key: e.key, o: e.o, kind: 'ext', box: boxOf(e.o) });
  if (nevaRing.length) pieces.push({ id: 'neva-far', key: 'neva', o: nevaRing, kind: 'far', box: boxOf(nevaRing), excludeExtent: true });
  pieces.push({ id: 'neva-bay', key: 'neva', o: VO_NEVA_BAY, kind: 'far', box: boxOf(VO_NEVA_BAY), excludeExtent: true });      // the Neva Bay south of the island beyond the data extents (the data pieces rule inside them)
  // the real OSM polygons of the Neva / Bolshaya Neva / Obvodny canal beyond the data extent (scenery; the data polygons rule inside the extent). The Monastyrka lies wholly inside the extent.
  EAST_WATER.forEach((p, i) => { if (p.name !== 'Монастырка') pieces.push({ id: 'east-far' + i, key: 'neva', o: p.o, kind: 'far', box: boxOf(p.o), excludeExtent: true }); });
  return { rings, banks, farBanks, pieces, ext, nevaRing, ownerEdges };
}
export function waterGeo() { return _built || (_built = build()); }
/** the bank chains of every waterway (water on the left of travel, landSide = -1 as in river.js: the landward normal is (tz, -tx)) */
export const allBanks = () => waterGeo().banks;
export const banksOf = (key) => waterGeo().banks.filter((b) => b.key === key);
/** all water pieces: data rings, plugs, extension rings and the Neva scenery ring: [{ id, key, o (flat ring), kind: data|plug|ext|far, excludeExtent? }] */
export const waterPieces = () => waterGeo().pieces;
/** the outer rings of the waters of Vasilievsky Island that are NOT records of RIVER (the Smolenka with its mouth arms and basin, the Kovsh, Galerny Harbour, the Shkipersky canal, the Gulf of Finland, the real Malaya Neva beyond
 *  the Smolenka source): flat [x, z, ...] rings for modules that clip surfaces against the water (streets/bld.js grid() reads RIVER and slopeRings() only: the pavement strips there would run over these waters) */
export const islandWaterRings = () => waterGeo().rings.filter((r) => r.key === 'smolenka' || r.key === 'gavan' || r.key === 'kovsh' || String(r.id).startsWith('gulf') || r.id === 'r72500').map((r) => r.o);

// ---------------------------------------------------------------- queries used by layout.js (data water only: the area a player can reach)
let _data = null;
/** the pointInFlat test of a ring with its edges bucketed by 16 m bands of z: only the edges whose z range covers the band are visited (the crossing test of pointInFlat is false for
 *  every other edge, so the parity, i.e. the answer, is the one of the full loop; the per-edge expression is the same, with the same operands in the same roles) */
export function ringTester(o, band = 16) {
  let z0 = 1e9, z1 = -1e9; for (let i = 1; i < o.length; i += 2) { z0 = Math.min(z0, o[i]); z1 = Math.max(z1, o[i]); }
  const b0 = Math.floor(z0 / band), nb = Math.floor(z1 / band) - b0 + 1, bands = new Array(nb);
  for (let k = 0; k < nb; k++) bands[k] = [];
  for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
    const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1];
    for (let k = Math.floor(Math.min(zi, zj) / band) - b0; k <= Math.floor(Math.max(zi, zj) / band) - b0; k++) bands[k].push(xi, zi, xj, zj);
  }
  return (x, z) => {
    const k = Math.floor(z / band) - b0; if (k < 0 || k >= nb) return false;
    const e = bands[k]; let ins = false;
    for (let q = 0; q < e.length; q += 4) { const xi = e[q], zi = e[q + 1], xj = e[q + 2], zj = e[q + 3]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; }
    return ins;
  };
}
function dataRings() { return _data || (_data = waterGeo().rings.map((g) => ({ key: g.key, o: g.o, box: g.box, test: ringTester(g.o) }))); }
/** waterway key of the water body at (x,z) (data polygons and the bridge plug only) or null */
export function waterwayAt(x, z) {
  const rings = dataRings();
  for (let i = 0; i < rings.length; i++) { const p = rings[i], b = p.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (p.test(x, z)) return p.key; }
  return null;
}
let _edges = null;
function edges() {
  if (_edges) return _edges;
  const g = waterGeo(), cell = 128, grid = new Map(), list = [];
  for (const b of g.banks) for (let i = 0; i + 1 < b.pts.length; i++) list.push([b.pts[i][0], b.pts[i][1], b.pts[i + 1][0], b.pts[i + 1][1]]);
  for (const e of g.ownerEdges || []) list.push(e);                        // (a shore drawn by a sight module is a water edge all the same)
  for (const e of list) { const [ax, az, bx, bz] = e; for (let i = Math.floor((Math.min(ax, bx) - 80) / cell); i <= Math.floor((Math.max(ax, bx) + 80) / cell); i++) for (let j = Math.floor((Math.min(az, bz) - 80) / cell); j <= Math.floor((Math.max(az, bz) + 80) / cell); j++) { const k = i * 8192 + j; let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(e); } }
  return (_edges = { grid, cell });
}
/** distance (m) from (x,z) to the nearest water edge (0 on the water): the real banks of every waterway (not the seams of the data); 1e4 when nothing within ~80 m */
export function shoreDistance(x, z) {
  if (waterwayAt(x, z) || slopeAt(x, z)) return 0;                        // a grass slope bank counts as water for every "keep away from the water" rule (nobody stands on it)
  const { grid, cell } = edges(), c = grid.get(Math.floor(x / cell) * 8192 + Math.floor(z / cell));
  if (!c) return 1e4;
  let d = 1e4; for (const [ax, az, bx, bz] of c) d = Math.min(d, segDist(x, z, ax, az, bx, bz));
  return d;
}
export function debugBanks() {
  const C = { fontanka: "#c00", moika: "#06c", griboedov: "#090", "winter-canal": "#a0a", "swan-canal": "#c60", neva: "#036" };
  return waterGeo().banks.map((b) => ({ name: b.name + (b.closed ? "c" : ""), pts: b.pts, color: C[b.key] }));
}
void chainLen;
/** the scenery banks of the Neva beyond the data (water on the left of travel, landSide -1): the quay builder draws a plain granite wall + parapet along the parts outside the EXTENT */
export const farBanks = () => waterGeo().farBanks;

// ---------------------------------------------------------------- GRASS-SLOPE BANKS (Swan Canal everywhere, the Moika along the Mikhailovsky Garden): docs/research/mars-bridges-canals.md sections 2.1, 2.2
// A slope bank is NOT a granite wall: a low granite banquette (kerb, `kerb` m above the water) at the water, a grass slope rising to street level over `run` metres, the rail / fence at the top.
// The ground plane must be cut away over the slope (the slope lies BELOW y = 0): slopeQuads() lists the convex ground cuts (river.js waterCuts adds them as kind 'slope'), slopeRuns() the stretches
// of the bank chains (arclength s0..s1) for the quay builder (quay.js sweeps the profile along them), slopeAt() is the point test (shoreDistance counts a slope as water: nothing stands on it).
// A run stops at every bridge zone (the abutments / wings of the bridge module take over: its rectangle |u| <= len / 2 + 14 across the water, |v| <= w / 2 + 1.5 along it).
/** reaches: key of the waterway, test(x, z, nx, nz) on a bank point (landward normal n), run = horizontal length of the slope, kerb = banquette top above the water, lip = step from the banquette to the slope */
export const SLOPE_REACHES = [
  // the Admiralty canal along New Holland (docs/research/sw-canals-bridges.md 2.4): a low granite wall + a grass slope with big trees, no railing; the house bank keeps the wall + Moika railing
  { id: 'adm-newholland', key: 'admiralty', run: 3.6, kerb: 0.4, lip: 0.1, test: (x, z, nx, nz) => islandAt(x + nx * 4, z + nz * 4), rail: () => null },
  { id: 'swan', key: 'swan-canal', run: 4.7, kerb: 0.45, lip: 0.10, test: () => true, rail: (nx) => (nx < 0 ? 'ballpost' : 'trellis') },   // west (Mars Field) side ball posts + tubes, east (garden) side green trellis
  // the Moika along the Mikhailovsky Garden (south bank, between the 1st Sadovy Bridge and the Rossi Pavilion landing): dossier section 2.2 "slope reach x -1000..-880"
  { id: 'moika-mikhailovsky', key: 'moika', run: 4.2, kerb: 0.45, lip: 0.10, test: (x, z, nx, nz) => nz > 0.5 && x >= -1010 && x <= -882, rail: () => null },
  // ---- the Petrograd side: NATURAL banks (docs/research/petro-water.md section 2): no granite banquette, the slope runs into the water (natural: true; quay.js sweeps the profile from below the water line).
  // Which stretches: petroNatural() below (the shore of Zayachy Island, the Kronverk bank of the strait where OSM maps an `embankment` slope, the Kronverk moat), only where 7 m of free land lie behind the
  // water edge (else the plain granite wall of the waterway stands there). surf(x, z, nx, nz) -> 'sand' (the fortress beach: the Neva side and the east tip of the island), 'cobble' (the stone-pitched
  // slopes of the island's west tip and strait side, photo refs/petro-water 05) or 'grass' (the Kronverk bank, photo 07; the moat).
  { id: 'petro-natural', key: 'neva', run: 7.0, kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 1, rail: () => null, surf: (x, z, nx, nz) => petroSurf(x, z, nx, nz) },
  // the cobble wings of the Yelagin west spit (OSM man_made=embankment w1217811700 north 160 m, w1217811701 south 95 m; photos spit 22-24 of yelagin-park-2026.md): rounded stones 15-25 cm on a slope of about 1:1.5 from the
  // promenade edge (the OSM line = the slope top, 3.2-5.3 m from the water) down to a light granite curb awash at the water line (curb: true). 2026-10-14, request of landmarksYelaginSpits 2
  { id: 'spit-wings', key: 'neva', run: 4.4, kerb: 0.0, lip: 0.0, natural: true, curb: true, test: (x, z, nx, nz) => onSpitWing(x + nx * 4.2, z + nz * 4.2), rail: () => null, surf: () => 'cobble' },
  // ---- the Petrovskaya kosa River Yacht Club and the Petrovsky stadium (2026-10-14, requests of landmarksPetrovskyYacht 1-2 and landmarksPetrovskyStadium 2; photos y01 y10 y11 y14, s02 s12 s16): the club shore is a sloped concrete-slab
  // quay with a granite edge and a stair about every 60 m (the free reaches; where a building or a road stands behind the water edge the granite wall of the Neva stays), the arc breakwater that closes the harbours a rubble
  // mole, the boiler-house reach of the stadium island a sloped light-grey slab revetment with a pale kerb. petroNatural classes: 2 = yacht slab, 3 = breakwater, 4 = stadium slab
  { id: 'yacht-slab', key: 'neva', run: 5.0, kerb: 0.0, lip: 0.0, natural: true, plane: true, edge: true, stairEvery: 60, stairsGranite: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 2, rail: () => null, surf: () => 'concrete' },
  { id: 'yacht-breakwater', key: 'neva', run: 3.6, kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 3, rail: () => null, surf: () => 'rubble' },
  { id: 'stadium-slab', key: 'zhdanovka', run: 5.0, kerb: 0.0, lip: 0.0, natural: true, plane: true, edge: true, stairEvery: 90, stairsGranite: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 4, rail: () => null, surf: () => 'concrete' },
  { id: 'kronverk-moat', key: 'kronverk-moat', run: 5.5, kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 1, rail: () => null, surf: () => 'grass' },
  // the Zhdanovka above the Zhdanovsky Bridge and the arm round the stadium (photo refs/petro-water 24): grass slopes on both sides, no wall, no railing - wherever OSM maps no retaining wall at the bank
  { id: 'zhdanovka-natural', key: 'zhdanovka', run: 6.0, kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 1, rail: () => null, surf: () => 'grass' },
  // the Karpovka outside its granite reach: mown grass slopes about 3 m high at 1:2.5, no railing (docs/research/petro-water.md, photos K03, K22, K34)
  { id: 'karpovka-natural', key: 'karpovka', run: 6.5, kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => petroNatural(bank, s) === 1, rail: () => null, surf: () => 'grass' },
  // ---- Vasilievsky Island (vo-banks.js decides class and place; runs only where the strip behind the water edge is free): the Smolenka (earth / grass banks, photos V08 / V09 of docs/research/vo-roster-bridges.md), the Gulf shore
  // (a rubble / boulder revetment, the shore of the 2006-19 land fill, photo V22), Galerny Harbour (grass bank, photo V24), the Kovsh, the Dekabristov / Krestovsky shores of the Malaya Neva beyond the Smolenka source
  { id: 'smolenka-natural', key: 'smolenka', run: VO_RUN[1], kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 1, rail: () => null, surf: () => 'grass' },
  { id: 'gulf-rubble', key: 'neva', run: VO_RUN[2], kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 2, rail: () => null, surf: () => 'rubble' },
  { id: 'gavan-natural', key: 'gavan', run: VO_RUN[3], kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 3, rail: () => null, surf: () => 'grass' },
  { id: 'kovsh-natural', key: 'kovsh', run: VO_RUN[4], kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 4, rail: () => null, surf: () => 'grass' },
  { id: 'malaya-natural', key: 'neva', run: VO_RUN[5], kerb: 0.0, lip: 0.0, natural: true, test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 5, rail: () => null, surf: () => 'grass' },
  // (water-3 2026-10-09; request of landmarksSeaTerminal 5, photos d19 / y04 of docs/research/seaterminal.md) the sloping concrete revetment of the Gavan quay south of the submarine D-2: a planar slab slope (`plane`: a 1 m
  // vertical lip at the water, then a straight slab to street level), concrete panels, two blue steel stair flights (`stairs`: fractions of the run length), a chain on cast-iron posts along its top (`rail: 'chain'`)
  { id: 'd2-revetment', key: 'neva', run: VO_RUN[6], kerb: 0.0, lip: 0.0, natural: true, plane: true, stairs: [0.26, 0.74], test: (x, z, nx, nz, bank, s) => voSlopeClass(bank, s) === 6, rail: () => 'chain', surf: () => 'concrete' },
];
const inZoneGap = (key, x, z, m = 0.06) => {          // the slope stops flush with the deck edge (the abutment face), its cut face rests against it
  for (const zn of BRIDGE_ZONES) {
    if (zn.key !== key) continue;
    const a = zn.axis * Math.PI / 180, ux = Math.sin(a), uz = -Math.cos(a), px = x - zn.c[0], pz = z - zn.c[1], u = px * ux + pz * uz, v = -px * uz + pz * ux;
    if (Math.abs(u) <= zn.len / 2 + 14 && Math.abs(v) <= zn.w / 2 + m) return true;
  }
  if (key === 'neva' || key === 'kronverk-moat' || key === 'zhdanovka' || key === 'smolenka' || key === 'gavan' || key === 'kovsh') for (const zn of petroZones()) if (zn.test(x, z, m + 1.0)) return true;      // the decks of the Petrograd side / the island (any waterway)
  return false;
};
let _runs = null;
/** [{ reach, bank, s0, s1, pts (the bank polyline between s0 and s1 incl. the cut ends), fr: [{ x, z, mx, mz, k }] mitre frames of pts (offset point = x + mx * d * k) }] */
export function slopeRuns() {
  if (_runs) return _runs;
  _runs = [];
  for (const reach of SLOPE_REACHES) {
    for (const bank of banksOf(reach.key)) {
      const P = bank.pts, S = [0];
      for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
      const total = S[S.length - 1];
      let i = 0, cur = null;
      const flush = (s1) => { if (cur && s1 - cur > 3) _runs.push(makeRun(reach, bank, P, S, cur, s1)); cur = null; };
      for (let s = 0; s <= total + 1e-6; s += 0.5) {
        while (i + 2 < S.length && S[i + 1] < s) i++;
        const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(1, Math.max(0, (s - S[i]) / ((S[i + 1] - S[i]) || 1)));
        const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
        const ok = reach.test(x, z, nx, nz, bank, s) && !inZoneGap(reach.key, x, z);
        if (ok && cur === null) cur = Math.max(0, s - 0.25);
        else if (!ok && cur !== null) flush(s - 0.25);
      }
      flush(total);
    }
  }
  return _runs;
}
function makeRun(reach, bank, P, S, s0, s1) {
  const at = (s) => { let i = 0; while (i + 2 < S.length && S[i + 1] < s) i++; const t = Math.min(1, Math.max(0, (s - S[i]) / ((S[i + 1] - S[i]) || 1))); return [P[i][0] + (P[i + 1][0] - P[i][0]) * t, P[i][1] + (P[i + 1][1] - P[i][1]) * t]; };
  const pts = [at(s0)];
  for (let i = 0; i < P.length; i++) if (S[i] > s0 + 0.3 && S[i] < s1 - 0.3) pts.push([P[i][0], P[i][1]]);
  pts.push(at(s1));
  const seg = [];
  for (let i = 0; i + 1 < pts.length; i++) { const dx = pts[i + 1][0] - pts[i][0], dz = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dz) || 1e-6; seg.push({ tx: dx / l, tz: dz / l, nx: dz / l, nz: -dx / l }); }
  const fr = pts.map((p, i) => {                                   // the same mitre rule as quay.js frames(): landward normal (tz, -tx)
    const a = seg[Math.max(0, i - 1)], b = seg[Math.min(seg.length - 1, i)];
    let mx = a.nx + b.nx, mz = a.nz + b.nz; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    return { x: p[0], z: p[1], mx, mz, k: Math.min(2.2, 1 / Math.max(0.35, mx * b.nx + mz * b.nz)) };
  });
  return { reach, bank, s0, s1, pts, fr };
}
let _quads = null, _qgrid = null;
/** the ground cuts of the slopes: flat convex quads [[x,z] x4] (counter-clockwise not guaranteed: river.js orients them) from 0.1 m inside the water edge to run + 0.3 m landward */
export function slopeQuads() {
  if (_quads) return _quads;
  _quads = [];
  for (const r of slopeRuns()) {
    const d0 = -0.1, d1 = r.reach.run + 0.3;
    for (let i = 0; i + 1 < r.fr.length; i++) {
      const a = r.fr[i], b = r.fr[i + 1], q = [[a.x + a.mx * d0 * a.k, a.z + a.mz * d0 * a.k], [b.x + b.mx * d0 * b.k, b.z + b.mz * d0 * b.k], [b.x + b.mx * d1 * b.k, b.z + b.mz * d1 * b.k], [a.x + a.mx * d1 * a.k, a.z + a.mz * d1 * a.k]];
      _quads.push({ reach: r.reach.id, key: r.reach.key, q });
    }
  }
  return _quads;
}
/** true when (x, z) lies on a slope (the strip between the water edge and the slope top): not water (L.inRiver stays false), but nothing may stand or walk there */
export function slopeAt(x, z, grow = 0) {
  const quads = slopeQuads(); if (!quads.length) return false;
  if (!_qgrid) {
    _qgrid = new Map();
    quads.forEach((c, ci) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of c.q) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); } c.box = [x0, x1, z0, z1]; for (let i = Math.floor(x0 / 32); i <= Math.floor(x1 / 32); i++) for (let j = Math.floor(z0 / 32); j <= Math.floor(z1 / 32); j++) { const k = i * 8192 + j; let a = _qgrid.get(k); if (!a) _qgrid.set(k, (a = [])); a.push(ci); } });
  }
  const list = _qgrid.get(Math.floor(x / 32) * 8192 + Math.floor(z / 32)); if (!list) return false;
  for (const ci of list) {
    const c = quads[ci], b = c.box; if (x < b[0] - grow || x > b[1] + grow || z < b[2] - grow || z > b[3] + grow) continue;
    let pos = 0, neg = 0;
    for (let e = 0; e < 4; e++) { const p = c.q[e], q = c.q[(e + 1) % 4], cr = (q[0] - p[0]) * (z - p[1]) - (q[1] - p[1]) * (x - p[0]); if (cr > -grow) pos++; if (cr < grow) neg++; }
    if (pos === 4 || neg === 4) return true;
  }
  return false;
}
/** the slope strips as closed flat rings [x, z, x, z, ...] (water edge -> slope top + 0.3 m), one per run: other modules treat them like water polygons when they clip surfaces (streets/bld.js grid() stops the
 *  pavement strips 0.45 m before a river ring: add these rings to the RIVER rings there, so a pavement never floats over a slope) */
export function slopeRings() {
  return slopeRuns().map((r) => {
    const left = r.fr.map((q) => [q.x, q.z]), right = r.fr.map((q) => [q.x + q.mx * (r.reach.run + 0.3) * q.k, q.z + q.mz * (r.reach.run + 0.3) * q.k]).reverse();
    return [...left, ...right].flat();
  });
}

// ---------------------------------------------------------------- the New Holland island (OSM ring r1576204, bbox x -3648..-3234, z 136..489): landmarksNewHolland draws its outline (quays of the island side); the quays of the Admiralty /
// Kryukov canals and the Moika leave the island side free when that module is built. The island mask is a flood fill (2 m cells) inside the bbox from a seed in the park, walled by the water of the OUTER canals (the inner canals are no walls).
export const ISLAND_BOX = [-3660, -3225, 125, 500];
let _island = null;
function islandMask() {
  if (_island) return _island;
  const [x0, x1, z0, z1] = ISLAND_BOX, C = 2, W = Math.ceil((x1 - x0) / C), H = Math.ceil((z1 - z0) / C), wall = new Uint8Array(W * H), fill = new Uint8Array(W * H);
  const rings = dataRings().filter((r) => r.key === 'admiralty' || r.key === 'kryukov' || r.key === 'moika');
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const x = x0 + (i + 0.5) * C, z = z0 + (j + 0.5) * C; for (const r of rings) { const b = r.box; if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) continue; if (pointInFlat(x, z, r.o)) { wall[j * W + i] = 1; break; } } }
  const stack = []; for (const [sx, sz] of [[-3500, 400], [-3300, 230], [-3450, 300]]) { const i = Math.floor((sx - x0) / C), j = Math.floor((sz - z0) / C); if (!wall[j * W + i]) { stack.push(j * W + i); fill[j * W + i] = 1; break; } }
  while (stack.length) { const k = stack.pop(), i = k % W, j = (k - i) / W; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const q = b * W + a; if (wall[q] || fill[q]) continue; fill[q] = 1; stack.push(q); } }
  return (_island = { x0, z0, C, W, H, fill });
}
/** true when (x, z) lies on the New Holland island (between the Admiralty canal, the Kryukov canal and the Moika; the inner canals count as island) */
export function islandAt(x, z) {
  if (x < ISLAND_BOX[0] || x > ISLAND_BOX[1] || z < ISLAND_BOX[2] || z > ISLAND_BOX[3]) return false;
  const m = islandMask(), i = Math.floor((x - m.x0) / m.C), j = Math.floor((z - m.z0) / m.C);
  return i >= 0 && j >= 0 && i < m.W && j < m.H && m.fill[j * m.W + i] === 1;
}

// ---------------------------------------------------------------- THE PETROGRAD SIDE (P1..P5, V1, V2; docs/research/petro-water.md)
const PETRO_NAMES = new Set(RECT_NAMES.filter((n) => /^(P|V|K|YE|KA|AP|PE)\d+$/.test(n)));      /* YE / KA / AP / PE = Yelagin, Kamenny, Aptekarsky, Petrovsky (islands round 2) */ // all island districts share the established open-area bank/pavement rules
const _inR = (r, x, z, m = 0) => x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;
const PETRO_EXT = EXTENT_RECTS.filter((r, i) => PETRO_NAMES.has(RECT_NAMES[i])), OLD_EXT = EXTENT_RECTS.filter((r, i) => !PETRO_NAMES.has(RECT_NAMES[i]));
const OLD_PLAY = PLAY_RECTS.filter((r, i) => !PETRO_NAMES.has(RECT_NAMES[i]));
/** true in the part of the data that only the Petrograd side / Spit rectangles hold (never inside an older EXTENT rectangle: the older banks keep their reviewed look) */
export const petroAt = (x, z) => PETRO_EXT.some((r) => _inR(r, x, z)) && !OLD_EXT.some((r) => _inR(r, x, z));
const inOldPlay = (x, z, m = 0) => OLD_PLAY.some((r) => _inR(r, x, z, m));

// ---- Zayachy Island (the Peter and Paul Fortress): the land enclosed by the Neva and the Kronverksky strait. A flood fill (2 m cells) from the cathedral, walled by the water (scanline raster of the rings).
export const ZAYACHY_BOX = [-2440, -1520, -2300, -1660];
let _zay = null;
function zayachyMask() {
  if (_zay) return _zay;
  const [x0, x1, z0, z1] = ZAYACHY_BOX, C = 2, W = Math.ceil((x1 - x0) / C), H = Math.ceil((z1 - z0) / C), wall = new Uint8Array(W * H), fill = new Uint8Array(W * H);
  const rings = dataRings().filter((r) => r.key === 'neva' && !(r.box[1] < x0 || r.box[0] > x1 || r.box[3] < z0 || r.box[2] > z1));
  for (let j = 0; j < H; j++) {
    const z = z0 + (j + 0.5) * C;
    for (const r of rings) {
      if (z < r.box[2] || z > r.box[3]) continue;
      const o = r.o, xs = [];
      for (let a = 0, b = o.length - 2; a < o.length; b = a, a += 2) { const za = o[a + 1], zb = o[b + 1]; if ((za > z) !== (zb > z)) xs.push(o[a] + (z - za) * (o[b] - o[a]) / (zb - za)); }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) { const i0 = Math.max(0, Math.ceil((xs[k] - x0) / C - 0.5)), i1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / C - 0.5)); for (let i = i0; i <= i1; i++) wall[j * W + i] = 1; }
    }
  }
  const stack = []; { const i = Math.floor((-1949 - x0) / C), j = Math.floor((-1981 - z0) / C); stack.push(j * W + i); fill[j * W + i] = 1; }
  while (stack.length) { const k = stack.pop(), i = k % W, j = (k - i) / W; for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= W || b >= H) continue; const q = b * W + a; if (wall[q] || fill[q]) continue; fill[q] = 1; stack.push(q); } }
  return (_zay = { x0, z0, C, W, H, fill });
}
/** true when (x, z) lies on Zayachy Island */
export function zayachyAt(x, z) {
  if (x < ZAYACHY_BOX[0] || x > ZAYACHY_BOX[1] || z < ZAYACHY_BOX[2] || z > ZAYACHY_BOX[3]) return false;
  const m = zayachyMask(), i = Math.floor((x - m.x0) / m.C), j = Math.floor((z - m.z0) / m.C);
  return i >= 0 && j >= 0 && i < m.W && j < m.H && m.fill[j * m.W + i] === 1;
}

// ---- what stands behind a bank of the Petrograd side: the mapped OSM `embankment` slopes, buildings and carriageways (a natural slope needs free land behind the water edge)
const NAT_BOXES = [[-2600, -1380, -2720, -1600], [-5000, -3380, -3500, -1960],
  // the Karpovka: Aptekarsky Bridge -> 45 m short of the Petropavlovsky Bridge (Botanical Garden / hospital reach), and from the west end of the Ioannovsky convent (x -2870, sight-karpovka's request 2) to the
  // Molodyozhny Bridge; inside the boxes a mapped retaining wall within 9 m keeps the granite wall (petroNatural)
  [-2010, -1090, -4020, -3850], [-3800, -2870, -4260, -3900],
  [-8470, -5100, -5470, -3500],      // Krestovsky park shores use the same road/building-safe slope rule. (2026-10-14: to the west tip and the north-west corner of the island, K3 / K4: the Gulf coast gets natural banks as the Nevka shores do)
  // islands round 2 (2026-10-13): the park islands Yelagin / Kamenny and the Botanical Garden shore of Aptekarsky (north of the Karpovka banks: z1 -4245), Petrovsky + Serny south of the Krestovsky box
  [-5300, -900, -5800, -4245], [-6700, -3900, -3500, -2200]];
const ISL2_RINGS = Object.values(ISLANDS2_COAST);
const _inNat = (x, z, m = 0) => NAT_BOXES.some((B) => x >= B[0] - m && x <= B[1] + m && z >= B[2] - m && z <= B[3] + m);
let _nat = null;
function natIndex() {
  if (_nat) return _nat;
  const CELL = 32, key = (i, j) => i * 8192 + j, put = (map, x0, x1, z0, z1, v) => { for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = key(i, j); let a = map.get(k); if (!a) map.set(k, (a = [])); a.push(v); } };
  const emb = new Map(), ret = new Map(), bld = new Map(), road = new Map();
  for (const e of EMBANKMENTS) { const p = e.pts, map = e.kind === 'embankment' ? emb : ret; for (let i = 0; i + 3 < p.length; i += 2) { if (!_inNat(p[i], p[i + 1], 40)) continue; put(map, Math.min(p[i], p[i + 2]) - 12, Math.max(p[i], p[i + 2]) + 12, Math.min(p[i + 1], p[i + 3]) - 12, Math.max(p[i + 1], p[i + 3]) + 12, [p[i], p[i + 1], p[i + 2], p[i + 3]]); } }
  for (const b of BUILDINGS) { if (b.skip || !b.polys) continue; for (const p of b.polys) { const bb = boxOf(p.o); if (!NAT_BOXES.some((B) => !(bb[1] < B[0] || bb[0] > B[1] || bb[3] < B[2] || bb[2] > B[3]))) continue; put(bld, bb[0] - 2, bb[1] + 2, bb[2] - 2, bb[3] + 2, { o: p.o, box: bb }); } }
  const DRIVE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street', 'service', 'road']);
  for (const r of ROADS) { if (!DRIVE.has(r.hw) || r.tunnel) continue; const p = r.pts, hw = (r.w || 6) / 2 + 1.2; for (let i = 0; i + 3 < p.length; i += 2) { if (!_inNat(p[i], p[i + 1], 40)) continue; put(road, Math.min(p[i], p[i + 2]) - hw, Math.max(p[i], p[i + 2]) + hw, Math.min(p[i + 1], p[i + 3]) - hw, Math.max(p[i + 1], p[i + 3]) + hw, [p[i], p[i + 1], p[i + 2], p[i + 3], hw]); } }
  const at = (map, x, z) => map.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  return (_nat = {
    embDist: (x, z) => { let d = 1e4; for (const s of at(emb, x, z)) d = Math.min(d, segDist(x, z, s[0], s[1], s[2], s[3])); return d; },
    retDist: (x, z) => { let d = 1e4; for (const s of at(ret, x, z)) d = Math.min(d, segDist(x, z, s[0], s[1], s[2], s[3])); return d; },
    built: (x, z) => { for (const b of at(bld, x, z)) { const bb = b.box; if (x < bb[0] - 1 || x > bb[1] + 1 || z < bb[2] - 1 || z > bb[3] + 1) continue; if (pointInFlat(x, z, b.o)) return true; const o = b.o; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (segDist(x, z, o[j], o[j + 1], o[i], o[i + 1]) < 1.0) return true; } return false; },
    onRoad: (x, z) => { for (const s of at(road, x, z)) if (segDist(x, z, s[0], s[1], s[2], s[3]) < s[4]) return true; return false; },
  });
}
// ---- the cobble wings of the Yelagin west spit: the two OSM embankment lines (the slope tops); a bank point whose landward neighbour 4.2 m away lies within 2.6 m of one is a wing point (SLOPE_REACHES 'spit-wings')
const WING_BOX = [-6432, -6288, -5412, -5268];
let _wings = null;
export function onSpitWing(x, z) {
  if (x < WING_BOX[0] || x > WING_BOX[1] || z < WING_BOX[2] || z > WING_BOX[3]) return false;
  if (!_wings) { _wings = []; for (const e of EMBANKMENTS) if (e.id === 'w1217811700' || e.id === 'w1217811701') for (let i = 0; i + 3 < e.pts.length; i += 2) _wings.push([e.pts[i], e.pts[i + 1], e.pts[i + 2], e.pts[i + 3]]); }
  for (const w of _wings) if (segDist(x, z, w[0], w[1], w[2], w[3]) < 2.6) return true;
  return false;
}
// ---- the Petrovsky Island sights (islands round 2): where the shore classes of petroNatural differ from the plain grass slope
const PET_COAST = ISLANDS2_COAST.petrovsky, CLUB_BOX = [-6520, -5740, -3790, -3320];
const ARC_CL = [[-6350, -3478], [-6395, -3503], [-6435, -3527], [-6465, -3545], [-6485, -3575], [-6494, -3610], [-6494, -3645], [-6486, -3680], [-6460, -3712], [-6430, -3733], [-6405, -3743]];      // the middle line of the arc breakwater (the band between ring vertices 79..101 and 127..148 of the Petrovsky coast)
const inBox = (x, z, B) => x >= B[0] && x <= B[1] && z >= B[2] && z <= B[3];
/** a bank point of the River Yacht Club shore (its land lies inside the Petrovsky Island ring) */
export function clubShoreAt(x, z, nx, nz) { return inBox(x, z, CLUB_BOX) && pointInFlat(x + nx * 4, z + nz * 4, PET_COAST); }
/** a bank point of the arc breakwater of the club (the landward neighbour lies on the breakwater band) */
export function breakwaterAt(x, z, nx, nz) {
  if (!inBox(x, z, CLUB_BOX)) return false;
  const px = x + nx * 3, pz = z + nz * 3; let d = 1e9;
  for (let i = 0; i + 1 < ARC_CL.length; i++) d = Math.min(d, segDist(px, pz, ARC_CL[i][0], ARC_CL[i][1], ARC_CL[i + 1][0], ARC_CL[i + 1][1]));
  return d < 10.5;
}
const STAD_SLAB_BOX = [-3765, -3640, -2425, -2335];      // the boiler-house reach, north-west of the Zhdanovsky Bridge (left bank, OSM w44425138)
const STAD_RAIL_BOX = [-3660, -3500, -2335, -2020];      // the promontory of the stadium island: the granite-faced quay with the light grey cast railing
/** a bank point of the boiler-house reach of the stadium island (landward side = the island) */
export function stadiumSlabAt(x, z, nx, nz) { return inBox(x, z, STAD_SLAB_BOX) && pointInFlat(x + nx * 4, z + nz * 4, PET_COAST); }
/** a bank point of the stadium promontory (the light grey cast railing stands 0.26 m behind the water edge) */
export function stadiumRailAt(x, z, nx, nz) { return inBox(x, z, STAD_RAIL_BOX) && pointInFlat(x + nx * 4, z + nz * 4, PET_COAST); }
/** the surface of a natural bank: 'sand' = the fortress beach (the island's Neva side east of the Trubetskoy bastion and its east tip), 'cobble' = the stone-pitched slopes of the island (west tip, strait side), 'grass' elsewhere */
export function petroSurf(x, z, nx, nz) {
  if (!zayachyAt(x + nx * 4, z + nz * 4) && !zayachyAt(x + nx * 9, z + nz * 9)) return 'grass';
  return nz < 0.3 && x > -2255 ? 'sand' : 'cobble';
}
/** natural-bank class along a bank chain: 0 = the waterway's granite wall, 1 = a natural slope. Sampled every metre: a point is natural when it lies in the Petrograd-only data, on Zayachy Island / at a mapped OSM
 *  `embankment` slope / on the Kronverk moat, and the strip behind it (run + 1 m) is free of buildings, carriageways and other water; stretches shorter than 14 m fall back to the wall, the ends are pulled in by 3 m. */
const _natCache = new WeakMap();
export function petroNatural(bank, s) {
  let c = _natCache.get(bank);
  if (!c) {
    const P = bank.pts, S = [0]; for (let i = 1; i < P.length; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const total = S[S.length - 1], n = Math.ceil(total) + 1, cls = new Uint8Array(n);
    let any = false; for (const p of P) if (_inNat(p[0], p[1])) { any = true; break; }
    if (any && (bank.key === 'neva' || bank.key === 'kronverk-moat' || bank.key === 'zhdanovka' || bank.key === 'karpovka')) {
      const N = natIndex(), run = bank.key === 'neva' ? 7.0 : bank.key === 'zhdanovka' ? 6.0 : bank.key === 'karpovka' ? 6.5 : 5.5;
      let i = 0;
      for (let k = 0; k < n; k++) {
        const sv = Math.min(total, k); while (i + 2 < S.length && S[i + 1] < sv) i++;
        const a = P[i], b = P[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, t = Math.min(1, Math.max(0, (sv - S[i]) / ((S[i + 1] - S[i]) || 1)));
        const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, nx = (b[1] - a[1]) / l, nz = -(b[0] - a[0]) / l;
        // Only the park side of the exact Krestovsky ring may gain a natural
        // bank. Mapped retaining walls and busy/occupied strips keep a quay.
        const krest = bank.key === 'neva' && ((x < -5100 && pointInFlat(x+nx*4,z+nz*4,KRESTOVSKY_ISLAND)) || ISL2_RINGS.some((r) => pointInFlat(x + nx * 4, z + nz * 4, r)));      // islands round 2: Yelagin, Kamenny, Aptekarsky, Petrovsky, Serny take the same rule
        if (!_inNat(x, z) || (!petroAt(x, z) && !krest)) continue;
        if (krest && onSpitWing(x + nx * 4.2, z + nz * 4.2)) continue;      // the cobble wings of the Yelagin spit are their own reach (SLOPE_REACHES 'spit-wings')
        const kind = krest ? N.retDist(x,z)>9 : bank.key === 'zhdanovka' || bank.key === 'karpovka' ? N.retDist(x, z) > 9 : bank.key === 'kronverk-moat' || zayachyAt(x + nx * 4, z + nz * 4) || zayachyAt(x + nx * 9, z + nz * 9) || N.embDist(x, z) < 11;
        if (!kind) continue;
        let free = true;
        for (const d of [1.2, run * 0.5, run + 1.0]) { const px = x + nx * d, pz = z + nz * d; if (N.built(px, pz) || N.onRoad(px, pz) || waterwayAt(px, pz)) { free = false; break; } }
        if (free) cls[k] = krest ? (breakwaterAt(x, z, nx, nz) ? 3 : clubShoreAt(x, z, nx, nz) ? 2 : 1) : bank.key === 'zhdanovka' && stadiumSlabAt(x, z, nx, nz) ? 4 : 1;
      }
      // pull the ends in by 3 m (the slope keeps clear of the obstacle that ended it), then drop short stretches
      const er = new Uint8Array(n); for (let k = 0; k < n; k++) { if (!cls[k]) continue; let ok = true; for (let d = -3; d <= 3 && ok; d++) { const q = bank.closed ? ((k + d) % n + n) % n : k + d; if (q >= 0 && q < n && !cls[q]) ok = false; } er[k] = ok ? cls[k] : 0; }
      for (let k = 0; k < n;) { if (!er[k]) { k++; continue; } let e = k; while (e < n && er[e]) e++; if (e - k < 14) for (let q = k; q < e; q++) er[q] = 0; k = e; }
      c = { cls: er, n };
    } else c = { cls, n };
    _natCache.set(bank, c);
  }
  const k = Math.round(s); return k >= 0 && k < c.n ? c.cls[k] : 0;
}

// ---- the bridges of the Petrograd side: where a deck lands, the quay leaves its wall / parapet / collider open and a natural slope stops (the bridges module, landmarksFortress (Ioannovsky, Kronverksky) and
// landmarksKronverk (Artillery bridges) draw the decks, abutments and their own colliders). Two kinds of zone, both for any waterway (key '*'):
//   * the mapped DECK POLYGON of a bridge (BRIDGES kind 'deck': Birzhevoy r4074054, Tuchkov r4074067, Sampsonievsky w117802281, Ioannovsky r5555259, Kronverksky r5555211, the Artillery bridges, the Zhdanovka
//     bridges ...): a point within 2 m of the polygon,
//   * a bridge road without a deck polygon (the Trinity Bridge: carriageways + the two long footways): a point within half its width + 3 m of the polyline (the rule of the east branch's quay).
// Short footway / steps "bridges" (gangways of the landing stages, 4-30 m) open nothing. A zone never reaches into an older PLAY rectangle (+30 m): the south landings of the Trinity and Palace bridges keep their
// reviewed BRIDGE_ZONES rows. river.js bridgeZones() appends these zones (auto: no fallback deck; petro: the quay splits its pieces exactly at the zone border).
let _pz = null;
export function petroZones() {
  if (_pz) return _pz;
  const out = [], decks = [];
  const inPetroPlay = (x, z) => PETRO_EXT.some((r) => _inR(r, x, z)) && !inOldPlay(x, z, 30);
  for (const b of BRIDGES) {
    if (b.kind !== 'deck' || !b.polys || !b.polys.length || PETRO_NO_ZONE.has(b.id)) continue;
    for (const p of b.polys) {
      const o = p.o, bb = boxOf(o), n = o.length / 2;
      let any = false; for (let i = 0; i < n; i++) if (inPetroPlay(o[i * 2], o[i * 2 + 1])) { any = true; break; }
      if (!any) continue;
      const g0 = o.some((v, k) => k % 2 === 0 && inVO(v, o[k + 1])) ? 1.0 : 2;      // Vasilievsky Island: the quay opens 1 m round the deck polygon (the Petrograd side 2 m): the invisible fallback deck of quay.js covers 2 m, so no slit of open shore stays beside it
      const test = (x, z, grow = 0) => {
        const g = g0 + grow; if (x < bb[0] - g || x > bb[1] + g || z < bb[2] - g || z > bb[3] + g || inOldPlay(x, z, 30)) return false;
        if (pointInFlat(x, z, o)) return true;
        for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if (segDist(x, z, o[j], o[j + 1], o[i], o[i + 1]) < g) return true;
        return false;
      };
      const ids = [b.id]; decks.push({ o, bb, ids });
      out.push({ id: 'pz-' + b.id, ids, name: b.name || b.id, key: '*', c: [(bb[0] + bb[1]) / 2, (bb[2] + bb[3]) / 2], axis: 0, w: Math.hypot(bb[1] - bb[0], bb[3] - bb[2]) + 4, len: 0, own: true, foot: false, auto: true, petro: true, deck: o, test });
    }
  }
  const FOOT = new Set(['footway', 'steps', 'path', 'cycleway', 'pedestrian']);
  for (const r of ROADS) {
    if (!r.bridge || r.tunnel || r.pts.length < 4 || PETRO_NO_ZONE.has(r.id)) continue;
    // (review-water 2026-10-07) a MOTORWAY / trunk viaduct is no walking route and nobody draws one yet (the four WHSD ways on the Gulf shore at (-7800, 420 .. 1020) were line zones with a 20 m wide walk deck
    // along 600 m of open sea and an opening in the shore wall): it opens nothing, the shore stays closed; the bridges owner claims its deck when the WHSD is drawn
    if (/^(motorway|trunk)/.test(r.hw)) continue;
    const pts = r.pts, n = pts.length / 2;
    let any = false, len = 0, bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9;
    for (let i = 0; i < n; i++) { const x = pts[i * 2], z = pts[i * 2 + 1]; if (inPetroPlay(x, z)) any = true; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); bz0 = Math.min(bz0, z); bz1 = Math.max(bz1, z); if (i) len += Math.hypot(x - pts[i * 2 - 2], z - pts[i * 2 - 1]); }
    if (!any) continue;
    const mx = (pts[0] + pts[n * 2 - 2]) / 2, mz = (pts[1] + pts[n * 2 - 1]) / 2;
    const dk = decks.find((d) => mx >= d.bb[0] - 3 && mx <= d.bb[1] + 3 && mz >= d.bb[2] - 3 && mz <= d.bb[3] + 3 && (pointInFlat(mx, mz, d.o) || pointInFlat(pts[0], pts[1], d.o) || pointInFlat(pts[n * 2 - 2], pts[n * 2 - 1], d.o)));
    if (dk) { dk.ids.push(r.id); continue; }                         // its deck polygon rules (ids: every OSM id of the bridge, for the owner test of the quay's fallback deck)
    if (FOOT.has(r.hw) && len < 40) continue;
    const hw = (r.w || 4) / 2 + 3;
    const test = (x, z, grow = 0) => {
      const g = hw + grow; if (x < bx0 - g || x > bx1 + g || z < bz0 - g || z > bz1 + g || inOldPlay(x, z, 30)) return false;
      for (let i = 0; i + 3 < pts.length; i += 2) if (segDist(x, z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) < g) return true;
      return false;
    };
    out.push({ id: 'pz-' + r.id, ids: [r.id], name: r.name || r.id, key: '*', c: [(bx0 + bx1) / 2, (bz0 + bz1) / 2], axis: 0, w: Math.hypot(bx1 - bx0, bz1 - bz0) + 2 * hw, len: 0, own: true, foot: false, auto: true, petro: true, line: pts, hw, test });
  }
  return (_pz = out);
}

// vo-banks.js asks "is there water here" when it tests the strip behind a natural bank (a second water body, e.g. the other arm of the mouth, ends the slope)
setWaterTest((x, z) => !!waterwayAt(x, z));
void sightBanks; void VO_DESCENTS;
