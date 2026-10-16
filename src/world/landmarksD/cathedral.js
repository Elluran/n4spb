// landmarksD/cathedral.js - the Vladimirsky Cathedral (Собор Владимирской иконы Божией Матери, Vladimirsky pr. 20, 1761-69 Savva Chevakinsky / Rastrelli school, Russian baroque after
// the Moscow-baroque cross-in-square plan) and its detached bell tower (1783-86 Ivan Starov / Rastrelli's pupil), OSM w38611014 + w38611013.   Photos: refs/landmarksD/cathedral 01 02 05 09.
//   Cathedral: pale yellow stucco (#e8c375) with white pilasters, window frames, cornice; a six-column pedimented portico on the WEST front (towards Vladimirsky pr.) with the
//   inscription "Владычице приими молитвы рабов твоих"; arched windows; five gilded onion domes on drums (a bigger helmet-shaped one over the crossing, four on the corners) with gilded crosses.
//   Heights (research, not OSM): cornice 17.5 m, drums up to 25 / 29 m, crosses to ~41 m.   Bell tower: 4 tiers, ~62 m: a yellow base block (the OSM octagon), a round tier with a white colonnade,
//   an open belfry colonnade, a gilded dome with a lantern and a cross.   The church yard fence (OSM BARRIERS) is drawn by fences.js.
import * as THREE from 'three';
import { buildHouse } from './house.js';
import { findEdge, localOnEdge } from './kit.js';
import { onion, dome, cup, cross, drum, colRing, ringWindows, roundCornice, portico } from './parts.js';

const WALL = '#e8c375', WALL_SHADE = '#d9b25f', ROOF = '#6f8f86', GOLD = '#dcae3c';
const HC = 17.5, UP = 0.45;
const CROSSING = [-157.0, 471.0];
const CORNER_DOMES = [[-165.2, 463.2], [-148.8, 463.8], [-165.2, 479.4], [-148.8, 479.6]];
const BELL = [-155.3, 412.7];

export function build(K) {
  const L = K.L, P = K.P, M = K.mats;
  const recs = L.groupMembers('vladimirsky').filter((r) => !r.skip);
  const cath = recs.find((r) => r.id === 'w38611014'), bell = recs.find((r) => r.id === 'w38611013');
  K.svc.houses.push({ id: 'w38611014', name: 'Владимирский собор', nameEn: 'Vladimirsky Cathedral', x: -165, z: 470 }, { id: 'w38611013', name: 'Колокольня Владимирского собора', nameEn: 'Vladimirsky bell tower', x: -155, z: 413 });
  K.svc.monuments.push({ id: 'w38611014', name: 'Владимирский собор', x: -165, z: 470, h: 41 }, { id: 'w38611013', name: 'Колокольня', x: -155, z: 413, h: 62 });
  K.svc.photoSpots.push({ x: -215, z: 438, yaw: L.yawToward(-215, 438, -165, 450), pitch: 14, name: 'Владимирский собор и колокольня' });
  const gold = K.mat(GOLD, { emissive: '#5a3c05', emissiveIntensity: 0.3, name: 'lmD-gold' });
  const roof = K.mat(ROOF, { name: 'lmD-roof-cath' });

  // ------------------------------------------------------------------------------------------------ the church body
  const west = (e) => !!findEdge([e], -190.8, 478.4, -190.2, 458.7, 0.4);
  buildHouse(K, {
    name: 'cathedral', recs: [cath], hc: HC, wall: WALL, court: WALL, plinth: 1.0, cornice: 'classic', roofMat: roof, upstand: UP, railing: false, plinthMat: M.graniteWarm,
    front: (e, c) => { if (west(e)) westFront(K, c.len, gold); else churchWall(K, e, c.len); return true; },
  });
  // roof ridge detail: low hipped lids over the arms are skipped (flat sheet roof, hidden from the street by the cornice upstand)
  // the five domes
  const [cx, cz] = CROSSING;
  centralDome(K, cx, cz, gold);
  for (const [x, z] of CORNER_DOMES) smallDome(K, x, z, gold);
  // small lantern domes over the altar apse and the vestibule (west) - stubs of the real "drum" cluster
  for (const [x, z] of [[-146.2, 471.2]]) { P.cyl(M.cream, [x, HC + UP, z], [x, HC + UP + 3.0, z], 1.5, 1.5, 12, true); cup(K, gold, x, HC + UP + 3.0, z, 1.7, 0.9); cross(K, gold, x, HC + UP + 4.9, z, 2.2); }

  // ------------------------------------------------------------------------------------------------ the bell tower
  buildHouse(K, {
    name: 'belltower', recs: [bell], hc: 17.0, wall: WALL, court: WALL, plinth: 1.2, cornice: 'classic', roofMat: K.mat('#cfc7b4'), upstand: UP, railing: false, plinthMat: M.graniteWarm,
    front: (e, c) => { bellBase(K, e, c.len); return true; },
  });
  bellTiers(K, BELL[0], BELL[1], gold);
}

// ------------------------------------------------------------------------------------------------ walls
/** the west (street) front: rusticated base with three doors, six-column portico with the lettered frieze and a pediment, tall arched windows between the columns */
function westFront(K, len, gold) {
  const M = K.mats, wall = K.wall(WALL), P = K.P;
  K.wallQuad(wall, 0, len, 4.6, HC + UP, 3);
  K.wallQuad(K.rust('#e9e1cc'), 0, len, 0, 4.6, 2.4, 0, 1.2);                                         // pale rusticated base
  const D = 3.4, r = 0.55, y0 = 0.5, y1 = 14.0;
  const xs = [1.2, 4.1, 7.0, 12.7, 15.6, 18.5];
  // doors of the base: central arched portal, two side doors
  K.gate(len / 2, 0.5, 2.5, 4.0, { sw: 0.35, d: 0.12, open: false });
  for (const x of [len / 2 - 5.3, len / 2 + 5.3]) K.gate(x, 0.5, 1.7, 3.2, { sw: 0.25, d: 0.1 });
  // windows between the columns (upper storey)
  for (const x of [2.65, 5.55, 14.15, 17.05]) K.window({ x, y: 5.9, w: 1.5, h: 6.4, head: 'arch', sw: 0.28, d: 0.1, frame: 'white', surMat: M.trim, sill: false });
  K.window({ x: len / 2, y: 7.0, w: 2.3, h: 6.6, head: 'arch', sw: 0.3, d: 0.1, frame: 'white', surMat: M.trim, sill: false });  // central window
  // the icon of the Mother of God over the portal (a small gilded frame)
  P.box(gold, len / 2 - 0.55, len / 2 + 0.55, 4.75, 6.05, 0.0, 0.13, 'kb');
  for (const x of [len / 2 - 5.3, len / 2 + 5.3]) K.window({ x, y: 6.4, w: 1.1, h: 3.0, head: 'flat', sw: 0.18, d: 0.08, frame: 'white', surMat: M.trim, sill: true });
  K.plane(K.R.shell, len / 2 - 1.2, len / 2 + 1.2, 13.95, 15.0, 0.1);
  portico(K, { x0: -0.3, x1: len + 0.3, depth: D, y0, y1, r, xs, ent: 1.9, ped: 3.4, mat: M.trim, matShade: M.cream, wallMat: K.wall('#efe0b6'), text: 'ВЛАДЫЧИЦЕ ПРИИМИ МОЛИТВЫ РАБОВ ТВОИХ' });
  void xs;
}

/** a side / apse wall of the church: pilasters, tall arched windows, oculi in the frieze */
function churchWall(K, e, len) {
  const M = K.mats, wall = K.wall(WALL);
  K.wallQuad(wall, 0, len, 0, HC + UP, 3);
  if (len < 2.4) return;
  const n = Math.max(1, Math.round((len - 0.8) / 4.6)), p = (len - 0.8) / n;
  for (let i = 0; i < n; i++) {
    const x = 0.4 + p * (i + 0.5);
    if (p < 3.2 && n > 1) { K.window({ x, y: 1.6, w: 0.9, h: 1.7, sw: 0.14, d: 0.07, frame: 'white', surMat: M.trim, sill: true }); continue; }
    K.window({ x, y: 1.5, w: 1.1, h: 1.9, sw: 0.16, d: 0.08, frame: 'white', surMat: M.trim, sill: true });
    K.window({ x, y: 6.4, w: 1.35, h: 6.2, head: 'arch', sw: 0.26, d: 0.1, frame: 'white', surMat: M.trim, sill: false });
    K.plane(K.R.cartouche, x - 0.5, x + 0.5, 13.0, 14.6, 0.08);
  }
  for (let i = 0; i <= n; i++) K.pilaster(M.trim, 0.4 + p * i, 0.55, 1.0, HC - 1.2, 0.16, 0.5);
}

/** the base block of the bell tower: arched windows under triangular hoods on every face */
function bellBase(K, e, len) {
  const M = K.mats, wall = K.wall(WALL);
  K.wallQuad(wall, 0, len, 0, 17.0 + UP, 3);
  K.window({ x: len / 2, y: 2.6, w: 1.5, h: 3.6, head: 'arch', sw: 0.26, d: 0.1, frame: 'white', surMat: M.trim, sill: false });
  K.window({ x: len / 2, y: 8.4, w: 1.6, h: 6.2, head: 'arch', sw: 0.3, d: 0.1, frame: 'white', surMat: M.trim, sill: false, hood: 'tri', hoodH: 0.9, hoodOver: 0.5 });
  K.pilaster(M.trim, 0.35, 0.5, 1.2, 15.8, 0.15, 0.5); K.pilaster(M.trim, len - 0.35, 0.5, 1.2, 15.8, 0.15, 0.5);
  K.plane(K.R.shell, len / 2 - 1.0, len / 2 + 1.0, 15.0, 16.2, 0.08);
}

// ------------------------------------------------------------------------------------------------ domes
/** the central dome over the crossing: a tall drum with windows and pilasters, a helmet dome, a lantern with a small onion and a cross */
function centralDome(K, cx, cz, gold) {
  const P = K.P, M = K.mats, y0 = HC + UP, wall = K.wall(WALL);
  // base block (the crossing tower): square-ish stage 17.9 .. 22.5
  drum(K, wall, cx, cz, y0, y0 + 5.2, 6.4, 24);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y0 + 5.2, 6.4, 1.2);
  ringWindows(K, cx, cz, 6.4, 8, { x: 0, y: y0 + 1.2, w: 1.1, h: 3.1, head: 'arch', sw: 0.2, d: 0.08, frame: 'white', surMat: M.trim, sill: false }, 0.39);
  // second stage: drum with pilasters, 8 windows
  const yd = y0 + 6.4;
  drum(K, wall, cx, cz, yd, yd + 5.0, 4.9, 24);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; K.P.push(cx + Math.sin(a) * 4.88, 0, cz + Math.cos(a) * 4.88, a); K.pilaster(M.trim, 0, 0.5, yd + 0.2, yd + 4.9, 0.14, 0.4); K.P.pop(); }
  ringWindows(K, cx, cz, 4.9, 8, { x: 0, y: yd + 1.1, w: 0.95, h: 2.9, head: 'arch', sw: 0.18, d: 0.08, frame: 'white', surMat: M.trim, sill: false }, 0);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, yd + 5.0, 4.9, 1.0);
  // helmet dome, lantern, small onion, cross
  const yh = yd + 6.0;
  dome(K, gold, cx, yh, cz, 5.2, 1.0);
  drum(K, wall, cx, cz, yh + 5.1, yh + 7.4, 1.55, 14);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, yh + 7.4, 1.55, 0.5);
  onion(K, gold, cx, yh + 7.9, cz, 1.65, 1.0);
  cross(K, gold, cx, yh + 7.9 + 3.9, cz, 4.6);
}
function smallDome(K, cx, cz, gold) {
  const P = K.P, M = K.mats, y0 = HC + UP, wall = K.wall(WALL);
  drum(K, wall, cx, cz, y0, y0 + 3.4, 3.1, 20);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y0 + 3.4, 3.1, 0.9);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; P.push(cx + Math.sin(a) * 3.06, 0, cz + Math.cos(a) * 3.06, a); K.window({ x: 0, y: y0 + 0.5, w: 0.9, h: 2.1, head: 'arch', sw: 0.15, d: 0.07, frame: 'white', surMat: M.trim, sill: false }); P.pop(); }
  const yt = y0 + 4.5;
  drum(K, wall, cx, cz, yt, yt + 2.4, 2.1, 16);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, yt + 2.4, 2.1, 0.6);
  onion(K, gold, cx, yt + 3.0, cz, 2.15, 1.0);
  cross(K, gold, cx, yt + 3.0 + 5.0, cz, 3.4);
}

// ------------------------------------------------------------------------------------------------ bell tower tiers (above the base block at 17.45 m)
function bellTiers(K, cx, cz, gold) {
  const P = K.P, M = K.mats, wall = K.wall(WALL), y0 = 17.45, R2 = 6.4;
  // tier 2: round drum with a closed colonnade of 12 white columns
  drum(K, wall, cx, cz, y0, y0 + 11.0, R2, 28);
  P.cyl(M.trim, [cx, y0, cz], [cx, y0 + 0.5, cz], R2 + 1.0, R2 + 1.0, 28, true);
  colRing(K, M.trim, cx, cz, y0 + 0.5, y0 + 10.0, R2 + 0.35, 12, 0.42, { capH: 0.7 }, Math.PI / 12);
  ringWindows(K, cx, cz, R2, 6, { x: 0, y: y0 + 3.0, w: 1.4, h: 4.6, head: 'arch', sw: 0.2, d: 0.08, frame: 'white', surMat: M.trim, sill: false }, 0.26, 28);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y0 + 10.0, R2 + 1.1, 1.4);
  // tier 3: a yellow stage, a balustrade, then the open belfry
  const y3 = y0 + 11.4;
  drum(K, wall, cx, cz, y3, y3 + 3.2, 5.3, 24);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y3 + 3.2, 5.3, 0.9);
  const y4 = y3 + 4.1;
  P.cyl(M.trim, [cx, y4, cz], [cx, y4 + 0.7, cz], 6.3, 6.3, 28, true);
  drum(K, K.mat('#2f2c2a'), cx, cz, y4 + 0.7, y4 + 8.4, 4.1, 20);                                       // dark belfry interior
  P.cyl(K.mats.black, [cx, y4 + 3.2, cz], [cx, y4 + 3.2 + 0.2, cz], 1.3, 1.3, 10, true);
  colRing(K, M.trim, cx, cz, y4 + 0.7, y4 + 8.3, 5.5, 16, 0.38, { capH: 0.65 }, 0);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y4 + 8.3, 6.0, 1.3);
  // dome, lantern, cross
  const y5 = y4 + 9.8;
  drum(K, wall, cx, cz, y5 - 0.2, y5 + 1.6, 4.6, 24);
  dome(K, gold, cx, y5 + 1.6, cz, 4.7, 1.05);
  drum(K, wall, cx, cz, y5 + 6.5, y5 + 8.5, 1.2, 12);
  roundCornice(K, M.cornice, M.corniceShade, cx, cz, y5 + 8.5, 1.2, 0.4);
  cup(K, gold, cx, y5 + 8.9, cz, 1.35, 1.0);
  cross(K, gold, cx, y5 + 10.3, cz, 3.6);
}
void THREE; void localOnEdge;
