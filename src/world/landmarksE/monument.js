// landmarksE/monument.js - the Catherine II monument (Mikeshin / Chizhov / Opekushin / Grimm, 1873) at (u 352, v 74) = (-801, -105) and the four cast candelabra of the garden.
// Dossier section 5.4 (+ CRITIC), proportions re-measured on photo 077 (Catherine 4.35 m as the scale): total ~13.9 m: granite podium 2.0 m (13.4 m wide, two wing blocks, a stair of 5 treads on the
// Nevsky / north side), dark red-brown granite round drum 1.4 m with the bronze plaque, a bell-shaped green-black bronze base (to 6.1 m) with the NINE bronze figures standing on its rim round the
// narrow column (Rumyantsev, Potemkin, Suvorov face Nevsky; Derzhavin, Dashkova the Anichkov Palace; Bezborodko, Betskoy the library; Chichagov, Orlov-Chesmensky the theatre), the upper drum with
// garlands (8.8-9.8 m) and Catherine (4.2 m, robe + ermine mantle, sceptre right, laurel wreath left, the imperial crown at her feet).  Chain: 16 pink-grey stone posts on r 9.5 with black chain.
// All in the ensemble frame (local +x = west, local +z = north = the front).
import * as THREE from 'three';
import { atUV, toWorld, ROT } from './frame.js';
import { ellip } from './sculpt.js';
import { figureMats } from '../lib/figures.js';
import { catherine, associate } from './statues.js';

const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);

/** a standing bronze figure (coat, torso, head), 2.9 m at scale 1, faces local +z; pose 0 = hands down, 1 = arm raised, 2 = holds a staff / sword, 3 = hat in hand */
export function figure(P, mat, x, y, z, rot, s, pose) {
  P.push(x, y, z, rot);
  const c = (a, b, r0, r1, seg = 7) => P.cyl(mat, [a[0] * s, a[1] * s, a[2] * s], [b[0] * s, b[1] * s, b[2] * s], r0 * s, r1 * s, seg, true);
  c([0, 0, 0], [0, 1.45, 0], 0.5, 0.34, 8);
  c([0, 1.4, 0], [0, 2.15, 0], 0.34, 0.4, 8);
  ellip(P, mat, 0, 2.2 * s, 0, 0.5 * s, 0.17 * s, 0.26 * s, 0, 0, 0, 6);
  c([0, 2.2, 0], [0, 2.38, 0], 0.11, 0.1, 6);
  ellip(P, mat, 0, 2.6 * s, 0.02 * s, 0.2 * s, 0.23 * s, 0.21 * s, 0, 0, 0, 7);
  if (pose === 1) { c([0.45, 2.15, 0], [0.7, 2.7, 0.2], 0.09, 0.07, 5); c([-0.45, 2.15, 0], [-0.5, 1.5, 0.2], 0.09, 0.07, 5); }
  else if (pose === 2) { c([0.45, 2.15, 0], [0.55, 1.5, 0.3], 0.09, 0.07, 5); c([0.55, 0.0, 0.32], [0.55, 3.0, 0.32], 0.035, 0.03, 4); c([-0.45, 2.15, 0], [-0.5, 1.5, 0.15], 0.09, 0.07, 5); }
  else if (pose === 3) { c([0.45, 2.15, 0], [0.6, 1.55, 0.3], 0.09, 0.07, 5); c([-0.45, 2.15, 0], [-0.7, 1.9, 0.35], 0.09, 0.07, 5); ellip(P, mat, -0.7 * s, 1.95 * s, 0.38 * s, 0.17 * s, 0.07 * s, 0.17 * s, 0, 0, 0, 6); }
  else { c([0.45, 2.15, 0], [0.62, 1.7, 0.1], 0.09, 0.07, 5); c([-0.45, 2.15, 0], [-0.6, 1.7, 0.1], 0.09, 0.07, 5); }
  P.pop();
}

export function monument(K, ctx) {
  const P = K.P, M = K.G.M, ph = ctx.physics, T = K.ctx.mat.toon;
  const chainPost = T('#9a8077', { name: 'lmE-chainPost' });
  const RISE = 0.4, TOP = 2.0;
  atUV(P, 352, 74, () => {
    // ---- the podium: a granite block 13.4 m wide with two wing blocks and the stair between them (5 treads, north side), top at 2.0 m
    P.box(M.graniteGrey, -6.7, 6.7, 0, TOP - 0.06, -4.8, 4.0, 'b');
    P.box(M.redGraniteLight, -6.75, 6.75, TOP - 0.06, TOP, -4.85, 4.05, 'b');
    for (const sx of [-1, 1]) {
      const x0 = sx > 0 ? 3.5 : -6.9, x1 = sx > 0 ? 6.9 : -3.5;
      P.box(M.graniteGrey, x0, x1, 0, TOP + 0.12, -4.9, 5.2, 'b'); P.box(M.redGraniteLight, x0 - 0.05, x1 + 0.05, TOP + 0.12, TOP + 0.24, -4.95, 5.25, 'b');
    }
    for (let i = 0; i < 5; i++) P.box(M.graniteGrey, -3.5, 3.5, i * RISE, (i + 1) * RISE, 4.0, 6.0 - i * 0.4, 'b');
    // ---- round dark red granite drum with the bronze plaque on the front (north)
    P.cyl(M.redGranite, [0, TOP, 0], [0, 3.4, 0], 3.3, 3.3, 32, true);
    P.cyl(M.redGraniteLight, [0, TOP, 0], [0, TOP + 0.14, 0], 3.5, 3.5, 32, true); P.cyl(M.redGraniteLight, [0, 3.3, 0], [0, 3.42, 0], 3.45, 3.45, 32, true);
    P.box(M.bronze, -1.25, 1.25, 2.45, 3.1, 3.25, 3.33, 'b'); P.box(M.bronzeGreen, -1.32, 1.32, 2.4, 2.45, 3.22, 3.35, 'b'); P.box(M.bronzeGreen, -1.32, 1.32, 3.1, 3.15, 3.22, 3.35, 'b');
    // ---- the bronze bell and the narrow column under the figures, the upper drum with the cap
    P.geo(M.bronzeGreen, lathe([[0.01, 3.4], [3.3, 3.4], [3.38, 3.6], [3.2, 3.95], [2.95, 4.4], [2.7, 5.0], [2.58, 5.6], [2.55, 6.0], [2.4, 6.08], [1.4, 6.08], [1.38, 8.8], [1.58, 8.86], [1.6, 9.8], [0.01, 9.8]]), 0, 0, 0);
    P.geo(M.bronze, new THREE.TorusGeometry(2.47, 0.08, 5, 32), 0, 6.06, 0, Math.PI / 2, 0, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.push(Math.sin(a) * 1.5, 9.3, Math.cos(a) * 1.5, a); P.geo(M.patina, new THREE.TorusGeometry(0.65, 0.07, 5, 12, Math.PI), 0, 0.25, 0, 0, 0, Math.PI); P.pop(); }
    P.cyl(M.gold, [-0.55, 9.8, 0.7], [-0.55, 10.05, 0.7], 0.22, 0.17, 8, true);
    // ---- the nine associates (shared figure kit, statues.js: coats, breeches, wigs, seated or standing) on the flat ring of the bronze bell, facing outward (angle a from north; local +x = west)
    const mk = figureMats(K.ctx).keys('bronze', 'bronze'), y0 = 9.8;
    [-160, -120, -80, -40, 0, 40, 80, 120, 160].forEach((deg, k) => { const a = deg * Math.PI / 180, r = 2.0; associate(k).place(P, mk, Math.sin(a) * r, 6.08, Math.cos(a) * r, a, 1.38); });
    // ---- Catherine (4.35 m): dress, ermine mantle, crown, sceptre and laurel wreath
    catherine().place(P, mk, 0, y0, 0.0, 0, 2.5);
    // ---- chain: 16 stone posts with iron ball caps on r 9.5 and a sagging black chain
    const n = 16, pr = 9.5, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([Math.sin(a) * pr, Math.cos(a) * pr]); }
    pts.forEach((p, i) => {
      P.cyl(chainPost, [p[0], 0.14, p[1]], [p[0], 0.85, p[1]], 0.2, 0.17, 8, true);
      P.geo(M.iron, new THREE.SphereGeometry(0.19, 8, 5), p[0], 0.98, p[1]);
      const q = pts[(i + 1) % n];
      for (let k = 0; k < 4; k++) { const t0 = k / 4, t1 = (k + 1) / 4, y = (t) => 0.78 - 0.22 * 4 * t * (1 - t); P.cyl(M.iron, [p[0] + (q[0] - p[0]) * t0, y(t0), p[1] + (q[1] - p[1]) * t0], [p[0] + (q[0] - p[0]) * t1, y(t1), p[1] + (q[1] - p[1]) * t1], 0.022, 0.022, 3, false); }
    });
  });
  // colliders: the drum, the chain posts, walk boxes for the stair and the platform (the ground is flat: the steps need floors)
  const [cx, cz] = toWorld(352, 74);
  ph.addCylinder(cx, cz, 3.45, 0, 15);
  if (ph.addWalkBox) {
    for (let i = 0; i < 5; i++) { const far = 6.0 - i * 0.4, depth = far - 4.0, zc = (far + 4.0) / 2, [wx, wz] = toWorld(352, 74 - zc); ph.addWalkBox(wx, wz, 7.0, depth, ROT, (i + 1) * RISE, 0); }
    const [px, pz] = toWorld(352, 74 + 0.4); ph.addWalkBox(px, pz, 13.4, 8.8, ROT, TOP, 0);
  }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, [wx, wz] = toWorld(352 + Math.sin(a) * 9.5, 74 - Math.cos(a) * 9.5); ph.addCylinder(wx, wz, 0.22, 0, 1.0); }
  K.svc.monuments.push({ id: 'w586436085', name: 'Памятник Екатерине II', nameEn: 'Catherine II monument', x: cx, z: cz, h: 14 });
}

/** the cast candelabra of the monument (1873): round stepped granite plinth, black-green fluted shaft with acanthus collars, three hexagonal lanterns on S-curved arms and a taller central one, ~5.5 m */
export function candelabrum(K, x, z, ctx) {
  const P = K.P, M = K.G.M, glass = K.G.M.lanternGlass || (K.G.M.lanternGlass = ctx.mat.emissive('#ffd9a0', 0.55));
  const iron = M.ironGreen;
  P.cyl(M.graniteGrey, [x, 0.12, z], [x, 0.42, z], 0.95, 0.9, 14, true); P.cyl(M.graniteGrey, [x, 0.42, z], [x, 0.62, z], 0.78, 0.7, 14, true);
  P.cyl(iron, [x, 0.62, z], [x, 1.1, z], 0.5, 0.3, 10, true);
  P.cyl(iron, [x, 1.1, z], [x, 3.5, z], 0.17, 0.12, 8, false);
  for (const y of [1.4, 2.4, 3.3]) P.cyl(iron, [x, y, z], [x, y + 0.16, z], 0.24, 0.19, 8, true);
  P.cyl(iron, [x, 3.5, z], [x, 3.9, z], 0.3, 0.16, 8, true);
  const lantern = (lx, ly, lz) => {
    P.cyl(iron, [lx, ly - 0.08, lz], [lx, ly, lz], 0.2, 0.2, 6, true);
    P.cyl(glass, [lx, ly, lz], [lx, ly + 0.62, lz], 0.27, 0.3, 6, true);
    P.cyl(iron, [lx, ly + 0.62, lz], [lx, ly + 0.92, lz], 0.36, 0.03, 6, true);
  };
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5, dx = Math.sin(a), dz = Math.cos(a);
    P.cyl(iron, [x, 3.55, z], [x + dx * 0.55, 3.9, z + dz * 0.55], 0.06, 0.05, 5, false);
    P.cyl(iron, [x + dx * 0.55, 3.9, z + dz * 0.55], [x + dx * 0.95, 3.75, z + dz * 0.95], 0.05, 0.04, 5, false);
    lantern(x + dx * 0.95, 3.75, z + dz * 0.95);
  }
  P.cyl(iron, [x, 3.9, z], [x, 4.6, z], 0.1, 0.07, 6, false);
  lantern(x, 4.6, z);
  ctx.physics.addCylinder(x, z, 0.9, 0, 5.6);
  K.svc.lamps.push({ x, z, h: 5.5 });
}
