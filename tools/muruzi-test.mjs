// Full-scene GPU render plus ownership, finite geometry and wall containment.
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
async function verify(){
  const L=await import('./src/world/layout.js'),ctx=__ctx;
  if(__errors.length)throw Error(JSON.stringify(__errors));
  if(L.groupOf('r946930')!=='north-muruzi')throw Error('Missing claim');
  if(ctx.services.muruzi?.storeys!==5)throw Error('Missing specialist');
  if(ctx.services.city.walls.some(w=>w.id.startsWith('r946930:')))throw Error('Generic duplicate');
  const b=L.groupMembers('north-muruzi')[0];
  if(b.polys[0].h.length!==1)throw Error('Courtyard footprint lost');
  let count=0;
  ctx.staticRoot.traverse(o=>{
    if(!o.isMesh)return;const p=o.geometry.attributes.position;
    for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))throw Error('Non-finite geometry');
    count++;
  });
  const foot={x:-138.4,z:-1110}; ctx.physics.resolve(foot,.35,0,1.7);
  if(!Number.isFinite(foot.x)||!Number.isFinite(foot.z)||Math.hypot(foot.x+138.4,foot.z+1110)<.001)throw Error('Missing wall collision');
  if(!ctx.baked||__regions.stats.loaded!==__regions.stats.total)throw Error('Full cached scene missing');
  return{passed:true,model:ctx.services.muruzi,meshes:count,regions:__regions.stats};
}
const result=spawnSync(process.execPath,['tools/shot.mjs','--base','/102_3d_piter','--cams','-154,-1170,-137,22;-174,28,-1190,-136,-12;-167,10,-1123,-90,3','--out',path.join(tmpdir(),'piter-muruzi-full'),'--eval','('+verify.toString()+')()'],{stdio:'inherit'});
if(result.error)throw result.error;
process.exitCode=result.status??1;
