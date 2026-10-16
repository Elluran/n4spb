// Geographic invariants of the integrated island frame; no renderer required.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as D from '../src/world/data/city.js';
import { PLAY_RECTS, distToBoundary, pointInPoly } from './osm-lib.mjs';
import * as L from '../src/world/layout.js';
import { KRESTOVSKY_ISLAND as ring } from '../src/world/environment/krestovsky-context.js';
import { inSouthPond, SOUTH_PONDS } from '../src/world/environment/south-ponds.js';
function inside(o,x,z){let yes=false;for(let i=0,j=o.length-2;i<o.length;j=i,i+=2)if((o[i+1]>z)!==(o[j+1]>z)&&x<(o[j]-o[i])*(z-o[i+1])/(o[j+1]-o[i+1])+o[i])yes=!yes;return yes;}
let shoreSamples=0,landSamples=0,pondSamples=0;
for(let i=0,j=ring.length-2;i<ring.length;j=i,i+=2){
 const len=Math.hypot(ring[i]-ring[j],ring[i+1]-ring[j+1]),n=Math.max(1,Math.ceil(len/5));
 for(let k=0;k<=n;k++){const x=ring[j]+(ring[i]-ring[j])*k/n,z=ring[j+1]+(ring[i+1]-ring[j+1])*k/n;assert(L.inPlay(x,z),`Island shoreline outside play at ${x},${z}`);shoreSamples++;}
}
const fail=[];
for(let x=-7880;x<-3820;x+=35)for(let z=-5160;z<-3670;z+=35){
 if(![[0,0],[6,0],[-6,0],[0,6],[0,-6]].every(([dx,dz])=>inside(ring,x+dx,z+dz)))continue;
 assert(L.inPlay(x,z),`Island interior outside play at ${x},${z}`);
 if(L.inRiver(x,z))fail.push([x,z]);landSamples++;
}
assert.equal(fail.length,0,`River/Gulf floods island interior: ${JSON.stringify(fail.slice(0,12))}`);
for(const w of SOUTH_PONDS)for(const p of w.polys){
 if(!p.o.some((v,i)=>i%2===0&&inside(ring,v,p.o[i+1])))continue;
 const xs=p.o.filter((_,i)=>i%2===0),zs=p.o.filter((_,i)=>i%2);let found=false;
 for(let x=Math.min(...xs)+1;x<Math.max(...xs)&&!found;x+=4)for(let z=Math.min(...zs)+1;z<Math.max(...zs)&&!found;z+=4){
  if(!inside(p.o,x,z)||(p.h||[]).some(h=>inside(h,x,z)))continue;
  assert(inSouthPond(x,z),`Pond lookup misses ${w.id}`);assert.equal(L.heightAt(x,z),-1.4,`Pond terrain ${w.id}`);pondSamples++;found=true;
 }
}
assert(pondSamples>=6,'Krestovsky park ponds missing');
for(const id of ['r8841754','r8846006','w44389559'])assert(L.claimedBy(id)==='landmarksKrestovsky',`Unclaimed stadium/pavilion ${id}`);
for(const v of L.VIEWS.filter(v=>/^Place\.(krestovsky|petro-red|petro-sytny|petro-print)/.test(v.key))){assert(L.inPlay(v.x,v.z),v.key);assert(!L.inRiver(v.x,v.z),`Wet viewpoint ${v.key}`);assert(!L.insideBuilding(v.x,v.z,.8),`Blocked viewpoint ${v.key}`);}
assert.equal(new Set(D.RECT_NAMES).size,D.RECT_NAMES.length,'Duplicate map regions');
for(const [x,z] of [[-4870,-3725],[-4912,-4098]])assert(L.areaAt(x,z).includes('Крестовский остров'),`Old district fallback misnames eastern Krestovsky at ${x},${z}`);
// ---- islands round 2 (2026-10-13): Yelagin, Kamenny, Aptekarsky, Petrovsky, Serny, Bychy and the two islets of the Krestovsky shore, from docs/reference/islands2-island-polys.json:
// every shore sample (every 5 m) lies inside the play area with >= 69 m of play ground / water beyond it, and no dry interior sample (35 m grid, 12 m clear of the shore) is river / Gulf water.
const polys2 = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/reference/islands2-island-polys.json', import.meta.url)), 'utf8'));
const report2 = {};
for (const key of ['yelagin', 'kamenny', 'aptekarsky', 'petrovsky', 'serny', 'bychy', 'islet-22870264', 'islet-22870327']) {
  const P = polys2[key][0], o = P.o; let shore = 0, dry = 0, minM = Infinity, wet = [];
  for (let i = 0; i < o.length - 1; i++) {
    const [ax, az] = o[i], [bx, bz] = o[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 5));
    for (let k = 0; k <= n; k++) { const x = ax + (bx - ax) * k / n, z = az + (bz - az) * k / n; assert(L.inPlay(x, z), key + ' shoreline outside play at ' + x + ',' + z); minM = Math.min(minM, distToBoundary(PLAY_RECTS, x, z)); shore++; }
  }
  assert(minM >= 69, key + ' shore margin ' + minM + ' m < 69');
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of o) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
  const step = key.startsWith('islet') || key === 'serny' ? 8 : 35;
  for (let x = x0; x <= x1; x += step) for (let z = z0; z <= z1; z += step) {
    if (!pointInPoly([x, z], P)) continue;
    if (![[12, 0], [-12, 0], [0, 12], [0, -12]].every(([dx, dz]) => pointInPoly([x + dx, z + dz], P))) continue;
    assert(L.inPlay(x, z), key + ' interior outside play at ' + x + ',' + z);
    if (L.inRiver(x, z)) wet.push([Math.round(x), Math.round(z)]); dry++;
  }
  assert.equal(wet.length, 0, key + ' river / Gulf water floods the island interior: ' + JSON.stringify(wet.slice(0, 12)));
  report2[key] = { shore, dry, minM: Math.round(minM) };
}
console.log('islands round 2:', JSON.stringify(report2));
console.log(`RESULT: OK (${shoreSamples} shore, ${landSamples} dry island interior, ${pondSamples} park pond samples; exact claims and viewpoints)`);
