// landmarksK/grove.js - the woods, the lime allees and the ponds of the Mikhailovsky Garden (Михайловский сад, 9.4 ha, Rossi / Menelaws 1822).  The OSM wood polygons (r1740860 with its 5 holes + the small ones at the
// edges) and the park outline r2614476 are claimed (groups.js) so that the generic trees leave them: this file plants the garden itself with the environment's tree families (instanced, four crown levels, wind sway):
// limes, maples, elms, ashes, poplars, birches, chestnuts in the wood polygon (not on the footways, benches, lamps, fences, the ponds or in front of the pavilion), double rows of small-leaved limes along the
// main allees (the church-axis allee of Leblon w921489517, the E-W axis w127665474, the ring path w127665471), a few blue spruces at the pavilion; and the two lobed ponds (OSM w62802443): dark water, a rubble
// rim and a low green mesh fence with colliders (the Rossi bridge crosses the narrow channel).  Dossier 8.1, photos refs/saviour 086 087 088 090 092 093 094 095.
import * as THREE from 'three';
import { GREEN, ROADS, FURNITURE, LAMPS, WATER, BARRIERS } from '../data/city.js';
import * as G from './geo.js';
import { knockBays } from '../lib/fence-bays.js';
import { plantTrees } from './trees.js';

const WOODS = ['r1740860', 'w145815121', 'w145816613', 'w128976800', 'w691424548', 'w691424549', 'w691424550'];
const ring = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); if (r.length > 1 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.05) r.pop(); return r; };
const pointIn = (r, x, z) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > z) !== (r[j][1] > z) && x < (r[j][0] - r[i][0]) * (z - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
const dSeg = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineOf = (flat) => { const q = []; for (let i = 0; i < flat.length; i += 2) q.push([flat[i], flat[i + 1]]); return q; };
const near = (lines, x, z, d) => { for (const q of lines) { let bb = false; for (const p of q.pts) if (Math.abs(p[0] - x) < d + 30 && Math.abs(p[1] - z) < d + 30) { bb = true; break; } if (!bb) continue; for (let i = 0; i + 1 < q.pts.length; i++) if (dSeg(x, z, q.pts[i], q.pts[i + 1]) < (q.w ?? d)) return true; } return false; };

export function grove(K) {
  const ctx = K.ctx, rng = ctx.rng(3301), P = K.P, M = K.M, ph = ctx.physics;
  const woods = WOODS.map((id) => GREEN.find((g) => g.id === id)).filter(Boolean).map((g) => ({ o: ring(g.polys[0].o), h: g.polys[0].h.map(ring) }));
  const inWood = (x, z) => woods.some((w) => pointIn(w.o, x, z) && !w.h.some((h) => pointIn(h, x, z)));
  const pond = WATER.find((w) => w.id === 'w62802443'), pondRing = pond ? ring(pond.polys[0].o) : null;
  const GB = [-1215, -825, -1000, -685];                                                                    // the garden's bounding box
  const inGB = (x, z) => x > GB[0] && x < GB[1] && z > GB[2] && z < GB[3];
  const foot = []; for (const r of ROADS) if ((r.hw === 'footway' || r.hw === 'path' || r.hw === 'steps' || r.hw === 'pedestrian' || r.hw === 'service') && r.pts.length >= 4) { const pts = lineOf(r.pts); if (pts.some((p) => inGB(p[0], p[1]))) foot.push({ pts, w: (r.hw === 'service' ? 4.0 : 2.7) }); }
  const fences = []; for (const b of BARRIERS) if (b.kind === 'fence' || b.kind === 'wall') { const pts = lineOf(b.pts); if (pts.some((p) => inGB(p[0] + 0, p[1]))) fences.push({ pts, w: 3.0 }); }
  const solids = FURNITURE.filter((f) => inGB(f.x, f.z)).map((f) => [f.x, f.z, 2.0]).concat(LAMPS.filter((l) => inGB(l.x, l.z)).map((l) => [l.x, l.z, 2.4]));
  const keepOut = [[-971, -935, 17], [-1053, -886, 12], [-1235, -791, 10]];                                  // the pavilion front, the oak, the playground
  const pondDist = (x, z) => { if (!pondRing) return 99; let d = 1e9; for (let i = 0; i < pondRing.length; i++) d = Math.min(d, dSeg(x, z, pondRing[i], pondRing[(i + 1) % pondRing.length])); return pointIn(pondRing, x, z) ? -d : d; };
  const trees = [];
  const ok = (x, z, r = 4.4) => {
    if (near(foot, x, z, 2.7) || near(fences, x, z, 3.0)) return false;
    if (solids.some((s) => Math.hypot(s[0] - x, s[1] - z) < s[2])) return false;
    if (keepOut.some((k) => Math.hypot(k[0] - x, k[1] - z) < k[2])) return false;
    if (pondDist(x, z) < 3.0) return false;
    return !trees.some((t) => Math.hypot(t.x - x, t.z - z) < r);
  };
  // ---- limes in double rows along the main allees (every ~8 m, 5.4 m either side of the axis)
  const allee = (id, offs = 5.4) => {
    const r = ROADS.find((q) => q.id === id); if (!r) return;
    const pts = lineOf(r.pts);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 2) continue;
      const nx = -dz / l, nz = dx / l, n = Math.max(1, Math.round(l / 8));
      for (let k = 0; k < n; k++) for (const s of [-1, 1]) {
        const t = (k + 0.5) / n, x = a[0] + dx * t + nx * offs * s + (rng() - 0.5) * 0.8, z = a[1] + dz * t + nz * offs * s + (rng() - 0.5) * 0.8;
        if (!inGB(x, z) || near(fences, x, z, 3.0) || solids.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2]) || pondDist(x, z) < 3 || keepOut.some((q) => Math.hypot(q[0] - x, q[1] - z) < q[2]) || trees.some((q) => Math.hypot(q.x - x, q.z - z) < 5.5)) continue;
        trees.push({ x, z, fam: rng() < 0.7 ? 'limeA' : 'limeB', s: 1.0 + rng() * 0.28, yaw: rng() * 6.28, y: 0.0 });
      }
    }
  };
  for (const id of ['w921489517', 'w127665474', 'w127665471']) allee(id);
  // ---- the woods: a jittered grid, a mix of broad-leaved families
  const FAM = [['limeA', 0.3], ['limeB', 0.12], ['mapleA', 0.2], ['elm', 0.1], ['ash', 0.08], ['poplar', 0.05], ['birchA', 0.07], ['birchB', 0.03], ['chestnut', 0.05]];
  const pick = () => { let r = rng(), s = 0; for (const [f, w] of FAM) { s += w; if (r < s) return f; } return 'limeA'; };
  for (let z = GB[2]; z <= GB[3]; z += 7.2) for (let x = GB[0]; x <= GB[1]; x += 7.2) {
    const px = x + (rng() - 0.5) * 4.6, pz = z + (rng() - 0.5) * 4.6;
    if (!inWood(px, pz) || rng() > 0.9 || !ok(px, pz, 4.9)) continue;
    const fam = pick(), small = fam.startsWith('birch') || fam === 'poplar';
    trees.push({ x: px, z: pz, fam, s: (small ? 0.9 : 0.8) + rng() * 0.5, yaw: rng() * 6.28, y: 0.0 });
  }
  // blue spruces and a few clipped limes in front of the pavilion
  for (const [x, z, f, sc] of [[-993, -929, 'spruceA', 1.0], [-950, -930, 'spruceB', 0.95], [-985, -950, 'spruceA', 0.8], [-958, -953, 'spruceB', 0.85]]) trees.push({ x, z, fam: f, s: sc, yaw: 0, y: 0 });
  K.svc.gardenTrees = trees.length;
  plantTrees(K, trees, 'lmK-garden-trees');

  // ---- the ponds: water, a rubble rim and a low mesh fence (OSM w62802443); the channel with the Rossi bridge stays open
  if (pondRing) {
    const water = ctx.mat.toon('#34646c', { name: 'lmK-pond', paint: 0.02, emissive: '#10303a', emissiveIntensity: 0.25, polygonOffset: -1 });
    const rim = ctx.mat.toon('#8a8478', { name: 'lmK-pondRim', paint: 0.05 });
    const post = ctx.mat.toon('#2f4a34', { name: 'lmK-pondPost' });
    P.cap(water, pondRing, 0.05, true, 6);
    ph.addWater({ ring: pondRing.flat(), level: 0.05 });                                       // (water is reachable, docs/AREAS.md 13.7: a pond to wade in; its mesh fence is a row of breakable bays)
    const fbays = [], n = pondRing.length, bridge = [[-874, -708], [-875, -725]];
    let area = 0; for (let i = 0, j = n - 1; i < n; j = i++) area += pondRing[j][0] * pondRing[i][1] - pondRing[i][0] * pondRing[j][1];
    for (let i = 0; i < n; i++) {
      const a = pondRing[i], b = pondRing[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.4) continue;
      let nx = dz / l, nz = -dx / l; if (area < 0) { nx = -nx; nz = -nz; }                                 // outward normal
      const w0 = 0.0, w1 = 0.7, y = 0.1;
      P.quad(rim, [a[0] + nx * w0, y, a[1] + nz * w0], [b[0] + nx * w0, y, b[1] + nz * w0], [b[0] + nx * w1, y, b[1] + nz * w1], [a[0] + nx * w1, y, a[1] + nz * w1], [0, 1, 0], [[0, 0], [l / 2, 0], [l / 2, 0.4], [0, 0.4]]);
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (bridge.some((q) => Math.hypot(q[0] - mx, q[1] - mz) < 9)) continue;
      const fx = (p) => [p[0] + nx * 1.4, p[1] + nz * 1.4];
      const fa = fx(a), fb = fx(b), k = Math.max(1, Math.round(l / 3));
      fbays.push({ x0: fa[0], z0: fa[1], x1: fb[0], z1: fb[1], y: 0, postAts: Array.from({ length: k + 1 }, (_, q) => q / k) });
    }
    if (fbays.length) {                                                                                  // the low mesh fence: a BAY per segment (two tubes, posts every ~3 m, a thin collider): lib/fence-bays.js, a car at 8 km/h breaks it
      const tube = (r) => new THREE.CylinderGeometry(r, r, 1, 4, 1).rotateZ(Math.PI / 2).translate(0.5, 0, 0);
      knockBays(ctx, { name: 'lmK-pondfence', bays: fbays, far: 260,
        parts: [{ geo: tube(0.02), mat: post, name: 'top', far: 260, stretch: true, y: 0.95 }, { geo: tube(0.015), mat: post, name: 'mid', far: 260, stretch: true, y: 0.5 },
          { geo: new THREE.BoxGeometry(0.08, 1.0, 0.08).translate(0, 0.5, 0), mat: post, name: 'post', far: 260, ats: (q) => q.postAts }],
        collider: () => ({ y0: 0, y1: 1.2, thick: 0.2, e0: 0, e1: 0 }),
        rec: () => ({ kind: 'fence', mass: 40, h: 1.0, r: 0.05, anchored: 8, hitK: 0.1, metal: false, minDv: 0 }) });
    }
  }
  void THREE; void G;
}
export const build = grove;
