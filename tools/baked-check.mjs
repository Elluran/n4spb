// Run after npm run bake. Validates runtime hydration against original generators.
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
const expression = `(async()=>{
 const ctx=__ctx, {buildNav}=await import('./src/world/people/nav.js');
 if(!ctx.baked)throw Error('Baked scene was not selected');
 // Drive is built after people and adds its parked-car collider; remove it to
 // compare the same static input set that the navigation bake saw.
 ctx.drive.enter();
 const {DENSITY}=await import('./src/world/people.js');
 const cached=ctx.navBake; ctx.navBake=null;
 const original=buildNav(ctx,DENSITY); ctx.navBake=cached;
 const restored=buildNav(ctx,DENSITY);
 for(const k of Object.keys(original.N)){
   if(original.N[k].length!==restored.N[k].length)throw Error('Node length '+k+' '+JSON.stringify({original:original.stats,restored:restored.stats}));
   for(let i=0;i<original.N[k].length;i++)if(!Object.is(original.N[k][i],restored.N[k][i]))throw Error('Node '+k+' '+i);
 }
 if(original.E.length!==restored.E.length)throw Error('Edge count');
 for(let i=0;i<original.E.length;i++)for(const k of Object.keys(original.E[i]))if(!Object.is(original.E[i][k],restored.E[i][k]))throw Error('Edge '+i+' '+k);
 const ids=original.comp.map((c,i)=>c===original.main?i:-1).filter(i=>i>=0);
 for(let i=1;i<=20;i++){
   const a=ids[Math.floor(ids.length*i/21)],b=ids[Math.floor(ids.length*(21-i)/21)];
   if(JSON.stringify(original.route(a,b))!==JSON.stringify(restored.route(a,b)))throw Error('Route '+i);
 }
 const {buildField,loadFieldBake}=await import('./src/world/environment/field.js');
 const {ownedGroups}=await import('./src/world/lib/claims.js');
 const owned=await ownedGroups(ctx),keys=['bldDist','roadDist','pathDist','hardDist','shore','free','clear','claimed','categoryAt'];
 // Compare the entire expanded box, without keeping two additional multi-GB
 // rasters alive together. The normal scene already owns its mutated field.
 const expected=(()=>{
   const field=buildField(ctx,owned),{x0,z0,x1,z1}=field.box;
   const samples=Array.from({length:1000},(_,i)=>{
     const x=x0+((i*0.61803398875)%1)*(x1-x0),z=z0+((i*0.41421356237)%1)*(z1-z0);
     return {x,z,values:keys.map(k=>field[k](x,z))};
   });
   field.dist.texture.dispose();field.cls.texture.dispose();return samples;
 })();
 const data=await loadFieldBake(ctx);if(!data)throw Error('Field bake unavailable');
 const hydrated=buildField(ctx,owned,data);
 for(let i=0;i<expected.length;i++){
   const s=expected[i];for(let j=0;j<keys.length;j++)if(!Object.is(s.values[j],hydrated[keys[j]](s.x,s.z)))throw Error('Field '+keys[j]+' '+i);
 }
 hydrated.dist.texture.dispose();hydrated.cls.texture.dispose();
 const initial=__regions.stats.initial,total=__regions.stats.total;
 if(initial>=total)throw Error('Initial load included all regions');
 // Teleport to the far end of the strip (Admiralty gate, W2c): well outside the initial 700 m ring around the start, so the streaming is really exercised.
 await __regions.ensureAt(-2387,-565);
 if(!__regions.readyAt(-2387,-565))throw Error('Destination not ready');
 await __regions.ensureAll();
 if(__regions.stats.loaded!==total)throw Error('Incomplete streaming');
 return {nodes:original.N.x.length,edges:original.E.length,routes:20,fieldSamples:1000,initial,total,loaded:__regions.stats.loaded,failures:ctx.services.baked.failures};
})()`;
const quality=process.argv[2]||'medium';
// Explicit source-versus-bake QA retains extra navigation graphs and constructs
// another full raster. This allowance is not used by normal runtime/FPS tests.
const result=spawnSync(process.execPath,['tools/shot.mjs','--load','--q',quality,'--browser-heap','12288','--protocol-timeout','900000','--load-timeout','600000','--out',path.join(tmpdir(),`piter-baked-check-${quality}`),'--eval',expression],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
