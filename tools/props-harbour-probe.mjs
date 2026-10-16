// Lists the OSM pier / quay / breakwater records of the Petrovskaya kosa yacht club harbours (x -6700..-5800, z -3750..-3300): id, kind, point count, bbox, tags if any.
import { imp } from './traffic-harness.mjs';
const { PIERS } = await imp('src/world/data/city.js');
const [x0, x1, z0, z1] = (process.argv[2] || '-6700,-5800,-3750,-3300').split(',').map(Number);
const rows = [];
for (const p of PIERS) {
  const pts = p.pts || p.poly || p.o; if (!pts) continue;
  let bx0 = 1e9, bx1 = -1e9, bz0 = 1e9, bz1 = -1e9, inside = 0;
  for (let i = 0; i < pts.length; i += 2) { bx0 = Math.min(bx0, pts[i]); bx1 = Math.max(bx1, pts[i]); bz0 = Math.min(bz0, pts[i + 1]); bz1 = Math.max(bz1, pts[i + 1]); if (pts[i] > x0 && pts[i] < x1 && pts[i + 1] > z0 && pts[i + 1] < z1) inside++; }
  if (!inside) continue;
  const keys = Object.keys(p).filter((k) => !['pts', 'poly', 'o'].includes(k));
  let len = 0; for (let i = 0; i + 3 < pts.length; i += 2) len += Math.hypot(pts[i + 2] - pts[i], pts[i + 3] - pts[i + 1]);
  rows.push({ id: p.id, n: pts.length / 2, len: Math.round(len), bbox: [bx0, bx1, bz0, bz1].map(Math.round).join(','), extra: keys.map((k) => k + '=' + JSON.stringify(p[k]).slice(0, 40)).join(' ') });
}
rows.sort((a, b) => b.len - a.len);
console.log(rows.length, 'records; keys of the first:', Object.keys(PIERS[0]).join(','));
for (const r of rows.slice(0, 60)) console.log(r.id, 'n', r.n, 'len', r.len, 'bbox', r.bbox, r.extra);
