// CPU-only handling cost; deliberately not a claim about integrated city FPS.
// Optional comparison: --baseline-ref <commit before collision changes>.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { Physics } from '../src/core/physics.js';
import { createHandling } from '../src/world/drive/handling.js';
const refIndex = process.argv.indexOf('--baseline-ref');
const modes = [['current',createHandling]];
if (refIndex >= 0) {
  let src=execFileSync('git',['show',`${process.argv[refIndex+1]}:src/world/drive/handling.js`],{encoding:'utf8'});
  src=src.replace("'./model.js'",JSON.stringify(pathToFileURL(path.resolve('src/world/drive/model.js')).href));
  modes.unshift(['before',(await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'))).createHandling]);
}
for (const [name,create] of modes) {
  const physics=new Physics(()=>0);
  for(let x=-40;x<=40;x+=4)for(let z=-40;z<=40;z+=4)if(Math.abs(x)>3)physics.addBox(x,z,1,1,0,0,3);
  physics.addBox(0,10,30,.12,0,0,5);
  for(let i=0;i<50000;i++)physics.addCylinder(1000+i%500*4,1000+Math.floor(i/500)*4,.2,0,5);
  const car=create({physics,L:{WORLD:{play:{}},inPlay:()=>true,heightAt:()=>0,insideBuilding:()=>false},services:{}});
  const input={thr:0,brk:0,steer:0,hand:false,nitro:false};
  const times=[];
  for(let round=0;round<16;round++) {
    const start=performance.now();
    for(let i=0;i<600;i++){if(i%30===0){car.reset(0,0,0);car.vz=48;}car.step(1/60,input);}
    if(round>=4)times.push((performance.now()-start)/600);
  }
  times.sort((a,b)=>a-b);
  console.log(JSON.stringify({name,staticColliders:physics.count,frames:7200,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p50BatchMs:times[6],maxBatchMs:times.at(-1)}));
}
