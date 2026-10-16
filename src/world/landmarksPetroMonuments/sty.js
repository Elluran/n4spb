// landmarksPetroMonuments/sty.js - helpers shared by the pieces (all in the PIECE FRAME: origin on the ground at the monument, +z = the front, figures face +z): cached Sculpt figures, head frames, limbs,
// plinths and pillars (vertex-tinted stone), natural boulders (three instanced variants), rings of cobbles, bollards with chains, a figure placed with a tint.  Adapted from landmarksVOStatues/sty.js.
import * as THREE from 'three';
import { Sculpt, V, cached, bust, face } from '../lib/figures.js';
import { loft, lathe, ngon, prism, disc } from './solids.js';
import { plateOn, plateQuad, freeAlongWall, reserveRect } from './plates.js';
import { PAL } from './mats.js';

export { PAL };

/** head frame (unit axes) for a head centred at c, rotated by pitch (+ = looks down), yaw (+ = turns to the figure's left), roll */
export function HF(c, pitch = 0, yaw = 0, roll = 0) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
  const rot = (v) => { let [x, y, z] = v; [x, y] = [x * cr - y * sr, x * sr + y * cr]; [y, z] = [y * cp - z * sp, y * sp + z * cp]; [x, z] = [x * cy + z * sy, -x * sy + z * cy]; return [x, y, z]; };
  return { c, x: rot([1, 0, 0]), y: rot([0, 1, 0]), z: rot([0, 0, 1]) };
}

/** a cached Figure built by fn(S) on a fresh Sculpt (detail d) */
export function sculpt(key, fn, d = 0.6) { return cached('lmpm-' + key + '-' + d, () => { const S = new Sculpt({ detail: d }); fn(S); return S.finish({}); }); }

/** a cached kit bust (0.62 m tall at scale 1) */
export const bustFig = (key, o, d = 0.7) => cached('lmpm-bust-' + key + '-' + d, () => bust({ detail: d, ...o }));

/** a tapering limb through the points (radii per point, a single number = constant) */
export function limb(S, pts, rad, o = {}) { S.tube(o.key || 'main', pts, Array.isArray(rad) ? rad.map((r) => (Array.isArray(r) ? r : [r, r])) : pts.map(() => [rad, rad]), { seg: o.seg ?? 8, per: o.per ?? 3, ref: o.ref, cap: o.cap }); }

/** place a Figure with the materials of a set ({ main, dark, accent }) */
export function put3(P, fig, mats, x = 0, y = 0, z = 0, rotY = 0, s = 1, rx = 0, rz = 0) { fig.place(P, mats, x, y, z, rotY, s, rx, rz); return P; }

/** place a figure with non-uniform scale (sx, sy, sz) */
export function placeXYZ(P, fig, mats, x, y, z, rotY, sx, sy, sz) {
  for (const [key, g] of Object.entries(fig.geos)) P.geo(mats[key] || mats.main, g, x, y, z, 0, rotY, 0, sx, sy, sz);
}

/** a mirrored (x -> -x, winding flipped) copy of a Figure */
export function mirrorFig(fig) {
  const geos = {};
  for (const [k, g] of Object.entries(fig.geos)) {
    const m = g.clone(), p = m.attributes.position, n = m.attributes.normal;
    for (let i = 0; i < p.count; i++) { p.setX(i, -p.getX(i)); n.setX(i, -n.getX(i)); }
    const ix = m.index; for (let i = 0; i < ix.count; i += 3) { const t = ix.getX(i + 1); ix.setX(i + 1, ix.getX(i + 2)); ix.setX(i + 2, t); }
    p.needsUpdate = n.needsUpdate = ix.needsUpdate = true; m.computeBoundingBox(); m.computeBoundingSphere(); geos[k] = m;
  }
  const f = Object.create(Object.getPrototypeOf(fig)); Object.assign(f, fig, { geos }); return f;
}

/** a box of vertex-tinted stone: x0..x1 y0..y1 z0..z1 (bottom face skipped) */
export function slab(P, M, hex, x0, x1, y0, y1, z0, z1, skip = 'b') { P.tint(hex); P.box(M.vc, x0, x1, y0, y1, z0, z1, skip); return P; }
/** centred block hw x hd from y0 to y1 */
export function block(P, M, hex, hw, hd, y0, y1, cx = 0, cz = 0) { return slab(P, M, hex, cx - hw, cx + hw, y0, y1, cz - hd, cz + hd); }
/** a tapering block (frustum) via lathe-free quads: half sizes at the bottom and the top */
export function taper(P, M, hex, hw0, hd0, hw1, hd1, y0, y1, cx = 0, cz = 0) {
  P.tint(hex);
  const c = (sx, sz, y, hw, hd) => [cx + sx * hw, y, cz + sz * hd];
  const A = c(-1, -1, y0, hw0, hd0), B = c(1, -1, y0, hw0, hd0), C = c(1, 1, y0, hw0, hd0), D = c(-1, 1, y0, hw0, hd0);
  const a = c(-1, -1, y1, hw1, hd1), b = c(1, -1, y1, hw1, hd1), cc = c(1, 1, y1, hw1, hd1), d = c(-1, 1, y1, hw1, hd1);
  P.quad(M.vc, D, C, cc, d, [0, 0.1, 1], null); P.quad(M.vc, B, A, a, b, [0, 0.1, -1], null); P.quad(M.vc, A, D, d, a, [-1, 0.1, 0], null); P.quad(M.vc, C, B, b, cc, [1, 0.1, 0], null);
  P.quad(M.vc, d, cc, b, a, [0, 1, 0], null);
  return P;
}
/** a stepped foot: steps = [[hw, hd, h]..] from the bottom up, centred; returns the top y */
export function steps(P, M, hex, list, y0 = 0, cx = 0, cz = 0) {
  let y = y0; for (const [hw, hd, h, col] of list) { block(P, M, col || hex, hw, hd, y, y + h, cx, cz); y += h; } return y;
}

/** a ring of round cobbles / a low kerb disc: a flat ring from r0 to r1 at height h (tinted) */
export function ring(P, M, hex, r0, r1, y0, y1, seg = 24, cx = 0, cz = 0) {
  P.tint(hex);
  const o = Array.from({ length: seg }, (_, i) => { const t = i / seg * Math.PI * 2; return [cx + Math.cos(t) * r1, cz + Math.sin(t) * r1]; }), n = Array.from({ length: seg }, (_, i) => { const t = i / seg * Math.PI * 2; return [cx + Math.cos(t) * r0, cz + Math.sin(t) * r0]; });
  for (let i = 0; i < seg; i++) {
    const j = (i + 1) % seg, a = o[i], b = o[j], c = n[j], d = n[i];
    P.quad(M.vc, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [a[0] - cx + b[0] - cx, 0, a[1] - cz + b[1] - cz], null);       // outer wall
    P.quad(M.vc, [a[0], y1, a[1]], [b[0], y1, b[1]], [c[0], y1, c[1]], [d[0], y1, d[1]], [0, 1, 0], null);                                                  // top
    if (r0 > 0.02) P.quad(M.vc, [d[0], y1, d[1]], [c[0], y1, c[1]], [c[0], y0, c[1]], [d[0], y0, d[1]], [-(d[0] - cx + c[0] - cx), 0, -(d[1] - cz + c[1] - cz)], null);   // inner wall
  }
  return P;
}

// ---------------------------------------------------------------------------------------------------------------- natural boulders
const rockGeo = new Map();
/** a natural unhewn boulder: a deformed icosphere (smooth-ish normals), 3 variants; returns a BufferGeometry in a local frame, base on y = 0, about 1 m wide */
function rock(variant) {
  if (rockGeo.has(variant)) return rockGeo.get(variant);
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position;
  const hash = (a, b, c) => { const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + variant * 19.3) * 43758.5453; return s - Math.floor(s); };
  const vn = (x, y, z, f) => { const X = x * f, Y = y * f, Z = z * f, xi = Math.floor(X), yi = Math.floor(Y), zi = Math.floor(Z), xf = X - xi, yf = Y - yi, zf = Z - zi; const s = (t) => t * t * (3 - 2 * t); let r = 0; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) r += hash(xi + i, yi + j, zi + k) * (i ? s(xf) : 1 - s(xf)) * (j ? s(yf) : 1 - s(yf)) * (k ? s(zf) : 1 - s(zf)); return r * 2 - 1; };
  const sx = [1.0, 0.85, 1.12][variant % 3], sz = [0.82, 1.0, 0.9][variant % 3], sy = [0.78, 0.9, 0.7][variant % 3];
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = 1 + 0.2 * vn(x, y, z, 1.4) + 0.08 * vn(x, y, z, 3.1);
    x *= k * sx; y *= k * sy; z *= k * sz;
    if (y < -0.45 * sy) y = -0.45 * sy + (y + 0.45 * sy) * 0.3;                      // a flat-ish bottom
    if (y > 0.5 * sy) y = 0.5 * sy + (y - 0.5 * sy) * 0.22;                           // a flatter top (a bronze group is fixed on it)
    // split-granite facets: a few cutting planes (the stone is angular, not a pebble) [V pp_lj/01, 07, 11, 24]
    const nPl = 5, pr = Math.cbrt(1 + variant);
    for (let q = 0; q < nPl; q++) {
      const a = hash(q, 1, 9) * 6.2832, e = (hash(q, 2, 9) - 0.2) * 1.2, nx = Math.cos(a) * Math.cos(e), ny = Math.sin(e), nz = Math.sin(a) * Math.cos(e), d = 0.55 + 0.2 * hash(q, 3, 9) * pr / 1.3;
      const dp = x * nx + y * ny + z * nz - d; if (dp > 0) { x -= nx * dp; y -= ny * dp; z -= nz * dp; }
    }
    if (y > 0.43 * sy) y = 0.43 * sy;                                                    // a flat top for the bronze (the cutting planes above would tilt it)
    p.setXYZ(i, x * 0.5, y * 0.5 + 0.2, z * 0.5);
  }
  g.computeVertexNormals();
  // speckled pink-grey granite: a per-vertex multiplier of the tint (two-tone grain + a lighter weathered top)
  const col = new Float32Array(p.count * 3), n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), gr = 0.5 * vn(x * 7, y * 7, z * 7, 1.0) + 0.5 * vn(x * 19, y * 19, z * 19, 1.0), st = Math.max(0, vn(x * 3, y * 6, z * 3, 1.0)) * 0.12;
    const m = 0.8 + gr * 0.3 + n.getY(i) * 0.06 - st; col[i * 3] = m * 1.03; col[i * 3 + 1] = m * 0.96; col[i * 3 + 2] = m * 0.93;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingBox(); rockGeo.set(variant, g); return g;
}
/** a boulder fitted to a box: width w (x), height h, depth d, base on y; returns { top, hw } */
export function boulderFit(P, M, variant, x, y, z, w, h, d, rot = 0, hex = PAL.boulder) {
  const g = rock(variant), b = g.boundingBox;
  const sx = w / (b.max.x - b.min.x), sy = h / (b.max.y - b.min.y), sz = d / (b.max.z - b.min.z);
  P.tint(hex); P.geo(M.vc, g, x, y - b.min.y * sy, z, 0, rot, 0, sx, sy, sz);
  return { top: y + h, hw: w / 2 };
}
/** a boulder of `variant` 0..2 at (x, z), base at y, scaled (sx, sy, sz), rotated, tinted (flat colour with a slightly lighter top) */
export function boulder(P, M, variant, x, y, z, s = 1, rot = 0, hex = PAL.boulder, sy = s, sz = s) {
  const g = rock(variant); P.tint(hex); P.geo(M.vc, g, x, y, z, 0, rot, 0, s, sy, sz); return { top: y + g.boundingBox.max.y * sy * 0.92, hw: g.boundingBox.max.x * s };
}

/** the z of the surface of a boulderFit() boulder at (x, y) in the piece frame (a ray along -z against the real rock geometry); null when the ray misses */
export function rockZ(variant, bx, by, bz, w, h, d, rot, x, y) {
  const g = rock(variant), b = g.boundingBox, sx = w / (b.max.x - b.min.x), sy = h / (b.max.y - b.min.y), sz = d / (b.max.z - b.min.z);
  const m = new THREE.Matrix4().compose(new THREE.Vector3(bx, by - b.min.y * sy, bz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot), new THREE.Vector3(sx, sy, sz));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); mesh.matrixAutoUpdate = false; mesh.matrix.copy(m); mesh.matrixWorld.copy(m);
  const rc = new THREE.Raycaster(new THREE.Vector3(x, y, 20), new THREE.Vector3(0, 0, -1), 0, 40), hit = rc.intersectObject(mesh, false);
  mesh.material.dispose();
  return hit.length ? hit[0].point.z : null;
}
/** a bronze name plate fixed on a boulder: a dark bronze back plate set into the stone surface at (x, y) and the plate decal in front of it; returns false when the ray misses */
export function boulderPlate(P, M, K, key, variant, w, h, d, rot, x, y, pw = 0.36, ph = 0.17) {
  // the flattest spot of the front around (x, y): the plate is a flat decal, so look for the smallest slope of the surface
  let best = null;
  for (let ix = -3; ix <= 3; ix++) for (let iy = -2; iy <= 2; iy++) {
    const px = x + ix * 0.08, py = y + iy * 0.07, z0 = rockZ(variant, 0, 0, 0, w, h, d, rot, px, py); if (z0 === null) continue;
    let sl = 0, ok = true;
    for (const [dx, dy] of [[-pw / 2, 0], [pw / 2, 0], [0, -ph / 2], [0, ph / 2]]) { const z1 = rockZ(variant, 0, 0, 0, w, h, d, rot, px + dx, py + dy); if (z1 === null) { ok = false; break; } sl += Math.abs(z1 - z0); }
    if (ok && (!best || sl < best.sl)) best = { sl, px, py, z: z0 };
  }
  if (!best) return false;
  const { px, py } = best, z = Math.max(best.z, rockZ(variant, 0, 0, 0, w, h, d, rot, px - pw / 2, py) ?? 0, rockZ(variant, 0, 0, 0, w, h, d, rot, px + pw / 2, py) ?? 0);
  P.tint('#2b2620'); P.box(M.vc, px - pw / 2 - 0.015, px + pw / 2 + 0.015, py - ph / 2 - 0.015, py + ph / 2 + 0.015, best.z - 0.12, z + 0.03, 'b');
  return plateOn(P, M, K, key, pw, ph, px, py, z + 0.033);
}

/** a chain bollard (cast iron / granite round post 0.8 m with a cap) */
export function bollard(P, M, x, z, hex = PAL.iron, h = 0.78, r = 0.1) {
  P.tint(hex); P.col(M.vc, x, z, 0, h, r * 1.15, r * 0.85, 8, false); P.col(M.vc, x, z, h, h + 0.1, r * 1.2, r * 1.2, 8, true);
}
/** a sagging chain from a to b ([x, z] pairs, top y) in `n` links of tubes */
export function chain(P, M, a, b, y = 0.7, sag = 0.18, n = 5, hex = PAL.iron) {
  P.tint(hex);
  const yy = (t) => y - sag * 4 * t * (1 - t);
  for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n; P.cyl(M.vc, [a[0] + (b[0] - a[0]) * t0, yy(t0), a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, yy(t1), a[1] + (b[1] - a[1]) * t1], 0.016, 0.016, 4, false); }
}

export { loft, lathe, ngon, prism, disc, plateOn, plateQuad, freeAlongWall, reserveRect, Sculpt, V, cached };

// ---------------------------------------------------------------------------------------------------------------- the portrait bust (own build: the kit `bust()` has a long neck, a tiny head and a drape)
/**
 * bust2(o): a head-and-shoulders portrait bust cut straight below the chest, origin at the cut (y = 0), faces +z, ~0.62 m tall at scale 1 (place with scale 1.3-1.6 for a 0.8-1.0 m bust: photos chk1, lenb2, rent1,
 * med_08 show a big head, broad squarish shoulders cut through the upper arms and a short neck).
 * o.style 'jacket' (lapels, shirt collar, tie) | 'flight' (zipped jacket, turned wide collar, knit collar) | 'coat' (high collar, buttoned) | 'bare' (cut shoulders, no clothes) | 'uniform' (stand collar, epaulettes)
 * o.face = anatomy.face options (hair, beard, age, seed, mouth ...), o.k head scale (1.4), turn / pitch / roll (rad), w half shoulder width (0.28), depth chest half depth (0.15)
 */
export function bust2(o = {}) {
  const S = new Sculpt({ detail: o.detail ?? 0.7 }), w = (n) => S.seg(n), st = o.style || 'jacket', k = o.k ?? 1.4, sw = o.w ?? 0.28, dp = o.depth ?? 0.15;
  const cp = Math.cos(o.pitch ?? 0.03), sp = Math.sin(o.pitch ?? 0.03), cy = Math.cos(o.turn ?? 0.15), sy = Math.sin(o.turn ?? 0.15), cr = Math.cos(o.roll ?? 0), sr = Math.sin(o.roll ?? 0);
  const rot = (v) => { let [x, y, z] = v; [x, y] = [x * cr - y * sr, x * sr + y * cr]; [y, z] = [y * cp - z * sp, y * sp + z * cp]; [x, z] = [x * cy + z * sy, -x * sy + z * cy]; return [x, y, z]; };
  const chinY = 0.25, HC = [0, chinY + 0.118 * k - 0.012, 0.03];
  const F = { c: HC, x: rot([1, 0, 0]), y: rot([0, 1, 0]), z: rot([0, 0, 1]) };
  // torso: a thick block of the chest, the shoulders cut straight at the sides
  S.tube('main', [[0, 0, 0], [0, 0.08, 0], [0, 0.17, 0.002], [0, 0.22, 0.006], [0, 0.265, 0.012], [0, 0.3, 0.016]], [[sw, dp], [sw, dp], [sw * 0.97, dp * 0.93], [sw * 0.66, dp * 0.8], [0.105, 0.095], [0.062, 0.062]], { seg: w(22), per: 4, capA: false });
  for (const s of [1, -1]) {
    S.blob('main', [s * (sw - 0.025), 0.15, 0.0], [0.055, 0.065, 0.11], { dir: [s * 0.3, -0.2, 1], w: w(10), h: w(7) });                  // the shoulder cap (a straight-cut upper arm)
    S.blob('main', [s * 0.095, 0.245, -0.012], [0.1, 0.035, 0.085], { dir: [s * 0.5, 0.1, -0.3], w: w(9), h: w(6) });                    // the trapezius slope
  }
  S.tube('main', [[0, 0.2, 0.004], [0, 0.31, 0.016]], [[0.058, 0.06], [0.054, 0.056]], { seg: w(12), per: 3 });                       // neck
  if (st === 'jacket' || st === 'coat') {
    for (const s of [1, -1]) {
      S.tube('main', [[s * 0.05, 0.27, 0.095], [s * 0.085, 0.17, dp * 1.0], [s * 0.115, 0.07, dp * 1.02]], [[0.016, 0.012], [0.02, 0.015], [0.016, 0.012]], { seg: 8, per: 3 });   // lapel roll
      S.blob('main', [s * 0.095, 0.255, 0.085], [0.04, 0.02, 0.05], { dir: [s * 0.6, 0.3, 1], w: 8, h: 5 });                          // the notch
    }
    S.tube('main', loopPts3(0.265, 0.064, 0.062, 0.012), [[0.02, 0.014]], { closed: true, seg: 6, rings: w(22), ref: [0, 1, 0] });                       // the shirt collar
    S.tube('main', [[0, 0.25, 0.108], [0, 0.14, 0.146], [0, 0.03, 0.15]], [[0.012, 0.008], [0.016, 0.009], [0.02, 0.01]], { seg: 6, per: 3 });         // the tie / the shirt front
    S.blob('main', [0, 0.252, 0.11], [0.018, 0.016, 0.014], { w: 8, h: 6 });
  } else if (st === 'flight') {
    S.tube('main', loopPts3(0.262, 0.074, 0.07, 0.0), [[0.03, 0.022]], { closed: true, seg: 7, rings: w(22), ref: [0, 1, 0] });                         // the knitted high collar
    for (const s of [1, -1]) S.blob('main', [s * 0.115, 0.19, dp * 0.66], [0.095, 0.018, 0.11], { dir: [s * 0.8, -0.3, 1], ref: [0, 1, 0], w: 10, h: 6 });   // the big turned collar leaf lying on the chest
    S.tube('main', [[0, 0.245, 0.1], [0, 0.15, 0.148], [0, 0.03, dp * 1.06]], [[0.007, 0.007]], { seg: 6, per: 4 });                                    // the zip
  } else if (st === 'uniform') {
    S.tube('accent', loopPts3(0.262, 0.078, 0.072, 0.0), [[0.02, 0.014]], { closed: true, seg: 6, rings: w(22), ref: [0, 1, 0] });
    for (const s of [1, -1]) { S.blob('accent', [s * (sw - 0.03), 0.19, 0.0], [0.055, 0.012, 0.08], { dir: [s * 0.6, 0.1, -0.1], w: 8, h: 5 }); }
    for (let i = 0; i < 5; i++) S.blob('accent', [0, 0.21 - i * 0.04, dp * 1.0], [0.011, 0.011, 0.006], { w: 6, h: 4 });
  }
  face(S, F, { hair: 'short', ...(o.face || {}), scale: k, skinKey: 'main', hairKey: 'main' });
  if (o.moustache) for (const s of [1, -1]) S.blobBetween('main', V.add(F.c, V.add(V.mul(F.y, -0.061 * k), V.mul(F.z, 0.074 * k))), V.add(F.c, V.add(V.add(V.mul(F.y, -0.066 * k), V.mul(F.z, 0.066 * k)), V.mul(F.x, s * 0.034 * k))), 0.011 * k, 0.008 * k, { w: 8, h: 6, ref: F.y });
  return S.finish({ head: F, k });
}
function loopPts3(y, ra, rb, zc) { return Array.from({ length: 12 }, (_, i) => { const t = i / 12 * Math.PI * 2; return [Math.cos(t) * ra, y, zc + 0.0 + Math.sin(t) * rb]; }); }
export const bust2Fig = (key, o, d = 0.75) => cached('lmpm-b2-' + key + '-' + d, () => bust2({ detail: d, ...o }));

/** a Figure re-oriented by a basis: where the figure's x, y, z axes point afterwards (arrays); used for a lying patient (head +x, face up).  Normals follow; the winding is kept for proper rotations */
export function reorient(fig, bx, by, bz, tx = 0, ty = 0, tz = 0) {
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...bx), new THREE.Vector3(...by), new THREE.Vector3(...bz)); m.setPosition(tx, ty, tz);
  const geos = {};
  for (const [k, g] of Object.entries(fig.geos)) { const c = g.clone(); c.applyMatrix4(m); c.computeBoundingBox(); c.computeBoundingSphere(); geos[k] = c; }
  const f = Object.create(Object.getPrototypeOf(fig)); Object.assign(f, fig, { geos, info: { ...(fig.info || {}) } }); return f;
}
