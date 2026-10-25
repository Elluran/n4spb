// tools/version.mjs - bump the game version (rules: CLAUDE.md "Versioning").
//   node tools/version.mjs patch|minor|major "one line: what changed"     bumps src/core/version.js + package.json and prepends a line to CHANGELOG.md
//   node tools/version.mjs                                                prints the current version and whether the two files agree
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vf = path.join(root, 'src/core/version.js'), pf = path.join(root, 'package.json'), cf = path.join(root, 'CHANGELOG.md');
const cur = fs.readFileSync(vf, 'utf8').match(/VERSION = '(\d+\.\d+\.\d+)'/)?.[1], pkg = JSON.parse(fs.readFileSync(pf, 'utf8'));
const [kind, ...note] = process.argv.slice(2);
if (!kind) { console.log(`version ${cur}; package.json ${pkg.version}${cur === pkg.version ? '' : '  MISMATCH'}`); process.exit(cur === pkg.version ? 0 : 1); }
if (!['patch', 'minor', 'major'].includes(kind) || !note.length) { console.error('usage: node tools/version.mjs patch|minor|major "what changed"'); process.exit(2); }
let [a, b, c] = cur.split('.').map(Number);
if (kind === 'major') { a++; b = 0; c = 0; } else if (kind === 'minor') { b++; c = 0; } else c++;
const next = `${a}.${b}.${c}`;
fs.writeFileSync(vf, fs.readFileSync(vf, 'utf8').replace(/VERSION = '\d+\.\d+\.\d+'/, `VERSION = '${next}'`));
fs.writeFileSync(pf, fs.readFileSync(pf, 'utf8').replace(/"version": "[^"]+"/, `"version": "${next}"`));
const line = `- **${next}** (${new Date().toISOString().slice(0, 10)}, ${kind}): ${note.join(' ')}\n`;
const old = fs.existsSync(cf) ? fs.readFileSync(cf, 'utf8') : '# Changelog\n\nNewest first. One line per version; rules in CLAUDE.md (Versioning).\n\n';
const i = old.indexOf('\n- **'), head = i < 0 ? old.replace(/\n*$/, '\n\n') : old.slice(0, i + 1);
fs.writeFileSync(cf, head + line + (i < 0 ? '' : old.slice(i + 1)));
console.log(`${cur} -> ${next} (${kind})`);
