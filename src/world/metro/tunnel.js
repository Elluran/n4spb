// metro/tunnel.js — a single-track running tunnel along a polyline (docs/research/metro.md section F): cast-iron lining rings (inner R 2.55-2.7), a concrete track bed with two rails and a
// contact rail, a double cable tray on the right wall, caged lamps every 9 m on the left wall, ventilation / emergency-exit boards. Used for the stubs behind the station mouths and for the
// real tunnel between two stations. The path is [[x, y, z], ...] in the coordinates of the parent group (y = rail foot level), sampled every ~3 m.
import * as THREE from 'three';
import { loft } from './lib.js';

export const TUBE_R = 2.7, TUBE_CY = 2.0;       // inner radius, centre height above the rail foot

const circleProfile = (R, cy, n = 28) => { const p = []; for (let i = 0; i <= n; i++) { const t = -Math.PI * 0.5 - i * 2 * Math.PI / n; p.push([R * Math.cos(t), cy + R * Math.sin(t)]); } return p; };

/**
 * Build the tunnel meshes into `parent` (a THREE.Group). Returns { length }. opts: R, cy, lamps (spacing, 0 = none), tag (unused), railMat ...
 *   s0      the path starts s0 m along a longer tube (a chunk, the part behind a disc): the lamps stand at s = spacing / 2 + n * spacing of the WHOLE tube and the textures (lining rings 1 m,
 *           bed 1.2 m) continue, so pieces built separately join without a seam (the ride's jump to the generic tunnel relies on this phase: ride.js LAMP_PERIOD)
 *   mirror  the lateral equipment (lamps, cable trays, conduit, contact rail) on the other side: a tube ridden AGAINST its path direction (the stub of an arriving track) keeps the lamps on
 *           the left of the travel direction and the contact rail on the outer side, as in the hall and in the generic tunnel
 * Everything is a loft along the same path, so curves stay watertight; the rings are texture seams (M.lining), the lamps are boxes placed along the path.
 */
export function buildTunnel(ctx, M, parent, path, o = {}) {
  const R = o.R ?? TUBE_R, cy = o.cy ?? TUBE_CY, s0 = o.s0 ?? 0, mx = o.mirror ? -1 : 1;
  const side = (prof) => (o.mirror ? prof.map(([x, y]) => [-x, y]).reverse() : prof);           // mirrored lateral profile (reversed: the loft keeps its winding)
  const add = (g, mat) => { const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = true; parent.add(m); return m; };
  // lining (profile runs right -> top -> left ...: a closed ring around the axis at height cy)
  add(loft(path, circleProfile(R, cy, o.coarse ? 14 : 28), { us: 1, vs: 1 / 3.2, u0: s0 }), M.lining);
  // track bed (concrete), seen between the rails: a flat strip
  add(loft(path, [[-1.6, -0.06], [1.6, -0.06], [1.6, 0.0], [-1.6, 0.0]].reverse(), { us: 1 / 1.2, vs: 1 / 1.3, flat: true, u0: s0 }), M.bed);      // 1.2 m: divides the 288 m period of the generic tunnel (a wrap must not move the texture)
  // rails + contact rail (thin lofts)
  const rail = (lat, h, w, mat) => add(loft(path, side([[lat - w / 2, 0.0], [lat - w / 2, h], [lat + w / 2, h], [lat + w / 2, 0.0]]), { flat: true }), mat);
  rail(-0.76, 0.17, 0.075, M.railTop); rail(0.76, 0.17, 0.075, M.railTop); rail(1.15 + 0.35, 0.14, 0.12, M.thirdRail);
  // cable tray on the right wall (two shelves) and the left wall conduit
  if (!o.coarse) for (const hh of [1.65, 2.0]) add(loft(path, side([[2.42 - 0.1 * (hh > 1.8), hh], [2.42 - 0.1 * (hh > 1.8), hh + 0.05], [2.12, hh + 0.05], [2.12, hh]].reverse()), { flat: true }), M.cable);
  if (!o.coarse) add(loft(path, side([[-2.5, 2.4], [-2.5, 2.55], [-2.35, 2.55], [-2.35, 2.4]]), { flat: true }), M.steelDark);
  // lamps along the left wall (every `lamps` m, at spacing / 2 + n * spacing of the whole tube: s0), tilted by the local heading
  const spacing = o.lamps ?? 9;
  if (spacing > 0) {
    let acc = (((spacing * 0.5 - s0) % spacing) + spacing) % spacing, total = 0;
    const lamp = new THREE.BoxGeometry(0.34, 0.2, 0.2);
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz); if (len < 1e-6) continue;
      const tx = dx / len, tz = dz / len;
      while (acc <= len) {
        const f = acc / len, x = a[0] + dx * f, y = a[1] + (b[1] - a[1]) * f, z = a[2] + dz * f;
        const m = new THREE.Mesh(lamp, M.lampWarm); m.position.set(x - tz * -2.28 * mx, y + 2.7, z + tx * -2.28 * mx); m.rotation.y = Math.atan2(tx, tz) + Math.PI / 2; m.castShadow = false; parent.add(m);
        acc += spacing;
      }
      acc -= len; total += len;
    }
  }
  let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][2] - path[i - 1][2]);
  return { length: L };
}

/** a long running tunnel (the real link between two stations): the polyline is cut into chunks of ~`chunk` m (each its own set of meshes, so the engine can cull it), coarse lining (14-sided), lamps every 18 m.
 *  The chunks continue the lamp / texture phase of the whole path (o.s0: the path itself starts s0 m along a longer tube). The lamp spacing is noted on the path array (path.lampStep): the ride
 *  aligns the generic tunnel with it (ride.js). */
export function buildLongTunnel(ctx, M, parent, path, o = {}) {
  const chunk = o.chunk ?? 110, n = path.length, lamps = o.lamps ?? 18, s0 = o.s0 ?? 0; let a = 0, total = 0;
  path.lampStep = lamps;
  while (a < n - 1) {
    let b = a, len = 0; while (b < n - 1 && len < chunk) { len += Math.hypot(path[b + 1][0] - path[b][0], path[b + 1][2] - path[b][2]); b++; }
    const g = new THREE.Group(); g.userData.zone = 'tunnel-long'; parent.add(g);
    buildTunnel(ctx, M, g, path.slice(a, b + 1), { coarse: true, lamps, s0: s0 + total, mirror: !!o.mirror }); total += len; a = b;
  }
  return { length: total };
}
