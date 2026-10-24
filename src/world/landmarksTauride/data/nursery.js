// landmarksTauride/data/nursery.js - THE GARDEN NURSERY OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T8b, a user fix): the lot north-west of the garden between Potemkinskaya street (west), Shpalernaya (north) and the garden's
// fence (east) where the historic nursery stood with its glasshouses. PURE DATA + PURE FUNCTIONS (no import: hooks/ground.js and hooks/keep-out.js of the North read this file without the data facade or three.js).
// SOURCES: the lot ring is MEASURED from the North data (OSM, ODbL): the garden outline vertices 56 .. 60 (its west edge, x ~ 1112.5, shared EXACTLY so that the two floors meet without a gap or an overlap), the wall w1457964050
// (south), the fences w259579861 / w418967229 / w418967230 (west), w1164451899 / w1164451900 (north-west), the footway w112880646 and the long building w30324513 (north). THE GREENHOUSES are DESIGN values read from the user's
// air photo (D:/git2/n4spb-work/tauride/user/user-lot-real-airphoto.png, taken from the east looking west: the long glasshouses run EAST-WEST, in two groups of three with one wide house between them and two houses across the
// east end on each side of a concrete box) and placed on the two lawns that the Yandex satellite shows where they stood (x 997 .. 1078, z -1772 .. -1620). The photo is the reference; the satellite only shows the lawns that came after.
// Local frame: +x east, +z SOUTH (north is -z), metres, as every North datum.

/** the lot: a simple ring [x, z, ...]; the edge x ~ 1112.5 is the garden outline (vertices 56 .. 60 of data/footprints.js GARDEN), which the garden's own floor ends on */
export const LOT_RING = [
  938.4, -1819.1, 940.6, -1821.0, 943.1, -1822.4, 945.8, -1822.9, 950.9, -1823.0, 955.4, -1822.7, 969.3, -1822.4,          // the north-west fence w1164451899 / w1164451900
  969.6, -1797.5, 1104.3, -1797.5, 1104.3, -1788.6, 1113.4, -1788.1,                                                         // the north edge: the footway w112880646 (z -1797 .. -1799) is outside, the long building's north face is inside
  1112.2, -1737.8, 1112.8, -1618.5, 1101.2, -1600.0, 1080.6, -1600.6,                                                        // the garden outline (GARDEN vertices 60 .. 56 in the other direction): the east edge
  982.4, -1604.2, 982.0, -1595.5, 931.7, -1597.0,                                                                            // the wall w1457964050 (south)
  934.6, -1649.2, 936.3, -1692.9, 938.6, -1741.2, 938.9, -1751.9,                                                            // the west fences w418967229 / w418967230
];

/** the fenced yard of the classical buildings at the west end (the fence w418967234): lighter gravel, a worn court */
export const YARD_RING = [938.6, -1741.2, 994.6, -1739.4, 993.5, -1706.2, 1005.0, -1705.8, 1004.0, -1677.7, 990.0, -1678.2, 989.0, -1648.3, 934.6, -1649.2];

/** the buildings of the lot that the module REPLACES (they are claimed in groups.js `tauride-nursery`): OSM tags give no height (h / levels null), the generic city draws every one of them as a 4-storey yellow block with a
 *  red or grey roof; the air photo shows two low flat-roofed concrete boxes (w1457964048 / w1457964049) and one long low building with a grey roof (w30324513, OSM kind=greenhouse, 121 x 15 m). Rings from the data. */
export const SHEDS = [
  { id: 'w1457964048', kind: 'box', o: [1103.2, -1699.6, 1102.7, -1682.4, 1084.6, -1682.9, 1085.1, -1700.1], h: 4.4, wall: '#c3beb0', roof: '#8d877a', roofD: '#6d685e', note: 'the box between the two cross glasshouses: a flat grey-brown roof with debris' },
  { id: 'w1457964049', kind: 'box', o: [1100.8, -1617.1, 1100.3, -1601.2, 1082.1, -1601.7, 1082.5, -1617.6], h: 4.8, wall: '#bdb7a8', roof: '#5f5b54', roofD: '#47443f', note: 'the box at the south-east corner: a dark flat roof, a lift-shaft stub on it' },
  // FIX ROUND 1 (the yard at the west end, the photo's left part): the three buildings along the yard's south side. OSM gives no height; the generic city drew each as a 4-storey yellow block. The grey flat box of the photo = the office w30324512
  // (37 x 12 m, one storey, a flat dark-grey roof), the brown-roofed barn = the garage w239884014 (10 x 24 m, a low gable roof of brown tiles), the little yellow cube between the blocks = w259579860 (7 x 6 m, a utility box).
  { id: 'w30324512', kind: 'box', o: [983.6, -1608.8, 946.5, -1608.8, 946.5, -1620.6, 983.6, -1620.6], h: 5.0, wall: '#b3b3ac', roof: '#6b6f72', roofD: '#55595c', note: 'the grey flat box of the photo: one storey, a flat dark-grey roof' },
  { id: 'w239884014', kind: 'long', noWin: true, o: [946.5, -1644.1, 956.5, -1644, 956.4, -1620.8, 946.5, -1620.8], h: 3.4, ridge: 2.0, wall: '#b9a98f', roof: '#8a5a40', roofD: '#704633', band: '#5f666c', note: 'the brown-roofed barn of the photo: a low gable of brown tiles' },
  { id: 'w259579860', kind: 'box', noWin: true, o: [985.2, -1639.7, 984.9, -1633.1, 977.7, -1633.4, 977.9, -1640], h: 3.0, wall: '#bdb8a8', roof: '#77797a', roofD: '#5c5e5f', note: 'the utility box between the yard buildings' },
  { id: 'w30324513', kind: 'long', o: [1104, -1778.8, 986.1, -1781.9, 986.2, -1786.6, 982.9, -1786.6, 982.8, -1796.5, 1104.3, -1793], h: 5.4, ridge: 2.1, wall: '#d6d2c4', roof: '#a9aeb1', roofD: '#8e9498', band: '#5f666c', note: 'the long annex along the north edge: plain walls, a low grey roof' },
];

/** FIX ROUND 1: the classical buildings of the fenced yard (the photo: low two-storey blocks with blue-green hipped roofs round a courtyard; the generic city drew them as 4-storey yellow blocks). Each is the REAL OSM ring (walls, windows)
 *  with a hipped roof built from `wings` (axis-aligned rectangles [x0, x1, z0, z1] that tile the ring; a wing's roof runs to the centre line of the wing it joins: the roofs meet in valleys). h = the eave height, slope = rise / run of a roof,
 *  `slopes` overrides it per wing (the porch and the bay are low). Colliders: one box per wing. */
export const YARD_HOUSES = [
  { id: 'w23002928', name: 'north U-block', h: 7.4, slope: 0.46, wall: '#d4d1c1', wallD: '#a8a495', roof: '#7ea39b', roofD: '#678780', win: '#53697c',
    ring: [946, -1713.5, 946.3, -1731.1, 988.8, -1730.3, 988.5, -1712.4, 979.9, -1712.6, 980, -1721.1, 954.2, -1721.7, 954, -1713.4],
    wings: [[946.2, 988.7, -1731.1, -1721.4], [946, 954.1, -1726.2, -1713.4], [980, 988.6, -1726.2, -1712.4]] },
  { id: 'w23002936', name: 'south U-block', h: 7.4, slope: 0.46, wall: '#d6d3c3', wallD: '#aaa697', roof: '#7ba099', roofD: '#648580', win: '#53697c',
    ring: [943.7, -1656, 943.9, -1673.2, 951.4, -1673.1, 951.3, -1663.3, 977.3, -1663, 977.5, -1672.4, 986.2, -1672.2, 986, -1655.4],
    wings: [[943.7, 986.1, -1663.2, -1655.7], [943.8, 951.4, -1673.1, -1659.4], [977.4, 986.2, -1672.3, -1659.4]] },
  { id: 'w23002941', name: 'the pavilion', h: 6.6, slope: 0.4, wall: '#dedacb', wallD: '#b1ad9f', roof: '#8dada5', roofD: '#718f88', win: '#53697c',
    ring: [971, -1682.9, 971.1, -1687.2, 968.2, -1687.2, 968.4, -1697.8, 971.1, -1697.7, 971.2, -1704.3, 986.9, -1704.1, 986.8, -1697.1, 989.8, -1695.7, 991.1, -1693, 990.6, -1690, 988.6, -1688.5, 986.5, -1687.9, 986.4, -1682.6],
    wings: [[971.1, 986.8, -1704.3, -1682.7], [968.2, 971.2, -1697.8, -1687.2], [986.4, 991.1, -1697.1, -1687.9]], slopes: [0.4, 0.2, 0.3] },
];

/** the glasshouses (DESIGN, from the air photo): c = centre [x, z], len along the long axis, wid across, axis 'x' (east-west) or 'z' (north-south), pIntact = the share of panes that still exist, seed = hash seed.
 *  Seven long houses (3 + 1 + 3, along x) and two cross houses (along z) on each side of the concrete box w1457964048. Gaps: 8 m inside a group (a row of young trees stands in each), 16 / 9 m between the groups (the cross tracks). */
export const HOUSES = [
  { id: 'gh-S1', c: [1040.5, -1623], len: 55, wid: 10, axis: 'x', pIntact: 0.22, seed: 11 },
  { id: 'gh-S2', c: [1040.5, -1639.5], len: 55, wid: 10, axis: 'x', pIntact: 0.27, seed: 12 },
  { id: 'gh-S3', c: [1038.0, -1656], len: 50, wid: 10, axis: 'x', pIntact: 0.20, seed: 13 },
  { id: 'gh-M', c: [1040.0, -1683], len: 54, wid: 12, axis: 'x', pIntact: 0.30, seed: 14 },
  { id: 'gh-N1', c: [1036.0, -1703], len: 46, wid: 10, axis: 'x', pIntact: 0.26, seed: 15 },
  { id: 'gh-N2', c: [1040.0, -1719.5], len: 54, wid: 10, axis: 'x', pIntact: 0.24, seed: 16 },
  { id: 'gh-N3', c: [1040.5, -1736], len: 55, wid: 10, axis: 'x', pIntact: 0.28, seed: 17 },
  { id: 'gh-C1', c: [1092.0, -1650], len: 54, wid: 10, axis: 'z', pIntact: 0.25, seed: 18 },
  { id: 'gh-C2', c: [1092.0, -1735], len: 60, wid: 10, axis: 'z', pIntact: 0.25, seed: 19 },
];

/** how a glasshouse is built (DESIGN: a steel-rib frame, a shallow gable, a low concrete plinth; the panes are 1 m wide) */
export const HOUSE = Object.freeze({
  plinth: 0.45, plinthT: 0.3, eave: 2.5, ridge: 4.2, bay: 2.0, pane: 1.0, rowsWall: 2, rowsRoof: 5,
  post: 0.11, rafter: 0.13, bar: 0.1, pane_inset: 0.06, layer: [0, 0.018, 0.036],
  frame: '#aab6c2', frameD: '#7c8793', plinthC: '#9a958a', plinthTop: '#b1ada3', glass: ['#bcd3e0', '#b2cbda', '#c8dae5'], glassOpacity: 0.42,
  collider: { y0: -0.5, y1: 4.6 },
  /** the share of the panes that exist over the whole nursery: the user's photo shows most panes missing, a few intact */
  intactTarget: 0.25, intactTol: 0.04,
});

/** the gravel tracks (half widths in `w`, polylines [x, z, ...]): the main track along the east side (the garden fence), the cross tracks between the groups, the track along the west end of the houses */
export const TRACKS = [
  { id: 'east-main', w: 4.2, pts: [1107.5, -1787, 1107.5, -1620.3] },
  { id: 'east-x1', w: 3.0, pts: [1079.0, -1620.3, 1107.5, -1620.3] },          // between the south box and the south cross house
  { id: 'east-x2', w: 3.0, pts: [1079.0, -1679.8, 1107.5, -1679.8] },          // between the south cross house and the middle box
  { id: 'east-x3', w: 2.8, pts: [1079.0, -1702.5, 1107.5, -1702.5] },          // between the middle box and the north cross house
  { id: 'west-ns', w: 3.6, pts: [1009.0, -1776.0, 1009.0, -1608] },
  { id: 'mid-ns', w: 3.4, pts: [1077.5, -1760, 1077.5, -1608] },
  { id: 'cross-s', w: 3.4, pts: [1009.0, -1612.5, 1079.0, -1612.5] },
  { id: 'cross-sm', w: 4.4, pts: [1009.0, -1669.0, 1079.0, -1669.0] },
  { id: 'cross-mn', w: 3.6, pts: [1009.0, -1693.5, 1079.0, -1693.5] },
  { id: 'cross-n', w: 3.4, pts: [1009.0, -1746.5, 1079.0, -1746.5] },
  { id: 'north-walk', w: 3.0, pts: [1009.0, -1775.0, 1107.5, -1775.0] },
  { id: 'yard-link', w: 3.0, pts: [996.0, -1693.5, 1009.0, -1693.5] },
];

/** the rows of trees (bare, 6 .. 11 m, a dense grey-brown crown: the photo shows big leafless trees filling the gaps between the houses, standing INSIDE the houses and ringing the lot): along a row `from` -> `to` every `step` m,
 *  jittered by the hash; `h: [lo, hi]` overrides the heights of a row, `inside: <house id>` lets a row stand in that house (the other houses, the buildings, the tracks stay clear). */
export const TREE_ROWS = [
  { id: 'gap-S12', from: [1014, -1631.25], to: [1068, -1631.25], step: 3.7 },
  { id: 'gap-S23', from: [1014, -1647.75], to: [1066, -1647.75], step: 3.7 },
  { id: 'gap-N12', from: [1014, -1711.25], to: [1062, -1711.25], step: 3.7 },
  { id: 'gap-N23', from: [1014, -1727.75], to: [1068, -1727.75], step: 3.7 },
  { id: 'edge-mid-w', from: [1073.5, -1752], to: [1073.5, -1616], step: 4.6 },
  { id: 'edge-mid-e', from: [1081.5, -1752], to: [1081.5, -1616], step: 4.6 },
  { id: 'edge-north', from: [1015, -1754], to: [1075, -1754], step: 4.0 },
  { id: 'orchard', from: [1015, -1763], to: [1075, -1763], step: 4.2 },
  { id: 'edge-south', from: [1016, -1607.5], to: [1074, -1607.5], step: 5.2 },
  // in the houses: along the axis, a little off it, lower than the outside trees (the crowns stand out of the lattice roof)
  { id: 'in-S1', inside: 'gh-S1', from: [1017, -1623.2], to: [1064, -1623.2], step: 5.4, h: [5.2, 8.6] },
  { id: 'in-S2', inside: 'gh-S2', from: [1017, -1639.8], to: [1064, -1639.8], step: 5.6, h: [5.2, 8.6] },
  { id: 'in-S3', inside: 'gh-S3', from: [1016, -1656.2], to: [1060, -1656.2], step: 5.4, h: [5.2, 8.6] },
  { id: 'in-N1', inside: 'gh-N1', from: [1016, -1703.2], to: [1055, -1703.2], step: 5.6, h: [5.2, 8.6] },
  { id: 'in-N2', inside: 'gh-N2', from: [1015, -1719.6], to: [1063, -1719.6], step: 5.4, h: [5.2, 8.6] },
  { id: 'in-N3', inside: 'gh-N3', from: [1015, -1736.2], to: [1066, -1736.2], step: 5.6, h: [5.2, 8.6] },
  { id: 'in-C1', inside: 'gh-C1', from: [1092.2, -1675.5], to: [1092.2, -1625], step: 6.4, h: [5.2, 8.6] },
  { id: 'in-C2', inside: 'gh-C2', from: [1092.2, -1762], to: [1092.2, -1707], step: 6.4, h: [5.2, 8.6] },
];
/** FIX ROUND 2: the rows are only a loose guide (the photo's trees stand in irregular clumps): jitter = the scatter along and across a row (m), skip = the share of row places left empty (a hash), pair = the share of places that get a
 *  second tree 1.7 .. 2.8 m away (a clump), h0 .. h1 = the heights (m, the crown starts low: the trunk is ~2.4 m of 8), wide = the width factor of a crown */
export const TREE = Object.freeze({ h0: 6.2, h1: 11.2, crown: 2.6, trunk: 0.14, jitter: 3.0, skip: 0.16, pair: 0.22, pairMin: 1.7, pairMax: 2.8, max: 260, wide: [0.78, 1.3] });

/** a pile of earth, a stack of crates (cheap details of the photo) */
export const PILES = [
  { id: 'earth-1', x: 1081.5, z: -1626, r: 3.4, h: 1.2, col: '#b09a72' },
  { id: 'earth-2', x: 1019.0, z: -1614.5, r: 2.4, h: 0.9, col: '#6d5a42' },
];
export const CRATES = [
  { id: 'crates-1', x: 1011.0, z: -1676.0, rot: 0.2, n: 6 },
  { id: 'crates-2', x: 1084.0, z: -1759.0, rot: -0.35, n: 5 },
];

/** the look of the lot's floor: colours (sRGB hex; the shader converts) */
export const FLOOR_COLORS = Object.freeze({
  uE1: '#6c5740', uE2: '#7e6849', uE3: '#574530', uSand: '#a8926f', uTrackA: '#b89f7c', uTrackB: '#a68d6c', uYardA: '#9b8f7b', uYardB: '#887d6b',
  uDry: '#766b40', uDryB: '#887b52', uSoilA: '#43372b', uSoilB: '#544433', uWeed: '#4f5b2f', uMean: '#75624a',
});

/** the floor sits this much above y = 0 (the garden floor is lifted by the same 5 mm: TERRAIN.lift) */
export const FLOOR_LIFT = 0.005;

// ---------------------------------------------------------------------------------------------------------------- pure helpers (the hooks read inNursery)
function ringHas(o, x, z) { let c = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) if ((o[i + 1] > z) !== (o[j + 1] > z) && x < (o[j] - o[i]) * (z - o[i + 1]) / (o[j + 1] - o[i + 1]) + o[i]) c = !c; return c; }
const BOX = (() => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (let i = 0; i < LOT_RING.length; i += 2) { x0 = Math.min(x0, LOT_RING[i]); x1 = Math.max(x1, LOT_RING[i]); z0 = Math.min(z0, LOT_RING[i + 1]); z1 = Math.max(z1, LOT_RING[i + 1]); } return [x0, x1, z0, z1]; })();
/** the bounding box of the lot [x0, x1, z0, z1] */
export const LOT_BOX = Object.freeze(BOX);
/** true inside the lot (box first, then the ring); the hooks of the North use it for trees, tufts and props */
export function inNursery(x, z) { return x >= BOX[0] && x <= BOX[1] && z >= BOX[2] && z <= BOX[3] && ringHas(LOT_RING, x, z); }
/** the ids the module claims (groups.js `tauride-nursery`) */
export const CLAIMED_IDS = Object.freeze([...SHEDS.map((s) => s.id), ...YARD_HOUSES.map((y) => y.id)]);
