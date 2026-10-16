// tools/petrovsky-bridge-list.mjs - lists the OSM bridge elements of docs/reference/islands2-bridges-osm.json inside a box: node tools/petrovsky-bridge-list.mjs x0 x1 z0 z1
import fs from 'node:fs';
import { proj } from './osm-lib.mjs';
const [x0, x1, z0, z1] = process.argv.slice(2).map(Number);
const j = JSON.parse(fs.readFileSync(new URL('../docs/reference/islands2-bridges-osm.json', import.meta.url), 'utf8'));
for (const e of j.elements) {
  const gs = e.geometry ? [e.geometry] : (e.members || []).filter((m) => m.geometry).map((m) => m.geometry);
  let hit = false, b = [1e9, -1e9, 1e9, -1e9];
  for (const g of gs) for (const p of g) { const [x, z] = proj(p.lon, p.lat); if (x >= x0 && x <= x1 && z >= z0 && z <= z1) hit = true; b = [Math.min(b[0], x), Math.max(b[1], x), Math.min(b[2], z), Math.max(b[3], z)]; }
  if (hit) { const t = e.tags || {}; console.log(e.type[0] + e.id, t.highway || t.man_made || '', t.name || '', t.layer || '', 'bbox', b.map((v) => Math.round(v)).join(','), t.step_count ? 'steps ' + t.step_count : ''); }
}
