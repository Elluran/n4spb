// landmarksG/gstaff.js - the General Staff Building (Rossi, 1819-28): the two wings of the great arc round Palace Square.  OSM footprints w309796655 (east wing), r1453436 (centre + west wing, the
// dome courtyard), r1453435 (west end block, Dvortsovaya pl. 12).  The front is drawn along a true circle (R 87 m about uv (45, 0), docs/research/palace-square-hermitage.md section 6) instead of the
// 12 m chords of the OSM outline (they differ by 20 cm): the footprints give the colliders, the roofs and the plain walls, this file draws the fronts.
//   Elevation (refs/palace-square 082 083 086 090, 098): pink-grey granite plinth 2.6 m with small barred windows; floor 1 with tall flat windows on balustrade panels and lace panels above; white
//   belt + Greek-key band; floor 2 tall windows with flat cornice hoods and balustrades (arched windows between the columns near the arch); floor 3 small windows; a white entablature with a dentilled
//   cornice (top 23.4 m), a white balustrade and ochre chimney stacks.  Next to the arch a colonnade of 8 free Corinthian columns on each side (pitch 3.2 m, 10 m high, 10.1 -> 20.3 m) under a projecting
//   entablature.  Gilded balconies, wooden doors in the plinth, cream downpipes.  The grey metal-and-glass dome (Krivoshein 1902-05) stands over the west wing's courtyard (-1964.6, -589.7).  NO flagpole.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { ringEdges, onEdge, band } from './kit.js';
import { ringFromFlat } from '../lib/massing.js';
import { ARC, ARCH, toWorld, toUV } from './frame.js';
import { GC } from './mats.js';

export const Y = { PL: 2.6, F1: 4.2, BELT: 8.7, MEA0: 9.1, MEA1: 10.0, F2: 11.2, F3: 16.8, ENT: 20.3, ARCH0: 21.0, COR: 22.2, TOP: 23.45, BAL: 24.55, COL0: 10.1 };
const PITCH = 3.2;

// ------------------------------------------------------------------------------------------------ geometry helpers
const inRing = (r, x, z) => { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; };
const sArc = (v) => ARC.R * Math.asin(v / ARC.R);
const arcPt = (s) => { const a = s / ARC.R; return toWorld(ARC.u + ARC.R * Math.cos(a), ARC.v + ARC.R * Math.sin(a)); };
/** a facade edge between two world points with the outward normal chosen against the footprint ring */
function mkEdge(a, b, ring, o = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  let n = [dz / len, -dx / len];
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (o.arc) {                                                    // the arc faces the centre of its circle (the square), whatever the chords of the OSM outline do
    const c = toWorld(ARC.u, ARC.v), cx = c[0] - m[0], cz = c[1] - m[1], cl = Math.hypot(cx, cz);
    n = [cx / cl, cz / cl];
  } else {
    const out = inRing(ring, m[0] + n[0] * 0.6, m[1] + n[1] * 0.6), inn = inRing(ring, m[0] - n[0] * 0.6, m[1] - n[1] * 0.6);
    if (out && !inn) n = [-n[0], -n[1]];
    else if (out === inn && inRing(ring, m[0] + n[0] * 3, m[1] + n[1] * 3)) n = [-n[0], -n[1]];
  }
  return { a, b, len, n, ...o };
}
/** split the segment a->b into k equal edges */
function split(a, b, k, ring, o) {
  const out = [];
  for (let i = 0; i < k; i++) {
    const p = [a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k], q = [a[0] + (b[0] - a[0]) * (i + 1) / k, a[1] + (b[1] - a[1]) * (i + 1) / k];
    out.push(mkEdge(p, q, ring, o));
  }
  return out;
}

/** the east wing's footprint (OSM w309796655) is one solid polygon, in reality the wing encloses five inner courts: carve up to  oblong courts along the middle of the band (clear of the walls by >= 7 m, 52 m apart) */
function withCourts(rec, want = 5) {
  const ring = []; const o = rec.polys[0].o;
  for (let i = 0; i < o.length; i += 2) { const q = toUV(o[i], o[i + 1]); ring.push([q.u, q.v]); }
  const dist = (u, v) => { let d = 1e9; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[j], b = ring[i], dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((u - a[0]) * dx + (v - a[1]) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(u - a[0] - dx * t, v - a[1] - dz * t)); } return d; };
  const cand = [];
  for (let u = 20; u < 300; u += 2) for (let v = -200; v < 30; v += 2) if (inRing(ring, u, v)) { const d = dist(u, v); if (d >= 13) cand.push([u, v, d]); }
  cand.sort((a, b) => b[2] - a[2]);
  const picked = [], holes = [];
  for (const c of cand) {
    if (picked.length >= want) break;
    if (picked.some((p) => Math.hypot(p[0] - c[0], p[1] - c[1]) < 52)) continue;
    const near = cand.filter((q) => Math.hypot(q[0] - c[0], q[1] - c[1]) < 34);
    let sxx = 0, sxy = 0, syy = 0; for (const q of near) { const dx = q[0] - c[0], dy = q[1] - c[1]; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
    const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), ca = Math.cos(ang), sa = Math.sin(ang);
    for (const [hl, hw] of [[17, Math.min(8, c[2] - 6)], [14, Math.min(6.5, c[2] - 6)]]) {
      if (hw < 4) continue;
      const pts = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([x, y]) => [c[0] + x * ca - y * sa, c[1] + x * sa + y * ca]);
      if (pts.every((p) => inRing(ring, p[0], p[1]) && dist(p[0], p[1]) >= 6.5)) { picked.push(c); holes.push(pts.flatMap((p) => toWorld(p[0], p[1]))); break; }
    }
  }
  return { ...rec, polys: [{ ...rec.polys[0], h: (rec.polys[0].h || []).concat(holes) }, ...rec.polys.slice(1)] };
}

export function build(K, ctx) {
  const P = K.P, M = K.mats, G = K.G, GM = G.M;
  const recs = { east: L.buildingById('w309796655'), west: L.buildingById('r1453436'), end: L.buildingById('r1453435') };
  for (const k in recs) if (!recs[k]) throw new Error('General Staff record missing: ' + k);
  const ringOf = (r) => ringFromFlat(r.polys[0].o);
  const rE = ringOf(recs.east), rW = ringOf(recs.west), rN = ringOf(recs.end);

  // ---- the front runs (continuous lists of edges; zone: 'col' = colonnade bays, 'wing' = plain front, 'flank' = passage flank)
  const runs = [];
  // east: arch block edge (v -14.9) -> arc -> straight (5->6->7) -> end face (7->8)
  {
    const sA = sArc(-13.75), sB = sArc(-60), n = Math.max(1, Math.round(Math.abs(sB - sA) / PITCH)), pts = [];            // (v runs negative on this side: the old signed count was <= 0 and the east arc was never drawn)
    for (let i = 0; i <= n; i++) pts.push(arcPt(sA + (sB - sA) * i / n));
    pts[n] = [rE[5][0], rE[5][1]];
    const edges = [];
    for (let i = 0; i < n; i++) edges.push(mkEdge(pts[i], pts[i + 1], rE, { zone: i <= 8 ? 'col' : 'wing', arc: true, idx: i }));
    edges.push(...split(rE[5], rE[6], Math.round(Math.hypot(rE[6][0] - rE[5][0], rE[6][1] - rE[5][1]) / PITCH), rN.length ? rE : rE, { zone: 'wing' }));
    edges.push(...split(rE[6], rE[7], Math.round(Math.hypot(rE[7][0] - rE[6][0], rE[7][1] - rE[6][1]) / PITCH), rE, { zone: 'wing' }));
    edges.push(...split(rE[7], rE[8], Math.round(Math.hypot(rE[8][0] - rE[7][0], rE[8][1] - rE[7][1]) / PITCH), rE, { zone: 'wing' }));
    runs.push({ name: 'east', edges, side: -1 });
  }
  // west: arch block edge (v +12.3) -> arc -> straight (27->26) -> west end block faces (r1453435: 3->2->1->0 and the Nevsky end 0->10)
  {
    const sA = sArc(11.15), sB = sArc(57.7), n = Math.round((sB - sA) / PITCH), pts = [];
    for (let i = 0; i <= n; i++) pts.push(arcPt(sA + (sB - sA) * i / n));
    pts[n] = [rW[27][0], rW[27][1]];
    const edges = [];
    for (let i = 0; i < n; i++) edges.push(mkEdge(pts[i], pts[i + 1], rW, { zone: i <= 8 ? 'col' : 'wing', arc: true, idx: i }));
    const seg = (a, b, ring) => split(a, b, Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / PITCH)), ring, { zone: 'wing' });
    edges.push(...seg(rW[27], rW[26], rW));
    edges.push(...seg(rN[3], rN[2], rN), ...seg(rN[2], rN[1], rN), ...seg(rN[1], rN[0], rN), ...seg(rN[0], rN[10], rN));
    runs.push({ name: 'west', edges, side: 1 });
  }
  // the passage flanks (between the arches the wing walls are decorated like the fronts): east wall 22->0, west walls 33->34->35 (r1453436)
  const flanks = [];
  flanks.push({ name: 'flankE', edges: split(rE[22], rE[0], Math.round(Math.hypot(rE[0][0] - rE[22][0], rE[0][1] - rE[22][1]) / PITCH), rE, { zone: 'flank' }) });
  flanks.push({ name: 'flankW', edges: [...split(rW[33], rW[34], 3, rW, { zone: 'flank' }), ...split(rW[34], rW[35], 6, rW, { zone: 'flank' })] });
  runs.push(...flanks);

  // which OSM edges are replaced by the runs (skipped by the generic builder): matched by both end points near a run vertex line
  const near = (p, q, t = 0.5) => Math.hypot(p[0] - q[0], p[1] - q[1]) < t;
  const frontKeys = {
    w309796655: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [22, 0]],
    r1453436: [[27, 28], [28, 29], [29, 30], [30, 31], [31, 32], [32, 33], [26, 27], [33, 34], [34, 35]],
    r1453435: [[3, 2], [2, 1], [1, 0], [0, 10]],
  };
  const isFront = (e, rec) => {
    const keys = frontKeys[rec.id]; if (!keys) return false;
    const ring = ringOf(rec);
    return keys.some(([i, j]) => (near(e.a, ring[i]) && near(e.b, ring[j])) || (near(e.a, ring[j]) && near(e.b, ring[i])));
  };

  // ---- the generic house: plain walls on the rest, roofs, railings, colliders
  buildHouse(K, {
    name: 'gstaff', recs: [withCourts(recs.east), recs.west, recs.end], hc: 22.9, wall: GC.wall, court: '#e2c986', plinth: 1.4, plinthMat: GM.plinth, floors: [4.4, 4.2, 4.0, 3.6, 3.4], courtPitch: 3.2,
    roofMat: GM.roof, upstand: 0.45, party: (e, rec) => (isFront(e, rec) ? true : null), railing: true, collideH: 25,
    noWin: (e) => { const m = toUV((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2); return m.u > 126 && m.u < 192 && Math.abs(m.v - ARCH.v0) < 16; },   // the notch walls of the passage: the arch draws its own faces
  });
  // the buildings are one 4-storey block each: the colliders of buildHouse follow the OSM footprints

  // ---- the fronts
  const wallMat = GM.wall, white = GM.white, whiteShade = GM.whiteShade, gold = GM.gold;
  const plinthTex = K.rust(GC.plinth);
  const columns = [];
  let nDoor = 0;
  for (const run of runs) {
    const E = run.edges;
    const col = (e) => e.zone === 'col';
    const notFlank = (e) => e.zone !== 'flank';
    // bands
    band(P, E, 0, Y.PL, 0.12, { front: plinthTex, top: GM.graniteGrey }, { uvs: 2.4 });
    band(P, E, Y.BELT, Y.BELT + 0.3, 0.14, { front: white, top: white, under: whiteShade });
    // entablature block over the columns (projects 1.25 m), the plain architrave elsewhere
    band(P, E, Y.ENT, Y.ARCH0 + 0.0, 0.14, { front: white, top: white, under: whiteShade }, { draw: (e) => !col(e) });
    band(P, E, Y.ENT, Y.COR - 0.12, 1.25, { front: white, top: white, under: whiteShade }, { draw: col });
    band(P, E, Y.COR - 0.42, Y.COR, (e) => (col(e) ? 1.38 : 0.14), { front: M.dentil, top: white, under: whiteShade }, { uvs: 0.6 });
    band(P, E, Y.COR, Y.TOP - 0.3, (e) => (col(e) ? 2.05 : 0.9), { front: white, top: white, under: whiteShade });
    band(P, E, Y.TOP - 0.3, Y.TOP, (e) => (col(e) ? 1.7 : 0.55), { front: white, top: white, under: whiteShade });
    run.edges.forEach((e, i) => {
      onEdge(P, e, (len) => bay(K, e, len, i, run));
    });
    // columns at the boundaries of the colonnade bays
    for (let i = 1; i < E.length; i++) {
      if (!col(E[i - 1]) || !col(E[i])) continue;
      const a = E[i].a, nx = (E[i - 1].n[0] + E[i].n[0]) / 2, nz = (E[i - 1].n[1] + E[i].n[1]) / 2, l = Math.hypot(nx, nz);
      columns.push([a[0] + nx / l * 0.62, a[1] + nz / l * 0.62]);
    }
    // the columns of the last colonnade bay up to the arch pylon are drawn by arch.js (the free pairs)
  }
  for (const [x, z] of columns) corinthian(K, GM.white, GM.whiteShade, x, z, Y.COL0, Y.ENT, 0.5);

  // ---- chimney stacks along the roofline (ochre with white caps) every ~12 m, 1.4 m behind the balustrade
  for (const run of runs) if (run.edges[0].zone !== 'flank') {
    let acc = 0;
    run.edges.forEach((e, i) => {
      acc += e.len;
      if (i % 4 !== 2) return;
      onEdge(P, e, (len) => {
        P.box(wallMat, len / 2 - 0.45, len / 2 + 0.45, Y.TOP, Y.TOP + 2.3, -1.9, -1.0, 'b');
        P.box(white, len / 2 - 0.58, len / 2 + 0.58, Y.TOP + 2.3, Y.TOP + 2.6, -2.03, -0.87, 'b');
      });
    });
  }

  dome(K, GM);
  K.svc.houses.push({ id: 'general-staff', name: 'Здание Главного штаба', nameEn: 'General Staff Building', x: -1930, z: -610 });
  K.svc.monuments.push({ id: 'general-staff', name: 'Главный штаб', nameEn: 'General Staff Building', x: -1930, z: -610, h: 28 });
  K.runs = runs;                                                                    // arch.js / square.js read the geometry
}

// ------------------------------------------------------------------------------------------------ one bay in the edge frame
function bay(K, e, len, i, run) {
  const P = K.P, M = K.mats, G = K.G, GM = G.M, X = len / 2;
  const flank = e.zone === 'flank', col = e.zone === 'col';
  K.wallQuad(GM.wall, 0, len, Y.PL, Y.TOP, 3);
  const win = (o) => K.window({ frame: 'white', surMat: GM.white, sillMat: GM.white, ...o });
  const hz = 0.12;
  // plinth: small barred windows (dark) every bay
  K.plane(GM.dark, X - 0.45, X + 0.45, 0.9, 1.65, 0.13);
  P.box(GM.black, X - 0.47, X + 0.47, 0.88, 0.9, 0.12, 0.15, ''); P.box(GM.black, X - 0.47, X + 0.47, 1.65, 1.67, 0.12, 0.15, '');
  // floor 1
  win({ x: X, y: Y.F1, w: 1.45, h: 3.1, sw: 0.14, d: 0.09 });
  K.balustrade(X - 0.8, X + 0.8, 3.35, 0.82, 0.22, GM.white);
  K.plane(G.lace, X - 0.45, X + 0.45, 7.6, 8.55, 0.06);
  // belt course is a band; the Greek key strip
  P.quad(G.meander, [0, Y.MEA0, 0.04], [len, Y.MEA0, 0.04], [len, Y.MEA1, 0.04], [0, Y.MEA1, 0.04], [0, 0, 1], [[0, 0], [len / 1.0, 0], [len / 1.0, 1], [0, 1]]);
  // floor 2
  if (col) {
    win({ x: X, y: Y.F2, w: 1.5, h: 4.6, head: 'arch', sw: 0.15, d: 0.1, sill: false });
    K.balustrade(X - 0.85, X + 0.85, 10.2, 0.98, 0.26, GM.white);
    P.box(GM.gold, X - 0.9, X + 0.9, 11.15, 11.25, 0.05, 0.3, 'k');
  } else {
    win({ x: X, y: Y.F2, w: 1.5, h: 4.0, sw: 0.2, d: 0.12 });
    P.box(GM.white, X - 1.0, X + 1.0, Y.F2 + 4.2, Y.F2 + 4.5, 0, 0.3, 'kb');                  // flat cornice hood
    P.box(GM.white, X - 0.78, X - 0.62, Y.F2 + 3.3, Y.F2 + 4.2, 0, 0.14, 'kb'); P.box(GM.white, X + 0.62, X + 0.78, Y.F2 + 3.3, Y.F2 + 4.2, 0, 0.14, 'kb');
    K.balustrade(X - 0.85, X + 0.85, 10.2, 0.98, 0.26, GM.white);
  }
  // floor 3
  win({ x: X, y: Y.F3, w: 1.15, h: 2.3, sw: 0.12, d: 0.07, sill: false });
  P.box(GM.white, X - 0.9, X + 0.9, Y.F3 - 0.15, Y.F3, 0, 0.14, 'k');
  // frieze ornament (palmettes) between the architrave and the cornice, plain zones only
  if (!col) P.quad(G.palmette, [0, 21.05, 0.03], [len, 21.05, 0.03], [len, 22.1, 0.03], [0, 22.1, 0.03], [0, 0, 1], [[0, 0], [len / 3.2, 0], [len / 3.2, 1], [0, 1]]);
  else P.quad(G.palmette, [0, 21.1, 1.27], [len, 21.1, 1.27], [len, 22.0, 1.27], [0, 22.0, 1.27], [0, 0, 1], [[0, 0], [len / 3.2, 0], [len / 3.2, 1], [0, 1]]);
  // balustrade on the roof edge: rails + the cut-out balusters (1.1 m high)
  P.box(GM.white, 0, len, Y.TOP, Y.TOP + 0.14, 0.12, 0.42, 'b');
  P.box(GM.white, 0, len, Y.BAL - 0.12, Y.BAL, 0.12, 0.42, 'b');
  const ox = col ? 1.55 : 0.0;
  P.quad(G.balust, [0, Y.TOP + 0.14, 0.28 + ox * 0], [len, Y.TOP + 0.14, 0.28], [len, Y.BAL - 0.12, 0.28], [0, Y.BAL - 0.12, 0.28], [0, 0, 1], [[0, 0], [len / 1.1, 0], [len / 1.1, 1], [0, 1]]);
  void hz;
  // gilded balconies and doors at chosen bays of the plain fronts
  if (!col && !flank && (i % 11 === 5 || i % 11 === 6)) {
    const bx0 = i % 11 === 5 ? X - 0.1 : X - len + 0.1;
    void bx0;
  }
  if (!col && !flank && i % 17 === 8) balcony(K, X, GM);
  if (!flank && i % 15 === 4) door(K, X, GM);
  if (i % 8 === 3 && !flank) K.downpipe(0.12, 0.2, 22.2, GM.wallShade);
}

function balcony(K, x, GM) {
  const P = K.P, y = Y.F2 - 0.1, w = 1.9, d = 1.0;
  P.box(GM.white, x - w, x + w, y - 0.28, y, 0.0, d, 'k');
  for (const bx of [x - w + 0.3, x, x + w - 0.3]) P.box(GM.wallShade, bx - 0.12, bx + 0.12, y - 1.0, y - 0.28, 0, d * 0.65, 'kb');
  const rail = GM.gold;
  P.box(rail, x - w, x + w, y + 0.88, y + 0.98, d - 0.06, d, '');
  P.box(rail, x - w, x - w + 0.06, y, y + 0.98, 0.0, d, 'k'); P.box(rail, x + w - 0.06, x + w, y, y + 0.98, 0.0, d, 'k');
  const n = Math.round(2 * w / 0.16);
  for (let i = 0; i <= n; i++) { const bx = x - w + 2 * w * i / n; P.box(rail, bx - 0.012, bx + 0.012, y + 0.05, y + 0.9, d - 0.05, d - 0.03, 'tb'); }
}
function door(K, x, GM) {
  const P = K.P;
  P.push(0, 0, 0.14, 0);
  K.gate(x, 0, 1.9, 2.5, { sw: 0.24, d: 0.16, doorMat: GM.door, ringMat: GM.white });
  P.pop();
}

// ------------------------------------------------------------------------------------------------ Corinthian column (world frame): base, shaft with entasis, two-tier capital, abacus
export function corinthian(K, mat, matShade, x, z, y0, y1, r) {
  const P = K.P, seg = 12, ch = 1.35, sh1 = y1 - ch, sh0 = y0 + 0.32;
  P.cyl(matShade, [x, y0, z], [x, y0 + 0.14, z], r * 1.32, r * 1.32, seg, true);
  P.cyl(mat, [x, y0 + 0.14, z], [x, sh0, z], r * 1.2, r * 1.0, seg, false);
  P.cyl(mat, [x, sh0, z], [x, y0 + (sh1 - y0) * 0.45, z], r * 1.0, r * 1.01, seg, false);
  P.cyl(mat, [x, y0 + (sh1 - y0) * 0.45, z], [x, sh1, z], r * 1.01, r * 0.86, seg, false);
  P.cyl(mat, [x, sh1, z], [x, sh1 + 0.12, z], r * 0.96, r * 0.96, seg, true);
  P.cyl(mat, [x, sh1 + 0.12, z], [x, sh1 + 0.55, z], r * 0.9, r * 1.18, seg, false);        // lower acanthus tier
  P.cyl(matShade, [x, sh1 + 0.55, z], [x, sh1 + 0.62, z], r * 1.2, r * 1.2, seg, true);
  P.cyl(mat, [x, sh1 + 0.62, z], [x, sh1 + 1.1, z], r * 1.1, r * 1.42, seg, false);           // upper tier + volutes
  P.box(mat, x - r * 1.55, x + r * 1.55, sh1 + 1.1, y1, z - r * 1.55, z + r * 1.55, 'b');
}

// ------------------------------------------------------------------------------------------------ the dome of the military library (grey metal + glass ribs), over the west wing's courtyard
function dome(K, GM) {
  const P = K.P, G = K.G;
  const c = L.buildingById('r1453436').polys[0].h[0];                                      // the circular courtyard hole
  let cx = 0, cz = 0; for (let i = 0; i < c.length; i += 2) { cx += c[i]; cz += c[i + 1]; } cx /= c.length / 2; cz /= c.length / 2;
  const R = 12.2, y0 = Y.TOP + 0.2, H = 8.6;
  const prof = [[R + 0.8, y0 - 0.2], [R + 0.8, y0 + 0.5], [R, y0 + 0.5], [R, y0 + 0.9]];
  for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI / 2 * 0.93; prof.push([R * Math.cos(a) * 0.98, y0 + 0.9 + H * Math.sin(a)]); }
  prof.push([0.01, y0 + 0.9 + H * 1.0]);
  const geo = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0], p[1])), 32);
  P.geo(GM.domeRibbed, geo, cx, 0, cz);
  // ring + railing round the lantern, spire (no flag)
  const yt = y0 + 0.9 + H;
  P.cyl(GM.domeRib, [cx, yt - 0.5, cz], [cx, yt + 0.3, cz], 1.6, 1.4, 16, true);
  K.railing(Array.from({ length: 17 }, (_, i) => [cx + Math.cos(i / 16 * 6.2832) * 2.2, cz + Math.sin(i / 16 * 6.2832) * 2.2]), yt + 0.3, 0.9, true);
  P.cyl(GM.domeRib, [cx, yt + 0.3, cz], [cx, yt + 2.2, cz], 1.1, 0.12, 12, true);
  P.cyl(GM.domeRib, [cx, yt + 2.2, cz], [cx, yt + 3.6, cz], 0.1, 0.05, 6, true);
  P.geo(GM.domeRib, new THREE.SphereGeometry(0.28, 8, 6), cx, yt + 2.5, cz);
  // eight rectangular skylights on the roof around the dome (hip lights, grey-green glass)
  void G;
}
