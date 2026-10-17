// landmarksA/common.js - shared frame, palette, geometry collector and canvas textures of the Moscow Railway Station + Vosstaniya Square module.
//
// THE STATION FRAME.  The whole complex is a rotated rectangle: its facade runs along bearing ~348 deg (OSM r2404499 / parts r16492034..39 measured at
// O = (602.7, 242.9), theta = 10.05 deg).  Local coordinates used by every file of this module:
//     u  = metres along the facade, + toward the EAST end (world direction e = (cos th, -sin th))
//     y  = up
//     d  = depth INTO the building, + away from the square (world direction b = (sin th, cos th), toward the tracks, SSE).  The facade is at d = 0,
//          things that stand in front of it (steps, columns, lamps, the forecourt) have d < 0.  The obelisk is at (u 3.3, d -78.6).
// A group placed at O with rotation.y = theta turns (u, y, d) into world (x, y, z): that is the three.js convention (local +X = e, local +Z = b).
// Colliders go through wbox() which converts a (u0..u1, d0..d1) rectangle.
//
// Parts: a tiny geometry collector.  Everything the module draws (boxes, quads, extruded shapes ...) is emitted in the CURRENT local transform into one
// buffer per material, so a 130 m facade is ~15 meshes instead of thousands.  Faces are flat shaded (hard normals), uv are in metres unless a quad says otherwise.
import * as THREE from 'three';
import * as L from '../layout.js';

export const TH = 10.05 * Math.PI / 180;
export const O = { x: 602.7, z: 242.9 };
const E = [Math.cos(TH), -Math.sin(TH)], B = [Math.sin(TH), Math.cos(TH)];
/** station frame (u, d) -> world [x, z] */
export const W = (u, d) => [O.x + E[0] * u + B[0] * d, O.z + E[1] * u + B[1] * d];
/** world (x, z) -> station frame [u, d] */
export const UV = (x, z) => { const dx = x - O.x, dz = z - O.z; return [dx * E[0] + dz * E[1], dx * B[0] + dz * B[1]]; };
/** rotY of a model whose local +Z points INTO the building (away from the square) */
export const ROT_IN = TH;
/** rotY of a model that faces the square (out of the facade) */
export const ROT_OUT = TH + Math.PI;
export const DEG = Math.PI / 180;

// ------------------------------------------------------------------------------------------------ palette (docs/research/station.md)
export const C = {
  stucco: '#e8cd96', stuccoShade: '#d3b070', wing: '#e4c58c', panel: '#d9b574', trim: '#f3efe4', trimShade: '#d9d4c6',
  plinth: '#8a8b88', plinthDark: '#6f706d', roof: '#3c3a3b', roofLight: '#55535a', towerRoof: '#4a4a52', hallRoof: '#5d6b4c', copper: '#6e8a73',
  door: '#6b4426', doorDark: '#3e2a1a', frame: '#3a2a22', pane: '#2a3544', paneLit: '#46586c', paneWarm: '#d9b97a', iron: '#1e2023', ironLight: '#383b40',
  brick: '#b0503a', brickDark: '#8c3c2c', chimney: '#c9a468',
  paving: '#b8aa9f', pavingDark: '#a09186', granite: '#8f8d89', graniteLight: '#b5ada2', graniteDark: '#5e6266', pink: '#a88f88',
  obelisk: '#7f6e66', obeliskDark: '#6a5648', bronze: '#5a4a36', bronzeLight: '#8a6a3c', gold: '#e3b53c', hedge: '#4e7a3a', flowerRed: '#c92f35',
  // interior
  floor: '#7c7873', floorLight: '#8f8a83', travertine: '#bfae90', travertineLight: '#d0c2a6', salmon: '#b8786a', ceiling: '#bcb9b2', ceilingDark: '#9a978f',
  wood: '#b27a3e', woodDark: '#7b5226', metal: '#2d3036', plaster: '#ece4cf', marble: '#d9c4b0', yellowTape: '#e8c030',
};

// ------------------------------------------------------------------------------------------------ geometry collector
export class Parts {
  constructor() { this.b = new Map(); this.m = new THREE.Matrix4(); this.stack = []; this.tris = 0; this._id = true; }
  /** push a local transform (x, y, z, rotY) on top of the current one */
  push(x = 0, y = 0, z = 0, rotY = 0) {
    this.stack.push(this.m.clone());
    const t = new THREE.Matrix4().makeRotationY(rotY); t.setPosition(x, y, z);
    this.m.multiply(t); this._id = false; return this;
  }
  pop() { this.m = this.stack.pop(); this._id = this.stack.length === 0; return this; }
  bucket(mat) {
    let k = this.b.get(mat);
    if (!k) { k = { mat, pos: [], nrm: [], uv: [], idx: [], n: 0 }; this.b.set(mat, k); }
    return k;
  }
  _vert(k, x, y, z, nx, ny, nz, u, v) {
    const e = this.m.elements;
    k.pos.push(e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]);
    // rotation + uniform scale only: transform the normal by the 3x3 and renormalise
    let tx = e[0] * nx + e[4] * ny + e[8] * nz, ty = e[1] * nx + e[5] * ny + e[9] * nz, tz = e[2] * nx + e[6] * ny + e[10] * nz;
    const l = Math.hypot(tx, ty, tz) || 1; k.nrm.push(tx / l, ty / l, tz / l);
    k.uv.push(u, v); return k.n++;
  }
  /** quad p0 p1 p2 p3 (arrays [x,y,z]); `n` = wanted normal (the winding is flipped to match it). uv: [[u,v] x4] or scale s (planar metres) */
  quad(mat, p0, p1, p2, p3, n, uv) {
    const k = this.bucket(mat);
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p3[0] - p0[0], by = p3[1] - p0[1], bz = p3[2] - p0[2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    const cl = Math.hypot(cx, cy, cz) || 1; cx /= cl; cy /= cl; cz /= cl;
    let flip = false;
    if (n) flip = cx * n[0] + cy * n[1] + cz * n[2] < 0; else n = [cx, cy, cz];
    const nn = flip ? [-cx, -cy, -cz] : [cx, cy, cz];
    const U = uv || [[0, 0], [1, 0], [1, 1], [0, 1]];
    const a = this._vert(k, p0[0], p0[1], p0[2], nn[0], nn[1], nn[2], U[0][0], U[0][1]);
    const b = this._vert(k, p1[0], p1[1], p1[2], nn[0], nn[1], nn[2], U[1][0], U[1][1]);
    const c = this._vert(k, p2[0], p2[1], p2[2], nn[0], nn[1], nn[2], U[2][0], U[2][1]);
    const d = this._vert(k, p3[0], p3[1], p3[2], nn[0], nn[1], nn[2], U[3][0], U[3][1]);
    if (flip) { k.idx.push(a, c, b, a, d, c); } else { k.idx.push(a, b, c, a, c, d); }
    this.tris += 2;
  }
  /** single triangle p0 p1 p2 ([x,y,z]), wanted normal n (winding flipped to match), uv [[u,v]x3] */
  tri(mat, p0, p1, p2, n, uv) {
    const k = this.bucket(mat);
    const ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2], bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx; const cl = Math.hypot(cx, cy, cz) || 1; cx /= cl; cy /= cl; cz /= cl;
    const flip = n ? cx * n[0] + cy * n[1] + cz * n[2] < 0 : false, s = flip ? -1 : 1, U = uv || [[0, 0], [1, 0], [0, 1]];
    const a = this._vert(k, p0[0], p0[1], p0[2], cx * s, cy * s, cz * s, U[0][0], U[0][1]), b = this._vert(k, p1[0], p1[1], p1[2], cx * s, cy * s, cz * s, U[1][0], U[1][1]), d = this._vert(k, p2[0], p2[1], p2[2], cx * s, cy * s, cz * s, U[2][0], U[2][1]);
    if (flip) k.idx.push(a, d, b); else k.idx.push(a, b, d);
    this.tris += 1;
  }
  /** soft glow: three crossed quads of size s at (x,y,z) with material mat (a Cc.halo material) */
  glow(mat, x, y, z, s) {
    const h = s / 2;
    this.quad(mat, [x - h, y - h, z], [x + h, y - h, z], [x + h, y + h, z], [x - h, y + h, z], [0, 0, 1]);
    this.quad(mat, [x, y - h, z - h], [x, y - h, z + h], [x, y + h, z + h], [x, y + h, z - h], [1, 0, 0]);
    this.quad(mat, [x - h, y, z - h], [x + h, y, z - h], [x + h, y, z + h], [x - h, y, z + h], [0, 1, 0]);
  }
  /** axis aligned box in the current frame: x0..x1 (u), y0..y1, z0..z1 (d). skip: string of faces to omit: l r (x-/x+) b t (y-/y+) n s (z-/z+; n = the OUTWARD facade face z-) */
  box(mat, x0, x1, y0, y1, z0, z1, skip = '', uvs = 1) {
    const s = uvs;
    if (!skip.includes('n')) this.quad(mat, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[x1 / s, y0 / s], [x0 / s, y0 / s], [x0 / s, y1 / s], [x1 / s, y1 / s]]);
    if (!skip.includes('s')) this.quad(mat, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[x0 / s, y0 / s], [x1 / s, y0 / s], [x1 / s, y1 / s], [x0 / s, y1 / s]]);
    if (!skip.includes('l')) this.quad(mat, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[z0 / s, y0 / s], [z1 / s, y0 / s], [z1 / s, y1 / s], [z0 / s, y1 / s]]);
    if (!skip.includes('r')) this.quad(mat, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[z1 / s, y0 / s], [z0 / s, y0 / s], [z0 / s, y1 / s], [z1 / s, y1 / s]]);
    if (!skip.includes('t')) this.quad(mat, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], [[x0 / s, z0 / s], [x0 / s, z1 / s], [x1 / s, z1 / s], [x1 / s, z0 / s]]);
    if (!skip.includes('b')) this.quad(mat, [x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [0, -1, 0], [[x0 / s, z1 / s], [x0 / s, z0 / s], [x1 / s, z0 / s], [x1 / s, z1 / s]]);
    return this;
  }
  /** box by centre and size (x, y, z centre; w along x, h up, d along z) */
  boxC(mat, cx, cy, cz, w, h, d, skip = '') { return this.box(mat, cx - w / 2, cx + w / 2, cy - h / 2, cy + h / 2, cz - d / 2, cz + d / 2, skip); }
  /** vertical (Y axis) cylinder / frustum, rb = bottom radius, rt = top radius */
  cyl(mat, cx, cz, y0, y1, rb, rt = rb, seg = 10, open = false) {
    const k = this.bucket(mat);
    const ring = (y, r, ny) => { const o = []; for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); o.push([cx + ca * r, y, cz + sa * r, ca, sa]); } return o; };
    const bot = ring(y0, rb), top = ring(y1, rt), slope = (rb - rt) / Math.max(1e-6, y1 - y0);
    const base = k.n;
    for (let i = 0; i <= seg; i++) {
      const p = bot[i], q = top[i], nl = Math.hypot(1, slope);
      this._vert(k, p[0], p[1], p[2], p[3] / nl, slope / nl, p[4] / nl, i / seg * rb * 6.28, y0);
      this._vert(k, q[0], q[1], q[2], q[3] / nl, slope / nl, q[4] / nl, i / seg * rb * 6.28, y1);
    }
    for (let i = 0; i < seg; i++) { const a = base + i * 2; k.idx.push(a, a + 1, a + 3, a, a + 3, a + 2); this.tris += 2; }
    if (!open) {
      if (rt > 0.001) { const c = this._vert(k, cx, y1, cz, 0, 1, 0, 0, 0); for (let i = 0; i < seg; i++) { const a = this._vert(k, top[i][0], y1, top[i][2], 0, 1, 0, 0, 0), b = this._vert(k, top[i + 1][0], y1, top[i + 1][2], 0, 1, 0, 0, 0); k.idx.push(c, b, a); this.tris++; } }
      if (rb > 0.001) { const c = this._vert(k, cx, y0, cz, 0, -1, 0, 0, 0); for (let i = 0; i < seg; i++) { const a = this._vert(k, bot[i][0], y0, bot[i][2], 0, -1, 0, 0, 0), b = this._vert(k, bot[i + 1][0], y0, bot[i + 1][2], 0, -1, 0, 0, 0); k.idx.push(c, a, b); this.tris++; } }
    }
    return this;
  }
  /** any THREE.BufferGeometry (indexed or not) placed at (x,y,z) with rotation (rx,ry,rz) and scale; its uv / normals are kept */
  geo(mat, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const k = this.bucket(mat);
    const t = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    const pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, idx = g.index;
    const base = k.n, n = pa.count;
    const m = this.m.clone().multiply(t), nm = new THREE.Matrix3().getNormalMatrix(m);
    const v = new THREE.Vector3(), nv = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pa, i).applyMatrix4(m); k.pos.push(v.x, v.y, v.z);
      if (na) { nv.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); k.nrm.push(nv.x, nv.y, nv.z); } else k.nrm.push(0, 1, 0);
      k.uv.push(ua ? ua.getX(i) : 0, ua ? ua.getY(i) : 0);
    }
    k.n += n;
    if (idx) for (let i = 0; i < idx.count; i++) k.idx.push(base + idx.getX(i)); else for (let i = 0; i < n; i++) k.idx.push(base + i);
    this.tris += (idx ? idx.count : n) / 3;
    return this;
  }
  /** extrude a THREE.Shape (x, y in the shape plane, z = depth 0..depth; face at z = 0 is the outward one) */
  extrude(mat, shape, depth, x = 0, y = 0, z = 0, ry = 0, seg = 8) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: seg });
    this.geo(mat, g, x, y, z, 0, ry, 0); g.dispose(); return this;
  }
  /** vertical prism over a polygon [[x,z]...] from y0 to y1: walls (outward normals) + optional top cap + optional bottom cap */
  prism(mat, pts, y0, y1, caps = 't', uvs = 1, flip = false) {
    let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
    const r = a > 0 ? pts.slice().reverse() : pts;        // (x, z) ring with area < 0; the outward normal of an edge is then (-dz, dx)
    let acc = 0;
    for (let i = 0; i < r.length; i++) {
      const p = r[i], q = r[(i + 1) % r.length], dx = q[0] - p[0], dz = q[1] - p[1], l = Math.hypot(dx, dz) || 1;
      this.quad(mat, [p[0], y0, p[1]], [q[0], y0, q[1]], [q[0], y1, q[1]], [p[0], y1, p[1]], [flip ? dz / l : -dz / l, 0, flip ? -dx / l : dx / l], [[acc / uvs, y0 / uvs], [(acc + l) / uvs, y0 / uvs], [(acc + l) / uvs, y1 / uvs], [acc / uvs, y1 / uvs]]);
      acc += l;
    }
    if (caps.includes('t')) this.cap(mat, r, y1, true, uvs);
    if (caps.includes('b')) this.cap(mat, r, y0, false, uvs);
    return this;
  }
  /** horizontal polygon cap at height y (triangulated; up = faces +Y) */
  cap(mat, pts, y, up = true, uvs = 1, holes = []) {
    const c2 = pts.map((p) => new THREE.Vector2(p[0], p[1])), h2 = holes.map((h) => h.map((p) => new THREE.Vector2(p[0], p[1])));
    const tris = THREE.ShapeUtils.triangulateShape(c2, h2), all = pts.concat(...holes), k = this.bucket(mat), base = k.n;
    for (const p of all) this._vert(k, p[0], y, p[1], 0, up ? 1 : -1, 0, p[0] / uvs, p[1] / uvs);
    for (const [a, b, c] of tris) {
      const A = all[a], Bp = all[b], Cp = all[c];
      const cy = (Bp[1] - A[1]) * (Cp[0] - A[0]) - (Bp[0] - A[0]) * (Cp[1] - A[1]);       // y component of (B-A)x(C-A)
      if ((cy > 0) === up) k.idx.push(base + a, base + b, base + c); else k.idx.push(base + a, base + c, base + b);
      this.tris++;
    }
    return this;
  }
  /** the finished geometry per material, [{ mat, geo }]: a model emitted about its own origin, for the instanced knockables (core/knock.js) */
  parts() { const tmp = new THREE.Group(); return this.build(tmp, {}).map((m) => ({ mat: m.material, geo: m.geometry })); }
  /** build one mesh per bucket (split below 65k vertices for 16 bit indices) and add them to `parent` */
  build(parent, o = {}) {
    const meshes = [];
    for (const k of this.b.values()) {
      if (!k.n) continue;
      for (let i = 0; i < k.pos.length; i++) if (!Number.isFinite(k.pos[i])) { console.warn('[landmarksA] NaN vertex in', o.name || '?', 'bucket', k.mat.name || k.mat.uuid, 'vertex', (i / 3) | 0); for (let j = i - (i % 3); j < k.pos.length; j++) if (!Number.isFinite(k.pos[j])) k.pos[j] = 0; break; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(k.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(k.nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(k.uv, 2));
      g.setIndex(k.n > 65535 ? new THREE.Uint32BufferAttribute(k.idx, 1) : new THREE.Uint16BufferAttribute(k.idx, 1));
      g.computeBoundingSphere(); g.computeBoundingBox();
      const m = new THREE.Mesh(g, k.mat);
      m.castShadow = o.cast !== false && !k.mat.transparent; m.receiveShadow = o.receive !== false;
      if (o.name) m.name = o.name;
      if (k.mat.userData.noBatch) m.userData.noBatch = true;
      if (k.mat.userData.noOutline) m.layers.set(1);
      parent.add(m); meshes.push(m);
    }
    return meshes;
  }
}

// ------------------------------------------------------------------------------------------------ 2D shapes (plane of the shape = local x/y; extrude() goes toward +z = into the building)
/** rectangle with a semicircular top: width w, straight height h (bottom at 0), crown at h + w/2 */
export function archPath(path, w, h, ox = 0, oy = 0, rev = false) {
  const r = w / 2;
  if (!rev) { path.moveTo(ox - r, oy); path.lineTo(ox + r, oy); path.lineTo(ox + r, oy + h); path.absarc(ox, oy + h, r, 0, Math.PI, false); path.lineTo(ox - r, oy); }
  else { path.moveTo(ox - r, oy); path.lineTo(ox - r, oy + h); path.absarc(ox, oy + h, r, Math.PI, 0, true); path.lineTo(ox + r, oy); path.lineTo(ox - r, oy); }
  return path;
}
export function rectPath(path, x0, y0, x1, y1, rev = false) {
  if (!rev) { path.moveTo(x0, y0); path.lineTo(x1, y0); path.lineTo(x1, y1); path.lineTo(x0, y1); path.lineTo(x0, y0); }
  else { path.moveTo(x0, y0); path.lineTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y0); path.lineTo(x0, y0); }
  return path;
}

// ------------------------------------------------------------------------------------------------ colliders
/** solid box over the rectangle u0..u1 x d0..d1 of the station frame (y0..y1) */
export function wbox(ctx, u0, u1, d0, d1, y0 = -5, y1 = 40) {
  const [cx, cz] = W((u0 + u1) / 2, (d0 + d1) / 2);
  return ctx.physics.addBox(cx, cz, u1 - u0, d1 - d0, TH, y0, y1);
}
/** walk-on box (steps, floors) */
export function wwalk(ctx, u0, u1, d0, d1, top, bottom = -5) {
  const [cx, cz] = W((u0 + u1) / 2, (d0 + d1) / 2);
  return ctx.physics.addWalkBox(cx, cz, u1 - u0, d1 - d0, TH, top, bottom);
}

// ------------------------------------------------------------------------------------------------ shared build object
export function makeCommon(ctx) {
  const T = ctx.mat.toon, svc = { monuments: [], flagpoles: [], photoSpots: [], stationExits: [], lamps: [], benches: [] };
  const TN = (col, o = {}) => T(col, { ...o, name: 'st-' + col + (o.name || '') });          // private (uncached by other modules) toon material: safe to animate
  const M = {
    stucco: TN(C.stucco), stuccoShade: TN(C.stuccoShade), wing: TN(C.wing), panel: TN(C.panel), trim: TN(C.trim), trimShade: TN(C.trimShade),
    plinth: TN(C.plinth), plinthDark: TN(C.plinthDark), roof: T(C.roof), roofLight: T(C.roofLight), towerRoof: T(C.towerRoof), hallRoof: T(C.hallRoof),
    door: T(C.door), doorDark: T(C.doorDark), frame: T(C.frame), pane: T(C.pane), iron: T(C.iron), ironLight: T(C.ironLight), chimney: TN(C.chimney),
    brick: T(C.brick), brickDark: T(C.brickDark), granite: T(C.granite), graniteDark: T(C.graniteDark), graniteLight: T(C.graniteLight),
    bronze: T(C.bronze), gold: T(C.gold, { emissive: '#5a4210', emissiveIntensity: 0.5 }),
  };
  // ---- night effects: materials registered here are NOT batched (userData.noBatch) and get their emissive / colour / opacity driven by ctx.shared.uNight each frame.
  const nightFns = [];
  const nu = () => ctx.shared.uNight.value;
  const night = {
    /** toon material: emissive colour `color`, intensity lo (day) .. hi (night) */
    toon(mat, color, hi, lo = 0) { mat.emissive.set(color); mat.userData.noBatch = true; nightFns.push(() => { mat.emissiveIntensity = lo + (hi - lo) * nu(); }); return mat; },
    /** basic (unlit) material created by ctx.mat.emissive: colour scaled lo .. hi */
    basic(mat, lo, hi) { const base = mat.color.clone(); mat.userData.noBatch = true; nightFns.push(() => { mat.color.copy(base).multiplyScalar(lo + (hi - lo) * nu()); }); return mat; },
    /** transparent additive material: opacity 0 by day .. hi at night */
    fade(mat, hi, lo = 0) { mat.userData.noBatch = true; nightFns.push(() => { mat.opacity = lo + (hi - lo) * nu(); mat.visible = mat.opacity > 0.01; }); return mat; },
  };
  ctx.onUpdate(() => { for (const f of nightFns) f(); });
  /** a toon material with a dark day map and a warm emissiveMap that fades in at night (lit windows, dials) */
  const lit = (key, map, litMap, hi = 1, lo = 0, o = {}) => { const m = T('#ffffff', { map, paint: 0, name: 'st-lit-' + key, ...o }); m.emissiveMap = litMap; return night.toon(m, '#ffffff', hi, lo); };
  /** soft round halo material for lamps (additive, drawn as crossed quads) */
  const haloTex = ctx.tex.draw(64, 64, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,230,170,0.95)'); gr.addColorStop(0.25, 'rgba(255,200,110,0.45)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { key: 'st_halo' });
  const halo = night.fade(new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, opacity: 0 }), 0.9);
  halo.userData.noOutline = true;
  const Cc = { ctx, THREE, L, M, svc, T, TN, night, halo, lit, parts: {}, groups: {} };
  Cc.publish = () => {
    const S = (ctx.services.landmarks ||= {});
    const merge = (k, arr) => { S[k] = (S[k] || []).concat(arr); };
    S.squareCentre = { x: L.SQUARE.x, z: L.SQUARE.z };
    merge('monuments', svc.monuments); merge('photoSpots', svc.photoSpots);
    S.stationExits = svc.stationExits; S.stationFrame = { O, theta: TH }; S.stationGates = svc.gateLanes || []; S.stationLamps = svc.lamps;
  };
  return Cc;
}
