// rail/gb.js - small geometry-building helpers shared by the rail files.
//   GB       indexed geometry accumulator (position, normal, uv, optional vertex colour) with box / quad / prism helpers
//   Buckets  one GB per (material key, 48 m cell): the static batcher keeps spatial cells, so long strips are cut into cells here
//   sweep    a 2D profile swept along path samples (rails, ballast, kerbs)
import * as THREE from 'three';

export class GB {
  constructor(color = false) { this.p = []; this.n = []; this.uv = []; this.c = color ? [] : null; this.i = []; this.v = 0; }
  vert(x, y, z, nx, ny, nz, u = 0, v = 0, col) {
    this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v);
    if (this.c) { if (col) this.c.push(col.r, col.g, col.b); else this.c.push(1, 1, 1); }
    return this.v++;
  }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  get empty() { return this.v === 0; }
  get tris() { return this.i.length / 3; }
  /** Quad from four points (counter-clockwise seen from the side the normal points to); flat normal from the points. */
  face(a, b, c, d, col, uvs, ctr) {
    if (ctr) {          // flip when the face normal looks toward `ctr` (the inside of a closed shape)
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      if (nx * (ctr[0] - a[0]) + ny * (ctr[1] - a[1]) + nz * (ctr[2] - a[2]) > 0) { [b, d] = [d, b]; }
    }
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const t = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
    const i0 = this.vert(a[0], a[1], a[2], nx, ny, nz, t[0][0], t[0][1], col), i1 = this.vert(b[0], b[1], b[2], nx, ny, nz, t[1][0], t[1][1], col),
      i2 = this.vert(c[0], c[1], c[2], nx, ny, nz, t[2][0], t[2][1], col), i3 = this.vert(d[0], d[1], d[2], nx, ny, nz, t[3][0], t[3][1], col);
    this.quad(i0, i1, i2, i3);
  }
  /** Oriented box: centre (cx,cy,cz), half sizes along the local axes, local x axis = (cos r, 0, -sin r), local z = (sin r, 0, cos r); `skip` = array of face names to omit. */
  box(cx, cy, cz, hx, hy, hz, r = 0, col, skip = []) {
    const c = Math.cos(r), s = Math.sin(r);
    const P = (lx, ly, lz) => [cx + lx * c + lz * s, cy + ly, cz - lx * s + lz * c];
    const faces = {
      '+x': [P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz)],
      '-x': [P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz)],
      '+y': [P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz)],
      '-y': [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz)],
      '+z': [P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)],
      '-z': [P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz)],
    };
    for (const k in faces) if (!skip.includes(k)) this.face(...faces[k], col);
  }
  /** Box between two arbitrary points with a square-ish cross-section (w x h) - braces, arms, rods. `up` hints the section orientation. */
  bar(a, b, w, h, col, up = [0, 1, 0]) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1, t = d.map((v) => v / L);
    let s = [t[1] * up[2] - t[2] * up[1], t[2] * up[0] - t[0] * up[2], t[0] * up[1] - t[1] * up[0]]; let sl = Math.hypot(...s);
    if (sl < 1e-4) { s = [1, 0, 0]; sl = 1; } s = s.map((v) => v / sl);
    const u = [s[1] * t[2] - s[2] * t[1], s[2] * t[0] - s[0] * t[2], s[0] * t[1] - s[1] * t[0]];
    const C = (p, i, j) => [p[0] + s[0] * i * w / 2 + u[0] * j * h / 2, p[1] + s[1] * i * w / 2 + u[1] * j * h / 2, p[2] + s[2] * i * w / 2 + u[2] * j * h / 2];
    const ring = [[1, 1], [-1, 1], [-1, -1], [1, -1]], ctr = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    for (let k = 0; k < 4; k++) {
      const [i0, j0] = ring[k], [i1, j1] = ring[(k + 1) % 4];
      this.face(C(a, i0, j0), C(a, i1, j1), C(b, i1, j1), C(b, i0, j0), col, null, ctr);
    }
    this.face(C(b, 1, 1), C(b, -1, 1), C(b, -1, -1), C(b, 1, -1), col, null, ctr);
    this.face(C(a, 1, -1), C(a, -1, -1), C(a, -1, 1), C(a, 1, 1), col, null, ctr);
  }
  /** Vertical cylinder-like n-gon prism (axis y) from y0 to y1 with radii r0 (bottom) r1 (top). */
  prism(cx, y0, cz, r0, r1, y1, n = 8, col, caps = true) {
    for (let k = 0; k < n; k++) {
      const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, am = (a0 + a1) / 2;
      const nx = Math.cos(am), nz = Math.sin(am);
      const i0 = this.vert(cx + Math.cos(a0) * r0, y0, cz + Math.sin(a0) * r0, nx, 0, nz, 0, 0, col);
      const i1 = this.vert(cx + Math.cos(a1) * r0, y0, cz + Math.sin(a1) * r0, nx, 0, nz, 1, 0, col);
      const i2 = this.vert(cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1, nx, 0, nz, 1, 1, col);
      const i3 = this.vert(cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1, nx, 0, nz, 0, 1, col);
      this.quad(i0, i3, i2, i1);
    }
    if (caps) for (let k = 0; k < n; k++) {
      const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2;
      const c = this.vert(cx, y1, cz, 0, 1, 0, 0.5, 0.5, col), p = this.vert(cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1, 0, 1, 0, 0, 0, col), q = this.vert(cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1, 0, 1, 0, 1, 0, col);
      this.tri(c, q, p);
    }
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setIndex(this.v > 65535 ? new THREE.Uint32BufferAttribute(this.i, 1) : new THREE.Uint16BufferAttribute(this.i, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** One GB per material key and 48 m cell. */
export class Buckets {
  constructor(cell = 48) { this.cell = cell; this.map = new Map(); this.colored = new Set(); }
  /** Declare that material `key` uses vertex colours. */
  useColor(key) { this.colored.add(key); return this; }
  get(key, x, z) {
    const k = key + '|' + Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell);
    let b = this.map.get(k);
    if (!b) { b = new GB(this.colored.has(key)); b.key = key; this.map.set(k, b); }
    return b;
  }
  get tris() { let n = 0; for (const b of this.map.values()) n += b.tris; return n; }
  /** Build meshes into `parent`; mats: key -> { mat, shadow: {cast, receive}, noOutline } */
  flush(parent, mats, ctx) {
    const byKey = {};
    for (const b of this.map.values()) {
      if (b.empty) continue;
      const spec = mats[b.key]; if (!spec) throw new Error('rail: no material for bucket ' + b.key);
      const m = new THREE.Mesh(b.build(), spec.mat); m.name = 'rail-' + b.key;
      m.castShadow = !!spec.cast; m.receiveShadow = spec.receive !== false;
      if (spec.noOutline && ctx) ctx.noOutline(m);
      parent.add(m); byKey[b.key] = (byKey[b.key] || 0) + b.tris;
    }
    return byKey;
  }
}

/** Sweep a profile (array of [q, y], q = lateral to the right of the travel direction (east when heading south... see below), y up) along samples {x,z,tx,tz}.
 *  Lateral unit vector l = (tz, -tx). Edge k joins profile[k] and profile[k+1]; `edgeKey(k)` -> bucket key or null (skip). Normals: perpendicular to the edge, outward = right-hand side of the
 *  walk along the profile (counter-clockwise profile in (q,y) => outward). */
export function sweep(bk, samples, profile, edgeKey, o = {}) {
  const uvs = o.uvScale ?? 4;
  for (let i = 0; i + 1 < samples.length; i++) {
    const S0 = samples[i], S1 = samples[i + 1];
    const l0 = [S0.tz, -S0.tx], l1 = [S1.tz, -S1.tx];
    const mx = (S0.x + S1.x) / 2, mz = (S0.z + S1.z) / 2;
    let acc = 0;
    for (let k = 0; k < profile.length - 1; k++) {
      const [qa, ya] = profile[k], [qb, yb] = profile[k + 1];
      const el = Math.hypot(qb - qa, yb - ya); if (el < 1e-5) continue;
      const key = edgeKey(k); if (!key) { acc += el; continue; }
      const nq = (yb - ya) / el, ny = -(qb - qa) / el;
      const B = bk.get(key, mx, mz);
      const a = [S0.x + l0[0] * qa, ya + (S0.dy || 0), S0.z + l0[1] * qa], b = [S0.x + l0[0] * qb, yb + (S0.dy || 0), S0.z + l0[1] * qb];
      const c = [S1.x + l1[0] * qb, yb + (S1.dy || 0), S1.z + l1[1] * qb], d = [S1.x + l1[0] * qa, ya + (S1.dy || 0), S1.z + l1[1] * qa];
      const n0 = [l0[0] * nq, ny, l0[1] * nq], n1 = [l1[0] * nq, ny, l1[1] * nq];
      const u0 = o.uvMode === 'world' ? null : S0.s / uvs, u1 = o.uvMode === 'world' ? null : S1.s / uvs;
      const uv = (p, uA) => (o.uvMode === 'world' ? [p[0] / (o.worldScale || 2.2), p[2] / (o.worldScale || 2.2)] : [uA, (acc + (p === b || p === c ? el : 0)) / uvs]);
      const v0 = B.vert(a[0], a[1], a[2], n0[0], n0[1], n0[2], ...uv(a, u0));
      const v1 = B.vert(b[0], b[1], b[2], n0[0], n0[1], n0[2], ...uv(b, u0));
      const v2 = B.vert(c[0], c[1], c[2], n1[0], n1[1], n1[2], ...uv(c, u1));
      const v3 = B.vert(d[0], d[1], d[2], n1[0], n1[1], n1[2], ...uv(d, u1));
      // winding from the geometric normal vs the intended normal
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      const gx = uy * wz - uz * wy, gy = uz * wx - ux * wz, gz = ux * wy - uy * wx;
      if (gx * n0[0] + gy * n0[1] + gz * n0[2] >= 0) { B.tri(v0, v1, v2); B.tri(v0, v2, v3); } else { B.tri(v0, v2, v1); B.tri(v0, v3, v2); }
      acc += el;
    }
  }
}

/** Seeded colour jitter helper. */
export const mix = (a, b, t) => a + (b - a) * t;
export const col = (hex) => new THREE.Color(hex);
