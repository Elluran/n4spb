import { ROADS } from '../data/city.js';
// northBridges/groups.js - the claims of module northBridges (the Neva bridges of the Petrograd / Vyborg side: Liteyny and Bolsheokhtinsky).
// n4spb: the source (102_3d_piter at 0568f7af) has ONE sub-group 'north-neva-bridges' with all 23 mapped ways. The two bridges lie in two different areas of the world map (the Liteyny deck in Palace-Liteyny,
// the Bolsheokhtinsky deck in Smolninskoye) and the data of an area holds only the ways of its own bridge, so the sub-group is split in two (the same way lists, the same filter, the same `at` points) and
// an area's GROUPS.northBridges keeps the sub-groups that have mapped ways in ITS data (`osm.length`): the module builds a bridge only where its key is claimed (northBridges.js), the generic streets skip
// the claimed bridge ways (the module draws the deck). `ROADS` is the data facade of the page (src/world/data/city.js, remapped to the area's own data by the import map).
const isBridge = (r) => r.bridge && !r.tunnel;
export const NORTH_BRIDGE_ROADS = ROADS.filter(r => isBridge(r) && (
  /Литейный мост|Большеохтинский мост/.test(r.name || '') ||
  (r.pts[0] > -180 && r.pts[0] < 0 && r.pts[1] < -1880 && r.pts[1] > -2420) ||
  (r.pts[0] > 2600 && r.pts[0] < 3010 && r.pts[1] < -1100 && r.pts[1] > -1175)
));
const LITEYNY_ROADS = NORTH_BRIDGE_ROADS.filter(r => /Литейный мост/.test(r.name || '') || (r.pts[0] > -180 && r.pts[0] < 0 && r.pts[1] < -1880 && r.pts[1] > -2420));
const BOLSH_ROADS = NORTH_BRIDGE_ROADS.filter(r => !LITEYNY_ROADS.includes(r));
export const GROUPS_LIST = [
  { key: 'north-bolsheokhtinsky', name: 'Большеохтинский мост', nameEn: 'Bolsheokhtinsky Bridge', ids: [], osm: BOLSH_ROADS.map(r => r.id), at: [2622.4, -1150.1] },
  { key: 'north-liteyny', name: 'Литейный мост', nameEn: 'Liteyny Bridge', ids: [], osm: LITEYNY_ROADS.map(r => r.id), at: [-123.6, -1972.35] },
];
