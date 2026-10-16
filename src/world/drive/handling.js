// drive/handling.js - arcade car physics ("Need for Speed, but simpler"): a point mass with a heading, a bicycle-model yaw rate that is limited by tyre grip (understeer at
// speed), a lateral-velocity grip that the handbrake releases (drifts), nitro (more acceleration + a higher top speed, a tank that refills slowly and faster while drifting),
// six gears for the tacho / engine note, and collisions against the same solids that stop the pedestrian (core/physics.js: walls, trees, lamp posts, parked cars, the moving
// traffic) through an oriented rigid footprint with friction and angular impulses; the car also refuses the river, terrain holes (escalator shafts), building footprints and the edge of the map.
// Frame: yaw = rotY (0 faces +Z, positive turns toward +X); forward = (sin yaw, cos yaw), left = (cos yaw, -sin yaw). steer > 0 = left. Units: m, s.
import { SPEC as COUPE_SPEC } from './model.js';
import { createCarCollisions } from './collision.js';

const ACC = 15.5, BRAKE = 30, REV_ACC = 9, VMAX = 48, VREV = 9, NITRO_VMAX = 1.38, NITRO_ACC = 1.9;
const GEAR_TOP = [13, 22, 31, 40, 49, 62];            // m/s at the redline of gears 1..6
/** the red coupe's constants, in one table: createHandling(ctx, tuning) overrides any of them per car (drive/cars/tuning.js); no tuning = exactly these values */
export const COUPE_TUNING = { acc: ACC, brake: BRAKE, revAcc: REV_ACC, vmax: VMAX, vrev: VREV, nitroVmax: NITRO_VMAX, nitroAcc: NITRO_ACC, gearTop: GEAR_TOP, maxGear: 6,
  steerIn: 6.5, steerOut: 11, maxLat: 24, maxLatHand: 8, yawGrip: 24 * 1.05, steerLock: 0.55, handYaw: 0.55, handYawMax: 2.3, grip: 9, gripHand: 1.3, scrub: 0.10, handDecel: 6,
  drag: 0.0011, engBrake: 1.7, nitroDrain: 0.22, nitroRefill: 0.045, nitroDriftRefill: 0.10, pitchK: 0.0040, pitchMax: 0.05, rollK: 0.0030, rollMax: 0.06, bodyResp: 9,
  impactDecay: 4.5, hf: 2.1, hr: 2.1, hw: 0.95, smokeZ: 1.2, smokeY: 0.82, spec: null };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _s = { y: -Infinity, kind: null, item: null };

export function createHandling(ctx, tuning = null) {
  const L = ctx.L, ph = ctx.physics;
  const T = tuning ? { ...COUPE_TUNING, ...tuning } : COUPE_TUNING, SPEC = T.spec || COUPE_SPEC, GEAR = T.gearTop;
  const collide = createCarCollisions(ph, SPEC);
  const deckY = () => (x, z) => ctx.services.landmarksC?.bridge?.deckY?.(x, z) ?? ctx.services.bridges?.deckY(x, z) ?? null;
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
    events: [],                       // { type: 'hit', v } since the last step()
    carCenter: { x: 0, z: 0 },
    spec: SPEC, tuning: T, mass: SPEC.mass || 1350, smokeZ: T.smokeZ, smokeY: T.smokeY,
  };
  car.nitroLock = false;
  car.reset = (x, z, yaw) => {
    car.nitroLock = false; car.impactSpin = 0; car.events.length = 0;
    car.x = x; car.z = z; car.yaw = yaw; car.vx = car.vz = 0; car.steer = 0; car.pitch = car.roll = 0; car.y = groundAt(x, z);
    car.speed = car.vF = car.vL = car.aLong = car.aLat = 0; car.gear = 1; car.rpm = 0.15; car.boosting = car.drifting = car.braking = false;
  };

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
    const boosting = !!inp.nitro && !car.nitroLock && thr > 0.05 && vF > -1;
    const vmax = T.vmax * (boosting ? T.nitroVmax : 1);
    let a = 0;
    if (thr > 0 && vF > -0.3) { a = T.acc * thr * Math.max(0, 1 - Math.pow(Math.max(vF, 0) / vmax, 1.7)) * (boosting ? T.nitroAcc : 1); if (vF > vmax) a = -8; }
    else if (thr > 0) a = T.brake * 0.8 * thr;                                  // throttle while rolling backwards: brake first
    if (brk > 0) { if (vF > 0.8) a -= T.brake * brk; else a -= T.revAcc * brk * clamp(1 + vF / T.vrev, 0, 1); }
    if (!thr && !brk) a -= Math.sign(vF) * (T.engBrake + T.drag * vF * vF);   // engine braking + air drag
    else a -= Math.sign(vF) * T.drag * vF * vF;
    if (inp.hand) a -= Math.sign(vF) * T.handDecel;
    let nvF = vF + a * h;
    if (!thr && !brk && !inp.hand && vF * nvF < 0) nvF = 0;
    if (inp.hand && vF * nvF < 0 && !brk && !thr) nvF = 0;
    // ---- yaw rate: the bicycle model at low speed, limited by the tyre grip at high speed; the handbrake lets the tail come round
    const sgn = vF >= 0 ? 1 : -1, sa = Math.max(sp, 0.001);
    const maxLat = inp.hand ? T.maxLatHand : T.maxLat;
    let om;
    if (inp.hand && sp > 6) om = car.steer * Math.min(sp * T.handYaw, T.handYawMax) * sgn;
    else { const low = sa * Math.tan(T.steerLock * car.steer) / SPEC.wb, grip = car.steer * T.yawGrip / Math.max(sa, 4) * sgn; om = Math.abs(low) < Math.abs(grip) ? low : grip; }
    car.steerAngle = 0.5 * car.steer * clamp(1 - sp / 70, 0.25, 1);
    car.impactSpin *= Math.exp(-(inp.hand ? 1.8 : T.impactDecay) * h);
    car.yaw += (om + car.impactSpin) * h; sy = Math.sin(car.yaw); cy = Math.cos(car.yaw);
    // ---- grip: the velocity follows the heading; what the tyres cannot hold slides (drift)
    let vf = car.vx * sy + car.vz * cy, vl = car.vx * cy - car.vz * sy;
    vf += nvF - vF;                                                              // the longitudinal change of this step
    const gr = inp.hand ? T.gripHand : T.grip, cap = maxLat * h;
    const dv = clamp(-vl * (1 - Math.exp(-gr * h)), -cap, cap);
    vl += dv;
    vf -= Math.sign(vf) * Math.abs(dv) * T.scrub;                                  // sliding scrubs speed
    car.vx = sy * vf + cy * vl; car.vz = cy * vf - sy * vl;
    car.vF = vf; car.vL = vl; car.aLong = (nvF - vF0) / h * 0.5 + car.aLong * 0.5; car.aLat = om * vf;
    car.braking = (brk > 0.1 && vF0 > 0.8) || !!inp.hand && sp > 3;
    car.boosting = boosting;
    car.throttle = thr;
    // ---- tank
    if (boosting) car.boost = Math.max(0, car.boost - T.nitroDrain * h);
    else car.boost = Math.min(1, car.boost + (T.nitroRefill + (Math.abs(vl) > 2.2 && sp > 9 ? T.nitroDriftRefill : 0)) * h);
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
    car.y = groundAt(car.x, car.z);
    collide(car);
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
    for (let i = 0; i < n; i++) sub(h, inp);
    // ---- ride height + attitude: the axles follow the road (humped deck), body pitch / roll from the accelerations
    const sy = Math.sin(car.yaw), cy = Math.cos(car.yaw), w = SPEC.wb / 2;
    const yF = groundAt(car.x + sy * w, car.z + cy * w), yR = groundAt(car.x - sy * w, car.z - cy * w);
    const yT = (yF + yR) / 2, slope = Math.atan2(yF - yR, SPEC.wb);
    const k = Math.min(1, 16 * dt);
    car.y += (yT - car.y) * k;
    if (Math.abs(car.y - yT) > 0.6) car.y = yT;
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
