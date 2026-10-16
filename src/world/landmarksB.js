// landmarksB - the individual landmark houses of Nevsky Prospekt between Vosstaniya Square and the Liteyny / Vladimirsky crossroads (docs/research/nevsky.md).
//   Nevsky Atrium (Nevsky 71 / Marata 1) with the Mayakovskaya metro arches, Nevsky Centre (114-116), the Yusupova house (84-86) with its Ionic portico, the "San Remo" corner house
//   (90-92, Menyaev / Bruni) with its courtyard wing, Dom Kozhevnikova (51), Dom zhurnalista (70, Sukhozanet house) and the evangelical mission in the Colosseum courtyard (Nevsky 100).
//   Files: landmarksB/kit.js (geometry collector, facade frames, mitred bands) · common.js (palette, textures, materials, stucco vocabulary: windows, hoods, balconies, columns ...) ·
//   house.js (footprint -> walls, party walls, plinth, cornice, roof, colliders) · one file per house.
//   Owns every sub-group of layout.GROUPS.landmarksB (nevsky-centre, atrium, yusupova, nevsky-corner). Publishes ctx.services.landmarks (merged: monuments, photoSpots) and
//   ctx.services.landmarks.landmarksB = { houses: [{ id, name, nameEn, x, z }], entrances: [{ x, z, rotY, bldg, kind }] }.
//   NO flags / flagpoles (user rule). Night: windows and shop glass glow with ctx.shared.uNight (emissive maps).
// STATUS (end of session 1)
//   DONE (photo-checked, z-fight sweep 0.00x %): Nevsky Atrium incl. the Mayakovskaya arches (real holes at layout.DOORWAYS mayakovskaya-in / -out, closed doors if absent), rounded corner,
//     roof lettering; Yusupova house with the Ionic portico; "San Remo" corner house 90-92 + courtyard wing; Dom Kozhevnikova 51; Dom zhurnalista 70; the mission (plain);
//     Nevsky Centre (orange house 114 + glass setback + pale corner house 116 + Ligovsky front).  ~81k triangles, 1 mesh group per house.
//   BUILT BUT DORMANT (landmarksB/extras.js, active when layout.GROUPS.landmarksB claims the id, or ?lbextras): Colosseum w60195636, Ivanov 108 w60195635, Teatr Sever 104 w60195639,
//     Nevsky Plaza 55 w245953204, Nevsky Palace 57 r442684, house Rossiya 61 w52016434 -> add these ids to sub-group `nevsky-corner`.
//   NOT DONE / NEXT: close-up polish (Atrium corner windows, rustication contrast, shop signage variety, chimneys / dormers), Palkin 47, Bryun 82, Yakovlev 96 (atlantes), Maltsev 77,
//     Markevich-Korovin 83; stucco ornament is relief decals (reliefs.js), no atlantes / caryatids yet.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksB/common.js';

const HOUSES = [
  ['atrium', () => import('./landmarksB/atrium.js')],
  ['yusupova', () => import('./landmarksB/yusupova.js')],
  ['menyaev', () => import('./landmarksB/menyaev.js')],
  ['kozhevnikova', () => import('./landmarksB/kozhevnikova.js')],
  ['corners', () => import('./landmarksB/corners.js')],
  ['nevskyCentre', () => import('./landmarksB/nevskyCentre.js')],
  ['extras', () => import('./landmarksB/extras.js')],
];

export async function build(ctx) {
  const K = makeKit(ctx);
  K.svc = { houses: [], entrances: [], monuments: [], photoSpots: [] };
  const root = new THREE.Group(); root.name = 'landmarksB';
  const failed = [];
  for (const [name, load] of HOUSES) {
    try {
      const m = await load();
      K.begin();
      m.build(K);
      K.flush(root, name);
    } catch (e) { console.error(`[landmarksB] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); K.begin(); }
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(K.svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(K.svc.photoSpots);
  S.landmarksB = { houses: K.svc.houses, entrances: K.svc.entrances, triangles: K.tris };
  if (failed.length) throw new Error('landmarksB parts failed:\n' + failed.join('\n'));
}
