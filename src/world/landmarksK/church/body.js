// church/body.js - the central cube (четверик) of the Church of the Saviour on Spilled Blood: four brick faces of five bays (corner strip | side bay | pilaster | central bay of three windows | pilaster | side bay | corner
// strip) in the church frame C (x = a toward the altar / east, z = b toward the south porch), the granite plinth with the plaque niches, the pilaster strips with majolica squares, belts of glazed plus-bricks,
// white window aedicules with ogee crowns, the baluster band, two rows of ochre blind arcature, the stepped cornice, and the four pointed-oval gables with their frame rings and mosaics.
// Heights (dossier 3.1 / 3.6, photos 011 015 039 068): plinth 3.2, lower windows 5.1 - 7.7, band 11.2 - 12.6, upper windows 13.4 - 15.7, arcature 20.4 - 21.6, cornice 22.8 - 24.5, gable apex 34.1.
import * as G from '../geo.js';

export const PL = 3.2, CORN = 24.5, GABLE_H = 9.6, GABLE_W = 14.5;
export const CUBE = { a0: -14.8, a1: 14.8, b0: -14.7, b1: 14.7 };

/** a window aedicule: arched glass, white frame, two colonnettes, sill, ogee crown.  x centre, y0 sill, w glass width, h glass height, crown width cw */
export function aedicule(K, x, y0, w, h, o = {}) {
  const P = K.P, M = K.M;
  G.planeShape(P, M.glassBlue, G.archPts(x, y0, w, h, 8), 0.06);
  G.frameRing(P, M.white, G.archPts(x, y0 - 0.16, w + 0.72, h + 0.44, 10), G.archPts(x, y0, w, h, 10), 0.02, 0.2, 1);
  for (const s of [-1, 1]) {
    const cx = x + s * (w / 2 + 0.28);
    P.cyl(M.white, [cx, y0 - 0.1, 0.2], [cx, y0 + h * 0.72, 0.2], 0.1, 0.1, 8, false);
    P.cyl(M.whiteShade, [cx, y0 + h * 0.3, 0.2], [cx, y0 + h * 0.34, 0.2], 0.13, 0.13, 8, false);
    P.box(M.white, cx - 0.14, cx + 0.14, y0 + h * 0.72, y0 + h * 0.72 + 0.1, 0.06, 0.34, 'b');
  }
  P.box(M.white, x - w / 2 - 0.45, x + w / 2 + 0.45, y0 - 0.3, y0 - 0.14, 0.02, 0.4, 'k');
  if (o.crown !== false) crown(K, x, y0 + h + 0.3 + w * 0.5 * 0.05, o.cw ?? w + 0.9, o.ch ?? 1.5);
}
/** an ogee (kokoshnik) crown with a rosette disc */
export function crown(K, x, y, w, h) {
  const P = K.P, M = K.M;
  P.push(x, y, 0, 0);
  G.frameRing(P, M.white, G.ogeePts(w, h, 8), G.scalePts(G.ogeePts(w, h, 8), 0.72, 0.62, 0, 0.12), 0.02, 0.22, 1);
  G.planeShape(P, M.brickDark, G.scalePts(G.ogeePts(w, h, 8), 0.72, 0.62, 0, 0.12), 0.08);
  P.cyl(M.whiteShade, [0, h * 0.34, 0.1], [0, h * 0.34, 0.2], w * 0.2, w * 0.2, 12, true);
  P.cyl(M.white, [0, h * 0.34, 0.2], [0, h * 0.34, 0.26], w * 0.13, w * 0.13, 12, true);
  P.pop();
}

/**
 * one face of the cube drawn in its facade frame (x to the right, z out).  len = face width.  o: { corner (N / S faces: the projecting bands run round the corners over the ends of the E / W faces), y0 (lowest drawn height), niches: [x..], grid: material of the plinth }
 */
export function cubeFace(K, len, o = {}) {
  const P = K.P, M = K.M, y0 = o.y0 ?? 0, yb = Math.max(y0, PL), E = (d) => (o.corner ? d : 0);
  G.wall(P, M.brick, 0, len, yb, CORN, 0, 3, 3);
  // ---- plinth
  if (y0 < PL) {
    G.tbox(P, o.rock ? M.rock : M.slab, -E(0.35), len + E(0.35), 0, PL - 0.12, 0, 0.35, o.rock ? 4.4 : 3, o.rock ? 2.4 : 3, 'bk');
    P.box(M.white, -E(0.55), len + E(0.55), PL - 0.12, PL + 0.18, 0, 0.55, 'bk');
    (o.niches || []).forEach((nx, i) => niche(K, nx, (o.nk || 0) + i));
  } else P.box(M.white, -E(0.55), len + E(0.55), yb - 0.02, yb + 0.18, 0, 0.55, 'bk');
  // ---- bay layout
  const cw = 12.0, side = (len - 2 * 1.0 - 2 * 1.8 - cw) / 2;
  const strips = [[0, 1.0], [1.0 + side, 1.0 + side + 1.8], [len - 1.0 - side - 1.8, len - 1.0 - side], [len - 1.0, len]];
  const bays = [{ x0: 1.0, x1: 1.0 + side, c: [1.0 + side / 2] }, { x0: 1.0 + side + 1.8, x1: len - 1.0 - side - 1.8, c: [len / 2 - 3.6, len / 2, len / 2 + 3.6] }, { x0: len - 1.0 - side, x1: len - 1.0, c: [len - 1.0 - side / 2] }];
  const yTop = 22.2;
  // pilaster strips with a column of majolica squares
  strips.forEach(([x0, x1], i) => {
    const a0 = i === 0 ? -E(0.35) : x0, a1 = i === 3 ? len + E(0.35) : x1;
    G.tbox(P, M.brickDark, a0, a1, yb, yTop, 0, 0.35, 3, 3, 'bk');
    const cx = (x0 + x1) / 2, tw = Math.min(1.1, (x1 - x0) * 0.62), yLo = Math.max(yb, 4.4) + 0.3, yHi = yTop - 0.4, vs = 8 * tw * 1.0;
    P.quad(M.pilTiles, [cx - tw / 2, yLo, 0.375], [cx + tw / 2, yLo, 0.375], [cx + tw / 2, yHi, 0.375], [cx - tw / 2, yHi, 0.375], [0, 0, 1],
      [[0, yLo / vs], [1, yLo / vs], [1, yHi / vs], [0, yHi / vs]]);
    // projecting impost blocks of cream stone on the strips at every storey line (photo 072 / 061)
    for (const iy of [4.5, 9.6, 17.8]) {
      if (iy < yb) continue;
      P.box(M.whiteShade, a0 - (i === 0 ? E(0.2) : 0.12), a1 + (i === 3 ? E(0.2) : 0.12), iy, iy + 0.38, 0, 0.62, 'bk');
      P.box(M.white, a0 - (i === 0 ? E(0.12) : 0.04), a1 + (i === 3 ? E(0.12) : 0.04), iy + 0.38, iy + 0.5, 0, 0.7, 'bk');
    }
  });
  // glazed belts across the bays
  for (const by of [4.3, 10.3, 12.8, 19.0]) {
    if (by < yb) continue;
    for (const b of bays) P.quad(M.belt, [b.x0, by, 0.04], [b.x1, by, 0.04], [b.x1, by + 0.4, 0.04], [b.x0, by + 0.4, 0.04], [0, 0, 1], [[b.x0 / 2.8, 0], [b.x1 / 2.8, 0], [b.x1 / 2.8, 1], [b.x0 / 2.8, 1]]);
  }
  // baluster band 11.2 - 12.6
  const yB = 11.2;
  P.box(M.white, -E(0.62), len + E(0.62), yB, yB + 0.32, 0, 0.62, 'bk');
  P.quad(M.balusters, [0, yB + 0.32, 0.5], [len, yB + 0.32, 0.5], [len, yB + 1.1, 0.5], [0, yB + 1.1, 0.5], [0, 0, 1], [[0, 0], [len / 0.8, 0], [len / 0.8, 1], [0, 1]]);
  P.box(M.white, -E(0.62), len + E(0.62), yB + 1.1, yB + 1.42, 0, 0.62, 'bk');
  P.box(M.white, -E(0.5), len + E(0.5), yB + 0.32, yB + 1.1, 0, 0.5, 'bkft');
  // windows
  for (const b of bays) {
    const three = b.c.length === 3;
    for (const x of b.c) { if (y0 < 8.5) aedicule(K, x, 5.1, three ? 1.1 : 1.3, 2.6, { cw: three ? 1.9 : 2.3, ch: 1.55 }); }
    if (three) {                                                                                            // upper tier: a five-lobed cluster of crowns over three windows
      for (const x of b.c) aedicule(K, x, 13.4, 1.1, 2.3, { crown: false });
      const yc = 16.35; crown(K, b.c[1], yc, 2.8, 2.1); crown(K, b.c[0], yc, 2.1, 1.7); crown(K, b.c[2], yc, 2.1, 1.7); crown(K, b.c[0] - 2.0, yc, 1.5, 1.2); crown(K, b.c[2] + 2.0, yc, 1.5, 1.2);
    } else for (const x of b.c) aedicule(K, x, 13.4, 1.2, 2.3, { cw: 2.2, ch: 1.8 });
  }
  // pale-green downpipes on the left-centre pilaster (photo 072 / 061)
  for (const px of [len / 2 - 6.9]) { P.cyl(M.copper, [px, 3.5, 0.72], [px, 23.5, 0.72], 0.09, 0.09, 6, false); P.cyl(M.copperDark, [px, 3.5, 0.72], [px, 3.9, 0.72], 0.14, 0.14, 6, true); }
  // arcature, dentils, stepped cornice
  P.quad(M.arcature, [0, 20.4, 0.05], [len, 20.4, 0.05], [len, 21.6, 0.05], [0, 21.6, 0.05], [0, 0, 1], [[0, 0], [len / 2.4, 0], [len / 2.4, 1], [0, 1]]);
  P.box(M.white, -E(0.3), len + E(0.3), 20.2, 20.4, 0, 0.3, 'bk'); P.box(M.white, -E(0.3), len + E(0.3), 21.6, 21.75, 0, 0.3, 'bk');
  G.tbox(P, M.brickDark, -E(0.3), len + E(0.3), 22.2, 22.8, 0, 0.3, 3, 3, 'bk');
  P.box(M.whiteShade, -E(0.7), len + E(0.7), 22.8, 23.6, 0, 0.7, 'bk');
  P.box(M.white, -E(1.0), len + E(1.0), 23.6, CORN, 0, 1.0, 'bk');
}
function niche(K, x, k = 0) {
  const P = K.P, M = K.M;
  G.frameRing(P, M.white, G.archPts(x, 0.4, 2.7, 3.0, 10), G.archPts(x, 0.55, 2.2, 2.55, 10), 0.34, 0.16, 1);
  G.planeShape(P, M.graniteDark, G.archPts(x, 0.55, 2.2, 2.55, 10), 0.4);
  P.quad(M.plaques[k % M.plaques.length], [x - 0.78, 1.0, 0.45], [x + 0.78, 1.0, 0.45], [x + 0.78, 2.1, 0.45], [x - 0.78, 2.1, 0.45], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  for (const s of [-1, 1]) P.cyl(M.bronze, [x + s * 0.95, 0.95, 0.47], [x + s * 0.95, 0.95, 0.52], 0.08, 0.08, 8, true);
}

/** the gable of one face: base y = CORN, centred at x = len / 2; mosaic material m (or a gold field) */
export function gable(K, len, mosMat, o = {}) {
  const P = K.P, M = K.M, cx = len / 2, W = GABLE_W, H = GABLE_H;
  P.push(cx, CORN + 0.02, 0, 0);                                                                           // 2 cm above the cornice top (no coplanar faces)
  const o0 = G.keelPts(W, H, 10), o1 = G.scalePts(o0, 0.94, 0.93), o2 = G.scalePts(o0, 0.87, 0.84), o3 = G.scalePts(o0, 0.8, 0.74), mos = G.scalePts(o0, 0.74, 0.62);
  G.solid(P, M.brick, o0, 0.0, 0.5, 3);
  G.frameRing(P, M.teeth, o0, o1, 0.25, 0.7, 0.9);                                                           // saw-tooth limestone ring
  G.frameRing(P, M.checker, o1, o2, 0.25, 0.62, 0.8);                                                        // chequer ring
  G.frameRing(P, M.meander, o2, o3, 0.25, 0.54, 0.8);                                                        // meander ring
  G.frameRing(P, M.brickDark, o3, mos, 0.25, 0.46, 3);
  if (mosMat) G.planeShape(P, mosMat, mos, 0.56);
  else {                                                                                                     // E / W gables: a brick field with a blue-ground saint roundel in a gold ring and a gold cross
    G.planeShape(P, M.brickDark, mos, 0.56);
    P.cyl(M.goldFlat, [0, 2.7, 0.58], [0, 2.7, 0.63], 1.75, 1.75, 24, true);
    P.cyl(M.glassBlue, [0, 2.7, 0.63], [0, 2.7, 0.68], 1.5, 1.5, 24, true);
    P.box(M.goldFlat, -0.12, 0.12, 1.8, 3.6, 0.68, 0.74, 'b'); P.box(M.goldFlat, -0.6, 0.6, 2.9, 3.14, 0.68, 0.74, 'b');
  }
  // copper-green apron under the mosaic
  P.box(M.copper, -W * 0.36, W * 0.36, 0.0, 0.5, 0.0, 1.0, 'b');
  P.pop();
  void o;
}

/** the whole cube: four faces + roof */
export function body(K) {
  const P = K.P, M = K.M, a0 = CUBE.a0, a1 = CUBE.a1, b0 = CUBE.b0, b1 = CUBE.b1, LA = a1 - a0, LB = b1 - b0;
  // S face (outward +b): left end at a0
  G.onFace(P, a0, b1, 0, 1, () => { cubeFace(K, LA, { corner: true, rock: true, niches: [4.0, 11.4, 18.2, 25.6], nk: 0 }); gable(K, LA, M.mosGlory); });
  // N face (outward -b): left end at a1
  G.onFace(P, a1, b0, 0, -1, () => { cubeFace(K, LA, { corner: true, rock: true, niches: [11.4, 18.2, 25.6], nk: 2 }); gable(K, LA, M.mosRes); });
  // E face (outward +a): left end at b1; the apses hide the lower part
  G.onFace(P, a1, b1, 1, 0, () => { cubeFace(K, LB, { y0: 8.0, rock: true }); gable(K, LB, null); });
  // W face (outward -a): left end at b0; the porches / galleries / tower hide the lower part
  G.onFace(P, a0, b0, -1, 0, () => { cubeFace(K, LB, { y0: 9.4, rock: true }); gable(K, LB, null); });
  // cube roof: green copper under the octagon
  const r = 0.3; P.cap(M.copper, [[a0 + r, b0 + r], [a1 - r, b0 + r], [a1 - r, b1 - r], [a0 + r, b1 - r]], CORN + 0.05, true, 4);
}
