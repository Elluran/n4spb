// landmarksStrelka-houses: writes docs/research/strelka-houses.json = the ORDINARY buildings around the Spit ensemble that landmarksStrelka does not draw (same shape as nikolsky-houses.json:
// the city owner turns it into KNOWN houses).  Footprints / levels come from the baked data, the curated fields from docs/research/strelka.md and the photos refs/strelka (hs_01, cu_12, wh_05).
//   node tools/landmarksStrelka-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);

const CURATED = {
  w30325555: { addr: 'наб. Макарова, 6', name: 'Институт физиологии им. И. П. Павлова РАН (бывшие лаборатории Академии наук)', scope: 'makarova', storeys: 3, hCornice: 19, style: 'neoclassical revival, 1900s: rusticated ground floor, Corinthian three-quarter columns and round-headed windows on the piano nobile, attic with an iron cresting', era: '1900s', wall: '#cfd6d2', trim: '#f1efe8', roof: '#8c9296', notes: 'pale grey-green with white orders; the corner to Tiflisskaya ul. is a projecting pavilion with a porch on two columns; plaques to Pavlov, Orbeli, Bykov, Ugolev, Chernigovsky on the Tiflisskaya side; the statue of I. P. Pavlov (2004) stands in the garden at (-2876.9, -1319.3)', conf: 'M', photos: ['hs_01'] },
  w30325553: { addr: 'наб. Макарова, 6 лит. Б', name: null, scope: 'makarova', storeys: 2, hCornice: 9, style: 'plain service wing', wall: '#d8d2bf', trim: '#efece2', roof: '#8c9296', notes: 'courtyard wing of the Pavlov Institute', conf: 'L', photos: [] },
  w216655309: { addr: 'Тифлисская ул. (двор наб. Макарова, 6)', name: null, scope: 'makarova', storeys: 1, hCornice: 4, style: 'shed', wall: '#cfc8b4', trim: null, roof: '#8c9296', notes: 'one-storey yard building', conf: 'L', photos: [] },
  w28566718: { addr: 'Таможенный пер. / Тифлисская ул. (двор)', name: null, scope: 'customs-yard', storeys: 2, hCornice: 9, style: 'plain two-storey service block between the Customs house and the north warehouse', wall: '#e6d9a6', trim: '#f1ece0', roof: '#b23a3c', notes: 'not researched: colours taken from the north warehouse it belongs to (pale yellow, red roof)', conf: 'L', photos: [] },
  r1579977: { addr: 'Менделеевская линия, 3', name: 'НИИ акушерства, гинекологии и репродуктологии им. Д. О. Отта', scope: 'mendeleevskaya', storeys: 3, hCornice: 17, style: 'late classicist eclecticism (L. N. Benois, 1899-1904): a horseshoe plan closing the old Collegiate Square behind the Exchange, rusticated ground floor, pilaster porticos on the pavilions', era: '1899-1904', wall: '#e0d2ae', trim: '#f3efe4', roof: '#8c9296', notes: 'the concave east front follows Birzhevoy proezd behind the Exchange; garden with a fence on the Mendeleevskaya side; colours estimated (pale yellow-beige with white trim): check against a photo', conf: 'L', photos: [] },
  w28567745: { addr: 'Менделеевская линия, 3 лит. Б', name: null, scope: 'mendeleevskaya', storeys: 2, hCornice: 9, style: 'pavilion of the Ott institute', wall: '#e0d2ae', trim: '#f3efe4', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w112577294: { addr: 'Менделеевская линия, 3 лит. Г', name: null, scope: 'mendeleevskaya', storeys: 3, hCornice: 13, style: 'pavilion of the Ott institute', wall: '#e0d2ae', trim: '#f3efe4', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w112577291: { addr: 'Менделеевская линия, 3 лит. Х', name: null, scope: 'mendeleevskaya', storeys: 1, hCornice: 5, style: 'boiler house with a 20 m brick chimney (OSM w216655374)', wall: '#c9b9a0', trim: null, roof: '#6f6a66', notes: null, conf: 'L', photos: [] },
  w216655161: { addr: 'Менделеевская линия, 3 лит. Д', name: null, scope: 'mendeleevskaya', storeys: 2, hCornice: 9, style: 'curved service wing along Birzhevoy proezd', wall: '#e0d2ae', trim: '#f3efe4', roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w112577289: { addr: 'Менделеевская линия, 3 лит. И', name: null, scope: 'mendeleevskaya', storeys: 1, hCornice: 4, style: 'shed', wall: '#d8cfb8', trim: null, roof: '#8c9296', notes: null, conf: 'L', photos: [] },
  w28566730: { addr: 'Университетская наб., 1-3 лит. Д', name: null, scope: 'zoo-yard', storeys: 2, hCornice: 8, style: 'yard building of the Zoological Institute', wall: '#e3c56c', trim: '#f3efe4', roof: '#9ba0a3', notes: 'inside the closed yard between the south warehouse and the Kunstkamera: hardly visible from the street', conf: 'L', photos: [] },
  w28566731: { addr: 'Университетская наб., 1-3 лит. Г', name: null, scope: 'zoo-yard', storeys: 1, hCornice: 4, style: 'yard shed', wall: '#d8cfb8', trim: null, roof: '#9ba0a3', notes: null, conf: 'L', photos: [] },
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
    storeys: c.storeys, storeysSource: b.levels ? 'OSM building:levels ' + b.levels + (b.levels !== c.storeys ? ' (corrected from photos)' : '') : 'estimate', hCornice: c.hCornice, hSource: 'estimated from storeys and photos',
    style: c.style, era: c.era || null, wall: c.wall, trim: c.trim, roof: c.roof, shop: null, notes: c.notes, conf: c.conf, photos: c.photos,
    osmTags: { colour: b.colour || null, levels: b.levels || null, height: b.h || null, start_date: b.startDate || null, roofShape: b.roof || null, heritage: b.heritage || null, wikidata: b.wikidata || null },
    footprintArea: Math.round(Math.abs(area) / 2), footprint: ring,
  });
}
const file = path.join(root, 'docs/research/strelka-houses.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', file, out.length, 'houses');
