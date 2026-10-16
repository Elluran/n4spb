// Private static colour buffers expire only on upload. Bounds/LOD and ND
// generation survive; shared originals, unmerged meshes and dynamic templates
// remain readable. --keepcpu exercises the existing release gate in a fresh VM.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
if(process.argv.includes('--keepcpu'))globalThis.location={search:'?keepcpu=1'};
const {batchStatic}=await import('../src/core/batch2.js');
const {buildNDProxy}=await import('../src/core/ndproxy.js');
const {LOD}=await import('../src/core/lod.js');
const {releasedStats}=await import('../src/core/spatial.js');
const keep=process.argv.includes('--keepcpu');
const hashGeometry=g=>{const h=createHash('sha256');for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))h.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));return h.digest('hex');};
const upload=g=>{for(const a of [...Object.values(g.attributes),g.index].filter(Boolean))a.onUploadCallback();};
const root=new THREE.Group(),shared=new THREE.BoxGeometry(5,8,3),material=new THREE.MeshBasicMaterial();
for(let i=0;i<2;i++){const o=new THREE.Mesh(shared,material);o.position.set(i*7,0,0);root.add(o);}
const instance=new THREE.InstancedMesh(shared,material,1);instance.setMatrixAt(0,new THREE.Matrix4().makeTranslation(70,0,0));root.add(instance);
const originalWide=new THREE.PlaneGeometry(1700,1300,18,12),wideMaterial=new THREE.MeshStandardMaterial();
const wide=new THREE.Mesh(originalWide,wideMaterial);wide.rotation.x=-Math.PI/2;wide.position.set(3000,0,3000);root.add(wide);
const wideInstance=new THREE.InstancedMesh(originalWide,wideMaterial,1);wideInstance.setMatrixAt(0,new THREE.Matrix4().makeTranslation(-3000,0,0));root.add(wideInstance);
const unmerged=new THREE.Mesh(new THREE.BoxGeometry(),material);unmerged.userData.noBatch=true;root.add(unmerged);
const originals=[shared,originalWide,unmerged.geometry],before=originals.map(hashGeometry);
LOD.init(root);const report=batchStatic(root,{farCell:640,nearCell:192,atlasTextures:false});
assert.equal(report.sources,3);assert(report.pieces>1);
const outputs=[];root.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&!originals.includes(o.geometry))outputs.push(o);});
assert(outputs.length>2);
const saved=outputs.map(o=>({o,hash:hashGeometry(o.geometry),box:o.geometry.boundingBox.clone(),sphere:o.geometry.boundingSphere.clone(),lod:LOD.of(o),counts:[...Object.values(o.geometry.attributes),o.geometry.index].map(a=>a.count)}));
const nd=buildNDProxy(root,{cell:128});assert(nd.triangles>0);
for(const s of saved)assert.equal(hashGeometry(s.o.geometry),s.hash,'ND generation reads intact pre-upload colour arrays');
const oldReleased=releasedStats.bytes;let expectedBytes=0;
for(const s of saved){const g=s.o.geometry;for(const a of [...Object.values(g.attributes),g.index])expectedBytes+=a.array.byteLength;upload(g);assert(g.boundingBox.equals(s.box));assert(g.boundingSphere.equals(s.sphere));assert.equal(LOD.of(s.o),s.lod);assert.equal(s.lod.obj,s.o);assert.deepEqual([...Object.values(g.attributes),g.index].map(a=>a.count),s.counts);for(const a of [...Object.values(g.attributes),g.index])assert.equal(a.array.length===0,!keep);}
assert.equal(releasedStats.bytes-oldReleased,keep?0:expectedBytes);
for(let i=0;i<originals.length;i++){upload(originals[i]);assert.equal(hashGeometry(originals[i]),before[i],'original/shared/unmerged source has no release hook');}
const templateRoot=new THREE.Group();for(let i=0;i<2;i++){const o=new THREE.Mesh(shared,material);o.position.x=i*4;templateRoot.add(o);}
batchStatic(templateRoot,{single:true,atlasTextures:false});const template=templateRoot.getObjectByName('static-batched').children[0].geometry,tHash=hashGeometry(template);upload(template);assert.equal(hashGeometry(template),tHash,'dynamic template buffers remain readable after upload');
console.log(JSON.stringify({ok:true,keepcpu:keep,staticOutputs:outputs.length,releasedBytes:releasedStats.bytes-oldReleased,ndTriangles:nd.triangles}));
