// landmarksTroitsky/service.js - PURE (no three.js): everything of the Troitsky Bridge that is not drawing: the published service `ctx.services.landmarksTroitsky` (state, deckY, deckLift, setMode, the gates and
// the pedestrian step test), the physics of the leaf (the floor ramps that are overwritten per frame, the dynamic collider boxes), the NPC traffic stop lines, the carry / slip of the bodies that stand on the leaf.
// The module (../landmarksTroitsky.js) wires it to the meshes; tools/troitsky-test.mjs drives the same code headlessly.
import { createClock } from './schedule.js';
import {
  FR, LEN, HW, ROAD, KERB, PAVE, U_HINGE, U_TIP, Y_HINGE, ALPHA0, LEAF_S, GATE_S, GATE_N, WALK_SLIP_DEG, CAR_SLIP_DEG, WALK_SLIDE_MAX, CAR_SLIDE_MAX,
  yDeck, phiOf, leafFoot, leafY, carryDu, slideAccel, toWorld, toUV, THETA_MAX,
} from './frame.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const VP0 = ROAD + KERB, VP1 = HW + 0.1;
/** the deck rectangle (u from the south end of the abutment to the north end, |v| to the railing + 0.3) and its world AABB (a cheap reject before the frame transform) */
export const U_MIN = -1.6, U_MAX = LEN + 0.8, V_MAX = HW + 0.3;
const _bb = (() => { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const [u, v] of [[U_MIN, -V_MAX], [U_MAX, -V_MAX], [U_MAX, V_MAX], [U_MIN, V_MAX]]) { const w = toWorld(u, v); x0 = Math.min(x0, w.x); x1 = Math.max(x1, w.x); z0 = Math.min(z0, w.z); z1 = Math.max(z1, w.z); } return [x0 - 1, z0 - 1, x1 + 1, z1 + 1]; })();
export const BOUNDS = _bb;

// ------------------------------------------------------------------ the floor of the leaf: three walk ramps (roadway + kerb strip, two pavements) whose numbers are overwritten per frame
export const STRIPS = [{ v: 0, w: 2 * VP0, lift: 0 }, { v: -(VP0 + VP1) / 2, w: VP1 - VP0, lift: PAVE }, { v: (VP0 + VP1) / 2, w: VP1 - VP0, lift: PAVE }];
export const THICK = 2.0;      // m: the solid depth of the floor ramps under the surface (a car that flies into the face of the raised leaf meets a girder, docs/AREAS.md 13.11)
/** add the three floor ramps of the CLOSED leaf to a Physics (core/physics.js); returns the items (flagged `leaf`) */
export function createRamps(ph) {
  const rampRot = Math.atan2(FR.c, FR.s), f = leafFoot(0), len0 = f.u1 - f.u0, um0 = (f.u0 + f.u1) / 2;
  const e = 0.02, ta = Math.tan(ALPHA0);      // (the footprint is 2 * e longer than the leaf: the heights are those of the extended ends, so the surface is exactly the leaf line)
  const items = STRIPS.map((st) => { const w = toWorld(um0, st.v); return ph.addWalkRamp(w.x, w.z, st.w, len0 + 2 * e, rampRot, Y_HINGE + st.lift - e * ta, Y_HINGE + st.lift + (len0 + e) * ta, THICK); });
  for (const it of items) it.leaf = true;
  return items;
}
/** overwrite the ramps for the opening angle theta: the footprint shrinks toward the hinge (it stays inside the cells the items were inserted in), the two heights follow the surface line */
export function placeRamps(items, theta) {
  const phi = phiOf(theta), foot = leafFoot(theta), len = foot.u1 - foot.u0, um = (foot.u0 + foot.u1) / 2, e = 0.02, tp = Math.tan(phi), yA = Y_HINGE - e * tp, yB = Y_HINGE + (len + e) * tp;
  for (let i = 0; i < items.length; i++) {
    const it = items[i], st = STRIPS[i], w = toWorld(um, st.v);
    it.cx = w.x; it.cz = w.z; it.hd = len / 2 + 0.02; it.yA = yA + st.lift; it.yB = yB + st.lift; it.y0 = Math.min(it.yA, it.yB) - THICK;
  }
}
// ------------------------------------------------------------------ the dynamic collider boxes of the leaf: one per BAY of the two rails and the two barrier kerbs (leaf.js owns the bays and their knock records)
export const LEAF_BAY_RAIL = { d: 0.4, lo: -1.2, hi: PAVE + 1.25 };           // the railing box (blocks walkers and cars; open above 1.45 m): thickness, bottom / top over the surface (the top counts the 0.2 m pavement)
export const LEAF_BAY_KERB = { d: KERB, lo: -1.0, hi: 0.8 };                  // the barrier kerb box
/**
 * The box of one BAY of the leaf (a rail panel or a kerb piece, docs/AREAS.md 13.8) at opening angle theta: the bay of surface length `len` whose middle stands `sMid` metres from the hinge along the leaf, at the
 * lateral offset v. Writes { cx, cz (the middle on the surface, world), y (the surface level there), rise (half the height the surface gains along the bay), w (the horizontal length of the box), rotY, y0, y1 } into `out`
 * (`k` = LEAF_BAY_RAIL | LEAF_BAY_KERB): a box that follows the slope: a bay is at most 2.6 m, the rise under one stays within 1.2 m up to 70 degrees.
 */
export function leafBayAt(theta, sMid, len, v, k, out = {}) {
  const phi = phiOf(theta), cph = Math.cos(phi), sph = Math.sin(phi), c = toWorld(U_HINGE + sMid * cph, v, _w2), rise = len * Math.abs(sph) / 2, y = Y_HINGE + sMid * sph;
  out.cx = c.x; out.cz = c.z; out.y = y; out.rise = rise; out.w = len * cph + 0.06; out.d = k.d; out.rotY = -FR.T; out.y0 = y - rise + k.lo; out.y1 = y + rise + k.hi;
  return out;
}
const _w2 = { x: 0, z: 0 };

// ------------------------------------------------------------------ the gates (barrier lines)
export const GATE_ID = (g) => 'troitsky-' + g;
/** two gates: 's' on the first span (cars and walkers that go north stop before it), 'n' beyond the landing pier (they stop before it going south); (dx, dz) points INTO the span */
export const makeGates = () => [
  { id: 's', u: GATE_S, dir: +1 }, { id: 'n', u: GATE_N, dir: -1 },
].map((g) => { const w = toWorld(g.u, 0); return { ...g, x: w.x, z: w.z, dx: g.dir * FR.c, dz: g.dir * FR.s, hw: HW + 0.5 }; });

// ------------------------------------------------------------------ the service
/**
 * createService({ clock?, cfg?, mode? }) -> the object published as ctx.services.landmarksTroitsky:
 *   state() -> { phase: 'closed'|'opening'|'open'|'closing', stage, angle (rad), t (0..1), stop, barrier, mode, cycles }
 *   deckY(x, z) -> m | null     the asphalt level under (x, z): the closed deck's profile, the live surface of the leaf where it stands, null in the gap that an open leaf leaves and outside the deck
 *   deckLift(x, z) -> m         what a walker's feet stand above deckY (granite pavement 0.2, asphalt 0.03)
 *   setMode('auto' | 'open' | 'closed'), mode()
 *   stop (getter)               the NPC traffic / pedestrian STOP flag: up from the start of the warning until the leaf lies and the arms are up
 *   gates[], stepBlocked(x0, z0, x1, z1)    a step that passes a closed barrier line inward (the pedestrians)
 *   onLeaf(x, z), leafTheta, advance(dt, night)    the clock step (the module calls it per frame; tests too), carry helpers
 */
export function createService(o = {}) {
  const clock = o.clock || createClock({ cfg: o.cfg, mode: o.mode, thetaMax: THETA_MAX }), gates = makeGates();
  const q = { u: 0, v: 0 };
  const svc = {
    clock, gates, tris: 0,
    state: () => clock.state(),
    get stop() { return clock.stop; },
    get theta() { return clock.theta; },
    setMode: (m) => clock.setMode(m), mode: () => clock.mode,
    deckY(x, z) {
      if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return null;
      toUV(x, z, q); const u = q.u;
      if (u < U_MIN || u > U_MAX || q.v > V_MAX || q.v < -V_MAX) return null;
      if (u > U_HINGE && u < U_TIP) { const y = leafY(u, clock.theta); return y === y ? y : null; }       // (NaN = the gap beyond the raised leaf)
      return yDeck(clamp(u, 0, LEN));
    },
    /** the vertical speed (m/s) of the leaf's surface under (x, z) at the live angle speed (the material point (u - U_HINGE) dTheta/dt), 0 where the leaf does not lie: what a car that leaves the tip adds to its take-off */
    deckVy(x, z) {
      if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return 0;
      toUV(x, z, q); if (Math.abs(q.v) > V_MAX || q.u <= U_HINGE || q.u >= leafFoot(clock.theta).u1 + 0.3) return 0;
      return (q.u - U_HINGE) * clock.omega;
    },
    deckLift(x, z) {
      toUV(x, z, q);
      if (q.u < U_MIN || q.u > U_MAX || q.v > V_MAX || q.v < -V_MAX) return null;
      return Math.abs(q.v) >= VP0 ? PAVE : 0.03;
    },
    /** is (x, z) on the span of the leaf (u from the hinge to the tip, +- m metres along it, the whole width)? A quick world-AABB reject first (people/nav.js asks this per spawn candidate) */
    inSpan(x, z, m = 3) {
      if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return false;
      toUV(x, z, q); return q.u > U_HINGE - m && q.u < U_TIP + m && Math.abs(q.v) < HW + 1;
    },
    /** is (x, z) between the two gates (the part of the bridge that is shut while the flag is up)? */
    inGated(x, z) {
      if (x < BOUNDS[0] || x > BOUNDS[2] || z < BOUNDS[1] || z > BOUNDS[3]) return false;
      toUV(x, z, q); return q.u > GATE_S && q.u < GATE_N && Math.abs(q.v) < HW + 1;
    },
    /** is (x, z) on the leaf (its footprint at the current angle)? */
    onLeaf(x, z) { toUV(x, z, q); return Math.abs(q.v) <= V_MAX && q.u > U_HINGE && q.u < leafFoot(clock.theta).u1; },
    /** a step (x0, z0) -> (x1, z1) crosses a CLOSED barrier line from the outside to the inside (the gate is closed from the moment the flag is up until it is lifted) */
    stepBlocked(x0, z0, x1, z1) {
      if (!clock.stop) return false;
      for (let i = 0; i < gates.length; i++) {
        const g = gates[i], a = (x0 - g.x) * g.dx + (z0 - g.z) * g.dz, b = (x1 - g.x) * g.dx + (z1 - g.z) * g.dz;
        if (a <= 0 && b > 0) { const t = a / (a - b), px = x0 + (x1 - x0) * t - g.x, pz = z0 + (z1 - z0) * t - g.z, lat = Math.abs(-px * g.dz + pz * g.dx); if (lat <= g.hw) return true; }
      }
      return false;
    },
    /** within `r` metres of a closed barrier line (the people code only runs the segment test near fences) */
    nearGate(x, z, r = 3) {
      if (!clock.stop) return false;
      for (let i = 0; i < gates.length; i++) { const g = gates[i]; if (Math.abs((x - g.x) * g.dx + (z - g.z) * g.dz) <= r && Math.hypot(x - g.x, z - g.z) < g.hw + r) return true; }
      return false;
    },
    advance(dt, night = 0) { const th0 = clock.theta; clock.step(dt, night); return { th0, th1: clock.theta, events: clock.takeEvents() }; },
  };
  return svc;
}

// ------------------------------------------------------------------ the NPC traffic: stop lines on the lanes of the bridge, answered red while the STOP flag is up
/**
 * addStopLines(streets, svc, wayIds): for every lane of the bridge ways that crosses a gate line toward the span one stop line { lane, s, x, z, signal: 'troitsky-<gate>', approach: 0 } is appended to
 * streets.stopLines (the traffic sim and the tram sim read them) and streets.signalState / signalInfo are wrapped so that those signals read 'red' while svc.stop, else 'green'. Returns the number of lines.
 */
export function addStopLines(streets, svc, wayIds) {
  if (!streets || !Array.isArray(streets.lanes) || !Array.isArray(streets.stopLines)) return 0;
  const ids = new Set(wayIds); let n = 0;
  for (const l of streets.lanes) {
    if (!ids.has(l.road) || !l.pts || l.pts.length < 2) continue;
    let acc = 0;
    for (let i = 0; i + 1 < l.pts.length; i++) {
      const a = l.pts[i], b = l.pts[i + 1], sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (const g of svc.gates) {
        const da = (a[0] - g.x) * g.dx + (a[1] - g.z) * g.dz, db = (b[0] - g.x) * g.dx + (b[1] - g.z) * g.dz;
        if (!(da <= 0 && db > 0)) continue;                                   // moving toward the span across the line
        const t = da / (da - db), x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
        streets.stopLines.push({ lane: l.id, s: acc + sl * t, x, z, signal: GATE_ID(g.id), approach: 0, give: false, junction: null, crossing: null }); n++;
      }
      acc += sl;
    }
  }
  const mine = (id) => typeof id === 'string' && id.startsWith('troitsky-');
  if (n && typeof streets.signalState === 'function' && !streets.signalState.__troitsky) {
    const o1 = streets.signalState, o2 = streets.signalInfo;
    const s1 = (id, ap, t) => (mine(id) ? (svc.stop ? 'red' : 'green') : o1(id, ap, t));
    s1.__troitsky = true; streets.signalState = s1;
    if (typeof o2 === 'function') streets.signalInfo = (id, ap, t) => (mine(id) ? { state: svc.stop ? 'red' : 'green', remain: 99 } : o2(id, ap, t));
  }
  return n;
}

// ------------------------------------------------------------------ the bodies on the leaf: carry and slip
/** the persistent state of one carried body (a player, a car) */
export const bodyState = () => ({ slide: 0, lastU: NaN, lastV: NaN, on: false });
const _w = { x: 0, z: 0 }, _q = { u: 0, v: 0 };

/**
 * One frame of the WALKER on the leaf. p = { pos: { x, y, z }, onGround, vy } (core/player.js Player), th0 -> th1 = the opening angle before / after this frame, dt seconds, st = bodyState().
 * If the feet are on the leaf (inside its footprint, on its surface within 0.6 m): the body is CARRIED (it keeps its place on the leaf: displaced by carryDu toward the hinge as the leaf rises, its height set to the surface:
 * continuous contact, the vertical speed handed over is (u - UH) dTheta/dt <= 1.2 m/s); beyond WALK_SLIP_DEG the walker SLIPS: the part of this frame's own movement that went uphill is taken back and a slide toward
 * the hinge (a = g (sin phi - tan(35 deg) cos phi), capped at WALK_SLIDE_MAX) is added. Returns 'carry' | 'slip' | null.
 */
export function stepWalker(p, th0, th1, dt, st) {
  const pos = p.pos; toUV(pos.x, pos.z, _q);
  let u = _q.u; const v = _q.v, foot = leafFoot(th0), lift = Math.abs(v) >= VP0 ? PAVE : 0;
  const onLeaf = p.onGround && Math.abs(v) <= V_MAX && u > U_HINGE && u < foot.u1 + 0.3 && Math.abs(pos.y - (leafY(Math.min(u, foot.u1), th0) + lift)) < 0.6;
  if (!onLeaf) { st.slide *= Math.exp(-dt / 0.3); st.on = false; st.lastU = u; st.lastV = v; return null; }
  const phi = phiOf(th1), slope = Math.abs(phi), lim = WALK_SLIP_DEG * Math.PI / 180;
  if (slope > lim) {
    if (st.on && st.lastU === st.lastU) { const du = u - st.lastU; if (du > 0) u -= du; }          // the walker's own uphill step of this frame is taken back (the leaf is too steep to climb)
    st.slide = Math.min(WALK_SLIDE_MAX, st.slide + slideAccel(WALK_SLIP_DEG, slope) * dt);      // (st.slide = the speed ALONG the slope)
  } else st.slide *= Math.exp(-dt / 0.3);
  u += carryDu(u, th0, th1) - st.slide * Math.cos(phi) * dt;
  const f1 = leafFoot(th1);
  const nu = u < U_HINGE ? U_HINGE - 1e-6 + 0 : u;                                                       // slid off the leaf: onto the first pier (flat)
  const w = toWorld(nu, v, _w); pos.x = w.x; pos.z = w.z;
  pos.y = (nu <= U_HINGE + 1e-6 || nu > f1.u1 ? yDeck(nu) : leafY(nu, th1)) + lift; p.vy = 0; p.onGround = true;
  st.on = true; st.lastU = nu; st.lastV = v;
  return slope > lim ? 'slip' : 'carry';
}

/** the foot of the leaf, when it is steeper than the car's climb limit, is a WALL for a car that arrives (the same rule as lib/bascule.js footWall: put back WALL_GAP m before the hinge, its speed toward the leaf taken, a 'hit' in car.pending) */
const WALL_GAP = 2.0;
function footWall(car, u, v, dt) {
  const sh = u - U_HINGE; if (sh > 0 || sh < -WALL_GAP - 3) return false;
  const vu = car.vx * FR.c + car.vz * FR.s; if (vu <= 0.5 || sh + vu * dt <= -WALL_GAP) return false;
  const w = toWorld(U_HINGE - WALL_GAP, v, _w); car.x = w.x; car.z = w.z;
  const d = vu * 1.15; car.vx -= d * FR.c; car.vz -= d * FR.s;
  if (vu > 3 && car.pending) {
    const sp = car.spec || { front: 2.1 }, sy = Math.sin(car.yaw), cy = Math.cos(car.yaw), nx = -FR.c, nz = -FR.s;
    car.pending.push({ type: 'hit', v: vu * 0.8, x: car.x + sy * sp.front, z: car.z + cy * sp.front, nx, nz, localX: 0, localZ: sp.front, localNX: nx * cy - nz * sy, localNZ: nx * sy + nz * cy });
  }
  return true;
}

/**
 * One frame of a CAR on the leaf. car = { x, z, y, vx, vz } (drive/handling.js), same th0 / th1 / dt / st. Carried like the walker (the car's centre keeps its place on the leaf), beyond CAR_SLIP_DEG
 * (45 degrees) the car slips toward the hinge: its velocity along u is held at or below -slide (a = g (sin phi - tan(25 deg) cos phi), capped at CAR_SLIDE_MAX), so the throttle cannot climb it. The height and
 * the pitch come from the engine (handling.js groundAt reads deckY under both axles). Returns 'carry' | 'slip' | null.
 */
export function stepCar(car, th0, th1, dt, st) {
  if (car.fall || car.air) { st.slide *= Math.exp(-dt / 0.4); st.on = false; return null; }      // a car in the air is nobody's passenger: the ballistic phase of drive/handling.js owns it (the leaf may not carry or throw it)
  toUV(car.x, car.z, _q);
  let u = _q.u; const v = _q.v, foot = leafFoot(th0);
  const onLeaf = Math.abs(v) <= V_MAX && u > U_HINGE && u < foot.u1 + 0.3;
  if (!onLeaf) { st.slide *= Math.exp(-dt / 0.4); st.on = false; st.lastU = u; if (Math.abs(v) <= V_MAX && Math.abs(phiOf(th1)) > CAR_SLIP_DEG * Math.PI / 180 + 1e-9) footWall(car, u, v, dt); return null; }
  const phi = phiOf(th1), slope = Math.abs(phi), lim = CAR_SLIP_DEG * Math.PI / 180;
  const cu = FR.c, su = FR.s;
  if (slope > lim) {
    st.slide = Math.min(CAR_SLIDE_MAX, st.slide + slideAccel(CAR_SLIP_DEG, slope) * dt);      // (the speed ALONG the slope)
    const hv = st.slide * Math.cos(phi);
    const vu = car.vx * cu + car.vz * su;
    if (vu > -hv) { const d = -hv - vu; car.vx += d * cu; car.vz += d * su; }               // never faster uphill than the slide pulls back
  } else st.slide *= Math.exp(-dt / 0.4);
  u += carryDu(u, th0, th1);
  const w = toWorld(u, v, _w); car.x = w.x; car.z = w.z;
  st.on = true; st.lastU = u;
  return slope > lim ? 'slip' : 'carry';
}
