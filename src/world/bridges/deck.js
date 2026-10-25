// bridges/deck.js - deck helpers shared by the bridge builders: profile() (monotone cubic deck profile) and bankU() / closeBank() (the bank line beside a deck and the wing wall + collider that closes the opened quay).
// Used by palace.js (the Palace Bridge). Pure geometry, no state; carved out of the long-bridge builder of the full city (bridges/long.js) which this strip does not need.
import { frameOf } from './sites.js';

/** monotone cubic (Fritsch-Carlson) through keys [[u, y] ...] -> y(u) (flat outside) */
export function profile(keys) {
  const x = keys.map((k) => k[0]), y = keys.map((k) => k[1]), d = [], m = [], n = x.length;
  for (let i = 0; i + 1 < n; i++) d.push((y[i + 1] - y[i]) / (x[i + 1] - x[i]));
  for (let i = 0; i < n; i++) m.push(i === 0 ? d[0] : i === n - 1 ? d[i - 1] : d[i - 1] * d[i] <= 0 ? 0 : 2 / (1 / d[i - 1] + 1 / d[i]));
  return (u) => {
    if (u <= x[0]) return y[0]; if (u >= x[n - 1]) return y[n - 1];
    let i = 0; while (u > x[i + 1]) i++;
    const h = x[i + 1] - x[i], t = (u - x[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}

/** u of the bank line at cross coordinate v near uGuess (dir +1: the water lies toward +u = the first bank; -1: the far bank); null when no bank within 9 m */
export function bankU(L, site, v, uGuess, dir) {
  const f = frameOf(site), wet = (u) => { const x = f.cx + u * f.c - v * f.s, z = f.cz + u * f.s + v * f.c; return !!(L.waterwayAt ? L.waterwayAt(x, z) : L.inRiver(x, z)); };
  let prev = wet(uGuess - dir * 9);
  for (let k = -8.8; k <= 9.001; k += 0.2) { const u = uGuess + dir * k, w = wet(u); if (w && !prev) return u - dir * 0.1; prev = w; }
  return null;
}
/**
 * Closes the quay beside a deck end: the environment opens its wall / parapet / collider in a zone wider than the deck; from the deck edge (cross coordinate v0, side sg) a granite wing wall with a
 * parapet follows the real bank line outward for `len` metres (drawn), and a collider runs on until an existing solid (the quay wall of the environment) is met (at most 14 m).
 * o: { site, P (already in the bridge frame), M, L, ph, u (bank line guess on the axis), dir (+1 first bank, -1 far bank), sg, v0, len, yTop (ground / pavement level), mat, parapet, draw, collide }
 */
export function closeBank(o) {
  const { site, L, sg, v0, dir } = o, f = frameOf(site), world = (u, v) => ({ x: f.cx + u * f.c - v * f.s, z: f.cz + u * f.s + v * f.c });
  const pts = [];
  for (let k = 0; k <= 28; k++) { const v = sg * (v0 + k * 0.5), u = bankU(L, site, v, o.u, dir); pts.push(u === null ? null : [u, v]); }
  let last = null; for (let k = 0; k < pts.length; k++) { if (pts[k]) last = pts[k][0]; else if (last !== null) pts[k] = [last, sg * (v0 + k * 0.5)]; }
  if (!pts[0]) { const first = pts.find((q) => q); if (!first) return 0; for (let k = 0; k < pts.length && !pts[k]; k++) pts[k] = [first[0], sg * (v0 + k * 0.5)]; }
  const nDraw = Math.round((o.len || 3.4) / 0.5), yTop = o.yTop ?? 0.05, yb = o.yb ?? -4.7, th = 0.5;   // (o.yb: the foot of the wing face; a caller may stop it just under the water line so that no toon outline of an underwater edge shows through the water)
  if (o.P && o.draw !== false) {
    const P = o.P, M = o.M, mat = o.mat || M.granite, par = o.parapet || M.parapet;
    for (let k = 0; k < nDraw; k++) {
      const a = pts[k], b = pts[k + 1], ua = a[0] + dir * 0.12, ub = b[0] + dir * 0.12;                              // the face stands 0.12 m in front of the bank line (no sliver of water behind it)
      P.quad(mat, [ua, yb, a[1]], [ub, yb, b[1]], [ub, yTop, b[1]], [ua, yTop, a[1]], [dir, 0, 0], [[a[1] / 2.2, yb / 2.2], [b[1] / 2.2, yb / 2.2], [b[1] / 2.2, yTop / 2.2], [a[1] / 2.2, yTop / 2.2]]);
      P.quad(M.coping, [ua, yTop, a[1]], [ub, yTop, b[1]], [ub - dir * th, yTop, b[1]], [ua - dir * th, yTop, a[1]], [0, 1, 0]);
      if (o.rails) continue;                                                                                          // (with o.rails the parapet of the wing is ONE breakable section, below)
      for (const [du, nx] of [[0, dir], [-dir * th, -dir]]) P.quad(par, [ua + du, yTop, a[1]], [ub + du, yTop, b[1]], [ub + du, yTop + 1.0, b[1]], [ua + du, yTop + 1.0, a[1]], [nx, 0, 0], [[0, 0], [0.2, 0], [0.2, 1], [0, 1]]);
      P.quad(M.coping, [ua + dir * 0.03, yTop + 1.0, a[1]], [ub + dir * 0.03, yTop + 1.0, b[1]], [ub - dir * (th + 0.03), yTop + 1.0, b[1]], [ua - dir * (th + 0.03), yTop + 1.0, a[1]], [0, 1, 0]);
    }
    if (o.rails) {                                                                                                    // WATER IS REACHABLE (docs/AREAS.md 13.7): the wing's parapet is a breakable box section along the middle line of the wall (bridges/rails.js)
      const a = pts[0], e2 = pts[nDraw], ua = a[0] + dir * 0.12 - dir * th / 2, ue2 = e2[0] + dir * 0.12 - dir * th / 2, p = world(ua, a[1]), q = world(ue2, e2[1]);
      o.rails.parapet({ x0: p.x, z0: p.z, x1: q.x, z1: q.z, y: yTop, ye: yTop, h: 1.0, th, mat: par, box: true, center: true });
    } else {
      const e = pts[nDraw], ue = e[0] + dir * 0.12;                                                                    // the end face of the wing
      P.quad(par, [ue, yTop, e[1]], [ue - dir * th, yTop, e[1]], [ue - dir * th, yTop + 1.0, e[1]], [ue, yTop + 1.0, e[1]], [0, 0, sg], [[0, 0], [0.2, 0], [0.2, 1], [0, 1]]);
    }
  }
  let n = 0;
  if (o.ph && o.collide !== false) {
    const ph = o.ph, probe = { x: 0, z: 0 };
    for (let k = 0; k + 1 < pts.length; k++) {
      const a = pts[k], b = pts[k + 1], um = (a[0] + b[0]) / 2 - dir * 0.15, vm = (a[1] + b[1]) / 2, w = world(um, vm);
      if (k >= nDraw) { probe.x = w.x; probe.z = w.z; ph.resolve(probe, 0.25, 0, 1.7); if (Math.hypot(probe.x - w.x, probe.z - w.z) > 0.04) break; }   // the quay collider of the environment takes over
      const rot = Math.atan2(-(b[0] - a[0]) * f.s - (b[1] - a[1]) * f.c, (b[0] - a[0]) * f.c - (b[1] - a[1]) * f.s);
      ph.addBox(w.x, w.z, Math.hypot(b[0] - a[0], b[1] - a[1]) + 0.3, 0.5, rot, -8, yTop + 1.25); n++;
    }
  }
  return n;
}

