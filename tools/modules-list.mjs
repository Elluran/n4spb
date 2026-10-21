// The module list of the page (src/main.js MODULES, in build order) for the headless tools: the audits must build what the page builds, so they read the list
// instead of keeping their own copy (the copies went stale once: landmark modules were missing from the road audits).
// The strip keeps its list in src/main.js; another area exports MODULES from its area module (src/areas/<id>/area.js, docs/AREAS.md): tools/area.mjs sets AREA=<id>.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Every module of the page's MODULES list, in order (area: default process.env.AREA or 'strip'). */
export function mainModules(area = process.env.AREA || 'strip') {
  const file = area === 'strip' ? 'src/main.js' : `src/areas/${area}/area.js`;
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const m = src.match(/export const MODULES = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error(`modules-list: MODULES not found in ${file}`);
  const list = [...m[1].matchAll(/^\s*'([A-Za-z0-9_]+)'/gm)].map((x) => x[1]);
  if (list.length < 10) throw new Error(`modules-list: MODULES of ${file} parsed to ${list.length} names`);
  return list;
}
/** The dynamic modules (no static street furniture / ground surfaces of their own). */
export const DYNAMIC = ['metro', 'traffic', 'people', 'wildlife', 'drive'];
