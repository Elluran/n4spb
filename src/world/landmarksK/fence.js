// landmarksK/fence.js - the Winkler fence of the Mikhailovsky Garden round the church (A. Parland, Karl Vinkler factory 1903-07; 257 m, OSM w127645397 / 95 / 99 and the sacristy yard w588807856): a pink granite
// plinth wall, wrought-iron panels 3.74 m wide with giant S-scrolls and rosettes (one alpha-cut quad per bay), a pier every 3.74 m (round ochre-brick drum on a pink pedestal and a white torus base, a marble bell
// capital, a cornice ring and a grey bell cap; ~100 instanced piers), the gate on the church axis (two square ochre piers with majolica tiles and trident lamps, the leaves open), the inner black spear fence
// (w102265046, 1.3 m, on a kerb) and the queue fences at the N porch (w1164101336 / 37).  Dossier 5.1, photos refs/saviour 004 051 052 053 055 048 049.
import * as THREE from 'three';
import { BARRIERS, BARRIER_NODES } from '../data/city.js';
import { Parts } from './kit.js';
import * as G from './geo.js';

const polyline = (id) => { const b = BARRIERS.find((q) => q.id === id); if (!b) return null; const r = []; for (let i = 0; i < b.pts.length; i += 2) r.push([b.pts[i], b.pts[i + 1]]); return r; };
const PIER_H = 4.8, PANEL_Y0 = 0.9, PANEL_H = 3.5, PLINTH_H = 0.9;

/** the geometry of one Winkler pier (base at y = 0) as { mat, geo } buckets, instanced by the caller */
function pierModel(M) {
  const P = new Parts();
  P.box(M.pink, -0.5, 0.5, 0, 1.0, -0.5, 0.5, 'b');
  P.box(M.white, -0.48, 0.48, 1.0, 1.2, -0.48, 0.48, 'b');
  P.cyl(M.white, [0, 1.2, 0], [0, 1.45, 0], 0.46, 0.4, 8, false);
  P.cyl(M.ochreTan, [0, 1.45, 0], [0, 3.7, 0], 0.3, 0.3, 8, false);
  P.cyl(M.white, [0, 2.2, 0], [0, 2.3, 0], 0.34, 0.34, 8, false); P.cyl(M.white, [0, 3.0, 0], [0, 3.1, 0], 0.34, 0.34, 8, false);
  P.cyl(M.white, [0, 3.7, 0], [0, 4.2, 0], 0.3, 0.46, 8, false);
  P.cyl(M.ochre, [0, 4.2, 0], [0, 4.4, 0], 0.5, 0.5, 8, false);
  P.cyl(M.white, [0, 4.4, 0], [0, 4.55, 0], 0.57, 0.57, 8, true);
  P.cyl(M.graniteDark, [0, 4.55, 0], [0, 4.95, 0], 0.4, 0.06, 8, true);
  return P;
}
function instanceParts(K, P, placements, name) {
  const grp = new THREE.Group(); P.build(grp, { name });
  for (const m of grp.children) {
    const im = new THREE.InstancedMesh(m.geometry, m.material, placements.length);
    const q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), mt = new THREE.Matrix4();
    placements.forEach((pl, i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pl.rot || 0); mt.compose(p.set(pl.x, pl.y || 0, pl.z), q, s.set(pl.s || 1, pl.s || 1, pl.s || 1)); im.setMatrixAt(i, mt); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.name = name; im.frustumCulled = true;
    im.computeBoundingSphere(); K.ctx.noBatch(im); K.root.add(im); K.extraTris += (m.geometry.index.count / 3) * placements.length;
  }
}

/** split a polyline into edges [{ a, b, open }]: the part within 1.85 m (along the line) of the gate point is `open` */
function splitAtGate(pts, gate) {
  const edges = [], cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  let S = null;
  if (gate) {
    let best = 1e9;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((gate[0] - a[0]) * dx + (gate[1] - a[1]) * dz) / l2));
      const d = Math.hypot(gate[0] - a[0] - dx * t, gate[1] - a[1] - dz * t);
      if (d < best) { best = d; S = cum[i] + t * Math.sqrt(l2); }
    }
    if (best > 3) S = null;
  }
  const at = (s) => { let i = 0; while (i + 2 < pts.length && cum[i + 1] < s) i++; const t = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1); return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]; };
  for (let i = 0; i + 1 < pts.length; i++) {
    const c0 = cum[i], c1 = cum[i + 1], cuts = [c0];
    if (S !== null) for (const q of [S - 1.85, S + 1.85]) if (q > c0 + 0.05 && q < c1 - 0.05) cuts.push(q);
    cuts.push(c1);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const m = (cuts[k] + cuts[k + 1]) / 2, open = S !== null && m > S - 1.85 && m < S + 1.85;
      edges.push({ a: k === 0 ? pts[i] : at(cuts[k]), b: k + 2 === cuts.length ? pts[i + 1] : at(cuts[k + 1]), open });
    }
  }
  return edges;
}

/** one Winkler run along `pts`: plinth wall, panels, pier placements; the gate gap is open (gate piers at its ends) */
function winklerRun(K, pts, o, piers, gatePiers) {
  const P = K.P, M = K.M, ph = K.ctx.physics, mat = o.mat || M.winkler, step = 3.74;
  const edges = splitAtGate(pts, (o.gates || [])[0]);
  const addPier = (list, x, z, rot = 0) => { if (!list.some((q) => Math.hypot(q.x - x, q.z - z) < 0.6)) list.push({ x, z, rot }); };
  for (const e of edges) {
    const a = e.a, b = e.b, dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.3) continue;
    const ux = dx / len, uz = dz / len, rot = Math.atan2(-dz, dx);
    if (e.open) { addPier(gatePiers, a[0], a[1], rot); addPier(gatePiers, b[0], b[1], rot); continue; }
    const n = Math.max(1, Math.round(len / step)), s = len / n;
    P.push(a[0], 0, a[1], rot);
    G.tbox(P, M.pink, 0, len, 0, PLINTH_H, -0.35, 0.35, 3.2, 1.4, 'b');                                   // the granite plinth wall
    for (let k = 0; k < n; k++) P.quad(mat, [k * s + 0.3, PANEL_Y0, 0], [(k + 1) * s - 0.3, PANEL_Y0, 0], [(k + 1) * s - 0.3, PANEL_Y0 + PANEL_H, 0], [k * s + 0.3, PANEL_Y0 + PANEL_H, 0], [0, 0, 1], [[0.04, 0], [0.96, 0], [0.96, 1], [0.04, 1]]);
    P.box(M.gun, 0, len, PANEL_Y0 + PANEL_H, PANEL_Y0 + PANEL_H + 0.1, -0.03, 0.03, 'b');                    // top rail
    P.pop();
    ph.addBox(a[0] + dx / 2, a[1] + dz / 2, len, 0.6, rot, 0, 2.2);
    for (let k = 0; k <= n; k++) addPier(piers, a[0] + ux * k * s, a[1] + uz * k * s);
  }
}

/** a spear fence along pts: kerb, posts every 3 m, one alpha-cut spear panel per bay */
function spearRun(K, pts, o = {}) {
  const P = K.P, M = K.M, ph = K.ctx.physics, h = o.h ?? 1.3, step = o.step ?? 2.6, mat = o.mat || M.spears;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz); if (len < 0.3) continue;
    const ux = dx / len, uz = dz / len, rot = Math.atan2(-dz, dx), n = Math.max(1, Math.round(len / step)), s = len / n;
    P.push(a[0], 0, a[1], rot);
    G.tbox(P, M.granite, 0, len, 0, 0.22, -0.14, 0.14, 2, 2, 'b');
    for (let k = 0; k < n; k++) P.quad(mat, [k * s + 0.08, 0.22, 0], [(k + 1) * s - 0.08, 0.22, 0], [(k + 1) * s - 0.08, 0.22 + h, 0], [k * s + 0.08, 0.22 + h, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
    for (let k = 0; k <= n; k++) { const x = k * s; P.box(M.gun, x - 0.05, x + 0.05, 0.22, 0.22 + h + 0.08, -0.05, 0.05, 'b'); P.cyl(M.goldFlat, [x, 0.22 + h + 0.08, 0], [x, 0.22 + h + 0.28, 0], 0.045, 0.0, 6, false); }
    P.pop();
    ph.addBox(a[0] + dx / 2, a[1] + dz / 2, len, 0.3, rot, 0, 1.4);
    void ux; void uz;
  }
}

export function fences(K) {
  const M = K.M, P = K.P;
  const piers = [], gatePiers = [], gates = BARRIER_NODES.filter((n) => n.id === 'n1412259318').map((n) => [n.x, n.z]);
  for (const id of ['w127645397', 'w127645395', 'w127645399']) { const pts = polyline(id); if (pts) winklerRun(K, pts, { gates }, piers, gatePiers); }
  const sac = polyline('w588807856'); if (sac) winklerRun(K, sac, { mat: M.winklerBronze, gates: [] }, piers, gatePiers);
  instanceParts(K, pierModel(M), piers, 'lmK-winkler-piers');
  // ---- the gate on the church axis: two big square piers with majolica tiles, a cornice, a green copper cap and a trident lamp each
  const gp = new Parts();
  gp.box(M.pink, -0.75, 0.75, 0, 1.3, -0.75, 0.75, 'b'); gp.box(M.white, -0.72, 0.72, 1.3, 1.45, -0.72, 0.72, 'b');
  gp.box(M.ochreTan, -0.6, 0.6, 1.45, 4.3, -0.6, 0.6, 'b');
  for (let i = 0; i < 3; i++) for (const [nx, nz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ty = 1.95 + i * 0.95; gp.push(nx * 0.61, 0, nz * 0.61, Math.atan2(nx, nz)); gp.quad(M.majolica, [-0.38, ty, 0], [0.38, ty, 0], [0.38, ty + 0.76, 0], [-0.38, ty + 0.76, 0], [0, 0, 1], [[i * 0.25, 0.5], [i * 0.25 + 0.25, 0.5], [i * 0.25 + 0.25, 1], [i * 0.25, 1]]); gp.pop(); }
  gp.box(M.white, -0.78, 0.78, 4.3, 4.6, -0.78, 0.78, 'b'); gp.box(M.whiteShade, -0.7, 0.7, 4.6, 4.75, -0.7, 0.7, 'b'); gp.box(M.copper, -0.62, 0.62, 4.75, 4.95, -0.62, 0.62, 'b');
  gp.cyl(M.iron, [0, 4.95, 0], [0, 6.0, 0], 0.07, 0.05, 6, false);
  for (const s of [-1, 1]) { gp.cyl(M.iron, [0, 5.6, 0], [s * 0.55, 5.95, 0], 0.035, 0.035, 5, false); G.ball(gp, M.lampGlobe, s * 0.55, 6.1, 0, 0.2, 8); }
  G.ball(gp, M.lampGlobe, 0, 6.35, 0, 0.23, 8);
  instanceParts(K, gp, gatePiers, 'lmK-winkler-gate');
  for (const p of gatePiers) K.ctx.physics.addBox(p.x, p.z, 1.5, 1.5, p.rot, 0, 5);
  if (gates[0]) { K.svc.entrances.push({ id: 'saviour-gate', x: gates[0][0], z: gates[0][1], rotY: 1.5708, kind: 'gate', label: 'Ворота Михайловского сада' }); }
  // ---- inner spear fence round the forecourts + the queue corridor of the N porch
  for (const id of ['w102265046', 'w1164101336', 'w1164101337']) { const pts = polyline(id); if (pts) spearRun(K, pts, { h: id === 'w102265046' ? 1.3 : 1.1 }); }
  K.svc.fenceTris = P.tris;
}
export const build = fences;
