// environment/revet.js - the small pieces of the concrete REVETMENT of the Gavan quay south of the submarine D-2 and of the yellow mushroom bollards of the passenger port (water-3, 2026-10-09; the requests of
// docs/research/vo-requests-landmarksSeaTerminal.md 5 and vo-requests-landmarksMarineFacade.md 1; photos d19 / y04 / t04 of docs/research/seaterminal.md and V 10 / 33 / 74 / 83 of marinefacade.md).
// quay.js calls these; everything here is pure geometry / texture (no layout reads, no colliders: the slope is "water" for every placement rule and its top is closed by the slope-top barrier of quay.js).
//   concreteTexture(ctx)           large grey concrete slabs with dark joints, rust and damp streaks (u = 4 m along the bank, v = 1.7 m of height: panels about 4 x 4 m on the slope)
//   steelFlight(B, p, run, yLip)   one blue steel stair flight laid on the slab slope (two stringers, treads, two handrails with a mid rail and posts); B: a MeshBuilder, p: { x, z, tx, tz, nx, nz } the bank point on
//                                  the water edge (n = landward), run = horizontal width of the slope, yLip = height of the slab at the foot (the slope rises from yLip at offset 0 to 0 at offset run)
//   chainPostGeometry()            a cast-iron chain post 0.95 m tall (flared foot, collar, cap) as in photo t04
//   mushroomGeometry()             the yellow mushroom mooring bollard of the passenger port (0.55 m high, top diameter 1.1 m, a black base ring) on a pale concrete slab 1.6 x 1.0 m; vertex colours
import * as THREE from 'three';
import { MeshBuilder } from '../lib/massing.js';

function orient(B, a, b, c, nx, ny, nz) {
  const P = B.pos, ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  if ((uy * vz - uz * vy) * nx + (uz * vx - ux * vz) * ny + (ux * vy - uy * vx) * nz >= 0) B.tri(a, b, c); else B.tri(a, c, b);
}
/** a prism from the centre A to the centre E (3D points), cross-section w x h: w along the horizontal tangent (tx, tz), h along the other axis (perpendicular to the prism axis and the tangent, pointing up) */
export function prism(B, A, E, tx, tz, w, h) {
  const d = [E[0] - A[0], E[1] - A[1], E[2] - A[2]], dl = Math.hypot(d[0], d[1], d[2]) || 1e-6; d[0] /= dl; d[1] /= dl; d[2] /= dl;
  const t = [tx, 0, tz];
  let u = [d[1] * t[2] - d[2] * t[1], d[2] * t[0] - d[0] * t[2], d[0] * t[1] - d[1] * t[0]]; const ul = Math.hypot(u[0], u[1], u[2]) || 1e-6; u = u.map((q) => q / ul); if (u[1] < 0) u = u.map((q) => -q);
  const cn = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const ring = (P) => cn.map(([a, b]) => [P[0] + t[0] * a * w / 2 + u[0] * b * h / 2, P[1] + t[1] * a * w / 2 + u[1] * b * h / 2, P[2] + t[2] * a * w / 2 + u[2] * b * h / 2]);
  const rA = ring(A), rE = ring(E), mid = [(A[0] + E[0]) / 2, (A[1] + E[1]) / 2, (A[2] + E[2]) / 2];
  const quad = (q) => {
    const nrm = [(q[1][1] - q[0][1]) * (q[3][2] - q[0][2]) - (q[1][2] - q[0][2]) * (q[3][1] - q[0][1]), (q[1][2] - q[0][2]) * (q[3][0] - q[0][0]) - (q[1][0] - q[0][0]) * (q[3][2] - q[0][2]), (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0])];
    const c = [(q[0][0] + q[2][0]) / 2, (q[0][1] + q[2][1]) / 2, (q[0][2] + q[2][2]) / 2];
    let nl = Math.hypot(nrm[0], nrm[1], nrm[2]) || 1, n = nrm.map((v) => v / nl);
    if (n[0] * (c[0] - mid[0]) + n[1] * (c[1] - mid[1]) + n[2] * (c[2] - mid[2]) < 0) n = n.map((v) => -v);
    const ids = q.map((p) => B.vert(p[0], p[1], p[2], n[0], n[1], n[2], 0, 0));
    orient(B, ids[0], ids[1], ids[2], n[0], n[1], n[2]); orient(B, ids[0], ids[2], ids[3], n[0], n[1], n[2]);
  };
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad([rA[i], rA[j], rE[j], rE[i]]); }
  quad([rA[0], rA[1], rA[2], rA[3]]); quad([rE[0], rE[1], rE[2], rE[3]]);
}
/** an axis-aligned (in the bank frame) box: centre (x, z) from the bank point + o along n + w along t, y0..y1, half sizes ho (along n) and hw (along t) */
function bbox(B, p, o, w, y0, y1, ho, hw) {
  const cx = p.x + p.nx * o + p.tx * w, cz = p.z + p.nz * o + p.tz * w;
  prism(B, [cx, y0, cz], [cx, y1, cz], p.tx, p.tz, 2 * hw, 2 * ho);      // vertical prism: the h axis is perpendicular to the axis and the tangent, i.e. horizontal along n (u flips up only for a non-vertical axis)
}
export function steelFlight(B, p, run, yLip) {
  const Y = (o) => yLip * (1 - o / run), o0 = 0.4, o1 = run - 0.15, HW = 0.56;
  const P3 = (o, w, dy) => [p.x + p.nx * o + p.tx * w, Y(o) + dy, p.z + p.nz * o + p.tz * w];
  for (const sg of [-1, 1]) {
    prism(B, P3(o0, sg * HW, 0.1), P3(o1, sg * HW, 0.1), p.tx, p.tz, 0.07, 0.22);                    // the two stringers lie on the slab
    for (const rail of [1.0, 0.5]) prism(B, P3(o0, sg * (HW + 0.04), rail), P3(o1, sg * (HW + 0.04), rail), p.tx, p.tz, 0.05, 0.05);      // top and mid handrail
    for (let o = o0; o <= o1 + 1e-6; o += (o1 - o0) / 4) {                                                // the posts
      const q = P3(o, sg * (HW + 0.04), 0.0);
      prism(B, [q[0], q[1] + 0.05, q[2]], [q[0], q[1] + 1.03, q[2]], p.tx, p.tz, 0.05, 0.05);
    }
  }
  const n = Math.floor((o1 - o0) / 0.34);
  for (let i = 0; i <= n; i++) { const o = o0 + 0.14 + i * 0.34; if (o > o1) break; bbox(B, p, o, 0, Y(o) + 0.17, Y(o) + 0.21, 0.14, HW + 0.02); }      // the treads
}
/** concrete slab texture: one 4 x 4 m panel (u along the bank, v along the slope) */
export function concreteTexture(ctx) {
  return ctx.tex.draw(512, 512, (g, w, h) => {
    const r = ctx.rng('quay-concrete-tex');
    g.fillStyle = '#b9bab4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const t = r(); g.fillStyle = t < 0.5 ? 'rgba(140,142,136,' + (0.05 + r() * 0.1) + ')' : 'rgba(228,229,222,' + (0.06 + r() * 0.1) + ')'; g.fillRect(r() * w, r() * h, 6 + r() * 30, 4 + r() * 22); }
    for (let i = 0; i < 26; i++) { const x = r() * w, len = 40 + r() * 160, gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(120,96,70,' + (0.10 + r() * 0.12) + ')'); gr.addColorStop(1, 'rgba(120,96,70,0)'); g.fillStyle = gr; g.fillRect(x, r() * h * 0.6, 2 + r() * 5, len); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(96,110,76,' + (0.10 + r() * 0.16) + ')'; g.fillRect(r() * w, r() * h, 3 + r() * 12, 2 + r() * 7); }                // algae / moss flecks
    g.strokeStyle = 'rgba(46,48,46,0.70)'; g.lineWidth = 5; g.strokeRect(0, 0, w, h);                                                                                       // the joints on the panel edges
    g.strokeStyle = 'rgba(70,72,70,0.30)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.5, 0); g.lineTo(w * 0.5, h); g.moveTo(0, h * 0.5); g.lineTo(w, h * 0.5); g.stroke();      // a hairline cast joint
  }, { key: 'env-quay-concrete-1', repeat: [1, 1], anisotropy: 4 });
}
function latheMB(B, rings, seg) {
  let prev = null;
  for (let k = 0; k < rings.length; k++) {
    const [r, y] = rings[k], row = [];
    const dr = k + 1 < rings.length ? rings[k + 1][0] - r : r - rings[k - 1][0], dy = k + 1 < rings.length ? rings[k + 1][1] - y : y - rings[k - 1][1], nl = Math.hypot(dr, dy) || 1;
    for (let s = 0; s < seg; s++) { const a = s / seg * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a); row.push(B.vert(c * r, y, sn * r, c * dy / nl, -dr / nl, sn * dy / nl)); }
    if (prev) for (let s = 0; s < seg; s++) { const s1 = (s + 1) % seg; B.quad(prev[s], prev[s1], row[s1], row[s]); }
    prev = row;
  }
  const [r, y] = rings[rings.length - 1], tp = []; for (let s = 0; s < seg; s++) { const a = s / seg * Math.PI * 2; tp.push(B.vert(Math.cos(a) * r, y, Math.sin(a) * r, 0, 1, 0)); }
  for (let s = 1; s + 1 < seg; s++) B.tri(tp[0], tp[s + 1], tp[s]);
}
export function chainPostGeometry() {
  const B = new MeshBuilder();
  latheMB(B, [[0.20, -0.03], [0.19, 0.06], [0.14, 0.16], [0.11, 0.30], [0.115, 0.52], [0.15, 0.58], [0.115, 0.64], [0.10, 0.80], [0.145, 0.86], [0.10, 0.92], [0.05, 0.97]], 8);
  return B.build();
}
export function mushroomGeometry() {
  const B = new MeshBuilder();
  // (review-water-3 2026-10-09) the slab top was 6 cm: landmarksMarineFacade's berth strip (y 0.052, polygonOffset -4) covered it, only two outline edges showed round the bollard (shots review-water3/b_1); the slab is
  // 9 cm now and the ring / mushroom stand 3 cm higher on it
  latheMB(B, [[0.30, 0.03], [0.30, 0.105], [0.26, 0.112]], 10);                                          // the black base ring
  const ringEnd = B.n;
  latheMB(B, [[0.19, 0.10], [0.19, 0.33], [0.30, 0.40], [0.46, 0.46], [0.55, 0.51], [0.55, 0.58]], 10);   // the yellow mushroom
  const slab = B.n;
  // the pale concrete slab under the bollard, 1.6 m along the quay (the local x axis) x 1.0 m across, 9 cm high
  const hx = 0.8, hz = 0.5, y0 = -0.005, y1 = 0.09, v = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  const top = v.map(([x, z]) => B.vert(x, y1, z, 0, 1, 0)); B.quad(top[0], top[3], top[2], top[1]);
  for (let i = 0; i < 4; i++) { const a = v[i], b = v[(i + 1) % 4], nx = (b[1] - a[1]), nz = -(b[0] - a[0]), nl = Math.hypot(nx, nz) || 1; const q = [B.vert(a[0], y0, a[1], nx / nl, 0, nz / nl), B.vert(b[0], y0, b[1], nx / nl, 0, nz / nl), B.vert(b[0], y1, b[1], nx / nl, 0, nz / nl), B.vert(a[0], y1, a[1], nx / nl, 0, nz / nl)]; orient(B, q[0], q[1], q[2], nx / nl, 0, nz / nl); orient(B, q[0], q[2], q[3], nx / nl, 0, nz / nl); }
  const g = B.build(), n = g.attributes.position.count, col = new Float32Array(n * 3);
  const C = (h) => new THREE.Color(h);
  const black = C('#222427'), yellow = C('#d9b21c'), pale = C('#bdbbb3');
  for (let i = 0; i < n; i++) { const c = i >= slab ? pale : i < ringEnd ? black : yellow; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}
