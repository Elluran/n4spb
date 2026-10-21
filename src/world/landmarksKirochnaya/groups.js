import { ROADS } from '../data/city.js';
export const CAMPUS = [[1118,-1237.6],[1150.5,-1242.2],[1241.6,-1239.8],[1343.1,-1237],[1336.5,-1068.8],[1244,-1047],[1134.4,-1048.8],[1110.1,-1100.5]];
export const CAMPUS_ROADS = ROADS.filter(r => r.hw !== 'tertiary' && r.pts.length > 3 && r.pts.every((v,i)=>i%2===0?v>1110&&v<1330:v< -1065&&v> -1255));
export const CAMPUS_IDS = ['w30324355','w232918735','w232918780','w232918782','w30324674','w232918789','w30324672','r3127704','w30324673','w232918674','w232918673','w232918710','w232918712','w232918716','w232918719','w232918732','w232918727','r3127701','r3127705','r3127707'];
export const GROUPS_LIST = [{ key:'kirochnaya-clinical-institute', name:'Клинический институт Елены Павловны', nameEn:'Elena Pavlovna Clinical Institute', ids:CAMPUS_IDS, osm:CAMPUS_ROADS.map(r=>r.id), at:[1230,-1214] }];
export function inCampus(x,z) { let hit=false;for(let i=0,j=CAMPUS.length-1;i<CAMPUS.length;j=i++){const a=CAMPUS[i],b=CAMPUS[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit; }
