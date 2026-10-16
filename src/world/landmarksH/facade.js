// landmarksH/facade.js - the body of the Admiralty (Zakharov 1806-23): the 408 m garden facade, the two wings (140-150 m, outer faces to Admiralteysky proezd / Dvortsovy proezd and Senate Square), the inner
// ranges and yards, roofs, colliders and the porticoes / Neva pavilions (porticos.js).  Plan = the 102-vertex OSM ring of r2612859 (97 simplified vertices of the dossier section 3.2, all edges are parallel
// to the Admiralty frame axes): every edge is classified in the frame (a, b) of frame.js:
//   garden   normal -b, b < 0          rusticated ground storey (0-4.6 m, ochre blocks with white joints, arched windows with mascaron keystones), string course, floor 1 tall windows on
//                                      balustrades (white frames, dark sashes), band, floor 2 small windows, trophy-less Doric cornice (architrave 15.0, mutules 17.0, corona 17.5-18.4) [refs 007 003 004 029]
//   flank    normal +-a, |a| > 185     the same elevation on the outer wings
//   tower    |a| < 19, |b| < 13        skipped (tower.js draws the gate cube and the passage)
//   portico  garden porticoes (a +-130..168, b -14.8), flank porticoes (b 55..93, projecting 6 m), Neva pavilions (b 133..158): skipped here, drawn by porticos.js
//   yard     everything else           plain ochre walls with small windows, simple cornice
// Roofs: red painted iron #B5524C, flat cap at 19.2 m behind a sloped eave strip; the courtyards stay open.  Colliders: thin wall boxes along the ring minus the tower block.
import * as THREE from 'three';
import * as L from '../layout.js';
import { ringEdges, onEdge, band } from './kit.js';
import { ringFromFlat } from '../lib/massing.js';
import { TX, TZ, ROT, CR, SR, AB, W } from './frame.js';
import { buildPorticos } from './porticos.js';

export const Y = { BASE: 1.0, RUST: 4.6, STR: 5.1, F1: 6.2, BAND: 11.0, F2: 12.0, ARCH: 15.0, FR: 15.8, MUT: 17.0, COR: 17.5, TOP: 18.4, ROOF: 19.2 };
const PITCH = 4.35;

/** classify an edge of the ring (frame coordinates) */
export function classify(e) {
  const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2, [a, b] = AB(mx, mz);
  const na = e.n[0] * CR - e.n[1] * SR, nb = -e.n[0] * SR - e.n[1] * CR;
  const A = Math.abs(a);
  if (A <= 19.5 && Math.abs(b) <= 13.5) return 'tower';
  if (nb < -0.85 && b < 0) return b < -13 && A > 129 && A < 169.5 ? 'portico' : 'garden';
  if (Math.abs(na) > 0.85 && b < 0 && A > 128 && A < 170) return 'portico';                       // the sides of a garden portico
  if (Math.abs(na) > 0.85 && A > 185) {
    if (b > 128) return 'pavside';
    return 'flank';
  }
  if (Math.abs(nb) > 0.85 && A > 195 && b > 50 && b < 95) return 'portico';                         // the sides of a flank portico block
  if (Math.abs(na) > 0.85 && A > 200 && b > 50 && b < 95) return 'portico';                         // its front
  if (nb > 0.85 && b > 150 && A > 140) return 'pavilion';
  return 'yard';
}

const unit = (n) => { const l = Math.hypot(n[0], n[1]) || 1; return [n[0] / l, n[1] / l]; };
/** mitre point at the start of edge e pushed d outwards (copy of kit.js mitre) */
function mitre(pe, e, dp, dn) {
  const a = e.a;
  if (!pe) return [a[0] + e.n[0] * dn, a[1] + e.n[1] * dn];
  const dot = pe.n[0] * e.n[0] + pe.n[1] * e.n[1];
  if (dot > 0.9995) return [a[0] + e.n[0] * dn, a[1] + e.n[1] * dn];
  const det = 1 - dot * dot, s = (dp - dn * dot) / det, t = (dn - dp * dot) / det;
  const q = [pe.n[0] * s + e.n[0] * t, pe.n[1] * s + e.n[1] * t], lim = 3 * Math.max(Math.abs(dp), Math.abs(dn)) + 0.01, l = Math.hypot(q[0], q[1]);
  if (l > lim) { const k = lim / l; return [a[0] + q[0] * k, a[1] + q[1] * k]; }
  return [a[0] + q[0], a[1] + q[1]];
}
/** a sloped strip from the eave line (offset d, height y0) up to the ring line (height y1) along the drawn edges of one ring */
export function slopeStrip(P, edges, draw, d, y0, y1, mat) {
  const n = edges.length, ok = edges.map(draw);
  const linked = (i, j) => ok[i] && ok[j] && Math.hypot(edges[i].b[0] - edges[j].a[0], edges[i].b[1] - edges[j].a[1]) < 0.05;
  const start = edges.map((e, i) => { const pi = (i + n - 1) % n; return linked(pi, i) ? mitre(edges[pi], e, d, d) : [e.a[0] + e.n[0] * d, e.a[1] + e.n[1] * d]; });
  for (let i = 0; i < n; i++) {
    if (!ok[i]) continue;
    const e = edges[i], j = (i + 1) % n, A = start[i], B = linked(i, j) ? start[j] : [e.b[0] + e.n[0] * d, e.b[1] + e.n[1] * d];
    P.quad(mat, [A[0], y0, A[1]], [B[0], y0, B[1]], [e.b[0], y1, e.b[1]], [e.a[0], y1, e.a[1]], [e.n[0] * 0.5, 0.85, e.n[1] * 0.5], [[0, 0], [e.len / 4, 0], [e.len / 4, 1], [0, 1]]);
  }
}

export function build(K, ctx, H) {
  const P = K.P, M = H.M;
  const rec = L.buildingById('r2612859');
  if (!rec) throw new Error('Admiralty record r2612859 missing');
  const poly = rec.polys[0];
  const edges = ringEdges(poly, 0.05);
  edges.forEach((e) => { e.zone = classify(e); });
  const stats = {}; for (const e of edges) stats[e.zone] = (stats[e.zone] || 0) + 1;
  K.svc.facadeStats = stats;

  // ---------------------------------------------------------------- walls
  for (const e of edges) {
    if (e.zone === 'tower' || e.zone === 'portico' || e.zone === 'pavilion') continue;
    if (e.zone === 'yard') onEdge(P, e, (len) => yardWall(K, M, e, len));
    else onEdge(P, e, (len) => frontWall(K, M, e, len));
  }
  // chimney stacks along the red roofs (ochre with white caps), every ~22 m
  for (const e of edges) {
    if (!(e.zone === 'garden' || e.zone === 'flank') || e.len < 24) continue;
    const n = Math.floor(e.len / 22);
    onEdge(P, e, (len) => { for (let i = 0; i < n; i++) { const u = len * (i + 0.5) / n; P.box(K.mats.chimneyYellow, u - 0.5, u + 0.5, Y.ROOF, Y.ROOF + 2.3, -3.6, -2.6, 'b'); P.box(K.mats.shade, u - 0.62, u + 0.62, Y.ROOF + 2.3, Y.ROOF + 2.5, -3.72, -2.48, 'b'); } });
  }
  // plinth-free bands: granite base 0 - 1.0 is part of the walls; the cornice bands run along the drawn edges of the ring
  const drawn = (e) => e.zone === 'garden' || e.zone === 'flank' || e.zone === 'pavside';
  const yardE = (e) => e.zone === 'yard';
  band(P, edges, Y.ARCH, Y.FR, 0.2, { front: M.white, top: M.white, under: M.whiteShade }, { draw: drawn });
  band(P, edges, Y.MUT, Y.COR, 0.85, { front: M.mutule, top: null, under: M.whiteShade }, { draw: drawn, uvs: 0.5 });
  band(P, edges, Y.COR, Y.TOP, 1.4, { front: M.white, top: M.white, under: M.whiteShade }, { draw: drawn });
  band(P, edges, 17.2, 17.8, 0.45, { front: M.white, top: M.white, under: M.whiteShade }, { draw: yardE });
  slopeStrip(P, edges, drawn, 1.4, Y.TOP, Y.ROOF, M.roofTex);
  // ---------------------------------------------------------------- roof cap (red iron) and the courtyard roofs
  const outer = ringFromFlat(poly.o);
  try { P.cap(M.roofTex, outer, Y.ROOF, true, 4); } catch (err) { console.warn('[landmarksH] roof cap failed', err); }

  // ---------------------------------------------------------------- colliders: thin wall boxes along the ring minus the tower block
  let nCol = 0;
  for (const e of edges) {
    if (e.zone === 'tower') continue;
    const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], l = e.len; if (l < 0.3) continue;
    ctx.physics.addBox((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, l + 0.45, 0.9, Math.atan2(-dz, dx), 0, 26); nCol++;
  }
  K.svc.facadeColliders = nCol;

  P.push(TX, 0, TZ, ROT); buildPorticos(K, ctx, H); P.pop();
  K.svc.houses.push({ id: 'admiralty', name: 'Главное Адмиралтейство', nameEn: 'Main Admiralty', x: -2430, z: -622 });
  K.svc.monuments.push({ id: 'admiralty', name: 'Адмиралтейство', nameEn: 'Admiralty building', x: -2430, z: -622, h: 22 });
}

// ------------------------------------------------------------------------------------------------ the elevation of one outer edge (frame: x along the wall, z out)
function frontWall(K, M, e, len) {
  const P = K.P, A = Math.abs(AB((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2)[0]);
  // granite base, rusticated ground storey, string course
  P.box(M.granite, 0, len, 0, Y.BASE, 0, 0.14, 'kb', 1.0);
  K.wallQuad(M.rust, 0, len, Y.BASE, Y.RUST, 2.4, 0, 1.1);
  P.box(M.white, 0, len, Y.RUST, Y.STR, 0, 0.22, 'kb');
  K.wallQuad(M.wall, 0, len, Y.STR, Y.TOP + 0.02, 3);
  const nearTower = A < 21;
  if (len < 4.5) return;
  const xs = K.bays(1.5, len - 1.5, PITCH);
  for (const x of xs) {
    // ground floor: arched window in the rustication with a keystone mask
    K.window({ x, y: 1.25, w: 1.3, h: 2.45, head: 'arch', sw: 0.16, d: 0.08, sill: false, frame: 'brown', surMat: M.white });
    P.box(M.white, x - 0.3, x + 0.3, 3.5, 4.45, 0, 0.13, 'kb');
    // floor 1: tall window with balustrade and a flat cornice hood
    K.window({ x, y: Y.F1, w: 1.35, h: 3.2, head: 'flat', sw: 0.2, d: 0.1, sill: true, frame: 'brown', surMat: M.white });
    K.balustrade(x - 0.85, x + 0.85, Y.STR + 0.1, 0.92, 0.26, M.white);
    P.box(M.white, x - 1.05, x + 1.05, Y.F1 + 3.2 + 0.2, Y.F1 + 3.2 + 0.45, 0, 0.3, 'kb');
    // floor 2: small window
    K.window({ x, y: Y.F2, w: 1.15, h: 2.3, head: 'flat', sw: 0.12, d: 0.07, sill: true, frame: 'brown', surMat: M.white });
  }
  P.box(M.white, 0, len, Y.BAND, Y.BAND + 0.28, 0, 0.14, 'kb');                                      // belt between the floors
  // a pilaster strip at both ends of long walls (the jogs of the real facade)
  void nearTower;
}

/** courtyard / rear wall: plain ochre with a regular row of small windows */
function yardWall(K, M, e, len) {
  const P = K.P;
  P.box(M.granite, 0, len, 0, 0.8, 0, 0.1, 'kb', 1.0);
  K.wallQuad(M.wall, 0, len, 0.8, Y.ROOF, 3);
  if (len < 4) return;
  const xs = K.bays(1.2, len - 1.2, 3.9);
  for (const x of xs) {
    K.window({ x, y: 1.4, w: 1.1, h: 2.0, head: 'flat', sw: 0.1, d: 0.06, sill: false, frame: 'white', surMat: M.white });
    K.window({ x, y: 6.4, w: 1.2, h: 2.6, head: 'flat', sw: 0.14, d: 0.07, sill: true, frame: 'white', surMat: M.white });
    K.window({ x, y: 12.0, w: 1.1, h: 2.2, head: 'flat', sw: 0.1, d: 0.06, sill: false, frame: 'white', surMat: M.white });
  }
}
