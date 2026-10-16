// landmarksF/colonnade.js - the great semicircular Corinthian colonnade of Kazan Cathedral (Voronikhin): two wings of 4 rows x 12 columns (96) around the centre C of the model frame,
// a stylobate of 3 steps, a coffered ceiling, the entablature (architrave, frieze with the "three rings" medallions, dentil cornice) on both faces, a flat lead roof and balustrades with balusters.
// Radii: column rows 45.0 / 48.3 / 51.5 / 54.0, entablature faces 43.85 / 55.15 (docs/research/kazan-cathedral.md 2.3, 3.3; OSM fit R 43.5 / 54.5-55.5).  Column 14 m (13.55 above the 0.45 stylobate).
import * as THREE from 'three';
import { pol, arcWall, arcFlat, column, DEG } from './prims.js';
import { W, cylAt, walkAt, boxAt, ROT } from './frame.js';

export const ROWS = [45.0, 48.3, 51.5, 54.0];
export const STY = 0.45, COL_H = 13.55, Y_COL = STY + COL_H;                 // capital top 14.0
export const R_IN = 43.85, R_OUT = 55.15;                                    // faces of the architrave
export const A_RING = [16 * DEG, 87 * DEG];                                 // angular extent of the roof / entablature (east wing; mirrored)
export const A_COL = [24 * DEG, 66.5 * DEG];                                // first / last column (east wing)
export const N_COL = 12;
const Y_ROOF = 17.5, Y_BAL = 18.7;

// The wings end where they run into the pavilion blocks (inner face x = 43.7, south face mz = 19.4 in the model frame): everything of the wing that would lie inside a pavilion (and so inside its see-through
// passage) is cut off per radius, with a 0.2 m overlap so the ends are hidden in the pavilion walls.
const PXI = 43.9, ZSO = 19.2;
export const aEnd = (R) => (R < 43.85 ? A_RING[1] : Math.min(A_RING[1], Math.max(Math.asin(Math.min(1, PXI / R)), Math.acos(Math.min(1, ZSO / R)))));
const clipA = (R, a0, a1) => { const s = a1 < 0 ? -1 : 1; return [a0, s * Math.min(Math.abs(a1), aEnd(R))]; };
const aw = (P, mat, R, a0, a1, ...rest) => { const [b0, b1] = clipA(R, a0, a1); arcWall(P, mat, R, b0, b1, ...rest); };
const af = (P, mat, R0, R1, a0, a1, y, up, o) => {
  const n = Math.max(1, Math.ceil((R1 - R0) / 0.7));
  for (let k = 0; k < n; k++) { const r0 = R0 + (R1 - R0) * k / n, r1 = R0 + (R1 - R0) * (k + 1) / n, [b0, b1] = clipA((r0 + r1) / 2, a0, a1); arcFlat(P, mat, r0, r1, b0, b1, y, up, o); }
};

export function colonnade(K) {
  const P = K.P, M = K.M, ctx = K.ctx;
  const balusters = [];
  for (const s of [1, -1]) {
    const a0 = s * A_RING[0], a1 = s * A_RING[1];
    stylobate(P, M, a0, a1);
    // ---- 4 x 12 columns on radial alleys
    for (let i = 0; i < N_COL; i++) {
      const a = s * (A_COL[0] + (A_COL[1] - A_COL[0]) * i / (N_COL - 1));
      for (const R of ROWS) { const [x, z] = pol(R, a); column(P, M, x, STY, z, COL_H); K.cols.push([x, z]); }
    }
    entablature(P, M, a0, a1, s);
    roofAndBalustrade(P, M, a0, a1, s, balusters);
  }
  K.balusters = balusters;
  K.tris;
  // ---- colliders: every column is a cylinder, the stylobate steps are walkable (3 x 0.15 m), the arcade floor is the top step
  const ph = ctx.physics;
  for (const [x, z] of K.cols) cylAt(ph, x, z, 0.78, 0, 30);
  for (const s of [1, -1]) {
    const steps = [[42.3, 57.7, 0.15], [42.8, 57.2, 0.30], [43.3, 56.7, 0.45]];
    const na = 15;
    for (let i = 0; i < na; i++) {
      const a0 = s * (A_RING[0] + (80 * DEG - A_RING[0]) * i / na), a1 = s * (A_RING[0] + (80 * DEG - A_RING[0]) * (i + 1) / na), am = (a0 + a1) / 2;
      for (const [r0, r1, top] of steps) {
        const rm = (r0 + r1) / 2; if (Math.abs(am) > aEnd(rm)) continue; const [x, z] = pol(rm, am), chord = 2 * rm * Math.sin(Math.abs(a1 - a0) / 2) + 0.15;
        walkAt(ph, x, z, r1 - r0, chord, am - Math.PI / 2, top, -1);
      }
    }
  }
}

/** three steps on both sides of the arcade floor */
function stylobate(P, M, a0, a1) {
  const lv = [[42.3, 57.7, 0.15], [42.8, 57.2, 0.30], [43.3, 56.7, 0.45]];
  for (let k = 0; k < 3; k++) {
    const [r0, r1, top] = lv[k], prev = k ? lv[k - 1][2] : 0;
    // tread rings: level k top from r0 to (k<2 ? next r0 : r1_of_top) and the outer one
    if (k < 2) { af(P, M.step, r0, lv[k + 1][0], a0, a1, top, true); af(P, M.step, lv[k + 1][1], r1, a0, a1, top, true); }
    else af(P, M.floor, r0, r1, a0, a1, top, true);
    aw(P, M.step, r0, a0, a1, prev, top, true);                    // riser facing the garden
    aw(P, M.step, r1, a0, a1, prev, top, false);                   // riser facing outside
  }
}

/** entablature on the inner (garden) face and the outer face + the coffered ceiling between */
function entablature(P, M, a0, a1, s) {
  const yA = Y_COL, yF = yA + 1.1, yD = yF + 1.2, yC = yD + 0.4, yT = yC + 0.8;            // architrave / frieze / dentil band / corona (top = 17.5)
  af(P, M.coffer, R_IN, R_OUT, a0, a1, yA - 0.04, false, { uvs: 3.0 });                // ceiling of the arcade
  for (const side of [0, 1]) {
    const R = side ? R_OUT : R_IN, inward = !side;
    const out = (d) => (side ? R + d : R - d);                                             // radius of a layer projecting by d towards the viewer
    const bay = R * (A_COL[1] - A_COL[0]) / (N_COL - 1);                                   // one column bay along this face
    const u0 = -R * Math.abs(A_COL[0] - A_RING[0]);                                        // tile boundaries on the columns
    aw(P, M.stoneWarm, out(0), a0, a1, yA, yF, inward);                               // architrave
    aw(P, M.rings, out(0), a0, a1, yF, yD, inward, { uvu: bay, uvv: 1.2, vBase: yF, step: bay / 2, u0 });  // frieze with the three rings
    af(P, M.stoneWarm, out(0), out(0.3), a0, a1, yD, false);                          // soffit of the dentil band
    aw(P, M.dentil, out(0.3), a0, a1, yD, yC, inward, { uvu: 0.9, uvv: 0.4, vBase: yD, step: 0.9 });     // dentils
    af(P, M.stoneWarm, out(0.3), out(0.75), a0, a1, yC, false);                       // soffit of the corona
    aw(P, M.stoneWarm, out(0.75), a0, a1, yC, yT, inward);                            // corona
  }
}

function roofAndBalustrade(P, M, a0, a1, s, balusters) {
  const yT = Y_COL + 1.1 + 1.2 + 0.4 + 0.8;                                                // 17.5 = Y_ROOF
  af(P, M.roof, R_IN - 0.75, R_OUT + 0.75, a0, a1, yT, true, { step: 3 });
  // balustrade on both edges: bottom rail, top rail, piers every ~2.9 m and instanced balusters between
  for (const R of [R_IN - 0.35, R_OUT + 0.35]) {
    aw(P, M.balustrade, R - 0.17, a0, a1, yT, yT + 0.3, true, { uvu: 1 }); aw(P, M.balustrade, R + 0.17, a0, a1, yT, yT + 0.3, false, { uvu: 1 });
    aw(P, M.balustrade, R - 0.15, a0, a1, yT + 1.0, yT + 1.2, true, { uvu: 1 }); aw(P, M.balustrade, R + 0.15, a0, a1, yT + 1.0, yT + 1.2, false, { uvu: 1 });
    af(P, M.balustrade, R - 0.17, R + 0.17, a0, a1, yT + 0.3, true); af(P, M.balustrade, R - 0.15, R + 0.15, a0, a1, yT + 1.2, true);
    af(P, M.balustrade, R - 0.15, R + 0.15, a0, a1, yT + 1.0, false);
    const len = Math.abs(a1 - a0) * R, n = Math.round(len / 2.9);
    for (let i = 0; i <= n; i++) {                                                         // piers
      const a = a0 + (a1 - a0) * i / n, [x, z] = pol(R, a);
      P.push(x, 0, z, a); P.box(M.balustrade, -0.27, 0.27, yT, yT + 1.35, -0.27, 0.27, 'b'); P.pop();
    }
    const nb = Math.round(len / 0.36);
    for (let i = 0; i <= nb; i++) {
      const a = a0 + (a1 - a0) * (i + 0.5) / (nb + 1), [x, z] = pol(R, a);
      const pi = (a - a0) / (a1 - a0) * n; if (Math.abs(pi - Math.round(pi)) * len / n < 0.33) continue;
      balusters.push([x, yT + 0.3, z]);
    }
  }
}

/** the instanced balusters (one lathe, 6 sides) */
export function balusterMesh(K) {
  const ctx = K.ctx, list = K.balusters;
  if (!list || !list.length) return null;
  const prof = [[0.0, 0], [0.11, 0], [0.11, 0.06], [0.07, 0.12], [0.075, 0.2], [0.115, 0.38], [0.12, 0.5], [0.08, 0.66], [0.095, 0.72], [0.13, 0.76], [0.0, 0.76]];
  // 0.7 m of balustrade between the 0.3 m base rail and the 1.0 m top rail: scale the lathe to 0.7
  const geo = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0] * 1.0, p[1] * (0.7 / 0.76))), 6);
  const im = new THREE.InstancedMesh(geo, K.M.balustrade, list.length);
  const m4 = new THREE.Matrix4();
  const wp = (x, z) => W(x, z);
  list.forEach((b, i) => { const p = wp(b[0], b[2]); m4.makeTranslation(p.x, b[1], p.z); im.setMatrixAt(i, m4); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.name = 'lmF-balusters';
  im.computeBoundingBox(); im.computeBoundingSphere();
  // These roof balusters form the cathedral silhouette. Cull the bounded group,
  // but preserve its range instead of assigning each small baluster a furniture LOD.
  im.userData.noSplit = true;
  im.userData.tris = list.length * (geo.index ? geo.index.count / 3 : 0);
  void ctx; void ROT; void boxAt;
  return im;
}
