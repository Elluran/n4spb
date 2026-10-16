// Serial quiet full-scene measurements. --baseline uses the immutable pre-pass
// worktree and normal old bake; never an isolated scene or a forced stale bake.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url)),baseline=process.argv.includes('--baseline');
const baselineArg=process.argv.indexOf('--baseline-root');
const cwd=baseline?(baselineArg>=0?path.resolve(process.argv[baselineArg+1]):'C:/Users/user/AppData/Local/Temp/piter-islands-baseline/102_3d_piter'):root;
if(!fs.existsSync(path.join(cwd,'tools/drive-bench.mjs')))throw Error('Missing immutable baseline worktree; provide --baseline-root <project>');
const out=path.join(root,'shots/islands-2026'),prefix=baseline?'before-clean':'after';fs.mkdirSync(out,{recursive:true});
const centre='498.2286,135.1625,76.0322',vo='-3985.131825,-1247.700307,120.170520';
const tests=[['centre-drive',centre,false],['centre-walk',centre,true],['vo-drive',vo,false]];
if(!baseline)tests.push(['krestovsky-drive','-5546.025565,-4007.441464,-81.436784',false],['krestovsky-walk','-6441.8,-4456.8,85',true]);
for(const [name,start,walk] of tests){
 const dest=path.join(out,prefix+'-'+name);console.log(`MEASURING ${prefix}-${name}`);
 const r=spawnSync(process.execPath,['tools/drive-bench.mjs','--q','medium','--seconds','20','--load-timeout','600000','--protocol-timeout','600000','--start',start,...(walk?['--walk']:[]),'--json','--diagnostics','--out',dest],{cwd,stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
}
console.log('RESULT: OK (serial full-scene normal-loading measurements)');
