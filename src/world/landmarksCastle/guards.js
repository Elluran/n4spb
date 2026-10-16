// landmarksCastle/guards.js - the two KORDEGARDIYA guardhouses at the entrance of Klenovaya alley (OSM w28691665 West pavilion Inzhenernaya 8 at (-704, -649), w28691666 East pavilion Inzhenernaya 10 at
// (-643, -646); photos refs/summer-garden 165, 167; dossier 8.3): three-storey orange pavilions (#e8a060, cornice ~ 15 m) with a banded cream-yellow (#ecd9a0) Tuscan portico of four columns and a round-arched
// door on the face that looks at the avenue, rounded corners and a curved south face, first-floor window with balcony over the portico, low hipped green roof.  Windows by chains like the castle.
import * as THREE from 'three';
import { BUILDINGS } from '../data/city.js';
import { ringEdges, band, onEdge } from './kit.js';
import { chainBays, chainsOf } from './geo.js';

const HC = 14.6;
function bay(K, M) {
  const tr = M.cream, P = K.P;
  K.window({ x: 0, y: 1.9, w: 1.3, h: 2.3, sw: 0.2, d: 0.1, surMat: tr, frame: 'brown', v: 1 });
  K.window({ x: 0, y: 6.2, w: 1.35, h: 3.0, sw: 0.22, d: 0.12, surMat: tr, sill: true, frame: 'brown', v: 0 });
  P.box(tr, -1.0, 1.0, 6.2 + 3.0 + 0.22, 6.2 + 3.0 + 0.5, 0, 0.35, 'kb');
  K.window({ x: 0, y: 11.0, w: 1.2, h: 1.9, sw: 0.16, d: 0.1, surMat: tr, sill: true, frame: 'brown', v: 2 });
}

function pavilion(K, M, id, towardX, svc) {
  const P = K.P, ph = K.ctx.physics;
  const rec = BUILDINGS.find((b) => b.id === id); if (!rec) return;
  const poly = { o: rec.polys[0].o, h: [] };
  const edges = ringEdges(poly, 0.05);
  // the portico face: a 9.5..11 m edge whose normal looks along towardX (+1 / -1) most closely
  let best = null;
  for (const e of edges) if (e.len > 8.5 && e.len < 12.5) { const d = e.n[0] * towardX; if (d > 0.75 && (!best || d > best.d)) best = { e, d }; }
  const pe = best && best.e;
  for (const e of edges) onEdge(P, e, (len) => { K.wallQuad(M.guardWall, 0, len, 0, HC + 0.4, 3); });
  band(P, edges, 0, 1.2, 0.1, { front: M.graniteWarm, top: M.graniteWarm }, { draw: (e) => e.len > 0.3 });
  band(P, edges, 5.0, 5.3, 0.1, { front: M.cream, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3 });
  band(P, edges, 10.0, 10.3, 0.1, { front: M.cream, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3 });
  band(P, edges, HC - 1.3, HC - 0.9, 0.12, { front: M.cream, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3 });
  band(P, edges, HC - 0.9, HC - 0.45, 0.16, { front: K.mats.dentil, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3, uvs: 0.6 });
  band(P, edges, HC - 0.45, HC, 0.5, { front: M.cream, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3 });
  band(P, edges, HC, HC + 0.4, 0.22, { front: M.guardWall, top: M.cream, under: M.trimShade }, { draw: (e) => e.len > 0.3 });
  // windows by chains (not on the portico edge)
  for (const ch of chainsOf(edges, (e) => e !== pe, 0.6)) for (const b of chainBays(ch, 4.0, 1.0, 1.5)) { P.push(b.x, 0, b.z, b.rot); try { bay(K, M); } finally { P.pop(); } }
  // the portico
  if (pe) onEdge(P, pe, (len) => {
    const cx = len / 2, ZC = 1.5, ys = 0.45;
    P.box(M.graniteWarm, cx - 5.0, cx + 5.0, 0, ys, 0, 3.0, 'b'); P.box(M.graniteWarm, cx - 1.2, cx + 1.2, 0, 0.22, 3.0, 3.6, 'b');
    for (let i = 0; i < 4; i++) {
      const x = cx - 3.45 + i * 2.3;
      P.cyl(M.guardCol, [x, ys, ZC], [x, 5.1, ZC], 0.5, 0.44, 16, false);
      for (let k = 0; k < 7; k++) P.cyl(M.guardWall, [x, ys + 0.5 + k * 0.7, ZC], [x, ys + 0.56 + k * 0.7, ZC], 0.52, 0.52, 14, false);   // rustication bands
      P.box(M.guardCol, x - 0.62, x + 0.62, ys, ys + 0.3, ZC - 0.62, ZC + 0.62, 'b'); P.box(M.guardCol, x - 0.62, x + 0.62, 5.1, 5.4, ZC - 0.62, ZC + 0.62, 'b');
      const c = [pe.a[0] + (pe.b[0] - pe.a[0]) * (x / len) + pe.n[0] * ZC, pe.a[1] + (pe.b[1] - pe.a[1]) * (x / len) + pe.n[1] * ZC];
      // frame goes from the left end seen from the street: use the edge direction sign through the left end
      void c;
    }
    P.box(M.cream, cx - 4.6, cx + 4.6, 5.4, 6.5, 0, ZC + 0.9, 'b');
    P.box(M.cream, cx - 4.8, cx + 4.8, 6.5, 6.8, 0, ZC + 1.1, 'b');
    for (let x = cx - 4.5; x < cx + 4.6; x += 0.34) P.box(M.cream, x - 0.07, x + 0.07, 6.8, 7.6, ZC + 0.6, ZC + 0.8, 'tb');
    P.box(M.cream, cx - 4.7, cx + 4.7, 7.6, 7.8, ZC + 0.5, ZC + 1.0, 'b');
    K.gate(cx, ys, 1.9, 3.9, { sw: 0.3, d: 0.14, ringMat: M.cream, doorMat: K.mats.doorWood });
    K.window({ x: cx, y: 8.1, w: 1.6, h: 3.4, sw: 0.26, d: 0.12, surMat: M.cream, frame: 'brown', v: 0, sill: false });
  });
  // roof: low hip (a flat deck with a skirt of copper) + chimneys
  const ring = []; for (let i = 0; i < poly.o.length; i += 2) ring.push([poly.o[i], poly.o[i + 1]]);
  P.cap(M.guardRoof, ring, HC + 0.42, true, 3);
  let cx = 0, cz = 0; for (const p of ring) { cx += p[0] / ring.length; cz += p[1] / ring.length; }
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { P.box(M.chimney, cx + dx - 0.6, cx + dx + 0.6, HC + 0.4, HC + 3.2, cz + dz - 0.55, cz + dz + 0.55, 'b'); P.box(M.chimneyCap, cx + dx - 0.78, cx + dx + 0.78, HC + 3.2, HC + 3.45, cz + dz - 0.72, cz + dz + 0.72, 'b'); }
  // colliders (thin walls)
  for (const e of edges) { if (e.len < 0.3) continue; ph.addBox((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, e.len + 0.4, 0.9, Math.atan2(-(e.b[1] - e.a[1]), e.b[0] - e.a[0]), 0, HC + 1); }
  svc.entrances.push({ x: cx, z: cz, name: rec.name });
}

export function build(K, M, D, svc) {
  pavilion(K, M, 'w28691665', 1, svc);
  pavilion(K, M, 'w28691666', -1, svc);
  void THREE;
}
