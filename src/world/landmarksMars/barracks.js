// landmarksMars/barracks.js - the Pavlovsky Barracks (Павловские казармы, V. Stasov 1817-21; OSM r7033586, 3 levels, three courtyards), the west wall of the Mars Field: a 150 m warm yellow
// front (#e4c068) with white columns, window frames and cornice; rusticated ground floor with round-arched windows, two plain upper floors with small pedimented hoods, a central projecting PORTICO of
// TEN white columns over the two upper floors (flat entablature with a lettered frieze, a stepped attic with white trophy / relief groups, three steps down on each side) and two pedimented pavilions of
// four columns at the ends; grey-green iron roof.  Heights: cornice ~19 m, attic to ~22 m (dossier estimate).  No antennas, no flags.  Dossier docs/research/mars-field.md 7.1, photos pav_01 pav_02 pav_06.
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { ringFromFlat } from '../lib/massing.js';
import { portico } from './parts.js';

const G = 7.0, HC = 19.0;
const FDIR = [0.9336, -0.3584];                                                 // the Field's direction (+v) seen from the barracks

export function barracks(K) {
  const P = K.P, ph = K.ctx.physics, tex = K.ctx.tex;
  const rec = L.buildingById('r7033586'); if (!rec) throw new Error('Pavlovsky barracks record r7033586 missing');
  const T = (hex, name, o = {}) => K.mat(hex, { name: 'lmM-' + name, paint: 0.04, ...o });
  const wall = K.wall('#e4c068'), rust = K.rust('#dcb860'), white = T('#f4f0e4', 'pb-white'), shade = T('#dcd4c0', 'pb-shade'), roof = T('#8a948f', 'pb-roof');
  const R = K.R;
  const trophyMat = R.trophy;
  const wallOf = (e, c, gate) => {
    const len = c.len, n = Math.max(4, Math.round((len - 1.6) / 4.5)), p = (len - 1.6) / n;
    const xs = Array.from({ length: n }, (_, i) => 0.8 + p * (i + 0.5));
    K.wallQuad(rust, 0, len, 0.9, G, 3);
    K.wallQuad(wall, 0, len, G, HC + 0.45, 3);
    for (const x of xs) {
      if (gate && Math.abs(x - gate.cx) < gate.hw) continue;                                                   // the portico covers the central bays
      K.window({ x, y: 1.4, w: 1.9, h: 4.8, head: 'arch', sw: 0.2, d: 0.2, frame: 'white', surMat: white, sill: false });
      K.window({ x, y: G + 0.9, w: 1.35, h: 3.2, sw: 0.16, d: 0.1, frame: 'white', surMat: white, hood: 'tri', hoodH: 0.35 });
      K.window({ x, y: G + 5.9, w: 1.25, h: 2.9, sw: 0.14, d: 0.08, frame: 'white', surMat: white, sill: true });
    }
    P.box(white, 0, len, G - 0.2, G + 0.18, 0, 0.3, 'b');
    return { xs, n, p };
  };
  const front = (e, c) => {
    if (e.hole || e.len < 30) return false;
    const field = e.len > 120 && e.n[0] * FDIR[0] + e.n[1] * FDIR[1] > 0.95;
    if (!field) { wallOf(e, c, null); return true; }
    const len = c.len, cx = len / 2, hw = 17.5;
    wallOf(e, c, { cx, hw });
    // ---- the central portico: rusticated podium (arched openings), ten columns, entablature with lettering, the stepped attic
    const dep = 4.6, x0 = cx - 16.2, x1 = cx + 16.2;
    P.box(rust, x0 - 0.6, x1 + 0.6, 0.9, G, 0, dep + 0.6, 'b');                                                // podium block in front of the ground floor
    P.push(0, 0, dep + 0.62, 0);
    for (let i = 0; i < 7; i++) { const x = x0 + 1.9 + i * (x1 - x0 - 3.8) / 6; K.window({ x, y: 1.4, w: 2.0, h: 4.8, head: 'arch', sw: 0.22, d: 0.12, frame: 'white', surMat: white, sill: false }); }
    P.pop();
    P.box(white, x0 - 0.8, x1 + 0.8, G - 0.25, G + 0.2, 0, dep + 0.9, 'b');                                     // the podium cornice (the floor of the portico)
    // the recessed upper wall of the portico: window rows
    P.push(0, 0, 0.0, 0);
    for (let i = 0; i < 9; i++) { const x = x0 + 1.8 + i * (x1 - x0 - 3.6) / 8 + 0; K.window({ x, y: G + 1.2, w: 1.5, h: 4.2, sw: 0.18, d: 0.1, frame: 'white', surMat: white, hood: 'tri', hoodH: 0.4 }); K.window({ x, y: G + 6.4, w: 1.4, h: 3.3, sw: 0.16, d: 0.1, frame: 'white', surMat: white }); }
    P.pop();
    const cols = Array.from({ length: 10 }, (_, i) => x0 + 0.6 + i * (x1 - x0 - 1.2) / 9), cy1 = HC - 2.0, cz = dep;
    for (const x of cols) K.column(white, x, cz, G, cy1, 0.62, { seg: 14, volutes: false });
    // entablature: architrave, lettered frieze, cornice (front at cz + 1.5)
    const zf = cz + 1.5;
    P.box(white, x0, x1, cy1, cy1 + 0.75, 0.0, zf, 'b'); P.box(shade, x0 - 0.1, x1 + 0.1, cy1 + 0.75, cy1 + 1.6, 0.0, zf - 0.04, 'b'); P.box(white, x0 - 0.35, x1 + 0.35, cy1 + 1.6, cy1 + 2.0, 0.0, zf + 0.38, 'b');
    K.fascia(x0 + 1.0, x1 - 1.0, cy1 + 0.86, cy1 + 1.5, 'ЛЕЙБ-ГВАРДИИ ПАВЛОВСКИЙ ПОЛК', { w: 1024, h: 90, bg: '#dcd4c0', fg: '#4a3f2c', font: tex.FONTS.serif, z: zf - 0.0, size: 0.6 });
    // the stepped attic: centre block, two lower steps on each side, white relief groups
    const top0 = HC + 0.0, tiers = [[cx - 5, cx + 5, 3.3], [cx - 11, cx - 5, 2.3], [cx + 5, cx + 11, 2.3], [cx - 16.4, cx - 11, 1.2], [cx + 11, cx + 16.4, 1.2]];
    for (const [a, b, h] of tiers) {
      P.box(wall, a, b, top0, top0 + h, 0.4, zf - 0.6, 'b'); P.box(white, a - 0.15, b + 0.15, top0 + h, top0 + h + 0.3, 0.3, zf - 0.4, 'b');
      const k = Math.max(1, Math.round((b - a) / 3.4)), w = (b - a) / k;
      for (let i = 0; i < k; i++) K.plane(trophyMat, a + w * (i + 0.5) - Math.min(1.3, w * 0.4), a + w * (i + 0.5) + Math.min(1.3, w * 0.4), top0 + 0.3, top0 + h - 0.1, zf - 0.55);
    }
    // ---- the two end pavilions (four columns + a pediment) projecting 2.8 m
    for (const xc of [10, len - 10]) {
      const px0 = xc - 7.2, px1 = xc + 7.2;
      P.box(rust, px0 - 0.4, px1 + 0.4, 0.9, G, 0, 2.9, 'b'); P.box(white, px0 - 0.5, px1 + 0.5, G - 0.25, G + 0.2, 0, 3.2, 'b');
      portico(K, { x0: px0, x1: px1, depth: 2.6, y0: G, y1: HC - 2.0, r: 0.5, xs: [px0 + 1.0, px0 + 1.0 + 3.7, px1 - 1.0 - 3.7, px1 - 1.0], ent: 1.9, ped: 2.7, mat: white, matShade: shade, wallMat: wall, steps: false });
      // colliders of the pavilion podium (world position through the edge frame)
      const f = c.f, wx = f.x + f.xa[0] * xc + e.n[0] * 1.5, wz = f.z + f.xa[1] * xc + e.n[1] * 1.5;
      ph.addBox(wx, wz, 15.0, 3.4, Math.atan2(f.xa[1] * -1, f.xa[0]), 0, G + 2);
    }
    // collider of the portico podium + steps
    { const f = c.f, wx = f.x + f.xa[0] * cx + e.n[0] * (dep / 2 + 0.3), wz = f.z + f.xa[1] * cx + e.n[1] * (dep / 2 + 0.3); ph.addBox(wx, wz, x1 - x0 + 1.4, dep + 0.8, Math.atan2(-f.xa[1], f.xa[0]), 0, G + 2); }
    { const f = c.f; K.svc.entrances.push({ x: f.x + f.xa[0] * cx + e.n[0] * (dep + 1.6), z: f.z + f.xa[1] * cx + e.n[1] * (dep + 1.6), rotY: Math.atan2(e.n[0], e.n[1]), bldg: 'r7033586' }); }
    K.svc.front = { x: -1270, z: -1275 };
    return true;
  };
  buildHouse(K, { name: 'barracks', recs: [rec], hc: HC, wall: '#e4c068', court: '#e8c870', plinth: 0.9, plinthMat: K.rust('#8c8a82'), floors: [7.0, 6.0, 5.5], courtPitch: 4.5, corniceMat: white, roof: 'none', railing: true, front, partyOpts: { tol: 0.7 }, collideH: 24 });
  const poly = rec.polys[0];
  P.cap(roof, ringFromFlat(poly.o), HC + 0.5, true, 4, poly.h.map(ringFromFlat));
  K.svc.houses.push({ id: 'r7033586', name: 'Павловские казармы', x: -1300, z: -1260 });
  K.svc.monuments.push({ id: 'r7033586', name: 'Павловские казармы', x: -1270, z: -1275, h: 22 });
}
export const build = barracks;
