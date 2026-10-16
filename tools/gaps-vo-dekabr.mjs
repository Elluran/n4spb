// gaps-vo-dekabr.mjs - audit helper: named OSM objects that lie INSIDE the V3..V12 rectangles but OUTSIDE the Vasilievsky polygon (Dekabristov Island, the Smolenka north bank, Gulf shore, Petrograd edge)
// and inside the play area; the VO inventory (tools/vo-inventory.mjs) does not list them.
//   node tools/gaps-vo-dekabr.mjs <out.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import('file:///' + ROOT.replace(/\\/g, '/') + 'tools/osm-lib.mjs');
const poly = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-island-polygon.json', 'utf8')).points;
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const RX = { x0: -9800, x1: -3150, z0: -2600, z1: 1650 };
const out = [];
for (const layer of ['buildings', 'pois', 'historic', 'manmade', 'green', 'water', 'bridges', 'transit', 'rail', 'barriers']) {
  const j = JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/' + layer + '.json', 'utf8'));
  for (const e of j.elements) {
    const t = e.tags; if (!t || !(t.name || t['name:ru'] || t['name:en'])) continue;
    let p = null;
    if (e.type === 'node' && e.lat != null) p = lib.proj(e.lon, e.lat);
    else if (e.geometry && e.geometry.length) { const pts = e.geometry.map((n) => lib.proj(n.lon, n.lat)); p = pts[Math.floor(pts.length / 2)]; }
    else if (e.members) { const m = e.members.find((q) => q.geometry && q.geometry.length); if (m) { const g = m.geometry[Math.floor(m.geometry.length / 2)]; p = lib.proj(g.lon, g.lat); } }
    if (!p) continue;
    if (p[0] < RX.x0 || p[0] > RX.x1 || p[1] < RX.z0 || p[1] > RX.z1) continue;
    if (inside(p[0], p[1])) continue;
    if (!lib.inPlay(p[0], p[1], 0)) continue;
    out.push({ id: e.type[0] + e.id, layer, name: t.name || t['name:ru'] || t['name:en'], x: Math.round(p[0]), z: Math.round(p[1]), tags: { tourism: t.tourism, historic: t.historic, amenity: t.amenity, building: t.building, leisure: t.leisure, landuse: t.landuse, man_made: t.man_made, religion: t.religion, railway: t.railway, bridge: t.bridge, memorial: t.memorial, artwork_type: t.artwork_type } });
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
console.log(out.length);
