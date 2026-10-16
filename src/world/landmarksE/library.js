// landmarksE/library.js - the Russian National Library (Российская национальная библиотека), Nevsky 37 / Ostrovsky Sq. 1-3 / Sadovaya 16, OSM r419489; docs/research/gostiny-dvor-ostrovsky.md
// section 4, photos refs/ostrovsky 136 137 138 169 170.  Pale blue-grey stucco (#b8bec8), white (#ecebe6) order and trim; rusticated ground storey with arched lunettes over barred windows; first
// floor windows with triangular pediments on the plain wings; the CONVEX CORNER (Sokolov): a colonnade of SIX free Ionic columns over a balustraded balcony in front of three arched windows (the
// middle one with the clock), a heavy curved cornice and the attic frieze with the lettering "РОССИЙСКАЯ НАЦИОНАЛЬНАЯ БИБЛИОТЕКА"; the ROSSI WING towards the square: free Ionic columns (18) in front of
// the loggia wall over the rusticated storey, ten white statues between them on pedestals and Minerva on the attic.  The footprint comes from OSM (courtyard holes kept); colliders: its outline.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { toUV, ringOf } from './frame.js';
import { figure } from './monument.js';
import { ionic } from './columns.js';
import { archPath } from './kit.js';

const H = { PL: 1.2, G: 6.3, BELT: 6.6, COR: 17.6, TOP: 18.6 };

export function build(K, ctx) {
  const P = K.P, M = K.G.M, KM = K.mats;
  const rec = L.buildingById('r419489');
  if (!rec) throw new Error('library record missing');
  const wallMat = M.lib, trim = M.libTrim;
  const uvOf = (e) => toUV((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2);
  const cls = (e) => {
    if (e.len < 2.5) return null;
    const m = uvOf(e), a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
    if (Math.abs(a.v - 20.1) < 1.5 && Math.abs(b.v - 20.1) < 1.5 && m.u > 410 && m.u < 448) return 'nevsky';
    if (m.u > 446 && m.u < 484 && m.v > 18 && m.v < 62) return e.len > 15 && e.len < 20 && a.v < 50 && b.v < 50 ? 'colonnade' : 'arc';
    if (Math.abs(a.u - 413) < 2.2 && Math.abs(b.u - 413) < 2.2 && Math.max(a.v, b.v) > 40) return 'rossi';
    return null;
  };
  buildHouse(K, {
    name: 'library', recs: [rec], hc: H.COR, wall: '#b8bec8', court: '#c4c8ce', plinth: H.PL, plinthMat: M.libRust, floors: [5.2, 4.6, 4.0, 3.4], courtPitch: 3.8, upstand: 0.7,
    roofMat: M.roofDark, corniceMat: trim, railing: true, collide: true, collideH: 20,
    bands: [{ y0: H.G, y1: H.BELT, d: 0.18, mat: trim }, { y0: 14.2, y1: 14.5, d: 0.12, mat: trim }],
    front: (e, c) => {
      const kind = cls(e); if (!kind) return false;
      if (kind === 'colonnade') { cornerColonnade(K, M, c.len, ctx, e); return true; }
      if (kind === 'rossi') { rossiWing(K, M, e, c.len, ctx); return true; }
      wing(K, M, c.len, kind === 'arc' ? 0.78 : 1);
      return true;
    },
  });
  const c = L.buildingById('r419489').polys[0].o; let cx = 0, cz = 0; for (let i = 0; i < c.length; i += 2) { cx += c[i]; cz += c[i + 1]; } cx /= c.length / 2; cz /= c.length / 2;
  K.svc.monuments.push({ id: 'r419489', name: 'Российская национальная библиотека', nameEn: 'Russian National Library', x: cx, z: cz, h: 19 });
  K.svc.houses.push({ id: 'r419489', name: 'Российская национальная библиотека', nameEn: 'Russian National Library', x: cx, z: cz });
  const q = rec.polys[0].o; void q; void ringOf;
}

/** a plain wing bay run (edge frame): rusticated ground storey with arched lunettes over barred windows, first-floor windows with triangular pediments, small attic windows */
function wing(K, M, len, scale) {
  const P = K.P, trim = M.libTrim, KM = K.mats;
  const n = Math.max(1, Math.round(len / 4.4)), p = len / n;
  K.wallQuad(M.libRust, 0, len, H.PL, H.G, 1.8);
  K.wallQuad(M.lib, 0, len, H.BELT, H.COR, 4);
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * p;
    K.window({ x, y: 1.35, w: 1.3 * scale, h: 2.4, head: 'flat', sw: 0.14, d: 0.06, frame: 'white', surMat: trim, sillMat: trim });
    K.glass(KM.winWhite, x, 4.0, 3.0 * scale, 1.5 * scale, 'arch', (k + 1) % 4, 0.05);
    const s = new THREE.Shape(); archPath(s, x, 4.0, 3.5 * scale, 0.05, false); const ho = new THREE.Path(); archPath(ho, x, 4.0, 3.0 * scale, 0.05, true); s.holes.push(ho); P.face(trim, s, 0.04, 1, 8);
    K.window({ x, y: 7.6, w: 1.4 * scale, h: 3.9, head: 'flat', sw: 0.2, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, hood: 'tri', hoodH: 0.55, hoodOver: 0.3 });
    K.window({ x, y: 14.7, w: 1.0 * scale, h: 1.5, head: 'flat', sw: 0.12, d: 0.06, frame: 'white', surMat: trim, sillMat: trim, sill: false });
  }
}

/** the six free Ionic columns of the corner (edge frame of the 18 m chord), balcony, three arched windows (clock in the middle), curved-looking cornice and the lettered attic */
function cornerColonnade(K, M, len, ctx, e) {
  const P = K.P, trim = M.libTrim, KM = K.mats;
  K.wallQuad(M.libRust, 0, len, H.PL, H.G, 1.8);
  K.wallQuad(M.lib, 0, len, H.BELT, H.COR + 1.0, 4);
  // ground storey: three lunettes over barred windows
  const bx = [len * 0.2, len * 0.5, len * 0.8];
  for (const x of bx) {
    K.window({ x, y: 1.35, w: 1.5, h: 2.5, head: 'flat', sw: 0.16, d: 0.06, frame: 'white', surMat: trim, sillMat: trim });
    K.glass(KM.winWhite, x, 4.0, 3.3, 1.65, 'arch', 2, 0.05);
    const s = new THREE.Shape(); archPath(s, x, 4.0, 3.9, 0.05, false); const ho = new THREE.Path(); archPath(ho, x, 4.0, 3.3, 0.05, true); s.holes.push(ho); P.face(trim, s, 0.04, 1, 8);
  }
  // first floor: three tall arched windows in aedicules (the middle one with the clock dial)
  for (const [i, x] of bx.entries()) {
    K.window({ x, y: 7.4, w: 2.2, h: 5.4, head: 'arch', sw: 0.28, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    for (const sx of [-1.7, 1.7]) P.cyl(trim, [x + sx, 7.2, 0.3], [x + sx, 12.2, 0.3], 0.16, 0.14, 8, false);
    P.box(trim, x - 2.1, x + 2.1, 12.8, 13.2, 0, 0.5, 'kb');
    if (i === 1) { const cl = K.ctx.mat.toon('#f0eee6', { name: 'lmE-clock' }); P.cyl(cl, [x, 11.6, 0.2], [x, 11.6, 0.28], 0.85, 0.85, 20, true); P.cyl(M.black, [x, 11.6, 0.29], [x + 0.0, 12.35, 0.29], 0.04, 0.04, 4, false); P.cyl(M.black, [x, 11.6, 0.29], [x + 0.5, 11.35, 0.29], 0.04, 0.04, 4, false); }
  }
  // balcony slab with the balustrade in front, 1.6 m out
  P.box(trim, -0.3, len + 0.3, H.G, H.BELT, 0, 2.2, 'b');
  P.quad(M.balust, [-0.3, H.BELT, 2.1], [len + 0.3, H.BELT, 2.1], [len + 0.3, H.BELT + 0.95, 2.1], [-0.3, H.BELT + 0.95, 2.1], [0, 0, 1], [[0, 0], [(len + 0.6) / 1.1, 0], [(len + 0.6) / 1.1, 1], [0, 1]]);
  P.box(trim, -0.3, len + 0.3, H.BELT + 0.9, H.BELT + 1.05, 1.95, 2.25, 'b');
  // six free Ionic columns (shaft 0.8 m, 7.6 m) at pitch len / 5
  const step = (len - 2.4) / 5;
  for (let i = 0; i < 6; i++) { const x = 1.2 + i * step; ionic(K, trim, M.libTrim, x, 1.7, H.BELT, H.BELT + 8.4, 0.42); const [wx, wz] = worldAt(K, x, 1.7); ctx.physics.addCylinder(wx, wz, 0.45, 0, 15); }
  // entablature (stepped forward over the columns) + attic with the lettering and relief panels
  P.box(trim, -0.5, len + 0.5, H.BELT + 8.4, H.BELT + 9.3, 0, 2.5, 'b');
  P.box(M.lib, -0.4, len + 0.4, H.BELT + 9.3, H.BELT + 10.3, 0, 2.3, 'b');
  P.box(trim, -0.7, len + 0.7, H.BELT + 10.3, H.BELT + 11.1, 0, 2.7, 'b');
  P.box(M.lib, -0.2, len + 0.2, H.BELT + 11.1, H.BELT + 14.0, 0.3, 2.2, 'b');
  K.fascia(1.2, len - 4.2, H.BELT + 12.0, H.BELT + 13.3, 'РОССИЙСКАЯ НАЦИОНАЛЬНАЯ БИБЛИОТЕКА', { w: 1024, h: 128, fg: '#3c3f46', transparent: true, z: 2.45, font: K.ctx.tex.FONTS.serif, weight: 500, size: 0.5 });
  K.plane(K.R.frieze, len - 3.7, len - 0.4, H.BELT + 11.6, H.BELT + 13.5, 2.45);
  P.box(trim, -0.5, len + 0.5, H.BELT + 14.0, H.BELT + 14.4, 0.2, 2.5, 'b');
}
function worldAt(K, x, z) { const m = K.P.m.elements; return [m[0] * x + m[8] * z + m[12], m[2] * x + m[10] * z + m[14]]; }

/** the Rossi wing on the square: an edge of 124 m (v 20 -> 144); the colonnade of 18 free Ionic columns spans local x 32..124 (v 52..144 of the OSM data) */
function rossiWing(K, M, e, len, ctx) {
  const P = K.P, trim = M.libTrim, KM = K.mats;
  const n = Math.max(1, Math.round(len / 4.6)), p = len / n, c0 = 30, c1 = Math.min(len, 122);
  K.wallQuad(M.libRust, 0, len, H.PL, H.G, 1.8);
  K.wallQuad(M.lib, 0, len, H.BELT, H.COR, 4);
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * p;
    K.window({ x, y: 1.35, w: 1.3, h: 2.4, head: 'flat', sw: 0.14, d: 0.06, frame: 'white', surMat: trim, sillMat: trim });
    K.glass(KM.winWhite, x, 4.0, 3.0, 1.5, 'arch', (k + 1) % 4, 0.05);
    const inCol = x > c0 && x < c1;
    if (!inCol) K.window({ x, y: 7.6, w: 1.4, h: 3.9, head: 'flat', sw: 0.2, d: 0.1, frame: 'white', surMat: trim, sillMat: trim, hood: 'tri', hoodH: 0.55, hoodOver: 0.3 });
    else K.window({ x, y: 7.6, w: 1.6, h: 4.8, head: 'arch', sw: 0.25, d: 0.08, frame: 'white', surMat: trim, sillMat: trim, sill: false });
    K.window({ x, y: 14.7, w: 1.0, h: 1.5, head: 'flat', sw: 0.12, d: 0.06, frame: 'white', surMat: trim, sillMat: trim, sill: false });
  }
  // the colonnade: stylobate, 18 columns, entablature, statues between the columns, Minerva on the attic
  const nc = 18, step = (c1 - c0) / (nc - 1);
  P.box(trim, c0 - 0.8, c1 + 0.8, H.G, H.BELT, 0, 2.3, 'b');
  P.quad(M.balust, [c0 - 0.8, H.BELT, 2.2], [c1 + 0.8, H.BELT, 2.2], [c1 + 0.8, H.BELT + 0.8, 2.2], [c0 - 0.8, H.BELT + 0.8, 2.2], [0, 0, 1], [[0, 0], [(c1 - c0 + 1.6) / 1.1, 0], [(c1 - c0 + 1.6) / 1.1, 1], [0, 1]]);
  for (let i = 0; i < nc; i++) { const x = c0 + i * step; ionic(K, trim, M.libTrim, x, 1.8, H.BELT, H.BELT + 8.6, 0.42); const [wx, wz] = worldAt(K, x, 1.8); ctx.physics.addCylinder(wx, wz, 0.45, 0, 15); }
  P.box(trim, c0 - 1.0, c1 + 1.0, H.BELT + 8.6, H.BELT + 9.5, -0.1, 2.5, 'b');
  P.box(M.lib, c0 - 0.9, c1 + 0.9, H.BELT + 9.5, H.BELT + 10.4, -0.1, 2.3, 'b');
  P.box(trim, c0 - 1.2, c1 + 1.2, H.BELT + 10.4, H.BELT + 11.2, -0.1, 2.7, 'b');
  for (let i = 0; i < 10; i++) { const x = c0 + step * (1 + i * 1.7) ; if (x > c1 - step * 0.6) continue; P.box(M.whiteShade, x - 0.5, x + 0.5, H.BELT, H.BELT + 0.9, 0.7, 1.5, 'b'); figure(P, M.white, x, H.BELT + 0.9, 1.1, 0, 0.82, i % 4); }
  P.box(trim, c0 + 6, c1 - 6, H.BELT + 11.2, H.BELT + 12.6, 0.4, 1.9, 'b');                          // the single attic
  figure(P, M.white, (c0 + c1) / 2, H.BELT + 12.6, 1.1, 0, 1.0, 1);                                   // Minerva
}
