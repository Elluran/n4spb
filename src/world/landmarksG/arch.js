// landmarksG/arch.js - the Triumphal Arch of the General Staff (Rossi / Jaquot 1828) with the Chariot of Glory, and the walkable double passage to Bolshaya Morskaya.
// Geometry (docs/research/palace-square-hermitage.md section 6, refs/palace-square 082 083 093 098; OSM roofs w100016301 (u 131-141) and w102048766 (u 162-187)):
//   OUTER ARCH  front plane u = 131, 24.3 m wide, 10 m deep, opening 17 m wide / 19.3 m high, white archivolt, four free Corinthian columns (two pairs) with olive warriors between them, two winged
//   Victories on globes in the spandrels, armour trophies, Greek key at the base, entablature 20.3 -> 24.8 m with the trophy frieze, attic with 12 fasces and 11 helmets to 28 m, and on top the
//   Chariot of Glory (Victory with a bare labarum, six rearing horses and two Roman warriors, olive-green copper, top at 36.6 m).  Coffered barrel vault inside.
//   GAP u 141-162 between the wing flanks (open, paved).  INNER ARCH u 162-187: smaller (11.8 m wide, 14.5 m high), the face towards Bolshaya Morskaya carries the big olive trophies and the clock.
//   Colliders: the four pylons (the OSM wing walls cover the rest), the passage stays open.
import * as THREE from 'three';
import * as L from '../layout.js';
import { ARCH, toWorld, rotFacing, C, S } from './frame.js';
import { corinthian } from './gstaff.js';
import { horse, warrior, victory } from './sculpt.js';
import { archPath, rectPath } from './kit.js';

const FRONT = Math.atan2(-C, -S);                      // local +z = -u (towards the square), local +x = +v
const BACK = Math.atan2(C, S);                          // local +z = +u, local +x = -v

export function build(K, ctx) {
  const P = K.P, GM = K.G.M, G = K.G;
  const A = ARCH, W = 24.3, xc = W / 2, D = 10;
  const TOPENT = 24.8;
  const [wx, wz] = toWorld(A.u0, A.v0 - xc);
  const R = K.R;                                        // the relief textures (white): trophy, frieze ...
  const olive = GM.olive;
  const oliveTex = (map, name) => { const m = K.mat('#7b7d43', { map: map.map, alphaTest: 0.45, side: 'double', name }); K.decalMats.add(m); return m; };
  const trophyOlive = oliveTex(R.trophy, 'lmG-trophy-olive');

  // ============================================================== the outer block, front face (frame: x along +v, z out to the square)
  P.push(wx, 0, wz, FRONT);
  archFace(K, { W, xc, span: A.span, crown: A.crown, wallTop: 24.0, plinthH: 2.6, ring: 0.75, ringD: 0.3, pylonX: 3.65 });
  // plinth blocks on the pylons only (pink granite), 12 cm proud
  const plinthTex = K.rust('#a98b80');
  for (const [x0, x1] of [[0, 3.65], [W - 3.65, W]]) P.box(plinthTex, x0, x1, 0, 2.6, 0, 0.12, 'k', 2.4);
  // Greek key base band (white) at y 9.0 - 10.1 on the pylons and the belt course
  for (const [x0, x1] of [[0, 3.65], [W - 3.65, W]]) {
    P.quad(G.meander, [x0, 9.05, 0.04], [x1, 9.05, 0.04], [x1, 10.05, 0.04], [x0, 10.05, 0.04], [0, 0, 1], [[0, 0], [(x1 - x0), 0], [(x1 - x0), 1], [0, 1]]);
    P.box(GM.white, x0 - (x0 === 0 ? 0.3 : 0), x1 + (x1 === W ? 0.3 : 0), 8.7, 9.0, 0, 0.16, 'k');
  }
  // four free columns on the pylon fronts (two pairs) + olive warriors on olive pedestals between them, armour cartouche above, large armour relief below
  const cols = [0.45, 3.35, W - 3.35, W - 0.45];
  for (const x of cols) corinthian(K, GM.white, GM.whiteShade, x, 0.75, 10.1, 20.3, 0.52);
  for (const [xa, xb, sgn] of [[0.45, 3.35, 1], [W - 3.35, W - 0.45, -1]]) {
    const x = (xa + xb) / 2;
    P.box(olive, x - 0.7, x + 0.7, 9.6, 11.3, 0.3, 1.25, 'b');
    warrior(K, olive, x, 11.3, 0.78, 0, 1.18, { spear: 3.5, shieldMat: GM.oliveDark });
    K.plane(trophyOlive, x - 0.8, x + 0.8, 14.4, 17.0, 0.07);
    K.plane(trophyOlive, x - 0.8, x + 0.8, 3.7, 6.7, 0.17);
    void sgn;
  }
  // spandrel Victories (winged, on globes), mirrored on the right
  const vic = G.victory;
  P.quad(vic, [xc - 8.1, 14.7, 0.07], [xc - 4.0, 14.7, 0.07], [xc - 4.0, 18.9, 0.07], [xc - 8.1, 18.9, 0.07], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  P.quad(vic, [xc + 8.1, 14.7, 0.07], [xc + 4.0, 14.7, 0.07], [xc + 4.0, 18.9, 0.07], [xc + 8.1, 18.9, 0.07], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
  // entablature: architrave, trophy frieze, dentilled cornice, over the whole block + 1.3 m projection
  P.box(GM.white, -0.3, W + 0.3, 20.3, 21.4, 0, 0.55, 'k');
  P.box(GM.wallShade, -0.1, W + 0.1, 21.4, 23.2, 0, 0.3, 'k');
  K.strip(R.frieze, 0.4, W - 0.4, 21.5, 23.1, 0.33, 4);
  P.box(K.mats.dentil, -1.0, W + 1.0, 22.95, 23.35, 0, 1.2, 'k', 0.6);
  P.box(GM.white, -1.3, W + 1.3, 23.35, 24.8, 0, 1.55, 'kt');
  // attic: ochre wall with the fasces / helmet frieze and a white cap, then the low top step
  P.box(GM.wall, 0.7, W - 0.7, 24.8, 27.3, -D + 0.4, -0.2, 'b');
  const fas = G.fasces;
  P.quad(fas, [1.4, 25.2, -0.17], [W - 1.4, 25.2, -0.17], [W - 1.4, 26.9, -0.17], [1.4, 26.9, -0.17], [0, 0, 1], [[0, 0], [12, 0], [12, 1], [0, 1]]);
  P.box(GM.white, 0.2, W - 0.2, 27.3, 27.75, -D + 0.1, 0.35, 'b');
  P.box(GM.wall, xc - 8.2, xc + 8.2, 27.75, 28.0, -D + 0.9, -0.9, 'b');
  // side walls of the block above the wing roofs and the roof of the entablature
  for (const x of [0, W]) P.quad(GM.wall, [x, 23.0, 0], [x, 23.0, -D], [x, 24.8, -D], [x, 24.8, 0], [x === 0 ? -1 : 1, 0, 0]);
  P.quad(GM.roof, [-1.3, 24.8, 1.55], [W + 1.3, 24.8, 1.55], [W + 1.3, 24.8, -D - 1.55], [-1.3, 24.8, -D - 1.55], [0, 1, 0]);

  // the passage: vault + side walls + the open bay behind (outer part, z 0 .. -D)
  vault(K, xc, A.span / 2, A.spring, 0, -D, 24, 'outer');
  P.pop();

  // ============================================================== back face of the outer block (towards the gap), frame facing +u
  const [bx, bz] = toWorld(A.u0 + D, A.v0 + xc);
  P.push(bx, 0, bz, BACK);
  archFace(K, { W, xc, span: A.span, crown: A.crown, wallTop: 24.0, plinthH: 2.6, ring: 0.6, ringD: 0.25, pylonX: 3.65, back: true });
  P.box(GM.white, -0.3, W + 0.3, 20.3, 21.4, 0, 0.35, 'k');
  P.box(GM.white, -0.9, W + 0.9, 22.95, 24.8, 0, 0.9, 'kt');
  P.box(plinthTex, 0, 3.65, 0, 2.6, 0, 0.12, 'k', 2.4); P.box(plinthTex, W - 3.65, W, 0, 2.6, 0, 0.12, 'k', 2.4);
  P.pop();

  // ============================================================== the inner arch (u 162 - 187): faces to the gap and to Bolshaya Morskaya
  const Wi = 20.4, vi = -2.2, spanI = 11.8, crownI = 14.6, springI = crownI - spanI / 2, xci = Wi / 2, Di = A.u2 - A.u1;
  {
    const [ix, iz] = toWorld(A.u1, vi - xci);
    P.push(ix, 0, iz, FRONT);
    archFace(K, { W: Wi, xc: xci, span: spanI, crown: crownI, wallTop: 22.6, plinthH: 2.6, ring: 0.55, ringD: 0.22, pylonX: (Wi - spanI) / 2 });
    P.box(plinthTex, 0, (Wi - spanI) / 2, 0, 2.6, 0, 0.12, 'k', 2.4); P.box(plinthTex, Wi - (Wi - spanI) / 2, Wi, 0, 2.6, 0, 0.12, 'k', 2.4);
    // armour trophies in the spandrels (olive, 2 x 2.6 m) as in photo 093 (seen through the outer arch)
    for (const x of [xci - 4.4, xci + 4.4]) K.plane(trophyOlive, x - 1.25, x + 1.25, springI + 1.1, springI + 4.0, 0.12);
    P.box(GM.white, -0.3, Wi + 0.3, 20.5, 21.3, 0, 0.3, 'k');
    P.box(GM.white, -0.6, Wi + 0.6, 21.3, 22.9, 0, 0.7, 'k');
    vault(K, xci, spanI / 2, springI, 0, -Di, 24, 'inner');
    P.pop();
    // the face to Bolshaya Morskaya (u = 187): big olive trophies in the spandrels, white archivolt, a clock on a bracket, a flat roof
    const [jx, jz] = toWorld(A.u2, vi + xci);
    P.push(jx, 0, jz, BACK);
    archFace(K, { W: Wi, xc: xci, span: spanI + 1.2, crown: crownI + 0.6, wallTop: 22.6, plinthH: 2.6, ring: 0.6, ringD: 0.25, pylonX: (Wi - spanI - 1.2) / 2, back: true });
    P.box(plinthTex, 0, (Wi - spanI - 1.2) / 2, 0, 2.6, 0, 0.12, 'k', 2.4); P.box(plinthTex, Wi - (Wi - spanI - 1.2) / 2, Wi, 0, 2.6, 0, 0.12, 'k', 2.4);
    for (const x of [xci - 4.6, xci + 4.6]) K.plane(trophyOlive, x - 1.45, x + 1.45, springI + 1.4, springI + 4.6, 0.12);
    for (const x0 of [0, Wi - (Wi - spanI - 1.2) / 2]) { const x1 = x0 + (Wi - spanI - 1.2) / 2; P.quad(G.meander, [x0, 9.0, 0.04], [x1, 9.0, 0.04], [x1, 10.0, 0.04], [x0, 10.0, 0.04], [0, 0, 1], [[0, 0], [x1 - x0, 0], [x1 - x0, 1], [0, 1]]); }
    P.box(GM.white, -0.3, Wi + 0.3, 20.3, 21.2, 0, 0.3, 'k');
    P.box(GM.white, -0.7, Wi + 0.7, 21.2, 22.9, 0, 0.85, 'k');
    // clock on its bracket at the right pylon (as seen from Bolshaya Morskaya)
    const cxk = Wi - 1.6;
    P.box(GM.bronze, cxk - 0.12, cxk + 0.12, 10.2, 11.1, 0.1, 0.9, 'b');
    P.cyl(GM.bronze, [cxk, 11.9, 0.95], [cxk, 11.9, 1.25], 1.0, 1.0, 20, true);
    P.cyl(K.mats.shade, [cxk, 11.9, 1.25], [cxk, 11.9, 1.29], 0.82, 0.82, 20, true);
    P.box(GM.black, cxk - 0.04, cxk + 0.04, 11.9, 12.6, 1.29, 1.33, ''); P.box(GM.black, cxk, cxk + 0.55, 11.86, 11.94, 1.29, 1.33, '');
    // the face opening is 0.6 m wider than the passage (archivolt frame): the ledge between them (two strips + a half ring, concentric, same springing) closes the slit into the hollow pier
    { const r0 = spanI / 2, r1 = (spanI + 1.2) / 2, seg = 24, pt = (a, r) => [xci + Math.cos(a) * r, springI + Math.sin(a) * r, 0];
      for (const sg of [-1, 1]) P.quad(GM.wall, [xci + sg * r0, 0, 0], [xci + sg * r1, 0, 0], [xci + sg * r1, springI, 0], [xci + sg * r0, springI, 0], [0, 0, 1]);
      for (let i = 0; i < seg; i++) { const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg; P.quad(GM.wall, pt(a0, r0), pt(a0, r1), pt(a1, r1), pt(a1, r0), [0, 0, 1]); } }
    // the side of the block towards +v (local x = 0 in this frame, outward = -x): no OSM building stands against it south of u = 175 (the wing w. r1453436 ends there), so from Bolshaya Morskaya
    // the block was a hollow shell: the vault and the passage wall were seen through a missing wall. The full side is drawn (where the wing touches it the quad is inside the wing mass).
    { const h = 22.9, uvs = 3; P.quad(GM.wall, [0, 0, 0], [0, 0, -Di], [0, h, -Di], [0, h, 0], [-1, 0, 0], [[0, 0], [Di / uvs, 0], [Di / uvs, h / uvs], [0, h / uvs]]);
      P.box(plinthTex, -0.12, 0, 0, 2.6, -Di, 0, 'rb', 2.4); }
    P.pop();
  }
  // roof planes of both inner blocks
  { const tops = [[A.u1, A.u2, vi - xci, vi + xci, 22.9]];
    for (const [u0, u1, v0, v1, y] of tops) { const a = toWorld(u0, v0), b = toWorld(u0, v1), c = toWorld(u1, v1), d = toWorld(u1, v0); P.quad(GM.roof, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], [d[0], y, d[1]], [0, 1, 0]); } }

  // ============================================================== the chariot of Glory on the attic
  P.push(wx, 0, wz, FRONT);
  chariot(K, xc, 28.0, -D / 2 - 0.2);
  P.pop();

  // ============================================================== the paving of the passage and the gap
  { const y = 0.07, fl = (u0, u1, v0, v1) => { const a = toWorld(u0, v0), b = toWorld(u0, v1), c = toWorld(u1, v1), d = toWorld(u1, v0); P.quad(G.flags, [a[0], y, a[1]], [b[0], y, b[1]], [c[0], y, c[1]], [d[0], y, d[1]], [0, 1, 0], [[a[0] / 3, a[1] / 3], [b[0] / 3, b[1] / 3], [c[0] / 3, c[1] / 3], [d[0] / 3, d[1] / 3]]); };
    fl(A.u0 - 1.0, A.u2 + 2.0, A.v0 - 9, A.v0 + 8.6); }

  // ============================================================== colliders: the pylons (the OSM wall boxes cover the wing bodies)
  const box = (u0, u1, v0, v1, y1) => { const [cx, cz] = toWorld((u0 + u1) / 2, (v0 + v1) / 2); ctx.physics.addBox(cx, cz, v1 - v0, u1 - u0, 0.6283185307179586, 0, y1); };
  box(A.u0, A.u0 + D, A.v0 - xc, A.v0 - A.span / 2, 29);
  box(A.u0, A.u0 + D, A.v0 + A.span / 2, A.v0 + xc, 29);
  box(A.u1, A.u2, vi - xci, vi - spanI / 2, 23);
  box(A.u1, A.u2, vi + spanI / 2, vi + xci, 23);
  K.svc.monuments.push({ id: 'triumphal-arch', name: 'Арка Главного штаба', nameEn: 'General Staff Arch', x: toWorld(136, A.v0)[0], z: toWorld(136, A.v0)[1], h: 36.6 });
  const pa = toWorld(105, A.v0);
  K.svc.photoSpots.push({ x: pa[0], z: pa[1], yaw: L.yawToward(pa[0], pa[1], toWorld(131, A.v0)[0], toWorld(131, A.v0)[1]), pitch: 14, name: 'Арка Главного штаба', nameEn: 'General Staff Arch, from the stone field' });
  const pb = toWorld(200, -3);
  K.svc.photoSpots.push({ x: pb[0], z: pb[1], yaw: L.yawToward(pb[0], pb[1], toWorld(187, vi)[0], toWorld(187, vi)[1]), pitch: 8, name: 'Арка с Большой Морской', nameEn: 'the arch from Bolshaya Morskaya' });
}

/** one face of an arch block in the current frame (x along the wall, z out): ochre wall with the arch opening, the white archivolt and a keystone. back = no plinth strip here (done by the caller) */
function archFace(K, o) {
  const GM = K.G.M, P = K.P;
  const { W, xc, span, crown, wallTop, ring, ringD } = o;
  K.wallWithHoles(GM.wall, 0, W, 0, wallTop, [{ x: xc, y0: 0, w: span, h: crown, head: 'arch' }], 3);
  K.surround(GM.white, xc, 0, span, crown, 'arch', ring, ringD);
  // keystone
  P.box(GM.white, xc - 0.5, xc + 0.5, crown - 0.1, crown + ring + 0.7, 0, ringD + 0.12, 'kb');
}

/** a coffered barrel vault + side walls between z0 and z1 (z1 < z0), opening centred at x = xc, half width r, springing at y0s; seg = facets of the half circle */
function vault(K, xc, r, ys, z0, z1, seg, tag) {
  const P = K.P, G = K.G, GM = G.M;
  const len = Math.abs(z1 - z0);
  for (let i = 0; i < seg; i++) {
    const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg;
    const p = (a, z) => [xc + Math.cos(a) * r, ys + Math.sin(a) * r, z];
    const mid = (a0 + a1) / 2, n = [-Math.cos(mid), -Math.sin(mid), 0];
    const uvA = [i / seg * 4, 0], uvB = [(i + 1) / seg * 4, 0];
    P.quad(G.coffer, p(a0, z0), p(a1, z0), p(a1, z1), p(a0, z1), n, [[uvA[0], 0], [uvB[0], 0], [uvB[0], len / 4], [uvA[0], len / 4]]);
  }
  // side walls below the springing (ochre with a white impost band)
  for (const s of [-1, 1]) {
    const x = xc + s * r;
    P.quad(GM.wall, [x, 0, z0], [x, 0, z1], [x, ys, z1], [x, ys, z0], [-s, 0, 0]);
    P.quad(GM.white, [x - s * 0.15, ys - 0.5, z0], [x - s * 0.15, ys - 0.5, z1], [x - s * 0.15, ys, z1], [x - s * 0.15, ys, z0], [-s, 0, 0]);
  }
  void tag;
}

/** the Chariot of Glory in the current frame (x right, z out to the square), standing on y = 28 at z = zc.  Scaled 1.3x against the 3 m horses of the dossier so that the group reads from 2 km. */
function chariot(K, xc, y0, zc) {
  const P = K.P, GM = K.G.M, olive = GM.olive, SC = 1.3;
  const hx = [-5.4, -3.6, -1.8, 1.8, 3.6, 5.4];
  hx.forEach((dx, i) => {
    const k = Math.abs(dx) > 4.5 ? 2 : (Math.abs(dx) > 2.7 ? 1 : 0);
    const sg = dx < 0 ? -1 : 1;
    horse(K, olive, xc + dx, y0, zc + [0.4, 0.0, -0.4][k] + 1.0, sg * (0.04 + k * 0.1 + (k === 2 ? 0.2 : 0)), SC, GM.oliveDark, { legs: i % 2 ? -sg : sg, turn: k === 2 ? sg : (k === 1 ? sg * 0.3 : -sg * 0.2) });
    void i;
  });
  warrior(K, olive, xc - 7.8, y0, zc + 1.2, 0.75, 1.3, { spear: 3.9, shieldMat: GM.oliveDark });
  warrior(K, olive, xc + 7.8, y0, zc + 1.2, -0.75, 1.3, { spear: 3.9, shieldMat: GM.oliveDark });
  // the car behind the horses with Victory (a drum with a laurel ring and two wheels), Victory 1.2x with her bare labarum to 36.5 m
  P.cyl(olive, [xc, y0, zc - 1.2], [xc, y0 + 2.5, zc - 1.2], 1.5, 2.0, 16, true);
  P.cyl(GM.oliveDark, [xc, y0 + 2.5, zc - 1.2], [xc, y0 + 2.8, zc - 1.2], 2.15, 2.15, 16, true);
  P.cyl(GM.oliveDark, [xc, y0 + 1.2, zc - 1.2], [xc, y0 + 1.5, zc - 1.2], 2.05, 2.05, 16, true);
  for (const s of [-1, 1]) P.cyl(GM.oliveDark, [xc + s * 2.0, y0 + 1.2, zc - 1.2], [xc + s * 2.3, y0 + 1.2, zc - 1.2], 1.2, 1.2, 14, true);
  victory(K, olive, xc, y0 + 2.8, zc - 1.2, 0, 1.2, 4.8);
}
