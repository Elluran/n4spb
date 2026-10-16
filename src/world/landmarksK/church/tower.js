// church/tower.js - the bell tower (колокольня) over the canal: the base block 17.1 x 12.4 m (a -27.2 .. -14.8, b -7.8 .. 9.3) with the rock-faced granite foot, the west face with the gold keel-arched hood over the
// open chapel (Calvary mosaic), the big arched window with the Holy Face lunette and the two gold-ground icons, the grid of coats of arms; the N / S faces with the Deesis / Virgin mosaics; the belt of arches,
// the belfry with three arches per face, the drum with the white arcade and the gilded onion (cross 63 m).  Dossier 3.1 / 3.4, photos refs/saviour 006 010 011 029 078.
import * as G from '../geo.js';
import { aedicule } from './body.js';

export const TW = { a0: -27.2, a1: -14.8, b0: -7.8, b1: 9.3, cx: -21.0, cz: 0.75, PL: 3.3, TOP: 23.0 };

function plinth(K, x0, x1, len, rock = true) {
  const P = K.P, M = K.M;
  G.tbox(P, M.rock, x0, x1, 0, TW.PL - 0.12, 0, 0.4, 4.4, 2.4, 'bk');
  P.box(M.white, x0, x1, TW.PL - 0.12, TW.PL + 0.16, 0, 0.55, 'bk');
  void len; void rock;
}

/** the grid of coats of arms as a textured quad over the wall (the holes in the texture show the brick) */
function armsGrid(K, mat, cols, rows, x0, y0, y1) {
  const P = K.P;
  P.quad(mat, [x0, y0, 0.05], [x0 + cols, y0, 0.05], [x0 + cols, y1, 0.05], [x0, y1, 0.05], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

function westFace(K) {
  const P = K.P, M = K.M, len = TW.b1 - TW.b0, cx = len / 2;                     // 17.1
  G.wall(P, M.brick, 0, len, TW.PL, TW.TOP, 0, 3, 3);
  plinth(K, -0.4, len + 0.4, len);
  armsGrid(K, M.armsW, 16, 20, 0.55, 4.0, 23.0);
  // wall mouldings at both ends: brick strips with the tile column
  for (const [x0, x1] of [[0, 0.5], [len - 0.5, len]]) G.tbox(P, M.brickDark, x0 - (x0 === 0 ? 0.4 : 0), x1 + (x0 === 0 ? 0 : 0.4), TW.PL, TW.TOP, 0, 0.3, 3, 3, 'bk');
  // ---- the big arched window with the aedicule (3.2 x 7 m), balusters at the sides
  aedicule(K, cx, 8.4, 3.0, 6.8, { crown: false });
  for (let i = 1; i <= 4; i++) P.box(M.gun, cx - 1.5, cx + 1.5, 8.4 + i * 1.32, 8.4 + i * 1.32 + 0.07, 0.07, 0.12, '');
  P.box(M.gun, cx - 0.04, cx + 0.04, 8.4, 14.0, 0.07, 0.12, '');
  // lunette (6 m x 3 m) with the Holy Face + a ribbed limestone arch of 7.5 m span
  const lun = []; for (let i = 0; i <= 14; i++) { const t = Math.PI * i / 14; lun.push([cx + Math.cos(t) * 3.0, 15.6 + Math.sin(t) * 3.0]); } lun.reverse(); lun.push([cx - 3.0, 15.6]);
  const lunOuter = []; for (let i = 0; i <= 14; i++) { const t = Math.PI * i / 14; lunOuter.push([cx + Math.cos(t) * 3.85, 15.55 + Math.sin(t) * 3.85]); } lunOuter.push([cx - 3.85, 15.55]);
  G.frameRing(P, M.white, lunOuter, lun, 0.03, 0.22, 1);
  G.planeShape(P, M.mosLunette, lun, 0.1);
  P.box(M.white, cx - 3.9, cx + 3.9, 15.35, 15.62, 0.0, 0.3, 'bk');
  // icons: Mother of God (north, local x small) and St John (south), 1.5 x 4.5 m, in white frames
  for (const [x, mat] of [[cx - 2.95, M.iconMother], [cx + 2.95, M.iconJohn]]) {
    P.quad(mat, [x - 0.75, 8.8, 0.12], [x + 0.75, 8.8, 0.12], [x + 0.75, 13.3, 0.12], [x - 0.75, 13.3, 0.12], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    G.frameRing(P, M.white, [[x - 0.95, 8.6], [x + 0.95, 8.6], [x + 0.95, 13.5], [x - 0.95, 13.5]], [[x - 0.75, 8.8], [x + 0.75, 8.8], [x + 0.75, 13.3], [x - 0.75, 13.3]], 0.03, 0.16, 1);
  }
  // ---- the gold keel-arched hood over the open chapel (2.1 x 3.3 m niche, outer 4.2 m wide, apex 6.4 m)
  const outer = G.hoodPts(5.0, 4.3, 10), inner = G.hoodPts(3.1, 3.55, 10);
  P.push(cx, 3.3, 0, 0);
  G.frameRing(P, M.gold, outer, inner, 0.0, 2.0, 2);                                  // the shell of the hood (gold)
  G.frameRing(P, M.gold, G.scalePts(outer, 1.06, 1.04), outer, 1.8, 0.2, 2);          // a gilded front band
  G.planeShape(P, M.mosCalvary, inner, 0.08);                                           // the Calvary mosaic at the back of the niche
  P.box(M.white, -0.6, 0.6, 0, 0.7, 0.1, 0.8, 'b');                                   // the marble pedestal at the cross foot
  P.pop();
  // majolica panels flanking the hood (turquoise, gold star, roses): atlas cell 0 / 5 as a stand-in, double frame
  for (const s of [-1, 1]) {
    const x = cx + s * 3.9, u0 = s < 0 ? 0.25 : 0.5;
    P.box(M.brickDark, x - 0.62, x + 0.62, 3.75, 5.05, 0.0, 0.1, 'bk');
    P.quad(M.majolica, [x - 0.5, 3.87, 0.16], [x + 0.5, 3.87, 0.16], [x + 0.5, 4.93, 0.16], [x - 0.5, 4.93, 0.16], [0, 0, 1], [[u0, 0.5], [u0 + 0.25, 0.5], [u0 + 0.25, 1], [u0, 1]]);
  }
  // the telescoping corner oriels (photo 029): stacked boxes with a green copper ledge, two cream colonnettes and a coat-of-arms square each
  for (const x of [0.62, len - 0.62]) for (let k = 0; k < 4; k++) {
    const y = 5.6 + k * 4.4;
    P.box(M.copper, x - 0.5, x + 0.5, y - 0.12, y, 0.0, 0.75, 'b');
    G.tbox(P, M.brickDark, x - 0.45, x + 0.45, y, y + 3.0, 0.0, 0.62, 3, 3, 'bk');
    P.cyl(M.white, [x - 0.28, y + 0.2, 0.66], [x - 0.28, y + 2.8, 0.66], 0.06, 0.06, 6, false); P.cyl(M.white, [x + 0.28, y + 0.2, 0.66], [x + 0.28, y + 2.8, 0.66], 0.06, 0.06, 6, false);
    P.quad(M.armsStrip, [x - 0.26, y + 1.0, 0.64], [x + 0.26, y + 1.0, 0.64], [x + 0.26, y + 1.52, 0.64], [x - 0.26, y + 1.52, 0.64], [0, 0, 1], [[(k * 3 % 12) / 12, 0.5], [(k * 3 % 12 + 1) / 12, 0.5], [(k * 3 % 12 + 1) / 12, 0.667], [(k * 3 % 12) / 12, 0.667]]);
  }
  // pale green downpipes
  for (const x of [0.9, len - 0.9]) P.cyl(M.copper, [x, 0.5, 0.45], [x, 22.5, 0.45], 0.08, 0.08, 6, false);
}

function sideFace(K, len, o) {
  const P = K.P, M = K.M, hideX0 = o.hideX0, hideX1 = o.hideX1;           // x range whose foot is hidden by the gallery (below 9.3)
  G.wall(P, M.brick, 0, len, 9.2, TW.TOP, 0, 3, 3);
  if (hideX0 > 0.01) { G.wall(P, M.brick, 0, hideX0, TW.PL, 9.2, 0, 3, 3); plinth(K, 0, hideX0, len); }
  if (hideX1 < len - 0.01) { G.wall(P, M.brick, hideX1, len, TW.PL, 9.2, 0, 3, 3); plinth(K, hideX1, len, len); }
  armsGrid(K, M.armsNS, 12, 20, 0.2, 4.0, 23.0);
  const mx = 6.2;
  P.quad(o.mosMat, [mx - 2.25, 9.8, 0.1], [mx + 2.25, 9.8, 0.1], [mx + 2.25, 15.3, 0.1], [mx - 2.25, 15.3, 0.1], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  G.frameRing(P, M.white, [[mx - 2.5, 9.55], [mx + 2.5, 9.55], [mx + 2.5, 15.55], [mx - 2.5, 15.55]], [[mx - 2.25, 9.8], [mx + 2.25, 9.8], [mx + 2.25, 15.3], [mx - 2.25, 15.3]], 0.03, 0.18, 1);
}

export function tower(K) {
  const P = K.P, M = K.M;
  // ---- the three faces of the base block
  G.onFace(P, TW.a0, TW.b0, -1, 0, () => westFace(K));
  G.onFace(P, TW.a1, TW.b0, 0, -1, () => sideFace(K, 12.4, { hideX0: 0, hideX1: 8.8, mosMat: M.mosDeesis }));
  G.onFace(P, TW.a0, TW.b1, 0, 1, () => sideFace(K, 12.4, { hideX0: 3.6, hideX1: 12.4, mosMat: M.mosVirgin }));
  // ---- cornice ring at 23 (projects 0.55)
  const y = TW.TOP, a0 = TW.a0, a1 = TW.a1, b0 = TW.b0, b1 = TW.b1;
  P.box(M.white, a0 - 0.55, a1, y - 0.5, y + 0.4, b0 - 0.55, b0, 'fr');
  P.box(M.white, a0 - 0.55, a1, y - 0.5, y + 0.4, b1, b1 + 0.55, 'kr');
  P.box(M.white, a0 - 0.55, a0, y - 0.5, y + 0.4, b0, b1, 'r');
  // ---- the belt of arches with roundels (23.4 - 29): the block steps in by 0.7 m
  const ia0 = a0 + 0.7, ia1 = a1 - 0.0, ib0 = b0 + 0.7, ib1 = b1 - 0.7;
  G.tbox(P, M.archBelt, ia0, ia1, y + 0.4, 29.0, ib0, ib1, 12, 5.6, 'br');
  P.box(M.copper, ia0 - 0.15, ia1, y + 0.4, y + 0.55, ib0 - 0.15, ib1 + 0.15, 'b');
  P.box(M.white, ia0 - 0.3, ia1, 29.0, 29.5, ib0 - 0.3, ib1 + 0.3, 'r');
  // ---- belfry 10 x 10 m, three arches per face (29.5 - 40.2)
  const cx = TW.cx, cz = TW.cz, h = 5.0, yb0 = 29.5, yb1 = 40.2;
  for (const [nx, nz] of [[-1, 0], [0, -1], [0, 1], [1, 0]]) {
    // left end seen from outside: right = (nz, -nx)
    const rx = nz, rz = -nx, lx = cx + nx * h - rx * h, lz = cz + nz * h - rz * h;
    G.onFace(P, lx, lz, nx, nz, () => {
      P.quad(M.belfry, [0, yb0, 0], [10, yb0, 0], [10, yb1, 0], [0, yb1, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      // relief over the painted arches (photo 013 / 061: turned colonnettes, stepped arch rings, a ledge at the springing)
      for (const x of [1.64, 5.0, 8.36]) {
        G.frameRing(P, M.white, G.archPts(x, 30.05, 3.0, 7.95, 10), G.archPts(x, 30.17, 2.19, 7.48, 10), 0.0, 0.34, 1);
        P.box(M.whiteShade, x - 1.35, x + 1.35, 36.9, 37.1, 0, 0.5, 'b');
      }
      for (const x of [0.2, 3.32, 6.68, 9.8]) {
        P.cyl(M.white, [x, 30.2, 0.32], [x, 36.9, 0.32], 0.2, 0.2, 8, false);
        for (const y of [31.6, 33.4, 35.2]) P.cyl(M.whiteShade, [x, y, 0.32], [x, y + 0.28, 0.32], 0.3, 0.3, 8, true);
        P.cyl(M.whiteShade, [x, 36.9, 0.32], [x, 37.15, 0.32], 0.34, 0.34, 8, true);
      }
    });
  }
  P.box(M.white, cx - h - 0.45, cx + h + 0.45, 40.2, 40.9, cz - h - 0.45, cz + h + 0.45, 'b');
  // ---- drum with the white 8-arch arcade (40.9 - 47) and the cornice ring
  G.tube(P, M.arcade8, cx, cz, 40.9, 47.0, 4.2, 4.2, 32, 1, 1);
  G.tube(P, M.white, cx, cz, 47.0, 47.5, 4.65, 4.65, 32, 6, 1, { capTop: M.white });
  // ---- the gilded onion, ball and cross
  G.onion(P, M.gold, cx, 47.5, cz, 4.55, 0.92, 32, 20);
  G.ball(P, M.goldFlat, cx, 47.5 + 2.36 * 4.55 * 0.92 + 0.15, cz, 0.5, 10);
  G.cross(P, M.goldFlat, cx, 47.5 + 2.36 * 4.55 * 0.92 + 0.55, cz, 5.6, 0);
}
