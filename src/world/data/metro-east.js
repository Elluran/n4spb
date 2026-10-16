// Static metro tables of the EAST stations (docs/research/metro-east.md; frames section 2, owner requests section 10): Ploshchad Aleksandra Nevskogo 1 (line 3, -54 m, closed type, 1967),
// Ploshchad Aleksandra Nevskogo 2 (line 4, -60 m, column hall, 1985) and Ligovsky Prospekt (line 4, -66 m, single vault, 1991).
// Plain data + pure functions, NO imports: data/metro.js calls define(T) with its own tables and module-local helpers (layout.js / massing read the result before any module builds):
//   import { define as defineEast } from './metro-east.js';
//   defineEast({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });
// define() adds FRAMES.pan1 / pan2 / ligovsky, ESC2.pan1 / pan2 / pan2gal / ligovsky, the DOORWAYS rows of the three vestibules (+ one INTERNAL doorway of the PAN-1 hotel block), the SHAFTS rows
// (ground holes over the first SHAFT_LEN m of the three inclines) and sets built: true on the STATIONS rows. The builders (metro/st-pan.js, metro/st-ligovsky.js, metro/hub-east.js) read the
// constants below and the rows from data/metro.js.
//
// Geometry decisions (dossier section 9 lists the uncertainties):
//   * PAN-1: the frame of the dossier (route stops, no platform polygon), hall 122 m (PZ 61), an 8 m landing at the -z end and the AXIAL incline (54 m rise, 93.5 m of run): the head lies 11 m ESE of the
//     OSM head inside the rotunda part r10358432 of the hotel block, so that the whole 13 m mouth (and its parapet) stays inside that part. The 21-step stair at the +z end rises 3.57 m to the landing (LANDING_Y), the footway climbs 1 m more (PASS_Y).
//   * PAN-2: hall 160 m (PZ 80; OSM 170 m includes the gallery mouth), the 3-lane incline along the OSM bearing from a head 2 m behind the OSM head (the mouth and its parapet stay 1.3 m clear of
//     the south wall of the round end of Chernoretsky 3), 55.3 m of rise (the remaining 4.7 m are a stair in front of the -z end: the ride-time rise of the dossier is ~50 m); the two short
//     escalators of the gallery at the +z end climb 10.6 m to the passage level.
//   * Ligovsky: the PCA frame of w182994675 (docs/research/metro-frames-south-east.md), hall 160 m (PZ 80), the incline from the OSM head inside Ligovsky 88 along the OSM bearing, 60.5 m of rise;
//     the S-passage stair at the -z end climbs the remaining 5.5 m (33 steps, 9.5 m of run: the dossier's "stair up 9.8 m").
//   * DOORWAYS sit ON the wall line of the footprint, in the middle of a wall piece long enough for the city gate rule (2.2 m from the edge ends): the OSM nodes of PAN-1 / PAN-2 lie on polygon
//     corners or 7 m inside the footprint, the rows are moved to the nearest such wall piece (<= 4 m from the node).

export const PAN1_PZ = 61, PAN1_LAND = 8, PAN1_STEPS = 21, PAN1_RISER = 0.17;
export const LANDING_Y = -54 + PAN1_STEPS * PAN1_RISER;               // the landing at the top of the 21-step stair (the copper relief): -50.43, just over the crown of the PAN-1 running tubes
export const PASS_Y = -49.4;                                          // the footway of the transfer (a 10 % ramp from the landing): it crosses OVER the PAN-1 track tube (crown -50.4 + clearance) and the PAN-2 stub
export const PAN2_PZ = 80, PAN2_LAND = 3, PAN2_FOOT_Y = -55.3, PAN2_STEPS = 28;   // the stair in front of the PAN-2 -z end: 28 risers of 0.168 m (-55.3 -> -60); the foot level clears the N track tube
export const LG_PZ = 80, LG_FOOT_Y = -60.5, LG_STEPS = 33;            // the Ligovsky S-passage stair: 33 risers of 1/6 m (-60.5 -> -66)
export const PAN1_BLDG = 'r10358431', PAN1_ROT = 'r10358432', PAN1_OUTLINE = 'r10358434', PAN1_HOTEL = 'r3132622', PAN2_BLDG = 'w28817963', LG_BLDG = 'w53573863';
/** the closed shopping-centre door of the rotunda (OSM n5628616544 moved onto the party wall with r3132622): x, z, outward rotY */
export const PAN1_MALL_DOOR = { x: 1908.32, z: 883.61, w: 3.0, rotY: 1.9328 };
/** footprints of the three vestibule houses as baked (used when the baked data are not loaded; the builders prefer ctx.L.buildingById) */
export const EAST_FOOT = {
  r10358431: [[1922.9, 904.7], [1897.8, 915.7], [1890.9, 916.6], [1883.8, 915.2], [1877.8, 911.8], [1860.3, 899.1], [1866.5, 890.2], [1884.7, 904.3], [1890.5, 901.4], [1890, 900.3], [1916.6, 890]],
  r10358432: [[1868.4, 891.6], [1879.1, 876.3], [1882, 874.4], [1885.5, 873.6], [1886.8, 862.2], [1891.6, 862.8], [1896.4, 865.8], [1901, 869.9], [1905.1, 875.1], [1911.5, 892], [1890, 900.3], [1890.5, 901.4], [1884.7, 904.3]],
  w28817963: [[1744.9, 1011.7], [1740.6, 995.4], [1780.5, 983.9], [1783.3, 973.8], [1792, 968.1], [1802.5, 969.5], [1810.8, 974.6], [1814.3, 979.9], [1818.4, 990.1]],
  w53573863: [[190.9, 1322.8], [186.9, 1321.5], [185.2, 1326.6], [172, 1322.4], [174.4, 1314.8], [190, 1319.7], [192.4, 1318.3], [206.6, 1273.5], [256.4, 1288.7], [245.2, 1322.8], [236, 1319.6], [236.7, 1316.9], [232.2, 1315.4], [231, 1316.3], [233.2, 1320.6], [218.8, 1327.6], [217.5, 1331.5]],
};

/** a point t metres along the wall a -> b and the outward rotY (the side away from `inside`) */
function onWall(a, b, t, inside) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, x = a[0] + ux * t, z = a[1] + uz * t;
  let nx = uz, nz = -ux; if ((inside[0] - x) * nx + (inside[1] - z) * nz > 0) { nx = -nx; nz = -nz; }
  return { x: +x.toFixed(2), z: +z.toFixed(2), rotY: Math.atan2(nx, nz) };
}

export function define(T) {
  const { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, esc2, toWorld, dirOf, TAN, SHAFT_LEN } = T;
  FRAMES.pan1 = { x: 1989.7, z: 1013.2, yaw: 0.6478, y: -54, len: 2 * PAN1_PZ, line: '3' };             // axis NW -> SE (+z toward Yelizarovskaya); the incline hangs on the -z end
  FRAMES.pan2 = { x: 1877.6, z: 1136.5, yaw: 1.6470, y: -60, len: 2 * PAN2_PZ, line: '4' };             // axis W -> E (+z toward Novocherkasskaya); incline passage at the -z end, gallery at the +z end
  FRAMES.ligovsky = { x: 440.85, z: 1202.67, yaw: 0.9702, y: -66, len: 2 * LG_PZ, line: '4' };          // axis WNW -> ESE (+z toward PAN-2); the S-passage leaves the -z end
  const p1 = FRAMES.pan1, p2 = FRAMES.pan2, lg = FRAMES.ligovsky;
  const L3 = [{ x: -2, dir: -1 }, { x: 0, dir: -1 }, { x: 2, dir: 1 }];
  ESC2.pan1 = esc2('pan1', { head: toWorld(p1, 0, -(PAN1_PZ + PAN1_LAND + (0 - p1.y) / TAN)), e: dirOf(p1, 0, 1), yBottom: p1.y, lanes: L3, A: 4.05, station: 'pan1', frame: 'pan1' });
  ESC2.pan2 = esc2('pan2', { head: [1799.32, 979.63], e: [-0.1583, 0.9874], yBottom: PAN2_FOOT_Y, lanes: L3, A: 4.05, station: 'pan2', frame: 'pan2' });
  ESC2.pan2gal = esc2('pan2gal', { head: toWorld(p2, 0, PAN2_PZ + PAN2_LAND + (PASS_Y - p2.y) / TAN), e: dirOf(p2, 0, -1), yTop: PASS_Y, yBottom: p2.y, lanes: [{ x: -1.1, dir: -1 }, { x: 1.1, dir: 1 }], A: 2.9, station: 'pan2', frame: 'pan2', top: true });
  ESC2.ligovsky = esc2('ligovsky', { head: [226.1, 1301.5], e: [0.702, -0.712], yBottom: LG_FOOT_Y, lanes: L3, A: 4.05, station: 'ligovsky', frame: 'ligovsky' });
  void lg;
  const F = EAST_FOOT, R1 = F.r10358431, R2 = F.r10358432, CH = F.w28817963, LH = F.w53573863;
  const d = (id, w, kind, station, bldg, osm, p, extra = {}) => ({ id, x: p.x, z: p.z, w, rotY: p.rotY, station, bldg, kind, osm, ...extra });
  DOORWAYS.push(
    // PAN-1: two glass door groups in the square front of the hotel block (south wall of r10358431, OSM n1652691240 / n315074823 at its corner) and the INTERNAL doorway between the concourse and
    // the rotunda (no street side: no totem, no [E] prompt; it only splits the party-wall colliders). The OSM entrance n5628616544 (1902, 886) lies 7 m inside the rotunda part, behind its party
    // wall with the hotel block r3132622 (the shopping centre door of 2008): there is no street there, the vestibule draws a closed glass door on that wall (owner request, dossier section 10).
    d('pan1-in', 3.0, 'entrance', 'pan1', PAN1_BLDG, 'n1652691240', onWall(R1[0], R1[1], 17.0, [1900, 905])),
    d('pan1-out', 3.0, 'exit', 'pan1', PAN1_BLDG, 'n315074823', onWall(R1[0], R1[1], 23.0, [1900, 905])),
    d('pan1-pass', 3.6, 'internal', 'pan1', PAN1_ROT, null, onWall(R2[9], R2[10], 4.6, [1900, 880]), { noTotem: true, internal: true }),
    // PAN-2: the round end of Chernoretsky 3 (OSM n316828146 entrance, n6209016215 exit, both on polygon corners)
    d('pan2-in', 3.0, 'entrance', 'pan2', PAN2_BLDG, 'n316828146', onWall(CH[5], CH[6], 6.0, [1795.8, 982.9])),
    d('pan2-out', 3.0, 'exit', 'pan2', PAN2_BLDG, 'n6209016215', onWall(CH[7], CH[8], 3.8, [1795.8, 982.9]), { noTotem: true }),
    // Ligovsky 88: the six-door glazed portal on the Ligovsky front (west wall) and the exit on Transportny per. (south wall)
    d('ligovsky-in', 4.4, 'entrance', 'ligovsky', LG_BLDG, 'n4976198540', onWall(LH[6], LH[7], 26.0, [215, 1305])),
    d('ligovsky-out', 3.4, 'exit', 'ligovsky', LG_BLDG, 'n4976198549', onWall(LH[7], LH[8], 29.15, [215, 1305]), { noTotem: true }),
  );
  for (const id of ['pan1', 'pan2', 'ligovsky']) { const e = ESC2[id]; SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * SHAFT_LEN / 2, z: e.head.z + e.e[1] * SHAFT_LEN / 2, w: 2 * e.A + 0.3, d: SHAFT_LEN, rotY: e.yaw, station: e.station, kind: 'escalator' }); }
  for (const [l, id] of [['3', 'pan1'], ['4', 'pan2'], ['4', 'ligovsky']]) { const s = STATIONS[l].find((q) => q.id === id); if (s) s.built = true; }
}
