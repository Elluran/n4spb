// landmarksMars - the Mars Field (Марсово поле: gravel alleys, plaza, rondels, lime rows, lamps, benches), the Memorial to the Fighters of the Revolution with the Eternal Flame, Suvorov Square with the
// Suvorov monument, the Marble Palace with its forecourt fence and the Alexander III monument, the service wing, the Saltykov and Betsky houses and the Pavlovsky Barracks.
// Dossier docs/research/mars-field.md (+ mars-field-houses.json), brief docs/MARS-BRIEF.md, photos refs/mars-field.  User rules: no flags / flagpoles (the memorial, the palace and the barracks normally carry
// them: omitted), no alarm sounds.
// Files: landmarksMars/frame.js (field frame) mats.js surfaces.js (ribbons clipped at net.cover) inst.js (instanced parts) · field.js (alleys, plaza, rondels, trees, lamps, benches) · memorial.js ·
// suvorov.js · palace.js · barracks.js · houses.js · groups.js (claims) · kit.js common.js house.js parts.js reliefs.js geo.js trees.js treegeo.js leafmat.js util.js (copies of landmarksK).
// Publishes ctx.services.landmarksMars = { benches, lamps, rondels, entrances, photoSpots, crowd, memorial, fences, ... } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksMars/kit.js';
import { makeMats } from './landmarksMars/mats.js';
import { makeKit } from './landmarksMars/common.js';

const PARTS = [
  ['field', () => import('./landmarksMars/field.js')],
  ['memorial', () => import('./landmarksMars/memorial.js')],
  ['suvorov', () => import('./landmarksMars/suvorov.js')],
];

const HOUSES = [
  ['palace', () => import('./landmarksMars/palace.js')],
  ['houses', () => import('./landmarksMars/houses.js')],
  ['barracks', () => import('./landmarksMars/barracks.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksMars';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], fences: [], benchPoints: [], triangles: 0, parts: {} };
  const failed = [];
  for (const [name, load] of PARTS) {
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksMars] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksMars] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material) || M.flames.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  // the stucco buildings (Marble Palace, service wing, Saltykov / Betsky houses, barracks) use the facade vocabulary kit
  const KH = makeKit(ctx); KH.svc = { houses: [], entrances: [], monuments: svc.monuments, photoSpots: svc.photoSpots, fences: svc.fences, crowd: svc.crowd }; KH.root = root; KH.M = M;
  for (const [name, load] of HOUSES) {
    const t1 = performance.now();
    try { const m = await load(); KH.begin(); await m.build(KH, ctx); KH.flush(root, name); } catch (e) { console.error(`[landmarksMars] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); KH.begin(); }
    svc.parts[name] = { ms: Math.round(performance.now() - t1) };
  }
  svc.triangles += KH.tris; svc.houses = KH.svc.houses;
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksMars = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.MARS_DEBUG) console.log('[landmarksMars] parts', JSON.stringify(svc.parts));
  if (failed.length) throw new Error('landmarksMars parts failed:\n' + failed.join('\n'));
}
