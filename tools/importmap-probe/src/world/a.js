import * as C from '../data/city.js';
import { ID } from '../area.js';
import * as M from '../data/metro.js';
export const seen = { city: C.AREA, cityWho: C.WHO, area: ID, metro: M.AREA, ns: C };
export const resolved = typeof import.meta.resolve === 'function' ? import.meta.resolve('../data/city.js') : null;
export const dyn = () => import('../data/city.js');
export const dynAbsolute = () => import(new URL('../data/city.js', import.meta.url).href);
