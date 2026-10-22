// drive/handling.js - arcade car physics ("Need for Speed, but simpler"): a point mass with a heading, a bicycle-model yaw rate that is limited by tyre grip (understeer at
// speed), a lateral-velocity grip that the handbrake releases (drifts), nitro (more acceleration + a higher top speed, a tank that refills slowly and faster while drifting),
// six gears for the tacho / engine note, two gas HOPS (tuning.hop: the Roadster's down-jets throw the car up; absent = no vertical dynamics at all, car.y is the road; hop v3: two keys, both launch on the very frame of the key DOWN:
// X = the simple hop, 1.86 m / 1.0 s; C = the barrel hop, 3.72 m / 1.4 s with a cosmetic 360 degree roll, see hopStep) and
// an optional thrust surge (tuning.nitroRamp), and collisions against the same solids that stop the pedestrian (core/physics.js: walls, trees, lamp posts, parked cars, the moving
// traffic) through an oriented rigid footprint with friction and angular impulses; the car also refuses the river, terrain holes (escalator shafts), building footprints and the edge of the map.
// Frame: yaw = rotY (0 faces +Z, positive turns toward +X); forward = (sin yaw, cos yaw), left = (cos yaw, -sin yaw). steer > 0 = left. Units: m, s.
import { SPEC as COUPE_SPEC } from './model.js';
import { createCarCollisions } from './collision.js';
import { HOOKS } from '../lib/area-tables.js';

const ACC = 15.5, BRAKE = 30, REV_ACC = 9, VMAX = 48, VREV = 9, NITRO_VMAX = 1.38, NITRO_ACC = 1.9;
const GEAR_TOP = [13, 22, 31, 40, 49, 62];            // m/s at the redline of gears 1..6
/** the red coupe's constants, in one table: createHandling(ctx, tuning) overrides any of them per car (drive/cars/tuning.js); no tuning = exactly these values */
export const COUPE_TUNING = { acc: ACC, brake: BRAKE, revAcc: REV_ACC, vmax: VMAX, vrev: VREV, nitroVmax: NITRO_VMAX, nitroAcc: NITRO_ACC, gearTop: GEAR_TOP, maxGear: 6,
  steerIn: 6.5, steerOut: 11, maxLat: 24, maxLatHand: 8, yawGrip: 24 * 1.05, steerLock: 0.55, handYaw: 0.55, handYawMax: 2.3, grip: 9, gripHand: 1.3, scrub: 0.10, handDecel: 6,
  drag: 0.0011, engBrake: 1.7, nitroDrain: 0.22, nitroRefill: 0.045, nitroDriftRefill: 0.10, pitchK: 0.0040, pitchMax: 0.05, rollK: 0.0030, rollMax: 0.06, bodyResp: 9,
  impactDecay: 4.5, hf: 2.1, hr: 2.1, hw: 0.95, smokeZ: 1.2, smokeY: 0.82, spec: null };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
/**
 * The input of a car that is HELD while a panel or the area prompt is open (drive.js): nothing is steered, boosted or hopped, and the speed is taken away without ever reversing the car.
 * brk > 0 at a standstill (or below 0.8 m/s) accelerates BACKWARDS in step() and a throttle brakes a car that rolls backwards, so the hold follows the sign of the longitudinal speed vF:
 * rolling forward = full brake, rolling backwards = throttle, at rest = handbrake. Writes into `inp` and returns it.
 */
export function holdInput(inp, vF) {
  inp.thr = 0; inp.brk = 0; inp.steer = 0; inp.nitro = false; inp.hand = false; inp.jump = false; inp.flip = false;
  if (vF > 0.8) inp.brk = 1; else if (vF < -0.3) inp.thr = 1; else inp.hand = true;
  return inp;
}
/** the take-off speed and the tank cost of the simple hop (X) and of the barrel hop (C), tuning.hop: the APEX is v0^2 / 2g, 7.6 m/s = 1.86 m and 10.74 m/s = 3.72 m (twice) */
export const hopV0 = (H, flip) => (flip ? H.v0flip ?? H.v0 : H.v0);
export const hopCost = (H, flip) => (flip ? H.costFlip ?? H.cost : H.cost);
const _s = { y: -Infinity, kind: null, item: null };

export function createHandling(ctx, tuning = null) {
  const L = ctx.L, ph = ctx.physics;
  const T = tuning ? { ...COUPE_TUNING, ...tuning } : COUPE_TUNING, SPEC = T.spec || COUPE_SPEC, GEAR = T.gearTop;
  const collide = createCarCollisions(ph, SPEC);
  const DS = HOOKS.deckServices || [];      // the area's own deck services (a podium, stairs): their deckY comes before the bridge decks (docs/AREAS.md section 9)
  const oldDeckY = (x, z) => ctx.services.landmarksC?.bridge?.deckY?.(x, z) ?? ctx.services.bridges?.deckY(x, z) ?? null;      // the chain of before M6: this is all the strip runs (no deck service)
  const deckY = () => (DS.length ? (x, z) => {
    for (let i = 0; i < DS.length; i++) { const d = ctx.services[DS[i]]?.deckY?.(x, z); if (Number.isFinite(d)) return d; }      // null / undefined / NaN / Infinity = no deck here (the old chain answers); 0 is a deck
    return oldDeckY(x, z);
  } : oldDeckY);
  const deck = deckY();

  /** road surface height at (x, z): the humped Anichkov deck, a low (<= 0.3 m) pavement / kerb slab, else the asphalt (0.03) */
  function groundAt(x, z) {
    const d = deck ? deck(x, z) : null; if (d !== null) return d + 0.03;
    const S = ph.surfaceAt(x, z, 0.5, false, _s);
    if (S.kind === 'walk' && S.item && !S.item.sticky && S.y > 0.03 && S.y <= 0.3) return S.y;
    return 0.03;
  }
  /** terrain the car may not enter: the river (the bridge deck is a floor), an escalator shaft, a building footprint */
  function solidBlocked(x, z) {
    if (!(deck && deck(x, z) !== null) && L.heightAt(x, z) < -1) return true;
    if (ph.inHole(x, z, 0.2)) return true;
    return L.insideBuilding(x, z);
  }
  /** the car may not be here: outside the map (the play area is a union of rectangles, layout.js inPlay: the empty notches are outside the map too) or on forbidden terrain */
  function blocked(x, z) { return !L.inPlay(x, z) || solidBlocked(x, z); }
  // The map edge is a SOFT wall for the car (edgePush): the car's origin stays at least EDGE_M inside the play area, EDGE_M being the radius of its footprint, so no corner can ever
  // cross the edge whatever the heading. A hard footprint test froze the car as soon as steering turned a corner over the edge (a pose that is itself blocked refuses every move,
  // and a standing car cannot turn): it stuck at the edge all the time. Without L.clampToPlay (the unit-test stubs) the edge stays a hard test.
  const softEdge = typeof L.clampToPlay === 'function';
  const EDGE_M = Math.hypot(Math.max(T.hf, T.hr), T.hw) + 0.15;
  const footBlocked = softEdge ? solidBlocked : blocked;
  const FOOT = [[T.hf, T.hw], [T.hf, -T.hw], [-T.hr, T.hw], [-T.hr, -T.hw], [0, T.hw], [0, -T.hw], [T.hf, 0], [-T.hr, 0]];
  const carBlocked = (x, z, sy, cy) => {
    if (blocked(x, z)) return true;
    for (const [a, b] of FOOT) if (footBlocked(x + sy * a + cy * b, z + cy * a - sy * b)) return true;
    return false;
  };
  /** how many of the nine footprint points (centre + eight) are blocked: a car that is embedded (steered into a wall, nudged into a footprint) may move as long as that number does not grow */
  const blockedPoints = (x, z, sy, cy) => {
    let n = blocked(x, z) ? 1 : 0;
    for (const [a, b] of FOOT) if (footBlocked(x + sy * a + cy * b, z + cy * a - sy * b)) n++;
    return n;
  };
  /** keep the origin EDGE_M inside the play area: the position slides to the nearest allowed point, the velocity loses its outward part (a 10 % bounce), the tangential part is kept (the car slides along
   *  the edge) and a nose that points into the edge is swung along it (a yaw torque, like the contact torque of a real hit; the grip model would otherwise scrub the whole sideways slide away) */
  function edgePush(h) {
    if (!softEdge) return;
    const p = L.clampToPlay(car.x, car.z, EDGE_M);
    if (p[0] === car.x && p[1] === car.z) return;
    let wx = car.x - p[0], wz = car.z - p[1]; const wl = Math.hypot(wx, wz);
    car.x = p[0]; car.z = p[1];
    if (!(wl > 1e-6)) return;
    wx /= wl; wz /= wl;
    const vn = car.vx * wx + car.vz * wz;
    if (vn > 0) { car.vx -= wx * vn * 1.1; car.vz -= wz * vn * 1.1; if (vn > 4) car.events.push({ type: 'hit', v: vn * 0.45 }); }
    const tx = car.vx - wx * (car.vx * wx + car.vz * wz), tz = car.vz - wz * (car.vx * wx + car.vz * wz), tl = Math.hypot(tx, tz);
    if (tl < 1.5 || !(h > 0)) return;                                   // (nearly) head-on or standing: the car just stops, the player reverses out
    const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    if (fx * wx + fz * wz < 0.02 && vn <= 0) return;                    // the nose already points along or away from the edge
    const sg = fx * tx + fz * tz >= 0 ? 1 : -1, ux = sg * tx / tl, uz = sg * tz / tl;      // the way along the edge the car travels (nose or tail first)
    const d = Math.atan2(-(fx * uz - fz * ux), fx * ux + fz * uz);     // the yaw change that points the nose (or the tail) along it
    car.impactSpin += (clamp(3 * d, -2.2, 2.2) - car.impactSpin) * Math.min(1, 12 * h);
  }

  const car = {
    x: 0, z: 0, y: 0.03, yaw: 0, vx: 0, vz: 0, steer: 0, pitch: 0, roll: 0, spin: 0, wheelSpin: 0,
    speed: 0, vF: 0, vL: 0, gear: 1, rpm: 0.15, boost: 1, boosting: false, drifting: false, braking: false, aLong: 0, aLat: 0, odo: 0, steerAngle: 0, throttle: 0,
    impactSpin: 0,
    h: 0, vy: 0, air: false, jet: 0, surge: 0,       // the gas hop (tuning.hop only): height above the road, climb speed, airborne, the down-jets 0..1; the thrust surge 0..1 (tuning.nitroRamp only)
    hopCd: 0, jetT: 0, jumpHeld: false, flipHeld: false, cushion: false, jetK: 1,   // hop v3: the cooldown, the down-jets' burn time, the X / C keys were down at the last step (an edge starts a hop), the landing cushion, the size of the down-jets (1 = simple, 1 + jetBig = barrel)
    flipOn: false, flip: 0, flipT: 0, flipDur: 1, flipDir: 1, flipDone: false, barrel: false, pulse0: 0, pulse1: 0,   // the barrel hop's roll (COSMETIC: the physics car stays upright): angle (rad, + = to the right), time, side-jet pulses 0..1 (left, right)
    events: [],                       // { type: 'hit', v } since the last step(); a hop adds { type: 'hop', flip }, { type: 'dry', flip } (a press the tank cannot pay), { type: 'cushion' } and { type: 'land', v, big } (drive.js takes them out before applyImpacts)
    carCenter: { x: 0, z: 0 },
    spec: SPEC, tuning: T, mass: SPEC.mass || 1350, smokeZ: T.smokeZ, smokeY: T.smokeY,
  };
  car.nitroLock = false;
  car.reset = (x, z, yaw) => {
    car.nitroLock = false; car.impactSpin = 0; car.events.length = 0;
    car.h = car.vy = car.jet = car.surge = car.hopCd = car.jetT = 0; car.air = car.jumpHeld = car.flipHeld = car.cushion = false;
    car.flipOn = car.flipDone = car.barrel = false; car.flip = car.flipT = car.pulse0 = car.pulse1 = 0; car.jetK = 1;
    car.x = x; car.z = z; car.yaw = yaw; car.vx = car.vz = 0; car.steer = 0; car.pitch = car.roll = 0; car.y = groundAt(x, z);
    car.speed = car.vF = car.vL = car.aLong = car.aLat = 0; car.gear = 1; car.rpm = 0.15; car.boosting = car.drifting = car.braking = false;
  };

  /** the airborne part of a substep: gravity, the landing cushion (the down-jets fire again just above the road), the touchdown; returns car.y (an absolute height: a kerb or a deck under the car can catch it) */
  function fly(h) {
    const H = T.hop, g = groundAt(car.x, car.z);
    car.vy -= H.g * h;
    // the landing cushion fires the jets earlier for a faster sink (they brake 40 m/s2 down to 1.8 m/s, net 24.5 against gravity; the trigger height is the stopping distance + 0.2 m: 0.6 m for a small drop, 1.3 m after the simple hop, 2.5 m after the barrel hop)
    if (!car.cushion && car.y - g < Math.max(0.6, (car.vy * car.vy - 3.2) / 48 + 0.2) && car.vy < -3 && car.boost > 0.05) { car.cushion = true; car.events.push({ type: 'cushion' }); }
    if (car.cushion && car.vy < -1.8 && car.boost > 0.01) {
      const v = Math.min(-1.8, car.vy + 40 * h); car.boost = Math.max(0, car.boost - 0.004 * (v - car.vy)); car.vy = v; car.jetT = Math.max(car.jetT, 0.25);
    }
    car.y += car.vy * h;
    if (car.vy < 0 && car.y <= g) {
      const v = -car.vy;
      car.y = g; car.h = 0; car.vy = 0; car.air = false; car.cushion = false; car.hopCd = H.cooldown;
      car.pitch -= Math.min(0.045, 0.006 * v);                                   // the nose dips on touchdown and the body springs back (step() eases the pitch)
      car.events.push({ type: 'land', v, big: car.barrel });
      car.flipOn = car.barrel = false; car.flip = 0; car.pulse0 = car.pulse1 = 0; car.jetK = 1;      // an early landing ends the roll at once: exactly level
    } else car.h = car.y - g;
    return car.y;
  }
  /** once per step: the two hop keys (hop v3). X (inp.jump) = the simple hop, C (inp.flip) = the barrel hop. Each is an EDGE (a key that is down already does nothing, so auto-repeat and a held key never retrigger; drive.js latches a press shorter than
   *  one frame) and the hop launches on the very step of the key DOWN: no charge, no buffer. The car must be on the road (!air) with the cooldown over; X needs the tank at minTank and pays cost, C needs minTankFlip and pays costFlip (a short
   *  tank = no hop at all, never a half hop: a 'dry' event for the HUD). Both keys in one step: the barrel hop wins when the tank can pay it. */
  function hopStep(dt, inp) {
    const H = T.hop, jump = !!inp.jump, flip = !!inp.flip, dnX = jump && !car.jumpHeld, dnC = flip && !car.flipHeld;
    car.jumpHeld = jump; car.flipHeld = flip;
    car.hopCd = Math.max(0, car.hopCd - dt); car.jetT = Math.max(0, car.jetT - dt);
    if ((dnX || dnC) && !car.air && car.hopCd <= 0) {
      if (dnC && car.boost >= (H.minTankFlip ?? H.minTank)) hopLaunch(true, inp.steer || 0);
      else if (dnX && car.boost >= H.minTank) hopLaunch(false, inp.steer || 0);
      else car.events.push({ type: 'dry', flip: dnC });
    }
    if (car.flipOn) {                                                                                             // the barrel roll of the barrel hop: a smoothstep 0 -> 360 degrees, finished at flip.frac of the expected airtime
      car.flipT += dt; const u = Math.min(1, car.flipT / car.flipDur), P = H.flip.pulseT ?? 0.36;
      car.flip = car.flipDir * TAU * u * u * (3 - 2 * u);
      const w = clamp(car.flipT / 0.08, 0, 1) * clamp((car.flipDur - car.flipT) / 0.12, 0, 1), s = Math.sin(Math.PI * car.flipT / P);   // the side jets alternate: left / right pulses of period P that sum to 1, faded in and out
      car.pulse0 = w * s * s; car.pulse1 = w * (1 - s * s);
      if (u >= 1 && !car.flipDone) { car.flipDone = true; car.jetT = Math.max(car.jetT, 0.3); }                   // the down-jets fire again before the touchdown
    }
    car.jet = Math.min(1, car.jetT / 0.25);
  }
  /** launch the simple hop (flip = false) or the barrel hop (flip = true): the climb speed, the tank cost, the down-jets, the nose flick toward the steering and, for the barrel hop, the cosmetic roll */
  function hopLaunch(flip, steerIn) {
    const H = T.hop, v0 = hopV0(H, flip);
    car.air = true; car.vy = v0; car.h = 0; car.cushion = false; car.boost = Math.max(0, car.boost - hopCost(H, flip)); car.jetT = flip ? 0.8 : 0.55; car.jetK = flip ? 1 + (H.jetBig ?? 0) : 1;
    car.barrel = flip && !!H.flip;
    car.flipOn = car.barrel; car.flipDone = false; car.flipT = 0; car.flip = 0; car.pulse0 = car.pulse1 = 0;
    if (car.barrel) { car.flipDir = steerIn > 0.3 ? -1 : 1; car.flipDur = (H.flip.frac ?? 0.85) * 2 * v0 / H.g; }   // the held steering picks the side (left = to the left), else to the right
    car.events.push({ type: 'hop', flip: car.barrel });
    if (Math.abs(car.steer) > 0.3) car.impactSpin += (H.flick ?? 2.4) * car.steer / (1 + Math.hypot(car.vx, car.vz) / 20);    // the front lateral jets flick the nose toward the steering (about 30 degrees standing, less at speed: the car keeps its line)
  }

  function sub(h, inp) {
    let sy = Math.sin(car.yaw), cy = Math.cos(car.yaw);
    let vF = car.vx * sy + car.vz * cy;
    const vF0 = vF, sp = Math.abs(vF);
    // ---- steering input (a little slower to turn in than to return)
    const tgt = clamp(inp.steer, -1, 1) * (vF > -0.3 ? 1 : vF < -1.2 ? -1 : 1 - 2 * (-0.3 - vF) / 0.9);       // in reverse the left / right keys are swapped (A swings the nose left when backing up, the way the player expects)
    car.steer += (tgt - car.steer) * Math.min(1, (Math.abs(tgt) > Math.abs(car.steer) ? T.steerIn : T.steerOut) * h);
    // ---- longitudinal
    const thr = clamp(inp.thr, 0, 1), brk = clamp(inp.brk, 0, 1);
    // an empty tank locks the nitro until the key is released: otherwise the refill switched it on and off every frame while Shift stayed down (the flames blinked)
    if (car.boost <= 0.005) car.nitroLock = true; else if (!inp.nitro) car.nitroLock = false;
    const boosting = !!inp.nitro && !car.nitroLock && thr > 0.05 && vF > -1 && !car.air;
    // the thrust builds over nitroRamp seconds (the valve lag of the cold-gas nozzles) instead of switching on; no nitroRamp = the full push at once
    if (T.nitroRamp) car.surge = boosting ? car.surge + (1 - car.surge) * Math.min(1, h / T.nitroRamp) : 0;
    const vmax = T.vmax * (boosting ? T.nitroVmax : 1);
    let a = 0;
    if (thr > 0 && vF > -0.3) { a = T.acc * thr * Math.max(0, 1 - Math.pow(Math.max(vF, 0) / vmax, 1.7)) * (boosting ? (T.nitroRamp ? 1 + (T.nitroAcc - 1) * car.surge : T.nitroAcc) : 1); if (vF > vmax) a = -8; }
    else if (thr > 0) a = T.brake * 0.8 * thr;                                  // throttle while rolling backwards: brake first
    if (brk > 0) { if (vF > 0.8) a -= T.brake * brk; else a -= T.revAcc * brk * clamp(1 + vF / T.vrev, 0, 1); }
    if (!thr && !brk) a -= Math.sign(vF) * (T.engBrake + T.drag * vF * vF);   // engine braking + air drag
    else a -= Math.sign(vF) * T.drag * vF * vF;
    if (inp.hand) a -= Math.sign(vF) * T.handDecel;
    if (car.air) a = -Math.sign(vF) * T.drag * vF * vF;                           // airborne: no drive, no brakes, no handbrake, only the air drag
    let nvF = vF + a * h;
    if (!thr && !brk && !inp.hand && vF * nvF < 0) nvF = 0;
    if (inp.hand && vF * nvF < 0 && !brk && !thr) nvF = 0;
    // ---- yaw rate: the bicycle model at low speed, limited by the tyre grip at high speed; the handbrake lets the tail come round
    const sgn = vF >= 0 ? 1 : -1, sa = Math.max(sp, 0.001);
    const maxLat = inp.hand ? T.maxLatHand : T.maxLat;
    let om;
    if (inp.hand && sp > 6) om = car.steer * Math.min(sp * T.handYaw, T.handYawMax) * sgn;
    else { const low = sa * Math.tan(T.steerLock * car.steer) / SPEC.wb, grip = car.steer * T.yawGrip / Math.max(sa, 4) * sgn; om = Math.abs(low) < Math.abs(grip) ? low : grip; }
    if (car.air) om *= T.hop.airSteer;                                           // the tyres do not bite: the jets only nudge the nose
    car.steerAngle = 0.5 * car.steer * clamp(1 - sp / 70, 0.25, 1);
    car.impactSpin *= Math.exp(-(inp.hand ? 1.8 : T.impactDecay) * h);
    const yaw0 = car.yaw, sy0 = sy, cy0 = cy;
    car.yaw += (om + car.impactSpin) * h; sy = Math.sin(car.yaw); cy = Math.cos(car.yaw);
    // a rotation may not swing a corner of the footprint into a wall, a building or the river (the car turns about its middle: steering at an obstacle used to put the body in it, and a car
    // standing in a blocked pose refuses every move): the turn is refused like a contact, the spin dies. A car that is blocked already may turn freely (it needs to get out).
    if (carBlocked(car.x, car.z, sy, cy) && !carBlocked(car.x, car.z, sy0, cy0)) { car.yaw = yaw0; sy = sy0; cy = cy0; car.impactSpin *= 0.3; }
    // ---- grip: the velocity follows the heading; what the tyres cannot hold slides (drift)
    let vf = car.vx * sy + car.vz * cy, vl = car.vx * cy - car.vz * sy;
    vf += nvF - vF;                                                              // the longitudinal change of this step
    const gr = car.air ? 0 : inp.hand ? T.gripHand : T.grip, cap = maxLat * h;      // airborne: no grip, the sideways speed is kept and nothing scrubs
    const dv = clamp(-vl * (1 - Math.exp(-gr * h)), -cap, cap);
    vl += dv;
    vf -= Math.sign(vf) * Math.abs(dv) * T.scrub;                                  // sliding scrubs speed
    car.vx = sy * vf + cy * vl; car.vz = cy * vf - sy * vl;
    car.vF = vf; car.vL = vl; car.aLong = (nvF - vF0) / h * 0.5 + car.aLong * 0.5; car.aLat = om * vf;
    car.braking = !car.air && ((brk > 0.1 && vF0 > 0.8) || !!inp.hand && sp > 3);
    car.boosting = boosting;
    car.throttle = thr;
    // ---- tank
    if (boosting) car.boost = Math.max(0, car.boost - T.nitroDrain * h);
    else car.boost = Math.min(1, car.boost + (T.nitroRefill + (Math.abs(vl) > 2.2 && sp > 9 && !car.air ? T.nitroDriftRefill : 0)) * h);
    // ---- move: terrain refusals first (axis by axis, so the car slides along the river wall), then the solids
    let nx = car.x + car.vx * h, nz = car.z + car.vz * h;
    if (carBlocked(nx, nz, sy, cy)) {
      // a pose that is blocked already (the steering swung a corner into a wall, the river, a footprint) must be able to get out: any move that does not make it worse is allowed
      const here = blockedPoints(car.x, car.z, sy, cy), ok = (x, z) => here > 0 ? blockedPoints(x, z, sy, cy) <= here : !carBlocked(x, z, sy, cy);
      if (ok(nx, nz)) { /* the move is allowed: it frees the car or keeps it where it was */ }
      else if (ok(nx, car.z)) { nz = car.z; car.vz *= 0.5; }
      else if (ok(car.x, nz)) { nx = car.x; car.vx *= 0.5; }
      else { nx = car.x; nz = car.z; const v = Math.hypot(car.vx, car.vz); if (v > 3) car.events.push({ type: 'hit', v: v * 0.6 }); car.vx *= -0.2; car.vz *= -0.2; }
    }
    car.x = nx; car.z = nz;
    edgePush(h);
    car.y = car.air ? fly(h) : groundAt(car.x, car.z);
    if (car.air && T.hop.clearMax !== undefined && car.h > T.hop.clearMax) { const yAir = car.y; car.y = yAir - car.h + T.hop.clearMax; collide(car); car.y = yAir; }     // the solids see the car no higher than clearMax over the road: a barrel hop clears the low furniture, never a bus shelter or a kiosk
    else collide(car);
    edgePush(h);
    car.odo += Math.hypot(car.vx, car.vz) * h;
    car.spin += (car.vx * sy + car.vz * cy) * h / SPEC.R;
  }

  /** advance dt seconds with inp = { thr, brk, steer, hand, nitro } (0..1, -1..1, booleans) */
  car.step = (dt, inp) => {
    car.events.length = 0; car.spin = 0;
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    // Traffic updates before drive; refresh its current nearby boxes instead of
    // using the previous rendered frame's collider poses.
    ph.refreshDynamic();
    dt = Math.min(dt, 0.1);
    const v = Math.hypot(car.vx, car.vz), n = clamp(Math.max(Math.ceil(dt * 120), Math.ceil((v + Math.abs(car.impactSpin) * 2.4) * dt / 0.18)), 1, 80), h = dt / n;
    if (T.hop) hopStep(dt, inp);
    for (let i = 0; i < n; i++) sub(h, inp);
    // ---- ride height + attitude: the axles follow the road (humped deck), body pitch / roll from the accelerations
    const sy = Math.sin(car.yaw), cy = Math.cos(car.yaw), w = SPEC.wb / 2;
    const yF = groundAt(car.x + sy * w, car.z + cy * w), yR = groundAt(car.x - sy * w, car.z - cy * w);
    const yT = (yF + yR) / 2, slope = Math.atan2(yF - yR, SPEC.wb);
    const k = Math.min(1, 16 * dt);
    if (!car.air) {                                                               // (airborne, car.y is the flight itself: only the road part of the height is eased)
      car.y += (yT - car.y) * k;
      if (Math.abs(car.y - yT) > 0.6) car.y = yT;
    }
    const pt = slope + clamp(car.aLong * T.pitchK, -T.pitchMax, T.pitchMax), rt = clamp(car.aLat * T.rollK, -T.rollMax, T.rollMax);
    car.pitch += (pt - car.pitch) * Math.min(1, T.bodyResp * dt); car.roll += (rt - car.roll) * Math.min(1, T.bodyResp * dt);
    // ---- derived: speed, gear, rpm
    const vf = car.vx * sy + car.vz * cy; car.vL = car.vx * cy - car.vz * sy; car.vF = vf; car.speed = Math.abs(vf) * 3.6;
    const sp = Math.abs(vf);
    let g = car.gear;
    if (vf < -0.5) g = 0;                                                         // 0 = reverse
    else {
      if (g === 0) g = 1;
      while (g < T.maxGear && sp > GEAR[g - 1] * 0.94) g++;
      while (g > 1 && sp < GEAR[g - 2] * 0.58) g--;
    }
    car.gear = g;
    const top = g === 0 ? 9 : GEAR[g - 1], lo = g <= 1 ? 0 : GEAR[g - 2] * 0.55;
    const rt2 = clamp(0.2 + 0.8 * (sp - lo) / Math.max(1, top - lo), 0.14, 1.02) + 0.08 * car.throttle;
    car.rpm += (clamp(rt2, 0.12, 1.05) - car.rpm) * Math.min(1, 12 * dt);
    car.drifting = Math.abs(car.vL) > 2.4 && sp > 8;
    car.carCenter.x = car.x + sy * SPEC.centerZ; car.carCenter.z = car.z + cy * SPEC.centerZ;
  };
  car.groundAt = groundAt; car.blocked = blocked;
  return car;
}
