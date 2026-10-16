// environment/lions.js - the two copper lions of the Palace Pier ("спуск со львами", Dvortsovaya embankment by the Admiralty pavilion): hammered copper (olive-green patina #6d7a46), a
// forepaw on a ball, faces turned toward the stair, on cast-iron plinths with volute ends (dark green-black) that stand on red-granite pedestals (quay.js builds the pedestals).
// Dossier docs/research/west-canals-bridges.md section 5 + photo refs/canals/65: lion ~2.2 m long, 1.4 m tall with the plinth. Built with the figure kit (lib/figures.js, ~5 k triangles each).
// lionGeometry(): a vertex-coloured BufferGeometry in the lion's frame: +x = the direction the lion faces, y up, origin = the middle of the plinth underside.
import * as THREE from 'three';
import { Acc } from './util.js';
import { lion, cached } from '../lib/figures.js';

const PATINA = [0.34, 0.43, 0.27], PATINA_DARK = [0.24, 0.32, 0.2], IRON = [0.17, 0.22, 0.19], BALL = [0.38, 0.42, 0.25];

/** an ellipsoid (lat-long) with per-vertex shading: a little darker underneath */
function ellipsoid(A, cx, cy, cz, rx, ry, rz, col, seg = 8, rings = 5, tilt = 0) {
  const rows = [];
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  for (let j = 0; j <= rings; j++) {
    const th = Math.PI * j / rings, y = Math.cos(th), r = Math.sin(th), row = [];
    for (let i = 0; i < seg; i++) {
      const ph = Math.PI * 2 * i / seg, x = r * Math.cos(ph), z = r * Math.sin(ph);
      let nx = x / rx, ny = y / ry, nz = z / rz; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const px = x * rx, py = y * ry, pz = z * rz;
      const k = 0.8 + 0.2 * (ny * 0.5 + 0.5);
      row.push(A.vert(cx + px * ct - py * st, cy + px * st + py * ct, cz + pz, nx * ct - ny * st, nx * st + ny * ct, nz, col[0] * k, col[1] * k, col[2] * k));
    }
    rows.push(row);
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) { const a = rows[j][i], b = rows[j][(i + 1) % seg], c = rows[j + 1][(i + 1) % seg], d = rows[j + 1][i]; A.tri(a, b, c); A.tri(a, c, d); }
}
function boxA(A, cx, cy, cz, sx, sy, sz, col, tilt = 0) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2, ct = Math.cos(tilt), st = Math.sin(tilt);
  const F = [[[1, 0, 0], [[hx, -hy, -hz], [hx, -hy, hz], [hx, hy, hz], [hx, hy, -hz]]], [[-1, 0, 0], [[-hx, -hy, hz], [-hx, -hy, -hz], [-hx, hy, -hz], [-hx, hy, hz]]], [[0, 1, 0], [[-hx, hy, -hz], [hx, hy, -hz], [hx, hy, hz], [-hx, hy, hz]]], [[0, -1, 0], [[-hx, -hy, hz], [hx, -hy, hz], [hx, -hy, -hz], [-hx, -hy, -hz]]], [[0, 0, 1], [[hx, -hy, hz], [-hx, -hy, hz], [-hx, hy, hz], [hx, hy, hz]]], [[0, 0, -1], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz]]]];
  for (const [nm, q] of F) {
    const k = 0.8 + 0.2 * (nm[1] * 0.5 + 0.5);
    const v = q.map((p) => A.vert(cx + p[0] * ct - p[1] * st, cy + p[0] * st + p[1] * ct, cz + p[2], nm[0] * ct - nm[1] * st, nm[0] * st + nm[1] * ct, nm[2], col[0] * k, col[1] * k, col[2] * k));
    A.tri(v[0], v[1], v[2]); A.tri(v[0], v[2], v[3]);
  }
}

/**
 * the lion of the Palace Pier: the figure kit's walking lion (lofted body, sculpted head with the mane, a forepaw on a ball, the head turned towards the stair), copper turned olive green,
 * standing on the cast-iron plinth with volute ends.  The kit figure faces +z; here it is turned to +x and given vertex colours (olive body with lighter verdigris on the up-facing surfaces, dark
 * eyes / nostrils, a green ball).  ~5 k triangles (the first version had ~700).
 */
export function lionGeometry() {
  return cached('env-lion-geometry', () => {
    const A = new Acc(true);
    // cast-iron plinth with volute ends (3.4 x 1.4 x 0.5)
    boxA(A, 0, 0.25, 0, 3.4, 0.5, 1.4, IRON);
    boxA(A, 0, 0.52, 0, 3.5, 0.08, 1.5, IRON);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ellipsoid(A, sx * 1.62, 0.38, sz * 0.66, 0.2, 0.2, 0.16, IRON, 8, 4);
    const plinth = A.geometry();
    const fig = lion({ pose: 'walk', ball: true, head: { turn: 0.55, pitch: 0.2, open: 0.12 }, detail: 0.75, mane: 1.1, tail: 'out' });
    const dim = (c, k) => c.map((v) => v * k);
    const COL = { main: dim(PATINA, 0.7), dark: [0.07, 0.09, 0.07], accent: dim(BALL, 0.75) };
    const pos = [], nrm = [], col = [], idx = [];
    const push = (g, colourOf, rotY, sc, oy) => {
      const pa = g.attributes.position, na = g.attributes.normal, ix = g.index, base = pos.length / 3, c = Math.cos(rotY), s = Math.sin(rotY);
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i) * sc, y = pa.getY(i) * sc, z = pa.getZ(i) * sc, nx = na.getX(i), ny = na.getY(i), nz = na.getZ(i);
        pos.push(x * c + z * s, y + oy, -x * s + z * c); nrm.push(nx * c + nz * s, ny, -nx * s + nz * c);
        const k = colourOf(ny, pa.getY(i)); col.push(k[0], k[1], k[2]);
      }
      for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i));
    };
    // the plinth (already coloured)
    { const pa = plinth.attributes.position, na = plinth.attributes.normal, ca = plinth.attributes.color, ix = plinth.index, base = pos.length / 3;
      for (let i = 0; i < pa.count; i++) { pos.push(pa.getX(i), pa.getY(i), pa.getZ(i)); nrm.push(na.getX(i), na.getY(i), na.getZ(i)); col.push(ca.getX(i), ca.getY(i), ca.getZ(i)); }
      for (let i = 0; i < ix.count; i++) idx.push(base + ix.getX(i)); }
    for (const [key, g] of Object.entries(fig.geos)) {
      const base = COL[key] || PATINA;
      push(g, (ny, y) => { const up = Math.max(0, ny), k = 0.78 + 0.22 * (ny * 0.5 + 0.5); return key === 'main' ? [(base[0] + 0.05 * up) * k, (base[1] + 0.07 * up) * k, (base[2] + 0.04 * up) * k] : [base[0] * k, base[1] * k, base[2] * k]; }, Math.PI / 2, 1.15, 0.56);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    g.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  });
}
