// landmarksCastle/precinct.js - the precinct of the castle and the Peter I monument (photos refs/summer-garden 104, 165): the round flower bed (~ 14 m) round the pedestal with a low granite kerb and a
// gravel ring, the two small round beds of Klenovaya alley (OSM w1256886049 / w1256886060), the services (benches read from the OSM furniture, crowd spots, photo spots).
// The lawns, avenue trees and footpaths of the square stay with environment / streets (they are generic but fine); nothing here stands on a carriageway.
import * as THREE from 'three';
import { FURNITURE, GREEN } from '../data/city.js';
import { MONUMENT, PORTAL_C } from './frame.js';

export function build(K, M, D, svc) {
  const ctx = K.ctx, P = K.P, tex = ctx.tex, T = ctx.mat.toon;
  const bed = T('#ffffff', { map: tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('lmC-bed');
    g.fillStyle = '#4f8a3a'; g.fillRect(0, 0, w, h);
    const pal = ['#d63a3a', '#f0c030', '#f2f0e6', '#e87aa0', '#e8803a', '#8a5ac8'];
    for (let i = 0; i < 900; i++) { g.fillStyle = pal[Math.floor(r() * pal.length)]; const x = r() * w, y = r() * h, s = 3 + r() * 5; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); }
    for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.5 ? '#3f7a30' : '#66a244'; g.fillRect(r() * w, r() * h, 4, 9); }
  }, { key: 'lmC-bed', repeat: [1, 1] }), name: 'lmC-bedMat', paint: 0.03, polygonOffset: -4 });
  const gravel = T('#c8a088', { name: 'lmC-gravel', paint: 0.06, polygonOffset: -3 });
  const disc = (cx, cz, r, y, mat, seg = 28, uvs = 4) => { const pts = []; for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } P.cap(mat, pts, y, true, uvs); };
  const ring = (cx, cz, r0, r1, y, mat, seg = 28) => {
    for (let i = 0; i < seg; i++) { const a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2; P.quad(mat, [cx + Math.cos(a) * r0, y, cz + Math.sin(a) * r0], [cx + Math.cos(b) * r0, y, cz + Math.sin(b) * r0], [cx + Math.cos(b) * r1, y, cz + Math.sin(b) * r1], [cx + Math.cos(a) * r1, y, cz + Math.sin(a) * r1], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  };
  const kerb = (cx, cz, r, seg = 28) => {
    for (let i = 0; i < seg; i++) {
      const a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2, x0 = cx + Math.cos(a) * r, z0 = cz + Math.sin(a) * r, x1 = cx + Math.cos(b) * r, z1 = cz + Math.sin(b) * r;
      const l = Math.hypot(x1 - x0, z1 - z0);
      P.push((x0 + x1) / 2, 0, (z0 + z1) / 2, Math.atan2(x1 - x0, z1 - z0));
      P.box(M.granite, -0.16, 0.16, 0, 0.3, -l / 2 - 0.02, l / 2 + 0.02, 'b');
      P.pop();
    }
  };
  const { x: mx, z: mz } = MONUMENT;
  // the monument bed: gravel ring r 4.9..6.4 round the steps, flowers r 6.4..8.2, granite kerb at 8.4
  ring(mx, mz, 4.9, 6.4, 0.08, gravel);
  ring(mx, mz, 6.4, 8.2, 0.09, bed);
  kerb(mx, mz, 8.35);
  // the Klenovaya beds
  for (const id of ['w1256886049', 'w1256886060']) {
    const g = GREEN.find((q) => q.id === id); if (!g) continue;
    const o = g.polys[0].o; let cx = 0, cz = 0; const n = o.length / 2; for (let i = 0; i < o.length; i += 2) { cx += o[i] / n; cz += o[i + 1] / n; }
    disc(cx, cz, 2.3, 0.09, bed, 20, 4); kerb(cx, cz, 2.45, 20);
  }
  // services
  for (const f of FURNITURE) if (f.kind === 'bench' && f.x > -800 && f.x < -600 && f.z > -960 && f.z < -600) svc.benches.push({ x: f.x, z: f.z });
  svc.crowd.push({ x: mx, z: mz + 11, r: 10, n: 6, name: 'peter' }, { x: PORTAL_C[0] + 2, z: PORTAL_C[1] + 10, r: 9, n: 8, name: 'portal' });
  svc.photoSpots.push({ x: PORTAL_C[0] + 3, z: PORTAL_C[1] + 22, yaw: 0, name: 'Михайловский замок: южный портал' });
  svc.photoSpots.push({ x: mx - 2, z: mz + 22, yaw: 0, name: 'Пётр I и замок' });
  void THREE;
}
