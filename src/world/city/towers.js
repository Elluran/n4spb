// towers.js - hand-built towers of the generic city that the wall shader cannot do: the City Duma tower (Nevsky 33, 1799-1804 + 1850s, 47 m) that closes the view of Nevsky from 2 km away.
//   Source: docs/research/west-nevsky-1.md (Nevsky 33 record), photo refs/west-nevsky-1/34_n33_duma_tower.jpg: five stages narrowing upwards, coral-red walls (#d8604a) with white
//   Corinthian pilaster pairs on every corner, two clock faces on the second stage, bell openings on the third, an iron balustrade gallery, a small white lantern with two arched windows
//   and a black steel lattice mast on top (no flags). Everything is vertex-coloured boxes / quads in the `core` stream (always drawn); ~900 triangles per tower.
//   Entry: buildTowers(ctx, { M, items }) with items = [{ b, st }] whose st.custom === 'duma'. The footprint comes from the OSM record (oriented box), the tower stands from the ground.
import * as THREE from 'three';
import { obb } from './archetypes.js';
import { triFacing, quadFacing } from './kit.js';

const C = (h) => new THREE.Color(h);

function duma(ctx, M, b, st) {
  const ob = obb(b.polys[0]);
  const ux = ob.ux, uz = ob.uz, nx = -uz, nz = ux;            // u = long axis, n = short axis
  const cx = ob.cx, cz = ob.cz;
  const hu0 = Math.min(ob.w, 12) / 2 * 0.97, hn0 = Math.min(ob.d, 11) / 2 * 0.97;
  const wall = C(st.hex || '#d8604a'), white = C('#f2efe8'), dark = C('#26323f'), roof = C('#6e7378'), iron = C('#1d1f20'), gold = C('#c8a448');
  const B = M.core(cx, cz);
  const tri = (a, b, c, n, col) => triFacing(B, a, b, c, n, col);            // ColorBuilder.tri keeps the winding it is given: the clock faces and the pyramid roof were wound inside out (culled from outside)
  const P = (s, y, t) => [cx + ux * s + nx * t, y, cz + uz * s + nz * t];
  // an axis-aligned (in the tower frame) box from s0..s1, t0..t1, y0..y1
  const box = (s0, s1, t0, t1, y0, y1, c, bottom = false) => {          // bottom: the underside, for the boxes that overhang the one below (entablature, gallery, lantern cap)
    B.quad([P(s0, y0, t1), P(s1, y0, t1), P(s1, y1, t1), P(s0, y1, t1)], [nx, 0, nz], c);
    B.quad([P(s0, y0, t0), P(s1, y0, t0), P(s1, y1, t0), P(s0, y1, t0)], [-nx, 0, -nz], c);
    B.quad([P(s1, y0, t0), P(s1, y0, t1), P(s1, y1, t1), P(s1, y1, t0)], [ux, 0, uz], c);
    B.quad([P(s0, y0, t0), P(s0, y0, t1), P(s0, y1, t1), P(s0, y1, t0)], [-ux, 0, -uz], c);
    B.quad([P(s0, y1, t0), P(s1, y1, t0), P(s1, y1, t1), P(s0, y1, t1)], [0, 1, 0], c);
    if (bottom) B.quad([P(s0, y0, t0), P(s1, y0, t0), P(s1, y0, t1), P(s0, y0, t1)], [0, -1, 0], c);
  };
  // decoration on the four faces of a stage: face f: 0 +t (nx), 1 -t, 2 +s, 3 -s. Returns the face frame helper
  const face = (hu, hn, f, fn) => {
    const hor = f < 2, half = hor ? hu : hn, off = hor ? hn : hu, sg = f % 2 === 0 ? 1 : -1;
    const at = (a, y, o) => (hor ? P(a, y, sg * (off + o)) : P(sg * (off + o), y, a));
    const n = hor ? [nx * sg, 0, nz * sg] : [ux * sg, 0, uz * sg];
    fn({ half, at, n });
  };
  const rect = (F, a0, a1, y0, y1, o, c) => B.quad([F.at(a0, y0, o), F.at(a1, y0, o), F.at(a1, y1, o), F.at(a0, y1, o)], F.n, c);
  const windowRect = (F, a, w, y0, h, arched) => {
    rect(F, a - w / 2 - 0.12, a + w / 2 + 0.12, y0 - 0.12, y0 + h + 0.12, 0.04, white);
    rect(F, a - w / 2, a + w / 2, y0, y0 + h, 0.07, dark);
    if (arched) { const k = 5; for (let i = 0; i < k; i++) { const t0 = Math.PI * i / k, t1 = Math.PI * (i + 1) / k, r = w / 2; quadFacing(B, [F.at(a - Math.cos(t0) * r, y0 + h, 0.07), F.at(a - Math.cos(t1) * r, y0 + h, 0.07), F.at(a - Math.cos(t1) * r, y0 + h + Math.sin(t1) * r, 0.07), F.at(a - Math.cos(t0) * r, y0 + h + Math.sin(t0) * r, 0.07)], F.n, dark); } }
    rect(F, a - 0.04, a + 0.04, y0, y0 + h, 0.09, white);
  };
  const stage = (hu, hn, y0, y1, o) => {
    box(-hu, hu, -hn, hn, y0, y1, wall);
    // corner pilasters (white) with a capital block on top
    for (const su of [-1, 1]) for (const sn of [-1, 1]) {
      const s0 = su > 0 ? hu - 0.7 : -hu - 0.28, s1 = su > 0 ? hu + 0.28 : -hu + 0.7, t0 = sn > 0 ? hn - 0.7 : -hn - 0.28, t1 = sn > 0 ? hn + 0.28 : -hn + 0.7;
      box(s0, s1, t0, t1, y0, y1 - 0.6, white);
      box(s0 - (su > 0 ? 0 : 0.1), s1 + (su > 0 ? 0.1 : 0), t0 - (sn > 0 ? 0 : 0.1), t1 + (sn > 0 ? 0.1 : 0), y1 - 0.6, y1 - 0.2, white);
    }
    // entablature
    box(-hu - o, hu + o, -hn - o, hn + o, y1 - 0.2, y1 + 0.9, white, true);
    box(-hu - o * 0.5, hu + o * 0.5, -hn - o * 0.5, hn + o * 0.5, y1 - 0.5, y1 - 0.2, white, true);
  };
  const y1a = 19, y2a = 31, y3a = 40;
  // stage 1 (base: the tower rises out of the Duma building corner), plain walls with two window rows per face
  stage(hu0, hn0, 0, y1a, 0.7);
  for (let f = 0; f < 4; f++) face(hu0, hn0, f, (F) => { for (const y of [4.4, 10.6, 15.6]) for (const a of [-F.half * 0.38, F.half * 0.38]) windowRect(F, a, 0.9, y, 2.0, false); });
  // stage 2: clocks
  const hu1 = hu0 * 0.9, hn1 = hn0 * 0.9;
  stage(hu1, hn1, y1a + 0.9, y2a, 0.6);
  for (let f = 0; f < 4; f++) face(hu1, hn1, f, (F) => {
    windowRect(F, 0, 1.0, y1a + 2.0, 2.2, false);
    // clock: white disc (octagon of 8 quads), black hands
    const cy = y1a + 7.6, r = 1.45, k = 12;
    for (let i = 0; i < k; i++) { const a0 = i / k * Math.PI * 2, a1 = (i + 1) / k * Math.PI * 2; tri(F.at(0, cy, 0.06), F.at(Math.cos(a0) * r, cy + Math.sin(a0) * r, 0.06), F.at(Math.cos(a1) * r, cy + Math.sin(a1) * r, 0.06), F.n, C('#f6f4ec')); }
    rect(F, -0.06, 0.06, cy, cy + r * 0.8, 0.09, iron); rect(F, 0, r * 0.62, cy - 0.06, cy + 0.06, 0.09, iron);
  });
  // stage 3: bell openings
  const hu2 = hu1 * 0.88, hn2 = hn1 * 0.88;
  stage(hu2, hn2, y2a + 0.9, y3a, 0.55);
  for (let f = 0; f < 4; f++) face(hu2, hn2, f, (F) => { windowRect(F, 0, 1.2, y2a + 2.4, 3.6, true); });
  // balustrade gallery
  const gu = hu2 + 0.4, gn = hn2 + 0.4;
  box(-gu, gu, -gn, gn, y3a + 0.9, y3a + 1.15, white, true);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; void a; }
  const rail = (s0, s1, t0, t1) => box(s0, s1, t0, t1, y3a + 1.15, y3a + 2.0, white);
  rail(-gu, gu, gn - 0.12, gn); rail(-gu, gu, -gn, -gn + 0.12); rail(gu - 0.12, gu, -gn, gn); rail(-gu, -gu + 0.12, -gn, gn);
  // stage 4: lantern
  const lu = hu2 * 0.62, ln = hn2 * 0.62;
  box(-lu, lu, -ln, ln, y3a + 0.9, y3a + 6.2, wall);
  for (let f = 0; f < 4; f++) face(lu, ln, f, (F) => windowRect(F, 0, 0.9, y3a + 2.1, 2.4, true));
  box(-lu - 0.4, lu + 0.4, -ln - 0.4, ln + 0.4, y3a + 6.2, y3a + 6.9, white, true);
  // pyramid roof + gilt ball + steel mast (thin lattice of 4 posts)
  const top = y3a + 6.9;
  const apex = P(0, top + 1.6, 0);
  for (const [a, b2] of [[[-lu - 0.4, -ln - 0.4], [lu + 0.4, -ln - 0.4]], [[lu + 0.4, -ln - 0.4], [lu + 0.4, ln + 0.4]], [[lu + 0.4, ln + 0.4], [-lu - 0.4, ln + 0.4]], [[-lu - 0.4, ln + 0.4], [-lu - 0.4, -ln - 0.4]]]) {
    const pa = P(a[0], top, a[1]), pb = P(b2[0], top, b2[1]); const mx = (pa[0] + pb[0]) / 2 - cx, mz = (pa[2] + pb[2]) / 2 - cz, l = Math.hypot(mx, mz) || 1;
    tri(pa, pb, apex, [mx / l * 0.8, 0.6, mz / l * 0.8], roof);
  }
  const mast = (s, t) => box(s - 0.07, s + 0.07, t - 0.07, t + 0.07, top + 1.4, top + 10, iron);
  mast(-0.35, -0.35); mast(0.35, -0.35); mast(0.35, 0.35); mast(-0.35, 0.35);
  box(-0.4, 0.4, -0.4, 0.4, top + 4.5, top + 4.62, iron); box(-0.4, 0.4, -0.4, 0.4, top + 7.5, top + 7.62, iron);
  const ballY = top + 1.6 * (1 - 0.28 / (lu + 0.4));                          // the gilt ball sits ON the pyramid: its underside starts where the roof is as wide as the ball (it hung in the hollow tip before)
  box(-0.28, 0.28, -0.28, 0.28, ballY, ballY + 0.5, gold, true);
  // colliders: the shaft footprint
  if (ctx.physics && ctx.physics.addBox) {
    const ang = Math.atan2(-uz, ux);
    ctx.physics.addBox(cx, cz, hu0 * 2, hn0 * 2, ang, 0, y1a + 2);
  }
  return B;
}

export function buildTowers(ctx, { M, items }) {
  let n = 0;
  for (const { b, st } of items) {
    try { if (st.custom === 'duma') { duma(ctx, M, b, st); n++; } } catch (e) { console.warn('[city] tower failed', b.id, e && e.message); }
  }
  return { towers: n, triangles: n * 900 };
}
