// landmarksPetroMonuments/peter.js - the PETER PATH ("Путь Петра", Armen Gasparyan, opened 22 May 2024 near the Tovstonogov square): seven bronze compositions of 0.7-1.2 m, each fixed on the flat top of a natural
// unhewn pink-grey granite boulder 1.0-1.5 m high (three instanced boulder variants of sty.js, split-granite facets and speckle), a small bronze name plate (name + 2023) on the boulder front and a slanted gold-brass
// information plate with a Church Slavonic motto on a post in front [V pp_lj/01-28, peterpath/05].  Redone 2026-10-14 after a side-by-side with the photos (the first pass had squat boulders and an arch instead of the column).
//   Rus-Europe        a two-faced (Janus) bust: a clean-shaven European in a long curled wig and a bearded boyar, ONE tall flared relief hat over both; the bust is cut off at the shoulders  [pp_lj/01-03]
//   Streltsy revolt   a veiled woman (Sofya) with a boy on stone steps, pikes and halberds leaning against the steps, round caps at the foot, on a rectangular bronze base  [pp_lj/04-06]
//   Azov campaigns    a galley (masts, sails, a high stern) beside a tapering fortress tower that grows out of a rock, a serpent coiled round it, battlements, Peter on a rearing horse on top  [pp_lj/07-09]
//   Exit to the sea   a tall rectangular relief column (churches, domes, waves, a torn top) in front of a three-masted ship rising on a bronze wave  [pp_lj/10-12]
//   Transfer of knowledge  a map sheet with rolled ends: the Kunstkamera tower model (three octagonal tiers, dome, lantern, spire), an armillary sphere, an hourglass, books, a quill, a plumb bob  [pp_lj/14-16]
//   Found his home    a model of the Summer Palace: hipped roof, pediment, trumpeting angels and a crown on the ridge, side window panels, an arched niche with Peter, Catherine and a dog  [pp_lj/18-22]
//   Paradise          two open hands on a rolled map holding a model of the Peter and Paul Cathedral with its tall spire and the angel on top  [pp_lj/24-27]
// Heights are [E] from the boulders, trees and benches of the photos.  NO pennants on the ship masts (user rule: no flags).
import { human, horse, hand, extend, face, V, cached } from '../lib/figures.js';
import { put3, boulderFit, boulderPlate, sculpt, HF, plateQuad, prism, ngon, taper } from './sty.js';
import { ball } from './solids.js';

const BR = '#4a3e32', BRD = '#2d2822', BRG = '#4f6a5c';

/** the shared frame of a path piece: the boulder (W x H x D, base on the ground), the bronze name plate on its front and the slanted info plate on a post in front; returns the y of the boulder top */
function onBoulder(P, M, K, o) {
  const r = boulderFit(P, M, o.variant, 0, 0, 0, o.w, o.h, o.d, o.rot ?? 0, o.col || '#a37a6a');
  boulderPlate(P, M, K, o.name2, o.variant, o.w, o.h, o.d, o.rot ?? 0, 0, o.h * 0.22, 0.4, 0.19);
  // the info plate: gold-brass 0.55 x 0.38 m, leaning back, on a dark post; beside the boulder, a little in front
  const pz = o.d * 0.5 + 0.55, px = o.w * 0.5 + 0.3;
  P.tint('#26282a'); P.box(M.vc, px - 0.035, px + 0.035, 0, 0.52, pz - 0.03, pz + 0.03, 'b');
  const tilt = 0.55, w = 0.55, h = 0.38, y0 = 0.5, zf = pz + 0.03;
  plateQuad(P, M, o.plate, [px - w / 2, y0, zf], [px + w / 2, y0, zf], [px + w / 2, y0 + h * Math.cos(tilt), zf - h * Math.sin(tilt)], [px - w / 2, y0 + h * Math.cos(tilt), zf - h * Math.sin(tilt)]);
  P.tint('#242628'); P.quad(M.vc, [px - w / 2 - 0.025, y0 - 0.025, zf - 0.006], [px + w / 2 + 0.025, y0 - 0.025, zf - 0.006], [px + w / 2 + 0.025, y0 + h * Math.cos(tilt) + 0.025, zf - h * Math.sin(tilt) - 0.006], [px - w / 2 - 0.025, y0 + h * Math.cos(tilt) + 0.025, zf - h * Math.sin(tilt) - 0.006], [0, 1, 1], null);
  return r.top;
}
const mkPiece = (o) => ({
  id: o.id, key: o.key, name: o.name, x: o.x, z: o.z, yaw: 'auto', h: o.hh, rad: 1.0, lod: [380, 0], spot: 5, solid: [{ r: Math.min(o.w, o.d) * 0.5 + 0.05, h: 1.5 }],
  build(P, M, K) { const top = onBoulder(P, M, K, o); o.group(P, M, top - 0.015, K); },
});
const bz = (P, M, fig, x, y, z, rot, s) => put3(P, fig, M.bronzeMono, x, y, z, rot, s);
const dk = (P, M, hex, x0, x1, y0, y1, z0, z1) => { P.tint(hex); P.box(M.vc, x0, x1, y0, y1, z0, z1, 'b'); };

// ---------------------------------------------------------------------------------------------------------------- Rus-Europe
const janus = () => sculpt('janus3', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.08, 0], [0, 0.17, 0]], [[0.31, 0.18], [0.3, 0.17], [0.21, 0.13]], { seg: 16, per: 3 });                       // the shoulders, cut off straight at the base
  S.tube('main', [[0, 0.15, 0], [0, 0.3, 0]], [[0.09, 0.09], [0.08, 0.08]], { seg: 10, per: 2 });                                                 // the neck
  face(S, HF([0, 0.45, 0.05], 0.0, 0.0), { hair: 'wig', age: 0.3, seed: 3, scale: 1.4, skinKey: 'main', hairKey: 'main' });                        // the European, facing +z
  face(S, HF([0, 0.45, -0.05], 0.0, Math.PI), { hair: 'short', beard: 'full', age: 0.5, seed: 4, scale: 1.4, skinKey: 'main', hairKey: 'main' });  // the boyar, facing -z
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) for (const c of [0, 1]) S.blob('main', [s * (0.15 + c * 0.075), 0.52 - i * 0.07 - c * 0.02, 0.0], [0.05, 0.04, 0.12], { dir: [0, 0, 1], w: 8, h: 5 });   // the rolled curls of the wig: horizontal rolls
  S.tube('main', [[0, 0.52, 0], [0, 0.66, 0], [0, 0.86, 0], [0, 1.0, 0]], [[0.17, 0.15], [0.175, 0.155], [0.23, 0.17], [0.31, 0.19]], { seg: 16, per: 4, cap: true, capA: false });   // the tall flared relief hat
    for (const [x, y, z] of [[0.0, 0.78, 0.17], [0.13, 0.88, 0.17], [-0.13, 0.88, 0.17], [0.0, 0.92, 0.18], [0.0, 0.78, -0.17], [0.13, 0.88, -0.17], [-0.13, 0.88, -0.17], [0.2, 0.8, 0.1], [-0.2, 0.8, 0.1]]) S.blob('main', [x, y, z], [0.032, 0.065, 0.012], { w: 6, h: 5 });   // relief: domes of churches
}, 0.55);
const rus = mkPiece({ id: 'n14123598289', key: 'pp-rus', name: 'Русь-Европа', x: -1243, z: -2344, w: 0.95, h: 1.45, d: 0.85, variant: 0, rot: 0.6, col: '#8f7b6e', plate: 'ppRus', name2: 'nmRus', hh: 2.5, group: (P, M, y) => bz(P, M, janus(), 0, y, 0, 0, 1.0) });

// ---------------------------------------------------------------------------------------------------------------- Streltsy revolt
const woman = () => cached('lmpm-pp-woman2', () => extend(human({ detail: 0.32, body: { sex: 'f', muscle: 0.15 }, pose: { head: [0.12, 0, 0], legs: { L: { foot: [0.07, 0, 0] }, R: { foot: [-0.07, 0, 0] } }, arms: { R: { hand: [-0.25, 0.86, 0.12], pole: [-0.5, -0.4, -0.5], grip: 'relaxed' }, L: { hand: [0.1, 0.9, 0.3], pole: [0.4, -0.4, -0.2], grip: 'relaxed' } } },
  outfit: { torso: 'dress', sleeves: 'long', hem: 0.96, flare: 0.25, folds: 0.07, cape: 'back', capeLen: 0.95 }, face: { age: 0.4, hair: 'cap', seed: 5 } }), (S, info) => { const H = info.j.head; if (H) S.blob('main', V.add(V.add(H.c, V.mul(H.y, 0.02)), V.mul(H.z, -0.025)), [0.11, 0.13, 0.12], { dir: H.z, ref: H.x, w: 8, h: 6 }); }));
const boy = () => cached('lmpm-pp-boy2', () => human({ detail: 0.3, body: { sex: 'm', muscle: 0.1 }, pose: { head: [0.0, -0.1, 0], legs: { L: { foot: [0.06, 0, 0] }, R: { foot: [-0.06, 0, 0] } }, arms: { R: { hand: [-0.22, 0.8, 0.05], pole: [-0.5, -0.4, -0.5], grip: 'relaxed' }, L: { hand: [0.22, 0.8, 0.05], pole: [0.5, -0.4, -0.5], grip: 'relaxed' } } },
  outfit: { torso: 'coat', sleeves: 'long', trousers: 'long', boots: true, hem: 0.45, collar: 'none' }, face: { age: 0.0, hair: 'short', seed: 6 } }));
const streltsy = mkPiece({ id: 'n14123598292', key: 'pp-streltsy', name: 'Стрелецкий бунт', x: -1239, z: -2317, w: 1.05, h: 1.35, d: 0.95, variant: 1, rot: 0.2, col: '#a77c6c', plate: 'ppStreltsy', name2: 'nmStreltsy', hh: 2.6, group: (P, M, y) => {
  dk(P, M, BRD, -0.5, 0.5, y, y + 0.1, -0.34, 0.34);                                                                                              // the rectangular bronze base
  for (let i = 0; i < 3; i++) dk(P, M, BR, -0.46, -0.1, y + 0.1 + i * 0.12, y + 0.22 + i * 0.12, -0.3 + i * 0.0 - 0.0, 0.16 - i * 0.12);                // three steps, rising to the back
  dk(P, M, BRD, -0.46, -0.1, y + 0.1, y + 0.46, -0.3, -0.12);
  bz(P, M, woman(), -0.3, y + 0.46, -0.1, 0.1, 0.47); bz(P, M, boy(), -0.14, y + 0.34, 0.03, 0.2, 0.3);
  P.tint(BR);
  for (let i = 0; i < 6; i++) { const a = [0.05 + i * 0.1, y + 0.1, 0.28 - i * 0.04], b = [-0.12 + i * 0.05, y + 0.78 + (i % 2) * 0.1, -0.12]; P.cyl(M.vc, a, b, 0.012, 0.012, 5, false); P.box(M.vc, b[0] - 0.035, b[0] + 0.035, b[1] - 0.03, b[1] + 0.06, b[2] - 0.008, b[2] + 0.008, 'b'); }   // halberds and pikes
  for (let i = 0; i < 4; i++) { const x = 0.2 + i * 0.1, z = 0.18 + (i % 2) * 0.1; P.col(M.vc, x, z, y + 0.1, y + 0.2, 0.07, 0.055, 8, true); }  // the round caps
} });

// ---------------------------------------------------------------------------------------------------------------- Azov campaigns
const galley = () => sculpt('galley2', (S) => {
  S.tube('main', [[-0.45, 0.1, 0], [-0.25, 0.05, 0], [0.1, 0.05, 0], [0.45, 0.16, 0]], [[0.06, 0.07], [0.1, 0.13], [0.1, 0.13], [0.03, 0.04]], { seg: 10, per: 4, ref: [0, 1, 0] });   // the hull
  S.blob('main', [-0.42, 0.2, 0], [0.09, 0.12, 0.08], { w: 8, h: 6 });                                                                             // the high stern
  for (const [x, h] of [[-0.12, 0.8], [0.2, 0.7]]) { S.tube('main', [[x, 0.1, 0], [x, 0.4, 0], [x, h, 0]], [[0.014, 0.014], [0.01, 0.01], [0.007, 0.007]], { seg: 5, per: 4 }); for (let k = 0; k < 2; k++) S.blob('main', [x + 0.02, 0.62 * h / 0.8 - k * 0.22, 0], [0.012, 0.085, 0.11], { dir: [1, 0, 0.25], ref: [0, 0, 1], w: 7, h: 5 }); }    // masts and sails
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) S.tube('main', [[-0.3 + i * 0.1, 0.14, s * 0.1], [-0.3 + i * 0.1, 0.05, s * 0.26]], [[0.006, 0.006]], { seg: 4, per: 1 });       // the oars
  for (let i = 0; i < 6; i++) S.blob('dark', [-0.4 + i * 0.16, 0.0, 0.0], [0.1, 0.05, 0.19], { dir: [1, 0, 0.3], w: 7, h: 5 });                         // the wave under the hull
}, 0.5);
const fort = () => sculpt('azov-tower2', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.12, 0], [0, 0.3, 0], [0, 0.5, 0], [0, 0.58, 0]], [[0.24, 0.22], [0.17, 0.16], [0.13, 0.13], [0.115, 0.115], [0.14, 0.14]], { seg: 14, per: 3 });   // a tower growing out of the rock
  const hel = Array.from({ length: 14 }, (_, i) => { const t = i / 13, a = t * 9; return [Math.cos(a) * (0.17 - t * 0.05), 0.08 + t * 0.44, Math.sin(a) * (0.17 - t * 0.05)]; });
  S.tube('dark', hel, [[0.02, 0.02]], { seg: 5, per: 1 });                                                                                         // the serpent coiled round it
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832; S.blob('main', [Math.cos(a) * 0.13, 0.62, Math.sin(a) * 0.13], [0.035, 0.035, 0.035], { w: 6, h: 4 }); }     // the battlements
  S.blob('main', [0, 0.64, 0], [0.11, 0.05, 0.11], { w: 9, h: 5 });                                                                                // the dome of the top
}, 0.5);
const horseFig = () => cached('lmpm-pp-horse2', () => horse({ pose: 'rear', detail: 0.25 }));
const rider = () => sculpt('azov-rider', (S) => {
  S.tube('main', [[0, 0, 0], [0.0, 0.07, 0.0], [0.0, 0.13, 0.0]], [[0.032, 0.025], [0.034, 0.026], [0.03, 0.024]], { seg: 7, per: 2 });             // the torso
  S.blob('main', [0, 0.17, 0.0], [0.024, 0.027, 0.026], { w: 7, h: 5 });                                                                           // the head
  S.tube('main', [[0.025, 0.12, 0], [0.05, 0.18, 0.0], [0.06, 0.25, 0.0]], [[0.01, 0.01]], { seg: 5, per: 2 });                                      // the arm raised with the sword
  S.tube('dark', [[0.06, 0.24, 0], [0.065, 0.36, 0]], [[0.005, 0.005]], { seg: 4, per: 2 });
}, 0.5);
const azov = mkPiece({ id: 'n14123598291', key: 'pp-azov', name: 'Азовские походы', x: -1238, z: -2327, w: 1.15, h: 1.5, d: 1.0, variant: 2, rot: 0.5, col: '#b08876', plate: 'ppAzov', name2: 'nmAzov', hh: 2.6, group: (P, M, y) => {
  bz(P, M, galley(), -0.12, y, 0.12, 0.35, 0.95); bz(P, M, fort(), 0.17, y, -0.05, 0, 1.0);
  bz(P, M, horseFig(), 0.17, y + 0.67, -0.05, 0.4, 0.16); bz(P, M, rider(), 0.17, y + 0.84, -0.06, 0.4, 0.6);
} });

// ---------------------------------------------------------------------------------------------------------------- Exit to the sea
const seaShip = () => sculpt('sea-ship2', (S) => {
  S.tube('main', [[-0.42, 0.12, 0], [-0.1, 0.06, 0], [0.25, 0.08, 0], [0.45, 0.2, 0]], [[0.06, 0.08], [0.13, 0.16], [0.13, 0.15], [0.04, 0.06]], { seg: 10, per: 4, ref: [0, 1, 0] });   // the hull
  S.blob('main', [-0.4, 0.22, 0], [0.09, 0.13, 0.09], { w: 8, h: 6 });                                                                             // the stern castle
  for (const [x, h] of [[-0.2, 0.95], [0.04, 1.1], [0.27, 0.8]]) {
    S.tube('main', [[x, 0.1, 0], [x, 0.5, 0], [x, h, 0]], [[0.014, 0.014], [0.01, 0.01], [0.007, 0.007]], { seg: 5, per: 4 });
    for (const [k, w] of [[0.62, 0.17], [0.38, 0.19]]) S.blob('main', [x + 0.03, h * k, 0.0], [w * 0.8, 0.1, 0.014], { dir: [1, 0, 0.3], ref: [0, 0, 1], w: 8, h: 6 });    // the square sails (no pennants)
  }
  S.tube('main', [[0.45, 0.2, 0], [0.62, 0.3, 0]], [[0.016, 0.016], [0.01, 0.01]], { seg: 5, per: 2 });                                              // the bowsprit
}, 0.5);
const waveBase = () => sculpt('sea-wave', (S) => {
  for (let i = 0; i < 9; i++) S.blob('main', [-0.5 + i * 0.125, 0.02 + (i % 2) * 0.03, (i % 3 - 1) * 0.06], [0.14, 0.07, 0.24], { dir: [1, 0.3, 0.3], w: 7, h: 5 });
  S.blob('main', [-0.45, 0.1, 0.08], [0.1, 0.12, 0.12], { dir: [0.4, 1, 0.2], w: 7, h: 5 });                                                         // a curling crest
}, 0.5);
const sea = mkPiece({ id: 'n14123598288', key: 'pp-sea', name: 'Выход к морю', x: -1239, z: -2338, w: 1.3, h: 1.15, d: 1.1, variant: 0, rot: 1.0, col: '#8d7a70', plate: 'ppSea', name2: 'nmSea', hh: 2.5, group: (P, M, y) => {
  bz(P, M, waveBase(), 0.05, y, 0, 0, 1.2); bz(P, M, seaShip(), 0.12, y + 0.06, -0.12, 0.9, 1.0);
  // the tall relief column: churches, domes and waves cast on its faces, a torn top edge
  const cx = -0.3, cz = 0.22;
  taper(P, M, BR, 0.14, 0.085, 0.11, 0.07, y + 0.02, y + 1.0, cx, cz);
  dk(P, M, '#2c3a33', cx - 0.14, cx + 0.14, y + 0.02, y + 0.12, cz - 0.05, cz + 0.115);
  P.tint(BR); for (const [dx, yy] of [[-0.075, 0.2], [0.07, 0.2], [0, 0.3], [-0.06, 0.42], [0.07, 0.38]]) { P.col(M.vc, cx + dx, cz + 0.095, y + yy, y + yy + 0.1, 0.035, 0.03, 7, true); P.col(M.vc, cx + dx, cz + 0.095, y + yy + 0.1, y + yy + 0.16, 0.03, 0.0, 7, true); }   // onion domes
  P.tint(BRD); for (let r = 0; r < 4; r++) for (const dx of [-0.06, 0, 0.06]) if ((r + (dx > 0 ? 1 : 0)) % 3 !== 2) P.box(M.vc, cx + dx - 0.015, cx + dx + 0.015, y + 0.5 + r * 0.11, y + 0.56 + r * 0.11, cz + 0.07, cz + 0.09 - r * 0.003, 'b');   // arched windows of the reliefs
  P.tint(BR); P.quad(M.vc, [cx - 0.11, y + 1.0, cz + 0.07], [cx + 0.02, y + 1.0, cz + 0.07], [cx + 0.06, y + 1.12, cz + 0.06], [cx - 0.1, y + 1.06, cz + 0.06], [0, 0.3, 1], null);   // the torn top edge
} });

// ---------------------------------------------------------------------------------------------------------------- Transfer of knowledge
const armillary = () => sculpt('armillary', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.03, 0]], [[0.075, 0.075], [0.05, 0.05]], { seg: 10, per: 1 });
  S.tube('main', [[0, 0.03, 0], [0, 0.12, 0], [0, 0.17, 0]], [[0.03, 0.03], [0.015, 0.015], [0.025, 0.025]], { seg: 8, per: 3 });
  for (const [r, ro, tilt] of [[0.15, 0, 0], [0.15, 1.05, 0.4], [0.15, 2.1, 0.4], [0.12, 0, 1.57]]) S.tube('main', Array.from({ length: 14 }, (_, i) => { const t = i / 14 * 6.2832, x = Math.cos(t) * r, y = Math.sin(t) * r, z = 0; const c = Math.cos(ro), s = Math.sin(ro), xx = x * c - z * s, zz = x * s + z * c, ct = Math.cos(tilt), st = Math.sin(tilt); return [xx, 0.34 + y * ct - zz * st, y * st + zz * ct]; }), [[0.008, 0.008]], { closed: true, seg: 5, rings: 20 });
  S.tube('main', [[0, 0.17, 0], [0, 0.34, 0], [0.0, 0.52, 0]], [[0.006, 0.006]], { seg: 4, per: 3 });
}, 0.5);

const know = mkPiece({ id: 'n14123598293', key: 'pp-know', name: 'Перенос знаний', x: -1255, z: -2327, w: 1.5, h: 1.0, d: 1.05, variant: 1, rot: 0.5, col: '#9b6e60', plate: 'ppKnow', name2: 'nmKnow', hh: 2.0, group: (P, M, y) => {
  dk(P, M, BRD, -0.58, 0.58, y, y + 0.035, -0.34, 0.34);                                                                                          // the sheet of the map
  dk(P, M, BR, -0.46, 0.46, y + 0.035, y + 0.05, -0.28, 0.3);
  P.tint(BR); P.cyl(M.vc, [-0.62, y + 0.06, -0.3], [-0.62, y + 0.06, 0.36], 0.06, 0.06, 9, true); P.cyl(M.vc, [0.62, y + 0.06, -0.3], [0.62, y + 0.06, 0.36], 0.05, 0.05, 9, true);   // the rolled ends
  P.tint(BRD); P.cyl(M.vc, [-0.62, y + 0.06, 0.361], [-0.62, y + 0.06, 0.37], 0.035, 0.035, 8, true);
  P.push(0.2, y + 0.05, 0.17, -0.25); dk(P, M, BR, -0.2, 0.2, 0, 0.07, -0.13, 0.13); dk(P, M, BRD, -0.2, 0.2, 0.012, 0.058, 0.13, 0.145); P.push(0.02, 0.07, 0, 0.15); dk(P, M, BR, -0.18, 0.18, 0, 0.06, -0.12, 0.12); P.pop(); P.pop();   // the two big books
  // the tower of the Kunstkamera: three octagonal tiers with arched windows, a dome, a lantern and the spire
  P.push(0.02, y, -0.1, 0.3927);
  P.tint(BR); prism(P, M.vc, ngon(0.19, 8, 0), 0.05, 0.3); prism(P, M.vc, ngon(0.145, 8, 0), 0.3, 0.5); prism(P, M.vc, ngon(0.108, 8, 0), 0.5, 0.64);
  P.tint(BRD); for (const [r, y0, y1] of [[0.19, 0.13, 0.27], [0.145, 0.34, 0.47], [0.108, 0.53, 0.61]]) for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832, px = Math.cos(a) * r * 0.99, pz = Math.sin(a) * r * 0.99; if (pz < -0.01 && k !== 5) continue; P.push(px, 0, pz, -a + Math.PI / 2); P.box(M.vc, -0.022, 0.022, y0, y1, 0, 0.012, 'b'); P.pop(); }
  P.tint(BR); P.col(M.vc, 0, 0, 0.64, 0.7, 0.1, 0.085, 12, true); P.col(M.vc, 0, 0, 0.7, 0.8, 0.07, 0.035, 12, true); P.col(M.vc, 0, 0, 0.8, 0.98, 0.016, 0.003, 6, false);
  P.pop();
  bz(P, M, armillary(), -0.42, y + 0.05, 0.02, 0.4, 1.0);                                                                                          // the armillary sphere on its stand
  P.tint(BR); P.col(M.vc, 0.45, -0.05, y + 0.05, y + 0.075, 0.075, 0.075, 10, true); P.col(M.vc, 0.45, -0.05, y + 0.51, y + 0.54, 0.08, 0.08, 10, true);    // the hourglass: bases, posts and two glass bulbs
  for (let k = 0; k < 3; k++) { const a = k / 3 * 6.2832; P.col(M.vc, 0.45 + Math.cos(a) * 0.06, -0.05 + Math.sin(a) * 0.06, y + 0.075, y + 0.51, 0.012, 0.012, 6, false); }
  P.tint(BRG); P.col(M.vc, 0.45, -0.05, y + 0.1, y + 0.28, 0.055, 0.015, 10, true); P.col(M.vc, 0.45, -0.05, y + 0.28, y + 0.47, 0.015, 0.055, 10, true);
  P.tint(BRD); P.cyl(M.vc, [-0.2, y + 0.05, 0.34], [-0.2, y + 0.0, 0.43], 0.0, 0.03, 6, true);                                                      // the plumb bob hanging over the edge
  P.tint(BR); P.cyl(M.vc, [-0.05, y + 0.085, 0.3], [0.1, y + 0.2, 0.18], 0.006, 0.01, 4, false);                                                    // the quill
} });

// ---------------------------------------------------------------------------------------------------------------- Found his home
const peter = () => sculpt('home-peter', (S) => {
  S.blob('main', [0, 0.12, 0], [0.04, 0.06, 0.03], { w: 7, h: 5 }); S.blob('main', [0, 0.2, 0], [0.025, 0.028, 0.027], { w: 7, h: 5 });
  S.tube('main', [[0, 0.06, 0.02], [0.06, 0.08, 0.06], [0.08, 0.02, 0.1]], [[0.016, 0.016]], { seg: 5, per: 2 });
  S.tube('main', [[0.02, 0.15, 0.02], [0.06, 0.18, 0.06], [0.08, 0.22, 0.05]], [[0.01, 0.01]], { seg: 5, per: 2 });
}, 0.5);
const catherine = () => sculpt('home-kat', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.1, 0], [0, 0.2, 0]], [[0.075, 0.07], [0.04, 0.035], [0.028, 0.025]], { seg: 8, per: 3 });
  S.blob('main', [0, 0.25, 0], [0.026, 0.03, 0.028], { w: 7, h: 5 }); S.blob('main', [0, 0.285, -0.004], [0.032, 0.022, 0.03], { w: 7, h: 5 });
}, 0.5);
const home = mkPiece({ id: 'n14123598294', key: 'pp-home', name: 'Обрел свой дом', x: -1271, z: -2322, w: 1.25, h: 0.98, d: 0.95, variant: 2, rot: 2.0, col: '#9c6a5e', plate: 'ppHome', name2: 'nmHome', hh: 1.9, group: (P, M, y) => {
  const W = 0.31, D = 0.25, H = 0.46;
  dk(P, M, BRD, -W - 0.04, W + 0.04, y, y + 0.04, -D - 0.04, D + 0.04);                                                                            // the plinth of the model
  dk(P, M, BR, -W, W, y + 0.04, y + H, -D, D);                                                                                                       // the house
  const ry = y + H; P.tint('#3c4a42');                                                                                                               // the hipped roof, tiled
  P.quad(M.vc, [-W - 0.04, ry, D + 0.04], [W + 0.04, ry, D + 0.04], [0.2, ry + 0.2, 0.12], [-0.2, ry + 0.2, 0.12], [0, 0.5, 1], null); P.quad(M.vc, [W + 0.04, ry, -D - 0.04], [-W - 0.04, ry, -D - 0.04], [-0.2, ry + 0.2, -0.12], [0.2, ry + 0.2, -0.12], [0, 0.5, -1], null);
  P.quad(M.vc, [-W - 0.04, ry, -D - 0.04], [-W - 0.04, ry, D + 0.04], [-0.2, ry + 0.2, 0.12], [-0.2, ry + 0.2, -0.12], [-1, 0.5, 0], null); P.quad(M.vc, [W + 0.04, ry, D + 0.04], [W + 0.04, ry, -D - 0.04], [0.2, ry + 0.2, -0.12], [0.2, ry + 0.2, 0.12], [1, 0.5, 0], null);
  P.tint(BR); P.box(M.vc, -0.2, 0.2, ry + 0.2, ry + 0.23, -0.12, 0.12, 'b');                                                                       // the ridge
  P.box(M.vc, -0.11, 0.11, ry - 0.02, ry + 0.07, D - 0.01, D + 0.05, 'b');                                                                          // the central frontispiece with
  P.tint(BR); P.quad(M.vc, [-0.13, ry + 0.06, D + 0.05], [0.13, ry + 0.06, D + 0.05], [0, ry + 0.17, D + 0.03], [0, ry + 0.17, D + 0.03], [0, 0.2, 1], null);       // the pediment (a triangle)
  P.tint(BRD); P.fan(M.vc, [[-0.12, ry + 0.07, D + 0.053], [0.12, ry + 0.07, D + 0.053], [0, ry + 0.16, D + 0.053]], [0, 0, 1]);
  P.tint(BR); P.fan(M.vc, [[0.0, ry + 0.095, D + 0.056], [0.03, ry + 0.07, D + 0.056], [-0.03, ry + 0.07, D + 0.056]], [0, 0, 1]);
  // pilasters at the corners and beside the niche
  for (const px of [-W + 0.01, -0.145, 0.145, W - 0.01]) dk(P, M, BR, px - 0.022, px + 0.022, y + 0.04, y + H, D - 0.01, D + 0.035);
  // the arched niche: a dark inset with a semicircular head, curtain on the left
  P.tint('#26302b'); P.fan(M.vc, [[-0.12, y + 0.06, D + 0.012], [0.12, y + 0.06, D + 0.012], [0.12, y + 0.27, D + 0.012], ...Array.from({ length: 9 }, (_, i) => { const a = i / 8 * Math.PI; return [Math.cos(a) * 0.12, y + 0.27 + Math.sin(a) * 0.1, D + 0.012]; }).slice(1, 8), [-0.12, y + 0.27, D + 0.012]], [0, 0, 1]);
  P.tint(BRG); P.box(M.vc, -0.12, -0.075, y + 0.06, y + 0.34, D + 0.012, D + 0.03, 'b');                                                             // the curtain
  P.tint(BRD); for (const s of [-1, 1]) for (let r = 0; r < 2; r++) { P.box(M.vc, s * 0.235 - 0.03, s * 0.235 + 0.03, y + 0.09 + r * 0.17, y + 0.22 + r * 0.17, D + 0.002, D + 0.018, 'b'); }   // the window panels at the sides
  P.tint(BRG); for (const s of [-1, 1]) for (let r = 0; r < 2; r++) P.box(M.vc, s * 0.235 - 0.022, s * 0.235 + 0.022, y + 0.1 + r * 0.17, y + 0.2 + r * 0.17, D + 0.017, D + 0.02, 'b');
  bz(P, M, peter(), -0.04, y + 0.08, D + 0.03, 0.3, 0.75); bz(P, M, catherine(), 0.07, y + 0.07, D + 0.03, -0.2, 0.75);
  P.tint(BR); ball(P, M.vc, [0.0, y + 0.075, D + 0.045], [0.05, 0.018, 0.022], { w: 7, h: 5 });                                                         // the dog at their feet
  // the angels with trumpets and the crown on the ridge
  P.tint(BR); for (const s of [-1, 1]) { P.cyl(M.vc, [s * 0.1, ry + 0.2, 0.02], [s * 0.17, ry + 0.26, 0.04], 0.022, 0.03, 6, true); P.cyl(M.vc, [s * 0.15, ry + 0.27, 0.04], [s * 0.2, ry + 0.38, 0.12], 0.006, 0.014, 4, false); P.quad(M.vc, [s * 0.1, ry + 0.24, 0.02], [s * 0.22, ry + 0.32, -0.02], [s * 0.2, ry + 0.22, -0.05], [s * 0.08, ry + 0.2, -0.02], [0, 1, 0], null); }
  P.col(M.vc, 0, 0, ry + 0.23, ry + 0.3, 0.03, 0.02, 8, true); ball(P, M.vc, [0, ry + 0.32, 0], [0.025, 0.02, 0.025], { w: 7, h: 5 });                          // the crown
} });

// ---------------------------------------------------------------------------------------------------------------- Paradise
const angelFig = () => sculpt('par-angel', (S) => {
  S.tube('main', [[0, 0, 0], [0, 0.05, 0], [0, 0.1, 0]], [[0.012, 0.01], [0.014, 0.011], [0.01, 0.009]], { seg: 6, per: 2 });
  S.blob('main', [0, 0.12, 0], [0.01, 0.012, 0.01], { w: 6, h: 4 });
  for (const s of [-1, 1]) S.blob('main', [s * 0.025, 0.08, -0.005], [0.01, 0.045, 0.004], { dir: [s * 0.4, 1, 0], w: 6, h: 4 });
}, 0.4);
const paradise = mkPiece({ id: 'n14123598295', key: 'pp-paradise', name: 'Парадиз', x: -1287, z: -2316, w: 1.2, h: 1.5, d: 1.0, variant: 0, rot: 2.6, col: '#a8736a', plate: 'ppParadise', name2: 'nmParadise', hh: 2.8, group: (P, M, y) => {
  P.tint(BRD); P.box(M.vc, -0.5, 0.5, y, y + 0.03, -0.3, 0.3, 'b');                                                                                  // the map sheet
  P.tint(BR); P.cyl(M.vc, [-0.52, y + 0.07, -0.3], [-0.52, y + 0.07, 0.34], 0.055, 0.055, 9, true); P.cyl(M.vc, [0.54, y + 0.075, -0.3], [0.54, y + 0.075, 0.34], 0.055, 0.055, 9, true);
  const hh = sculpt('par-hand2', (S) => { S.tube('main', [[0, -0.08, -0.36], [0, 0.0, -0.22], [0, 0.1, -0.07]], [[0.05, 0.04], [0.045, 0.035], [0.04, 0.03]], { seg: 9, per: 3 }); hand(S, 1, [0, 0.11, -0.05], [0, 0.1, 1], [0, 1, 0.1], 'open', { key: 'main', scale: 1.9 }); }, 0.55);
  bz(P, M, hh, -0.12, y + 0.17, 0.0, 0.25, 1.1); bz(P, M, hh, 0.16, y + 0.17, 0.0, -0.25, 1.1);                                                       // the two open hands, palms up
  // the model of the Peter and Paul Cathedral: a nave with a small dome, the bell tower of three tiers and the tall spire with the angel (resting on the palms)
  P.push(0, -0.1, -0.02, 0);
  P.tint(BR); P.box(M.vc, -0.22, 0.2, y + 0.34, y + 0.46, -0.1, 0.06, 'b');
  P.quad(M.vc, [-0.24, y + 0.46, 0.08], [0.22, y + 0.46, 0.08], [0.18, y + 0.54, 0.0], [-0.2, y + 0.54, 0.0], [0, 1, 1], null); P.quad(M.vc, [0.22, y + 0.46, -0.12], [-0.24, y + 0.46, -0.12], [-0.2, y + 0.54, -0.04], [0.18, y + 0.54, -0.04], [0, 1, -1], null);
  P.col(M.vc, -0.12, -0.02, y + 0.54, y + 0.6, 0.045, 0.04, 8, true); ball(P, M.vc, [-0.12, y + 0.6, -0.02], [0.045, 0.03, 0.045], { w: 8, h: 5 });
  P.col(M.vc, 0.1, -0.02, y + 0.34, y + 0.62, 0.075, 0.07, 8, false);
  P.tint(BR); P.box(M.vc, 0.0, 0.24, y + 0.34, y + 0.54, -0.1, 0.07, 'b'); P.box(M.vc, 0.03, 0.21, y + 0.54, y + 0.72, -0.08, 0.05, 'b'); P.box(M.vc, 0.06, 0.18, y + 0.72, y + 0.86, -0.06, 0.03, 'b');
  P.tint(BRD); for (let k = 0; k < 3; k++) for (const dx of [0.09, 0.15]) P.box(M.vc, dx - 0.012, dx + 0.012, y + 0.4 + k * 0.17, y + 0.5 + k * 0.17, 0.07 - k * 0.02, 0.078 - k * 0.02, 'b');
  P.tint(BR); P.col(M.vc, 0.12, -0.015, y + 0.86, y + 0.92, 0.05, 0.03, 8, true); P.col(M.vc, 0.12, -0.015, y + 0.92, y + 1.5, 0.013, 0.004, 6, false);
  bz(P, M, angelFig(), 0.12, y + 1.5, -0.015, 0, 1.4);
  P.pop();
} });

export const PIECES = [rus, streltsy, azov, sea, know, home, paradise];
