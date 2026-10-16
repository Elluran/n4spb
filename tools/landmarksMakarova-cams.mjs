// tools/landmarksMakarova-cams.mjs - camera strings for tools/shot.mjs: the POSTCARD poses of landmarksMakarova (draw-call account, eye 1.7 m unless a height is given), computed from the frames of frame.js.
// usage: node tools/landmarksMakarova-cams.mjs [name ...]  -> prints "name=x,z,yaw,pitch" lines and, last, the ';'-joined string of the named poses (default: all).
// Frames: FR row (u along the front toward the Spit, v inland), FC church, FP Lions pier, FE Lutheran St Catherine, FM St Michael, F6 pavilion 6, FB Brullov.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { FR, FC, FP, FE, FM, F6, F7, FB } = await import(pathToFileURL(path.join(root, 'src/world/landmarksMakarova/frame.js')).href);
const r1 = (v) => Math.round(v * 100) / 100;
const cam = (F, from, to, pitch = 0, y) => { const a = F.W(from[0], from[1]), b = F.W(to[0], to[1]); const yaw = L.yawToward(a.x, a.z, b.x, b.z); return y == null ? `${r1(a.x)},${r1(a.z)},${r1(yaw)},${pitch}` : `${r1(a.x)},${y},${r1(a.z)},${r1(yaw)},${pitch}`; };
export const POST = {
  rowTourist: cam(FR, [30, -16], [45, 0], 10),            // the Yakovlev row from the embankment pavement
  rowRiver: cam(FR, [60, -70], [50, 0], 4, 6),            // the row from the river side, eye 6 m
  churchTower: cam(FC, [-62, -14], [-31.7, 2], 12),       // the Catherine tower from the Kadetskaya line
  churchAerial: cam(FC, [-70, -40], [-20, 0], -30, 45),   // the church from above
  lutheran: cam(FE, [4, 52], [4, 30], 10),                // the Lutheran portico
  michael: cam(FM, [12, -26], [12, 0], 10),               // St Michael facade
  pavilion6: cam(F6, [-24, 10], [0, 0], 6),               // the Sportivnaya-2 pavilion 6, door end
  lions: cam(FP, [0, 22], [0, 0], 12),                    // the Lions pier from the street
  brullov: cam(FB, [10, -26], [10, 0], 8),                // the Brullov house
};
// the CLOSE poses (1 - 3 m: the look that must not change)
export const CLOSE = {
  lionClose: cam(FP, [3, 12], [-5, 1], 8),                // a lion on its pedestal at 1.7 m
  gateClose: cam(FC, [-48, -9], [-38, -8], 6),            // the Catherine fence, the closed gate and the gatehouse
  arcadeClose: cam(FR, [18, -9], [22, 0], 8),             // the rusticated ground floor of the row, the lunette above
  portico: cam(FE, [11.3, 72], [11.3, 45], 8),            // the Lutheran portico at 25 m, the apostle niches
  michaelClose: cam(FM, [8, -9], [8, 0], 14),             // the St Michael facade, the notice board
  doorClose: cam(F6, [-17, 3], [-8, 0], 4),               // the Sportivnaya-2 door end
  brullovClose: cam(FB, [6, -9], [6, 0], 14),             // the Brullov doors and the balcony
};
// the METRO poses (with module metro loaded): do the stairs show through the glazing of the pavilions? (door tip of exit 6 / exit 7 at u -7.7)
export const METRO = {
  p6door: cam(F6, [-12, 0], [0, 0], -6),                  // exit 6, straight through the door group, eye 1.7 m
  p6side: cam(F6, [-10, 6], [0, 0], -10),                 // exit 6, oblique through the glazing of the long side
  p6in: cam(F6, [-8.4, 0], [4, 0], -22),                  // at the doors, looking down into the well
  p7door: cam(F7, [-12, 0], [0, 0], -6),                  // exit 7
  p7side: cam(F7, [-10, 6], [0, 0], -10),
};
const group = process.argv.includes('--metro') ? METRO : process.argv.includes('--close') ? CLOSE : POST;
const names = process.argv.slice(2).filter((s) => group[s]);
const use = names.length ? names : Object.keys(group);
for (const k of use) console.log(`${k}=${group[k]}`);
console.log(use.map((k) => group[k]).join(';'));
