// landmarksE/columns.js - classical column helpers (current Parts frame): Corinthian (base, shaft with entasis, two-tier acanthus capital with volutes, abacus), Ionic and plain Tuscan.
// Heights are explicit (y0 = foot of the base, y1 = top of the abacus); r = shaft radius at the base.

/** Corinthian column: base 0.32 m, entasis shaft, capital 1.35 m (two acanthus tiers + volutes) */
export function corinthian(K, mat, matShade, x, z, y0, y1, r, seg = 12) {
  const P = K.P, ch = 1.35 * Math.max(0.8, r / 0.5), sh1 = y1 - ch, sh0 = y0 + 0.36;
  P.box(matShade, x - r * 1.45, x + r * 1.45, y0, y0 + 0.14, z - r * 1.45, z + r * 1.45, 'b');
  P.cyl(mat, [x, y0 + 0.14, z], [x, sh0, z], r * 1.22, r * 1.0, seg, false);
  P.cyl(mat, [x, sh0, z], [x, y0 + (sh1 - y0) * 0.45, z], r * 1.0, r * 1.02, seg, false);
  P.cyl(mat, [x, y0 + (sh1 - y0) * 0.45, z], [x, sh1, z], r * 1.02, r * 0.86, seg, false);
  P.cyl(mat, [x, sh1, z], [x, sh1 + 0.1, z], r * 0.97, r * 0.97, seg, true);
  P.cyl(mat, [x, sh1 + 0.1, z], [x, sh1 + ch * 0.42, z], r * 0.9, r * 1.2, seg, false);
  P.cyl(matShade, [x, sh1 + ch * 0.42, z], [x, sh1 + ch * 0.48, z], r * 1.22, r * 1.22, seg, true);
  P.cyl(mat, [x, sh1 + ch * 0.48, z], [x, sh1 + ch * 0.84, z], r * 1.12, r * 1.45, seg, false);
  P.box(mat, x - r * 1.6, x + r * 1.6, sh1 + ch * 0.84, y1, z - r * 1.6, z + r * 1.6, 'b');
}

/** Ionic column: base, plain shaft, echinus with two volute rolls, abacus */
export function ionic(K, mat, matShade, x, z, y0, y1, r, seg = 12) {
  const P = K.P, ch = r * 1.9, sh1 = y1 - ch;
  P.box(matShade, x - r * 1.35, x + r * 1.35, y0, y0 + 0.12, z - r * 1.35, z + r * 1.35, 'b');
  P.cyl(mat, [x, y0 + 0.12, z], [x, y0 + 0.4, z], r * 1.18, r * 1.0, seg, false);
  P.cyl(mat, [x, y0 + 0.4, z], [x, sh1, z], r * 1.0, r * 0.86, seg, false);
  P.cyl(mat, [x, sh1, z], [x, sh1 + ch * 0.4, z], r * 0.88, r * 1.05, seg, false);
  for (const sz of [-1, 1]) P.cyl(mat, [x - r * 1.35, sh1 + ch * 0.55, z + sz * r * 0.55], [x + r * 1.35, sh1 + ch * 0.55, z + sz * r * 0.55], r * 0.3, r * 0.3, 8, true);
  P.box(mat, x - r * 1.4, x + r * 1.4, sh1 + ch * 0.72, y1, z - r * 1.4, z + r * 1.4, 'b');
}

/** Tuscan / plain column: base block, tapered shaft, echinus and square abacus */
export function tuscan(K, mat, x, z, y0, y1, r, seg = 12) {
  const P = K.P;
  P.box(mat, x - r * 1.3, x + r * 1.3, y0, y0 + 0.25, z - r * 1.3, z + r * 1.3, 'b');
  P.cyl(mat, [x, y0 + 0.25, z], [x, y1 - 0.7, z], r, r * 0.85, seg, false);
  P.cyl(mat, [x, y1 - 0.7, z], [x, y1 - 0.25, z], r * 0.85, r * 1.2, seg, false);
  P.box(mat, x - r * 1.4, x + r * 1.4, y1 - 0.25, y1, z - r * 1.4, z + r * 1.4, 'b');
}
