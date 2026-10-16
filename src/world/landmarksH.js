// landmarksH - the Admiralty (Главное Адмиралтейство) with its gilded spire (72 m) that ends the Nevsky vista, the Alexander Garden and the Admiralty (Neva) garden, Senate Square with the Bronze Horseman,
// the Senate and Synod buildings (Rossi) with the arch over Galernaya.  St Isaac's Cathedral + square is landmarksJ, the Winter Palace landmarksI, Palace Square landmarksG, canals / quays environment.
// Dossiers docs/research/admiralty-stisaac.md (primary; CRITIC LOG applied), palace-square-hermitage.md, west-nevsky-3.md; photos refs/admiralty 001 004 007 008 014 025 026 029 033 ... (see the part files).
//   Files: landmarksH/frame.js (the Admiralty frame) · mats.js (materials / textures) · common.js + kit.js + reliefs.js + sculpt.js (stucco vocabulary, copied from landmarksG) · tower.js (gate tower, spire)
//   · facade.js (the 408 m garden facade, wings, porticoes, Neva pavilions, yards, roofs, colliders) · garden.js (Alexander + Admiralty gardens) · senate.js (Senate, Synod, arch) · horseman.js (Bronze Horseman,
//   Thunder Stone, plaza) · groups.js (the claims).
//   Owns every sub-group of layout.GROUPS.landmarksH.  Publishes ctx.services.landmarksH and merges monuments / photoSpots into ctx.services.landmarks.  NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksH/common.js';
import { makeH } from './landmarksH/mats.js';

const PARTS = [
  ['tower', () => import('./landmarksH/tower.js')],
  ['facade', () => import('./landmarksH/facade.js')],
  ['garden', () => import('./landmarksH/garden.js')],
  ['senate', () => import('./landmarksH/senate.js')],
  ['horseman', () => import('./landmarksH/horseman.js')],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [], spots: {}, benches: [], lamps: [] };
  const H = makeH(K);
  const root = new THREE.Group(); root.name = 'landmarksH'; K.root = root;
  const failed = [], t0 = Date.now(), times = {};
  for (const [name, load] of PARTS) {
    const t = Date.now();
    try {
      const m = await load();
      K.begin();
      await m.build(K, ctx, H);
      K.flush(root, name);
    } catch (e) {
      if (e && e.code === 'ERR_MODULE_NOT_FOUND') { times[name] = 0; K.begin(); continue; }
      console.error(`[landmarksH] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); K.begin();
    }
    times[name] = Date.now() - t;
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(K.svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(K.svc.photoSpots);
  ctx.services.landmarksH = { houses: K.svc.houses, entrances: K.svc.entrances, spots: K.svc.spots, benches: K.svc.benches, lamps: K.svc.lamps, tower: K.svc.tower, triangles: K.tris, ms: Date.now() - t0, times };
  if (failed.length) throw new Error('landmarksH parts failed:\n' + failed.join('\n'));
}
