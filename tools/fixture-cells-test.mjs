import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createMaterials } from '../src/core/materials.js';
import { batchFixtureCells } from '../src/core/fixture-cells.js';
import { registerLOD } from '../src/core/spatial.js';
import { LOD } from '../src/core/lod.js';
import { Physics } from '../src/core/physics.js';
import { createKnock } from '../src/core/knock.js';
import { knockInstances } from '../src/world/lib/knock-inst.js';
const root=new THREE.Group();LOD.init(root);
const material=createMaterials({}).toon('#abcdef',{vertexColors:true});
const sources=[],skipped=[];
function add(x,zone='',skip='',far=260){
 const g=new THREE.BoxGeometry(2,3,1);g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*3).fill(.6),3));
 const o=new THREE.InstancedMesh(g,material,3), m=new THREE.Matrix4();o.castShadow=true;o.userData.zone=zone;
 for(let k=0;k<3;k++){m.compose(new THREE.Vector3(x+k*5,2,k*3),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),k*.31),new THREE.Vector3(1+k*.2,2,.6));o.setMatrixAt(k,m);o.setColorAt(k,new THREE.Color(.3+k*.1,.8,.2));}
 if(skip==='dynamic')o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 if(skip==='reflection'){o.getMatrixAt(0,m);m.scale(new THREE.Vector3(-1,1,1));o.setMatrixAt(0,m);}
 root.add(o);o.updateMatrixWorld(true);o.computeBoundingSphere();registerLOD(o,far,{attach:true});
 (skip?skipped:sources).push(o);return o;
}
add(12);add(15);add(215);add(225);add(12,'indoor');add(14,'indoor');add(15,'','dynamic');add(15,'','reflection');add(15,'','range',280);
// a knockable fixture (<= 128 vertices, vertex-coloured toon, finite range, loose): Dynamic by the knock contract, so the cell batcher must leave it alone
const kctx={physics:new Physics(()=>0),onUpdate(){},addStatic:o=>root.add(o),noOutline:o=>o};kctx.knock=createKnock(kctx);
const kgeo=new THREE.BoxGeometry(.5,.9,.5);kgeo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(kgeo.attributes.position.count*3).fill(.5),3));
const knocks=knockInstances(kctx,{name:'knock-fixture',parts:[{geo:kgeo,mat:material}],spots:[{x:12,y:0,z:3},{x:16,y:0,z:5},{x:500,y:0,z:9}],far:220,rec:{kind:'bin',mass:14,h:.9,r:.25,hitK:.12}});
assert.equal(knocks.meshes.length,2);
const matrix=new THREE.Matrix4(),normal=new THREE.Matrix3(),p=new THREE.Vector3(),n=new THREE.Vector3();
function triangles(mesh){
 const g=mesh.geometry,out=[];
 for(let k=0;k<(mesh.isInstancedMesh?mesh.count:1);k++){
  if(mesh.isInstancedMesh){mesh.getMatrixAt(k,matrix);matrix.premultiply(mesh.matrixWorld);}else matrix.copy(mesh.matrixWorld);
  normal.getNormalMatrix(matrix);
  for(let j=0;j<(g.index?.count??g.attributes.position.count);j++){
   const i=g.index?g.index.getX(j):j;p.fromBufferAttribute(g.attributes.position,i).applyMatrix4(matrix);n.fromBufferAttribute(g.attributes.normal,i).applyNormalMatrix(normal);
   const row=[...p.toArray(),...n.toArray()];for(let c=0;c<3;c++)row.push(g.attributes.color.getComponent(i,c)*(mesh.instanceColor?mesh.instanceColor.getComponent(k,c):1));
   row.push(g.attributes.uv.getX(i),g.attributes.uv.getY(i));out.push(row);
  }
 }
 return out;
}
const expected=sources.flatMap(triangles), registrations=sources.map(o=>({...LOD.of(o)}));
const result=batchFixtureCells(root);assert.equal(result.sources,6);assert.equal(result.meshes,3);
for(const k of knocks.meshes){assert.equal(k.parent,root,'a knock mesh stays where its module put it');assert(LOD.of(k)&&LOD.of(k).far===220,'with its authored range');assert.equal(k.instanceMatrix.usage,THREE.DynamicDrawUsage);assert(k.userData.knock);}
const merged=[];root.traverse(o=>{if(o.name==='fixture-cell')merged.push(o);});
const actual=merged.flatMap(triangles);assert.equal(actual.length,expected.length);
// Groups keep source order in this fixture, including distinct cells and zones.
for(let i=0;i<actual.length;i++)for(let j=0;j<actual[i].length;j++)assert(Math.abs(actual[i][j]-expected[i][j])<2e-5, 'world vertex/normal/colour/UV changed');
for(const source of sources)assert.equal(LOD.of(source),null,'removed draw has no stale registration');
for(const o of skipped)assert(LOD.of(o)&&o.parent,'dynamic/reflected instances retain their path');
for(const mesh of merged){assert(mesh.castShadow&&mesh.frustumCulled);assert.notEqual(mesh.material,material);assert.equal(mesh.material.color,material.color);assert.equal(mesh.material.onBeforeCompile,material.onBeforeCompile);assert.equal(mesh.material.customProgramCacheKey(),material.customProgramCacheKey());
 const it=LOD.of(mesh);for(const old of registrations.filter(old=>old.obj.userData.zone===mesh.userData.zone&&Math.floor(old.cx/192)===Math.floor(it.cx/192)))assert(it.r+1e-5>=Math.hypot(old.cx-it.cx,old.cz-it.cz)+old.r,'LOD union clips a former range');
 for(const row of triangles(mesh))assert(mesh.geometry.boundingSphere.distanceToPoint(new THREE.Vector3(...row.slice(0,3)))<1e-4,'geometry outside bounds');
}
console.log('RESULT: OK - exact world triangles, normals, colours and UVs; conservative LOD, zone separation, shader callbacks and dynamic/reflection exclusions.');
