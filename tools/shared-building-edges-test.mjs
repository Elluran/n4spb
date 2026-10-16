// Exact pre-refactor house geometry/classification golden, plus cache identity,
// original query ordering and immutable fields. CPU only; no DOM or GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { BUILDINGS } from '../src/world/data/city.js';
import * as L from '../src/world/layout.js';
import { edgeStartLookup } from '../src/world/lib/edge-start-lookup.js';
const names=['B','C','D','E','G','J','K'];             // the house builders of the strip's landmark modules
const norm=s=>s.replaceAll('\r','');
const kits=await Promise.all(names.map(n=>import(`../src/world/landmarks${n}/kit.js`)));
const houses=await Promise.all(names.map(n=>import(`../src/world/landmarks${n}/house.js`)));
for(const kit of kits)assert.equal(norm(kit.ringEdges.toString()),norm(kits[0].ringEdges.toString()),'identical edge formula');
if(process.argv.includes('--record')){
 const cacheBlocks=names.map(n=>norm(fs.readFileSync(new URL(`../src/world/landmarks${n}/house.js`,import.meta.url),'utf8')).match(/let _edgeCache = null;[\s\S]*?\n};/)[0]);
 for(const s of cacheBlocks)assert.equal(s,cacheBlocks[0],'identical filters/heights/cache construction');
}
const beforeBuildings=createHash('sha256').update(JSON.stringify(BUILDINGS)).digest('hex');
const eligible=BUILDINGS.filter(b=>!b.skip&&!b.dupOf&&(b.minH||0)<=3&&!b.underground);
const recs=eligible.filter(b=>b.cx>-4500&&b.cx<1600&&b.cz>-1000&&b.cz<2200&&b.polys.length&&b.area>200).slice(0,80);
assert.equal(recs.length,80);
const hash=createHash('sha256');let yes=0,no=0;
for(let k=0;k<houses.length;k++){
 const {sharedWall,buildHouse}=houses[k],{ringEdges,Parts}=kits[k];
 const classifications=[];
 for(const rec of recs)for(const poly of rec.polys)for(const e of ringEdges(poly,.05)){
  e.hc=L.heightOf(rec);const mine=new Set([rec.id]);const options=[{}, {neighbours:false}, {tol:4}];
  for(const o of options){const result=sharedWall(e,rec.id,mine,o);classifications.push(result);if(result)yes++;else no++;}
 }
 hash.update(JSON.stringify([names[k],classifications]));
 // Exercise the real wall scaffolding, its spatial transforms, mitred cornice,
 // roof and party classification with a small deterministic facade vocabulary.
 const P=new Parts(),mat=new THREE.MeshBasicMaterial(),mats={granite:mat,roofSilver:mat,cornice:mat,corniceShade:mat,dentil:mat};
 const K={P,mats,ctx:{services:{}},wall:()=>mat,railing:()=>{}};
 const result=buildHouse(K,{recs:recs.slice(0,6),hc:21,wall:'#ddd',collide:false,railing:false,
  front:(e,{len,hc})=>{P.box(mat,0,len,0,hc,0,.09,'kb');return true;}});
 hash.update(JSON.stringify(result.edges.map(e=>[e.rec.id,e.a,e.b,e.hc,e.party,e.noBand,e.noPlinth])));
 for(const b of P.b.values())for(const a of [new Float32Array(b.pos),new Float32Array(b.nrm),new Float32Array(b.uv),b.n>65535?new Uint32Array(b.idx):new Uint16Array(b.idx)])hash.update(new Uint8Array(a.buffer));
}
assert(yes>0&&no>0,'fixtures exercise visible and fully touching party walls');
assert.equal(createHash('sha256').update(JSON.stringify(BUILDINGS)).digest('hex'),beforeBuildings,'source fields unchanged');
const digest=hash.digest('hex');
// RE-RECORDED for the Nevsky strip (the data holds only the eight regions and the golden covers the seven house builders of the kept landmark modules; the full-city golden was 62bd44ac...)
const EXPECTED='baf7ac27e4c8681a990aeeb936eed5b9b3fdc73532ce51fb616c081b2c5cb937';
if(!process.argv.includes('--record')){
 assert.equal(digest,EXPECTED,'exact pre-change geometry/classification golden');
 const {buildingEdgesAt}=await import('../src/world/lib/building-edges.js');
 for(const name of names){const src=norm(fs.readFileSync(new URL(`../src/world/landmarks${name}/house.js`,import.meta.url),'utf8'));assert(src.includes("import { buildingEdgesAt as allEdges } from '../lib/building-edges.js';"));assert(!src.includes('_edgeCache'));}
 let count=0;const ref=[];
 for(const b of eligible)for(const p of b.polys)for(const e of kits[0].ringEdges(p,.3)){ref.push({id:b.id,parent:b.parent,h:L.heightOf(b),e});count++;}
 const old=edgeStartLookup(ref);
 for(const b of recs){const x=b.cx,z=b.cz,a=buildingEdgesAt(x,z),again=buildingEdgesAt(x,z);assert.deepEqual(a,old(x,z),'same query order/fields/heights');assert.equal(a.length,again.length);for(let i=0;i<a.length;i++){assert.equal(a[i],again[i],'one shared record identity');assert(Object.isFrozen(a[i])&&Object.isFrozen(a[i].e)&&Object.isFrozen(a[i].e.a)&&Object.isFrozen(a[i].e.b)&&Object.isFrozen(a[i].e.n));}}
 const found=buildingEdgesAt(recs[0].cx,recs[0].cz)[0];assert(found);assert.throws(()=>{found.h=0;},TypeError);assert.throws(()=>{found.e.n[0]=0;},TypeError);
 console.log(JSON.stringify({digest,modules:names.length,edges:count,partyTrue:yes,partyFalse:no}));
}else console.log(JSON.stringify({digest,modules:names.length,partyTrue:yes,partyFalse:no}));
