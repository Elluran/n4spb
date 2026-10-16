// metro/petro-kit.js — parts shared by the four stations of the Petrograd side (st-gork.js, st-petr.js, st-sport.js, st-chk.js; docs/research/metro-petro.md):
//   insetPoly     the inner wall line of a vestibule room from the footprint of its house
//   lowerHall     the short hall between the end of a platform hall and the foot of an incline (same profile as the escalator tube: the sheared tube ends on it seamlessly)
//   shaftFittings parapets round the escalator mouth of a vestibule + a turnstile row + ticket machines
//   stairPit      an open granite stairwell on a pavement (the street stairs of the underground vestibule of Sportivnaya)
//   panelTex      a stone-panel wall texture (joints, veins), uv in metres
import * as THREE from 'three';
import { extrudeZ, extrudeX, archRing, floorGeo } from './lib.js';

/** inward offset of a simple polygon [[x, z], ...] by d metres (mitred corners; edges shorter than `minEdge` are merged first) */
export function insetPoly(pts, d, minEdge = 0.5) {
  let p = pts.filter((q, i) => { const a = pts[(i + pts.length - 1) % pts.length]; return Math.hypot(q[0] - a[0], q[1] - a[1]) > minEdge; });
  if (p.length < 3) p = pts.slice();
  let area = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sg = area > 0 ? 1 : -1, n = p.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
    const e0 = [b[0] - a[0], b[1] - a[1]], e1 = [c[0] - b[0], c[1] - b[1]], l0 = Math.hypot(e0[0], e0[1]) || 1, l1 = Math.hypot(e1[0], e1[1]) || 1;
    const n0 = [-e0[1] / l0 * sg, e0[0] / l0 * sg], n1 = [-e1[1] / l1 * sg, e1[0] / l1 * sg], den = Math.max(0.35, 1 + n0[0] * n1[0] + n0[1] * n1[1]);
    out.push([b[0] + (n0[0] + n1[0]) * d / den, b[1] + (n0[1] + n1[1]) * d / den]);
  }
  return out;
}
export const ringOf = (flat) => { const r = []; for (let i = 0; i < flat.length; i += 2) r.push([flat[i], flat[i + 1]]); return r; };

/** stone panels: w x h metres per panel, `cols` x `rows` panels per tile; returns a texture repeated in metres */
export function panelTex(ctx, M, key, o = {}) {
  const pw = o.w ?? 0.6, ph = o.h ?? 1.2, cols = o.cols ?? 4, rows = o.rows ?? 2, base = o.base || '#cdc7b9';
  return M.rep(ctx.tex.draw(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h); const r = ctx.rng(key), cw = w / cols, ch = h / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { g.fillStyle = r() < 0.5 ? (o.lite || 'rgba(255,255,255,0.10)') : (o.dark || 'rgba(60,50,40,0.08)'); g.fillRect(i * cw, j * ch, cw, ch); }
    for (let i = 0; i < (o.veins ?? 30); i++) { g.strokeStyle = o.vein || 'rgba(120,110,95,0.22)'; g.lineWidth = 1 + r() * 1.5; g.beginPath(); let x = r() * w, y = r() * h; g.moveTo(x, y); for (let q = 0; q < 4; q++) { x += (r() - 0.4) * 44; y += (r() - 0.5) * 36; g.lineTo(x, y); } g.stroke(); }
    g.strokeStyle = o.joint || 'rgba(70,62,52,0.38)'; g.lineWidth = 2;
    for (let i = 0; i <= cols; i++) { g.beginPath(); g.moveTo(i * cw, 0); g.lineTo(i * cw, h); g.stroke(); }
    for (let j = 0; j <= rows; j++) { g.beginPath(); g.moveTo(0, j * ch); g.lineTo(w, j * ch); g.stroke(); }
  }, { key }), 1 / (pw * cols), 1 / (ph * rows));
}

/** the lower hall: hall-frame z from z0 to z1 (z0 < z1), half width A, the tube profile of escalator.js; floor + walk box + side colliders */
export function lowerHall(ctx, M, S, o) {
  const A = o.A ?? 4.05, FY = o.FY, bv = o.bv ?? 4.9;
  const ring = extrudeZ(archRing(A, FY + 1.0, 0.5, FY - 1.4, 0, 36, bv), o.z0, o.z1);
  S.group.add(new THREE.Mesh(ring, o.vaultMat || M.plasterVault));
  const fl = new THREE.Mesh(floorGeo(-A, A, o.z0, o.z1, FY, 0.5), o.floorMat || M.corridorFloor); S.group.add(fl);
  S.walk(-A, A, o.z0 - 0.2, o.z1 + 0.2, FY, 1.1);
  S.col(A - 0.1, A + 0.7, FY - 1.2, FY + 8, o.z0, o.z1); S.col(-A - 0.7, -A + 0.1, FY - 1.2, FY + 8, o.z0, o.z1);
}

/**
 * Fittings round the mouth of an incline in a vestibule, in the frame of the escalator Space `Sv` (origin = the head, +z = the descent, floor at `y`):
 * parapets on both sides and across the far end of the shaft (colliders), lamps on them. o: { A, len (13), y (0.05), mat, rail: true }
 */
export function shaftParapet(Sv, M, o = {}) {
  const A = o.A ?? 4.05, len = o.len ?? 13, y = o.y ?? 0.05, m = o.mat || M.marbleWhite, k = Sv.k, h = o.h ?? 1.0;
  for (const sx of [-1, 1]) {
    k.box(0.35, h, len - 0.4, m, [sx * (A + 0.1), y + h / 2, len / 2 + 0.1]); Sv.col(sx * (A + 0.1) - 0.2, sx * (A + 0.1) + 0.2, y - 1, y + h + 0.1, 0.3, len);
    if (o.rail !== false) k.cyl(0.03, 0.03, len - 0.4, M.stainless, [sx * (A + 0.1), y + h + 0.08, len / 2 + 0.1], [Math.PI / 2, 0, 0], 6);
  }
  k.box(2 * A + 0.55, h, 0.35, m, [0, y + h / 2, len + 0.1]); Sv.col(-A - 0.3, A + 0.3, y - 1, y + h + 0.1, len - 0.1, len + 0.3);
}

/**
 * An open granite stairwell on the pavement. p: { mouth: [x, z], e: [ex, ez] (descent), run, open, w }, o: { depth (5), sign (emissive material of the lit sign), name }.
 * Returns { yaw, foot: [x, z], W(lx, lz) }.
 */
export function stairPit(ctx, M, parent, p, o = {}) {
  const depth = o.depth ?? 5, yaw = Math.atan2(p.e[0], p.e[1]), c = Math.cos(yaw), s = Math.sin(yaw), run = p.run, n = Math.round(depth / 0.15), hw = p.w / 2, open = p.open;
  const W = (lx, lz) => [p.mouth[0] + lx * c + lz * s, p.mouth[1] - lx * s + lz * c];
  const g = new THREE.Group(); g.position.set(p.mouth[0], 0, p.mouth[1]); g.rotation.y = yaw; parent.add(g); const k = ctx.kit(g);
  const stone = o.stone || ctx.mat.toon('#6f6c68'), stepM = o.steps || ctx.mat.toon('#8f8a82'), cop = o.coping || ctx.mat.toon('#85817b');
  // the flight: n treads (a yellow nosing on the first and the last), instanced as one extruded profile
  { const prof = []; for (let i = 0; i < n; i++) { const z0 = i * run / n, y = -depth * (i + 1) / n; prof.push([z0, y + depth / n], [z0, y]); } prof.push([run, -depth], [run, -depth - 0.4], [0, -0.4]);
    g.add(new THREE.Mesh(extrudeX(prof, -hw, hw), stepM)); k.box(p.w, 0.02, run / n, M.yellow, [0, -depth / n + 0.012, run / n / 2]); }
  // side walls: a parapet 1.05 m above the pavement along the open part, the earth wall down to the flight below it, a roof slab over the covered part
  const wallProf = [[-0.3, 1.05], [open, 1.05], [open, -0.45], [run + 0.2, -0.45], [run + 0.2, -depth - 0.4], [-0.3, -0.4]];
  const sl = Math.atan2(depth, run);
  for (const sx of [-1, 1]) { g.add(new THREE.Mesh(extrudeX(wallProf, sx * (hw + 0.2) - 0.2, sx * (hw + 0.2) + 0.2), stone)); k.box(0.52, 0.08, open + 0.3, cop, [sx * (hw + 0.2), 1.09, open / 2 - 0.15]); k.cyl(0.028, 0.028, open / Math.cos(sl), M.stainless, [sx * (hw - 0.12), 0.95 - depth * 0.5 * open / run, open / 2], [Math.PI / 2 + sl, 0, 0], 6); }
  k.box(p.w + 0.8, 1.5, 0.4, stone, [0, 0.3, open + 0.2]); k.box(p.w + 0.86, 0.08, 0.5, cop, [0, 1.09, open + 0.2]);                // the parapet across the far end of the open part (the flight continues under the pavement below it)
  k.box(p.w, 0.3, run - open + 0.2, M.concreteDark, [0, -0.3, open + (run - open) / 2 + 0.1]);                                          // the pavement slab over the covered part
  if (o.sign) { for (const sx of [-1, 1]) k.box(0.16, 3.2, 0.16, M.stainless, [sx * (hw + 0.2), 1.6, -0.25]); k.box(p.w + 0.6, 0.62, 0.14, M.steelBlack, [0, 2.9, -0.25]); for (const f of [1, -1]) { const m = k.plane(p.w - 0.2, 0.52, o.sign, [0, 2.9, -0.25 - f * 0.08], [0, f > 0 ? Math.PI : 0, 0]); m.castShadow = false; } }
  // the steel-and-glass roof over the open part (the street stairs of Sportivnaya got such roofs in 2007): posts on the parapets, a flat roof with a cross truss, glazed sides and far end
  if (o.canopy) {
    const steel = ctx.mat.toon('#8f959b'), x = hw + 0.2, H = 3.25;
    for (const sx of [-1, 1]) { for (let z = 0.4; z <= open + 0.21; z += (open - 0.2) / 3) k.box(0.12, H - 1.1, 0.12, steel, [sx * x, 1.1 + (H - 1.1) / 2, z]); k.box(0.12, 0.14, open + 0.5, steel, [sx * x, H, open / 2 + 0.15]); const gl = k.box(0.04, H - 1.3, open - 0.3, M.glass, [sx * x, 1.2 + (H - 1.3) / 2, open / 2 + 0.3]); gl.castShadow = false; }
    k.box(2 * x + 0.5, 0.1, open + 0.9, steel, [0, H + 0.12, open / 2 + 0.05]); k.box(2 * x, 0.12, 0.12, steel, [0, H, open + 0.2]); const ge = k.box(2 * x - 0.2, H - 1.3, 0.04, M.glass, [0, 1.2 + (H - 1.3) / 2, open + 0.2]); ge.castShadow = false;
    for (let z = (open - 0.2) / 3 + 0.4; z < open; z += (open - 0.2) / 3) k.box(2 * x, 0.1, 0.1, steel, [0, H - 0.02, z]);
  }
  // physics: the flight, the hole over the open part, the side walls (full depth) and the end parapet (above the pavement only: the flight passes below it)
  const [cx, cz] = W(0, run / 2); ctx.physics.addStairs(cx, cz, p.w - 0.1, run, yaw, 0, -depth, n);
  const [hx, hz] = W(0, open / 2); ctx.physics.addHole(hx, hz, p.w, open, yaw);
  for (const sx of [-1, 1]) { const [bx, bz] = W(sx * (hw + 0.2), run / 2); ctx.physics.addBox(bx, bz, 0.4, run + 0.6, yaw, -depth - 1, 1.2); }
  { const [bx, bz] = W(0, open + 0.2); ctx.physics.addBox(bx, bz, p.w + 0.8, 0.4, yaw, -0.45, 1.2); }
  return { yaw, W, foot: W(0, run), run, depth };
}

/** door furniture at a DOORWAYS row: stainless posts, a lintel, a glass transom; kg = a kit in world coordinates */
export function doorFrame(kg, M, d, o = {}) {
  const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), ux = nz, uz = -nx, h = o.h ?? 3.2, px = d.x + nx * (o.out ?? 0.12), pz = d.z + nz * (o.out ?? 0.12), hw = d.w / 2 + 0.06;
  for (const sx of [-1, 1]) kg.box(0.1, h + 0.2, 0.14, M.stainless, [px + ux * hw * sx, (h + 0.2) / 2, pz + uz * hw * sx], [0, d.rotY, 0]);
  kg.box(d.w + 0.3, 0.16, 0.16, M.stainless, [px, h + 0.25, pz], [0, d.rotY, 0]);
  const gl = kg.plane(d.w, 0.5, M.glassWarm, [px, h - 0.05, pz], [0, d.rotY, 0]); gl.castShadow = false;
  if (o.name) { const p = kg.plane(o.name.w ?? 4.6, o.name.h ?? 0.6, o.name.mat, [d.x + nx * 0.22, h + 0.85, d.z + nz * 0.22], [0, d.rotY, 0]); p.castShadow = false; }
}
