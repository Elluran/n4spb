// landmarksOktyabrsky/hall.js - the Bolshoy Concert Hall "Oktyabrsky" (Ligovsky pr. 6; V. A. Kamensky, A. V. Zhuk, Zh. M. Verzhbitsky, G. M. Vlanin, 1967; OSM w30324279 + part w929214560).
// Dossier docs/research/oktyabrsky.md sections 2-8, photos refs/oktyabrsky 01 02 03 05 06 08 10 (hall frame: frame.js; every number below is in that frame: u along the front, v into the building, y up).
// TWO VOLUMES: the low light-stone FOYER block (roof 13.0 m) that wraps a windowless stone CUBE (the auditorium and stage, top 24 m) on three sides.  The front is one 43.4 m glass wall (20 bays of 2.17 m,
// golden-bronze mullions) recessed 3 m under a cantilevered slab (fascia 2.2 m, soffit 10.8 m with a recessed round downlight per bay and row) between two solid 12 m end blocks; a 26 m dark bronze frieze
// over five double-door groups; a seven-riser granite stair along the whole front onto the stylobate (y +1.2); the cube clad in 0.5 m dolomite strips with a row of 66 small louvred apertures (y 17.2: the row the frontal photo 03 shows just above the fascia edge);
// louvre screen / glazed bay / black stair cage / white fluted annex on the SSW flank, the 6 m low wings and rear doors, roof hatches and plant boxes.  Behind the glass a dim interior shell (parquet,
// ten white columns, two stair flights, the mezzanine gallery).  The FOYER is ENTERABLE (frame.js FOYER_OPEN, review 2026-10-07: the five door groups are open passages, a landing + 7 interior risers lead down to the parquet at plaza level so that the user L-pose 771,1.5,-355.9 stands on it; false = the sealed builder version with the floor at +1.2): thin wall colliders on the OSM outline and round the foyer shell, the stair and the stylobate are walkable.
// Stages run one by one inside try/catch (a failing stage never takes the module down).  Claim: groups.js key 'oktyabrsky-hall' (ids w30324279; its part w929214560 follows through `parent`).
import * as THREE from 'three';
import * as L from '../layout.js';
import { HALL, OUT, CUBE, HT, FR, STAIR, IN, FOYER_OPEN, W, V_DIR, flankU, cubeU, HF } from './frame.js';

const DEG = Math.PI / 180;
const A_ = OUT[0], B_ = OUT[1], C_ = OUT[2], D_ = OUT[3];     // SSW-front, NNE-front, NNE-rear, SSW-rear corners of the outline
const P0 = CUBE[0], P1 = CUBE[1], P2 = CUBE[2], P3 = CUBE[3];  // cube: front-SSW, front-NNE, rear-NNE, rear-SSW
const SV = FR.stepV;
const CEN = [33.5, 47], GLASS_V = FR.glassV;

/** a wall quad between two hall points a, b ([u, v]) from y0 to y1, facing AWAY from `inside`; texture tile tu x tv metres, u read left to right as seen from outside (no mirroring); o.v = [v0, v1] overrides the v range */
function WQ(P, mat, a, b, y0, y1, inside, tu = 4, tv = 2, o = {}) {
  let nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz); if (l < 0.01 || y1 <= y0) return;
  nx /= l; nz /= l;
  if (nx * ((a[0] + b[0]) / 2 - inside[0]) + nz * ((a[1] + b[1]) / 2 - inside[1]) < 0) { nx = -nx; nz = -nz; }
  const rx = nz, rz = -nx, s = (p) => (p[0] * rx + p[1] * rz) / tu + (o.s0 || 0);
  const v0 = o.v ? o.v[0] : y0 / tv, v1 = o.v ? o.v[1] : y1 / tv;
  P.quad(mat, [a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], [nx, 0, nz], [[s(a), v0], [s(b), v0], [s(b), v1], [s(a), v1]]);
  return [nx, nz];
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** a box along the edge a -> b of the hall plane: `w` wide (centred on the edge shifted by `off` toward the left of travel), y0..y1 */
function strip(P, mat, a, b, y0, y1, w, off = 0) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.05) return;
  P.push(a[0], 0, a[1], Math.atan2(-dz, dx));
  P.box(mat, 0, len, y0, y1, off - w / 2, off + w / 2, 'b', 1);
  P.pop();
}

export function build(K) {
  const errs = [];
  const stage = (name, fn) => { try { fn(); } catch (e) { console.error(`[landmarksOktyabrsky] hall/${name}:`, e); errs.push(`${name}: ${e && e.stack || e}`); } };
  const P = K.P;
  P.push(HALL.x, 0, HALL.z, HALL.rot);
  try {
    stage('stone', () => stone(K));
    stage('front', () => front(K));
    stage('stair', () => stair(K));
    stage('interior', () => interior(K));
    stage('flanks', () => flanks(K));
    stage('roof', () => roofTop(K));
  } finally { P.pop(); }
  stage('colliders', () => colliders(K));
  const c = W(CEN[0], CEN[1]);
  K.svc.hall = { centre: [c.x, c.z], top: HT.cube };
  K.svc.monuments.push({ id: 'w30324279', name: 'Большой концертный зал «Октябрьский»', x: c.x, z: c.z, h: HT.cube });
  if (errs.length) throw new Error(errs.join('\n'));
}

// ------------------------------------------------------------------------------------------------ stone: foyer ring, slab, cube
function stone(K) {
  const P = K.P, M = K.M;
  const ssw = (v) => flankU('ssw', v), nne = (v) => flankU('nne', v), cs = (v) => cubeU('ssw', v), cn = (v) => cubeU('nne', v);
  const Es = [ssw(SV), SV], En = [nne(SV), SV], Fs = [cs(SV), SV], Fn = [cn(SV), SV];
  const fq = (mat, u0, u1, y0, y1, tu, tv) => WQ(P, mat, [u0, 0], [u1, 0], y0, y1, CEN, tu, tv);

  // ---- the front at v = 0 (outline edge A' - B'): end blocks to the stylobate, the slab fascia between them (one plane, no overlaps)
  fq(M.slabs, A_[0], FR.u0, HT.st, HT.roof, 4.8, 2.8);
  fq(M.slabs, FR.u0, FR.u1, HT.gl, HT.roof, 4.8, 2.8);
  fq(M.slabs, FR.u1, B_[0], HT.st, HT.roof, 4.8, 2.8);
  // soffit with its downlights (one bay = 2.17 m in u, the 3 m depth in v)
  P.quad(M.soffit, [FR.u0, HT.gl, 0], [FR.u1, HT.gl, 0], [FR.u1, HT.gl, GLASS_V], [FR.u0, HT.gl, GLASS_V], [0, -1, 0], [[0, 0], [FR.bays, 0], [FR.bays, 1], [0, 1]]);
  // reveals of the glass recess (the inner faces of the end blocks)
  P.quad(M.slabs, [FR.u0, HT.st, 0], [FR.u0, HT.st, GLASS_V], [FR.u0, HT.gl, GLASS_V], [FR.u0, HT.gl, 0], [1, 0, 0], [[0, HT.st / 2.8], [GLASS_V / 4.8, HT.st / 2.8], [GLASS_V / 4.8, HT.gl / 2.8], [0, HT.gl / 2.8]]);
  P.quad(M.slabs, [FR.u1, HT.st, GLASS_V], [FR.u1, HT.st, 0], [FR.u1, HT.gl, 0], [FR.u1, HT.gl, GLASS_V], [-1, 0, 0], [[0, HT.st / 2.8], [GLASS_V / 4.8, HT.st / 2.8], [GLASS_V / 4.8, HT.gl / 2.8], [0, HT.gl / 2.8]]);

  // ---- flank walls and the rear wall of the ring (heights: 13 m up to the step line SV, 6 m wings behind it)
  WQ(P, M.slabs, A_, Es, 0, HT.roof, CEN, 4.8, 2.8);
  WQ(P, M.ribs, Es, D_, 0, HT.low, CEN, 2, 2);                                  // the white fluted annex of the SSW flank
  WQ(P, M.slabs, B_, En, 0, HT.roof, CEN, 4.8, 2.8);
  WQ(P, M.slabs, En, C_, 0, HT.low, CEN, 4.8, 2.8);
  WQ(P, M.slabs, D_, C_, 0, HT.low, CEN, 4.8, 2.8);                              // rear strip
  // the step walls where the 13 m block meets the 6 m wings (facing the rear)
  WQ(P, M.slabs, Es, Fs, HT.low, HT.roof, [Es[0], SV - 10], 4.8, 2.8);
  WQ(P, M.slabs, Fn, En, HT.low, HT.roof, [En[0], SV - 10], 4.8, 2.8);

  // ---- decks of the ring: the 13 m front block + the flank blocks (up to SV) and the 6 m wings / rear strip
  P.cap(M.roof, [A_, B_, P1, P0], HT.roof, true, 2);
  P.cap(M.roof, [B_, En, Fn, P1], HT.roof, true, 2);
  P.cap(M.roof, [A_, P0, Fs, Es], HT.roof, true, 2);
  P.cap(M.roof, [En, C_, P2, Fn], HT.low, true, 2);
  P.cap(M.roof, [Es, Fs, P3, D_], HT.low, true, 2);
  P.cap(M.roof, [D_, P3, P2, C_], HT.low, true, 2);
  // stone coping along the 13 m edges (front, flanks to the step line) and the low edges
  const cop = (a, b, y) => strip(P, M.dolo, a, b, y, y + 0.16, 0.36, 0.0);
  cop(A_, B_, HT.roof); cop(B_, En, HT.roof); cop(A_, Es, HT.roof); cop(En, C_, HT.low); cop(Es, D_, HT.low); cop(D_, C_, HT.low);

  // ---- the cube: strips, the aperture row (y 17.2 .. 17.6), flanks and rear down to the low wings
  const Ps = [cs(SV), SV], Pn = [cn(SV), SV];
  const yA = HT.apert, yB = HT.apert + 0.4, TOP = HT.cube;
  WQ(P, M.strips, P0, P1, HT.roof, yA, CEN, 4, 4);
  WQ(P, M.apert, P0, P1, yA, yB, CEN, 0.71, 0.4, { v: [0, 1] });
  WQ(P, M.strips, P0, P1, yB, TOP, CEN, 4, 4);
  WQ(P, M.strips, P0, Ps, HT.roof, TOP, CEN, 4, 4); WQ(P, M.strips, Ps, P3, HT.low, TOP, CEN, 4, 4);
  WQ(P, M.strips, P1, Pn, HT.roof, TOP, CEN, 4, 4); WQ(P, M.strips, Pn, P2, HT.low, TOP, CEN, 4, 4);
  WQ(P, M.strips, P3, P2, HT.low, TOP, CEN, 4, 4);
}

// ------------------------------------------------------------------------------------------------ the glazed front
function front(K) {
  const P = K.P, M = K.M, ctx = K.ctx, labels = ctx.services.labels;
  const u0 = FR.u0, u1 = FR.u1, GV = FR.glassV, y0 = HT.st, y1 = HT.gl, pitch = FR.bay;
  // the glass: one translucent pane (interior seen dimly), the spandrel band as opaque panels in front of it (not where the frieze hangs)
  P.quad(M.glass, [u0, y0, GV], [u1, y0, GV], [u1, y1, GV], [u0, y1, GV], [0, 0, -1]);
  // the mirrored street: a translucent unlit sheet 1.5 cm in front of the glass (the spandrel panels, the frieze and the door leaves stand in front of it)
  P.quad(M.reflect, [u0, y0 + 0.3, GV - 0.015], [u1, y0 + 0.3, GV - 0.015], [u1, y1, GV - 0.015], [u0, y1, GV - 0.015], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]]);
  const spand = (ua, ub) => P.quad(M.spandrel, [ua, 3.7, GV - 0.03], [ub, 3.7, GV - 0.03], [ub, 4.9, GV - 0.03], [ua, 4.9, GV - 0.03], [0, 0, -1]);
  spand(u0, 19.7); spand(45.6, u1);
  // frieze (M. K. Anikushin 1967): 25.9 x 1.2 m, 0.15 m proud of the glass, dark bronze relief (no portraits, no banners)
  const fz0 = 19.7, fz1 = 45.6, fy0 = 3.7, fy1 = 4.9;
  P.box(M.friezeBack, fz0, fz1, fy0, fy1, GV - 0.15, GV - 0.04, 'bkf', 1);
  P.quad(M.frieze, [fz0, fy0, GV - 0.15], [fz1, fy0, GV - 0.15], [fz1, fy1, GV - 0.15], [fz0, fy1, GV - 0.15], [0, 0, -1], [[1, 0], [0, 0], [0, 1], [1, 1]]);
  // mullions (golden bronze, 0.06 x 0.15 proud of the glass), rails and the granite sill
  for (let i = 0; i <= FR.bays; i++) { const u = u0 + i * pitch; P.box(M.mull, u - 0.03, u + 0.03, y0 + 0.3, y1, GV - 0.1, GV + 0.04, 'b', 1); }
  for (const [ya, yb] of [[3.62, 3.7], [4.9, 4.96], [8.14, 8.26], [10.7, 10.8]]) {
    if (ya === 3.62 || ya === 4.9) { P.box(M.mull, u0, fz0, ya, yb, GV - 0.1, GV + 0.04, 'b', 1); P.box(M.mull, fz1, u1, ya, yb, GV - 0.1, GV + 0.04, 'b', 1); }
    else P.box(M.mull, u0, u1, ya, yb, GV - 0.1, GV + 0.04, 'b', 1);
  }
  P.box(M.tread, u0 - 0.1, u1 + 0.1, y0, y0 + 0.3, GV - 0.3, GV + 0.1, 'b', 1);                                                     // granite sill
  // five door groups: two leaves 0.9 x 2.2 m in dark bronze frames, a transom, long bar handles
  for (const du of FR.doors) {
    const zf = GV - 0.07, ya = y0 + 0.3, yt = 3.6;                                                                                   // the door zone is 1.5 .. 3.7 m: the frieze hangs right above the doors
    P.box(M.doorFrame, du - 0.95, du + 0.95, yt, yt + 0.1, zf - 0.03, zf + 0.06, 'b', 1);                                           // head rail
    for (const s of [-1, 1]) {
      const cx = du + s * 0.45;
      P.quad(M.doorGlass, [cx - 0.42, ya + 0.08, zf], [cx + 0.42, ya + 0.08, zf], [cx + 0.42, yt - 0.06, zf], [cx - 0.42, yt - 0.06, zf], [0, 0, -1]);
      P.box(M.doorFrame, cx - 0.45, cx - 0.4, ya, yt, zf - 0.03, zf + 0.04, 'b', 1); P.box(M.doorFrame, cx + 0.4, cx + 0.45, ya, yt, zf - 0.03, zf + 0.04, 'b', 1);
      P.box(M.doorFrame, cx - 0.45, cx + 0.45, ya, ya + 0.1, zf - 0.03, zf + 0.04, 'b', 1); P.box(M.doorFrame, cx - 0.45, cx + 0.45, yt - 0.08, yt, zf - 0.03, zf + 0.04, 'b', 1);
      P.box(M.steel, cx - s * 0.33 - 0.015, cx - s * 0.33 + 0.015, ya + 0.9, ya + 1.5, zf - 0.09, zf - 0.04, 'b', 1);                  // bar handle
    }
    P.box(M.doorFrame, du - 0.02, du + 0.02, ya, ya + 2.36, zf - 0.03, zf + 0.04, 'b', 1);                                          // the meeting stile
  }
  // posters inside the glass (generic sheets, two groups: 6 and 8 sheets of 0.6 x 0.85 m, two rows), 0.2 m behind the glass
  const poster = (ua, ub, n) => {
    const f = n / 8, c = W((ua + ub) / 2, GV + 0.2);
    if (labels && labels.reserve('w30324279', c.x, 2.75, c.z, ub - ua, 1.7, -V_DIR[0], -V_DIR[1], 'poster') === false) return;      // the label registry (docs/rules/LABELS-API.md): nothing else hangs in this rectangle
    P.quad(M.posters, [ua, 1.9, GV + 0.2], [ub, 1.9, GV + 0.2], [ub, 3.6, GV + 0.2], [ua, 3.6, GV + 0.2], [0, 0, -1], [[f, 0], [0, 0], [0, 1], [f, 1]]);
  };
  poster(17.9, 21.5, 6); poster(43.4, 48.2, 8);
  // drain pipes in the inner corners of the end blocks, CCTV domes under the slab (tiny)
  for (const uu of [u0 + 0.12, u1 - 0.12]) P.cyl(M.pipe, [uu, HT.gl - 0.1, 0.12], [uu, HT.st, 0.12], 0.05, 0.05, 6, false);
  void labels; void L;
}

// ------------------------------------------------------------------------------------------------ stair and stylobate
function stair(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics;
  const { u0, u1, v0, n } = STAIR, rise = HT.st / n, tread = 0.6, w = u1 - u0;
  // 7 granite risers: step k occupies v0 + k*tread .. + tread, top at (k+1)*rise (the last tread is the front of the stylobate)
  for (let k = 0; k < n; k++) {
    const va = v0 + k * tread, vb = va + tread, ya = k * rise, yb = (k + 1) * rise;
    P.quad(M.riser, [u0, ya, va], [u1, ya, va], [u1, yb, va], [u0, yb, va], [0, 0, -1], [[0, 0], [w / 2, 0], [w / 2, 0.1], [0, 0.1]]);       // riser (faces the plaza)
    P.quad(M.tread, [u0, yb, va], [u1, yb, va], [u1, yb, vb], [u0, yb, vb], [0, 1, 0], [[0, 0], [w / 2, 0], [w / 2, 0.3], [0, 0.3]]);
    for (const [uu, nx] of [[u0, -1], [u1, 1]]) P.quad(M.riser, [uu, 0, va], [uu, 0, vb], [uu, yb, vb], [uu, yb, va], [nx, 0, 0]);               // the two side profiles
  }
  // the stylobate: pale granite slabs from the stair head to the glass (v -0.8 .. 3.0)
  const pv0 = v0 + (n - 1) * tread + tread;                                                                                                      // = -0.2
  P.quad(M.platform, [u0, HT.st, pv0], [u1, HT.st, pv0], [u1, HT.st, STAIR.platformV1], [u0, HT.st, STAIR.platformV1], [0, 1, 0], [[u0 / 2.4, pv0 / 2.4], [u1 / 2.4, pv0 / 2.4], [u1 / 2.4, STAIR.platformV1 / 2.4], [u0 / 2.4, STAIR.platformV1 / 2.4]]);
  // the end faces of the stylobate beyond the end blocks (u < 0 and u > 67.5)
  for (const [uu, nx] of [[u0, -1], [u1, 1]]) P.quad(M.riser, [uu, 0, pv0], [uu, 0, STAIR.platformV1], [uu, HT.st, STAIR.platformV1], [uu, HT.st, pv0], [nx, 0, 0]);
  P.quad(M.riser, [u0, 0, STAIR.platformV1], [u1, 0, STAIR.platformV1], [u1, HT.st, STAIR.platformV1], [u0, HT.st, STAIR.platformV1], [0, 0, 1]);
  // white tube handrails on the two returns (post / rail / post)
  for (const uu of [u0 + 0.12, u1 - 0.12]) {
    P.cyl(M.rail, [uu, 0.95, v0 - 0.1], [uu, 0.95 + HT.st, pv0 - 0.0], 0.025, 0.025, 6, false);
    for (const t of [0, 0.5, 1]) { const vv = v0 - 0.1 + t * (pv0 - v0 + 0.1), yy = HT.st * t; P.cyl(M.rail, [uu, yy, vv], [uu, yy + 0.95, vv], 0.025, 0.025, 6, false); }
  }
  // physics: the stair and the stylobate are walkable (local +z of the hall frame climbs INTO the building)
  const cu = (u0 + u1) / 2, c = W(cu, v0 + (n * tread) / 2);
  ph.addStairs(c.x, c.z, w, n * tread, HALL.rot, 0, HT.st, n);
  const cp = W(cu, (pv0 + STAIR.platformV1) / 2);
  ph.addWalkBox(cp.x, cp.z, w, STAIR.platformV1 - pv0, HALL.rot, HT.st);
}

// ------------------------------------------------------------------------------------------------ the foyer seen through the glass
/** the back line of the foyer follows the cube front wall (P0 - P1), 5 cm in front of it */
const vBack = (u) => P0[1] + (P1[1] - P0[1]) * (u - P0[0]) / (P1[0] - P0[0]) - 0.05;
/** the two flights to the mezzanine gallery: [u at the foot, u at the head] (3 m wide, v 8.6 .. 11.6) */
const FLIGHTS = [[26.0, 14.2], [41.4, 53.2]];
function interior(K) {
  const P = K.P, M = K.M;
  const u0 = FR.u0, u1 = FR.u1, GV = FR.glassV + 0.02, y0 = IN.floor, y1 = HT.gl;
  const vbA = vBack(u0), vbB = vBack(u1);
  // FOYER_OPEN: behind the glass a landing at the stylobate level and an interior flight of IN.n risers (the last one is the drop onto the floor) down to the parquet at plaza level
  const vf = FOYER_OPEN ? IN.land + IN.tread * IN.n : GV;                             // the parquet starts where the flight ends
  if (FOYER_OPEN) {
    const rise = (HT.st - y0) / IN.n;
    P.box(M.treadIn, u0, u1, y0, HT.st, GV, IN.land, 'bk', 1);                         // the landing (top = the stylobate level)
    for (let k = 0; k < IN.n - 1; k++) { const va = IN.land + k * IN.tread; P.box(M.treadIn, u0, u1, y0, HT.st - (k + 1) * rise, va, va + IN.tread, 'bk', 1); }
  }
  P.quad(M.parquet, [u0, y0, vf], [u1, y0, vf], [u1, y0, vbB], [u0, y0, vbA], [0, 1, 0], [[u0 / 2, vf / 2], [u1 / 2, vf / 2], [u1 / 2, vbB / 2], [u0 / 2, vbA / 2]]);
  P.quad(M.ceilIn, [u0, y1, GV], [u1, y1, GV], [u1, y1, vbB], [u0, y1, vbA], [0, -1, 0]);
  P.quad(M.wallIn, [u0, y0, vbA], [u1, y0, vbB], [u1, y1, vbB], [u0, y1, vbA], [0, 0, -1]);
  P.quad(M.wallIn, [u0, y0, GV], [u0, y0, vbA], [u0, y1, vbA], [u0, y1, GV], [1, 0, 0]);
  P.quad(M.wallIn, [u1, y0, vbB], [u1, y0, GV], [u1, y1, GV], [u1, y1, vbB], [-1, 0, 0]);
  // the video screen on the cube front wall between the two flights (photo 08): dark blue, 7 x 2.8 m, under the gallery slab
  if (FOYER_OPEN) {
    const sa = 30.2, sb = 37.2, va = vBack(sa) - 0.03, vb2 = vBack(sb) - 0.03;
    P.quad(M.screen, [sa, y0 + 1.5, va], [sb, y0 + 1.5, vb2], [sb, y0 + 4.3, vb2], [sa, y0 + 4.3, va], [0, 0, -1]);
  }
  // ten white round columns d 0.45 m, 3 m behind the glass, every second bay
  for (let i = 0; i < 10; i++) P.col(M.colIn, u0 + 1.5 + 4.34 * i, FR.glassV + 3.0, y0, y1, 0.225, 0.225, 10, false);
  // two stair flights (3 m wide) rising to the mezzanine gallery (6.2 m above the plaza; 5.3 when the foyer floor is the plaza): honey treads, a white balustrade on the open side
  const GY = IN.gallery, nst = 16;
  for (const [ua, ub] of FLIGHTS) {
    const du = (ub - ua) / nst, vA = 8.6, vB = 11.6;
    for (let k = 0; k < nst; k++) {
      const a = ua + k * du, b = a + du, yy = y0 + (k + 1) * (GY - y0) / nst;
      P.box(M.treadIn, Math.min(a, b), Math.max(a, b), y0, yy, vA, vB, 'b', 1);
    }
    P.quad(M.rail, [ua, y0 + 0.9, vA], [ub, GY + 0.9, vA], [ub, GY + 0.84, vA], [ua, y0 + 0.84, vA], [0, 0, -1]);
    for (let k = 0; k <= nst; k += 2) { const x = ua + k * du; P.box(M.rail, x - 0.02, x + 0.02, y0 + k * (GY - y0) / nst, y0 + 0.9 + k * (GY - y0) / nst, vA - 0.02, vA + 0.02, 'b', 1); }
  }
  // the gallery along the back wall (slab 0.3 m thick, balustrade 1.1 m) and the landings at the stair heads
  P.box(M.wallIn, u0, u1, GY - 0.3, GY, 12.6, vbB, 'b', 2);
  P.box(M.wallIn, u0, 16.2, GY - 0.3, GY, 8.6, 12.6, 'b', 2); P.box(M.wallIn, 51.2, u1, GY - 0.3, GY, 8.6, 12.6, 'b', 2);
  P.box(M.rail, u0, u1, GY + 1.04, GY + 1.1, 12.58, 12.66, 'b', 2);
  for (let u = u0 + 0.4; u < u1; u += 0.9) P.box(M.rail, u - 0.015, u + 0.015, GY, GY + 1.04, 12.6, 12.64, 'b', 1);
}

// ------------------------------------------------------------------------------------------------ flanks and rear: louvres, glazed bay, stair cage, rear doors
function flanks(K) {
  const P = K.P, M = K.M;
  const ssw = (v) => flankU('ssw', v), nne = (v) => flankU('nne', v);
  // SSW flank: a glazed bay (dark green-grey) under a louvre screen of vertical fins, v 36 .. 47
  {
    const vA = 36.2, vB = 46.8, uo = ssw((vA + vB) / 2);
    const a = [ssw(vA) - 0.03, vA], b = [ssw(vB) - 0.03, vB];
    WQ(P, M.glassSide, a, b, 0.25, 6.4, CEN, 3.2, 6.2, { v: [0, 1] });
    for (let v = vA + 0.4; v <= vB - 0.3; v += 0.55) { const u = ssw(v); P.push(u - 0.2, 0, v, 0); P.box(M.bronzeGrid, -0.15, 0.15, 3.7, 11.1, -0.06, 0.06, 'b', 1); P.pop(); }
    void uo;
    // the black glazed stair cage (3.5 m wide, 13 m tall) with its bronze grid, beyond the louvres
    const sa = 51.6, sb = 55.2, ua = ssw(sa), ub = ssw(sb);
    P.push(0, 0, 0, 0);
    P.quad(M.glassDark, [ua - 0.9, 0, sa], [ub - 0.9, 0, sb], [ub - 0.9, HT.roof, sb], [ua - 0.9, HT.roof, sa], [-1, 0, 0]);
    P.quad(M.glassDark, [ua - 0.9, 0, sa], [ua, 0, sa], [ua, HT.roof, sa], [ua - 0.9, HT.roof, sa], [0, 0, -1]);
    P.quad(M.glassDark, [ub, 0, sb], [ub - 0.9, 0, sb], [ub - 0.9, HT.roof, sb], [ub, HT.roof, sb], [0, 0, 1]);
    P.quad(M.doloShade, [ua - 0.9, HT.roof, sa], [ub - 0.9, HT.roof, sb], [ub, HT.roof, sb], [ua, HT.roof, sa], [0, 1, 0]);
    for (let k = 0; k <= 6; k++) { const v = sa + k * (sb - sa) / 6, u = ssw(v) - 0.9; P.box(M.bronzeGrid, u - 0.07, u + 0.0, 0.2, HT.roof, v - 0.04, v + 0.04, 'b', 1); }
    for (let y = 1.5; y < HT.roof; y += 1.6) { P.push(ua - 0.9, y, sa, 0); P.box(M.bronzeGrid, -0.06, 0.0, 0, 0.07, 0, 3.6, 'b', 1); P.pop(); }
    P.pop();
  }
  // NNE flank: a louvre band at the foot of the cube wall near the front (fins 1.5 m tall, ~10 m long), a lighting strip under the roof edge
  for (let v = 17.4; v <= 27.2; v += 0.55) { const u = CUBE[1][0] + (CUBE[2][0] - CUBE[1][0]) * (v - CUBE[1][1]) / (CUBE[2][1] - CUBE[1][1]); P.box(M.bronzeGrid, u - 0.0, u + 0.3, HT.roof + 0.15, HT.roof + 1.65, v - 0.05, v + 0.05, 'b', 1); }
  // rear: two dark steel doors 2.4 x 2.2 m on the rear wall (u 16.4 and 50.3), with a concrete canopy; downpipes on the corners
  for (const u of [16.4, 50.3]) {
    const v = D_[1] + (C_[1] - D_[1]) * (u - D_[0]) / (C_[0] - D_[0]) + 0.03;
    P.quad(M.doorFrame, [u - 1.2, 0, v], [u + 1.2, 0, v], [u + 1.2, 2.2, v], [u - 1.2, 2.2, v], [0, 0, 1]);
    P.box(M.dolo, u - 1.5, u + 1.5, 2.45, 2.6, v - 0.02, v + 0.9, 'b', 1);
    P.box(M.steel, u - 0.04, u + 0.04, 0.9, 1.5, v + 0.01, v + 0.05, 'b', 1);
  }
  for (const [u, v] of [[A_[0] + 0.1, 0.12], [B_[0] - 0.1, 0.12]]) P.cyl(M.pipe, [u, HT.roof - 0.2, v], [u, HT.st, v], 0.05, 0.05, 6, false);
  for (const v of [30, 48]) { const u = ssw(v) - 0.06; P.cyl(M.pipe, [u, HT.roof - 0.2, v], [u, 0.1, v], 0.05, 0.05, 6, false); const un = nne(v) + 0.06; P.cyl(M.pipe, [un, HT.roof - 0.2, v], [un, 0.1, v], 0.05, 0.05, 6, false); }
}

// ------------------------------------------------------------------------------------------------ the roof of the cube: parapet, hatches, plant boxes
function roofTop(K) {
  const P = K.P, M = K.M, TOP = HT.cube;
  const ring = CUBE;
  P.cap(M.roof, ring, TOP, true, 2);
  for (let i = 0; i < 4; i++) strip(P, M.dolo, ring[i], ring[(i + 1) % 4], TOP, TOP + 0.35, 0.3, 0.0);
  const hatch = (u, v) => { P.box(M.hatch, u - 1.25, u + 1.25, TOP, TOP + 1.2, v - 1.25, v + 1.25, 'b', 1); P.box(M.hatchTop, u - 1.05, u + 1.05, TOP + 1.2, TOP + 1.26, v - 1.05, v + 1.05, 'b', 1); };
  for (const [u, v] of [[39.9, 37.3], [48.4, 54.0], [39.9, 52.3], [31.9, 42.9], [26.3, 37.7], [26.7, 52.5], [19.7, 54.6]]) hatch(u, v);
  for (const [u, v] of [[13.9, 66.4], [54.6, 68.3]]) { P.box(M.plant, u - 3, u + 3, TOP, TOP + 3, v - 2.5, v + 2.5, 'b', 2); P.box(M.dolo, u - 3.1, u + 3.1, TOP + 3, TOP + 3.12, v - 2.6, v + 2.6, 'b', 2); }
}

// ------------------------------------------------------------------------------------------------ colliders (the hall is solid: thin walls on the OSM outline)
function colliders(K) {
  const ph = K.ctx.physics, ssw = (v) => flankU('ssw', v), nne = (v) => flankU('nne', v);
  const Es = [ssw(SV), SV], En = [nne(SV), SV];
  const T = HT.roof + 1;
  HF.wall(ph, [A_[0], 0.15], [FR.u0, 0.15], 0, T, 0.3); HF.wall(ph, [FR.u1, 0.15], [B_[0], 0.15], 0, T, 0.3);                                     // end blocks
  HF.wall(ph, [FR.u0, 0], [FR.u0, GLASS_V], 0, HT.gl + 0.5, 0.4); HF.wall(ph, [FR.u1, 0], [FR.u1, GLASS_V], 0, HT.gl + 0.5, 0.4);   // reveals
  if (!FOYER_OPEN) HF.wall(ph, [FR.u0, GLASS_V], [FR.u1, GLASS_V], 0, HT.gl + 0.5, 0.4);                                // the glass wall (closed doors)
  else foyerColliders(K);
  HF.wall(ph, A_, Es, 0, T, 0.6); HF.wall(ph, Es, D_, 0, HT.low + 1, 0.6);
  HF.wall(ph, B_, En, 0, T, 0.6); HF.wall(ph, En, C_, 0, HT.low + 1, 0.6);
  HF.wall(ph, D_, C_, 0, HT.low + 1, 0.6);
}

/** FOYER_OPEN: the glass wall with five door openings (1.9 m clear), the landing + the interior flight down to the parquet, the solid shell of the foyer (end walls, cube front wall, columns, the
 *  two stair flights to the gallery are decor).  The player can walk from the stylobate through a door group onto the landing, down the 7 risers and across the foyer. */
function foyerColliders(K) {
  const ph = K.ctx.physics, u0 = FR.u0, u1 = FR.u1, y0 = IN.floor, T = HT.gl + 0.5;
  const vbA = vBack(u0), vbB = vBack(u1), vbMin = Math.min(vbA, vbB);
  // the glass wall between the doors
  let ua = u0;
  for (const du of FR.doors) { HF.wall(ph, [ua, GLASS_V], [du - 0.95, GLASS_V], 0, T, 0.4); ua = du + 0.95; }
  HF.wall(ph, [ua, GLASS_V], [u1, GLASS_V], 0, T, 0.4);
  // the shell: the two end walls and the front wall of the cube (the back wall of the foyer)
  HF.wall(ph, [u0, GLASS_V], [u0, vbA], 0, T, 0.4); HF.wall(ph, [u1, GLASS_V], [u1, vbB], 0, T, 0.4);
  HF.wall(ph, [u0, vbA], [u1, vbB], 0, T, 0.4);
  // columns
  for (let i = 0; i < 10; i++) { const p = W(u0 + 1.5 + 4.34 * i, FR.glassV + 3.0); ph.addCylinder(p.x, p.z, 0.27, 0, T); }
  // the two flights to the gallery are solid steps (decor)
  const nst = 16, GY = IN.gallery;
  for (const [ua2, ub2] of FLIGHTS) {
    const du = (ub2 - ua2) / nst;
    for (let k = 0; k < nst; k++) { const a = ua2 + k * du, b = a + du; HF.box(ph, (a + b) / 2, 10.1, Math.abs(du), 3.0, y0, y0 + (k + 1) * (GY - y0) / nst); }
  }
  // floors: the landing at the stylobate level, the interior flight (7 risers down), the parquet.  The boxes OVERLAP by 5-10 cm (the highest top wins in the overlap): two walk boxes that only touch
  // can leave a hairline seam in which neither one counts and the player drops to the terrain under a 1.2 m landing
  const cu = (u0 + u1) / 2, w = u1 - u0, vf = IN.land + IN.tread * IN.n, rise = (HT.st - y0) / IN.n;
  HF.walk(ph, cu, (GLASS_V - 0.1 + IN.land + 0.05) / 2, w, IN.land + 0.05 - (GLASS_V - 0.1), HT.st);
  for (let k = 0; k < IN.n; k++) { const va = IN.land + k * IN.tread - 0.05, vb2 = IN.land + (k + 1) * IN.tread; HF.walk(ph, cu, (va + vb2) / 2, w, vb2 - va, HT.st - (k + 1) * rise).sticky = true; }       // sticky: a walker running down keeps its feet on the treads
  HF.walk(ph, cu, (vf - 0.05 + vbMin) / 2, w, vbMin - (vf - 0.05), y0);
}
