// traffic/mk.js - shared helpers of the vehicle models (side-profile extrusion, wheel arches, wheels, plates, colours). Used by models.js (cars, vans, truck) and buses.js.
// Technique: the body is the extrusion of a side profile (z, y) with a soft bevel + front / rear taper (Moscow sibling streets/cars.js, Sakuragaoka reference vehicles, MIT).
// Model frame: forward +Z, origin on the ground midway between the axles, +X = the car's LEFT (the driver sits at +X: all cars are left-hand drive).
import * as THREE from 'three';
import { VB, quad } from './vb.js';

export const TYRE = '#26272c', HUB = '#9ea4aa', TRIM = '#2d3035', GLASSC = '#232c35', INT = '#1a1f25', CHROME = '#8d939a', LENS_H = '#c9d2da', LENS_T = '#8a2024', WHITE = '#ffffff';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export function archPts(s, zA, n) {
  const Ra = s.Ra, al = Math.asin(clamp((s.yb - s.R) / Ra, -1, 1)), out = [];
  for (let i = 0; i <= n; i++) { const t = (Math.PI - al) + (2 * al - Math.PI) * i / n; out.push([zA + Ra * Math.cos(t), s.R + Ra * Math.sin(t)]); }
  return out;
}
export function extrudeSide(pts, W, bev, taper) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const depth = Math.max(0.05, W - 2 * bev);
  const bs = bev * 0.8;
  const g = new THREE.ExtrudeGeometry(shape, bev > 0 ? { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bs, bevelOffset: -bs, bevelSegments: 1, curveSegments: 3 } : { depth: W, bevelEnabled: false, curveSegments: 3 });
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  g.translate(bev > 0 ? depth / 2 : W / 2, 0, 0);
  if (taper) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const tf = Math.max(0, (z - taper.zF0) / (taper.zF1 - taper.zF0)), tr = Math.max(0, (taper.zR0 - z) / (taper.zR0 - taper.zR1));
      let k = 1 - taper.kF * tf * tf - taper.kR * tr * tr;
      if (taper.kS) { const ts = clamp((p.getY(i) - taper.yS) / (taper.yT - taper.yS), 0, 1); k *= 1 - taper.kS * ts * ts; }
      p.setX(i, p.getX(i) * k);
    }
    g.computeVertexNormals();
  }
  return g;
}
/** extruded polygon in (z,y), total width W (the glass volume of a greenhouse) */
export function extrudeGlass(pts, W) {
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false, curveSegments: 1 });
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  g.translate(W / 2, 0, 0);
  return g;
}
/** convex polygon shrunk by d on every side */
export function insetPoly(pts, d) {
  const n = pts.length; let area = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1, out = [];
  const nrm = (e) => { const l = Math.hypot(e[0], e[1]) || 1; return [-e[1] * sg / l, e[0] * sg / l]; };
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const n1 = nrm([p1[0] - p0[0], p1[1] - p0[1]]), n2 = nrm([p2[0] - p1[0], p2[1] - p1[1]]);
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]);
    out.push([p1[0] + (n1[0] + n2[0]) * k, p1[1] + (n1[1] + n2[1]) * k]);
  }
  return out;
}

/** the body paint tint: the underside and the wheel-arch lining are dark and untinted, the rest is paint (kind 1) */
export function bodyTint(s) {
  const dk = new THREE.Color(TRIM);
  return (p, c, n, info) => {
    if (n.y < -0.7) { c.copy(dk); info.kind = 0; return; }
    for (const za of s.arches) {
      const d = Math.hypot(p.z - za, p.y - s.R);
      if (Math.abs(n.x) < 0.85 && d < s.Ra + s.bev + 0.03 && p.y > s.yb - 0.02) { c.copy(dk); info.kind = 0; return; }
    }
  };
}
export const wheel = (V, hi, s, x, z, R, tw, seg = 8) => {
  if (hi) { V.cyl(R, R, tw, TYRE, [x, R, z], [0, 0, Math.PI / 2], seg, null, 0); V.cyl(R * 0.6, R * 0.6, tw + 0.04, HUB, [x, R, z], [0, 0, Math.PI / 2], 6, null, 0); }
  else { const sd = Math.sign(x) || 1; V.box(0.12, R * 1.7, R * 1.7, TYRE, [sd * (s.W / 2 - 0.02), R, z], null, null, 0); }   // L1: dark block whose outer face stands 4 cm proud of the flat body side
};
/** a 0.52 x 0.112 plate quad (front: faces +Z, u runs to +X; rear: faces -Z, u runs to -X); kind 2 = the plate atlas cell of the instance */
export const plate = (V, y, z, front) => {
  const pw = 0.26, ph = 0.056;
  V.add(front ? quad([-pw, y - ph, z], [pw, y - ph, z], [pw, y + ph, z], [-pw, y + ph, z]) : quad([pw, y - ph, z], [-pw, y - ph, z], [-pw, y + ph, z], [pw, y + ph, z]), WHITE, null, null, null, 2);
};
/** a text decal quad on the vertical side of a vehicle (x = outer face; sd = +1 left (+X) / -1 right (-X) side), z0..z1 along the body, y0..y1, atlas row `row` of `rows` rows (liveryAtlas) */
export function sideDecal(sd, x, z0, z1, y0, y1, row, rows) {
  const v0 = 1 - (row + 1) / rows, v1 = 1 - row / rows;
  const g = sd > 0 ? quad([x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]) : quad([x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]);
  const uv = g.attributes.uv; uv.setXY(0, 0, v0); uv.setXY(1, 1, v0); uv.setXY(2, 1, v1); uv.setXY(3, 0, v1);
  return g;
}
