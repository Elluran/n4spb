// gaps-petro-monuments.mjs - read-only: statues / busts / sculptures / steles / artworks of Petrogradsky Island that NO source file of src/world draws or mentions (by OSM id or by name).
// Input: the rows written by tools/gaps-petro-scan.mjs (argv[2]); output: JSON list (argv[3]) with a cluster label per object.
// usage: node tools/gaps-petro-scan.mjs rows.json && node tools/gaps-petro-monuments.mjs rows.json docs/research/gaps-petro-2026-monuments.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
let txt = '';
const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (f.name === 'data' || f.name === 'baked') continue; walk(p); } else if (/\.js$/.test(f.name) && f.name !== 'known-data.js') txt += fs.readFileSync(p, 'utf8') + '\n'; } };
walk(path.join(ROOT, 'src/world'));
const FIG = ['statue', 'bust', 'sculpture', 'stele', 'obelisk', 'stone', 'anchor', 'war_memorial'];
const cluster = (x, z) => {
  if (x > -2520 && x < -2250 && z > -2360 && z < -1960) return 'zoo';
  if (x > -1320 && x < -1090 && z > -2420 && z < -2230) return 'petrovskaya-embankment';
  if (x > -1100 && x < -760 && z > -2640 && z < -2380) return 'petrogradskaya-embankment (Nakhimov school, Aurora quay)';
  if (x > -2420 && x < -2300 && z > -3700 && z < -3600) return 'barmaley-animals (Lev Tolstoy sq. north)';
  if (x > -2200 && x < -2090 && z > -3500 && z < -3400) return 'violins (sad Andreya Petrova)';
  if (x > -2060 && x < -1560 && z > -3830 && z < -3480) return 'medical university + Nizami square';
  if (x > -3600 && x < -3200 && z > -2950 && z < -2330) return 'zhdanovka / Mytninskaya west';
  if (x > -2960 && x < -2600 && z > -2900 && z < -2560) return 'bolshoy pr. east (Dobrolyubov, Blagoev)';
  if (x > -2420 && x < -1700 && z > -3500 && z < -2900) return 'kamennoostrovsky / bolshoy middle';
  if (x > -1400 && x < -900 && z > -4000 && z < -3100) return 'karpovka east / petrogradskaya nab. north';
  return 'other';
};
const out = rows.filter((x) => x.inIsland && !x.tags.building && ((x.tags.historic === 'memorial' && FIG.includes(x.tags.memorial)) || (x.tags.tourism === 'artwork' && ['statue', 'sculpture', 'bust', 'installation', 'architecture'].includes(x.tags.artwork_type)) || x.tags.tourism === 'attraction'))
  .filter((x) => !(txt.includes(x.id) || (x.name && x.name.length > 4 && txt.includes(x.name))))
  .map((x) => ({ id: x.id, name: x.name, kind: x.tags.memorial || x.tags.artwork_type || x.tags.tourism, x: x.x, z: x.z, region: x.region, cluster: cluster(x.x, x.z), wikidata: x.tags.wikidata || null, subject: x.tags['subject:wikidata'] || null }));
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
const c = {}; for (const o of out) c[o.cluster] = (c[o.cluster] || 0) + 1;
console.log(out.length, JSON.stringify(c));
