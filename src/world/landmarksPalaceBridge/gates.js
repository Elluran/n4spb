// landmarksPalaceBridge/gates.js - the ROAD BARRIERS of the Palace Bridge: at both ends of the bascule reach (the gates of lib/bascule.js: u = 79 before the first bascule pier, u = 171.5 beyond the second) a boom across each
// carriageway half and a short one across each pavement, red-and-white, with a red lamp on the post. They DROP when the schedule's STOP flag is raised (the warning phase: the arms need BARRIER_T = 5 s) and lift when the
// leaves lie down and the flag drops. They are a SIGNAL for the NPC traffic and the pedestrians (service.js: stop lines on the lanes, the pedestrian step test); the PLAYER and his car are not stopped by them (no collider: the
// feature is to be able to walk and drive onto a leaf while it opens). No flags, no sounds. Frames: each arm is a Group at its post, in the bridge frame (x = u, z = v), rotated about x.
import * as THREE from 'three';
import { Parts } from '../bridges/kit.js';
import { createBarrierArms, ARM_Y, ARM_UP } from '../lib/bascule-gates.js';
import { FR, ROAD, KERB, PAVE, HW, yDeck, toWorld } from './frame.js';

const VP0 = ROAD + KERB;

export function buildGates(env) {
  const { ctx, M, gates } = env, T = FR.T;
  const red = ctx.mat.toon('#c9352c', { paint: 0.03, name: 'palacebridge-barrier-red' }), white = ctx.mat.toon('#eeebe4', { paint: 0.03, name: 'palacebridge-barrier-white' });
  const lampMat = ctx.mat.toon('#ff3a2a', { emissive: '#ff2a1a', emissiveIntensity: 0, paint: 0.02, name: 'palacebridge-barrier-lamp' });
  const post = M.iron, root = new THREE.Group(); root.name = 'palacebridge-barriers';
  const armSpecs = [];                                                // the booms: [{ u, v, to, y0, ped }] -> lib/bascule-gates.js (solid, breakable knock records)
  const P = new Parts();                                              // the static posts and lamp housings (in world coordinates through the frame)
  const lamps = [];
  for (const g of gates) {
    const y0 = yDeck(g.u) + PAVE;
    // [post v, tip v] of the booms: the roadway booms from the kerb line to the middle, the pavement booms from the railing to the kerb
    const specs = [];
    for (const sg of [-1, 1]) { specs.push({ sg, v: sg * (VP0 + 0.25), to: sg * 0.45 }); specs.push({ sg, v: sg * (HW - 0.35), to: sg * (VP0 + 0.3), ped: true }); }
    P.push(toWorld(g.u, 0).x, 0, toWorld(g.u, 0).z, -T);
    for (const s of specs) {
      P.box(post, -0.16, 0.16, y0, y0 + ARM_Y + 0.35, s.v - 0.16, s.v + 0.16, '', 1);
      P.box(post, -0.2, 0.2, y0 + ARM_Y + 0.35, y0 + ARM_Y + 0.5, s.v - 0.2, s.v + 0.2, '', 1);
      armSpecs.push({ u: g.u, v: s.v, to: s.to, y0, ped: !!s.ped });
      const wp = new THREE.Group(); wp.position.set(toWorld(g.u, 0).x, 0, toWorld(g.u, 0).z); wp.rotation.y = -T; root.add(wp);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), lampMat); lamp.position.set(0, y0 + ARM_Y + 0.62, s.v); lamp.castShadow = false; wp.add(lamp); lamps.push(lamp);
    }
    P.pop();
  }
  P.build(root, { name: 'palacebridge-barrier-posts' });
  for (const l of lamps) ctx.noOutline(l);
  ctx.add(root);
  const arms = createBarrierArms(ctx, { name: 'palacebridge-barrier', toWorld, arms: armSpecs, mats: { red, white, post: M.iron } });
  return {
    root, arms: arms.count, barriers: arms,
    /** the booms that a car broke come back (the module calls it when the next cycle starts) */
    restore() { return arms.restore(); },
    /** barrier = 0 (up) .. 1 (down); t = game seconds (the lamps blink while the arms are not up) */
    set(barrier, t = 0) {
      arms.set(barrier);
      const on = barrier > 0.02;
      lampMat.emissiveIntensity = on ? 0.9 + 0.7 * Math.sin(t * 5.5) : 0;
      return on ? 1 : 0;
    },
  };
}
