// landmarksH/bronze_geom.js - smooth organic geometry for the Bronze Horseman: lofted tubes (Catmull-Rom path, elliptic section with a radius per control point, rounded
// caps, optional angular sector for cloth sheets, optional radial bump for folds / ropey strands) and oriented ellipsoids ("muscles").  Everything returns a THREE.BufferGeometry with
// SMOOTH normals (shared ring vertices) and a patina UV (u = horizontal position, v = normal.y: top-facing surfaces read the verdigris rows of the bronze texture), ready for P.geo().
// Frames: a tube's section axis `a` is the projection of `ref` (default +x) on the plane normal to the path, `b` = tangent x a.  Models face +z, stand on y = 0.
import * as THREE from 'three';

const cr = (p0, p1, p2, p3, w) => 0.5 * ((2 * p1) + (-p0 + p2) * w + (2 * p0 - 5 * p1 + 4 * p2 - p3) * w * w + (-p0 + 3 * p1 - 3 * p2 + p3) * w * w * w);

/** radius pair [a, b] at path parameter t (0..1 over the control points) */
export function radAt(R, t, closed = false) {
  const n = R.length, span = closed ? n : n - 1;
  if (n === 1) return [Math.max(0.002, R[0][0]), Math.max(0.002, R[0][1])];
  const p =Math.max(0, Math.min(span, t * span));
  const i = Math.min(Math.floor(p), span - 1), w = p - i;
  const g = (k) => (closed ? R[((k % n) + n) % n] : R[Math.max(0, Math.min(n - 1, k))]);
  const A = g(i - 1), B = g(i), C = g(i + 1), D = g(i + 2);
  return [Math.max(0.002, cr(A[0], B[0], C[0], D[0], w)), Math.max(0.002, cr(A[1], B[1], C[1], D[1], w))];
}
const norm = (R, path) => (typeof R === 'number' ? path.map(() => [R, R]) : R.map((r) => (typeof r === 'number' ? [r, r] : r)));
const curveOf = (path, closed) => new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(p[0], p[1], p[2])), closed, 'centripetal');

/** frame of a path at t: { c, a, b, t (tangent), ra, rb } (arrays) */
export function frameAt(path, rad, t, o = {}) {
  const curve = curveOf(path, !!o.closed), R = norm(rad, path);
  const c = curve.getPoint(t), tg = curve.getTangent(t), ref = o.ref || [1, 0, 0];
  const d = ref[0] * tg.x + ref[1] * tg.y + ref[2] * tg.z;
  let a = new THREE.Vector3(ref[0] - d * tg.x, ref[1] - d * tg.y, ref[2] - d * tg.z);
  if (a.length() < 0.15) { const r2 = [0, 1, 0], d2 = r2[1] * tg.y; a.set(-d2 * tg.x, 1 - d2 * tg.y, -d2 * tg.z); }
  a.normalize(); const b = new THREE.Vector3().crossVectors(tg, a).normalize();
  const [ra, rb] = radAt(R, t, !!o.closed);
  return { c: [c.x, c.y, c.z], a: [a.x, a.y, a.z], b: [b.x, b.y, b.z], t: [tg.x, tg.y, tg.z], ra, rb };
}

/** patina uv: u from the horizontal position (streaks run down the surface), v from the normal's up component */
export function patinaUV(g, scale = 2.4) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) + 0.7 * p.getZ(i)) / scale + p.getY(i) * 0.03;
    uv[i * 2 + 1] = Math.max(0.01, Math.min(0.99, n.getY(i) * 0.5 + 0.5));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/**
 * Lofted tube.  path: [[x,y,z]..] control points; rad: number | [[ra, rb]..] per control point (ra along `a`, rb along `b`).
 * o: seg (sides, 12), per (rings per control interval, 5), rings, ref, closed (loop), cap (false = open ends), capN (cap rings, 3),
 *    sector (fn(t) -> [a0, a1] radians, or [a0, a1]) for open sheets, bump (fn(t, theta) -> radius factor), twist (fn(t) -> radians), uv (false = keep none)
 */
export function tube(path, rad, o = {}) {
  const closed = !!o.closed, sector = o.sector || null;
  const curve = curveOf(path, closed);
  const span = closed ? path.length : path.length - 1;
  const rings = o.rings || Math.max(4, Math.round(span * (o.per ?? 5)));
  const seg = o.seg ?? 12, R = norm(rad, path), ref = o.ref || [1, 0, 0];
  const capN = (closed || sector || o.cap === false) ? 0 : (o.capN ?? 3);
  const K = sector ? seg + 1 : seg;
  const pos = [], cen = [], rowsOf = [];                                   // rowsOf: [{ i0, apex }]
  const push = (x, y, z, c) => { pos.push(x, y, z); cen.push(c[0], c[1], c[2]); return pos.length / 3 - 1; };
  const nr = closed ? rings : rings + 1;
  const fr = [];
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tg = new THREE.Vector3();
  for (let i = 0; i < nr; i++) {
    const t = i / rings, c = curve.getPoint(t); curve.getTangent(t, tg);
    const d = ref[0] * tg.x + ref[1] * tg.y + ref[2] * tg.z;
    tmpA.set(ref[0] - d * tg.x, ref[1] - d * tg.y, ref[2] - d * tg.z);
    if (tmpA.length() < 0.15) { const d2 = tg.y; tmpA.set(-d2 * tg.x, 1 - d2 * tg.y, -d2 * tg.z); }
    tmpA.normalize(); tmpB.crossVectors(tg, tmpA).normalize();
    if (o.twist) { const w = o.twist(t), cw = Math.cos(w), sw = Math.sin(w); const a2 = tmpA.clone().multiplyScalar(cw).addScaledVector(tmpB, sw), b2 = tmpB.clone().multiplyScalar(cw).addScaledVector(tmpA, -sw); tmpA.copy(a2); tmpB.copy(b2); }
    const [ra, rb] = radAt(R, t, closed);
    fr.push({ c: c.clone(), a: tmpA.clone(), b: tmpB.clone(), t: tg.clone(), ra, rb, tt: t });
  }
  const ringAt = (f, scale, shift, cApex) => {
    const i0 = pos.length / 3;
    const [s0, s1] = sector ? (typeof sector === 'function' ? sector(f.tt) : sector) : [0, 0];
    for (let k = 0; k < K; k++) {
      const th = sector ? s0 + (s1 - s0) * k / seg : k / seg * Math.PI * 2;
      const m = (o.bump ? o.bump(f.tt, th) : 1) * scale;
      const ca = Math.cos(th) * f.ra * m, sb = Math.sin(th) * f.rb * m;
      push(f.c.x + f.a.x * ca + f.b.x * sb + f.t.x * shift, f.c.y + f.a.y * ca + f.b.y * sb + f.t.y * shift, f.c.z + f.a.z * ca + f.b.z * sb + f.t.z * shift, [f.c.x, f.c.y, f.c.z]);
    }
    rowsOf.push({ i0 });
  };
  const apexAt = (f, shift) => { const i0 = push(f.c.x + f.t.x * shift, f.c.y + f.t.y * shift, f.c.z + f.t.z * shift, [f.c.x, f.c.y, f.c.z]); rowsOf.push({ i0, apex: true }); };
  const f0 = fr[0], fN = fr[fr.length - 1];
  if (capN) {
    const rm = (f0.ra + f0.rb) / 2;
    apexAt(f0, -rm);
    for (let j = capN - 1; j >= 1; j--) { const ph = Math.PI / 2 * j / capN; ringAt(f0, Math.cos(ph), -rm * Math.sin(ph)); }
  }
  for (const f of fr) ringAt(f, 1, 0);
  if (capN) {
    const rm = (fN.ra + fN.rb) / 2;
    for (let j = 1; j <= capN - 1; j++) { const ph = Math.PI / 2 * j / capN; ringAt(fN, Math.cos(ph), rm * Math.sin(ph)); }
    apexAt(fN, rm);
  }
  const idx = [];
  const nRows = rowsOf.length;
  const stitch = (A, B) => {
    if (A.apex && B.apex) return;
    if (A.apex) { for (let k = 0; k < seg; k++) idx.push(A.i0, B.i0 + k, B.i0 + (k + 1) % K); return; }
    if (B.apex) { for (let k = 0; k < seg; k++) idx.push(A.i0 + k, B.i0, A.i0 + (k + 1) % K); return; }
    const lim = sector ? seg : K;
    for (let k = 0; k < lim; k++) {
      const k1 = sector ? k + 1 : (k + 1) % K;
      idx.push(A.i0 + k, B.i0 + k, A.i0 + k1, A.i0 + k1, B.i0 + k, B.i0 + k1);
    }
  };
  for (let r = 0; r + 1 < nRows; r++) stitch(rowsOf[r], rowsOf[r + 1]);
  if (closed) stitch(rowsOf[nRows - 1], rowsOf[0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // orientation check: normals must point away from the path
  const nrm = g.attributes.normal;
  let s = 0; for (let i = 0; i < nrm.count; i++) s += nrm.getX(i) * (pos[i * 3] - cen[i * 3]) + nrm.getY(i) * (pos[i * 3 + 1] - cen[i * 3 + 1]) + nrm.getZ(i) * (pos[i * 3 + 2] - cen[i * 3 + 2]);
  if (s < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } g.setIndex(idx); g.computeVertexNormals(); }
  if (o.uv !== false) patinaUV(g, o.uvScale);
  return g;
}

const sphereCache = new Map();
const unitSphere = (w, h) => { const k = w + 'x' + h; if (!sphereCache.has(k)) sphereCache.set(k, new THREE.SphereGeometry(1, w, h)); return sphereCache.get(k); };

/** ellipsoid centred at c, radii r = [rx, ry, rz] in a frame whose z axis is `dir` (default +z), x axis the projection of +x (or ref) */
export function blob(c, r, o = {}) {
  const g = unitSphere(o.w ?? 14, o.h ?? 10).clone();
  const z = new THREE.Vector3(...(o.dir || [0, 0, 1])).normalize();
  const ref = new THREE.Vector3(...(o.ref || [1, 0, 0]));
  const x = ref.clone().addScaledVector(z, -ref.dot(z));
  if (x.length() < 0.1) x.set(0, 1, 0).addScaledVector(z, -z.y);
  x.normalize(); const y = new THREE.Vector3().crossVectors(z, x);
  const m = new THREE.Matrix4().makeBasis(x, y, z);
  m.scale(new THREE.Vector3(r[0], r[1], r[2]));
  const full = new THREE.Matrix4().makeTranslation(c[0], c[1], c[2]).multiply(m);
  g.applyMatrix4(full);
  if (o.uv !== false) patinaUV(g);
  return g;
}

/** ellipsoid stretched between two points: cross radii (ra, rb), length factor k (1 = touches both ends) */
export function blobBetween(p, q, ra, rb, o = {}) {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0], d[1], d[2]);
  return blob([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], [ra, rb, L / 2 * (o.k ?? 1)], { ...o, dir: d });
}

/** points of a closed loop (for straps / rings): centre c, axis direction, radii (ra along u, rb along v) */
export function loopPts(c, axis, ra, rb, n = 10, phase = 0) {
  const z = new THREE.Vector3(...axis).normalize();
  const u = new THREE.Vector3(1, 0, 0).addScaledVector(z, -z.x); if (u.length() < 0.1) u.set(0, 1, 0); u.normalize();
  const v = new THREE.Vector3().crossVectors(z, u);
  const out = [];
  for (let i = 0; i < n; i++) { const t = phase + i / n * Math.PI * 2; out.push([c[0] + u.x * Math.cos(t) * ra + v.x * Math.sin(t) * rb, c[1] + u.y * Math.cos(t) * ra + v.y * Math.sin(t) * rb, c[2] + u.z * Math.cos(t) * ra + v.z * Math.sin(t) * rb]); }
  return out;
}

/** a tiny deterministic noise in [-1, 1] */
export const hash1 = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
