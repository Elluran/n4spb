// landmarksJ - St Isaac's Cathedral and St Isaac's Square.
//   * The cathedral (101.5 m, OSM r3229838 + 12 parts, grid bearing 53.5 deg): stylobate with four granite steps, marble walls with the red-granite-frieze entablature all round, four porticos (N / S: 2 x 8,
//     E / W: 8 monolithic red granite columns of 17 m with bronze Corinthian capitals, pediments with bronze reliefs, gilded lettering, coffered ceilings, bronze doors, evangelists and apostles), four corner
//     bell towers with belfries and gilded cupolas, angels with torches at the attic corners, the 24-column drum, the balustrade with 24 angels, the gilded ribbed dome (apex 87.7 m, emissive so that it glows
//     from 1-3 km), lantern, ball and cross (101.5 m).  Walkable: steps, porticos, between the columns; an observation deck at 44 m (up through the SE bell tower, down through the NW one: [E] prompts).
//   * The square: the granite apron + iron fence (gates in front of the N / S / W stairs), the Nicholas I monument (crimson pedestal, four seated women, double-headed eagle, the rearing horse, oval fence,
//     four candelabra), the garden (lawn, gravel paths, oval lawn with rose bed and chain posts, instanced limes / maples / elms: the OSM `square` polygon w638328792 is claimed because the generic modules
//     paint it as paving and plant nothing on it), the Mariinsky Palace (three risalits, free Corinthian columns on the loggia, green roof, glass pyramid), the Astoria (brown-ochre, orange awnings, mansard,
//     roof lettering), the Angleterre (terracotta, cream lisenes), the Lobanov-Rostovsky House with the 8-column portico and the two lions.
// Dossier docs/research/admiralty-stisaac.md (sections 7-8, CRITIC LOG), photos refs/admiralty 080 085 089 094 095 098 099 103 109 113 117 120 125 126 127 128.  Plan = OSM footprints; heights, colours and
// ornament from the dossier / photos (the dossier's OSM heights of the cathedral parts are placeholders: porticos calibrated on photos 085 / 095: floor 1.4, columns to 18.4, entablature to 23.2, apex ~30, attic 34.5,
// roof 36, belfries 61, deck 44, dome springing 73.4).  NO flags / flagpoles, no alarm sounds (user rules).
// Files: landmarksJ/frame.js (cathedral frame) mats.js prims.js kit.js (Parts collector, copied) · isaac.js (cathedral.js drum.js) · square.js (apron, fence, monument) · garden.js (+ treegeo.js leafmat.js util.js,
// copied from environment) · houses.js (+ common.js house.js reliefs.js parts.js sculpt.js, copied from landmarksG) · groups.js (claims).
// Publishes ctx.services.landmarksJ = { monuments, photoSpots, crowd, houses, triangles, parts } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksJ/kit.js';
import { makeMats } from './landmarksJ/mats.js';
import { makeKit } from './landmarksJ/common.js';

const PARTS = [
  ['isaac', () => import('./landmarksJ/isaac.js')],
  ['square', () => import('./landmarksJ/square.js')],
  ['garden', () => import('./landmarksJ/garden.js')],
];

const HOUSES = [
  ['houses', () => import('./landmarksJ/houses.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksJ';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], benches: [], benchPoints: [], triangles: 0, parts: {} };
  const failed = [];
  const cutouts = new Set([M.pickets]);
  for (const [name, load] of PARTS) {
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, cols: [], extraTris: 0, root };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksJ] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksJ] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name });
    for (const m of meshes) if (cutouts.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  // the stucco buildings of the square (Mariinsky Palace, Astoria, Angleterre, Lobanov-Rostovsky house) use the facade vocabulary kit
  const KH = makeKit(ctx); KH.svc = { houses: [], entrances: [], monuments: svc.monuments, photoSpots: svc.photoSpots };
  for (const [name, load] of HOUSES) {
    const t1 = performance.now();
    try { const m = await load(); KH.begin(); await m.build(KH, ctx); KH.flush(root, name); } catch (e) { console.error(`[landmarksJ] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); KH.begin(); }
    svc.parts[name] = { ms: Math.round(performance.now() - t1) };
  }
  svc.triangles += KH.tris; svc.houses = KH.svc.houses;
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksJ = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (failed.length) throw new Error('landmarksJ parts failed:\n' + failed.join('\n'));
}
