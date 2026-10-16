// environment/owners.js - the HAND-OVER API of the Vasilievsky Island sight modules (build-water, 2026-10-07; documented in docs/research/vo-water.md section 6).
// Water geometry is static data (layout.js reads it before any module is built), so a sight module hands a piece of water or shore over through PURE DATA exported from its `groups.js`, and the
// hand-over is switched on by its CLAIMS (a non-empty GROUPS_LIST: the module really draws its sight), exactly like the Spit descent (landmarksStrelka DESCENT_RING) and the Shi-Tsza pit.
// A sight module may export, next to GROUPS_LIST (all optional; a ring is [[x, z], ...] or a flat [x, z, ...]):
//   WATER_RINGS  [{ id, ring, key? }]          ground that the sight turns into its OWN descent / stair / pier pit / berth: the ring counts as water (hole in the ground, water surface under it,
//                                              layout.inRiver / heightAt, key = the waterway, default 'neva'), NONE of its edges is a bank and the old bank line along it opens; the owner draws the
//                                              walls, steps, parapets and colliders (landmarksStrelka/descent.js is the exemplar: stairs in the Neva wall). The quay opens exactly at the ring (0.5 m round it).
//   BANK_RINGS   [{ id, ring }]                a shore the owner draws completely (banquette, beach, slopes, colliders): no wall, slope, parapet or collider of environment on that ring.
//   KEEP_OUT     [{ id, c: [x, z], r } | { id, c, ax: [ux, uz], hl, hw }]   no generated descent, landing stage or boat here (a berth, a pier, a ship at its mooring).
//   PAVED_RINGS  [{ id?, ring } | ring]        ground that the sight paves itself (claims.js: no trunks, hedges, beds or grass tufts there; listed only while the module is in the build list).
// Second pass (water-2 2026-10-08): the generic quay keeps its wall FACE in the 0.5 m margin round a WATER_RINGS ring (only the ring itself + 6 cm has no face; coping, parapet and collider are open in the whole margin),
// so a wall of yours that starts at the ring edge meets a wall, not a slit; draw your own wall flush with the ring edge. A pit is "sealed" when `node tools/environment-vo-seal.mjs --modules <your module>` finds no leak.
// Everything else a sight needs from the water (a bank line moved, a berth, a mooring) is a request in docs/research/vo-requests-<module>.md.
// Bridge decks need no entry: every mapped deck polygon of the island opens the quay by itself (waterways.js petroZones) until the bridge owner claims the deck.
import * as G_ACADEMY from '../landmarksAcademy/groups.js';
import * as G_ANDREW from '../landmarksAndrew/groups.js';
import * as G_GAVAN from '../landmarksGavan/groups.js';
import * as G_KIROVA from '../landmarksKirova/groups.js';
import * as G_MAKAROVA from '../landmarksMakarova/groups.js';
import * as G_MARINE from '../landmarksMarineFacade/groups.js';
import * as G_MENSHIKOV from '../landmarksMenshikov/groups.js';
import * as G_MINING from '../landmarksMining/groups.js';
import * as G_MODERNVO from '../landmarksModernVO/groups.js';
import * as G_NAVAL from '../landmarksNavalCorps/groups.js';
import * as G_PRIBALT from '../landmarksPribaltiyskaya/groups.js';
import * as G_SEATERM from '../landmarksSeaTerminal/groups.js';
import * as G_SEVKABEL from '../landmarksSevkabel/groups.js';
import * as G_SMOLENSKY from '../landmarksSmolensky/groups.js';
import * as G_SREDNY from '../landmarksSredny/groups.js';
import * as G_BRIDGES from '../bridges/groups.js';      // (review-water-2 2026-10-09, request of bridges-2 item 4) the bridges module may hand over the stair pits of its bridges the same way (WATER_RINGS / KEEP_OUT / PAVED_RINGS): pure data, nothing exported yet
import * as G_VICTORY from '../landmarksVictoryPark/groups.js';
import * as G_YELAGINPALACE from '../landmarksYelaginPalace/groups.js';
import * as G_YELAGINKITCHEN from '../landmarksYelaginKitchen/groups.js';
import * as G_YELAGINSERVICES from '../landmarksYelaginServices/groups.js';
import * as G_YELAGINROSSI from '../landmarksYelaginRossi/groups.js';
import * as G_YELAGINSPITS from '../landmarksYelaginSpits/groups.js';
import * as G_YELAGINPARK from '../landmarksYelaginPark/groups.js';
import * as G_KAMENNYPALACE from '../landmarksKamennyPalace/groups.js';
import * as G_KAMENNYCHURCH from '../landmarksKamennyChurch/groups.js';
import * as G_KAMENNYTHEATRE from '../landmarksKamennyTheatre/groups.js';
import * as G_KAMENNYDACHASEAST from '../landmarksKamennyDachasEast/groups.js';
import * as G_KAMENNYDACHASWEST from '../landmarksKamennyDachasWest/groups.js';
import * as G_TRANSFIGURATION from '../landmarksTransfiguration/groups.js';
import * as G_PETROVSKYWEST from '../landmarksPetrovskyWest/groups.js';
import * as G_ZHDANOVKA from '../landmarksZhdanovka/groups.js';
import * as G_LETI from '../landmarksLETI/groups.js';
import * as G_TVTOWER from '../landmarksTVTower/groups.js';
import * as G_BOTANICALGREENHOUSES from '../landmarksBotanicalGreenhouses/groups.js';
import * as G_BOTANICALGARDEN from '../landmarksBotanicalGarden/groups.js';
import * as G_PETROVSKYSTADIUM from '../landmarksPetrovskyStadium/groups.js';
import * as G_PETROVSKYYACHT from '../landmarksPetrovskyYacht/groups.js';

const SIGHTS = [['landmarksYelaginPalace', G_YELAGINPALACE], ['landmarksYelaginKitchen', G_YELAGINKITCHEN], ['landmarksYelaginServices', G_YELAGINSERVICES], ['landmarksYelaginRossi', G_YELAGINROSSI], ['landmarksYelaginSpits', G_YELAGINSPITS], ['landmarksYelaginPark', G_YELAGINPARK], ['landmarksKamennyPalace', G_KAMENNYPALACE], ['landmarksKamennyChurch', G_KAMENNYCHURCH], ['landmarksKamennyTheatre', G_KAMENNYTHEATRE], ['landmarksKamennyDachasEast', G_KAMENNYDACHASEAST], ['landmarksKamennyDachasWest', G_KAMENNYDACHASWEST], ['landmarksTransfiguration', G_TRANSFIGURATION], ['landmarksPetrovskyWest', G_PETROVSKYWEST], ['landmarksZhdanovka', G_ZHDANOVKA], ['landmarksLETI', G_LETI], ['landmarksTVTower', G_TVTOWER], ['landmarksBotanicalGreenhouses', G_BOTANICALGREENHOUSES], ['landmarksBotanicalGarden', G_BOTANICALGARDEN], ['landmarksPetrovskyStadium', G_PETROVSKYSTADIUM], ['landmarksPetrovskyYacht', G_PETROVSKYYACHT], ['landmarksAcademy', G_ACADEMY], ['landmarksAndrew', G_ANDREW], ['landmarksGavan', G_GAVAN], ['landmarksKirova', G_KIROVA], ['landmarksMakarova', G_MAKAROVA], ['landmarksMarineFacade', G_MARINE],
  ['landmarksMenshikov', G_MENSHIKOV], ['landmarksMining', G_MINING], ['landmarksModernVO', G_MODERNVO], ['landmarksNavalCorps', G_NAVAL], ['landmarksPribaltiyskaya', G_PRIBALT], ['landmarksSeaTerminal', G_SEATERM],
  ['landmarksSevkabel', G_SEVKABEL], ['landmarksSmolensky', G_SMOLENSKY], ['landmarksSredny', G_SREDNY], ['bridges', G_BRIDGES], ['landmarksVictoryPark', G_VICTORY]];
const owns = (G) => !!(G && Array.isArray(G.GROUPS_LIST) && G.GROUPS_LIST.length);
const flat = (r) => (Array.isArray(r[0]) ? r.flat() : r.slice());
const list = (G, name) => (Array.isArray(G[name]) ? G[name] : []);
const okRing = (o) => Array.isArray(o) && o.length >= 6 && o.every(Number.isFinite);

/** [{ id, key, owner, o }] the water rings (WATER_RINGS) of the modules that have claims */
export function sightWater() {
  const out = [];
  for (const [name, G] of SIGHTS) if (owns(G)) for (const w of list(G, 'WATER_RINGS')) { const o = flat(w.ring || w.o || []); if (okRing(o)) out.push({ id: name + ':' + w.id, key: w.key || 'neva', owner: name, o }); }
  return out;
}
/** [{ id, owner, o }] the shores that a module draws completely (BANK_RINGS) */
export function sightBanks() {
  const out = [];
  for (const [name, G] of SIGHTS) if (owns(G)) for (const w of list(G, 'BANK_RINGS')) { const o = flat(w.ring || w.o || []); if (okRing(o)) out.push({ id: name + ':' + w.id, owner: name, o }); }
  return out;
}
/** KEEP_OUT rows (waterways.js keepOut format) of the modules that have claims */
export function sightKeepOut() {
  const out = [];
  for (const [name, G] of SIGHTS) if (owns(G)) for (const k of list(G, 'KEEP_OUT')) if (k && Array.isArray(k.c) && k.c.length === 2 && (k.r || (Array.isArray(k.ax) && k.hl && k.hw))) out.push({ ...k, id: name + ':' + k.id });
  return out;
}
/** flat rings that the modules of the build list pave themselves (PAVED_RINGS): claims.js paints them into the field's claim mask */
export function sightPaved(buildList) {
  const out = [];
  for (const [name, G] of SIGHTS) if (buildList.includes(name)) for (const w of list(G, 'PAVED_RINGS')) { const o = flat(w.ring || w.o || w); if (okRing(o)) out.push(o); }
  return out;
}
