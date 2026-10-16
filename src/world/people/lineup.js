// people/lineup.js - debug scene of the characters half (?people=lineup): every archetype, every gesture, sitting people, walkers at several speeds, riders, a pram and dogs
// in a field in front of the hero camera (L.HERO, Vosstaniya Square), plus 6 people 2.5-3.5 m from the camera for face / outfit close-ups and a few scale poles.
// makeLineup(ctx, origin) is headless-runnable (tools/people-rig-test.mjs builds and steps it in node); buildLineup(ctx) hooks it to ctx.onUpdate.
import * as THREE from 'three';
import { createCrowd, makeSpec, ARCH } from './chars.js';
import { MODE, GESTURE as G, newState } from './contract.js';

const Y = 0.12;                                                       // the paving of the square
export function makeLineup(ctx, origin = ctx.L.HERO) {
  const L = ctx.L, R = ctx.rng('lineup'), crowd = createCrowd(ctx);
  const b = (-origin.yaw) * Math.PI / 180, fx = Math.sin(b), fz = -Math.cos(b), rx = Math.cos(b), rz = Math.sin(b);       // forward / right of the camera on the map
  const at = (u, v) => [origin.x + rx * u + fx * v, origin.z + rz * u + fz * v];
  const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
  const camX = origin.x, camZ = origin.z, list = [];
  const add = (opts, beh) => { const spec = makeSpec(R, opts); const i = crowd.add(spec); list.push({ i, spec, beh, st: newState() }); return list[list.length - 1]; };
  const stand = (u, v, o = {}) => (st, t) => { const [x, z] = at(u, v); st.x = x; st.z = z; st.y = Y; st.yaw = o.yaw ?? (yawTo(x, z, camX, camZ) + (o.turn || 0)); st.speed = 0; st.dist = 0; st.mode = MODE.WALK; st.gesture = o.g || 0; st.gk = o.g ? 1 : 0; st.look = o.look || 0; st.lookK = o.look ? 1 : 0; };

  // ---- 1. close-ups (2.5-3.5 m from the camera)
  [[-2.6, 3.4, { role: 'walk', fem: false, age: 'adult' }, { g: G.NONE, turn: 0.2 }], [-1.3, 3.0, { arch: 'guest', fem: true }, { g: G.PHONE, turn: -0.3 }], [0, 3.6, { arch: 'elder_f' }, { g: G.TALK, turn: 0.1 }],
    [1.4, 3.1, { role: 'kid', fem: false }, { g: G.SPLASH }], [2.7, 3.5, { arch: 'tourist_m' }, { g: G.CALL, turn: -0.2 }], [0.9, 2.2, { arch: 'student_f' }, { g: G.SELFIE, turn: 0.3 }]].forEach(([u, v, o, s]) => add(o, stand(u, v, s)));
  // ---- 2. every archetype once, standing, facing the camera (two rows)
  ARCH.forEach((a, k) => { const u = -9.5 + (k % 8) * 2.7, v = 7 + Math.floor(k / 8) * 2.2; add({ arch: a.id, fem: a.fem ?? undefined }, stand(u, v, { turn: 0.25 * Math.sin(k) })); });
  // ---- 3. every gesture
  const gestures = [G.PHONE, G.CALL, G.TALK, G.PHOTO, G.SMOKE, G.EAT, G.POINT, G.WAVE, G.SPLASH, G.WATCH, G.LOOKAROUND, G.SELFIE, G.PLAY, G.PAINT, G.SWEEP, G.GUIDE, G.POSE];
  const roleOf = (g, k) => g === G.PLAY ? 'busker' : g === G.PAINT ? 'painter' : g === G.SWEEP ? 'cleaner' : g === G.GUIDE ? 'guide' : k % 3 === 0 ? 'office' : 'walk';
  gestures.forEach((g, k) => { const u = -14.4 + k * 1.8, v = 12.5; add({ role: roleOf(g, k), age: g === G.SPLASH ? 'child' : 'adult' }, stand(u, v, { g, turn: 0.35 })); });
  // ---- 3b. travellers with rolling suitcases, a bride and groom, a tour guide with a plain umbrella, a follower in a group cap, a police officer, a living statue
  [['traveler', { suitcase: true }], ['traveler', { suitcase: true }], ['bride', {}], ['groom', {}], ['guide', { guideCol: '#2f6fc0' }], ['follower', { cap: '#d94a3a' }], ['police', {}], ['statue', {}]].forEach(([role, o], k) => add({ role, ...o }, stand(-7 + k * 2, 9.8, { turn: 0.3 })));
  // ---- 4. sitting on benches (0.45 m seats)
  const benches = [];
  for (let k = 0; k < 4; k++) {
    const u = -8 + k * 5.5, v = 16.5; benches.push([u, v]);
    for (let j = 0; j < 2; j++) {
      const uu = u + (j ? 0.55 : -0.55); const g = [G.NONE, G.PHONE, G.TALK, G.EAT][(k + j) % 4];
      add({ role: 'walk' }, (st, t) => { const [x, z] = at(uu, v); st.x = x; st.z = z; st.y = Y; st.yaw = yawTo(x, z, camX, camZ); st.speed = 0; st.dist = 0; st.mode = MODE.SIT; st.seatH = 0.45; st.gesture = g; st.gk = g ? 1 : 0; st.look = 0; st.lookK = 0; });
    }
  }
  // ---- 5. walkers across the field at different speeds (ping-pong along a line, with turns at the ends)
  const walk = (v, u0, u1, speed, opts, phase = 0) => add(opts, (st, t) => {
    const len = Math.abs(u1 - u0), T = len / speed, C = 2 * (T + 1.2), uu = (((t + phase) % C) + C) % C;
    let s, dir, mv = 1; if (uu < T) { s = uu * speed; dir = 1; } else if (uu < T + 1.2) { s = len; dir = 1; mv = 0; } else if (uu < 2 * T + 1.2) { s = len - (uu - T - 1.2) * speed; dir = -1; } else { s = 0; dir = -1; mv = 0; }
    const u = u0 + (u1 - u0) * (s / len), [x, z] = at(u, v), du = (u1 - u0 > 0 ? 1 : -1) * dir; const dist = dir > 0 ? s : 2 * len - s;
    st.x = x; st.z = z; st.y = Y; st.yaw = Math.atan2(rx * du, rz * du); st.speed = mv ? speed : 0; st.dist = dist + (dir > 0 ? 0 : 0); st.mode = MODE.WALK; st.gesture = 0; st.gk = 0; st.look = 0; st.lookK = 0;
    if (!mv) st.yaw += Math.PI * 0.5 * Math.min(1, (uu - (dir > 0 ? T : 2 * T + 1.2)) / 1.0);
  });
  [[21, 0.9, { role: 'elder' }], [22.5, 1.3, { arch: 'office_f' }], [24, 1.45, { arch: 'student_m' }], [25.5, 1.1, { arch: 'mid_f' }], [27, 2.6, { role: 'sport' }], [28.5, 3.2, { role: 'kid' }], [30, 1.3, { role: 'dogwalker' }], [31.5, 1.1, { role: 'parent' }]].forEach(([v, sp, o], k) => walk(v, -12, 12, sp, o, k * 3.1));
  // ---- 6. riders on a circle of 6 m radius
  const ride = (cu, cv, rad, speed, vehicle, opts, phase) => add({ role: 'rider', vehicle, ...opts }, (st, t) => {
    const w = speed / rad, a = (t + phase) * w, [x0, z0] = at(cu, cv), px = Math.cos(a) * rad, pz = Math.sin(a) * rad;
    st.x = x0 + px; st.z = z0 + pz; st.y = Y; st.yaw = Math.atan2(-Math.sin(a), Math.cos(a)); st.speed = speed; st.dist = a * rad; st.turn = w; st.mode = MODE.RIDE; st.gesture = 0; st.gk = 0; st.look = 0; st.lookK = 0;
  });
  ride(-13, 24, 4, 3.4, 'bike', { arch: 'student_m' }, 0); ride(-13, 24, 4, 3.4, 'bike', { arch: 'street_f', fem: true }, 5); ride(15, 24, 4, 4.0, 'escooter', { arch: 'teen' }, 0); ride(15, 24, 4, 3.8, 'escooter', { arch: 'courier' }, 3);
  ride(-3, 34, 3, 2.2, 'kick', { role: 'kid', age: 'child' }, 0); ride(4, 34, 3, 1.4, 'balance', { role: 'toddler', age: 'child' }, 0); ride(-9, 36, 3, 3.3, 'bike', { role: 'courier', arch: 'courier' }, 1);
  const out = { crowd, list, benches, at, step };
  function step(t) {
    for (const e of list) { e.beh(e.st, t); crowd.render(e.i, e.st, t); }
    crowd.endFrame();
  }
  crowd.finalize();
  return out;
}

/** a few reference objects: benches, a 2.1 m door frame, scale poles */
function props(ctx, lu) {
  const g = new THREE.Group(); g.name = 'lineup-props'; ctx.addStatic(g);
  const k = ctx.kit(g), wood = ctx.mat.toon('#8a6a4c', {}), grey = ctx.mat.toon('#8f8d89', {}), pole = ctx.mat.toon('#e8e4da', {}), red = ctx.mat.toon('#c4584d', {});
  const b = (-ctx.L.HERO.yaw) * Math.PI / 180;
  for (const [u, v] of lu.benches) { const [x, z] = lu.at(u, v - 0.2); k.box(1.8, 0.06, 0.45, wood, [x, 0.12 + 0.42, z], [0, -b + Math.PI, 0]); k.box(1.5, 0.39, 0.4, grey, [x, 0.12 + 0.2, z], [0, -b + Math.PI, 0]); }
  for (const [u, h] of [[-12, 1.5], [12, 1.8]]) { const [x, z] = lu.at(u, 9); k.box(0.06, h, 0.06, pole, [x, 0.12 + h / 2, z]); k.box(0.2, 0.04, 0.04, red, [x, 0.12 + h, z]); }
  const [dx, dz] = lu.at(-12.5, 15); k.box(0.1, 2.1, 0.1, red, [dx, 0.12 + 1.05, dz]); k.box(0.1, 2.1, 0.1, red, [dx + 0.9, 0.12 + 1.05, dz]); k.box(1.0, 0.1, 0.1, red, [dx + 0.45, 0.12 + 2.1, dz]);
}

export async function buildLineup(ctx) {
  const lu = makeLineup(ctx);
  props(ctx, lu);
  let nightSeen = -1;
  ctx.onUpdate((dt, t) => { const n = ctx.shared.uNight.value; if (Math.abs(n - nightSeen) > 0.1) { nightSeen = n; lu.crowd.setNight(n); } lu.step(t); });
  ctx.services.people = { walkerPaths: [], crowd: lu.crowd, lineup: true };
  return lu;
}
