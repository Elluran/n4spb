// Full normal-loader island integration: screenshot the old and new skyline,
// exercise destination streaming, bridge supports, pond beds and car controls.
// --source is an explicitly labelled generator diagnostic before the final bake.
import { spawnSync } from 'node:child_process';
import * as L from '../src/world/layout.js';
const source=process.argv.includes('--source'),checksOnly=process.argv.includes('--checks-only'),outIndex=process.argv.indexOf('--out'),prefix=outIndex>=0?process.argv[outIndex+1]:'shots/islands-2026/'+(source?'source':checksOnly?'final-checks':'final');
const keys=['Place.petro-red-banner','Place.petro-sytny','Place.petro-printworks','Place.krestovsky-arena','Place.krestovsky-metro'];
const views=L.VIEWS.filter(v=>keys.includes(v.key));
const cameras=views.map(v=>[v.x,1.7,v.z,v.yaw,v.pitch].join(',')).concat([
 '-7080,150,-4230,38,-23', // arena roof, park, both Nevkas and Gulf context
 '-6441.8,1.7,-4456.8,85,2', // mapped Central Avenue toward stadium
 '-6441.8,1.7,-4456.8,-95,2', // reverse turn into old city skyline
 '-3950,8,-3820,136,8', // Bolshoy Krestovsky bridge / both banks
 '-4330,8,-3650,160,8', // Lazarevsky bridge approach
 '-5556.73,1.7,8.85,119.67,12', // Erarta front
 '-5569.95,1.7,16.96,119.67,0', // recessed Potenza sculpture disc
 '-5584.127,1.7,-4.892,72.102,25.936', // clear north apron/festoon/sills
 '-3190,2.4,-3300,-16,10', // car-eye historic factory road
 '-4930,2.4,-4550,85,3', // residential Krestovsky road
 [L.HERO.x,1.7,L.HERO.z,L.HERO.yaw,L.HERO.pitch].join(','),
 '-2530,20,-1180,140,3', // old centre/Spit distant turn
]);
// October 14 additions must remain visible in the same integrated renderer.
// Opt in so older source snapshots can still run the original route unchanged.
const newAreas = process.argv.includes('--new-areas');
if (newAreas) cameras.push(
 '-2964,1.7,-5040,39.7,10', // Oldenburg dacha from its sphinx pier
 '-2964,1.7,-5040,-140.3,4', // reverse river/skyline turn
 '-4631.9,1.7,-5358,-175.7,8', // Yelagin kitchen north wall
 '-4814.7,1.7,-5257.2,4.6,8', // stable colonnade
 '-1778,1.7,-4394,-60,10', // LETI street frontage
 '-1450,1.7,-4915.7,90,27', // TV tower silhouette
);
const expression=`(async()=>{
 const ctx=__ctx,fail=m=>{throw Error(m)};
 if(!${source}&&!ctx.baked)fail('Normal final shipping bake not selected');
 if(__errors.length)fail('Module failures '+JSON.stringify(__errors));
 if(${newAreas})for(const key of ['landmarksKamennyDachasEast','landmarksYelaginServices','landmarksLETI','landmarksTVTower']){
  const s=ctx.services[key];if(!s?.monuments?.length||!s.triangles)fail('Missing new area '+key);
 }
 const views=ctx.L.VIEWS.filter(v=>${JSON.stringify(keys)}.includes(v.key));
 for(const v of views){await ctx.regions.ensureAt(v.x,v.z);if(!ctx.regions.readyAt(v.x,v.z))fail('Destination not ready '+v.key);}
 const k=ctx.services.landmarksKrestovsky,p=ctx.services.landmarksPetroCompletion;
 if(!k?.stadium||k.stadium.pylonHeight!==110||!k.pavilion||k.updates!==0||!k.park.pathIds.length||!k.benches.length)fail('Missing Krestovsky sight services '+JSON.stringify(k));
 for(let i=0;i<32;i++){const a=i*Math.PI/16,x=k.stadium.x+k.stadium.rx*.86*Math.cos(a),z=k.stadium.z+k.stadium.rz*.86*Math.sin(a),y=ctx.physics.groundHeight(x,z,1.3,false);if(Math.abs(y-1.15)>.015)fail('Unsupported stadium plinth at '+i+' '+y);}
 if(p?.houses?.length<3||!p.parts.power||!p.parts.market||!p.parts.printworks)fail('Missing Petrogradsky sights');
 const {BKREST,LAZAREV}=await import('./src/world/bridges/long.js');let bridgeSamples=0;
 for(const b of [BKREST,LAZAREV]){const a=b.b*Math.PI/180,tx=Math.sin(a),tz=-Math.cos(a);
  // Long bridge frames start on a bank (u=0..len), unlike small bridge centres.
  for(let u=1;u<=b.len-1;u+=1){const x=b.cx+tx*u,z=b.cz+tz*u,y=ctx.services.bridges.deckY(x,z);if(y==null)fail('Missing bridge deck '+b.id+' '+u);const floor=ctx.physics.groundHeight(x,z,y+.12,false);if(floor<-.1||Math.abs(y-floor)>.3)fail('Unsupported bridge '+b.id+' '+u+' '+floor+'/'+y);bridgeSamples++;}}
 const {SOUTH_PONDS,inSouthPond}=await import('./src/world/environment/south-ponds.js');let pondSamples=0;
 const pondIds=new Set(['w115118603','w190383519','r1238875','r7627373','w178028627','w178028630']);
 for(const w of SOUTH_PONDS)for(const poly of w.polys){if(!pondIds.has(w.id))continue;const xs=poly.o.filter((_,i)=>i%2===0),zs=poly.o.filter((_,i)=>i%2);let found=false;
  for(let x=Math.min(...xs)+1;x<Math.max(...xs)&&!found;x+=8)for(let z=Math.min(...zs)+1;z<Math.max(...zs)&&!found;z+=8){if(!inSouthPond(x,z))continue;if(ctx.L.heightAt(x,z)!==-1.4)fail('Pond bed mismatch '+w.id);pondSamples++;found=true;}}
 if(pondSamples<6)fail('Mapped park ponds absent');
 const d=ctx.drive;await ctx.regions.ensureAt(-3985.1318,-1247.7003);d.enter();d.place(-3985.1318,-1247.7003,120.1705);
 const before={x:d.car.x,z:d.car.z},drive=d.sim(4,{thr:1});if(Math.hypot(drive.x-before.x,drive.z-before.z)<15)fail('Island car did not accelerate');
 let brake=d.sim(0),steps=0;while(Math.abs(brake.speed)>1&&steps++<600)brake=d.sim(1/60,{brk:1});if(Math.abs(brake.speed)>1)fail('Island car did not brake');d.exit();if(d.active||ctx.playerObj.inputLock)fail('Island car exit locked walking');
 if(ctx.regions.stats.failed||ctx.services.baked?.failures?.length)fail('Asset/region failures');
 return {sourceDiagnostic:${source},revision:ctx.baked?.manifest.revision,views:views.length,bridgeSamples,pondSamples,krestovsky:{stadium:k.stadium,pavilion:k.pavilion,park:k.park,benches:k.benches.length,triangles:k.triangles},petro:p.parts,car:{before,drive,brake,exited:!d.active},regions:ctx.regions.stats,errors:__errors};
})()`;
const result=spawnSync(process.execPath,['tools/shot.mjs','--q','medium','--load','--play','--load-timeout','1200000','--protocol-timeout','1200000',...(source?['--browser-heap','12288']:[]),'--cams',(checksOnly?['hero']:cameras).join(';'),'--out',prefix+'-views','--eval',expression,'--evalout',prefix+'-integration.json'],{stdio:'inherit'});
process.exit(result.status??1);
