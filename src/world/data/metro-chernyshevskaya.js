// Static metro tables of CHERNYSHEVSKAYA (line 1, 1 Sep 1958; incline + vestibule rebuilt 25 Oct 2022 - 13 Jul 2024): docs/research/metro-east.md sections 2, 7, 9, 10;
// frame: docs/research/metro-frames-south-east.md (PCA of the two OSM platform strips w193159633 / w417345103).
// Plain data + pure functions, NO imports: data/metro.js calls define(T) with its own tables and module-local helpers (layout.js / massing read the result before any module builds):
//   import { define as defineChernyshevskaya } from './metro-chernyshevskaya.js';
//   defineChernyshevskaya({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });
// define() adds FRAMES.chernyshevskaya, ESC2.chernyshevskaya (4 lanes), the two DOORWAYS rows of the vestibule w22999175 (pr. Chernyshevskogo 20), the SHAFTS row (ground hole over the first
// SHAFT_LEN m of the incline) and sets built: true on the STATIONS row. It is idempotent (a second call does nothing). The builders (metro/st-chernyshevskaya.js, metro/links-north.js) read the
// constants below and the rows from data/metro.js.
//
// Geometry decisions (dossier section 9 lists the uncertainties):
//   * Hall: the engine's pylon cross-section (hall-pylon.js PYLON: central hall |x| < 4.4, tracks +-10) and its 8-car half length PZ 82.5 (the OSM strips are 156.2 m; an 8-car 81-725.1 is
//     156.75 m and the service stairs stand 2.6 m inside the end walls, as at Vosstaniya / Vladimirskaya). DEVIATION from the dossier (section 7: side halls only from the incline foot to the
//     OSM south end, ~100 m, the 52 m north of the foot unbuilt): both side halls run the whole 165 m, an 8-car train does not fit a 100 m platform. FRAMES.len stays the OSM 156.2.
//   * Central hall: the dossier's recommendation, "from the incline foot (OSM, world z -1219) southward 52.6 m": local z -26.3 .. +26.3, i.e. where the OSM footway w417345107 lies (the middle
//     third). Seven rectangular openings per side, pitch 6.6 m, 3.3 m wide (pylons ~3.3 m, photos che-05 / che-16).
//   * Incline: AXIAL with the hall (as the OSM ways w55502253 / w417345032 are), 4 lanes (KTP-5 since July 2024). The head lies at local z CH_HEAD (OSM head: -159.1) so that the whole 13 m shaft
//     mouth stays inside the pentagon w22999175 (its south corner cuts the axis at local z -141.7). The foot level is CH_FOOT_Y.
//   * DEPTH (decided 2026-10-15, option A): platform y -70 (the STATIONS depth used by the network data) and a 70 m rise (140 m of slope): the pavilion floor is at street level (photo che-25)
//     and the foot lands level with the central hall (photo che-01, no stair). The real record incline (131.6 m slope, 65.8 m rise) is kept as ESC2.chernyshevskaya.recordLen / recordRise
//     (+ .record). Not chosen, one constant each (the builder handles both): CH_Y = -65.8 (exact record, platform 4.2 m higher), CH_FOOT_Y = CH_Y + 4.2 (exact record + a 28-step stair in the
//     lower hall, which photo che-01 does not show).
//   * DOORWAYS sit ON the wall line, in the middle of a wall piece that satisfies the city gate rule (2.2 m from the edge ends): the entrance is centred on the door group of the west front
//     (landmarksNorth draws six doors there; the OSM node n348148610 lies 3.9 m south of the centre, at the edge of the group), the exit is the OSM node n697434055 on the north wall.

export const CH_PZ = 82.5;                        // half length of the hall (platform ends; the mouths are at +-(CH_PZ + 0.6))
export const CH_ZA = -26.3, CH_ZB = 26.3;         // the shortened central hall (local z): its north end is the arch to the lower hall and the incline
export const CH_PIT = 6.6, CH_OW = 3.3, CH_OH = 3.45;   // pylon pitch, opening width and height (rectangular openings)
export const CH_Y = -70;                          // platform level
export const CH_FOOT_Y = CH_Y;                    // level of the escalator foot (CH_Y + 4.2: the record rise with a stair in the lower hall)
export const CH_HEAD = -160.0;                    // local z of the incline head (the top of the lanes, vestibule floor level)
export const CH_A = 4.6;                          // half width of the incline tube: 4 lanes at x -3 -1 1 3; it passes between the pylon rows (|x| < 6.2) next to the foot
export const CH_LANES = [{ x: -3, dir: -1 }, { x: -1, dir: -1 }, { x: 1, dir: 1 }, { x: 3, dir: 1 }];   // two down (west), two up (east)
export const CH_RECORD = { len: 131.6, rise: 65.8, steps: 755, stepsTotal: 2908, handrail: 290, lanes: 4, since: '2024-07-13', was: 3 };
export const CH_BLDG = 'w22999175';
export const CH_STREETS = [['Проспект Чернышевского', 'Chernyshevskogo prospekt'], ['Кирочная улица', 'Kirochnaya street']];
/** the footprint of the vestibule house as baked (used when the baked data are not loaded; the builder prefers ctx.L.buildingById) */
export const CH_FOOT = [[476.4, -1360.2], [476.3, -1364.1], [495, -1369.5], [503.9, -1343.2], [498.9, -1341.4], [494.6, -1328], [473.1, -1336.9], [473.1, -1339.9], [460.9, -1340.1], [461.2, -1360.2]];
/** the line-1 track toward Vosstaniya (OSM w378159370, the right-hand track of a train leaving Chernyshevskaya at its +z end): fallback for links-north.js when SUBWAY is not loaded */
export const CH_LINK_MID = [[607.2, -926.4], [713.5, -671.1], [747.3, -568.2], [751.1, -489.7], [738.0, -422.8], [626.4, -156.0], [537.6, 33.6]];
export const CH_LINK_WAY = 'w378159370';

/** a point t metres along the wall a -> b and the outward rotY (the side away from `inside`) */
function onWall(a, b, t, inside) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), ux = dx / l, uz = dz / l, x = a[0] + ux * t, z = a[1] + uz * t;
  let nx = uz, nz = -ux; if ((inside[0] - x) * nx + (inside[1] - z) * nz > 0) { nx = -nx; nz = -nz; }
  return { x: +x.toFixed(2), z: +z.toFixed(2), rotY: Math.atan2(nx, nz) };
}
const edgeLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function define(T) {
  const { FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, esc2, toWorld, dirOf, SHAFT_LEN } = T;
  if (FRAMES.chernyshevskaya) return;                                                                  // idempotent
  FRAMES.chernyshevskaya = { x: 530.33, z: -1192.93, yaw: 0.2769, y: CH_Y, len: 156.2, line: '1' };      // axis NNW -> SSE (+z compass 164.1, toward Vosstaniya); the incline hangs on the -z end
  const f = FRAMES.chernyshevskaya;
  ESC2.chernyshevskaya = esc2('chernyshevskaya', { head: toWorld(f, 0, CH_HEAD), e: dirOf(f, 0, 1), yTop: 0, yBottom: CH_FOOT_Y, lanes: CH_LANES, A: CH_A, station: 'chernyshevskaya', frame: 'chernyshevskaya',
    recordLen: CH_RECORD.len, recordRise: CH_RECORD.rise, record: CH_RECORD });      // the modelled flight is 70 m / 140 m (platform -70); the real one is 65.8 m / 131.6 m
  const F = CH_FOOT, inside = [482.9, -1349.3];
  DOORWAYS.push(
    // the west front on pr. Chernyshevskogo (edge F[8] -> F[9], 20.1 m): the middle four of the six doors
    { id: 'chernyshevskaya-in', ...onWall(F[8], F[9], edgeLen(F[8], F[9]) / 2, inside), w: 5.4, station: 'chernyshevskaya', bldg: CH_BLDG, kind: 'entrance', osm: 'n348148610' },
    // the exit on the north wall (edge F[1] -> F[2], 19.5 m), at the OSM node
    { id: 'chernyshevskaya-out', ...onWall(F[1], F[2], 9.05, inside), w: 3.4, station: 'chernyshevskaya', bldg: CH_BLDG, kind: 'exit', osm: 'n697434055', noTotem: true },
  );
  const e = ESC2.chernyshevskaya;
  SHAFTS.push({ id: 'chernyshevskaya-shaft', x: e.head.x + e.e[0] * SHAFT_LEN / 2, z: e.head.z + e.e[1] * SHAFT_LEN / 2, w: 2 * e.A + 0.3, d: SHAFT_LEN, rotY: e.yaw, station: 'chernyshevskaya', kind: 'escalator' });
  const s = STATIONS['1'].find((q) => q.id === 'chernyshevskaya'); if (s) s.built = true;
}
