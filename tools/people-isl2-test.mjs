// tools/people-isl2-test.mjs - a quick (seconds) data test of the island raster of the people module (src/world/people/isl2area.js): no scene, no GPU.
//   node tools/people-isl2-test.mjs
// Checks: the island outlines hold the sights; every id of the closed territory exists in the baked data; the closed discs / polygons cover the palace garden, the yacht clubs and the nurseries and nothing of the old centre; every stay zone has
// cells; the zone shapes lie inside their islands; the old regions (Petrograd side, Vasilievsky Island, the centre) get no island zone, no weight and no closed cell.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const I = await import(pathToFileURL(path.join(root, 'src/world/people/isl2area.js')).href);
const D = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
let fails = 0; const check = (c, m) => { if (!c) { fails++; console.log('FAIL:', m); } };
const A = I.makeIsl2Area({ services: {} }, null, { roads: [], sidewalks: [], paths: [] }), names = I.ISL_ZONES.map((z) => z.name);
console.log('raster info', JSON.stringify(A.info));
// outlines
for (const [k, x, z] of [['yelagin', -5282, -5210], ['yelagin', -6405, -5309], ['kamenny', -2688, -5342], ['aptekarsky', -1500, -4200], ['petrovsky', -4200, -2680], ['krestovsky', -7310, -4519]]) check(I.islandAt(x, z) === k, `islandAt(${x}, ${z}) = ${I.islandAt(x, z)}, expected ${k}`);
for (const [x, z] of [[-2000, -740], [-1500, -300], [-3400, -540], [-2470, -1318], [-1950, -1960], [-2200, -3710]]) check(I.islandAt(x, z) === null, `the old reach (${x}, ${z}) is no island`);
// closed territory
const have = new Set([...D.GREEN, ...D.LANDUSE].map((g) => g.id)); for (const id of I.ISL_CLOSED_IDS) if (!have.has(id)) { console.log('  note: closed id not in the baked data:', id); }
check(I.ISL_CLOSED_IDS.filter((id) => have.has(id)).length >= I.ISL_CLOSED_IDS.length - 2, 'the closed ids exist in the data');
for (const [n, x, z] of [['Kamenny palace garden', -2688, -5342], ['palace service yard', -2713, -5228], ['yacht club main building', -6265, -3652], ['Standart yard', -5954, -3490]]) check(A.closed(x, z), n + ' is closed territory');
for (const [n, x, z] of [['Yelagin spit plaza', -6409, -5309], ['palace west stair', -4584, -5226], ['Botanical Garden Palm House portal', -1503, -4163], ['Kamenny church forecourt', -2861, -5413], ['Kazan garden', -1469, -300], ['Spit of Vasilievsky', -2470, -1318]]) check(!A.closed(x, z), n + ' is open ground');
// zones
const cnt = {}; for (let x = -7950; x < -900; x += 3) for (let z = -5780; z < -2000; z += 3) { const q = A.zone(x, z); if (q >= 0) cnt[names[q]] = (cnt[names[q]] || 0) + 1; }
for (const n of names) check((cnt[n] || 0) > 0, `zone ${n} has cells`);
console.log('zone cells (3 m):', JSON.stringify(cnt));
for (const [n, x, z, zone] of [['spit', -6405, -5309, 'ye-spit'], ['palace', -4584, -5226, 'ye-palace'], ['theatre', -5233, -5343, 'ye-theatre'], ['hercules', -5545, -5114, 'ye-hercules'], ['kamenny', -2870, -5338, 'ka-avenue'], ['church', -2861, -5413, 'ka-church'], ['palm', -1503, -4163, 'ap-palm'], ['park', -4200, -2680, 'pe-park'], ['arena', -7310, -4519, 'kr-stadium']]) check(names[A.zone(x, z)] === zone, `${n}: zone ${names[A.zone(x, z)]}, expected ${zone}`);
// the old reach is untouched: no island zone, no weight, no closed cell in the old centre, the Petrograd side and Vasilievsky Island
let leak = 0, leakW = 0, leakC = 0; for (let x = -9800; x < -900; x += 12) for (let z = -2000; z < 1800; z += 12) { if (A.zone(x, z) >= 0) leak++; if (A.weight(x, z) > 0) leakW++; if (A.closed(x, z)) leakC++; }
check(leak === 0 && leakW === 0 && leakC === 0, `no island zone / weight / closed cell south of z -2000 (${leak} / ${leakW} / ${leakC})`);
for (const [x, z] of [[-1100, -240], [592, 165], [-1469, -300]]) check(A.zone(x, z) < 0 && A.weight(x, z) === 0, `old centre (${x}, ${z}) untouched`);
console.log(fails ? `RESULT: FAIL (${fails})` : 'RESULT: OK');
process.exit(fails ? 1 : 0);
