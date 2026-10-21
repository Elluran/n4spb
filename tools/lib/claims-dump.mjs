// Dump of the landmark claims of ONE area, as JSON, for the band-parity landmark check (tools/band-parity.mjs bandLandmarks, run by tools/areas-test.mjs on every non-dev gate pair with a band).
//   node tools/area.mjs <area> tools/lib/claims-dump.mjs        (the strip too: `node tools/area.mjs strip tools/lib/claims-dump.mjs`, which is `node tools/lib/claims-dump.mjs`)
// Prints ONE line `CLAIMS_DUMP {json}` (the parent looks for the prefix, so a stray log line cannot break it):
//   { schema: 1, area, modules: [the MODULES of the page, in build order], owns: { <module>: true | [sub-group keys] | null },
//     rows: [{ id, module, group, via: 'id' | 'osm' | 'parent', parent?, present, cx, cz, inModules, owns, owned }] }
// A row is one claimed object of the area's GROUPS table (src/world/area.js of the area, remapped by tools/area.mjs): every id of a sub-group (`ids`), every part whose `parent` is one of them, every
// non-building OSM id (`osm`: paving, steps, monuments ...). `present`: the record exists in the data facade of the area; (cx, cz): the representative point of the record (a building's centroid,
// a point's x / z, the first vertex of a line / polygon) or null when the record is missing. `inModules`: the module of the sub-group is in the area's MODULES list; `owns`: the module declares
// OWNS_GROUPS = true or lists the sub-group (lib/owns-table.js, else the literal in src/world/<module>.js, as tools/owns-table.mjs reads it); `owned` = both: the claim is really built there.
// The comparison is by id and sub-group key, NOT by module name: the strip's landmarksNorth and the North's landmarksNorthFull are different modules that own the same ids.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mainModules } from '../modules-list.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const url = (f) => pathToFileURL(path.join(root, f)).href;
const A = await import(url('src/world/area.js'));          // the area module of the loaded area (tools/area.mjs remaps this URL)
const D = await import(url('src/world/data/city.js'));
const { OWNS_TABLE } = await import(url('src/world/lib/owns-table.js'));
const area = process.env.AREA || A.ID || 'strip';
if (A.ID !== area) { console.error(`claims-dump: AREA=${area} but the loaded area module is "${A.ID}"`); process.exit(2); }

const modules = mainModules(area);
/** OWNS_GROUPS of a module: the generated table, else the literal export of the module file (never an import: a landmark module is heavy), else null (does not own anything). */
function ownsOf(m) {
  if (m in OWNS_TABLE) return OWNS_TABLE[m];
  const f = path.join(root, 'src/world', m + '.js');
  if (!fs.existsSync(f)) return null;
  const hit = /^export\s+const\s+OWNS_GROUPS\s*=\s*([^;]+);/m.exec(fs.readFileSync(f, 'utf8'));
  if (!hit) return null;
  try { const v = Function(`"use strict"; return (${hit[1]});`)(); return v === true || Array.isArray(v) ? v : null; } catch { return null; }
}
const owns = {}; for (const m of new Set([...modules, ...Object.keys(A.GROUPS)])) owns[m] = ownsOf(m);

// the representative point of a record of any data array
const rep = (r) => {
  if (!r || typeof r !== 'object') return null;
  if (Number.isFinite(r.cx) && Number.isFinite(r.cz)) return [r.cx, r.cz];
  if (Number.isFinite(r.x) && Number.isFinite(r.z)) return [r.x, r.z];
  const v = (r.pts && r.pts.length >= 2 ? r.pts : r.polys && r.polys[0] && r.polys[0].o && r.polys[0].o.length >= 2 ? r.polys[0].o : r.o && r.o.length >= 2 ? r.o : null);
  return v ? [v[0], v[1]] : null;
};
const byId = new Map();      // every id of every record array of the facade -> the first record (BUILDINGS first: a building outline is also a POI)
const arrays = Object.entries(D).filter(([k, v]) => /^[A-Z_]+$/.test(k) && Array.isArray(v));
arrays.sort(([a], [b]) => (a === 'BUILDINGS' ? -1 : 0) - (b === 'BUILDINGS' ? -1 : 0));
for (const [, v] of arrays) for (const r of v) if (r && typeof r.id === 'string' && !byId.has(r.id)) byId.set(r.id, r);
const round = (n) => Math.round(n * 10) / 10;
const point = (id) => { const p = rep(byId.get(id)); return p ? [round(p[0]), round(p[1])] : [null, null]; };

const rows = [];
for (const [module, list] of Object.entries(A.GROUPS)) {
  const inModules = modules.includes(module);
  const o = owns[module];
  for (const g of list) {
    const ownsGroup = o === true || (Array.isArray(o) && o.includes(g.key));
    const push = (id, via, extra = {}) => { const [cx, cz] = point(id); rows.push({ id, module, group: g.key, via, ...extra, present: byId.has(id), cx, cz, inModules, owns: ownsGroup, owned: inModules && ownsGroup }); };
    for (const id of g.ids || []) push(id, 'id');
    for (const id of g.osm || []) push(id, 'osm');
    const mine = new Set(g.ids || []);
    for (const b of D.BUILDINGS) if (b.parent && mine.has(b.parent) && !mine.has(b.id)) push(b.id, 'parent', { parent: b.parent });
  }
}
console.log('CLAIMS_DUMP ' + JSON.stringify({ schema: 1, area, modules, owns, rows }));
