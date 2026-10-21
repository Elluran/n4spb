// Contract of the runtime-only files (tools/baked-revision.mjs RUNTIME_ONLY): they are left out of the bake revision, so nothing that builds the scene may depend on them.
// The only importer allowed is src/main.js (and the runtime-only files themselves); a file that builds the world and imports one would make a stale bake look fresh. node tools/runtime-only-lint.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RUNTIME_ONLY } from './baked-revision.mjs';
import { srcFiles, importsOf } from './lib/exact-case.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWED = new Set(['src/main.js', ...RUNTIME_ONLY]);
const problems = [];
for (const rel of RUNTIME_ONLY) if (!fs.existsSync(path.join(root, rel))) console.log(`  note: runtime-only file ${rel} does not exist yet`);
let checked = 0;
for (const { abs, rel } of srcFiles(root)) {
  if (ALLOWED.has(rel)) continue;
  checked++;
  for (const { spec, kind, line } of importsOf(fs.readFileSync(abs, 'utf8'))) {
    if (!spec.startsWith('.')) continue;
    if (kind === 'template') { const probe = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec.replace(/\$\{[^}]*\}/g, 'x'))); if (RUNTIME_ONLY.some((r) => path.posix.dirname(r) === path.posix.dirname(probe))) problems.push(`${rel}:${line}: template import ${spec} could reach a runtime-only directory`); continue; }
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
    if (RUNTIME_ONLY.includes(target)) problems.push(`${rel}:${line}: imports the runtime-only file ${target} (only src/main.js may)`);
  }
}
// a runtime-only file must not be the target of a bake product either: the bake tool names the files it hashes
console.log(`runtime-only-lint: ${checked} files checked against ${RUNTIME_ONLY.length} runtime-only file(s)`);
for (const p of problems) console.log('  PROBLEM: ' + p);
console.log(problems.length ? `RESULT: FAIL (${problems.length})` : 'RESULT: OK');
process.exit(problems.length ? 1 : 0);
