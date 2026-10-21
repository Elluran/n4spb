// Run a headless tool as another AREA (docs/AREAS.md): the module loader remaps the area's URL-like keys exactly like the import map of that area's page.
//   node tools/area.mjs <area> <tool.mjs> [tool args...]       e.g.  node tools/area.mjs north tools/layout-test.mjs
// The strip is the default (no remap), so `node tools/area.mjs strip tools/x.mjs` == `node tools/x.mjs`. The tool sees AREA=<id> in the environment (tools/modules-list.mjs reads the module list of that area).
import { register } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REGISTRY } from '../src/areas/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [area, script, ...rest] = process.argv.slice(2);
if (!area || !script) { console.error('usage: node tools/area.mjs <area> <tool.mjs> [args...]   areas: ' + Object.keys(REGISTRY).join(', ')); process.exit(2); }
const row = REGISTRY[area];
if (!row) { console.error(`unknown area "${area}" (known: ${Object.keys(REGISTRY).join(', ')})`); process.exit(2); }
process.env.AREA = area;
register('./lib/area-hooks.mjs', { parentURL: import.meta.url, data: { root, remap: row.remap || {} } });
const file = path.resolve(process.cwd(), script);
process.argv = [process.argv[0], file, ...rest];
await import(pathToFileURL(file).href);
