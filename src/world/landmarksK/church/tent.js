// church/tent.js - the octagonal tent over the central cube: brick octagon (24.5 - 48.5 m) with tall arched windows, the ring of kokoshniks, the blue tile pyramid with gold ribs and eight dormers (52 - 63.5 m),
// the small arcaded lantern, the three-colour twisted onion (70 - 77 m) and the cross: the tip at 81 m (published 81; OSM height 81).  Dossier 3.1 / 3.3, photos refs/saviour 011 019 023.
import * as G from '../geo.js';

const AP = 7.5, R8 = AP / Math.cos(Math.PI / 8);

/** a dormer on one slope of the tent (facade frame of that face: x right, z out) */
function dormer(K, y) {
  const P = K.P, M = K.M;
  G.tbox(P, M.brickDark, -0.8, 0.8, y, y + 1.8, -0.6, 0.45, 3, 3, 'b');
  G.planeShape(P, M.glassBlue, G.archPts(0, y + 0.2, 0.9, 1.5, 8), 0.5);
  G.frameRing(P, M.white, G.archPts(0, y + 0.12, 1.25, 1.7, 8), G.archPts(0, y + 0.2, 0.9, 1.5, 8), 0.45, 0.14, 1);
  P.push(0, y + 1.8, 0, 0);
  G.solid(P, M.white, [[-0.9, 0], [0.9, 0], [0, 1.0]], -0.1, 0.62, 1);
  P.pop();
}

export function tent(K) {
  const P = K.P, M = K.M, a0 = -Math.PI / 8;
  // octagon walls
  G.frustum(P, M.brickDark, 0, 0, 24.5, 36.0, 8, R8, R8, a0, 6.2 / 3, 11.5 / 3);
  G.frustum(P, M.belfry, 0, 0, 36.0, 48.5, 8, R8, R8, a0, 1, 1);
  // corner bundles: eight white colonnettes up the edges of the upper part
  for (let i = 0; i < 8; i++) {
    const t = a0 + i * Math.PI / 4, x = Math.sin(t) * (R8 + 0.12), z = Math.cos(t) * (R8 + 0.12);
    P.cyl(M.white, [x, 36.0, z], [x, 48.4, z], 0.28, 0.28, 8, false);
    P.cyl(M.whiteShade, [x, 41.8, z], [x, 42.1, z], 0.38, 0.38, 8, true);
  }
  // cornice and the ring of kokoshniks
  G.frustum(P, M.white, 0, 0, 48.5, 49.2, 8, R8 + 0.4, R8 + 0.5, a0, 6, 0.3, { capTop: M.white });
  G.frustum(P, M.kokoshnik, 0, 0, 49.2, 51.4, 8, R8 + 0.45, R8 + 0.25, a0, 1 / 3, 1);
  G.frustum(P, M.white, 0, 0, 51.4, 52.0, 8, R8 + 0.55, R8 + 0.55, a0, 6, 0.3, { capTop: M.copper });
  // the tile pyramid
  const dirs = G.frustum(P, M.tent, 0, 0, 52.0, 63.5, 8, 7.4, 1.9, a0, 1, 1, { capTop: M.tent });
  for (const d of dirs) {
    const ap = 6.35 * Math.cos(Math.PI / 8);
    G.onFace(P, d.x * ap, d.z * ap, d.x, d.z, () => dormer(K, 53.1));
  }
  // lantern: an octagon of arcaded openings, a ring, a small copper cap
  G.tube(P, M.arcade12, 0, 0, 63.5, 69.0, 2.35, 2.35, 24, 1, 1);
  G.frustum(P, M.white, 0, 0, 69.0, 69.6, 8, 2.7, 2.7, a0, 3, 0.3, { capTop: M.white });
  G.tube(P, M.copper, 0, 0, 69.6, 70.3, 2.3, 1.2, 16, 4, 1, { capTop: M.copper });
  // the three-colour twisted onion
  G.onion(P, M.twist, 0, 70.3, 0, 2.75, 1.0, 32, 22);
  const yTop = 70.3 + 2.36 * 2.75;
  G.ball(P, M.goldFlat, 0, yTop + 0.25, 0, 0.5, 12);
  G.cross(P, M.goldFlat, 0, yTop + 0.65, 0, 81.0 - (yTop + 0.65), 0);
}
