// lib/area-tables.js - the engine tables of the AREA MODULE (docs/AREAS.md section 3), with every table or key that an area leaves out filled by an empty / inert value.
// The area module is src/world/area.js (the strip) or src/areas/<id>/area.js (the page <id>.html remaps the URL of src/world/area.js to it with an import map, tools/lib/area-hooks.mjs does the same
// for the headless tools). The engine modules whose literals used to name places of the strip read their tables HERE, never from area.js directly: a minimal area module (no WATER, no ZONES ...)
// then still boots, and the modules do nothing for what the area does not list. A namespace import is used on purpose: a named import of a table that the area module does not export would be a link error.
// PURE DATA: no three.js, no layout.js (layout.js imports waterways.js, which imports this file).
//   WATER            environment/waterways.js     plugs, bridgeZones, bridgeShades, clipLines, farSources, farCenter, farRadius, forcedBanks, openMouths, dataWater, slopeReaches
//   ZONES            wildlife, people, trams, field, far  pigeons, crowHaunts, crowds, fountains, peopleDensity, peopleCorridor, peopleHot, tramLines, clearDiscs, farCentres
//   GARAGE           drive/cars/index.js, drive.js        poses { coupe, truck, lada, roadster }, spawn
//   PRUNE_SERVICES   environment.js                       the services whose door entrances clear the trees
//   HOOKS, HEIGHT_PATCHES                                 the hand-merged hooks and the height patches of milestone M6 (nothing reads them yet)
import * as A from '../area.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const W = obj(A.WATER), Z = obj(A.ZONES), G = obj(A.GARAGE);

export const WATER = {
  plugs: arr(W.plugs),
  bridgeZones: arr(W.bridgeZones),
  bridgeShades: arr(W.bridgeShades),
  clipLines: arr(W.clipLines),
  farSources: arr(W.farSources),
  /** [x, z] or null: null = the centre of the EXTENT rectangles (environment/waterways.js) */
  farCenter: Array.isArray(W.farCenter) && Number.isFinite(W.farCenter[0]) && Number.isFinite(W.farCenter[1]) ? W.farCenter : null,
  farRadius: Number.isFinite(W.farRadius) ? W.farRadius : 6000,
  forcedBanks: arr(W.forcedBanks),
  openMouths: arr(W.openMouths),
  dataWater: arr(W.dataWater),
  slopeReaches: arr(W.slopeReaches),
};

export const ZONES = {
  pigeons: arr(Z.pigeons),
  crowHaunts: arr(Z.crowHaunts),
  crowds: obj(Z.crowds),
  fountains: arr(Z.fountains),
  peopleDensity: obj(Z.peopleDensity),
  peopleCorridor: arr(Z.peopleCorridor),
  peopleHot: arr(Z.peopleHot),
  tramLines: arr(Z.tramLines),
  clearDiscs: arr(Z.clearDiscs),
  farCentres: arr(Z.farCentres),
};

export const GARAGE = {
  poses: obj(G.poses),
  /** { x, z, yaw } or null */
  spawn: G.spawn && Number.isFinite(G.spawn.x) && Number.isFinite(G.spawn.z) ? G.spawn : null,
};

export const PRUNE_SERVICES = arr(A.PRUNE_SERVICES);
export const HOOKS = obj(A.HOOKS);
export const HEIGHT_PATCHES = arr(A.HEIGHT_PATCHES);
