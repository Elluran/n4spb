// landmarksD - sights of the north and south of the map (docs/research/landmarksD.md): the Vladimirsky Cathedral with its bell tower and church yard fence, the National Library (the Catherine
// Institute of Quarenghi, Fontanka 36), the Mariinsky hospital main block (Liteyny 56), the Tolstoy House (Rubinshteyna 15-17 / Fontanka 54) with Rubinshteyna 13, the Vladimirsky Passage
// (Vladimirsky 19, Art Nouveau), the Renaissance Hall (with the arched entrance of the Dostoevskaya metro vestibule) and the Dostoevsky monument.
//   Files: landmarksD/kit.js, common.js, reliefs.js, house.js (the stucco-facade vocabulary copied from landmarksB / landmarksC) · parts.js (domes, columns, portico, iron fences) ·
//   cathedral.js · library.js · hospital.js · tolstoy.js · passage.js (Passage + Renaissance Hall + monument) · fences.js (OSM BARRIERS of the sights).
//   Owns every sub-group of layout.GROUPS.landmarksD (library, vladimirsky, tolstoy, dostoevsky; the North claims only 'library', see PARTS).  Publishes ctx.services.landmarksD = { houses, entrances, triangles } and merges monuments / photoSpots
//   into ctx.services.landmarks.  Heights come from the research (OSM levels are low).  NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksD/common.js';

// [part, the sub-group of layout.GROUPS.landmarksD it draws (null: fences.js picks its regions by sub-group itself), loader]. A part is built only when the area claims its sub-group: the strip claims all
// four, the North only 'library' (landmarksD/groups.js), where 'library' and 'hospital' (the Mariinsky block w60353337 is the second id of that sub-group) draw and the other parts would hard-code
// Vladimirsky / Rubinshteyna places 700 m outside the area (and the cathedral part throws without its records).
const PARTS = [
  ['cathedral', 'vladimirsky', () => import('./landmarksD/cathedral.js')],
  ['library', 'library', () => import('./landmarksD/library.js')],
  ['hospital', 'library', () => import('./landmarksD/hospital.js')],
  ['tolstoy', 'tolstoy', () => import('./landmarksD/tolstoy.js')],
  ['passage', 'dostoevsky', () => import('./landmarksD/passage.js')],
  ['fences', null, () => import('./landmarksD/fences.js')],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  const root = new THREE.Group(); root.name = 'landmarksD';
  const failed = [];
  const claimed = new Set((K.L.GROUPS.landmarksD || []).map((g) => g.key));      // the sub-groups of THIS area
  for (const [name, group, load] of PARTS) {
    if (group && !claimed.has(group)) continue;
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
