// landmarksTroitskaya-houses: writes docs/research/troitskaya-houses.json = the ORDINARY houses round Troitskaya Square / the Mosque / the head of Kamennoostrovsky pr. that the module
// landmarksTroitskaya does NOT model (same shape as nikolsky-houses.json: the city owner turns it into KNOWN houses).  A curated table (what the photos of docs/research/troitskaya.md show)
// + the baked OSM footprints.   usage: node tools/landmarksTroitskaya-houses.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { unproj } = await import(pathToFileURL(path.join(root, 'tools/osm-lib.mjs')).href);

// conf: H = seen on an opened photo, M = address / tags / literature, L = not researched
const T = [
  { osm: 'w43679381', addr: 'Кронверкский пр., 5', scope: 'kronverksky', storeys: 5, hCornice: 21, style: 'neoclassical revival, mansard with dormers', era: '1910s', wall: '#d9d9d2', trim: '#f0efe8', roof: '#8f979a',
    notes: 'between the Kshesinskaya mansion and the Mosque: pale grey-white stucco, a high grey mansard roof with dormers (photos 01 03 06: the white house right of the Mosque)', conf: 'H', photos: ['01_mosque_general_a', '06_mosque_2021'] },
  { osm: 'w28712433', addr: 'Конный пер., 1', scope: 'mosque', storeys: 4, hCornice: 15, style: 'constructivism / 1930s, corner glazing', era: '1930s', wall: '#8a7f78', trim: '#8a7f78', roof: '#6f7377',
    notes: 'grey-brown stone slab cladding, ribbon / corner windows with dark frames, ground floor in black glazed tiles; faces the north fence of the Mosque (photo 22)', conf: 'H', photos: ['22_mosque_konny'] },
  { osm: 'w85427336', addr: 'Кронверкский пр., 7 лит. Л', name: 'флигель Соборной мечети (дом для омовений)', scope: 'mosque', storeys: 3, hCornice: 12, style: 'Northern Modern, grey granite (Vasilyev)', era: '1910s', wall: '#8f9399', trim: '#a7aaab', roof: '#7f858b',
    notes: 'the service wing of the Mosque in its yard: same grey granite, plain, flat roof', conf: 'M', photos: [] },
  { osm: 'w1120136549', addr: 'ул. Куйбышева, 2-4 лит. В', scope: 'mosque', storeys: 3, hCornice: 12, style: 'plain courtyard wing', era: null, wall: '#d6c79c', trim: '#e8dcc4', roof: '#9ba0a3', notes: 'museum service wing behind the mansion, seen only from the yards', conf: 'L', photos: [] },
  { osm: 'r1268889', addr: 'Кронверкский пр., 23', name: 'доходный дом Е. К. Барсовой (здесь жил М. Горький, 1914-1921)', scope: 'gorky', storeys: 6, hCornice: 24, style: 'Art Nouveau / neoclassical tenement, bay windows', era: '1911-12', wall: '#b9ad9a', trim: '#d6cdbd', roof: '#8f979a',
    notes: 'OSM building:architecture=art_nouveau; memorial plaque to Gorky (OSM n9020896407); grey-beige stucco, granite socle', conf: 'M', photos: [] },
  { osm: 'w85422662', addr: 'Каменноостровский пр., 5', name: 'особняк С. Ю. Витте (Детская музыкальная школа им. Андрея Петрова)', scope: 'kamennoostrovsky', storeys: 2, hCornice: 10, style: 'eclectic mansion', era: '1898', wall: '#e3d6a8', trim: '#f1ece0', roof: '#5a7a63',
    notes: 'two-storey mansion behind a fence north of the Lidval house; plaque to Witte (OSM n4846085726): he lived here 1899-1915', conf: 'M', photos: [] },
  { osm: 'w28928349', addr: 'Кронверкский пр., 9', scope: 'kronverksky', storeys: 4, hCornice: 17, conf: 'L' },
  { osm: 'w28928295', addr: 'Кронверкский пр., 9 (Дом физической культуры)', scope: 'kronverksky', storeys: 4, hCornice: 17, conf: 'L' },
  { osm: 'w85421866', addr: 'Кронверкский пр., 13/2', scope: 'kronverksky', storeys: 5, hCornice: 21, conf: 'L' },
  { osm: 'r2991986', addr: 'Крестьянский пер., 4А', scope: 'kronverksky', storeys: 7, hCornice: 25, conf: 'L' },
  { osm: 'w51105932', addr: 'Крестьянский пер., 5', scope: 'kronverksky', storeys: 7, hCornice: 25, conf: 'L' },
  { osm: 'r1273300', addr: 'Малая Посадская ул., 7/4', scope: 'kamennoostrovsky', storeys: 5, hCornice: 21, conf: 'L' },
  { osm: 'w150614922', addr: 'Малая Посадская ул., 3', scope: 'kamennoostrovsky', storeys: 2, hCornice: 9, conf: 'L' },
  { osm: 'w43681124', addr: 'ул. Куйбышева, 8', scope: 'kuybysheva', storeys: 6, hCornice: 24, conf: 'L' },
  { osm: 'r2691966', addr: 'ул. Куйбышева, 10', scope: 'kuybysheva', storeys: 6, hCornice: 24, conf: 'L' },
  { osm: 'w28712290', addr: 'ул. Куйбышева, 3', scope: 'kuybysheva', storeys: 7, hCornice: 25, conf: 'L' },
];
const GENERIC = 'not researched in depth: Petrograd-side tenement of 1900-1914 or a 1930s-50s infill; take colour from the neighbours (sand, grey-beige, ochre stucco with a granite socle; bay windows and a mansard on the Art Nouveau ones)';
const out = [];
for (const t of T) {
  const b = L.buildingById(t.osm); if (!b) { console.warn('missing', t.osm); continue; }
  const ring = []; const o = b.polys[0].o; for (let i = 0; i < o.length; i += 2) ring.push([o[i], o[i + 1]]); ring.push(ring[0]);
  const [lon, lat] = unproj(b.cx, b.cz);
  out.push({
    addr: t.addr, name: t.name || b.name || null, osm: t.osm, scope: t.scope, side: null, lat: +lat.toFixed(6), lon: +lon.toFixed(6), x: Math.round(b.cx), z: Math.round(b.cz),
    storeys: t.storeys ?? b.levels ?? null, storeysSource: t.conf === 'L' ? 'OSM building:levels' : 'photo / OSM', hCornice: t.hCornice ?? Math.round(L.heightOf(b)), hSource: t.conf === 'H' ? 'estimated on the photo' : 'estimated from storeys',
    style: t.style || null, era: t.era || null, wall: t.wall || null, trim: t.trim || null, roof: t.roof || null, shop: t.shop || null, notes: t.notes || GENERIC, conf: t.conf, photos: t.photos || [],
    osmTags: { colour: b.colour || null, levels: b.levels ?? null, height: b.h ?? null, start_date: b.startDate || null, roofShape: b.roof || null, heritage: b.heritage || null, wikidata: b.wikidata || null },
    footprintArea: Math.round(b.area || 0), footprint: ring,
  });
}
const file = path.join(root, 'docs/research/troitskaya-houses.json');
fs.writeFileSync(file, JSON.stringify(out, null, 1), 'utf8');
console.log('wrote', file, out.length, 'houses');
