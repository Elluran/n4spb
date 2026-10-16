// landmarksJ/houses.js - the buildings of St Isaac's Square: the Mariinsky Palace (Stackenschneider 1844; OSM r2001070), the Astoria hotel (Lidval 1912; r3107676 + r6554800), the Angleterre hotel
// (w49861780) and the Lobanov-Rostovsky house, the "House with Lions" (Montferrand 1820; r3077276).  Footprints from OSM (the plan wins), heights / colours / ornament from the dossier
// docs/research/admiralty-stisaac.md 8.3 / 8.5 / 8.6 (CRITIC corrected: Astoria warm brown-ochre, Angleterre terracotta with cream pilasters) and photos refs/admiralty 109 113 117 120 125 126 127 128.
// Drawn through the stucco vocabulary of common.js (K.window, K.balustrade ...) and the footprint scaffolding of house.js (walls, party walls, plinth, cornice, colliders).  No flags / flagpoles.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { ringEdges, onEdge, band } from './kit.js';
import { portico } from './parts.js';
import { ringFromFlat } from '../lib/massing.js';

const DEG = Math.PI / 180;

/** inset (d > 0) a ring of ringEdges edges: new vertex per edge start, offset by the bisector; returns [[x, z]..] in edge order */
function insetRing(edges, d) {
  const n = edges.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = edges[(i + n - 1) % n], e = edges[i], dot = p.n[0] * e.n[0] + p.n[1] * e.n[1], k = d / (1 + dot);
    const q = [e.a[0] - (p.n[0] + e.n[0]) * k, e.a[1] - (p.n[1] + e.n[1]) * k];
    const lim = 2.5 * d, l = Math.hypot(q[0] - e.a[0], q[1] - e.a[1]);
    out.push(l > lim ? [e.a[0] + (q[0] - e.a[0]) * lim / l, e.a[1] + (q[1] - e.a[1]) * lim / l] : q);
  }
  return out;
}
/** group the edges of buildHouse's result by ring */
function ringsOf(edges) {
  const groups = []; let cur = [];
  for (let i = 0; i < edges.length; i++) { cur.push(edges[i]); if (i + 1 === edges.length || edges[i + 1].i <= edges[i].i) { groups.push(cur); cur = []; } }
  return groups;
}

/** mansard / hip roof of a footprint: sloped quads from the wall line (y0) to the inset line (y1), a flat cap (y1) and a parapet-free edge.  rec = record, one poly. */
function slopedRoof(K, poly, y0, y1, inset, mats, o = {}) {
  const P = K.P, edges = ringEdges(poly, 0.05), groups = ringsOf(edges), outer = groups[0];
  const ins = groups.map((g) => insetRing(g, inset));
  groups.forEach((g, gi) => {
    const r = ins[gi], n = g.length;
    for (let i = 0; i < n; i++) {
      const e = g[i], j = (i + 1) % n; if (e.len < 0.2) continue;
      const a = [e.a[0], y0, e.a[1]], b = [e.b[0], y0, e.b[1]], c = [r[j][0], y1, r[j][1]], dd = [r[i][0], y1, r[i][1]];
      const nrm = [e.n[0] * (y1 - y0), inset, e.n[1] * (y1 - y0)];
      P.quad(mats.slope, a, b, c, dd, nrm, [[0, 0], [e.len / 2, 0], [e.len / 2, (y1 - y0) / 2], [0, (y1 - y0) / 2]]);
    }
  });
  P.cap(mats.top, ins[0], y1, true, 4, ins.slice(1));
  void outer;
  return { ins };
}

export function build(K, ctx) {
  const mats = {};
  mats.zinc = K.mat('#aeb4b6', { name: 'lmJ-zinc' }); mats.zincTop = K.mat('#b7bcbd', { name: 'lmJ-zincTop' }); mats.greenRoof = K.mat('#5e8f72', { name: 'lmJ-greenRoof', paint: 0.04 });
  mats.glassPyr = K.mat('#b7d6d2', { transparent: true, opacity: 0.55, depthWrite: false, name: 'lmJ-glassPyr', side: 'double' });
  mariinsky(K, mats); astoria(K, mats); angleterre(K, mats); lobanov(K, mats);
  void ctx; void THREE; void L; void ringFromFlat; void onEdge; void band;
}

// ================================================================================================ Mariinsky Palace
// front frame: origin A = (-2375.8, 164.3), u along bearing 66 deg (0.9135, -0.4067), w out (NNW, -0.4067, -0.9135); OSM: left risalit u -18.1..0 (w 0), wing plane w = -6.8, central risalit u 24.5..44.5 (w +5.9),
// right wing plane, right risalit u 69.1..87.4 (w +0.9).  Heights: rusticated ground floor 6.8, floors 14.0 / 20.6, entablature 22.2, balustrade 23.4, attic of the central risalit 27.0.
const MA = { x: -2375.8, z: 164.3, ux: 0.9135, uz: -0.4067, nx: -0.4067, nz: -0.9135 };
const uvw = (x, z) => ({ u: (x - MA.x) * MA.ux + (z - MA.z) * MA.uz, w: (x - MA.x) * MA.nx + (z - MA.z) * MA.nz });
const mariZone = (u) => (u < -0.5 ? 'L' : u < 24.2 ? 'wingL' : u < 44.8 ? 'C' : u < 68.8 ? 'wingR' : 'R');
const MY = { PL: 6.8, F1: 14.0, F2: 20.6, ENT: 22.2, BAL: 23.4 };

function mariinsky(K, mats) {
  const P = K.P;
  const wallHex = '#c9bda5', trimHex = '#e0d8c6';
  const rec = L.buildingById('r2001070');
  if (!rec) throw new Error('Mariinsky record r2001070 missing');
  const trim = K.mat(trimHex, { name: 'lmJ-mTrim' }), trimShade = K.mat('#cfc6b2', { name: 'lmJ-mTrimS' }), wall = K.wall(wallHex), gran = K.rust('#9a8a82');
  const front = (e, c) => {
    if (e.hole) return false;
    const a = uvw(e.a[0], e.a[1]), b = uvw(e.b[0], e.b[1]), mu = (a.u + b.u) / 2, mw = (a.w + b.w) / 2;
    const facing = e.n[0] * MA.nx + e.n[1] * MA.nz;
    if (facing < 0.96 || mu < -19 || mu > 88.5 || mw < -8) return false;
    mariFront(K, e, c.len, mariZone(mu), { wall, trim, trimShade, gran, mats });
    return true;
  };
  const hh = buildHouse(K, {
    name: 'mariinsky', recs: [rec], polysOf: (r) => r.polys, hc: MY.ENT, wall: wallHex, court: wallHex, plinth: MY.PL, plinthMat: gran, floors: [7.2, 6.6], courtPitch: 4.6,
    corniceMat: trim, roof: 'none', railing: false, front, partyOpts: { tol: 0.6 }, collideH: 27,
    noBand: () => false,
  });
  // roof: green sheet iron flat at 23.1 behind the balustrade (hip roofs of the real palace are not visible from the street)
  const poly = rec.polys[0];
  const outer = ringFromFlat(poly.o), holes = poly.h.map(ringFromFlat);
  P.cap(mats.greenRoof, outer, MY.ENT + 1.0, true, 4, holes);
  // the glass pyramid over the round hall (behind the central risalit): square base 17 m, top 31 m
  const cu = 34.6, cw = -22.0, F = (u, w) => [MA.x + u * MA.ux + w * MA.nx, MA.z + u * MA.uz + w * MA.nz];
  const pc = F(cu, cw), h0 = MY.ENT + 1.0, pyH = 8.0, half = 9.0;
  const pt = (du, dw, y) => { const q = F(cu + du, cw + dw); return [q[0], y, q[1]]; };
  const top = pt(0, 0, h0 + pyH), c4 = [pt(-half, -half, h0), pt(half, -half, h0), pt(half, half, h0), pt(-half, half, h0)];
  for (let i = 0; i < 4; i++) { const a = c4[i], b = c4[(i + 1) % 4]; P.quad(mats.glassPyr, a, b, top, top, [0, 1, 0]); }
  for (let i = 0; i < 4; i++) { const a = c4[i], b = c4[(i + 1) % 4]; P.cyl(K.mats.ironSoft, a, top, 0.08, 0.05, 4, false); P.cyl(K.mats.ironSoft, a, b, 0.07, 0.07, 4, false); }
  void pc;
  // central stair: three granite steps across the arcade (walk boxes) + the forecourt lamps are the streets' business
  const ph = K.ctx.physics;
  for (let s = 0; s < 3; s++) {
    const w = 12.5 + s * 1.4, d = 0.7, c = F(34.5, 5.9 + 0.4 + s * 0.7 + 0.35);
    ph.addWalkBox(c[0], c[1], w, d, Math.atan2(-MA.uz, MA.ux), 0.14 * (3 - s), -1);
    P.push(c[0], 0, c[1], Math.atan2(-MA.uz, MA.ux));
    P.box(K.mats.graniteWarm, -w / 2, w / 2, 0, 0.14 * (3 - s), -d / 2, d / 2, '');
    P.pop();
  }
  K.svc.houses.push({ id: 'mariinsky', name: 'Мариинский дворец', x: -2339, z: 174 });
  K.svc.monuments.push({ id: 'r2001070', name: 'Мариинский дворец', x: -2339, z: 174, h: 26 });
  void hh;
}

/** one run of the Mariinsky front in the edge frame (x along the wall, z out) */
function mariFront(K, e, len, zone, S) {
  const P = K.P, { wall, trim, trimShade, gran } = S, GM = K.mats;
  const y0 = MY.PL, yTop = MY.ENT;
  const centre = zone === 'C', risalit = zone === 'L' || zone === 'R';
  const zw = centre ? -3.4 : 0;                                         // the wall of the upper floors: behind the free columns of the central loggia
  if (centre) {
    K.wallQuad(wall, 0, len, 0, y0, 3);                                 // (the rusticated band covers the ground floor)
    // the loggia: deck (the roof of the arcade) + balustrade + urns, free Corinthian columns, the recessed wall with arched windows
    P.box(trim, 0, len, y0 - 0.5, y0, zw, 0.0, 'b');
    K.wallQuad(wall, 0, len, y0, yTop, 3, zw);
    P.fan(wall, [[0, y0, 0], [0, y0, zw], [0, yTop, zw], [0, yTop, 0]], [1, 0, 0]);
    P.fan(wall, [[len, y0, 0], [len, y0, zw], [len, yTop, zw], [len, yTop, 0]], [-1, 0, 0]);
  } else K.wallQuad(wall, 0, len, y0, yTop, 3);
  // ground floor: faceted rustication plinth (drawn by the band); windows with segmental heads, the centre an arcade
  const pitch = centre ? 3.6 : zone === 'wingL' || zone === 'wingR' ? 4.9 : 6.1;
  const xs = centre ? Array.from({ length: 5 }, (_, i) => 1.0 + 3.6 * i + 1.8) : K.bays(0.0, len, pitch);
  const winW = centre ? 2.4 : 1.5;
  for (const x of xs) {
    if (centre) { K.glass(GM.winBrown, x, 0.0, winW, 5.4, 'arch', 1, 0.3); K.surround(trim, x, 0.0, winW, 5.4, 'arch', 0.24, 0.34); }
    else { K.glass(GM.winBrown, x, 1.2, winW, 3.2, 'flat', 1, 0.3); K.surround(trim, x, 1.2, winW, 3.2, 'flat', 0.14, 0.34); }
  }
  P.box(trim, 0, len, y0, y0 + 0.4, 0, 0.36, 'b');                        // belt course over the ground floor
  if (centre) {
    P.push(0, 0, zw, 0);
    for (const x of xs) {
      K.window({ x, y: y0 + 0.6, w: 1.8, h: 4.9, head: 'arch', sw: 0.2, d: 0.14, sill: false, frame: 'white', surMat: trim });
      K.window({ x, y: MY.F1 + 1.4, w: 1.35, h: 2.3, sw: 0.18, d: 0.1, frame: 'white', surMat: trim });
    }
    P.pop();
    // six free columns, a balustrade (with urns) along the front of the deck
    for (let i = 0; i < 6; i++) K.column(trim, 1.0 + 3.6 * i, -0.8, y0, yTop - 1.6, 0.52, { seg: 14 });
    K.balustrade(0.1, len - 0.1, y0, 1.0, 0.0 + 0.9, trim);
    for (let i = 0; i <= 5; i++) { const ux = 1.0 + 3.6 * i; P.cyl(trim, [ux, y0 + 1.0, 0.45], [ux, y0 + 1.95, 0.45], 0.34, 0.22, 8, true); }
  } else {
    // colossal pilasters (the order of the two upper floors): between bays; the risalits pair them at the corners
    const pw = 0.95, pd = 0.28;
    const bounds = []; for (let i = 0; i <= xs.length; i++) bounds.push(i === 0 ? 0 : i === xs.length ? len : (xs[i - 1] + xs[i]) / 2);
    bounds.forEach((bx, i) => { const edge = i === 0 || i === xs.length; const xp = edge ? (i === 0 ? pw / 2 + 0.05 : len - pw / 2 - 0.05) : bx; K.pilaster(trim, xp, pw, y0 + 0.4, yTop - 1.6, pd, 0.9); });
    for (const x of xs) {
      K.window({ x, y: y0 + 1.5, w: 1.4, h: 3.6, sw: 0.17, d: 0.12, frame: 'white', surMat: trim, sillMat: trim, hood: zone === 'wingL' || zone === 'wingR' ? 'seg' : 'tri', hoodH: 0.55 });
      K.balustrade(x - 0.85, x + 0.85, y0 + 0.9, 0.85, 0.22, trim);
      K.window({ x, y: MY.F1 + 1.6, w: 1.25, h: 2.0, sw: 0.14, d: 0.1, frame: 'white', surMat: trim, sill: true });
    }
  }
  // entablature + balustrade
  P.box(trimShade, 0, len, yTop - 1.6, yTop - 0.7, 0, centre ? 0.5 : 0.22, 'b');
  P.box(trim, centre ? -1.0 : 0, centre ? len + 1.0 : len, yTop - 0.7, yTop - 0.25, 0, centre ? 1.4 : 0.6, 'b');
  const nb = Math.max(4, Math.round(len / 0.3));
  P.box(trim, 0, len, yTop + 0.9 - 0.12, yTop + 1.05, 0.25, 0.55, 'b');
  for (let i = 0; i <= nb; i++) { const bx = 0.1 + (len - 0.2) * i / nb; P.box(trim, bx - 0.05, bx + 0.05, yTop + 0.1, yTop + 0.9 - 0.12, 0.3, 0.5, 'bt'); }
  // pediment on the side risalits, attic with panels and the cartouche on the centre
  if (risalit) {
    const t = new THREE.Shape(); t.moveTo(-0.4, yTop + 0.05); t.lineTo(len + 0.4, yTop + 0.05); t.lineTo(len / 2, yTop + 3.4); t.lineTo(-0.4, yTop + 0.05);
    P.extrude(trim, t, 0.1, 0.65, 1, 4);
    P.cyl(K.mats.brass, [len / 2, yTop + 1.45, 0.78], [len / 2, yTop + 1.45, 0.84], 0.55, 0.55, 12, true);          // gilded roundel in the tympanum
  }
  if (centre) {
    const ya = yTop + 1.05, yb = yTop + 5.6;
    P.box(wall, 0.4, len - 0.4, ya, yb, -0.6, 0.5, 'b');
    P.box(trim, 0.0, len, yb, yb + 0.55, -0.6, 0.95, 'b');
    for (let i = 0; i < 5; i++) {                                       // five panels: ornamented fields, the middle one the cartouche
      const px = 1.2 + i * (len - 2.4) / 4;
      P.box(trimShade, px - 1.4, px + 1.4, ya + 1.0, yb - 0.7, 0.5, 0.58, 'kb');
      if (i === 2) { P.cyl(K.mats.brass, [px, ya + 2.2, 0.6], [px, ya + 2.2, 0.66], 0.8, 0.8, 14, true); } else P.cyl(trim, [px, ya + 2.2, 0.6], [px, ya + 2.2, 0.65], 0.6, 0.6, 12, true);
    }
    for (let i = 0; i <= 5; i++) { const px = 0.6 + i * (len - 1.2) / 5; P.box(trim, px - 0.18, px + 0.18, ya, yb, 0.5, 0.8, 'b'); }
  }
  if (!centre && !risalit && e.len > 12) K.downpipe(0.1, 0.2, yTop, trimShade);
  void gran;
}

// ================================================================================================ Astoria
function astoria(K, mats) {
  const P = K.P;
  const recA = L.buildingById('r3107676'), recB = L.buildingById('r6554800');
  if (!recA) throw new Error('Astoria record missing');
  const wallHex = '#a9763d', trimHex = '#c19a62', granHex = '#8a7466';
  const wall = K.wall(wallHex), trim = K.mat(trimHex, { name: 'lmJ-aTrim' }), dark = K.mat('#7d5a3a', { name: 'lmJ-aDark' }), gran = K.rust(granHex);
  const awnMat = K.mat('#d2452a', { side: 'double', name: 'lmJ-aAwn' }), awnVal = K.mat('#a8341f', { name: 'lmJ-aAwnV' });
  const Y = { PL: 5.8, ST: 22.6, ATT: 26.4 };
  const front = (e, c) => {
    if (e.hole) return false;
    const len = c.len, xs = K.bays(0.4, len - 0.4, 3.45);
    K.wallQuad(wall, 0, len, Y.PL, Y.ATT, 3);
    for (const x of xs) {
      // ground floor + mezzanine: big arched window with an orange awning
      K.glass(K.mats.shop, x, 0.4, 2.2, 3.9, 'arch', (Math.floor(x * 3) & 3), 0.32); K.surround(dark, x, 0.4, 2.2, 3.9, 'arch', 0.22, 0.36);
      if (len > 6) {
        P.quad(awnMat, [x - 1.4, 4.9, 0.3], [x + 1.4, 4.9, 0.3], [x + 1.5, 3.6, 1.9], [x - 1.5, 3.6, 1.9], [0, 0.55, 0.85]);
        P.quad(awnVal, [x - 1.5, 3.6, 1.9], [x + 1.5, 3.6, 1.9], [x + 1.5, 3.3, 1.9], [x - 1.5, 3.3, 1.9], [0, 0, 1]);
        P.fan(awnMat, [[x - 1.4, 4.9, 0.3], [x - 1.5, 3.6, 1.9], [x - 1.5, 3.3, 1.9], [x - 1.4, 4.4, 0.3]], [-1, 0, 0]);
        P.fan(awnMat, [[x + 1.4, 4.9, 0.3], [x + 1.5, 3.6, 1.9], [x + 1.5, 3.3, 1.9], [x + 1.4, 4.4, 0.3]], [1, 0, 0]);
      }
      // five floors of narrow windows between the pilaster strips
      for (let f = 0; f < 4; f++) K.window({ x, y: Y.PL + 0.8 + f * 4.2, w: 1.15, h: 2.4, sw: 0.1, d: 0.08, frame: 'white', surMat: trim, sill: f === 0 });
      K.window({ x, y: Y.ST + 1.0, w: 0.95, h: 1.7, sw: 0.08, d: 0.06, frame: 'white', surMat: trim, sill: false });
    }
    // pilaster strips between the bays (the lisenes of the photographs)
    const edgesX = []; for (let i = 0; i <= xs.length; i++) edgesX.push(i === 0 ? 0.0 : i === xs.length ? len : (xs[i - 1] + xs[i]) / 2);
    edgesX.forEach((bx, i) => { const xp = i === 0 ? 0.35 : i === xs.length ? len - 0.35 : bx; P.box(wall, xp - 0.34, xp + 0.34, Y.PL, Y.ATT, 0, 0.16, 'kb'); });
    // string courses and the heavy cornice
    P.box(trim, 0, len, Y.PL, Y.PL + 0.5, 0, 0.3, 'b');
    P.box(trim, 0, len, Y.ST - 0.3, Y.ST + 0.3, 0, 0.3, 'b');
    P.box(trim, 0, len, Y.ATT - 0.5, Y.ATT, 0, 0.6, 'b');
    if (len > 14) for (const bx of [len * 0.28, len * 0.72]) K.balcony(bx - 1.1, bx + 1.1, Y.PL + 4.2 * 2 + 0.1, 0.8);
    return true;
  };
  const rec = recA;
  buildHouse(K, {
    name: 'astoria', recs: [rec], hc: Y.ATT, wall: wallHex, court: '#b58a55', plinth: Y.PL, plinthMat: gran, floors: [4.2, 4.2, 4.2, 4.2], courtPitch: 3.45,
    corniceMat: trim, roof: 'none', railing: false, front, collideH: 31, partyOpts: { tol: 0.6 },
  });
  // mansard: white-grey zinc, four metres high, with dormers on the street slopes
  const poly = rec.polys[0], r = slopedRoof(K, poly, Y.ATT + 0.0, Y.ATT + 4.2, 3.8, { slope: mats.zinc, top: mats.zincTop });
  const edges = ringEdges(poly, 0.05);
  for (const e of edges) {
    if (e.hole || e.len < 8) continue;
    onEdge(K.P, e, (len) => {
      for (const x of K.bays(2, len - 2, 6.9)) {                                      // dormers: a white-framed window under a small zinc gable
        P.box(wall, x - 0.7, x + 0.7, Y.ATT, Y.ATT + 1.9, 0.05, 1.7, 'b');
        P.box(K.mats.glassDark, x - 0.46, x + 0.46, Y.ATT + 0.35, Y.ATT + 1.6, 1.7, 1.73, 'kb');
        P.box(K.mats.trim, x - 0.62, x - 0.46, Y.ATT + 0.3, Y.ATT + 1.66, 1.7, 1.76, 'kb'); P.box(K.mats.trim, x + 0.46, x + 0.62, Y.ATT + 0.3, Y.ATT + 1.66, 1.7, 1.76, 'kb'); P.box(K.mats.trim, x - 0.62, x + 0.62, Y.ATT + 1.6, Y.ATT + 1.76, 1.7, 1.76, 'kb');
        const g = new THREE.Shape(); g.moveTo(x - 0.9, Y.ATT + 1.9); g.lineTo(x + 0.9, Y.ATT + 1.9); g.lineTo(x, Y.ATT + 2.8); g.lineTo(x - 0.9, Y.ATT + 1.9);
        P.extrude(mats.zinc, g, 0.0, 1.85, 1, 4);
      }
    });
  }
  // roof lettering (plain, no logo): a thin frame with white block letters standing on the mansard top
  lettering(K, poly, r.ins[0], Y.ATT + 4.2, ['ГОСТИНИЦА АСТОРИЯ']);
  if (recB) { /* r6554800 is the lower duplicate outline of the same footprint: claimed and covered by the main body */ }
  K.svc.houses.push({ id: 'astoria', name: 'Гостиница Астория', x: -2362, z: -67 });
  K.svc.monuments.push({ id: 'r3107676', name: 'Гостиница «Астория»', x: -2362, z: -67, h: 31 });
}

/** white block-letter word signs along the longest outer edge of the roof top (a plain text plane on a thin frame) */
function lettering(K, poly, ins, y, texts) {
  const P = K.P;
  let best = null; const n = ins.length;
  for (let i = 0; i < n; i++) { const a = ins[i], b = ins[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!best || l > best.l) best = { a, b, l }; }
  if (!best) return;
  const dx = (best.b[0] - best.a[0]) / best.l, dz = (best.b[1] - best.a[1]) / best.l;
  // outward = away from the ring centroid
  let cx = 0, cz = 0; for (const p of ins) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const mx = (best.a[0] + best.b[0]) / 2, mz = (best.a[1] + best.b[1]) / 2;
  let nx = dz, nz = -dx; if ((mx - cx) * nx + (mz - cz) * nz < 0) { nx = -nx; nz = -nz; }
  const rot = Math.atan2(nx, nz), w = Math.min(best.l * 0.7, 30);
  P.push(mx, y, mz, rot);
  K.fascia(-w / 2, w / 2, 0.8, 2.6, texts[0], { w: 1024, h: 96, fg: '#eef0f2', transparent: true, font: K.ctx.tex.FONTS.serif, z: 0.05, size: 0.8 });
  P.box(K.mats.ironSoft, -w / 2, w / 2, 0.0, 0.8, -0.05, 0.05, 'b');
  for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 6) P.box(K.mats.ironSoft, x - 0.04, x + 0.04, 0, 2.7, -0.04, 0.04, 'b');
  P.pop();
}

// ================================================================================================ Angleterre
function angleterre(K, mats) {
  const P = K.P;
  const rec = L.buildingById('w49861780');
  if (!rec) throw new Error('Angleterre record missing');
  const wallHex = '#d4552a', trimHex = '#e8b070', granHex = '#8d7d72';
  const wall = K.wall(wallHex), trim = K.mat(trimHex, { name: 'lmJ-gTrim' }), gran = K.rust(granHex), dark = K.mat('#7a4a30', { name: 'lmJ-gDark' });
  const Y = { PL: 4.6, F1: 5.4, TOP: 21.6 };
  const front = (e, c) => {
    if (e.hole) return false;
    const len = c.len, xs = K.bays(0.5, len - 0.5, 3.3);
    K.wallQuad(wall, 0, len, Y.PL, Y.TOP, 3);
    for (const x of xs) {
      // shops under granite rustication
      K.shopWindow(x, 0.4, 2.2, 3.4, { head: 'arch', fw: 0.16, d: 0.34, frameMat: trim, z: 0.32 });
      K.window({ x, y: Y.F1, w: 1.25, h: 2.7, sw: 0.1, d: 0.07, frame: 'white', surMat: trim, sill: true });
      K.window({ x, y: Y.F1 + 4.0, w: 1.25, h: 2.6, sw: 0.1, d: 0.07, frame: 'white', surMat: trim, sill: true });
      K.window({ x, y: Y.F1 + 8.0, w: 1.25, h: 2.4, sw: 0.1, d: 0.07, frame: 'white', surMat: trim, sill: true });
      K.window({ x, y: Y.F1 + 11.3, w: 1.1, h: 2.5, head: 'arch', sw: 0.1, d: 0.07, frame: 'white', surMat: trim, sill: false });
    }
    // wide cream lisenes every fifth bay (the facade reads as long groups of windows between strong vertical strips)
    for (let i = 0; i <= xs.length; i += 5) { const bx = i === 0 ? 0.35 : i >= xs.length ? len - 0.35 : (xs[i - 1] + xs[i]) / 2; P.box(trim, bx - 0.45, bx + 0.45, Y.PL, Y.TOP - 0.2, 0, 0.16, 'kb'); }
    P.box(trim, 0, len, Y.PL, Y.PL + 0.45, 0, 0.3, 'b');
    P.box(trim, 0, len, Y.F1 + 3.75, Y.F1 + 3.95, 0, 0.18, 'b'); P.box(trim, 0, len, Y.F1 + 7.7, Y.F1 + 7.9, 0, 0.18, 'b'); P.box(trim, 0, len, Y.F1 + 10.9, Y.F1 + 11.1, 0, 0.18, 'b');
    return true;
  };
  buildHouse(K, {
    name: 'angleterre', recs: [rec], hc: Y.TOP, wall: wallHex, court: '#c9532a', plinth: Y.PL, plinthMat: gran, floors: [4.0, 4.0, 3.6, 3.3], courtPitch: 3.3,
    corniceMat: trim, roofMat: mats.zincTop, railing: true, front, collideH: 24, partyOpts: { tol: 0.6 },
  });
  // roof lettering АНГЛЕТЕР along the longest edge
  const poly = rec.polys[0], edges = ringEdges(poly, 0.05).filter((q) => !q.hole);
  let best = null; for (const e of edges) if (!best || e.len > best.len) best = e;
  if (best) onEdge(P, best, (len) => {
    const w = Math.min(len * 0.5, 18);
    K.fascia(len / 2 - w / 2, len / 2 + w / 2, Y.TOP + 1.6, Y.TOP + 3.6, 'АНГЛЕТЕР', { w: 1024, h: 128, fg: '#f2f2f0', transparent: true, font: K.ctx.tex.FONTS.serif, z: -0.9, size: 0.85 });
    P.box(K.mats.ironSoft, len / 2 - w / 2, len / 2 + w / 2, Y.TOP + 0.5, Y.TOP + 1.6, -0.95, -0.85, 'b');
  });
  void dark;
  K.svc.houses.push({ id: 'angleterre', name: 'Гостиница Англетер', x: -2358, z: -150 });
  K.svc.monuments.push({ id: 'w49861780', name: 'Англетер', x: -2358, z: -150, h: 22 });
}

// ================================================================================================ Lobanov-Rostovsky house
function lobanov(K, mats) {
  const P = K.P;
  const rec = L.buildingById('r3077276');
  if (!rec) throw new Error('Lobanov-Rostovsky record missing');
  const wallHex = '#e2d3a9', trimHex = '#f1ecdf';
  const wall = K.wall(wallHex), trim = K.mat(trimHex, { name: 'lmJ-lTrim' }), gran = K.rust('#9a9288');
  const Y = { PL: 3.2, TOP: 21.0 };
  // the portico edge: the NW front (the lions' steps) = the edge whose midpoint is nearest to the lions at (-2450.5, -325)
  const poly = rec.polys[0], edges = ringEdges(poly, 0.05);
  let porticoEdge = null, bd = 1e9;
  for (const e of edges) { if (e.hole || e.len < 12) continue; const d = Math.hypot((e.a[0] + e.b[0]) / 2 + 2450.5, (e.a[1] + e.b[1]) / 2 + 325); if (d < bd) { bd = d; porticoEdge = e; } }
  const front = (e, c) => {
    if (e.hole) return false;
    const len = c.len, xs = K.bays(0.5, len - 0.5, 3.7);
    K.wallQuad(wall, 0, len, Y.PL, Y.TOP, 3);
    const isP = !!porticoEdge && Math.hypot(e.a[0] - porticoEdge.a[0], e.a[1] - porticoEdge.a[1]) < 0.05 && Math.hypot(e.b[0] - porticoEdge.b[0], e.b[1] - porticoEdge.b[1]) < 0.05;
    for (const x of xs) {
      if (isP && Math.abs(x - len / 2) < Math.min(14, len * 0.5)) { K.glass(K.mats.winBrown, x, 0.5, 1.3, 2.0, 'flat', 1, 0.32); continue; }
      K.glass(K.mats.winWhite, x, 0.7, 1.3, 1.6, 'flat', (Math.floor(x * 3) & 3), 0.3); K.surround(trim, x, 0.7, 1.3, 1.6, 'flat', 0.12, 0.34);
      K.window({ x, y: Y.PL + 1.0, w: 1.4, h: 2.9, sw: 0.16, d: 0.1, frame: 'white', surMat: trim, hood: 'tri', hoodH: 0.45 });
      K.window({ x, y: Y.PL + 5.4, w: 1.35, h: 2.6, sw: 0.14, d: 0.09, frame: 'white', surMat: trim, hood: 'seg', hoodH: 0.4 });
      K.window({ x, y: Y.PL + 9.6, w: 1.3, h: 2.3, sw: 0.12, d: 0.08, frame: 'white', surMat: trim });
      K.window({ x, y: Y.PL + 13.2, w: 1.0, h: 1.4, sw: 0.1, d: 0.06, frame: 'white', surMat: trim, sill: false });
    }
    P.box(trim, 0, len, Y.PL, Y.PL + 0.4, 0, 0.3, 'b');
    for (const yy of [Y.PL + 4.7, Y.PL + 9.0, Y.PL + 12.5]) P.box(trim, 0, len, yy, yy + 0.2, 0, 0.16, 'b');
    if (isP) {
      // 8-column Corinthian portico with a pediment, steps, and the two Carrara lions
      const px0 = len / 2 - 12.3, px1 = len / 2 + 12.3, cols = Array.from({ length: 8 }, (_, i) => px0 + 1.0 + (px1 - px0 - 2.0) * i / 7);
      portico(K, { x0: px0, x1: px1, depth: 4.6, y0: 1.3, y1: 13.0, r: 0.6, xs: cols, ent: 2.0, ped: 3.2, mat: trim, matShade: K.mats.cream, wallMat: K.mats.cream });
      for (const sg of [-1, 1]) lion(K, len / 2 + sg * 13.8, 6.6, 8.4, trim);
    }
    return true;
  };
  buildHouse(K, {
    name: 'lobanov', recs: [rec], hc: Y.TOP, wall: wallHex, court: '#dccb9a', plinth: Y.PL, plinthMat: gran, floors: [4.4, 4.0, 3.6, 3.3], courtPitch: 3.7,
    corniceMat: trim, roofMat: mats.zincTop, railing: true, front, collideH: 23, partyOpts: { tol: 0.6 },
  });
  K.svc.houses.push({ id: 'lobanov', name: 'Дом Лобанова-Ростовского', x: -2433, z: -281 });
  K.svc.monuments.push({ id: 'r3077276', name: 'Дом Лобанова-Ростовского («Дом со львами»)', x: -2450, z: -325, h: 21 });
}

/** a recumbent marble lion on a block (facade frame, facing +z): body, raised chest, mane, head, forepaws, haunch, tail */
function lion(K, x, z, scale, mat) {
  const P = K.P, sph = new THREE.SphereGeometry(1, 10, 7);
  P.box(mat, x - 1.0, x + 1.0, 0.0, 1.0, z - 1.7, z + 1.7, 'b');
  P.geo(mat, sph, x, 1.75, z - 0.35, 0, 0, 0, 0.62, 0.62, 1.3);                           // body
  P.geo(mat, sph, x, 2.0, z + 0.7, 0, 0, 0, 0.58, 0.72, 0.62);                            // chest
  P.geo(mat, sph, x, 2.05, z + 0.95, 0, 0, 0, 0.88, 0.86, 0.5);                           // mane
  P.geo(mat, sph, x, 2.35, z + 1.35, 0, 0, 0, 0.42, 0.44, 0.46);                          // head
  P.geo(mat, sph, x, 1.7, z - 1.05, 0, 0, 0, 0.64, 0.6, 0.7);                             // haunch
  for (const sg of [-1, 1]) P.cyl(mat, [x + sg * 0.3, 1.2, z + 0.4], [x + sg * 0.3, 1.2, z + 1.7], 0.17, 0.15, 6, true);   // forepaws
  P.cyl(mat, [x, 1.4, z - 1.5], [x + 0.3, 1.05, z - 1.9], 0.07, 0.05, 5, true);                                     // tail
  sph.dispose(); void scale;
}
