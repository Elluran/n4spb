// Moscow Victory Park formal ensemble and SKA Arena, surveyed from OSM and
// real exterior photographs (docs/research/victory-park.md). Summer, no flags.
// Generic environment owns park terrain, ponds, mature trees and paths. All
// additions are immutable spatially bounded statics, with no update callbacks.
export const OWNS_GROUPS = true;
import * as THREE from 'three';
import { ParkKit } from './landmarksVictoryPark/kit.js';
import { mats } from './landmarksVictoryPark/mats.js';
import { entrance, fountain } from './landmarksVictoryPark/ensemble.js';
import { heroes } from './landmarksVictoryPark/sculptures.js';
import { arena } from './landmarksVictoryPark/arena.js';

export function build(ctx) {
 const t0=performance.now(),root=new THREE.Group();root.name='landmarksVictoryPark';
 const svc={monuments:[],photoSpots:[],entrances:[],benches:[],lamps:[]},P=new ParkKit(ctx,root),M=mats(ctx);
 P.noOutlineMaterials.add(M.water);P.noOutlineMaterials.add(M.foam);
 entrance(ctx,P,M,svc);fountain(ctx,P,M,svc);heroes(ctx,P,M,svc);arena(ctx,P,M,svc);
 const out=P.finish();ctx.addStatic(root);
 const shared=ctx.services.landmarks ||= {};shared.monuments=(shared.monuments||[]).concat(svc.monuments);shared.photoSpots=(shared.photoSpots||[]).concat(svc.photoSpots);
 ctx.services.landmarksVictoryPark={...svc,triangles:out.tris,buildMs:Math.round(performance.now()-t0),updates:0};
}
