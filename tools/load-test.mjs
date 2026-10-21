// Normal scene loading, not the screenshot shortcut (which skips the roof map).
// npm run load -- --q medium --out shots/load/medium [--profile] [--network]
// --params "earlycompile=0" / "noroof=1" allow controlled comparisons.
// --area <id> | --page <file> loads another area's page (north.html); every argument is passed to tools/shot.mjs.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.execPath, [fileURLToPath(new URL('./shot.mjs', import.meta.url)), '--load', ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
