// landmarksK/houses.js - the stucco buildings of the Russian Museum group, drawn with the facade vocabulary kit (common.js / house.js, copied from landmarksJ):
//   * the Mikhailovsky Palace (Rossi 1819-25; OSM r1502547): buttery-yellow body on a pink granite plinth, rusticated ground floor with an arcade, the 8-column Corinthian portico of the south front on the arcade
//     (floor 7.5 m, columns to 16.9, entablature 19, pediment apex ~24), the two end risalits with half columns, the garden front with the 12-column loggia, a roof lantern.  Frame P (frame.js): u east, v south.
//   * the Rossi wing r54363 (W side of the forecourt, an Ionic colonnade of 16 columns), the Benois wing r2614477 (the canal front: an Ionic colonnade of 14 columns, a corner pavilion with a deep porch, a glass
//     skylight roof), the Ethnographic Museum wing w235984453 (pale yellow with white pilasters) and the School of Folk Art r15746147 (salmon plaster, silver mansard).
// Dossier docs/research/saviour-mikhailovsky.md 9.1 - 9.3, photos refs/saviour 099 101 102 107 126 129 130 131 132 142 043 044.  Colour palette kept to the lit photographic values.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { ringEdges, onEdge } from './kit.js';
import { PF } from './frame.js';
import { ringFromFlat } from '../lib/massing.js';
import { portico as porticoK } from './parts.js';

const edgeInfo = (e) => {
  const mx = (e.a[0] + e.b[0]) / 2, mz = (e.a[1] + e.b[1]) / 2, q = PF.M(mx, mz), n0 = PF.M(mx + e.n[0], mz + e.n[1]);
  return { u: q.mx, v: q.mz, nu: n0.mx - q.mx, nv: n0.mz - q.mz };
};
function insetRing(edges, d) {
  const n = edges.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = edges[(i + n - 1) % n], e = edges[i], dot = p.n[0] * e.n[0] + p.n[1] * e.n[1], k = d / (1 + dot);
    const q = [e.a[0] - (p.n[0] + e.n[0]) * k, e.a[1] - (p.n[1] + e.n[1]) * k], lim = 2.5 * d, l = Math.hypot(q[0] - e.a[0], q[1] - e.a[1]);
    out.push(l > lim ? [e.a[0] + (q[0] - e.a[0]) * lim / l, e.a[1] + (q[1] - e.a[1]) * lim / l] : q);
  }
  return out;
}
const ringsOf = (edges) => { const groups = []; let cur = []; for (let i = 0; i < edges.length; i++) { cur.push(edges[i]); if (i + 1 === edges.length || edges[i + 1].i <= edges[i].i) { groups.push(cur); cur = []; } } return groups; };
/** a mansard / hip roof: sloped quads from the wall line y0 to the inset line y1 + a flat cap */
function slopedRoof(K, poly, y0, y1, inset, mats) {
  const P = K.P, edges = ringEdges(poly, 0.05), groups = ringsOf(edges), ins = groups.map((g) => insetRing(g, inset));
  groups.forEach((g, gi) => {
    const r = ins[gi], n = g.length;
    for (let i = 0; i < n; i++) {
      const e = g[i], j = (i + 1) % n; if (e.len < 0.2) continue;
      P.quad(mats.slope, [e.a[0], y0, e.a[1]], [e.b[0], y0, e.b[1]], [r[j][0], y1, r[j][1]], [r[i][0], y1, r[i][1]], [e.n[0] * (y1 - y0), inset, e.n[1] * (y1 - y0)], [[0, 0], [e.len / 2, 0], [e.len / 2, (y1 - y0) / 2], [0, (y1 - y0) / 2]]);
    }
  });
  P.cap(mats.top, ins[0], y1, true, 4, ins.slice(1));
  return { ins };
}

const WALL = '#eed28c', GRAN = '#8f7270', TRIM_HEX = '#f4f0e6';

// ================================================================================================ palace
const PY = { PL: 1.6, G: 7.5, ENT: 19.0 };
function groundArcade(K, len, xs, o = {}) {
  const P = K.P, GM = K.mats, trim = o.trim;
  for (const x of xs) {
    K.glass(GM.winBrown, x, 1.9, 1.9, 5.3, 'arch', (Math.floor(x * 3) & 3), 0.28);
    K.surround(trim, x, 1.9, 1.9, 5.3, 'arch', 0.26, 0.34);
    P.box(trim, x - 0.13, x + 0.13, 6.7, 7.05, 0.05, 0.4, 'kb');                              // keystone
  }
  void len;
}
function palace(K, mats) {
  const P = K.P, rec = L.buildingById('r1502547'); if (!rec) throw new Error('palace record r1502547 missing');
  const wall = K.wall(WALL), trim = K.mat(TRIM_HEX, { name: 'lmK-pTrim' }), shade = K.mat('#d9d0bc', { name: 'lmK-pShade' }), gran = K.rust(GRAN), rust = K.rust('#e8cc82');
  const Y = PY;
  const front = (e, c) => {
    if (e.hole) return false;
    const I = edgeInfo(e); if (Math.abs(I.nv) < 0.9) return false;
    const len = c.len;
    if (I.nv > 0) {
      const zone = I.u < -36 ? 'ri' : I.u < -14.6 ? 'rec' : I.u < 15.6 ? 'portico' : I.u < 37.4 ? 'rec' : 'ri';
      if (zone === 'portico') { southPortico(K, len, { wall, trim, shade, gran, rust }); return true; }
      K.wallQuad(rust, 0, len, Y.PL, Y.G, 3);
      K.wallQuad(wall, 0, len, Y.G, Y.ENT + 0.45, 3);
      const pitch = zone === 'ri' ? 4.0 : 4.8, xs = K.bays(0.4, len - 0.4, pitch);
      for (const x of xs) {
        K.window({ x, y: 2.4, w: 1.5, h: 3.4, sw: 0.14, d: 0.3, frame: 'white', surMat: trim, hood: 'seg', hoodH: 0.4, sill: false });
        K.window({ x, y: Y.G + 1.3, w: 1.4, h: 5.2, head: 'arch', sw: 0.16, d: 0.12, frame: 'white', surMat: trim, sill: false });
        K.balustrade(x - 0.95, x + 0.95, Y.G + 0.5, 0.95, 0.3, trim);
        K.window({ x, y: Y.G + 7.6, w: 0.9, h: 1.0, sw: 0.08, d: 0.06, frame: 'white', surMat: trim, sill: false });
      }
      P.box(trim, 0, len, Y.G - 0.25, Y.G + 0.25, 0, 0.36, 'b');
      if (zone === 'ri') {                                                                     // half columns between the bays + a frieze under the cornice
        const bnd = []; for (let i = 0; i <= xs.length; i++) bnd.push(i === 0 ? 0.55 : i === xs.length ? len - 0.55 : (xs[i - 1] + xs[i]) / 2);
        for (const bx of bnd) K.column(trim, bx, 0.45, Y.G + 0.25, Y.ENT - 1.5, 0.48, { seg: 12 });
        P.box(shade, 0, len, Y.ENT - 1.5, Y.ENT - 0.5, 0, 0.5, 'b');
      }
      return true;
    }
    // north (garden) front
    if (I.v < -118) { northLoggia(K, len, { wall, trim, shade, gran, rust }); return true; }
    return false;
  };
  buildHouse(K, {
    name: 'palace', recs: [rec], hc: Y.ENT, wall: WALL, court: WALL, plinth: Y.PL, plinthMat: gran, floors: [7.5, 6.5, 4.5], courtPitch: 4.6,
    corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.7 }, collideH: 24,
  });
  // flat grey-green roof behind the attic balustrade + the roof lantern
  const poly = rec.polys[0];
  const roofMat = K.mat('#7a8478', { name: 'lmK-pRoof', paint: 0.04 });
  P.cap(roofMat, ringFromFlat(poly.o), Y.ENT + 0.5, true, 4, poly.h.map(ringFromFlat));
  P.push(PF.O.x, 0, PF.O.z, PF.rot);
  const lant = K.mat('#aeb3b0', { name: 'lmK-pLantern' });
  P.box(trim, -4.5, 4.5, Y.ENT + 0.5, Y.ENT + 4.0, -92.5, -83.5, 'b'); P.box(lant, -5.0, 5.0, Y.ENT + 4.0, Y.ENT + 4.5, -93.0, -83.0, 'b');
  P.fan(lant, [[-5, Y.ENT + 4.5, -93], [5, Y.ENT + 4.5, -93], [2, Y.ENT + 7.8, -90.5], [-2, Y.ENT + 7.8, -90.5]], [0, 0.6, -1]);
  P.fan(lant, [[5, Y.ENT + 4.5, -83], [-5, Y.ENT + 4.5, -83], [-2, Y.ENT + 7.8, -85.5], [2, Y.ENT + 7.8, -85.5]], [0, 0.6, 1]);
  P.fan(lant, [[-5, Y.ENT + 4.5, -83], [-5, Y.ENT + 4.5, -93], [-2, Y.ENT + 7.8, -90.5], [-2, Y.ENT + 7.8, -85.5]], [-0.6, 0.6, 0]);
  P.fan(lant, [[5, Y.ENT + 4.5, -93], [5, Y.ENT + 4.5, -83], [2, Y.ENT + 7.8, -85.5], [2, Y.ENT + 7.8, -90.5]], [0.6, 0.6, 0]);
  for (const x of [-3.2, -1.1, 1.1, 3.2]) { K.P.box(K.mats.glassDark, x - 0.45, x + 0.45, Y.ENT + 1.2, Y.ENT + 3.3, -83.0, -82.97, 'kb'); }
  P.pop();
  K.svc.houses.push({ id: 'r1502547', name: 'Михайловский дворец', x: -1061, z: -697 });
  K.svc.monuments.push({ id: 'r1502547', name: 'Михайловский дворец (Русский музей)', x: -1061, z: -697, h: 24 });
}

/** the south portico (frame: the arcade front line at z = 0, len ~30 m): arcade, floor, eight Corinthian columns, entablature, pediment, the recessed loggia wall 6.7 m behind */
function southPortico(K, len, S) {
  const P = K.P, GM = K.mats, Y = PY, { wall, trim, shade, gran, rust } = S;
  K.wallQuad(rust, 0, len, Y.PL, Y.G, 3);
  const xs9 = K.bays(0.4, len - 0.4, len / 9);
  groundArcade(K, len, xs9, { trim });
  P.box(trim, 0, len, Y.G - 0.3, Y.G, -6.7, 0.35, 'b');
  // the central flight of 6 steps (0.15 m): walk boxes are added in palace.js
  const pdist = 6.7;
  P.push(0, 0, -pdist, 0);
  K.wallQuad(wall, 0, len, Y.G, Y.ENT + 0.45, 3);
  const xw = K.bays(1.0, len - 1.0, 5.0);
  for (const x of xw) {
    K.window({ x, y: Y.G + 1.2, w: 1.5, h: 5.6, head: 'arch', sw: 0.18, d: 0.12, frame: 'white', surMat: trim, sill: false });
    K.balustrade(x - 1.0, x + 1.0, Y.G + 0.4, 0.95, 0.3, trim);
  }
  const cols = Array.from({ length: 8 }, (_, i) => 1.0 + i * (len - 2.0) / 7);
  porticoK(K, { x0: 0.3, x1: len - 0.3, depth: pdist - 1.2, y0: Y.G, y1: Y.ENT - 2.0, r: 0.62, xs: cols, ent: 2.0, ped: 4.6, mat: trim, matShade: shade, wallMat: wall, steps: false });
  P.pop();
}

/** the garden-front loggia of 12 columns (frame: the front line at z = 0, len ~49 m, depth 7.9 m), arcade below */
function northLoggia(K, len, S) {
  const P = K.P, Y = PY, { wall, trim, shade, rust } = S, depth = 7.9;
  K.wallQuad(rust, 0, len, Y.PL, Y.G, 3);
  groundArcade(K, len, K.bays(0.4, len - 0.4, 4.45), { trim });
  P.box(trim, 0, len, Y.G - 0.3, Y.G, -depth, 0.35, 'b');
  P.push(0, 0, -depth, 0);
  K.wallQuad(wall, 0, len, Y.G, Y.ENT + 0.45, 3);
  for (const x of K.bays(1.0, len - 1.0, 4.45)) K.window({ x, y: Y.G + 1.2, w: 1.5, h: 5.4, head: 'arch', sw: 0.18, d: 0.12, frame: 'white', surMat: trim, sill: false });
  const n = 12, cols = Array.from({ length: n }, (_, i) => 1.2 + i * (len - 2.4) / (n - 1));
  for (const x of cols) K.column(trim, x, depth - 1.1, Y.G, Y.ENT - 2.0, 0.55, { seg: 14 });
  P.box(shade, 0.4, len - 0.4, Y.ENT - 2.0, Y.ENT - 1.0, 0, depth - 0.3, 'b'); P.box(trim, 0.2, len - 0.2, Y.ENT - 1.0, Y.ENT, 0, depth + 0.1, 'b');
  K.balustrade(0.5, len - 0.5, Y.ENT + 0.4, 1.0, depth - 1.0, trim);
  P.pop();
}

// ================================================================================================ colonnade wings
/** facade of a long wing with a free colonnade in front (frame: wall at z = 0): ground floor rusticated with arched windows, an Ionic colonnade in front of the first floor, entablature, attic balustrade */
function colonnadeFront(K, len, o) {
  const P = K.P, GM = K.mats, { wall, trim, shade, rust } = o, G = o.G, HC = o.hc;
  K.wallQuad(rust, 0, len, o.PL, G, 3);
  K.wallQuad(wall, 0, len, G, HC + 0.45, 3);
  const xs = K.bays(0.5, len - 0.5, o.pitch);
  for (const x of xs) {
    K.window({ x, y: 1.5, w: 1.5, h: G - 2.6, head: 'arch', sw: 0.14, d: 0.3, frame: 'white', surMat: trim, sill: false });
    K.window({ x, y: G + 0.9, w: 1.5, h: HC - G - 2.9, head: 'arch', sw: 0.16, d: 0.1, frame: 'white', surMat: trim, sill: false });
  }
  const dz = o.deck ?? 2.2;
  P.box(trim, 0, len, G - 0.35, G, 0, dz + 0.2, 'b');                                         // the deck / ground floor cornice
  const n = o.cols, x0 = o.x0 ?? 1.0, x1 = o.x1 ?? len - 1.0;
  const colH = HC - 1.6;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (x1 - x0) / (n - 1);
    K.column(trim, x, dz - 0.5, G, colH, 0.42, { seg: 12, volutes: !o.ionic });
  }
  P.box(shade, x0 - 0.5, x1 + 0.5, colH, colH + 0.55, 0, dz, 'b'); P.box(trim, x0 - 0.5, x1 + 0.5, colH + 0.55, HC, 0, dz + 0.1, 'b');
  K.balustrade(x0 - 0.5, x1 + 0.5, G + 0.0, 0.95, dz + 0.1, trim);
  K.balustrade(0.2, len - 0.2, HC + 0.4, 0.9, 0.5, trim);
}

function rossiWing(K, mats) {
  const rec = L.buildingById('r54363'); if (!rec) throw new Error('Rossi wing record r54363 missing');
  const wall = K.wall(WALL), trim = K.mat(TRIM_HEX, { name: 'lmK-pTrim' }), shade = K.mat('#d9d0bc', { name: 'lmK-pShade' }), gran = K.rust(GRAN), rust = K.rust('#e8cc82');
  const HC = 13.5, G = 5.2;
  const front = (e, c) => {
    if (e.hole) return false;
    const I = edgeInfo(e);
    if (I.nu > 0.9 && I.u > -57 && I.u < -54 && e.len > 20) { colonnadeFront(K, c.len, { wall, trim, shade, rust, G, hc: HC, PL: 1.4, pitch: 3.7, cols: 16, ionic: true, deck: 2.0 }); return true; }
    if (I.nv > 0.9 && e.len > 25) { colonnadeFront(K, c.len, { wall, trim, shade, rust, G, hc: HC, PL: 1.4, pitch: 4.2, cols: Math.max(4, Math.round(c.len / 4.2)), ionic: true, deck: 1.6, x0: 3, x1: c.len - 3 }); return true; }
    return false;
  };
  buildHouse(K, { name: 'rossiWing', recs: [rec], hc: HC, wall: WALL, court: WALL, plinth: 1.4, plinthMat: gran, floors: [5.2, 5.0, 3.0], courtPitch: 4.2, corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.8 }, collideH: 16 });
  const poly = rec.polys[0];
  K.P.cap(K.mat('#7a8478', { name: 'lmK-pRoof', paint: 0.04 }), ringFromFlat(poly.o), HC + 0.5, true, 4, poly.h.map(ringFromFlat));
  K.svc.houses.push({ id: 'r54363', name: 'Флигель Росси', x: -1153, z: -670 });
}

function benoisWing(K, mats) {
  const rec = L.buildingById('r2614477'); if (!rec) throw new Error('Benois wing record r2614477 missing');
  const wall = K.wall('#f0dc9c'), trim = K.mat(TRIM_HEX, { name: 'lmK-pTrim' }), shade = K.mat('#d9d0bc', { name: 'lmK-pShade' }), gran = K.rust('#8f7270'), rust = K.rust('#ead690');
  const HC = 14.5, G = 5.4;
  const front = (e, c) => {
    if (e.hole) return false;
    const I = edgeInfo(e);
    if (I.nu < -0.9 && I.u < -200 && e.len > 30) {                                            // the canal front (W edge): 14-column Ionic colonnade + the S pavilion with a deep porch
      colonnadeFront(K, c.len, { wall, trim, shade, rust, G, hc: HC, PL: 1.5, pitch: 4.3, cols: 14, ionic: true, deck: 2.2, x0: 1.2, x1: c.len - 14.0 });
      return true;
    }
    return false;
  };
  buildHouse(K, { name: 'benois', recs: [rec], hc: HC, wall: '#f0dc9c', court: '#f0dc9c', plinth: 1.5, plinthMat: gran, floors: [5.4, 5.2, 3.5], courtPitch: 4.3, corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.8 }, collideH: 17 });
  // dark zinc roof with a big glass skylight pyramid ridge
  const poly = rec.polys[0], zinc = K.mat('#4a4f56', { name: 'lmK-zincD', paint: 0.03 }), glass = K.mat('#a8cfd2', { name: 'lmK-skyGlass', transparent: true, opacity: 0.6, depthWrite: false, side: 'double' });
  K.P.cap(zinc, ringFromFlat(poly.o), HC + 0.5, true, 4, poly.h.map(ringFromFlat));
  K.P.push(PF.O.x, 0, PF.O.z, PF.rot);
  for (const [u0, u1, v0, v1] of [[-200, -150, -70, -5]]) {
    const y0 = HC + 0.5, y1 = HC + 3.2;
    K.P.fan(glass, [[u0, y0, v0], [u1, y0, v0], [u1 - 8, y1, v0 + 6], [u0 + 8, y1, v0 + 6]], [0, 0.7, -1]);
    K.P.fan(glass, [[u1, y0, v1], [u0, y0, v1], [u0 + 8, y1, v1 - 6], [u1 - 8, y1, v1 - 6]], [0, 0.7, 1]);
    K.P.fan(glass, [[u0 + 8, y1, v0 + 6], [u1 - 8, y1, v0 + 6], [u1 - 8, y1, v1 - 6], [u0 + 8, y1, v1 - 6]], [0, 1, 0]);
  }
  K.P.pop();
  K.svc.houses.push({ id: 'r2614477', name: 'Корпус Бенуа', x: -1248, z: -696 });
}

function ethnographic(K, mats) {
  const rec = L.buildingById('w235984453'); if (!rec) return;
  const wall = K.wall('#efd9a0'), trim = K.mat(TRIM_HEX, { name: 'lmK-pTrim' }), gran = K.rust('#8f7270');
  const HC = 17.5;
  const front = (e, c) => {
    if (e.hole || e.len < 8) return false;
    const len = c.len, xs = K.bays(0.8, len - 0.8, 4.4);
    K.wallQuad(K.rust('#e8d498'), 0, len, 1.5, 5.4, 3); K.wallQuad(wall, 0, len, 5.4, HC + 0.45, 3);
    for (const x of xs) {
      K.window({ x, y: 1.8, w: 1.4, h: 2.8, sw: 0.12, d: 0.2, frame: 'white', surMat: trim, sill: false });
      K.window({ x, y: 6.5, w: 1.5, h: 3.6, sw: 0.14, d: 0.1, frame: 'white', surMat: trim, hood: 'tri', hoodH: 0.4 });
      K.window({ x, y: 12.3, w: 1.3, h: 2.6, sw: 0.12, d: 0.08, frame: 'white', surMat: trim });
    }
    const bnd = []; for (let i = 0; i <= xs.length; i++) bnd.push(i === 0 ? 0.4 : i === xs.length ? len - 0.4 : (xs[i - 1] + xs[i]) / 2);
    for (const bx of bnd) K.pilaster(trim, bx, 0.7, 5.4, HC - 0.8, 0.2, 0.4);
    return true;
  };
  buildHouse(K, { name: 'ethno', recs: [rec], hc: HC, wall: '#efd9a0', court: '#efd9a0', plinth: 1.5, plinthMat: gran, floors: [5.4, 5.2, 3.5], courtPitch: 4.4, corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.8 }, collideH: 19 });
  const poly = rec.polys[0];
  K.P.cap(K.mat('#9aa09c', { name: 'lmK-ethRoof', paint: 0.04 }), ringFromFlat(poly.o), HC + 0.5, true, 4, poly.h.map(ringFromFlat));
  K.svc.houses.push({ id: 'w235984453', name: 'Российский этнографический музей', x: -947, z: -611 });
}

// ================================================================================================ School of Folk Art (the servants' house of the church)
function servants(K, mats) {
  const rec = L.buildingById('r15746147'); if (!rec) return;
  const wallHex = '#e89070', wall = K.wall(wallHex), trim = K.mat('#efe8dc', { name: 'lmK-sTrim' }), gran = K.rust('#9a8a82');
  const HC = 15.2;
  const front = (e, c) => {
    if (e.hole || e.len < 6) return false;
    const len = c.len, xs = K.bays(0.9, len - 0.9, 3.6);
    K.wallQuad(wall, 0, len, 1.0, HC + 0.45, 3);
    for (const x of xs) for (let f = 0; f < 4; f++) K.window({ x, y: 1.4 + f * 3.55, w: 1.1, h: 2.2, sw: 0.1, d: 0.08, frame: 'white', surMat: trim, sill: f === 0, hood: f === 1 ? 'tri' : null, hoodH: 0.4 });
    const bnd = []; for (let i = 0; i <= xs.length; i++) bnd.push(i === 0 ? 0.4 : i === xs.length ? len - 0.4 : (xs[i - 1] + xs[i]) / 2);
    for (const bx of bnd) K.pilaster(trim, bx, 0.6, 1.0, HC - 0.6, 0.14, 0.3);
    return true;
  };
  buildHouse(K, { name: 'servants', recs: [rec], hc: HC, wall: wallHex, court: wallHex, plinth: 1.0, plinthMat: gran, floors: [4.0, 3.6, 3.4, 3.2], courtPitch: 3.6, corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.6 }, collideH: 20 });
  slopedRoof(K, rec.polys[0], HC + 0.45, HC + 3.8, 2.6, { slope: K.mat('#a4aaac', { name: 'lmK-mansard', paint: 0.03 }), top: K.mat('#aeb4b6', { name: 'lmK-mansardTop' }) });
}

export function build(K, ctx) {
  const mats = {};
  for (const [name, fn] of [['palace', palace], ['rossiWing', rossiWing], ['benois', benoisWing], ['ethno', ethnographic], ['servants', servants]]) {
    try { fn(K, mats); } catch (e) { console.error(`[landmarksK] houses/${name}:`, e); throw e; }
  }
  void THREE; void ctx; void onEdge;
}
