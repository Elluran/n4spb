// landmarksCastle - the Engineering (Mikhailovsky) Castle (Bazhenov / Brenna 1797-1801) with its court, south portal and obelisks, north loggia, church rotunda, 64 m gilded spire, green copper roofs;
// the Peter I monument (Rastrelli) with its pink Olonets marble pedestal 77 m south of the portal; the Three-part bridge over the restored Voskresensky canal; the two Kordegardiya guardhouses on
// Klenovaya alley; the iron-and-granite precinct (moat railings, flower beds, chain posts, benches); the little bronze Chizhik-Pyzhik (chizhik.js, an Easter egg on the Fontanka embankment inside the play area).  Dossier docs/research/summer-garden.md section 8, photos refs/summer-garden 104 107 111 120 135 143 157 165 247.
// User rules: no flags / flagpoles (the roof flag is omitted), no alarm sounds.  The moat water belongs to environment, the bridges over the Moika / Fontanka to bridges.
// Files: landmarksCastle/frame.js (frame C) mats.js geo.js castle.js (walls, windows, bands, colliders) roof.js (roofs, chimneys, dome, spire, court floor) portal.js (south portal, obelisks, colonnades, passage)
// north.js (loggia, stair, Hercules / Flora) court.js (court details, Paul I) monument.js (Peter I) bridge.js (Three-part bridge) guards.js (guardhouses) precinct.js (fences, beds, benches) groups.js (claims)
// kit.js common.js reliefs.js parts.js (the facade vocabulary, copied from landmarksK) trees.js treegeo.js leafmat.js util.js (copied tree kit).
// Publishes ctx.services.landmarksCastle = { entrances, court, monument, benches, crowd, photoSpots, ... } and merges the monuments / photo spots into ctx.services.landmarks.
export const OWNS_GROUPS = true;

import * as THREE from 'three';
import { makeKit } from './landmarksCastle/common.js';
import { makeMats } from './landmarksCastle/mats.js';
import { castleData, buildWalls } from './landmarksCastle/castle.js';
import { buildRoofs } from './landmarksCastle/roof.js';

const PARTS = [
  ['walls', (K, M, D, svc) => buildWalls(K, M, D, true)],
  ['roofs', (K, M, D, svc) => buildRoofs(K, M, D)],
  ['portal', () => import('./landmarksCastle/portal.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['north', () => import('./landmarksCastle/north.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['court', () => import('./landmarksCastle/court.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['monument', () => import('./landmarksCastle/monument.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['bridge', () => import('./landmarksCastle/bridge.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['guards', () => import('./landmarksCastle/guards.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['precinct', () => import('./landmarksCastle/precinct.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],
  ['chizhik', () => import('./landmarksCastle/chizhik.js').then((m) => (K, M, D, svc) => m.build(K, M, D, svc))],      // the Chizhik-Pyzhik Easter egg on the Fontanka embankment
];

export async function build(ctx) {
  const t0 = performance.now();
  const root = new THREE.Group(); root.name = 'landmarksCastle';
  const K = makeKit(ctx); K.root = root;
  const M = makeMats(ctx, K);
  const D = castleData();
  const svc = { monuments: [], photoSpots: [], entrances: [], crowd: [], benches: [], parts: {}, triangles: 0 };
  K.svc = svc;
  const failed = [];
  for (const [name, load] of PARTS) {
    const t1 = performance.now();
    K.begin();
    try {
      let fn = load;
      // dynamic parts resolve to a function; the static ones are already functions of (K, M, D, svc)
      if (load.length === 0) { try { fn = await load(); } catch (e) { if (/Failed to fetch|Cannot find|ENOENT|not found/i.test(String(e && e.message))) { svc.parts[name] = { skipped: true }; continue; } throw e; } }
      await fn(K, M, D, svc);
    } catch (e) { console.error(`[landmarksCastle] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
    const before = K.tris;
    K.flush(root, name);
    svc.parts[name] = { tris: K.tris - before, ms: Math.round(performance.now() - t1) };
  }
  svc.triangles = K.tris;
  ctx.addStatic(root);
  const S = (ctx.services.landmarks ||= {});
  S.monuments = (S.monuments || []).concat(svc.monuments);
  S.photoSpots = (S.photoSpots || []).concat(svc.photoSpots);
  ctx.services.landmarksCastle = { ...svc, buildMs: Math.round(performance.now() - t0) };
  if (typeof process !== 'undefined' && process.env && process.env.C_DEBUG) console.log('[landmarksCastle] parts', JSON.stringify(svc.parts), 'bays', K.bayCount, 'chimneys', K.chimneys);
  if (failed.length) throw new Error('landmarksCastle parts failed:\n' + failed.join('\n'));
}
