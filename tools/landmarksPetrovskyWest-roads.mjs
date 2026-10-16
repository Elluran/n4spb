// landmarksPetrovskyWest-roads.mjs - roads / water / areas near a point.  node tools/landmarksPetrovskyWest-roads.mjs x z r
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CITY = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const C = CITY.CITY || CITY.default || CITY;
const [x0, z0, r] = process.argv.slice(2).map(Number);
const near = (pts) => { for (let i = 0; i < pts.length; i += 2) if (Math.hypot(pts[i] - x0, pts[i + 1] - z0) < r) return true; return false; };
console.log('keys', Object.keys(C).join(','));
for (const q of C.ROADS) if (q.pts && near(q.pts)) console.log('ROAD', q.id, q.hw, q.w, q.name || '', q.surface || '', 'br', q.bridge, 'lay', q.layer, JSON.stringify(q.pts.map((v) => Math.round(v))));
for (const q of (C.AREAS || [])) { const o = q.o || q.pts || (q.polys && q.polys[0] && q.polys[0].o); if (o && near(o)) console.log('AREA', q.id, q.kind || q.type, q.name || '', JSON.stringify(o.map((v) => Math.round(v))).slice(0, 200)); }
