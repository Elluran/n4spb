// people/kit.js - small geometry kit of the characters half (copy of the Moscow props kit, retuned): Geo accumulates primitives (boxes, cylinders, spheres, tubes,
// lathes, extrusions) into ONE BufferGeometry with per-vertex colours (linear, like ctx.mat colours) and an optional per-vertex palette slot (aSlot, see rig.js),
// so a whole outfit part becomes one geometry that serves every colour combination through per-instance colours.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n = new THREE.Matrix3(), _c = new THREE.Color();
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
const cache = new Map();
const prim = (key, mk) => { let g = cache.get(key); if (!g) { g = mk(); cache.set(key, g); } return g; };

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Matrix from position, Euler rotation [rx, ry, rz] (XYZ) and scale (number | [sx, sy, sz]). */
export function xf(pos = [0, 0, 0], rot = null, scl = 1, out = new THREE.Matrix4()) {
  _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0, 'XYZ');
  if (Array.isArray(scl)) _s.set(scl[0], scl[1], scl[2]); else _s.set(scl, scl, scl);
  return out.compose(_p.set(pos[0], pos[1], pos[2]), _q.setFromEuler(_e), _s);
}

export class Geo {
  constructor() { this.P = []; this.N = []; this.C = []; this.S = []; this.I = []; this.n = 0; this.slot = 0; }
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
      this.C.push(_c.r, _c.g, _c.b); this.S.push(this.slot);
    }
    if (idx) for (let k = 0; k < idx.count; k++) this.I.push(base + idx.getX(k)); else for (let i = 0; i < pos.count; i++) this.I.push(base + i);
    this.n += pos.count;
    return this;
  }
  /** append another Geo under a matrix */
  merge(o, m = null) {
    if (o.empty) return this;
    const base = this.n; if (m) _n.getNormalMatrix(m);
    for (let i = 0; i < o.n; i++) {
      _p.set(o.P[i * 3], o.P[i * 3 + 1], o.P[i * 3 + 2]); _a.set(o.N[i * 3], o.N[i * 3 + 1], o.N[i * 3 + 2]);
      if (m) { _p.applyMatrix4(m); _a.applyMatrix3(_n).normalize(); }
      this.P.push(_p.x, _p.y, _p.z); this.N.push(_a.x, _a.y, _a.z); this.C.push(o.C[i * 3], o.C[i * 3 + 1], o.C[i * 3 + 2]); this.S.push(o.S[i]);
    }
    for (const k of o.I) this.I.push(base + k);
    this.n += o.n;
    return this;
  }
  box(w, h, d, pos = [0, 0, 0], col = '#fff', rot = null) { return this.add(prim('box', () => new THREE.BoxGeometry(1, 1, 1)), xf(pos, rot, [w, h, d], _m), col); }
  /** box whose bottom face sits at pos[1] */
  boxB(w, h, d, pos = [0, 0, 0], col = '#fff', rot = null) { return this.box(w, h, d, [pos[0], pos[1] + h / 2, pos[2]], col, rot); }
  cyl(rTop, rBot, h, pos = [0, 0, 0], col = '#fff', seg = 10, rot = null, open = false) {
    const R = Math.max(rTop, rBot, 1e-4), key = `cyl${seg}|${(rTop / R).toFixed(3)}|${(rBot / R).toFixed(3)}|${open ? 1 : 0}`;
    return this.add(prim(key, () => new THREE.CylinderGeometry(rTop / R, rBot / R, 1, seg, 1, open)), xf(pos, rot, [R, h, R], _m), col);
  }
  cylB(rTop, rBot, h, pos, col, seg = 10, rot = null) { return this.cyl(rTop, rBot, h, [pos[0], pos[1] + h / 2, pos[2]], col, seg, rot); }
  sphere(rx, ry, rz, pos = [0, 0, 0], col = '#fff', seg = 10, rot = null, rings = 0) {
    const rg = rings || Math.max(3, Math.round(seg * 0.7));
    return this.add(prim('sph' + seg + '|' + rg, () => new THREE.SphereGeometry(1, seg, rg)), xf(pos, rot, [rx, ry ?? rx, rz ?? rx], _m), col);
  }
  torus(R, r, pos = [0, 0, 0], col = '#fff', rot = null, rs = 6, ts = 14) {
    return this.add(prim(`tor${R.toFixed(3)}|${r.toFixed(3)}|${rs}|${ts}`, () => new THREE.TorusGeometry(R, r, rs, ts)), xf(pos, rot, 1, _m), col);
  }
  /** revolve a [r, y] profile around Y */
  lathe(profile, pos = [0, 0, 0], col = '#fff', seg = 12, rot = null) {
    const g = new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg); g.computeVertexNormals();
    return this.add(g, xf(pos, rot, 1, _m), col);
  }
  /** cylinder from point a to point b (arrays) */
  tube(a, b, r, col = '#fff', seg = 6, rTop = null, open = false) {
    _a.set(a[0], a[1], a[2]); _b.set(b[0], b[1], b[2]);
    const len = _a.distanceTo(_b); if (len < 1e-5) return this;
    _p.copy(_a).add(_b).multiplyScalar(0.5);
    _q.setFromUnitVectors(_up, _b.sub(_a).normalize());
    const R = Math.max(r, rTop ?? r), key = `cyl${seg}|${((rTop ?? r) / R).toFixed(3)}|${(r / R).toFixed(3)}|${open ? 1 : 0}`;
    _m.compose(_p, _q, _s.set(R, len, R));
    return this.add(prim(key, () => new THREE.CylinderGeometry((rTop ?? r) / R, r / R, 1, seg, 1, open)), _m, col);
  }
  /** polyline of tubes with round joints omitted (cheap) */
  path(pts, r, col, seg = 6) { for (let i = 0; i + 1 < pts.length; i++) this.tube(pts[i], pts[i + 1], r, col, seg); return this; }
  /** a flat quad (two triangles) from four corner points a,b,c,d (counter-clockwise seen from the normal side) */
  quad(a, b, c, d, col = '#fff') {
    const base = this.n; _c.set(col);
    _a.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); _b.set(d[0] - a[0], d[1] - a[1], d[2] - a[2]); _a.cross(_b).normalize();
    for (const p of [a, b, c, d]) { this.P.push(p[0], p[1], p[2]); this.N.push(_a.x, _a.y, _a.z); this.C.push(_c.r, _c.g, _c.b); this.S.push(this.slot); }
    this.I.push(base, base + 1, base + 2, base, base + 2, base + 3); this.n += 4; return this;
  }
  /** forceSlot: always write the aSlot attribute (the palette material needs it) */
  build(withUv = true, forceSlot = false) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3));
    if (forceSlot || this.S.some((v) => v)) g.setAttribute('aSlot', new THREE.Float32BufferAttribute(this.S, 1));
    if (withUv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(this.n * 2), 2));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** Deterministic hash01 of a string / number list. */
export function hash01(...a) {
  let h = 2166136261; const s = a.join('|');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; return (h >>> 0) / 4294967296;
}

/** Emissive material that brightens with ctx.shared.uNight (phone screens: day = a pale lit screen, night = glowing). */
export function lampMat(ctx, color = '#ffe2b0', day = 0.9, night = 2.4) {
  const key = 'pt-lamp|' + color + '|' + day + '|' + night;
  if (ctx.mat.cache.has(key)) return ctx.mat.cache.get(key);
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), toneMapped: false, fog: true });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = ctx.shared.uNight; sh.uniforms.uDay = { value: day }; sh.uniforms.uNit = { value: night };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight; uniform float uDay; uniform float uNit;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(uDay, uNit, clamp(uNight, 0.0, 1.0));');
  };
  m.customProgramCacheKey = () => key;
  ctx.mat.cache.set(key, m);
  return m;
}
