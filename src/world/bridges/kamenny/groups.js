// bridges/kamenny/groups.js - the layout.GROUPS rows of the Kamenny Island bridges (pure data; imported by bridges/groups.js: ONE import + ONE spread line there).  `osm` = the bridge relations, ways, tram ways and
// footways whose deck the module draws itself: streets skips them, and every id of an environment bridge zone (environment/river.js bridgeZones(): z.ids) that is owned here releases that zone's invisible
// fallback deck (a walk box + two parapet boxes over the open water).
import { BIG, SMALL } from './spec.js';

const mid = (s) => [Math.round(s.cx), Math.round(s.cz)];
export const KAMENNY_GROUPS = [
  { key: 'kamennoostrovsky', name: BIG[0].name, nameEn: BIG[0].nameEn + ' (Malaya Nevka, Kamenny - Aptekarsky; bridges/kamenny/big.js)', ids: [], osm: BIG[0].claims, at: [-2790, -5023], note: 'five haunched pale girders on four pink granite round-tower piers with two-lantern standards, rolling bascule shown closed, granite stelae at the abutments, two tram tracks, 27 m wide' },
  { key: 'ushakovsky', name: BIG[1].name, nameEn: BIG[1].nameEn + ' (Bolshaya Nevka, Kamenny - Primorsky; bridges/kamenny/big.js)', ids: [], osm: BIG[1].claims, at: [-2856, -5589], note: 'rusticated granite arcades with dentil cornices, round bastions with fluted green columns and bronze trophies, five pale haunched steel spans, two tram tracks, 27 m wide' },
  ...SMALL.map((s) => ({ key: s.id, name: s.name, nameEn: s.nameEn + ' (bridges/kamenny/small.js)', ids: [], osm: s.claims, at: mid(s), note: 'small canal / pond bridge of Kamenny Island: flat slab, railing, lamps' })),
];
