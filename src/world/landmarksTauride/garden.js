import * as THREE from 'three';
import { waterMaterial } from '../environment/water.js';
import { TAURIDE_GARDEN,TAURIDE_WATER_UNION,TAURIDE_PATHS,TAURIDE_FENCES,TAURIDE_GATES } from './terrain.js';
const dist=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)};
const segments=r=>Array.from({length:r.length/2-1},(_,i)=>[[r[2*i],r[2*i+1]],[r[2*i+2],r[2*i+3]]]);
const underBridge=(x,z)=>bridges.some(r=>segments(r.pts).some(([a,b])=>dist(x,z,a,b)<r.w/2+1.2));
function inRing(x,z,r){let c=false;for(let i=0,j=r.length-2;i<r.length;j=i,i+=2)if((r[i+1]>z)!==(r[j+1]>z)&&x<(r[j]-r[i])*(z-r[i+1])/(r[j+1]-r[i+1])+r[i])c=!c;return c}
const inPolys=(x,z,polys)=>polys.some(p=>inRing(x,z,p.o)&&!p.h.some(h=>inRing(x,z,h)));
const mappedBridges=TAURIDE_PATHS.filter(r=>r.bridge);
const bridges=mappedBridges.map(r=>{
 const pts=r.pts.slice(),n=pts.length;
 // Some mapped endpoints lie just inside the mapped water area. Extend only
 // free terminal abutments along the surveyed axis until they meet dry ground.
 for(const end of[0,n-2]){
  const x=pts[end],z=pts[end+1],other=end===0?2:n-4;
  if(mappedBridges.some(s=>s!==r&&[[s.pts[0],s.pts[1]],s.pts.slice(-2)].some(p=>Math.hypot(x-p[0],z-p[1])<.15)))continue;
  const dx=x-pts[other],dz=z-pts[other+1],len=Math.hypot(dx,dz);
  let shift=0;while(shift<12&&inPolys(x+dx/len*shift,z+dz/len*shift,TAURIDE_WATER_UNION))shift+=.5;
  if(shift){shift+=.7;pts[end]=x+dx/len*shift;pts[end+1]=z+dz/len*shift;}
 }
 return{...r,pts};
});

export function garden(K,root){
 const ctx=K.ctx,P=K.P,M=K.mats,positions=[];
 const vec=r=>Array.from({length:r.length/2},(_,i)=>new THREE.Vector2(r[i*2],r[i*2+1]));
 function tri(a,b,c){const edges=[[a,b,c],[b,c,a],[c,a,b]].sort((u,v)=>u[0].distanceToSquared(u[1])-v[0].distanceToSquared(v[1]));const[u,v,w]=edges[2];if(u.distanceToSquared(v)>1600){const m=u.clone().add(v).multiplyScalar(.5);tri(u,m,w);tri(m,v,w);return}for(const q of (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)>0?[a,c,b]:[a,b,c])positions.push(q.x,-.55,q.y)}
 for(const p of TAURIDE_WATER_UNION){
  const o=vec(p.o),h=p.h.map(vec),all=[o,...h].flat();for(const t of THREE.ShapeUtils.triangulateShape(o,h))tri(...t.map(i=>all[i]));
  for(const r of[p.o,...p.h])for(const[a,b]of segments([...r,r[0],r[1]])){
   const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<.05)continue;const n=Math.ceil(len/4);
   for(let i=0;i<n;i++){const x=a[0]+dx*(i+.5)/n,z=a[1]+dz*(i+.5)/n;if(underBridge(x,z))continue;const rot=Math.atan2(dx,dz),half=len/n/2;
    P.push(x,0,z,rot);P.box(M.graniteWarm,-.25,.25,-1.45,.04,-half,half);P.box(M.granite,-.32,.32,.065,.21,-half,half);P.pop();ctx.physics.addBox(x,z,.64,len/n+.02,rot,-1.5,.22);
   }
  }
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();const water=new THREE.Mesh(geo,waterMaterial(ctx,ctx.services.environment?.field,{wallH:.6,under:false}));water.name='tauride-ponds';ctx.noOutline(water);ctx.noBatch(water);root.add(water);
 // Exact mapped bridge alignments. Deck is closed and gently raised above paths.
 for(const r of bridges)for(const[a,b]of segments(r.pts)){
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),x=(a[0]+b[0])/2,z=(a[1]+b[1])/2,rot=Math.atan2(b[0]-a[0],b[1]-a[1]),w=r.w/2;
  P.push(x,0,z,rot);P.box(M.graniteWarm,-w,w,-.2,.15,-len/2,len/2);
  for(const side of[-1,1]){
   for(const y of[.45,1.2])P.box(M.ironSoft,side*w-.045,side*w+.045,y,y+.06,-len/2,len/2);
   for(let j=0;j<=Math.ceil(len/.7);j++){const zz=-len/2+j*len/Math.ceil(len/.7);P.box(M.ironSoft,side*w-.035,side*w+.035,.15,1.25,zz-.035,zz+.035);}
  }P.pop();ctx.physics.addWalkBox(x,z,r.w,len,rot,.15,-.25);
  for(const side of[-1,1])ctx.physics.addBox(x+Math.cos(rot)*side*w,z-Math.sin(rot)*side*w,.12,len,rot,.15,1.25);
 }
 // Mapped fence segments; openings remain open at gate nodes and path crossings.
 const gatePts=TAURIDE_GATES.map(g=>g.p),pathSegs=TAURIDE_PATHS.flatMap(r=>segments(r.pts));
 for(const r of TAURIDE_FENCES)for(const[a,b]of segments(r.pts)){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.ceil(len/2.7);if(len<.2)continue;
  for(let i=0;i<n;i++){
   const x=a[0]+dx*(i+.5)/n,z=a[1]+dz*(i+.5)/n,half=len/n/2;
   if(gatePts.some(p=>Math.hypot(x-p[0],z-p[1])<4)||pathSegs.some(([u,v])=>dist(x,z,u,v)<2.1))continue;
   const rot=Math.atan2(dx,dz);P.push(x,0,z,rot);
   P.box(M.graniteWarm,-.18,.18,0,.22,-half,half);
   for(const y of[.55,1.7])P.box(M.ironSoft,-.035,.035,y,y+.055,-half,half);
   for(let k=-half+.12;k<half;k+=.28)P.box(M.ironSoft,-.018,.018,.24,1.9,k-.018,k+.018);
   P.box(M.ironSoft,-.055,.055,.22,2.03,-half,-half+.11);P.pop();ctx.physics.addBox(x,z,.15,len/n,rot,0,1.9);
  }
 }
 // Slatted garden benches use a shared pair of instanced meshes.
 const benches=[];
 for(const r of TAURIDE_PATHS.filter(r=>!r.bridge))for(const[a,b]of segments(r.pts)){
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);if(len<22)continue;
  const x=(a[0]+b[0])/2-dz/len*(r.w/2+1.5),z=(a[1]+b[1])/2+dx/len*(r.w/2+1.5);
  if(!inPolys(x,z,TAURIDE_GARDEN)||inPolys(x,z,TAURIDE_WATER_UNION)||K.L.insideBuilding(x,z,2)||benches.some(p=>Math.hypot(x-p.x,z-p.z)<17))continue;
  benches.push({x,z,rot:Math.atan2(-dz,dx)});
 }
 const woodGeo=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),scale=new THREE.Vector3(),pos=new THREE.Vector3();
 const wood=new THREE.InstancedMesh(woodGeo,K.mat('#8c6850'),benches.length*7),iron=new THREE.InstancedMesh(woodGeo,M.ironSoft,benches.length*4);let wi=0,ii=0;
 for(const b of benches){
  const place=(mesh,index,x,y,z,w,h,d)=>{pos.set(b.x+Math.cos(b.rot)*x+Math.sin(b.rot)*z,y,b.z-Math.sin(b.rot)*x+Math.cos(b.rot)*z);q.setFromEuler(e.set(0,b.rot,0));scale.set(w,h,d);matrix.compose(pos,q,scale);mesh.setMatrixAt(index,matrix)};
  for(let i=0;i<4;i++)place(wood,wi++,0,.48,-.21+i*.14,1.9,.065,.11);
  for(let i=0;i<3;i++)place(wood,wi++,0,.72+i*.12,.29,1.9,.09,.065);
  for(const x of[-.72,.72]){place(iron,ii++,x,.25,0,.07,.5,.44);place(iron,ii++,x,.72,.29,.06,.65,.07);}
  ctx.physics.addBox(b.x,b.z,1.95,.66,b.rot,0,1.02);
 }
 for(const mesh of[wood,iron]){mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);}
 // deckY is called for every street-level point of the people routing (start-up): the bridge segments are listed once (same order as before) and a bounding box of all of
 // them (grown by the half width + the 0.05 m end tolerance) rejects the rest of the map before any segment work
 const deckSegs=bridges.flatMap(r=>segments(r.pts).map(([a,b])=>({a,b,w:r.w})));
 const DBOX=[1e9,-1e9,1e9,-1e9];for(const s of deckSegs){const m=s.w/2+.06;for(const p of[s.a,s.b]){DBOX[0]=Math.min(DBOX[0],p[0]-m);DBOX[1]=Math.max(DBOX[1],p[0]+m);DBOX[2]=Math.min(DBOX[2],p[1]-m);DBOX[3]=Math.max(DBOX[3],p[1]+m);}}
 const deckY=(x,z)=>{
  if(x<DBOX[0]||x>DBOX[1]||z<DBOX[2]||z>DBOX[3])return null;
  for(const s of deckSegs){const a=s.a,b=s.b;
   const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),u=((x-a[0])*dx+(z-a[1])*dz)/len,v=Math.abs((x-a[0])*dz-(z-a[1])*dx)/len;
   if(u>=-.05&&u<=len+.05&&v<=s.w/2)return .15;
  }
  return null;
 };
 return{ponds:TAURIDE_WATER_UNION.length,bridges:bridges.length,deckY,benches,entrances:TAURIDE_GATES.map(g=>({x:g.p[0],z:g.p[1],clearance:4}))};
}
