// landmarksD/hospital.js - the main block of the Mariinsky hospital (Мариинская больница, Литейный пр., 56; Giacomo Quarenghi 1803-05; OSM w60353337).  Photos: refs/landmarksD/hospital 01 03 06.
// Saturated yellow stucco (#e6c448) with white trim, three storeys on a granite semi-basement (cornice ~14.5 m), a copper-green sheet roof (#6fae9a); the WEST front on Liteyny pr. (three parts: wings 39 m +
// 42 m and the 33 m central risalit) has a six-column Ionic portico on a flight of granite steps with a pediment (the double-headed eagle relief), the lettered frieze "Мариинская больница, учрежденная
// для бедных в 1803 году", and an angel on the apex (top ~ 22 m, angel 25 m).  The courtyard sides get plain windows.  The green iron fence along Liteyny comes from fences.js.
import { buildHouse } from './house.js';
import { portico } from './parts.js';
import { findEdge } from './kit.js';

const WALL = '#e6c448', ROOF = '#6fae9a';
const HC = 14.5, UP = 0.45;

export function build(K) {
  const L = K.L, M = K.mats, P = K.P;
  const rec = L.groupMembers('library').find((r) => r.id === 'w60353337');
  if (!rec) throw new Error('hospital record missing');
  K.svc.houses.push({ id: 'w60353337', name: 'Мариинская больница (Литейный, 56)', nameEn: 'Mariinsky hospital, main block', x: -102, z: -295 });
  K.svc.monuments.push({ id: 'w60353337', name: 'Мариинская больница', x: -128, z: -302, h: 25 });
  K.svc.photoSpots.push({ x: -160, z: -302, yaw: L.yawToward(-160, -302, -128, -302), pitch: 8, name: 'Мариинская больница' });
  const centre = (e) => !!findEdge([e], -128.0, -285.3, -127.1, -318.4, 0.5);
  const west = (e) => e.len > 8 && Math.abs(((Math.atan2(e.n[0], -e.n[1]) * 180 / Math.PI + 360) % 360) - 271) < 6;
  buildHouse(K, {
    name: 'hospital', recs: [rec], hc: HC, wall: WALL, court: '#e2c250', plinth: 1.5, floors: [4.2, 5.2, 5.1], cornice: 'classic', roofMat: K.mat(ROOF, { name: 'lmD-roof-hosp' }), upstand: UP,
    railing: false, plinthMat: M.graniteWarm, courtPitch: 3.6, corniceScale: 0.9,
    front: (e, c) => {
      if (centre(e)) { risalit(K, c.len); return true; }
      if (west(e)) { wing(K, c.len); return true; }
      return false;
    },
  });
  void P;
}

function rows(K, xs, M) {
  for (const x of xs) {
    K.window({ x, y: 2.1, w: 1.0, h: 1.7, sw: 0.14, d: 0.06, frame: 'white', surMat: M.trim, sill: false });
    K.window({ x, y: 5.5, w: 1.25, h: 3.2, sw: 0.2, d: 0.08, frame: 'white', surMat: M.trim, sill: true });
    K.window({ x, y: 10.5, w: 1.15, h: 2.6, sw: 0.16, d: 0.07, frame: 'white', surMat: M.trim, sill: false });
  }
}
function wing(K, len) {
  const M = K.mats;
  K.wallQuad(K.wall(WALL), 0, len, 0, HC + UP, 3);
  rows(K, K.bays(1.4, len - 1.4, 3.3), M);
  K.P.box(M.trim, 0, len, 4.15, 4.4, 0, 0.1, 'k');
  K.P.box(M.trim, 0, len, 9.3, 9.5, 0, 0.1, 'k');
  for (const x of [0.5, len - 0.5]) K.downpipe(x, 1.5, HC - 1.2, M.cream);
}
function risalit(K, len) {
  const M = K.mats, P = K.P, mid = len / 2;
  K.wallQuad(K.wall(WALL), 0, len, 0, HC + UP, 3);
  // doors / windows behind the columns
  K.gate(mid, 1.5, 2.2, 3.6, { sw: 0.3, d: 0.1 });
  const bays = K.bays(3.2, len - 3.2, 3.5).filter((x) => Math.abs(x - mid) > 1.9);
  rows(K, bays, M);
  const n = 6, xs = Array.from({ length: n }, (_, i) => 2.3 + i * (len - 4.6) / (n - 1));
  const top = portico(K, { x0: -0.3, x1: len + 0.3, depth: 1.5, y0: 1.5, y1: 12.2, r: 0.62, xs, ent: 1.8, ped: 3.4, ionic: true, mat: M.trim, matShade: M.cream, wallMat: K.wall(WALL), steps: true,
    text: 'МАРИИНСКАЯ БОЛЬНИЦА УЧРЕЖДЕННАЯ ДЛЯ БЕДНЫХЪ ВЪ 1803МЪ ГОДУ' });
  K.plane(K.R.coat, mid - 1.7, mid + 1.7, 12.2 + 1.8 + 0.35, 12.2 + 1.8 + 3.2, top.zf + 0.13);
  // the angel on the apex: pedestal, robe, wings, head, raised arm
  const ya = top.top, z = top.zf * 0.5, wmat = K.mat('#f1ece0');
  P.box(M.cream, mid - 0.7, mid + 0.7, ya, ya + 0.9, z - 0.7, z + 0.7, 'b');
  P.cyl(wmat, [mid, ya + 0.9, z], [mid, ya + 2.5, z], 0.42, 0.24, 8, true);
  P.box(wmat, mid - 0.9, mid + 0.9, ya + 1.5, ya + 2.7, z - 0.07, z + 0.07, 'b');
  P.geo(wmat, K.ballGeo ||= new K.THREE.SphereGeometry(1, 8, 6), mid, ya + 2.75, z, 0, 0, 0, 0.2, 0.24, 0.2);
  P.cyl(wmat, [mid + 0.15, ya + 2.2, z + 0.1], [mid + 0.55, ya + 3.4, z + 0.1], 0.07, 0.05, 5, false);
}
