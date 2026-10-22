// landmarksTauride - the Tauride Palace, the Paradny Quarter (docs/TAURIDE-REMAKE.md, phase T1) and the land relief of the garden (T2): a North module. The Garden is NOT here: the old garden.js / terrain.js of the source are not ported and the garden is
// rewritten by the later phases (T2-T6), so for now the generic North draws the garden (the park polygon, the ways) and this module claims only the palace and the quarter.
// SOURCE: 102_3d_piter src/world/landmarksTauride.js, commit 0568f7af. The palace() function and the imports of the palace and the quarter are the source's text; changed: the garden import and call are gone and the service is
// built from the quarter only (the source merged the garden's deckY, entrances, benches and ponds into it: `deckY` here is the Paradny deck alone; the quarter and the palace publish no entrances: they have none).
import * as THREE from 'three';
import * as L from './layout.js';
import { makeKit } from './landmarksD/common.js';
import { buildHouse } from './landmarksD/house.js';
import { dome, drum, ringWindows } from './landmarksD/parts.js';
import { PALACE_PARTS } from './landmarksTauride/palace-parts.js';
import { paradnyBuildings } from './landmarksTauride/paradny-buildings.js';
import { paradnyCourts } from './landmarksTauride/paradny-courts.js';
import { gardenHeight } from './landmarksTauride/height.js';
import { planTerrain, buildTerrain } from './landmarksTauride/terrain-mesh.js';
export const OWNS_GROUPS = true;

function palace(K) {
  const P=K.P,M=K.mats,wall=K.wall('#dfc285');
  const rec=L.groupMembers('tauride-palace')[0];
  if(rec)for(const part of PALACE_PARTS)buildHouse(K,{recs:[{...rec,polys:[part.poly]}],hc:part.hc,wall:'#dfc285',plinth:0.55,railing:false,roofMat:M.roofGreen,
    front:(e,{len})=>{
      K.wallQuad(wall,0,len,0,part.hc+.45,3);
      const n=Math.floor(len/4.3);for(let i=0;i<n;i++){
        const x=(i+0.5)*len/n;
        K.window({x,y:1.35,w:1.5,h:4.25,sw:0.16,frame:'white'});
        if(part.hc>8)K.window({x,y:part.hc-4.4,w:1.45,h:2.4,sw:0.13,frame:'white'});
      }
      return true;
    },bands:[{y0:part.hc-.7,y1:part.hc-.35,d:0.18,mat:M.trim}]});
  // Central high block and broad drum. All boxes are closed (undersides too).
  P.push(1378.7,0,-1733.8,-0.023);
  drum(K,wall,0,7.5,17.38,20.9,12.7,48);
  ringWindows(K,0,7.5,12.76,20,{x:0,y:18.0,w:1.5,h:1.85,sw:0.1,frame:'white'},0,48);
  P.col(M.trim,0,7.5,20.95,21.4,13,13,48);
  dome(K,M.roofGreen,0,21.43,7.5,13.1,0.44);
  // Six-column Doric portico faces Shpalernaya; no flagpoles.
  P.push(0,0,-14.8,Math.PI);
  const xs=[-10.1,-6.06,-2.02,2.02,6.06,10.1];
  for(const x of xs){
    P.box(M.graniteWarm,x-0.85,x+0.85,0,0.3,4.3,6);
    P.col(M.trim,x,5.1,0.3,12.05,0.72,0.60,20);
    P.col(M.trim,x,5.1,11.9,12.4,0.65,0.9,20);
    P.box(M.trim,x-0.94,x+0.94,12.4,12.72,4.16,6.04);
  }
  P.box(M.trim,-13.1,13.1,12.72,13.35,-0.2,6.1);
  P.box(wall,-13,13,13.35,14.38,-0.15,6);
  for(let i=-12;i<=12;i+=1.5)P.box(M.trim,i-0.19,i+0.19,13.45,14.22,6.03,6.17);
  P.box(M.trim,-13.5,13.5,14.4,14.9,-0.3,6.4);
  const ped=new THREE.Shape();ped.moveTo(-13.5,14.95);ped.lineTo(13.5,14.95);ped.lineTo(0,18.8);ped.closePath();P.extrude(M.trim,ped,0.45,5.97,1,1);
  const tym=new THREE.Shape();tym.moveTo(-11.3,15.3);tym.lineTo(11.3,15.3);tym.lineTo(0,18.3);tym.closePath();P.extrude(wall,tym,0.055,6.45,1,1);
  for(const x of [-6,0,6]){P.box(M.doorWood,x-0.86,x+0.86,0.15,4.5,0.03,0.15);P.box(M.brass,x-0.035,x+0.035,0.25,4.4,0.18,0.22);}
  P.pop();P.pop();
}

export function build(ctx) {
  const K=makeKit(ctx),root=new THREE.Group();root.name='landmarks-tauride';K.svc={houses:[],entrances:[],monuments:[],photoSpots:[]};
  K.begin();palace(K);K.flush(root,'tauride-palace');
  K.begin();paradnyBuildings(K);K.flush(root,'paradny-quarter');
  K.begin();const courts=paradnyCourts(K,root);K.flush(root,'paradny-courts');
  // T2: the land relief of the garden (hills, mounds, the memorial plateau): the pure gardenHeight sampled into <= 16 chunk meshes (no colliders: the player follows heightAt, the same function as the HEIGHT_PATCH 'garden')
  const terrain=buildTerrain(ctx,root,planTerrain());ctx.addStatic(root);
  // The service the engine reads (docs/AREAS.md 9.1 HOOKS.deckServices, docs/TAURIDE-REMAKE.md T1): deckY(x, z) = the Paradny podium (3.3 m) and its eight stair ramps, else null; cars (drive/handling.js)
  // and walkers (people/nav.js surfaceY) ask it FIRST. The later phases compose the garden bridges into it (`courts.deckY(x,z) ?? bridgesDeckY(x,z)`). No `entrances`: PRUNE_SERVICES does not list this module.
  ctx.services.landmarksTauride={paradny:courts,deckY:(x,z)=>courts.deckY(x,z),terrain:{heightAt:gardenHeight,triangles:terrain.triangles,draws:terrain.draws},kitTriangles:K.tris,triangles:K.tris+terrain.triangles};
}
