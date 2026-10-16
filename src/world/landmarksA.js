// landmarksA - the Moscow Railway Station (Московский вокзал, K. Thon 1851) with its clock tower, hall and interior, Vosstaniya Square with the Hero City obelisk,
// Hotel Oktyabrskaya and the corner houses of the square.  Spec: docs/research/station.md; photos SP/refs/station.  Geometry lives in src/world/landmarksA/*:
//   common.js  station frame (u along the facade, d into the building), palette, Parts geometry collector, colliders      geom.js  polygon / wall-run helpers
//   tex.js     canvas textures                                                                                         facade.js central block + wings + roofs + roof lettering
// Owns every sub-group of layout.GROUPS.landmarksA (station, square, oktyabrskaya).  Services: ctx.services.landmarks (merged) = { squareCentre, monuments, flagpoles,
// photoSpots, stationExits, stationFrame }.
// STATUS (checkpoint 8): DONE - everything of checkpoint 7 plus: night look (uNight-driven emissive: floodlit station + hotel walls, lit windows / dials / lettering, lamp halos,
//   golden obelisk, lit kiosk signs, advertising pillars), hotel roof sign on the front facade (white capitals + yellow boards), stucco relief (keystones, pediments, rosettes,
//   balustrade, rusticated plinth), door canopies + lamps, 5-level annexes (makeTall), Kassovy zal No 1 interior with a door, bins / bike racks, coplanar-core z-fight fixes.
//   MALL (checkpoint 9) - mall.js: ТРЦ «Галерея» (galereya group): cream stone frontage with glazed tiers, lit arcades, roof skylights, main portal + corridor + round atrium + mall street.
//   NOT DONE - metro stairs in the lobby (metro module), departure-board text on the ticket hall boards, hotel ground-floor shopfronts are simple arches.
export const OWNS_GROUPS = ['station', 'square', 'oktyabrskaya', 'galereya'];

import { makeCommon } from './landmarksA/common.js';

const PARTS = [
  ['facade', () => import('./landmarksA/facade.js').then((m) => (C) => m.buildFacade(C))],
  ['halls', () => import('./landmarksA/halls.js').then((m) => (C) => m.buildHalls(C))],
  ['interior', () => import('./landmarksA/interior.js').then((m) => (C) => m.buildInterior(C))],
  ['square', () => import('./landmarksA/square.js').then((m) => (C) => m.buildSquare(C))],
  ['hotel', () => import('./landmarksA/hotel.js').then((m) => (C) => m.buildHotel(C))],
  ['courtyard', () => import('./landmarksA/courtyard.js').then((m) => (C) => m.buildCourtyard(C))],
  ['tickets', () => import('./landmarksA/tickets.js').then((m) => (C) => m.buildTickets(C))],
  ['mall', () => import('./landmarksA/mall.js').then((m) => (C) => m.buildMall(C))],
  ['tower', () => import('./landmarksA/tower.js').then((m) => (C) => m.buildTower(C))],
];

export async function build(ctx) {
  const C = makeCommon(ctx);
  const failed = [];
  const skip = (typeof location !== 'undefined' ? new URLSearchParams(location.search).get('stskip') || '' : '').split(',');   // debug: ?stskip=interior,tower
  for (const [name, load] of PARTS) {
    if (skip.includes(name)) continue;
    try { const fn = await load(); C.parts[name] = await fn(C); }
    catch (e) { console.error(`[landmarksA] ${name} failed:`, e); failed.push(`${name}: ${e && e.stack || e}`); }
  }
  C.publish();
  if (failed.length) throw new Error('landmarksA parts failed:\n' + failed.join('\n'));
}
