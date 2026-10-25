// landmarksGarden/fence.js - THE NEVA FENCE of the Summer Garden (Felten / Egorov 1771-84, OSM w197658144, 236.6 m): 36 round pink-grey granite columns (3.66 m + urn = 5 m, ring-handled urns and scroll-handled
// vases alternating) on square rock-faced blocks, a rock-faced plinth wall between them, 32 black wrought-iron panels (verticals every 0.2 m, nine tall bar frames, a row of gilded rosettes in black rings, a gilded
// scroll band along the top rail and gilded spade-tipped spears every 0.4 m) and the three gates (a big central one with the Greek-key lintel and the gilded crest, two small ones), their leaves swung open
// for the walk-in garden.  Then the Moika fence (Charlemagne 1826, OSM w197658145, 129 m, grey cast iron 1.5 m with diamond finials and Medusa-shield posts), its eagle-topped gate columns and the porphyry vase.
// Dossier docs/research/summer-garden.md 3 and 4, photos refs/summer-garden 006 020 030 034 036 040 044 045 172.  Columns / urns / panels / bars / posts are InstancedMeshes (geometry built once).
// Frame: model +x along the fence, +z toward the garden (south-south-east), -z toward the Neva; y = 0 is the pavement.  No flags: the Moika eagles are plain sculpture.
import * as THREE from 'three';
import * as G from './geo.js';
import { partsGeos, addInstanced } from './inst.js';
import { knockBays } from '../lib/fence-bays.js';
import { knockInstances } from '../lib/knock-inst.js';

const meshTris = (meshes) => meshes.reduce((t, m) => t + (m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3) * m.count, 0);
import { NEVA_COLS, NEVA_GATES, NEVA_ROT, NEVA_DIR, MOIKA_PTS, MOIKA_GATES, PORPHYRY_VASE, rotOf } from './frame.js';

const TAU = Math.PI * 2;
const bar = (P, mat, a, b, t = 0.016, seg = 4) => P.cyl(mat, a, b, t, t, seg, false);
const box = (P, mat, x0, x1, y0, y1, z0, z1, skip = '') => P.box(mat, Math.min(x0, x1), Math.max(x0, x1), y0, y1, Math.min(z0, z1), Math.max(z0, z1), skip);
const ring = (P, mat, cx, cy, cz, r, t = 0.015, n = 10, seg = 4, plane = 'xy') => {
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU, p = (a) => (plane === 'xy' ? [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz] : [cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r]);
    P.cyl(mat, p(a0), p(a1), t, t, seg, false);
  }
};
/** a smooth tube along a curve of [x,y,z] points */
function tubeAlong(P, mat, pts, r = 0.015, seg = 4, tub = 14) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
  const g = new THREE.TubeGeometry(curve, tub, r, seg, false);
  P.geo(mat, g); g.dispose();
}
/** a spiral (volute) in the xy plane at depth z: turns around (cx, cy) from radius r0 inward to r1 */
function volute(P, mat, cx, cy, z, r0, r1, a0, dir = 1, turns = 1.4, r = 0.014) {
  const pts = [], n = 16;
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + dir * t * turns * TAU, rr = r0 + (r1 - r0) * t; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z]); }
  tubeAlong(P, mat, pts, r, 4, 20);
}

// ------------------------------------------------------------------------------------------------ one column with its urn (origin = base centre on the pavement, square base aligned with +x)
const URN_A = [[0, 0], [0.22, 0], [0.24, 0.05], [0.18, 0.09], [0.1, 0.14], [0.1, 0.24], [0.2, 0.32], [0.32, 0.46], [0.38, 0.64], [0.36, 0.82], [0.26, 0.98], [0.2, 1.04], [0.26, 1.08], [0.3, 1.12], [0.26, 1.16], [0.14, 1.2], [0.08, 1.26], [0.1, 1.3], [0.07, 1.36], [0, 1.38]];
const URN_B = [[0, 0], [0.24, 0], [0.26, 0.05], [0.12, 0.1], [0.1, 0.22], [0.16, 0.34], [0.3, 0.5], [0.36, 0.68], [0.3, 0.9], [0.18, 1.04], [0.14, 1.14], [0.24, 1.24], [0.36, 1.32], [0.4, 1.38], [0.34, 1.4], [0.14, 1.36], [0, 1.34]];
function columnParts(M, variant) {
  return partsGeos((P) => {
    G.tbox(P, M.graniteRock, -0.72, 0.72, 0, 0.78, -0.72, 0.72, 2, 2, 'b');                       // rock-faced block
    G.tbox(P, M.granite, -0.62, 0.62, 0.78, 0.95, -0.62, 0.62, 1.4, 1.4, 'b');                      // moulded top of the block
    P.cyl(M.granite, [0, 0.95, 0], [0, 1.06, 0], 0.52, 0.5, 16, false);                            // base ring (torus)
    P.cyl(M.granite, [0, 1.06, 0], [0, 3.28, 0], 0.44, 0.37, 16, false);                           // the shaft, slightly tapering
    P.cyl(M.granite, [0, 3.28, 0], [0, 3.4, 0], 0.4, 0.46, 16, false);                             // necking ring
    P.cyl(M.granite, [0, 3.4, 0], [0, 3.5, 0], 0.5, 0.54, 16, false);
    G.tbox(P, M.granite, -0.62, 0.62, 3.5, 3.72, -0.62, 0.62, 1.4, 1.4, '');                        // abacus
    G.lathe(P, M.granite, 'urn' + variant, variant === 'A' ? URN_A : URN_B, 0, 3.72, 0, 1, 1, 16, variant === 'A' ? 22 : 18);
    if (variant === 'A') {                                                                         // two short ring handles on the belly
      for (const s of [-1, 1]) { const g = new THREE.TorusGeometry(0.07, 0.016, 4, 8); P.geo(M.granite, g, s * 0.4, 3.72 + 0.66, 0, 0, Math.PI / 2, 0); g.dispose(); }
    } else {                                                                                       // two S-scroll handles on the flared neck
      for (const s of [-1, 1]) tubeAlong(P, M.granite, [[s * 0.2, 3.72 + 1.02, 0], [s * 0.34, 3.72 + 1.04, 0], [s * 0.44, 3.72 + 0.86, 0], [s * 0.36, 3.72 + 0.74, 0], [s * 0.3, 3.72 + 0.8, 0]], 0.022, 4, 12);
    }
  });
}

// ------------------------------------------------------------------------------------------------ one panel between two columns (nominal clear width 5.8 m; the instance is scaled in x)
const PANEL_W = 5.8;
function panelParts(M) {
  return partsGeos((P) => {
    const hw = PANEL_W / 2, y0 = 1.0, yTop = 3.3, ironM = M.iron, T = 0.024;
    const vb = (x, ya, yb, th = T) => P.box(ironM, x - th / 2, x + th / 2, ya, yb, -th / 2, th / 2, 'bt');                 // vertical bar (4 faces)
    const hb = (xa, xb, y, th = 0.028) => P.box(ironM, xa, xb, y - th / 2, y + th / 2, -th / 2, th / 2, 'lr');           // horizontal bar
    P.box(ironM, -hw, hw, y0, y0 + 0.1, -0.03, 0.03, 'lr'); P.box(ironM, -hw, hw, yTop - 0.08, yTop + 0.02, -0.03, 0.03, 'lr');   // bottom and top rail
    hb(-hw, hw, 2.1, 0.03);                                                                                           // mid bar through the rosettes
    // nine groups: a tall bar frame, full-height bars at its edges and in the gaps
    const pitch = PANEL_W / 9, fw = 0.19;
    for (let i = 0; i < 9; i++) {
      const cx = -hw + pitch * (i + 0.5);
      vb(cx - fw, y0 + 0.1, yTop - 0.08); vb(cx + fw, y0 + 0.1, yTop - 0.08);
      hb(cx - fw, cx + fw, 1.5); hb(cx - fw, cx + fw, 3.0);
      vb(cx - fw - 0.07, 1.5, 3.0, 0.02); vb(cx + fw + 0.07, 1.5, 3.0, 0.02);                                         // the inner paired bars
      if (i < 8) vb(cx + pitch / 2, y0 + 0.1, yTop - 0.08);                                                            // bar in the gap
      ring(P, ironM, cx, 2.1, 0, 0.115, 0.014, 8, 3, 'xy');                                                            // the rosette: a black ring with a gilded twisted disc
      P.cyl(M.gold, [cx, 2.1, -0.025], [cx, 2.1, 0.025], 0.085, 0.085, 8, true);
      P.cyl(M.goldBright, [cx, 2.1, 0.025], [cx, 2.1, 0.05], 0.05, 0.012, 6, false); P.cyl(M.goldBright, [cx, 2.1, -0.025], [cx, 2.1, -0.05], 0.05, 0.012, 6, false);
    }
    vb(-hw + T / 2, y0 + 0.1, yTop - 0.08); vb(hw - T / 2, y0 + 0.1, yTop - 0.08);
    // gilded scroll band along the top rail (an alpha cut-out, both faces)
    P.quad(M.scroll, [-hw, yTop + 0.02, 0], [hw, yTop + 0.02, 0], [hw, yTop + 0.3, 0], [-hw, yTop + 0.3, 0], [0, 0, 1], [[0, 0], [2.4, 0], [2.4, 1], [0, 1]]);
    // spears every 0.4 m: a black shaft, a gilded spade, a small knob
    for (let k = 0; k < 15; k++) {
      const x = -hw + 0.2 + k * 0.4;
      bar(P, ironM, [x, yTop, 0], [x, yTop + 0.5, 0], 0.011, 4);
      P.cyl(M.gold, [x, yTop + 0.36, 0], [x, yTop + 0.48, 0], 0.012, 0.04, 4, false);
      P.cyl(M.gold, [x, yTop + 0.48, 0], [x, yTop + 0.68, 0], 0.04, 0.0, 4, false);
      P.cyl(M.gold, [x, yTop + 0.1, 0], [x, yTop + 0.15, 0], 0.026, 0.026, 5, false);
    }
    for (let k = 0; k < 9; k++) { const x = -hw + pitch * (k + 0.5); P.cyl(ironM, [x, y0 - 0.02, 0], [x, y0 - 0.2, 0], 0.03, 0.0, 4, false); }   // fleur-de-lis spikes at the foot
  });
}

// ------------------------------------------------------------------------------------------------ the gates
/** a gate leaf (hinge at x = 0, free edge at x = w, mirrored when dir = -1), y from 0.1 to 3.4 */
function leaf(P, M, w, dir) {
  const X = (x) => x * dir, I = M.iron, t = 0.03;
  const vb = (x, ya, yb, th = t) => box(P, I, X(x) - th / 2, X(x) + th / 2, ya, yb, -th / 2, th / 2);
  const hb = (xa, xb, y, th = t) => box(P, I, X(xa), X(xb), y - th / 2, y + th / 2, -th / 2, th / 2);
  const dg = (xa, ya, xb, yb, th = 0.013) => bar(P, I, [X(xa), ya, 0], [X(xb), yb, 0], th, 4);
  vb(0.04, 0.1, 3.4, 0.05); vb(w - 0.04, 0.1, 3.4, 0.05);                                           // outer verticals
  hb(0, w, 3.36, 0.05); hb(0, w, 0.12, 0.05); hb(0, w, 1.0, 0.04);                                 // top, bottom and the mid rail
  dg(0.06, 0.14, w - 0.06, 0.98); dg(w - 0.06, 0.14, 0.06, 0.98);                                    // the X in the lowest 0.9 m
  // the tall rectangular frame with its stepped pedestal
  const fx0 = 0.32, fx1 = w - 0.32;
  vb(fx0, 1.0, 3.15); vb(fx1, 1.0, 3.15); hb(fx0, fx1, 3.15); hb(fx0, fx1, 1.45);
  const px0 = 0.62, px1 = w - 0.62;
  vb(px0, 1.45, 2.55); vb(px1, 1.45, 2.55); hb(px0, px1, 2.55); hb(px0 + 0.1, px1 - 0.1, 2.35); vb(px0 + 0.1, 1.55, 2.35, 0.02); vb(px1 - 0.1, 1.55, 2.35, 0.02);
  dg(fx0, 1.45, px0, 1.75); dg(fx1, 1.45, px1, 1.75); dg(fx0, 3.15, px0, 2.75); dg(fx1, 3.15, px1, 2.75);
  const cx = w / 2;
  // tall oval in the pedestal, a big gilded rosette in its ring at the bottom
  ring(P, I, X(cx), 1.7, 0, 0.3, 0.018, 14, 4, 'xy');
  P.cyl(M.gold, [X(cx), 1.7, -0.03], [X(cx), 1.7, 0.03], 0.21, 0.21, 12, true); P.cyl(M.goldBright, [X(cx), 1.7, 0.03], [X(cx), 1.7, 0.07], 0.14, 0.02, 10, true); P.cyl(M.goldBright, [X(cx), 1.7, -0.03], [X(cx), 1.7, -0.07], 0.14, 0.02, 10, true);
  hb(px0 + 0.1, px1 - 0.1, 2.0); vb(cx - 0.12, 2.0, 2.35, 0.02); vb(cx + 0.12, 2.0, 2.35, 0.02);
  // basket of gilded flowers on the pedestal
  box(P, I, X(cx) - 0.2, X(cx) + 0.2, 2.55, 2.62, -0.05, 0.05); box(P, I, X(cx) - 0.14, X(cx) + 0.14, 2.62, 2.7, -0.04, 0.04);
  P.cyl(M.gold, [X(cx), 2.7, 0], [X(cx), 2.9, 0], 0.1, 0.22, 10, false);
  for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.42; P.cyl(M.gold, [X(cx) + Math.sin(a) * 0.05, 2.9, 0], [X(cx) + Math.sin(a) * 0.3, 2.9 + Math.cos(a) * 0.2, 0], 0.035, 0.0, 4, false); }
  // small circles at the frame corners
  for (const [x, y] of [[0.17, 3.0], [w - 0.17, 3.0], [0.17, 1.3], [w - 0.17, 1.3], [0.17, 2.1], [w - 0.17, 2.1]]) ring(P, I, X(x), y, 0, 0.075, 0.012, 8, 4, 'xy');
}
/** the fixed head of a gate between two columns: lintel with the gilded Greek key, the crest of volutes, rosettes and the acanthus plume; clear = width between the column shafts */
function gateHead(P, M, clear, crestK) {
  const hw = clear / 2, I = M.iron;
  box(P, I, -hw, hw, 3.3, 3.4, -0.04, 0.04);
  P.quad(M.meander, [-hw, 3.4, 0.05], [hw, 3.4, 0.05], [hw, 3.72, 0.05], [-hw, 3.72, 0.05], [0, 0, 1], [[0, 0], [clear / 0.75, 0], [clear / 0.75, 1], [0, 1]]);
  P.quad(M.meander, [hw, 3.4, -0.05], [-hw, 3.4, -0.05], [-hw, 3.72, -0.05], [hw, 3.72, -0.05], [0, 0, -1], [[0, 0], [clear / 0.75, 0], [clear / 0.75, 1], [0, 1]]);
  box(P, I, -hw, hw, 3.72, 3.78, -0.04, 0.04);
  box(P, I, -hw, hw, 3.4, 3.72, -0.035, 0.035, 'fk');
  P.quad(M.scroll, [-hw, 3.78, 0], [hw, 3.78, 0], [hw, 4.0, 0], [-hw, 4.0, 0], [0, 0, 1], [[0, 0], [clear / 0.45, 0], [clear / 0.45, 1], [0, 1]]);
  const k = crestK, zc = 0;
  P.push(0, 0, 0, 0);
  for (const s of [-1, 1]) {
    volute(P, I, s * 0.95 * k, 4.42, zc, 0.52 * k, 0.1 * k, s > 0 ? Math.PI * 0.65 : Math.PI * 0.35, s > 0 ? 1 : -1, 1.5);
    P.cyl(M.gold, [s * 0.95 * k, 4.42, -0.02], [s * 0.95 * k, 4.42, 0.02], 0.15, 0.15, 10, true); P.cyl(M.goldBright, [s * 0.95 * k, 4.42, 0.02], [s * 0.95 * k, 4.42, 0.06], 0.09, 0.01, 8, true); P.cyl(M.goldBright, [s * 0.95 * k, 4.42, -0.02], [s * 0.95 * k, 4.42, -0.06], 0.09, 0.01, 8, true);
    tubeAlong(P, I, [[s * 1.6 * k, 3.98, zc], [s * 1.95 * k, 4.3, zc], [s * 1.8 * k, 4.62, zc], [s * 1.5 * k, 4.62, zc], [s * 1.42 * k, 4.48, zc]], 0.013, 4, 14);
    tubeAlong(P, M.gold, [[s * 0.15, 4.02, zc], [s * 0.45 * k, 4.12, zc], [s * 0.78 * k, 3.98, zc], [s * 1.05 * k, 4.0, zc]], 0.016, 4, 12);              // the gilded S-leaf below the volute
    tubeAlong(P, I, [[s * 0.25 * k, 4.9, zc], [s * 0.6 * k, 4.95, zc], [s * 0.9 * k, 4.78, zc], [s * 1.0 * k, 4.62, zc]], 0.012, 4, 10);
  }
  bar(P, I, [0, 3.98, 0], [0, 4.9, 0], 0.025, 5);                                                                                                  // the stem of the plume
  for (let i = -3; i <= 3; i++) { const a = i * 0.3, h = 0.55 + 0.25 * Math.cos(a * 1.4); P.cyl(M.gold, [0, 4.62, 0], [Math.sin(a) * 0.42 * k, 4.62 + Math.cos(a) * h * k, 0], 0.07 * k, 0.0, 4, false); }
  P.cyl(M.goldBright, [0, 4.62, 0], [0, 5.25 * 1.0 + 0.0, 0], 0.09, 0.0, 4, false);
  P.pop();
}
function gateGeo(K, g, c0, c1, opts = {}) {
  const { M, P, ctx } = K, ph = ctx.physics;
  const dx = c1[0] - c0[0], dz = c1[1] - c0[1], len = Math.hypot(dx, dz), mx = (c0[0] + c1[0]) / 2, mz = (c0[1] + c1[1]) / 2, rot = NEVA_ROT;
  const clear = len - 0.9, wl = clear / 2, crestK = Math.min(1.1, clear / 5.4);
  P.push(mx, 0, mz, rot);
  gateHead(P, M, clear, crestK);
  const open = opts.open ?? -80 * Math.PI / 180;
  for (const s of [-1, 1]) {                                                                         // leaves swung into the garden, hinged on the column shafts
    P.push(s * clear / 2, 0, 0, s < 0 ? open : -open);
    leaf(P, M, wl, s < 0 ? 1 : -1);
    P.pop();
  }
  G.tbox(P, M.graniteRock, -len / 2 + 0.7, len / 2 - 0.7, 0, 0.05, -0.55, 0.55, 2, 2, 'b');            // granite threshold
  P.pop();
  // collider: the open leaves are thin walls reaching into the garden (model +z = (sin rot, cos rot) in the world)
  const tz = [Math.sin(rot), Math.cos(rot)], leafLen = wl * Math.sin(Math.abs(open));
  for (const s of [-1, 1]) {
    const hx = mx + NEVA_DIR[0] * s * clear / 2, hz = mz + NEVA_DIR[1] * s * clear / 2;
    ph.addBox(hx + tz[0] * leafLen / 2, hz + tz[1] * leafLen / 2, 0.12, leafLen, rot, 0, 3.6);
  }
  K.svc.entrances.push({ id: g.id, x: mx, z: mz, rotY: rot + Math.PI, kind: 'gate', label: g.kind === 'big' ? 'Главные ворота Летнего сада' : 'Ворота Летнего сада', width: clear });
}

// ------------------------------------------------------------------------------------------------ the Neva fence
function nevaFence(K) {
  const { ctx, M, P, root } = K, ph = ctx.physics;
  const cols = NEVA_COLS, rot = NEVA_ROT, gateAt = new Map(NEVA_GATES.map((g) => [g.a, g]));
  void P; void root;
  // WATER IS REACHABLE (docs/AREAS.md 13.7): the fence breaks. Every column is a knock record (a granite column with its urn, 45 km/h), every span between two columns is a BREAKABLE BAY (the iron panel, the plinth wall and a box collider;
  // lib/fence-bays.js: a car at 28 km/h breaks it off and the way to the Neva embankment is open). The gates keep their drawing and their open leaves.
  const pa = columnParts(M, 'A'), pb = columnParts(M, 'B'), pp = panelParts(M);
  const colItems = cols.map((c) => ph.addCylinder(c[0], c[1], 0.8, 0, 5.2));
  const colSpots = cols.map((c, i) => ({ x: c[0], y: 0, z: c[1], rotY: rot, v: i % 2 }));
  const cutout = (m) => M.cutouts.has(m);
  const colParts = [];
  for (const [vv, list] of [[0, pa.list], [1, pb.list]]) list.forEach((q, k) => colParts.push({ geo: q.geo, mat: q.mat, name: 'col' + vv + '-' + k, noOutline: cutout(q.mat), far: 450, when: (sp) => sp.v === vv }));
  const rc = knockInstances(ctx, { name: 'lmGd-neva-cols', parts: colParts, spots: colSpots, items: (i) => colItems[i], far: 450,
    rec: { kind: 'column', mass: 1800, h: 5.0, r: 0.8, anchored: 45, hitK: 1.0, metal: false } });
  const bays = [];
  for (let i = 0; i + 1 < cols.length; i++) {
    if (gateAt.get(i)) { gateGeo(K, gateAt.get(i), cols[i], cols[i + 1]); continue; }
    const c0 = cols[i], c1 = cols[i + 1];
    bays.push({ x0: c0[0], z0: c0[1], x1: c1[0], z1: c1[1], y: 0, len: Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) });
  }
  const L0 = bays.reduce((t, q) => t + q.len, 0) / Math.max(1, bays.length);            // the plinth template is drawn for the mean length and stretched to each bay
  const plinth = partsGeos((Q) => {
    G.tbox(Q, M.graniteRock, 0.7, L0 - 0.7, 0, 0.95, -0.3, 0.3, 2, 2, 'b');
    G.tbox(Q, M.granite, 0.7, L0 - 0.7, 0.95, 1.0, -0.34, 0.34, 1.5, 1.5, 'b');
  });
  const parts = [];
  pp.list.forEach((q, k) => parts.push({ geo: q.geo, mat: q.mat, name: 'panel-' + k, noOutline: cutout(q.mat), far: 450, at: 'mid', sx: (bb) => (bb.len - 0.9) / PANEL_W }));
  plinth.list.forEach((q, k) => parts.push({ geo: q.geo, mat: q.mat, name: 'plinth-' + k, far: 450, stretch: true, sx: 1 / L0 }));
  const rb = knockBays(ctx, { name: 'lmGd-neva-span', bays, parts, far: 450,
    collider: () => ({ y0: 0, y1: 4.0, thick: 0.6, e0: -0.6, e1: -0.6 }),
    rec: () => ({ kind: 'fence', mass: 1200, h: 3.6, r: 0.25, anchored: 28, hitK: 0.8, metal: true, minDv: 0 }) });
  const tris = meshTris(rc.meshes) + meshTris(rb.meshes);
  K.extraTris += tris;
  K.svc.neva = { columns: cols.length, panels: bays.length, gates: NEVA_GATES.length, tris, perInstance: { span: Math.round(tris / Math.max(1, bays.length)) } };
}

// ------------------------------------------------------------------------------------------------ the Moika fence
function eagleColumn(P, M, x, z, rotY) {
  P.push(x, 0, z, rotY);
  G.tbox(P, M.graniteGrey, -0.5, 0.5, 0, 0.7, -0.5, 0.5, 2, 2, 'b');
  G.tbox(P, M.granite, -0.4, 0.4, 0.7, 0.85, -0.4, 0.4, 1.5, 1.5, 'b');
  P.cyl(M.ironGrey, [0, 0.85, 0], [0, 2.95, 0], 0.3, 0.26, 20, false);
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; bar(P, M.iron, [Math.cos(a) * 0.3, 0.9, Math.sin(a) * 0.3], [Math.cos(a) * 0.26, 2.0, Math.sin(a) * 0.26], 0.012, 3); }      // the flutes of the lower two thirds
  P.cyl(M.ironGrey, [0, 2.95, 0], [0, 3.1, 0], 0.3, 0.38, 20, false);
  G.tbox(P, M.ironGrey, -0.42, 0.42, 3.1, 3.22, -0.42, 0.42, 1, 1, '');
  // the crowned double-headed eagle, wings spread across the gate line (model +x)
  const b = M.iron, gd = M.gold;
  const sph = (x0, y0, z0, sx, sy, sz, m = b, ws = 8) => { const g = new THREE.SphereGeometry(1, ws, 6); P.geo(m, g, x0, y0, z0, 0, 0, 0, sx, sy, sz); g.dispose(); };
  sph(0, 3.55, 0, 0.17, 0.3, 0.12);                                                                  // body
  for (const s of [-1, 1]) {
    sph(s * 0.14, 3.88, 0, 0.065, 0.075, 0.06);                                                      // two heads
    P.cyl(gd, [s * 0.19, 3.9, 0], [s * 0.32, 3.86, 0], 0.025, 0.0, 4, false);                       // beaks
    P.cyl(b, [s * 0.05, 3.7, 0], [s * 0.14, 3.86, 0], 0.045, 0.04, 5, false);                       // necks
    for (let k = 0; k < 5; k++) { const a = 0.55 - k * 0.3, L = 0.62 - k * 0.04; P.cyl(b, [s * 0.14, 3.62 - k * 0.02, 0], [s * (0.14 + Math.cos(a) * L), 3.62 + Math.sin(a) * L, 0], 0.05, 0.0, 4, false); }   // the primaries of a spread wing
    P.cyl(b, [s * 0.1, 3.4, 0], [s * 0.2, 3.3, 0], 0.03, 0.02, 4, false);
  }
  P.cyl(b, [0, 3.3, 0], [0, 3.1, 0], 0.1, 0.12, 6, false);                                           // tail
  P.cyl(gd, [0, 4.02, 0], [0, 4.14, 0], 0.07, 0.1, 6, false); P.cyl(gd, [0, 4.14, 0], [0, 4.2, 0], 0.1, 0.0, 6, false);              // the crown
  P.pop();
}
function moikaFence(K) {
  const { ctx, M, P, root } = K, ph = ctx.physics;
  const pts = MOIKA_PTS, cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const at = (s) => { let i = 0; while (i + 2 < pts.length && cum[i + 1] < s) i++; const t = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1); return { x: pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, z: pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t, dx: pts[i + 1][0] - pts[i][0], dz: pts[i + 1][1] - pts[i][1] }; };
  const sOf = (g) => { let best = 1e9, bs = 0; for (let i = 0; i + 1 < pts.length; i++) { const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((g.x - a[0]) * dx + (g.z - a[1]) * dz) / l2)), d = Math.hypot(g.x - a[0] - dx * t, g.z - a[1] - dz * t); if (d < best) { best = d; bs = cum[i] + t * Math.sqrt(l2); } } return bs; };
  // gate intervals along the line [s - half, s + half]; the end gates are shut leaves between their columns, the main one stands open
  const gates = MOIKA_GATES.map((g) => ({ ...g, s: Math.min(total - 2.2, Math.max(2.2, sOf(g))), half: g.half ?? 2.1 }));
  const inGate = (s) => gates.some((g) => s > g.s - g.half && s < g.s + g.half);
  // bars every 0.35 m
  const barsP = partsGeos((Q) => {
    bar(Q, M.ironGrey, [0, 0.5, 0], [0, 1.42, 0], 0.014, 5);
    Q.cyl(M.ironGrey, [0, 0.42, 0], [0, 0.55, 0], 0.0, 0.024, 4, false);
    Q.cyl(M.ironGrey, [0, 1.42, 0], [0, 1.5, 0], 0.012, 0.04, 4, false); Q.cyl(M.ironGrey, [0, 1.5, 0], [0, 1.62, 0], 0.04, 0.0, 4, false);   // the diamond finial
  });
  const postP = partsGeos((Q) => {                                                                    // the fasces post: a reeded shaft, a Medusa shield, two crossed swords, an axe-head finial
    Q.box(M.graniteGrey, -0.15, 0.15, 0, 0.5, -0.15, 0.15, 'b');
    Q.cyl(M.ironGrey, [0, 0.5, 0], [0, 1.62, 0], 0.085, 0.075, 8, false);
    Q.cyl(M.ironGrey, [0, 0.9, 0], [0, 0.92, 0], 0.12, 0.12, 8, true); Q.cyl(M.ironGrey, [0, 1.42, 0], [0, 1.45, 0], 0.11, 0.11, 8, true);
    for (const z of [-1, 1]) {
      Q.cyl(M.ironGrey, [0, 1.12, z * 0.085], [0, 1.12, z * 0.115], 0.22, 0.22, 12, true);               // the Medusa medallion on both faces
      Q.cyl(M.graniteDark, [0, 1.12, z * 0.115], [0, 1.12, z * 0.14], 0.14, 0.1, 10, true);
      for (const a of [0.8, -0.8]) bar(Q, M.iron, [-Math.sin(a) * 0.25, 1.12 - Math.cos(a) * 0.25, z * 0.12], [Math.sin(a) * 0.25, 1.12 + Math.cos(a) * 0.25, z * 0.12], 0.012, 3);  // crossed swords
    }
    Q.box(M.ironGrey, -0.012, 0.012, 1.62, 1.84, -0.1, 0.1, '');                                       // the axe head
    Q.cyl(M.ironGrey, [0, 1.62, 0], [0, 1.9, 0], 0.016, 0.0, 4, false);
  });
  // WATER IS REACHABLE (docs/AREAS.md 13.7): the fence breaks. A BAY is a run piece of about 3 m: the limestone plinth with its two rails, the bars (every 0.35 m) and the fasces posts (every 4 m) that stand on it, a box collider
  // (lib/fence-bays.js, a car at 18 km/h breaks it off); the gates (eagle columns, leaves) keep their drawing.
  const runs = []; let a = 0;
  for (const g of gates.slice().sort((p1, p2) => p1.s - p2.s)) { if (g.s - g.half > a + 0.5) runs.push([a, g.s - g.half]); a = g.s + g.half; }
  if (total > a + 0.5) runs.push([a, total]);
  const bays = [];
  for (const [s0, s1] of runs) {
    const n = Math.max(1, Math.ceil((s1 - s0) / 3));
    for (let k = 0; k < n; k++) {
      const sa = s0 + (s1 - s0) * k / n, sb = s0 + (s1 - s0) * (k + 1) / n, A = at(sa), Bq = at(sb), len = Math.hypot(Bq.x - A.x, Bq.z - A.z);
      const cnt = Math.max(1, Math.floor(len / 0.35));
      bays.push({ x0: A.x, z0: A.z, x1: Bq.x, z1: Bq.z, y: 0, len, sa, sb, barAts: Array.from({ length: cnt }, (_, j) => (j + 0.5) / cnt), postAts: [] });
    }
  }
  let nextPost = 2.0, posts = 0;
  for (let s = 0; s <= total + 0.01; s += 0.5) {
    if (s < nextPost - 0.01) continue; nextPost += 4.0; if (inGate(s)) continue;
    const bay = bays.find((q) => s >= q.sa - 1e-6 && s <= q.sb + 1e-6); if (bay) { bay.postAts.push(Math.max(0, Math.min(1, (s - bay.sa) / ((bay.sb - bay.sa) || 1)))); posts++; }
  }
  const railG = partsGeos((Q) => {
    G.tbox(Q, M.graniteGrey, 0, 1, 0, 0.45, -0.17, 0.17, 2, 2, 'b');
    bar(Q, M.ironGrey, [0, 1.46, 0], [1, 1.46, 0], 0.022, 4); bar(Q, M.ironGrey, [0, 0.58, 0], [1, 0.58, 0], 0.02, 4);
  });
  const parts = [];
  railG.list.forEach((q, k) => parts.push({ geo: q.geo, mat: q.mat, name: 'rail-' + k, far: 420, stretch: true }));
  barsP.list.forEach((q, k) => parts.push({ geo: q.geo, mat: q.mat, name: 'bar-' + k, far: 300, ats: (bb) => bb.barAts }));
  postP.list.forEach((q, k) => parts.push({ geo: q.geo, mat: q.mat, name: 'post-' + k, far: 420, ats: (bb) => bb.postAts, when: (bb) => bb.postAts.length > 0 }));
  const rb = knockBays(ctx, { name: 'lmGd-moika', bays, parts, far: 420,
    collider: () => ({ y0: 0, y1: 1.7, thick: 0.45, e0: 0, e1: 0 }),
    rec: () => ({ kind: 'fence', mass: 500, h: 1.6, r: 0.15, anchored: 18, hitK: 0.4, metal: true, minDv: 0 }) });
  K.extraTris += meshTris(rb.meshes);
  const mb = { length: bays.reduce((t, q) => t + q.barAts.length, 0) }, mp = { length: posts };
  // gates: eagle columns at both sides of each opening, leaves (shut for the end gates, open for the main entrance)
  for (const g of gates) {
    const A = at(g.s - g.half), B = at(g.s + g.half), C = at(g.s), r = rotOf(C.dx, C.dz);
    eagleColumn(P, M, A.x, A.z, r); eagleColumn(P, M, B.x, B.z, r);
    ph.addCylinder(A.x, A.z, 0.6, 0, 4.2); ph.addCylinder(B.x, B.z, 0.6, 0, 4.2);
    const w = g.half * 2 - 1.0;
    const leaves = (Q) => {                                                                                            // the two leaves (open ones swing into the garden)
      for (const sdir of [-1, 1]) {
        Q.push(sdir * (w / 2), 0, 0, g.open ? (sdir < 0 ? -1.4 : 1.4) : 0);
        const lw = w / 2, dir = sdir < 0 ? 1 : -1;
        for (let k = 0; k <= Math.round(lw / 0.18); k++) { const x = dir * k * 0.18; bar(Q, M.ironGrey, [x, 0.1, 0], [x, 1.55, 0], 0.014, 4); }
        box(Q, M.ironGrey, 0, dir * lw, 0.1, 0.18, -0.03, 0.03); box(Q, M.ironGrey, 0, dir * lw, 1.5, 1.58, -0.03, 0.03); box(Q, M.ironGrey, 0, dir * lw, 0.8, 0.85, -0.02, 0.02);
        Q.pop();
      }
    };
    P.push(C.x, 0, C.z, r);
    G.tbox(P, M.graniteGrey, -g.half, g.half, 0, 0.04, -0.4, 0.4, 2, 2, 'b');
    if (g.open) leaves(P);
    P.pop();
    if (!g.open) {                                                                                                     // a SHUT gate is a breakable bay (docs/AREAS.md 13.7): both leaves as one instance, a thin collider (a car at 16 km/h breaks it)
      const lg = partsGeos(leaves);
      knockBays(ctx, { name: 'lmGd-moika-gate', bays: [{ x0: A.x, z0: A.z, x1: B.x, z1: B.z, y: 0 }], far: 420,
        parts: lg.list.map((q, i) => ({ geo: q.geo, mat: q.mat, name: 'leaf' + i, far: 420, at: 'mid', noOutline: M.cutouts && M.cutouts.has(q.mat) })),
        collider: () => ({ y0: 0, y1: 1.7, thick: 0.3, e0: -0.5, e1: -0.5 }),
        rec: () => ({ kind: 'fence', mass: 160, h: 1.6, r: 0.08, anchored: 16, hitK: 0.3, metal: true, minDv: 0 }) });
    }
    K.svc.entrances.push({ id: g.id, x: C.x, z: C.z, rotY: r + Math.PI / 2, kind: 'gate', label: g.open ? 'Вход в Летний сад со стороны Мойки' : 'Ворота Летнего сада (Мойка)', width: g.half * 2 - 1, open: !!g.open });
  }
  K.svc.moika = { bars: mb.length, posts: mp.length };
}

// ------------------------------------------------------------------------------------------------ the porphyry (Elfdalen) vase between the eagle columns and the Carp pond
const VASE = [[0, 0], [0.26, 0], [0.28, 0.05], [0.16, 0.12], [0.14, 0.3], [0.3, 0.55], [0.5, 0.95], [0.56, 1.25], [0.5, 1.55], [0.36, 1.75], [0.3, 1.8], [0.4, 1.86], [0.44, 1.92], [0.3, 1.96], [0.08, 1.98], [0, 2.0]];
function vase(K) {
  const { M, P, ctx } = K, { x, z } = PORPHYRY_VASE;
  G.tbox(P, M.porphyryPlinth, x - 1.2, x + 1.2, 0, 0.3, z - 1.2, z + 1.2, 2, 2, 'b');
  G.tbox(P, M.porphyryPlinth, x - 0.95, x + 0.95, 0.3, 0.6, z - 0.95, z + 0.95, 2, 2, 'b');
  G.tbox(P, M.pedestalPlain, x - 0.7, x + 0.7, 0.6, 1.5, z - 0.7, z + 0.7, 2, 2, 'b');
  G.tbox(P, M.porphyryPlinth, x - 0.8, x + 0.8, 1.5, 1.62, z - 0.8, z + 0.8, 2, 2, 'b');
  G.lathe(P, M.porphyry, 'porphyryVase', VASE, x, 1.62, z, 1.0, 1.0, 20, 16);
  for (const s of [-1, 1]) tubeAlong(P, M.porphyry, [[x + s * 0.5, 1.62 + 1.55, z], [x + s * 0.68, 1.62 + 1.52, z], [x + s * 0.7, 1.62 + 1.2, z], [x + s * 0.58, 1.62 + 1.0, z]], 0.05, 5, 12);
  ctx.physics.addCylinder(x, z, 1.25, 0, 3.7);
  K.svc.monuments.push({ id: 'n1948007159', name: 'Порфировая ваза', x, z, h: 3.7 });
}

export function build(K) {
  for (const [name, fn] of [['neva', nevaFence], ['moika', moikaFence], ['vase', vase]]) {
    try { fn(K); } catch (e) { console.error(`[landmarksGarden] fence/${name}:`, e); throw e; }
  }
  K.svc.photoSpots.push({ x: -940, z: -1700, yaw: 155, pitch: 8, name: 'Невская ограда Летнего сада' });
  K.svc.photoSpots.push({ x: -975, z: -1650, yaw: 205, pitch: 8, name: 'Главные ворота Летнего сада' });
  // people: the queue inside the central gate (security booth), photographers on the embankment in front of it, a few at the small gates
  const gx = -967.7, gz = -1639.2, n = [0.4153, 0.9097];
  K.svc.crowd.push({ x: gx + n[0] * 5, z: gz + n[1] * 5, r: 5, n: 10, kind: 'queue' }, { x: gx - n[0] * 5, z: gz - n[1] * 5, r: 4, n: 7, kind: 'photo' },
    { x: -1010 + n[0] * 4, z: -1620 + n[1] * 4, r: 3, n: 3, kind: 'gate' }, { x: -925 + n[0] * 4, z: -1658 + n[1] * 4, r: 3, n: 3, kind: 'gate' });
  K.svc.fences.push({ id: 'neva-fence', pts: NEVA_COLS.map((c) => [c[0], c[1]]), h: 5.0, gates: NEVA_GATES.map((g) => g.id) }, { id: 'moika-fence', pts: MOIKA_PTS.map((c) => [c[0], c[1]]), h: 1.6, gates: MOIKA_GATES.map((g) => g.id) });
}
