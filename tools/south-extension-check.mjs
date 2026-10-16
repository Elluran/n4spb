// Full normal-loading screenshots + physical/streaming assertions. No reduced
// module list or forced stale bake; serial GPU job. Run after the shipping bake.
import { spawnSync } from 'node:child_process';
import * as L from '../src/world/layout.js';

const views=L.VIEWS.filter(v=>['Центр до Обводного','Московский проспект'].includes(v.group));
const cameras=views.map(v=>[v.x,1.7,v.z,v.yaw,v.pitch].join(',')).concat([
  '-1520,45,7460,0,-22', // ponds, paths, park trees and arena context
  '-1812,1.7,4603,0,2', // turn toward the old centre, streamed avenue
  '-1837,24,2690,0,-25', // Obvodny crossing / bridge mouths
]);
const oldIsland=L.VIEWS.find(v=>v.key==='Place.karl-may-school');
cameras.push([L.HERO.x,1.7,L.HERO.z,L.HERO.yaw,L.HERO.pitch].join(','),[oldIsland.x,1.7,oldIsland.z,oldIsland.yaw,oldIsland.pitch].join(','));
cameras.push(
  '-2981,1.7,1690,45,5', '-3007,1.7,1728,90,4', // Egyptian sphinxes and crossing
  '-912,1.7,470,-58,10', '-849,1.7,452,64,10', // Lomonosov towers / quay
  '-1656,1.7,7072,-90,5', '-660,1.7,7305,-19,7', // fountain / arena with full context
  '-1490,2.4,8900,-125,20', // House of Soviets colonnade / frieze detail
  '-1783.8,22.3,4324,377.8,-25.4', '-1783.8,22.3,4324,197.8,-25.4',
  '-1783.8,1.7,4324,17.8,12', // reported horizon-wall pose / both directions / street
);
const expression=`(async()=>{
 const ctx=__ctx,fail=m=>{throw Error(m)};
 if(!ctx.baked)fail('Normal shipping bake was not selected');
 if(__errors.length)fail('Module errors '+JSON.stringify(__errors));
 if(ctx._roadPlan!==ctx.services.streets.net)fail('Duplicate street planning network');
 const ground=[];ctx.staticRoot.traverse(o=>{if(o.isMesh&&o.name==='env-ground')ground.push(o)});
 if(ground.length<2||ground.some(o=>!o.frustumCulled))fail('Ground is not spatially culled');
 const views=ctx.L.VIEWS.filter(v=>['Центр до Обводного','Московский проспект'].includes(v.group));
 for(const v of views){await ctx.regions.ensureAt(v.x,v.z);if(!ctx.regions.readyAt(v.x,v.z))fail('Teleport not ready '+v.key);}
 const {SOUTH_SITES}=await import('./src/world/bridges/sites-south.js');
 const {toWorld}=await import('./src/world/bridges/sites.js');let bridgeSamples=0;
 for(const s of SOUTH_SITES)for(let u=-35;u<=35;u+=1){const p=toWorld(s,u,0),y=ctx.services.bridges.deckY(p.x,p.z);
  if(y===null)continue;const floor=ctx.physics.groundHeight(p.x,p.z,y+.1,false);
  if(floor<-.1||Math.abs(floor-y)>.25)fail('Unsupported bridge '+s.name+' at '+u+': '+floor+' / '+y);bridgeSamples++;}
 const d=ctx.drive;await ctx.regions.ensureAt(-1832,2685);d.enter();d.place(-1831.9,2685,1.6);
 const before={x:d.car.x,z:d.car.z},cross=d.sim(8,{thr:1});
 if(cross.z>=2634||Math.hypot(cross.x-before.x,cross.z-before.z)<50)fail('Car did not cross Obvodny '+JSON.stringify(cross));
 // S brakes and then reverses. Release at the first stop instead of holding
 // it long enough to reverse and calling that a braking failure.
 let brake=d.sim(0),brakeSteps=0;
 while(Math.abs(brake.speed)>1&&brakeSteps++<600)brake=d.sim(1/60,{brk:1});
 if(Math.abs(brake.speed)>1)fail('Car did not brake '+JSON.stringify(brake));d.exit();
 if(d.active||ctx.playerObj.inputLock)fail('Car exit/input restoration failed');
 const {SOUTH_PONDS,inSouthPond}=await import('./src/world/environment/south-ponds.js');let pondSamples=0;
 for(const w of SOUTH_PONDS)for(const p of w.polys){const xs=p.o.filter((_,i)=>i%2===0),zs=p.o.filter((_,i)=>i%2),x=xs.reduce((a,b)=>a+b,0)/xs.length,z=zs.reduce((a,b)=>a+b,0)/zs.length;
  if(inSouthPond(x,z)){if(ctx.L.heightAt(x,z)!==-1.4)fail('Pond terrain mismatch '+w.id);pondSamples++;}}
 const park=ctx.services.landmarksVictoryPark,mos=ctx.services.landmarksMoskovsky;
 if(park.updates!==0||park.monuments.length<20||mos.entrances.length<2)fail('Missing park/metro services');
 if(ctx.regions.stats.failed||ctx.services.baked.failures.length)fail('Asset/region failure');
 return {revision:ctx.baked.manifest.revision,views:views.length,groundChunks:ground.length,bridgeSamples,pondSamples,car:{before,cross,brake,exited:!d.active},parkMonuments:park.monuments.length,moskovskayaEntrances:mos.entrances.length,regions:ctx.regions.stats,baked:ctx.services.baked,errors:__errors};
})()`;
const r=spawnSync(process.execPath,['tools/shot.mjs','--q','medium','--load','--play','--cams',cameras.join(';'),'--out','shots/south-extension/final-views','--eval',expression,'--evalout','shots/south-extension/integration.json'],{stdio:'inherit'});
process.exit(r.status??1);
