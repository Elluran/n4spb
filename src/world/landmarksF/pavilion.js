// landmarksF/pavilion.js - the two end pavilions ("gates") of the colonnade: a rectangular limestone block 17.4 x 27.1 m, 24.2 m high, with a see-through passage 7.8 m wide along the cathedral's
// north-south axis with a FLAT lintel (a trabeated gate, not an arch: photos 01 48 66), two engaged Corinthian columns on each pier face, a full entablature, a relief-frieze attic and a plain
// crowning cornice.  East pavilion centre (51.9, 5.85) in the model frame; the west one is the same building turned by PI.  docs/research/kazan-cathedral.md 3.3.
import * as THREE from 'three';
import { column, texBox } from './prims.js';
import { boxAt, W } from './frame.js';

export const PAV = { cx: 51.9, cz: 5.85, w: 17.4, d: 27.1, pass: 7.8 };
const PY = 0.6, H_COL = 14.0, Y_OPEN = PY + H_COL;            // plinth, column height, lintel soffit 14.6
const Y_ARCH = Y_OPEN + 1.1, Y_FR = Y_ARCH + 1.2, Y_DEN = Y_FR + 0.4, Y_COR = Y_DEN + 0.9, Y_ATT = Y_COR + 5.4, Y_TOP = Y_ATT + 0.6;   // 15.7 16.9 17.3 18.2 | attic to 23.6 | crown 24.2

export function pavilions(K) {
  const P = K.P, M = K.M;
  for (const [s, rot] of [[1, 0], [-1, Math.PI]]) {
    P.push(s * PAV.cx, 0, PAV.cz, rot);
    pavilionBody(P, M);
    P.pop();
    // colliders: the two piers (the passage between them stays open, the lintel is above head height)
    const hw = PAV.w / 2, pw = hw - PAV.pass / 2, ph = K.ctx.physics;
    for (const sx of [-1, 1]) boxAt(ph, s * PAV.cx + sx * (PAV.pass / 2 + pw / 2) * (s), PAV.cz, pw + 0.4, PAV.d + 3.4, 0, -1, 40);
  }
}

function pavilionBody(P, M) {
  const hw = PAV.w / 2, hd = PAV.d / 2, hp = PAV.pass / 2;
  // ---- plinth under the two piers (passage floor stays at the pavement)
  for (const sx of [-1, 1]) P.box(M.baseGranite, sx > 0 ? hp : -hw - 0.5, sx > 0 ? hw + 0.5 : -hp, 0, PY, -hd - 1.9, hd + 1.9, '');
  // ---- N / S faces: wall with the opening, 4 engaged columns, entablature (box) and attic relief
  for (const [z, rot] of [[-hd, Math.PI], [hd, 0]]) {
    P.push(0, 0, z, rot);
    const sh = new THREE.Shape(); sh.moveTo(-hw, PY); sh.lineTo(hw, PY); sh.lineTo(hw, Y_TOP - 0.6); sh.lineTo(-hw, Y_TOP - 0.6); sh.lineTo(-hw, PY);
    const hole = new THREE.Path(); hole.moveTo(-hp, PY); hole.lineTo(-hp, Y_OPEN); hole.lineTo(hp, Y_OPEN); hole.lineTo(hp, PY); hole.lineTo(-hp, PY); sh.holes.push(hole);
    P.face(M.stone, sh, 0, 2.4);
    for (const x of [-7.9, -4.9, 4.9, 7.9]) column(P, M, x, PY, 0.55, H_COL);
    // attic relief panel with a border
    P.quad(M.relief, [-7.2, Y_ATT - 4.3, 0.05], [7.2, Y_ATT - 4.3, 0.05], [7.2, Y_ATT - 1.0, 0.05], [-7.2, Y_ATT - 1.0, 0.05], [0, 0, 1], [[0, 0], [1.9, 0], [1.9, 1], [0, 1]]);
    P.box(M.stoneWarm, -7.5, 7.5, Y_ATT - 4.55, Y_ATT - 4.3, 0, 0.14, 'kb'); P.box(M.stoneWarm, -7.5, 7.5, Y_ATT - 1.0, Y_ATT - 0.75, 0, 0.14, 'kb');
    P.box(M.stoneWarm, -7.5, -7.2, Y_ATT - 4.3, Y_ATT - 1.0, 0, 0.14, 'kb'); P.box(M.stoneWarm, 7.2, 7.5, Y_ATT - 4.3, Y_ATT - 1.0, 0, 0.14, 'kb');
    P.pop();
  }
  // ---- E / W faces: plain ashlar with a relief panel
  for (const [x, rot] of [[hw, Math.PI / 2], [-hw, -Math.PI / 2]]) {
    P.push(x, 0, 0, rot);
    P.quad(M.stone, [-hd, PY, 0], [hd, PY, 0], [hd, Y_TOP - 0.6, 0], [-hd, Y_TOP - 0.6, 0], [0, 0, 1], [[-hd / 2.4, PY / 2.4], [hd / 2.4, PY / 2.4], [hd / 2.4, (Y_TOP - 0.6) / 2.4], [-hd / 2.4, (Y_TOP - 0.6) / 2.4]]);
    P.quad(M.relief, [-6.8, Y_ATT - 4.3, 0.05], [6.8, Y_ATT - 4.3, 0.05], [6.8, Y_ATT - 1.0, 0.05], [-6.8, Y_ATT - 1.0, 0.05], [0, 0, 1], [[0, 0], [1.8, 0], [1.8, 1], [0, 1]]);
    // two tall recessed panels on the lower wall (blind windows)
    for (const px of [-6, 6]) { P.box(M.stoneShade, px - 1.6, px + 1.6, 3.0, 11.0, 0, 0.12, 'kb'); P.box(M.stoneWarm, px - 1.35, px + 1.35, 3.3, 10.7, 0, 0.16, 'kb'); }
    P.pop();
  }
  // ---- entablature (one box per level, projecting more on the N / S faces where the columns are)
  const lv = [[Y_OPEN, Y_ARCH, 0.45, 1.5, M.stoneWarm], [Y_ARCH, Y_FR, 0.3, 1.4, M.stoneShade], [Y_FR, Y_DEN, 0.8, 1.9, M.dentil], [Y_DEN, Y_COR, 1.2, 2.4, M.stoneWarm], [Y_ATT, Y_TOP, 0.55, 0.55, M.stoneWarm]];
  for (const [y0, y1, px, pz, mat] of lv) {
    if (mat === M.dentil) texBox(P, mat, -hw - px, hw + px, y0, y1, -hd - pz, hd + pz, 0.9, 0.4, y0);
    else P.box(mat, -hw - px, hw + px, y0, y1, -hd - pz, hd + pz, '');
  }
  // ---- the passage: jambs, coffered ceiling, floor
  for (const sx of [-1, 1]) P.quad(M.stone, [sx * hp, PY, -hd], [sx * hp, PY, hd], [sx * hp, Y_OPEN, hd], [sx * hp, Y_OPEN, -hd], [-sx, 0, 0], [[-hd / 2.4, PY / 2.4], [hd / 2.4, PY / 2.4], [hd / 2.4, Y_OPEN / 2.4], [-hd / 2.4, Y_OPEN / 2.4]]);
  P.quad(M.coffer, [-hp, Y_OPEN - 0.05, -hd], [hp, Y_OPEN - 0.05, -hd], [hp, Y_OPEN - 0.05, hd], [-hp, Y_OPEN - 0.05, hd], [0, -1, 0], [[0, -hd / 3], [hp * 2 / 3, -hd / 3], [hp * 2 / 3, hd / 3], [0, hd / 3]]);
  P.quad(M.slab, [-hp, 0.13, -hd - 0.5], [hp, 0.13, -hd - 0.5], [hp, 0.13, hd + 0.5], [-hp, 0.13, hd + 0.5], [0, 1, 0], [[0, 0], [hp * 2 / 2.8, 0], [hp * 2 / 2.8, (PAV.d + 1) / 2.8], [0, (PAV.d + 1) / 2.8]]);
}
export const pavilionTop = Y_TOP;
void W;
