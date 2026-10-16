// gaps-vo-worship.mjs - audit helper: every worship building (named or not) on / beside Vasilievsky Island and whether a module claims it by id (groups.js) - unclaimed ones are drawn by the city as plain boxes.
//   node tools/gaps-vo-worship.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const lib = await import('file:///' + ROOT.replace(/\\/g, '/') + 'tools/osm-lib.mjs');
const poly = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-island-polygon.json', 'utf8')).points;
const inside = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name === 'data') continue; walk(p, out); } else if (e.name === 'groups.js') out.push(p); } return out; };
let claims = ''; for (const f of walk(ROOT + 'src/world')) claims += fs.readFileSync(f, 'utf8');
const j = JSON.parse(fs.readFileSync(ROOT + 'data/osm-raw/buildings.json', 'utf8'));
const W = new Set(['church', 'chapel', 'cathedral', 'mosque', 'synagogue', 'temple', 'monastery', 'shrine', 'bell_tower']);
const out = [];
for (const e of j.elements) {
  const t = e.tags || {};
  if (!(W.has(t.building) || t.amenity === 'place_of_worship')) continue;
  let pts = null;
  if (e.geometry) pts = e.geometry.map((n) => lib.proj(n.lon, n.lat));
  else if (e.members) { const m = e.members.find((q) => q.geometry); if (m) pts = m.geometry.map((n) => lib.proj(n.lon, n.lat)); }
  if (!pts || !pts.length) continue;
  const c = lib.centroid(pts.concat([pts[0]]));
  if (!inside(c[0], c[1]) && !(c[0] < -3150 && c[1] > -2600 && c[1] < -1700 && lib.inPlay(c[0], c[1], 0))) continue;
  const id = e.type[0] + e.id;
  out.push({ id, name: t.name || '', kind: t.building + '/' + (t.denomination || t.religion || ''), x: Math.round(c[0]), z: Math.round(c[1]), claimed: claims.includes(id) });
}
console.log(out.length, 'worship buildings; unclaimed:', out.filter((o) => !o.claimed).length);
for (const o of out.filter((o) => !o.claimed)) console.log(JSON.stringify(o));
