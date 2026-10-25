// eastBridges/groups - the east-bridges claim: copied from 102_3d_piter commit 0568f7af (src/world/eastBridges/groups.js); the n4spb edits are marked 'n4spb:'.
import { ROADS } from '../data/city.js';
export const EAST_BRIDGE_ROADS = ROADS.filter(r => r.bridge && r.pts[0] > 1000 && r.pts[1] > -405 && !r.tunnel);
export const GROUPS_LIST = [{ key: 'east-bridges', name: 'Мосты восточного центра', nameEn: 'Eastern bridges', ids: [], osm: EAST_BRIDGE_ROADS.map(r => r.id), at: [2200, 860] }];
