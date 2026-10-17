// landmarksF/util.js - small helpers: OSM records in the model frame, point in polygon, half-plane clipping, fence runs, instanced meshes.
import * as THREE from 'three';
import { Mdl, W, boxAt } from './frame.js';
import * as D from '../data/city.js';
import { Parts } from './kit.js';

/** flat [x, z, ...] world ring -> [[mx, mz], ...] */
export const ringToModel = (flat) => { const o = []; for (let i = 0; i + 1 < flat.length; i += 2) { const p = Mdl(flat[i], flat[i + 1]); o.push([p.mx, p.mz]); } return o; };
export const inPoly = (ring, x, z) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
export const area = (ring) => { let a = 0; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]; return a / 2; };
/** Sutherland-Hodgman clip of a polygon against the half plane  nx*x + nz*z <= d */
export function clipHalf(ring, nx, nz, d) {
  const out = [], f = (p) => nx * p[0] + nz * p[1] - d;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], fa = f(a), fb = f(b);
    if (fa <= 0) out.push(a);
    if ((fa < 0 && fb > 0) || (fa > 0 && fb < 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
export const recById = (arr, id) => arr.find((r) => r.id === id);
/** model-frame rings of a GREEN / BARRIERS / AREAS record (first polygon outline / pts) */
export function ringOf(rec) { const flat = rec.pts || (rec.polys && rec.polys[0].o); return ringToModel(flat); }

/**
 * Draw a fence run along a polyline of model points [[mx, mz], ...] (closed: repeat the first point): a picket plane (alpha-cut texture, 2.5 m tile), top / bottom rails, posts every `gap` m
 * with a ball knob.  Gaps (gates) = [{ x, z, w }] model points: a fence segment is cut where it passes within w/2 of a gate.  Adds thin colliders on every drawn piece.  o = { h, y, mat, tile, post, knob }.
 */
export function fenceRun(K, pts, gates, o = {}) {
  const P = K.P, M = K.M, ph = K.ctx.physics, h = o.h ?? 1.1, y = o.y ?? 0.145, mat = o.mat || M.pickets, tile = o.tile ?? 2.5, gap = o.gap ?? 2.5, ironM = o.iron || M.iron;
  let n = 0;
  const drawPiece = (a, b) => {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.2) return;
    const nx = dz / len, nz = -dx / len;                                       // one side normal (the plane is double sided)
    const k = Math.max(1, Math.round(len / tile));
    P.quad(mat, [a[0], y + 0.0, a[1]], [b[0], y + 0.0, b[1]], [b[0], y + h, b[1]], [a[0], y + h, a[1]], [nx, 0, nz], [[0, 0], [k, 0], [k, 1], [0, 1]]);
    P.quad(mat, [b[0], y + 0.0, b[1]], [a[0], y + 0.0, a[1]], [a[0], y + h, a[1]], [b[0], y + h, b[1]], [-nx, 0, -nz], [[k, 0], [0, 0], [0, 1], [k, 1]]);
    P.cyl(ironM, [a[0], y + h * 0.84, a[1]], [b[0], y + h * 0.84, b[1]], 0.022, 0.022, 4, false);
    P.cyl(ironM, [a[0], y + 0.18, a[1]], [b[0], y + 0.18, b[1]], 0.02, 0.02, 4, false);
    const m = Math.max(1, Math.round(len / gap));
    for (let i = 0; i <= m; i++) { const px = a[0] + dx * i / m, pz = a[1] + dz * i / m; post(px, pz); }
    boxAt(ph, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len, 0.22, Math.atan2(-dz, dx), -1, y + h + 0.3); n++;
  };
  const post = (x, z) => { P.box(ironM, x - 0.055, x + 0.055, y, y + h + 0.12, z - 0.055, z + 0.055, 'b'); P.geo(ironM, K.ballGeo || (K.ballGeo = new THREE.SphereGeometry(0.1, 6, 4)), x, y + h + 0.2, z); };
  for (let i = 0; i + 1 < pts.length; i++) {
    let a = pts[i], b = pts[i + 1];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.01) continue;
    // cut intervals [t0, t1] (metres along the segment) where a gate lies
    const cuts = [];
    for (const g of gates || []) {
      const t = ((g.x - a[0]) * dx + (g.z - a[1]) * dz) / len, d = Math.abs((g.x - a[0]) * dz - (g.z - a[1]) * dx) / len;
      if (d < (g.w || 3) * 0.9 && t > -g.w / 2 && t < len + g.w / 2) cuts.push([t - g.w / 2, t + g.w / 2]);
    }
    cuts.sort((p, q) => p[0] - q[0]);
    let s = 0;
    for (const [c0, c1] of cuts) { if (c0 > s + 0.1) piece(s, Math.min(c0, len)); s = Math.max(s, c1); }
    if (s < len - 0.1) piece(s, len);
    function piece(t0, t1) { const A = [a[0] + dx / len * t0, a[1] + dz / len * t0], B = [a[0] + dx / len * t1, a[1] + dz / len * t1]; drawPiece(A, B); }
    void b;
  }
  return n;
}

/** InstancedMesh from a geometry + material and a list of {x, y, z, rotY, s}; world coordinates; added as static scenery */
export function instances(ctx, geo, mat, list, name, o = {}) {
  if (!list.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, list.length), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  list.forEach((t, i) => { q.setFromAxisAngle(up, t.rotY || 0); const s = t.s ?? 1; sc.set(s, t.sy ?? s, s); m4.compose(pos.set(t.x, t.y || 0, t.z), q, sc); im.setMatrixAt(i, m4); if (t.color && im.setColorAt) im.setColorAt(i, t.color); });
  im.instanceMatrix.needsUpdate = true; im.castShadow = o.shadow !== false; im.receiveShadow = !!o.receive; im.name = name;
  im.computeBoundingBox(); im.computeBoundingSphere();
  if (o.noOutline) ctx.noOutline(im);
  ctx.addStatic(im); return im;
}
/** the template geometries of a small model drawn by `draw(P)` at the origin, one per material: [{ mat, geo }] (a knockable piece is an instance of each, core/knock.js) */
export function templateOf(draw) {
  const P = new Parts(), g = new THREE.Group(); draw(P);
  return P.build(g, {}).map((m) => ({ mat: m.material, geo: m.geometry }));
}
/** vertex-coloured box merge helper for small furniture models */
export function vcModel(boxes) {
  const geos = [];
  for (const b of boxes) {
    const g = new THREE.BoxGeometry(b.w, b.h, b.d); g.translate(b.x, b.y, b.z);
    if (b.rx) { g.translate(-b.x, -b.y, -b.z); g.rotateX(b.rx); g.translate(b.x, b.y, b.z); }
    const col = new THREE.Color(b.c), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); geos.push(g.toNonIndexed());
  }
  const out = new THREE.BufferGeometry();
  const pos = [], nrm = [], col = [], uv = [];
  for (const g of geos) { pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); col.push(...g.attributes.color.array); uv.push(...g.attributes.uv.array); }
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

let blobGeo = null, ballGeo = null;
export const getBlob = () => blobGeo || (blobGeo = new THREE.IcosahedronGeometry(1, 1));
export const getBall = () => ballGeo || (ballGeo = new THREE.SphereGeometry(0.1, 6, 4));
/** flat ribbon of width w along a polyline of model points at height y (quads per segment, overlapping at the joints) */
export function ribbon(P, mat, pts, w, y, uvs = 3) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.05) continue;
    const nx = -dz / l * w / 2, nz = dx / l * w / 2;
    P.quad(mat, [a[0] - nx, y, a[1] - nz], [a[0] + nx, y, a[1] + nz], [b[0] + nx, y, b[1] + nz], [b[0] - nx, y, b[1] - nz], [0, 1, 0], [[0, 0], [w / uvs, 0], [w / uvs, l / uvs], [0, l / uvs]]);
  }
}
/** white-slat park bench model (vertex coloured, faces +z): seat, back and cast-iron ends */
export function benchGeo() {
  const W_ = '#e8e6dc', I_ = '#1f2224', boxes = [];
  for (let i = 0; i < 5; i++) boxes.push({ w: 1.7, h: 0.035, d: 0.075, x: 0, y: 0.45, z: -0.19 + i * 0.095, c: W_ });
  for (let i = 0; i < 3; i++) boxes.push({ w: 1.7, h: 0.1, d: 0.03, x: 0, y: 0.62 + i * 0.14, z: -0.27 - i * 0.05, c: W_, rx: -0.3 });
  for (const sx of [-0.78, 0.78]) { boxes.push({ w: 0.04, h: 0.45, d: 0.06, x: sx, y: 0.22, z: 0.18, c: I_ }); boxes.push({ w: 0.04, h: 0.45, d: 0.06, x: sx, y: 0.22, z: -0.22, c: I_ }); boxes.push({ w: 0.04, h: 0.5, d: 0.05, x: sx, y: 0.7, z: -0.32, c: I_, rx: -0.3 }); boxes.push({ w: 0.05, h: 0.04, d: 0.5, x: sx, y: 0.5, z: -0.05, c: I_ }); }
  return vcModel(boxes);
}
/** a linden / maple: trunk + 6 crown blobs; s = scale (1 ~ 8.5 m tall), kind 0|1 picks the greens */
export function tree(P, M, x, z, s, rnd, kind = 0, y0 = 0.17) {
  const mats = [M.hedge, M.hedge2, M.crownC];
  P.cyl(M.bark, [x, y0, z], [x, y0 + 3.6 * s, z], 0.38 * s, 0.26 * s, 7, false);
  const blobs = [[0, 6.0, 0, 3.4], [1.9, 5.3, 0.8, 2.7], [-1.8, 5.5, -0.7, 2.8], [0.4, 8.0, 0.3, 2.5], [0.2, 5.0, 1.9, 2.5], [-0.3, 5.2, -2.0, 2.6]];
  let i = 0;
  for (const [dx, dy, dz, r] of blobs) P.geo(mats[(kind + (i++ % 2)) % mats.length], getBlob(), x + dx * s, y0 + dy * s - 0.17, z + dz * s, 0, rnd() * 3, 0, r * s, r * s * 0.85, r * s);
}
/** a black cast-iron street lantern 4 m high (the pair at the west portico): flared base, pole, hexagonal glass lantern */
export function lantern(P, M, x, z) {
  P.cyl(M.iron, [x, 0.1, z], [x, 0.9, z], 0.26, 0.13, 8, false); P.cyl(M.iron, [x, 0.9, z], [x, 3.1, z], 0.07, 0.06, 6, false);
  P.cyl(M.iron, [x, 3.1, z], [x, 3.25, z], 0.2, 0.2, 6, true);
  P.cyl(M.lampGlass, [x, 3.25, z], [x, 3.95, z], 0.2, 0.28, 6, false);
  P.cyl(M.iron, [x, 3.95, z], [x, 4.25, z], 0.34, 0.03, 6, false);
}
export { D, W, Mdl };
