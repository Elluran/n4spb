// landmarksTroitsky/gates.js - the ROAD BARRIERS of the Troitsky Bridge: at both ends of the bascule reach (the gates of service.js: u = 6 on the first span, u = 76 beyond the landing pier) a boom across each
// carriageway and a short one across each pavement, red-and-white, with a red lamp on the post. They DROP when the schedule's STOP flag is raised (the warning phase: the arms need BARRIER_T = 5 s) and lift when the
// leaf lies down and the flag drops. They are a SIGNAL for the NPC traffic and the pedestrians (service.js: stop lines on the lanes, the pedestrian step test); the PLAYER and his car are not stopped by them (no
// collider: the feature is to be able to walk and drive onto the leaf while it opens). No flags, no sounds. Frames as leaf.js: each arm is a Group at its post, in the bridge frame (x = u, z = v), rotated about x.
import * as THREE from 'three';
import { Parts } from '../bridges/kit.js';
import { FR, HW, ROAD, KERB, PAVE, yDeck } from './frame.js';
import { toWorld } from './frame.js';

const UP = 72 * Math.PI / 180, ARM_Y = 0.95;
const VP0 = ROAD + KERB;

export function buildGates(env) {
  const { ctx, M, gates } = env, T = FR.T;
  const red = ctx.mat.toon('#c9352c', { paint: 0.03, name: 'troitsky-barrier-red' }), white = ctx.mat.toon('#eeebe4', { paint: 0.03, name: 'troitsky-barrier-white' });
  const lampMat = ctx.mat.toon('#ff3a2a', { emissive: '#ff2a1a', emissiveIntensity: 0, paint: 0.02, name: 'troitsky-barrier-lamp' });
  const post = M.steelTroitskyDark, root = new THREE.Group(); root.name = 'troitsky-barriers';
  const arms = [];                                                    // { pivot, sg }
  const armGeo = (len) => {                                           // a striped boom along local -z (from the post toward the carriageway), 0.1 x 0.1, stripes of 0.6 m; counterweight stub behind the post
    const P = new Parts(), n = Math.max(2, Math.round(len / 0.6)), seg = len / n;
    for (let i = 0; i < n; i++) P.box(i % 2 ? white : red, -0.05, 0.05, -0.05, 0.05, -(i + 1) * seg, -i * seg, '', 1);
    P.box(post, -0.09, 0.09, -0.09, 0.09, 0.0, 0.45, '', 1);
    const g = new THREE.Group(); P.build(g, { name: 'troitsky-barrier-arm' }); return g;
  };
  const P = new Parts();                                              // the static posts and lamp housings (in world coordinates through the frame)
  const lamps = [];
  for (const g of gates) {
    const y0 = yDeck(g.u) + PAVE;
    // [post v, tip v] of the booms: the roadway booms from the kerb line to the median, the pavement booms from the railing to the kerb
    const specs = [];
    for (const sg of [-1, 1]) { specs.push({ sg, v: sg * (VP0 + 0.25), to: sg * 0.45 }); specs.push({ sg, v: sg * (HW - 0.35), to: sg * (VP0 + 0.3), ped: true }); }
    P.push(toWorld(g.u, 0).x, 0, toWorld(g.u, 0).z, -T);
    for (const s of specs) {
      P.box(post, -0.16, 0.16, y0, y0 + ARM_Y + 0.35, s.v - 0.16, s.v + 0.16, '', 1);
      P.box(post, -0.2, 0.2, y0 + ARM_Y + 0.35, y0 + ARM_Y + 0.5, s.v - 0.2, s.v + 0.2, '', 1);
      const len = Math.abs(s.v - s.to), pivot = new THREE.Group();
      pivot.position.set(0, y0 + ARM_Y, s.v); pivot.add(armGeo(len)); if (s.sg < 0) pivot.children[0].rotation.y = Math.PI;     // (the boom of the west side runs toward +z)
      const wp = new THREE.Group(); wp.position.set(toWorld(g.u, 0).x, 0, toWorld(g.u, 0).z); wp.rotation.y = -T; wp.add(pivot);
      root.add(wp); arms.push({ pivot, sg: s.sg });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), lampMat); lamp.position.set(0, y0 + ARM_Y + 0.62, s.v); lamp.castShadow = false; wp.add(lamp); lamps.push(lamp);
    }
    P.pop();
  }
  P.build(root, { name: 'troitsky-barrier-posts' });
  ctx.noOutline(lamps[0]); for (const l of lamps) ctx.noOutline(l);
  ctx.add(root);
  let blink = 0;
  return {
    root, arms: arms.length,
    /** barrier = 0 (up) .. 1 (down); t = game seconds (the lamps blink while the arms are not up) */
    set(barrier, t = 0) {
      const psi = (1 - barrier) * UP;
      for (const a of arms) a.pivot.rotation.x = a.sg * psi;
      const on = barrier > 0.02;
      lampMat.emissiveIntensity = on ? 0.9 + 0.7 * Math.sin(t * 5.5) : 0;
      blink = on ? 1 : 0; return blink;
    },
  };
}
