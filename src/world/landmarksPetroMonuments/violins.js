// landmarksPetroMonuments/violins.js - "Pervaya skripka" (First Violin, E. Lekus + A. Dobrovolsky, opened 2008-09-02) in the Andrey Petrov square (Kamennoostrovsky pr.): the violin pieces as lofted forms [V vio_tufl, vio_gram, vio_kres,
// vio_zhen1, vio_p5, vio_leb, vio_yab, vio_sph]: Shoe (a violin as a high-heeled shoe), Gramophone (a violin body opening as a horn), Chair (the Throne of the Composer), Woman (a fountain-sculpture in a RING basin),
// the added pieces of the critic dossier section 3 point 7: Apple, Swan [E: the node is a guess], two Sphinxes.  Dark bronze with a green patina (the Woman and the Apple are verdigris).  Plate keys: platetext.js vio*.
import { human, extend, V, cached } from '../lib/figures.js';
import { put3, block, taper, steps, lathe, ring, sculpt, PAL, plateOn, loft } from './sty.js';

const TEAL = '#4a7268', DK = '#3b3a35';
const place = (P, M, fig, x, y, z, rot = 0, s = 1) => put3(P, fig, M.bronzeMono, x, y, z, rot, s);
const tealPlace = (P, M, fig, x, y, z, rot = 0, s = 1) => { for (const g of Object.values(fig.geos)) { P.tint(TEAL); P.geo(M.vc, g, x, y, z, 0, rot, 0, s, s, s); } };

// ---- Shoe: the body of a violin as a shoe, the heel a thin leg; 1.5 m long, 1.1 m high on a square grey granite plinth 1.1 x 1.1 x 0.4 with a bronze base plate [V vio_tufl]
const shoe = () => sculpt('vio-shoe', (S) => {
  S.tube('main', [[-0.7, 0.1, 0], [-0.3, 0.14, 0], [0.1, 0.4, 0], [0.4, 0.82, 0], [0.55, 1.0, 0]], [[0.2, 0.12], [0.24, 0.15], [0.21, 0.14], [0.17, 0.13], [0.2, 0.12]], { seg: 12, per: 5, ref: [0, 0, 1] });
  S.tube('main', [[0.55, 0.95, 0], [0.62, 0.5, 0], [0.64, 0.02, 0]], [[0.06, 0.06], [0.05, 0.05], [0.07, 0.07]], { seg: 8, per: 4 });              // the heel
  S.blob('main', [-0.78, 0.08, 0], [0.1, 0.07, 0.12], { w: 8, h: 6 });                                                                               // the scroll at the toe
}, 0.55);
// ---- Gramophone: the violin body opens upward as a horn, a small scroll at the base; on a dark cube on a grey granite plinth [V vio_gram]
const gram = () => sculpt('vio-gram', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.25, 0], [0.04, 0.7, 0], [0.18, 1.2, 0], [0.3, 1.4, 0]], [[0.12, 0.12], [0.1, 0.1], [0.2, 0.17], [0.4, 0.28], [0.52, 0.34]], { seg: 14, per: 5, cap: false, capB: false });
  S.tube('main', [[0.3, 1.38, 0], [0.3, 1.42, 0]], [[0.5, 0.33], [0.46, 0.3]], { seg: 14, per: 1, cap: false });
  S.blob('main', [-0.08, 0.14, 0.12], [0.09, 0.12, 0.07], { w: 8, h: 6 });
}, 0.55);
// ---- Chair: a huge violin body lying on its back as an armchair; light brown-grey cast, on a stepped plate 2.2 x 1.6 x 0.25 [V vio_kres]
const chair = () => sculpt('vio-chair', (S) => {
  S.tube('main', [[-0.45, 0.0, 0], [0.0, 0.0, 0.0], [0.45, 0.0, 0]], [[0.22, 0.5], [0.26, 0.58], [0.3, 0.56]], { seg: 12, per: 4, ref: [0, 1, 0] });           // the seat (the lower bout)
  S.tube('main', [[0.3, 0.0, -0.45], [0.35, 0.7, -0.5], [0.4, 1.35, -0.45]], [[0.34, 0.13], [0.3, 0.12], [0.18, 0.1]], { seg: 12, per: 5 });                 // the high back = the neck side
  S.blob('main', [0.4, 1.46, -0.45], [0.1, 0.1, 0.09], { w: 8, h: 6 });                                                                                      // the scroll
  for (const s of [-1, 1]) S.tube('main', [[s * 0.42, 0.0, -0.2], [s * 0.45, 0.34, -0.1], [s * 0.4, 0.52, 0.28]], [[0.07, 0.1], [0.07, 0.1], [0.07, 0.08]], { seg: 8, per: 4 });   // the arms
}, 0.55);
// ---- Woman: a tall slender violin body (waist at the middle, neck and a scroll head on top, slightly leaning), 2.5 m, on a round dark granite drum; verdigris green [V vio_zhen1]
const woman = () => sculpt('vio-woman', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.4, 0], [0.01, 0.95, 0], [0.02, 1.35, 0], [0.03, 1.75, 0], [0.04, 1.95, 0.0], [0.05, 2.25, 0]], [[0.31, 0.12], [0.34, 0.15], [0.2, 0.11], [0.27, 0.12], [0.3, 0.12], [0.07, 0.07], [0.06, 0.06]], { seg: 14, per: 5, ref: [1, 0, 0] });
  S.blob('main', [0.05, 2.34, 0.0], [0.07, 0.1, 0.08], { w: 8, h: 6 });
  for (const s of [-1, 1]) S.blob('main', [0.05 + s * 0.06, 2.26, 0.0], [0.03, 0.05, 0.03], { w: 6, h: 4 });
}, 0.55);
// ---- Apple: a round violin body with f-holes on a scroll stem on a tall dark red granite column ~1.3 m [V vio_yab]
const apple = () => sculpt('vio-apple', (S) => {
  S.blob('main', [0, 0.38, 0], [0.34, 0.36, 0.2], { w: 14, h: 10 });
  S.tube('main', [[0, 0.7, 0], [0.02, 0.9, 0], [0.04, 1.02, 0]], [[0.04, 0.04], [0.035, 0.035], [0.05, 0.05]], { seg: 8, per: 3 });
  S.blob('main', [0.05, 1.08, 0], [0.07, 0.07, 0.06], { w: 8, h: 6 });
  for (const s of [-1, 1]) S.blob('dark', [s * 0.12, 0.4, 0.17], [0.012, 0.09, 0.01], { w: 5, h: 4 });
}, 0.55);
// ---- Swan: the violin body as a recumbent swan, the neck and the scroll curving up [V vio_leb]
const swan = () => sculpt('vio-swan', (S) => {
  S.blob('main', [0, 0.28, 0], [0.55, 0.26, 0.3], { w: 14, h: 10 });
  S.tube('main', [[0.42, 0.34, 0], [0.62, 0.6, 0], [0.5, 0.95, 0], [0.62, 1.2, 0]], [[0.09, 0.09], [0.07, 0.07], [0.06, 0.06], [0.05, 0.05]], { seg: 8, per: 5 });
  S.blob('main', [0.66, 1.22, 0], [0.07, 0.06, 0.05], { w: 8, h: 6 });
}, 0.55);
// ---- Sphinx: a grey granite recumbent form with a scroll head, on a stepped plinth ~1.1 m x 1.5 m [V vio_sph]
const sphinx = () => sculpt('vio-sphinx', (S) => {
  S.blob('main', [-0.15, 0.28, 0], [0.7, 0.26, 0.32], { w: 14, h: 10 });
  S.tube('main', [[0.4, 0.3, 0], [0.55, 0.58, 0], [0.58, 0.82, 0]], [[0.16, 0.12], [0.12, 0.1], [0.1, 0.09]], { seg: 10, per: 4 });
  S.blob('main', [0.62, 0.9, 0], [0.12, 0.11, 0.1], { w: 8, h: 6 });
}, 0.55);

const gran = (P, M, hex, hw, hd, h) => block(P, M, hex, hw, hd, 0, h);
const mk = (id, key, name, x, z, h, build, extra = {}) => ({ id, key, name, x, z, yaw: 'auto', h, rad: 1.2, lod: [260, 0], spot: 5, ...extra, build });

const PIECES_ = [
  mk('n6837973312', 'vio-shoe', 'Скрипка-туфелька', -2156, -3426, 2.0, (P, M, K) => {
    gran(P, M, '#aeaca6', 0.55, 0.55, 0.4); P.tint('#3a3a36'); P.box(M.vc, -0.5, 0.5, 0.4, 0.43, -0.5, 0.5, 'b');
    place(P, M, shoe(), 0, 0.43, 0, 0, 1.0); plateOn(P, M, K, 'vioShoe', 0.4, 0.13, 0, 0.2, 0.556);
  }, { solid: [{ w: 1.15, d: 1.15, h: 1.3 }] }),
  mk('n6837973313', 'vio-gram', 'Скрипка-граммофон', -2164, -3445, 2.0, (P, M, K) => {
    gran(P, M, '#aeaca6', 0.45, 0.45, 0.6); block(P, M, '#2c3a34', 0.35, 0.35, 0.6, 1.2);
    place(P, M, gram(), 0, 1.2, 0, 0, 0.95); plateOn(P, M, K, 'vioGram', 0.36, 0.12, 0, 0.3, 0.456);
  }, { solid: [{ w: 0.95, d: 0.95, h: 1.4 }] }),
  mk('n6837973645', 'vio-chair', 'Скрипка-кресло', -2172, -3428, 1.8, (P, M, K) => {
    P.tint('#8a8478'); P.box(M.vc, -1.1, 1.1, 0, 0.12, -0.8, 0.8, 'b'); P.box(M.vc, -0.95, 0.95, 0.12, 0.25, -0.65, 0.65, 'b');
    for (const g of Object.values(chair().geos)) { P.tint('#a39786'); P.geo(M.vc, g, 0, 0.55, 0, 0, 0, 0, 1, 1, 1); }
    plateOn(P, M, K, 'vioChair', 0.4, 0.13, 0.7, 0.18, 0.806);
  }, { solid: [{ w: 2.2, d: 1.6, h: 0.9 }] }),
  mk('n4496341909', 'vio-apple', 'Скрипка-яблоко', -2121, -3457, 2.4, (P, M, K) => {
    block(P, M, '#6a3a34', 0.4, 0.4, 0, 0.12); block(P, M, '#5a2f2b', 0.3, 0.3, 0.12, 1.3);
    tealPlace(P, M, apple(), 0, 1.3, 0, 0, 1.0); plateOn(P, M, K, 'vioApple', 0.3, 0.1, 0, 0.5, 0.306);
  }, { solid: [{ w: 0.85, d: 0.85, h: 2.0 }] }),
  mk('n3614187009', 'vio-swan', 'Скрипка-лебедь', -2104.5, -3421, 1.7, (P, M, K) => {
    gran(P, M, '#9c9a94', 0.8, 0.5, 0.35); place(P, M, swan(), 0, 0.35, 0, 0, 1.0); plateOn(P, M, K, 'vioSwan', 0.34, 0.11, 0.0, 0.17, 0.506);
  }, { solid: [{ w: 1.7, d: 1.1, h: 0.8 }], clear: 2.0 }),
  mk('n4496341907', 'vio-sphinx-a', 'Скрипка-сфинкс', -2097, -3441, 1.9, (P, M, K) => {
    steps(P, M, '#8d8b86', [[0.95, 0.5, 0.45, '#8d8b86'], [0.8, 0.4, 0.5, '#9a9892']]); block(P, M, '#7f7d78', 0.6, 0.34, 0.95, 1.02);
    for (const g of Object.values(sphinx().geos)) { P.tint('#8b8a86'); P.geo(M.vc, g, 0, 1.02, 0, 0, 0, 0, 1.0, 1.0, 1.0); }
    plateOn(P, M, K, 'vioSphinx', 0.34, 0.11, 0, 0.3, 0.506);
  }, { solid: [{ w: 1.9, d: 1.0, h: 1.9 }] }),
  mk('n5931568248', 'vio-sphinx-b', 'Скрипка-сфинкс', -2117, -3437, 1.9, (P, M, K) => {
    steps(P, M, '#8d8b86', [[0.95, 0.5, 0.45, '#8d8b86'], [0.8, 0.4, 0.5, '#9a9892']]); block(P, M, '#7f7d78', 0.6, 0.34, 0.95, 1.02);
    for (const g of Object.values(sphinx().geos)) { P.tint('#8b8a86'); P.geo(M.vc, g, 0, 1.02, 0, 0, Math.PI, 0, 1.0, 1.0, 1.0); }
  }, { solid: [{ w: 1.9, d: 1.0, h: 1.9 }] }),
];

// ---- Skripka-Zhenshchina: the fountain-sculpture in a RING basin (7 m across: a wide flat rim of grey granite used as a seat, an inner ring of water ~2 m wide, a round dark granite drum with a stepped ring in the middle);
// a thin sheet of water falls from the drum into the ring; a round dark granite disc with "СКРИПКА-ЖЕНЩИНА" engraved round the drum; brick pavers in concentric rings round the basin [V vio_p5, vio_zhen1, vio_zhen2]
const womanFountain = mk('n1351327777', 'vio-woman', 'Фонтан-скульптура «Скрипка-Женщина»', -2143, -3471, 3.2, (P, M, K) => {
  const seg = 36;
  P.tint('#8d8a86'); ring(P, M, '#8d8a86', 2.55, 3.5, 0, 0.42, seg);                                                // the rim: the outer wall and the flat seat top
  P.tint('#2f3a3c'); P.fan(M.vc, Array.from({ length: seg }, (_, i) => [Math.cos(i / seg * 6.2832) * 2.6, 0.06, Math.sin(i / seg * 6.2832) * 2.6]), [0, 1, 0]);   // the basin floor
  // the water ring (water material, decal-like at 0.27 m)
  const w = []; for (let i = 0; i < seg; i++) { const t = i / seg * 6.2832; w.push([Math.cos(t) * 2.58, 0.27, Math.sin(t) * 2.58]); }
  P.fan(M.water, w, [0, 1, 0], (p) => [p[0] / 3, p[2] / 3]);
  // the island: the drum and the stepped ring, the water sheet, the figure
  P.tint('#3a3535'); lathe(P, M.vc, [[1.05, 0.05], [1.05, 0.5], [0.95, 0.52]], 28, { caps: true });
  P.tint('#4a4444'); lathe(P, M.vc, [[0.9, 0.52], [0.9, 0.6], [0.78, 0.64], [0.78, 0.7]], 28, { caps: true });                // the gear-like stepped ring
  P.tint('#6a6a64'); lathe(P, M.vc, [[0.55, 0.7], [0.55, 0.82]], 12, { caps: true });
  for (let i = 0; i < 24; i++) { if (i >= 5 && i <= 7) continue; const a = i / 24 * 6.2832, c = Math.cos(a), s = Math.sin(a), r0 = 1.05, r1 = 1.2; P.quad(M.jet, [c * r0 - s * 0.13, 0.5, s * r0 + c * 0.13], [c * r0 + s * 0.13, 0.5, s * r0 - c * 0.13], [c * r1 + s * 0.13, 0.27, s * r1 - c * 0.13], [c * r1 - s * 0.13, 0.27, s * r1 + c * 0.13], [c, 0.4, s], [[0, 1], [1, 1], [1, 0], [0, 0]]); }
  tealPlace(P, M, woman(), 0, 0.82, 0, 0, 1.0);
  plateOn(P, M, K, 'vioWoman', 0.8, 0.133, 0, 0.32, 1.058);   // chord of the drum only (a 1.25 m flat plate stuck out as dark wings, review 2026-10-15)
  P.tint('#6b3f38'); ring(P, M, '#6b3f38', 3.5, 4.0, 0, 0.03, seg);                                                // the brick pavers round the basin (a flush ring)
}, { solid: [{ r: 3.5, h: 1.0 }], rad: 3.6, lod: [320, 0] });

export const PIECES = [...PIECES_, womanFountain];
