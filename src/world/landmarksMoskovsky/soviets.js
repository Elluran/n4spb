import * as THREE from 'three';
import { frameOf } from '../landmarksD/kit.js';
import { roadClear, boxClear } from './common.js';

export function soviets(K,recs){
  if(!recs.length)return;
  const {mats:M,ctx,svc}=K,outline=recs.find(b=>!b.part)||recs[0];
  const parts=recs.filter(b=>b.part&&!b.dupOf),draw=parts.length?parts:[outline];
  for(const rec of draw){
    // OSM parts preserve the lower wings, elevated central block and courts.
    const authored={'r1145686':20.5,'r5933731':33.8,'r5933729':34.1,'r5933730':34.1};
    const central=Math.abs(rec.cz-outline.cz)<58;
    const h=Math.max(rec.minH||0,authored[rec.id]??rec.h??(central?34:22));
    const edges=K.shell(rec,h,M.stone);K.cornice(edges,h);
    K.use(true);
    for(const e of edges)K.frame(e,(len,f)=>{
      if(len<2)return;
      const n=Math.max(1,Math.floor(len/4.35));
      for(let i=0;i<n;i++)for(let y=1.7;y+2.1<h-1.2;y+=3.65)K.window((i+.5)*len/n,y,1.75,2.25);
      if(!e.hole&&e.n[0]<-.7&&len>28){
        const tall=h>28,cap=h-3.15,y0=.65,r=tall?.79:.66;
        const cols=tall?14:n;
        for(let i=0;i<cols;i++){
          const u=(i+.5)*len/cols;
          K.body.push(f.x,0,f.z,f.rot);
          K.body.col(M.stone,u,1.7,y0,cap,r,r*.9,12);
          K.body.box(M.trim,u-r*1.12,u+r*1.12,cap,cap+.4,.62,2.78);
          K.body.pop();
        }
        K.P.box(M.trim,-.28,len+.28,cap+.4,cap+.84,0,2.9);
        // Long relief band: marching and working figures in shallow limestone.
        if(tall)for(let i=0;i<Math.floor(len/1.45);i++){
          const u=(i+.5)*1.45,y=h-1.55;
          K.P.col(M.shade,u,1.0,y-.55,y+.6,.17,.23,5);
          K.P.geo(M.trim,new THREE.SphereGeometry(.19,6,4),u,y+.82,1.05);
          K.P.cyl(M.trim,[u-.1,y+.38,1.03],[u-.5,y+.0,1.06],.08,.06,5);
          K.P.cyl(M.trim,[u+.1,y+.38,1.03],[u+.45,y+.68,1.06],.08,.06,5);
        }
      }
    });
    svc.houses.push({id:rec.id,name:'Дом Советов',x:rec.cx,z:rec.cz,h});
  }
  // Central sculptural state emblem above the parapet (flags are omitted).
  const cx=outline.cx,cz=outline.cz,west=Math.min(...outline.polys.flatMap(p=>p.o.filter((_,i)=>i%2===0)));
  const crown=34.1;
  const frontPart=draw.find(b=>b.id==='r5933731')||outline;
  const crownX=Math.min(...frontPart.polys.flatMap(p=>p.o.filter((_,i)=>i%2===0)))-.8;
  K.body.push(crownX,0,cz,-Math.PI/2);K.detail.push(crownX,0,cz,-Math.PI/2);
  K.body.geo(M.stone,new THREE.TorusGeometry(3.4,.35,5,24),0,crown+3.6,0);
  K.body.col(M.stone,0,0,crown+.15,crown+4.4,1.3,.85,10);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;K.detail.cyl(M.trim,[Math.sin(a)*2.5,crown+3.6+Math.cos(a)*2.5,.1],[Math.sin(a)*4.4,crown+3.6+Math.cos(a)*4.4,.1],.16,.04,5);}
  K.body.pop();K.detail.pop();
  svc.photoSpots.push({name:'Дом Советов и Московская площадь',x:west-160,z:cz+12,yaw:-86});
}

export function lenin(K,rec){
  if(!rec)return;const x=rec.x,z=rec.z,{ctx,mats:M}=K;
  if(!roadClear(ctx,x,z,4.5))return;
  const P=K.body;P.push(x,0,z,-Math.PI/2);
  P.box(M.granite,-4.1,4.1,.1,.5,-4.1,4.1);P.box(M.granite,-2.1,2.1,.5,7.5,-2.1,2.1);
  // Anikushin's energetic forward stride, extended right arm and blowing coat.
  P.cyl(M.bronze,[-.65,7.5,.65],[-.42,10.75,0],.35,.48,10);
  P.cyl(M.bronze,[.72,7.5,-.5],[.4,10.75,.05],.35,.48,10);
  P.box(M.bronze,-1.05,-.24,7.5,7.8,.1,1.5);P.box(M.bronze,.3,1.11,7.5,7.8,-1.0,.1);
  P.cyl(M.bronze,[0,10.0,0],[0,14.0,.38],1.30,.98,12);
  P.col(M.bronze,0,.38,14.0,14.7,.33,.32,8);
  P.geo(M.bronze,new THREE.SphereGeometry(.65,12,8),0,15.3,.46,0,0,0,.9,1.1,1);
  P.geo(M.bronze,new THREE.SphereGeometry(.18,7,5),0,15.23,1.10,0,0,0,.75,.8,1.2);
  P.cyl(M.bronze,[0,14.83,1.0],[0,14.54,.94],.23,.045,7);
  P.cyl(M.bronze,[-.9,13.6,.38],[-1.35,11.45,.75],.32,.23,8);
  P.cyl(M.bronze,[.9,13.6,.38],[2.55,14.13,.6],.32,.25,8);
  P.cyl(M.bronze,[2.55,14.13,.6],[3.85,14.40,.7],.25,.18,8);
  P.geo(M.bronze,new THREE.SphereGeometry(.26,7,5),3.95,14.4,.7,0,0,-.1,1.5,.7,1);
  for(const u of [-.25,.25])P.cyl(M.dark,[u,12.4,1.17],[u*2,13.8,1.15],.06,.035,5);
  P.pop();
  ctx.physics.addBox(x,z,4.2,4.2,0,.1,7.5);
  K.svc.monuments.push({id:rec.id,name:'Памятник В. И. Ленину на Московской площади',x,z,h:16});
}

export function metroEntrances(K,entrances){
  const {ctx,mats:M,svc}=K;
  for(const e of entrances){
    // Surface orientation follows the real underpass/entrance point. No shaft,
    // fake underground platform, or independently simulated metro is added.
    const near=ctx.L.nearestRoad(e.x,e.z,{drivable:true,maxDist:40});
    const rot=e.rotY??(near?Math.atan2(near.tx,near.tz):0);
    if(!boxClear(ctx,e.x,e.z,3.1,5.6,rot))continue;
    const P=K.body;
    P.push(e.x,0,e.z,rot);
    P.box(M.granite,-1.55,-1.3,.14,.9,-2.8,2.8);P.box(M.granite,1.3,1.55,.14,.9,-2.8,2.8);
    for(const u of [-1.39,1.39])for(const v of [-2.6,0,2.6])P.col(M.dark,u,v,.9,1.18,.045,.045,6);
    for(const u of [-1.39,1.39])P.cyl(M.dark,[u,1.18,-2.6],[u,1.18,2.6],.045,.045,6);
    P.pop();
    const panelZ=e.z+Math.cos(rot)*2.85,panelX=e.x+Math.sin(rot)*2.85;
    K.label(e.id,'М  МОСКОВСКАЯ',panelX,.86,panelZ,2.2,.34,rot);
    svc.entrances.push({id:e.id,x:e.x,z:e.z,rotY:rot,station:'Московская',kind:'underpass'});
  }
}
