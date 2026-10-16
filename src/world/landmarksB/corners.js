// landmarksB/corners.js - the smaller sights of sub-group `nevsky-corner`:
//   * Dom zhurnalista, Nevsky 70 (OSM r936116, the Sukhozanet house, 1840s): cream-apricot neoclassical 3-storey house with a central pediment, five round-headed piano-nobile windows over
//     a cast-iron balcony on brackets, a rusticated stone ground floor with a black ornate carriage gate flanked by two entrances under iron canopies (photo refs/nevsky/10).
//   * The evangelical mission "Благая весть" (OSM w113458823, Nevsky 100 lit. I): a plain two-storey church-hall in the Kolizey courtyard (not visible from the street).
import { buildHouse } from './house.js';
import { findEdge } from './kit.js';

const CREAM = '#ebc795', TRIM = '#f2eee4', BASE = '#d8cdb4';

export function build(K) {
  const L = K.L;
  const members = L.groupMembers('nevsky-corner');
  const jr = members.find((r) => r.id === 'r936116');
  if (jr) journalist(K, jr);
  const ms = members.find((r) => r.id === 'w113458823');
  if (ms) mission(K, ms);
}

// ------------------------------------------------------------------------------------------------ Dom zhurnalista
function journalist(K, rec) {
  const L = K.L, HC = 12.8;
  K.svc.houses.push({ id: 'r936116', name: 'Дом журналиста (Невский 70)', nameEn: 'Dom zhurnalista / Sukhozanet house, Nevsky 70', x: -309, z: -108 });
  K.svc.photoSpots.push({ x: -300, z: -52, yaw: L.yawToward(-300, -52, -312, -85), pitch: 6, name: 'Дом журналиста' });
  const near = (e, ax, az, bx, bz) => !!findEdge([e], ax, az, bx, bz, 0.4);
  const info = buildHouse(K, {
    recs: [rec], hc: HC, wall: CREAM, court: '#dec59a', plinth: 0.9, floors: [4.2, 4.0, 3.6],
    front: (e, c) => { if (near(e, -302.5, -81.5, -327.5, -87.8)) { jrFront(K, c.len, HC); return true; } return false; },
  });
  const fe = info.edges.find((e) => near(e, -302.5, -81.5, -327.5, -87.8));
  if (fe) K.onEdgeFn(fe, (len) => {
    const m = K.mat('#e8d6a0');
    for (const u of [4.0, 9.5, 17.5, 22.0]) { K.P.box(m, u - 0.5, u + 0.5, HC + 0.45, HC + 2.6, -4.0, -3.0, 'b'); K.P.box(K.mats.shade, u - 0.62, u + 0.62, HC + 2.6, HC + 2.78, -4.12, -2.88, 'b'); }
    K.P.box(K.mats.roofDark, 5.0, len - 5.0, HC + 0.45, HC + 3.6, -9.0, -1.0, 'b');          // the roof behind the pediment
  });
}

function jrFront(K, len, HC) {
  const P = K.P, M = K.mats, up = 0.45, GF = 4.4, F1 = 8.6;
  const cream = K.wall(CREAM), trim = M.trim;
  K.wallQuad(K.rust(BASE), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(cream, 0, len, GF, HC + up, 3);
  P.box(trim, 0, len, GF - 0.12, GF + 0.2, 0, 0.18, 'k');
  P.box(trim, 0, len, F1 - 0.08, F1 + 0.12, 0, 0.1, 'k');
  const c = len / 2;
  // gate in the middle, two entrances with iron canopies
  K.gate(c, 0, 3.4, 4.0, { sw: 0.34, doorMat: M.ironSoft });
  for (const u of [c - 8.6, c + 8.6]) {
    K.gate(u, 0, 1.9, 2.9, { sw: 0.16, ring: true, doorMat: K.mat('#9a6a3a') });
    P.quad(M.iron, [u - 1.5, 3.9, 0.05], [u + 1.5, 3.9, 0.05], [u + 1.5, 3.3, 1.3], [u - 1.5, 3.3, 1.3], [0, 0.5, 0.85]);
    P.box(M.iron, u - 1.5, u + 1.5, 3.2, 3.3, 1.2, 1.3, 'kb');
  }
  const gw = [1.3, 7.0, 9.6, 16.2, 18.7, 24.4].filter((u) => u < len - 0.8);
  for (const u of gw) K.window({ x: u, y: 1.1, w: 1.15, h: 2.2, sw: 0.14, d: 0.07, frame: 'brown', surMat: trim });
  // first floor (second storey): plain windows
  const f1 = K.bays(1.2, len - 1.2, 2.45);
  for (const u of f1) K.window({ x: u, y: GF + 0.75, w: 1.2, h: 2.4, sw: 0.16, d: 0.08, frame: 'brown', surMat: trim, sill: true });
  // second floor: rectangular wings + five round-headed windows in the middle
  const arches = [-4.6, -2.3, 0, 2.3, 4.6].map((d) => c + d);
  for (const u of f1) if (!arches.some((a) => Math.abs(a - u) < 1.3)) K.window({ x: u, y: F1 + 0.65, w: 1.15, h: 2.3, sw: 0.16, d: 0.08, frame: 'brown', surMat: trim, sill: true });
  for (const u of arches) K.window({ x: u, y: F1 + 0.5, w: 1.2, h: 2.9, head: 'arch', sw: 0.18, d: 0.09, frame: 'brown', surMat: trim, sill: false });
  K.balcony(c - 3.8, c + 3.8, F1 + 0.02, 0.9, { slabMat: M.iron });
  // pediment over the centre
  const x0 = c - 7.4, x1 = c + 7.4, peak = 3.6, yb = HC + 0.0;
  P.box(M.cornice, 0, len, HC - 0.1, HC + 0.12, 0, 0.35, 'k');
  const sh = new K.THREE.Shape(); sh.moveTo(x0, yb); sh.lineTo(x1, yb); sh.lineTo(c, yb + peak); sh.lineTo(x0, yb);
  P.extrude(trim, sh, 0.12, 0.34, 1, 4);
  const sh2 = new K.THREE.Shape(); sh2.moveTo(x0 + 0.9, yb + 0.25); sh2.lineTo(x1 - 0.9, yb + 0.25); sh2.lineTo(c, yb + peak - 0.7); sh2.lineTo(x0 + 0.9, yb + 0.25);
  P.face(K.wall('#e3bd86'), sh2, 0.5, 3);
  for (const u of [0.35, len - 0.35]) K.downpipe(u, 0.9, HC - 1.0, K.mat('#e0c590'));
}

// ------------------------------------------------------------------------------------------------ the mission in the courtyard
function mission(K, rec) {
  K.svc.houses.push({ id: 'w113458823', name: 'Миссия «Благая весть»', nameEn: 'Evangelical mission "Good News", Nevsky 100 courtyard', x: 276, z: -13 });
  buildHouse(K, {
    recs: [rec], hc: 8.4, wall: '#d9cfb4', court: '#d9cfb4', plinth: 0.6, floors: [4.2, 3.6], courtPitch: 3.2, roofMat: K.mats.roofRust, cornice: 'classic', corniceScale: 0.6, railing: false,
  });
}
