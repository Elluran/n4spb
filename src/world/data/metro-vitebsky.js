// data/metro-vitebsky.js — static tables of the Vitebsky node: Pushkinskaya (line 1, -57 m, pylon, 1956) and Zvenigorodskaya (line 5, -57 m, column-wall three-vault, 2008) and the 2008 passage
// between them (dossier: docs/research/metro-south-vitebsky-tekhnolog.md sections 3-5 and 9; photos refs/vitebsky/).
//
// This file imports NOTHING: data/metro.js calls define(T) with its own tables and helpers (the same objects it exports), so that the rows below are in FRAMES / ESC2 / DOORWAYS / SHAFTS /
// STATIONS before layout.js and lib/massing.js read them:
//   T = { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W }
// The constants below are read by the builders (metro/st-pushkinskaya.js, st-zvenigorodskaya.js, hub-vitebsky.js, links-vitebsky.js).
//
// Geometry decisions (what differs from the OSM numbers, and why):
//   * Frames: PCA of the OSM platform polygons r2656886 / r2656887 (tools/metro-frames.mjs). Platform half lengths 80 (8 cars of line 1) and 72 (7 cars of line 5).
//   * Pushkinskaya cross-section from the dossier (central hall 9.3 m, side halls 10 m, platforms ~5 m, track spacing ~28 m: OSM 29 m); the 3-lane incline lands AXIALLY in the WSW (+z) end of
//     the central hall (the Gorkovskaya pattern: the central hall ends 3 m before the foot); its head (local z 175.7) is the OSM head (-1199, 1318) inside the pavilion r11737909.
//   * Zvenigorodskaya: a column-wall station: 1.3 m piers at a 3.8 m pitch with 2.5 m arches, central hall 6.8 m, side halls 10.4 m; track spacing 24.2 m (OSM 22.2: the stair bridges of the
//     passage need the room). The 4-lane incline (A 5.05 is wider than the central hall) leaves the ENE (+z) end axially through a short lower hall BEHIND the platform; its head (local z
//     174.8) lies 3.6 m from the OSM head (-870, 1117), inside the ground floor of the shopping centre (part w1304314360 of w88216896, the floor the OSM doors stand on).
//   * The passage: on the NNW side of Pushkinskaya (local -x) two stairs climb from the central hall through the pylon openings at local z -6 / -12 (OSM -7.0 / -12.8) to bridges 3.62 m over
//     the platform level that cross the southbound track; on the SSE side of Zvenigorodskaya (local -x) three stairs in the arches at z -11.4 / -15.2 / -19.0 (OSM: 10-18 m WSW of the centre)
//     climb to the same level. Between the two track walls: two parallel corridors (~35 m) and the transfer chamber in front of Zvenigorodskaya. The side vault over the bridges is replaced
//     by a raised flat BAY (a vault that springs at +3.6 cannot let a 2.7 m portal through the track wall).
export const PS_PZ = 80, ZV_PZ = 72;
export const PS_DIMS = { C: 4.65, PY: 7.4, EDGE: 12.6, TRK: 14.1, WALL: 17.4, RS: 5.0 };
export const ZV_DIMS = { C: 3.4, PY: 4.8, EDGE: 10.6, TRK: 12.1, WALL: 15.2, RS: 5.2 };
export const PS_ARCADE = { pitch: 6, openW: 3.4, openSpring: 2.2 }, ZV_ARCADE = { pitch: 3.8, openW: 2.5, openSpring: 2.4 };
export const PS_FOOT = 77, ZV_FOOT = ZV_PZ + 4.1;                                       // local z of the escalator foot (Pushkinskaya: inside the hall, Zvenigorodskaya: behind the platform end)
/** the passage: bridge level over the platform (YB), stair slope (tan), how far the stairs start inside the central hall (inset from the pylon face), tube height, bays (local z ranges
 *  of the raised side-hall section on the -x side), stair axes, the chamber (Zvenigorodskaya frame) and the two arms (Zvenigorodskaya z of the corridor openings in the chamber) */
export const XFER = {
  YB: 3.62, TANS: 0.625, inset: 0.6, tubeH: 2.7, bayTop: 9.6,
  push: { stairs: [-6, -12], bay: [-16.4, -1.6] },
  zven: { stairs: [-11.4, -15.2, -19.0], bay: [-23.0, -7.5] },
  chamber: { x0: -27.5, x1: -(ZV_DIMS.WALL + 0.3), z0: -22.5, z1: -8.0, h: 3.4, piers: [[-23.5, -16.4], [-19.5, -16.4]] },
  arms: { '-6': -19.5, '-12': -13.5 },                                                  // Pushkinskaya stair z -> Zvenigorodskaya z of its corridor opening in the chamber
  corrW: 3.4,
};
// street footprints (rings, world x / z) of the buildings that hold the vestibules: the Pushkinskaya pavilion and the ground floor of the shopping centre «Звенигородский»
export const VIT_FOOTPRINTS = {
  r11737909: [[-1210, 1301.9], [-1196.1, 1290.9], [-1171.5, 1322.1], [-1186.5, 1333.8], [-1189.7, 1329.8], [-1192.1, 1331.7], [-1190.5, 1333.7], [-1207.8, 1347.2], [-1211.3, 1342.9], [-1213.2, 1344.4], [-1232.7, 1319.9]],
  w1304314360: [[-895.4, 1111.5], [-869, 1094.6], [-862.1, 1105.5], [-864.8, 1107.2], [-863.1, 1109.9], [-861.6, 1109], [-858.8, 1110.7], [-855.9, 1115.1], [-855.2, 1118.8], [-856.7, 1119.8], [-854.9, 1122.6], [-852.3, 1120.9], [-845.5, 1131.4], [-872.2, 1147.8]],
};
export const VIT_ROOMS = { pushkinskaya: { bldg: 'r11737909', ring: 'r11737909', ceil: 5.6 }, zvenigorodskaya: { bldg: 'w88216896', ring: 'w1304314360', ceil: 4.6 } };
export const PUSH_STREETS = [['Загородный проспект', 'Zagorodny prospekt'], ['Витебский вокзал', 'Vitebsky railway station']];
export const ZVEN_STREETS = [['Звенигородская улица', 'Zvenigorodskaya ulitsa'], ['Марата улица', 'Marata ulitsa']];
// the OSM entrance / exit nodes (all on the outline of the drawn building: r11737909, part w1304314360)
const DOORS = [
  { id: 'pushkinskaya-in', x: -1199.8, z: 1341.0, w: 4.4, station: 'pushkinskaya', bldg: 'r11737909', ring: 'r11737909', kind: 'entrance', osm: 'n950308631' },
  { id: 'pushkinskaya-out', x: -1215.0, z: 1305.9, w: 3.4, station: 'pushkinskaya', bldg: 'r11737909', ring: 'r11737909', kind: 'exit', osm: 'n950308633' },
  { id: 'zvenigorodskaya-in', x: -879.7, z: 1101.4, w: 3.4, station: 'zvenigorodskaya', bldg: 'w88216896', ring: 'w1304314360', kind: 'entrance', osm: 'n1119799048' },
  { id: 'zvenigorodskaya-out', x: -856.8, z: 1138.2, w: 3.4, station: 'zvenigorodskaya', bldg: 'w88216896', ring: 'w1304314360', kind: 'exit', osm: 'n2082688582' },
];
const inRing = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
/** rotY (facing OUT of the building) of a door point: the normal of the nearest edge of the ring, pointing away from the inside; the point is snapped onto that edge */
export function doorOnRing(ring, x, z) {
  let best = null;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], ex = b[0] - a[0], ez = b[1] - a[1], l2 = ex * ex + ez * ez, t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / l2));
    const px = a[0] + ex * t, pz = a[1] + ez * t, d = Math.hypot(px - x, pz - z);
    if (!best || d < best.d) { const l = Math.sqrt(l2); let nx = ez / l, nz = -ex / l; if (inRing(ring, px + nx * 0.3, pz + nz * 0.3)) { nx = -nx; nz = -nz; } best = { d, x: px, z: pz, nx, nz, rotY: Math.atan2(nx, nz) }; }
  }
  return best;
}
export const inVitRing = inRing;

const L3 = [{ x: -2, dir: -1 }, { x: 0, dir: -1 }, { x: 2, dir: 1 }], L4 = [{ x: -3, dir: -1 }, { x: -1, dir: -1 }, { x: 1, dir: 1 }, { x: 3, dir: 1 }];

/** adds the rows of the two stations to the tables of data/metro.js (called once from there; T: see the header) */
export function define(T) {
  const { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, esc2, toWorld, dirOf, TAN, SHAFT_LEN } = T;
  // ---- frames (keep a row another table already set; the builders read the frame at run time)
  FRAMES.pushkinskaya = { x: -1039.59, z: 1243.53, yaw: -1.1380, y: -57, ...(FRAMES.pushkinskaya || {}), len: 2 * PS_PZ, line: '1' };       // +z WSW toward Tekhnologichesky Institut; incline at the +z end
  FRAMES.zvenigorodskaya = { x: -1032.79, z: 1170.46, yaw: 1.8912, y: -57, ...(FRAMES.zvenigorodskaya || {}), len: 2 * ZV_PZ, line: '5' };  // +z ENE toward Obvodny Kanal; incline at the +z end
  const P = FRAMES.pushkinskaya, Z = FRAMES.zvenigorodskaya;
  // ---- the two inclines (axial with their halls; the head is the street end, e = direction of descent)
  ESC2.pushkinskaya = esc2('pushkinskaya', { head: toWorld(P, 0, PS_FOOT + (0 - P.y) / TAN), e: dirOf(P, 0, -1), yBottom: P.y, lanes: L3, A: 4.05, station: 'pushkinskaya', frame: 'pushkinskaya' });
  ESC2.zvenigorodskaya = esc2('zvenigorodskaya', { head: toWorld(Z, 0, ZV_FOOT + (0 - Z.y) / TAN), e: dirOf(Z, 0, -1), yBottom: Z.y, lanes: L4, A: 5.05, station: 'zvenigorodskaya', frame: 'zvenigorodskaya' });
  // ---- the doors (snapped onto the outline; rotY faces the street) and the ground holes over the first SHAFT_LEN m of both shafts (inside the buildings, never on a carriageway)
  for (const d of DOORS) {
    if (DOORWAYS.some((q) => q.id === d.id)) continue;
    const s = doorOnRing(VIT_FOOTPRINTS[d.ring], d.x, d.z);
    DOORWAYS.push({ id: d.id, x: +s.x.toFixed(2), z: +s.z.toFixed(2), w: d.w, rotY: s.rotY, station: d.station, bldg: d.bldg, kind: d.kind, osm: d.osm });
  }
  for (const id of ['pushkinskaya', 'zvenigorodskaya']) {
    const e = ESC2[id]; if (SHAFTS.some((q) => q.id === id + '-shaft')) continue;
    SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * SHAFT_LEN / 2, z: e.head.z + e.e[1] * SHAFT_LEN / 2, w: 2 * e.A + 0.3, d: SHAFT_LEN, rotY: e.yaw, station: id, kind: 'escalator' });
  }
  // ---- the network: both halls are real now; Zvenigorodskaya is a column-wall three-vault station (dossier 1.1), not a single vault
  for (const [l, id] of [['1', 'pushkinskaya'], ['5', 'zvenigorodskaya']]) { const s = STATIONS[l] && STATIONS[l].find((q) => q.id === id); if (s) { s.built = true; if (id === 'zvenigorodskaya') s.type = 'column'; } }
}
