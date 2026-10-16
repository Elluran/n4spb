// landmarksJ/prims.js - geometry primitives of the cathedral builder (all draw through the kit's Parts collector `P` in the model frame, see frame.js):
// arcs around the colonnade centre (vertical faces / horizontal annulus sectors), the Corinthian column (fluted shaft + capital + base), lathe bodies, bush mounds, a bronze figure.
import * as THREE from 'three';

export const DEG = Math.PI / 180;
/** point on a circle around the model origin; angle a from +mz (south) towards +mx (east) */
export const pol = (R, a) => [R * Math.sin(a), R * Math.cos(a)];

/** vertical cylinder-section face at radius R between angles a0..a1, from y0 to y1; inward = the face looks at the centre. uvu / uvv: metres per uv unit (tiles: o.tile = metres per tile along the arc) */
export function arcWall(P, mat, R, a0, a1, y0, y1, inward, o = {}) {
  const seg = o.seg ?? Math.max(1, Math.ceil(Math.abs(a1 - a0) * R / (o.step ?? 2.4)));
  const uvu = o.uvu ?? 2.4, uvv = o.uvv ?? uvu, sg = inward ? -1 : 1, vb = o.vBase ?? 0;
  let acc = o.u0 ?? 0;
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + (a1 - a0) * i / seg, t1 = a0 + (a1 - a0) * (i + 1) / seg;
    const [x0, z0] = pol(R, t0), [x1, z1] = pol(R, t1), len = Math.hypot(x1 - x0, z1 - z0);
    const U0 = acc / uvu, U1 = (acc + len) / uvu; acc += len;
    P.quad(mat, [x0, y0, z0], [x1, y0, z1], [x1, y1, z1], [x0, y1, z0], [sg * Math.sin((t0 + t1) / 2), 0, sg * Math.cos((t0 + t1) / 2)], [[U0, (y0 - vb) / uvv], [U1, (y0 - vb) / uvv], [U1, (y1 - vb) / uvv], [U0, (y1 - vb) / uvv]]);
  }
}
/** horizontal annulus sector R0..R1 at height y between angles a0..a1; up = the face looks up */
export function arcFlat(P, mat, R0, R1, a0, a1, y, up, o = {}) {
  const seg = o.seg ?? Math.max(1, Math.ceil(Math.abs(a1 - a0) * (R0 + R1) / 2 / (o.step ?? 2.4)));
  const s = o.uvs ?? 2.4;
  for (let i = 0; i < seg; i++) {
    const t0 = a0 + (a1 - a0) * i / seg, t1 = a0 + (a1 - a0) * (i + 1) / seg;
    const p0 = pol(R0, t0), p1 = pol(R1, t0), p2 = pol(R1, t1), p3 = pol(R0, t1);
    const Rm = (R0 + R1) / 2, u0 = Rm * t0 / s, u1 = Rm * t1 / s, v0 = R0 / s, v1 = R1 / s;
    P.quad(mat, [p0[0], y, p0[1]], [p1[0], y, p1[1]], [p2[0], y, p2[1]], [p3[0], y, p3[1]], [0, up ? 1 : -1, 0], [[u0, v0], [u0, v1], [u1, v1], [u1, v0]]);
  }
}
/** a closed band: top, bottom and both vertical faces of an annulus sector slab (R0 < R1) between y0..y1 */
export function arcSlab(P, mats, R0, R1, a0, a1, y0, y1, o = {}) {
  if (mats.top) arcFlat(P, mats.top, R0, R1, a0, a1, y1, true, o);
  if (mats.bottom) arcFlat(P, mats.bottom, R0, R1, a0, a1, y0, false, o);
  if (mats.inner) arcWall(P, mats.inner, R0, a0, a1, y0, y1, true, o);
  if (mats.outer) arcWall(P, mats.outer, R1, a0, a1, y0, y1, false, o);
}

/** a box whose four side faces carry a texture tiled by metres along the face (uvu) and uvv in height (v = 0 at vBase): dentil bands, friezes */
export function texBox(P, mat, x0, x1, y0, y1, z0, z1, uvu, uvv, vBase = y0, skip = '') {
  const v0 = (y0 - vBase) / uvv, v1 = (y1 - vBase) / uvv;
  if (!skip.includes('f')) P.quad(mat, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 / uvu, v0], [x1 / uvu, v0], [x1 / uvu, v1], [x0 / uvu, v1]]);
  if (!skip.includes('k')) P.quad(mat, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[-x1 / uvu, v0], [-x0 / uvu, v0], [-x0 / uvu, v1], [-x1 / uvu, v1]]);
  if (!skip.includes('l')) P.quad(mat, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 / uvu, v0], [z1 / uvu, v0], [z1 / uvu, v1], [z0 / uvu, v1]]);
  if (!skip.includes('r')) P.quad(mat, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[-z1 / uvu, v0], [-z0 / uvu, v0], [-z0 / uvu, v1], [-z1 / uvu, v1]]);
  if (!skip.includes('t')) P.box(mat, x0, x1, y1, y1 + 0.0001, z0, z1, 'fklrb');
  if (!skip.includes('b')) P.box(mat, x0, x1, y0 - 0.0001, y0, z0, z1, 'fklrt');
}

// ------------------------------------------------------------------------------------------------ columns
const shaftCache = new Map();
/** fluted shaft with entasis: 20 flutes (a zig-zag of ridges and grooves), 2 rows, flat shaded, base at y = 0, height H; non-indexed */
export function shaftGeo(H, r0, r1, nf = 20, depth = 0.05) {
  const key = [H, r0, r1, nf, depth].join('|');
  if (shaftCache.has(key)) return shaftCache.get(key);
  const rows = [0, 0.4, 1], nv = nf * 2, pos = [], nrm = [];
  const rad = (t) => r0 + (r1 - r0) * t + 0.028 * Math.sin(Math.PI * t);
  const uvs = [];
  const vert = (i, t) => { const a = i * Math.PI / nf, rr = rad(t) - (i % 2 ? depth : 0); return [rr * Math.sin(a), H * t, rr * Math.cos(a), i, t]; };
  const tri = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
    if (nx * (a[0] + b[0] + c[0]) + nz * (a[2] + b[2] + c[2]) < 0) { const t = b; b = c; c = t; }
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      const l = Math.hypot(p[0], p[2]) || 1; nrm.push(p[0] / l, 0, p[2] / l);                       // smooth radial normals: no outline noise from the flutes, the flutes come from the texture
      let ii = p[3]; if (ii === 0 && (a[3] === nv - 1 || b[3] === nv - 1 || c[3] === nv - 1)) ii = nv;
      uvs.push(ii / nv, p[4]);
    }
  };
  for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i < nv; i++) {
    const a = vert(i, rows[j]), b = vert((i + 1) % nv, rows[j]), c = vert((i + 1) % nv, rows[j + 1]), d = vert(i, rows[j + 1]);
    tri(a, b, c); tri(a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  shaftCache.set(key, g); return g;
}

/** Corinthian capital: bell, two rows of 8 acanthus leaves, 4 corner volutes, abacus.  Height 1.6 m, centre (x, z), bottom y.  s = scale */
export function capital(P, mat, x, y, z, s = 1) {
  const R = 0.58 * s;
  P.cyl(mat, [x, y, z], [x, y + 1.25 * s, z], R, 0.93 * s, 12, false);
  P.cyl(mat, [x, y, z], [x, y + 0.06 * s, z], R * 1.08, R, 12, false);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, ca = Math.sin(a), sa = Math.cos(a);
    P.cyl(mat, [x + ca * 0.6 * s, y + 0.04 * s, z + sa * 0.6 * s], [x + ca * 0.8 * s, y + 0.72 * s, z + sa * 0.8 * s], 0.22 * s, 0.12 * s, 4, false);
    const b = a + Math.PI / 8, cb = Math.sin(b), sb = Math.cos(b);
    P.cyl(mat, [x + cb * 0.78 * s, y + 0.5 * s, z + sb * 0.78 * s], [x + cb * 1.0 * s, y + 1.22 * s, z + sb * 1.0 * s], 0.2 * s, 0.11 * s, 4, false);
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, cx = x + Math.sin(a) * 0.93 * s, cz = z + Math.cos(a) * 0.93 * s, tx = Math.cos(a) * 0.3 * s, tz = -Math.sin(a) * 0.3 * s;
    P.cyl(mat, [cx - tx, y + 1.14 * s, cz - tz], [cx + tx, y + 1.14 * s, cz + tz], 0.17 * s, 0.17 * s, 6, true);
  }
  P.box(mat, x - 1.0 * s, x + 1.0 * s, y + 1.36 * s, y + 1.6 * s, z - 1.0 * s, z + 1.0 * s, 'b');
}
/** a full column on a square plinth: base y0.  H = total height (base + shaft + capital).  r0 / r1 = lower / upper shaft radius.  Returns the shaft top. */
export function column(P, M, x, y0, z, H = 14, o = {}) {
  const r0 = o.r0 ?? 0.725, r1 = o.r1 ?? 0.55, s = o.s ?? 1, mat = o.mat || M.stone, hb = 0.72, hc = 1.6 * s;
  P.box(M.baseGranite, x - 1.0, x + 1.0, y0, y0 + 0.42, z - 1.0, z + 1.0, 'b');
  P.cyl(M.baseGranite, [x, y0 + 0.42, z], [x, y0 + hb, z], 0.96, 0.84, 14, false);
  P.geo(o.shaftMat || M.shaft, shaftGeo(H - hb - hc, r0, r1), x, y0 + hb, z);
  capital(P, mat, x, y0 + H - hc, z, s);
  return y0 + H;
}

// ------------------------------------------------------------------------------------------------ lathe / mounds / figure
const latheCache = new Map();
export function lathe(P, mat, key, pts, x, y, z, sr = 1, sy = 1, seg = 24) {
  const k = key + '|' + seg;
  if (!latheCache.has(k)) latheCache.set(k, new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg));
  P.geo(mat, latheCache.get(k), x, y, z, 0, 0, 0, sr, sy, sr);
}
/** a clipped bush: a rounded mound over the ring (array of [x, z] in the current frame) of height h at ground y.  3 rings + a top, smooth normals */
export function mound(P, mat, ring, y, h, o = {}) {
  const n = ring.length; if (n < 3) return;
  let cx = 0, cz = 0; for (const p of ring) { cx += p[0]; cz += p[1]; } cx /= n; cz /= n;
  const prof = o.prof || [[1.0, 0], [0.97, 0.45], [0.8, 0.82], [0.5, 1.0], [0.0, 1.0]];
  const pos = [], nrm = [], idx = [];
  const rings = prof.map(([k, t], j) => ring.map((p, i) => [cx + (p[0] - cx) * k, y + h * t + (o.bump ? o.bump(p[0], p[1], j, i) : 0), cz + (p[1] - cz) * k]));
  for (let j = 0; j < prof.length; j++) for (let i = 0; i < n; i++) {
    const p = rings[j][i];
    const dx = p[0] - cx, dz = p[2] - cz, dl = Math.hypot(dx, dz) || 1;
    const slope = j + 1 < prof.length ? (prof[j][1] - prof[j + 1][1]) / Math.max(0.05, prof[j][0] - prof[j + 1][0]) : 0.01;
    const sl = Math.atan(slope), up = Math.min(1, Math.max(0.0, 1 - Math.abs(sl) * 0.5)), hz = 1 - up;
    const nl = Math.hypot(hz * dx / dl, up, hz * dz / dl) || 1;
    pos.push(p[0], p[1], p[2]); nrm.push(hz * dx / dl / nl, (j === prof.length - 1 ? 1 : up) / nl, hz * dz / dl / nl);
  }
  for (let j = 0; j + 1 < prof.length; j++) for (let i = 0; i < n; i++) {
    const a = j * n + i, b = j * n + (i + 1) % n, c = (j + 1) * n + (i + 1) % n, d = (j + 1) * n + i;
    idx.push(a, b, c, a, c, d);
  }
  // orient: outward + up must face the viewer: test the first triangle
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
  const t = idx.slice(0, 3), A = new THREE.Vector3().fromArray(pos, t[0] * 3), B = new THREE.Vector3().fromArray(pos, t[1] * 3), Cc = new THREE.Vector3().fromArray(pos, t[2] * 3);
  const nn = new THREE.Vector3().crossVectors(B.clone().sub(A), Cc.clone().sub(A));
  const out = new THREE.Vector3(A.x - cx, 0.3, A.z - cz);
  if (nn.dot(out) < 0) for (let i = 0; i < idx.length; i += 3) { const q = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = q; }
  g.setIndex(idx);
  P.geo(mat, g, 0, 0, 0); g.dispose();
}

/**
 * A standing bronze figure in a long coat, height H, at (x, y, z) facing local +z rotated by rot (model frame).  pose: 'kutuzov' (right arm forward with a baton, left hand on a sabre) | 'barclay' (baton low) | 'saint'.
 */
export function figure(P, mat, x, y, z, rot, H, pose = 'barclay') {
  P.push(x, y, z, rot);
  const s = H / 4.1;
  P.cyl(mat, [0, 0.0, 0], [0, 1.9 * s, 0], 0.62 * s, 0.4 * s, 10, false);                    // coat skirt
  P.cyl(mat, [0, 1.9 * s, 0], [0, 2.9 * s, 0], 0.4 * s, 0.46 * s, 10, true);                  // torso
  P.box(mat, -0.5 * s, 0.5 * s, 2.55 * s, 2.95 * s, -0.22 * s, 0.22 * s, '');                  // shoulders
  P.cyl(mat, [0, 2.95 * s, 0], [0, 3.3 * s, 0], 0.17 * s, 0.17 * s, 8, true);                 // neck / collar
  P.geo(mat, new THREE.SphereGeometry(0.27 * s, 8, 6), 0, 3.62 * s, 0.03 * s, 0, 0, 0, 1, 1.18, 1);          // head
  P.box(mat, -0.62 * s, -0.4 * s, 2.7 * s, 2.82 * s, -0.12 * s, 0.14 * s, '');                        // epaulettes
  P.box(mat, 0.4 * s, 0.62 * s, 2.7 * s, 2.82 * s, -0.12 * s, 0.14 * s, '');
  if (pose === 'kutuzov') {
    P.cyl(mat, [0.44 * s, 2.8 * s, 0.05 * s], [0.5 * s, 2.7 * s, 0.9 * s], 0.15 * s, 0.12 * s, 6, true);          // right arm forward
    P.cyl(mat, [0.5 * s, 2.7 * s, 0.9 * s], [0.5 * s, 2.7 * s, 1.5 * s], 0.045 * s, 0.045 * s, 5, true);         // baton
    P.cyl(mat, [-0.44 * s, 2.7 * s, 0], [-0.42 * s, 1.9 * s, 0.35 * s], 0.14 * s, 0.1 * s, 6, true);              // left arm
    P.cyl(mat, [-0.42 * s, 1.9 * s, 0.38 * s], [-0.4 * s, 0.1 * s, 0.4 * s], 0.035 * s, 0.03 * s, 5, true);       // sabre point down
  } else {
    P.cyl(mat, [0.44 * s, 2.75 * s, 0.05 * s], [0.5 * s, 2.0 * s, 0.4 * s], 0.14 * s, 0.1 * s, 6, true);
    P.cyl(mat, [0.5 * s, 2.0 * s, 0.4 * s], [0.5 * s, 1.95 * s, 1.0 * s], 0.045 * s, 0.045 * s, 5, true);
    P.cyl(mat, [-0.44 * s, 2.7 * s, 0], [-0.45 * s, 1.5 * s, 0.1 * s], 0.14 * s, 0.1 * s, 6, true);
  }
  P.pop();
}
