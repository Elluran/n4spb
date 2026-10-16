// streets/plates.js - the STREET-NAME and HOUSE-NUMBER PLATES of Saint Petersburg, exactly as the city makes them (user reference 2026-10-06: the standard plates of the city; docs/rules/SIGNS-AND-PLATES.md):
//   * NAME PLATE 600 x 375 mm: dark-blue field, GREEN rim with four rivets in scalloped corner scrolls, a bulge on top with the city's small ship emblem (a three-masted ship with sails, no flag), white lettering:
//     [ordinal '7-я'] / [type word above: НАБЕРЕЖНАЯ, ПЛОЩАДЬ, УЛИЦА ...] / the NAME in large bold capitals / [type word below: ПРОСПЕКТ, УЛИЦА, КАНАЛА ...] / a small Latin line
//     ('NABEREZHNAJA REKI FONTANKI', 'PLOSHCHAD OSTROVSKOGO', 'NAB. OBVODNOGO KAN.', '7-YA KRASNOARMEYSKAYA ULITSA'). The type word stands where the official name has it ('площадь Островского': above,
//     'Невский проспект': below); long names are set condensed and then smaller, never over the rim. Hung on the corner houses of every junction at 3.76 .. 4.14 m, one per corner, flush on the wall.
//   * NUMBER PLATE 600 x 160 mm directly below it (and alone on the other houses, 3.0 m): the house number large in the middle, the neighbours on the same side of the street small left and right
//     ('153  155/5  157'): the numbers of the real neighbouring buildings (BUILDINGS addr) when mapped, else n - 2 and n + 2. One shared texture (the plate), the digits are quads of one glyph atlas.
//   Transliteration (latinWord): the simplified transliteration of the city's plates: й = Y, я = YA, ю = YU, ё = YO, ы = Y, ь / ъ dropped, е = YE at the start / after a vowel / after ь ъ, ц = TS, щ = SHCH,
//   the word 'набережная' = NABEREZHNAJA (as on the plates).
// Every plate reserves its rectangle in the facade label registry (labels.js) and is skipped when another label holds it. No logos, no flags.
import { BUILDINGS, DOORS as DOORS0, ENTRANCES } from '../data/city.js';
import { PointGrid } from './util.js';
const DOORS = [...DOORS0, ...ENTRANCES];
const DG = new Map();                                                          // doors hashed in 4 m cells (every plate candidate asked every door)
for (const d of DOORS) { const k = Math.floor(d.x / 4) * 4096 + Math.floor(d.z / 4); let l = DG.get(k); if (!l) DG.set(k, (l = [])); l.push(d); }
const doorNear = (x, z, r) => { for (let a = Math.floor((x - r) / 4); a <= Math.floor((x + r) / 4); a++) for (let b = Math.floor((z - r) / 4); b <= Math.floor((z + r) / 4); b++) for (const d of DG.get(a * 4096 + b) || []) if (Math.hypot(d.x - x, d.z - z) < r) return true; return false; };
import { clearanceHit } from './bld.js';
import { hash2, nodeDist, clearNear } from './furn.js';
import { islandWaterRings } from '../environment/waterways.js';
import { KERB_W } from './surface.js';
import { polyCentroid } from '../lib/massing.js';
import * as L from '../layout.js';
import { isOpen, isIsland, isIslandReach } from './region.js';
import { plateName, addrNames } from './names.js';

// ------------------------------------------------------------------ old short forms (the minimap reads plateInfo().lat: 'Nevsky pr.' style)
const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
const TL_OVERRIDE = { 'грибоедова': 'Griboyedova', 'зимней': 'Zimney', 'лебяжьей': 'Lebyazhyey' };
const translit = (w) => {
  if (TL_OVERRIDE[w.toLowerCase()]) return TL_OVERRIDE[w.toLowerCase()];
  let s = w.toLowerCase().replace(/(ий|ый)$/, 'y').replace(/ой$/, 'oy').replace(/ая$/, 'aya').replace(/ский/g, 'sky');
  s = [...s].map((c) => (TR[c] !== undefined ? TR[c] : c)).join('');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const TYPES = {
  улица: ['УЛИЦА', 'ул.', 'ul.'], проспект: ['ПРОСПЕКТ', 'пр.', 'pr.'], переулок: ['ПЕРЕУЛОК', 'пер.', 'per.'], проезд: ['ПРОЕЗД', 'пр-д', 'proezd'],
  площадь: ['ПЛОЩАДЬ', 'пл.', 'pl.'], набережная: ['НАБЕРЕЖНАЯ', 'наб.', 'nab.'], бульвар: ['БУЛЬВАР', 'бул.', 'bul.'], линия: ['ЛИНИЯ', 'лин.', 'liniya'],
};

/** 'улица Марата' -> { name: 'МАРАТА', type: 'УЛИЦА', typeLine: 'улица', abbr: 'ул.', short: 'ул. Марата', lat: 'ul. Marata', latName, rawName }  (the short forms of the minimap and the old plates).
 *  Forms: 'улица X' / 'площадь X' / 'проезд X', 'X проспект' / 'X улица' / 'X площадь' / 'X бульвар' / 'X линия' / 'X набережная' (Дворцовая набережная), 'набережная реки X', 'набережная канала X',
 *  'набережная X' (Зимней канавки). */
export function plateInfo(full) {
  let m, type, name, typeLine = null, lat = null, short = null;
  if ((m = /^набережная (реки|канала) (.+)$/.exec(full))) {
    type = 'набережная'; name = m[2]; typeLine = `набережная ${m[1]}`;
    const ln = name.split(' ').map(translit).join(' ');
    lat = `${ln} ${m[1] === 'реки' ? 'river' : 'canal'} emb.`; short = `наб. ${m[1]} ${name}`;
  } else if ((m = /^набережная (.+)$/.exec(full))) { type = 'набережная'; name = m[1]; typeLine = 'набережная'; short = `наб. ${name}`; }
  else if ((m = /^(улица|площадь|проезд|переулок|бульвар) (.+)$/.exec(full))) { type = m[1]; name = m[2]; }
  else if ((m = /^(.+) (проспект|переулок|улица|проезд|площадь|бульвар|линия|набережная)$/.exec(full))) { type = m[2]; name = m[1]; }
  else { type = 'улица'; name = full; }
  const [big, abbr, abbrLat] = TYPES[type] || TYPES.улица;
  const latName = name.split(' ').map((w) => (/^\d/.test(w) ? w.replace('-я', '') : translit(w))).join(' ');
  if (!lat) lat = (type === 'проспект' || type === 'площадь' || type === 'проезд' || type === 'набережная' || type === 'бульвар' || type === 'линия') && !/^(улица|площадь|проезд|переулок|бульвар) /.test(full) ? `${latName} ${abbrLat}` : `${abbrLat} ${latName}`;
  if (!short) short = /^(улица|площадь|проезд|переулок|бульвар) /.test(full) ? `${abbr} ${name}` : `${name} ${abbr}`;
  return { name: name.toUpperCase(), type: big, typeLine: typeLine || type, abbr, short, lat, latName, rawName: name };
}

// ------------------------------------------------------------------ the text of a plate
const TL = { а: 'A', б: 'B', в: 'V', г: 'G', д: 'D', е: 'E', ё: 'YO', ж: 'ZH', з: 'Z', и: 'I', й: 'Y', к: 'K', л: 'L', м: 'M', н: 'N', о: 'O', п: 'P', р: 'R', с: 'S', т: 'T', у: 'U', ф: 'F', х: 'KH', ц: 'TS', ч: 'CH', ш: 'SH', щ: 'SHCH', ъ: '', ы: 'Y', ь: '', э: 'E', ю: 'YU', я: 'YA' };
const VOW = 'аеёиоуыэюя';
/** the Latin line of one word (capitals): 'Лиговский' -> LIGOVSKIY, 'Грибоедова' -> GRIBOYEDOVA, 'Восстания' -> VOSSTANIYA */
export function latinWord(w) {
  const s = w.toLowerCase(); let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === 'е') { const p = s[i - 1]; out += !p || VOW.includes(p) || p === 'ъ' || p === 'ь' ? 'YE' : 'E'; continue; }
    out += TL[c] !== undefined ? TL[c] : c.toUpperCase();
  }
  return out;
}
const TYPE_RU = { улица: 'УЛИЦА', проспект: 'ПРОСПЕКТ', переулок: 'ПЕРЕУЛОК', проезд: 'ПРОЕЗД', площадь: 'ПЛОЩАДЬ', набережная: 'НАБЕРЕЖНАЯ', бульвар: 'БУЛЬВАР', линия: 'ЛИНИЯ', шоссе: 'ШОССЕ', проток: 'ПРОТОК', мост: 'МОСТ', тупик: 'ТУПИК' };
const TYPE_LAT = { улица: 'ULITSA', проспект: 'PROSPEKT', переулок: 'PEREULOK', проезд: 'PROEZD', площадь: 'PLOSHCHAD', набережная: 'NABEREZHNAJA', бульвар: 'BULVAR', линия: 'LINIYA', шоссе: 'SHOSSE', проток: 'PROTOK', мост: 'MOST', тупик: 'TUPIK' };
const TYPES_RE = 'улица|проспект|переулок|проезд|площадь|набережная|бульвар|линия|шоссе|мост|тупик|проток';
// ISLANDS ROUND 2 (region.js isIsland): park alleys and roads of the islands carry their type word on the plate too (Большая / аллея, Северная / дорога, Петровская / коса), not «УЛИЦА»-less one-line names
const EXT_RU = { аллея: 'АЛЛЕЯ', дорога: 'ДОРОГА', коса: 'КОСА' }, EXT_LAT = { аллея: 'ALLEYA', дорога: 'DOROGA', коса: 'KOSA' }, EXT_RE_SRC = 'аллея|дорога|коса', EXT_NAME = new RegExp('(^| )(' + EXT_RE_SRC + ')( |$)');
const NO_PLATE = /^(ЗСД|.*(мост|путепровод))$/i;                                    // (an expressway and a bridge carry no street-name plate on the houses beside it; island regions only)
const latName = (name) => name.split(/\s+/).map((w) => (/^\d+-/.test(w) ? w.replace(/-(.+)$/, (_, e) => '-' + latinWord(e)) : latinWord(w))).join(' ');

// ------------------------------------------------------------------ the Lines of Vasilievsky Island (2026-10-07): plateName / addrNames live in streets/names.js
export { plateName, addrNames };

/** ADDRESS PLATES that a landmark module asked for (docs/research/oktyabrsky-requests.md 4b): the standard name plate + number plate pair on one wall, number plate centre at y.
 *  (nx, nz) = out-normal of the wall, x / z on the wall face. Reserved in the label registry like every plate; drawn even on a wall of a landmark house (the module models the front and leaves the spot free). */
export const ADDRESS_PLATES = [
  { owner: 'landmarksOktyabrsky', street: 'Лиговский проспект', no: '6', x: 747.0, z: -337.8, y: 2.6, nx: -0.4977, nz: 0.8674 },       // the SSW end block of the Bolshoy Concert Hall (hall frame u 0, v 1.5; rotation.y 1.0495: SSW = -local X)
  // ---- Vasilievsky Island (2026-10-08, the second pass: docs/research/vo-requests-landmarks{Menshikov,NavalCorps}.md). `no: null` = a street-name plate alone, y = its centre; with a number y = the centre of the number plate.
  // Menshikov Palace (frame P: origin (-3090.3, -705.5), rotation +30 deg, world = O + a (0.866, -0.5) + b (0.5, 0.866)): the address plate on the pilaster between two ground-floor windows of the river front at a -9.75 (the
  // pilaster of the 9-axis recess: pitch 2.7 m from the wall start a -12.45; the wall at b -0.28, the pilaster 0.12 proud), photo 05; the street plate of the Kadetskaya line on the corner of the First Cadet Corps
  // (frame K: origin (-3211.4, -732.7), rotation -60 deg: world = O + a (0.5, 0.866) + b (-0.866, 0.5); the Corps lies at b < 0, its street front at b 0.4 incl. the base course), photo 55.
  { owner: 'landmarksMenshikov', street: 'Университетская набережная', no: '15', x: -3098.82, z: -700.76, y: 2.6, nx: 0.5, nz: 0.866 },
  { owner: 'landmarksMenshikov', street: 'Кадетская линия В.О.', no: null, x: -3171.45, z: -662.76, y: 3.0, nx: -0.866, nz: 0.5 },
  // Naval Cadet Corps (frame K of landmarksNavalCorps: origin (-4062.7, -243.6), world = O + u (0.86804, -0.49652) + v (0.49652, 0.86804); the facade at v 0): the address plate between the plaque at u 10.7 and the west pavilion
  // door (u 23.9), on the pier between two barred windows (u 18.0); the plates of the two lines on the end walls beside the front corners (the west wing's flank faces the 12-13 line street: the EAST wall of it = the even line 12, the east wing's flank faces the
  // 10-11 line street: its WEST wall = the odd line 11); the plate of the Dormition compound (frame C: origin (-4250.3, -123.7), rotation +30 deg) on the pier between the first two window pairs of the front house at its east end.
  // (17: the west pavilion block projects 0.5 m from the facade plane between u 17.2 and 30.7 (frame.js PAV_W, z0 0.5): a plate at u 18.0 on the plane v 0 sat inside it, shots plates_a_3 / plates_b_0 showed no plate; it hangs on the
  //  face of the pavilion's west pier now, u 17.85 (1.28 m between the end of the block and the first window), v 0.5)
  { owner: 'landmarksNavalCorps', street: 'набережная Лейтенанта Шмидта', no: '17', x: -4046.96, z: -252.03, y: 2.9, nx: 0.49652, nz: 0.86804 },
  { owner: 'landmarksNavalCorps', street: '12-я линия В.О.', no: null, x: -4063.49, z: -244.99, y: 3.0, nx: -0.86804, nz: 0.49652 },
  // (11th line: the baked east wall line passes 4 cm outside the dossier point, the plate stood 1 cm INSIDE the wall (0.03 m off the point): shots plates_c_1 / plates_d_0 showed none; the point is moved 5 cm out along the normal)
  { owner: 'landmarksNavalCorps', street: '11-я линия В.О.', no: null, x: -3945.44, z: -312.405, y: 3.0, nx: 0.86804, nz: -0.49652 },
  { owner: 'landmarksNavalCorps', street: 'набережная Лейтенанта Шмидта', no: '27', x: -4250.02, z: -83.91, y: 2.9, nx: 0.5, nz: 0.866 },
  // Sea Terminal (landmarksSeaTerminal, docs/research/vo-requests-landmarksSeaTerminal.md streets 3; frame T: origin (-6542.4, 652.9), world = O + u (0.87327, 0.48723) + v (-0.48723, 0.87327)): the address plate on the NE
  // podium wall beside the SE stair (the request: u 104, v -0.2; the module's closed stair door fills u 101.7 .. 106.2, a plate at u 104 overlapped its top edge: shot plates_a_5, so the plate hangs 2 m west of the stair block,
  // at u 98.2); the land face of the prism is the plane v = 0, its out-normal -v = (0.48723, -0.87327), centre of the number plate 2.4 m over the lot
  { owner: 'landmarksSeaTerminal', street: 'площадь Морской Славы', no: '1', x: -6456.54, z: 700.58, y: 2.4, nx: 0.48723, nz: -0.87327 },
  // ---- third pass (streets-3, 2026-10-09): the plates that waited for the walls of the sights (docs/research/vo-requests-landmarksKirova.md "streets", modernvo.md 12.5 / 14.7). Each point was derived from the module frame and looked at from 3 m.
  // Kirova Palace of Culture (frame FD: origin (-5449, -145), rotation 30.57 deg, plan (r, q), out-normal toward the square (sin, cos) = (0.5086, 0.8610)): «Большой пр. В.О. 83» on the right-hand pier of the portal bump (r 8.3 .. 10.3 at q -35.5,
  // beside the clock bracket at y 4.4: the plate pair spans y 2.5 .. 3.2); the street-name sign «ПЛОЩАДЬ АНАТОЛИЯ СОБЧАКА» of photo dk14 stands on a POLE in the forecourt (`pole`: the post height, the plate centre at y), west of the portal at r -14
  { owner: 'landmarksKirova', street: 'Большой проспект В.О.', no: '83', x: -5422.94, z: -119.16, y: 2.6, nx: 0.5086, nz: 0.861 },
  { owner: 'landmarksKirova', street: 'площадь Анатолия Собчака', no: null, pole: 3.2, x: -5440.2, z: -102.58, y: 2.65, nx: 0.5086, nz: 0.861 },
  // Erarta (frame FE: origin (-5582.8, 23.7), rotation 119.67 deg, a = q', b = r'): «29-я линия В.О. 2» on the pier between the third and fourth window axes of the south wing (bays of 3.9 m from q' -29.75: piers at -25.8, -21.9, -18.0; wall plane r' -1.7)
  { owner: 'landmarksKirova', street: '29-я линия В.О.', no: '2', x: -5575.25, z: 40.39, y: 2.6, nx: 0.8689, nz: -0.495 },       // (review: centred on the pier, 0.24 m along the wall: the plate stood 4 cm off the right-hand window trim, shot review-streets3b/a_2)
  // Kudryavtsev house (frame SF of landmarksModernVO: origin (-4915.6, -1328.0), rotation 2.093 rad, u along the 15th Line front, normal (sin, cos)): «15-я линия В.О. 70» at the right of the gate (gate centre u 18.0 +- 1, 3.3 m wide), modernvo.md 12.5
  { owner: 'landmarksModernVO', street: '15-я линия В.О.', no: '70', x: -4926.07, z: -1346.2, y: 3.0, nx: 0.8667, nz: -0.4988 },
  // Kornilova house (frame KA: Sredny pr., the tower corner at u 29.2): «Средний проспект В.О. 56» on the corner pier ABOVE the dark tile ledge (top 3.55 m, 0.3 m proud: a pair at the generic 3.69 / 4.05 was cut by it)
  { owner: 'landmarksModernVO', street: 'Средний проспект В.О.', no: '56', x: -4608.33, z: -860.05, y: 3.95, nx: -0.5, nz: -0.87 },
  // Teodoridi house (frames TM / TB, dossier 9.7: «Малый проспект В.О. 38-40 / 14-я линия 73» on the corner pier at 2.6 m): TM u 110.4 on the Maly front (the module wall stands 0.23 m proud of the baked edge there: raycast, flat pier u 100 .. 117), TB u 5.4 on the 14th Line front (flat pier between the first two windows)
  { owner: 'landmarksModernVO', street: 'Малый проспект В.О.', no: '38-40', x: -4851.14, z: -1296.72, y: 2.7, nx: -0.4835, nz: -0.8753 },
  { owner: 'landmarksModernVO', street: '14-я линия В.О.', no: '73', x: -4856.72, z: -1284.81, y: 2.7, nx: -0.8679, nz: 0.4967 },
  // Karl May school (frame MA: the 14th Line front, u along it to the SSE): «14-я ЛИНИЯ В.О. 39» on the pier right of the portal arch (u 10.9: between the plaque at u 9.7 and the first arched window of the middle block at 12.5)
  { owner: 'landmarksModernVO', street: '14-я линия В.О.', no: '39', x: -4593.16, z: -831.55, y: 2.9, nx: -0.8666, nz: 0.4991 },
  // Gavan, the Shkipersky bridge (frame B of landmarksGavan: origin (-7009.5, -31.0), rotation 0.1832, u east along the deck, v south): the street-name sign «Шкиперский проток» on a pole at each approach (vo-requests-landmarksGavan.md streets 3),
  // 21 m from the deck centre on the pavement beside the road; `near` = the nearest clear pavement base within 3 m; the plate faces along the street, towards the walker who comes to the bridge
  { owner: 'landmarksGavan', street: 'Шкиперский проток', no: null, pole: 3.2, near: 3, x: -7031.52, z: -34.54, y: 2.65, nx: -0.9833, nz: 0.1822 },
  { owner: 'landmarksGavan', street: 'Шкиперский проток', no: null, pole: 3.2, near: 3, x: -6988.0, z: -28.9, y: 2.65, nx: 0.9833, nz: -0.1822 },
  // Kornilov house (frame NB: 10th Line front, origin (-4350.3, -1064.3), rotation -1.0552): the pair of the 10th Line / 27/45 at u 14.6 (flat pier u 12.5 .. 19: raycast; the wall stands 6 cm BEHIND the baked edge there)
  { owner: 'landmarksModernVO', street: '10-я линия В.О.', no: '27/45', x: -4343.08, z: -1051.61, y: 3.69, nx: -0.871, nz: 0.4912 },
  // Sevkabel factory (frame M of landmarksSevkabel, Kozhevennaya line 30, facing the lane: normal (0.4067, -0.9135)): the pair at 3.1 / 3.46, under the brick belt of 4.05 m
  { owner: 'landmarksSevkabel', street: 'Кожевенная линия', no: '30', x: -5562.35, z: 1135.65, y: 3.1, nx: 0.4067, nz: -0.9135 },
  // ---- islands round 2 (streets owner 2, 2026-10-15; docs/research/islands2-requests-landmarks{Zhdanovka,KamennyChurch}.md).
  // Zhdanovskaya embankment (landmarksZhdanovka claims the four houses; the rows come from tools/landmarksZhdanovka-plates.mjs: the plain pier between two ground-floor windows, number plate centre y 2.5; photo m02 shows the real plate
  // «Ждановская набережная 9» on the pier right of the middle window of No. 9)
  { owner: 'landmarksZhdanovka', street: 'Ждановская набережная', no: '9', x: -3550.78, z: -2365.31, y: 2.5, nx: -0.6542, nz: 0.7563 },
  { owner: 'landmarksZhdanovka', street: 'Ждановская набережная', no: '7', x: -3518.78, z: -2338.36, y: 2.5, nx: -0.6423, nz: 0.7664 },
  { owner: 'landmarksZhdanovka', street: 'Ждановская набережная', no: '11', x: -3595.43, z: -2408.28, y: 2.5, nx: -0.7403, nz: 0.6722 },
  { owner: 'landmarksZhdanovka', street: 'Ждановская набережная', no: '3', x: -3468.49, z: -2294.94, y: 2.5, nx: -0.6680, nz: 0.7441 },
  // Kamenny Island: «Каменноостровский проспект 83» on the west return of the south cross arm of the church (frame CH, mz 1.9, photo C06 / C08: right of the black plaque; the requested point mx 8.63 / y 2.7 lay half behind the corner pier and the arch surround: shot streets2b/a_4, moved to mx 8.2 / y 3.45 in the wide gap above the surround) and «85» on the drum of the chapel, 40 deg to the
  // right of the door (the request prints the wall normal of the mirrored +40 deg point; the wall point is the right-hand one: the normal is the radial direction of THAT point; y 3.55 = floor 1.05 + 2.5, photo H01)
  { owner: 'landmarksKamennyChurch', street: 'Каменноостровский проспект', no: '83', x: -2845.52, z: -5395.04, y: 3.45, nx: -0.905, nz: -0.426 },
  { owner: 'landmarksKamennyChurch', street: 'Каменноостровский проспект', no: '85', x: -2834.93, z: -5456.37, y: 3.55, nx: -0.642, nz: 0.766 },
];
/** claimed (landmark) buildings that still carry the city's standard plates through the generic placers (name plates at the junction corners, the number plate at the facade corner): the sight module models the front,
 *  leaves the corner free and asked for the plates (docs/research/vo-requests-landmarksAcademy.md 3, landmarksMining.md 5 / dossier 10: the Academy of Arts r165182 (Universitetskaya nab. 17), the Academy houses
 *  w82802160 (21) and w82802097 (23), the Mining University r2902646 (21-ya liniya 2: the plates of Lt Schmidt nab., the 21st and the 22nd line). The label registry still protects every plaque of the modules. */
const PLATES_ALLOWED = new Set(['r165182', 'w82802160', 'w82802097', 'r2902646',
  // third pass (streets-3, 2026-10-09): the generic corner / number placers hang the plates of the sights built since the second pass on their street walls (the texts come from the baked addresses and the junction names;
  // every plate was looked at from 3 m: docs/research/vo-requests-streets.md THIRD PASS)
  'w17564513', 'w17564532', 'w17564539', 'w17564584', 'w17564575', 'w32861970', 'w32861971',                       // Gavan: the five slabs of the workers' town (Gavanskaya 47) and the fire reserve (Ostoumova 21)
  'r8702898', 'r4743691', 'r4743693', 'w136791761', 'w61411170', 'r8702903',                                        // Sevkabel: the factory, the Brusnitsyn mansion and pink house, the Skobsky palace, the almshouse, Istkabel
  'w108204300', 'w108204307', 'r1541864', 'w108091608', 'r15473499', 'w32273617', 'r1538751', 'w160229193', 'r2144616', 'w96579812', 'w96579819', 'r1537672', 'w108132180', 'w65710570',      // ModernVO: the 14 claims
]);
/** allowed buildings whose walls are the module's own BAY TEXTURE (landmarksMining/wings.js bayWall: tiles of 3.95 .. 4.1 m from the wall start, a window surround of cx +- 0.8 .. 1.0 at the tile centre): the generic placers put a plate
 *  wherever the street ray hits the wall (or 1.3 m from a corner) and three of the four Mining plates hung over a window pane (review of streets-2, shots review-streets2/c_1, c_2). On these walls a plate hangs on the CORNER PIER:
 *  its centre PIER_T from the nearer end of the wall edge (0.315 .. 1.065 m: the pier between the corner and the first surround is 1.075 m wide at least). Open districts only (the set is only read there). */
const PLATES_PIER = new Set(['r2902646']);
/** places where the generic placers hang NO plate although the building is allowed (third pass, streets-3: every plate was looked at from 3.4 m; the module's own wall rhythm leaves no clear pier there): [x, z, radius, why].
 *  Where the sight asked for a plate the ADDRESS_PLATES row stands beside it. */
const PLATES_BLOCK = [
  [-4608.33, -860.05, 2.5, 'Kornilova, Sredny pr. corner: the dark tile ledge (y 3.55, 0.3 m proud) hid the lower half of the number plate; ADDRESS_PLATES hangs the pair above it'],
  [-4856.69, -1293.44, 3.0, 'Teodoridi, rounded corner: the point is on the bulge of the tower, no plate visible; ADDRESS_PLATES hangs the pair on the two fronts'],
  [-4597.94, -839.79, 2.5, 'Karl May school: the number plate overlapped an arched window; ADDRESS_PLATES hangs «14-я линия 39» on the pier right of the portal'],
  [-4665.52, -828.01, 3.0, 'Kornilova, Sredny pr.: the number plate hung on the glass of a shop front'],
  [-4454.39, -982.56, 3.0, 'Smirnov house, Sredny pr.: the plate hung in the dark of the carriage arch'],
  [-5388.96, 776.86, 3.0, 'Brusnitsyn almshouse: the plate overlapped the arched door'],
  [-5562.35, 1135.65, 2.0, 'Sevkabel factory Kozhevennaya 30: the brick belt at y 4.05 cut the name plate; ADDRESS_PLATES hangs the pair lower'],
  [-4343.5, -1052.29, 3.3, 'Kornilov, 10th Line: the pair touched the shop window reveal; ADDRESS_PLATES hangs it 0.8 m further on the same wall'],
];
const plateBlocked = (x, z) => PLATES_BLOCK.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2]);
/** within `m` metres of a water ring of the island (Smolenka, Galerny harbour and its canal, the Kovsh, the Gulf): a pole base stands on land (the pavement strips stop 0.45 m before the ring) */
let WRINGS = null;
const nearWater = (x, z, m) => {
  if (!WRINGS) { try { WRINGS = islandWaterRings().map((o) => { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); } return { o, b: [x0, x1, z0, z1] }; }); } catch (e) { WRINGS = []; } }
  for (const r of WRINGS) {
    if (x < r.b[0] - m || x > r.b[1] + m || z < r.b[2] - m || z > r.b[3] + m) continue;
    const o = r.o; let ins = false, d = 1e9;
    for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
      const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins;
      const dx = xi - xj, dz = zi - zj, l2 = dx * dx + dz * dz || 1e-9, t = Math.max(0, Math.min(1, ((x - xj) * dx + (z - zj) * dz) / l2));
      d = Math.min(d, Math.hypot(x - xj - dx * t, z - zj - dz * t));
    }
    if (ins || d < m) return true;
  }
  return false;
};
const PIER_T = 0.69;                                  // (the plate is PLATE.W = 0.75 m wide: it spans 0.315 .. 1.065 m from the corner; the mountName rule keeps a plate W / 2 + 0.3 = 0.675 m off the end)
/** a wall edge of `len` m has a corner pier wide enough for the plate when its bay pitch (len / round(len / bayW) for the three Mining styles 3.95 / 4.0 / 4.1) is at least 3.9 m: the first surround starts at pitch / 2 - 0.9
 *  (1.065 m at 3.93; a 14.7 m wall has four bays of 3.67 m: 0.93 m, the plate would cover 13 cm of the frame, shot review-streets2/d_6) */
const pierOK = (len) => Math.min(...[3.95, 4.0, 4.1].map((bw) => len / Math.max(1, Math.round(len / bw)))) >= 3.9;

/** { ord, above, name, below, lat } of a street's plate: ord = '7-я' (own line), above / below = the type word where the official name has it, name = the big line, lat = the Latin line */
export function plateText(full, ext = false) {
  let m, ord = null, above = null, below = null, name, lat;
  const TR_ = ext ? { ...TYPE_RU, ...EXT_RU } : TYPE_RU, TL_ = ext ? { ...TYPE_LAT, ...EXT_LAT } : TYPE_LAT, TRE = ext ? TYPES_RE + '|' + EXT_RE_SRC : TYPES_RE;
  const cut = (n) => { const o = /^(\d+-(?:я|й|е|ая|ой|ий))\s+(.+)$/.exec(n); if (o) { ord = o[1]; return o[2]; } return n; };
  const latOrd = () => (ord ? latinWord0(ord) + ' ' : '');
  const latinWord0 = (o) => o.replace(/-(.+)$/, (_, e) => '-' + latinWord(e));
  if ((m = /^набережная (реки|канала) (.+)$/.exec(full))) { above = 'НАБЕРЕЖНАЯ ' + m[1].toUpperCase(); name = m[2]; lat = `NABEREZHNAJA ${m[1] === 'реки' ? 'REKI' : 'KANALA'} ${latName(name)}`; }
  else if ((m = /^набережная (.+) канала$/.exec(full))) { above = 'НАБЕРЕЖНАЯ'; name = m[1]; below = 'КАНАЛА'; lat = `NAB. ${latName(name)} KAN.`; }
  else if ((m = /^набережная (.+)$/.exec(full))) { above = 'НАБЕРЕЖНАЯ'; name = m[1]; lat = `NABEREZHNAJA ${latName(name)}`; }
  // 'Большой проспект П.С.', 'Кадетская линия В.О.', 'Троицкая площадь П.С.': the district suffix of the Petrograd side / Vasilievsky Island stays with the type word under the name
  // (the numbered lines '1-я линия В.О.' keep their ordinal row: the rules below)
  else if ((m = new RegExp(`^(.+) (${TRE}) (П\\.С\\.|В\\.О\\.)$`).exec(full)) && !/^\d+(-\d+)?-\S+$/.test(m[1])) { name = m[1]; below = `${TR_[m[2]]} ${m[3]}`; lat = `${latName(name)} ${TL_[m[2]]} ${m[3] === 'П.С.' ? 'P.S.' : 'V.O.'}`; }
  else if ((m = new RegExp(`^(${TRE}) (.+)$`).exec(full))) { above = TR_[m[1]]; name = cut(m[2]); lat = `${TL_[m[1]]} ${latOrd()}${latName(name)}`; }
  else if ((m = new RegExp(`^(.+) (${TRE})$`).exec(full))) { name = cut(m[1]); below = TR_[m[2]]; lat = `${latOrd()}${latName(name)} ${TL_[m[2]]}`; }
  else { name = cut(full); lat = latOrd() + latName(name); }
  return { ord, above, name: name.toUpperCase(), below, lat };
}

// ------------------------------------------------------------------ geometry constants (metres)
// SCENE SCALE k = 1.25 of the real 600 x 375 / 600 x 160 mm plates: a 0.6 m plate is 35 px wide at 12 m (1280 x 720, fov 62), unreadable; at 0.75 m the layout reads from ~8 m, the text from ~5 m
const K = 1.25;
export const PLATE = { k: K, W: 0.6 * K, H: 0.375 * K, NH: 0.16 * K, nameY: 4.05, gap: 0.02 * K, numY: 3.1, off: 0.03 };
const GLYPHS = '0123456789-/АБВГДЕЖЗИКЛМ';
const FIELD = '#283479', RIM = '#1c6a46', RIM_HI = '#2f8b61', RIVET = '#c9cfd8', INK = '#f4f6f8';

/** one plate body on a canvas: the scalloped outline (green rim, four corner scrolls with rivets, optional bulge on top), the navy field; returns the pixel box of the field's text area */
function drawBody(g, W, H, bulge) {
  const B = bulge, rim = Math.round(W / 42), r = Math.round(W / 38), lobe = Math.round(W / 42);
  const x0 = lobe * 0.8, x1 = W - lobe * 0.8, y0 = B + lobe * 0.4, y1 = H - lobe * 0.8;
  const bx0 = W * 0.30, bx1 = W * 0.70;
  const path = (ins) => {
    const a = x0 + ins, b = x1 - ins, t = y0 + ins, d = y1 - ins, rr = Math.max(2, r - ins * 0.5);
    g.beginPath(); g.moveTo(a + rr, t);
    if (B > 0) {
      g.lineTo(bx0 - 24, t); g.bezierCurveTo(bx0 - 6, t, bx0 - 6, 2 + ins, bx0 + 16, 2 + ins);
      g.lineTo(bx1 - 16, 2 + ins); g.bezierCurveTo(bx1 + 6, 2 + ins, bx1 + 6, t, bx1 + 24, t);
    }
    g.lineTo(b - rr, t); g.arcTo(b, t, b, t + rr, rr); g.lineTo(b, d - rr); g.arcTo(b, d, b - rr, d, rr); g.lineTo(a + rr, d); g.arcTo(a, d, a, d - rr, rr); g.lineTo(a, t + rr); g.arcTo(a, t, a + rr, t, rr); g.closePath();
  };
  const lobes = [[x0 + lobe * 0.3, y0 + lobe * 0.3], [x1 - lobe * 0.3, y0 + lobe * 0.3], [x0 + lobe * 0.3, y1 - lobe * 0.3], [x1 - lobe * 0.3, y1 - lobe * 0.3]];
  g.fillStyle = RIM; path(0); g.fill();
  for (const [cx, cy] of lobes) { g.beginPath(); g.arc(cx, cy, lobe, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = FIELD; path(rim); g.fill();
  // the scrolls: a rim-green curl in every corner of the field and the rivet
  for (const [cx, cy] of lobes) {
    g.fillStyle = RIM; g.beginPath(); g.arc(cx, cy, lobe * 0.95, 0, Math.PI * 2); g.fill();
    g.fillStyle = RIM_HI; g.beginPath(); g.arc(cx - lobe * 0.2, cy - lobe * 0.2, lobe * 0.45, 0, Math.PI * 2); g.fill();
    g.fillStyle = RIVET; g.beginPath(); g.arc(cx, cy, lobe * 0.42, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = RIM_HI; g.lineWidth = Math.max(1, rim * 0.22); path(rim * 0.7); g.stroke();       // the lit edge of the rim
  return { x0: x0 + rim + lobe, x1: x1 - rim - lobe, y0: y0 + rim, y1: y1 - rim };
}
/** the ship of the city's small emblem (three masts, sails, hull; no flag), white, about s px wide, centred on (cx, cy) */
function ship(g, cx, cy, s) {
  g.save(); g.translate(cx, cy); g.scale(s / 100, s / 100); g.fillStyle = INK;
  g.beginPath(); g.moveTo(-50, 12); g.lineTo(50, 12); g.quadraticCurveTo(44, 34, 22, 38); g.lineTo(-22, 38); g.quadraticCurveTo(-44, 34, -50, 12); g.closePath(); g.fill();      // hull
  for (const [mx, top, sw] of [[-29, -30, 30], [0, -44, 38], [29, -26, 28]]) {                        // three masts, two sails each (a gap between the sails and the hull)
    g.fillRect(mx - 2.6, top, 5.2, 12 - top);
    for (const [y0, y1, k] of [[top + 3, top + 20, 0.74], [top + 23, 6, 1]]) {
      g.beginPath(); g.moveTo(mx - sw * k * 0.5, y1); g.lineTo(mx - sw * k * 0.36, y0); g.lineTo(mx + sw * k * 0.36, y0); g.lineTo(mx + sw * k * 0.5, y1); g.closePath(); g.fill();
    }
  }
  g.restore();
}
/** a text line centred on cx whose capitals are centred on yc: condensed (down to 72 %) and then smaller until it fits maxW */
function line(g, text, cx, yc, maxW, size, weight, font) {
  g.font = `${weight} ${size}px ${font}`;
  let w = g.measureText(text).width, sx = 1, s = size;
  if (w > maxW) { sx = maxW / w; if (sx < 0.72) { s = size * sx / 0.72; g.font = `${weight} ${s}px ${font}`; w = g.measureText(text).width; sx = Math.min(1, maxW / w); } }
  g.save(); g.translate(cx, yc + 0.357 * s); g.scale(sx, 1); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(text, 0, 0); g.restore();
}

/** the name plate of a street on a canvas (CW x CH = 384 x 240 px = 640 px per metre): body, emblem and the text rows */
export function paintNamePlate(g, w, h, full, F, ext = false) {
  const inf = plateText(full, ext);
  g.clearRect(0, 0, w, h);
  const box = drawBody(g, w, h, 24);
  ship(g, w / 2, 17, 36);
  const rows = [];
  if (inf.ord) rows.push({ t: inf.ord, s: 38, wt: 700, mw: 150 });
  if (inf.above) rows.push({ t: inf.above, s: 27, wt: 600, mw: 300 });
  rows.push({ t: inf.name, s: 56, wt: 700, mw: 326 });
  if (inf.below) rows.push({ t: inf.below, s: 27, wt: 600, mw: 300 });
  rows.push({ t: inf.lat, s: 17, wt: 500, mw: 296, lat: true });
  const cap = (r) => 0.714 * r.s;
  let total = 0; rows.forEach((r, i) => { total += cap(r); if (i) total += 0.32 * (r.s + rows[i - 1].s) / 2 + 3 + (r.lat ? 7 : 0); });
  let y = (box.y0 + box.y1) / 2 + 7 - total / 2;
  g.fillStyle = INK;
  rows.forEach((r, i) => {
    if (i) y += 0.32 * (r.s + rows[i - 1].s) / 2 + 3 + (r.lat ? 7 : 0);
    line(g, r.t, w / 2, y + cap(r) / 2, r.mw, r.s, r.wt, F.sans);
    y += cap(r);
  });
}
/** the blank number plate (the digits are glyph quads) on a canvas, 512 x 136 px */
export function paintNumberPlate(g, w, h) { g.clearRect(0, 0, w, h); drawBody(g, w, h, 0); }

export function buildPlates(ctx, net, panels, out, opts = {}) {
  const F = ctx.tex.FONTS;
  // A building that a landmark module draws itself (lib/claims: its sub-group is built) gets NO generic plate: the module models the real front (a recessed portal, an order, a bay window: the
  // footprint wall the plate would hang on may not exist there: the 'Кронверкский проспект, 7' plate inside the iwan of the Mosque) and hangs its own plaques. Open districts only (region.js).
  const landmark = (b, x, z) => !!(b && opts.isOwned && opts.isOwned(b.id) && isOpen(x, z) && !PLATES_ALLOWED.has(b.id));
  const labels = ctx.services.labels || null;
  const CW = 384, CH = 240;
  const nameTex = new Map();
  const getName = (full, isl = false) => {
    const ext = isl && EXT_NAME.test(full), key = ext ? full + '|isl' : full;
    let t = nameTex.get(key); if (t) return t;
    t = ctx.tex.draw(CW, CH, (g, w, h) => paintNamePlate(g, w, h, full, F, ext), { key: 'pt-plate2-' + key, anisotropy: 8 });
    nameTex.set(key, t); return t;
  };
  const numTex = ctx.tex.draw(512, 136, (g, w, h) => paintNumberPlate(g, w, h), { key: 'pt-plate2-number', anisotropy: 8 });
  // glyph atlas: white glyphs on transparent, one row of 24 cells (48 x 80 px)
  const CWG = 48, atlas = ctx.tex.draw(CWG * GLYPHS.length, 80, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `700 68px ${F.sans}`;
    [...GLYPHS].forEach((c, i) => g.fillText(c, i * CWG + CWG / 2, 66));
  }, { key: 'pt-plate2-glyphs', anisotropy: 8 });

  // ---- registry + helpers
  const seen = new PointGrid(8), byText = new PointGrid(32);                   // mounted plate positions (hashed: every candidate asked every plate mounted so far)
  const sameNear = (txt, x, z, d) => byText.any(x, z, d, (t) => t === txt);
  const farFrom = (x, z, d) => !seen.any(x, z, d);
  const baseNo = (no) => no.replace(/\s*(лит|литера).*$/i, '').replace(/[–—]/g, '-').trim();
  const validNo = (no) => !!no && no.length <= 7 && [...no].every((c) => GLYPHS.includes(c.toUpperCase()));
  const numOf = (t) => parseInt(t, 10) || 0;

  // ---- the addressed buildings of every street (neighbour numbers)
  const byStreet = new Map();
  for (const b of BUILDINGS) {
    if (b.skip || !b.addr || !b.addr.no || b.dupOf || b.underground || (b.minH || 0) > 0.5 || !b.polys || !b.polys[0]) continue;
    const no = baseNo(b.addr.no).toUpperCase(); if (!validNo(no) || !numOf(no)) continue;
    let l = byStreet.get(b.addr.street); if (!l) byStreet.set(b.addr.street, (l = []));
    const c = polyCentroid(b.polys[0]); l.push({ b, no, n: numOf(no), x: c[0], z: c[1], area: b.area || 0 });
  }
  /** the numbers of the neighbours of house `no` of `street` on the facade whose out-normal is (nx, nz) at (x, z): the nearest numbered buildings of the same parity to the left / right (seen from the street) */
  const neighbours = (street, no, b, x, z, nx, nz) => {
    const n = numOf(no), rx = nz, rz = -nx, list = byStreet.get(street) || [];
    let left = null, right = null;
    for (const c of list) {
      if (c.b === b || c.no === no || (c.n & 1) !== (n & 1)) continue;
      const dx = c.x - x, dz = c.z - z; if (Math.abs(dx) > 110 || Math.abs(dz) > 110) continue;
      const along = dx * rx + dz * rz, perp = dx * nx + dz * nz;
      if (perp > 6 || perp < -40 || Math.abs(along) < 2.5 || Math.abs(along) > 90) continue;
      if (along < 0 && (!left || along > left.along)) left = { along, no: c.no };
      if (along > 0 && (!right || along < right.along)) right = { along, no: c.no };
    }
    let l = left && left.no, r = right && right.no;
    if (!l && !r) { l = n - 2 >= 1 ? String(n - 2) : ''; r = String(n + 2); }
    else if (!l) { const d = numOf(r) - n; l = Math.abs(d) <= 12 && n - d >= 1 ? String(n - d) : ''; }
    else if (!r) { const d = n - numOf(l); r = Math.abs(d) <= 12 && (n + d >= 1 || !isIslandReach(x, z)) ? String(n + d) : ''; }        // (islands round 2: No. 3 with its left neighbour 7 read "-1" on the right)
    return { l: l || '', r: r || '' };
  };
  /** the glyph quads of a string, centred on `cx` (metres along the plate's right axis), capitals `cap` m high, in a plate whose centre is (x, y, z) with out-normal (nx, nz) */
  const text = (str, cx, cap, maxW, x, y, z, nx, nz) => {
    const chars = [...(str || '')].filter((c) => GLYPHS.includes(c.toUpperCase())), n = chars.length; if (!n) return;
    const cw = Math.min(cap / 1.05, maxW / n), tx = nz, tz = -nx, qh = cw * 1.04 * 80 / 48;       // advance of a cell; the glyph cell is 48 x 80 px with the capitals 49 px high
    chars.forEach((c, i) => {
      const gi = GLYPHS.indexOf(c.toUpperCase()), off = cx + (i - (n - 1) / 2) * cw;
      panels.panel(atlas, x + tx * off + nx * 0.012, y, z + tz * off + nz * 0.012, nx, nz, cw * 1.04, qh, { alpha: true, uv: [gi / GLYPHS.length, 0, (gi + 1) / GLYPHS.length, 1] });
    });
  };
  /** the number plate (x, z on the wall already offset), centre height y: the plate quad + the three numbers */
  const numberPlate = (street, no, b, x, y, z, nx, nz) => {
    const nb = neighbours(street, no, b, x, z, nx, nz);
    panels.panel(numTex, x, y, z, nx, nz, PLATE.W, PLATE.NH);
    text(no, 0, 0.092 * K, 0.30 * K, x, y - 0.004 * K, z, nx, nz);
    text(nb.l, -0.222 * K, 0.05 * K, 0.12 * K, x, y - 0.004 * K, z, nx, nz);
    text(nb.r, 0.222 * K, 0.05 * K, 0.12 * K, x, y - 0.004 * K, z, nx, nz);
  };

  const mounted = new Set();                                                   // street|no of the numbers that hang under a name plate
  const record = (x, y, z, nx, nz, txt) => { seen.add(x, z); out.plateList.push({ x, z, y, nx, nz, text: txt }); };
  /** a number for the corner: the building at the wall when it is addressed on this street, else the nearest addressed building of the street along the same facade within 25 m */
  const cornerNumber = (nm, hit, b0, aliases = [nm]) => {
    if (b0 && b0.addr && aliases.includes(b0.addr.street)) { const no = baseNo(b0.addr.no).toUpperCase(); if (validNo(no) && numOf(no)) return { no, b: b0, street: b0.addr.street }; }
    let best = null; const rx = hit.nz, rz = -hit.nx;
    for (const al of aliases) for (const c of byStreet.get(al) || []) {
      const dx = c.x - hit.x, dz = c.z - hit.z, along = Math.abs(dx * rx + dz * rz), perp = dx * hit.nx + dz * hit.nz;
      if (along > 25 || perp > 3 || perp < -35) continue;
      if (!best || along < best.along) best = { along, no: c.no, b: c.b, street: al };
    }
    return best && { no: best.no, b: best.b, street: best.street };
  };
  const mountName = (nm, hit, y) => {
    const W = PLATE.W, H = PLATE.H;
    // the name this wall shows: a Line pair names the line of the wall's side (the wall on the east side faces west: out-normal x < 0; east = nearer the Spit = the lower number)
    const full = plateName(nm, hit.nx < 0), aliases = addrNames(nm, hit.nx < 0);
    if (hit.u * hit.len < W / 2 + 0.3 || (1 - hit.u) * hit.len < W / 2 + 0.3) return false;
    const b = L.buildingAt(hit.x - hit.nx * 0.4, hit.z - hit.nz * 0.4);
    if (!b || L.heightOf(b) < 6.5 || (b.minH || 0) > 0.5) return false;
    if (landmark(b, hit.x, hit.z)) return false;
    if (PLATES_PIER.has(b.id) && isOpen(hit.x, hit.z)) {                           // (a wall with the module's own bay rhythm: the plate hangs on the corner pier, not over a window; no clear pier: no plate: PLATES_PIER)
      if (!pierOK(hit.len)) return false;
      const sx = (hit.e[2] - hit.e[0]) / hit.len, sz = (hit.e[3] - hit.e[1]) / hit.len, t = hit.u * hit.len < hit.len / 2 ? PIER_T : hit.len - PIER_T;
      hit = { ...hit, x: hit.e[0] + sx * t, z: hit.e[1] + sz * t, u: t / hit.len };
    }
    if (plateBlocked(hit.x, hit.z) && isOpen(hit.x, hit.z)) return false;
    if (!farFrom(hit.x, hit.z, 7) || sameNear(full, hit.x, hit.z, 34)) return false;
    if (doorNear(hit.x, hit.z, 1.1)) return false;
    let cn = cornerNumber(nm, hit, b, aliases); const x = hit.x + hit.nx * PLATE.off, z = hit.z + hit.nz * PLATE.off;
    if (cn && cn.b !== b && landmark(cn.b, hit.x, hit.z)) cn = null;                   // (the number of a neighbouring landmark house is not hung on this wall either)
    const yn = y - H / 2 - PLATE.gap - PLATE.NH / 2;
    // both rectangles are reserved (the name plate under the building of the wall, the number plate under the building it names: the city's address plates skip a house whose number hangs here)
    if (labels && !labels.reserve(b.id || b.osm || 0, x, y, z, W, H, hit.nx, hit.nz, 'plate')) return false;
    const withNo = cn && (!labels || labels.reserve(cn.b.id || cn.b.osm || 0, x, yn, z, W, PLATE.NH, hit.nx, hit.nz, 'number'));
    panels.panel(getName(full, isIsland(hit.x, hit.z)), x, y, z, hit.nx, hit.nz, W, H);
    out.plates++; byText.add(hit.x, hit.z, full); record(x, y, z, hit.nx, hit.nz, full);
    if (withNo) {
      numberPlate(cn.street || nm, cn.no, cn.b, x, yn, z, hit.nx, hit.nz);
      mounted.add((cn.street || nm) + '|' + cn.no); out.numbers = (out.numbers || 0) + 1; out.plateList.push({ x, z, y: yn, nx: hit.nx, nz: hit.nz, text: full + ' ' + cn.no });
    }
    return true;
  };
  // ---- street-name plates at the junction corners (+ the number plate below)
  for (const nd of net.nodes) {
    if (nd.arms.length < 3 || new Set(nd.arms.filter((a) => a.w.rank >= 1 && a.w.name).map((a) => a.w.name)).size < 2) continue;
    for (const a of nd.arms) {
      const nm = a.w.name; if (!nm || a.w.rank < 1 || a.w.bridge || (NO_PLATE.test(nm) && isIsland(nd.x, nd.z))) continue;
      const dist = (a.box || 8) + 5;
      const px = nd.x + a.dx * dist, pz = nd.z + a.dz * dist;
      for (const sgn of [1, -1]) {
        const nx = -a.dz * sgn, nz = a.dx * sgn;                            // sideways, away from the arm axis
        const hw = (sgn > 0 ? a.hp : a.hm) + KERB_W + 0.3;
        const hit = clearanceHit(px + nx * hw, pz + nz * hw, nx, nz, 26); if (!hit) continue;
        if (hit.nx * nx + hit.nz * nz > -0.6) continue;                      // only walls that face the street
        mountName(nm, hit, PLATE.nameY);
      }
    }
  }

  // ---- house-number plates: one per building number, on the facade edge that faces the named street
  const wayByName = new Map();
  for (const w of net.ways) if (w.name && !w.bridge) for (const k of addrNames(w.name)) { let l = wayByName.get(k); if (!l) wayByName.set(k, (l = [])); l.push(w); }       // (a Line pair answers to the address spellings of both its lines)
  const nearestOnWays = (list, x, z) => {
    let best = null;
    for (const w of list) {
      if (!w.bb) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (let i = 0; i < w.n; i++) { x0 = Math.min(x0, w.x[i]); x1 = Math.max(x1, w.x[i]); z0 = Math.min(z0, w.z[i]); z1 = Math.max(z1, w.z[i]); } w.bb = [x0, x1, z0, z1]; }
      const mg = best ? best.d + w.w / 2 + 1 : 0;
      if (best && (x < w.bb[0] - mg || x > w.bb[1] + mg || z < w.bb[2] - mg || z > w.bb[3] + mg)) continue;     // cannot beat the best way found so far
      for (let i = 0; i + 1 < w.n; i++) {
        const dx = w.x[i + 1] - w.x[i], dz = w.z[i + 1] - w.z[i], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((x - w.x[i]) * dx + (z - w.z[i]) * dz) / l2));
        const px = w.x[i] + dx * t, pz = w.z[i] + dz * t, d = Math.hypot(x - px, z - pz) - w.w / 2;
        if (!best || d < best.d) best = { d, x: px, z: pz, w };
      }
    }
    return best;
  };
  const byKey = new Map();
  for (const b of BUILDINGS) {
    if (b.skip || !b.addr || !b.addr.no || !wayByName.has(b.addr.street) || b.dupOf || b.underground || (b.minH || 0) > 0.5) continue;
    const no = baseNo(b.addr.no); if (!validNo(no.toUpperCase())) continue;
    const key = b.addr.street + '|' + no.toUpperCase(), cur = byKey.get(key);
    if (!cur || (b.area || 0) > (cur.area || 0)) byKey.set(key, b);
  }
  for (const [key, b] of byKey) {
    if (mounted.has(key)) continue;                                          // already under a name plate
    const street = b.addr.street, no = baseNo(b.addr.no).toUpperCase();
    if (L.heightOf(b) < 6.5) continue;
    const list = wayByName.get(street), poly = b.polys[0]; if (!poly) continue;
    const o = poly.o; let best = null;
    for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
      const ax = o[j], az = o[j + 1], bx = o[i], bz = o[i + 1], len = Math.hypot(bx - ax, bz - az); if (len < 3.2) continue;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, ex = (bx - ax) / len, ez = (bz - az) / len;
      let nx = ez, nz = -ex; if (L.insideBuilding(mx + nx * 0.4, mz + nz * 0.4, 0)) { nx = -nx; nz = -nz; if (L.insideBuilding(mx + nx * 0.4, mz + nz * 0.4, 0)) continue; }
      const q = nearestOnWays(list, mx, mz); if (!q || q.d > 16) continue;
      const toRoad = ((q.x - mx) * nx + (q.z - mz) * nz) / (Math.hypot(q.x - mx, q.z - mz) || 1);
      if (toRoad < 0.55) continue;
      const score = q.d + (toRoad < 0.8 ? 3 : 0) - Math.min(len, 30) * 0.05;
      if (!best || score < best.score) best = { score, ax, az, ex, ez, len, nx, nz, q };
    }
    if (!best) continue;
    // near the end of the edge that lies closer to a junction node (corner), else the first end; inset so the 0.6 m plate keeps 0.5 m off the corner
    const pier = PLATES_PIER.has(b.id) && isOpen(best.ax, best.az);
    if (pier && !pierOK(best.len)) continue;
    const inset = pier ? PIER_T : Math.min(1.0 + PLATE.W / 2, best.len / 2);
    const endA = [best.ax + best.ex * inset, best.az + best.ez * inset], endB = [best.ax + best.ex * (best.len - inset), best.az + best.ez * (best.len - inset)];
    const dn = (p) => nodeDist(net, p[0], p[1], 96);
    const e = dn(endA) <= dn(endB) ? endA : endB;
    const x = e[0] + best.nx * PLATE.off, z = e[1] + best.nz * PLATE.off, y = PLATE.numY;
    if (landmark(b, x, z) || (plateBlocked(x, z) && isOpen(x, z))) continue;
    if (!farFrom(x, z, 3.5) || doorNear(x, z, 1.0)) continue;
    if (labels && !labels.reserve(b.id || b.osm || 0, x, y, z, PLATE.W, PLATE.NH, best.nx, best.nz, 'number')) continue;
    numberPlate(street, no, b, x, y, z, best.nx, best.nz);
    seen.add(x, z); out.numbers = (out.numbers || 0) + 1;
    out.plateList.push({ x, z, y, nx: best.nx, nz: best.nz, text: street + ' ' + no });
  }
  // ---- address plates that a landmark module asked for (ADDRESS_PLATES): the standard pair, the number plate at y, the name plate above it
  for (const a of ADDRESS_PLATES) {
    if (ctx.buildList && !ctx.buildList.includes(a.owner)) continue;               // (the wall belongs to the module: no plate without it, a run with --only that leaves the module out draws the generic house elsewhere)
    if (a.pole) {                                                                   // a street-name sign on a pole (no wall): the post stands 1 m clear of every asphalt, the plate is bolted to it
      if (!opts.post || !opts.poles) continue;
      let px = a.x, pz = a.z;
      if (a.near) { const c = clearNear(net, a.x, a.z, a.near, (qx, qz) => !nearWater(qx, qz, 1.0), 1.0); if (!c) continue; [px, pz] = c; }          // (near: the nearest clear pavement base within `near` m, the keep-clear rules of every pole)
      else if (net.cover(px, pz, {}) > -1.0 || nearWater(px, pz, 1.0)) continue;
      opts.post(px, pz, a.pole, 0.045);
      panels.mount(opts.poles, getName(a.street), px, a.y, pz, a.nx, a.nz, PLATE.W, PLATE.H, { pole: 0.045, kind: 'plate' });
      out.plates++; out.addressPlates = (out.addressPlates || 0) + 1; out.polePlates = (out.polePlates || 0) + 1;
      out.plateList.push({ x: px, z: pz, y: a.y, nx: a.nx, nz: a.nz, text: a.street });
      seen.add(px, pz);
      continue;
    }
    const x = a.x + a.nx * PLATE.off, z = a.z + a.nz * PLATE.off, yn = a.y, y = a.no ? yn + PLATE.NH / 2 + PLATE.gap + PLATE.H / 2 : a.y;          // (no number: the name plate alone, centred on y)
    if (labels && !(labels.reserve(a.owner, x, y, z, PLATE.W, PLATE.H, a.nx, a.nz, 'plate') && (!a.no || labels.reserve(a.owner, x, yn, z, PLATE.W, PLATE.NH, a.nx, a.nz, 'number')))) continue;
    panels.panel(getName(a.street), x, y, z, a.nx, a.nz, PLATE.W, PLATE.H);
    out.plates++; out.addressPlates = (out.addressPlates || 0) + 1;
    out.plateList.push({ x, z, y, nx: a.nx, nz: a.nz, text: a.street });
    if (a.no) { numberPlate(a.street, a.no, null, x, yn, z, a.nx, a.nz); out.numbers = (out.numbers || 0) + 1; out.plateList.push({ x, z, y: yn, nx: a.nx, nz: a.nz, text: a.street + ' ' + a.no }); }
    seen.add(x, z);
  }
  void hash2;
  return out;
}
