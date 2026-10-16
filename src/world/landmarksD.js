// landmarksD - sights of the north and south of the map (docs/research/landmarksD.md): the Vladimirsky Cathedral with its bell tower and church yard fence, the National Library (the Catherine
// Institute of Quarenghi, Fontanka 36), the Mariinsky hospital main block (Liteyny 56), the Tolstoy House (Rubinshteyna 15-17 / Fontanka 54) with Rubinshteyna 13, the Vladimirsky Passage
// (Vladimirsky 19, Art Nouveau), the Renaissance Hall (with the arched entrance of the Dostoevskaya metro vestibule) and the Dostoevsky monument.
//   Files: landmarksD/kit.js, common.js, reliefs.js, house.js (the stucco-facade vocabulary copied from landmarksB / landmarksC) · parts.js (domes, columns, portico, iron fences) ·
//   cathedral.js · library.js · hospital.js · tolstoy.js · passage.js (Passage + Renaissance Hall + monument) · fences.js (OSM BARRIERS of the sights).
//   Owns every sub-group of layout.GROUPS.landmarksD (library, vladimirsky, tolstoy, dostoevsky).  Publishes ctx.services.landmarksD = { houses, entrances, triangles } and merges monuments / photoSpots
//   into ctx.services.landmarks.  Heights come from the research (OSM levels are low).  NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksD/common.js';

const PARTS = [
  ['cathedral', () => import('./landmarksD/cathedral.js')],
  ['library', () => import('./landmarksD/library.js')],
  ['hospital', () => import('./landmarksD/hospital.js')],
  ['tolstoy', () => import('./landmarksD/tolstoy.js')],
  ['passage', () => import('./landmarksD/passage.js')],
  ['fences', () => import('./landmarksD/fences.js')],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  const root = new THREE.Group(); root.name = 'landmarksD';
  const failed = [];
  for (const [name, load] of PARTS) {
    try {
      const m = await load();
      K.begin();
      await m.build(K, ctx);
      K.flush(root, name);
    } catch (e) { console.error(`[landmarksD] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); K.begin(); }
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(K.svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(K.svc.photoSpots);
  ctx.services.landmarksD = { houses: K.svc.houses, entrances: K.svc.entrances, triangles: K.tris };
  if (failed.length) throw new Error('landmarksD parts failed:\n' + failed.join('\n'));
}
