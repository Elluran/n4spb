// gables.js - what the Petrograd-side fronts carry above the cornice (docs/city-api.md "Petrograd-side archetypes"):
//   * SHAPED GABLES of the Northern Modern tenements (NORDIC): a wall-plane attic over a feature bay of walls.js (w.feat[].gable), four outlines: 0 round, 1 shouldered (a bell over two
//     low shoulders, the Frenkel house / Bolshoy 69 type), 2 steep triangle (the twin gables of the House with Owls type), 3 stepped. The front is ONE strip of wall-shader quads
//     (ARCH.GABLE: roughcast, smooth coping along the same outline the geometry follows, an attic window, an optional tile panel), a blank back 0.32 m behind it and a coping strip.
//   * ROOF PARAPETS of the neoclassical revival (st.parapet 'bal' = balustrade, 'attic' = solid attic with panels; also a few Stalinist fronts): one wall-shader quad per street piece
//     (ARCH.PARAPET paints piers and vase balusters), a back face and a cap, mitred at the corners like the cornice.
// Nothing here has a collider (it stands on the cornice line, 17-25 m up). Triangles: a gable 12-52, a parapet piece 6.
// Sources: SP/refs/city-petro 16_frenkel (wavy gables + dormers), refs/kamennoostrovsky 64_aly69 (shaped attics), 05_kronv_tram / 68_kam_spb01 (roof balustrades), 73_k9.
import { hash01 } from '../lib/massing.js';
import { wallAttr, ARCH, F, wearFlags, trimFlags } from './wallmat.js';
import { CORNICE_H, miterAt } from './cornice.js';
import { neighbourIndex } from './kit.js';

const THICK = 0.32;
/** outline height (0..1) of a gable shape at ax = |distance from the axis| / half width: the SAME functions as the GABLE branch of the wall shader */
export function gableOutline(shape, ax) {
  if (shape === 0) return Math.sqrt(Math.max(1 - ax * ax, 0));
  if (shape === 1) { const t = Math.min(1, Math.max(0, (ax - 0.18) / (0.74 - 0.18))); return 0.34 + 0.66 * (1 - t * t * (3 - 2 * t)); }
  if (shape === 2) return 1 - ax;
  return ax < 0.34 ? 1 : ax < 0.68 ? 0.66 : 0.34;
}
/** x stations (0..1 across the width) of the strip: breakpoints of the outline, denser where it curves */
function stations(shape) {
  if (shape === 2) return [0, 0.5, 1];
  if (shape === 3) return [0, 0.16, 0.16, 0.33, 0.33, 0.67, 0.67, 0.84, 0.84, 1];
  if (shape === 1) return [0, 0.13, 0.22, 0.31, 0.41, 0.5, 0.59, 0.69, 0.78, 0.87, 1];
  return [0, 0.04, 0.12, 0.25, 0.4, 0.5, 0.6, 0.75, 0.88, 0.96, 1];
}

export function buildGables(ctx, { M, info }) {
  const tag = typeof M.tag === 'function' ? (k, id, meta) => M.tag(k, id, meta) : () => {};          // tools/city-tower-lib.mjs: announces the feature being built (no-op in production)
  const neighbourIn = neighbourIndex(info);                                      // a gable / parapet piece buried in an overlapping neighbour is never seen: not built
  let nG = 0, nP = 0, tris = 0;
  for (const rec of info) {
    const { b, st } = rec;
    if ((b.minH || 0) > 0.5) continue;
    const yBase = st.H + CORNICE_H;
    // ---------------------------------------------------------------- gables over the feature bays
    if (st.arch === ARCH.NORDIC && st.gable) {
      for (const w of rec.walls) {
        if (!w.feat || w.gate) continue;
        for (const f of w.feat) {
          if (!f.gable) continue;
          const shape = st.gableShape | 0;
          const wide = w.N >= 6 && hash01(b.id + ':gw' + w.id + f.bay) < 0.45;
          let W = wide ? Math.min(3 * w.bw, 9.5) : Math.max(w.bw + 1.0, 4.4);
          const sMid = (f.bay + 0.5) * w.bw;
          const s0 = Math.max(0.2, sMid - W / 2), s1 = Math.min(w.len - 0.2, sMid + W / 2);
          W = s1 - s0; if (W < 3.2) continue;
          const Hg = shape === 0 ? Math.min(4.4, W * 0.5) : shape === 1 ? Math.min(4.8, Math.max(3.0, W * 0.62)) : shape === 2 ? Math.min(5.8, Math.max(3.4, W * 0.82)) : Math.min(4.4, Math.max(2.8, W * 0.6));
          const cx = w.a[0] + w.dx * (s0 + s1) / 2, cz = w.a[1] + w.dz * (s0 + s1) / 2;
          if (neighbourIn(cx, cz, rec, yBase + 1)) continue;
          const FB = M.walls(cx, cz), CB = M.core(cx, cz);
          tag('gable', b.id, { x: cx, z: cz, shape, W, Hg });
          const at = wallAttr({ arch: ARCH.GABLE, floors: shape, H: Hg, bw: 1, N: W, i0: Math.round(s0), seed: st.seed, flags: wearFlags(st.wear) | trimFlags(st.trimClass) | (st.majolica ? F.MAJOLICA : 0), plinth: 0, G: 0, PN: 0, centre: -1 });
          const nb = Math.max(1, Math.round(W / 3));
          const back = wallAttr({ arch: ARCH.FIREWALL, floors: 1, H: Hg, bw: W / nb, N: nb, i0: 0, seed: st.seed, flags: F.BLANK | wearFlags(Math.max(2, st.wear)), plinth: 0, G: Hg, PN: 0, centre: -1 });
          const P = (x, y, d) => [w.a[0] + w.dx * (s0 + x) - w.nx * d, yBase + y, w.a[1] + w.dz * (s0 + x) - w.nz * d];
          const xs = stations(shape), cop = st.trim.clone().multiplyScalar(0.92);
          const hAt = (t) => Hg * gableOutline(shape, Math.min(1, Math.abs(2 * t - 1)));
          for (let i = 0; i + 1 < xs.length; i++) {
            const t0 = xs[i], t1 = xs[i + 1]; if (t1 - t0 < 1e-6) continue;
            // on the stepped outline both ends of a column sit on its own step (the station is doubled at every riser)
            const h0 = shape === 3 ? hAt((t0 + t1) / 2) : hAt(t0), h1 = shape === 3 ? hAt((t0 + t1) / 2) : hAt(t1);
            const x0 = t0 * W, x1 = t1 * W;
            // a strip that ends on the ground line (round / steep outlines at x = 0 and x = W) has a collapsed edge: it is a triangle then. (The quad kept its four corners, FacadeBuilder.face read the
            // orientation from the first three, which were collinear at the right end, and the strip was wound inside out: the whole right half of the steep gable was invisible.)
            const loop = (pts, uv, n, a) => { const Q = [], U = []; pts.forEach((q, k) => { const l = Q[Q.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1], q[2] - l[2]) > 1e-6) { Q.push(q); U.push(uv[k]); } }); const f0 = Q[0], z = Q[Q.length - 1]; if (Q.length > 1 && Math.hypot(f0[0] - z[0], f0[1] - z[1], f0[2] - z[2]) <= 1e-6) { Q.pop(); U.pop(); } if (Q.length >= 3) FB.face(Q, n, U, a, st.color); };
            loop([P(x0, 0, 0), P(x1, 0, 0), P(x1, h1, 0), P(x0, h0, 0)], [[x0, 0], [x1, 0], [x1, h1], [x0, h0]], [w.nx, 0, w.nz], at);
            loop([P(x0, 0, THICK), P(x1, 0, THICK), P(x1, h1, THICK), P(x0, h0, THICK)], [[x0 / (W / nb), 0], [x1 / (W / nb), 0], [x1 / (W / nb), h1], [x0 / (W / nb), h0]], [-w.nx, 0, -w.nz], back);
            // coping strip between the two faces
            const sl = Math.atan2(h1 - h0, x1 - x0), nxy = [-Math.sin(sl), Math.cos(sl)];
            CB.quad([P(x0, h0, 0), P(x1, h1, 0), P(x1, h1, THICK), P(x0, h0, THICK)], [w.dx * nxy[0], nxy[1], w.dz * nxy[0]], cop);
            tris += 6;
          }
          // risers of the steps and the two ends
          const ends = shape === 3 ? [[0, 0, 0.34], [0.16, 0.34, 0.66], [0.33, 0.66, 1], [0.67, 0.66, 1], [0.84, 0.34, 0.66], [1, 0, 0.34]] : [[0, 0, gableOutline(shape, 1)], [1, 0, gableOutline(shape, 1)]];
          for (const [t, lo, hi] of ends) {
            if (hi - lo < 0.02) continue;
            const sgn = t < 0.5 ? -1 : 1;
            CB.quad([P(t * W, lo * Hg, 0), P(t * W, hi * Hg, 0), P(t * W, hi * Hg, THICK), P(t * W, lo * Hg, THICK)], [w.dx * sgn, 0, w.dz * sgn], cop);
            tris += 2;
          }
          tag(null);
          nG++;
        }
      }
    }
    // ---------------------------------------------------------------- balustrade / attic parapet along the street pieces
    if (st.parapet) {
      const variant = st.parapet === 'attic' ? 1 : 0, Hp = variant ? 1.25 : 0.98, D = 0.30, T = 0.2;
      const col = variant ? st.color.clone().lerp(st.trim, 0.25) : st.trim, cap = st.trim.clone().multiplyScalar(0.94);
      tag('parapet', b.id, { variant });
      for (const ring of rec.rings) {
        if (ring.hole) continue;
        const n = ring.pts.length;
        for (const e of ring.edges) {
          if (!e.street) continue;
          const Ms = miterAt(ring.pts, e.i), Me = miterAt(ring.pts, (e.i + 1) % n);
          const pt = (t, d) => (t <= 0.01 ? [e.a[0] + Ms[0] * d, e.a[1] + Ms[1] * d] : t >= e.len - 0.01 ? [e.b[0] + Me[0] * d, e.b[1] + Me[1] * d] : [e.a[0] + e.dx * t + e.nx * d, e.a[1] + e.dz * t + e.nz * d]);
          for (const pc of e.pieces) {
            const len = pc.t1 - pc.t0;
            if (pc.yLow > 0.2 || len < 2) continue;
            const N = Math.max(1, Math.round(len / 2.7)), bw = len / N;
            const at = wallAttr({ arch: ARCH.PARAPET, floors: variant, H: Hp, bw, N, i0: Math.round(pc.t0), seed: st.seed, flags: wearFlags(st.wear), plinth: 0, G: Hp, PN: 0, centre: -1 });
            const a0 = pt(pc.t0, D), a1 = pt(pc.t1, D), b0 = pt(pc.t0, D - T), b1 = pt(pc.t1, D - T);
            const mx = (a0[0] + a1[0]) / 2, mz = (a0[1] + a1[1]) / 2;
            if (neighbourIn(mx, mz, rec, yBase + Hp)) continue;
            const FB = M.walls(mx, mz);
            FB.quad(a0, a1, yBase, yBase + Hp, e.nx, e.nz, 0, N, 0, Hp, at, col);
            FB.quad(b1, b0, yBase, yBase + Hp, -e.nx, -e.nz, 0, N, 0, Hp, at, col);
            M.core(mx, mz).quad([[a0[0], yBase + Hp, a0[1]], [a1[0], yBase + Hp, a1[1]], [b1[0], yBase + Hp, b1[1]], [b0[0], yBase + Hp, b0[1]]], [0, 1, 0], cap);
            // the two ends (a run ends at a neighbour, an arch, the end of the visible wall): without them the slab was a hollow sleeve open at both ends. Where two pieces meet at a corner the end faces
            // coincide back to back inside the joint and are never seen.
            const CBp = M.core(mx, mz);
            CBp.quad([[a0[0], yBase, a0[1]], [b0[0], yBase, b0[1]], [b0[0], yBase + Hp, b0[1]], [a0[0], yBase + Hp, a0[1]]], [-e.dx, 0, -e.dz], col);
            CBp.quad([[a1[0], yBase, a1[1]], [b1[0], yBase, b1[1]], [b1[0], yBase + Hp, b1[1]], [a1[0], yBase + Hp, a1[1]]], [e.dx, 0, e.dz], col);
            tris += 10; nP++;
          }
        }
      }
      tag(null);
    }
  }
  return { triangles: tris, gables: nG, parapets: nP };
}
