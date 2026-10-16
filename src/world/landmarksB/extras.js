// landmarksB/extras.js - more Nevsky houses of docs/research/nevsky.md (block table), drawn ONLY when layout.GROUPS.landmarksB claims their id (add the ids to the sub-group
// `nevsky-corner`; until then `city` draws them).  `?lbextras` in the URL draws them regardless (for screenshots without city).
//   Colosseum (Nevsky 100, w60195636, photo refs/nevsky/18): grey-olive neo-Renaissance, arcaded storeys with paired columns, loggia of small arches under the cornice, two gate arches
//   Ivanov house (108, w60195635, photo 19): apricot stucco, white frames, triangular hoods, white acanthus frieze, two iron balconies, a central gateway, yellow downpipes
//   "Teatr Sever" house (104, w60195639, photo 28): ochre, the letters ТЕАТР in the top-floor windows, grey ground floor with cafe and confectionery
//   Nevsky Plaza (55, w245953204, photo 63): pale yellow, bay turrets at both ends, central bracket balcony, arched second floor
//   Nevsky Palace hotel (57, r442684, photo 51): sand-beige 6-storey hotel, stacked black balconies, glass entrance canopy
//   House "Rossiya" (61, w52016434, photo 53): grey-lilac with maroon panels, arched windows, one gate arch with a balcony
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { findEdge } from './kit.js';

const FORCE = typeof location !== 'undefined' && /lbextras/.test(location.search);

export function build(K) {
  const want = (id) => FORCE || (L.isClaimed(id) && L.claimedBy(id) === 'landmarksB');
  for (const h of HOUSES) {
    if (!want(h.id)) continue;
    const rec = L.buildingById(h.id);
    if (!rec) continue;
    K.svc.houses.push({ id: h.id, name: h.name, nameEn: h.nameEn, x: rec.cx, z: rec.cz });
    const [ax, az, bx, bz] = h.edge;
    const info = buildHouse(K, {
      recs: [rec], hc: h.hc, wall: h.wall, court: h.court || h.wall, plinth: 0.9, floors: h.courtFloors || [4.4, 4.0, 3.6, 3.4],
      front: (e, c) => { if (!findEdge([e], ax, az, bx, bz, 0.5)) return false; h.front(K, c.len, h); return true; },
      roofMat: K.mats.roofSilver, upstand: 0.45,
    });
    if (h.onRoof) { const fe = info.edges.find((e) => findEdge([e], ax, az, bx, bz, 0.5)); if (fe) K.onEdgeFn(fe, (len) => h.onRoof(K, len, h)); }
  }
}

const bg = ['#2b2622', '#1f2326', '#4a1f26', '#e9e2d0', '#1e3a2a', '#3a2a22'], fg = ['#f0e6cf', '#f4f1e8', '#f3e6d0', '#2a2622', '#efe8d0', '#e8d8b0'];
const chimneys = (K, ys, us, z, mat) => { for (const u of us) { K.P.box(mat, u - 0.5, u + 0.5, ys, ys + 2.1, z - 0.5, z + 0.5, 'b'); K.P.box(K.mats.shade, u - 0.62, u + 0.62, ys + 2.1, ys + 2.28, z - 0.62, z + 0.62, 'b'); } };

// ------------------------------------------------------------------------------------------------ generic rent-house elevation
/** s = { hc, gf, floors: [[y0, y1]..] above the ground floor, wall, base (ground floor colour), pit (bay pitch), win: (fi) => window opts, gate: u fraction, gateW, shops: {...}, balconies: [[fi, bayIndex, nbays]], hoodFloor, frieze } */
function rentFront(K, len, s) {
  const P = K.P, M = K.mats, up = 0.45, trim = s.trimMat || M.trim;
  K.wallQuad(s.baseRust ? K.rust(s.base) : K.wall(s.base), 0, len, 0, s.gf, 2.4, 0, 1.2);
  K.wallQuad(K.wall(s.wall), 0, len, s.gf, s.hc + up, 3);
  P.box(trim, 0, len, s.gf - 0.1, s.gf + 0.2, 0, 0.16, 'k');
  for (const [y0] of s.floors.slice(1)) P.box(trim, 0, len, y0 - 0.07, y0 + 0.1, 0, 0.1, 'k');
  const gu = s.gate != null ? len * s.gate : null, gw = s.gateW ?? 3.4;
  if (gu != null) K.gate(gu, 0, gw, s.gateH ?? 4.0, { sw: 0.34, doorMat: s.gateMat || M.ironSoft, ringMat: trim });
  const sh = s.shops || {};
  const segs = gu != null ? [[1.0, gu - gw / 2 - 0.9], [gu + gw / 2 + 0.9, len - 1.0]] : [[1.0, len - 1.0]];
  segs.forEach(([a, b], i) => { if (b - a > 3) K.shopfront(a, b, { pitch: sh.pitch ?? 5.0, y0: 0.9, y1: s.gf - 1.0, names: (sh.names || []).slice(i * 4, i * 4 + 6), bgs: sh.bgs || bg, fgs: sh.fgs || fg, awn: i === 1 ? sh.awn || [] : [], doors: sh.doors || [], v: i, signH: 0.62 }); });
  const xs = K.bays(s.m ?? 1.3, len - (s.m ?? 1.3), s.pit ?? 2.8);
  s.floors.forEach(([y0, y1], fi) => {
    const o = s.win(fi, y1 - y0);
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      K.window({ x, y: y0 + (o.sill ?? 0.8), w: o.w, h: o.h ?? (y1 - y0 - 1.8), sw: o.sw ?? 0.16, d: o.d ?? 0.09, frame: o.frame || 'brown', hood: o.hood, hoodH: o.hoodH ?? 0.4, hoodOver: o.hoodOver ?? 0.08, head: o.head, surMat: o.surMat || trim, sill: o.sillOn !== false });
      if (o.shell) K.plane(K.R.shell, x - 0.75, x + 0.75, y0 + (o.sill ?? 0.8) + (o.h ?? (y1 - y0 - 1.8)) + 0.55, y0 + (o.sill ?? 0.8) + (o.h ?? (y1 - y0 - 1.8)) + 1.2, 0.1);
    }
  });
  for (const [fi, b0, nb] of s.balconies || []) { const y0 = s.floors[fi][0]; if (xs[b0] && xs[b0 + nb - 1]) K.balcony(xs[b0] - 0.9, xs[b0 + nb - 1] + 0.9, y0 + 0.02, 0.8); }
  if (s.frieze) K.strip(s.frieze, 0.5, len - 0.5, s.hc - 1.55, s.hc - 0.55, 0.04, 4);
  for (const u of s.pipes ?? [0.35, len - 0.35]) K.downpipe(u, 0.9, s.hc - 1.2, s.pipeMat || M.cream);
}

const HOUSES = [
  { id: 'w60195635', name: 'Доходный дом Иванова (Невский 108)', nameEn: 'Ivanov house, Nevsky 108', hc: 17.6, wall: '#e3a56a', court: '#dcc29a', edge: [355.6, 83.7, 328.4, 76.8],
    front: (K, len) => rentFront(K, len, {
      hc: 17.6, gf: 4.6, base: '#efece4', wall: '#e3a56a', floors: [[4.6, 9.2], [9.2, 13.1], [13.1, 16.4]], gate: 0.44, pit: 2.55, m: 1.5, pipeMat: K.mat('#f0a800'), pipes: [len * 0.30, len * 0.70, len - 0.35],
      shops: { names: ['Кофе', 'Сувениры', 'Аптека', 'Цветы', 'Обувь'], awn: [], doors: [] },
      win: (fi) => (fi === 0 ? { w: 1.2, h: 2.4, sw: 0.22, hood: 'tri', hoodH: 0.42 } : fi === 1 ? { w: 1.2, h: 2.1, sw: 0.2 } : { w: 1.2, h: 1.6, sw: 0.2 }),
      balconies: [[0, 3, 3], [0, 8, 3]], frieze: K.R.frieze,
    }),
    onRoof: (K, len) => chimneys(K, 18.05, [5, 12, 20, 27], -4.0, K.mat('#c8a070')) },
  { id: 'w60195639', name: 'Дом с театром «Север» (Невский 104)', nameEn: 'Teatr Sever house, Nevsky 104', hc: 17.4, wall: '#dcaa5c', court: '#d5b277', edge: [303.2, 70.8, 283.5, 65.1],
    front: (K, len) => {
      rentFront(K, len, {
        hc: 17.4, gf: 4.8, base: '#b9b2a8', baseRust: true, wall: '#dcaa5c', floors: [[4.8, 9.0], [9.0, 13.0], [13.0, 16.4]], gate: null, pit: 2.9, m: 1.6,
        shops: { names: ['Кафе «Север»', 'Кондитерская', 'Театр'], bgs: ['#e8e0cf', '#3a2a22', '#1f2326'], fgs: ['#2a2622', '#f3e6d0', '#f4f1e8'], awn: [], doors: [1] },
        win: (fi) => (fi === 0 ? { w: 1.25, h: 2.3, sw: 0.2, hood: 'seg', hoodH: 0.3 } : fi === 1 ? { w: 1.25, h: 2.1, sw: 0.18 } : { w: 1.2, h: 1.7, sw: 0.18 }), balconies: [[1, 2, 2]],
      });
      // the letters ТЕАТР in the windows of the top floor
      K.fascia(3.2, len - 3.2, 13.9, 15.4, 'Т Е А Т Р', { w: 1024, h: 128, fg: '#2f9a68', weight: 700, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.07, fill: 0.9 });
    } },
  { id: 'w245953204', name: 'Невский Плаза (Невский 55)', nameEn: 'Nevsky Plaza, Nevsky 55', hc: 21.5, wall: '#e8e2a4', court: '#ddd4a0', edge: [-74.1, 21.3, -41.0, 29.3],
    front: (K, len) => {
      rentFront(K, len, {
        hc: 21.5, gf: 5.0, base: '#d8d0a0', baseRust: true, wall: '#e8e2a4', floors: [[5.0, 9.4], [9.4, 13.3], [13.3, 17.0], [17.0, 20.2]], gate: null, pit: 2.8, m: 3.6,
        shops: { names: ['Кафе', 'Ресторан', 'Бутик', 'Кофейня'], bgs: ['#e8dcc4', '#4a1f26', '#e9e2d0', '#3a2a22'], fgs: ['#2a2622', '#f3e6d0', '#2a2622', '#e8d8b0'], awn: [0, 1, 2], doors: [] },
        win: (fi) => (fi === 0 ? { w: 1.2, h: 2.5, sw: 0.18, head: 'arch', hood: null } : { w: 1.2, h: 2.1, sw: 0.14 }), balconies: [[1, 5, 2]],
      });
      // turret-like bays at both ends: three levels of glazed bay windows
      for (const [a, b] of [[0.2, 3.0], [len - 3.0, len - 0.2]]) { K.P.box(K.mats.trim, a, b, 5.0, 17.2, 0.0, 0.7, 'kb'); for (const y of [5.6, 9.9, 13.8]) K.window({ x: (a + b) / 2, y, w: 1.4, h: 2.4, sw: 0.14, d: 0.78, frame: 'white', sill: false }); }
    } },
  { id: 'r442684', name: 'Отель «Невский Палас» (Невский 57)', nameEn: 'Nevsky Palace hotel, Nevsky 57', hc: 24.8, wall: '#d9c79f', court: '#d2c096', edge: [-41.0, 29.3, -5.9, 38.1],
    front: (K, len) => {
      rentFront(K, len, {
        hc: 24.8, gf: 5.2, base: '#c9b78f', baseRust: true, wall: '#d9c79f', floors: [[5.2, 9.4], [9.4, 13.4], [13.4, 17.2], [17.2, 20.8], [20.8, 23.9]], gate: null, pit: 2.9, m: 1.5,
        shops: { names: ['Сувениры', 'Отель', 'Кофейня', 'Бутик'], bgs: ['#1f2326', '#2b2622', '#4a1f26', '#e9e2d0'], fgs: ['#f4f1e8', '#e8d8b0', '#f3e6d0', '#2a2622'], awn: [], doors: [] },
        win: (fi) => ({ w: 1.25, h: (fi === 0 ? 2.4 : 2.0), sw: fi === 0 ? 0.2 : 0.14, hood: fi === 0 ? 'seg' : null, hoodH: 0.3 }),
        balconies: [[1, 4, 3], [2, 4, 3], [3, 4, 3]],
      });
      // glass entrance canopy on two posts
      const c = len * 0.5; K.P.box(K.mats.iron, c - 3.2, c + 3.2, 4.1, 4.3, 0.0, 3.0, 'k'); K.P.box(K.mats.glassDark, c - 3.1, c + 3.1, 4.3, 4.34, 0.05, 2.95, 'b');
      for (const s of [-1, 1]) K.P.cyl(K.mats.iron, [c + s * 3.0, 0, 2.8], [c + s * 3.0, 4.1, 2.8], 0.1, 0.1, 8, false);
    } },
  { id: 'w52016434', name: 'Дом «Россия» (Невский 61)', nameEn: 'House Rossiya, Nevsky 61', hc: 17.8, wall: '#b7ada8', court: '#c4b8a8', edge: [30.0, 46.7, 62.4, 54.6],
    front: (K, len) => {
      rentFront(K, len, {
        hc: 17.8, gf: 4.8, base: '#a89f9a', baseRust: true, wall: '#b7ada8', floors: [[4.8, 9.2], [9.2, 13.2], [13.2, 16.6]], gate: 0.5, pit: 2.8, m: 1.5,
        shops: { names: ['Банк', 'Косметика', 'Авиакассы', 'Кофейня'], bgs: ['#e9e9e4', '#e9e2d0', '#1f3d94', '#3a2a22'], fgs: ['#1b4fa8', '#3a2a22', '#ffffff', '#e8d8b0'], awn: [], doors: [] },
        win: (fi) => (fi === 0 ? { w: 1.25, h: 2.6, sw: 0.18, head: 'arch' } : { w: 1.2, h: 2.0, sw: 0.14 }), balconies: [[0, 6, 2]],
      });
      for (const x of K.bays(1.5, len - 1.5, 2.8)) for (const [y0] of [[4.8], [9.2]]) K.P.box(K.mat('#8b4a4f'), x - 0.85, x + 0.85, y0 + 3.65, y0 + 4.05, 0.0, 0.06, 'kb');   // maroon panels
    } },
  colosseum(),
];

// ------------------------------------------------------------------------------------------------ the Colosseum house (Nevsky 100)
function colosseum() {
  return {
    id: 'w60195636', name: 'Доходный дом Лопатина «Колизей» (Невский 100)', nameEn: 'Lopatin house with the Kolizey cinema, Nevsky 100', hc: 18.4, wall: '#c5c8b2', court: '#c8c8a8', edge: [262.2, 60.0, 222.1, 49.9],
    front: (K, len) => {
      const P = K.P, M = K.mats, up = 0.45, hc = 18.4, GF = 5.2, F1 = 9.7, F2 = 13.9, F3 = 17.0;
      const wall = K.wall('#c5c8b2'), ring = K.mat('#efefe2');
      K.wallQuad(K.rust('#b3b69f'), 0, len, 0, GF, 2.4, 0, 1.2);
      K.wallQuad(wall, 0, len, GF, hc + up, 3);
      for (const y of [GF, F1, F2]) P.box(M.trim, 0, len, y - 0.1, y + 0.2, 0, 0.18, 'k');
      // ground floor: two gate arches (the Kolizey passage) + shops
      const g1 = len * 0.42, g2 = g1 + 5.6;
      K.gate(g1, 0, 3.0, 4.2, { sw: 0.34, doorMat: M.doorDark, open: false });
      K.gate(g2, 0, 3.0, 4.2, { sw: 0.34, doorMat: M.doorDark, open: false });
      K.fascia(g1 - 1.6, g1 + 1.6, GF - 0.85, GF - 0.2, 'КОЛИЗЕЙ', { w: 512, h: 96, bg: '#3a3f38', fg: '#e8e0cf', font: K.ctx.tex.FONTS.serif, z: 0.08, fill: 0.9 });
      K.shopfront(1.0, g1 - 2.8, { pitch: 4.4, y0: 0.9, y1: 3.8, names: ['Кофейня', 'Одежда'], bgs: ['#e8dcc4', '#1f2326'], fgs: ['#2a2622', '#f4f1e8'], awn: [], doors: [] });
      K.shopfront(g2 + 2.8, len - 1.0, { pitch: 4.6, y0: 0.9, y1: 3.8, names: ['Подарки', 'Кофейня', 'Шоколад', 'Табак'], bgs: ['#c8202a', '#e9e2d0', '#3a2a22', '#f2c230'], fgs: ['#ffffff', '#2a2622', '#e8d8b0', '#2a2622'], awn: [], doors: [2] });
      // 1st upper storey: arched windows with engaged columns between them
      const xs1 = K.bays(1.2, len - 1.2, 2.6);
      for (const x of xs1) K.window({ x, y: GF + 0.8, w: 1.2, h: 3.0, head: 'arch', sw: 0.2, d: 0.1, surMat: ring, frame: 'brown', sill: false });
      for (let i = 0; i <= xs1.length; i++) { const x = i === 0 ? 0.45 : i === xs1.length ? len - 0.45 : (xs1[i - 1] + xs1[i]) / 2; P.cyl(ring, [x, GF + 0.2, 0.2], [x, F1 - 0.4, 0.2], 0.17, 0.15, 8, false); P.box(ring, x - 0.24, x + 0.24, F1 - 0.4, F1 - 0.2, 0, 0.4, 'kb'); }
      // 2nd upper storey: big arched windows in the middle, plain ones at the ends, two iron balconies
      const xs2 = K.bays(1.2, len - 1.2, 3.2);
      xs2.forEach((x, i) => {
        const mid = i >= 2 && i <= xs2.length - 3;
        K.window({ x, y: F1 + (mid ? 0.7 : 0.9), w: mid ? 1.6 : 1.2, h: mid ? 3.1 : 2.1, head: mid ? 'arch' : 'flat', sw: mid ? 0.26 : 0.18, d: 0.1, surMat: ring, frame: 'brown', sill: !mid });
      });
      K.balcony(xs2[3] - 1.9, xs2[3] + 1.9, F1 + 0.02, 0.8); K.balcony(xs2[xs2.length - 2] - 1.9, xs2[xs2.length - 2] + 1.9, F1 + 0.02, 0.8);
      // top: loggia of small arches with paired columns in two stretches
      const loggia = (u0, u1) => {
        const n = Math.round((u1 - u0) / 1.5), p = (u1 - u0) / n;
        P.box(K.mat('#6e7a6a'), u0, u1, F2 + 0.2, F3 - 0.1, -0.1, 0.0, 'kf');
        for (let i = 0; i < n; i++) { const x = u0 + p * (i + 0.5); K.window({ x, y: F2 + 0.4, w: p - 0.5, h: 2.2, head: 'arch', sw: 0.1, d: 0.08, surMat: ring, frame: 'white', sill: false, v: 1 }); }
        for (let i = 0; i <= n; i++) { const x = u0 + p * i; P.cyl(ring, [x, F2 + 0.2, 0.15], [x, F3 - 0.5, 0.15], 0.1, 0.09, 6, false); }
        P.box(ring, u0, u1, F3 - 0.5, F3 - 0.3, 0, 0.3, 'kb');
      };
      loggia(3.0, len * 0.40); loggia(len * 0.62, len - 3.0);
      P.box(M.trim, 0, len, F3 - 0.1, F3 + 0.15, 0, 0.18, 'k');
      for (const u of [len * 0.30, len * 0.57, len - 0.35]) K.downpipe(u, 0.9, hc - 1.2, K.mat('#9aa0a0'));
    },
    onRoof: (K, len) => chimneys(K, 18.85, [8, 20, 30], -4.5, K.mat('#9a8f80')),
  };
}
