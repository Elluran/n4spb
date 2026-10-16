// tools/petrovsky-bridge-water2.mjs - wet / land profile along the Bolshoy Petrovsky centre line and the Serny bridge axis (headless environment, ~100 s)
import { makeEnv } from './petrovsky-bridge-env.mjs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { makeRoute, leftOffset } = await import(pathToFileURL(path.join(root, 'src/world/bridges/petrovsky/route.js')).href);
const { ctx, L } = await makeEnv();
const wet = (x, z) => !!(L.waterwayAt(x, z) || L.inRiver(x, z));
const prof = (R, vs, name) => {
  for (const v of vs) {
    let prev = null, st = 0; const out = [];
    for (let s = 0; s <= R.len; s += 1) { const p = R.pos(s, v), w = wet(p.x, p.z); if (prev === null) { prev = w; st = s; } else if (w !== prev) { out.push(`${prev ? 'WET' : 'land'} ${st}..${s}`); prev = w; st = s; } }
    out.push(`${prev ? 'WET' : 'land'} ${st}..${R.len.toFixed(0)}`); console.log(name, 'v', v, out.join(' | '));
  }
};
const A = [[-5428.2, -3483.2], [-5356.3, -3729.5], [-5353.5, -3738.9], [-5351.5, -3746.5], [-5350.2, -3753.9], [-5349.1, -3762.8]];
const bol = makeRoute(leftOffset(A, 3.65), 4); console.log('bolshoy len', bol.len.toFixed(1), 'start', bol.pos(0).x.toFixed(1), bol.pos(0).z.toFixed(1), 'end', bol.pos(bol.len).x.toFixed(1), bol.pos(bol.len).z.toFixed(1));
prof(bol, [0, 11, -12], 'bolshoy');
// the Serny bridge: axis through the OSM road way, extended 25 m each way
const a = [-4934.4, -2544.7], b = [-4926.8, -2557.7], d = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / d, uz = (b[1] - a[1]) / d;
const sr = makeRoute([[a[0] - ux * 25, a[1] - uz * 25], [b[0] + ux * 25, b[1] + uz * 25]], 2);
console.log('serny axis len', sr.len.toFixed(1), 'from', sr.pos(0).x.toFixed(1), sr.pos(0).z.toFixed(1));
prof(sr, [0, 6.5, -6.5], 'serny');
// what is at the Serny bridge ends: roads / buildings
for (const s of [0, 10, 20, 30, 40, 50.5]) { const p = sr.pos(s); console.log('serny s', s, 'road', L.isOnRoad(p.x, p.z, 0.5), 'bldg', L.insideBuilding(p.x, p.z, 1), 'wet', wet(p.x, p.z)); }
process.exit(0);
