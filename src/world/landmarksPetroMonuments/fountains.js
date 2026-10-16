// landmarksPetroMonuments/fountains.js - the fountains of Petrogradsky Island that no one else draws: "Swan Lake" (Witte garden, 2003), "Sun" (Yubileyny, 2004), the Nakhimov school fountain (a sunk square bowl with 28 chain bollards),
// the Lidval house garden fountain, the cafe garden fountain with three bronze maidens, the One Trinity Place splash pad (a flush pool with 28 low jets).  (The Skripka-Zhenshchina ring fountain is in violins.js.)
// Basins: dark / grey granite kerbs (solid for the walker: nobody wades), water = the module water material (a ripple texture scrolled by the shared uTime in the fragment shader), jets = STATIC alpha strips whose texture scrolls
// downward with the same clock (no update callbacks, no sounds).  Photos: fount_swan/01-04, fount_sun/01, fount_nakh/01-02 + nakhimov/04, fount_lidval/01-04, lion_cafe/02-05, otp2 / fnt_trin.  Heights of jets [E] from the photos (lower than the text claims).
import { human, extend, V, cached } from '../lib/figures.js';
import { put3, block, ring, lathe, steps, prism, ngon, bollard, chain, PAL, plateOn, sculpt } from './sty.js';

const mk = (id, key, name, x, z, h, build, extra = {}) => ({ id, key, name, x, z, yaw: 'auto', h, rad: 3, lod: [420, 0], spot: 6, ...extra, build });

/** a jet: a thin double-sided strip from (x, y0, z) leaning to (x2, y1, z2), width w (the alpha texture scrolls downward) */
function jet(P, M, x, y0, z, x2, y1, z2, w = 0.1, face = 0) {
  const c = Math.cos(face), s = Math.sin(face);
  P.quad(M.jet, [x - c * w / 2, y0, z + s * w / 2], [x + c * w / 2, y0, z - s * w / 2], [x2 + c * w / 3, y1, z2 - s * w / 3], [x2 - c * w / 3, y1, z2 + s * w / 3], [s, 0, c], [[0, 0], [1, 0], [1, 1], [0, 1]]);
}
/** a disc of water (fan) at height y */
function water(P, M, r, y, seg = 28, cx = 0, cz = 0) { P.fan(M.water, Array.from({ length: seg }, (_, i) => [cx + Math.cos(i / seg * 6.2832) * r, y, cz + Math.sin(i / seg * 6.2832) * r]), [0, 1, 0], (p) => [p[0] / 3, p[2] / 3]); }

// ---- Swan Lake: a low round bowl of dark polished granite (5 m, rim 0.4 m) in a round paved apron of red-brown setts (~11 m) with a grey granite curb ring; in the middle nine granite columns of different diameter and height
// (white, grey, black; 0.6-1.4 m) from which nine thin jets rise 1-2 m like swan wings; a line of black chain bollards (7) at the street side [V fount_swan/01-03]
const swan = mk('w946425790', 'fount-swan', 'Фонтан «Лебединое озеро»', -1772, -2839, 2.2, (P, M) => {
  P.tint('#7a4a3c'); P.fan(M.vc, Array.from({ length: 32 }, (_, i) => [Math.cos(i / 32 * 6.2832) * 5.4, 0.03, Math.sin(i / 32 * 6.2832) * 5.4]), [0, 1, 0]);
  ring(P, M, '#9a9892', 5.2, 5.5, 0, 0.1, 32);
  ring(P, M, '#2f3335', 2.2, 2.7, 0, 0.42, 28);
  water(P, M, 2.2, 0.3, 28);
  const cols = [[-0.7, -0.2, 0.45, 1.3, '#e3e1db'], [-0.2, 0.5, 0.4, 1.0, '#8d8f90'], [0.4, -0.4, 0.38, 1.4, '#2a2b2d'], [0.7, 0.3, 0.3, 0.8, '#d6d5cf'], [0.0, -0.9, 0.34, 1.1, '#9a9b9c'], [-0.5, 0.9, 0.28, 0.7, '#3a3b3d'], [0.1, 0.0, 0.5, 1.5, '#b9bab8'], [0.9, -0.8, 0.26, 0.6, '#e8e6e1'], [-1.0, -0.9, 0.3, 0.9, '#6a6c6d']];
  for (const [x, z, r, h, hex] of cols) { P.tint(hex); lathe(P, M.vc, [[r, 0.05], [r, h]], 8, { x, z, caps: true }); jet(P, M, x, h, z, x * 1.25, h + 0.9 + (h % 0.5), z * 1.25, 0.1, Math.atan2(z, x)); jet(P, M, x, h, z, x * 1.25, h + 0.9 + (h % 0.5), z * 1.25, 0.1, Math.atan2(z, x) + 1.57); }
  const pts = Array.from({ length: 7 }, (_, i) => [-4.2 + i * 1.4, 5.6]);
  pts.forEach((p, i) => { bollard(P, M, p[0], p[1]); if (i < 6) chain(P, M, p, pts[i + 1], 0.7, 0.16, 4); });
}, { rad: 5.6, solid: [{ r: 2.8, h: 1.5 }], lod: [380, 0] });

// ---- Sun: a low wide round drum of dark grey-green granite (outer wall 0.9 m, water level 0.5 m, 9.3 m across) in a round recess of setts; in the middle a sphere of fine radial pipes ("dandelion", 2.5 m) whose jets fall into the
// bowl as arches, a ring of low foam jets near the ball [V fount_sun/01]
const sun = mk('w128494923', 'fount-sun', 'Фонтан «Солнце»', -3380, -2122, 3.0, (P, M) => {
  P.tint('#8a7a6a'); P.fan(M.vc, Array.from({ length: 36 }, (_, i) => [Math.cos(i / 36 * 6.2832) * 6.2, 0.03, Math.sin(i / 36 * 6.2832) * 6.2]), [0, 1, 0]);
  ring(P, M, '#4d5853', 4.1, 4.65, 0, 0.6, 36);
  water(P, M, 4.1, 0.4, 36);
  P.tint('#3a4642'); lathe(P, M.vc, [[0.7, 0.3], [0.7, 0.55], [0.55, 0.9], [0.3, 1.1], [0.12, 1.4]], 12, { caps: true });
  const cy = 1.75;
  P.tint('#6a736f'); P.cyl(M.vc, [0, 1.3, 0], [0, cy, 0], 0.1, 0.1, 6, false);
  P.tint('#8a928e');
  for (let i = 0; i < 40; i++) { const u = (i + 0.5) / 40, y = 1 - 2 * u, rr = Math.sqrt(1 - y * y), a = i * 2.39996, dx = Math.cos(a) * rr, dz = Math.sin(a) * rr; P.cyl(M.vc, [dx * 0.45, cy + y * 0.45, dz * 0.45], [dx * 1.25, cy + y * 1.25, dz * 1.25], 0.02, 0.012, 4, false); }
  P.tint('#3f4a46'); lathe(P, M.vc, [[0.0, cy - 0.45], [0.45, cy], [0.0, cy + 0.45]], 12, { caps: false });
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832, dx = Math.cos(a), dz = Math.sin(a); jet(P, M, dx * 1.2, cy - 0.1, dz * 1.2, dx * 2.7, 0.42, dz * 2.7, 0.25, a); jet(P, M, dx * 0.6, 0.4, dz * 0.6, dx * 0.8, 1.1, dz * 0.8, 0.12, a); }
}, { rad: 6.4, solid: [{ r: 4.75, h: 1.5 }], lod: [420, 0] });

// ---- Nakhimov school fountain: a square bowl sunk one step (the photographed edge frame ~13 x 14 m, water ~5-6 m), a flat granite apron 1.2 m wide, two rows of squat round light-grey bollards joined by drooping black chains (28),
// a central cluster of 23 jets 1.2-3.3 m (review 2026-10-14: the first build had 24 poles 4-6 m high) [V fount_nakh/01-02, nakhimov/04]
const nakhimov = mk('w116399315', 'fount-nakh', 'Фонтан у Нахимовского училища', -835, -2489, 6.5, (P, M) => {
  P.tint('#8d8d8a'); P.box(M.vc, -6.4, 6.4, 0, 0.12, -6.9, 6.9, 'b');                       // the plaza frame: a flat granite slab
  P.tint('#b8b7b2'); P.box(M.vc, -3.8, 3.8, 0.12, 0.2, -3.8, 3.8, 'b');                       // the apron round the bowl
  P.tint('#2c3a3e'); P.box(M.vc, -2.8, 2.8, 0.2, 0.22, -2.8, 2.8, 'b');
  P.fan(M.water, [[-2.7, 0.24, -2.7], [2.7, 0.24, -2.7], [2.7, 0.24, 2.7], [-2.7, 0.24, 2.7]], [0, 1, 0], (p) => [p[0] / 3, p[2] / 3]);
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { P.tint('#b0afaa'); if (dx) P.box(M.vc, dx * 2.8 - 0.1, dx * 2.8 + 0.1, 0.12, 0.32, -2.9, 2.9, 'b'); else P.box(M.vc, -2.9, 2.9, 0.12, 0.32, dz * 2.8 - 0.1, dz * 2.8 + 0.1, 'b'); }
  // a central cluster of leaning jets 1.4-3.2 m (photos fount_nakh/01-02: the spray is ~3 m high and ~3 m wide in the middle of the bowl), one in the centre + two rings
  jet(P, M, 0, 0.25, 0, 0, 3.3, 0, 0.16, 0); jet(P, M, 0, 0.25, 0, 0, 3.3, 0, 0.16, 1.57);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + 0.2, c = Math.cos(a), s = Math.sin(a); jet(P, M, c * 0.5, 0.25, s * 0.5, c * 0.7, 2.2 + (i % 3) * 0.25, s * 0.7, 0.13, a); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, c = Math.cos(a), s = Math.sin(a); jet(P, M, c * 1.1, 0.25, s * 1.1, c * 1.4, 1.2 + (i % 4) * 0.2, s * 1.4, 0.11, a); }
  const R = 5.8, pts = []; for (let i = 0; i < 7; i++) pts.push([-R + i * 2 * R / 6, -R - 0.6]); for (let i = 1; i < 7; i++) pts.push([R, -R - 0.6 + i * (2 * R + 1.2) / 6]); for (let i = 1; i < 7; i++) pts.push([R - i * 2 * R / 6, R + 0.6]); for (let i = 1; i < 6; i++) pts.push([-R, R + 0.6 - i * (2 * R + 1.2) / 6]);
  pts.forEach((p, i) => { bollard(P, M, p[0], p[1], '#b4b3ae', 0.55, 0.16); chain(P, M, p, pts[(i + 1) % pts.length], 0.5, 0.14, 4); });
}, { rad: 8, solid: [{ w: 6.2, d: 6.2, h: 0.5 }], lod: [420, 0] });

// ---- Lidval garden fountain: a low pale grey granite basin ~3 m (rim 0.35 m) on a ring of small cobbles in the lawn behind the fence, a round tulip pedestal on a baluster stem carrying a shallow upper bowl 0.9 m with a thin vertical jet [V fount_lidval/01-04]
const lidval = mk('w1048465851', 'fount-lidval', 'Фонтан у дома Лидваль', -1709, -2739, 2.0, (P, M) => {
  P.tint('#8a8a85'); ring(P, M, '#8a8a85', 1.7, 2.3, 0, 0.04, 24);
  ring(P, M, '#a8a79f', 1.3, 1.55, 0, 0.35, 24);
  water(P, M, 1.3, 0.28, 24);
  P.tint('#a8a79f'); lathe(P, M.vc, [[0.4, 0.02], [0.4, 0.3], [0.18, 0.4], [0.14, 0.7], [0.2, 0.85], [0.45, 0.95], [0.43, 1.02], [0.0, 0.99]], 14, { caps: false });
  jet(P, M, 0, 1.0, 0, 0, 2.0, 0, 0.1, 0); jet(P, M, 0, 1.0, 0, 0, 2.0, 0, 0.1, 1.57);
}, { rad: 2.4, solid: [{ r: 1.6, h: 1.0 }], lod: [300, 0] });

// ---- Cafe garden fountain ("Алые паруса"): a rockery basin of laid flat stones ~3.5 m with small ground jets, a hexagonal green-bronze column 2.5 m with three standing maidens in classical dress (one with a jug, one with a cornucopia),
// a first round bowl 1.2 m on the column top and a smaller second bowl with a vase finial, thin streams falling over the bowl edges [V lion_cafe/02-05]
const maiden = () => cached('lmpm-maiden', () => extend(human({ detail: 0.26, body: { sex: 'f', muscle: 0.15 }, pose: { head: [0.1, 0.1, 0], legs: { L: { foot: [0.08, 0, 0.0] }, R: { foot: [-0.08, 0, 0.0] } }, arms: { R: { hand: [-0.12, 1.0, 0.3], pole: [-0.5, -0.4, 0.3], grip: 'hold' }, L: { hand: [0.14, 0.95, 0.12], pole: [0.5, -0.4, -0.3], grip: 'relaxed' } } },
  outfit: { torso: 'dress', sleeves: 'none', hem: 0.96, flare: 0.2, folds: 0.07, belt: true, collar: 'none', cape: 'back', capeLen: 0.8 }, face: { age: 0.2, hair: 'long', seed: 141 } }), (S, info) => { const h = info.j.wristR; if (h) S.tube('main', [V.add(h, [0.0, 0.0, 0.0]), V.add(h, [-0.06, -0.04, 0.1])], [[0.045, 0.045], [0.06, 0.06]], { seg: 8, per: 2 }); }));
const cafe = mk('n8514862218', 'fount-cafe', 'Фонтан у кафе «Алые паруса»', -1697, -2322, 4.2, (P, M) => {
  P.tint('#8a867c'); ring(P, M, '#8a867c', 1.4, 1.9, 0, 0.35, 20);
  water(P, M, 1.45, 0.28, 20);
  P.tint('#3e4a42'); lathe(P, M.vc, [[0.6, 0.02], [0.6, 0.3]], 6, { caps: true, phi0: 0 });
  P.tint('#3d4b44'); lathe(P, M.vc, [[0.5, 0.3], [0.38, 0.4], [0.36, 1.8]], 6, { caps: true });
  for (let k = 0; k < 3; k++) put3(P, maiden(), M.bronzeMono, Math.sin(k * 2.0944) * 0.42, 0.3, Math.cos(k * 2.0944) * 0.42, k * 2.0944, 0.82);
  P.tint('#3f4e46'); lathe(P, M.vc, [[0.1, 1.75], [0.6, 1.8], [0.62, 2.05], [0.5, 2.1], [0.0, 2.0]], 16, { caps: false });
  lathe(P, M.vc, [[0.1, 2.0], [0.12, 2.3], [0.4, 2.4], [0.38, 2.55], [0.0, 2.5]], 14, { caps: false });
  P.tint('#46564d'); lathe(P, M.vc, [[0.0, 2.5], [0.1, 2.6], [0.14, 2.9], [0.06, 3.0], [0.0, 3.05]], 10, { caps: false });
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.2832, dx = Math.cos(a), dz = Math.sin(a); jet(P, M, dx * 0.55, 2.0, dz * 0.55, dx * 0.7, 1.8, dz * 0.7, 0.05, a); jet(P, M, dx * 1.0, 0.3, dz * 1.0, dx * 1.2, 0.8, dz * 1.2, 0.07, a); }
}, { rad: 2.2, solid: [{ r: 1.95, h: 1.0 }], lod: [320, 0] });

// ---- One Trinity Place terrace splash pad: a flush round pool ~8 m in the long brown-grey pavers, a dark ring edge and a dark floor, 28 vertical jets 0.5-1.5 m in a cluster of ~3 m; free to walk through [V otp2, fnt_trin]
const trinity = mk('n9129609484', 'fount-trinity', 'Фонтан (One Trinity Place)', -4178, -3546, 1.6, (P, M) => {
  P.tint('#3a3836'); ring(P, M, '#3a3836', 3.85, 4.0, 0, 0.05, 32);
  P.tint('#2a2c2e'); P.fan(M.vc, Array.from({ length: 32 }, (_, i) => [Math.cos(i / 32 * 6.2832) * 3.85, 0.025, Math.sin(i / 32 * 6.2832) * 3.85]), [0, 1, 0]);
  for (let i = 0; i < 28; i++) { const a = i * 2.39996, r = 0.25 + 1.4 * Math.sqrt((i + 0.5) / 28), x = Math.cos(a) * r, z = Math.sin(a) * r, h = 0.5 + ((i * 7) % 10) / 10; jet(P, M, x, 0.03, z, x, 0.03 + h, z, 0.07, a); jet(P, M, x, 0.03, z, x, 0.03 + h, z, 0.07, a + 1.57); }
}, { rad: 4.2, lod: [300, 0], solid: [] });

export const PIECES = [swan, sun, nakhimov, lidval, cafe, trinity];
