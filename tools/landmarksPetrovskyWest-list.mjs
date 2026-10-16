// landmarksPetrovskyWest-list.mjs - list baked buildings near a point, or the records of given ids.
//   node tools/landmarksPetrovskyWest-list.mjs x z r      node tools/landmarksPetrovskyWest-list.mjs id1 id2 ...
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const L = await import(pathToFileURL(path.join(root, 'src/world/layout.js')).href);
const CITY = await import(pathToFileURL(path.join(root, 'src/world/data/city.js')).href);
const B = CITY.CITY ? CITY.CITY.BUILDINGS : (CITY.BUILDINGS || CITY.default.BUILDINGS);
const info = (b) => {
  const polys = (b.polys || []).map((p) => { const o = p.o; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, cx = 0, cz = 0, n = 0; for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); cx += o[i]; cz += o[i + 1]; n++; } return { c: [+(cx / n).toFixed(1), +(cz / n).toFixed(1)], bb: [x0, x1, z0, z1].map((v) => +v.toFixed(1)), n, holes: (p.h || []).length }; });
  const { polys: _p, ...rest } = b; return { ...rest, polys };
};
const a = process.argv.slice(2);
if (a.length === 3 && a.every((v) => !isNaN(Number(v)))) {
  const [x0, z0, r] = a.map(Number);
  for (const b of B) { const q = info(b); if (!q.polys.length) continue; const c = q.polys[0].c; if (Math.hypot(c[0] - x0, c[1] - z0) <= r) console.log(JSON.stringify(q)); }
} else for (const id of a) { const b = B.find((q) => q.id === id); console.log(b ? JSON.stringify(info(b)) : 'no ' + id); }
