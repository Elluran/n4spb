// landmarksPetroMonuments/men.js - the bronze men and groups on their plinths: Popov (the radio pioneer, 1959), Shevchenko (Leo Mol, 2000), Nizami (G. Babaev, 2002, with the ogee arch), the Uglov doctor-and-patient group (2016),
// the Hygieia memorial stele (1987), Tukay, Dobrolyubov, Tovstonogov, Mylnikov, Dudin, the front-line cameraman, Volodin.  Figures: the kit `human()` (lib/figures.js) at detail 0.45-0.55 + `extend()` for coats,
// props and the rock masses; poses read from the photos (docs/research/petro-monuments-2026-north.md B, -south.md A).  NOTE the handedness (kit: figure faces +z, +x = the figure's LEFT, so the viewer in a photo
// sees the figure's right on the left): every pose below is read from the photo, not from the words of the dossiers (critic correction 2).
import * as THREE from 'three';
import { human, extend, V, cached } from '../lib/figures.js';
import { put3, block, slab, taper, steps, lathe, ngon, prism, loft, PAL, plateOn, sculpt, placeXYZ, mirrorFig, boulder, ring, reorient } from './sty.js';

const COAT = { torso: 'coat', sleeves: 'long', trousers: 'long', boots: true, collar: 'fall' };
const moustache = (S, info, k = 1) => { const H = info.j && info.j.head; if (!H) return; for (const s of [1, -1]) S.blobBetween('main', V.add(H.c, V.add(V.mul(H.y, -0.058 * k), V.mul(H.z, 0.082 * k))), V.add(H.c, V.add(V.add(V.mul(H.y, -0.063 * k), V.mul(H.z, 0.075 * k)), V.mul(H.x, s * 0.034 * k))), 0.011 * k, 0.008 * k, { w: 8, h: 6, ref: H.y }); };

// =============================================================================================================== Popov
// [V popov1-4] bareheaded, a goatee and a moustache, a long double-breasted frock coat to the knees, the RIGHT hand (the viewer's left) extended forward and low, palm half open, the LEFT hand (the viewer's right) resting
// on a tall dark granite lectern that carries the first receiver; red-brown speckled granite pedestal 3.6 m (foot 0.7 + die 2.6 + a dark cornice 0.3), gilt text on the die, a wide flush granite apron.
const popovFig = () => cached('lmpm-popov', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.4 },
  pose: { head: [0.02, 0.1, 0], spine: [0, 0.0, 0], legs: { L: { foot: [0.1, 0, 0.0], yaw: 0.2 }, R: { foot: [-0.1, 0, 0.0], yaw: -0.2 } },
    arms: { R: { hand: [-0.4, 1.06, 0.3], pole: [-0.5, -0.6, -0.3], grip: 'open', palm: [0, 0.5, 0.9] }, L: { hand: [0.31, 0.9, 0.0], pole: [0.8, -0.3, -0.6], grip: 'flat', palm: [0, 1, 0] } } },
  outfit: { ...COAT, hem: 0.74, flare: 0.1, folds: 0.045, buttons: true }, face: { age: 0.55, hair: 'short', beard: 'goatee', seed: 41, mouth: 'stern', brow: 0.6 } }), (S, info) => moustache(S, info, 1)));
const popov = {
  id: 'n1970545795', key: 'popov', name: 'Памятник А. С. Попову', x: -2268, z: -3946, yaw: 'auto', h: 7.6, rad: 2.2, lod: [900, 0], spot: 11,
  solid: [{ w: 2.8, d: 2.4, h: 4.0 }],
  build(P, M, K) {
    const red = '#a8695c', dark = '#3b2f2b';
    block(P, M, '#9a6358', 3.4, 2.4, 0, 0.07);                                                   // the wide flush apron
    let y = steps(P, M, red, [[1.3, 1.1, 0.35, '#a8695c'], [1.05, 0.85, 0.35, '#a8695c']], 0.07);   // the stepped foot
    block(P, M, red, 0.9, 0.7, y, y + 2.55); const dieTop = y + 2.55;
    block(P, M, dark, 0.98, 0.78, dieTop, dieTop + 0.24);                                         // the cornice
    plateOn(P, M, K, 'popov', 1.3, 0.8, 0, y + 1.55, 0.706);
    const ty = dieTop + 0.24;
    block(P, M, dark, 0.8, 0.62, ty, ty + 0.08);                                                 // the figure plinth (bronze edge)
    const s = 1.72;
    put3(P, popovFig(), M.bronzeMono, -0.06, ty + 0.08, 0.0, 0, s);
    // the lectern behind the figure's left hand: a dark granite column with a sloped desk and the first receiver
    const lx = 0.56 + -0.06, ly = ty + 0.08;
    block(P, M, '#2a2523', 0.3, 0.3, ly, ly + 0.14, lx, -0.05); block(P, M, '#33292a', 0.24, 0.24, ly + 0.14, ly + 1.38, lx, -0.05); block(P, M, '#2a2523', 0.3, 0.3, ly + 1.38, ly + 1.5, lx, -0.05);
    P.tint('#2b2f2a'); P.box(M.vc, lx - 0.17, lx + 0.17, ly + 1.5, ly + 1.64, -0.2, 0.08, 'b');
    P.cyl(M.bronzeSet.main, [lx - 0.1, ly + 1.64, -0.08], [lx - 0.1, ly + 1.7, -0.08], 0.03, 0.03, 8, true);
  },
};

// =============================================================================================================== Shevchenko
// [V shev7, W] bareheaded, hair to the ears, a long cloak to the ankles, the hands crossed in front at the belt (the left holds the hem and a small book); brown-red polished granite pedestal with a moulded cornice
// on a two-step square foot in the middle of a round low granite podium (6 m), gilt facsimile "Т. Шевченко" on the die.
const shevchenkoFig = () => cached('lmpm-shev', () => extend(human({ detail: 0.5, body: { sex: 'm', muscle: 0.35, shoulders: 1.0 },
  pose: { head: [0.05, 0.0, 0], spine: [0, 0, 0], legs: { L: { foot: [0.09, 0, 0.0], yaw: 0.12 }, R: { foot: [-0.09, 0, 0.0], yaw: -0.12 } },
    arms: { R: { hand: [0.03, 0.98, 0.2], pole: [-0.7, -0.5, -0.5], grip: 'relaxed' }, L: { hand: [-0.02, 0.92, 0.2], pole: [0.7, -0.5, -0.5], grip: 'hold' } } },
  outfit: { ...COAT, trousers: 'none', boots: false, hem: 0.98, flare: 0.3, folds: 0.1, sleeves: 'long' }, face: { age: 0.45, hair: 'long', beard: 'moustache', seed: 51, mouth: 'stern' } }),
  (S, info) => {
    const j = info.j, h = j && j.wristL;
    if (h) S.blob('main', V.add(h, [0.02, -0.02, 0.05]), [0.065, 0.045, 0.012], { w: 6, h: 4 });                                    // the book in the left hand
    if (h) S.tube('main', [V.add(h, [0.03, 0.02, -0.03]), V.add(h, [0.07, -0.35, -0.02]), V.add(h, [0.1, -0.72, 0.0])], [[0.07, 0.05], [0.1, 0.06], [0.13, 0.07]], { seg: 9, per: 4 });   // the cloak hem held in the hand falls in a fold
    // the cloak: a heavy mass over both shoulders, falling behind to the ankles [V shev7]
    S.tube('main', [V.add(j.neckBase, [0, 0.01, -0.05]), V.add(j.chest, [0, 0.0, -0.1]), V.add(j.pelvis, [0, -0.1, -0.15]), V.add(j.pelvis, [0, -0.55, -0.2]), V.add(j.pelvis, [0, -0.9, -0.22])], [[0.2, 0.09], [0.27, 0.12], [0.33, 0.14], [0.38, 0.16], [0.42, 0.17]], { seg: 22, per: 4, bump: (t, th) => 1 + 0.06 * Math.sin(9 * th + 4 * t) });
    for (const s of [1, -1]) S.tube('main', [V.add(j['shoulder' + (s > 0 ? 'L' : 'R')], [s * 0.03, 0.03, -0.02]), V.add(j.pelvis, [s * 0.26, 0.1, -0.05]), V.add(j.pelvis, [s * 0.3, -0.5, -0.07]), V.add(j.pelvis, [s * 0.32, -0.9, -0.08])], [[0.06, 0.07], [0.09, 0.09], [0.11, 0.1], [0.12, 0.1]], { seg: 14, per: 4 });   // the cloak falling from each shoulder at the sides
  }));
const shevchenko = {
  id: 'n252128651', key: 'shevchenko', name: 'Памятник Т. Г. Шевченко', x: -2507, z: -3841, yaw: 'auto', h: 6.4, rad: 3.2, lod: [700, 0], spot: 10,
  solid: [{ r: 3.0, h: 0.2 }, { w: 1.9, d: 1.9, h: 4.0 }],
  build(P, M, K) {
    P.tint('#8c8a86'); lathe(P, M.vc, [[3.0, 0], [3.0, 0.18]], 28, { caps: true });
    const red = '#7a4a3c';
    let y = steps(P, M, red, [[1.5, 1.5, 0.2, '#6f433a'], [1.25, 1.25, 0.22, '#74473c']], 0.18);
    block(P, M, '#6f433a', 1.05, 1.05, y, y + 0.5); y += 0.5;                                    // the moulded base
    block(P, M, red, 0.82, 0.82, y, y + 2.3); const die = y; y += 2.3;
    block(P, M, '#6f433a', 0.95, 0.95, y, y + 0.14); block(P, M, '#74473c', 1.02, 1.02, y + 0.14, y + 0.34); y += 0.34;       // the cornice
    plateOn(P, M, K, 'shevchenko', 1.2, 0.43, 0, die + 1.45, 0.826);
    put3(P, shevchenkoFig(), M.bronzeMono, 0, y, 0, 0, 1.6);
  },
};

// =============================================================================================================== Nizami
// [V niz1, fpniz_02] a bronze group 5 m high: the robed poet seated in the rock mass, a book in his hands, the robe and the hair melting into the rock (a stack of books at the upper left, a rock cascade at the right);
// behind and to the left a thin ogee arch of steel strap 5.5 m high standing on the plinth edge; an octagonal brown granite die (3.2 m across, 1.1 m) with a black band "NIZAMİ GƏNCƏVİ" on an 8-pointed star base of
// two low grey granite steps (6.5 m across).
const nizamiFig = () => cached('lmpm-nizami', () => extend(human({ detail: 0.48, body: { sex: 'm', muscle: 0.2 },
  pose: { pelvis: [0, 0.5, -0.05], head: [0.28, 0.12, 0.05], spine: [0.1, 0.0, 0.0],
    legs: { L: { foot: [0.14, 0, 0.5], yaw: 0.2, pole: [0.1, 0.2, 1] }, R: { foot: [-0.12, 0, 0.46], yaw: -0.2, pole: [-0.1, 0.2, 1] } },
    arms: { R: { hand: [-0.05, 0.72, 0.42], pole: [-0.5, -0.4, -0.2], grip: 'hold' }, L: { hand: [0.16, 0.74, 0.4], pole: [0.5, -0.4, -0.2], grip: 'hold' } } },
  outfit: { torso: 'tunic', sleeves: 'long', hem: 0.16, flare: 0.1, folds: 0.05, collar: 'none', hat: 'none' }, face: { age: 0.5, hair: 'long', beard: 'full', seed: 61, mouth: 'stern' } }),
  (S, info) => {
    const H = info.j.head; if (H) S.blob('main', V.add(V.add(H.c, V.mul(H.y, 0.045)), V.mul(H.z, -0.03)), [0.125, 0.12, 0.13], { dir: H.z, ref: H.x, w: 10, h: 8 });           // the turban / head cloth
    const bk = info.j.wristL; if (bk) S.blob('dark', V.add(bk, [-0.08, 0.0, 0.0]), [0.13, 0.03, 0.095], { dir: [0, 0, 1], w: 8, h: 5 });                                  // the open book
    S.tube('main', [[0, 0.62, -0.02], [0, 0.6, 0.24], [0, 0.5, 0.42], [0, 0.2, 0.52], [0, 0.04, 0.56]], [[0.25, 0.14], [0.24, 0.13], [0.23, 0.14], [0.21, 0.1], [0.2, 0.06]], { seg: 14, per: 3, ref: [1, 0, 0] });             // the robe over the lap and the shins
    // the rock mass: the robe falls into a cascade of folds that stand up behind the figure on the right and a stack of books at the left
    S.tube('main', [[0.0, 0.0, -0.1], [0.1, 0.6, -0.38], [0.17, 1.0, -0.5], [0.22, 1.33, -0.46], [0.24, 1.55, -0.38]], [[0.44, 0.34], [0.38, 0.3], [0.3, 0.25], [0.23, 0.2], [0.15, 0.14]], { seg: 10, per: 4 });
    S.tube('main', [[0.42, 0.0, -0.05], [0.47, 0.45, -0.15], [0.45, 0.85, -0.26], [0.4, 1.15, -0.32], [0.31, 1.42, -0.32]], [[0.3, 0.27], [0.27, 0.24], [0.24, 0.2], [0.19, 0.17], [0.12, 0.11]], { seg: 9, per: 4 });
    for (let i = 0; i < 7; i++) S.blob('main', [0.1 + i * 0.07, 1.4 + (i % 3) * 0.08 + i * 0.02, -0.4 + (i % 2) * 0.1], [0.13, 0.08, 0.12], { dir: [0.4, 0.6, 0.5], w: 7, h: 5 });                    // the crest of the rock
    S.tube('main', [[-0.4, 0.0, 0.12], [-0.4, 0.35, -0.08], [-0.34, 0.75, -0.28], [-0.28, 1.08, -0.34], [-0.24, 1.2, -0.34]], [[0.2, 0.18], [0.19, 0.17], [0.18, 0.16], [0.18, 0.16], [0.17, 0.15]], { seg: 8, per: 3 });         // the left fall of the robe: carries the books
    for (let i = 0; i < 5; i++) S.blob('main', [-0.27 - i * 0.015 + (i % 2) * 0.04, 1.26 + i * 0.07, -0.33 + (i % 2) * 0.03], [0.17, 0.05, 0.13], { dir: [0.15 * (i - 2), 0.1, 1], w: 8, h: 5 });                      // the stack of books at the upper left, on the fall
  }));
const nizami = {
  id: 'n292325680', key: 'nizami', name: 'Памятник Низами Гянджеви', x: -2060, z: -3497, yaw: 'auto', h: 8.2, rad: 4.6, lod: [800, 0], spot: 12,
  solid: [{ r: 4.1, h: 0.7 }, { r: 2.1, h: 4.0 }],
  build(P, M, K) {
    const star = Array.from({ length: 16 }, (_, i) => { const t = i / 16 * Math.PI * 2 + Math.PI / 16, r = i % 2 ? 3.3 : 4.6; return [Math.cos(t) * r, Math.sin(t) * r]; });
    P.tint('#8d8b86'); prism(P, M.vc, star, 0, 0.36); P.tint('#7f7e7a'); prism(P, M.vc, star.map(([x, z]) => [x * 0.82, z * 0.82]), 0.36, 0.7);
    P.tint('#6b4a38'); prism(P, M.vc, ngon(2.0, 8, Math.PI / 8), 0.7, 2.2);
    P.tint('#23201f'); prism(P, M.vc, ngon(2.1, 8, Math.PI / 8), 2.2, 2.65);
    plateOn(P, M, K, 'nizami', 2.5, 0.45, 0, 2.43, 2.1 * Math.cos(Math.PI / 8) + 0.004);
    const top = 2.65;
    put3(P, nizamiFig(), M.bronzeMono, 0.3, top + 0.55, -0.1, 0.0, 2.3);                              // the poet sits on a raised rock: a big figure, the group is ~4.4 m high [V niz1]
    // the ogee arch of steel strap, 5.5 m high: two curved legs meeting at a point, standing at the left and behind the group
    P.tint('#2d3237');
    const ogee = (sg) => [[sg * 1.4, top - 0.1, -0.85], [sg * 1.42, top + 2.4, -0.85], [sg * 1.28, top + 3.5, -0.85], [sg * 0.86, top + 4.5, -0.85], [sg * 0.4, top + 5.1, -0.85], [0, top + 5.55, -0.85]];
    for (const sg of [-1, 1]) loft(P, M.vc, ogee(sg), [[0.08, 0.13]], { seg: 6, per: 5, ref: [0, 0, 1] });
  },
};

// =============================================================================================================== Uglov
// [V ug_07, ug_08; critic correction 2: MIRRORED vs the dossier] the group "a doctor and a patient": the doctor in a jacket and trousers, bareheaded, sits at the viewer's LEFT behind the bed and bends over to the right,
// both hands on the patient's hands; the patient lies on his back on a rock-like bed, the head on a pillow at the viewer's RIGHT, the blanket over the body, a bare foot at the left end.  Bronze on a red-pink
// polished granite pedestal 2.3 x 1.0 x 0.9 m (a light grey lower step 3.2 x 1.8), gilt "ТРУД ВРАЧА - В ВЫСШЕЙ СТЕПЕНИ ГУМАНЕН И БЛАГОРОДЕН / Фёдор Углов" on the front.
const uglovGroup = () => cached('lmpm-uglov', () => {
  const doc = human({ detail: 0.5, body: { sex: 'm', muscle: 0.45 },
    pose: { pelvis: [0, 0.5, 0], head: [0.3, 0.0, 0], spine: [0.26, 0.0, 0], legs: { L: { foot: [0.13, 0, 0.5], pole: [0, 0.3, 1], yaw: 0.1 }, R: { foot: [-0.13, 0, 0.46], pole: [0, 0.3, 1], yaw: -0.1 } },
      arms: { R: { hand: [-0.04, 0.72, 0.62], pole: [-0.6, -0.4, 0.1], grip: 'hold' }, L: { hand: [0.1, 0.7, 0.66], pole: [0.6, -0.4, 0.1], grip: 'hold' } } },
    outfit: { torso: 'coat', hem: 0.3, flare: 0.04, folds: 0.07, collar: 'fall', sleeves: 'long', trousers: 'long', boots: false, buttons: true }, face: { age: 0.7, hair: 'short', seed: 71, mouth: 'stern' } });
  const man = reorient(doc, [0, 0, -1], [0, 1, 0], [1, 0, 0]);                                                        // turned to face +x (z -> x)
  // the patient: standing nude figure, chest pitched forward 0.5 rad (= raised on the pillow once lying), then laid on his back (feet at x 0, head +x, face up)
  const pat = reorient(human({ detail: 0.45, body: { sex: 'm', muscle: 0.3 },
    pose: { pelvis: [0, 0.95, 0], spine: [0.55, 0, 0], head: [-0.15, -0.4, 0.0], legs: { L: { foot: [0.09, 0, 0.0], yaw: 0.25 }, R: { foot: [-0.09, 0, 0.0], yaw: -0.25 } },
      arms: { R: { hand: [-0.1, 1.2, 0.34], pole: [-0.5, -0.4, 0.0], grip: 'relaxed' }, L: { hand: [0.12, 1.22, 0.34], pole: [0.5, -0.4, 0.0], grip: 'hold' } } },
    outfit: { torso: 'nude', trousers: 'none' }, face: { age: 0.35, hair: 'short', seed: 72, mouth: 'closed' } }), [0, 0, 1], [1, 0, 0], [0, 1, 0]);   // x axis -> z, y -> x (head +x), z -> y (face up)
  return { man, pat };
});
const uglovPatient = () => cached('lmpm-uglov-pat', () => extend(uglovGroup().pat, (S) => {
  // the blanket (world frame of the lying figure: head +x, up +y, front +z): a heavy roll from the chest down over the legs with a second fold over the hips, a flap over the bed edge, the bare foot out at the left end
  S.tube('main', [[1.06, 0.2, 0.0], [0.82, 0.22, 0.02], [0.55, 0.19, 0.01], [0.3, 0.15, 0.0]], [[0.19, 0.2], [0.22, 0.21], [0.2, 0.19], [0.15, 0.14]], { seg: 14, per: 4, ref: [0, 0, 1] });
  S.tube('main', [[1.0, 0.27, 0.12], [0.76, 0.3, 0.13], [0.52, 0.22, 0.12]], [[0.07, 0.07], [0.09, 0.08], [0.06, 0.05]], { seg: 9, per: 3, ref: [0, 0, 1] });               // the fold across the hips
  S.blob('main', [0.62, 0.11, 0.2], [0.22, 0.1, 0.07], { dir: [1, 0, 0.3], w: 10, h: 6 });                                                                 // the flap over the bed edge
  S.blob('main', [1.78, 0.2, 0.0], [0.19, 0.1, 0.22], { dir: [1, 0.3, 0], w: 12, h: 8 });                                                                // the pillow behind the head and shoulders
  S.blob('main', [1.45, 0.14, 0.02], [0.2, 0.09, 0.2], { dir: [1, 0.3, 0], w: 10, h: 7 });
}));
// the bed of the group: a bronze mattress (2.3 x 0.9 m) with the sheet falling in vertical folds over the front, the back and both ends, a rumpled edge on the top
const uglovBed = () => sculpt('uglov-bed', (S) => {
  const bump = (t, th) => (1.1 - 0.1 * Math.cos(4 * th)) * (1 + 0.04 * Math.sin(16 * th + 3 * t) + 0.03 * Math.sin(29 * th - 5 * t) + 0.04 * Math.sin(5 * t * 6.2832));
  S.tube('main', [[-1.18, 0.17, 0], [-0.6, 0.17, 0], [0.0, 0.17, 0], [0.6, 0.17, 0], [1.18, 0.17, 0]], [[0.36, 0.17], [0.46, 0.19], [0.47, 0.2], [0.46, 0.19], [0.36, 0.17]], { seg: 26, per: 6, ref: [0, 0, 1], bump });
  // (review 2026-10-15: the flat rumple lenses along the front edge read as pockets / pegs: the sheet folds come from the `bump` ridges of the tube only)
}, 0.6);
const uglov = {
  id: 'n4440220895', key: 'uglov', name: 'Памятник академику Ф. Г. Углову', x: -1581, z: -3576, yaw: 'auto', h: 2.4, rad: 1.5, lod: [500, 0], spot: 8,
  solid: [{ w: 3.2, d: 1.8, h: 0.9 }],
  build(P, M, K) {
    block(P, M, '#a3a49e', 1.6, 0.9, 0, 0.1);
    const y = steps(P, M, '#8f4a42', [[1.3, 0.62, 0.1, '#9a5448'], [1.15, 0.5, 0.7, '#9a5448']], 0.1);
    plateOn(P, M, K, 'uglov', 2.1, 0.55, 0.0, 0.58, 0.504);
    const top = y;
    put3(P, uglovBed(), M.bronzeMono, 0, top, 0, 0, 1.0);                                                                  // the bronze bed with the sheet falling over its edges [V ug_07]
    put3(P, uglovPatient(), M.bronzeMono, -1.0, top + 0.28, 0.06, 0, 1.0);
    put3(P, uglovGroup().man, M.bronzeMono, -0.55, top + 0.1, -0.42, -0.55, 1.0);                                           // the doctor sits upright at the head-end side, turned to the patient
  },
};

// =============================================================================================================== Hygieia stele
// [V med1; critic correction 4: THREE white round tubs] the memorial to the students and teachers of the First Medical Institute killed 1941-45 (A. K. Krutikov, 1987): a bronze Hygieia 2.6 m on a dark speckled
// granite pylon 0.9 x 0.9 x 5 m with a bronze oval medallion "ОНИ ПОГИБЛИ СПАСАЯ ЗАЩИТНИКОВ ОТЕЧЕСТВА 1941 1945", a low wide base slab 5 x 2.5 x 0.9 m with a bronze plate "Медикам Института" and a laurel
// garland, three white round tubs (Greek-key relief) on short feet in front.  The figure: a long straight dress, the raised arm (the viewer's right = the figure's LEFT) holds a bowl with the snake, the lowered arm a laurel branch.
const hygieiaFig = () => cached('lmpm-hygieia', () => extend(human({ detail: 0.5, body: { sex: 'f', muscle: 0.2 },
  pose: { head: [-0.06, 0.12, 0], spine: [0, 0.0, 0.0], legs: { L: { foot: [0.09, 0, 0.0], yaw: 0.1 }, R: { foot: [-0.09, 0, 0.0], yaw: -0.1 } },
    arms: { R: { hand: [-0.28, 0.85, 0.09], pole: [-0.5, -0.4, -0.5], grip: 'relaxed' }, L: { hand: [0.34, 1.72, 0.12], pole: [0.7, 0.1, -0.5], grip: 'hold', palm: [0, 1, 0] } } },
  outfit: { torso: 'dress', sleeves: 'none', hem: 0.96, flare: 0.1, folds: 0.07, belt: true, collar: 'none', cape: 'back', capeLen: 0.7 }, face: { age: 0.3, hair: 'cap', seed: 81 } }), (S, info) => {
  const h = info.j.wristL; if (h) {
    S.blob('main', V.add(h, [0.0, 0.08, 0.02]), [0.085, 0.055, 0.085], { w: 9, h: 6 });                                                                         // the bowl
    S.tube('main', [V.add(h, [0.03, 0.0, 0.02]), V.add(h, [-0.05, 0.1, 0.04]), V.add(h, [0.04, 0.18, 0.0]), V.add(h, [-0.03, 0.27, 0.02])], [[0.016, 0.016], [0.02, 0.02], [0.017, 0.017], [0.011, 0.011]], { seg: 6, per: 4 });     // the snake rises from the bowl
  }
  const r = info.j.wristR; if (r) S.tube('main', [V.add(r, [0.0, -0.18, 0.0]), V.add(r, [0.0, 0.05, 0.03]), V.add(r, [-0.02, 0.3, 0.02])], [[0.008, 0.008], [0.014, 0.014], [0.01, 0.01]], { seg: 5, per: 3 });   // the laurel branch
}));
const hygieia = {
  id: 'n1899707783', key: 'hygieia', name: 'Памятник студентам и преподавателям 1-го медицинского института, погибшим в ВОВ', x: -1872, z: -3713, yaw: 'auto', h: 9, rad: 3, lod: [600, 0], spot: 10,
  solid: [{ w: 5, d: 2.5, h: 0.9 }, { w: 1.0, d: 1.0, h: 5.9 }],
  build(P, M, K) {
    block(P, M, '#6b6c70', 2.5, 1.25, 0, 0.9);
    P.tint('#4c4d51'); P.box(M.vc, -2.55, 2.55, 0.9, 0.96, -1.3, 1.3, 'b');
    block(P, M, '#48494d', 0.45, 0.45, 0.96, 5.9);
    block(P, M, '#38393c', 0.52, 0.52, 5.9, 6.0);
    // the bronze garland and the plate on the base front, the medallion on the pylon front
    plateOn(P, M, K, 'hygieiaPlate', 1.5, 0.38, 0, 0.62, 1.255);
    P.cyl(M.bronzeSet.main, [-1.1, 0.88, 1.27], [-0.5, 0.42, 1.27], 0.03, 0.03, 6, false); P.cyl(M.bronzeSet.main, [-0.5, 0.42, 1.27], [0, 0.34, 1.27], 0.03, 0.03, 6, false);
    P.cyl(M.bronzeSet.main, [1.1, 0.88, 1.27], [0.5, 0.42, 1.27], 0.03, 0.03, 6, false); P.cyl(M.bronzeSet.main, [0.5, 0.42, 1.27], [0, 0.34, 1.27], 0.03, 0.03, 6, false);
    P.geo(M.bronzeSet.main, loftOval(), 0, 3.4, 0.47, 0, 0, 0, 0.5, 0.65, 0.04);
    plateOn(P, M, K, 'hygieiaMedal', 0.6, 0.78, 0, 3.4, 0.512);
    put3(P, hygieiaFig(), M.bronzeMono, 0, 6.0, 0, 0, 1.45);
    // three white round tubs with a Greek-key band, on short feet, in front of the base
    for (const tx of [-1.7, 0, 1.7]) {
      P.tint('#e6e2da'); lathe(P, M.vc, [[0.0, 0.0], [0.4, 0.0], [0.4, 0.14], [0.82, 0.2], [0.84, 0.5], [0.8, 0.52]], 20, { x: tx, z: 2.3, caps: false, bottom: true });
      P.tint('#b9b4a8'); lathe(P, M.vc, [[0.0, 0.5], [0.8, 0.5]], 20, { x: tx, z: 2.3, y: 0.0, caps: true });
      P.tint('#a8a399'); lathe(P, M.vc, [[0.845, 0.3], [0.845, 0.36]], 20, { x: tx, z: 2.3 });
    }
  },
};
const loftOval = () => cached('lmpm-oval', () => new THREE.SphereGeometry(1, 16, 10));

export const PIECES = [popov, shevchenko, nizami, uglov, hygieia];
