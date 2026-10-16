import { BUILDINGS } from '../data/city.js';

// Exact mapped footprints. Only the houses present in the strip data are listed
// (Mayakovskogo 22-24, which reaches past the data extent, is left generic).
const ids = (fn) => BUILDINGS.filter(b => !b.skip && !b.dupOf && fn(b)).map(b => b.id);
const at = list => { const b = BUILDINGS.find(b => list.includes(b.id)); return b ? [b.cx, b.cz] : [0, 0]; };
export const CORRIDOR_ADDRESSES = [
  ['улица Маяковского', '4', '#d9c3a3'], ['улица Маяковского', '14', '#cbbca1'],
  ['улица Восстания', '17', '#c5c1a2'], ['улица Восстания', '19', '#b8bcb4'],
  ['улица Радищева', '5-7', '#dccbb4'],
];
const corridor = ids(b => CORRIDOR_ADDRESSES.some(([street,no]) => b.addr?.street === street && b.addr?.no === no));
export const GROUPS_LIST = [
  {key:'north-podpisnye', name:'Подписные издания', nameEn:'Podpisnye Izdaniya bookstore', ids:['w96123542'], osm:[], at:[-203.8,-266.8]},
  {key:'north-corridor-houses', name:'Маяковского · Восстания · Радищева', nameEn:'Central north street houses', ids:corridor, osm:[], at:at(corridor)},
];
