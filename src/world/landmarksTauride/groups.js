import { TAURIDE_PATHS } from './terrain.js';
export const GROUPS_LIST = [
  {key:'tauride-palace',name:'Таврический дворец',nameEn:'Tauride Palace',ids:['r3801092'],osm:[],at:[1380,-1735]},
  {key:'paradny-quarter',name:'Парадный квартал',nameEn:'Paradny Quarter',ids:['w102153008','w102153013','w145419644','r1452259','r1967088','r3304715','r3304716','w102153007','w134638076','w134638078','w134638079'],osm:['w1501496505','w1501496506'],at:[944,-1038]},
  {key:'tauride-garden-bridges',name:'Мосты Таврического сада',nameEn:'Tauride Garden bridges',ids:[],osm:TAURIDE_PATHS.filter(p=>p.bridge).map(p=>p.id),at:[1226,-1712]},
];
