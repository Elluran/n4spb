// The whole Tauride data pipeline in one command: facade -> derived.json -> water union (Python / shapely) -> the pure-data modules of src/world/landmarksTauride/data/.
//   node tools/tauride/build.mjs [--out src/world/landmarksTauride/data] [--work tools/tauride/raw/work] [--check] [--no-union]
// Steps:  1. node tauride-generate.mjs   (reads src/areas/north/data, writes <work>/derived.json)
//         2. python tauride-union.py     (needs python 3 + shapely; writes <work>/union.json)   --no-union reuses an existing union.json
//         3. emit: water.js, bridges.js, paths.js, furniture.js, footprints.js into --out (every file written whole; running twice gives the same bytes)
// --check: write nothing into --out, compare what would be written with the files there and exit 1 on any difference (the guard against a hand edit or a stale module).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, TAURIDE_DIR, WORK_DIR, DATA_DIR, parseArgs, loadFacade, readJson, writeText, runPython, shapelyInfo, rel } from './lib/common.mjs';
import { buildModules } from './lib/emit.mjs';

const args = parseArgs();
const work = path.resolve(ROOT, args.work || rel(WORK_DIR));
const outDir = path.resolve(ROOT, args.out || rel(DATA_DIR));

const g = spawnSync(process.execPath, [path.join(TAURIDE_DIR, 'tauride-generate.mjs'), '--work', work], { encoding: 'utf8', cwd: ROOT, env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '--max-old-space-size=4000' } });
process.stdout.write(g.stdout);
if (g.status !== 0) { process.stderr.write(g.stderr); process.exit(1); }
if (!args['no-union']) {
  const s = shapelyInfo();
  if (!s.ok) { console.error('build: ' + s.why + ' (the water union needs it; use --no-union to reuse an existing union.json)'); process.exit(2); }
  process.stdout.write(runPython('tauride-union.py', ['--work', work]));
}
const derived = readJson(path.join(work, 'derived.json')), union = readJson(path.join(work, 'union.json'));
const files = buildModules(derived, union, await loadFacade());
let bad = 0;
for (const [name, text] of Object.entries(files)) {
  const file = path.join(outDir, name);
  if (args.check) {
    const have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
    if (have !== text.replace(/\r\n/g, '\n')) { bad++; console.log(`DIFFERS ${rel(file)}`); } else console.log(`same    ${rel(file)}`);
  } else console.log(`wrote   ${rel(file)} (${writeText(file, text)} B)`);
}
if (args.check) { console.log(bad ? `build --check: ${bad} file(s) differ` : 'build --check: all modules are what the pipeline produces'); process.exit(bad ? 1 : 0); }
