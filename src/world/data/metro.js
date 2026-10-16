// Static metro tables (owned by the metro specialist). Imported by layout.js / lib/massing.js BEFORE any module builds, so: plain data + a few pure functions, no three.js.
//
//   SHAFTS    rectangles { id, x, z, w, d, rotY, station, kind } in which the street ground plane (y = 0) has NO surface because an escalator shaft opens there
//             (layout.GROUND_HOLES = SHAFTS; the environment's ground mesh skips the cells whose centre lies in a rectangle; the metro module draws its own floor + the trench).
//   DOORWAYS  openings { id, x, z, w, rotY, station, bldg } through the wall of a building that stands on the ground (the rotunda doors, a portal inside Nevsky Atrium, the
//             vestibule doors in the station wings ...): lib/massing.js addPolyColliders splits the wall colliders of EVERY building around them, so the player can walk through.
//             The facade owner (city / landmarks) draws an arch / door there (layout.DOORWAYS); the metro module draws everything behind it.
//   LINES / STATIONS   the DATA-DRIVEN network: line colours, rolling stock, the ordered stations of the WHOLE line (positions come from SUBWAY_ROUTES at runtime), depth, hall type,
//             `built` (a real hall exists in this map) and transfers. A new district = flip `built`, give the station a FRAMES row + a vestibule, see docs/METRO.md.
//   FRAMES    platform frames of the built stations: origin = the middle of the platform at street coordinates, `yaw` = rotY of the local +z axis (the direction of increasing
//             station index of its line), y = platform level. Local +x = (cos yaw, -sin yaw) in the world. Every station object is built in its own frame.
//   ESC       escalator geometry per built station (head = the street end; the shaft hole, DOORWAYS and the tunnel are derived from it).
import { define as defineVitebsky } from './metro-vitebsky.js';
import { define as defineTekhnolog } from './metro-tekhnolog.js';
import { define as defineChernyshevskaya } from './metro-chernyshevskaya.js';
import { define as defineEast } from './metro-east.js';
export const SLOPE = 30 * Math.PI / 180;
export const TAN = Math.tan(SLOPE), SIN = Math.sin(SLOPE), COS = Math.cos(SLOPE);

export const LINES = {
  '1': { id: '1', name: 'Кировско-Выборгская линия', nameEn: 'Kirovsko-Vyborgskaya line', color: '#d6083b', stock: 'baltiets', cars: 8, kmh: 37.7, to: ['Девяткино', 'Проспект Ветеранов'], toEn: ['Devyatkino', 'Prospekt Veteranov'] },
  '3': { id: '3', name: 'Невско-Василеостровская линия', nameEn: 'Nevsko-Vasileostrovskaya line', color: '#009a49', stock: 'neva', cars: 6, kmh: 36, to: ['Беговая', 'Рыбацкое'], toEn: ['Begovaya', 'Rybatskoye'] },
  '4': { id: '4', name: 'Правобережная линия', nameEn: 'Pravoberezhnaya line', color: '#ea7125', stock: '717', cars: 7, kmh: 36, to: ['Горный институт', 'Улица Дыбенко'], toEn: ['Gorny Institut', 'Ulitsa Dybenko'] },
  // west extension (docs/research/metro-west.md section 7 / 10): lines 2, 5 (built stations Nevsky Prospekt, Admiralteyskaya) and 6 (two stations, shown on the map only)
  '2': { id: '2', name: 'Московско-Петроградская линия', nameEn: 'Moskovsko-Petrogradskaya line', color: '#0078c9', stock: '717-l2', cars: 6, kmh: 38, to: ['Купчино', 'Парнас'], toEn: ['Kupchino', 'Parnas'] },
  '5': { id: '5', name: 'Фрунзенско-Приморская линия', nameEn: 'Frunzensko-Primorskaya line', color: '#6E0A78', stock: '717-l5', cars: 7, kmh: 40, to: ['Комендантский проспект', 'Шушары'], toEn: ['Komendantsky Prospekt', 'Shushary'] },
  '6': { id: '6', name: 'Красносельско-Калининская линия', nameEn: 'Krasnoselsko-Kalininskaya line', color: '#8C5646', stock: 'baltiets', cars: 8, kmh: 40, to: ['Путиловская', 'Юго-Западная'], toEn: ['Putilovskaya', 'Yugo-Zapadnaya'] },
};

// Ordered along each line (the order of the OSM route relations: line 1 Devyatkino -> Veteranov, line 3 Begovaya -> Rybatskoye, line 4 Gorny Institut -> Dybenko).
// type: pylon | column | closed | vault | shallow; depth in metres below the street (OSM / Wikipedia ru).
const S = (id, name, nameEn, depth, type, extra = {}) => ({ id, name, nameEn, depth, type, built: false, ...extra });
export const STATIONS = {
  '1': [
    S('devyatkino', 'Девяткино', 'Devyatkino', 0, 'shallow'), S('grazhdansky', 'Гражданский проспект', 'Grazhdansky Prospekt', 64, 'column'), S('akademicheskaya', 'Академическая', 'Akademicheskaya', 64, 'column'),
    S('politekhnicheskaya', 'Политехническая', 'Politekhnicheskaya', 65, 'vault'), S('muzhestva', 'Площадь Мужества', 'Ploshchad Muzhestva', 67, 'vault'), S('lesnaya', 'Лесная', 'Lesnaya', 64, 'column'),
    S('vyborgskaya', 'Выборгская', 'Vyborgskaya', 67, 'column'), S('lenina', 'Площадь Ленина', 'Ploshchad Lenina', 71, 'pylon', { note: 'Финляндский вокзал' }),
    S('chernyshevskaya', 'Чернышевская', 'Chernyshevskaya', 70, 'pylon'),
    S('vosstaniya', 'Площадь Восстания', 'Ploshchad Vosstaniya', 58, 'pylon', { built: true, transfer: ['mayakovskaya'], note: 'Московский вокзал' }),
    S('vladimirskaya', 'Владимирская', 'Vladimirskaya', 55, 'pylon', { built: true, transfer: ['dostoevskaya'] }),
    S('pushkinskaya', 'Пушкинская', 'Pushkinskaya', 57, 'pylon', { transfer: ['zvenigorodskaya'], note: 'пересадка на линию 5' }), S('tekhnolog', 'Технологический институт', 'Tekhnologichesky Institut', 60, 'column', { transfer: ['tekhnolog2'], note: 'пересадка на линию 2' }),
    // (Kirovsky Zavod <-> Putilovskaya, line 6, is listed in the line-6 table below)
    S('baltiyskaya', 'Балтийская', 'Baltiyskaya', 47, 'column'), S('narvskaya', 'Нарвская', 'Narvskaya', 52, 'pylon'), S('kirovsky', 'Кировский завод', 'Kirovsky Zavod', 50, 'column', { transfer: ['putilovskaya'] }),
    S('avtovo', 'Автово', 'Avtovo', 12, 'shallow'), S('leninsky', 'Ленинский проспект', 'Leninsky Prospekt', 8, 'shallow'), S('veteranov', 'Проспект Ветеранов', 'Prospekt Veteranov', 8, 'shallow'),
  ],
  '3': [
    S('begovaya', 'Беговая', 'Begovaya', 17, 'shallow'), S('zenit', 'Зенит', 'Zenit', 17, 'shallow'), S('primorskaya', 'Приморская', 'Primorskaya', 68, 'column'),
    S('vasileostrovskaya', 'Василеостровская', 'Vasileostrovskaya', 64, 'closed'), S('gostiny', 'Гостиный двор', 'Gostiny Dvor', 56, 'closed', { built: true, transfer: ['nevsky'], note: 'пересадка на «Невский проспект»' }),
    S('mayakovskaya', 'Маяковская', 'Mayakovskaya', 51, 'pylon', { built: true, transfer: ['vosstaniya'] }),
    S('pan1', 'Площадь Александра Невского 1', 'Ploshchad Aleksandra Nevskogo 1', 54, 'closed', { transfer: ['pan2'] }),
    S('elizarovskaya', 'Елизаровская', 'Yelizarovskaya', 62, 'closed'), S('lomonosovskaya', 'Ломоносовская', 'Lomonosovskaya', 65, 'closed'), S('proletarskaya', 'Пролетарская', 'Proletarskaya', 72, 'column'),
    S('obukhovo', 'Обухово', 'Obukhovo', 62, 'vault'), S('rybatskoye', 'Рыбацкое', 'Rybatskoye', 0, 'shallow'),
  ],
  '4': [
    S('gorny', 'Горный институт', 'Gorny Institut', 71, 'pylon'), S('spasskaya', 'Спасская', 'Spasskaya', 60, 'pylon', { transfer: ['sennaya', 'sadovaya'], note: 'пересадка на линии 2 и 5' }),
    S('dostoevskaya', 'Достоевская', 'Dostoyevskaya', 62, 'column', { built: true, transfer: ['vladimirskaya'], note: 'пока через общий зал' }),
    S('ligovsky', 'Лиговский проспект', 'Ligovsky Prospekt', 66, 'vault'), S('pan2', 'Площадь Александра Невского 2', 'Ploshchad Aleksandra Nevskogo 2', 60, 'column', { transfer: ['pan1'] }),
    S('novocherkasskaya', 'Новочеркасская', 'Novocherkasskaya', 61, 'vault'), S('ladozhskaya', 'Ладожская', 'Ladozhskaya', 61, 'vault'), S('bolshevikov', 'Проспект Большевиков', 'Prospekt Bolshevikov', 68, 'column'),
    S('dybenko', 'Улица Дыбенко', 'Ulitsa Dybenko', 61, 'vault'),
  ],
  // line 2 (OSM r2446051 Kupchino -> Parnas; Park Pobedy is closed 29 Jun 2025 - Aug 2027 and is not in the relation: it carries its own position and is skipped by the trains)
  '2': [
    S('kupchino', 'Купчино', 'Kupchino', 0, 'shallow'), S('zvezdnaya', 'Звёздная', 'Zvyozdnaya', 22, 'column'), S('moskovskaya', 'Московская', 'Moskovskaya', 29, 'column'),
    S('parkpobedy', 'Парк Победы', 'Park Pobedy', 35, 'column', { closed: true, pos: [-1665, 7220], note: 'закрыта на реконструкцию' }),
    S('elektrosila', 'Электросила', 'Elektrosila', 35, 'column'), S('moskovskiye', 'Московские ворота', 'Moskovskiye Vorota', 35, 'column'), S('tekhnolog2', 'Технологический институт 2', 'Tekhnologichesky Institut 2', 60, 'pylon', { transfer: ['tekhnolog'] }),
    S('sennaya', 'Сенная площадь', 'Sennaya Ploshchad', 55, 'pylon', { transfer: ['sadovaya', 'spasskaya'] }),
    S('nevsky', 'Невский проспект', 'Nevsky Prospekt', 63, 'pylon', { built: true, transfer: ['gostiny'], note: 'пересадка на «Гостиный двор»' }),
    S('gorkovskaya', 'Горьковская', 'Gorkovskaya', 53, 'pylon'), S('petrogradskaya', 'Петроградская', 'Petrogradskaya', 53, 'pylon'), S('chernaya', 'Чёрная речка', 'Chyornaya Rechka', 67, 'pylon'),
    S('pionerskaya', 'Пионерская', 'Pionerskaya', 67, 'pylon'), S('udelnaya', 'Удельная', 'Udelnaya', 64, 'pylon'), S('ozerki', 'Озерки', 'Ozerki', 59, 'pylon'),
    S('prosvescheniya', 'Проспект Просвещения', 'Prospekt Prosveshcheniya', 65, 'pylon'), S('parnas', 'Парнас', 'Parnas', 0, 'shallow'),
  ],
  // line 5 (OSM r2446058 Komendantsky Prospekt -> Shushary)
  '5': [
    S('komendantsky', 'Комендантский проспект', 'Komendantsky Prospekt', 75, 'vault'), S('staraya', 'Старая Деревня', 'Staraya Derevnya', 61, 'vault'), S('krestovsky', 'Крестовский остров', 'Krestovsky Ostrov', 49, 'vault'),
    S('chkalovskaya', 'Чкаловская', 'Chkalovskaya', 60, 'vault'), S('sportivnaya', 'Спортивная', 'Sportivnaya', 64, 'vault'),
    S('admiralteyskaya', 'Адмиралтейская', 'Admiralteyskaya', 86, 'column', { built: true, note: 'самая глубокая станция России' }),
    S('sadovaya', 'Садовая', 'Sadovaya', 71, 'vault', { transfer: ['sennaya', 'spasskaya'] }), S('zvenigorodskaya', 'Звенигородская', 'Zvenigorodskaya', 57, 'vault', { transfer: ['pushkinskaya'] }),
    S('obvodny', 'Обводный канал', 'Obvodny Kanal', 61, 'vault'), S('volkovskaya', 'Волковская', 'Volkovskaya', 61, 'vault'), S('bukharestskaya', 'Бухарестская', 'Bukharestskaya', 65, 'vault'),
    S('mezhdunarodnaya', 'Международная', 'Mezhdunarodnaya', 65, 'vault'), S('slavy', 'Проспект Славы', 'Prospekt Slavy', 59, 'vault'), S('dunayskaya', 'Дунайская', 'Dunayskaya', 17, 'shallow'),
    S('shushary', 'Шушары', 'Shushary', 0, 'shallow'),
  ],
  // line 6 (opened 26 Dec 2025, no route relation in the data: two stations with their own positions; shown on the map, not reachable)
  '6': [
    S('putilovskaya', 'Путиловская', 'Putilovskaya', 58, 'vault', { transfer: ['kirovsky'], pos: [-4969, 6092] }), S('yugozapadnaya', 'Юго-Западная', 'Yugo-Zapadnaya', 56, 'vault', { pos: [-6707, 8065] }),
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

// ================================================================================================================================================================================
// PETROGRAD SIDE (docs/research/metro-petro.md, docs/METRO.md): Gorkovskaya + Petrogradskaya (line 2, -53 m), Sportivnaya (line 5, two levels: -57.4 / -64 m), Chkalovskaya (line 5, -60 m).
// Frames: PCA of the OSM platform polygons (w192995787 + w1436943639, w104591876, w663951203, r4069761). All four inclines are AXIAL with their hall, as the OSM escalator ways are
// (w192995779 / w585987170, w192995777 / w585987173, w350460694, w192964815): the head is derived from the hall end + the lower landing + run (rise / tan 30).
// ================================================================================================================================================================================
export const GK_PZ = 60.5, PG_PZ = 62, SP_PZ = 80, CK_PZ = 76, SP_UY = -5.0, SP_RISE = 6.6;
// Gorkovskaya: the round pavilion w85416499 as landmarksKronverk/gorkovskaya.js builds it (the "flying saucer": stylobate R 22.6 with its top at 1.4 m, glazed drum R 13.4; centre = the vertex average of
// the footprint; dE / dX = the directions from the centre to the OSM entrance / exit nodes). The vestibule floor (FY) lies 5 cm over the stylobate; the head of the incline 6.3 m NNW of the centre, so
// that the whole 13 m mouth is inside the drum. The hall frame is slid 10.6 m along its own axis (from the OSM platform centre (-1779.45, -2532.85)) so that the foot still lands 18.5 m north of
// the platform centre: in the north end of the SHORTENED central hall.
export const GK_PAV = { x: -1818.32, z: -2642.83, RS: 22.6, YS: 1.4, RD: 13.4, FY: 1.45, dE: [-0.0962, -0.9954], dX: [0.9545, -0.2982], head: 6.3, steps: 2.88 };
export const GK_FOOT = 18.5, GK_HEAD = GK_FOOT + (GK_PAV.YS + 53) / TAN;                                // local z of the foot / the head of the incline (its top is the stylobate level, 5 cm under the vestibule floor: no coplanar faces)
{ const u = [-0.3256, -0.9455], hx = GK_PAV.x + u[0] * GK_PAV.head, hz = GK_PAV.z + u[1] * GK_PAV.head;
  FRAMES.gorkovskaya = { x: hx - u[0] * GK_HEAD, z: hz - u[1] * GK_HEAD, yaw: Math.atan2(u[0], u[1]), y: -53, len: 2 * GK_PZ, line: '2' }; }       // +z NNW toward Petrogradskaya: the pavilion in Alexander Park lies on this side
FRAMES.petrogradskaya = { x: -2149.2, z: -3619.4, yaw: Math.atan2(-0.3665, -0.9304), y: -53, len: 2 * PG_PZ, line: '2' };      // +z NNW toward Chyornaya Rechka: the House of Fashion lies on this side
FRAMES.chkalovskaya = { x: -3290.8, z: -2997.3, yaw: Math.atan2(0.094, 0.9956), y: -60, len: 2 * CK_PZ, line: '5' };           // +z S toward Sportivnaya; the incline hangs on the -z (north) end
FRAMES.sportivnaya = { x: -3478.9, z: -1973.4, yaw: Math.atan2(-0.5372, 0.8435), y: -64, yUpper: -64 + SP_RISE, len: 2 * SP_PZ, line: '5' };   // +z SW toward Admiralteyskaya; y = the LOWER level (southbound), yUpper = the upper level (northbound, the way out)
{
  const gk = FRAMES.gorkovskaya, pg = FRAMES.petrogradskaya, ck = FRAMES.chkalovskaya, sp = FRAMES.sportivnaya;
  ESC2.gorkovskaya = esc2('gorkovskaya', { head: toWorld(gk, 0, GK_HEAD), e: dirOf(gk, 0, -1), yTop: GK_PAV.YS, yBottom: gk.y, lanes: L3, A: 4.05, station: 'gorkovskaya', frame: 'gorkovskaya' });
  ESC2.petrogradskaya = esc2('petrogradskaya', { head: toWorld(pg, 0, 163.5), e: dirOf(pg, 0, -1), yBottom: pg.y, lanes: L3, A: 4.05, station: 'petrogradskaya', frame: 'petrogradskaya' });
  ESC2.chkalovskaya = esc2('chkalovskaya', { head: toWorld(ck, 0, -(CK_PZ + 8 - ck.y / TAN)), e: dirOf(ck, 0, 1), yBottom: ck.y, lanes: L3, A: 4.05, station: 'chkalovskaya', frame: 'chkalovskaya' });      // 8 m of landing in front of the platform: the head lies in the middle of the pavilion
  // Sportivnaya: from the UNDERGROUND vestibule (floor -5) to the north end of the upper level; 4 lanes; 8 m of landing in front of the platform
  { const run = (SP_UY - sp.yUpper) / TAN;
    ESC2.sportivnaya = esc2('sportivnaya', { head: toWorld(sp, 0, -(SP_PZ + 8 + run)), e: dirOf(sp, 0, 1), yTop: SP_UY, yBottom: sp.yUpper, lanes: L4, A: 4.5, station: 'sportivnaya', frame: 'sportivnaya' }); }      // A 4.5: the tube passes between the running tunnels (tracks at +-7.9)
}
// the three street stairs of the underground vestibule of Sportivnaya that stand on open pavement (OSM steps w71080949 = 1, w71080946 = 4, w71080945 = 5; stairs 2 and 3 lie under `roof` buildings):
// mouth = the top node, e = unit direction of descent, run = plan length to the foot (5 m down), open = the open part of the stairwell (ground hole)
export const SPORT_PITS = [
  { id: 'sportivnaya-pit-1', n: 1, mouth: [-3392.0, -2157.1], e: [0.5909, -0.8068], run: 17.6, open: 10.4, w: 4.4 },
  { id: 'sportivnaya-pit-4', n: 4, mouth: [-3315.7, -2148.2], e: [-0.8880, -0.4598], run: 15.9, open: 10.4, w: 4.4 },
  { id: 'sportivnaya-pit-5', n: 5, mouth: [-3332.7, -2134.5], e: [-0.2932, -0.9560], run: 15.7, open: 10.4, w: 4.4 },
];
DOORWAYS.push(
  // Gorkovskaya: the two door bays of the glazed drum of the saucer (on the drum line, at the stylobate level 1.4 m)
  { id: 'gorkovskaya-in', x: GK_PAV.x + GK_PAV.dE[0] * GK_PAV.RD, z: GK_PAV.z + GK_PAV.dE[1] * GK_PAV.RD, w: 4.4, rotY: Math.atan2(GK_PAV.dE[0], GK_PAV.dE[1]), station: 'gorkovskaya', bldg: 'w85416499', kind: 'entrance', osm: 'n990212227', noTotem: true, y: GK_PAV.YS },
  { id: 'gorkovskaya-out', x: GK_PAV.x + GK_PAV.dX[0] * GK_PAV.RD, z: GK_PAV.z + GK_PAV.dX[1] * GK_PAV.RD, w: 4.4, rotY: Math.atan2(GK_PAV.dX[0], GK_PAV.dX[1]), station: 'gorkovskaya', bldg: 'w85416499', kind: 'exit', osm: 'n946973293', noTotem: true, y: GK_PAV.YS },
  // Petrogradskaya: the glass doors in the Kamennoostrovsky front of the House of Fashion r1256096 (landmarksKamennoostrovsky draws the front, the board and the «М»)
  { id: 'petrogradskaya-in', x: -2227.1, z: -3771.0, w: 4.5, rotY: Math.atan2(-0.9073, 0.4205), station: 'petrogradskaya', bldg: 'r1256096', kind: 'entrance', osm: 'n268479754', noTotem: true },
  // Chkalovskaya: the pavilion w50064533 at Bolshaya Zelenina / Chkalovsky pr. (entrance in the west wall, exit in the north-east wall)
  { id: 'chkalovskaya-in', x: -3325.8, z: -3187.0, w: 3.4, rotY: Math.atan2(-0.892, -0.452), station: 'chkalovskaya', bldg: 'w50064533', kind: 'entrance', osm: 'n1933529453', noTotem: true },
  { id: 'chkalovskaya-out', x: -3297.6, z: -3188.4, w: 3.4, rotY: Math.atan2(0.743, -0.669), station: 'chkalovskaya', bldg: 'w50064533', kind: 'exit', osm: 'n353927287', noTotem: true },
);
for (const id of ['gorkovskaya', 'petrogradskaya', 'chkalovskaya']) { const e = ESC2[id]; SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * SHAFT_LEN / 2, z: e.head.z + e.e[1] * SHAFT_LEN / 2, w: 2 * e.A + 0.3, d: SHAFT_LEN, rotY: e.yaw, station: e.station, kind: 'escalator' }); }
for (const p of SPORT_PITS) SHAFTS.push({ id: p.id + '-hole', x: p.mouth[0] + p.e[0] * p.open / 2, z: p.mouth[1] + p.e[1] * p.open / 2, w: p.w + 0.6, d: p.open, rotY: Math.atan2(p.e[0], p.e[1]), station: 'sportivnaya', kind: 'stairs' });
for (const id of ['gorkovskaya', 'petrogradskaya', 'sportivnaya', 'chkalovskaya']) for (const l of ['2', '5']) { const s = STATIONS[l].find((q) => q.id === id); if (s) s.built = true; }
{ const s = STATIONS['2'].find((q) => q.id === 'petrogradskaya'); s.type = 'closed'; }

// ================================================================================================================================================================================
// VASILIEVSKY ISLAND (docs/research/vo-roster-metro.md, docs/METRO.md "Vasilievsky Island", requests: docs/research/vo-requests-metro.md)
//   Vasileostrovskaya (line 3, -64 m, closed type, 1967): axial 3-lane incline to the ONE pavilion w183122885 (Sredny pr. 32 / 7th line), floor 11 steps (1.65 m) over the street
//   Gorny Institut (line 4, -70 m, pylon hall, 2024): axial 4-lane incline to an underground ticket hall (-7 m) under Bolshoy pr. / Kosaya liniya, two small pavilions with a stair + an escalator
//   Sportivnaya-2 (line 5, 2015): the island vestibule of Sportivnaya: a 250 m tunnel with two travelator flights (7 degrees) from the lower hall, a 4-lane escalator to the ticket hall (-7 m),
//     five exits: two oval pavilions (exits 6 and 7, stair + two escalators) and three stair pits (8, 9, 10)
// Frames come from the OSM platform polygons (dossier section 2); inclines are AXIAL with their hall (as the OSM ways are), heads derived from the hall end + landing + run (rise / tan 30).
// ================================================================================================================================================================================
export const VO_PZ = 60.5, VO_FLOOR = 1.65, VO_LAND = 3.0, GN_PZ = 92.25, GN_LAND = 3.0, GN_UY = -7, S2_UY = -7, S2_FOOT = -35.3;
FRAMES.vasileostrovskaya = { x: -4247.7, z: -1199.1, yaw: 1.1688, y: -64, len: 2 * VO_PZ, line: '3' };                       // axis WNW -> ESE (+z toward Gostiny Dvor); the incline hangs on the +z end
FRAMES.gorny = { x: -4894.0, z: 138.4, yaw: 0.7885, y: -70, len: 2 * GN_PZ, line: '4' };                              // axis NW -> SE (+z toward Spasskaya); the incline hangs on the -z end
{
  const vo = FRAMES.vasileostrovskaya, gn = FRAMES.gorny, sp = FRAMES.sportivnaya;
  ESC2.vasileostrovskaya = esc2('vasileostrovskaya', { head: toWorld(vo, 0, VO_PZ + VO_LAND + (VO_FLOOR - vo.y) / TAN), e: dirOf(vo, 0, -1), yTop: VO_FLOOR, yBottom: vo.y, lanes: L3, A: 4.05, station: 'vasileostrovskaya', frame: 'vasileostrovskaya' });
  ESC2.gorny = esc2('gorny', { head: toWorld(gn, 0, -(GN_PZ + GN_LAND + (GN_UY - gn.y) / TAN)), e: dirOf(gn, 0, 1), yTop: GN_UY, yBottom: gn.y, lanes: L4, A: 5.05, station: 'gorny', frame: 'gorny' });
  // Sportivnaya-2: the 4-lane escalator from the end of the travelators (foot at the OSM point (-3700, -1685), -35.3 m) up to the ticket hall (-7 m); descent toward ESE
  { const run = (S2_UY - S2_FOOT) / TAN, e = [0.866, 0.5];
    ESC2.sport2 = esc2('sport2', { head: [-3700 - e[0] * run, -1685 - e[1] * run], e, yTop: S2_UY, yBottom: S2_FOOT, lanes: L4, A: 5.05, station: 'sportivnaya2', frame: 'sportivnaya' }); }
  void sp;
}
// the shaft of the Vasileostrovskaya incline (ground hole inside the pavilion; the floor of the pavilion is 1.65 m over the street)
SHAFTS.push({ id: 'vasileostrovskaya-shaft', x: ESC2.vasileostrovskaya.head.x + ESC2.vasileostrovskaya.e[0] * SHAFT_LEN / 2, z: ESC2.vasileostrovskaya.head.z + ESC2.vasileostrovskaya.e[1] * SHAFT_LEN / 2, w: 2 * ESC2.vasileostrovskaya.A + 0.3, d: SHAFT_LEN, rotY: ESC2.vasileostrovskaya.yaw, station: 'vasileostrovskaya', kind: 'escalator' });

// ---- pavilion WELLS: a stair flight + 1-2 escalators from the floor of a small pavilion (0.05) down to the underground ticket hall (-7 m), along the long axis of the building, descending away
// from the door. door = the OSM entrance node snapped to the wall, u = unit direction of descent (building long axis), lobby = metres from the wall to the head, open = the length of the floor
// opening (the first part of the flight; the rest lies under the street), lanes = escalator lanes (x lateral in the well frame, dir -1 down / +1 up), stairX = centre of the stair flight.
export const WELL_DEPTH = 7.0;
export const WELLS = [
  { id: 'gorny-in', station: 'gorny', bldg: 'w1305590665', kind: 'entrance', door: [-5057.89, 12.22], u: [0.5030, 0.8643], lobby: 3.2, open: 10.6, lanes: [{ x: 1.0, dir: -1 }], stairX: -1.45, stairW: 2.3, A: 2.7, lat: 0.2 },
  { id: 'gorny-out', station: 'gorny', bldg: 'w1305590664', kind: 'exit', door: [-5024.66, -25.56], u: [0.8660, -0.5000], lobby: 3.2, open: 10.6, lanes: [{ x: 1.0, dir: 1 }], stairX: -1.45, stairW: 2.3, A: 2.7, lat: 0.2 },
  { id: 'sportivnaya2-6', station: 'sportivnaya2', bldg: 'w627859233', kind: 'entrance', door: [-3758.5, -1677.7], u: [0.8090, -0.5878], lobby: 3.6, open: 10.4, lanes: [{ x: 0.8, dir: -1 }, { x: 2.1, dir: 1 }], stairX: -1.9, stairW: 2.6, A: 3.6, lat: 0.0 },
  { id: 'sportivnaya2-7', station: 'sportivnaya2', bldg: 'w627859229', kind: 'entrance', door: [-3792.0, -1699.6], u: [-0.2079, -0.9781], lobby: 3.4, open: 10.4, lanes: [{ x: 0.8, dir: -1 }, { x: 2.1, dir: 1 }], stairX: -1.9, stairW: 2.6, A: 3.6, lat: 0.0 },
];
for (const w of WELLS) {
  const yaw = Math.atan2(w.u[0], w.u[1]), c = Math.cos(yaw), s = Math.sin(yaw), lat = w.lat ?? 0;
  w.yaw = yaw; w.head = [w.door[0] + w.u[0] * w.lobby + c * lat, w.door[1] + w.u[1] * w.lobby - s * lat];                  // the top of the flight (world); x' = (cos yaw, -sin yaw), z' = u
  w.run = WELL_DEPTH / TAN; w.foot = [w.head[0] + w.u[0] * w.run, w.head[1] + w.u[1] * w.run];
  SHAFTS.push({ id: w.id + '-hole', x: w.head[0] + w.u[0] * w.open / 2, z: w.head[1] + w.u[1] * w.open / 2, w: 2 * w.A + 0.3, d: w.open, rotY: yaw, station: w.station, kind: 'stairs' });
}
// the three street stairs (pits 8, 9, 10) of Sportivnaya-2: mouth = the OSM entrance node, e = descent (toward the underground hub), 7 m down
export const VO_PITS = [
  { id: 'sportivnaya2-pit-8', n: 8, mouth: [-3804.7, -1768.5], e: [0.9320, 0.3630], run: 14.0, open: 10.4, w: 4.4 },
  { id: 'sportivnaya2-pit-9', n: 9, mouth: [-3765.5, -1754.7], e: [0.9397, -0.3420], run: 14.0, open: 10.4, w: 4.4 },
  { id: 'sportivnaya2-pit-10', n: 10, mouth: [-3713.4, -1717.5], e: [-0.6428, -0.7660], run: 14.0, open: 10.4, w: 4.4 },
];
for (const p of VO_PITS) SHAFTS.push({ id: p.id + '-hole', x: p.mouth[0] + p.e[0] * p.open / 2, z: p.mouth[1] + p.e[1] * p.open / 2, w: p.w + 0.6, d: p.open, rotY: Math.atan2(p.e[0], p.e[1]), station: 'sportivnaya2', kind: 'stairs' });
// doorways: the OSM entrance / exit nodes snapped to the walls of the pavilions (rotY faces outward). The pavilion owners (landmarksAndrew, landmarksSredny, landmarksMakarova) cut an opening there.
DOORWAYS.push(
  { id: 'vasileostrovskaya-in', x: -4072.88, z: -1140.65, w: 4.4, rotY: 2.1060, station: 'vasileostrovskaya', bldg: 'w183122885', kind: 'entrance', osm: 'n2045866983' },
  { id: 'vasileostrovskaya-out', x: -4089.10, z: -1147.70, w: 4.4, rotY: -2.6047, station: 'vasileostrovskaya', bldg: 'w183122885', kind: 'exit', osm: 'n2045866996' },
  { id: 'gorny-in', x: -5057.89, z: 12.22, w: 4.4, rotY: -2.6224, station: 'gorny', bldg: 'w1305590665', kind: 'entrance', osm: 'n12456266888' },
  { id: 'gorny-out', x: -5024.66, z: -25.56, w: 4.4, rotY: -1.0347, station: 'gorny', bldg: 'w1305590664', kind: 'exit', osm: 'n12456266895' },
  { id: 'sportivnaya2-6', x: -3758.5, z: -1677.7, w: 4.4, rotY: -0.9100, station: 'sportivnaya2', bldg: 'w627859233', kind: 'entrance', osm: 'n3566607199' },
  { id: 'sportivnaya2-7', x: -3792.0, z: -1699.6, w: 4.4, rotY: 0.2300, station: 'sportivnaya2', bldg: 'w627859229', kind: 'entrance', osm: 'n5927391593' },
);
// the network: the three stations are built; line 4 is now the Lakhtinsko-Pravoberezhnaya line, Gorny Institut lies 70 m down (docs/research/vo-roster-metro.md section 2.2)
LINES['4'].name = 'Лахтинско-Правобережная линия'; LINES['4'].nameEn = 'Lakhtinsko-Pravoberezhnaya line';
for (const [l, id] of [['3', 'vasileostrovskaya'], ['4', 'gorny']]) { const s = STATIONS[l].find((q) => q.id === id); if (s) { s.built = true; if (id === 'gorny') { s.depth = 70; s.note = 'Горный институт: самая глубокая станция линии 4'; } } }

// Real hops (docs/research/metro-ops.md section 2): m = track metres (OSM / Wikipedia; "straight-line x 1.06" where only coordinates were known), s = run time between the two
// stops in seconds (model 40 s + m / 18 m/s where no timetable exists: the official 39 km/h average with stops). Keys are 'a>b' in either order; net.hop() falls back to the
// straight chain for pairs that are missing here.
export const HOPS = {
  // line 1
  'chernyshevskaya>vosstaniya': { m: 1560, s: 122 }, 'vosstaniya>vladimirskaya': { m: 848, s: 87 }, 'vladimirskaya>pushkinskaya': { m: 1380, s: 112 }, 'pushkinskaya>tekhnolog': { m: 820, s: 83 },
  'lenina>chernyshevskaya': { m: 1650, s: 140 },
  // line 2
  'chernaya>petrogradskaya': { m: 2330, s: 162 }, 'petrogradskaya>gorkovskaya': { m: 1260, s: 106 }, 'gorkovskaya>nevsky': { m: 2440, s: 173 }, 'nevsky>sennaya': { m: 1060, s: 96 }, 'sennaya>tekhnolog2': { m: 1270, s: 107 },
  // line 3
  'primorskaya>vasileostrovskaya': { m: 2181, s: 161 }, 'vasileostrovskaya>gostiny': { m: 3252, s: 221 }, 'gostiny>mayakovskaya': { m: 1609, s: 129 }, 'mayakovskaya>pan1': { m: 1862, s: 143 },
  // line 4 (Gorny -> Spasskaya passes the unopened Teatralnaya without a stop)
  'gorny>spasskaya': { m: 3628, s: 240 }, 'spasskaya>dostoevskaya': { m: 1795, s: 140 }, 'dostoevskaya>ligovsky': { m: 1006, s: 96 }, 'ligovsky>pan2': { m: 1500, s: 123 },
  // line 5
  'krestovsky>chkalovskaya': { m: 2280, s: 167 }, 'chkalovskaya>sportivnaya': { m: 1077, s: 100 }, 'sportivnaya>admiralteyskaya': { m: 2505, s: 179 }, 'admiralteyskaya>sadovaya': { m: 1147, s: 104 }, 'sadovaya>zvenigorodskaya': { m: 1292, s: 112 },
};
// Interchanges: ids of the stations of one node, the kind of link and the walking time (s) a passenger needs (docs/research/metro-ops.md section 8)
export const TRANSFERS = [
  { ids: ['vosstaniya', 'mayakovskaya'], kind: 'passage', walk: 180, note: '4 short escalators + foot tunnel' },
  { ids: ['vladimirskaya', 'dostoevskaya'], kind: 'passage', walk: 200, note: 'passages + a 4-escalator gallery' },
  { ids: ['gostiny', 'nevsky'], kind: 'passage', walk: 120, note: 'north chamber + 4 short escalators' },
  { ids: ['sennaya', 'sadovaya', 'spasskaya'], kind: 'passage', walk: 180, note: 'triple node, passages 1991 / 2009' },
  { ids: ['pushkinskaya', 'zvenigorodskaya'], kind: 'passage', walk: 150, note: '2008 passage' },
  { ids: ['tekhnolog', 'tekhnolog2'], kind: 'cross-platform', walk: 20, note: 'same hall, other side of the platform' },
  { ids: ['pan1', 'pan2'], kind: 'passage', walk: 150 },
  { ids: ['kirovsky', 'putilovskaya'], kind: 'passage', walk: 150 },
];

// ==== SENNAYA HUB (docs/research/metro-south-sennaya.md) ====
// Sennaya Ploshchad (line 2, pylon, -55 m), Sadovaya (line 5, single vault, -71 m), Spasskaya (line 4, pylon, -60 m) and their passages; builders: metro/hub-sennaya.js (st-sennaya.js,
// st-sadovaya.js, st-spasskaya.js), real tunnels: metro/links-south.js. Frames = the PCA of the OSM platform polygons r8276303 / r8362431 / w195207957 as
// docs/research/metro-frames-south-east.md gives them (tools/metro-frames.mjs; the yaws of dossier section 2 differ by up to 0.8 deg; with them the Sennaya incline is axial: its mouth fits the tail). len = the BUILT hall (2 x PZ): Sennaya the whole OSM
// platform (119 m), Sadovaya 160 m of the 196 m OSM vault (the trains use ~140 m; the turn-back dead end beyond the north end is not built), Spasskaya the 162 m platform of Wikipedia (OSM 174.6 m). +z points to the higher station index: Sennaya -> Nevsky (NNE), Sadovaya -> Zvenigorodskaya (SSW), Spasskaya -> Dostoevskaya (SE).
//   Sennaya    SHORTENED central hall (the OSM platform polygon is split north of local z +23: the incline climbs between the platform tunnels, as at Gorkovskaya); the 3-lane incline rises axially to
//              the narrow tail of the L-shaped pavilion w39036403 (the 12.5 m mouth fills the tail); the sunk stairwell in the middle of the central hall (the two OSM holes at local z -18) and the
//              arched opening in the south end wall are the two transfers.
//   Sadovaya   the S-shaped exit passage leaves the north end wall up a 5.6 m stair (over the running tunnels), turns west and back south to the foot of the 3-lane incline that climbs SSW to the
//              cassa hall of the underpass under Sennaya square (-4.5 m, UNDERPASS_Y); four stair pits (OSM refs 1-4); the sunk stairwell in the middle (the two OSM holes) leads to the lower
//              hall of the Spasskaya transfer (-76.2 m, under the west track); the 4-lane bank from the Sennaya passage lands axially at the south end.
//   Spasskaya  the Sadovaya passage and the way out both start in the RELIEF HALL (-55.4 m) over the running tunnel just beyond the north-west end wall (a stair of 4.6 m rises to it through the
//              end wall); the 4-lane exit incline climbs east (its OSM foot lies 54 m off the hall axis) to the pavilion w245455781; the 4-lane bank from the Sennaya passage lands axially at the SE end.
// Deviations (docs/METRO.md "Sennaya hub"): the real Spasskaya exit leaves the hall 47 m from the NW end and crosses the NE track at an unknown level: here it starts in the relief hall; the
// unlabelled fifth stair of Sadovaya (n2056804599, -1861.4 / 613.9) lies on the carriageway of Sennaya square (it is an underground node, layer -1): no pit there.
export const SN_PZ = 59.6, SD_PZ = 80, SS_PZ = 81;                                     // half lengths of the three halls (Sennaya OSM 119 m; Sadovaya 160 m of the 196 m vault; Spasskaya 162 m)
export const SN_HEAD = 99.0, SN_HOLE = 12.5;                                           // Sennaya: local z of the head of the incline (the mouth fills the tail of the pavilion) and the mouth length
export const SN_SAD_Y = -60.5, SN_SPA_Y = -48.5, SD_LOW_Y = -76.2, SD_UP_Y = -65.4, SS_REL_Y = -55.4;   // passage levels: Sennaya well / Sennaya-Spasskaya / Sadovaya lower hall / Sadovaya exit passage / Spasskaya relief hall
FRAMES.sennaya = { x: -1743.35, z: 700.04, yaw: 2.9789, y: -55, len: 2 * SN_PZ, line: '2' };       // +z NNE toward Nevsky Prospekt; local +x = WEST
FRAMES.sadovaya = { x: -1786.53, z: 558.69, yaw: -0.1301, y: -71, len: 2 * SD_PZ, line: '5' };     // +z SSW toward Zvenigorodskaya; local +x = east
FRAMES.spasskaya = { x: -1882.72, z: 680.07, yaw: 0.6569, y: -60, len: 2 * SS_PZ, line: '4' };     // +z SE toward Dostoevskaya; local +x = ENE
{
  const sn = FRAMES.sennaya, sd = FRAMES.sadovaya, ss = FRAMES.spasskaya;
  // the three ways out
  ESC2.sennaya = esc2('sennaya', { head: toWorld(sn, 0, SN_HEAD), e: dirOf(sn, 0, -1), yBottom: sn.y, lanes: L3, A: 4.05, station: 'sennaya', frame: 'sennaya', holeLen: SN_HOLE });
  ESC2.sadovaya = esc2('sadovaya', { head: [-1849.0, 582.0], e: [0.330, -0.944], yTop: UNDERPASS_Y, yBottom: SD_UP_Y, lanes: L3, A: 4.05, station: 'sadovaya', frame: 'sadovaya' });      // the OSM head of the incline: descends NNE
  ESC2.spasskaya = esc2('spasskaya', { head: [-1757.0, 630.0], e: [-1, 0], yBottom: SS_REL_Y, lanes: L4, A: 5.05, station: 'spasskaya', frame: 'spasskaya' });                         // climbs due east to the pavilion
  // the three transfer banks (4 lanes, two down, two up); head = the upper end
  { const run = (SN_SAD_Y - sd.y) / TAN; ESC2.senSad = esc2('senSad', { head: toWorld(sd, 0, SD_PZ + 4.6 + run), e: dirOf(sd, 0, -1), yTop: SN_SAD_Y, yBottom: sd.y, lanes: L4, A: 5.05, station: 'sadovaya', frame: 'sadovaya' }); }
  { const run = (SS_REL_Y - SD_LOW_Y) / TAN, foot = toWorld(sd, -30.1, -0.4), up = dirOf(sd, -0.863, 0.505);
    ESC2.sadSpa = esc2('sadSpa', { head: [foot[0] + up[0] * run, foot[1] + up[1] * run], e: [-up[0], -up[1]], yTop: SS_REL_Y, yBottom: SD_LOW_Y, lanes: L4, A: 5.05, station: 'sadovaya', frame: 'sadovaya' }); }
  { const run = (SN_SPA_Y - ss.y) / TAN; ESC2.senSpa = esc2('senSpa', { head: toWorld(ss, 0, SS_PZ + 4.6 + run), e: dirOf(ss, 0, -1), yTop: SN_SPA_Y, yBottom: ss.y, lanes: L4, A: 5.05, station: 'spasskaya', frame: 'spasskaya' }); }
}
// the four street stairs of the Sadovaya underpass (OSM entrance nodes refs 1-4): mouth = the node, e = unit direction of descent (toward the arm of the underpass), 4.5 m down at 30 degrees,
// open = the ground hole (the rest of the flight runs under the pavement), w = the flight width. None of the holes touches a carriageway or the water (checked in node and at build time).
export const SD_PITS = [
  { id: 'sadovaya-pit-1', n: 1, mouth: [-1862.9, 678.0], e: [0.786, -0.618], run: 7.8, open: 5.2, w: 3.6, osm: 'n923969835' },
  { id: 'sadovaya-pit-2', n: 2, mouth: [-1828.3, 649.1], e: [-0.784, 0.622], run: 7.8, open: 5.2, w: 3.6, osm: 'n923969862' },
  { id: 'sadovaya-pit-3', n: 3, mouth: [-1929.2, 620.6], e: [0.779, -0.627], run: 7.8, open: 5.2, w: 3.6, osm: 'n1043074280' },
  { id: 'sadovaya-pit-4', n: 4, mouth: [-1883.2, 582.4], e: [-0.800, 0.600], run: 7.8, open: 5.2, w: 3.6, osm: 'n92715802' },
];
// the X of the underpass (OSM footways, layer -1): J0 = the NW arm (pits 3, 4) on the diagonal, J1 = the spur to the cassa hall, J2 = the SE arm (pits 1, 2); local +z of a junction = the diagonal (J0 -> J2)
export const SD_JUNCTIONS = { yaw: 0.6963, J0: [-1905.0, 600.0], J1: [-1878.0, 632.0], J2: [-1849.0, 667.0] };
// doorways in the NW facades of the two pavilions on Sennaya square (OSM nodes on the facade line; rotY faces outward, bearing 321 / 320 degrees); the city cuts the gates
DOORWAYS.push(
  { id: 'sennaya-in', x: -1728.4, z: 584.9, w: 3.4, rotY: -2.4642, station: 'sennaya', bldg: 'w39036403', kind: 'entrance', osm: 'n763045997' },
  { id: 'sennaya-out', x: -1738.6, z: 593.2, w: 3.4, rotY: -2.4642, station: 'sennaya', bldg: 'w39036403', kind: 'exit', osm: 'n763045998' },
  { id: 'spasskaya-in', x: -1754.1, z: 606.9, w: 3.4, rotY: -2.4459, station: 'spasskaya', bldg: 'w245455781', kind: 'entrance', osm: 'n2526495851' },
  { id: 'spasskaya-out', x: -1779.4, z: 628.0, w: 3.4, rotY: -2.4459, station: 'spasskaya', bldg: 'w245455781', kind: 'exit', osm: 'n2526495862' },
);
// ground holes: the mouths of the two street inclines (inside their pavilions) and the open parts of the four pits (the Sadovaya incline starts underground: no hole)
for (const [id, L] of [['sennaya', SN_HOLE], ['spasskaya', SHAFT_LEN]]) { const e = ESC2[id]; SHAFTS.push({ id: id + '-shaft', x: e.head.x + e.e[0] * L / 2, z: e.head.z + e.e[1] * L / 2, w: 2 * e.A + 0.3, d: L, rotY: e.yaw, station: id, kind: 'escalator' }); }
for (const p of SD_PITS) SHAFTS.push({ id: p.id + '-hole', x: p.mouth[0] + p.e[0] * p.open / 2, z: p.mouth[1] + p.e[1] * p.open / 2, w: p.w + 0.6, d: p.open, rotY: Math.atan2(p.e[0], p.e[1]), station: 'sadovaya', kind: 'stairs' });
for (const [l, id] of [['2', 'sennaya'], ['5', 'sadovaya'], ['4', 'spasskaya']]) { const s = STATIONS[l].find((q) => q.id === id); if (s) s.built = true; }
// ==== end of the SENNAYA HUB block ====

// ================================================================================================================================================================================
// NEW INTERCHANGE NODES (2026-10-15 round): each node's rows live in its own data file (define(T) mutates the tables above; the files import nothing from here)
// ================================================================================================================================================================================
defineVitebsky({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });          // Pushkinskaya (1) / Zvenigorodskaya (5): docs/research/metro-south-vitebsky-tekhnolog.md
defineTekhnolog({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });         // Tekhnologichesky Institut 1 / 2 (lines 1 / 2)
defineChernyshevskaya({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });   // Chernyshevskaya (1): docs/research/metro-east.md
defineEast({ FRAMES, ESC2, DOORWAYS, SHAFTS, STATIONS, LINES, esc2, toWorld, toLocal, dirOf, TAN, SIN, COS, SHAFT_LEN, SHAFT_W });              // Pl. Aleksandra Nevskogo 1 / 2 (lines 3 / 4), Ligovsky Prospekt (4): docs/research/metro-east.md
