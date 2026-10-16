// landmarksPetroMonuments - the statues, busts, sculptures, fountains, steles and memorials of Petrogradsky Island that no other module draws.  Dossier docs/research/petro-monuments-2026.md (the
// critic-merged plan; the BUILD LOG at its end) + the two catalogues petro-monuments-2026-north / -south (.md and .json), photos SP/refs/pmn and SP/refs/pm_south.
// Each monument is a PIECE (run.js): modelled once in a local frame with the figure kit (lib/figures.js: bronze figures, busts, animals) and hand-built forms (solids.js, sty.js), put at its OSM position (slid off
// a carriageway or skipped) as small meshes that the engine merges per cell and hides by size class (a monument costs no draw call of its own; plain surfaces share ONE vertex-colour material, mats.js).
// Colliders: plinths and basins are solid.  Name plates carry the real texts (platetext.js, reserved in ctx.services.labels).  A piece is built only when its id is in a claim of groups.js (no double drawing).
// User rules: no flags / flagpoles / pennants (the cameraman's film banners are NOT drawn), no alarm sounds, no logos.  Fountains: static basins, water and jet strips scrolled by the shared uTime (no callbacks).
// Files: landmarksPetroMonuments/ kit.js objs.js solids.js sty.js (collector, piece sets, solids, helpers)  mats.js plates.js platetext.js (materials, plate atlas, texts)  run.js (piece runner)  groups.js
//   (claims)  busts.js men.js peter.js violins.js small.js alexander.js fountains.js (each exports PIECES)  Tools: tools/landmarksPetroMonuments-*.mjs.
// Publishes ctx.services.landmarksPetroMonuments = { monuments, photoSpots, drawn (OSM ids drawn), skipped, moved, triangles, parts, buildMs } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeMats } from './landmarksPetroMonuments/mats.js';
import { placePiece } from './landmarksPetroMonuments/run.js';
import { GROUPS_LIST } from './landmarksPetroMonuments/groups.js';

const FILES = ['busts', 'men', 'men2', 'peter', 'violins', 'small', 'alexander', 'fountains'];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksPetroMonuments';
  const svc = { monuments: [], photoSpots: [], drawn: [], skipped: [], moved: [], triangles: 0, parts: {}, failed: [], fountains: [] };
  const claimed = new Set(GROUPS_LIST.flatMap((g) => [...(g.ids || []), ...(g.osm || [])]));
  const labels = ctx.services.labels || null;
  const K = { ctx, M, root, svc, labels, THREE, claimed };
  for (const name of FILES) {
    try {
      const m = await import(`./landmarksPetroMonuments/${name}.js`);
      for (const pc of (m.PIECES || [])) {
        if (!claimed.has(pc.id)) continue;                                 // built only when the claim is on: no double drawing with the generic city
        try { placePiece(K, pc); } catch (e) { console.error(`[landmarksPetroMonuments] ${name}/${pc.key} failed:`, e); svc.failed.push(`${name}/${pc.key}: ${e && e.stack || e}`); }
      }
      if (m.build) await m.build(K);
    } catch (e) { console.error(`[landmarksPetroMonuments] ${name} failed:`, e); svc.failed.push(`${name}: ${e && e.stack || e}`); }
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksPetroMonuments = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.PM_DEBUG === '2') for (const [key, p] of Object.entries(svc.parts)) console.log('PM_PART ' + JSON.stringify({ key, ...p }));
  if (typeof process !== 'undefined' && process.env && process.env.PM_DEBUG) console.log('[landmarksPetroMonuments] tris', svc.triangles, 'drawn', svc.drawn.length, 'skipped', JSON.stringify(svc.skipped), 'moved', JSON.stringify(svc.moved), 'plates refused by the label registry', JSON.stringify(svc.plateRefused || []));
  if (svc.failed.length) throw new Error('landmarksPetroMonuments parts failed:\n' + svc.failed.join('\n'));
}
