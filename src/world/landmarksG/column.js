// landmarksG/column.js - the Alexander Column (Montferrand 1834) at (-1983, -738): 47.5 m with the angel and cross, the red Pyterlahti granite shaft (25.6 m, 3.66 -> 3.19 m, entasis), the bronze Doric
// capital with its square abacus, the pedestal with four bronze reliefs and eagles at the corners, the three granite steps (OSM parts r18056121 / w13162447xx), the dark-green iron fence 16.5 x 16.5 m with
// fan panels, spear pickets, eagle posts and cannons at the corners and beside the gates, and the four gate posts of the OSM data.  Heights follow the OSM parts (docs/research/palace-square-hermitage.md section 5,
// refs/palace-square 105 113 115 116).  Everything is axis aligned to the palace axis: the frame has local x = -v (NE), local z = +u (SE); the front relief faces -u (the Winter Palace).
import * as THREE from 'three';
import { CX, CZ, ROT } from './frame.js';
import { angel, eagle } from './sculpt.js';
import { figureMats } from '../lib/figures.js';
import { angelFig } from './angel.js';

const latheOf = (pts, seg) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);

export function build(K, ctx) {
  const P = K.P, G = K.G, M = G.M;
  void angel;
  P.push(CX, 0, CZ, ROT);
  const hh = (h) => h / 2;
  // ---- steps and plinth (OSM: step3 10.1 sq 0-0.5, step2 9.1 sq -1.0, step1 8.1 sq -1.5, stylobate 6.3 sq -3.45)
  P.box(M.graniteStep, -5.05, 5.05, 0, 0.5, -5.05, 5.05, 'b');
  P.box(M.graniteStep, -4.55, 4.55, 0.5, 1.0, -4.55, 4.55, 'b');
  P.box(M.graniteStep, -4.05, 4.05, 1.0, 1.5, -4.05, 4.05, 'b');
  P.box(M.graniteRed, -3.15, 3.15, 1.5, 3.45, -3.15, 3.15, 'b');
  P.box(M.graniteRedDark, -3.0, 3.0, 3.45, 5.04, -3.0, 3.0, 'b');
  P.box(M.bronze, -2.5, 2.5, 5.04, 7.81, -2.5, 2.5, 'b');                                  // the die with the reliefs
  P.box(M.bronzeDark, -3.15, 3.15, 7.81, 8.21, -3.15, 3.15, 'b');
  P.box(M.bronze, -2.83, 2.83, 8.21, 9.0, -2.83, 2.83, 'b');
  P.box(M.bronzeDark, -2.5, 2.5, 9.0, 9.79, -2.5, 2.5, 'b');
  // reliefs: panel 4.4 x 2.4 on each face of the die, 2 cm proud
  const rel = (nx, nz) => {
    const px = nz !== 0 ? [1, 0] : [0, 1], o = 2.52, y0 = 5.45, y1 = 7.45, w = 2.1;
    const P0 = [nx * o + px[0] * -w, y0, nz * o + px[1] * -w], P1 = [nx * o + px[0] * w, y0, nz * o + px[1] * w], P2 = [P1[0], y1, P1[2]], P3 = [P0[0], y1, P0[2]];
    // winding is fixed by the wanted normal
    P.quad(M.reliefMat, P0, P1, P2, P3, [nx, 0, nz], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  };
  rel(0, -1); rel(0, 1); rel(1, 0); rel(-1, 0);
  // eagles on the four upper corners of the cornice (holding garlands in the original: a ring of oak leaves between them)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) eagle(K, M.bronzeDark, sx * 2.9, 8.2, sz * 2.9, Math.atan2(sx, sz), 1.1);
  for (const [nx, nz] of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {                                // garland swags: two half tori per face below the cornice
    P.push(nx * 2.58, 9.4, nz * 2.58, Math.atan2(nx, nz));
    P.geo(M.patina, new THREE.TorusGeometry(1.5, 0.12, 5, 14, Math.PI), 0, 9.55 - 9.4 + 0.15, 0, 0, 0, Math.PI, 1, 1, 1);
    P.pop();
  }
  // wreath ring at the foot of the shaft
  P.geo(M.bronzeDark, new THREE.TorusGeometry(1.95, 0.2, 6, 28), 0, 10.0, 0, Math.PI / 2, 0, 0, 1, 1, 1);
  // ---- shaft: entasis from r 1.83 (below) to 1.595 (top), 10.1 -> 36.07, 28 sides
  const sp = [];
  for (let i = 0; i <= 14; i++) { const t = i / 14; sp.push([1.83 + (1.595 - 1.83) * t + 0.045 * Math.sin(Math.PI * t), 10.1 + (36.07 - 10.1) * t]); }
  P.geo(M.shaft, latheOf(sp, 48), 0, 0, 0);
  // ---- Doric capital in bronze: echinus 36.07 -> 37.1, abacus 5.6 x 5.6 x 0.9, drum, collar and dome
  P.geo(M.bronzeDark, latheOf([[0.01, 36.0], [1.62, 36.0], [1.62, 36.1], [1.85, 36.3], [2.25, 36.7], [2.6, 37.1], [0.01, 37.1]], 24), 0, 0, 0);
  P.box(M.bronzeDark, -2.8, 2.8, 37.1, 38.0, -2.8, 2.8, '');
  P.geo(M.bronzeDark, latheOf([[0.01, 38.0], [1.5, 38.0], [1.5, 39.75], [1.9, 39.75], [1.9, 40.1], [1.5, 40.1], [1.5, 40.14], [1.4, 40.4], [1.15, 40.68], [0.8, 40.88], [0.35, 41.0], [0.01, 41.04]], 24), 0, 0, 0);
  angelFig().place(P, figureMats(ctx).keys('bronze', 'bronze'), 0, 41.0, 0, Math.PI, 2.43);                                       // faces the palace (-z is the front of the frame, the angel looks to -u)
  P.pop();

  // ---- the fence: 16.5 x 16.5, 1.5 m, dark green iron
  fence(K, M);

  // ---- colliders: the fence, the plinth block, the walk boxes of the steps (reachable by flying / jumping over the fence)
  const phys = ctx.physics;
  phys.addBox(CX, CZ, 6.4, 6.4, ROT, 0, 50);
  for (const [w, top] of [[10.1, 0.5], [9.1, 1.0], [8.1, 1.5]]) if (phys.addWalkBox) phys.addWalkBox(CX, CZ, w, w, ROT, top, 0);
  const H = 8.25, ln = 2 * H + 0.4;
  for (const [lx, lz, ax] of [[0, -H, 0], [0, H, 0], [-H, 0, 1], [H, 0, 1]]) {
    // local (x, z) -> world: x_world = CX + lx*cos(ROT) + lz*sin(ROT); z_world = CZ - lx*sin(ROT) + lz*cos(ROT)
    const wx = CX + lx * Math.cos(ROT) + lz * Math.sin(ROT), wz = CZ - lx * Math.sin(ROT) + lz * Math.cos(ROT);
    phys.addBox(wx, wz, ln, 0.35, ax ? ROT + Math.PI / 2 : ROT, 0, 1.6);
  }
  K.svc.monuments.push({ id: 'alexander-column', name: 'Александровская колонна', nameEn: 'Alexander Column', x: CX, z: CZ, h: 47.5 });
  { const x = CX - 16 * 0.5878, z = CZ - 16 * 0.809; K.svc.photoSpots.push({ x, z, yaw: K.L.yawToward(x, z, CX, CZ), pitch: 28, name: 'Александровская колонна', nameEn: 'Alexander Column, from the palace side' }); }
}

/** the fence in the column frame (local x = -v, z = +u) */
function fence(K, M) {
  const P = K.P, G = K.G;
  P.push(CX, 0, CZ, ROT);
  const H = 8.25, N = 6, pitch = 2 * H / N, h = 1.5;
  const post = (x, z, big) => {
    P.box(M.fence, x - 0.1, x + 0.1, 0, h + 0.05, z - 0.1, z + 0.1, 'b');
    P.cyl(M.fence, [x, h + 0.05, z], [x, h + 0.3, z], 0.09, 0.02, 6, false);
    if (big) eagle(K, M.bronzeDark, x, h + 0.3, z, 0, 0.36);
  };
  for (let side = 0; side < 4; side++) {
    P.push(0, 0, 0, side * Math.PI / 2);                                                       // each side is built on the z = -H line, facing local -z
    for (let k = 0; k <= N; k++) {
      const x = -H + k * pitch;
      if (k < N) post(x, -H, true);                                                             // the corner post of the next side is the k = N of this one: skipped
    }
    for (let k = 0; k < N; k++) {
      const x0 = -H + k * pitch + 0.1, x1 = x0 + pitch - 0.2, gate = k === 2 || k === 3;
      // rails
      P.box(M.fence, x0, x1, 0.55, 0.62, -H - 0.025, -H + 0.025, '');
      P.box(M.fence, x0, x1, h - 0.28, h - 0.22, -H - 0.025, -H + 0.025, '');
      // pickets with spear heads
      const n = Math.round((x1 - x0) / 0.17);
      for (let i = 0; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n;
        P.box(M.fence, x - 0.011, x + 0.011, 0.62, h - 0.05, -H - 0.011, -H + 0.011, 'tb');
        P.geo(M.fence, K.spearGeo, x, h - 0.05, -H, 0, 0, 0, 1, 1, 1);
      }
      // low fan panel (alpha cut-out sunburst) on both faces
      if (!gate) {
        const fx0 = x0 + 0.05, fx1 = x1 - 0.05;
        P.quad(G.fanMat, [fx0, 0.02, -H - 0.012], [fx1, 0.02, -H - 0.012], [fx1, 0.6, -H - 0.012], [fx0, 0.6, -H - 0.012], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        P.quad(G.fanMat, [fx1, 0.02, -H + 0.012], [fx0, 0.02, -H + 0.012], [fx0, 0.6, -H + 0.012], [fx1, 0.6, -H + 0.012], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      } else P.box(M.fence, x0, x1, 0.62, 0.68, -H - 0.025, -H + 0.025, '');
    }
    // cannons flanking the gate (a pedestal, a bronze barrel standing on its breech, an eagle)
    for (const cx of [-1.9, 1.9]) cannon(K, M, cx, -H);
    P.pop();
  }
  P.pop();
}

function cannon(K, M, x, z) {
  const P = K.P;
  P.box(M.fence, x - 0.2, x + 0.2, 0, 0.5, z - 0.2, z + 0.2, 'b');
  P.cyl(M.bronzeDark, [x, 0.5, z], [x, 1.45, z], 0.17, 0.12, 8, true);
  P.cyl(M.bronzeDark, [x, 1.45, z], [x, 1.55, z], 0.19, 0.19, 8, true);
  eagle(K, M.bronzeDark, x, 1.5, z, 0, 0.34);
}
