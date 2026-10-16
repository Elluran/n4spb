// landmarksB/atrium.js - Nevsky Atrium (Nevsky 71 / Marata 1/71, OSM r15081493 = parts r15081487 + r15081488) with the Mayakovskaya metro entrance.
//
// Photos: refs/nevsky/57 (the corner house from the Marata crossing: peach stucco, white pilaster strips, red roof lettering, rounded corner, row of arches), 64 (the arch row with
// "станция МАЯКОВСКАЯ" and the blue M above 3 open arches), 05/06 (street views).  Facts used:
//  * the footprint has a NOTCH 13.7 x 5.6 m on the Nevsky front (x 189..203, z 91..95): above 5.8 m the part r15081487 closes it, so the notch is an open RECESS (vestibule porch)
//    behind a row of round arches in the front wall. The metro portal is in the BACK wall of the recess (OSM node n4060185664 at (196, 93.2)); the exit n1109163128 (216, 115) is in
//    the Marata wall.  Both are `layout.DOORWAYS` entries of the metro module (bldg r15081488): where they exist the wall has a real arched hole, otherwise glazed doors.
//  * 5 storeys: ground 5.8 m (arches, shop windows), 1st floor 4.2 m rusticated, then 3.9 / 3.7 / 3.5; cornice 22.2 m; iron roof railing; red roof lettering on both fronts.
//  * the corner (Nevsky x Marata) is rounded (R 4 m).
import { buildHouse } from './house.js';
import { ringFromFlat } from '../lib/massing.js';
import { roundCorner, polyOf, findEdge, localOnEdge, onEdge } from './kit.js';

const HC = 22.2, GF = 5.8;
const FLOORS = [[GF, 10.0], [10.0, 13.9], [13.9, 17.6], [17.6, 21.1]];
const PEACH = '#e2a98c', PEACH_SHADE = '#d99f82', COURT = '#d9c9a8';
const CORNER = [222.5, 93.9];

export function build(K) {
  const L = K.L, P = K.P, M = K.mats;
  const recs = L.groupMembers('atrium').filter((r) => !r.skip);
  const r87 = recs.find((r) => r.id === 'r15081487'), r88 = recs.find((r) => r.id === 'r15081488');
  if (!r87 || !r88) throw new Error('atrium records missing');
  const mine = [r87, r88];
  // metro doorways of this building (layout.DOORWAYS, owned by the metro module); fallback = the OSM entrance / exit nodes
  const dw = (L.DOORWAYS || []).filter((d) => d.bldg === 'r15081488' || d.bldg === 'r15081493' || d.bldg === 'r15081487');
  const hasDW = dw.length > 0;
  const inD = dw.find((d) => d.kind === 'entrance') || dw.find((d) => /in/.test(d.id) && Math.abs(d.x - 196) < 20) || { x: 196, z: 93.2, w: 3.2 };
  const outD = dw.find((d) => d.kind === 'exit') || dw.find((d) => /out/.test(d.id)) || { x: 215.8, z: 115, w: 3.2 };
  K.svc.houses.push({ id: 'r15081493', name: 'Невский Атриум', nameEn: 'Nevsky Atrium (Nevsky 71, Mayakovskaya metro)', x: 194, z: 122 });
  K.svc.entrances.push({ x: inD.x, z: inD.z, rotY: Math.PI, bldg: 'r15081488', kind: 'metro-entrance' }, { x: outD.x, z: outD.z, rotY: Math.PI / 2, bldg: 'r15081488', kind: 'metro-exit' });
  K.svc.photoSpots.push({ x: 232, z: 128, yaw: L.yawToward(232, 128, 205, 94), pitch: 8, name: 'Невский Атриум · Маяковская' });

  // ---- footprints (the Marata corner rounded)
  const polysOf = (rec) => {
    if (rec.id !== 'r15081488') return rec.polys;
    const ring = ringFromFlat(rec.polys[0].o);
    const k = ring.findIndex((p) => Math.hypot(p[0] - CORNER[0], p[1] - CORNER[1]) < 0.2);
    return [polyOf(roundCorner(ring, k, 4.2, 5))];
  };
  const near = (e, ax, az, bx, bz) => !!findEdge([e], ax, az, bx, bz, 0.35);
  const isFront87 = (e) => near(e, 190.6, 86.1, 203.6, 89.3);
  const isRecessBack = (e) => near(e, 188.9, 91.4, 202.2, 94.8);
  const isRecessEast = (e) => near(e, 203.6, 89.3, 202.2, 94.8);
  // the long Nevsky front of the main block (corner arc end -> recess) and the Marata front
  const isFront88 = (e) => e.rec === r88 && Math.abs(e.n[0] - 0.24) < 0.06 && Math.abs(e.n[1] + 0.97) < 0.06 && e.a[0] > 203 && e.len > 10;
  const isMarata = (e) => e.rec === r88 && e.len > 30 && e.n[0] > 0.9;
  const isArc = (e) => e.rec === r88 && e.len < 3 && Math.hypot((e.a[0] + e.b[0]) / 2 - CORNER[0], (e.a[1] + e.b[1]) / 2 - CORNER[1]) < 5.2;

  let nevskyLen = 0;
  const frontEdge = { e: null };
  const info = buildHouse(K, {
    collide: (rec) => rec !== r87,                       // r87 only bridges the open porch above 5.8 m: no wall across the arches
    recs: mine, hc: HC, wall: PEACH, court: COURT, polysOf, plinth: 0.9, floors: [5.8, 4.2, 3.9, 3.7, 3.5],
    party: (e, rec) => {
      if (rec === r87) return !isFront87(e);
      if (isRecessBack(e) || isRecessEast(e)) return false;
      return null;
    },
    noBand: (e) => isRecessBack(e) || isRecessEast(e),
    noPlinth: (e) => isFront87(e),
    front: (e, c) => {
      if (isFront87(e)) return true;                                         // drawn together with the main front below
      if (isFront88(e)) { nevskyLen = c.len + 13.4; frontEdge.e = e; nevskyFront(K, e, c.len + 13.4, inD, hasDW, c.len); return true; }
      if (isRecessBack(e)) { recessBack(K, e, c.len, inD, hasDW); return true; }
      if (isRecessEast(e)) { K.wallQuad(K.wall('#cdb89a'), 0, c.len, 0, GF, 3); return true; }
      if (isMarata(e)) { marataFront(K, e, c.len, outD, hasDW); return true; }
      if (isArc(e)) { cornerArc(K, e, c.len); return true; }
      return false;
    },
  });
  // recess: ceiling + floor + the plinth stub
  P.cap(K.mat('#cbb497'), [[190.6, 86.1], [203.6, 89.3], [202.2, 94.8], [188.9, 91.4]], GF, false, 4);
  P.cap(M.granite, [[190.6, 86.1], [203.6, 89.3], [202.2, 94.8], [188.9, 91.4]], 0.04, true, 2);
  // roof lettering (red) on the Nevsky and Marata fronts
  roofSigns(K, info.edges.find((e) => e.rec === r88 && isFront88(e)), info.edges.find((e) => e.rec === r88 && isMarata(e)));
  void nevskyLen; void frontEdge;
}

// ------------------------------------------------------------------------------------------------ the Nevsky front (frame of the main front edge, u = 0 at the corner end)
function nevskyFront(K, e, Lc, inD, hasDW, lenMain) {
  const P = K.P, M = K.mats, up = 0.45;
  const wall = K.wall(PEACH), rust = K.rust(PEACH_SHADE);
  // arches: 3 open ones in front of the recess (u from e4.len), 3 shop arches toward the corner
  const uP = localOnEdge(e, inD.x, inD.z).u, pitch = 4.1, aw = 2.8, ah = 4.4;
  const open = [uP - pitch, uP, uP + pitch].filter((u) => u > lenMain + 0.2 && u < Lc - 0.2);
  const shops = [lenMain - 2.3, lenMain - 2.3 - pitch, lenMain - 2.3 - 2 * pitch].filter((u) => u > 1.4);
  const holes = open.map((u) => ({ x: u, y0: 0, w: aw, h: ah, head: 'arch' }));
  K.wallWithHoles(wall, 0, Lc, 0, GF, holes, 3);
  // ground floor stucco rings, shop windows, doors
  for (const u of open) K.surround(M.trim, u, 0, aw, ah, 'arch', 0.28, 0.12);
  shops.forEach((u, i) => {
    K.shopWindow(u, 0.9, aw, ah - 0.9, { head: 'arch', fw: 0.28, v: i + 1 });
  });
  // first-floor string course carrying the lettering band
  P.box(M.trim, 0, Lc, GF - 0.1, GF + 0.32, 0, 0.3, 'k');
  P.box(M.trim, 0, Lc, GF - 0.45, GF - 0.1, 0, 0.12, 'k');
  K.fascia(0.6, lenMain - 0.4, GF - 1.1, GF - 0.5, 'НЕВСКИЙ АТРИУМ', { w: 1024, h: 96, fg: '#c8202a', weight: 700, transparent: true, font: K.ctx.tex.FONTS.serif, z: 0.04, fill: 0.96 });
  // Mayakovskaya sign over the open arches: grey lettering + the blue M pictogram
  const uMid = (open[0] + open[open.length - 1]) / 2;
  K.fascia(uMid - 3.6, uMid + 1.4, GF - 1.25, GF - 0.55, 'станция МАЯКОВСКАЯ', { w: 1024, h: 128, fg: '#3c3a38', weight: 600, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.04, align: 'center' });
  K.fascia(uMid - 5.0, uMid - 3.7, GF - 1.45, GF - 0.35, 'М', { w: 128, h: 128, fg: '#1795d4', weight: 800, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.04, size: 0.95 });
  // upper floors
  const xs = K.bays(1.0, Lc - 1.0, 2.75), p = xs[1] - xs[0];
  K.wallQuad(rust, 0, Lc, GF + 0.32, FLOORS[0][1], 2.4, 0, 1.2);
  K.wallQuad(wall, 0, Lc, FLOORS[0][1], HC + up, 3);
  P.box(M.trim, 0, Lc, FLOORS[0][1] - 0.15, FLOORS[0][1] + 0.12, 0, 0.14, 'k');
  FLOORS.forEach(([y0, y1], fi) => {
    const fh = y1 - y0;
    for (const x of xs) K.window({ x, y: y0 + 0.95, w: 1.2, h: fh - 1.95, sw: fi === 0 ? 0.2 : 0.14, d: 0.09, hood: fi === 0 ? 'seg' : null, hoodH: 0.32, hoodOver: 0.05, frame: 'brown' });
  });
  // white pilaster strips between bay pairs, from the first string course to the cornice
  for (let i = 0; i <= xs.length; i += 2) { const x = i === 0 ? 0.05 : i >= xs.length ? Lc - 0.05 : (xs[i - 1] + xs[i]) / 2; K.pilaster(M.trim, x, i === 0 || i >= xs.length ? 0.6 : 0.5, FLOORS[0][1] + 0.12, HC - 1.15, 0.1, 0.35); }
  // balcony over the entrance (floor 3 level)
  const bx = uMid; K.balcony(bx - 1.9, bx + 1.9, FLOORS[1][0] + 0.02, 0.9);
  // downpipes
  for (const u of [lenMain + 0.1, Lc - 0.4]) K.downpipe(u, 0.9, HC - 1.2, M.cream);
  void p;
}

// ------------------------------------------------------------------------------------------------ back wall of the recess (frame of that edge; u from the east end)
function recessBack(K, e, len, inD, hasDW) {
  const P = K.P, M = K.mats;
  const uP = localOnEdge(e, inD.x, inD.z).u;
  const w = inD.w || 3.2, aw = Math.max(2.8, w), ah = 4.5;
  const wall = K.wall('#cdb89a');
  if (hasDW) {
    K.wallWithHoles(wall, 0, len, 0, GF, [{ x: uP, y0: 0, w: aw, h: ah, head: 'arch' }], 3);
    K.surround(M.trim, uP, 0, aw, ah, 'arch', 0.3, 0.12);
    portalFurniture(K, uP, aw, ah);
  } else {
    K.wallQuad(wall, 0, len, 0, GF, 3);
    K.surround(M.trim, uP, 0, aw, ah, 'arch', 0.3, 0.12);
    K.gate(uP, 0.0, aw, ah, { ring: false });
    portalFurniture(K, uP, aw, ah);
  }
  // two shop windows flanking the portal on the back wall
  for (const u of [uP - 4.4, uP + 4.4]) if (u > 1.6 && u < len - 1.6) K.shopWindow(u, 0.9, 2.4, 2.8, { fw: 0.2 });
}
/** lamps on both sides of the portal and the blue M above it */
function portalFurniture(K, uP, aw, ah) {
  const P = K.P, M = K.mats;
  for (const s of [-1, 1]) {
    const x = uP + s * (aw / 2 + 0.55);
    P.box(M.iron, x - 0.03, x + 0.03, 3.2, 3.5, 0.04, 0.14, 'k');
    P.cyl(M.iron, [x, 3.4, 0.2], [x, 3.7, 0.2], 0.04, 0.04, 6, false);
    P.cyl(K.mat('#f2e9cc', { emissive: '#ffe2a0', emissiveIntensity: 0.6 }), [x, 3.0, 0.22], [x, 3.4, 0.22], 0.11, 0.14, 8, true);
  }
  K.fascia(uP - 0.7, uP + 0.7, ah + 0.45, ah + 1.15, 'М', { w: 128, h: 128, fg: '#1795d4', weight: 800, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.06, size: 0.95 });
}

// ------------------------------------------------------------------------------------------------ Marata front (the metro exit)
function marataFront(K, e, Lc, outD, hasDW) {
  const P = K.P, M = K.mats, up = 0.45;
  const wall = K.wall(PEACH), rust = K.rust(PEACH_SHADE);
  const uP = localOnEdge(e, outD.x, outD.z).u, aw = Math.max(3.0, outD.w || 3.2), ah = 4.4, pitch = 4.2;
  const arches = []; for (let k = -12; k <= 12; k++) { const u = uP + k * pitch; if (u > 1.8 && u < Lc - 1.8) arches.push(u); }
  const hole = hasDW ? [{ x: uP, y0: 0, w: aw, h: ah, head: 'arch' }] : [];
  K.wallWithHoles(wall, 0, Lc, 0, GF, hole, 3);
  arches.forEach((u, i) => {
    if (Math.abs(u - uP) < 0.01) { K.surround(M.trim, u, 0, aw, ah, 'arch', 0.28, 0.12); if (!hasDW) K.gate(u, 0, aw, ah, { ring: false }); portalFurniture(K, u, aw, ah); }
    else K.shopWindow(u, 0.9, 2.8, ah - 0.9, { head: 'arch', fw: 0.28, v: i });
  });
  P.box(M.trim, 0, Lc, GF - 0.1, GF + 0.32, 0, 0.3, 'k');
  P.box(M.trim, 0, Lc, GF - 0.45, GF - 0.1, 0, 0.12, 'k');
  K.fascia(Math.max(1, uP + 4), Math.min(Lc - 1, uP + 14), GF - 1.1, GF - 0.5, 'ТОРГОВЫЙ ЦЕНТР', { w: 1024, h: 96, fg: '#5a5650', weight: 600, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.04 });
  K.fascia(uP - 5, uP - 1.9, GF - 1.1, GF - 0.5, 'выход', { w: 512, h: 96, fg: '#3c3a38', weight: 600, transparent: true, font: K.ctx.tex.FONTS.round, z: 0.04 });
  const xs = K.bays(1.0, Lc - 1.0, 2.75);
  K.wallQuad(rust, 0, Lc, GF + 0.32, FLOORS[0][1], 2.4, 0, 1.2);
  K.wallQuad(wall, 0, Lc, FLOORS[0][1], HC + up, 3);
  P.box(M.trim, 0, Lc, FLOORS[0][1] - 0.15, FLOORS[0][1] + 0.12, 0, 0.14, 'k');
  FLOORS.forEach(([y0, y1], fi) => { for (const x of xs) K.window({ x, y: y0 + 0.95, w: 1.2, h: y1 - y0 - 1.95, sw: fi === 0 ? 0.2 : 0.14, d: 0.09, hood: fi === 0 ? 'seg' : null, hoodH: 0.32, hoodOver: 0.05, frame: 'brown' }); });
  for (let i = 0; i <= xs.length; i += 2) { const x = i === 0 ? 0.05 : i >= xs.length ? Lc - 0.05 : (xs[i - 1] + xs[i]) / 2; K.pilaster(M.trim, x, i === 0 || i >= xs.length ? 0.6 : 0.5, FLOORS[0][1] + 0.12, HC - 1.15, 0.1, 0.35); }
  // two balconies at the third floor
  for (const k of [3, 9, 15]) if (xs[k]) K.balcony(xs[k] - 1.5, xs[k] + 1.5, FLOORS[1][0] + 0.02, 0.8);
  for (const u of [Lc * 0.33, Lc * 0.66]) K.downpipe(u, 0.9, HC - 1.2, M.cream);
}

// ------------------------------------------------------------------------------------------------ rounded corner: wall + one window per floor on the middle arc
function cornerArc(K, e, len) {
  const M = K.mats, up = 0.45;
  K.wallQuad(K.wall(PEACH), 0, len, 0, HC + up, 3);
  K.wallQuad(K.rust(PEACH_SHADE), 0, len, GF + 0.32, FLOORS[0][1], 2.4, 0.01, 1.2);
  if (len > 0.9) {
    K.window({ x: len / 2, y: 0.9, w: 0.9, h: 3.4, sw: 0.2, d: 0.08, head: 'flat' });
    FLOORS.forEach(([y0, y1], fi) => K.window({ x: len / 2, y: y0 + 0.95, w: Math.min(1.0, len * 0.8), h: y1 - y0 - 1.95, sw: 0.12, d: 0.09, sill: false }));
  }
}

// ------------------------------------------------------------------------------------------------ red roof lettering
function roofSigns(K, eN, eM) {
  const P = K.P, M = K.mats, y = HC + 0.45;
  const mkMat = (key) => { const m = K.mat('#ffffff', { map: K.signTex('НЕВСКИЙ АТРИУМ', { w: 2048, h: 192, fg: '#c8202a', weight: 700, font: K.ctx.tex.FONTS.serif, fill: 0.98 }), alphaTest: 0.45, side: 'double', name: key }); K.decalMats.add(m); return m; };
  const mat = mkMat('lmB-roofsign');
  for (const [e, u0, u1] of [[eN, 3.0, 25.0], [eM, 18.0, 44.0]]) {
    if (!e) continue;
    const f = K.THREE; void f;
    // the sign stands on the roof 1.2 m behind the cornice: in the frame of that edge, z = -1.2 (inside)
    onEdge(P, e, () => {
      const h = (u1 - u0) * 192 / 2048;
      P.quad(mat, [u0, y + 0.3, -1.3], [u1, y + 0.3, -1.3], [u1, y + 0.3 + h, -1.3], [u0, y + 0.3 + h, -1.3], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      for (const u of [u0 + 0.5, (u0 + u1) / 2, u1 - 0.5]) P.box(M.iron, u - 0.05, u + 0.05, y, y + 0.3 + h * 0.2, -1.4, -1.25, 'kb');
    });
  }
}
