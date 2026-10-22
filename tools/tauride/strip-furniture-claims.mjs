// strip-furniture-claims.mjs - the proof that the claim skip of props/osm.js (`(f.kind === 'bench' || f.kind === 'waste_basket') && L.isClaimed(f.id)`, T2 of docs/TAURIDE-REMAKE.md) cannot change the strip:
// no id that a landmark group of the STRIP claims is a bench / waste-basket (or any other) record of the strip's FURNITURE data. Run as the strip (no area remap):
//   node tools/tauride/strip-furniture-claims.mjs                 RESULT: OK when 0 claimed FURNITURE records
// (The North claims 299 FURNITURE ids on purpose: that is the garden's bench and bin list.)
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const A = await import(pathToFileURL(path.join(root, 'src/world/area.js')).href);
const C = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
if (A.ID !== 'strip') { console.log(`RESULT: FAIL (the area module is "${A.ID}", this proof is about the strip: run it without tools/area.mjs)`); process.exit(2); }
const claimed = new Set();
for (const m of Object.keys(A.GROUPS)) for (const g of A.GROUPS[m]) { for (const id of g.ids) claimed.add(id); for (const id of g.osm) claimed.add(id); }
const hit = C.FURNITURE.filter((f) => claimed.has(f.id));
const benches = C.FURNITURE.filter((f) => f.kind === 'bench' || f.kind === 'waste_basket').length;
console.log(`strip: ${claimed.size} claimed ids over ${Object.keys(A.GROUPS).length} modules; FURNITURE ${C.FURNITURE.length} records (${benches} benches and waste baskets); claimed FURNITURE records: ${hit.length}${hit.length ? ' ' + hit.slice(0, 5).map((f) => f.kind + ':' + f.id).join(', ') : ''}`);
console.log(hit.length === 0 ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(hit.length === 0 ? 0 : 1);
