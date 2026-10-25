// landmarksPalaceBridge/schedule.js - PURE: the opening cycle of the Palace Bridge on the game clock (the state machine is lib/bascule.js createClock; this file holds the TUNABLE NUMBERS and the shape of the Palace's clock).
// The module calls clock.step(dt, uNight) every frame, tools/palacebridge-test.mjs steps it through whole cycles headlessly.
//
// THE RULE (every number is a constant of CFG, the dev switch is ?palacebridge=open|closed|auto, default auto):
//   * in the AUTO mode the bridge opens when it has stood closed for `gap` seconds of game time: DAY_GAP (315 s) in the daylight / overcast presets, NIGHT_GAP (105 s) in the white night preset (uNight >= NIGHT_ON): the real
//     navigation window of the Neva bridges (about 01:25 - 04:50) shortened for play, plus a short daytime demonstration every few minutes. The first opening comes FIRST_AT = 160 s after the page started (FIRST_NIGHT = 150 s
//     in the white night).
//   * OFFSET FROM THE TROITSKY BRIDGE (landmarksTroitsky/schedule.js: FIRST_AT 100 s, FIRST_NIGHT absent so 90 s, DAY_GAP 300 s, NIGHT_GAP 90 s, cycle 205 s): the two bridges must never open at the same moment. The cycle here is
//     190 s and the gaps are chosen so that the whole PERIOD equals the Troitsky one in both presets (day 315 + 190 = 300 + 205 = 505 s, night 105 + 190 = 90 + 205 = 295 s): the Palace Bridge warns 60 s after the Troitsky
//     Bridge, every time, for as long as the preset does not change and nobody retunes one of the two files (tools/palacebridge-test.mjs pins it against the Troitsky constants). The player at the Hermitage sees the Palace
//     Bridge open a minute after the Troitsky Bridge began and while the Troitsky leaf is still up.
//   * one cycle = WARN (the barrier arms come down and the NPC traffic / pedestrians stop short of the span: the STOP flag is up, the leaves have not moved yet) -> OPENING (OPEN_T = 70 s, eased: smootherstep of the
//     progress, theta from 0 to 70 degrees) -> HOLD (HOLD s, only in auto; 'open' mode stays open) -> CLOSING (CLOSE_T = 70 s, the mirror) -> CLEAR (RELEASE s with the leaves down: the barrier arms go up, the flag drops).
//   * both leaves share the progress p and so the angle theta = THETA_MAX * ease(p): they rise in opposite senses and meet again at the midspan; a change of mind (setMode('closed') while opening) reverses p: nothing jumps.
import { createClock, ease } from '../lib/bascule.js';
import { THETA_MAX } from './frame.js';

export const CFG = {
  DAY_GAP: 315, NIGHT_GAP: 105, NIGHT_ON: 0.5, FIRST_AT: 160, FIRST_NIGHT: 150,
  WARN: 14, WARN_MAX: 75, OPEN_T: 70, HOLD: 30, CLOSE_T: 70, RELEASE: 6,
  BARRIER_T: 5,                       // s: the arms come down / go up within this time (inside WARN / RELEASE)
};
export { ease };
/** the clock of the Palace Bridge: createPalaceClock({ cfg?, mode?, ready? }) -> { step(dt, night), state(), setMode(m), theta, stop, barrier, stage, ... } */
export const createPalaceClock = (opts = {}) => createClock({ cfg: { ...CFG, ...(opts.cfg || {}) }, mode: opts.mode, ready: opts.ready, thetaMax: opts.thetaMax ?? THETA_MAX });
