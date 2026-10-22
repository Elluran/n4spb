// tools/hooks-syntax-check.mjs - `node --check` over the files that the hook set of milestone M6 touches (docs/AREAS.md section 9): the eleven engine files that read a hook or a height patch, lib/area-tables.js,
// the two area modules and the files of src/areas/north/hooks.js + hooks/. It imports nothing (no three.js, no `npm ci`), so it is a step of the CI job `verify`.
//   node tools/hooks-syntax-check.mjs            (npm run hooks:syntax; part of npm run hooks:all)
// It proves only that every file PARSES. It does not run the engine: the call sites (trees, tufts, props, ways, parking, heightAt, handling, nav, sim) are exercised by the engine tests of `npm run hooks:all`
// (hooks:height, hooks:keepout, hooks:people --scene), which need three.js and run locally (docs/AREAS.md 9.6).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = ['src/world/layout.js', 'src/world/lib/area-tables.js', 'src/world/drive/handling.js', 'src/world/environment/trees.js', 'src/world/environment/lawns.js', 'src/world/props/world.js',
  'src/world/streets.js', 'src/world/streets/parking.js', 'src/world/people.js', 'src/world/people/nav.js', 'src/world/people/sim.js'];
const AREAS = ['src/world/area.js', 'src/areas/north/area.js', 'src/areas/north/hooks.js'];
const hooksDir = 'src/areas/north/hooks';
const files = [...ENGINE, ...AREAS, ...(fs.existsSync(path.join(root, hooksDir)) ? fs.readdirSync(path.join(root, hooksDir)).filter((f) => f.endsWith('.js')).sort().map((f) => `${hooksDir}/${f}`) : [])];

let bad = 0;
for (const f of files) {
  if (!fs.existsSync(path.join(root, f))) { bad++; console.log(`MISSING ${f}`); continue; }
  const r = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.log(`FAIL ${f}\n${String(r.stderr).split('\n').slice(0, 6).join('\n')}`); }
}
console.log(bad ? `RESULT: FAIL (${bad} of ${files.length} files)` : `RESULT: OK (${files.length} files parse: ${ENGINE.length} engine, ${AREAS.length} area, ${files.length - ENGINE.length - AREAS.length} hooks/*.js)`);
process.exit(bad ? 1 : 0);
