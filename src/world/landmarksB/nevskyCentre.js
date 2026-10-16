// landmarksB/nevskyCentre.js - Nevsky Centre, the shopping centre at Nevsky 114-116 / Ligovsky pr. (OSM r1784115, 85 m on Nevsky, ~150 m on Ligovsky).
//
// Photos refs/nevsky/30 (Nevsky 114 from the south side), 29 (112 + 114), 39/40: the Nevsky front of the centre is the old ORANGE house 114 (ochre-orange stucco #e5a24f, six large
// round arches on the ground floor, two window storeys, a white frieze of rosettes under a heavy cornice at 15.3 m) with a modern setback on top: a storey of dark brown louvred
// cladding with yellow chimney-like boxes and a blue glass pitched roof (to ~25 m); its east end at the Ligovsky corner is the pale ornate house 116 (cream stucco, 5 storeys,
// cornice 21 m).  The long Ligovsky front is a cream historicist wall with a ground-floor arcade of tall glazed arches.
//   u on the front runs west -> east (viewer on the south side): orange house 0..53 m, corner house 53..85 m.
import { buildHouse } from './house.js';
import { ringFromFlat } from '../lib/massing.js';
import { polyOf } from './kit.js';

const ORANGE = '#e5a24f', CREAM = '#e6d6a8', LIG = '#e4d3a4', COURT = '#dcc89a';
const HC_O = 15.3, HC_C = 21.0, HC_L = 19.0, SPLIT = 53.0;
const WEST = [391.0, 92.6], EAST = [473.7, 113.6];

export function build(K) {
  const L = K.L;
  const rec = L.groupMembers('nevsky-centre').find((r) => r.id === 'r1784115');
  if (!rec) return;
  K.svc.houses.push({ id: 'r1784115', name: 'ТЦ «Невский Центр» (Невский 114-116)', nameEn: 'Nevsky Centre, Nevsky 114-116', x: 443, z: 39 });
  K.svc.photoSpots.push({ x: 425, z: 140, yaw: L.yawToward(425, 140, 430, 98), pitch: 10, name: 'Невский Центр' });
  const total = Math.hypot(EAST[0] - WEST[0], EAST[1] - WEST[1]);
  const polysOf = (r) => {
    if (r !== rec) return r.polys;
    const ring = ringFromFlat(r.polys[0].o);
    const k = ring.findIndex((p) => Math.hypot(p[0] - EAST[0], p[1] - EAST[1]) < 0.2);
    const t = (total - SPLIT) / total;
    const sp = [EAST[0] + (WEST[0] - EAST[0]) * t, EAST[1] + (WEST[1] - EAST[1]) * t];
    const out = ring.slice(0, k + 1).concat([sp], ring.slice(k + 1));
    return [polyOf(out)];
  };
  const onFront = (e) => Math.abs(e.n[0] + 0.24) < 0.06 && Math.abs(e.n[1] - 0.97) < 0.05 && e.len > 10;
  const isOrange = (e) => onFront(e) && (e.a[0] + e.b[0]) / 2 < 391 + (SPLIT * 0.97) + 2;
  const isCorner = (e) => onFront(e) && !isOrange(e);
  const isLig = (e) => e.n[0] > 0.97 && e.len > 20;
  const info = buildHouse(K, {
    recs: [rec], hc: HC_O, hcEdge: (e) => (isCorner(e) ? HC_C : isLig(e) ? HC_L : null), wall: ORANGE, court: COURT, polysOf, plinth: 0.9, floors: [5.6, 4.4, 4.0, 3.8, 3.6],
    roofHc: HC_O, collideH: HC_C, courtPitch: 3.0,
    front: (e, c) => {
      if (isOrange(e)) { orange(K, c.len); return true; }
      if (isCorner(e)) { cornerHouse(K, c.len); return true; }
      if (isLig(e)) { ligovsky(K, c.len); return true; }
      return false;
    },
    roofMat: K.mats.roofSilver,
  });
  const oe = info.edges.find(isOrange);
  if (oe) K.onEdgeFn(oe, (len) => setback(K, len));
}

// ------------------------------------------------------------------------------------------------ the orange house 114
function orange(K, len) {
  const P = K.P, M = K.mats, up = 0.45, GF = 5.6, F1 = 10.2;
  const wall = K.wall(ORANGE);
  K.wallQuad(K.rust('#d9a063'), 0, len, 0, 1.6, 2.4, 0, 1.2);
  K.wallQuad(wall, 0, len, 1.6, HC_O + up, 3);
  P.box(M.trim, 0, len, GF - 0.1, GF + 0.18, 0, 0.14, 'k');
  P.box(M.trim, 0, len, F1 - 0.08, F1 + 0.12, 0, 0.1, 'k');
  // ground floor: six round arches (glazed entrances) at 9 m pitch
  const arches = [5.5, 14.5, 23.5, 32.5, 41.5, 50.5];
  arches.forEach((u, i) => {
    K.shopWindow(u, 0.9, 4.4, 4.2, { head: 'arch', fw: 0.3, v: i });
    // key block of each arch
    K.plaque(M.trim, u, 5.1, 0.6, 0.5, 0.1);
  });
  const names = ['Одежда', 'Кофейня', 'Обувь', 'Бургерная', 'Ресторан', 'Электроника'];
  arches.slice(0, -1).forEach((u, i) => K.fascia(u + 2.7, u + 6.3, 4.1, 4.8, names[i], { w: 512, h: 96, bg: ['#2b2622', '#c8202a', '#1f2326', '#3a2a22', '#e9e2d0'][i % 5], fg: i % 5 === 4 ? '#2a2622' : '#f4efe6', font: K.ctx.tex.FONTS.round, z: 0.06 }));
  K.fascia(10.0, 19.0, 4.55, 5.3, 'ТОРГОВЫЙ ЦЕНТР «НЕВСКИЙ»', { w: 1024, h: 96, bg: '#e8e0cf', fg: '#3a342c', font: K.ctx.tex.FONTS.round, z: 0.05, fill: 0.9 });
  // two window storeys, 17 bays
  const xs = K.bays(1.2, len - 1.2, 3.05);
  xs.forEach((x, i) => {
    K.window({ x, y: GF + 0.8, w: 1.2, h: 2.6, sw: 0.14, d: 0.08, frame: 'brown', hood: i > xs.length * 0.5 ? 'tri' : null, hoodH: 0.35, hoodOver: 0.05, sill: true });
    K.window({ x, y: F1 + 0.8, w: 1.2, h: 2.1, sw: 0.14, d: 0.08, frame: 'brown', sill: true });
  });
  K.balcony(xs[6] - 1.4, xs[6] + 1.4, F1 + 0.02, 0.8, { slabMat: M.trim });
  // frieze of white rosettes under the cornice
  K.strip(M.rosette, 0.5, len - 0.5, HC_O - 1.75, HC_O - 0.75, 0.04, 2);
  P.box(M.trim, 0, len, HC_O - 1.85, HC_O - 1.75, 0, 0.1, 'k');
  for (const u of [0.35, len - 0.35]) K.downpipe(u, 0.9, HC_O - 1.2, M.cream);
}

/** the modern setback above the orange house: louvred brown cladding, yellow chimney boxes, a blue glass roof */
function setback(K, len) {
  const P = K.P, M = K.mats, y0 = HC_O + 0.45;
  const tex = K.ctx.tex;
  const louv = K.mat('#ffffff', { map: tex.draw(128, 128, (g, w, h) => { g.fillStyle = '#5a463a'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#3f3029' : '#6a5446'; g.fillRect(0, i * 8, w, 4); } }, { key: 'lmB-louvre', repeat: [1, 1] }) });
  const glassTex = K.mat('#ffffff', { map: tex.draw(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fc9ee'); gr.addColorStop(1, '#5b8fc4'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#e9eef2'; for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 2, 0, 4, h); g.fillRect(0, i * 64 - 2, w, 4); } }, { key: 'lmB-glassroof', repeat: [1, 1] }), side: 'double' });
  const zf = -5.0, hTop = y0 + 6.0;
  P.quad(louv, [2, y0, zf], [len - 2, y0, zf], [len - 2, hTop, zf], [2, hTop, zf], [0, 0, 1], [[0, 0], [(len - 4) / 3, 0], [(len - 4) / 3, 6 / 3], [0, 6 / 3]]);
  P.box(M.chimneyYellow, 2, len - 2, hTop, hTop + 0.3, zf - 0.1, zf + 0.5, 'b');
  for (let u = 6.5; u < len - 3; u += 8.6) {
    P.box(M.chimneyYellow, u - 1.3, u + 1.3, y0, y0 + 4.2, zf - 0.2, zf + 1.5, 'b');
    P.box(M.roofRust, u - 1.5, u + 1.5, y0 + 4.2, y0 + 4.5, zf - 0.3, zf + 1.6, 'b');
    P.push(0, 0, zf, 0); K.window({ x: u + 4.3, y: y0 + 1.3, w: 0.7, h: 1.0, sw: 0.1, d: 0.06, frame: 'white', sill: false, surMat: M.trim }); P.pop();
  }
  // glass roof: pitched, up and back from the top of the cladding
  const zb = zf - 8.0, yb = hTop + 3.4;
  P.quad(glassTex, [3, hTop + 0.3, zf - 0.2], [len - 3, hTop + 0.3, zf - 0.2], [len - 3, yb, zb], [3, yb, zb], [0, 0.9, 0.4], [[0, 0], [(len - 6) / 4, 0], [(len - 6) / 4, 2], [0, 2]]);
  P.box(K.mats.iron, 3, len - 3, yb - 0.1, yb + 0.1, zb - 0.1, zb + 0.1, '');
}

// ------------------------------------------------------------------------------------------------ the corner house 116 (u from the split)
function cornerHouse(K, len) {
  const P = K.P, M = K.mats, up = 0.45, GF = 5.0, FL = [[GF, 9.4], [9.4, 13.4], [13.4, 17.2], [17.2, 20.4]];
  const wall = K.wall(CREAM);
  K.wallQuad(K.rust('#d7c694'), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(wall, 0, len, GF, HC_C + up, 3);
  P.box(M.trim, 0, len, GF - 0.1, GF + 0.22, 0, 0.2, 'k');
  K.shopfront(1.0, len - 1.0, { pitch: 5.4, y0: 0.9, y1: 4.0, names: ['Часы', 'Кофе', 'Книги', 'Сувениры', 'Парфюмерия'], bgs: ['#e9e2d0', '#4a1f26', '#1e3a2a', '#1f2326', '#3a2a22'], fgs: ['#2a2622', '#f3e6d0', '#efe8d0', '#f4f1e8', '#e8d8b0'], awn: [1], doors: [] });
  const xs = K.bays(1.3, len - 1.3, 2.7);
  FL.forEach(([y0, y1], fi) => { for (const x of xs) K.window({ x, y: y0 + 0.8, w: 1.15, h: y1 - y0 - 1.8, sw: fi === 0 ? 0.2 : 0.14, d: 0.09, frame: 'brown', hood: fi === 0 ? 'tri' : fi === 1 ? 'seg' : null, hoodH: 0.35, hoodOver: 0.05 }); });
  for (let i = 0; i <= xs.length; i += 2) { const x = i === 0 ? 0.25 : i >= xs.length ? len - 0.25 : (xs[i - 1] + xs[i]) / 2; K.pilaster(M.trim, x, 0.5, GF + 0.22, HC_C - 1.15, 0.1, 0.32); }
  for (const y of [9.3, 13.3, 17.1]) P.box(M.trim, 0, len, y, y + 0.14, 0, 0.1, 'k');
  K.balcony(xs[2] - 1.4, xs[2] + 1.4, FL[1][0] + 0.02, 0.8);
  K.balcony(xs[Math.min(6, xs.length - 1)] - 1.4, xs[Math.min(6, xs.length - 1)] + 1.4, FL[1][0] + 0.02, 0.8);
  K.downpipe(0.3, 0.9, HC_C - 1.2, M.cream); K.downpipe(len - 0.3, 0.9, HC_C - 1.2, M.cream);
}

// ------------------------------------------------------------------------------------------------ Ligovsky front
function ligovsky(K, len) {
  const P = K.P, M = K.mats, up = 0.45, GF = 5.4, FL = [[GF, 9.4], [9.4, 13.2], [13.2, 16.5]];
  K.wallQuad(K.rust('#d6c492'), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(K.wall(LIG), 0, len, GF, HC_L + up, 3);
  P.box(M.trim, 0, len, GF - 0.1, GF + 0.2, 0, 0.16, 'k');
  // ground floor arcade of tall arches
  const n = Math.max(1, Math.round((len - 2) / 6.0)), p = (len - 2) / n;
  for (let i = 0; i < n; i++) { const u = 1 + p * (i + 0.5); K.shopWindow(u, 0.9, p - 1.6, 4.0, { head: 'arch', fw: 0.24, v: i }); }
  const xs = K.bays(1.2, len - 1.2, 2.7);
  FL.forEach(([y0, y1], fi) => { for (const x of xs) K.window({ x, y: y0 + 0.8, w: 1.2, h: y1 - y0 - 1.8, sw: 0.14, d: 0.08, frame: 'brown', sill: true, hood: fi === 0 ? 'seg' : null, hoodH: 0.3, hoodOver: 0.05 }); });
  for (const y of [9.3, 13.1, 16.4]) P.box(M.trim, 0, len, y, y + 0.14, 0, 0.1, 'k');
  for (let u = 12; u < len - 6; u += 24) K.downpipe(u, 0.9, HC_L - 1.2, M.cream);
}
