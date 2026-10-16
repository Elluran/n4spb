// tools/petrovsky-bridge-cams-serny.mjs - prints tools/shot.mjs camera strings in the frame of the Serny Bridge: node tools/petrovsky-bridge-cams-serny.mjs u,v,eyeY,yawOffsetDeg,pitch ...  (yawOffset 0 = looking along +u)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { toWorld } = await import(pathToFileURL(path.join(root, 'src/world/bridges/sites.js')).href);
const { SERNY } = await import(pathToFileURL(path.join(root, 'src/world/bridges/petrovsky/serny.js')).href);
const T = (SERNY.b - 90) * Math.PI / 180, out = [];
for (const a of process.argv.slice(2)) { const [u, v, y, dy, pitch] = a.split(',').map(Number), w = toWorld(SERNY, u, v), yaw = Math.atan2(-Math.cos(T), -Math.sin(T)) * 180 / Math.PI + (dy || 0); out.push([w.x, y, w.z, yaw, pitch || 0].map((n) => +n.toFixed(1)).join(',')); }
console.log(out.join(';'));
