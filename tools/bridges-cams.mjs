// tools/bridges-cams.mjs - prints --cams strings for tools/shot.mjs around a bridge site of src/world/bridges/sites.js.
// usage: node tools/bridges-cams.mjs <site id> [deck,side,water,aerial,close]   (default all)   -> a ';'-joined string, e.g.  node tools/shot.mjs ... --cams "$(node tools/bridges-cams.mjs pantel deck,side)"
import { SITES, toWorld } from '../src/world/bridges/sites.js';
const id = process.argv[2], kinds = (process.argv[3] || 'deck,side,water,aerial,close').split(',');
const s = SITES.find((q) => q.id === id); if (!s) { console.error('no site', id, SITES.map((q) => q.id).join(' ')); process.exit(1); }
const rad = (d) => d * Math.PI / 180, yawOf = (dx, dz) => +(-(Math.atan2(dx, -dz) * 180 / Math.PI)).toFixed(1);   // compass bearing -> yaw (0 N, 90 W)
const hw = 18, ps = s.zones.find((z) => z[2] !== 'asphalt') || [s.v0, s.v1];
const out = [];
const look = (from, to, y, ty) => { const dx = to.x - from.x, dz = to.z - from.z, dh = Math.hypot(dx, dz), pitch = +(Math.atan2(ty - y, dh) * 180 / Math.PI).toFixed(1); return `${from.x.toFixed(1)},${y},${from.z.toFixed(1)},${yawOf(dx, dz)},${pitch}`; };
for (const k of kinds) {
  if (k === 'deck') { const v = (ps[0] + ps[1]) / 2, a = toWorld(s, -hw, v), c = toWorld(s, hw, v); out.push(look(a, c, 1.7, 1.6)); }
  if (k === 'side') { const a = toWorld(s, 0, s.v0 - 16), c = toWorld(s, 0, s.v0); out.push(look(a, c, 1.7, 0.5)); }
  if (k === 'water') { const a = toWorld(s, 0, s.v1 + 14), c = toWorld(s, 0, s.v1); out.push(look(a, c, -1.6, -0.3)); }
  if (k === 'aerial') { const a = toWorld(s, -26, s.v0 - 22), c = toWorld(s, 0, 0); out.push(look(a, c, 20, 0)); }
  if (k === 'close') { const a = toWorld(s, -hw * 0.45, s.v1 - 1.4), c = toWorld(s, hw * 0.1, s.v1 + 0.2); out.push(look(a, c, 1.5, 1.2)); }
  if (k === 'rail') { const a = toWorld(s, -2, s.v1 - 1.7), c = toWorld(s, -2, s.v1); out.push(look(a, c, 1.2, 0.8)); }
  if (k === 'lamp') { const a = toWorld(s, -9, s.v1 - 4), c = toWorld(s, -3, s.v1); out.push(look(a, c, 1.7, 3.5)); }
}
console.log(out.join(';'));
