// tools/landmarksTransfiguration-measure.mjs - prints the baked OSM footprints / objects near the Church of the Transfiguration (Aptekarsky Island): the church w28370423, the bunker w412493366 and the neighbours.
// usage: node tools/landmarksTransfiguration-measure.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const CX = -1464, CZ = -4557, R = 90;
const ids = ['w28370423', 'w412493366'];
for (const b of D.BUILDINGS || []) {
  if (ids.includes(b.id) || ids.includes(b.parent)) console.log('TARGET', b.id, JSON.stringify({ cx: b.cx, cz: b.cz, levels: b.levels, height: b.height, roof: b.roof, colour: b.colour, name: b.name, parent: b.parent }), 'poly', JSON.stringify(b.polys && b.polys[0].o.map((v) => Math.round(v * 100) / 100)));
}
console.log('--- buildings within', R, 'm');
for (const b of D.BUILDINGS || []) {
  if (Math.hypot(b.cx - CX, b.cz - CZ) < R) console.log(b.id, Math.round(b.cx), Math.round(b.cz), 'lv', b.levels, 'h', b.height, 'claimed', L.isClaimed && L.isClaimed(b.id), b.name || '');
}
console.log('keys of layout', Object.keys(L).filter((k) => /ground|road|water|tree|park|green|inPlay|region/i.test(k)).join(' '));
console.log('regionOf', L.regionOf && L.regionOf(CX, CZ));
