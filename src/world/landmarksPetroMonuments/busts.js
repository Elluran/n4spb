// landmarksPetroMonuments/busts.js - the bronze busts on granite pillars: Chkalov (the Chkalovskaya metro vestibule, 1997), Lenin x2 (Bolshoy pr. 62 and the Alexander Lyceum garden), Shostakovich (the Benois courtyard),
// Roentgen (the institute garden), the seven medics of the Pavlov University alley (Lang, Chernorutsky, Bekhterev, Pavlov, Limberg, Zabolotny, Shuvalova), Blagoev, Rus-Europe (the Janus head of the Peter path).
// Heads: the figure kit `bust()` (lib/figures/human.js) with a face per person (hair, beard, age, seed read from the photos: chk1, lenb2, lenl1, shos1, rent1, med_05..12, blagoev/01); poses and plinths from the
// catalogue entries (docs/research/petro-monuments-2026-north.md section A).  Frame: origin on the ground, +z = front.  [V] = read from a photo, [E] = estimate.
import { extend, V } from '../lib/figures.js';
import { bust2Fig, put3, block, taper, steps, ring, slab, lathe, PAL, plateOn, HF } from './sty.js';

/** the faceted polished column (n sides) from y0 to y1, radius r0 at the bottom, r1 at the top */
function column(P, M, hex, r0, r1, y0, y1, n = 12) { P.tint(hex); lathe(P, M.vc, [[r0, y0], [r1, y1]], n, { caps: true, phi0: Math.PI / n }); }

// ---- Chkalov: a flying helmet with goggles on the forehead, a zipped leather jacket with a turned collar; a round bronze cap ring on a polished 12-sided red-brown column [V chk1]
const flightHelmet = (S, info) => {
  const H = info.head, k = info.k || 1.4; if (!H) return;
  const up = (q) => V.mul(H.y, q * k), fw = (q) => V.mul(H.z, q * k), sd = (q) => V.mul(H.x, q * k);
  S.blob('main', V.add(V.add(H.c, up(0.058)), fw(-0.014)), [0.098 * k, 0.088 * k, 0.108 * k], { dir: H.z, ref: H.x, w: 12, h: 8 });                       // the leather cap over the skull
  for (const s of [1, -1]) {
    S.blobBetween('main', V.add(V.add(H.c, sd(s * 0.083)), V.add(up(0.03), fw(-0.015))), V.add(V.add(H.c, sd(s * 0.088)), V.add(up(-0.1), fw(0.005))), 0.04 * k, 0.012 * k, { w: 8, h: 6, ref: H.z });   // the ear flaps
    S.blob('dark', V.add(V.add(H.c, sd(s * 0.04)), V.add(up(0.05), fw(0.077))), [0.03 * k, 0.02 * k, 0.012 * k], { dir: H.z, ref: H.x, w: 8, h: 6 });          // goggle lens pushed up on the forehead
  }
  S.tube('main', [V.add(V.add(H.c, sd(-0.082)), V.add(up(0.044), fw(0.02))), V.add(V.add(H.c, sd(-0.04)), V.add(up(0.05), fw(0.075))), V.add(V.add(H.c, sd(0)), V.add(up(0.054), fw(0.082))), V.add(V.add(H.c, sd(0.04)), V.add(up(0.05), fw(0.075))), V.add(V.add(H.c, sd(0.082)), V.add(up(0.044), fw(0.02)))], [[0.009 * k, 0.009 * k]], { seg: 6, per: 3, ref: H.y });    // the goggle strap
};
const chkalovBust = () => extend(bust2Fig('chkalov', { style: 'flight', k: 1.35, w: 0.29, face: { age: 0.3, hair: 'none', seed: 301, mouth: 'stern' }, turn: 0.2, pitch: 0.02 }, 0.8), flightHelmet);


/** a bust on a pillar: foot steps, a pillar block, an optional cap slab, the bronze bust (bust2) and the plate on the pillar front.  o.pillar { hw, hd, h, col }, o.foot [[hw, hd, h, col]..], o.cap { hw, hd, h, col } */
function onPillar(P, M, K, o) {
  let y = o.foot ? steps(P, M, PAL.graniteGrey, o.foot) : 0;
  if (o.pad) { P.tint(o.pad.col); P.box(M.vc, -o.pad.hw, o.pad.hw, 0, 0.03, -o.pad.hd, o.pad.hd, 'b'); if (o.pad.border) { P.tint(o.pad.border); const t = 0.22, hw = o.pad.hw, hd = o.pad.hd; P.box(M.vc, -hw, hw, 0, 0.034, hd - t, hd, 'b'); P.box(M.vc, -hw, hw, 0, 0.034, -hd, -hd + t, 'b'); P.box(M.vc, -hw, -hw + t, 0, 0.034, -hd + t, hd - t, 'b'); P.box(M.vc, hw - t, hw, 0, 0.034, -hd + t, hd - t, 'b'); } }
  const pl = o.pillar; block(P, M, pl.col, pl.hw, pl.hd, y, y + pl.h); const py = y;
  y += pl.h;
  if (o.cap) { block(P, M, o.cap.col, o.cap.hw, o.cap.hd, y, y + o.cap.h); y += o.cap.h; }
  if (o.wedge) {                                                           // a sloped buttress ('wing') on the side of the pillar: a triangular prism (left side, x < 0)
    const wd = o.wedge, d = pl.hd * 0.9, x1 = -pl.hw, x0 = x1 - wd.hw, y1 = py + wd.h; P.tint(wd.col);
    P.quad(M.vc, [x0, py, d], [x0, py, -d], [x1, y1, -d], [x1, y1, d], [-wd.h, wd.hw, 0], null);
    P.fan(M.vc, [[x0, py, d], [x1, py, d], [x1, y1, d]], [0, 0, 1], (p) => [p[0], p[1]]); P.fan(M.vc, [[x0, py, -d], [x1, y1, -d], [x1, py, -d]], [0, 0, -1], (p) => [p[0], p[1]]);
  }
  const b = o.bust;
  put3(P, bust2Fig(o.key, { style: b.style, k: b.k, w: b.w, depth: b.depth, face: b.face, moustache: b.moustache, turn: b.turn ?? 0.12, pitch: b.pitch ?? 0.03, roll: b.roll }, b.detail ?? 0.7), M.bronzeSet, 0, y, 0, b.rot || 0, b.scale);
  if (o.plate) plateOn(P, M, K, o.plate.key, o.plate.w, o.plate.h, o.plate.x || 0, py + o.plate.y, pl.hd + 0.006);
  return y;
}
const mk = (o) => ({ id: o.id, key: o.key, name: o.name, x: o.x, z: o.z, yaw: o.yaw ?? 'auto', h: o.h ?? 3, rad: 0.6, lod: [o.far ?? 240, 0], solid: o.solid, build(P, M, K) { onPillar(P, M, K, { ...o, key: o.key }); if (o.extra) o.extra(P, M, K); } });

// ---- Lenin, Bolshoy pr. 62 (Novo-Leninsky skver): rough-picked grey granite die 0.8 x 0.8 x 2.3 m on a 2-step base, bust 0.9 m: bronze jacket, shirt collar and tie, bald, goatee [V lenb2, lenk2]
const lenin62 = mk({ id: 'n725118926', key: 'lenin62', name: 'Бюст В. И. Ленина (Большой пр., 62)', x: -2599, z: -3275, h: 3.4,
  foot: [[1.25, 1.25, 0.2, PAL.graniteGreyDark], [1.0, 1.0, 0.24, PAL.graniteGrey]], pillar: { hw: 0.4, hd: 0.4, h: 2.0, col: '#8c8a86' }, cap: { hw: 0.44, hd: 0.44, h: 0.06, col: '#7b7a77' },
  bust: { style: 'jacket', k: 1.38, w: 0.28, scale: 1.45, face: { age: 0.62, hair: 'bald', beard: 'goatee', seed: 11, mouth: 'stern' }, moustache: true, detail: 0.9, turn: 0.0, pitch: 0.02 },
  plate: { key: 'lenin62', w: 0.52, h: 0.22, y: 1.15 }, solid: [{ w: 2.5, d: 2.5, h: 0.5 }, { w: 0.9, d: 0.9, h: 3.4 }] });
// ---- Lenin, the Alexander Lyceum garden (Kamennoostrovsky 21): the 1889 pedestal reused, a grey granite pillar 0.7 x 0.7 x 2.2 m with a stepped top, two white stone flower boxes in front [V lenl1, fplen_02]
const lenin21 = mk({ id: 'n5195119079', key: 'lenin21', name: 'Бюст В. И. Ленина (сад Лицея)', x: -1986, z: -3312, h: 3.1,
  foot: [[0.95, 0.95, 0.2, PAL.graniteGreyDark], [0.78, 0.78, 0.18, PAL.graniteGrey]], pillar: { hw: 0.33, hd: 0.33, h: 1.7, col: '#8c8a86' }, cap: { hw: 0.4, hd: 0.4, h: 0.12, col: '#7f7e7a' },
  bust: { style: 'jacket', k: 1.36, w: 0.27, scale: 1.4, face: { age: 0.62, hair: 'bald', beard: 'goatee', seed: 12, mouth: 'stern' }, moustache: true, detail: 0.9, turn: 0.0, pitch: 0.02 },
  plate: { key: 'lenin21', w: 0.4, h: 0.15, y: 1.0 }, solid: [{ w: 1.9, d: 1.9, h: 0.4 }, { w: 0.8, d: 0.8, h: 3.0 }],
  extra(P, M) { for (const s of [-1, 1]) { P.tint('#e6e2da'); P.box(M.vc, s * 1.0 - 0.45, s * 1.0 + 0.45, 0, 0.5, 1.15, 1.75, 'b'); P.tint('#4a3a2c'); P.box(M.vc, s * 1.0 - 0.4, s * 1.0 + 0.4, 0.48, 0.52, 1.2, 1.7, 'b'); } } });

// ---- Chkalov (the Chkalovskaya vestibule steps): see flightHelmet above
const chkalov = {
  id: 'n3726726189', key: 'chkalov', name: 'Бюст В. П. Чкалова', x: -3313, z: -3198, yaw: 'auto', h: 2.6, rad: 0.6, lod: [260, 0],
  solid: [{ r: 0.36, h: 2.6 }, { w: 1.0, d: 1.0, h: 0.3 }],
  build(P, M, K) {
    block(P, M, PAL.graniteGreyDark, 0.5, 0.5, 0, 0.12);                                    // a low foot slab on the vestibule steps
    column(P, M, '#5a3a33', 0.29, 0.29, 0.12, 1.62, 8);
    P.tint('#3c2a26'); lathe(P, M.vc, [[0.3, 1.62], [0.32, 1.64], [0.32, 1.68]], 8, { phi0: Math.PI / 8 });
    lathe(P, M.bronzeSet.main, [[0.31, 1.68], [0.345, 1.71], [0.345, 1.8], [0.3, 1.83]], 20, { caps: true });      // the round bronze cap ring
    put3(P, chkalovBust(), M.bronzeSet, 0, 1.81, 0, 0, 1.4);
    plateOn(P, M, K, 'chkalov', 0.21, 0.08, 0, 1.12, 0.272);
  },
};

// ---- Shostakovich, the Benois courtyard (Kronverksky 29/37): a tall polished red-brown pillar of chamfered section (a taller block on top of a wider lower part), gilt "Дмитрий ШОСТАКОВИЧ", the bare bronze head with narrow
// cropped shoulders, a thin face and short hair; a round bed with a low rust-brown steel railing (two rails, posts every 1.2 m) round it [V shos1]
const shostakovich = {
  id: 'n747744042', key: 'shostakovich', name: 'Бюст Д. Д. Шостаковича', x: -2290, z: -3297, yaw: 'auto', h: 3, rad: 1.6, lod: [200, 0],
  solid: [{ r: 1.6, h: 1.0 }, { w: 0.6, d: 0.6, h: 3.0 }],
  build(P, M, K) {
    P.tint('#2b2a29'); lathe(P, M.vc, [[1.45, 0], [1.4, 0.06]], 20, { caps: true });                       // a dark paved ring of the bed edge
    P.tint('#5d4a3a'); P.fan(M.vc, Array.from({ length: 20 }, (_, i) => [Math.cos(i / 20 * 6.2832) * 1.4, 0.065, Math.sin(i / 20 * 6.2832) * 1.4]), [0, 1, 0], (p) => [p[0], p[2]]);   // bare earth
    block(P, M, '#4a4a48', 0.52, 0.42, 0.06, 0.2);
    P.tint('#4b2a26'); const pil = (hw, hd, y0, y1) => { const c = 0.07; P.box(M.vc, -hw, hw, y0, y1, -hd + c, hd - c, 'b'); P.box(M.vc, -hw + c, hw - c, y0, y1, -hd, hd, 'b'); };
    pil(0.27, 0.27, 0.2, 2.2); P.tint('#5a332d'); pil(0.25, 0.25, 2.2, 2.52);
    P.tint('#3c2420'); P.box(M.vc, -0.3, 0.3, 2.52, 2.58, -0.3, 0.3, 'b');
    put3(P, bust2Fig('shostakovich', { style: 'bare', k: 1.3, w: 0.2, depth: 0.12, face: { age: 0.45, hair: 'short', seed: 14, mouth: 'stern', brow: 0.7 }, turn: 0.14, pitch: 0.02 }, 0.72), M.bronzeSet, 0, 2.58, 0, 0, 1.12);
    plateOn(P, M, K, 'shostakovich', 0.3, 0.55, 0, 1.55, 0.274);
    // the low steel railing (two rails + posts every 1.2 m) on a circle r 1.55
    P.tint('#6a3d28');
    const n = 16; for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2, x0 = Math.cos(a) * 1.55, z0 = Math.sin(a) * 1.55, x1 = Math.cos(b) * 1.55, z1 = Math.sin(b) * 1.55;
      P.col(M.vc, x0, z0, 0.06, 0.78, 0.03, 0.03, 4, true);
      for (const hy of [0.4, 0.76]) P.cyl(M.vc, [x0, hy, z0], [x1, hy, z1], 0.015, 0.015, 4, false);
    }
  },
};

// ---- Roentgen, the institute garden (Rentgena 8): bronze bare-shouldered bearded head, tousled hair, on a pink-red granite pillar with a sloped buttress ("wing") at the left, a stepped foot and two grey steps;
// the bronze plate "Вильгельм Конрад РЕНТГЕН" on the front [V rent1-3]
const roentgen = mk({ id: 'n2758253373', key: 'roentgen', name: 'Бюст В. К. Рентгена', x: -1840, z: -3481, h: 3.1,
  foot: [[1.0, 0.9, 0.22, '#7d7b77'], [0.82, 0.74, 0.2, '#8c8a86'], [0.62, 0.52, 0.28, '#b17c74']], pillar: { hw: 0.45, hd: 0.4, h: 2.2, col: '#b97f78' }, cap: { hw: 0.47, hd: 0.42, h: 0.06, col: '#a9726b' },
  wedge: { hw: 0.55, h: 1.3, col: '#b17c74', cx: -0.6 },
  bust: { style: 'bare', k: 1.42, w: 0.22, depth: 0.14, scale: 1.3, face: { age: 0.55, hair: 'curly', beard: 'full', seed: 15, mouth: 'stern', brow: 0.8 }, turn: -0.12, pitch: 0.06 },
  plate: { key: 'roentgen', w: 0.5, h: 0.16, y: 1.35 }, solid: [{ w: 2.0, d: 1.8, h: 0.7 }, { w: 1.0, d: 0.9, h: 3.1 }] });

// ---- the seven medics of the Pavlov University alley (Lva Tolstogo): slender polished red-brown pillars 0.35 x 0.35 x 1.6 m with gilt surname and name (Pavlov: black granite 0.45 x 0.45 x 1.3 m, white letters), a thin
// stepped foot 0.7 m on a paved pad of pink-grey pavers with a brick-red border; the bronze busts in suits and ties, each with its own head [V med_05..12]
const medic = (id, key, name, x, z, face, o = {}) => mk({ id, key, name, x, z, h: 2.2, far: 160,
  foot: [[0.4, 0.4, 0.08, '#5a3b34']], pillar: { hw: 0.19, hd: 0.19, h: 1.58, col: '#4b2a26' }, cap: { hw: 0.22, hd: 0.22, h: 0.06, col: '#3e2420' },
  pad: { hw: 1.5, hd: 1.5, col: '#a49a98', border: '#9c5a4c' },
  bust: { style: 'jacket', k: 1.3, w: 0.24, depth: 0.13, scale: 1.0, face, turn: 0.1, pitch: 0.03, detail: 0.62 },
  plate: { key, w: 0.28, h: 0.31, y: 0.6 }, solid: [{ w: 0.5, d: 0.5, h: 2.1 }], ...o });
const medics = [
  medic('n6123121475', 'lang', 'Бюст Г. Ф. Ланга', -2024, -3713, { age: 0.6, hair: 'short', seed: 21, brow: 0.5 }),
  medic('n6123121476', 'chernorutsky', 'Бюст М. В. Черноруцкого', -2012, -3722, { age: 0.65, hair: 'short', seed: 22 }),
  medic('n6123121477', 'bekhterev', 'Бюст В. М. Бехтерева', -2023, -3724, { age: 0.6, hair: 'long', beard: 'full', seed: 23 }),
  medic('n6123105714', 'pavlov', 'Бюст И. П. Павлова', -2005, -3739, { age: 0.8, hair: 'bald', beard: 'full', seed: 24 }, {
    foot: [[0.4, 0.4, 0.08, '#2c2d2f']], pillar: { hw: 0.23, hd: 0.23, h: 1.22, col: '#1f1f22' }, cap: { hw: 0.26, hd: 0.26, h: 0.06, col: '#161618' }, plate: { key: 'pavlov', w: 0.34, h: 0.38, y: 0.5 } }),
  medic('n6123121478', 'limberg', 'Бюст А. К. Лимберга', -1987, -3735, { age: 0.6, hair: 'short', beard: 'full', seed: 25 }),
  medic('n6123121479', 'zabolotny', 'Бюст Д. К. Заболотного', -1981, -3743, { age: 0.55, hair: 'short', beard: 'goatee', seed: 26 }),
  medic('n6123121480', 'shuvalova', 'Бюст Е. П. Шуваловой', -1971, -3738, { age: 0.55, hair: 'curly', mouth: 'smile', seed: 27 }),
];

// ---- Blagoev (Blagoeva / Vvedenskaya): a huge bearded bronze head on narrow cropped shoulders on a tall slim pillar of grey polished granite (a joint in the shaft, a gilt plate "ДИМИТР БЛАГОЕВ" high on the
// front) on a wide low two-step slab [V blagoev/01]
const blagoev = mk({ id: 'n5840603167', key: 'blagoev', name: 'Бюст Д. Благоева', x: -2668, z: -2623, h: 4.0,
  foot: [[1.35, 1.2, 0.1, '#55575a'], [1.1, 0.95, 0.12, '#5e6063']], pillar: { hw: 0.31, hd: 0.3, h: 2.5, col: '#55575a' }, cap: { hw: 0.34, hd: 0.33, h: 0.06, col: '#47494c' },
  bust: { style: 'bare', k: 1.5, w: 0.2, depth: 0.14, scale: 1.45, face: { age: 0.7, hair: 'short', beard: 'full', seed: 31, mouth: 'stern', brow: 0.7 }, turn: -0.35, pitch: 0.0 },
  plate: { key: 'blagoev', w: 0.32, h: 0.7, y: 1.55 }, solid: [{ w: 2.6, d: 2.2, h: 0.25 }, { w: 0.7, d: 0.7, h: 4.0 }] });

export const PIECES = [chkalov, lenin62, lenin21, shostakovich, roentgen, ...medics, blagoev];
