// Regression: opposing Liteyny carriageways must share one median pavement.
import assert from 'node:assert/strict';
import {PavingCoverage} from '../src/world/streets/paving.js';
import {buildNet} from '../src/world/streets/net.js';
import {buildWalks} from '../src/world/streets/walks.js';
import {MB} from '../src/world/streets/util.js';
const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2);
const c=new PavingCoverage();
assert.equal(c.take([[0,0],[4,0],[4,4],[0,4]]).reduce((n,p)=>n+area(p),0),16);
assert.equal(c.take([[2,-1],[6,-1],[6,3],[2,3]]).reduce((n,p)=>n+area(p),0),10);
assert.equal(c.take([[1,1],[2,1],[2,2],[1,2]]).length,0);
const meshes=Object.fromEntries(['slab','strip','paver','ramp','skirt','paint'].map(k=>[k,new MB(true)]));
const net=buildNet();
buildWalks(net,meshes);
// pavement faces (slab / strip / paver) covering the point (x,z)
const owners=(x,z)=>{let count=0;
  for(const k of ['slab','strip','paver']){const b=meshes[k];
    for(let i=0;i<b.idx.length;i+=3){const p=b.idx.slice(i,i+3).map(j=>[b.pos[j*3],b.pos[j*3+2]]);
      if(x<Math.min(p[0][0],p[1][0],p[2][0])||x>Math.max(p[0][0],p[1][0],p[2][0])||z<Math.min(p[0][1],p[1][1],p[2][1])||z>Math.max(p[0][1],p[1][1],p[2][1]))continue;
      const cross=p.map((a,j)=>{const q=p[(j+1)%3];return(q[0]-a[0])*(z-a[1])-(q[1]-a[1])*(x-a[0]);});
      if(cross.every(v=>v>1e-7)||cross.every(v=>v< -1e-7))count++;
    }
  }
  return count;};
// The three points once reported as double pavement. Since the paired Liteyny carriageways were merged (road cleanup, 2026-10-05) they lie
// INSIDE the asphalt of the merged carriageway (net.cover > 1 m), so the truth is: no pavement face at all (asphalt owns the point), never two.
for(const [x,z]of[[-186.95,-214.4],[-186.9,-209.9],[-182.4,-206.2]]){
  const count=owners(x,z),cover=net.cover(x,z,{});
  assert.ok(count<=1,`pavement overlap at ${x},${z}: ${count} faces`);
  assert.ok(count===1||cover>1,`neither pavement nor asphalt at ${x},${z} (${count} faces, asphalt margin ${cover.toFixed(2)})`);
  assert.ok(count===0||cover<0.3,`pavement drawn on asphalt at ${x},${z} (asphalt margin ${cover.toFixed(2)})`);
}
// Generalised: on a grid around the Liteyny median (the whole merged-carriageway area) no point has two pavement faces and no pavement lies deep inside the asphalt.
let pts=0,double=[],onAsphalt=[];
for(let x=-200;x<=-170;x+=1.5)for(let z=-232;z<=-196;z+=1.5){pts++;const n=owners(x,z);if(n>1)double.push([x,z,n]);if(n>=1&&net.cover(x,z,{})>0.5)onAsphalt.push([x,z]);}
assert.equal(double.length,0,`double pavement at ${JSON.stringify(double.slice(0,5))}`);
assert.equal(onAsphalt.length,0,`pavement faces inside the asphalt at ${JSON.stringify(onAsphalt.slice(0,5))}`);
console.log(`PASS: convex subtraction preserves uncovered area; the three reported Liteyny points are asphalt (merged carriageways) without any pavement face; ${pts} grid points around them have no double pavement.`);
