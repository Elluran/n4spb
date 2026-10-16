// landmarksC/bank.js - the two quay buildings of the claim "fontanka-bank": Fontanka 33 (w28962563, the sports school SDYuSShOR-1: a 3-storey classical house of the Anichkov Palace complex,
// cream-white stucco with white trim, hipped green roof) and Fontanka 50 (w47457765, house of the architect Grebyonka: 5 storeys of red-brown brick with light trim, flat sheet roof).
// Plain Petersburg fronts from the shared stucco vocabulary (house.js): window rows, string courses, a cornice; heights from L.heightOf (cornice 13.5 / 21 m).  The other embankment
// houses stay with `city`; the granite walls are environment's.
import { buildHouse } from './house.js';

export function build(K) {
  const L = K.L, M = K.mats;
  const all = L.groupMembers('fontanka-bank').filter((r) => !r.skip);
  const r33 = all.filter((r) => r.id === 'w28962563'), r50 = all.filter((r) => r.id === 'w47457765');
  if (r33.length) {
    K.svc.houses.push({ id: 'w28962563', name: 'Набережная Фонтанки, 33', nameEn: 'Fontanka embankment 33 (sports school)', x: -580, z: 51 });
    buildHouse(K, { recs: r33, hc: 13.0, wall: '#eadcc8', court: '#e4d6c0', plinth: 0.9, plinthMat: M.graniteWarm, floors: [4.6, 4.2, 3.9], roofMat: M.roofGreen, courtPitch: 3.8, cornice: 'classic', corniceMat: M.trim });
  }
  if (r50.length) {
    K.svc.houses.push({ id: 'w47457765', name: 'Набережная Фонтанки, 50', nameEn: 'Fontanka embankment 50 (Grebyonka house)', x: -511, z: 197 });
    buildHouse(K, { recs: r50, hc: 20.5, wall: '#b8745a', court: '#a8684f', plinth: 1.1, plinthMat: M.graniteWarm, floors: [4.4, 4.0, 3.8, 3.6, 3.4], roofMat: M.roofSilver, courtPitch: 3.2, cornice: 'classic', corniceMat: M.cream });
  }
}
