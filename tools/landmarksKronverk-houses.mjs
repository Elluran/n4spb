// tools/landmarksKronverk-houses.mjs - writes docs/research/kronverk-houses.json: the ORDINARY houses round the Kronverk / Alexander Park sight that module landmarksKronverk does not model
// (the fronts of Kronverksky pr. that face the park, the unclaimed service houses inside the park).  Same record shape as docs/research/troitskaya-houses.json; the city owner turns it into KNOWN houses.
// Geometry, levels and tags come from the baked OSM data; the curated notes (CUR) are from the dossier docs/research/kronverk.md and general knowledge of the avenue (confidence stated per record).
// usage: node tools/landmarksKronverk-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const LAT0 = 59.932421 * Math.PI / 180;
const KY = 111132.954 - 559.822 * Math.cos(2 * LAT0) + 1.175 * Math.cos(4 * LAT0);
const KX = 111412.84 * Math.cos(LAT0) - 93.5 * Math.cos(3 * LAT0) + 0.118 * Math.cos(5 * LAT0);
const STREET = 'Кронверкский проспект', PARK = 'Александровский парк';
const WIN = { x0: -2560, x1: -1640, z0: -2890, z1: -2150 };
const area = (o) => { let a = 0; for (let i = 0; i < o.length; i += 2) { const j = (i + 2) % o.length; a += o[i] * o[j + 1] - o[j] * o[i + 1]; } return Math.abs(a / 2); };
const GENERIC = 'not researched in depth: a rent house of the Petrograd side built 1900-1914 (Art Nouveau / neoclassical revival, 5-6 storeys, bay windows, granite or rusticated socle, shops in the ground floor); take the colour from the neighbours of the avenue (grey, ochre, pale yellow, pink-beige plaster; grey sheet-iron roofs)';
/** curated notes by house number of Kronverksky pr. */
const CUR = {
  '49': { name: 'Дом городских учреждений (Университет ИТМО)', style: 'neo-Renaissance palazzo: grey rusticated front, arcaded ground floor, corner tower', era: '1912-1913, M. Peretyatkovich, M. Lyalevich', wall: '#a8a49c', trim: '#c4c0b6', roof: '#7f878a', conf: 'M', notes: 'the big grey House of City Institutions at the Sytninskaya corner, today the main building of ITMO University: a stone-like rusticated facade in the manner of an Italian palazzo, tall arched windows, a heavy cornice' },
  '23': { name: 'Доходный дом Е. К. Барсовой', style: 'neoclassical revival rent house with bay windows', era: '1911-1912', wall: '#cdbf9f', trim: '#e6dcc4', roof: '#8f979a', conf: 'M', notes: 'the house opposite the Gorkovskaya pavilion where Maxim Gorky lived in 1914-1921 (memorial plaque with his profile on the front; the station is named after it)' },
};
const out = [];
for (const b of D.BUILDINGS) {
  if (b.part || b.dupOf) continue;                       // a multi-part house (skip = 1 outline) is one record
  if (b.cx < WIN.x0 || b.cx > WIN.x1 || b.cz < WIN.z0 || b.cz > WIN.z1) continue;
  if (L.isClaimed(b.id)) continue;
  const st = b.addr && b.addr.street, no = b.addr && b.addr.no;
  const onAvenue = st === STREET, inPark = st === PARK || (!st && no && /лит/.test(no) && b.cx > -2260 && b.cx < -1700 && b.cz > -2700 && b.cz < -2240);
  if (!onAvenue && !inPark) continue;
  const o = b.polys[0].o, fp = []; for (let i = 0; i < o.length; i += 2) fp.push([o[i], o[i + 1]]); fp.push(fp[0]);
  const key = no ? String(no).split(/[ /]/)[0] : null, cur = onAvenue && key && CUR[key] ? CUR[key] : null;
  const lv = b.levels || null, h = Math.round(L.heightOf(b) * 10) / 10;
  out.push({
    addr: onAvenue ? `Кронверкский пр., ${no || '?'}` : `Александровский парк, ${no || '?'}`, name: (cur && cur.name) || b.name || null, osm: b.id, scope: onAvenue ? 'kronverksky' : 'alexander-park', side: onAvenue ? 'north (outer side of the arc, faces the park)' : null,
    lat: Math.round((59.932421 - b.cz / KY) * 1e6) / 1e6, lon: Math.round((30.351279 + b.cx / KX) * 1e6) / 1e6, x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: lv, storeysSource: lv ? 'OSM building:levels' : null, hCornice: h, hSource: b.height ? 'OSM height' : 'layout.heightOf (era table)',
    style: cur ? cur.style : null, era: cur ? cur.era : null, wall: cur ? cur.wall : null, trim: cur ? cur.trim : null, roof: cur ? cur.roof : null, shop: null,
    notes: cur ? cur.notes : onAvenue ? GENERIC : 'a service house inside Alexander Park (zoo, Narodny Dom yard, Orthopaedic Institute): plain plaster or brick, one to three storeys',
    conf: cur ? cur.conf : 'L', photos: [],
    osmTags: { colour: b.colour || null, levels: lv, height: b.height || null, start_date: null, roofShape: b.roof || null, heritage: null, wikidata: null },
    footprintArea: Math.round(area(o)), footprint: fp,
  });
}
out.sort((a, b) => a.scope.localeCompare(b.scope) || a.x - b.x);
const file = path.join(root, 'docs/research/kronverk-houses.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
console.log('wrote', file, out.length, 'records:', out.filter((r) => r.scope === 'kronverksky').length, 'on the avenue,', out.filter((r) => r.conf !== 'L').length, 'curated');
