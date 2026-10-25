// landmarksMars/suvorov.js - the Suvorov monument (A. V. Suvorov as Mars, M. Kozlovsky 1799-1801) on its island on Suvorov Square (OSM n334791500 at (-1196.7, -1501.9)).
// Bronze figure 3.4 m in Roman armour (plumed helmet, cuirass with a skirt of leather strips, bare calves, a cloak), sword raised in the right hand, an oval shield with the double-headed eagle lowered on
// the left, an altar with the three crowns and the tiara at his foot, on a ROUND polished dark-red granite pedestal 4.5 m high (moulded base, a gilded band at two thirds, a round cornice, the gilded
// relief of two winged geniuses with the inscribed shield on the front).  FRONT faces north-north-west toward the Trinity Bridge (the Field sees his back).  The island (OSM pedestrian area w151671746,
// 12 x 35 m between the carriageways) gets a granite kerb, a lawn, a clipped hedge ring and a flower bed.  Dossier mars-field.md section 5, photos suv_03 suv_07 suvsq_01.
import * as THREE from 'three';
import { AREAS } from '../data/city.js';
import { human, extend, cached, figureMats, V } from '../lib/figures.js';
import { fillPoly, inflate, pairs } from './surfaces.js';

const MON = { x: -1196.7, z: -1501.9 };

function suvorov() {
  return cached('lmM-suvorov', () => {
    const base = human({
      detail: 0.9, body: { muscle: 0.7, bulk: 1.28, shoulders: 1.2 },
      pose: {
        pelvisRot: [0, -0.12, 0.04], spine: [-0.05, 0.16, -0.05], head: [-0.06, -0.18, 0.04],
        legs: { L: { foot: [0.17, 0, 0.17], yaw: 0.35 }, R: { foot: [-0.12, 0, -0.05], yaw: -0.12 } },
        arms: {
          R: { hand: [-0.36, 1.32, 0.34], pole: [-0.6, -0.5, -0.4], grip: 'hold', palm: [0.3, 0.5, 1] },
          L: { hand: [0.36, 0.9, 0.22], pole: [0.8, -0.3, -0.3], grip: 'hold', palm: [-0.4, 0.2, 1] },
        },
      },
      outfit: { torso: 'cuirass', hem: 0.34, flare: 0.5, cape: 'back', capeLen: 1.0, hat: 'roman', trousers: 'none', boots: false, belt: true },
      face: { age: 0.15, hair: 'short', brow: 0.8, jaw: 0.95, seed: 3 },
    });
    return extend(base, (S, info) => {
      const hr = info.j.hands.R.hold, hl = info.j.hands.L.hold;
      // the sword: grip in the right fist, straight blade up (1.1 m real / 1.9 = 0.58 in figure metres), cross guard, pommel
      const sd = V.unit([-0.5, 0.8, 0.3]), at = (t) => V.add(hr, V.mul(sd, t));
      S.tube('main', [at(-0.1), at(0.0), at(0.04)], [[0.012, 0.012], [0.013, 0.013], [0.012, 0.012]], { seg: 6, per: 3 });
      S.blob('accent', at(-0.115), [0.02, 0.02, 0.02], { w: 6, h: 5 });
      S.blob('accent', at(0.055), [0.06, 0.01, 0.014], { dir: sd, ref: [0, 0, 1], w: 8, h: 5 });
      S.tube('main', [at(0.06), at(0.35), at(0.66)], [[0.018, 0.007], [0.016, 0.006], [0.009, 0.003]], { seg: 6, per: 6 });
      // the oval shield (0.9 x 0.7 m real) lowered in front of the left leg: a thin ellipsoid + a gilded boss / eagle plaque
      const sc = V.add(hl, [0.07, -0.16, 0.09]);
      S.blob('main', sc, [0.2, 0.3, 0.035], { dir: [0.55, 0.05, 1], ref: [0, 1, 0], w: 14, h: 9 });
      S.blob('accent', V.add(sc, [0.03, 0.0, 0.04]), [0.11, 0.15, 0.012], { dir: [0.55, 0.05, 1], ref: [0, 1, 0], w: 10, h: 7 });
      S.blob('accent', V.add(sc, [0.03, 0.07, 0.05]), [0.035, 0.05, 0.012], { dir: [0.55, 0.05, 1], ref: [0, 1, 0], w: 8, h: 6 });
    }, { detail: 0.9 });
  });
}

/** a curved strip on a cylinder: angles a0..a1 (radians, 0 = +z, sin -> x), radius r, y0..y1, n segments; uv spans 0..1 */
function curvedPlane(P, mat, cx, cz, rBot, rTop, a0, a1, y0, y1, n = 10) {
  for (let i = 0; i < n; i++) {
    const t0 = a0 + (a1 - a0) * i / n, t1 = a0 + (a1 - a0) * (i + 1) / n, tm = (t0 + t1) / 2;
    const p = (t, y) => { const r = rBot + (rTop - rBot) * (y - y0) / (y1 - y0); return [cx + Math.sin(t) * r, y, cz + Math.cos(t) * r]; };
    P.quad(mat, p(t0, y0), p(t1, y0), p(t1, y1), p(t0, y1), [Math.sin(tm), 0, Math.cos(tm)], [[i / n, 0], [(i + 1) / n, 0], [(i + 1) / n, 1], [i / n, 1]]);
  }
}

export function suvorovMonument(K) {
  const ctx = K.ctx, P = K.P, M = K.M, ph = ctx.physics, T = ctx.mat.toon;
  const island = AREAS.find((a) => a.id === 'w151671746');
  // ---- the island: kerb (0.17 m), lawn, flower bed ring, clipped hedge ring
  if (island) {
    const ring = pairs(island.polys[0].o), inner = inflate(ring, -0.3);
    const n = ring.length;
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n], ia = inner[i], ib = inner[(i + 1) % n];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      // outward normal from the ring orientation: points away from the inner ring
      let nx = dz / l, nz = -dx / l; const mx = (a[0] + b[0]) / 2 - (ia[0] + ib[0]) / 2, mz = (a[1] + b[1]) / 2 - (ia[1] + ib[1]) / 2; if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
      P.quad(M.kerb, [a[0], 0.03, a[1]], [b[0], 0.03, b[1]], [b[0], 0.17, b[1]], [a[0], 0.17, a[1]], [nx, 0, nz], [[0, 0], [l / 0.3, 0], [l / 0.3, 0.5], [0, 0.5]]);
      P.quad(M.kerb, [a[0], 0.17, a[1]], [b[0], 0.17, b[1]], [ib[0], 0.17, ib[1]], [ia[0], 0.17, ia[1]], [0, 1, 0], [[a[0], a[1]], [b[0], b[1]], [ib[0], ib[1]], [ia[0], ia[1]]]);
    }
    fillPoly(P, M.lawnTop, inflate(ring, -0.28), 0.155, { tile: 6 });
    K.svc.island = { ring };
  }
  // flower bed (a ring of red / pink flowers, r 3.6 .. 4.6) and a clipped hedge ring (r 4.6 .. 5.2, 0.55 m high) around the monument; the granite disc under the pedestal r 2.9
  const disc = (r0, r1, y, mat, seg = 40) => { for (let i = 0; i < seg; i++) { const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2; const q = (a, r) => [MON.x + Math.sin(a) * r, y, MON.z + Math.cos(a) * r]; P.quad(mat, q(a0, r0), q(a1, r0), q(a1, r1), q(a0, r1), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]); } };
  disc(2.7, 3.3, 0.172, M.kerb); disc(0.0, 2.7, 0.176, M.granite);
  disc(3.3, 4.5, 0.17, M.flowers);
  for (let i = 0; i < 40; i++) { const a0 = i / 40 * Math.PI * 2, a1 = (i + 1) / 40 * Math.PI * 2, am = (a0 + a1) / 2; const q = (a, r, y) => [MON.x + Math.sin(a) * r, y, MON.z + Math.cos(a) * r];
    P.quad(M.hedge, q(a0, 5.2, 0.17), q(a1, 5.2, 0.17), q(a1, 5.2, 0.7), q(a0, 5.2, 0.7), [Math.sin(am), 0, Math.cos(am)], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    P.quad(M.hedge, q(a0, 5.2, 0.7), q(a1, 5.2, 0.7), q(a1, 4.7, 0.7), q(a0, 4.7, 0.7), [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    P.quad(M.hedge, q(a0, 4.7, 0.7), q(a1, 4.7, 0.7), q(a1, 4.7, 0.17), q(a0, 4.7, 0.17), [-Math.sin(am), 0, -Math.cos(am)], [[0, 0], [1, 0], [1, 1], [0, 1]]); }
  // ---- the pedestal: round, slightly tapering, 4.5 m, y0 = 0.176
  const y0 = 0.176, cyl = (mat, a, b, r0, r1, seg = 32) => P.cyl(mat, [MON.x, y0 + a, MON.z], [MON.x, y0 + b, MON.z], r0, r1, seg, true);
  cyl(M.suvBase, 0, 0.28, 1.95, 1.9); cyl(M.suvBase, 0.28, 0.5, 1.8, 1.72); cyl(M.suvBase, 0.5, 0.62, 1.66, 1.62);   // moulded base: two courses + a fillet
  cyl(M.suvPed, 0.62, 3.0, 1.55, 1.46);                                                                           // the shaft below the band
  cyl(M.gilt, 3.0, 3.16, 1.5, 1.5);                                                                               // the gilded ring band at two thirds
  cyl(M.suvPed, 3.16, 3.86, 1.46, 1.42);
  cyl(M.suvBase, 3.86, 4.0, 1.62, 1.62); cyl(M.suvBase, 4.0, 4.22, 1.68, 1.6); cyl(M.suvBase, 4.22, 4.5, 1.7, 1.7);  // round cornice and the cap slab
  // the front relief (north-north-west): two winged geniuses with the shield and the inscription, gilt on the red granite (a canvas texture on a curved panel)
  const reliefMat = T('#ffffff', { name: 'lmM-suvRelief', paint: 0.0, polygonOffset: -3, transparent: true, alphaTest: 0.3, side: 'double', map: ctx.tex.draw(512, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const gold = '#d8a838', dark = '#a67c24';
    const genius = (cx, flip) => {
      g.save(); g.translate(cx, 0); g.scale(flip, 1);
      g.fillStyle = gold; g.beginPath(); g.arc(0, 78, 24, 0, 6.3); g.fill();                                       // head
      g.beginPath(); g.moveTo(-20, 108); g.quadraticCurveTo(0, 96, 20, 108); g.lineTo(44, 300); g.lineTo(-24, 300); g.closePath(); g.fill();   // robe
      g.fillStyle = dark; g.beginPath(); g.moveTo(-18, 128); g.quadraticCurveTo(-92, 70, -70, 20); g.quadraticCurveTo(-52, 90, -10, 118); g.fill();    // wing
      g.fillStyle = gold; g.fillRect(34, 120, 8, 150);                                                                // palm / laurel staff
      g.beginPath(); g.ellipse(38, 112, 10, 24, 0.3, 0, 6.3); g.fill();
      g.restore();
    };
    genius(88, 1); genius(w - 88, -1);
    g.fillStyle = gold; g.beginPath(); g.ellipse(w / 2, 180, 118, 140, 0, 0, 6.3); g.fill();                         // the shield with a rim
    g.fillStyle = '#7c4a3c'; g.beginPath(); g.ellipse(w / 2, 180, 102, 124, 0, 0, 6.3); g.fill();
    g.fillStyle = gold; g.textAlign = 'center'; g.textBaseline = 'middle';
    ctx.tex.fitText(g, 'Князь Италийской', w / 2, 100, 190, 24, ctx.tex.FONTS.serif, 700);
    ctx.tex.fitText(g, 'Графъ Суворовъ', w / 2, 140, 190, 24, ctx.tex.FONTS.serif, 700);
    ctx.tex.fitText(g, 'Рымникской', w / 2, 180, 190, 24, ctx.tex.FONTS.serif, 700);
    ctx.tex.fitText(g, '1801', w / 2, 232, 120, 28, ctx.tex.FONTS.serif, 700);
    g.fillRect(w / 2 - 70, 262, 140, 5);
  }, { key: 'lmM-suvRelief', repeat: [1, 1] }) });
  M.decals.add(reliefMat);
  const face = Math.atan2(-20.3, -65.1);                                                                          // toward the Trinity Bridge (south end (-1217, -1567))
  curvedPlane(P, reliefMat, MON.x, MON.z, 1.545, 1.475, face - 0.75, face + 0.75, y0 + 0.9, y0 + 2.75, 12);
  // the facing rotation: curvedPlane takes angles measured as sin -> x, cos -> z, i.e. 0 = +z = the figure's default front: the same convention as the figure's rotY
  // ---- the figure 3.4 m on the pedestal (top y = 0.176 + 4.5), turned toward the bridge; altar with the crowns beside the left foot
  const s = 1.9, yTop = y0 + 4.5;
  const mk = figureMats(ctx).keys('bronze', 'gold');
  P.cyl(M.suvBase, [MON.x, yTop, MON.z], [MON.x, yTop + 0.18, MON.z], 1.3, 1.25, 20, true);                      // the round plinth under the figure
  suvorov().place(P, mk, MON.x, yTop + 0.18, MON.z, face, s);
  P.push(MON.x, yTop + 0.18, MON.z, face);
  P.box(M.bronze, 0.62, 1.44, 0, 0.8, 0.12, 0.94, 'b');                                                            // the altar 0.8 m
  P.box(M.gilt, 0.58, 1.48, 0.8, 0.88, 0.08, 0.98, 'b');
  for (const [x, z] of [[0.82, 0.34], [1.22, 0.4], [1.02, 0.72]]) { P.cyl(M.gilt, [x, 0.88, z], [x, 1.02, z], 0.17, 0.16, 12, true); P.cyl(M.gilt, [x, 1.02, z], [x, 1.12, z], 0.16, 0.05, 12, true); }
  P.pop();
  ph.addCylinder(MON.x, MON.z, 2.0, 0, 8);
  K.svc.monuments.push({ id: 'n334791500', name: 'Памятник А. В. Суворову', x: MON.x, z: MON.z, h: 7.9 });
  const from = { x: MON.x + 18, z: MON.z + 22 };
  K.svc.photoSpots.push({ x: from.x, z: from.z, yaw: Math.atan2(-(MON.x - from.x), -(MON.z - from.z)) * 180 / Math.PI, pitch: 12, name: 'Памятник Суворову на Суворовской площади' });
  K.svc.suvorov = { x: MON.x, z: MON.z, h: 7.9, facing: face };
  void THREE;
}
export const build = suvorovMonument;
