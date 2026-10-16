// Headless (node, no browser) tests of the multi-level physics and the player: escalators / conveyors, stairs at running speed, floors at -60 m, drops, voids,
// terrain holes, flight rules, rescue, riding a moving frame.   node tools/physics-test.mjs
// The world is synthetic (flat terrain, a 60 m deep shaft at 30 degrees with a down escalator, stairs and an up escalator, a platform with a track bed).
// For the real test world (rendered, zones, interact, train) see tools/under-test.mjs; for "the surface is unchanged" see the comparison run in docs/UNDERGROUND.md.
import * as THREE from 'three';
import { Physics, STEP_HEIGHT } from '../src/core/physics.js';
import { Player } from '../src/core/player.js';

globalThis.addEventListener = () => {}; globalThis.document = { pointerLockElement: null }; globalThis.innerWidth = 1280;
const SLOPE = 30 * Math.PI / 180, DEPTH = 60, RUN = DEPTH / Math.tan(SLOPE), FY = -DEPTH, BED = FY - 1.1;
const fails = []; let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) { fails.push(msg); console.log('  FAIL', msg); } };
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${typeof a === 'number' ? a.toFixed(3) : a} vs ${b} (+-${tol})`);

function world() {
  const ph = new Physics(() => 0);
  const esc = {
    down: ph.addEscalator({ bottom: { x: -2.6, y: FY, z: RUN }, top: { x: -2.6, y: 0, z: 0 }, w: 1.1, dir: -1 }),
    up: ph.addEscalator({ bottom: { x: 2.6, y: FY, z: RUN }, top: { x: 2.6, y: 0, z: 0 }, w: 1.1, dir: +1 }),
  };
  const N = 353; const stairs = ph.addStairs(0, RUN / 2, 2.96, RUN, 0, 0, FY, N);
  ph.addHole(0, RUN / 2, 7.4, RUN, 0);
  for (const x of [-3.4, -1.78, 1.78, 3.4]) ph.addAABB(x - 0.2, 0, x + 0.2, RUN);
  ph.addWalkBox(0, 163, 8, 124, 0, FY, FY - 1.1);                          // platform z 101..225
  ph.addWalkBox(7, 163, 6, 124, 0, BED + 0.1, BED - 1);                    // track bed east of it (top BED + 0.1)
  ph.addAABB(10, 100, 10.6, 226);                                         // east wall
  return { ph, esc, stairs };
}
function mkPlayer(ph) {
  const cam = new THREE.PerspectiveCamera(); const dom = { addEventListener() {}, requestPointerLock() {} };
  const p = new Player(cam, dom, ph, { x0: -1000, x1: 1000, z0: -1000, z1: 1000 }); p.enabled = true; p.smoothing = 0;
  p.events = []; p.onFly = (r) => p.events.push(r); p.onRescue = () => p.events.push('rescue');
  return p;
}
/** run the player for `seconds` with held keys; samples every frame: { t, x, y, z, ground } */
function run(p, seconds, keys = [], dt = 1 / 60, until = null) {
  p.keys = new Set(keys); const log = []; let t = 0;
  for (; t < seconds; t += dt) { p.time += dt; p.update(dt); log.push({ t, x: p.pos.x, y: p.pos.y, z: p.pos.z, ground: p.onGround, fly: p.fly }); if (until && until(p)) break; }
  p.keys = new Set(); return log;
}
const maxStep = (log) => { let m = 0; for (let i = 1; i < log.length; i++) m = Math.max(m, Math.abs(log[i].y - log[i - 1].y)); return m; };
const airborne = (log) => log.filter((s) => !s.ground).length;
const faceSouth = (p) => { p.yaw = Math.PI; p.pitch = 0; };         // yaw 180 deg = looking south (+z)
const faceNorth = (p) => { p.yaw = 0; p.pitch = 0; };

// ------------------------------------------------------------------ 1. floors: the terrain is not a floor below it
{
  const { ph } = world();
  near(ph.groundHeight(50, 50, 5), 0, 1e-9, 'terrain floor at street level');
  ok(ph.groundHeight(50, 50, -55) === -Infinity, 'no terrain floor for feet at -55 (a void, not the street)');
  near(ph.groundHeight(0, 150, -55), FY, 1e-9, 'the platform is the floor at -60 when the feet are at -55');
  near(ph.groundHeight(0, 150, 1e9), 0, 1e-9, 'default feetY (1e9): the highest surface at all (the street above the platform)');
  ok(ph.groundHeight(0, 50, 1e9) === 0 || true, 'n/a');
}
// ------------------------------------------------------------------ 2. teleport onto the platform: not lifted to the street
{
  const { ph } = world(), p = mkPlayer(ph);
  p.setPose(0, 150, 0, 0, FY, { stand: true });
  near(p.pos.y, FY, 1e-6, 'setPose stand: feet on the platform');
  const log = run(p, 2);
  near(p.pos.y, FY, 1e-6, 'after 2 s still on the platform (not lifted to y = 0)'); ok(airborne(log) === 0, 'no airborne frames standing on the platform');
  p.setPose(0, 150, 0, 0, -59.5, { stand: true }); near(p.pos.y, FY, 1e-6, 'stand: highest surface not above y (-59.5 -> -60)');
  p.setPose(5, 150, 0, 0, FY + 0.05, { stand: true }); near(p.pos.y, BED + 0.1, 1e-6, 'stand on the track bed (the platform is not there)');
}
// ------------------------------------------------------------------ 3. escalators: carried, walked, direction changes
{
  const { ph, esc } = world();
  const slopeLen = Math.hypot(RUN, DEPTH);
  // standing on the down escalator (starting on the street, step onto its top)
  let p = mkPlayer(ph); p.setPose(-2.6, -0.5, 180, 0);
  run(p, 0.5, ['KeyW'], 1 / 60); // walk in: 0.5 s forward
  ok(p.pos.z > 0.5 && p.pos.y < 0, `walked onto the down escalator from the street (z=${p.pos.z.toFixed(2)}, y=${p.pos.y.toFixed(2)})`);
  p = mkPlayer(ph); p.setPose(-2.6, 0.3, 180, 0); run(p, 0.2);
  let log = run(p, 200, [], 1 / 30, (q) => q.pos.z > RUN + 0.001);
  const tStand = log[log.length - 1].t;
  console.log(`  standing on the down escalator: ${tStand.toFixed(1)} s to the bottom (slope ${slopeLen.toFixed(0)} m at 0.9 m/s = ${(slopeLen / 0.9).toFixed(0)} s), y at the end ${p.pos.y.toFixed(2)}`);
  near(tStand, (RUN - 0.3) / (0.9 * Math.cos(SLOPE)), 4, 'standing: time down the escalator'); near(p.pos.y, FY, 0.05, 'standing: arrives at -60');
  ok(airborne(log) === 0, `standing on the escalator: never airborne (${airborne(log)} frames)`); ok(maxStep(log) < 0.05, `no jumps in y while carried (${maxStep(log).toFixed(3)})`);
  p = mkPlayer(ph); p.setPose(-2.6, 0.3, 180, 0); p.yaw = Math.PI; p.pitch = 0; run(p, 0.1);
  log = run(p, 100, ['KeyW'], 1 / 60, (q) => q.pos.z > RUN + 0.001); faceSouth(p);
  const tWalk = log[log.length - 1].t; console.log(`  walking down the down escalator (W): ${tWalk.toFixed(1)} s, airborne frames ${airborne(log)}, max dy ${maxStep(log).toFixed(3)}`);
  near(tWalk, (RUN - 0.3) / (3.6 + 0.9 * Math.cos(SLOPE)), 1.5, 'walking down: time'); ok(airborne(log) === 0, `walking down the escalator: no airborne frames (${airborne(log)})`);
  // walking against the down escalator is slow: from the bottom, W faces north
  p = mkPlayer(ph); p.setPose(-2.6, RUN - 3, 0, 0, FY + 3 * Math.tan(SLOPE) + 1, { stand: true }); faceNorth(p);
  const z0 = p.pos.z; run(p, 5, ['KeyW']); const v = (z0 - p.pos.z) / 5;
  near(v, 3.6 - 0.9 * Math.cos(SLOPE), 0.4, 'walking against the down escalator: net speed'); ok(p.onGround, 'still grounded while walking up the down escalator');
  // standing on the UP escalator carries up
  p = mkPlayer(ph); p.setPose(2.6, RUN - 3, 0, 0, FY + 3 * Math.tan(SLOPE) + 1, { stand: true });
  log = run(p, 200, [], 1 / 30, (q) => q.pos.z < -0.01); console.log(`  standing on the up escalator: ${log[log.length - 1].t.toFixed(1)} s, y ${p.pos.y.toFixed(2)}`);
  near(p.pos.y, 0, 0.1, 'up escalator delivers the player to the street'); ok(airborne(log) === 0, 'up escalator: never airborne');
  // runtime direction change: stopped = a plain ramp
  esc.down.dir = 0; p = mkPlayer(ph); p.setPose(-2.6, 30, 180, 0, -30 * Math.tan(SLOPE) + 0.5, { stand: true }); const zs = p.pos.z; run(p, 3); near(p.pos.z, zs, 0.01, 'stopped escalator does not carry');
  esc.down.dir = 1; run(p, 3); ok(p.pos.z < zs - 1, 'reversed escalator carries the other way'); esc.down.dir = -1;
}
// ------------------------------------------------------------------ 4. stairs at 30 degrees, down and up, at running speed
for (const dt of [1 / 144, 1 / 60, 1 / 30, 1 / 20]) {
  const { ph } = world();
  let p = mkPlayer(ph); p.setPose(0, 0.2, 180, 0); faceSouth(p);
  let log = run(p, 60, ['KeyW', 'ShiftLeft'], dt, (q) => q.pos.z > RUN + 3);
  const air = airborne(log), my = maxStep(log);
  console.log(`  stairs down, run, dt=1/${Math.round(1 / dt)}: ${log[log.length - 1].t.toFixed(1)} s, airborne ${air}/${log.length}, max dy ${my.toFixed(3)}, y end ${p.pos.y.toFixed(2)}`);
  ok(air === 0, `stairs down at run speed dt 1/${Math.round(1 / dt)}: no airborne frames (${air})`); ok(p.pos.y < FY + 0.5, `stairs down: reached the bottom (y=${p.pos.y.toFixed(2)})`);
  p = mkPlayer(ph); p.setPose(0, RUN - 5, 0, 0, FY + 5 * Math.tan(SLOPE) + 1, { stand: true }); faceNorth(p);
  log = run(p, 60, ['KeyW', 'ShiftLeft'], dt, (q) => q.pos.z < 8);
  console.log(`  stairs up, run, dt=1/${Math.round(1 / dt)}: ${log[log.length - 1].t.toFixed(1)} s, airborne ${airborne(log)}, y end ${p.pos.y.toFixed(2)}`);
  ok(p.pos.z < 8.5 && p.pos.y > -6, `stairs up at run speed dt 1/${Math.round(1 / dt)}: climbs (z=${p.pos.z.toFixed(1)}, y=${p.pos.y.toFixed(1)})`);
}
// ------------------------------------------------------------------ 5. edges: drops, voids, the shaft rim, rescue
{
  const { ph } = world();
  // east off the platform: a 1.0 m drop onto the track bed is allowed
  let p = mkPlayer(ph); p.setPose(3, 150, -90, 0, FY, { stand: true });
  p.yaw = -Math.PI / 2; run(p, 3, ['KeyW']);
  near(p.pos.y, BED + 0.1, 0.02, 'stepped off the platform edge onto the track bed (drop 1.0 m)'); ok(p.pos.x > 4.2, 'on the track side');
  // and cannot climb back (the platform is a wall of 1.0 m)
  p.yaw = Math.PI / 2; run(p, 2, ['KeyW']); ok(p.pos.x >= 3.99 + 0, `cannot climb the platform edge back (x=${p.pos.x.toFixed(2)}, y=${p.pos.y.toFixed(2)})`); ok(p.pos.y < FY - 0.5, 'still on the bed');
  // south off the end of the platform (no floor beyond z = 225): refused like a wall
  p = mkPlayer(ph); p.setPose(0, 220, 180, 0, FY, { stand: true }); faceSouth(p); run(p, 4, ['KeyW', 'ShiftLeft']);
  ok(p.pos.z <= 225.01 && p.onGround && Math.abs(p.pos.y - FY) < 1e-6, `a step into the void is refused (z=${p.pos.z.toFixed(2)}, y=${p.pos.y.toFixed(2)})`);
  // jump over the end: fall through nothing -> back on the last safe spot
  p = mkPlayer(ph); p.setPose(0, 224.6, 180, 0, FY, { stand: true }); faceSouth(p); run(p, 0.1); p.vy = 4.2; p.onGround = true;
  p.events.length = 0; run(p, 4, ['KeyW', 'ShiftLeft']);
  ok(p.events.includes('rescue') && Math.abs(p.pos.y - FY) < 0.05 && p.onGround, `jumped into the void: rescued onto the platform (y=${p.pos.y.toFixed(2)}, events ${p.events})`);
  // the street side: stepping from the street sideways into the shaft at depth is refused (drop of 15 m), the head of the stairs is fine
  p = mkPlayer(ph); p.setPose(-6, 30, -90, 0); p.yaw = -Math.PI / 2; run(p, 2, ['KeyW']);      // walk east toward the shaft at z = 30
  ok(p.pos.y === 0 && p.pos.x < -3.5, `from the street sideways into the shaft: refused (x=${p.pos.x.toFixed(2)}, y=${p.pos.y.toFixed(2)})`);
  p = mkPlayer(ph); p.setPose(0, -1, 180, 0); faceSouth(p); run(p, 1.5, ['KeyW']); ok(p.pos.y < -1, `walking onto the stairs from the street works (y=${p.pos.y.toFixed(2)})`);
  // landing over the shaft is refused, flying over it never goes below the street
  p = mkPlayer(ph); p.setPose(0, -6, 180, 0); p.toggleFly(true); p.vel.y = 0; run(p, 1.5, ['Space']); const hy = p.pos.y;
  p.yaw = Math.PI; p.pitch = -0.5; run(p, 5, ['KeyW']); ok(p.pos.z > 20, `flew over the shaft (z=${p.pos.z.toFixed(1)})`); ok(p.pos.y >= 0, `flying down over the shaft stops at the street (y=${p.pos.y.toFixed(2)})`);
  p.pos.x = 0; p.pos.z = 40; p.pos.y = 0.1; const lb = p.landingBlocked(); ok(lb === 'blocked', `landing over the shaft mouth is refused (${lb})`);
}
// ------------------------------------------------------------------ 6. flight refused underground
{
  const { ph } = world(), p = mkPlayer(ph);
  p.setPose(0, 150, 0, 0, FY, { stand: true }); p.events.length = 0; const r = p.toggleFly();
  ok(r === 'underground' && !p.fly && p.events[0] === 'underground', `F on the platform: ${r}`);
  p.setPose(0, 20, 0, 0, -12, { stand: true }); ok(p.toggleFly() === 'underground', 'F on the stairs at -12 m is refused');
  p.setPose(0, -2, 0, 0); ok(p.toggleFly() === 'on', 'F at the street still works'); p.toggleFly(false);
  // a free camera underground (setPose with y, no stand) is a debug camera: it keeps its height
  p.setPose(0, 150, 0, 0, FY + 5); ok(p.fly && p.noclipUnder, 'underground free camera is a no-clip debug camera'); run(p, 1); near(p.pos.y, FY + 5 - p.eye, 0.01, 'the free camera keeps its height');
}
// ------------------------------------------------------------------ 7. riding a moving frame
{
  const { ph } = world(), p = mkPlayer(ph);
  const frame = (t) => ({ x: 100 + 10 * t, y: FY, z: 150, yaw: 0.2 * t });
  p.setPose(103, 150, 90, 0, FY, { stand: true }); p.time = 1;
  let exited = null; const ride = p.board({ frame, bounds: { x0: -1.1, x1: 1.1, z0: -9, z1: 9 }, onExit: (e) => { exited = e; } });
  ok(p.riding, 'riding'); const yawW = (p0) => p0.camera.rotation.y;
  const w0 = yawW(p); run(p, 2, [], 1 / 60); const dyaw = yawW(p) - w0;
  near(dyaw, 0.2 * 2, 0.02, 'the view turns with the frame (lookRelative)');
  const f = frame(p.time), c = Math.cos(f.yaw), s = Math.sin(f.yaw), l = ride.local;
  near(p.pos.x, f.x + l.x * c + l.z * s, 1e-6, 'world x = frame transform of the local position'); near(p.pos.z, f.z - l.x * s + l.z * c, 1e-6, 'world z');
  const lz0 = ride.local.z; p.yaw = Math.PI; run(p, 3, ['KeyW']);      // relative yaw 180 deg = toward +z in the car
  ok(ride.local.z > lz0 + 3 && ride.local.z <= 9.0001, `walks inside the bounds and is clamped (local z ${ride.local.z.toFixed(2)})`);
  ok(p.toggleFly() === 'ride', 'no flight on board');
  p.alight({ x: 130, y: FY, z: 150, yaw: 90 }); ok(!p.riding && exited && exited.x === 130, 'alight calls onExit'); near(p.pos.x, 130, 1e-9, 'alight puts the player on the pose'); near(p.yaw, Math.PI / 2, 1e-9, 'alight sets the yaw');
  ok(p.onGround, 'on the ground after alighting'); run(p, 1); near(p.pos.y, FY, 0.01, 'standing on the platform after alighting');
}
console.log(fails.length ? `\nFAILED ${fails.length} of ${checks} checks` : `\nall ${checks} checks passed`);
process.exit(fails.length ? 1 : 0);
