// metro/corridor.js — walkable passages along a smooth polyline (transfer passages, the lower corridors behind the escalators): a barrel vault 7 m wide, floor, walls with a tile dado, cove lamps,
// colliders (walls + floor boxes / ramps per segment) with explicit y ranges. The path is a list of [x, y, z] points in WORLD coordinates (y = the floor); a changing y is walked as a gentle ramp.
//   buildCorridor(ctx, M, parent, path, o)  ->  { length, left, right (offset polylines), walls: [items], floors: [items] }
// o: { w: 7 (width), h: 2.7 (wall height), rise: 1.7 (vault rise over the walls), dado: true, floorMat, lamps: true, collide: true, name }
// Corners are mitred by the loft; keep the turning angle per segment small (the path should come from smoothPath, one point every 2-3 m).
import * as THREE from 'three';
import { loft, archPts } from './lib.js';

export function buildCorridor(ctx, M, parent, path, o = {}) {
  const { physics, mat } = ctx;
  const w = o.w ?? 7, h = o.h ?? 2.7, rise = o.rise ?? 1.7, half = w / 2;
  const floorMat = o.floorMat || M.corridorFloor, wallMat = o.wallMat || M.corridorWall, vaultMat = o.vaultMat || M.corridorVault;
  const add = (g, material) => { const m = new THREE.Mesh(g, material); m.castShadow = false; m.receiveShadow = true; parent.add(m); return m; };
  // floor strip (profile right-to-left so that it faces up), walls, vault
  add(loft(path, [[half, 0.0], [-half, 0.0]], { us: 1 / 2, vs: 1 / 2 }), floorMat);
  add(loft(path, [[-half, 0], [-half, h]], { us: 1 / 4, vs: 1 / 4 }), wallMat);
  add(loft(path, [[half, 0], [half, h]], { us: 1 / 4, vs: 1 / 4 }), wallMat);
  const vault = []; for (let i = 0; i <= 18; i++) { const t = i * Math.PI / 18; vault.push([half * Math.cos(t), h + rise * Math.sin(t)]); }
  add(loft(path, vault, { us: 1 / 4, vs: 1 / 6 }), vaultMat);
  // cove lamps along both sides of the vault + a centre line of ceiling lamps
  if (o.lamps !== false) {
    for (const sx of [-1, 1]) add(loft(path, [[sx * (half - 0.7) + 0.12, h + rise * 0.55], [sx * (half - 0.7) - 0.12, h + rise * 0.55 + 0.02]], { flat: true }), M.lampWarm);
  }
  // offset polylines (for colliders): reuse the miter of the loft
  const n = path.length, tx = [], tz = [];
  for (let i = 0; i < n - 1; i++) { const dx = path[i + 1][0] - path[i][0], dz = path[i + 1][2] - path[i][2], l = Math.hypot(dx, dz) || 1; tx.push(dx / l); tz.push(dz / l); }
  const offs = (lat) => path.map((p, i) => {
    const a = Math.max(0, i - 1), b = Math.min(n - 2, i), n0 = [-tz[a], tx[a]], n1 = [-tz[b], tx[b]];
    let bx = n0[0] + n1[0], bz = n0[1] + n1[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl; const sc = Math.min(2.4, 1 / Math.max(0.25, bx * n0[0] + bz * n0[1]));
    return [p[0] + bx * lat * sc, p[1], p[2] + bz * lat * sc];
  });
  const right = offs(half), left = offs(-half);
  const walls = [], floors = [];
  if (o.collide !== false) {
    for (let i = 0; i < n - 1; i++) {
      const y0 = Math.min(path[i][1], path[i + 1][1]) - 1.2, y1 = Math.max(path[i][1], path[i + 1][1]) + h + rise + 1.0;
      // wall boxes: thin along the offset line; the box's local z runs along the segment (rotY = heading)
      for (const side of [left, right]) {
        const A = side[i], B = side[i + 1], dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz); if (l < 0.05) continue;
        const it = physics.addBox((A[0] + B[0]) / 2, (A[2] + B[2]) / 2, 0.5, l + 0.3, Math.atan2(dx, dz), y0, y1); walls.push(it);
      }
      // floor: a flat box or a ramp following the segment (width w + 0.1)
      const A = path[i], B = path[i + 1], dx = B[0] - A[0], dz = B[2] - A[2], l = Math.hypot(dx, dz); if (l < 0.05) continue;
      const rot = Math.atan2(dx, dz), cx = (A[0] + B[0]) / 2, cz = (A[2] + B[2]) / 2;
      if (Math.abs(B[1] - A[1]) < 0.02) floors.push(physics.addWalkBox(cx, cz, w + 0.1, l + 0.5, rot, A[1], A[1] - 1.0));
      else { const e = 0.2, sl = (B[1] - A[1]) / l; floors.push(physics.addWalkRamp(cx, cz, w + 0.1, l + 2 * e, rot, A[1] - sl * e, B[1] + sl * e, 1.0)); }
    }
  }
  let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]);
  void archPts; void mat;
  return { length: L, left, right, walls, floors };
}

/** densify a polyline of [x, z] (or [x, y, z]) points into a smooth path with y (linear in arc length between the given y of the first / last point or per point) */
export function pathWithY(pts2, y0, y1) {
  const out = []; let L = 0; const cum = [0];
  for (let i = 1; i < pts2.length; i++) { L += Math.hypot(pts2[i][0] - pts2[i - 1][0], pts2[i][1] - pts2[i - 1][1]); cum.push(L); }
  for (let i = 0; i < pts2.length; i++) out.push([pts2[i][0], y0 + (y1 - y0) * (cum[i] / (L || 1)), pts2[i][1]]);
  return out;
}
