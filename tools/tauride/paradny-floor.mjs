// Dump the Paradny podium polygon and the stair ways of paradny-surface.js to <work>/paradny-surface-data.json: the input of paradny-floor.py.
//   node tools/tauride/paradny-floor.mjs [--surface <path to paradny-surface.js>] [--work tools/tauride/raw/work]
// --surface: the module that exports PARADNY_PODIUM and PARADNY_STAIRS. Default: src/world/landmarksTauride/paradny-surface.js of this repository (present after the Palace + Paradny port),
//   else $PITER_SRC/src/world/landmarksTauride/paradny-surface.js (the source repository, read-only). The podium polygon is HAND-FITTED to the building edges and stairs (design data of the source
//   repository, not derived from OSM), so it has to come from that module; the stair ways are STEPS records of the facade (this tool takes them from the module as the source repository does).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, WORK_DIR, parseArgs, writeJson, rel } from './lib/common.mjs';

const args = parseArgs();
const cands = [args.surface, path.join(ROOT, 'src/world/landmarksTauride/paradny-surface.js'), process.env.PITER_SRC && path.join(process.env.PITER_SRC, 'src/world/landmarksTauride/paradny-surface.js')].filter(Boolean).map((p) => path.resolve(ROOT, p));
const file = cands.find((p) => fs.existsSync(p));
if (!file) { console.error('paradny-floor: no paradny-surface.js (give --surface <file>, or set PITER_SRC to the source repository; tried ' + cands.map((p) => rel(p)).join(', ') + ')'); process.exit(2); }
const { PARADNY_PODIUM, PARADNY_STAIRS } = await import(pathToFileURL(file).href);
const work = path.resolve(ROOT, args.work || rel(WORK_DIR));
const n = writeJson(path.join(work, 'paradny-surface-data.json'), { podium: PARADNY_PODIUM, stairs: PARADNY_STAIRS });
console.log(`podium ${PARADNY_PODIUM.o.length / 2} verts, ${PARADNY_STAIRS.length} stairs from ${file} -> ${rel(path.join(work, 'paradny-surface-data.json'))} (${n} B)`);
