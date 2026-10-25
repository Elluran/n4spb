// landmarksGarden/hedges.js - the lattice hedges (шпалеры) and the trees of the Summer Garden.  Hedges: every OSM `barrier=hedge` way inside the garden ring becomes a 3.2 m high wall of green timber lattice
// overgrown by clipped small-leaved limes (0.9 m thick, mitred joins, solid for the player): the bosquet rings, the arcs round the fountain plazas, the berceau pairs.  Trees: the OSM trees of the garden (550,
// alley rows and bosquet edges), a jittered grid of broad-leaved trees inside the wood polygons (limes dominate; elms, maples, ashes, oaks, a few poplars), the old oak at (-844, -1564); instanced with the four
// crown levels of the environment trees, trunk colliders.  Not on footways, not in ponds / basins / buildings / statue spots.  Dossier docs/research/summer-garden.md 5.2, photos refs/summer-garden 206 184 190.
import { GREEN, BARRIERS, TREES, WATER, BUILDINGS } from '../data/city.js';
import { RING, inRing, rotOf, nearestOnLine } from './frame.js';
import { GROUPS_LIST } from './groups.js';
import { wall3D, pairs } from './surfaces.js';
import { gardenPaths } from './ground.js';
import { plantTrees } from './trees.js';
import { SCULPTURE } from './statues-data.js';

const OSM = new Set(GROUPS_LIST.find((g) => g.key === 'summer-garden').osm);
const BLD = new Set(GROUPS_LIST.flatMap((g) => g.ids));
const HEDGE_H = 3.2;

export function build(K) {
  const { ctx, M, P, svc } = K, ph = ctx.physics, rng = ctx.rng(5501);
  // ---- hedges
  let segN = 0, hedgeLen = 0;
  const hedgeLines = [];
  for (const b of BARRIERS) {
    if (b.kind !== 'hedge' || !OSM.has(b.id)) continue;
    const pts = pairs(b.pts); if (pts.length < 2) continue;
    hedgeLines.push({ pts, closed: !!b.closed });
    const segs = wall3D(P, pts, { closed: !!b.closed, hw: 0.45, h: HEDGE_H, side: M.hedge, top: M.hedgeTop, tile: 1.4 });
    for (const s of segs) {
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], l = Math.hypot(dx, dz); if (l < 0.2) continue;
      ph.addBox((s.a[0] + s.b[0]) / 2, (s.a[1] + s.b[1]) / 2, l + 0.3, 0.9, rotOf(dx, dz), 0, HEDGE_H); segN++; hedgeLen += l;
    }
  }
  // ---- the berceau: four 40 m runs of paired lattice walls 3 m apart along the Shkolnaya alley (OSM hedge pairs at G s 44, 90, 136, 183) get a barrel vault of lattice and foliage over the path
  let berceaux = 0;
  for (const [ia, ib] of [['w1088234573', 'w1088234581'], ['w1088234575', 'w1088234579'], ['w1088234574', 'w1088234583'], ['w1088234572', 'w1088234578']]) {
    const A = BARRIERS.find((b) => b.id === ia), B = BARRIERS.find((b) => b.id === ib); if (!A || !B) continue;
    let a0 = [A.pts[0], A.pts[1]], a1 = [A.pts[2], A.pts[3]], b0 = [B.pts[0], B.pts[1]], b1 = [B.pts[2], B.pts[3]];
    if (Math.hypot(a0[0] - b0[0], a0[1] - b0[1]) > Math.hypot(a0[0] - b1[0], a0[1] - b1[1])) [b0, b1] = [b1, b0];
    const half = (p, q) => [(q[0] - p[0]) / 2, (q[1] - p[1]) / 2], h0 = half(a0, b0), h1 = half(a1, b1), c0 = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2], c1 = [(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2];
    const R = 1.0, steps = 8, pt = (c, h, th) => [c[0] + h[0] * Math.cos(th), HEDGE_H + Math.sin(th) * 1.55, c[1] + h[1] * Math.cos(th)];
    for (let i = 0; i < steps; i++) {
      const t0 = Math.PI * i / steps, t1 = Math.PI * (i + 1) / steps, p00 = pt(c0, h0, t0), p01 = pt(c0, h0, t1), p10 = pt(c1, h1, t0), p11 = pt(c1, h1, t1);
      const nx = Math.cos((t0 + t1) / 2) * 0.3, ny = 1;
      const len = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) / 1.4, arc = Math.hypot(p01[0] - p00[0], p01[1] - p00[1], p01[2] - p00[2]) / 1.4;
      for (const side of [1, -1]) P.quad(M.hedge, p00, p10, p11, p01, [side * nx, side * ny, 0], [[0, i * arc], [len, i * arc], [len, (i + 1) * arc], [0, (i + 1) * arc]]);
    }
    void R; berceaux++;
  }
  svc.hedges = { berceaux, ways: hedgeLines.length, segments: segN, length: Math.round(hedgeLen) };

  // ---- trees
  const paths = gardenPaths(), pathLines = paths.map((p) => ({ pts: p.pts, w: p.w }));
  const solids = [];                                                                               // circles [x, z, r] where no tree may stand: basins, ponds, buildings, statue spots
  for (const w of WATER) { if (!OSM.has(w.id)) continue; for (const p of w.polys) { const r = pairs(p.o); let cx = 0, cz = 0; for (const q of r) { cx += q[0]; cz += q[1]; } cx /= r.length; cz /= r.length; let rad = 0; for (const q of r) rad = Math.max(rad, Math.hypot(q[0] - cx, q[1] - cz)); solids.push([cx, cz, rad + 3]); } }
  for (const b of BUILDINGS) { if (!BLD.has(b.id) && !BLD.has(b.parent)) continue; for (const p of b.polys) { const r = pairs(p.o); let cx = 0, cz = 0; for (const q of r) { cx += q[0]; cz += q[1]; } cx /= r.length; cz /= r.length; let rad = 0; for (const q of r) rad = Math.max(rad, Math.hypot(q[0] - cx, q[1] - cz)); solids.push([cx, cz, rad + 2.5]); } }
  for (const r of SCULPTURE) solids.push([r[5], r[6], 2.0]);                                        // statue pedestals
  const okSpot = (x, z) => {
    if (!inRing(x, z)) return false;
    for (const s of solids) if (Math.hypot(s[0] - x, s[1] - z) < s[2]) return false;
    for (const l of pathLines) { const d = nearestOnLine(l.pts, x, z).d; if (d < l.w / 2 + 0.6) return false; }
    for (const h of hedgeLines) { if (nearestOnLine(h.pts, x, z).d < 1.6) return false; }
    return true;
  };
  const trees = [];
  const FAM = [['limeA', 0.38], ['limeB', 0.3], ['mapleA', 0.14], ['elm', 0.1], ['ash', 0.08]];
  const pick = () => { let r = rng(), s = 0; for (const [f, w] of FAM) { s += w; if (r < s) return f; } return 'limeA'; };
  const scaleOf = (fam) => (fam.startsWith('lime') ? 1.35 + rng() * 0.3 : 1.2 + rng() * 0.3);
  // the OSM trees: where the data puts them (alley rows, hedge edges); the old oak gets its own
  const osmTrees = [];
  for (let i = 0; i < TREES.length; i += 2) { const x = TREES[i], z = TREES[i + 1]; if (!inRing(x, z)) continue; osmTrees.push([x, z]); }
  for (const [x, z] of osmTrees) {
    if (solids.some((s) => Math.hypot(s[0] - x, s[1] - z) < s[2] - 1)) continue;
    if (pathLines.some((l) => nearestOnLine(l.pts, x, z).d < l.w / 2 - 0.3)) continue;
    const near = Math.hypot(x + 844, z + 1564) < 3, fam = near ? 'elm' : pick();
    trees.push({ x, z, fam, s: near ? 1.9 : scaleOf(fam), yaw: rng() * 6.28, y: 0 });
  }
  // the wood polygons: a jittered grid, thinned near the existing trees
  const near2 = (x, z, d) => trees.some((t) => Math.hypot(t.x - x, t.z - z) < d);
  for (const g of GREEN) {
    if (g.kind !== 'wood' || !OSM.has(g.id)) continue;
    for (const p of g.polys) {
      const o = p.o; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (let i = 0; i < o.length; i += 2) { x0 = Math.min(x0, o[i]); x1 = Math.max(x1, o[i]); z0 = Math.min(z0, o[i + 1]); z1 = Math.max(z1, o[i + 1]); }
      const ring = pairs(o), holes = p.h.map(pairs);
      const inside = (x, z) => { let c = false; const r = ring; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
      for (let z = z0; z <= z1; z += 7.5) for (let x = x0; x <= x1; x += 7.5) {
        const px = x + (rng() - 0.5) * 5, pz = z + (rng() - 0.5) * 5;
        if (!inside(px, pz) || rng() > 0.85 || !okSpot(px, pz) || near2(px, pz, 5.0)) continue;
        const fam = pick(); trees.push({ x: px, z: pz, fam, s: scaleOf(fam), yaw: rng() * 6.28, y: 0 });
      }
      void holes;
    }
  }
  // a few trees along the Main alley rows where OSM has gaps (q = +-5.5), lime only
  const main = paths.filter((p) => p.w > 6);
  for (const m of main) for (let i = 0; i + 1 < m.pts.length; i++) {
    const a = m.pts[i], b = m.pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz), nx = -dz / l, nz = dx / l, n = Math.max(1, Math.round(l / 6));
    for (let k = 0; k < n; k++) for (const s of [-1, 1]) {
      const t = (k + 0.5) / n, x = a[0] + dx * t + nx * 5.6 * s, z = a[1] + dz * t + nz * 5.6 * s;
      if (!inRing(x, z) || near2(x, z, 3.2) || solids.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2])) continue;
      if (hedgeLines.some((h) => nearestOnLine(h.pts, x, z).d < 1.2)) continue;
      trees.push({ x, z, fam: rng() < 0.55 ? 'limeA' : 'limeB', s: 1.4 + rng() * 0.25, yaw: rng() * 6.28, y: 0 });
    }
  }
  plantTrees(K, trees, 'lmGd-trees');
  svc.trees = { count: trees.length, osm: osmTrees.length };
}
