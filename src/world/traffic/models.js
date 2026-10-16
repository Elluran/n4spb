// traffic/models.js - the cel-shaded cars, vans and the box truck of the Saint Petersburg fleet (docs/research/transport.md catalogue, photos SP/refs/transport); buses.js has the buses.
// Every archetype (fleetdata.ARCH) is built in two levels of detail from ONE parametric recipe:
//   L0  (< ~55 m)   side-profile extrusion with a soft bevel + wheel arches, greenhouse with a hollow dark interior + a transparent glass volume, pillars, roof,
//                   mirrors, bumpers, grille, lenses, plates, tyres with hubs                               ~400-700 triangles for a car
//   L1  (farther)   flat silhouette, opaque dark glass, box wheels, no small parts                          ~100-300 triangles
// Each model returns { paint, glass, lamps, seat, extras } (BufferGeometry, attributes position / normal / uv / color / aKind):
//   paint  opaque: vertex colours, aKind 1 = body paint (tinted per instance by the car shader), 2 = licence plate (uv picks the atlas cell), 0 = fixed, 3 = fixed with the darker sill
//   glass  the transparent window volume (L0 only) - drawn with ctx.mat.glass
//   lamps  glowing head / tail lenses (aKind 0 / 1), drawn for moving cars only (parked cars carry dull lenses in the paint mesh); the Chinese crossovers carry a rear LED light bar
//   extras livery layers drawn on top of the paint for the cars that have them: { taxi: geo, police: geo, amb: geo } (fixed colours, 2-3 cm proud of the body) and
//          { dec: { police: geo, amb: geo } } text decals (atlas rows of plates.js liveryAtlas). No beacon bars / sirens anywhere (user rule): the emergency vehicles keep their plain livery.
// Car-local frame: forward +Z, origin on the ground midway between the axles, +X = the car's LEFT (all cars are left-hand drive, the driver sits at +X).
//
// Z-FIGHTING RULES (docs/AGENT-BRIEF.md): the body outline is EXACT (the bevel starts inside it: bevelOffset = -bevelSize), every other part keeps >= 2 cm from the surface it
// sits next to: the glass volume is sunk 6 cm below the belt / the hood and is wider than the hollow interior shell (inset 6 cm), the roof slab overhangs the glass, lenses /
// grilles / plates stand 2-3 cm proud of the bumper or nose, livery stripes stand 2 cm proud of the doors, no duplicated faces.
import * as THREE from 'three';
import { VB, quad } from './vb.js';
import { ARCH } from './fleetdata.js';
import { TYRE, TRIM, GLASSC, INT, CHROME, LENS_H, LENS_T, WHITE, archPts, extrudeSide, extrudeGlass, insetPoly, bodyTint, wheel, plate, sideDecal } from './mk.js';
import { busModel } from './buses.js';

export const LIVERY_ROWS = 4;      // plates.js liveryAtlas rows: 0 ПОЛИЦИЯ, 1 СКОРАЯ МЕДИЦИНСКАЯ ПОМОЩЬ, 2 СИТИ ТУР, 3 (free)
const TAXI_Y = '#f6c200', POLICE_B = '#1d4fa0', AMB_R = '#d8262e';

// ------------------------------------------------------------------------------------------------------------------ car recipes
// z positions in the car frame; hn nose height, hh hood height at the cowl (zc), hb beltline, ht trunk deck, H roof, zr0 / zr1 roof front / rear, zt end of the glass at the tail
const CARS = {
  sedan:    { W: 1.74, R: 0.31, tw: 0.20, track: 1.49, yb: 0.20, front: 2.12, rear: -2.28, hn: 0.80, hh: 0.88, zc: 0.94, hb: 0.95, zt: -1.52, ht: 0.98, H: 1.47, zr0: 0.26, zr1: -0.90, taper: [0.10, 0.08], mirror: 0.92 },
  lada:     { W: 1.76, R: 0.31, tw: 0.20, track: 1.50, yb: 0.20, front: 2.18, rear: -2.23, hn: 0.80, hh: 0.88, zc: 0.96, hb: 0.96, zt: -1.50, ht: 0.99, H: 1.50, zr0: 0.28, zr1: -0.88, taper: [0.07, 0.06], mirror: 0.92 },
  ladasw:   { W: 1.76, R: 0.31, tw: 0.20, track: 1.50, yb: 0.21, front: 2.18, rear: -2.29, hn: 0.82, hh: 0.90, zc: 0.90, hb: 0.98, zt: -2.16, ht: 1.00, H: 1.68, zr0: 0.24, zr1: -2.02, taper: [0.07, 0.05], mirror: 0.86, rails: true },
  cross_c:  { W: 1.84, R: 0.34, tw: 0.22, track: 1.58, yb: 0.26, front: 2.22, rear: -2.28, hn: 0.94, hh: 1.01, zc: 0.90, hb: 1.06, zt: -2.14, ht: 1.08, H: 1.64, zr0: 0.18, zr1: -1.72, taper: [0.08, 0.05], mirror: 0.90, rails: true, ledbar: true },
  cross_s:  { W: 1.80, R: 0.33, tw: 0.21, track: 1.55, yb: 0.25, front: 2.14, rear: -2.19, hn: 0.92, hh: 1.00, zc: 0.86, hb: 1.05, zt: -2.08, ht: 1.06, H: 1.63, zr0: 0.18, zr1: -1.78, taper: [0.08, 0.05], mirror: 0.84, rails: true },
  cross_m:  { W: 1.86, R: 0.35, tw: 0.23, track: 1.60, yb: 0.27, front: 2.30, rear: -2.35, hn: 0.97, hh: 1.04, zc: 0.94, hb: 1.08, zt: -2.22, ht: 1.09, H: 1.69, zr0: 0.20, zr1: -1.86, taper: [0.08, 0.05], mirror: 0.92, rails: true, ledbar: true },
  suv:      { W: 1.95, R: 0.37, tw: 0.25, track: 1.64, yb: 0.31, front: 2.45, rear: -2.47, hn: 1.02, hh: 1.12, zc: 0.90, hb: 1.16, zt: -2.38, ht: 1.17, H: 1.85, zr0: 0.40, zr1: -2.12, taper: [0.06, 0.04], mirror: 0.92, rails: true },
  liftback: { W: 1.83, R: 0.33, tw: 0.21, track: 1.57, yb: 0.22, front: 2.36, rear: -2.34, hn: 0.82, hh: 0.90, zc: 1.04, hb: 0.96, zt: -2.10, ht: 0.99, H: 1.46, zr0: 0.30, zr1: -1.64, taper: [0.09, 0.07], mirror: 0.96 },
  prem:     { W: 1.87, R: 0.34, tw: 0.22, track: 1.60, yb: 0.22, front: 2.42, rear: -2.43, hn: 0.80, hh: 0.88, zc: 1.10, hb: 0.98, zt: -1.64, ht: 1.00, H: 1.45, zr0: 0.34, zr1: -0.96, taper: [0.10, 0.08], mirror: 0.98 },
  hatch:    { W: 1.72, R: 0.28, tw: 0.19, track: 1.45, yb: 0.19, front: 1.96, rear: -1.99, hn: 0.78, hh: 0.84, zc: 0.86, hb: 0.93, zt: -1.89, ht: 0.95, H: 1.48, zr0: 0.30, zr1: -1.45, taper: [0.10, 0.08], mirror: 0.82 },
  mpv:      { W: 1.93, R: 0.34, tw: 0.22, track: 1.64, yb: 0.24, front: 2.55, rear: -2.60, hn: 0.90, hh: 1.02, zc: 1.34, hb: 1.06, zt: -2.56, ht: 1.08, H: 1.90, zr0: 0.62, zr1: -2.22, taper: [0.07, 0.05], mirror: 1.34 },
};

/** livery layers of a car recipe (stripes 2 cm proud of the doors, fixed colours) */
function carLivery(kind, p) {
  const out = {};
  const zlen = (p.front - p.rear) - 2.2, zc = (p.front + p.rear) / 2, X = p.W / 2 + 0.005, yS = 2 * p.R + 0.07 + 0.11;
  const T = new VB(0);
  for (const sd of [-1, 1]) T.box(0.03, 0.12, zlen, TAXI_Y, [sd * X, yS, zc], null, null, 0);
  out.taxi = T.build();
  if (kind === 'liftback') {
    const zz = ARCH[kind].wb / 2 - 0.5, P = new VB(0), D = new VB(0);
    for (const sd of [-1, 1]) {
      P.box(0.03, 0.30, 2 * zz, POLICE_B, [sd * X, 0.46, 0], null, null, 0);
      P.box(0.03, 0.10, 0.5, POLICE_B, [sd * X, 0.70, zz - 0.25], [0.5, 0, 0], null, 0);
      D.add(sideDecal(sd, sd * (X + 0.016), -zz + 0.1, zz - 0.1, 0.72, 0.88, 0, LIVERY_ROWS), WHITE, null, null, null, 0);
    }
    out.police = P.build(); out.pdec = D.build();
  }
  return out;
}

function carModel(kind, lod) {
  const p = CARS[kind], a = ARCH[kind], hi = lod === 0;
  const s = { W: p.W, R: p.R, tw: p.tw, track: p.track, yb: p.yb, Ra: p.R + 0.07, bev: hi ? 0.04 : 0, zr: -a.wb / 2, zf: a.wb / 2, front: p.front, rear: p.rear };
  s.arches = hi ? [s.zr, s.zf] : [];
  const V = new VB(1), G = new VB(0), Lm = new VB(0);
  const { front, rear, yb, hn, hh, zc, hb, zt, ht, H, zr0, zr1 } = p;
  // ---- side profile (front bottom -> up over the nose and hood -> beltline -> tail -> back along the bottom with the arches)
  const top = [[front - 0.09, yb + 0.10], [front, yb + 0.20], [front + 0.004, hn - 0.24], [front - 0.04, hn - 0.08], [front - 0.17, hn],
    [(front + zc) / 2 + 0.2, (hn + hh) / 2 + 0.015], [zc + 0.04, hh]];
  if (hb > hh + 0.01) top.push([zc - 0.10, hb]);
  top.push([zt + 0.06, hb]);
  if (ht > hb - 0.02 && zt > rear + 0.5) {          // notchback: trunk deck
    top.push([zt - 0.20, ht], [rear + 0.30, ht + 0.005], [rear + 0.05, ht - 0.10], [rear, ht - 0.26]);
  } else top.push([rear + 0.14, hb - 0.02], [rear + 0.02, hb - 0.16], [rear, hb - 0.30]);
  top.push([rear, yb + 0.20], [rear + 0.09, yb + 0.10]);
  const pts = top.slice();
  if (hi) for (const za of s.arches) pts.push(...archPts(s, za, 6));
  else pts.push([s.zr - 0.1, yb + 0.02], [s.zf + 0.1, yb + 0.02]);
  const taper = { zF0: front - 0.9, zF1: front + 0.05, kF: p.taper[0], zR0: rear + 0.9, zR1: rear - 0.05, kR: p.taper[1], kS: 0, yS: hb, yT: H };
  V.add(extrudeSide(pts, s.W, s.bev, taper), WHITE, null, bodyTint(s));

  // ---- greenhouse: the glass volume is SUNK 6 cm below the belt / the hood, so none of its faces lies in the body surface
  const Wg = s.W - 0.28;
  const gpoly = [[zc - 0.04, hh - 0.06], [zr0, H - 0.04], [zr1, H - 0.04], [zt + 0.10, hb - 0.06]];   // ends stop 4 / 10 cm inside the cowl / tail so the glass never meets the body slopes edge-on
  if (hi) {
    G.add(extrudeGlass(gpoly, Wg), '#ffffff');
    V.add(extrudeGlass(insetPoly(gpoly, 0.06), Wg - 0.20), INT, new THREE.Matrix4().makeScale(-1, 1, 1), null, null, 0);    // hollow dark interior (inward faces), 6 cm inside the glass
    for (const sx of [-0.36, 0.36]) V.box(0.46, 0.40, 0.14, '#272c33', [sx, hb + 0.28, zr0 - 0.78], [-0.18, 0, 0], null, 0);
    V.box(Wg - 0.40, 0.40, 0.14, '#272c33', [0, hb + 0.28, zr1 + 0.35], [-0.12, 0, 0], null, 0);
  } else V.add(extrudeGlass(gpoly, Wg), GLASSC, null, null, null, 0);
  V.box(Wg + 0.04, 0.06, zr0 - zr1 + 0.10, WHITE, [0, H - 0.015, (zr0 + zr1) / 2]);                    // roof slab (overhangs the glass by 2 cm on each side)
  if (hi) {
    for (const sd of [-1, 1]) {
      const x = sd * (Wg / 2 - 0.01);
      V.rod([x, hh + 0.02, zc + 0.01], [x, H - 0.05, zr0 + 0.03], 0.028, WHITE, 5);                          // A pillar
      V.rod([x, hb, zt + 0.03], [x, H - 0.05, zr1 - 0.02], 0.03, WHITE, 5);                                 // C pillar
      V.box(0.045, H - 0.07 - hb, 0.085, TRIM, [sd * (Wg / 2 + 0.002), (H + hb) / 2 - 0.035, (zr0 + zr1) / 2 - 0.05], null, null, 0);   // B pillar
    }
  }

  // ---- wheels
  for (const z of [s.zr, s.zf]) for (const side of [-1, 1]) wheel(V, hi, s, side * s.track / 2, z, s.R, s.tw);
  // ---- bumpers (front face 3 cm ahead of the nose / tail), grille, lenses, plates, mirrors
  const bw = s.W - 0.10;
  V.box(bw, 0.17, 0.12, TRIM, [0, 0.40, front - 0.03], null, null, 3);                                    // z front-0.09 .. front+0.03
  V.box(bw, 0.17, 0.12, TRIM, [0, 0.40, rear + 0.03], null, null, 3);                                     // z rear-0.03 .. rear+0.09
  const lampY = hn - 0.14, tailY = ht - 0.18 + 0.06;
  const lensX = s.W / 2 - 0.28;
  if (hi) {
    V.box(0.66, 0.10, 0.03, TRIM, [0, hn - 0.28, front + 0.012], null, null, 0);                           // grille: face at front+0.027
    V.box(0.66, 0.012, 0.03, CHROME, [0, hn - 0.27, front + 0.02], null, null, 0);
    for (const sd of [-1, 1]) {
      V.box(0.34, 0.11, 0.05, LENS_H, [sd * lensX, lampY, front - 0.005], null, null, 0);                  // face at front+0.02
      V.box(0.30, 0.10, 0.05, LENS_T, [sd * (lensX + 0.02), tailY, rear + 0.005], null, null, 0);          // face at rear-0.02
      V.box(0.10, 0.07, 0.15, TRIM, [sd * (s.W / 2 + 0.06), hb + 0.07, p.mirror], null, null, 0);          // mirror (inner face 1 cm outside the body, behind the visible side)
    }
    if (p.ledbar) V.box(s.W - 0.9, 0.035, 0.04, LENS_T, [0, tailY + 0.01, rear + 0.005], null, null, 0);  // dull rear light bar of the Chinese crossovers (face at rear-0.015)
    plate(V, 0.41, front + 0.05, true);                                                                     // plate 2 cm ahead of the bumper face
    plate(V, 0.41, rear - 0.05, false);
  } else {
    V.box(0.66, 0.10, 0.03, TRIM, [0, hn - 0.28, front + 0.012], null, null, 0);
  }
  // roof rails (sit on the roof)
  if (hi && p.rails) for (const sd of [-1, 1]) V.box(0.03, 0.035, zr0 - zr1 - 0.2, '#2c2f33', [sd * (Wg / 2 - 0.1), H + 0.033, (zr0 + zr1) / 2], null, null, 0);
  // lamps (glowing lenses of the moving cars): 1.2 cm ahead of the dull lenses
  if (hi) {
    for (const sd of [-1, 1]) {
      Lm.box(0.35, 0.115, 0.04, '#ffffff', [sd * lensX, lampY, front + 0.012], null, null, 0);             // face at front+0.032
      Lm.box(0.31, 0.105, 0.04, '#ffffff', [sd * (lensX + 0.02), tailY, rear - 0.012], null, null, 1);     // face at rear-0.032
    }
    if (p.ledbar) Lm.box(s.W - 0.86, 0.04, 0.04, '#ffffff', [0, tailY + 0.01, rear - 0.012], null, null, 1);   // face at rear-0.032
  }
  const seat = { z: zr0 - 0.52, y: H - 0.30, x: 0.37, wz: zc - 0.30, wy: hh + 0.04, roofY: H, roofZ: (zr0 + zr1) / 2 };
  const ex = hi ? carLivery(kind, p) : {};
  return { paint: V.build(), glass: hi ? G.build() : null, lamps: hi ? Lm.build() : null, seat, H: p.H, extras: ex };
}

// ------------------------------------------------------------------------------------------------------------------ van (GAZelle Next / Transit class), police van, ambulance
function vanModel(lod) {
  const a = ARCH.van, hi = lod === 0, rr = a.rear;
  const s = { W: a.wid, R: 0.36, tw: 0.24, track: 1.72, yb: 0.30, Ra: 0.43, bev: hi ? 0.04 : 0, zr: -a.wb / 2, zf: a.wb / 2, front: a.front, rear: rr };
  s.arches = hi ? [s.zr, s.zf] : [];
  const V = new VB(1), G = new VB(0), Lm = new VB(0);
  const H = a.hgt;
  const top = [[2.62, 0.42], [2.72, 0.52], [2.73, 1.02], [2.66, 1.18], [2.15, 1.24], [1.98, 1.30], [1.50, 2.12], [1.30, H - 0.02], [1.05, H], [rr + 0.16, H], [rr + 0.02, H - 0.12], [rr, 1.2], [rr, 0.6], [rr + 0.10, 0.42]];
  const pts = top.slice();
  if (hi) for (const za of s.arches) pts.push(...archPts(s, za, 6)); else pts.push([s.zr - 0.1, s.yb + 0.02], [s.zf + 0.1, s.yb + 0.02]);
  V.add(extrudeSide(pts, s.W, s.bev, { zF0: 1.9, zF1: 2.75, kF: 0.05, zR0: rr + 0.8, zR1: rr, kR: 0.03, kS: 0.03, yS: 1.2, yT: H }), WHITE, null, bodyTint(s));
  // windscreen: the body slope runs (1.98, 1.30) -> (1.50, 2.12); outward normal (0.863, 0.505): dark panel 1.5 cm, glass 3.5 cm off the paint
  const off = (d) => [d * 0.505, d * 0.863];                 // [dy, dz]
  const ws = (d) => { const [dy, dz] = off(d); return quad([-0.88, 1.31 + dy, 1.98 + dz], [0.88, 1.31 + dy, 1.98 + dz], [0.88, 2.12 + dy, 1.50 + dz], [-0.88, 2.12 + dy, 1.50 + dz]); };
  if (hi) { V.add(ws(0.018), INT, null, null, null, 0); G.add(ws(0.040), '#ffffff'); } else V.add(ws(0.03), GLASSC, null, null, null, 0);
  for (const sd of [-1, 1]) {
    if (hi) {
      V.box(0.012, 0.66, 0.95, INT, [sd * (s.W / 2 + 0.018), 1.62, 1.28], null, null, 0);
      G.box(0.02, 0.66, 0.95, '#ffffff', [sd * (s.W / 2 + 0.040), 1.62, 1.28], null, null, 0);
    } else V.box(0.03, 0.66, 0.95, GLASSC, [sd * (s.W / 2 + 0.03), 1.62, 1.28], null, null, 0);
  }
  for (const sd of [-1, 1]) {
    V.box(0.10, 0.08, 0.2, TRIM, [sd * (s.W / 2 + 0.08), 1.45, 1.55], null, null, 0);                    // mirror
    V.box(0.05, 0.35, 0.08, TRIM, [sd * (s.W / 2 + 0.05), 1.38, 1.6], null, null, 0);
  }
  for (const z of [s.zr, s.zf]) for (const side of [-1, 1]) wheel(V, hi, s, side * s.track / 2, z, s.R, s.tw);
  V.box(s.W - 0.1, 0.22, 0.14, TRIM, [0, 0.50, 2.68], null, null, 3);                                    // z 2.61 .. 2.75
  V.box(s.W - 0.1, 0.22, 0.14, TRIM, [0, 0.50, rr + 0.04], null, null, 3);                                // z rr-0.03 .. rr+0.11
  V.box(0.8, 0.22, 0.04, TRIM, [0, 0.82, 2.75], null, null, 0);                                           // grille: face 2.77
  if (hi) {
    for (const sd of [-1, 1]) {
      V.box(0.30, 0.14, 0.05, LENS_H, [sd * 0.70, 0.98, 2.745], null, null, 0);                         // face 2.77
      V.box(0.14, 0.50, 0.05, LENS_T, [sd * 0.86, 0.95, rr - 0.015], null, null, 0);                     // face rr-0.04
      Lm.box(0.31, 0.15, 0.04, '#ffffff', [sd * 0.70, 0.98, 2.77], null, null, 0);                       // face 2.79
      Lm.box(0.15, 0.50, 0.04, '#ffffff', [sd * 0.86, 0.95, rr - 0.04], null, null, 1);                  // face rr-0.06
    }
    plate(V, 0.52, 2.78, true);
    plate(V, 0.52, rr - 0.06, false);
  }
  const ex = {};
  if (hi) {
    const X = s.W / 2 + 0.005, A = new VB(0), Pv = new VB(0), D1 = new VB(0), D2 = new VB(0);
    for (const sd of [-1, 1]) {
      A.box(0.03, 0.26, 4.9, AMB_R, [sd * X, 1.05, rr + 0.1 + 2.45], null, null, 0);                       // red stripe along the cargo box
      D1.add(sideDecal(sd, sd * (X + 0.016), rr + 0.4, rr + 4.6, 0.94, 1.16, 1, LIVERY_ROWS), WHITE, null, null, null, 0);
      Pv.box(0.03, 0.34, 4.9, POLICE_B, [sd * X, 0.98, rr + 0.1 + 2.45], null, null, 0);
      Pv.box(0.03, 0.12, 0.7, POLICE_B, [sd * X, 1.28, rr + 0.1 + 0.55], [0.4, 0, 0], null, 0);
      D2.add(sideDecal(sd, sd * (X + 0.016), rr + 0.5, rr + 3.5, 1.40, 1.62, 0, LIVERY_ROWS), WHITE, null, null, null, 0);
    }
    A.box(0.55, 0.012, 0.55, AMB_R, [0, 1.245, 2.24], null, null, 0);                                       // red cross on the bonnet (flat plate 1 cm over the hood slope, tilted)
    A.box(0.16, 0.014, 0.55, AMB_R, [0, 1.245, 2.24], null, null, 0);
    ex.amb = A.build(); ex.police = Pv.build(); ex.adec = D1.build(); ex.pdec = D2.build();
  }
  return { paint: V.build(), glass: hi ? G.build() : null, lamps: hi ? Lm.build() : null, seat: { z: 1.30, y: 1.55, x: 0.40, wz: 1.75, wy: 1.30, roofY: H, roofZ: 0.2 }, H, extras: ex };
}

// ------------------------------------------------------------------------------------------------------------------ light box truck (GAZon Next class): cab + box
function truckModel(lod) {
  const a = ARCH.truck, hi = lod === 0, f = a.front, rr = a.rear;
  const s = { W: a.wid, R: 0.45, tw: 0.28, track: 1.90, yb: 0.46, Ra: 0.52, bev: hi ? 0.04 : 0, zr: -a.wb / 2, zf: a.wb / 2, front: f, rear: rr };
  s.arches = hi ? [s.zf] : [];
  const V = new VB(1), G = new VB(0), Lm = new VB(0);
  const top = [[f - 0.10, 0.46], [f, 0.56], [f + 0.003, 1.10], [f - 0.03, 1.55], [f - 0.56, 2.30], [1.18, 2.30], [1.18, 1.34], [0.95, 1.34], [0.95, 3.05], [rr + 0.05, 3.05], [rr, 3.0], [rr, 1.0], [rr + 0.10, 0.96], [1.2, 0.96], [1.2, 0.46]];
  const pts = top.slice();
  if (hi) pts.push(...archPts(s, s.zf, 6));
  V.add(extrudeSide(pts, s.W, s.bev, { zF0: f - 0.9, zF1: f + 0.05, kF: 0.04, zR0: 0.9, zR1: 0.7, kR: 0, kS: 0, yS: 1, yT: 2 }), WHITE, null, bodyTint(s));
  // windscreen over the cab slope (f-0.03, 1.55) -> (f-0.56, 2.30): outward normal (0.82, 0.57)
  const off = (d) => [d * 0.57, d * 0.82];
  const ws = (d) => { const [dy, dz] = off(d); return quad([-0.92, 1.58 + dy, f - 0.09 + dz], [0.92, 1.58 + dy, f - 0.09 + dz], [0.92, 2.24 + dy, f - 0.52 + dz], [-0.92, 2.24 + dy, f - 0.52 + dz]); };
  if (hi) { V.add(ws(0.018), INT, null, null, null, 0); G.add(ws(0.040), '#ffffff'); } else V.add(ws(0.03), GLASSC, null, null, null, 0);
  for (const sd of [-1, 1]) {
    if (hi) { V.box(0.012, 0.74, 0.95, INT, [sd * (s.W / 2 + 0.018), 1.85, 1.95], null, null, 0); G.box(0.02, 0.74, 0.95, '#ffffff', [sd * (s.W / 2 + 0.040), 1.85, 1.95], null, null, 0); }
    else V.box(0.03, 0.74, 0.95, GLASSC, [sd * (s.W / 2 + 0.03), 1.85, 1.95], null, null, 0);
    V.box(0.10, 0.34, 0.08, TRIM, [sd * (s.W / 2 + 0.07), 1.92, 2.38], null, null, 0);                    // mirror
  }
  V.box(s.W - 0.7, 0.34, 3.4, '#2c2f33', [0, 0.78, -1.6], null, null, 0);                                // chassis frame under the box (0.34 below the floor 0.96)
  for (const z of [s.zr, s.zf]) for (const side of [-1, 1]) wheel(V, hi, s, side * s.track / 2, z, s.R, s.tw, 10);
  V.box(s.W - 0.1, 0.24, 0.14, TRIM, [0, 0.52, f - 0.03], null, null, 3);
  V.box(s.W - 0.4, 0.20, 0.12, TRIM, [0, 0.74, rr + 0.03], null, null, 3);
  V.box(0.8, 0.26, 0.04, TRIM, [0, 0.82, f + 0.02], null, null, 0);                                       // grille: face f+0.04
  if (hi) {
    for (const sd of [-1, 1]) {
      V.box(0.30, 0.14, 0.05, LENS_H, [sd * 0.78, 0.98, f - 0.005], null, null, 0);                      // face f+0.02 ... under the grille face 0.04: separate x
      V.box(0.14, 0.44, 0.05, LENS_T, [sd * 0.90, 1.30, rr - 0.005], null, null, 0);                      // face rr-0.03
      Lm.box(0.31, 0.15, 0.04, '#ffffff', [sd * 0.78, 0.98, f + 0.012], null, null, 0);
      Lm.box(0.15, 0.44, 0.04, '#ffffff', [sd * 0.90, 1.30, rr - 0.03], null, null, 1);
    }
    plate(V, 0.74, f + 0.06, true);
    plate(V, 0.78, rr - 0.04, false);
    for (let i = 1; i < 4; i++) V.box(0.03, 2.0, 0.02, '#cfd3d6', [(i - 2) * 0.55, 2.0, rr - 0.012], null, null, 0);   // rear door seams
  }
  return { paint: V.build(), glass: hi ? G.build() : null, lamps: hi ? Lm.build() : null, seat: { z: 1.95, y: 2.05, x: 0.52, wz: 2.35, wy: 1.50, roofY: 2.30, roofZ: 1.9 }, H: a.hgt, extras: {} };
}

const cache = new Map();
/** the geometry set of an archetype at a level of detail (0 = near, 1 = far); cached */
export function makeModel(kind, lod = 0) {
  const key = kind + '|' + lod;
  if (cache.has(key)) return cache.get(key);
  let m;
  if (kind === 'van') m = vanModel(lod);
  else if (kind === 'truck') m = truckModel(lod);
  else if (CARS[kind]) m = carModel(kind, lod);
  else m = busModel(kind, lod);
  m.kind = kind; m.lod = lod;
  cache.set(key, m);
  return m;
}
export const triCount = (g) => (g ? (g.index ? g.index.count : g.attributes.position.count) / 3 : 0);
export { TYRE };
