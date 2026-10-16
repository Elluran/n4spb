// landmarksUniversity - Universitetskaya embankment inside region V1 (docs/PETRO-BRIEF.md): the Kunstkamera with its tower and the armillary sphere, the Academy of Sciences (Quarenghi's
// eight-column portico on the granite storey) with its Museum wing, the Twelve Collegia (twelve red-and-white sections end-on to the Neva, the west gallery, the garden fence), the
// Lomonosov monument on its red granite pedestal, Novobirzhevoy Gostiny Dvor, the Rector's wing and the Palace of Peter II.
// Dossier docs/research/university-embankment.md (+ university-embankment-houses.json), photos refs/university, requests to the other owners docs/research/petro-requests-landmarksUniversity.md.
// User rules: no flags / flagpoles (the Academy, the University gate and Sakharov Square normally carry them: omitted), no banners, no alarm sounds.
// Files: landmarksUniversity/frame.js (frames of the buildings) mats.js (materials, bay textures, the canvas vocabulary) shell.js (edge-based walls, cornices, roofs, balustrades, prisms)
// plaques.js (wall plates with the real texts) kit.js prims.js surfaces.js (copies) · kunstkamera.js · academy.js (+ Museum wing) · collegia.js · monuments.js (Lomonosov, Sakharov, the "universants" genius) · fronts.js (Rector's wing, Palace of Peter II, Gostiny Dvor) · groups.js (claims).
// Publishes ctx.services.landmarksUniversity = { monuments, photoSpots, entrances, crowd, fences, benches, tower, parts, triangles } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksUniversity/kit.js';
import { makeMats } from './landmarksUniversity/mats.js';

const PARTS = [
  ['kunstkamera', () => import('./landmarksUniversity/kunstkamera.js'), 'kunstkamera'],
  ['academy', () => import('./landmarksUniversity/academy.js'), 'academy'],
  ['museumWing', () => import('./landmarksUniversity/academy.js'), 'museumWing'],
  ['collegia', () => import('./landmarksUniversity/collegia.js'), 'collegia'],
  ['monuments', () => import('./landmarksUniversity/monuments.js'), 'monuments'],
  ['rector', () => import('./landmarksUniversity/fronts.js'), 'rector'],
  ['peter2', () => import('./landmarksUniversity/fronts.js'), 'peter2'],
  ['gostiny', () => import('./landmarksUniversity/fronts.js'), 'gostiny'],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksUniversity';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], fences: [], benches: [], triangles: 0, parts: {} };
  const failed = [];
  for (const [name, load, fn] of PARTS) {
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m[fn](K);
    } catch (e) { console.error(`[landmarksUniversity] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksUniversity] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name: 'lmU-' + name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksUniversity = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.UNIVERSITY_DEBUG) console.log('[landmarksUniversity] parts', JSON.stringify(svc.parts));
  if (failed.length) throw new Error('landmarksUniversity parts failed:\n' + failed.join('\n'));
}
