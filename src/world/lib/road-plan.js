// One immutable asphalt/kerb plan shared by environment placement and streets.
// Environment builds first, so raw centre-line distances cannot account for
// junction fillets, parking pockets or merged carriageways. Reuse the shipping
// kerb payload and retain one network, rather than building a second city cache.
import { buildNet, segInfo } from '../streets/net.js';
import { setDecksEnabled } from '../streets/decks.js';
import { bakedData } from '../../core/baked-world.js';

export async function roadPlan(ctx) {
  if (ctx._roadPlan) return ctx._roadPlan;
  setDecksEnabled(!ctx.buildList || ctx.buildList.includes('bridges'));
  ctx._roadPlan = buildNet(ctx.L, await bakedData(ctx, 'street-kerbs'));
  return ctx._roadPlan;
}

// Use the generated half-widths (including parking), not OSM centre-line
// estimates, to reject narrow strips between opposing carriageways.
export function mergedMedianAt(ctx,x,z) {
  const net=ctx._roadPlan; if(!net)return false;
  const hits=[];
  net.each(x,z,18,(w,i)=>{
    if(w.rank<1 || !w.name || !w.oneway)return;
    const q=segInfo(w,i,x,z),gap=q.c.d-q.h;
    if(gap>=0 && gap<7.5)hits.push({w,q,gap});
  });
  for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++) {
    const a=hits[i],b=hits[j];
    if(a.w===b.w || a.w.name!==b.w.name || a.gap+b.gap>=7.5 || a.q.dx*b.q.dx+a.q.dz*b.q.dz>-.5)continue;
    if((a.q.c.x-x)*(b.q.c.x-x)+(a.q.c.z-z)*(b.q.c.z-z)<0)return true;
  }
  return false;
}
