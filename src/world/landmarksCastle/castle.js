// landmarksCastle/castle.js - the walls of the Engineering Castle (Mikhailovsky zamok, V. Bazhenov / V. Brenna 1797-1801): the OSM relation r238571 outer ring (63 vertices: rounded corners, the two north
// pavilions, the south portal block, the west church apse, the east oval hall) and the 15-vertex court.  Every edge gets a facade in its own frame (kit.onEdge): dark grey granite plinth 2.5 m, three storeys
// (5 / 6.5 / 5 m) with grey-green marble window frames, string courses, a frieze of garlands under the cornice; orange-peach OUTSIDE (#e8a060), pink-salmon COURT (#e8a094) with beige trims and
// rusticated ground storey.  Windows are placed by arc length along CHAINS of edges, so the bay rhythm flows round the rounded corners.  Photos refs/summer-garden 107 111 135 120 143 247; dossier 8.1.
// Special edges (the portal block, the north loggia, the apse, the oval hall) are drawn by portal.js / north.js / church.js.
import * as THREE from 'three';
import { BUILDINGS } from '../data/city.js';
import { ringEdges, onEdge, band, localOnEdge } from './kit.js';
import { toAB, A_DIR, B_DIR, AB } from './frame.js';
import { chainsOf, chainBays, ringFlat } from './geo.js';

export const WING_M = 3.6;                         // free length at the portal end of the south wings (the colonnade pair stands there)
export const HC = 21.0, UP = 0.45;                 // cornice line / stone upstand of the outer walls
export const HC_COURT = 20.4;
export const SPECIAL = {
  portal: new Set([41, 42, 43]), pavW: new Set([9, 10, 11]), pavE: new Set([13, 14, 15]), loggia: new Set([12]),
  apse: new Set([53, 54, 55, 56, 57, 58, 59, 60, 61, 62]), apseRet: new Set([52, 0]), oval: new Set([24, 25, 26, 27, 28, 29, 30, 31, 32]),
};

export function castleData() {
  const rec = BUILDINGS.find((b) => b.id === 'r238571');
  const poly = rec.polys[0];
  const court = poly.h.reduce((best, h) => (h.length > best.length ? h : best), []);
  const body = { o: poly.o, h: [court] };
  const edges = ringEdges(body, 0.05);
  const outer = edges.filter((e) => !e.hole), inner = edges.filter((e) => e.hole);
  return { rec, poly: body, outer, inner, outerRing: ringFlat(poly.o), courtRing: ringFlat(court) };
}
export const edgeKind = (e) => {
  if (e.hole) return 'court';
  for (const [k, s] of Object.entries(SPECIAL)) if (s.has(e.i)) return k;
  return 'plain';
};

/** the window / ornament vocabulary of one bay, drawn in the frame of the chain sample (x = 0 is the bay axis, z out of the wall) */
function capCornice(K, mat, x, yTop, w, d = 0.34, h = 0.3) {
  const P = K.P;
  P.box(mat, x - w / 2, x + w / 2, yTop, yTop + h, 0, d, 'kb');
  P.box(mat, x - w / 2 + 0.1, x + w / 2 - 0.1, yTop + h, yTop + h + 0.12, 0, d - 0.1, 'kb');
}
function bracketSill(K, mat, x, y, w, d = 0.3) {
  const P = K.P;
  P.box(mat, x - w / 2 - 0.12, x + w / 2 + 0.12, y - 0.16, y, 0, d, 'k');
  for (const s of [-1, 1]) P.box(mat, x + s * (w / 2 - 0.1) - 0.07, x + s * (w / 2 - 0.1) + 0.07, y - 0.7, y - 0.16, 0, d * 0.7, 'kb');
}
/** a barred basement opening: dark pane + three iron bars */
function slit(P, M, y0, h, z, w) {
  P.quad(M.dark, [-w / 2, y0, z], [w / 2, y0, z], [w / 2, y0 + h, z], [-w / 2, y0 + h, z], [0, 0, 1]);
  for (const x of [-w / 4, 0, w / 4]) P.box(M.iron, x - 0.02, x + 0.02, y0, y0 + h, z, z + 0.04, 'kb');
}
export function bayOuter(K, M, o = {}) {
  const P = K.P, tr = M.trim;
  // basement slit with a grating
  slit(P, M, 0.95, 0.7, 0.17, 0.9); P.box(M.plinthTop, -0.55, 0.55, 0.78, 0.95, 0.14, 0.26, 'kb'); P.box(M.plinthTop, -0.55, 0.55, 1.65, 1.8, 0.14, 0.26, 'kb');
  // ground storey: grey-green frame + small cornice cap
  K.window({ x: 0, y: 3.75, w: 1.25, h: 2.15, sw: 0.2, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: o.v0 ?? 1 });
  capCornice(K, tr, 0, 3.75 + 2.15 + 0.2, 1.85, 0.3, 0.22);
  // piano nobile: taller window, cornice slab on brackets, sill on brackets
  K.window({ x: 0, y: 8.85, w: 1.4, h: 3.1, sw: 0.24, d: 0.12, surMat: tr, sill: false, frame: 'brown', v: o.v1 ?? 0 });
  bracketSill(K, tr, 0, 8.85, 1.4);
  capCornice(K, tr, 0, 8.85 + 3.1 + 0.24, 2.1, 0.4, 0.3);
  // top storey: plain frame
  K.window({ x: 0, y: 15.2, w: 1.2, h: 1.95, sw: 0.17, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: o.v2 ?? 2 });
}
export function bayArch(K, M) {
  const P = K.P, tr = M.trim;
  slit(P, M, 0.95, 0.7, 0.17, 0.9); P.box(M.plinthTop, -0.55, 0.55, 0.78, 0.95, 0.14, 0.26, 'kb'); P.box(M.plinthTop, -0.55, 0.55, 1.65, 1.8, 0.14, 0.26, 'kb');
  K.window({ x: 0, y: 3.6, w: 1.3, h: 3.2, sw: 0.22, d: 0.12, surMat: tr, head: 'arch', sill: false, frame: 'brown', v: 0 });
  K.window({ x: 0, y: 8.8, w: 1.5, h: 4.2, sw: 0.26, d: 0.14, surMat: tr, head: 'arch', sill: false, frame: 'brown', v: 2 });
  bracketSill(K, tr, 0, 8.8, 1.5);
  K.window({ x: 0, y: 15.2, w: 1.2, h: 1.95, sw: 0.17, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: 1 });
}
export function bayCourt(K, M, o = {}) {
  const P = K.P, tr = M.courtTrim;
  slit(P, M, 0.8, 0.65, 0.15, 0.9); P.box(M.plinthTop, -0.55, 0.55, 0.65, 0.8, 0.12, 0.22, 'kb'); P.box(M.plinthTop, -0.55, 0.55, 1.45, 1.6, 0.12, 0.22, 'kb');
  K.window({ x: 0, y: 3.2, w: 1.2, h: 2.25, sw: 0.18, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: o.v0 ?? 2 });
  capCornice(K, tr, 0, 3.2 + 2.25 + 0.18, 1.7, 0.28, 0.2);
  K.window({ x: 0, y: 8.0, w: 1.3, h: 2.9, sw: 0.22, d: 0.11, surMat: tr, sill: false, frame: 'brown', v: o.v1 ?? 0 });
  bracketSill(K, tr, 0, 8.0, 1.3, 0.26);
  if (o.alt) K.hood(tr, 'tri', 0, 8.0 + 2.9 + 0.22, 1.3 + 2 * 0.22 + 0.4, 0.55, 0.3); else capCornice(K, tr, 0, 8.0 + 2.9 + 0.22, 2.0, 0.36, 0.26);
  K.window({ x: 0, y: 14.4, w: 1.1, h: 1.8, sw: 0.15, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: o.v2 ?? 1 });
  K.plane(K.R.cartouche, -0.6, 0.6, 16.6, 17.8, 0.05);                                                    // medallion between the top windows and the cornice
}

export function buildWalls(K, M, D, colliders) {
  const P = K.P;
  const { outer, inner } = D;
  const outerOk = (e) => !SPECIAL.portal.has(e.i);
  // ---- wall faces: outer ring (not the portal block) and the court
  for (const e of outer) {
    if (!outerOk(e)) continue;
    const pav = SPECIAL.pavW.has(e.i) || SPECIAL.pavE.has(e.i);
    onEdge(P, e, (len) => { K.wallQuad(M.wall, 0, len, 0, pav ? 25.6 : HC + UP, 3); });
  }
  for (const e of inner) {
    const exit = isExitEdge(e);
    onEdge(P, e, (len) => {
      if (exit) {
        const u = localOnEdge(e, ...AB(36.9, -6.6)).u;
        K.wallWithHoles(M.rustCourt, 0, len, 0, 7.0, [{ x: u, y0: 0, w: 4.6, h: 6.0, head: 'flat' }], 2.4, 1.2);
        K.wallQuad(M.court, 0, len, 7.0, HC_COURT + UP, 3);
        // lintel frame of the passage
        P.box(M.courtTrim, u - 2.9, u + 2.9, 6.0, 6.7, 0, 0.3, 'kb'); P.box(M.courtTrim, u - 2.9, u - 2.3, 0.0, 6.0, 0, 0.25, 'kb'); P.box(M.courtTrim, u + 2.3, u + 2.9, 0.0, 6.0, 0, 0.25, 'kb');
        return;
      }
      K.wallQuad(M.rustCourt, 0, len, 0, 7.0, 2.4, 0, 1.2);
      K.wallQuad(M.court, 0, len, 7.0, HC_COURT + UP, 3);
    });
  }
  // ---- bands: plinth, string courses, cornice (mitred rings)
  const draw = (e) => e.len >= 0.3;
  const drawOuter = (e) => draw(e) && outerOk(e);
  band(P, outer, 0, 2.5, 0.14, { front: M.plinth, top: M.plinthTop }, { draw: drawOuter, uvs: 1 });
  band(P, outer, 7.4, 7.85, 0.14, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: drawOuter });
  band(P, outer, 13.75, 14.15, 0.14, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: drawOuter });
  band(P, outer, 19.2, 19.55, 0.1, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: drawOuter });                  // under the frieze
  band(P, outer, 19.9, 20.3, 0.16, { front: K.mats.dentil, top: M.trim, under: M.trimShade }, { draw: drawOuter, uvs: 0.6 });  // dentils
  band(P, outer, 20.3, 20.75, 0.46, { front: M.trim, top: M.trim, under: M.trimShade }, { draw: drawOuter });                  // corona
  band(P, outer, 20.75, HC + UP, 0.22, { front: M.wall, top: M.trim, under: M.trimShade }, { draw: drawOuter });
  // frieze (garlands) between 19.55 and 19.9: a white relief strip
  for (const e of outer) if (drawOuter(e) && e.len > 2) onEdge(P, e, (len) => K.strip(K.R.frieze, 0.6, len - 0.6, 19.55, 19.95, 0.1, 4));
  // court
  band(P, inner, 0, 2.0, 0.12, { front: M.plinth, top: M.plinthTop }, { draw });
  band(P, inner, 6.75, 7.1, 0.12, { front: M.courtTrim, top: M.courtTrim, under: M.trimShade }, { draw });
  band(P, inner, 13.2, 13.55, 0.12, { front: M.courtTrim, top: M.courtTrim, under: M.trimShade }, { draw });
  band(P, inner, 18.2, 18.5, 0.1, { front: M.courtTrim, top: M.courtTrim, under: M.trimShade }, { draw });
  band(P, inner, 18.8, 19.15, 0.14, { front: K.mats.dentil, top: M.courtTrim, under: M.trimShade }, { draw, uvs: 0.6 });
  band(P, inner, 19.15, 19.6, 0.4, { front: M.courtTrim, top: M.courtTrim, under: M.trimShade }, { draw });
  band(P, inner, 19.6, HC_COURT + UP, 0.2, { front: M.court, top: M.courtTrim, under: M.trimShade }, { draw });

  // ---- windows by chains of edges
  let bayCount = 0;
  const place = (bays, fn) => { for (const b of bays) { P.push(b.x, 0, b.z, b.rot); try { fn(b); } finally { P.pop(); } bayCount++; } };
  // plain outer walls: bays flow round the rounded corners
  K.wingPitch = {};
  for (const ch of chainsOf(outer, (e) => edgeKind(e) === 'plain')) {
    const m0 = ch[0].i === 44 ? WING_M : 0.9, m1 = ch[ch.length - 1].i === 40 ? WING_M : 0.9, bays = chainBays(ch, 3.9, m0, 1.5, m1);
    if (bays.length && (ch[0].i === 44 || ch[ch.length - 1].i === 40)) K.wingPitch[ch[0].i === 44 ? 'W' : 'E'] = (bays[0].L - m0 - m1) / bays[0].n;
    place(bays, (b) => bayOuter(K, M, { v0: (b.i * 3) % 4, v1: (b.i * 5 + 1) % 4, v2: (b.i * 7 + 2) % 4 }));
  }
  // pavilion fronts and returns (narrow returns: one bay) and the loggia back wall
  for (const set of [SPECIAL.pavW, SPECIAL.pavE]) for (const e of outer.filter((x) => set.has(x.i))) place(chainBays([e], 3.7, 0.6, 1.2), (b) => bayOuter(K, M, { v0: b.i % 4 }));
  for (const e of outer.filter((x) => SPECIAL.apseRet.has(x.i))) place(chainBays([e], 3.9, 1.0, 1.2), (b) => bayOuter(K, M, {}));
  // the church apse and the east oval hall: arched windows round the curve
  for (const [set, pitch] of [[SPECIAL.apse, 3.2], [SPECIAL.oval, 3.4]]) place(chainBays(outer.filter((x) => set.has(x.i)), pitch, 0.7, 1.2), () => bayArch(K, M));
  // court: windows by chains (the octagon: one chain per side)
  for (const ch of chainsOf(inner, () => true, 0.3)) place(chainBays(ch, 3.4, 0.8, 1.8), (b) => bayCourt(K, M, { alt: b.i % 2 === 0 }));
  K.bayCount = bayCount;

  // ---- colliders: thin walls on every edge, the gate openings left free
  if (colliders) {
    const ph = K.ctx.physics;
    const gate = { w: 4.6, c: AB(56.4, -6.6) };
    const wall = (a, b, thick, y1, gaps = []) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.3) return;
      const ux = dx / l, uz = dz / l, rot = Math.atan2(-dz, dx);
      const pieces = []; let s0 = 0;
      for (const g of gaps) { if (g[0] > s0 + 0.05) pieces.push([s0, g[0]]); s0 = Math.max(s0, g[1]); }
      if (s0 < l - 0.05) pieces.push([s0, l]);
      for (const [t0, t1] of pieces) { const len = t1 - t0; if (len < 0.25) continue; ph.addBox(a[0] + ux * (t0 + t1) / 2, a[1] + uz * (t0 + t1) / 2, len + thick * 0.5, thick, rot, 0, y1); }
    };
    void gate;
    for (const e of outer) {
      if (SPECIAL.portal.has(e.i)) { if (e.i !== 42) wall(e.a, e.b, 0.9, 22); else wall(e.a, e.b, 0.9, 22, gapOf(e, AB(56.4, -6.6), 2.3)); continue; }
      wall(e.a, e.b, 0.9, 22);
    }
    for (const e of inner) {
      // the court wall opposite the portal (court south wall, a ~ 36.9) has the tunnel exit
      const isExit = isExitEdge(e);
      wall(e.a, e.b, 0.9, 21, isExit ? gapOf(e, AB(36.9, -6.6), 2.3) : []);
    }
    // the passage under the south wing: two side walls from the gate to the court
    for (const s of [-1, 1]) { const a0 = AB(56.4, -6.6 + s * 2.3), a1 = AB(36.9, -6.6 + s * 2.3); wall(a0, a1, 0.6, 7); }
  }
  return { bayCount };
}
export function isExitEdge(e) { if (!e.hole) return false; const mid = [(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2], ab = toAB(mid[0], mid[1]); return ab[0] > 34 && Math.abs(ab[1] + 7) < 14 && e.len > 20; }
function gapOf(e, c, half) {
  const dx = e.b[0] - e.a[0], dz = e.b[1] - e.a[1], l = Math.hypot(dx, dz), t = ((c[0] - e.a[0]) * dx + (c[1] - e.a[1]) * dz) / l;
  return [[t - half, t + half]];
}
void THREE; void A_DIR; void B_DIR;
