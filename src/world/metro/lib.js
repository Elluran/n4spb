// metro/lib.js — building blocks of the metro module: a local-frame builder (Space), profile extrusions, the loft (a profile swept along a polyline), polygon helpers.
//
//  Space      one station / passage / vestibule in its own frame {x, z, yaw}: a THREE.Group placed at (x, 0, z) turned by yaw (rotY convention: local +z -> world (sin yaw, cos yaw), local +x ->
//             (cos yaw, -sin yaw)). Local y is ABSOLUTE (street level 0, platform -58 ...). Visual boxes go through ctx.kit (merged by the static batcher), colliders through ctx.physics with
//             the frame's yaw. Every collider takes an explicit y range: several levels share the same plan area (docs/UNDERGROUND.md).
//  extrudeZ   a 2D profile (x, y) extruded along +z.  extrudeX: a profile (z, y) extruded along +x (pylon rows, walls with arched openings).
//  loft       a cross-section [[lateral, up], ...] swept along a 3D polyline (mitred at corners): corridors, curved tunnels.
import * as THREE from 'three';
import { toWorld, toLocal } from '../data/metro.js';

const ODD = (n) => (n | 0) % 2 === 1;

/** Local-frame builder. tag: 'under' (default: undergroundOnly) | 'surface' (street-level interior: surfaceOnly) | null. */
export class Space {
  constructor(ctx, frame, o = {}) {
    this.ctx = ctx; this.frame = frame; this.name = o.name || 'space';
    this.c = Math.cos(frame.yaw), this.s = Math.sin(frame.yaw);
    const g = new THREE.Group(); g.name = this.name; g.position.set(frame.x, 0, frame.z); g.rotation.y = frame.yaw;
    const tag = o.tag === undefined ? 'under' : o.tag;
    if (tag === 'under') g.userData.undergroundOnly = true; else if (tag === 'surface') g.userData.surfaceOnly = true;
    g.userData.zone = o.zone || this.name;
    if (o.parent) o.parent.add(g); else ctx.addStatic(g);
    this.group = g; this.k = ctx.kit(g); this.items = [];
  }
  /** local -> world plan position */
  W(lx, lz) { return [this.frame.x + lx * this.c + lz * this.s, this.frame.z - lx * this.s + lz * this.c]; }
  L(wx, wz) { const dx = wx - this.frame.x, dz = wz - this.frame.z; return [dx * this.c - dz * this.s, dx * this.s + dz * this.c]; }
  /** visual box by size + centre */
  box(w, h, d, mat, pos, rot) { return this.k.box(w, h, d, mat, pos, rot); }
  /** visual box by extents */
  bx(x0, x1, y0, y1, z0, z1, mat) { return this.k.box(x1 - x0, y1 - y0, z1 - z0, mat, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]); }
  /** collider (solid box) by extents; returns the physics item */
  col(x0, x1, y0, y1, z0, z1) {
    const [cx, cz] = this.W((x0 + x1) / 2, (z0 + z1) / 2);
    const it = this.ctx.physics.addBox(cx, cz, x1 - x0, z1 - z0, this.frame.yaw, y0, y1); this.items.push(it); return it;
  }
  /** visual box + collider */
  wall(x0, x1, y0, y1, z0, z1, mat) { if (mat) this.bx(x0, x1, y0, y1, z0, z1, mat); return this.col(x0, x1, y0, y1, z0, z1); }
  /** walkable floor: top at `top`, a solid column down to `top - thick` (people can walk under it) */
  walk(x0, x1, z0, z1, top, thick = 1.1) {
    const [cx, cz] = this.W((x0 + x1) / 2, (z0 + z1) / 2);
    const it = this.ctx.physics.addWalkBox(cx, cz, x1 - x0, z1 - z0, this.frame.yaw, top, top - thick); this.items.push(it); return it;
  }
  /** a free mesh (geometry already in local coordinates, or positioned by pos) */
  mesh(geo, mat, pos, rot) {
    const m = new THREE.Mesh(geo, mat); if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    m.castShadow = false; m.receiveShadow = true; this.group.add(m); return m;
  }
  /** a sub-group (local pos / rotY) that is part of this space */
  sub(pos, rotY = 0) { const g = new THREE.Group(); if (pos) g.position.set(pos[0], pos[1], pos[2]); g.rotation.y = rotY; this.group.add(g); return g; }
}

// ------------------------------------------------------------------ profiles
/** polygon of a vault shell in the (x, y) plane: inner radius R centred at (cx, springY), walls from yBottom up to the springline, thickness th. Counter-clockwise outer then the inner reversed. */
export function archRing(R, springY, th, yBottom, cx = 0, n = 28, b = R) {
  const arc = (r, bb) => { const a = []; for (let i = 0; i <= n; i++) { const t = Math.PI - i * Math.PI / n; a.push([cx + r * Math.cos(t), springY + bb * Math.sin(t)]); } return a; };
  const inner = [[cx - R, yBottom], ...arc(R, b), [cx + R, yBottom]], R2 = R + th, outer = [[cx - R2, yBottom], ...arc(R2, b + th), [cx + R2, yBottom]];
  return [...outer, ...inner.reverse()];
}
/** open arch (arc points only, left to right) for lofts */
export function archPts(R, springY, cx = 0, n = 24, a0 = Math.PI, a1 = 0) {
  const a = []; for (let i = 0; i <= n; i++) { const t = a0 + (a1 - a0) * i / n; a.push([cx + R * Math.cos(t), springY + R * Math.sin(t)]); } return a;
}
/** arch-shaped opening (a hole in a wall): [[x, y], ...] with vertical sides from yBottom to springY and a semicircular top, centre cx */
export function archHole(cx, halfW, yBottom, springY, n = 10) {
  const p = [[cx - halfW, yBottom]]; for (let i = 0; i <= n; i++) { const t = Math.PI - i * Math.PI / n; p.push([cx + halfW * Math.cos(t), springY + halfW * Math.sin(t)]); } p.push([cx + halfW, yBottom]); return p;
}

// ------------------------------------------------------------------ exact vertex sharing
/** ?metroindex=0 turns indexExact off (A/B) */
const INDEX_EXACT = typeof location === 'undefined' || new URLSearchParams(location.search).get('metroindex') !== '0';
/**
 * A non-indexed geometry (ExtrudeGeometry, a faceted loft) repeats every corner of every triangle: a side quad is 6 vertices, a cap fan 3 per triangle. This returns an
 * indexed copy in which vertices whose attributes are BIT-identical (position, normal, uv and any other float attribute) are shared, in the same triangle order with the same
 * groups: what the GPU rasterises is identical (no tolerance: two vertices merge only when every float is the same bit pattern, i.e. they already lie on one flat face).
 * Why (plan 2026-10-15 item 5): static batching clones, recolours, transforms, merges, quantises and uploads every source vertex; the metro's extrusions and faceted lofts were
 * 1.03 M of its 1.96 M source vertices, and sharing removes 0.42 M of them. A later computeVertexNormals() still gives the faceted normals: shared vertices lie on one plane.
 */
export function indexExact(g) {
  if (!INDEX_EXACT || !g || g.index || !g.attributes.position || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return g;
  const n = g.attributes.position.count, cols = [];
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name];
    if (a.isInterleavedBufferAttribute || !(a.array instanceof Float32Array) || a.count !== n) return g;
    cols.push({ name, a, s: a.itemSize, u: new Uint32Array(a.array.buffer, a.array.byteOffset, a.array.length) });
  }
  // every vertex as one row of W 32-bit words (the float bit patterns of all its attributes)
  let W = 0; for (const c of cols) W += c.s;
  const row = new Uint32Array(n * W);
  for (let off = 0, ci = 0; ci < cols.length; off += cols[ci].s, ci++) { const c = cols[ci], u = c.u, cs = c.s; for (let i = 0; i < n; i++) for (let j = 0; j < cs; j++) row[i * W + off + j] = u[i * cs + j]; }
  let size = 16; while (size < n * 2) size <<= 1;
  const mask = size - 1, table = new Int32Array(size).fill(-1), first = new Uint32Array(n), remap = new Uint32Array(n); let k = 0;
  for (let i = 0; i < n; i++) {
    const o = i * W; let h = 2166136261;
    for (let j = 0; j < W; j++) h = Math.imul(h ^ row[o + j], 16777619);
    let slot = (h >>> 0) & mask;
    for (;;) {
      const e = table[slot];
      if (e < 0) { table[slot] = k; first[k] = i; remap[i] = k++; break; }
      const p = first[e] * W; let j = 0; while (j < W && row[o + j] === row[p + j]) j++;
      if (j === W) { remap[i] = e; break; }
      slot = (slot + 1) & mask;
    }
  }
  if (k > n * 0.9) return g;                                     // (nothing worth an index buffer)
  const out = new THREE.BufferGeometry();
  for (const c of cols) {
    const src = c.a.array, arr = new Float32Array(k * c.s);
    for (let q = 0; q < k; q++) for (let j = 0, o = first[q] * c.s; j < c.s; j++) arr[q * c.s + j] = src[o + j];
    out.setAttribute(c.name, new THREE.BufferAttribute(arr, c.s));
  }
  const idx = k > 65535 ? new Uint32Array(n) : new Uint16Array(n); for (let i = 0; i < n; i++) idx[i] = remap[i];
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  for (const gr of g.groups) out.addGroup(gr.start, gr.count, gr.materialIndex);            // (non-indexed group starts are vertex offsets = the same index offsets here)
  out.setDrawRange(g.drawRange.start, g.drawRange.count);
  if (g.boundingBox) out.boundingBox = g.boundingBox.clone();
  if (g.boundingSphere) out.boundingSphere = g.boundingSphere.clone();
  out.name = g.name; out.userData = g.userData;
  g.dispose();
  return out;
}

/** extrude a profile (x, y) [with holes] along +z from z0 to z1 */
export function extrudeZ(pts, z0, z1, holes) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  if (holes) for (const h of holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, z0); return indexExact(g);
}
/** extrude a profile (a = local z, b = y) [with holes] along +x from x0 to x1 (front face toward +x) */
export function extrudeX(pts, x0, x1, holes) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  if (holes) for (const h of holes) shape.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))));
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0, bevelEnabled: false, curveSegments: 1 });
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));            // shape x -> +z, extrusion -> -x
  g.translate(x1, 0, 0); return indexExact(g);
}

/** horizontal quad facing up (or down) at height y over [x0,x1] x [z0,z1], uv in metres * uvScale */
export function floorGeo(x0, x1, z0, z1, y, uvScale = 1, up = true, uvScaleZ = uvScale) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(4).fill(up ? [0, 1, 0] : [0, -1, 0]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0 * uvScale, z0 * uvScaleZ, x1 * uvScale, z0 * uvScaleZ, x1 * uvScale, z1 * uvScaleZ, x0 * uvScale, z1 * uvScaleZ], 2));
  g.setIndex(up ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]);
  return g;
}
/** vertical quad in the plane z = zc (facing +z when front = true) over [x0,x1] x [y0,y1], uv in metres */
export function wallGeoZ(x0, x1, y0, y1, zc, front = true, uvScale = 1) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([x0, y0, zc, x1, y0, zc, x1, y1, zc, x0, y1, zc], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(4).fill(front ? [0, 0, 1] : [0, 0, -1]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([x0 * uvScale, y0 * uvScale, x1 * uvScale, y0 * uvScale, x1 * uvScale, y1 * uvScale, x0 * uvScale, y1 * uvScale], 2));
  g.setIndex(front ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
  return g;
}

// ------------------------------------------------------------------ loft
/**
 * Sweep a cross-section along a polyline.
 *   path     [[x, y, z], ...]   (plan x, z; y = floor / reference height)
 *   profile  [[lat, up], ...]   lat: horizontal offset to the RIGHT of travel (toward the right-hand side when walking along the path), up: height above path y
 *   o.us, o.vs  uv scale (tiles per metre along the path / along the profile)   o.flat  faceted normals   o.u0 start offset of u   o.closedProfile  join last to first
 * Corners are mitred (scale <= 2.4) so a corridor with a bend stays watertight.
 */
export function loft(path, profile, o = {}) {
  const n = path.length, m = profile.length;
  const tx = [], tz = [];
  for (let i = 0; i < n - 1; i++) { const dx = path[i + 1][0] - path[i][0], dz = path[i + 1][2] - path[i][2], l = Math.hypot(dx, dz) || 1; tx.push(dx / l); tz.push(dz / l); }
  const pos = [], uv = [], idx = [];
  const prof = [0]; for (let j = 1; j < m; j++) prof.push(prof[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]));
  let s = o.u0 || 0;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 2, i);
    // right-hand normals of the incoming / outgoing segments (travel (tx, tz) -> right = (-tz, tx) in a +x east / +z south frame looking along the travel)
    const n0 = [-tz[a], tx[a]], n1 = [-tz[b], tx[b]];
    let bx = n0[0] + n1[0], bz = n0[1] + n1[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    const sc = Math.min(2.4, 1 / Math.max(0.25, bx * n0[0] + bz * n0[1]));
    if (i > 0) s += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]);
    for (let j = 0; j < m; j++) {
      pos.push(path[i][0] + bx * profile[j][0] * sc, path[i][1] + profile[j][1], path[i][2] + bz * profile[j][0] * sc);
      uv.push(s * (o.us ?? 1), prof[j] * (o.vs ?? 1));
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < m - 1; j++) {
    const a = i * m + j, b = (i + 1) * m + j, c = (i + 1) * m + j + 1, d = i * m + j + 1;
    idx.push(a, d, b, b, d, c);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  if (o.flat) g = g.toNonIndexed();
  g.computeVertexNormals();
  if (o.flat) g = indexExact(g);                                 // (faceted normals computed above; coplanar corners share their vertex again)
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

// ------------------------------------------------------------------ polygons / paths
/** cubic Bezier from p0 (heading t0, handle a) to p1 (heading t1, handle b), sampled every ~step m: [[x, z], ...] */
export function bezierPath(p0, t0, p1, t1, a, b, step = 2.5) {
  const c1 = [p0[0] + t0[0] * a, p0[1] + t0[1] * a], c2 = [p1[0] - t1[0] * b, p1[1] - t1[1] * b], N = 400, raw = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = 1 - t; raw.push([u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]]); }
  const out = [raw[0]]; let acc = 0;
  for (let i = 1; i < raw.length; i++) { acc += Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]); if (acc >= step) { out.push(raw[i]); acc = 0; } }
  out.push(raw[raw.length - 1]); return out;
}
/** smallest turning radius of a polyline of [x, z] points */
export function minRadius(p) { let m = 1e9; for (let i = 1; i < p.length - 1; i++) { const A = p[i - 1], B = p[i], C = p[i + 1], ab = Math.hypot(B[0] - A[0], B[1] - A[1]), bc = Math.hypot(C[0] - B[0], C[1] - B[1]), ca = Math.hypot(A[0] - C[0], A[1] - C[1]), cr = Math.abs((B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])); m = Math.min(m, ab * bc * ca / (2 * cr + 1e-9)); } return m; }
/** point in polygon (flat [x,z,x,z...]) */
export function inPoly(o, x, z) { let ins = false; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) { const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) ins = !ins; } return ins; }
/** the inside part of the line p + t * d (|d| = 1) of a polygon: [t0, t1] around t = 0 (the chord through p), or null when p is outside */
export function chord(o, px, pz, dx, dz) {
  if (!inPoly(o, px, pz)) return null;
  let lo = -1e9, hi = 1e9;
  for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
    const ax = o[j], az = o[j + 1], bx = o[i], bz = o[i + 1], ex = bx - ax, ez = bz - az;
    const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((ax - px) * ez - (az - pz) * ex) / den, u = ((ax - px) * dz - (az - pz) * dx) / den;
    if (u < 0 || u > 1) continue;
    if (t < 0) lo = Math.max(lo, t); else hi = Math.min(hi, t);
  }
  return [lo, hi];
}
/** Catmull-Rom smoothing of a 2D polyline with the end tangents given (unit vectors), sampled every `step` metres: [[x, z], ...] */
export function smoothPath(pts, t0, t1, step = 3) {
  const P = pts.map((p) => new THREE.Vector3(p[0], 0, p[1]));
  // add phantom end points so the curve leaves / arrives along the given tangents
  const d0 = P[0].distanceTo(P[1]) * 0.5, d1 = P[P.length - 1].distanceTo(P[P.length - 2]) * 0.5;
  const pre = new THREE.Vector3(P[0].x - t0[0] * d0 * 2, 0, P[0].z - t0[1] * d0 * 2), post = new THREE.Vector3(P[P.length - 1].x + t1[0] * d1 * 2, 0, P[P.length - 1].z + t1[1] * d1 * 2);
  const curve = new THREE.CatmullRomCurve3([pre, ...P, post], false, 'centripetal');
  // the curve runs from pre to post: find the parameter range between the real end points
  const total = curve.getLength(), samples = Math.max(8, Math.ceil(total / 1.5)), pts2 = curve.getSpacedPoints(samples);
  const idx0 = nearestIdx(pts2, P[0]), idx1 = nearestIdx(pts2, P[P.length - 1]);
  const seg = pts2.slice(idx0, idx1 + 1), out = [[P[0].x, P[0].z]]; let acc = 0;
  for (let i = 1; i < seg.length; i++) { acc += seg[i].distanceTo(seg[i - 1]); if (acc >= step) { out.push([seg[i].x, seg[i].z]); acc = 0; } }
  const end = [P[P.length - 1].x, P[P.length - 1].z];
  while (out.length > 2 && Math.hypot(out[out.length - 1][0] - end[0], out[out.length - 1][1] - end[1]) < step * 0.5) out.pop();   // a sample that lies at / past the end would fold the last segment back
  out.push(end);
  return out;
}
function nearestIdx(arr, p) { let b = 0, bd = 1e18; for (let i = 0; i < arr.length; i++) { const d = arr[i].distanceToSquared(p); if (d < bd) { bd = d; b = i; } } return b; }
/** cumulative arc lengths of a polyline of [x, ..., z]-like points given by accessor */
export function arcLengths(pts, ix = 0, iz = 1) { const s = [0]; for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][ix] - pts[i - 1][ix], pts[i][iz] - pts[i - 1][iz])); return s; }

export { toWorld, toLocal };
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth01 = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
