// The module list of the page (src/main.js MODULES, in build order) for the headless tools: the audits must build what the page builds, so they read the list
// instead of keeping their own copy (the copies went stale: the Mars Field / south-west / Petrograd landmark modules were missing from the road audits).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
/** Every module of src/main.js MODULES, in order. */
export function mainModules() {
  const src = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
  const m = src.match(/export const MODULES = \[([\s\S]*?)\n\];/);
  if (!m) throw new Error('modules-list: MODULES not found in src/main.js');
  const list = [...m[1].matchAll(/^\s*'([A-Za-z0-9_]+)'/gm)].map((x) => x[1]);
  if (list.length < 20) throw new Error('modules-list: MODULES parsed to ' + list.length + ' names');
  return list;
}
/** The dynamic modules (no static street furniture / ground surfaces of their own). */
export const DYNAMIC = ['metro', 'traffic', 'people', 'wildlife', 'drive'];
