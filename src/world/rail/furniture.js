// rail/furniture.js - platform furniture: hanging track signs ("ПУТИ 6 · 7") and a portal sign at every canopy head, red car-position letters (А Б В ...) on the
// canopy girders, round hanging clocks, back-to-back benches between the columns, litter bins, ticket / kiosk pavilions and luggage-trolley rows at the heads,
// lamp posts on the open platform stretches. Photos: refs/station/22 (red "А" squares, hanging signs), 34 (platform signs, benches), 32, 39.
// Everything static is merged by the batcher (buckets); colliders for benches / kiosks. Returns lists for ctx.services.rail (benches, bins, kiosks, clocks, signs).
import { DECK_TOP, platformAt } from './geom.js';
import { RAMP } from './platform.js';
import { SOFFIT, GIRDER_H } from './canopy.js';
import { col } from './gb.js';

const WOOD = col('#b27a3e'), WOOD_D = col('#8a5a2d'), METAL = col('#2f3236'), BIN = col('#3c4a55'), BIN_L = col('#d9d4c8');
const LETTERS = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З'];

export function lettersTexture(ctx) {
  return ctx.tex.draw(512, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = '#c8252c'; g.fillRect(i * 64 + 2, 2, 60, 60);
      g.fillStyle = '#ffffff'; g.font = `700 44px ${ctx.tex.FONTS.sans}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(LETTERS[i], i * 64 + 32, 35);
    }
  }, { key: 'rail-letters', anisotropy: 4 });
}
export function trackSignTexture(ctx, ref) {
  const pair = ref.replace(';', ' · ');
  return ctx.tex.draw(512, 208, (g, w, h) => {
    g.fillStyle = '#35523f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f0efe8'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = '#f0efe8'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `600 34px ${ctx.tex.FONTS.sans}`; g.fillText(ref.includes(';') ? 'ПУТИ' : 'ПУТЬ', 34, 56);
    g.font = `500 24px ${ctx.tex.FONTS.sans}`; g.fillText(ref.includes(';') ? 'Tracks' : 'Track', 34, 160);
    g.textAlign = 'right'; g.font = `700 112px ${ctx.tex.FONTS.sans}`; g.fillText(pair, w - 34, 108);
    g.fillStyle = '#c8252c'; g.fillRect(26, 92, 150, 8);
  }, { key: 'rail-sign-' + ref, anisotropy: 4 });
}
export function clockTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = '#23262c'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f4f2ea'; g.beginPath(); g.arc(128, 128, 112, 0, 6.283); g.fill();
    g.strokeStyle = '#23262c'; g.lineWidth = 6;
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; g.beginPath(); g.moveTo(128 + Math.sin(a) * 92, 128 - Math.cos(a) * 92); g.lineTo(128 + Math.sin(a) * 106, 128 - Math.cos(a) * 106); g.stroke(); }
    g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(0.35) * 56, 128 - Math.cos(0.35) * 56); g.stroke();      // 10:08
    g.lineWidth = 6; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(-1.9) * 86, 128 - Math.cos(-1.9) * 86); g.stroke();
    g.fillStyle = '#23262c'; g.beginPath(); g.arc(128, 128, 8, 0, 6.283); g.fill();
  }, { key: 'rail-clock', anisotropy: 4 });
}

export function buildFurniture(ctx, G, bk, phys, canopy) {
  const out = { benches: [], bins: [], kiosks: [], clocks: [], signs: [], tris: 0 };
  const rng = ctx.rng('rail-furniture');
  for (const pl of G.platforms) {
    const zone = canopy.zones[pl.ref];
    const R = (z) => platformAt(pl, z);
    const dirAt = (z) => { const a = R(z - 3), b = R(z + 3); const dx = (b.xl + b.xr) / 2 - (a.xl + a.xr) / 2, dz = 6, l = Math.hypot(dx, dz); return { tx: dx / l, tz: dz / l, ry: Math.atan2(dx, dz) }; };
    const centre = (z) => { const r = R(z); return { x: (r.xl + r.xr) / 2, w: r.xr - r.xl }; };
    const z0 = pl.zHead + RAMP, z1 = pl.zTail - RAMP;
    // ---- columns: re-derive the column z grid (every 12 m starting at the second canopy row) to place items between them
    const colZ = canopy.columns.filter((c) => c.ref === pl.ref).map((c) => c.z);
    // ---- benches (back to back on the axis, between two columns) + bins
    for (let i = 0; i + 1 < colZ.length; i += 3) {
      const z = (colZ[i] + colZ[i + 1]) / 2, c = centre(z), d = dirAt(z);
      const B = bk.get('vc', c.x, z);
      const y = DECK_TOP, lx = d.tz, lz = -d.tx;
      // seat boards (two, back to back) + backrest + 4 legs
      for (const s of [-1, 1]) {
        B.box(c.x + lx * 0.34 * s, y + 0.46, z + lz * 0.34 * s, 0.17, 0.025, 0.95, d.ry, WOOD);
        B.box(c.x + lx * 0.34 * s, y + 0.88, z + lz * 0.34 * s, 0.17, 0.12, 0.95, d.ry, WOOD_D);
      }
      B.box(c.x, y + 0.7, z, 0.025, 0.25, 0.95, d.ry, METAL);
      for (const k of [-0.8, 0.8]) B.box(c.x + d.tx * k, y + 0.24, z + d.tz * k, 0.52, 0.24, 0.03, d.ry, METAL, ['-y']);
      phys.addBox(c.x, z, 1.0, 2.0, d.ry, DECK_TOP - 0.1, DECK_TOP + 0.95);
      out.benches.push({ x: c.x, z, rotY: d.ry, len: 1.9, y, platform: pl.ref });
      // litter bin next to the column in front of the bench
      const zb = colZ[i] + 1.1, cb = centre(zb), db = dirAt(zb);
      B.prism(cb.x + db.tz * 0.8, y, zb - db.tx * 0.8, 0.26, 0.28, y + 0.82, 8, BIN);
      B.prism(cb.x + db.tz * 0.8, y + 0.82, zb - db.tx * 0.8, 0.29, 0.29, y + 0.88, 8, BIN_L);
      phys.addCylinder(cb.x + db.tz * 0.8, zb - db.tx * 0.8, 0.28, DECK_TOP - 0.1, DECK_TOP + 0.9);
      out.bins.push({ x: cb.x + db.tz * 0.8, z: zb - db.tx * 0.8, platform: pl.ref });
    }
    // ---- lamp posts on the open stretches (beyond the canopy zone)
    const open = [];
    if (zone) { for (let z = zone[1] + 14; z < z1 - 8; z += 32) open.push(z); } else for (let z = z0 + 12; z < z1 - 8; z += 32) open.push(z);
    for (const z of open) {
      const c = centre(z), d = dirAt(z), B = bk.get('vc', c.x, z), y = DECK_TOP;
      B.prism(c.x, y, z, 0.1, 0.07, y + 5.6, 8, col('#3a3d44'), true);
      B.bar([c.x, y + 5.5, z], [c.x + d.tz * 0.9, y + 5.62, z - d.tx * 0.9], 0.07, 0.07, col('#3a3d44'));
      bk.get('lamp', c.x, z).box(c.x + d.tz * 1.0, y + 5.55, z - d.tx * 1.0, 0.28, 0.04, 0.12, d.ry);
      phys.addCylinder(c.x, z, 0.14, DECK_TOP - 0.1, DECK_TOP + 5.6);
    }
    if (!zone) continue;
    // ---- hanging track signs, clocks, car letters
    const [zc0, zc1] = zone;
    const ySoff = DECK_TOP + SOFFIT;
    const signKey = 'sign:' + pl.ref;
    for (let z = zc0 + 26; z < zc1 - 12; z += 72) {
      const c = centre(z), d = dirAt(z), lx = d.tz, lz = -d.tx;
      // pick a z between columns: columns are on the 12 m grid, hang the sign 6 m after a column
      const B = bk.get(signKey, c.x, z);
      const hw = 0.95, hh = 0.38, yc = ySoff - 1.05;
      for (const f of [-1, 1]) {
        const nx = d.tx * f, nz = d.tz * f, off = 0.04 * f;
        const q = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
        // the sign plane is perpendicular to the track direction; we draw it facing +/- along the track
        const P = q.map(([a, b]) => [c.x + lx * a * f + d.tx * off, yc + b, z + lz * a * f + d.tz * off]);
        const ids = P.map((p, k) => B.vert(p[0], p[1], p[2], nx, 0, nz, k === 0 || k === 3 ? 0 : 1, k < 2 ? 0 : 1));
        if (f > 0) B.quad(ids[0], ids[3], ids[2], ids[1]); else B.quad(ids[0], ids[1], ids[2], ids[3]);
      }
      // two hanger rods
      const Bv = bk.get('vc', c.x, z);
      for (const a of [-0.7, 0.7]) Bv.box(c.x + lx * a, (yc + hh + ySoff) / 2, z + lz * a, 0.012, (ySoff - yc - hh) / 2, 0.012, 0, METAL);
      out.signs.push({ x: c.x, z, y: yc, platform: pl.ref });
    }
    for (let z = zc0 + 62; z < zc1 - 20; z += 96) {
      const c = centre(z), d = dirAt(z), lx = d.tz, lz = -d.tx;
      const B = bk.get('clock', c.x, z), yc = ySoff - 1.25, r = 0.46;
      for (const f of [-1, 1]) {
        const cx = c.x + d.tx * 0.06 * f, cz = z + d.tz * 0.06 * f;
        const n = 14, ctr = B.vert(cx, yc, cz, d.tx * f, 0, d.tz * f, 0.5, 0.5);
        let prev = null;
        for (let k = 0; k <= n; k++) {
          const a = k / n * Math.PI * 2, px = Math.cos(a) * r, py = Math.sin(a) * r;
          const v = B.vert(cx + lx * px * f, yc + py, cz + lz * px * f, d.tx * f, 0, d.tz * f, 0.5 + Math.cos(a) * 0.44, 0.5 + Math.sin(a) * 0.44);
          if (prev !== null) { if (f > 0) B.tri(ctr, v, prev); else B.tri(ctr, prev, v); }
          prev = v;
        }
      }
      const Bv = bk.get('vc', c.x, z);
      Bv.box(c.x, (yc + r + ySoff) / 2, z, 0.015, (ySoff - yc - r) / 2, 0.015, 0, METAL);
      out.clocks.push({ x: c.x, z, y: yc, platform: pl.ref });
    }
    // car-position letters on the inner face of both girders every 24 m
    let li = 0;
    for (let z = zc0 + 14; z < zc1 - 8; z += 24, li++) {
      const r = R(z), d = dirAt(z), c = centre(z);
      const hw = r.xr - r.xl; const half = hw / 2 + 1.0 - 0.18;                    // inner face of the girder
      for (const s of [-1, 1]) {
        const B = bk.get('letters', c.x, z), x = c.x + s * (half - 0.025) * 1.0, y0 = ySoff - 0.35 + 0.25, sz = 0.7;
        const u0 = (li % 8) / 8, u1 = u0 + 1 / 8, nx = -s;
        const ids = [[z - sz / 2, y0], [z + sz / 2, y0], [z + sz / 2, y0 + sz], [z - sz / 2, y0 + sz]].map(([zz, yy], k) => B.vert(x + (zz - z) * d.tx / d.tz, yy, zz, nx, 0, 0, k === 0 || k === 3 ? u0 : u1, k < 2 ? 0 : 1));
        if (s < 0) B.quad(ids[0], ids[1], ids[2], ids[3]); else B.quad(ids[0], ids[3], ids[2], ids[1]);
      }
    }
    // portal sign on the north face of the first end plate (seen from the concourse)
    {
      const r0 = R(zc0), cx0 = (r0.xl + r0.xr) / 2, B = bk.get(signKey, cx0, zc0), y0 = ySoff - 0.1, hh = 0.52, hw = 1.28, zf = zc0 - 0.04;
      const ids = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b], k) => B.vert(cx0 + a, y0 + b + 0.45, zf, 0, 0, -1, k === 0 || k === 3 ? 1 : 0, k < 2 ? 0 : 1));
      B.quad(ids[0], ids[3], ids[2], ids[1]);
    }
    void GIRDER_H;
  }
  return out;
}

/** Pavilions, luggage trolleys and the portal signs at the heads. */
export function buildHeads(ctx, G, bk, phys, canopy) {
  const out = { kiosks: [], trolleys: 0 };
  const rng = ctx.rng('rail-heads');
  const KI = [col('#8c3a35'), col('#3e5a6b'), col('#6b6f78'), col('#7c5a3a')];
  for (const pl of G.platforms) {
    const R = (z) => platformAt(pl, z);
    const zone = canopy.zones[pl.ref];
    const zk = pl.zHead + RAMP + 26;
    const r = R(zk), w = r.xr - r.xl, c = (r.xl + r.xr) / 2;
    // kiosk on the east edge if the platform is wide enough
    if (w >= 6.2) {
      const side = pl.ref === '1' ? -1 : 1, d = 1.9, lenK = 3.4;
      const x = side > 0 ? r.xr - 1.1 - d / 2 : r.xl + 1.1 + d / 2;
      const B = bk.get('vc', x, zk), y = DECK_TOP, kc = rng.pick(KI);
      B.box(x, y + 1.3, zk, d / 2, 1.3, lenK / 2, 0.0, kc);
      B.box(x, y + 2.68, zk, d / 2 + 0.12, 0.06, lenK / 2 + 0.12, 0.0, col('#d9d6cc'));
      // window band + counter on the platform side (facing the axis)
      const fx = x - side * (d / 2 + 0.012);
      B.box(fx - side * 0.02, y + 1.55, zk, 0.012, 0.42, lenK / 2 - 0.35, 0, col('#26323b'));
      B.box(fx - side * 0.12, y + 1.05, zk, 0.1, 0.03, lenK / 2 - 0.25, 0, col('#d9d6cc'));
      phys.addBox(x, zk, d + 0.2, lenK + 0.2, 0, DECK_TOP - 0.1, DECK_TOP + 2.7);
      out.kiosks.push({ x, z: zk, platform: pl.ref });
    }
    // luggage trolleys: two rows of 5 near the head, on the axis
    const zt = pl.zHead + RAMP + 8;
    for (let row = 0; row < 2; row++) {
      const rr = R(zt + row * 1.6), cx = (rr.xl + rr.xr) / 2 - 1.2 + row * 0.0;
      const B = bk.get('vc', cx, zt);
      for (let k = 0; k < 5; k++) {
        const zz = zt + row * 1.6, xx = cx + 0.0, off = k * 0.18;
        const bx = xx + off * 0.0, by = DECK_TOP;
        B.box(bx, by + 0.14, zz + k * 0.16, 0.3, 0.02, 0.45, 0, col('#9aa0a6'));
        B.bar([bx - 0.28, by + 0.15, zz + k * 0.16 - 0.4], [bx - 0.28, by + 0.95, zz + k * 0.16 - 0.4], 0.02, 0.02, col('#9aa0a6'));
        B.bar([bx + 0.28, by + 0.15, zz + k * 0.16 - 0.4], [bx + 0.28, by + 0.95, zz + k * 0.16 - 0.4], 0.02, 0.02, col('#9aa0a6'));
        B.bar([bx - 0.28, by + 0.95, zz + k * 0.16 - 0.4], [bx + 0.28, by + 0.95, zz + k * 0.16 - 0.4], 0.025, 0.025, col('#2f3236'));
        out.trolleys++;
      }
      void c; void zone;
    }
  }
  return out;
}
