// landmarksK/palace.js - the forecourt (cour d'honneur) of the Mikhailovsky Palace in frame P (frame.js: u east, v south, P0 = the centre of the main gate): the two-tone granite paving, the two lawns with their clipped
// hedges (OSM w308976598 / 99 + the hedge rings w1229081776 / 77), the central flight of steps with the two white Medici lions on pink granite cheek blocks (OSM lion nodes), the street fence "with three gates"
// (OSM w66875015: black spear panels on a dark granite plinth, a pier every 3.7 m with a gilt flame; the main gate: four massive square piers crowned with bronze trophies, a gilded eagle, the leaves open) and
// the black fence on the garden side (w127674104).  Dossier 9.2, photos refs/saviour 098 099 100 101 103 104 105 107.
import * as THREE from 'three';
import * as L from '../layout.js';
import { BARRIERS, GREEN } from '../data/city.js';
import { PF, P0, ROT_P } from './frame.js';
import * as G from './geo.js';
import { lion, cached, figureMats } from '../lib/figures.js';

const ring = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); if (r.length > 1 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) < 0.05) r.pop(); return r; };
const barrierPts = (id) => { const b = BARRIERS.find((q) => q.id === id); return b ? ring2(b.pts) : null; };
const ring2 = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };

function lionFig() { return cached('lmK-medici', () => lion({ pose: 'stand', ball: true, head: { turn: 0.15, pitch: 0.12, open: 0.0 }, detail: 0.8, mane: 1.0, tail: 'down' })); }

export function palaceCourt(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics;
  P.push(P0.x, 0, P0.z, ROT_P);
  // ---- paving of the forecourt (granite tiles in two tones) + the paved border
  const U0 = -55.0, U1 = 54.6, V0 = -59.3, V1 = -0.4, Y = 0.05;
  P.quad(M.forecourt, [U0, Y, V0], [U1, Y, V0], [U1, Y, V1], [U0, Y, V1], [0, 1, 0], [[U0 / 8, V0 / 8], [U1 / 8, V0 / 8], [U1 / 8, V1 / 8], [U0 / 8, V1 / 8]]);
  P.pop();
  // ---- lawns (world polygons of the OSM grass areas) with a kerb and a clipped hedge round each
  for (const id of ['w308976598', 'w308976599']) {
    const g = GREEN.find((q) => q.id === id); if (!g) continue;
    const r = ring(g.polys[0].o), n = r.length;
    P.cap(M.lawnTop, r, 0.1, true, 4);
    let area = 0; for (let i = 0, j = n - 1; i < n; j = i++) area += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    for (let i = 0; i < n; i++) {
      const a = r[i], b = r[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.3) continue;
      let nx = dz / l, nz = -dx / l; if (area < 0) { nx = -nx; nz = -nz; }
      P.push(a[0], 0, a[1], Math.atan2(-dz, dx));
      // the hedge: a 0.7 m wide, 0.9 m high clipped box on the lawn edge (outer side faces nx, nz)
      const sgn = (nx * -dz + nz * dx) > 0 ? 1 : -1;                          // is the outward normal on the local +z (rot frame: local z = (dz, dx)/l ...)
      void sgn;
      G.tbox(P, M.hedge, 0, l, 0.1, 1.0, -0.35, 0.35, 2, 2, 'b');
      P.pop();
      ph.addBox((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, l, 0.7, Math.atan2(-dz, dx), 0, 1.0);
    }
  }
  // ---- the central flight of steps + cheek blocks + lions + the stele
  P.push(P0.x, 0, P0.z, ROT_P);
  const stairsW = 16.8;
  for (let i = 0; i < 6; i++) {
    const d = 0.45, v1 = -57.9 - i * d, h = 0.17 * (6 - i);
    G.tbox(P, M.pinkPlain, -stairsW / 2, stairsW / 2, 0, h, v1 - d, v1, 3, 3, 'b');
    PF.walk(ph, 0, v1 - d / 2, stairsW, d, 0, h, -1);
  }
  const lionMats = figureMats(K.ctx).keys('marble', 'marble');
  for (const s of [-1, 1]) {
    const cu = s * 11.3, v = -58.6;
    // pink-red granite cheek block 1.7 m high, 6.4 x 4 m
    G.tbox(P, M.pink, cu - 3.2, cu + 3.2, 0, 1.7, -61.0, -56.4, 3.2, 1.4, 'b');
    P.box(M.whiteShade, cu - 3.3, cu + 3.3, 1.7, 1.9, -61.1, -56.3, 'b');
    PF.box(ph, cu, -58.7, 6.4, 4.6, 0, 0, 2.0);
    // a two-step white pedestal with volute ends and the lion on it
    P.box(M.white, cu - 1.1, cu + 1.1, 1.9, 2.25, v - 0.7, v + 0.7, 'b');
    P.box(M.whiteShade, cu - 0.75, cu + 0.75, 2.25, 2.75, v - 0.5, v + 0.5, 'b');
    for (const e of [-1, 1]) { P.cyl(M.white, [cu + e * 0.82, 2.4, v - 0.5], [cu + e * 0.82, 2.4, v + 0.5], 0.17, 0.17, 8, true); }
    lionFig().place(P, lionMats, cu, 2.75, v, s < 0 ? 0.0 : 0.0, 1.05);
  }
  // the stele "Об учреждении Русского музея" at (-1041.7, -621)
  const sp = PF.M(-1041.7, -621.0);
  P.box(M.granite, sp.mx - 0.5, sp.mx + 0.5, 0, 1.6, sp.mz - 0.18, sp.mz + 0.18, 'b'); P.box(M.graniteDark, sp.mx - 0.6, sp.mx + 0.6, 0, 0.25, sp.mz - 0.3, sp.mz + 0.3, 'b');
  P.pop();
  K.svc.palace = { frame: { x: P0.x, z: P0.z, rotY: ROT_P }, gate: { x: P0.x, z: P0.z }, lions: [PF.W(-11.1, -58.6), PF.W(11.5, -58.7)], forecourt: { u: [-55, 54.6], v: [-59.3, -0.4] }, sideGates: [PF.W(-37, 0), PF.W(37, 0)] };
  K.svc.entrances.push({ id: 'museum-gate', x: P0.x, z: P0.z, rotY: Math.atan2(PF.W(0, 1).x - P0.x, PF.W(0, 1).z - P0.z), kind: 'gate', label: 'Русский музей: главные ворота' });
  K.svc.crowd.push({ id: 'museum-queue', kind: 'group', x: PF.W(0, 8).x, z: PF.W(0, 8).z, r: 7, n: 18 });
  { const s = PF.W(0, 30); K.svc.photoSpots.push({ x: s.x, z: s.z, yaw: L.yawToward(s.x, s.z, -1061, -697), pitch: 8, name: 'Михайловский дворец (Русский музей)' }); }
  K.svc.monuments.push({ id: 'n7080782987', name: 'Лев (Михайловский дворец)', x: -1056.4, z: -671.7, h: 3.8 }, { id: 'n10180478942', name: 'Лев (Михайловский дворец)', x: -1078.5, z: -676.7, h: 3.8 });
}

/** the street fence of the palace (frame P, along v = 0) with piers, plinth wall, panels, three gates */
export function palaceFence(K) {
  const P = K.P, M = K.M, ph = K.ctx.physics, step = 3.7;
  P.push(P0.x, 0, P0.z, ROT_P);
  const gates = [{ c: 0, w: 6.4 }, { c: -37, w: 3.6 }, { c: 37, w: 3.6 }];
  const open = (u) => gates.some((g) => Math.abs(u - g.c) < g.w / 2 + 0.05);
  const U0 = -55.2, U1 = 55.2, PH = 1.3, TOP = 4.6;
  // plinth wall segments between the gates
  const cuts = [U0]; for (const g of gates.slice().sort((a, b) => a.c - b.c)) cuts.push(g.c - g.w / 2, g.c + g.w / 2); cuts.push(U1);
  const piers = [];
  for (let i = 0; i + 1 < cuts.length; i += 2) {
    const a = cuts[i], b = cuts[i + 1], L = b - a; if (L < 0.5) continue;
    G.tbox(P, M.graniteDark, a, b, 0, PH, -0.3, 0.3, 3, 1.3, 'b');
    const n = Math.max(1, Math.round(L / step)), s = L / n;
    for (let k = 0; k < n; k++) P.quad(M.rossiFence, [a + k * s + 0.25, PH, 0], [a + (k + 1) * s - 0.25, PH, 0], [a + (k + 1) * s - 0.25, PH + 3.2, 0], [a + k * s + 0.25, PH + 3.2, 0], [0, 0, 1], [[0.0, 0], [1, 0], [1, 1], [0, 1]]);
    P.box(M.iron, a, b, PH + 3.2, PH + 3.28, -0.03, 0.03, 'b');
    for (let k = 0; k <= n; k++) piers.push(a + k * s);
    PF.box(ph, (a + b) / 2, 0, L, 0.6, 0, 0, 2.4);
  }
  for (const u of piers) {
    if (gates.some((g) => Math.abs(u - g.c) < g.w / 2 + 0.3)) continue;
    G.tbox(P, M.graniteDark, u - 0.28, u + 0.28, 0, 3.9, -0.28, 0.28, 3, 1.3, 'b');
    P.box(M.whiteShade, u - 0.34, u + 0.34, 3.9, 4.05, -0.34, 0.34, 'b');
    P.cyl(M.goldFlat, [u, 4.05, 0], [u, 4.5, 0], 0.16, 0.03, 6, false);
    P.cyl(M.goldFlat, [u, 2.9, -0.0], [u, 2.9, 0.06], 0.3, 0.3, 10, true);                  // the gilded medallion ring
  }
  // gate piers: the main gate four massive piers (1.2 m, 4.2 m + trophies), the side gates two each
  const gp = [];
  for (const g of gates) {
    const main = g.c === 0, xs = main ? [-g.w / 2 - 0.6, g.w / 2 + 0.6, -g.w / 2 - 4.4, g.w / 2 + 4.4] : [g.c - g.w / 2 - 0.45, g.c + g.w / 2 + 0.45];
    for (const x of xs) gp.push({ x: main ? x : x, main });
  }
  for (const p of gp) {
    const w = p.main ? 1.2 : 0.8, h = p.main ? 4.6 : 4.2;
    G.tbox(P, M.graniteDark, p.x - w / 2, p.x + w / 2, 0, h, -w / 2, w / 2, 3, 1.3, 'b');
    P.box(M.whiteShade, p.x - w * 0.6, p.x + w * 0.6, h, h + 0.22, -w * 0.6, w * 0.6, 'b');
    P.box(M.graniteDark, p.x - w / 2 - 0.05, p.x + w / 2 + 0.05, 0, 0.5, -w / 2 - 0.05, w / 2 + 0.05, 'b');
    if (p.main) {                                                                           // the bronze trophy of armour: helmet, shields, spears
      const y = h + 0.22;
      P.cyl(M.bronze, [p.x, y, 0], [p.x, y + 0.9, 0], 0.4, 0.28, 8, true); G.ball(P, M.bronze, p.x, y + 1.05, 0, 0.26, 8);
      P.cyl(M.bronze, [p.x - 0.6, y, 0], [p.x - 0.35, y + 1.2, 0], 0.18, 0.04, 6, false); P.cyl(M.bronze, [p.x + 0.6, y, 0], [p.x + 0.35, y + 1.2, 0], 0.18, 0.04, 6, false);
      P.cyl(M.bronze, [p.x, y + 0.5, 0.3], [p.x, y + 0.5, 0.5], 0.45, 0.45, 12, true);
      P.cyl(M.goldFlat, [p.x, 0, 0], [p.x, 0, 0], 0.01, 0.01, 3, false);
    }
    PF.box(ph, p.x, 0, w, w, 0, 0, 4.6);
  }
  // main gate: the leaves stand open (swung back to the inside), a gilded eagle with a medallion on the post at the left of the opening
  for (const s of [-1, 1]) {
    P.push(s * 3.0, 0, 0, 0);
    P.push(0, 0, 0, s * 1.35);
    P.quad(M.rossiFence, [0, 0.4, 0], [-s * 3.0, 0.4, 0], [-s * 3.0, 4.6, 0], [0, 4.6, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    P.pop(); P.pop();
  }
  // ---- the black fence on the garden side (OSM w127674104, world coordinates; plain spear panels on a granite kerb)
  P.pop();
  const pts = barrierPts('w127674104');
  if (pts) for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); if (l < 0.5) continue;
    const n = Math.max(1, Math.round(l / 2.6)), s = l / n;
    P.push(a[0], 0, a[1], Math.atan2(-dz, dx));
    G.tbox(P, M.granite, 0, l, 0, 0.35, -0.18, 0.18, 2, 2, 'b');
    for (let k = 0; k < n; k++) P.quad(M.spears, [k * s + 0.08, 0.35, 0], [(k + 1) * s - 0.08, 0.35, 0], [(k + 1) * s - 0.08, 2.35, 0], [k * s + 0.08, 2.35, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    for (let k = 0; k <= n; k++) P.box(M.gun, k * s - 0.06, k * s + 0.06, 0.35, 2.5, -0.06, 0.06, 'b');
    P.pop();
    ph.addBox(a[0] + dx / 2, a[1] + dz / 2, l, 0.3, Math.atan2(-dz, dx), 0, 2.4);
  }
  void THREE;
}

export function palaceAll(K) { palaceCourt(K); palaceFence(K); }
export const build = palaceAll;
