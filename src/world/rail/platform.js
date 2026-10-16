// rail/platform.js - the six high platforms: deck (brick pavers / concrete slabs), grey edge band + yellow safety line, wire-mesh edge wall,
// head and tail ramps (the only ways up for a walker), walk-box colliders. Surface = RAIL_TOP + 1.1 m (DECK_TOP); heads begin in a 16 m ramp from the
// concourse level, tails end in the same ramp. Photos: refs/station/22, 27, 32 (brick pavers, concrete edge, mesh panels), 39.
import { DECK_TOP, platformAt } from './geom.js';

export const RAMP = 16;                   // ramp length at both platform ends (rise 1.30 m: 4.7 deg)
const STEP0 = 0.08;                       // the deck starts 8 cm above the street (riser at the very end: no coplanar overlap with the ground)
const BAND = 0.95, LINE = 0.16;           // concrete edge band width, yellow line width (line starts after the band)
const DIR = [0.2250, 0.9744], LAT = [0.9744, -0.2250];      // along-track / lateral unit vectors of the station axis (bearing 167)

export const deckY = (pl, z) => {
  const a = Math.min(1, Math.max(0, (z - pl.zHead) / RAMP)), b = Math.min(1, Math.max(0, (pl.zTail - z) / RAMP));
  const k = Math.min(a, b);
  return STEP0 + (DECK_TOP - STEP0) * k;
};

const uvOf = (x, z, s) => [(x * LAT[0] + z * LAT[1]) / s, (x * DIR[0] + z * DIR[1]) / s];

export function paverTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('rail-pavers');
    g.fillStyle = '#4c4742'; g.fillRect(0, 0, w, h);
    const cols = ['#6d655e', '#776d64', '#625b55', '#82786d', '#6a625c', '#746a62'];
    for (let row = 0; row < 26; row++) {
      const y = row * 10, off = (row % 2) * 10;
      for (let x = -20; x < w + 20; x += 20) { g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x + off + 0.8, y + 0.8, 18.4, 8.4); }
    }
  }, { key: 'rail-pavers', repeat: [1, 1], anisotropy: 8 });
}
export function slabTexture(ctx) {
  return ctx.tex.draw(256, 256, (g, w, h) => {
    const r = ctx.rng('rail-slabs');
    g.fillStyle = '#7b7b7e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 0.94 + r() * 0.1; g.fillStyle = `rgb(${(124 * v) | 0},${(124 * v) | 0},${(128 * v) | 0})`; g.fillRect(i * 64 + 1.5, j * 64 + 1.5, 61, 61); }
    g.fillStyle = 'rgba(30,30,34,0.5)';
    for (let i = 0; i < 4; i++) { g.fillRect(i * 64 - 1, 0, 3, h); g.fillRect(0, i * 64 - 1, w, 3); }
  }, { key: 'rail-slabs', repeat: [1, 1], anisotropy: 8 });
}
export function meshTexture(ctx) {
  return ctx.tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#9c9fa3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4c5056';
    for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) g.fillRect(i * 8 + 1, j * 8 + 1, 5, 5);
  }, { key: 'rail-mesh', repeat: [1, 1], anisotropy: 4 });
}

/** Deck, edge bands, lines, walls, ramps and colliders of every platform. Returns services data. */
export function buildPlatforms(ctx, G, bk, phys) {
  const out = { walkLines: [], lanes: [], edges: [], gates: [], deckBoxes: 0 };
  const alt = new Set(['2;3', '6;7', '10;11']);
  G.platforms.forEach((pl) => {
    pl.deckKey = alt.has(pl.ref) ? 'deckPaver' : 'deckSlab';
    const R = pl.rows;
    // resample the rows densely in the ramps so the slope is smooth, otherwise use the 4 m rows
    const rows = R.map((r) => ({ ...r, y: deckY(pl, r.z) }));
    const n = rows.length;
    for (let i = 0; i + 1 < n; i++) {
      const a = rows[i], b = rows[i + 1];
      const mx = (a.xl + a.xr + b.xl + b.xr) / 4, mz = (a.z + b.z) / 2;
      // strips across the width: [xl, xl+BAND] band, line, main, line, band
      const at = (r, t) => (t < 0 || Object.is(t, -0) ? r.xr + t : r.xl + t);
      const strips = [['deckEdge', 0, BAND], ['deckLine', BAND, BAND + LINE], [pl.deckKey, BAND + LINE, -(BAND + LINE)], ['deckLine', -(BAND + LINE), -BAND], ['deckEdge', -BAND, -0]];
      for (const [key, t0, t1] of strips) {
        const x0a = at(a, t0), x1a = at(a, t1), x0b = at(b, t0), x1b = at(b, t1);
        const Bk = bk.get(key, mx, mz);
        const s = key === 'deckSlab' ? 3.0 : key === 'deckPaver' ? 2.56 : 1.0;
        const q = [[x0a, a.y, a.z], [x1a, a.y, a.z], [x1b, b.y, b.z], [x0b, b.y, b.z]];
        // normal from the (possibly sloped) quad
        const ux = q[1][0] - q[0][0], uy = q[1][1] - q[0][1], uz = q[1][2] - q[0][2], vx = q[3][0] - q[0][0], vy = q[3][1] - q[0][1], vz = q[3][2] - q[0][2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const ids = q.map((p) => { const [u, v] = uvOf(p[0], p[2], s); return Bk.vert(p[0], p[1], p[2], nx, ny, nz, u, v); });
        if (uz * vx - ux * vz > 0) Bk.quad(ids[0], ids[1], ids[2], ids[3]); else Bk.quad(ids[0], ids[3], ids[2], ids[1]);
      }
      // side walls (mesh panel below, concrete cap beam 0.32 m at the top)
      for (const side of [-1, 1]) {
        const xa = side < 0 ? a.xl : a.xr, xb = side < 0 ? b.xl : b.xr;
        const Bw = bk.get('wallMesh', mx, mz), Bc = bk.get('wallCap', mx, mz);
        const dx = xb - xa, dz = b.z - a.z, L = Math.hypot(dx, dz);
        // outward normal: west edge -> -x side, east edge -> +x side, perpendicular to the edge direction
        let nx = dz / L, nz = -dx / L; if ((nx < 0) !== (side < 0)) { nx = -nx; nz = -nz; }
        const cap = 0.32, yb = -0.1;
        const ya = Math.max(a.y - cap, yb), yb2 = Math.max(b.y - cap, yb);
        const mkq = (B, y0a, y1a, y0b, y1b, uv0, uv1) => {
          const i0 = B.vert(xa, y0a, a.z, nx, 0, nz, uv0[0], uv0[1]), i1 = B.vert(xb, y0b, b.z, nx, 0, nz, uv1[0], uv0[1]),
            i2 = B.vert(xb, y1b, b.z, nx, 0, nz, uv1[0], uv1[1]), i3 = B.vert(xa, y1a, a.z, nx, 0, nz, uv0[0], uv1[1]);
          // (i0,i1,i2) faces along e x up = (-ez, 0, ex): keep it when that agrees with the outward normal
          const ex = xb - xa, ez = b.z - a.z;
          if (-ez * nx + ex * nz > 0) B.quad(i0, i1, i2, i3); else B.quad(i0, i3, i2, i1);
        };
        const u0 = a.z / 2.0, u1 = b.z / 2.0;
        if (ya > yb + 0.01 || yb2 > yb + 0.01) mkq(Bw, yb, ya, yb, yb2, [u0, 0], [u1, Math.max(ya, yb2) + 0.1]);
        mkq(Bc, ya, a.y, yb2, b.y, [u0, 0], [u1, 1]);
      }
    }
    // head and tail risers (8 cm)
    for (const [r, face] of [[rows[0], -1], [rows[n - 1], 1]]) {
      const B = bk.get('wallCap', (r.xl + r.xr) / 2, r.z);
      const nz = face, y0 = 0.0, y1 = STEP0;
      const i0 = B.vert(r.xl, y0, r.z, 0, 0, nz, 0, 0), i1 = B.vert(r.xr, y0, r.z, 0, 0, nz, 1, 0), i2 = B.vert(r.xr, y1, r.z, 0, 0, nz, 1, 1), i3 = B.vert(r.xl, y1, r.z, 0, 0, nz, 0, 1);
      if (nz < 0) B.quad(i0, i3, i2, i1); else B.quad(i0, i1, i2, i3);
    }
    // ---- colliders
    const cosA = DIR[1];
    const cl = (z) => { const r = platformAt(pl, z); return { x: (r.xl + r.xr) / 2, w: (r.xr - r.xl) * cosA }; };
    const z0 = pl.zHead, z1 = pl.zTail;
    // head ramp (yA at the north end -> DECK_TOP at the south end), tail ramp, flat middle in ~8 m boxes
    const ramp = (za, zb, ya, yb) => {
      const n = Math.max(1, Math.round((zb - za) / 4));        // 4 m wedges: the collider follows the width of the deck
      for (let i = 0; i < n; i++) {
        const z0_ = za + (zb - za) * i / n, z1_ = za + (zb - za) * (i + 1) / n, y0_ = ya + (yb - ya) * i / n, y1_ = ya + (yb - ya) * (i + 1) / n;
        let w = 1e9; for (let z = z0_; z <= z1_ + 0.01; z += 1) w = Math.min(w, cl(z).w);
        const a = cl(z0_), b = cl(z1_), dx = b.x - a.x, dz = z1_ - z0_, len = Math.hypot(dx, dz);
        phys.addWalkRamp((a.x + b.x) / 2, (z0_ + z1_) / 2, w, len + 0.15, Math.atan2(dx, dz), y0_ - (y1_ - y0_) * 0.0375, y1_ + (y1_ - y0_) * 0.0375, 1.6);
      }
    };
    ramp(z0, z0 + RAMP, STEP0, DECK_TOP);
    ramp(z1 - RAMP, z1, DECK_TOP, STEP0);
    for (let z = z0 + RAMP; z < z1 - RAMP - 0.5; z += 8) {
      const za = z - (z === z0 + RAMP ? 0.4 : 0), zb = Math.min(z + 8.4, z1 - RAMP + 0.4);
      let w = 1e9; for (let q = za; q <= zb; q += 2) w = Math.min(w, cl(q).w);
      const a = cl(za), b = cl(zb), dx = b.x - a.x, dz = zb - za, len = Math.hypot(dx, dz);
      phys.addWalkBox((a.x + b.x) / 2, (za + zb) / 2, w, len, Math.atan2(dx, dz), DECK_TOP, 0);
      out.deckBoxes++;
    }
    // ---- services: centre line, yellow-line edges, gates (heads)
    const pts = []; for (let z = z0 + RAMP; z <= z1 - RAMP; z += 10) { const c = cl(z); pts.push([c.x, z]); }
    out.walkLines.push({ id: 'P' + pl.ref, ref: pl.ref, y: DECK_TOP, width: 4.0, pts });
    pl.y = DECK_TOP; pl.length = z1 - z0; pl.rampLen = RAMP; pl.centre = (z) => cl(z).x;
    // two walking lanes per platform (beside the column / bench axis), for the people module
    for (const side of [-1, 1]) {
      const lp = []; for (let z = z0 + RAMP; z <= z1 - RAMP; z += 10) { const c = cl(z), off = Math.min(1.5, Math.max(0.9, c.w / 2 - 1.4)); lp.push([c.x + side * off / DIR[1], z]); }
      out.lanes.push({ id: 'P' + pl.ref + (side < 0 ? 'W' : 'E'), platform: pl.ref, side, y: DECK_TOP, width: 1.6, pts: lp });
    }
    for (const side of [-1, 1]) {
      const ep = []; for (let z = z0 + RAMP; z <= z1 - RAMP; z += 10) { const r = platformAt(pl, z); ep.push([side < 0 ? r.xl + BAND : r.xr - BAND, z]); }
      out.edges.push({ platform: pl.ref, side, y: DECK_TOP, pts: ep });
    }
    const hc = cl(z0 + 2);
    out.gates.push({ x: hc.x, z: z0 + 1.5, rotY: Math.atan2(DIR[0], DIR[1]), platform: pl.ref, y: 0, width: hc.w });
  });
  return out;
}
