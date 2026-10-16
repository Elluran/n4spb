// landmarksB/kozhevnikova.js - Nevsky 51, Dom Kozhevnikova (OSM r3323319, 1834-35; the "Ushakov / Natalie Kvasova" house of photo refs/nevsky/50).
//
// Dusty rose stucco (#c98f7e) with cream trim, 4 levels on the street (shops 4.3 m, piano nobile 4.6 m with cream tabernacle frames and a cartouche over each window, plain second
// floor, a low third floor under a frieze of white garlands), a flat cornice at 17.4 m with brick chimney stacks, a central carriage gateway with a black iron gate and a cast-iron
// balcony over it, shops left and right (generic tenants).  The street front faces NNE (the house stands on the SOUTH side of Nevsky).
import { buildHouse } from './house.js';
import { findEdge } from './kit.js';

const HC = 17.4, GF = 4.3, F1 = 8.9, F2 = 12.9, F3 = 16.3;
const ROSE = '#c98f7e', ROSE_COURT = '#d1a590', CREAM = '#e3d0b0';

export function build(K) {
  const L = K.L;
  const rec = L.groupMembers('nevsky-corner').find((r) => r.id === 'r3323319');
  if (!rec) return;
  K.svc.houses.push({ id: 'r3323319', name: 'Дом Кожевникова (Невский 51)', nameEn: 'Dom Kozhevnikova, Nevsky 51', x: -129, z: 39 });
  K.svc.photoSpots.push({ x: -112, z: -22, yaw: L.yawToward(-112, -22, -123, 9), pitch: 6, name: 'Дом Кожевникова' });
  const near = (e, ax, az, bx, bz) => !!findEdge([e], ax, az, bx, bz, 0.4);
  const info = buildHouse(K, {
    recs: [rec], hc: HC, wall: ROSE, court: ROSE_COURT, plinth: 0.9, floors: [4.3, 4.4, 3.8, 3.4],
    front: (e, c) => { if (near(e, -141.3, 4.7, -105.9, 13.4)) { front(K, c.len); return true; } return false; },
    roofMat: K.mats.roofSilver,
  });
  // brick chimney stacks over the front
  const fe = info.edges.find((e) => near(e, -141.3, 4.7, -105.9, 13.4));
  if (fe) K.onEdgeFn(fe, (len) => {
    const m = K.mat('#b4806a');
    for (const u of [3.5, 7.8, 12.0, 17.5, 22.5, 27.0, 31.5]) { K.P.box(m, u - 0.55, u + 0.55, HC + 0.45, HC + 2.6, -4.2, -3.0, 'b'); K.P.box(K.mats.shade, u - 0.68, u + 0.68, HC + 2.6, HC + 2.8, -4.3, -2.9, 'b'); }
  });
}

function front(K, len) {
  const P = K.P, M = K.mats, up = 0.45;
  const wall = K.wall(ROSE), cream = K.mat(CREAM);
  K.wallQuad(K.rust('#c4887a'), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(wall, 0, len, GF, HC + up, 3);
  // belts
  P.box(cream, 0, len, GF - 0.1, GF + 0.2, 0, 0.16, 'k');
  P.box(cream, 0, len, F1 - 0.08, F1 + 0.14, 0, 0.12, 'k');
  P.box(cream, 0, len, F2 - 0.06, F2 + 0.1, 0, 0.1, 'k');
  P.box(cream, 0, len, F3 - 0.1, F3 + 0.12, 0, 0.12, 'k');
  // the gateway in the middle, shops on both sides
  const g = len * 0.5 + 0.7;                                                     // u of the gateway centre (viewer's right = west)
  K.gate(g, 0.0, 3.4, 4.0, { sw: 0.36, doorMat: M.ironSoft, ringMat: cream });
  P.box(M.black, g - 1.4, g + 1.4, 0.0, 3.6, 0.1, 0.12, 'kb');                    // (door leaf is the iron gate)
  K.shopfront(1.0, g - 3.6, { pitch: 4.8, y0: 0.9, y1: 3.4, names: ['Меха', 'Кофе и бар', 'Одежда'], bgs: ['#2b2622', '#3a2a22', '#1f2326'], fgs: ['#f0e6cf'], awn: [], doors: [] });
  K.shopfront(g + 3.6, len - 1.0, { pitch: 5.4, y0: 0.9, y1: 3.4, names: ['Банк', 'Обмен валют', 'Кафе', 'Салон связи'], bgs: ['#e9e9e4', '#1b4fa8', '#4a1f26', '#e9e2d0'], fgs: ['#1b4fa8', '#ffffff', '#f3e6d0', '#2a2622'], awn: [2], doors: [1] });
  // windows: 13 bays, the gate bay carries the balcony door
  const xs = K.bays(1.2, len - 1.2, 2.75);
  xs.forEach((x, i) => {
    const gateBay = Math.abs(x - g) < 1.4;
    // piano nobile: cream tabernacle frames with a cartouche above
    K.window({ x, y: GF + 0.7, w: 1.15, h: 3.0, sw: 0.22, d: 0.1, surMat: cream, frame: 'brown', sill: false, hood: 'seg', hoodH: 0.3, hoodMat: cream });
    if (!gateBay) K.plane(K.R.shell, x - 0.75, x + 0.75, GF + 0.7 + 3.0 + 0.7, GF + 0.7 + 3.0 + 1.35, 0.1);
    K.window({ x, y: F1 + 0.8, w: 1.15, h: 2.1, sw: 0.14, d: 0.07, surMat: cream, frame: 'brown', sill: true });
    K.window({ x, y: F2 + 0.7, w: 1.1, h: 1.7, sw: 0.1, d: 0.06, surMat: cream, frame: 'brown', sill: false });
  });
  K.balcony(g - 1.9, g + 1.9, GF + 0.02, 0.9);
  // frieze of garlands under the cornice
  K.strip(K.R.frieze, 0.4, len - 0.4, HC - 1.0, HC - 0.2, 0.05);
  for (const u of [0.35, len - 0.35]) K.downpipe(u, 0.9, HC - 1.2, cream);
}
