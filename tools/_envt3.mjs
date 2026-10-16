import { env, ctx, L } from './environment-harness.mjs';
import { TREES, TREE_ROWS } from '../src/world/data/city.js';
const f = env.field, trees = env.trees;
const grid = new Map(); for (const t of trees) { const k = Math.floor(t.x/8)*100003+Math.floor(t.z/8); (grid.get(k)||grid.set(k,[]).get(k)).push(t); }
const planted = (x,z)=>{ for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){ const a=grid.get((Math.floor(x/8)+i)*100003+Math.floor(z/8)+j); if(a) for(const t of a) if(Math.hypot(t.x-x,t.z-z)<2.5) return true;} return false; };
const reasons = {}, byArea = {};
let nW = 0, nPl = 0;
for (let i = 0; i < TREES.length; i += 2) {
  const x = TREES[i], z = TREES[i+1]; if (x > -600) continue; nW++;
  if (planted(x,z)) { nPl++; continue; }
  const r = [];
  if (f.claimed(x,z)) r.push('claimed');
  if (f.bldDist(x,z) < 1.1) r.push('bld');
  if (f.roadDist(x,z) < 1.3) r.push('road');
  if (f.pathDist(x,z) < 0.8) r.push('path');
  if (f.hardOnlyDist(x,z) < 1.0) r.push('hard'); if (f.ptDist(x,z) < 1.0) r.push('pts');
  if (f.shore(x,z) < 3) r.push('shore');
  if (!r.length) r.push('other(pack/cleared/nevsky/ext)');
  const k = r.join('+'); reasons[k] = (reasons[k]||0)+1;
  if (!r.includes('claimed')) { const a = Math.round(x/100)*100+','+Math.round(z/100)*100; (byArea[a] ||= []).push(k+'@'+Math.round(x)+','+Math.round(z)); }
}
console.log('OSM west', nW, 'planted', nPl); console.log(JSON.stringify(reasons));
for (const [a, v] of Object.entries(byArea)) console.log(a, v.slice(0,6).join(' | '));
