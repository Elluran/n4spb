// tools/landmarksKirova-cams.mjs - camera strings for tools/shot.mjs computed from the frames of landmarksKirova (frame.js): the five POSTCARD poses of the module (draw-call account)
// and the detail poses of the Erarta round (2026-10-10).  usage: node tools/landmarksKirova-cams.mjs [post|detail|all] -> prints "name=x,z,yaw,pitch" lines and one ';'-joined string per group.
// Frame E: a = q' (NNW along the front), b = r' (ENE, outward).  Frame K (garden): a = r, b = q.  yaw 0 north, 90 west (L.yawToward).
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const { FE, FK, FD } = await import(pathToFileURL(path.join(root, 'src/world/landmarksKirova/frame.js')).href);
export const parseCam = (s) => s.split(',').map(Number);
const r1 = (v) => Math.round(v * 100) / 100;
/** walking eye at frame point `from` looking at frame point `to` (frames FE / FK) with `pitch` */
const cam = (F, from, to, pitch = 0, y) => { const a = F.W(from[0], from[1]), b = F.W(to[0], to[1]); const yaw = L.yawToward(a.x, a.z, b.x, b.z); return y == null ? `${r1(a.x)},${r1(a.z)},${r1(yaw)},${pitch}` : `${r1(a.x)},${y},${r1(a.z)},${r1(yaw)},${pitch}`; };
export const POST = {
  front: cam(FE, [0, 29], [0, 0], 8),                  // Erarta front from the 29th line pavement (eye 1.7 m)
  plaza: cam(FE, [-9.5, 9.5], [-7.1, 3.0], 14),        // the sculpture plaza, Era at 2 .. 3 m
  atrium: cam(FE, [0, 6.5], [0, -1], 4),               // the door groups and the lit hall behind them
  roerich: cam(FK, [191, -88], [186, -62], 6),         // the Roerich plaza
  gate: cam(FK, [191.3, -262], [191.3, -242], 6),      // the south gate of the garden
};
export const DK = {
  front: cam(FD, [2, -80], [2, -35], 6),               // the Palace front from the car park
  portal: cam(FD, [2, -52], [2, -35.5], 5),
  east: cam(FD, [85, -70], [85, -35], 5),
  garden: cam(FK, [191.3, -230], [191.3, -150], 4),
  sobchak: cam(FK, [26.4, -252], [26.4, -258.7], 10),
  roerich: cam(FK, [186, -69], [186, -62], 8),
  bed: cam(FK, [189.3, -104.5], [189.3, -99.1], -34),
  court: cam(FD, [30, -4], [30, 40], 6),
  yardAir: cam(FD, [5, -20], [5, 38], -48, 70),            // the courtyard from above                 // the Palace courtyard seen from the cinema side
};
export const DETAIL = {
  front3: cam(FE, [0, 26], [0, 0], 14, 3.0),
  mir2: cam(FE, [-0.5, 16.5], [-0.5, 11], 8),           // front at eye 3 m
  entrance: cam(FE, [0, 14], [0, 1], 6),
  era: cam(FE, [-9.0, 8.0], [-7.1, 3.4], 18, 2.0),     // Era at 2 m, from the front-left
  arta: cam(FE, [9.0, 8.0], [7.1, 3.4], 18, 2.0),
  mir: cam(FE, [-4.0, 16.5], [-0.5, 11.0], 6, 1.7),         // Mir v kreste disc
  terrace: cam(FE, [-12, 22], [-3, 0], 32),            // terrace, pedestals, portico, roof sign (looking up)
  north: cam(FE, [30, 33], [36, -2], 10),              // north pavilion + wing from the street
  south: cam(FE, [-37, 33], [-37, 0], 10),
  rear: cam(FE, [-28, -41.2], [-28, -36.7], 14),
  side: cam(FE, [56, 8], [44, -3], 8),
  aerial: `${r1(FE.W(0, 70).x)},90,${r1(FE.W(0, 70).z)},${r1(L.yawToward(FE.W(0, 70).x, FE.W(0, 70).z, FE.W(0, 0).x, FE.W(0, 0).z))},-30`,
  vista: cam(FE, [0, 300], [0, 0], 3),
  window: cam(FE, [-20, 3.5], [-20, -2], 8),
  corner: cam(FE, [-33, 7], [-31, 2.2], 22),
  sign: cam(FE, [0, 12], [0, 2.3], 38),
  roofsign: cam(FE, [0, 45], [0, -2], 26),
  cheek: cam(FE, [11, 6], [7.2, 3.2], 6, 1.7),
};
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
const w = process.argv[2] || 'all';
const groups = { post: POST, dk: DK, detail: DETAIL };
for (const [g, o] of Object.entries(groups)) { if (w !== 'all' && w !== g) continue; for (const [k, v] of Object.entries(o)) console.log(`${g}.${k}=${v}`); console.log(`${g}: ${Object.values(o).join(';')}`); }
}
