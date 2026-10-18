// bridges/eng1.js - the 1st Engineer Bridge (1-й Инженерный мост, Moika at the mouth beside the Mikhailovsky Castle), drawn on top of the generic arch of arch.js (look 'eng1' in mats.js: dark cast-iron
// fascia between full-height pink-grey granite abutments, iron cornice).  What the photo (Yandex panorama) shows and what is built here, all in the site frame u / y / v:
//   * a row of round medallion reliefs along the spandrel under the cornice (flat discs with a boss, 5-7 cm proud), the clearance board "2.6" in the gap at mid-span
//   * an openwork row of small balusters along the intrados edge (a strip of alpha-cut spindles standing 4 cm in front of the fascia, between two rolled mouldings)
//   * the carriageway railing: black cast-iron fence of thin round bars between a top rail and a bottom rail ('barsE', rails2.js), on slim posts that carry a cast trophy medallion
//     (round shield with a boss over crossed spears) on the outer face
//   * four big granite end-posts with chamfered tops (stepped foot, 0.9 m square) at the abutment ends, each carrying a tall black cast-iron lamp standard: scrolled foot, slim pole with gilt collars,
//     hexagonal lantern with gilt corner posts, crown and finial, four small gilt urns on the post top (photo: the gilt bits at the foot of the lamp)
//   * the granite wing parapets beyond the posts and the walk / drive colliders are exactly the ones of the generic bridge (nothing stands on the carriageway: posts, lamps and trophies sit on the pavement line)
// NO flags (user rules); every material comes from ctx.mat (via mats.js / the local toon materials below).
import * as THREE from 'three';

const frame = (B, P, fn) => { P.push(B.f.cx, 0, B.f.cz, -B.T); try { fn(); } finally { P.pop(); } };
const sph = (P, mat, x, y, z, rx, ry = rx, rz = rx, seg = 6) => P.geo(mat, new THREE.SphereGeometry(1, seg, Math.max(3, seg - 2)), x, y, z, 0, 0, 0, rx, ry, rz);
const IRON = '#202428';

/** local materials, made once per build (M is the bridges module's material set) */
function mats(ctx, M) {
  if (M.eng1Strip) return M;
  const T = ctx.mat.toon;
  M.eng1Disc = T('#5a655e', { paint: 0.03, name: 'brg-eng1-disc' });
  M.eng1Ring = T('#7c877f', { paint: 0.03, name: 'brg-eng1-ring' });
  // the baluster strip: tile 0.6 m x 0.3 m = five turned spindles between two rails (white on clear: the toon colour tints it, cut by alphaTest like the railing panels)
  const PX = 400, W = 240, H = 120;
  const map = ctx.tex.draw(W, H, (g) => {
    g.clearRect(0, 0, W, H);
    const p = (m) => m * PX;
    g.fillStyle = '#ffffff'; g.strokeStyle = '#ffffff'; g.lineCap = 'round';
    g.fillRect(0, 0, W, p(0.035)); g.fillRect(0, H - p(0.03), W, p(0.03));
    for (let i = 0; i < 5; i++) {
      const x = p((i + 0.5) * 0.12);
      g.lineWidth = p(0.02); g.beginPath(); g.moveTo(x, p(0.03)); g.lineTo(x, H - p(0.03)); g.stroke();
      g.beginPath(); g.ellipse(x, H * 0.5, p(0.036), p(0.05), 0, 0, 6.3); g.fill();                  // the bulb of the baluster
      g.fillRect(x - p(0.026), p(0.05), p(0.052), p(0.016)); g.fillRect(x - p(0.026), H - p(0.07), p(0.052), p(0.016));
    }
  }, { key: 'brg-eng1-balust', repeat: [1, 1], anisotropy: 8 });
  M.eng1Strip = T('#6c776f', { map, alphaTest: 0.5, side: 'double', paint: 0.02, name: 'brg-eng1-balust' });
  return M;
}

/** the cast trophy on a post: a round shield with a boss over two crossed spears; `sg` = side the medallion faces (along v), (u, y) = its centre, v = the post face */
export function trophy(P, M, u, y, v, sg) {
  const d = (k) => v + sg * k;
  for (const k of [-1, 1]) {                                                                         // the two spears, crossed behind the shield, with small heads
    P.cyl(M.iron, [u - 0.27 * k, y - 0.27, d(0.012)], [u + 0.27 * k, y + 0.27, d(0.012)], 0.014, 0.013, 4, false);
    P.cyl(M.iron, [u + 0.27 * k, y + 0.27, d(0.012)], [u + 0.34 * k, y + 0.36, d(0.012)], 0.04, 0.004, 4, true);
  }
  P.cyl(M.cap, [u, y, d(-0.01)], [u, y, d(0.055)], 0.19, 0.17, 8, true);                             // the shield
  P.cyl(M.iron, [u, y, d(0.055)], [u, y, d(0.085)], 0.08, 0.045, 6, true);                            // the boss
}

/** the granite end-post of the bridge (0.92 m square foot, 0.8 m shaft, chamfered top), top at y1 */
function endPost(P, M, u, y0, y1, v) {
  P.box(M.pylon, u - 0.46, u + 0.46, y0, y0 + 0.22, v - 0.46, v + 0.46, 'b', 1.2);                   // stepped foot
  P.box(M.coping, u - 0.43, u + 0.43, y0 + 0.22, y0 + 0.28, v - 0.43, v + 0.43, 'b', 1);             // a thin band over the foot
  P.box(M.pylon, u - 0.4, u + 0.4, y0 + 0.28, y1 - 0.2, v - 0.4, v + 0.4, 'bt', 1.1);                // shaft
  P.push(u, 0, v, Math.PI / 4);
  P.cyl(M.coping, [0, y1 - 0.2, 0], [0, y1, 0], 0.435 * Math.SQRT2, 0.3 * Math.SQRT2, 4, true);      // the chamfer: a square frustum, lid 0.6 m
  P.pop();
}

/** the lamp standard of the bridge on its end-post: foot at (x, y, z), ~4.6 m tall with the lantern, black cast iron + gilding */
export function lampEng1(P, M, x, y, z) {
  const iron = M.iron, gold = M.gold, H = 3.6;
  P.cyl(iron, [x, y, z], [x, y + 0.16, z], 0.18, 0.14, 8, true);                                     // cast foot plate
  for (let i = 0; i < 4; i++) {                                                                       // four scrolled legs sweeping from the plate into the pole
    const a = i * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
    P.cyl(iron, [x + c * 0.17, y + 0.12, z + s * 0.17], [x + c * 0.14, y + 0.5, z + s * 0.14], 0.028, 0.024, 4, false);
    P.cyl(iron, [x + c * 0.14, y + 0.5, z + s * 0.14], [x + c * 0.045, y + 1.05, z + s * 0.045], 0.024, 0.018, 4, false);
    sph(P, iron, x + c * 0.19, y + 0.2, z + s * 0.19, 0.05, 0.05, 0.05, 5);                          // the curl at the foot
  }
  P.cyl(iron, [x, y + 0.16, z], [x, y + H, z], 0.07, 0.045, 8, false);                                // pole
  P.cyl(gold, [x, y + 1.0, z], [x, y + 1.1, z], 0.09, 0.09, 8, true);                                 // gilt collars
  P.cyl(gold, [x, y + 2.6, z], [x, y + 2.67, z], 0.065, 0.065, 8, true);
  P.cyl(iron, [x, y + H, z], [x, y + H + 0.14, z], 0.05, 0.26, 6, true);                              // cup under the lantern
  const ly = y + H + 0.14, lh = 0.8;
  P.cyl(M.lampGlass, [x, ly, z], [x, ly + lh, z], 0.24, 0.28, 6, false);                              // glass
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; P.cyl(gold, [x + Math.cos(a) * 0.24, ly, z + Math.sin(a) * 0.24], [x + Math.cos(a) * 0.285, ly + lh, z + Math.sin(a) * 0.285], 0.018, 0.018, 4, false); }
  P.cyl(gold, [x, ly + lh - 0.02, z], [x, ly + lh + 0.05, z], 0.31, 0.31, 6, false);                  // gilt crown band
  P.cyl(iron, [x, ly + lh + 0.05, z], [x, ly + lh + 0.38, z], 0.33, 0.04, 6, true);                    // roof
  sph(P, gold, x, ly + lh + 0.43, z, 0.05, 0.06, 0.045, 5);                                          // finial
  P.cyl(gold, [x, ly + lh + 0.47, z], [x, ly + lh + 0.68, z], 0.012, 0.003, 4, true);
  for (let i = 0; i < 4; i++) {                                                                       // four small gilt urns on the post top (photo)
    const a = i * Math.PI / 2, c = Math.cos(a) * 0.23, s = Math.sin(a) * 0.23;
    P.cyl(gold, [x + c, y, z + s], [x + c, y + 0.2, z + s], 0.04, 0.014, 5, true);
    sph(P, gold, x + c, y + 0.215, z + s, 0.022, 0.03, 0.022, 4);
  }
}

/** the 1st Engineer style (called by styles2.js with e = { P, M, ctx }, B = the arch bridge) */
export const eng1 = (e, B) => {
  const { P, ctx } = e, M = mats(ctx, e.M), site = B.site;
  frame(B, P, () => {
    for (const sg of [-1, 1]) {
      const fi = B.faceInfo(sg), a = fi.a, b = fi.b, v = fi.v;
      // ---- the railing and the trophy posts
      const r = B.railLine(sg, a, b, 'barsE', IRON, { postMat: M.iron, postW: 0.14 });
      const vp = r.v + sg * 0.07 - sg * 0.01;                                                         // outer face of a post (the trophy stands 1 cm into it)
      for (let i = 1; i < r.n; i++) { const u = a + r.bw * i; trophy(P, M, u, B.yDeck(u) + 0.52, vp, sg); }
      // ---- the medallion row on the spandrel, an even count so the clearance board sits in the gap at mid-span
      const sp = 1.5, N = 2 * Math.floor((b - a - 2.4) / sp / 2);
      for (let k = 0; k < N; k++) {
        const u = B.uc + (k - (N - 1) / 2) * sp, y = B.yDeck(u) - 0.35;
        P.cyl(M.eng1Ring, [u, y, v + sg * 0.012], [u, y, v + sg * 0.04], 0.17, 0.165, 10, true);
        P.cyl(M.eng1Disc, [u, y, v + sg * 0.03], [u, y, v + sg * 0.058], 0.135, 0.125, 10, true);
        P.cyl(M.iron, [u, y, v + sg * 0.058], [u, y, v + sg * 0.078], 0.05, 0.03, 6, true);
      }
      { const yb = B.yDeck(B.uc) - 0.35 - 0.17, vb = v + sg * 0.06; P.quad(M.clear(site.clear), [B.uc - sg * 0.17, yb, vb], [B.uc + sg * 0.17, yb, vb], [B.uc + sg * 0.17, yb + 0.34, vb], [B.uc - sg * 0.17, yb + 0.34, vb], [0, 0, sg], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
      // ---- the openwork baluster row along the intrados edge: a strip following the arch, 4 cm in front of the fascia, under a thin upper moulding
      const pts = B.archPts(a, b, 36), hs = 0.24, y0 = 0.06, vs = v + sg * 0.04;
      let s = 0; const arc = [0];
      for (let i = 1; i < pts.length; i++) { s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); arc.push(s); }
      for (let i = 0; i + 1 < pts.length; i++) {
        const [u0, ya] = pts[i], [u1, yb2] = pts[i + 1];
        P.quad(M.eng1Strip, [u0, ya + y0, vs], [u1, yb2 + y0, vs], [u1, yb2 + y0 + hs, vs], [u0, ya + y0 + hs, vs], [0, 0, sg], [[arc[i] / 0.6, 0], [arc[i + 1] / 0.6, 0], [arc[i + 1] / 0.6, 1], [arc[i] / 0.6, 1]]);
      }
      // thin vertical ribs between the medallions (the panel joints of the cast fascia), from the baluster moulding up to the cornice
      for (let k = -Math.floor(N / 2) + 1; k <= Math.floor(N / 2) - 1; k++) {
        const u = B.uc + k * sp; if (k === 0) continue;
        const ya = B.archY(a, b, u) + y0 + hs + 0.065, yt = B.yDeck(u) - 0.2;
        if (yt - ya > 0.02) P.quad(M.looks.eng1.mould, [u - 0.035, ya, v + sg * 0.025], [u + 0.035, ya, v + sg * 0.025], [u + 0.035, yt, v + sg * 0.025], [u - 0.035, yt, v + sg * 0.025], [0, 0, sg]);
      }
      B.tube(M.looks.eng1.mould, pts.map((p) => [p[0], p[1] + y0 + hs + 0.03]), v + sg * 0.05, 0.035, 5);
      // ---- granite wing parapets beyond the end-posts (as the generic bridges) and the face collider
      B.parapet(sg, a - 5.1, a - 0.95, 1.05, 0.5, M.parapetPink); B.parapet(sg, b + 0.95, b + 5.1, 1.05, 0.5, M.parapetPink);
      B.faceCollider(sg, a - 5.2, b + 5.2, 0.25, 0.6);
      // ---- the four end-posts with their lamp standards (same footprint as the generic corner blocks: 0.9 m, on the pavement edge)
      for (const u of [a - 0.45, b + 0.45]) {
        const vc = sg < 0 ? v + 0.45 : v - 0.45, y0b = B.yDeck(u) - 0.1, top = y0b + 1.4;
        endPost(P, M, u, y0b, top, vc);
        lampEng1(P, M, u, top, vc);
      }
    }
  });
};
