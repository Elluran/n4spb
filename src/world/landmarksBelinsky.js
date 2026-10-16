// Fontanka 3 and Mokhovaya 48. Exterior landmarks fitted to the mapped parcels.
// User photo references (2026-10-04) govern colour, silhouette and ornament.
// Circus dome diameter: circus.spb.ru/about.html (49.7 m). No live show posters.
import * as THREE from 'three';
import { Parts } from './landmarksD/kit.js';
import * as G from './landmarksK/geo.js';
import { human, cached } from './lib/figures.js';

export const OWNS_GROUPS = true;


function window(P, M, x, y, w, h, z, door = false) {
  const outer = G.archPts(x, y, w + 0.5, h + 0.3, 16), inner = G.archPts(x, y + 0.15, w, h, 16);
  G.planeShape(P, door ? M.door : M.glass, inner, z + 0.035);
  G.frameRing(P, M.white, outer, inner, z, 0.14);
  P.box(M.white, x - w / 2 - 0.3, x + w / 2 + 0.3, y - 0.14, y + 0.08, z - 0.02, z + 0.28);
  P.box(door ? M.doorTrim : M.white, x - 0.035, x + 0.035, y + 0.15, y + h - 0.12, z + 0.08, z + 0.13);
  if (!door) P.box(M.white, x - w / 2, x + w / 2, y + h * 0.65, y + h * 0.65 + 0.07, z + 0.08, z + 0.13);
}

function pilaster(P, M, x, y0, y1, z, w = 0.65) {
  P.box(M.white, x - w / 2, x + w / 2, y0, y1, z, z + 0.22);
  for (const [y, h, grow] of [[y0, 0.4, 0.2], [y1 - 0.35, 0.2, 0.15], [y1 - 0.15, 0.15, 0.27]]) P.box(M.white, x - w / 2 - grow, x + w / 2 + grow, y, y + h, z - 0.07, z + 0.34);
}

function roof(P, mat, x0, x1, z0, z1, y, rise) {
  const zm = (z0 + z1) / 2;
  P.fan(mat, [[x0, y, z0], [x1, y, z0], [x1 - 1, y + rise, zm], [x0 + 1, y + rise, zm]], [0, 1, -1]);
  P.fan(mat, [[x1, y, z1], [x0, y, z1], [x0 + 1, y + rise, zm], [x1 - 1, y + rise, zm]], [0, 1, 1]);
  P.fan(mat, [[x0, y, z1], [x0, y, z0], [x0 + 1, y + rise, zm]], [-1, 1, 0]);
  P.fan(mat, [[x1, y, z0], [x1, y, z1], [x1 - 1, y + rise, zm]], [1, 1, 0]);
}

function dome(P, mat, x, z, y, radius, rise, key, ribs = null) {
  const prof = Array.from({ length: 21 }, (_, i) => { const a = i / 20 * Math.PI / 2; return [radius * Math.cos(a), rise * Math.sin(a)]; });
  G.lathe(P, mat, key, prof, x, y, z, 1, 1, 64, 25);
  if (ribs) for (let k = 0; k < 64; k++) for (let i = 0; i < 16; i++) {
    const a = k / 64 * Math.PI * 2;
    const q = (t) => [x + (radius + 0.045) * Math.cos(t) * Math.sin(a), y + rise * Math.sin(t) + 0.035, z + (radius + 0.045) * Math.cos(t) * Math.cos(a)];
    P.cyl(ribs, q(i / 16 * Math.PI / 2), q((i + 1) / 16 * Math.PI / 2), 0.028, 0.028, 4, false);
  }
}

function sign(ctx, P, text, x, y, z, w, h, color, bg) {
  const map = ctx.tex.draw(1024, 128, (g, cw, ch) => {
    g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
    g.fillStyle = color; g.font = 'bold 66px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2, cw - 32);
  }, { key: 'belinsky-sign-' + text });
  const mat = ctx.mat.toon('#ffffff', { map, name: 'belinsky-sign' });
  P.quad(mat, [x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y + h, z], [x - w / 2, y + h, z], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}

function circus(ctx, P, M) {
  // +z faces the entrance plaza (SE); the arena occupies the broad rear drum.
  const origin = [-576, -695], rot = 0.596;
  P.push(origin[0], 0, origin[1], rot);
  G.tube(P, M.yellow, 0, -4, 0, 12.8, 24.85, 24.85, 64);
  G.tube(P, M.white, 0, -4, 0.15, 0.65, 25, 25, 64);
  G.tube(P, M.white, 0, -4, 12.4, 13.2, 25.25, 25.25, 64);
  dome(P, M.circusRoof, 0, -4, 13.2, 24.85, 13.2, 'ciniselli-dome', M.roofSeam);
  G.tube(P, M.yellow, 0, -4, 26.1, 28.1, 3.3, 3.3, 32);
  G.tube(P, M.white, 0, -4, 28, 28.3, 3.65, 3.65, 32);
  dome(P, M.circusRoof, 0, -4, 28.3, 3.6, 1.0, 'ciniselli-lantern');
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; P.cyl(M.glass, [Math.sin(a) * 3.32, 27.1, -4 + Math.cos(a) * 3.32], [Math.sin(a) * 3.4, 27.1, -4 + Math.cos(a) * 3.4], 0.42, 0.42, 12); }
  P.cyl(M.roofSeam, [0, 29.2, -4], [0, 31, -4], 0.055, 0.025, 6);
  // Low side foyer with repeated rectangular windows and pale rusticated walls.
  for (const side of [-1, 1]) {
    P.box(M.yellow, side < 0 ? -24.2 : 18.5, side < 0 ? -18.5 : 24.2, 0, 11.7, -31, 20);
    G.onFace(P, side * 24.2, 0, side, 0, () => {
      for (const y of [3, 7.4]) for (let x = -23; x <= 20; x += 5.5) window(P, M, x, y, 2.2, 2.8, 0);
      for (const y of [0.5, 6.4, 11.3]) P.box(M.white, -31, 20, y, y + 0.25, 0, 0.22);
    });
  }
  P.box(M.yellow, -22, 22, 0, 18.4, 16, 26);
  P.box(M.stone, -22.3, 22.3, 0, 0.65, 16, 26.3);
  // White cornices, paired Corinthian-like pilasters and rustication courses.
  for (const [y, h, depth] of [[6, 0.28, 0.35], [7.2, 0.3, 0.35], [16.8, 0.3, 0.45], [18, 0.45, 0.8]]) P.box(M.white, -22.4, 22.4, y, y + h, 25.8, 26 + depth);
  for (let y = 1.4; y < 6; y += 0.75) P.box(M.yellowShade, -22, 22, y, y + 0.035, 26.01, 26.035);
  for (const x of [-21, -15.2, -13.5, -6, -4.4, 4.4, 6, 13.5, 15.2, 21]) pilaster(P, M, x, 7.5, 16.6, 26.08, 0.65);
  const statue = cached('ciniselli-muse', () => human({ body: { sex: 'f', muscle: 0.2 }, outfit: { torso: 'dress', hem: 0.94, flare: 0.2, folds: 0.035, sleeves: 'none', trousers: 'none', cape: 'mantle' }, detail: 1 }));
  const statueMats = { main: M.white, dark: M.whiteShade, accent: M.white, skin: M.white, cloth: M.white, hair: M.whiteShade };
  for (const x of [-9.6, 0, 9.6]) {
    window(P, M, x, 8.1, 5.4, 7.3, 26.1);
    P.box(M.white, x - 1.15, x + 1.15, 7.6, 8.2, 26.2, 27.6);
    statue.place(P, statueMats, x, 8.2, 27, 0, 2.35);
    window(P, M, x, 0.65, 3.4, 4.8, 26.06, true);
    // Wooden door panels, handles and the glazed transom.
    for (const dx of [-0.85, 0.85]) for (const y of [1.2, 2.8]) P.box(M.doorTrim, x + dx - 0.55, x + dx + 0.55, y, y + 1.1, 26.18, 26.21);
  }
  // Ornament on the two outer panels: oval cartouches and paired scrolls.
  const ring = new THREE.TorusGeometry(1, 0.10, 6, 28);
  for (const x of [-18, 18]) {
    P.geo(M.white, ring, x, 11.4, 26.22, 0, 0, 0, 1.3, 2.1, 1);
    for (const y of [9.1, 13.8]) for (const dx of [-0.8, 0.8]) P.geo(M.white, ring, x + dx, y, 26.22, 0, 0, 0, 0.48, 0.65, 0.45);
    for (const y of [15.7, 17.45]) G.ball(P, M.white, x, y, 26.3, 0.36);
  }
  // Dentils and rosettes below the rich entablature.
  for (let x = -21.5; x <= 21.5; x += 0.8) P.box(M.white, x - 0.14, x + 0.14, 17.6, 17.95, 26, 26.48);
  for (let x = -20; x <= 20; x += 2) {
    P.geo(M.white, ring, x, 17.2, 26.35, 0, 0, 0, 0.22, 0.22, 0.22);
    G.ball(P, M.white, x, 17.2, 26.4, 0.1);
  }
  // Attic with three raised crests; the middle allegorical sculptural group.
  P.box(M.yellow, -22, 22, 18.4, 20.8, 24.8, 26.2);
  for (const x of [-17.5, 0, 17.5]) {
    G.solid(P, M.white, [[x - 4, 20.6], [x + 4, 20.6], [x + 2, 22.3], [x, 23.1], [x - 2, 22.3]], 25.9, 0.5);
    G.planeShape(P, M.yellowShade, [[x - 3.4, 20.9], [x + 3.4, 20.9], [x, 22.6]], 26.44);
    P.geo(M.white, ring, x, 21.65, 26.55, 0, 0, 0, 0.5, 0.72, 0.5);
  }
  for (const x of [-2.4, 0, 2.4]) statue.place(P, statueMats, x, 22, 26.2, x * 0.18, x === 0 ? 1.65 : 1.35);
  for (let x = -3; x <= 3; x += 1) P.cyl(M.white, [x, 24.3, 26], [x * 1.3, 26.3 - Math.abs(x) * 0.25, 26], 0.07, 0.035, 6);
  sign(ctx, P, 'ЦИРК ЧИНИЗЕЛЛИ', 0, 19.1, 26.25, 17, 1.1, '#eee8d8', '#bfa972');
  // Wide black iron canopy, fine posts, scalloped brackets and soffit ribs.
  P.box(M.iron, -23.5, 23.5, 5.4, 5.6, 26.1, 30.3);
  for (let x = -22; x <= 22; x += 2.2) {
    P.cyl(M.iron, [x, 5.5, 26.2], [x, 5.5, 30.4], 0.045, 0.045, 6);
    P.geo(M.iron, ring, x, 5.05, 30.3, 0, 0, 0, 0.48, 0.45, 0.48);
  }
  for (const x of [-22, -13.6, -4.8, 4.8, 13.6, 22]) {
    P.cyl(M.iron, [x, 0.4, 29.7], [x, 5.5, 29.7], 0.11, 0.075, 10);
    P.box(M.stone, x - 0.28, x + 0.28, 0.1, 0.5, 29.42, 29.98);
    for (const side of [-1, 1]) P.geo(M.iron, ring, x + side * 0.55, 4.85, 29.7, 0, 0, 0, 0.55, 0.55, 0.55);
  }
  for (let i = 0; i < 4; i++) P.box(M.stone, -22.8, 22.8, 0, 0.1 + i * 0.1, 26, 30.8 - i * 0.38);
  P.box(M.paving, -23.4, 23.4, 0, 0.1, 26.4, 34.4);
  ring.dispose(); P.pop();
  // Physical masses follow the same frame; keep the canopy forecourt open.
  const world = (x, z) => [origin[0] + x * Math.cos(rot) + z * Math.sin(rot), origin[1] - x * Math.sin(rot) + z * Math.cos(rot)];
  let [x, z] = world(0, 21); ctx.physics.addBox(x, z, 44, 10, rot, 0, 21);
  [x, z] = world(0, -4); ctx.physics.addCylinder(x, z, 24.85, 0, 13);
  for (const side of [-1, 1]) { [x, z] = world(side * 21.35, -5.5); ctx.physics.addBox(x, z, 5.7, 51, rot, 0, 12); }
  [x, z] = world(0, 30.4); ctx.physics.addWalkBox(x, z, 46.8, 8, rot, 0.1, 0);
  for (let i = 0; i < 4; i++) { const back = 30.8 - i * 0.38; [x, z] = world(0, (26 + back) / 2); ctx.physics.addWalkBox(x, z, 45.6, back - 26, rot, 0.1 + i * 0.1, 0); }
}

function church(ctx, P, M) {
  const ox = -304.1, oz = -688.1, rot = 0.105;
  P.push(ox, 0, oz, rot);
  P.box(M.yellowChurch, -20, 17, 0, 11.8, -10, 10);
  P.box(M.stone, -20.3, 17.3, 0, 0.7, -10.3, 10.3);
  roof(P, M.churchRoof, -20.6, 17.6, -10.6, 10.6, 12, 3.4);
  for (const side of [-1, 1]) G.onFace(P, 0, side * 10, 0, side, () => {
    for (const y of [0.75, 10.6, 11.6]) P.box(M.white, -20.2, 17.2, y, y + 0.25, 0, 0.4);
    for (const x of [-17, -10, -3, 4, 11, 16]) pilaster(P, M, x, 1, 10.6, 0.03, 0.75);
    for (const x of [-13.5, -6.5, 0.5, 7.5, 14]) window(P, M, x, 3, 2.4, 5.5, 0.04);
  });
  // Eastern apse and west end are visible from Belinsky Street too.
  G.onFace(P, 17, 0, 1, 0, () => {
    for (const x of [-6, 0, 6]) window(P, M, x, 3, 2.4, 5.5, 0.04);
    for (const x of [-9, -3, 3, 9]) pilaster(P, M, x, 1, 10.6, 0.03, 0.65);
    for (const y of [0.75, 10.6, 11.6]) P.box(M.white, -10, 10, y, y + 0.25, 0, 0.35);
  });
  G.onFace(P, 0.5, 10.02, 0, 1, () => {
    // Low projecting entrance with a white triangular pediment.
    P.box(M.yellowChurch, -3.7, 3.7, 0, 4.5, 0, 1.0);
    window(P, M, 0, 0.6, 2.5, 3.5, 1.02, true);
    for (const x of [-3.2, 3.2]) pilaster(P, M, x, 0.5, 4.5, 1.02, 0.6);
    G.solid(P, M.white, [[-4.2, 4.5], [4.2, 4.5], [0, 6.6]], 0.7, 0.65);
    G.planeShape(P, M.yellowChurch, [[-3.6, 4.75], [3.6, 4.75], [0, 6.2]], 1.37);
  });
  // Raised central drum and the dark, rounded Baroque dome.
  G.tube(P, M.yellowChurch, 4, 0, 13.2, 21.5, 5.3, 5.3, 16);
  for (const y of [13.2, 20.9, 21.5]) G.tube(P, M.white, 4, 0, y, y + 0.35, 5.6, 5.6, 32);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, x = 4 + Math.sin(a) * 5.31, z = Math.cos(a) * 5.31;
    G.onFace(P, x, z, Math.sin(a), Math.cos(a), () => { window(P, M, 0, 15, 1.5, 4.9, 0); for (const dx of [-1.3, 1.3]) pilaster(P, M, dx, 13.7, 20.8, 0, 0.35); });
  }
  dome(P, M.churchRoof, 4, 0, 21.85, 6.2, 6.7, 'simeon-dome', M.churchSeam);
  G.tube(P, M.yellowChurch, 4, 0, 28.4, 30.7, 1.55, 1.55, 16);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; P.cyl(M.glass, [4 + Math.sin(a) * 1.56, 29.5, Math.cos(a) * 1.56], [4 + Math.sin(a) * 1.62, 29.5, Math.cos(a) * 1.62], 0.42, 0.42, 12); }
  G.onion(P, M.churchRoof, 4, 30.7, 0, 1.8, 0.85); G.cross(P, M.gold, 4, 34.2, 0, 2.2);
  // Four-stage western bell tower. Open-looking dark belfry arches on all faces.
  const bx = -18;
  // 47 m overall, including the cross (official Visit Petersburg description).
  for (const [y0, y1, w] of [[0, 12.6, 8.2], [14.2, 21.4, 6.4], [23, 28.4, 4.8], [30, 34.4, 3.4]]) {
    P.box(M.yellowChurch, bx - w / 2, bx + w / 2, y0, y1, -w / 2, w / 2);
    for (const y of [y0, y1 - 0.3]) P.box(M.white, bx - w / 2 - 0.35, bx + w / 2 + 0.35, y, y + 0.35, -w / 2 - 0.35, w / 2 + 0.35);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      G.onFace(P, bx + Math.sin(a) * w / 2, Math.cos(a) * w / 2, Math.sin(a), Math.cos(a), () => {
        window(P, M, 0, y0 + 1.2, w * 0.42, y1 - y0 - 2, 0, y0 === 0);
        for (const x of [-w / 2 + 0.45, w / 2 - 0.45]) pilaster(P, M, x, y0 + 0.4, y1 - 0.4, 0, 0.48);
      });
    }
    roof(P, M.churchRoof, bx - w / 2 - 0.6, bx + w / 2 + 0.6, -w / 2 - 0.6, w / 2 + 0.6, y1, 1.6);
  }
  G.lathe(P, M.churchRoof, 'simeon-spire', [[2.9, 0], [2.6, 0.7], [1.6, 1.4], [1, 2.5], [0.65, 4], [0.3, 7], [0.02, 10.2]], bx, 34.4, 0, 1, 1, 24, 28);
  G.cross(P, M.gold, bx, 44.6, 0, 2.4);
  // Clock dial on the upper bell-tower stage.
  for (const side of [-1, 1]) {
    P.cyl(M.white, [bx, 31.9, side * 1.75], [bx, 31.9, side * 1.85], 0.9, 0.9, 32);
    P.cyl(M.gold, [bx, 31.9, side * 1.87], [bx + 0.48, 32.3, side * 1.87], 0.045, 0.045, 6);
    P.cyl(M.gold, [bx, 31.9, side * 1.87], [bx - 0.1, 32.6, side * 1.87], 0.035, 0.035, 6);
  }
  P.pop();
  ctx.physics.addBox(ox, oz, 40.6, 20.6, rot, 0, 13);
  // The separately mapped little chapel at the Mokhovaya / Belinsky corner.
  P.push(-332.9, 0, -664.3, 0.1);
  P.box(M.yellowChurch, -4, 4, 0, 4.8, -4, 4);
  for (const side of [-1, 1]) G.onFace(P, 0, side * 4, 0, side, () => { window(P, M, 0, 0.4, 2.2, 3.5, 0, true); for (const x of [-3.5, 3.5]) pilaster(P, M, x, 0.4, 4.6, 0); });
  P.box(M.white, -4.3, 4.3, 4.6, 4.9, -4.3, 4.3);
  roof(P, M.churchRoof, -4.5, 4.5, -4.5, 4.5, 4.9, 1.8);
  G.onion(P, M.churchRoof, 0, 6.2, 0, 1.4, 0.6); G.cross(P, M.gold, 0, 8.1, 0, 1.1);
  P.pop(); ctx.physics.addBox(-332.9, -664.3, 8, 8, 0.1, 0, 6);
}

export function build(ctx) {
  const P = new Parts(), root = new THREE.Group(); root.name = 'landmarks-belinsky';
  const T = (hex, name) => ctx.mat.toon(hex, { name: 'belinsky-' + name, paint: 0.03 });
  const M = { yellow: T('#ddc58d', 'circus-wall'), yellowShade: T('#b5a276', 'wall-shadow'), yellowChurch: T('#e4c36b', 'church-wall'), white: T('#eee9de', 'stucco'), whiteShade: T('#c5c1b7', 'stucco-shadow'), circusRoof: T('#949c9f', 'circus-roof'), roofSeam: T('#707b80', 'dome-ribs'), churchRoof: T('#444f4b', 'church-roof'), churchSeam: T('#64706a', 'church-ribs'), glass: T('#273d43', 'glass'), door: T('#67432d', 'doors'), doorTrim: T('#9c754d', 'door-panels'), iron: T('#293133', 'canopy-iron'), stone: T('#a49d90', 'plinth'), gold: T('#d8b659', 'crosses') };
  const paving = ctx.tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#aaa9a1'; g.fillRect(0, 0, w, h); g.strokeStyle = '#85857e'; g.lineWidth = 2;
    for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) g.strokeRect(col * 96 + (row % 2) * 48, row * 64, 96, 64);
  }, { key: 'ciniselli-forecourt', repeat: [1, 1] });
  M.paving = ctx.mat.toon('#e1dfd5', { map: paving, name: 'ciniselli-paving' });
  circus(ctx, P, M); church(ctx, P, M);
  P.build(root, { name: 'belinsky-landmarks' }); ctx.addStatic(root);
  const photoSpots = [{ x: -542.8, z: -652.6, yaw: 80.2, name: 'Цирк Чинизелли' }, { x: -269.9, z: -682.3, yaw: 19.6, name: 'Церковь Симеона и Анны' }];
  const landmarks = (ctx.services.landmarks ||= {}); landmarks.photoSpots = (landmarks.photoSpots || []).concat(photoSpots);
  ctx.services.landmarksBelinsky = { triangles: P.tris, photoSpots };
}
