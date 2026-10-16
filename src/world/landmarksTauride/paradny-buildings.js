import * as L from '../layout.js';
import { buildHouse } from '../landmarksD/house.js';
import { PARADNY_Y } from './paradny-surface.js';
import { PARADNY_ROOFS } from './paradny-roofs.js';

export function paradnyBuildings(K){
 const M=K.mats,P=K.P;
 const colours={'w102153008':['#ddd8cb','#c8c2b5'],'r1967088':['#d9d8cc','#bbb6a8'],'r1452259':['#ddc28b','#b58455'],'r3304715':['#d8c3b2','#b58e78'],'r3304716':['#dfc6a0','#bb8e63']};
 for(const b of L.groupMembers('paradny-quarter')){
  const office=b.kind==='office',levels=office?3:(b.id==='w145419644'?11:9),y=office?0:PARADNY_Y;
  const bodyLevels=office?levels:levels-2,hc=office?13.4:y+bodyLevels*3.2+.2;
  const [colour,accentColour]=colours[b.id]||['#d9c9aa','#ad9475'];
  const wall=K.wall(colour),accent=K.wall(accentColour),stone=K.rust('#77756c');
  const facade=(e,{len})=>{
   K.wallQuad(wall,0,len,y,hc+.45,4);
   if(y>0)K.wallQuad(stone,0,len,0,y-.035,2.4);
   const n=Math.floor(len/3.4);if(!n)return true;const pitch=len/n;
   const middle=Math.floor(n/2),glassStack=!office&&len>20;
   for(let i=0;i<n;i++){
    const x=(i+.5)*pitch,isStack=glassStack&&i===middle;
    for(let f=0;f<bodyLevels;f++){
     const wy=y+1+f*3.2,w=isStack?Math.min(2.7,pitch-.35):1.5,wh=Math.min(2.2,hc-1.25-wy);
     if(f<2||office)K.window({x,y:wy,w,h:wh,sw:.13,frame:'brown',d:.12});
     else{K.glass(M.winBrown,x,wy,w,wh,'flat',isStack?0:i%4,.1);P.box(M.trim,x-w/2-.08,x+w/2+.08,wy-.12,wy-.03,.04,.25);}
    }
    if(!office&&i%3===0&&len>12){
     K.pilaster(accent,x-pitch*.46,.48,y+3.5,hc-y-4.3,.16,.38);
     for(let f=1;f<bodyLevels;f++){
      const by=y+f*3.2+.72;
      P.box(accent,x-1.08,x+1.08,by,by+.18,.18,1.17);
      for(const z of[.22,1.12])P.box(M.ironSoft,x-1.04,x+1.04,by+1.13,by+1.185,z-.025,z+.025);
      for(let v=-.94;v<=.95;v+=.235)P.box(M.ironSoft,x+v-.014,x+v+.014,by+.18,by+1.17,1.095,1.13);
      for(const s of[-1,1])P.box(M.ironSoft,x+s*1.04-.02,x+s*1.04+.02,by+1.13,by+1.185,.2,1.14);
     }
    }
   }
   if(!office&&len>13){
    const x=(middle+.5)*pitch;
    P.box(M.doorDark,x-.93,x+.93,y+.03,y+2.8,.16,.24);
    K.glass(M.winBrown,x,y+.3,1.6,2.2,'flat',1,.265);
    P.box(M.brass,x-.035,x+.035,y+.25,y+2.66,.285,.32);
    P.box(stone,x-1.22,x+1.22,y+2.82,y+3.12,.1,.68);
   }
   return true;
  };
  buildHouse(K,{recs:[b],hc,wall:colour,plinth:0,roofMat:M.graniteWarm,railing:!office,front:facade,
   bands:[{y0:y+3.5,y1:y+3.85,d:.22,mat:accent},{y0:hc-1,y1:hc-.65,d:.24,mat:M.trim}]});
  if(!office&&PARADNY_ROOFS[b.id]?.length){
   const top=hc+6.4,start=hc+.4;
   buildHouse(K,{recs:[{...b,id:b.id+'-terrace',polys:PARADNY_ROOFS[b.id]}],hc:top,wall:colour,plinth:0,railing:false,collide:false,roofMat:M.roofSilver,
    front:(e,{len})=>{K.wallQuad(wall,0,len,start,top+.45,4);const n=Math.floor(len/3.6);for(let i=0;i<n;i++){const x=(i+.5)*len/n;for(let f=0;f<2;f++){const wy=start+.45+f*3;K.window({x,y:wy,w:2.25,h:Math.min(2.2,top-1.35-wy),sw:.13,frame:'brown',d:.12});}K.pilaster(accent,x-len/n*.47,.36,start,top-start-.8,.15,.28);}return true;}});
  }
 }
}
