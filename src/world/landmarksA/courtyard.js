// landmarksA/courtyard.js - the two courtyards behind the gateways of the station front (docs/research/station.md "Inner courtyard", photos SP/refs/station 12-14):
// the west yard (u -60..-28.5, d 19.4..143, between the west wing / annexes and the stem) and the east yard (u 22.8..48, d 21..143): granite-cobble paving in 2.4 m cells wherever no
// building or road lies, round white-and-red benches around planters, black "historic" lanterns, a couple of litter bins.  Colliders for the furniture only.
import * as THREE from 'three';
import { Parts, TH, W, O, wbox } from './common.js';
import * as L from '../layout.js';

export function buildCourtyard(Cc) {
  const { ctx, M, T } = Cc;
  const P = new Parts();
  const tex = ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('courtyard-cobble');
    g.fillStyle = '#7d766d'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const t = 0.88 + r() * 0.24; g.fillStyle = `rgb(${Math.round(150 * t)},${Math.round(142 * t)},${Math.round(133 * t)})`; g.fillRect(i * 16 + 1, j * 16 + 1, 14, 14); }
  }, { key: 'st_cobble', repeat: [1, 1] });
  const pav = T('#ffffff', { map: tex, paint: 0.04 });
  P.push(O.x, 0, O.z, TH);
  const CELL = 2.4, UVS = 4.8;
  for (const [u0, u1, d0, d1] of [[-60, -28.6, 19.6, 143.5], [22.9, 49, 21, 143.5]]) {
    for (let u = u0; u < u1; u += CELL) for (let d = d0; d < d1; d += CELL) {
      const pts = [[u + 0.2, d + 0.2], [u + CELL - 0.2, d + 0.2], [u + CELL - 0.2, d + CELL - 0.2], [u + 0.2, d + CELL - 0.2], [u + CELL / 2, d + CELL / 2]];
      let ok = true;
      for (const [pu, pd] of pts) { const [x, z] = W(pu, pd); if (L.insideBuilding(x, z, 0.1) || L.isOnRoad(x, z, 0.2)) { ok = false; break; } }
      if (!ok) continue;
      P.quad(pav, [u, 0.016, d], [u, 0.016, d + CELL], [u + CELL, 0.016, d + CELL], [u + CELL, 0.016, d], [0, 1, 0], [[u / UVS, d / UVS], [u / UVS, (d + CELL) / UVS], [(u + CELL) / UVS, (d + CELL) / UVS], [(u + CELL) / UVS, d / UVS]]);
    }
  }
  // round benches (white + red slats) around a planter, black lanterns
  const white = T('#efece4'), red = T('#b0302d'), iron = M.iron, glow = ctx.mat.emissive('#ffe2a6', 1.0), soil = T('#4e7a3a', { paint: 0.12 });
  const ring = (u, d) => {
    P.cyl(white, u, d, 0, 0.55, 1.1, 1.1, 14); P.cyl(soil, u, d, 0.55, 0.62, 1.0, 1.0, 12);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 2.0; P.push(u + Math.cos(a) * r, 0, d + Math.sin(a) * r, -a); P.box(i % 2 ? white : red, -0.45, 0.45, 0.4, 0.5, -0.22, 0.22); P.box(white, -0.4, 0.4, 0, 0.4, -0.12, 0.12); P.pop(); }
    ctx.physics.addCylinder(...W(u, d), 2.4, 0, 1);
  };
  const lantern = (u, d) => {
    P.box(iron, u - 0.2, u + 0.2, 0, 0.5, d - 0.2, d + 0.2); P.cyl(iron, u, d, 0.5, 3.8, 0.07, 0.05, 6); P.cyl(iron, u, d, 3.8, 3.95, 0.18, 0.18, 6);
    P.cyl(glow, u, d, 3.95, 4.5, 0.2, 0.28, 6); P.cyl(iron, u, d, 4.5, 4.62, 0.3, 0.04, 6);
    ctx.physics.addCylinder(...W(u, d), 0.25, 0, 4);
  };
  const spots = [];
  for (const [u, d] of [[-44, 62], [-44, 110]]) { if (!L.insideBuilding(...W(u, d), 2.5)) { ring(u, d); } }
  for (const [u, d] of [[-38, 40], [-52, 52], [-36, 85], [-36, 120], [30, 40], [30, 90], [38, 130]]) { const [x, z] = W(u, d); if (!L.insideBuilding(x, z, 1) && !L.isOnRoad(x, z, 0.5)) lantern(u, d); }
  P.pop();
  const g = new THREE.Group(); g.name = 'station-courtyards';
  P.build(g, {});
  ctx.addStatic(g);
  Cc.parts.courtyardTris = P.tris;
  return g;
}
