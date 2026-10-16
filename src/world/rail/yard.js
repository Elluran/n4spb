// rail/yard.js - the throat and the yard south of the platforms: lattice signal / floodlight gantries across the track groups (photo refs/station/27: a steel truss
// over 4+ tracks with floodlights), the fence across the track field at the far end of the play area (live tracks beyond it are not for walkers).
import { RAIL_TOP } from './geom.js';
import { col } from './gb.js';

const GREY = col('#a9afb5'), DARK = col('#3a3d44'), CONC = col('#b9b7b0'), FENCE = col('#c9c6bd'), FENCE_D = col('#8f8d86'), RED = col('#c8352d'), WHITE = col('#eeeeea');

function legs(B, x, z, top) {
  // lattice leg: 4 chords tapering 0.9 -> 0.6 m, diagonals every 2.4 m
  const lv = 6, h = top, c0 = 0.45, c1 = 0.3;
  const corner = (i, y) => { const k = 1 - y / h, w = c1 + (c0 - c1) * k; return [x + (i & 1 ? w : -w), y, z + (i & 2 ? w : -w)]; };
  B.box(x, 0.3, z, 0.7, 0.3, 0.7, 0, CONC);
  for (let i = 0; i < 4; i++) B.bar(corner(i, 0.6), corner(i, h), 0.12, 0.12, GREY);
  for (let k = 0; k < lv; k++) {
    const y0 = 0.6 + (h - 0.6) * k / lv, y1 = 0.6 + (h - 0.6) * (k + 1) / lv;
    for (const [a, b] of [[0, 1], [1, 3], [3, 2], [2, 0]]) B.bar(corner(a, y0), corner(b, y1), 0.06, 0.06, GREY);
  }
}

export function buildYard(ctx, G, bk, phys) {
  const out = { gantries: 0, fenceLen: 0 };
  const play = ctx.L.WORLD.play;
  // ---- gantries over the track groups
  const rows = [770, 830, 905];
  for (const z of rows) {
    // x of every electrified path at this z
    const xs = []; for (const p of G.paths) { const x = p.xAtZ(z); if (x != null && p.electrified) xs.push(x); }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    // clusters
    const cl = []; let cur = [xs[0]];
    for (let i = 1; i < xs.length; i++) { if (xs[i] - xs[i - 1] > 11) { cl.push(cur); cur = [xs[i]]; } else cur.push(xs[i]); }
    cl.push(cur);
    for (const c of cl) {
      const a = c[0] - 3.2, b = c[c.length - 1] + 3.2; if (b - a < 8) continue;
      // split wide clusters at a gap into two portals
      const segs = [];
      let s0 = a; const maxW = 46;
      while (b - s0 > maxW) { // find the biggest gap of the cluster within [s0+maxW*0.5, s0+maxW]
        let cut = s0 + maxW * 0.8; for (let i = 1; i < c.length; i++) if (c[i] > s0 + maxW * 0.5 && c[i] - c[i - 1] > 4.2 && c[i - 1] < s0 + maxW) cut = (c[i] + c[i - 1]) / 2;
        segs.push([s0, cut]); s0 = cut;
      }
      segs.push([s0, b]);
      for (const [x0, x1] of segs) {
        const B = bk.get('vc', (x0 + x1) / 2, z), top = 10.6, yb = 9.3;
        legs(B, x0, z, top); legs(B, x1, z, top);
        phys.addCylinder(x0, z, 0.8, 0, top); phys.addCylinder(x1, z, 0.8, 0, top);
        // truss: two chords + posts + diagonals
        B.bar([x0, yb, z - 0.45], [x1, yb, z - 0.45], 0.14, 0.14, GREY); B.bar([x0, top, z - 0.45], [x1, top, z - 0.45], 0.14, 0.14, GREY);
        B.bar([x0, yb, z + 0.45], [x1, yb, z + 0.45], 0.14, 0.14, GREY); B.bar([x0, top, z + 0.45], [x1, top, z + 0.45], 0.14, 0.14, GREY);
        const n = Math.max(3, Math.round((x1 - x0) / 3));
        for (let i = 0; i < n; i++) {
          const xa = x0 + (x1 - x0) * i / n, xb = x0 + (x1 - x0) * (i + 1) / n;
          B.bar([xa, yb, z], [xa, top, z], 0.07, 0.07, GREY);
          B.bar([xa, i % 2 ? top : yb, z], [xb, i % 2 ? yb : top, z], 0.07, 0.07, GREY);
        }
        // floodlights (4 per portal, tilted down) and a signal head over the tracks inside
        for (let i = 0; i < 4; i++) { const fx = x0 + (x1 - x0) * (i + 0.5) / 4; B.box(fx, top + 0.45, z, 0.3, 0.18, 0.22, 0, DARK); bk.get('lamp', fx, z).box(fx, top + 0.45, z + 0.24, 0.26, 0.14, 0.012, 0); bk.get('lamp', fx, z).box(fx, top + 0.45, z - 0.24, 0.26, 0.14, 0.012, 0); }
        for (const x of c) if (x > x0 + 2 && x < x1 - 2) {
          B.bar([x, yb, z], [x, yb - 1.1, z], 0.05, 0.05, DARK);
          B.box(x, yb - 1.6, z, 0.22, 0.5, 0.15, 0, DARK);
          bk.get('lensRed', x, z).box(x, yb - 1.35, z + 0.17, 0.07, 0.07, 0.01, 0); bk.get('lensRed', x, z).box(x, yb - 1.35, z - 0.17, 0.07, 0.07, 0.01, 0);
        }
        out.gantries++;
      }
    }
  }
  // ---- fence across the track field at the far end of the play area
  const tailMax = Math.max(...G.platforms.map((p) => p.zTail));
  const zf = Math.max(Math.min(play.z1 - 16, 1044), tailMax + 12);
  const corridors = [];
  for (const p of G.paths) { const x = p.xAtZ(zf); if (x != null) corridors.push(x); }
  corridors.sort((a, b) => a - b);
  // merge track corridors (+/- 3.4 m, 2.6 m near the next one)
  const gaps = [];
  for (const x of corridors) { const last = gaps[gaps.length - 1]; if (last && x - 3.4 <= last[1] + 1.0) last[1] = x + 3.4; else gaps.push([x - 3.4, x + 3.4]); }
  const xmin = Math.min(play.x0 + 40, (gaps[0]?.[0] ?? 600) - 70), xmax = Math.max(gaps[gaps.length - 1]?.[1] ?? 800, 0) + 70;
  const segs = []; let cx = Math.max(xmin, 560);
  for (const g of gaps) { if (g[0] > cx) segs.push([cx, g[0]]); cx = Math.max(cx, g[1]); }
  segs.push([cx, Math.min(xmax, play.x1 - 8)]);
  for (const [x0, x1] of segs) {
    if (x1 - x0 < 1.5) continue;
    const mx = (x0 + x1) / 2, B = bk.get('vc', mx, zf), h = 2.3;
    // concrete panel fence: a continuous wall 2.3 m high with a darker top rail and posts every 3 m
    B.box(mx, h / 2, zf, (x1 - x0) / 2, h / 2, 0.06, 0, FENCE);
    B.box(mx, h + 0.04, zf, (x1 - x0) / 2, 0.06, 0.1, 0, FENCE_D);
    for (let x = x0; x <= x1 + 0.01; x += 3) B.box(x, h / 2 + 0.05, zf, 0.1, h / 2 + 0.05, 0.11, 0, FENCE_D);
    phys.addAABB(x0, zf - 0.25, x1, zf + 0.25, 0, h);
    out.fenceLen += x1 - x0;
  }
  // closed steel gates over the track corridors (a red-white beam on top): trains stop short of them (rail/trains.js VISEND)
  for (const g of gaps) {
    const mx = (g[0] + g[1]) / 2, B = bk.get('vc', mx, zf), len = g[1] - g[0], h = 2.3;
    B.box(mx, h / 2, zf, len / 2, h / 2, 0.05, 0, col('#5d646c'));
    for (const x of [g[0], g[1]]) B.box(x, 1.7, zf, 0.14, 1.7, 0.14, 0, FENCE_D);
    const n = Math.max(2, Math.round(len / 1.0));
    for (let i = 0; i < n; i++) B.box(g[0] + len * (i + 0.5) / n, h + 0.3, zf, len / n / 2, 0.13, 0.05, 0, i % 2 ? WHITE : RED);
    phys.addAABB(g[0], zf - 0.25, g[1], zf + 0.25, 0, h);
  }
  out.fenceZ = zf;
  void RAIL_TOP;
  return out;
}
