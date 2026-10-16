// tools/landmarksModernVO-cams.mjs - prints shot.mjs camera strings that look at a front of a landmarksModernVO house.
// usage: node tools/landmarksModernVO-cams.mjs <frame> <u> <dist> [y=1.7] [pitch=8] [angDeg=0] [targetY=0]   e.g.  node tools/landmarksModernVO-cams.mjs KA 14 25 1.7 8 20
//   frame = a name of src/world/landmarksModernVO/frame.js (KA, NA, ZA, ...); u = the point of the front looked at; dist = metres out along the normal; angDeg = turn the camera round the target (positive = towards +u)
//   prints "x,y,z,yaw,pitch" (a free camera, the 5-number form of shot.mjs); several sets: separate argument groups with --
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FR } = await import(pathToFileURL(path.join(root, 'src/world/landmarksModernVO/frame.js')).href);
const groups = []; let cur = [];
for (const a of process.argv.slice(2)) { if (a === '--') { groups.push(cur); cur = []; } else cur.push(a); }
groups.push(cur);
const out = [];
for (const g of groups) {
  const [name, u, dist, y = '1.7', pitch = '8', ang = '0'] = g;
  const F = FR[name]; if (!F) { console.error('unknown frame', name); continue; }
  const a = Number(ang) * Math.PI / 180, d = Number(dist), uu = Number(u);
  const cu = uu + d * Math.sin(a), cz = d * Math.cos(a), w = F.W(cu, cz);
  const yaw = F.yawOf(-d * Math.sin(a), -d * Math.cos(a));
  out.push(`${w.x.toFixed(1)},${y},${w.z.toFixed(1)},${yaw.toFixed(1)},${pitch}`);
}
console.log(out.join(';'));
