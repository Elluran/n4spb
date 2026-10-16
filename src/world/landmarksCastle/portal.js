// landmarksCastle/portal.js - the SOUTH FACADE of the Engineering Castle (photos refs/summer-garden 107, 111, 104; dossier 8.1): the rusticated grey-pink marble portal block (29.2 m wide, projecting 2.4 m, centre
// b = -6.6) with the gateway, the arched window with its balustrade balcony, two tapering marble obelisks with armour reliefs and medallions, the entablature with the dark-red band of gilt lettering
// "ДОМУ ТВОЕМУ / ПОДОБАЕТЪ СВЯТЫНЯ ГОСПОДНЯ / ВЪ ДОЛГОТУ ДНЕЙ", the pediment with its relief, the grey marble attic block; on both sides a colonnade of free-standing Ionic columns (a close pair, then one per
// window) on a balustraded ledge; the vaulted-flat passage from the gate through the south wing to the court (19.5 m, 4.6 x 6.0 m).
// Frame: the castle frame (frame.js) pushed to the wing wall plane a = 54: model x = -b (east to the right seen from the south), z out of the wall, portal front plane z = 2.4, portal centre x = 6.6.
import * as THREE from 'three';
import { C0, ROT, W } from './frame.js';
import { WING_M } from './castle.js';
import { flora, hercules } from './north.js';
import { figureMats } from '../lib/figures.js';

const CX = 6.6, PW = 14.6, ZF = 2.4;                   // portal centre x, half width, front plane
const TOP_COL = 17.4, Y_ENT = 19.55, Y_COR = 20.3;

function taper(P, mat, cx, cz, w0, d0, w1, d1, y0, y1) {
  const c = (w, d, sx, sz, y) => [cx + sx * w / 2, y, cz + sz * d / 2];
  const A0 = c(w0, d0, -1, -1, y0), B0 = c(w0, d0, 1, -1, y0), C0_ = c(w0, d0, 1, 1, y0), D0 = c(w0, d0, -1, 1, y0);
  const A1 = c(w1, d1, -1, -1, y1), B1 = c(w1, d1, 1, -1, y1), C1 = c(w1, d1, 1, 1, y1), D1 = c(w1, d1, -1, 1, y1);
  P.quad(mat, D0, C0_, C1, D1, [0, 0.05, 1]); P.quad(mat, B0, A0, A1, B1, [0, 0.05, -1]);
  P.quad(mat, C0_, B0, B1, C1, [1, 0.05, 0]); P.quad(mat, A0, D0, D1, A1, [-1, 0.05, 0]);
  P.quad(mat, D1, C1, B1, A1, [0, 1, 0]);
}

export function build(K, M, D, svc) {
  const P = K.P, ph = K.ctx.physics;
  const pitch = K.wingPitch || {};
  P.push(C0.x, 0, C0.z, ROT); P.push(0, 0, 54, 0);                     // wing wall plane
  try {
    // ------------------------------------------------------------------ the portal block
    P.push(CX, 0, ZF, 0);                                              // portal front plane, x = 0 at the gate axis
    try {
      K.wallWithHoles(M.rustMarble, -PW, PW, 0, TOP_COL, [{ x: 0, y0: 0, w: 4.6, h: 6.0, head: 'flat' }, { x: 0, y0: 8.8, w: 3.2, h: 5.4, head: 'arch' }], 2.4, 1.2);
      // returns of the block (2.4 m deep) and the plinth face
      P.quad(M.rustMarble, [PW, 0, 0], [PW, 0, -ZF], [PW, TOP_COL, -ZF], [PW, TOP_COL, 0], [1, 0, 0], [[0, 0], [1, 0], [1, 7], [0, 7]]);
      P.quad(M.rustMarble, [-PW, 0, -ZF], [-PW, 0, 0], [-PW, TOP_COL, 0], [-PW, TOP_COL, -ZF], [-1, 0, 0], [[0, 0], [1, 0], [1, 7], [0, 7]]);
      for (const s of [-1, 1]) {
        P.box(M.plinth, s > 0 ? 2.9 : -PW - 0.15, s > 0 ? PW + 0.15 : -2.9, 0, 2.4, 0, 0.3, 'bk');          // dark granite base either side of the gate
        // ground-storey blind niches
        const nx = s * 9.4;
        const sh = new THREE.Shape(); sh.moveTo(nx - 0.85, 2.7); sh.lineTo(nx + 0.85, 2.7); sh.lineTo(nx + 0.85, 5.0); sh.absarc(nx, 5.0, 0.85, 0, Math.PI, false); sh.lineTo(nx - 0.85, 2.7);
        P.face(M.marbleDark, sh, 0.04, 1, 10);
        P.box(M.trim, nx - 1.05, nx - 0.85, 2.7, 5.9, 0, 0.12, 'kb'); P.box(M.trim, nx + 0.85, nx + 1.05, 2.7, 5.9, 0, 0.12, 'kb');
        // small windows beside the balcony window (piano nobile, rectangular, marble frame)
        for (const dx of [6.6, 11.0]) K.window({ x: s * dx, y: 9.2, w: 1.2, h: 2.6, sw: 0.22, d: 0.12, surMat: M.marbleLight, frame: 'brown', v: 1 });
        for (const dx of [6.6, 11.0]) K.window({ x: s * dx, y: 14.0, w: 1.1, h: 1.7, sw: 0.18, d: 0.1, surMat: M.marbleLight, frame: 'brown', v: 2 });
      }
      // the rustication is interrupted by smooth string courses
      P.box(M.marbleLight, -PW, PW, 7.2, 7.7, 0, 0.14, 'kb'); P.box(M.marbleLight, -PW, PW, 13.2, 13.6, 0, 0.14, 'kb');
      // gateway: pilasters, lintel with a small cornice, dark interior comes from the passage
      for (const s of [-1, 1]) { P.box(M.marbleLight, s * 2.3 - (s > 0 ? 0 : 0.5), s * 2.3 + (s > 0 ? 0.5 : 0), 0, 6.0, 0, 0.3, 'kb'); }
      P.box(M.marbleLight, -2.9, 2.9, 6.0, 6.7, 0, 0.35, 'kb'); P.box(M.marbleLight, -3.1, 3.1, 6.7, 7.0, 0, 0.5, 'kb');
      // arched window: marble surround, dark glass, balcony with a stone balustrade
      K.glass(K.mats.winBrown, 0, 8.8, 3.2, 5.4, 'arch', 3, -0.06);
      K.surround(M.marbleLight, 0, 8.8, 3.2, 5.4, 'arch', 0.35, 0.22);
      P.box(M.marbleLight, -2.8, 2.8, 8.25, 8.55, 0, 1.0, 'k');
      for (const s of [-1, 1]) for (const q of [0.4, 1.2, 2.0]) P.box(M.marbleLight, s * (q + 0.3) - 0.07, s * (q + 0.3) + 0.07, 8.55, 9.45, 0.82, 0.96, 'kb');
      P.box(M.marbleLight, -2.8, 2.8, 9.45, 9.6, 0.7, 1.0, 'k');
      // OBELISKS with the armour reliefs and the monogram medallions
      for (const s of [-1, 1]) {
        const ox = s * 6.3, oz = 1.0;
        P.box(M.marbleLight, ox - 1.5, ox + 1.5, 0, 0.9, oz - 1.1, oz + 1.1, 'b');
        P.box(M.marble, ox - 1.65, ox + 1.65, 0, 0.35, oz - 1.25, oz + 1.25, 'b');
        taper(P, M.marbleLight, ox, oz, 1.95, 1.65, 1.45, 1.2, 0.9, 14.2);
        P.box(M.marbleLight, ox - 0.95, ox + 0.95, 14.2, 14.7, oz - 0.8, oz + 0.8, 'b');
        const zf = (y) => oz + (1.65 + (1.2 - 1.65) * (y - 0.9) / 13.3) / 2 + 0.04;
        K.plane(K.R.trophy, ox - 0.75, ox + 0.75, 2.3, 3.9, zf(3.1));
        P.box(M.marbleDark, ox - 0.6, ox + 0.6, 2.0, 4.3, zf(3.1) - 0.05, zf(3.1) - 0.02, 'kb');
        P.cyl(M.marble, [ox, 10.9, zf(10.9) - 0.02], [ox, 10.9, zf(10.9) + 0.06], 0.52, 0.52, 14, true);
        P.cyl(M.gold, [ox, 10.9, zf(10.9) + 0.05], [ox, 10.9, zf(10.9) + 0.09], 0.3, 0.3, 10, true);
        ph.addBox(...(() => { const w = W(CX + ox, 54 + ZF + oz); return [w.x, w.z, 3.3, 2.5, ROT, 0, 15]; })());
      }
      // entablature over the block: architrave, the dark red band with gilt lettering, cornice
      P.box(M.marbleLight, -PW - 0.15, PW + 0.15, TOP_COL, TOP_COL + 0.95, 0, 2.25, 'k');
      P.quad(M.inscrP, [-PW - 0.15, TOP_COL + 0.95, 2.28], [PW + 0.15, TOP_COL + 0.95, 2.28], [PW + 0.15, Y_ENT, 2.28], [-PW - 0.15, Y_ENT, 2.28], [0, 0, 1]);
      P.box(M.inscrPlain, -PW - 0.15, PW + 0.15, TOP_COL + 0.95, Y_ENT, 0, 2.25, 'kf');
      P.box(M.marbleLight, -PW - 0.4, PW + 0.4, Y_ENT, Y_COR, 0, 2.8, '');
      // pediment with its relief, rising from the cornice
      const yb = Y_COR, hw = PW + 0.4, rise = 3.5;
      const sh = new THREE.Shape(); sh.moveTo(-hw, yb); sh.lineTo(hw, yb); sh.lineTo(0, yb + rise + 0.5); sh.lineTo(-hw, yb);
      const hole = new THREE.Path(); hole.moveTo(-hw + 1.1, yb + 0.3); hole.lineTo(0, yb + rise - 0.3); hole.lineTo(hw - 1.1, yb + 0.3); hole.lineTo(-hw + 1.1, yb + 0.3); sh.holes.push(hole);
      P.extrude(M.marbleLight, sh, -1.5, 4.3, 1, 4);                                       // raking frame, front at z = 2.8
      const fill = new THREE.Shape(); fill.moveTo(-hw + 1.0, yb + 0.2); fill.lineTo(hw - 1.0, yb + 0.2); fill.lineTo(0, yb + rise - 0.2); fill.lineTo(-hw + 1.0, yb + 0.2);
      P.extrude(M.marble, fill, -1.5, 2.4, 1, 4);                                          // tympanum, front at z = 0.9
      K.plane(M.tympanum, -6.4, 6.4, yb + 0.4, yb + 1.9, 0.96);
      // attic block above and behind the pediment (grey marble, plain) with a small cornice
      P.box(M.marbleLight, -8.6, 8.6, Y_COR, 27.1, -9.5, -4.2, 'b');
      P.box(M.marble, -9.1, 9.1, 26.5, 27.4, -10.0, -3.7, 'b');
      // the statues of the roof line (Strength, Abundance, Victory, Glory ...): six figures on plinths on the attic cornice and the pediment corners
      { const mk = figureMats(K.ctx).keys('bronze', 'bronze'); mk.main && 0;
        const spots = [[-7.4, 27.4, -6.6], [-3.6, 27.4, -6.6], [3.6, 27.4, -6.6], [7.4, 27.4, -6.6], [-PW - 0.2, Y_COR, 1.9], [PW + 0.2, Y_COR, 1.9]];
        spots.forEach(([x, y, z], i) => {
          P.box(M.marble, x - 0.55, x + 0.55, y, y + 1.0, z - 0.55, z + 0.55, 'b');
          (i % 2 ? hercules() : flora()).place(P, mk, x, y + 1.0, z, 0, 1.15);
        }); }
    } finally { P.pop(); }

    // ------------------------------------------------------------------ the colonnades of the wings
    const cols = [];
    const wing = (side) => {                                           // side +1 = east wing (x > portal), -1 = west
      const xe = CX + side * PW, p = side > 0 ? (pitch.E || 3.9) : (pitch.W || 3.9);
      const dists = [1.1, 2.7]; for (let k = 1; k <= 5; k++) dists.push(WING_M + k * p);
      const dEnd = WING_M + 5 * p + 1.3;
      const x0 = side > 0 ? xe : xe - dEnd, x1 = side > 0 ? xe + dEnd : xe;
      // ledge, balustrade, entablature
      P.box(M.marbleLight, x0, x1, 6.9, 7.95, 0, 2.25, 'b');
      P.box(M.marble, x0, x1, 6.6, 6.9, 0, 2.05, 'b');
      P.box(M.marbleLight, x0, x1, 7.95, 8.2, 1.75, 2.2, 'b');
      for (let b = x0 + 0.2; b < x1 - 0.1; b += 0.34) P.box(M.marbleLight, b - 0.06, b + 0.06, 8.2, 8.9, 1.88, 2.06, 'tb');
      P.box(M.marbleLight, x0, x1, 8.9, 9.1, 1.75, 2.25, 'b');
      for (const d of dists) {
        const x = xe + side * d; cols.push(x);
        K.column(M.marbleLight, x, 1.6, 7.95, TOP_COL, 0.4, { volutes: true, capH: 0.7, seg: 14 });
      }
      P.box(M.marbleLight, x0, x1, TOP_COL, TOP_COL + 0.95, 0, 2.25, 'k');
      P.box(M.inscrPlain, x0, x1, TOP_COL + 0.95, Y_ENT, 0, 2.25, 'kf');
      const mat = side > 0 ? M.inscrE : M.inscrW;
      P.quad(mat, [x0, TOP_COL + 0.95, 2.28], [x1, TOP_COL + 0.95, 2.28], [x1, Y_ENT, 2.28], [x0, Y_ENT, 2.28], [0, 0, 1]);
      P.box(M.marbleLight, x0 - 0.2, x1 + 0.2, Y_ENT, Y_COR, 0, 2.7, '');
    };
    wing(1); wing(-1);
    for (const x of cols) { const w = W(x, 54 + 1.6); ph.addCylinder(w.x, w.z, 0.5, 0, 18); }

    // ------------------------------------------------------------------ the passage from the gate to the court (x = CX +-2.3, z from the front plane back to a = 36.9)
    const x0 = CX - 2.3, x1 = CX + 2.3, zf = ZF, zb = 36.9 - 54, yt = 6.0;
    P.quad(M.tunnelFloor, [x0, 0.04, zf], [x1, 0.04, zf], [x1, 0.04, zb], [x0, 0.04, zb], [0, 1, 0], [[0, 0], [1, 0], [1, 9], [0, 9]]);
    P.quad(M.tunnel, [x0, yt, zb], [x1, yt, zb], [x1, yt, zf], [x0, yt, zf], [0, -1, 0]);
    P.quad(M.tunnel, [x0, 0, zf], [x0, 0, zb], [x0, yt, zb], [x0, yt, zf], [1, 0, 0]);
    P.quad(M.tunnel, [x1, 0, zb], [x1, 0, zf], [x1, yt, zf], [x1, yt, zb], [-1, 0, 0]);
    // wooden gate leaves standing open against the side walls
    for (const s of [-1, 1]) P.box(M.dark, CX + s * 2.3 - (s > 0 ? 0.12 : -0.0), CX + s * 2.3 + (s > 0 ? 0 : 0.12), 0.05, 5.8, ZF - 3.2, ZF - 0.2, 'b');
  } finally { P.pop(); P.pop(); }
  svc.entrances.push({ x: -739.4, z: -833.8, rotY: Math.PI + ROT * 0, name: 'Южный портал' });
}
