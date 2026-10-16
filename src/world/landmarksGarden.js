// landmarksGarden - the SUMMER GARDEN (Летний сад) and its famous fences: the Neva fence (36 pink granite columns with urns, 32 black-and-gold panels, three gates), the Moika fence with the eagle columns and the
// porphyry vase, the garden itself (gravel alleys, lawns, lattice hedges, lime avenues, bosquet woods, the Carp and Menagerie ponds, the fountains), the white marble sculpture (92 statues / groups / busts on pale
// pedestals + the Krylov monument), the Summer Palace of Peter I, the Coffee House, the Tea House, the Small Orangery and the garden pavilions.
// Dossier docs/research/summer-garden.md (+ summer-garden-houses.json), brief docs/MARS-BRIEF.md, photos refs/summer-garden.  User rules: no flags / flagpoles, no alarm sounds.
// Files: landmarksGarden/frame.js (frame G, ring, fence data) mats.js inst.js · fence.js (Neva + Moika fences, gates, vase) · ground.js (lawns, alleys, ponds, fountains) · hedges.js (lattice hedges, trees) ·
// sculpture.js (statues, busts, Krylov) · buildings.js (palace, coffee / tea houses, orangery, pavilions, booths) · groups.js (claims) · kit.js geo.js trees.js treegeo.js leafmat.js util.js (copies of landmarksK).
// Publishes ctx.services.landmarksGarden = { entrances, statues, crowd, fences, photoSpots, ring, ... } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksGarden/kit.js';
import { makeMats } from './landmarksGarden/mats.js';
import { GARDEN_RING } from './landmarksGarden/groups.js';

const PARTS = [
  ['fence', () => import('./landmarksGarden/fence.js')],
  ['ground', () => import('./landmarksGarden/ground.js')],
  ['hedges', () => import('./landmarksGarden/hedges.js')],
  ['sculpture', () => import('./landmarksGarden/sculpture.js')],
  ['buildings', () => import('./landmarksGarden/buildings.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksGarden';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], statues: [], fences: [], triangles: 0, parts: {}, ring: GARDEN_RING };
  const failed = [];
  for (const [name, load] of PARTS) {
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksGarden] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksGarden] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksGarden = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.GARDEN_DEBUG) console.log('[landmarksGarden] parts', JSON.stringify(svc.parts), JSON.stringify(svc.neva), JSON.stringify(svc.moika), JSON.stringify(svc.groundStats), JSON.stringify(svc.hedges), JSON.stringify(svc.trees), JSON.stringify(svc.sculptureStats), 'treeTris', svc.treeTris);
  if (failed.length) throw new Error('landmarksGarden parts failed:\n' + failed.join('\n'));
}
