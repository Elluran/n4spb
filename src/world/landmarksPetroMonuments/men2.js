// landmarksPetroMonuments/men2.js - the bronze men of the south: Tukay (2006), Dobrolyubov (1959, 4.5 m), Tovstonogov (2011), Mylnikov (2016), Dudin (2018), the front-line cameraman, Volodin (2022).  Each pose is read from
// the photos of docs/research/petro-monuments-2026-south.md section A (tukay/02, dobrolyubov/01, tovstonogov/01-02, mylnikov/01, dudin/03, kamen_statue/01); "left / right" below are the FIGURE's (kit: +x = the figure's
// LEFT = the viewer's RIGHT when the viewer faces the front).  Plinth texts are the real ones (platetext.js).
import * as THREE from 'three';
import { human, extend, V, cached } from '../lib/figures.js';
import { put3, block, slab, taper, steps, lathe, prism, ngon, PAL, plateOn, boulder, ring, reorient } from './sty.js';

const COAT = { torso: 'coat', sleeves: 'long', trousers: 'long', boots: true, collar: 'fall' };
const cap = (S, info, k = 1, col = 'main') => { const H = info.j && info.j.head; if (!H) return; S.blob(col, V.add(V.add(H.c, V.mul(H.y, 0.075 * k)), V.mul(H.z, -0.005)), [0.1 * k, 0.062 * k, 0.108 * k], { dir: H.z, ref: H.x, w: 10, h: 7 }); S.blob(col, V.add(V.add(H.c, V.mul(H.y, 0.058 * k)), V.mul(H.z, 0.088 * k)), [0.075 * k, 0.01 * k, 0.05 * k], { dir: V.add(H.z, V.mul(H.y, -0.3)), ref: H.x, w: 9, h: 5 }); };

// ---------------------------------------------------------------------------------------------------------------- Tukay
// [V tukay/02] a slim young man in an open coat to the knees over a long waistcoat, the LEFT hand raised to the collar, the right hand at the hip with a small book; a tall tapered bronze block with a cast relief
// (the name cartouche) on a two-course red-brown granite plinth on a round dark dais; a round bed of pansies with a grey granite kerb (r 3.5) round it.
const tukayFig = () => cached('lmpm-tukay', () => human({ detail: 0.5, body: { sex: 'm', muscle: 0.2, shoulders: 0.95 },
  pose: { head: [0.0, 0.15, 0.04], spine: [0, 0.04, 0.0], legs: { L: { foot: [0.1, 0, -0.04], yaw: 0.2 }, R: { foot: [-0.1, 0, 0.06], yaw: -0.18 } },
    arms: { R: { hand: [-0.26, 0.86, 0.12], pole: [-0.5, -0.3, -0.7], grip: 'hold' }, L: { hand: [0.1, 1.36, 0.2], pole: [0.8, 0.0, -0.4], grip: 'fist' } } },
  outfit: { ...COAT, hem: 0.62, flare: 0.1, folds: 0.05, open: 0.6, buttons: false }, face: { age: 0.2, hair: 'short', seed: 91, mouth: 'closed' } }));
const flowerRing = (P, M, r0, r1, y, n, seed) => {
  let s = seed; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  P.tint('#46503a'); P.fan(M.vc, Array.from({ length: 28 }, (_, i) => [Math.cos(i / 28 * 6.2832) * r1, y, Math.sin(i / 28 * 6.2832) * r1]), [0, 1, 0]);   // the dark leafy bed
  // pansy patches: flat hexagons in rings (no overlap, no z-fight), colours in groups like the bed of photo tukay/02 (yellow / violet / white)
  const cols = ['#e8c21a', '#6c3f98', '#e8b82c', '#f3efe8', '#7c4fa0', '#c63d8e'];
  let k = 0;
  for (let r = r0 + 0.3; r < r1 - 0.2; r += 0.46) {
    const m = Math.max(5, Math.floor(6.2832 * r / 0.52)), a0 = rnd() * 6.2832;
    for (let i = 0; i < m; i++) {
      const a = a0 + i / m * 6.2832 + (rnd() - 0.5) * 0.08, x = Math.cos(a) * r, z = Math.sin(a) * r, rad = 0.2 + rnd() * 0.05;
      P.tint(cols[(Math.floor(i / 2) + k) % cols.length]); P.fan(M.vc, Array.from({ length: 7 }, (_, j) => [x + Math.cos(j / 7 * 6.2832) * rad, y + 0.04, z + Math.sin(j / 7 * 6.2832) * rad * 0.9]), [0, 1, 0]);
    }
    k++;
  }
};
const tukay = {
  id: 'n1320897720', key: 'tukay', name: 'Памятник Г. Тукаю', x: -2563, z: -2133, yaw: 'auto', h: 4.2, rad: 3.7, lod: [500, 0], spot: 7,
  solid: [{ r: 3.65, h: 0.2 }, { w: 1.2, d: 1.2, h: 4.0 }],
  build(P, M, K) {
    ring(P, M, '#8c8a86', 3.45, 3.7, 0, 0.14, 28);
    flowerRing(P, M, 1.5, 3.45, 0.06, 150, 5);
    P.tint('#4a4a48'); lathe(P, M.vc, [[1.6, 0.06], [1.6, 0.2]], 24, { caps: true });
    const y0 = steps(P, M, '#4f2f2a', [[0.62, 0.62, 0.22, '#4f2f2a'], [0.5, 0.5, 0.28, '#5a352f']], 0.2);
    taper(P, M, '#33403a', 0.36, 0.36, 0.3, 0.3, y0, y0 + 1.25);
    P.tint('#2a352f'); P.box(M.vc, -0.33, 0.33, y0 + 1.25, y0 + 1.33, -0.33, 0.33, 'b');
    plateOn(P, M, K, 'tukay', 0.44, 0.19, 0, y0 + 0.62, 0.372);
    put3(P, tukayFig(), M.bronzeMono, 0, y0 + 1.33, 0, 0, 1.37);
  },
};

// ---------------------------------------------------------------------------------------------------------------- Dobrolyubov
// [V dobrolyubov/01, W] 4.5 m: a gaunt man in a long buttoned frock coat to the knees, narrow trousers and boots, long hair and thin side whiskers, the head turned a little to his right, the LEFT hand holds an open
// book against the hip, the right arm hangs; a polished pink-red granite pedestal 4.35 m (die 1.6 x 1.6, a stepped cornice) on a stepped wide granite platform (steps 0.15 m), gilt "Николай Александрович ДОБРОЛЮБОВ 1836 1861".
const dobrolyubovFig = () => cached('lmpm-dobro', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.2, shoulders: 0.95 },
  pose: { head: [0.04, -0.22, 0.0], spine: [0, 0.0, 0.0], legs: { L: { foot: [0.09, 0, 0.0], yaw: 0.18 }, R: { foot: [-0.09, 0, 0.0], yaw: -0.18 } },
    arms: { R: { hand: [-0.27, 0.78, 0.03], pole: [-0.6, -0.2, -0.7], grip: 'relaxed' }, L: { hand: [0.3, 0.98, 0.2], pole: [0.6, -0.3, -0.6], grip: 'hold', palm: [0, 1, 0] } } },
  outfit: { ...COAT, hem: 0.64, flare: 0.1, folds: 0.05, buttons: true }, face: { age: 0.35, hair: 'long', beard: 'sideburns', seed: 92, mouth: 'stern' } }),
  (S, info) => { const h = info.j.wristL; if (h) { S.blob('dark', V.add(h, [0.0, 0.03, 0.02]), [0.085, 0.012, 0.065], { dir: [0, 0.3, 1], w: 8, h: 4 }); S.blob('main', V.add(h, [0.0, 0.05, 0.03]), [0.085, 0.016, 0.065], { dir: [0, 0.4, 1], w: 8, h: 4 }); } }));
const dobrolyubov = {
  id: 'n725118930', key: 'dobrolyubov', name: 'Памятник Н. А. Добролюбову', x: -2933, z: -2878, yaw: 'auto', h: 8.9, rad: 3.5, lod: [900, 0], spot: 12,
  solid: [{ w: 2.0, d: 2.0, h: 5.0 }],
  build(P, M, K) {
    const pink = '#9a5b52';
    let y = steps(P, M, '#8d6258', [[2.9, 2.9, 0.15, '#8d6a62'], [2.5, 2.5, 0.15, '#93675d']], 0);
    y = steps(P, M, pink, [[1.15, 1.15, 0.5, '#8e544b']], y);
    block(P, M, pink, 0.8, 0.8, y, y + 3.25); const die = y; y += 3.25;
    block(P, M, '#8e544b', 0.92, 0.92, y, y + 0.18); block(P, M, '#9a5b52', 0.98, 0.98, y + 0.18, y + 0.4); y += 0.4;
    plateOn(P, M, K, 'dobrolyubov', 0.95, 0.78, 0, die + 2.25, 0.806);
    P.tint('#2e3a35'); P.box(M.vc, -0.5, 0.5, y, y + 0.06, -0.5, 0.5, 'b');
    put3(P, dobrolyubovFig(), M.bronzeMono, 0, y + 0.06, 0, 0, 2.56);
  },
};

// ---------------------------------------------------------------------------------------------------------------- Tovstonogov
// [V tovstonogov/01-02] a tall lean man, relaxed, in a knitted jumper with the collar out and loose trousers; his jacket hangs over the RIGHT shoulder (the viewer's left) and is held at the chest by the right hand;
// the left arm hangs with a cigarette between the fingers; the head turned a little to the viewer's right, a lined face, swept hair.  A low trapezoid block of rock-faced brown-pink granite 1.3 x 0.7 x 0.45 with the
// incised text "РЕЖИССЁРУ ГЕОРГИЮ ТОВСТОНОГОВУ (1915-1989)" on the sloped front, on a patch of granite setts.
const tovstonogovFig = () => cached('lmpm-tovst', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.25, shoulders: 1.0 },
  pose: { head: [0.06, 0.2, 0.0], spine: [0.02, -0.05, 0.0], legs: { L: { foot: [0.12, 0, -0.04], yaw: 0.25 }, R: { foot: [-0.12, 0, 0.13], yaw: -0.3 } },
    arms: { R: { hand: [-0.18, 1.3, 0.12], pole: [-0.6, 0.2, -0.5], grip: 'fist' }, L: { hand: [0.22, 0.74, 0.1], pole: [0.6, -0.2, -0.7], grip: 'relaxed' } } },
  outfit: { torso: 'coat', sleeves: 'long', trousers: 'long', boots: false, collar: 'fall', hem: 0.15, flare: 0.0, folds: 0.07 }, face: { age: 0.75, hair: 'short', seed: 93, mouth: 'stern', brow: 0.7 } }),
  (S, info) => {
    const j = info.j;
    S.tube('main', [V.add(j.shoulderR, [-0.04, 0.05, -0.02]), V.add(j.shoulderR, [-0.1, -0.2, -0.1]), V.add(j.pelvis, [-0.22, 0.05, -0.16]), V.add(j.pelvis, [-0.2, -0.5, -0.2])], [[0.075, 0.05], [0.09, 0.05], [0.1, 0.06], [0.08, 0.05]], { seg: 9, per: 4 });   // the jacket over the right shoulder
    const w = j.wristL; if (w) S.tube('dark', [V.add(w, [-0.012, -0.05, 0.03]), V.add(w, [-0.02, 0.05, 0.05])], [[0.006, 0.006]], { seg: 5, per: 2 });                                                             // the cigarette
  }));
const tovstonogov = {
  id: 'n1319290219', key: 'tovstonogov', name: 'Памятник Г. А. Товстоногову', x: -1214, z: -2318, yaw: 'auto', h: 2.4, rad: 1.2, lod: [450, 0], spot: 6,
  solid: [{ w: 1.5, d: 0.9, h: 0.5 }],
  build(P, M, K) {
    P.tint('#8a8a85'); P.box(M.vc, -1.0, 1.0, 0, 0.04, -0.7, 0.7, 'b');                               // a patch of setts
    taper(P, M, '#835a4e', 0.66, 0.4, 0.6, 0.3, 0.04, 0.5);
    plateOn(P, M, K, 'tovstonogov', 0.95, 0.3, 0, 0.27, 0.36);
    put3(P, tovstonogovFig(), M.bronzeMono, -0.05, 0.5, -0.02, 0, 1.07);
  },
};

// ---------------------------------------------------------------------------------------------------------------- Mylnikov
// [V mylnikov/01] a lean old master standing tall, weight on the left leg, a flat cap, a short grey beard, an open waistcoat over a shirt with the collar open, baggy trousers, boots; the head thrown back and turned
// up to the viewer's left; the right hand holds two long brushes hanging down.  A two-tier dark red-brown polished granite plinth (platform 2.6 x 2.0 x 0.4, block 1.2 x 0.9 x 0.9) with the gilt "Художнику Андрею Андреевичу Мыльникову".
const mylnikovFig = () => cached('lmpm-mylnikov', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.2 },
  pose: { head: [-0.28, -0.4, 0.04], spine: [0, 0.0, 0.0], legs: { L: { foot: [0.1, 0, 0.0], yaw: 0.2 }, R: { foot: [-0.14, 0, 0.1], yaw: -0.25 } },
    arms: { R: { hand: [-0.26, 0.8, 0.1], pole: [-0.6, -0.3, -0.7], grip: 'fist' }, L: { hand: [0.27, 0.8, 0.0], pole: [0.6, -0.3, -0.8], grip: 'relaxed' } } },
  outfit: { ...COAT, hem: 0.3, flare: 0.05, folds: 0.06, open: 0.9, buttons: false }, face: { age: 0.85, hair: 'short', beard: 'goatee', seed: 94, mouth: 'stern' } }),
  (S, info) => { cap(S, info, 1); const w = info.j.wristR; if (w) for (const dx of [-0.012, 0.014]) S.tube('main', [V.add(w, [dx, 0.08, 0.0]), V.add(w, [dx - 0.02, -0.4, 0.06]), V.add(w, [dx - 0.04, -0.82, 0.15])], [[0.008, 0.008], [0.007, 0.007], [0.012, 0.01]], { seg: 5, per: 3 }); }));
const mylnikov = {
  id: 'n6546310315', key: 'mylnikov', name: 'Памятник А. А. Мыльникову', x: -1081, z: -2369, yaw: 'auto', h: 4.0, rad: 1.8, lod: [500, 0], spot: 7,
  solid: [{ w: 2.7, d: 2.1, h: 1.4 }],
  build(P, M, K) {
    block(P, M, '#4a2b27', 1.3, 1.0, 0, 0.4); P.tint('#3d2320'); P.box(M.vc, -1.33, 1.33, 0.36, 0.4, -1.03, 1.03, 'b');
    block(P, M, '#4a2b27', 0.6, 0.45, 0.4, 1.3); P.tint('#3a2420'); P.box(M.vc, -0.65, 0.65, 1.3, 1.36, -0.5, 0.5, 'b');
    plateOn(P, M, K, 'mylnikov', 0.95, 0.47, 0, 0.88, 0.456);
    put3(P, mylnikovFig(), M.bronzeMono, 0, 1.36, 0, 0, 1.26);
  },
};

// ---------------------------------------------------------------------------------------------------------------- Dudin
// [V dudin/03] a striding figure caught in mid movement: the right foot forward on a rough granite block, the left leg behind, the body leaning forward, a long open coat flying behind, an open collar and a belt, the head
// raised, short hair; dark bronze on an unpolished irregular granite block (1.6 x 1.2 x 0.9).
const dudinFig = () => cached('lmpm-dudin', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.45 },
  pose: { pelvis: [0, 0.9, 0.12], spine: [0.12, 0.0, 0.0], head: [-0.2, -0.12, 0.0], legs: { L: { foot: [0.1, 0, -0.34], yaw: 0.2, lift: 0.0 }, R: { foot: [-0.1, 0.0, 0.34], yaw: -0.2, lift: 0.06, pole: [0, 0.4, 1] } },
    arms: { R: { hand: [-0.3, 0.92, -0.05], pole: [-0.6, -0.3, -0.4], grip: 'fist' }, L: { hand: [0.3, 0.72, 0.28], pole: [0.6, -0.3, -0.2], grip: 'relaxed' } } },
  outfit: { ...COAT, hem: 0.55, flare: 0.2, folds: 0.07, cape: 'back', capeLen: 1.0, belt: true, open: 0.5 }, face: { age: 0.3, hair: 'short', seed: 95, mouth: 'stern' } }),
  (S, info) => { const j = info.j; S.tube('main', [V.add(j.shoulderL, [0.0, 0.0, -0.1]), V.add(j.pelvis, [0.12, -0.2, -0.42]), V.add(j.pelvis, [0.1, -0.7, -0.7]), V.add(j.pelvis, [0.1, -0.88, -0.95])], [[0.1, 0.05], [0.16, 0.05], [0.2, 0.05], [0.22, 0.04]], { seg: 10, per: 4 }); }));      // the coat tail blown back
const dudin = {
  id: 'n10184233931', key: 'dudin', name: 'Памятник М. А. Дудину', x: -1605, z: -2896, yaw: 'auto', h: 3.4, rad: 1.6, lod: [450, 0], spot: 7,
  solid: [{ w: 1.7, d: 1.3, h: 0.95 }],
  build(P, M, K) {
    P.tint('#8a8a85'); P.box(M.vc, -1.3, 1.3, 0, 0.04, -1.0, 1.0, 'b');
    const rk = boulder(P, M, 2, 0, 0.0, 0.0, 1.9, 0.3, '#7a766f', 1.5, 1.4);
    put3(P, dudinFig(), M.bronzeMono, 0, rk.top - 0.03, 0, 0, 1.15);
    plateOn(P, M, K, 'dudin', 0.5, 0.21, 0.0, 0.34, 0.62);
  },
};

// ---------------------------------------------------------------------------------------------------------------- the front-line cameraman
// [V kamen_statue/01] kneeling: the right knee down, the left knee up, a long greatcoat with a belt and the skirts hanging, a flat peaked cap, high boots; both arms raised, a two-lens hand-held film camera pressed
// to the right eye; dark grey cast metal; mounted on a grey stone block on top of a street fence pier of the Lenfilm studio, about 2.7 m above the pavement.  The film banners on the fence are NOT drawn (no pennants rule).
const cameramanFig = () => cached('lmpm-cameraman', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.3 },
  pose: { pelvis: [0, 0.56, -0.08], spine: [0.1, 0.1, 0.0], head: [-0.06, 0.0, 0.0], legs: { L: { foot: [0.13, 0, 0.42], yaw: 0.1, pole: [0, 1, 0.5] }, R: { foot: [-0.12, 0.0, -0.22], yaw: -0.1, lift: 0.04, pole: [0, -0.3, 1] } },
    arms: { R: { hand: [-0.09, 1.17, 0.4], pole: [-0.6, 0.4, -0.3], grip: 'hold' }, L: { hand: [0.1, 1.12, 0.42], pole: [0.6, 0.1, -0.2], grip: 'hold' } } },
  outfit: { ...COAT, hem: 0.7, flare: 0.12, folds: 0.08, belt: true, boots: 0.45 }, face: { age: 0.4, hair: 'short', seed: 96, mouth: 'stern' } }),
  (S, info) => {
    cap(S, info, 1);
    const j = info.j, a = V.lerp(j.wristR, j.wristL, 0.5);
    S.blob('main', V.add(a, [0.0, 0.03, 0.1]), [0.09, 0.07, 0.11], { w: 8, h: 6 });                                                                            // the camera body
    for (const s of [1, -1]) S.tube('main', [V.add(a, [s * 0.05, 0.05, 0.15]), V.add(a, [s * 0.05, 0.06, 0.3])], [[0.035, 0.035], [0.04, 0.04]], { seg: 8, per: 2 });             // the two lenses
  }));
const cameraman = {
  id: 'n10042444673', key: 'cameraman', name: 'Памятник фронтовому кинооператору', x: -1858, z: -2930, yaw: 'auto', h: 4.4, rad: 0.8, lod: [380, 0], spot: 7,
  solid: [{ w: 0.9, d: 0.7, h: 2.3 }],
  build(P, M, K) {
    block(P, M, '#8e8b84', 0.45, 0.32, 0, 2.1); block(P, M, '#7f7d77', 0.5, 0.37, 2.1, 2.18);        // the stone fence pier (the studio fence itself belongs to the street furniture)
    block(P, M, '#8a8985', 0.42, 0.3, 2.18, 2.5);                                                    // the stone block under the figure
    put3(P, cameramanFig(), M.bronzeMono, 0, 2.5, 0.0, 0, 1.0);
  },
};

// ---------------------------------------------------------------------------------------------------------------- Volodin
// [W press; no photo of the figure: simple] the playwright Alexander Volodin (2022) sits on a bench in his favourite coat in a habitual pose, looking at the windows of his flat across the street; granite pedestal ~1 m, the
// bench is part of the group (B. Sergeev, I. Frolov).
const volodinFig = () => cached('lmpm-volodin', () => human({ detail: 0.5, body: { sex: 'm', muscle: 0.2, shoulders: 0.95 },
  pose: { pelvis: [0, 0.47, 0.0], head: [-0.12, 0.35, 0.0], spine: [0.06, 0.05, 0.0], legs: { L: { foot: [0.12, 0, 0.46], yaw: 0.2, pole: [0, 0.3, 1] }, R: { foot: [-0.12, 0, 0.42], yaw: -0.2, pole: [0, 0.3, 1] } },
    arms: { R: { hand: [-0.16, 0.56, 0.3], pole: [-0.6, -0.4, -0.3], grip: 'relaxed' }, L: { hand: [0.2, 0.62, 0.2], pole: [0.6, -0.4, -0.3], grip: 'hold' } } },
  outfit: { ...COAT, hem: 0.5, flare: 0.1, folds: 0.07, buttons: false, boots: false }, face: { age: 0.8, hair: 'short', seed: 97, mouth: 'smile' } }));
const volodin = {
  id: 'n13252677726', key: 'volodin', name: 'Памятник А. М. Володину', x: -2397, z: -3243, yaw: 'auto', h: 2.6, rad: 1.4, lod: [380, 0], spot: 6,
  solid: [{ w: 1.8, d: 0.9, h: 1.0 }],
  build(P, M, K) {
    block(P, M, '#6b6a66', 1.1, 0.7, 0, 1.0); P.tint('#55544f'); P.box(M.vc, -1.14, 1.14, 0.96, 1.04, -0.74, 0.74, 'b');
    const m = M.bronzeMono;
    P.tint('#3a3b38');                                                                                                                              // the bench: a plank seat, a back, side supports
    P.box(M.vc, -0.7, 0.7, 1.04, 1.14, -0.3, 0.3, 'b'); P.box(M.vc, -0.7, 0.7, 1.14, 1.5, -0.32, -0.28, 'b');
    for (const s of [-1, 1]) P.box(M.vc, s * 0.62, s * 0.7, 1.0, 1.14, -0.3, 0.3, 'b');
    put3(P, volodinFig(), m, 0.0, 1.14, -0.1, 0, 1.0);
  },
};

export const PIECES = [tukay, dobrolyubov, tovstonogov, mylnikov, dudin, cameraman, volodin];
