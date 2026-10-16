// Equivalence of the nav bake format against the generator, inside the real scene (no bake files needed: the bake is recorded into memory and hydrated from there).
//   node tools/nav-bake-equiv.mjs [--q medium]            prints RESULT: OK / FAIL (see tools/nav-bake-equiv-page.js for what is compared)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2), qi = args.indexOf('--q'), q = qi >= 0 ? args[qi + 1] : 'medium';
const r = spawnSync(process.execPath, [fileURLToPath(new URL('./shot.mjs', import.meta.url)), '--q', q, '--cams', 'hero', '--params', 'baked=force', '--out', 'shots/perf/nav-equiv',
  '--eval', "(async()=>{try{const m=await import('/tools/nav-bake-equiv-page.js');return await m.run()}catch(e){return {error:String(e&&e.stack||e)}}})()"], { encoding: 'utf8' });
const line = (r.stdout || '').split('\n').find((l) => l.startsWith('eval:')) || '';
console.log(line || r.stdout.slice(-2000));
const ok = line.includes('"ok":true');
console.log(ok ? 'RESULT: OK' : 'RESULT: FAIL');
process.exit(ok ? 0 : 1);
