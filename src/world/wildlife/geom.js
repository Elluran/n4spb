// wildlife/geom.js - a tiny part-merging toolkit for the animal models (adapted from the Moscow sibling's boats/geom.js).
//  * Parts : accumulates primitives (box, cylinder, sphere, cone, flat polygon blade), tints every part with vertex colours and merges them into ONE
//            non-indexed geometry, so a whole bird / dog body is a single instanced mesh drawn with one toon material (vertexColors).
//  * Coordinates of all models: metres, +Z forward, +Y up, origin at the feet / ground under the body centre.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();
const cached = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
const unit = {
  box: () => cached('box', () => new THREE.BoxGeometry(1, 1, 1)),
  cyl: (seg) => cached('cyl' + seg, () => new THREE.CylinderGeometry(0.5, 0.5, 1, seg, 1)),
  sph: (w, h) => cached(`sph${w}_${h}`, () => new THREE.SphereGeometry(0.5, w, h)),
};

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export class Parts {
  /** o: {x,y,z, rx,ry,rz (Euler YXZ), sx,sy,sz} */
  add(geo, color = '#ffffff', o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ'); _q.setFromEuler(_e);
    _p.set(o.x || 0, o.y || 0, o.z || 0); _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
    g.applyMatrix4(_m.compose(_p, _q, _s));
    _c.set(color); const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = _c.r; a[i * 3 + 1] = _c.g; a[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.g.push(g);
    return this;
  }
  constructor() { this.g = []; }
  box(w, h, d, color, o = {}) { return this.add(unit.box(), color, { ...o, sx: w, sy: h, sz: d }); }
  cyl(r, h, color, o = {}, seg = 6) { return this.add(unit.cyl(seg), color, { ...o, sx: r * 2, sy: h, sz: r * 2 }); }
  /** cone / frustum (rTop, rBottom), axis along +Y */
  cone(rTop, rBot, h, color, o = {}, seg = 6) { return this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1), color, o); }
  sph(rx, ry, rz, color, o = {}, w = 8, h = 6) { return this.add(unit.sph(w, h), color, { ...o, sx: rx * 2, sy: ry * 2, sz: rz * 2 }); }
  /** flat blade from a plan polygon [[x,z],...] (x = span, z = chord direction), thickness t, lying in the XZ plane */
  blade(pts, t, color, o = {}) { return this.add(bladeGeo(pts, t), color, o); }
  get triangles() { let n = 0; for (const g of this.g) n += g.attributes.position.count / 3; return n; }
  build() {
    const g = mergeGeometries(this.g, false);
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

/** merge finished geometries (same attribute set) into one */
export function merge(list) {
  const g = mergeGeometries(list, false);
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}

/** extruded plan polygon (any winding) from y = -t/2 to +t/2 */
export function bladeGeo(pts, t) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], -p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -t / 2, 0);
  g.computeVertexNormals();
  return g;
}

/** a tube between two points (round cross-section r0 -> r1) as a cone aligned from a to b */
export function rod(P, a, b, r0, r1, color, seg = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], l = Math.hypot(dx, dy, dz) || 1e-6;
  const g = new THREE.CylinderGeometry(r1, r0, l, seg, 1);            // +Y end = r1 (toward b)
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(dx / l, dy / l, dz / l);
  const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new THREE.Vector3(1, 1, 1)));
  P.add(g, color);
  return P;
}

/** an InstancedMesh that is re-posed every frame (never frustum culled: the instances move all over the map) */
export function instanced(geo, mat, n, name) {
  const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n));
  m.name = name; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.count = 0;
  return m;
}
