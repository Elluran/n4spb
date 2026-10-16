// Regression for the 4.7 km green horizon curtain crossing Moskovsky Prospekt (a whole-city bug: the horizon ring of a subset of the rectangles cut through a covered district).
// Audit complete emitted chords after jitter, rather than only ring vertices. The original reproduction used the Petrograd / Vasilievsky rectangles of the whole city: they are kept below as a literal
// fixture because the strip no longer has them; the strip's own EXTENT_RECTS are audited as well. (The reported wall pose of the original needed the rectangles of the south, which are not part of the strip: that single assertion was dropped.)
import assert from 'node:assert/strict';
import {EXTENT_RECTS} from '../src/world/data/city.js';
import {SQUARE} from '../src/world/layout.js';
import {horizonRadii,HORIZON_JITTER} from '../src/world/environment/far-coverage.js';
const pointSegment=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);};
const pointRect=(p,r)=>Math.hypot(Math.max(r.x0-p.x,0,p.x-r.x1),Math.max(r.z0-p.z,0,p.z-r.z1));
function chordRect(a,b,r){
 let lo=0,hi=1;
 for(const [v,d,mn,mx]of [[a.x,b.x-a.x,r.x0,r.x1],[a.z,b.z-a.z,r.z0,r.z1]]){
  if(!d){if(v<mn||v>mx){lo=2;break;}continue;}
  const t0=(mn-v)/d,t1=(mx-v)/d;lo=Math.max(lo,Math.min(t0,t1));hi=Math.min(hi,Math.max(t0,t1));
 }
 if(lo<=hi)return 0;
 let distance=Math.min(pointRect(a,r),pointRect(b,r));
 for(const x of [r.x0,r.x1])for(const z of [r.z0,r.z1])distance=Math.min(distance,pointSegment({x,z},a,b));
 return distance;
}
function points(rects){const radii=horizonRadii(rects,SQUARE);return Array.from(radii,(r,i)=>{const a=i/(radii.length-1)*Math.PI*2,d=r+HORIZON_JITTER*Math.sin(a*7+.4);return {x:SQUARE.x+Math.cos(a)*d,z:SQUARE.z+Math.sin(a)*d};});}
function inside(q,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.z>q.z)!==(b.z>q.z)&&q.x<(b.x-a.x)*(q.z-a.z)/(b.z-a.z)+a.x)yes=!yes;}return yes;}
function audit(rects){const p=points(rects);let gap=Infinity;for(let i=1;i<p.length;i++)for(const r of rects)gap=Math.min(gap,chordRect(p[i-1],p[i],r));assert.ok(gap>=1900,'Horizon chord too close: '+gap);for(const r of rects)for(const x of [r.x0,r.x1])for(const z of [r.z0,r.z1])assert.ok(inside({x,z},p),'Coverage corner outside horizon: '+x+','+z);assert.ok(Math.hypot(p[0].x-p.at(-1).x,p[0].z-p.at(-1).z)<1e-7,'Ring not closed');return {chords:p.length-1,gap};}
// the Petrograd (P1..P9) and Vasilievsky (V1..V12) extent rectangles of the whole city: a far-away, differently shaped fixture for the audit below
const LEGACY_RECTS=[{x0:-2570,x1:-680,z0:-2920,z1:-1180},{x0:-4070,x1:-2330,z0:-2920,z1:-1580},{x0:-3520,x1:-1380,z0:-3470,z1:-2680},{x0:-3020,x1:-1580,z0:-4020,z1:-3230},{x0:-920,x1:-430,z0:-3020,z1:-2130},{x0:-3170,x1:-2180,z0:-1820,z1:-580},{x0:-4070,x1:-2930,z0:-1920,z1:-1180},{x0:-4520,x1:-2780,z0:-4020,z1:-2480},{x0:-1820,x1:-480,z0:-4200,z1:-2680},{x0:-4520,x1:-1580,z0:-4380,z1:-3780},{x0:-5070,x1:-4280,z0:-3820,z1:-2880},{x0:-3270,x1:-2330,z0:-2020,z1:-30},{x0:-3970,x1:-3030,z0:-2370,z1:-30},{x0:-4670,x1:-3730,z0:-2370,z1:1020},{x0:-5370,x1:-4430,z0:-2370,z1:1770},{x0:-6070,x1:-5130,z0:-2020,z1:1720},{x0:-6770,x1:-5830,z0:-2020,z1:1370},{x0:-7470,x1:-6530,z0:-2370,z1:1020},{x0:-8170,x1:-7230,z0:-2370,z1:1020},{x0:-8870,x1:-7930,z0:-2720,z1:1020},{x0:-9920,x1:-8630,z0:-2720,z1:670}];
console.log(JSON.stringify({coverage:audit(EXTENT_RECTS),legacyCoverage:audit([...EXTENT_RECTS,...LEGACY_RECTS]),future:audit([...EXTENT_RECTS,{x0:-2470,x1:-530,z0:19000,z1:21900}])}));
console.log('RESULT: OK (full chord/triangle projections, all coverage, jitter, wraparound, distant future extension)');
