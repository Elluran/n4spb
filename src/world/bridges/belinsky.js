// Photo references supplied by the user: three low masonry openings, two solid
// granite river piers, green fascia, rectangular pier parapets, no tower pylons.
// Reuse the mapped bank-fitting deck and its walking/vehicle surface service.
import { makeArch } from './arch.js';
import { toUV, EXT } from './sites.js';

export function makeBelinsky(e, site) {
  const { P, M, ctx } = e, B = makeArch(e, site);
  const green = ctx.mat.toon('#456f58', { name: 'belinsky-green', paint: 0.03 });
  const deckAt = B.deckAt;
  B.deckAt = (x, z) => {
    const y = deckAt(x, z);
    return y === null ? null : y + (Math.abs(toUV(site, x, z).v) > 6.9 ? 0.12 : 0);
  };
  B.colliders = () => {
    for (const [va0, vb0, kind] of site.zones) {
      const nv = Math.ceil((vb0 - va0) / 3), lift = kind === 'pave' ? 0.12 : 0;
      for (let k = 0; k < nv; k++) {
        const va = va0 + (vb0 - va0) * k / nv, vb = va0 + (vb0 - va0) * (k + 1) / nv;
        const [a0, b0] = B.bank(va), [a1, b1] = B.bank(vb);
        const ua = Math.max(a0, a1) - EXT, ub = Math.min(b0, b1) + EXT, n = Math.ceil((ub - ua) / 3);
        for (let i = 0; i < n; i++) {
          const a = ua + (ub - ua) * i / n, b = ua + (ub - ua) * (i + 1) / n, w = B.world((a + b) / 2, (va + vb) / 2);
          ctx.physics.addWalkRamp(w.x, w.z, vb - va + 0.02, b - a + 0.04, Math.atan2(B.f.c, B.f.s), B.yDeck(a) + lift, B.yDeck(b) + lift, 1.0);
          B.info.colliders++;
        }
      }
    }
  };
  B.draw = () => {
    B.drawDeck();
    P.push(B.f.cx, 0, B.f.cz, -B.T);
    const cuts = (v) => {
      const [a, b] = B.bank(v), len = b - a, mid = (a + b) / 2;
      const pier = 2.5, middle = len * 0.245;
      return [[a, mid - middle / 2 - pier], [mid - middle / 2, mid + middle / 2], [mid + middle / 2 + pier, b]];
    };
    // Each opening gets a true soffit all the way across the bridge width.
    for (let k = 0; k + 1 < B.vs.length; k++) {
      const va = B.vs[k], vb = B.vs[k + 1], ca = cuts(va), cb = cuts(vb);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 24; i++) {
        const t0 = i / 24, t1 = (i + 1) / 24;
        const q = (c, t, v) => { const u = c[0] + (c[1] - c[0]) * t; return [u, B.archY(...c, u), v]; };
        P.quad(M.vault, q(ca[j], t0, va), q(ca[j], t1, va), q(cb[j], t1, vb), q(cb[j], t0, vb), [0, -1, 0]);
      }
      for (let j = 0; j < 2; j++) {
        const a = ca[j][1], b = ca[j + 1][0], c = cb[j][1], d = cb[j + 1][0];
        for (const sg of [-1, 1]) {
          const u0 = sg < 0 ? a : b, u1 = sg < 0 ? c : d;
          P.quad(M.granite, [u0, -3.8, va], [u1, -3.8, vb], [u1, B.springY, vb], [u0, B.springY, va], [sg, 0, 0]);
        }
      }
    }
    for (const sg of [-1, 1]) {
      const v = sg < 0 ? site.v0 : site.v1, spans = cuts(v), [a, b] = B.bank(v);
      const bottom = -3.8;
      // One spandrel silhouette with three separate openings extending to water.
      const outline = [[a - 0.8, bottom]];
      for (const c of spans) { outline.push([c[0], bottom]); outline.push(...B.archPts(...c, 28)); outline.push([c[1], bottom]); }
      outline.push([b + 0.8, bottom], [b + 0.8, B.yDeck(b + 0.8) - 0.35]);
      for (let i = 24; i >= 0; i--) { const u = a - 0.8 + (b - a + 1.6) * i / 24; outline.push([u, B.yDeck(u) - 0.35]); }
      B.faceShape(M.granite, outline, v, sg, 2.2, 0, bottom);
      for (const c of spans) {
        const pts = B.archPts(...c, 28);
        // Subtle radial joints rather than an oversized decorative arch ring.
        for (let i = 0; i + 1 < pts.length; i++) {
          const A = pts[i], C = pts[i + 1];
          P.quad(M.voussoir, [A[0], A[1], v + sg * 0.015], [C[0], C[1], v + sg * 0.015], [C[0], C[1] + 0.27, v + sg * 0.015], [A[0], A[1] + 0.27, v + sg * 0.015], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        }
      }
      // Green steel cantilever edge sits above the granite, as in the photos.
      for (let i = 0; i < 24; i++) {
        const u0 = a - 0.8 + (b - a + 1.6) * i / 24, u1 = a - 0.8 + (b - a + 1.6) * (i + 1) / 24;
        P.box(green, u0, u1, B.yDeck((u0 + u1) / 2) - 0.36, B.yDeck((u0 + u1) / 2) - 0.03, v - 0.18, v + 0.18);
      }
      B.railLine(sg, a - 0.8, b + 0.8, 'loops', '#385a47', { postMat: green, postW: 0.09, bay: 2.3, lift: 0.14 });
      B.faceCollider(sg, a - 0.8, b + 0.8, 0.15, 0.3);
      for (let j = 0; j < 2; j++) {
        const u = (spans[j][1] + spans[j + 1][0]) / 2;
        // Triangular cutwater nose extending into the river.
        const tri = [[u - 1.25, v], [u + 1.25, v], [u, v + sg * 1.8]];
        P.fan(M.granite, tri.map(([x, z]) => [x, -0.75, z]), [0, 1, 0]);
        for (let i = 0; i < 3; i++) { const A = tri[i], C = tri[(i + 1) % 3]; P.quad(M.granite, [A[0], bottom, A[1]], [C[0], bottom, C[1]], [C[0], -0.75, C[1]], [A[0], -0.75, A[1]], [0, 0, sg]); }
        P.box(green, u - 1.4, u + 1.4, B.yDeck(u) + 0.12, B.yDeck(u) + 1.32, v - 0.3, v + 0.3);
        P.box(green, u - 1.52, u + 1.52, B.yDeck(u) + 1.32, B.yDeck(u) + 1.42, v - 0.38, v + 0.38);
      }
    }
    P.pop();
  };
  return B;
}
