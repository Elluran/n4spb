// landmarksH/senate.js - the Senate and the Synod (Rossi 1829-34) round Senate Square and the arch over Galernaya Street.  OSM footprints r1374229 (Senate, NW block nearer the Neva, 4 courtyards) and
// r1604296 (Synod, SE block), the arch building w357241749.  Dossier docs/research/admiralty-stisaac.md section 6.3 (CRITIC fix: the ROUNDED CORNER with the 8-column Corinthian colonnade belongs to the SENATE
// at its north end), photos refs/admiralty 072 074 076 056 068-071.  Elevation (eaves 24.3 m): pink-grey granite plinth 2.5 m; rusticated ground storey (pale butter yellow #EBD27E with white joints) with arched
// windows to 8.6 m; string course; floor 2 tall windows on balustrades with alternating triangular / segmental hoods; band; floor 3; architrave 21.0, frieze, mutules, corona to 24.3; grey-green sheet roof.
// Each block has an 8-column Corinthian LOGGIA on its long square front (columns 9.2 -> 21.0 m on a rusticated base, rear wall recessed 4.2 m) and the Senate the 8-column colonnade on the arc of the corner.
// The arch (photo 074): opening 9.2 m (the street), crown 14.5 m, two pairs of free columns with statues in niches, frieze with three reliefs, attic with bronze angels, top group "Justice and Piety" to 29 m.
// NO flagpole on the arch / roofs (user rule).
import * as THREE from 'three';
import * as L from '../layout.js';
import { ringEdges, onEdge, band } from './kit.js';
import { ringFromFlat, addPolyColliders } from '../lib/massing.js';
import { slopeStrip } from './facade.js';
import { statue } from './tower.js';
import { ellip } from './sculpt.js';

const OU = [-2800, -340], EU = [0.809017, -0.587785], NU = [-0.587785, -0.809017];
export const SW = (u, v) => [OU[0] + u * EU[0] + v * NU[0], OU[1] + u * EU[1] + v * NU[1]];
export const SUV = (x, z) => { const dx = x - OU[0], dz = z - OU[1]; return [dx * EU[0] + dz * EU[1], dx * NU[0] + dz * NU[1]]; };
const ROTU = Math.atan2(EU[0], EU[1]);                       // rotY of a model whose +z looks along +u (towards the square)

const Y = { PL: 2.5, RUST: 8.6, STR: 9.2, F2: 10.6, BAND: 16.0, F3: 17.2, ARCH: 21.0, FR: 21.9, MUT: 22.8, COR: 23.4, TOP: 24.3, ROOF: 25.2 };

function mats(K, H) {
  const T = K.ctx.mat.toon, M = H.M, HC = H.HC;
  const S = { wall: K.wall(HC.senateWall), shade: K.wall(HC.senateShade), rust: H.rustMat('#eed584', 'senate'), plinth: M.granRust, white: T('#efeae0', { name: 'lmH-senWhite' }), whiteShade: M.whiteShade, iron: M.iron,
    roof: T('#7c8a84', { name: 'lmH-senRoof' }), roofTex: T('#ffffff', { map: K.ctx.tex.draw(256, 256, (g, w, h) => { g.fillStyle = '#7c8a84'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(40,60,50,0.3)'; g.fillRect(i * 32 + 2, 0, 3, h); g.fillStyle = 'rgba(200,220,210,0.22)'; g.fillRect(i * 32 + 5, 0, 2, h); } }, { key: 'lmH-senRoofTex', repeat: [1, 1] }), name: 'lmH-senRoofTex' }),
    bronze: M.bronze, mutule: M.mutule, cream: M.cream, dark: M.dark, wallPale: K.wall('#f0dc90'), granite: M.granite, graniteLight: M.graniteLight };
  return S;
}

export function build(K, ctx, H) {
  const P = K.P, M = H.M, S = mats(K, H);
  const senate = L.buildingById('r1374229'), synod = L.buildingById('r1604296'), arch = L.buildingById('w357241749');
  if (!senate || !synod) throw new Error('Senate / Synod records missing');
  for (const rec of [senate, synod]) block(K, ctx, H, S, rec);
  if (arch) archOfRossi(K, ctx, H, S, arch);
  K.svc.houses.push({ id: 'senate', name: 'Здание Сената', nameEn: 'Senate building', x: -2833, z: -375 }, { id: 'synod', name: 'Здание Синода', nameEn: 'Synod building', x: -2767, z: -294 });
  K.svc.monuments.push({ id: 'senate', name: 'Сенат и Синод', nameEn: 'Senate and Synod', x: -2800, z: -335, h: 25 });
}

function block(K, ctx, H, S, rec) {
  const P = K.P, M = H.M;
  const poly = rec.polys[0], edges = ringEdges(poly, 0.05);
  for (const e of edges) {
    const mu = SUV((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2), nu = e.n[0] * EU[0] + e.n[1] * EU[1];
    e.uv = mu; e.nu = nu;
    e.kind = e.hole ? 'yard' : e.len < 2.6 ? 'jog' : 'front';
    if (!e.hole && e.len > 40 && nu > 0.9) e.kind = 'loggia';
    if (!e.hole && mu[1] > 77 && mu[0] > 14 && e.len < 8) e.kind = 'arc';
  }
  for (const e of edges) {
    if (e.kind === 'yard') onEdge(P, e, (len) => yardWall(K, S, len));
    else if (e.kind === 'jog') onEdge(P, e, (len) => jogWall(K, S, len));
    else onEdge(P, e, (len) => frontWall(K, S, e, len));
  }
  // loggias (8 columns) and the arc colonnade of the Senate
  for (const e of edges) if (e.kind === 'loggia') onEdge(P, e, (len) => loggia(K, ctx, S, e, len));
  const arcEdges = edges.filter((e) => e.kind === 'arc');
  if (arcEdges.length) arcColonnade(K, ctx, S, edges, arcEdges);
  // cornices run along every outer edge; the loggia / arc edges carry a deeper entablature
  const outer = (e) => e.kind !== 'yard';
  const deep = (e) => e.kind === 'loggia' || e.kind === 'arc';
  band(P, edges, Y.ARCH, Y.FR, (e) => (deep(e) ? 0.25 : 0.2), { front: S.white, top: S.white, under: S.whiteShade }, { draw: outer });
  band(P, edges, Y.FR, Y.MUT, (e) => (deep(e) ? 0.05 : 0.0), { front: S.wallPale, top: null, under: null }, { draw: outer });
  band(P, edges, Y.MUT, Y.COR, (e) => (deep(e) ? 0.9 : 0.8), { front: S.mutule, top: null, under: S.whiteShade }, { draw: outer, uvs: 0.6 });
  band(P, edges, Y.COR, Y.TOP, (e) => (deep(e) ? 1.6 : 1.3), { front: S.white, top: S.white, under: S.whiteShade }, { draw: outer });
  band(P, edges, 22.0, 22.4, 0.3, { front: S.white, top: S.white, under: S.whiteShade }, { draw: (e) => e.kind === 'yard' });
  slopeStrip(P, edges, outer, 1.3, Y.TOP, Y.ROOF, S.roofTex);
  const outerRing = ringFromFlat(poly.o), holes = poly.h.map(ringFromFlat).filter((h) => h.length >= 3);
  try { P.cap(S.roofTex, outerRing, Y.ROOF, true, 4, holes); } catch (err) { console.warn('[landmarksH] senate roof', err); }
  addPolyColliders(ctx, poly, 0, 27, 0.9);
  // courtyards: roofs of the yards are the holes (open); a paved floor for them is left to the ground
}

/** bay row of an outer wall in the edge frame (x along the wall, z out) */
function frontWall(K, S, e, len) {
  const P = K.P;
  P.box(S.plinth, 0, len, 0, Y.PL, 0, 0.16, 'kb', 2.4);
  K.wallQuad(S.rust, 0, len, Y.PL, Y.RUST, 2.4, 0, 1.1);
  P.box(S.white, 0, len, Y.RUST, Y.STR, 0, 0.3, 'kb');
  if (e.kind === 'loggia') { const lx0 = (len - 35) / 2, lx1 = lx0 + 35; K.wallQuad(S.wall, 0, lx0, Y.STR, Y.TOP + 0.02, 3); K.wallQuad(S.wall, lx1, len, Y.STR, Y.TOP + 0.02, 3); }
  else if (e.kind !== 'arc') K.wallQuad(S.wall, 0, len, Y.STR, Y.TOP + 0.02, 3);
  if (len < 4.6 && e.kind !== 'arc') return;
  if (e.kind === 'arc') { K.window({ x: len / 2, y: 3.3, w: 1.5, h: 3.6, head: 'arch', sw: 0.18, d: 0.09, sill: false, frame: 'white', surMat: S.white }); return; }
  const xs = K.bays(1.6, len - 1.6, 4.6);
  xs.forEach((x, i) => {
    if (e.kind === 'loggia' && Math.abs(x - len / 2) < 18.5) {
      K.window({ x, y: 3.3, w: 1.5, h: 3.6, head: 'arch', sw: 0.18, d: 0.09, sill: false, frame: 'white', surMat: S.white });   // only the base is drawn here (the loggia stands above)
      return;
    }
    K.window({ x, y: 3.3, w: 1.5, h: 3.6, head: 'arch', sw: 0.18, d: 0.09, sill: false, frame: 'white', surMat: S.white });
    K.window({ x, y: Y.F2, w: 1.55, h: 4.2, head: 'flat', sw: 0.2, d: 0.1, sill: true, frame: 'white', surMat: S.white });
    K.balustrade(x - 0.95, x + 0.95, Y.STR + 0.1, 0.98, 0.26, S.white);
    K.hood(S.white, i % 2 ? 'seg' : 'tri', x, Y.F2 + 4.2 + 0.2, 2.4, 0.5, 0.3);
    K.window({ x, y: Y.F3, w: 1.4, h: 3.3, head: 'flat', sw: 0.16, d: 0.08, sill: true, frame: 'white', surMat: S.white });
  });
  P.box(S.white, 0, len, Y.BAND, Y.BAND + 0.3, 0, 0.16, 'kb');
}
function jogWall(K, S, len) {
  const P = K.P;
  P.box(S.plinth, 0, len, 0, Y.PL, 0, 0.16, 'kb', 2.4);
  K.wallQuad(S.rust, 0, len, Y.PL, Y.RUST, 2.4, 0, 1.1);
  P.box(S.white, 0, len, Y.RUST, Y.STR, 0, 0.3, 'kb');
  K.wallQuad(S.wall, 0, len, Y.STR, Y.TOP + 0.02, 3);
}
function yardWall(K, S, len) {
  const P = K.P;
  P.box(S.plinth, 0, len, 0, 1.0, 0, 0.1, 'kb', 2.4);
  K.wallQuad(S.wall, 0, len, 1.0, Y.ROOF, 3);
  if (len < 4) return;
  const xs = K.bays(1.2, len - 1.2, 3.8);
  for (const x of xs) for (const y of [1.6, 6.0, 11.0, 16.2]) K.window({ x, y, w: 1.1, h: 2.3, head: 'flat', sw: 0.1, d: 0.06, sill: false, frame: 'white', surMat: S.white });
}

/** the 8-column Corinthian loggia above the rusticated base on a long front edge: columns 1.0 m inside the wall line, recessed rear wall, balustrade */
function loggia(K, ctx, S, e, len) {
  const P = K.P, W = 35, x0 = (len - W) / 2, x1 = x0 + W, D = 4.2, y0 = Y.STR, y1 = Y.ARCH;
  // terrace slab + balustrade along the line
  P.quad(S.graniteLight, [x0, y0, 0], [x1, y0, 0], [x1, y0, -D], [x0, y0, -D], [0, 1, 0], [[0, 0], [W / 3, 0], [W / 3, D / 3], [0, D / 3]]);
  P.push(0, 0, -0.35, 0); K.balustrade(x0 + 0.4, x1 - 0.4, y0, 0.98, 0.24, S.white); P.pop();
  // recessed rear wall z = -D with two tall rows of windows
  K.wallQuad(S.wall, x0, x1, y0, y1 + 0.02, 3, -D);
  const n = 8, cp = (W - 2.4) / (n - 1);
  P.push(0, 0, -D, 0);
  for (let i = 0; i < n - 1; i++) {
    const x = x0 + 1.2 + cp * (i + 0.5);
    K.window({ x, y: y0 + 1.1, w: 1.7, h: 5.0, head: 'arch', sw: 0.18, d: 0.1, sill: false, frame: 'white', surMat: S.white });
    K.window({ x, y: y0 + 7.2, w: 1.5, h: 3.6, head: 'flat', sw: 0.18, d: 0.1, sill: true, frame: 'white', surMat: S.white });
  }
  P.pop();
  // the columns (Corinthian, 11.8 m, R 0.62) and their colliders
  for (let i = 0; i < n; i++) {
    const x = x0 + 1.2 + cp * i;
    corinthian(K, S.white, S.whiteShade, x, -1.1, y0, y1, 0.62);
  }
  P.quad(S.whiteShade, [x0, y1, 0.2], [x1, y1, 0.2], [x1, y1, -D], [x0, y1, -D], [0, -1, 0]);               // the ceiling of the loggia
  for (const [x, nx] of [[x0, 1], [x1, -1]]) P.quad(S.wall, [x, y0, 0], [x, y0, -D], [x, y1, -D], [x, y1, 0], [nx, 0, 0]);      // its end walls
  for (let i = 0; i < n; i++) {
    const x = x0 + 1.2 + cp * i;
    const nx = e.n[0], nz = e.n[1], xa = [nz, -nx], fwd = (e.b[0] - e.a[0]) * xa[0] + (e.b[1] - e.a[1]) * xa[1] > 0, o = fwd ? e.a : e.b;
    ctx.physics.addCylinder(o[0] + xa[0] * x - nx * 1.1, o[1] + xa[1] * x - nz * 1.1, 0.7, Y.STR - 0.1, y1);
  }
  // attic panels over the loggia entablature (the main cornice runs above)
  for (let i = 0; i < 9; i++) { const x = x0 + 2 + i * (W - 4) / 8; P.box(S.white, x - 0.9, x + 0.9, 24.4, 25.0, -0.6, -0.5, 'kb'); }
  P.box(S.wall, x0 - 0.1, x1 + 0.1, Y.TOP, 25.2, -1.2, -0.4, 'b');
}

/** Corinthian column (base, shaft with entasis, two-tier capital, abacus) at (x, z) of the current frame */
export function corinthian(K, mat, matShade, x, z, y0, y1, r) {
  const P = K.P, seg = 12, ch = r * 2.3, sh1 = y1 - ch, sh0 = y0 + 0.38;
  P.cyl(matShade, [x, y0, z], [x, y0 + 0.16, z], r * 1.32, r * 1.32, seg, true);
  P.cyl(mat, [x, y0 + 0.16, z], [x, sh0, z], r * 1.2, r * 1.0, seg, false);
  P.cyl(mat, [x, sh0, z], [x, y0 + (sh1 - y0) * 0.45, z], r * 1.0, r * 1.01, seg, false);
  P.cyl(mat, [x, y0 + (sh1 - y0) * 0.45, z], [x, sh1, z], r * 1.01, r * 0.86, seg, false);
  P.cyl(mat, [x, sh1, z], [x, sh1 + 0.12, z], r * 0.96, r * 0.96, seg, true);
  P.cyl(mat, [x, sh1 + 0.12, z], [x, sh1 + ch * 0.45, z], r * 0.9, r * 1.18, seg, false);
  P.cyl(matShade, [x, sh1 + ch * 0.45, z], [x, sh1 + ch * 0.5, z], r * 1.2, r * 1.2, seg, true);
  P.cyl(mat, [x, sh1 + ch * 0.5, z], [x, sh1 + ch * 0.82, z], r * 1.1, r * 1.42, seg, false);
  P.box(mat, x - r * 1.55, x + r * 1.55, sh1 + ch * 0.82, y1, z - r * 1.55, z + r * 1.55, 'b');
}

/** the 8-column colonnade on the arc of the Senate's rounded corner: columns on an offset of the arc, entablature = the main cornice with deeper projection */
function arcColonnade(K, ctx, S, edges, arcEdges) {
  const P = K.P;
  const pts = [arcEdges[0].a, ...arcEdges.map((e) => e.b)];
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tot = cum[cum.length - 1], N = 8;
  const at = (s) => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const t = (s - cum[i - 1]) / (cum[i] - cum[i - 1]), a = pts[i - 1], b = pts[i], e = arcEdges[i - 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, e.n]; };
  for (let k = 0; k < N; k++) {
    const [x, z, n] = at(0.06 * tot + (0.88 * tot) * k / (N - 1)), px = x - n[0] * 1.1, pz = z - n[1] * 1.1;
    corinthian(K, S.white, S.whiteShade, px, pz, Y.STR, Y.ARCH, 0.62);
    ctx.physics.addCylinder(px, pz, 0.7, Y.STR - 0.1, Y.ARCH);
  }
  // the terrace of the colonnade (a ring segment) and the recess wall: a wall line 3.4 m inside
  const inner = pts.map((p, i) => { const e = arcEdges[Math.min(i, arcEdges.length - 1)]; return [p[0] - e.n[0] * 3.6, p[1] - e.n[1] * 3.6]; });
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], c = inner[i + 1], d = inner[i];
    P.quad(S.graniteLight, [a[0], Y.STR, a[1]], [b[0], Y.STR, b[1]], [c[0], Y.STR, c[1]], [d[0], Y.STR, d[1]], [0, 1, 0]);
    const nrm = arcEdges[i].n;
    P.quad(S.wall, [d[0], Y.STR, d[1]], [c[0], Y.STR, c[1]], [c[0], Y.ARCH, c[1]], [d[0], Y.ARCH, d[1]], [nrm[0], 0, nrm[1]]);
    P.quad(S.whiteShade, [a[0], Y.ARCH, a[1]], [b[0], Y.ARCH, b[1]], [c[0], Y.ARCH, c[1]], [d[0], Y.ARCH, d[1]], [0, -1, 0]);
  }
  // the attic with the relief (two angels with the eagle, abstracted) and a gilded sphere + cross on the crown
  const mid = at(tot / 2);
  P.geo(K.mats.brass, new THREE.SphereGeometry(0.7, 10, 8), mid[0] - mid[2][0] * 1.2, 26.4, mid[1] - mid[2][1] * 1.2);
  P.cyl(K.mats.brass, [mid[0] - mid[2][0] * 1.2, 26.8, mid[1] - mid[2][1] * 1.2], [mid[0] - mid[2][0] * 1.2, 29.2, mid[1] - mid[2][1] * 1.2], 0.1, 0.07, 5, true);
  K.svc.senateCorner = { x: mid[0], z: mid[1] };
  void edges;
}

/** Rossi's arch over Galernaya Street: two piers with column pairs (projecting towards the square), the opening 9.2 m, the entablature, the attic with the group.  Faces +u (the square) and -u. */
function archOfRossi(K, ctx, H, S, rec) {
  const P = K.P, M = H.M;
  const OP = 11.0, CROWN = 14.5, R = OP / 2, SPR = CROWN - R;
  // build in a local frame at the arch centre: z = +u (towards the square), x = -v (so that +x is right seen from the square)
  const uc = 25.0, vc = -10.9;                                              // centre of the opening in (u, v): the street between the Senate and the Synod
  const [wx, wz] = SW(uc, vc);
  P.push(wx, 0, wz, ROTU);
  const FRONT = 9.5, BACK = -5.5, HW = 13.5;                                // front plane z = 9.5 (u = 34.5), back plane -5.5 (u = 19.5), half width 13.5
  const face = (zf, deep) => {
    P.push(0, 0, zf, deep ? 0 : Math.PI);
    const w = HW, s = new THREE.Shape(); s.moveTo(-w, 0); s.lineTo(-R, 0); s.lineTo(-R, SPR); s.absarc(0, SPR, R, Math.PI, 0, true); s.lineTo(R, 0); s.lineTo(w, 0); s.lineTo(w, 25.0); s.lineTo(-w, 25.0); s.closePath();
    P.face(S.wall, s, 0, 3, 14);
    P.box(S.plinth, -w, -R, 0, 2.5, 0, 0.18, 'kb', 2.4); P.box(S.plinth, R, w, 0, 2.5, 0, 0.18, 'kb', 2.4);
    // archivolt
    const ring = new THREE.Shape(); ring.moveTo(R, SPR); ring.lineTo(R + 1.2, SPR); ring.absarc(0, SPR, R + 1.2, 0, Math.PI, false); ring.lineTo(-R, SPR); ring.absarc(0, SPR, R, Math.PI, 0, true); ring.closePath();
    P.extrude(S.white, ring, 0, 0.3, 1, 20);
    P.box(S.white, -R - 1.2, R + 1.2, SPR - 0.5, SPR, 0, 0.4, 'kb');                        // impost
    // entablature above the arch: architrave 15.8-16.9, frieze (three reliefs) 16.9-19.0, cornice 19.0-20.2, attic 20.2-24.0
    P.box(S.white, -w - 0.4, w + 0.4, 15.9, 17.0, 0, 0.5, 'kb');
    P.box(S.wallPale, -w, w, 17.0, 19.0, 0, 0.12, 'kb');
    for (const x of [-8.0, 0, 8.0]) { P.box(S.cream, x - 3.0, x + 3.0, 17.4, 18.6, 0.12, 0.2, 'kb'); for (let k = 0; k < 4; k++) P.cyl(S.white, [x - 2.1 + k * 1.4, 17.5, 0.26], [x - 2.1 + k * 1.4, 18.4, 0.26], 0.3, 0.2, 5, true); }
    P.box(S.white, -w - 0.7, w + 0.7, 19.0, 20.3, 0, 1.2, 'kb');
    P.box(S.wall, -w + 1.5, w - 1.5, 20.3, 24.0, -1.0, 0.0, 'b');
    for (const x of [-9, -3, 3, 9]) P.box(S.cream, x - 1.1, x + 1.1, 21.0, 23.3, 0.0, 0.1, 'kb');          // relief panels of the attic
    P.box(S.white, -w + 1.3, w - 1.3, 24.0, 24.6, -1.2, 0.3, 'b');
    P.pop();
  };
  face(FRONT, true); face(BACK, false);
  for (const sx of [-1, 1]) P.quad(S.wall, [sx * HW, 0, FRONT], [sx * HW, 0, 4.0], [sx * HW, 24.6, 4.0], [sx * HW, 24.6, FRONT], [sx, 0, 0]);
  // the passage: barrel vault and walls
  const seg = 18, len = FRONT - BACK;
  for (let i = 0; i < seg; i++) {
    const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg, mid = (a0 + a1) / 2, nn = [-Math.cos(mid), -Math.sin(mid), 0];
    const q = (a, z) => [Math.cos(a) * R, SPR + Math.sin(a) * R, z];
    P.quad(S.wallPale, q(a0, FRONT), q(a1, FRONT), q(a1, BACK), q(a0, BACK), nn);
  }
  for (const sx of [-1, 1]) P.quad(S.wall, [sx * R, 0, FRONT], [sx * R, 0, BACK], [sx * R, SPR, BACK], [sx * R, SPR, FRONT], [-sx, 0, 0]);
  P.box(S.roofTex, -HW, HW, 24.58, 24.6, BACK - 0.5, FRONT, 'b');
  // piers: the two column pairs on each side of the opening (Corinthian, 12 m), niches with statues between
  for (const sx of [-1, 1]) {
    for (const cx of [R + 2.0, R + 5.6]) corinthian(K, S.white, S.whiteShade, sx * cx, FRONT + 1.0, 2.5, 15.9, 0.6);
    statue(K, S.cream, sx * (R + 3.8), 4.0, FRONT + 0.2, 0, 1.0, 0);
    P.box(S.dark, sx * (R + 3.8) - 0.9, sx * (R + 3.8) + 0.9, 3.4, 7.4, FRONT - 0.02, FRONT + 0.04, 'kb');   // niche
    P.box(S.white, sx * (R + 3.8) - 1.1, sx * (R + 3.8) + 1.1, 2.5, 3.4, FRONT, FRONT + 0.7, 'kb');            // pedestal
  }
  // the top group: bronze "Justice and Piety" flanking a shield with the double-headed eagle (abstracted), four bronze angels on the attic corners, no flagpole
  const bz = S.bronze;
  // stepped crown of the attic (photo 074) and the group on top
  P.box(S.wall, -10.5, 10.5, 24.6, 25.8, -0.9, 0.3, 'b'); P.box(S.wall, -7.5, 7.5, 25.8, 27.0, -0.7, 0.1, 'b'); P.box(S.white, -7.8, 7.8, 27.0, 27.3, -0.9, 0.3, 'b');
  for (const sx of [-1, 1]) {
    P.push(0, 2.7, 0, 0);
    P.cyl(bz, [sx * 4.6, 24.6, 0.0], [sx * 4.6, 27.0, 0.0], 0.6, 0.32, 7, true); ellip(P, bz, sx * 4.6, 27.4, 0.0, 0.3, 0.36, 0.3, 0, 0, 0, 6);          // seated Justice and Piety
    P.cyl(bz, [sx * 4.6, 26.0, 0.0], [sx * 2.6, 26.8, 0.0], 0.14, 0.1, 5, true);
    P.pop();
    P.cyl(bz, [sx * 12.0, 24.6, 0.4], [sx * 12.0, 27.0, 0.4], 0.45, 0.25, 6, true); ellip(P, bz, sx * 12.0, 27.35, 0.4, 0.28, 0.33, 0.28, 0, 0, 0, 6);        // bronze angels on the attic
    P.box(bz, sx * 12.0 - 0.15, sx * 12.0 + 0.15, 25.4, 26.6, -0.7, 0.1, '');
    P.cyl(bz, [sx * 7.4, 24.6, 0.4], [sx * 7.4, 27.0, 0.4], 0.45, 0.25, 6, true); ellip(P, bz, sx * 7.4, 27.35, 0.4, 0.28, 0.33, 0.28, 0, 0, 0, 6);
    P.box(bz, sx * 7.4 - 0.15, sx * 7.4 + 0.15, 25.4, 26.6, -0.7, 0.1, '');
  }
  P.push(0, 2.7, 0, 0); P.box(bz, -1.0, 1.0, 24.6, 27.0, -0.2, 0.3, 'b'); P.cyl(K.mats.brass, [0, 27.0, 0.05], [0, 27.1, 0.05], 0.9, 0.9, 12, true); P.pop();
  P.pop();
  // colliders: the two piers (the OSM Senate / Synod walls cover the rest); the street stays open
  const pier = (v0, v1) => { const u0 = uc + 4.0, u1 = uc + FRONT, [cx, cz] = SW((u0 + u1) / 2, (v0 + v1) / 2); ctx.physics.addBox(cx, cz, v1 - v0, u1 - u0, ROTU, 0, 27); };
  pier(vc - HW, vc - R); pier(vc + R, vc + HW);
  K.svc.arch = { x: wx, z: wz };
  K.svc.monuments.push({ id: 'senate-arch', name: 'Арка над Галерной улицей', nameEn: 'Arch over Galernaya Street', x: wx, z: wz, h: 29 });
}
