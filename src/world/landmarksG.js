// landmarksG - Palace Square (Дворцовая площадь): the General Staff Building (Rossi) with the Triumphal Arch and the Chariot of Glory, the Guards Corps Headquarters (Bryullov), the Alexander Column
// with its fence, the stone-field paving, the Montferrand lamps.  The Winter Palace + Hermitage are landmarksI, the Admiralty landmarksH, the Palace Bridge / canals other agents.
// Dossier docs/research/palace-square-hermitage.md (sections 1-7, 9, 12, 14), refs/palace-square photos 082 083 086 090 093 098 099 105 113 117; docs/research/admiralty-stisaac.md (view to the west).
//   Files: landmarksG/frame.js (the palace-axis frame) · mats.js (materials, textures) · sculpt.js (horse, warrior, victory, eagle, angel) · kit.js / common.js / reliefs.js / house.js / parts.js (stucco vocabulary,
//   copied from landmarksD) · column.js · gstaff.js (the two wings) · arch.js (arch + passage + chariot) · guards.js · square.js (paving, lamps, furniture, spots) · groups.js (the claims).
//   Owns every sub-group of layout.GROUPS.landmarksG.  Publishes ctx.services.landmarksG = { column, arch, paving, spots, triangles } and merges monuments / photoSpots into ctx.services.landmarks.
//   Wave 3 (2026-10-04): the whole square is paved as in the photos (square.js: stone field with ~9.7 m fields of concentric setts, grey bands + pink inlays + diagonal belts, granite outline + the thick ring round the
//   column; worn blotchy asphalt with repair patches; the 8-row dashed zebra strip in front of the Winter Palace; granite lattice pavement incl. the strip in front of the arch; palace lamps, west bollards), the east
//   arc of the General Staff (it was never built: sign bug in gstaff.js) and rebuilt lofted horses of the Chariot of Glory (sculpt.js + loft.js, technique copied from landmarksH/bronze_geom.js).
//   Also publishes ctx.services.landmarksG.paving = { field (ring [[x,z]..] of the stone field), square (ring of OSM r1947508) }.
//   NO flags / flagpoles, no alarm sounds (user rules).
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksG/common.js';
import { makeG } from './landmarksG/mats.js';

const PARTS = [
  ['column', () => import('./landmarksG/column.js')],
  ['gstaff', () => import('./landmarksG/gstaff.js')],
  ['arch', () => import('./landmarksG/arch.js')],
  ['guards', () => import('./landmarksG/guards.js')],
  ['square', () => import('./landmarksG/square.js')],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [], spots: {} };
  K.G = makeG(K);
  const root = new THREE.Group(); root.name = 'landmarksG'; K.root = root;
  const failed = [], t0 = Date.now(), times = {};
  for (const [name, load] of PARTS) {
    const t = Date.now();
    try {
      const m = await load();
      K.begin();
      await m.build(K, ctx);
      K.flush(root, name);
    } catch (e) { console.error(`[landmarksG] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); K.begin(); }
    times[name] = Date.now() - t;
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(K.svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(K.svc.photoSpots);
  ctx.services.landmarksG = { houses: K.svc.houses, entrances: K.svc.entrances, spots: K.svc.spots, paving: { field: K.fieldRing || null, square: K.squareRing || null }, triangles: K.tris, ms: Date.now() - t0, times };
  if (failed.length) throw new Error('landmarksG parts failed:\n' + failed.join('\n'));
}
