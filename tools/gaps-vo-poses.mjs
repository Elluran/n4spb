// gaps-vo-poses.mjs - audit helper: walking-eye camera poses (x,z,yaw,pitch) on named streets of the island, taken from data/osm-raw/roads.json (the vertex nearest to a wanted point, yaw along the street).
//   node tools/gaps-vo-poses.mjs "name|x|z" ["name|x|z" ...]      prints x,z,yaw,pitch for the street way vertex nearest to (x, z) whose way name contains `name`
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import('file:///' + ROOT.replace(/\\/g, '/') + 'tools/osm-lib.mjs');
const j = JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/roads.json', 'utf8'));
const ways = [];
for (const e of j.elements) { if (e.type !== 'way' || !e.geometry || !e.tags || !e.tags.name) continue; ways.push({ name: e.tags.name, hw: e.tags.highway, pts: e.geometry.map((n) => lib.proj(n.lon, n.lat)) }); }
for (const spec of process.argv.slice(2)) {
  const [nm, xs, zs] = spec.split('|'); const x = +xs, z = +zs;
  let best = null;
  for (const w of ways) { if (!w.name.includes(nm)) continue; for (let i = 0; i < w.pts.length - 1; i++) { const d = Math.hypot(w.pts[i][0] - x, w.pts[i][1] - z); if (!best || d < best.d) best = { d, w, i }; } }
  if (!best) { console.log(spec, 'not found'); continue; }
  const p = best.w.pts[best.i], q = best.w.pts[best.i + 1];
  const dx = q[0] - p[0], dz = q[1] - p[1];
  const yaw = Math.round(Math.atan2(-dx, -dz) * 180 / Math.PI * 10) / 10;   // 0 = north (-z), 90 = west (-x)
  console.log(`${nm}\t${best.w.hw}\t${p[0].toFixed(1)},${p[1].toFixed(1)},${yaw},-2\t(off ${best.d.toFixed(0)} m)`);
}
