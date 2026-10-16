// landmarksE/rossi.js - Zodchego Rossi Street (улица Зодчего Росси, 1828-34): two identical facades (Nos 1-3 on the west, No 2 + No 4 on the east), wall to wall 18.5 m (22 m over the half columns),
// cornice 22 m: the signature square cross-section.  docs/research/gostiny-dvor-ostrovsky.md section 7, photos refs/ostrovsky 115 118 122 124 126.
//   Facade (edge frame, pitch 4.5 m): rusticated yellow ground storey (#e6cc90) 7 m with round-arched windows 3.0 x 4.3 m (white archivolt, an oculus in every pier), courtyard gates every ~50 m;
//   the upper two floors united by a colossal order of WHITE round half columns (r 0.5, 12.5 m, simple capitals) on a plinth band, between them a pedimented window on the 2nd floor and a smaller
//   window above with a garland panel; entablature 2.2 m + a deep cornice (cornice at 22 m), yellow downpipes.  End pavilions at the Ostrovsky end (20 m: a big arched gate, a free column at the
//   corner, a tall arched window with a balcony, a pedimented window above). The real street continues unobstructed to Lomonosov Square; no artificial street-end pavilion is drawn.
//   Walls of the rest come from the OSM footprints (buildHouse).  Colours: wall #ecd8a0, order #f2efe6.
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { toUV, toWorld } from './frame.js';
import { archPath } from './kit.js';
import { tuscan } from './columns.js';

const Y = { PL: 1.0, G: 7.0, COL0: 7.4, COL1: 19.8, ENT: 22.0, TOP: 22.6 };
const PITCH = 4.5;

export function build(K, ctx) {
  const P = K.P, M = K.G.M, KM = K.mats;
  const ids = ['r8222552', 'r6749936', 'w134868630'];
  const recs = ids.map((id) => L.buildingById(id)).filter(Boolean);
  if (recs.length < 3) throw new Error('Rossi street records missing');
  // facade edges: normal along +-u, on the lines u ~ 340 / 358.5, v >= 318
  const street = (e) => {
    const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
    if (e.len < 3) return null;
    const nu = Math.abs(a.u - b.u) < 2.5;
    if (nu && Math.abs((a.u + b.u) / 2 - 340) < 1.6 && Math.min(a.v, b.v) > 316) return 'east';
    if (nu && Math.abs((a.u + b.u) / 2 - 358.5) < 1.8 && Math.min(a.v, b.v) > 316) return 'west';
    return null;
  };
  let side = 0;
  buildHouse(K, {
    name: 'rossi', recs, hc: 21.4, wall: '#ecd8a0', court: '#e6cf98', plinth: 1.0, plinthMat: M.plinth, floors: [5.0, 4.4, 4.0, 3.6], courtPitch: 4.2, upstand: 0.9, roofMat: M.roofDark, railing: false, collide: true, collideH: 24,
    cornice: 'none',
    front: (e, c) => {
      const k = street(e); if (!k) return false;
      facade(K, M, e, c.len, k, ctx);
      side++;
      return true;
    },
  });
  // Both real OSM frontage shells are already drawn above. The former artificial
  // end pavilion crossed the now-mapped continuation to Lomonosov Square; omit
  // that entire invented mass and its colliders rather than trimming one column.
  K.svc.spots.rossi = { axis: [toWorld(349, 322), toWorld(349, 470)] };
  const [sx, sz] = toWorld(349, 330), [tx, tz] = toWorld(349, 460);
  K.svc.photoSpots.push({ x: sx, z: sz, yaw: Math.atan2(-(tx - sx), -(tz - sz)) * 180 / Math.PI, pitch: 4, name: 'Улица Зодчего Росси', nameEn: 'Rossi Street vista' });
  K.svc.monuments.push({ id: 'rossi-street', name: 'Улица Зодчего Росси', nameEn: 'Zodchego Rossi Street', x: toWorld(349, 400)[0], z: toWorld(349, 400)[1], h: 22 });
}

/** one facade run in the edge frame (x to the right seen from the street, z out) */
function facade(K, M, e, len, kind, ctx) {
  const P = K.P, KM = K.mats, white = M.white, wall = M.rossi, rust = M.rossiGround;
  const n = Math.max(1, Math.round(len / PITCH)), p = len / n;
  const pav = kind === 'east' ? [Math.max(0, len - 18), len] : [0, Math.min(len, 18)];       // the pavilion at the Ostrovsky end (v 319): east facade runs from the south end, west from the north end
  const inPav = (x) => x >= pav[0] && x <= pav[1];
  // ground storey with arched windows, upper wall, belt, base of the order
  const gateK = new Set(); for (let k = 0; k < n; k++) if (k > 3 && k < n - 2 && k % 11 === 6) gateK.add(k);
  for (let k = 0; k < n; k++) {
    const x0 = k * p, x1 = x0 + p, cx = x0 + p / 2, gate = gateK.has(k), pv = inPav(cx), big = pv && Math.abs(cx - (pav[0] + pav[1]) / 2) < p * 0.6;
    const aw = big || gate ? 3.6 : 3.0, ah = big ? 6.0 : gate ? 5.4 : 4.3;
    K.wallWithHoles(rust, x0, x1, Y.PL, Y.G, [{ x: cx, y0: Y.PL + (gate || big ? 0 : 0.9), w: aw, h: (gate || big ? ah : ah) , head: 'arch' }], 1.8);
    // archivolt + glass / gate leaves behind
    const y0 = Y.PL + (gate || big ? 0 : 0.9);
    const sh = new THREE.Shape(); archPath(sh, cx, y0, aw + 0.6, ah - aw / 2, false); const ho = new THREE.Path(); archPath(ho, cx, y0, aw, ah - aw / 2, true); sh.holes.push(ho); P.face(white, sh, 0.05, 1, 8);
    if (gate || big) { const d = new THREE.Shape(); archPath(d, cx, y0, aw, ah - aw / 2, false); P.face(M.door, d, -0.5, 1, 8); } else K.glass(KM.winWhite, cx, y0, aw - 0.1, ah - 0.1, 'arch', (k + 2) % 4, -0.4);
    // oculus in the pier (between the arches)
    if (k > 0) { const d = []; for (let q = 0; q < 8; q++) { const a = q / 8 * 6.2832; d.push([x0 + Math.cos(a) * 0.3, Y.G - 1.2 + Math.sin(a) * 0.3, 0.06]); } P.fan(white, d, [0, 0, 1]); }
    // upper floors
    K.wallQuad(wall, x0, x1, Y.G, Y.ENT, 4);
    // 2nd-floor window with a triangular pediment, 3rd-floor window with a garland panel above
    const wx = cx;
    K.window({ x: wx, y: 9.6, w: 1.5, h: 3.7, head: 'flat', sw: 0.2, d: 0.08, frame: 'white', surMat: white, sillMat: white, hood: 'tri', hoodH: 0.55, hoodOver: 0.4 });
    K.window({ x: wx, y: 15.1, w: 1.15, h: 2.2, head: 'flat', sw: 0.16, d: 0.07, frame: 'white', surMat: white, sillMat: white });
    K.plane(K.R.frieze, x0 + 0.75, x1 - 0.75, 18.0, 19.3, 0.05);
    P.box(white, wx - 0.8, wx + 0.8, 7.6, 7.75, 0, 0.25, 'kb');
  }
  // the colossal order: half columns at the bay boundaries, on a plinth band
  P.box(white, -0.1, len + 0.1, Y.G, Y.COL0, 0, 0.4, 'kb');
  for (let k = 0; k <= n; k++) {
    const x = k * p, end = k === 0 || k === n; if (end && !inPav(x === 0 ? 0.1 : len - 0.1)) { }
    const pv = inPav(x); const proj = pv && (k === 0 || k === n || Math.abs(x - (pav[0] + pav[1]) / 2) < 5) ? 0.9 : 0.55;
    P.cyl(white, [x, Y.COL0, 0.05], [x, Y.COL1 - 0.9, 0.05], 0.55, 0.5, 10, false);
    P.box(white, x - 0.62, x + 0.62, Y.COL0, Y.COL0 + 0.3, -0.1, 0.62, 'b');
    P.cyl(white, [x, Y.COL1 - 0.9, 0.05], [x, Y.COL1 - 0.45, 0.05], 0.5, 0.64, 10, false);
    P.box(white, x - 0.75, x + 0.75, Y.COL1 - 0.45, Y.COL1, -0.1, 0.8, 'b'); void proj;
    if (k > 0 && k < n && 0) P.box(white, x, x, 0, 0, 0, 0);
  }
  // entablature with the dentil band and the deep cornice, attic parapet
  P.box(white, -0.2, len + 0.2, Y.COL1, Y.COL1 + 0.8, 0, 0.9, 'b');
  P.box(wall, -0.15, len + 0.15, Y.COL1 + 0.8, Y.ENT - 0.3, 0, 0.8, 'b');
  P.box(KM.dentil, -0.15, len + 0.15, Y.ENT - 0.45, Y.ENT - 0.1, 0.8, 0.95, 'bk');
  P.box(white, -0.5, len + 0.5, Y.ENT - 0.3, Y.ENT + 0.35, 0, 1.8, 'b');
  P.box(M.whiteShade, -0.5, len + 0.5, Y.ENT + 0.35, Y.TOP, 0.2, 1.7, 'b');
  // yellow downpipes at every 4th pier
  for (let k = 4; k < n; k += 4) P.cyl(K.mat('#e0b457', { name: 'lmE-downYellow' }), [k * p + 0.3, 0.2, 0.62], [k * p + 0.3, Y.ENT - 0.4, 0.62], 0.07, 0.07, 6, false);
  // pavilion: projecting block with a free corner column and a balustraded arched window on the upper floors
  const [a, b] = pav, cxp = (a + b) / 2;
  P.box(M.rossi, a, b, Y.G, Y.ENT, 0.3, 0.9, 'kb');
  for (const x of [kind === 'east' ? b - 1.4 : a + 1.4]) tuscan(K, white, x, 1.6, Y.COL0 - 0.0, Y.COL1, 0.62, 12);
  K.window({ x: cxp, y: 9.6, w: 2.4, h: 6.6, head: 'arch', sw: 0.3, d: 0.1, frame: 'white', surMat: white, sillMat: white, sill: false });
  K.balustrade(cxp - 1.8, cxp + 1.8, 9.6, 0.9, 0.5, white);
  K.window({ x: cxp, y: 17.0, w: 1.4, h: 1.7, head: 'flat', sw: 0.2, d: 0.09, frame: 'white', surMat: white, sillMat: white, hood: 'tri', hoodH: 0.5 });
}
