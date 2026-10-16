// landmarksE/garden.js - the Catherine Garden (Екатерининский сад, "Катькин сад", Ostrovsky Square), docs/research/gostiny-dvor-ostrovsky.md section 5, photos refs/ostrovsky 057 058 059 060 061 062 064 065 068 069 071 077.
//   A 68 x 148 m fenced rectangle (OSM fence ways, ring of setts r8280616 round it, gravel path polygon r8280613 with the lawn islands as holes): pink-brown fine gravel paths, summer lawns with
//   granite curbs and low iron hoop edging, carpet flower beds (N round bed, S oval bed, the ring round the monument), clipped shrub clumps on the OSM scrub polygons, the black cast-iron lattice
//   fence 1.2 m on posts with the "ЕII" cipher discs, four open gates, 37 white benches at the OSM bench nodes, the four cast candelabra at the monument (OSM lamps), 107 trees at the OSM tree nodes
//   (instanced, crowns 12-20 m) and the Catherine II monument (monument.js).  The garden is open to walk in (the fence has the four 5 m gaps of the OSM data); colliders: fence, benches, trunks.
//   Services: K.svc.benches (props skips them), monuments, photo spots, crowd spots (monument, artists along the Nevsky fence, chess tables).  NO flags / banners / posters.
import * as THREE from 'three';
import { AREAS, GREEN, BARRIERS, ROADS, FURNITURE, TREES } from '../data/city.js';
import { toWorld, toUV, ringOf, inRing, ROT } from './frame.js';
import { band, ringEdges } from './kit.js';
import { monument, candelabrum } from './monument.js';

const IN = (u0, u1, v0, v1) => (x, z) => { const q = toUV(x, z); return q.u >= u0 && q.u <= u1 && q.v >= v0 && q.v <= v1; };
const inGarden = IN(317, 387, 18, 168);
const Y = { PAVE: 0.12, LAWN: 0.14, GRAVEL: 0.15, BED: 0.17 };

export function build(K, ctx) {
  const P = K.P, G = K.G, M = G.M, ph = ctx.physics;
  const ringArea = AREAS.find((a) => a.id === 'r8280616'), pathArea = AREAS.find((a) => a.id === 'r8280613');
  if (!ringArea || !pathArea) throw new Error('Catherine Garden areas missing');

  // ---- paving ring (setts) round the garden, lawn base, gravel paths
  { const p = ringArea.polys[0]; P.cap(M.sett, ringOf(p.o), Y.PAVE, true, 2, p.h.map(ringOf)); }
  const fenceRect = ringOf(ringArea.polys[0].h[0]);
  P.cap(M.lawn, fenceRect, Y.LAWN, true, 6);
  const pp = pathArea.polys[0], islands = pp.h.map(ringOf);
  P.cap(M.gravel, ringOf(pp.o), Y.GRAVEL, true, 3, islands);
  // granite curb flush with the gravel round every lawn island + low iron hoop edging on posts
  for (const e of ringEdges({ o: pp.o, h: pp.h }, 0.3).filter((q) => q.hole)) {
    band(P, [e], Y.LAWN, Y.GRAVEL + 0.07, 0.16, { front: M.graniteGrey, top: M.graniteGrey }, {});
    const nx = e.n[0], nz = e.n[1], off = 0.2, a = [e.a[0] + nx * off, e.a[1] + nz * off], b = [e.b[0] + nx * off, e.b[1] + nz * off];
    const tl = Math.max(1, e.len / 1.2);
    P.quad(M.hoop, [a[0], Y.GRAVEL, a[1]], [b[0], Y.GRAVEL, b[1]], [b[0], Y.GRAVEL + 0.5, b[1]], [a[0], Y.GRAVEL + 0.5, a[1]], [nx, 0, nz], [[0, 0], [tl, 0], [tl, 1], [0, 1]]);
  }

  // ---- carpet flower beds: the N round bed, the S oval bed (photo 065), the ring round the monument
  const bedMat = flowerMat(K);
  for (const id of ['w304476043', 'w304476046']) {
    const g = GREEN.find((q) => q.id === id); if (!g) continue;
    P.cap(bedMat, shrink(ringOf(g.polys[0].o), 0.12), Y.BED, true, 1.4);
  }
  { const c = toWorld(352, 74), ring = [], inner = []; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; ring.push([c[0] + Math.cos(a) * 10.8, c[1] + Math.sin(a) * 10.8]); inner.push([c[0] + Math.cos(a) * 9.0, c[1] + Math.sin(a) * 9.0]); }
    P.cap(bedMat, ring, Y.BED, true, 1.4, [inner]); }

  // ---- shrub clumps on the scrub polygons (spirea / hydrangea / lilac, 1.5-2.5 m)
  { const rng = ctx.rng(5521); const ico = new THREE.IcosahedronGeometry(1, 0);
    for (const g of GREEN) { if (g.kind !== 'scrub') continue; const o = ringOf(g.polys[0].o), c = toUV(o[0][0], o[0][1]); if (!inGarden(o[0][0], o[0][1])) { void c; continue; }
      let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of o) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      for (let x = x0; x <= x1; x += 1.6) for (let z = z0; z <= z1; z += 1.6) { const px = x + (rng() - 0.5) * 0.8, pz = z + (rng() - 0.5) * 0.8; if (!inRing(o, px, pz)) continue; const r = 0.9 + rng() * 0.6;
        P.geo(rng() < 0.5 ? K.mat('#4e8a38', { name: 'lmE-shrubA' }) : K.mat('#5f9a3f', { name: 'lmE-shrubB' }), ico, px, Y.LAWN + r * 0.6, pz, rng() * 3, rng() * 3, 0, r, r * 0.8, r); } } ico.dispose(); }

  // ---- fence: black cast iron lattice, 1.2 m, posts every ~2.4 m with pyramid caps, cipher discs every other post
  const GATE_IDS = new Set(['w586440721', 'w586440722', 'w586440724', 'w586440727']);
  const fences = BARRIERS.filter((b) => b.kind === 'fence' && !GATE_IDS.has(b.id) && inGarden(b.pts[0], b.pts[1]) && inGarden(b.pts[b.pts.length - 2], b.pts[b.pts.length - 1]));
  let nPost = 0;
  for (const f of fences) {
    const pts = ringOf(f.pts);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.2) continue;
      const nx = dz / len, nz = -dx / len, tl = len / 2.4;
      P.quad(M.lattice, [a[0], 0.12, a[1]], [b[0], 0.12, b[1]], [b[0], 1.32, b[1]], [a[0], 1.32, a[1]], [nx, 0, nz], [[0, 0], [tl, 0], [tl, 1], [0, 1]]);
      const k = Math.max(1, Math.round(len / 2.4));
      for (let j = 0; j <= k; j++) {
        if (j === 0 && i > 0) continue; const t = j / k, x = a[0] + dx * t, z = a[1] + dz * t;
        P.box(M.iron, x - 0.07, x + 0.07, 0.1, 1.42, z - 0.07, z + 0.07, 'b'); P.cyl(M.iron, [x, 1.42, z], [x, 1.62, z], 0.1, 0.01, 4, false); nPost++;
        if (j > 0 && j < k && nPost % 2 === 0) for (const sg of [-1, 1]) P.cyl(M.gold, [x + nx * 0.07 * sg, 0.85, z + nz * 0.07 * sg], [x + nx * 0.1 * sg, 0.85, z + nz * 0.1 * sg], 0.14, 0.14, 10, true);
      }
      ph.addBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, len + 0.1, 0.16, Math.atan2(-dz, dx), 0, 1.5);
    }
  }

  // ---- the four gates stand OPEN: granite-grey piers with a cap and a lamp-free finial at both ends of the gap, the two lattice leaves folded back along the fence
  for (const g of BARRIERS.filter((b) => GATE_IDS.has(b.id))) {
    const a = [g.pts[0], g.pts[1]], b = [g.pts[g.pts.length - 2], g.pts[g.pts.length - 1]], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, tx = dx / l, tz = dz / l, nx = tz, nz = -tx;
    for (const [q, s] of [[a, 1], [b, -1]]) {
      P.box(M.graniteGrey, q[0] - 0.28, q[0] + 0.28, 0.1, 1.9, q[1] - 0.28, q[1] + 0.28, 'b'); P.box(M.iron, q[0] - 0.34, q[0] + 0.34, 1.9, 2.0, q[1] - 0.34, q[1] + 0.34, 'b'); P.cyl(M.iron, [q[0], 2.0, q[1]], [q[0], 2.35, q[1]], 0.22, 0.02, 6, false);
      const w = l / 2 - 0.1, ex = q[0] + tx * s * 0.0, ez = q[1] + tz * s * 0.0, o2 = [ex + nx * 0.0, ez + nz * 0.0]; void w; void o2;
      const lx = q[0] + nx * 0.35, lz = q[1] + nz * 0.35, ex2 = lx + nx * 1.6, ez2 = lz + nz * 1.6;
      P.quad(M.lattice, [lx, 0.12, lz], [ex2, 0.12, ez2], [ex2, 1.32, ez2], [lx, 1.32, lz], [tx * s, 0, tz * s], [[0, 0], [0.7, 0], [0.7, 1], [0, 1]]);
      ph.addCylinder(q[0], q[1], 0.34, 0, 2.2);
    }
  }

  // ---- the monument and the four candelabra
  monument(K, ctx);
  for (const [x, z] of [[-784.1, -114.3], [-811, -121.7], [-818.4, -93.8], [-790.8, -87.1]]) candelabrum(K, x, z, ctx);

  // ---- benches at the OSM bench nodes (white slats on black cast ends), facing the nearest gravel path
  const paths = ROADS.filter((r) => (r.hw === 'footway' || r.hw === 'path') && r.surface !== 'sett' && inGarden(r.pts[0], r.pts[1]));
  const near = (x, z) => { let best = null, bd = 1e9; for (const r of paths) for (let i = 0; i + 3 < r.pts.length; i += 2) { const ax = r.pts[i], az = r.pts[i + 1], bx = r.pts[i + 2], bz = r.pts[i + 3], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))), px = ax + dx * t, pz = az + dz * t, d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = [px, pz]; } } return best; };
  let nb = 0;
  for (const f of FURNITURE) {
    if (f.kind !== 'bench' || !inGarden(f.x, f.z)) continue;
    const w = near(f.x, f.z), rot = w ? Math.atan2(w[0] - f.x, w[1] - f.z) : 0;
    bench(K, f.x, f.z, rot); ph.addBox(f.x, f.z, 2.3, 0.7, rot, 0, 0.9);
    K.svc.benches.push({ x: f.x, z: f.z, rotY: rot, len: 2.3 }); nb++;
  }

  // ---- trees at the OSM tree nodes (instanced crowns)
  let nt = 0; const rng = ctx.rng(5522);
  for (let i = 0; i + 1 < TREES.length; i += 2) {
    const x = TREES[i], z = TREES[i + 1]; if (!inGarden(x, z)) continue;
    const q = toUV(x, z), edge = q.u < 328 || q.u > 376, big = edge || rng() < 0.45;
    const kind = rng() < 0.12 ? 'round' : 'broad', h = big ? 13 + rng() * 4 : 8 + rng() * 3.5, r = big ? 3.6 + rng() * 1.4 : 2.6 + rng() * 1.0;
    K.trees.add(x, z, { kind, h, r, trunk: h * 0.42 }); nt++;
  }
  K.svc.spots.garden = { trees: nt, benches: nb, monument: toWorld(352, 74), artists: [toWorld(335, 24), toWorld(345, 24), toWorld(359, 24), toWorld(369, 24)].map(([x, z]) => ({ x, z })), chess: toWorld(330, 80), gates: [toWorld(352, 19), toWorld(386, 74), toWorld(318, 74), toWorld(352, 167)] };
  const ps = toWorld(352, 8), pt = toWorld(352, 120), pm = toWorld(352, 20);
  K.svc.photoSpots.push({ x: ps[0], z: ps[1], yaw: ang(ps, pt), pitch: 6, name: 'Екатерининский сад и Александринский театр', nameEn: 'Catherine Garden and the Alexandrinsky Theatre from Nevsky' });
  K.svc.photoSpots.push({ x: pm[0], z: pm[1], yaw: ang(pm, toWorld(352, 74)), pitch: 22, name: 'Памятник Екатерине II', nameEn: 'Catherine II monument' });
}
const ang = (a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1]; return Math.atan2(-dx, -dz) * 180 / Math.PI; };
function shrink(r, d) { let cx = 0, cz = 0; for (const p of r) { cx += p[0]; cz += p[1]; } cx /= r.length; cz /= r.length; return r.map((p) => { const dx = p[0] - cx, dz = p[1] - cz, l = Math.hypot(dx, dz) || 1; return [p[0] - dx / l * d, p[1] - dz / l * d]; }); }

/** a carpet-bed texture: begonia red / pink / purple dots, silver-grey cineraria edge, green leaves (tile 1.4 m) */
function flowerMat(K) {
  const tex = K.ctx.tex.draw(128, 128, (g, w, h) => {
    g.fillStyle = '#4c7f34'; g.fillRect(0, 0, w, h);
    let sd = 99; const rnd = () => { sd = (sd * 1103515245 + 12345) & 0x7fffffff; return sd / 0x7fffffff; };
    const pal = ['#d0242e', '#e0457b', '#f08cb4', '#7a4aa8', '#f5f1f0', '#d8879f', '#8fa090'];
    for (let i = 0; i < 260; i++) { g.fillStyle = pal[Math.floor(rnd() * pal.length)]; g.beginPath(); g.arc(rnd() * w, rnd() * h, 3 + rnd() * 3, 0, 6.3); g.fill(); }
  }, { key: 'lmE-flowers', repeat: [1, 1] });
  return K.ctx.mat.toon('#ffffff', { map: tex, name: 'lmE-flowers', polygonOffset: -6 });
}

/** a park bench: white slats on black cast-iron S-scroll ends, 2.3 m, faces local +z after rot */
function bench(K, x, z, rot) {
  const P = K.P, M = K.G.M;
  P.push(x, 0.12, z, rot);
  for (const sx of [-1.05, 1.05]) { P.box(M.iron, sx - 0.04, sx + 0.04, 0.0, 0.46, -0.24, 0.24, 'b'); P.box(M.iron, sx - 0.04, sx + 0.04, 0.46, 0.92, -0.28, -0.2, 'b'); }
  for (let i = 0; i < 4; i++) P.box(M.bench, -1.15, 1.15, 0.45, 0.5, -0.24 + i * 0.12, -0.14 + i * 0.12, 'b');
  for (let i = 0; i < 3; i++) P.box(M.bench, -1.15, 1.15, 0.6 + i * 0.13, 0.68 + i * 0.13, -0.3 + i * 0.01, -0.26 + i * 0.01, '');
  P.pop();
}
void ROT;
