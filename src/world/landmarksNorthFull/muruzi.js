// Photo-derived exterior of Dom Muruzi, Liteyny 24. Dimensions are approximate;
// the mapped courtyard footprint is retained. See docs/research/muruzi.md.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from '../landmarksD/house.js';
import * as G from '../landmarksK/geo.js';

export function muruzi(K) {
  const recs=L.groupMembers('north-muruzi'); if(!recs.length)return;
  const P=K.P,M=K.mats,stone=K.wall('#d5ccb5'),trim=K.wall('#ece3ce'),shade=K.wall('#a49a82');
  const brown=K.wall('#725c46'),hc=23.8;
  const floors=[{y:5.0,h:3.05,head:'arch'},{y:9.55,h:2.85,head:'flat'},
    {y:13.8,h:3.1,head:'arch'},{y:18.5,h:3.05,head:'arch'}];
  function star(x,y,r,z=.26){
    // The Moorish spandrels use small raised eight-point geometric rosettes.
    const pts=Array.from({length:16},(_,i)=>{const a=i*Math.PI/8,rr=i%2?r*.46:r;return[x+Math.cos(a)*rr,y+Math.sin(a)*rr,z];});
    P.fan(trim,pts,[0,0,1]);
    P.geo(shade,new THREE.SphereGeometry(r*.16,6,4),x,y,z+.025,0,0,0,1,1,.25);
  }
  function ornament(x,y,w){
    P.box(shade,x-w/2,x+w/2,y,y+.45,.06,.10);
    for(let i=0;i<Math.max(1,Math.floor(w/.45));i++)star(x-w/2+.25+i*.45,y+.225,.17,.16);
    P.box(trim,x-w/2-.05,x+w/2+.05,y-.07,y,.05,.22);
    P.box(trim,x-w/2-.05,x+w/2+.05,y+.45,y+.52,.05,.22);
  }
  function column(x,y0,y1,z=.28){
    P.col(trim,x,z,y0+.18,y1-.25,.085,.085,8);
    P.col(shade,x,z,y0,y0+.18,.14,.12,8);
    P.col(trim,x,z,y1-.25,y1,.17,.13,8);
  }
  function window(x,y,w,h,head='arch',paired=false){
    if(paired){
      for(const dx of [-w*.27,w*.27])K.window({x:x+dx,y,w:w*.43,h,head:'arch',sw:.12,d:.2,surMat:trim,frame:'brown'});
      column(x,y,y+h-.5);
    }else{
      K.window({x,y,w,h,head,sw:.17,d:.23,surMat:trim,frame:'brown'});
      if(head==='arch'){
        for(const dx of [-w/2-.27,w/2+.27])column(x+dx,y,y+h-w/2);
        // Alternating voussoirs around the recessed arch, rather than a plain hood.
        const r=w/2+.23,cy=y+h-w/2;
        for(let i=0;i<11;i++){
          const a0=i*Math.PI/11,a1=(i+1)*Math.PI/11;
          const q=(a,rr)=>[x+Math.cos(a)*rr,cy+Math.sin(a)*rr,.285];
          P.quad(i%2?stone:trim,q(a0,r-.08),q(a1,r-.08),q(a1,r+.10),q(a0,r+.10),[0,0,1]);
        }
      }
    }
    ornament(x,y-.68,w+.5);
    if(head==='flat'){
      const outline=G.shiftPts(G.ogeePts(w+.55,.55),x,y+h+.15);
      G.solid(P,trim,outline,.05,.2); star(x,y+h+.32,.17,.28);
    }
  }
  function balcony(x,y,w,d=.85){
    K.balcony(x-w/2,x+w/2,y,d,{slabMat:trim,rh:1});
    for(let u=-w/2+.2;u<w/2-.1;u+=.38){
      const cx=x+u,yy=y+.55,z=d+.025;
      for(const [a,b] of [[[cx,yy-.22,z],[cx+.17,yy,z]],[[cx+.17,yy,z],[cx,yy+.22,z]],
        [[cx,yy+.22,z],[cx-.17,yy,z]],[[cx-.17,yy,z],[cx,yy-.22,z]]])P.cyl(M.iron,a,b,.012,.012,4);
    }
  }
  function bay(x,width,corner=false){
    // Canted oriel: solid underside, three outward faces, projecting cornices.
    const d=corner?1.05:.85,ys=4.65;
    const pts=[[-width/2,0],[-width*.33,d],[width*.33,d],[width/2,0]];
    P.push(x,0,0);
    P.cap(shade,pts,ys,false,1);
    for(let f=0;f<3;f++){
      const a=pts[f],b=pts[f+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
      G.onFace(P,a[0],a[1],-dz/len,dx/len,()=>{
        K.wallQuad(stone,0,len,ys,hc+.15,3);
        for(let y=ys+.45;y<hc;y+=.7)P.box(shade,0,len,y,y+.12,.005,.04);
        for(let fi=0;fi<floors.length;fi++){
          const fl=floors[fi];window(len/2,fl.y,Math.max(.55,len-.55),fl.h,fl.head);
          P.box(trim,0,len,fl.y-.36,fl.y-.16,.02,.21);
        }
      });
    }
    P.cap(trim,pts,hc+.24,true,1);
    P.box(trim,-width/2-.12,width/2+.12,hc+.1,hc+.45,-.1,d+.16);
    // The real roof accents are shallow metal pyramids, not onion domes.
    const roofpts=[[-width/2-.15,-.55],[-width/2-.15,d+.17],[width/2+.15,d+.17],[width/2+.15,-.55]];
    for(let i=0;i<4;i++){
      const a=roofpts[i],b=roofpts[(i+1)%4];
      P.fan(M.roofDark,[[a[0],hc+.45,a[1]],[b[0],hc+.45,b[1]],[0,hc+2.4,.15]],[0,1,0]);
    }
    P.pop();
  }
  buildHouse(K,{recs,hc,wall:'#d5ccb5',court:'#c4bba7',floors:[4.5,4.4,4.4,4.4,4.3],
    roofMat:M.roofDark,railing:false,plinth:.75,corniceMat:trim,corniceScale:.65,
    front:(e,{len})=>{
      // Only the Liteyny/Pestelya street faces carry the ornate public facade.
      const street=(e.n[0]<-.75&&e.a[0]<-125)||(e.n[1]<-.75&&e.a[1]<-1140);
      const corner=e.n[0]<-.25&&e.n[1]<-.25&&len>4&&len<9;
      if(!street&&!corner)return false;
      K.wallQuad(stone,0,len,0,hc+.45,3);
      for(let y=.95;y<hc-.8;y+=.65)P.box(shade,0,len,y,y+.10,.006,.028);
      for(const y of [4.3,8.8,13.1,17.8,22.1]){
        P.box(trim,0,len,y,y+.17,.02,.22);
        for(let x=.3;x<len;x+=.5)star(x,y+.34,.13,.10);
      }
      const n=Math.max(1,Math.round(len/3.35)),pitch=len/n;
      const projected=corner?[0]:Array.from({length:n},(_,i)=>i).filter(i=>i>1&&i<n-2&&i%5===2);
      for(let i=0;i<n;i++){
        const x=(i+.5)*pitch;
        K.window({x,y:1.1,w:Math.min(2,pitch-.6),h:2.75,sw:.17,d:.15,surMat:trim,frame:'brown'});
        if(projected.includes(i))continue;
        for(let f=0;f<floors.length;f++){
          const fl=floors[f];window(x,fl.y,Math.min(1.48,pitch-.9),fl.h,fl.head,f===3&&i%3===1);
          if((f===1||f===2)&&i%5===1)balcony(x,fl.y-.14,2.25);
        }
        for(const dx of [-pitch/2+.16,pitch/2-.16]){
          P.box(trim,x+dx-.065,x+dx+.065,4.6,22.4,.01,.11);
        }
      }
      for(const i of projected)bay((i+.5)*pitch,corner?Math.min(3.5,len-.6):2.85,corner);
      for(let x=.65;x<len;x+=.85)ornament(x,22.7,.7);
      // Shaped parapet piers and open iron roof rails between the accents.
      const piers=[.35,len-.35,...projected.map(i=>(i+.5)*pitch)];
      for(const x of piers){
        P.box(stone,x-.45,x+.45,hc+.45,hc+1.25,-.25,.23);
        P.box(trim,x-.6,x+.6,hc+1.25,hc+1.48,-.35,.33);
        P.box(trim,x-.17,x+.17,hc+.68,hc+.85,.24,.30);
      }
      P.box(M.iron,0,len,hc+.95,hc+1,-.10,-.04);
      for(let x=.5;x<len;x+=.32)P.box(M.iron,x-.012,x+.012,hc+.45,hc+.97,-.10,-.07);
      if(street&&e.n[0]<-.75&&len>30){
        const x=len*.58;P.box(brown,x-1.05,x+1.05,.2,3.8,.10,.27);
        for(const dx of [-.85,.85])column(x+dx,.5,3.9,.37);
        G.solid(P,trim,G.shiftPts(G.ogeePts(2.6,.8),x,3.8),.1,.25);
        K.fascia(x-2.4,x-1.4,2.5,3.15,'24',{bg:'#293c51',fg:'#eee6d5',size:.75,z:.3});
      }
      return true;
    }});
  K.ctx.services.muruzi={id:'r946930',corniceHeight:hc,storeys:5,at:[-95.4,-1125.5],reference:'Liteyny 24'};
}
