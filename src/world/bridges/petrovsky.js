// bridges/petrovsky.js - the bridge group "bridges-petrovsky" of the islands round 2 (docs/ISLANDS2-BRIEF.md, dossier docs/research/petrovsky-bridges-2026.md):
//   * the BETANCOURT BRIDGE, complete (petrovsky/betancourt.js: 917 m, the Petrovsky approach viaduct, the cable-stayed span with its two pylon portals and 48 stays, Serny Island, the south channel,
//     the ramp to Dekabristov Island): drivable (the red car crosses) and walkable bank to bank; it replaces the viaduct head of bridges/long.js BETANCOURT (bridges.js skips that one when this module loads)
//   * the SERNY BRIDGE (petrovsky/serny.js: 18.7 m beam bridge, 13 m, two lanes, between the end of the Makarova embankment and Serny Island)
//   * the BOLSHOY PETROVSKY BRIDGE (petrovsky/bolshoy.js: 7 spans, 307 m, over the Malaya Nevka between Petrovsky and Krestovsky islands, across the islet w22870264)
//   * the WHSD fairway bridge pylons and spans (petrovsky/whsd.js: skyline scenery over the Petrovsky fairway, two white 124 m pylons)
// LIST = [{ id, name, nameEn, build(env) -> B }]: bridges.js builds each with its own Parts and publishes it (list entry, deckY, masts).  Ids claimed in groups.js (key per bridge).
// Own files: this one + petrovsky/*.js + tools/petrovsky-bridge-*.mjs.  NO flags / flagpoles / beacons (user rules).
import { buildBetancourt } from './petrovsky/betancourt.js';
import { buildSerny } from './petrovsky/serny.js';
import { buildBolshoy } from './petrovsky/bolshoy.js';
import { buildWhsdPetrovsky } from './petrovsky/whsd.js';

export const LIST = [
  { id: 'betancourt', name: 'мост Бетанкура', nameEn: 'Betancourt Bridge', build: buildBetancourt },
  { id: 'serny-bridge', name: 'Серный мост', nameEn: 'Serny Bridge', build: buildSerny },
  { id: 'bolshoy-petrovsky', name: 'Большой Петровский мост', nameEn: 'Bolshoy Petrovsky Bridge', build: buildBolshoy },
  { id: 'whsd-petrovsky', name: 'Мост через Петровский фарватер (ЗСД)', nameEn: 'WHSD cable-stayed bridge over the Petrovsky fairway (skyline)', build: buildWhsdPetrovsky },
];
export { BETAN } from './petrovsky/betancourt.js';
