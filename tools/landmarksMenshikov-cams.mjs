// tools/landmarksMenshikov-cams.mjs - turns camera specs given in the frames of landmarksMenshikov (P palace, K Corps, G garden, D descent, W world) into the camera strings of tools/shot.mjs.
// usage: node tools/landmarksMenshikov-cams.mjs "P:0,25,1.7>0,-8,8" "K:60,20,1.7>0,0,6" ...        spec = FRAME:a,b,eyeY>a,b,targetY   (eye height above ground, target height)
//        node tools/landmarksMenshikov-cams.mjs --walk "P:0,25>0,-8"                              (walking eye: x,z,yaw,pitch for a 1.7 m eye at ground y = 0; the pitch aims at 4 m height)
// prints one line per camera, and one ';'-joined line for --cams.  yaw: 0 north, 90 west, 180 south, -90 east.
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksMenshikov/frame.js')).href);
const FR = { P: F.PF, K: F.KF, G: F.GF, D: F.DF, W: { W: (a, b) => ({ x: a, z: b }), M: (x, z) => ({ a: x, b: z }) } };
const args = process.argv.slice(2), walk = args.includes('--walk');
const out = [];
for (const spec of args.filter((a) => !a.startsWith('--'))) {
  const [f, rest] = spec.split(':'), fr = FR[f]; if (!fr) { console.error('bad frame', f); continue; }
  const [from, to] = rest.split('>').map((s) => s.split(',').map(Number));
  const A = fr.W(from[0], from[1]), B = fr.W(to[0], to[1]);
  const ey = from[2] ?? 1.7, ty = to[2] ?? 1.7, dx = B.x - A.x, dz = B.z - A.z, d = Math.hypot(dx, dz) || 1;
  const yaw = Math.atan2(-dx, -dz) * 180 / Math.PI, pitch = Math.atan2(ty - ey, d) * 180 / Math.PI;
  const r = (v, k = 1) => Math.round(v * 10 ** k) / 10 ** k;
  const s = walk ? `${r(A.x)},${r(A.z)},${r(yaw)},${r(pitch)}` : `${r(A.x)},${r(ey)},${r(A.z)},${r(yaw)},${r(pitch)}`;
  out.push(s); console.log(spec + '  ->  ' + s);
}
console.log(out.join(';'));
