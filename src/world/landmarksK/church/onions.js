// church/onions.js - the four corner drums with the enamel onions (NW / NE / SW / SE each with its own pattern, docs/research/saviour-mikhailovsky.md 3.2) on the corners of the cube:
// kokoshnik ring (24.5 - 31), brick drum (31 - 34.5), white arcade (34.5 - 37.5), the onion 8 m wide (37.9 - 47), ball and cross (tip 54.5 m).
import * as G from '../geo.js';

export const CORNERS = [
  { a: -10.5, b: -10.5, en: 'enNW' }, { a: 10.5, b: -10.5, en: 'enNE' }, { a: -10.5, b: 10.5, en: 'enSW' }, { a: 10.5, b: 10.5, en: 'enSE' },
];

export function onions(K) {
  const P = K.P, M = K.M;
  for (const c of CORNERS) {
    const { a, b } = c;
    G.tube(P, M.kokoshnik, a, b, 24.5, 31.0, 4.1, 3.85, 24, 1, 1);
    G.tube(P, M.white, a, b, 30.95, 31.25, 4.0, 4.0, 24, 6, 1, { capTop: M.white });
    G.tube(P, M.brickDark, a, b, 31.25, 34.5, 3.55, 3.55, 24, 7, 1);
    G.tube(P, M.arcade8, a, b, 34.5, 37.4, 3.6, 3.6, 24, 1, 1);
    G.tube(P, M.white, a, b, 37.4, 37.9, 4.15, 4.15, 24, 6, 1, { capTop: M.white });
    G.onion(P, M[c.en], a, 37.9, b, 4.0, 0.97, 32, 20);
    const top = 37.9 + 2.36 * 4.0 * 0.97;
    G.ball(P, M.goldFlat, a, top + 0.2, b, 0.45, 10);
    G.cross(P, M.goldFlat, a, top + 0.55, b, 54.5 - (top + 0.55), 0);
  }
}
