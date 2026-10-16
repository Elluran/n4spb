// landmarksUniversity-houses: writes docs/research/university-embankment-houses.json = the ORDINARY buildings around Universitetskaya embankment that landmarksUniversity does not draw
// (same shape as nikolsky-houses.json / strelka-houses.json: the city owner turns it into KNOWN houses).  Footprints / levels come from the baked data, the curated fields from
// docs/research/university-embankment.md and the photos refs/university (ma_01 ma_02 em_12 sa_01 re_05 tc_07).  The Ott institute, the yard of the Zoological museum and the houses of
// Makarova embankment are in strelka-houses.json already.
//   node tools/landmarksUniversity-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);

const YARD = 'inside the closed University yard west of the Twelve Collegia: seen only over the gallery roof and from the yard roads';
const CURATED = {
  w28567241: { addr: 'Университетская наб., 13', name: 'Манеж Первого кадетского корпуса', scope: 'embankment', storeys: 2, hCornice: 11, style: 'Elizabethan baroque (I. Borchardt, 1756-59): a two-storey front block of 7 axes with strongly projecting pilasters, an entablature over each floor and a segmental pediment with stucco over the middle; the one-storey riding hall behind it (T plan) has tall round-headed windows between rusticated piers', era: '1756-1759', wall: '#e4e4dc', trim: '#f4f2ea', roof: '#9aa0a4', notes: 'pale grey-white with white trim (photo ma_01); a balcony on brackets over the door; restaurant today; the hall behind is ~7 m to the eaves', conf: 'M', photos: ['ma_01', 'ma_02'] },
  w28567242: { addr: 'Университетская наб., 13 лит. Б', name: null, scope: 'embankment', storeys: 1, hCornice: 4.5, style: 'one-storey service wing of the Manege', wall: '#e4e4dc', trim: '#f4f2ea', roof: '#9aa0a4', notes: null, conf: 'L', photos: [] },
  w1284290250: { addr: 'Университетская наб., 13 лит. Ж', name: null, scope: 'embankment', storeys: 1, hCornice: 3.5, style: 'service shed', wall: '#d8d2c2', trim: null, roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w1284290251: { addr: 'Университетская наб., 13 (двор)', name: null, scope: 'embankment', storeys: 1, hCornice: 3.5, style: 'service shed', wall: '#d8d2c2', trim: null, roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w28567243: { addr: 'Филологический пер. (двор)', name: null, scope: 'university-yard', storeys: 1, hCornice: 4, style: 'one-storey gabled yard building', wall: '#c9504a', trim: '#f2efe6', roof: '#9aa0a4', notes: YARD, conf: 'L', photos: [] },
  w28567245: { addr: 'Филологический пер. (двор)', name: null, scope: 'university-yard', storeys: 1, hCornice: 4.5, style: 'one-storey service range', wall: '#d8cfb8', trim: null, roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567248: { addr: 'Университетская наб., 7-9-11 (бассейн)', name: 'Бассейн СПбГУ', scope: 'university-yard', storeys: 2, hCornice: 9, style: 'plain 20th-century sports block', wall: '#d9d2bd', trim: '#efece2', roof: '#8c9296', notes: YARD + '; OSM has no levels (the generic default would be far too tall)', conf: 'L', photos: [] },
  r2870006: { addr: 'Филологический пер., 3 лит. П', name: 'Административное здание СПбГУ', scope: 'university-yard', storeys: 4, hCornice: 16, style: 'plain four-storey block', wall: '#d9c9a8', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567258: { addr: 'Университетская наб., 7-9-11 лит. О', name: 'Спортивный зал СПбГУ (Jeu de paume, 1793)', scope: 'university-yard', storeys: 2, hCornice: 11, style: 'early classicism: the hall for ball games of the Cadet Corps (1793), the first covered sports building in Russia; a tall hall with big round-headed windows', era: '1793', wall: '#e6d7a0', trim: '#f3efe4', roof: '#9aa0a4', notes: YARD + '; plaques: the first radiogram of A. S. Popov (1896) and "Jeu de paume" (OSM MONUMENTS)', conf: 'L', photos: [] },
  w28567373: { addr: 'Университетская наб., 7-9-11 лит. С', name: null, scope: 'university-yard', storeys: 3, hCornice: 13, style: 'plain institute block', wall: '#c98b6f', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567266: { addr: 'Университетская наб., 7-9-11 (корпус "Р")', name: 'Корпус "Р"', scope: 'university-yard', storeys: 4, hCornice: 15, style: 'plain four-storey block', wall: '#d9c9a8', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567372: { addr: 'Университетская наб., 7-9-11 лит. Ш', name: 'Физический институт СПбГУ', scope: 'university-yard', storeys: 4, hCornice: 20, style: 'brick style, 1899-1901: a big dark red-brown brick institute block with tall windows', era: '1899-1901', wall: '#8e4f3f', trim: '#c9a38a', roof: '#8c9296', notes: 'the red-brown mass behind the Collegia in the views from St Isaac\'s (photo em_12); OSM has no levels', conf: 'M', photos: ['em_12'] },
  w28567252: { addr: 'Университетская наб., 7-9-11 лит. СО', name: null, scope: 'university-yard', storeys: 3, hCornice: 12, style: 'plain institute block', wall: '#c98b6f', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w688445789: { addr: 'Университетская наб., 7-9-11 (двор)', name: null, scope: 'university-yard', storeys: 2, hCornice: 8, style: 'yard block', wall: '#d8cfb8', trim: null, roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567374: { addr: 'Университетская наб., 7-9-11 (двор)', name: null, scope: 'university-yard', storeys: 3, hCornice: 12, style: 'plain institute block', wall: '#d9c9a8', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w28567597: { addr: 'Университетская наб., 7-9-11 лит. АК', name: 'Институт общей генетики им. Н. И. Вавилова (Санкт-Петербургский филиал)', scope: 'university-yard', storeys: 3, hCornice: 12, style: 'plain institute block', wall: '#d9c9a8', trim: '#f1ece0', roof: '#8c9296', notes: YARD, conf: 'L', photos: [] },
  w216655315: { addr: 'Университетская наб., 7-9-11 лит. АВ', name: null, scope: 'university-yard', storeys: 1, hCornice: 4, style: 'yard shed', wall: '#c9504a', trim: '#f2efe6', roof: '#9aa0a4', notes: 'a small red building beside the gallery (photo tc_02 right)', conf: 'L', photos: ['tc_02'] },
  w216655301: { addr: 'Университетская наб., 7-9-11 лит. ГО', name: null, scope: 'university-yard', storeys: 1, hCornice: 4, style: 'yard shed', wall: '#c9504a', trim: '#f2efe6', roof: '#9aa0a4', notes: YARD, conf: 'L', photos: [] },
  w107544364: { addr: 'Университетская наб., 7-9-11 лит. Г', name: null, scope: 'university-yard', storeys: 1, hCornice: 4, style: 'garages: a low red range with a grey hipped roof', wall: '#c9504a', trim: '#f2efe6', roof: '#9aa0a4', notes: 'the low red building right of the north end of the Collegia in photo tc_02', conf: 'M', photos: ['tc_02'] },
  w107544360: { addr: 'Биржевая линия, 4 лит. М', name: 'Здание ИТМО', scope: 'birzhevaya', storeys: 3, hCornice: 14, style: 'plain early 20th-century block', wall: '#d9c9a8', trim: '#f1ece0', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w107544378: { addr: 'Биржевая линия, 6', name: 'Университетский центр (Центр питания, делового и культурного сотрудничества СПбГУ)', scope: 'birzhevaya', storeys: 3, hCornice: 15, style: 'eclectic, late 19th century: rusticated ground floor, round-headed windows in rusticated surrounds on the first floor, a balustraded parapet', wall: '#d9b9a8', trim: '#efe6da', roof: '#8c9296', notes: 'pinkish beige with pale trim; it is the backdrop of the Sakharov monument (photo sa_01); gilded lettering "УНИВЕРСИТЕТСКИЙ ЦЕНТР" over the first floor', conf: 'M', photos: ['sa_01'] },
  r1530759: { addr: 'Биржевая линия, 1', name: 'Библиотека Российской академии наук', scope: 'birzhevaya', storeys: 4, hCornice: 23, style: 'neoclassical revival (R. Marfeld, 1912-25): a massive grey block with a rusticated base, giant pilasters and a rounded corner with columns on Sakharov Square', era: '1912-1925', wall: '#b9b5aa', trim: '#d9d5ca', roof: '#8c9296', notes: 'grey terrazite plaster; the main entrance faces the square; only its east part lies inside V1', conf: 'L', photos: [] },
  w820437715: { addr: 'Биржевая линия, 1/1 лит. О', name: null, scope: 'birzhevaya', storeys: 4, hCornice: 16, style: 'book stack / service block of the Library', wall: '#c9c2b0', trim: '#e6e0d2', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w30325551: { addr: 'Биржевая линия, 1/1 лит. О', name: null, scope: 'birzhevaya', storeys: 2, hCornice: 9, style: 'the surviving range of the old Gostiny Dvor of Trezzini (1722-35) on Tiflisskaya ul.: a low arcaded two-storey block', era: '1722-1735', wall: '#e6d9a6', trim: '#f1ece0', roof: '#b23a3c', notes: 'ru.wikipedia "Новобиржевой Гостиный двор": the only remaining part of the old trading rows, today a store of the Library', conf: 'L', photos: [] },
  w30325552: { addr: 'Биржевая линия, 1/1 лит. З', name: null, scope: 'birzhevaya', storeys: 2, hCornice: 9, style: 'service block of the Library', wall: '#d8cfb8', trim: '#efece2', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w107544383: { addr: 'Биржевая линия, 1/1 лит. Ж', name: null, scope: 'birzhevaya', storeys: 4, hCornice: 16, style: 'service block of the Library', wall: '#c9c2b0', trim: '#e6e0d2', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
};

const out = [];
for (const [id, c] of Object.entries(CURATED)) {
  const b = D.BUILDINGS.find((q) => q.id === id);
  if (!b) { console.warn('not in the baked data:', id); continue; }
  const o = b.polys[0].o, ring = []; for (let i = 0; i < o.length; i += 2) ring.push([Math.round(o[i] * 10) / 10, Math.round(o[i + 1] * 10) / 10]);
  ring.push(ring[0].slice());
  let area = 0; for (let i = 0; i + 1 < ring.length; i++) area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  const [lon, lat] = unproj(b.cx, b.cz);
  out.push({
    addr: c.addr, name: c.name, osm: id, scope: c.scope, side: null, lat: Math.round(lat * 1e6) / 1e6, lon: Math.round(lon * 1e6) / 1e6, x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: c.storeys, storeysSource: b.levels ? 'OSM building:levels ' + b.levels + (b.levels !== c.storeys ? ' (corrected)' : '') : 'estimate', hCornice: c.hCornice, hSource: 'estimated from storeys and photos',
    style: c.style, era: c.era || null, wall: c.wall, trim: c.trim, roof: c.roof, shop: null, notes: c.notes, conf: c.conf, photos: c.photos,
    osmTags: { colour: b.colour || null, levels: b.levels || null, height: b.h || null, start_date: b.startDate || null, roofShape: b.roof || null, heritage: b.heritage || null, wikidata: b.wikidata || null },
    footprintArea: Math.round(Math.abs(area) / 2), footprint: ring,
  });
}
const file = path.join(root, 'docs/research/university-embankment-houses.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', file, out.length, 'houses');
