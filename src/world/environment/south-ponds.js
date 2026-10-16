// Shared pond selection and bounded spatial lookup for the appended districts.
// Rendering, ground holes and player terrain use the same actual OSM rings.
import { WATER, EXTENT_RECTS, RECT_NAMES } from '../data/city.js';
// Keep the established exports for the terrain/river consumers; appended
// island ponds use the same bounded lookup and physical bed as southern ponds.
const rects=EXTENT_RECTS.filter((r,i)=>/^(C\d|MP\d|VP$|MS$|K\d|YE\d|KA\d|AP\d|PE\d)/.test(RECT_NAMES[i]));
export const SOUTH_PONDS=WATER.filter(w => (w.kind==='pond'||/пруд/i.test(w.name||'')) && w.polys?.some(p=>rects.some(r=>p.o[0]>=r.x0&&p.o[0]<=r.x1&&p.o[1]>=r.z0&&p.o[1]<=r.z1)));
export const SOUTH_POND_IDS=new Set(SOUTH_PONDS.map(w=>w.id));
const grid=new Map(),cell=128;
for(const w of SOUTH_PONDS)for(const p of w.polys) {
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for(let i=0;i<p.o.length;i+=2){x0=Math.min(x0,p.o[i]);x1=Math.max(x1,p.o[i]);z0=Math.min(z0,p.o[i+1]);z1=Math.max(z1,p.o[i+1]);}
  for(let x=Math.floor(x0/cell);x<=Math.floor(x1/cell);x++)for(let z=Math.floor(z0/cell);z<=Math.floor(z1/cell);z++) {
    const k=x+','+z;let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(p);
  }
}
function inside(o,x,z){let yes=false;for(let a=0,b=o.length-2;a<o.length;b=a,a+=2)if((o[a+1]>z)!==(o[b+1]>z)&&x<(o[b]-o[a])*(z-o[a+1])/(o[b+1]-o[a+1])+o[a])yes=!yes;return yes;}
export function inSouthPond(x,z){return (grid.get(Math.floor(x/cell)+','+Math.floor(z/cell))||[]).some(p=>inside(p.o,x,z)&&!(p.h||[]).some(h=>inside(h,x,z)));}
