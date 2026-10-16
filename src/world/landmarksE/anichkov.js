// landmarksE/anichkov.js - the Anichkov Palace complex south of Nevsky west of the Fontanka (docs/research/gostiny-dvor-ostrovsky.md section 8; photos refs/ostrovsky 139 140 146 149 150 152 153 158 164 167):
//   * the CABINET BUILDING (Quarenghi / Rusca, OSM r1517638) at the bridge: a pale yellow-green (#e0e2c4) two-storey block with a giant order of free Ionic columns (pitch 3.6 m, 10 m) along Nevsky and
//     the Fontanka, windows with alternating triangular / segmental pediments, a cornice with vertical blocks;  Fontanka 39 litV (r1517637) plain;
//   * the ANICHKOV PALACE (r3798383): peach #ecd0a8, four storeys, the GARDEN FRONT faces west: a porch of four white columns with three arched glazed openings, a projecting glazed bay with a
//     pediment above, white-framed windows, balustrade;
//   * the two ROSSI PAVILIONS (r6754929 north, r6754928 south): grey-green, a flat front to the square with two Ionic columns round a niche with a white warrior statue and a trophy relief, a
//     rotunda with columns towards the garden;
//   * the FENCE with gilded double-headed eagles (w457093010 along the square, w20941243 on Nevsky), the closed gate with two plaster piers carrying gilded eagles, the 4 m plastered walls
//     (w131817482 / 483 / 484, w131820046) with pilaster strips.  The garden is closed: colliders on the fences; its trees are the environment's (park r1770781).
import * as THREE from 'three';
import * as L from '../layout.js';
import { buildHouse } from './house.js';
import { BARRIERS, BARRIER_NODES } from '../data/city.js';
import { toUV, toWorld, ROT, ringOf } from './frame.js';
import { archPath } from './kit.js';
import { ionic, tuscan } from './columns.js';
import { figure } from './monument.js';
import { eagle } from './sculpt.js';

export function build(K, ctx) {
  const M = K.G.M;
  cabinet(K, ctx);
  palace(K, ctx);
  pavilions(K, ctx);
  fences(K, ctx);
  K.svc.spots.anichkov = { gate: toWorld(228.3, 22), palace: toWorld(186, 80) };
  const [sx, sz] = toWorld(60, -25), [tx, tz] = toWorld(100, 40);
  K.svc.photoSpots.push({ x: sx, z: sz, yaw: Math.atan2(-(tx - sx), -(tz - sz)) * 180 / Math.PI, pitch: 6, name: 'Кабинет Его Величества на Фонтанке', nameEn: 'The Cabinet building by the Anichkov Bridge' });
  void M;
}

const uvOf = (e) => toUV((e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2);
const wpos = (K, x, z) => { const m = K.P.m.elements; return [m[0] * x + m[8] * z + m[12], m[2] * x + m[10] * z + m[14]]; };

// ------------------------------------------------------------------------------------------------ Cabinet building
function cabinet(K, ctx) {
  const M = K.G.M, P = K.P, white = M.white;
  const recs = [L.buildingById('r1517638'), L.buildingById('r1517637')].filter(Boolean);
  if (!recs.length) return;
  const front = (e) => {
    if (e.len < 18) return null;
    const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
    if (Math.abs(a.v - 20) < 3 && Math.abs(b.v - 20) < 3 && a.u > 45 && b.u > 45) return 'nevsky';
    if (Math.abs(a.u - 50) < 3 && Math.abs(b.u - 50) < 3) return 'fontanka';
    return null;
  };
  buildHouse(K, {
    name: 'cabinet', recs, hc: 11.6, wall: '#e0e2c4', court: '#d8dabc', plinth: 0.9, plinthMat: M.plinth, floors: [4.8, 4.4, 3.4], courtPitch: 3.6, upstand: 0.9, roofMat: M.roofDark, railing: false, collide: true, collideH: 14,
    cornice: 'none',
    front: (e, c) => { const k = front(e); if (!k || e.rec.id !== 'r1517638') return false; cabinetFront(K, M, c.len, ctx); return true; },
  });
}
function cabinetFront(K, M, len, ctx) {
  const P = K.P, white = M.white, wall = M.cabinet, n = Math.max(1, Math.round(len / 3.6)), p = len / n;
  K.wallQuad(M.cabinet, 0, len, 0.9, 11.4, 4);
  K.wallQuad(M.plinthFlat, 0, len, 0, 0.9, 2);
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * p;
    K.window({ x, y: 1.7, w: 1.3, h: 2.5, head: 'flat', sw: 0.16, d: 0.08, frame: 'white', surMat: white, sillMat: white, hood: k % 2 ? 'seg' : 'tri', hoodH: 0.45 });
    K.window({ x, y: 6.1, w: 1.2, h: 2.4, head: 'flat', sw: 0.13, d: 0.06, frame: 'white', surMat: white, sillMat: white });
    K.balustrade(x - 0.55, x + 0.55, 5.4, 0.7, 0.2, white);
  }
  P.box(white, -0.1, len + 0.1, 4.5, 4.8, 0, 0.2, 'kb');
  for (let k = 0; k <= n; k++) {
    const x = k * p; ionic(K, white, M.whiteShade, x, 1.8, 0.0, 10.4, 0.45, 10);
    const [wx, wz] = wpos(K, x, 1.8); ctx.physics.addCylinder(wx, wz, 0.5, 0, 11);
  }
  P.box(white, -0.5, len + 0.5, 10.4, 11.0, 0, 2.3, 'b');
  P.box(M.cabinet, -0.4, len + 0.4, 11.0, 11.6, 0, 2.2, 'b');
  for (let x = 0.2; x < len; x += 0.9) P.box(M.whiteShade, x, x + 0.4, 10.75, 11.1, 2.2, 2.35, 'kb');
  P.box(white, -0.6, len + 0.6, 11.6, 12.3, 0, 2.6, 'b');
  P.box(M.roofDark, -0.2, len + 0.2, 12.3, 12.5, 0.4, 2.3, 'b');
}

// ------------------------------------------------------------------------------------------------ Anichkov Palace (garden front towards the west)
function palace(K, ctx) {
  const M = K.G.M, white = M.white;
  const rec = L.buildingById('r3798383'); if (!rec) return;
  const front = (e) => {
    if (e.len < 12) return false;
    const m = uvOf(e), a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
    return Math.abs(a.u - b.u) < 3 && (a.u + b.u) / 2 > 195;
  };
  buildHouse(K, {
    name: 'palace', recs: [rec], hc: 16.8, wall: '#ecd0a8', court: '#e6caa0', plinth: 1.4, plinthMat: M.plinth, floors: [4.8, 4.4, 4.2, 3.6], courtPitch: 3.6, upstand: 1.0, roofMat: M.roofGreen, railing: true, collide: true, collideH: 20,
    front: (e, c) => { if (!front(e)) return false; palaceFront(K, M, c.len, e); return true; },
  });
  const o = rec.polys[0].o; let cx = 0, cz = 0; for (let i = 0; i < o.length; i += 2) { cx += o[i]; cz += o[i + 1]; } cx /= o.length / 2; cz /= o.length / 2;
  K.svc.monuments.push({ id: 'r3798383', name: 'Аничков дворец', nameEn: 'Anichkov Palace', x: cx, z: cz, h: 19 });
  K.svc.houses.push({ id: 'r3798383', name: 'Аничков дворец', nameEn: 'Anichkov Palace', x: cx, z: cz });
}
function palaceFront(K, M, len, e) {
  const P = K.P, white = M.white, wall = M.palace, cx = len / 2;
  K.wallQuad(M.palace, 0, len, 1.4, 17.8, 4);
  K.wallQuad(M.rossiGround, 0, len, 0, 1.4, 1.8);
  const n = Math.max(2, Math.round(len / 3.7)), p = len / n;
  for (let k = 0; k < n; k++) {
    const x = (k + 0.5) * p; if (Math.abs(x - cx) < 7.8) continue;
    K.window({ x, y: 0.5, w: 1.2, h: 0.8, head: 'flat', sw: 0.1, d: 0.05, frame: 'white', surMat: white, sillMat: white, sill: false });
    K.window({ x, y: 2.2, w: 1.35, h: 2.3, head: 'flat', sw: 0.16, d: 0.07, frame: 'white', surMat: white, sillMat: white });
    K.window({ x, y: 6.7, w: 1.3, h: 2.5, head: 'flat', sw: 0.16, d: 0.07, frame: 'white', surMat: white, sillMat: white });
    K.window({ x, y: 11.2, w: 1.25, h: 2.3, head: 'flat', sw: 0.15, d: 0.06, frame: 'white', surMat: white, sillMat: white });
    K.window({ x, y: 15.0, w: 1.1, h: 1.6, head: 'flat', sw: 0.12, d: 0.05, frame: 'white', surMat: white, sillMat: white, sill: false });
  }
  P.box(white, -0.1, len + 0.1, 5.6, 5.9, 0, 0.25, 'kb'); P.box(white, -0.1, len + 0.1, 10.0, 10.25, 0, 0.2, 'kb');
  P.box(white, -0.15, len + 0.15, 16.2, 17.2, 0, 0.7, 'b'); P.box(white, -0.2, len + 0.2, 17.2, 17.9, 0, 1.1, 'b');
  K.balustrade(0, len, 17.9, 1.0, 0.4, white);
  // the central bay: porch of four columns with three arched glazed openings, glazed bay above, pediment, square attic
  const bw = 15.0, x0 = cx - bw / 2, x1 = cx + bw / 2;
  P.box(M.palace, x0, x1, 0, 17.4, 0, 1.0, 'b');
  const frame = K.mat('#6a2f26', { name: 'lmE-redFrame' });
  for (const dx of [-4.0, 0, 4.0]) {
    K.glass(K.mats.winBrown, cx + dx, 1.5, 3.0, 5.4, 'arch', 1, 1.05);
    const s = new THREE.Shape(); archPath(s, cx + dx, 1.5, 3.5, 4.1, false); const h = new THREE.Path(); archPath(h, cx + dx, 1.5, 3.0, 4.1, true); s.holes.push(h); P.face(white, s, 1.08, 1, 8);
    P.box(frame, cx + dx - 0.04, cx + dx + 0.04, 1.5, 5.6, 1.1, 1.14, 'kb');
  }
  for (const dx of [-6.0, -2.0, 2.0, 6.0]) tuscan(K, white, cx + dx, 3.0, 0.0, 6.2, 0.52, 10);
  P.box(white, x0 - 0.8, x1 + 0.8, 6.2, 7.2, 0, 3.8, 'b');                                   // porch entablature / balcony
  for (const dx of [-4.2, 0, 4.2]) { K.glass(K.mats.winBrown, cx + dx, 7.9, 3.2, 5.0, 'flat', 3, 1.05); P.box(frame, cx + dx - 1.7, cx + dx + 1.7, 7.8, 8.0, 1.06, 1.12, 'kb'); P.box(frame, cx + dx - 1.7, cx + dx + 1.7, 12.9, 13.1, 1.06, 1.12, 'kb'); }
  for (const x of [x0 + 0.6, cx - 2.1, cx + 2.1, x1 - 0.6]) P.box(white, x - 0.3, x + 0.3, 7.4, 13.4, 1.0, 1.35, 'b');
  P.box(white, x0 - 0.3, x1 + 0.3, 13.4, 14.4, 0, 1.6, 'b');
  const sh = new THREE.Shape(); sh.moveTo(x0 - 0.4, 14.4); sh.lineTo(x1 + 0.4, 14.4); sh.lineTo(cx, 17.0); sh.lineTo(x0 - 0.4, 14.4); P.extrude(white, sh, 0, 1.7, 1, 4);
  P.box(M.palace, cx - 4.5, cx + 4.5, 14.4, 17.9, -0.4, 0.6, 'b');
  const [wx, wz] = wpos(K, cx, 3.0); K.ctx.physics.addBox(wx, wz, bw, 1.0, Math.atan2(e.n[0], e.n[1]), 0, 6.5);
}

// ------------------------------------------------------------------------------------------------ the Rossi pavilions
function pavilions(K, ctx) {
  const M = K.G.M, white = M.white;
  for (const id of ['r6754929', 'r6754928']) {
    const rec = L.buildingById(id); if (!rec) continue;
    buildHouse(K, {
      name: id, recs: [rec], hc: 7.4, wall: '#bdb9a6', court: '#bdb9a6', plinth: 0.9, plinthMat: M.plinth, floors: [3.6], courtPitch: 3.6, upstand: 0.7, roofMat: M.roofDark, railing: false, collide: true, collideH: 9, cornice: 'classic',
      front: (e, c) => {
        const a = toUV(e.a[0], e.a[1]), b = toUV(e.b[0], e.b[1]);
        if (e.len > 8 && Math.abs(a.u - b.u) < 2.5 && (a.u + b.u) / 2 > 270 && (a.u + b.u) / 2 < 296) { pavilionFront(K, M, c.len, ctx, e); return true; }
        return false;
      },
    });
    const o = rec.polys[0].o; const q = ringOf(o);
    // the rotunda: Ionic columns round the semicircular end (the vertices on the Anichkov side = smaller u)
    const cu = q.map((p) => toUV(p[0], p[1])); let umin = 1e9; for (const t of cu) umin = Math.min(umin, t.u);
    const arc = q.filter((p, i) => cu[i].u < umin + 6.2 && Math.abs(cu[i].u - umin) >= 0.0);
    let mx = 0, mz = 0; for (const p of q) { mx += p[0]; mz += p[1]; } mx /= q.length; mz /= q.length;
    for (const p of arc) { const dx = p[0] - mx, dz = p[1] - mz, l = Math.hypot(dx, dz) || 1, x = p[0] + dx / l * 0.7, z = p[1] + dz / l * 0.7; ionic(K, white, M.whiteShade, x, z, 0.8, 6.4, 0.3, 8); K.ctx.physics.addCylinder(x, z, 0.32, 0, 7); }
  }
}
function pavilionFront(K, M, len, ctx, e) {
  const P = K.P, white = M.white, cx = len / 2;
  K.wallQuad(M.pavilion, 0, len, 0.9, 6.8, 4);
  // niche with a white Roman warrior statue between two free Ionic columns, trophy relief above
  const s = new THREE.Shape(); archPath(s, cx, 1.2, 2.2, 2.6, false); P.face(M.theatreShade, s, 0.04, 1, 8);
  figure(P, white, cx, 1.2, 0.25, 0, 0.82, 2);
  for (const dx of [-2.2, 2.2]) { ionic(K, white, M.whiteShade, cx + dx, 1.3, 0.9, 6.2, 0.42, 10); const [wx, wz] = wpos(K, cx + dx, 1.3); ctx.physics.addCylinder(wx, wz, 0.45, 0, 7); }
  P.box(white, cx - 3.4, cx + 3.4, 6.2, 6.9, 0, 1.8, 'b'); K.plane(K.R.trophy, cx - 0.9, cx + 0.9, 3.9, 5.9, 0.06);
  K.balustrade(cx - 3.4, cx + 3.4, 6.9, 0.8, 0.3, white);
}

// ------------------------------------------------------------------------------------------------ fences with gilded eagles, the gate, the 4 m walls
function fences(K, ctx) {
  const P = K.P, M = K.G.M, ph = ctx.physics;
  const ids = ['w457093010', 'w20941243'];
  const gold = M.gold;
  let nE = 0;
  for (const id of ids) {
    const b = BARRIERS.find((q) => q.id === id); if (!b) continue;
    const pts = ringOf(b.pts);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.5) continue;
      const nx = dz / len, nz = -dx / len, tx = dx / len, tz = dz / len, rot = Math.atan2(nx, nz);
      // stone plinth + pickets (alpha) + posts with gilded eagles every ~8 m
      const tl = len / 3.0;
      P.quad(M.pickets, [a[0], 0.55, a[1]], [c[0], 0.55, c[1]], [c[0], 3.15, c[1]], [a[0], 3.15, a[1]], [nx, 0, nz], [[0, 0], [tl, 0], [tl, 1], [0, 1]]);
      const k = Math.max(1, Math.round(len / 8));
      for (let j = 0; j <= k; j++) {
        if (j === 0 && i > 0) continue; const t = j / k, x = a[0] + dx * t, z = a[1] + dz * t;
        P.box(M.fence, x - 0.14, x + 0.14, 0, 3.3, z - 0.14, z + 0.14, 'b'); P.cyl(M.fence, [x, 3.3, z], [x, 3.7, z], 0.18, 0.02, 4, false);
        if (j > 0 && j < k) { for (const s of [-1, 1]) eagle(K, gold, x + nx * 0.18 * s, 1.6, z + nz * 0.18 * s, s > 0 ? rot : rot + Math.PI, 0.72); nE++; }
      }
      P.push(a[0], 0, a[1], Math.atan2(-dz, dx)); P.box(M.plinth, 0, len, 0, 0.55, -0.22, 0.22, 'b'); P.pop();
      ph.addBox((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, len + 0.2, 0.3, Math.atan2(-dz, dx), 0, 3.0);
    }
  }
  // gate: two plaster piers carrying gilded eagles at u 221.6 and 228.4 on Nevsky, closed leaves between them, plaster wall pieces
  const gateU0 = 221.6, gateU1 = 228.4, plasterMat = K.mat('#c8ccd6', { name: 'lmE-plasterPier' });
  for (const u of [gateU0, gateU1]) {
    const [x, z] = toWorld(u, 22.0);
    P.box(M.plinth, x - 1.0, x + 1.0, 0, 0.9, z - 1.0, z + 1.0, 'b'); P.box(plasterMat, x - 0.9, x + 0.9, 0.9, 4.4, z - 0.9, z + 0.9, 'b'); P.box(M.whiteShade, x - 1.1, x + 1.1, 4.4, 4.8, z - 1.1, z + 1.1, 'b');
    eagle(K, gold, x, 4.8, z, ROT, 1.15);
    ph.addCylinder(x, z, 1.0, 0, 5);
  }
  { const [xa, za] = toWorld(gateU0 + 0.9, 22.0), [xb, zb] = toWorld(gateU1 - 0.9, 22.0), dx = xb - xa, dz = zb - za, len = Math.hypot(dx, dz), nx = dz / len, nz = -dx / len;
    P.quad(M.pickets, [xa, 0.2, za], [xb, 0.2, zb], [xb, 3.5, zb], [xa, 3.5, za], [nx, 0, nz], [[0, 0], [len / 3, 0], [len / 3, 1.0], [0, 1.0]]);
    P.box(M.fence, (xa + xb) / 2 - 0.08, (xa + xb) / 2 + 0.08, 0.2, 3.6, (za + zb) / 2 - 0.08, (za + zb) / 2 + 0.08, 'b');
    ph.addBox((xa + xb) / 2, (za + zb) / 2, len, 0.3, Math.atan2(-dz, dx), 0, 3.6);
    eagle(K, gold, (xa + xb) / 2, 3.6, (za + zb) / 2, ROT, 0.55); }
  // plastered walls 4 m: pink-grey plaster, white pilaster strips every 4 m, white cornice, grey limestone plinth
  const wallIds = ['w131817484', 'w131817482', 'w131817483', 'w131820046'];
  for (const id of wallIds) {
    const b = BARRIERS.find((q) => q.id === id); if (!b) continue;
    let pts = ringOf(b.pts);
    if (id === 'w131817482') pts = pts.filter((p) => toUV(p[0], p[1]).u < 221.7);          // the straight piece 221.5 -> 228.3 is the gate
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.4) continue;
      const nx = dz / len, nz = -dx / len, n = Math.max(1, Math.round(len / 4));
      P.push(a[0], 0, a[1], Math.atan2(-dz, dx));                      // local +x along the wall, +z = -normal
      const wallMat = K.mat('#d0b8b0', { name: 'lmE-anichWall' });
      // draw the wall centred on the line: faces both sides
      for (const side of [0, 1]) {
        P.push(side ? len : 0, 0, 0, side ? Math.PI : 0);
        K.wallQuad(wallMat, 0, len, 1.0, 3.9, 4, 0.2); P.box(M.plinth, 0, len, 0, 1.0, -0.2, 0.25, 'b');
        for (let k = 0; k <= n; k++) P.box(M.white, Math.max(0, k * len / n - 0.25), Math.min(len, k * len / n + 0.25), 1.0, 3.9, 0.2, 0.32, 'kb');
        P.box(M.white, -0.1, len + 0.1, 3.9, 4.15, -0.25, 0.5, 'kb');
        P.pop();
      }
      P.box(M.white, 0, len, 4.0, 4.15, -0.25, 0.25, 'b');
      P.pop();
      ph.addBox((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, len + 0.2, 0.5, Math.atan2(-dz, dx), 0, 4.2);
    }
  }
  // the lower iron fences at the south end (v ~ 200-212)
  for (const id of ['w830713071', 'w350948211', 'w753246200']) {
    const b = BARRIERS.find((q) => q.id === id); if (!b) continue; const pts = ringOf(b.pts);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], c = pts[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.4) continue; const nx = dz / len, nz = -dx / len;
      P.quad(M.lattice, [a[0], 0.0, a[1]], [c[0], 0.0, c[1]], [c[0], 1.4, c[1]], [a[0], 1.4, a[1]], [nx, 0, nz], [[0, 0], [len / 2.4, 0], [len / 2.4, 1], [0, 1]]);
      ph.addBox((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, len + 0.1, 0.2, Math.atan2(-dz, dx), 0, 1.5);
    }
  }
  K.svc.spots.eagles = nE;
  void BARRIER_NODES;
}
