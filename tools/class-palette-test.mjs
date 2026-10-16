// Exact class bytes/CPU interpolation plus independent GLSL nearest+palette
// bilinear emulation. No GPU. --shipping also checks every current baked pixel
// and 20,000 samples across its complete, unchanged 1 m grid.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as THREE from 'three';
import { decodeBaked } from '../src/core/baked-codec.js';
import { compactClassRGBA, expandClassRGBA, classSampler, classLayer, CLASS_PALETTE_GLSL } from '../src/world/environment/class-palette.js';

function reference(rgba, W, H, res, x0, z0, x, z) {
 const fu=(x-x0)/res-.5,fv=(z-z0)/res-.5,i=Math.floor(fu),j=Math.floor(fv),fx=fu-i,fy=fv-j;
 const clamp=(v,n)=>Math.min(n-1,Math.max(0,v)),a=clamp(i,W),b=clamp(i+1,W),c=clamp(j,H),d=clamp(j+1,H);
 return [0,1,2,3].map(ch=>{const t00=rgba[(c*W+a)*4+ch],t10=rgba[(c*W+b)*4+ch],t01=rgba[(d*W+a)*4+ch],t11=rgba[(d*W+b)*4+ch];return ((t00+(t10-t00)*fx)*(1-fy)+(t01+(t11-t01)*fx)*fy)/255;});
}
// Emulate the proposed GPU sampler through texture storage, not CPU sampler.
function shader(layer,uv) {
 const W=layer.W,H=layer.H,p=[uv[0]*W-.5,uv[1]*H-.5],cell=p.map(Math.floor),f=p.map((v,i)=>v-cell[i]);
 const fetch=(dx,dy)=>{
  const i=Math.min(W-1,Math.max(0,cell[0]+dx)),j=Math.min(H-1,Math.max(0,cell[1]+dy));
  const red=layer.texture.image.data[j*W+i]/255,id=Math.floor(red*255+.5),pal=layer.paletteTexture.image.data;
  return [0,1,2,3].map(c=>pal[id*4+c]/255);
 };
 const a=fetch(0,0),b=fetch(1,0),c=fetch(0,1),d=fetch(1,1);
 return a.map((v,k)=>(v+(b[k]-v)*f[0])*(1-f[1])+(c[k]+(d[k]-c[k])*f[0])*f[1]);
}
function verify(rgba,W,H,res=1,x0=-10,z0=30,N=20000) {
 const storage=compactClassRGBA(rgba),sample=classSampler(storage,W,H,res,x0,z0),{layer}=classLayer(rgba,{W,H,res},x0,z0);
 assert.equal(storage.raw,null);assert.equal(storage.indices.length,W*H);assert.equal(storage.palette.length,1024);
 assert.deepEqual(expandClassRGBA(storage),rgba);
 if(rgba.byteLength<1000000){assert.deepEqual(layer.data,rgba);assert.notStrictEqual(layer.data,layer.data);}
 assert.equal(layer.texture.format,THREE.RedFormat);assert.equal(layer.texture.minFilter,THREE.NearestFilter);
 assert.equal(layer.paletteTexture.magFilter,THREE.NearestFilter);assert.equal(layer.texture.colorSpace,THREE.NoColorSpace);
 assert.strictEqual(layer.texture.image.data,layer.indices);assert.strictEqual(layer.paletteTexture.image.data,layer.palette);
 let maxShaderError=0;
 const points=[[-100,-100],[0,0],[.5,.5],[W-.5,H-.5],[W,H],[W+100,H+100],[1.0,.5],[.5,1.0]];
 for(let i=0;i<N;i++)points.push([-2+((i*8191.371)%(W+4)),-2+((i*4093.613)%(H+4))]);
 for(const [px,pz]of points){const x=x0+px*res,z=z0+pz*res,want=reference(rgba,W,H,res,x0,z0,x,z);assert.deepEqual(sample(x,z),want);const got=shader(layer,[px/W,pz/H]);for(let k=0;k<4;k++)maxShaderError=Math.max(maxShaderError,Math.abs(got[k]-want[k]));}
 assert.ok(maxShaderError<2e-12,`Shader emulation error ${maxShaderError}`);
 let disposed=0;layer.paletteTexture.addEventListener('dispose',()=>disposed++);layer.texture.dispose();assert.equal(disposed,1);
 return {pixels:W*H,colors:storage.colorCount,rawBytes:rgba.byteLength,indexBytes:storage.indices.byteLength,paletteBytes:storage.palette.byteLength,samples:points.length,maxShaderError};
}
const colors=[[26,112,97,20],[230,0,5,20],[0,10,240,5],[0,240,8,8],[0,0,0,0],[255,255,255,255]],fixture=Uint8Array.from(Array.from({length:20},(_,i)=>colors[(i*7+i%3)%colors.length]).flat());
const copy=fixture.slice();console.log('fixture',verify(fixture,5,4,.7));assert.deepEqual(fixture,copy);
const unaligned=new Uint8Array(new ArrayBuffer(fixture.length+1),1,fixture.length);unaligned.set(fixture);assert.deepEqual(expandClassRGBA(compactClassRGBA(unaligned)),fixture);
const overflow=Uint8Array.from(Array.from({length:257},(_,i)=>[i&255,i>>>8,3,250]).flat()),fallback=compactClassRGBA(overflow);
assert.strictEqual(fallback.raw,overflow);assert.equal(fallback.indices,null);assert.strictEqual(expandClassRGBA(fallback),overflow);
const {layer:legacy}=classLayer(fixture,{W:5,H:4,res:1},0,0,true);assert.equal(legacy.encoding,'rgba8');assert.strictEqual(legacy.texture.image.data,fixture);assert.equal(legacy.texture.minFilter,THREE.LinearFilter);
assert.match(CLASS_PALETTE_GLSL,/uv \* uClsSize - vec2\(0\.5\)/);assert.match(CLASS_PALETTE_GLSL,/uClsIndexed < 0\.5/);
if(process.argv.includes('--shipping')){
 const dir=new URL('../assets/baked/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 const read=name=>{const b=gunzipSync(fs.readFileSync(new URL(manifest.files[name],dir)));return decodeBaked(b.byteOffset===0&&b.byteLength===b.buffer.byteLength?b.buffer:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
 const meta=read('field'),rgba=meta.planes?read('field-clsB'):meta.clsB;
 console.log('shipping',JSON.stringify(verify(rgba,meta.cg.W,meta.cg.H,meta.cg.res,meta.x0,meta.z0)));
 if(process.argv.includes('--queries')){
  const payload={...meta};delete payload.planes;if(meta.planes)for(const key of ['qP','qH','qT','claim','dtex','clsB'])payload[key]=key==='clsB'?rgba:read(meta.planes[key]);
  const {buildField}=await import('../src/world/environment/field.js'),old=buildField({recordBake(){}},new Set(),payload),indexed=buildField({},new Set(),payload);
  const methods=['bldDist','roadDist','pathDist','ptDist','hardOnlyDist','hardDist','shore','claimed','paveDist','clsAt','categoryAt'];
  for(let i=0;i<20000;i++){
   const x=payload.x0-20+((i*8191.371)%(payload.x1-payload.x0+40)),z=payload.z0-20+((i*4093.613)%(payload.z1-payload.z0+40));
   for(const key of methods)assert.deepEqual(indexed[key](x,z),old[key](x,z),key+' '+i);
   for(const opts of [{},{loose:true,onPave:true,claimOk:true}])assert.equal(indexed.free(x,z,.2,opts),old.free(x,z,.2,opts));
   assert.equal(indexed.clear(x,z,1.2),old.clear(x,z,1.2));
  }
  assert.strictEqual(payload.clsB,rgba);assert.strictEqual(indexed.cls.texture.image.data,indexed.cls.indices);assert.equal(indexed.cls.W,old.cls.W);assert.equal(indexed.cls.H,old.cls.H);
  old.cls.texture.dispose();indexed.cls.texture.dispose();old.dist.texture.dispose();indexed.dist.texture.dispose();
  console.log('shipping CPU queries: 20,000 points / 14 query cases byte-identical; payload untouched');
 }
}
if(global.gc){
 const retained=(()=>{const input=new Uint8Array(16*1024*1024);input.fill(20);return {weak:new WeakRef(input),value:classLayer(input,{W:4096,H:1024,res:1},0,0)};})();
 for(let i=0;i<5;i++){await new Promise(setImmediate);global.gc();}
 assert.equal(retained.weak.deref(),undefined,'Indexed texture/sample/debug getter retained original RGBA');
 assert.equal(retained.value.layer.indices.length,4096*1024);retained.value.layer.texture.dispose();
 console.log('retention: original16MiB RGBA collected while indexed layer/sample/debug getter remain live');
}
console.log('RESULT: OK (exact RGBA/CPU, full-resolution clamp/bilinear, shared indexed texture storage, debug expansion, >256 raw fallback, palette disposal)');
