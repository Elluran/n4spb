// Regression for the 4.7 km green horizon curtain crossing Moskovsky Prospekt.
// Audit complete emitted chords after jitter, rather than only ring vertices.
import assert from 'node:assert/strict';
import {EXTENT_RECTS,RECT_NAMES} from '../src/world/data/city.js';
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
const pose={x:-1783.8,z:4324},legacy=points(EXTENT_RECTS.filter((r,i)=>/^(P|V)\d+$/.test(RECT_NAMES[i])));
const oldGap=Math.min(...legacy.slice(1).map((p,i)=>pointSegment(pose,legacy[i],p)));
assert.ok(oldGap<10,'Fixture must reproduce the reported wall: '+oldGap);
const current=points(EXTENT_RECTS),newGap=Math.min(...current.slice(1).map((p,i)=>pointSegment(pose,current[i],p)));
assert.ok(newGap>2000,'Reported pose remains near horizon: '+newGap);
console.log(JSON.stringify({legacyWallGap:oldGap,reportedPoseGap:newGap,coverage:audit(EXTENT_RECTS),future:audit([...EXTENT_RECTS,{x0:-2470,x1:-530,z0:19000,z1:21900}])}));
console.log('RESULT: OK (full chord/triangle projections, all coverage, reported wall pose, jitter, wraparound, distant future extension)');
