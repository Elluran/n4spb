// landmarksF/interior.js - the walkable interior of Kazan Cathedral (stage 2; docs/research/kazan-cathedral.md section 8, photos 19 79-83): enter by the open west door.
// A three-nave hall on the Latin-cross plan: granite columns with gilded capitals in two rows along every arm, plastered entablature beams, barrel vaults with gold rosettes over the central naves,
// flat coffered aisle ceilings, four piers under the dome, a shaft with 16 windows and an inner dome painted in grisaille, the octagon-marble floor with a red carpet runner, the gilded iconostasis
// across the east end with candle stands, three chandeliers, daylight from emissive window panes, and an indoor light zone.  Everything is drawn in the cathedral model frame (frame.js);
// the walls are the inset (0.3 m) footprint of body.js.  A modest rendition: 22 columns instead of the real 56, no side chapels, no Kutuzov tomb.
import * as THREE from 'three';
import { ringEdges, onEdge, polyOf } from './kit.js';
import { outline, TX, NZ, SZ, NVN, NVS, L1, R1 } from './body.js';
import { walkAt, boxAt, cylAt, Mdl } from './frame.js';
import { arcWall } from './prims.js';

const TAU = Math.PI * 2;
export const FL = 1.35, YB = 14.1, YV = 20.3, YS = 34.6, YW = 21.2, S = 8.5, CZ = 72.9, IX = 20.4;
const IN = 0.3;                                                  // wall thickness (the exterior faces are on the outline)
const X0 = L1 + IN, X1 = R1 - IN, Z0 = NZ + IN, Z1 = SZ - IN, ZN = NVN + IN, ZS = NVS - IN, XT = TX - IN;

/** inset a closed ring by d (mitred) */
function insetRing(ring, d) {
  const edges = ringEdges(polyOf(ring)), n = edges.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = edges[(i + n - 1) % n], e = edges[i], dot = p.n[0] * e.n[0] + p.n[1] * e.n[1], k = d / (1 + dot);
    out.push([e.a[0] - (p.n[0] + e.n[0]) * k, e.a[1] - (p.n[1] + e.n[1]) * k]);
  }
  return out;
}
function pointIn(r, x, z) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; }

/** a parametric surface drawn as flat quads, each facing `toward(point)` (the viewer side) */
function surf(P, mat, nu, nv, f, toward, uvs = [4, 4]) {
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = f(i / nu, j / nv), b = f((i + 1) / nu, j / nv), c = f((i + 1) / nu, (j + 1) / nv), d = f(i / nu, (j + 1) / nv);
    const m = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, (a[2] + c[2]) / 2];
    P.quad(mat, a, b, c, d, toward(m), [[a[3] / uvs[0], a[4] / uvs[1]], [b[3] / uvs[0], b[4] / uvs[1]], [c[3] / uvs[0], c[4] / uvs[1]], [d[3] / uvs[0], d[4] / uvs[1]]]);
  }
}

export function interior(K) {
  const P = K.P, M = K.M, ctx = K.ctx, ph = ctx.physics;
  const ring = insetRing(outline(), IN), edges = ringEdges(polyOf(ring));
  walls(P, M, edges);
  floor(P, M, ring, ph);
  columns(K, P, M, ph);
  crossing(P, M, ph);
  vaultsAndAisles(P, M);
  iconostasis(P, M, ph);
  lights(P, M, ph);
  zone(ctx);
}

// ------------------------------------------------------------------------------------------------ walls: dado, plaster, gilded string courses, window panes, the door reveal
function walls(P, M, edges) {
  for (const e of edges) {
    const mid = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2], west = Math.abs(e.n[0] + 1) < 1e-3 && Math.abs(mid[0] - X0) < 0.1;
    onEdge(P, e, (len) => {
      const uv = (x0, y0, x1, y1) => [[x0 / 3, y0 / 3], [x1 / 3, y0 / 3], [x1 / 3, y1 / 3], [x0 / 3, y1 / 3]];
      const piece = (mat, x0, x1, y0, y1) => { if (x1 - x0 > 0.01 && y1 - y0 > 0.01) P.quad(mat, [x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0], [0, 0, -1], uv(x0, y0, x1, y1)); };
      const dc = len / 2, dw = 1.8;
      if (west) {
        piece(M.dado, 0, dc - dw, FL, 3.2); piece(M.dado, dc + dw, len, FL, 3.2);
        piece(M.plaster, 0, dc - dw, 3.2, YW); piece(M.plaster, dc + dw, len, 3.2, YW); piece(M.plaster, dc - dw, dc + dw, 8.35, YW);
        // reveal of the door through the 0.3 m wall
        for (const sg of [-1, 1]) P.quad(M.plaster, [dc + sg * dw, FL, 0], [dc + sg * dw, FL, IN], [dc + sg * dw, 8.35, IN], [dc + sg * dw, 8.35, 0], [-sg, 0, 0]);
        P.quad(M.plaster, [dc - dw, 8.35, 0], [dc + dw, 8.35, 0], [dc + dw, 8.35, IN], [dc - dw, 8.35, IN], [0, -1, 0]);
        P.quad(M.floor, [dc - dw, FL, 0], [dc + dw, FL, 0], [dc + dw, FL, IN], [dc - dw, FL, IN], [0, 1, 0]);
      } else { piece(M.dado, 0, len, FL, 3.2); piece(M.plaster, 0, len, 3.2, YW); }
      const trim = (y0, y1) => { if (west) { P.quad(M.trim, [0, y0, -0.015], [dc - dw, y0, -0.015], [dc - dw, y1, -0.015], [0, y1, -0.015], [0, 0, -1]); P.quad(M.trim, [dc + dw, y0, -0.015], [len, y0, -0.015], [len, y1, -0.015], [dc + dw, y1, -0.015], [0, 0, -1]); } else P.quad(M.trim, [0, y0, -0.015], [len, y0, -0.015], [len, y1, -0.015], [0, y1, -0.015], [0, 0, -1]); };
      trim(3.2, 3.45); trim(13.95, 14.3);
      // windows: two rows (aisle walls), a third high row on the end walls of the naves
      const n = Math.max(1, Math.round(len / 4.6)), p = len / n, small = len < 3.2;
      const centralEnd = (len > 12) && (Math.abs(e.n[1]) > 0.99 || west);                // north / south / west end walls
      for (let k = 0; k < n; k++) {
        const x = p * (k + 0.5), w = small ? 1.0 : 1.5;
        if (west && Math.abs(x - dc) < 2.8) continue;
        for (const [y0, h] of small ? [[3.8, 3.4], [9.8, 3.2]] : [[3.8, 4.4], [9.6, 3.8]]) win(P, M, x, y0, w, h);
        if (centralEnd && Math.abs(x - len / 2) < S + 0.5) win(P, M, x, 15.8, 1.6, 3.8);
      }
    });
  }
}
function win(P, M, x, y0, w, h) {
  P.quad(M.trim, [x - w / 2 - 0.12, y0 - 0.12, -0.012], [x + w / 2 + 0.12, y0 - 0.12, -0.012], [x + w / 2 + 0.12, y0 + h + 0.12, -0.012], [x - w / 2 - 0.12, y0 + h + 0.12, -0.012], [0, 0, -1]);
  P.quad(M.skylight, [x - w / 2, y0, -0.024], [x + w / 2, y0, -0.024], [x + w / 2, y0 + h, -0.024], [x - w / 2, y0 + h, -0.024], [0, 0, -1]);
  P.quad(M.trim, [x - 0.03, y0, -0.036], [x + 0.03, y0, -0.036], [x + 0.03, y0 + h, -0.036], [x - 0.03, y0 + h, -0.036], [0, 0, -1]);
}

// ------------------------------------------------------------------------------------------------ floor, carpet, walk boxes
function floor(P, M, ring, ph) {
  P.cap(M.floorPat, ring, FL, true, 8);
  P.quad(M.carpet, [X0, FL + 0.015, CZ - 1.4], [17.0, FL + 0.015, CZ - 1.4], [17.0, FL + 0.015, CZ + 1.4], [X0, FL + 0.015, CZ + 1.4], [0, 1, 0]);
  // walkable floor: the cross in three rectangles (+ the door sill and the apse)
  walkAt(ph, (L1 + X1) / 2, (ZN + ZS) / 2, X1 - L1, ZS - ZN, 0, FL, -1);
  walkAt(ph, 0, (Z0 + ZN) / 2, 2 * XT, ZN - Z0, 0, FL, -1);
  walkAt(ph, 0, (ZS + Z1) / 2, 2 * XT, Z1 - ZS, 0, FL, -1);
  walkAt(ph, 28.0, CZ, 6.0, 12.0, 0, FL, -1);
}

// ------------------------------------------------------------------------------------------------ columns, beams, piers
function column(P, M, x, z) {
  const y0 = FL;
  P.box(M.dado, x - 0.8, x + 0.8, y0, y0 + 0.5, z - 0.8, z + 0.8, 'b');
  P.cyl(M.colGranite, [x, y0 + 0.5, z], [x, y0 + 9.9, z], 0.6, 0.5, 14, false);
  P.cyl(M.trim, [x, y0 + 9.9, z], [x, y0 + 10.2, z], 0.62, 0.62, 14, true);
  P.cyl(M.trim, [x, y0 + 10.2, z], [x, y0 + 11.2, z], 0.52, 0.86, 12, false);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.cyl(M.trim, [x + Math.sin(a) * 0.58, y0 + 10.2, z + Math.cos(a) * 0.58], [x + Math.sin(a) * 0.84, y0 + 11.1, z + Math.cos(a) * 0.84], 0.17, 0.1, 4, false); }
  P.box(M.trim, x - 0.95, x + 0.95, y0 + 11.2, y0 + 11.45, z - 0.95, z + 0.95, 'b');
}
function beam(P, M, x0, x1, z0, z1) {
  P.box(M.plaster, x0, x1, FL + 11.45, YB, z0, z1, '');
  P.box(M.trim, x0 + 0.01, x1 - 0.01, FL + 11.52, FL + 11.72, z0 - 0.04, z1 + 0.04, '');
}
function columns(K, P, M, ph) {
  const rows = [];                                               // [axis, fixed, list of positions, beam from, beam to]
  rows.push(['x', CZ - S, [-37.6, -32.8, -28.0, -23.2, -18.4], X0, -S - 1.7], ['x', CZ + S, [-37.6, -32.8, -28.0, -23.2, -18.4], X0, -S - 1.7]);   // west arm
  rows.push(['x', CZ - S, [16.4], S + 1.7, X1], ['x', CZ + S, [16.4], S + 1.7, X1]);                                                            // east arm
  rows.push(['z', -S, [46.6, 51.4, 56.2], Z0, CZ - S - 1.7], ['z', S, [46.6, 51.4, 56.2], Z0, CZ - S - 1.7]);                                    // north arm
  rows.push(['z', -S, [89.6, 94.4], CZ + S + 1.7, Z1], ['z', S, [89.6, 94.4], CZ + S + 1.7, Z1]);                                               // south arm
  for (const [axis, fixed, list, b0, b1] of rows) {
    for (const t of list) { const x = axis === 'x' ? t : fixed, z = axis === 'x' ? fixed : t; column(P, M, x, z); cylAt(ph, x, z, 0.75, 0, 30); K.interiorCols = (K.interiorCols || 0) + 1; }
    if (axis === 'x') beam(P, M, b0, b1, fixed - 0.9, fixed + 0.9); else beam(P, M, fixed - 0.9, fixed + 0.9, b0, b1);
  }
  // piers under the dome: dado + plastered shaft up to the vault level
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * S, z = CZ + sz * S;
    P.box(M.dado, x - 1.7, x + 1.7, FL, 4.0, z - 1.7, z + 1.7, 'b'); P.box(M.plaster, x - 1.7, x + 1.7, 4.0, YV, z - 1.7, z + 1.7, '');
    P.box(M.trim, x - 1.74, x + 1.74, 4.0, 4.3, z - 1.74, z + 1.74, ''); P.box(M.trim, x - 1.74, x + 1.74, YB - 0.2, YB + 0.1, z - 1.74, z + 1.74, '');
    boxAt(ph, x, z, 3.5, 3.5, 0, -1, 30);
  }
}

// ------------------------------------------------------------------------------------------------ crossing: ceiling plate, spandrels, shaft with windows, inner dome
function crossing(P, M, ph) {
  void ph;
  // the plate between the square (half S) and the circle (R = S)
  const N = 32, Q = S;
  for (let j = 0; j < N; j++) {
    const t0 = j / N * TAU, t1 = (j + 1) / N * TAU, sq = (t) => { const c = Math.cos(t), s = Math.sin(t), k = Q / Math.max(Math.abs(c), Math.abs(s)); return [k * s, k * c]; };
    const a = [S * Math.sin(t0), CZ + S * Math.cos(t0)], b = [S * Math.sin(t1), CZ + S * Math.cos(t1)], sa = sq(t0), sb = sq(t1);
    P.quad(M.plaster, [a[0], YV, a[1]], [sa[0], YV, CZ + sa[1]], [sb[0], YV, CZ + sb[1]], [b[0], YV, b[1]], [0, -1, 0]);
  }
  // spandrel walls above the four arches (half-ellipse 8.5 x 6.2 up to the plate)
  for (const rot of [Math.PI / 2, -Math.PI / 2, 0, Math.PI]) {
    const px = rot === Math.PI / 2 ? -S : rot === -Math.PI / 2 ? S : 0, pz = rot === 0 ? CZ - S : rot === Math.PI ? CZ + S : CZ;
    P.push(px, 0, pz, rot);
    const sh = new THREE.Shape(); for (let k = 0; k <= 24; k++) { const t = Math.PI * k / 24; const x = -S * Math.cos(t), y = YB + (YV - YB) * Math.sin(t); if (k) sh.lineTo(x, y); else sh.moveTo(x, y); }
    sh.lineTo(S, YV); sh.lineTo(-S, YV);
    P.face(M.plaster, sh, 0, 3);
    P.box(M.trim, -S, S, YV - 0.25, YV, 0, 0.12, 'kb');
    P.pop();
  }
  // shaft + inner dome around the dome axis
  P.push(0, 0, CZ, 0);
  arcWall(P, M.plaster, S, 0, TAU, YV, YS, true, { step: 1.6, uvu: 3 });
  arcWall(P, M.trim, S - 0.03, 0, TAU, YV + 0.1, YV + 0.5, true, { step: 1.6, uvu: 3 });
  for (let k = 0; k < 16; k++) {
    const a = (k + 0.5) * TAU / 16;
    P.push(S * Math.sin(a), 0, S * Math.cos(a), a);
    win(P, M, 0, 26.5, 1.9, 6.4);
    P.pop();
  }
  arcWall(P, M.trim, S - 0.03, 0, TAU, YS - 0.5, YS, true, { step: 1.6, uvu: 3 });
  // inner dome: ellipsoid cap, grisaille painting
  const H = 7.6;
  surf(P, M.domePaint, 32, 8, (u, v) => { const a = u * TAU, t = v * Math.PI / 2, r = S * Math.cos(t); return [r * Math.sin(a), YS + H * Math.sin(t), CZ * 0 + r * Math.cos(a), u * 16, v]; },
    (m) => [-m[0], -(m[1] - YS) * 0.5 - 0.2, -m[2]], [1, 1]);
  // a gilded ring and lamp at the crown
  P.cyl(M.trim, [0, YS + H - 0.4, 0], [0, YS + H, 0], 0.9, 0.5, 10, true);
  P.pop();
}

// ------------------------------------------------------------------------------------------------ barrel vaults of the four arms, flat aisle ceilings, apse semi-dome
function vaultsAndAisles(P, M) {
  const H = YV - YB;
  // along x (west / east arm): across = z
  const vx = (xa, xb) => surf(P, M.vault, Math.max(2, Math.round((xb - xa) / 3)), 14, (u, v) => { const t = v * Math.PI, x = xa + (xb - xa) * u; return [x, YB + H * Math.sin(t), CZ - S * Math.cos(t), x, t * 7.4]; },
    (m) => { const dz = m[2] - CZ, dy = m[1] - YB; const nz = -dz / (S * S), ny = -dy / (H * H); const l = Math.hypot(nz, ny) || 1; return [0, ny / l, nz / l]; });
  const vz = (za, zb) => surf(P, M.vault, Math.max(2, Math.round((zb - za) / 3)), 14, (u, v) => { const t = v * Math.PI, z = za + (zb - za) * u; return [-S * Math.cos(t), YB + H * Math.sin(t), z, z, t * 7.4]; },
    (m) => { const dx = m[0], dy = m[1] - YB; const nx = -dx / (S * S), ny = -dy / (H * H); const l = Math.hypot(nx, ny) || 1; return [nx / l, ny / l, 0]; });
  vx(X0, -S); vx(S, X1); vz(Z0, CZ - S); vz(CZ + S, Z1);
  // aisle ceilings (flat, coffered)
  const A = (pts) => P.cap(M.vault, pts, YB, false, 4);
  A([[X0, ZN], [-XT, ZN], [-XT, Z0], [-S, Z0], [-S, CZ - S], [X0, CZ - S]]);
  A([[S, Z0], [XT, Z0], [XT, ZN], [X1, ZN], [X1, CZ - S], [S, CZ - S]]);
  A([[X0, CZ + S], [-S, CZ + S], [-S, Z1], [-XT, Z1], [-XT, ZS], [X0, ZS]]);
  A([[S, CZ + S], [X1, CZ + S], [X1, ZS], [XT, ZS], [XT, Z1], [S, Z1]]);
  // apse: the east wall between the aisles is the iconostasis; the semi-dome sits over the apse (quarter ellipsoid), 16 m wide
  const ax = X1, R = 8.2;
  surf(P, M.plaster, 12, 6, (u, v) => { const a = (u - 0.5) * Math.PI, t = v * Math.PI / 2, r = R * Math.cos(t); return [ax + r * Math.cos(a) * 0.8, YB + H * Math.sin(t) * 0.9, CZ + r * Math.sin(a), u * 6, v * 4]; },
    (m) => { const dx = m[0] - ax, dz = m[2] - CZ, dy = m[1] - YB; return [-dx, -dy, -dz]; });
  surf(P, M.dado, 12, 1, (u, v) => { const a = (u - 0.5) * Math.PI * 0.99; return [ax + R * Math.cos(a) * 0.8, FL + (YB - FL) * v, CZ + R * Math.sin(a), u * 6, v * 4]; }, (m) => [-(m[0] - ax), 0, -(m[2] - CZ)], [3, 3]);
}

// ------------------------------------------------------------------------------------------------ iconostasis + candle stands
function iconostasis(P, M, ph) {
  const w = 17, h = 14;
  P.push(IX, 0, CZ, -Math.PI / 2);
  P.quad(M.icono, [-w / 2, FL, 0], [w / 2, FL, 0], [w / 2, FL + h, 0], [-w / 2, FL + h, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  P.box(M.trim, -w / 2, w / 2, FL, FL + h + 0.3, -0.9, 0, 'f');
  P.box(M.trim, -w / 2 - 0.2, w / 2 + 0.2, FL + h, FL + h + 0.6, -1.0, 0.25, '');
  // cross on the top
  P.box(M.trim, -0.12, 0.12, FL + h + 0.6, FL + h + 3.4, -0.2, 0.0, '');
  P.box(M.trim, -0.9, 0.9, FL + h + 2.3, FL + h + 2.55, -0.2, 0.0, '');
  // the solea: a low step in front
  P.box(M.dado, -w / 2 - 0.5, w / 2 + 0.5, FL, FL + 0.12, 0.0, 2.2, 'b');
  P.pop();
  boxAt(ph, IX - 0.45, CZ, 1.1, w + 1.2, 0, -1, 30);
  // candle stands before the iconostasis
  for (const dz of [-6.5, -3.2, 3.2, 6.5]) {
    const x = IX - 3.0, z = CZ + dz;
    P.cyl(M.trim, [x, FL, z], [x, FL + 0.95, z], 0.06, 0.04, 6, false); P.cyl(M.trim, [x, FL, z], [x, FL + 0.08, z], 0.3, 0.3, 10, true);
    P.cyl(M.trim, [x, FL + 0.95, z], [x, FL + 1.0, z], 0.55, 0.55, 12, true);
    for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = i ? 0.38 : 0; P.cyl(M.candle, [x + Math.sin(a) * r, FL + 1.0, z + Math.cos(a) * r], [x + Math.sin(a) * r, FL + 1.22, z + Math.cos(a) * r], 0.025, 0.02, 4, true); }
    cylAt(ph, x, z, 0.5, 0, 2);
  }
}

// ------------------------------------------------------------------------------------------------ chandeliers
function chandelier(P, M, x, z, y, R, yTop, n) {
  const ring = new THREE.TorusGeometry(R, 0.07 + R * 0.02, 6, 20);
  P.geo(M.trim, ring, x, y, z, Math.PI / 2, 0, 0);
  P.cyl(M.trim, [x, y, z], [x, yTop, z], 0.03, 0.03, 4, false);
  P.cyl(M.trim, [x, y - 0.3, z], [x, y + 0.2, z], 0.35 + R * 0.08, 0.2, 8, true);
  for (let i = 0; i < n; i++) { const a = i * TAU / n; P.cyl(M.candle, [x + Math.sin(a) * R, y + 0.07, z + Math.cos(a) * R], [x + Math.sin(a) * R, y + 0.5, z + Math.cos(a) * R], 0.035, 0.03, 4, true); }
  P.cyl(M.lampWarm, [x, y - 0.5, z], [x, y - 0.25, z], 0.18, 0.18, 6, true);
  ring.dispose();
}
function lights(P, M, ph) {
  void ph;
  chandelier(P, M, -27, CZ, 15.8, 1.7, YV, 16);
  chandelier(P, M, -12.5, CZ, 16.2, 1.5, YV, 14);
  chandelier(P, M, 11.5, CZ, 16.2, 1.5, YV, 14);
  chandelier(P, M, 0, CZ, 24.5, 3.2, YS + 7, 28);
}

// ------------------------------------------------------------------------------------------------ indoor light zone
function zone(ctx) {
  if (!ctx.zones || !ctx.zones.add) return;
  const ol = outline();
  ctx.zones.add({
    id: 'kazan-interior',
    test: (x, y, z) => { if (y > 46 || y < -1) return false; const m = Mdl(x, z); return pointIn(ol, m.mx, m.mz); },
    indoor: { name: 'Казанский собор', sun: 0.0, sky: false, shadows: false,
      ambient: { color: '#ffeccf', ground: '#c5ae8c', intensity: 1.55 }, key: { color: '#ffe3b5', intensity: 1.05, dir: [0.25, 0.9, 0.35] },
      fog: { color: '#9c8870', density: 0.0009 }, bloom: { bloom: 0.3, glow: 0.14, threshold: 0.98 }, vignette: 0.24, exposure: 1.0, far: 300 },
  });
}
