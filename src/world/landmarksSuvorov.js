// landmarksSuvorov - the Suvorov Memorial Museum (Kirochnaya / Suvorovsky pr.), a North module: copied verbatim from 102_3d_piter commit 0568f7af (src/world/landmarksSuvorov.js); dossier docs/research/north-suvorov.md there.
import * as THREE from 'three';
import * as L from './layout.js';
import {makeKit} from './landmarksD/common.js';
import {buildHouse} from './landmarksD/house.js';
export const OWNS_GROUPS=true;

function arch(K,mat,x,y,r,w,z=.18){
  const s=new THREE.Shape();s.moveTo(x-r-w,y);s.absarc(x,y,r+w,Math.PI,0,true);s.lineTo(x+r,y);s.absarc(x,y,r,0,Math.PI,false);s.closePath();
  K.P.extrude(mat,s,z,.16,1,16);
}
function hipped(K,mat,x,z,w,d,y,h,top=.18){
  // Closed truncated hip roof, with explicit downward-facing eave cap.
  const a=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],
    b=[[x-w*top/2,y+h,z-d*top/2],[x+w*top/2,y+h,z-d*top/2],[x+w*top/2,y+h,z+d*top/2],[x-w*top/2,y+h,z+d*top/2]];
  const normals=[[0,1,-1],[1,1,0],[0,1,1],[-1,1,0]];
  for(let i=0;i<4;i++){const j=(i+1)%4;K.P.quad(mat,a[i],a[j],b[j],b[i],normals[i]);}
  K.P.quad(mat,...a,[0,-1,0]);K.P.quad(mat,...b,[0,1,0]);
}
function mosaic(K,alps){
  const map=K.ctx.tex.draw(1024,384,(g,w,h)=>{
    g.fillStyle=alps?'#8cabb5':'#afbec0';g.fillRect(0,0,w,h);
    const poly=(color,p)=>{g.fillStyle=color;g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();};
    if(alps){
      poly('#71828b',[[0,210],[140,55],[230,180],[360,25],[550,215],[740,65],[1024,195],[1024,384],[0,384]]);
      poly('#d4d8cc',[[0,230],[140,66],[165,125],[200,160],[225,192],[360,40],[460,190],[490,175],[550,240],[740,80],[870,235],[1024,215],[1024,384],[0,384]]);
      poly('#79867e',[[0,350],[190,240],[390,320],[610,220],[800,330],[1024,280],[1024,384],[0,384]]);
    }else{
      g.fillStyle='#d5d7c9';g.fillRect(0,225,w,159);
      for(const [x,y,ww] of [[30,100,210],[660,95,280]]){g.fillStyle='#776d59';g.fillRect(x,y+60,ww,150);poly('#b9c1bd',[[x-15,y+65],[x+ww/2,y],[x+ww+15,y+65]]);for(let q=0;q<4;q++){g.fillStyle='#4c5552';g.fillRect(x+25+q*ww/4,y+105,25,40);}}
      g.strokeStyle='#4d625b';g.lineWidth=7;for(let x=270;x<610;x+=73){g.beginPath();g.moveTo(x,230);g.lineTo(x-10,50);g.lineTo(x-42,15);g.moveTo(x-10,75);g.lineTo(x+35,30);g.stroke();}
    }
    // Original stylized interpretation of the two historical subjects, no flags.
    for(let i=0;i<100;i++){
      const x=8+(i*83)%1008,y=195+(i*29)%112;
      g.fillStyle=i%3?'#526257':'#958477';g.fillRect(x,y,4,12);
      g.fillStyle='#c4b7a0';g.fillRect(x+1,y-3,3,3);
    }
    for(let i=0;i<36;i++){
      const x=25+(i*67)%970,y=alps?225+(i*23)%125:245+(i*17)%100,sz=8+(i%4)*2;
      g.fillStyle=i%4?'#344b48':'#92755e';g.fillRect(x-sz*.4,y,sz*.8,sz*2.5);
      g.fillStyle='#d0b59b';g.beginPath();g.arc(x,y-sz*.4,sz*.42,0,Math.PI*2);g.fill();
      g.fillStyle='#313e3b';g.fillRect(x-sz*.6,y-sz*.95,sz*1.2,sz*.35);
      // Cross-belts, rolled packs, long coat skirts and a carried musket.
      poly(i%4?'#3e5950':'#897666',[[x-sz*.4,y+sz],[x+sz*.4,y+sz],[x+sz*.66,y+sz*2.6],[x-sz*.66,y+sz*2.6]]);
      g.strokeStyle='#b6baa5';g.lineWidth=1.5;g.beginPath();g.moveTo(x-sz*.3,y+2);g.lineTo(x+sz*.3,y+sz*1.7);g.moveTo(x+sz*.3,y+2);g.lineTo(x-sz*.3,y+sz*1.7);g.stroke();
      g.strokeStyle='#665342';g.lineWidth=2;g.beginPath();g.moveTo(x+sz*.9,y-sz*1.3);g.lineTo(x+sz*.45,y+sz*2.2);g.stroke();
      g.strokeStyle='#3b4745';g.lineWidth=3;g.beginPath();g.moveTo(x-2,y+sz*2);g.lineTo(x-5,y+sz*3.3);g.moveTo(x+2,y+sz*2);g.lineTo(x+7,y+sz*3.3);g.stroke();
    }
    // Suvorov's mounted figure anchors the composition instead of an empty center.
    const hx=alps?565:475,hy=alps?285:300;
    g.fillStyle='#d5d2bb';g.beginPath();g.ellipse(hx,hy,29,14,-.1,0,Math.PI*2);g.fill();
    poly('#d5d2bb',[[hx+14,hy],[hx+26,hy-39],[hx+43,hy-37],[hx+45,hy-26],[hx+32,hy-20],[hx+28,hy+2]]);
    g.strokeStyle='#babfac';g.lineWidth=5;for(const [x,dx]of[[-21,-9],[-12,12],[13,8],[23,-10]]){g.beginPath();g.moveTo(hx+x,hy+6);g.lineTo(hx+x+dx,hy+31);g.stroke();}
    poly('#3c5149',[[hx-9,hy-38],[hx+9,hy-38],[hx+14,hy-6],[hx-13,hy-5]]);
    g.fillStyle='#dbc7a7';g.beginPath();g.arc(hx,hy-44,6,0,Math.PI*2);g.fill();
    poly('#36413e',[[hx-11,hy-48],[hx,hy-55],[hx+12,hy-48]]);
    // Fine tessera grid gives the two paintings a mosaic surface at close range.
    g.strokeStyle='rgba(42,52,46,.18)';g.lineWidth=.8;
    for(let x=0;x<w;x+=8){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=7){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  },{key:'suvorov-mosaic-'+(alps?'alps':'departure')});
  return K.ctx.mat.toon('#ffffff',{map,paint:0});
}

export function build(ctx){
  const rec=L.groupMembers('north-suvorov-museum').find(b=>b.id==='w30198549');if(!rec)return;
  const K=makeKit(ctx),P=K.P,M=K.mats,root=new THREE.Group();root.name='landmarksSuvorov';K.svc={houses:[],entrances:[],monuments:[],photoSpots:[]};
  const brickMap=ctx.tex.draw(256,128,(g,w,h)=>{g.fillStyle='#c2c1b5';g.fillRect(0,0,w,h);for(let r=0;r<8;r++){g.fillStyle='#93978c';g.fillRect(0,r*16,w,1);for(let c=0;c<9;c++)g.fillRect(c*32+(r%2)*16,r*16,1,16);}}, {key:'suvorov-grey-brick'});
  const tileMap=ctx.tex.draw(256,256,(g,w,h)=>{g.fillStyle='#749b75';g.fillRect(0,0,w,h);for(let r=0;r<24;r++)for(let c=0;c<18;c++){g.fillStyle=(r+c)%3?'#497d64':'#8d9b62';g.fillRect(c*15+(r%2)*7,r*11,13,9);}}, {key:'suvorov-roof-tiles'});
  const wall=ctx.mat.toon('#b8b8ab',{map:brickMap,paint:.04}),roof=ctx.mat.toon('#88ae98',{map:tileMap,paint:.02}),stone=K.wall('#c7c8bd'),dark=K.wall('#54665f'),panels=[mosaic(K,true),mosaic(K,false)];
  K.begin();
  buildHouse(K,{recs:[rec],polysOf:b=>b.polys.map(p=>({...p,o:p.o.filter((v,i)=>p.o[i-i%2+1]>-1222)})),hc:9.3,wall:'#b8b8ab',roofMat:roof,railing:false,cornice:'none',plinth:1.1,
    front:(e,{len})=>{
      K.wallQuad(wall,0,len,0,9.7,1.8);
      const mx=(e.a[0]+e.b[0])/2;
      if(e.n[1]<-.7&&len>14&&Math.abs(mx-rec.cx)>9){
        const p=mx<rec.cx?1:0;
        K.plane(panels[p],1.1,len-1.1,2.25,6.1,.11);
        for(const y of [1.93,6.2])P.box(stone,.8,len-.8,y,y+.24,.02,.3);
        for(const x of [.85,len-.85])P.box(stone,x-.12,x+.12,1.95,6.45,.02,.3);
        K.fascia(1.2,len-1.2,1.3,1.85,p?'ОТЪЕЗД СУВОРОВА В ПОХОД 1799 ГОДА':'ПЕРЕХОД СУВОРОВА ЧЕРЕЗ АЛЬПЫ',{bg:'#56574c',fg:'#d5c9a6',w:1024,h:80,size:.58,z:.18});
      }else if(len>4){
        const n=Math.max(1,Math.floor(len/3.5));for(let i=0;i<n;i++)K.window({x:(i+.5)*len/n,y:2,w:1.2,h:4.1,head:'arch',sw:.2,d:.16,frame:'brown'});
      }
      if(len>1.8){const n=Math.max(1,Math.floor(len/1.5));for(let i=0;i<n;i++){const x=(i+.5)*len/n;arch(K,stone,x,8.15,.44,.13);P.box(stone,x-.57,x-.44,7.65,8.2,.1,.3);P.box(stone,x+.44,x+.57,7.65,8.2,.1,.3);}P.box(stone,0,len,9.34,9.62,.03,.32);}
      return true;
    }});
  // Central gatehouse registered to the actual near-north-axis footprint.
  P.push(1412.8,0,-1209.1,-.018);
  P.box(wall,-5.56,5.56,9.72,17,-12.3,12.3);
  for(let side=0;side<4;side++){
    P.push(0,0,-6.5,side*Math.PI/2);P.push(0,0,side%2?5.6:5.8);
    if(side===2){
      K.window({x:0,y:5.7,w:4.5,h:7.2,head:'arch',sw:.28,d:.23,frame:'brown'});for(let r=0;r<3;r++)arch(K,stone,0,10.65,2.25+r*.24,.18,.34+r*.17);
      for(const x of [-2.8,2.8])for(let i=0;i<8;i++)P.box(stone,x-.29,x+.29,5.7+i*.6,6.24+i*.6,.1,.65);
      for(const x of [-4.1,4.1]){
        P.cyl(dark,[x,12.8,.15],[x,12.8,.4],.63,.63,20,true);
        P.cyl(stone,[x,12.8,.41],[x,12.8,.5],.32,.32,16,true);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;P.cyl(dark,[x+.68*Math.cos(a),12.8+.68*Math.sin(a),.28],[x+1.05*Math.cos(a),12.8+1.05*Math.sin(a),.28],.10,.035,6,true);}
      }
    }
    else for(const x of [-3,0,3])K.window({x,y:11.2,w:1,h:3.9,head:'arch',sw:.18,frame:'brown'});
    for(let j=-4;j<=4;j++){arch(K,stone,j*1.1,15.7,.4,.12);P.box(stone,j*1.1-.4,j*1.1+.4,16.4,16.9,.04,.2);}
    P.pop();P.pop();
  }
  for(const y of [16.95,17.25])P.box(stone,-5.9,5.9,y,y+.3,-12.6,-.6);
  // The high square tower and tiled tent, then the smaller open-arched lantern.
  P.box(wall,-4.25,4.25,17.55,22.8,-11.45,-3.0);
  for(let side=0;side<4;side++){P.push(0,0,-7.23,side*Math.PI/2);P.push(0,0,4.27);for(const x of [-2.5,0,2.5])K.window({x,y:18.4,w:.9,h:3.8,head:'arch',sw:.16,frame:'brown'});P.pop();P.pop();}
  P.box(stone,-4.7,4.7,22.85,23.35,-11.93,-2.53);
  hipped(K,roof,0,-7.23,9.8,9.8,23.4,5.2,.43);
  const crestTex=ctx.tex.draw(256,256,(g,w,h)=>{
    g.fillStyle='#c5b991';g.fillRect(0,0,w,h);
    g.fillStyle='#7b6752';g.beginPath();g.moveTo(55,65);g.lineTo(201,65);g.lineTo(190,165);g.quadraticCurveTo(170,202,128,224);g.quadraticCurveTo(86,202,66,165);g.closePath();g.fill();
    g.fillStyle='#b49862';g.fillRect(67,79,59,56);g.fillStyle='#6c8290';g.fillRect(130,79,59,56);g.fillStyle='#a08069';g.fillRect(74,141,108,32);
    g.fillStyle='#e0c177';g.fillRect(86,48,84,12);for(const x of [89,110,131,152])g.fillRect(x,30,12,24);
    g.strokeStyle='#dad0a6';g.lineWidth=5;g.beginPath();g.moveTo(79,177);g.lineTo(175,92);g.moveTo(80,94);g.lineTo(174,177);g.stroke();
  },{key:'suvorov-crest'});
  P.push(0,0,-12.1,Math.PI);P.box(stone,-1.55,1.55,22.1,25.1,0,.22);K.plane(ctx.mat.toon('#ffffff',{map:crestTex,paint:0}),-1.25,1.25,22.3,24.7,.27);arch(K,stone,0,24.4,1.27,.2,.31);P.pop();
  P.box(stone,-2.2,2.2,28.6,31.55,-9.43,-5.03);
  for(let side=0;side<4;side++){P.push(0,0,-7.23,side*Math.PI/2);P.push(0,0,2.21);for(const x of [-.7,.7])K.window({x,y:29,w:.85,h:2,head:'arch',sw:.15,frame:'brown'});P.pop();P.pop();}
  hipped(K,roof,0,-7.23,5,5,31.6,3.3,.015);
  // Sculpted eagle finial, no flag or flagpole.
  P.geo(M.brass,new THREE.SphereGeometry(.3,10,8),0,35.22,-7.23,0,0,0,1,1.7,.65);
  for(const s of [-1,1])for(let j=0;j<5;j++)P.cyl(M.brass,[s*.15,35.25,-7.23],[s*(.5+j*.16),35.35+j*.23,-7.23],.12,.018,7,true);
  for(const s of [-1,1])P.geo(M.brass,new THREE.SphereGeometry(.16,8,6),s*.18,35.8,-7.23,0,0,0);
  // Rear high hall roof and the two outer pavilion hipped roofs.
  hipped(K,roof,0,4.5,11.7,15.0,17.1,5,.45);
  for(const x of [-25,25])hipped(K,roof,x,4.5,7.0,12.5,9.8,4.6,.16);
  // Central porch: capped thick arch ring and jambs over closed entrance doors.
  P.push(0,0,-12.55,Math.PI);
  P.box(M.doorWood,-1.6,1.6,.14,3.35,-.1,.12);
  for(const x of [-2.7,-1.8,1.8,2.7]){P.box(stone,x-.22,x+.22,.13,2.1,.1,2.8);P.cyl(stone,[x,2.1,2.4],[x,2.6,2.4],.3,.3,10,true);}
  arch(K,stone,0,2.3,1.6,.38,2.4);P.box(stone,-3.2,3.2,4.3,4.8,0,3.0);
  K.fascia(-2.7,2.7,4.92,5.46,'МУЗЕЙ А. В. СУВОРОВА',{bg:'#4a544d',fg:'#ddd4ba',z:.3,w:1024,h:100,size:.66});
  P.pop();P.pop();
  K.flush(root,'suvorov');ctx.addStatic(root);
  // M7: the merge into the shared landmark services as the strip's modules do (landmarksD.js:41); the museum publishes no monument / photo spot today, so the merge adds nothing yet
  const S=(ctx.services.landmarks||={});S.monuments=(S.monuments||[]).concat(K.svc.monuments);S.photoSpots=(S.photoSpots||[]).concat(K.svc.photoSpots);
  ctx.services.landmarksSuvorov={triangles:K.tris,entrances:[{x:1412.9,z:-1225.2,clearance:4,bldg:rec.id}],monuments:K.svc.monuments,photoSpots:K.svc.photoSpots};
}
