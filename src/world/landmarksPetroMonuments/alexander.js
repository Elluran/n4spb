// landmarksPetroMonuments/alexander.js - Alexander Park: three bronze figures of the 1972 set (the identities of the OSM nodes are a GUESS [?], the dossier south section AP: "Утро" (the girl tying a scarf), "Художница" (the drawing girl),
// "Девушка с голубем", "Молодость" (the couple)) built from the photos alexpark/03-06, the cast lion of the cafe "Алые паруса" (lion_cafe/09-12) and the flower clock before the Music Hall (flowerclock/01-06; a gift of Switzerland,
// 2003): a grass mound with an elliptical bed of dark red foliage, silver numerals, two flat copper hands.  The maze (w530129977) is NOT claimed: the hedge ways of the maze are drawn by the environment (docs).
import { human, extend, lion, V, cached } from '../lib/figures.js';
import { put3, block, taper, steps, lathe, ring, sculpt, boulder, PAL, plateOn } from './sty.js';
import * as THREE from 'three';

const mk = (id, key, name, x, z, h, build, extra = {}) => ({ id, key, name, x, z, yaw: 'auto', h, rad: 1.0, lod: [340, 0], spot: 5, ...extra, build });
const place = (P, M, fig, x, y, z, rot = 0, s = 1) => put3(P, fig, M.bronzeMono, x, y, z, rot, s);
const girl = (o) => human({ detail: 0.4, body: { sex: 'f', muscle: 0.15 }, outfit: { torso: 'dress', sleeves: 'none', hem: 0.42, flare: 0.1, folds: 0.05, collar: 'none', ...(o.outfit || {}) }, face: { age: 0.15, hair: 'short', seed: 131, ...(o.face || {}) }, pose: o.pose });

// ---- "Утро": a slim girl in a short plain dress, barefoot, feet together, both elbows up and out, both hands at the head tying a kerchief; pink granite cube 0.5 x 0.5 x 0.55 [V alexpark/04]
const morning = () => cached('lmpm-ap-morning', () => extend(girl({ pose: { head: [0.0, 0.0, 0.0], legs: { L: { foot: [0.05, 0, 0.0] }, R: { foot: [-0.05, 0, 0.0] } }, arms: { R: { hand: [-0.1, 1.5, 0.08], pole: [-1, 0.2, -0.2], grip: 'relaxed' }, L: { hand: [0.1, 1.5, 0.08], pole: [1, 0.2, -0.2], grip: 'relaxed' } } } }),
  (S, info) => { const H = info.j.head; if (H) S.blob('main', V.add(V.add(H.c, V.mul(H.y, 0.045)), V.mul(H.z, -0.012)), [0.108, 0.082, 0.118], { dir: H.z, ref: H.x, w: 9, h: 6 }); }));
const apMorning = mk('n4350028791', 'ap-morning', 'Скульптура «Утро» (Александровский парк)', -1664, -2446, 2.4, (P, M) => {
  block(P, M, '#c58f86', 0.25, 0.25, 0, 0.55); P.tint('#2f332f'); P.box(M.vc, -0.3, 0.3, 0.55, 0.6, -0.3, 0.3, 'b');
  place(P, M, morning(), 0, 0.6, 0, 0, 1.03);
}, { rad: 0.5, solid: [{ w: 0.55, d: 0.55, h: 0.6 }, { r: 0.25, h: 1.8, y0: 0.6 }] });

// ---- "Художница": a girl crouching on a rough flat boulder slab, both knees drawn up, a high pony tail, a short dress, bending over an open sketch book and drawing with the right hand; the figure only ~0.55 m above the slab [V alexpark/05]
const drawing = () => cached('lmpm-ap-drawing', () => extend(girl({ outfit: { hem: 0.3 }, face: { hair: 'cap', seed: 133 }, pose: { pelvis: [0.0, 0.3, -0.05], spine: [0.55, 0.0, 0.0], head: [0.35, -0.2, 0.0], legs: { L: { foot: [0.09, 0, 0.22], pole: [0, 1, 0.4] }, R: { foot: [-0.09, 0, 0.2], pole: [0, 1, 0.4] } }, arms: { R: { hand: [-0.2, 0.1, 0.56], pole: [-0.6, 0.0, 0.4], grip: 'point' }, L: { hand: [0.14, 0.36, 0.34], pole: [0.6, 0.2, 0.2], grip: 'relaxed' } } } }),
  (S, info) => { const H = info.j.head; if (H) S.blob('main', V.add(V.add(H.c, V.mul(H.y, 0.09)), V.mul(H.z, -0.1)), [0.04, 0.04, 0.04], { w: 6, h: 5 }); S.blob('dark', [-0.2, 0.06, 0.56], [0.12, 0.012, 0.09], { dir: [0, 0.2, 1], w: 7, h: 4 }); }));
const apDrawing = mk('n9833556017', 'ap-drawing', 'Скульптура «Художница» (Александровский парк)', -1634, -2431, 1.2, (P, M) => {
  const r = boulder(P, M, 0, 0, 0, 0, 1.7, 0.3, '#8a867d', 0.5, 1.0);
  P.tint('#3c3d37'); P.box(M.vc, -0.4, 0.4, r.top, r.top + 0.06, -0.35, 0.35, 'b');
  place(P, M, drawing(), 0.0, r.top + 0.06, 0, 0, 0.92);
}, { rad: 1.1, solid: [{ w: 1.7, d: 0.9, h: 0.5 }] });

// ---- "Девушка с голубем" (V. Stamov): a slim girl in a short close dress standing straight, both arms raised above the head carrying a small dove, face up; on a tall pink round-cornered granite column 0.45 x 1.4 m [V alexpark/03]
const dove = () => cached('lmpm-ap-dove', () => extend(girl({ outfit: { hem: 0.45 }, face: { hair: 'long', seed: 135 }, pose: { head: [-0.25, 0.2, 0.0], legs: { L: { foot: [0.06, 0, 0.0] }, R: { foot: [-0.06, 0, 0.0] } }, arms: { R: { hand: [-0.06, 1.96, 0.1], pole: [-1, 0.4, -0.2], grip: 'cup', palm: [0, 1, 0] }, L: { hand: [0.06, 1.96, 0.1], pole: [1, 0.4, -0.2], grip: 'cup', palm: [0, 1, 0] } } } }),
  (S, info) => { S.blob('main', [0, 2.03, 0.1], [0.07, 0.05, 0.09], { w: 7, h: 5 }); S.blob('main', [0, 2.05, 0.1], [0.14, 0.012, 0.05], { w: 7, h: 4 }); }));
const apDove = mk('n4782577266', 'ap-dove', 'Скульптура «Девушка с голубем» (Александровский парк)', -1788, -2508, 3.6, (P, M) => {
  P.tint('#b9786c'); lathe(P, M.vc, [[0.24, 0.0], [0.24, 1.4]], 12, { caps: true }); P.tint('#2f332f'); P.box(M.vc, -0.3, 0.3, 1.4, 1.46, -0.3, 0.3, 'b');
  place(P, M, dove(), 0, 1.46, 0, 0, 1.12);
}, { rad: 0.5, solid: [{ r: 0.3, h: 3.4 }] });

// ---- "Молодость" (N. Kochukov): two figures on one low pale grey base 1.3 x 0.7 x 0.65 with a thin step: a tall bare-chested young man in trousers, his right hand on the girl's shoulder, and a girl in a short sleeveless dress, a little lower, her head leaning to him [V alexpark/06]
const youthMan = () => cached('lmpm-ap-youth-m', () => human({ detail: 0.38, body: { sex: 'm', muscle: 0.55 }, pose: { head: [0.05, 0.25, 0.04], legs: { L: { foot: [0.1, 0, 0.0], yaw: 0.2 }, R: { foot: [-0.1, 0, 0.0], yaw: -0.2 } }, arms: { R: { hand: [-0.34, 1.12, 0.08], pole: [-0.6, 0.2, -0.5], grip: 'relaxed' }, L: { hand: [0.26, 0.8, 0.0], pole: [0.6, -0.3, -0.8], grip: 'relaxed' } } }, outfit: { torso: 'nude', trousers: 'long', boots: false }, face: { age: 0.15, hair: 'short', seed: 137 } }));
const youthGirl = () => cached('lmpm-ap-youth-f', () => girl({ outfit: { hem: 0.4 }, face: { hair: 'cap', seed: 139 }, pose: { head: [0.0, -0.35, 0.12], legs: { L: { foot: [0.07, 0, 0.0] }, R: { foot: [-0.07, 0, 0.0] } }, arms: { R: { hand: [-0.2, 0.9, 0.1], pole: [-0.5, -0.2, -0.6], grip: 'relaxed' }, L: { hand: [0.2, 0.9, 0.1], pole: [0.5, -0.2, -0.6], grip: 'relaxed' } } } }));
const apYouth = mk('n9833556021', 'ap-youth', 'Скульптура «Молодость» (Александровский парк)', -1700, -2500, 2.7, (P, M) => {
  block(P, M, '#a7a6a0', 0.65, 0.35, 0, 0.6); P.tint('#2f332f'); P.box(M.vc, -0.6, 0.6, 0.6, 0.65, -0.3, 0.3, 'b');
  place(P, M, youthMan(), 0.28, 0.65, 0, 0, 1.12); place(P, M, youthGirl(), -0.3, 0.65, 0.02, 0.15, 1.04);
}, { rad: 0.9, solid: [{ w: 1.35, d: 0.75, h: 0.65 }, { w: 0.9, d: 0.5, h: 2.7, y0: 0.65 }] });

// ---- the cafe lion ("Алые паруса"): a dark grey cast lion 1.6 m long, 1.1 m high, walking, the head turned slightly to the left, a full mane, the tail down, on a rectangular dark grey block 1.8 x 0.7 x 0.3 [V lion_cafe/09-12]
const cafeLion = () => cached('lmpm-ap-lion', () => lion({ pose: 'walk', head: { turn: 0.25, pitch: 0.1, open: 0.0 }, detail: 0.5, mane: 1.3, maneCount: 60, fullMane: true, headScale: 1.35, tail: 'down' }));
const apLion = mk('n8514860399', 'ap-lion', 'Лев у кафе «Алые паруса»', -1671, -2311, 1.8, (P, M) => {
  block(P, M, '#3b3d40', 0.9, 0.36, 0, 0.3); P.tint('#303235'); P.box(M.vc, -0.95, 0.95, 0.26, 0.3, -0.4, 0.4, 'b');
  const fig = cafeLion(); for (const [k, g] of Object.entries(fig.geos)) { P.tint(k === 'dark' ? '#121315' : '#2e3033'); P.geo(M.vc, g, 0, 0.3, 0, 0, Math.PI / 2, 0, 0.95, 0.95, 0.95); }
}, { rad: 1.0, solid: [{ w: 1.9, d: 0.8, h: 1.3 }] });

// ---- the flower clock: a smooth grass mound (a lens ~8.6 x 6.6 m rising ~0.95 m) with an elliptical bed of dark red foliage, silver-white numerals 1..12 and a pale rim ring, two large copper-brown flat hands pointing to 10:10 on a brass hub; the sign "По газонам не ходить" [V flowerclock/01-06]
const hemi = () => cached('lmpm-hemi', () => new THREE.SphereGeometry(1, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2));
// the bed: an ellipse (3.5 x 2.7 m) that FOLLOWS the mound surface (polar grid of 6 rings x 40 segments, uv 0..1 over the ellipse), 2 cm above it
const bedGeo = () => cached('lmpm-clockbed', () => {
  const RG = 6, SG = 40, A = 4.3, B = 3.3, H = 0.95, pos = [], uv = [], nrm = [], idx = [];
  const h = (x, z) => H * Math.sqrt(Math.max(0.0, 1 - (x / A) * (x / A) - (z / B) * (z / B)));
  for (let r = 0; r <= RG; r++) for (let k = 0; k < SG; k++) { const t = k / SG * 6.2832, rr = r / RG, x = Math.cos(t) * 3.5 * rr, z = Math.sin(t) * 2.7 * rr; pos.push(x, h(x, z) + 0.025, z); uv.push(0.5 + Math.cos(t) * 0.5 * rr, 0.5 - Math.sin(t) * 0.5 * rr); nrm.push(0, 1, 0); }
  for (let r = 0; r < RG; r++) for (let k = 0; k < SG; k++) { const a = r * SG + k, b = r * SG + (k + 1) % SG, c = (r + 1) * SG + k, d = (r + 1) * SG + (k + 1) % SG; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
});
const clock = mk('n339816775', 'clock', 'Цветочные часы', -2313, -2592, 1.6, (P, M, K) => {
  P.tint('#4f8a3c'); P.geo(M.vc, hemi(), 0, 0, 0, 0, 0, 0, 4.3, 0.95, 3.3);
  P.geo(M.clock, bedGeo(), 0, 0, 0);
  // the hands: two flat copper plates (diamond-tipped) lying on the bed, hour hand 2.2 m to 10, minute hand 3.0 m to 2
  const hand = (len, wid, ang) => { const ca = Math.cos(ang), sa = Math.sin(ang), pt = (u, v) => [ca * u - sa * v, 1.0, sa * u + ca * v]; P.fan(M.copper, [pt(-0.35, 0), pt(0.0, wid), pt(len * 0.72, wid * 0.8), pt(len, 0), pt(len * 0.72, -wid * 0.8), pt(0.0, -wid)], [0, 1, 0], (p) => [p[0] / 3, p[2] / 3]); };
  hand(2.2, 0.17, -2.62); hand(3.0, 0.14, -0.52);
  P.cyl(M.copper, [0, 0.98, 0], [0, 1.1, 0], 0.18, 0.12, 12, true);
  plateOn(P, M, K, 'lawn', 0.5, 0.23, 4.0, 0.3, 0.8, 0.3);
}, { rad: 4.5, lod: [420, 0], solid: [{ w: 8.0, d: 6.0, h: 1.0 }], spot: 8 });

export const PIECES = [apMorning, apDrawing, apDove, apYouth, apLion, clock];
