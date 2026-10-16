// tools/landmarksSredny-cams.mjs - camera strings for tools/shot.mjs: the POSTCARD poses of landmarksSredny (draw-call account, eye 1.7 m unless a height is given), computed from frame.js.
// usage: node tools/landmarksSredny-cams.mjs [name ...]  -> prints "name=x,z,yaw,pitch" lines and, last, the ';'-joined string of the named poses (default: all).
// Frames: D depot (a ENE, b SSE), G Geological Committee (front -b), E Dom Evangelia (front -a), F Frank (front +a), T tower.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { FR } = await import(pathToFileURL(path.join(root, 'src/world/landmarksSredny/frame.js')).href);
const { D: FD, G: FG, E: FE, F: FF, T: FT } = FR;
const r1 = (v) => Math.round(v * 100) / 100;
const cam = (F, from, to, pitch = 0, y) => { const a = F.W(from[0], from[1]), b = F.W(to[0], to[1]); const yaw = L.yawToward(a.x, a.z, b.x, b.z); return y == null ? `${r1(a.x)},${r1(a.z)},${r1(yaw)},${pitch}` : `${r1(a.x)},${y},${r1(a.z)},${r1(yaw)},${pitch}`; };
const gb = L.buildingById('w1305590665'), go = gb.polys[0].o; let gx = 0, gz = 0; for (let i = 0; i < go.length; i += 2) { gx += go[i]; gz += go[i + 1]; } gx /= go.length / 2; gz /= go.length / 2;
const gcam = (dx, dz, pitch) => { const x = gx + dx, z = gz + dz; return `${r1(x)},${r1(z)},${r1(L.yawToward(x, z, gx, gz))},${pitch}`; };
export const POST = {
  geolFront: cam(FG, [60, -34], [60, 0], 10),            // the Geological Committee front from the Sredny pr. pavement
  geolAerial: cam(FG, [30, -60], [60, 0], -22, 40),      // from above
  depotGate: cam(FD, [58, 156], [58, 96], 4),            // through the open tram gate along the apron toward the shed ends
  brush: cam(FD, [80, 162], [80, 118], 6),               // the Brush plot with the tram, from the far pavement of Sredny pr.
  frank: cam(FF, [75, 14], [48, 12], 8),                 // the Frank mansion from the street
  evangelia: cam(FE, [-30, 16], [10, 12], 10),           // Dom Evangelia from the 24th line
  gorny: gcam(-12, -22, 6),                              // the Gorny Institut entrance pavilion, door end (NNW)
  tower: cam(FT, [60, 150], [38, 126], 14),              // the Chernikhov tower
};
// the CLOSE poses (1 - 3 m: the look that must not change)
export const CLOSE = {
  geolDoors: cam(FG, [60, -9], [60, 0], 12),             // the portico stair, the oak doors
  brushCar: cam(FD, [80, 134], [80, 118], 4),            // the monument tram at 15 m
  depotGateClose: cam(FD, [58, 134], [58, 124], 6),      // the open tram gate, the shed ends
  frankClose: cam(FF, [62, 13], [48, 12], 12),           // the Frank portal, the oriel
  evangeliaClose: cam(FE, [-12, 14], [14, 12], 12),      // the Dom Evangelia west wing
  gornyClose: gcam(-5, -9, 4),                           // the pavilion door group
  towerClose: cam(FT, [46, 136], [34, 126], 14),         // the Chernikhov tower and its canal face
};
// the METRO poses (with module metro loaded): do the stairs show through the glazing of the Gorny Institut pavilions?
export const METRO = {
  gnDoor: gcam(-10, -14, -4),                             // the entrance pavilion, straight at the door group, eye 1.7 m
  gnIn: gcam(-4, -7, -20),                                // at the doors, looking down into the well
  gnSide: gcam(-16, 2, -8),                               // oblique through the side glazing
};
const group = process.argv.includes('--metro') ? METRO : process.argv.includes('--close') ? CLOSE : POST;
const names = process.argv.slice(2).filter((s) => group[s]);
const use = names.length ? names : Object.keys(group);
for (const k of use) console.log(`${k}=${group[k]}`);
console.log(use.map((k) => group[k]).join(';'));
