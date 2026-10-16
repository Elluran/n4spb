// props/kit.js - small geometry kit of the props module (adapted from the Moscow sibling's props/kit.js): Geo accumulates primitives (boxes, cylinders,
// spheres, tubes, lathes, extrusions) into ONE BufferGeometry with per-vertex colours, so a whole bench / bin / kiosk becomes one mesh (one InstancedMesh per
// prop type, or a static mesh that the batcher merges by material). Plus: instancing helpers, textured panels (billboards, signs) with a night boost, small
// maths, and the deterministic hash used instead of Math.random.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const cache = new Map();
const prim = (key, mk) => { let g = cache.get(key); if (!g) { g = mk(); cache.set(key, g); } return g; };

export const BOT = 8, TOP = 4, PX = 1, NX = 2, PZ = 16, NZ = 32;      // box face masks (see Geo.box)
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

/** Matrix from position, Euler rotation [rx, ry, rz] (XYZ) and scale (number | [sx, sy, sz]). */
export function xf(pos = [0, 0, 0], rot = null, scl = 1, out = new THREE.Matrix4()) {
  _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'XYZ');
  if (Array.isArray(scl)) _s.set(scl[0], scl[1], scl[2]); else _s.set(scl, scl, scl);
  return out.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e), _s);
}
/** world placement matrix: position, yaw (three rotation.y) and uniform scale */
export function placeM(x, y, z, rotY = 0, s = 1, out = new THREE.Matrix4()) {
  _e.set(0, rotY, 0); return out.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s.set(s, s, s));
}

export class Geo {
  constructor() { this.P = []; this.N = []; this.C = []; this.I = []; this.n = 0; }
  get tris() { return this.I.length / 3; }
  get empty() { return this.n === 0; }
  /** append geometry g under matrix m with colour col (hex string / number / Color) */
  add(g, m, col = '#ffffff') {
    const pos = g.attributes.position, nor = g.attributes.normal, idx = g.index;
    _n.getNormalMatrix(m); _c.set(col);
    const base = this.n;
    for (let i = 0; i < pos.count; i++) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(m); this.P.push(_p.x, _p.y, _p.z);
      _a.fromBufferAttribute(nor, i).applyMatrix3(_n).normalize(); this.N.push(_a.x, _a.y, _a.z);
      this.C.push(_c.r, _c.g, _c.b);
    }
    if (idx) for (let k = 0; k < idx.count; k++) this.I.push(base + idx.getX(k)); else for (let i = 0; i < pos.count; i++) this.I.push(base + i);
    this.n += pos.count;
    return this;
  }
  /** append another Geo under a matrix (optional) */
  merge(o, m = null) {
    if (o.empty) return this;
    const base = this.n; if (m) _n.getNormalMatrix(m);
    for (let i = 0; i < o.n; i++) {
      _p.set(o.P[i * 3], o.P[i * 3 + 1], o.P[i * 3 + 2]); _a.set(o.N[i * 3], o.N[i * 3 + 1], o.N[i * 3 + 2]);
      if (m) { _p.applyMatrix4(m); _a.applyMatrix3(_n).normalize(); }
      this.P.push(_p.x, _p.y, _p.z); this.N.push(_a.x, _a.y, _a.z); this.C.push(o.C[i * 3], o.C[i * 3 + 1], o.C[i * 3 + 2]);
    }
    for (const k of o.I) this.I.push(base + k);
    this.n += o.n;
    return this;
  }
  /** merge under a placement (x, y, z, rotY) */
  put(o, x = 0, y = 0, z = 0, rotY = 0, s = 1) { return this.merge(o, placeM(x, y, z, rotY, s, new THREE.Matrix4())); }
  /** box; `skip` = bit mask of faces to leave out (hidden ones): 1 +x, 2 -x, 4 top, 8 bottom, 16 +z, 32 -z (BOT = 8: a box standing on the ground or on another box saves 2 of 12 triangles) */
  box(w, h, d, pos = [0, 0, 0], col = '#fff', rot = null, skip = 0) {
    return this.add(prim('box' + skip, () => {
      const g = new THREE.BoxGeometry(1, 1, 1);
      if (skip) { const ix = []; for (let f = 0; f < 6; f++) if (!((skip >> f) & 1)) for (let k = 0; k < 6; k++) ix.push(g.index.getX(f * 6 + k)); g.setIndex(ix); }
      return g;
    }), xf(pos, rot, [w, h, d], _m), col);
  }
  /** box whose bottom face sits at pos[1] */
  boxB(w, h, d, pos = [0, 0, 0], col = '#fff', rot = null, skip = 0) { return this.box(w, h, d, [pos[0], pos[1] + h / 2, pos[2]], col, rot, skip); }
  cyl(rTop, rBot, h, pos = [0, 0, 0], col = '#fff', seg = 10, rot = null, open = false) {
    const R = Math.max(rTop, rBot, 1e-4), key = `cyl${seg}|${(rTop / R).toFixed(3)}|${(rBot / R).toFixed(3)}|${open ? 1 : 0}`;
    return this.add(prim(key, () => new THREE.CylinderGeometry(rTop / R, rBot / R, 1, seg, 1, open)), xf(pos, rot, [R, h, R], _m), col);
  }
  cylB(rTop, rBot, h, pos, col, seg = 10, rot = null) { return this.cyl(rTop, rBot, h, [pos[0], pos[1] + h / 2, pos[2]], col, seg, rot); }
  sphere(rx, ry, rz, pos = [0, 0, 0], col = '#fff', seg = 10, rot = null) {
    return this.add(prim('sph' + seg, () => new THREE.SphereGeometry(1, seg, Math.max(4, Math.round(seg * 0.7)))), xf(pos, rot, [rx, ry ?? rx, rz ?? rx], _m), col);
  }
  /** octahedron blob (8 triangles): flowers, foliage tufts, low-poly crowns */
  octa(rx, ry, rz, pos = [0, 0, 0], col = '#fff', rot = null) { return this.add(prim('octa', () => { const g = new THREE.OctahedronGeometry(1, 0); return g; }), xf(pos, rot, [rx, ry ?? rx, rz ?? rx], _m), col); }
  torus(R, r, pos = [0, 0, 0], col = '#fff', rot = null, rs = 6, ts = 14) {
    return this.add(prim(`tor${R.toFixed(3)}|${r.toFixed(3)}|${rs}|${ts}`, () => new THREE.TorusGeometry(R, r, rs, ts)), xf(pos, rot, 1, _m), col);
  }
  /** revolve a [r, y] profile around Y */
  lathe(profile, pos = [0, 0, 0], col = '#fff', seg = 12, rot = null) {
    const g = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg); g.computeVertexNormals();
    return this.add(g, xf(pos, rot, 1, _m), col);
  }
  /** cylinder from point a to point b (arrays) */
  tube(a, b, r, col = '#fff', seg = 6, rTop = null) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const len = _a.distanceTo(_b); if (len < 1e-5) return this;
    _p.copy(_a).add(_b).multiplyScalar(0.5);
    _q.setFromUnitVectors(_up, _b.sub(_a).normalize());
    const R = Math.max(r, rTop ?? r), open = R <= 0.04 ? 1 : 0, key = `cyl${seg}|${((rTop ?? r) / R).toFixed(3)}|${(r / R).toFixed(3)}|${open}`;   // thin tubes (rails, wires, spokes) are open: the end caps would be 4 cm discs
    _m.compose(_p, _q, _s.set(R, len, R));
    return this.add(prim(key, () => new THREE.CylinderGeometry((rTop ?? r) / R, r / R, 1, seg, 1, !!open)), _m, col);
  }
  /** polyline of tubes */
  path(pts, r, col, seg = 6) { for (let i = 0; i + 1 < pts.length; i++) this.tube(pts[i], pts[i + 1], r, col, seg); return this; }
  /** extrude a 2D outline [[x,y],...] along z (centred) */
  poly(points, depth, pos = [0, 0, 0], col = '#fff', rot = null) {
    const sh = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, -depth / 2);
    return this.add(g, xf(pos, rot, 1, _m), col);
  }
  /** a flat quad from four corner points a,b,c,d (counter-clockwise seen from the normal side) */
  quad(a, b, c, d, col = '#fff') {
    const base = this.n; _c.set(col);
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); _a.cross(_b).normalize();
    for (const p of [a, b, c, d]) { this.P.push(p[0], p[1], p[2]); this.N.push(_a.x, _a.y, _a.z); this.C.push(_c.r, _c.g, _c.b); }
    this.I.push(base, base + 1, base + 2, base, base + 2, base + 3); this.n += 4; return this;
  }
  build(withUv = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(this.n * 2), 2));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** vertex-coloured cel material (shared: same args -> same material). */
export const vcMat = (ctx, o = {}) => ctx.mat.toon('#ffffff', { vertexColors: true, paint: 0.035, name: 'pr-vc', ...o });

/** InstancedMesh of `geo` (Geo | BufferGeometry) with the given matrices (static scenery, kept out of the merge). */
export function instanced(ctx, geo, material, matrices, o = {}) {
  if (!matrices.length) return null;
  const g = geo.build ? geo.build(o.uv === true) : geo;
  const mesh = new THREE.InstancedMesh(g, material, matrices.length);
  for (let i = 0; i < matrices.length; i++) mesh.setMatrixAt(i, matrices[i]);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false;
  mesh.name = o.name || 'pr-inst';
  mesh.computeBoundingSphere();
  if (o.noOutline) ctx.noOutline(mesh);
  ctx.addStatic(mesh);
  return mesh;
}

/** Static (batchable) mesh from a Geo at a placement. */
export function staticMesh(ctx, geo, material, x, y, z, rotY = 0, o = {}) {
  const m = new THREE.Mesh(geo.build ? geo.build() : geo, material);
  m.position.set(x, y, z); m.rotation.y = rotY;
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false; m.name = o.name || 'pr-static';
  if (o.noOutline) ctx.noOutline(m);
  ctx.addStatic(m);
  return m;
}

/** Deterministic hash01 of a string / number list. */
export function hash01(...a) {
  let h = 2166136261; const s = a.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296;
}

/** Self-lit vertex-coloured material that brightens with ctx.shared.uNight (lamp lenses, light-box faces): day soft, night glowing. */
export function nightMat(ctx, color = '#ffe2b0', day = 0.9, night = 2.4, o = {}) {
  const key = 'pr-night|' + color + '|' + day + '|' + night + '|' + (o.vertexColors ? 1 : 0) + '|' + (o.map ? o.map.uuid : '') + '|' + (o.side || '');
  if (ctx.mat.cache.has(key)) return ctx.mat.cache.get(key);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), map: o.map || null, toneMapped: false, fog: true, vertexColors: !!o.vertexColors, side: o.side === 'double' ? THREE.DoubleSide : THREE.FrontSide, alphaTest: o.alphaTest || 0, transparent: !!o.transparent });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = ctx.shared.uNight; sh.uniforms.uDay = { value: day }; sh.uniforms.uNit = { value: night };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; uniform float uDay; uniform float uNit;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(uDay, uNit, clamp(uNight, 0.0, 1.0));');
  };
  m.customProgramCacheKey = () => 'pr-night';
  m.userData.noBatchFlag = false;
  ctx.mat.cache.set(key, m);
  return m;
}

/** Textured quads merged per texture (billboards, light-box faces, sign plates, banners): `P.panel(tex, cx, cy, cz, nx, nz, w, h, {lit})` with the face normal
 *  (nx, nz) pointing at the viewer. Lit panels use the night-boosted material, plain ones the sun-shaded toon material. `P.finish(root)` creates the meshes. */
export function makePanels(ctx) {
  const map = new Map();
  const get = (tex, lit, alpha) => {
    const k = (lit ? 'L' : 'T') + (alpha ? 'a' : '') + tex.uuid; let m = map.get(k); if (m) return m;
    const mat = lit ? nightMat(ctx, '#ffffff', 0.92, 1.35, { map: tex, side: 'double', alphaTest: alpha ? 0.5 : 0 }) : ctx.mat.toon('#ffffff', { map: tex, paint: 0.015, side: 'double', alphaTest: alpha ? 0.5 : 0, name: 'pr-panel' });
    m = { tex, mat, P: [], N: [], U: [], I: [], n: 0, lit, alpha }; map.set(k, m); return m;
  };
  const panel = (tex, cx, cy, cz, nx, nz, w, h, o = {}) => {
    const g = get(tex, !!o.lit, !!o.alpha), tx = nz, tz = -nx, hx = tx * w / 2, hz = tz * w / 2, f = o.flip ? -1 : 1;
    const u0 = o.u0 ?? 0, u1 = o.u1 ?? 1, v0 = o.v0 ?? 0, v1 = o.v1 ?? 1, t = o.tilt || 0;
    const ca = Math.cos(t), sa = Math.sin(t), y0 = cy - h / 2 * ca, y1 = cy + h / 2 * ca, off = h / 2 * sa;     // optional tilt about the horizontal axis (lean back)
    const base = g.n;
    const pts = [[cx - hx * f - nx * off, y0, cz - hz * f - nz * off, u0, v0], [cx + hx * f - nx * off, y0, cz + hz * f - nz * off, u1, v0], [cx + hx * f + nx * off, y1, cz + hz * f + nz * off, u1, v1], [cx - hx * f + nx * off, y1, cz - hz * f + nz * off, u0, v1]];
    for (const p of pts) { g.P.push(p[0], p[1], p[2]); g.N.push(nx, 0, nz); g.U.push(p[3], p[4]); }
    g.I.push(base, base + 1, base + 2, base, base + 2, base + 3); g.n += 4;
  };
  const finish = (root) => {
    let tris = 0;
    for (const g of map.values()) {
      if (!g.n) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.U, 2));
      geo.setIndex(g.n > 65535 ? new THREE.Uint32BufferAttribute(g.I, 1) : new THREE.Uint16BufferAttribute(g.I, 1));
      geo.computeBoundingSphere(); geo.computeBoundingBox();
      const m = new THREE.Mesh(geo, g.mat); m.name = 'pr-panels'; m.castShadow = false; m.receiveShadow = !g.lit; if (g.lit || g.alpha) ctx.noOutline(m);
      root.add(m); tris += g.I.length / 3;
    }
    return tris;
  };
  return { panel, finish };
}

/** flat ring [x,z,...] point test (even-odd) */
export function ringHas(o, x, z) {
  let c = false;
  for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
    const xi = o[i], zi = o[i + 1], xj = o[j], zj = o[j + 1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
/** nearest point of a flat ring to (x,z): { d, x, z, i, tx, tz } */
export function nearestOnRing(o, x, z) {
  let best = { d: 1e9 };
  for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) {
    const ax = o[j], az = o[j + 1], dx = o[i] - ax, dz = o[i + 1] - az, l2 = dx * dx + dz * dz || 1, t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1);
    const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
    if (d < best.d) { const l = Math.sqrt(l2); best = { d, x: px, z: pz, i: j / 2, tx: dx / l, tz: dz / l, t, len: l }; }
  }
  return best;
}
export const ringArea = (o) => { let a = 0; for (let i = 0, j = o.length - 2; i < o.length; j = i, i += 2) a += o[j] * o[i + 1] - o[i] * o[j + 1]; return Math.abs(a) / 2; };
export const ringCentroid = (o) => { let x = 0, z = 0; const n = o.length / 2; for (let i = 0; i < o.length; i += 2) { x += o[i]; z += o[i + 1]; } return [x / n, z / n]; };
