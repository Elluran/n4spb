// Run one headless tool once per REAL area (docs/AREAS.md section 5): the strip first, then every other registry row that is not 'planned'.
//   node tools/each-area.mjs tools/layout-test.mjs [args...]       == node tools/area.mjs <id> tools/layout-test.mjs [args...] for each real area
// Every run happens (a failure does not hide the next area); the exit code is 1 when any run failed. Used by npm run layout / landmarks and by the CI 'verify' job.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../src/areas/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [script, ...rest] = process.argv.slice(2);
if (!script) { console.error('usage: node tools/each-area.mjs <tool.mjs> [args...]'); process.exit(2); }
const ids = Object.values(REGISTRY).filter((a) => a.status !== 'planned').map((a) => a.id).sort((a, b) => (a === 'strip' ? -1 : b === 'strip' ? 1 : 0));
const failed = [];
for (const id of ids) {
  console.log(`\n===== ${path.basename(script)} as area ${id} =====`);
  const r = spawnSync(process.execPath, [path.join(root, 'tools/area.mjs'), id, script, ...rest], { stdio: 'inherit', cwd: process.cwd(), env: process.env });
  if (r.status !== 0) failed.push(id);
}
console.log(failed.length ? `\neach-area: FAILED for ${failed.join(', ')}` : `\neach-area: OK (${ids.join(', ')})`);
process.exit(failed.length ? 1 : 0);
