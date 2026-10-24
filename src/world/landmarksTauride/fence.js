// landmarksTauride/fence.js - THE FENCE AND THE GATES OF THE TAURIDE GARDEN (docs/TAURIDE-REMAKE.md, phase T6): the cast-iron fence of 190 cm on the 14 mapped fence ways (data/furniture.js FENCES, 897 panels of <= 2.7 m),
// its granite piers, the 13 openings left open (FENCE_OPENINGS: the gates and the path crossings), the 4 unfenced stretches left open (FENCE_GAPS: real), the stone gates of 1822 at the 11 gate nodes (GATES) with the iron
// leaves standing open, and the green wire-mesh fence of the football pitch (w81524430, 3.5 m, its 5 gates).
//   planFence(inputs)   PURE and DETERMINISTIC: { panels, piers, gates, pitch, dropped, stats }. The layout is the old garden.js one (every segment of a way is cut into ceil(len / 2.7) equal panels, so the openings of the
//                       data coincide with panel centres to the millimetre; a panel is open when its centre lies on the segment between the first and the last open centre of an opening of its fence).
//   buildFence(ctx, parent, plan)   the meshes (3 draws: the panels, the piers, one static mesh with the gates, the leaves and the pitch fence), the colliders (a box per closed panel, per pier, per gate pier; `fence = true`
//                       so that the pedestrians read a wall), the published numbers.
// THE BASE: the fence stands on the STREET side, y = max(0, gardenHeight): the relief is zero within 8 m of the outline and the floor lies at -0.2 .. -0.45 where the lake and the west pond touch the outline (the quay,
// T4a); the plinth reaches `skirt` m under the base so that its foot meets the floor there. Where the fence coincides with the water (the lake's north shore, 58 m + the stretch along the west pond) an item that would
// stand on the water's edge moves outward (to the street) until it is clear of it; the stub w112853216 (1.7 m into the water) is not built.
// THE MATERIAL: one toon material with vertex colours and an atlas map (alphaTest): the plinth, the piers and the posts sample the opaque band of the atlas, the pickets (spears, two rails, bulbs) and the diamond mesh
// the alpha-cut bands (the strip's picket pattern of landmarksE / landmarksF, here in one texture so that the whole fence is three draws).
import * as THREE from 'three';
import { registerLOD } from '../../core/spatial.js';
import { gardenHeight, GARDEN_SHORE } from './height.js';
import { FENCES, FENCE_OPENINGS, GATES } from './data/furniture.js';
import { FENCE, GATE, PITCH_FENCE } from './data/furniture-design.js';

// ---------------------------------------------------------------------------------------------------------------- a tiny flat-shaded geometry builder (vertex colours, explicit uv)
export const SOLID = Object.freeze([0.5, 0.05]);                       // a uv inside the opaque band of the atlas
const hexC = new Map();
const rgb = (hex) => { let c = hexC.get(hex); if (!c) { const t = new THREE.Color(hex); c = [t.r, t.g, t.b]; hexC.set(hex, c); } return c; };
/** quads, boxes, prisms and pyramids with outward flat normals, an optional placement (x, y, z, yaw) applied to everything added; build() -> BufferGeometry (position, normal, color, uv, index) */
export class GB {
  constructor() { this.P = []; this.N = []; this.C = []; this.U = []; this.I = []; this.n = 0; this.tris = 0; this.m = null; }
  /** apply (x, y, z, yaw about +y, scale) to everything added from now on; at() with no argument resets */
  at(x, y, z, yaw = 0, s = 1) { if (x === undefined) { this.m = null; return this; } const c = Math.cos(yaw) * s, si = Math.sin(yaw) * s; this.m = { x, y, z, c, s: si, k: s }; return this; }
  _p(v) { const m = this.m; if (!m) return v; return [m.c * v[0] + m.s * v[2] + m.x, m.k * v[1] + m.y, -m.s * v[0] + m.c * v[2] + m.z]; }
  _d(v) { const m = this.m; if (!m) return v; return [m.c * v[0] + m.s * v[2], v[1], -m.s * v[0] + m.c * v[2]]; }
  /** a quad a b c d, counter-clockwise seen from the side it faces; uv = [[u,v] x4] or a single [u,v] (all four corners) */
  quad(a, b, c, d, col, uv = SOLID) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const n = this._d([nx, ny, nz]), cc = typeof col === 'string' ? rgb(col) : col, base = this.n, U = Array.isArray(uv[0]) ? uv : [uv, uv, uv, uv];
    [a, b, c, d].forEach((v, i) => { const p = this._p(v); this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.C.push(cc[0], cc[1], cc[2]); this.U.push(U[i][0], U[i][1]); });
    this.I.push(base, base + 1, base + 2, base, base + 2, base + 3); this.n += 4; this.tris += 2;
    return this;
  }
  /** an axis-aligned box; skip = letters of the faces to leave out: b (bottom), t (top), l (-x), r (+x), f (+z), k (-z) */
  box(x0, x1, y0, y1, z0, z1, col, skip = '') {
    if (!skip.includes('f')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col);
    if (!skip.includes('k')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], col);
    if (!skip.includes('l')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], col);
    if (!skip.includes('r')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], col);
    if (!skip.includes('t')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], col);
    if (!skip.includes('b')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
    return this;
  }
  /** a frustum / prism between (cx, y0, cz) radius r0 and (cx, y1, cz) radius r1 with `seg` sides (caps optional) */
  cyl(cx, cz, y0, y1, r0, r1, seg, col, caps = false, rot = 0) {
    for (let i = 0; i < seg; i++) {
      const a0 = rot + i / seg * Math.PI * 2, a1 = rot + (i + 1) / seg * Math.PI * 2, s0 = Math.sin(a0), c0 = Math.cos(a0), s1 = Math.sin(a1), c1 = Math.cos(a1);
      this.quad([cx + s0 * r0, y0, cz + c0 * r0], [cx + s1 * r0, y0, cz + c1 * r0], [cx + s1 * r1, y1, cz + c1 * r1], [cx + s0 * r1, y1, cz + c0 * r1], col);
      if (caps && r1 > 1e-4) this.tri([cx, y1, cz], [cx + s0 * r1, y1, cz + c0 * r1], [cx + s1 * r1, y1, cz + c1 * r1], col, true);
      if (caps && r0 > 1e-4) this.tri([cx, y0, cz], [cx + s1 * r0, y0, cz + c1 * r0], [cx + s0 * r0, y0, cz + c0 * r0], col, true);
    }
    return this;
  }
  /** a triangle (the caps of a prism); `up` is only a hint, the normal comes from the winding */
  tri(a, b, c, col, _up) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; const l = Math.hypot(nx, ny, nz) || 1;
    const n = this._d([nx / l, ny / l, nz / l]), cc = typeof col === 'string' ? rgb(col) : col, base = this.n;
    for (const v of [a, b, c]) { const p = this._p(v); this.P.push(p[0], p[1], p[2]); this.N.push(n[0], n[1], n[2]); this.C.push(cc[0], cc[1], cc[2]); this.U.push(SOLID[0], SOLID[1]); }
    this.I.push(base, base + 1, base + 2); this.n += 3; this.tris += 1;
    return this;
  }
  /** a square pyramid with the base x0..x1, z0..z1 at y0 and the apex (ax, y1, az) */
  pyramid(x0, x1, z0, z1, y0, y1, col, ax = (x0 + x1) / 2, az = (z0 + z1) / 2) {
    const A = [ax, y1, az];
    this.tri([x0, y0, z1], [x1, y0, z1], A, col); this.tri([x1, y0, z0], [x0, y0, z0], A, col); this.tri([x0, y0, z0], [x0, y0, z1], A, col); this.tri([x1, y0, z1], [x1, y0, z0], A, col);
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.C, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.U, 2));
    g.setIndex(this.n > 65535 ? new THREE.Uint32BufferAttribute(this.I, 1) : new THREE.Uint16BufferAttribute(this.I, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// ---------------------------------------------------------------------------------------------------------------- the atlas bands
/** v ranges of the atlas (the image is 512 x 512; v = 0 is the bottom): A opaque, B the pickets, C the diamond mesh */
export const ATLAS = Object.freeze({ A: [0.0, 0.1], B: [0.12, 0.54], C: [0.56, 1.0], size: 512 });
const PICKET_UV = [[0, ATLAS.B[0]], [1, ATLAS.B[0]], [1, ATLAS.B[1]], [0, ATLAS.B[1]]];
const MESH_UV = [[0, ATLAS.C[0]], [1, ATLAS.C[0]], [1, ATLAS.C[1]], [0, ATLAS.C[1]]];
const lerpPt = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** the atlas texture (white pixels, the colour comes from the vertices) */
export function fenceAtlas(ctx) {
  const S = ATLAS.size, yOf = (v) => (1 - v) * S;
  return ctx.tex.draw(S, S, (g) => {
    g.clearRect(0, 0, S, S);
    g.fillStyle = '#ffffff';
    g.fillRect(0, yOf(ATLAS.A[1]), S, yOf(ATLAS.A[0]) - yOf(ATLAS.A[1]));                              // A: opaque
    // B: the pickets of one panel (2.7 x 1.68 m): 9 bars with spear tips, two rails, a bulb under the top rail on every bar, a ring between the rails on every third bar
    { const y0 = yOf(ATLAS.B[1]), h = yOf(ATLAS.B[0]) - y0, X = (i) => (i + 0.5) * S / 9, ry = (frac) => y0 + h * frac;
      g.fillRect(0, ry(0.1), S, 9); g.fillRect(0, ry(0.8), S, 9);                                            // the rails (world 1.72 and 0.55)
      for (let i = 0; i < 9; i++) {
        const x = X(i); g.fillRect(x - 4, ry(0.02), 8, h * 0.98);                                           // the bar
        g.beginPath(); g.moveTo(x - 9, ry(0.1)); g.lineTo(x, ry(0.0)); g.lineTo(x + 9, ry(0.1)); g.closePath(); g.fill();   // the spear
        g.beginPath(); g.arc(x, ry(0.23), 8, 0, Math.PI * 2); g.fill();                                      // the bulb
        if (i % 3 === 1) { g.lineWidth = 6; g.strokeStyle = '#ffffff'; g.beginPath(); g.arc(x, ry(0.52), 17, 0, Math.PI * 2); g.stroke(); }
      } }
    // C: the diamond mesh of the pitch fence (wire 3 px, 28 x 28 px cells), a frame
    { const y0 = yOf(ATLAS.C[1]), h = yOf(ATLAS.C[0]) - y0;
      g.strokeStyle = '#ffffff'; g.lineWidth = 3;
      g.beginPath();
      for (let k = -h; k < S + h; k += 28) { g.moveTo(k, y0); g.lineTo(k + h * 2, y0 + h); g.moveTo(k + h * 2, y0); g.lineTo(k, y0 + h); }
      g.stroke(); g.fillRect(0, y0, S, 4); g.fillRect(0, y0 + h - 4, S, 4); }
  }, { key: 'tauride-fence-atlas', repeat: [1, 1] });
}

// ---------------------------------------------------------------------------------------------------------------- the plan (pure)
const dist2 = (x, z, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - ax - t * dx, z - az - t * dz); };
const turnDeg = (ux, uz, vx, vz) => Math.acos(Math.max(-1, Math.min(1, (ux * vx + uz * vz) / ((Math.hypot(ux, uz) * Math.hypot(vx, vz)) || 1)))) * 180 / Math.PI;

/**
 * planFence(o): o = { gh, shore, design (FENCE), gate (GATE), pitch (PITCH_FENCE), fences, openings, gates } -> {
 *   panels:  [{ fence, i, seg, x, z, y, yaw, len, ax, az, bx, bz, pitch, open, drop }]     every panel of the layout (open and dropped ones included), yaw = atan2(dx, dz) (the collider's rotY)
 *   piers:   [{ fence, b, x, z, y, yaw, kind: 'pier' | 'post' }]                          the ordinary piers (iron fence) and the posts of the pitch fence
 *   gates:   [{ id, kind: 'gate' | 'plain' | 'post', fence, x, z, yaw, width, gatePiers: [{ x, z, y, yaw }], leaves: [...], lantern: [{ x, y, z, rotY }] | null, opening }]
 *   openings: [{ fence, open: [panel indices], width, gates: [ids] }],  dropped: [{ fence, i, why }],  stats }
 */
export function planFence(o = {}) {
  const D = o.design || FENCE, GD = o.gate || GATE, PD = o.pitch || PITCH_FENCE;
  const gh = o.gh || gardenHeight, shore = o.shore || GARDEN_SHORE;
  const fences = o.fences || FENCES, openings = o.openings || FENCE_OPENINGS, gates = o.gates || GATES;
  const baseY = (x, z) => Math.max(0, gh(x, z) ?? 0);
  const panels = [], piers = [], gateOut = [], dropped = [], openOut = [], stats = { fences: {}, panels: 0, closed: 0, open: 0, dropped: 0, piers: 0, shifted: 0 };
  // the outward direction of the garden at (x, z) for a tangent (tx, tz): the side whose point 0.6 m away is outside the garden (null if both are inside / outside)
  const outward = (x, z, tx, tz) => { const nx = -tz, nz = tx; const a = shore.inGarden(x + nx * 0.6, z + nz * 0.6), b = shore.inGarden(x - nx * 0.6, z - nz * 0.6); return a === b ? null : a ? [-nx, -nz] : [nx, nz]; };
  /** the shift (m, outward) of an item of half width `half` standing at (x, z) on a tangent: the water's edge pushes it to the street side */
  const quay = (x, z, tx, tz, half) => {
    const d = shore.dist(x, z); if (d >= half + 0.03) return [0, 0];
    const out = outward(x, z, tx, tz); if (!out) return [0, 0];
    const s = half + 0.03 - d; return [out[0] * s, out[1] * s];
  };
  for (const f of fences) {
    const pitch = f.id === PD.id, pts = f.pts, mine = [];
    for (let s = 0; s + 3 < pts.length; s += 2) {
      const ax = pts[s], az = pts[s + 1], bx = pts[s + 2], bz = pts[s + 3], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
      if (len < 0.2) continue;
      const n = Math.ceil(len / D.panelM);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, p0 = lerpPt([ax, az], [bx, bz], t0), p1 = lerpPt([ax, az], [bx, bz], t1), cx = (p0[0] + p1[0]) / 2, cz = (p0[1] + p1[1]) / 2, l = len / n;
        mine.push({ fence: f.id, i: mine.length, seg: s / 2, x: cx, z: cz, y: 0, yaw: Math.atan2(dx, dz), len: l, ax: p0[0], az: p0[1], bx: p1[0], bz: p1[1], pitch, open: false, drop: null, tx: dx / len, tz: dz / len, cx, cz });
      }
    }
    // the openings of this fence: the panels whose centre lies on the segment between the first and the last open centre
    const my = openings.filter((q) => q.fence === f.id);
    for (const q of my) {
      const hit = mine.filter((p) => dist2(p.cx, p.cz, q.x, q.z, q.x2, q.z2) <= D.openTol);
      for (const p of hit) p.open = true;
      openOut.push({ fence: f.id, open: hit.map((p) => p.i), width: q.widthM, panels: q.panels, gates: q.gates.slice(), kind: q.kind, matched: hit.length });
    }
    // the base and the quay: the panel stands on the street side where its centre or an end is on the water's edge
    for (const p of mine) {
      const sh = quay(p.cx, p.cz, p.tx, p.tz, D.plinthW / 2), sa = quay(p.ax, p.az, p.tx, p.tz, D.plinthW / 2), sb = quay(p.bx, p.bz, p.tx, p.tz, D.plinthW / 2);
      const m = Math.max(Math.hypot(...sh), Math.hypot(...sa), Math.hypot(...sb));
      if (m > 0) { const ox = sh[0] || sa[0] || sb[0], oz = sh[1] || sa[1] || sb[1], k = m / (Math.hypot(ox, oz) || 1); p.x = p.cx + ox * k; p.z = p.cz + oz * k; p.ax += ox * k; p.az += oz * k; p.bx += ox * k; p.bz += oz * k; p.shift = m; stats.shifted++; } else { p.x = p.cx; p.z = p.cz; p.shift = 0; }
      p.y = Math.max(baseY(p.x, p.z), baseY(p.ax, p.az), baseY(p.bx, p.bz));
      // in the water: the plinth footprint (centre, both ends, both edges) must be dry
      const wet = [[p.x, p.z], [p.ax, p.az], [p.bx, p.bz]].some(([x, z]) => shore.dist(x, z) < 0);
      if (wet) { p.drop = 'water'; dropped.push({ fence: f.id, i: p.i, why: 'water', x: p.x, z: p.z }); stats.dropped++; }
      else if (p.open) stats.open++; else stats.closed++;
    }
    stats.fences[f.id] = mine.length; stats.panels += mine.length;
    for (const p of mine) panels.push(p);
    // ---- the piers: the boundaries between panels
    const N = mine.length; if (!N) continue;
    const ring = Math.hypot(pts[0] - pts[pts.length - 2], pts[1] - pts[pts.length - 1]) < 0.05;
    const state = (p) => (p.drop ? 'd' : p.open ? 'o' : 'c');
    const chosen = new Set();
    if (pitch) for (let b = 0; b <= N; b++) chosen.add(b);                                              // the wire-mesh fence: a post at every panel boundary
    else {
      const forced = new Set([0]); if (!ring) forced.add(N);
      for (let b = 1; b < N; b++) { const a = mine[b - 1], c = mine[b]; if (state(a) !== state(c) || turnDeg(a.tx, a.tz, c.tx, c.tz) > D.pier.turn) forced.add(b); }
      const fl = [...forced].sort((u, v) => u - v); for (const b of fl) chosen.add(b);
      for (let q = 0; q + 1 < fl.length; q++) {                                                          // a closed run longer than pier.max panels gets piers at equal spacing (3 .. 5 panels)
        const jA = fl[q], jB = fl[q + 1], m = jB - jA; if (state(mine[jA]) !== 'c' || m <= D.pier.max) continue;
        const chunks = Math.ceil(m / D.pier.max); for (let c = 1; c < chunks; c++) chosen.add(jA + Math.round(m * c / chunks));
      }
    }
    for (const b of [...chosen].sort((u, v) => u - v)) {
      if (ring && b === N) continue;                                                                      // the closing boundary of a ring is boundary 0
      const a = b > 0 ? mine[b - 1] : ring ? mine[N - 1] : null, c = b < N ? mine[b] : null;
      const sa = a ? state(a) : 'x', sc = c ? state(c) : 'x';
      if (sa !== 'c' && sc !== 'c') continue;                                                            // an opening's or a dropped panel's far side: no pier without a closed panel next to it
      const tx0 = a && c ? a.tx + c.tx : (c || a).tx, tz0 = a && c ? a.tz + c.tz : (c || a).tz, tl = Math.hypot(tx0, tz0) || 1;
      const x = c ? c.ax : a.bx, z = c ? c.az : a.bz;                                                      // the join: the start of panel b, or the end of panel b-1
      piers.push({ fence: f.id, b, x, z, y: 0, yaw: Math.atan2(tx0 / tl, tz0 / tl), kind: pitch ? 'post' : 'pier', tx: tx0 / tl, tz: tz0 / tl });
    }
  }
  // ---- the piers' bases and the quay: a pier on the water's edge moves outward
  for (const q of piers) {
    const half = (q.kind === 'post' ? PD.post : D.pier.cap) / 2, sh = quay(q.x, q.z, q.tx, q.tz, half);
    if (sh[0] || sh[1]) { q.x += sh[0]; q.z += sh[1]; }
    q.y = baseY(q.x, q.z);
  }
  // ---- the gates: each gate node belongs to the opening(s) that list it; the two piers stand on the joins at the ends of the opening, the inner face on the join
  const gateInfo = new Map();
  for (const op of openOut) for (const id of op.gates) { const e = gateInfo.get(id) || { id, openings: [] }; e.openings.push(op); gateInfo.set(id, e); }
  const byFence = new Map(); for (const p of panels) { let a = byFence.get(p.fence); if (!a) byFence.set(p.fence, (a = [])); a.push(p); }
  for (const g of gates) {
    const info = gateInfo.get(g.id); if (!info) continue;
    const plainGate = GD.plain.includes(g.id), lanternGate = GD.lantern.includes(g.id), pitchGate = PD.gates.includes(g.id);
    for (const op of info.openings) {
      if (!op.open.length) continue;
      const mine = byFence.get(op.fence), i0 = Math.min(...op.open), i1 = Math.max(...op.open);
      const pa = mine[i0], pb = mine[i1], first = [pa.ax, pa.az], last = [pb.bx, pb.bz];
      const cx = (first[0] + last[0]) / 2, cz = (first[1] + last[1]) / 2, ux = last[0] - first[0], uz = last[1] - first[1], ul = Math.hypot(ux, uz) || 1, tx = ux / ul, tz = uz / ul;
      const yaw = Math.atan2(tx, tz), kind = pitchGate ? 'post' : plainGate ? 'plain' : 'gate', w = GD.w;
      const gp = pitchGate ? [] : [-1, 1].map((sgn) => { const j = sgn < 0 ? first : last; let x = j[0] + sgn * tx * w / 2, z = j[1] + sgn * tz * w / 2; const sh = quay(x, z, tx, tz, w / 2 * 1.2); x += sh[0]; z += sh[1]; return { x, z, y: baseY(x, z), yaw, side: sgn }; });
      const out = outward(cx, cz, tx, tz), inw = out ? [-out[0], -out[1]] : [-tz, tx];                       // the garden side: the leaves fold into it
      const gate = { id: g.id, kind, fence: op.fence, opening: op, x: cx, z: cz, yaw, width: ul, tx, tz, inward: inw, gatePiers: gp, leaves: [], lantern: null, node: [g.x, g.z], pitch: pitchGate };
      if (kind === 'gate') gate.leaves = gp.map((p) => ({ side: p.side, hx: p.x - p.side * tx * (w / 2 + GD.leafInset), hz: p.z - p.side * tz * (w / 2 + GD.leafInset) }));
      if (lanternGate && kind === 'gate') gate.lantern = gp.map((p) => ({ x: p.x, y: p.y + GD.h + GD.capH * 0.55, gy: p.y, z: p.z, rotY: yaw, gate: g.id }));
      gateOut.push(gate);
    }
  }
  // the ordinary piers on the ends of a gate opening are replaced by the gate piers (a gate pier is bigger and stands on the join with its inner face): remove the ordinary piers on those boundaries
  const gateBoundary = new Set();
  for (const gt of gateOut) if (gt.gatePiers.length) { const mine = byFence.get(gt.fence), idx = gt.opening.open, i0 = Math.min(...idx), i1 = Math.max(...idx); gateBoundary.add(gt.fence + ':' + i0); gateBoundary.add(gt.fence + ':' + (i1 + 1)); }
  const keep = piers.filter((p) => !gateBoundary.has(p.fence + ':' + p.b));
  piers.length = 0; piers.push(...keep);
  stats.piers = piers.length; stats.gates = gateOut.length; stats.gateNodes = gates.length;
  return { panels, piers, gates: gateOut, openings: openOut, dropped, stats, design: D };
}

// ---------------------------------------------------------------------------------------------------------------- templates
/** the panel template (local frame: along z centred, thickness along x, y up from the base): a granite plinth (top and two sides, 0.3 m wide, from -skirt to plinthH) and the pickets quad */
export function panelGeometry(D = FENCE) {
  const b = new GB(), L = D.panelM / 2, hw = D.plinthW / 2;
  b.quad([-hw, -D.skirt, L], [-hw, D.plinthH, L], [-hw, D.plinthH, -L], [-hw, -D.skirt, -L], D.granite);                    // -x side
  b.quad([hw, -D.skirt, -L], [hw, D.plinthH, -L], [hw, D.plinthH, L], [hw, -D.skirt, L], D.granite);                       // +x side
  b.quad([-hw, D.plinthH, L], [hw, D.plinthH, L], [hw, D.plinthH, -L], [-hw, D.plinthH, -L], D.graniteL);                   // top
  b.quad([0, D.plinthH, L], [0, D.plinthH, -L], [0, D.h, -L], [0, D.h, L], D.iron, [[1, ATLAS.B[0]], [0, ATLAS.B[0]], [0, ATLAS.B[1]], [1, ATLAS.B[1]]]);   // the pickets, facing +x (u runs against z: -L is u = 0 seen from +x)
  return b.build();
}
/** the pier template (local frame: centred on x, z; y up from the base): a square base block, the shaft, a cornice, the capstone and a pyramid; ~34 triangles */
export function pierGeometry(D = FENCE) {
  const b = new GB(), w = D.pier.w / 2, c = D.pier.cap / 2, h = D.pier.h, ch = D.pier.capH;
  b.box(-w - 0.06, w + 0.06, -D.skirt, 0.55, -w - 0.06, w + 0.06, D.granite, 'b');
  b.box(-w + 0.03, w - 0.03, 0.55, h - 0.1, -w + 0.03, w - 0.03, D.stone, 'b');
  b.box(-c, c, h - 0.1, h - 0.1 + ch * 0.5, -c, c, D.graniteL, 'b');
  b.pyramid(-c + 0.04, c - 0.04, -c + 0.04, c - 0.04, h - 0.1 + ch * 0.5, h + ch + 0.22, D.granite);
  return b.build();
}

// ---------------------------------------------------------------------------------------------------------------- the build
/** a merged copy of several geometries (same attributes) */
export function mergeGeos(list) {
  let nv = 0, ni = 0; for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), C = new Float32Array(nv * 3), U = new Float32Array(nv * 2), I = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) { P.set(g.attributes.position.array, vo * 3); N.set(g.attributes.normal.array, vo * 3); C.set(g.attributes.color.array, vo * 3); U.set(g.attributes.uv.array, vo * 2); for (let k = 0; k < g.index.count; k++) I[io + k] = g.index.array[k] + vo; vo += g.attributes.position.count; io += g.index.count; }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(P, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  m.setIndex(new THREE.BufferAttribute(I, 1)); m.computeBoundingSphere(); m.computeBoundingBox();
  return m;
}

/** the static mesh of the gates (stone piers with cornice and capstone), the open leaves and the whole pitch fence (posts, rails, the diamond mesh panels), baked in world coordinates */
export function gatesGeometry(plan, D = FENCE, GD = GATE, PD = PITCH_FENCE) {
  const b = new GB(), baseOf = (x, z, g) => (g.gatePiers.length ? Math.max(0, (g.gatePiers[0].y + g.gatePiers[1].y) / 2) : 0);
  for (const g of plan.gates) {
    for (const p of g.gatePiers) {
      b.at(p.x, p.y, p.z, p.yaw);
      const w = GD.w / 2, c = GD.corniceW / 2;
      b.box(-w - 0.08, w + 0.08, -D.skirt, 0.7, -w - 0.08, w + 0.08, D.granite, 'b');
      b.box(-w, w, 0.7, GD.h - GD.corniceH, -w, w, D.stone, 'b');
      b.box(-c, c, GD.h - GD.corniceH, GD.h, -c, c, D.graniteL, 'b');
      b.box(-w * 0.8, w * 0.8, GD.h, GD.h + GD.capH * 0.55, -w * 0.8, w * 0.8, D.stone, 'b');
      if (!g.lantern) b.pyramid(-w * 0.8, w * 0.8, -w * 0.8, w * 0.8, GD.h + GD.capH * 0.55, GD.h + GD.capH * 1.4, D.granite);
      b.at();
    }
    // the open leaves: from the hinge on the pier's inner face, 2.2 m into the garden, turned 90 degrees to the fence; the pickets with their two rails (one quad per leaf, double sided)
    for (const l of g.leaves) {
      const ex = l.hx + g.inward[0] * GD.leafLen, ez = l.hz + g.inward[1] * GD.leafLen, y0 = baseOf(l.hx, l.hz, g);
      b.quad([l.hx, y0 + 0.2, l.hz], [ex, y0 + 0.2, ez], [ex, y0 + GD.leafH, ez], [l.hx, y0 + GD.leafH, l.hz], D.iron, PICKET_UV);
    }
  }
  // the pitch fence: the diamond mesh between the posts, a top rail, posts every panel boundary that is a pier of the plan
  for (const p of plan.panels) {
    if (!p.pitch || p.drop || p.open) continue;
    const y = p.y, H = PD.h, ax = p.ax, az = p.az, bx = p.bx, bz = p.bz;
    b.quad([ax, y, az], [bx, y, bz], [bx, y + H, bz], [ax, y + H, az], PD.mesh, MESH_UV);
    b.at(p.x, y, p.z, p.yaw); b.box(-PD.rail / 2, PD.rail / 2, H - PD.rail, H, -p.len / 2, p.len / 2, PD.postColor, 'b'); b.at();
  }
  for (const q of plan.piers) if (q.kind === 'post') { b.at(q.x, q.y, q.z, q.yaw); b.box(-PD.post / 2, PD.post / 2, -0.2, PD.h + 0.15, -PD.post / 2, PD.post / 2, PD.postColor, 'b'); b.at(); }
  return b.tris ? b.build() : null;
}

export function buildFence(ctx, parent, plan, opts = {}) {
  const D = plan.design || FENCE, ph = ctx.physics, T = ctx.mat.toon;
  const atlas = fenceAtlas(ctx);
  const matA = T('#ffffff', { map: atlas, vertexColors: true, alphaTest: 0.4, side: 'double', paint: 0.02, name: 'tauride-fence' });
  const matS = T('#ffffff', { vertexColors: true, paint: 0.04, name: 'tauride-fence-stone' });
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
  const far = D.far ?? 650;
  const closed = plan.panels.filter((p) => !p.open && !p.drop && !p.pitch);
  // ---- 1. the panels (instanced)
  const pg = panelGeometry(D), panels = new THREE.InstancedMesh(pg, matA, Math.max(1, closed.length)); panels.name = 'tauride-fence-panels'; panels.castShadow = true; panels.receiveShadow = true;
  closed.forEach((p, i) => { E.set(0, p.yaw, 0); Q.setFromEuler(E); M.compose(V.set(p.x, p.y, p.z), Q, S.set(1, 1, p.len / D.panelM)); panels.setMatrixAt(i, M); });
  panels.count = closed.length; panels.instanceMatrix.needsUpdate = true; panels.frustumCulled = true;
  ctx.noBatch(panels); ctx.noOutline(panels); parent.add(panels); registerLOD(panels, far);
  // ---- 2. the piers (instanced)
  const iron = plan.piers.filter((p) => p.kind === 'pier'), prg = pierGeometry(D), piers = new THREE.InstancedMesh(prg, matS, Math.max(1, iron.length)); piers.name = 'tauride-fence-piers'; piers.castShadow = true; piers.receiveShadow = true;
  iron.forEach((p, i) => { E.set(0, p.yaw, 0); Q.setFromEuler(E); M.compose(V.set(p.x, p.y, p.z), Q, S.set(1, 1, 1)); piers.setMatrixAt(i, M); });
  piers.count = iron.length; piers.instanceMatrix.needsUpdate = true; piers.frustumCulled = true;
  ctx.noBatch(piers); parent.add(piers); registerLOD(piers, far * 0.9);
  // ---- 3. the gates, the leaves and the pitch fence (one static mesh)
  const gg = gatesGeometry(plan, D, GATE, PITCH_FENCE), gates = gg ? new THREE.Mesh(gg, matA) : null;
  if (gates) { gates.name = 'tauride-fence-gates'; gates.castShadow = true; gates.receiveShadow = true; ctx.noBatch(gates); ctx.noOutline(gates); parent.add(gates); registerLOD(gates, far); }
  // ---- colliders: a thin box per closed panel (a wall for the pedestrians), a box per pier, per gate pier and per pitch panel / post; the openings stay open
  const col = D.collider, items = { panels: [], piers: [], gates: [], pitch: [] };
  for (const p of closed) { const y0 = Math.min(0, p.y) + col.y0, it = ph.addBox(p.x, p.z, col.thick, p.len + 0.02, p.yaw, y0, p.y + col.y1); it.fence = true; items.panels.push(it); }
  for (const p of iron) items.piers.push(ph.addBox(p.x, p.z, D.pier.collider, D.pier.collider, p.yaw, Math.min(0, p.y) - 0.5, p.y + D.pier.h));
  for (const g of plan.gates) for (const p of g.gatePiers) items.gates.push(ph.addBox(p.x, p.z, GATE.collider.w, GATE.collider.w, p.yaw, Math.min(0, p.y) - 0.5, p.y + GATE.h));
  for (const p of plan.panels) if (p.pitch && !p.open && !p.drop) { const it = ph.addBox(p.x, p.z, PITCH_FENCE.collider.thick, p.len + 0.02, p.yaw, Math.min(0, p.y) - 0.5, p.y + PITCH_FENCE.collider.y1); it.fence = true; items.pitch.push(it); }
  const triangles = (panels.count * pg.index.count + piers.count * prg.index.count) / 3 + (gg ? gg.index.count / 3 : 0);
  return { meshes: { panels, piers, gates }, triangles, draws: 2 + (gates ? 1 : 0), instances: { panels: panels.count, piers: piers.count }, colliders: items.panels.length + items.piers.length + items.gates.length + items.pitch.length, items,
    template: { panel: pg.index.count / 3, pier: prg.index.count / 3 }, gateTriangles: gg ? gg.index.count / 3 : 0 };
}
