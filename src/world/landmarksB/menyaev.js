// landmarksB/menyaev.js - Nevsky 90-92 (OSM w60195756: Menyaev house by A. K. Bruni 1866-67, the peach "San Remo" corner house of Mayakovskogo ul.) + its courtyard wing w103591279.
//
// Photo refs/nevsky/15 (peach #e9b896 stucco with white trim, 4 storeys, rounded corner bay toward Mayakovskogo ul., shell-and-cartouche hoods over the first-floor windows, brow
// cornices on the second, plain third, bright green sheet-iron roof with an iron railing and green chimneys, vertical pilaster strips with downpipes), 16 (the neighbour Menyaev 92
// detail: scalloped hoods, Corinthian-capital pilasters).  Cornice 17.4 m, ground floor 4.7 m shops with generic tenants.
import { buildHouse } from './house.js';
import { ringFromFlat } from '../lib/massing.js';
import { roundCorner, polyOf, findEdge } from './kit.js';

const HC = 17.4, FL = [[4.7, 8.9], [8.9, 12.9], [12.9, 16.6]];
const PEACH = '#e9b896', COURT = '#dcc4a2', GREEN = '#3f9a45';
const CORNER = [72.4, 12.4];

export function build(K) {
  const L = K.L, P = K.P, M = K.mats;
  const all = L.groupMembers('yusupova').filter((r) => !r.skip && ['w654311196', 'w654311199', 'w654311206', 'w654311208', 'w103591279'].includes(r.id));
  K.svc.houses.push({ id: 'w60195756', name: 'Дом Меняева (90-92, «Сан-Ремо»)', nameEn: 'Menyaev house, Nevsky 90-92 (Bruni 1866-67)', x: 62, z: -17 });
  K.svc.photoSpots.push({ x: 40, z: 40, yaw: L.yawToward(40, 40, 62, 8), pitch: 12, name: 'Дом Меняева · угол Маяковского' });
  const near = (e, ax, az, bx, bz) => !!findEdge([e], ax, az, bx, bz, 0.45);
  const polysOf = (rec) => {
    if (rec.id !== 'w654311208') return rec.polys;
    const ring = ringFromFlat(rec.polys[0].o), k = ring.findIndex((p) => Math.hypot(p[0] - CORNER[0], p[1] - CORNER[1]) < 0.2);
    return [polyOf(roundCorner(ring, k, 3.6, 5))];
  };
  const isFront = (e) => near(e, 41.5, 4.8, 72.4, 12.4) || (e.rec && e.rec.id === 'w654311208' && e.len > 20 && Math.abs(e.n[0] + 0.24) < 0.08 && Math.abs(e.n[1] - 0.97) < 0.05);
  const isSide = (e) => e.rec && e.rec.id === 'w654311208' && e.len > 14 && Math.abs(e.n[0] - 0.97) < 0.06;
  const isArc = (e) => e.rec && e.rec.id === 'w654311208' && e.len < 3 && Math.hypot((e.a[0] + e.b[0]) / 2 - CORNER[0], (e.a[1] + e.b[1]) / 2 - CORNER[1]) < 4.3;
  const info = buildHouse(K, {
    recs: all, hc: HC, hcOf: (r) => (r.id === 'w654311199' || r.id === 'w654311206' ? 13.4 : r.id === 'w103591279' ? 15.8 : HC), wall: PEACH, court: COURT, polysOf, plinth: 0.9,
    floors: [4.4, 4.0, 3.7, 3.5],
    front: (e, c) => {
      if (isFront(e)) { front(K, c.len); return true; }
      if (isSide(e)) { side(K, c.len); return true; }
      if (isArc(e)) { arc(K, c.len); return true; }
      return false;
    },
    bands: [
      { y0: 4.55, y1: 4.8, d: 0.1, mat: M.trim, draw: (e) => isFront(e) || isSide(e) || isArc(e) },
      { y0: 8.8, y1: 9.0, d: 0.08, mat: M.trim, draw: (e) => isFront(e) || isSide(e) || isArc(e) },
      { y0: 12.8, y1: 13.0, d: 0.08, mat: M.trim, draw: (e) => isFront(e) || isSide(e) || isArc(e) },
    ],
    roofMat: K.mat(GREEN),
  });
  // green pitched roof over the street front + hipped at the corner, chimneys
  const fe = info.edges.find((e) => isFront(e));
  if (fe) {
    const f = K.THREE; void f;
    K.onEdgeFn(fe, (len) => K.gable(0.0, len, HC + 0.45, 9, 2.8, K.mat(GREEN), { hipL: false, hipR: true, chimneys: [len * 0.2, len * 0.55] }));
  }
  const se = info.edges.find((e) => isSide(e));
  if (se) K.onEdgeFn(se, (len) => K.gable(0, len, HC + 0.45, 7, 2.2, K.mat(GREEN), { hipL: true, hipR: false }));
}

const NAMES = ['Кофейня', 'Одежда и обувь', 'Аптека', 'Салон связи', 'Сувениры', 'Часы'];
const BG = ['#2b2622', '#1f2326', '#4a1f26', '#e9e2d0', '#1e3a2a', '#3a2a22'], FG = ['#f0e6cf', '#f4f1e8', '#f3e6d0', '#2a2622', '#efe8d0', '#e8d8b0'];

function elevation(K, len, o) {
  const P = K.P, M = K.mats, up = 0.45;
  K.wallQuad(K.wall(PEACH), 0, len, 0, HC + up, 3);
  // ground floor: pale base band + shop windows with signs
  K.wallQuad(K.rust('#dcb896'), 0, len, 0, 4.7, 2.4, 0.01, 1.2);
  K.shopfront(o.shop[0], o.shop[1], { pitch: 4.8, y0: 0.9, y1: 3.9, names: o.names, bgs: BG, fgs: FG, awn: o.awn || [], doors: o.doors || [], pier: 0.7 });
  const xs = K.bays(o.win[0], o.win[1], 2.65);
  FL.forEach(([y0, y1], fi) => {
    const fh = y1 - y0;
    for (const x of xs) {
      const h = fh - 1.7;
      K.window({ x, y: y0 + 0.8, w: 1.1, h, sw: 0.15, d: 0.08, frame: 'brown', hood: fi === 0 ? 'seg' : null, hoodH: 0.4, hoodOver: 0.1, sill: true });
      if (fi === 0) K.plane(K.R.shell, x - 0.8, x + 0.8, y0 + 0.8 + h + 0.55, y0 + 0.8 + h + 1.25, 0.1);
      if (fi === 1) P.box(M.trim, x - 0.75, x + 0.75, y0 + 0.8 + h + 0.15, y0 + 0.8 + h + 0.3, 0, 0.2, 'k');
    }
  });
  return xs;
}

function front(K, len) {
  const M = K.mats, P = K.P;
  const xs = elevation(K, len, { shop: [1.0, len - 1.0], win: [1.2, len - 1.2], names: NAMES, doors: [2], awn: [0, 4] });
  // pilaster strips (every third boundary) from the first floor to the cornice + downpipes
  for (let i = 3; i < xs.length; i += 3) { const x = (xs[i - 1] + xs[i]) / 2; K.pilaster(M.trim, x, 0.42, 4.8, HC - 1.15, 0.07, 0.3); }
  for (const u of [0.35, len - 0.35]) K.downpipe(u, 0.9, HC - 1.2, K.mats.cream);
  // iron balconies on two windows of the third floor
  for (const k of [3, 8]) if (xs[k]) K.balcony(xs[k] - 0.9, xs[k] + 0.9, FL[1][0] + 0.02, 0.6);
}

function side(K, len) {
  elevation(K, len, { shop: [1.0, len - 1.0], win: [1.2, len - 1.2], names: ['Кафе', 'Цветы', 'Сувениры'].slice(0, Math.round(len / 5)), awn: [0] });
  K.downpipe(0.35, 0.9, HC - 1.2, K.mats.cream); K.downpipe(len - 0.35, 0.9, HC - 1.2, K.mats.cream);
}

function arc(K, len) {
  const M = K.mats, up = 0.45;
  K.wallQuad(K.wall(PEACH), 0, len, 0, HC + up, 3);
  K.wallQuad(K.rust('#dcb896'), 0, len, 0, 4.7, 2.4, 0.01, 1.2);
  if (len > 0.8) {
    K.shopWindow(len / 2, 0.9, Math.min(len * 0.9, 1.4), 3.0, { fw: 0.1 });
    FL.forEach(([y0, y1], fi) => K.window({ x: len / 2, y: y0 + 0.8, w: Math.min(len * 0.85, 1.1), h: y1 - y0 - 1.7, sw: 0.15, d: 0.08, frame: 'brown', hood: fi === 0 ? 'seg' : null, hoodH: 0.4, sill: false }));
  }
}
