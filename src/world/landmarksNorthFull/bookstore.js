// Podpisnye Izdaniya: a real door, a researched two-storey interior and the
// New Passage exterior. Room layout is photo-derived, not a measured survey.
import * as THREE from 'three';
import * as L from '../layout.js';
import {buildHouse} from '../landmarksD/house.js';
import {ringEdges,frameOf,localOnEdge} from '../landmarksD/kit.js';

function arc(K,mat,x,y,r,w,z){
  const s=new THREE.Shape();s.moveTo(x-r-w,y);s.absarc(x,y,r+w,Math.PI,0,true);s.lineTo(x+r,y);s.absarc(x,y,r,0,Math.PI,false);s.closePath();K.P.extrude(mat,s,z,.16,1,20);
}

export function bookstore(K){
  const b=L.groupMembers('north-podpisnye')[0];if(!b)return;
  const P=K.P,M=K.mats,ctx=K.ctx;
  const edge=ringEdges(b.polys[0]).find(e=>e.n[0]>.8&&e.len>30),f=frameOf(edge);
  const world=(u,v)=>({x:f.x+f.xa[0]*u+edge.n[0]*v,z:f.z+f.xa[1]*u+edge.n[1]*v});
  const local=(x,z)=>({u:(x-f.x)*f.xa[0]+(z-f.z)*f.xa[1],v:(x-f.x)*edge.n[0]+(z-f.z)*edge.n[1]});
  const boxCollider=(u0,u1,v0,v1,y0,y1)=>{const q=world((u0+u1)/2,(v0+v1)/2);ctx.physics.addBox(q.x,q.z,u1-u0,v1-v0,f.rot,y0,y1);};
  const walk=(u0,u1,v0,v1,y,thick=.2)=>{const q=world((u0+u1)/2,(v0+v1)/2);ctx.physics.addWalkBox(q.x,q.z,u1-u0,v1-v0,f.rot,y,y-thick);};
  const stone=K.wall('#aaa99f'),lightStone=K.wall('#c0bdb0'),darkWood=K.wall('#3d4943'),oak=K.wall('#997b54'),red=K.wall('#944d4a'),cream=K.wall('#d6cbb6');
  const blueTiles=ctx.tex.draw(256,256,(g,w,h)=>{g.fillStyle='#315361';g.fillRect(0,0,w,h);for(let y=0;y<4;y++)for(let x=0;x<8;x++){g.fillStyle=['#47758a','#426f83','#518092'][(x+y)%3];g.fillRect(x*32+1,y*64+1,30,62);g.fillStyle='#638c98';g.fillRect(x*32+3,y*64+3,2,56);}},{key:'podpisnye-blue-tiles',repeat:[1,1]});
  const blue=ctx.mat.toon('#ffffff',{map:blueTiles,paint:0});
  const glass=ctx.mat.toon('#9bb8c0',{transparent:true,opacity:.16,depthWrite:false,side:'double',paint:0});K.decalMats.add(glass);
  const glow=ctx.mat.emissive('#ffe8b6',.65),black=K.wall('#414844');
  const entrance=localOnEdge(edge,-200.9,-221.8).u,doorHalf=1.12;
  const n=Math.round(edge.len/6.7),pitch=edge.len/n,entryBay=Math.floor(entrance/pitch),portalIndex=Math.max(0,entryBay-1),portal=(portalIndex+.5)*pitch;
  const stained=ctx.tex.draw(256,512,(g,w,h)=>{
    g.fillStyle='#bfb995';g.fillRect(0,0,w,h);g.strokeStyle='#535d50';g.lineWidth=4;
    for(let i=0;i<13;i++){const x=i*w/12;g.beginPath();g.moveTo(w/2,h*.58);g.lineTo(x,20);g.stroke();}
    for(let i=0;i<8;i++){g.beginPath();g.moveTo(0,90+i*50);g.bezierCurveTo(90,55+i*50,170,125+i*50,w,90+i*50);g.stroke();}
    g.fillStyle='#4b5648';g.font='24px serif';g.textAlign='center';g.fillText('IN BOOKS',w/2,420);g.fillText('WE TRUST',w/2,454);
  },{key:'podpisnye-stained'});
  const stainedMat=ctx.mat.toon('#ffffff',{map:stained,emissive:'#7d7145',emissiveIntensity:.2,paint:0});
  // Continuous outer shell, except actual glass and entrance apertures.
  buildHouse(K,{recs:[b],hc:11.1,wall:'#aaa99f',roofMat:M.roofDark,railing:false,cornice:'none',plinth:0,collide:false,
    front:(e,{len})=>{
      const ef=frameOf(e);
      const collider=(u0,u1,y0=0,y1=11.55)=>{const u=(u0+u1)/2;ctx.physics.addBox(ef.x+ef.xa[0]*u-e.n[0]*.18,ef.z+ef.xa[1]*u-e.n[1]*.18,u1-u0,.36,ef.rot,y0,y1);};
      if(!(e.n[0]>.8&&len>30)){
        P.box(stone,0,len,0,11.55,-.3,0);collider(0,len);
        if(len>3)for(let i=0;i<Math.floor(len/4);i++)for(const y of [1.3,6])K.window({x:(i+.5)*len/Math.floor(len/4),y,w:1.4,h:2.8,sw:.14,frame:'brown'});
        return true;
      }
      collider(0,entrance-doorHalf);collider(entrance+doorHalf,len);collider(entrance-doorHalf,entrance+doorHalf,3.3,11.55);
      for(const [y0,y1]of[[4.42,5.15],[9.02,11.55]])P.box(stone,0,len,y0,y1,-.3,0);
      P.box(stone,0,entrance-doorHalf,0,.46,-.3,0);P.box(stone,entrance+doorHalf,len,0,.46,-.3,0);
      for(let i=0;i<n;i++){
        const x=(i+.5)*pitch,x0=i*pitch+.55,x1=(i+1)*pitch-.55;
        P.box(stone,i*pitch-.55,i*pitch+.55,.46,9.02,-.35,.12);
        if(i===portalIndex){
          P.box(stone,x0,x1,.46,9.02,-.3,0);
          P.box(M.doorWood,x-.8,x+.8,.16,3.3,.02,.14);
          K.plane(stainedMat,x-1.18,x+1.18,4.65,8.8,.08);
          for(let j=0;j<3;j++)arc(K,j%2?lightStone:M.graniteWarm,x,8.9,1.8+j*.5,.18,.22+j*.12);
          const top=new THREE.Shape();top.moveTo(x-3.45,11.4);top.lineTo(x-3.45,12.2);top.quadraticCurveTo(x-3.45,13.15,x-2.5,13.15);top.lineTo(x+2.5,13.15);top.quadraticCurveTo(x+3.45,13.15,x+3.45,12.2);top.lineTo(x+3.45,11.4);top.closePath();P.extrude(stone,top,-.25,.5,1,14);
        }else if(i*pitch>44.3){
          P.box(stone,x0,x1,.46,9.02,-.3,0);
          K.shopWindow(x,.6,x1-x0,3.65,{fw:.13,frameMat:darkWood});K.shopWindow(x,5.3,x1-x0,3.5,{fw:.13,frameMat:darkWood});
        }else{
          for(const [y0,y1]of[[.46,4.42],[5.15,9.02]]){
            if(i===entryBay&&y0<1){
              K.plane(glass,x0,entrance-doorHalf,y0,y1,.015);K.plane(glass,entrance+doorHalf,x1,y0,y1,.015);K.plane(glass,entrance-doorHalf,entrance+doorHalf,3.3,y1,.015);
            }else K.plane(glass,x0,x1,y0,y1,.015);
            for(const u of [x0,x1])P.box(darkWood,u-.055,u+.055,y0,y1,-.06,.15);
            if(i===entryBay&&y0<1){
              P.box(darkWood,x0,entrance-doorHalf,y0,y0+.08,-.06,.15);P.box(darkWood,entrance+doorHalf,x1,y0,y0+.08,-.06,.15);
            }else P.box(darkWood,x0,x1,y0,y0+.08,-.06,.15);
            P.box(darkWood,x0,x1,y1-.08,y1,-.06,.15);
            if(i!==entryBay||y0>1)for(const u of [x-.8,x+.8])P.box(darkWood,u-.035,u+.035,y0,y1,-.06,.14);
            P.box(darkWood,x0,x1,y1-.83,y1-.76,-.06,.14);
          }
        }
        // Real rusticated stone piers, shallow block joints and rounded capitals.
        for(let r=0;r<14;r++)P.box(r%2?M.graniteWarm:M.granite,i*pitch-.49,i*pitch+.49,r*.64+.4,r*.64+1.0,.13,.25);
        P.box(lightStone,i*pitch-.6,i*pitch+.6,9.3,11.45,.02,.23);
      }
      // Complete door opening: the lowest facade band is divided at this bay.
      K.fascia(entrance-3,entrance+3,4.53,5.0,'ПОДПИСНЫЕ ИЗДАНИЯ',{bg:'#434d44',fg:'#e6dbc1',size:.63,z:.24,w:1024,h:100});
      P.box(lightStone,0,len,11.16,11.39,.01,.27);
      for(const u of [entrance-doorHalf,entrance+doorHalf])P.box(darkWood,u-.08,u+.08,.12,3.4,-.15,.18);
      P.box(darkWood,entrance-doorHalf,entrance+doorHalf,3.28,3.43,-.15,.18);
      // Two real leaves held open inward, keeping a 2.2m clear route.
      for(const s of [-1,1])P.box(darkWood,entrance+s*doorHalf-.065,entrance+s*doorHalf+.065,.12,3.25,-1.05,-.05);
      return true;
    }});
  P.push(f.x,0,f.z,f.rot);
  // Room bounds follow the narrow New Passage depth, not a detached interior.
  const U=44.3,V=-11.9,Y=4.92;
  const floorTex=ctx.tex.draw(256,256,(g,w,h)=>{g.fillStyle='#c8bd9f';g.fillRect(0,0,w,h);for(let r=0;r<8;r++)for(let c=0;c<8;c++){g.fillStyle=(r+c)%2?'#d4c8ac':'#53625e';g.fillRect(c*32+1,r*32+1,30,30);}}, {key:'podpisnye-metlakh',repeat:[1,1]});
  const floor=ctx.mat.toon('#ffffff',{map:floorTex,paint:.025});
  const oakTex=ctx.tex.draw(256,256,(g,w,h)=>{g.fillStyle='#b39567';g.fillRect(0,0,w,h);for(let r=0;r<12;r++){g.fillStyle=r%2?'#a3885f':'#bb9c6f';g.fillRect(0,r*22,w,20);for(let x=r%2?35:0;x<w;x+=85){g.fillStyle='#826f51';g.fillRect(x,r*22,1,20);}}},{key:'podpisnye-parquet',repeat:[1,1]});
  const parquet=ctx.mat.toon('#ffffff',{map:oakTex,paint:.02});
  P.box(floor,.5,15,.04,.12,V,-.31,'',3.2);
  P.box(parquet,15,U,.04,.12,-10.7,-1.9,'',3.2);
  for(const [a,b]of[[V,-10.7],[-1.9,-.31]])P.box(floor,15,U,.04,.12,a,b,'',3.2);
  walk(.5,U,V,-.31,.12,.08);
  const slab=(u0,u1,v0,v1)=>{P.box(parquet,u0,u1,Y-.18,Y,v0,v1,'',3.2);P.box(cream,u0,u1,Y-.21,Y-.18,v0,v1);walk(u0,u1,v0,v1,Y,.18);};
  slab(.5,4.5,V,-.31);slab(14.4,U,V,-.31);slab(4.5,14.4,V,-10.8);slab(4.5,14.4,-5.4,-.31);
  // The mapped southern party edge is oblique: inset this room cap far enough
  // that the neighbouring building cannot protrude through its rear corner.
  P.box(cream,.4,U,11.08,11.3,V,-.31);P.box(cream,1.35,1.65,.12,11.1,V,-.31);boxCollider(1.35,1.65,V,-.31,.12,11.1);
  P.box(cream,U,U+.22,.12,11.1,V,-.31);boxCollider(U,U+.22,V,-.31,.12,11.1);
  P.box(cream,.5,U,.12,11.1,V-.1,V+.05);
  // The inner street wall only has piers and lintels, leaving the same apertures.
  // Avoid a second continuous wall behind the glass/door.
  for(let i=0;i<Math.ceil(U/pitch);i++)P.box(cream,i*pitch-.52,i*pitch+.52,.12,11.1,-.42,-.31);
  for(const [y0,y1]of[[4.42,5.15],[9.02,11.1]])P.box(cream,.5,U,y0,y1,-.42,-.31);
  // Clear division between the active shop and the remaining historic passage.
  P.box(darkWood,U-.1,U+.1,.12,10.9,V,-.31);boxCollider(U-.1,U+.1,V,-.31,.12,11.1);
  // Shelves: physical dark timber cases and many individually colored spines.
  const colors=['#b8715e','#d6c6a0','#6e8b87','#66819a','#9a846b','#7b7290','#8f9c71'].map(c=>K.wall(c));
  function shelf(u,v,w,y,h=3.1,rot=0){
    P.push(u,0,v,rot);P.box(darkWood,-w/2,w/2,y,y+h,-.24,.24);
    const levels=Math.floor(h/.43);
    for(const face of (rot===Math.PI/2?[0,Math.PI]:[0])){P.push(0,0,0,face);for(let r=0;r<levels;r++){
      const yy=y+.15+r*.43;P.box(oak,-w/2,w/2,yy,yy+.06,.25,.53);
      const count=Math.floor((w-.16)/.105);for(let i=0;i<count;i++){
        const xx=-w/2+.1+i*.105,hh=.24+((i*11+r*7)%10)*.012;
        P.box(colors[(i+r)%colors.length],xx,xx+.077,yy+.06,yy+.06+hh,.29,.50);
        if(i%3===0)P.box(cream,xx+.01,xx+.066,yy+.13,yy+.145,.507,.517);
      }
    }P.pop();}
    P.pop();
    const q=world(u,v);ctx.physics.addBox(q.x,q.z,w,.8,f.rot+rot,y,y+h);
  }
  for(const y of [.12,Y]){
    for(let u=17;u<41;u+=3.2)shelf(u,-11.42,2.95,y,y===Y?5.35:3.75);
    for(let u=20;u<42;u+=7.4)shelf(u,-7.5,3,y,2.0,Math.PI/2);
  }
  for(let u=3.2;u<12;u+=3.2)shelf(u,-1.15,2.8,.12,3.3,Math.PI);
  function table(u,v,y,len=4){
    P.box(blue,u-len/2,u+len/2,y,y+.86,v-.58,v+.58);P.box(oak,u-len/2-.07,u+len/2+.07,y+.86,y+.95,v-.65,v+.65);
    for(let i=0;i<Math.floor(len/.35);i++)for(let k=0;k<3;k++){const uu=u-len/2+.2+i*.35;P.box(colors[(i+k)%7],uu,uu+.26,y+.95+k*.055,y+1.0+k*.055,v-.4,v+.1);}
    boxCollider(u-len/2,u+len/2,v-.6,v+.6,y,y+.95);
  }
  table(26,-4.0,.12,6);table(37,-4,.12,5);table(24,-4,Y,5);table(34,-4,Y,5);
  // Ground-floor checkout and upper cafe at the far end.
  table(40,-8,.12,4);table(40,-8,Y,4);
  for(const y of [.12,Y]){P.push(0,0,-7.25);K.fascia(38,42,y+1.2,y+1.7,y===Y?'КОФЕ · ВЫПЕЧКА':'КАССА',{bg:'#386579',fg:'#eee3c5',z:.03,size:.58});P.pop();}
  for(const u of [17,29,39]){
    P.box(oak,u-.7,u+.7,Y+.66,Y+.73,-2.1,-1.2);P.cyl(darkWood,[u,Y,-1.65],[u,Y+.66,-1.65],.08,.08,8,true);
    for(const du of [-.85,.85]){P.box(darkWood,u+du-.25,u+du+.25,Y+.44,Y+.5,-2,-1.4);for(const dv of [-1.9,-1.5])P.cyl(darkWood,[u+du,Y,dv],[u+du,Y+.45,dv],.03,.03,6,true);}
  }
  // Granite switchback stair with red walls, iron rails and wooden handrail.
  P.box(red,3.95,4.25,.12,10.9,-11,-10.65);P.box(red,4.25,14.5,.12,10.9,-11.05,-10.85);
  const stairs=(v,reverse,y0,y1)=>{
    const count=16,a=4.5,z=12,len=z-a;
    for(let i=0;i<count;i++){
      const u0=reverse?z-(i+1)*len/count:a+i*len/count,u1=u0+len/count,y=y0+(y1-y0)*(i+1)/count;
      P.box(M.granite,u0,u1,y-.16,y,v-1.0,v+1.0);
    }
    const q=world((a+z)/2,v);ctx.physics.addWalkRamp(q.x,q.z,2,len,f.rot+Math.PI/2,reverse?y1:y0,reverse?y0:y1,.22);
    for(const side of [-1,1]){
      const vv=v+side*1.02,ys=reverse?y1:y0,ye=reverse?y0:y1;
      P.cyl(oak,[a,ys+1,vv],[z,ye+1,vv],.052,.052,8,true);
      for(let i=0;i<=18;i++){const u=a+i*len/18,y=ys+(ye-ys)*i/18;P.cyl(black,[u,y+.08,vv],[u,y+.97,vv],.018,.018,5,true);}
    }
  };
  stairs(-9.55,false,.12,2.52);stairs(-6.6,true,2.52,Y);
  P.box(M.granite,12,14.35,2.34,2.52,-10.6,-5.55);walk(12,14.35,-10.6,-5.55,2.52,.18);
  // Upper guardrails around the open stairwell, with entry at its south end.
  for(const v of [-10.78,-5.42]){
    P.cyl(oak,[4.6,Y+1,v],[14.35,Y+1,v],.052,.052,8,true);
    for(let u=4.6;u<14.4;u+=.25)P.cyl(black,[u,Y+.07,v],[u,Y+.98,v],.017,.017,5,true);
    boxCollider(4.6,14.35,v-.035,v+.035,Y,Y+1.03);
  }
  // Red stair landing, restored stained-glass door and direction lettering.
  P.push(0,0,-10.72);K.plane(stainedMat,6.0,7.6,6.0,9.3,.05);K.fascia(8,12,8.8,9.3,'ИСКУССТВО · ИСТОРИЯ',{bg:'#944d4a',fg:'#ece0c2',z:.05,size:.6});K.fascia(8,12,8.1,8.6,'КНИГИ ВЕРНУЛИСЬ ДОМОЙ',{bg:'#944d4a',fg:'#ece0c2',z:.05,size:.55});P.pop();
  // Tall upper bookcases retain the photographed intermediate balcony motif.
  P.box(darkWood,16,42,Y+2.6,Y+2.76,-11.4,-10.35);P.cyl(M.brass,[16,Y+3.6,-10.25],[42,Y+3.6,-10.25],.04,.04,8,true);
  for(let u=16;u<=42;u+=.42)P.cyl(darkWood,[u,Y+2.75,-10.25],[u,Y+3.58,-10.25],.023,.023,6,true);
  for(const u of [19,31]){for(const du of [-.35,.35])P.cyl(M.brass,[u+du,Y,-9.5],[u+du,Y+2.77,-10.5],.04,.04,8,true);for(let j=0;j<10;j++)P.cyl(M.brass,[u-.35,Y+j*.27,-9.5-j*.10],[u+.35,Y+j*.27,-9.5-j*.10],.023,.023,6,true);}
  // Geometric modernist lanterns; emissive surfaces provide warm color, no
  // dozens of point lights or dynamic draw calls.
  for(const y of [4.15,10.1])for(const u of [18,26,34,41]){
    const v=-5.7;P.cyl(black,[u,y+.1,v],[u,y+.8,v],.022,.022,6,true);
    P.box(glow,u-.48,u+.48,y-.7,y+.05,v-.48,v+.48);
    for(const du of [-.49,0,.49])for(const dv of [-.49,.49])P.cyl(black,[u+du,y-.72,v+dv],[u+du,y+.1,v+dv],.02,.02,5,true);
    for(const yy of [y-.72,y+.08]){P.box(black,u-.52,u+.52,yy,yy+.035,v-.52,v-.48);P.box(black,u-.52,u+.52,yy,yy+.035,v+.48,v+.52);}
  }
  for(const u of [16,30,43]){
    P.box(cream,u-.12,u+.12,10.8,11.05,V,-.45);
    for(const v of [-11.65,-.65])P.box(cream,u-.12,u+.12,Y,10.8,v-.12,v+.12);
  }
  P.pop();
  ctx.zones?.add({id:'podpisnye-shop',test:(x,y,z)=>{const p=local(x,z);return p.u>1.65&&p.u<U&&p.v<-.35&&p.v>V&&y>.1&&y<11.1;},indoor:{name:'Подписные издания',sky:true,sun:.1,ambient:{color:'#ffeed3',ground:'#bbaa91',intensity:1.8},key:{color:'#ffe8c4',intensity:1.4,dir:[.3,1,.4]},shadows:false,fog:{color:'#b9b09e',density:.0004}}});
  ctx.services.podpisnye={entrance:world(entrance,0),world,local,floorY:[.12,Y],stair:{bottom:world(4.5,-9.55),landing:world(13,-8),top:world(4.5,-6.6)},bounds:{u0:1.65,u1:U,v0:V,v1:-.31},doorWidth:doorHalf*2};
}
