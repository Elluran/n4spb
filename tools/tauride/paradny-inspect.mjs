// Collect the records of the Paradny quarter (x 720..1110, z -1220..-860) from the North data facade into <work>/paradny-data.json: the input of paradny-roofs.py and paradny-plan.py.
//   node tools/tauride/paradny-inspect.mjs [--work tools/tauride/raw/work] [--facade <city.js>]
// --facade: another data facade module (the default is src/areas/north/data/city.js; the full-city file of the source repository works too: it holds the same records).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, WORK_DIR, parseArgs, loadFacade, writeJson, rel } from './lib/common.mjs';

const args = parseArgs();
const D = args.facade ? await import(pathToFileURL(path.resolve(ROOT, args.facade)).href) : await loadFacade();
const work = path.resolve(ROOT, args.work || rel(WORK_DIR));
const first = (e) => [e.cx ?? e.x ?? e.pts?.[0] ?? e.polys?.[0]?.o?.[0], e.cz ?? e.z ?? e.pts?.[1] ?? e.polys?.[0]?.o?.[1]];
const near = (e) => { const [x, z] = first(e); return x > 720 && x < 1110 && z > -1220 && z < -860; };
const out = {};
for (const k of ['BUILDINGS', 'AREAS', 'GREEN', 'WATER', 'FOUNTAINS', 'ROADS', 'BARRIERS', 'STEPS', 'DOORS', 'PARKING']) {
  out[k] = D[k].filter(near);
  console.log(k.padEnd(10), out[k].length);
}
const n = writeJson(path.join(work, 'paradny-data.json'), out);
console.log(`-> ${rel(path.join(work, 'paradny-data.json'))} (${n} B)`);
