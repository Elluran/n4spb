// landmarksGavan/fence.js - the iron fence builder shared by the canal promenade, the workers' town, the fire reserve yard and the church hoarding (docs/research/gavan.md 5.1, 8.3, 10.3).
//   fenceRun(Q, pts, o)  panels (alpha bars between two posts, ~2.5 m) along a polyline of [x, z], a post at every panel end (collected for instancing), openings at the gates and wherever the real asphalt is,
//                        every `fanEvery` m a sunburst fan panel; returns { runs (segments for colliders), posts, spans, len }.
//   postInstances(Q, name, posts, o)  one InstancedMesh pair (shaft + finial) for all posts.
//   solidRuns(Q, runs, thick, h, clear)  thin fence-flagged colliders along the runs (streets/barriers.js addFenceBoxes), gates stay open.
import * as THREE from 'three';
import { addFenceBoxes } from '../streets/barriers.js';
import { partsGeos, addInstanced, mat4 } from './inst.js';
import { coverFn } from './surfaces.js';

/**
 * o: { h: 1.6, y0: 0.06, panel: 2.5, bars: material, fan: material, fanEvery: 0 (no fans), fanFrom, fanTo (arc length range m, default all), gates: [[x, z, halfWidth]], cover (fn), margin: 0.3,
 *      skip: (x, z) => bool (extra exclusion, e.g. water) }
 */
export function fenceRun(Q, pts, o = {}) {
  const P = Q.P, cover = o.cover || coverFn(Q.ctx), h = o.h ?? 1.6, y0 = o.y0 ?? 0.06, pitch = o.panel ?? 2.5, m = o.margin ?? 0.3, gates = o.gates || [];
  const runs = [], posts = [], res = { runs, posts, spans: 0, len: 0, gaps: 0 };
  let arc = 0, nextFan = o.fanEvery ? (o.fanFrom ?? o.fanEvery * 0.5) : Infinity, run = [];
  const flush = () => { if (run.length) runs.push(run); run = []; };
  const bad = (x, z) => cover(x, z) > -m || gates.some(([gx, gz, gw]) => Math.hypot(gx - x, gz - z) < gw) || (o.skip && o.skip(x, z));
  for (let i = 0; i + 1 < pts.length; i++) {
    const A = pts[i], B = pts[i + 1], dx = B[0] - A[0], dz = B[1] - A[1], len = Math.hypot(dx, dz); if (len < 0.2) continue;
    const n = Math.max(1, Math.round(len / pitch)), step = len / n, ux = dx / len, uz = dz / len;
    for (let k = 0; k < n; k++) {
      const ax = A[0] + ux * step * k, az = A[1] + uz * step * k, bx = A[0] + ux * step * (k + 1), bz = A[1] + uz * step * (k + 1), mx = (ax + bx) / 2, mz = (az + bz) / 2;
      const gap = bad(ax, az) || bad(bx, bz) || bad(mx, mz) || (o.cap && arc > (o.cap[1] ?? Infinity)) || (o.cap && arc < (o.cap[0] ?? 0));
      const useFan = o.fan && arc + step / 2 >= nextFan && (o.fanTo == null || arc < o.fanTo);
      if (useFan) nextFan += o.fanEvery;
      if (gap) { flush(); res.gaps++; arc += step; continue; }
      const mat = useFan ? o.fan : o.bars, rot = Math.atan2(-uz, ux);
      P.push(ax, 0, az, rot);
      P.quad(mat, [0, y0, 0], [step, y0, 0], [step, y0 + h, 0], [0, y0 + h, 0], [0, 0, 1], [[0, 0], [useFan ? 1 : step / pitch, 0], [useFan ? 1 : step / pitch, 1], [0, 1]]);
      P.pop();
      if (!run.length || Math.hypot(run[run.length - 1][2] - ax, run[run.length - 1][3] - az) > 0.05) { posts.push([ax, az, rot]); }
      posts.push([bx, bz, rot]);
      run.push([ax, az, bx, bz]); res.spans++; res.len += step; arc += step;
    }
  }
  flush();
  // posts at the panel ends: one per joint (drop the exact duplicates)
  const seen = new Set(); res.posts = posts.filter((p) => { const k = Math.round(p[0] * 20) + ',' + Math.round(p[1] * 20); if (seen.has(k)) return false; seen.add(k); return true; });
  return res;
}

/** square posts 0.1 m with a ball finial: one InstancedMesh per material; o: { h (1.7), mat (iron), ball (the finial material), spear: true for a pointed finial } */
export function postInstances(Q, name, posts, o = {}) {
  if (!posts.length) return 0;
  const M = Q.M, h = o.h ?? 1.7, iron = o.mat || M.iron;
  const parts = partsGeos((PP) => {
    PP.box(iron, -0.05, 0.05, 0, h, -0.05, 0.05, 'b', 1);
    PP.box(iron, -0.065, 0.065, h - 0.12, h - 0.06, -0.065, 0.065, '', 1);
    if (o.spear) PP.cyl(iron, [0, h, 0], [0, h + 0.2, 0], 0.045, 0.004, 4, false);
    else { const g = new THREE.SphereGeometry(0.075, 6, 4); PP.geo(iron, g, 0, h + 0.06, 0); g.dispose(); }
  });
  const mats = posts.map(([x, z, rot]) => mat4(x, o.y || 0, z, rot || 0, 1));
  const r = addInstanced(Q.ctx, Q.root, name, parts, mats);
  Q.extraTris += r.tris;
  return posts.length;
}

/** thin solid boxes along the runs of fenceRun (`fence` flag for the people module); gates and road gaps stay open */
export function solidRuns(Q, runs, thick = 0.3, h = 1.8, clearM = 0.2) {
  const cover = coverFn(Q.ctx);
  return addFenceBoxes(Q.ctx, runs, thick, h, (x, z) => cover(x, z) < -clearM);
}

/** thin wall colliders FLUSH with the footprint: every edge of the ring gets a box of thickness t whose OUTER face is the wall line (nothing sticks out over the pavement / asphalt). poly = { o, h } flat rings */
export function flushWalls(Q, poly, y0, y1, t = 0.3) {
  const rings = [poly.o, ...(poly.h || [])]; let n = 0;
  for (const flat of rings) {
    const pts = []; for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
    let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
    const sgn = A > 0 ? 1 : -1;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.3) continue;
      const nx = dz / len * sgn, nz = -dx / len * sgn;                     // outward normal for this winding
      const cx = (a[0] + b[0]) / 2 - nx * t / 2, cz = (a[1] + b[1]) / 2 - nz * t / 2;
      Q.ctx.physics.addBox(cx, cz, len + t * 0.5, t, Math.atan2(-dz, dx), y0, y1); n++;
    }
  }
  return n;
}
