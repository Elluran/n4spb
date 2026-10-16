// landmarksPribaltiyskaya - the PRIBALTIYSKAYA HOTEL (Прибалтийская, S. I. Evdokimov / N. N. Baranov / V. I. Kovaleva with the Swedish firm Skanska, 1976-78: an H of three 48 m window slabs in folded champagne aluminium
// with a 14-bay central block, a fins band, a dark bronze crown with two sloping "ears" and the word ПРИБАЛТИЙСКАЯ, four tall end towers, a red granite plinth, a 32 m stair with two bronze masks), the Agayan group
// "Создатели флота России" at the stair top, Tsereteli's monument to PETER I (2006) on Pribaltiyskaya Square, the memorial to the CRUISER "KIROV" (1990: two triple 180 mm turrets, the bronze wreath, two propellers,
// two anchors, the granite wall with the shell niches, in front of the college wing with the black frieze), the NAKHIMOV statue (2012) and the former WATERVILLE aquapark.  Far-west Vasilievsky Island (rects V9 / V10).
// Dossier docs/research/pribaltiyskaya.md ([C#] = the critic's corrections), brief docs/VO-BRIEF.md, photos refs/pribaltiyskaya, requests to the other owners docs/research/vo-requests-landmarksPribaltiyskaya.md.
// User rules: no flags / flagpoles (the hotel carries 3 + 3 poles: left out), no alarm sounds (the Kirov guns are silent static props), no corporate logos (the roof word is the plain ПРИБАЛТИЙСКАЯ), summer day.
// Files: landmarksPribaltiyskaya/ring.js (2D ring helpers: outward edge normals, wall quads, sloped caps, prisms, colliders in a frame) geo.js (copy: tubes, frusta, revolve) · frame.js (frames HF = hotel, KF = Kirov; heights; rings) art.js mats.js (every texture / material key starts with 'lmprib-') · hotel.js (hull walls, crown, fins, ears, towers, roofs, masts,
// colliders) hotelfront.js (platform + plinth walls, stair, masks, canopy, drive, lamps, benches, beds, bollards, trees) rear.js (restaurant pavilion, dome) waterville.js · creators.js (Agayan group) peter.js (Peter I with
// base, bollards, chain) figs.js (kit figures) · kirov.js (platform, wall, turrets, wreath, propellers, anchors, niches) college.js (KSiPT wing, frieze) · nakhimov.js (statue, pedestal, round glass building) ·
// groups.js (claims, PAVED_RINGS) · kit.js inst.js util.js surfaces.js trees.js treegeo.js leafmat.js (copies of landmarksSeaTerminal / landmarksOktyabrsky).  Tools: tools/landmarksPribaltiyskaya-walk.mjs (walk probe).
// A part is built only when its claim key is in groups.js.  Publishes ctx.services.landmarksPribaltiyskaya = { monuments, photoSpots, entrances, crowd, fences, benches, lamps, parts }
// and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksPribaltiyskaya/kit.js';
import { makeMats } from './landmarksPribaltiyskaya/mats.js';
import { GROUPS_LIST } from './landmarksPribaltiyskaya/groups.js';

const PARTS = [
  ['hotel', 'pribaltiyskaya-hotel', () => import('./landmarksPribaltiyskaya/hotel.js')],
  ['front', 'pribaltiyskaya-hotel', () => import('./landmarksPribaltiyskaya/hotelfront.js')],
  ['rear', 'pribaltiyskaya-hotel', () => import('./landmarksPribaltiyskaya/rear.js')],
  ['creators', 'creators-fleet', () => import('./landmarksPribaltiyskaya/creators.js')],
  ['peter', 'peter-tsereteli', () => import('./landmarksPribaltiyskaya/peter.js')],
  ['kirov', 'kirov-memorial', () => import('./landmarksPribaltiyskaya/kirov.js')],
  ['college', 'kirov-memorial', () => import('./landmarksPribaltiyskaya/college.js')],
  ['nakhimov', 'nakhimov-statue', () => import('./landmarksPribaltiyskaya/nakhimov.js')],
  ['waterville', 'pribaltiyskaya-waterville', () => import('./landmarksPribaltiyskaya/waterville.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksPribaltiyskaya';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], fences: [], benches: [], lamps: [], triangles: 0, parts: {} };
  const claimed = new Set(GROUPS_LIST.map((g) => g.key));
  const failed = [];
  for (const [name, key, load] of PARTS) {
    if (!claimed.has(key)) continue;                                   // a part is built only when its claim is on (groups.js): no double drawing with the generic city
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksPribaltiyskaya] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksPribaltiyskaya] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name: 'lmprib-' + name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material) || M.glassy.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksPribaltiyskaya = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.PRIB_DEBUG) console.log('[landmarksPribaltiyskaya] parts', JSON.stringify(svc.parts));
  if (failed.length) throw new Error('landmarksPribaltiyskaya parts failed:\n' + failed.join('\n'));
}
