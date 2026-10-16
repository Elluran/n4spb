// metro/hub-east.js — the EAST stations of the metro (docs/research/metro-east.md, data/metro-east.js): Ploshchad Aleksandra Nevskogo 1 + 2 with the transfer passage (st-pan.js) and Ligovsky
// Prospekt (st-ligovsky.js). Entry point called from metro.js after the Petrograd / island builders:
//   const east = buildEastHub(ctx, M, X);        // { pan1, pan2, ligovsky, walks(debug), deferred, K }
//   ... after the island links: const lk = buildEastLinks(ctx, M, X, { east, mayak: stations.mayakovskaya, dost: stations.dostoevskaya });   (metro/links-east.js)
// pan1 / pan2 / ligovsky = { S, Se, hall, esc, rt, rooms, exitRoute(debug), entryRoute(debug) } (the shape of the Petrograd-side builders); walks(debug) = { 'pan1->pan2', 'pan2->pan1' }.
// Tunnel ends that may get a real tunnel (Mayakovskaya <-> PAN-1, Dostoevskaya <-> Ligovsky <-> PAN-2) are NOT built here: their stubs wait in `deferred` ('station:end' -> [fn]) and
// links-east.js builds them only for the ends without a real link (so a stub never overlaps a real tube, whatever metro.js does with its own REAL_ENDS).
// Kit (makeEastKit): footprints, polygon inset / clip, a stair flight with walls and a vault, plates between tubes of different profile, sills over end-wall thresholds, door liners for the
// internal doorway of the PAN-1 hotel block, uv scaling for extrusions. Everything static; no per-frame work in this file.
import * as THREE from 'three';
import { extrudeX, extrudeZ, archHole, loft } from './lib.js';
import { insetPoly, ringOf } from './petro-kit.js';
import { EAST_FOOT } from '../data/metro-east.js';
import { buildPan } from './st-pan.js';
import { buildLigovsky } from './st-ligovsky.js';

export function buildEastHub(ctx, M, X) {
  const K = makeEastKit(ctx, M, X), out = { K, deferred: K.deferred };
  const fail = (what, e) => { console.error('[metro] east: ' + what + ' failed', e); (ctx.errors ||= []).push(e); };
  try { const p = buildPan(ctx, M, X, K); out.pan1 = p.pan1; out.pan2 = p.pan2; out.pass = p.pass; out.panWalks = p.walks; } catch (e) { fail('Ploshchad Aleksandra Nevskogo', e); }
  try { out.ligovsky = buildLigovsky(ctx, M, X, K); } catch (e) { fail('Ligovsky Prospekt', e); }
  out.walks = (debug) => (out.panWalks ? out.panWalks(debug) : {});
  /** builds every deferred stub whose end did not get a real tunnel (links-east.js calls it; call it yourself when the links are not built) */
  out.flushStubs = (done = new Set()) => { for (const [key, fns] of Object.entries(K.deferred)) if (!done.has(key)) for (const f of fns.splice(0)) { try { f(); } catch (e) { fail('stub ' + key, e); } } };
  return out;
}

/** the kit shared by st-pan.js and st-ligovsky.js */
export function makeEastKit(ctx, M, X) {
  const { mat } = ctx, K = { deferred: {} };
  K.defer = (key, fn) => { (K.deferred[key] ||= []).push(fn); };
  /** the footprint ring of a house ([[x, z], ...]): the baked record, else the copy in data/metro-east.js */
  K.foot = (id) => { const b = ctx.L && ctx.L.buildingById ? ctx.L.buildingById(id) : null; return b && b.polys && b.polys[0] ? ringOf(b.polys[0].o) : EAST_FOOT[id].map((p) => p.slice()); };
  K.inset = (ring, d) => insetPoly(ring, d);
  /** keeps the part of a simple polygon where (p - c) . n >= 0 (one Sutherland-Hodgman pass; a straight partition wall along the cut) */
  K.clip = (poly, n, c) => {
    const side = (p) => (p[0] - c[0]) * n[0] + (p[1] - c[1]) * n[1], out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = side(a), sb = side(b);
      if (sa >= 0) out.push(a);
      if ((sa >= 0) !== (sb >= 0)) { const f = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
    }
    return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.05; });
  };
  K.uv = (g, su, sv = su) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
  const stepMat = mat.toon('#a49c92', { map: M.T.granite('gen-floor', '#8b8782', 'rgba(25,25,28,0.35)', 'rgba(255,255,255,0.30)') });          // the shared floor canvas of the new halls (hall-vault sharedFloor)
  K.stepMat = stepMat;
  /**
   * A stair flight in the frame of the Space S along local z: from (x, y0) at z0 to y1 at z1 (z1 < z0 runs toward -z), n risers (physics.addStairs: tread i at y0 + (i + 1) * r), width w,
   * side walls `H` m above the nosing line, an elliptic vault of rise `rise`, a handrail on the axis, colliders (steps + side walls in 3 m pieces). o.walls = false: steps only (inside a room).
   * Returns { run, r, t, H, rise, hw }.
   */
  K.stair = (S, o) => {
    const x = o.x ?? 0, z0 = o.z0, z1 = o.z1, y0 = o.y0, y1 = o.y1, n = o.n, w = o.w ?? 4.0, hw = w / 2, H = o.H ?? 2.4, rise = o.rise ?? 0.6, sg = Math.sign(z1 - z0), run = Math.abs(z1 - z0), r = (y1 - y0) / n, t = run / n;
    const yB = Math.min(y0, y1) - 0.45, prof = [[z0, yB]];
    for (let i = 0; i < n; i++) { const za = z0 + sg * i * t, yy = y0 + r * (i + 1); prof.push([za, y0 + r * i], [za, yy]); }
    prof.push([z1, y1], [z1, yB]);
    S.group.add(new THREE.Mesh(K.uv(extrudeX(prof, x - hw, x + hw), 1 / 1.6), o.stepMat || stepMat));
    // yellow nosings on the first and the last tread
    for (const i of [0, n - 1]) S.bx(x - hw, x + hw, y0 + r * (i + 1), y0 + r * (i + 1) + 0.012, Math.min(z0 + sg * i * t, z0 + sg * (i + 0.25) * t), Math.max(z0 + sg * i * t, z0 + sg * (i + 0.25) * t), M.yellow);
    const [cx, cz] = S.W(x, (z0 + z1) / 2), items = ctx.physics.addStairs(cx, cz, w - 0.1, run, sg > 0 ? S.frame.yaw : S.frame.yaw + Math.PI, y0, y1, n);
    if (o.walls !== false) {
      const wallMat = o.wallMat || M.corridorWall, vaultMat = o.vaultMat || M.corridorVault, slope = (y1 - y0) / (z1 - z0);
      for (const sx of [-1, 1]) {
        const wp = [[z0, yB], [z1, yB], [z1, y1 + H], [z0, y0 + H]];
        S.group.add(new THREE.Mesh(K.uv(extrudeX(wp, sx > 0 ? x + hw : x - hw - 0.3, sx > 0 ? x + hw + 0.3 : x - hw), 1 / 4), wallMat));
        for (let a = 0; a < run; a += 3) { const b = Math.min(run, a + 3), za = z0 + sg * a, zb = z0 + sg * b, ya = y0 + slope * (za - z0), yb = y0 + slope * (zb - z0);
          S.col(sx > 0 ? x + hw : x - hw - 0.5, sx > 0 ? x + hw + 0.5 : x - hw, Math.min(ya, yb) - 1.2, Math.max(ya, yb) + H + rise + 0.5, Math.min(za, zb), Math.max(za, zb)); }
      }
      const arch = []; for (let i = 0; i <= 14; i++) { const th = i * Math.PI / 14; arch.push([(hw + 0.02) * Math.cos(th), H + rise * Math.sin(th)]); }
      S.group.add(new THREE.Mesh(loft([[x, y0, z0], [x, y1, z1]], arch, { us: 1 / 4, vs: 1 / 4 }), vaultMat));
      const lamp = loft([[x, y0, z0], [x, y1, z1]], [[0.18, H + rise - 0.06], [-0.18, H + rise - 0.06]], { flat: true }); S.group.add(new THREE.Mesh(lamp, M.lampWarm));
    }
    if (o.rail !== false) { const len = Math.hypot(run, y1 - y0), m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), M.stainless); m.position.set(x, (y0 + y1) / 2 + 0.95, (z0 + z1) / 2); m.rotation.x = Math.atan2(z1 - z0, y1 - y0); m.castShadow = false; S.group.add(m);          // the cylinder axis (local y) along (0, y1 - y0, z1 - z0)
      for (const q of [0.05, 0.5, 0.95]) S.k.cyl(0.025, 0.025, 0.95, M.stainless, [x, y0 + (y1 - y0) * q + 0.475, z0 + (z1 - z0) * q], null, 5); }
    return { run, r, t, H, rise, hw, items };
  };
  /** a plate across a tube / corridor end at local z (Space S): outer rectangle |x - x0| < ow, y from y - 0.6 to y + oh, with an arched opening (half width hw, vertical sides up to y + spring) */
  K.plate = (S, o) => {
    const x0 = o.x ?? 0, y = o.y, z = o.z, d = o.d ?? 0.3, outer = [[x0 - o.ow, y - 0.6], [x0 + o.ow, y - 0.6], [x0 + o.ow, y + o.oh], [x0 - o.ow, y + o.oh]];
    S.group.add(new THREE.Mesh(extrudeZ(outer, z - d / 2, z + d / 2, [archHole(x0, o.hw, y, y + o.spring, 12)]), o.mat || M.plasterWarm));
  };
  /** a walkable sill over the thickness of an end wall (the halls' floors stop at the wall: a 0.1-0.6 m void would stop a walker), with a granite strip on top */
  K.sill = (S, o) => { S.walk(o.x0, o.x1, o.z0, o.z1, o.y, 1.0); S.bx(o.x0, o.x1, o.y - 0.12, o.y + 0.004, o.z0, o.z1, o.mat || M.graniteGrey); };
  /** the liner of an internal doorway (world): jambs, lintel and a sill across the depth `dep` (the gap between the slabs of two rooms) */
  K.liner = (kg, d, o = {}) => {
    const nx = Math.sin(d.rotY), nz = Math.cos(d.rotY), ux = nz, uz = -nx, dep = o.dep ?? 1.0, h = o.h ?? 3.0, y = o.y ?? 0.05, hw = d.w / 2, m = o.mat || M.marbleWhite;
    for (const s of [-1, 1]) kg.box(0.25, h, dep, m, [d.x + ux * s * (hw + 0.125), y + h / 2, d.z + uz * s * (hw + 0.125)], [0, d.rotY, 0]);
    kg.box(d.w + 0.5, 0.3, dep, m, [d.x, y + h + 0.15, d.z], [0, d.rotY, 0]);
    kg.box(d.w, 0.15, dep, o.sillMat || M.graniteGrey, [d.x, y - 0.075, d.z], [0, d.rotY, 0]);
  };
  /** an escalator foot bulkhead (the plate between the sheared tube and a corridor), Space of the escalator: at z = run */
  K.bulkhead = (Se, o) => {
    const A = o.A ?? 4.05, FY = o.FY, run = o.run, bv = o.bv ?? 4.9, tubeIn = [[-A, FY - 1.4], [-A, FY + 1.0]];
    for (let i = 1; i < 36; i++) { const tt = Math.PI - i * Math.PI / 36; tubeIn.push([A * Math.cos(tt), FY + 1.0 + bv * Math.sin(tt)]); }
    tubeIn.push([A, FY + 1.0], [A, FY - 1.4]);
    Se.group.add(new THREE.Mesh(extrudeZ(tubeIn, run - 0.5, run, [archHole(0, o.hw ?? 3.3, FY, FY + (o.spring ?? 0.6), 12)]), M.plasterWarm));
  };
  /** a route point in a Space: [x, z] or [x, z, tol] */
  K.at = (S, x, z, tol) => { const q = S.W(x, z); return tol ? [q[0], q[1], tol] : q; };
  /** every 'step'-th point [x, z] of a built corridor (after autoClear) */
  K.cp = (debug, name, step = 4, rev = false) => { const c = debug.corridors.find((q) => q.name === name); if (!c) return []; const p = c.pts.filter((_, i, a) => i % step === 0 || i === a.length - 1).map((q) => [q[0], q[2]]); return rev ? p.reverse() : p; };
  return K;
}
