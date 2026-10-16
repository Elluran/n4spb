// Mapped central-north landmarks that fall inside the Nevsky strip: the
// Podpisnye Izdaniya bookstore and the Mayakovskogo/Vosstaniya/Radishcheva
// corridor houses. Research and approximation limits in
// docs/research/north-corridor.md. All custom solids have closed geometry.
import * as THREE from 'three';
import * as L from './layout.js';
import { makeKit } from './landmarksD/common.js';
import { buildHouse } from './landmarksD/house.js';
import { bookstore } from './landmarksNorth/bookstore.js';
import { CORRIDOR_ADDRESSES, GROUPS_LIST } from './landmarksNorth/groups.js';
export const OWNS_GROUPS = true;

function corridor(K){
  const M=K.mats,P=K.P;
  for(const b of L.groupMembers('north-corridor-houses')){
    const cfg=CORRIDOR_ADDRESSES.find(([s,n])=>b.addr?.street===s&&b.addr?.no===n),color=cfg?.[2]||'#d2c2aa';
    const hc=L.heightOf(b),wall=K.wall(color),floors=Math.max(3,b.levels||5);
    buildHouse(K,{recs:[b],hc,wall:color,court:'#bcb4a3',railing:false,plinth:.9,
      front:(e,{len})=>{
        const mx=(e.a[0]+e.b[0])/2,mz=(e.a[1]+e.b[1])/2;
        const near=L.nearestRoad(mx+e.n[0]*4,mz+e.n[1]*4,{named:true,maxDist:18});
        if(!near||len<9)return false;
        K.wallQuad(wall,0,len,0,hc+.45,3);
        const n=Math.max(2,Math.round(len/3.3)),pitch=len/n,fh=(hc-4.1)/(floors-1);
        K.shopfront(.5,len-.5,{y0:.45,y1:3.4,pitch:6,doors:[0],names:[],pier:1.4});
        for(let f=1;f<floors;f++)for(let i=0;i<n;i++){
          const x=(i+.5)*pitch,y=4.4+(f-1)*fh;
          K.window({x,y,w:1.35,h:Math.min(2.35,fh-.7),head:f===1?'arch':'flat',sw:f===1?.19:.13,d:.12,frame:'white'});
          if(f===1&&i%3===1)K.balcony(x-1.05,x+1.05,y-.24,.65);
          if(f===2&&i%3===0)K.plaque(M.cream,x,y+2.45,1.6,.3,.12);
        }
        for(const x of [.25,len-.25]){K.pilaster(M.cream,x,.45,4,hc-5,.12,.3);K.downpipe(x+.25,.3,hc-.7);}
        P.box(M.cream,0,len,3.75,3.95,.02,.22);
        K.fascia(.7,Math.min(4.7,len-.7),3.0,3.5,b.addr.street.replace('улица ','УЛ. ').toUpperCase(),{bg:'#273e59',fg:'#e6e7db',size:.56,z:.23});
        return true;
      }});
  }
}

export function build(ctx){
  const K=makeKit(ctx),root=new THREE.Group();root.name='landmarksNorth';
  K.svc={houses:[],entrances:[],monuments:[],photoSpots:[]};
  for(const [name,fn] of [['podpisnye',bookstore],['corridor',corridor]]){K.begin();fn(K);K.flush(root,'north-'+name);}
  ctx.addStatic(root);ctx.services.landmarksNorth={triangles:K.tris,groups:GROUPS_LIST.map(g=>g.key)};
}
