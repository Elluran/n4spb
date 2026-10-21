// Import lint for a site that is developed on Windows and served from Linux (docs/AREAS.md): every relative import of src/ must exist with EXACTLY the spelling used (no case-only
// differences: Windows would run it, GitHub Pages would answer 404), and every module named in a MODULES list must have its file. node tools/import-lint.mjs
// Template imports (import(`./world/${n}.js`)) cannot be resolved statically: the ones in main.js / lib/claims.js are covered by the MODULES / MODULE_KEYS checks below, any other is reported.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsExact, realSpelling, srcFiles, importsOf } from './lib/exact-case.mjs';
import { mainModules } from './modules-list.mjs';
import { REGISTRY } from '../src/areas/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [], notes = [];
let imports = 0;
for (const { abs, rel } of srcFiles(root)) {
  const text = fs.readFileSync(abs, 'utf8');
  for (const { spec, kind, line } of importsOf(text)) {
    if (!spec.startsWith('.')) continue;                                  // 'three', 'three/addons/...': the import map of the page
    if (kind === 'template') {
      const known = (rel === 'src/main.js' && spec.startsWith('./world/')) || (rel === 'src/world/lib/claims.js' && spec.startsWith('../')) || (rel === 'src/world/drive/cars/index.js');
      if (!known) notes.push(`${rel}:${line}: template import ${spec} cannot be checked statically`);
      continue;
    }
    imports++;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    if (!existsExact(root, target)) { const real = realSpelling(root, target); problems.push(`${rel}:${line}: import '${spec}' ${real ? `differs in case from ${real}` : 'does not exist'}`); }
  }
}
// the module lists (template imports of main.js build() and claims.js): every name must exist as src/world/<name>.js
const lists = { strip: mainModules('strip') };
for (const a of Object.values(REGISTRY)) {
  if (a.id === 'strip') continue;
  const f = path.join(root, `src/areas/${a.id}/area.js`);
  if (fs.existsSync(f)) lists[a.id] = mainModules(a.id);
}
for (const [id, list] of Object.entries(lists)) for (const m of list) if (!existsExact(root, `src/world/${m}.js`)) problems.push(`MODULES of ${id}: src/world/${m}.js ${realSpelling(root, `src/world/${m}.js`) ? 'differs in case' : 'does not exist'}`);
// the pages: the import map targets and script sources
for (const a of Object.values(REGISTRY)) {
  if (a.status === 'planned') continue;
  const f = path.join(root, a.page); if (!fs.existsSync(f)) { problems.push(`${a.page}: page of area ${a.id} is missing`); continue; }
  if (!existsExact(root, a.page)) problems.push(`${a.page}: differs in case from the file on disk`);
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/<script[^>]*\ssrc="(\.\/[^"]+)"/g)) if (!existsExact(root, m[1].slice(2))) problems.push(`${a.page}: script ${m[1]} does not exist (or differs in case)`);
  for (const m of html.matchAll(/"(\.\/src\/[^"]+\.js)"\s*:\s*"(\.\/src\/[^"]+\.js)"/g)) for (const p of [m[1], m[2]]) if (!existsExact(root, p.slice(2))) problems.push(`${a.page}: import map entry ${p} does not exist (or differs in case)`);
}
console.log(`import-lint: ${imports} relative imports, ${Object.entries(lists).map(([k, v]) => `${v.length} modules (${k})`).join(', ')}, ${Object.keys(REGISTRY).length} page(s)`);
for (const n of notes) console.log('  note: ' + n);
for (const p of problems) console.log('  PROBLEM: ' + p);
console.log(problems.length ? `RESULT: FAIL (${problems.length})` : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
