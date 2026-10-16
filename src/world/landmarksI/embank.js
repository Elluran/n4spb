// landmarksI/embank.js - Palace Embankment frontage of the Winter Palace / Hermitage ensemble: the two bronze lions of the Palace Pier (Dvortsovaya pristan, 1832, copper repousse by I. Prang after I. Prokofiev, on cast-iron
// plinths by L. Charlemagne and red granite blocks; photo 136, OSM relation r2465243 with two plinth rectangles at (-2382,-826) and (-2360,-841), 26 m apart on both sides of the descent to the Neva), the
// services (monuments, photo spots) and the colliders of the plinths.  The quay wall / water / stairs are the environment module's, the Palace Bridge the bridges module's.
import * as THREE from 'three';
import { toWorld, toUV } from './frame.js';
import { MONUMENTS } from '../data/city.js';

const sph = (() => { let g; return () => (g ||= new THREE.SphereGeometry(1, 9, 6)); })();

/** a standing lion (photo 136): +x = forward (the head), feet at y = 0, one forepaw on a ball; side = +1 / -1 mirrors the head turn */
function lion(P, m, side) {
  const ell = (x, y, z, rx, ry, rz) => P.geo(m, sph(), x, y, z, 0, 0, 0, rx, ry, rz);
  ell(0, 1.28, 0, 1.45, 0.62, 0.52);                                   // body
  ell(-1.25, 1.2, 0, 0.55, 0.52, 0.42);                                // haunch
  ell(1.05, 1.5, 0, 0.78, 0.82, 0.62);                                 // chest + mane
  ell(1.55, 1.82, side * 0.22, 0.66, 0.7, 0.62);                       // mane around the head
  ell(1.95, 1.7, side * 0.3, 0.4, 0.36, 0.34);                         // face, turned inward
  P.box(m, 2.15, 2.5, 1.5, 1.68, side * 0.3 - 0.17, side * 0.3 + 0.17, 'b');                  // muzzle
  for (const [x, z, h] of [[-1.2, 0.3, 0.85], [-1.2, -0.3, 0.85], [0.95, 0.3, 0.9], [0.95, -0.3, 0.9]]) P.cyl(m, [x, 0.08, z], [x, h, z], 0.15, 0.22, 6, false);   // legs
  P.cyl(m, [1.45, 0.62, side * 0.3], [1.7, 0.7, side * 0.3], 0.17, 0.17, 6, true);              // the forepaw on the ball
  P.geo(m, sph(), 1.62, 0.34, side * 0.3, 0, 0, 0, 0.3, 0.3, 0.3);                               // ball
  P.cyl(m, [-1.75, 1.3, 0], [-2.2, 0.9, 0.05], 0.1, 0.07, 5, false);                          // tail
  P.geo(m, sph(), -2.25, 0.8, 0.05, 0, 0, 0, 0.17, 0.2, 0.17);                                  // tuft
}

export function buildEmbank(K, PM, ctx, svc) {
  const S = K.svc, P = K.P;
  const spot = (u, v, name, yawDeg, pitch = 6) => { const [x, z] = toWorld(u, v); S.photoSpots.push({ x, z, yaw: yawDeg, pitch, name }); };
  // looking at the palace from the square (toward -u = NW: yaw +36), from the embankment, from the courtyard, the atlantes, the canal arch
  spot(-35, 0, 'Зимний дворец с Дворцовой площади', 36);
  spot(-325, 0, 'Зимний дворец с набережной', -144);
  spot(-170, 0, 'Большой двор Зимнего дворца', 36);
  spot(-118, -221, 'Атланты Нового Эрмитажа', 36, 10);
  spot(-192, -286, 'Арка над Зимней канавкой', 36, 4);
  const mon = (id, name, u, v, h) => { const [x, z] = toWorld(u, v); S.monuments.push({ id, name, x, z, h }); };
  mon('lmI-winter-palace', 'Зимний дворец', -190, -5, 26);
  mon('lmI-atlantes', 'Атланты Нового Эрмитажа', -134.7, -221.1, 10);
  mon('lmI-hermitage-theatre', 'Эрмитажный театр', -253, -332, 19);
  mon('lmI-small-hermitage', 'Малый Эрмитаж', -203, -140, 20);

  // ---- the lions of the Palace Pier
  const rec = (MONUMENTS || []).find((m) => m.id === 'r2465243');
  const lm = K.mat('#6d7a46', { name: 'lmI-lion', paint: 0.03 }), pl = K.mat('#58673c', { name: 'lmI-lionplinth' }), gr = K.mat('#b07a6c', { name: 'lmI-lionblock' });
  const rots = Math.atan2(S_(), -C_());                                               // forward = toward the Neva (-u)
  const blocks = rec && rec.polys && rec.polys.length >= 2 ? rec.polys.map((p) => { let cx = 0, cz = 0; for (let i = 0; i < 8; i += 2) { cx += p.o[i] / 4; cz += p.o[i + 1] / 4; } return [cx, cz]; }) : [[-2382, -825.5], [-2360.5, -840.6]];
  blocks.forEach(([cx, cz], i) => {
    const side = i === 0 ? 1 : -1;
    P.push(cx, 0, cz, rots);
    P.box(gr, -2.8, 2.8, 0, 1.55, -0.93, 0.93, 'b');
    P.box(pl, -2.65, 2.65, 1.55, 2.05, -0.8, 0.8, 'b');
    P.box(pl, -2.0, 2.0, 2.05, 2.4, -0.62, 0.62, 'b');
    for (const sx of [-1, 1]) P.cyl(pl, [sx * 2.5, 1.9, 0.85], [sx * 2.5, 1.9, 0.95], 0.28, 0.28, 8, true);
    P.push(-0.2, 2.4, 0, 0); lion(P, lm, side); P.pop();
    P.pop();
    ctx.physics.addBox(cx, cz, 5.8, 1.9, rots, 0, 3.0);
  });
  svc.lions = blocks.length;
  void toUV;
}
function S_() { return Math.sin(54 * Math.PI / 180); }
function C_() { return Math.cos(54 * Math.PI / 180); }
