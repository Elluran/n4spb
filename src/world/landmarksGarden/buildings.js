// landmarksGarden/buildings.js - the buildings of the Summer Garden, built on their real OSM footprints (minimum-area rectangles of the polygons in data/city.js BUILDINGS):
//  * the Summer Palace of Peter I (w41230751, 16.3 x 25.8 m, Trezzini 1710-14): two storeys, ochre-yellow plaster #e8c068 with terracotta quoins / window frames / string course and 29 bas-relief panels
//    #c4604a, a grey hip roof #8f99a8 with two chimneys, the entrance with the coat-of-arms relief on the garden face (photo 052, 030),
//  * the Coffee House (w159079287, Rossi 1826): strong yellow #f0c33a, a tall central block with three arched glazed doors between white pilasters, a garland frieze, an attic and a low copper dome,
//    lower wings, two iron tripod vases on granite plinths (photo 068),
//  * the Tea House (w159079293, Charlemagne 1827): pale yellow clapboard #e2cf7e, white corner boards, a hip roof with a wide overhang and five white Doric columns on the short north end (photo 078),
//  * the Small Orangery (w159079348): a long white pavilion with pale blue shutter panels, a pedimented centre with four arched doors, a balustrade with urns on the flat roof (photo 225),
//  * the Poultry-yard pavilion with the octagonal pigeon loft (w311015868), the square pavilion (w311015903), the small hut (w1089906891), the farmyard box (w197658140, hidden by hedges),
//  * the octagonal gazebo in the Menagerie pond (w311015902) with four small pavilions round the pool, the Pilnikov terrace with four vases, the gate booths (tiny OSM polygons).
// No flags.  Frames: each building has a model frame (+x = the long axis, +z = toward the garden / the nearest alley).
import * as THREE from 'three';
import { BUILDINGS } from '../data/city.js';
import * as G from './geo.js';
import { rotOf, fromG, nearestOnLine } from './frame.js';
import { gardenPaths } from './ground.js';

const byId = (id) => BUILDINGS.find((b) => b.id === id);
const pairs = (f) => { const r = []; for (let i = 0; i < f.length; i += 2) r.push([f[i], f[i + 1]]); return r; };

/** minimum-area bounding rectangle of the outer ring: { cx, cz, ang (long axis, atan2(dz, dx)), L, D } */
function minRect(poly) {
  const r = pairs(poly.o); let best = null;
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length], ang = Math.atan2(b[1] - a[1], b[0] - a[0]), c = Math.cos(ang), s = Math.sin(ang);
    let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const p of r) { const u = p[0] * c + p[1] * s, v = -p[0] * s + p[1] * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
    const area = (u1 - u0) * (v1 - v0);
    if (!best || area < best.area) best = { area, ang, u0, u1, v0, v1, c, s };
  }
  let { ang, u0, u1, v0, v1, c, s } = best;
  let L = u1 - u0, D = v1 - v0, cu = (u0 + u1) / 2, cv = (v0 + v1) / 2;
  if (D > L) { ang += Math.PI / 2; [L, D] = [D, L]; const c2 = Math.cos(ang), s2 = Math.sin(ang); const cx = cu * c - cv * s, cz = cu * s + cv * c; return { cx, cz, ang, L, D, c: c2, s: s2 }; }
  return { cx: cu * c - cv * s, cz: cu * s + cv * c, ang, L, D };
}
/** the frame of a building: rot (+x along the long axis, +z pointing toward `toward`), centre, L, D */
function frameOf(id, toward, o = {}) {
  const b = byId(id); if (!b) return null;
  const r = minRect(b.polys[0]);
  let rot = rotOf(Math.cos(r.ang), Math.sin(r.ang));
  const zw = [Math.sin(rot), Math.cos(rot)];
  if (toward && (toward[0] - r.cx) * zw[0] + (toward[1] - r.cz) * zw[1] < 0) rot += Math.PI;
  return { id, x: o.cx ?? r.cx, z: o.cz ?? r.cz, rot, L: r.L, D: r.D };
}
const nearAlley = (x, z) => { let b = null; for (const p of gardenPaths()) { if (p.steps) continue; const n = nearestOnLine(p.pts, x, z); if (!b || n.d < b.d) b = n; } return b ? [b.x, b.z] : [x, z]; };

export function build(K) {
  const { ctx, M, P, svc } = K, ph = ctx.physics, T = ctx.mat.toon;
  const B = {
    ochre: T('#e8c068', { name: 'lmGd-palaceWall', paint: 0.05 }), terra: T('#c4604a', { name: 'lmGd-terra', paint: 0.04 }), terraLight: T('#d8806a', { name: 'lmGd-terraL', paint: 0.04 }),
    roofGrey: T('#8f99a8', { name: 'lmGd-roofGrey', paint: 0.04, side: 'double' }), roofCopper: T('#5e9a82', { name: 'lmGd-roofCopper', paint: 0.04 }), roofDark: T('#5a5a58', { name: 'lmGd-roofDark', paint: 0.04, side: 'double' }),
    sash: T('#4a5058', { name: 'lmGd-sash', polygonOffset: -1 }), glass: T('#27323f', { name: 'lmGd-glassD', polygonOffset: -1, emissive: '#0a1018', emissiveIntensity: 0.2 }),
    yellow: T('#f0c33a', { name: 'lmGd-coffeeWall', paint: 0.05 }), yellowShade: T('#e0b030', { name: 'lmGd-coffeeShade', paint: 0.05 }),
    teaWall: T('#e2cf7e', { name: 'lmGd-teaWall', paint: 0.05 }), brown: T('#b06a2a', { name: 'lmGd-doorBrown', paint: 0.03 }), honey: T('#a8743a', { name: 'lmGd-honey', paint: 0.03 }),
    white: M.white, whiteShade: M.whiteShade, orangeryBlue: T('#b8ccd0', { name: 'lmGd-shutter', paint: 0.03 }), pavYellow: T('#e3cc7a', { name: 'lmGd-pavYellow', paint: 0.05 }),
    pinkOchre: T('#e8b896', { name: 'lmGd-gazebo', paint: 0.04 }), cream: T('#f2e4c4', { name: 'lmGd-cream', paint: 0.03 }), brick: T('#a8603f', { name: 'lmGd-brick', paint: 0.05 }),
    plinth: M.graniteGrey,
  };
  const box = (x0, x1, y0, y1, z0, z1, mat, skip = '', tu = 3) => G.tbox(P, mat, x0, x1, y0, y1, z0, z1, tu, tu, skip);
  /** a window on a +z face at z: sash frame boxes (protruding), glass 3 cm in front of the wall */
  const window = (cx, y0, w, h, z, frame, arch = false) => {
    if (arch) {
      G.planeShape(P, B.glass, G.archPts(cx, y0, w, h, 8), z + 0.03);
      G.frameRing(P, frame, G.archPts(cx, y0 - 0.12, w + 0.3, h + 0.15, 8), G.archPts(cx, y0, w, h, 8), z + 0.0, 0.1, 1);
    } else {
      P.quad(B.glass, [cx - w / 2, y0, z + 0.03], [cx + w / 2, y0, z + 0.03], [cx + w / 2, y0 + h, z + 0.03], [cx - w / 2, y0 + h, z + 0.03], [0, 0, 1]);
      const f = 0.11;
      box(cx - w / 2 - f, cx - w / 2, y0 - 0.1, y0 + h + f, z, z + 0.07, frame, 'bk'); box(cx + w / 2, cx + w / 2 + f, y0 - 0.1, y0 + h + f, z, z + 0.07, frame, 'bk');
      box(cx - w / 2 - f, cx + w / 2 + f, y0 + h, y0 + h + f, z, z + 0.07, frame, 'bk'); box(cx - w / 2 - f * 1.4, cx + w / 2 + f * 1.4, y0 - 0.14, y0 - 0.02, z, z + 0.12, frame, 'bk');
      box(cx - 0.02, cx + 0.02, y0, y0 + h, z + 0.03, z + 0.06, B.sash, 'bk'); box(cx - w / 2, cx + w / 2, y0 + h * 0.5 - 0.02, y0 + h * 0.5 + 0.02, z + 0.03, z + 0.06, B.sash, 'bk');
    }
  };
  /** a hip roof over the rectangle x -hl..hl, z -hd..hd at y with ridge height rise; overhang o */
  const hipRoof = (hl, hd, y, rise, mat, o = 0.5, ridgeHalf = null) => {
    const rh = ridgeHalf ?? Math.max(0.5, hl - hd), a = [-hl - o, y, -hd - o], b = [hl + o, y, -hd - o], c = [hl + o, y, hd + o], d = [-hl - o, y, hd + o];
    const r0 = [-rh, y + rise, 0], r1 = [rh, y + rise, 0];
    P.fan(mat, [a, b, r1, r0], [0, 0.7, -0.7]); P.fan(mat, [c, d, r0, r1], [0, 0.7, 0.7]); P.fan(mat, [b, c, r1], [0.7, 0.7, 0]); P.fan(mat, [d, a, r0], [-0.7, 0.7, 0]);
  };
  const place = (f, fn) => { P.push(f.x, 0, f.z, f.rot); try { fn(); } finally { P.pop(); } };
  const collide = (f, h = 6) => ph.addBox(f.x, f.z, f.L, f.D, f.rot, 0, h);

  // ================================================================================== the Summer Palace of Peter I
  try {
    const f = frameOf('w41230751', nearAlley(-849, -1650)); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.15, hl + 0.15, 0, 0.55, -hd - 0.15, hd + 0.15, B.plinth, 'b');
      box(-hl, hl, 0.55, 8.6, -hd, hd, B.ochre, 'b');
      box(-hl - 0.3, hl + 0.3, 8.6, 9.05, -hd - 0.3, hd + 0.3, B.terra, 'b');                                  // cornice
      const nx = Math.round(f.L / 2.35), nz = Math.round(f.D / 2.35), px = f.L / nx, pz = f.D / nz;
      for (const [face, n, p, half] of [[1, nx, px, hd], [-1, nx, px, hd]]) {                                 // long faces: z = +-hd (face +1 = the garden side)
        P.push(0, 0, face * half, face > 0 ? 0 : Math.PI);
        for (let i = 0; i < n; i++) {
          const x = (i + 0.5) * p - hl;
          const wx = face > 0 ? x : -x;
          if (face > 0 && i === (n >> 1)) { box(wx - 0.7, wx + 0.7, 0.55, 2.7, 0, 0.12, B.brown, 'bk'); G.planeShape(P, B.terra, G.archPts(wx, 2.75, 0.7, 0.6, 6), 0.1); }      // the entrance with the coat of arms over it
          else window(wx, 1.15, 1.1, 2.2, 0, B.terra);
          window(wx, 5.35, 1.1, 2.2, 0, B.terra); box(wx - 0.22, wx + 0.22, 7.65, 7.95, 0, 0.1, B.terra, 'bk');
          // bas-relief panel under the upper window: terracotta frame, lighter relief inside
          box(wx - 0.75, wx + 0.75, 3.6, 4.9, 0, 0.05, B.terra, 'bk'); box(wx - 0.6, wx + 0.6, 3.74, 4.76, 0.05, 0.09, B.terraLight, 'bk');
        }
        P.pop();
      }
      for (const face of [1, -1]) {                                                                            // short faces: x = +-hl
        P.push(face * hl, 0, 0, face > 0 ? Math.PI / 2 : -Math.PI / 2);
        for (let i = 0; i < nz; i++) { const x = (i + 0.5) * pz - hd; window(x, 1.15, 1.1, 2.2, 0, B.terra); window(x, 5.35, 1.1, 2.2, 0, B.terra); box(x - 0.22, x + 0.22, 7.65, 7.95, 0, 0.1, B.terra, 'bk'); box(x - 0.75, x + 0.75, 3.6, 4.9, 0, 0.05, B.terra, 'bk'); box(x - 0.6, x + 0.6, 3.74, 4.76, 0.05, 0.09, B.terraLight, 'bk'); }
        P.pop();
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let k = 0; k < 14; k++) {                         // terracotta quoins at the corners (alternating long and short blocks)
        const y0 = 0.6 + k * 0.57, w = k % 2 ? 0.45 : 0.8, w2 = k % 2 ? 0.8 : 0.45;
        const xa = sx > 0 ? hl - w : -hl, xb = sx > 0 ? hl : -hl + w, za = sz > 0 ? hd : hd * -1 - 0.06, zb = sz > 0 ? hd + 0.06 : -hd;
        box(xa, xb, y0, y0 + 0.5, za, zb, B.terra, 'bt');
        const za2 = sz > 0 ? hd - w2 : -hd, zb2 = sz > 0 ? hd : -hd + w2, xa2 = sx > 0 ? hl : -hl - 0.06, xb2 = sx > 0 ? hl + 0.06 : -hl;
        box(xa2, xb2, y0, y0 + 0.5, za2, zb2, B.terra, 'bt');
      }
      hipRoof(hl, hd, 9.05, 4.5, B.roofGrey, 0.55);
      P.push(1.5, 0, 4.2, 0);                                                                                  // the dormer on the garden slope
      box(-0.8, 0.8, 10.4, 12.2, -0.8, 0.8, B.ochre, 'b'); window(0, 10.9, 0.8, 1.0, 0.8, B.terra); hipRoof(0.8, 0.8, 12.2, 0.7, B.roofGrey, 0.18, 0.1);
      P.pop();
      for (const s of [-1, 1]) box(s * 3.0 - 0.5, s * 3.0 + 0.5, 10.5, 13.0, -0.5, 0.5, B.ochre, 'b');            // chimneys
      box(-0.5, 0.5, 13.0, 13.1, -0.5, 0.5, B.terra, 'b'); G.ball(P, M.gold, 0, 13.4, 0, 0.18, 6); P.cyl(M.iron, [0, 13.1, 0], [0, 14.2, 0], 0.03, 0.02, 4, false);   // weather vane (no flag)
    });
    collide(f, 14); svc.palace = { x: f.x, z: f.z, rotY: f.rot, L: f.L, D: f.D };
    svc.monuments.push({ id: 'w41230751', name: 'Летний дворец Петра I', x: f.x, z: f.z, h: 14 });
    svc.photoSpots.push({ x: f.x + 22, z: f.z + 10, yaw: 110, pitch: 6, name: 'Летний дворец Петра I' });
  } catch (e) { console.error('[landmarksGarden] palace:', e); }

  // ================================================================================== the Coffee House
  try {
    const f = frameOf('w159079287', [-860, -1500]); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.1, hl + 0.1, 0, 0.5, -hd - 0.1, hd + 0.1, B.plinth, 'b');
      box(-hl, -5.5, 0.5, 5.2, -hd, hd, B.yellow, 'br'); box(5.5, hl, 0.5, 5.2, -hd, hd, B.yellow, 'bl');   // the two low wings
      box(-5.5, 5.5, 0.5, 7.0, -hd, hd + 0.3, B.yellow, 'b');                                                  // the taller central block (projects 0.3 m)
      box(-hl - 0.2, -5.45, 5.2, 5.55, -hd - 0.2, hd + 0.2, B.white, 'br'); box(5.45, hl + 0.2, 5.2, 5.55, -hd - 0.2, hd + 0.2, B.white, 'bl');   // wing cornices
      box(-5.7, 5.7, 7.0, 7.45, -hd - 0.2, hd + 0.5, B.white, 'b');                                            // main cornice
      box(-5.4, 5.4, 7.45, 8.05, -hd + 0.2, hd + 0.1, B.yellowShade, 'b');                                     // attic
      // front (+z) of the middle: three arched glazed doors between white pilasters, a garland frieze
      P.push(0, 0, hd + 0.3, 0);
      for (const cx of [-3.2, 0, 3.2]) { window(cx, 0.5, 2.1, 4.1, 0, B.brown, true); }
      for (const cx of [-4.8, -1.6, 1.6, 4.8]) box(cx - 0.28, cx + 0.28, 0.5, 6.9, 0, 0.18, B.white, 'bk');
      box(-5.5, 5.5, 5.6, 6.5, 0, 0.04, B.whiteShade, 'bk');                                                  // the relief frieze band
      for (let i = 0; i < 12; i++) G.ball(P, B.white, -4.95 + i * 0.9, 6.1, 0.1, 0.17, 6);
      P.pop();
      // the wings: a window each side, a low terrace in front with two vases
      for (const s of [-1, 1]) { P.push(0, 0, hd, 0); window(s * 8.2, 1.0, 1.1, 2.4, 0, B.white); window(s * 6.7, 1.0, 1.1, 2.4, 0, B.white); window(s * 9.6, 1.0, 1.1, 2.4, 0, B.white); P.pop(); }
      P.push(0, 0, -hd, Math.PI);                                                                              // the back (Fontanka side): tall windows between pilasters
      for (let i = 0; i < 9; i++) { const x = (i + 0.5) * f.L / 9 - hl; window(x, 0.9, 1.1, 3.2, 0, B.white); }
      P.pop();
      for (const s of [-1, 1]) { P.push(s * hl, 0, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2); for (const x of [-3.5, 0, 3.5]) window(x, 0.9, 1.1, 3.2, 0, B.white); P.pop(); }
      box(-hl - 0.3, hl + 0.3, 0.0, 0.2, hd, hd + 3.2, B.plinth, 'b');
      for (const s of [-1, 1]) { box(s * 7.0 - 0.5, s * 7.0 + 0.5, 0.2, 0.9, hd + 1.4, hd + 2.4, B.plinth, 'b'); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; P.cyl(M.iron, [s * 7.0 + Math.cos(a) * 0.4, 1.0, hd + 1.9 + Math.sin(a) * 0.4], [s * 7.0, 1.5, hd + 1.9], 0.03, 0.03, 4, false); } G.lathe(P, M.iron, 'tripodVase', [[0, 0], [0.2, 0.02], [0.25, 0.2], [0.34, 0.45], [0.3, 0.7], [0.36, 0.9], [0.26, 0.92], [0, 0.9]], s * 7.0, 1.5, hd + 1.9, 1, 1, 12, 10); }
      // low copper dome behind the attic
      P.cyl(B.white, [0, 8.05, -1.0], [0, 8.6, -1.0], 2.6, 2.6, 16, false);
      G.lathe(P, B.roofCopper, 'coffeeDome', [[0, 0], [2.6, 0], [2.4, 0.5], [1.9, 0.9], [1.0, 1.2], [0.3, 1.35], [0, 1.4]], 0, 8.6, -1.0, 1, 1, 18, 10);
      hipRoof(hl - 0.3, hd - 0.3, 5.6, 0.01, B.white, 0.0, 0.1);
    });
    collide(f, 9);
    svc.coffee = { x: f.x, z: f.z, rotY: f.rot };
    svc.crowd.push({ x: f.x + Math.sin(f.rot) * (hd + 4), z: f.z + Math.cos(f.rot) * (hd + 4), r: 6, n: 8, kind: 'cafe' });
    svc.monuments.push({ id: 'w159079287', name: 'Кофейный домик', x: f.x, z: f.z, h: 9 });
  } catch (e) { console.error('[landmarksGarden] coffee house:', e); }

  // ================================================================================== the Tea House
  try {
    const f = frameOf('w159079293', [-900, -1550]); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.1, hl + 0.1, 0, 0.5, -hd - 0.1, hd + 0.1, B.plinth, 'b');
      box(-hl, hl, 0.5, 3.9, -hd, hd, B.teaWall, 'b');
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(sx * hl - (sx > 0 ? 0.18 : 0), sx * hl + (sx < 0 ? 0.18 : 0), 0.5, 3.9, sz * hd - (sz > 0 ? 0.18 : 0), sz * hd + (sz < 0 ? 0.18 : 0), B.white, 'b');
      box(-hl - 0.05, hl + 0.05, 3.9, 4.1, -hd - 0.05, hd + 0.05, B.white, 'b');
      for (const face of [1, -1]) { P.push(0, 0, face * hd, face > 0 ? 0 : Math.PI); for (let i = 0; i < 6; i++) { const x = (i + 0.5) * f.L / 6 - hl; const wx = face > 0 ? x : -x; window(wx, 1.4, 1.1, 1.9, 0, B.white); box(wx - 0.5, wx + 0.5, 0.5, 1.0, 0, 0.0, B.teaWall, 'bk'); } P.pop(); }
      box(hl - 0.04, hl + 0.04, 0.5, 3.9, -0.6, 0.6, B.honey, 'bk');
      // five white Doric columns on the short end (x = -hl, the north end) under the deep eave
      for (let k = 0; k < 5; k++) { const z = -hd + 0.7 + k * (f.D - 1.4) / 4; P.cyl(M.white, [-hl - 2.2, 0.5, z], [-hl - 2.2, 3.7, z], 0.26, 0.22, 12, false); box(-hl - 2.2 - 0.34, -hl - 2.2 + 0.34, 3.7, 3.95, z - 0.34, z + 0.34, B.white, 'b'); box(-hl - 2.2 - 0.36, -hl - 2.2 + 0.36, 0.45, 0.6, z - 0.36, z + 0.36, B.white, 'b'); }
      box(-hl - 2.7, -hl, 0, 0.2, -hd - 0.3, hd + 0.3, B.plinth, 'b');
      box(-hl - 2.7, -hl, 3.95, 4.35, -hd - 0.3, hd + 0.3, B.white, 'b');
      hipRoof(hl, hd, 4.1, 1.6, B.roofGrey, 0.95);
      P.fan(B.roofGrey, [[-hl - 2.9, 4.35, -hd - 0.4], [-hl - 0.5, 4.35, -hd - 0.4], [-hl - 0.5, 4.35, hd + 0.4], [-hl - 2.9, 4.35, hd + 0.4]], [0, 1, 0]);
    });
    collide(f, 5);
    svc.crowd.push({ x: f.x + Math.sin(f.rot) * 0 + Math.cos(f.rot) * (f.L / 2 + 3), z: f.z - Math.sin(f.rot) * (f.L / 2 + 3), r: 5, n: 6, kind: 'cafe' });
    svc.monuments.push({ id: 'w159079293', name: 'Чайный домик', x: f.x, z: f.z, h: 5 });
  } catch (e) { console.error('[landmarksGarden] tea house:', e); }

  // ================================================================================== the Small Orangery
  try {
    const f = frameOf('w159079348', [-880, -1400]); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.1, hl + 0.1, 0, 0.45, -hd - 0.1, hd + 0.1, B.plinth, 'b');
      box(-hl, hl, 0.45, 5.0, -hd, hd, B.white, 'b');
      P.push(0, 0, hd, 0);
      for (let i = 0; i < 11; i++) { const x = (i + 0.5) * f.L / 11 - hl; if (Math.abs(x) < 4.2) window(x, 0.6, 1.3, 3.4, 0, B.white, true); else { box(x - 0.55, x + 0.55, 1.0, 3.8, 0, 0.04, B.orangeryBlue, 'bk'); } }
      box(-4.9, 4.9, 5.0, 6.4, -hd + 0.3, hd + 0.3, B.white, 'b');                                             // the pedimented centre
      P.fan(B.white, [[-4.9, 6.4, hd + 0.3], [4.9, 6.4, hd + 0.3], [0, 7.6, hd + 0.3]], [0, 0, 1]);
      P.pop();
      box(-hl - 0.2, hl + 0.2, 5.0, 5.3, -hd - 0.2, hd + 0.2, B.white, 'b');
      for (let i = 0; i <= 38; i++) { const x = -hl + i * f.L / 38; P.cyl(M.white, [x, 5.3, hd + 0.1], [x, 6.0, hd + 0.1], 0.05, 0.05, 4, false); P.cyl(M.white, [x, 5.3, -hd - 0.1], [x, 6.0, -hd - 0.1], 0.05, 0.05, 4, false); }
      box(-hl, hl, 6.0, 6.1, hd, hd + 0.2, B.white, 'b'); box(-hl, hl, 6.0, 6.1, -hd - 0.2, -hd, B.white, 'b');
    });
    collide(f, 6);
    svc.monuments.push({ id: 'w159079348', name: 'Малая оранжерея', x: f.x, z: f.z, h: 7 });
  } catch (e) { console.error('[landmarksGarden] orangery:', e); }

  // ================================================================================== pavilions: poultry yard + pigeon loft, the square pavilion, the small hut, the farmyard box
  try {
    const f = frameOf('w311015868', nearAlley(-947, -1507)); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.1, hl + 0.1, 0, 0.4, -hd - 0.1, hd + 0.1, B.plinth, 'b');
      box(-hl, hl, 0.4, 3.6, -hd, hd, B.pavYellow, 'b');
      box(-hl - 0.15, hl + 0.15, 3.6, 3.8, -hd - 0.15, hd + 0.15, B.white, 'b');
      for (let i = 0; i < 5; i++) { const x = (i + 0.5) * f.L / 5 - hl; window(x, 0.9, 1.7, 2.4, hd, B.white); }
      for (let i = 0; i <= 20; i++) { const x = -hl + i * f.L / 20; P.cyl(M.white, [x, 3.8, hd + 0.05], [x, 4.4, hd + 0.05], 0.04, 0.04, 4, false); }
      box(-hl, hl, 4.4, 4.5, hd, hd + 0.1, B.white, 'b');
      // the octagonal pigeon loft with a grey domed cap and a golden weathercock
      P.cyl(B.pavYellow, [0, 3.8, 0], [0, 6.4, 0], 1.5, 1.4, 8, false);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; for (let r = 0; r < 3; r++) G.ball(P, B.sash, Math.cos(a) * 1.44, 4.6 + r * 0.7, Math.sin(a) * 1.44, 0.07, 4); }
      P.cyl(B.white, [0, 6.4, 0], [0, 6.55, 0], 1.7, 1.7, 8, true);
      G.lathe(P, B.roofGrey, 'loftCap', [[0, 0], [1.6, 0], [1.3, 0.5], [0.6, 0.9], [0, 1.1]], 0, 6.55, 0, 1, 1, 8, 6);
      G.ball(P, M.gold, 0, 7.8, 0, 0.14, 6);
    });
    collide(f, 7);
  } catch (e) { console.error('[landmarksGarden] poultry pavilion:', e); }
  try {
    const f = frameOf('w311015903', nearAlley(-858, -1514)); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => {
      box(-hl - 0.1, hl + 0.1, 0, 0.4, -hd - 0.1, hd + 0.1, B.plinth, 'b'); box(-hl, hl, 0.4, 3.4, -hd, hd, B.pavYellow, 'b'); box(-hl - 0.2, hl + 0.2, 3.4, 3.6, -hd - 0.2, hd + 0.2, B.white, 'b');
      for (const face of [1, -1]) { P.push(0, 0, face * hd, face > 0 ? 0 : Math.PI); for (const x of [-2.4, 0, 2.4]) window(x, 0.9, 1.2, 2.1, 0, B.white); P.pop(); }
      hipRoof(hl, hd, 3.6, 1.8, B.roofGrey, 0.5);
    });
    collide(f, 5);
  } catch (e) { console.error('[landmarksGarden] pavilion:', e); }
  try {
    const f = frameOf('w1089906891', nearAlley(-957, -1534)); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => { box(-hl, hl, 0, 3.0, -hd, hd, B.pavYellow, 'b'); box(-hl - 0.15, hl + 0.15, 3.0, 3.15, -hd - 0.15, hd + 0.15, B.white, 'b'); window(0, 0.8, 1.2, 1.9, hd, B.white); hipRoof(hl, hd, 3.15, 1.4, B.roofGrey, 0.4); });
    collide(f, 4.5);
  } catch (e) { console.error('[landmarksGarden] hut:', e); }
  try {
    const f = frameOf('w197658140', null); const hl = f.L / 2, hd = f.D / 2;
    place(f, () => { box(-hl, hl, 0, 3.6, -hd, hd, M.greenDark, 'b'); box(-hl, hl, 3.6, 3.7, -hd, hd, M.green, 'b'); });
    collide(f, 4);
  } catch (e) { console.error('[landmarksGarden] farmyard:', e); }

  // ================================================================================== gate booths: the tiny OSM polygons (white-grey glazed boxes)
  for (const id of ['w1086062766', 'w1086062770', 'w1086062748', 'w1086062753', 'w1090301743', 'w592178587', 'w307653068', 'w307653069']) {
    try {
      const f = frameOf(id, null); if (!f) continue; const hl = Math.max(1.0, f.L / 2), hd = Math.max(1.0, f.D / 2);
      place(f, () => {
        box(-hl, hl, 0, 2.5, -hd, hd, B.white, 'b'); box(-hl - 0.1, hl + 0.1, 2.5, 2.65, -hd - 0.1, hd + 0.1, M.ironGrey, 'b');
        for (const face of [1, -1]) { P.push(0, 0, face * hd, face > 0 ? 0 : Math.PI); P.quad(M.boothGlass, [-hl + 0.2, 1.0, 0.03], [hl - 0.2, 1.0, 0.03], [hl - 0.2, 2.2, 0.03], [-hl + 0.2, 2.2, 0.03], [0, 0, 1]); P.pop(); }
      });
      collide(f, 2.7);
    } catch (e) { console.error('[landmarksGarden] booth ' + id + ':', e); }
  }

  // ================================================================================== the Menagerie pond: the octagonal gazebo in the water + four small pavilions round the pool
  try {
    const f = frameOf('w311015902', null); const cx = -925.3, cz = -1582.7, R0 = 2.5;
    void f;
    P.cyl(B.brick, [cx, 0, cz], [cx, 0.9, cz], R0 + 0.2, R0 + 0.2, 8, true);                                  // brick base in the water
    P.cyl(B.pinkOchre, [cx, 0.9, cz], [cx, 1.0, cz], R0 + 0.25, R0 + 0.25, 8, true);
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + Math.PI / 8, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0;
      if (k % 4 !== 1) { P.cyl(B.cream, [x, 1.0, z], [x, 3.6, z], 0.1, 0.1, 6, false); }
      const a2 = (k + 1) / 8 * Math.PI * 2 + Math.PI / 8, x2 = cx + Math.cos(a2) * R0, z2 = cz + Math.sin(a2) * R0;
      P.cyl(B.cream, [x, 1.9, z], [x2, 1.9, z2], 0.04, 0.04, 4, false); P.cyl(B.cream, [x, 3.55, z], [x2, 3.55, z2], 0.05, 0.05, 4, false);
      for (let b = 1; b < 4; b++) { const t = b / 4; P.cyl(B.cream, [x + (x2 - x) * t, 1.0, z + (z2 - z) * t], [x + (x2 - x) * t, 1.9, z + (z2 - z) * t], 0.03, 0.03, 4, false); }
    }
    P.cyl(B.pinkOchre, [cx, 3.6, cz], [cx, 3.9, cz], R0 + 0.35, R0 + 0.35, 8, true);
    G.lathe(P, B.roofDark, 'gazeboRoof', [[0, 0], [3.0, 0], [2.7, 0.4], [1.8, 0.9], [1.0, 1.5], [0.5, 2.0], [0.4, 2.4], [0.7, 2.5], [0, 2.7]], cx, 3.9, cz, 1, 1, 10, 9);
    G.ball(P, M.gold, cx, 6.85, cz, 0.16, 6);                                                              // the golden cockerel (a ball on a pin: no flag)
    ph.addCylinder(cx, cz, R0 + 0.4, 0, 7);
    const paths = gardenPaths().filter((p) => !p.steps);
    for (const [ds, dq] of [[19, 0], [-19, 0], [0, 19], [0, -19]]) {
      const c = fromG(0, 0); void c;
    }
    const sq = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [a, b] of sq) {
      const px = cx + (a * 0.3325 + b * 0.9432) * 19.5, pz = cz + (a * 0.9432 - b * 0.3325) * 19.5;
      if (paths.some((p) => nearestOnLine(p.pts, px, pz).d < p.w / 2 + 2.6)) continue;
      const rot = Math.atan2(cx - px, cz - pz);
      P.push(px, 0, pz, rot);
      box(-1.5, 1.5, 0, 3.0, -1.5, 1.5, B.pinkOchre, 'b'); box(-1.6, 1.6, 3.0, 3.15, -1.6, 1.6, B.cream, 'b');
      G.planeShape(P, B.glass, G.archPts(0, 0.4, 1.1, 2.0, 6), 1.53);
      hipRoof(1.5, 1.5, 3.15, 1.5, B.roofDark, 0.4, 0.3);
      P.pop();
      ph.addBox(px, pz, 3.2, 3.2, rot, 0, 5);
    }
  } catch (e) { console.error('[landmarksGarden] gazebo:', e); }

  // ================================================================================== the Pilnikov terrace (OSM w591647541) with four vases: a 1.3 m dressed-stone terrace over the Lebyazhy canal
  try {
    const c = fromG(250, -100), rot = rotOf(0.3325, 0.9432), len = 27;
    P.push(c.x, 0, c.z, rot);
    box(-len / 2, len / 2, 0, 1.3, -1.8, 1.8, M.graniteGrey, 'b'); box(-len / 2 - 0.1, len / 2 + 0.1, 1.3, 1.4, -1.9, 1.9, M.granite, 'b');
    for (let i = 0; i <= 90; i++) { const x = -len / 2 + i * len / 90; P.cyl(M.black, [x, 1.4, 1.7], [x, 2.4, 1.7], 0.012, 0.012, 4, false); }
    P.cyl(M.black, [-len / 2, 2.4, 1.7], [len / 2, 2.4, 1.7], 0.02, 0.02, 4, false); P.cyl(M.black, [-len / 2, 1.5, 1.7], [len / 2, 1.5, 1.7], 0.02, 0.02, 4, false);
    for (const x of [-9, -3, 3, 9]) {
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; P.cyl(M.black, [x + Math.cos(a) * 0.5, 1.4, Math.sin(a) * 0.5], [x, 2.3, 0], 0.03, 0.03, 4, false); }
      G.lathe(P, M.black, 'terraceVase', [[0, 0], [0.22, 0.02], [0.14, 0.22], [0.3, 0.45], [0.46, 0.8], [0.44, 1.1], [0.32, 1.32], [0.4, 1.42], [0.44, 1.5], [0.3, 1.52], [0, 1.5]], x, 2.3, 0, 1.15, 1, 12, 11);
    }
    P.pop();
    ph.addBox(c.x, c.z, len, 3.8, rot, 0, 2.6);
  } catch (e) { console.error('[landmarksGarden] terrace:', e); }
  void THREE;
}
