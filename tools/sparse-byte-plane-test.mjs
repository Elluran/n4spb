// Lossless private masks: odd dimensions/edge tiles, every byte, Uint8 writes,
// bounded copy-on-write spill and input collection. --shipping proves all four
// shipped masks and samples the final mutation state without a GPU.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { decodeBaked } from '../src/core/baked-codec.js';
import { SparseBytePlane, bytePlane } from '../src/world/environment/sparse-byte-plane.js';
import { buildField } from '../src/world/environment/field.js';

const W=77,H=69,raw=new Uint8Array(W*H).fill(255);
for(let y=0;y<24;y++)for(let x=0;x<19;x++)raw[y*W+x]=(x*17+y*29)&255;
raw[raw.length-1]=4;
const inputCopy=raw.slice();
for(const size of [32,64]){
 const reference=raw.slice(),plane=new SparseBytePlane(raw,W,H,size);
 assert.deepEqual(plane.toUint8Array(),raw);assert.equal(plane.descriptors.length,Math.ceil(W/size)*Math.ceil(H/size));
 const k=33*W+35;
 for(const v of [255,-1,-257,256,511.999,-.7,-255.9,NaN,Infinity,-Infinity,1e100,undefined,null,'257',true,false]){reference[k]=v;plane.set(k,v);assert.equal(plane.get(k),reference[k]);}
 assert.throws(()=>plane.set(k,1n),TypeError);assert.throws(()=>{reference[k]=1n},TypeError);
 const count=plane.spillTiles.length;
 for(let i=0;i<10000;i++){reference[k]=i;plane.set(k,i);}
 assert.equal(plane.spillTiles.length,count);
 for(const i of [-1,raw.length,.5,Infinity,NaN]){assert.equal(plane.get(i),reference[i]);plane.set(i,1);reference[i]=1;}
 for(let i=0;i<reference.length;i+=13){plane.set(i,i*3.7);reference[i]=i*3.7;}
 assert.ok(plane.spillTiles.length<=plane.maxSpillTiles);assert.deepEqual(plane.toUint8Array(),reference);assert.deepEqual(raw,inputCopy);
}
const passthrough=bytePlane(raw,W,H,true);assert.strictEqual(passthrough.toUint8Array(),raw);

function payload(W,H){const n=W*H;return {x0:-20,z0:30,x1:W-20,z1:H+30,dg:{W,H,res:1},cg:{W,H,res:1},qP:new Uint8Array(n).fill(255),qH:new Uint8Array(n).fill(255),qT:new Uint8Array(n).fill(255),claim:new Uint8Array(n),dtex:new Uint8Array(n*4).fill(255),clsB:new Uint8Array(n*4).fill(20),noiseData:new Uint8Array(256*256*4)};}
const source=payload(77,69);for(const key of ['qP','qH','qT','claim'])for(let i=3;i<source[key].length;i+=31)source[key][i]=i&255;
const baseline={...source};for(const key of ['qP','qH','qT','claim'])baseline[key]=source[key].slice();
const originalMasks=Object.fromEntries(['qP','qH','qT','claim'].map(k=>[k,source[k].slice()]));
const old=buildField({recordBake(){}},new Set(),baseline),compact=buildField({},new Set(),source);
const methods=['pathDist','ptDist','hardOnlyDist','hardDist','claimed','free','clear','bldDist','roadDist','shore','paveDist','clsAt','categoryAt'];
for(const [x,z,r]of [[-20,30,3],[-20.4,29.6,2.7],[56.9,98.9,4],[-2.2,64.7,3.4],[16,62,2],[12,61,7]]){
 old.addBlock(x,z,r);compact.addBlock(x,z,r);
 for(let j=-3;j<73;j++)for(let i=-3;i<81;i++)for(const key of methods)assert.deepEqual(compact[key](-20+i+.17,30+j+.31),old[key](-20+i+.17,30+j+.31),`${key} after ${x},${z},${r}`);
}
for(const key of ['qP','qH','qT','claim'])assert.deepEqual(source[key],originalMasks[key],'normal hydration/addBlock mutated input '+key);
console.log('fixture: odd32/64edge tiles; exact Uint8 writes; repeated bounded spills; fractional/outside addBlock and every field query pass');

if(process.argv.includes('--shipping')){
 const dir=new URL('../assets/baked/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 const read=name=>{const b=gunzipSync(fs.readFileSync(new URL(manifest.files[name],dir)));return decodeBaked(b.byteOffset===0&&b.byteLength===b.buffer.byteLength?b.buffer:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
 const meta=read('field');let total=0,saved=0;
 for(const key of ['qP','qH','qT','claim']){
  const raw=meta.planes?read(meta.planes[key]):meta[key],t=Date.now(),p=new SparseBytePlane(raw,meta.dg.W,meta.dg.H);
  for(let i=0;i<raw.length;i++)if(p.get(i)!==raw[i])throw Error(`${key} byte mismatch ${i}`);
  total+=p.byteLength;saved+=raw.byteLength-p.byteLength;
  console.log(JSON.stringify({key,rawBytes:raw.byteLength,packedBytes:p.byteLength,uniform:p.uniformTiles,mixed:p.descriptors.length-p.uniformTiles,ms:Date.now()-t}));
 }
 console.log(JSON.stringify({totalPackedBytes:total,savedBytes:saved}));
}
if(global.gc){
 const live=(()=>{const input=payload(512,513),weak=['qP','qH','qT','claim'].map(k=>new WeakRef(input[k]));return {field:buildField({},new Set(),input),weak};})();
 for(let i=0;i<5;i++){await new Promise(setImmediate);global.gc();}
 for(const w of live.weak)assert.equal(w.deref(),undefined,'field closure retained source mask');
 live.field.addBlock(-19.3,30.4,3);assert.equal(live.field.ptDist(-19.3,30.4),0);
 console.log('retention: all four original CPU masks collected while complete field/addBlock callbacks remain live');
}
console.log('RESULT: OK (lossless masks, exact clipping/write/query/mutation, bounded spills, untouched input and legacy raw alias)');
