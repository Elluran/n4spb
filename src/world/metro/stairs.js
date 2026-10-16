// metro/stairs.js — service stairs from the track bed up to the platform (so a 1.0 m drop off the platform edge never traps the walker): five treads at both platform ends on both sides.
export function serviceStairs(ctx, M, S, o) {
  const { FY, BED, EDGE, zs } = o, bedTop = BED + 0.12, n = 5, run = 1.3, k = S.k;
  for (const sx of o.sides || [-1, 1]) for (const zc of zs) {
    const [cx, cz] = S.W(sx * (EDGE + run / 2), zc);
    ctx.physics.addStairs(cx, cz, 1.5, run, S.frame.yaw - sx * Math.PI / 2, bedTop, FY, n);
    for (let i = 0; i < n; i++) { const top = bedTop + (FY - bedTop) * (i + 1) / n, x0 = sx * (EDGE + run - run * i / n), x1 = sx * EDGE; k.box(Math.abs(x1 - x0) + 0.0, top - BED, 1.5, M.steelDark, [(x0 + x1) / 2 + (0), BED + (top - BED) / 2, zc]); }
    S.bx(sx * EDGE - 0.02, sx * EDGE + 0.02, FY, FY + 0.9, zc - 0.78, zc - 0.74, M.steel); S.bx(sx * EDGE - 0.02, sx * EDGE + 0.02, FY, FY + 0.9, zc + 0.74, zc + 0.78, M.steel);
  }
}
