import { BUILDINGS } from '../data/city.js';

// Exact mapped footprints; name/address predicates also cover future OSM refreshes.
const ids = (fn) => BUILDINGS.filter(b => !b.skip && !b.dupOf && fn(b)).map(b => b.id);
const at = list => { const b = BUILDINGS.find(b => list.includes(b.id)); return b ? [b.cx, b.cz] : [0, 0]; };
const cathedral = ids(b => /Спасо-Преображенский|Собор Преображения Господня/i.test(b.name || ''));
const metro = ids(b => b.id === 'w22999175');
export const CORRIDOR_ADDRESSES = [
  ['улица Маяковского', '4', '#d9c3a3'], ['улица Маяковского', '14', '#cbbca1'],
  ['улица Маяковского', '22-24', '#ddc68f'], ['улица Маяковского', '36', '#bdc5b7'],
  ['улица Восстания', '17', '#c5c1a2'], ['улица Восстания', '19', '#b8bcb4'],
  ['Митавский переулок', '10', '#d3c8b8'], ['улица Радищева', '5-7', '#dccbb4'],
  ['улица Некрасова', '39', '#cdb29b'], ['Басков переулок', '41/29', '#d5c0a4'],
  ['улица Восстания', '40', '#c7c1a2'], ['улица Восстания', '44', '#c8b4a1'],
  ['улица Маяковского', '50', '#d9c395'], ['улица Радищева', '40', '#c9c2ad'],
];
const corridor = ids(b => CORRIDOR_ADDRESSES.some(([street,no]) => b.addr?.street === street && b.addr?.no === no));
export const GROUPS_LIST = [
  {key:'north-muruzi', name:'Дом Мурузи', nameEn:'Dom Muruzi (Liteyny 24)', ids:['r946930'], osm:[], at:[-95.4,-1125.5]},
  {key:'north-preobrazhensky', name:'Спасо-Преображенский собор', nameEn:'Transfiguration Cathedral', ids:cathedral, osm:[], at:at(cathedral)},
  {key:'north-podpisnye', name:'Подписные издания', nameEn:'Podpisnye Izdaniya bookstore', ids:['w96123542'], osm:[], at:[-203.8,-266.8]},
  {key:'north-chernyshevskaya', name:'Чернышевская', nameEn:'Chernyshevskaya entrance', ids:metro, osm:[], at:at(metro)},
  {key:'north-corridor-houses', name:'Маяковского · Восстания · Радищева', nameEn:'Central north street houses', ids:corridor, osm:[], at:at(corridor)},
];
