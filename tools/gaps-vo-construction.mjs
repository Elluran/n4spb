// gaps-vo-construction.mjs - audit helper: highway=construction / proposed ways on Vasilievsky Island (dropped by the bake) and which of them are in LATE_ROADS (src/world/data/late-roads.js).
//   node tools/gaps-vo-construction.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import('file:///' + ROOT.replace(/\\/g, '/') + 'tools/osm-lib.mjs');
const poly = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-island-polygon.json', 'utf8')).points;
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const late = fs.readFileSync(ROOT + 'src/world/data/late-roads.js', 'utf8');
const j = JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/roads.json', 'utf8'));
const rows = [];
for (const e of j.elements) {
  const t = e.tags || {}; if (e.type !== 'way' || !e.geometry) continue;
  if (t.highway !== 'construction' && t.highway !== 'proposed') continue;
  const pts = e.geometry.map((n) => lib.proj(n.lon, n.lat));
  let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const m = pts[Math.floor(pts.length / 2)];
  if (!inside(m[0], m[1]) || !lib.inPlay(m[0], m[1], 0)) continue;
  rows.push({ id: 'w' + e.id, hw: t.highway, construction: t.construction || t.proposed || '', name: t.name || '', len: Math.round(len), x: Math.round(m[0]), z: Math.round(m[1]), inLate: late.includes('w' + e.id) });
}
rows.sort((a, b) => b.len - a.len);
console.log('construction / proposed ways on the island (in play):', rows.length, ' total m', rows.reduce((s, r) => s + r.len, 0), ' in LATE_ROADS:', rows.filter((r) => r.inLate).length);
for (const r of rows.filter((r) => r.len >= 40).slice(0, 40)) console.log(JSON.stringify(r));
