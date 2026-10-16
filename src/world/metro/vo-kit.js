// metro/vo-kit.js — helpers of the Vasilievsky Island stations (st-vo.js, st-gorny.js, st-sport2.js, pavilion.js):
//   stripFloor   walkable floor colliders (walk boxes) for a room of ANY plan: strips of a frame, minus rectangular holes (the mouth of an escalator), solid from the street up to the floor
//   outerSteps   a flight of granite steps in front of a door that lies above the street (the 11 steps of the Vasileostrovskaya pavilion) with its stairs collider and two stainless rails
//   closedDoors  the platform doors of a closed-type hall: black panels hidden while a train stands with open doors, dynamic colliders keep them shut otherwise (as Gostiny Dvor / Petrogradskaya)
//   corridorAlong  a smoothed corridor path from a world point + heading to a world point + heading
import * as THREE from 'three';
import { GDH } from './hall-gd.js';
import { smoothPath } from './lib.js';

const isect = (A, B) => { const out = []; for (const [a0, a1] of A) for (const [b0, b1] of B) { const lo = Math.max(a0, b0), hi = Math.min(a1, b1); if (hi > lo) out.push([lo, hi]); } return out; };
const subtract = (A, [h0, h1]) => { const out = []; for (const [a0, a1] of A) { if (h1 <= a0 || h0 >= a1) { out.push([a0, a1]); continue; } if (h0 > a0) out.push([a0, h0]); if (h1 < a1) out.push([h1, a1]); } return out; };
const vint = (poly, x) => { const zs = []; for (let i = 0, n = poly.length; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n]; if ((a[0] <= x && b[0] > x) || (b[0] <= x && a[0] > x)) zs.push(a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1])); } return zs.sort((p, q) => p - q); };

/**
 * Walk boxes covering the plan `poly` ([[x, z], ...] in the local frame of the Space S) at height y, minus `holes` ([x0, x1, z0, z1] rectangles of the same frame); strips of about `step` metres,
 * their edges aligned with the holes. thick = the depth of the solid column under the floor. Returns the physics items.
 */
export function stripFloor(S, poly, holes, y, thick, o = {}) {
  const margin = o.margin ?? 0.1;
  // one pass of strips across x: each strip is the INTERSECTION of the cross-sections of the plan at its two sides and middle, so beside a slanted wall it falls short of the wall by up to
  // (strip width x slope of the wall): with 1.5 m strips that left floor-less wedges 1.2 m deep along the slanted walls of the Vasileostrovskaya pavilion (the player walked off the floor into the
  // 1.7 m podium: review-metro; the 6-gon of the pavilion is turned against the incline frame, the wedges were found by sampling the physics floor). A plan with slanted edges is therefore covered by FINE strips along BOTH axes (the wedge that one pass
  // leaves is covered by the other: at most 0.3 m x min(slope, 1 / slope) < 0.15 m remain at any wall, the wall collider and the radius of the player (0.3 m) keep the centre 0.4 m from it);
  // an axis-aligned plan (the rectangular ticket halls) is exact with coarse strips.
  const pass = (pl, hs, step, put) => {
    let x0 = Infinity, x1 = -Infinity; for (const p of pl) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    const xs = new Set(); for (let x = x0; x < x1; x += step) xs.add(+x.toFixed(3)); xs.add(+x1.toFixed(3)); for (const h of hs) { if (h[0] > x0 && h[0] < x1) xs.add(+h[0].toFixed(3)); if (h[1] > x0 && h[1] < x1) xs.add(+h[1].toFixed(3)); }
    const brk = [...xs].sort((a, b) => a - b), out = [];
    for (let i = 0; i + 1 < brk.length; i++) {
      const xa = brk[i], xb = brk[i + 1]; if (xb - xa < 0.05) continue;
      let iv = null;
      for (const x of [xa + 0.03, (xa + xb) / 2, xb - 0.03]) { const zs = vint(pl, x), cur = []; for (let j = 0; j + 1 < zs.length; j += 2) cur.push([zs[j], zs[j + 1]]); iv = iv ? isect(iv, cur) : cur; }
      for (const h of hs) if (h[1] > xa + 1e-6 && h[0] < xb - 1e-6) iv = subtract(iv, [h[2], h[3]]);
      for (const [z0, z1] of iv) if (z1 - z0 > 0.2) out.push(put(xa, xb, z0 + margin, z1 - margin));
    }
    return out;
  };
  const slanted = poly.some((a, i) => { const b = poly[(i + 1) % poly.length]; return Math.min(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) > 0.05; });
  const put = (xa, xb, z0, z1) => S.walk(xa, xb, z0, z1, y, thick), putT = (za, zb, x0, x1) => S.walk(x0, x1, za, zb, y, thick);          // putT: the transposed pass (its "x" is z)
  if (!slanted) return pass(poly, holes, o.step ?? 1.5, put);
  const fine = o.fine ?? 0.3;
  return [...pass(poly, holes, fine, put), ...pass(poly.map(([x, z]) => [z, x]), holes.map(([a, b, c, d]) => [c, d, a, b]), fine, putT)];
}

/**
 * Granite steps in front of a door: from the wall line (height `top`) outward to the street (0). d = { x, z, w, rotY } (a DOORWAYS row: rotY faces outward), o: { n (11), run (3.3), extra (0.6 m wider than the door), mat, rail }.
 * Returns { items, run }.
 */
export function outerSteps(ctx, M, group, d, o = {}) {
  const n = o.n ?? 11, run = o.run ?? 3.3, top = o.top ?? 1.65, w = d.w + (o.extra ?? 0.6), tread = run / n, rise = top / n, nx = Math.sin(d.rotY), nz = Math.cos(d.rotY);
  const mat = o.mat || ctx.mat.toon('#8c8984'), kg = ctx.kit(group), W = (lx, lz) => [d.x + nx * lz + nz * lx, d.z + nz * lz - nx * lx];       // lx along the wall (to the left of the outward normal), lz outward
  for (let i = 0; i < n; i++) { const [cx, cz] = W(0, (i + 0.5) * tread), h = top - (i + 1) * rise; if (h > 0.01) kg.box(w, h, tread, mat, [cx, h / 2, cz], [0, d.rotY, 0]); }
  { const [cx, cz] = W(0, 0.02); kg.box(w, top, 0.04, mat, [cx, top / 2, cz], [0, d.rotY, 0]); }
  const [cx, cz] = W(0, run / 2), items = [ctx.physics.addStairs(cx, cz, w - 0.2, run, d.rotY + Math.PI, 0, top, n)];
  if (o.rail !== false) for (const sx of [-1, 1]) {
    const [rx, rz] = W(sx * (w / 2 - 0.05), run / 2), len = Math.hypot(run, top), tilt = Math.atan2(top, run), g = new THREE.Group();
    g.position.set(rx, top / 2 + 0.95, rz); g.rotation.order = 'YXZ'; g.rotation.y = d.rotY; g.rotation.x = Math.PI / 2 + tilt;       // the axis of the cylinder runs outward and downhill
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, len, 6), M.stainless); m.castShadow = false; g.add(m); group.add(g);
    for (const q of [0.04, run - 0.04]) { const [px, pz] = W(sx * (w / 2 - 0.05), q), hh = q < 1 ? top : 0; kg.cyl(0.03, 0.03, 0.95, M.stainless, [px, hh + 0.475, pz], null, 6); }
  }
  return { items: items.flat(), run };
}

/** the black platform doors of a closed-type hall `hall` (hall-gd.js) of the station object `rt` in the Space S: panels show while no train stands with open doors, colliders likewise */
export function closedDoors(ctx, rt, hall, S, frame, PZ, FY) {
  const cam = ctx.camera.position, byDir = (sx) => rt.platform.tracks.find((t) => (t.dir > 0 ? -1 : 1) === sx);
  const closed = (tk, t) => { if (!tk) return true; if ((tk.rideOpen || 0) > 0.05) return false; if (tk.override) return true; const s = rt.platform.state(tk, t); return !(s.visible && s.phase === 'dwell' && s.open > 0.05); };
  const state = { closed: { '-1': true, 1: true } };
  ctx.onUpdate((dt, t) => { const near = Math.hypot(cam.x - frame.x, cam.z - frame.z) < 140 && Math.abs(cam.y - FY) < 30; for (const pn of hall.panels) { const c = near ? closed(byDir(pn.sx), t) : true; pn.mesh.visible = c; state.closed[pn.sx] = c; } });
  ctx.physics.addDynamic(() => {
    if (Math.hypot(cam.x - frame.x, cam.z - frame.z) > 140 || Math.abs(cam.y - FY) > 30) return [];
    const out = []; for (const sx of [-1, 1]) if (state.closed[sx]) { const [wx, wz] = S.W(sx * (GDH.EDGE + 0.12), 0); out.push({ cx: wx, cz: wz, w: 0.3, d: 2 * PZ, rotY: frame.yaw, y0: FY - 0.5, y1: FY + 2.5 }); }
    return out;
  });
  return state;
}

/** a smooth corridor path [[x, z], ...] from the world point a (heading ta, unit) to b (heading tb), through optional waypoints */
export const corridorAlong = (a, ta, via, b, tb, step = 2.5) => smoothPath([a, ...via, b], ta, tb, step);
export { THREE };

/**
 * The inner plan of a pavilion room from its footprint ring: inset by  metres, then, for every door, the plan is CLIPPED by a straight wall perpendicular to the door's outward normal, placed
 * as close to the door as a chord of at least door width + 1 m allows (the oval pavilions of Sportivnaya-2 have 1.6 m edges and the door at the very tip: a door hole wider than its wall breaks the wall
 * mesh and leaves wall colliders across the door; a rectangular pavilion is not touched: its wall already is that chord). Convex plans only. doors: [{ x, z, w, rotY }] (world).
 */
export function roomPoly(foot, inset, doors, insetFn) {
  let p = insetFn(foot, inset);
  const chordLen = (q, n, c) => { const ts = []; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], da = (a[0] - c[0]) * n[0] + (a[1] - c[1]) * n[1], db = (b[0] - c[0]) * n[0] + (b[1] - c[1]) * n[1]; if ((da <= 0 && db > 0) || (db <= 0 && da > 0)) { const f = da / (da - db); ts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); } } return ts.length >= 2 ? Math.hypot(ts[0][0] - ts[ts.length - 1][0], ts[0][1] - ts[ts.length - 1][1]) : 0; };
  const clip = (q, n, c) => { const out = [], side = (a) => (a[0] - c[0]) * n[0] + (a[1] - c[1]) * n[1]; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length], sa = side(a), sb = side(b); if (sa <= 1e-6) out.push(a); if ((sa < -1e-6 && sb > 1e-6) || (sb < -1e-6 && sa > 1e-6)) { const f = sa / (sa - sb); out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); } } return out; };
  for (const d of doors) {
    const n = [Math.sin(d.rotY), Math.cos(d.rotY)], need = (d.w || 3.4) + 1.0; let h = 0;
    for (; h < 4; h += 0.1) { if (chordLen(p, n, [d.x - n[0] * h, d.z - n[1] * h]) >= need) break; }
    if (h >= 4) continue;
    const q = clip(p, n, [d.x - n[0] * h, d.z - n[1] * h]); if (q.length >= 3) p = q;
  }
  return p;
}
