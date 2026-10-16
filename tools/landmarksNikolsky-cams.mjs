// tools/landmarksNikolsky-cams.mjs - prints the shot.mjs --cams string for named viewpoints of the Nikolsky cathedral group (cathedral frame u / v, see src/world/landmarksNikolsky/frame.js).
// usage: node tools/landmarksNikolsky-cams.mjs [name,name,...]   -> the cams string (';' separated)
//   names: avenue porch door tower north aerial aerialTower vista bridge garden obelisk fountain dome south east
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksNikolsky/frame.js')).href);
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const C0 = F.C0, T = F.TOWER_W;
const walk = (u, v, tx, tz, pitch = 6) => { const p = F.UV(u, v); return `${p.x.toFixed(1)},${p.z.toFixed(1)},${L.yawToward(p.x, p.z, tx, tz).toFixed(1)},${pitch}`; };
const free = (u, v, y, tx, tz, ty, pitch) => { const p = F.UV(u, v); const d = Math.hypot(tx - p.x, tz - p.z); return `${p.x.toFixed(1)},${y},${p.z.toFixed(1)},${L.yawToward(p.x, p.z, tx, tz).toFixed(1)},${pitch ?? (Math.atan2(ty - y, d) * 180 / Math.PI).toFixed(1)}`; };
const N = {
  facade: walk(-72, 0, C0.x, C0.z, 10),            // like photo 039: the whole main facade with both towers
  avenue: walk(-50, 0, C0.x, C0.z, 8),             // tourist view down the avenue to the main facade
  porch: walk(-33, 2.5, C0.x, C0.z, 14),             // close to the door
  door: free(-30, 0, 1.7, C0.x, C0.z, 2, 4),
  tower: walk(-62, 0, T.x, T.z, 18),                 // from the avenue to the bell tower
  towerFoot: walk(-80, 0, T.x, T.z, 28),
  north: walk(0, -58, C0.x, C0.z, 8),
  south: walk(0, 60, C0.x, C0.z, 8),
  east: walk(58, 0, C0.x, C0.z, 8),
  aerial: free(-70, 40, 60, C0.x, C0.z, 20),
  aerialTower: free(-60, 30, 45, T.x, T.z, 40),
  domes: free(-30, 14, 52, C0.x, C0.z, 38, null),    // close aerial on the dome stacks
  domesBack: free(34, -22, 46, C0.x, C0.z, 36, null),
  vista: walk(-2908 - C0.x + C0.x, 0, 0, 0),         // placeholder, overridden below
  bridge: `-2908,1288,${L.yawToward(-2908, 1288, C0.x, C0.z).toFixed(1)},4`,   // Krasnogvardeysky bridge looking at the cathedral and the tower
  garden: walk(-30, -42, -2935, 1085, 6),
  obelisk: `-2929,1082,${L.yawToward(-2929, 1082, -2935.2, 1084.8).toFixed(1)},8`,
  fountain: `-2937,1042,${L.yawToward(-2937, 1042, -2944.3, 1046.9).toFixed(1)},14`,
  dome: free(-44, 4, 3, C0.x, C0.z, 40, 38),          // looking straight up at the dome stack from near the porch
};
N.kashin = `-3002,1070,${L.yawToward(-3002, 1070, T.x, T.z).toFixed(1)},6`;       // Kashin Bridge: tourist view of the tower + cathedral
N.nikolsky = `-2722,1187,${L.yawToward(-2722, 1187, C0.x, C0.z).toFixed(1)},4`;     // Novo-Nikolsky bridge
N.vista = `-2790,1236,${L.yawToward(-2790, 1236, C0.x, C0.z).toFixed(1)},3`;
const names = (process.argv[2] || 'avenue,porch,tower,north,aerial,bridge').split(',');
console.log(names.map((n) => N[n]).join(';'));
