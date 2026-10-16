// Geometry-equivalence and buffer-lifetime regression for CityMeshes' one-shot flush.
// Defaults to repeated sealing between writes; --unsealed exercises the original one-shot path.
// Before a change: --unsealed --write-baseline <scratch.json>; afterwards: --baseline <scratch.json>.
// The fixed digest was captured before collector release; includes every typed attribute/index,
// bounds, material/layer/shadow/culling flags, mesh order and authored LOD.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import * as THREE from 'three';
import { CityMeshes } from '../src/world/city/meshes.js';
import { wallAttr } from '../src/world/city/wallmat.js';
import { LOD } from '../src/core/lod.js';

const option=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1];};
const ctx={shared:{uNight:{value:0}},mat:{
  gradientMap:new THREE.Texture(),
  toon:(color,o={})=>new THREE.MeshToonMaterial({color,vertexColors:o.vertexColors,map:o.map??null,name:o.name,side:o.side==='double'?THREE.DoubleSide:THREE.FrontSide}),
  foliage:(color,map,o={})=>new THREE.MeshToonMaterial({color,map,name:o.name,alphaTest:.5,side:THREE.DoubleSide}),
},tex:{draw:()=>new THREE.Texture()},noBatch:m=>{m.userData.noBatch=true;},noOutline:m=>{m.layers.set(1);}};
const M=new CityMeshes(),root=new THREE.Group(),colour=new THREE.Color('#bea881');
const repeatedSeal=!process.argv.includes('--unsealed');let automaticSeals=0;
const seal=()=>{
  if(!repeatedSeal)return;
  const builders=Object.values(M.s).flatMap(map=>[...map.values()]);
  const before=builders.map(B=>({n:B.n,tris:B.tris,empty:B.empty,cur:B.cur?.clone()}));
  M.seal();
  builders.forEach((B,i)=>{assert.equal(B.n,before[i].n,'sealing preserves global vertex indices');assert.equal(B.tris,before[i].tris);assert.equal(B.empty,before[i].empty);if(before[i].cur)assert(B.cur.equals(before[i].cur),'current roof colour survives sealing');});
};
const attr=wallAttr({arch:16,floors:4,H:19.25,bw:2.3,N:5,i0:1,seed:.73,flags:65536,bal:3,door:2,pier:1,sdoor:8});
for(const [x,z] of [[15,12],[-345,350],[660,-350]]){
  M.walls(x,z).quad([x,z],[x+12.5,z+.7],.4,19.25,.05,-.998,0,5,0,18.85,attr,colour);
  seal();
  M.core(x,z).box([x,0,z],1,0,0,1,2,1.3,.7,colour);
  seal();
  M.fine(x,z).boxLite([x+.4,2,z],.8,.6,-.6,.8,1,.3,.6,colour);
  seal();
  const R=M.roof(x,z);R.cur.set('#698479');R.tri3([x,20,z],[x+9,20,z],[x+4,21,z+5],[0,0],[4,0],[2,3],[0,1,0]);
  seal();
  const B=M.rails(x,z),a=B.vert(x,1,z,0,0,1,0,0),b=B.vert(x+2,1,z,0,0,1,2,0);
  seal(); // References created before this seal remain usable in indices written afterwards.
  const c=B.vert(x+2,2,z,0,0,1,2,1),d=B.vert(x,2,z,0,0,1,0,1);B.quad(a,b,c,d);
  seal();
}
// Exercise Uint32 indices as well as small Uint16 cells, without city-scale allocation.
const large=M.core(15,12);
for(let i=0;i<17000;i++){
  const x=15+(i%97)*.13,y=Math.floor(i/97)*.003,z=12;
  large.quad([[x,y,z],[x+.05,y,z],[x+.05,y+.1,z],[x,y+.1,z]],[0,0,1],colour);
  if(repeatedSeal&&i%1024===0){
    const before=large.pos.length;assert.equal(M.core(15,12),large,'automatic sealing retains the builder identity');
    if(before>=4096*3){assert.equal(large.pos.length,0);automaticSeals++;}
  }
  if(i%3000===0)seal();
}
assert(large.n>65535);
if(repeatedSeal)assert(automaticSeals>0,'exercise the bounded per-building collector path');
// Empty cells must release their collectors too, without emitting a mesh.
for(const kind of ['walls','core','fine','roof','rails'])M[kind](1300,1300);
const builders=Object.values(M.s).flatMap(map=>[...map.values()]);
const arrays=builders.flatMap(B=>Object.values(B).filter(Array.isArray));
const triangles=M.flush(ctx,root);
assert.equal(triangles,34081);assert.equal(root.children.length,15);
assert.equal(root.children.find(m=>m.name==='city-core').geometry.index.array.constructor,Uint32Array);
const hex=(array)=>crypto.createHash('sha256').update(Buffer.from(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
const records=root.children.map(m=>({name:m.name,
  attributes:Object.fromEntries(Object.entries(m.geometry.attributes).map(([name,a])=>[name,{type:a.array.constructor.name,size:a.itemSize,normalized:a.normalized,count:a.count,hash:hex(a.array)}])),
  index:{type:m.geometry.index.array.constructor.name,count:m.geometry.index.count,hash:hex(m.geometry.index.array)},
  box:[...m.geometry.boundingBox.min.toArray(),...m.geometry.boundingBox.max.toArray()],sphere:[...m.geometry.boundingSphere.center.toArray(),m.geometry.boundingSphere.radius],
  material:{name:m.material.name,type:m.material.type,colour:m.material.color.toArray(),vertexColors:m.material.vertexColors,side:m.material.side,alphaTest:m.material.alphaTest},
  layers:m.layers.mask,cast:m.castShadow,receive:m.receiveShadow,culled:m.frustumCulled,noBatch:m.userData.noBatch,
  lod:LOD.of(m)?{cx:LOD.of(m).cx,cz:LOD.of(m).cz,r:LOD.of(m).r,far:LOD.of(m).far}:null,
}));
const result={triangles,records},digest=crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
if(option('--write-baseline')){fs.writeFileSync(option('--write-baseline'),JSON.stringify(result));console.log('BASELINE',digest);}
else{
  if(option('--baseline'))assert.deepEqual(result,JSON.parse(fs.readFileSync(option('--baseline'),'utf8')));
  assert.equal(digest,'ce087e720416400c9ff9648fb974ced60622e5acf5eef58649fbbf2590c2f2e8','pre-release geometry/material/LOD digest must remain exact');
  // Releasing the original arrays is necessary even when a caller still retains its builder reference.
  assert(arrays.every(a=>a.length===0),'all consumed ordinary-number arrays must release their backing stores');
  assert(Object.values(M.s).every(map=>map.size===0),'all stream maps must release consumed and empty builders');
  // Typed geometry remains intact after its source arrays are cleared.
  assert.equal(root.children[0].geometry.attributes.aA.count,4);
  assert.equal(M.flush(ctx,root),0,'a consumed flush cannot duplicate its prior geometry');
  assert.equal(root.children.length,15);
  console.log(`RESULT: OK (${repeatedSeal?'repeated seals':'unsealed'}; all five streams, global indices, typed attributes, Uint16/Uint32, bounds, flags, LOD, released buffers)`);
  console.log('DIGEST',digest);
}
