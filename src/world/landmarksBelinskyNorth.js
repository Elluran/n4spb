// The Church of Simeon and Anna (Mokhovaya 48, OSM w96148838 + the corner chapel w96148878): the North's copy of the church part of the source module landmarksBelinsky
// (102_3d_piter, src/world/landmarksBelinsky.js at commit 0568f7af, the same commit as the data of the North, docs/AREAS-DATA.md). The church stands INSIDE the North play area at about
// (-304, -688); the Nevsky strip keeps its OWN trimmed copy, src/world/landmarksBelinsky.js (the Ciniselli Circus only: the church lies 116 m past the strip's play edge and is left to the generic
// city there), and that file is untouched. This module is the source's church() with the four helpers it uses (window, pilaster, roof, dome), the same text as the source; the circus, its sign
// and its forecourt paving are left out (the circus w28691685 at (-576, -695) lies 150 m west of the North's extent). Renamed from the source: the module name, root.name and the ctx.services key
// (landmarksBelinskyNorth; the shared ctx.services.landmarks.photoSpots merge is the same). Claims: landmarksBelinskyNorth/groups.js (the sub-group 'simeon-anna', keyed as in the source).
// User photo references (2026-10-04) govern colour, silhouette and ornament (the source's header). Milestone M7, cluster C-landmarks (docs/AREAS.md section 10).
import * as THREE from 'three';
import { Parts } from './landmarksD/kit.js';
import * as G from './landmarksK/geo.js';

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
  const P = new Parts(), root = new THREE.Group(); root.name = 'landmarks-belinsky-north';
  const T = (hex, name) => ctx.mat.toon(hex, { name: 'belinsky-' + name, paint: 0.03 });
  // the source's material table without the circus-only entries (circus-wall, wall-shadow, circus-roof, dome-ribs, canopy-iron, the forecourt paving); the names and colours are the source's
  const M = { yellowChurch: T('#e4c36b', 'church-wall'), white: T('#eee9de', 'stucco'), whiteShade: T('#c5c1b7', 'stucco-shadow'), churchRoof: T('#444f4b', 'church-roof'), churchSeam: T('#64706a', 'church-ribs'), glass: T('#273d43', 'glass'), door: T('#67432d', 'doors'), doorTrim: T('#9c754d', 'door-panels'), stone: T('#a49d90', 'plinth'), gold: T('#d8b659', 'crosses') };
  church(ctx, P, M);
  P.build(root, { name: 'belinsky-north-landmarks' }); ctx.addStatic(root);
  const photoSpots = [{ x: -269.9, z: -682.3, yaw: 19.6, name: 'Церковь Симеона и Анны' }];
  const landmarks = (ctx.services.landmarks ||= {}); landmarks.photoSpots = (landmarks.photoSpots || []).concat(photoSpots);
  ctx.services.landmarksBelinskyNorth = { triangles: P.tris, photoSpots };
}
