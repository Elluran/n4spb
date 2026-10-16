// kit.js - small helpers shared by the detail modules of the city: coloured box parts merged into one geometry, instancing, point-in-footprint tests.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Y = new THREE.Vector3(0, 1, 0);
const _box = new THREE.BoxGeometry(1, 1, 1);

/** Merge a list of coloured boxes into one geometry with a `color` vertex attribute (linear). part = { w, h, d, x, y, z, color, rx?, ry?, rz?, bottom?: true (y is the bottom) } */
export function mergeParts(parts) {
  const geos = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  for (const o of parts) {
    const g = (o.geo || _box).clone();
    e.set(o.rx || 0, o.ry || 0, o.rz || 0); q.setFromEuler(e);
    p.set(o.x || 0, (o.y || 0) + (o.bottom ? o.h / 2 : 0), o.z || 0); s.set(o.w, o.h, o.d);
    m.compose(p, q, s); g.applyMatrix4(m);
    c.set(o.color || '#ffffff');
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.deleteAttribute('uv');
    geos.push(g);
  }
  const out = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  out.computeBoundingSphere(); out.computeBoundingBox();
  return out;
}

/** InstancedMesh from items { x, y, z, rotY?, sx?, sy?, sz?, color? }. The material should be ctx.mat.toon('#ffffff', { vertexColors: true }) for coloured merged parts. */
export function instanced(root, geometry, material, items, name, o = {}) {
  if (!items.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color();
  let anyColor = false;
  items.forEach((it, i) => {
    q.setFromAxisAngle(Y, it.rotY || 0);
    if (it.tilt) { const t = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), it.tilt); q.multiply(t); }
    p.set(it.x, it.y, it.z); sc.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    M.compose(p, q, sc); mesh.setMatrixAt(i, M);
    if (it.color) { anyColor = true; mesh.setColorAt(i, c.set(it.color)); } else if (anyColor) mesh.setColorAt(i, c.set('#ffffff'));
  });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = o.cast !== false; mesh.receiveShadow = true; mesh.name = name;
  mesh.frustumCulled = o.cull ?? true;
  root.add(mesh);
  return mesh;
}

/** Point-in-ring (flat even-odd). */
export function inRing(r, x, z) { let ins = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) ins = !ins; } return ins; }
export function distToRing(r, x, z) { let d = 1e9; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const ax = r[j][0], az = r[j][1], dx = r[i][0] - ax, dz = r[i][1] - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; }
/** true when (x,z) is at least m metres inside the footprint (outer ring, outside every courtyard hole). */
export function insideBy(outer, holes, x, z, m) { if (!inRing(outer, x, z) || distToRing(outer, x, z) < m) return false; for (const h of holes) if (inRing(h, x, z) || distToRing(h, x, z) < m) return false; return true; }

/** A triangle of a ColorBuilder that faces the normal n: the winding is flipped when the geometric normal opposes n. (ColorBuilder.tri keeps the order it is given and n is only the shading
 *  normal: cones built with tri(ring a0, ring a1, apex) were wound inside out and culled from outside, the 'transparent spire'. ColorBuilder.quad and FacadeBuilder.face already flip.) */
export function triFacing(cb, a, b, c, n, color) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
  if (gx * n[0] + gy * n[1] + gz * n[2] < 0) cb.tri(a, c, b, n, color); else cb.tri(a, b, c, n, color);
}

/** The corners of a quad loop rotated so that its first three points are not collinear (FacadeBuilder.face / ColorBuilder.quad read the orientation from them: a quad with a collapsed
 *  edge, e.g. a gable strip that ends on the ground line, was wound the wrong way and culled). Returns the rotated copies; uv optional. */
export function loopStart(pts, uv) {
  for (let s = 0; s < pts.length; s++) {
    const p = pts[s], q = pts[(s + 1) % pts.length], r = pts[(s + 2) % pts.length];
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], vx = r[0] - p[0], vy = r[1] - p[1], vz = r[2] - p[2];
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-9) {
      const rot = (a) => (a ? a.map((_, i) => a[(i + s) % a.length]) : a);
      return { pts: rot(pts), uv: rot(uv) };
    }
  }
  return { pts, uv };
}

/** A quad of a ColorBuilder that may have a collapsed edge (an arch voussoir that ends on its springing line): duplicate corners are dropped and a triangle is emitted when three are left, so no
 *  zero-area triangle is made and the winding is never read from collinear points. */
export function quadFacing(cb, pts, n, color) {
  const Q = [];
  for (const q of pts) { const l = Q[Q.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1], q[2] - l[2]) > 1e-6) Q.push(q); }
  if (Q.length > 1 && Math.hypot(Q[0][0] - Q[Q.length - 1][0], Q[0][1] - Q[Q.length - 1][1], Q[0][2] - Q[Q.length - 1][2]) <= 1e-6) Q.pop();
  if (Q.length === 4) cb.quad(Q, n, color); else if (Q.length === 3) triFacing(cb, Q[0], Q[1], Q[2], n, color);
}

const BURIED = 0.4;                                  // OSM footprints of neighbouring houses overlap by up to ~0.3 m: only a point deeper than this is inside the neighbour
/** Neighbour test of the detail passes: neighbourIndex(info) -> (x, z, rec, yMin) = the drawn record that contains the point (outer ring, by more than 40 cm) and reaches up to yMin (its cornice + 0.9 m),
 *  or null. `rec` itself, its synthesised base `~f` and nothing else is skipped: a sibling PART of the same house is another volume. Used to keep towers, bays and roof parapets out of the mass of
 *  an overlapping neighbour (OSM footprints overlap; edges.js hides only what touches). `info` = the records near the play area. */
export function neighbourIndex(info) {
  let rg = null;
  return (x, z, rec, yMin) => {
    if (!rg) {
      rg = new Map();
      for (const r of info) for (const ring of r.rings) {
        if (ring.hole) continue;
        let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const q of ring.pts) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); z0 = Math.min(z0, q[1]); z1 = Math.max(z1, q[1]); }
        const c = { r, pts: ring.pts, box: [x0, x1, z0, z1] };
        for (let cx = Math.floor(x0 / 24); cx <= Math.floor(x1 / 24); cx++) for (let cz = Math.floor(z0 / 24); cz <= Math.floor(z1 / 24); cz++) { const k = cx + ',' + cz; let g = rg.get(k); if (!g) rg.set(k, (g = [])); g.push(c); }
      }
    }
    const hid = String(rec.b.id).replace(/~f$/, '');
    for (const c of rg.get(Math.floor(x / 24) + ',' + Math.floor(z / 24)) || []) {
      const o = c.r; if (o === rec) continue;
      if (String(o.b.id).replace(/~f$/, '') === hid) continue;
      if (Math.max(0, o.b.minH || 0) + o.st.H + 0.9 < yMin) continue;
      const bx = c.box; if (x < bx[0] || x > bx[1] || z < bx[2] || z > bx[3]) continue;
      if (inRing(c.pts, x, z) && distToRing(c.pts, x, z) > BURIED) return o;
    }
    return null;
  };
}
