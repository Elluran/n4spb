// Exact original RGBA bytes, CPU queries and an independent texture/sampler
// emulation across tile/field boundaries. No GPU. --shipping verifies every
// distance byte in the current shipping field plus 20,000 filtered samples.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { gunzipSync } from 'node:zlib';
import * as THREE from 'three';
import { decodeBaked } from '../src/core/baked-codec.js';
import { DistanceAtlas, distanceLayer, distanceUniforms, DIST_ATLAS_GLSL } from '../src/world/environment/distance-atlas.js';
import { buildField } from '../src/world/environment/field.js';
import { waterMaterial } from '../src/world/environment/water.js';
import { buildGround } from '../src/world/environment/ground.js';

function textureSample(texture,uv,nearest=false){
 const {data,width:W,height:H}=texture.image,clamp=(v,n)=>Math.min(n-1,Math.max(0,v));
 if(nearest){const x=clamp(Math.floor(uv[0]*W),W),y=clamp(Math.floor(uv[1]*H),H);return [0,1,2,3].map(c=>data[(y*W+x)*4+c]/255);}
 const px=uv[0]*W-.5,py=uv[1]*H-.5,x=Math.floor(px),y=Math.floor(py),fx=px-x,fy=py-y;
 const at=(dx,dy,c)=>data[(clamp(y+dy,H)*W+clamp(x+dx,W))*4+c]/255;
 return [0,1,2,3].map(c=>(at(0,0,c)+(at(1,0,c)-at(0,0,c))*fx)*(1-fy)+(at(0,1,c)+(at(1,1,c)-at(0,1,c))*fx)*fy);
}
// Reads actual descriptor/palette/atlas texture buffers. Deliberately never
// calls DistanceAtlas.get(), so halo/layout mistakes cannot mask one another.
function shader(layer,uv){
 if(layer.encoding==='rgba8')return textureSample(layer.texture,uv);
 const q=[Math.min(layer.W-.5,Math.max(.5,uv[0]*layer.W)),Math.min(layer.H-.5,Math.max(.5,uv[1]*layer.H))];
 const desc=tile=>{const b=textureSample(layer.metadataTexture,[(tile[0]+.5)/layer.tilesX,(tile[1]+.5)/layer.tilesY],true).map(v=>Math.floor(v*255+.5));return [b[0]+b[1]*256+b[2]*65536,b[3]>=128];};
 const constant=id=>textureSample(layer.paletteTexture,[(id%256+.5)/256,(Math.floor((id+.5)/256)+.5)/layer.paletteH],true);
 const origin=id=>{const row=Math.floor((id+.5)/layer.atlasCols);return [(id-row*layer.atlasCols)*66,row*66];};
 const atlas=(id,local,offset)=>{const a=origin(id);return textureSample(layer.texture,[(a[0]+offset+local[0])/layer.atlasW,(a[1]+offset+local[1])/layer.atlasH]);};
 const tile=q.map(v=>Math.floor(v/64)),local=q.map((v,i)=>v-tile[i]*64),d=desc(tile);
 if(!d[1])return atlas(d[0],local,1);
 if(local.every(v=>v>=.5&&v<=63.5))return constant(d[0]);
 const p=q.map(v=>v-.5),cell=p.map(Math.floor),f=p.map((v,i)=>v-cell[i]);
 const texel=(dx,dy)=>{const xy=[Math.min(layer.W-1,Math.max(0,cell[0]+dx)),Math.min(layer.H-1,Math.max(0,cell[1]+dy))],t=xy.map(v=>Math.floor(v/64)),d=desc(t);return d[1]?constant(d[0]):atlas(d[0],xy.map((v,i)=>v-t[i]*64),1.5);};
 const a=texel(0,0),b=texel(1,0),c=texel(0,1),e=texel(1,1);
 return a.map((v,k)=>(v+(b[k]-v)*f[0])*(1-f[1])+(c[k]+(e[k]-c[k])*f[0])*f[1]);
}
function verify(raw,W,H,N=20000){
 const a=new DistanceAtlas(raw,W,H),{layer,get,getWord}=distanceLayer(raw,{W,H,res:1},-20,30),reference={image:{data:raw,width:W,height:H}};
 assert.equal(a.raw,null);assert.equal(layer.encoding,'atlas64');assert.strictEqual(layer.texture.image.data,layer.atlas);assert.strictEqual(layer.metadataTexture.image.data,layer.meta);assert.strictEqual(layer.paletteTexture.image.data,layer.palette);
 assert.equal(layer.W,W);assert.equal(layer.H,H);assert.equal(layer.texture.minFilter,THREE.LinearFilter);assert.equal(layer.metadataTexture.magFilter,THREE.NearestFilter);assert.equal(layer.paletteTexture.colorSpace,THREE.NoColorSpace);
 const words=new Uint32Array(raw.buffer,raw.byteOffset,raw.length/4);
 for(let k=0;k<words.length;k++){if(getWord(k)!==words[k])throw Error('RGBA word differs '+k);if(raw.length<1000000)for(let ch=0;ch<4;ch++)assert.equal(get(k,ch),raw[k*4+ch]);}
 let maxError=0;const points=[[-100,-100],[.5,.5],[W-.5,H-.5],[W+100,H+100]];
 for(let i=0;i<N;i++)points.push([-2+((i*8191.371)%(W+4)),-2+((i*4093.613)%(H+4))]);
 // Explicit uniform/mixed borders, diagonal halo and corners, partial edge tiles.
 for(const k of [1,2,3,4])for(const e of [-.5001,-.5,-.25,0,.25,.5,.5001])for(const cross of [.5,17.75,63.75,64.25,128.125,H-.5]){points.push([k*64+e,cross],[cross,k*64+e]);}
 for(const [x,y]of points){const uv=[x/W,y/H],want=textureSample(reference,uv),got=shader(layer,uv);for(let ch=0;ch<4;ch++)maxError=Math.max(maxError,Math.abs(want[ch]-got[ch]));}
 assert.ok(maxError<3e-11,`Distance sampler error ${maxError}`);
 let disposed=0;layer.metadataTexture.addEventListener('dispose',()=>disposed++);layer.paletteTexture.addEventListener('dispose',()=>disposed++);layer.texture.dispose();assert.equal(disposed,2);
 return {rawBytes:raw.length,atlasBytes:a.byteLength,uniform:a.uniformTiles,mixed:a.mixedTiles,colors:a.uniformColors,atlas:[a.atlasW,a.atlasH],samples:points.length,maxError};
}
const W=259,H=197,raw=new Uint8Array(W*H*4).fill(255),set=(x,y,rgba)=>raw.set(rgba,(y*W+x)*4);
for(let y=0;y<64;y++)for(let x=64;x<128;x++)set(x,y,[255,255,0,255]);
for(let y=64;y<128;y++)for(let x=64;x<128;x++)set(x,y,[0,255,255,255]);
set(11,15,[30,50,70,90]);set(63,29,[11,20,30,40]);set(63,63,[60,120,80,200]);set(129,12,[10,30,80,250]);set(W-1,H-1,[0,1,2,3]);
const copy=raw.slice();console.log('fixture',verify(raw,W,H));assert.deepEqual(raw,copy);
const small=new Uint8Array(16).fill(30),fallback=new DistanceAtlas(small,2,2);assert.strictEqual(fallback.raw,small);
assert.strictEqual(new DistanceAtlas(raw,W,H,{maxSide:64}).raw,raw);assert.strictEqual(new DistanceAtlas(raw,W,H,{keepRaw:true}).raw,raw);
const {layer:legacy}=distanceLayer(raw,{W,H,res:1},0,0,true);assert.strictEqual(legacy.texture.image.data,raw);assert.equal(distanceUniforms(legacy).uDistAtlasMode.value,0);
const pw=64*30,ph=64*9,many=new Uint8Array(pw*ph*4);for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const id=(y>>6)*30+(x>>6);many.set([id&255,id>>>8,3,255],(y*pw+x)*4);}
console.log('multirow uniform palette',verify(many,pw,ph,200));
const {layer}=distanceLayer(raw,{W,H,res:1},0,0),water=waterMaterial({shared:{uTime:{value:0},uSunDir:{value:new THREE.Vector3(0,1,0)}}},{dist:layer,box:{x0:0,z0:0,x1:W,z1:H}});
assert.strictEqual(water.uniforms.uDist.value,layer.texture);assert.strictEqual(water.uniforms.uDistMeta.value,layer.metadataTexture);assert.strictEqual(water.uniforms.uDistPalette.value,layer.paletteTexture);assert.match(water.fragmentShader,/distFiltered\(q \* uDistInv\)/);assert.ok(water.fragmentShader.includes(DIST_ATLAS_GLSL));
// Exercise the actual ground onBeforeCompile hook/uniforms, stopping only its
// unrelated city-wide geometry construction after the hook has been installed.
const stop={},material={onBeforeCompile:null};Object.defineProperty(material,'customProgramCacheKey',{set(){throw stop;}});
const groundField={dist:layer,cls:{W,H,res:1,texture:layer.texture},noise:{texture:layer.texture},box:{x0:0,z0:0,x1:W,z1:H}};
try{buildGround({THREE,mat:{toon:()=>material}},null,groundField);assert.fail('ground fixture did not stop');}catch(e){if(e!==stop)throw e;}
const groundShader={uniforms:{},fragmentShader:'#include <common>\n#include <map_fragment>\n#include <fog_fragment>'};material.onBeforeCompile(groundShader,{});
assert.ok(groundShader.fragmentShader.includes(DIST_ATLAS_GLSL));assert.match(groundShader.fragmentShader,/vec4 Dm = mix\(distFiltered\(q \* uDistInv\)/);
for(const [key,value]of [['uDist',layer.texture],['uDistMeta',layer.metadataTexture],['uDistPalette',layer.paletteTexture]])assert.strictEqual(groundShader.uniforms[key].value,value);
assert.equal(groundShader.uniforms.uDistAtlasMode.value,1);assert.deepEqual(groundShader.uniforms.uDistLogicalSize.value.toArray(),[W,H]);
if(process.argv.includes('--shipping')){
 const dir=new URL('../assets/baked/',import.meta.url),man=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 const read=n=>{const b=gunzipSync(fs.readFileSync(new URL(man.files[n],dir)));return decodeBaked(b.byteOffset===0&&b.byteLength===b.buffer.byteLength?b.buffer:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
 const m=read('field'),d=m.planes?read('field-dtex'):m.dtex;
 console.log('shipping',JSON.stringify(verify(d,m.dg.W,m.dg.H)));
}
if(global.gc){
 const live=(()=>{const W=512,H=513,n=W*H,input={x0:0,z0:0,x1:W,z1:H,dg:{W,H,res:1},cg:{W,H,res:1},qP:new Uint8Array(n).fill(255),qH:new Uint8Array(n).fill(255),qT:new Uint8Array(n).fill(255),claim:new Uint8Array(n),dtex:new Uint8Array(n*4).fill(255),clsB:new Uint8Array(n*4).fill(20),noiseData:new Uint8Array(256*256*4)};input.dtex[51*W*4+4*32]=35;return {weak:new WeakRef(input.dtex),field:buildField({},new Set(),input)};})();
 for(let i=0;i<5;i++){await new Promise(setImmediate);global.gc();}assert.equal(live.weak.deref(),undefined,'Field/texture callbacks retained original dtex');assert.equal(live.field.bldDist(32.5,51.5),35*16/255);console.log('retention: original dtex collected with complete field/ground texture alive');
}
console.log('RESULT: OK (all RGBA, tile gutters/corners/edges, hardware-linear emulation, palette borders/multirow, fallback/raw aliases, shared water sampler and disposal)');
