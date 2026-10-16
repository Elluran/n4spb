// tools/landmarksMariinsky-houses.mjs - writes docs/research/mariinsky-houses.json: the ordinary houses of Teatralnaya Square and the streets round the Mariinsky Theatre
// (Dekabristov, Glinka, Rimsky-Korsakov pr., Soyuza Pechatnikov, Kryukov canal / Griboedov canal embankments, Matveeva) in the shape of docs/research/summer-garden-houses.json
// (another agent adds them as KNOWN houses).  Footprints / levels / addresses come from the baked data (src/world/data/city*.js); the curated table below carries the facts read from
// Wikipedia (ru: Театральная площадь, улица Глинки, набережная Крюкова канала) and the colours read from the Commons photos listed in docs/research/mariinsky.md.
// usage: node tools/landmarksMariinsky-houses.mjs [--out docs/research/mariinsky-houses.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const O = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);
const outArg = process.argv.indexOf('--out');
const OUT = outArg > 0 ? process.argv[outArg + 1] : path.join(root, 'docs/research/mariinsky-houses.json');

// area of interest (the S2 rect around the theatre, 10 m margin): x -3335..-2775, z 470..1020
const BOX = [-3335, 470, -2775, 1020];
// buildings drawn by landmarksMariinsky itself (see docs/research/mariinsky.md section 14) are NOT houses of this table
const MINE = new Set(['r1690283', 'r1083410', 'w182876241', 'w220183360', 'w28329128']);

const GRANITE = '#9b9c93';
// Curated facts. Keys = baked ids. wall / trim / roof are sRGB hex read from the photos; hCornice = street-front cornice height in metres.
const K = {
  // ---- Teatralnaya pl. (odd side = the Griboedov side, even = the theatre side: ru.wikipedia 'Театральная площадь')
  'w68906131': { name: 'Дом У. Кребер (Генеральное консульство Италии)', addr: 'Театральная пл., 10', style: 'modern / neo-baroque garlands on a 1874 4-storey rent house (N. Becker)', era: '1874 надстройка Н. Беккера', wall: '#cdd4d9', trim: '#f4f4f0', roof: 'iron grey, low hip behind a balustrade', hCornice: 18, conf: 'M', notes: 'photo 70 [V]: pale blue-grey stucco, white relief ornament between the windows, granite-chip ground floor #9b9c93, two entrances with wooden doors + a carriage arch, silver lamp post with 2 globes in front. (flags of the consulate: omit)' , photos: ['70_tp10'] },
  'w68906160': { name: 'Дом Ф. Моргана', addr: 'Театральная пл., 12', style: 'Italian Renaissance revival (F. I. Wintergalter 1877)', era: '1877', wall: '#c4c1c8', trim: '#f2f0ec', roof: 'sheet iron, pitched, hidden behind a cornice with a dormer pediment', hCornice: 22, conf: 'H', notes: 'photo 46 [V]: 5 storeys, lilac-grey stucco, rusticated ground + first floor #aaa49f, two three-sided bay windows (erkers) at both ends of the front carried on stone consoles, masks / garlands / quivers / torches between the windows, iron balconies on the 2nd floor, one arch gateway at the right end, number plate Театральная 12', photos: ['46_sq_863'] },
  'w68906147': { name: 'Особняк Мордвиновых (Дом И. Балле), Opera Palace', addr: 'ул. Глинки, 4 / Театральная пл., 14', style: 'Visconti 1828, eclectic facades (3 storeys + 1970s raise)', era: '1828, 1895', wall: '#e1cfa4', trim: '#f2ebd8', roof: 'side-hipped sheet iron', hCornice: 17, conf: 'L', notes: 'corner house at Glinka street and Teatralnaya pl., formerly children hospital no. 17, now residences; colour not seen [E] pale ochre', photos: [] },
  'r1083180': { name: 'Дом Ф. Ф. фон Кистера', addr: 'Театральная пл., 16 / ул. Глинки, 9-11 / наб. Крюкова канала, 9-11', style: 'built 1806 (3 storeys with pediments), 1875-76 raised by A. I. Krakau, Italian Renaissance decor', era: '1875', wall: '#e5cf9a', trim: '#f1ead6', roof: 'sheet iron', hCornice: 19, conf: 'M', notes: 'Philippov bakery on the ground floor (historical); the ballerina A. Istomina lived here; photo 83 [V] shows the Kryukov side (Kryukov 9 w80415284: ochre #e6c98c with a central arch gateway)', photos: ['83_kr9'] },
  'r17336264': { name: 'Дом Д. Л. Животовского (Дом Крапоткина)', addr: 'Театральная пл., 18 / наб. Крюкова канала, 10', style: 'classicism, raised and widened by E. I. Melnikov in the 1830s: 3 storeys + pediment, central balcony with openwork railing on granite brackets', era: '1830s', wall: '#a9c9b3', trim: '#f2f0ea', roof: 'grey sheet iron, hip + pediment', hCornice: 13.5, conf: 'H', notes: 'photo 74 [V] (Kryukov 10 elevation): mint-green wall, white window surrounds with triangular pediments on the 2nd floor, balconies over the arched entrance; now Mariinsky offices / hostel; Decembrist F. N. Glinka lived here 1819-22 (plaque on Glinka street side)', photos: ['74_kr10', '80_krap'] },
  'w68906126': { name: 'Дом на ул. Глинки, 6', addr: 'ул. Глинки, 6', style: 'rent house', era: '19th c.', wall: '#e0cba0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 13.5, conf: 'L', notes: '', photos: [] },
  'r1083185': { name: 'Дворец вел. кн. Кирилла Владимировича', addr: 'ул. Глинки, 13', style: 'eclecticism', era: 'late 19th c.', wall: '#e3d3ad', trim: '#f2ebd8', roof: 'sheet iron', hCornice: 13.5, conf: 'L', notes: 'wikipedia ru Улица Глинки list: "№ 13 - Дворец Великого князя Кирилла Владимировича"; 3 storeys, faces Nikolskaya sq / cathedral', photos: [] },
  // ---- Griboedov canal embankment, theatre side of the square
  'w68048373': { name: 'Дом Е. Паульсен / Доходный дом Л. М. Харламова', addr: 'наб. канала Грибоедова, 109 / Театральная пл., 8', style: 'modern (Art Nouveau), 1902-04 by L. M. Kharlamov on a late-18th-c. 3-storey house (G. Paulsen)', era: '1902-1904', wall: '#d9cfae', trim: '#f0ead8', roof: 'red-brown sheet iron mansard, dormers, corner pediment', hCornice: 22, conf: 'M', notes: 'photos 71, 54 [V]: 6 storeys, pale sand stucco, corner volume towards the canal bend, brown iron roof; plaque to A. S. Pushkin (the "Green Lamp" society, 1819-20) at (-2865,778)', photos: ['71_gribo109', '54_griboedov109'] },
  'r1083412': { name: 'Дом на наб. канала Грибоедова, 107 / Театральная пл., 6', addr: 'Театральная пл., 6 / наб. канала Грибоедова, 107', style: 'Vargin rent house in Russian-Byzantine style 1877 (2 storeys + 1-storey wing), rebuilt', era: '1877 E. P. Vargin', wall: '#d9b98a', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'L', notes: 'OSM carries 4 levels; ru.wikipedia says the 1877 house was two-storey (Vargin) - the footprint record r1083412 (1424 m2) probably includes later raised parts', photos: [] },
  'r17702030': { name: 'Особняк Е. Т. Соколова (Дом Бухгольца)', addr: 'Театральная пл., 4 / наб. канала Грибоедова, 105', style: 'classicism 1808-10 (E. T. Sokolov), side parts raised to 3 storeys 1852 (A. A. Poiret) with segmental pediments', era: '1808-1852', wall: '#e8d9b0', trim: '#f2ece0', roof: 'sheet iron', hCornice: 13, conf: 'M', notes: 'M. A. Vrubel lived here in winter 1904-05; two-storey centre between 3-storey wings capped with shallow segmental pediments', photos: [] },
  'w68926311': { name: 'Дом на наб. канала Грибоедова, 103', addr: 'наб. канала Грибоедова, 103', style: 'rent house', era: '19th c.', wall: '#dccaa2', trim: '#f0ead8', roof: 'sheet iron', hCornice: 13.5, conf: 'L', notes: '', photos: [] },
  // ---- the conservatory-side houses of Dekabristov street (north of the square)
  'w68926327': { name: 'Дом Ф. Л. Гуна (Дом С. И. Андреева)', addr: 'Театральная пл., 2 / ул. Декабристов, 32', style: 'French Renaissance facade by F. L. Gun 1874, raised to 5 storeys 1909 (S. I. Andreev)', era: '1874 / 1909', wall: '#d8dccc', trim: '#f2f2ea', roof: 'sheet iron, corner mansard', hCornice: 22, conf: 'M', notes: 'ru.wikipedia: facade decorated with masks, plant garlands and sea shells; two triangular bay windows (erkers) with half-figures and stucco vases, fruit, flowers and storks; rusticated ground floor; plaque to V. E. Meyerhold at (-2949.5,611.8). Photo 76 [V] shows the ornate yellow corner house on Dekabristov (27/29 side, not this one) as a style reference', photos: ['76_dek27'] },
  'w114309968': { name: 'Дом на ул. Декабристов, 32 (флигель)', addr: 'ул. Декабристов, 32', style: 'rent house', era: '19th c.', wall: '#d8cdb0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'L', notes: '', photos: [] },
  'w68926321': { name: 'Дом на ул. Декабристов, 30', addr: 'ул. Декабристов, 30', style: 'rent house', era: '19th c.', wall: '#dcc9a0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'L', notes: 'footprint belongs to r17702167 / w68926321 pair', photos: [] },
  // ---- Dekabristov / Kryukov canal west of the theatre (Mariinsky-II side)
  'w108532089': { name: 'Жилой дом (Декабристов, 29)', addr: 'ул. Декабристов, 29', style: 'Stalinist neoclassicism 1930s (grey rendered block, pilastered balconies)', era: '1930s', wall: '#9d9a94', trim: '#c9c5bc', roof: 'sheet iron, flat behind a parapet', hCornice: 26, conf: 'M', notes: 'photo 82 [V] (Декабристов 29а): 7 storeys, grey stucco, balcony bays at the corners, cornice with dentils; two records w108532089 + w112518072 form the block on the site of the Lithuanian Castle prison', photos: ['82_dek29a'] },
  'w112518072': { name: 'Жилой дом (Декабристов, 29)', addr: 'ул. Декабристов, 29', style: 'Stalinist neoclassicism 1930s', era: '1930s', wall: '#9d9a94', trim: '#c9c5bc', roof: 'sheet iron, flat behind a parapet', hCornice: 26, conf: 'M', notes: 'see w108532089', photos: ['82_dek29a'] },
  'w528557412': { name: 'Детская городская больница №17 (Декабристов, 36/1)', addr: 'ул. Декабристов, 36/1', style: 'hospital block 1870s-1970s, pale ochre corner building', era: '19th c. + 1970s', wall: '#e3d3ad', trim: '#f2ebd8', roof: 'gabled sheet iron', hCornice: 17, conf: 'M', notes: 'photo 81 [V] (Декабристов 36): pale ochre stucco, rounded corner at Minsky pereulok, white window frames, iron roof railing', photos: ['81_dek36'] },
  'w80424632': { name: 'Декабристов, 36/1 (корпус)', addr: 'ул. Декабристов, 36/1', style: 'hospital wing', era: '19th c.', wall: '#e3d3ad', trim: '#f2ebd8', roof: 'hipped sheet iron', hCornice: 13, conf: 'L', notes: '', photos: [] },
  'w80415281': { name: 'Дом на наб. Крюкова канала, 7/2', addr: 'наб. Крюкова канала, 7 / ул. Союза Печатников, 2', style: 'rent house', era: '19th-20th c.', wall: '#dccaa0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 21.5, conf: 'L', notes: 'faces the Torgovy bridge across from the Mariinsky II glass foyer', photos: [] },
  'w80415284': { name: 'Дом Чешихина', addr: 'наб. Крюкова канала, 9', style: 'late-18th-c. house raised by F. I. Ruska 1840-41; 4 storeys, central arch gateway', era: '1840-41', wall: '#e6c98c', trim: '#f2ead2', roof: 'sheet iron', hCornice: 17, conf: 'H', notes: 'photo 83 [V]: pale yellow-ochre plaster, white window pediments on the 2nd floor, a central arched gateway with dark iron gates and one smaller arch to the right, restaurant on the ground floor', photos: ['83_kr9'] },
  'w437633654': { name: 'Манеж Половцовых', addr: 'наб. Крюкова канала, 12', style: 'riding school 1887 (M. E. Mesmakher): long hall with a row of arched windows under a red sheet-iron roof, rusticated pink-ochre walls', era: '1887', wall: '#e3b88e', trim: '#f0e2cc', roof: 'red sheet iron (#c8452a), long gable', hCornice: 11, conf: 'H', notes: 'photos 72, 79 [V]: pinkish-ochre rusticated wall with 7 big arched windows, 1-storey-high arcade; hall height ~ 11 m; next to the Vege house', photos: ['72_kr12_manege', '79_polovtsov'] },
  'w68906118': { name: 'Доходный дом Р. Г. Веге', addr: 'наб. Крюкова канала, 14 / пр. Римского-Корсакова, 41', style: 'neoclassicism / early Art Deco with rounded corner and stepped corner tower; 1912-14 (S. O. Ovsyannikov)', era: '1912-1914', wall: '#8a5a4c', trim: '#b98f7e', roof: 'sheet iron', hCornice: 24, conf: 'H', notes: 'photo 73 [V]: dark rose-brown (granite-coloured) rendered rusticated walls, rounded corner with bay, arched upper windows, 6 storeys; OSM heritage=4, start_date 1914', photos: ['73_vege14'] },
  // ---- Soyuza Pechatnikov / Matveeva
  'w80424607': { name: 'ул. Союза Печатников, 3', addr: 'ул. Союза Печатников, 3', style: 'rent house', era: '19th-20th c.', wall: '#dccaa0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 21.5, conf: 'L', notes: '', photos: [] },
  'r1207543': { name: 'ул. Союза Печатников, 10', addr: 'ул. Союза Печатников, 10', style: 'rent house', era: '19th-20th c.', wall: '#d8cba8', trim: '#f0ead8', roof: 'sheet iron', hCornice: 24.5, conf: 'L', notes: '', photos: [] },
  // ---- Rimsky-Korsakov pr.
  'r15020518': { name: 'пр. Римского-Корсакова, 31', addr: 'пр. Римского-Корсакова, 31', style: 'rent house', era: '19th c.', wall: '#dccaa0', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'L', notes: '', photos: [] },
  'w68906154': { name: 'пр. Римского-Корсакова, 37', addr: 'пр. Римского-Корсакова, 37', style: 'rent house', era: '19th c.', wall: '#d9c9a4', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'L', notes: '', photos: [] },
  // ---- Moika embankment / Glinka 1-3 (north of Dekabristov): the big blocks beside the Conservatory second building
  'r1109066': { name: 'Дом Направника, Стравинского, Наливкина', addr: 'ул. Глинки, 3-5-7 / наб. Крюкова канала, 6-8', style: 'early-1800s core, rebuilt 1871-74 by E. P. Vargin (Nemkova house) and extended through the 19th c.', era: '1871-74', wall: '#dccfaa', trim: '#f2ecda', roof: 'sheet iron', hCornice: 17, conf: 'M', notes: 'photo 75 [V] (Kryukov 6-8): cream-yellow stucco with heavy window pediments, corner volume with bay windows; plaques to E. F. Napravnik (-3171,582), D. V. Nalivkin (-3161,616), I. F. Stravinsky (-3155,635)', photos: ['75_kr6_8', '78_nemkova'] },
  'r1109063': { name: 'Доходный дом А. Б. Фитингофа', addr: 'ул. Глинки, 1', style: 'rent house 1855-56 by Karl Andersson, interiors reworked 1907 (V. Schaub)', era: '1855-56', wall: '#d6cfb4', trim: '#f0ead8', roof: 'sheet iron', hCornice: 17, conf: 'M', notes: 'ru.wikipedia Улица Глинки: "№ 1"; facade not changed since 1907', photos: [] },
};

const rows = [];
for (const b of C.BUILDINGS) {
  if (b.part || (b.skip && !K[b.id])) continue;   // skip=1 records that carry parts are kept when curated (the parts are what the city draws)
  if (MINE.has(b.id)) continue;
  if (b.cx < BOX[0] || b.cx > BOX[2] || b.cz < BOX[1] || b.cz > BOX[3]) continue;
  if ((b.area || 0) < 60) continue;          // sheds, kiosks: city draws them generically
  if (b.id === 'r1109064') continue;         // Glinka 2 = the Conservatory's second building (huge block, generic is fine, not a house)
  rows.push(b);
}
rows.sort((a, b) => a.cz - b.cz || a.cx - b.cx);

const levelsH = (L) => (L == null ? null : ({ 1: 5, 2: 9, 3: 13.5, 4: 17.5, 5: 21.5, 6: 24.5, 7: 27 }[Math.min(L, 7)] || L * 3.6));
const scopeOf = (b) => {
  const s = (b.addr && b.addr.street) || '';
  if (/Театральная/.test(s)) return 'teatralnaya';
  if (/Декабристов/.test(s)) return 'dekabristov';
  if (/Глинки/.test(s)) return 'glinka';
  if (/Римского/.test(s)) return 'rimskogo-korsakova';
  if (/Крюкова/.test(s)) return 'kryukov';
  if (/Грибоедова/.test(s)) return 'griboedov';
  if (/Печатников/.test(s)) return 'soyuza-pechatnikov';
  if (/Матвеева|Минский|Лермонтов/.test(s)) return 'matveeva';
  if (/Мойки/.test(s)) return 'moika';
  return 'other';
};

const out = rows.map((b) => {
  const k = K[b.id] || {};
  const [lon, lat] = O.unproj(b.cx, b.cz);
  const L = b.levels == null ? null : b.levels;
  const h = k.hCornice != null ? k.hCornice : levelsH(L);
  return {
    addr: k.addr || (b.addr && b.addr.street ? `${b.addr.street}${b.addr.no ? ', ' + b.addr.no : ''}` : null),
    name: k.name || b.name || null,
    osm: b.id,
    scope: scopeOf(b),
    side: null,
    lat: +lat.toFixed(6), lon: +lon.toFixed(6),
    x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: L,
    storeysSource: L == null ? 'none in OSM' : 'OSM building:levels',
    hCornice: h,
    hSource: k.hCornice != null ? 'estimated from photo / dossier' : (h == null ? 'none' : 'estimated from storeys only (pre-1917 table 3 = 13.5, 4 = 17.5, 5 = 21.5, 6 = 24.5 m)'),
    style: k.style || null,
    era: k.era || b.startDate || null,
    wall: k.wall || null,
    trim: k.trim || null,
    roof: k.roof || (b.roof ? String(b.roof) : null),
    shop: null,
    notes: k.notes || '',
    conf: k.conf || 'L',
    photos: (k.photos || []).map((p) => 'refs/mariinsky/' + p + '.jpg'),
    osmTags: { colour: b.colour || null, levels: L, height: b.hSrc === 'height' ? b.h : null, start_date: b.startDate || null, roofShape: b.roof || null, heritage: b.heritage || null, wikidata: b.wikidata || null },
    footprintArea: Math.round(b.area),
    footprint: [(b.polys && b.polys[0] ? b.polys[0].o.slice(0, 2) : [b.cx, b.cz])],
  };
});
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
const cur = out.filter((r) => K[r.osm]).length;
console.log(`wrote ${OUT}: ${out.length} records (${cur} curated), by scope:`, JSON.stringify(out.reduce((a, r) => (a[r.scope] = (a[r.scope] || 0) + 1, a), {})));
const miss = Object.keys(K).filter((id) => !out.find((r) => r.osm === id));
if (miss.length) console.log('curated ids not in the area / data:', miss.join(' '));
