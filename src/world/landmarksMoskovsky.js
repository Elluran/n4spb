import * as THREE from 'three';
import { BUILDINGS, MONUMENTS, ENTRANCES } from './data/city.js';
import { GROUPS_LIST } from './landmarksMoskovsky/groups.js';
import { makeKit } from './landmarksMoskovsky/common.js';
import { gate } from './landmarksMoskovsky/gate.js';
import { church, palace } from './landmarksMoskovsky/chesme.js';
import { soviets, lenin, metroEntrances } from './landmarksMoskovsky/soviets.js';
export const OWNS_GROUPS = true;

export function build(ctx){
  const t0=performance.now(),root=new THREE.Group();root.name='landmarksMoskovsky';
  const svc={houses:[],monuments:[],photoSpots:[],entrances:[],parts:{},triangles:0};
  const K=makeKit(ctx,root,svc);
  const records=key=>{const g=GROUPS_LIST.find(g=>g.key===key),ids=new Set(g.ids);return BUILDINGS.filter(b=>ids.has(b.id)||ids.has(b.parent));};
  const monument=key=>{const g=GROUPS_LIST.find(g=>g.key===key);return MONUMENTS.find(b=>g.osm.includes(b.id))||BUILDINGS.find(b=>g.ids.includes(b.id));};
  for(const [name,fn] of [
    ['gate',()=>gate(K,monument('moskovsky-gate'))],
    ['chesme-church',()=>church(K,records('moskovsky-chesme-church'))],
    ['chesme-palace',()=>palace(K,records('moskovsky-chesme-palace').filter(b=>!b.skip))],
    ['soviets',()=>soviets(K,records('moskovsky-soviets'))],
    ['square',()=>{lenin(K,monument('moskovsky-square'));metroEntrances(K,ENTRANCES.filter(e=>(e.layer??0)>=0&&e.z>8200&&e.z<9500&&e.x<-650&&e.x>-2350));}],
  ]){K.begin();fn();K.flush(name);}
  ctx.addStatic(root);
  const landmarks=(ctx.services.landmarks||={});for(const k of ['monuments','photoSpots'])landmarks[k]=(landmarks[k]||[]).concat(svc[k]);
  ctx.services.landmarksMoskovsky={...svc,buildMs:Math.round(performance.now()-t0)};
}
