// church/apses.js - the east end: the large central apse (a half cylinder R 7.5 m, brick with three tall windows, white arcature, a pointed gable with the standing Christ, a shield roof, drum and gold onion
// 29 - 33 m, cross 36 m) and the two lower side apses (R 3.8 m, 8 m, shield roofs of blue-grey / white scales, slim drums, gold onions).  The plan is OSM's single rounded end (R ~ 15 m) split after photos
// refs/saviour 073 020 024 (dossier 3.9: an estimate).
import * as G from '../geo.js';

/** half-cylinder wall around (cx, cz), radius R, from y0 to y1, `seg` quads over the half circle that faces +a (east) */
function halfWall(P, mat, cx, cz, R, y0, y1, seg, tile = 3) {
  for (let i = 0; i < seg; i++) {
    const t0 = -Math.PI / 2 + Math.PI * i / seg, t1 = -Math.PI / 2 + Math.PI * (i + 1) / seg, tm = (t0 + t1) / 2;      // t = 0 -> +a (east)
    const p = (t, y) => [cx + Math.cos(t) * R, y, cz + Math.sin(t) * R];
    const len = R * Math.PI / seg;
    P.quad(mat, p(t0, y0), p(t1, y0), p(t1, y1), p(t0, y1), [Math.cos(tm), 0, Math.sin(tm)], [[0, y0 / tile], [len / tile, y0 / tile], [len / tile, y1 / tile], [0, y1 / tile]]);
  }
}
function halfRing(P, mat, cx, cz, R, y0, y1, seg, tile = 3, cap = null) {
  halfWall(P, mat, cx, cz, R, y0, y1, seg, tile);
  if (cap) for (let i = 0; i < seg; i++) {
    const t0 = -Math.PI / 2 + Math.PI * i / seg, t1 = -Math.PI / 2 + Math.PI * (i + 1) / seg;
    P.quad(cap, [cx + Math.cos(t0) * R, y1, cz + Math.sin(t0) * R], [cx + Math.cos(t1) * R, y1, cz + Math.sin(t1) * R], [cx + Math.cos(t1) * (R - 0.4), y1, cz + Math.sin(t1) * (R - 0.4)], [cx + Math.cos(t0) * (R - 0.4), y1, cz + Math.sin(t0) * (R - 0.4)], [0, 1, 0]);
  }
}

function apse(K, o) {
  const P = K.P, M = K.M, { cx, cz, R, H, seg } = o;
  halfWall(P, M.brick, cx, cz, R, 0, H, seg, 3);
  halfWall(P, M.rock, cx, cz, R + 0.3, 0, 3.0, seg, 4.4);                                                // granite plinth
  halfRing(P, M.white, cx, cz, R + 0.5, 2.9, 3.2, seg, 3, M.white);
  halfRing(P, M.whiteShade, cx, cz, R + 0.35, H - 0.9, H, seg, 3, M.white);                             // top cornice
  // straight returns toward the cube (a 14.8 .. cx) on both sides
  // (the facing frame runs "right" = (nz, -nx): for the +b side it runs toward +a from 14.8, for the -b side toward -a from cx)
  for (const s of [-1, 1]) {
    const len = cx - 14.8;
    G.onFace(P, s < 0 ? cx : 14.8, cz + s * R, 0, s, () => {
      G.wall(P, M.brick, 0, len, 0, H, 0, 3, 3);
      G.tbox(P, M.rock, 0, len, 0, 3.0, 0, 0.3, 4.4, 2.4, 'bk');                                          // granite plinth like the curved part
      P.box(M.white, 0, len, 2.9, 3.2, 0, 0.5, 'bk');
      P.box(M.whiteShade, 0, len, H - 0.9, H, 0, 0.3, 'bk');
    });
  }
}

export function apses(K) {
  const P = K.P, M = K.M;
  // ---- central apse
  const cx = 23.0, cz = 1.0, R = 7.5, H = 14.0;
  apse(K, { cx, cz, R, H, seg: 14 });
  // three tall arched windows with white colonnettes (on the apse wall at angles -0.6, 0, +0.6 rad)
  for (const t of [-0.6, 0, 0.6]) {
    const px = cx + Math.cos(t) * (R + 0.02), pz = cz + Math.sin(t) * (R + 0.02);
    G.onFace(P, px - Math.sin(t) * 0.0 + Math.sin(t) * 0.0, pz, Math.cos(t), Math.sin(t), () => {
      G.planeShape(P, M.glassBlue, G.archPts(0, 5.4, 1.5, 5.2, 8), 0.06);
      G.frameRing(P, M.white, G.archPts(0, 5.25, 2.0, 5.6, 8), G.archPts(0, 5.4, 1.5, 5.2, 8), 0.02, 0.16, 1);
      for (const q of [-0.95, 0.95]) P.cyl(M.white, [q, 5.3, 0.12], [q, 9.3, 0.12], 0.1, 0.1, 6, false);
    });
  }
  // the roof: a low patinated shield from 14 to 18.2 m (photo 073: green metal), then the kokoshnik ring and the slim brick drum up to the arcade
  G.tube(P, M.scaleGreen, cx, cz, H, 18.2, R * 0.95, 3.5, 28, 5, 2, { capTop: M.copper });
  // the pointed gable with the standing Christ (east face)
  G.onFace(P, cx + R + 0.15, cz + 2.0, 1, 0, () => {
    P.push(2.0, H, 0, 0);
    G.solid(P, M.brick, G.keelPts(4.4, 5.0, 8), 0.0, 0.25, 3);
    G.frameRing(P, M.teeth, G.keelPts(4.8, 5.4, 8), G.scalePts(G.keelPts(4.8, 5.4, 8), 0.84, 0.86), 0.04, 0.38, 0.9);
    G.planeShape(P, M.mosApse, G.keelPts(1.6, 3.4, 8), 0.36);
    P.pop();
  });
  // drum, onion, cross
  G.tube(P, M.kokoshnik, cx, cz, 18.2, 22.0, 3.45, 3.2, 24, 1, 1);
  G.tube(P, M.white, cx, cz, 21.95, 22.25, 3.3, 3.3, 24, 6, 1, { capTop: M.white });
  G.tube(P, M.brickDark, cx, cz, 22.25, 25.4, 2.7, 2.7, 20, 5, 1);
  G.tube(P, M.arcade8, cx, cz, 25.4, 28.4, 2.75, 2.75, 20, 1, 1);
  G.tube(P, M.white, cx, cz, 28.4, 29.0, 2.65, 2.65, 16, 3, 1, { capTop: M.white });
  G.onion(P, M.gold, cx, 29.0, cz, 2.3, 0.82, 24, 16);
  const top = 29.0 + 2.36 * 2.3 * 0.82;
  G.ball(P, M.goldFlat, cx, top + 0.1, cz, 0.28, 8); G.cross(P, M.goldFlat, cx, top + 0.35, cz, 36.0 - (top + 0.35), 0);
  // ---- the two side apses
  for (const s of [-1, 1]) {
    const sx = 18.0, sz = s * 10.9, sr = 3.8, sh = 8.0;
    apse(K, { cx: sx, cz: sz, R: sr, H: sh, seg: 8 });
    G.tube(P, M.scaleDeep, sx, sz, sh, 10.4, sr * 0.95, 1.7, 16, 4, 1, { capTop: M.copper });
    G.tube(P, M.brickDark, sx, sz, 10.4, 14.6, 1.25, 1.25, 12, 3, 2);
    G.tube(P, M.arcade6, sx, sz, 14.6, 16.6, 1.3, 1.3, 12, 1, 1);
    G.tube(P, M.white, sx, sz, 16.6, 17.0, 1.4, 1.4, 12, 3, 1, { capTop: M.white });
    G.onion(P, M.gold, sx, 17.0, sz, 1.75, 0.9, 24, 14);
    const tp = 17.0 + 2.36 * 1.75 * 0.9;
    G.ball(P, M.goldFlat, sx, tp + 0.1, sz, 0.2, 8); G.cross(P, M.goldFlat, sx, tp + 0.28, sz, 23.5 - (tp + 0.28), 0);
  }
}
