// Static metro tables (owned by the metro specialist). Imported by layout.js / lib/massing.js BEFORE any module builds, so: plain data + a few pure functions, no three.js.
//
//   SHAFTS    rectangles { id, x, z, w, d, rotY, station, kind } in which the street ground plane (y = 0) has NO surface because an escalator shaft opens there
//             (layout.GROUND_HOLES = SHAFTS; the environment's ground mesh skips the cells whose centre lies in a rectangle; the metro module draws its own floor + the trench).
//   DOORWAYS  openings { id, x, z, w, rotY, station, bldg } through the wall of a building that stands on the ground (the rotunda doors, a portal inside Nevsky Atrium, the
//             vestibule doors in the station wings ...): lib/massing.js addPolyColliders splits the wall colliders of EVERY building around them, so the player can walk through.
//             The facade owner (city / landmarks) draws an arch / door there (layout.DOORWAYS); the metro module draws everything behind it.
//   LINES / STATIONS   the DATA-DRIVEN network: line colours, rolling stock, the ordered stations of each line CUT TO THE STRIP (the in-strip stations plus ONE out-of-strip neighbour per
//             line end, `built: false`, served by the generic hall; positions come from SUBWAY_ROUTES at runtime), depth, hall type, `built` (a real hall exists in this map) and
//             transfers. A new station = add the row, flip `built`, give it a FRAMES row + a vestibule, see docs/METRO.md.
//   FRAMES    platform frames of the built stations: origin = the middle of the platform at street coordinates, `yaw` = rotY of the local +z axis (the direction of increasing
//             station index of its line), y = platform level. Local +x = (cos yaw, -sin yaw) in the world. Every station object is built in its own frame.
//   ESC       escalator geometry per built station (head = the street end; the shaft hole, DOORWAYS and the tunnel are derived from it).
export const SLOPE = 30 * Math.PI / 180;
export const TAN = Math.tan(SLOPE), SIN = Math.sin(SLOPE), COS = Math.cos(SLOPE);

export const LINES = {
  // `to` = the names of the two line ends AS THE PLAYER MEETS THEM: index 0 = the low-index end, 1 = the high-index end (the in-strip stations are flanked by ONE out-of-strip neighbour per end, see STATIONS)
  '1': { id: '1', name: 'Кировско-Выборгская линия', nameEn: 'Kirovsko-Vyborgskaya line', color: '#d6083b', stock: 'baltiets', cars: 8, kmh: 37.7, to: ['Чернышевская', 'Пушкинская'], toEn: ['Chernyshevskaya', 'Pushkinskaya'] },
  '3': { id: '3', name: 'Невско-Василеостровская линия', nameEn: 'Nevsko-Vasileostrovskaya line', color: '#009a49', stock: 'neva', cars: 6, kmh: 36, to: ['Василеостровская', 'Площадь Александра Невского 1'], toEn: ['Vasileostrovskaya', 'Ploshchad Aleksandra Nevskogo 1'] },
  '4': { id: '4', name: 'Правобережная линия', nameEn: 'Pravoberezhnaya line', color: '#ea7125', stock: '717', cars: 7, kmh: 36, to: ['Спасская', 'Лиговский проспект'], toEn: ['Spasskaya', 'Ligovsky Prospekt'] },
  // west extension (docs/research/metro-west.md section 7 / 10): lines 2, 5 (built stations Nevsky Prospekt, Admiralteyskaya)
  '2': { id: '2', name: 'Московско-Петроградская линия', nameEn: 'Moskovsko-Petrogradskaya line', color: '#0078c9', stock: '717-l2', cars: 6, kmh: 38, to: ['Сенная площадь', 'Горьковская'], toEn: ['Sennaya Ploshchad', 'Gorkovskaya'] },
  '5': { id: '5', name: 'Фрунзенско-Приморская линия', nameEn: 'Frunzensko-Primorskaya line', color: '#6E0A78', stock: '717-l5', cars: 7, kmh: 40, to: ['Спортивная', 'Садовая'], toEn: ['Sportivnaya', 'Sadovaya'] },
};

// Ordered along each line: [out-of-strip neighbour, the in-strip stations..., out-of-strip neighbour]. The map is cut down to one strip (Moscow station - Nevsky - Admiralteyskaya), so only
// 7 stations are real halls; each line end keeps ONE neighbour (built: false) that is served by the shared generic hall and is the terminus of a ride: the train arrives with open doors,
// the exit is closed ("Выход закрыт"), the rider can board the opposite track and ride back. The real HOPS to the neighbours stay in the table below (real run times).
// type: pylon | column | closed | vault | shallow; depth in metres below the street (OSM / Wikipedia ru).
const S = (id, name, nameEn, depth, type, extra = {}) => ({ id, name, nameEn, depth, type, built: false, ...extra });
export const STATIONS = {
  '1': [
    S('chernyshevskaya', 'Чернышевская', 'Chernyshevskaya', 70, 'pylon'),
    S('vosstaniya', 'Площадь Восстания', 'Ploshchad Vosstaniya', 58, 'pylon', { built: true, transfer: ['mayakovskaya'], note: 'Московский вокзал' }),
    S('vladimirskaya', 'Владимирская', 'Vladimirskaya', 55, 'pylon', { built: true, transfer: ['dostoevskaya'] }),
    S('pushkinskaya', 'Пушкинская', 'Pushkinskaya', 57, 'pylon'),
  ],
  '3': [
    S('vasileostrovskaya', 'Василеостровская', 'Vasileostrovskaya', 64, 'closed'),
    S('gostiny', 'Гостиный двор', 'Gostiny Dvor', 56, 'closed', { built: true, transfer: ['nevsky'], note: 'пересадка на «Невский проспект»' }),
    S('mayakovskaya', 'Маяковская', 'Mayakovskaya', 51, 'pylon', { built: true, transfer: ['vosstaniya'] }),
    S('pan1', 'Площадь Александра Невского 1', 'Ploshchad Aleksandra Nevskogo 1', 54, 'closed'),
  ],
  '4': [
    S('spasskaya', 'Спасская', 'Spasskaya', 60, 'pylon'),
    S('dostoevskaya', 'Достоевская', 'Dostoyevskaya', 62, 'column', { built: true, transfer: ['vladimirskaya'], note: 'пока через общий зал' }),
    S('ligovsky', 'Лиговский проспект', 'Ligovsky Prospekt', 66, 'vault'),
  ],
  '2': [
    S('sennaya', 'Сенная площадь', 'Sennaya Ploshchad', 55, 'pylon'),
    S('nevsky', 'Невский проспект', 'Nevsky Prospekt', 63, 'pylon', { built: true, transfer: ['gostiny'], note: 'пересадка на «Гостиный двор»' }),
    S('gorkovskaya', 'Горьковская', 'Gorkovskaya', 53, 'pylon'),
  ],
  '5': [
    S('sportivnaya', 'Спортивная', 'Sportivnaya', 64, 'vault'),
    S('admiralteyskaya', 'Адмиралтейская', 'Admiralteyskaya', 86, 'column', { built: true, note: 'самая глубокая станция России' }),
    S('sadovaya', 'Садовая', 'Sadovaya', 71, 'vault'),
  ],
};

// Built stations: platform frame in street coordinates. Derived from the OSM platform polygons (PCA of w/r5633943 Vosstaniya, r8362462 Mayakovskaya, the two w193019201 / w556602690 ways
// of Vladimirskaya, w183017444 Dostoevskaya). yaw = atan2(dx, dz) of the local +z axis; +z points to the higher station index of the line.
export const FRAMES = {
  vosstaniya: { x: 431.05, z: 274.8, yaw: Math.atan2(-0.4184, 0.9085), y: -58, len: 150, line: '1' },          // axis NNE -> SSW (+z toward Vladimirskaya), tracks continue in both directions
  mayakovskaya: { x: 358.6, z: 212.3, yaw: Math.atan2(0.880, 0.475), y: -51, len: 120, line: '3' },            // axis WNW -> ESE (+z toward Pl. Aleksandra Nevskogo)
  vladimirskaya: { x: -225.05, z: 718.95, yaw: Math.atan2(-0.937, 0.350), y: -55, len: 160, line: '1' },       // axis NE -> SW (+z toward Pushkinskaya)
  dostoevskaya: { x: -290.4, z: 625.4, yaw: Math.atan2(0.990, 0.142), y: -64, len: 124, line: '4' },           // axis W -> E (+z toward Ligovsky pr.)
};
export const frameDir = (f) => ({ sx: Math.sin(f.yaw), sz: Math.cos(f.yaw) });          // world direction of local +z
/** local (lx, lz) of a frame -> world [x, z] */
export const toWorld = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [f.x + lx * c + lz * s, f.z - lx * s + lz * c]; };
/** world (x, z) -> local [lx, lz] */
export const toLocal = (f, x, z) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw), dx = x - f.x, dz = z - f.z; return [dx * c - dz * s, dx * s + dz * c]; };

// Escalator: slope 30 degrees; `from` = the platform end it hangs on (local z of the hall end, the lower hall is `lower` m long), `rise` = platform depth.
// Vosstaniya: the street head lies on the platform axis (rotunda on the extension of the platform, 129 m from its north end).
export const ESC = {
  vosstaniya: { frame: 'vosstaniya', lanes: 3, end: -80, lower: 15, rise: 58, lateral: 0 },
};
/** Geometry of an escalator in its station frame: bottom z, top z (negative = toward -z end) and the world head point + direction of descent. */
export function escGeom(id) {
  const e = ESC[id], f = FRAMES[e.frame];
  const run = e.rise / TAN, zBottom = e.end - e.lower, zTop = zBottom - run;
  const [hx, hz] = toWorld(f, e.lateral, zTop), [bx, bz] = toWorld(f, e.lateral, zBottom);
  return { id, frame: f, run, len: run / COS, zBottom, zTop, head: { x: hx, z: hz }, bottom: { x: bx, z: bz }, yaw: f.yaw, rise: e.rise };
}

// ROOMS: vestibules that are a rectangular room built INSIDE somebody else's building behind a facade door: the door point (world), the inward unit normal, the room half width, the head of
// the escalator (headZ metres inside the wall), platform depth. The room frame has its origin on the wall plane, +z inward, +x along the wall (rotY = atan2(nx, nz)).
export const ROOMS = {
  mayakovskaya: { station: 'mayakovskaya', bldg: 'r15081488', door: [196.0, 93.3], n: [0, 1], halfW: 7, headZ: 11.5, rise: 51, name: 'Маяковская', ticket: 9, exit: { z: 16, to: [20.0, 21.7] } },
  vosstaniya2: { station: 'vosstaniya', bldg: 'r2404499', door: [597.5, 341.0], n: [0.984, -0.176], halfW: 7, headZ: 21.5, rise: 58, back: true, name: 'Площадь Восстания-2', ticket: 6 },
  dostoevskaya: { station: 'dostoevskaya', bldg: 'w38578114', door: [-277.1, 452.4], n: [-0.331, 0.944], halfW: 7, headZ: 11.5, rise: 64, name: 'Достоевская', ticket: 9, axial: { PZ: 72, lower: 12.5 } },
  vladimirskaya: { station: 'vladimirskaya', bldg: 'w61738351', door: [-187.4, 532.0], n: [0.607, 0.795], halfW: 7, headZ: 11.5, rise: 55, name: 'Владимирская', ticket: 9 },
};
export function roomGeom(id) {
  const r = ROOMS[id], yaw = Math.atan2(r.n[0], r.n[1]), run = r.rise / TAN, e = r.back ? [-r.n[0], -r.n[1]] : r.n, yawE = Math.atan2(e[0], e[1]);   // e = direction of descent (back rooms: the escalator runs back under the room toward the door)
  const head = { x: r.door[0] + r.n[0] * r.headZ, z: r.door[1] + r.n[1] * r.headZ };
  const bottom = { x: head.x + e[0] * run, z: head.z + e[1] * run };
  return { id, ...r, yaw, e, yawE, run, head, bottom, frame: { x: r.door[0], z: r.door[1], yaw }, eframe: { x: head.x, z: head.z, yaw: yawE } };
}

// Dostoevskaya is AXIAL: the hall lies on the extension of the escalator (like Vosstaniya), so its frame is derived from the room (the OSM platform polygon lies about 60 m east of it).
{ const g = roomGeom('dostoevskaya'), a = g.axial, off = g.run + a.lower + a.PZ; FRAMES.dostoevskaya = { x: g.head.x + g.n[0] * off, z: g.head.z + g.n[1] * off, yaw: g.yaw, y: -64, len: 2 * a.PZ, line: '4' }; }
const _g = escGeom('vosstaniya');
const _sd = Math.sin(_g.yaw), _cd = Math.cos(_g.yaw);
// the ground hole over the first 13 m of the shaft (inside the rotunda): the tunnel vault starts where the crown passes under the floor
export const SHAFT_LEN = 13, SHAFT_W = 8.4;
export const SHAFTS = [
  { id: 'vosstaniya-shaft', x: _g.head.x + _sd * SHAFT_LEN / 2, z: _g.head.z + _cd * SHAFT_LEN / 2, w: SHAFT_W, d: SHAFT_LEN, rotY: _g.yaw, station: 'vosstaniya', kind: 'escalator' },
  ...Object.keys(ROOMS).map((id) => { const g = roomGeom(id); return { id: id + '-shaft', x: g.head.x + g.e[0] * SHAFT_LEN / 2, z: g.head.z + g.e[1] * SHAFT_LEN / 2, w: SHAFT_W, d: SHAFT_LEN, rotY: g.yawE, station: id, kind: 'escalator' }; }),
];

// Doors in the wall of the rotunda w28962850 (the metro module draws the building itself, OWNS_GROUPS): the OSM nodes lie on polygon corners, the doors sit in the middle of the
// straight wall next to them. rotY faces outward.
export const DOORWAYS = [
  { id: 'vosstaniya2-in', x: 597.5, z: 341.0, w: 3.4, rotY: Math.atan2(-0.984, 0.176), station: 'vosstaniya', bldg: 'r2404499', kind: 'entrance', osm: 'n1109163066' },
  { id: 'dostoevskaya-in', x: -277.1, z: 452.4, w: 3.4, rotY: Math.atan2(0.331, -0.944), station: 'dostoevskaya', bldg: 'w38578114', kind: 'entrance', osm: 'n7473625772' },
  { id: 'mayakovskaya-in', x: 196.0, z: 93.3, w: 3.4, rotY: Math.PI, station: 'mayakovskaya', bldg: 'r15081488', kind: 'entrance', osm: 'n4060185664' },
  { id: 'mayakovskaya-out', x: 216.0, z: 115.3, w: 3.4, rotY: Math.PI / 2, station: 'mayakovskaya', bldg: 'r15081488', kind: 'exit', osm: 'n1109163128' },
  { id: 'vladimirskaya-in', x: -187.4, z: 532.0, w: 3.4, rotY: Math.atan2(-0.607, -0.795), station: 'vladimirskaya', bldg: 'w61738351', kind: 'entrance', osm: 'n836617908' },
  { id: 'vosstaniya-in', x: 535.2, z: 91.2, w: 3.4, rotY: Math.PI / 2, station: 'vosstaniya', bldg: 'w28962850', kind: 'entrance', osm: 'n318455877' },
  { id: 'vosstaniya-out', x: 496.6, z: 92.7, w: 3.4, rotY: -Math.PI / 2, station: 'vosstaniya', bldg: 'w28962850', kind: 'exit', osm: 'n318455870' },
];

// ================================================================================================================================================================================
// WEST EXTENSION (docs/research/metro-west.md, docs/METRO.md): Gostiny Dvor (line 3, -56 m), Nevsky Prospekt (line 2, -63 m), Admiralteyskaya (line 5, -86 m, the deepest).
// Frames come from the PCA of the OSM platform polygons (dossier 2.1). The interchange is made consistent: the north chamber of Nevsky Prospekt is the west end of the Gostiny Dvor hall (the OSM
// polygons overlap there), so the Nevsky frame is slid ~12 m along the Gostiny Dvor axis until its chamber meets the foot of the four short escalators that lift to the Gostiny Dvor hall.
// Escalator rows (ESC2) are given by head point + direction of descent; everything below is derived (run = rise / tan 30, eframe, shafts).
// ================================================================================================================================================================================
export const GD_PZ = 70, NV_PZ = 54.5, AD_PZ = 67.5, UNDERPASS_Y = -4.5;
FRAMES.gostiny = { x: -1193.5, z: -207.0, yaw: 1.3516, y: -56, len: 2 * GD_PZ, line: '3' };                       // axis WNW -> ESE (+z toward Mayakovskaya)
FRAMES.admiralteyskaya = { x: -2093.0, z: -414.7, yaw: 1.1105, y: -86, len: 2 * AD_PZ, line: '5' };               // axis WNW -> ESE (+z toward Sadovaya); the escalators land at the +z end
// the Nevsky Prospekt north chamber (local x -6 .. 6, z 55.1 .. 73) and the four short escalators: GD west end (z = -70.6, platform level -56) -> chamber floor (-62), 10.39 m of run
export const NV_CH = { x0: -6, x1: 6, z0: 55.1, z1: 73.0, y: -63, bankZ: 62.0 };
{
  const P = toWorld(FRAMES.gostiny, 0, -(GD_PZ + 0.6)), yaw = 2.9023, c = Math.cos(yaw), s = Math.sin(yaw), lx = NV_CH.x0 - (FRAMES.gostiny.y - NV_CH.y) / TAN, lz = NV_CH.bankZ;
  FRAMES.nevsky = { x: P[0] - lx * c - lz * s, z: P[1] + lx * s - lz * c, yaw, y: -63, len: 2 * NV_PZ, line: '2' };   // axis SSW -> NNE (+z toward Gorkovskaya)
}
const dirOf = (f, lx, lz) => { const c = Math.cos(f.yaw), s = Math.sin(f.yaw); return [lx * c + lz * s, -lx * s + lz * c]; };         // local direction -> world direction

/** an escalator tunnel: head = the TOP point (world), e = unit direction of descent, rise (top y - bottom y), yTop = height of the top end, lanes: [{x, dir}], A = half width of the tube */
function esc2(id, o) {
  const yTop = o.yTop ?? 0, rise = yTop - o.yBottom, run = rise / TAN, l = Math.hypot(o.e[0], o.e[1]), e = [o.e[0] / l, o.e[1] / l];
  const yaw = Math.atan2(e[0], e[1]), bottom = { x: o.head[0] + e[0] * run, z: o.head[1] + e[1] * run };
  return { id, ...o, e, yTop, rise, run, len: run / COS, yaw, head: { x: o.head[0], z: o.head[1] }, bottom, eframe: { x: o.head[0], z: o.head[1], yaw }, FY: o.yBottom, A: o.A ?? 4.05 };
}
const L3 = [{ x: -2, dir: -1 }, { x: 0, dir: -1 }, { x: 2, dir: 1 }], L4 = [{ x: -3, dir: -1 }, { x: -1, dir: -1 }, { x: 1, dir: 1 }, { x: 3, dir: 1 }];
export const ESC2 = {};
{
  const gd = FRAMES.gostiny, ad = FRAMES.admiralteyskaya, nv = FRAMES.nevsky;
  // Gostiny Dvor own exit: axial with the hall (4 lanes), lower hall 17 m, the head in the ticket hall inside the Nevsky wing of the department store
  ESC2.gostiny = esc2('gostiny', { head: toWorld(gd, 0, 184), e: dirOf(gd, 0, -1), yBottom: gd.y, lanes: L4, A: 5.05, station: 'gostiny', frame: 'gostiny', zBottom: 87 });
  // four short escalators Nevsky chamber -> Gostiny Dvor west end (all four carry up)
  ESC2.bank = esc2('bank', { head: toWorld(gd, 0, -(GD_PZ + 0.6)), e: dirOf(gd, 0, -1), yTop: gd.y, yBottom: NV_CH.y, lanes: L4.map((l) => ({ x: l.x, dir: 1 })), A: 5.05, station: 'nevsky', frame: 'gostiny', top: true });
  // Nevsky Prospekt own exit: from the cassa hall of the underpass (y -4.5) toward the hall's south end
  ESC2.nevsky = esc2('nevsky', { head: [-1212.2, -187.8], e: dirOf(nv, 0.43, -0.9026), yTop: UNDERPASS_Y, yBottom: nv.y, lanes: L3, A: 4.05, station: 'nevsky', frame: 'nevsky' });
  // canal exit in the Engelhardt house (3 lanes): the head moved 6 m back into the house so that the first 13 m of the shaft stay inside it; descends SSE under the Nevsky roadway
  ESC2.canal = esc2('canal', { head: [-1354.7, -355.7], e: [0.236, 0.972], yBottom: NV_CH.y, lanes: L3, A: 4.05, station: 'nevsky', frame: 'nevsky' });
  // Admiralteyskaya: the big incline (4 lanes, 68.7 m rise, 137 m long; the longest escalator in Russia) runs back under the corner house toward ESE; a long gallery with a hairpin
  // returns to the small incline (15.2 m rise) that lands axially at the east end of the hall
  ESC2.adm1 = esc2('adm1', { head: [-2046.5, -407.0], e: [0.979, 0.200], yBottom: -68.7, lanes: L4, A: 5.05, bv: 6.4, station: 'admiralteyskaya', frame: 'admiralteyskaya' });
  { const foot = toWorld(ad, 0, AD_PZ + 5.0), up = dirOf(ad, 0, 1), run = 15.2 / TAN;
    ESC2.adm2 = esc2('adm2', { head: [foot[0] + up[0] * run, foot[1] + up[1] * run], e: [-up[0], -up[1]], yTop: -70.8, yBottom: ad.y, lanes: L4, A: 5.05, bv: 6.4, station: 'admiralteyskaya', frame: 'admiralteyskaya', lowerEnd: true }); }
}
// rectangular ground holes over the first SHAFT_LEN m of every street-level escalator and over the stairs of the Nevsky pits (the ground mesh of the environment skips them)
export const PITS = [   // street mouth (world), direction of descent (unit), the stairs go down 4.5 m (30 degrees: 7.8 m of run); granite parapets, a lit oval sign on the head wall
  { id: 'nevsky-pit-1', n: 1, mouth: [-1151.2, -241.1], e: [-0.9737, -0.2276], foot: [-1158.9, -242.9], side: 'S' },
  { id: 'nevsky-pit-2', n: 2, mouth: [-1196.8, -252.3], e: [0.9737, 0.2276], foot: [-1189.5, -250.6], side: 'S' },
  { id: 'nevsky-pit-3', n: 3, mouth: [-1135.7, -277.8], e: [-0.9737, -0.2276], foot: [-1144.4, -280.1], side: 'N' },
  { id: 'nevsky-pit-4', n: 4, mouth: [-1186.2, -290.0], e: [0.9737, 0.2276], foot: [-1176.7, -287.6], side: 'N' },
];

// ---- doorways of the west stations (colliders of every wall are split here by lib/massing.js; the city module cuts a gate in the facade of a house it draws; landmarksE's gallery wall gets its
// collider gap the same way). Positions are ON the wall line; rotY faces outward (to the street).
{
  const cham = [[-2030.2, -413.8], [-2025.0, -406.3]], cl = Math.hypot(cham[1][0] - cham[0][0], cham[1][1] - cham[0][1]), cu = [(cham[1][0] - cham[0][0]) / cl, (cham[1][1] - cham[0][1]) / cl];
  const onC = (t) => [cham[0][0] + cu[0] * t, cham[0][1] + cu[1] * t], rotC = Math.atan2(cu[1], -cu[0]);
  DOORWAYS.push(
    // the chamfer is 9.1 m long: the city module cuts a gate only where the facade has room (2.2 m from the ends, gates >= w + 1.2 m apart): two doors of 2.4 m (the third OSM door, the exit, shares the middle one)
    { id: 'admiralteyskaya-in', x: onC(2.55)[0], z: onC(2.55)[1], w: 2.4, rotY: rotC, station: 'admiralteyskaya', bldg: 'w52153127', kind: 'entrance', osm: 'n5464314991' },
    { id: 'admiralteyskaya-in2', x: onC(6.25)[0], z: onC(6.25)[1], w: 2.4, rotY: rotC, station: 'admiralteyskaya', bldg: 'w52153127', kind: 'entrance', osm: 'n5464314995' },
    // Gostiny Dvor: the two doors (entrance / wheelchair exit) in the back wall of the Nevsky arcade of Bolshoy Gostiny Dvor (landmarksE; the ring is 21 m deep, the gallery 4.6 m)
    { id: 'gostiny-in', x: -976.4, z: -182.6, w: 3.4, rotY: Math.atan2(0.2379, -0.9713), station: 'gostiny', bldg: 'r1147588', kind: 'entrance', osm: 'n5628361759' },
    { id: 'gostiny-out', x: -982.7, z: -184.1, w: 3.4, rotY: Math.atan2(0.2379, -0.9713), station: 'gostiny', bldg: 'r1147588', kind: 'exit', osm: 'n5628361760' },
    // the Engelhardt house (Nevsky 30 / Griboedov canal 16): arch 1 of the Nevsky front (Nevsky Prospekt-2) and the corner door on the canal (Gostiny Dvor exit 1)
    { id: 'nevsky-canal', x: -1352.4, z: -339.2, w: 3.4, rotY: Math.atan2(-0.2367, 0.9715), station: 'nevsky', bldg: 'r7034614', kind: 'entrance', osm: 'n6190780853' },
    { id: 'gostiny-canal', x: -1364.2, z: -347.0, w: 3.0, rotY: Math.atan2(-0.9795, -0.2017), station: 'nevsky', bldg: 'r7034614', kind: 'exit', osm: 'n5465360125' },
  );
}
// ground holes over the shafts of the street-level escalators and over the stairs of the Nevsky pits
for (const id of ['adm1', 'gostiny', 'canal']) { const e = ESC2[id], L = id === 'gostiny' ? SHAFT_LEN : SHAFT_LEN; SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * L / 2, z: e.head.z + e.e[1] * L / 2, w: 2 * e.A + 0.3, d: L, rotY: e.yaw, station: e.station, kind: 'escalator' }); }
for (const p of PITS) SHAFTS.push({ id: p.id + '-hole', x: p.mouth[0] + p.e[0] * 2.3, z: p.mouth[1] + p.e[1] * 2.3, w: 4.6, d: 4.6, rotY: Math.atan2(p.e[0], p.e[1]), station: 'nevsky', kind: 'stairs' });

// line 4 is the Lakhtinsko-Pravoberezhnaya line (Gorny Institut, the west end, lies outside the strip)
LINES['4'].name = 'Лахтинско-Правобережная линия'; LINES['4'].nameEn = 'Lakhtinsko-Pravoberezhnaya line';

// Real hops (docs/research/metro-ops.md section 2): m = track metres (OSM / Wikipedia; "straight-line x 1.06" where only coordinates were known), s = run time between the two
// stops in seconds (model 40 s + m / 18 m/s where no timetable exists: the official 39 km/h average with stops). Keys are 'a>b' in either order; net.hop() falls back to the
// straight chain for pairs that are missing here.
export const HOPS = {
  // line 1 (Chernyshevskaya is the north terminus, Pushkinskaya the south one)
  'chernyshevskaya>vosstaniya': { m: 1560, s: 122 }, 'vosstaniya>vladimirskaya': { m: 848, s: 87 }, 'vladimirskaya>pushkinskaya': { m: 1380, s: 112 },
  // line 2
  'gorkovskaya>nevsky': { m: 2440, s: 173 }, 'nevsky>sennaya': { m: 1060, s: 96 },
  // line 3
  'vasileostrovskaya>gostiny': { m: 3252, s: 221 }, 'gostiny>mayakovskaya': { m: 1609, s: 129 }, 'mayakovskaya>pan1': { m: 1862, s: 143 },
  // line 4
  'spasskaya>dostoevskaya': { m: 1795, s: 140 }, 'dostoevskaya>ligovsky': { m: 1006, s: 96 },
  // line 5
  'sportivnaya>admiralteyskaya': { m: 2505, s: 179 }, 'admiralteyskaya>sadovaya': { m: 1147, s: 104 },
};
// Interchanges: ids of the stations of one node, the kind of link and the walking time (s) a passenger needs (docs/research/metro-ops.md section 8)
export const TRANSFERS = [
  { ids: ['vosstaniya', 'mayakovskaya'], kind: 'passage', walk: 180, note: '4 short escalators + foot tunnel' },
  { ids: ['vladimirskaya', 'dostoevskaya'], kind: 'passage', walk: 200, note: 'passages + a 4-escalator gallery' },
  { ids: ['gostiny', 'nevsky'], kind: 'passage', walk: 120, note: 'north chamber + 4 short escalators' },
];
