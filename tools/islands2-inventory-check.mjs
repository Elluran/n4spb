// Islands round 2: does every object of docs/reference/islands2-osm-inventory.json (named / tourist OSM objects on and beside the islands, written from Overpass 2026-10-13) exist in the baked data?
//   node tools/islands2-inventory-check.mjs [--list]      Lists the ids that are in no array of src/world/data/city.js, grouped by island and kind.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as D from '../src/world/data/city.js';
import { inPlay } from './osm-lib.mjs';
const inv = Object.values(JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-osm-inventory.json', import.meta.url)), 'utf8')));
const ids = new Set();
for (const k of Object.keys(D)) { const v = D[k]; if (Array.isArray(v)) for (const r of v) if (r && r.id !== undefined) ids.add(String(r.id)); }
const kindOf = (t = {}) => (t.historic || t.memorial ? 'historic' : t.tourism ? 'tourism:' + t.tourism : t.highway === 'bus_stop' ? 'bus_stop' : t.bridge ? 'bridge' : t.highway ? 'highway' : t.leisure ? 'leisure:' + t.leisure : t.amenity ? 'amenity' : t.building ? 'building' : 'other');
const miss = {}, tot = {};
for (const o of inv) {
  const k = o.island + ' ' + kindOf(o.tags); tot[k] = (tot[k] || 0) + 1;
  const pid = String(o.id);
  if (!ids.has(pid) && !ids.has(pid.replace(/^([nwr])/, (m) => m)) && inPlay(o.x, o.z)) { (miss[k] = miss[k] || []).push(o.id + (o.tags && o.tags.name ? ' ' + o.tags.name : '')); }
}
let nm = 0, nt = 0; for (const k in tot) nt += tot[k];
for (const k of Object.keys(miss).sort()) { nm += miss[k].length; console.log(k.padEnd(34), miss[k].length + '/' + tot[k], process.argv.includes('--list') ? miss[k].slice(0, 6).join(' | ') : ''); }
console.log('inventory objects', nt, 'inside play but in no baked array:', nm);
