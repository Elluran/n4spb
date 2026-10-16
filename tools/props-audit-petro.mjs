// Reads the JSON of tools/roads-furniture-audit.mjs (--json file) and keeps the rows of the Petrograd side / Spit extension (traffic/region.js inPetro), split into what the strict audit
// forgives (small props: GUARD_STONE, PROP, BIN, TREE, FACADE_COLLIDER) and what fails; rows of the props module are listed apart (a shelter, kiosk or stall on asphalt is a failure).
//   node --max-old-space-size=12288 tools/roads-furniture-audit.mjs --strict --modules <list with props> --json out.json ;  node tools/props-audit-petro.mjs out.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { inPetro } = await import(pathToFileURL(path.join(root, 'src/world/traffic/region.js')).href);
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const rows = (j.offenders || []).filter((r) => typeof r.x === 'number' && inPetro(r.x, r.z));
const ALLOW = ['GUARD_STONE', 'PROP', 'BIN', 'TREE', 'FACADE_COLLIDER'];
const on = rows.filter((r) => r.status === 'on_road');
const allowed = on.filter((r) => ALLOW.some((a) => r.cat === a || String(r.rc || '').includes(a))), failing = on.filter((r) => !allowed.includes(r));
const by = (list, f) => { const m = {}; for (const r of list) m[f(r)] = (m[f(r)] || 0) + 1; return m; };
console.log(`Petrograd side / Spit: ${rows.length} audit rows, ${on.length} on a carriageway: ${allowed.length} forgiven by --strict, ${failing.length} failing`);
console.log('  failing by module / category:', JSON.stringify(by(failing, (r) => `${r.module || '?'} / ${r.cat || '?'} / ${String(r.rc || '').split('/')[0]}`)));
const mine = on.filter((r) => /^(props|traffic)$/.test(r.module || '') || /^pr-/.test(String(r.src || '')));
console.log(`  rows of props / traffic on a carriageway: ${mine.length}`, JSON.stringify(by(mine, (r) => `${r.cat || '?'}:${r.src || r.file || '?'}`)));
for (const r of mine.slice(0, 30)) console.log(`     ${r.cat} ${r.src || ''} ${r.file || ''}:${r.line || ''} at ${r.x.toFixed(1)},${r.z.toFixed(1)} clearance ${r.clearance} ${r.rc || ''}`);
process.exit(mine.filter((r) => !ALLOW.some((a) => r.cat === a || String(r.rc || '').includes(a))).length ? 1 : 0);
