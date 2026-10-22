// SOURCE: 102_3d_piter src/world/landmarksTauride/paradny-surface.js, commit 0568f7af, copied verbatim (T1 of docs/TAURIDE-REMAKE.md; only this provenance line is new).
// Courtyard deck boundary inferred from OSM building edges, access stairs and
// reference photographs. The 3.3m height follows the mapped 21-22-step approaches.
import { STEPS, WATER } from '../data/city.js';
export const PARADNY_Y = 3.3;
export const PARADNY_PODIUM = {o:[744,-884,741,-970,777,-995,777,-1095,839,-1095,840,-1137,978,-1137,983,-1205,1055,-1203,1041,-905,974,-898,965,-881,900,-873,820,-875],h:[]};
export function inParadny(x,z){let c=false;const r=PARADNY_PODIUM.o;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2)if((r[i+1]>z)!==(r[j+1]>z)&&x<(r[j]-r[i])*(z-r[i+1])/(r[j+1]-r[i+1])+r[i])c=!c;return c;}
const ids=['w1266791536','w1266791538','w1303266326','w1266791542','w1266791545','w1266791548','w1266791551','w1266791557','w1266791560'];
export const PARADNY_STAIRS=STEPS.filter(s=>ids.includes(s.id)&&s.id!=='w1303266326').map(s=>({...s,pts:s.id==='w1266791538'?[...s.pts,...STEPS.find(t=>t.id==='w1303266326').pts.slice(2)]:s.pts,w:1.8}));
export const PARADNY_FLIGHTS=[],PARADNY_LANDINGS=[];
for(const s of PARADNY_STAIRS){const pts=Array.from({length:s.pts.length/2},(_,i)=>s.pts.slice(i*2,i*2+2)),lens=pts.slice(1).map((p,i)=>Math.hypot(p[0]-pts[i][0],p[1]-pts[i][1])),total=lens.reduce((a,b)=>a+b,0);let along=0;
 for(let i=0;i<lens.length;i++){const a=pts[i],b=pts[i+1],len=lens[i],dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,lo=i?.9:0,hi=.9;
  PARADNY_FLIGHTS.push({id:s.id,w:s.w,pts:[a[0]+dx*lo,a[1]+dz*lo,b[0]-dx*hi,b[1]-dz*hi],start:PARADNY_Y*along/total,end:PARADNY_Y*(along+len)/total});along+=len;
  PARADNY_LANDINGS.push({x:b[0],z:b[1],y:PARADNY_Y*along/total,w:1.82});
 }
}
export const PARADNY_FOUNTAINS=WATER.filter(p=>['w1501496505','w1501496506'].includes(p.id));
// Start-up performance: layout.heightAt calls this for every point of the whole map, so one bounding box of the podium + stairs rejects almost every call before any
// polygon / segment work; the flight lengths are computed once (the same expressions, the same values as before).
for(const r of PARADNY_FLIGHTS){const pts=r.pts;let total=0;for(let i=0;i+3<pts.length;i+=2)total+=Math.hypot(pts[i+2]-pts[i],pts[i+3]-pts[i+1]);r.total=total;}
const PBOX=(()=>{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;const add=(x,z,m)=>{x0=Math.min(x0,x-m);x1=Math.max(x1,x+m);z0=Math.min(z0,z-m);z1=Math.max(z1,z+m);};
 const o=PARADNY_PODIUM.o;for(let i=0;i<o.length;i+=2)add(o[i],o[i+1],0);
 for(const p of PARADNY_LANDINGS)add(p.x,p.z,p.w/2+.01);
 for(const r of PARADNY_FLIGHTS)for(let i=0;i<r.pts.length;i+=2)add(r.pts[i],r.pts[i+1],r.w/2+.01);
 return[x0,x1,z0,z1];})();
export function paradnyDeckY(x,z){
 if(x<PBOX[0]||x>PBOX[1]||z<PBOX[2]||z>PBOX[3])return null;
 for(const p of PARADNY_LANDINGS)if(Math.abs(x-p.x)<=p.w/2&&Math.abs(z-p.z)<=p.w/2)return p.y+.015;
 for(const r of PARADNY_FLIGHTS){
  const pts=r.pts,total=r.total;
  let along=0;
  for(let i=0;i+3<pts.length;i+=2){const dx=pts[i+2]-pts[i],dz=pts[i+3]-pts[i+1],len=Math.hypot(dx,dz),u=((x-pts[i])*dx+(z-pts[i+1])*dz)/len,v=Math.abs((x-pts[i])*dz-(z-pts[i+1])*dx)/len;
   if(u>=0&&u<=len&&v<=r.w/2)return r.start+(r.end-r.start)*(along+u)/total;along+=len;
  }
 }
 return inParadny(x,z)?PARADNY_Y:null;
}
