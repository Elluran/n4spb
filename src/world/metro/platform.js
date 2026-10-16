// metro/platform.js — the timetable of a station: per track a train that arrives from the tunnel, stands with open doors, leaves (a PURE function of t + a per-track shift that only changes
// while the track is empty), the train meshes, the door animation and the arrival chime.
//
//   cycle (120 s = the real peak headway of lines 1-4): arrive 14 s (braking from the black end of the tunnel stub) -> dwell 28 s (doors open after 0.5 s, closing during the last 3.5 s) -> depart 12 s -> away
//   track keys: 'S' = the track of trains that run toward +z (higher station index, x = -TRK, right-hand running), 'N' = toward -z (x = +TRK)
//   hidden beyond the "disc": every tunnel stub ends in a black disc `discDist` metres from the hall centre; a train is hidden by it, so only the part inside the hall / stub is ever seen.
//   HOLD: while a ride train uses this track (ride.js: the rider's train stands here or is about to arrive) `tk.override` is set and the scheduled train is not drawn; the ride releases
//   the track with dispatch() (the train just left: the next one comes after a headway) or present() (a rider got off: the hall's own train takes over at the same pose with open doors).
import * as THREE from 'three';
import { makeTrain, trainLength, STOCK } from './train.js';
import { clamp } from './lib.js';

export const TIMING = { arrive: 14, dwell: 28, depart: 12, period: 120 };
const smooth = (t) => clamp(t, 0, 1);

/**
 * st: { id, name, nameEn, frame: {x, z, yaw, y}, stock, line }  hall: { FY, TRK, EDGE, PZ, discDist }
 * protos: (stockId) -> car prototypes
 */
export function createPlatform(ctx, M, st, hall, protos, o = {}) {
  const f = st.frame, FY = hall.FY, stockId = st.stock;
  const tracks = [];
  const group = new THREE.Group(); group.name = 'platform-' + st.id; group.position.set(f.x, 0, f.z); group.rotation.y = f.yaw; group.userData.undergroundOnly = true; group.userData.zone = st.id + '-trains';
  ctx.add(group);
  for (const [i, key] of ['S', 'N'].entries()) {
    const dir = key === 'S' ? 1 : -1;
    const trains = {};
    // the train meshes are built on first use (a station far from the player never pays for them): tk.train is a lazy getter, tk.half / tk.stock are always there
    const make = (sid) => (trains[sid] ||= (() => { const tr = makeTrain(ctx, M, protos(sid)); tr.root.visible = false; group.add(tr.root); try { if (tr.setLine && st.line) tr.setLine(st.line, dir); } catch (e) { /* strip */ } return tr; })());   // the in-car strip once per track
    const tk = { key, dir, xl: -dir * hall.TRK, fy: hall.trackFY?.[key] ?? FY, trains, make, stock: stockId, half: trainLength(STOCK[stockId]) / 2, offset: o.offsets?.[i] ?? (i * 37 + (st.idx || 0) * 11) % TIMING.period, shift: 0, last: null, st, hall, override: false, rideOpen: 0 };
    Object.defineProperty(tk, 'train', { get() { return make(this.stock); }, enumerable: true });
    tracks.push(tk);
  }
  const P = TIMING.period;
  const discOf = (e) => (e > 0 ? (hall.discPos ?? hall.disc) : (hall.discNeg ?? hall.disc));            // distance from the hall centre to the black disc at the +z / -z end

  /** state of a track at time t: { phase, zc (local z of the train centre), open, tau, u, visible } */
  function state(tk, t) {
    const tau = (((t + tk.offset + tk.shift) % P) + P) % P, A = TIMING.arrive, W = TIMING.dwell, De = TIMING.depart, dir = tk.dir, Da = discOf(-dir) + tk.half, Dd = discOf(dir) + tk.half;
    if (tau < A) { const u = tau / A; return { phase: 'arrive', zc: -dir * Da * (1 - u) * (1 - u), open: 0, tau, u, visible: true }; }
    if (tau < A + W) {
      const w = tau - A; const open = w < 0.5 ? 0 : w < 3.0 ? smooth((w - 0.5) / 2.5) : w < W - 3.5 ? 1 : smooth((W - 0.5 - w) / 3.0);
      return { phase: 'dwell', zc: 0, open, tau, u: w / W, visible: true };
    }
    if (tau < A + W + De) { const u = (tau - A - W) / De; return { phase: 'depart', zc: dir * Dd * u * u, open: 0, tau, u, visible: true }; }
    return { phase: 'away', zc: dir * Dd, open: 0, tau, u: 0, visible: false };
  }
  /** seconds until the standing train of this track starts closing its doors (null when no train stands here) */
  function dwellLeft(tk, t) { const s = state(tk, t); if (s.phase !== 'dwell') return null; return Math.max(0, TIMING.arrive + TIMING.dwell - 3.5 - s.tau); }
  /** make the track's train leave now (the ride train of this track has just departed): the next arrival comes after the rest of the period */
  function dispatch(tk, t) { const tau = (((t + tk.offset + tk.shift) % P) + P) % P; tk.shift += (TIMING.arrive + TIMING.dwell + TIMING.depart + 0.01) - tau; }
  /** make a train stand here with open doors (a rider has just got off): it leaves after the normal rest of a dwell */
  function present(tk, t) { const tau = (((t + tk.offset + tk.shift) % P) + P) % P; tk.shift += (TIMING.arrive + 3.5) - tau; }
  const cam = ctx.camera.position;
  let active = false, tubeAt = null; const tubes = {};         // setTubeAt: (tk, e) -> { L, at(s) } of the real tube beyond end e (ride.js endTube), cached per track and end
  const place = (tk, s) => {
    if (!s.visible) { const tr0 = tk.trains[tk.stock]; if (tr0) tr0.root.visible = false; return; }
    const tr = tk.train;
    tr.root.visible = true;
    // arriving / departing trains follow the real tube beyond the mouth where there is one (ride.js endTube); the group is the hall frame, so world poses are converted to it
    const e = s.phase === 'arrive' ? -tk.dir : s.phase === 'depart' ? tk.dir : 0, key = tk.key + e;
    const tube = e && tubeAt ? (key in tubes ? tubes[key] : (tubes[key] = tubeAt(tk, e))) : null;
    if (!tube) tr.placeStraight(tk.xl, tk.fy, s.zc, tk.dir > 0 ? 0 : Math.PI);
    else {
      const c = Math.cos(f.yaw), sn = Math.sin(f.yaw), mouth = hall.mouth;
      tr.placePath((sCar) => {
        const z = tk.dir * sCar;
        if (Math.abs(z) <= mouth) return { x: tk.xl, y: tk.fy, z, yaw: tk.dir > 0 ? 0 : Math.PI };
        const p = tube.at(Math.min(tube.L, Math.abs(z) - mouth)), dx = p.x - f.x, dz = p.z - f.z;
        return { x: dx * c - dz * sn, y: p.y, z: dx * sn + dz * c, yaw: p.yaw - f.yaw };
      }, tk.dir * s.zc);
    }
    tr.setDoors(s.open, 1);
    // cars that are wholly behind a black disc are not drawn at all: behind a short stub they would stand in the air space of a neighbouring hall (they were seen through the vault of Vosstaniya)
    for (const c of tr.cars) { const z = c.node.position.z; c.node.visible = Math.abs(z) - tr.stock.len / 2 < discOf(z > 0 ? 1 : -1); }
  };
  ctx.onUpdate((dt, t) => {
    const near = Math.hypot(cam.x - f.x, cam.z - f.z) < hall.activeRadius && Math.abs(cam.y - FY) < 40;                 // (a two-level station keeps both levels within this range)
    if (!near && !active) return;
    active = near;
    for (const tk of tracks) {
      const s = state(tk, t); const prev = tk.last; tk.last = s;
      if (tk.override) { const tr0 = tk.trains[tk.stock]; if (tr0) tr0.root.visible = false; continue; }                          // held: the ride train replaces it
      place(tk, s);
      if (near && prev && prev.phase !== s.phase && s.phase === 'arrive') {
        // the platform announcement («Прибывает поезд…») only for somebody standing in THIS hall (the halls of a transfer node lie within each other's active radius)
        const dx = cam.x - f.x, dz = cam.z - f.z, lx = dx * Math.cos(f.yaw) - dz * Math.sin(f.yaw), lz = dx * Math.sin(f.yaw) + dz * Math.cos(f.yaw), inHall = Math.abs(lx) < (hall.WALL || hall.TRK + 4) && Math.abs(lz) < hall.PZ + 2 && Math.abs(cam.y - tk.fy) < 6 && !(ctx.playerObj && ctx.playerObj.riding);
        if (inHall) { if (o.onArrive) o.onArrive(tk, s); else ctx.ui?.toast?.('Прибывает поезд. Отойдите от края платформы за ограничительную линию.'); }
        try { ctx.audio?.play?.('chime' + (tk.key === 'S' ? 0 : 1), { position: { x: f.x, y: FY + 2, z: f.z }, volume: 0.22 }); } catch (e) { /* silent */ }   // one soft two-note chime (never an alarm)
      }
    }
  });
  return { st, tracks, state, dwellLeft, dispatch, present, group, hall, TIMING, setTubeAt(fn) { tubeAt = fn; for (const k in tubes) delete tubes[k]; }, trackByKey: (k) => tracks.find((x) => x.key === k), setStock(tk, sid) { if (sid === tk.stock) return; const old = tk.trains[tk.stock]; if (old) old.root.visible = false; tk.stock = sid; tk.half = trainLength(STOCK[sid]) / 2; } };
}
export { STOCK, trainLength };
