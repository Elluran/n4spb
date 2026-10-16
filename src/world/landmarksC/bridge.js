// landmarksC/bridge.js - the Anichkov Bridge (Аничков мост, 1841-42): three segmental brick arches faced with pink-red granite, round cutwaters, the humped deck with its asphalt roadway,
// kerbs and granite-slab pavements, the cornice, the green cast-iron railing with the mermaid / sea-horse / dolphin panels and pink granite tumbas, the "3.4" and boat plates.
// Drawn in the local frame of frame.js (u along Nevsky, v across, y up).  Photos refs/fontanka 01 02 15 05 09 10; numbers: docs/research/fontanka.md section "Modelling spec" 5.
// Layers (z-fighting, DESIGN.md section 10): asphalt = deck level, markings +2.5 cm (decal material), kerb face 12 cm, pavement top +12 cm, cornice top +14 cm; the spandrel face
// stands at v = +-18.6, the cornice projects to +-18.95 and the railing panels stand on it at +-18.775.  The streets' own asphalt (y 0.03) ends at the abutments: the deck overlaps it by 2.2 m
// (EXT) at +4 cm, with a negative polygonOffset.
// Colliders: the deck is a chain of walk ramps (the feet follow the hump), the railing a solid box along each side, the pedestals boxes (horses.js), and closure.js closes the quay gaps.
import * as THREE from 'three';
import { bankU } from './closure.js';
import { TH, CU, SU, CX, CZ, HALF, EXT, FACE, EDGE, ROAD, SPRING, CROWN, WATER, FOOT, STAIN_TOP, ARCHES, STATIONS, yDeck, slope, archY, archU, toWorld, BOX_ROT, RAMP_ROT } from './frame.js';

const COR = 0.35;                                    // cornice drop below the deck, projection
const PIERS = [[ARCHES[0][1], ARCHES[1][0]], [ARCHES[1][1], ARCHES[2][0]]];

/** a flat shape in the (u, y) plane at depth z with uv = ((u + uo) / s, (y - yo) / s) */
function faceShape(P, mat, pts, z, s = 2.2, uo = 0, yo = 0) {
  const sh = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ShapeGeometry(sh, 1), pa = g.attributes.position, ua = g.attributes.uv;
  for (let i = 0; i < pa.count; i++) ua.setXY(i, (pa.getX(i) + uo) / s, (pa.getY(i) - yo) / s);
  P.geo(mat, g, 0, 0, z); g.dispose();
}

/** the curve of arch k above y0 as points (u, y) from the left to the right intersection with y0 */
function archCurve(k, y0, n = 18) {
  const a = archU(k, y0, -1), b = archU(k, y0, 1), pts = [[a, y0]];
  for (let i = 1; i < n; i++) { const u = a + (b - a) * i / n; pts.push([u, archY(k, u)]); }
  pts.push([b, y0]); return pts;
}

export function buildBridge(K, M) {
  const P = K.P;
  const tops = STATIONS.map((u) => [u, yDeck(u) - COR]);
  P.push(CX, 0, CZ, -TH);

  // ------------------------------------------------------------------ spandrel faces (both sides): stained pier granite below the stain line, granite courses above
  const faces = (zSide) => {
    // lower columns: the abutments and the two piers, between the arch haunches
    const cols = [];
    const a0 = ARCHES[0], a1 = ARCHES[1], a2 = ARCHES[2];
    const hCurve = (k, side) => { const pts = []; for (let i = 0; i <= 8; i++) { const y = SPRING + (STAIN_TOP - SPRING) * i / 8; pts.push([archU(k, y, side), y]); } return pts; };
    cols.push([[-EXT, FOOT], [a0[0], FOOT], ...hCurve(0, -1), [-EXT, STAIN_TOP]]);
    cols.push([[a0[1], FOOT], [a1[0], FOOT], ...hCurve(1, -1), ...hCurve(0, 1).reverse()]);
    cols.push([[a1[1], FOOT], [a2[0], FOOT], ...hCurve(2, -1), ...hCurve(1, 1).reverse()]);
    cols.push([[a2[1], FOOT], [EXT, FOOT], [EXT, STAIN_TOP], ...hCurve(2, 1).reverse()]);
    for (const c of cols) faceShape(P, M.pier, c, zSide, 2.2, EXT, FOOT);
    // upper part: from the stain line to the cornice, with the three arch openings
    const up = [[-EXT, STAIN_TOP]];
    for (let k = 0; k < 3; k++) for (const p of archCurve(k, STAIN_TOP)) up.push(p);
    up.push([EXT, STAIN_TOP]);
    for (let i = tops.length - 1; i >= 0; i--) up.push([tops[i][0], tops[i][1]]);
    faceShape(P, M.granite, up, zSide, 2.2, 0, 0);
  };
  faces(FACE);
  P.push(0, 0, 0, Math.PI); faces(FACE); P.pop();

  // ------------------------------------------------------------------ the arch tunnels: pier sides below the springing, the brick vault above (normals into the opening)
  ARCHES.forEach((ar, k) => {
    const [uL, uR] = ar, uc = (uL + uR) / 2, R = (((uR - uL) / 2) ** 2 + (CROWN - SPRING) ** 2) / (2 * (CROWN - SPRING)), yc = CROWN - R;
    const prof = [[uL, FOOT], [uL, SPRING]];
    const N = 22; for (let i = 1; i < N; i++) { const u = uL + (uR - uL) * i / N; prof.push([u, archY(k, u)]); }
    prof.push([uR, SPRING], [uR, FOOT]);
    let s = 0;
    for (let i = 0; i + 1 < prof.length; i++) {
      const a = prof[i], b = prof[i + 1], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const vertical = Math.abs(b[0] - a[0]) < 1e-6;
      const cy = vertical ? my : yc;                       // interior direction: toward the circle centre (arc) or the axis (the vertical sides)
      let nx = uc - mx, ny = cy - my; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
      const mat = a[1] < SPRING - 1e-6 && b[1] < SPRING - 1e-6 ? M.pier : M.vault;
      const uvA = mat === M.vault ? [[-FACE / 1.1, s / 1.1], [FACE / 1.1, s / 1.1], [FACE / 1.1, (s + len) / 1.1], [-FACE / 1.1, (s + len) / 1.1]] : [[0, (a[1] - FOOT) / 2.2], [1, (a[1] - FOOT) / 2.2], [1, (b[1] - FOOT) / 2.2], [0, (b[1] - FOOT) / 2.2]];
      P.quad(mat, [a[0], a[1], -FACE], [a[0], a[1], FACE], [b[0], b[1], FACE], [b[0], b[1], -FACE], [nx, ny, 0], uvA);
      s += len;
    }
  });

  // ------------------------------------------------------------------ cutwaters: a round granite nose on both ends of each pier, a flat cap with a rim
  for (const [a, b] of PIERS) {
    const uc = (a + b) / 2;
    for (const sg of [-1, 1]) {
      const vz = sg * (FACE + 0.2), R = 1.5;
      P.cyl(M.pier, [uc, FOOT, vz], [uc, STAIN_TOP, vz], R, R, 18, false);
      P.cyl(M.coping, [uc, STAIN_TOP - 0.28, vz], [uc, STAIN_TOP, vz], R + 0.09, R + 0.09, 18, false);
      const cap = []; for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2; cap.push([uc + Math.cos(t) * (R + 0.09), STAIN_TOP, vz + Math.sin(t) * (R + 0.09)]); }
      P.fan(M.coping, cap, [0, 1, 0], (p) => [p[0] / 2, p[2] / 2]);
      const fy = WATER + 0.02, S = 4.4;                                                       // foam ring + downstream wash (decal, no outline)
      P.quad(M.foam, [uc - S, fy, vz - 2.4], [uc + S, fy, vz - 2.4], [uc + S, fy, vz + 6.4], [uc - S, fy, vz + 6.4], [0, 1, 0], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    }
  }

  // ------------------------------------------------------------------ cornice (projects to v = +-EDGE) and deck surface
  for (let i = 0; i + 1 < STATIONS.length; i++) {
    const u0 = STATIONS[i], u1 = STATIONS[i + 1], y0 = yDeck(u0), y1 = yDeck(u1);
    const uvT = (u, v) => [u / 2.4, v / 2.4];
    for (const sg of [-1, 1]) {
      // cornice: outer face, top, underside
      const yb0 = y0 - COR, yb1 = y1 - COR, yt0 = y0 + 0.14, yt1 = y1 + 0.14;
      P.quad(M.coping, [u0, yb0, sg * EDGE], [u1, yb1, sg * EDGE], [u1, yt1, sg * EDGE], [u0, yt0, sg * EDGE], [0, 0, sg], [[u0 / 2.2, 0], [u1 / 2.2, 0], [u1 / 2.2, 0.23], [u0 / 2.2, 0.23]]);
      P.quad(M.coping, [u0, yt0, sg * FACE], [u1, yt1, sg * FACE], [u1, yt1, sg * EDGE], [u0, yt0, sg * EDGE], [0, 1, 0], [[u0 / 2.2, 0], [u1 / 2.2, 0], [u1 / 2.2, 0.16], [u0 / 2.2, 0.16]]);
      P.quad(M.coping, [u0, yb0, sg * FACE], [u1, yb1, sg * FACE], [u1, yb1, sg * EDGE], [u0, yb0, sg * EDGE], [0, -1, 0], [[u0 / 2.2, 0], [u1 / 2.2, 0], [u1 / 2.2, 0.16], [u0 / 2.2, 0.16]]);
      // pavement + kerb
      P.quad(M.pave, [u0, y0 + 0.12, sg * ROAD], [u1, y1 + 0.12, sg * ROAD], [u1, y1 + 0.12, sg * FACE], [u0, y0 + 0.12, sg * FACE], [0, 1, 0], [uvT(u0, ROAD), uvT(u1, ROAD), uvT(u1, FACE), uvT(u0, FACE)]);
      P.quad(M.kerb, [u0, y0, sg * ROAD], [u1, y1, sg * ROAD], [u1, y1 + 0.12, sg * ROAD], [u0, y0 + 0.12, sg * ROAD], [0, 0, -sg], [[0, 0], [1, 0], [1, 0.1], [0, 0.1]]);
    }
    P.quad(M.asphalt, [u0, y0, -ROAD], [u1, y1, -ROAD], [u1, y1, ROAD], [u0, y0, ROAD], [0, 1, 0], [[u0 / 4, -ROAD / 4], [u1 / 4, -ROAD / 4], [u1 / 4, ROAD / 4], [u0 / 4, ROAD / 4]]);
  }

  // ------------------------------------------------------------------ railing cap and tumbas (the panels themselves are instanced, see railing())
  for (const sg of [-1, 1]) {
    const vc = sg * (EDGE - 0.175), w = 0.1;
    for (let i = 0; i + 1 < STATIONS.length; i++) {
      const u0 = Math.max(STATIONS[i], -22.9), u1 = Math.min(STATIONS[i + 1], 22.9);
      if (u1 <= u0) continue;
      const y0 = yDeck(u0) + 1.14, y1 = yDeck(u1) + 1.14;
      P.quad(M.railPost, [u0, y0 + 0.03, vc - w], [u1, y1 + 0.03, vc - w], [u1, y1 + 0.03, vc + w], [u0, y0 + 0.03, vc + w], [0, 1, 0]);
      P.quad(M.railPost, [u0, y0 - 0.1, vc + w], [u1, y1 - 0.1, vc + w], [u1, y1 + 0.03, vc + w], [u0, y0 + 0.03, vc + w], [0, 0, 1]);
      P.quad(M.railPost, [u1, y1 - 0.1, vc - w], [u0, y0 - 0.1, vc - w], [u0, y0 + 0.03, vc - w], [u1, y1 + 0.03, vc - w], [0, 0, -1]);
    }
    for (const [a, b] of PIERS) {                                  // tumbas over the pier lines: pink granite box 0.8 x 0.8 x 1.25, dark pyramid cap
      const uc = (a + b) / 2, vcT = sg * (EDGE - 0.35), yb = yDeck(uc) + 0.1;
      P.box(M.granite, uc - 0.4, uc + 0.4, yb, yb + 1.25, vcT - 0.4, vcT + 0.4, 'b', 1.1);
      P.push(uc, 0, vcT, Math.PI / 4); P.cyl(M.cap, [0, yb + 1.25, 0], [0, yb + 1.55, 0], 0.62, 0.14, 4, true); P.pop();
      P.box(M.coping, uc - 0.46, uc + 0.46, yb + 1.18, yb + 1.25, vcT - 0.46, vcT + 0.46, 'b', 1);
    }
  }

  // ------------------------------------------------------------------ plates under the cornice: "3.4" clearance (red frame) and the boat pictogram, on both faces
  for (const sg of [-1, 1]) {
    const v = sg * (FACE + 0.03);
    P.quad(M.signClear, [-2.7 + 0.25 * sg, 0.18, v], [-2.7 - 0.25 * sg, 0.18, v], [-2.7 - 0.25 * sg, 1.08, v], [-2.7 + 0.25 * sg, 1.08, v], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    P.quad(M.signBoat, [3.4 + 0.25 * sg, 0.55, v], [3.4 - 0.25 * sg, 0.55, v], [3.4 - 0.25 * sg, 1.05, v], [3.4 + 0.25 * sg, 1.05, v], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  }
  P.pop();
}

/** road markings (white decals on the asphalt: lane lines, centre double line, zebra at the east end), +2.5 cm over the deck, following the hump */
export function buildMarkings(K, M) {
  const P = K.P;
  P.push(CX, 0, CZ, -TH);
  const strip = (mat, u0, u1, v0, v1, lift = 0.025) => {
    const n = Math.max(1, Math.ceil((u1 - u0) / 6));
    for (let i = 0; i < n; i++) {
      const a = u0 + (u1 - u0) * i / n, b = u0 + (u1 - u0) * (i + 1) / n;
      P.quad(mat, [a, yDeck(a) + lift, v0], [b, yDeck(b) + lift, v0], [b, yDeck(b) + lift, v1], [a, yDeck(a) + lift, v1], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }
  };
  const uA = -HALF + 0.6, uB = HALF - 0.6;
  for (const v of [-0.1, 0.1]) strip(M.mark, uA, uB, v - 0.07, v + 0.07);                 // centre double line
  for (const v of [-12, -8, -4, 4, 8, 12]) {                                               // lane dashes: 3 m / 6 m
    const solid = Math.abs(v) === 12;
    if (solid) { strip(M.mark, uA, uB - 4.6, v - 0.06, v + 0.06); continue; }
    for (let u = uA + 1; u + 3 < uB - 4.6; u += 9) strip(M.mark, u, u + 3, v - 0.06, v + 0.06);
  }
  // zebras at both ends: bars along u (parallel to the traffic), 0.5 m wide every 1.0 m across the roadway
  for (let v = -ROAD + 0.8; v < ROAD - 0.5; v += 1.0) { strip(M.mark, HALF - 4.7, HALF - 1.0, v - 0.25, v + 0.25); strip(M.mark, -HALF + 1.0, -HALF + 4.7, v - 0.25, v + 0.25); }
  // stop lines
  strip(M.mark, HALF - 5.6, HALF - 5.2, 0.4, ROAD - 0.2); strip(M.mark, -HALF + 5.2, -HALF + 5.6, -ROAD + 0.2, -0.4);
  P.pop();
}

/** the 1.75 x 1.0 m cast-iron panels of both railings (3 relief types alternating) - instanced, alpha cut-out, no outline */
export function buildRailing(ctx, M, root) {
  const T = ctx.THREE || THREE;
  const runs = [[-22.9, -8.45], [-7.65, 7.65], [8.45, 22.9]];
  const buckets = [[], [], []];
  let n = 0;
  for (const sg of [-1, 1]) {
    for (const [a, b] of runs) {
      const count = Math.max(1, Math.round((b - a) / 1.75)), pw = (b - a) / count;
      for (let i = 0; i < count; i++) {
        const u = a + pw * (i + 0.5), kind = (Math.abs(i + (sg > 0 ? 1 : 0) + Math.round(a)) % 3);
        buckets[kind].push({ u, v: sg * (EDGE - 0.175), len: pw }); n++;
      }
    }
  }
  const geo = new T.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const up = new T.Vector3(0, 1, 0), zz = new T.Vector3(0, 0, 1), qa = new T.Quaternion(), qb = new T.Quaternion(), m4 = new T.Matrix4(), sc = new T.Vector3(), pos = new T.Vector3();
  buckets.forEach((list, k) => {
    if (!list.length) return;
    const im = new T.InstancedMesh(geo, M.rail[k], list.length);
    list.forEach((p, i) => {
      const w = toWorld(p.u, p.v);
      qa.setFromAxisAngle(up, -TH); qb.setFromAxisAngle(zz, Math.atan(slope(p.u))); qa.multiply(qb);
      m4.compose(pos.set(w.x, yDeck(p.u) + 0.14, w.z), qa, sc.set(p.len, 1.0, 1)); im.setMatrixAt(i, m4);
    });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = false; im.name = 'lmC-bridge-rail-' + k;
    im.computeBoundingBox(); im.computeBoundingSphere();
    // Keep the bridge railing's authored range: the unit plane is scaled per bay,
    // so geometry-only LOD would hide the complete rail beyond a bench's range.
    im.userData.noSplit = true;
    ctx.noOutline(im); root.add(im);
  });
  return n;
}

/** colliders: the deck as walk ramps (the hump), the railing line, nothing else (pedestals: horses.js; quay gaps: closure.js) */
export function bridgeColliders(ctx) {
  const ph = ctx.physics; let n = 0;
  for (let i = 0; i + 1 < STATIONS.length; i++) {
    const u0 = STATIONS[i], u1 = STATIONS[i + 1], len = u1 - u0; if (len < 0.05) continue;
    const w = toWorld((u0 + u1) / 2, 0);
    ph.addWalkRamp(w.x, w.z, 2 * EDGE, len, RAMP_ROT, yDeck(u0), yDeck(u1), 2.5); n++;
  }
  for (const sg of [-1, 1]) {                                       // railing + pedestals: a solid column along both sides from bank to bank (feet may rise to +1.5 on the crown, the rail stays above)
    const v = sg * (EDGE - 0.175), uw = bankU(-1, v) - 0.2, ue = bankU(1, v) + 0.2, w = toWorld((uw + ue) / 2, v);
    ph.addBox(w.x, w.z, ue - uw, 0.5, BOX_ROT, -6, 3.2); n++;
  }
  return n;
}
