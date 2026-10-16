// landmarksA/walls.js - the plain Thon wall of the station's wings, strips, annexes and ticket halls: plinth, arched ground-floor windows with white surrounds,
// string course, rectangular first-floor windows with surrounds, deep cornice.  Panels are 0.25 m extrusions with real window reveals, the glass is a textured plate
// 3 cm in front of a core prism.  Used by facade.js (wings) and halls.js (stem, annexes, ticket halls).  Photos SP/refs/station 02 (wings), 22, 12-14 (sides / courtyard).
import * as THREE from 'three';
import { archPath, rectPath } from './common.js';
import { wallRun, inset, inside } from './geom.js';

/**
 * Wall every edge of `ring` (open ring of [u, d] points of the station frame, any orientation) with the styled bays up to height H.
 * o: { skip(a, b) -> bool: do not wall this edge, pitch: target bay width (3.9), floors: 1 or 2, material (stucco), coreMat, winMat, doorAt: fn(info) }
 */
export function styledWalls(P, M, ring, H, winMat, o = {}) {
  const wall = o.wall || M.wing;
  if (o.core !== false) P.prism(o.coreMat || wall, inset(ring, 0.27), 0, H, o.coreCaps || 'b');
  wallRun(P, ring, ({ len, a, b }) => {
    if (len < 1.2 || (o.skip && o.skip(a, b))) return;
    const n = Math.max(1, Math.round(len / (o.pitch || 3.9))), pitch = len / n;
    for (let j = 0; j < n; j++) {
      if (o.bayFilter && !o.bayFilter({ a, b, len }, j, pitch, n)) continue;
      P.push((j + 0.5) * pitch, 0, 0, 0);
      bay(P, M, pitch, H, (o.winLit && ((j * 5 + Math.round(len)) % 3)) ? o.winLit : winMat, wall, o);
      P.pop();
    }
  }, { inside: o.inside || ((x, z) => inside(ring, x, z)), closed: o.closed });
}

export function bay(P, M, pitch, H, winMat, wall, o = {}) {
  const hp = pitch / 2, PL = 1.0;
  const two = H > 8.5;
  const sc = two ? H * 0.5 : H;                       // string course height
  const w = 1.3;
  const gb = H > 12 ? 1.7 : 1.4, crown = (two ? sc - 0.9 : H - 1.8), hs = Math.max(0.8, crown - gb - w / 2);
  const ub = sc + 1.2, uh = Math.max(1.2, Math.min(2.8, H - 1.9 - ub));
  const sh = new THREE.Shape(); rectPath(sh, -hp, PL, hp, H - 0.9);
  sh.holes.push(archPath(new THREE.Path(), w, hs, 0, gb, true));
  if (two) sh.holes.push(rectPath(new THREE.Path(), -0.55, ub, 0.55, ub + uh, true));
  P.extrude(wall, sh, 0.25, 0, 0, 0, 0, 4);
  const top = gb + hs;
  P.quad(M.pane, [w / 2, gb, 0.22], [-w / 2, gb, 0.22], [-w / 2, top, 0.22], [w / 2, top, 0.22], [0, 0, -1]);
  const arc = new THREE.Shape(); arc.moveTo(-w / 2, 0); arc.absarc(0, 0, w / 2, Math.PI, 0, true); arc.lineTo(-w / 2, 0);
  P.extrude(M.pane, arc, 0.02, 0, top, 0.2, 0, 4);
  P.box(M.frame, -0.025, 0.025, gb, top + w / 2 - 0.05, 0.19, 0.23, 's');
  if (two) {
    P.quad(winMat, [0.55, ub, 0.22], [-0.55, ub, 0.22], [-0.55, ub + uh, 0.22], [0.55, ub + uh, 0.22], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]].map(([a, b]) => [1 - a, b]));
  }
  // plinth + moulding
  P.box(M.plinth, -hp, hp, 0, PL, -0.12, 0.25, 'lrs'); P.box(M.plinthDark, -hp, hp, PL, PL + 0.08, -0.15, 0.0, 'bs');
  // surrounds
  const ring = new THREE.Shape(); archPath(ring, w + 0.5, hs, 0, gb); ring.holes.push(archPath(new THREE.Path(), w, hs, 0, gb, true));
  P.extrude(M.trim, ring, 0.1, 0, 0, -0.1, 0, 4);
  P.box(M.trim, -0.95, 0.95, gb - 0.15, gb, -0.14, 0.25, 'bs');
  if (two) {
    P.box(M.trim, -0.82, -0.55, ub - 0.05, ub + uh + 0.3, -0.08, 0.25, 'rs'); P.box(M.trim, 0.55, 0.82, ub - 0.05, ub + uh + 0.3, -0.08, 0.25, 'ls');
    P.box(M.trim, -0.82, 0.82, ub + uh, ub + uh + 0.3, -0.08, 0.25, 'bs'); P.box(M.trim, -0.95, 0.95, ub + uh + 0.3, ub + uh + 0.5, -0.22, 0.25, 'bs');
    P.box(M.trim, -0.95, 0.95, ub - 0.2, ub, -0.16, 0.25, 'bs');
    P.box(M.trim, -hp, hp, sc - 0.15, sc + 0.15, -0.12, 0.25, 'lrs');
  }
  // cornice
  P.box(M.trim, -hp, hp, H - 0.9, H - 0.6, -0.2, 0.25, 'lrs'); P.box(M.trimShade, -hp, hp, H - 0.6, H - 0.1, -0.05, 0.25, 'lrs');
  P.box(M.trim, -hp, hp, H - 0.1, H + 0.45, -0.65, 0.5, 'lrs');
}

