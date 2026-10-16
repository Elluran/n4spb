// Split field assets must preserve original CPU queries/texture storage, decode
// with bounded concurrency, and keep legacy products/failure fallback usable.
import assert from 'node:assert/strict';
import { loadFieldBake, buildField, recordFieldBake } from '../src/world/environment/field.js';
import { encodeBaked, decodeBaked } from '../src/core/baked-codec.js';
const keys=['qP','qH','qT','claim','dtex','clsB'];
const original={x0:0,z0:0,x1:2,z1:2,dg:{x0:0,z0:0,res:1,W:2,H:2},cg:{x0:0,z0:0,res:1,W:2,H:2},noiseData:new Uint8Array(256*256*4)};
for(const [i,key]of keys.entries())original[key]=new Uint8Array(key==='dtex'||key==='clsB'?16:4).fill(i===3?0:(i+1)*20);
const metadata={...original,planes:{}};const products=new Map();
for(const key of keys){delete metadata[key];metadata.planes[key]=`field-${key}`;products.set(`field-${key}`,decodeBaked(encodeBaked(original[key]).buffer));}
products.set('field',metadata);let active=0,peak=0;const released=[];
const ctx={baked:{async load(name){active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,2));active--;return products.get(name);},release(name){released.push(name);}}};
const payload=await loadFieldBake(ctx);assert.equal(peak,2);assert.equal(released.length,7);
for(const key of keys){assert.strictEqual(payload[key],products.get(`field-${key}`));assert.deepEqual(payload[key],original[key]);}
const a=buildField({},new Set(),original),b=buildField({},new Set(),payload);
assert.strictEqual(b.dist.texture.image.data,payload.dtex);assert.strictEqual(b.cls.texture.image.data,b.cls.indices);assert.strictEqual(b.cls.paletteTexture.image.data,b.cls.palette);
assert.deepEqual(b.cls.data,payload.clsB);assert.notStrictEqual(b.cls.data,payload.clsB);assert.notStrictEqual(b.cls.data,b.cls.data);
const raw=buildField({recordBake(){}},new Set(),original);assert.strictEqual(raw.cls.texture.image.data,original.clsB);assert.strictEqual(raw.cls.data,original.clsB);assert.equal(raw.cls.indices,null);
for(const [x,z]of [[.1,.1],[1.8,.2],[.8,1.9],[-3,-3]])for(const query of ['bldDist','roadDist','pathDist','ptDist','hardDist','shore','clsAt','categoryAt','free','clear']){assert.deepEqual(b[query](x,z),a[query](x,z),query);assert.deepEqual(b[query](x,z),raw[query](x,z),'raw '+query);}
assert.strictEqual(await loadFieldBake({baked:{load:async()=>original}}),original);
const snapshots=new Map(),encoder={bakeUploads:[],recordBake(name,value){active++;peak=Math.max(peak,active);snapshots.set(name,decodeBaked(encodeBaked(value).buffer));this.bakeUploads.push(new Promise(r=>setTimeout(()=>{active--;r();},2)));}};
active=0;peak=0;const pending={_bakePayload:original};await recordFieldBake(encoder,pending);
assert.equal(peak,1);assert.equal('_bakePayload' in pending,false);assert.equal(snapshots.size,7);
assert.deepEqual(snapshots.get('field').planes,metadata.planes);
for(const key of keys)assert.deepEqual(snapshots.get(`field-${key}`),original[key]);
products.delete('field-qT');const warn=console.warn;console.warn=()=>{};
try{assert.equal(await loadFieldBake(ctx),null);await assert.rejects(()=>loadFieldBake({...ctx,recordBake(){}}),/field plane/);}finally{console.warn=warn;}
console.log('RESULT: OK (legacy/split masks, exact CPU queries, shared texture arrays, serial snapshots, two-plane decode limit, fallback and staged failure)');
