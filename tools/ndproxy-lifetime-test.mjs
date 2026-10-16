// CPU golden captured from the pre-lifetime-change ND implementation. Includes
// exact typed bytes, ordering, bounds, tags, original layers and LOD registrations.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { buildNDProxy } from '../src/core/ndproxy.js';
import { LOD } from '../src/core/lod.js';
import { LAYER_ND, LAYER_COLOR } from '../src/core/renderer.js';

const root=new THREE.Group(),material=new THREE.MeshBasicMaterial(),sources=[],skips=[];
function mesh(g,name,parent=root){const o=new THREE.Mesh(g,material);o.name=name;parent.add(o);sources.push(o);return o;}
const wide=mesh(new THREE.PlaneGeometry(4100,1500,300,220),'wide');
wide.rotation.set(-Math.PI/2,.13,.07);wide.position.set(431,4,-390);wide.scale.x=-1;
const dense=mesh(new THREE.PlaneGeometry(10,10,300,230),'dense');dense.rotation.x=-Math.PI/2;dense.position.set(31,2,31);
const deep=new THREE.Group();deep.userData.undergroundOnly=true;deep.userData.zone='fixture-deep';root.add(deep);
const below=mesh(new THREE.BoxGeometry(350,12,260,7,3,6),'deep',deep);below.position.set(-970,-23,337);below.rotation.y=.31;
const tagged=new THREE.Group();tagged.userData.surfaceOnly=true;tagged.userData.alwaysVisible=true;tagged.userData.zone='fixture-surface';root.add(tagged);
const instances=new THREE.InstancedMesh(new THREE.BoxGeometry(2,7,3),material,11);instances.name='static-instances';tagged.add(instances);sources.push(instances);
for(let k=0;k<instances.count;k++)instances.setMatrixAt(k,new THREE.Matrix4().compose(new THREE.Vector3(-800+k*201,5,(k%3)*137),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),k*.13),new THREE.Vector3(k%2?-1:1,1,1)));
instances.position.set(70,0,-19);instances.rotation.y=.11;
instances.computeBoundingBox();
const missing=new THREE.BufferGeometry();missing.setAttribute('position',new THREE.Float32BufferAttribute([-3,0,0,3,0,0,0,4,2],3));mesh(missing,'no-normal').position.set(59,0,75);
function skip(o){root.add(o);skips.push(o);return o;}
const dynamic=skip(new THREE.InstancedMesh(new THREE.BoxGeometry(),material,2));dynamic.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const noND=skip(new THREE.Mesh(new THREE.BoxGeometry(),material));noND.userData.noND=true;
const morphG=new THREE.BoxGeometry();morphG.morphAttributes.position=[morphG.attributes.position.clone()];skip(new THREE.Mesh(morphG,material));
skip(new THREE.Mesh(new THREE.BoxGeometry(),[material,material]));
const otherLayer=skip(new THREE.Mesh(new THREE.BoxGeometry(),material));otherLayer.layers.set(3);
const hidden=skip(new THREE.Mesh(new THREE.BoxGeometry(),material));hidden.visible=false;
const inheritedSkip=new THREE.Group();inheritedSkip.userData.noND=true;root.add(inheritedSkip);const child=new THREE.Mesh(new THREE.BoxGeometry(),material);inheritedSkip.add(child);skips.push(child);
const before=sources.map(o=>({o,attrs:Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,a.array.slice()])),idx:o.geometry.index?.array.slice(),box:o.geometry.boundingBox}));
const layersBefore=skips.map(o=>o.layers.mask);
LOD.init(root);const report=buildNDProxy(root,{cell:128,material});
assert.equal(report.sources,5);assert.equal(report.skipped,2);
for(const o of sources)assert.equal(o.layers.mask,1<<LAYER_COLOR);
for(let i=0;i<skips.length;i++)assert.equal(skips[i].layers.mask,layersBefore[i]);
for(const {o,attrs,idx,box} of before){for(const [k,a] of Object.entries(attrs))assert.deepEqual(o.geometry.attributes[k].array,a);if(idx)assert.deepEqual(o.geometry.index.array,idx);assert.equal(o.geometry.boundingBox,box);}
const proxies=LOD.items.filter(it=>it.nd);
assert.equal(proxies.length,report.meshes);assert(proxies.length>200,'wide source split into spatial cells');assert(proxies.some(it=>it.obj.geometry.index.array instanceof Uint32Array),'large cell retains 32-bit indices');
assert.equal(root.children.find(o=>o.name==='static-nd').children.length,0,'LOD attaches output to ND sectors');
const hash=createHash('sha256');
const json=x=>hash.update(JSON.stringify(x));
for(const it of proxies){
 const o=it.obj,g=o.geometry;assert.equal(o.layers.mask,1<<LAYER_ND);assert.equal(it.far,Infinity);assert.equal(it.shadow,false);assert.equal(o.parent.parent,LOD.ndRoot);
 json({name:o.name,layers:o.layers.mask,userData:o.userData,cast:o.castShadow,receive:o.receiveShadow,matrixAuto:o.matrixAutoUpdate,sphere:g.boundingSphere.toJSON?.()||{center:g.boundingSphere.center.toArray(),radius:g.boundingSphere.radius},lod:{cx:it.cx,cz:it.cz,r:it.r,far:'Infinity',near:it.near,sector:it.sector,nd:it.nd,shadow:it.shadow},parent:o.parent.name});
 for(const [k,a] of Object.entries(g.attributes)){json([k,a.array.constructor.name,a.itemSize,a.normalized]);hash.update(new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength));}
 json([g.index.array.constructor.name,g.index.itemSize,g.index.normalized]);hash.update(new Uint8Array(g.index.array.buffer,g.index.array.byteOffset,g.index.array.byteLength));
}
json({report:{...report,ms:0},layers:sources.map(o=>o.layers.mask),skipLayers:skips.map(o=>o.layers.mask),sectors:[...LOD.sectors].map(([key,s])=>({key,cx:s.cx,cz:s.cz,r:s.r,items:s.items.length,direct:s.direct.length+s.ndDirect.length,loose:s.loose.length}))});
const digest=hash.digest('hex');
const EXPECTED='d068fd8987d05ab40f13176f78a293936c50c9ff5685d4ea85d441566b378392';
if(!process.argv.includes('--record'))assert.equal(digest,EXPECTED,'exact pre-change ND geometry/layers/bounds/LOD golden');
console.log(JSON.stringify({digest,report:{...report,ms:0},proxies:proxies.length}));
