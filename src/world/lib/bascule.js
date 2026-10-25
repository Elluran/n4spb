// lib/bascule.js - PURE (no three.js, no engine imports): the generic parts of a BASCULE BRIDGE that opens on a schedule of the game clock and that the player can use while it opens (docs/AREAS.md 13.8 and 13.10): the clock
// (a small state machine: warning -> opening -> hold -> closing -> clear), the kinematics of a rigid leaf that rotates about a hinge line (any number of leaves, each pointing toward +u or -u of the bridge frame), the footing
// (slip) rule, the published service (deckY, deckLift, stop flag, gates, pedestrian step test), the physics floor of a leaf (a walk ramp whose numbers are overwritten per frame), the BAYS of its rails and kerbs (layout + the box that follows the surface; lib/bascule-bays.js turns them into breakable knock records), the carry / slip of a
// walker or a car that stands on a leaf, the NPC stop lines on the lanes of the bridge, the hooks into people / traffic. landmarksPalaceBridge uses it with TWO leaves (the Palace Bridge, opposite senses about two hinges);
// landmarksTroitsky has the same logic for ONE leaf in its own files (landmarksTroitsky/{schedule,frame,service}.js) and could be rewritten over this file: the clock is the same code, `makeLeaf` with dir +1 is its frame.js leaf
// maths, `createBasculeService` / `stepWalker` / `stepCar` / `addStopLines` / `leafBayAt` / `hookPeople` differ only by the bridge description passed in.
//
// THE BRIDGE DESCRIPTION `B` that the generic functions read:
//   { id, frame: { cx, cz, T, c, s, toWorld(u, v, out), toUV(x, z, out) }, leaves: [makeLeaf(...)...], gates: [{ id, u, dir, hw }], vMax (half width of the walkable deck), yStatic(u) (the height of the FIXED deck at u: where a slid body
//     lands), walkLift(v) (the walker's feet above the floor: 0), liftOf(v) (what a pedestrian's feet stand above the asphalt, deckLift), bounds [x0, z0, x1, z1], thetaMax, gateName(g) }
// Frame conventions: u along the bridge, v across, y up; a leaf with dir +1 stands at u >= uHinge, with dir -1 at u <= uHinge.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const G = 9.81;
const NO_EVENTS = Object.freeze([]);       // what takeEvents hands out in the (nearly every) frame without an event: one shared empty list, no allocation

// ------------------------------------------------------------------ the clock
/** the opening angle (rad) for progress p: smootherstep (zero speed and acceleration at both ends) */
export const ease = (p) => { const t = p <= 0 ? 0 : p >= 1 ? 1 : p; return t * t * t * (t * (t * 6 - 15) + 10); };
const easeD = (q) => { const t = q <= 0 ? 0 : q >= 1 ? 1 : q; return 30 * t * t * (1 - t) * (1 - t); };      // d ease / dp

/**
 * createClock({ cfg, mode, thetaMax, ready }) -> { step(dt, night), state(), setMode(m), ... }. cfg (every number tunable in the bridge's schedule.js):
 *   DAY_GAP / NIGHT_GAP (s the bridge stands closed before it opens again: the daylight / overcast presets, the white night preset uNight >= NIGHT_ON), FIRST_AT (s after the start of the first opening; the white night uses
 *   FIRST_NIGHT when it is given, else FIRST_AT; neither is later than the gap),
 *   WARN (s of warning with the leaves still down) / WARN_MAX (the most the warning is stretched to wait for a clear span), OPEN_T / CLOSE_T (s of the eased movement), HOLD (s open, auto only), RELEASE (s with the leaves down
 *   before the arms go up and the flag drops), BARRIER_T (s the arms need).
 * One cycle: WARN (the STOP flag is up, the leaves have not moved) -> OPENING (theta = thetaMax * ease(p)) -> HOLD -> CLOSING -> CLEAR -> idle. A change of mind (setMode('closed') while opening) reverses p: the leaves never jump.
 */
export function createClock(opts = {}) {
  const C = opts.cfg, thetaMax = opts.thetaMax ?? 70 * Math.PI / 180;
  let mode = opts.mode || 'auto', stage = 'idle', p = 0, idle = 0, wait = 0, first = true, cycles = 0, barrier = 0, ev = [], ready = opts.ready || null;
  const want = () => mode === 'open';
  const startWarn = () => { stage = 'warn'; wait = 0; cycles++; ev.push('warn'); };
  const sub = (dt, night) => {
    if (stage === 'idle') {
      idle += dt;
      const gap = night >= C.NIGHT_ON ? C.NIGHT_GAP : C.DAY_GAP;
      const lim = first ? (night >= C.NIGHT_ON && C.FIRST_NIGHT != null ? C.FIRST_NIGHT : Math.min(gap, C.FIRST_AT)) : gap;      // (the first opening: FIRST_NIGHT in the white night when given, else FIRST_AT, never later than the regular gap)
      if (mode === 'open' || (mode === 'auto' && idle >= lim)) startWarn();
    } else if (stage === 'warn') {
      wait += dt;
      if (wait >= C.WARN && (mode === 'closed' || !ready || wait >= C.WARN_MAX || ready())) { stage = mode === 'closed' ? 'clear' : 'opening'; wait = 0; if (stage === 'opening') ev.push('opening'); }      // (the leaves wait for the span to clear of NPC vehicles and pedestrians, at most WARN_MAX)
    } else if (stage === 'opening') {
      p += dt / C.OPEN_T;
      if (mode === 'closed') { stage = 'closing'; ev.push('closing'); }
      else if (p >= 1) { p = 1; stage = 'hold'; wait = 0; ev.push('open'); }
    } else if (stage === 'hold') {
      wait += dt;
      if (mode === 'closed' || (mode === 'auto' && wait >= C.HOLD)) { stage = 'closing'; ev.push('closing'); }
    } else if (stage === 'closing') {
      p -= dt / C.CLOSE_T;
      if (want()) { stage = 'opening'; ev.push('opening'); }
      else if (p <= 0) { p = 0; stage = 'clear'; wait = 0; ev.push('closed'); }
    } else if (stage === 'clear') {
      wait += dt;
      if (wait >= C.RELEASE) { stage = 'idle'; idle = 0; first = false; wait = 0; ev.push('released'); }
    }
    // the barrier arms: 0 = up, 1 = down; they move at 1 / BARRIER_T per second while the flag asks
    const down = stage === 'warn' || stage === 'opening' || stage === 'hold' || stage === 'closing' || (stage === 'clear' && wait < C.RELEASE - C.BARRIER_T);
    barrier += Math.max(-1, Math.min(1, ((down ? 1 : 0) - barrier) * 1e9)) * dt / C.BARRIER_T;
    barrier = barrier < 0 ? 0 : barrier > 1 ? 1 : barrier;
  };
  const clock = {
    cfg: C, thetaMax,
    /** advance dt seconds of game time (any size: it is cut into steps of 0.25 s); night = ctx.shared.uNight.value */
    step(dt, night = 0) { if (!(dt > 0)) return clock; let left = Math.min(dt, 3600); while (left > 1e-9) { const h = Math.min(0.25, left); sub(h, night); left -= h; } return clock; },
    get stage() { return stage; }, get p() { return p; }, get mode() { return mode; }, get cycles() { return cycles; },
    get theta() { return thetaMax * ease(p); },
    /** the angular speed dTheta/dt (rad/s), signed (+ opening) */
    get omega() { if (stage === 'opening') return thetaMax * easeD(p) / C.OPEN_T; if (stage === 'closing') return -thetaMax * easeD(p) / C.CLOSE_T; return 0; },
    /** the STOP flag: the NPC traffic / pedestrians stop short of the span from the start of WARN until the leaves lie and the arms are up */
    get stop() { return stage !== 'idle'; },
    /** barrier arm position 0 (up) .. 1 (down) */
    get barrier() { return barrier; },
    /** events since the last call: 'warn' | 'opening' | 'open' | 'closing' | 'closed' | 'released' (a frozen shared empty list when there are none: do not keep it or push to it) */
    takeEvents() { if (!ev.length) return NO_EVENTS; const e = ev; ev = []; return e; },
    setMode(m) { if (m === 'open' || m === 'closed' || m === 'auto') mode = m; return mode; },
    /** ready() -> true when nothing of the NPC world stands on the span (polled in WARN once WARN seconds have passed) */
    setReady(fn) { ready = typeof fn === 'function' ? fn : null; },
    /** the service shape: phase 'closed' | 'opening' | 'open' | 'closing' (warn and clear count as closed: the leaves lie), angle (rad), t = progress 0..1 */
    state() { return { phase: stage === 'opening' ? 'opening' : stage === 'closing' ? 'closing' : stage === 'hold' ? 'open' : 'closed', stage, angle: clock.theta, t: p, stop: stage !== 'idle', barrier, mode, cycles, idle }; },
  };
  return clock;
}

// ------------------------------------------------------------------ the footing rule
/** a walker keeps its footing up to this slope of a leaf (degrees), a car up to the second one; beyond them they SLIP down the leaf toward its hinge (the lowest point of the leaf). The car's limit is 45 degrees (tan = 1: the
 *  traction of a tyre of friction 1.0, docs/AREAS.md 13.11): a leaf is a RAMP for a car that arrives with speed, drive/handling.js does the climbing (gravity along the slope) and the take-off from the tip. It was 25 degrees before the stunts. */
export const WALK_SLIP_DEG = 35, CAR_SLIP_DEG = 45;
/** the speed cap of the slide (m/s along the slope): a walker, a car */
export const WALK_SLIDE_MAX = 7, CAR_SLIDE_MAX = 16;
/** the along-slope acceleration (m/s^2) of a body on a slope of phi radians whose footing limit is limDeg: g (sin phi - tan(lim) cos phi), 0 inside the limit (continuous at it) */
export const slideAccel = (limDeg, phi) => {
  const lim = limDeg * Math.PI / 180;
  if (phi <= lim) return 0;
  return Math.max(0, G * (Math.sin(phi) - Math.tan(lim) * Math.cos(phi)));
};

// ------------------------------------------------------------------ a leaf
/**
 * makeLeaf({ id, uHinge, dir, yHinge, uTip, yTip, cwLen }): a rigid leaf hinged at the line u = uHinge (y = yHinge), pointing toward dir (+1: increasing u, -1: decreasing u), whose closed chord ends at the tip (uTip, yTip).
 * A point at the distance s along the leaf from the hinge stands at (u, y) = (uHinge + dir s cos(phi), yHinge + s sin(phi)), phi = theta + alpha0. Exact for that rigid line.
 */
export function makeLeaf(o) {
  const run = Math.abs(o.uTip - o.uHinge), rise = o.yTip - o.yHinge, alpha0 = Math.atan2(rise, run), S = Math.hypot(run, rise), dir = o.dir >= 0 ? 1 : -1;
  const L = {
    id: o.id, uHinge: o.uHinge, dir, yHinge: o.yHinge, uTip: o.uTip, yTip: o.yTip, run, alpha0, S, cwLen: o.cwLen || 0,
    /** the elevation angle of the leaf at opening angle theta */
    phi: (th) => th + alpha0,
    /** the horizontal reach (m from the hinge toward the middle) of the leaf at theta */
    reach: (th) => S * Math.cos(th + alpha0),
    /** the u range [lo, hi] covered by the leaf at theta */
    foot(th, out = {}) { const far = o.uHinge + dir * S * Math.cos(th + alpha0); out.lo = Math.min(o.uHinge, far); out.hi = Math.max(o.uHinge, far); out.far = far; return out; },
    /** the surface height at u for theta, or NaN where the leaf does not reach (the gap beyond the tip's projection, or behind the hinge) */
    yAt(u, th) { const sh = dir * (u - o.uHinge); if (sh < -1e-9 || sh > S * Math.cos(th + alpha0) + 1e-9) return NaN; return o.yHinge + sh * Math.tan(th + alpha0); },
    /** the slope of the surface in radians */
    slope: (th) => Math.abs(th + alpha0),
    /** the signed u displacement of the material point of the leaf that stands at u0 when theta goes th0 -> th1 (the carry of a body at rest on it: toward the hinge as the leaf rises) */
    carryDu(u0, th0, th1) { const s = dir * (u0 - o.uHinge) / Math.cos(th0 + alpha0); return o.uHinge + dir * s * Math.cos(th1 + alpha0) - u0; },
    /** the vertical speed (m/s) handed to a body CARRIED by the leaf at u while dTheta/dt = w */
    vy: (u, w) => dir * (u - o.uHinge) * w,
    /** does a body with footing limit limDeg slip on the leaf at theta? */
    slips: (limDeg, th) => Math.abs(th + alpha0) > limDeg * Math.PI / 180 + 1e-9,
  };
  return L;
}
/** does a body with footing limit limDeg slip on a leaf at opening angle theta (all the leaves of a bridge share theta and rest tilt within a degree) */
export const slips = (leaf, limDeg, th) => leaf.slips(limDeg, th);

// ------------------------------------------------------------------ the service
/**
 * createBasculeService(B, { clock, cfg, mode }) -> the object published as ctx.services.<module>:
 *   state() -> { phase, stage, angle, t, stop, barrier, mode, cycles }
 *   deckY(x, z) -> m | null     the asphalt level of a LEAF under (x, z) at the live angle; null where no leaf lies (the gap an open bridge leaves, anything outside the leaves' u range: the fixed deck answers there)
 *   deckLift(x, z) -> m | null  what a pedestrian's feet stand above deckY
 *   setMode('auto' | 'open' | 'closed'), mode(), stop, theta, gates, stepBlocked(x0, z0, x1, z1), nearGate, inSpan, inGated, onLeaf, leafAt, advance(dt, night)
 */
export function createBasculeService(B, o = {}) {
  const clock = o.clock, F = B.frame, leaves = B.leaves, gates = B.gates.map((g) => { const w = F.toWorld(g.u, 0); return { ...g, x: w.x, z: w.z, dx: g.dir * F.c, dz: g.dir * F.s, hw: g.hw ?? B.vMax + 0.5 }; });
  const q = { u: 0, v: 0 }, u0 = Math.min(...leaves.map((l) => l.uHinge)), u1 = Math.max(...leaves.map((l) => l.uHinge));
  const gu0 = Math.min(...gates.map((g) => g.u)), gu1 = Math.max(...gates.map((g) => g.u)), gb = [1e9, 1e9, -1e9, -1e9];      // the gated rectangle (between the two gates) and its world AABB
  for (const [u, v] of [[gu0, -B.vMax - 1], [gu1, -B.vMax - 1], [gu1, B.vMax + 1], [gu0, B.vMax + 1]]) { const w = F.toWorld(u, v); gb[0] = Math.min(gb[0], w.x); gb[2] = Math.max(gb[2], w.x); gb[1] = Math.min(gb[1], w.z); gb[3] = Math.max(gb[3], w.z); }
  const adv = { th0: 0, th1: 0, events: NO_EVENTS };
  const out = (x, z) => x < B.bounds[0] || x > B.bounds[2] || z < B.bounds[1] || z > B.bounds[3];
  const svc = {
    clock, gates, leaves, tris: 0, uRange: [u0, u1], gateRange: [gu0, gu1],
    state: () => clock.state(),
    get stop() { return clock.stop; },
    get theta() { return clock.theta; },
    setMode: (m) => clock.setMode(m), mode: () => clock.mode,
    deckY(x, z) {
      if (out(x, z)) return null;
      F.toUV(x, z, q); const u = q.u;
      if (u < u0 - 1e-9 || u > u1 + 1e-9 || q.v > B.vMax || q.v < -B.vMax) return null;
      const th = clock.theta;
      for (let i = 0; i < leaves.length; i++) { const y = leaves[i].yAt(u, th); if (y === y) return y; }      // (NaN = not this leaf / the gap)
      return null;
    },
    /** the vertical speed (m/s) of the leaf's surface under (x, z) at the live angle speed (the material point: dir (u - uHinge) dTheta/dt), 0 where no leaf lies: what a car that leaves the tip adds to its take-off */
    deckVy(x, z) {
      if (out(x, z)) return 0;
      F.toUV(x, z, q); const u = q.u; if (q.v > B.vMax || q.v < -B.vMax) return 0;
      const w = clock.omega;
      for (let i = 0; i < leaves.length; i++) { const sh = leaves[i].dir * (u - leaves[i].uHinge); if (sh > 0 && sh < leaves[i].reach(clock.theta) + 0.3) return leaves[i].vy(u, w); }
      return 0;
    },
    deckLift(x, z) {
      F.toUV(x, z, q);
      if (q.u < u0 - 1e-9 || q.u > u1 + 1e-9 || q.v > B.vMax || q.v < -B.vMax) return null;
      return B.liftOf(q.v);
    },
    /** is (x, z) on the span of the leaves (u from hinge to hinge, +- m metres, the whole width)? A quick world-AABB reject first (people/nav.js asks this per spawn candidate) */
    inSpan(x, z, m = 3) {
      if (out(x, z)) return false;
      F.toUV(x, z, q); return q.u > u0 - m && q.u < u1 + m && Math.abs(q.v) < B.vMax + 0.7;
    },
    /** is (x, z) between the two gates (the part of the bridge that is shut while the flag is up)? */
    inGated(x, z) {
      if (x < gb[0] || x > gb[2] || z < gb[1] || z > gb[3]) return false;
      F.toUV(x, z, q); return q.u > gu0 && q.u < gu1 && Math.abs(q.v) < B.vMax + 0.7;
    },
    /** the leaf (its index in leaves) whose footprint at the current angle covers (x, z), or -1 */
    leafAt(x, z) {
      if (out(x, z)) return -1;
      F.toUV(x, z, q); if (Math.abs(q.v) > B.vMax) return -1;
      const th = clock.theta;
      for (let i = 0; i < leaves.length; i++) { const sh = leaves[i].dir * (q.u - leaves[i].uHinge); if (sh > 0 && sh < leaves[i].reach(th)) return i; }
      return -1;
    },
    onLeaf(x, z) { return svc.leafAt(x, z) >= 0; },
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
    /** advance the clock by dt; returns ONE object that is reused by every call (valid until the next call: the frame loop reads it at once, nothing is allocated per frame) { th0, th1, events } */
    advance(dt, night = 0) { adv.th0 = clock.theta; clock.step(dt, night); adv.th1 = clock.theta; adv.events = clock.takeEvents(); return adv; },
  };
  return svc;
}

// ------------------------------------------------------------------ the floor of a leaf: a walk ramp whose numbers are overwritten per frame
export const THICK = 1.0;      // m: the solid depth of a leaf's floor ramp under its surface (B.thick overrides it: a car that flies into the face of a raised leaf meets a girder, not a plate)
const E = 0.02;
const ends = (leaf, th, out) => {                              // the footprint [lo, hi] (+- E) and the surface heights at its two ends (yLo at the lower u)
  const f = leaf.foot(th, out), tp = Math.tan(leaf.phi(th));
  const yAt = (u) => leaf.yHinge + leaf.dir * (u - leaf.uHinge) * tp;
  out.yLo = yAt(f.lo - E); out.yHi = yAt(f.hi + E); return out;
};
const _e = {}, _pw = { x: 0, z: 0 };
/** add the floor ramp of the CLOSED leaf to a Physics (core/physics.js: addWalkRamp, local z = u: yA at the lower u); returns the item (flagged `leaf`). width = the full width of the deck rectangle */
export function createRamp(ph, B, leaf, width) {
  const F = B.frame, rampRot = Math.atan2(F.c, F.s), e = ends(leaf, 0, _e), len = e.hi - e.lo + 2 * E, w = F.toWorld((e.lo + e.hi) / 2, 0);
  const it = ph.addWalkRamp(w.x, w.z, width, len, rampRot, _e.yLo, _e.yHi, B.thick ?? THICK); it.leaf = true; it.leafId = leaf.id; return it;
}
/** overwrite the ramp for the opening angle theta: the footprint shrinks toward the hinge (it stays inside the cells the item was inserted in), the two heights follow the surface line */
export function placeRamp(it, B, leaf, th) {
  const e = ends(leaf, th, _e), w = B.frame.toWorld((e.lo + e.hi) / 2, 0, _pw);
  it.cx = w.x; it.cz = w.z; it.hd = (e.hi - e.lo) / 2 + E; it.yA = _e.yLo; it.yB = _e.yHi; it.y0 = Math.min(it.yA, it.yB) - it.thick;
}

// ------------------------------------------------------------------ the BAYS of a leaf: its two rails and two barrier kerbs (docs/AREAS.md 13.7, 13.8, 13.10)
// Every rail panel and kerb piece of a MOVING leaf is a breakable BAY like the fixed fences of the world (the owner's rule: everything that blocks breaks). Pure part here: the layout of the bays on a leaf and the
// world box of a bay that follows the leaf's surface; lib/bascule-bays.js (three.js) makes the knock records, the instances and the per-angle re-pose from it.
const _bw = { x: 0, z: 0 };
/**
 * the world box of a bay at opening angle th: the bay lies on the leaf from sMid - len / 2 to sMid + len / 2 (distances along the surface from the hinge) at the bridge lateral offset v; k = { d (thickness across), lo / hi (bottom / top of the box relative to the surface at the middle of the bay; the box also covers the rise of the surface under it) }.
 * Writes { cx, cz (the middle on the surface), y (the surface level there), rise (half the height the surface gains along the bay), w (the horizontal length of the box + 6 cm), d, rotY (-T: aligned with the bridge axis),
 * y0, y1 } into `out`: a box that follows the slope; a bay of at most 2.5 m rises at most 1.2 m (half) under it up to 70 degrees. Allocation free.
 */
export function leafBayAt(B, leaf, th, sMid, len, v, k, out) {
  const F = B.frame, phi = leaf.phi(th), cph = Math.cos(phi), sph = Math.sin(phi), c = F.toWorld(leaf.uHinge + leaf.dir * sMid * cph, v, _bw), rise = len * Math.abs(sph) / 2, y = leaf.yHinge + sMid * sph;
  out.cx = c.x; out.cz = c.z; out.y = y; out.rise = rise; out.w = len * cph + 0.06; out.d = k.d; out.rotY = -F.T; out.y0 = y - rise + k.lo; out.y1 = y + rise + k.hi;
  return out;
}
/**
 * the bays of one leaf: spec = { rail: { W (panel width wished), H (panel height), v (the lateral offset of the rail line, positive), n (height of the panel foot above the surface), k, gap }, kerb: { len (piece length wished), v, k } };
 * returns [{ rail, s0, len, v (bridge lateral, signed), n, sy (the height scale of the instance), k, rec: null, box: {} }] : both rails (sides -1, +1), then both kerbs. s0 = the start along the surface from the hinge.
 * A rail panel keeps `gap` m (0.04) at both ends for the post; the number of panels is round(S / W) (at least 2), of kerb pieces ceil(S / len).
 */
export function leafBays(leaf, spec) {
  const out = [], S = leaf.S, R = spec.rail, K = spec.kerb, gap = R.gap ?? 0.04, nb = Math.max(2, Math.round(S / R.W)), bw = S / nb, nk = Math.max(1, Math.ceil(S / K.len)), kw = S / nk;
  const box = () => ({ cx: 0, cz: 0, w: 1, d: 1, rotY: 0, y0: 0, y1: 0, y: 0, rise: 0 });
  for (const sg of [-1, 1]) for (let i = 0; i < nb; i++) out.push({ rail: true, s0: bw * i + gap, len: bw - 2 * gap, v: sg * R.v, n: R.n, sy: R.H, k: R.k, rec: null, box: box() });
  for (const sg of [-1, 1]) for (let i = 0; i < nk; i++) out.push({ rail: false, s0: kw * i, len: kw, v: sg * K.v, n: 0, sy: 1, k: K.k, rec: null, box: box() });
  return out;
}

// ------------------------------------------------------------------ the NPC traffic: stop lines on the lanes of the bridge, answered red while the STOP flag is up
/**
 * addStopLines(streets, svc, wayIds, prefix): for every lane of the bridge ways that crosses a gate line toward the span one stop line { lane, s, x, z, signal: '<prefix><gate id>', approach: 0 } is appended to
 * streets.stopLines (the traffic sim and the tram sim read them) and streets.signalState / signalInfo are wrapped so that the signals of that prefix read 'red' while svc.stop, else 'green'. Returns the number of lines.
 */
export function addStopLines(streets, svc, wayIds, prefix) {
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
        streets.stopLines.push({ lane: l.id, s: acc + sl * t, x, z, signal: prefix + g.id, approach: 0, give: false, junction: null, crossing: null }); n++;
      }
      acc += sl;
    }
  }
  const mine = (id) => typeof id === 'string' && id.startsWith(prefix);
  const mark = '__' + prefix;
  if (n && typeof streets.signalState === 'function' && !streets.signalState[mark]) {
    const o1 = streets.signalState, o2 = streets.signalInfo;
    const s1 = (id, ap, t) => (mine(id) ? (svc.stop ? 'red' : 'green') : o1(id, ap, t));
    s1[mark] = true; streets.signalState = s1;
    if (typeof o2 === 'function') streets.signalInfo = (id, ap, t) => (mine(id) ? { state: svc.stop ? 'red' : 'green', remain: 99 } : o2(id, ap, t));
  }
  return n;
}

// ------------------------------------------------------------------ the bodies on a leaf: carry and slip
/** the persistent state of one carried body (a player, a car) */
export const bodyState = () => ({ slide: 0, lastU: NaN, lastV: NaN, on: false, leaf: -1 });
const _w = { x: 0, z: 0 }, _q = { u: 0, v: 0 }, _f = {};
/** the leaf whose footprint at theta covers u (the hinge side exclusive, the free end + tol): the index or -1 */
export function leafUnder(B, u, th, tol = 0.3) {
  const L = B.leaves;
  for (let i = 0; i < L.length; i++) { const sh = L[i].dir * (u - L[i].uHinge); if (sh > 0 && sh < L[i].reach(th) + tol) return i; }
  return -1;
}
const surf = (lf, u, th) => lf.yHinge + Math.min(lf.dir * (u - lf.uHinge), lf.reach(th)) * Math.tan(lf.phi(th));

/**
 * One frame of the WALKER on the leaves. p = { pos: { x, y, z }, onGround, vy } (core/player.js Player), th0 -> th1 = the opening angle before / after this frame, dt seconds, st = bodyState().
 * If the feet are on a leaf (inside its footprint, on its surface within 0.6 m): the body is CARRIED (it keeps its place on the leaf: displaced by carryDu toward the hinge as the leaf rises, its height set to the surface:
 * continuous contact, the vertical speed handed over is dir (u - uHinge) dTheta/dt); beyond WALK_SLIP_DEG the walker SLIPS: the part of this frame's own movement that went uphill is taken back and a slide toward the
 * hinge (a = g (sin phi - tan(35 deg) cos phi), capped at WALK_SLIDE_MAX) is added. Returns 'carry' | 'slip' | null.
 */
export function stepWalker(p, B, th0, th1, dt, st) {
  const pos = p.pos, F = B.frame; F.toUV(pos.x, pos.z, _q);
  let u = _q.u; const v = _q.v, li = Math.abs(v) <= B.vMax ? leafUnder(B, u, th0) : -1, lift = B.walkLift(v);
  const lf = li >= 0 ? B.leaves[li] : null;
  const onLeaf = !!lf && p.onGround && Math.abs(pos.y - (surf(lf, u, th0) + lift)) < 0.6;
  if (!onLeaf) { st.slide *= Math.exp(-dt / 0.3); st.on = false; st.leaf = -1; st.lastU = u; st.lastV = v; return null; }
  if (st.leaf !== li) { st.slide = 0; st.lastU = NaN; }
  const phi = lf.phi(th1), slope = Math.abs(phi), lim = WALK_SLIP_DEG * Math.PI / 180;
  if (slope > lim) {
    if (st.on && st.lastU === st.lastU) { const du = u - st.lastU; if (lf.dir * du > 0) u -= du; }       // the walker's own uphill step of this frame is taken back (the leaf is too steep to climb)
    st.slide = Math.min(WALK_SLIDE_MAX, st.slide + slideAccel(WALK_SLIP_DEG, slope) * dt);               // (st.slide = the speed ALONG the slope)
  } else st.slide *= Math.exp(-dt / 0.3);
  u += lf.carryDu(u, th0, th1) - lf.dir * st.slide * Math.cos(phi) * dt;
  const sh = lf.dir * (u - lf.uHinge);
  const nu = sh < 0 ? lf.uHinge - lf.dir * 1e-6 : u;                                                    // slid off the leaf: onto the pier (flat)
  const shn = lf.dir * (nu - lf.uHinge), w = F.toWorld(nu, v, _w); pos.x = w.x; pos.z = w.z;
  pos.y = (shn <= 1e-6 || shn > lf.reach(th1) ? B.yStatic(nu) : lf.yAt(nu, th1)) + lift; p.vy = 0; p.onGround = true;
  st.on = true; st.leaf = li; st.lastU = nu; st.lastV = v;
  return slope > lim ? 'slip' : 'carry';
}

/** how far before the hinge the nose of a car stops at the foot of a leaf that is too steep to climb (the car's nose is 2.1 m ahead of its centre) */
export const WALL_GAP = 2.0;
/**
 * The FOOT of a leaf steeper than the climb limit (CAR_SLIP_DEG) is a WALL for a car that arrives with speed (docs/AREAS.md 13.11): a car whose centre comes within WALL_GAP of the hinge line, moving toward the leaf, is put
 * back at that distance, loses its speed toward the leaf (a 15 % bounce) and takes a 'hit' (car.pending: drive/handling.js moves it to car.events at the next step: the damage model counts it like any blow). Without it a car that
 * hits a 50 degree face at 30 m/s would be thrown up it as if it were a ramp. A car that slides down the leaf and rolls away (moving away from the wall) is not touched. Returns true when it hit.
 */
export function footWall(car, B, th, u, v, dt) {
  const F = B.frame, L = B.leaves;
  for (let i = 0; i < L.length; i++) {
    const lf = L[i]; if (!lf.slips(CAR_SLIP_DEG, th)) continue;
    const sh = lf.dir * (u - lf.uHinge); if (sh > 0 || sh < -WALL_GAP - 3) continue;
    const vu = lf.dir * (car.vx * F.c + car.vz * F.s); if (vu <= 0.5 || sh + vu * dt <= -WALL_GAP) continue;
    const w = F.toWorld(lf.uHinge - lf.dir * WALL_GAP, v, _w); car.x = w.x; car.z = w.z;
    const d = vu * 1.15; car.vx -= lf.dir * d * F.c; car.vz -= lf.dir * d * F.s;
    if (vu > 3 && car.pending) {
      const sp = car.spec || { front: 2.1 }, sy = Math.sin(car.yaw), cy = Math.cos(car.yaw), nx = -lf.dir * F.c, nz = -lf.dir * F.s;
      car.pending.push({ type: 'hit', v: vu * 0.8, x: car.x + sy * sp.front, z: car.z + cy * sp.front, nx, nz, localX: 0, localZ: sp.front, localNX: nx * cy - nz * sy, localNZ: nx * sy + nz * cy });
    }
    return true;
  }
  return false;
}

/**
 * One frame of a CAR on the leaves. car = { x, z, y, vx, vz } (drive/handling.js), same th0 / th1 / dt / st. Carried like the walker (the car's centre keeps its place on the leaf), beyond CAR_SLIP_DEG
 * (45 degrees) the car slips toward the hinge: its velocity along u is held at or below -slide (a = g (sin phi - tan(25 deg) cos phi), capped at CAR_SLIDE_MAX), so the throttle cannot climb it. The height and
 * the pitch come from the engine (handling.js groundAt reads deckY under both axles). Returns 'carry' | 'slip' | null.
 */
export function stepCar(car, B, th0, th1, dt, st) {
  if (car.fall || car.air) { st.slide *= Math.exp(-dt / 0.4); st.on = false; st.leaf = -1; return null; }      // a car in the air is nobody's passenger: the ballistic phase of drive/handling.js owns it (a leaf may not carry or throw it)
  const F = B.frame; F.toUV(car.x, car.z, _q);
  let u = _q.u; const v = _q.v, li = Math.abs(v) <= B.vMax ? leafUnder(B, u, th0) : -1;
  if (li < 0) { st.slide *= Math.exp(-dt / 0.4); st.on = false; st.leaf = -1; st.lastU = u; if (Math.abs(v) <= B.vMax) footWall(car, B, th1, u, v, dt); return null; }
  const lf = B.leaves[li];
  if (st.leaf !== li) st.slide = 0;
  const phi = lf.phi(th1), slope = Math.abs(phi), lim = CAR_SLIP_DEG * Math.PI / 180;
  if (slope > lim) {
    st.slide = Math.min(CAR_SLIDE_MAX, st.slide + slideAccel(CAR_SLIP_DEG, slope) * dt);      // (the speed ALONG the slope)
    const hv = st.slide * Math.cos(phi), vu = car.vx * F.c + car.vz * F.s, want = -lf.dir * hv;   // toward the hinge
    if (lf.dir * vu > -hv) { const d = want - vu; car.vx += d * F.c; car.vz += d * F.s; }       // never faster uphill than the slide pulls back
  } else st.slide *= Math.exp(-dt / 0.4);
  u += lf.carryDu(u, th0, th1);
  const w = F.toWorld(u, v, _w); car.x = w.x; car.z = w.z;
  st.on = true; st.leaf = li; st.lastU = u;
  return slope > lim ? 'slip' : 'carry';
}

// ------------------------------------------------------------------ the NPC world: people and traffic
/**
 * hookPeople(nav, svc) wraps four functions of people.sim.nav (idempotent: nav.__bascule<id>): while the flag is up the part between the gates is a THINNED zone (densityFactor 0: nobody is placed there and an agent
 * inside picks goals outside, so the span drains by itself), a step INTO the closed span through a gate line is a wall (fenceNear / segBlocked), and the people on a moving leaf ride its surface (reliefY).
 */
export function hookPeople(nav, svc, id) {
  const mark = '__bascule_' + id;
  if (!nav || nav[mark]) return !!nav;
  nav[mark] = true;
  const fn = nav.fenceNear, sb = nav.segBlocked, ry = nav.reliefY, df = nav.densityFactor;
  if (typeof df === 'function') nav.densityFactor = (x, z) => (svc.stop && svc.inGated(x, z) ? 0 : df(x, z));
  if (typeof fn === 'function') nav.fenceNear = (x, z) => fn(x, z) || svc.nearGate(x, z);                                  // (the walker's step test only runs near a fence)
  if (typeof sb === 'function') nav.segBlocked = (ax, az, bx, bz, pad) => sb(ax, az, bx, bz, pad) || svc.stepBlocked(ax, az, bx, bz);
  if (typeof ry === 'function') nav.reliefY = (x, z) => {
    const r = ry(x, z); if (r != null) return r;
    if (svc.theta > 0.002 && svc.onLeaf(x, z)) { const y = svc.deckY(x, z); return y === null ? null : y + (svc.deckLift(x, z) ?? 0); }
    return null;
  };
  return true;
}
/** the set-down of the NPC people still on a leaf that is too steep to stand on: place(agent, x, z, yaw, lift) outside the gate of the leaf's hinge side; returns how many */
export function sweepPeople(sim, B, svc, setDown) {
  if (!sim || !sim.agents) return 0;
  let n = 0;
  for (const a of sim.agents) {
    if (a.hidden) continue;
    const li = svc.leafAt(a.x, a.z); if (li < 0) continue;
    const lf = B.leaves[li]; if (!lf.slips(WALK_SLIP_DEG, svc.theta)) continue;
    const q = B.frame.toUV(a.x, a.z, {}), w = B.frame.toWorld(setDown[lf.id], clamp(q.v, -B.vMax + 1, B.vMax - 1));
    sim.place(a, w.x, w.z, a.yaw, 0.12); a.rt = null; a.goal = null; a.kind = 'walk'; n++;
  }
  return n;
}
/** ready() for the clock: nothing of the NPC world stands on the span (the leaves start only then; the warning lasts at most WARN_MAX seconds) */
export function spanClear(ctx, svc) {
  const tr = ctx.services.traffic, pe = ctx.services.people;
  if (tr && tr.vehicles) for (let i = 0; i < tr.vehicles.length; i++) if (svc.inSpan(tr.vehicles[i].x, tr.vehicles[i].z)) return false;
  if (pe && pe.sim && pe.sim.agents) for (const a of pe.sim.agents) if (!a.hidden && svc.inSpan(a.x, a.z)) return false;
  return true;
}
