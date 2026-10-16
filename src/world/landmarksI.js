// landmarksI - the Winter Palace and the Hermitage (docs/research/palace-square-hermitage.md, admiralty-stisaac.md, photos refs/palace-square 015-081 130-136).
//   Files: landmarksI/frame.js (palace frame: origin = Alexander Column, u toward the General Staff arch, v toward the Admiralty) · mats.js (materials, gold / iron / balustrade decals) ·
//   palace.js (the Winter Palace walls from the OSM ring: Rastrelli orders, windows, gateways + passages, courtyard) · roof.js (balustrade statues + vases, chimneys, pediments, Great Church crown, turret) ·
//   hermitage.js (Small / Old / New Hermitage with the portico of the ten atlantes, the Theatre, the Winter Canal arch, the courtyard kiosk) · embank.js (the two lions of the Palace Pier, monuments, photo spots) ·
//   hip.js (hip roofs over any footprint by distance-to-eave heights + mint chimneys) · kit.js / common.js / reliefs.js (stucco vocabulary).
//   Parameters worth knowing: palace.js PL/G0/S2/S3/EN1/EN2 (vertical grammar), hip.js slope/R (roof pitch), hermitage.js atlas() proportions (WX/WR) and the portico FIG positions.
//   Owns every sub-group of layout.GROUPS.landmarksI (see landmarksI/groups.js).  Publishes ctx.services.landmarksI and merges monuments / photo spots into ctx.services.landmarks.
//   NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksI/common.js';
import { makePalaceMats } from './landmarksI/mats.js';

const PARTS = [
  ['palace', () => import('./landmarksI/palace.js'), async (m, K, PM, ctx, svc) => { m.buildPalace(K, PM, svc); }],
  ['roof', () => import('./landmarksI/roof.js'), async (m, K, PM, ctx, svc) => { m.buildRoof(K, PM, ctx, svc); }],
  ['hermitage', () => import('./landmarksI/hermitage.js'), async (m, K, PM, ctx, svc) => { m.buildHermitage(K, PM, ctx, svc); }],
  ['embank', () => import('./landmarksI/embank.js'), async (m, K, PM, ctx, svc) => { m.buildEmbank(K, PM, ctx, svc); }],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  const PM = makePalaceMats(K);
  const root = new THREE.Group(); root.name = 'landmarksI';
  const svc = { statueSpots: [], colliders: [] }, failed = [];
  for (const [name, load, run] of PARTS) {
    try {
      const m = await load();
      K.begin();
      const t0 = K.tris, ms0 = Date.now();
      await run(m, K, PM, ctx, svc);
      K.flush(root, name);
      (svc.partStats ||= {})[name] = { tris: Math.round(K.tris - t0), ms: Date.now() - ms0 };
    } catch (e) {
      if (e && /Failed to fetch|Cannot find module|ERR_MODULE_NOT_FOUND|404/.test(String(e.message || e))) { K.begin(); continue; }    // part not written yet
      console.error(`[landmarksI] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); K.begin();
    }
  }
  ctx.addStatic(root);
  if (typeof process !== 'undefined' && process.env && process.env.LMI_DEBUG) console.log('[landmarksI] parts', JSON.stringify(svc.partStats), 'statues', svc.statues, 'niches', svc.niches, 'hermitage', JSON.stringify(svc.hermitage), 'errors', JSON.stringify(svc.errors), 'colliders', svc.palaceColliders);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(K.svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(K.svc.photoSpots);
  ctx.services.landmarksI = { houses: K.svc.houses, triangles: K.tris, parts: svc, courtyard: K.svc.courtyard || null /* [[x,z]..] ring of the Great Courtyard: ground scatter (grass) should skip it */ };
  if (failed.length) throw new Error('landmarksI parts failed:\n' + failed.join('\n'));
}
