// landmarksOktyabrsky - the BOLSHOY CONCERT HALL "OKTYABRSKY" (Большой концертный зал «Октябрьский», Ligovsky pr. 6; V. A. Kamensky, A. V. Zhuk, Zh. M. Verzhbitsky, G. M. Vlanin, 1967: a light dolomite
// foyer block under a cantilevered slab with a 43 m glass front and a dark bronze frieze, the windowless stone cube of the auditorium behind it), its forecourt on GREEK SQUARE (Греческая площадь:
// the brick-paver promenade, the granite stair, black twin-globe lamps, chain bollards, the bronze group "Октябрь" by A. T. Matveev).
// (The Kapodistrias monument 56 m beyond the play edge is not part of the Nevsky strip.)
// Why the hall was absent before: the OSM outline w30324279 has `skip` (it owns a part), so the generic city drew only the raised cube part as one yellow block and nothing for the foyer ring;
// this module claims w30324279 (the part w929214560 follows through `parent`) and draws the whole building exactly once.
// Dossiers docs/research/oktyabrsky.md (hall, frame, spec) and oktyabrsky-square.md (square), photos refs/oktyabrsky.  User rules: no flags / flagpoles (the real facade has none), no alarm sounds.
// Files: landmarksOktyabrsky/frame.js (hall frame HALL / W / M, outline, heights) art.js mats.js (every texture / material key starts with 'lmOkt-') · hall.js (stone, front, stair, interior,
// flanks, roof, colliders) · plaza.js (promenade paving, lamps, bollards with chains, poster stands) · october.js (the Matveev group) · figure.js (the kit figures: the three nude figures of the group) · groups.js (claims, PAVED_RINGS) ·
// kit.js geo.js inst.js surfaces.js trees.js treegeo.js leafmat.js util.js (copies of landmarksKarpovka).  Tools: tools/landmarksOktyabrsky-walk.mjs (walk probe), -houses.mjs (houses JSON).
// A part is built only when its claim key is in groups.js.  Publishes ctx.services.landmarksOktyabrsky = { hall, monuments, photoSpots, entrances, crowd, fences, benches, lamps, trees, parts }
// and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import * as L from './layout.js';
import { Parts } from './landmarksOktyabrsky/kit.js';
import { makeMats } from './landmarksOktyabrsky/mats.js';
import { GROUPS_LIST } from './landmarksOktyabrsky/groups.js';

const PARTS = [
  ['hall', 'oktyabrsky-hall', () => import('./landmarksOktyabrsky/hall.js')],
  ['plaza', 'oktyabrsky-hall', () => import('./landmarksOktyabrsky/plaza.js')],
  ['october', 'oktyabrsky-hall', () => import('./landmarksOktyabrsky/october.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksOktyabrsky';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], fences: [], benches: [], lamps: [], trees: [], triangles: 0, parts: {} };
  const claimed = new Set(GROUPS_LIST.map((g) => g.key));
  const failed = [];
  for (const [name, key, load] of PARTS) {
    if (!claimed.has(key)) continue;                                   // a part is built only when its claim is on (groups.js): no double drawing with the generic city
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksOktyabrsky] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksOktyabrsky] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material) || M.glassy.has(m.material)) ctx.noOutline(m);
    for (const m of meshes) if (m.material === M.reflect) ctx.noBatch(m);           // its opacity follows the time of day (below)
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  ctx.addStatic(root);
  if (ctx.shared && ctx.shared.uNight && ctx.onUpdate) ctx.onUpdate(() => { M.reflect.opacity = 0.36 * (1 - 0.85 * Math.min(1, ctx.shared.uNight.value)); });
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksOktyabrsky = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.OKT_DEBUG) console.log('[landmarksOktyabrsky] parts', JSON.stringify(svc.parts));
  if (failed.length) throw new Error('landmarksOktyabrsky parts failed:\n' + failed.join('\n'));
  void L;
}
