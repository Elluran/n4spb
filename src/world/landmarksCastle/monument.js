// landmarksCastle/monument.js - the PETER I monument in front of the Engineering Castle (B. K. Rastrelli 1745-47, installed 1800; OSM n1041154862 at (-712.2, -756.9), 10.78 m = statue 4.61 m + pedestal 6.17 m).
// Bronze: the emperor in Roman armour (cuirass, pteruges, ermine mantle, laurel wreath, a baton in the right hand) on a walking horse with the left foreleg raised, head turned a little to the right, faces the
// south (the Sadovaya side).  Pedestal: Olonets marble pink-white-green (#d9b8b0 / #e6e0d6 / #a8c0a8) on a grey granite base: two bronze reliefs 1.75 x 2.63 m on the east (Poltava) and west (Gangut)
// faces, the gilt inscription "ПРАДѢДУ ПРАВНУКЪ 1800" under a gilt crowned double-headed eagle on the south face, trophies on the north face, a dark bronze plinth slab under the horse.
// Photos refs/summer-garden 157, 104, 107.  The figure is built with the shared kit lib/figures.js (docs/FIGURES.md) and shown with tools/figures-view.mjs.
import * as THREE from 'three';
import { human, horse, extend, cached, figureMats, V } from '../lib/figures.js';
import { MONUMENT } from './frame.js';

export function peter() {
  return cached('lmC-peter', () => {
    const H = horse({
      detail: 0.75, mane: 'right', tail: 'down', seed: 3,
      pose: { base: 'walk', head: { pitch: 1.05, turn: -0.18, tilt: 0.05, open: 0.04 }, neck: { angle: 0.9, arch: 0.3, len: 0.8 },
        legs: { fl: { hoof: [0.2, 0.42, 0.62], pole: [0, 0.9, 0.5] }, fr: { hoof: [-0.2, 0, 0.5] }, hl: { hoof: [0.2, 0.0, -0.3] }, hr: { hoof: [-0.2, 0, -0.95] } } },
    });
    const seat = H.info.seat;
    const R = human({
      detail: 0.7, body: { muscle: 0.55, bulk: 1.3, shoulders: 1.2 },
      pose: {
        pelvis: [seat[0], seat[1] - 0.02, seat[2] + 0.0], pelvisRot: [-0.04, 0, 0], spine: [-0.03, 0.0, 0], head: [0.0, -0.45, 0],
        legs: { L: { foot: [0.3, seat[1] - 0.84, seat[2] + 0.16], yaw: 0.0, pole: [0.5, 0.0, 0.8] }, R: { foot: [-0.3, seat[1] - 0.84, seat[2] + 0.16], yaw: 0.0, pole: [-0.5, 0.0, 0.8] } },
        arms: { L: { hand: [0.2, seat[1] + 0.34, seat[2] + 0.36], pole: [0.6, -0.5, -0.5], grip: 'hold', palm: [-0.4, 0.2, 1] }, R: { hand: [-0.3, seat[1] + 0.2, seat[2] + 0.3], pole: [-0.7, -0.4, -0.5], grip: 'fist', palm: [0.3, 0.3, 0.6] } },
      },
      outfit: { torso: 'cuirass', hem: 0.2, flare: 0.25, sleeves: 'short', trousers: 'none', boots: 0.45, cape: 'back', capeLen: 0.5, hat: 'laurel', epaulettes: false, sash: false },
      face: { age: 0.4, hair: 'short', beard: 'moustache', brow: 0.7, jaw: 1.0, mouth: 'stern', seed: 14 },
    });
    // the rider is a little larger than life (the bronze reads as heroic): scale about the seat point
    const RS = 1.1, sc = new THREE.Matrix4().makeTranslation(seat[0], seat[1], seat[2]).multiply(new THREE.Matrix4().makeScale(RS, RS, RS)).multiply(new THREE.Matrix4().makeTranslation(-seat[0], -seat[1], -seat[2]));
    const S0 = extend(H, (S) => { for (const [k, g] of Object.entries(R.geos)) S.add(k, g.clone().applyMatrix4(sc)); }, { info: { rider: R.info } });
    return extend(S0, (S) => {
      const P3 = (v) => new THREE.Vector3(v[0], v[1], v[2]).applyMatrix4(sc).toArray(), hr = P3(R.info.j.hands.R.hold), hl = P3(R.info.j.hands.L.hold), bit = V.add(H.info.head.origin, V.add(V.mul(H.info.head.dir, 0.46), V.mul(H.info.head.up, -0.1)));
      S.tube('main', [V.add(hr, [0.02, 0.0, -0.18]), V.add(hr, [-0.03, -0.04, 0.5])], [[0.017, 0.017], [0.02, 0.02]], { seg: 6, per: 4 });             // the baton (marshal's staff)
      S.tube('main', [hl, V.lerp(hl, bit, 0.5).map((v, i) => v - (i === 1 ? 0.08 : 0)), bit], [[0.009, 0.009], [0.009, 0.009], [0.008, 0.008]], { seg: 5, per: 6 });
    });
  });
}

/** the pedestal (Parts collector P in the world frame, K.mats / M materials), centred at (cx, cz), the front (south, +z) = the inscription face; returns the top height */
export function pedestal(P, M, K, cx, cz) {
  P.push(cx, 0, cz, 0);
  try {
    const box = (mat, hw, hd, y0, y1, skip = '') => P.box(mat, -hw, hw, y0, y1, -hd, hd, skip);
    // granite base: three steps
    box(M.granite, 3.6, 3.6, 0, 0.3); box(M.graniteDark, 3.1, 3.1, 0.3, 0.6); box(M.granite, 2.7, 2.7, 0.6, 0.9);
    // marble plinth, die, cornice
    box(M.pinkMarble, 2.2, 2.2, 0.9, 1.5); box(M.graniteWarm, 2.34, 2.34, 1.5, 1.72);                                      // plinth with a moulded granite string
    box(M.pinkMarble, 1.95, 1.95, 1.72, 4.55);                                                                                // the die
    box(M.graniteWarm, 2.28, 2.28, 4.55, 4.7); box(M.graniteWarm, 2.5, 2.5, 4.7, 4.92); box(M.pinkMarble, 2.12, 2.12, 4.92, 5.5);       // cornice and the upper block
    box(M.graniteWarm, 2.34, 2.34, 5.5, 5.7); box(M.bronze, 2.1, 2.45, 5.7, 6.17);                                          // dark bronze slab under the horse
    // faces of the die: east / west bronze reliefs in marble frames, north trophies, south gilt inscription
    const fz = 1.95;
    for (const [rot, mat, tag] of [[Math.PI / 2, M.reliefPoltava, 'E'], [-Math.PI / 2, M.reliefGangut, 'W']]) {
      P.push(0, 0, 0, rot);
      P.box(M.greenMarble, -1.55, 1.55, 2.0, 4.3, fz, fz + 0.04, 'kb');                                                       // frame field
      P.quad(mat, [-1.32, 2.35, fz + 0.07], [1.32, 2.35, fz + 0.07], [1.32, 4.1, fz + 0.07], [-1.32, 4.1, fz + 0.07], [0, 0, 1]);
      P.box(M.graniteWarm, -1.42, 1.42, 2.25, 2.35, fz + 0.04, fz + 0.1, 'kb'); P.box(M.graniteWarm, -1.42, 1.42, 4.1, 4.2, fz + 0.04, fz + 0.1, 'kb');
      P.box(M.graniteWarm, -1.42, -1.32, 2.25, 4.2, fz + 0.04, fz + 0.1, 'kb'); P.box(M.graniteWarm, 1.32, 1.42, 2.25, 4.2, fz + 0.04, fz + 0.1, 'kb');
      P.pop();
      void tag;
    }
    P.push(0, 0, 0, 0);                                                                                                      // south face (+z)
    P.box(M.greenMarble, -1.15, 1.15, 2.0, 4.3, fz, fz + 0.04, 'kb');
    P.quad(M.pedInscr, [-1.0, 2.15, fz + 0.07], [1.0, 2.15, fz + 0.07], [1.0, 4.0, fz + 0.07], [-1.0, 4.0, fz + 0.07], [0, 0, 1]);
    // gilt crowned eagle above the inscription: body, two spread wings, two heads, crown
    const ez = fz + 0.12, ey = 4.45;
    P.box(M.gold, -0.12, 0.12, ey - 0.35, ey + 0.3, ez, ez + 0.1, 'kb');
    for (const s of [-1, 1]) { P.quad(M.gold, [s * 0.1, ey + 0.1, ez + 0.02], [s * 0.85, ey + 0.38, ez + 0.02], [s * 0.7, ey - 0.12, ez + 0.02], [s * 0.1, ey - 0.3, ez + 0.02], [0, 0, 1]); P.geo(M.gold, new THREE.SphereGeometry(0.1, 6, 5), s * 0.12, ey + 0.38, ez + 0.05); }
    P.box(M.gold, -0.14, 0.14, ey + 0.52, ey + 0.66, ez, ez + 0.08, 'kb');
    P.pop();
    P.push(0, 0, 0, Math.PI);                                                                                                // north face: trophies
    P.box(M.greenMarble, -1.3, 1.3, 2.0, 4.3, fz, fz + 0.04, 'kb');
    K.plane(K.R.trophy, -0.9, 0.9, 2.5, 4.0, fz + 0.1);
    P.pop();
    for (const s of [-1, 1]) for (const z of [-1, 1]) P.box(M.greenMarble, s * 1.78 - 0.17, s * 1.78 + 0.17, 1.95, 4.3, Math.min(z * 1.95, z * 2.0), Math.max(z * 1.95, z * 2.0), 'b');
  } finally { P.pop(); }
  return 6.17;
}

export function build(K, M, D, svc) {
  const ctx = K.ctx, P = K.P;
  const { x, z } = MONUMENT;
  const top = pedestal(P, M, K, x, z);
  const mk = figureMats(ctx).keys('bronze', 'bronze');
  // the statue (the horse faces the south = model +z)
  const S = 1.7;
  peter().place(P, mk, x, top, z, 0, S);
  ctx.physics.addBox(x, z, 4.3, 4.3, 0, 0, 7);                                         // the die
  for (const [w, top] of [[7.2, 0.3], [6.2, 0.6], [5.4, 0.9]]) ctx.physics.addWalkBox(x, z, w, w, 0, top, 0);   // three granite steps
  svc.monuments.push({ id: 'peter1', name: 'Памятник Петру I', x, z, h: 10.78 });
  svc.photoSpots.push({ x, z: z + 12, yaw: 180 * 0 + 0, name: 'Пётр I у Михайловского замка' });
  svc.monument = { x, z, h: 10.78 };
}
