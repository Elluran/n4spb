// landmarksYusupov-houses: regenerates docs/research/yusupov-houses.json (ordinary buildings of the Moika embankment, Bolshaya Morskaya /
// Pochtamtskaya / Pirogova / Dekabristov / Glinki between x -3300..-2700, z 120..660) from the baked OSM data + the curated rows below
// (photo-checked in docs/research/yusupov.md section 8). Same record shape as summer-garden-houses.json (read by tools/city-known-mars.mjs
// style loaders): rows the palace module draws itself (palace complex ids) are NOT listed.
//   node tools/landmarksYusupov-houses.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);
let OWN = [];
try { OWN = (await import(pathToFileURL(path.join(root, 'src/world/landmarksYusupov/groups.js')).href)).GROUPS_LIST.flatMap((g) => g.ids || []); } catch { /* module not written yet */ }
const OWNED = new Set(['w123243367', 'w123246602', 'w70732352', 'w70732354', 'w123243375', 'w70732356', 'w123243368', ...OWN]);

const X0 = -3300, X1 = -2700, Z0 = 120, Z1 = 660;
const SCOPE = [[/Мойки/, 'moika'], [/Большая Морская/, 'bolshaya-morskaya'], [/Почтамтск/, 'pochtamtskaya'], [/Пирогова/, 'pirogova'], [/Декабристов/, 'dekabristov'],
  [/Глинки/, 'glinki'], [/Прачечн/, 'prachechny'], [/Конногвардейск/, 'konnogvardeysky'], [/Якубовича/, 'yakubovicha'], [/Грибоедова/, 'griboedova']];
const scopeOf = (s) => { for (const [re, k] of SCOPE) if (re.test(s || '')) return k; return 'other'; };

// curated rows: osm id -> overrides (photo-checked: refs/yusupov/NN.jpg of the scratchpad)
const C = {
  w70732353: { name: 'Комплекс зданий Военной коллегии (Александровская военно-юридическая академия, ныне Университет им. Лесгафта)', storeys: 3, hCornice: 15.5, hSource: 'photos 31 / 25: three storeys + heavy cornice (OSM says 2 levels)', style: 'classicism / Rusca, Staubert, Stasov 1806-27', era: '1806-27, 1852-53', wall: '#e2d28a', trim: '#f2efe4', roof: 'grey sheet-iron hip roof (#8b8f94), chimneys', shop: null, conf: 'M', photos: ['refs/yusupov/31.jpg', 'refs/yusupov/25.jpg', 'refs/yusupov/19.jpg'], notes: 'Moika front ~115 m from the Yusupov Palace (u -3) to the Potseluev Bridge; rusticated ground floor (horizontal grooves ~1 m), white window surrounds, strong bracketed cornice; round-arched carriage gate 3.6 x 4.6 m (brown double leaf) at the SW end; the part next to the palace has a lower cornice (14.5 m). Wall colour from photos 31 / 76 (cool yellow #e2d28a).' },
  w70732355: { name: 'Архив Военной коллегии (во дворе Моика 96)', storeys: 2, hCornice: 11, hSource: 'photo 79', style: 'neo-Gothic details in classicist block', era: '19th c.', wall: '#b8564a', trim: '#f2efe4', roof: 'grey sheet iron', conf: 'M', photos: ['refs/yusupov/79.jpg', 'refs/yusupov/78.jpg'], notes: 'Two-storey block painted brick-red with white pointed ("Gothic") window frames, a plain cornice; seen over the garden wall from the Yusupov garden.' },
  w70732361: { name: 'Дом А. М. Голицына (И. Г. Чернышёва, гр. А. П. Шувалова)', storeys: 3, hCornice: 14.5, hSource: 'photo 76 / 28', style: 'strict (orderless) classicism / Burzhua 1834, Camuzzi 1842, Kondratiev 1895', era: '1790-1816', wall: '#dccf9a', trim: '#f2efe4', roof: 'hip roof, green sheet iron (#55705a)', conf: 'M', photos: ['refs/yusupov/76.jpg', 'refs/yusupov/28.jpg'], notes: 'Moika 90, corner of Prachechny Lane: cream-olive plaster, rusticated ground floor (horizontal grooves), white window surrounds with small cartouche panels between the floors, orange-painted gate piers with an iron gate on the lane side. [W ru.wikipedia Набережная реки Мойки]' },
  r1109064: { name: 'Дом на углу набережной Мойки и улицы Глинки (Мойка 98)', storeys: 5, hCornice: 22, hSource: 'photo 77 / 32 (OSM has no levels)', style: 'late classicism / institutional block', era: '19th c., rebuilt', wall: '#e6d58a', trim: '#f1ecd9', roof: 'flat sheet iron', conf: 'M', photos: ['refs/yusupov/77.jpg', 'refs/yusupov/32.jpg'], notes: 'Huge pale-yellow five-storey block along the Moika to the Potseluev Bridge, a tall round-arched entrance, a second part in tan (#dcc08a) with plain windows.' },
  r15343421: { name: 'Дом на Большой Морской, 63', storeys: 3, hCornice: 14, hSource: 'photo 84 (across the Moika from the Yusupov Palace)', style: 'classicism with a central pediment', era: '19th c.', wall: '#eddc9c', trim: '#f4f1ea', roof: 'blue-grey sheet iron (#6f7f9a)', conf: 'M', photos: ['refs/yusupov/84.jpg'], notes: 'Pale-yellow three-storey house on the Moika (north-west bank, opposite the palace) with white trim, a central pediment and rounded gables, lime trees in front; next to it (NE) the red-brown five-storey house Bolshaya Morskaya 61.' },
  w70732344: { name: 'Дом на переулке Пирогова, 18', storeys: 3, hCornice: 14, hSource: 'photos 82 / 87', style: 'classicism', era: '19th c.', wall: '#e8d49a', trim: '#f4f1ea', roof: 'grey sheet iron', conf: 'M', photos: ['refs/yusupov/82.jpg', 'refs/yusupov/87.jpg'], notes: 'Cream-yellow three-storey block with tall arched windows on the yard wings and a small balcony (photos 82 / 87).' },
  w70732346: { name: 'Дом на переулке Пирогова, 21 (флигель домашнего театра дворца)', storeys: 3, hCornice: 13, hSource: 'estimate from photo 53 / 49', style: 'classicism, rusticated', era: '1830s', wall: '#dcb368', trim: '#f2efe4', conf: 'L', photos: ['refs/yusupov/49.jpg', 'refs/yusupov/51.jpg'], notes: 'Possible service wing of the palace theatre (citywalls: Декабристов 21): rusticated lower storeys, tall arched window pairs with a balconette, a high attic with a roof railing.' },
  w70732366: { name: 'Служебный корпус дворца Юсуповых (НИИ Спецпроектреставрация)', storeys: 3, hCornice: 12, hSource: 'estimate', style: 'classicism, service block of the palace estate', era: '19th c.', wall: '#dcb368', trim: '#f2efe4', conf: 'L', photos: ['refs/yusupov/50.jpg'], notes: 'Long east-side service block of the palace estate between the garden and the Pirogova yards, ending at Dekabristov street.' },
  w150616244: { name: 'Служебный корпус дворца Юсуповых (восточнее ворот двора)', storeys: 4, hCornice: 15, hSource: 'OSM levels 4', style: 'classicism', era: '19th c.', wall: '#e3b860', trim: '#f2efe4', conf: 'L', photos: [], notes: 'East of the SE gate of the palace courtyard; part of the palace estate (the house theatre block is the SE end of the palace ring itself).' },
};

const rows = [];
for (const b of D.BUILDINGS) {
  if (b.part || b.skip || OWNED.has(b.id)) continue;
  if (b.cx < X0 || b.cx > X1 || b.cz < Z0 || b.cz > Z1) continue;
  const o = b.polys[0].o;
  const [lon, lat] = unproj(b.cx, b.cz);
  const street = b.addr?.street || '', no = b.addr?.no || '';
  const c = C[b.id] || {};
  rows.push({
    addr: street ? `${street}, ${no}`.trim().replace(/,\s*$/, '') : null,
    name: c.name || b.name || null,
    osm: b.id,
    scope: scopeOf(street),
    side: null,
    lat: +lat.toFixed(6), lon: +lon.toFixed(6),
    x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: c.storeys ?? b.levels ?? null,
    storeysSource: c.storeys ? (c.hSource || 'photo') : (b.levels ? 'OSM building:levels' : null),
    hCornice: c.hCornice ?? null,
    hSource: c.hCornice ? c.hSource : null,
    style: c.style || null,
    era: c.era || (b.startDate || null),
    wall: c.wall || null,
    trim: c.trim || null,
    roof: c.roof || (b.roof ? `OSM roof:shape=${b.roof}` : null),
    shop: c.shop ?? null,
    notes: c.notes || 'not researched in depth (no curated entry): pick archetype colour / ornament from the neighbours (Moika / Bolshaya Morskaya blocks: pale yellow, ochre, cream-olive, salmon; white trim)',
    conf: c.conf || 'L',
    photos: c.photos || [],
    osmTags: { colour: b.colour || null, levels: b.levels ?? null, height: b.hSrc === 'tag' ? b.h : null, start_date: b.startDate || null, roofShape: b.roof || null, heritage: b.heritage || null, wikidata: b.wikidata || null },
    footprintArea: Math.round(b.area),
    footprint: [[+o[0].toFixed(1), +o[1].toFixed(1)]],
  });
}
rows.sort((a, b) => (a.scope === b.scope ? a.x - b.x : a.scope < b.scope ? -1 : 1));
console.log(rows.length, 'rows;', rows.filter((r) => r.conf !== 'L').length, 'curated;', Object.keys(C).filter((k) => !rows.some((r) => r.osm === k)).join(',') || 'all curated ids matched');
if (!process.argv.includes('--dry')) fs.writeFileSync(path.join(root, 'docs/research/yusupov-houses.json'), JSON.stringify(rows, null, 1) + '\n');
