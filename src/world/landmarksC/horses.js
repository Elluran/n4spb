// landmarksC/horses.js - the four bronze "Horse Tamers" (Клодтовы кони, 1838-1851) and their pink granite pedestals at the four ends of the Anichkov Bridge.
// Pedestal: 4.2 x 2.6 m, 3.2 m high above the deck (stepped base 0.45, die 2.2, cap slab 0.3, black bronze plinth 0.25), standing on the deck end at the outer edge, in line with the
// railing (photos refs/fontanka 01 15 04).  Each group is built from tapered cylinders and ellipsoids (shared figure kit klodt.js: lofted horse + athletic youth with face and hands, ~8 k triangles per group) from joint coordinates:
// a rearing horse (hind legs on the plinth) and a naked youth in four different poses (photos 06 07 08 63 14):
//   A "Конь с идущим юношей" (1838): the youth stands beside the horse, the right arm stretched to the bridle, the left hand low on the rein        -> SW (west bank, unshod)
//   B "Юноша, берущий коня под уздцы" (1841): the horse rears wildly, the youth faces it with a raised arm on the bridle                         -> NW (plaque + shell scars)
//   C "Юноша, сдерживающий коня" (1851): the youth kneels and pulls the reins with both hands                                                     -> SE (east bank, shod)
//   D "Юноша, поверженный конём" (1851): the youth lies at the plinth under the rearing horse, one hand on the bridle                            -> NE
// The horses' heads point along Nevsky (outward at the ends), the youths stand on the roadway side; the groups never face the river.  Bronze #33372f, patina #566a5c.
import { figureMats } from '../lib/figures.js';
import { groupFigs, KLODT_SCALE } from './klodt.js';
import { CX, CZ, TH, EDGE, FACE, ROAD, yDeck, toWorld, BOX_ROT } from './frame.js';

const SCALE = 1.15;                                       // the groups are drawn 15 % larger than the joint tables (stronger silhouette against the 3.2 m pedestals)

/** the pedestal block (centre uc, vc at the outer edge, stands on the deck at height y0) */
function pedestal(P, M, uc, vc, y0) {
  const dx = 2.1, dz = 1.3, yb = y0, yd = yb + 0.45, yc = yd + 2.2, ys = yc + 0.3;
  P.box(M.coping, uc - dx - 0.2, uc + dx + 0.2, yb - 0.1, yd, vc - dz - 0.15, vc + dz + 0.15, 'b', 2.2);
  P.box(M.granite, uc - dx, uc + dx, yd, yc, vc - dz, vc + dz, 'b', 2.2);
  P.box(M.coping, uc - dx - 0.15, uc + dx + 0.15, yc, ys, vc - dz - 0.15, vc + dz + 0.15, '', 2.2);
  P.box(M.bronzePlinth, uc - dx + 0.1, uc + dx - 0.1, ys, ys + 0.25, vc - dz + 0.1, vc + dz - 0.1, 'b', 1);
  return ys + 0.25;
}

export function buildHorses(K, M, ctx) {
  const P = K.P, T = ctx.mat.toon;
  M.bronze = T('#3a3f38', { paint: 0.03, name: 'lmC-bronze' });
  M.patina = T('#566a5c', { paint: 0.04, name: 'lmC-patina' });
  const rng = ctx.rng('lmC-scars');
  const groups = [];
  P.push(CX, 0, CZ, -TH);
  const CORNERS = [
    { id: 'NE', sx: 1, side: -1, pose: 'D' }, { id: 'SE', sx: 1, side: 1, pose: 'C' },
    { id: 'SW', sx: -1, side: 1, pose: 'A' }, { id: 'NW', sx: -1, side: -1, pose: 'B' },
  ];
  for (const c of CORNERS) {
    const uc = c.sx * 25.0, vc = c.side * (EDGE - 1.3), y0 = yDeck(uc);
    const top = pedestal(P, M, uc, vc, y0);
    // the horse and the youth (shared figure kit, klodt.js): kit frame +z = forward along Nevsky, +x = left; sgn keeps the groups unmirrored on all four corners
    const gf = groupFigs(c.pose, c.side * c.sx), mk = figureMats(ctx).keys('bronze', 'bronze'), ry = c.sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    gf.horse.place(P, mk, uc, top, vc, ry, KLODT_SCALE.horse * SCALE);
    gf.youth.place(P, mk, uc, top, vc, ry, KLODT_SCALE.youth * SCALE);
    const w = toWorld(uc, vc);
    ctx.physics.addBox(w.x, w.z, 4.6, 3.0, BOX_ROT, -6, top + 0.5);
    groups.push({ id: c.id, pose: c.pose, x: w.x, z: w.z, top });
    if (c.id === 'NW') {
      // the plaque and the 1942 shell scars on the west and north faces (decals 2 cm off the granite, polygonOffset via the materials)
      const yp = y0 + 0.45 + 1.15, uf = uc - 2.1 - 0.025;
      P.quad(M.plaque, [uf, yp - 0.15, vc - 0.3], [uf, yp - 0.15, vc + 0.3], [uf, yp + 0.15, vc + 0.3], [uf, yp + 0.15, vc - 0.3], [-1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      P.quad(M.black, [uf - 0.008, yp - 0.1, vc - 0.24], [uf - 0.008, yp - 0.1, vc + 0.24], [uf - 0.008, yp - 0.08, vc + 0.24], [uf - 0.008, yp - 0.08, vc - 0.24], [-1, 0, 0]);
      for (let i = 0; i < 16; i++) {
        const onWest = i < 9, r = 0.05 + rng() * 0.09, yy = y0 + 0.9 + rng() * 1.5;
        const v = vc + (rng() - 0.5) * 2.2, u = uc + (rng() - 0.5) * 3.6;
        const pts = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; pts.push(a); }
        if (onWest) { const uf2 = uc - 2.1 - 0.02; P.fan(M.scar, pts.map((a) => [uf2, yy + Math.sin(a) * r, v + Math.cos(a) * r]), [-1, 0, 0]); }
        else { const vf = vc - 1.3 - 0.02; P.fan(M.scar, pts.map((a) => [u + Math.cos(a) * r, yy + Math.sin(a) * r, vf]), [0, 0, -1]); }
      }
    }
  }
  P.pop();
  K.svc.photoSpots.push({ x: toWorld(0, 26).x, z: toWorld(0, 26).z, yaw: 180 - 14, pitch: 4, name: 'Аничков мост · Клодтовы кони' });
  K.svc.monuments.push(...groups.map((g) => ({ id: 'klodt-' + g.id, name: 'Клодтовы кони · ' + g.id, x: g.x, z: g.z, h: g.top + 3.4 })));
  void FACE; void ROAD;
  return groups;
}
