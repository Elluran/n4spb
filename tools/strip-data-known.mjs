// tools/strip-data-known.mjs - cut src/world/city/known-data.js down to the houses of the strip.
// KNOWN_DATA (the research dossiers of the houses, keyed by OSM building id, city/known.js looks an entry up by b._fillOf || b.id, then by b.parent) holds the houses of the whole
// city; only the ids that exist in BUILDINGS of src/world/data/city.js can ever be looked up, so every other entry is removed (the west entry line is re-serialised, the generated
// Object.assign blocks lose their lines; a block with no entry left is removed with its markers, a block that keeps some gets its count comment updated).
// known-extra.js (33 hand corrections) was cut by hand the same way: it is small and its comments are per group.
// Usage: node tools/strip-data-known.mjs [--check]   (idempotent; --check writes nothing and exits 1 when the file would change)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'src', 'world', 'city', 'known-data.js');
const CHECK = process.argv.includes('--check');
const { BUILDINGS } = await import(pathToFileURL(path.join(root, 'src', 'world', 'data', 'city.js')).href);
const ids = new Set(BUILDINGS.map((b) => b.id));

const lines = fs.readFileSync(file, 'utf8').split('\n');
const out = [];
let removed = 0, kept = 0;
let block = null;                                    // lines of the Object.assign block being read: {begin, lines, entries}
const flush = () => {
  if (!block) return;
  if (block.entries) {
    for (const ln of block.lines) {
      if (/^\/\/ \d+ houses/.test(ln)) out.push(ln.replace(/^\/\/ (\d+) houses( \(of \d+ in the full city\))?/, (m, n, o) => `// ${block.entries} houses (of ${o ? o.match(/\d+/)[0] : n} in the full city)`));
      else out.push(ln);
    }
  }
  block = null;
};
for (const ln of lines) {
  const begin = /^\/\/ ---- BEGIN (\w+) /.test(ln);
  if (begin) { block = { lines: [ln], entries: 0 }; continue; }
  if (block) {
    const m = /^ {2}"([wnr]\d+)": \{/.exec(ln);
    if (m) { if (ids.has(m[1])) { block.lines.push(ln); block.entries++; kept++; } else removed++; }
    else block.lines.push(ln);
    if (/^\/\/ ---- END /.test(ln)) flush();
    continue;
  }
  const w = /^export const KNOWN_DATA = (\{.*\});$/.exec(ln);
  if (w) {
    const all = JSON.parse(w[1]), keep = {};
    for (const [k, v] of Object.entries(all)) if (ids.has(k)) { keep[k] = v; kept++; } else removed++;
    out.push('export const KNOWN_DATA = ' + JSON.stringify(keep) + ';');
    continue;
  }
  out.push(ln);
}
if (block) throw new Error('unterminated block in known-data.js');
const text = out.join('\n'), old = lines.join('\n');
console.log('known-data.js entries kept', kept, 'removed', removed, '| bytes', Buffer.byteLength(old), '->', Buffer.byteLength(text));
if (CHECK) { if (text !== old) { console.error('--check: known-data.js would change'); process.exit(1); } } else fs.writeFileSync(file, text);
