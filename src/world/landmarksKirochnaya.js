// Clinical Institute, Kirochnaya 41: OSM footprints, photographed garden campus.
// SOURCE: D:/git2/agi-fun-tests/102_3d_piter src/world/landmarksKirochnaya.js (+ landmarksKirochnaya/groups.js, landscape.js), commit 0568f7af; copied verbatim (milestone M5, docs/AREAS.md), research: docs/research/north-kirochnaya.md of the source.
import * as THREE from 'three';
import * as L from './layout.js';
import { makeKit } from './landmarksD/common.js';
import { buildHouse } from './landmarksD/house.js';
import { onion, cross } from './landmarksD/parts.js';
import { campusLandscape } from './landmarksKirochnaya/landscape.js';
export const OWNS_GROUPS = true;

const MAIN = new Set(['w232918735','w232918780','w232918782']);
function house(K,b) {
  const P=K.P,M=K.mats,main=MAIN.has(b.id), chapel=b.id==='r3127704';
  const height = main ? (b.id==='w232918735'?17.7:12.5) : chapel?7.1:Math.max(4.7,Math.min(17.3,L.heightOf(b)));
  const y0=b.id==='w232918789'?5.4:0;
  const color=main?'#d7a59b':chapel?'#c17f6c':b.id==='w30324673'?'#c5bcaa':'#d3c5af', wall=K.wall(color);
  buildHouse(K,{recs:[b],hc:height,wall:color,railing:false,roofMat:chapel?M.roofRust:M.roofDark,party:()=>false,plinth:y0?0:0.6,
    front(e,{len}) {
      K.wallQuad(wall,0,len,y0,height+0.45,3);
      if(len<2.2)return true;
      const count=Math.max(1,Math.round(len/(main?4.6:3.7))), pitch=len/count;
      const floors=Math.max(1,Math.round((height-y0-0.7)/4.7));
      for(let f=0;f<floors;f++)for(let i=0;i<count;i++) {
        const x=(i+0.5)*pitch,y=y0+1.1+f*(height-y0-1.1)/floors;
        K.window({x,y,w:Math.min(main?1.65:1.35,pitch*0.55),h:main?2.7:2.25,head:chapel?'arch':'flat',sw:main?0.2:0.14,d:0.12,frame:'white',hood:main&&f===1?'tri':null,hoodH:0.4});
      }
      if(len>8) {
        for(const u of [0.4,len-0.4]) K.pilaster(M.trim,u,main?0.65:0.4,y0+0.7,height-0.8,0.18,0.35);
        for(let y=y0+4.4;y<height-1;y+=4.7)P.box(M.trim,0,len,y,y+0.24,0.02,0.22,'k');
      }
      // Rusticated lower courses on the photographed pale-rose main building.
      if(main)for(let y=0.95;y<4.25;y+=0.63)P.box(M.cream,0,len,y,y+0.055,0.025,0.07,'k');
      return true;
    }
  });
}

function mainCrown(K) {
  const P=K.P,M=K.mats;
  P.push(1230.0,0,-1224.7,Math.PI+0.026);
  // Central elevated house-church, broad dark hipped roof and small onion crown.
  P.box(K.wall('#d7a59b'),-10.4,10.4,17.7,19.5,-9.8,11);
  const q=[[-10.8,19.6,11.4],[10.8,19.6,11.4],[10.8,19.6,-10.2],[-10.8,19.6,-10.2]],t=[[-6.5,24,6.7],[6.5,24,6.7],[6.5,24,-6.7],[-6.5,24,-6.7]];
  for(let i=0;i<4;i++){const j=(i+1)%4;P.quad(M.roofDark,q[i],q[j],t[j],t[i],[q[i][0]+q[j][0],15,q[i][2]+q[j][2]]);}
  P.box(M.roofDark,-6.5,6.5,23.95,24.05,-6.7,6.7);
  P.box(M.trim,-1.7,1.7,24.05,26.1,-1.7,1.7);
  onion(K,M.roofDark,0,26.1,0,2.2,0.85);cross(K,M.brass,0,30.5,0,1.75);
  P.push(0,0,13.3);
  for(const x of [-7.3,7.3])K.pilaster(M.trim,x,1.1,5.2,17.2,0.38,0.7);
  K.hood(M.trim,'tri',0,18.2,20.5,4.2,0.42);
  K.gate(0,0.1,3.2,4.9,{sw:0.35});
  K.fascia(-6.1,6.1,5.0,5.6,'КЛИНИЧЕСКИЙ ИНСТИТУТ',{w:1024,h:80,bg:'#d0c4ac',fg:'#40515b',z:0.34});
  P.pop();P.pop();
}

function chapelRoof(K) {
  const P=K.P,M=K.mats;
  P.push(1124.2,0,-1089.7,-Math.PI/2+0.015);
  // The mortuary chapel's crossing barrel gables, from the Commons photographs.
  const sh=new THREE.Shape();sh.moveTo(-5.5,7.4);sh.absarc(0,7.4,5.5,Math.PI,0,true);sh.lineTo(-5.5,7.4);sh.closePath();
  P.extrude(M.roofRust,sh,-9.6,19.2,1,24);
  for(const z of [-9.62,9.62]){
    P.push(0,0,z,z<0?Math.PI:0);
    P.geo(M.trim,new THREE.TorusGeometry(5.48,.18,6,32,Math.PI),0,7.4,.12);
    for(const u of [-2.4,0,2.4])K.window({x:u,y:8.0,w:1.1,h:2.4,head:'arch',sw:0.14,frame:'white'});
    P.pop();
  }
  P.pop();
}

export function build(ctx) {
  const K=makeKit(ctx),root=new THREE.Group();root.name='landmarksKirochnaya';
  K.svc={houses:[],entrances:[],monuments:[],photoSpots:[]};
  const recs=L.groupMembers('kirochnaya-clinical-institute').filter(b=>!b.skip&&!b.dupOf);
  // A mapped low connector contains a four-storey part: leave that area to its
  // part but keep its ground footprint, with per-record heights from the map.
  for(const b of recs){K.begin();house(K,b);K.flush(root,'clinical-'+b.id);}
  K.begin();mainCrown(K);chapelRoof(K);K.flush(root,'clinical-crowns');
  K.begin();campusLandscape(K);K.flush(root,'clinical-garden');ctx.addStatic(root);
  ctx.services.landmarksKirochnaya={triangles:K.tris,entrances:[{x:1230,z:-1244,clearance:5},{x:1312,z:-1238,clearance:5}],campus:true};
}
