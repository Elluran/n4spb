// landmarksCastle/roof.js - the green copper roofs of the Engineering Castle with the "battlement" of orange chimney boxes along the cornice, the taller attics of the two north pavilions with their relief
// friezes, the church rotunda (drum + green dome + lantern) over the west apse, the flat roof of the east oval hall, the pink belfry lantern with the 64 m gilded spire, and the court paving.
// Roof shape (photos 247, 135): outer eave -> a 26 deg slope up to a flat ridge deck -> a steeper slope down to the court eave.  The rings are built in the castle's (a, b) frame (frame.js),
// the court octagon from the 8 main corners of the OSM court polygon.  Spire position (-807,-886) +-20 m is the dossier's estimate (OSM has no node).
import * as THREE from 'three';
import { ringEdges, band, onEdge, DEG } from './kit.js';
import { C0, ROT, AB, W } from './frame.js';
import { roundedRectAB, offsetConvex, polyDist, ringFlat } from './geo.js';
import { dome, cup, cross, lathe, ringWindows } from './parts.js';
import { HC, UP, HC_COURT, SPECIAL } from './castle.js';

const YR = 25.4;                                      // ridge deck
export const COURT_OCT = [[15.7, 24.9], [36.9, 5.2], [36.7, -19.9], [15.0, -38.5], [-10.8, -38.3], [-30.1, -19.9], [-31.0, 5.6], [-10.2, 24.4]];

export function buildRoofs(K, M, D) {
  const P = K.P;
  const R0 = roundedRectAB(-52.6, 53.6, -60.0, 45.8, 8, 5), R1 = roundedRectAB(-44.6, 45.6, -52.0, 37.8, 3, 5);
  const CO = COURT_OCT.map(([a, b]) => AB(a, b)), CO2 = offsetConvex(CO, 7.0);
  const y0 = HC + UP, yc = HC_COURT + UP;
  const n = R0.length;
  const slope = (ringA, ya, ringB, yb, mat) => {
    for (let i = 0; i < ringA.length; i++) {
      const j = (i + 1) % ringA.length, a = ringA[i], b = ringA[j], c = ringB[j], d = ringB[i];
      P.quad(mat, [a[0], ya, a[1]], [b[0], ya, b[1]], [c[0], yb, c[1]], [d[0], yb, d[1]], [0, 1, 0], [[a[0] / 3, a[1] / 3], [b[0] / 3, b[1] / 3], [c[0] / 3, c[1] / 3], [d[0] / 3, d[1] / 3]]);
    }
  };
  slope(R0, y0, R1, YR, M.roof);
  P.cap(M.roof, R1, YR, true, 3, [CO2]);
  slope(CO2, YR, CO, yc, M.roof);
  // standing seams: thin lighter ribs along the outer slope every ~2 m (the copper-sheet joints) are in the material paint; a ridge roll along the deck edge
  for (let i = 0; i < R1.length; i++) { const a = R1[i], b = R1[(i + 1) % R1.length]; P.cyl(M.roofDark, [a[0], YR + 0.06, a[1]], [b[0], YR + 0.06, b[1]], 0.1, 0.1, 5, false); }

  // ---- chimney "battlement" along the outer cornice and a second row on the ridge deck corners
  const chim = (x, z, rot, h = 3.2, base = y0 - 0.1) => {
    P.push(x, 0, z, rot);
    P.box(M.chimney, -0.7, 0.7, base, base + h, -0.62, 0.62, 'b');
    P.box(M.chimneyCap, -0.88, 0.88, base + h, base + h + 0.28, -0.8, 0.8, 'b');
    P.pop();
  };
  let chimneys = 0;
  for (let i = 0; i < n; i++) {
    const a = R0[i], b = R0[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
    const rot = Math.atan2(-dz, dx) + 0;                 // local +x along the edge
    const k = Math.max(0, Math.round(l / 6.9) - (l < 4 ? 1 : 0));
    // skip the spans under the pavilions / portal (their attics cover them) and the corner arcs get one per segment pair
    for (let q = 0; q < k; q++) {
      const t = (q + 0.5) / k, px = a[0] + dx * t, pz = a[1] + dz * t;
      // inward normal (towards the roof centre)
      const nx = -dz / l, nz = dx / l, cx = (R0[0][0] + R0[Math.floor(n / 2)][0]) / 2, cz = (R0[0][1] + R0[Math.floor(n / 2)][1]) / 2;
      const s = ((cx - px) * nx + (cz - pz) * nz) > 0 ? 1 : -1;
      chim(px + nx * s * 1.7, pz + nz * s * 1.7, rot);
      chimneys++;
    }
  }
  // second row on the ridge deck
  for (let i = 0; i < R1.length; i++) {
    const a = R1[i], b = R1[(i + 1) % R1.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 6) continue;
    const k = Math.round(l / 7.6), rot = Math.atan2(-dz, dx), nx = -dz / l, nz = dx / l;
    const cx = (R1[0][0] + R1[Math.floor(R1.length / 2)][0]) / 2, cz = (R1[0][1] + R1[Math.floor(R1.length / 2)][1]) / 2;
    for (let q = 0; q < k; q++) { const t = (q + 0.5) / k, px = a[0] + dx * t, pz = a[1] + dz * t, s = ((cx - px) * nx + (cz - pz) * nz) > 0 ? 1 : -1; chim(px + nx * s * 1.2, pz + nz * s * 1.2, rot, 3.0, YR - 0.1); chimneys++; }
  }
  K.chimneys = chimneys;

  // ---- north pavilions: attics (walls to 25.6 are drawn with the edges), flat roof, frieze, pilasters
  const pavs = [
    { set: SPECIAL.pavW, a0: -59.9, a1: -46, b0: 3.8, b1: 19.05 },
    { set: SPECIAL.pavE, a0: -59.7, a1: -46, b0: -32.8, b1: -18.9 },
  ];
  const pe = ringEdges({ o: D.poly.o, h: [] }, 0.05);
  for (const pv of pavs) {
    const ring = [AB(pv.a0, pv.b0), AB(pv.a0, pv.b1), AB(pv.a1, pv.b1), AB(pv.a1, pv.b0)];
    P.cap(M.roof, ring, 25.62, true, 3);
    // attic walls on the inside (towards the main roof): two returns + the back
    P.push(C0.x, 0, C0.z, ROT);
    const x0 = -pv.b1, x1 = -pv.b0;                       // model x = -b
    P.box(M.wall, x0, x1, y0 + 2.0, 25.6, -53.0, pv.a1, 'tbk');
    P.pop();
    const edges = pe.filter((e) => pv.set.has(e.i));
    band(P, edges, 24.15, 24.5, 0.1, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: () => true });
    band(P, edges, 24.5, 24.9, 0.16, { front: K.mats.dentil, top: M.trim, under: M.trimShade }, { draw: () => true, uvs: 0.6 });
    band(P, edges, 24.9, 25.35, 0.44, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: () => true });
    band(P, edges, 25.35, 25.6 + 0.2, 0.2, { front: M.wall, top: M.trim, under: M.trimShade }, { draw: () => true });
    for (const e of edges) if (e.len > 5) onEdge(P, e, (len) => {
      // frieze: a relief band between the cornice and the attic windows, trophy plaques between pilasters
      K.strip(K.R.frieze, 0.6, len - 0.6, 22.35, 23.4, 0.1, 4);
      const k = Math.max(2, Math.round(len / 3.6));
      for (let q = 0; q <= k; q++) { const x = 0.7 + (len - 1.4) * q / k; K.pilaster(M.trim, x, 0.7, 21.7, 24.1, 0.16, 0.25); }
      for (let q = 0; q < k; q++) { const x = 0.7 + (len - 1.4) * (q + 0.5) / k; K.plane(K.R.trophy, x - 0.75, x + 0.75, 21.9, 23.3, 0.12); }
    });
  }

  // ---- east oval hall roof (flat, with a balustrade) and the west apse roof; the church rotunda on top of the apse
  const ovalPts = [AB(-5.9, -60.0)]; for (const e of pe.filter((x) => SPECIAL.oval.has(x.i))) ovalPts.push(e.b); ovalPts.push(AB(6.3, -60.0));
  // arc vertices: edge a points in order, then the last b
  const ovalRing = pe.filter((x) => SPECIAL.oval.has(x.i)).map((e) => e.a).concat([pe.filter((x) => SPECIAL.oval.has(x.i)).slice(-1)[0].b]);
  P.cap(M.roof, ovalRing, y0 + 0.02, true, 3);
  void ovalPts;
  for (let i = 0; i + 1 < ovalRing.length; i++) K.railing([ovalRing[i], ovalRing[i + 1]], y0, 0.9);
  const apseRing = pe.filter((x) => SPECIAL.apse.has(x.i)).map((e) => e.a).concat([pe.filter((x) => SPECIAL.apse.has(x.i)).slice(-1)[0].b]);
  const apseFull = [AB(6.3, 46.0)].concat(apseRing, [AB(-6.7, 46.0)]);
  P.cap(M.roof, apseFull, y0 + 0.02, true, 3);
  // rotunda: drum + green dome + lantern + cross over the apse (centre a = 0, b = 53.5)
  const [dx0, dz0] = AB(0.0, 53.5);
  const drumY0 = y0 + 0.0;
  P.cyl(M.court, [dx0, drumY0, dz0], [dx0, drumY0 + 2.6, dz0], 7.1, 7.1, 28, false);
  P.cyl(M.trim, [dx0, drumY0, dz0], [dx0, drumY0 + 0.4, dz0], 7.3, 7.3, 28, true);
  P.cyl(M.trim, [dx0, drumY0 + 2.3, dz0], [dx0, drumY0 + 2.7, dz0], 7.35, 7.35, 28, true);
  ringWindows(K, dx0, dz0, 7.1, 9, { x: 0, y: drumY0 + 0.7, w: 0.9, h: 1.5, head: 'arch', sw: 0.16, d: 0.1, surMat: M.trim, sill: false, frame: 'brown' }, 0.35, 28);
  dome(K, M.copper, dx0, drumY0 + 2.7, dz0, 7.2, 0.75);
  const domeTop = drumY0 + 2.7 + 1.18 * 7.2 * 0.75;
  P.cyl(M.court, [dx0, domeTop - 0.3, dz0], [dx0, domeTop + 1.9, dz0], 0.9, 0.8, 12, false);
  P.cyl(M.copper, [dx0, domeTop + 1.9, dz0], [dx0, domeTop + 2.4, dz0], 1.15, 0.2, 12, true);
  cross(K, M.gold, dx0, domeTop + 2.4, dz0, 2.6);
  K.dome = { x: dx0, z: dz0, top: domeTop + 5 };

  // ---- the belfry lantern with the gilded spire (dossier 8.1: (-807,-886) +-20 m, 64 m)
  const [sx, sz] = [-807, -886];
  const sy0 = y0 + 2.0;
  P.push(sx, 0, sz, ROT);
  P.box(M.court, -2.1, 2.1, sy0 - 3.5, sy0 + 3.0, -2.1, 2.1, 'b');                                  // square base of the belfry
  P.box(M.trim, -2.35, 2.35, sy0 + 3.0, sy0 + 3.4, -2.35, 2.35, 'b');
  P.pop();
  P.cyl(M.court, [sx, sy0 + 3.4, sz], [sx, sy0 + 8.0, sz], 1.9, 1.85, 8, false);                       // octagonal belfry
  ringWindows(K, sx, sz, 1.9, 8, { x: 0, y: sy0 + 4.2, w: 0.75, h: 2.6, head: 'arch', sw: 0.12, d: 0.08, surMat: M.trim, sill: false, frame: 'brown', v: 3 }, 0.39, 8);
  P.cyl(M.trim, [sx, sy0 + 8.0, sz], [sx, sy0 + 8.5, sz], 2.15, 2.15, 8, true);
  P.cyl(M.trim, [sx, sy0 + 3.4, sz], [sx, sy0 + 3.9, sz], 2.2, 2.2, 8, true);
  cup(K, M.gold, sx, sy0 + 8.5, sz, 1.45, 0.8);                                                         // gilded cap
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; P.cyl(M.gold, [sx + Math.cos(a) * 1.6, sy0 + 8.5, sz + Math.sin(a) * 1.6], [sx + Math.cos(a) * 1.3, sy0 + 11.2, sz + Math.sin(a) * 1.3], 0.16, 0.02, 4, false); }
  P.cyl(M.gold, [sx, sy0 + 9.4, sz], [sx, 60.6, sz], 0.5, 0.05, 8, false);                              // the needle
  P.cyl(M.gold, [sx, 59.8, sz], [sx, 60.4, sz], 0.2, 0.2, 6, false);
  P.geo(M.gold, new THREE.SphereGeometry(0.34, 8, 6), sx, 60.8, sz);
  cross(K, M.gold, sx, 61.0, sz, 3.0);
  K.spire = { x: sx, z: sz, top: 64 };

  // ---- the court: asphalt paving
  const courtPts = D.courtRing;
  P.cap(M.asphalt, courtPts, 0.03, true, 4);
  void W; void polyDist; void lathe; void DEG; void ringFlat;
}
