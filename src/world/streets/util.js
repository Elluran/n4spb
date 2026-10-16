// streets/util.js — indexed geometry builder + 2D polyline helpers shared by every streets/* file.
// Coordinates: metres, +X east, +Z south (so -Z is north), +Y up. A polyline's "right" normal is (-tz, tx).
import * as THREE from 'three';

export const UP = [0, 1, 0];
export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / ((b - a) || 1e-9), 0, 1); return t * t * (3 - 2 * t); };
export const hash2 = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

/** Points hashed in square cells for the 'any / first / nearest point within r' questions the placers used to answer by scanning every point (the same answers, the same
 *  Math.hypot(px - x, pz - z) < r test; `first` = the point of the LOWEST insertion index, exactly list.find; `minDist` = the smallest distance among the points of the cells within r,
 *  1e9 when none: exact for every point nearer than r). The cell size is a speed choice only (the query walks the cells that cover x +- r, z +- r). */
export class PointGrid {
  constructor(cell = 16) { this.cell = cell; this.m = new Map(); this.n = 0; }
  add(x, z, item = null) { const k = Math.floor(x / this.cell) * 4096 + Math.floor(z / this.cell); let l = this.m.get(k); if (!l) this.m.set(k, (l = [])); l.push({ i: this.n++, x, z, item }); return item; }
  cells(x, z, r, fn) {
    const c = this.cell;
    for (let cx = Math.floor((x - r) / c); cx <= Math.floor((x + r) / c); cx++) for (let cz = Math.floor((z - r) / c); cz <= Math.floor((z + r) / c); cz++) { const l = this.m.get(cx * 4096 + cz); if (l) fn(l); }
  }
  any(x, z, r, test = null) { let hit = false; this.cells(x, z, r, (l) => { if (hit) return; for (const p of l) if (Math.hypot(p.x - x, p.z - z) < r && (!test || test(p.item))) { hit = true; return; } }); return hit; }
  first(x, z, r, test = null) { let best = null; this.cells(x, z, r, (l) => { for (const p of l) { if (best && p.i >= best.i) continue; if (Math.hypot(p.x - x, p.z - z) < r && (!test || test(p.item))) best = p; } }); return best ? best.item : undefined; }
  minDist(x, z, r) { let best = 1e9; this.cells(x, z, r, (l) => { for (const p of l) best = Math.min(best, Math.hypot(p.x - x, p.z - z)); }); return best; }
}

/** Indexed mesh accumulator (position, normal, uv, optional vertex colour). tri()/quad() fix the winding to `want`. */
export class MB {
  constructor(color = false) { this.pos = []; this.nrm = []; this.uv = []; this.col = color ? [] : null; this.idx = []; this.n = 0; }
  vert(x, y, z, u = 0, v = 0, n = UP, c = null) {
    this.pos.push(x, y, z); this.nrm.push(n[0], n[1], n[2]); this.uv.push(u, v);
    if (this.col) { if (c) this.col.push(c[0], c[1], c[2]); else this.col.push(1, 1, 1); }
    return this.n++;
  }
  tri(a, b, c, want = UP) {
    const p = this.pos;
    const ax = p[a * 3], ay = p[a * 3 + 1], az = p[a * 3 + 2];
    const ux = p[b * 3] - ax, uy = p[b * 3 + 1] - ay, uz = p[b * 3 + 2] - az;
    const vx = p[c * 3] - ax, vy = p[c * 3 + 1] - ay, vz = p[c * 3 + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    if (Math.abs(nx) + Math.abs(ny) + Math.abs(nz) < 1e-12) return;
    if (nx * want[0] + ny * want[1] + nz * want[2] >= 0) this.idx.push(a, b, c); else this.idx.push(a, c, b);
  }
  quad(a, b, c, d, want = UP) { this.tri(a, b, c, want); this.tri(a, c, d, want); }
  get empty() { return this.idx.length === 0; }
  get tris() { return this.idx.length / 3; }
  build(computeNormals = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.col) g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.n > 65000 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    if (computeNormals) g.computeVertexNormals();
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** sRGB hex -> linear [r,g,b] (matches how three converts material colours) */
const _c = new THREE.Color();
export const rgb = (hex) => { _c.set(hex); return [_c.r, _c.g, _c.b]; };
export const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ------------------------------------------------------------------ polylines
export function pairs(flat) { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; }
export function polyLen(pts) { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }

const turnDeg = (a, b, c) => {
  const ux = b[0] - a[0], uz = b[1] - a[1], vx = c[0] - b[0], vz = c[1] - b[1];
  const lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz); if (lu < 1e-6 || lv < 1e-6) return 0;
  return Math.acos(clamp((ux * vx + uz * vz) / (lu * lv), -1, 1)) * 180 / Math.PI;
};

/** Chaikin corner cutting. End points stay fixed; vertices that turn more than keepDeg stay sharp. */
export function chaikin(pts, iters = 2, keepDeg = 50) {
  let P = pts;
  for (let it = 0; it < iters; it++) {
    if (P.length < 3) break;
    const n = P.length;
    const sharp = P.map((p, i) => i === 0 || i === n - 1 || turnDeg(P[i - 1], p, P[i + 1]) > keepDeg);
    const out = [];
    for (let i = 0; i < n - 1; i++) {
      const a = P[i], b = P[i + 1];
      if (sharp[i]) out.push(a); else out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      if (!sharp[i + 1]) out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    out.push(P[n - 1]);
    P = out;
  }
  return P;
}

/** Subdivide segments so no piece is longer than `step`. */
export function densify(pts, step) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const k = Math.max(1, Math.ceil(l / step));
    for (let j = 1; j <= k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
  }
  return out;
}

/** Closest point on segment (ax,az)-(bx,bz) to (px,pz): {t, x, z, d} */
export function segClosest(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 < 1e-12 ? 0 : clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return { t, x, z, d: Math.hypot(px - x, pz - z) };
}

/** distance from a point to a polyline of [x,z] pairs */
export function distToPoly(pts, px, pz) {
  let best = 1e9;
  for (let i = 0; i + 1 < pts.length; i++) best = Math.min(best, segClosest(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]).d);
  return best;
}

/** Resample a polyline of [x,z] to points ~step apart: [{x,z,s,tx,tz}] (smooth tangents). */
export function resample(pts, step) {
  const out = []; let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const l = Math.hypot(x1 - x0, z1 - z0); if (l < 1e-6) continue;
    const n = Math.max(1, Math.ceil(l / step)), tx = (x1 - x0) / l, tz = (z1 - z0) / l;
    for (let k = 0; k < n; k++) { const f = k / n; out.push({ x: x0 + (x1 - x0) * f, z: z0 + (z1 - z0) * f, s: s + l * f, tx, tz }); }
    s += l;
  }
  const last = pts[pts.length - 1], prev = out[out.length - 1] || { tx: 1, tz: 0 };
  out.push({ x: last[0], z: last[1], s, tx: prev.tx, tz: prev.tz });
  for (let i = 1; i < out.length - 1; i++) {
    const a = out[i - 1], c = out[i + 1]; const tx = c.x - a.x, tz = c.z - a.z, l = Math.hypot(tx, tz) || 1; out[i].tx = tx / l; out[i].tz = tz / l;
  }
  return out;
}

/** point + tangent at arclength s along resample() output */
export function pointAt(rs, s) {
  if (s <= rs[0].s) return rs[0];
  for (let i = 1; i < rs.length; i++) {
    if (rs[i].s >= s) {
      const a = rs[i - 1], b = rs[i], f = (s - a.s) / Math.max(1e-9, b.s - a.s);
      let tx = a.tx + (b.tx - a.tx) * f, tz = a.tz + (b.tz - a.tz) * f; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      return { x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, s, tx, tz };
    }
  }
  return rs[rs.length - 1];
}

/** wrap an angle to (-PI, PI] */
export const wrapPI = (a) => { while (a > Math.PI) a -= TAU; while (a <= -Math.PI) a += TAU; return a; };

/** Douglas-Peucker keep mask over several parallel polylines: keep[i] is true when any of the sides deviates more than tol from the chord of its kept neighbours.
 *  sides = [ [[x,z]...], ... ] (same length); `must(i)` forces a vertex; maxSpan = the longest piece allowed (m, along the first side). */
export function dpKeep(sides, tol, must = null, maxSpan = Infinity) {
  const n = sides[0].length, keep = new Array(n).fill(false);
  if (n === 0) return keep;
  keep[0] = keep[n - 1] = true;
  const stack = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bd = tol;
    for (let i = a + 1; i < b; i++) {
      if (must && must(i)) { best = i; bd = Infinity; break; }
      let d = 0;
      for (const P of sides) d = Math.max(d, segClosest(P[i][0], P[i][1], P[a][0], P[a][1], P[b][0], P[b][1]).d);
      if (d > bd) { bd = d; best = i; }
    }
    if (best < 0 && b - a > 1 && maxSpan < Infinity) {
      const P = sides[0]; if (Math.hypot(P[b][0] - P[a][0], P[b][1] - P[a][1]) > maxSpan) best = (a + b) >> 1;
    }
    if (best >= 0) { keep[best] = true; stack.push([a, best], [best, b]); }
  }
  return keep;
}
