// landmarksB/yusupova.js - Nevsky 84-86, the Petrovo-Solovovo / Yusupova house (OSM w60196034, back block w98396422).
//
// Photo refs/nevsky/14: yellow stucco (#e8c468) with white trim, a rusticated pale-stone ground floor, a CENTRE with a six-column free-standing Ionic portico on a balcony terrace
// (iron railing) under a pediment with a coat of arms, two wings of 3 zones (rusticated ground floor with small windows, tall piano-nobile windows with balustrades, an attic zone
// with white trophy panels), the west wing with an arched gateway, the east wing with a big arched window over an arched gateway with wooden doors; restaurant awnings (dark red)
// on the east wing's ground floor.  Wings' cornice 14.5 m, portico entablature 14.9 m, pediment apex ~18.2 m.
import { buildHouse } from './house.js';
import { findEdge } from './kit.js';

const HC = 14.5, GF = 5.4, PN = 10.4;
const YELLOW = '#e8c468', BASE = '#e6d9b4', COURT = '#dbc48a';

export function build(K) {
  const L = K.L, P = K.P, M = K.mats;
  const recs = L.groupMembers('yusupova').filter((r) => !r.skip && (r.id === 'w60196034' || r.id === 'w98396422'));
  K.svc.houses.push({ id: 'w60196034', name: 'Дом Юсуповой (Петрово-Соловово)', nameEn: 'Yusupova house, Nevsky 84-86', x: -52, z: -33 });
  K.svc.photoSpots.push({ x: -52, z: 14, yaw: L.yawToward(-52, 14, -52, -20), pitch: 8, name: 'Дом Юсуповой · портик' });
  const near = (e, ax, az, bx, bz) => !!findEdge([e], ax, az, bx, bz, 0.4);
  const west = (e) => near(e, -83.6, -26.5, -61.9, -21.0), centre = (e) => near(e, -62.2, -19.5, -43.7, -14.9), east = (e) => near(e, -43.3, -16.4, -21.7, -11.0);
  buildHouse(K, {
    recs, hc: HC, hcOf: (r) => (r.id === 'w98396422' ? 16.5 : HC), wall: YELLOW, court: COURT, plinth: 0.9, floors: [5.0, 4.0, 3.6],
    front: (e, c) => {
      if (west(e)) { wing(K, c.len, { gate: 2.3, win: [6.4, 9.6, 12.8, 16.0, 19.2], trophies: [8.0, 14.4], plaque: 4.6 }); return true; }
      if (east(e)) { wing(K, c.len, { gateBig: c.len - 2.4, win: [2.2, 5.2, 8.2, 11.2, 14.2, 17.2], trophies: [6.0], friezes: [[12.0, 19.0]], awnings: [[7.0, 12.2], [12.8, 18.0]] }); return true; }
      if (centre(e)) { centreBlock(K, c.len); return true; }
      return false;
    },
  });
}

/** the common elevation of a wing: rusticated ground floor, piano nobile, trophy attic */
function wing(K, len, o) {
  const P = K.P, M = K.mats, up = 0.45;
  K.wallQuad(K.rust(BASE), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(K.wall(YELLOW), 0, len, GF, HC + up, 3);
  P.box(M.trim, 0, len, GF - 0.12, GF + 0.2, 0, 0.2, 'k');                          // string course over the ground floor
  P.box(M.trim, 0, len, PN - 0.08, PN + 0.18, 0, 0.16, 'k');                        // under the attic
  for (const x of o.win) {
    K.window({ x, y: 1.9, w: 1.05, h: 1.75, sw: 0.14, d: 0.07, frame: 'brown', sill: true });
    K.plaque(M.trim, x, 3.85, 0.45, 0.55, 0.05);                                    // keystone cartouche over each ground-floor window
    K.window({ x, y: GF + 1.05, w: 1.3, h: 3.0, sw: 0.2, d: 0.1, hood: 'tri', hoodH: 0.38, hoodOver: 0.1, frame: 'brown', sill: false });
    K.balustrade(x - 0.95, x + 0.95, GF + 0.2, 0.75, 0.32);
  }
  if (o.gate !== undefined) {
    K.gate(o.gate, 0.0, 3.0, 4.2, { sw: 0.32 });
    K.window({ x: o.gate, y: GF + 0.6, w: 2.3, h: 4.0, head: 'arch', sw: 0.28, d: 0.1, frame: 'brown', sill: false });
  }
  if (o.gateBig !== undefined) {
    const x = o.gateBig;
    K.gate(x, 0.0, 3.4, 4.8, { sw: 0.36 });
    K.window({ x, y: GF + 0.7, w: 2.9, h: 5.6, head: 'arch', sw: 0.3, d: 0.12, frame: 'brown', sill: false });
    P.box(M.trim, x - 1.9, x + 1.9, GF + 0.0, GF + 0.18, 0, 0.5, 'k');
  }
  for (const x of o.trophies || []) K.plane(K.R.trophy, x - 1.0, x + 1.0, PN + 0.35, PN + 2.9, 0.04);
  for (const [a, b] of o.friezes || []) { K.plane(K.R.frieze, a, b, PN + 0.9, PN + 2.5, 0.04); P.box(M.trim, a - 0.1, b + 0.1, PN + 0.75, PN + 0.9, 0, 0.07, 'k'); P.box(M.trim, a - 0.1, b + 0.1, PN + 2.5, PN + 2.65, 0, 0.07, 'k'); }
  if (o.plaque) K.plane(K.R.cartouche, o.plaque - 0.6, o.plaque + 0.6, PN + 0.6, PN + 1.8, 0.04);
  for (const [a, b] of o.awnings || []) K.awning(a, b, 3.5, 2.0, 0.8);
  // two downpipes
  for (const x of [0.6, len - 0.6]) K.downpipe(x, 0.9, HC - 1.2, M.cream);
}

/** the portico block: projecting 1.5 m, balcony terrace with railing, six Ionic columns, entablature, pediment with a coat of arms */
function centreBlock(K, len) {
  const P = K.P, M = K.mats, up = 0.45;
  K.wallQuad(K.rust(BASE), 0, len, 0, GF, 2.4, 0, 1.2);
  K.wallQuad(K.wall(YELLOW), 0, len, GF, HC + up, 3);
  P.box(M.trim, 0, len, GF - 0.12, GF + 0.2, 0, 0.2, 'k');
  const cols = [2.2, 5.3, 8.4, 11.5, 14.6, 17.7].map((x) => x * len / 19.9);
  const mid = (a, b) => (a + b) / 2;
  // ground floor: small windows + the arched entrance between the 2nd and 3rd column
  const wx = [1.2, 3.8, 6.9, 10.0, 13.0, 16.1, 18.6].map((x) => x * len / 19.9);
  for (let i = 0; i < wx.length; i++) {
    if (i === 2) { K.gate(wx[i] + 0.6, 0, 2.3, 3.9, { sw: 0.3 }); continue; }
    K.window({ x: wx[i], y: 1.9, w: 1.05, h: 1.75, sw: 0.14, d: 0.07, frame: 'brown' });
  }
  // terrace slab on corbels, railing along the front and the ends
  const z1 = 2.4;
  P.box(M.trim, 0.5, len - 0.5, GF - 0.6, GF + 0.12, 0, z1, 'k');
  P.box(M.cornice, 0.4, len - 0.4, GF - 0.75, GF - 0.6, 0, z1 + 0.1, 'k');
  K.railRun(0.5, len - 0.5, GF + 0.12, z1 - 0.06, 0.95);
  K.railRunZ(0.5, GF + 0.12, 0.05, z1 - 0.06, 0.95);
  K.railRunZ(len - 0.5, GF + 0.12, 0.05, z1 - 0.06, 0.95);
  // the wall behind the columns: two window rows between the columns
  for (let i = 0; i < cols.length - 1; i++) {
    const x = mid(cols[i], cols[i + 1]);
    K.window({ x, y: GF + 0.9, w: 1.35, h: 3.5, sw: 0.18, d: 0.1, frame: 'brown', sill: false });
    K.window({ x, y: PN + 0.6, w: 1.2, h: 2.2, sw: 0.14, d: 0.08, frame: 'brown', sill: false });
  }
  // columns on the terrace + entablature + pediment
  const zc = 1.55, y1 = HC - 0.9;
  for (const x of cols) K.column(M.trim, x, zc, GF + 0.12, y1, 0.5);
  const x0 = cols[0] - 1.1, x1 = cols[cols.length - 1] + 1.1;
  P.box(M.trim, x0, x1, y1, y1 + 0.5, 0.0, 2.45, 'k');                                // architrave
  P.box(M.trim, x0, x1, y1 + 0.5, y1 + 0.95, 0.12, 2.35, 'k');                        // frieze
  P.box(M.cornice, x0 - 0.15, x1 + 0.15, y1 + 0.95, y1 + 1.25, 0.0, 2.7, 'k');          // cornice
  K.strip(K.R.frieze, x0 + 0.4, x1 - 0.4, y1 + 0.55, y1 + 0.95, 2.36);
  const peak = 3.7, yb = y1 + 1.25;
  const sh = new K.THREE.Shape(); sh.moveTo(x0 - 0.15, yb); sh.lineTo(x1 + 0.15, yb); sh.lineTo((x0 + x1) / 2, yb + peak); sh.lineTo(x0 - 0.15, yb);
  P.extrude(M.trim, sh, 0.3, 2.3, 1, 4);
  const sh2 = new K.THREE.Shape(); sh2.moveTo(x0 + 0.6, yb + 0.12); sh2.lineTo(x1 - 0.6, yb + 0.12); sh2.lineTo((x0 + x1) / 2, yb + peak - 0.5); sh2.lineTo(x0 + 0.6, yb + 0.12);
  P.face(K.wall(YELLOW), sh2, 2.62, 3);                                                // tympanum
  K.plane(K.R.coat, (x0 + x1) / 2 - 0.9, (x0 + x1) / 2 + 0.9, yb + 0.35, yb + 2.15, 2.64);
  // the dark roof behind the pediment
  P.box(M.roofDark, x0 + 1.0, x1 - 1.0, HC + up, HC + 3.2, -3.0, -0.2, 'b');
}
