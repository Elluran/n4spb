// landmarksSeaTerminal/fence.js - fence runs of the module along OSM polylines in WORLD metres (the Parts collector must be in the identity frame): the black steel yard fence of the D-2 museum, the green welded-mesh
// panels of the port perimeter (posts every 3 m on white foot blocks), the galvanised ribbed hoarding of the Lenexpo site (panels 2.0 m on steel posts, a few shortened panels: "flimsy").  Every run is SOLID
// (thin colliders flagged `fence` like streets/barriers.js addFenceBoxes, so the people module treats them as walls), cut by gates (a gap of 2 x gateHalf round each gate point, which stays open).
import { BARRIERS } from '../data/city.js';
import { coverFn } from './frame.js';

/** pts of a baked barrier by id (world, flat [x, z, ...]) or null */
export function barrierPts(id) { const b = BARRIERS.find((q) => q.id === id); return b && b.pts ? b.pts : null; }

const KINDS = {
  iron: { h: 1.2, step: 2.4, solidH: 1.3, thick: 0.12 },
  mesh: { h: 2.0, step: 3.0, solidH: 2.0, thick: 0.12 },
  hoard: { h: 2.0, step: 3.0, solidH: 2.1, thick: 0.15 },
};

/** draw + collide a fence run. o = { kind, gates: [[x, z]...], gateHalf, id }.  Returns the number of drawn pieces. */
export function fenceRun(K, pts, o = {}) {
  const P = K.P, M = K.M, ph = K.ctx.physics, cfg = KINDS[o.kind || 'iron'], gates = o.gates || [], gh = o.gateHalf || 2.0, cover = coverFn(K.ctx), closed = o.closed ?? (o.kind === 'hoard');
  let pieces = 0;
  const nearGate = (x, z) => gates.some((g) => Math.hypot(g[0] - x, g[1] - z) < gh);
  const matPost = o.kind === 'mesh' ? M.meshPost : o.kind === 'hoard' ? M.hoardPost : M.yardFence;
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3], dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const ux = dx / len, uz = dz / len, rot = Math.atan2(-uz, ux), n = Math.max(1, Math.round(len / cfg.step)), st = len / n;
    // pieces between posts; a piece whose middle is within a gate radius is left out (the gate is open)
    // road integrity (docs/AGENT-BRIEF.md): nothing stands on a carriageway.  Where an OPEN fence line (the port fence, the museum yard fence) crosses real asphalt (the disused trolleybus loop, a service road) the piece
    // is left out = an open vehicle gate, and no post / foot block stands within 0.3 m of the asphalt edge (net.cover > -0.3).  CLOSED runs (o.closed: the Lenexpo hoarding with its four closed gates, the quay
    // closure) are the documented exception: a real closed gate across a private road, drawn and solid.
    const onRoad = (x, z, m) => cover(x, z) > -m;
    const live = [];
    for (let k = 0; k < n; k++) {
      const mx = ax + ux * (k + 0.5) * st, mz = az + uz * (k + 0.5) * st, ex0 = ax + ux * k * st, ez0 = az + uz * k * st, ex1 = ax + ux * (k + 1) * st, ez1 = az + uz * (k + 1) * st;
      const road = !closed && (onRoad(mx, mz, 0.15) || onRoad(ex0, ez0, 0.15) || onRoad(ex1, ez1, 0.15));
      if (road) { K.svc.fenceRoadGaps = (K.svc.fenceRoadGaps || 0) + 1; if (typeof process !== 'undefined' && process.env && process.env.SEATERM_DEBUG) console.log(`[landmarksSeaTerminal] fence ${o.id || '?'} piece at (${mx.toFixed(1)}, ${mz.toFixed(1)}) left out: asphalt (cover ${cover(mx, mz).toFixed(2)})`); }
      live.push(!nearGate(mx, mz) && !road);
    }
    for (let k = 0; k < n; k++) {
      if (!live[k]) continue;
      const x0 = k * st, x1 = (k + 1) * st;
      P.push(ax, 0, az, rot);
      try {
        if (o.kind === 'iron') {
          P.box(M.yardFence, x0 + 0.04, x1 - 0.04, 0.32, 1.12, -0.015, 0.015, 'b', 1);         // the panel with its recessed rectangle
          P.box(M.yardFence, x0, x1, 1.12, 1.2, -0.03, 0.03, 'b', 1); P.box(M.yardFence, x0, x1, 0.24, 0.32, -0.03, 0.03, 'b', 1);
          P.box(M.pole, x0 + 0.2, x1 - 0.2, 0.0, 0.24, -0.1, 0.1, 'b', 2);                      // the low grey base
        } else if (o.kind === 'mesh') {
          P.quad(M.meshPanel, [x0, 0.3, 0], [x1, 0.3, 0], [x1, 2.0, 0], [x0, 2.0, 0], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]]);
        } else {                                                                                // hoarding: shortened panels every 13th piece (a dent), deterministic
          const low = ((i / 2 + k) * 7) % 13 === 5, hh = low ? 1.6 : 2.0;
          P.box(M.hoard, x0 + 0.03, x1 - 0.03, 0.0, hh, -0.03, 0.03, 'b', 2);
          P.box(M.hoardPost, x0 + 0.03, x1 - 0.03, hh, hh + 0.05, -0.05, 0.05, 'b', 1);
        }
        // posts at both ends of the piece
        for (const x of [x0, x1]) {
          const roadPost = onRoad(ax + ux * x, az + uz * x, 0.3);
          if (!closed && roadPost) continue;                                                                      // an open run: no post / foot block on the asphalt
          if (o.kind === 'iron') P.box(matPost, x - 0.04, x + 0.04, 0, 1.28, -0.04, 0.04, 'b', 1);
          else if (o.kind === 'mesh') { P.box(matPost, x - 0.04, x + 0.04, 0.3, 2.1, -0.04, 0.04, 'b', 1); if (!roadPost) P.box(M.footBlock, x - 0.3, x + 0.3, 0, 0.3, -0.2, 0.2, 'b', 1); }
          else P.box(matPost, x - 0.05, x + 0.05, 0, 2.25, -0.07, 0.07, 'b', 1);
        }
        pieces++;
      } finally { P.pop(); }
    }
    // colliders: merge consecutive live pieces into boxes of at most 14 m
    let k = 0;
    while (k < n) {
      if (!live[k]) { k++; continue; }
      let e = k; while (e + 1 < n && live[e + 1] && (e + 1 - k + 1) * st <= 14) e++;
      const s0 = k * st, s1 = (e + 1) * st, m = (s0 + s1) / 2, box = ph.addBox(ax + ux * m, az + uz * m, s1 - s0, cfg.thick, rot, 0, cfg.solidH);
      box.fence = true; k = e + 1;
    }
    K.svc.fences.push({ id: o.id || '', pts: [[ax, az], [bx, bz]], solid: true, gates: gates.length });
  }
  return pieces;
}
