// rail/canopy.js - the white concrete platform canopies of the Moscow station (late-Soviet, photos refs/station/22, 27, 32, 41, 43):
// Y-shaped concrete columns every 12 m on the platform axis (grey foot, red stripe, white shaft), the fork arms carry a cantilever roof whose
// soffit is a faceted pyramid relief, edged by white girders with hexagonal holes; the contact wire brackets hang off the girders.
// Dimensions: deck + 6.2 m soffit, 0.5 m slab, girders 1.1 m, roof half width = platform half width + 1.0 m, columns every 12 m (three 4 m rows).
// Returns the support points of the catenary (per platform track) and the lamp positions.
import { DECK_TOP, RAIL_TOP, platformAt } from './geom.js';
import { RAMP, deckY } from './platform.js';
import { col } from './gb.js';

// canopy length (m from the platform head) per platform ref
const CANOPY_LEN = { '1': 150, '2;3': 190, '4;5': 340, '6;7': 420, '8;9': 340, '10;11': 300 };
export const SOFFIT = 6.2, SLAB = 0.5, GIRDER_H = 1.15, OVERHANG = 1.0;

export function soffitTexture(ctx) {
  return ctx.tex.draw(128, 128, (g, w, h) => {
    const cols = ['#e2e4e6', '#c1c4ca', '#a6aab1', '#d0d3d8'];       // lit, right, shade, left
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      const x0 = i * 64, y0 = j * 64, cx = x0 + 32, cy = y0 + 32;
      const T = [[[x0, y0], [x0 + 64, y0]], [[x0 + 64, y0], [x0 + 64, y0 + 64]], [[x0 + 64, y0 + 64], [x0, y0 + 64]], [[x0, y0 + 64], [x0, y0]]];
      T.forEach((e, k) => { g.fillStyle = cols[k]; g.beginPath(); g.moveTo(cx, cy); g.lineTo(e[0][0], e[0][1]); g.lineTo(e[1][0], e[1][1]); g.closePath(); g.fill(); });
    }
  }, { key: 'rail-soffit', repeat: [1, 1], anisotropy: 4 });
}
export function fasciaTexture(ctx) {
  return ctx.tex.draw(512, 128, (g, w, h) => {
    g.fillStyle = '#ecebe6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d4d3cd'; g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12);
    const hex = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.95); } g.closePath(); g.fill(); };
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#434858'; hex(64 + i * 128, 64, 36);
      g.fillStyle = '#7b8090'; hex(64 + i * 128, 70, 28);
    }
  }, { key: 'rail-fascia', repeat: [1, 1], anisotropy: 4 });
}

/** Build the canopies. G: geometry, bk: Buckets, phys: physics. Returns { supports: {trackNo: [{x,z,zy}]}, zones: {ref: [z0,z1]}, lamps, columns } */
export function buildCanopies(ctx, G, bk, phys) {
  const out = { supports: {}, zones: {}, lamps: [], columns: [], tris: 0 };
  for (const pl of G.platforms) {
    const len = CANOPY_LEN[pl.ref] ?? 300;
    const z0 = pl.zHead + RAMP + 4, z1 = Math.min(pl.zHead + len, pl.zTail - RAMP - 4);
    if (z1 - z0 < 30) continue;
    out.zones[pl.ref] = [z0, z1];
    // rows: every platform row inside the zone (4 m)
    const rows = pl.rows.filter((r) => r.z >= z0 && r.z <= z1);
    if (rows.length < 4) continue;
    const info = rows.map((r) => {
      const c = (r.xl + r.xr) / 2, w = r.xr - r.xl, hw = w / 2 + OVERHANG, y = DECK_TOP, yTop = y + SOFFIT + SLAB;
      return { z: r.z, c, w, hw, xL: c - hw, xR: c + hw, ySoff: y + SOFFIT, yTop };
    });
    const n = info.length;
    const roofBase = bk;
    for (let i = 0; i + 1 < n; i++) {
      const a = info[i], b = info[i + 1], mx = (a.c + b.c) / 2, mz = (a.z + b.z) / 2, dz = b.z - a.z;
      const Q = (key, q, normal, uvs) => {
        const B = roofBase.get(key, mx, mz);
        const ids = q.map((p, k) => B.vert(p[0], p[1], p[2], normal[0], normal[1], normal[2], uvs[k][0], uvs[k][1]));
        // winding from the geometric normal
        const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2], vx = q[3][0] - q[0][0], vy = q[3][1] - q[0][1], vz = q[3][2] - q[0][2];
        const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
        if (gx * normal[0] + gy * normal[1] + gz * normal[2] >= 0) B.quad(ids[0], ids[1], ids[2], ids[3]); else B.quad(ids[0], ids[3], ids[2], ids[1]);
      };
      // soffit (faces down): pyramid texture, 3 m tile
      Q('soffit', [[a.xL, a.ySoff, a.z], [a.xR, a.ySoff, a.z], [b.xR, b.ySoff, b.z], [b.xL, b.ySoff, b.z]], [0, -1, 0],
        [[a.xL / 3, a.z / 3], [a.xR / 3, a.z / 3], [b.xR / 3, b.z / 3], [b.xL / 3, b.z / 3]]);
      // roof top
      Q('roofTop', [[a.xL, a.yTop, a.z], [a.xR, a.yTop, a.z], [b.xR, b.yTop, b.z], [b.xL, b.yTop, b.z]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      // girders along both edges: outer face, inner face, top cap, bottom cap
      for (const s of [-1, 1]) {
        const xa = s < 0 ? a.xL : a.xR, xb = s < 0 ? b.xL : b.xR, th = 0.18;
        const ia = xa - s * th, ib = xb - s * th;
        const y0 = a.ySoff - 0.35, y1 = y0 + GIRDER_H, y0b = b.ySoff - 0.35, y1b = y0b + GIRDER_H;
        const ex = xb - xa, ez = b.z - a.z, L = Math.hypot(ex, ez), nx = -ez / L * s, nz = ex / L * s;       // outward (away from the platform axis)
        const ua = a.z / 5.6, ub = b.z / 5.6;
        Q('fascia', [[xa, y0, a.z], [xb, y0b, b.z], [xb, y1b, b.z], [xa, y1, a.z]], [nx, 0, nz], [[ua, 0], [ub, 0], [ub, 1], [ua, 1]]);
        Q('fascia', [[ia, y0, a.z], [ib, y0b, b.z], [ib, y1b, b.z], [ia, y1, a.z]], [-nx, 0, -nz], [[ua, 0], [ub, 0], [ub, 1], [ua, 1]]);
        Q('roofTop', [[ia, y1, a.z], [xa, y1, a.z], [xb, y1b, b.z], [ib, y1b, b.z]], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      }
    }
    // end plates (the girders' ends and the slab edge), at both ends of the zone
    for (const [r, f] of [[info[0], -1], [info[n - 1], 1]]) {
      const B = bk.get('fasciaPlain', r.c, r.z);
      const y0 = r.ySoff - 0.35, y1 = r.yTop + 0.3;
      const ids = [[r.xL, y0], [r.xR, y0], [r.xR, y1], [r.xL, y1]].map((p) => B.vert(p[0], p[1], r.z, 0, 0, f, 0, 0));
      if (f > 0) B.quad(ids[0], ids[1], ids[2], ids[3]); else B.quad(ids[0], ids[3], ids[2], ids[1]);
    }
    // ---- columns every 12 m (every third row), starting at the second row
    for (let i = 1; i < n - 1; i += 3) {
      const r = info[i], pr = info[i - 1], nx = info[i + 1];
      const dx = nx.c - pr.c, dz = nx.z - pr.z, L = Math.hypot(dx, dz), tx = dx / L, tz = dz / L, ry = Math.atan2(tx, tz);
      const lx = tz, lz = -tx;                                                       // lateral (east) unit vector
      const base = [r.c, DECK_TOP, r.z];
      const Bv = bk.get('vc', r.c, r.z);
      const stemH = 3.35, ya = DECK_TOP;
      const arm = Math.min(r.hw - 0.3, 3.4), yFork = DECK_TOP + stemH, yTip = r.ySoff - 0.02;
      // stem: grey foot 0.9, red stripe 0.22, white shaft; tapered (w x d) 0.95 x 0.55 -> 0.6 x 0.42
      const seg = (y0, y1, c) => {
        const t0 = (y0 - ya) / stemH, t1 = (y1 - ya) / stemH;
        const hw0 = (0.95 + (0.6 - 0.95) * t0) / 2, hd0 = (0.55 + (0.42 - 0.55) * t0) / 2, hw1 = (0.95 + (0.6 - 0.95) * t1) / 2, hd1 = (0.55 + (0.42 - 0.55) * t1) / 2;
        const P = (hw, hd, y, sx, sz) => [r.c + lx * hw * sx + tx * hd * sz, y, r.z + lz * hw * sx + tz * hd * sz];
        const quads = [
          [P(hw0, hd0, y0, 1, 1), P(hw0, hd0, y0, 1, -1), P(hw1, hd1, y1, 1, -1), P(hw1, hd1, y1, 1, 1)],
          [P(hw0, hd0, y0, -1, -1), P(hw0, hd0, y0, -1, 1), P(hw1, hd1, y1, -1, 1), P(hw1, hd1, y1, -1, -1)],
          [P(hw0, hd0, y0, -1, 1), P(hw0, hd0, y0, 1, 1), P(hw1, hd1, y1, 1, 1), P(hw1, hd1, y1, -1, 1)],
          [P(hw0, hd0, y0, 1, -1), P(hw0, hd0, y0, -1, -1), P(hw1, hd1, y1, -1, -1), P(hw1, hd1, y1, 1, -1)],
        ];
        for (const q of quads) Bv.face(q[0], q[1], q[2], q[3], c, null, [r.c, (y0 + y1) / 2, r.z]);
      };
      seg(ya, ya + 0.9, col('#9a9b9c')); seg(ya + 0.9, ya + 1.12, col('#a8262e')); seg(ya + 1.12, yFork, col('#efede7'));
      // fork: two arms from the stem top to the soffit, ~0.38 x 0.42 section
      const W = col('#efede7');
      for (const s of [-1, 1]) {
        const a = [r.c + lx * 0.12 * s, yFork - 0.1, r.z + lz * 0.12 * s], b = [r.c + lx * arm * s, yTip, r.z + lz * arm * s];
        Bv.bar(a, b, 0.4, 0.34, W, [tx, 0, tz]);
      }
      // head block where the arms meet
      Bv.box(r.c, yFork - 0.15, r.z, 0.3, 0.2, 0.26, ry, W);
      // collider
      phys.addCylinder(r.c, r.z, 0.42, DECK_TOP - 0.1, yFork);
      out.columns.push({ x: r.c, z: r.z, ref: pl.ref });
      // lamps under the soffit (two fixtures per bay)
      for (const s of [-1, 1]) out.lamps.push({ x: r.c + lx * (r.hw - 1.4) * s, y: r.ySoff - 0.06, z: r.z + 6 * 0, ry });
      // catenary brackets: on both girders; each flank track takes the support on its side
      out.colMeta = out.colMeta || {};
      const tl = G.tracks;
      for (const tn of pl.tracks) {
        const t = tl[tn]; const xt = t.xAtZ(r.z); if (xt == null) continue;
        const sgn = xt < r.c ? -1 : 1, gx = (sgn < 0 ? r.xL : r.xR);
        (out.supports[tn] = out.supports[tn] || []).push({ x: xt, z: r.z, gx, gz: r.z, gy: r.ySoff + 0.25, sgn, lx, lz });
      }
    }
    // the girder brackets and insulators are drawn by catenary.js from `supports`
  }
  // lamps: instanced-like merged boxes (emissive)
  for (const l of out.lamps) bk.get('lamp', l.x, l.z).box(l.x, l.y, l.z, 0.45, 0.04, 0.12, l.ry || 0, null, ['+x', '-x', '+y', '+z', '-z']);
  return out;
}
