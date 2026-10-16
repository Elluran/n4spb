import * as THREE from 'three';
import * as L from '../layout.js';
import { CAMPUS,CAMPUS_ROADS,inCampus } from './groups.js';

export function campusLandscape(K) {
  const P=K.P,M=K.mats,ctx=K.ctx;
  const grass=ctx.mat.toon('#7c935a',{paint:0.025}), paving=ctx.mat.toon('#aaa79d',{paint:0.025}),road=ctx.mat.toon('#697174',{paint:0.015,name:'lmK-asphalt'});
  const leaf=[ctx.mat.toon('#547541'),ctx.mat.toon('#638148'),ctx.mat.toon('#496d40')],bark=ctx.mat.toon('#766652');
  const sphere=new THREE.IcosahedronGeometry(1,1),trunks=[];
  // Garden ground follows the mapped perimeter. Fine cells avoid huge triangles;
  // internal OSM ways are drawn above it and have exclusive ownership. They are real service ways of the street network: flush asphalt (a 0.145 m plinth was a kerb in every lane).
  for(let x=1110;x<1344;x+=2)for(let z=-1242;z< -1046;z+=2){
    if(!inCampus(x+1,z+1)||L.isOnRoad(x+1,z+1,2.2))continue;               // no lawn over a mapped lane (streets draws its asphalt at 0.03, the lawn lies at 0.045; streets is built AFTER this module, its centreline can lie ~0.7 m off the layout one: 2.2 m - the half diagonal of a cell)
    P.quad(grass,[x,0.045,z],[x+2,0.045,z],[x+2,0.045,z+2],[x,0.045,z+2],[0,1,0]);
  }
  for(const r of CAMPUS_ROADS)for(let i=0;i+3<r.pts.length;i+=2){
    const [x,z,bx,bz]=r.pts.slice(i,i+4),len=Math.hypot(bx-x,bz-z),w=r.w||4;
    if(len<0.05)continue;P.push((x+bx)/2,0,(z+bz)/2,Math.atan2(bx-x,bz-z));
    // The 0.65 m paved verge of a mapped service lane lies 0.7 m clear of its edge (streets is built AFTER this module and its centreline can lie ~0.7 m off the layout one, so a verge hard on the edge ended up
    // on the asphalt), in 2 m pieces, and only where no other carriageway (the neighbouring lanes, Kirochnaya, junction mouths) is within 0.9 m of it. Streets draws the pavement of the ranked streets itself.
    const nx=(bz-z)/len,nz=-(bx-x)/len,k=Math.max(1,Math.ceil(len/2)),dx=(bx-x)/len,dz=(bz-z)/len;
    if(r.hw==='service')for(let q=0;q<k;q++)for(const sd of [-1,1]){
      const u0=-len/2+q*len/k,u1=u0+len/k,um=(u0+u1)/2,off=sd*(w/2+1.025),cx=(x+bx)/2+dx*um+nx*off,cz=(z+bz)/2+dz*um+nz*off;
      if([-1,0,1].some((f)=>[-0.4,0.4].some((e)=>L.roadsNear(cx+dx*f*(u1-u0)/2+nx*e,cz+dz*f*(u1-u0)/2+nz*e,0.9,{drivable:true}).some((h)=>h.road!==r))))continue;
      P.box(paving,sd<0?-w/2-1.35:w/2+0.7,sd<0?-w/2-0.7:w/2+1.35,0.04,0.05,u0,u1);
    }
    P.box(road,-w/2,w/2,0.051,0.055,-len/2,len/2);P.pop();
  }
  // Photographs show a mature garden with open circulation, not a parking lot.
  // Exact trunk locations are interpretations; collision and road clearances are real.
  const R=ctx.rng('clinical-garden-1885');
  for(let x=1120;x<1335;x+=13)for(let z=-1230;z< -1060;z+=13){
    const px=x+(R()-.5)*7,pz=z+(R()-.5)*7;
    if(!inCampus(px,pz)||L.insideBuilding(px,pz,4.8)||L.isOnRoad(px,pz,4.0)||Math.hypot(px-1321.9,pz+1178)<7)continue;
    const h=8+R()*5,r=2.7+R()*1.4;
    P.cyl(bark,[px,0,pz],[px,h*.71,pz],.2,.1,7,true);
    for(let j=0;j<3;j++){const a=j*Math.PI*2/3;P.geo(leaf[j],sphere,px+Math.cos(a)*r*.4,h*.73+j*.55,pz+Math.sin(a)*r*.4,0,j,0,r,r*.95,r*.87);}
    ctx.physics.addCylinder(px,pz,.27,0,h*.65);trunks.push([px,pz]);
  }
  // Garden benches beside mapped access paths, never in the carriageway.
  for(const [x,z,rot] of [[1198,-1113,0],[1258,-1130,0],[1304,-1136,-.65],[1169,-1135,Math.PI/2],[1260,-1183,0]]){
    if(L.insideBuilding(x,z,1.5))continue;P.push(x,0,z,rot);
    for(const u of [-.82,.82]){P.box(M.iron,u-.055,u+.055,0,.68,-.3,.3);P.box(M.iron,u-.05,u+.05,.35,1.05,-.32,-.24);}
    for(const zz of [-.22,0,.22])P.box(M.roofGreen,-1.05,1.05,.47,.54,zz-.07,zz+.07);
    for(const y of [.77,.98])P.box(M.roofGreen,-1.05,1.05,y,y+.12,-.3,-.23);P.pop();
  }
  // North garden and Paradnaya frontage: diamond-pattern iron panels from the
  // photographed fence. OSM access gates stay open at x1155 and x1312.
  for(const [a,b] of [[[1159,-1242],[1215,-1240.4]],[[1247,-1239.7],[1307,-1238]],[[1317,-1237.8],[1337,-1237.2]],[[1117.7,-1233],[1110.8,-1106]]]){
    const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);P.push(a[0],0,a[1],Math.atan2(-dz,dx));
    P.box(M.granite,0,len,0,.18,-.15,.15);
    for(const y of [.33,1.7])P.box(M.iron,0,len,y,y+.05,-.035,.035);
    const n=Math.floor(len/2.5);for(let i=0;i<=n;i++){
      const u=i*len/n;P.box(M.iron,u-.055,u+.055,.18,1.9,-.055,.055);
      if(i<n)for(let j=0;j<5;j++){const v=u+j*(len/n)/5,step=(len/n)/5;P.cyl(M.iron,[v,.38,0],[Math.min(len,v+step),1.67,0],.013,.013,4);P.cyl(M.iron,[v,1.67,0],[Math.min(len,v+step),.38,0],.013,.013,4);}
    }P.pop();
    ctx.physics.addBox((a[0]+b[0])/2,(a[1]+b[1])/2,len,.16,Math.atan2(-dz,dx),0,1.9);
  }
  // The mapped eastern boundary is a plastered wall, not a vehicle passage.
  const a=[1343.1,-1237],b=[1336.5,-1068.8],len=Math.hypot(b[0]-a[0],b[1]-a[1]),rot=Math.atan2(b[0]-a[0],b[1]-a[1]);
  P.push((a[0]+b[0])/2,0,(a[1]+b[1])/2,rot);P.box(K.wall('#c4b5a2'),-.19,.19,0,1.75,-len/2,len/2);P.box(M.trim,-.25,.25,1.75,1.89,-len/2,len/2);P.pop();
  ctx.physics.addBox((a[0]+b[0])/2,(a[1]+b[1])/2,.38,len,rot,0,1.9);
  void CAMPUS;void trunks;
}
