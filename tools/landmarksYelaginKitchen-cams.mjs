// tools/landmarksYelaginKitchen-cams.mjs - prints a --cams string for tools/shot.mjs from camera poses in the frame K of landmarksYelaginKitchen (u east-ish, w south-ish, centre of the drum; yawK 0 = looking north in K,
// 90 = west, 180 = south, -90 = east).  usage: node tools/landmarksYelaginKitchen-cams.mjs "u,w,y,yawK,pitch;..." [--walk]   (--walk: 4-number walking cameras x,z,yaw,pitch, y is ignored)
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(pathToFileURL(path.join(root, 'src/world/landmarksYelaginKitchen/frame.js')).href);
const walk = process.argv.includes('--walk');
const out = process.argv[2].split(';').map((s) => s.trim()).filter(Boolean).map((s) => {
  const [u, w, y, yk, pit] = s.split(',').map(Number), p = F.W(u, w), yaw = Math.round((yk + F.TH * 180 / Math.PI) * 10) / 10;
  return walk ? `${p.x.toFixed(1)},${p.z.toFixed(1)},${yaw},${pit}` : `${p.x.toFixed(1)},${y},${p.z.toFixed(1)},${yaw},${pit}`;
});
console.log(out.join(';'));
