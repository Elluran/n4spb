// landmarksK - the Church of the Saviour on Spilled Blood (Parland 1883-1907, 81 m) with its bell tower, five enamel onions, mosaics, porches, Winkler fence and precinct; the Mikhailovsky Palace (Russian
// Museum) with the Rossi wing, Benois wing, lions and the street fence; the Rossi pavilion in the Mikhailovsky Garden; Arts Square with the Pushkin monument.  Dossier docs/research/saviour-mikhailovsky.md,
// photos refs/saviour (011 007 039 078 006 034 073 098 116 ...).  User rules: no flags / flagpoles, no alarm sounds.
// Files: landmarksK/frame.js (frames C and P) art.js (canvas paintings) mats.js geo.js kit.js (Parts, copied) trees.js (+ treegeo.js leafmat.js util.js, copied from environment) · church.js (church/ body tower
// porches tent onions apses) · fence.js (Winkler fence, gate, spear fences) · precinct.js (kiosk, chapel, toilets, plaza ground, souvenir stalls) · houses.js (palace, Rossi / Benois / Ethnographic wings,
// School of Folk Art; common.js house.js parts.js reliefs.js = the facade vocabulary copied from landmarksJ) · palace.js (forecourt, lions, street fence) · square.js (Arts Square garden, Pushkin, Bender)
// · garden.js (Rossi pavilion, busts, oak, Rossi bridge) · grove.js (Mikhailovsky Garden woods, allees, ponds) · groups.js (claims).
// Publishes ctx.services.landmarksK = { church, palace, pushkin, pavilion, entrances, photoSpots, crowd, ... } and merges monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { Parts } from './landmarksK/kit.js';
import { makeMats } from './landmarksK/mats.js';
import { makeKit } from './landmarksK/common.js';

const PARTS = [
  ['church', () => import('./landmarksK/church.js')],
  ['fence', () => import('./landmarksK/fence.js')],
  ['precinct', () => import('./landmarksK/precinct.js')],
  ['palace', () => import('./landmarksK/palace.js')],
  ['square', () => import('./landmarksK/square.js')],
  ['garden', () => import('./landmarksK/garden.js')],
  ['grove', () => import('./landmarksK/grove.js')],
];

const HOUSES = [
  ['houses', () => import('./landmarksK/houses.js')],
];

export async function build(ctx) {
  const t0 = performance.now();
  const M = makeMats(ctx);
  const root = new THREE.Group(); root.name = 'landmarksK';
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], benchPoints: [], triangles: 0, parts: {} };
  const failed = [];
  for (const [name, load] of PARTS) {
    const t1 = performance.now();
    const K = { ctx, M, THREE, P: new Parts(), svc, root, extraTris: 0 };
    try {
      const m = await load();
      await m.build(K);
    } catch (e) { console.error(`[landmarksK] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    for (const k of K.P.b.values()) { const bad = k.pos.findIndex((v) => !Number.isFinite(v)); if (bad >= 0) console.warn(`[landmarksK] ${name}: NaN vertex in ${k.mat.name} at ${bad / 3 | 0}`); }
    const tris = K.P.tris + K.extraTris;
    const meshes = K.P.build(root, { name });
    for (const m of meshes) if (M.cutouts.has(m.material) || M.decals.has(m.material)) ctx.noOutline(m);
    svc.triangles += tris; svc.parts[name] = { tris, ms: Math.round(performance.now() - t1) };
  }
  // the stucco buildings (palace, wings, School of Folk Art) use the facade vocabulary kit
  const KH = makeKit(ctx); KH.svc = { houses: [], entrances: [], monuments: svc.monuments, photoSpots: svc.photoSpots }; KH.root = root;
  for (const [name, load] of HOUSES) {
    const t1 = performance.now();
    try { const m = await load(); KH.begin(); await m.build(KH, ctx); KH.flush(root, name); } catch (e) { console.error(`[landmarksK] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); KH.begin(); }
    svc.parts[name] = { ms: Math.round(performance.now() - t1) };
  }
  svc.triangles += KH.tris; svc.houses = KH.svc.houses;
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksK = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.K_DEBUG) console.log('[landmarksK] parts', JSON.stringify(svc.parts), 'squareTrees', svc.squareTrees, 'gardenTrees', svc.gardenTrees);
  if (failed.length) throw new Error('landmarksK parts failed:\n' + failed.join('\n'));
}
