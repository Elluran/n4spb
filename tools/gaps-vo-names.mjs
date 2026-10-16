// gaps-vo-names.mjs - audit helper (second pass of gaps-vo-claims.mjs): for every named inventory object that is not claimed by id, look whether its Russian NAME (or a long word of it) appears in the
// source of src/world (not data) or in a docs/research/*.md dossier. A name in code means a module (or a props / people table) knows the object even without claiming its id.
//   node tools/gaps-vo-names.mjs <status.json from gaps-vo-claims.mjs> <out.json>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const st = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) { if (e.name === 'data') continue; walk(p, out); } else if (/\.(js|mjs)$/.test(e.name)) out.push(p); } return out; };
const src = walk(ROOT + 'src/world').map((f) => ({ f: path.relative(ROOT + 'src/world', f).split(path.sep).join('/'), t: fs.readFileSync(f, 'utf8').toLowerCase().replace(/ё/g, 'е') }));
const docs = fs.readdirSync(ROOT + 'docs/research').filter((n) => n.endsWith('.md')).map((n) => ({ f: 'docs/research/' + n, t: fs.readFileSync(ROOT + 'docs/research/' + n, 'utf8').toLowerCase().replace(/ё/g, 'е') }));
const norm = (s) => s.toLowerCase().replace(/ё/g, 'е');
const out = [];
for (const o of st) {
  const r = { ...o, nameSrc: null, nameDoc: null };
  if (o.name && o.status !== 'claimed' && o.status !== 'mentioned') {
    const n = norm(o.name).trim();
    if (n.length >= 6) {
      const hit = src.find((s) => s.t.includes(n));
      if (hit) r.nameSrc = hit.f.split('/')[0].replace(/\.js$/, '');
      const dh = docs.filter((s) => s.t.includes(n)).map((s) => s.f.replace('docs/research/', '').replace('.md', ''));
      if (dh.length) r.nameDoc = dh.slice(0, 3).join(',');
    }
  }
  out.push(r);
}
fs.writeFileSync(process.argv[3], JSON.stringify(out));
const c = { nameSrc: out.filter((o) => o.nameSrc).length, nameDocOnly: out.filter((o) => !o.nameSrc && o.nameDoc).length };
console.log(JSON.stringify(c));
