// metro/ride.js — boarding, the ride and getting off (docs/UNDERGROUND.md section 5; docs/METRO.md "How rides work").
//
//   A ride is a SESSION with a CHAIN OF LEGS: the train the rider boarded runs to the END OF ITS LINE in its direction and stops at EVERY station on the way, in real time
//   (run times HOPS from the research, dwell 25 s / 35 s at interchanges). The rider may get off at any stop ([E] or by walking out through the platform-side door); nothing is
//   chosen on a map: orientation is by the signs in the halls, the in-car line strip and the announcements, as in the real metro.
//   Everything the rider sees is a pure function of t: leg k has fixed times tClose_k (doors start closing) / tDepart_k / tArrive_k; between tArrive_k and tClose_{k+1} the train
//   stands at stop k with open doors. The frame of the rider's car (handed to player.board) and every car of the train are placed from leg k's route (`route.pose(s, sc)`):
//   the straight in the origin hall + its stub, then the REAL tunnel (an OSM polyline) or the shared GENERIC tunnel (a straight periodic tube), then the destination stub + hall.
//   Stations without a hall of their own are shown in the shared generic hall, which is re-labelled for the next stop while the train is in the tunnel.
//   Platform timetables: the track of every stop is HELD (its scheduled train hidden) from the start of the leg until the ride train leaves that stop, so two trains never overlap.
import * as THREE from 'three';
import { carOffset, trainLength, STOCK } from './train.js';
import { BY_ID } from './net.js';
import { clamp } from './lib.js';
import { STUB_EXT } from './stubs.js';

const A_ACC = 1.2;                       // m/s^2 (81-717 service acceleration)
const DOOR_T = 3.0, DEPART_T = 3.5;      // doors close during the first 3 s of a leg, the train leaves at 3.5 s
const OPEN_DELAY = 1.0, OPEN_T = 2.5;    // doors start opening 1 s after the stop and are fully open 2.5 s later
const RIDER_MARGIN = 1.0;                // m: the whole train jumps (stub / tube <-> generic tunnel) when the rider's car is wholly behind the disc of its track by this much
const LAMP_PERIOD = 18;                  // m: lamps every 9 m, lining rings every 1 m, bed texture 1.2 m: every tube repeats every 18 m (the generic tunnel wraps by 288 = 16 x 18)
const pmod = (a, m) => ((a % m) + m) % m;
const DOOR_Z = [-6.6, -2.2, 2.2, 6.6];   // door centres along a car (train.js)

/** trapezoid motion profile over distance D in time T (a, vmax): returns fn(u) -> { s, v } */
export function motionProfile(D, T, a = A_ACC) {
  const disc = a * a * T * T - 4 * a * D;
  let vmax, ta, tc;
  if (disc >= 0) { vmax = (a * T - Math.sqrt(disc)) / 2; ta = vmax / a; tc = T - 2 * ta; }
  else { ta = T / 2; vmax = a * ta; tc = 0; D = a * ta * ta; }
  const sa = 0.5 * a * ta * ta;
  const fn = (u) => {
    if (u <= 0) return { s: 0, v: 0 };
    if (u < ta) return { s: 0.5 * a * u * u, v: a * u };
    if (u < ta + tc) return { s: sa + vmax * (u - ta), v: vmax };
    if (u < T) { const r = T - u; return { s: D - 0.5 * a * r * r, v: a * r }; }
    return { s: D, v: 0 };
  };
  fn.D = D; fn.vmax = vmax; fn.ta = ta; fn.tc = tc; return fn;
}

/** min run time for a distance at the game acceleration (bang-bang with a little cruise) */
export const minRunTime = (D, a = A_ACC) => 2 * Math.sqrt(D / a) * 1.12;

/**
 * env: { stations: { id -> rt }, generic: { rt, tunnel }, real: { 'a>b': { path, length, partial? } }, net, resolve(def, tk, { show }), showGeneric(def), toast(ru, en),
 *        makeSessionTrain(stockId), addSessionTrain, removeSessionTrain, onRideStart(route, session), onRideEnd(), onAlight(session), onLegStart?(leg, session) }
 *   rt = { id, def, frame, hall: { FY, TRK, EDGE, PZ, mouth, disc / discPos / discNeg, openings? }, platform, W(lx, lz), L(x, z) }
 */
export function createRide(ctx, M, env) {
  const player = () => ctx.playerObj;
  const cam = ctx.camera.position;
  const NET = env.net;
  let session = null;

  // ---------------------------------------------------------------- route construction (one leg)
  function hallPose(rt, tk, z) { const [x, zz] = rt.W(tk.xl, z); return { x, y: tk.fy ?? rt.hall.FY, z: zz, yaw: rt.frame.yaw + (tk.dir > 0 ? 0 : Math.PI) }; }   // tk.fy: the level of this track (two-level Sportivnaya)

  /**
   * samples a polyline by path length; the heading is interpolated between the segment headings (no yaw steps at the vertices). yIn / yOut (optional): the heading of the straight before /
   * after the path (the hall axis): the first / last half segment turns from / to it, so leaving and entering a hall has no yaw step either (the L1 tube left Vosstaniya with a 4.5 deg step).
   * Consecutive points closer than 5 cm are dropped (a zero-length segment has no heading); the last point is kept exactly.
   */
  function pathSampler(path, yIn = null, yOut = null) {
    const pts = [], last = path[path.length - 1];
    for (const p of path) { const q = pts[pts.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[2] - q[2]) >= 0.05) pts.push(p.slice()); }
    if (pts.length > 1) pts[pts.length - 1] = last.slice(); else pts.push([last[0], last[1], last[2] + 1e-3]);
    const n = pts.length, cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][2] - pts[i - 1][2]));
    const L = cum[n - 1];
    const segYaw = (i) => { const a = pts[i], b = pts[i + 1]; return Math.atan2(b[0] - a[0], b[2] - a[2]); };
    const lerpAngle = (a, b, f) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * f; };
    return { L, at(s) {
      s = clamp(s, 0, L); let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] <= s) lo = mid; else hi = mid; }
      const segL = Math.max(1e-6, cum[hi] - cum[lo]), f = (s - cum[lo]) / segL, a = pts[lo], b = pts[hi];
      // heading: blend from the previous segment (or yIn) over the first half and toward the next (or yOut) over the second half of this segment
      const y0 = segYaw(lo);
      const yaw = f < 0.5 ? (lo > 0 ? lerpAngle(lerpAngle(segYaw(lo - 1), y0, 0.5), y0, f * 2) : yIn !== null ? lerpAngle(yIn, y0, f * 2) : y0)
        : (hi < n - 1 ? lerpAngle(y0, lerpAngle(y0, segYaw(hi), 0.5), (f - 0.5) * 2) : yOut !== null ? lerpAngle(y0, yOut, (f - 0.5) * 2) : y0);
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, z: a[2] + (b[2] - a[2]) * f, yaw };
    } };
  }

  /**
   * one leg: from hall `from` (station def `fromDef`) on track tk to the station `to` shown in `destRt` / `destTk`; T_run = the real running time of the hop (net.hopSeconds).
   * carIndex: the rider's car (route.setRider(i) later; default the middle car, as the audit samples it).
   * Pieces: the ORIGIN piece (hall straight, then the real tube that leaves this mouth on this track, else the straight stub) and the DESTINATION piece (the stub or the real tube that arrives
   * at the mouth, then the hall straight). A REAL leg runs its tube from mouth to mouth. Otherwise the WHOLE train jumps into the shared generic tunnel at the moment the rider's car is
   * wholly behind the disc of its own track (by RIDER_MARGIN: JO), and out of it when the rider's car is that far behind the destination disc (JD); before / after the jump the cars beyond
   * the end of the drawn tube (stub + the 40 m behind its disc, the end of a partial tube) are not drawn (pose.hidden, placeTrain applies it). The discs of the rider's track are hidden
   * during the leg (metro.js env.onLegStart), so the rider never meets a black wall.
   * LAMP PHASE (the jump must not move anything around the rider): the generic tunnel (x = x0 + gb + (s - JO) - k 288, lamps at x0 + 4.5 + 9 n) is entered at
   *   from a stub (lamps at 4.5 + 9 n m from the mouth; the part behind the disc continues them):  gb = a (mod 18)          a = rider's distance from the mouth at the jump
   *   from a real tube (lamps at lamp.at0 + n step of its travel order, step 9 or 18):               gb = p - at0 + 4.5 (mod 9)  p = rider's distance along the tube
   *   and the generic run (rider's metres in it) is lengthened by < 18 m so that at the arrival jump
   *   into a stub (mirrored: lamps on the left of the travel as in the generic tunnel):              gb + run = -a (mod 18)
   *   into a real tube:                                                                              gb + run = p - at0 + 4.5 (mod 9)
   *   (18 m = lamps 9 x rings 1 x bed 1.2; a wrap by 288 = 16 x 18 keeps it). An 18 m tube keeps its lamps but the generic tunnel shows one more between them.
   */
  /** the rail-foot point of the mouth of track k at end e (+1 / -1 local z) of rt, and the real tube (env.real) that starts (atEnd false) / ends (atEnd true) there */
  const mouthPt = (rt, k, e) => { const [x, z] = rt.W(k.xl, e * rt.hall.mouth); return [x, (k.fy ?? rt.hall.FY) - 1.1, z]; };
  const linkAt = (pt, atEnd) => { for (const Lk of Object.values(env.real)) { const p = atEnd ? Lk.path[Lk.path.length - 1] : Lk.path[0]; if (Math.hypot(p[0] - pt[0], p[2] - pt[2]) < 1.5 && Math.abs(p[1] - pt[1]) < 1.5) return Lk; } return null; };
  /** for the platform timetable (platform.js setTubeAt): the tube beyond end e of track tk of rt as { L, at(s) } -> world car pose at s metres beyond the mouth along the travel direction
   *  of this track (trains leave through end +dir, where a tube STARTS, and arrive through end -dir, where a tube ENDS), or null where the end is a straight stub */
  function endTube(rt, tk, e) {
    const atEnd = e === -tk.dir, Lk = linkAt(mouthPt(rt, tk, e), atEnd); if (!Lk) return null;
    const yawHall = rt.frame.yaw + (tk.dir > 0 ? 0 : Math.PI), smp = pathSampler(Lk.path, atEnd ? null : yawHall, atEnd ? yawHall : null);
    return { L: smp.L, at: (s) => { const p = smp.at(atEnd ? smp.L - s : s); return { x: p.x, y: p.y + 1.1, z: p.z, yaw: p.yaw }; } };
  }
  function makeRoute(from, fromDef, tk, to, destRt, destTk, carIndex) {
    const dir = tk.dir, st = STOCK[tk.stock], half = trainLength(st) / 2, carHalf = st.len / 2, G = env.generic.tunnel;
    const real = env.real[fromDef.id + '>' + to.id], full = !!(real && !real.partial);
    const dOf = (h, e) => (e > 0 ? (h.discPos ?? h.disc) : (h.discNeg ?? h.disc));
    const mouthO = from.hall.mouth, discO = dOf(from.hall, dir), mouthD = destRt.hall.mouth, discD = dOf(destRt.hall, -destTk.dir);
    const yawO = from.frame.yaw + (dir > 0 ? 0 : Math.PI), yawD = destRt.frame.yaw + (destTk.dir > 0 ? 0 : Math.PI);
    const hopT = NET.hopSeconds(fromDef.line, fromDef.idx, to.idx);
    // the real tube that starts at the origin mouth / ends at the destination mouth of these tracks (a generic leg through such an end follows it up to the jump)
    const tubeO = real || linkAt(mouthPt(from, tk, dir), false), tubeD = full ? null : linkAt(mouthPt(destRt, destTk, -destTk.dir), true);
    const smpO = tubeO ? pathSampler(tubeO.path, yawO, full ? yawD : null) : null, smpD = tubeD ? pathSampler(tubeD.path, null, yawD) : null;
    const onTube = (smp, x) => { const p = smp.at(x); return { x: p.x, y: p.y + 1.1, z: p.z, yaw: p.yaw }; };
    const originAt = (s) => (smpO && s > mouthO ? onTube(smpO, s - mouthO) : hallPose(from, tk, dir * s));
    const destAt = (s) => { const u = S_end - s; return smpD && u > mouthD ? onTube(smpD, smpD.L - (u - mouthD)) : hallPose(destRt, destTk, destTk.dir * (s - S_end)); };
    let S_end, T_run, pose, gen = null, limO = Infinity, limD = Infinity, route = null;
    if (full) {
      S_end = mouthO + smpO.L + mouthD; T_run = Math.max(hopT, minRunTime(S_end));
      pose = (s) => (s <= mouthO + smpO.L ? originAt(s) : hallPose(destRt, destTk, destTk.dir * (s - S_end)));
    } else {
      // jump points (the rider's car centre): wholly behind the origin disc (a stub, a real end, or the free-end disc of a PARTIAL tube: links-vo.js) / the destination disc by RIDER_MARGIN
      const aO = (real ? real.partial.discS : discO - mouthO) + carHalf + RIDER_MARGIN, aD = discD - mouthD + carHalf + RIDER_MARGIN, JO = mouthO + aO, JD = mouthD + aD;
      limO = mouthO + (smpO ? smpO.L : discO - mouthO + STUB_EXT); limD = mouthD + (smpD ? smpD.L : discD - mouthD + STUB_EXT);
      const lampOf = (Lk) => Lk.lamp || { step: Lk.path.lampStep || 18, at0: (Lk.path.lampStep || 18) / 2 };
      const [tO, mO] = smpO ? [aO - lampOf(tubeO).at0 + 4.5, 9] : [aO, LAMP_PERIOD];
      const [tD, mD] = smpD ? [smpD.L - aD - lampOf(tubeD).at0 + 4.5, 9] : [-aD, LAMP_PERIOD];
      const gb = G.gbase + pmod(tO - G.gbase, mO), fit = (run) => run + pmod(tD - gb - run, mD);
      let run;
      if (real) { run = fit(120); S_end = JO + run + JD; T_run = Math.max(hopT, minRunTime(S_end)); }
      else {
        T_run = Math.max(30, hopT);
        const vTarget = 20;                                                               // m/s cruise in the generic tunnel (72 km/h)
        run = fit(Math.max(80, vTarget * (T_run - vTarget / A_ACC) - JO - JD)); S_end = JO + run + JD;
        T_run = Math.max(T_run, minRunTime(S_end));                                       // the profile must reach S_end (the arrival lamp phase depends on it)
      }
      gen = { JO, JD, G, gb, run, limO, limD };
      pose = (s, sc) => {
        const sr = sc + carOffset(st, route.rider);                                        // the rider's car decides for the whole train
        if (sr < JO) return s + carHalf <= limO + 0.5 ? originAt(s) : { ...originAt(Math.min(s, limO)), hidden: true };
        if (S_end - sr <= JD) { const u = S_end - s; return u + carHalf <= limD + 0.5 ? destAt(s) : { ...destAt(S_end - Math.min(u, limD)), hidden: true }; }
        // generic tunnel: the train centre at gc = gb + sc - JO; the whole train wraps back by one period when it goes past `ghi`
        const gc = gb + (sc - JO), k = gc > G.ghi ? Math.floor((gc - G.ghi) / G.loop) + 1 : 0;
        return { x: G.x0 + gb + (s - JO) - k * G.loop, y: G.y, z: G.z0, yaw: Math.PI / 2 };
      };
    }
    /** [x, y, z, s]: the floor-level path of the train outside the generic tunnel, every `step` m (metro.js finds the discs on it) */
    const trace = (step = 2) => {
      const out = [], push = (s, p) => out.push([p.x, p.y, p.z, s]);
      if (full) { for (let s = 0; s <= S_end; s += step) push(s, pose(s)); return out; }
      for (let s = 0; s <= limO; s += step) push(s, originAt(s));
      for (let s = Math.max(0, S_end - limD); s <= S_end; s += step) push(s, destAt(s));
      return out;
    };
    const profile = motionProfile(S_end, T_run);
    route = { from, fromDef, tk, to, destRt, destTk, dir, stock: st, half, S_end, pose, profile, T_run, real: !!real, partial: !!(real && real.partial), gen, trace, RIDER_MARGIN,
      rider: clamp(Math.round(carIndex ?? Math.floor(st.cars / 2)), 0, st.cars - 1), setRider(i) { route.rider = clamp(Math.round(i), 0, st.cars - 1); return route; } };
    return route;
  }

  // ---------------------------------------------------------------- the chain of legs
  /** the chain of stops ahead of the train on track tk of station rt: [{ def, rt, tk }] up to the terminus */
  function chainAhead(fromRt, tk) {
    const from = BY_ID[fromRt.def.id], out = [];
    for (const def of NET.ahead(from, tk.dir)) { const r = env.resolve(def, tk, { show: false }); out.push({ def, rt: r.destRt, tk: r.destTk }); }
    return out;
  }
  /** builds the legs with their fixed times from the boarding time t0 and the departure wait `wait` (s) */
  function buildLegs(fromRt, tk, t0, wait) {
    const legs = []; let cur = { def: BY_ID[fromRt.def.id], rt: fromRt, tk }, tClose = t0 + wait;
    for (const next of chainAhead(fromRt, tk)) {
      const route = makeRoute(cur.rt, cur.def, cur.tk, next.def, next.rt, next.tk);
      const tDepart = tClose + DEPART_T, tArrive = tDepart + route.T_run, dwell = NET.dwellSeconds(next.def);
      legs.push({ from: cur.rt, fromDef: cur.def, tk: cur.tk, to: next.def, destRt: next.rt, destTk: next.tk, route, tClose, tDepart, tArrive, tOpen: tArrive + OPEN_DELAY + OPEN_T, dwell, terminus: false });
      tClose = tArrive + dwell; cur = next;
    }
    if (legs.length) legs[legs.length - 1].terminus = true;
    return legs;
  }

  const sessionTrains = {};
  const trainFor = (stockId) => (sessionTrains[stockId] ||= env.makeSessionTrain(stockId));

  /** state of the session at time t: { k (leg index, -1 = still at the origin before the first closing), u, s (centre, along leg k), v, open, phase, leg } */
  function stateAt(S, t) {
    const legs = S.legs;
    if (!legs.length) return { k: -1, u: 0, s: 0, v: 0, open: 1, phase: 'boarding', leg: null };
    let k = -1; for (let i = 0; i < legs.length; i++) { if (t >= legs[i].tClose) k = i; else break; }
    if (k < 0) return { k: -1, u: t - legs[0].tClose, s: 0, v: 0, open: 1, phase: 'boarding', leg: null };
    const leg = legs[k], u = t - leg.tClose, ur = u - DEPART_T, P = leg.route.profile;
    let s = 0, v = 0, phase, open;
    if (u < DOOR_T) { open = 1 - clamp(u / DOOR_T, 0, 1); phase = 'closing'; }
    else open = 0, phase = 'waiting';
    if (ur > 0) { const r = P(ur); s = r.s; v = r.v; phase = ur < leg.route.T_run ? 'running' : 'stopped'; }
    if (ur >= leg.route.T_run) { const w = ur - leg.route.T_run; open = w < OPEN_DELAY ? 0 : clamp((w - OPEN_DELAY) / OPEN_T, 0, 1); phase = open > 0.95 ? 'open' : 'stopped'; }
    return { k, u, ur, s, v, open, phase, leg };
  }
  /** the route whose geometry applies at state st (before the first leg: leg 0 standing at s = 0) */
  const routeAt = (S, st) => (st.leg || S.legs[0]).route;

  /** the pose of the rider's car at time t (the frame handed to player.board) */
  function carFrame(S, t) {
    const st = stateAt(S, t), R = routeAt(S, st), off = carOffset(R.stock, S.car), p = R.pose(st.s + off, st.s);
    return { x: p.x, y: p.y, z: p.z, yaw: p.yaw };
  }

  function placeTrain(S, t) {
    const st = stateAt(S, t), R = routeAt(S, st), hid = [];
    S.train.placePath((s) => { const p = R.pose(s, st.s); hid.push(!!p.hidden); return p; }, st.s);                    // (placePath walks the cars in order 0..n-1)
    for (let i = 0; i < S.train.cars.length; i++) S.train.cars[i].node.visible = !hid[i];                             // cars beyond the end of the drawn tube around a jump (makeRoute)
    S.train.setDoors(st.open, 1);
    // closed-type halls draw platform doors in the wall: they follow the doors of the ride train while it stands at a hall
    const standTk = st.phase === 'boarding' || st.phase === 'closing' ? (st.leg ? st.leg.tk : S.legs[0]?.tk) : (st.phase === 'stopped' || st.phase === 'open') && st.leg ? st.leg.destTk : null;
    for (const tk of S.held) tk.rideOpen = tk === standTk ? st.open : 0;
    S.state = st; S.route = R; S.to = st.leg ? st.leg.to : S.legs[0]?.to; S.destRt = st.leg ? st.leg.destRt : S.legs[0]?.destRt; S.destTk = st.leg ? st.leg.destTk : S.legs[0]?.destTk; S.tk = st.leg ? st.leg.tk : S.legs[0]?.tk;
    return st;
  }

  // ---- holding tracks: the scheduled train of a held track is hidden while the ride train uses that hall
  function hold(S, tk) { if (!tk || S.held.has(tk)) return; S.held.add(tk); tk.override = true; const tr0 = tk.trains[tk.stock]; if (tr0) tr0.root.visible = false; }
  function release(S, tk, how, t) { if (!tk || !S.held.has(tk)) return; S.held.delete(tk); tk.override = false; tk.rideOpen = 0; const pf = S.platformOf.get(tk); if (pf) { if (how === 'present') pf.present(tk, t); else pf.dispatch(tk, t); } }

  function update(dt, t) {
    const S = session; if (!S) return;
    const prevK = S.state ? S.state.k : -2, prevPhase = S.state ? S.state.phase : null;
    const st = placeTrain(S, t);
    // leg bookkeeping: entering leg k (doors closing at stop k-1): hold the destination track for the whole leg, release the origin track when the train has left
    if (st.k !== prevK && st.leg) { hold(S, st.leg.destTk); S.announced = new Set(); try { if (S.train.setStop) S.train.setStop(st.leg.to.idx); } catch (e) { /* strip */ } env.onLegStart && env.onLegStart(st.leg, S); }
    if (st.leg && (st.phase === 'running' || st.phase === 'waiting') && S.held.has(st.leg.tk) && st.ur > 0.5 && st.leg.tk !== st.leg.destTk) release(S, st.leg.tk, 'dispatch', t);   // (generic -> generic legs share one track object: it stays held)
    // the generic hall shows the next stop while the train is in the tunnel (nobody sees the swap)
    if (st.leg && st.phase === 'running' && st.leg.destRt === env.generic.rt && env.generic.rt.shownId !== st.leg.to.id && st.ur > 6) env.showGeneric(st.leg.to);
    stepOutCheck(S, st);
    // announcements (text + the soft chime of the platform; nothing alarm-like)
    const said = S.announced, announce = (key, ru, en) => { if (said.has(key)) return; said.add(key); env.toast(ru, en); };
    if (st.leg && st.u > 0.4 && st.u < 2.5) announce('close', 'Осторожно, двери закрываются.', 'Mind the doors.');
    if (st.leg && (st.phase === 'stopped' || st.phase === 'open')) announce('arrive', arrivalText(st.leg), st.leg.to.nameEn + (st.leg.terminus ? '. Terminus' : ''));
    void prevPhase; void dt;
  }
  /** the current Petersburg wording: «Станция «X», переход на линию N, следующая станция «Y».» / terminus */
  function arrivalText(leg) {
    const to = leg.to, parts = ['Станция «' + to.name + '»'];
    const tr = (to.transfer || []).map((id) => BY_ID[id]).filter(Boolean);
    if (tr.length) parts.push('переход на ' + tr.map((q) => 'линию ' + q.line).join(' и '));
    if (to.note && /вокзал/i.test(to.note)) parts.push('выход к ' + to.note.replace(/^(\S+) вокзал$/, (m, a) => a.replace(/ий$/, 'ому') + ' вокзалу'));
    if (leg.terminus) return 'Уважаемые пассажиры! Не забывайте свои вещи в вагонах электропоезда. Поезд прибыл на конечную станцию «' + to.name + '».';
    const next = session && session.legs[session.legs.indexOf(leg) + 1];
    if (next) parts.push('следующая станция «' + next.to.name + '»');
    return parts.join(', ') + '.';
  }

  /** the rider gets off at the hall where the train stands (any stop with open doors, or the origin before departure) */
  function alight() {
    const S = session; if (!S) return;
    const st = stateAt(S, ctx.time);
    const standing = st.phase === 'open' || st.phase === 'boarding' || st.phase === 'closing';
    if (!standing) return;
    const atOrigin = st.k < 0 || st.phase === 'closing', leg = st.leg || S.legs[0];
    const rt = atOrigin ? leg.from : leg.destRt, tk = atOrigin ? leg.tk : leg.destTk, R = leg.route;
    const off = carOffset(R.stock, S.car), lc = player().ride && player().ride.local;
    const carZ = atOrigin ? tk.dir * (off + (lc ? lc.z : 0)) : tk.dir * (st.s + off - R.S_end + (lc ? lc.z : 0));
    putOnPlatform(rt, tk, carZ);
    S.train.root.visible = false; env.removeSessionTrain(S.train);
    const t = ctx.time;
    for (const h of [...S.held]) release(S, h, h === tk ? 'present' : 'dispatch', t);          // the hall's own train takes over at the same place with open doors
    if (rt.onArrive && !atOrigin) rt.onArrive(rt, leg.to);
    const done = session; session = null; env.onRideEnd && env.onRideEnd(); env.onAlight && env.onAlight(done);
  }

  /** the player (physically) steps off a standing train onto the platform of rt / tk at car z `carZ` (hall z) */
  function putOnPlatform(rt, tk, carZ) {
    const FY = tk.fy ?? rt.hall.FY, lx = -tk.dir * (rt.hall.EDGE - 1.2), op = rt.hall.openings, zz = op ? op.z0 + Math.round((carZ - op.z0) / op.step) * op.step : carZ, [wx, wz] = rt.W(lx, clamp(zz, -rt.hall.PZ + 4, rt.hall.PZ - 4));
    const fx = tk.dir > 0 ? 1 : -1, c = Math.cos(rt.frame.yaw), s = Math.sin(rt.frame.yaw), yawDeg = Math.atan2(-(fx * c), -(-fx * s)) * 180 / Math.PI;
    player().alight({ x: wx, y: FY, z: wz, yaw: yawDeg });
  }
  /** aboard a standing train: walking into the platform-side door steps out */
  function stepOutCheck(S, st) {
    if (!(st.phase === 'boarding' || st.phase === 'open') || !player().riding) return;
    const R = player().ride, lc = R && R.local; if (!lc || lc.x < 0.78 || !(R.v && R.v.x > 0.25)) return;        // (the walk bounds end at 0.82: pressing against the platform-side wall at a door steps out)
    if (!DOOR_Z.some((d) => Math.abs(lc.z - d) < 0.95)) return;
    alight();
  }

  /** the rider is aboard: the train of track tk at station fromRt leaves on its timetable (wait = the rest of the scheduled dwell, at least 6 s) */
  function enter(fromRt, tk, carIndex) {
    const t0 = ctx.time, ps = fromRt.platform.state(tk, t0), remain = ps.phase === 'dwell' ? Math.max(6, (fromRt.platform.TIMING.arrive + fromRt.platform.TIMING.dwell) - ps.tau - 3.5) : 12;
    const legs = buildLegs(fromRt, tk, t0, remain);
    if (!legs.length) return null;                                                     // terminus: no train leaves from here in this direction
    for (const l of legs) l.route.setRider(carIndex);                                  // the whole train jumps to / from the generic tunnel when THIS car is behind the disc (makeRoute)
    const train = trainFor(tk.stock);
    const S = session = { t0, legs, train, car: carIndex, held: new Set(), platformOf: new Map(), announced: new Set(), state: null, boardedAt: t0, from: fromRt, route: legs[0].route, to: legs[0].to, destRt: legs[0].destRt, destTk: legs[0].destTk, tk };
    for (const l of legs) { S.platformOf.set(l.tk, l.from.platform); S.platformOf.set(l.destTk, l.destRt.platform); }
    hold(S, tk); hold(S, legs[0].destTk);
    train.root.visible = true; env.addSessionTrain(train); env.onRideStart && env.onRideStart(legs[0].route, S);
    try { if (train.setLine) train.setLine(legs[0].fromDef.line, tk.dir, legs[0].fromDef.idx); } catch (e) { console.warn("[metro] strip", e); }   // the in-car line strip + LED marker (train.js)
    const frame = (t) => carFrame(S, t);
    const f0 = frame(t0), c = Math.cos(f0.yaw), s = Math.sin(f0.yaw);
    // the player keeps the place he stands in (inside the platform-side doors, clamped into the car)
    const local = { x: clamp((cam.x - f0.x) * c - (cam.z - f0.z) * s, -0.6, 0.6), y: 0, z: clamp((cam.x - f0.x) * s + (cam.z - f0.z) * c, -7, 7) };   // inside the car, clear of the door threshold (stepping out needs a deliberate move toward the platform)
    player().board({ frame, local, bounds: { x0: -0.82, x1: 0.82, z0: -8.4, z1: 8.4 }, lookRelative: true, onExit: (pose) => { if (pose.cancelled && session === S) cancel(S); } });
    update(0, t0);
    return S;
  }
  const nearestCar = (rt, tk) => { const st = STOCK[tk.stock], [, lz] = rt.L(cam.x, cam.z); let best = 0, bd = 1e9; for (let i = 0; i < st.cars; i++) { const d = Math.abs(lz - tk.dir * carOffset(st, i)); if (d < bd) { bd = d; best = i; } } return best; };

  /** [E] at a standing train, or walking in through an open door: aboard, bound along the line */
  function board(fromRt, tk) {
    if (session) return null;
    const S = enter(fromRt, tk, nearestCar(fromRt, tk));
    if (!S) { env.toast('Поезд дальше не идёт. Посадки нет', 'No boarding: terminus'); return null; }
    const dirName = NET.lineName(S.legs[0].fromDef.line, tk.dir, true), dirEn = NET.lineName(S.legs[0].fromDef.line, tk.dir, false);
    env.toast('Поезд до станции «' + dirName + '». Следующая станция — «' + S.legs[0].to.name + '»', 'Train to ' + dirEn + '. Next: ' + S.legs[0].to.nameEn);
    return S;
  }
  const autoBoard = (fromRt, tk) => !!board(fromRt, tk);

  function cancel(S) { if (!S) return; env.onRideEnd && env.onRideEnd(); S.train.root.visible = false; env.removeSessionTrain(S.train); for (const h of [...S.held]) release(S, h, 'dispatch', ctx.time); session = null; }

  ctx.onUpdate((dt, t) => update(dt, t));
  for (const rt of Object.values(env.stations || {})) if (rt.platform && rt.platform.setTubeAt) rt.platform.setTubeAt((tk, e) => endTube(rt, tk, e));   // scheduled trains follow the curved end tubes too
  return { board, autoBoard, alight, get session() { return session; }, stateAt, carFrame, makeRoute, buildLegs, cancel, trainFor, endTube, DOOR_T, DEPART_T };
}
export { STOCK, THREE };
