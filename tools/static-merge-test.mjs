// Exact CPU equivalence to Three's merger, plus private-buffer/LOD-victim lifetime.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStaticGeometries, mergeStaticGeometryStream, releasePrivateGeometry } from '../src/core/merge-static-geometries.js';
import { batchStatic, staticBatchPlan, prepareStaticBatchGeometry } from '../src/core/batch2.js';
import { LOD } from '../src/core/lod.js';
import { registerLOD } from '../src/core/spatial.js';
import { VPAINT_SCALE } from '../src/core/materials.js';

function equal(a,b){
  assert.deepEqual(Object.keys(a.attributes),Object.keys(b.attributes));
  for(const name of Object.keys(a.attributes)){
    const x=a.attributes[name],y=b.attributes[name];
    assert.equal(x.array.constructor,y.array.constructor,name);assert.equal(x.itemSize,y.itemSize);assert.equal(x.normalized,y.normalized);assert.equal(x.gpuType,y.gpuType);
    assert.deepEqual(Buffer.from(x.array.buffer,x.array.byteOffset,x.array.byteLength),Buffer.from(y.array.buffer,y.array.byteOffset,y.array.byteLength),name+' exact bytes');
  }
  assert.equal(a.index.array.constructor,b.index.array.constructor);assert.deepEqual(a.index.array,b.index.array);
  assert.deepEqual(a.groups,b.groups);assert.deepEqual(a.drawRange,b.drawRange);assert.deepEqual(a.morphAttributes,b.morphAttributes);assert.equal(a.morphTargetsRelative,b.morphTargetsRelative);
  for(const g of [a,b]){g.computeBoundingBox();g.computeBoundingSphere();}
  assert(a.boundingBox.equals(b.boundingBox));assert(a.boundingSphere.equals(b.boundingSphere));
}
function check(inputs){
  const legacy=mergeGeometries(inputs,false),typed=mergeStaticGeometries(inputs);assert(legacy&&typed);equal(legacy,typed);return typed;
}
function decorated(g){
  const n=g.attributes.position.count;
  const colour=new Uint8Array(n*3),paint=new Uint8Array(n);for(let i=0;i<n;i++){colour.set([17+i%211,64+i%97,180-i%113],i*3);paint[i]=i%256;}
  const c=new THREE.BufferAttribute(colour,3,true);c.gpuType=THREE.IntType;
  g.setAttribute('color',c);g.setAttribute('aPaint',new THREE.BufferAttribute(paint,1,true));return g;
}
function transformed(source,matrix){
  const g=source.clone();g.applyMatrix4(matrix);
  if(matrix.determinant()<0){const index=g.index.array;for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];}
  g.clearGroups();g.morphAttributes={};return g;
}
const original=decorated(new THREE.BoxGeometry(2,3,4,2,2,2));
original.morphAttributes.position=[original.attributes.position.clone()];original.morphTargetsRelative=true;
const matrices=[new THREE.Matrix4().compose(new THREE.Vector3(1,2,3),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.47),new THREE.Vector3(2,1.2,.8)),
  new THREE.Matrix4().compose(new THREE.Vector3(-3,1,4),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-.22),new THREE.Vector3(-.7,1.4,1.1))];
const prepared=matrices.map(m=>transformed(original,m));check(prepared);
const cloud=(n,indices)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(n*3),3));g.setIndex(new THREE.Uint32BufferAttribute(indices,1));return g;};
assert.equal(check([cloud(65536,[0,1,65534])]).index.array.constructor,Uint16Array,'unused high vertices do not force Uint32');
assert.equal(check([cloud(65536,[0,1,65535])]).index.array.constructor,Uint32Array,'65535 primitive-restart boundary');
assert.equal(check([cloud(65535,[0,1,2]),cloud(3,[0,1,2])]).index.array.constructor,Uint32Array,'global offsets widen indices');
const privateCopy=prepared[0].clone(),saved=prepared[0].attributes.position.array.slice();releasePrivateGeometry(privateCopy);
assert.equal(Object.keys(privateCopy.attributes).length,0);assert.equal(privateCopy.index,null);assert.deepEqual(prepared[0].attributes.position.array,saved);

// Actual batch preparation normalizes attrs, applies transforms/negative winding,
// clears morph targets and emits one merged mesh. A shared instance's geometry
// must survive both buffer cleanup and bulk victim deregistration.
const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({vertexColors:true}),sources=[],renderSource=original.clone();renderSource.morphAttributes={};
const savedOriginal=renderSource.attributes.position.array.slice();
for(const matrix of matrices){const mesh=new THREE.Mesh(renderSource,material);mesh.matrix.copy(matrix);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);root.add(mesh);sources.push(mesh);}
const instance=new THREE.InstancedMesh(renderSource,material,1);instance.setMatrixAt(0,new THREE.Matrix4().makeTranslation(50,0,0));root.add(instance);root.updateMatrixWorld(true);LOD.init(root);
for(const mesh of sources)registerLOD(mesh,650);registerLOD(instance,400);
const expected=prepared.map(g=>{
  const out=g.clone();out.deleteAttribute('aPaint');
  const c=out.attributes.color,values=new Float32Array(c.count*c.itemSize);for(let i=0;i<c.count;i++)for(let k=0;k<c.itemSize;k++)values[i*c.itemSize+k]=c.getComponent(i,k);
  out.setAttribute('color',new THREE.BufferAttribute(values,c.itemSize));return out;
});
const ref=mergeGeometries(expected,false),report=batchStatic(root,{single:true,atlasTextures:false});
assert.equal(report.sources,2);assert.equal(report.merged,1);
const batch=root.children.find(g=>g.name==='static-batched').children[0];equal(ref,batch.geometry);assert.equal(batch.material,material);
for(const mesh of sources){assert.equal(mesh.parent,null);assert.equal(LOD.of(mesh),null);assert(!LOD.items.some(it=>it.obj===mesh));}
assert(LOD.of(instance));assert.equal(instance.geometry,renderSource);assert.deepEqual(renderSource.attributes.position.array,savedOriginal);
assert.equal(original.morphAttributes.position.length,1,'shared original morph data is untouched');

function streamed(items,colour=true,paint=true){
  const refs=items.map(it=>prepareStaticBatchGeometry(it,colour,paint)),expected=mergeGeometries(refs,false);
  const plans=items.map(it=>staticBatchPlan(it,colour,paint));let previous=null,count=0;
  const out=mergeStaticGeometryStream(plans,i=>{
    if(previous){assert.equal(Object.keys(previous.attributes).length,0,'prior private clone released before preparing the next');assert.equal(previous.index,null);}
    previous=prepareStaticBatchGeometry(items[i],colour,paint);count++;return previous;
  });
  assert.equal(count,items.length);assert.equal(Object.keys(previous.attributes).length,0);equal(expected,out);
  for(const g of refs)releasePrivateGeometry(g);return out;
}
const paintMat=new THREE.MeshToonMaterial({vertexColors:true});paintMat.userData.toon={paint:.073};
const items=matrices.map((matrix,i)=>({o:{geometry:original,material:paintMat,matrixWorld:matrix},bake:new THREE.Color('#b47f91'),tile:{u0:.125,v0:.25,su:.4,sv:.6}}));
const painted=streamed(items);assert.equal(painted.attributes.aPaint.normalized,true);
assert.equal(painted.attributes.aPaint.array[0],Math.round(.073/VPAINT_SCALE*255));assert.equal(painted.attributes.uv.array[0],Math.fround(.125+original.attributes.uv.getX(0)*.4));
const bare=new THREE.BoxGeometry(1,1,1).toNonIndexed();bare.deleteAttribute('normal');bare.deleteAttribute('uv');bare.attributes.position.array[0]=NaN;
streamed([{o:{geometry:bare,material:paintMat,matrixWorld:new THREE.Matrix4()},bake:null,tile:null}],false,false);
assert(Number.isNaN(bare.attributes.position.array[0]),'NaN sanitization must not mutate the source');
// A real >100k-vertex actual batch takes the streamed path, with shared source buffers intact.
const largeSource=decorated(new THREE.SphereGeometry(3,512,128)),largeRoot=new THREE.Group(),largeMaterial=new THREE.MeshBasicMaterial({vertexColors:true});
const largeMeshes=[];for(let i=0;i<3;i++){const m=new THREE.Mesh(largeSource,largeMaterial);m.position.set(i*10,2,-i*3);m.scale.x=i%2?-1:1;largeRoot.add(m);largeMeshes.push(m);}largeRoot.updateMatrixWorld(true);
const largeItems=largeMeshes.map(o=>({o,bake:null,tile:null}));
const largeExpected=streamed(largeItems,true,false),sourceBytes=largeSource.attributes.position.array.slice();
assert(largeExpected.attributes.position.count>100000);
const largeReport=batchStatic(largeRoot,{single:true,atlasTextures:false});assert.equal(largeReport.sources,3);
equal(largeExpected,largeRoot.children.find(o=>o.name==='static-batched').children[0].geometry);
assert.deepEqual(largeSource.attributes.position.array,sourceBytes);
console.log('RESULT: OK (Three byte equality, streamed one-clone lifetime, >100k actual batch, colour/atlas UV/paint, missing attrs/NaN, transforms/negative winding, index widths, shared sources, LOD removal)');
