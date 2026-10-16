// traffic/buses.js - the buses of the Saint Petersburg fleet (docs/research/transport.md PT1-PT3, TB1-TB2, 20, 21; photos bus_volgabus5270_*, bus_liaz5292_6935, bus_cityrhythm18_6943,
// trolley_bkm321_*, trolley_pkts6281_3234, trolley_vmz5298_3602, darafsh_16_58_53, citytour_troitsky):
//   bus      12 m low-floor city bus, turquoise "lazur" body + roof AC box, black window band, 3 doors on the kerb side, LED route board, plates
//   midi     9.5 m, 2 doors                 minibus  6.6 m GAZelle-City-like (white / turquoise)
//   trolley  azure body with white diagonal chevrons (PKTS-6281 / VMZ-5298); trolley2  white upper body + blue lower band (BKM-321); roof AC hatch, two pole bases, NO plate
//            (the two poles are separate instanced rods that fleet.js aims at the wires of streets.wires every frame)
//   artic    18 m = two models (artic_f, artic_r) hinged at a black bellows; the rear section has one axle and is posed from the hinge + its axle (traffic/sim.js poseOf)
//   dd       12 m sightseeing double-decker "Сити Тур": red, purple rear, glazed upper deck with seats, open roof in the middle, wordmark decal
//   coach    12.2 m tourist coach: white / blue / silver, big dark window band, one front door
//   tram     15.4 m one-section tram (transport.md TR; LM-99 / LVS-97 class): red lower body (the instance colour), cream upper body, grey roof, four doors, two bogies behind dark skirts,
//            a single-arm pantograph raised to the height of the contact wire (5.6 m), LED route board, no plate; the driver sits in the middle
// Model frame as in models.js (forward +Z, origin midway between the axles, doors on the RIGHT = kerb side = -X).
// Z-fight layering of a side (offsets from the body side X = W/2): white panel +1.5 cm (trolley2) < dark window panel +3 cm < glass +5 cm < pillars / door frames +8.5 cm < door leaves +11.5 cm.
import * as THREE from 'three';
import { VB, quad } from './vb.js';
import { archOf } from './fleetdata.js';
import { TRIM, INT, LENS_H, LENS_T, WHITE, archPts, extrudeSide, bodyTint, wheel, plate, sideDecal } from './mk.js';

const FRAME = '#e4e7ea', BAND = '#17181a', PANEL = '#252d36';
const ROWS = 4;

// per kind: H body height, R wheel radius, doors z (right side), bandY0/1 window band, roof units (z, len, h), board: LED board above the windscreen, noNose / noTail for the articulated sections
const B = {
  bus:      { H: 3.15, R: 0.52, doors: [4.0, 0.55, -4.55], bandY0: 1.14, bandY1: 2.53, ac: [[-0.4, 3.2, 0.30]], board: true, plates: true, kids: 'city' },
  midi:     { H: 3.05, R: 0.47, doors: [3.55, -2.95], bandY0: 1.10, bandY1: 2.43, ac: [[-0.6, 2.6, 0.28]], board: true, plates: true, kids: 'city' },
  minibus:  { H: 2.75, R: 0.40, doors: [2.3], bandY0: 1.00, bandY1: 2.15, ac: [[-0.2, 1.4, 0.16]], board: false, plates: true, kids: 'mini', dw: 0.95 },
  trolley:  { H: 3.40, R: 0.52, doors: [4.0, 0.55, -4.55], bandY0: 1.14, bandY1: 2.78, ac: [[1.0, 2.6, 0.26]], board: true, plates: false, kids: 'trolley', chevrons: true, pad: -2.5 },
  trolley2: { H: 3.40, R: 0.52, doors: [4.0, 0.55, -4.55], bandY0: 1.14, bandY1: 2.78, ac: [[1.0, 2.6, 0.26]], board: true, plates: false, kids: 'trolley', whiteTop: true, pad: -2.5 },
  coach:    { H: 3.70, R: 0.50, doors: [4.3], bandY0: 1.42, bandY1: 3.22, ac: [[-1.2, 2.6, 0.26]], board: false, plates: true, kids: 'coach', dw: 1.0 },
  artic_f:  { H: 3.15, R: 0.52, doors: [4.0, 0.0], bandY0: 1.14, bandY1: 2.53, ac: [[0.2, 3.0, 0.30]], board: true, plates: true, kids: 'city', noTail: true },
  artic_r:  { H: 3.15, R: 0.52, doors: [0.7, -4.5], bandY0: 1.14, bandY1: 2.53, ac: [[-0.8, 3.0, 0.30]], board: false, plates: true, kids: 'city', noNose: true, oneAxle: true },
  tram:     { H: 3.28, R: 0.34, doors: [5.35, 1.85, -1.85, -5.35], bandY0: 1.24, bandY1: 2.58, ac: [[-4.3, 2.2, 0.22]], board: true, plates: false, kids: 'tram', whiteTop: true, top: '#ece6d6', roof: '#8b9096', tram: true, dw: 1.25 },
};

export function busModel(kind, lod) {
  if (kind === 'dd') return ddModel(lod);
  const c = B[kind], a = archOf(kind), hi = lod === 0, W = a.wid, H = c.H, f = a.front, r = a.rear;
  const TOPC = c.top || '#f2f2f2';
  const axles = c.tram ? [-a.wb / 2 - 0.92, -a.wb / 2 + 0.92, a.wb / 2 - 0.92, a.wb / 2 + 0.92] : c.oneAxle ? [-a.wb / 2] : [-a.wb / 2, a.wb / 2];      // a tram: two bogies of two axles
  const s = { W, R: c.R, tw: 0.30, track: 2.10, yb: 0.34, Ra: c.R + 0.09, bev: hi ? 0.06 : 0, zr: -a.wb / 2, zf: a.wb / 2, front: f, rear: r, arches: hi && !c.tram ? axles : [] };
  if (c.tram) { s.track = 1.52; s.tw = 0.14; }
  if (kind === 'minibus') s.track = 1.72;
  if (kind === 'coach') s.track = 2.10;
  const V = new VB(1), G = new VB(0), Lm = new VB(0);
  const hv = c.bandY1 + 0.02;
  // ---- side profile: nose (vertical to the top of the windscreen, then the curved roof front) -> roof -> tail -> bottom with the arches
  const pts = [];
  if (c.noNose) pts.push([f, 0.44], [f, H]);
  else pts.push([f - 0.10, 0.44], [f, 0.58], [f + 0.003, hv], [f - 0.08, hv + 0.36], [f - 0.32, H - 0.04], [f - 0.58, H]);
  if (c.noTail) pts.push([r, H], [r, 0.44]);
  else pts.push([r + 0.40, H], [r + 0.08, H - 0.12], [r, H - 0.35], [r, 0.80], [r + 0.04, 0.58], [r + 0.12, 0.44]);
  if (c.noNose) { /* the polygon closes from the bottom-rear back to (f, 0.44) */ }
  if (c.tram) { /* a flat skirt: the bogies stand under it */ }
  else if (hi) for (const za of s.arches) pts.push(...archPts(s, za, 7)); else pts.push([s.zr - 0.1, 0.36], [s.zf + 0.1, 0.36]);
  // an articulated rear section is a plain box at its hinge end: order the points front-top -> rear -> bottom -> front-bottom
  V.add(extrudeSide(pts, W, s.bev, { zF0: f - 1.2, zF1: f + 0.05, kF: c.noNose ? 0 : 0.05, zR0: r + 1.2, zR1: r - 0.05, kR: c.noTail ? 0 : 0.04, kS: 0.04, yS: hv - 0.3, yT: H }), WHITE, null, bodyTint(s));

  // ---- window band in staggered layers on each side; doors on the right (-X)
  const X = W / 2;
  const bandZ0 = r + (c.noTail ? 0.25 : 0.55), bandZ1 = f - (c.noNose ? 0.25 : 0.85);
  const bandC = (bandZ0 + bandZ1) / 2, bandL = bandZ1 - bandZ0, bandYC = (c.bandY0 + c.bandY1) / 2, bandH = c.bandY1 - c.bandY0;
  const dw = c.dw || 1.15;
  const doorHit = (sd, z) => sd < 0 && c.doors.some((d) => Math.abs(z - d) < dw / 2 + 0.2);
  for (const sd of [-1, 1]) {
    if (c.whiteTop) V.box(0.03, H - 1.12 - 0.05, bandL + 0.9, TOPC, [sd * (X + 0.000), (1.12 + H - 0.05) / 2, bandC], null, null, 0);   // white upper body of the BKM-321 (outer face +1.5 cm)
    if (hi) {
      V.box(0.010, bandH, bandL, kind === 'coach' ? '#10161c' : INT, [sd * (X + 0.030), bandYC, bandC], null, null, 0);
      G.box(0.016, bandH, bandL, '#ffffff', [sd * (X + 0.050), bandYC, bandC], null, null, 0);
      const pitch = kind === 'coach' ? 1.7 : 1.25;
      for (let z = bandZ0 + pitch; z < bandZ1 - 0.5; z += pitch) if (!doorHit(sd, z)) V.box(0.03, bandH, 0.07, kind === 'coach' ? '#1c2026' : c.tram ? TOPC : WHITE, [sd * (X + 0.085), bandYC, z], null, null, kind === 'coach' || c.tram ? 0 : 1);
    } else V.box(0.04, bandH, bandL, kind === 'coach' ? '#10161c' : BAND, [sd * (X + 0.04), bandYC, bandC], null, null, 0);
  }
  for (const dz of c.doors) {
    V.box(0.03, 1.75, dw + 0.1, FRAME, [-(X + 0.085), 1.36, dz], null, null, 0);
    V.box(0.03, 1.62, dw - 0.04, PANEL, [-(X + 0.115), 1.36, dz], null, null, 0);
  }
  // ---- windscreen (the body front is vertical up to hv): dark panel +2.5 cm, glass +5 cm
  const wy0 = kind === 'coach' ? 1.30 : 1.10;
  const wsq = (d, y0, y1, k) => quad([-W / 2 + 0.16 + k, y0, f + d], [W / 2 - 0.16 - k, y0, f + d], [W / 2 - 0.18 - k, y1, f + d], [-W / 2 + 0.18 + k, y1, f + d]);
  if (!c.noNose) {
    if (hi) { V.add(wsq(0.025, wy0, c.bandY1, 0.02), INT, null, null, null, 0); G.add(wsq(0.05, wy0, c.bandY1, 0), '#ffffff'); }
    else V.add(wsq(0.05, wy0, c.bandY1, 0), BAND, null, null, null, 0);
    if (c.whiteTop) V.box(W - 0.04, 0.04, 0.03, TOPC, [0, wy0 - 0.02, f + 0.0], null, null, 0);
  }
  if (!c.noTail) V.box(W - 0.6, 0.78, 0.02, BAND, [0, c.bandY1 - 0.45, r - 0.030], null, null, 0);   // rear window: outer face 4 cm behind the tail
  // ---- bumpers (face 5 cm ahead of the body), wheels, mirrors, lamps, plates
  if (!c.noNose) V.box(W - 0.06, 0.28, 0.16, TRIM, [0, 0.62, f - 0.03], null, null, 3);                   // z f-0.11 .. f+0.05
  if (!c.noTail) V.box(W - 0.06, 0.28, 0.16, TRIM, [0, 0.62, r + 0.03], null, null, 3);                    // z r-0.05 .. r+0.11
  if (c.tram) {
    // bogies: a dark frame between the two wheel pairs, steel wheels inside the skirt line, a coupler box under each end; nothing else shows below the floor
    for (const zb of [-a.wb / 2, a.wb / 2]) { V.box(1.9, 0.26, 2.5, '#22252a', [0, 0.36, zb], null, null, 0); if (hi) for (const side of [-1, 1]) V.box(0.10, 0.22, 2.3, '#3a3e44', [side * 1.0, 0.40, zb], null, null, 0); }
    for (const z of axles) for (const side of [-1, 1]) { if (hi) V.cyl(c.R, c.R, 0.12, '#55595f', [side * (s.track / 2), c.R, z], [0, 0, Math.PI / 2], 10, null, 0); else V.box(0.12, c.R * 1.7, c.R * 1.7, '#34373c', [side * (s.track / 2), c.R, z], null, null, 0); }
    for (const [z, sg] of [[f - 0.1, 1], [r + 0.1, -1]]) V.box(0.34, 0.2, 0.5, '#22252a', [0, 0.5, z + sg * 0.12], null, null, 0);
  } else for (const z of axles) for (const side of [-1, 1]) wheel(V, hi, s, side * (s.track / 2 + 0.02), z, c.R, 0.30, 10);
  if (hi) {
    if (!c.noNose) for (const sd of [-1, 1]) {
      V.box(0.22, 0.46, 0.05, TRIM, [sd * (W / 2 + 0.34), c.bandY1 - 0.50, f - 0.50], null, null, 0);          // big mirror on an arm
      V.rod([sd * (W / 2 - 0.02), c.bandY1 - 0.53, f - 0.46], [sd * (W / 2 + 0.28), c.bandY1 - 0.50, f - 0.5], 0.02, TRIM, 4);
      V.box(0.34, 0.14, 0.05, LENS_H, [sd * (W / 2 - 0.30), 0.90, f + 0.0], null, null, 0);               // face f+0.025
      Lm.box(0.35, 0.15, 0.04, '#ffffff', [sd * (W / 2 - 0.30), 0.90, f + 0.025], null, null, 0);          // face f+0.045
    }
    if (!c.noTail) for (const sd of [-1, 1]) {
      V.box(0.16, 0.5, 0.05, LENS_T, [sd * (W / 2 - 0.16), 1.15, r - 0.005], null, null, 0);              // face r-0.03
      Lm.box(0.17, 0.52, 0.04, '#ffffff', [sd * (W / 2 - 0.16), 1.15, r - 0.030], null, null, 1);         // face r-0.05
    }
    if (c.plates) { if (!c.noNose) plate(V, 0.62, f + 0.07, true); if (!c.noTail) plate(V, 0.62, r - 0.07, false); }
    if (!c.noTail && !c.tram) {
      V.box(1.0, 0.7, 0.03, '#2d3237', [0, 1.55, r - 0.012], null, null, 0);                                // engine grille panel at the tail: face r-0.027
      for (let i = 0; i < 4; i++) V.box(0.9, 0.025, 0.03, '#15181b', [0, 1.35 + i * 0.12, r - 0.03], null, null, 0);   // louvres: face r-0.045
    }
    if (!c.noNose) V.box(0.9, 0.06, 0.03, TRIM, [0, 0.84, f + 0.02], null, null, 0);                         // grille: face f+0.035
  }
  // ---- roof equipment (AC cover in body colour), trolleybus pole bases
  const roofZ0 = (c.noNose ? f : f - 0.58) - 0.3, roofZ1 = (c.noTail ? r : r + 0.40) + 0.3;
  for (const [z, len, h] of c.ac) {
    const zz = clampZ(z, len, roofZ0, roofZ1);
    V.rbox(W - 0.8, h, len, 0.1, c.whiteTop ? (c.roof || '#f2f2f2') : WHITE, [0, H + h / 2, zz], null, 1, null, c.whiteTop ? 0 : 1);
  }
  if (c.whiteTop) V.box(W - 0.16, 0.03, roofZ0 - roofZ1 - 0.1, c.roof || '#f2f2f2', [0, H + 0.0, (roofZ0 + roofZ1) / 2], null, null, 0);   // white roof (top face 1.5 cm proud)
  if (c.tram) {
    // single-arm pantograph over the front bogie: base frame on four insulators, lower arm up to the knee, upper arm back to the head, a contact strip across the car at 5.6 m (the height of a
    // tram contact wire); resistor boxes along the roof
    const pz = a.wb / 2 - 0.4, py = H + 0.02, KNEE = [0, py + 1.18, pz + 1.25], HEAD = [0, py + 2.3, pz - 0.05], DK = '#2a2d31';
    V.box(1.3, 0.08, 1.7, DK, [0, py + 0.16, pz + 0.2], null, null, 0);
    for (const sx of [-0.55, 0.55]) for (const sz of [-0.5, 0.9]) V.box(0.1, 0.14, 0.1, '#c9c2b2', [sx, py + 0.07, pz + sz], null, null, 0);
    V.rod([0, py + 0.2, pz - 0.45], KNEE, hi ? 0.035 : 0.05, DK, hi ? 5 : 3);
    if (hi) { for (const sx of [-0.28, 0.28]) V.rod([KNEE[0] + sx, KNEE[1], KNEE[2]], [HEAD[0] + sx * 0.6, HEAD[1], HEAD[2]], 0.022, DK, 4); V.rod([0, py + 0.2, pz + 0.75], [0, py + 0.75, pz + 0.55], 0.02, DK, 4); }
    else V.rod(KNEE, HEAD, 0.05, DK, 3);
    V.box(1.5, 0.05, 0.26, '#3a3d42', [0, HEAD[1] + 0.02, HEAD[2]], null, null, 0);
    if (hi) { for (const sx of [-0.75, 0.75]) V.box(0.05, 0.05, 0.4, '#3a3d42', [sx, HEAD[1] - 0.04, HEAD[2]], [0, 0, sx > 0 ? -0.5 : 0.5], null, 0); V.rbox(W - 1.0, 0.18, 1.6, 0.06, c.roof, [0, H + 0.09, -0.6], null, 1, null, 0); V.rbox(W - 1.1, 0.16, 1.2, 0.06, c.roof, [0, H + 0.08, 5.6], null, 1, null, 0); }
  }
  let pole = null;
  if (c.pad !== undefined) {
    pole = { x: 0.34, y: H + 0.13, z: c.pad };
    for (const sd of [-1, 1]) V.box(0.22, 0.10, 0.34, '#2a2d31', [sd * pole.x, H + 0.04, c.pad], null, null, 0);          // insulated base block (top y H+0.09)
    V.box(0.9, 0.06, 0.46, '#2a2d31', [0, H + 0.025, c.pad], null, null, 0);
  }
  if (c.chevrons && hi) {
    for (const sd of [-1, 1]) for (let z = -1.9; z <= 1.95; z += 0.55) {
      if (sd < 0 && z > -0.55 && z < 1.25) continue;                                                      // the middle door
      V.box(0.03, 0.62, 0.20, '#f4f6f8', [sd * (X + 0.012), 0.72, z], [0.65, 0, 0], null, 0);             // white diagonal chevron: face 2.7 cm proud (angled 37 degrees)
    }
    V.box(W - 0.3, 0.18, 0.03, '#f4f6f8', [0, 0.84, f + 0.03], null, null, 0);                              // nose stripe
  }
  if (c.whiteTop && hi) V.box(W - 0.3, 0.05, 0.03, TOPC, [0, 1.02, f + 0.03], null, null, 0);
  if (c.noNose && hi) {
    // black bellows of the articulated bus: 0.45 m gap between the two bodies, spanned by a slightly narrower ribbed box (1.1 m, 0.12 m of it hidden in each body)
    V.box(W - 0.20, H - 0.75, 1.10, '#1b1d20', [0, (0.60 + H - 0.15) / 2, f + 0.45 + 0.02], null, null, 0);
    for (let i = 0; i < 6; i++) V.box(W - 0.14, H - 0.85, 0.03, '#2b2e33', [0, (0.62 + H - 0.2) / 2, f + 0.0 + i * 0.17 + 0.02 + 0.01], null, null, 0);
  }
  // ---- people at the driver's seat
  const seat = { z: f - 0.95, y: kind === 'coach' ? 2.30 : 1.95, x: c.tram ? 0 : 0.48, wz: f - 0.65, wy: kind === 'coach' ? 1.80 : 1.45, roofY: H, roofZ: 0 };
  return { paint: V.build(), glass: hi ? G.build() : null, lamps: hi ? Lm.build() : null, seat, H: H + 0.3, bus: c, board: c.board ? { z: f + 0.05, y: c.bandY1 + 0.19 } : null, pole, extras: {} };
}
const clampZ = (z, len, z0, z1) => Math.max(z1 + len / 2, Math.min(z0 - len / 2, z));

// ------------------------------------------------------------------------------------------------------------------ the sightseeing double-decker
function ddModel(lod) {
  const a = archOf('dd'), hi = lod === 0, W = a.wid, f = a.front, r = a.rear, X = W / 2, R = 0.52, LOW = 2.46, H = 4.10;
  const s = { W, R, tw: 0.30, track: 2.10, yb: 0.34, Ra: R + 0.09, bev: hi ? 0.06 : 0, zr: -a.wb / 2, zf: a.wb / 2, front: f, rear: r, arches: hi ? [-a.wb / 2, a.wb / 2] : [] };
  const V = new VB(1), G = new VB(0), Lm = new VB(0);
  const pts = [[f - 0.10, 0.44], [f, 0.58], [f + 0.003, 2.20], [f - 0.04, LOW - 0.04], [f - 0.12, LOW], [r + 0.30, LOW], [r + 0.04, LOW - 0.06], [r, 2.2], [r, 0.80], [r + 0.04, 0.58], [r + 0.12, 0.44]];
  if (hi) for (const za of s.arches) pts.push(...archPts(s, za, 7)); else pts.push([s.zr - 0.1, 0.36], [s.zf + 0.1, 0.36]);
  V.add(extrudeSide(pts, W, s.bev, { zF0: f - 1.0, zF1: f + 0.05, kF: 0.04, zR0: r + 1.0, zR1: r - 0.05, kR: 0.04, kS: 0, yS: 1, yT: 2 }), WHITE, null, bodyTint(s));
  // lower deck windows / doors / windscreen
  const bandY0 = 1.14, bandY1 = 2.22, bandZ0 = r + 0.55, bandZ1 = f - 0.85, bandC = (bandZ0 + bandZ1) / 2, bandL = bandZ1 - bandZ0;
  for (const sd of [-1, 1]) {
    if (hi) {
      V.box(0.010, bandY1 - bandY0, bandL, INT, [sd * (X + 0.030), (bandY0 + bandY1) / 2, bandC], null, null, 0);
      G.box(0.016, bandY1 - bandY0, bandL, '#ffffff', [sd * (X + 0.050), (bandY0 + bandY1) / 2, bandC], null, null, 0);
      for (let z = bandZ0 + 1.25; z < bandZ1 - 0.5; z += 1.25) if (!(sd < 0 && [4.1, -1.2].some((d) => Math.abs(z - d) < 0.9))) V.box(0.03, bandY1 - bandY0, 0.07, WHITE, [sd * (X + 0.085), (bandY0 + bandY1) / 2, z]);
    } else V.box(0.04, bandY1 - bandY0, bandL, BAND, [sd * (X + 0.04), (bandY0 + bandY1) / 2, bandC], null, null, 0);
  }
  for (const dz of [4.1, -1.2]) { V.box(0.03, 1.75, 1.25, FRAME, [-(X + 0.085), 1.36, dz], null, null, 0); V.box(0.03, 1.62, 1.11, PANEL, [-(X + 0.115), 1.36, dz], null, null, 0); }
  const wsq = (d, y0, y1, k) => quad([-W / 2 + 0.16 + k, y0, f + d], [W / 2 - 0.16 - k, y0, f + d], [W / 2 - 0.18 - k, y1, f + d], [-W / 2 + 0.18 + k, y1, f + d]);
  if (hi) { V.add(wsq(0.025, 1.10, bandY1, 0.02), INT, null, null, null, 0); G.add(wsq(0.05, 1.10, bandY1, 0), '#ffffff'); } else V.add(wsq(0.05, 1.10, bandY1, 0), BAND, null, null, null, 0);
  V.box(W - 0.6, 0.78, 0.02, BAND, [0, 1.75, r - 0.030], null, null, 0);
  V.box(W - 0.06, 0.28, 0.16, TRIM, [0, 0.62, f - 0.03], null, null, 3);
  V.box(W - 0.06, 0.28, 0.16, TRIM, [0, 0.62, r + 0.03], null, null, 3);
  for (const z of [s.zr, s.zf]) for (const side of [-1, 1]) wheel(V, hi, s, side * (s.track / 2 + 0.02), z, R, 0.30, 10);
  // purple rear: rear face and the lower rear corner panel (fixed colour), lower tail
  const PURPLE = '#3b2f7a';
  V.box(W - 0.1, 1.5, 0.03, PURPLE, [0, 1.55, r - 0.07], null, null, 0);
  // upper deck: red skirt walls, floor, glazing, posts, roof over the front and the rear, seats
  const UL0 = r + 0.2, UL1 = f - 0.3, UC = (UL0 + UL1) / 2, UL = UL1 - UL0;
  V.box(W - 0.2, 0.04, UL, '#2a2f3a', [0, LOW + 0.04, UC], null, null, 0);                                   // upper floor (2 cm above the lower roof)
  for (const sd of [-1, 1]) {
    V.box(0.10, 0.62, UL, WHITE, [sd * (X - 0.05), LOW + 0.31, UC]);                                         // red skirt wall of the upper deck (outer face = body side)
    if (hi) {
      V.box(0.010, 0.86, UL - 0.3, INT, [sd * (X - 0.06), LOW + 0.62 + 0.43 + 0.0, UC], null, null, 0);        // dark backing of the upper glazing (inside the glass)
      G.box(0.016, 0.86, UL - 0.3, '#ffffff', [sd * (X - 0.02), LOW + 0.62 + 0.43, UC], null, null, 0);
      for (let z = UL0 + 0.6; z < UL1 - 0.3; z += 1.3) V.box(0.07, 0.88, 0.07, WHITE, [sd * (X - 0.02), LOW + 0.62 + 0.44, z]);
    } else V.box(0.04, 0.86, UL - 0.3, BAND, [sd * (X - 0.04), LOW + 1.05, UC], null, null, 0);
  }
  const roofY = LOW + 0.62 + 0.88;
  V.box(W - 0.06, 0.06, 3.3, WHITE, [0, roofY + 0.03, UL1 - 1.65]);                                          // front roof
  V.box(W - 0.06, 0.06, 2.6, WHITE, [0, roofY + 0.03, UL0 + 1.3]);                                           // rear roof
  V.box(W - 0.30, 0.86, 0.04, PURPLE, [0, LOW + 0.62 + 0.43, UL0 + 0.02], null, null, 0);                    // purple rear wall of the upper deck (inside the roof)
  if (hi) {
    V.box(W - 0.30, 0.86, 0.02, INT, [0, LOW + 0.62 + 0.43, UL1 - 0.04], null, null, 0);
    G.box(W - 0.30, 0.86, 0.016, '#ffffff', [0, LOW + 0.62 + 0.43, UL1 - 0.01], null, null, 0);              // upper windscreen
    for (let i = 0; i < 7; i++) for (const sx of [-0.55, 0.55]) {
      const z = UL1 - 1.0 - i * 1.0 - (i > 3 ? 0.3 : 0);
      V.box(0.96, 0.46, 0.5, '#26324a', [sx, LOW + 0.31, z], null, null, 0);                    // seat cushion
      V.box(0.96, 0.52, 0.10, '#26324a', [sx, LOW + 0.80, z - 0.26], null, null, 0);            // backrest (facing forward)
    }
    for (const sd of [-1, 1]) {
      V.box(0.16, 0.08, 0.05, LENS_T, [sd * (W / 2 - 0.16), 0.98, r - 0.005], null, null, 0);
    }
    for (const sd of [-1, 1]) {
      V.box(0.22, 0.46, 0.05, TRIM, [sd * (W / 2 + 0.34), 1.95, f - 0.50], null, null, 0);
      V.rod([sd * (W / 2 - 0.02), 1.92, f - 0.46], [sd * (W / 2 + 0.28), 1.95, f - 0.5], 0.02, TRIM, 4);
      V.box(0.34, 0.14, 0.05, LENS_H, [sd * (W / 2 - 0.30), 0.90, f + 0.0], null, null, 0);
      Lm.box(0.35, 0.15, 0.04, '#ffffff', [sd * (W / 2 - 0.30), 0.90, f + 0.025], null, null, 0);
      V.box(0.16, 0.5, 0.05, LENS_T, [sd * (W / 2 - 0.16), 1.15, r - 0.005], null, null, 0);
      Lm.box(0.17, 0.52, 0.04, '#ffffff', [sd * (W / 2 - 0.16), 1.15, r - 0.030], null, null, 1);
    }
    plate(V, 0.62, f + 0.07, true); plate(V, 0.62, r - 0.07, false);
  }
  const ex = {};
  if (hi) {
    const D = new VB(0);
    for (const sd of [-1, 1]) D.add(sideDecal(sd, sd * (X + 0.016), r + 2.2, f - 3.4, LOW + 0.06, LOW + 0.56, 2, ROWS), WHITE, null, null, null, 0);
    ex.tdec = D.build();
  }
  return { paint: V.build(), glass: hi ? G.build() : null, lamps: hi ? Lm.build() : null, seat: { z: f - 0.95, y: 1.95, x: 0.48, wz: f - 0.65, wy: 1.45, roofY: LOW, roofZ: 0 }, H, bus: { H, doors: [4.1, -1.2] }, board: null, pole: null, extras: ex };
}
void THREE;
