// landmarksE/promenade.js - the pedestrian promenade in front of the Nevsky front of Gostiny Dvor (u 506-731, v 13.5-36; docs/research/gostiny-dvor-ostrovsky.md section 3.6, photos refs/ostrovsky 001 008 013 029):
// pale grey granite slabs with darker strips (OSM area r16467256, clipped at the facade line), a double row of young small-leaved lindens (5-6 m) at the OSM tree nodes, each in a lawn island with a
// granite curb and clipped low shrubs (the 44 OSM flowerbed polygons), and the row of four-sided lanterns on slim dark-green poles with a round granite bench ring round each foot (11 units at
// v 24.5, none in front of the portico).  Bus shelters, the kerb lamps with two globes and the advertising pillars belong to streets / props.
import * as THREE from 'three';
import { AREAS, GREEN, TREES } from '../data/city.js';
import { toUV, toWorld, ringOf } from './frame.js';
import { band, ringEdges } from './kit.js';

const IN = (x, z) => { const q = toUV(x, z); return q.u > 495 && q.u < 745 && q.v > 8 && q.v < 40; };

/** clip a polygon (uv) to v <= vmax (Sutherland-Hodgman against one half plane) */
function clipV(pts, vmax) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], ain = a[1] <= vmax, bin = b[1] <= vmax;
    if (ain) out.push(a);
    if (ain !== bin) { const t = (vmax - a[1]) / (b[1] - a[1]); out.push([a[0] + (b[0] - a[0]) * t, vmax]); }
  }
  return out;
}

export function build(K, ctx) {
  const P = K.P, M = K.G.M, ph = ctx.physics;
  // ---- paving: the OSM polygon, clipped at v = 35.4 (the facade plane is v ~ 35.2), laid at the pavement level
  const area = AREAS.find((a) => a.id === 'r16467256');
  if (area) {
    const lineV = (u) => 35.8 - 0.0059 * (u - 522.8);
    const uv = ringOf(area.polys[0].o).map((p) => { const q = toUV(p[0], p[1]); return [q.u, q.v - lineV(q.u)]; });
    const clipped = clipV(uv, -0.06).map(([u, v]) => toWorld(u, v + lineV(u)));
    P.cap(M.pave, clipped, 0.12, true, 2.4);
  }
  // ---- islands: lawn + curb + clipped shrubs, one young linden per OSM tree node
  const islandMat = M.lawn, shrub = K.mat('#4c7f40', { name: 'lmE-boxwood' });
  const ico = new THREE.IcosahedronGeometry(1, 0);
  let n = 0;
  for (const g of GREEN) {
    if (g.kind !== 'flowerbed') continue;
    const o = ringOf(g.polys[0].o); if (!IN(o[0][0], o[0][1])) continue;
    P.cap(islandMat, o, 0.145, true, 4);
    const ed = ringEdges({ o: g.polys[0].o, h: [] }, 0.1);
    band(P, ed, 0.12, 0.17, 0.12, { front: M.graniteGrey, top: M.graniteGrey }, {});
    let cx = 0, cz = 0; for (const p of o) { cx += p[0]; cz += p[1]; } cx /= o.length; cz /= o.length;
    for (const [dx, dz, r] of [[0.7, 0.5, 0.42], [-0.6, 0.6, 0.38], [0.1, -0.8, 0.4]]) P.geo(shrub, ico, cx + dx, 0.15 + r * 0.7, cz + dz, 0, 0, 0, r, r * 0.8, r);
    n++;
  }
  ico.dispose();
  let nt = 0;
  for (let i = 0; i + 1 < TREES.length; i += 2) { const x = TREES[i], z = TREES[i + 1]; if (!IN(x, z)) continue; K.trees.add(x, z, { kind: 'young', h: 5.6 + ((i * 7) % 5) * 0.2, r: 1.55, trunk: 2.1 }); nt++; }
  // ---- lanterns with granite bench rings (v 24.5), none in front of the portico (u 604-639)
  const iron = M.ironGreen, glass = K.G.M.lanternGlass || (K.G.M.lanternGlass = ctx.mat.emissive('#ffd9a0', 0.55));
  const us = [570, 581, 592, 604, 639, 650, 662, 674, 685, 696, 708];
  for (const u of us) {
    const [x, z] = toWorld(u, 24.5);
    P.cyl(iron, [x, 0.12, z], [x, 0.4, z], 0.22, 0.17, 8, true);
    P.cyl(iron, [x, 0.4, z], [x, 4.4, z], 0.1, 0.075, 8, false);
    P.cyl(iron, [x, 0.9, z], [x, 1.1, z], 0.17, 0.12, 8, true);
    P.cyl(iron, [x, 4.35, z], [x, 4.6, z], 0.2, 0.16, 6, true);
    P.cyl(glass, [x, 4.6, z], [x, 5.4, z], 0.4, 0.42, 4, true);                                     // four-sided lantern (4-gon prism)
    P.cyl(iron, [x, 5.4, z], [x, 5.95, z], 0.52, 0.03, 4, true);                                    // pyramid roof with a spike
    // round granite bench ring, 2 m across, 0.45 m high
    const seg = 14, r0 = 0.95, r1 = 1.5;
    for (let k = 0; k < seg; k++) {
      const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      P.quad(M.graniteGrey, [x + c0 * r0, 0.45, z + s0 * r0], [x + c0 * r1, 0.45, z + s0 * r1], [x + c1 * r1, 0.45, z + s1 * r1], [x + c1 * r0, 0.45, z + s1 * r0], [0, 1, 0]);
      P.quad(M.graniteGrey, [x + c0 * r1, 0.0, z + s0 * r1], [x + c1 * r1, 0.0, z + s1 * r1], [x + c1 * r1, 0.45, z + s1 * r1], [x + c0 * r1, 0.45, z + s0 * r1], [c0 + c1, 0, s0 + s1]);
      P.quad(M.graniteGrey, [x + c1 * r0, 0.0, z + s1 * r0], [x + c0 * r0, 0.0, z + s0 * r0], [x + c0 * r0, 0.45, z + s0 * r0], [x + c1 * r0, 0.45, z + s1 * r0], [-(c0 + c1), 0, -(s0 + s1)]);
    }
    ph.addCylinder(x, z, 1.5, 0, 0.45); ph.addCylinder(x, z, 0.2, 0, 5);
    K.svc.benches.push({ x, z, rotY: 0, len: 3.0 }); K.svc.lamps.push({ x, z, h: 6 });
  }
  K.svc.spots.promenade = { islands: n, trees: nt, lanterns: us.length };
  perinnayaPortico(K, ctx);
}

// ------------------------------------------------------------------------------------------------ the Perinnaya-line portico (Nevsky 35, "Перинные ряды", Rusca 1805, rebuilt 1972)
// No OSM polygon (west-nevsky-2.md: position +-20 m, ~25 m wide, 9 m high, #f0d890 / white): a single-storey pavilion with SIX Doric columns and a triangular pediment on the Nevsky line west of
// the Gostiny Dvor corner, across the Perinnaya mouth.  Frame: atUV(761, 24): local x = u - 761, z = north.
import { atUV } from './frame.js';
import { tuscan } from './columns.js';
export function perinnayaPortico(K, ctx) {
  const P = K.P, M = K.G.M, white = M.white, wall = K.wall('#f0d890'), ph = ctx.physics;
  const st = ctx.services.streets;                                                                      // streets is built before this module
  atUV(P, 761, 24, () => {
    const hw = 12.5, zb = -2.6, depth = 9.4;
    for (let x0 = -hw - 0.6; x0 < hw + 0.6 - 1e-6; x0 += 1.4) {                                        // the plinth in 1.4 m pieces: none on the Dumskaya asphalt (flush road)
      const x1 = Math.min(x0 + 1.4, hw + 0.6);
      if (!st || [zb - 0.1, 0, 2.6].every((z) => st.net.cover(...toWorld(761 + (x0 + x1) / 2, 24 - z), {}) < -0.1)) P.box(M.plinth, x0, x1, 0, 0.45, zb - 0.1, 2.6, 'b');
    }
    K.wallQuad(wall, -hw, hw, 0.45, 7.2, 4, zb);
    for (const x of [-9.8, -5.9, -2.0, 2.0, 5.9, 9.8]) { const arch = K.window; void arch; }
    for (const x of [-8.4, -4.2, 0, 4.2, 8.4]) { P.push(0, 0, zb, 0); K.window({ x, y: 0.6, w: 2.0, h: 4.4, head: 'arch', sw: 0.2, d: 0.08, frame: 'white', surMat: white, sillMat: white, sill: false }); P.pop(); }
    // the portico position is +-20 m: Dumskaya runs through its middle bay, so a column that would stand on that asphalt is left out
    for (const x of [-10.5, -6.3, -2.1, 2.1, 6.3, 10.5]) { if (st && st.net.cover(...toWorld(761 + x, 24), {}) > -0.9) continue; tuscan(K, white, x, 0.0, 0.45, 7.0, 0.55, 12); const m = P.m.elements; ph.addCylinder(m[0] * x + m[8] * 0.0 + m[12], m[2] * x + m[10] * 0.0 + m[14], 0.6, 0, 7.5); }
    P.box(white, -hw - 0.3, hw + 0.3, 7.0, 7.9, zb, 0.9, 'b'); P.box(wall, -hw, hw, 7.9, 8.5, zb, 0.7, 'b'); P.box(white, -hw - 0.5, hw + 0.5, 8.5, 9.0, zb, 1.2, 'b');
    const sh = new THREE.Shape(); sh.moveTo(-hw - 0.5, 9.0); sh.lineTo(hw + 0.5, 9.0); sh.lineTo(0, 11.0); sh.lineTo(-hw - 0.5, 9.0); P.extrude(white, sh, zb, 1.2, 1, 4);
    const fill = new THREE.Shape(); fill.moveTo(-hw + 0.6, 9.2); fill.lineTo(hw - 0.6, 9.2); fill.lineTo(0, 10.6); fill.lineTo(-hw + 0.6, 9.2); P.extrude(wall, fill, zb, 0.9, 1, 4);
    P.box(M.roofDark, -hw, hw, 7.2, 7.4, -depth, zb + 0.2, 'b');                                      // the flat roof behind the pediment
    P.box(wall, -hw, hw, 0.45, 7.2, -depth, zb, 'b');
  });
  const [x, z] = toWorld(761, 33);
  ph.addBox(x, z, 25.0, 9.0, ROT_N, 0, 8);
  K.svc.monuments.push({ id: 'perinnaya-portico', name: 'Портик Перинной линии', nameEn: 'Perinnaya line portico', x, z, h: 11 });
}
import { ROT as ROT_N } from './frame.js';
