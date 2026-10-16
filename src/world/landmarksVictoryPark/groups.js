// Claims for authored park monuments / fountain and the present-day arena.
// OpenStreetMap API map extract 2026-10-11; park lawns, nine pond outlines,
// paths and trees remain environment/street data, with no duplicate terrain.
import { ll, porticoFrame } from './sites.js';
export const HERO_IDS = ['n3039562533','n3039562534','n3039562536','n3039562537','n3039562538','n3039562539','n3039562535','n3039594770','n3039594771','n3039594772','n3039594773','n3039594774','n3039594775','n3039594776','n3039594777','n3039594778','n3039594779','n3039594780','n4485911838','n4485911839','n5141526656','n11209562878'];
export const GROUPS_LIST = [
  {key:'victory-park-memorials',name:'Московский парк Победы: пропилеи, фонтан и Аллея Героев',nameEn:'Moscow Victory Park memorial ensemble',ids:['r15756570','r15756569'],osm:['w32073130','n360040747','n3162854862','n4485862678','n1521009686',...HERO_IDS],at:[-1683,7074],note:'Mapped roof relations own the paired open four-column propylea; Glory wreath fountain, wartime/later hero busts, Zhukov, Matrosov, Zoya and trolley. OSM greens/ponds/paths remain generic.'},
  {key:'victory-ska-arena',name:'СКА Арена',nameEn:'SKA Arena exterior',ids:['w1024552165'],osm:[],at:[-561,7045],note:'Present-day oval silver roof and inclined exterior truss colonnade. OSM footprint determines scale and position; closed exterior only.'},
];

// Only actual architectural footprints, not the whole formal plaza: generic
// mapped approach paving and the surrounding historic trees remain intact.
const f=ll(30.3222081,59.8689453);
export const PAVED_RINGS = [
 {id:'victory-north-portico',ring:porticoFrame('r15756570').ring},
 {id:'victory-south-portico',ring:porticoFrame('r15756569',true).ring},
 {id:'victory-glory-basin',ring:Array.from({length:48},(_,i)=>[f.x+12.6*Math.cos(i*Math.PI/24),f.z+12.6*Math.sin(i*Math.PI/24)])},
];
