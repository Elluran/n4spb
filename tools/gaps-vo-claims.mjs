// gaps-vo-claims.mjs - audit helper: which named OSM objects of Vasilievsky Island (docs/reference/vo-osm-inventory.json) are claimed / mentioned by a module.
//   node tools/gaps-vo-claims.mjs [out.json]   reads src/world/**/*.js as text (no imports), writes a JSON with per-object status (default: stdout summary only)
// status: 'claimed' = id in a groups.js ids/osm list (or layout.js GROUPS); 'mentioned' = id string appears in any other src/world file (module code, props, city known houses);
//         'near-claim' = within 60 m of a claim 'at' point of a sight module (area is authored but this object is not itself named); 'generic' = none of those.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const inv = JSON.parse(fs.readFileSync(ROOT + 'docs/reference/vo-osm-inventory.json', 'utf8'));
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name === 'data') continue; walk(p, out); } else if (e.name.endsWith('.js')) out.push(p); } return out; };
const files = walk(ROOT + 'src/world');
const idRe = /\b([wrn]\d{5,})\b/g;
const claimed = new Map(), mentioned = new Map();
const add = (m, id, f) => { let s = m.get(id); if (!s) m.set(id, s = new Set()); s.add(f); };
const claimAt = [];
for (const f of files) {
  const rel = path.relative(ROOT + 'src/world', f).split(path.sep).join('/');
  const t = fs.readFileSync(f, 'utf8');
  const isGroups = /\/groups\.js$/.test(rel) || rel === 'layout.js';
  const mod = rel.split('/')[0].replace(/\.js$/, '');
  let m;
  idRe.lastIndex = 0;
  while ((m = idRe.exec(t))) add(isGroups ? claimed : mentioned, m[1], mod + (isGroups ? ':groups' : ''));
  if (isGroups && rel !== 'layout.js') {
    const atRe = /key:\s*'([^']+)'[\s\S]*?at:\s*\[\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\]/g;
    while ((m = atRe.exec(t))) claimAt.push({ mod, key: m[1], x: +m[2], z: +m[3] });
  }
}
const out = [];
for (const o of inv) {
  const c = claimed.get(o.id), me = mentioned.get(o.id);
  let status = 'generic', by = null;
  if (c) { status = 'claimed'; by = [...c].join(','); }
  else if (me) { status = 'mentioned'; by = [...me].slice(0, 4).join(','); }
  else {
    let best = null;
    for (const a of claimAt) { const d = Math.hypot(a.x - o.x, a.z - o.z); if (d <= 60 && (!best || d < best.d)) best = { d, a }; }
    if (best) { status = 'near-claim'; by = best.a.mod + ':' + best.a.key + ' @' + Math.round(best.d) + 'm'; }
  }
  out.push({ id: o.id, name: o.name, kind: o.kind, x: o.x, z: o.z, areaM2: o.areaM2, imp: o.importance, tags: o.tags, status, by });
}
const sum = {};
for (const o of out) sum[o.status] = (sum[o.status] || 0) + 1;
console.log(JSON.stringify(sum));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(out));
