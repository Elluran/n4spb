// tools/petrovsky-bridge-cams.mjs - prints tools/shot.mjs camera strings along the Betancourt axis: node tools/petrovsky-bridge-cams.mjs s,v,yawOffsetDeg,pitch[,eyeAbove] ...   (6 numbers walking cam standing on the deck, or free cam with eyeAbove)
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { betanRoute, BETAN } = await import(pathToFileURL(path.join(root, 'src/world/bridges/petrovsky/betancourt.js')).href);
const { profile } = await import(pathToFileURL(path.join(root, 'src/world/bridges/long.js')).href);
const R = betanRoute(), y = profile(BETAN.prof), out = [];
for (const a of process.argv.slice(2)) {
  const [s, v, dyaw, pitch, up] = a.split(',').map(Number), p = R.pos(s, v), yaw = Math.atan2(p.tx, p.tz) * 180 / Math.PI + 180;          // yaw 0 = north (-z): looking along +tan = atan2(-tx, -tz)
  const look = Math.atan2(-p.tx, -p.tz) * 180 / Math.PI + (dyaw || 0);
  if (up === undefined) out.push([p.x, y(s) + 0.2 + 1.7, p.z, look, pitch || 0, 1].map((n) => +n.toFixed(1)).join(','));
  else out.push([p.x, y(s) + up, p.z, look, pitch || 0].map((n) => +n.toFixed(1)).join(','));
  void yaw;
}
console.log(out.join(';'));
