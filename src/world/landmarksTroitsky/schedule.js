// landmarksTroitsky/schedule.js - PURE (no three.js): the opening cycle of the Troitsky Bridge on the game clock, as a small state machine. `createClock(opts)` -> { step(dt, night), state(), setMode(m), ... };
// the module calls step(dt, uNight) every frame, tools/troitsky-test.mjs steps it through whole cycles headlessly.
//
// THE RULE (all numbers are the tunable constants of CFG, the dev switch is ?troitsky=open|closed|auto, default auto):
//   * in the AUTO mode the bridge opens when it has stood closed for `gap` seconds of game time: DAY_GAP (5 min) in the daylight / overcast presets, NIGHT_GAP (90 s) in the white night preset
//     (uNight >= NIGHT_ON): the real navigation window of the Neva bridges (about 01:25 - 04:50) shortened for play, plus a short daytime demonstration every few minutes. The first opening comes
//     FIRST_AT seconds after the page started (the player sees one soon), whatever the preset.
//   * one cycle = WARN (the barrier arms come down and the NPC traffic / pedestrians stop short of the span: the STOP flag is up, the leaf has not moved yet) -> OPENING (OPEN_T = 80 s, eased: smootherstep
//     of the progress, theta from 0 to THETA_MAX) -> HOLD (HOLD s, only in auto; 'open' mode stays open) -> CLOSING (CLOSE_T = 80 s, the mirror) -> CLEAR (RELEASE s with the leaf down: the barrier arms go up, the flag drops).
//   * the progress p in [0, 1] is the state; theta = THETA_MAX * ease(p), so a change of mind (setMode('closed') while opening) just reverses p: the leaf never jumps.
export const CFG = {
  DAY_GAP: 300, NIGHT_GAP: 90, NIGHT_ON: 0.5, FIRST_AT: 100,
  WARN: 14, WARN_MAX: 75, OPEN_T: 80, HOLD: 25, CLOSE_T: 80, RELEASE: 6,
  BARRIER_T: 5,                       // s: the arms come down / go up within this time (inside WARN / RELEASE)
};
/** the opening angle (rad) of the leaf for progress p: smootherstep (zero speed and acceleration at both ends) */
export const ease = (p) => { const t = p <= 0 ? 0 : p >= 1 ? 1 : p; return t * t * t * (t * (t * 6 - 15) + 10); };

export function createClock(opts = {}) {
  const C = { ...CFG, ...(opts.cfg || {}) }, thetaMax = opts.thetaMax ?? 70 * Math.PI / 180;
  let mode = opts.mode || 'auto', stage = 'idle', p = 0, idle = 0, wait = 0, first = true, cycles = 0, barrier = 0, ev = [], ready = opts.ready || null;
  const want = () => mode === 'open';
  const startWarn = () => { stage = 'warn'; wait = 0; cycles++; ev.push('warn'); };
  /** one small step (dt <= ~0.5 s) */
  const sub = (dt, night) => {
    if (stage === 'idle') {
      idle += dt;
      const gap = night >= C.NIGHT_ON ? C.NIGHT_GAP : C.DAY_GAP;
      if (mode === 'open' || (mode === 'auto' && idle >= (first ? Math.min(gap, C.FIRST_AT) : gap))) startWarn();
    } else if (stage === 'warn') {
      wait += dt;
      if (wait >= C.WARN && (mode === 'closed' || !ready || wait >= C.WARN_MAX || ready())) { stage = mode === 'closed' ? 'clear' : 'opening'; wait = 0; if (stage === 'opening') ev.push('opening'); }      // (the leaf waits for the span to clear of NPC vehicles and pedestrians, at most WARN_MAX)
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
    /** the STOP flag: the NPC traffic / pedestrians stop short of the span from the start of WARN until the leaf lies down and the arms are up */
    get stop() { return stage !== 'idle'; },
    /** barrier arm position 0 (up) .. 1 (down) */
    get barrier() { return barrier; },
    /** events since the last call: 'warn' | 'opening' | 'open' | 'closing' | 'closed' | 'released' */
    takeEvents() { const e = ev; ev = []; return e; },
    setMode(m) { if (m === 'open' || m === 'closed' || m === 'auto') mode = m; return mode; },
    /** ready() -> true when nothing of the NPC world stands on the span (polled in WARN once WARN seconds have passed) */
    setReady(fn) { ready = typeof fn === 'function' ? fn : null; },
    /** the service shape: phase 'closed' | 'opening' | 'open' | 'closing' (warn and clear count as closed: the leaf lies), angle (rad), t = progress 0..1 */
    state() { return { phase: stage === 'opening' ? 'opening' : stage === 'closing' ? 'closing' : stage === 'hold' ? 'open' : 'closed', stage, angle: clock.theta, t: p, stop: stage !== 'idle', barrier, mode, cycles, idle }; },
  };
  const easeD = (q) => { const t = q <= 0 ? 0 : q >= 1 ? 1 : q; return 30 * t * t * (1 - t) * (1 - t); };      // d ease / dp
  return clock;
}
