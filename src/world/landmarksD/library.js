// landmarksD/library.js - the National Library's Fontanka building (Фонтанка, 36: the former Catherine Institute, Giacomo Quarenghi 1804-07; OSM r3801087).  Photos: refs/landmarksD/library 01 02.
// Pale yellow stucco (#ecd8a4) with white trim, a rusticated ground floor, two upper storeys of rectangular windows with plain surrounds under a dentilled cornice (cornice ~17.5 m), a green sheet
// roof; the centre of the WEST (river) front is a projecting eight-column Corinthian portico (the bump of the OSM outline, 19 m wide) on a five-arch arcade with a balustraded gallery, a heavy
// entablature and a pediment with a laurel wreath (top ~ 24 m).  The long river fronts (56 + 57 + 41 m) are all drawn; the courtyard sides get plain windows.
import { buildHouse } from './house.js';
import { portico } from './parts.js';
import { findEdge } from './kit.js';

const WALL = '#ecd8a4', ROOF = '#5f9470';
const HC = 17.5, UP = 0.45, GF = 6.2, F1 = 12.4;

export function build(K) {
  const L = K.L, M = K.mats;
  const rec = L.groupMembers('library').find((r) => r.id === 'r3801087');
  if (!rec) throw new Error('library record missing');
  K.svc.houses.push({ id: 'r3801087', name: 'Российская национальная библиотека (Фонтанка, 36)', nameEn: 'National Library, Fontanka building (Catherine Institute)', x: -334, z: -311 });
  K.svc.monuments.push({ id: 'r3801087', name: 'Российская национальная библиотека', x: -355, z: -288, h: 24 });
  K.svc.photoSpots.push({ x: -410, z: -288, yaw: L.yawToward(-410, -288, -355, -288), pitch: 6, name: 'Национальная библиотека на Фонтанке' });
  const river = (e) => e.len > 8 && Math.abs(bearing(e) - 279) < 7;
  const bump = (e) => !!findEdge([e], -356.4, -278.9, -353.3, -297.7, 0.5);
  buildHouse(K, {
    name: 'library', recs: [rec], hc: HC, wall: WALL, court: '#e6d09a', plinth: 1.0, floors: [5.4, 5.2, 4.8], cornice: 'classic', roofMat: K.mat(ROOF, { name: 'lmD-roof-lib' }), upstand: UP,
    railing: false, plinthMat: M.graniteWarm, courtPitch: 3.2,
    front: (e, c) => {
      if (bump(e)) { arcade(K, c.len); return true; }
      if (river(e)) { wing(K, c.len); return true; }
      return false;
    },
  });
}
const bearing = (e) => (Math.atan2(e.n[0], -e.n[1]) * 180 / Math.PI + 360) % 360;

/** one river front: rusticated ground floor with arched niches, string courses, three rows of windows on a 3.1 m pitch */
function wing(K, len) {
  const M = K.mats, wall = K.wall(WALL);
  K.wallQuad(wall, 0, len, GF, HC + UP, 3);
  K.wallQuad(K.rust(WALL), 0, len, 0, GF, 2.4, 0, 1.2);
  const xs = K.bays(1.2, len - 1.2, 3.1);
  xs.forEach((x, i) => {
    const arch = i % 3 === 1;
    K.window({ x, y: 1.5, w: 1.1, h: arch ? 3.3 : 2.5, head: arch ? 'arch' : 'flat', sw: 0.16, d: 0.07, frame: 'white', surMat: M.trim, sill: !arch });
    K.window({ x, y: 7.4, w: 1.3, h: 3.7, sw: 0.2, d: 0.09, frame: 'white', surMat: M.trim, sill: true });
    K.window({ x, y: 13.3, w: 1.15, h: 2.2, sw: 0.16, d: 0.07, frame: 'white', surMat: M.trim, sill: false });
  });
  K.P.box(M.trim, 0, len, GF - 0.12, GF + 0.12, 0, 0.16, 'k');
  K.P.box(M.trim, 0, len, F1 - 0.1, F1 + 0.1, 0, 0.12, 'k');
  for (const x of [0.5, len - 0.5]) K.downpipe(x, 1.0, HC - 1.2, M.cream);
}

/** the bump of the outline: an arcade of five arches, a balustraded gallery, eight columns, the entablature and the pediment */
function arcade(K, len) {
  const P = K.P, M = K.mats, wall = K.wall(WALL);
  const mid = len / 2, y0 = 7.9, y1 = 16.1;
  K.wallQuad(wall, 0, len, GF + 1.6, HC + UP, 3);
  const arch = [-2, -1, 0, 1, 2].map((k) => ({ x: mid + k * 3.6, y0: 0.7, w: 2.5, h: 5.6, head: 'arch' }));
  K.wallWithHoles(K.rust(WALL), 0, len, 0, GF + 1.6, arch, 2.4, 1.2);
  P.box(K.mats.doorDark, 0.3, len - 0.3, 0.7, 6.4, -0.7, -0.6, 'bt');                       // dark loggia behind the arches
  for (const a of arch) K.gate(a.x, 0.7, 1.6, 3.2, { sw: 0.0, ring: false, doorMat: M.doorDark, open: false });
  // gallery over the arcade: slab + balustrade + the columns standing on it
  P.box(M.trim, -0.3, len + 0.3, GF + 0.6, y0, 0, 2.3, 'b');
  K.balustrade(-0.2, len + 0.2, y0, 0.95, 2.1, M.trim);
  for (let i = 0; i < 4; i++) K.window({ x: 2.4 + i * 4.8, y: GF + 2.4, w: 1.3, h: 3.4, sw: 0.2, d: 0.07, frame: 'white', surMat: M.trim, sill: true });
  const n = 8, xs = Array.from({ length: n }, (_, i) => 1.2 + i * (len - 2.4) / (n - 1));
  portico(K, { x0: -0.35, x1: len + 0.35, depth: 1.5, y0, y1, r: 0.5, xs, ent: 1.9, ped: 2.9, mat: M.trim, matShade: M.cream, wallMat: K.wall('#efe0b6'), steps: false });
  // laurel wreath in the tympanum (a ring: two flat discs)
  const yc = y1 + 1.9 + 1.05;
  P.cyl(M.trim, [mid, yc, 2.62], [mid, yc, 2.7], 1.25, 1.25, 20, true);
  P.cyl(K.wall("#efe0b6"), [mid, yc, 2.7], [mid, yc, 2.73], 0.9, 0.9, 20, true);
}
