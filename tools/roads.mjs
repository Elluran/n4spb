// npm run roads: runs the furniture audit, the surface audit and the ribbon audit one after the other (every one also runs when an earlier one fails) and exits non-zero when any failed.
// The audits cover the whole play area (layout.inPlay), the Petrograd side and Vasilievsky Island (V3..V12) included; the strict furniture audit also fails on objects within 1.35 m of a tram rail axis.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const runs = [
  ['roads-furniture-audit.mjs', '--strict', '--allow', 'GUARD_STONE,PROP,BIN,TREE,FACADE_COLLIDER'],
  ['roads-surface-audit.mjs', '--max-fail', '2170'],
  ['streets-ribbon-audit.mjs', '--max-walls', '10', '--max-surf', '1000'],       // walls / pavement strips laid over asphalt (docs/AGENT-BRIEF.md road integrity rules): 4 wall segments, 935 triangles (372 m2) of strips over side-street mouths on 2026-10-07
];
let code = 0;
for (const [script, ...args] of runs) {
  const r = spawnSync(process.execPath, ['--max-old-space-size=12288', path.join(dir, script), ...args], { stdio: 'inherit' });
  const c = r.status ?? 1;
  console.log(`[roads] ${script} exit ${c}`);
  if (c !== 0) code = 1;
}
console.log(code === 0 ? '[roads] OK' : '[roads] FAIL');
process.exit(code);
