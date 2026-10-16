import { ROADS } from '../data/city.js';
export const NORTH_BRIDGE_ROADS = ROADS.filter(r => r.bridge && !r.tunnel && (
  /Литейный мост|Большеохтинский мост/.test(r.name || '') ||
  (r.pts[0] > -180 && r.pts[0] < 0 && r.pts[1] < -1880 && r.pts[1] > -2420) ||
  (r.pts[0] > 2600 && r.pts[0] < 3010 && r.pts[1] < -1100 && r.pts[1] > -1175)
));
export const GROUPS_LIST = [{ key: 'north-neva-bridges', name: 'Литейный и Большеохтинский мосты', nameEn: 'Liteyny and Bolsheokhtinsky bridges', ids: [], osm: NORTH_BRIDGE_ROADS.map(r => r.id), at: [2622.4, -1150.1] }];
