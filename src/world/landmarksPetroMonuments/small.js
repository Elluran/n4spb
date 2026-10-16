// landmarksPetroMonuments/small.js - the small and abstract memorials: the Sad Angel (medics of the pandemic), the Nobel "tree of life" (6 m of dark bronze on a grey granite slab), the Hippocratic cup (Uglov garden), the MPVO women figure
// on its steel-channel bracket 11 m up the Kronverksky 12 firewall (the red-brick composition of the wall is a request to the houses owner), the Kaliningrad milestone, the Shevchenko dedication boulder, the Trinity-Peter stone
// with the bronze church model, the three oars "To the rowers of the Russian fleet", the stele "To the children of workers killed in October 1917", the pioneer steles (1923, 1972), the anchor.
// Photos: docs/research/petro-monuments-2026-north.md (nobel1, angel1, ug_02/03, mpvo1/2, fpver_02-04, shev5) and -south.md (troitsk_stone, rowers/13/18/19, stele_children/01-05).  [E] = estimated size.
import { human, extend, face, V, cached, Sculpt } from '../lib/figures.js';
import { put3, block, taper, steps, lathe, ring, prism, ngon, sculpt, boulder, bollard, chain, HF, PAL, plateOn, plateQuad, freeAlongWall, reserveRect, placeXYZ, loft } from './sty.js';
import { wallNear, WALL_GAP } from './run.js';

const rngOf = (seed) => { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; };
const place = (P, M, fig, x, y, z, rot = 0, s = 1) => put3(P, fig, M.bronzeMono, x, y, z, rot, s);
const mk = (id, key, name, x, z, h, build, extra = {}) => ({ id, key, name, x, z, yaw: 'auto', h, rad: 1.2, lod: [380, 0], spot: 6, ...extra, build });

// ---- Nobel: a twisted tree of dark bronze, a vertical trunk of several stems, irregular flame-like blades for leaves, a ragged crown ~6 m [critic correction 3], scrap-like flat leaves spread over the slab; the slab 5.5 x 3.2 x 0.6 grey granite
const nobelTree = () => sculpt('nobel-tree', (S) => {
  const R = rngOf(77);
  for (let k = 0; k < 4; k++) { const a = k * 1.57 + 0.4, rr = 0.16; S.tube('main', [[Math.cos(a) * rr, 0, Math.sin(a) * rr], [Math.cos(a + 0.5) * rr * 0.8, 1.2, Math.sin(a + 0.5) * rr * 0.8], [Math.cos(a + 1.0) * rr * 0.5, 2.6, Math.sin(a + 1.0) * rr * 0.5], [Math.cos(a + 1.4) * 0.1, 3.5, Math.sin(a + 1.4) * 0.1]], [[0.1, 0.1], [0.08, 0.08], [0.06, 0.06], [0.045, 0.045]], { seg: 6, per: 4 }); }
  const leafAt = (x, y, z, sc) => S.blob('main', [x, y, z], [0.34 * sc * (0.6 + R()), 0.06 * sc, 0.2 * sc * (0.6 + R())], { dir: [R() - 0.5, R() * 0.6, R() - 0.5], ref: [R(), 1, R()], w: 6, h: 4 });
  for (let b = 0; b < 15; b++) {
    const a = b / 15 * 6.2832 + R() * 0.5, y0 = 1.6 + R() * 2.4, len = 1.0 + R() * 1.5, up = 0.6 + R() * 0.8;
    const p = [[0, y0, 0], [Math.cos(a) * len * 0.5, y0 + up * 0.5, Math.sin(a) * len * 0.5], [Math.cos(a) * len, y0 + up, Math.sin(a) * len]];
    S.tube('main', p, [[0.05, 0.05], [0.035, 0.035], [0.02, 0.02]], { seg: 5, per: 3 });
    for (let l = 0; l < 4; l++) { const t = 0.3 + l * 0.23; leafAt(p[2][0] * t + (R() - 0.5) * 0.3, y0 + up * t + 0.08, p[2][2] * t + (R() - 0.5) * 0.3, 1.0 + R() * 0.5); }
  }
  for (let l = 0; l < 34; l++) leafAt((R() - 0.5) * 1.6, 3.4 + R() * 2.4, (R() - 0.5) * 1.2, 1.3 + R() * 0.7);                             // the crown
  S.blob('main', [0.0, 6.0, 0.0], [0.12, 0.2, 0.1], { w: 6, h: 4 });                                                                  // the bird-like form at the top
  for (let l = 0; l < 16; l++) { const a = R() * 6.2832, r = 0.8 + R() * 1.7; S.blob('main', [Math.cos(a) * r * 1.4, 0.05 + R() * 0.12, Math.sin(a) * r * 0.8], [0.3 + R() * 0.2, 0.025, 0.18 + R() * 0.12], { dir: [R() - 0.5, 0.2, R() - 0.5], w: 5, h: 4 }); }   // scrap leaves on the slab
}, 0.5);
const nobel = mk('n1986132168', 'nobel', 'Памятный знак А. Нобелю', -911, -3162, 6.8, (P, M, K) => {
  block(P, M, '#7d7d7b', 2.75, 1.6, 0, 0.6);
  plateOn(P, M, K, 'nobel', 3.2, 0.7, -0.9, 0.3, 1.604); plateOn(P, M, K, 'nobelBack', 2.4, 0.48, 0.0, 0.3, -1.604, Math.PI);
  place(P, M, nobelTree(), 0.2, 0.6, 0, 0, 1.0);
}, { rad: 3.2, lod: [520, 0], solid: [{ w: 5.6, d: 3.3, h: 0.6 }, { r: 0.45, h: 6.5 }], spot: 9 });

// ---- Sad Angel (R. Shustrov, 2021): a hunched seated bronze figure ~1 m with a bowed curly head, a long nose, small folded wings, a rough robe and a scarf, the legs drawn up; here on a low seat block
const angelFig = () => cached('lmpm-angel', () => extend(human({ detail: 0.45, body: { sex: 'm', muscle: 0.1 },
  pose: { pelvis: [0, 0.4, -0.02], head: [0.5, 0.1, 0.05], spine: [0.5, 0.0, 0.0], legs: { L: { foot: [0.1, 0.18, 0.28], pole: [0, 0.8, 1], yaw: 0.2 }, R: { foot: [-0.1, 0.18, 0.3], pole: [0, 0.8, 1], yaw: -0.2 } },
    arms: { R: { hand: [-0.12, 0.42, 0.34], pole: [-0.5, -0.1, 0.2], grip: 'relaxed' }, L: { hand: [0.12, 0.42, 0.34], pole: [0.5, -0.1, 0.2], grip: 'relaxed' } } },
  outfit: { torso: 'robe', sleeves: 'long', hem: 0.3, flare: 0.1, folds: 0.1, collar: 'none' }, face: { age: 0.2, hair: 'curly', seed: 111, mouth: 'closed', nose: 1.4 } }), (S, info) => {
  const j = info.j;
  for (const s of [-1, 1]) {                                                                       // the wings [V angel1]: big, swept up and back from the shoulder blades, three feather layers
    for (let k = 0; k < 3; k++) S.blobBetween('main', V.add(j.chest, [s * (0.09 + k * 0.03), 0.08 - k * 0.04, -0.1]), V.add(j.chest, [s * (0.3 + k * 0.05), 0.48 - k * 0.1, -0.32 - k * 0.03]), 0.07, 0.012, { w: 8, h: 5, ref: [s, 0, 0.3] });
  }
  S.tube('main', [V.add(j.neckBase, [-0.1, 0.0, 0.05]), V.add(j.neckBase, [0.0, -0.04, 0.12]), V.add(j.neckBase, [0.12, -0.12, 0.08]), V.add(j.neckBase, [0.1, -0.4, 0.1])], [[0.035, 0.03], [0.035, 0.03], [0.03, 0.03], [0.03, 0.02]], { seg: 6, per: 3 });   // the scarf
}));
const angel = mk('n8494731017', 'angel', 'Печальный ангел', -1982, -3928, 1.5, (P, M) => {
  block(P, M, '#8a8985', 0.4, 0.3, 0, 0.42); place(P, M, angelFig(), 0, 0.42, 0, 0, 1.0);
}, { rad: 0.6, lod: [260, 0], solid: [{ w: 0.9, d: 0.7, h: 0.5 }], spot: 4 });

// ---- Hippocratic cup (the Uglov garden): a white round stone tub ~1.8 m with a wrought-iron stand of four curved legs carrying a dark cup with a snake coiled up its stem; overall ~2.5 m [V ug_03]
const cup = mk('n4454944698', 'cup', 'Гиппократова чаша', -1621, -3574, 2.6, (P, M) => {
  P.tint('#e6e2da'); lathe(P, M.vc, [[0.0, 0.0], [0.8, 0.0], [0.9, 0.08], [0.92, 0.6], [0.82, 0.62]], 24, { caps: false });
  P.tint('#6a4d38'); lathe(P, M.vc, [[0.0, 0.5], [0.82, 0.5]], 24, { caps: true });
  P.tint('#26282a');
  for (let k = 0; k < 4; k++) { const a = k * 1.5708 + 0.78; loft(P, M.vc, [[Math.cos(a) * 0.7, 0.5, Math.sin(a) * 0.7], [Math.cos(a) * 0.45, 0.8, Math.sin(a) * 0.45], [Math.cos(a) * 0.15, 1.5, Math.sin(a) * 0.15], [0.0, 1.6, 0.0]], [[0.02, 0.02]], { seg: 5, per: 4 }); }
  P.tint('#2a2c2e'); lathe(P, M.vc, [[0.05, 1.6], [0.07, 1.9], [0.26, 2.1], [0.3, 2.35], [0.0, 2.35]], 14, { caps: false });
  P.tint('#6f6a58'); loft(P, M.vc, Array.from({ length: 12 }, (_, i) => [Math.cos(i * 1.0) * 0.1, 1.62 + i * 0.075, Math.sin(i * 1.0) * 0.1]), [[0.018, 0.018]], { seg: 6, per: 2 });   // the snake
}, { rad: 1.0, lod: [300, 0], solid: [{ r: 0.95, h: 0.65 }] });

// ---- MPVO women (L. Smorgon, 2002): a thin angular stylised bronze woman ~1.3 m with the head raised, perched on a cross of two steel channel beams bolted to the firewall at ~11 m; a bronze plaque with stacked-block
// letters at eye level.  Frame: origin on the pavement at the wall, +z out of the wall.  The grey plaster + red brick diagonal composition and the brick pilaster belong to the facade (request to the city owner).
const mpvoFig = () => sculpt('mpvo-woman', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.35, 0.0], [0, 0.75, 0.02], [0, 1.0, 0.05]], [[0.1, 0.05], [0.09, 0.045], [0.08, 0.04], [0.05, 0.04]], { seg: 6, per: 4 });
  S.blob('main', [0, 1.12, 0.08], [0.06, 0.08, 0.06], { w: 7, h: 5 });
  S.tube('main', [[0.0, 0.88, 0.02], [0.2, 0.7, 0.04], [0.3, 0.3, 0.04]], [[0.025, 0.02], [0.02, 0.02], [0.015, 0.015]], { seg: 5, per: 3 });
  S.tube('main', [[0.0, 0.88, 0.02], [-0.22, 0.95, 0.04], [-0.38, 1.12, 0.06]], [[0.025, 0.02], [0.02, 0.02], [0.015, 0.015]], { seg: 5, per: 3 });
  S.tube('main', [[-0.06, 0.0, 0.0], [-0.1, -0.4, 0.0]], [[0.04, 0.03], [0.03, 0.03]], { seg: 5, per: 2 });
}, 0.5);
const mpvo = mk('n13955259802', 'mpvo', 'Памятник женщинам-бойцам МПВО', -2221, -3066, 12.5, (P, M, K) => {
  P.tint('#4a4d52');
  P.box(M.vc, -1.5, 1.5, 10.6, 10.8, -WALL_GAP, 0.34, 'b');                                         // the horizontal channel beam
  for (const s of [-1, 1]) { P.box(M.vc, s * 0.5 - 0.06, s * 0.5 + 0.06, 5.2, 10.8, -WALL_GAP, 0.3, 'b'); }          // the two vertical channels
  P.cyl(M.vc, [0.9, 10.6, 0.3], [0.1, 9.2, 0.04], 0.05, 0.05, 4, false); P.cyl(M.vc, [-0.9, 10.6, 0.3], [-0.1, 9.2, 0.04], 0.05, 0.05, 4, false);   // the diagonal struts
  place(P, M, mpvoFig(), 0.4, 10.8, 0.16, 0.0, 1.0);
  P.tint('#2b2620'); P.box(M.vc, -0.47, 0.47, 1.47, 2.13, -WALL_GAP, 0.056, 'b'); P.box(M.vc, 0.63, 1.57, 1.28, 1.82, -WALL_GAP, 0.056, 'b');   // backings of the two plates to the wall
  plateOn(P, M, K, 'mpvo', 0.9, 0.64, 0, 1.8, 0.06); plateOn(P, M, K, 'mpvo2', 0.9, 0.5, 1.1, 1.55, 0.06);
}, { wall: true, pre: (ctx, pc) => wallNear(ctx, pc.x, pc.z, 14), rad: 1.0, lod: [380, 0], spot: 0, solid: [] });

// ---- Kaliningrad milestone (2003, 782 versts): a stepped square base, a die with four black polished plates, a turned collar, a block "782" on four faces, a tall rounded cone [V fpver_02-04]
const milestone = mk('n6272612187', 'milestone', 'Верстовой столб «Калининград — Санкт-Петербургу»', -3498, -3453, 3.2, (P, M, K) => {
  let y = steps(P, M, '#9a9893', [[0.8, 0.8, 0.22, '#8a8883'], [0.7, 0.7, 0.24, '#9a9893']]);
  block(P, M, '#8a8883', 0.6, 0.6, y, y + 0.24); y += 0.24;
  block(P, M, '#17181a', 0.4, 0.4, y, y + 0.8); const dy = y; y += 0.8;
  plateOn(P, M, K, 'milestoneFront', 0.62, 0.62, 0, dy + 0.4, 0.404); plateOn(P, M, K, 'milestoneBack', 0.62, 0.62, 0, dy + 0.4, -0.404, Math.PI);
  for (const s of [-1, 1]) { P.tint('#101112'); P.box(M.vc, s * 0.403 - 0.002, s * 0.403 + 0.002, dy + 0.1, dy + 0.7, -0.25, 0.25, 'b'); P.tint('#b0924a'); P.cyl(M.vc, [s * 0.408, dy + 0.4, 0], [s * 0.41, dy + 0.4, 0], 0.12, 0.12, 8, true); }   // the two side plates with the arms
  P.tint('#9a9893'); lathe(P, M.vc, [[0.38, y], [0.46, y + 0.04], [0.46, y + 0.14], [0.38, y + 0.18]], 12, { caps: true }); y += 0.18;
  block(P, M, '#6f6e6a', 0.34, 0.34, y, y + 0.5); const by = y; y += 0.5;
  for (const a of [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2]) plateOn(P, M, K, 'milestone782', 0.4, 0.4, Math.sin(a) * 0.346, by + 0.25, Math.cos(a) * 0.346, a);
  P.tint('#8a8883'); lathe(P, M.vc, [[0.3, y], [0.22, y + 0.3], [0.12, y + 0.7], [0.0, y + 1.0]], 14, { caps: false });
}, { rad: 0.9, lod: [300, 0], solid: [{ w: 1.6, d: 1.6, h: 3.2 }] });

// ---- Shevchenko dedication boulder (2003, plate says 2003 [critic correction 10]): a wedge-shaped rough grey granite boulder ~1.2 m with the sloped front dressed flat, two brass emblems at the top and two brass text columns (RU left, UA right) [V shev5]
const shevStone = mk('n2498854016', 'shev-stone', 'Памятный камень на площади Шевченко', -2423, -3892, 1.4, (P, M, K) => {
  boulder(P, M, 1, 0, 0, 0, 1.5, 0.3, '#8a8985', 2.0, 1.0);
  // the dressed slope: a slanted light-grey face on the front of the boulder
  P.tint('#7c7b77'); P.quad(M.vc, [-0.62, 0.15, 0.4], [0.62, 0.15, 0.4], [0.58, 1.0, 0.1], [-0.58, 1.0, 0.1], [0, 0.5, 1], null);
  plateQuad(P, M, 'shevchenkoStoneRu', [-0.55, 0.22, 0.4], [-0.02, 0.22, 0.4], [-0.03, 0.78, 0.2], [-0.54, 0.78, 0.2]);
  plateQuad(P, M, 'shevchenkoStoneUa', [0.02, 0.22, 0.4], [0.55, 0.22, 0.4], [0.54, 0.78, 0.2], [0.03, 0.78, 0.2]);
  P.tint('#b8923a'); for (const s of [-1, 1]) P.cyl(M.vc, [s * 0.28, 0.9, 0.25], [s * 0.28, 0.9, 0.27], 0.09, 0.09, 10, true);
}, { rad: 1.0, lod: [260, 0], solid: [{ r: 0.85, h: 1.3 }] });

// ---- Trinity-Peter stone (P. Shevchenko, 2020): a rough boulder (a fragment of the Thunder Stone) ~1.8 x 1.3 m with a bronze model of the wooden church on top, a ring of cobbles r 2.2 and a fence of black bollards with chains [V troitsk_stone/01-02]
const troitsky = mk('n12897071426', 'troitsky', 'Троице-Петровский собор (памятный знак)', -1369, -2366, 2.0, (P, M, K) => {
  P.tint('#7a766f'); ring(P, M, '#6f6b66', 1.6, 2.2, 0, 0.04, 24);
  const r = boulder(P, M, 2, 0, 0, 0, 1.55, 0.6, '#6e625a', 1.5, 1.2);
  const top = r.top, c = M.bronzeMono.main;
  P.tint('#3a3128'); P.box(M.vc, -0.2, 0.2, top, top + 0.16, -0.14, 0.14, 'b');
  P.quad(M.vc, [-0.22, top + 0.16, 0.16], [0.22, top + 0.16, 0.16], [0.15, top + 0.28, 0.0], [-0.15, top + 0.28, 0.0], [0, 0.6, 1], null); P.quad(M.vc, [0.22, top + 0.16, -0.16], [-0.22, top + 0.16, -0.16], [-0.15, top + 0.28, 0.0], [0.15, top + 0.28, 0.0], [0, 0.6, -1], null);
  P.cyl(M.vc, [0, top + 0.28, 0], [0, top + 0.42, 0], 0.07, 0.07, 8, false); P.cyl(M.vc, [0, top + 0.42, 0], [0, top + 0.56, 0], 0.07, 0.01, 8, true);
  P.cyl(M.vc, [0.14, top + 0.16, 0.0], [0.14, top + 0.3, 0.0], 0.04, 0.04, 6, false); P.cyl(M.vc, [0.14, top + 0.3, 0.0], [0.14, top + 0.4, 0.0], 0.04, 0.01, 6, true);
  plateOn(P, M, K, 'troitsky', 0.4, 0.16, 0, 0.5, 0.62);
  const n = 10, pr = 2.5, pts = Array.from({ length: n }, (_, i) => [Math.cos(i / n * 6.2832) * pr, Math.sin(i / n * 6.2832) * pr]);
  pts.forEach((p, i) => { bollard(P, M, p[0], p[1]); chain(P, M, p, pts[(i + 1) % n], 0.7, 0.18, 4); });
}, { rad: 2.8, lod: [300, 0], solid: [{ r: 2.65, h: 1.0 }], spot: 6 });

// ---- Rowers (A. Levenkov, 1972-74): three 10 m oars crossing at the top as a tripod, the blades (blue-grey green, perforated box section) below, the shafts (copper-brown rods) above, in a white concrete planter ~4.5 x 3 m filled with dark pebbles; brass letters on the planter [V rowers/13, 18, 19]
const rowers = mk('n3189624700', 'rowers', 'Памятник гребцам Российского флота', -3437, -2820, 10.2, (P, M, K) => {
  P.tint('#e9e9e4'); P.box(M.vc, -2.25, 2.25, 0, 0.62, -1.5, 1.5, 'b'); P.tint('#3c3c3c'); P.box(M.vc, -2.1, 2.1, 0.58, 0.64, -1.35, 1.35, 'b');
  plateOn(P, M, K, 'rowers', 2.0, 0.4, 0, 0.3, 1.504);
  const top = [0.12, 9.4, 0.0];
  for (let k = 0; k < 3; k++) {
    const a = k * 2.0944 + 0.5, base = [Math.cos(a) * 1.5, 0.64, Math.sin(a) * 0.95], tp = [top[0] + Math.cos(a + 2.0) * 0.12, top[1] - k * 0.04, top[2] + Math.sin(a + 2.0) * 0.12];
    const mid = V.add(base, V.mul(V.sub(tp, base), 0.52));
    P.tint('#5f7a76'); P.cyl(M.vc, base, mid, 0.17, 0.14, 4, true); P.tint('#2e3d3a'); for (let i = 1; i < 7; i++) { const q = V.add(base, V.mul(V.sub(mid, base), i / 7.5)); P.cyl(M.vc, V.add(q, [0, 0, 0]), V.add(q, V.mul(V.unit(V.sub(mid, base)), 0.12)), 0.175, 0.175, 4, false); }
    P.tint('#a8643a'); P.cyl(M.vc, mid, tp, 0.07, 0.06, 8, true);
  }
}, { rad: 2.6, lod: [800, 0], solid: [{ w: 4.6, d: 3.1, h: 0.7 }, { r: 0.3, h: 10 }], spot: 10 });

// ---- Children stele (1971/72, redone 2006): a long low wall of grey limestone blocks 7.5 m, a higher text slab 2.2 m at the left with a stone bowl at its foot, five child heads (boy, girl, boy, girl, a girl with long hair) in half relief along the top of the right wall [V stele_children/01, 04, 05]
const headRel = (i) => cached('lmpm-childhead-' + i, () => { const S = new Sculpt({ detail: 0.5 }); face(S, HF([0, 0, 0], 0.0, 0.0), { hair: i % 2 ? 'long' : 'short', age: 0.0, seed: 120 + i, scale: 0.95, skinKey: 'main', hairKey: 'main' }); return S.finish({}); });
const children = mk('n2858004279', 'children', 'Детям рабочих, погибшим в октябре 1917', -3621, -2978, 2.4, (P, M, K) => {
  P.tint('#b9b5a6'); P.box(M.vc, -3.75, 3.75, 0, 1.45, -0.4, 0.4, 'b'); P.box(M.vc, -1.9, 3.75, 1.45, 2.05, -0.4, 0.0, 'b');
  P.tint('#a8a49a'); P.box(M.vc, -3.75, -2.0, 0, 2.25, -0.42, 0.42, 'b');
  P.tint('#98948a'); for (let r = 1; r < 6; r++) P.box(M.vc, -1.98, 3.74, r * 0.24 - 0.01, r * 0.24 + 0.01, 0.4, 0.405, 'b');                      // the ashlar joints
  plateOn(P, M, K, 'children', 1.6, 1.15, -2.875, 1.3, 0.424);
  P.tint('#a8a49a'); P.box(M.vc, -1.95, 3.78, 1.45, 2.1, 0.0, 0.4, 'b');
  for (let i = 0; i < 5; i++) { const fig = headRel(i); P.tint('#d8d4c6'); for (const g of Object.values(fig.geos)) P.geo(M.vc, g, -0.7 + i * 1.05, 1.78, 0.42, 0, 0, 0, 2.3, 2.3, 0.75); }
  P.tint('#8a8884'); lathe(P, M.vc, [[0.0, 0.0], [0.28, 0.0], [0.34, 0.12], [0.3, 0.2], [0.0, 0.16]], 12, { x: -2.9, z: 0.8, caps: false });         // the stone bowl
}, { rad: 4.0, lod: [320, 0], solid: [{ w: 7.6, d: 0.9, h: 2.3 }], spot: 7 });

// ---- Pioneer steles (no photos: shape [?]): 1972 concrete stele ~3.2 m with a round relief of the Order of Lenin; 1923 a small granite sign 1.4 m
const pioneer1972 = mk('n9014705990', 'pioneer-1972', 'Стела в честь 50-летия пионерской организации', -3036, -2498, 3.3, (P, M, K) => {
  block(P, M, '#8e8d89', 0.45, 0.3, 0, 0.2); block(P, M, '#a9a79f', 0.25, 0.15, 0.2, 3.2);
  P.tint('#b02a2e'); P.cyl(M.vc, [0, 2.7, 0.15], [0, 2.7, 0.18], 0.17, 0.17, 14, true); P.tint('#d4b04e'); P.cyl(M.vc, [0, 2.7, 0.18], [0, 2.7, 0.19], 0.09, 0.09, 14, true);
  plateOn(P, M, K, 'pioneer1972', 0.4, 0.25, 0, 1.4, 0.156);
}, { rad: 0.6, lod: [260, 0], solid: [{ w: 0.7, d: 0.4, h: 3.2 }], spot: 4 });
const pioneer1923 = mk('n1514171553', 'pioneer-1923', 'Памятный знак первому пионерскому отряду', -3938, -3234, 1.5, (P, M, K) => {
  block(P, M, '#7f7e7a', 0.4, 0.22, 0, 0.1); block(P, M, '#6f6e6a', 0.22, 0.1, 0.1, 1.4); plateOn(P, M, K, 'pioneer1923', 0.36, 0.22, 0, 0.95, 0.106);
}, { rad: 0.5, lod: [240, 0], solid: [{ w: 0.8, d: 0.45, h: 1.4 }], spot: 3 });

// ---- Anchor (Okeanpribor, Chkalovsky 46; no photo of the anchor [?]): an Admiralty-pattern iron anchor ~1.9 m on a low granite slab
const anchor = mk('n7281165650', 'anchor', 'Якорь', -2938, -3807, 2.2, (P, M) => {
  block(P, M, '#6f6e6a', 0.6, 0.4, 0, 0.18);
  P.tint('#23282a'); const y = 0.18;
  P.cyl(M.vc, [0, y, 0], [0, y + 1.7, 0], 0.07, 0.05, 8, false);                                        // the shank
  P.cyl(M.vc, [-0.45, y + 1.55, 0], [0.45, y + 1.55, 0], 0.035, 0.035, 6, true);                         // the stock
  P.cyl(M.vc, [0, y + 1.7, 0], [0, y + 1.9, 0], 0.09, 0.09, 8, true);
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832; P.cyl(M.vc, [Math.cos(a) * 0.12, y + 1.95 + Math.sin(a) * 0.12, 0], [Math.cos(a + 0.52) * 0.12, y + 1.95 + Math.sin(a + 0.52) * 0.12, 0], 0.016, 0.016, 4, false); }    // the ring
  for (const s of [-1, 1]) { P.cyl(M.vc, [0, y + 0.05, 0], [s * 0.4, y + 0.28, 0], 0.05, 0.04, 6, false); P.cyl(M.vc, [s * 0.4, y + 0.28, 0], [s * 0.62, y + 0.62, 0], 0.045, 0.03, 6, false); P.box(M.vc, s * 0.62 - 0.07, s * 0.62 + 0.07, y + 0.6, y + 0.7, -0.04, 0.04, 'b'); }   // the arms and the flukes
}, { rad: 0.9, lod: [240, 0], solid: [{ w: 1.3, d: 0.9, h: 0.5 }, { r: 0.12, h: 2.0 }], spot: 4 });

// ---- Shostakovich plaque (Bolshaya Pushkarskaya 37, the Benois house): a dark bronze arched plate ~0.55 x 1.0 m with a high-relief head rising from the top and the engraved text, bolted to the rusticated wall at ~2 m [V shosp]
const plaqueHead = () => cached('lmpm-plaque-head', () => { const S = new Sculpt({ detail: 0.5 }); face(S, HF([0, 0, 0], 0.0, 0.0), { hair: 'short', age: 0.45, seed: 14, scale: 1.4, skinKey: 'main', hairKey: 'main' }); return S.finish({}); });
const shostPlaque = mk('n9822832283', 'shost-plaque', 'Мемориальная доска Д. Д. Шостаковича', -2281, -3395, 3.0, (P, M, K) => {
  const X = freeAlongWall(K, 0.7, 1.35, 1.95, 0.04, [0, 0.6, -0.6, 1.2, -1.2, 1.8, -1.8, 2.4, -2.4]) ?? 0;      // slid along the wall off a downpipe / sign of the city
  reserveRect(K, 0.7, 1.35, X, 1.95, 0.04);
  P.tint('#3d443f'); P.box(M.vc, X - 0.3, X + 0.3, 1.45, 2.4, -WALL_GAP, 0.03, 'b'); P.cyl(M.vc, [X, 2.4, -WALL_GAP], [X, 2.4, 0.03], 0.3, 0.3, 14, true);
  plateQuad(P, M, 'shostakovichPlaque', [X - 0.25, 1.54, 0.036], [X + 0.25, 1.54, 0.036], [X + 0.25, 2.16, 0.036], [X - 0.25, 2.16, 0.036]);
  for (const g of Object.values(plaqueHead().geos)) { P.tint('#45504a'); P.geo(M.vc, g, X, 2.5, 0.06, 0, 0, 0, 1.0, 1.0, 0.5); }
}, { wall: true, pre: (ctx, pc) => wallNear(ctx, pc.x, pc.z, 6), rad: 0.5, lod: [200, 0], spot: 0, solid: [] });

// ---- "Военным топографам посвящается" (Pionerskaya 20, the Military Topographic Institute): a wall panel of dark blue-black glazed ceramic bricks 3 x 1.5 m with a line of gilded capitals above two bronze relief portrait plaques [V rowers/16, 17]
const topo = mk('n10737731574', 'topo', 'Военным топографам посвящается', -3434, -2800, 3.0, (P, M, K) => {
  // the panel is slid along the wall to the first spot where the generic facade has no door under it and no downpipe / sign of the city crosses it (the label registry says which; review 2026-10-14)
  const X = freeAlongWall(K, 3.0, 1.7, 2.05, 0.04, [1.6, 2.0, 2.4, 2.8, 3.2, 1.2, 0.8, 0.4, 0, -0.4, -0.8, -1.2, -1.6, -2.0, -2.4, -2.8]) ?? 1.6;
  reserveRect(K, 3.0, 1.7, X, 2.05, 0.04);
  P.tint('#0f1a2a'); P.box(M.vc, X - 1.5, X + 1.5, 1.2, 2.9, -WALL_GAP, 0.04, 'b');
  plateQuad(P, M, 'topo', [X - 1.3, 2.39, 0.05], [X + 1.3, 2.39, 0.05], [X + 1.3, 2.71, 0.05], [X - 1.3, 2.71, 0.05]);
  for (const s of [-1, 1]) { P.tint('#4a3b2f'); P.box(M.vc, X + s * 0.6 - 0.28, X + s * 0.6 + 0.28, 1.4, 2.2, 0.04, 0.07, 'b'); for (const g of Object.values(plaqueHead().geos)) { P.tint('#5a4a3a'); P.geo(M.vc, g, X + s * 0.6, 1.85, 0.07, 0, 0, 0, 1.3, 1.3, 0.3); } }
}, { wall: true, pre: (ctx, pc) => wallNear(ctx, pc.x, pc.z, 6), rad: 1.6, lod: [220, 0], spot: 0, solid: [] });

export const PIECES = [nobel, angel, cup, mpvo, milestone, shevStone, troitsky, rowers, children, pioneer1972, pioneer1923, anchor, shostPlaque, topo];
